import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const project = resolve(process.argv[2] || '.');
const width = Number(process.argv[3]) || 430;
const height = Number(process.argv[4]) || 932;
const screenshotPath = resolve(process.argv[5] || resolve(project, 'artifacts', `vocab-v2-${width}x${height}.png`));
const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9337;
const profile = resolve(project, '.tmp-vocab-v2-edge');
const pageUrl = pathToFileURL(resolve(project, 'index.html')).href;
const processHandle = spawn(edge, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--disable-default-apps',
  '--allow-file-access-from-files', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'
], { stdio: 'ignore', windowsHide: true });

const wait = milliseconds => new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds));
let socket;
let sequence = 0;
const pending = new Map();
const runtimeErrors = [];
const resourceErrors = [];

async function getTarget() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      if (targets[0]?.webSocketDebuggerUrl) return targets[0];
    } catch (_) {}
    await wait(100);
  }
  throw new Error('Edge DevTools target did not become ready.');
}

function command(method, params = {}) {
  return new Promise((resolvePromise, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve: resolvePromise, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const response = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || 'Runtime evaluation failed.');
  return response.result?.value;
}

try {
  const target = await getTarget();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolvePromise, reject) => { socket.addEventListener('open', resolvePromise, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const request = pending.get(message.id); pending.delete(message.id);
      message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result || {});
    }
    if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails?.text || 'Runtime exception');
    if (message.method === 'Log.entryAdded' && message.params.entry?.level === 'error') {
      const entry = message.params.entry.text || 'Browser log error';
      if (/^Failed to load resource:/i.test(entry)) resourceErrors.push(entry);
      else runtimeErrors.push(entry);
    }
  });
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Log.enable');
  await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true, screenWidth: width, screenHeight: height });
  await command('Page.navigate', { url: pageUrl });
  let ready = false;
  for (let attempt = 0; attempt < 120 && !ready; attempt += 1) {
    await wait(100);
    ready = await evaluate("typeof switchTab==='function' && !!window.VocabEditorV2 && !!document.getElementById('vocabListContainer')");
  }
  if (!ready) {
    const boot = await evaluate(`({
      href: location.href,
      readyState: document.readyState,
      hasEditor: !!window.VocabEditorV2,
      switchTabType: typeof switchTab,
      appScript: [...document.scripts].find(script => script.src.includes('/js/app.js'))?.src || '',
      bodyText: document.body?.innerText?.slice(0, 160) || ''
    })`);
    throw new Error(`Vocabulary page did not initialize: ${JSON.stringify({ boot, runtimeErrors })}`);
  }
  // Remote optional libraries can keep file:// documents in `interactive` on an
  // offline run. The local app and editor are ready once their globals exist.
  await wait(1500);
  await evaluate(`(()=>{
    switchTab('vocab');
    const legacyId='legacy-edit-smoke';
    const legacy={id:legacyId,word:'legacyword',pos:'v.',meaning:'原始意思',example:'Legacy example.',box:2,sourceType:'manual'};
    state.toeic.vocabList=(state.toeic.vocabList||[]).filter(item=>String(item?.id)!==legacyId);
    state.toeic.vocabList.unshift(legacy);
    state.toeic.vocabList=window.VocabEditorV2.migrateAllVocabulary(state.toeic.vocabList);
    renderVocabList();
    editVocabularyWord(legacyId);
  })()`);
  await wait(250);
  const legacyDiagnostics = await evaluate(`(()=>{
    const legacy=state.toeic.vocabList.find(item=>String(item?.id)==='legacy-edit-smoke');
    return {
      editorOpen:document.getElementById('vocabEditorV2')?.classList.contains('is-open'),
      word:document.getElementById('vocabV2Word')?.value,
      meaning:document.querySelector('#vocabV2SenseList [data-sense-meaning]')?.value,
      id:legacy?.id,
      box:legacy?.box,
      sourceType:legacy?.sourceType,
      senses:legacy?.senses?.length || 0
    };
  })()`);
  await evaluate("window.VocabEditorV2.close(); openAddVocabularyWord();");
  await wait(100);
  await evaluate("document.querySelector('[data-add-sense]').click(); document.querySelector('[data-add-synonym]').click();");
  await wait(100);
  const diagnostics = await evaluate(`(()=>{
    const toolbar=document.querySelector('.vocab-v2-toolbar')?.getBoundingClientRect();
    const sheet=document.querySelector('#vocabEditorV2 .vocab-v2-sheet')?.getBoundingClientRect();
    return {
      width:innerWidth,height:innerHeight,
      overflow:document.documentElement.scrollWidth>innerWidth||document.body.scrollWidth>innerWidth,
      vocabVisible:!document.getElementById('tab-vocab').classList.contains('hidden'),
      editorOpen:document.getElementById('vocabEditorV2').classList.contains('is-open'),
      senses:document.querySelectorAll('#vocabV2SenseList .vocab-v2-sense').length,
      synonyms:document.querySelectorAll('#vocabV2SenseList .vocab-v2-syn-row').length,
      toolbarInside:!!toolbar&&toolbar.left>=0&&toolbar.right<=innerWidth+.5,
      sheetInside:!!sheet&&sheet.left>=0&&sheet.right<=innerWidth+.5&&sheet.bottom<=innerHeight+.5
    };
  })()`);
  const shot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const fs = await import('node:fs/promises');
  await fs.mkdir(resolve(screenshotPath, '..'), { recursive: true });
  await fs.writeFile(screenshotPath, Buffer.from(shot.data, 'base64'));
  console.log(JSON.stringify({ diagnostics, legacyDiagnostics, runtimeErrors, resourceErrors: resourceErrors.length, screenshotPath }, null, 2));
  const legacyFailed = !legacyDiagnostics.editorOpen || legacyDiagnostics.word !== 'legacyword' || legacyDiagnostics.meaning !== '原始意思' || legacyDiagnostics.id !== 'legacy-edit-smoke' || legacyDiagnostics.box !== 2 || legacyDiagnostics.sourceType !== 'manual' || legacyDiagnostics.senses !== 1;
  if (legacyFailed || diagnostics.overflow || !diagnostics.vocabVisible || !diagnostics.editorOpen || diagnostics.senses !== 2 || diagnostics.synonyms !== 1 || !diagnostics.toolbarInside || !diagnostics.sheetInside || runtimeErrors.length) process.exitCode = 1;
} finally {
  try { socket?.close(); } catch (_) {}
  processHandle.kill();
}

import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const project = resolve(process.argv[2] || '.');
const width = Number(process.argv[3]) || 430;
const height = Number(process.argv[4]) || 932;
const screenshotPath = resolve(process.argv[5] || resolve(project, 'artifacts', `study-notes-${width}x${height}.png`));
const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9341 + (width % 20);
const profile = resolve(project, `.tmp-study-notes-${width}`);
const pageUrl = process.argv[6] || pathToFileURL(resolve(project, 'index.html')).href;
const browser = spawn(edge, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--disable-default-apps',
  '--allow-file-access-from-files', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'
], { stdio: 'ignore', windowsHide: true });

const wait = milliseconds => new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds));
let socket;
let sequence = 0;
const pending = new Map();
const runtimeErrors = [];

async function getTarget() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      const page = targets.find(target => target.type === 'page' && !String(target.url || '').startsWith('chrome-extension://'));
      if (page?.webSocketDebuggerUrl) return page;
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
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text || 'Runtime evaluation failed.');
  return response.result?.value;
}

async function touch(selector) {
  await evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)}); if(!element) return false; element.scrollIntoView({block:'center'}); return true;})()`);
  await wait(100);
  const point = await evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)}); if(!element) return null; const rect=element.getBoundingClientRect(); return {x:rect.left+rect.width/2,y:rect.top+rect.height/2,width:rect.width,height:rect.height};})()`);
  if (!point || point.width < 1 || point.height < 1) throw new Error(`Touch target unavailable: ${selector}`);
  await command('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x, y: point.y, radiusX: 3, radiusY: 3, force: 1 }] });
  await command('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await wait(170);
}

async function setInput(selector, value) {
  await evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)}); if(!input) return false; input.value=${JSON.stringify(value)}; input.dispatchEvent(new Event('input',{bubbles:true})); return true;})()`);
  await wait(350);
}

try {
  const target = await getTarget();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolvePromise, reject) => {
    socket.addEventListener('open', resolvePromise, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result || {});
    }
    if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails?.exception?.description || message.params.exceptionDetails?.text || 'Runtime exception');
  });
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true, screenWidth: width, screenHeight: height });
  await command('Page.navigate', { url: pageUrl });

  let ready = false;
  for (let attempt = 0; attempt < 140 && !ready; attempt += 1) {
    await wait(100);
    ready = await evaluate("typeof switchTab==='function' && !!window.StudyNotes && !!document.getElementById('studyNotesMount')");
  }
  if (!ready) throw new Error(`Study Notes did not initialize: ${JSON.stringify(runtimeErrors)}`);
  await wait(900);

  await evaluate(`(()=>{
    const store=getStudyNotesState();
    store.notes=(store.notes||[]).filter(note=>note.id!=='note-smoke');
    store.draft=null;
    updateStudyNotesState(store);
    switchTab('vocab');
  })()`);
  await touch('#tab-vocab .train-local-dock button:last-child');
  const openedNotes = await evaluate("!document.getElementById('tab-notes').classList.contains('hidden')");
  await touch('[data-note-new]');
  await setInput('[data-note-editor-title]', '通勤複習');
  await setInput('[data-note-editor-content]', 'incentive：誘因、動機\n明天再複習一次。');
  const draftSaved = await evaluate("getStudyNotesState().draft?.title==='通勤複習'");
  await touch('[data-note-save]');
  const savedId = await evaluate(`(()=>{const store=getStudyNotesState(); const note=store.notes.find(item=>item.title==='通勤複習'); if(note) note.id='note-smoke'; updateStudyNotesState(store); StudyNotes.render(); return note?.id||null;})()`);
  if (!savedId) throw new Error('Note did not save.');
  await evaluate("document.querySelector('[data-note-close]').click(); window.scrollTo(0,0)");
  await wait(150);
  await touch('[data-note-pin="note-smoke"]');
  await touch('[data-note-font="large"]');
  await setInput('[data-note-search]', 'incentive');
  const beforeReload = await evaluate(`(()=>{
    const dock=document.querySelector('#tab-notes .train-local-dock')?.getBoundingClientRect();
    const card=document.querySelector('[data-note-id="note-smoke"]')?.getBoundingClientRect();
    return {
      noteCount:getStudyNotesState().notes.filter(note=>note.id==='note-smoke').length,
      pinned:getStudyNotesState().notes.find(note=>note.id==='note-smoke')?.pinned,
      fontSize:getStudyNotesState().fontSize,
      resultVisible:!!card,
      overflow:document.documentElement.scrollWidth>innerWidth||document.body.scrollWidth>innerWidth,
      dockInside:!!dock&&dock.left>=0&&dock.right<=innerWidth+.5&&dock.bottom<=innerHeight+.5
    };
  })()`);

  await command('Page.reload', { ignoreCache: true });
  ready = false;
  for (let attempt = 0; attempt < 140 && !ready; attempt += 1) {
    await wait(100);
    ready = await evaluate("typeof switchTab==='function' && !!window.StudyNotes");
  }
  await evaluate("switchTab('notes')");
  await wait(350);
  const afterReload = await evaluate(`(()=>{
    const note=getStudyNotesState().notes.find(item=>item.id==='note-smoke');
    const add=document.querySelector('[data-note-new]')?.getBoundingClientRect();
    return {
      exists:!!note,
      title:note?.title,
      body:note?.content,
      pinned:note?.pinned,
      fontSize:getStudyNotesState().fontSize,
      overflow:document.documentElement.scrollWidth>innerWidth||document.body.scrollWidth>innerWidth,
      addTouchTarget:!!add&&add.width>=44&&add.height>=44
    };
  })()`);
  await touch('[data-note-open="note-smoke"]');
  const detailReadable = await evaluate("document.querySelector('.study-note-detail__body')?.textContent.includes('明天再複習一次')===true");
  await evaluate("document.querySelector('[data-note-close]').click(); window.scrollTo(0,0)");
  await wait(130);

  const shot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const fs = await import('node:fs/promises');
  await fs.mkdir(resolve(screenshotPath, '..'), { recursive: true });
  await fs.writeFile(screenshotPath, Buffer.from(shot.data, 'base64'));

  const result = { pageUrl, width, height, openedNotes, draftSaved, beforeReload, afterReload, detailReadable, runtimeErrors, screenshotPath };
  console.log(JSON.stringify(result, null, 2));
  if (!openedNotes || !draftSaved || beforeReload.noteCount !== 1 || !beforeReload.pinned || beforeReload.fontSize !== 'large' || !beforeReload.resultVisible || beforeReload.overflow || !beforeReload.dockInside || !afterReload.exists || !afterReload.pinned || afterReload.fontSize !== 'large' || afterReload.overflow || !afterReload.addTouchTarget || !detailReadable || runtimeErrors.length) process.exitCode = 1;
} finally {
  try { socket?.close(); } catch (_) {}
  browser.kill();
}

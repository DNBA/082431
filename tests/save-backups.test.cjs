const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseState, createStore, compressRaw, decompressRaw, COMPRESSED_PREFIX } = require('../js/core/save-backups.js');
function storage(limit = Infinity) {
  const map = new Map();
  return {
    map,
    getItem: key => map.get(key) ?? null,
    removeItem: key => map.delete(key),
    setItem(key, value) {
      const bytes = [...map].filter(([id]) => id !== key).reduce((sum, [, raw]) => sum + raw.length, 0) + value.length;
      if (bytes > limit) throw new Error('quota');
      map.set(key, value);
    }
  };
}
const base = { inventory: [], toeic: { vocabList: [], customField: 'kept' }, season: {}, tickets: 12, scoutPoints: 5, studyDetails: { '2026-10-01': { totalScore: 315 } }, studyPlanner: { tasks: [], logs: [] } };
let now = new Date('2026-10-05T12:00:00+08:00').getTime();
{
  const local = storage(); const store = createStore(local, 'save', () => now);
  store.save(base);
  assert.equal(store.list().length, 1);
  store.save({ ...base, tickets: 13 });
  assert.equal(store.list().length, 1, 'Frequent saves should coalesce automatic snapshots');
  now += 16 * 60000;
  store.save({ ...base, tickets: 14 });
  assert.equal(store.list().length, 2);
  local.setItem('save', '{broken');
  const recovered = createStore(local, 'save', () => now).load();
  assert.equal(recovered.state.tickets, 13);
  assert.equal(recovered.state.studyDetails['2026-10-01'].totalScore, 315);
  assert.equal(recovered.state.toeic.customField, 'kept');
  assert.ok(recovered.recovered);
  assert.equal(local.getItem('save'), '{broken', 'Recovery inspection must preserve the damaged primary save');
  for (let i = 0; i < 6; i++) { now++; store.snapshot(JSON.stringify(base), '手動備份', true); }
  assert.equal(store.list().length, 4);
  assert.equal([...local.map.keys()].filter(key => key.startsWith('save_snapshot_')).length, 4);
}
{
  const local = storage(); local.setItem('save', '{}');
  const result = createStore(local, 'save').load();
  assert.equal(result.blocked, true);
  assert.equal(local.getItem('save'), '{}');
}
{
  assert.throws(() => parseState(JSON.stringify({ ...base, tickets: -1 })));
  assert.throws(() => parseState(JSON.stringify({ ...base, studyPlanner: {} })));
  assert.equal(parseState(JSON.stringify({ format: 'toeicquest-save', state: base })).tickets, 12);
  const raw = JSON.stringify(base).replace('"season":{}', '"season":{"__proto__":{"polluted":true}}');
  assert.equal(parseState(raw).season.polluted, undefined);
}
{
  const size = JSON.stringify(base).length;
  const local = storage(size * 3 + 180); const store = createStore(local, 'save', () => ++now);
  store.save(base);
  local.setItem('unrelated-data', 'preserve');
  store.snapshot(JSON.stringify(base), '手動備份', true);
  store.save({ ...base, tickets: 99 });
  assert.equal(store.load().state.tickets, 99, 'Primary saving must survive snapshot storage pressure');
  assert.equal(local.getItem('unrelated-data'), 'preserve');
}
{
  const large = {
    ...base,
    inventory: Array.from({ length: 180 }, (_, index) => ({ cardId: `card-${index}`, name: `球員 ${index}`, rarity: 'SSR', stats: { pts: 28, reb: 7, ast: 6 } })),
    seasonJourney: {
      schedule: Array.from({ length: 82 }, (_, game) => ({
        game: game + 1,
        played: true,
        boxScore: Array.from({ length: 11 }, (_, index) => ({ name: `球員 ${index}`, pts: 20, reb: 5, ast: 4, fgM: 8, fgA: 16 }))
      }))
    }
  };
  const raw = JSON.stringify(large);
  const compressed = compressRaw(raw);
  assert.ok(compressed.startsWith(COMPRESSED_PREFIX), 'large saves use the compact local format');
  assert.ok(compressed.length < raw.length * 0.7, 'the compact format materially reduces localStorage usage');
  assert.equal(decompressRaw(compressed), raw, 'compressed Unicode saves round-trip exactly');
  assert.deepEqual(parseState(compressed).seasonJourney.schedule[81].boxScore[10], large.seasonJourney.schedule[81].boxScore[10]);
}
{
  const local = storage();
  const queued = [];
  global.ToeicQuestSaveVault = { queueAutoSnapshot: raw => queued.push(raw) };
  const store = createStore(local, 'save', () => ++now);
  store.save(base);
  store.save({ ...base, tickets: 77 });
  assert.equal(store.list().length, 0, 'when IndexedDB vault is available, automatic full copies do not consume localStorage');
  assert.equal(queued.length, 2);
  assert.equal(JSON.parse(queued.at(-1)).tickets, 77);
  delete global.ToeicQuestSaveVault;
}
{
  const root = path.resolve(__dirname, '..');
  const saveTools = fs.readFileSync(path.join(root, 'js', 'core', 'save-tools.js'), 'utf8');
  const saveResilience = fs.readFileSync(path.join(root, 'js', 'core', 'save-resilience.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(saveTools, /navigator\.share\(shareData\)/, 'iPhone/PWA backup uses the system share sheet when file sharing is supported');
  assert.match(saveTools, /navigator\.storage\.persist\(\)/, 'the save tools can request persistent browser storage');
  assert.match(saveResilience, /indexedDB\.open\(DB_NAME, 1\)/, 'large manual restore points use IndexedDB rather than duplicating the save in localStorage');
  assert.match(saveResilience, /AUTO_SAVE_ID = 'vault_auto_current'/, 'the latest full save is mirrored into the IndexedDB vault');
  assert.match(saveResilience, /queueAutoSnapshot/, 'normal saves queue a large automatic restore point');
  assert.match(saveResilience, /new CompressionStream\('gzip'\)/, 'transfer codes are compressed when the browser supports it');
  assert.match(saveResilience, /new DecompressionStream\('gzip'\)/, 'compressed transfer codes can be restored');
  assert.match(html, /分享／下載備份/);
  assert.match(html, /選擇備份檔還原/);
  assert.match(html, /產生並複製換機碼/);
  assert.match(html, /從換機碼還原/);
  assert.match(html, /save-resilience\.js/);
  assert.match(html, /沒有安全的帳號伺服器/);
}
console.log('Save backup rotation, throttling, corrupt-save recovery, validation, and quota tests passed.');


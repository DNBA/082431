const assert = require('node:assert/strict');
const { parseState, createStore } = require('../js/core/save-backups.js');
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
console.log('Save backup rotation, throttling, corrupt-save recovery, validation, and quota tests passed.');

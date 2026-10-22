const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createStore } = require('../js/core/season-checkpoint.js');

function memoryStorage() {
  const map = new Map();
  return {
    map,
    failNextCheckpoint: false,
    getItem: key => map.get(key) ?? null,
    removeItem: key => map.delete(key),
    setItem(key, value) {
      if (this.failNextCheckpoint && key.endsWith('_season_checkpoint_v1')) {
        this.failNextCheckpoint = false;
        throw new Error('quota');
      }
      map.set(key, value);
    }
  };
}

function journey(overrides = {}) {
  return {
    seasonNo: 2,
    seasonStartedAt: '2026-10-20T00:00:00.000Z',
    gameIndex: 0,
    wins: 0,
    losses: 0,
    streak: 0,
    bestStreak: 0,
    completed: false,
    recent: [],
    schedule: Array.from({ length: 82 }, (_, index) => ({ game: index + 1, opponent: `Team ${index + 1}`, played: false })),
    ...overrides
  };
}

{
  const local = memoryStorage();
  const store = createStore(local, 'save', () => Date.parse('2026-10-20T12:00:00.000Z'));
  const current = journey({ gameIndex: 2, wins: 1, losses: 1, streak: 1, bestStreak: 1 });
  Object.assign(current.schedule[0], { played: true, win: false, myScore: 101, oppScore: 105 });
  Object.assign(current.schedule[1], { played: true, win: true, myScore: 112, oppScore: 104 });
  assert.equal(store.record(current, current.schedule[0]), true);
  assert.equal(store.record(current, current.schedule[1]), true);

  const stale = journey();
  const result = store.apply(stale);
  assert.equal(result.applied, true);
  assert.equal(stale.gameIndex, 2);
  assert.equal(stale.wins, 1);
  assert.equal(stale.losses, 1);
  assert.equal(stale.schedule[1].played, true);
  assert.equal(stale.schedule[1].myScore, 112);
  assert.equal(stale.schedule[1].oppScore, 104);
  assert.equal(stale.recent.length, 2);
  assert.equal(stale.schedule[1].recoveredFromCheckpoint, true);
}

{
  const local = memoryStorage();
  const store = createStore(local, 'save');
  const current = journey({ gameIndex: 1, wins: 1 });
  Object.assign(current.schedule[0], { played: true, win: true, myScore: 120, oppScore: 100 });
  store.record(current, current.schedule[0]);
  const anotherSeason = journey({ seasonNo: 3 });
  assert.equal(store.apply(anotherSeason).applied, false, 'checkpoints must never cross seasons');
  assert.equal(anotherSeason.gameIndex, 0);
}

{
  const local = memoryStorage();
  const store = createStore(local, 'save');
  local.setItem('unrelated-data', 'keep');
  local.setItem('save_snapshot_old', 'old');
  local.setItem('save_snapshot_new', 'new');
  local.setItem('save_backups_v1', JSON.stringify([
    { id: 'save_snapshot_new', at: 20 },
    { id: 'save_snapshot_old', at: 10 }
  ]));
  local.failNextCheckpoint = true;
  const current = journey({ gameIndex: 1, wins: 1 });
  Object.assign(current.schedule[0], { played: true, win: true, myScore: 110, oppScore: 99 });
  assert.equal(store.record(current, current.schedule[0]), true, 'checkpoint should retry after pruning one old backup');
  assert.equal(local.getItem('save_snapshot_old'), null);
  assert.equal(local.getItem('save_snapshot_new'), 'new');
  assert.equal(local.getItem('unrelated-data'), 'keep');
  assert.equal(store.clear(current), true);
  assert.equal(store.read(), null);
}

{
  const root = path.resolve(__dirname, '..');
  const journeySource = fs.readFileSync(path.join(root, 'js', 'season-journey.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(journeySource, /persistJourneyProgress\(j, item/);
  assert.match(journeySource, /visibilitychange/);
  assert.match(journeySource, /pagehide/);
  assert.match(journeySource, /const game = savedGame \|\| fallback;/, 'schedule normalization must preserve the active game object');
  assert.match(journeySource, /repairJourneyScheduleProgress\(journey\)/, 'legacy progress gaps must be repaired before counters are derived');
  assert.match(journeySource, /authoritativeJourneyScheduleGame\(state\.seasonJourney, activeGame\.scheduleGame\)/, 'final settlement must write to the authoritative schedule item');
  assert.match(journeySource, /activeGame\.quickSimRunning/, 'quick sim must reject re-entrant taps');
  assert.match(journeySource, /finalizePendingJourneyOnExit\(\)/, 'Q4 exit must finalize before lifecycle persistence');
  assert.doesNotMatch(journeySource, /state\.season\.lastSimGames\s*=\s*j\.schedule\s*;/);
  assert.match(html, /season-checkpoint\.js\?v=20261020-v442/);
  assert.match(html, /season-journey\.js\?v=20261023-v451-fast-sim-save/);
}

console.log('Season checkpoint recovery, isolation, lifecycle hooks, and storage-pressure tests passed.');


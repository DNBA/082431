const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const simulation = require('../js/season-simulation.js');

const options = {
  seasonNo: 1,
  seasonStartedAt: '2026-10-07T00:00:00.000Z',
  game: 27,
  opponent: 'Celtics',
  teamOvr: 91,
  opponentOvr: 93
};

const firstScript = simulation.createGameScript(options);
const repeatedScript = simulation.createGameScript(options);
assert.deepEqual(firstScript, repeatedScript, 'the same saved matchup must always receive the same script');
assert.deepEqual(
  simulation.simulateGame(firstScript, options),
  simulation.simulateGame(repeatedScript, options),
  'reloads must not reroll the score path'
);

const profileCounts = {};
const scores = [];
for (let index = 1; index <= 1200; index += 1) {
  const script = simulation.createGameScript({ ...options, seasonStartedAt: `season-${index}`, game: index });
  profileCounts[script.profile] = (profileCounts[script.profile] || 0) + 1;
  const game = simulation.simulateGame(script, options);
  scores.push(game.home, game.away);
}
assert.deepEqual(Object.keys(profileCounts).sort(), ['defensive', 'historic', 'normal', 'shootout', 'takeover', 'upset']);
assert.ok(profileCounts.normal > 560 && profileCounts.normal < 760, 'normal games should remain the majority');
assert.ok(profileCounts.historic >= 12 && profileCounts.historic <= 40, 'historic nights should stay rare');
assert.ok(Math.min(...scores) <= 88, 'defensive games should be capable of finishing below 90');
assert.ok(Math.max(...scores) >= 135, 'shootouts should be capable of reaching the high 130s');
assert.ok(Math.max(...scores) - Math.min(...scores) >= 45, 'season scores need visibly wider variance');

const baselineBook = simulation.ensureRecordBook(null);
assert.equal(baselineBook.singleGame.pts.value, 61);
assert.equal(baselineBook.singleGame.ast.value, 20);
assert.equal(baselineBook.singleGame.threeM.value, 13);

function sampleRows() {
  return Array.from({ length: 11 }, (_, index) => ({
    name: index === 0 ? 'Kobe Bryant' : `Player ${index + 1}`,
    cardId: index === 0 ? 'card_kobe' : `card_${index}`,
    role: index < 5 ? 'starter' : 'bench',
    pts: index === 0 ? 28 : 10 - Math.min(index, 8),
    threeM: index === 0 ? 4 : 1,
    threeA: 7,
    fgM: 8,
    fgA: 16,
    ftM: 4,
    ftA: 5,
    reb: index === 0 ? 6 : 4,
    oReb: 1,
    dReb: index === 0 ? 5 : 3,
    ast: index === 0 ? 5 : 3,
    stl: 1,
    blk: 1
  }));
}

for (const [stat, definition] of Object.entries(simulation.RECORD_DEFINITIONS)) {
  const rows = sampleRows();
  const historicScript = {
    profile: 'historic',
    recordStat: stat,
    recordValue: definition.baseline + 2
  };
  const historic = simulation.applyHistoricLine(rows, 132, historicScript, 'Kobe Bryant');
  assert.ok(historic.value > definition.baseline, `${stat} historic night should clear the franchise baseline`);
  if (stat === 'pts' || stat === 'threeM') {
    assert.equal(rows.reduce((sum, row) => sum + row.pts, 0), 132, `${stat} redistribution must preserve the team score`);
  }
}

const recordRows = sampleRows();
recordRows[0].pts = 64;
const result = simulation.evaluateRecordBook(null, recordRows, { seasonNo: 1, game: 27, opponent: 'BOS', createdAt: 'now' });
assert.equal(result.records.length, 1);
assert.equal(result.records[0].stat, 'pts');
assert.equal(result.records[0].oldValue, 61);
assert.equal(result.book.singleGame.pts.player, 'Kobe Bryant');
const repeated = simulation.evaluateRecordBook(result.book, recordRows, { seasonNo: 1, game: 28, opponent: 'NYK', createdAt: 'later' });
assert.equal(repeated.records.length, 0, 'the same value must not claim the record twice');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/season-simulation.js'), 'utf8');
const journey = fs.readFileSync(path.join(root, 'js/season-journey.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.doesNotMatch(source, /Math\.random/, 'scripted Season variance must be deterministic');
assert.ok(index.indexOf('season-simulation.js') < index.indexOf('season-journey.js'));
assert.match(journey, /ensureGameScript/);
assert.match(journey, /evaluateJourneyRecords/);
assert.match(journey, /NEW FRANCHISE RECORD/);
assert.match(app, /simulationScript/);

console.log('Season simulation: controlled variance, reload-stable scripts, rare historic nights, career highs, and real franchise record comparisons passed.');

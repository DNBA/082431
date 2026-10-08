const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const allStar = require('../js/season-all-star.js');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');

const plan = allStar.contestShotPlan(2);
assert.equal(plan.length, 27, 'contest uses 25 rack balls and two deep balls');
assert.equal(plan.reduce((sum, shot) => sum + shot.value, 0), 40, 'maximum score is 40');
assert.equal(plan.filter(shot => shot.kind === 'deep').length, 2, 'two Starry Range balls are present');
assert.equal(plan.filter(shot => shot.rackIndex === 2 && shot.kind === 'money').length, 5, 'selected rack is all money balls');
assert.equal(plan.filter(shot => shot.kind === 'money').length, 9, 'four end money balls plus five-ball money rack');

const shooter = { key: 'cpu:test', name: 'Test Shooter', threePct: 39.5, threePa: 8.4, ovr: 90 };
const roundA = allStar.simulateContestRound(shooter, { seed: 1234, round: 'round1', moneyRackIndex: 1 });
const roundB = allStar.simulateContestRound(shooter, { seed: 1234, round: 'round1', moneyRackIndex: 1 });
assert.deepEqual(roundA, roundB, 'CPU round is stable across reloads');
assert.ok(roundA.score > 0 && roundA.score <= 40, 'CPU receives a real non-zero score within the official limit');

const ranked = allStar.rankContestRound([
  { name: 'A', score: 20, tieBreakScore: 4 },
  { name: 'B', score: 24, tieBreakScore: 1 },
  { name: 'C', score: 20, tieBreakScore: 7 },
  { name: 'D', score: 18, tieBreakScore: 9 }
]);
assert.deepEqual(ranked.slice(0, 3).map(player => player.name), ['B', 'C', 'A'], 'top three advance and ties use the tiebreak score');

const legacyLeague = {
  playerStats: {
    'cpu:legacy': {
      key: 'cpu:legacy', name: 'Legacy Shooter', team: 'BOS', conference: 'east', positions: ['SG'], ovr: 88,
      games: 20, totals: { pts: 400, reb: 80, ast: 70, stl: 20, blk: 4, threeM: 0, threeA: 0 },
      base: { pts: 20, reb: 4, ast: 3.5, stl: 1, blk: .2, threeM: 3.2, threeA: 8 }, months: {}
    }
  },
  teamRecords: { BOS: { wins: 14, winPct: .7 } }
};
const legacyShooter = allStar.leaguePlayers(legacyLeague)[0];
assert.equal(legacyShooter.threePct, 40, 'missing legacy 3PT totals fall back to baseline instead of 0%');

assert.match(html, /id="threePtTimer">50</);
assert.match(html, /id="threePtBallsLeft">27</);
assert.match(html, /id="threePtScore">0<\/b><small>\/40<\/small>/);
assert.doesNotMatch(html, /ALL-STAR WEEKEND\s*·\s*V\d/i, 'development version is not shown in the game UI');
assert.match(app, /function startThreePointFinal\(/);
assert.match(app, /function finishThreePointRound\(/);
assert.match(app, /roundOneResults\.slice\(0, 3\)/);
assert.match(app, /roundEndsAt = Date\.now\(\) \+ 50000/);
assert.match(app, /pendingResultAction = 'final'/);
assert.match(html, /onclick="handleThreePointResultAction\(\)"/);
assert.match(html, /id="threePtLiveBoard"/);
assert.doesNotMatch(app, /action\.onclick = startThreePointFinal/, 'final button uses a stable dispatcher instead of replacing an inline handler');
assert.match(app, /function prepareThreePointOpponentResults\(/);
assert.match(app, /晉級線 \$\{threePtState\.advanceCutoff\}/);
assert.match(app, /threePtContestPlayedShooters/);
assert.match(app, /threePtContestResultsByShooter/);
assert.match(app, /ADMIN · 再挑戰一場/);
assert.match(app, /!state\.isAdmin && isChamp/, 'admin replays do not repeatedly grant champion rewards');

console.log('Authentic two-round three-point contest, legacy 3PT fallback, and hidden UI version checks passed.');

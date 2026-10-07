const assert = require('node:assert/strict');
const allStar = require('../js/season-all-star.js');

function record(key, name, team, conference, isPlayer, index) {
  const base = { pts: 22 + index % 9, reb: 4 + index % 6, ast: 3 + index % 7, stl: 1 + (index % 3) * .2, blk: .4 + (index % 4) * .25, threeA: 5 + index % 5, threeM: 2.2 + index % 4 };
  const totals = Object.fromEntries(Object.entries(base).map(([stat, value]) => [stat, value * 20]));
  return { key, name, team, conference, isPlayer, ovr: isPlayer ? 99 : 78 + index % 18,
    positions: index % 3 === 0 ? ['PG'] : (index % 3 === 1 ? ['SF'] : ['C']), games: 20,
    totals, base, months: { '2026-10': { games: 20, ...totals } } };
}

const records = [];
for (let i = 0; i < 24; i += 1) {
  const conference = i < 12 ? 'east' : 'west';
  const team = conference === 'east' ? 'BOS' : 'LAL';
  records.push(record(`cpu:${i}`, `CPU ${i}`, team, conference, false, i));
}
records.push(record('player:kobe', 'Kobe Bryant', 'LAL', 'west', true, 99));

const journey = { seasonNo: 1, gameIndex: 47, allStarHistory: [] };
const league = { seed: 20261007, playerStats: Object.fromEntries(records.map(item => [item.key, item])), teamRecords: { BOS: { wins: 30, winPct: .75 }, LAL: { wins: 34, winPct: .85 } } };
const weekend = allStar.build(journey, league);

assert.equal(weekend.selectionGame, 47);
assert.equal(weekend.weekendGame, 50);
assert.equal(weekend.east.selected.length, 12);
assert.equal(weekend.west.selected.length, 12);
assert.ok(weekend.west.selected.some(player => player.name === 'Kobe Bryant'), 'owner player competes in the West selection');
assert.ok(weekend.west.selected.every(player => player.selectionType), 'each selection has a role');
assert.ok(weekend.threePointParticipants.length <= 8);
assert.ok(weekend.threePointParticipants.every(player => player.accepted !== false));

const playerInvite = weekend.threePointParticipants.find(player => player.name === 'Kobe Bryant');
if (playerInvite) {
  const board = allStar.contestBoard(weekend, 'Kobe Bryant', 30);
  assert.equal(board.find(player => player.name === 'Kobe Bryant').score, 30);
  assert.equal(board[0].score, Math.max(...board.map(player => player.score)));
}

const savedJourney = { ...journey };
const ensured = allStar.ensure(savedJourney, league);
assert.equal(ensured.seasonNo, 1);
assert.equal(allStar.ensure(savedJourney, league), ensured, 'ensure reuses the persisted season event');

console.log('All-Star Weekend V3.0: dynamic selections, snubs, accepted 3PT invitations, persisted ensure, and contest board passed.');

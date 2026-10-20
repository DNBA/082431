const test = require('node:test');
const assert = require('node:assert/strict');
const League = require('../js/season-league.js');

function line(name, pts) {
  return { name, min: 30, pts, reb: 5, ast: 4, stl: 1, blk: 1, tov: 2, fgM: 8, fgA: 16, threeM: 2, threeA: 5, ftM: 2, ftA: 2, plusMinus: 3 };
}

test('annual award minimum is always 80 percent of team games', () => {
  assert.equal(League.getAwardMinimumGames(40), 32);
  assert.equal(League.getAwardMinimumGames(82), 66);
  assert.equal(League.isSeasonAwardEligible({ games: 65 }, 82), false);
  assert.equal(League.isSeasonAwardEligible({ games: 66 }, 82), true);
});

test('award races and leaders exclude players below the 80 percent threshold', () => {
  const eligible = { cardId: 'eligible', nbaId: 1, name: 'Eligible Star', team: 'LAL', ovr: 85, positions: ['SG'] };
  const ineligible = { cardId: 'ineligible', nbaId: 2, name: 'Inactive Star', team: 'LAL', ovr: 99, positions: ['SF'] };
  const schedule = Array.from({ length: 10 }, (_, index) => ({
    game: index + 1,
    boxScore: [line('Eligible Star', 20), ...(index < 7 ? [line('Inactive Star', 45)] : [])]
  }));
  const journey = { seasonNo: 1, seasonStartedAt: '2026-01-01', gameIndex: 10, wins: 6, losses: 4, schedule };
  const standings = { conferences: { west: [{ code: 'PLAYER', name: 'My Team', isPlayer: true, wins: 6, losses: 4, games: 10 }], east: [] } };
  League.sync(journey, [], [eligible, ineligible], standings);
  const view = League.view(journey);
  assert.equal(view.leaders.PTS[0].name, 'Eligible Star');
  assert.equal(view.awardRaces.mvp.some(player => player.name === 'Inactive Star'), false);
  assert.equal(view.awardRaces.mvp[0].minimumGames, 8);
});

test('season snapshot preserves totals and true weighted per-game values', () => {
  const card = { cardId: 'career', nbaId: 3, name: 'Career Player', team: 'LAL', ovr: 88, positions: ['PG'] };
  const journey = {
    seasonNo: 2, seasonStartedAt: '2027-01-01', gameIndex: 2, wins: 1, losses: 1,
    schedule: [
      { game: 1, boxScore: [line('Career Player', 10)] },
      { game: 2, boxScore: [line('Career Player', 30)] }
    ]
  };
  League.sync(journey, [], [card], { conferences: { west: [], east: [] } });
  const snapshot = League.snapshotPlayerSeasons(journey);
  assert.equal(snapshot.length, 1);
  assert.equal(snapshot[0].games, 2);
  assert.equal(snapshot[0].totals.pts, 40);
  assert.equal(snapshot[0].perGame.ppg, 20);
  assert.equal(snapshot[0].perGame.fgPct, 50);
});


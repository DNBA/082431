const assert = require('node:assert/strict');
const leagueApi = require('../js/season-league.js');

const teams = leagueApi.teams;
function player(name, team, ovr, positions, id) {
  return { name, team, edition: '26', realOvr: ovr, positions, nbaId: id, basic: null };
}
const nbaPlayers = [
  player('East Star', 'BOS', 97, ['SF'], 1), player('East Guard', 'NYK', 92, ['PG'], 2),
  player('West Star', 'LAL', 96, ['PG'], 3), player('West Big', 'SAS', 97, ['C'], 4),
  ...teams.map(([code], index) => player(`${code} Player`, code, 78 + (index % 10), index % 3 ? ['SG'] : ['C'], 100 + index))
];
const playerCard = { cardId: 'card-owner-star', name: 'Owner Star', team: 'LAL', realOvr: 96, ovr: 98, positions: ['SG'], nbaId: 977 };

function makeJourney(games) {
  const schedule = Array.from({ length: 82 }, (_, index) => ({
    game: index + 1, opponent: teams[index % teams.length][1], played: index < games,
    win: index % 3 !== 0, myScore: index % 3 !== 0 ? 118 : 108, oppScore: index % 3 !== 0 ? 106 : 113,
    boxScore: index < games ? [{ name: 'Owner Star', pts: 42 + (index % 4), reb: 8, ast: 7, stl: 2, blk: 1, role: 'starter' }] : []
  }));
  return {
    seasonNo: 1, seasonStartedAt: '2026-10-01T00:00:00+08:00', teamName: 'Owner Team',
    gameIndex: games, wins: schedule.slice(0, games).filter(game => game.win).length,
    losses: schedule.slice(0, games).filter(game => !game.win).length, schedule
  };
}

function standings(journey) {
  const records = { west: [], east: [] };
  teams.forEach(([code, name, conference], index) => {
    const wins = Math.max(0, Math.min(journey.gameIndex, Math.round(journey.gameIndex * (.35 + (index % 9) * .045))));
    records[conference].push({ code, name, conference, wins, losses: journey.gameIndex - wins, games: journey.gameIndex,
      percentage: journey.gameIndex ? wins / journey.gameIndex : 0, pointsFor: journey.gameIndex * (108 + index % 7), pointsAgainst: journey.gameIndex * (106 + index % 6) });
  });
  records.west.push({ code: 'YOU', name: journey.teamName, conference: 'west', isPlayer: true,
    wins: journey.wins, losses: journey.losses, games: journey.gameIndex,
    percentage: journey.gameIndex ? journey.wins / journey.gameIndex : 0,
    pointsFor: journey.gameIndex * 116, pointsAgainst: journey.gameIndex * 108 });
  return { conferences: records };
}

{
  const journey = makeJourney(10);
  leagueApi.sync(journey, nbaPlayers, [playerCard], standings(journey));
  const view = leagueApi.view(journey);
  assert.equal(journey.leagueState.lastSyncedGame, 10);
  assert.deepEqual(Object.keys(view.leaders).sort(), ['AST', 'BLK', 'PTS', 'REB', 'STL']);
  assert.ok(view.leaders.PTS.some(row => row.name === 'Owner Star' && row.isPlayer), 'real Journey stats must enter league leaders');
  assert.equal(view.monthlyAwards.length, 2, 'October must settle one winner per conference');
  assert.deepEqual(new Set(view.monthlyAwards.map(award => award.conference)), new Set(['west', 'east']));
  assert.ok(view.monthlyAwards.some(award => award.player === 'Owner Star' && award.isPlayer), 'owner player must compete for monthly honors');
  assert.equal(view.awardRaces.mvp.length, 5);
  assert.equal(view.awardRaces.dpoy.length, 5);
  assert.ok(view.awardRaces.mvp.every(item => ['up', 'down', 'same'].includes(item.movement)));
  const saved = JSON.stringify(journey);
  leagueApi.sync(journey, nbaPlayers, [playerCard], standings(journey));
  assert.equal(JSON.stringify(journey), saved, 'reload/render must not reroll saved league data');
  const monthKey = view.monthlyAwards[0].monthKey;
  leagueApi.markMonthSeen(journey, monthKey); leagueApi.markMonthSeen(journey, monthKey);
  assert.deepEqual(journey.leagueState.monthlyAwardsSeen, [monthKey], 'month completion must be seen exactly once');
}

{
  const journey = makeJourney(82);
  leagueApi.sync(journey, nbaPlayers, [playerCard], standings(journey));
  const view = leagueApi.view(journey);
  assert.equal(journey.leagueState.lastSyncedGame, 82);
  assert.equal(view.monthlyAwards.length, 14, 'seven months must produce East and West winners');
  assert.equal(view.finalAwardsLocked, true);
  assert.deepEqual(view.finalAwards.map(award => award.awardId), ['mvp', 'dpoy', 'scoring', 'rebound', 'assist']);
  const saved = JSON.stringify(journey);
  leagueApi.sync(journey, nbaPlayers, [playerCard], standings(journey));
  assert.equal(JSON.stringify(journey), saved, 'final awards must remain locked and stable after reload');
}

console.log('Season League: persisted CPU stats, actual player stats, five leaderboards, monthly awards, dynamic races, seen state, and final honors passed.');

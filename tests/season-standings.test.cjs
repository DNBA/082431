const assert = require('node:assert/strict');
const { ensure, view, teams } = require('../js/season-standings.js');

function makeJourney(games = 0, opponent = null) {
  const schedule = Array.from({ length: 82 }, (_, index) => ({
    game: index + 1, opponent: opponent || teams[index % teams.length][1], played: index < games,
    win: index % 3 !== 0, myScore: index % 3 !== 0 ? 115 : 102, oppScore: index % 3 !== 0 ? 102 : 115
  }));
  return { seasonNo: 1, seasonStartedAt: '2026-10-05T12:00:00+08:00', teamName: '測試夢幻隊',
    gameIndex: games, wins: schedule.slice(0, games).filter(game => game.win).length,
    losses: schedule.slice(0, games).filter(game => !game.win).length, schedule };
}

{
  const journey = makeJourney();
  const initial = view(journey);
  assert.equal(initial.conferences.east.length, 15);
  assert.equal(initial.conferences.west.length, 16);
  assert.equal(initial.rankLabel, '尚未排名');
  assert.equal(initial.player.rank, null);
  assert.equal(new Set([...initial.conferences.east, ...initial.conferences.west].map(team => team.code)).size, 31);
  assert.ok(initial.conferences.west.some(team => team.code === 'LAL'), 'Lakers must not disappear when adding the custom franchise');
}
{
  const journey = makeJourney(30, 'Lakers');
  const snapshot = view(journey);
  assert.equal(snapshot.byOpponent('Lakers').wins, journey.losses);
  assert.equal(snapshot.byOpponent('Lakers').losses, journey.wins);
  assert.equal(snapshot.player.wins, journey.wins);
  assert.equal(snapshot.player.losses, journey.losses);
  const saved = JSON.stringify(journey);
  view(journey); ensure(journey);
  assert.equal(JSON.stringify(journey), saved, 'Repeated rendering must not reroll or add duplicate matches');
  const restored = JSON.parse(saved); view(restored);
  assert.equal(JSON.stringify(restored), saved, 'Refreshing/reopening a saved season must preserve the exact table');
  const allTeams = Object.values(journey.leagueStandings.teams);
  assert.equal(allTeams.reduce((sum, row) => sum + row.wins, 0), allTeams.reduce((sum, row) => sum + row.losses, 0));
  for (const rows of Object.values(snapshot.conferences)) {
    assert.ok(rows.every((row, index) => !index || rows[index - 1].percentage >= row.percentage));
    assert.equal(rows[0].gamesBack, 0);
    assert.ok(rows.every((row, index) => row.rank === index + 1 && row.games <= 30));
  }
}
{
  const incremental = makeJourney(0); ensure(incremental);
  for (let count = 1; count <= 82; count++) {
    incremental.schedule[count - 1].played = true;
    incremental.gameIndex = count;
    incremental.wins += incremental.schedule[count - 1].win ? 1 : 0;
    incremental.losses += incremental.schedule[count - 1].win ? 0 : 1;
    ensure(incremental);
  }
  const batch = makeJourney(82); ensure(batch);
  assert.deepEqual(incremental.leagueStandings, batch.leagueStandings, 'Normal play and a fast 82-game simulation must produce identical league results');
  const finalRows = Object.values(batch.leagueStandings.teams);
  assert.ok(finalRows.every(row => row.wins + row.losses === 82), 'All teams must finish 82 games by the season finale');
  assert.equal(finalRows.reduce((sum, row) => sum + row.wins, 0), 1271);
  const finalSave = JSON.stringify(batch); ensure(batch);
  assert.equal(JSON.stringify(batch), finalSave, 'Season closeout must run exactly once');
}
{
  const journey = makeJourney(14); ensure(journey);
  journey.schedule[3].win = !journey.schedule[3].win;
  journey.wins = journey.schedule.slice(0, 14).filter(game => game.win).length;
  journey.losses = 14 - journey.wins;
  ensure(journey);
  const clean = JSON.parse(JSON.stringify(journey)); delete clean.leagueStandings; ensure(clean);
  assert.deepEqual(journey.leagueStandings, clean.leagueStandings, 'Corrected legacy results must rebuild consistently');
  journey.teamName = '新的隊名';
  assert.equal(view(journey).player.name, '新的隊名');
  const next = makeJourney(0); next.seasonNo = 2; next.leagueStandings = journey.leagueStandings;
  assert.ok(Object.values(ensure(next).teams).every(row => row.wins + row.losses === 0));
}

console.log('Conference standings: all 30 NBA teams, actual player results, stable save/reload, balanced records, full 82-game closeout, fast simulations, corrections, and season reset passed.');

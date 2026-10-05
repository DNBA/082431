(function (global) {
  'use strict';
  const TEAM_LIST = [
    ['BOS','Celtics','east'], ['NYK','Knicks','east'], ['BKN','Nets','east'], ['PHI','76ers','east'], ['TOR','Raptors','east'],
    ['CHI','Bulls','east'], ['CLE','Cavaliers','east'], ['DET','Pistons','east'], ['IND','Pacers','east'], ['MIL','Bucks','east'],
    ['ATL','Hawks','east'], ['CHA','Hornets','east'], ['MIA','Heat','east'], ['ORL','Magic','east'], ['WAS','Wizards','east'],
    ['DEN','Nuggets','west'], ['MIN','Timberwolves','west'], ['OKC','Thunder','west'], ['POR','Trail Blazers','west'], ['UTA','Jazz','west'],
    ['GSW','Warriors','west'], ['LAC','Clippers','west'], ['LAL','Lakers','west'], ['PHX','Suns','west'], ['SAC','Kings','west'],
    ['DAL','Mavericks','west'], ['HOU','Rockets','west'], ['MEM','Grizzlies','west'], ['NOP','Pelicans','west'], ['SAS','Spurs','west']
  ];
  const CODE_BY_NAME = Object.fromEntries(TEAM_LIST.map(([code, name]) => [name, code]));
  const PLAYER_ID = 'PLAYER';
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const count = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;

  function hash(value) {
    let result = 2166136261;
    for (const char of String(value)) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
    return result >>> 0;
  }
  function randomFor(seed) {
    let value = seed >>> 0;
    return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
  }
  function shuffled(items, random) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function signature(journey, round) {
    return hash((journey.schedule || []).slice(0, round).map(game => `${game.opponent}:${game.played ? String(game.win) : '?'}:${game.myScore}:${game.oppScore}`).join('|'));
  }
  function createLeague(journey, players) {
    const teams = {};
    TEAM_LIST.forEach(([code, name, conference]) => {
      const roster = players.filter(player => player?.team === code && String(player.edition || '') === '26')
        .map(player => Number(player.realOvr || player.baseOvr || player.ovr || 75)).filter(Number.isFinite).sort((a, b) => b - a).slice(0, 5);
      const strength = roster.length ? roster.reduce((sum, value) => sum + value, 0) / roster.length : 83;
      teams[code] = { code, name, conference, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, strength };
    });
    teams[PLAYER_ID] = { code: 'YOU', name: journey.teamName || '玩家夢幻隊', conference: 'west', isPlayer: true, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 };
    return {
      version: 1, seasonNo: count(journey.seasonNo) || 1,
      seed: hash(`${journey.seasonNo}|${journey.seasonStartedAt || ''}|${(journey.schedule || []).map(game => game.opponent).join(',')}`),
      round: 0, sourceSignature: signature(journey, 0), teams
    };
  }
  function recordMatch(teams, homeId, awayId, homeWin, homeScore, awayScore) {
    const home = teams[homeId], away = teams[awayId];
    home.wins += homeWin ? 1 : 0; home.losses += homeWin ? 0 : 1;
    away.wins += homeWin ? 0 : 1; away.losses += homeWin ? 1 : 0;
    home.pointsFor += homeScore; home.pointsAgainst += awayScore;
    away.pointsFor += awayScore; away.pointsAgainst += homeScore;
  }
  function simulateMatch(league, homeId, awayId, random) {
    const probability = clamp(.5 + (league.teams[homeId].strength - league.teams[awayId].strength) * .035, .16, .84);
    const win = random() < probability;
    const losingScore = 90 + Math.floor(random() * 27);
    const winningScore = losingScore + 1 + Math.floor(random() * 17);
    recordMatch(league.teams, homeId, awayId, win, win ? winningScore : losingScore, win ? losingScore : winningScore);
  }
  function simulateRound(league, journey, index) {
    const random = randomFor(hash(`${league.seed}:${index}`));
    const game = journey.schedule?.[index];
    const opponentId = CODE_BY_NAME[game?.opponent];
    const hasPlayerResult = opponentId && game?.played && typeof game.win === 'boolean';
    let available = TEAM_LIST.map(([code]) => code);
    if (hasPlayerResult) {
      recordMatch(league.teams, PLAYER_ID, opponentId, game.win, count(game.myScore), count(game.oppScore));
      available = available.filter(code => code !== opponentId);
    }
    const matchups = shuffled(available, random);
    // The existing custom franchise adds a 31st team. A different NBA team has
    // a bye each round; no NBA team is silently removed or credited twice.
    if (matchups.length % 2) {
      const mostGames = Math.max(...matchups.map(id => league.teams[id].wins + league.teams[id].losses));
      const byeAt = matchups.findIndex(id => league.teams[id].wins + league.teams[id].losses === mostGames);
      matchups.splice(byeAt, 1);
    }
    for (let i = 0; i < matchups.length; i += 2) {
      simulateMatch(league, matchups[i], matchups[i + 1], random);
    }
  }
  function finishNpcSchedules(league) {
    const random = randomFor(hash(`${league.seed}:season-closeout`));
    for (let index = 0; index < 82; index++) {
      const remaining = TEAM_LIST.map(([code]) => code).filter(id => league.teams[id].wins + league.teams[id].losses < 82)
        .sort((a, b) => (league.teams[a].wins + league.teams[a].losses) - (league.teams[b].wins + league.teams[b].losses) || a.localeCompare(b));
      if (remaining.length < 2) break;
      simulateMatch(league, remaining[0], remaining[1], random);
    }
    league.closedOut = true;
  }
  function ensure(journey, players = []) {
    if (!journey) return null;
    const round = clamp(count(journey.gameIndex), 0, 82);
    let league = journey.leagueStandings;
    const valid = league?.version === 1 && league.seasonNo === (count(journey.seasonNo) || 1)
      && Number.isInteger(league.round) && league.round >= 0 && league.round <= round
      && Number.isFinite(league.seed) && league.sourceSignature === signature(journey, league.round)
      && Object.keys(league.teams || {}).length === 31
      && [...TEAM_LIST.map(([code]) => code), PLAYER_ID].every(id => {
        const row = league.teams[id];
        const expected = TEAM_LIST.find(([code]) => code === id);
        return row && Number.isInteger(row.wins) && Number.isInteger(row.losses) && row.wins >= 0 && row.losses >= 0
          && row.wins + row.losses <= league.round && Number.isFinite(row.pointsFor) && Number.isFinite(row.pointsAgainst)
          && typeof row.name === 'string' && row.code === (expected?.[0] || 'YOU') && row.conference === (expected?.[2] || 'west')
          && (id === PLAYER_ID || Number.isFinite(row.strength));
      });
    if (!valid) league = journey.leagueStandings = createLeague(journey, players);
    for (let index = league.round; index < round; index++) simulateRound(league, journey, index);
    if (round === 82 && !league.closedOut) finishNpcSchedules(league);
    league.round = round;
    league.sourceSignature = signature(journey, round);
    const player = league.teams[PLAYER_ID];
    player.name = journey.teamName || '玩家夢幻隊';
    // Saved player totals are authoritative, including legacy saves whose
    // individual game results are incomplete. Never change the real season.
    player.wins = count(journey.wins); player.losses = count(journey.losses);
    return league;
  }
  function sortRows(rows) {
    return [...rows].sort((a, b) => b.percentage - a.percentage || b.wins - a.wins
      || b.netPerGame - a.netPerGame || a.code.localeCompare(b.code));
  }
  function view(journey, players = []) {
    const league = ensure(journey, players);
    if (!league) return null;
    const conferences = {};
    for (const conference of ['west', 'east']) {
      const rows = Object.values(league.teams).filter(team => team.conference === conference).map(team => {
        const games = team.wins + team.losses;
        return { ...team, games, percentage: games ? team.wins / games : 0,
          netPerGame: games ? (team.pointsFor - team.pointsAgainst) / games : 0 };
      });
      const sorted = sortRows(rows), leader = sorted[0];
      conferences[conference] = sorted.map((row, index) => ({ ...row, rank: league.round ? index + 1 : null,
        gamesBack: ((leader.wins - row.wins) + (row.losses - leader.losses)) / 2 }));
    }
    const player = conferences.west.find(row => row.isPlayer);
    return { round: league.round, conferences, player,
      rankLabel: league.round ? `西區第 ${player.rank} 名` : '尚未排名',
      byOpponent: name => league.teams[CODE_BY_NAME[name]] || null };
  }
  const api = { ensure, view, teams: TEAM_LIST };
  global.SeasonStandings = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

(function (global) {
  'use strict';

  const VERSION = 2;
  const STAT_KEYS = ['pts', 'reb', 'ast', 'stl', 'blk', 'threeM', 'threeA'];
  const LEADER_CONFIG = Object.freeze({
    PTS: { key: 'ppg', label: 'PTS', suffix: 'PPG' },
    REB: { key: 'rpg', label: 'REB', suffix: 'RPG' },
    AST: { key: 'apg', label: 'AST', suffix: 'APG' },
    STL: { key: 'spg', label: 'STL', suffix: 'SPG' },
    BLK: { key: 'bpg', label: 'BLK', suffix: 'BPG' }
  });
  const TEAM_LIST = Object.freeze([
    ['BOS', 'Celtics', 'east'], ['NYK', 'Knicks', 'east'], ['BKN', 'Nets', 'east'], ['PHI', '76ers', 'east'], ['TOR', 'Raptors', 'east'],
    ['CHI', 'Bulls', 'east'], ['CLE', 'Cavaliers', 'east'], ['DET', 'Pistons', 'east'], ['IND', 'Pacers', 'east'], ['MIL', 'Bucks', 'east'],
    ['ATL', 'Hawks', 'east'], ['CHA', 'Hornets', 'east'], ['MIA', 'Heat', 'east'], ['ORL', 'Magic', 'east'], ['WAS', 'Wizards', 'east'],
    ['DEN', 'Nuggets', 'west'], ['MIN', 'Timberwolves', 'west'], ['OKC', 'Thunder', 'west'], ['POR', 'Trail Blazers', 'west'], ['UTA', 'Jazz', 'west'],
    ['GSW', 'Warriors', 'west'], ['LAC', 'Clippers', 'west'], ['LAL', 'Lakers', 'west'], ['PHX', 'Suns', 'west'], ['SAC', 'Kings', 'west'],
    ['DAL', 'Mavericks', 'west'], ['HOU', 'Rockets', 'west'], ['MEM', 'Grizzlies', 'west'], ['NOP', 'Pelicans', 'west'], ['SAS', 'Spurs', 'west']
  ]);
  const TEAM_META = Object.freeze(Object.fromEntries(TEAM_LIST.map(([code, name, conference]) => [code, { code, name, conference }])));
  const MONTH_BLUEPRINT = Object.freeze([
    ['OCTOBER', 'OCT', 10], ['NOVEMBER', 'NOV', 22], ['DECEMBER', 'DEC', 35],
    ['JANUARY', 'JAN', 49], ['FEBRUARY', 'FEB', 62], ['MARCH', 'MAR', 74], ['APRIL', 'APR', 82]
  ]);

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const round = (value, places = 1) => Number((Number(value) || 0).toFixed(places));
  function hash(value) {
    let result = 2166136261;
    for (const char of String(value)) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
    return result >>> 0;
  }
  function randomFor(seed) {
    let value = seed >>> 0;
    return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
  }
  function numberStat(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  function positionsOf(player) {
    const source = player?.positions ?? player?.pos ?? [];
    return (Array.isArray(source) ? source : String(source).split(/[,/\s-]+/)).map(String).filter(Boolean);
  }
  function playerOvr(player) {
    return clamp(Number(player?.realOvr || player?.real_ovr || player?.baseOvr || player?.ovr || 75), 65, 99);
  }
  function seasonYears(seasonNo) {
    const startYear = 2025 + Math.max(1, Number(seasonNo) || 1);
    return { startYear, endYear: startYear + 1, label: `${startYear}-${String(startYear + 1).slice(-2)}` };
  }
  function monthPlan(seasonNo) {
    const { startYear, endYear } = seasonYears(seasonNo);
    let startGame = 1;
    return MONTH_BLUEPRINT.map(([label, short, endGame], index) => {
      const year = index < 3 ? startYear : endYear;
      const month = index < 3 ? index + 10 : index - 2;
      const item = { key: `${year}-${String(month).padStart(2, '0')}`, label, short, year, startGame, endGame };
      startGame = endGame + 1;
      return item;
    });
  }
  function monthForGame(seasonNo, gameNumber) {
    const target = clamp(Math.max(1, Number(gameNumber) || 1), 1, 82);
    return monthPlan(seasonNo).find(month => target <= month.endGame) || monthPlan(seasonNo).at(-1);
  }
  function monthForProgress(seasonNo, completedGames) {
    return monthForGame(seasonNo, Math.min(82, Math.max(1, Number(completedGames) + 1)));
  }

  function baselineFor(player) {
    const ovr = playerOvr(player);
    const positions = positionsOf(player);
    const guard = positions.some(position => ['PG', 'SG'].includes(position));
    const point = positions.includes('PG');
    const big = positions.some(position => ['PF', 'C'].includes(position));
    const center = positions.includes('C');
    const basic = player?.basic || {};
    const threeA = clamp(numberStat(basic['3PA']) ?? (guard ? 4.6 : (big ? 1.8 : 3.2)), 0.3, 11.8);
    let threePct = numberStat(basic['3P%']) ?? (guard ? 36 : 34);
    if (threePct > 0 && threePct < 1) threePct *= 100;
    return {
      pts: clamp(numberStat(basic.PTS) ?? (6.2 + (ovr - 70) * .87 + (guard ? 1.2 : 0)), 4, 34.5),
      reb: clamp(numberStat(basic.REB) ?? (2.2 + (ovr - 70) * .14 + (big ? 4.2 : 0) + (center ? 1.4 : 0)), 1.5, 14.5),
      ast: clamp(numberStat(basic.AST) ?? (1.2 + (ovr - 70) * .1 + (guard ? 2 : 0) + (point ? 2.1 : 0)), .8, 11.5),
      stl: clamp(numberStat(basic.STL) ?? (.45 + (ovr - 70) * .035 + (guard ? .18 : 0)), .3, 2.4),
      blk: clamp(numberStat(basic.BLK) ?? (.25 + (ovr - 70) * .025 + (big ? .55 : 0) + (center ? .45 : 0)), .15, 3.8),
      threeA,
      threeM: clamp(threeA * clamp(threePct, 20, 50) / 100, 0, threeA)
    };
  }
  function emptyTotals() { return { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, threeM: 0, threeA: 0 }; }
  function createStatRecord(player, options = {}) {
    const team = options.team || player?.team || 'FA';
    const meta = TEAM_META[team];
    return {
      key: options.key || `${options.isPlayer ? 'player' : 'cpu'}:${team}:${player?.nbaId || player?.id || player?.name}`,
      name: String(player?.name || 'Unknown Player'), nbaId: Number(player?.nbaId || player?.id || 0),
      team, conference: options.conference || meta?.conference || 'west', ovr: playerOvr(player),
      positions: positionsOf(player), isPlayer: !!options.isPlayer, source: options.isPlayer ? 'player' : 'cpu',
      games: 0, totals: emptyTotals(), months: {}, base: baselineFor(player)
    };
  }
  function addLine(record, line, monthKey) {
    record.games += 1;
    if (!record.months[monthKey]) record.months[monthKey] = { games: 0, ...emptyTotals() };
    record.months[monthKey].games += 1;
    STAT_KEYS.forEach(stat => {
      const value = Math.max(0, Number(line[stat]) || 0);
      record.totals[stat] = round(record.totals[stat] + value, 2);
      record.months[monthKey][stat] = round(record.months[monthKey][stat] + value, 2);
    });
  }

  function chooseCpuPlayers(players) {
    const currentEdition = (players || []).filter(player => String(player?.edition || '') === '26' && player?.name && TEAM_META[player.team]);
    const source = currentEdition.length ? currentEdition : (players || []).filter(player => player?.name && TEAM_META[player.team]);
    const byTeam = new Map();
    source.forEach(player => {
      const list = byTeam.get(player.team) || [];
      if (!list.some(item => item.name === player.name)) list.push(player);
      byTeam.set(player.team, list);
    });
    return TEAM_LIST.flatMap(([code]) => (byTeam.get(code) || []).sort((a, b) => playerOvr(b) - playerOvr(a)).slice(0, 5));
  }
  function createLeagueState(journey) {
    return {
      version: VERSION, seasonNo: Number(journey?.seasonNo) || 1,
      seed: hash(`${journey?.seasonNo || 1}|${journey?.seasonStartedAt || ''}|${(journey?.schedule || []).map(game => game.opponent).join(',')}`),
      lastSyncedGame: 0, playerStats: {}, teamRecords: {}, leaders: {},
      awardRaces: { mvp: [], dpoy: [] }, previousRaceRanks: { mvp: {}, dpoy: {} }, raceUpdatedAt: -1,
      monthlyAwards: [], monthlyAwardsSeen: [], currentMonth: monthForProgress(journey?.seasonNo, 0).key,
      finalAwards: [], finalAwardsLocked: false
    };
  }
  function ensureLeagueState(journey) {
    const currentSeason = Number(journey?.seasonNo) || 1;
    const saved = journey?.leagueState;
    const valid = saved && saved.version === VERSION && Number(saved.seasonNo) === currentSeason
      && Number.isFinite(Number(saved.seed)) && Number.isInteger(saved.lastSyncedGame)
      && saved.lastSyncedGame >= 0 && saved.lastSyncedGame <= Math.max(0, Number(journey?.gameIndex) || 0)
      && saved.playerStats && typeof saved.playerStats === 'object';
    if (!valid) journey.leagueState = createLeagueState(journey);
    const league = journey.leagueState;
    if (!Array.isArray(league.monthlyAwards)) league.monthlyAwards = [];
    if (!Array.isArray(league.monthlyAwardsSeen)) league.monthlyAwardsSeen = [];
    if (!league.awardRaces || typeof league.awardRaces !== 'object') league.awardRaces = { mvp: [], dpoy: [] };
    if (!league.previousRaceRanks || typeof league.previousRaceRanks !== 'object') league.previousRaceRanks = { mvp: {}, dpoy: {} };
    if (!Array.isArray(league.finalAwards)) league.finalAwards = [];
    return league;
  }
  function ensureCpuRoster(league, players) {
    chooseCpuPlayers(players).forEach(player => {
      const key = `cpu:${player.team}:${player.nbaId || player.name}`;
      if (!league.playerStats[key]) league.playerStats[key] = createStatRecord(player, { key });
    });
  }
  function simulateCpuGame(league, record, gameNumber, seasonNo) {
    const month = monthForGame(seasonNo, gameNumber);
    const random = randomFor(hash(`${league.seed}|${record.key}|${gameNumber}`));
    const monthlyRandom = randomFor(hash(`${league.seed}|${record.key}|${month.key}`));
    const monthlyForm = .91 + monthlyRandom() * .18;
    const line = {};
    STAT_KEYS.forEach((stat, index) => {
      if (stat === 'threeM') return;
      const volatility = stat === 'pts' ? .28 : (['stl', 'blk'].includes(stat) ? .55 : .34);
      const noise = 1 + (random() - .5) * volatility * 2;
      const raw = record.base[stat] * monthlyForm * noise;
      line[stat] = stat === 'pts' ? Math.max(0, Math.round(raw)) : (stat === 'threeA' ? Math.max(0, Math.round(raw)) : round(Math.max(0, raw), 1));
      if (index % 2 === 0) random();
    });
    const baseThreePct = record.base.threeA > 0 ? record.base.threeM / record.base.threeA : .34;
    line.threeM = clamp(Math.round((line.threeA || 0) * clamp(baseThreePct + (random() - .5) * .09, .2, .52)), 0, line.threeA || 0);
    addLine(record, line, month.key);
  }
  function syncCpuStats(league, journey) {
    const target = clamp(Number(journey?.gameIndex) || 0, 0, 82);
    for (let gameNumber = league.lastSyncedGame + 1; gameNumber <= target; gameNumber += 1) {
      Object.values(league.playerStats).filter(record => record.source === 'cpu').forEach(record => simulateCpuGame(league, record, gameNumber, journey.seasonNo));
    }
    league.lastSyncedGame = target;
  }
  function syncPlayerStats(league, journey, playerCards) {
    Object.keys(league.playerStats).forEach(key => { if (league.playerStats[key]?.source === 'player') delete league.playerStats[key]; });
    const cards = new Map();
    (playerCards || []).filter(Boolean).forEach(card => { if (!cards.has(card.name)) cards.set(card.name, card); });
    const records = new Map();
    cards.forEach(card => {
      const key = `player:${card.cardId || card.nbaId || card.name}`;
      records.set(card.name, createStatRecord(card, { key, team: 'PLAYER', conference: 'west', isPlayer: true }));
    });
    (journey?.schedule || []).slice(0, Number(journey?.gameIndex) || 0).forEach((game, index) => {
      const month = monthForGame(journey.seasonNo, Number(game.game) || index + 1);
      (game.boxScore || []).forEach(row => {
        if (!records.has(row.name)) records.set(row.name, createStatRecord({ ...row, name: row.name }, { key: `player:${row.name}`, team: 'PLAYER', conference: 'west', isPlayer: true }));
        addLine(records.get(row.name), row, month.key);
      });
    });
    records.forEach(record => { league.playerStats[record.key] = record; });
  }
  function syncTeamRecords(league, standingsView, journey) {
    const records = {};
    if (standingsView?.conferences) {
      ['west', 'east'].forEach(conference => (standingsView.conferences[conference] || []).forEach(team => {
        const key = team.isPlayer ? 'PLAYER' : team.code;
        const games = Number(team.games) || Number(team.wins || 0) + Number(team.losses || 0);
        records[key] = {
          code: key, name: team.name, conference, isPlayer: !!team.isPlayer,
          wins: Number(team.wins) || 0, losses: Number(team.losses) || 0,
          pointsFor: Number(team.pointsFor) || 0, pointsAgainst: Number(team.pointsAgainst) || 0,
          winPct: games ? Number(team.wins || 0) / games : 0, games
        };
      }));
    }
    if (!records.PLAYER) {
      const games = Number(journey?.wins || 0) + Number(journey?.losses || 0);
      records.PLAYER = { code: 'PLAYER', name: journey?.teamName || '玩家夢幻隊', conference: 'west', isPlayer: true,
        wins: Number(journey?.wins) || 0, losses: Number(journey?.losses) || 0, pointsFor: 0, pointsAgainst: 0,
        winPct: games ? Number(journey.wins || 0) / games : 0, games };
    }
    league.teamRecords = records;
  }
  function averages(record, monthKey = null) {
    const source = monthKey ? record.months?.[monthKey] : record;
    const games = Number(source?.games) || 0;
    const totals = monthKey ? source : record.totals;
    const base = record.base || emptyTotals();
    return {
      games,
      ppg: round(games ? totals.pts / games : base.pts), rpg: round(games ? totals.reb / games : base.reb),
      apg: round(games ? totals.ast / games : base.ast), spg: round(games ? totals.stl / games : base.stl),
      bpg: round(games ? totals.blk / games : base.blk)
    };
  }
  function publicPlayer(record, league, monthKey = null) {
    const stat = averages(record, monthKey);
    const statSource = monthKey ? record.months?.[monthKey] : record;
    const statTotals = monthKey ? statSource : record.totals;
    const teamRecord = league.teamRecords[record.team] || { wins: 0, losses: 0, winPct: .5, games: 0, pointsAgainst: 0 };
    const defenseAllowed = teamRecord.games ? teamRecord.pointsAgainst / teamRecord.games : 112;
    // Old saves may have games but no tracked 3PM / 3PA. Fall back to the
    // player's baseline instead of presenting the missing fields as 0.0%.
    const hasTrackedThrees = stat.games > 0 && Number(statTotals?.threeA || 0) > 0;
    const threePa = round(hasTrackedThrees ? Number(statTotals.threeA) / stat.games : Number(record.base?.threeA || 0));
    const threePm = round(hasTrackedThrees ? Number(statTotals.threeM || 0) / stat.games : Number(record.base?.threeM || 0));
    return {
      key: record.key, name: record.name, nbaId: record.nbaId, team: record.team, conference: record.conference,
      ovr: record.ovr, isPlayer: record.isPlayer, projected: stat.games === 0, ...stat,
      teamWins: teamRecord.wins, teamLosses: teamRecord.losses, teamWinPct: teamRecord.games ? teamRecord.winPct : .5,
      teamDefense: clamp(116 - defenseAllowed, -4, 12),
      threePa,
      threePm,
      threePct: round(threePa > 0 ? threePm / threePa * 100 : 0)
    };
  }
  function combinedPlayers(league, monthKey = null) {
    const playerNames = new Set(Object.values(league.playerStats).filter(record => record.isPlayer && record.games > 0).map(record => record.name));
    return Object.values(league.playerStats)
      .filter(record => record.isPlayer || !playerNames.has(record.name))
      .map(record => publicPlayer(record, league, monthKey));
  }
  function performanceScore(player) {
    return player.ppg + player.rpg * 1.1 + player.apg * 1.4 + player.spg * 2 + player.bpg * 2;
  }
  function mvpScore(player, recent) {
    return performanceScore(player) * .7 + player.teamWinPct * 20 + performanceScore(recent || player) * .1;
  }
  function dpoyScore(player) {
    const defensiveRatingProxy = (player.ovr - 70) * .08 + player.teamDefense;
    return player.spg * 3.2 + player.bpg * 4.2 + player.rpg * .65 + defensiveRatingProxy + player.teamWinPct * 5;
  }
  function rankRace(league, type, players, recentMonthKey) {
    const previous = new Map((league.awardRaces[type] || []).map(item => [item.key, item.rank]));
    const recentByKey = new Map(combinedPlayers(league, recentMonthKey).map(player => [player.key, player]));
    const sorted = [...players].sort((a, b) => {
      const aScore = type === 'mvp' ? mvpScore(a, recentByKey.get(a.key)) : dpoyScore(a);
      const bScore = type === 'mvp' ? mvpScore(b, recentByKey.get(b.key)) : dpoyScore(b);
      return bScore - aScore || b.ovr - a.ovr || a.name.localeCompare(b.name);
    }).slice(0, 5);
    return sorted.map((player, index) => {
      const rank = index + 1, oldRank = previous.get(player.key);
      return { ...player, rank, score: round(type === 'mvp' ? mvpScore(player, recentByKey.get(player.key)) : dpoyScore(player), 2),
        movement: oldRank == null || oldRank === rank ? 'same' : (oldRank > rank ? 'up' : 'down') };
    });
  }
  function updateLeadersAndRaces(league, journey, force = false) {
    const players = combinedPlayers(league);
    Object.entries(LEADER_CONFIG).forEach(([category, config]) => {
      league.leaders[category] = [...players].sort((a, b) => b[config.key] - a[config.key] || b.ovr - a.ovr).slice(0, 5)
        .map((player, index) => ({ ...player, rank: index + 1, value: player[config.key], suffix: config.suffix }));
    });
    const gameIndex = Number(journey?.gameIndex) || 0;
    const cadence = Math.floor(gameIndex / 5) * 5;
    if (!force && league.raceUpdatedAt === cadence && league.awardRaces.mvp?.length && league.awardRaces.dpoy?.length) return;
    const recentMonth = monthForGame(journey.seasonNo, Math.max(1, gameIndex)).key;
    league.awardRaces.mvp = rankRace(league, 'mvp', players, recentMonth);
    league.awardRaces.dpoy = rankRace(league, 'dpoy', players, recentMonth);
    league.raceUpdatedAt = cadence;
  }
  function monthlyWinner(league, month, conference) {
    const players = combinedPlayers(league, month.key).filter(player => player.conference === conference && player.games > 0);
    const winner = players.sort((a, b) => (performanceScore(b) + b.teamWinPct * 5) - (performanceScore(a) + a.teamWinPct * 5) || b.ovr - a.ovr)[0];
    if (!winner) return null;
    return {
      id: `${league.seasonNo}:${month.key}:${conference}:${winner.key}`,
      monthKey: month.key, monthLabel: month.label, monthShort: month.short, year: month.year,
      conference, player: winner.name, playerKey: winner.key, nbaId: winner.nbaId,
      team: winner.team, isPlayer: winner.isPlayer,
      stats: { ppg: winner.ppg, rpg: winner.rpg, apg: winner.apg, spg: winner.spg, bpg: winner.bpg },
      settledAtGame: month.endGame
    };
  }
  function settleMonthlyAwards(league, journey) {
    const completed = Number(journey?.gameIndex) || 0;
    monthPlan(journey.seasonNo).filter(month => month.endGame <= completed).forEach(month => {
      if (league.monthlyAwards.some(award => award.monthKey === month.key)) return;
      ['west', 'east'].forEach(conference => {
        const award = monthlyWinner(league, month, conference);
        if (award) league.monthlyAwards.push(award);
      });
    });
    league.currentMonth = monthForProgress(journey.seasonNo, completed).key;
  }
  function finalizeAwards(league, journey) {
    if (league.finalAwardsLocked || Number(journey?.gameIndex) < 82) return league.finalAwards;
    updateLeadersAndRaces(league, journey, true);
    const mvp = league.awardRaces.mvp[0], dpoy = league.awardRaces.dpoy[0];
    const scoring = league.leaders.PTS?.[0], rebound = league.leaders.REB?.[0], assist = league.leaders.AST?.[0];
    league.finalAwards = [
      mvp && { awardId: 'mvp', icon: '🏆', label: '年度 MVP', player: mvp.name, playerKey: mvp.key, isPlayer: mvp.isPlayer, stat: `${mvp.ppg.toFixed(1)}分 ${mvp.rpg.toFixed(1)}板 ${mvp.apg.toFixed(1)}助` },
      dpoy && { awardId: 'dpoy', icon: '🛡️', label: '最佳防守 DPOY', player: dpoy.name, playerKey: dpoy.key, isPlayer: dpoy.isPlayer, stat: `${dpoy.bpg.toFixed(1)}鍋 ${dpoy.spg.toFixed(1)}抄 ${dpoy.rpg.toFixed(1)}板` },
      scoring && { awardId: 'scoring', icon: '🏹', label: '聯盟得分王', player: scoring.name, playerKey: scoring.key, isPlayer: scoring.isPlayer, stat: `場均 ${scoring.ppg.toFixed(1)} 分` },
      rebound && { awardId: 'rebound', icon: '🌊', label: '聯盟籃板王', player: rebound.name, playerKey: rebound.key, isPlayer: rebound.isPlayer, stat: `場均 ${rebound.rpg.toFixed(1)} 板` },
      assist && { awardId: 'assist', icon: '🎯', label: '聯盟助攻王', player: assist.name, playerKey: assist.key, isPlayer: assist.isPlayer, stat: `場均 ${assist.apg.toFixed(1)} 助` }
    ].filter(Boolean);
    league.finalAwardsLocked = true;
    return league.finalAwards;
  }
  function buildTeamTrends(league, journey) {
    const gameIndex = Number(journey?.gameIndex) || 0;
    const playerRecent = (journey?.schedule || []).slice(Math.max(0, gameIndex - 5), gameIndex).map(game => !!game.win);
    return Object.values(league.teamRecords).map(team => {
      let results;
      if (team.isPlayer) results = playerRecent;
      else {
        const random = randomFor(hash(`${league.seed}|trend|${team.code}|${gameIndex}`));
        const chance = clamp(team.games ? team.winPct : .5, .22, .78);
        results = Array.from({ length: Math.min(5, Math.max(0, gameIndex)) }, () => random() < chance);
      }
      const winsLast5 = results.filter(Boolean).length;
      let streak = 0, streakType = '';
      if (results.length) {
        const last = results.at(-1); streakType = last ? 'W' : 'L';
        for (let index = results.length - 1; index >= 0 && results[index] === last; index -= 1) streak += 1;
      }
      return { ...team, winsLast5, form: results.map(win => win ? 'W' : 'L'), streak, streakType };
    }).sort((a, b) => b.winsLast5 - a.winsLast5 || b.winPct - a.winPct);
  }
  function sync(journey, players = [], playerCards = [], standingsView = null) {
    if (!journey) return null;
    const league = ensureLeagueState(journey);
    ensureCpuRoster(league, players);
    syncCpuStats(league, journey);
    syncPlayerStats(league, journey, playerCards);
    syncTeamRecords(league, standingsView, journey);
    updateLeadersAndRaces(league, journey);
    settleMonthlyAwards(league, journey);
    if (Number(journey.gameIndex) >= 82) finalizeAwards(league, journey);
    return league;
  }
  function view(journey) {
    const league = journey?.leagueState;
    if (!league) return null;
    return {
      season: seasonYears(journey.seasonNo), months: monthPlan(journey.seasonNo), currentMonth: league.currentMonth,
      leaders: league.leaders || {}, awardRaces: league.awardRaces || { mvp: [], dpoy: [] },
      monthlyAwards: league.monthlyAwards || [], monthlyAwardsSeen: league.monthlyAwardsSeen || [],
      finalAwards: league.finalAwards || [], finalAwardsLocked: !!league.finalAwardsLocked,
      teamTrends: buildTeamTrends(league, journey)
    };
  }
  function markMonthSeen(journey, monthKey) {
    const league = ensureLeagueState(journey);
    if (!league.monthlyAwardsSeen.includes(monthKey)) league.monthlyAwardsSeen.push(monthKey);
  }

  const api = { sync, view, finalizeAwards, markMonthSeen, monthPlan, monthForGame, seasonYears, LEADER_CONFIG, teams: TEAM_LIST };
  global.SeasonLeague = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

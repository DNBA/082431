(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SeasonAllStar = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const VERSION = 1;
  const SELECTION_GAME = 47;
  const WEEKEND_GAME = 50;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const round = (value, places = 1) => Number((Number(value) || 0).toFixed(places));

  function hash(value) {
    let result = 2166136261;
    for (const character of String(value)) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
    return result >>> 0;
  }

  function seeded(seed) {
    let value = seed >>> 0;
    return () => {
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function positionsOf(record) {
    const source = record?.positions || [];
    return (Array.isArray(source) ? source : String(source).split(/[,/\s-]+/)).map(String).filter(Boolean);
  }

  function groupOf(record) {
    return positionsOf(record).some(position => ['PG', 'SG'].includes(position)) ? 'guard' : 'frontcourt';
  }

  function average(record, key, monthKey = null) {
    const source = monthKey ? record?.months?.[monthKey] : record;
    const totals = monthKey ? source : record?.totals;
    const games = Number(source?.games ?? record?.games) || 0;
    if (games > 0) return Number(totals?.[key] || 0) / games;
    return Number(record?.base?.[key] || 0);
  }

  function latestMonthKey(record) {
    const months = Object.entries(record?.months || {}).filter(([, value]) => Number(value?.games) > 0);
    return months.sort(([a], [b]) => b.localeCompare(a))[0]?.[0] || null;
  }

  function publicPlayer(record, league) {
    const recentKey = latestMonthKey(record);
    const team = league?.teamRecords?.[record.team] || {};
    const games = Number(record?.games) || 0;
    const threePa = average(record, 'threeA');
    const threePm = average(record, 'threeM');
    return {
      key: record.key,
      name: record.name,
      nbaId: Number(record.nbaId || 0),
      team: record.team,
      conference: record.conference || 'west',
      positions: positionsOf(record),
      group: groupOf(record),
      ovr: Number(record.ovr || 75),
      isPlayer: !!record.isPlayer,
      games,
      ppg: round(average(record, 'pts')),
      rpg: round(average(record, 'reb')),
      apg: round(average(record, 'ast')),
      spg: round(average(record, 'stl')),
      bpg: round(average(record, 'blk')),
      threePa: round(threePa),
      threePm: round(threePm),
      threePct: round(threePa > 0 ? threePm / threePa * 100 : 0),
      recentPpg: round(average(record, 'pts', recentKey)),
      recentThreePa: round(average(record, 'threeA', recentKey)),
      recentThreePm: round(average(record, 'threeM', recentKey)),
      teamWinPct: Number(team.winPct ?? .5),
      teamWins: Number(team.wins || 0)
    };
  }

  function leaguePlayers(league) {
    const playerNames = new Set(Object.values(league?.playerStats || {}).filter(record => record.isPlayer && record.games > 0).map(record => record.name));
    return Object.values(league?.playerStats || {})
      .filter(record => record.isPlayer || !playerNames.has(record.name))
      .map(record => publicPlayer(record, league))
      .filter(player => player.name && (player.games >= 10 || player.ovr >= 78));
  }

  function performance(player) {
    if (player.group === 'guard') return player.ppg * 1.2 + player.apg * 1.8 + player.spg * 3.2 + player.threePct * .09;
    if (positionsOf(player).includes('C')) return player.ppg * 1.05 + player.rpg * 1.55 + player.bpg * 4 + player.apg * .7;
    return player.ppg * 1.16 + player.rpg * 1.05 + player.apg * 1.05 + (player.spg + player.bpg) * 2.3;
  }

  function scoredPlayer(player, seed, phase) {
    const random = seeded(hash(`${seed}|${phase}|${player.key}`));
    const base = performance(player);
    const recent = base ? clamp((player.recentPpg + player.rpg + player.apg) / Math.max(1, player.ppg + player.rpg + player.apg), .78, 1.25) : 1;
    const reputation = clamp((player.ovr - 70) / 29, 0, 1);
    const popularity = clamp(reputation * .82 + (player.isPlayer ? .08 : 0) + random() * .1, 0, 1);
    const story = random();
    const variance = .96 + random() * .08;
    const score = phase === 'starter'
      ? (base * .4 + popularity * 28 + player.teamWinPct * 15 + recent * 10 + story * 10) * variance
      : (base * .6 + player.teamWinPct * 20 + recent * 15 + story * 5) * variance;
    return { ...player, score: round(score, 2), reputation: round(reputation, 3), popularity: round(popularity, 3), recentForm: round(recent, 3) };
  }

  function takeUnique(target, source, count, used) {
    for (const player of source) {
      if (target.length >= count) break;
      if (used.has(player.key)) continue;
      used.add(player.key);
      target.push(player);
    }
  }

  function selectConference(players, conference, seed) {
    const pool = players.filter(player => player.conference === conference);
    const starterScores = pool.map(player => scoredPlayer(player, seed, 'starter')).sort((a, b) => b.score - a.score || b.ovr - a.ovr);
    const starters = [];
    const used = new Set();
    takeUnique(starters, starterScores.filter(player => player.group === 'guard'), 2, used);
    takeUnique(starters, starterScores.filter(player => player.group === 'frontcourt'), 5, used);
    takeUnique(starters, starterScores, 5, used);

    const reserveScores = pool.map(player => scoredPlayer(player, seed, 'reserve')).sort((a, b) => b.score - a.score || b.ovr - a.ovr);
    const reserves = [];
    takeUnique(reserves, reserveScores.filter(player => player.group === 'guard'), 2, used);
    takeUnique(reserves, reserveScores.filter(player => player.group === 'frontcourt'), 5, used);
    takeUnique(reserves, reserveScores, 6, used);
    const wildcard = reserveScores.filter(player => !used.has(player.key)).sort((a, b) => {
      const aStory = a.recentForm * 10 + (100 - a.ovr) * .03 + seeded(hash(`${seed}|wild|${a.key}`))() * 5;
      const bStory = b.recentForm * 10 + (100 - b.ovr) * .03 + seeded(hash(`${seed}|wild|${b.key}`))() * 5;
      return bStory - aStory;
    })[0];
    if (wildcard) { used.add(wildcard.key); reserves.push({ ...wildcard, selectionType: 'wildcard' }); }
    takeUnique(reserves, reserveScores, 7, used);

    const selected = starters.map(player => ({ ...player, selectionType: 'starter' }))
      .concat(reserves.map(player => ({ ...player, selectionType: player.selectionType || 'reserve' })));
    const selectedKeys = new Set(selected.map(player => player.key));
    const snubs = reserveScores.filter(player => !selectedKeys.has(player.key)).slice(0, 3).map(player => ({
      ...player,
      reason: player.group === 'guard' ? `${conference === 'east' ? 'East' : 'West'} Guard Competition` : 'Frontcourt Competition'
    }));
    return { conference, starters: selected.filter(player => player.selectionType === 'starter'), reserves: selected.filter(player => player.selectionType !== 'starter'), selected, snubs };
  }

  function fatigueMultiplier(player, history) {
    const appearances = (history || []).filter(season => (season.threePointParticipants || []).some(item => item.key === player.key)).length;
    return appearances >= 2 ? .85 : (appearances === 1 ? .92 : 1);
  }

  function threePointScore(player, seed, history) {
    const recentPct = player.recentThreePa > 0 ? player.recentThreePm / player.recentThreePa * 100 : player.threePct;
    const reputation = clamp((player.ovr - 72) / 27, 0, 1);
    const defending = (history || []).at(-1)?.threePointChampionKey === player.key;
    const raw = player.threePct * .35 + player.threePa * 4 * .3 + player.threePm * 4 * .15 + recentPct * .1 + reputation * 10 + (defending ? 15 : 0);
    const variation = .97 + seeded(hash(`${seed}|3pt|${player.key}`))() * .06;
    return { ...player, contestScore: round(raw * variation * fatigueMultiplier(player, history), 2), defendingChampion: defending };
  }

  function selectThreePoint(players, seed, history) {
    const scored = players
      .filter(player => player.threePa >= 2.5 || (player.ovr >= 84 && player.group === 'guard'))
      .map(player => threePointScore(player, seed, history))
      .sort((a, b) => b.contestScore - a.contestScore || b.threePa - a.threePa);
    const invited = [];
    const used = new Set();
    const add = (source, count, inviteType) => {
      for (const player of source) {
        if (invited.filter(item => item.inviteType === inviteType).length >= count) break;
        if (used.has(player.key)) continue;
        used.add(player.key);
        invited.push({ ...player, inviteType });
      }
    };
    add(scored, 4, 'performance');
    add([...scored].sort((a, b) => (b.ovr + b.reputation * 8) - (a.ovr + a.reputation * 8)), 2, 'star');
    add([...scored].sort((a, b) => (b.recentThreePm * 6 + b.recentThreePa) - (a.recentThreePm * 6 + a.recentThreePa)), 1, 'hot-hand');
    add([...scored].sort((a, b) => seeded(hash(`${seed}|wild-3pt|${b.key}`))() - seeded(hash(`${seed}|wild-3pt|${a.key}`))()), 1, 'wildcard');

    const waitlist = scored.filter(player => !used.has(player.key));
    const decisions = invited.map(player => {
      const previous = (history || []).filter(season => (season.threePointParticipants || []).some(item => item.key === player.key)).length;
      const chance = clamp(.83 - previous * .1 + (player.defendingChampion ? .12 : 0) + (player.ovr >= 90 ? .04 : 0), .55, .96);
      const accepted = seeded(hash(`${seed}|accept|${player.key}`))() < chance;
      return { ...player, accepted, acceptChance: round(chance, 2) };
    });
    const declined = decisions.filter(player => !player.accepted);
    const accepted = decisions.filter(player => player.accepted);
    while (accepted.length < 8 && waitlist.length) {
      const replacement = waitlist.shift();
      accepted.push({ ...replacement, inviteType: 'replacement', accepted: true, replacement: true });
    }
    return { participants: accepted.slice(0, 8), declined, waitlist: waitlist.slice(0, 4) };
  }

  function build(journey, league) {
    const seed = Number(league?.seed) || hash(`${journey?.seasonNo}|all-star`);
    const players = leaguePlayers(league);
    const east = selectConference(players, 'east', seed);
    const west = selectConference(players, 'west', seed);
    const threePoint = selectThreePoint(players, seed, journey?.allStarHistory || []);
    return {
      version: VERSION,
      seasonNo: Number(journey?.seasonNo) || 1,
      selectionGame: SELECTION_GAME,
      weekendGame: WEEKEND_GAME,
      announced: false,
      weekendSeen: false,
      east,
      west,
      snubs: east.snubs.concat(west.snubs),
      threePointParticipants: threePoint.participants,
      threePointDeclined: threePoint.declined,
      generatedAtGame: Number(journey?.gameIndex) || 0
    };
  }

  function ensure(journey, league) {
    if (!journey || !league) return null;
    const saved = journey.allStarWeekend;
    if (saved && saved.version === VERSION && Number(saved.seasonNo) === Number(journey.seasonNo)) return saved;
    journey.allStarWeekend = build(journey, league);
    return journey.allStarWeekend;
  }

  function announce(journey, league) {
    const weekend = ensure(journey, league);
    if (weekend) weekend.announced = true;
    return weekend;
  }

  function selectedPlayers(weekend) {
    return (weekend?.east?.selected || []).concat(weekend?.west?.selected || []);
  }

  function playerSelections(weekend) {
    return selectedPlayers(weekend).filter(player => player.isPlayer);
  }

  function playerSnubs(weekend) {
    return (weekend?.snubs || []).filter(player => player.isPlayer);
  }

  function playerThreePointInvites(weekend) {
    return (weekend?.threePointParticipants || []).filter(player => player.isPlayer && player.accepted !== false);
  }

  function contestBoard(weekend, playerName, playerScore) {
    const seed = hash(`${weekend?.seasonNo || 1}|contest-final`);
    return (weekend?.threePointParticipants || []).map(player => {
      const isPlayer = player.name === playerName;
      const random = seeded(hash(`${seed}|${player.key}`));
      const cpuScore = clamp(Math.round(16 + (player.threePct - 30) * .45 + player.threePa * .55 + random() * 8), 14, 32);
      return { ...player, score: isPlayer ? Number(playerScore || 0) : cpuScore, isUserEntry: isPlayer };
    }).sort((a, b) => b.score - a.score || b.contestScore - a.contestScore);
  }

  return Object.freeze({
    VERSION,
    SELECTION_GAME,
    WEEKEND_GAME,
    build,
    ensure,
    announce,
    selectedPlayers,
    playerSelections,
    playerSnubs,
    playerThreePointInvites,
    contestBoard,
    leaguePlayers
  });
});

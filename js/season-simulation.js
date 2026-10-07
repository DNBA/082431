/* ToeicQuest NBA — controlled Season variance and record tracking.
   The module is deterministic by season/game seed so reloads cannot reroll a
   matchup, while each game can still develop a distinct pace and story. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SeasonSimulation = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const RECORD_DEFINITIONS = Object.freeze({
    pts: { label: '單場得分', short: 'PTS', baseline: 61, significant: 30 },
    reb: { label: '單場籃板', short: 'REB', baseline: 30, significant: 15 },
    ast: { label: '單場助攻', short: 'AST', baseline: 20, significant: 12 },
    stl: { label: '單場抄截', short: 'STL', baseline: 9, significant: 5 },
    blk: { label: '單場阻攻', short: 'BLK', baseline: 10, significant: 5 },
    threeM: { label: '單場三分命中', short: '3PM', baseline: 13, significant: 7 }
  });

  const PROFILE_DEFINITIONS = Object.freeze({
    normal: { label: 'BALANCED GAME', zh: '正常攻防', base: 25.8, variance: 4.1, featuredBoost: 1.08 },
    defensive: { label: 'DEFENSIVE BATTLE', zh: '防守拉鋸', base: 22.5, variance: 3.3, featuredBoost: 1.04 },
    shootout: { label: 'SHOOTOUT', zh: '進攻大戰', base: 29.4, variance: 5.1, featuredBoost: 1.16 },
    upset: { label: 'UPSET ALERT', zh: '爆冷警報', base: 26.0, variance: 5.9, featuredBoost: 1.18 },
    takeover: { label: 'STAR TAKEOVER', zh: '球星接管', base: 27.0, variance: 4.8, featuredBoost: 1.48 },
    historic: { label: 'SPECIAL NIGHT', zh: '紀錄之夜', base: 29.0, variance: 6.0, featuredBoost: 1.82 }
  });

  const BASE_WEIGHTS = Object.freeze({ normal: 55, defensive: 15, shootout: 15, upset: 7, takeover: 6, historic: 2 });
  const RECORD_KEYS = Object.keys(RECORD_DEFINITIONS);

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function hash(value) {
    let result = 2166136261;
    const text = String(value ?? '');
    for (let index = 0; index < text.length; index += 1) {
      result ^= text.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function randomFor(seed) {
    let value = Number(seed) >>> 0;
    return function next() {
      value += 0x6D2B79F5;
      let mixed = value;
      mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
      mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
  }

  function roll(seed, label = '') { return randomFor(hash(`${seed}|${label}`))(); }

  function weightedProfile(random, weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((sum, entry) => sum + entry[1], 0);
    let cursor = random() * total;
    for (const [key, weight] of entries) {
      cursor -= weight;
      if (cursor <= 0) return key;
    }
    return 'normal';
  }

  function createGameScript(options = {}) {
    const seed = hash([
      options.seasonNo || 1,
      options.seasonStartedAt || 'season',
      options.game || 1,
      options.opponent || 'NBA',
      options.teamOvr || 80,
      options.opponentOvr || 80
    ].join('|'));
    const random = randomFor(seed);
    const weights = { ...BASE_WEIGHTS };
    const specialKey = options.special?.key || options.special || '';
    if (specialKey) {
      weights.normal -= 8;
      weights.upset += 2;
      weights.takeover += 3;
      weights.historic += 3;
    }
    const profile = weightedProfile(random, weights);
    const definition = PROFILE_DEFINITIONS[profile];
    const recordStat = RECORD_KEYS[Math.floor(random() * RECORD_KEYS.length)] || 'pts';
    const recordDefinition = RECORD_DEFINITIONS[recordStat];
    const recordTeam = random() < .58 ? 'user' : 'opponent';
    const hotTeam = random() < .5 ? 'user' : 'opponent';
    const comebackTeam = random() < .5 ? 'user' : 'opponent';
    const featuredSlot = Math.floor(random() * 5);
    let coldSlot = Math.floor(random() * 5);
    if (coldSlot === featuredSlot) coldSlot = (coldSlot + 2) % 5;
    const benchSurge = random() < .09;
    return {
      version: 1,
      seed,
      profile,
      label: definition.label,
      labelZh: definition.zh,
      pace: Number((definition.base / 25.8 + (random() - .5) * .07).toFixed(3)),
      variance: Number((definition.variance * (.92 + random() * .16)).toFixed(3)),
      featuredBoost: Number((definition.featuredBoost * (.96 + random() * .08)).toFixed(3)),
      featuredSlot,
      coldSlot,
      coldMultiplier: Number((.68 + random() * .14).toFixed(3)),
      hotTeam,
      comebackTeam,
      swingQuarter: 1 + Math.floor(random() * 4),
      benchSurge,
      benchShare: Number((benchSurge ? .32 + random() * .05 : .21 + random() * .08).toFixed(3)),
      recordTeam,
      recordStat,
      recordValue: recordDefinition.baseline + 1 + Math.floor(random() * (recordStat === 'pts' ? 6 : 3)),
      specialKey,
      createdAtGame: Number(options.game) || 1
    };
  }

  function quarterScore(script, options = {}) {
    const safeScript = script && PROFILE_DEFINITIONS[script.profile] ? script : createGameScript(options);
    const quarter = Math.max(1, Number(options.quarter) || 1);
    const random = randomFor(hash(`${safeScript.seed}|quarter|${quarter}`));
    if (quarter > 4) {
      let home = Math.round(8.2 + (random() + random() - 1) * 4.2);
      let away = Math.round(8.2 + (random() + random() - 1) * 4.2);
      if (home === away && quarter >= 6) home += roll(safeScript.seed, `ot-winner-${quarter}`) < .5 ? 1 : 0;
      return { home: clamp(home, 4, 16), away: clamp(away, 4, 16), profile: safeScript.profile };
    }

    const definition = PROFILE_DEFINITIONS[safeScript.profile];
    const base = 25.8 * (Number(safeScript.pace) || 1);
    const teamOvr = Number(options.teamOvr) || 80;
    const opponentOvr = Number(options.opponentOvr) || 80;
    const edge = clamp((teamOvr - opponentOvr) * .14, -3.8, 3.8);
    const bell = () => (random() + random() + random() + random() - 2) * (Number(safeScript.variance) || definition.variance);
    let home = base + bell() + edge;
    let away = base + bell() - edge * .72;

    if (safeScript.hotTeam === 'user') home += 1.1;
    else away += 1.1;
    if (quarter === Number(safeScript.swingQuarter)) {
      if (safeScript.hotTeam === 'user') home += 3.2;
      else away += 3.2;
    }

    if (safeScript.profile === 'upset') {
      const underdog = teamOvr <= opponentOvr ? 'user' : 'opponent';
      if (underdog === 'user') home += 2.8;
      else away += 2.8;
    }
    if (safeScript.profile === 'takeover' || safeScript.profile === 'historic') {
      if (safeScript.hotTeam === 'user') home += safeScript.profile === 'historic' ? 2.4 : 1.6;
      else away += safeScript.profile === 'historic' ? 2.4 : 1.6;
    }
    if (quarter === 4) {
      const homeScore = Number(options.homeScore) || 0;
      const awayScore = Number(options.awayScore) || 0;
      if (safeScript.comebackTeam === 'user' && awayScore - homeScore >= 8) home += 4 + Math.floor(random() * 4);
      if (safeScript.comebackTeam === 'opponent' && homeScore - awayScore >= 8) away += 4 + Math.floor(random() * 4);
    }
    return {
      home: clamp(Math.round(home), 12, safeScript.profile === 'historic' ? 46 : 43),
      away: clamp(Math.round(away), 12, safeScript.profile === 'historic' ? 46 : 43),
      profile: safeScript.profile
    };
  }

  function simulateGame(script, options = {}) {
    const homeQuarters = [];
    const awayQuarters = [];
    let home = 0;
    let away = 0;
    for (let quarter = 1; quarter <= 4; quarter += 1) {
      const score = quarterScore(script, { ...options, quarter, homeScore: home, awayScore: away });
      home += score.home;
      away += score.away;
      homeQuarters.push(score.home);
      awayQuarters.push(score.away);
    }
    let overtime = 5;
    while (home === away && overtime <= 6) {
      const score = quarterScore(script, { ...options, quarter: overtime, homeScore: home, awayScore: away });
      home += score.home;
      away += score.away;
      homeQuarters.push(score.home);
      awayQuarters.push(score.away);
      overtime += 1;
    }
    if (home === away) home += roll(script.seed, 'final-tiebreak') < .5 ? 1 : -1;
    return { home, away, homeQuarters, awayQuarters, profile: script.profile };
  }

  function createRecordEntry(key) {
    const definition = RECORD_DEFINITIONS[key];
    return {
      stat: key,
      label: definition.label,
      short: definition.short,
      value: definition.baseline,
      player: 'FRANCHISE STANDARD',
      game: null,
      seasonNo: 0,
      opponent: '',
      established: true
    };
  }

  function ensureRecordBook(saved) {
    const source = saved && typeof saved === 'object' ? saved : {};
    const singleGame = source.singleGame && typeof source.singleGame === 'object' ? source.singleGame : {};
    RECORD_KEYS.forEach(key => {
      const baseline = createRecordEntry(key);
      const existing = singleGame[key];
      singleGame[key] = existing && Number.isFinite(Number(existing.value))
        ? { ...baseline, ...existing, value: Math.max(baseline.value, Number(existing.value)) }
        : baseline;
    });
    return {
      version: 1,
      singleGame,
      playerHighs: source.playerHighs && typeof source.playerHighs === 'object' ? source.playerHighs : {},
      history: Array.isArray(source.history) ? source.history : []
    };
  }

  function rebuildShootingLine(row, points, forcedThrees = null) {
    const safePoints = Math.max(0, Math.round(points));
    const maximumThrees = Math.floor(safePoints / 3);
    const threeM = clamp(forcedThrees == null ? Math.min(Number(row.threeM) || 0, maximumThrees) : forcedThrees, 0, maximumThrees);
    const remainder = safePoints - threeM * 3;
    const ftM = remainder % 2;
    const twoM = Math.floor((remainder - ftM) / 2);
    const fgM = twoM + threeM;
    const fgA = Math.max(fgM, Math.round(fgM / .48));
    const threeA = Math.max(threeM, Math.round(threeM / .39));
    const ftA = ftM ? ftM + 1 : 0;
    Object.assign(row, {
      pts: safePoints, threeM, threeA, ftM, ftA, fgM, fgA,
      fgPct: fgA ? ((fgM / fgA) * 100).toFixed(1) : '0.0',
      threePct: threeA ? ((threeM / threeA) * 100).toFixed(1) : '0.0',
      ftPct: ftA ? ((ftM / ftA) * 100).toFixed(1) : '0.0'
    });
  }

  function rebalancePoints(rows, teamScore, featured, targetPoints, forcedThrees = null) {
    const total = Math.max(0, Math.round(Number(teamScore) || 0));
    const target = clamp(Math.round(targetPoints), 0, Math.max(0, total));
    const others = rows.filter(row => row !== featured);
    const remaining = Math.max(0, total - target);
    const weightTotal = others.reduce((sum, row) => sum + Math.max(1, Number(row.pts) || 0), 0) || others.length || 1;
    const allocations = others.map(row => Math.floor(remaining * Math.max(1, Number(row.pts) || 0) / weightTotal));
    let unallocated = remaining - allocations.reduce((sum, value) => sum + value, 0);
    for (let index = 0; unallocated > 0 && others.length; index = (index + 1) % others.length) {
      allocations[index] += 1;
      unallocated -= 1;
    }
    others.forEach((row, index) => rebuildShootingLine(row, allocations[index] || 0));
    rebuildShootingLine(featured, target, forcedThrees);
  }

  function selectHistoricPlayer(rows, stat, preferredName) {
    const preferred = rows.find(row => row.name === preferredName);
    if (preferred) return preferred;
    const score = row => {
      if (stat === 'ast') return (Number(row.ast) || 0) * 3 + (Number(row.pts) || 0);
      if (stat === 'reb') return (Number(row.reb) || 0) * 3 + (Number(row.blk) || 0);
      if (stat === 'blk') return (Number(row.blk) || 0) * 5 + (Number(row.reb) || 0);
      if (stat === 'stl') return (Number(row.stl) || 0) * 5 + (Number(row.ast) || 0);
      if (stat === 'threeM') return (Number(row.threeM) || 0) * 5 + (Number(row.pts) || 0);
      return Number(row.pts) || 0;
    };
    return [...rows].sort((a, b) => score(b) - score(a))[0] || null;
  }

  function applyHistoricLine(boxScore, teamScore, script, preferredName) {
    if (!script || script.profile !== 'historic' || !Array.isArray(boxScore) || !boxScore.length) return null;
    const stat = RECORD_DEFINITIONS[script.recordStat] ? script.recordStat : 'pts';
    const player = selectHistoricPlayer(boxScore, stat, preferredName);
    if (!player) return null;
    const target = Math.max(RECORD_DEFINITIONS[stat].baseline + 1, Number(script.recordValue) || 0);
    if (stat === 'pts') rebalancePoints(boxScore, teamScore, player, Math.min(target, Math.max(0, Number(teamScore) - 12)));
    else if (stat === 'threeM') {
      const desiredPoints = Math.max(Number(player.pts) || 0, target * 3 + 4);
      rebalancePoints(boxScore, teamScore, player, Math.min(desiredPoints, Math.max(0, Number(teamScore) - 12)), target);
    } else if (stat === 'reb') {
      player.reb = target;
      player.oReb = Math.max(2, Math.round(target * .24));
      player.dReb = target - player.oReb;
    } else player[stat] = target;
    return { player: player.name, stat, value: Number(player[stat]) || 0, label: RECORD_DEFINITIONS[stat].label, short: RECORD_DEFINITIONS[stat].short };
  }

  function evaluateRecordBook(saved, rows, context = {}) {
    const book = ensureRecordBook(saved);
    const eligible = (Array.isArray(rows) ? rows : []).filter(row => row && row.name && row.cardId);
    const personalBests = [];
    eligible.forEach(row => {
      const playerKey = String(row.cardId || row.name);
      const previous = book.playerHighs[playerKey] && typeof book.playerHighs[playerKey] === 'object' ? book.playerHighs[playerKey] : {};
      const next = { ...previous, player: row.name, cardId: row.cardId };
      RECORD_KEYS.forEach(stat => {
        const value = Math.max(0, Number(row[stat]) || 0);
        const oldValue = Math.max(0, Number(previous[stat]) || 0);
        if (value > oldValue) {
          next[stat] = value;
          if (value >= RECORD_DEFINITIONS[stat].significant) {
            personalBests.push({ player: row.name, cardId: row.cardId, stat, value, oldValue, ...RECORD_DEFINITIONS[stat] });
          }
        }
      });
      book.playerHighs[playerKey] = next;
    });

    const records = [];
    RECORD_KEYS.forEach(stat => {
      const leader = [...eligible].sort((a, b) => (Number(b[stat]) || 0) - (Number(a[stat]) || 0))[0];
      if (!leader) return;
      const value = Math.max(0, Number(leader[stat]) || 0);
      const previous = book.singleGame[stat];
      if (value <= Number(previous.value || 0)) return;
      const event = {
        id: `${context.seasonNo || 1}:${context.game || 0}:${stat}:${leader.cardId}`,
        player: leader.name,
        cardId: leader.cardId,
        stat,
        value,
        oldValue: Number(previous.value) || 0,
        label: RECORD_DEFINITIONS[stat].label,
        short: RECORD_DEFINITIONS[stat].short,
        game: Number(context.game) || 0,
        seasonNo: Number(context.seasonNo) || 1,
        opponent: context.opponent || '',
        createdAt: context.createdAt || new Date().toISOString()
      };
      book.singleGame[stat] = { ...previous, ...event, established: false };
      book.history.push(event);
      records.push(event);
    });
    book.history = book.history.slice(-100);
    return { book, records, personalBests };
  }

  return {
    PROFILE_DEFINITIONS,
    RECORD_DEFINITIONS,
    hash,
    randomFor,
    roll,
    createGameScript,
    quarterScore,
    simulateGame,
    ensureRecordBook,
    applyHistoricLine,
    evaluateRecordBook
  };
});

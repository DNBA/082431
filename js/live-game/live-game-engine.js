/* ToeicQuest NBA — LIVE GAME 2D v1 gameplay engine (V4.0.2 shot arc / rim finish)
   Pure runtime module: no DOM access, no saveGame calls, testable in Node. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LiveGameEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = 1;
  const COURT = Object.freeze({ minX: 7, maxX: 93, minY: 9, maxY: 91, hoopX: 50, hoopY: 8 });
  const OFFENSE_SPOTS = Object.freeze([
    [50, 72], [22, 58], [78, 58], [34, 34], [66, 34]
  ]);
  const DEFENSE_SPOTS = Object.freeze([
    [50, 65], [25, 53], [75, 53], [36, 29], [64, 29]
  ]);

  function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
  function distance(a, b) { return Math.hypot(Number(a.x) - Number(b.x), Number(a.y) - Number(b.y)); }
  function number(value, fallback) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  function firstNumber(source, keys, fallback) {
    for (const key of keys) {
      const value = key.split('.').reduce((item, part) => item == null ? undefined : item[part], source);
      const parsed = Number.parseFloat(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
  }
  function badgeNames(card) {
    const values = card?._liveBadges || card?.badges || [];
    return values.map(item => String(item?.name || item || '')).filter(Boolean);
  }
  function hasBadge(card, names) {
    const owned = badgeNames(card);
    return names.some(name => owned.includes(name));
  }
  function promotionBoost(card, keys) {
    const bonuses = card?.promotionStatBonuses || card?.promotionStats || {};
    return keys.reduce((sum, key) => sum + number(bonuses[key] ?? bonuses[key.toUpperCase()], 0), 0);
  }

  function resolveRatings(card, index) {
    const ovr = clamp(firstNumber(card, ['ovr', 'baseOvr', 'realOvr'], 78), 55, 99);
    const pos = String(card?.positions?.[0] || card?.position || ['PG', 'SG', 'SF', 'PF', 'C'][index] || 'G').toUpperCase();
    const threePctRaw = firstNumber(card, ['basic.3P%', 'basic.3PT%', 'threePct'], 0);
    const threePct = threePctRaw > 1 ? threePctRaw / 100 : threePctRaw;
    const threeAttempts = firstNumber(card, ['basic.3PA', 'threePA'], pos.includes('G') ? 4 : 1.5);
    const assists = firstNumber(card, ['basic.AST', 'ast'], pos === 'PG' ? 6 : 3);
    const rebounds = firstNumber(card, ['basic.REB', 'reb'], pos === 'C' ? 8 : 4);
    const steals = firstNumber(card, ['basic.STL', 'stl'], 1);
    const blocks = firstNumber(card, ['basic.BLK', 'blk'], pos === 'C' ? 1.4 : 0.5);
    const guard = /PG|SG|G/.test(pos);
    const big = /PF|C/.test(pos);
    const shootingSignal = threePct > 0 ? (threePct - .34) * 45 : 0;
    return {
      ovr,
      speed: clamp(ovr + (guard ? 6 : big ? -4 : 1) + promotionBoost(card, ['speed', 'athleticism']), 55, 99),
      shooting: clamp(ovr + shootingSignal + Math.min(5, threeAttempts * .55) + promotionBoost(card, ['shooting', 'three', '3pt']), 50, 99),
      midrange: clamp(ovr + promotionBoost(card, ['midrange', 'shooting']) + (guard ? 2 : 0), 50, 99),
      passing: clamp(ovr - 8 + assists * 2.1 + promotionBoost(card, ['passing', 'ast', 'playmaking']), 50, 99),
      handling: clamp(ovr - 5 + assists * 1.25 + (guard ? 6 : -3) + promotionBoost(card, ['handling', 'playmaking']), 48, 99),
      defense: clamp(ovr - 3 + steals * 3 + blocks * 2 + promotionBoost(card, ['defense', 'perimeterDefense']), 50, 99),
      steal: clamp(ovr - 12 + steals * 9 + promotionBoost(card, ['steal', 'stl']), 45, 99),
      rebound: clamp(ovr - 11 + rebounds * 2.5 + (big ? 5 : 0) + promotionBoost(card, ['rebound', 'reb']), 45, 99),
      dunk: clamp(ovr - 7 + (big ? 8 : guard ? -2 : 3) + promotionBoost(card, ['dunk', 'athleticism']), 45, 99),
      length: clamp(ovr - 15 + (big ? 20 : guard ? 5 : 12) + blocks * 3, 50, 99)
    };
  }

  function emptyStats() {
    return { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, fgM: 0, fgA: 0, threeM: 0, threeA: 0, ftM: 0, ftA: 0, tov: 0, pf: 0 };
  }

  function normalizePlayer(card, team, index) {
    const source = card || {};
    const idBase = source.cardId || source.nbaId || source.id || `${source.name || 'player'}-${index}`;
    const spot = team === 'home' ? OFFENSE_SPOTS[index] : DEFENSE_SPOTS[index];
    return {
      id: `${team}:${idBase}:${index}`,
      cardId: source.cardId || null,
      team,
      lineupIndex: index,
      name: String(source.name || `${team === 'home' ? 'HOME' : 'AWAY'} ${index + 1}`),
      number: String(source.jerseyNumber || source.number || [1, 24, 7, 34, 32][index]),
      pos: String(source.positions?.[0] || source.position || ['PG', 'SG', 'SF', 'PF', 'C'][index]),
      ratings: resolveRatings(source, index),
      badges: badgeNames(source),
      card: source,
      x: spot[0], y: spot[1], targetX: spot[0], targetY: spot[1],
      fatigue: 0,
      routeKind: 'space',
      routeUntil: 0,
      nextRouteAt: .7 + index * .18,
      receiveFlashUntil: 0,
      driveUntil: 0,
      recoveryUntil: 0,
      contestUntil: 0,
      stealCooldownUntil: 0,
      stats: emptyStats()
    };
  }

  function create(config) {
    const options = config || {};
    const homeCards = (options.homePlayers || []).slice(0, 5);
    const awayCards = (options.awayPlayers || []).slice(0, 5);
    while (homeCards.length < 5) homeCards.push({ name: `HOME ${homeCards.length + 1}`, ovr: 76 });
    while (awayCards.length < 5) awayCards.push({ name: `AWAY ${awayCards.length + 1}`, ovr: 76 });
    const players = homeCards.map((card, index) => normalizePlayer(card, 'home', index))
      .concat(awayCards.map((card, index) => normalizePlayer(card, 'away', index)));
    const homePoint = players.find(player => player.team === 'home');
    const state = {
      version: VERSION,
      mode: options.mode === 'hybrid' ? 'hybrid' : 'play',
      elapsed: 0,
      quarter: clamp(options.quarter || 1, 1, 4),
      maxQuarters: 4,
      quarterDuration: clamp(options.quarterDuration || 120, 20, 240),
      gameClock: clamp(options.gameClock || options.quarterDuration || 120, 1, 240),
      shotClock: 24,
      shotClockScale: number(options.shotClockScale, 2),
      homeScore: Math.max(0, Number(options.homeScore) || 0),
      awayScore: Math.max(0, Number(options.awayScore) || 0),
      quarterScores: { home: [0, 0, 0, 0], away: [0, 0, 0, 0] },
      possession: options.possession === 'away' ? 'away' : 'home',
      possessionsPlayed: 0,
      possessionsRemaining: options.mode === 'hybrid' ? clamp(options.possessions || 3, 1, 6) : null,
      players,
      controlledPlayerId: homePoint.id,
      ball: { x: homePoint.x, y: homePoint.y, z: 0, holderId: homePoint.id, inFlight: false },
      lastPass: null,
      passFlight: null,
      shot: null,
      transitionUntil: 0,
      feedback: { title: 'TIP OFF', detail: '自由移動並尋找空檔', tone: 'neutral', until: 1.5 },
      events: [],
      paused: false,
      finished: false,
      finishReason: '',
      offenseStrategy: options.offenseStrategy || 'balanced',
      defenseStrategy: options.defenseStrategy || 'balanced',
      opponentStrategy: options.opponentStrategy || null,
      defensiveAdjustment: options.defensiveAdjustment || null,
      scoutingCounter: options.scoutingCounter || null,
      _rng: typeof options.rng === 'function' ? options.rng : Math.random,
      _cpuDecisionAt: 1.2
    };
    resetPossession(state, state.possession, true);
    return state;
  }

  function playerById(state, id) { return state.players.find(player => player.id === id) || null; }
  function teamPlayers(state, team) { return state.players.filter(player => player.team === team); }
  function holder(state) { return playerById(state, state.ball.holderId); }
  function controlled(state) { return playerById(state, state.controlledPlayerId); }
  function nearestPlayer(players, point, excluded) {
    return players.filter(player => player.id !== excluded).sort((a, b) => distance(a, point) - distance(b, point))[0] || null;
  }
  function addEvent(state, type, detail) {
    state.events.push({ type, detail: detail || {}, at: state.elapsed });
    if (state.events.length > 80) state.events.splice(0, state.events.length - 80);
  }
  function feedback(state, title, detail, tone, duration) {
    state.feedback = { title, detail: detail || '', tone: tone || 'neutral', until: state.elapsed + (duration || 1.15) };
    addEvent(state, 'feedback', state.feedback);
  }

  function resetPossession(state, team, initial) {
    state.possession = team;
    state.shotClock = 24;
    state.shot = null;
    state.passFlight = null;
    state.lastPass = null;
    const offense = teamPlayers(state, team);
    const defense = teamPlayers(state, team === 'home' ? 'away' : 'home');
    offense.forEach((player, index) => {
      const spot = OFFENSE_SPOTS[index];
      player.x = spot[0]; player.y = spot[1]; player.targetX = spot[0]; player.targetY = spot[1];
      player.routeKind = 'space'; player.routeUntil = 0; player.nextRouteAt = state.elapsed + .6 + index * .17;
    });
    defense.forEach((player, index) => {
      const spot = DEFENSE_SPOTS[index];
      player.x = spot[0]; player.y = spot[1]; player.targetX = spot[0]; player.targetY = spot[1];
    });
    const point = offense[0];
    state.ball.holderId = point.id;
    state.ball.x = point.x;
    state.ball.y = point.y;
    state.ball.z = 0;
    state.ball.inFlight = false;
    if (team === 'home') state.controlledPlayerId = point.id;
    else {
      const matchup = defense[0] || teamPlayers(state, 'home')[0];
      state.controlledPlayerId = matchup?.id || state.controlledPlayerId;
    }
    if (!initial) {
      state.possessionsPlayed += 1;
      if (state.possessionsRemaining != null) {
        state.possessionsRemaining -= 1;
        if (state.possessionsRemaining <= 0) {
          state.finished = true;
          state.finishReason = 'hybrid-complete';
        }
      }
    }
  }

  function changePossession(state, nextTeam, reason) {
    state.transitionUntil = state.elapsed + .7;
    feedback(state, 'CHANGE OF POSSESSION', reason || '', 'neutral', .7);
    resetPossession(state, nextTeam, false);
  }

  function movementSpeed(player) {
    const fatiguePenalty = player.fatigue * .22;
    const driveBoost = player.driveUntil > 0 ? 1.16 : 1;
    const recovery = player.recoveryUntil > 0 ? .38 : 1;
    return (13 + (player.ratings.speed - 60) * .13) * driveBoost * (1 - fatiguePenalty) * recovery;
  }

  function moveControlled(state, input, dt) {
    const player = controlled(state);
    if (!player || player.recoveryUntil > state.elapsed || state.transitionUntil > state.elapsed) return;
    let x = clamp(input?.x || 0, -1, 1);
    let y = clamp(input?.y || 0, -1, 1);
    const magnitude = Math.hypot(x, y);
    if (magnitude > 1) { x /= magnitude; y /= magnitude; }
    if (magnitude < .04) return;
    const sprintBoost = input?.sprint ? 1.14 : 1;
    const speed = movementSpeed({ ...player, driveUntil: player.driveUntil > state.elapsed ? player.driveUntil : 0 }) * sprintBoost;
    player.x = clamp(player.x + x * speed * dt, COURT.minX, COURT.maxX);
    player.y = clamp(player.y + y * speed * dt, COURT.minY + 4, COURT.maxY);
    player.fatigue = clamp(player.fatigue + dt * .0085 * magnitude, 0, 1);
  }

  function moveToward(player, target, dt, factor) {
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const len = Math.hypot(dx, dy);
    if (len < .05) return;
    const amount = Math.min(len, movementSpeed(player) * dt * (factor || .72));
    player.x += dx / len * amount;
    player.y += dy / len * amount;
  }

  function defenderGap(state, player) {
    const defenders = teamPlayers(state, player.team === 'home' ? 'away' : 'home');
    const defender = nearestPlayer(defenders, player);
    return defender ? distance(defender, player) : 99;
  }

  function baseSpacingTarget(state, player, index, ballHandler) {
    const spot = OFFENSE_SPOTS[index];
    const ballX = Number(ballHandler?.x || 50);
    const strongSide = ballX < 50 ? -1 : 1;
    const threeBias = state.offenseStrategy === 'shoot-threes' ? 6 : 0;
    const paintBias = state.offenseStrategy === 'attack-paint' ? -5 : 0;
    const sideShift = index === 1 ? (strongSide > 0 ? -7 : 3) : index === 2 ? (strongSide < 0 ? 7 : -3) : 0;
    const breathe = Math.sin(state.elapsed * .72 + index * 1.4) * 2.4;
    return {
      x: clamp(spot[0] + sideShift + breathe, 12, 88),
      y: clamp(spot[1] + threeBias + paintBias + Math.cos(state.elapsed * .58 + index) * 1.8, 23, 82)
    };
  }

  function chooseOffBallRoute(state, player, index, ballHandler) {
    if (player.routeUntil > state.elapsed) return;
    const guarded = defenderGap(state, player) < 8;
    const handlerDriving = ballHandler?.driveUntil > state.elapsed || Number(ballHandler?.y || 90) < 48;
    const canCut = index > 0 && player.y > 31 && !handlerDriving;
    const roll = state._rng();
    if (canCut && ((guarded && roll < .58) || state.offenseStrategy === 'attack-paint' && roll < .72)) {
      player.routeKind = 'cut';
      player.routeUntil = state.elapsed + 1.25;
      player.targetX = clamp(45 + (index % 2 ? -6 : 6), 35, 65);
      player.targetY = 18 + (index % 2) * 4;
    } else if (handlerDriving || state.offenseStrategy === 'shoot-threes' || roll < .55) {
      player.routeKind = 'relocate';
      player.routeUntil = state.elapsed + 1.1;
      player.targetX = index % 2 ? 15 : 85;
      player.targetY = index >= 3 ? 34 : 53;
    } else {
      player.routeKind = 'space';
      player.routeUntil = state.elapsed + .9;
      const target = baseSpacingTarget(state, player, index, ballHandler);
      player.targetX = target.x; player.targetY = target.y;
    }
    player.nextRouteAt = player.routeUntil + .35 + state._rng() * .65;
    addEvent(state, 'off-ball-route', { playerId: player.id, route: player.routeKind });
  }

  function passingLaneRisk(state, passer, target) {
    const defenders = teamPlayers(state, passer.team === 'home' ? 'away' : 'home');
    const midpoint = { x: (passer.x + target.x) / 2, y: (passer.y + target.y) / 2 };
    const laneDefender = nearestPlayer(defenders, midpoint);
    return laneDefender ? clamp((11 - distance(laneDefender, midpoint)) / 23, 0, .24) : 0;
  }

  function chooseSmartPassTarget(state, passer, direction) {
    const teammates = teamPlayers(state, passer.team).filter(player => player.id !== passer.id);
    const inputMagnitude = Math.hypot(Number(direction?.x || 0), Number(direction?.y || 0));
    return teammates.sort((a, b) => {
      const score = player => {
        const gap = defenderGap(state, player);
        const lane = passingLaneRisk(state, passer, player);
        const cutBonus = ['cut', 'give-go'].includes(player.routeKind) ? 18 : player.routeKind === 'relocate' ? 8 : 0;
        const ability = player.ratings.shooting * .08 + player.ratings.dunk * (player.y < 30 ? .1 : .02);
        const passDistance = distance(passer, player);
        let directionBonus = 0;
        if (inputMagnitude > .25) {
          const dx = (player.x - passer.x) / Math.max(1, passDistance);
          const dy = (player.y - passer.y) / Math.max(1, passDistance);
          directionBonus = (dx * Number(direction.x || 0) + dy * Number(direction.y || 0)) * 18;
        }
        return gap * 1.45 - lane * 70 + cutBonus + ability + directionBonus - Math.max(0, passDistance - 52) * .22;
      };
      return score(b) - score(a);
    })[0] || null;
  }

  function updateAIPositions(state, dt) {
    const offense = teamPlayers(state, state.possession);
    const defense = teamPlayers(state, state.possession === 'home' ? 'away' : 'home');
    const ballHolder = holder(state);
    offense.forEach((player, index) => {
      if (player.id === state.controlledPlayerId || player.id === ballHolder?.id) return;
      if (player.nextRouteAt <= state.elapsed || distance(player, { x: player.targetX, y: player.targetY }) < 2.2) chooseOffBallRoute(state, player, index, ballHolder);
      if (player.routeUntil <= state.elapsed && player.nextRouteAt > state.elapsed) {
        const reset = baseSpacingTarget(state, player, index, ballHolder);
        player.targetX = reset.x; player.targetY = reset.y;
      }
      const routeSpeed = player.routeKind === 'cut' || player.routeKind === 'give-go' ? .92 : player.routeKind === 'relocate' ? .68 : .52;
      moveToward(player, { x: player.targetX, y: player.targetY }, dt, routeSpeed);
    });
    defense.forEach((player, index) => {
      if (player.id === state.controlledPlayerId) return;
      const assignment = offense[index] || ballHolder;
      if (!assignment) return;
      const isBall = assignment.id === ballHolder?.id;
      const helpPaint = ballHolder && ballHolder.y < 31 && index >= 3;
      const target = helpPaint
        ? { x: 50 + (index === 3 ? -8 : 8), y: 24 }
        : {
            x: assignment.x + (COURT.hoopX - assignment.x) * (isBall ? .07 : .15),
            y: assignment.y + (COURT.hoopY - assignment.y) * (isBall ? .07 : .15)
          };
      moveToward(player, target, dt, state.defenseStrategy === 'lock-down' ? .88 : isBall ? .78 : .68);
    });
  }

  function updateBall(state) {
    const ballHolder = holder(state);
    if (ballHolder && !state.ball.inFlight) {
      state.ball.x = ballHolder.x + 2.5;
      state.ball.y = ballHolder.y - 1;
      state.ball.z = 0;
    }
  }

  function beginPass(state, passer, target, options) {
    const settings = options || {};
    const laneRisk = passingLaneRisk(state, passer, target);
    const turnoverChance = clamp(.055 + laneRisk - (passer.ratings.passing - 70) * .0025, .01, .27);
    const travelTime = clamp(.14 + distance(passer, target) * .0032, .18, .36);
    state.passFlight = {
      fromId: passer.id, toId: target.id, startedAt: state.elapsed, endsAt: state.elapsed + travelTime,
      fromX: passer.x, fromY: passer.y, turnoverChance, cpu: !!settings.cpu
    };
    state.ball.holderId = null;
    state.ball.inFlight = true;
    state.lastPass = { passerId: passer.id, targetId: target.id, at: state.elapsed };
    passer.routeKind = 'give-go';
    passer.routeUntil = state.elapsed + 1.25;
    passer.nextRouteAt = passer.routeUntil + .5;
    passer.targetX = clamp(50 + (passer.x < 50 ? -7 : 7), 35, 65);
    passer.targetY = 20;
    addEvent(state, settings.cpu ? 'cpu-pass-start' : 'pass-start', { passerId: passer.id, targetId: target.id });
    return { ok: true, targetId: target.id };
  }

  function pass(state, targetId, direction) {
    if (state.finished || state.paused || state.passFlight || state.shot || state.transitionUntil > state.elapsed) return { ok: false, reason: 'busy' };
    const passer = holder(state);
    if (!passer) return { ok: false, reason: 'no-ball' };
    const target = targetId ? playerById(state, targetId) : chooseSmartPassTarget(state, passer, direction);
    if (!target || passer.team !== 'home' || target.team !== passer.team || passer.id === target.id || state.controlledPlayerId !== passer.id) return { ok: false, reason: 'invalid-target' };
    return beginPass(state, passer, target);
  }

  function updatePass(state) {
    const flight = state.passFlight;
    if (!flight) return;
    const target = playerById(state, flight.toId);
    if (!target) {
      state.passFlight = null;
      state.ball.inFlight = false;
      changePossession(state, state.possession === 'home' ? 'away' : 'home', 'LOST PASS');
      return;
    }
    const progress = clamp((state.elapsed - flight.startedAt) / Math.max(.01, flight.endsAt - flight.startedAt), 0, 1);
    state.ball.x = flight.fromX + (target.x - flight.fromX) * progress;
    state.ball.y = flight.fromY + (target.y - flight.fromY) * progress;
    state.ball.z = Math.sin(progress * Math.PI) * 2.2;
    if (progress < 1) return;
    const intercepted = state._rng() < flight.turnoverChance;
    state.passFlight = null;
    state.ball.inFlight = false;
    state.ball.z = 0;
    if (intercepted) {
      const passer = playerById(state, flight.fromId);
      if (passer) passer.stats.tov += 1;
      feedback(state, 'INTERCEPTED', '傳球路線被讀到', 'bad');
      changePossession(state, passer?.team === 'away' ? 'home' : 'away', 'TURNOVER');
      return;
    }
    state.ball.holderId = target.id;
    target.receiveFlashUntil = state.elapsed + .48;
    if (target.team === 'home') state.controlledPlayerId = target.id;
    else {
      const autoDefender = nearestPlayer(teamPlayers(state, 'home'), target);
      if (autoDefender) state.controlledPlayerId = autoDefender.id;
    }
    feedback(state, flight.cpu ? 'SWING PASS' : 'PASS COMPLETE', flight.cpu ? `${target.name} 接球` : `控制切換至 ${target.name}`, flight.cpu ? 'neutral' : 'good', .65);
    addEvent(state, 'pass-complete', { targetId: target.id });
  }

  function getShotAction(state, shooter) {
    const player = shooter || holder(state);
    if (!player) return 'SHOOT';
    const hoopDistance = distance(player, { x: COURT.hoopX, y: COURT.hoopY });
    if (hoopDistance > 13) return 'SHOOT';
    const driving = player.driveUntil > state.elapsed;
    return player.ratings.dunk >= 72 && (driving || hoopDistance <= 9.5) ? 'DUNK' : 'LAYUP';
  }

  function beginRimFinish(state, shooter, finishType) {
    const contest = contestAgainst(state, shooter);
    const dunk = finishType === 'dunk';
    const rating = dunk ? shooter.ratings.dunk : (shooter.ratings.midrange * .58 + shooter.ratings.handling * .42);
    const badgeBoost = hasBadge(shooter.card, ['曼巴精神']) && state.quarter >= 4 ? .025 : 0;
    const base = dunk ? .79 : .62;
    const ability = (rating - 70) * (dunk ? .005 : .0045);
    const contestPenalty = contest.value * (dunk ? .27 : .36);
    const probability = clamp(base + ability + badgeBoost - contestPenalty - shooter.fatigue * .14, .12, dunk ? .97 : .92);
    const made = state._rng() < probability;
    shooter.stats.fgA += 1;
    state.shot = {
      shooterId: shooter.id,
      charging: false,
      phase: 0,
      finishType,
      releasedAt: state.elapsed,
      resolvesAt: state.elapsed + (dunk ? .36 : .48),
      startX: shooter.x + 1.2,
      startY: shooter.y - 1,
      result: {
        probability, isThree: false, atRim: true, points: 2, made, rating,
        timing: { label: dunk ? 'DUNK' : 'LAYUP', score: 1, tone: made ? 'green' : 'bad' },
        contest, greenWindow: 0, distance: distance(shooter, { x: COURT.hoopX, y: COURT.hoopY }), finishType
      }
    };
    state.ball.holderId = null;
    state.ball.inFlight = true;
    state.ball.z = 0;
    feedback(state, dunk ? 'ATTACK THE RIM' : 'LAYUP', `${contest.label} · ${Math.round(probability * 100)}%`, dunk ? 'good' : 'neutral', .7);
    addEvent(state, 'rim-finish-start', { shooterId: shooter.id, finishType, probability });
    return { ok: true, direct: true, finishType, probability, made };
  }

  function startShot(state) {
    if (state.finished || state.paused || state.shot || state.passFlight || state.possession !== 'home') return { ok: false, reason: 'busy' };
    const shooter = holder(state);
    if (!shooter || shooter.id !== state.controlledPlayerId) return { ok: false, reason: 'no-ball' };
    const action = getShotAction(state, shooter);
    if (action !== 'SHOOT') return beginRimFinish(state, shooter, action.toLowerCase());
    state.shot = { shooterId: shooter.id, charging: true, phase: 0, circleScale: 1.78, releasedAt: null, resolvesAt: null, startX: null, startY: null, result: null };
    addEvent(state, 'shot-charge', { shooterId: shooter.id });
    return { ok: true };
  }

  function timingFromError(error, delta) {
    const direction = delta >= 0 ? 'EARLY' : 'LATE';
    if (error <= .055) return { label: 'GREEN', score: 1, tone: 'green' };
    if (error <= .13) return { label: `SLIGHTLY ${direction}`, score: .78, tone: 'good' };
    if (error <= .26) return { label: direction, score: .48, tone: 'warn' };
    return { label: `VERY ${direction}`, score: .12, tone: 'bad' };
  }

  function contestAgainst(state, shooter) {
    const defenders = teamPlayers(state, shooter.team === 'home' ? 'away' : 'home');
    const defender = nearestPlayer(defenders, shooter);
    if (!defender) return { value: 0, label: 'OPEN', defenderId: null, distance: 99 };
    const gap = distance(defender, shooter);
    const active = defender.contestUntil > state.elapsed ? 1 : .42;
    const angleFactor = clamp(1 - Math.abs(defender.x - shooter.x) / 24, .35, 1);
    const rating = (defender.ratings.defense * .7 + defender.ratings.length * .3) / 99;
    const proximity = clamp((17 - gap) / 17, 0, 1);
    const value = clamp(proximity * active * angleFactor * rating, 0, 1);
    const label = value > .78 ? 'SMOTHERED' : value > .58 ? 'GREAT CONTEST' : value > .36 ? 'GOOD CONTEST' : value > .14 ? 'LIGHT CONTEST' : 'OPEN';
    return { value, label, defenderId: defender.id, distance: gap };
  }

  function evaluateShot(state, shooter, timing) {
    const hoopDistance = distance(shooter, { x: COURT.hoopX, y: COURT.hoopY });
    const isThree = hoopDistance > 31;
    const atRim = hoopDistance < 13;
    const rating = atRim ? (shooter.ratings.dunk * .45 + shooter.ratings.midrange * .55) : isThree ? shooter.ratings.shooting : shooter.ratings.midrange;
    const contest = contestAgainst(state, shooter);
    const badgeBoost = hasBadge(shooter.card, ['神射手']) && isThree ? .035 : hasBadge(shooter.card, ['曼巴精神']) && state.quarter >= 4 ? .025 : 0;
    const greenWindow = clamp(.052 + (rating - 65) * .00115 + promotionBoost(shooter.card, ['shooting', 'three', 'midrange']) * .0015 + (hasBadge(shooter.card, ['神射手']) ? .018 : 0), .04, .105);
    const delta = Number(timing?.circleScale ?? 1.78) - 1;
    const error = Math.abs(delta);
    const timingGrade = timingFromError(error <= greenWindow ? error * .55 : error, delta);
    if (error <= greenWindow) { timingGrade.label = 'GREEN'; timingGrade.score = 1; timingGrade.tone = 'green'; }
    const base = atRim ? .44 : isThree ? .24 : .32;
    const ability = (rating - 60) * (isThree ? .006 : .0065);
    const timingBoost = (timingGrade.score - .45) * .27;
    const distancePenalty = isThree ? clamp((hoopDistance - 43) * .004, 0, .11) : 0;
    const fatiguePenalty = shooter.fatigue * .2;
    const probability = clamp(base + ability + timingBoost + badgeBoost - contest.value * .34 - distancePenalty - fatiguePenalty, .025, .93);
    return { probability, isThree, atRim, points: isThree ? 3 : 2, timing: timingGrade, contest, rating, greenWindow, distance: hoopDistance };
  }

  function releaseShot(state) {
    if (!state.shot?.charging) return { ok: false, reason: 'not-charging' };
    const shooter = playerById(state, state.shot.shooterId);
    const evaluation = evaluateShot(state, shooter, state.shot);
    const made = state._rng() < evaluation.probability;
    shooter.stats.fgA += 1;
    if (evaluation.isThree) shooter.stats.threeA += 1;
    state.shot.charging = false;
    state.shot.releasedAt = state.elapsed;
    const flightDuration = clamp(.34 + evaluation.distance * .0085, .43, .82);
    state.shot.resolvesAt = state.elapsed + flightDuration;
    state.shot.startX = shooter.x + 2.5;
    state.shot.startY = shooter.y - 1;
    state.shot.result = { ...evaluation, made };
    state.ball.holderId = null;
    state.ball.inFlight = true;
    state.ball.z = 0;
    feedback(state, evaluation.timing.label, `${evaluation.contest.label} · ${Math.round(evaluation.probability * 100)}%`, evaluation.timing.tone, 1.05);
    addEvent(state, 'shot-release', { shooterId: shooter.id, ...state.shot.result });
    return { ok: true, ...state.shot.result };
  }

  function updateShot(state, dt) {
    const shot = state.shot;
    if (!shot) return;
    const shooter = playerById(state, shot.shooterId);
    if (shot.charging) {
      shot.phase += Math.max(0, Number(dt) || 0);
      shot.circleScale = 1.78 - Math.min(1.5, shot.phase) * .82;
      return;
    }
    const progress = clamp((state.elapsed - shot.releasedAt) / Math.max(.01, shot.resolvesAt - shot.releasedAt), 0, 1);
    const startX = Number.isFinite(shot.startX) ? shot.startX : shooter.x;
    const startY = Number.isFinite(shot.startY) ? shot.startY : shooter.y;
    const finishType = shot.result?.finishType || null;
    const targetX = COURT.hoopX;
    const targetY = COURT.hoopY + (finishType === 'dunk' ? 1 : 1.8);
    state.ball.x = startX + (targetX - startX) * progress;
    state.ball.y = startY + (targetY - startY) * progress;
    const shotDistance = Number(shot.result?.distance || distance({ x: startX, y: startY }, { x: targetX, y: targetY }));
    const peakHeight = finishType === 'dunk' ? 3.4 : finishType === 'layup' ? 7.5 : clamp(10 + shotDistance * .18, 12, 22);
    state.ball.z = Math.sin(progress * Math.PI) * peakHeight;
    if (finishType === 'dunk') {
      const attackProgress = Math.min(1, progress * 1.28);
      shooter.x = startX + (COURT.hoopX - startX) * attackProgress;
      shooter.y = startY + (COURT.hoopY + 5 - startY) * attackProgress;
    }
    if (progress < 1) return;
    const result = shot.result;
    if (result.made) {
      shooter.stats.fgM += 1;
      if (result.isThree) shooter.stats.threeM += 1;
      shooter.stats.pts += result.points;
      state[`${shooter.team}Score`] += result.points;
      state.quarterScores[shooter.team][state.quarter - 1] += result.points;
      const assist = state.lastPass && state.elapsed - state.lastPass.at < 3 ? playerById(state, state.lastPass.passerId) : null;
      if (assist && assist.team === shooter.team && assist.id !== shooter.id) assist.stats.ast += 1;
      const madeLabel = result.finishType === 'dunk' ? 'SLAM DUNK' : result.finishType === 'layup' ? 'LAYUP' : result.isThree ? '3 POINTER' : 'BUCKET';
      feedback(state, madeLabel, `${shooter.name} · ${result.contest.label}`, shooter.team === 'home' ? 'good' : 'bad');
      addEvent(state, 'shot-made', { shooterId: shooter.id, points: result.points });
    } else {
      feedback(state, shooter.team === 'home' ? 'MISSED' : 'DEFENSIVE STOP', `${result.contest.label} · ${result.timing.label}`, shooter.team === 'home' ? 'bad' : 'good');
      addEvent(state, 'shot-missed', { shooterId: shooter.id });
    }
    state.shot = null;
    state.ball.inFlight = false;
    state.ball.z = 0;
    changePossession(state, shooter.team === 'home' ? 'away' : 'home', result.made ? 'SCORE' : 'DEFENSIVE REBOUND');
  }

  function drive(state, direction) {
    const player = controlled(state);
    if (!player || state.possession !== 'home' || state.ball.holderId !== player.id || state.transitionUntil > state.elapsed) return { ok: false, reason: 'no-ball' };
    const dir = direction || { x: 0, y: -1 };
    if (Number(dir.y) > .45) {
      player.y = clamp(player.y + 6, COURT.minY, COURT.maxY);
      player.fatigue = clamp(player.fatigue + .025, 0, 1);
      feedback(state, 'STEP BACK', '創造投籃空間', 'good', .7);
      addEvent(state, 'step-back', { playerId: player.id });
      return { ok: true, move: 'step-back' };
    }
    player.driveUntil = state.elapsed + .85;
    if (Math.abs(Number(dir.x)) > .45) {
      player.x = clamp(player.x + Math.sign(dir.x) * 4.5, COURT.minX, COURT.maxX);
      feedback(state, 'CROSSOVER', '變向突破', 'good', .65);
      addEvent(state, 'crossover', { playerId: player.id });
      return { ok: true, move: 'crossover' };
    }
    feedback(state, 'DRIVE', '加速攻擊籃框', 'neutral', .55);
    addEvent(state, 'drive', { playerId: player.id });
    return { ok: true, move: 'straight' };
  }

  function contest(state) {
    const defender = controlled(state);
    if (!defender || state.possession !== 'away' || defender.team !== 'home') return { ok: false, reason: 'not-defense' };
    defender.contestUntil = state.elapsed + .55;
    defender.fatigue = clamp(defender.fatigue + .012, 0, 1);
    const target = holder(state);
    const gap = target ? distance(defender, target) : 99;
    feedback(state, gap < 13 ? 'CONTEST' : 'TOO FAR', gap < 13 ? '保持在出手者身前' : '先貼近持球者', gap < 13 ? 'good' : 'warn', .55);
    addEvent(state, 'contest', { defenderId: defender.id, gap });
    return { ok: true, gap };
  }

  function steal(state) {
    const defender = controlled(state);
    const ballHandler = holder(state);
    if (!defender || !ballHandler || state.possession !== 'away' || defender.team !== 'home') return { ok: false, reason: 'not-defense' };
    if (defender.stealCooldownUntil > state.elapsed) return { ok: false, reason: 'cooldown' };
    defender.stealCooldownUntil = state.elapsed + 1.15;
    const gap = distance(defender, ballHandler);
    const probability = clamp(.08 + (defender.ratings.steal - ballHandler.ratings.handling) * .006 + (9 - gap) * .025, .02, .48);
    const success = gap < 12 && state._rng() < probability;
    if (success) {
      defender.stats.stl += 1;
      ballHandler.stats.tov += 1;
      feedback(state, 'STEAL', `${defender.name} 抄走球權`, 'good');
      addEvent(state, 'steal', { defenderId: defender.id, handlerId: ballHandler.id });
      changePossession(state, 'home', 'STEAL');
    } else {
      defender.recoveryUntil = state.elapsed + .72;
      feedback(state, 'MISSED REACH', '短暫失去防守位置', 'bad');
      addEvent(state, 'missed-steal', { defenderId: defender.id, probability });
    }
    return { ok: true, success, probability };
  }

  function switchDefender(state) {
    if (state.possession !== 'away') return { ok: false, reason: 'not-defense' };
    const target = holder(state) || state.ball;
    const candidates = teamPlayers(state, 'home').sort((a, b) => distance(a, target) - distance(b, target));
    const currentIndex = candidates.findIndex(player => player.id === state.controlledPlayerId);
    const next = candidates[(currentIndex + 1 + candidates.length) % candidates.length] || candidates[0];
    state.controlledPlayerId = next.id;
    feedback(state, 'SWITCH', `控制 ${next.name}`, 'neutral', .55);
    return { ok: true, playerId: next.id };
  }

  function cpuShoot(state, shooter) {
    const rimAction = getShotAction(state, shooter);
    if (rimAction !== 'SHOOT') return beginRimFinish(state, shooter, rimAction.toLowerCase());
    const contest = contestAgainst(state, shooter);
    const distanceToHoop = distance(shooter, { x: COURT.hoopX, y: COURT.hoopY });
    const isThree = distanceToHoop > 31;
    const ability = isThree ? shooter.ratings.shooting : shooter.ratings.midrange;
    const probability = clamp((isThree ? .27 : .39) + (ability - 70) * .005 - contest.value * .31 - shooter.fatigue * .14, .04, .82);
    shooter.stats.fgA += 1;
    if (isThree) shooter.stats.threeA += 1;
    const made = state._rng() < probability;
    const points = isThree ? 3 : 2;
    const flightDuration = clamp(.34 + distanceToHoop * .0085, .43, .82);
    state.shot = {
      shooterId: shooter.id,
      charging: false,
      phase: 0,
      releasedAt: state.elapsed,
      resolvesAt: state.elapsed + flightDuration,
      startX: shooter.x + 2.5,
      startY: shooter.y - 1,
      result: {
        probability, isThree, atRim: false, points, made, rating: ability,
        timing: { label: 'AI RELEASE', score: .72, tone: 'neutral' },
        contest, greenWindow: 0, distance: distanceToHoop, finishType: null
      }
    };
    state.ball.holderId = null;
    state.ball.inFlight = true;
    state.ball.z = 0;
    feedback(state, 'OPPONENT SHOT', `${shooter.name} · ${contest.label}`, 'warn', .72);
    addEvent(state, 'cpu-shot-release', { shooterId: shooter.id, isThree, probability });
  }

  function updateCPUOffense(state, dt) {
    if (state.possession !== 'away' || state.transitionUntil > state.elapsed || state.shot || state.passFlight) return;
    const ballHandler = holder(state);
    if (!ballHandler) return;
    const defender = nearestPlayer(teamPlayers(state, 'home'), ballHandler);
    const open = !defender || distance(defender, ballHandler) > 13;
    const towardHoop = { x: COURT.hoopX + Math.sin(state.elapsed * .9) * 10, y: clamp(ballHandler.y - 8, 18, 72) };
    moveToward(ballHandler, towardHoop, dt, .53);
    if (state.elapsed < state._cpuDecisionAt) return;
    state._cpuDecisionAt = state.elapsed + 1.25 + state._rng() * 1.15;
    const teammates = teamPlayers(state, 'away').filter(player => player.id !== ballHandler.id);
    const target = teammates.sort((a, b) => {
      const value = player => defenderGap(state, player) * 1.5
        + (player.routeKind === 'cut' ? 17 : player.routeKind === 'relocate' ? 7 : 0)
        + (player.y < 29 ? player.ratings.dunk : player.ratings.shooting) * .08
        - passingLaneRisk(state, ballHandler, player) * 75;
      return value(b) - value(a);
    })[0];
    const targetIsBetter = target && defenderGap(state, target) > defenderGap(state, ballHandler) + 3;
    if (state.shotClock < 8 || (open && !targetIsBetter) || ballHandler.y < 30) cpuShoot(state, ballHandler);
    else if (target) beginPass(state, ballHandler, target, { cpu: true });
  }

  function advanceQuarter(state) {
    if (state.quarter >= state.maxQuarters) {
      if (state.homeScore === state.awayScore) {
        state.quarter = 4;
        state.gameClock = 30;
        feedback(state, 'OVERTIME', '延長決勝 30 秒', 'warn', 1.2);
        return;
      }
      state.finished = true;
      state.finishReason = 'final';
      feedback(state, 'FINAL', `${state.homeScore} — ${state.awayScore}`, 'neutral', 99);
      return;
    }
    state.quarter += 1;
    state.gameClock = state.quarterDuration;
    state.shotClock = 24;
    feedback(state, `${state.quarter}Q`, '新的一節開始', 'neutral', 1);
    resetPossession(state, state.quarter % 2 === 0 ? 'away' : 'home', true);
  }

  function step(state, input, dt) {
    if (!state || state.finished || state.paused) return state;
    const seconds = clamp(dt, 0, .08);
    state.elapsed += seconds;
    if (state.transitionUntil <= state.elapsed) {
      state.gameClock = Math.max(0, state.gameClock - seconds);
      state.shotClock = Math.max(0, state.shotClock - seconds * state.shotClockScale);
    }
    state.players.forEach(player => {
      if (player.driveUntil <= state.elapsed) player.driveUntil = 0;
      if (player.recoveryUntil <= state.elapsed) player.recoveryUntil = 0;
      if (player.contestUntil <= state.elapsed) player.contestUntil = 0;
      if (Math.hypot(input?.x || 0, input?.y || 0) < .08) player.fatigue = clamp(player.fatigue - seconds * .0025, 0, 1);
    });
    moveControlled(state, input || {}, seconds);
    updateAIPositions(state, seconds);
    updateCPUOffense(state, seconds);
    updatePass(state);
    updateShot(state, seconds);
    updateBall(state);
    if (!state.finished && state.shotClock <= 0) {
      const offender = holder(state);
      if (offender) offender.stats.tov += 1;
      feedback(state, 'SHOT CLOCK', '24 秒違例', 'bad');
      changePossession(state, state.possession === 'home' ? 'away' : 'home', '24 SECOND VIOLATION');
    }
    if (!state.finished && state.gameClock <= 0) advanceQuarter(state);
    return state;
  }

  function setPaused(state, paused) { if (state) state.paused = !!paused; return state; }

  function percentage(made, attempts) { return attempts ? ((made / attempts) * 100).toFixed(1) : '0.0'; }
  function toRow(player, teamScore, opponentScore) {
    const stats = player.stats;
    return {
      name: player.name,
      cardId: player.cardId,
      role: 'starter',
      pos: player.pos,
      min: Math.max(1, Math.round((player.card?.liveMinutes || 8) * (1 - player.fatigue * .18))),
      pts: stats.pts, fgM: stats.fgM, fgA: stats.fgA, fgPct: percentage(stats.fgM, stats.fgA),
      threeM: stats.threeM, threeA: stats.threeA, threePct: percentage(stats.threeM, stats.threeA),
      ftM: stats.ftM, ftA: stats.ftA, ftPct: percentage(stats.ftM, stats.ftA),
      oReb: 0, dReb: stats.reb, reb: stats.reb, ast: stats.ast, stl: stats.stl, blk: stats.blk,
      tov: stats.tov, pf: stats.pf, plusMinus: teamScore - opponentScore,
      trait: { type: 'live', badge: '🎮 LIVE' }
    };
  }

  function toBoxScore(state) {
    return {
      mode: state.mode,
      homeScore: state.homeScore,
      awayScore: state.awayScore,
      quarterScores: { home: [...state.quarterScores.home], away: [...state.quarterScores.away] },
      home: teamPlayers(state, 'home').map(player => toRow(player, state.homeScore, state.awayScore)),
      away: teamPlayers(state, 'away').map(player => toRow(player, state.awayScore, state.homeScore)),
      possessionsPlayed: state.possessionsPlayed,
      finishReason: state.finishReason
    };
  }

  function snapshot(state) {
    if (!state) return null;
    const copy = JSON.parse(JSON.stringify(state, (key, value) => key === '_rng' || key === 'card' ? undefined : value));
    copy.snapshotAt = Date.now();
    return copy;
  }

  return {
    VERSION, COURT, create, step, pass, startShot, releaseShot, drive, contest, steal, switchDefender, getShotAction,
    setPaused, toBoxScore, snapshot, resolveRatings, evaluateShot,
    helpers: { clamp, distance, playerById, teamPlayers, holder, controlled, changePossession, resetPossession }
  };
});

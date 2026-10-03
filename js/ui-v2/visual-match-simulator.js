(function (global) {
  'use strict';

  const MOMENTUM_SWING = Object.freeze({
    TWO_POINT_MADE: 5,
    THREE_POINT_MADE: 8,
    FREE_THROW: 2,
    OFFENSIVE_REBOUND: 3,
    DEFENSIVE_REBOUND: 2,
    STEAL: 6,
    BLOCK: 6,
    TURNOVER: 5,
    AND_ONE: 9,
    FAST_BREAK_SCORE: 8,
    CLUTCH_SCORE: 10,
    BADGE_MOMENT: 12
  });

  const HIGHLIGHT_LABELS = Object.freeze({
    THREE_POINT_MADE: 'THREE!',
    STEAL: 'STEAL!',
    BLOCK: 'BLOCK!',
    AND_ONE: 'AND-ONE!',
    FAST_BREAK_SCORE: 'FAST BREAK!',
    CLUTCH_SCORE: 'CLUTCH!',
    BADGE_MOMENT: 'BADGE MOMENT!'
  });

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function createState(options = {}) {
    return {
      momentum: 0,
      currentRunTeam: null,
      currentRunPoints: 0,
      possessionTeam: null,
      lastLeader: null,
      isClutchTime: false,
      commentary: [],
      displayHomeScore: Number(options.homeScore || 0),
      displayAwayScore: Number(options.awayScore || 0),
      quarter: 0,
      clock: 720,
      highlight: '',
      drama: '',
      scoringTeam: null,
      scoreDelta: 0,
      busy: false,
      transition: null,
      pendingEvents: [],
      pendingBadgeEvent: null
    };
  }

  function scoringParts(total, quarter, teamOffset) {
    const parts = [];
    let remaining = Math.max(0, Number(total || 0));
    let index = 0;
    while (remaining > 0) {
      let points;
      if (remaining === 1) points = 1;
      else if (remaining === 2 || remaining === 4) points = 2;
      else points = ((index + quarter + teamOffset) % 3 === 0) ? 3 : 2;
      if (remaining - points === 1 && points === 3) points = 2;
      parts.push(points);
      remaining -= points;
      index += 1;
    }
    return parts;
  }

  function eventType(points, index, quarter, clock) {
    if ((quarter >= 4 && clock <= 120) || quarter > 4) return 'CLUTCH_SCORE';
    if (points === 1) return 'FREE_THROW';
    if (points === 3) return (index + quarter) % 5 === 0 ? 'AND_ONE' : 'THREE_POINT_MADE';
    return (index + quarter) % 6 === 0 ? 'FAST_BREAK_SCORE' : 'TWO_POINT_MADE';
  }

  function commentaryFor(event, awayName) {
    const subject = event.team === 'user' ? event.playerName : awayName;
    if (event.type === 'THREE_POINT_MADE') return `${subject} 命中三分球。`;
    if (event.type === 'FREE_THROW') return `${subject} 罰球命中。`;
    if (event.type === 'AND_ONE') return `${subject} 強勢打進並造成加罰！`;
    if (event.type === 'FAST_BREAK_SCORE') return `${subject} 快攻完成得分。`;
    if (event.type === 'CLUTCH_SCORE') return `${subject} 在關鍵時刻命中。`;
    return `${subject} 投籃得手。`;
  }

  function buildTeamEvents({ team, total, quarter, players, awayName, offset }) {
    const duration = quarter > 4 ? 300 : 720;
    const parts = scoringParts(total, quarter, offset);
    return parts.map((points, index) => {
      const clock = Math.max(3, Math.round(duration - ((index + 1) * (duration - 24) / (parts.length + 1))));
      const player = team === 'user' && players.length ? players[(index + quarter + offset) % players.length] : null;
      const event = {
        type: '',
        team,
        playerId: player?.cardId || player?.nbaId || null,
        playerName: player?.name || awayName,
        points,
        quarter,
        clock,
        badgeMoment: false
      };
      event.type = eventType(points, index, quarter, clock);
      event.text = commentaryFor(event, awayName);
      return event;
    });
  }

  function buildQuarterEvents(options = {}) {
    const home = buildTeamEvents({
      team: 'user', total: options.homePoints, quarter: options.quarter,
      players: options.homePlayers || [], awayName: options.awayName || 'MY TEAM', offset: 0
    });
    const away = buildTeamEvents({
      team: 'opponent', total: options.awayPoints, quarter: options.quarter,
      players: [], awayName: options.awayName || 'OPPONENT', offset: 1
    });
    return home.concat(away).sort((a, b) => b.clock - a.clock || (a.team === 'user' ? -1 : 1));
  }

  function buildBadgeEvent(moment, quarter, clock = 18) {
    return {
      type: 'BADGE_MOMENT',
      team: 'user',
      playerId: moment?.cardId || null,
      playerName: moment?.player || 'MY TEAM',
      points: Math.max(2, Number(moment?.points || 2)),
      quarter,
      clock,
      text: `${moment?.player || 'MY TEAM'} 觸發【${moment?.badge || 'Badge'} · ${moment?.tier || 'Bronze'}】並完成得分！`,
      badgeMoment: true
    };
  }

  function leaderFor(homeScore, awayScore) {
    if (homeScore === awayScore) return 'tie';
    return homeScore > awayScore ? 'user' : 'opponent';
  }

  function runBonus(points) {
    if (points >= 10) return 8;
    if (points >= 8) return 5;
    if (points >= 6) return 3;
    return 0;
  }

  function applyEvent(state, event) {
    const previousLeader = leaderFor(state.displayHomeScore, state.displayAwayScore);
    const points = Math.max(0, Number(event.points || 0));

    state.quarter = Number(event.quarter || state.quarter || 1);
    state.clock = Math.max(0, Number(event.clock || 0));
    state.possessionTeam = event.team;
    state.scoringTeam = points ? event.team : null;
    state.scoreDelta = points;

    if (event.team === 'user') state.displayHomeScore += points;
    else if (event.team === 'opponent') state.displayAwayScore += points;

    if (points > 0) {
      if (state.currentRunTeam === event.team) state.currentRunPoints += points;
      else {
        state.currentRunTeam = event.team;
        state.currentRunPoints = points;
      }
    }

    const direction = event.team === 'user' ? -1 : 1;
    const baseSwing = MOMENTUM_SWING[event.type] || (points >= 3 ? 8 : 5);
    const clutchMultiplier = event.type === 'CLUTCH_SCORE' ? 1.25 : 1;
    state.momentum *= 0.92;
    state.momentum += direction * baseSwing * clutchMultiplier;
    state.momentum += direction * runBonus(state.currentRunPoints);
    state.momentum = clamp(state.momentum, -100, 100);

    const currentLeader = leaderFor(state.displayHomeScore, state.displayAwayScore);
    const closeClutch = (state.quarter > 4 || (state.quarter === 4 && state.clock <= 120))
      && Math.abs(state.displayHomeScore - state.displayAwayScore) <= 5;
    state.isClutchTime = closeClutch;
    state.drama = '';
    if (currentLeader === 'tie' && state.displayHomeScore > 0) state.drama = 'TIE GAME';
    else if (previousLeader !== 'tie' && currentLeader !== previousLeader) state.drama = 'LEAD CHANGE';
    else if (closeClutch) state.drama = 'CLUTCH TIME';

    state.lastLeader = currentLeader;
    state.highlight = HIGHLIGHT_LABELS[event.type] || '';
    if (event.text) {
      state.commentary.push({ text: event.text, type: event.type, team: event.team });
      state.commentary = state.commentary.slice(-5);
    }
    return state;
  }

  function consumeEvents(state, events) {
    (events || []).forEach(event => applyEvent(state, event));
    state.highlight = '';
    state.drama = '';
    state.scoringTeam = null;
    state.scoreDelta = 0;
    return state;
  }

  global.VisualMatchSimulator = Object.freeze({
    MOMENTUM_SWING,
    createState,
    buildQuarterEvents,
    buildBadgeEvent,
    applyEvent,
    consumeEvents
  });
})(window);

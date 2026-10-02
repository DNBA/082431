(function (global) {
  'use strict';

  const DEFAULT_DURATION_MS = 25 * 60 * 1000;

  function finiteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function normalize(timer) {
    const source = timer && typeof timer === 'object' ? timer : {};
    const plannedDuration = Math.max(1000, finiteNumber(source.plannedDuration, DEFAULT_DURATION_MS));
    const pausedAccumulatedMs = Math.min(
      plannedDuration,
      Math.max(0, finiteNumber(source.pausedAccumulatedMs, 0))
    );
    const validStatuses = new Set(['idle', 'running', 'paused', 'completed']);
    const status = validStatuses.has(source.status) ? source.status : 'idle';

    return {
      sessionId: typeof source.sessionId === 'string' ? source.sessionId : '',
      status,
      sessionStartAt: status === 'running' ? finiteNumber(source.sessionStartAt, null) : null,
      plannedDuration,
      pausedAccumulatedMs,
      completedAt: status === 'completed' ? finiteNumber(source.completedAt, null) : null
    };
  }

  function elapsedMs(timer, now = Date.now()) {
    const normalized = normalize(timer);
    const runningMs = normalized.status === 'running' && normalized.sessionStartAt !== null
      ? Math.max(0, finiteNumber(now, Date.now()) - normalized.sessionStartAt)
      : 0;
    return Math.min(normalized.plannedDuration, normalized.pausedAccumulatedMs + runningMs);
  }

  function remainingMs(timer, now = Date.now()) {
    const normalized = normalize(timer);
    return Math.max(0, normalized.plannedDuration - elapsedMs(normalized, now));
  }

  function start(timer, now = Date.now(), sessionId = '') {
    const normalized = normalize(timer);
    if (normalized.status === 'completed' || normalized.status === 'idle') {
      normalized.pausedAccumulatedMs = 0;
      normalized.completedAt = null;
      normalized.sessionId = sessionId || normalized.sessionId;
    }
    normalized.status = 'running';
    normalized.sessionStartAt = finiteNumber(now, Date.now());
    return normalized;
  }

  function pause(timer, now = Date.now()) {
    const normalized = normalize(timer);
    if (normalized.status !== 'running') return normalized;
    normalized.pausedAccumulatedMs = elapsedMs(normalized, now);
    normalized.sessionStartAt = null;
    normalized.status = normalized.pausedAccumulatedMs >= normalized.plannedDuration ? 'completed' : 'paused';
    return normalized;
  }

  function complete(timer, now = Date.now()) {
    const normalized = normalize(timer);
    normalized.status = 'completed';
    normalized.sessionStartAt = null;
    normalized.pausedAccumulatedMs = normalized.plannedDuration;
    normalized.completedAt = finiteNumber(now, Date.now());
    return normalized;
  }

  function reset(durationMs = DEFAULT_DURATION_MS) {
    return normalize({ plannedDuration: durationMs });
  }

  function recordCompletion(focusState, { sessionId, durationMs, dateKey, dailyRewardCap = 20 }) {
    const focus = focusState && typeof focusState === 'object' ? { ...focusState } : {};
    focus.totalFocusedMs = Math.max(0, finiteNumber(focus.totalFocusedMs, 0));
    focus.dailyFocusedMs = Math.max(0, finiteNumber(focus.dailyFocusedMs, 0));
    focus.rewardsClaimedToday = Math.max(0, finiteNumber(focus.rewardsClaimedToday, 0));
    focus.rewardedSessionIds = Array.isArray(focus.rewardedSessionIds) ? [...focus.rewardedSessionIds] : [];
    focus.dailyRewardCap = Math.max(1, finiteNumber(dailyRewardCap, 20));

    if (focus.dailyDate !== dateKey) {
      focus.dailyDate = dateKey;
      focus.dailyFocusedMs = 0;
    }
    if (focus.rewardsDate !== dateKey) {
      focus.rewardsDate = dateKey;
      focus.rewardsClaimedToday = 0;
    }

    if (!sessionId || focus.rewardedSessionIds.includes(sessionId)) {
      return { focus, firstCompletion: false, rewardGranted: false };
    }

    const duration = Math.max(0, finiteNumber(durationMs, DEFAULT_DURATION_MS));
    focus.rewardedSessionIds.push(sessionId);
    focus.rewardedSessionIds = focus.rewardedSessionIds.slice(-100);
    focus.totalFocusedMs += duration;
    focus.dailyFocusedMs += duration;
    const rewardGranted = focus.rewardsClaimedToday < focus.dailyRewardCap;
    if (rewardGranted) focus.rewardsClaimedToday += 1;
    return { focus, firstCompletion: true, rewardGranted };
  }

  const api = { DEFAULT_DURATION_MS, normalize, elapsedMs, remainingMs, start, pause, complete, reset, recordCompletion };
  global.ToeicQuestFocusTimer = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

(function (global) {
  'use strict';

  const CHECKPOINT_VERSION = 1;

  function safeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function seasonIdentity(value) {
    return {
      seasonNo: Math.max(1, Math.floor(safeNumber(value?.seasonNo, 1))),
      seasonStartedAt: String(value?.seasonStartedAt || '')
    };
  }

  function sameSeason(left, right) {
    const a = seasonIdentity(left);
    const b = seasonIdentity(right);
    if (a.seasonNo !== b.seasonNo) return false;
    return !a.seasonStartedAt || !b.seasonStartedAt || a.seasonStartedAt === b.seasonStartedAt;
  }

  function compactResult(game) {
    if (!game || !game.played) return null;
    const gameNumber = Math.floor(safeNumber(game.game));
    if (gameNumber < 1 || gameNumber > 82) return null;
    return {
      game: gameNumber,
      opponent: String(game.opponent || ''),
      win: !!game.win,
      myScore: Math.max(0, Math.floor(safeNumber(game.myScore))),
      oppScore: Math.max(0, Math.floor(safeNumber(game.oppScore))),
      completedAt: String(game.completedAt || new Date().toISOString())
    };
  }

  function createStore(storage, primaryKey, now = () => Date.now()) {
    const checkpointKey = `${primaryKey}_season_checkpoint_v1`;
    const backupIndexKey = `${primaryKey}_backups_v1`;

    function read() {
      try {
        const value = JSON.parse(storage.getItem(checkpointKey) || 'null');
        return value && value.version === CHECKPOINT_VERSION && Array.isArray(value.results) ? value : null;
      } catch (_) {
        return null;
      }
    }

    function pruneOldestBackup() {
      try {
        const entries = JSON.parse(storage.getItem(backupIndexKey) || '[]');
        if (!Array.isArray(entries) || !entries.length) return false;
        const sorted = entries.filter(entry => entry?.id).sort((a, b) => safeNumber(b.at) - safeNumber(a.at));
        const oldest = sorted.pop();
        if (!oldest) return false;
        storage.removeItem(oldest.id);
        storage.setItem(backupIndexKey, JSON.stringify(sorted));
        return true;
      } catch (_) {
        return false;
      }
    }

    function write(value) {
      const raw = JSON.stringify(value);
      for (let attempt = 0; attempt < 6; attempt += 1) {
        try {
          storage.setItem(checkpointKey, raw);
          return true;
        } catch (_) {
          if (!pruneOldestBackup()) return false;
        }
      }
      return false;
    }

    function record(journey, game) {
      if (!journey || typeof journey !== 'object') return false;
      const previous = read();
      const base = previous && sameSeason(previous, journey) ? previous : {
        version: CHECKPOINT_VERSION,
        ...seasonIdentity(journey),
        results: []
      };
      const resultMap = new Map((base.results || []).map(result => [Number(result.game), result]));
      const result = compactResult(game);
      if (result) resultMap.set(result.game, result);
      const checkpoint = {
        version: CHECKPOINT_VERSION,
        ...seasonIdentity(journey),
        gameIndex: Math.max(0, Math.min(82, Math.floor(safeNumber(journey.gameIndex)))),
        wins: Math.max(0, Math.floor(safeNumber(journey.wins))),
        losses: Math.max(0, Math.floor(safeNumber(journey.losses))),
        streak: Math.max(0, Math.floor(safeNumber(journey.streak))),
        bestStreak: Math.max(0, Math.floor(safeNumber(journey.bestStreak))),
        completed: !!journey.completed,
        updatedAt: now(),
        results: [...resultMap.values()].sort((a, b) => a.game - b.game).slice(-82)
      };
      return write(checkpoint);
    }

    function apply(journey) {
      const checkpoint = read();
      if (!checkpoint || !journey || !sameSeason(checkpoint, journey)) return { applied: false, checkpoint };
      const currentIndex = Math.max(0, Math.floor(safeNumber(journey.gameIndex)));
      const checkpointIndex = Math.max(0, Math.floor(safeNumber(checkpoint.gameIndex)));
      if (checkpointIndex <= currentIndex) return { applied: false, checkpoint };

      const schedule = Array.isArray(journey.schedule) ? journey.schedule : [];
      checkpoint.results.forEach(result => {
        const item = schedule.find(game => Number(game?.game) === Number(result.game));
        if (!item) return;
        Object.assign(item, {
          played: true,
          win: !!result.win,
          myScore: Math.max(0, Math.floor(safeNumber(result.myScore))),
          oppScore: Math.max(0, Math.floor(safeNumber(result.oppScore))),
          completedAt: result.completedAt || null,
          recoveredFromCheckpoint: true
        });
      });
      journey.gameIndex = Math.min(82, checkpointIndex);
      journey.wins = Math.max(0, Math.floor(safeNumber(checkpoint.wins)));
      journey.losses = Math.max(0, Math.floor(safeNumber(checkpoint.losses)));
      journey.streak = Math.max(0, Math.floor(safeNumber(checkpoint.streak)));
      journey.bestStreak = Math.max(journey.streak, Math.floor(safeNumber(checkpoint.bestStreak)));
      journey.completed = !!checkpoint.completed;
      journey.recent = checkpoint.results.slice(-10).map(result => ({
        game: result.game,
        win: !!result.win,
        opponent: result.opponent
      }));
      journey.checkpointRecoveredAt = new Date(now()).toISOString();
      return { applied: true, checkpoint };
    }

    function clear(journey) {
      const checkpoint = read();
      if (!checkpoint) return true;
      if (journey && (!sameSeason(checkpoint, journey)
        || safeNumber(checkpoint.gameIndex) > safeNumber(journey.gameIndex))) return false;
      try {
        storage.removeItem(checkpointKey);
        return true;
      } catch (_) {
        return false;
      }
    }

    return { key: checkpointKey, read, record, apply, clear };
  }

  const api = { createStore, compactResult, sameSeason };
  global.ToeicQuestSeasonCheckpoint = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);


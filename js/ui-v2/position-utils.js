(function (global) {
  'use strict';

  const VALID_POSITIONS = Object.freeze(['PG', 'SG', 'SF', 'PF', 'C']);

  function normalizePlayerPositions(value, fallback = ['PG']) {
    const source = Array.isArray(value)
      ? value
      : (typeof value === 'string' ? value.split(/[\/,|]/) : []);
    const normalized = [];
    source.forEach(position => {
      const token = String(position || '').trim().toUpperCase();
      if (VALID_POSITIONS.includes(token) && !normalized.includes(token)) normalized.push(token);
    });
    if (normalized.length) return normalized;
    const safeFallback = Array.isArray(fallback) ? fallback : [fallback];
    const recovered = safeFallback
      .map(position => String(position || '').trim().toUpperCase())
      .filter((position, index, list) => VALID_POSITIONS.includes(position) && list.indexOf(position) === index);
    return recovered.length ? recovered : ['PG'];
  }

  function getPlayerPositions(card) {
    return normalizePlayerPositions(card?.positions || card?.pos || [], ['PG']);
  }

  function getPrimaryPosition(card) {
    return getPlayerPositions(card)[0];
  }

  function getSecondaryPositions(card) {
    return getPlayerPositions(card).slice(1);
  }

  function formatPlayerPositions(card) {
    return getPlayerPositions(card).join('/');
  }

  global.PLAYER_POSITIONS = VALID_POSITIONS;
  global.normalizePlayerPositions = normalizePlayerPositions;
  global.getPlayerPositions = getPlayerPositions;
  global.getPrimaryPosition = getPrimaryPosition;
  global.getSecondaryPositions = getSecondaryPositions;
  global.formatPlayerPositions = formatPlayerPositions;
})(window);

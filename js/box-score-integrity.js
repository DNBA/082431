/* ToeicQuest NBA — Box Score arithmetic integrity helpers.
   Every stat line must satisfy:
   PTS = 2PM * 2 + 3PM * 3 + FTM. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.BoxScoreIntegrity = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function safeInteger(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
  }

  function percentage(made, attempted) {
    return attempted > 0 ? ((made / attempted) * 100).toFixed(1) : '0.0';
  }

  function normalizeShootingLine(row, requestedPoints = row?.pts) {
    if (!row || typeof row !== 'object') return row;
    const pts = safeInteger(requestedPoints);
    const threeM = clamp(safeInteger(row.threeM), 0, Math.floor(pts / 3));
    const nonThreePoints = pts - threeM * 3;

    let ftM = clamp(safeInteger(row.ftM), 0, nonThreePoints);
    // The points left after free throws must be even so it can come from 2PM.
    if ((nonThreePoints - ftM) % 2 !== 0) {
      if (ftM < nonThreePoints) ftM += 1;
      else ftM = Math.max(0, ftM - 1);
    }

    const twoM = Math.max(0, (nonThreePoints - ftM) / 2);
    const fgM = twoM + threeM;
    const fgA = Math.max(fgM, safeInteger(row.fgA, fgM));
    const threeA = Math.max(threeM, safeInteger(row.threeA, threeM));
    const ftA = Math.max(ftM, safeInteger(row.ftA, ftM));

    Object.assign(row, {
      pts,
      twoM,
      fgM,
      fgA,
      fgPct: percentage(fgM, fgA),
      threeM,
      threeA,
      threePct: percentage(threeM, threeA),
      ftM,
      ftA,
      ftPct: percentage(ftM, ftA)
    });
    return row;
  }

  function reconcileTeamPoints(rows, requestedTotal) {
    const players = Array.isArray(rows) ? rows.filter(Boolean) : [];
    const teamTotal = safeInteger(requestedTotal);
    if (!players.length) return players;

    players.forEach(row => { row.pts = safeInteger(row.pts); });
    let difference = teamTotal - players.reduce((sum, row) => sum + row.pts, 0);

    if (difference > 0) {
      const scorer = [...players].sort((a, b) => b.pts - a.pts)[0];
      scorer.pts += difference;
    } else if (difference < 0) {
      let excess = Math.abs(difference);
      // Remove overflow from the lowest-priority rotation players first.
      const reductionOrder = [...players].sort((a, b) => {
        const aBench = a.role === 'bench' ? 0 : 1;
        const bBench = b.role === 'bench' ? 0 : 1;
        return aBench - bBench || a.pts - b.pts;
      });
      reductionOrder.forEach(row => {
        if (!excess) return;
        const reduction = Math.min(row.pts, excess);
        row.pts -= reduction;
        excess -= reduction;
      });
    }

    players.forEach(row => normalizeShootingLine(row, row.pts));
    return players;
  }

  function linePoints(row) {
    const threeM = safeInteger(row?.threeM);
    const fgM = Math.max(threeM, safeInteger(row?.fgM));
    const twoM = fgM - threeM;
    return twoM * 2 + threeM * 3 + safeInteger(row?.ftM);
  }

  return { normalizeShootingLine, reconcileTeamPoints, linePoints };
});

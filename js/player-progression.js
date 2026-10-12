(function (global, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global) global.PlayerProgression = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const RARITIES = Object.freeze(['N', 'R', 'SR', 'SSR', 'UR']);
  const CONFIG = Object.freeze({
    requirements: {
      N: { next: 'R', ticket: 'basic', tickets: 1, shards: 20, ovr: 3 },
      R: { next: 'SR', ticket: 'advanced', tickets: 2, shards: 40, ovr: 4 },
      SR: { next: 'SSR', ticket: 'elite', tickets: 2, shards: 70, ovr: 4 },
      SSR: { next: 'UR', ticket: 'ur', tickets: 1, shards: 120, ovr: 4 },
      UR: { next: 'SPECIAL', ticket: 'ur', tickets: 1, shards: 150, ovr: 1, awakening: true }
    },
    caps: { N: 92, R: 93, SR: 94, SSR: 95, UR: 99 },
    pityGoals: { advanced: 10, elite: 8, ur: 6 }
  });

  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
  const specialCard = card => !!(card?.designId && card.designId !== 'normal-rarity-v2') || !!card?.isSpecial;
  const normalizedName = value => String(value || 'player').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  // Shards belong to the NBA player, not to one card instance or card edition.
  const shardKey = card => Number(card?.nbaId) > 0 ? `player:${Number(card.nbaId)}` : `player-name:${normalizedName(card?.name)}`;

  function ensureState(state) {
    if (!state.playerProgression || typeof state.playerProgression !== 'object') state.playerProgression = {};
    const data = state.playerProgression;
    if (!data.tickets || typeof data.tickets !== 'object') data.tickets = {};
    ['basic','advanced','elite','ur'].forEach(key => { data.tickets[key] = Math.max(0, Number(data.tickets[key]) || 0); });
    if (!data.playerShards || typeof data.playerShards !== 'object') data.playerShards = {};
    // V3.1.1 migration: merge old cardId-bound shards into one player balance.
    (state.inventory || []).forEach(card => {
      const oldKey = String(card?.cardId || '');
      const newKey = shardKey(card);
      if (oldKey && oldKey !== newKey && Number(data.playerShards[oldKey]) > 0) {
        data.playerShards[newKey] = (Number(data.playerShards[newKey]) || 0) + Number(data.playerShards[oldKey]);
        delete data.playerShards[oldKey];
      }
    });
    if (!data.pity || typeof data.pity !== 'object') data.pity = {};
    ['advanced','elite','ur'].forEach(key => { data.pity[key] = Math.max(0, Number(data.pity[key]) || 0); });
    if (!Array.isArray(data.rewardHistory)) data.rewardHistory = [];
    return data;
  }

  function ensureCard(card) {
    if (!card || typeof card !== 'object') return card;
    const rarity = RARITIES.includes(card.rarity) ? card.rarity : 'N';
    if (!RARITIES.includes(card.originalRarity)) card.originalRarity = rarity;
    if (!RARITIES.includes(card.currentRarity)) card.currentRarity = rarity;
    card.rarity = card.currentRarity;
    card.promotionLevel = clamp(card.promotionLevel, 0, 5);
    card.promotionOvrBonus = Math.max(0, Number(card.promotionOvrBonus) || 0);
    if (!card.promotionStatBonuses || typeof card.promotionStatBonuses !== 'object') card.promotionStatBonuses = {};
    const base = Number(card.baseOvr || card.realOvr || card.ovr || 70);
    const starBonus = Math.max(0, (Number(card.stars || 1) - 1) * 2);
    const fmvpBonus = Number(card.fmvpBonus || 0);
    const normalCap = CONFIG.caps[card.originalRarity] || 99;
    const cap = card.promotionSpecialTheme === 'silver-black' ? Math.min(99, normalCap + 1) : normalCap;
    card.ovr = Math.min(cap, base + starBonus + fmvpBonus + card.promotionOvrBonus);
    return card;
  }

  function requirement(card) {
    ensureCard(card);
    if (!card || specialCard(card) || card.promotionSpecialTheme === 'silver-black') return null;
    return CONFIG.requirements[card.currentRarity] || null;
  }

  function growthWeights(card) {
    const pos = String(card?.positions?.[0] || card?.pos || 'SG').toUpperCase();
    const type = pos === 'PG' ? ['PLAYMAKING','AST','3PT'] : pos === 'C' ? ['REB','BLOCK','PAINT'] : pos === 'PF' ? ['REB','PAINT','DEFENSE'] : ['3PT','SCORING','CLUTCH'];
    return type;
  }

  function status(state, card) {
    const data = ensureState(state); const req = requirement(card); const key = shardKey(card);
    if (!req) return { eligible: false, reason: specialCard(card) ? 'SPECIAL CARD 不適用一般升階' : '已達最高階', shards: data.playerShards[key] || 0 };
    const shards = Math.max(0, Number(data.playerShards[key]) || 0);
    const tickets = Math.max(0, Number(data.tickets[req.ticket]) || 0);
    return { eligible: shards >= req.shards && tickets >= req.tickets, req, shards, tickets, missingShards: Math.max(0, req.shards - shards), missingTickets: Math.max(0, req.tickets - tickets) };
  }

  function promote(state, card) {
    const check = status(state, card);
    if (!check.eligible) return { ok: false, ...check };
    const data = ensureState(state); const req = check.req; const before = { rarity: card.currentRarity, ovr: card.ovr };
    data.playerShards[shardKey(card)] = check.shards - req.shards;
    data.tickets[req.ticket] = check.tickets - req.tickets;
    if (req.awakening) {
      card.currentRarity = 'UR';
      card.rarity = 'UR';
      card.promotionSpecialTheme = 'silver-black';
      card.promotionSpecialName = 'SILVER SIGNATURE';
      card.specialAwakenedAt = new Date().toISOString();
    } else {
      card.currentRarity = req.next;
      card.rarity = req.next;
    }
    card.promotionLevel += 1;
    card.promotionOvrBonus += req.ovr;
    const growth = growthWeights(card);
    growth.forEach((name, index) => { card.promotionStatBonuses[name] = (Number(card.promotionStatBonuses[name]) || 0) + Math.max(1, req.ovr - index); });
    ensureCard(card);
    return { ok: true, awakening: !!req.awakening, before, after: { rarity: req.awakening ? '銀黑特卡' : card.currentRarity, ovr: card.ovr }, growth: growth.map(name => ({ name, value: card.promotionStatBonuses[name] })) };
  }

  function importance(context) {
    const key = String(context?.type || context?.special || 'regular').toLowerCase();
    if (/finals|conference/.test(key)) return 4;
    if (/playoff/.test(key)) return 3;
    if (/cup/.test(key)) return 2;
    if (/rival|christmas|special/.test(key)) return 1;
    return 0;
  }

  function awardGame(state, cards, boxScore, context) {
    const data = ensureState(state); const rows = Array.isArray(boxScore) ? boxScore : []; const level = importance(context);
    const rewards = [];
    const rewardedPlayers = new Set();
    (cards || []).filter(Boolean).forEach(card => {
      ensureCard(card); if (specialCard(card)) return;
      const key = shardKey(card);
      if (rewardedPlayers.has(key)) return;
      const stat = rows.find(row => row?.cardId === card.cardId || row?.name === card.name);
      if (!stat) return;
      const performance = Number(stat.pts || 0) + Number(stat.ast || 0) * 1.4 + Number(stat.reb || 0) * 1.1 + Number(stat.stl || 0) * 2 + Number(stat.blk || 0) * 2;
      const base = 1 + (level >= 1 ? 1 : 0) + (level >= 3 ? 1 : 0);
      const bonus = performance >= 55 ? 3 : performance >= 40 ? 2 : performance >= 28 ? 1 : 0;
      const amount = base + bonus;
      rewardedPlayers.add(key);
      data.playerShards[key] = (Number(data.playerShards[key]) || 0) + amount;
      rewards.push({ cardId: card.cardId, player: card.name, shards: amount, bonus });
    });
    data.tickets.basic += 1;
    const progressKey = level >= 4 ? 'ur' : level >= 3 ? 'elite' : 'advanced';
    data.pity[progressKey] += 1;
    if (data.pity[progressKey] >= CONFIG.pityGoals[progressKey]) { data.tickets[progressKey] += 1; data.pity[progressKey] = 0; }
    if (level === 2) data.tickets.advanced += 1;
    if (level === 3) data.tickets.elite += 1;
    data.rewardHistory.push({ id: `promotion_${Date.now()}_${context?.game || 0}`, game: context?.game || 0, level, rewards, at: new Date().toISOString() });
    data.rewardHistory = data.rewardHistory.slice(-100);
    return rewards;
  }

  function renderGrowth(state, card) {
    ensureCard(card); const check = status(state, card); const data = ensureState(state);
    if (specialCard(card)) return '<p class="player-dossier-v2__empty">特殊卡保留原有成長路線，不使用一般升階。</p>';
    const req = check.req; const original = card.originalRarity || card.rarity;
    if (!req) return `<div class="tq-growth-max ${card.promotionSpecialTheme === 'silver-black' ? 'is-silver-black' : ''}"><b>${card.promotionSpecialTheme === 'silver-black' ? 'SILVER SIGNATURE' : 'MAX PROMOTION'}</b><strong>${safe(card.currentRarity)} · ${card.ovr} OVR</strong><span>原始階級：${safe(original)}</span></div>`;
    const pct = Math.min(100, Math.round(check.shards / req.shards * 100));
    const ticketNames = { basic:'基礎升階券', advanced:'進階升階券', elite:'菁英升階券', ur:'UR 升階券' };
    const nextLabel = req.awakening ? 'UR 銀黑特卡' : `${safe(req.next)} · ${Math.min((CONFIG.caps[original] || 99) + (req.awakening ? 1 : 0), card.ovr + req.ovr)} OVR`;
    return `<div class="tq-growth"><div class="tq-growth__route"><span><small>現在</small><b>${safe(card.currentRarity)} · ${card.ovr} OVR</b></span><i>→</i><span><small>下一階</small><b>${nextLabel}</b></span></div><div class="tq-growth__meter"><div><span>${safe(card.name)} 碎片</span><b>${check.shards} / ${req.shards}</b></div><i><em style="width:${pct}%"></em></i></div><div class="tq-growth__material"><span>${ticketNames[req.ticket]}</span><b>${check.tickets} / ${req.tickets}</b></div><button type="button" ${check.eligible ? '' : 'disabled'} onclick="promotePlayerCard('${safe(card.cardId)}')">${req.awakening ? '覺醒銀黑特卡' : '升階'}</button>${check.eligible ? '<small class="is-ready">素材已齊全，可以升階</small>' : `<small>還缺 ${check.missingShards ? `${check.missingShards} 個球員碎片` : ''}${check.missingShards && check.missingTickets ? '、' : ''}${check.missingTickets ? `${check.missingTickets} 張${ticketNames[req.ticket]}` : ''}</small>`}</div>`;
  }

  function renderGrowthSummary(state, card) {
    ensureCard(card);
    const check = status(state, card);
    if (specialCard(card)) return '<p class="player-dossier-v2__empty">此特殊卡使用專屬成長方式。</p>';
    if (!check.req) return `<div class="tq-growth-summary"><span>${card.promotionSpecialTheme === 'silver-black' ? '銀黑特卡' : '最高階'}</span><b>${safe(card.currentRarity)} · ${card.ovr} OVR</b></div>`;
    const pct = Math.min(100, Math.round(check.shards / check.req.shards * 100));
    return `<div class="tq-growth-summary"><div><span>${check.req.awakening ? '銀黑特卡覺醒' : `${safe(card.currentRarity)} → ${safe(check.req.next)}`}</span><b>${check.shards} / ${check.req.shards} 碎片</b></div><i><em style="width:${pct}%"></em></i><small>${check.eligible ? '素材已齊全' : '前往升階所查看缺少素材'}</small></div>`;
  }

  return { CONFIG, RARITIES, ensureState, ensureCard, specialCard, shardKey, requirement, status, promote, awardGame, renderGrowth, renderGrowthSummary, growthWeights };
});

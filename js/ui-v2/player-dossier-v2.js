(function (global) {
  'use strict';

  const DOSSIER_TABS = Object.freeze([
    { id: 'info', label: 'INFO' },
    { id: 'basic', label: 'BASIC' },
    { id: 'advanced', label: 'ADVANCED' },
    { id: 'badges', label: 'BADGES' },
    { id: 'career', label: 'CAREER' }
  ]);

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  }

  function isFiniteNumber(value) {
    return value !== '' && value !== null && typeof value !== 'undefined' && Number.isFinite(Number(value));
  }

  function displayValue(value, suffix = '') {
    if (value === '' || value === null || typeof value === 'undefined') return '--';
    if (typeof value === 'number' && !Number.isFinite(value)) return '--';
    return `${value}${suffix}`;
  }

  function getInventory() {
    return (typeof state !== 'undefined' && Array.isArray(state?.inventory)) ? state.inventory : [];
  }

  function samePlayer(a, b) {
    if (!a || !b) return false;
    if (a.cardId && b.cardId) return String(a.cardId) === String(b.cardId);
    if (a.nbaId && b.nbaId) return String(a.nbaId) === String(b.nbaId) && a.name === b.name && getCardEdition(a) === getCardEdition(b);
    return a.name === b.name && getCardEdition(a) === getCardEdition(b);
  }

  function resolvePlayer(identifier) {
    if (identifier && typeof identifier === 'object') return identifier;
    const inventory = getInventory();
    let player = inventory.find(card => card && String(card.cardId) === String(identifier));
    if (!player) player = inventory.find(card => card && card.name === identifier);
    if (!player && typeof NBA_PLAYERS !== 'undefined') {
      player = NBA_PLAYERS.find(card => card && (card.name === identifier || String(card.id) === String(identifier)));
    }
    return player || null;
  }

  function withReliableStats(player) {
    if (!player) return null;
    if (player.basic && player.advanced) return player;
    const preferredData = getCardEdition(player) === '25' && typeof TEAM_DATA_2025 !== 'undefined'
      ? TEAM_DATA_2025
      : (typeof TEAM_DATA_2026 !== 'undefined' ? TEAM_DATA_2026 : (typeof TEAM_DATA !== 'undefined' ? TEAM_DATA : null));
    if (!preferredData) return player;
    for (const team of Object.keys(preferredData)) {
      const match = preferredData[team].find(item => item.name === player.name || (item.id && String(item.id) === String(player.nbaId)));
      if (match) {
        return {
          ...match,
          ...player,
          team: player.team || team,
          basic: player.basic || match.basic || null,
          advanced: player.advanced || match.advanced || null,
          realOvr: player.realOvr || player.real_ovr || match.real_ovr || match.ovr
        };
      }
    }
    return player;
  }

  function positionsFor(player) {
    if (typeof global.getPlayerPositions === 'function') return global.getPlayerPositions(player);
    const raw = Array.isArray(player?.positions) ? player.positions : (Array.isArray(player?.pos) ? player.pos : [player?.pos]);
    return raw.filter(Boolean).map(item => String(item).toUpperCase());
  }

  function placementFor(player) {
    if (typeof state === 'undefined') return { label: '未上陣', slot: null, offPosition: false };
    const starters = state?.startingLineup || {};
    for (const slot of ['PG', 'SG', 'SF', 'PF', 'C']) {
      if (samePlayer(starters[slot], player)) {
        return { label: `先發 ${slot}`, slot, offPosition: !positionsFor(player).includes(slot) };
      }
    }
    const bench = Array.isArray(state?.benchLineup) ? state.benchLineup : [];
    const benchIndex = bench.findIndex(card => samePlayer(card, player));
    if (benchIndex >= 0) return { label: `替補 B${benchIndex + 1}`, slot: `B${benchIndex + 1}`, offPosition: false };
    return { label: '未上陣', slot: null, offPosition: false };
  }

  function moraleFor(player) {
    const value = Math.max(-1, Math.min(1, Number(player?.morale?.value || 0)));
    if (value > 0) return { icon: '🔥', label: '狀態火熱', value: '+1' };
    if (value < 0) return { icon: '🧊', label: '狀態不好', value: '-1' };
    return { icon: '➖', label: '狀態普通', value: '0' };
  }

  function basicStats(player) {
    const basic = player?.basic || {};
    const rebounds = isFiniteNumber(basic.ORB) && isFiniteNumber(basic.DRB)
      ? (Number(basic.ORB) + Number(basic.DRB)).toFixed(1)
      : (basic.TRB ?? basic.REB);
    return [
      ['PPG', basic.PTS], ['RPG', rebounds], ['APG', basic.AST], ['SPG', basic.STL],
      ['BPG', basic.BLK], ['FG%', basic['FG%']], ['3P%', basic['3P%']], ['FT%', basic['FT%']],
      ['GP', basic.GP ?? basic.G], ['MIN', basic.MIN ?? basic.MP]
    ];
  }

  function advancedStats(player) {
    const advanced = player?.advanced || {};
    const basic = player?.basic || {};
    const pick = (...keys) => {
      for (const key of keys) {
        if (advanced[key] !== null && typeof advanced[key] !== 'undefined') return advanced[key];
        if (basic[key] !== null && typeof basic[key] !== 'undefined') return basic[key];
      }
      return undefined;
    };
    return [
      ['TS%', pick('TS%')], ['eFG%', pick('eFG%')], ['USG%', pick('USG%')],
      ['AST%', pick('AST%')], ['TOV%', pick('TOV%')], ['TRB%', pick('TRB%', 'REB%')],
      ['ORB%', pick('ORB%')], ['DRB%', pick('DRB%')], ['STL%', pick('STL%')],
      ['BLK%', pick('BLK%')], ['PER', pick('PER')], ['WS', pick('WS')],
      ['BPM', pick('BPM')], ['VORP', pick('VORP')]
    ];
  }

  function numberFromPercent(value) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function archetypesFor(player, placement) {
    const basic = player?.basic || {};
    const advanced = player?.advanced || {};
    const tags = [];
    const ts = numberFromPercent(advanced['TS%']);
    const usg = numberFromPercent(advanced['USG%']);
    const astPct = numberFromPercent(advanced['AST%']);
    const tovPct = numberFromPercent(advanced['TOV%']);
    const threePct = numberFromPercent(basic['3P%']);
    const trbPct = numberFromPercent(advanced['TRB%']);
    if (ts !== null && ts >= 60 && usg !== null && usg < 24) tags.push('EFFICIENT SCORER');
    if (usg !== null && usg >= 28 && Number(basic.PTS || 0) >= 24) tags.push('SCORING ENGINE');
    if (astPct !== null && astPct >= 30 && (tovPct === null || tovPct < 18)) tags.push('FLOOR GENERAL');
    if (threePct !== null && threePct >= 38 && Number(basic['3PA'] || 0) >= 4.5) tags.push('SHARPSHOOTER');
    if (Number(basic.BLK || 0) >= 1.5) tags.push('RIM PROTECTOR');
    if (trbPct !== null && trbPct >= 15) tags.push('GLASS CLEANER');
    if (String(placement?.slot || '').startsWith('B')) tags.push('SIXTH MAN');
    return [...new Set(tags)].slice(0, 2);
  }

  function statGrid(items, className = '') {
    return `<div class="player-dossier-v2__stat-grid ${className}">${items.map(([label, value]) => `
      <div class="player-dossier-v2__stat">
        <strong>${escapeHtml(displayValue(value))}</strong><span>${escapeHtml(label)}</span>
      </div>`).join('')}</div>`;
  }

  function seasonStatsSourceNote(player, fallbackText) {
    if (player?.statsSeason !== '2025-26' || player?.statsSource?.name !== 'Sports Reference') {
      return fallbackText;
    }
    const sourceUrl = player.statsSource.url || 'https://www.basketball-reference.com/';
    return `2025-26 賽季資料：<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">Sports Reference</a>`;
  }

  function careerProgress(legacy) {
    const major = Number(legacy.mvps || 0) + Number(legacy.fmvps || 0) + Number(legacy.dpoys || 0) + Number(legacy.records || 0);
    const checks = [
      ['SEASONS', Number(legacy.seasons || 0), 8],
      ['GAMES', Number(legacy.games || 0), 400],
      ['CHAMPION', Number(legacy.rings || 0), 1],
      ['MAJOR HONOR', major, 1]
    ];
    const percent = Math.round(checks.reduce((sum, item) => sum + Math.min(1, item[1] / item[2]), 0) / checks.length * 100);
    return `<div class="player-dossier-v2__legend-progress">
      <div><span>FRANCHISE LEGEND</span><strong>${percent}%</strong></div>
      <div class="player-dossier-v2__progress"><i style="width:${percent}%"></i></div>
      <p>${checks.map(([label, value, goal]) => `${label} ${value}/${goal}`).join(' · ')}</p>
    </div>`;
  }

  function renderInfo(player, placement) {
    const positions = positionsFor(player);
    const primary = positions[0] || '--';
    const secondary = positions.slice(1).join('/') || '--';
    const morale = moraleFor(player);
    const archetypes = archetypesFor(player, placement);
    return `<div class="player-dossier-v2__info-list">
      <div><span>TEAM</span><strong>${escapeHtml(player.team || '--')}</strong></div>
      <div><span>PRIMARY</span><strong>${escapeHtml(primary)}</strong></div>
      <div><span>SECONDARY</span><strong>${escapeHtml(secondary)}</strong></div>
      <div><span>CURRENT</span><strong>${escapeHtml(placement.label)}</strong></div>
      <div><span>CARD OVR</span><strong>${escapeHtml(player.ovr ?? player.baseOvr ?? '--')}</strong></div>
      <div><span>POWER RATING</span><strong>${escapeHtml(player.realOvr ?? player.real_ovr ?? '--')}</strong></div>
      <div><span>RARITY / STAR</span><strong>${escapeHtml(player.rarity || '--')} · ${'★'.repeat(Math.max(1, Number(player.stars || 1)))}</strong></div>
      <div><span>MORALE</span><strong>${morale.icon} ${morale.label} ${morale.value}</strong></div>
    </div>
    ${placement.offPosition ? '<p class="player-dossier-v2__warning">⚠ 錯位 -5 OVR</p>' : ''}
    ${archetypes.length ? `<div class="player-dossier-v2__archetypes">${archetypes.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : '<p class="player-dossier-v2__empty">累積更多賽季數據後會產生球員定位標籤。</p>'}`;
  }

  function renderBadges(player) {
    const badges = typeof getPlayerBadges === 'function' ? getPlayerBadges(player) : [];
    const journey = player?.badgeJourney || {};
    const moments = Array.isArray(journey.moments) ? journey.moments : [];
    return `<div class="player-dossier-v2__journey">
      <div><span>BADGE LEVEL</span><strong>${escapeHtml(journey.mastery || 'Bronze')}</strong></div>
      <div><span>TRIGGER COUNT</span><strong>${Number(journey.triggers || 0)}</strong></div>
      <div><span>MOMENTS</span><strong>${moments.length}</strong></div>
    </div>
    <div class="player-dossier-v2__badges">${badges.length
      ? badges.map(badge => `<span title="${escapeHtml(badge.condition || '')}">${escapeHtml(badge.icon || '🏅')} ${escapeHtml(badge.name)}</span>`).join('')
      : '<p>尚未取得球員徽章</p>'}</div>
    <div class="player-dossier-v2__moments">${moments.length
      ? moments.slice(-4).map(moment => `<span>✓ ${escapeHtml(String(moment).split(':').pop())}</span>`).join('')
      : '<span>??? · 在重要回合中探索 Badge Moment</span>'}</div>`;
  }

  function renderCareer(player) {
    const legacy = player?.legacy || {};
    const items = [
      ['GAMES', legacy.games || 0], ['TOTAL PTS', legacy.pts || 0], ['SEASONS', legacy.seasons || 0],
      ['CHAMPION', legacy.rings || 0], ['MVP', legacy.mvps || 0], ['FMVP', legacy.fmvps || (player.isFmvp ? 1 : 0)]
    ];
    return `${statGrid(items, 'player-dossier-v2__stat-grid--career')}${careerProgress(legacy)}`;
  }

  function renderPlayerDossierBack(inputPlayer) {
    const player = withReliableStats(inputPlayer) || {};
    const placement = placementFor(player);
    const positions = positionsFor(player).join('/') || '--';
    return `<div class="player-dossier-v2" onclick="event.stopPropagation()">
      <header class="player-dossier-v2__header">
        <div><span>PLAYER DOSSIER</span><strong>${escapeHtml(typeof getCardDisplayName === 'function' ? getCardDisplayName(player) : (player.name || 'PLAYER'))}</strong><small>${escapeHtml(player.team || '--')} · ${escapeHtml(positions)} · ${escapeHtml(placement.label)}</small></div>
        <b>${escapeHtml(player.ovr ?? player.baseOvr ?? '--')}<small>OVR</small></b>
      </header>
      <nav class="player-dossier-v2__tabs" aria-label="球員資訊分頁">
        ${DOSSIER_TABS.map((tab, index) => `<button type="button" class="${index === 0 ? 'is-active' : ''}" data-dossier-tab="${tab.id}" onclick="switchPlayerDossierPanel(event,this,'${tab.id}')">${tab.label}</button>`).join('')}
      </nav>
      <div class="player-dossier-v2__body">
        <section class="player-dossier-v2__panel is-active" data-dossier-panel="info">${renderInfo(player, placement)}</section>
        <section class="player-dossier-v2__panel" data-dossier-panel="basic">${statGrid(basicStats(player))}<p class="player-dossier-v2__note">${seasonStatsSourceNote(player, '賽季基礎數據；沒有可靠來源的欄位顯示 --。')}</p></section>
        <section class="player-dossier-v2__panel" data-dossier-panel="advanced">${statGrid(advancedStats(player), 'player-dossier-v2__stat-grid--advanced')}<p class="player-dossier-v2__note">${seasonStatsSourceNote(player, '只顯示現有比賽資料可可靠提供的指標。')}</p></section>
        <section class="player-dossier-v2__panel" data-dossier-panel="badges">${renderBadges(player)}</section>
        <section class="player-dossier-v2__panel" data-dossier-panel="career">${renderCareer(player)}</section>
      </div>
      <button type="button" class="player-dossier-v2__front-button" onclick="flipPlayerDossierToFront(event,this)">↶ CARD FRONT</button>
    </div>`;
  }

  function installPlayerDetailAdapter() {
    const previous = global.showPlayerDetails;
    if (typeof previous !== 'function' || previous.__playerDossierV2Wrapped) return;
    const wrapped = function (event, identifier) {
      const result = previous.call(this, event, identifier);
      const player = withReliableStats(resolvePlayer(identifier));
      const mount = document.getElementById('cardV2DetailMount');
      if (!player || !mount) return result;
      const isSpecial = !!player.designId && player.designId !== 'normal-rarity-v2';
      if (!isSpecial && typeof global.renderNormalCardV2 === 'function') {
        mount.innerHTML = `${global.renderNormalCardV2(player, { size: 'detail' })}<p class="card-v2__flip-hint">點一下卡片查看 INFO、數據、徽章與生涯；Achievement Back 在下方 BACKS 收藏區。</p>`;
        mount.classList.remove('hidden');
      }
      document.getElementById('playerDetailModal')?.classList.add('player-detail-v2-active');
      return result;
    };
    wrapped.__playerDossierV2Wrapped = true;
    wrapped.__legacy = previous;
    global.showPlayerDetails = wrapped;
  }

  global.renderPlayerDossierBack = renderPlayerDossierBack;
  global.switchPlayerDossierPanel = function (event, button, panelId) {
    event?.stopPropagation();
    const dossier = button?.closest('.player-dossier-v2');
    if (!dossier) return;
    dossier.querySelectorAll('[data-dossier-tab]').forEach(tab => tab.classList.toggle('is-active', tab.dataset.dossierTab === panelId));
    dossier.querySelectorAll('[data-dossier-panel]').forEach(panel => panel.classList.toggle('is-active', panel.dataset.dossierPanel === panelId));
  };
  global.flipPlayerDossierToFront = function (event, button) {
    event?.stopPropagation();
    const cardElement = button?.closest('.card-v2, .normal-card-v2');
    if (!cardElement || cardElement.classList.contains('is-flipping')) return;
    if (typeof global.performStableCardFlip === 'function') {
      global.performStableCardFlip(cardElement, cardElement.classList.contains('card-v2') ? 540 : 520);
    } else {
      cardElement.classList.remove('is-flipped');
    }
  };

  // Season Journey and the special-card adapter finish their own wrappers on
  // DOMContentLoaded. Register after them so the dossier remains the final UI
  // adapter and a normal card mount is not hidden again by the Kobe adapter.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installPlayerDetailAdapter, { once: true });
  } else {
    installPlayerDetailAdapter();
  }
})(window);

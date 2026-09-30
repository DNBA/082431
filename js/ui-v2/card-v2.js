(function () {
  'use strict';

  const KOBE_CARD_V2_PROTOTYPE_PLAYER = Object.freeze({
    careerIdentity: 'nba:977',
    nbaId: 977,
    name: 'Kobe Bryant',
    edition: '10',
    team: 'LAL',
    positions: ['SG'],
    ovr: 98,
    baseOvr: 98,
    realOvr: 97,
    real_ovr: 97,
    rarity: 'UR',
    designId: 'mamba-signature-v1',
    stars: 5,
    legacy: null,
    achievementBacks: [],
    activeCardBack: null
  });

  // Design data is intentionally separate from player/career data.
  const KOBE_CARD_V2_DESIGN = Object.freeze({
    id: 'kobe-mamba-prototype-v2',
    themeId: 'mamba',
    playerArt: './assets/cards/player-art/kobe-mamba-v1.png',
    secondaryPortrait: 'https://cdn.nba.com/headshots/nba/latest/1040x760/977.png',
    signatureLabel: 'Mamba\nMentality',
    signatureIcon: '◆',
    rarityLabel: 'LEGENDARY',
    brandLabel: 'TOEICQUEST',
    displayName: { first: 'KOBE', last: 'BRYANT' }
  });

  const FALLBACK_PLAYER_ART = './assets/players/featured-placeholder.svg';

  function safeText(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function safeAttribute(value) {
    return safeText(value).replaceAll('`', '&#096;');
  }

  function isKobe(player) {
    return !!player && player.designId === 'mamba-signature-v1';
  }

  function getPlayerArtUrl(player, design) {
    if (design.playerArt) return design.playerArt;
    if (typeof getPlayerImgUrl === 'function' && player?.nbaId) return getPlayerImgUrl(player.nbaId);
    return FALLBACK_PLAYER_ART;
  }

  function getSecondaryPortraitUrl(player, design, playerArtUrl) {
    return design.secondaryPortrait || playerArtUrl || getPlayerArtUrl(player, design);
  }

  function getDisplayName(player, design) {
    const edition = typeof getCardEdition === 'function' ? getCardEdition(player) : '25';
    if (design.displayName?.first && design.displayName?.last) {
      return { first: design.displayName.first, last: `${design.displayName.last} ('${edition})` };
    }
    const cleanName = String(typeof getCardDisplayName === 'function' ? getCardDisplayName(player) : (player?.name || 'PLAYER')).trim();
    const parts = cleanName.split(/\s+/);
    return {
      first: (parts.shift() || 'PLAYER').toUpperCase(),
      last: (parts.join(' ') || '').toUpperCase()
    };
  }

  function getPosition(player) {
    const positions = Array.isArray(player?.positions) ? player.positions : player?.pos;
    return Array.isArray(positions) ? (positions[0] || 'SG') : (positions || 'SG');
  }

  function getCardBackData(player) {
    const ownedBacks = Array.isArray(player?.achievementBacks) ? player.achievementBacks : [];
    const active = ownedBacks.find(back => back && back.id === player?.activeCardBack);
    const iconMap = {
      champion: '💍', fmvp: '🏆', mvp: '👑', dpoy: '🛡️',
      record: '⚡', record_breaker: '⚡', franchise_legend: '🏟️', legend: '🏟️'
    };
    if (active) {
      return {
        title: active.name || String(active.id || 'ACHIEVEMENT').replaceAll('_', ' '),
        icon: active.icon || iconMap[active.id] || '🏆',
        meta: active.description || active.achievement || active.season || 'ACHIEVEMENT CARD BACK'
      };
    }
    return {
      title: 'LEGENDARY',
      icon: '♛',
      meta: 'BASE DISPLAY BACK · FRONT ART KEPT SEPARATE'
    };
  }

  function renderCardV2(player, design = {}, options = {}) {
    const mergedDesign = { ...KOBE_CARD_V2_DESIGN, ...design };
    const theme = window.CardThemeRegistry?.get(mergedDesign.themeId) || window.CARD_THEMES?.base || {};
    const displayName = getDisplayName(player, mergedDesign);
    const playerArtUrl = getPlayerArtUrl(player, mergedDesign);
    const secondaryPortraitUrl = getSecondaryPortraitUrl(player, mergedDesign, playerArtUrl);
    const size = options.size || 'collection';
    const context = options.context || 'prototype';
    const cardId = player?.cardId || '';
    const ovr = Number(options.displayOvr ?? player?.ovr ?? player?.baseOvr ?? 98);
    const position = options.displayPosition || getPosition(player);
    const team = options.displayTeam || player?.team || 'LAL';
    const rarityLabel = mergedDesign.rarityLabel || theme.rarityLabel || player?.rarity || 'LEGENDARY';
    const signatureLines = String(mergedDesign.signatureLabel || '').split('\n').map(safeText).join('<br>');
    const secondaryEnabled = theme.secondaryPortrait?.enabled !== false;
    const secondaryOpacity = Number(theme.secondaryPortrait?.opacity ?? 0.24);
    const frameLayer = theme.frame
      ? `<img class="card-v2__layer card-v2__frame" src="${safeAttribute(theme.frame)}" alt="" aria-hidden="true" onerror="handleCardV2ImageError(this, 'frame')">`
      : '';
    const backgroundLayer = theme.background
      ? `<img class="card-v2__layer card-v2__background" src="${safeAttribute(theme.background)}" alt="" aria-hidden="true">`
      : `<div class="card-v2__layer card-v2__background"></div>`;
    const inventoryActions = context === 'inventory' && cardId
      ? `<button type="button" class="card-v2__detail-button" title="查看數據" aria-label="查看 ${safeAttribute(`${displayName.first} ${displayName.last}`)} 數據" onclick="showPlayerDetails(event, '${safeAttribute(cardId)}')">↗</button>`
      : '';
    const dragAttrs = context === 'inventory' && cardId
      ? `draggable="true" ondragstart="handleCardDragStart(event, '${safeAttribute(cardId)}')"`
      : '';

    return `
      <article class="card-v2 card-v2--${safeAttribute(size)} ${safeAttribute(theme.className || '')} card-v2--interactive"
               data-card-v2-context="${safeAttribute(context)}"
               data-card-id="${safeAttribute(cardId)}"
               style="--secondary-opacity:${secondaryOpacity}"
               ${dragAttrs}
               onclick="handleCardV2Click(event, this)"
               aria-label="${safeAttribute(displayName.first)} ${safeAttribute(displayName.last)} ${ovr} ${safeAttribute(position)} 卡片">
        <div class="card-v2__inner">
          <section class="card-v2__face card-v2__front" aria-label="卡片正面">
            ${backgroundLayer}
            ${secondaryEnabled ? `<img class="card-v2__layer card-v2__secondary-portrait" src="${safeAttribute(secondaryPortraitUrl)}" alt="" aria-hidden="true" onerror="handleCardV2ImageError(this, 'portrait')">` : ''}
            <div class="card-v2__layer card-v2__atmosphere" aria-hidden="true"></div>
            <img class="card-v2__layer card-v2__player-art" src="${safeAttribute(playerArtUrl)}" alt="${safeAttribute(player?.name || 'Player')}" onerror="handleCardV2ImageError(this, 'player')">
            <div class="card-v2__layer card-v2__fallback-frame" aria-hidden="true"></div>
            ${frameLayer}

            <div class="card-v2__layer card-v2__rating" aria-label="OVR ${ovr}, ${safeAttribute(position)}">
              <span class="card-v2__rating-value">${ovr}</span>
              <span class="card-v2__rating-position">${safeText(position)}</span>
            </div>

            <div class="card-v2__layer card-v2__brand" aria-hidden="true">
              <span class="card-v2__brand-crown">♛</span>${safeText(mergedDesign.brandLabel || 'TOEICQUEST')}
            </div>

            <div class="card-v2__layer card-v2__signature" aria-label="${safeAttribute(mergedDesign.signatureLabel || '')}">
              ${signatureLines}<span class="card-v2__signature-icon">${safeText(mergedDesign.signatureIcon || '')}</span>
            </div>

            <div class="card-v2__layer card-v2__nameplate">
              <span class="card-v2__first-name">${safeText(displayName.first)}</span>
              <span class="card-v2__last-name">${safeText(displayName.last)}</span>
              <span class="card-v2__team">${safeText(team)}</span>
            </div>

            <div class="card-v2__layer card-v2__rarity">${safeText(rarityLabel)}</div>
            ${inventoryActions}
            <div class="card-v2__layer card-v2__shine" aria-hidden="true"></div>
          </section>

          <section class="card-v2__face card-v2__back" aria-label="球員資訊背面">
            ${typeof window.renderPlayerDossierBack === 'function'
              ? window.renderPlayerDossierBack(player)
              : '<div class="card-v2__back-content"><strong class="card-v2__back-title">PLAYER INFO</strong><span class="card-v2__back-meta">球員資料載入中</span></div>'}
          </section>
        </div>
      </article>`;
  }

  function getOwnedKobe() {
    const inventory = (typeof state !== 'undefined' && Array.isArray(state?.inventory)) ? state.inventory : [];
    return inventory.find(isKobe) || null;
  }

  function getKobePrototypePlayer() {
    const owned = getOwnedKobe();
    if (!owned) return { ...KOBE_CARD_V2_PROTOTYPE_PLAYER };
    // Clone only: the 98 prototype presentation never writes into save data.
    return {
      ...owned,
      name: 'Kobe Bryant',
      edition: '10',
      team: 'LAL',
      positions: ['SG'],
      ovr: 98,
      baseOvr: 98,
      nbaId: owned.nbaId || 977
    };
  }

  function renderKobeCardV2Showcase() {
    const mount = document.getElementById('cardV2CollectionPreview');
    if (!mount) return;
    mount.innerHTML = renderCardV2(getKobePrototypePlayer(), KOBE_CARD_V2_DESIGN, {
      size: 'collection',
      context: 'prototype',
      displayOvr: 98,
      displayPosition: 'SG',
      displayTeam: 'LAL'
    });
  }

  function renderKobeCardV2Detail(player) {
    const mount = document.getElementById('cardV2DetailMount');
    if (!mount) return;
    if (!isKobe(player)) {
      mount.classList.add('hidden');
      mount.innerHTML = '';
      return;
    }
    mount.innerHTML = `${renderCardV2(player, KOBE_CARD_V2_DESIGN, {
      size: 'detail',
      context: 'detail',
      displayOvr: player.ovr || 98,
      displayPosition: getPosition(player),
      displayTeam: player.team || 'LAL'
    })}<p class="card-v2__flip-hint">點一下卡片查看球員資訊；Achievement Back 已移至下方 BACKS 收藏區。</p>`;
    mount.classList.remove('hidden');
  }

  function installKobeInventoryRenderer() {
    const legacyRenderer = window.renderPlayerCard;
    if (typeof legacyRenderer !== 'function' || legacyRenderer.__cardV2Wrapped) return;

    const wrappedRenderer = function (player, options = {}) {
      if (!isKobe(player)) return legacyRenderer(player, options);
      return renderCardV2(player, KOBE_CARD_V2_DESIGN, {
        size: 'inventory',
        context: 'inventory',
        displayOvr: player.ovr || player.baseOvr || 98,
        displayPosition: getPosition(player),
        displayTeam: player.team || 'LAL'
      });
    };
    wrappedRenderer.__cardV2Wrapped = true;
    wrappedRenderer.__legacy = legacyRenderer;
    window.renderPlayerCard = wrappedRenderer;
  }

  function installPlayerDetailAdapter() {
    const legacyShowPlayerDetails = window.showPlayerDetails;
    if (typeof legacyShowPlayerDetails !== 'function' || legacyShowPlayerDetails.__cardV2Wrapped) return;

    const wrappedShowPlayerDetails = function (event, playerIdentifier) {
      const result = legacyShowPlayerDetails.call(this, event, playerIdentifier);
      let player = null;
      if (playerIdentifier && typeof playerIdentifier === 'object') {
        player = playerIdentifier;
      } else if (typeof playerIdentifier === 'string') {
        const inventory = (typeof state !== 'undefined' && Array.isArray(state?.inventory)) ? state.inventory : [];
        player = inventory.find(card => card && (String(card.cardId) === playerIdentifier || card.name === playerIdentifier)) || null;
      }
      renderKobeCardV2Detail(player);
      return result;
    };
    wrappedShowPlayerDetails.__cardV2Wrapped = true;
    wrappedShowPlayerDetails.__legacy = legacyShowPlayerDetails;
    window.showPlayerDetails = wrappedShowPlayerDetails;
  }

  window.handleCardV2ImageError = function (image, type) {
    if (!image) return;
    if (type === 'frame') {
      image.hidden = true;
      return;
    }
    if (type === 'portrait') {
      image.hidden = true;
      return;
    }
    if (image.dataset.fallbackApplied) {
      image.hidden = true;
      return;
    }
    image.dataset.fallbackApplied = 'true';
    image.src = FALLBACK_PLAYER_ART;
  };

  window.handleCardV2Click = function (event, cardElement) {
    if (!cardElement || event.target.closest('button')) return;
    const context = cardElement.dataset.cardV2Context;
    if (context === 'detail') {
      if (cardElement.classList.contains('is-flipped') && event.target.closest('.player-dossier-v2')) return;
      cardElement.classList.toggle('is-flipped');
      return;
    }
    if (context === 'inventory') {
      const cardId = cardElement.dataset.cardId;
      if (cardId && typeof handleInventoryCardClick === 'function') handleInventoryCardClick(cardId);
      return;
    }
    window.openKobeCardV2Prototype(event);
  };

  window.openKobeCardV2Prototype = function (event) {
    if (event) event.stopPropagation();
    const prototypePlayer = getKobePrototypePlayer();
    if (typeof window.showPlayerDetails === 'function') {
      window.showPlayerDetails(event, prototypePlayer);
    }
  };

  window.renderCardV2 = renderCardV2;
  window.KOBE_CARD_V2_DESIGN = KOBE_CARD_V2_DESIGN;

  function initCardV2() {
    installKobeInventoryRenderer();
    installPlayerDetailAdapter();
    renderKobeCardV2Showcase();
    if (typeof renderInventory === 'function') renderInventory();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCardV2, { once: true });
  else initCardV2();
})();

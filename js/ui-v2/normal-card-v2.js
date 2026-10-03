(function (global) {
  'use strict';

  const FRAME_ROOT = './assets/cards/frames';
  const ARENA_BACKGROUND = './assets/cards/backgrounds/normal-arena-v1.png';
  const FALLBACK_PLAYER = './assets/players/featured-placeholder.svg';

  const NORMAL_CARD_THEMES = Object.freeze({
    N:   { frame: `${FRAME_ROOT}/normal-n-v1.png`,   accent: '#aab0b7', label: 'N',   name: 'NORMAL' },
    R:   { frame: `${FRAME_ROOT}/normal-r-v1.png`,   accent: '#d58a4a', label: 'R',   name: 'RARE' },
    SR:  { frame: `${FRAME_ROOT}/normal-sr-v1.png`,  accent: '#e3e7eb', label: 'SR',  name: 'SUPER RARE' },
    SSR: { frame: `${FRAME_ROOT}/normal-ssr-v1.png`, accent: '#f1c64d', label: 'SSR', name: 'SUPER RARE' },
    UR:  { frame: `${FRAME_ROOT}/normal-ur-v1.png`,  accent: '#ff4aa7', label: 'UR',  name: 'ULTRA RARE' }
  });

  const TEAM_IDS = Object.freeze({
    ATL:1610612737, BOS:1610612738, BKN:1610612751, CHA:1610612766, CHI:1610612741,
    CLE:1610612739, DAL:1610612742, DEN:1610612743, DET:1610612765, GSW:1610612744,
    HOU:1610612745, IND:1610612754, LAC:1610612746, LAL:1610612747, MEM:1610612763,
    MIA:1610612748, MIL:1610612749, MIN:1610612750, NOP:1610612740, NYK:1610612752,
    OKC:1610612760, ORL:1610612753, PHI:1610612755, PHX:1610612756, POR:1610612757,
    SAC:1610612758, SAS:1610612759, TOR:1610612761, UTA:1610612762, WAS:1610612764
  });

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  }

  function getTheme(card) {
    return NORMAL_CARD_THEMES[String(card?.rarity || 'N').toUpperCase()] || NORMAL_CARD_THEMES.N;
  }

  function getNameParts(name) {
    const clean = String(name || 'PLAYER').trim();
    const parts = clean.split(/\s+/);
    if (parts.length === 1) return { first: '', last: parts[0].toUpperCase() };
    return { first: parts.shift().toUpperCase(), last: parts.join(' ').toUpperCase() };
  }

  function playerImage(card) {
    return typeof getPlayerImgUrl === 'function' && card?.nbaId ? getPlayerImgUrl(card.nbaId) : FALLBACK_PLAYER;
  }

  function teamLogo(card) {
    const id = TEAM_IDS[String(card?.team || '').toUpperCase()];
    return id ? `https://cdn.nba.com/logos/nba/${id}/primary/L/logo.svg` : '';
  }

  function resolveDossierPlayer(cardElement) {
    if (!cardElement) return null;
    const cardId = cardElement.dataset.cardId;
    const playerName = cardElement.dataset.playerName;
    const nbaId = cardElement.dataset.nbaId;
    const inventory = (typeof state !== 'undefined' && Array.isArray(state?.inventory)) ? state.inventory : [];
    let player = inventory.find(card => card && cardId && String(card.cardId) === String(cardId));
    if (!player && playerName) player = inventory.find(card => card && card.name === playerName);
    if (!player && typeof NBA_PLAYERS !== 'undefined') {
      player = NBA_PLAYERS.find(card => card && (
        (nbaId && String(card.nbaId || card.id) === String(nbaId)) || card.name === playerName
      ));
    }
    return player || null;
  }

  global.ensurePlayerDossierMounted = function (cardElement) {
    const mount = cardElement?.querySelector('[data-player-dossier-mount]');
    if (!mount) return false;
    if (mount.dataset.dossierMounted === 'true' && mount.querySelector('.player-dossier-v2')) return true;
    if (typeof global.renderPlayerDossierBack !== 'function') {
      const attempts = Number(mount.dataset.hydrateAttempts || 0);
      if (mount.dataset.hydrateQueued !== 'true' && attempts < 20) {
        mount.dataset.hydrateQueued = 'true';
        mount.dataset.hydrateAttempts = String(attempts + 1);
        setTimeout(() => {
          mount.dataset.hydrateQueued = 'false';
          global.ensurePlayerDossierMounted(cardElement);
        }, 50);
      }
      return false;
    }
    const player = resolveDossierPlayer(cardElement);
    if (!player) return false;
    mount.innerHTML = global.renderPlayerDossierBack(player);
    mount.dataset.dossierMounted = 'true';
    return true;
  };

  global.performStableCardFlip = function (cardElement, durationMs) {
    if (!cardElement || cardElement.classList.contains('is-flipping')) return false;
    const flippingToBack = !cardElement.classList.contains('is-flipped');
    if (flippingToBack) global.ensurePlayerDossierMounted(cardElement);
    cardElement.classList.add('is-flipping');
    cardElement.classList.toggle('is-flipped');
    window.setTimeout(() => cardElement.classList.remove('is-flipping'), durationMs);
    return true;
  };

  function renderNormalCardV2(card, options = {}) {
    const theme = getTheme(card);
    const displayName = typeof getCardDisplayName === 'function' ? getCardDisplayName(card) : card?.name;
    const names = getNameParts(displayName);
    const positions = typeof formatPlayerPositions === 'function'
      ? formatPlayerPositions(card)
      : (Array.isArray(card?.positions) ? card.positions.join('/') : 'PG');
    const size = options.size || 'inventory';
    const cardId = card?.cardId || '';
    const interactive = options.interactive !== false;
    const logo = teamLogo(card);
    const inLineup = options.inLineup ? '<span class="normal-card-v2__lineup">LINEUP</span>' : '';
    const nameLengthClass = names.last.length > 18
      ? 'normal-card-v2__nameplate--xlong'
      : (names.last.length > 12 ? 'normal-card-v2__nameplate--long' : '');
    const front = `
        <img class="normal-card-v2__arena" src="${ARENA_BACKGROUND}" alt="" aria-hidden="true" onerror="this.hidden=true">
        <div class="normal-card-v2__portrait-window">
          <img class="normal-card-v2__portrait" src="${escapeHtml(playerImage(card))}" alt="${escapeHtml(displayName)}"
               onerror="this.onerror=null;this.src='${FALLBACK_PLAYER}'">
        </div>
        <div class="normal-card-v2__vignette" aria-hidden="true"></div>
        <img class="normal-card-v2__frame" src="${escapeHtml(theme.frame)}" alt="" aria-hidden="true" onerror="this.hidden=true">
        <div class="normal-card-v2__rating"><strong>${Number(card?.ovr || card?.baseOvr || 0)}</strong><span>${escapeHtml(positions)}</span></div>
        <div class="normal-card-v2__rarity"><strong>${escapeHtml(theme.label)}</strong><span>${escapeHtml(theme.name)}</span></div>
        <div class="normal-card-v2__nameplate ${nameLengthClass}"><span>${escapeHtml(names.first)}</span><strong>${escapeHtml(names.last)}</strong></div>
        <div class="normal-card-v2__team-mark">
          ${logo ? `<img src="${logo}" alt="${escapeHtml(card?.team)}" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden>${escapeHtml(card?.team)}</span>` : `<span>${escapeHtml(card?.team || '--')}</span>`}
        </div>
        ${inLineup}
        ${cardId && size !== 'detail' && interactive ? `<button type="button" class="normal-card-v2__detail" aria-label="查看 ${escapeHtml(displayName)} 球員資訊" onclick="showPlayerDetails(event, '${escapeHtml(cardId)}')">i</button>` : ''}`;

    if (size === 'detail') {
      return `
        <article class="normal-card-v2 normal-card-v2--detail normal-card-v2--${escapeHtml(theme.label.toLowerCase())}"
                 style="--normal-card-accent:${theme.accent}"
                 data-card-id="${escapeHtml(cardId)}"
                 data-player-name="${escapeHtml(card?.name || '')}"
                 data-nba-id="${escapeHtml(card?.nbaId || card?.id || '')}"
                 onclick="handleNormalCardV2Flip(event, this)"
                 aria-label="${escapeHtml(displayName)} 球員卡與球員資訊">
          <div class="normal-card-v2__inner">
            <section class="normal-card-v2__face normal-card-v2__front">${front}</section>
            <section class="normal-card-v2__face normal-card-v2__back" aria-label="球員資訊背面"><div class="player-dossier-v2-mount" data-player-dossier-mount data-dossier-mounted="false" aria-live="polite"></div></section>
          </div>
        </article>`;
    }

    return `
      <article class="normal-card-v2 normal-card-v2--${escapeHtml(size)} normal-card-v2--${escapeHtml(theme.label.toLowerCase())}"
               style="--normal-card-accent:${theme.accent}"
               data-card-id="${escapeHtml(cardId)}"
               draggable="${cardId && interactive ? 'true' : 'false'}"
               ${cardId && interactive ? `ondragstart="handleCardDragStart(event, '${escapeHtml(cardId)}')"` : ''}
               onclick="${cardId && interactive ? `handleInventoryCardClick('${escapeHtml(cardId)}')` : ''}"
               aria-label="${escapeHtml(displayName)} ${Number(card?.ovr || card?.baseOvr || 0)} ${escapeHtml(positions)} ${escapeHtml(theme.name)}">
        ${front}
      </article>`;
  }

  function install() {
    const legacy = global.renderPlayerCard;
    if (typeof legacy !== 'function' || legacy.__normalCardV2Wrapped) return;
    const wrapped = function (player, options = {}) {
      if (player?.designId && player.designId !== 'normal-rarity-v2') return legacy(player, options);
      return renderNormalCardV2(player, { ...options, size: 'inventory' });
    };
    wrapped.__normalCardV2Wrapped = true;
    wrapped.__legacy = legacy;
    global.renderPlayerCard = wrapped;
  }

  global.NORMAL_CARD_THEMES = NORMAL_CARD_THEMES;
  global.renderNormalCardV2 = renderNormalCardV2;
  global.handleNormalCardV2Flip = function (event, cardElement) {
    if (!cardElement || event.target.closest('button')) return;
    if (cardElement.classList.contains('is-flipping')) return;
    if (cardElement.classList.contains('is-flipped') && event.target.closest('.player-dossier-v2')) return;
    global.performStableCardFlip(cardElement, 520);
  };
  install();
  if (typeof global.renderInventory === 'function') global.renderInventory();
})(window);

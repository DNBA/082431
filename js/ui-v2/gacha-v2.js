(function (global) {
  'use strict';

  const PACK_ART = './assets/packs/season-one-pack-v2.png';

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  }

  function displayName(card) {
    return typeof getCardDisplayName === 'function' ? getCardDisplayName(card) : String(card?.name || 'PLAYER');
  }

  function rarityClass(card) {
    return `is-${String(card?.rarity || 'N').toLowerCase()}`;
  }

  function renderGachaV2Surface() {
    const ticket = document.getElementById('gachaV2TicketCount');
    if (ticket && typeof state !== 'undefined') ticket.textContent = state.isAdmin ? '∞' : String(state.tickets || 0);
    const featured = document.getElementById('gachaV2FeaturedPlayers');
    if (!featured || typeof NBA_PLAYERS === 'undefined') return;
    const players = [...NBA_PLAYERS]
      .filter(player => player.rarity === 'UR')
      .sort((a, b) => Number(b.ovr || 0) - Number(a.ovr || 0))
      .slice(0, 3);
    featured.innerHTML = players.map(player => `
      <article class="gacha-v2__featured-player">
        <img src="${escapeHtml(getPlayerImgUrl(player.nbaId || player.id))}" alt="${escapeHtml(displayName(player))}" onerror="this.src='./assets/players/featured-placeholder.svg'">
        <div><span>${escapeHtml(player.team)} · ${escapeHtml((player.positions || player.pos || []).join('/'))}</span><strong>${escapeHtml(displayName(player))}</strong></div>
        <b>${Number(player.ovr || 0)}</b>
      </article>`).join('');
  }

  function revealCardMarkup(card, index, id, compact) {
    const cardMarkup = typeof global.renderNormalCardV2 === 'function'
      ? global.renderNormalCardV2(card, { size: 'gacha', interactive: false })
      : `<div class="gacha-v2__fallback-player"><strong>${escapeHtml(displayName(card))}</strong><span>${Number(card.ovr || 0)} OVR</span></div>`;
    return `<div class="gacha-v2-reveal ${compact ? 'gacha-v2-reveal--compact' : 'gacha-v2-reveal--single'} ${rarityClass(card)}" data-rarity="${escapeHtml(card.rarity)}" onclick="flipCardDirect(${index}, '${id}')">
      <div id="${id}" class="gacha-v2-reveal__inner gacha-v2-card-inner">
        <section class="gacha-v2-reveal__face gacha-v2-reveal__back" aria-label="尚未翻開的球員卡">
          <img src="${PACK_ART}" alt="">
          <span>PLAYER CARD</span>
          <strong>TAP</strong>
        </section>
        <section class="gacha-v2-reveal__face gacha-v2-reveal__front" aria-label="抽卡結果 ${escapeHtml(displayName(card))}">
          ${cardMarkup}
          <button type="button" class="gacha-v2-reveal__info" onclick="showPlayerDetails(event, '${escapeHtml(card.cardId)}')" aria-label="查看 ${escapeHtml(displayName(card))} 球員資訊">i</button>
        </section>
      </div>
    </div>`;
  }

  function installPresentationAdapter() {
    if (typeof renderGachaResult === 'function' && !renderGachaResult.__gachaV2Wrapped) {
      const replacement = function (times) {
        const modal = document.getElementById('gachaModal');
        const single = document.getElementById('gachaSingleContainer');
        const top = document.getElementById('gachaRowTop');
        const bottom = document.getElementById('gachaRowBottom');
        modal?.classList.add('gacha-v2-result-scene');
        if (times === 1) {
          single.classList.remove('hidden');
          top.classList.add('hidden');
          bottom.classList.add('hidden');
          single.innerHTML = revealCardMarkup(activeSessionCards[0].cardData, 0, 'single-card', false);
        } else {
          single.classList.add('hidden');
          top.classList.remove('hidden');
          bottom.classList.remove('hidden');
          top.innerHTML = activeSessionCards.slice(0, 5).map((item, index) => revealCardMarkup(item.cardData, index, `ten-${index}`, true)).join('');
          bottom.innerHTML = activeSessionCards.slice(5, 10).map((item, index) => revealCardMarkup(item.cardData, index + 5, `ten-${index + 5}`, true)).join('');
        }
        modal?.classList.remove('hidden');
      };
      replacement.__gachaV2Wrapped = true;
      replacement.__legacy = renderGachaResult;
      renderGachaResult = replacement;
    }

    if (typeof flipCardDirect === 'function' && !flipCardDirect.__gachaV2Wrapped) {
      const previousFlip = flipCardDirect;
      const wrappedFlip = function (index, id) {
        const reveal = document.getElementById(id)?.closest('.gacha-v2-reveal');
        reveal?.classList.add('is-revealing');
        const result = previousFlip.call(this, index, id);
        global.setTimeout(() => reveal?.classList.add('is-revealed'), 80);
        return result;
      };
      wrappedFlip.__gachaV2Wrapped = true;
      wrappedFlip.__legacy = previousFlip;
      flipCardDirect = wrappedFlip;
    }

    if (typeof revealAllCards === 'function' && !revealAllCards.__gachaV2Wrapped) {
      const wrappedRevealAll = function () {
        activeSessionCards.forEach((item, index) => {
          const id = activeSessionCards.length === 1 ? 'single-card' : `ten-${index}`;
          global.setTimeout(() => flipCardDirect(index, id), activeSessionCards.length === 1 ? 0 : index * 110);
        });
      };
      wrappedRevealAll.__gachaV2Wrapped = true;
      revealAllCards = wrappedRevealAll;
    }
  }

  function installRefreshHooks() {
    if (typeof global.switchTab === 'function' && !global.switchTab.__gachaV2Wrapped) {
      const previousSwitch = global.switchTab;
      const wrappedSwitch = function (tabKey) {
        const result = previousSwitch.call(this, tabKey);
        if (tabKey === 'gacha') renderGachaV2Surface();
        return result;
      };
      wrappedSwitch.__gachaV2Wrapped = true;
      wrappedSwitch.__legacy = previousSwitch;
      global.switchTab = wrappedSwitch;
    }
  }

  global.toggleGachaV2Details = function (button) {
    const details = document.getElementById('gachaV2RateDetails');
    if (!details) return;
    const willOpen = details.hidden;
    details.hidden = !willOpen;
    button?.setAttribute('aria-expanded', String(willOpen));
    if (button) button.textContent = willOpen ? 'CLOSE' : 'DETAILS';
  };

  function init() {
    installPresentationAdapter();
    installRefreshHooks();
    renderGachaV2Surface();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})(window);

/* ToeicQuest NBA UI V2 — HOME renderer and navigation bridge. */
(function (global) {
  'use strict';

  const V2 = global.ToeicQuestV2 = global.ToeicQuestV2 || {};
  const FALLBACK_IMAGE = './assets/players/featured-placeholder.svg';
  const navGroups = {
    home: 'home',
    roster: 'team',
    inventory: 'team',
    gacha: 'gacha',
    season: 'season',
    vocab: 'train',
    stats: 'train'
  };

  function byId(id) { return document.getElementById(id); }

  function setText(id, value) {
    const element = byId(id);
    if (element) element.textContent = value == null ? '' : String(value);
  }

  function setImage(element, source, altText) {
    if (!element) return;
    const nextSource = source || FALLBACK_IMAGE;
    element.alt = altText || '';
    element.onerror = function () {
      if (!this.src.endsWith('featured-placeholder.svg')) this.src = FALLBACK_IMAGE;
    };
    if (element.getAttribute('src') !== nextSource) element.setAttribute('src', nextSource);
  }

  function renderNews(items) {
    const host = byId('v2LeagueNews');
    if (!host) return;
    host.replaceChildren();
    (items || []).forEach((item, index) => {
      const row = document.createElement('p');
      row.className = 'v2-news-item';
      const marker = document.createElement('span');
      marker.textContent = index === 0 ? '●' : '○';
      marker.setAttribute('aria-hidden', 'true');
      const copy = document.createElement('span');
      copy.textContent = item;
      row.append(marker, copy);
      host.appendChild(row);
    });
  }

  function renderCoverPlayerSelector(view) {
    const select = byId('v2CoverPlayerSelect');
    if (!select) return;
    const inventory = Array.isArray(view.gameState?.inventory)
      ? view.gameState.inventory.filter(card => card?.cardId)
      : [];
    const selectedId = view.gameState?.featuredPlayerCardId || '';
    select.replaceChildren();

    const automatic = document.createElement('option');
    automatic.value = '';
    automatic.textContent = '自動選擇';
    select.appendChild(automatic);

    [...inventory]
      .sort((a, b) => Number(b.ovr || b.baseOvr || 0) - Number(a.ovr || a.baseOvr || 0) || String(a.name || '').localeCompare(String(b.name || '')))
      .forEach(card => {
        const option = document.createElement('option');
        option.value = String(card.cardId);
        const cardName = typeof getCardDisplayName === 'function' ? getCardDisplayName(card) : (card.name || '未命名球員');
        option.textContent = `${cardName} · ${card.team || 'NBA'} · OVR ${card.ovr || card.baseOvr || '--'}`;
        select.appendChild(option);
      });

    const selectionStillExists = inventory.some(card => String(card.cardId) === String(selectedId));
    select.value = selectionStillExists ? String(selectedId) : '';
    select.disabled = inventory.length === 0;
    select.title = inventory.length ? '從現有卡庫選擇首頁封面球員' : '卡庫目前沒有球員卡';
  }

  function syncNavigation(tabKey) {
    const activeGroup = navGroups[tabKey] || '';
    document.querySelectorAll('.v2-nav-tab').forEach(button => {
      const active = button.dataset.v2Target === activeGroup;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }

  function setActiveTabState(tabKey) {
    document.body.dataset.v2Active = tabKey;
    syncNavigation(tabKey);
    if (tabKey === 'home') V2.renderHome();
  }

  function renderHome() {
    if (typeof V2.getHomeViewModel !== 'function') return;
    const view = V2.getHomeViewModel();
    if (!view) return;

    setText('v2ProfileName', view.profile.name);
    setText('v2ProfileMeta', view.profile.meta);
    setText('v2EnergyValue', view.resources.energy);
    setText('v2TicketValue', view.resources.tickets);
    setText('v2ScoutValue', view.resources.scoutPoints);
    const energyResource = byId('v2EnergyValue')?.closest('.v2-resource');
    if (energyResource) energyResource.title = `比賽體力｜${view.resources.energyTimer}`;

    setText('v2HeroName', view.featured.name);
    setText('v2HeroMeta', view.featured.meta);
    setText('v2HeroOvr', view.featured.ovr);
    const hero = byId('v2HeroPlayer');
    const avatar = byId('v2ProfileAvatar');
    setImage(hero, view.featured.image, view.featured.name);
    setImage(avatar, view.featured.image, `${view.featured.name} 頭像`);
    hero?.classList.toggle('is-placeholder', view.featured.placeholder);
    renderCoverPlayerSelector(view);

    setText('v2GameNumber', view.gameDay.number);
    setText('v2HomeTeam', view.gameDay.homeName);
    setText('v2HomeBadge', view.gameDay.homeCode);
    setText('v2HomeRecord', view.gameDay.homeRecord);
    setText('v2AwayTeam', view.gameDay.awayName);
    setText('v2AwayBadge', view.gameDay.awayCode);
    setText('v2AwayRecord', view.gameDay.awayRecord);
    setText('v2RankText', view.gameDay.rank);
    setText('v2RecentText', view.gameDay.recent);
    setText('v2PlayButtonText', view.gameDay.actionLabel);
    const special = byId('v2SpecialEvent');
    if (special) {
      special.textContent = view.gameDay.special;
      special.classList.toggle('is-hidden', !view.gameDay.special);
    }

    setText('v2TeamOvr', view.team.overall);
    setText('v2TeamSummaryText', view.team.summary);
    renderNews(view.news);
  }

  function playFromHome() {
    const view = typeof V2.getHomeViewModel === 'function' ? V2.getHomeViewModel() : null;
    if (!view) return;
    if (!view.gameDay.lineupReady) {
      switchTab('roster');
      if (typeof showToast === 'function') showToast('先選好五名先發，再回來迎接今晚的比賽！', 'info');
      return;
    }
    if (view.gameDay.postseasonAvailable && typeof openJourneyPostseason === 'function') {
      openJourneyPostseason();
      return;
    }
    if (typeof start82GamesSimulation === 'function') start82GamesSimulation();
  }

  function makeSectionSwitch(id, items) {
    const bar = document.createElement('nav');
    bar.id = id;
    bar.className = 'v2-section-switch';
    bar.setAttribute('aria-label', '次級分類');
    items.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = item.label;
      button.onclick = () => switchTab(item.tab);
      button.dataset.tab = item.tab;
      bar.appendChild(button);
    });
    return bar;
  }

  function installLegacyNavigationBridges() {
    const trainItems = [{ label: 'VOCAB TRAINING', tab: 'vocab' }, { label: 'STUDY & FOCUS', tab: 'stats' }];
    const vocab = byId('tab-vocab');
    const stats = byId('tab-stats');
    if (vocab && !byId('v2TrainSwitchVocab')) vocab.prepend(makeSectionSwitch('v2TrainSwitchVocab', trainItems));
    if (stats && !byId('v2TrainSwitchStats')) stats.prepend(makeSectionSwitch('v2TrainSwitchStats', trainItems));
  }

  function syncSectionSwitches(tabKey) {
    document.querySelectorAll('.v2-section-switch button').forEach(button => {
      button.classList.toggle('is-active', button.dataset.tab === tabKey);
    });
  }

  V2.renderHome = renderHome;
  V2.playFromHome = playFromHome;
  V2.selectCoverPlayer = function (cardId) {
    if (typeof V2.setFeaturedPlayerCardId === 'function') V2.setFeaturedPlayerCardId(cardId || null);
    if (typeof showToast === 'function') {
      const selected = (typeof V2.getHomeViewModel === 'function' ? V2.getHomeViewModel() : null)?.featured;
      showToast(cardId ? `封面球員已設為 ${selected?.name || '所選球員'}` : '封面球員已恢復自動選擇', 'success');
    }
  };

  const originalSwitchTab = typeof switchTab === 'function' ? switchTab : null;
  if (originalSwitchTab) {
    const wrappedSwitchTab = function (tabKey) {
      const result = originalSwitchTab(tabKey);
      setActiveTabState(tabKey);
      syncSectionSwitches(tabKey);
      return result;
    };
    switchTab = wrappedSwitchTab;
    global.switchTab = wrappedSwitchTab;
  }

  const originalRenderAll = typeof renderAll === 'function' ? renderAll : null;
  if (originalRenderAll) {
    const wrappedRenderAll = function () {
      const result = originalRenderAll.apply(this, arguments);
      renderHome();
      return result;
    };
    renderAll = wrappedRenderAll;
    global.renderAll = wrappedRenderAll;
  }

  function initHomeV2() {
    installLegacyNavigationBridges();
    document.querySelectorAll('.tab-content').forEach(section => section.classList.add('hidden'));
    byId('tab-home')?.classList.remove('hidden');
    setActiveTabState('home');
    syncSectionSwitches('home');
    renderHome();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHomeV2);
  else initHomeV2();
})(window);

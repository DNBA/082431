(function (global) {
  'use strict';

  function createSwitch(activeView) {
    const nav = document.createElement('nav');
    nav.className = 'team-v2-switch';
    nav.setAttribute('aria-label', 'TEAM 分類');
    nav.innerHTML = `
      <button type="button" data-team-view="lineup" class="${activeView === 'lineup' ? 'is-active' : ''}">
        <span>LINEUP</span><small>先發與板凳</small>
      </button>
      <button type="button" data-team-view="cards" class="${activeView === 'cards' ? 'is-active' : ''}">
        <span>CARDS</span><small>球員卡庫</small>
      </button>`;
    nav.querySelector('[data-team-view="lineup"]').onclick = () => global.switchTab('roster');
    nav.querySelector('[data-team-view="cards"]').onclick = () => global.switchTab('inventory');
    return nav;
  }

  function syncTeamSwitch(tabKey) {
    const view = tabKey === 'inventory' ? 'cards' : 'lineup';
    document.querySelectorAll('.team-v2-switch button').forEach(button => {
      const active = button.dataset.teamView === view;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }

  function installTeamShell() {
    const lineup = document.getElementById('tab-roster');
    const cards = document.getElementById('tab-inventory');
    if (lineup && !lineup.querySelector('.team-v2-switch')) lineup.prepend(createSwitch('lineup'));
    if (cards && !cards.querySelector('.team-v2-switch')) cards.prepend(createSwitch('cards'));
  }

  const previousSwitchTab = global.switchTab;
  if (typeof previousSwitchTab === 'function' && !previousSwitchTab.__teamV2Wrapped) {
    const wrapped = function (tabKey) {
      const result = previousSwitchTab.call(this, tabKey);
      syncTeamSwitch(tabKey);
      return result;
    };
    wrapped.__teamV2Wrapped = true;
    wrapped.__previous = previousSwitchTab;
    global.switchTab = wrapped;
  }

  function init() {
    installTeamShell();
    syncTeamSwitch(document.body.dataset.v2Active || 'roster');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})(window);

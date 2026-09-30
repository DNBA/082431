(function () {
  'use strict';

  const CARD_ASSET_ROOT = './assets/cards';

  // Card design registry. Player/career data never belongs in this object.
  // Adding a future frame only requires a new registry entry and asset path.
  const themes = {
    base: {
      id: 'base',
      className: 'card-v2--theme-base',
      frame: null,
      background: null,
      texture: null,
      accent: '#c99b42',
      accentSoft: '#ffe6a6',
      secondaryPortrait: { enabled: false, opacity: 0 },
      nameplate: 'metal-plaque',
      effect: 'none',
      rarityLabel: 'BASE'
    },
    legendary: {
      id: 'legendary',
      className: 'card-v2--theme-legendary',
      frame: `${CARD_ASSET_ROOT}/frames/legendary-purple-gold-v1.png`,
      background: `${CARD_ASSET_ROOT}/backgrounds/legendary-arena-v1.png`,
      texture: null,
      accent: '#f2c15d',
      accentSoft: '#ffe6a6',
      secondaryPortrait: { enabled: true, opacity: 0.24 },
      nameplate: 'metal-plaque',
      effect: 'premium-foil',
      rarityLabel: 'LEGENDARY'
    },
    finals: {
      id: 'finals',
      className: 'card-v2--theme-finals',
      frame: `${CARD_ASSET_ROOT}/frames/finals.png`,
      background: `${CARD_ASSET_ROOT}/backgrounds/finals-arena.png`,
      texture: `${CARD_ASSET_ROOT}/textures/finals-foil.png`,
      accent: '#f2c15d',
      accentSoft: '#fff0bd',
      secondaryPortrait: { enabled: true, opacity: 0.18 },
      nameplate: 'trophy-plaque',
      effect: 'championship-foil',
      rarityLabel: 'FINALS'
    },
    mamba: {
      id: 'mamba',
      className: 'card-v2--theme-mamba',
      frame: `${CARD_ASSET_ROOT}/frames/legendary-purple-gold-v1.png`,
      background: `${CARD_ASSET_ROOT}/backgrounds/legendary-arena-v1.png`,
      texture: null,
      accent: '#f2c15d',
      accentSoft: '#ffe6a6',
      purple: '#5b21b6',
      secondaryPortrait: { enabled: true, opacity: 0.32 },
      nameplate: 'metal-plaque',
      effect: 'purple-gold-foil',
      rarityLabel: 'LEGENDARY'
    },
    moment: {
      id: 'moment',
      className: 'card-v2--theme-moment',
      frame: `${CARD_ASSET_ROOT}/frames/moment.png`,
      background: `${CARD_ASSET_ROOT}/backgrounds/moment-arena.png`,
      texture: `${CARD_ASSET_ROOT}/textures/moment-lines.png`,
      accent: '#f8d47b',
      accentSoft: '#fff1c7',
      secondaryPortrait: { enabled: true, opacity: 0.2 },
      nameplate: 'moment-plaque',
      effect: 'moment-flash',
      rarityLabel: 'MOMENT'
    },
    custom: {
      id: 'custom',
      className: 'card-v2--theme-custom',
      frame: `${CARD_ASSET_ROOT}/frames/custom-01.png`,
      background: `${CARD_ASSET_ROOT}/backgrounds/custom-01.png`,
      texture: null,
      accent: '#d8b56a',
      accentSoft: '#f5e2ae',
      secondaryPortrait: { enabled: true, opacity: 0.2 },
      nameplate: 'custom-plaque',
      effect: 'custom',
      rarityLabel: 'CUSTOM'
    }
  };

  window.CARD_THEMES = themes;
  window.CardThemeRegistry = {
    get(themeId) {
      return themes[themeId] || themes.base;
    },
    register(themeId, config) {
      if (!themeId || !config || typeof config !== 'object') return false;
      themes[themeId] = { ...themes.base, ...config, id: themeId };
      return true;
    },
    list() {
      return Object.keys(themes);
    },
    assetRoot: CARD_ASSET_ROOT
  };
})();

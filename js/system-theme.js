(function (global) {
  'use strict';

  const STORAGE_KEY = 'toeicquestThemePreference';
  const VALID_MODES = new Set(['auto', 'light', 'dark']);
  const systemQuery = global.matchMedia('(prefers-color-scheme: dark)');
  let preference = readPreference();

  function readPreference() {
    try {
      const saved = global.localStorage.getItem(STORAGE_KEY);
      return VALID_MODES.has(saved) ? saved : 'auto';
    } catch (_error) {
      return 'auto';
    }
  }

  function resolvedTheme() {
    return preference === 'auto' ? (systemQuery.matches ? 'dark' : 'light') : preference;
  }

  function setStylesheetState(id, enabled) {
    const link = document.getElementById(id);
    if (!link) return;
    link.disabled = !enabled;
    link.media = enabled ? 'all' : 'not all';
  }

  function syncControls() {
    const icons = { auto: '◐', light: '☀️', dark: '🌙' };
    const labels = { auto: '自動', light: '淺色', dark: '深色' };
    document.querySelectorAll('.tq-theme-trigger').forEach(button => {
      const icon = button.querySelector('.tq-theme-icon');
      const label = button.querySelector('.tq-theme-label');
      if (icon) icon.textContent = icons[preference];
      if (label) label.textContent = labels[preference];
      button.setAttribute('aria-label', `外觀：${labels[preference]}，點擊調整`);
      button.title = `外觀：${labels[preference]}`;
    });
    document.querySelectorAll('.tq-theme-option').forEach(button => {
      const active = button.dataset.themeMode === preference;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function applyTheme() {
    const theme = resolvedTheme();
    setStylesheetState('tqThemeAuto', preference === 'auto');
    setStylesheetState('tqThemeLight', preference === 'light');
    setStylesheetState('tqThemeDark', preference === 'dark');
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.dataset.systemTheme = theme;
    document.documentElement.style.colorScheme = theme;

    const themeMeta = document.getElementById('tqThemeColor');
    if (themeMeta) themeMeta.setAttribute('content', theme === 'dark' ? '#000000' : '#f2f2f7');
    const appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleMeta) appleMeta.setAttribute('content', theme === 'dark' ? 'black-translucent' : 'default');
    syncControls();
  }

  function setThemePreference(mode) {
    if (!VALID_MODES.has(mode)) return;
    preference = mode;
    try { global.localStorage.setItem(STORAGE_KEY, mode); } catch (_error) {}
    applyTheme();
    closeThemeMenu();
    if (typeof global.showToast === 'function') {
      const label = mode === 'auto' ? '已改為跟隨手機外觀' : `已切換為${mode === 'light' ? '淺色' : '深色'}模式`;
      global.showToast(label, 'success');
    }
  }

  function ensureThemeMenu() {
    if (document.getElementById('tqThemePicker')) return;
    const picker = document.createElement('div');
    picker.id = 'tqThemePicker';
    picker.className = 'tq-theme-picker';
    picker.hidden = true;
    picker.setAttribute('role', 'dialog');
    picker.setAttribute('aria-modal', 'true');
    picker.setAttribute('aria-labelledby', 'tqThemePickerTitle');
    picker.innerHTML = `
      <button type="button" class="tq-theme-picker__backdrop" onclick="closeThemeMenu()" aria-label="關閉外觀選單"></button>
      <section class="tq-theme-picker__sheet">
        <div class="tq-theme-picker__handle" aria-hidden="true"></div>
        <h2 id="tqThemePickerTitle">外觀模式</h2>
        <div class="tq-theme-picker__options">
          <button type="button" class="tq-theme-option" data-theme-mode="auto" onclick="setThemePreference('auto')"><span>◐</span>自動<small>跟隨手機</small></button>
          <button type="button" class="tq-theme-option" data-theme-mode="light" onclick="setThemePreference('light')"><span>☀️</span>淺色<small>白色介面</small></button>
          <button type="button" class="tq-theme-option" data-theme-mode="dark" onclick="setThemePreference('dark')"><span>🌙</span>深色<small>黑色介面</small></button>
        </div>
      </section>`;
    document.body.appendChild(picker);
    syncControls();
  }

  function openThemeMenu() {
    ensureThemeMenu();
    const picker = document.getElementById('tqThemePicker');
    if (!picker) return;
    picker.hidden = false;
    syncControls();
  }

  function closeThemeMenu() {
    const picker = document.getElementById('tqThemePicker');
    if (picker) picker.hidden = true;
  }

  function handleSystemChange() {
    if (preference === 'auto') applyTheme();
  }

  global.setThemePreference = setThemePreference;
  global.openThemeMenu = openThemeMenu;
  global.closeThemeMenu = closeThemeMenu;
  applyTheme();
  if (typeof systemQuery.addEventListener === 'function') systemQuery.addEventListener('change', handleSystemChange);
  else if (typeof systemQuery.addListener === 'function') systemQuery.addListener(handleSystemChange);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { ensureThemeMenu(); applyTheme(); });
  else { ensureThemeMenu(); applyTheme(); }
})(window);

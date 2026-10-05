const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('index.html');
const autoCss = read('css/system-theme.css');
const lightCss = read('css/system-theme-light.css');
const darkCss = read('css/system-theme-dark.css');
const controlsCss = read('css/theme-controls.css');
const themeJs = read('js/system-theme.js');
const homeV2 = read('js/ui-v2/home-v2.js');

assert.match(index, /id="tqThemeAuto"[^>]+system-theme\.css/);
assert.match(index, /id="tqThemeLight"[^>]+system-theme-light\.css[^>]+media="not all"[^>]+disabled/);
assert.match(index, /id="tqThemeDark"[^>]+system-theme-dark\.css[^>]+media="not all"[^>]+disabled/);
assert.match(index, /class="tq-theme-trigger tq-theme-trigger--legacy"/);
assert.match(index, /class="tq-theme-trigger tq-theme-trigger--hero"/);
assert.match(autoCss, /@media \(prefers-color-scheme: light\)/);
assert.match(autoCss, /@media \(prefers-color-scheme: dark\)/);
assert.doesNotMatch(lightCss, /prefers-color-scheme/);
assert.doesNotMatch(darkCss, /prefers-color-scheme/);
assert.match(lightCss, /#sjComicPanel \[class\*="bg-gradient-to-t"\]/);
assert.match(darkCss, /#sjComicPanel img \{ visibility: visible; opacity: 1; \}/);
assert.match(controlsCss, /\.tq-theme-picker/);

assert.match(index, /onclick="switchTab\('vocab'\)" class="v2-nav-tab" data-v2-target="train"/);
assert.ok(homeV2.indexOf("label: 'VOCAB'") < homeV2.indexOf("label: 'CALENDAR \/ FOCUS'"));

for (const css of [autoCss, lightCss, darkCss, controlsCss]) {
  assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length, 'CSS braces must be balanced');
}

function makeElement() {
  return {
    disabled: false,
    media: '',
    hidden: true,
    dataset: {},
    classList: { toggle() {} },
    setAttribute(name, value) { this[name] = value; },
    querySelector() { return null; }
  };
}

const elements = new Map([
  ['tqThemeAuto', makeElement()],
  ['tqThemeLight', makeElement()],
  ['tqThemeDark', makeElement()],
  ['tqThemeColor', makeElement()]
]);
const appleMeta = makeElement();
const document = {
  readyState: 'loading',
  documentElement: { dataset: {}, style: {} },
  body: { appendChild() {} },
  getElementById(id) { return elements.get(id) || null; },
  querySelector(selector) { return selector.includes('apple-mobile-web-app-status-bar-style') ? appleMeta : null; },
  querySelectorAll() { return []; },
  addEventListener() {},
  createElement() { return makeElement(); }
};
const storage = new Map([['toeicquestThemePreference', 'light']]);
const window = {
  document,
  localStorage: {
    getItem(key) { return storage.get(key) || null; },
    setItem(key, value) { storage.set(key, value); }
  },
  matchMedia() { return { matches: true, addEventListener() {} }; }
};
vm.runInNewContext(themeJs, { window, document, Set });
assert.equal(document.documentElement.dataset.systemTheme, 'light');
assert.equal(elements.get('tqThemeAuto').disabled, true);
assert.equal(elements.get('tqThemeLight').disabled, false);
assert.equal(elements.get('tqThemeDark').disabled, true);

window.setThemePreference('auto');
assert.equal(document.documentElement.dataset.systemTheme, 'dark');
assert.equal(elements.get('tqThemeAuto').disabled, false);
assert.equal(elements.get('tqThemeLight').disabled, true);
assert.equal(elements.get('tqThemeDark').disabled, true);

console.log('System theme, manual mode, Badge Moment protection, and TRAIN entry checks passed.');

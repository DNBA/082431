const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'system-theme.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'js', 'system-theme.js'), 'utf8');
const homeV2 = fs.readFileSync(path.join(root, 'js', 'ui-v2', 'home-v2.js'), 'utf8');

assert.match(index, /<meta name="color-scheme" content="light dark">/);
assert.match(index, /theme-color" content="#f2f2f7" media="\(prefers-color-scheme: light\)"/);
assert.match(index, /theme-color" content="#000000" media="\(prefers-color-scheme: dark\)"/);
assert.match(index, /\.\/js\/system-theme\.js\?v=/);
assert.match(index, /\.\/css\/system-theme\.css\?v=/);

const plannerCssIndex = index.indexOf('./css/study-planner.css');
const systemCssIndex = index.indexOf('./css/system-theme.css');
assert.ok(systemCssIndex > plannerCssIndex, 'system theme must load after component styles');

assert.match(css, /@media \(prefers-color-scheme: light\)/);
assert.match(css, /@media \(prefers-color-scheme: dark\)/);
assert.match(css, /\.normal-card-v2, \.normal-card-v2 \*/);
assert.match(css, /\.card-v2, \.card-v2 \*/);
assert.match(css, /\.study-planner/);
assert.match(css, /#000000/);
assert.match(css, /#ffffff/);

assert.match(js, /matchMedia\('\(prefers-color-scheme: dark\)'\)/);
assert.match(js, /apple-mobile-web-app-status-bar-style/);
assert.match(js, /addEventListener\('change', syncSystemTheme\)/);

assert.match(index, /onclick="switchTab\('vocab'\)" class="v2-nav-tab" data-v2-target="train"/);
assert.ok(homeV2.indexOf("label: 'VOCAB'") < homeV2.indexOf("label: 'CALENDAR \/ FOCUS'"));
assert.match(homeV2, /label: 'CALENDAR \/ FOCUS'.*tab: 'planner'/);

const opens = (css.match(/{/g) || []).length;
const closes = (css.match(/}/g) || []).length;
assert.equal(opens, closes, 'theme CSS braces must be balanced');

console.log('System theme source checks passed.');

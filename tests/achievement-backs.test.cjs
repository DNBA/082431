const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const backs = require('../js/ui-v2/achievement-backs.js');
const seasonSource = fs.readFileSync(path.join(root, 'js', 'season-journey.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'achievement-backs.css'), 'utf8');

const card = {
  cardId: 'kobe-24',
  name: 'Kobe Bryant',
  activeCardBack: 'mvp',
  legacy: { rings: 5, fmvps: 2, mvps: 3, dpoys: 1, records: 6 },
  achievementBacks: [
    { id: 'champion', detail: '冠軍 ×5', unlockedAt: '2026-10-06T12:00:00+08:00' },
    { id: 'mvp', detail: 'MVP ×3', unlockedAt: '2026-10-06T12:00:00+08:00' }
  ]
};
const definitions = [
  { id: 'champion', name: 'CHAMPION', zh: '冠軍', art: './assets/cards/backs/champion-v1.webp', hint: '成為冠軍隊成員' },
  { id: 'mvp', name: 'MVP', zh: '例行賽 MVP', art: './assets/cards/backs/mvp-v1.webp', hint: '獲得例行賽 MVP' },
  { id: 'dpoy', name: 'DPOY', zh: '年度最佳防守球員', art: './assets/cards/backs/dpoy-v1.webp', hint: '獲得年度最佳防守球員' }
];

assert.equal(backs.getHonorCount(card, 'champion', card.achievementBacks[0]), 5);
assert.equal(backs.getHonorCount(card, 'mvp', card.achievementBacks[1]), 3);
assert.equal(backs.getHonorCount(card, 'dpoy', null), 1, 'legacy count remains available before a historical unlock sync');
assert.deepEqual(backs.getUpgrade('champion', 5), { tier: 'mythic', label: 'DYNASTY', marks: 3 });
assert.deepEqual(backs.getUpgrade('mvp', 3), { tier: 'elite', label: 'TRIPLE CROWN', marks: 3 });

const markup = backs.renderGrid(card, definitions);
assert.match(markup, /champion-v1\.webp/);
assert.match(markup, /nba-logo\.svg/);
assert.match(markup, /DYNASTY/);
assert.match(markup, /TRIPLE CROWN/);
assert.match(markup, /Kobe Bryant/);
assert.match(markup, /is-active/);
assert.doesNotMatch(markup, /2027|>24</, 'art overlay must not invent a season or jersey number');

assert.deepEqual(backs.summary(card, definitions), { owned: 2, total: 3, activeName: 'MVP' });
assert.match(seasonSource, /<details id="sjAchievementBacksSection"/);
assert.match(seasonSource, /backsSection\.open = false/);
assert.match(index, /achievement-backs\.css/);
assert.match(index, /ui-v2\/achievement-backs\.js/);
assert.match(css, /object-fit:\s*contain/);
assert.match(css, /\.sj-surface-champion\s*\{\s*--sj-equipped-back:\s*url\('\.\.\/assets\/cards\/backs\/champion-v1\.webp'\)/);
assert.match(css, /\.sj-surface-mvp\s*\{\s*--sj-equipped-back:\s*url\('\.\.\/assets\/cards\/backs\/mvp-v1\.webp'\)/);
assert.match(css, /#rosterStarters \.sj-card-surface/);
assert.match(css, /#rosterBench \.sj-card-surface/);
assert.match(css, /background-size:\s*cover\s*!important/);
assert.match(css, /grid-template-columns:\s*repeat\(2/);
assert.match(css, /@media \(min-width: 640px\)[\s\S]+repeat\(3/);
assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length, 'CSS braces must be balanced');

for (const id of ['champion', 'fmvp', 'mvp', 'dpoy', 'record', 'legend']) {
  assert.ok(fs.existsSync(path.join(root, 'assets', 'cards', 'backs', `${id}-v1.webp`)), `${id} art is missing`);
}
assert.ok(fs.existsSync(path.join(root, 'assets', 'cards', 'backs', 'nba-logo.svg')), 'NBA logo is missing');

console.log('Achievement BACKS: six full-art cards, NBA logo layer, save-compatible counts, upgrades, collapsed collection, and responsive layout passed.');

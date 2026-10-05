const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'season-journey.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'season-v2.css'), 'utf8');

assert.match(source, /function buildBadgeCinemaSlides\(moment\)/);
assert.match(source, /label: 'TRIGGER'/);
assert.match(source, /label: 'ACTION'/);
assert.match(source, /label: 'IMPACT'/);
assert.match(source, /async function preloadBadgeArtwork\(moment\)/);
assert.match(source, /assets\/cards\/player-art\/kobe-mamba-v1\.png/);
assert.match(source, /assets\/players\/featured-placeholder\.svg/);
assert.match(source, /image\.naturalWidth > 0/);
assert.match(source, /handleJourneyBadgeArtError/);
assert.match(source, /activeComic\.slides\.length - 1/);
assert.match(source, /function replayJourneyMoment\(cardId, momentIndex\)/);
assert.match(source, /class="sj-moment-replay"/);
assert.match(source, /本回合即時增加 \$\{points\} 分/);

for (const selector of [
  '.sj-comic-shell',
  '.sj-badge-cinema__stage',
  '.sj-badge-cinema__player',
  '.sj-badge-cinema__fallback.is-visible',
  '.sj-badge-cinema__impact',
  '.sj-badge-cinema__progress',
  '.sj-moment-replay'
]) assert.ok(css.includes(selector), `missing cinema selector ${selector}`);

assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length, 'season CSS braces must be balanced');
console.log('Badge Moment cinema, fallback artwork, impact, progress, and replay checks passed.');

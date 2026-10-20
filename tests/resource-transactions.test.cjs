const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const season = read('js/season-journey.js');
const promotion = read('js/promotion-center.js');
const saveTools = read('js/core/save-tools.js');

assert.match(season, /energy\.current = before;/, 'failed energy saves must restore the previous balance');
assert.match(season, /energy\.lastRegenAt = beforeRegenAt;/, 'failed energy saves must restore the regen timer');
assert.match(season, /if \(activeGame && !activeGame\.finalized\)/, 'double taps must not charge a second energy ball');
assert.match(promotion, /s\.playerProgression=progressionBefore;/, 'failed promotion saves must restore materials');
assert.match(promotion, /Object\.assign\(card,cardBefore\)/, 'failed promotion saves must restore the card');
assert.match(promotion, /promotionLocked=true/, 'promotion must reject double taps while committing');
assert.doesNotMatch(saveTools, /recovery\?\.blocked\) \{\s*openSaveTools\(\)/, 'opening the site must not force the recovery UI');

console.log('Energy, promotion, and startup recovery transaction guards passed.');


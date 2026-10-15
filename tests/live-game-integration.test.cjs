const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('LIVE GAME modules load before Season Journey and UI does not expose a version label', () => {
  const html = read('index.html');
  const engine = html.indexOf('live-game-engine.js');
  const renderer = html.indexOf('live-game-renderer.js');
  const journey = html.indexOf('season-journey.js');
  assert.ok(engine > 0 && renderer > engine && journey > renderer);
  assert.doesNotMatch(html, />\s*V4(?:\.0)?\s*</i);
});

test('pregame exposes PLAY HYBRID SIM while preserving the existing simulator', () => {
  const source = read('js/season-journey.js');
  assert.match(source, /play:\s*\{\s*label:\s*'PLAY'/);
  assert.match(source, /hybrid:\s*\{\s*label:\s*'HYBRID'/);
  assert.match(source, /sim:\s*\{\s*label:\s*'SIM'/);
  assert.match(source, /quickSimJourneyGame/);
  assert.match(source, /TAKE CONTROL · 3 POSSESSIONS/);
});

test('PLAY box score is converted into existing Season rows before records and rewards', () => {
  const source = read('js/season-journey.js');
  const apply = source.indexOf('applyLiveBoxScore(gameData');
  const records = source.indexOf('evaluateJourneyRecords(gameData', apply);
  const rewards = source.indexOf('awardGame(state', apply);
  assert.ok(apply > 0 && records > apply && rewards > records);
  ['pts','reb','ast','stl','blk','fgM','fgA','threeM','threeA'].forEach(key => assert.match(read('js/live-game/live-game-engine.js'), new RegExp(`${key}:`)));
});

test('mobile court uses safe-area controls and no horizontal page overflow', () => {
  const css = read('css/live-game-2d.css');
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /overflow:hidden/);
  assert.match(css, /@media \(max-height:740px\) and \(max-width:699px\)/);
  assert.match(css, /grid-template-columns:128px 1fr/);
});

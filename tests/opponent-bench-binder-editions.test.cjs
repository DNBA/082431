const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const season = read('js/season-journey.js');
const app = read('js/app.js');
const index = read('index.html');

function extractObjectLiteral(source, declaration) {
  const declarationAt = source.indexOf(declaration);
  assert.ok(declarationAt >= 0, `${declaration} must exist`);
  const start = source.indexOf('{', declarationAt);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'" || character === '`') { quote = character; continue; }
    if (character === '{') depth += 1;
    if (character === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Could not extract ${declaration}`);
}

const teams25 = Function(`"use strict"; return (${extractObjectLiteral(app, 'const TEAM_DATA_2025 =')});`)();
const teams26 = Function(`"use strict"; return (${extractObjectLiteral(app, 'const TEAM_DATA_2026 =')});`)();
assert.equal(Object.keys(teams25).length, 30);
assert.equal(Object.keys(teams26).length, 30);
for (const team of Object.keys(teams26)) {
  assert.equal(teams25[team]?.length, 15, `${team} '25 binder must contain 15 real players`);
  assert.equal(teams26[team]?.length, 15, `${team} '26 roster must contain 15 real players`);
  assert.equal(new Set(teams26[team].map(player => player.name)).size, 15, `${team} '26 names must be unique`);
}

assert.match(season, /function getOpponentBench\(game\)/);
assert.match(season, /player\.team === code/);
assert.match(season, /String\(player\.edition \|\| ''\) === '26'/);
assert.match(season, /!starterNames\.has\(player\.name\)/);
assert.match(season, /const bench = getOpponentBench\(scheduleGame\)/);
assert.doesNotMatch(season, /name: `\$\{scheduleGame\.opponent\} 替補 \$\{index \+ 1\}`/);

assert.match(index, /30 隊圖鑑冊 · 25 \/ 26/);
assert.match(index, /binderEdition25Btn/);
assert.match(index, /binderEdition26Btn/);
assert.match(app, /edition === '25' \? TEAM_DATA_2025 : TEAM_DATA_2026/);
assert.match(app, /getCardEdition\(card\) === edition/);
assert.match(app, /const ownedNames = new Set/);
assert.match(app, /window\.switchBinderEdition = switchBinderEdition/);

console.log('Opponent real bench names and 25/26 binder edition switch passed.');

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const integrity = require('../js/box-score-integrity.js');

const impossibleThirty = {
  pts: 30, fgM: 13, fgA: 24, threeM: 5, threeA: 10, ftM: 0, ftA: 0
};
integrity.normalizeShootingLine(impossibleThirty);
assert.equal(integrity.linePoints(impossibleThirty), 30);
assert.notEqual(impossibleThirty.fgM, 13, '30 PTS with 5 threes cannot keep 13 total field goals');
assert.equal(impossibleThirty.pts, 30);

for (let pts = 0; pts <= 80; pts += 1) {
  for (let threeM = 0; threeM <= Math.floor(pts / 3); threeM += 1) {
    const row = { pts, threeM, threeA: threeM + 4, ftM: (pts + threeM) % 8, ftA: 10, fgA: 26 };
    integrity.normalizeShootingLine(row);
    assert.equal(integrity.linePoints(row), pts, `shooting line must equal ${pts} PTS`);
    assert.ok(row.fgM >= row.threeM);
    assert.ok(row.fgA >= row.fgM);
    assert.ok(row.threeA >= row.threeM);
    assert.ok(row.ftA >= row.ftM);
  }
}

const team = [
  { name: 'A', role: 'starter', pts: 31, threeM: 5, fgA: 24, threeA: 11, ftM: 2, ftA: 3 },
  { name: 'B', role: 'starter', pts: 24, threeM: 2, fgA: 18, threeA: 6, ftM: 3, ftA: 4 },
  { name: 'C', role: 'bench', pts: 12, threeM: 1, fgA: 9, threeA: 3, ftM: 1, ftA: 2 },
  { name: 'D', role: 'bench', pts: 9, threeM: 1, fgA: 7, threeA: 2, ftM: 2, ftA: 2 }
];
integrity.reconcileTeamPoints(team, 101);
assert.equal(team.reduce((sum, row) => sum + row.pts, 0), 101);
team.forEach(row => assert.equal(integrity.linePoints(row), row.pts));

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/box-score.css'), 'utf8');
assert.ok(index.indexOf('box-score-integrity.js') < index.indexOf('app.js'));
assert.match(index, /modalBoxOverviewBtn/);
assert.match(index, /modalBoxShootingBtn/);
assert.match(app, /reconcileTeamPoints\(fullBox, myScore\)/);
assert.match(app, /switchGameBoxScoreStats/);
assert.match(app, /tq-box-mobile-statline--overview/);
assert.match(app, /tq-box-mobile-statline--shooting/);
assert.match(app, /對手替補 · \$\{bench\.length\} PLAYERS/);
assert.match(css, /data-stat-view="overview"/);
assert.match(css, /data-stat-view="shooting"/);
assert.match(css, /data-system-theme="light"/);
assert.match(css, /tq-box-score-table thead \{ display:none; \}/);

console.log('Box Score integrity and focused overview/shooting views passed.');

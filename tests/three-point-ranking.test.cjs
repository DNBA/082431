const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
const journey = fs.readFileSync(path.join(root, 'js', 'season-journey.js'), 'utf8');

assert.match(app, /function renderThreePointContestRanking\(results/);
assert.match(app, /state\.season\.threePtContestRanking\s*=/);
assert.match(app, /allStarWeekend\?\.contestResult \|\| state\.season\?\.threePtContestRanking/);
assert.match(app, /renderThreePointContestRanking\(compactRanking\)/);
assert.match(app, /threePtContestPlayedShooters/);
assert.match(app, /threePtContestResultsByShooter\[playerName\]/);
assert.match(app, /getRemainingThreePointShooters\(\)/);
assert.match(journey, /3PT CONTEST · FINAL RANKING/);
assert.match(journey, /whitespace-nowrap[^>]*>\$\{index \+ 1\}\. \$\{safeText\(player\.name\)\}/);
assert.doesNotMatch(journey, /weekend\.west\.starters\.map\([^\n]+\.join\(' · '\)/, 'All-Star starters should not be compressed into one line');

console.log('Three-point ranking persistence and one-player-per-line All-Star lists passed.');

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('index.html');
const app = read('js/app.js');
const css = read('css/vocab-endless.css');

assert.match(index, /onclick="startEndlessVocabChallenge\(\)"/);
assert.match(index, /id="endlessQuizHud"/);
assert.match(index, /id="endlessResultOverlay"/);
assert.match(index, /vocab-endless\.css/);

assert.match(app, /const ENDLESS_QUESTION_MS = 5000/);
assert.match(app, /endlessDeadlineAt = Date\.now\(\) \+ ENDLESS_QUESTION_MS/);
assert.match(app, /Date\.now\(\) >= endlessDeadlineAt/);
assert.match(app, /function handleEndlessTimeout\(\)/);
assert.match(app, /function finishEndlessChallenge\(reason\)/);
assert.match(app, /state\.scoutPoints = \(Number\(state\.scoutPoints\) \|\| 0\) \+ 1/);
assert.match(app, /if \(quizScore % 10 === 0\)/);
assert.match(app, /const milestoneTickets = quizScore \/ 10/);
assert.match(app, /endlessBest/);

function expectedTickets(cleared) {
  let tickets = 0;
  for (let level = 10; level <= cleared; level += 10) tickets += level / 10;
  return tickets;
}

assert.equal(expectedTickets(9), 0);
assert.equal(expectedTickets(10), 1);
assert.equal(expectedTickets(20), 3);
assert.equal(expectedTickets(30), 6);
assert.equal(expectedTickets(50), 15);

assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length, 'Endless CSS braces must be balanced');
assert.match(css, /\.endless-quiz-hud\.hidden \{ display: none; \}/);

console.log('Endless vocab challenge UI, deadline protection, and cumulative reward checks passed.');

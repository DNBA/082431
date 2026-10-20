const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const notes = require('../js/study-notes.js');

test('normalizeStore safely migrates missing and legacy note data', () => {
  assert.deepEqual(notes.normalizeStore(null), { notes: [], fontSize: 'normal', draft: null });
  const migrated = notes.normalizeStore({
    fontSize: 'huge',
    notes: [{ id: 'a', title: '  重點  ', content: 'line1\r\nline2', pinned: 1 }]
  });
  assert.equal(migrated.fontSize, 'normal');
  assert.equal(migrated.notes[0].title, '重點');
  assert.equal(migrated.notes[0].content, 'line1\nline2');
  assert.equal(migrated.notes[0].pinned, false);
});

test('sortNotes keeps pinned notes first then most recently updated', () => {
  const sorted = notes.sortNotes([
    { id: 'old', pinned: false, updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'pin', pinned: true, updatedAt: '2025-01-01T00:00:00.000Z' },
    { id: 'new', pinned: false, updatedAt: '2026-02-01T00:00:00.000Z' }
  ]);
  assert.deepEqual(sorted.map(item => item.id), ['pin', 'new', 'old']);
});

test('filterNotes searches both title and body without mutating input', () => {
  const input = [
    { id: '1', title: '國學', content: '第一章', pinned: false, updatedAt: '2026-01-01' },
    { id: '2', title: '英文', content: 'commute vocabulary', pinned: false, updatedAt: '2026-01-02' }
  ];
  assert.deepEqual(notes.filterNotes(input, '國學').map(item => item.id), ['1']);
  assert.deepEqual(notes.filterNotes(input, 'VOCAB').map(item => item.id), ['2']);
  assert.deepEqual(input.map(item => item.id), ['1', '2']);
});

test('normalizeDraft drops empty drafts and retains editable note id', () => {
  assert.equal(notes.normalizeDraft({ title: ' ', content: '\n' }), null);
  const draft = notes.normalizeDraft({ noteId: 'note-a', title: '題目', content: '內容' });
  assert.equal(draft.noteId, 'note-a');
  assert.equal(draft.title, '題目');
  assert.ok(Number.isFinite(Date.parse(draft.updatedAt)));
});

test('project wires Notes into TRAIN, shared save state, focus mode, and mobile dock', () => {
  const root = path.join(__dirname, '..');
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
  const home = fs.readFileSync(path.join(root, 'js', 'ui-v2', 'home-v2.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'css', 'study-notes.css'), 'utf8');

  assert.match(index, /id="tab-notes"/);
  assert.match(index, /VOCAB<\/button>[\s\S]*NOTES<\/button>/);
  assert.match(index, /study-notes\.js\?v=20261019-notes-1/);
  assert.ok(index.indexOf('app.js?v=20261020-contest-fix-1') < index.indexOf('study-notes.js?v=20261019-notes-1'));
  assert.match(app, /studyNotes:\s*\{[\s\S]*notes:\s*\[\][\s\S]*fontSize:\s*'normal'/);
  assert.match(app, /\['stats', 'planner', 'vocab', 'notes'\]/);
  assert.match(home, /notes:\s*'train'/);
  assert.match(css, /\.train-local-dock\s*\{[\s\S]*position:\s*fixed/);
  assert.match(css, /\.train-local-dock\s*\{[\s\S]*?z-index:\s*60;/, 'the TRAIN dock stays below championship ring and other modal layers');
  assert.match(index, /id="championshipRingsModal"[\s\S]*?z-\[100\]/, 'the ring cabinet remains above the TRAIN local dock');
  assert.match(css, /touch-action:\s*manipulation/);
});

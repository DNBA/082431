const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const Vocab = require('../js/vocab-editor-v2.js');

test('legacy vocabulary migrates once with stable ids and compatibility fields', () => {
  const legacy = { id: 42, word: 'record', pos: 'v.', meaning: '記錄', example: 'Please record it.', box: 3, sourceType: 'manual' };
  const first = Vocab.migrateVocabItem(legacy);
  const second = Vocab.migrateVocabItem(legacy);
  assert.equal(first.id, 42);
  assert.equal(first.box, 3);
  assert.equal(first.sourceType, 'manual');
  assert.equal(first.senses[0].partOfSpeech, 'verb');
  assert.equal(first.pos, 'v.');
  assert.equal(first.meaning, '記錄');
  assert.equal(first.senses[0].id, second.senses[0].id);
});
test('multiple senses remain separate quiz entries while keeping a primary legacy meaning', () => {
  const word = Vocab.migrateVocabItem({
    id: 'word_record', word: 'record', box: 2,
    senses: [
      { id: 'sense_n', partOfSpeech: 'noun', meaning: '紀錄', example: 'That is a record.' },
      { id: 'sense_v', partOfSpeech: 'verb', meaning: '記錄', example: 'Record the result.' }
    ]
  });
  const pool = Vocab.getAllSensePool([word]);
  assert.equal(pool.length, 2);
  assert.deepEqual(pool.map(item => item.pos), ['n.', 'v.']);
  assert.equal(word.meaning, '紀錄');
  assert.equal(word.pos, 'n.');
});

test('search covers word, meanings, examples, synonyms, and synonym notes', () => {
  const word = Vocab.migrateVocabItem({
    word: 'purchase', pronunciation: '/ˈpɜːrtʃəs/',
    senses: [{ partOfSpeech: 'verb', meaning: '購買', example: 'Purchase a ticket.', synonyms: [{ word: 'acquire', note: '較正式' }] }]
  });
  assert.equal(Vocab.matchesSearch(word, 'purchase'), true);
  assert.equal(Vocab.matchesSearch(word, '購買'), true);
  assert.equal(Vocab.matchesSearch(word, 'ticket'), true);
  assert.equal(Vocab.matchesSearch(word, 'acquire'), true);
  assert.equal(Vocab.matchesSearch(word, '較正式'), true);
  assert.equal(Vocab.matchesSearch(word, 'basketball'), false);
});

test('synonym challenge only returns a real four-choice question', () => {
  const words = [
    ['purchase', '購買', 'acquire'], ['quick', '快速', 'rapid'],
    ['assist', '協助', 'help'], ['large', '大的', 'huge']
  ].map(([word, meaning, synonym], index) => Vocab.migrateVocabItem({
    id: `w${index}`, word,
    senses: [{ partOfSpeech: 'verb', meaning, synonyms: [{ word: synonym, note: `${synonym} note` }] }]
  }));
  const question = Vocab.createSynonymQuestion(words, () => 0.25);
  assert.ok(question);
  assert.equal(question.options.length, 4);
  assert.equal(new Set(question.options.map(value => value.toLowerCase())).size, 4);
  assert.ok(question.options.includes(question.correct));
  assert.equal(Vocab.createSynonymQuestion(words.slice(0, 3), () => 0.25), null);
});

test('existing phrase records are not rewritten by migration', () => {
  const phrase = { id: 'p1', type: 'phrase', word: 'in charge of', meaning: '負責', customField: 'kept' };
  assert.deepEqual(Vocab.migrateVocabItem(phrase), phrase);
});

test('project wires editor before app and preserves the existing state and reward flow', () => {
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'css', 'vocab-editor-v2.css'), 'utf8');
  assert.ok(index.indexOf('js/vocab-editor-v2.js') < index.indexOf('js/app.js'));
  assert.match(index, /vocab-editor-v2\.css/);
  assert.match(index, /id="vocabTopAddButton"/);
  assert.match(index, /class="vocab-v2-top-banner"/);
  assert.match(index, /app\.js\?v=20261019-notes-1/);
  assert.equal((index.match(/onclick="openAddVocabularyWord\(\)"/g) || []).length, 1);
  assert.match(css, /touch-action:\s*manipulation/);
  assert.match(css, /\.vocab-v2-top-add[\s\S]*min-height:\s*46px/);
  assert.match(index, /startSynonymVocabChallenge/);
  assert.match(index, /搜尋單字、意思、例句或同義詞/);
  assert.match(app, /state\.toeic\.vocabList\.unshift/);
  assert.match(app, /wordAddedToday/);
  assert.match(app, /scoutPoints/);
  assert.match(app, /openAddVocabularyWord/);
  assert.match(app, /editVocabularyWord/);
  assert.match(app, /expandPlayerVocabQuizItems/);
});

/* ToeicQuest NBA — Vocabulary Editor V2 (multi-sense, synonym-safe, legacy-compatible). */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VocabEditorV2 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  const POS_OPTIONS = Object.freeze([
    { value: 'noun', label: 'n. 名詞', short: 'n.' },
    { value: 'verb', label: 'v. 動詞', short: 'v.' },
    { value: 'adjective', label: 'adj. 形容詞', short: 'adj.' },
    { value: 'adverb', label: 'adv. 副詞', short: 'adv.' },
    { value: 'preposition', label: 'prep. 介系詞', short: 'prep.' },
    { value: 'conjunction', label: 'conj. 連接詞', short: 'conj.' },
    { value: 'pronoun', label: 'pron. 代名詞', short: 'pron.' },
    { value: 'determiner', label: 'det. 限定詞', short: 'det.' },
    { value: 'phrasal-verb', label: 'phr. v. 片語動詞', short: 'phr. v.' },
    { value: 'phrase', label: 'phr. 片語', short: 'phr.' }
  ]);
  const POS_SHORT = Object.freeze(Object.fromEntries(POS_OPTIONS.map(item => [item.value, item.short])));
  const LEGACY_TO_POS = Object.freeze({
    n: 'noun', noun: 'noun', v: 'verb', verb: 'verb', adj: 'adjective', adjective: 'adjective',
    adv: 'adverb', adverb: 'adverb', prep: 'preposition', preposition: 'preposition',
    conj: 'conjunction', conjunction: 'conjunction', pron: 'pronoun', pronoun: 'pronoun',
    det: 'determiner', determiner: 'determiner', 'phr v': 'phrasal-verb', 'phrasal verb': 'phrasal-verb',
    phr: 'phrase', phrase: 'phrase'
  });
  const MAX_SENSES = 8;
  const MAX_SYNONYMS = 20;

  function text(value) { return String(value == null ? '' : value).trim(); }
  function escapeHTML(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function normalizeSearch(value) {
    return text(value).toLocaleLowerCase('en-US').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  }
  function normalizePartOfSpeech(value) {
    const raw = normalizeSearch(value).replace(/\./g, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
    return LEGACY_TO_POS[raw] || (POS_SHORT[value] ? value : 'noun');
  }
  function posShort(value) { return POS_SHORT[normalizePartOfSpeech(value)] || 'n.'; }
  function hash(value) {
    let result = 2166136261;
    const source = String(value || '');
    for (let index = 0; index < source.length; index += 1) {
      result ^= source.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return (result >>> 0).toString(36);
  }
  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
  function stableId(prefix, seed, index) { return `${prefix}_${hash(`${seed}:${index}`)}`; }
  function cloneSafe(value) {
    if (typeof root?.structuredClone === 'function') return root.structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }
  function shuffle(items, rng) {
    const random = typeof rng === 'function' ? rng : Math.random;
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random() * (index + 1));
      [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy;
  }

  function createEmptySynonym() { return { id: uid('syn'), word: '', note: '' }; }
  function createEmptySense(partOfSpeech) {
    return { id: uid('sense'), partOfSpeech: normalizePartOfSpeech(partOfSpeech || 'noun'), meaning: '', example: '', synonyms: [] };
  }
  function createEmptyWord() {
    const now = Date.now();
    return {
      id: uid('word'), type: 'word', word: '', pronunciation: '', senses: [createEmptySense()],
      pos: 'n.', meaning: '', example: '', box: 1, sourceType: 'manual', createdAt: now, updatedAt: now,
      vocabSchemaVersion: 2
    };
  }

  function normalizeSynonym(raw, seed, index) {
    const value = typeof raw === 'string' ? { word: raw } : (raw || {});
    return {
      id: value.id || stableId('syn', seed, index),
      word: text(value.word),
      note: text(value.note)
    };
  }

  function normalizeSense(raw, seed, index) {
    const value = raw || {};
    const senseId = value.id || stableId('sense', seed, index);
    return {
      id: senseId,
      partOfSpeech: normalizePartOfSpeech(value.partOfSpeech || value.pos || 'noun'),
      meaning: text(value.meaning || value.translation || value.chinese),
      example: text(value.example || value.exampleSentence),
      synonyms: (Array.isArray(value.synonyms) ? value.synonyms : [])
        .map((synonym, synonymIndex) => normalizeSynonym(synonym, senseId, synonymIndex))
        .filter(synonym => synonym.word)
        .slice(0, MAX_SYNONYMS)
    };
  }

  function migrateVocabItem(item, index) {
    if (!item || typeof item !== 'object') return item;
    if (item.type === 'phrase') return { ...item };
    const word = text(item.word);
    const itemId = item.id != null && item.id !== '' ? item.id : stableId('word', `${word}:${item.createdAt || ''}`, index || 0);
    const sourceSenses = Array.isArray(item.senses) && item.senses.length
      ? item.senses
      : [{
        partOfSpeech: item.partOfSpeech || item.pos,
        meaning: item.meaning || item.translation || item.chinese,
        example: item.example || item.exampleSentence,
        synonyms: item.synonyms
      }];
    const senses = sourceSenses
      .map((sense, senseIndex) => normalizeSense(sense, itemId, senseIndex))
      .filter(sense => sense.meaning)
      .slice(0, MAX_SENSES);
    if (!senses.length) senses.push(normalizeSense({ partOfSpeech: item.pos || 'noun' }, itemId, 0));
    const primary = senses[0];
    return {
      ...item,
      id: itemId,
      type: item.type || 'word',
      word,
      pronunciation: text(item.pronunciation),
      senses,
      pos: posShort(primary.partOfSpeech),
      meaning: primary.meaning,
      example: primary.example,
      box: Math.max(1, Math.min(3, Number(item.box) || 1)),
      sourceType: item.sourceType || item.source || 'legacy',
      createdAt: Number(item.createdAt) || Number(item.updatedAt) || Date.now(),
      updatedAt: Number(item.updatedAt) || Number(item.createdAt) || Date.now(),
      vocabSchemaVersion: 2
    };
  }

  function migrateAllVocabulary(vocabulary) {
    if (!Array.isArray(vocabulary)) return [];
    return vocabulary.map((item, index) => migrateVocabItem(item, index)).filter(Boolean);
  }

  function finalizeDraft(draft) {
    const migrated = migrateVocabItem(draft);
    migrated.senses = migrated.senses
      .map((sense, senseIndex) => ({
        ...sense,
        id: sense.id || stableId('sense', migrated.id, senseIndex),
        meaning: text(sense.meaning),
        example: text(sense.example),
        synonyms: (sense.synonyms || [])
          .map((synonym, synonymIndex) => normalizeSynonym(synonym, sense.id || migrated.id, synonymIndex))
          .filter(synonym => synonym.word)
      }))
      .filter(sense => sense.meaning);
    const primary = migrated.senses[0];
    migrated.pos = posShort(primary?.partOfSpeech);
    migrated.meaning = primary?.meaning || '';
    migrated.example = primary?.example || '';
    migrated.updatedAt = Date.now();
    migrated.vocabSchemaVersion = 2;
    return migrated;
  }

  function readSenses(item) {
    if (item?.type === 'phrase') {
      return [normalizeSense({ partOfSpeech: 'phrase', meaning: item.meaning, example: item.example, synonyms: item.synonyms }, item.id || item.word, 0)];
    }
    return migrateVocabItem(item)?.senses || [];
  }

  function getAllSensePool(vocabulary) {
    const result = [];
    (Array.isArray(vocabulary) ? vocabulary : []).forEach((raw, itemIndex) => {
      if (!raw || !text(raw.word)) return;
      const item = raw.type === 'phrase' ? raw : migrateVocabItem(raw, itemIndex);
      readSenses(item).forEach((sense, senseIndex) => {
        if (!sense.meaning) return;
        result.push({
          wordId: item.id,
          word: text(item.word),
          pronunciation: text(item.pronunciation),
          senseId: sense.id || stableId('sense', item.id || item.word, senseIndex),
          partOfSpeech: normalizePartOfSpeech(sense.partOfSpeech),
          pos: posShort(sense.partOfSpeech),
          meaning: text(sense.meaning),
          example: text(sense.example),
          synonyms: Array.isArray(sense.synonyms) ? sense.synonyms : [],
          sourceType: item.sourceType || item.source || 'legacy'
        });
      });
    });
    return result;
  }

  function getSynonymQuizPool(vocabulary) {
    return getAllSensePool(vocabulary).filter(entry => entry.synonyms.some(synonym => text(synonym.word)));
  }

  function createSynonymQuestion(vocabulary, rng) {
    const random = typeof rng === 'function' ? rng : Math.random;
    const pool = getSynonymQuizPool(vocabulary);
    const allSynonyms = [...new Set(pool.flatMap(entry => entry.synonyms.map(synonym => text(synonym.word))).filter(Boolean))];
    if (!pool.length || allSynonyms.length < 4) return null;
    const candidates = shuffle(pool, random);
    for (const entry of candidates) {
      const correctSynonyms = entry.synonyms.filter(synonym => text(synonym.word));
      if (!correctSynonyms.length) continue;
      const correct = correctSynonyms[Math.floor(random() * correctSynonyms.length)];
      const wrong = shuffle(allSynonyms.filter(word => normalizeSearch(word) !== normalizeSearch(correct.word)), random).slice(0, 3);
      if (wrong.length < 3) continue;
      return {
        type: 'synonym', prompt: entry.word, wordId: entry.wordId, senseId: entry.senseId,
        partOfSpeech: entry.partOfSpeech, pos: entry.pos, meaning: entry.meaning,
        correct: correct.word, note: correct.note || '', options: shuffle([correct.word, ...wrong], random)
      };
    }
    return null;
  }

  function matchesSearch(item, query) {
    const needle = normalizeSearch(query);
    if (!needle) return true;
    const values = [item?.word, item?.pronunciation, item?.meaning, item?.example, item?.pos];
    readSenses(item).forEach(sense => {
      values.push(sense.partOfSpeech, posShort(sense.partOfSpeech), sense.meaning, sense.example);
      (sense.synonyms || []).forEach(synonym => values.push(synonym.word, synonym.note));
    });
    return values.some(value => normalizeSearch(value).includes(needle));
  }

  function renderWordCard(raw) {
    const word = raw?.type === 'phrase' ? migrateVocabItem({ ...raw, type: 'word', pos: 'phr.' }) : migrateVocabItem(raw);
    if (!word) return '';
    const main = word.senses[0] || {};
    const synonyms = (main.synonyms || []).slice(0, 3);
    return `<article class="vocab-v2-card" data-vocab-id="${escapeHTML(String(word.id))}">
      <button type="button" class="vocab-v2-card-main" data-vocab-action="detail" data-vocab-key="${escapeHTML(encodeURIComponent(String(word.id)))}">
        <span class="vocab-v2-card-heading"><span><strong>${escapeHTML(word.word)}</strong>${word.pronunciation ? `<small>${escapeHTML(word.pronunciation)}</small>` : ''}</span>${word.senses.length > 1 ? `<i>${word.senses.length} 個意思</i>` : ''}</span>
        <span class="vocab-v2-main-meaning"><b>${escapeHTML(posShort(main.partOfSpeech))}</b><span>${escapeHTML(main.meaning)}</span><em>★${word.box || 1}</em></span>
        ${synonyms.length ? `<span class="vocab-v2-syn-preview">${synonyms.map(synonym => `<i>${escapeHTML(synonym.word)}</i>`).join('')}</span>` : ''}
        ${word.senses.length > 1 ? `<small class="vocab-v2-more">另有 ${word.senses.length - 1} 個詞性／意思</small>` : ''}
      </button>
      <span class="vocab-v2-card-actions">
        <button type="button" data-vocab-action="speak" data-vocab-key="${escapeHTML(encodeURIComponent(String(word.id)))}" aria-label="朗讀 ${escapeHTML(word.word)}">🔊</button>
        <button type="button" data-vocab-action="edit" data-vocab-key="${escapeHTML(encodeURIComponent(String(word.id)))}" aria-label="編輯 ${escapeHTML(word.word)}">編輯</button>
        <button type="button" class="is-danger" data-vocab-action="delete" data-vocab-key="${escapeHTML(encodeURIComponent(String(word.id)))}" aria-label="刪除 ${escapeHTML(word.word)}">刪除</button>
      </span>
    </article>`;
  }

  function renderWordDetail(raw) {
    const word = raw?.type === 'phrase' ? migrateVocabItem({ ...raw, type: 'word', pos: 'phr.' }) : migrateVocabItem(raw);
    if (!word) return '';
    return `<section class="vocab-v2-detail">
      <header><span>VOCABULARY</span><h2>${escapeHTML(word.word)}</h2>${word.pronunciation ? `<p>${escapeHTML(word.pronunciation)}</p>` : ''}</header>
      <div class="vocab-v2-detail-senses">${word.senses.map(sense => `<article>
        <b>${escapeHTML(posShort(sense.partOfSpeech))}</b><div><strong>${escapeHTML(sense.meaning)}</strong>
        ${sense.example ? `<p>“${escapeHTML(sense.example)}”</p>` : ''}
        ${(sense.synonyms || []).length ? `<div class="vocab-v2-detail-synonyms"><span>SYNONYMS</span>${sense.synonyms.map(synonym => `<i><b>${escapeHTML(synonym.word)}</b>${synonym.note ? `<small>${escapeHTML(synonym.note)}</small>` : ''}</i>`).join('')}</div>` : ''}
        </div></article>`).join('')}</div>
    </section>`;
  }

  let draft = null;
  let editMode = false;
  let editingId = null;
  let onSave = null;
  let detailCallbacks = null;
  let quizState = null;
  let eventsBound = false;

  function ensureRoots() {
    if (typeof document === 'undefined') return null;
    if (!document.getElementById('vocabEditorV2')) {
      document.body.insertAdjacentHTML('beforeend', `<div class="vocab-v2-overlay" id="vocabEditorV2" aria-hidden="true"><section class="vocab-v2-sheet" role="dialog" aria-modal="true" aria-labelledby="vocabV2Title">
        <div class="vocab-v2-grabber"></div><header class="vocab-v2-header"><button type="button" data-vocab-editor-close aria-label="關閉">✕</button><div><span>VOCABULARY</span><h2 id="vocabV2Title">新增單字</h2></div><button type="button" data-vocab-editor-save>儲存</button></header>
        <main class="vocab-v2-body"><div class="vocab-v2-word-section"><label><span>英文單字／片語</span><input id="vocabV2Word" maxlength="80" autocomplete="off" placeholder="例如 record"></label><label><span>發音（選填）</span><input id="vocabV2Pronunciation" maxlength="100" autocomplete="off" placeholder="/ˈrek.ərd/"></label></div><div id="vocabV2SenseList" class="vocab-v2-sense-list"></div><button type="button" class="vocab-v2-add-sense" data-add-sense>＋ 新增另一個詞性／意思</button><p class="vocab-v2-error" id="vocabV2Error"></p></main>
        <footer class="vocab-v2-footer"><button type="button" data-vocab-editor-save>儲存單字</button></footer></section></div>`);
    }
    if (!document.getElementById('vocabDetailV2')) {
      document.body.insertAdjacentHTML('beforeend', `<div class="vocab-v2-overlay" id="vocabDetailV2" aria-hidden="true"><section class="vocab-v2-sheet vocab-v2-detail-sheet" role="dialog" aria-modal="true"><div class="vocab-v2-grabber"></div><header class="vocab-v2-header"><button type="button" data-vocab-detail-close aria-label="關閉">✕</button><div><span>WORD DETAIL</span><h2>單字詳情</h2></div><span></span></header><main class="vocab-v2-body" id="vocabV2DetailBody"></main><footer class="vocab-v2-footer vocab-v2-detail-actions"><button type="button" data-vocab-detail-edit>編輯</button><button type="button" class="is-danger" data-vocab-detail-delete>刪除</button></footer></section></div>`);
    }
    if (!document.getElementById('vocabSynonymV2')) {
      document.body.insertAdjacentHTML('beforeend', `<div class="vocab-v2-overlay" id="vocabSynonymV2" aria-hidden="true"><section class="vocab-v2-sheet vocab-v2-quiz-sheet" role="dialog" aria-modal="true"><div class="vocab-v2-grabber"></div><header class="vocab-v2-header"><button type="button" data-vocab-quiz-close aria-label="關閉">✕</button><div><span>SYNONYM CHALLENGE</span><h2>同義詞挑戰</h2></div><b id="vocabSynonymProgress">1 / 10</b></header><main class="vocab-v2-body" id="vocabSynonymBody"></main><footer class="vocab-v2-footer"><button type="button" data-vocab-quiz-next hidden>下一題</button></footer></section></div>`);
    }
    bindEvents();
    return document.getElementById('vocabEditorV2');
  }

  function lockPage(locked) {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('vocab-v2-lock', locked);
  }
  function showOverlay(id, visible) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.toggle('is-open', visible);
    overlay.setAttribute('aria-hidden', visible ? 'false' : 'true');
    lockPage(visible || !!document.querySelector('.vocab-v2-overlay.is-open'));
  }

  function syncInputs() {
    if (!draft || typeof document === 'undefined') return;
    draft.word = text(document.getElementById('vocabV2Word')?.value);
    draft.pronunciation = text(document.getElementById('vocabV2Pronunciation')?.value);
    draft.senses.forEach(sense => {
      sense.partOfSpeech = document.querySelector(`[data-sense-pos="${sense.id}"]`)?.value || sense.partOfSpeech;
      sense.meaning = text(document.querySelector(`[data-sense-meaning="${sense.id}"]`)?.value);
      sense.example = text(document.querySelector(`[data-sense-example="${sense.id}"]`)?.value);
      sense.synonyms.forEach(synonym => {
        synonym.word = text(document.querySelector(`[data-syn-word="${sense.id}:${synonym.id}"]`)?.value);
        synonym.note = text(document.querySelector(`[data-syn-note="${sense.id}:${synonym.id}"]`)?.value);
      });
    });
  }

  function renderSenseList() {
    const container = document.getElementById('vocabV2SenseList');
    if (!container || !draft) return;
    container.innerHTML = draft.senses.map((sense, index) => `<article class="vocab-v2-sense" data-sense="${escapeHTML(sense.id)}"><header><div><span>MEANING ${index + 1}</span><strong>${escapeHTML(posShort(sense.partOfSpeech))} ${escapeHTML(sense.meaning || '新增意思')}</strong></div>${draft.senses.length > 1 ? `<button type="button" data-remove-sense="${escapeHTML(sense.id)}">移除</button>` : ''}</header>
      <div class="vocab-v2-grid"><label><span>詞性</span><select data-sense-pos="${escapeHTML(sense.id)}">${POS_OPTIONS.map(option => `<option value="${option.value}"${option.value === sense.partOfSpeech ? ' selected' : ''}>${escapeHTML(option.label)}</option>`).join('')}</select></label><label><span>中文意思</span><input maxlength="160" data-sense-meaning="${escapeHTML(sense.id)}" value="${escapeHTML(sense.meaning)}" placeholder="例如：紀錄、記錄"></label></div>
      <label><span>例句（選填）</span><textarea maxlength="400" rows="2" data-sense-example="${escapeHTML(sense.id)}" placeholder="The company keeps a record of all sales.">${escapeHTML(sense.example)}</textarea></label>
      <div class="vocab-v2-synonym-section"><header><div><b>SYNONYMS</b><small>只屬於這個詞性／意思</small></div><button type="button" data-add-synonym="${escapeHTML(sense.id)}">＋ 新增</button></header><div>${sense.synonyms.length ? sense.synonyms.map(synonym => `<span class="vocab-v2-syn-row"><input maxlength="80" data-syn-word="${escapeHTML(`${sense.id}:${synonym.id}`)}" value="${escapeHTML(synonym.word)}" placeholder="同義詞"><input maxlength="160" data-syn-note="${escapeHTML(`${sense.id}:${synonym.id}`)}" value="${escapeHTML(synonym.note)}" placeholder="使用差異／備註"><button type="button" data-remove-syn="${escapeHTML(`${sense.id}:${synonym.id}`)}" aria-label="移除同義詞">✕</button></span>`).join('') : '<p>尚未加入同義詞</p>'}</div></div>
    </article>`).join('');
  }

  function renderEditor() {
    if (!draft) return;
    document.getElementById('vocabV2Title').textContent = editMode ? '編輯單字' : '新增單字';
    document.getElementById('vocabV2Word').value = draft.word || '';
    document.getElementById('vocabV2Pronunciation').value = draft.pronunciation || '';
    document.getElementById('vocabV2Error').textContent = '';
    renderSenseList();
  }

  function open(options) {
    ensureRoots();
    const item = options?.item || null;
    editMode = !!item;
    editingId = item?.id ?? null;
    draft = item ? cloneSafe(migrateVocabItem(item)) : createEmptyWord();
    onSave = typeof options?.onSave === 'function' ? options.onSave : null;
    renderEditor();
    showOverlay('vocabEditorV2', true);
    setTimeout(() => document.getElementById('vocabV2Word')?.focus(), 30);
  }
  function close() { showOverlay('vocabEditorV2', false); draft = null; onSave = null; }

  function saveDraft() {
    syncInputs();
    const error = document.getElementById('vocabV2Error');
    if (!draft.word) { error.textContent = '請輸入英文單字或片語。'; return; }
    const validSenses = draft.senses.filter(sense => text(sense.meaning));
    if (!validSenses.length) { error.textContent = '至少需要一個中文意思。'; return; }
    draft.senses = validSenses;
    const saved = finalizeDraft(draft);
    const accepted = onSave ? onSave(cloneSafe(saved), { mode: editMode ? 'edit' : 'create', editingId }) : true;
    if (accepted !== false) close();
  }

  function addSense() {
    syncInputs();
    if (draft.senses.length >= MAX_SENSES) { document.getElementById('vocabV2Error').textContent = `每個單字最多 ${MAX_SENSES} 個意思。`; return; }
    draft.senses.push(createEmptySense());
    renderSenseList();
  }
  function removeSense(id) {
    if (draft.senses.length <= 1) return;
    syncInputs(); draft.senses = draft.senses.filter(sense => sense.id !== id); renderSenseList();
  }
  function addSynonym(senseId) {
    syncInputs();
    const sense = draft.senses.find(item => item.id === senseId);
    if (!sense || sense.synonyms.length >= MAX_SYNONYMS) return;
    sense.synonyms.push(createEmptySynonym()); renderSenseList();
  }
  function removeSynonym(key) {
    syncInputs();
    const separator = key.indexOf(':');
    const senseId = key.slice(0, separator); const synonymId = key.slice(separator + 1);
    const sense = draft.senses.find(item => item.id === senseId);
    if (!sense) return;
    sense.synonyms = sense.synonyms.filter(item => item.id !== synonymId); renderSenseList();
  }

  function openDetail(options) {
    ensureRoots();
    detailCallbacks = options || {};
    document.getElementById('vocabV2DetailBody').innerHTML = renderWordDetail(options?.item);
    showOverlay('vocabDetailV2', true);
  }
  function closeDetail() { showOverlay('vocabDetailV2', false); detailCallbacks = null; }

  function renderSynonymQuestion() {
    const body = document.getElementById('vocabSynonymBody');
    const next = document.querySelector('[data-vocab-quiz-next]');
    if (!quizState || !body) return;
    delete next.dataset.finish;
    const question = createSynonymQuestion(quizState.vocabulary);
    quizState.question = question;
    if (!question) {
      body.innerHTML = '<div class="vocab-v2-quiz-empty"><strong>還不能開始</strong><p>至少需要 4 個不同同義詞，且要分散在可辨識的義項中。</p></div>';
      next.hidden = true; return;
    }
    document.getElementById('vocabSynonymProgress').textContent = `${quizState.step + 1} / ${quizState.total}`;
    body.innerHTML = `<div class="vocab-v2-quiz-question"><span>SYNONYM</span><h3>${escapeHTML(question.prompt)}</h3><p>${escapeHTML(question.pos)} · ${escapeHTML(question.meaning)}</p><strong>哪個字的意思最接近？</strong></div><div class="vocab-v2-quiz-options">${question.options.map((option, index) => `<button type="button" data-synonym-answer="${index}"><i>${String.fromCharCode(65 + index)}</i><span>${escapeHTML(option)}</span></button>`).join('')}</div><div id="vocabSynonymFeedback" class="vocab-v2-quiz-feedback" hidden></div>`;
    next.hidden = true;
  }
  function openSynonymChallenge(vocabulary, options) {
    ensureRoots();
    quizState = { vocabulary: migrateAllVocabulary(vocabulary), step: 0, total: Math.max(1, Number(options?.questions) || 10), score: 0, answered: false };
    showOverlay('vocabSynonymV2', true); renderSynonymQuestion();
  }
  function closeSynonymChallenge() { showOverlay('vocabSynonymV2', false); quizState = null; }
  function answerSynonym(index) {
    if (!quizState || quizState.answered || !quizState.question) return;
    quizState.answered = true;
    const selected = quizState.question.options[Number(index)];
    const correct = normalizeSearch(selected) === normalizeSearch(quizState.question.correct);
    if (correct) quizState.score += 1;
    document.querySelectorAll('[data-synonym-answer]').forEach(button => {
      const value = quizState.question.options[Number(button.dataset.synonymAnswer)];
      button.disabled = true;
      button.classList.toggle('is-correct', normalizeSearch(value) === normalizeSearch(quizState.question.correct));
      button.classList.toggle('is-wrong', value === selected && !correct);
    });
    const feedback = document.getElementById('vocabSynonymFeedback');
    feedback.hidden = false;
    feedback.innerHTML = `<strong>${correct ? '答對了 ✓' : `正確答案：${escapeHTML(quizState.question.correct)}`}</strong>${quizState.question.note ? `<p>${escapeHTML(quizState.question.note)}</p>` : ''}`;
    const next = document.querySelector('[data-vocab-quiz-next]');
    next.hidden = false; next.textContent = quizState.step + 1 >= quizState.total ? '查看結果' : '下一題';
  }
  function nextSynonymQuestion() {
    if (!quizState?.answered) return;
    quizState.step += 1;
    if (quizState.step >= quizState.total) {
      document.getElementById('vocabSynonymProgress').textContent = '完成';
      document.getElementById('vocabSynonymBody').innerHTML = `<div class="vocab-v2-quiz-result"><span>RESULT</span><strong>${quizState.score} / ${quizState.total}</strong><p>${quizState.score === quizState.total ? '全部答對，太強了！' : '可以回到單字詳情補充更多使用差異。'}</p></div>`;
      const next = document.querySelector('[data-vocab-quiz-next]'); next.textContent = '完成'; next.dataset.finish = 'true';
      return;
    }
    quizState.answered = false; renderSynonymQuestion();
  }

  function bindEvents() {
    if (eventsBound || typeof document === 'undefined') return;
    eventsBound = true;
    document.addEventListener('click', event => {
      const target = event.target;
      if (target.closest('[data-vocab-editor-close]')) return close();
      if (target.closest('[data-vocab-editor-save]')) return saveDraft();
      if (target.closest('[data-add-sense]')) return addSense();
      const removeSenseButton = target.closest('[data-remove-sense]');
      if (removeSenseButton) return removeSense(removeSenseButton.dataset.removeSense);
      const addSynonymButton = target.closest('[data-add-synonym]');
      if (addSynonymButton) return addSynonym(addSynonymButton.dataset.addSynonym);
      const removeSynonymButton = target.closest('[data-remove-syn]');
      if (removeSynonymButton) return removeSynonym(removeSynonymButton.dataset.removeSyn);
      if (target.closest('[data-vocab-detail-close]')) return closeDetail();
      if (target.closest('[data-vocab-detail-edit]')) { const callback = detailCallbacks?.onEdit; closeDetail(); callback?.(); return; }
      if (target.closest('[data-vocab-detail-delete]')) { const callback = detailCallbacks?.onDelete; closeDetail(); callback?.(); return; }
      if (target.closest('[data-vocab-quiz-close]')) return closeSynonymChallenge();
      const answer = target.closest('[data-synonym-answer]');
      if (answer) return answerSynonym(answer.dataset.synonymAnswer);
      const next = target.closest('[data-vocab-quiz-next]');
      if (next) return next.dataset.finish === 'true' ? closeSynonymChallenge() : nextSynonymQuestion();
      if (target.classList?.contains('vocab-v2-overlay')) {
        if (target.id === 'vocabEditorV2') close();
        if (target.id === 'vocabDetailV2') closeDetail();
        if (target.id === 'vocabSynonymV2') closeSynonymChallenge();
      }
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (document.getElementById('vocabEditorV2')?.classList.contains('is-open')) close();
      else if (document.getElementById('vocabDetailV2')?.classList.contains('is-open')) closeDetail();
      else if (document.getElementById('vocabSynonymV2')?.classList.contains('is-open')) closeSynonymChallenge();
    });
  }

  return Object.freeze({
    POS_OPTIONS, POS_SHORT, normalizePartOfSpeech, posShort,
    createEmptyWord, createEmptySense, createEmptySynonym,
    migrateVocabItem, migrateAllVocabulary, finalizeDraft,
    getAllSensePool, getSynonymQuizPool, createSynonymQuestion, matchesSearch,
    renderWordCard, renderWordDetail,
    open, close, openDetail, closeDetail, openSynonymChallenge, closeSynonymChallenge
  });
});

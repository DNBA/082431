/* ToeicQuest Study Notes — lightweight, offline notes for TRAIN. */
(function (global, factory) {
  const api = factory(global || {});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global) global.StudyNotes = api;
})(typeof window !== 'undefined' ? window : globalThis, function (global) {
  'use strict';

  const FONT_SIZES = new Set(['small', 'normal', 'large']);
  const DEFAULT_STORE = Object.freeze({ notes: [], fontSize: 'normal', draft: null });
  const ui = { query: '', editorTimer: null, activeNoteId: null, mode: null, editorDirty: false, deleteArmed: false };

  function cleanText(value) {
    return String(value == null ? '' : value).replace(/\r\n?/g, '\n');
  }

  function normalizeNote(note, index) {
    const source = note && typeof note === 'object' ? note : {};
    const fallbackDate = new Date(0).toISOString();
    return {
      id: cleanText(source.id || `legacy-note-${index}`).trim(),
      title: cleanText(source.title).trim(),
      content: cleanText(source.content),
      pinned: source.pinned === true,
      createdAt: Number.isFinite(Date.parse(source.createdAt)) ? source.createdAt : fallbackDate,
      updatedAt: Number.isFinite(Date.parse(source.updatedAt)) ? source.updatedAt : fallbackDate
    };
  }

  function normalizeDraft(draft) {
    if (!draft || typeof draft !== 'object') return null;
    const title = cleanText(draft.title);
    const content = cleanText(draft.content);
    if (!title.trim() && !content.trim()) return null;
    return {
      noteId: draft.noteId ? cleanText(draft.noteId) : null,
      title,
      content,
      updatedAt: Number.isFinite(Date.parse(draft.updatedAt)) ? draft.updatedAt : new Date().toISOString()
    };
  }

  function normalizeStore(input) {
    const source = input && typeof input === 'object' ? input : DEFAULT_STORE;
    const ids = new Set();
    const notes = (Array.isArray(source.notes) ? source.notes : [])
      .map(normalizeNote)
      .filter(note => {
        if (!note.id || ids.has(note.id)) return false;
        ids.add(note.id);
        return true;
      });
    return {
      notes,
      fontSize: FONT_SIZES.has(source.fontSize) ? source.fontSize : 'normal',
      draft: normalizeDraft(source.draft)
    };
  }

  function sortNotes(notes) {
    return [...(notes || [])].sort((a, b) =>
      Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
      Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0)
    );
  }

  function filterNotes(notes, query) {
    const needle = cleanText(query).trim().toLocaleLowerCase('zh-TW');
    if (!needle) return sortNotes(notes);
    return sortNotes(notes).filter(note =>
      `${note.title}\n${note.content}`.toLocaleLowerCase('zh-TW').includes(needle)
    );
  }

  function createNoteId(now) {
    if (global.crypto?.randomUUID) return `note-${global.crypto.randomUUID()}`;
    return `note-${Number(now || Date.now()).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function formatUpdatedAt(value, nowValue) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date(nowValue || Date.now());
    const sameDay = date.getFullYear() === now.getFullYear()
      && date.getMonth() === now.getMonth()
      && date.getDate() === now.getDate();
    if (sameDay) return `今天 ${new Intl.DateTimeFormat('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)}`;
    return new Intl.DateTimeFormat('zh-TW', {
      month: 'short', day: 'numeric',
      ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' })
    }).format(date);
  }

  function getStore() {
    const source = typeof global.getStudyNotesState === 'function'
      ? global.getStudyNotesState()
      : DEFAULT_STORE;
    return normalizeStore(source);
  }

  function persist(store, options) {
    const normalized = normalizeStore(store);
    if (typeof global.updateStudyNotesState === 'function') {
      global.updateStudyNotesState(normalized, options || {});
    }
    return normalized;
  }

  function textElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    return element;
  }

  function previewText(note) {
    const compact = cleanText(note.content).replace(/\s+/g, ' ').trim();
    return compact || '只有標題，尚未加入內文。';
  }

  function renderNoteCard(note) {
    const card = document.createElement('article');
    card.className = `study-note-card${note.pinned ? ' is-pinned' : ''}`;
    card.dataset.noteId = note.id;

    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'study-note-card__open';
    open.dataset.noteOpen = note.id;
    open.setAttribute('aria-label', `開啟便條：${note.title || '未命名便條'}`);

    const heading = document.createElement('div');
    heading.className = 'study-note-card__heading';
    heading.appendChild(textElement('h3', '', note.title || '未命名便條'));
    if (note.pinned) heading.appendChild(textElement('span', 'study-note-card__pinned', 'PINNED'));
    open.appendChild(heading);
    open.appendChild(textElement('p', 'study-note-card__preview', previewText(note)));
    open.appendChild(textElement('time', 'study-note-card__time', formatUpdatedAt(note.updatedAt)));

    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'study-note-card__pin';
    pin.dataset.notePin = note.id;
    pin.setAttribute('aria-label', note.pinned ? `取消釘選 ${note.title}` : `釘選 ${note.title}`);
    pin.setAttribute('aria-pressed', String(note.pinned));
    pin.textContent = note.pinned ? '★' : '☆';

    card.append(open, pin);
    return card;
  }

  function render() {
    if (typeof document === 'undefined') return;
    const mount = document.getElementById('studyNotesMount');
    if (!mount) return;
    const store = getStore();
    const notes = filterNotes(store.notes, ui.query);
    mount.dataset.fontSize = store.fontSize;
    const sheet = document.getElementById('studyNoteSheet');
    if (sheet) sheet.dataset.fontSize = store.fontSize;
    mount.replaceChildren();

    const header = document.createElement('header');
    header.className = 'study-notes__header';
    const titleWrap = document.createElement('div');
    titleWrap.append(
      textElement('p', 'study-notes__eyebrow', 'COMMUTE NOTES'),
      textElement('h2', '', '便條紙'),
      textElement('small', '', `${store.notes.length} 則 · 儲存在目前 ToeicQuest 存檔`)
    );
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'study-notes__add';
    add.dataset.noteNew = 'true';
    add.innerHTML = '<span aria-hidden="true">＋</span><span>新增</span>';
    header.append(titleWrap, add);

    const toolbar = document.createElement('div');
    toolbar.className = 'study-notes__toolbar';
    const search = document.createElement('label');
    search.className = 'study-notes__search';
    search.innerHTML = '<span aria-hidden="true">⌕</span>';
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.placeholder = '搜尋主題或內文';
    searchInput.autocomplete = 'off';
    searchInput.value = ui.query;
    searchInput.dataset.noteSearch = 'true';
    search.appendChild(searchInput);

    const sizeGroup = document.createElement('div');
    sizeGroup.className = 'study-notes__sizes';
    sizeGroup.setAttribute('aria-label', '閱讀字體大小');
    [['small', '小'], ['normal', '標準'], ['large', '大']].forEach(([value, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.noteFont = value;
      button.classList.toggle('is-active', store.fontSize === value);
      button.setAttribute('aria-pressed', String(store.fontSize === value));
      button.textContent = label;
      sizeGroup.appendChild(button);
    });
    toolbar.append(search, sizeGroup);

    mount.append(header, toolbar);

    if (store.draft) {
      const draft = document.createElement('div');
      draft.className = 'study-notes__draft';
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.dataset.noteResumeDraft = 'true';
      copy.append(
        textElement('strong', '', '草稿已保留'),
        textElement('span', '', store.draft.title.trim() || previewText(store.draft).slice(0, 38))
      );
      const clear = document.createElement('button');
      clear.type = 'button';
      clear.className = 'study-notes__draft-clear';
      clear.dataset.noteClearDraft = 'true';
      clear.textContent = '清除';
      draft.append(copy, clear);
      mount.appendChild(draft);
    }

    const list = document.createElement('div');
    list.className = 'study-notes__list';
    list.setAttribute('aria-live', 'polite');
    if (!notes.length) {
      const empty = document.createElement('section');
      empty.className = 'study-notes__empty';
      empty.append(
        textElement('span', '', ui.query ? '⌕' : '✎'),
        textElement('h3', '', ui.query ? '找不到符合的便條' : '先記下第一則內容'),
        textElement('p', '', ui.query ? '換個關鍵字，或清除搜尋後再看看。' : '適合放通勤時想複習的重點、句型與提醒。')
      );
      if (!ui.query) {
        const emptyAdd = document.createElement('button');
        emptyAdd.type = 'button';
        emptyAdd.dataset.noteNew = 'true';
        emptyAdd.textContent = '新增便條';
        empty.appendChild(emptyAdd);
      }
      list.appendChild(empty);
    } else {
      notes.forEach(note => list.appendChild(renderNoteCard(note)));
    }
    mount.appendChild(list);
  }

  function ensureSheet() {
    let sheet = document.getElementById('studyNoteSheet');
    if (sheet) return sheet;
    sheet = document.createElement('div');
    sheet.id = 'studyNoteSheet';
    sheet.className = 'study-note-sheet';
    sheet.hidden = true;
    sheet.innerHTML = '<button type="button" class="study-note-sheet__backdrop" data-note-close aria-label="關閉"></button><section class="study-note-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="studyNoteSheetTitle"><div class="study-note-sheet__handle" aria-hidden="true"></div><div id="studyNoteSheetContent"></div></section>';
    document.body.appendChild(sheet);
    return sheet;
  }

  function showSheet() {
    const sheet = ensureSheet();
    sheet.hidden = false;
    requestAnimationFrame(() => sheet.classList.add('is-open'));
    document.body.classList.add('study-note-sheet-open');
    return sheet.querySelector('#studyNoteSheetContent');
  }

  function clearEditorTimer() {
    if (ui.editorTimer) global.clearTimeout(ui.editorTimer);
    ui.editorTimer = null;
  }

  function saveDraftFromEditor(renderAfter) {
    const sheet = document.getElementById('studyNoteSheet');
    const title = sheet?.querySelector('[data-note-editor-title]');
    const content = sheet?.querySelector('[data-note-editor-content]');
    if (!title || !content || ui.mode !== 'editor' || !ui.editorDirty) return;
    const store = getStore();
    store.draft = normalizeDraft({
      noteId: ui.activeNoteId,
      title: title.value,
      content: content.value,
      updatedAt: new Date().toISOString()
    });
    persist(store, { quiet: true });
    if (renderAfter) render();
  }

  function scheduleDraftSave() {
    clearEditorTimer();
    ui.editorTimer = global.setTimeout(() => saveDraftFromEditor(false), 280);
  }

  function closeSheet() {
    if (ui.mode === 'editor') {
      clearEditorTimer();
      saveDraftFromEditor(true);
    }
    const sheet = document.getElementById('studyNoteSheet');
    if (!sheet) return;
    sheet.classList.remove('is-open');
    document.body.classList.remove('study-note-sheet-open');
    global.setTimeout(() => { sheet.hidden = true; }, 180);
    ui.activeNoteId = null;
    ui.mode = null;
    ui.editorDirty = false;
    ui.deleteArmed = false;
  }

  function openEditor(noteId, useDraft) {
    const store = getStore();
    const note = noteId ? store.notes.find(item => item.id === noteId) : null;
    const draft = useDraft ? store.draft : (store.draft?.noteId === (note?.id || null) ? store.draft : null);
    const initial = draft || note || { title: '', content: '' };
    ui.activeNoteId = draft?.noteId || note?.id || null;
    ui.mode = 'editor';
    ui.editorDirty = Boolean(draft);
    ui.deleteArmed = false;
    const content = showSheet();
    content.replaceChildren();

    const header = document.createElement('header');
    header.className = 'study-note-sheet__header';
    const close = document.createElement('button');
    close.type = 'button';
    close.dataset.noteClose = 'true';
    close.textContent = '取消';
    const title = textElement('h2', '', note || draft?.noteId ? '編輯便條' : '新增便條');
    title.id = 'studyNoteSheetTitle';
    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'study-note-sheet__save';
    save.dataset.noteSave = 'true';
    save.textContent = '儲存';
    header.append(close, title, save);

    const form = document.createElement('div');
    form.className = 'study-note-editor';
    const titleLabel = textElement('label', '', '主題');
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.maxLength = 80;
    titleInput.placeholder = '例如：通勤複習重點';
    titleInput.value = initial.title || '';
    titleInput.dataset.noteEditorTitle = 'true';
    titleLabel.appendChild(titleInput);

    const bodyLabel = textElement('label', '', '內文');
    const textarea = document.createElement('textarea');
    textarea.maxLength = 12000;
    textarea.placeholder = '把想記住的內容寫在這裡…';
    textarea.value = initial.content || '';
    textarea.dataset.noteEditorContent = 'true';
    bodyLabel.appendChild(textarea);
    form.append(titleLabel, bodyLabel, textElement('p', 'study-note-editor__hint', '輸入內容會自動保留成草稿。'));
    content.append(header, form);
    global.setTimeout(() => (titleInput.value ? textarea : titleInput).focus(), 80);
  }

  function saveEditor() {
    clearEditorTimer();
    const sheet = document.getElementById('studyNoteSheet');
    const titleInput = sheet?.querySelector('[data-note-editor-title]');
    const bodyInput = sheet?.querySelector('[data-note-editor-content]');
    if (!titleInput || !bodyInput) return;
    const rawTitle = cleanText(titleInput.value).trim();
    const body = cleanText(bodyInput.value).trim();
    if (!rawTitle && !body) {
      titleInput.focus();
      if (typeof global.showToast === 'function') global.showToast('先輸入主題或內文。', 'warning');
      return;
    }

    const store = getStore();
    const now = new Date().toISOString();
    const fallbackTitle = body.split('\n').find(Boolean)?.trim().slice(0, 40) || '未命名便條';
    const index = ui.activeNoteId ? store.notes.findIndex(note => note.id === ui.activeNoteId) : -1;
    if (index >= 0) {
      store.notes[index] = { ...store.notes[index], title: rawTitle || fallbackTitle, content: body, updatedAt: now };
    } else {
      store.notes.unshift({
        id: createNoteId(), title: rawTitle || fallbackTitle, content: body,
        pinned: false, createdAt: now, updatedAt: now
      });
    }
    store.draft = null;
    persist(store);
    const savedId = index >= 0 ? store.notes[index].id : store.notes[0].id;
    ui.mode = null;
    ui.activeNoteId = null;
    ui.editorDirty = false;
    hideSheetImmediately();
    render();
    openDetail(savedId);
    if (typeof global.showToast === 'function') global.showToast('便條已儲存。', 'success');
  }

  function hideSheetImmediately() {
    const sheet = document.getElementById('studyNoteSheet');
    if (sheet) {
      sheet.classList.remove('is-open');
      sheet.hidden = true;
    }
    document.body.classList.remove('study-note-sheet-open');
  }

  function openDetail(noteId) {
    const store = getStore();
    const note = store.notes.find(item => item.id === noteId);
    if (!note) return;
    ui.activeNoteId = note.id;
    ui.mode = 'detail';
    ui.editorDirty = false;
    ui.deleteArmed = false;
    ensureSheet().dataset.fontSize = store.fontSize;
    const content = showSheet();
    content.replaceChildren();

    const header = document.createElement('header');
    header.className = 'study-note-sheet__header study-note-sheet__header--detail';
    const close = document.createElement('button');
    close.type = 'button';
    close.dataset.noteClose = 'true';
    close.textContent = '完成';
    const label = textElement('p', '', note.pinned ? '★ 已釘選' : '便條紙');
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.dataset.noteEdit = note.id;
    edit.textContent = '編輯';
    header.append(close, label, edit);

    const article = document.createElement('article');
    article.className = 'study-note-detail';
    const title = textElement('h2', '', note.title || '未命名便條');
    title.id = 'studyNoteSheetTitle';
    const time = textElement('time', '', `更新於 ${formatUpdatedAt(note.updatedAt)}`);
    const body = textElement('div', 'study-note-detail__body', note.content || '這則便條目前沒有內文。');
    article.append(title, time, body);

    const actions = document.createElement('footer');
    actions.className = 'study-note-detail__actions';
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.dataset.notePin = note.id;
    pin.textContent = note.pinned ? '取消釘選' : '釘選';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'is-danger';
    remove.dataset.noteDelete = note.id;
    remove.textContent = '刪除';
    actions.append(pin, remove);
    content.append(header, article, actions);
  }

  function togglePin(noteId) {
    const store = getStore();
    const note = store.notes.find(item => item.id === noteId);
    if (!note) return;
    note.pinned = !note.pinned;
    note.updatedAt = new Date().toISOString();
    persist(store);
    render();
    if (ui.mode === 'detail') openDetail(noteId);
  }

  function deleteNote(noteId, button) {
    if (!ui.deleteArmed) {
      ui.deleteArmed = true;
      if (button) button.textContent = '再按一次刪除';
      global.setTimeout(() => {
        ui.deleteArmed = false;
        if (button?.isConnected) button.textContent = '刪除';
      }, 2600);
      return;
    }
    const store = getStore();
    store.notes = store.notes.filter(note => note.id !== noteId);
    if (store.draft?.noteId === noteId) store.draft = null;
    persist(store);
    ui.mode = null;
    ui.activeNoteId = null;
    ui.editorDirty = false;
    hideSheetImmediately();
    render();
    if (typeof global.showToast === 'function') global.showToast('便條已刪除。', 'success');
  }

  function setFontSize(value) {
    if (!FONT_SIZES.has(value)) return;
    const store = getStore();
    store.fontSize = value;
    persist(store, { quiet: true });
    render();
  }

  function clearDraft() {
    const store = getStore();
    store.draft = null;
    persist(store, { quiet: true });
    render();
  }

  function handleClick(event) {
    const target = event.target.closest('[data-note-new],[data-note-open],[data-note-pin],[data-note-close],[data-note-save],[data-note-edit],[data-note-delete],[data-note-font],[data-note-resume-draft],[data-note-clear-draft]');
    if (!target) return;
    if (target.dataset.noteNew) openEditor(null, false);
    else if (target.dataset.noteOpen) openDetail(target.dataset.noteOpen);
    else if (target.dataset.notePin) togglePin(target.dataset.notePin);
    else if (target.dataset.noteClose !== undefined) closeSheet();
    else if (target.dataset.noteSave) saveEditor();
    else if (target.dataset.noteEdit) openEditor(target.dataset.noteEdit, false);
    else if (target.dataset.noteDelete) deleteNote(target.dataset.noteDelete, target);
    else if (target.dataset.noteFont) setFontSize(target.dataset.noteFont);
    else if (target.dataset.noteResumeDraft) openEditor(getStore().draft?.noteId || null, true);
    else if (target.dataset.noteClearDraft) clearDraft();
  }

  function handleInput(event) {
    if (event.target.matches('[data-note-search]')) {
      ui.query = event.target.value;
      render();
      document.querySelector('[data-note-search]')?.focus();
      return;
    }
    if (event.target.matches('[data-note-editor-title],[data-note-editor-content]')) {
      ui.editorDirty = true;
      scheduleDraftSave();
    }
  }

  function init() {
    if (typeof document === 'undefined') return;
    ensureSheet();
    document.addEventListener('click', handleClick);
    document.addEventListener('input', handleInput);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !document.getElementById('studyNoteSheet')?.hidden) closeSheet();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's' && ui.mode === 'editor') {
        event.preventDefault();
        saveEditor();
      }
    });
    global.addEventListener?.('pagehide', () => {
      clearEditorTimer();
      saveDraftFromEditor(false);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        clearEditorTimer();
        saveDraftFromEditor(false);
      }
    });
    render();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
  }

  return {
    normalizeNote, normalizeDraft, normalizeStore, sortNotes, filterNotes,
    createNoteId, formatUpdatedAt, render, openEditor, openDetail, setFontSize
  };
});

(function (global) {
  'use strict';

  function parseState(raw) {
    const value = JSON.parse(raw, (key, item) => ['__proto__', 'constructor', 'prototype'].includes(key) ? undefined : item);
    const candidate = value?.format === 'toeicquest-save' ? value.state : value;
    if (!candidate || Array.isArray(candidate) || typeof candidate !== 'object'
      || !Array.isArray(candidate.inventory) || !candidate.toeic || Array.isArray(candidate.toeic)
      || !Array.isArray(candidate.toeic.vocabList) || !candidate.season || Array.isArray(candidate.season) || typeof candidate.season !== 'object') {
      throw new Error('缺少完整的球員卡庫、單字庫或球季資料');
    }
    for (const field of ['tickets', 'scoutPoints']) {
      if (candidate[field] != null && (!Number.isFinite(Number(candidate[field])) || Number(candidate[field]) < 0)) {
        throw new Error('資源數量格式不正確');
      }
    }
    if (candidate.studyPlanner && (!Array.isArray(candidate.studyPlanner.tasks) || !Array.isArray(candidate.studyPlanner.logs))) {
      throw new Error('行事曆資料格式不正確');
    }
    return candidate;
  }

  function summarize(value) {
    return {
      cards: value.inventory?.length || 0,
      words: value.toeic?.vocabList?.length || 0,
      tasks: value.studyPlanner?.tasks?.length || 0,
      logs: (value.studyPlanner?.logs?.length || 0) + Object.keys(value.studyDetails || {}).length
    };
  }

  function createStore(storage, key, now = () => Date.now()) {
    const indexKey = `${key}_backups_v1`;
    const prefix = `${key}_snapshot_`;
    let sequence = 0;
    let lastAutoAt = 0;
    let lastAutoDay = '';

    function list() {
      try {
        const entries = JSON.parse(storage.getItem(indexKey) || '[]');
        return Array.isArray(entries) ? entries.filter(item => item && String(item.id).startsWith(prefix)).sort((a, b) => b.at - a.at) : [];
      } catch (_) { return []; }
    }

    function removeOldest() {
      const entries = list();
      const oldest = entries.pop();
      if (!oldest) return false;
      storage.removeItem(oldest.id);
      storage.setItem(indexKey, JSON.stringify(entries));
      return true;
    }

    function setWithPruning(target, raw) {
      while (true) {
        try { storage.setItem(target, raw); return; }
        catch (error) {
          if (!removeOldest()) throw error;
        }
      }
    }

    function snapshot(raw, label = '自動備份', force = false) {
      const at = now();
      const day = new Date(at).toLocaleDateString('en-CA');
      const latestAuto = list().find(item => item.label === '自動備份');
      if (!force && day === (lastAutoDay || (latestAuto && new Date(latestAuto.at).toLocaleDateString('en-CA')))
        && at - (lastAutoAt || latestAuto?.at || 0) < 15 * 60000) return null;
      const value = parseState(raw);
      const id = `${prefix}${at}_${++sequence}`;
      const entry = { id, at, label, ...summarize(value) };
      setWithPruning(id, raw);
      try {
        const entries = [entry, ...list()];
        while (entries.length > 4) storage.removeItem(entries.pop().id);
        while (true) {
          try { storage.setItem(indexKey, JSON.stringify(entries)); break; }
          catch (error) {
            const oldest = entries.pop();
            if (!oldest || oldest.id === id) throw error;
            storage.removeItem(oldest.id);
          }
        }
      } catch (error) {
        storage.removeItem(id);
        throw error;
      }
      if (label === '自動備份') { lastAutoAt = at; lastAutoDay = day; }
      return entry;
    }

    function read(id) {
      if (!list().some(item => item.id === id)) throw new Error('找不到這份備份');
      return parseState(storage.getItem(id));
    }

    function load() {
      let raw;
      try { raw = storage.getItem(key); }
      catch (error) { return { state: null, blocked: true, message: '瀏覽器目前無法讀取存檔，請匯入備份檔案。' }; }
      if (raw) {
        try { return { state: parseState(raw), blocked: false }; }
        catch (_) { /* Try valid snapshots without overwriting the damaged save. */ }
      }
      for (const entry of list()) {
        try { return { state: read(entry.id), recovered: entry, blocked: false }; }
        catch (_) { /* An older, valid snapshot may still be available. */ }
      }
      return { state: null, blocked: !!raw, message: raw ? '目前存檔無法讀取。原檔已保留，請從備份還原或匯入存檔。' : '' };
    }

    function save(value) {
      const raw = JSON.stringify(value);
      parseState(raw);
      const previous = storage.getItem(key);
      if (previous) {
        try { snapshot(previous); } catch (_) { /* A failed backup must not block the primary save. */ }
      }
      setWithPruning(key, raw);
      if (!list().length) {
        try { snapshot(raw); } catch (_) { /* Saving is still successful when only the main save fits. */ }
      }
      return true;
    }

    return { list, snapshot, read, load, save };
  }

  const api = { parseState, summarize, createStore };
  global.ToeicQuestSaveBackups = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

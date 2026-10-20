/* iPhone/PWA backup resilience: IndexedDB restore points + text transfer code. */
(() => {
  const DB_NAME = 'toeicquest-save-vault-v1';
  const STORE_NAME = 'snapshots';
  const MAX_ENTRIES = 4;
  const AUTO_SAVE_ID = 'vault_auto_current';
  let dbPromise = null;
  let pendingAutoRaw = '';
  let autoSaveTimer = 0;
  let autoSaveRunning = false;

  function openDb() {
    if (!window.indexedDB) return Promise.reject(new Error('此瀏覽器不支援大容量本機還原點'));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('無法開啟本機還原點資料庫'));
      request.onblocked = () => reject(new Error('請關閉其他 ToeicQuest 分頁後再試'));
    }).catch(error => {
      dbPromise = null;
      throw error;
    });
    return dbPromise;
  }

  async function listVault() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve((request.result || [])
        .sort((a, b) => Number(b.at || 0) - Number(a.at || 0))
        .map(({ raw, ...entry }) => ({ ...entry, source: 'vault' })));
      request.onerror = () => reject(request.error || new Error('無法讀取還原點'));
    });
  }

  async function readVault(id) {
    const db = await openDb();
    const entry = await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('無法讀取這個還原點'));
    });
    if (!entry?.raw) throw new Error('找不到這個還原點');
    return ToeicQuestSaveBackups.parseState(entry.raw);
  }

  async function deleteVault(ids) {
    if (!ids.length) return;
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      ids.forEach(id => store.delete(id));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('無法整理舊還原點'));
      tx.onabort = () => reject(tx.error || new Error('無法整理舊還原點'));
    });
  }

  async function writeVault(raw, label) {
    const candidate = ToeicQuestSaveBackups.parseState(raw);
    const entry = {
      id: `vault_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      at: Date.now(),
      label,
      raw,
      ...ToeicQuestSaveBackups.summarize(candidate)
    };
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(entry);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('無法建立本機還原點'));
      tx.onabort = () => reject(tx.error || new Error('無法建立本機還原點'));
    });
    const entries = await listVault();
    const manualEntries = entries.filter(item => item.id !== AUTO_SAVE_ID);
    await deleteVault(manualEntries.slice(MAX_ENTRIES).map(item => item.id));
    return entry;
  }

  async function writeAutoVault(raw) {
    const candidate = ToeicQuestSaveBackups.parseState(raw);
    const entry = {
      id: AUTO_SAVE_ID,
      at: Date.now(),
      label: '自動大容量存檔',
      raw,
      ...ToeicQuestSaveBackups.summarize(candidate)
    };
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(entry);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('無法更新自動大容量存檔'));
      tx.onabort = () => reject(tx.error || new Error('無法更新自動大容量存檔'));
    });
    return entry;
  }

  async function flushAutoSnapshot() {
    if (autoSaveRunning || !pendingAutoRaw) return;
    const raw = pendingAutoRaw;
    pendingAutoRaw = '';
    autoSaveRunning = true;
    try {
      await writeAutoVault(raw);
    } catch (error) {
      console.warn('Auto large-save snapshot failed:', error);
      if (!pendingAutoRaw) pendingAutoRaw = raw;
    } finally {
      autoSaveRunning = false;
      if (pendingAutoRaw && !autoSaveTimer) {
        autoSaveTimer = window.setTimeout(() => {
          autoSaveTimer = 0;
          flushAutoSnapshot();
        }, 2000);
      }
    }
  }

  function queueAutoSnapshot(raw) {
    pendingAutoRaw = String(raw || '');
    if (!pendingAutoRaw) return;
    if (autoSaveTimer) window.clearTimeout(autoSaveTimer);
    autoSaveTimer = window.setTimeout(() => {
      autoSaveTimer = 0;
      flushAutoSnapshot();
    }, 1200);
  }

  window.ToeicQuestSaveVault = {
    queueAutoSnapshot,
    flushAutoSnapshot,
    list: listVault,
    read: readVault
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (autoSaveTimer) window.clearTimeout(autoSaveTimer);
      autoSaveTimer = 0;
      flushAutoSnapshot();
    }
  });
  window.addEventListener('pagehide', () => {
    if (autoSaveTimer) window.clearTimeout(autoSaveTimer);
    autoSaveTimer = 0;
    flushAutoSnapshot();
  });

  function bytesToBase64(bytes) {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    }
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  async function encodeTransferCode(payload) {
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    if (typeof CompressionStream === 'function') {
      const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
      const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
      return `TQG1.${bytesToBase64(compressed)}`;
    }
    return `TQJ1.${bytesToBase64(bytes)}`;
  }

  async function decodeTransferCode(value) {
    const input = String(value || '').trim();
    if (!input) throw new Error('請先貼上換機碼');
    if (input.startsWith('{')) return JSON.parse(input);
    const dot = input.indexOf('.');
    const prefix = input.slice(0, dot);
    const body = input.slice(dot + 1).replace(/\s+/g, '');
    if (dot < 0 || !body || !['TQG1', 'TQJ1'].includes(prefix)) throw new Error('這不是有效的 ToeicQuest 換機碼');
    if (body.length > 20 * 1024 * 1024) throw new Error('換機碼過大，請改用備份檔');
    let bytes = base64ToBytes(body);
    if (prefix === 'TQG1') {
      if (typeof DecompressionStream !== 'function') throw new Error('此瀏覽器無法解壓縮換機碼，請改用備份檔');
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function setTransferStatus(message) {
    const element = document.getElementById('saveTransferStatus');
    if (element) element.textContent = message;
  }

  async function prepareTransferCode(copy) {
    if (saveRecoveryBlocked) throw new Error('請先還原存檔，再建立換機碼');
    if (typeof syncPomodoroFromClock === 'function') syncPomodoroFromClock();
    try { saveGame(); } catch (error) {
      console.warn('Primary save is full; transfer code will use the in-memory state.', error);
    }
    setTransferStatus('正在壓縮存檔，請稍候…');
    const code = await encodeTransferCode(buildSaveExportPayload());
    const textarea = document.getElementById('saveTransferCode');
    if (!textarea) throw new Error('找不到換機碼欄位');
    textarea.value = code;
    textarea.focus();
    textarea.setSelectionRange(0, code.length);
    let copied = false;
    if (copy) {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(code);
          copied = true;
        } else if (document.execCommand) {
          copied = document.execCommand('copy');
        }
      } catch (_) {
        copied = false;
      }
    }
    const sizeKb = Math.max(1, Math.round(code.length / 1024));
    setTransferStatus(copied
      ? `已複製換機碼（約 ${sizeKb} KB）。可貼到自己的訊息、備忘錄或另一台裝置。`
      : `已產生換機碼（約 ${sizeKb} KB）。若手機禁止自動複製，請長按欄位並選「全選／複製」。`);
    return copied;
  }

  window.copyGameSaveCode = async function copyGameSaveCode() {
    try {
      const copied = await prepareTransferCode(true);
      showToast(copied ? '✅ 換機碼已複製。' : '換機碼已產生，請長按欄位複製。', copied ? 'success' : 'info');
    } catch (error) {
      console.error('Create transfer code failed:', error);
      setTransferStatus(`無法建立換機碼：${error.message || '請稍後再試'}`);
      showToast(`換機碼建立失敗：${error.message || '請稍後再試'}`, 'error');
    }
  };

  const previousExport = window.exportGameSave;
  window.exportGameSave = async function resilientExportGameSave() {
    try {
      if (saveRecoveryBlocked) throw new Error('請先還原存檔，再匯出恢復後的進度。');
      if (typeof syncPomodoroFromClock === 'function') syncPomodoroFromClock();
      try { saveGame(); } catch (error) {
        console.warn('Primary save is full; export will use the in-memory state.', error);
      }
      const payload = JSON.stringify(buildSaveExportPayload(), null, 2);
      const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
      const filename = `ToeicQuest-save-${new Date().toISOString().slice(0, 10)}.json`;
      const file = typeof File === 'function' ? new File([blob], filename, { type: blob.type }) : null;
      const shareData = file ? { title: 'ToeicQuest 存檔', text: 'ToeicQuest 備份與換機檔案', files: [file] } : null;
      const canShare = !!(shareData && navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] })));
      if (canShare) {
        try {
          await navigator.share(shareData);
          document.getElementById('saveToolsStatus').textContent = '已開啟手機分享選單。請存到「檔案」、iCloud Drive、Google Drive 或 AirDrop。';
          showToast('✅ 已開啟備份分享選單。', 'success');
          return;
        } catch (error) {
          if (error?.name === 'AbortError') return;
        }
      }
      const ua = String(navigator.userAgent || '');
      const iosLike = /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && Number(navigator.maxTouchPoints) > 1);
      if (iosLike) {
        await prepareTransferCode(true);
        document.getElementById('saveToolsStatus').textContent = '此 iPhone／PWA 無法分享備份檔，已自動改用換機碼。';
        showToast('已改用換機碼。', 'info');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      document.getElementById('saveToolsStatus').textContent = '備份檔已下載；若沒有看到檔案，請改用下方換機碼。';
    } catch (error) {
      console.error('Export save failed:', error);
      try {
        await prepareTransferCode(true);
        document.getElementById('saveToolsStatus').textContent = '檔案分享失敗，已自動改用換機碼。';
      } catch (_) {
        if (typeof previousExport === 'function') previousExport();
      }
    }
  };

  async function renderVaultList() {
    const list = document.getElementById('saveBackupList');
    if (!list) return;
    list.textContent = '正在讀取還原點…';
    let vaultEntries = [];
    let vaultError = null;
    try {
      vaultEntries = await listVault();
    } catch (error) {
      vaultError = error;
    }
    const legacyEntries = (saveBackupStore?.list() || []).map(entry => ({ ...entry, source: 'legacy' }));
    const entries = [...vaultEntries, ...legacyEntries].sort((a, b) => Number(b.at || 0) - Number(a.at || 0));
    list.replaceChildren();
    entries.forEach(entry => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'learning-history-row';
      const copy = document.createElement('span');
      const title = document.createElement('strong');
      const meta = document.createElement('small');
      title.textContent = `${entry.label} · ${new Date(entry.at).toLocaleString('zh-TW')}`;
      meta.textContent = `${entry.cards} 張卡 · ${entry.words} 字 · ${entry.tasks} 個行程 · ${entry.logs} 筆紀錄${entry.source === 'vault' ? ' · 大容量' : ''}`;
      copy.append(title, meta);
      button.append(copy, document.createTextNode('還原 ›'));
      button.onclick = () => window.restoreGameBackup(entry.id, entry.source);
      list.append(button);
    });
    if (!entries.length) {
      list.textContent = vaultError
        ? '此瀏覽器無法使用本機還原點，請改用換機碼或備份檔。'
        : '尚無本機還原點。按「建立本機還原點」即可保留目前進度。';
    }
  }

  window.openSaveTools = function resilientOpenSaveTools() {
    const status = document.getElementById('saveToolsStatus');
    if (status) status.textContent = saveRecoveryBlocked
      ? '原存檔無法讀取，已暫停覆寫。請從還原點、換機碼或備份檔恢復。'
      : `目前進度：${saveSummaryText(state)}`;
    document.getElementById('saveToolsBackdrop')?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    renderVaultList().catch(error => {
      const list = document.getElementById('saveBackupList');
      if (list) list.textContent = `無法讀取還原點：${error.message}`;
    });
    updatePersistentStorageStatus().catch(() => {});
  };

  window.createManualSaveBackup = async function resilientManualBackup() {
    try {
      if (saveRecoveryBlocked) throw new Error('請先還原存檔');
      if (typeof syncPomodoroFromClock === 'function') syncPomodoroFromClock();
      const raw = JSON.stringify(state);
      try {
        await writeVault(raw, '手動備份');
      } catch (vaultError) {
        if (!saveBackupStore) throw vaultError;
        saveBackupStore.snapshot(raw, '手動備份', true);
      }
      await renderVaultList();
      showToast('✅ 已建立本機還原點。', 'success');
    } catch (error) {
      console.error('Create restore point failed:', error);
      showToast(`建立還原點失敗：${error.message}`, 'error');
    }
  };

  async function commitState(importedState) {
    const previous = state;
    const prepared = migrateSaveData(deepMergeState(defaultState, importedState));
    if (prepared.pomodoro?.status === 'running') {
      const savedAt = Date.parse(importedState.saveMeta?.updatedAt || '') || Date.now();
      prepared.pomodoro.pausedAccumulatedMs = Math.min(Number(prepared.pomodoro.plannedDuration) || 1500000,
        (Number(prepared.pomodoro.pausedAccumulatedMs) || 0) + Math.max(0, savedAt - (Number(prepared.pomodoro.sessionStartAt) || savedAt)));
      prepared.pomodoro.status = 'paused';
      prepared.pomodoro.sessionStartAt = null;
    }
    if (prepared.focusMode) {
      if (prepared.focusMode.status === 'running') {
        const savedAt = Date.parse(importedState.saveMeta?.updatedAt || '') || Date.now();
        prepared.focusMode.pausedAccumulatedMs = (Number(prepared.focusMode.pausedAccumulatedMs) || 0)
          + Math.max(0, savedAt - (Number(prepared.focusMode.sessionStartAt) || savedAt));
      }
      prepared.focusMode.active = false;
      if (prepared.focusMode.status === 'running') prepared.focusMode.status = 'paused';
      prepared.focusMode.sessionStartAt = null;
    }
    if (!saveRecoveryBlocked) {
      try {
        await writeVault(JSON.stringify(previous), '還原／匯入前備份');
      } catch (_) {
        try { saveBackupStore?.snapshot(JSON.stringify(previous), '還原／匯入前備份', true); } catch (_) {}
      }
    }
    prepared.saveMeta = { updatedAt: new Date().toISOString() };
    try {
      if (saveBackupStore) saveBackupStore.save(prepared);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(prepared));
    } catch (_) {
      throw new Error('無法儲存匯入的進度，目前存檔仍然保留');
    }
    state = prepared;
    saveRecoveryBlocked = false;
    window.location.reload();
  }

  window.restoreGameBackup = async function resilientRestoreGameBackup(id, source = 'legacy') {
    try {
      const candidate = source === 'vault' ? await readVault(id) : saveBackupStore.read(id);
      closeSaveTools();
      const confirmed = await showGameConfirm({
        title: '還原本機備份',
        message: `${saveSummaryText(candidate)}\n這份備份會取代目前進度；目前進度會先建立還原點。`,
        confirmText: '還原備份', cancelText: '取消', type: 'warning'
      });
      if (confirmed) await commitState(candidate);
      else window.openSaveTools();
    } catch (error) {
      showToast(`還原失敗：${error.message}`, 'error');
    }
  };

  window.importGameSaveCode = async function importGameSaveCode() {
    try {
      setTransferStatus('正在驗證換機碼…');
      const parsed = await decodeTransferCode(document.getElementById('saveTransferCode')?.value);
      const imported = getImportedState(parsed);
      closeSaveTools();
      const confirmed = await showGameConfirm({
        title: '📲 從換機碼還原',
        message: `${saveSummaryText(imported)}\n這份進度會取代目前存檔，現有進度會先建立本機還原點。進行中的計時器會暫停。`,
        confirmText: '確定還原', cancelText: '取消', type: 'danger'
      });
      if (confirmed) await commitState(imported);
      else {
        window.openSaveTools();
        setTransferStatus('已取消還原，目前進度沒有變更。');
      }
    } catch (error) {
      console.error('Import transfer code failed:', error);
      window.openSaveTools();
      setTransferStatus(`換機碼無法讀取：${error.message || '格式不正確'}`);
      showToast(`換機碼還原失敗：${error.message || '格式不正確'}`, 'error');
    }
  };

  window.importGameSave = async function resilientImportGameSave(event) {
    const input = event?.target;
    const file = input?.files?.[0];
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('存檔檔案超過 10 MB');
      const imported = getImportedState(JSON.parse(await file.text()));
      closeSaveTools();
      const confirmed = await showGameConfirm({
        title: '📥 匯入遊戲存檔',
        message: `「${file.name}」\n${saveSummaryText(imported)}\n匯入會取代目前進度，現有進度會先建立本機還原點。進行中的計時器會暫停。`,
        confirmText: '確定匯入', cancelText: '取消', type: 'danger'
      });
      if (confirmed) await commitState(imported);
      else window.openSaveTools();
    } catch (error) {
      console.error('Import save failed:', error);
      closeSaveTools();
      await showGameAlert({
        title: '存檔匯入失敗',
        message: `無法讀取這份存檔：${error.message || '格式不正確'}`,
        type: 'error', buttonText: '知道了'
      });
    } finally {
      if (input) input.value = '';
    }
  };
})();


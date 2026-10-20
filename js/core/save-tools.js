/* 存檔匯出、驗證與匯入 */
function buildSaveExportPayload() {
  return {
    format: 'toeicquest-save',
    version: 1,
    exportedAt: new Date().toISOString(),
    state
  };
}

async function exportGameSave() {
  try {
    if (saveRecoveryBlocked) throw new Error('請先還原存檔，再匯出恢復後的進度。');
    if (typeof syncPomodoroFromClock === 'function') syncPomodoroFromClock();
    saveGame();
    const payload = JSON.stringify(buildSaveExportPayload(), null, 2);
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const date = new Date().toISOString().slice(0, 10);
    const filename = `ToeicQuest-save-${date}.json`;
    const file = typeof File === 'function' ? new File([blob], filename, { type: blob.type }) : null;
    const shareData = file ? { title: 'ToeicQuest 存檔', text: 'ToeicQuest 備份與換機檔案', files: [file] } : null;
    const canShareFile = !!(shareData && navigator.share
      && (!navigator.canShare || navigator.canShare({ files: shareData.files })));

    if (canShareFile) {
      try {
        await navigator.share(shareData);
      } catch (shareError) {
        if (shareError?.name === 'AbortError') {
          const status = document.getElementById('saveToolsStatus');
          if (status) status.textContent = '已取消分享，遊戲進度沒有變更。';
          return;
        }
        throw shareError;
      }
    } else {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    }
    const status = document.getElementById('saveToolsStatus');
    if (status) status.textContent = canShareFile
      ? '備份已交給手機分享選單。請存到「檔案」、iCloud Drive、Google Drive 或 AirDrop。'
      : '備份檔已下載。請傳到另一台裝置，再從「選擇備份檔還原」開啟。';
    showToast(canShareFile ? '✅ 已開啟備份分享選單。' : '✅ 備份檔已下載。', 'success');
  } catch (error) {
    console.error('Export save failed:', error);
    const status = document.getElementById('saveToolsStatus');
    if (status) status.textContent = `匯出失敗：${error.message || '請稍後再試。'}`;
    showToast(`存檔匯出失敗：${error.message || '請稍後再試。'}`, 'error');
  }
}

async function updatePersistentStorageStatus() {
  const status = document.getElementById('saveStorageStatus');
  if (!status) return;
  if (!navigator.storage?.persisted) {
    status.textContent = '這個瀏覽器不提供本機永久儲存保護；請定期分享備份檔。';
    return;
  }
  const persisted = await navigator.storage.persisted();
  status.textContent = persisted
    ? '本機存檔保護：已啟用。仍建議換機前分享一份備份。'
    : '本機存檔保護：尚未啟用。可按下方按鈕向瀏覽器提出申請。';
}

async function requestPersistentSaveStorage() {
  try {
    if (!navigator.storage?.persist) throw new Error('此瀏覽器不支援永久儲存申請');
    const granted = await navigator.storage.persist();
    await updatePersistentStorageStatus();
    showToast(granted ? '✅ 已啟用本機存檔保護。' : '瀏覽器未核准；請定期分享備份檔。', granted ? 'success' : 'warning');
  } catch (error) {
    showToast(`${error.message}，請使用分享備份。`, 'warning');
  }
}

function getImportedState(parsed) {
  return ToeicQuestSaveBackups.parseState(JSON.stringify(parsed));
}

function saveSummaryText(candidate) {
  const summary = ToeicQuestSaveBackups.summarize(candidate);
  return `${summary.cards} 張卡 · ${summary.words} 字 · ${summary.tasks} 個行程 · ${summary.logs} 筆學習紀錄`;
}

function closeSaveTools() {
  document.getElementById('saveToolsBackdrop')?.classList.add('hidden');
  document.body.style.overflow = '';
}

function openSaveTools() {
  const list = document.getElementById('saveBackupList');
  if (list) {
    list.replaceChildren();
    const entries = saveBackupStore?.list() || [];
    entries.forEach(entry => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'learning-history-row';
      const copy = document.createElement('span');
      const title = document.createElement('strong');
      const meta = document.createElement('small');
      title.textContent = `${entry.label} · ${new Date(entry.at).toLocaleString('zh-TW')}`;
      meta.textContent = `${entry.cards} 張卡 · ${entry.words} 字 · ${entry.tasks} 個行程 · ${entry.logs} 筆紀錄`;
      copy.append(title, meta);
      button.append(copy, document.createTextNode('還原 ›'));
      button.onclick = () => restoreGameBackup(entry.id);
      list.append(button);
    });
    if (!entries.length) list.textContent = '尚無本機還原點，儲存進度後會自動建立。';
  }
  const status = document.getElementById('saveToolsStatus');
  if (status) status.textContent = saveRecoveryBlocked
    ? '原存檔無法讀取，已暫停覆寫。請從還原點或備份檔案恢復。'
    : `目前進度：${saveSummaryText(state)}`;
  document.getElementById('saveToolsBackdrop')?.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  updatePersistentStorageStatus().catch(() => {});
}

function createManualSaveBackup() {
  try {
    if (saveRecoveryBlocked || !saveBackupStore) throw new Error('目前無法建立本機備份，請匯出檔案。');
    saveBackupStore.snapshot(JSON.stringify(state), '手動備份', true);
    openSaveTools();
    showToast('已建立本機還原點。', 'success');
  } catch (error) { showToast(error.message, 'error'); }
}

function commitImportedSave(importedState) {
  const previous = state;
  const prepared = migrateSaveData(deepMergeState(defaultState, importedState));
  // A timer transferred to another device resumes only when the player presses
  // Continue. Offline transfer time must never turn into study rewards.
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
  if (saveBackupStore && !saveRecoveryBlocked) {
    saveBackupStore.snapshot(JSON.stringify(previous), '還原／匯入前備份', true);
  }
  try {
    prepared.saveMeta = { updatedAt: new Date().toISOString() };
    if (saveBackupStore) saveBackupStore.save(prepared);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(prepared));
  } catch (error) { throw new Error('無法儲存匯入的進度，目前存檔仍然保留。'); }
  state = prepared;
  saveRecoveryBlocked = false;
  window.location.reload();
}

async function restoreGameBackup(id) {
  try {
    const candidate = saveBackupStore.read(id);
    closeSaveTools();
    const confirmed = await showGameConfirm({
      title: '還原本機備份',
      message: `${saveSummaryText(candidate)}\n這份備份會取代目前進度；目前進度會先建立還原點。`,
      confirmText: '還原備份', cancelText: '取消', type: 'warning'
    });
    if (confirmed) commitImportedSave(candidate);
    else openSaveTools();
  } catch (error) { showToast(`還原失敗：${error.message}`, 'error'); }
}

async function importGameSave(event) {
  const input = event?.target;
  const file = input?.files?.[0];
  if (!file) return;

  try {
    if (file.size > 10 * 1024 * 1024) throw new Error('存檔檔案超過 10 MB');
    const parsed = JSON.parse(await file.text());
    const importedState = getImportedState(parsed);
    closeSaveTools();

    const confirmed = await showGameConfirm({
      title: '📥 匯入遊戲存檔',
      message: `「${file.name}」\n${saveSummaryText(importedState)}\n匯入會取代目前進度，現有進度會先建立本機還原點。進行中的計時器會暫停。`,
      confirmText: '確定匯入',
      cancelText: '取消',
      type: 'danger'
    });
    if (!confirmed) { openSaveTools(); return; }

    commitImportedSave(importedState);
  } catch (error) {
    console.error('Import save failed:', error);
    closeSaveTools();
    await showGameAlert({
      title: '存檔匯入失敗',
      message: `無法讀取這份存檔：${error.message || '格式不正確'}`,
      type: 'error',
      buttonText: '知道了'
    });
  } finally {
    if (input) input.value = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const recovery = window.toeicQuestSaveRecovery;
  if (recovery?.blocked) {
    openSaveTools();
    showToast(recovery.message, 'warning');
  } else if (recovery?.recovered) {
    showToast(`已從 ${new Date(recovery.recovered.at).toLocaleString('zh-TW')} 的備份恢復進度。`, 'info');
  }
}, { once: true });

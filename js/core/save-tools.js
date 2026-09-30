/* 存檔匯出、驗證與匯入 */
function buildSaveExportPayload() {
  return {
    format: 'toeicquest-save',
    version: 1,
    exportedAt: new Date().toISOString(),
    state
  };
}

function exportGameSave() {
  try {
    saveGame();
    const payload = JSON.stringify(buildSaveExportPayload(), null, 2);
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `ToeicQuest-save-${date}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('✅ 存檔已匯出，請妥善保存 JSON 檔案。', 'success');
  } catch (error) {
    console.error('Export save failed:', error);
    showToast('❌ 存檔匯出失敗，請稍後再試。', 'error');
  }
}

function getImportedState(parsed) {
  const candidate = parsed?.format === 'toeicquest-save' ? parsed.state : parsed;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new Error('存檔內容不是有效物件');
  }
  if (!Array.isArray(candidate.inventory)) throw new Error('缺少球員卡庫資料');
  if (!candidate.toeic || typeof candidate.toeic !== 'object') throw new Error('缺少多益學習資料');
  if (!candidate.season || typeof candidate.season !== 'object') throw new Error('缺少球季資料');
  return candidate;
}

async function importGameSave(event) {
  const input = event?.target;
  const file = input?.files?.[0];
  if (!file) return;

  try {
    if (file.size > 10 * 1024 * 1024) throw new Error('存檔檔案超過 10 MB');
    const parsed = JSON.parse(await file.text());
    const importedState = getImportedState(parsed);

    const confirmed = await showGameConfirm({
      title: '📥 匯入遊戲存檔',
      message: `即將用「${file.name}」取代目前進度。建議先匯出現有存檔作為備份。確定繼續嗎？`,
      confirmText: '確定匯入',
      cancelText: '取消',
      type: 'danger'
    });
    if (!confirmed) return;

    const merged = deepMergeState(defaultState, importedState);
    state = migrateSaveData(merged);
    saveGame();
    renderAll();
    showToast('✅ 存檔匯入成功！', 'success');
  } catch (error) {
    console.error('Import save failed:', error);
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

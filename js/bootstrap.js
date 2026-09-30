let current2KTarget = { type: 'starter', slot: 'PG' };

function open2KSlotSelector(type, slot) {
  // 整合介面：點擊選卡直接切換鎖定該槽位並展開背包面板
  if (!lockedRosterSlot || lockedRosterSlot.type !== type || String(lockedRosterSlot.slot) !== String(slot)) {
    lockedRosterSlot = null;
    handleRosterSlotClick(type, slot);
  }
}

function close2KSlotSelector() {
  cancelRosterLock();
}

// 點擊卡片立即插槽入陣 (若球員已在其他位置，支援自動智能互換)
function selectCardIntoSlot(cardId) {
  const targetSlot = lockedRosterSlot || current2KTarget;
  if (!targetSlot) return;

  const card = (state.inventory || []).find(c => c && c.cardId === cardId);
  if (!card) return;

  const targetLabel = targetSlot.type === 'starter' ? targetSlot.slot : `替補 B${Number(targetSlot.slot) + 1}`;
  const targetOldPlayer = targetSlot.type === 'starter' 
    ? state.startingLineup[targetSlot.slot] 
    : state.benchLineup[targetSlot.slot];

  // 1. 檢查點選的球員是否已經在目前選擇的這個卡槽中
  if (targetOldPlayer && targetOldPlayer.cardId === card.cardId) {
    showToast(`${card.name} 已在此位置上陣`, "info");
    cancelRosterLock();
    return;
  }

  // 2. 檢查該球員是否在其他先發或替補位置
  let sourceStarterPos = null;
  for (const pos of ['PG', 'SG', 'SF', 'PF', 'C']) {
    if (state.startingLineup[pos]?.cardId === card.cardId) {
      sourceStarterPos = pos;
      break;
    }
  }
  let sourceBenchIdx = -1;
  if (Array.isArray(state.benchLineup)) {
    sourceBenchIdx = state.benchLineup.findIndex(p => p && p.cardId === card.cardId);
  }

  // 3. 處理換位或指派
  if (sourceStarterPos !== null && targetOldPlayer) {
    // 兩位球員互換位置 (先發與目標槽位)
    state.startingLineup[sourceStarterPos] = targetOldPlayer;
    if (targetSlot.type === 'starter') {
      state.startingLineup[targetSlot.slot] = card;
    } else {
      state.benchLineup[targetSlot.slot] = card;
    }
    showToast(`🔄 互換成功！${card.name} (${targetLabel}) ⇄ ${targetOldPlayer.name} (${sourceStarterPos})`, "success");
  } else if (sourceBenchIdx !== -1 && targetOldPlayer) {
    // 兩位球員互換位置 (板凳與目標槽位)
    state.benchLineup[sourceBenchIdx] = targetOldPlayer;
    if (targetSlot.type === 'starter') {
      state.startingLineup[targetSlot.slot] = card;
    } else {
      state.benchLineup[targetSlot.slot] = card;
    }
    showToast(`🔄 互換成功！${card.name} (${targetLabel}) ⇄ ${targetOldPlayer.name} (替補 B${sourceBenchIdx + 1})`, "success");
  } else {
    // 目標槽位為空，或球員未在陣容中：直接移除舊位並填入目標
    removePlayerFromEntireRoster(card.cardId);
    if (targetSlot.type === 'starter') {
      state.startingLineup[targetSlot.slot] = card;
    } else {
      state.benchLineup[targetSlot.slot] = card;
    }
    showToast(` 已將 ${card.name} 指派至 ${targetLabel}！`, "success");
  }

  playSound('cardFlip');
  triggerHaptic('medium');

  cancelRosterLock();
  saveGame();
  renderAll();
}

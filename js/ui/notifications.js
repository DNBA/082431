/* =====================================================
       🌟 統一 GAME MODAL, CONFIRM, REWARD, TOAST & NOTIFICATION SYSTEM (V4.1 UI 標準化規範)
    ===================================================== */
    // 1. 🍞 Toast 輕量提示系統 (P2)
    function showToast(message, type = 'info', duration = 3000) {
      const container = document.getElementById('toastContainer');
      if (!container) return;

      const toast = document.createElement('div');
      const typeStyles = {
        success: 'bg-slate-900/95 border-emerald-500/50 text-emerald-300 shadow-[0_4px_20px_rgba(16,185,129,0.25)]',
        warning: 'bg-slate-900/95 border-amber-500/50 text-amber-300 shadow-[0_4px_20px_rgba(245,158,11,0.25)]',
        error: 'bg-slate-900/95 border-rose-500/50 text-rose-300 shadow-[0_4px_20px_rgba(244,63,94,0.25)]',
        info: 'bg-slate-900/95 border-indigo-500/50 text-indigo-200 shadow-[0_4px_20px_rgba(99,102,241,0.25)]'
      };
      const iconMap = {
        success: '✅',
        warning: '⚠️',
        error: '❌',
        info: 'ℹ️'
      };

      const styleClass = typeStyles[type] || typeStyles.info;
      const icon = iconMap[type] || iconMap.info;

      toast.className = `pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold tracking-wide backdrop-blur-md animate-toast-in transition-all cursor-pointer ${styleClass}`;
      toast.innerHTML = `<span aria-hidden="true">${icon}</span><span class="flex-1">${escapeHtml(message)}</span>`;

      toast.onclick = () => {
        toast.classList.add('animate-toast-out');
        setTimeout(() => toast.remove(), 200);
      };

      container.appendChild(toast);

      setTimeout(() => {
        if (toast.parentNode) {
          toast.classList.add('animate-toast-out');
          setTimeout(() => toast.remove(), 200);
        }
      }, duration);
    }

    // 2. 🔔 統一系統彈窗 (P0: Game Modal / Alert)
    let currentModalConfirmCallback = null;
    function showGameAlert({ title = '系統通知', message = '', type = 'info', buttonText = '確定', onConfirm = null }) {
      return new Promise((resolve) => {
        const modal = document.getElementById('unifiedGameModal');
        const titleEl = document.getElementById('gameModalTitle');
        const msgEl = document.getElementById('gameModalMessage');
        const iconEl = document.getElementById('gameModalIcon');
        const iconWrapper = document.getElementById('gameModalIconWrapper');
        const btn = document.getElementById('gameModalConfirmBtn');

        if (!modal) {
          resolve();
          return;
        }

        const typeConfig = {
          success: { icon: '🎉', border: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400' },
          warning: { icon: '⚠️', border: 'border-amber-500/30 bg-amber-500/15 text-amber-400' },
          error: { icon: '❌', border: 'border-rose-500/30 bg-rose-500/15 text-rose-400' },
          info: { icon: 'ℹ️', border: 'border-indigo-500/30 bg-indigo-500/15 text-indigo-400' }
        };
        const cfg = typeConfig[type] || typeConfig.info;

        if (iconEl) iconEl.innerText = cfg.icon;
        if (iconWrapper) iconWrapper.className = `w-14 h-14 mx-auto rounded-2xl border flex items-center justify-center text-3xl ${cfg.border}`;
        if (titleEl) titleEl.innerText = title;
        if (msgEl) msgEl.innerText = message;
        if (btn) btn.innerText = buttonText;

        currentModalConfirmCallback = () => {
          closeGameModal();
          if (typeof onConfirm === 'function') onConfirm();
          resolve();
        };

        modal.classList.remove('hidden');
      });
    }

    function closeGameModal() {
      const modal = document.getElementById('unifiedGameModal');
      if (modal) modal.classList.add('hidden');
      if (currentModalConfirmCallback) {
        const cb = currentModalConfirmCallback;
        currentModalConfirmCallback = null;
        cb();
      }
    }

    // 3. ❓ 統一確認彈窗 (P1: Game Confirm Dialog - 取代原生 confirm)
    let currentConfirmResolver = null;
    function showGameConfirm({ title = '請確認操作', message = '', confirmText = '確定執行', cancelText = '取消', type = 'warning', onConfirm = null, onCancel = null }) {
      return new Promise((resolve) => {
        const modal = document.getElementById('unifiedConfirmModal');
        const titleEl = document.getElementById('confirmModalTitle');
        const msgEl = document.getElementById('confirmModalMessage');
        const iconEl = document.getElementById('confirmModalIcon');
        const iconWrapper = document.getElementById('confirmModalIconWrapper');
        const okBtn = document.getElementById('confirmModalOkBtn');
        const cancelBtn = document.getElementById('confirmModalCancelBtn');

        if (!modal) {
          resolve(false);
          return;
        }

        if (type === 'danger') {
          if (iconEl) iconEl.innerText = '🚨';
          if (iconWrapper) iconWrapper.className = 'w-14 h-14 mx-auto rounded-2xl border border-rose-500/30 bg-rose-500/15 text-rose-400 flex items-center justify-center text-3xl';
          if (okBtn) okBtn.className = 'flex-1 bg-rose-600 hover:bg-rose-500 text-white font-black py-2.5 rounded-xl text-xs transition cursor-pointer';
        } else {
          if (iconEl) iconEl.innerText = '⚠️';
          if (iconWrapper) iconWrapper.className = 'w-14 h-14 mx-auto rounded-2xl border border-amber-500/30 bg-amber-500/15 text-amber-400 flex items-center justify-center text-3xl';
          if (okBtn) okBtn.className = 'flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl text-xs transition cursor-pointer';
        }

        if (titleEl) titleEl.innerText = title;
        if (msgEl) msgEl.innerText = message;
        if (okBtn) okBtn.innerText = confirmText;
        if (cancelBtn) cancelBtn.innerText = cancelText;

        currentConfirmResolver = resolve;

        okBtn.onclick = () => {
          modal.classList.add('hidden');
          if (typeof onConfirm === 'function') onConfirm();
          if (currentConfirmResolver) currentConfirmResolver(true);
          currentConfirmResolver = null;
        };

        cancelBtn.onclick = () => {
          modal.classList.add('hidden');
          if (typeof onCancel === 'function') onCancel();
          if (currentConfirmResolver) currentConfirmResolver(false);
          currentConfirmResolver = null;
        };

        modal.classList.remove('hidden');
      });
    }

    // 4. 🎁 統一高規格獎勵結算彈窗 (P1: Reward Window)
    let currentRewardClaimCallback = null;
    function showRewardModal({ title = '獲得獎勵！', subtitle = '', rewards = [], note = '', onClaim = null }) {
      const modal = document.getElementById('unifiedRewardModal');
      const titleEl = document.getElementById('rewardModalTitle');
      const subEl = document.getElementById('rewardModalSubtitle');
      const listEl = document.getElementById('rewardModalList');
      const noteBox = document.getElementById('rewardModalNoteBox');

      if (!modal) return;

      if (titleEl) titleEl.innerText = title;
      if (subEl) subEl.innerText = subtitle;

      if (listEl) {
        listEl.innerHTML = rewards.map(r => `
          <div class="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
            <span class="text-3xl mb-1">${escapeHtml(r.icon || '🎁')}</span>
            <span class="text-base font-black font-mono text-amber-400">${escapeHtml(r.amount || '')}</span>
            <span class="text-[11px] text-slate-400 font-bold">${escapeHtml(r.name || '')}</span>
          </div>
        `).join('');
      }

      if (noteBox) {
        if (note) {
          noteBox.innerText = note;
          noteBox.classList.remove('hidden');
        } else {
          noteBox.classList.add('hidden');
        }
      }

      currentRewardClaimCallback = onClaim;

      // 觸發慶祝彩帶
      if (typeof confetti === 'function') {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
      if (typeof playSound === 'function') {
        playSound('ur_ssr');
      }

      modal.classList.remove('hidden');

      // 加入通知中心動態
      addNotification(title, subtitle + (rewards.length ? ` (${rewards.map(r => `${r.name} ${r.amount}`).join('、')})` : ''), 'reward');
    }

    function closeRewardModal() {
      const modal = document.getElementById('unifiedRewardModal');
      if (modal) modal.classList.add('hidden');
      if (typeof currentRewardClaimCallback === 'function') {
        const cb = currentRewardClaimCallback;
        currentRewardClaimCallback = null;
        cb();
      }
    }

    // 5. ⏳ 統一載入運算遮罩 (P2: Loading / Processing Indicator)
    function showLoading(text = '運算模擬中...') {
      const el = document.getElementById('loadingOverlay');
      const textEl = document.getElementById('loadingOverlayText');
      if (textEl) textEl.innerText = text;
      if (el) el.classList.remove('hidden');
    }

    function hideLoading() {
      const el = document.getElementById('loadingOverlay');
      if (el) el.classList.add('hidden');
    }

    // 6. 📬 通知中心 (P2: Notification Center)
    function addNotification(title, message, type = 'info') {
      // 同時支援 addNotification(title, message, type) 與 addNotification({ title, message, type })
      if (title && typeof title === 'object') {
        const notification = title;
        title = notification.title || '系統通知';
        message = notification.message || '';
        type = notification.type || 'info';
      }
      if (typeof state === 'undefined' || !state) return;
      if (!state.notifications) state.notifications = [];
      state.notifications.unshift({
        id: 'ntf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        title,
        message,
        type,
        timestamp: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
      });
      if (state.notifications.length > 30) state.notifications.pop();

      const dot = document.getElementById('notificationUnreadDot');
      if (dot) dot.classList.remove('hidden');

      renderNotifications();
    }

    function renderNotifications() {
      const list = document.getElementById('notificationList');
      if (!list) return;

      const items = (typeof state !== 'undefined' && state.notifications) ? state.notifications : [];
      if (items.length === 0) {
        list.innerHTML = `<div class="text-center text-slate-500 py-10 font-bold">目前無新動態與通知</div>`;
        return;
      }

      list.innerHTML = items.map(n => `
        <div class="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 space-y-1">
          <div class="flex justify-between items-center">
            <span class="font-bold text-amber-400 text-xs">${escapeHtml(n.title)}</span>
            <span class="text-[10px] text-slate-500 font-mono">${escapeHtml(n.timestamp)}</span>
          </div>
          <p class="text-slate-300 text-[11px] leading-relaxed">${escapeHtml(n.message)}</p>
        </div>
      `).join('');
    }

    function toggleNotificationDrawer(forceOpen = null) {
      const drawer = document.getElementById('notificationDrawer');
      const dot = document.getElementById('notificationUnreadDot');
      if (!drawer) return;

      const isOpen = !drawer.classList.contains('hidden');
      const shouldOpen = forceOpen !== null ? forceOpen : !isOpen;

      if (shouldOpen) {
        renderNotifications();
        drawer.classList.remove('hidden');
        if (dot) dot.classList.add('hidden');
      } else {
        drawer.classList.add('hidden');
      }
    }

    function clearAllNotifications() {
      if (typeof state !== 'undefined' && state) {
        state.notifications = [];
        saveGame();
      }
      renderNotifications();
    }

    // 7. 📊 統一 Box Score 視窗開關
    function closeGameBoxScoreModal() {
      const boxModal = document.getElementById('gameBoxScoreModal');
      if (boxModal) {
        boxModal.style.display = 'none';
        boxModal.classList.add('hidden');
      }
    }

    // 8. 🎹 全局 Esc 按鍵與遮罩點擊處理 (統一 Game Overlay 互動規範)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const priorityModals = [
          { id: 'championshipCelebrationModal', close: closeChampionshipCelebration },
          { id: 'championshipRingsModal', close: closeChampionshipRingsModal },
          { id: 'unifiedRewardModal', close: closeRewardModal },
          { id: 'unifiedConfirmModal', close: () => { const btn = document.getElementById('confirmModalCancelBtn'); if (btn) btn.click(); } },
          { id: 'unifiedGameModal', close: closeGameModal },
          { id: 'notificationDrawer', close: () => toggleNotificationDrawer(false) },
          { id: 'gameBoxScoreModal', close: closeGameBoxScoreModal },
          { id: 'playerDetailModal', close: closePlayerDetailModal },
          { id: 'badgeGuideModal', close: closeBadgeGuideModal },
          { id: 'upgradeModal', close: closeUpgradeModal },
          { id: 'marketModal', close: closeMarketModal },
          { id: 'binderModal', close: closeBinderModal },
          { id: 'redeemModal', close: closeRedeemModal },
          { id: 'playoffBracketModal', close: closePlayoffBracketModal },
          { id: 'threePtModal', close: closeThreePointContest }
        ];

        for (const m of priorityModals) {
          const el = document.getElementById(m.id);
          if (el && !el.classList.contains('hidden') && el.style.display !== 'none') {
            m.close();
            break;
          }
        }
      }
    });

    // 全局攔截原生 alert，自動導向統一 Game Alert
    window.alert = function(msg) {
      showGameAlert({ title: '系統通知', message: String(msg) });
    };

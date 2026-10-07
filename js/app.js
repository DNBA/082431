/* =====================================================
       ① GAME CONFIG & DATABASE
    ===================================================== */
    const STORAGE_KEY = "toeicquest_nba_save_v1";
    const saveBackupStore = (() => {
      try { return window.ToeicQuestSaveBackups?.createStore(localStorage, STORAGE_KEY) || null; }
      catch (_) { return null; }
    })();
    let saveRecoveryBlocked = false;
    let lastSaveErrorAt = 0;
    const GACHA_RATES = { UR: 1, SSR: 3, SR: 10, R: 15, N: 71 };

    function escapeHtmlText(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

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
      toast.innerHTML = `<span>${icon}</span><span class="flex-1">${message}</span>`;

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
    function showRewardModal({ title = '獲得獎勵！', subtitle = '', rewards = [], note = '', onClaim = null, learningResult = null }) {
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
            <span class="text-3xl mb-1">${r.icon || '🎁'}</span>
            <span class="text-base font-black font-mono text-amber-400">${r.amount || ''}</span>
            <span class="text-[11px] text-slate-400 font-bold">${r.name || ''}</span>
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
      modal.classList.toggle('has-learning-result', !!learningResult);
      window.VocabLearning?.renderResultActions('rewardModalStudyActions', learningResult);

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
      if (!window.state) return;
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

      const items = (window.state && state.notifications) ? state.notifications : [];
      if (items.length === 0) {
        list.innerHTML = `<div class="text-center text-slate-500 py-10 font-bold">目前無新動態與通知</div>`;
        return;
      }

      list.innerHTML = items.map(n => `
        <div class="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 space-y-1">
          <div class="flex justify-between items-center">
            <span class="font-bold text-amber-400 text-xs">${n.title}</span>
            <span class="text-[10px] text-slate-500 font-mono">${n.timestamp}</span>
          </div>
          <p class="text-slate-300 text-[11px] leading-relaxed">${n.message}</p>
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
      if (window.state) {
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

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function triggerHaptic(type) {
  if (!navigator.vibrate) return;
  if (type === 'heavy' || type === 'ur_ssr') {
    navigator.vibrate([80, 40, 120]); // 💥 重磅震撼（UR/SSR大獎、翻開神卡）
  } else if (type === 'light' || type === 'correct' || type === 'coin' || type === 'flip') {
    navigator.vibrate(40); // ✨ 輕快短震（答對、打卡成功、金幣進帳、翻卡）
  } else if (type === 'buzz' || type === 'error') {
    navigator.vibrate([30, 50, 30]); // ❌ 連續兩下警告震動（答錯、三分大賽打鐵、失敗）
  }
}

function playSound(type) {
  // 📱 同步觸發手機觸覺震動回饋
  triggerHaptic(type);

  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;

      if (type === 'flip') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.start(now); osc.stop(now + 0.08);
      } else if (type === 'rip') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now); osc.stop(now + 0.25);
      } else if (type === 'ur_ssr') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.1);
        osc.frequency.setValueAtTime(659.25, now + 0.2);
        osc.frequency.setValueAtTime(880, now + 0.3);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.start(now); osc.stop(now + 0.6);
      } else if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
        osc.start(now); osc.stop(now + 0.04);
      } else if (type === 'coin') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, now);
        osc.frequency.setValueAtTime(1318.51, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now); osc.stop(now + 0.35);
      } else if (type === 'correct') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.50, now);
        osc.frequency.setValueAtTime(1567.98, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
      } else if (type === 'buzz') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.18);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        osc.start(now); osc.stop(now + 0.18);
      } else if (type === 'whistle') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2400, now);
        osc.frequency.setValueAtTime(2480, now + 0.06);
        osc.frequency.setValueAtTime(2400, now + 0.12);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
        osc.start(now); osc.stop(now + 0.22);
      }
}
    const TEAM_DATA_2025 = {
  "ATL": [
    {
      "name": "Trae Young",
      "pos": ["PG"],
      "ovr": 90,
      "real_ovr": 89,
      "id": 1629027,
      "basic": {
        "MP": 36.0,
        "FGA": 18.1,
        "FG%": "41.1%",
        "3PA": 8.4,
        "3P%": "34.0%",
        "FTA": 7.4,
        "FT%": "87.5%",
        "ORB": 0.5,
        "DRB": 2.6,
        "AST": 11.6,
        "STL": 1.2,
        "BLK": 0.2,
        "TOV": 4.7,
        "PF": 1.9,
        "PTS": 24.2
      },
      "advanced": {
        "USG%": "29.6%",
        "TS%": "56.7%",
        "AST%": "46.4%",
        "TRB%": "4.7%",
        "ORB%": "1.4%",
        "DRB%": "8.2%",
        "STL%": "1.6%",
        "BLK%": "0.4%",
        "TOV%": "17.9%"
      }
    },
    {
      "name": "Jalen Johnson",
      "pos": ["PF"],
      "ovr": 89,
      "real_ovr": 87,
      "id": 1630552,
      "basic": {
        "MP": 35.7,
        "FGA": 15.1,
        "FG%": "50.0%",
        "3PA": 3.9,
        "3P%": "31.2%",
        "FTA": 3.5,
        "FT%": "74.6%",
        "ORB": 1.7,
        "DRB": 8.3,
        "AST": 5.0,
        "STL": 1.6,
        "BLK": 1.0,
        "TOV": 2.9,
        "PF": 1.9,
        "PTS": 18.9
      },
      "advanced": {
        "USG%": "22.5%",
        "TS%": "56.9%",
        "AST%": "20.5%",
        "TRB%": "15.3%",
        "ORB%": "5.2%",
        "DRB%": "26.0%",
        "STL%": "2.0%",
        "BLK%": "2.6%",
        "TOV%": "15.1%"
      }
    },
    {
      "name": "Dyson Daniels",
      "pos": ["SG", "PG"],
      "ovr": 85,
      "real_ovr": 83,
      "id": 1630700,
      "basic": {
        "MP": 33.8,
        "FGA": 12.1,
        "FG%": "49.3%",
        "3PA": 3.1,
        "3P%": "34.0%",
        "FTA": 1.8,
        "FT%": "59.3%",
        "ORB": 1.6,
        "DRB": 4.3,
        "AST": 4.4,
        "STL": 3.0,
        "BLK": 0.7,
        "TOV": 2.0,
        "PF": 2.3,
        "PTS": 14.1
      },
      "advanced": {
        "USG%": "18.2%",
        "TS%": "54.5%",
        "AST%": "17.9%",
        "TRB%": "9.6%",
        "ORB%": "5.1%",
        "DRB%": "14.2%",
        "STL%": "4.2%",
        "BLK%": "2.0%",
        "TOV%": "13.6%"
      }
    },
    {
      "name": "Clint Capela",
      "pos": ["C"],
      "ovr": 82,
      "real_ovr": 79,
      "id": 203991,
      "basic": {
        "MP": 21.4,
        "FGA": 7.1,
        "FG%": "55.9%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 1.8,
        "FT%": "53.6%",
        "ORB": 3.2,
        "DRB": 5.4,
        "AST": 1.1,
        "STL": 0.6,
        "BLK": 1.0,
        "TOV": 0.9,
        "PF": 1.9,
        "PTS": 8.9
      },
      "advanced": {
        "USG%": "16.7%",
        "TS%": "56.4%",
        "AST%": "7.4%",
        "TRB%": "21.8%",
        "ORB%": "15.8%",
        "DRB%": "28.2%",
        "STL%": "1.4%",
        "BLK%": "4.1%",
        "TOV%": "9.8%"
      }
    },
    {
      "name": "Zaccharie Risacher",
      "pos": ["SF"],
      "ovr": 80,
      "real_ovr": 79,
      "id": 1642258,
      "basic": {
        "MP": 24.6,
        "FGA": 10.4,
        "FG%": "45.8%",
        "3PA": 4.6,
        "3P%": "35.5%",
        "FTA": 2.0,
        "FT%": "71.1%",
        "ORB": 1.1,
        "DRB": 2.4,
        "AST": 1.2,
        "STL": 0.7,
        "BLK": 0.5,
        "TOV": 1.2,
        "PF": 2.0,
        "PTS": 12.6
      },
      "advanced": {
        "USG%": "20.9%",
        "TS%": "55.8%",
        "AST%": "7.1%",
        "TRB%": "8.0%",
        "ORB%": "5.0%",
        "DRB%": "11.1%",
        "STL%": "1.3%",
        "BLK%": "1.8%",
        "TOV%": "9.8%"
      }
    },
    {
      "name": "De'Andre Hunter",
      "pos": ["SF", "PF"],
      "ovr": 80,
      "real_ovr": 83,
      "id": 1629631,
      "basic": {
        "MP": 27.2,
        "FGA": 11.9,
        "FG%": "47.0%",
        "3PA": 6.1,
        "3P%": "40.5%",
        "FTA": 4.0,
        "FT%": "84.6%",
        "ORB": 0.7,
        "DRB": 3.3,
        "AST": 1.4,
        "STL": 0.8,
        "BLK": 0.2,
        "TOV": 1.3,
        "PF": 2.4,
        "PTS": 17.0
      },
      "advanced": {
        "USG%": "22.8%",
        "TS%": "62.3%",
        "AST%": "7.5%",
        "TRB%": "8.1%",
        "ORB%": "2.7%",
        "DRB%": "13.4%",
        "STL%": "1.4%",
        "BLK%": "0.7%",
        "TOV%": "8.6%"
      }
    },
    {
      "name": "Bogdan Bogdanović",
      "pos": ["SG", "SF"],
      "ovr": 80,
      "real_ovr": 79,
      "id": 203992,
      "basic": {
        "MP": 25.0,
        "FGA": 9.1,
        "FG%": "42.7%",
        "3PA": 5.4,
        "3P%": "36.3%",
        "FTA": 1.2,
        "FT%": "87.9%",
        "ORB": 0.4,
        "DRB": 2.5,
        "AST": 2.7,
        "STL": 0.8,
        "BLK": 0.2,
        "TOV": 1.4,
        "PF": 2.4,
        "PTS": 10.8
      },
      "advanced": {
        "USG%": "18.7%",
        "TS%": "55.9%",
        "AST%": "15.2%",
        "TRB%": "6.6%",
        "ORB%": "2.0%",
        "DRB%": "11.2%",
        "STL%": "1.5%",
        "BLK%": "0.8%",
        "TOV%": "12.4%"
      }
    },
    {
      "name": "Onyeka Okongwu",
      "pos": ["C"],
      "ovr": 79,
      "real_ovr": 82,
      "id": 1630168,
      "basic": {
        "MP": 27.9,
        "FGA": 9.2,
        "FG%": "56.7%",
        "3PA": 2.0,
        "3P%": "32.4%",
        "FTA": 2.9,
        "FT%": "75.9%",
        "ORB": 3.0,
        "DRB": 5.9,
        "AST": 2.3,
        "STL": 0.9,
        "BLK": 0.9,
        "TOV": 1.2,
        "PF": 2.6,
        "PTS": 13.4
      },
      "advanced": {
        "USG%": "17.3%",
        "TS%": "63.4%",
        "AST%": "11.4%",
        "TRB%": "17.5%",
        "ORB%": "11.4%",
        "DRB%": "24.0%",
        "STL%": "1.6%",
        "BLK%": "3.0%",
        "TOV%": "10.4%"
      }
    },
    {
      "name": "Larry Nance Jr.",
      "pos": ["PF", "C"],
      "ovr": 77,
      "real_ovr": 79,
      "id": 1626204,
      "basic": {
        "MP": 19.3,
        "FGA": 6.5,
        "FG%": "51.6%",
        "3PA": 3.2,
        "3P%": "44.7%",
        "FTA": 0.5,
        "FT%": "69.2%",
        "ORB": 1.0,
        "DRB": 3.3,
        "AST": 1.6,
        "STL": 0.8,
        "BLK": 0.5,
        "TOV": 0.7,
        "PF": 1.5,
        "PTS": 8.5
      },
      "advanced": {
        "USG%": "15.7%",
        "TS%": "63.2%",
        "AST%": "11.3%",
        "TRB%": "12.2%",
        "ORB%": "5.3%",
        "DRB%": "19.4%",
        "STL%": "2.0%",
        "BLK%": "2.6%",
        "TOV%": "9.1%"
      }
    },
    {
      "name": "Kobe Bufkin",
      "pos": ["PG", "SG"],
      "ovr": 76,
      "real_ovr": 75,
      "id": 1641723,
      "basic": {
        "MP": 12.4,
        "FGA": 4.7,
        "FG%": "38.3%",
        "3PA": 1.9,
        "3P%": "21.1%",
        "FTA": 1.8,
        "FT%": "72.2%",
        "ORB": 0.5,
        "DRB": 1.6,
        "AST": 1.7,
        "STL": 0.3,
        "BLK": 0.2,
        "TOV": 0.8,
        "PF": 0.9,
        "PTS": 5.3
      },
      "advanced": {
        "USG%": "20.8%",
        "TS%": "48.3%",
        "AST%": "18.2%",
        "TRB%": "9.3%",
        "ORB%": "4.3%",
        "DRB%": "14.5%",
        "STL%": "1.1%",
        "BLK%": "1.5%",
        "TOV%": "12.7%"
      }
    },
    {
      "name": "Garrison Mathews",
      "pos": ["SG"],
      "ovr": 75,
      "real_ovr": 76,
      "id": 1629726,
      "basic": {
        "MP": 17.7,
        "FGA": 5.5,
        "FG%": "39.7%",
        "3PA": 4.6,
        "3P%": "39.0%",
        "FTA": 1.7,
        "FT%": "82.1%",
        "ORB": 0.3,
        "DRB": 1.6,
        "AST": 1.3,
        "STL": 0.6,
        "BLK": 0.3,
        "TOV": 0.7,
        "PF": 1.7,
        "PTS": 7.5
      },
      "advanced": {
        "USG%": "15.9%",
        "TS%": "60.6%",
        "AST%": "9.3%",
        "TRB%": "5.7%",
        "ORB%": "1.7%",
        "DRB%": "10.0%",
        "STL%": "1.5%",
        "BLK%": "1.7%",
        "TOV%": "9.6%"
      }
    },
    {
      "name": "Vít Krejčí",
      "pos": ["PG", "SG"],
      "ovr": 76,
      "real_ovr": 77,
      "id": 1630249,
      "basic": {
        "MP": 20.2,
        "FGA": 5.1,
        "FG%": "49.7%",
        "3PA": 3.6,
        "3P%": "43.7%",
        "FTA": 0.8,
        "FT%": "71.1%",
        "ORB": 0.4,
        "DRB": 2.4,
        "AST": 2.6,
        "STL": 0.6,
        "BLK": 0.5,
        "TOV": 0.9,
        "PF": 1.8,
        "PTS": 7.2
      },
      "advanced": {
        "USG%": "12.9%",
        "TS%": "66.1%",
        "AST%": "16.5%",
        "TRB%": "7.4%",
        "ORB%": "2.0%",
        "DRB%": "13.1%",
        "STL%": "1.5%",
        "BLK%": "2.1%",
        "TOV%": "13.8%"
      }
    },
    {
      "name": "David Roddy",
      "pos": ["SF", "PF"],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1631223,
      "basic": {
        "MP": 12.4,
        "FGA": 3.8,
        "FG%": "45.6%",
        "3PA": 1.8,
        "3P%": "31.1%",
        "FTA": 0.8,
        "FT%": "76.9%",
        "ORB": 0.4,
        "DRB": 2.2,
        "AST": 1.1,
        "STL": 0.4,
        "BLK": 0.3,
        "TOV": 0.7,
        "PF": 0.6,
        "PTS": 4.6
      },
      "advanced": {
        "USG%": "16.0%",
        "TS%": "56.1%",
        "AST%": "11.5%",
        "TRB%": "11.2%",
        "ORB%": "3.4%",
        "DRB%": "19.5%",
        "STL%": "1.6%",
        "BLK%": "2.0%",
        "TOV%": "13.9%"
      }
    },
    {
      "name": "Mouhamed Gueye",
      "pos": ["PF"],
      "ovr": 74,
      "real_ovr": 77,
      "id": 1631243,
      "basic": {
        "MP": 16.2,
        "FGA": 5.2,
        "FG%": "42.1%",
        "3PA": 2.5,
        "3P%": "25.9%",
        "FTA": 1.3,
        "FT%": "76.2%",
        "ORB": 1.3,
        "DRB": 2.9,
        "AST": 0.8,
        "STL": 0.8,
        "BLK": 1.0,
        "TOV": 0.5,
        "PF": 1.7,
        "PTS": 6.0
      },
      "advanced": {
        "USG%": "15.7%",
        "TS%": "52.0%",
        "AST%": "6.6%",
        "TRB%": "14.3%",
        "ORB%": "8.8%",
        "DRB%": "20.0%",
        "STL%": "2.5%",
        "BLK%": "5.7%",
        "TOV%": "7.3%"
      }
    },
    {
      "name": "Dominick Barlow",
      "pos": ["PF", "C"],
      "ovr": 73,
      "real_ovr": 74,
      "id": 1631230,
      "basic": {
        "MP": 10.7,
        "FGA": 3.2,
        "FG%": "53.1%",
        "3PA": 0.8,
        "3P%": "25.9%",
        "FTA": 0.9,
        "FT%": "63.6%",
        "ORB": 1.0,
        "DRB": 1.4,
        "AST": 0.5,
        "STL": 0.3,
        "BLK": 0.5,
        "TOV": 0.1,
        "PF": 1.3,
        "PTS": 4.2
      },
      "advanced": {
        "USG%": "14.5%",
        "TS%": "58.0%",
        "AST%": "6.9%",
        "TRB%": "12.4%",
        "ORB%": "10.0%",
        "DRB%": "15.0%",
        "STL%": "1.1%",
        "BLK%": "3.9%",
        "TOV%": "3.8%"
      }
    }
  ]
,
  "BOS": [
    {
      "name": "Jayson Tatum",
      "pos": ["SF", "PF"],
      "ovr": 96,
      "real_ovr": 92,
      "id": 1628369,
      "basic": {
        "MP": 36.4,
        "FGA": 20.3,
        "FG%": "45.2%",
        "3PA": 10.1,
        "3P%": "34.3%",
        "FTA": 6.1,
        "FT%": "81.4%",
        "ORB": 0.7,
        "DRB": 8.0,
        "AST": 6.0,
        "STL": 1.1,
        "BLK": 0.5,
        "TOV": 2.9,
        "PF": 2.2,
        "PTS": 26.8
      },
      "advanced": {
        "USG%": "31.2%",
        "TS%": "58.2%",
        "AST%": "27.0%",
        "TRB%": "12.9%",
        "ORB%": "2.0%",
        "DRB%": "23.7%",
        "STL%": "1.5%",
        "BLK%": "1.3%",
        "TOV%": "11.2%"
      }
    },
    {
      "name": "Jaylen Brown",
      "pos": ["SG", "SF"],
      "ovr": 92,
      "real_ovr": 87,
      "id": 1627759,
      "basic": {
        "MP": 34.3,
        "FGA": 17.7,
        "FG%": "46.3%",
        "3PA": 5.7,
        "3P%": "32.4%",
        "FTA": 5.1,
        "FT%": "76.4%",
        "ORB": 1.3,
        "DRB": 4.5,
        "AST": 4.5,
        "STL": 1.2,
        "BLK": 0.3,
        "TOV": 2.6,
        "PF": 2.4,
        "PTS": 22.2
      },
      "advanced": {
        "USG%": "28.9%",
        "TS%": "55.5%",
        "AST%": "21.4%",
        "TRB%": "9.3%",
        "ORB%": "4.1%",
        "DRB%": "14.4%",
        "STL%": "1.7%",
        "BLK%": "0.8%",
        "TOV%": "11.4%"
      }
    },
    {
      "name": "Kristaps Porziņģis",
      "pos": ["C", "PF"],
      "ovr": 88,
      "real_ovr": 87,
      "id": 204001,
      "basic": {
        "MP": 28.8,
        "FGA": 13.7,
        "FG%": "48.3%",
        "3PA": 6.0,
        "3P%": "41.2%",
        "FTA": 4.7,
        "FT%": "80.9%",
        "ORB": 1.6,
        "DRB": 5.1,
        "AST": 2.1,
        "STL": 0.7,
        "BLK": 1.5,
        "TOV": 1.3,
        "PF": 2.8,
        "PTS": 19.5
      },
      "advanced": {
        "USG%": "25.9%",
        "TS%": "61.8%",
        "AST%": "11.4%",
        "TRB%": "12.8%",
        "ORB%": "6.1%",
        "DRB%": "19.3%",
        "STL%": "1.3%",
        "BLK%": "4.8%",
        "TOV%": "7.4%"
      }
    },
    {
      "name": "Derrick White",
      "pos": ["PG", "SG"],
      "ovr": 87,
      "real_ovr": 85,
      "id": 1628401,
      "basic": {
        "MP": 33.9,
        "FGA": 12.6,
        "FG%": "44.2%",
        "3PA": 9.1,
        "3P%": "38.4%",
        "FTA": 2.1,
        "FT%": "83.9%",
        "ORB": 0.9,
        "DRB": 3.6,
        "AST": 4.8,
        "STL": 0.9,
        "BLK": 1.1,
        "TOV": 1.7,
        "PF": 1.8,
        "PTS": 16.4
      },
      "advanced": {
        "USG%": "19.8%",
        "TS%": "60.6%",
        "AST%": "20.2%",
        "TRB%": "7.2%",
        "ORB%": "2.8%",
        "DRB%": "11.5%",
        "STL%": "1.4%",
        "BLK%": "2.9%",
        "TOV%": "11.3%"
      }
    },
    {
      "name": "Jrue Holiday",
      "pos": ["PG", "SG"],
      "ovr": 86,
      "real_ovr": 81,
      "id": 201950,
      "basic": {
        "MP": 30.6,
        "FGA": 9.2,
        "FG%": "44.3%",
        "3PA": 4.9,
        "3P%": "35.3%",
        "FTA": 1.2,
        "FT%": "90.9%",
        "ORB": 1.2,
        "DRB": 3.0,
        "AST": 3.9,
        "STL": 1.1,
        "BLK": 0.4,
        "TOV": 1.2,
        "PF": 1.6,
        "PTS": 11.1
      },
      "advanced": {
        "USG%": "15.8%",
        "TS%": "56.5%",
        "AST%": "17.3%",
        "TRB%": "7.6%",
        "ORB%": "4.4%",
        "DRB%": "10.8%",
        "STL%": "1.7%",
        "BLK%": "1.3%",
        "TOV%": "11.3%"
      }
    },
    {
      "name": "Payton Pritchard",
      "pos": ["PG"],
      "ovr": 80,
      "real_ovr": 82,
      "id": 1630202,
      "basic": {
        "MP": 28.4,
        "FGA": 10.8,
        "FG%": "47.2%",
        "3PA": 7.8,
        "3P%": "40.7%",
        "FTA": 1.1,
        "FT%": "84.5%",
        "ORB": 1.3,
        "DRB": 2.6,
        "AST": 3.5,
        "STL": 0.9,
        "BLK": 0.2,
        "TOV": 1.0,
        "PF": 1.5,
        "PTS": 14.3
      },
      "advanced": {
        "USG%": "19.0%",
        "TS%": "63.3%",
        "AST%": "18.1%",
        "TRB%": "7.3%",
        "ORB%": "4.9%",
        "DRB%": "9.8%",
        "STL%": "1.5%",
        "BLK%": "0.6%",
        "TOV%": "8.4%"
      }
    },
    {
      "name": "Al Horford",
      "pos": ["C", "PF"],
      "ovr": 79,
      "real_ovr": 80,
      "id": 201143,
      "basic": {
        "MP": 27.7,
        "FGA": 7.7,
        "FG%": "42.3%",
        "3PA": 5.2,
        "3P%": "36.3%",
        "FTA": 0.6,
        "FT%": "89.5%",
        "ORB": 1.3,
        "DRB": 4.8,
        "AST": 2.1,
        "STL": 0.6,
        "BLK": 0.9,
        "TOV": 0.8,
        "PF": 1.4,
        "PTS": 9.0
      },
      "advanced": {
        "USG%": "13.8%",
        "TS%": "56.3%",
        "AST%": "10.4%",
        "TRB%": "12.1%",
        "ORB%": "5.2%",
        "DRB%": "18.9%",
        "STL%": "1.1%",
        "BLK%": "2.8%",
        "TOV%": "8.8%"
      }
    },
    {
      "name": "Sam Hauser",
      "pos": ["SF"],
      "ovr": 78,
      "real_ovr": 77,
      "id": 1630573,
      "basic": {
        "MP": 21.7,
        "FGA": 6.7,
        "FG%": "45.1%",
        "3PA": 5.6,
        "3P%": "41.6%",
        "FTA": 0.2,
        "FT%": "100.0%",
        "ORB": 0.6,
        "DRB": 2.5,
        "AST": 0.9,
        "STL": 0.6,
        "BLK": 0.2,
        "TOV": 0.3,
        "PF": 1.2,
        "PTS": 8.5
      },
      "advanced": {
        "USG%": "14.3%",
        "TS%": "63.2%",
        "AST%": "5.8%",
        "TRB%": "7.9%",
        "ORB%": "3.1%",
        "DRB%": "12.7%",
        "STL%": "1.3%",
        "BLK%": "0.8%",
        "TOV%": "4.6%"
      }
    },
    {
      "name": "Luke Kornet",
      "pos": ["C"],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1628436,
      "basic": {
        "MP": 18.6,
        "FGA": 3.8,
        "FG%": "66.8%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 1.3,
        "FT%": "69.1%",
        "ORB": 2.6,
        "DRB": 2.7,
        "AST": 1.6,
        "STL": 0.5,
        "BLK": 1.0,
        "TOV": 0.4,
        "PF": 1.6,
        "PTS": 6.0
      },
      "advanced": {
        "USG%": "11.4%",
        "TS%": "68.3%",
        "AST%": "11.9%",
        "TRB%": "15.5%",
        "ORB%": "15.2%",
        "DRB%": "15.8%",
        "STL%": "1.3%",
        "BLK%": "4.8%",
        "TOV%": "8.8%"
      }
    },
    {
      "name": "Neemias Queta",
      "pos": ["C"],
      "ovr": 77,
      "real_ovr": 76,
      "id": 1629674,
      "basic": {
        "MP": 13.9,
        "FGA": 3.3,
        "FG%": "65.0%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 1.0,
        "FT%": "75.4%",
        "ORB": 1.4,
        "DRB": 2.4,
        "AST": 0.7,
        "STL": 0.3,
        "BLK": 0.7,
        "TOV": 0.6,
        "PF": 1.7,
        "PTS": 5.0
      },
      "advanced": {
        "USG%": "13.7%",
        "TS%": "67.4%",
        "AST%": "7.4%",
        "TRB%": "14.9%",
        "ORB%": "11.2%",
        "DRB%": "18.5%",
        "STL%": "1.0%",
        "BLK%": "4.5%",
        "TOV%": "14.8%"
      }
    },
    {
      "name": "Torrey Craig",
      "pos": ["SF", "PF"],
      "ovr": 76,
      "real_ovr": 75,
      "id": 1628470,
      "basic": {
        "MP": 12.1,
        "FGA": 3.5,
        "FG%": "42.2%",
        "3PA": 2.5,
        "3P%": "36.4%",
        "FTA": 0.5,
        "FT%": "66.7%",
        "ORB": 1.0,
        "DRB": 1.8,
        "AST": 0.7,
        "STL": 0.3,
        "BLK": 0.5,
        "TOV": 0.3,
        "PF": 1.3,
        "PTS": 4.2
      },
      "advanced": {
        "USG%": "14.1%",
        "TS%": "56.7%",
        "AST%": "7.2%",
        "TRB%": "12.5%",
        "ORB%": "9.3%",
        "DRB%": "15.6%",
        "STL%": "1.3%",
        "BLK%": "3.5%",
        "TOV%": "7.7%"
      }
    },
    {
      "name": "Xavier Tillman",
      "pos": ["PF", "C"],
      "ovr": 75,
      "real_ovr": 73,
      "id": 1630214,
      "basic": {
        "MP": 7.0,
        "FGA": 1.6,
        "FG%": "24.5%",
        "3PA": 1.0,
        "3P%": "15.6%",
        "FTA": 0.1,
        "FT%": "75.0%",
        "ORB": 0.3,
        "DRB": 1.0,
        "AST": 0.2,
        "STL": 0.3,
        "BLK": 0.2,
        "TOV": 0.4,
        "PF": 0.5,
        "PTS": 1.0
      },
      "advanced": {
        "USG%": "13.1%",
        "TS%": "31.0%",
        "AST%": "3.8%",
        "TRB%": "10.1%",
        "ORB%": "4.7%",
        "DRB%": "15.5%",
        "STL%": "2.4%",
        "BLK%": "2.0%",
        "TOV%": "20.4%"
      }
    },
    {
      "name": "Jaden Springer",
      "pos": ["SG"],
      "ovr": 74,
      "real_ovr": 73,
      "id": 1630531,
      "basic": {
        "MP": 8.5,
        "FGA": 2.1,
        "FG%": "38.9%",
        "3PA": 1.1,
        "3P%": "25.0%",
        "FTA": 0.9,
        "FT%": "71.1%",
        "ORB": 0.4,
        "DRB": 1.0,
        "AST": 0.8,
        "STL": 0.6,
        "BLK": 0.1,
        "TOV": 0.4,
        "PF": 1.0,
        "PTS": 2.5
      },
      "advanced": {
        "USG%": "14.3%",
        "TS%": "51.1%",
        "AST%": "12.1%",
        "TRB%": "8.6%",
        "ORB%": "5.1%",
        "DRB%": "12.1%",
        "STL%": "3.2%",
        "BLK%": "1.0%",
        "TOV%": "13.0%"
      }
    },
    {
      "name": "Jordan Walsh",
      "pos": ["SF"],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1641775,
      "basic": {
        "MP": 7.8,
        "FGA": 1.6,
        "FG%": "36.1%",
        "3PA": 1.1,
        "3P%": "27.3%",
        "FTA": 0.2,
        "FT%": "58.3%",
        "ORB": 0.4,
        "DRB": 0.9,
        "AST": 0.4,
        "STL": 0.2,
        "BLK": 0.2,
        "TOV": 0.3,
        "PF": 0.6,
        "PTS": 1.6
      },
      "advanced": {
        "USG%": "11.5%",
        "TS%": "46.4%",
        "AST%": "6.0%",
        "TRB%": "9.3%",
        "ORB%": "6.2%",
        "DRB%": "12.4%",
        "STL%": "1.5%",
        "BLK%": "2.5%",
        "TOV%": "16.1%"
      }
    },
    {
      "name": "Baylor Scheierman",
      "pos": ["SG"],
      "ovr": 73,
      "real_ovr": 74,
      "id": 1631248,
      "basic": {
        "MP": 12.4,
        "FGA": 3.5,
        "FG%": "35.5%",
        "3PA": 2.6,
        "3P%": "31.7%",
        "FTA": 0.4,
        "FT%": "75.0%",
        "ORB": 0.6,
        "DRB": 1.5,
        "AST": 1.1,
        "STL": 0.5,
        "BLK": 0.1,
        "TOV": 0.4,
        "PF": 0.7,
        "PTS": 3.6
      },
      "advanced": {
        "USG%": "14.5%",
        "TS%": "49.0%",
        "AST%": "11.3%",
        "TRB%": "9.2%",
        "ORB%": "5.4%",
        "DRB%": "13.0%",
        "STL%": "2.2%",
        "BLK%": "0.5%",
        "TOV%": "9.4%"
      }
    }
  ]
,
  "BKN": [
    {
      "name": "Cam Thomas",
      "pos": ["SG"],
      "ovr": 84,
      "real_ovr": 87,
      "id": 1630560,
      "basic": {
        "MP": 31.2,
        "FGA": 18.2,
        "FG%": "43.8%",
        "3PA": 7.8,
        "3P%": "34.9%",
        "FTA": 6.0,
        "FT%": "88.1%",
        "ORB": 0.6,
        "DRB": 2.7,
        "AST": 3.8,
        "STL": 0.6,
        "BLK": 0.1,
        "TOV": 2.5,
        "PF": 1.8,
        "PTS": 24.0
      },
      "advanced": {
        "USG%": "32.6%",
        "TS%": "57.5%",
        "AST%": "22.9%",
        "TRB%": "6.0%",
        "ORB%": "2.1%",
        "DRB%": "10.4%",
        "STL%": "1.0%",
        "BLK%": "0.3%",
        "TOV%": "10.6%"
      }
    },
    {
      "name": "Nic Claxton",
      "pos": ["C"],
      "ovr": 83,
      "real_ovr": 81,
      "id": 1629651,
      "basic": {
        "MP": 26.9,
        "FGA": 8.1,
        "FG%": "56.3%",
        "3PA": 0.3,
        "3P%": "23.8%",
        "FTA": 2.2,
        "FT%": "51.3%",
        "ORB": 2.2,
        "DRB": 5.1,
        "AST": 2.2,
        "STL": 0.9,
        "BLK": 1.4,
        "TOV": 1.2,
        "PF": 2.1,
        "PTS": 10.3
      },
      "advanced": {
        "USG%": "16.8%",
        "TS%": "56.9%",
        "AST%": "13.7%",
        "TRB%": "15.5%",
        "ORB%": "9.0%",
        "DRB%": "22.7%",
        "STL%": "1.6%",
        "BLK%": "5.3%",
        "TOV%": "12.0%"
      }
    },
    {
      "name": "Cameron Johnson",
      "pos": ["SF", "PF"],
      "ovr": 82,
      "real_ovr": 85,
      "id": 1629661,
      "basic": {
        "MP": 31.6,
        "FGA": 13.1,
        "FG%": "47.5%",
        "3PA": 7.2,
        "3P%": "39.0%",
        "FTA": 3.9,
        "FT%": "89.3%",
        "ORB": 0.9,
        "DRB": 3.4,
        "AST": 3.4,
        "STL": 0.9,
        "BLK": 0.4,
        "TOV": 1.7,
        "PF": 1.8,
        "PTS": 18.8
      },
      "advanced": {
        "USG%": "22.9%",
        "TS%": "63.2%",
        "AST%": "18.5%",
        "TRB%": "7.8%",
        "ORB%": "3.3%",
        "DRB%": "12.8%",
        "STL%": "1.5%",
        "BLK%": "1.4%",
        "TOV%": "10.5%"
      }
    },
    {
      "name": "Dennis Schröder",
      "pos": ["PG"],
      "ovr": 80,
      "real_ovr": 81,
      "id": 203471,
      "basic": {
        "MP": 28.1,
        "FGA": 11.0,
        "FG%": "40.6%",
        "3PA": 4.9,
        "3P%": "34.2%",
        "FTA": 2.9,
        "FT%": "83.8%",
        "ORB": 0.4,
        "DRB": 2.3,
        "AST": 5.4,
        "STL": 0.9,
        "BLK": 0.2,
        "TOV": 1.9,
        "PF": 2.4,
        "PTS": 13.1
      },
      "advanced": {
        "USG%": "21.6%",
        "TS%": "53.1%",
        "AST%": "28.7%",
        "TRB%": "5.2%",
        "ORB%": "1.4%",
        "DRB%": "9.2%",
        "STL%": "1.5%",
        "BLK%": "0.6%",
        "TOV%": "13.3%"
      }
    },
    {
      "name": "D'Angelo Russell",
      "pos": ["PG"],
      "ovr": 80,
      "real_ovr": 81,
      "id": 1626156,
      "basic": {
        "MP": 25.5,
        "FGA": 11.0,
        "FG%": "39.0%",
        "3PA": 6.2,
        "3P%": "31.4%",
        "FTA": 2.5,
        "FT%": "83.4%",
        "ORB": 0.3,
        "DRB": 2.4,
        "AST": 5.1,
        "STL": 1.0,
        "BLK": 0.4,
        "TOV": 1.9,
        "PF": 2.0,
        "PTS": 12.6
      },
      "advanced": {
        "USG%": "24.0%",
        "TS%": "52.2%",
        "AST%": "31.2%",
        "TRB%": "6.2%",
        "ORB%": "1.5%",
        "DRB%": "11.0%",
        "STL%": "1.9%",
        "BLK%": "1.5%",
        "TOV%": "13.3%"
      }
    },
    {
      "name": "Dorian Finney-Smith",
      "pos": ["PF", "SF"],
      "ovr": 79,
      "real_ovr": 78,
      "id": 1627827,
      "basic": {
        "MP": 28.9,
        "FGA": 6.9,
        "FG%": "44.8%",
        "3PA": 5.0,
        "3P%": "41.1%",
        "FTA": 0.7,
        "FT%": "66.7%",
        "ORB": 1.3,
        "DRB": 2.7,
        "AST": 1.4,
        "STL": 0.9,
        "BLK": 0.4,
        "TOV": 0.9,
        "PF": 2.2,
        "PTS": 8.7
      },
      "advanced": {
        "USG%": "12.3%",
        "TS%": "60.4%",
        "AST%": "6.9%",
        "TRB%": "7.7%",
        "ORB%": "5.0%",
        "DRB%": "10.4%",
        "STL%": "1.6%",
        "BLK%": "1.2%",
        "TOV%": "11.0%"
      }
    },
    {
      "name": "Ben Simmons",
      "pos": ["PG", "PF"],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1627732,
      "basic": {
        "MP": 22.0,
        "FGA": 4.4,
        "FG%": "52.0%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 0.6,
        "FT%": "72.7%",
        "ORB": 0.9,
        "DRB": 3.8,
        "AST": 5.6,
        "STL": 0.7,
        "BLK": 0.5,
        "TOV": 2.0,
        "PF": 2.1,
        "PTS": 5.0
      },
      "advanced": {
        "USG%": "13.2%",
        "TS%": "53.9%",
        "AST%": "37.0%",
        "TRB%": "12.2%",
        "ORB%": "4.6%",
        "DRB%": "20.3%",
        "STL%": "1.7%",
        "BLK%": "2.0%",
        "TOV%": "30.0%"
      }
    },
    {
      "name": "Day'Ron Sharpe",
      "pos": ["C"],
      "ovr": 77,
      "real_ovr": 80,
      "id": 1630549,
      "basic": {
        "MP": 18.2,
        "FGA": 6.3,
        "FG%": "52.1%",
        "3PA": 0.9,
        "3P%": "24.4%",
        "FTA": 1.5,
        "FT%": "75.7%",
        "ORB": 3.0,
        "DRB": 3.6,
        "AST": 1.8,
        "STL": 0.8,
        "BLK": 0.8,
        "TOV": 1.3,
        "PF": 2.3,
        "PTS": 7.9
      },
      "advanced": {
        "USG%": "19.9%",
        "TS%": "56.8%",
        "AST%": "16.8%",
        "TRB%": "20.7%",
        "ORB%": "17.8%",
        "DRB%": "23.8%",
        "STL%": "2.3%",
        "BLK%": "4.6%",
        "TOV%": "15.3%"
      }
    },
    {
      "name": "Ziaire Williams",
      "pos": ["SF"],
      "ovr": 77,
      "real_ovr": 78,
      "id": 1630533,
      "basic": {
        "MP": 24.5,
        "FGA": 8.3,
        "FG%": "41.2%",
        "3PA": 4.8,
        "3P%": "34.1%",
        "FTA": 2.0,
        "FT%": "82.1%",
        "ORB": 1.0,
        "DRB": 3.6,
        "AST": 1.3,
        "STL": 1.0,
        "BLK": 0.4,
        "TOV": 1.1,
        "PF": 2.4,
        "PTS": 10.0
      },
      "advanced": {
        "USG%": "18.2%",
        "TS%": "55.0%",
        "AST%": "8.5%",
        "TRB%": "10.6%",
        "ORB%": "4.3%",
        "DRB%": "17.5%",
        "STL%": "2.0%",
        "BLK%": "1.8%",
        "TOV%": "10.5%"
      }
    },
    {
      "name": "Noah Clowney",
      "pos": ["PF", "C"],
      "ovr": 76,
      "real_ovr": 77,
      "id": 1641730,
      "basic": {
        "MP": 22.7,
        "FGA": 8.1,
        "FG%": "35.8%",
        "3PA": 5.7,
        "3P%": "33.3%",
        "FTA": 1.7,
        "FT%": "83.8%",
        "ORB": 0.9,
        "DRB": 3.0,
        "AST": 0.9,
        "STL": 0.5,
        "BLK": 0.5,
        "TOV": 1.0,
        "PF": 2.3,
        "PTS": 9.1
      },
      "advanced": {
        "USG%": "19.0%",
        "TS%": "51.6%",
        "AST%": "5.9%",
        "TRB%": "9.9%",
        "ORB%": "4.5%",
        "DRB%": "15.8%",
        "STL%": "1.1%",
        "BLK%": "2.0%",
        "TOV%": "10.2%"
      }
    },
    {
      "name": "Jalen Wilson",
      "pos": ["SF"],
      "ovr": 76,
      "real_ovr": 77,
      "id": 1630592,
      "basic": {
        "MP": 25.7,
        "FGA": 7.8,
        "FG%": "39.7%",
        "3PA": 4.6,
        "3P%": "33.7%",
        "FTA": 2.1,
        "FT%": "81.8%",
        "ORB": 0.9,
        "DRB": 2.5,
        "AST": 1.8,
        "STL": 0.5,
        "BLK": 0.1,
        "TOV": 1.0,
        "PF": 2.1,
        "PTS": 9.5
      },
      "advanced": {
        "USG%": "16.6%",
        "TS%": "54.1%",
        "AST%": "10.8%",
        "TRB%": "7.5%",
        "ORB%": "4.0%",
        "DRB%": "11.4%",
        "STL%": "1.0%",
        "BLK%": "0.2%",
        "TOV%": "10.2%"
      }
    },
    {
      "name": "Trendon Watford",
      "pos": ["PF"],
      "ovr": 75,
      "real_ovr": 78,
      "id": 1630570,
      "basic": {
        "MP": 20.8,
        "FGA": 8.0,
        "FG%": "46.9%",
        "3PA": 2.0,
        "3P%": "33.0%",
        "FTA": 2.8,
        "FT%": "76.2%",
        "ORB": 0.8,
        "DRB": 2.8,
        "AST": 2.6,
        "STL": 0.6,
        "BLK": 0.3,
        "TOV": 1.9,
        "PF": 2.2,
        "PTS": 10.2
      },
      "advanced": {
        "USG%": "23.3%",
        "TS%": "55.7%",
        "AST%": "21.0%",
        "TRB%": "9.9%",
        "ORB%": "4.4%",
        "DRB%": "16.0%",
        "STL%": "1.5%",
        "BLK%": "1.3%",
        "TOV%": "17.1%"
      }
    },
    {
      "name": "Shake Milton",
      "pos": ["SG", "PG"],
      "ovr": 74,
      "real_ovr": 75,
      "id": 1629003,
      "basic": {
        "MP": 14.7,
        "FGA": 4.5,
        "FG%": "45.3%",
        "3PA": 1.9,
        "3P%": "35.8%",
        "FTA": 1.0,
        "FT%": "79.7%",
        "ORB": 0.5,
        "DRB": 1.3,
        "AST": 1.8,
        "STL": 0.4,
        "BLK": 0.1,
        "TOV": 0.7,
        "PF": 1.2,
        "PTS": 5.5
      },
      "advanced": {
        "USG%": "16.7%",
        "TS%": "56.3%",
        "AST%": "18.3%",
        "TRB%": "7.0%",
        "ORB%": "4.2%",
        "DRB%": "9.9%",
        "STL%": "1.5%",
        "BLK%": "0.5%",
        "TOV%": "12.5%"
      }
    },
    {
      "name": "Keon Johnson",
      "pos": ["SG"],
      "ovr": 74,
      "real_ovr": 79,
      "id": 1630553,
      "basic": {
        "MP": 24.4,
        "FGA": 9.9,
        "FG%": "38.9%",
        "3PA": 5.1,
        "3P%": "31.4%",
        "FTA": 1.8,
        "FT%": "77.0%",
        "ORB": 0.8,
        "DRB": 3.0,
        "AST": 2.2,
        "STL": 1.0,
        "BLK": 0.4,
        "TOV": 1.5,
        "PF": 2.6,
        "PTS": 10.6
      },
      "advanced": {
        "USG%": "21.7%",
        "TS%": "49.9%",
        "AST%": "14.6%",
        "TRB%": "8.8%",
        "ORB%": "3.5%",
        "DRB%": "14.5%",
        "STL%": "2.1%",
        "BLK%": "1.5%",
        "TOV%": "12.1%"
      }
    },
    {
      "name": "Dariq Whitehead",
      "pos": ["SF"],
      "ovr": 73,
      "real_ovr": 74,
      "id": 1641727,
      "basic": {
        "MP": 12.3,
        "FGA": 4.8,
        "FG%": "40.6%",
        "3PA": 3.7,
        "3P%": "44.6%",
        "FTA": 0.3,
        "FT%": "60.0%",
        "ORB": 0.2,
        "DRB": 1.3,
        "AST": 0.6,
        "STL": 0.3,
        "BLK": 0.1,
        "TOV": 0.8,
        "PF": 1.1,
        "PTS": 5.7
      },
      "advanced": {
        "USG%": "20.1%",
        "TS%": "58.0%",
        "AST%": "7.8%",
        "TRB%": "6.7%",
        "ORB%": "1.8%",
        "DRB%": "12.1%",
        "STL%": "1.2%",
        "BLK%": "0.4%",
        "TOV%": "13.3%"
      }
    }
  ]
,
  "CHA": [
    {
      "name": "LaMelo Ball",
      "pos": ["PG"],
      "ovr": 88,
      "real_ovr": 90,
      "id": 1630163,
      "basic": {
        "MP": 32.0,
        "FGA": 21.3,
        "FG%": "40.5%",
        "3PA": 11.2,
        "3P%": "33.9%",
        "FTA": 4.9,
        "FT%": "84.3%",
        "ORB": 1.0,
        "DRB": 3.9,
        "AST": 7.4,
        "STL": 1.1,
        "BLK": 0.3,
        "TOV": 3.6,
        "PF": 3.3,
        "PTS": 25.2
      },
      "advanced": {
        "USG%": "35.9%",
        "TS%": "53.6%",
        "AST%": "43.8%",
        "TRB%": "8.2%",
        "ORB%": "3.3%",
        "DRB%": "13.4%",
        "STL%": "1.8%",
        "BLK%": "0.8%",
        "TOV%": "13.1%"
      }
    },
    {
      "name": "Brandon Miller",
      "pos": ["SF", "SG"],
      "ovr": 84,
      "real_ovr": 86,
      "id": 1641706,
      "basic": {
        "MP": 34.2,
        "FGA": 18.2,
        "FG%": "40.3%",
        "3PA": 10.9,
        "3P%": "35.5%",
        "FTA": 2.9,
        "FT%": "86.1%",
        "ORB": 0.9,
        "DRB": 3.9,
        "AST": 3.6,
        "STL": 1.1,
        "BLK": 0.7,
        "TOV": 2.8,
        "PF": 2.7,
        "PTS": 21.0
      },
      "advanced": {
        "USG%": "27.7%",
        "TS%": "54.0%",
        "AST%": "18.3%",
        "TRB%": "7.6%",
        "ORB%": "2.8%",
        "DRB%": "12.5%",
        "STL%": "1.5%",
        "BLK%": "2.1%",
        "TOV%": "12.6%"
      }
    },
    {
      "name": "Miles Bridges",
      "pos": ["PF", "SF"],
      "ovr": 83,
      "real_ovr": 87,
      "id": 1628970,
      "basic": {
        "MP": 31.7,
        "FGA": 17.0,
        "FG%": "43.1%",
        "3PA": 7.0,
        "3P%": "31.3%",
        "FTA": 4.0,
        "FT%": "87.0%",
        "ORB": 1.1,
        "DRB": 6.4,
        "AST": 3.9,
        "STL": 0.7,
        "BLK": 0.7,
        "TOV": 2.1,
        "PF": 1.5,
        "PTS": 20.3
      },
      "advanced": {
        "USG%": "28.0%",
        "TS%": "54.1%",
        "AST%": "21.7%",
        "TRB%": "12.6%",
        "ORB%": "3.7%",
        "DRB%": "21.9%",
        "STL%": "1.1%",
        "BLK%": "2.2%",
        "TOV%": "10.2%"
      }
    },
    {
      "name": "Mark Williams",
      "pos": ["C"],
      "ovr": 82,
      "real_ovr": 85,
      "id": 1631109,
      "basic": {
        "MP": 26.6,
        "FGA": 10.2,
        "FG%": "60.4%",
        "3PA": 0.1,
        "3P%": "0.0%",
        "FTA": 3.7,
        "FT%": "80.4%",
        "ORB": 3.0,
        "DRB": 7.2,
        "AST": 2.5,
        "STL": 0.7,
        "BLK": 1.2,
        "TOV": 1.6,
        "PF": 2.4,
        "PTS": 15.3
      },
      "advanced": {
        "USG%": "21.4%",
        "TS%": "64.7%",
        "AST%": "16.5%",
        "TRB%": "20.3%",
        "ORB%": "11.8%",
        "DRB%": "29.3%",
        "STL%": "1.3%",
        "BLK%": "4.5%",
        "TOV%": "12.0%"
      }
    },
    {
      "name": "Tre Mann",
      "pos": ["PG", "SG"],
      "ovr": 80,
      "real_ovr": 81,
      "id": 1630544,
      "basic": {
        "MP": 24.5,
        "FGA": 12.4,
        "FG%": "43.5%",
        "3PA": 4.6,
        "3P%": "40.0%",
        "FTA": 1.6,
        "FT%": "90.5%",
        "ORB": 0.9,
        "DRB": 2.0,
        "AST": 3.0,
        "STL": 0.5,
        "BLK": 0.3,
        "TOV": 1.9,
        "PF": 1.8,
        "PTS": 14.1
      },
      "advanced": {
        "USG%": "26.0%",
        "TS%": "53.7%",
        "AST%": "21.2%",
        "TRB%": "6.3%",
        "ORB%": "3.9%",
        "DRB%": "8.9%",
        "STL%": "1.1%",
        "BLK%": "1.2%",
        "TOV%": "12.8%"
      }
    },
    {
      "name": "Grant Williams",
      "pos": ["PF"],
      "ovr": 78,
      "real_ovr": 79,
      "id": 1629684,
      "basic": {
        "MP": 29.9,
        "FGA": 7.7,
        "FG%": "43.9%",
        "3PA": 4.6,
        "3P%": "36.5%",
        "FTA": 2.3,
        "FT%": "83.8%",
        "ORB": 1.1,
        "DRB": 4.0,
        "AST": 2.3,
        "STL": 1.1,
        "BLK": 0.8,
        "TOV": 1.8,
        "PF": 2.9,
        "PTS": 10.4
      },
      "advanced": {
        "USG%": "14.8%",
        "TS%": "59.6%",
        "AST%": "11.3%",
        "TRB%": "9.1%",
        "ORB%": "3.9%",
        "DRB%": "14.5%",
        "STL%": "1.8%",
        "BLK%": "2.7%",
        "TOV%": "16.7%"
      }
    },
    {
      "name": "Nick Richards",
      "pos": ["C"],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1630208,
      "basic": {
        "MP": 22.0,
        "FGA": 6.1,
        "FG%": "59.1%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 2.8,
        "FT%": "74.4%",
        "ORB": 2.6,
        "DRB": 5.6,
        "AST": 0.9,
        "STL": 0.2,
        "BLK": 1.0,
        "TOV": 1.4,
        "PF": 2.5,
        "PTS": 9.3
      },
      "advanced": {
        "USG%": "17.3%",
        "TS%": "63.4%",
        "AST%": "5.9%",
        "TRB%": "20.4%",
        "ORB%": "13.1%",
        "DRB%": "27.5%",
        "STL%": "0.5%",
        "BLK%": "4.2%",
        "TOV%": "16.3%"
      }
    },
    {
      "name": "Josh Green",
      "pos": ["SG", "SF"],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1630182,
      "basic": {
        "MP": 27.8,
        "FGA": 6.2,
        "FG%": "42.8%",
        "3PA": 3.6,
        "3P%": "39.1%",
        "FTA": 1.1,
        "FT%": "68.1%",
        "ORB": 0.8,
        "DRB": 1.7,
        "AST": 1.6,
        "STL": 1.1,
        "BLK": 0.2,
        "TOV": 1.0,
        "PF": 2.4,
        "PTS": 7.4
      },
      "advanced": {
        "USG%": "11.8%",
        "TS%": "55.9%",
        "AST%": "8.2%",
        "TRB%": "4.9%",
        "ORB%": "3.1%",
        "DRB%": "6.7%",
        "STL%": "1.9%",
        "BLK%": "0.8%",
        "TOV%": "13.4%"
      }
    },
    {
      "name": "Vasilije Micić",
      "pos": ["PG"],
      "ovr": 76,
      "real_ovr": 75,
      "id": 203995,
      "basic": {
        "MP": 19.1,
        "FGA": 6.7,
        "FG%": "34.8%",
        "3PA": 3.0,
        "3P%": "36.0%",
        "FTA": 1.0,
        "FT%": "82.9%",
        "ORB": 0.5,
        "DRB": 1.7,
        "AST": 3.1,
        "STL": 0.4,
        "BLK": 0.0,
        "TOV": 1.9,
        "PF": 1.1,
        "PTS": 6.6
      },
      "advanced": {
        "USG%": "19.9%",
        "TS%": "46.2%",
        "AST%": "24.3%",
        "TRB%": "6.0%",
        "ORB%": "2.7%",
        "DRB%": "9.6%",
        "STL%": "0.9%",
        "BLK%": "0.0%",
        "TOV%": "20.9%"
      }
    },
    {
      "name": "Cody Martin",
      "pos": ["SF"],
      "ovr": 76,
      "real_ovr": 77,
      "id": 1628998,
      "basic": {
        "MP": 22.1,
        "FGA": 6.1,
        "FG%": "41.8%",
        "3PA": 2.8,
        "3P%": "28.5%",
        "FTA": 1.2,
        "FT%": "70.5%",
        "ORB": 1.0,
        "DRB": 3.2,
        "AST": 2.0,
        "STL": 1.1,
        "BLK": 0.6,
        "TOV": 1.0,
        "PF": 1.8,
        "PTS": 6.8
      },
      "advanced": {
        "USG%": "14.7%",
        "TS%": "50.9%",
        "AST%": "13.0%",
        "TRB%": "10.3%",
        "ORB%": "4.8%",
        "DRB%": "15.9%",
        "STL%": "2.4%",
        "BLK%": "2.7%",
        "TOV%": "12.7%"
      }
    },
    {
      "name": "Seth Curry",
      "pos": ["SG"],
      "ovr": 75,
      "real_ovr": 75,
      "id": 203552,
      "basic": {
        "MP": 15.6,
        "FGA": 5.0,
        "FG%": "47.8%",
        "3PA": 2.7,
        "3P%": "45.6%",
        "FTA": 0.6,
        "FT%": "84.6%",
        "ORB": 0.4,
        "DRB": 1.3,
        "AST": 0.9,
        "STL": 0.4,
        "BLK": 0.1,
        "TOV": 0.5,
        "PF": 0.9,
        "PTS": 6.5
      },
      "advanced": {
        "USG%": "15.7%",
        "TS%": "61.6%",
        "AST%": "8.8%",
        "TRB%": "5.7%",
        "ORB%": "2.4%",
        "DRB%": "9.1%",
        "STL%": "1.3%",
        "BLK%": "0.6%",
        "TOV%": "8.2%"
      }
    },
    {
      "name": "Nick Smith Jr.",
      "pos": ["SG"],
      "ovr": 77,
      "real_ovr": 77,
      "id": 1641733,
      "basic": {
        "MP": 22.8,
        "FGA": 9.5,
        "FG%": "39.1%",
        "3PA": 5.1,
        "3P%": "34.0%",
        "FTA": 0.8,
        "FT%": "93.5%",
        "ORB": 0.2,
        "DRB": 1.9,
        "AST": 2.4,
        "STL": 0.3,
        "BLK": 0.1,
        "TOV": 1.4,
        "PF": 1.3,
        "PTS": 9.9
      },
      "advanced": {
        "USG%": "20.8%",
        "TS%": "50.2%",
        "AST%": "16.7%",
        "TRB%": "5.0%",
        "ORB%": "1.0%",
        "DRB%": "9.1%",
        "STL%": "0.6%",
        "BLK%": "0.4%",
        "TOV%": "12.2%"
      }
    },
    {
      "name": "Tidjane Salaün",
      "pos": ["PF"],
      "ovr": 74,
      "real_ovr": 76,
      "id": 1642275,
      "basic": {
        "MP": 20.7,
        "FGA": 5.8,
        "FG%": "33.0%",
        "3PA": 3.4,
        "3P%": "28.3%",
        "FTA": 1.6,
        "FT%": "71.3%",
        "ORB": 1.2,
        "DRB": 3.5,
        "AST": 1.2,
        "STL": 0.5,
        "BLK": 0.2,
        "TOV": 1.0,
        "PF": 1.4,
        "PTS": 5.9
      },
      "advanced": {
        "USG%": "15.2%",
        "TS%": "45.7%",
        "AST%": "8.5%",
        "TRB%": "12.0%",
        "ORB%": "5.9%",
        "DRB%": "18.4%",
        "STL%": "1.1%",
        "BLK%": "1.1%",
        "TOV%": "13.1%"
      }
    },
    {
      "name": "Taj Gibson",
      "pos": ["C", "PF"],
      "ovr": 73,
      "real_ovr": 74,
      "id": 201959,
      "basic": {
        "MP": 11.1,
        "FGA": 2.6,
        "FG%": "49.5%",
        "3PA": 0.1,
        "3P%": "50.0%",
        "FTA": 0.5,
        "FT%": "60.0%",
        "ORB": 1.4,
        "DRB": 1.9,
        "AST": 0.6,
        "STL": 0.2,
        "BLK": 0.5,
        "TOV": 0.7,
        "PF": 1.5,
        "PTS": 2.9
      },
      "advanced": {
        "USG%": "13.4%",
        "TS%": "51.5%",
        "AST%": "7.5%",
        "TRB%": "15.6%",
        "ORB%": "13.0%",
        "DRB%": "18.4%",
        "STL%": "1.1%",
        "BLK%": "4.3%",
        "TOV%": "19.4%"
      }
    },
    {
      "name": "KJ Simpson",
      "pos": ["PG"],
      "ovr": 74,
      "real_ovr": 77,
      "id": 1642354,
      "basic": {
        "MP": 23.4,
        "FGA": 8.4,
        "FG%": "34.6%",
        "3PA": 3.6,
        "3P%": "25.4%",
        "FTA": 1.4,
        "FT%": "82.0%",
        "ORB": 1.1,
        "DRB": 1.9,
        "AST": 3.1,
        "STL": 0.9,
        "BLK": 0.2,
        "TOV": 1.6,
        "PF": 1.6,
        "PTS": 7.8
      },
      "advanced": {
        "USG%": "19.1%",
        "TS%": "43.7%",
        "AST%": "19.8%",
        "TRB%": "6.9%",
        "ORB%": "4.8%",
        "DRB%": "9.0%",
        "STL%": "2.0%",
        "BLK%": "0.7%",
        "TOV%": "14.8%"
      }
    }
  ]
,
  "CHI": [
    {
      "name": "Zach LaVine",
      "pos": ["SG"],
      "ovr": 85,
      "real_ovr": 87,
      "id": 203897,
      "basic": {
        "MP": 35.2,
        "FGA": 16.5,
        "FG%": "51.1%",
        "3PA": 7.2,
        "3P%": "44.6%",
        "FTA": 3.9,
        "FT%": "82.5%",
        "ORB": 0.3,
        "DRB": 4.0,
        "AST": 4.2,
        "STL": 0.8,
        "BLK": 0.2,
        "TOV": 2.8,
        "PF": 1.6,
        "PTS": 23.3
      },
      "advanced": {
        "USG%": "25.3%",
        "TS%": "63.9%",
        "AST%": "18.3%",
        "TRB%": "6.5%",
        "ORB%": "0.9%",
        "DRB%": "12.0%",
        "STL%": "1.1%",
        "BLK%": "0.4%",
        "TOV%": "13.4%"
      }
    },
    {
      "name": "Coby White",
      "pos": ["PG", "SG"],
      "ovr": 85,
      "real_ovr": 85,
      "id": 1629632,
      "basic": {
        "MP": 33.1,
        "FGA": 15.1,
        "FG%": "45.3%",
        "3PA": 7.9,
        "3P%": "37.0%",
        "FTA": 4.1,
        "FT%": "90.2%",
        "ORB": 0.3,
        "DRB": 3.4,
        "AST": 4.5,
        "STL": 0.9,
        "BLK": 0.2,
        "TOV": 2.4,
        "PF": 2.1,
        "PTS": 20.4
      },
      "advanced": {
        "USG%": "24.4%",
        "TS%": "60.1%",
        "AST%": "19.5%",
        "TRB%": "5.8%",
        "ORB%": "1.1%",
        "DRB%": "10.4%",
        "STL%": "1.3%",
        "BLK%": "0.6%",
        "TOV%": "12.4%"
      }
    },
    {
      "name": "Josh Giddey",
      "pos": ["PG", "SG"],
      "ovr": 84,
      "real_ovr": 85,
      "id": 1630581,
      "basic": {
        "MP": 30.2,
        "FGA": 11.4,
        "FG%": "46.5%",
        "3PA": 4.0,
        "3P%": "37.8%",
        "FTA": 3.2,
        "FT%": "78.1%",
        "ORB": 1.8,
        "DRB": 6.3,
        "AST": 7.2,
        "STL": 1.2,
        "BLK": 0.6,
        "TOV": 2.9,
        "PF": 1.7,
        "PTS": 14.6
      },
      "advanced": {
        "USG%": "21.7%",
        "TS%": "57.0%",
        "AST%": "32.9%",
        "TRB%": "14.0%",
        "ORB%": "6.4%",
        "DRB%": "21.4%",
        "STL%": "1.9%",
        "BLK%": "1.8%",
        "TOV%": "18.4%"
      }
    },
    {
      "name": "Nikola Vučević",
      "pos": ["C"],
      "ovr": 82,
      "real_ovr": 86,
      "id": 202696,
      "basic": {
        "MP": 31.2,
        "FGA": 14.2,
        "FG%": "53.0%",
        "3PA": 4.4,
        "3P%": "40.2%",
        "FTA": 2.0,
        "FT%": "80.5%",
        "ORB": 2.4,
        "DRB": 7.6,
        "AST": 3.5,
        "STL": 0.8,
        "BLK": 0.7,
        "TOV": 1.6,
        "PF": 2.2,
        "PTS": 18.5
      },
      "advanced": {
        "USG%": "22.4%",
        "TS%": "61.1%",
        "AST%": "17.1%",
        "TRB%": "16.9%",
        "ORB%": "8.3%",
        "DRB%": "25.2%",
        "STL%": "1.2%",
        "BLK%": "2.0%",
        "TOV%": "9.7%"
      }
    },
    {
      "name": "Ayo Dosunmu",
      "pos": ["SG", "PG"],
      "ovr": 80,
      "real_ovr": 80,
      "id": 1630245,
      "basic": {
        "MP": 30.3,
        "FGA": 9.8,
        "FG%": "49.2%",
        "3PA": 4.1,
        "3P%": "32.8%",
        "FTA": 1.7,
        "FT%": "78.5%",
        "ORB": 0.6,
        "DRB": 2.9,
        "AST": 4.5,
        "STL": 0.9,
        "BLK": 0.4,
        "TOV": 1.5,
        "PF": 2.3,
        "PTS": 12.3
      },
      "advanced": {
        "USG%": "16.6%",
        "TS%": "58.5%",
        "AST%": "20.2%",
        "TRB%": "6.1%",
        "ORB%": "2.0%",
        "DRB%": "10.0%",
        "STL%": "1.4%",
        "BLK%": "1.1%",
        "TOV%": "12.5%"
      }
    },
    {
      "name": "Matas Buzelis",
      "pos": ["SF", "PF"],
      "ovr": 79,
      "real_ovr": 77,
      "id": 1641824,
      "basic": {
        "MP": 18.9,
        "FGA": 6.9,
        "FG%": "45.4%",
        "3PA": 3.3,
        "3P%": "36.1%",
        "FTA": 1.4,
        "FT%": "81.5%",
        "ORB": 0.7,
        "DRB": 2.8,
        "AST": 1.0,
        "STL": 0.4,
        "BLK": 0.9,
        "TOV": 0.9,
        "PF": 1.6,
        "PTS": 8.6
      },
      "advanced": {
        "USG%": "18.7%",
        "TS%": "57.1%",
        "AST%": "7.2%",
        "TRB%": "9.6%",
        "ORB%": "3.9%",
        "DRB%": "15.2%",
        "STL%": "0.9%",
        "BLK%": "4.3%",
        "TOV%": "10.9%"
      }
    },
    {
      "name": "Kevin Huerter",
      "pos": ["SG", "SF"],
      "ovr": 79,
      "real_ovr": 78,
      "id": 1628989,
      "basic": {
        "MP": 24.3,
        "FGA": 8.8,
        "FG%": "42.5%",
        "3PA": 5.7,
        "3P%": "33.8%",
        "FTA": 0.7,
        "FT%": "71.4%",
        "ORB": 0.4,
        "DRB": 2.5,
        "AST": 2.3,
        "STL": 1.0,
        "BLK": 0.3,
        "TOV": 1.0,
        "PF": 1.8,
        "PTS": 9.9
      },
      "advanced": {
        "USG%": "17.5%",
        "TS%": "54.4%",
        "AST%": "12.6%",
        "TRB%": "6.7%",
        "ORB%": "2.0%",
        "DRB%": "11.3%",
        "STL%": "1.9%",
        "BLK%": "1.3%",
        "TOV%": "9.7%"
      }
    },
    {
      "name": "Patrick Williams",
      "pos": ["PF"],
      "ovr": 77,
      "real_ovr": 78,
      "id": 1630172,
      "basic": {
        "MP": 25.0,
        "FGA": 8.2,
        "FG%": "39.7%",
        "3PA": 4.3,
        "3P%": "35.3%",
        "FTA": 1.3,
        "FT%": "72.3%",
        "ORB": 0.7,
        "DRB": 3.1,
        "AST": 2.0,
        "STL": 0.8,
        "BLK": 0.5,
        "TOV": 1.4,
        "PF": 1.4,
        "PTS": 9.0
      },
      "advanced": {
        "USG%": "16.9%",
        "TS%": "51.2%",
        "AST%": "10.3%",
        "TRB%": "7.9%",
        "ORB%": "2.9%",
        "DRB%": "12.7%",
        "STL%": "1.4%",
        "BLK%": "1.8%",
        "TOV%": "13.5%"
      }
    },
    {
      "name": "Jalen Smith",
      "pos": ["PF", "C"],
      "ovr": 78,
      "real_ovr": 79,
      "id": 1630188,
      "basic": {
        "MP": 15.0,
        "FGA": 6.4,
        "FG%": "46.6%",
        "3PA": 3.5,
        "3P%": "32.4%",
        "FTA": 1.4,
        "FT%": "80.9%",
        "ORB": 1.4,
        "DRB": 4.2,
        "AST": 1.0,
        "STL": 0.3,
        "BLK": 0.7,
        "TOV": 0.6,
        "PF": 1.5,
        "PTS": 8.2
      },
      "advanced": {
        "USG%": "21.0%",
        "TS%": "58.6%",
        "AST%": "9.7%",
        "TRB%": "19.5%",
        "ORB%": "9.9%",
        "DRB%": "28.7%",
        "STL%": "0.8%",
        "BLK%": "4.0%",
        "TOV%": "7.6%"
      }
    },
    {
      "name": "Lonzo Ball",
      "pos": ["PG"],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1628366,
      "basic": {
        "MP": 22.2,
        "FGA": 6.9,
        "FG%": "36.6%",
        "3PA": 5.6,
        "3P%": "34.4%",
        "FTA": 0.8,
        "FT%": "81.5%",
        "ORB": 0.7,
        "DRB": 2.7,
        "AST": 3.3,
        "STL": 1.3,
        "BLK": 0.5,
        "TOV": 1.2,
        "PF": 1.6,
        "PTS": 7.6
      },
      "advanced": {
        "USG%": "15.9%",
        "TS%": "52.4%",
        "AST%": "18.9%",
        "TRB%": "8.0%",
        "ORB%": "3.4%",
        "DRB%": "12.3%",
        "STL%": "2.8%",
        "BLK%": "1.9%",
        "TOV%": "13.9%"
      }
    },
    {
      "name": "Talen Horton-Tucker",
      "pos": ["SG"],
      "ovr": 76,
      "real_ovr": 75,
      "id": 1629659,
      "basic": {
        "MP": 12.5,
        "FGA": 5.0,
        "FG%": "45.7%",
        "3PA": 2.1,
        "3P%": "33.6%",
        "FTA": 1.7,
        "FT%": "73.5%",
        "ORB": 0.3,
        "DRB": 1.4,
        "AST": 1.4,
        "STL": 0.4,
        "BLK": 0.2,
        "TOV": 0.7,
        "PF": 1.0,
        "PTS": 6.5
      },
      "advanced": {
        "USG%": "21.6%",
        "TS%": "56.7%",
        "AST%": "16.1%",
        "TRB%": "7.2%",
        "ORB%": "2.8%",
        "DRB%": "11.5%",
        "STL%": "1.4%",
        "BLK%": "1.3%",
        "TOV%": "10.7%"
      }
    },
    {
      "name": "Torrey Craig",
      "pos": ["SF"],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1628470,
      "basic": {
        "MP": 12.1,
        "FGA": 3.5,
        "FG%": "42.2%",
        "3PA": 2.5,
        "3P%": "36.4%",
        "FTA": 0.5,
        "FT%": "66.7%",
        "ORB": 1.0,
        "DRB": 1.8,
        "AST": 0.7,
        "STL": 0.3,
        "BLK": 0.5,
        "TOV": 0.3,
        "PF": 1.3,
        "PTS": 4.2
      },
      "advanced": {
        "USG%": "14.1%",
        "TS%": "56.7%",
        "AST%": "7.2%",
        "TRB%": "12.5%",
        "ORB%": "9.3%",
        "DRB%": "15.6%",
        "STL%": "1.3%",
        "BLK%": "3.5%",
        "TOV%": "7.7%"
      }
    },
    {
      "name": "Julian Phillips",
      "pos": ["SF"],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1641763,
      "basic": {
        "MP": 14.2,
        "FGA": 3.6,
        "FG%": "44.6%",
        "3PA": 1.9,
        "3P%": "32.7%",
        "FTA": 1.0,
        "FT%": "78.9%",
        "ORB": 0.8,
        "DRB": 1.3,
        "AST": 0.5,
        "STL": 0.5,
        "BLK": 0.3,
        "TOV": 0.3,
        "PF": 1.4,
        "PTS": 4.6
      },
      "advanced": {
        "USG%": "12.9%",
        "TS%": "57.1%",
        "AST%": "4.4%",
        "TRB%": "7.9%",
        "ORB%": "6.4%",
        "DRB%": "9.4%",
        "STL%": "1.6%",
        "BLK%": "1.5%",
        "TOV%": "7.8%"
      }
    },
    {
      "name": "Dalen Terry",
      "pos": ["SG"],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1631207,
      "basic": {
        "MP": 13.5,
        "FGA": 3.7,
        "FG%": "44.8%",
        "3PA": 1.4,
        "3P%": "35.6%",
        "FTA": 0.9,
        "FT%": "71.0%",
        "ORB": 0.5,
        "DRB": 1.2,
        "AST": 1.3,
        "STL": 0.6,
        "BLK": 0.2,
        "TOV": 0.7,
        "PF": 1.6,
        "PTS": 4.5
      },
      "advanced": {
        "USG%": "14.9%",
        "TS%": "54.6%",
        "AST%": "12.7%",
        "TRB%": "6.6%",
        "ORB%": "4.1%",
        "DRB%": "9.0%",
        "STL%": "2.1%",
        "BLK%": "1.3%",
        "TOV%": "15.1%"
      }
    },
    {
      "name": "Jevon Carter",
      "pos": ["PG"],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1628975,
      "basic": {
        "MP": 8.9,
        "FGA": 4.1,
        "FG%": "37.7%",
        "3PA": 2.9,
        "3P%": "33.3%",
        "FTA": 0.3,
        "FT%": "80.0%",
        "ORB": 0.1,
        "DRB": 1.0,
        "AST": 1.1,
        "STL": 0.4,
        "BLK": 0.1,
        "TOV": 0.3,
        "PF": 0.4,
        "PTS": 4.3
      },
      "advanced": {
        "USG%": "21.0%",
        "TS%": "50.9%",
        "AST%": "17.2%",
        "TRB%": "6.4%",
        "ORB%": "1.3%",
        "DRB%": "11.2%",
        "STL%": "1.9%",
        "BLK%": "0.8%",
        "TOV%": "6.8%"
      }
    }
  ]
,
  "CLE": [
    {
      "name": "Donovan Mitchell",
      "pos": ["SG"],
      "ovr": 93,
      "real_ovr": 89,
      "id": 1628378,
      "basic": {
        "MP": 31.4,
        "FGA": 18.6,
        "FG%": "44.3%",
        "3PA": 8.9,
        "3P%": "36.8%",
        "FTA": 5.1,
        "FT%": "82.3%",
        "ORB": 0.8,
        "DRB": 3.7,
        "AST": 5.0,
        "STL": 1.3,
        "BLK": 0.2,
        "TOV": 2.1,
        "PF": 2.0,
        "PTS": 24.0
      },
      "advanced": {
        "USG%": "30.9%",
        "TS%": "57.5%",
        "AST%": "23.9%",
        "TRB%": "7.8%",
        "ORB%": "2.8%",
        "DRB%": "12.5%",
        "STL%": "2.0%",
        "BLK%": "0.7%",
        "TOV%": "9.2%"
      }
    },
    {
      "name": "Evan Mobley",
      "pos": ["PF", "C"],
      "ovr": 89,
      "real_ovr": 87,
      "id": 1630596,
      "basic": {
        "MP": 30.5,
        "FGA": 12.8,
        "FG%": "55.7%",
        "3PA": 3.2,
        "3P%": "37.0%",
        "FTA": 4.3,
        "FT%": "72.5%",
        "ORB": 2.3,
        "DRB": 7.0,
        "AST": 3.2,
        "STL": 0.9,
        "BLK": 1.6,
        "TOV": 2.0,
        "PF": 2.0,
        "PTS": 18.5
      },
      "advanced": {
        "USG%": "23.2%",
        "TS%": "63.3%",
        "AST%": "15.1%",
        "TRB%": "16.5%",
        "ORB%": "8.4%",
        "DRB%": "24.0%",
        "STL%": "1.4%",
        "BLK%": "4.7%",
        "TOV%": "12.2%"
      }
    },
    {
      "name": "Darius Garland",
      "pos": ["PG"],
      "ovr": 87,
      "real_ovr": 87,
      "id": 1629636,
      "basic": {
        "MP": 30.7,
        "FGA": 15.7,
        "FG%": "47.2%",
        "3PA": 7.1,
        "3P%": "40.1%",
        "FTA": 3.4,
        "FT%": "87.8%",
        "ORB": 0.6,
        "DRB": 2.2,
        "AST": 6.7,
        "STL": 1.2,
        "BLK": 0.1,
        "TOV": 2.5,
        "PF": 1.9,
        "PTS": 20.6
      },
      "advanced": {
        "USG%": "27.2%",
        "TS%": "60.0%",
        "AST%": "32.2%",
        "TRB%": "5.0%",
        "ORB%": "2.3%",
        "DRB%": "7.6%",
        "STL%": "1.9%",
        "BLK%": "0.4%",
        "TOV%": "12.8%"
      }
    },
    {
      "name": "Jarrett Allen",
      "pos": ["C"],
      "ovr": 86,
      "real_ovr": 83,
      "id": 1628386,
      "basic": {
        "MP": 28.0,
        "FGA": 7.8,
        "FG%": "70.6%",
        "3PA": 0.1,
        "3P%": "0.0%",
        "FTA": 3.4,
        "FT%": "71.8%",
        "ORB": 2.6,
        "DRB": 7.1,
        "AST": 1.9,
        "STL": 0.9,
        "BLK": 0.9,
        "TOV": 1.2,
        "PF": 1.5,
        "PTS": 13.5
      },
      "advanced": {
        "USG%": "15.9%",
        "TS%": "72.4%",
        "AST%": "9.5%",
        "TRB%": "18.8%",
        "ORB%": "10.5%",
        "DRB%": "26.7%",
        "STL%": "1.6%",
        "BLK%": "2.9%",
        "TOV%": "11.3%"
      }
    },
    {
      "name": "Caris LeVert",
      "pos": ["SG", "SF"],
      "ovr": 80,
      "real_ovr": 81,
      "id": 1627747,
      "basic": {
        "MP": 24.9,
        "FGA": 9.4,
        "FG%": "46.7%",
        "3PA": 4.4,
        "3P%": "37.3%",
        "FTA": 2.4,
        "FT%": "71.0%",
        "ORB": 0.6,
        "DRB": 2.5,
        "AST": 3.4,
        "STL": 0.9,
        "BLK": 0.5,
        "TOV": 1.2,
        "PF": 1.5,
        "PTS": 12.1
      },
      "advanced": {
        "USG%": "19.4%",
        "TS%": "58.2%",
        "AST%": "18.1%",
        "TRB%": "6.9%",
        "ORB%": "2.8%",
        "DRB%": "11.0%",
        "STL%": "1.7%",
        "BLK%": "1.9%",
        "TOV%": "10.2%"
      }
    },
    {
      "name": "Max Strus",
      "pos": ["SF", "SG"],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1629622,
      "basic": {
        "MP": 25.5,
        "FGA": 7.5,
        "FG%": "44.2%",
        "3PA": 5.9,
        "3P%": "38.6%",
        "FTA": 0.7,
        "FT%": "82.4%",
        "ORB": 1.1,
        "DRB": 3.3,
        "AST": 3.2,
        "STL": 0.5,
        "BLK": 0.2,
        "TOV": 1.1,
        "PF": 2.1,
        "PTS": 9.4
      },
      "advanced": {
        "USG%": "14.7%",
        "TS%": "60.7%",
        "AST%": "15.6%",
        "TRB%": "9.2%",
        "ORB%": "4.6%",
        "DRB%": "13.6%",
        "STL%": "1.0%",
        "BLK%": "0.9%",
        "TOV%": "12.2%"
      }
    },
    {
      "name": "Isaac Okoro",
      "pos": ["SF", "SG"],
      "ovr": 78,
      "real_ovr": 76,
      "id": 1630171,
      "basic": {
        "MP": 19.1,
        "FGA": 4.9,
        "FG%": "46.4%",
        "3PA": 2.7,
        "3P%": "37.1%",
        "FTA": 0.8,
        "FT%": "71.7%",
        "ORB": 0.9,
        "DRB": 1.5,
        "AST": 1.2,
        "STL": 0.6,
        "BLK": 0.3,
        "TOV": 0.4,
        "PF": 1.9,
        "PTS": 6.1
      },
      "advanced": {
        "USG%": "12.5%",
        "TS%": "58.7%",
        "AST%": "8.0%",
        "TRB%": "6.7%",
        "ORB%": "5.2%",
        "DRB%": "8.1%",
        "STL%": "1.5%",
        "BLK%": "1.4%",
        "TOV%": "7.4%"
      }
    },
    {
      "name": "Ty Jerome",
      "pos": ["PG"],
      "ovr": 80,
      "real_ovr": 81,
      "id": 1629660,
      "basic": {
        "MP": 19.9,
        "FGA": 8.8,
        "FG%": "51.6%",
        "3PA": 3.6,
        "3P%": "43.9%",
        "FTA": 2.1,
        "FT%": "87.2%",
        "ORB": 0.7,
        "DRB": 1.8,
        "AST": 3.4,
        "STL": 1.1,
        "BLK": 0.0,
        "TOV": 1.3,
        "PF": 1.5,
        "PTS": 12.5
      },
      "advanced": {
        "USG%": "23.6%",
        "TS%": "64.3%",
        "AST%": "24.5%",
        "TRB%": "6.7%",
        "ORB%": "4.0%",
        "DRB%": "9.3%",
        "STL%": "2.7%",
        "BLK%": "0.2%",
        "TOV%": "11.9%"
      }
    },
    {
      "name": "Dean Wade",
      "pos": ["PF"],
      "ovr": 78,
      "real_ovr": 76,
      "id": 1629731,
      "basic": {
        "MP": 21.2,
        "FGA": 4.6,
        "FG%": "41.3%",
        "3PA": 3.8,
        "3P%": "36.0%",
        "FTA": 0.5,
        "FT%": "53.3%",
        "ORB": 0.9,
        "DRB": 3.4,
        "AST": 1.3,
        "STL": 0.7,
        "BLK": 0.3,
        "TOV": 0.4,
        "PF": 1.7,
        "PTS": 5.4
      },
      "advanced": {
        "USG%": "10.4%",
        "TS%": "56.3%",
        "AST%": "7.3%",
        "TRB%": "10.8%",
        "ORB%": "4.5%",
        "DRB%": "16.6%",
        "STL%": "1.6%",
        "BLK%": "1.4%",
        "TOV%": "7.2%"
      }
    },
    {
      "name": "Georges Niang",
      "pos": ["PF"],
      "ovr": 76,
      "real_ovr": 77,
      "id": 1627777,
      "basic": {
        "MP": 21.5,
        "FGA": 7.8,
        "FG%": "46.1%",
        "3PA": 5.2,
        "3P%": "40.6%",
        "FTA": 0.7,
        "FT%": "79.3%",
        "ORB": 0.6,
        "DRB": 2.8,
        "AST": 1.4,
        "STL": 0.4,
        "BLK": 0.2,
        "TOV": 1.0,
        "PF": 2.5,
        "PTS": 9.9
      },
      "advanced": {
        "USG%": "17.9%",
        "TS%": "60.7%",
        "AST%": "8.8%",
        "TRB%": "8.7%",
        "ORB%": "3.1%",
        "DRB%": "14.3%",
        "STL%": "0.8%",
        "BLK%": "0.8%",
        "TOV%": "11.3%"
      }
    },
    {
      "name": "Sam Merrill",
      "pos": ["SG"],
      "ovr": 76,
      "real_ovr": 77,
      "id": 1630241,
      "basic": {
        "MP": 19.7,
        "FGA": 6.0,
        "FG%": "40.6%",
        "3PA": 5.2,
        "3P%": "37.2%",
        "FTA": 0.4,
        "FT%": "96.6%",
        "ORB": 0.5,
        "DRB": 1.7,
        "AST": 1.5,
        "STL": 0.7,
        "BLK": 0.2,
        "TOV": 0.5,
        "PF": 1.7,
        "PTS": 7.2
      },
      "advanced": {
        "USG%": "14.3%",
        "TS%": "58.3%",
        "AST%": "9.6%",
        "TRB%": "6.1%",
        "ORB%": "3.0%",
        "DRB%": "8.9%",
        "STL%": "1.8%",
        "BLK%": "0.9%",
        "TOV%": "7.4%"
      }
    },
    {
      "name": "Craig Porter Jr.",
      "pos": ["PG"],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1641854,
      "basic": {
        "MP": 10.1,
        "FGA": 2.7,
        "FG%": "51.4%",
        "3PA": 0.9,
        "3P%": "43.8%",
        "FTA": 0.6,
        "FT%": "71.9%",
        "ORB": 0.4,
        "DRB": 0.9,
        "AST": 1.4,
        "STL": 0.3,
        "BLK": 0.3,
        "TOV": 0.7,
        "PF": 0.5,
        "PTS": 3.7
      },
      "advanced": {
        "USG%": "15.9%",
        "TS%": "61.0%",
        "AST%": "17.7%",
        "TRB%": "7.1%",
        "ORB%": "4.1%",
        "DRB%": "9.9%",
        "STL%": "1.6%",
        "BLK%": "2.6%",
        "TOV%": "19.8%"
      }
    },
    {
      "name": "Jaylon Tyson",
      "pos": ["SF"],
      "ovr": 76,
      "real_ovr": 74,
      "id": 1642281,
      "basic": {
        "MP": 9.6,
        "FGA": 3.2,
        "FG%": "43.0%",
        "3PA": 1.2,
        "3P%": "34.5%",
        "FTA": 0.5,
        "FT%": "79.2%",
        "ORB": 0.8,
        "DRB": 1.3,
        "AST": 0.9,
        "STL": 0.3,
        "BLK": 0.1,
        "TOV": 0.6,
        "PF": 1.1,
        "PTS": 3.6
      },
      "advanced": {
        "USG%": "17.4%",
        "TS%": "52.3%",
        "AST%": "12.4%",
        "TRB%": "11.5%",
        "ORB%": "9.1%",
        "DRB%": "13.7%",
        "STL%": "1.4%",
        "BLK%": "0.6%",
        "TOV%": "14.0%"
      }
    },
    {
      "name": "Tristan Thompson",
      "pos": ["C"],
      "ovr": 74,
      "real_ovr": 75,
      "id": 202684,
      "basic": {
        "MP": 8.2,
        "FGA": 1.8,
        "FG%": "43.7%",
        "3PA": 0.1,
        "3P%": "0.0%",
        "FTA": 0.8,
        "FT%": "23.3%",
        "ORB": 0.8,
        "DRB": 2.6,
        "AST": 0.6,
        "STL": 0.1,
        "BLK": 0.3,
        "TOV": 0.4,
        "PF": 0.9,
        "PTS": 1.7
      },
      "advanced": {
        "USG%": "12.7%",
        "TS%": "41.0%",
        "AST%": "8.8%",
        "TRB%": "22.1%",
        "ORB%": "10.9%",
        "DRB%": "32.7%",
        "STL%": "0.3%",
        "BLK%": "3.0%",
        "TOV%": "14.3%"
      }
    },
    {
      "name": "JT Thor",
      "pos": ["PF"],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1630550,
      "basic": {
        "MP": 12.5,
        "FGA": 3.0,
        "FG%": "42.4%",
        "3PA": 1.1,
        "3P%": "28.6%",
        "FTA": 1.1,
        "FT%": "68.2%",
        "ORB": 1.0,
        "DRB": 1.4,
        "AST": 0.3,
        "STL": 0.4,
        "BLK": 0.5,
        "TOV": 0.5,
        "PF": 0.9,
        "PTS": 3.6
      },
      "advanced": {
        "USG%": "13.1%",
        "TS%": "51.7%",
        "AST%": "3.3%",
        "TRB%": "10.1%",
        "ORB%": "8.4%",
        "DRB%": "11.8%",
        "STL%": "1.5%",
        "BLK%": "3.2%",
        "TOV%": "11.6%"
      }
    }
  ]
,
  "DAL": [
    {
      "name": "Anthony Davis",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 95,
      "real_ovr": 92,
      "id": 203076,
      "basic": {
        "MP": 33.5,
        "FGA": 17.8,
        "FG%": "51.6%",
        "3PA": 2.4,
        "3P%": "28.2%",
        "FTA": 7.2,
        "FT%": "77.5%",
        "ORB": 2.6,
        "DRB": 8.9,
        "AST": 3.5,
        "STL": 1.2,
        "BLK": 2.2,
        "TOV": 2.2,
        "PF": 1.9,
        "PTS": 24.7
      },
      "advanced": {
        "USG%": "30.4%",
        "TS%": "58.8%",
        "AST%": "18.3%",
        "TRB%": "19.4%",
        "ORB%": "9.1%",
        "DRB%": "29.1%",
        "STL%": "1.7%",
        "BLK%": "6.0%",
        "TOV%": "9.5%"
      }
    },
    {
      "name": "Kyrie Irving",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 91,
      "real_ovr": 89,
      "id": 202681,
      "basic": {
        "MP": 36.1,
        "FGA": 18.9,
        "FG%": "47.3%",
        "3PA": 7.2,
        "3P%": "40.1%",
        "FTA": 4.3,
        "FT%": "91.6%",
        "ORB": 1.2,
        "DRB": 3.6,
        "AST": 4.6,
        "STL": 1.3,
        "BLK": 0.5,
        "TOV": 2.2,
        "PF": 2.0,
        "PTS": 24.7
      },
      "advanced": {
        "USG%": "27.4%",
        "TS%": "59.4%",
        "AST%": "20.5%",
        "TRB%": "7.2%",
        "ORB%": "3.7%",
        "DRB%": "10.6%",
        "STL%": "1.8%",
        "BLK%": "1.1%",
        "TOV%": "9.7%"
      }
    },
    {
      "name": "Klay Thompson",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 82,
      "real_ovr": 81,
      "id": 202691,
      "basic": {
        "MP": 27.3,
        "FGA": 12.2,
        "FG%": "41.2%",
        "3PA": 7.7,
        "3P%": "39.1%",
        "FTA": 1.0,
        "FT%": "90.5%",
        "ORB": 0.6,
        "DRB": 2.8,
        "AST": 2.0,
        "STL": 0.7,
        "BLK": 0.4,
        "TOV": 1.2,
        "PF": 1.1,
        "PTS": 14.0
      },
      "advanced": {
        "USG%": "21.8%",
        "TS%": "55.2%",
        "AST%": "10.7%",
        "TRB%": "6.8%",
        "ORB%": "2.5%",
        "DRB%": "11.0%",
        "STL%": "1.2%",
        "BLK%": "1.3%",
        "TOV%": "8.8%"
      }
    },
    {
      "name": "P.J. Washington",
      "pos": [
        "PF"
      ],
      "ovr": 82,
      "real_ovr": 83,
      "id": 1629023,
      "basic": {
        "MP": 32.2,
        "FGA": 11.7,
        "FG%": "45.3%",
        "3PA": 4.2,
        "3P%": "38.1%",
        "FTA": 3.5,
        "FT%": "72.2%",
        "ORB": 1.4,
        "DRB": 6.3,
        "AST": 2.3,
        "STL": 1.1,
        "BLK": 1.1,
        "TOV": 2.1,
        "PF": 2.3,
        "PTS": 14.7
      },
      "advanced": {
        "USG%": "20.4%",
        "TS%": "55.6%",
        "AST%": "10.1%",
        "TRB%": "13.1%",
        "ORB%": "5.0%",
        "DRB%": "20.9%",
        "STL%": "1.7%",
        "BLK%": "2.8%",
        "TOV%": "13.6%"
      }
    },
    {
      "name": "Dereck Lively II",
      "pos": [
        "C"
      ],
      "ovr": 82,
      "real_ovr": 80,
      "id": 1641726,
      "basic": {
        "MP": 23.1,
        "FGA": 5.3,
        "FG%": "70.2%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 2.0,
        "FT%": "63.0%",
        "ORB": 2.9,
        "DRB": 4.6,
        "AST": 2.4,
        "STL": 0.6,
        "BLK": 1.6,
        "TOV": 1.1,
        "PF": 2.8,
        "PTS": 8.7
      },
      "advanced": {
        "USG%": "13.6%",
        "TS%": "70.4%",
        "AST%": "14.3%",
        "TRB%": "17.7%",
        "ORB%": "13.9%",
        "DRB%": "21.3%",
        "STL%": "1.2%",
        "BLK%": "5.7%",
        "TOV%": "15.5%"
      }
    },
    {
      "name": "Daniel Gafford",
      "pos": [
        "C"
      ],
      "ovr": 81,
      "real_ovr": 82,
      "id": 1629655,
      "basic": {
        "MP": 21.5,
        "FGA": 7.1,
        "FG%": "70.2%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 3.4,
        "FT%": "68.9%",
        "ORB": 2.7,
        "DRB": 4.1,
        "AST": 1.4,
        "STL": 0.4,
        "BLK": 1.8,
        "TOV": 1.2,
        "PF": 2.7,
        "PTS": 12.3
      },
      "advanced": {
        "USG%": "19.5%",
        "TS%": "71.6%",
        "AST%": "10.2%",
        "TRB%": "17.2%",
        "ORB%": "14.1%",
        "DRB%": "20.3%",
        "STL%": "0.9%",
        "BLK%": "7.1%",
        "TOV%": "11.9%"
      }
    },
    {
      "name": "Naji Marshall",
      "pos": [
        "SF"
      ],
      "ovr": 80,
      "real_ovr": 81,
      "id": 1630230,
      "basic": {
        "MP": 27.8,
        "FGA": 10.3,
        "FG%": "50.8%",
        "3PA": 3.2,
        "3P%": "27.5%",
        "FTA": 2.3,
        "FT%": "81.3%",
        "ORB": 1.1,
        "DRB": 3.7,
        "AST": 3.0,
        "STL": 1.0,
        "BLK": 0.2,
        "TOV": 1.6,
        "PF": 1.6,
        "PTS": 13.2
      },
      "advanced": {
        "USG%": "20.0%",
        "TS%": "58.4%",
        "AST%": "15.8%",
        "TRB%": "9.3%",
        "ORB%": "4.4%",
        "DRB%": "14.0%",
        "STL%": "1.8%",
        "BLK%": "0.5%",
        "TOV%": "12.5%"
      }
    },
    {
      "name": "Spencer Dinwiddie",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 203915,
      "basic": {
        "MP": 27.0,
        "FGA": 8.6,
        "FG%": "41.6%",
        "3PA": 4.1,
        "3P%": "33.4%",
        "FTA": 3.1,
        "FT%": "80.2%",
        "ORB": 0.2,
        "DRB": 2.4,
        "AST": 4.4,
        "STL": 0.9,
        "BLK": 0.2,
        "TOV": 1.3,
        "PF": 1.5,
        "PTS": 11.0
      },
      "advanced": {
        "USG%": "17.9%",
        "TS%": "55.3%",
        "AST%": "22.1%",
        "TRB%": "5.3%",
        "ORB%": "0.9%",
        "DRB%": "9.5%",
        "STL%": "1.6%",
        "BLK%": "0.7%",
        "TOV%": "11.4%"
      }
    },
    {
      "name": "Max Christie",
      "pos": [
        "SG"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1631108,
      "basic": {
        "MP": 27.3,
        "FGA": 7.6,
        "FG%": "42.7%",
        "3PA": 4.0,
        "3P%": "36.6%",
        "FTA": 1.9,
        "FT%": "85.5%",
        "ORB": 0.5,
        "DRB": 2.8,
        "AST": 1.9,
        "STL": 0.8,
        "BLK": 0.4,
        "TOV": 1.1,
        "PF": 1.5,
        "PTS": 9.6
      },
      "advanced": {
        "USG%": "15.2%",
        "TS%": "57.0%",
        "AST%": "9.2%",
        "TRB%": "6.7%",
        "ORB%": "2.0%",
        "DRB%": "11.2%",
        "STL%": "1.5%",
        "BLK%": "1.3%",
        "TOV%": "11.8%"
      }
    },
    {
      "name": "Quentin Grimes",
      "pos": [
        "SG"
      ],
      "ovr": 78,
      "real_ovr": 82,
      "id": 1629656,
      "basic": {
        "MP": 26.8,
        "FGA": 11.0,
        "FG%": "46.7%",
        "3PA": 5.6,
        "3P%": "38.5%",
        "FTA": 2.9,
        "FT%": "75.7%",
        "ORB": 0.8,
        "DRB": 3.5,
        "AST": 3.0,
        "STL": 1.0,
        "BLK": 0.3,
        "TOV": 1.9,
        "PF": 1.8,
        "PTS": 14.6
      },
      "advanced": {
        "USG%": "22.8%",
        "TS%": "59.5%",
        "AST%": "17.7%",
        "TRB%": "8.9%",
        "ORB%": "3.2%",
        "DRB%": "14.7%",
        "STL%": "1.8%",
        "BLK%": "1.0%",
        "TOV%": "13.3%"
      }
    },
    {
      "name": "Jaden Hardy",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 77,
      "real_ovr": 76,
      "id": 1630702,
      "basic": {
        "MP": 15.9,
        "FGA": 7.3,
        "FG%": "43.5%",
        "3PA": 3.5,
        "3P%": "38.6%",
        "FTA": 1.5,
        "FT%": "69.8%",
        "ORB": 0.2,
        "DRB": 1.4,
        "AST": 1.4,
        "STL": 0.5,
        "BLK": 0.1,
        "TOV": 1.4,
        "PF": 1.6,
        "PTS": 8.7
      },
      "advanced": {
        "USG%": "25.3%",
        "TS%": "54.9%",
        "AST%": "13.2%",
        "TRB%": "5.3%",
        "ORB%": "1.1%",
        "DRB%": "9.4%",
        "STL%": "1.5%",
        "BLK%": "0.5%",
        "TOV%": "15.4%"
      }
    },
    {
      "name": "Dante Exum",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 76,
      "real_ovr": 77,
      "id": 203957,
      "basic": {
        "MP": 18.6,
        "FGA": 6.7,
        "FG%": "47.8%",
        "3PA": 2.7,
        "3P%": "43.4%",
        "FTA": 1.6,
        "FT%": "74.2%",
        "ORB": 0.2,
        "DRB": 1.5,
        "AST": 2.8,
        "STL": 0.6,
        "BLK": 0.2,
        "TOV": 1.1,
        "PF": 1.7,
        "PTS": 8.7
      },
      "advanced": {
        "USG%": "19.6%",
        "TS%": "58.9%",
        "AST%": "21.5%",
        "TRB%": "4.8%",
        "ORB%": "1.2%",
        "DRB%": "8.3%",
        "STL%": "1.6%",
        "BLK%": "0.7%",
        "TOV%": "13.0%"
      }
    },
    {
      "name": "Dwight Powell",
      "pos": [
        "C"
      ],
      "ovr": 74,
      "real_ovr": 73,
      "id": 203939,
      "basic": {
        "MP": 10.0,
        "FGA": 1.1,
        "FG%": "68.9%",
        "3PA": 0.1,
        "3P%": "40.0%",
        "FTA": 0.8,
        "FT%": "65.1%",
        "ORB": 0.9,
        "DRB": 1.3,
        "AST": 1.0,
        "STL": 0.3,
        "BLK": 0.4,
        "TOV": 0.3,
        "PF": 1.4,
        "PTS": 2.1
      },
      "advanced": {
        "USG%": "7.6%",
        "TS%": "71.3%",
        "AST%": "12.5%",
        "TRB%": "11.7%",
        "ORB%": "9.5%",
        "DRB%": "13.7%",
        "STL%": "1.6%",
        "BLK%": "3.3%",
        "TOV%": "18.4%"
      }
    },
    {
      "name": "Olivier-Maxence Prosper",
      "pos": [
        "PF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1641765,
      "basic": {
        "MP": 11.2,
        "FGA": 3.3,
        "FG%": "40.2%",
        "3PA": 1.0,
        "3P%": "23.5%",
        "FTA": 1.5,
        "FT%": "64.5%",
        "ORB": 0.8,
        "DRB": 1.6,
        "AST": 0.8,
        "STL": 0.5,
        "BLK": 0.1,
        "TOV": 0.3,
        "PF": 0.5,
        "PTS": 3.9
      },
      "advanced": {
        "USG%": "16.3%",
        "TS%": "48.4%",
        "AST%": "9.1%",
        "TRB%": "11.8%",
        "ORB%": "8.4%",
        "DRB%": "15.0%",
        "STL%": "2.2%",
        "BLK%": "0.9%",
        "TOV%": "6.3%"
      }
    },
    {
      "name": "Kessler Edwards",
      "pos": [
        "SF"
      ],
      "ovr": 73,
      "real_ovr": 75,
      "id": 1630556,
      "basic": {
        "MP": 15.2,
        "FGA": 3.4,
        "FG%": "49.6%",
        "3PA": 1.4,
        "3P%": "40.7%",
        "FTA": 0.3,
        "FT%": "92.3%",
        "ORB": 0.6,
        "DRB": 2.3,
        "AST": 1.1,
        "STL": 0.5,
        "BLK": 0.5,
        "TOV": 0.4,
        "PF": 1.6,
        "PTS": 4.2
      },
      "advanced": {
        "USG%": "11.1%",
        "TS%": "59.7%",
        "AST%": "9.1%",
        "TRB%": "10.3%",
        "ORB%": "4.0%",
        "DRB%": "16.3%",
        "STL%": "1.5%",
        "BLK%": "2.8%",
        "TOV%": "10.2%"
      }
    }
  ]
,
  "DEN": [
    {
      "name": "Nikola Jokić",
      "pos": [
        "C"
      ],
      "ovr": 98,
      "real_ovr": 97,
      "id": 203999,
      "basic": {
        "MP": 36.7,
        "FGA": 19.5,
        "FG%": "57.6%",
        "3PA": 4.7,
        "3P%": "41.7%",
        "FTA": 6.4,
        "FT%": "80.0%",
        "ORB": 2.9,
        "DRB": 9.9,
        "AST": 10.2,
        "STL": 1.8,
        "BLK": 0.6,
        "TOV": 3.3,
        "PF": 2.3,
        "PTS": 29.6
      },
      "advanced": {
        "USG%": "29.5%",
        "TS%": "66.3%",
        "AST%": "44.1%",
        "TRB%": "19.1%",
        "ORB%": "9.0%",
        "DRB%": "28.2%",
        "STL%": "2.4%",
        "BLK%": "1.6%",
        "TOV%": "12.8%"
      }
    },
    {
      "name": "Jamal Murray",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 86,
      "real_ovr": 87,
      "id": 1627750,
      "basic": {
        "MP": 36.1,
        "FGA": 16.7,
        "FG%": "47.4%",
        "3PA": 5.9,
        "3P%": "39.3%",
        "FTA": 3.7,
        "FT%": "88.6%",
        "ORB": 0.7,
        "DRB": 3.2,
        "AST": 6.0,
        "STL": 1.4,
        "BLK": 0.5,
        "TOV": 2.1,
        "PF": 1.9,
        "PTS": 21.4
      },
      "advanced": {
        "USG%": "24.0%",
        "TS%": "58.4%",
        "AST%": "23.2%",
        "TRB%": "5.9%",
        "ORB%": "2.2%",
        "DRB%": "9.3%",
        "STL%": "1.8%",
        "BLK%": "1.2%",
        "TOV%": "10.1%"
      }
    },
    {
      "name": "Michael Porter Jr.",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 84,
      "real_ovr": 84,
      "id": 1629008,
      "basic": {
        "MP": 33.7,
        "FGA": 13.6,
        "FG%": "50.4%",
        "3PA": 6.4,
        "3P%": "39.5%",
        "FTA": 2.5,
        "FT%": "76.8%",
        "ORB": 1.8,
        "DRB": 5.2,
        "AST": 2.1,
        "STL": 0.6,
        "BLK": 0.5,
        "TOV": 1.4,
        "PF": 2.0,
        "PTS": 18.2
      },
      "advanced": {
        "USG%": "20.2%",
        "TS%": "61.7%",
        "AST%": "8.7%",
        "TRB%": "11.4%",
        "ORB%": "6.1%",
        "DRB%": "16.2%",
        "STL%": "0.9%",
        "BLK%": "1.3%",
        "TOV%": "8.4%"
      }
    },
    {
      "name": "Aaron Gordon",
      "pos": [
        "PF"
      ],
      "ovr": 84,
      "real_ovr": 82,
      "id": 203932,
      "basic": {
        "MP": 28.4,
        "FGA": 9.7,
        "FG%": "53.1%",
        "3PA": 3.4,
        "3P%": "43.6%",
        "FTA": 3.5,
        "FT%": "81.0%",
        "ORB": 1.6,
        "DRB": 3.3,
        "AST": 3.2,
        "STL": 0.5,
        "BLK": 0.3,
        "TOV": 1.4,
        "PF": 1.6,
        "PTS": 14.7
      },
      "advanced": {
        "USG%": "19.0%",
        "TS%": "65.0%",
        "AST%": "15.0%",
        "TRB%": "9.4%",
        "ORB%": "6.4%",
        "DRB%": "12.1%",
        "STL%": "0.8%",
        "BLK%": "0.9%",
        "TOV%": "11.3%"
      }
    },
    {
      "name": "Russell Westbrook",
      "pos": [
        "PG"
      ],
      "ovr": 80,
      "real_ovr": 82,
      "id": 201566,
      "basic": {
        "MP": 27.9,
        "FGA": 11.1,
        "FG%": "44.9%",
        "3PA": 3.9,
        "3P%": "32.3%",
        "FTA": 3.1,
        "FT%": "66.1%",
        "ORB": 1.4,
        "DRB": 3.6,
        "AST": 6.1,
        "STL": 1.4,
        "BLK": 0.5,
        "TOV": 3.2,
        "PF": 2.5,
        "PTS": 13.3
      },
      "advanced": {
        "USG%": "23.8%",
        "TS%": "53.2%",
        "AST%": "28.8%",
        "TRB%": "9.7%",
        "ORB%": "5.6%",
        "DRB%": "13.4%",
        "STL%": "2.4%",
        "BLK%": "1.6%",
        "TOV%": "20.6%"
      }
    },
    {
      "name": "Christian Braun",
      "pos": [
        "SG"
      ],
      "ovr": 80,
      "real_ovr": 82,
      "id": 1631128,
      "basic": {
        "MP": 33.9,
        "FGA": 10.4,
        "FG%": "58.0%",
        "3PA": 2.8,
        "3P%": "39.7%",
        "FTA": 2.7,
        "FT%": "82.7%",
        "ORB": 1.2,
        "DRB": 3.9,
        "AST": 2.6,
        "STL": 1.1,
        "BLK": 0.5,
        "TOV": 1.0,
        "PF": 2.2,
        "PTS": 15.4
      },
      "advanced": {
        "USG%": "15.8%",
        "TS%": "66.5%",
        "AST%": "10.1%",
        "TRB%": "8.4%",
        "ORB%": "4.2%",
        "DRB%": "12.2%",
        "STL%": "1.5%",
        "BLK%": "1.2%",
        "TOV%": "8.1%"
      }
    },
    {
      "name": "Peyton Watson",
      "pos": [
        "SF"
      ],
      "ovr": 77,
      "real_ovr": 78,
      "id": 1631212,
      "basic": {
        "MP": 24.4,
        "FGA": 6.3,
        "FG%": "47.7%",
        "3PA": 2.0,
        "3P%": "35.3%",
        "FTA": 2.0,
        "FT%": "69.3%",
        "ORB": 0.7,
        "DRB": 2.7,
        "AST": 1.4,
        "STL": 0.7,
        "BLK": 1.4,
        "TOV": 0.8,
        "PF": 1.8,
        "PTS": 8.1
      },
      "advanced": {
        "USG%": "13.9%",
        "TS%": "56.4%",
        "AST%": "7.0%",
        "TRB%": "7.7%",
        "ORB%": "3.3%",
        "DRB%": "11.8%",
        "STL%": "1.4%",
        "BLK%": "5.0%",
        "TOV%": "10.3%"
      }
    },
    {
      "name": "Julian Strawther",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 77,
      "real_ovr": 76,
      "id": 1631124,
      "basic": {
        "MP": 21.3,
        "FGA": 7.5,
        "FG%": "43.2%",
        "3PA": 4.1,
        "3P%": "34.9%",
        "FTA": 1.4,
        "FT%": "82.2%",
        "ORB": 0.3,
        "DRB": 1.9,
        "AST": 1.3,
        "STL": 0.6,
        "BLK": 0.2,
        "TOV": 0.9,
        "PF": 2.3,
        "PTS": 9.0
      },
      "advanced": {
        "USG%": "17.8%",
        "TS%": "55.9%",
        "AST%": "7.6%",
        "TRB%": "5.6%",
        "ORB%": "1.4%",
        "DRB%": "9.5%",
        "STL%": "1.4%",
        "BLK%": "1.0%",
        "TOV%": "9.8%"
      }
    },
    {
      "name": "Dario Šarić",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 76,
      "real_ovr": 75,
      "id": 203967,
      "basic": {
        "MP": 13.1,
        "FGA": 3.6,
        "FG%": "36.2%",
        "3PA": 1.6,
        "3P%": "26.9%",
        "FTA": 0.6,
        "FT%": "70.0%",
        "ORB": 0.9,
        "DRB": 2.3,
        "AST": 1.4,
        "STL": 0.4,
        "BLK": 0.1,
        "TOV": 0.9,
        "PF": 1.2,
        "PTS": 3.5
      },
      "advanced": {
        "USG%": "15.6%",
        "TS%": "44.9%",
        "AST%": "13.1%",
        "TRB%": "13.1%",
        "ORB%": "7.7%",
        "DRB%": "17.9%",
        "STL%": "1.6%",
        "BLK%": "0.4%",
        "TOV%": "19.4%"
      }
    },
    {
      "name": "Zeke Nnaji",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 75,
      "real_ovr": 74,
      "id": 1630192,
      "basic": {
        "MP": 10.7,
        "FGA": 2.5,
        "FG%": "49.6%",
        "3PA": 0.9,
        "3P%": "32.7%",
        "FTA": 0.8,
        "FT%": "61.4%",
        "ORB": 0.6,
        "DRB": 1.0,
        "AST": 0.4,
        "STL": 0.4,
        "BLK": 0.7,
        "TOV": 0.2,
        "PF": 1.1,
        "PTS": 3.2
      },
      "advanced": {
        "USG%": "12.2%",
        "TS%": "57.4%",
        "AST%": "4.6%",
        "TRB%": "8.1%",
        "ORB%": "6.3%",
        "DRB%": "9.8%",
        "STL%": "2.0%",
        "BLK%": "5.6%",
        "TOV%": "8.0%"
      }
    },
    {
      "name": "DeAndre Jordan",
      "pos": [
        "C"
      ],
      "ovr": 75,
      "real_ovr": 76,
      "id": 201599,
      "basic": {
        "MP": 12.3,
        "FGA": 2.5,
        "FG%": "65.0%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 1.1,
        "FT%": "42.2%",
        "ORB": 1.5,
        "DRB": 3.6,
        "AST": 0.9,
        "STL": 0.3,
        "BLK": 0.5,
        "TOV": 0.7,
        "PF": 1.3,
        "PTS": 3.7
      },
      "advanced": {
        "USG%": "12.8%",
        "TS%": "62.1%",
        "AST%": "9.5%",
        "TRB%": "22.6%",
        "ORB%": "14.0%",
        "DRB%": "30.3%",
        "STL%": "1.1%",
        "BLK%": "3.5%",
        "TOV%": "19.2%"
      }
    },
    {
      "name": "Vlatko Čančar",
      "pos": [
        "PF"
      ],
      "ovr": 74,
      "real_ovr": 73,
      "id": 1628427,
      "basic": {
        "MP": 10.5,
        "FGA": 2.0,
        "FG%": "38.5%",
        "3PA": 1.2,
        "3P%": "26.7%",
        "FTA": 0.0,
        "FT%": "0.0%",
        "ORB": 0.5,
        "DRB": 2.0,
        "AST": 0.7,
        "STL": 0.2,
        "BLK": 0.2,
        "TOV": 0.8,
        "PF": 0.8,
        "PTS": 1.8
      },
      "advanced": {
        "USG%": "11.5%",
        "TS%": "46.2%",
        "AST%": "7.7%",
        "TRB%": "12.9%",
        "ORB%": "5.1%",
        "DRB%": "20.0%",
        "STL%": "1.1%",
        "BLK%": "1.3%",
        "TOV%": "29.7%"
      }
    },
    {
      "name": "Jalen Pickett",
      "pos": [
        "PG"
      ],
      "ovr": 73,
      "real_ovr": 75,
      "id": 1629618,
      "basic": {
        "MP": 13.6,
        "FGA": 3.7,
        "FG%": "42.8%",
        "3PA": 2.1,
        "3P%": "39.6%",
        "FTA": 0.2,
        "FT%": "75.0%",
        "ORB": 0.3,
        "DRB": 1.1,
        "AST": 2.2,
        "STL": 0.4,
        "BLK": 0.1,
        "TOV": 0.5,
        "PF": 0.8,
        "PTS": 4.1
      },
      "advanced": {
        "USG%": "13.2%",
        "TS%": "54.5%",
        "AST%": "19.5%",
        "TRB%": "5.9%",
        "ORB%": "2.6%",
        "DRB%": "8.8%",
        "STL%": "1.4%",
        "BLK%": "0.7%",
        "TOV%": "11.6%"
      }
    },
    {
      "name": "Hunter Tyson",
      "pos": [
        "PF"
      ],
      "ovr": 73,
      "real_ovr": 72,
      "id": 1641816,
      "basic": {
        "MP": 7.8,
        "FGA": 2.4,
        "FG%": "37.5%",
        "3PA": 1.5,
        "3P%": "31.1%",
        "FTA": 0.5,
        "FT%": "75.0%",
        "ORB": 0.5,
        "DRB": 1.0,
        "AST": 0.4,
        "STL": 0.2,
        "BLK": 0.1,
        "TOV": 0.3,
        "PF": 0.9,
        "PTS": 2.6
      },
      "advanced": {
        "USG%": "15.5%",
        "TS%": "50.6%",
        "AST%": "6.1%",
        "TRB%": "10.7%",
        "ORB%": "7.2%",
        "DRB%": "13.9%",
        "STL%": "1.2%",
        "BLK%": "1.3%",
        "TOV%": "9.6%"
      }
    },
    {
      "name": "DaRon Holmes II",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1641747,
      "note": "Season-ending injury (0 GP)",
      "basic": {
        "MP": 0.0,
        "FGA": 0.0,
        "FG%": "0.0%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 0.0,
        "FT%": "0.0%",
        "ORB": 0.0,
        "DRB": 0.0,
        "AST": 0.0,
        "STL": 0.0,
        "BLK": 0.0,
        "TOV": 0.0,
        "PF": 0.0,
        "PTS": 0.0
      },
      "advanced": {
        "USG%": "0.0%",
        "TS%": "0.0%",
        "AST%": "0.0%",
        "TRB%": "0.0%",
        "ORB%": "0.0%",
        "DRB%": "0.0%",
        "STL%": "0.0%",
        "BLK%": "0.0%",
        "TOV%": "0.0%"
      }
    }
  ]
,
  "DET": [
    {
      "name": "Cade Cunningham",
      "pos": [
        "PG"
      ],
      "ovr": 90,
      "real_ovr": 92,
      "id": 1630595,
      "basic": {
        "MP": 35.0,
        "FGA": 20.8,
        "FG%": "46.9%",
        "3PA": 6.0,
        "3P%": "35.6%",
        "FTA": 5.3,
        "FT%": "84.6%",
        "ORB": 0.8,
        "DRB": 5.3,
        "AST": 9.1,
        "STL": 1.0,
        "BLK": 0.8,
        "TOV": 4.4,
        "PF": 2.8,
        "PTS": 26.1
      },
      "advanced": {
        "USG%": "33.2%",
        "TS%": "56.5%",
        "AST%": "43.0%",
        "TRB%": "9.6%",
        "ORB%": "2.5%",
        "DRB%": "16.5%",
        "STL%": "1.4%",
        "BLK%": "2.1%",
        "TOV%": "16.0%"
      }
    },
    {
      "name": "Jaden Ivey",
      "pos": [
        "SG"
      ],
      "ovr": 83,
      "real_ovr": 84,
      "id": 1631093,
      "basic": {
        "MP": 29.9,
        "FGA": 13.8,
        "FG%": "46.0%",
        "3PA": 5.1,
        "3P%": "40.9%",
        "FTA": 3.9,
        "FT%": "73.3%",
        "ORB": 1.3,
        "DRB": 2.8,
        "AST": 4.0,
        "STL": 0.9,
        "BLK": 0.4,
        "TOV": 3.0,
        "PF": 2.2,
        "PTS": 17.6
      },
      "advanced": {
        "USG%": "26.0%",
        "TS%": "56.9%",
        "AST%": "19.7%",
        "TRB%": "7.6%",
        "ORB%": "5.0%",
        "DRB%": "10.3%",
        "STL%": "1.5%",
        "BLK%": "1.2%",
        "TOV%": "16.1%"
      }
    },
    {
      "name": "Jalen Duren",
      "pos": [
        "C"
      ],
      "ovr": 83,
      "real_ovr": 82,
      "id": 1631105,
      "basic": {
        "MP": 26.1,
        "FGA": 7.0,
        "FG%": "69.2%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 3.1,
        "FT%": "66.9%",
        "ORB": 3.6,
        "DRB": 6.8,
        "AST": 2.7,
        "STL": 0.7,
        "BLK": 1.1,
        "TOV": 1.7,
        "PF": 3.2,
        "PTS": 11.8
      },
      "advanced": {
        "USG%": "16.4%",
        "TS%": "70.3%",
        "AST%": "14.7%",
        "TRB%": "22.0%",
        "ORB%": "15.2%",
        "DRB%": "28.7%",
        "STL%": "1.3%",
        "BLK%": "4.2%",
        "TOV%": "17.2%"
      }
    },
    {
      "name": "Tobias Harris",
      "pos": [
        "PF"
      ],
      "ovr": 82,
      "real_ovr": 82,
      "id": 202699,
      "basic": {
        "MP": 31.6,
        "FGA": 11.0,
        "FG%": "47.7%",
        "3PA": 3.6,
        "3P%": "34.5%",
        "FTA": 2.3,
        "FT%": "86.1%",
        "ORB": 0.9,
        "DRB": 5.0,
        "AST": 2.2,
        "STL": 1.0,
        "BLK": 0.8,
        "TOV": 1.2,
        "PF": 1.9,
        "PTS": 13.7
      },
      "advanced": {
        "USG%": "17.6%",
        "TS%": "57.1%",
        "AST%": "9.8%",
        "TRB%": "10.4%",
        "ORB%": "3.1%",
        "DRB%": "17.5%",
        "STL%": "1.5%",
        "BLK%": "2.4%",
        "TOV%": "8.8%"
      }
    },
    {
      "name": "Ausar Thompson",
      "pos": [
        "SF"
      ],
      "ovr": 82,
      "real_ovr": 80,
      "id": 1641709,
      "basic": {
        "MP": 22.5,
        "FGA": 7.8,
        "FG%": "53.5%",
        "3PA": 0.8,
        "3P%": "22.4%",
        "FTA": 2.4,
        "FT%": "64.1%",
        "ORB": 1.9,
        "DRB": 3.3,
        "AST": 2.3,
        "STL": 1.7,
        "BLK": 0.7,
        "TOV": 1.4,
        "PF": 2.8,
        "PTS": 10.1
      },
      "advanced": {
        "USG%": "19.1%",
        "TS%": "56.8%",
        "AST%": "14.4%",
        "TRB%": "12.6%",
        "ORB%": "9.3%",
        "DRB%": "15.9%",
        "STL%": "3.5%",
        "BLK%": "2.9%",
        "TOV%": "13.3%"
      }
    },
    {
      "name": "Tim Hardaway Jr.",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 80,
      "real_ovr": 78,
      "id": 203501,
      "basic": {
        "MP": 28.0,
        "FGA": 8.8,
        "FG%": "40.6%",
        "3PA": 5.9,
        "3P%": "36.8%",
        "FTA": 1.9,
        "FT%": "85.5%",
        "ORB": 0.2,
        "DRB": 2.1,
        "AST": 1.6,
        "STL": 0.5,
        "BLK": 0.1,
        "TOV": 0.6,
        "PF": 1.2,
        "PTS": 11.0
      },
      "advanced": {
        "USG%": "15.5%",
        "TS%": "56.7%",
        "AST%": "7.6%",
        "TRB%": "4.7%",
        "ORB%": "0.9%",
        "DRB%": "8.4%",
        "STL%": "0.8%",
        "BLK%": "0.3%",
        "TOV%": "6.1%"
      }
    },
    {
      "name": "Malik Beasley",
      "pos": [
        "SG"
      ],
      "ovr": 79,
      "real_ovr": 82,
      "id": 1627736,
      "basic": {
        "MP": 27.8,
        "FGA": 13.1,
        "FG%": "43.0%",
        "3PA": 9.3,
        "3P%": "41.6%",
        "FTA": 1.7,
        "FT%": "67.9%",
        "ORB": 0.6,
        "DRB": 2.0,
        "AST": 1.7,
        "STL": 0.9,
        "BLK": 0.1,
        "TOV": 1.0,
        "PF": 1.5,
        "PTS": 16.3
      },
      "advanced": {
        "USG%": "22.5%",
        "TS%": "59.0%",
        "AST%": "8.9%",
        "TRB%": "5.2%",
        "ORB%": "2.3%",
        "DRB%": "8.0%",
        "STL%": "1.5%",
        "BLK%": "0.2%",
        "TOV%": "6.8%"
      }
    },
    {
      "name": "Isaiah Stewart",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1630191,
      "basic": {
        "MP": 19.9,
        "FGA": 4.4,
        "FG%": "55.9%",
        "3PA": 0.7,
        "3P%": "32.1%",
        "FTA": 1.2,
        "FT%": "75.9%",
        "ORB": 1.8,
        "DRB": 3.7,
        "AST": 1.7,
        "STL": 0.4,
        "BLK": 1.4,
        "TOV": 0.9,
        "PF": 2.5,
        "PTS": 6.0
      },
      "advanced": {
        "USG%": "12.4%",
        "TS%": "61.6%",
        "AST%": "11.3%",
        "TRB%": "15.4%",
        "ORB%": "10.1%",
        "DRB%": "20.6%",
        "STL%": "0.9%",
        "BLK%": "6.7%",
        "TOV%": "16.1%"
      }
    },
    {
      "name": "Simone Fontecchio",
      "pos": [
        "SF"
      ],
      "ovr": 76,
      "real_ovr": 75,
      "id": 1631323,
      "basic": {
        "MP": 16.5,
        "FGA": 5.0,
        "FG%": "40.2%",
        "3PA": 3.0,
        "3P%": "33.5%",
        "FTA": 1.1,
        "FT%": "83.3%",
        "ORB": 0.7,
        "DRB": 2.2,
        "AST": 0.9,
        "STL": 0.4,
        "BLK": 0.2,
        "TOV": 0.7,
        "PF": 1.3,
        "PTS": 5.9
      },
      "advanced": {
        "USG%": "15.8%",
        "TS%": "54.4%",
        "AST%": "6.9%",
        "TRB%": "9.6%",
        "ORB%": "4.7%",
        "DRB%": "14.5%",
        "STL%": "1.2%",
        "BLK%": "0.9%",
        "TOV%": "11.6%"
      }
    },
    {
      "name": "Ron Holland II",
      "pos": [
        "SF"
      ],
      "ovr": 76,
      "real_ovr": 75,
      "id": 1641842,
      "basic": {
        "MP": 15.6,
        "FGA": 5.1,
        "FG%": "47.4%",
        "3PA": 1.9,
        "3P%": "23.8%",
        "FTA": 1.5,
        "FT%": "75.4%",
        "ORB": 0.5,
        "DRB": 2.2,
        "AST": 1.0,
        "STL": 0.6,
        "BLK": 0.2,
        "TOV": 0.9,
        "PF": 1.7,
        "PTS": 6.4
      },
      "advanced": {
        "USG%": "18.1%",
        "TS%": "55.6%",
        "AST%": "8.9%",
        "TRB%": "9.5%",
        "ORB%": "3.5%",
        "DRB%": "15.5%",
        "STL%": "1.9%",
        "BLK%": "1.3%",
        "TOV%": "13.3%"
      }
    },
    {
      "name": "Paul Reed",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 76,
      "real_ovr": 77,
      "id": 1630194,
      "basic": {
        "MP": 9.7,
        "FGA": 3.2,
        "FG%": "50.7%",
        "3PA": 0.6,
        "3P%": "28.6%",
        "FTA": 0.9,
        "FT%": "76.2%",
        "ORB": 0.9,
        "DRB": 1.8,
        "AST": 1.0,
        "STL": 0.9,
        "BLK": 0.6,
        "TOV": 0.6,
        "PF": 1.7,
        "PTS": 4.1
      },
      "advanced": {
        "USG%": "18.0%",
        "TS%": "57.3%",
        "AST%": "14.0%",
        "TRB%": "15.6%",
        "ORB%": "10.2%",
        "DRB%": "20.8%",
        "STL%": "4.3%",
        "BLK%": "5.4%",
        "TOV%": "13.9%"
      }
    },
    {
      "name": "Marcus Sasser",
      "pos": [
        "PG"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1631204,
      "basic": {
        "MP": 14.2,
        "FGA": 5.2,
        "FG%": "46.3%",
        "3PA": 2.7,
        "3P%": "38.2%",
        "FTA": 0.9,
        "FT%": "84.3%",
        "ORB": 0.3,
        "DRB": 0.9,
        "AST": 2.3,
        "STL": 0.6,
        "BLK": 0.1,
        "TOV": 0.9,
        "PF": 1.3,
        "PTS": 6.6
      },
      "advanced": {
        "USG%": "19.4%",
        "TS%": "58.9%",
        "AST%": "22.9%",
        "TRB%": "4.7%",
        "ORB%": "2.5%",
        "DRB%": "6.9%",
        "STL%": "2.2%",
        "BLK%": "0.5%",
        "TOV%": "14.5%"
      }
    },
    {
      "name": "Wendell Moore Jr.",
      "pos": [
        "SG"
      ],
      "ovr": 74,
      "real_ovr": 75,
      "id": 1631111,
      "basic": {
        "MP": 13.9,
        "FGA": 3.5,
        "FG%": "46.8%",
        "3PA": 1.1,
        "3P%": "34.1%",
        "FTA": 0.6,
        "FT%": "81.8%",
        "ORB": 0.8,
        "DRB": 1.8,
        "AST": 1.2,
        "STL": 0.6,
        "BLK": 0.1,
        "TOV": 0.8,
        "PF": 0.9,
        "PTS": 4.2
      },
      "advanced": {
        "USG%": "13.8%",
        "TS%": "55.3%",
        "AST%": "11.6%",
        "TRB%": "10.3%",
        "ORB%": "6.4%",
        "DRB%": "14.3%",
        "STL%": "1.9%",
        "BLK%": "1.0%",
        "TOV%": "16.6%"
      }
    },
    {
      "name": "Bobi Klintman",
      "pos": [
        "PF"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1641752,
      "basic": {
        "MP": 5.3,
        "FGA": 1.3,
        "FG%": "60.0%",
        "3PA": 0.6,
        "3P%": "40.0%",
        "FTA": 0.3,
        "FT%": "50.0%",
        "ORB": 0.1,
        "DRB": 0.8,
        "AST": 0.9,
        "STL": 0.3,
        "BLK": 0.1,
        "TOV": 0.1,
        "PF": 1.0,
        "PTS": 1.9
      },
      "advanced": {
        "USG%": "11.9%",
        "TS%": "68.9%",
        "AST%": "22.5%",
        "TRB%": "9.2%",
        "ORB%": "2.7%",
        "DRB%": "15.7%",
        "STL%": "2.3%",
        "BLK%": "2.3%",
        "TOV%": "8.4%"
      }
    },
    {
      "name": "Daniss Jenkins",
      "pos": [
        "PG"
      ],
      "ovr": 73,
      "real_ovr": 68,
      "id": 1642450,
      "basic": {
        "MP": 3.3,
        "FGA": 1.4,
        "FG%": "30.0%",
        "3PA": 1.0,
        "3P%": "14.3%",
        "FTA": 0.3,
        "FT%": "0.0%",
        "ORB": 0.0,
        "DRB": 0.3,
        "AST": 0.4,
        "STL": 0.0,
        "BLK": 0.0,
        "TOV": 0.1,
        "PF": 0.3,
        "PTS": 1.0
      },
      "advanced": {
        "USG%": "21.8%",
        "TS%": "32.2%",
        "AST%": "17.3%",
        "TRB%": "4.8%",
        "ORB%": "0.0%",
        "DRB%": "9.6%",
        "STL%": "0.0%",
        "BLK%": "0.0%",
        "TOV%": "8.4%"
      }
    }
  ]
,
  "GSW": [
    {
      "name": "Stephen Curry",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 95,
      "real_ovr": 91,
      "id": 201939,
      "basic": {
        "MP": 32.2,
        "FGA": 18.0,
        "FG%": "44.8%",
        "3PA": 11.2,
        "3P%": "39.7%",
        "FTA": 4.3,
        "FT%": "93.3%",
        "ORB": 0.6,
        "DRB": 3.9,
        "AST": 6.0,
        "STL": 1.1,
        "BLK": 0.4,
        "TOV": 2.9,
        "PF": 1.4,
        "PTS": 24.5
      },
      "advanced": {
        "USG%": "29.8%",
        "TS%": "61.8%",
        "AST%": "31.3%",
        "TRB%": "7.4%",
        "ORB%": "1.9%",
        "DRB%": "13.3%",
        "STL%": "1.7%",
        "BLK%": "1.3%",
        "TOV%": "12.6%"
      }
    },
    {
      "name": "Draymond Green",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 84,
      "real_ovr": 81,
      "id": 203110,
      "basic": {
        "MP": 29.2,
        "FGA": 7.5,
        "FG%": "42.4%",
        "3PA": 3.6,
        "3P%": "32.5%",
        "FTA": 2.2,
        "FT%": "68.7%",
        "ORB": 1.1,
        "DRB": 5.0,
        "AST": 5.6,
        "STL": 1.5,
        "BLK": 1.0,
        "TOV": 2.6,
        "PF": 3.2,
        "PTS": 9.0
      },
      "advanced": {
        "USG%": "15.9%",
        "TS%": "53.4%",
        "AST%": "26.2%",
        "TRB%": "11.2%",
        "ORB%": "3.9%",
        "DRB%": "19.0%",
        "STL%": "2.4%",
        "BLK%": "3.4%",
        "TOV%": "23.3%"
      }
    },
    {
      "name": "Jonathan Kuminga",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 83,
      "real_ovr": 82,
      "id": 1630228,
      "basic": {
        "MP": 24.3,
        "FGA": 12.1,
        "FG%": "45.4%",
        "3PA": 3.2,
        "3P%": "30.5%",
        "FTA": 5.0,
        "FT%": "66.8%",
        "ORB": 1.2,
        "DRB": 3.4,
        "AST": 2.2,
        "STL": 0.8,
        "BLK": 0.4,
        "TOV": 1.5,
        "PF": 1.9,
        "PTS": 15.3
      },
      "advanced": {
        "USG%": "27.4%",
        "TS%": "53.5%",
        "AST%": "14.6%",
        "TRB%": "10.2%",
        "ORB%": "5.1%",
        "DRB%": "15.6%",
        "STL%": "1.6%",
        "BLK%": "1.7%",
        "TOV%": "9.6%"
      }
    },
    {
      "name": "Andrew Wiggins",
      "pos": [
        "SF"
      ],
      "ovr": 82,
      "real_ovr": 84,
      "id": 203952,
      "basic": {
        "MP": 30.7,
        "FGA": 14.0,
        "FG%": "44.8%",
        "3PA": 5.8,
        "3P%": "37.4%",
        "FTA": 4.3,
        "FT%": "76.3%",
        "ORB": 1.5,
        "DRB": 3.0,
        "AST": 2.6,
        "STL": 1.0,
        "BLK": 0.8,
        "TOV": 1.7,
        "PF": 1.7,
        "PTS": 18.0
      },
      "advanced": {
        "USG%": "24.5%",
        "TS%": "56.6%",
        "AST%": "13.5%",
        "TRB%": "7.9%",
        "ORB%": "5.1%",
        "DRB%": "10.8%",
        "STL%": "1.6%",
        "BLK%": "2.6%",
        "TOV%": "9.4%"
      }
    },
    {
      "name": "Brandin Podziemski",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 81,
      "real_ovr": 81,
      "id": 1641764,
      "basic": {
        "MP": 26.8,
        "FGA": 9.8,
        "FG%": "44.5%",
        "3PA": 4.8,
        "3P%": "37.2%",
        "FTA": 1.5,
        "FT%": "75.8%",
        "ORB": 1.0,
        "DRB": 4.1,
        "AST": 3.4,
        "STL": 1.1,
        "BLK": 0.2,
        "TOV": 1.2,
        "PF": 1.5,
        "PTS": 11.7
      },
      "advanced": {
        "USG%": "18.3%",
        "TS%": "55.7%",
        "AST%": "18.7%",
        "TRB%": "10.2%",
        "ORB%": "4.0%",
        "DRB%": "16.8%",
        "STL%": "2.0%",
        "BLK%": "0.7%",
        "TOV%": "10.1%"
      }
    },
    {
      "name": "Buddy Hield",
      "pos": [
        "SG"
      ],
      "ovr": 80,
      "real_ovr": 79,
      "id": 1627741,
      "basic": {
        "MP": 22.7,
        "FGA": 9.6,
        "FG%": "41.7%",
        "3PA": 6.7,
        "3P%": "37.0%",
        "FTA": 0.8,
        "FT%": "82.8%",
        "ORB": 0.6,
        "DRB": 2.6,
        "AST": 1.6,
        "STL": 0.8,
        "BLK": 0.3,
        "TOV": 1.1,
        "PF": 1.6,
        "PTS": 11.1
      },
      "advanced": {
        "USG%": "20.5%",
        "TS%": "56.0%",
        "AST%": "10.7%",
        "TRB%": "7.6%",
        "ORB%": "2.9%",
        "DRB%": "12.7%",
        "STL%": "1.8%",
        "BLK%": "1.2%",
        "TOV%": "10.1%"
      }
    },
    {
      "name": "De'Anthony Melton",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1629001,
      "basic": {
        "MP": 20.2,
        "FGA": 9.0,
        "FG%": "40.7%",
        "3PA": 5.8,
        "3P%": "37.1%",
        "FTA": 1.3,
        "FT%": "62.5%",
        "ORB": 1.0,
        "DRB": 2.3,
        "AST": 2.8,
        "STL": 1.2,
        "BLK": 0.3,
        "TOV": 1.7,
        "PF": 3.0,
        "PTS": 10.3
      },
      "advanced": {
        "USG%": "23.5%",
        "TS%": "53.9%",
        "AST%": "21.1%",
        "TRB%": "8.9%",
        "ORB%": "5.2%",
        "DRB%": "12.8%",
        "STL%": "2.8%",
        "BLK%": "1.6%",
        "TOV%": "14.8%"
      }
    },
    {
      "name": "Kyle Anderson",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 203937,
      "basic": {
        "MP": 16.4,
        "FGA": 5.0,
        "FG%": "46.9%",
        "3PA": 1.1,
        "3P%": "35.7%",
        "FTA": 1.1,
        "FT%": "73.8%",
        "ORB": 0.9,
        "DRB": 2.5,
        "AST": 2.4,
        "STL": 0.7,
        "BLK": 0.5,
        "TOV": 0.6,
        "PF": 1.3,
        "PTS": 5.9
      },
      "advanced": {
        "USG%": "15.9%",
        "TS%": "53.8%",
        "AST%": "20.7%",
        "TRB%": "11.2%",
        "ORB%": "5.7%",
        "DRB%": "16.8%",
        "STL%": "2.0%",
        "BLK%": "3.1%",
        "TOV%": "10.0%"
      }
    },
    {
      "name": "Moses Moody",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1630541,
      "basic": {
        "MP": 22.3,
        "FGA": 7.7,
        "FG%": "43.3%",
        "3PA": 4.6,
        "3P%": "37.4%",
        "FTA": 1.8,
        "FT%": "79.7%",
        "ORB": 0.7,
        "DRB": 1.9,
        "AST": 1.3,
        "STL": 0.8,
        "BLK": 0.4,
        "TOV": 0.7,
        "PF": 1.6,
        "PTS": 9.8
      },
      "advanced": {
        "USG%": "17.4%",
        "TS%": "57.8%",
        "AST%": "8.3%",
        "TRB%": "6.2%",
        "ORB%": "3.3%",
        "DRB%": "9.2%",
        "STL%": "1.7%",
        "BLK%": "1.8%",
        "TOV%": "7.9%"
      }
    },
    {
      "name": "Kevon Looney",
      "pos": [
        "C"
      ],
      "ovr": 77,
      "real_ovr": 77,
      "id": 1626172,
      "basic": {
        "MP": 15.0,
        "FGA": 3.7,
        "FG%": "51.4%",
        "3PA": 0.1,
        "3P%": "40.0%",
        "FTA": 1.3,
        "FT%": "56.6%",
        "ORB": 2.4,
        "DRB": 3.6,
        "AST": 1.6,
        "STL": 0.6,
        "BLK": 0.5,
        "TOV": 0.5,
        "PF": 2.0,
        "PTS": 4.5
      },
      "advanced": {
        "USG%": "13.3%",
        "TS%": "53.5%",
        "AST%": "14.3%",
        "TRB%": "21.8%",
        "ORB%": "16.9%",
        "DRB%": "26.9%",
        "STL%": "2.0%",
        "BLK%": "3.1%",
        "TOV%": "10.8%"
      }
    },
    {
      "name": "Gary Payton II",
      "pos": [
        "SG"
      ],
      "ovr": 77,
      "real_ovr": 76,
      "id": 1627780,
      "basic": {
        "MP": 15.0,
        "FGA": 4.8,
        "FG%": "57.4%",
        "3PA": 1.5,
        "3P%": "32.6%",
        "FTA": 0.6,
        "FT%": "71.1%",
        "ORB": 0.9,
        "DRB": 2.1,
        "AST": 1.3,
        "STL": 0.8,
        "BLK": 0.3,
        "TOV": 0.6,
        "PF": 1.7,
        "PTS": 6.5
      },
      "advanced": {
        "USG%": "16.1%",
        "TS%": "63.5%",
        "AST%": "13.5%",
        "TRB%": "10.7%",
        "ORB%": "6.0%",
        "DRB%": "15.8%",
        "STL%": "2.7%",
        "BLK%": "1.7%",
        "TOV%": "11.0%"
      }
    },
    {
      "name": "Trayce Jackson-Davis",
      "pos": [
        "C"
      ],
      "ovr": 77,
      "real_ovr": 78,
      "id": 1631218,
      "basic": {
        "MP": 15.6,
        "FGA": 4.9,
        "FG%": "57.6%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 1.6,
        "FT%": "57.8%",
        "ORB": 2.0,
        "DRB": 3.0,
        "AST": 1.7,
        "STL": 0.4,
        "BLK": 0.6,
        "TOV": 0.7,
        "PF": 1.2,
        "PTS": 6.6
      },
      "advanced": {
        "USG%": "17.1%",
        "TS%": "58.7%",
        "AST%": "16.1%",
        "TRB%": "17.3%",
        "ORB%": "13.2%",
        "DRB%": "21.7%",
        "STL%": "1.2%",
        "BLK%": "3.7%",
        "TOV%": "11.5%"
      }
    },
    {
      "name": "Gui Santos",
      "pos": [
        "SF"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1630611,
      "basic": {
        "MP": 13.6,
        "FGA": 3.2,
        "FG%": "45.8%",
        "3PA": 1.8,
        "3P%": "33.0%",
        "FTA": 0.8,
        "FT%": "69.0%",
        "ORB": 1.3,
        "DRB": 1.8,
        "AST": 1.4,
        "STL": 0.4,
        "BLK": 0.2,
        "TOV": 0.8,
        "PF": 1.6,
        "PTS": 4.1
      },
      "advanced": {
        "USG%": "13.2%",
        "TS%": "57.5%",
        "AST%": "14.2%",
        "TRB%": "12.1%",
        "ORB%": "9.9%",
        "DRB%": "14.5%",
        "STL%": "1.6%",
        "BLK%": "1.2%",
        "TOV%": "17.5%"
      }
    },
    {
      "name": "Lindy Waters III",
      "pos": [
        "SG"
      ],
      "ovr": 74,
      "real_ovr": 75,
      "id": 1630322,
      "basic": {
        "MP": 15.0,
        "FGA": 4.8,
        "FG%": "36.9%",
        "3PA": 3.6,
        "3P%": "34.4%",
        "FTA": 0.2,
        "FT%": "72.7%",
        "ORB": 0.4,
        "DRB": 1.7,
        "AST": 1.0,
        "STL": 0.5,
        "BLK": 0.2,
        "TOV": 0.4,
        "PF": 1.2,
        "PTS": 4.9
      },
      "advanced": {
        "USG%": "14.8%",
        "TS%": "50.4%",
        "AST%": "9.1%",
        "TRB%": "7.6%",
        "ORB%": "2.7%",
        "DRB%": "12.8%",
        "STL%": "1.7%",
        "BLK%": "1.3%",
        "TOV%": "7.3%"
      }
    },
    {
      "name": "Quinten Post",
      "pos": [
        "C"
      ],
      "ovr": 73,
      "real_ovr": 77,
      "id": 1642366,
      "basic": {
        "MP": 16.3,
        "FGA": 6.5,
        "FG%": "44.9%",
        "3PA": 4.3,
        "3P%": "40.8%",
        "FTA": 0.6,
        "FT%": "77.8%",
        "ORB": 0.8,
        "DRB": 2.7,
        "AST": 1.3,
        "STL": 0.4,
        "BLK": 0.4,
        "TOV": 0.8,
        "PF": 2.0,
        "PTS": 8.1
      },
      "advanced": {
        "USG%": "19.6%",
        "TS%": "59.5%",
        "AST%": "12.2%",
        "TRB%": "11.6%",
        "ORB%": "5.3%",
        "DRB%": "18.3%",
        "STL%": "1.1%",
        "BLK%": "2.5%",
        "TOV%": "10.3%"
      }
    }
  ]
,
  "HOU": [
    {
      "name": "Alperen Şengün",
      "pos": [
        "C"
      ],
      "ovr": 86,
      "real_ovr": 88,
      "id": 1630578,
      "basic": {
        "MP": 31.5,
        "FGA": 15.0,
        "FG%": "49.6%",
        "3PA": 1.2,
        "3P%": "23.3%",
        "FTA": 5.6,
        "FT%": "69.2%",
        "ORB": 3.4,
        "DRB": 6.9,
        "AST": 4.9,
        "STL": 1.1,
        "BLK": 0.8,
        "TOV": 2.6,
        "PF": 2.8,
        "PTS": 19.1
      },
      "advanced": {
        "USG%": "26.2%",
        "TS%": "54.5%",
        "AST%": "24.1%",
        "TRB%": "17.5%",
        "ORB%": "11.4%",
        "DRB%": "23.8%",
        "STL%": "1.7%",
        "BLK%": "2.3%",
        "TOV%": "12.7%"
      }
    },
    {
      "name": "Amen Thompson",
      "pos": [
        "SF",
        "PG"
      ],
      "ovr": 86,
      "real_ovr": 84,
      "id": 1641708,
      "basic": {
        "MP": 32.2,
        "FGA": 10.1,
        "FG%": "55.7%",
        "3PA": 1.3,
        "3P%": "27.5%",
        "FTA": 3.6,
        "FT%": "68.4%",
        "ORB": 2.8,
        "DRB": 5.4,
        "AST": 3.8,
        "STL": 1.4,
        "BLK": 1.3,
        "TOV": 2.0,
        "PF": 2.4,
        "PTS": 14.1
      },
      "advanced": {
        "USG%": "17.5%",
        "TS%": "60.2%",
        "AST%": "16.9%",
        "TRB%": "13.5%",
        "ORB%": "9.0%",
        "DRB%": "18.2%",
        "STL%": "2.1%",
        "BLK%": "3.6%",
        "TOV%": "14.6%"
      }
    },
    {
      "name": "Jalen Green",
      "pos": [
        "SG"
      ],
      "ovr": 84,
      "real_ovr": 86,
      "id": 1630224,
      "basic": {
        "MP": 32.9,
        "FGA": 17.5,
        "FG%": "42.3%",
        "3PA": 8.1,
        "3P%": "35.4%",
        "FTA": 4.1,
        "FT%": "81.3%",
        "ORB": 0.5,
        "DRB": 4.0,
        "AST": 3.4,
        "STL": 0.9,
        "BLK": 0.3,
        "TOV": 2.5,
        "PF": 1.5,
        "PTS": 21.0
      },
      "advanced": {
        "USG%": "27.3%",
        "TS%": "54.4%",
        "AST%": "16.0%",
        "TRB%": "7.4%",
        "ORB%": "1.7%",
        "DRB%": "13.4%",
        "STL%": "1.3%",
        "BLK%": "0.9%",
        "TOV%": "11.4%"
      }
    },
    {
      "name": "Fred VanVleet",
      "pos": [
        "PG"
      ],
      "ovr": 84,
      "real_ovr": 83,
      "id": 1627832,
      "basic": {
        "MP": 35.2,
        "FGA": 12.7,
        "FG%": "37.8%",
        "3PA": 7.7,
        "3P%": "34.5%",
        "FTA": 2.3,
        "FT%": "81.0%",
        "ORB": 0.5,
        "DRB": 3.2,
        "AST": 5.6,
        "STL": 1.6,
        "BLK": 0.4,
        "TOV": 1.5,
        "PF": 2.3,
        "PTS": 14.1
      },
      "advanced": {
        "USG%": "17.7%",
        "TS%": "51.5%",
        "AST%": "21.2%",
        "TRB%": "5.6%",
        "ORB%": "1.6%",
        "DRB%": "9.7%",
        "STL%": "2.2%",
        "BLK%": "1.1%",
        "TOV%": "9.6%"
      }
    },
    {
      "name": "Jabari Smith Jr.",
      "pos": [
        "PF"
      ],
      "ovr": 82,
      "real_ovr": 81,
      "id": 1631095,
      "basic": {
        "MP": 30.1,
        "FGA": 9.9,
        "FG%": "43.8%",
        "3PA": 4.9,
        "3P%": "35.4%",
        "FTA": 2.2,
        "FT%": "82.5%",
        "ORB": 1.8,
        "DRB": 5.2,
        "AST": 1.1,
        "STL": 0.4,
        "BLK": 0.7,
        "TOV": 1.1,
        "PF": 2.2,
        "PTS": 12.2
      },
      "advanced": {
        "USG%": "16.4%",
        "TS%": "56.2%",
        "AST%": "4.7%",
        "TRB%": "12.4%",
        "ORB%": "6.4%",
        "DRB%": "18.6%",
        "STL%": "0.7%",
        "BLK%": "2.1%",
        "TOV%": "8.9%"
      }
    },
    {
      "name": "Dillon Brooks",
      "pos": [
        "SF"
      ],
      "ovr": 81,
      "real_ovr": 81,
      "id": 1628415,
      "basic": {
        "MP": 31.8,
        "FGA": 11.9,
        "FG%": "42.9%",
        "3PA": 6.3,
        "3P%": "39.7%",
        "FTA": 1.6,
        "FT%": "81.8%",
        "ORB": 1.0,
        "DRB": 2.7,
        "AST": 1.7,
        "STL": 0.8,
        "BLK": 0.2,
        "TOV": 1.0,
        "PF": 3.2,
        "PTS": 14.0
      },
      "advanced": {
        "USG%": "17.7%",
        "TS%": "55.5%",
        "AST%": "7.4%",
        "TRB%": "6.1%",
        "ORB%": "3.3%",
        "DRB%": "9.1%",
        "STL%": "1.2%",
        "BLK%": "0.6%",
        "TOV%": "7.4%"
      }
    },
    {
      "name": "Tari Eason",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 81,
      "real_ovr": 82,
      "id": 1631106,
      "basic": {
        "MP": 24.9,
        "FGA": 9.8,
        "FG%": "48.7%",
        "3PA": 3.2,
        "3P%": "34.2%",
        "FTA": 1.8,
        "FT%": "76.0%",
        "ORB": 2.2,
        "DRB": 4.1,
        "AST": 1.5,
        "STL": 1.7,
        "BLK": 0.9,
        "TOV": 1.1,
        "PF": 2.4,
        "PTS": 12.0
      },
      "advanced": {
        "USG%": "19.4%",
        "TS%": "56.7%",
        "AST%": "8.5%",
        "TRB%": "13.6%",
        "ORB%": "9.4%",
        "DRB%": "17.9%",
        "STL%": "3.3%",
        "BLK%": "3.2%",
        "TOV%": "9.7%"
      }
    },
    {
      "name": "Reed Sheppard",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 79,
      "real_ovr": 75,
      "id": 1642263,
      "basic": {
        "MP": 12.6,
        "FGA": 4.6,
        "FG%": "35.1%",
        "3PA": 2.7,
        "3P%": "33.8%",
        "FTA": 0.3,
        "FT%": "81.3%",
        "ORB": 0.3,
        "DRB": 1.2,
        "AST": 1.4,
        "STL": 0.7,
        "BLK": 0.3,
        "TOV": 0.7,
        "PF": 1.0,
        "PTS": 4.4
      },
      "advanced": {
        "USG%": "17.8%",
        "TS%": "46.5%",
        "AST%": "15.2%",
        "TRB%": "6.4%",
        "ORB%": "2.6%",
        "DRB%": "10.3%",
        "STL%": "2.6%",
        "BLK%": "2.3%",
        "TOV%": "13.1%"
      }
    },
    {
      "name": "Steven Adams",
      "pos": [
        "C"
      ],
      "ovr": 78,
      "real_ovr": 77,
      "id": 203500,
      "basic": {
        "MP": 13.7,
        "FGA": 2.9,
        "FG%": "54.5%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 1.6,
        "FT%": "46.2%",
        "ORB": 2.9,
        "DRB": 2.8,
        "AST": 1.1,
        "STL": 0.4,
        "BLK": 0.5,
        "TOV": 0.9,
        "PF": 1.0,
        "PTS": 3.9
      },
      "advanced": {
        "USG%": "13.6%",
        "TS%": "54.1%",
        "AST%": "10.9%",
        "TRB%": "21.9%",
        "ORB%": "21.8%",
        "DRB%": "22.0%",
        "STL%": "1.3%",
        "BLK%": "3.2%",
        "TOV%": "20.6%"
      }
    },
    {
      "name": "Cam Whitmore",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1641715,
      "basic": {
        "MP": 16.2,
        "FGA": 7.9,
        "FG%": "44.4%",
        "3PA": 3.6,
        "3P%": "35.5%",
        "FTA": 1.4,
        "FT%": "75.0%",
        "ORB": 0.7,
        "DRB": 2.3,
        "AST": 1.0,
        "STL": 0.6,
        "BLK": 0.3,
        "TOV": 0.9,
        "PF": 0.9,
        "PTS": 9.4
      },
      "advanced": {
        "USG%": "23.9%",
        "TS%": "54.9%",
        "AST%": "8.9%",
        "TRB%": "9.7%",
        "ORB%": "4.5%",
        "DRB%": "15.1%",
        "STL%": "1.8%",
        "BLK%": "1.4%",
        "TOV%": "9.6%"
      }
    },
    {
      "name": "Jeff Green",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 76,
      "real_ovr": 75,
      "id": 201145,
      "basic": {
        "MP": 12.4,
        "FGA": 3.8,
        "FG%": "50.4%",
        "3PA": 2.5,
        "3P%": "36.7%",
        "FTA": 0.8,
        "FT%": "80.8%",
        "ORB": 0.3,
        "DRB": 1.5,
        "AST": 0.6,
        "STL": 0.2,
        "BLK": 0.1,
        "TOV": 0.3,
        "PF": 1.0,
        "PTS": 5.4
      },
      "advanced": {
        "USG%": "14.7%",
        "TS%": "64.9%",
        "AST%": "7.0%",
        "TRB%": "7.8%",
        "ORB%": "2.9%",
        "DRB%": "12.9%",
        "STL%": "0.7%",
        "BLK%": "0.9%",
        "TOV%": "6.4%"
      }
    },
    {
      "name": "Jock Landale",
      "pos": [
        "C"
      ],
      "ovr": 75,
      "real_ovr": 76,
      "id": 1629111,
      "basic": {
        "MP": 11.9,
        "FGA": 3.6,
        "FG%": "53.3%",
        "3PA": 0.6,
        "3P%": "42.3%",
        "FTA": 1.0,
        "FT%": "67.5%",
        "ORB": 1.3,
        "DRB": 1.9,
        "AST": 0.9,
        "STL": 0.3,
        "BLK": 0.2,
        "TOV": 0.5,
        "PF": 1.2,
        "PTS": 4.8
      },
      "advanced": {
        "USG%": "15.7%",
        "TS%": "59.0%",
        "AST%": "10.3%",
        "TRB%": "14.6%",
        "ORB%": "11.7%",
        "DRB%": "17.6%",
        "STL%": "1.3%",
        "BLK%": "1.8%",
        "TOV%": "11.0%"
      }
    },
    {
      "name": "Aaron Holiday",
      "pos": [
        "PG"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1628988,
      "basic": {
        "MP": 12.8,
        "FGA": 4.3,
        "FG%": "43.7%",
        "3PA": 2.9,
        "3P%": "39.8%",
        "FTA": 0.7,
        "FT%": "82.9%",
        "ORB": 0.2,
        "DRB": 1.0,
        "AST": 1.3,
        "STL": 0.3,
        "BLK": 0.2,
        "TOV": 0.6,
        "PF": 1.0,
        "PTS": 5.5
      },
      "advanced": {
        "USG%": "16.8%",
        "TS%": "59.4%",
        "AST%": "14.3%",
        "TRB%": "5.2%",
        "ORB%": "1.7%",
        "DRB%": "8.9%",
        "STL%": "1.2%",
        "BLK%": "1.2%",
        "TOV%": "11.5%"
      }
    },
    {
      "name": "Jae'Sean Tate",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1630256,
      "basic": {
        "MP": 11.3,
        "FGA": 2.8,
        "FG%": "47.3%",
        "3PA": 0.9,
        "3P%": "34.8%",
        "FTA": 0.9,
        "FT%": "68.1%",
        "ORB": 1.0,
        "DRB": 1.3,
        "AST": 0.9,
        "STL": 0.5,
        "BLK": 0.1,
        "TOV": 0.4,
        "PF": 1.6,
        "PTS": 3.6
      },
      "advanced": {
        "USG%": "13.3%",
        "TS%": "55.7%",
        "AST%": "10.5%",
        "TRB%": "10.6%",
        "ORB%": "8.9%",
        "DRB%": "12.4%",
        "STL%": "2.2%",
        "BLK%": "1.1%",
        "TOV%": "11.5%"
      }
    },
    {
      "name": "Nate Williams",
      "pos": [
        "SG"
      ],
      "ovr": 73,
      "real_ovr": 72,
      "id": 1631466,
      "basic": {
        "MP": 7.4,
        "FGA": 3.1,
        "FG%": "43.5%",
        "3PA": 1.3,
        "3P%": "23.1%",
        "FTA": 0.4,
        "FT%": "62.5%",
        "ORB": 0.3,
        "DRB": 0.4,
        "AST": 0.5,
        "STL": 0.4,
        "BLK": 0.2,
        "TOV": 0.7,
        "PF": 0.8,
        "PTS": 3.3
      },
      "advanced": {
        "USG%": "22.3%",
        "TS%": "49.6%",
        "AST%": "8.8%",
        "TRB%": "4.7%",
        "ORB%": "3.6%",
        "DRB%": "5.9%",
        "STL%": "2.6%",
        "BLK%": "2.4%",
        "TOV%": "17.6%"
      }
    }
  ]
,
  "IND": [
    {
      "name": "Tyrese Haliburton",
      "pos": [
        "PG"
      ],
      "ovr": 91,
      "real_ovr": 87,
      "id": 1630169,
      "basic": {
        "MP": 33.6,
        "FGA": 13.8,
        "FG%": "47.3%",
        "3PA": 7.7,
        "3P%": "38.8%",
        "FTA": 3.0,
        "FT%": "85.1%",
        "ORB": 0.6,
        "DRB": 3.0,
        "AST": 9.2,
        "STL": 1.4,
        "BLK": 0.7,
        "TOV": 1.6,
        "PF": 1.3,
        "PTS": 18.6
      },
      "advanced": {
        "USG%": "21.6%",
        "TS%": "61.6%",
        "AST%": "38.9%",
        "TRB%": "5.9%",
        "ORB%": "1.9%",
        "DRB%": "9.7%",
        "STL%": "2.1%",
        "BLK%": "1.8%",
        "TOV%": "9.8%"
      }
    },
    {
      "name": "Pascal Siakam",
      "pos": [
        "PF"
      ],
      "ovr": 89,
      "real_ovr": 86,
      "id": 1627783,
      "basic": {
        "MP": 32.7,
        "FGA": 15.2,
        "FG%": "51.9%",
        "3PA": 4.2,
        "3P%": "38.9%",
        "FTA": 3.9,
        "FT%": "73.4%",
        "ORB": 1.7,
        "DRB": 5.2,
        "AST": 3.4,
        "STL": 0.9,
        "BLK": 0.5,
        "TOV": 1.4,
        "PF": 2.4,
        "PTS": 20.2
      },
      "advanced": {
        "USG%": "24.2%",
        "TS%": "59.9%",
        "AST%": "15.7%",
        "TRB%": "11.8%",
        "ORB%": "5.9%",
        "DRB%": "17.6%",
        "STL%": "1.3%",
        "BLK%": "1.5%",
        "TOV%": "7.6%"
      }
    },
    {
      "name": "Myles Turner",
      "pos": [
        "C"
      ],
      "ovr": 84,
      "real_ovr": 83,
      "id": 1626167,
      "basic": {
        "MP": 30.2,
        "FGA": 11.3,
        "FG%": "48.1%",
        "3PA": 5.5,
        "3P%": "39.6%",
        "FTA": 3.3,
        "FT%": "77.3%",
        "ORB": 1.3,
        "DRB": 5.3,
        "AST": 1.5,
        "STL": 0.8,
        "BLK": 2.0,
        "TOV": 1.7,
        "PF": 2.5,
        "PTS": 15.6
      },
      "advanced": {
        "USG%": "20.7%",
        "TS%": "61.2%",
        "AST%": "7.1%",
        "TRB%": "12.1%",
        "ORB%": "4.7%",
        "DRB%": "19.4%",
        "STL%": "1.2%",
        "BLK%": "6.0%",
        "TOV%": "11.8%"
      }
    },
    {
      "name": "Andrew Nembhard",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 83,
      "real_ovr": 79,
      "id": 1629614,
      "basic": {
        "MP": 28.9,
        "FGA": 8.3,
        "FG%": "45.8%",
        "3PA": 2.7,
        "3P%": "29.1%",
        "FTA": 2.1,
        "FT%": "79.4%",
        "ORB": 0.5,
        "DRB": 2.8,
        "AST": 5.0,
        "STL": 1.2,
        "BLK": 0.2,
        "TOV": 1.7,
        "PF": 2.3,
        "PTS": 10.0
      },
      "advanced": {
        "USG%": "16.3%",
        "TS%": "54.5%",
        "AST%": "22.5%",
        "TRB%": "6.4%",
        "ORB%": "2.0%",
        "DRB%": "10.7%",
        "STL%": "2.0%",
        "BLK%": "0.5%",
        "TOV%": "15.8%"
      }
    },
    {
      "name": "Bennedict Mathurin",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 83,
      "real_ovr": 82,
      "id": 1631097,
      "basic": {
        "MP": 29.8,
        "FGA": 11.8,
        "FG%": "45.8%",
        "3PA": 4.0,
        "3P%": "34.0%",
        "FTA": 4.6,
        "FT%": "83.1%",
        "ORB": 1.2,
        "DRB": 4.1,
        "AST": 1.9,
        "STL": 0.7,
        "BLK": 0.3,
        "TOV": 1.9,
        "PF": 2.3,
        "PTS": 16.1
      },
      "advanced": {
        "USG%": "22.8%",
        "TS%": "57.9%",
        "AST%": "8.8%",
        "TRB%": "9.9%",
        "ORB%": "4.6%",
        "DRB%": "15.2%",
        "STL%": "1.1%",
        "BLK%": "1.0%",
        "TOV%": "11.9%"
      }
    },
    {
      "name": "Aaron Nesmith",
      "pos": [
        "SF"
      ],
      "ovr": 81,
      "real_ovr": 79,
      "id": 1630174,
      "basic": {
        "MP": 24.9,
        "FGA": 8.4,
        "FG%": "50.7%",
        "3PA": 4.3,
        "3P%": "43.1%",
        "FTA": 1.8,
        "FT%": "91.3%",
        "ORB": 0.8,
        "DRB": 3.1,
        "AST": 1.2,
        "STL": 0.8,
        "BLK": 0.4,
        "TOV": 0.8,
        "PF": 2.5,
        "PTS": 12.0
      },
      "advanced": {
        "USG%": "17.4%",
        "TS%": "65.3%",
        "AST%": "6.6%",
        "TRB%": "8.8%",
        "ORB%": "3.7%",
        "DRB%": "13.9%",
        "STL%": "1.5%",
        "BLK%": "1.4%",
        "TOV%": "8.2%"
      }
    },
    {
      "name": "T.J. McConnell",
      "pos": [
        "PG"
      ],
      "ovr": 80,
      "real_ovr": 79,
      "id": 204456,
      "basic": {
        "MP": 17.9,
        "FGA": 7.9,
        "FG%": "51.9%",
        "3PA": 0.6,
        "3P%": "30.6%",
        "FTA": 1.0,
        "FT%": "74.0%",
        "ORB": 0.6,
        "DRB": 1.9,
        "AST": 4.4,
        "STL": 1.1,
        "BLK": 0.3,
        "TOV": 1.4,
        "PF": 1.0,
        "PTS": 9.1
      },
      "advanced": {
        "USG%": "23.4%",
        "TS%": "54.7%",
        "AST%": "37.0%",
        "TRB%": "7.6%",
        "ORB%": "3.5%",
        "DRB%": "11.6%",
        "STL%": "2.8%",
        "BLK%": "1.3%",
        "TOV%": "14.2%"
      }
    },
    {
      "name": "Obi Toppin",
      "pos": [
        "PF"
      ],
      "ovr": 80,
      "real_ovr": 79,
      "id": 1630167,
      "basic": {
        "MP": 19.6,
        "FGA": 7.6,
        "FG%": "52.9%",
        "3PA": 3.8,
        "3P%": "36.5%",
        "FTA": 1.4,
        "FT%": "78.1%",
        "ORB": 0.7,
        "DRB": 3.3,
        "AST": 1.6,
        "STL": 0.6,
        "BLK": 0.4,
        "TOV": 0.9,
        "PF": 1.4,
        "PTS": 10.5
      },
      "advanced": {
        "USG%": "20.1%",
        "TS%": "64.2%",
        "AST%": "11.9%",
        "TRB%": "11.5%",
        "ORB%": "4.1%",
        "DRB%": "18.7%",
        "STL%": "1.4%",
        "BLK%": "1.6%",
        "TOV%": "9.5%"
      }
    },
    {
      "name": "Isaiah Jackson",
      "pos": [
        "C"
      ],
      "ovr": 77,
      "real_ovr": 79,
      "id": 1630543,
      "basic": {
        "MP": 16.8,
        "FGA": 4.6,
        "FG%": "60.9%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 2.8,
        "FT%": "50.0%",
        "ORB": 2.2,
        "DRB": 3.4,
        "AST": 1.0,
        "STL": 0.6,
        "BLK": 1.6,
        "TOV": 1.0,
        "PF": 2.8,
        "PTS": 7.0
      },
      "advanced": {
        "USG%": "17.6%",
        "TS%": "60.0%",
        "AST%": "8.1%",
        "TRB%": "18.6%",
        "ORB%": "14.7%",
        "DRB%": "22.3%",
        "STL%": "1.7%",
        "BLK%": "8.6%",
        "TOV%": "14.6%"
      }
    },
    {
      "name": "Ben Sheppard",
      "pos": [
        "SG"
      ],
      "ovr": 76,
      "real_ovr": 75,
      "id": 1641767,
      "basic": {
        "MP": 19.5,
        "FGA": 4.6,
        "FG%": "41.8%",
        "3PA": 3.2,
        "3P%": "34.2%",
        "FTA": 0.4,
        "FT%": "88.9%",
        "ORB": 0.7,
        "DRB": 2.1,
        "AST": 1.3,
        "STL": 0.6,
        "BLK": 0.2,
        "TOV": 0.3,
        "PF": 2.0,
        "PTS": 5.3
      },
      "advanced": {
        "USG%": "11.3%",
        "TS%": "55.5%",
        "AST%": "8.6%",
        "TRB%": "8.0%",
        "ORB%": "4.0%",
        "DRB%": "12.0%",
        "STL%": "1.5%",
        "BLK%": "1.0%",
        "TOV%": "6.9%"
      }
    },
    {
      "name": "Jarace Walker",
      "pos": [
        "PF"
      ],
      "ovr": 77,
      "real_ovr": 76,
      "id": 1641716,
      "basic": {
        "MP": 15.8,
        "FGA": 4.8,
        "FG%": "47.2%",
        "3PA": 2.5,
        "3P%": "40.5%",
        "FTA": 0.9,
        "FT%": "66.7%",
        "ORB": 0.3,
        "DRB": 2.7,
        "AST": 1.5,
        "STL": 0.7,
        "BLK": 0.3,
        "TOV": 1.0,
        "PF": 1.5,
        "PTS": 6.1
      },
      "advanced": {
        "USG%": "17.1%",
        "TS%": "59.0%",
        "AST%": "12.2%",
        "TRB%": "10.8%",
        "ORB%": "2.4%",
        "DRB%": "19.0%",
        "STL%": "2.2%",
        "BLK%": "1.9%",
        "TOV%": "16.7%"
      }
    },
    {
      "name": "James Wiseman",
      "pos": [
        "C"
      ],
      "ovr": 75,
      "real_ovr": 74,
      "id": 1630164,
      "basic": {
        "MP": 5.0,
        "FGA": 4.0,
        "FG%": "50.0%",
        "3PA": 1.0,
        "3P%": "0.0%",
        "FTA": 2.0,
        "FT%": "100.0%",
        "ORB": 0.0,
        "DRB": 1.0,
        "AST": 0.0,
        "STL": 0.0,
        "BLK": 0.0,
        "TOV": 0.0,
        "PF": 0.0,
        "PTS": 6.0
      },
      "advanced": {
        "USG%": "42.2%",
        "TS%": "61.5%",
        "AST%": "0.0%",
        "TRB%": "11.1%",
        "ORB%": "0.0%",
        "DRB%": "22.1%",
        "STL%": "0.0%",
        "BLK%": "0.0%",
        "TOV%": "0.0%"
      }
    },
    {
      "name": "Thomas Bryant",
      "pos": [
        "C"
      ],
      "ovr": 75,
      "real_ovr": 77,
      "id": 1628418,
      "basic": {
        "MP": 14.6,
        "FGA": 4.9,
        "FG%": "50.8%",
        "3PA": 2.2,
        "3P%": "32.4%",
        "FTA": 1.0,
        "FT%": "85.9%",
        "ORB": 1.3,
        "DRB": 2.5,
        "AST": 0.8,
        "STL": 0.4,
        "BLK": 0.6,
        "TOV": 0.5,
        "PF": 1.2,
        "PTS": 6.5
      },
      "advanced": {
        "USG%": "17.1%",
        "TS%": "61.4%",
        "AST%": "7.6%",
        "TRB%": "14.5%",
        "ORB%": "9.7%",
        "DRB%": "19.2%",
        "STL%": "1.4%",
        "BLK%": "3.9%",
        "TOV%": "7.9%"
      }
    },
    {
      "name": "Johnny Furphy",
      "pos": [
        "SF"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1642277,
      "basic": {
        "MP": 7.6,
        "FGA": 1.8,
        "FG%": "38.0%",
        "3PA": 1.0,
        "3P%": "30.0%",
        "FTA": 0.4,
        "FT%": "81.8%",
        "ORB": 0.5,
        "DRB": 1.0,
        "AST": 0.4,
        "STL": 0.4,
        "BLK": 0.2,
        "TOV": 0.2,
        "PF": 0.8,
        "PTS": 2.1
      },
      "advanced": {
        "USG%": "13.0%",
        "TS%": "50.6%",
        "AST%": "6.2%",
        "TRB%": "10.4%",
        "ORB%": "6.8%",
        "DRB%": "14.0%",
        "STL%": "2.3%",
        "BLK%": "2.6%",
        "TOV%": "10.6%"
      }
    },
    {
      "name": "Kendall Brown",
      "pos": [
        "SF"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1631112,
      "note": "Inactive / G-League (0 GP)",
      "basic": {
        "MP": 0.0,
        "FGA": 0.0,
        "FG%": "0.0%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 0.0,
        "FT%": "0.0%",
        "ORB": 0.0,
        "DRB": 0.0,
        "AST": 0.0,
        "STL": 0.0,
        "BLK": 0.0,
        "TOV": 0.0,
        "PF": 0.0,
        "PTS": 0.0
      },
      "advanced": {
        "USG%": "0.0%",
        "TS%": "0.0%",
        "AST%": "0.0%",
        "TRB%": "0.0%",
        "ORB%": "0.0%",
        "DRB%": "0.0%",
        "STL%": "0.0%",
        "BLK%": "0.0%",
        "TOV%": "0.0%"
      }
    }
  ]
,
  "LAC": [
    {
      "name": "Kawhi Leonard",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 92,
      "real_ovr": 87,
      "id": 202695,
      "basic": {
        "MP": 31.9,
        "FGA": 16.8,
        "FG%": "49.8%",
        "3PA": 5.1,
        "3P%": "41.1%",
        "FTA": 3.3,
        "FT%": "81.0%",
        "ORB": 0.9,
        "DRB": 5.0,
        "AST": 3.1,
        "STL": 1.6,
        "BLK": 0.5,
        "TOV": 1.9,
        "PF": 1.5,
        "PTS": 21.5
      },
      "advanced": {
        "USG%": "27.7%",
        "TS%": "58.9%",
        "AST%": "16.4%",
        "TRB%": "10.5%",
        "ORB%": "3.4%",
        "DRB%": "17.4%",
        "STL%": "2.5%",
        "BLK%": "1.4%",
        "TOV%": "9.6%"
      }
    },
    {
      "name": "James Harden",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 89,
      "real_ovr": 90,
      "id": 201935,
      "basic": {
        "MP": 35.3,
        "FGA": 16.4,
        "FG%": "41.0%",
        "3PA": 8.5,
        "3P%": "35.2%",
        "FTA": 7.3,
        "FT%": "87.4%",
        "ORB": 0.7,
        "DRB": 5.1,
        "AST": 8.7,
        "STL": 1.5,
        "BLK": 0.7,
        "TOV": 4.3,
        "PF": 2.1,
        "PTS": 22.8
      },
      "advanced": {
        "USG%": "29.6%",
        "TS%": "58.2%",
        "AST%": "36.8%",
        "TRB%": "9.3%",
        "ORB%": "2.3%",
        "DRB%": "16.1%",
        "STL%": "2.1%",
        "BLK%": "2.0%",
        "TOV%": "18.0%"
      }
    },
    {
      "name": "Norman Powell",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 83,
      "real_ovr": 86,
      "id": 1626181,
      "basic": {
        "MP": 32.6,
        "FGA": 15.8,
        "FG%": "48.4%",
        "3PA": 7.1,
        "3P%": "41.8%",
        "FTA": 4.4,
        "FT%": "80.4%",
        "ORB": 0.4,
        "DRB": 2.8,
        "AST": 2.1,
        "STL": 1.2,
        "BLK": 0.2,
        "TOV": 1.8,
        "PF": 1.9,
        "PTS": 21.8
      },
      "advanced": {
        "USG%": "26.1%",
        "TS%": "61.5%",
        "AST%": "10.2%",
        "TRB%": "5.5%",
        "ORB%": "1.2%",
        "DRB%": "9.6%",
        "STL%": "1.8%",
        "BLK%": "0.5%",
        "TOV%": "9.2%"
      }
    },
    {
      "name": "Ivica Zubac",
      "pos": [
        "C"
      ],
      "ovr": 83,
      "real_ovr": 86,
      "id": 1627826,
      "basic": {
        "MP": 32.8,
        "FGA": 11.8,
        "FG%": "62.8%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 3.0,
        "FT%": "66.1%",
        "ORB": 3.8,
        "DRB": 8.9,
        "AST": 2.7,
        "STL": 0.7,
        "BLK": 1.1,
        "TOV": 1.6,
        "PF": 2.1,
        "PTS": 16.8
      },
      "advanced": {
        "USG%": "19.5%",
        "TS%": "64.1%",
        "AST%": "12.8%",
        "TRB%": "21.8%",
        "ORB%": "13.1%",
        "DRB%": "30.2%",
        "STL%": "1.0%",
        "BLK%": "3.4%",
        "TOV%": "10.8%"
      }
    },
    {
      "name": "Derrick Jones Jr.",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 79,
      "real_ovr": 78,
      "id": 1627884,
      "basic": {
        "MP": 24.3,
        "FGA": 7.6,
        "FG%": "52.6%",
        "3PA": 2.8,
        "3P%": "35.6%",
        "FTA": 1.5,
        "FT%": "70.3%",
        "ORB": 1.2,
        "DRB": 2.2,
        "AST": 0.8,
        "STL": 1.0,
        "BLK": 0.4,
        "TOV": 0.9,
        "PF": 2.0,
        "PTS": 10.1
      },
      "advanced": {
        "USG%": "16.5%",
        "TS%": "60.9%",
        "AST%": "4.6%",
        "TRB%": "8.0%",
        "ORB%": "5.7%",
        "DRB%": "10.1%",
        "STL%": "2.1%",
        "BLK%": "1.7%",
        "TOV%": "9.3%"
      }
    },
    {
      "name": "Terance Mann",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 78,
      "real_ovr": 77,
      "id": 1629611,
      "basic": {
        "MP": 21.1,
        "FGA": 6.2,
        "FG%": "49.6%",
        "3PA": 2.4,
        "3P%": "36.8%",
        "FTA": 1.0,
        "FT%": "69.1%",
        "ORB": 1.0,
        "DRB": 2.0,
        "AST": 1.8,
        "STL": 0.7,
        "BLK": 0.2,
        "TOV": 0.7,
        "PF": 1.9,
        "PTS": 7.7
      },
      "advanced": {
        "USG%": "14.7%",
        "TS%": "58.4%",
        "AST%": "11.7%",
        "TRB%": "7.8%",
        "ORB%": "5.3%",
        "DRB%": "10.4%",
        "STL%": "1.6%",
        "BLK%": "1.0%",
        "TOV%": "9.6%"
      }
    },
    {
      "name": "Kris Dunn",
      "pos": [
        "PG"
      ],
      "ovr": 77,
      "real_ovr": 78,
      "id": 1627739,
      "basic": {
        "MP": 24.1,
        "FGA": 5.9,
        "FG%": "43.9%",
        "3PA": 3.0,
        "3P%": "33.5%",
        "FTA": 0.3,
        "FT%": "68.2%",
        "ORB": 0.7,
        "DRB": 2.7,
        "AST": 2.8,
        "STL": 1.7,
        "BLK": 0.4,
        "TOV": 1.0,
        "PF": 2.7,
        "PTS": 6.4
      },
      "advanced": {
        "USG%": "12.7%",
        "TS%": "53.1%",
        "AST%": "15.6%",
        "TRB%": "8.0%",
        "ORB%": "3.4%",
        "DRB%": "12.4%",
        "STL%": "3.5%",
        "BLK%": "1.5%",
        "TOV%": "14.2%"
      }
    },
    {
      "name": "Nicolas Batum",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 76,
      "real_ovr": 75,
      "id": 201587,
      "basic": {
        "MP": 17.5,
        "FGA": 3.1,
        "FG%": "43.7%",
        "3PA": 2.6,
        "3P%": "43.3%",
        "FTA": 0.3,
        "FT%": "81.0%",
        "ORB": 0.6,
        "DRB": 2.2,
        "AST": 1.1,
        "STL": 0.7,
        "BLK": 0.5,
        "TOV": 0.4,
        "PF": 1.4,
        "PTS": 4.0
      },
      "advanced": {
        "USG%": "9.0%",
        "TS%": "63.3%",
        "AST%": "7.8%",
        "TRB%": "9.0%",
        "ORB%": "4.0%",
        "DRB%": "14.0%",
        "STL%": "1.9%",
        "BLK%": "2.6%",
        "TOV%": "12.1%"
      }
    },
    {
      "name": "Amir Coffey",
      "pos": [
        "SF"
      ],
      "ovr": 76,
      "real_ovr": 77,
      "id": 1629599,
      "basic": {
        "MP": 24.3,
        "FGA": 7.1,
        "FG%": "47.1%",
        "3PA": 3.4,
        "3P%": "40.9%",
        "FTA": 1.8,
        "FT%": "89.1%",
        "ORB": 0.4,
        "DRB": 1.8,
        "AST": 1.1,
        "STL": 0.6,
        "BLK": 0.1,
        "TOV": 0.6,
        "PF": 1.7,
        "PTS": 9.7
      },
      "advanced": {
        "USG%": "15.3%",
        "TS%": "61.4%",
        "AST%": "6.1%",
        "TRB%": "5.2%",
        "ORB%": "2.1%",
        "DRB%": "8.2%",
        "STL%": "1.1%",
        "BLK%": "0.4%",
        "TOV%": "7.4%"
      }
    },
    {
      "name": "Mo Bamba",
      "pos": [
        "C"
      ],
      "ovr": 75,
      "real_ovr": 77,
      "id": 1628964,
      "basic": {
        "MP": 12.9,
        "FGA": 3.5,
        "FG%": "46.4%",
        "3PA": 1.7,
        "3P%": "27.8%",
        "FTA": 0.8,
        "FT%": "70.4%",
        "ORB": 1.0,
        "DRB": 3.5,
        "AST": 0.6,
        "STL": 0.3,
        "BLK": 1.0,
        "TOV": 0.6,
        "PF": 1.8,
        "PTS": 4.3
      },
      "advanced": {
        "USG%": "15.2%",
        "TS%": "55.7%",
        "AST%": "6.0%",
        "TRB%": "19.7%",
        "ORB%": "8.8%",
        "DRB%": "30.5%",
        "STL%": "1.1%",
        "BLK%": "7.4%",
        "TOV%": "13.9%"
      }
    },
    {
      "name": "Kevin Porter Jr.",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 78,
      "real_ovr": 79,
      "id": 1629645,
      "basic": {
        "MP": 19.8,
        "FGA": 8.7,
        "FG%": "44.9%",
        "3PA": 2.4,
        "3P%": "31.1%",
        "FTA": 2.3,
        "FT%": "76.9%",
        "ORB": 0.6,
        "DRB": 3.1,
        "AST": 3.4,
        "STL": 1.1,
        "BLK": 0.2,
        "TOV": 1.8,
        "PF": 1.6,
        "PTS": 10.3
      },
      "advanced": {
        "USG%": "25.4%",
        "TS%": "53.1%",
        "AST%": "25.9%",
        "TRB%": "10.4%",
        "ORB%": "3.2%",
        "DRB%": "17.3%",
        "STL%": "2.7%",
        "BLK%": "0.9%",
        "TOV%": "15.8%"
      }
    },
    {
      "name": "Bones Hyland",
      "pos": [
        "PG"
      ],
      "ovr": 75,
      "real_ovr": 76,
      "id": 1630538,
      "basic": {
        "MP": 10.0,
        "FGA": 4.9,
        "FG%": "39.8%",
        "3PA": 3.4,
        "3P%": "39.0%",
        "FTA": 1.1,
        "FT%": "88.5%",
        "ORB": 0.2,
        "DRB": 0.8,
        "AST": 1.3,
        "STL": 0.8,
        "BLK": 0.2,
        "TOV": 1.0,
        "PF": 1.2,
        "PTS": 6.2
      },
      "advanced": {
        "USG%": "28.2%",
        "TS%": "57.6%",
        "AST%": "20.1%",
        "TRB%": "5.9%",
        "ORB%": "2.4%",
        "DRB%": "9.3%",
        "STL%": "3.7%",
        "BLK%": "1.7%",
        "TOV%": "16.2%"
      }
    },
    {
      "name": "Kobe Brown",
      "pos": [
        "PF"
      ],
      "ovr": 73,
      "real_ovr": 74,
      "id": 1641738,
      "basic": {
        "MP": 6.8,
        "FGA": 1.8,
        "FG%": "45.8%",
        "3PA": 0.7,
        "3P%": "23.1%",
        "FTA": 0.2,
        "FT%": "71.4%",
        "ORB": 0.5,
        "DRB": 1.2,
        "AST": 0.6,
        "STL": 0.2,
        "BLK": 0.1,
        "TOV": 0.3,
        "PF": 0.6,
        "PTS": 1.9
      },
      "advanced": {
        "USG%": "14.0%",
        "TS%": "51.3%",
        "AST%": "11.9%",
        "TRB%": "13.5%",
        "ORB%": "8.0%",
        "DRB%": "18.9%",
        "STL%": "1.3%",
        "BLK%": "1.5%",
        "TOV%": "13.8%"
      }
    },
    {
      "name": "Jordan Miller",
      "pos": [
        "SF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1641757,
      "basic": {
        "MP": 11.4,
        "FGA": 3.6,
        "FG%": "43.3%",
        "3PA": 1.0,
        "3P%": "21.1%",
        "FTA": 0.9,
        "FT%": "80.0%",
        "ORB": 0.6,
        "DRB": 0.9,
        "AST": 0.9,
        "STL": 0.5,
        "BLK": 0.1,
        "TOV": 0.7,
        "PF": 0.7,
        "PTS": 4.1
      },
      "advanced": {
        "USG%": "18.2%",
        "TS%": "50.9%",
        "AST%": "11.2%",
        "TRB%": "7.8%",
        "ORB%": "6.3%",
        "DRB%": "9.3%",
        "STL%": "2.0%",
        "BLK%": "1.2%",
        "TOV%": "14.8%"
      }
    },
    {
      "name": "Cam Christie",
      "pos": [
        "SG"
      ],
      "ovr": 72,
      "real_ovr": 73,
      "id": 1642353,
      "basic": {
        "MP": 4.5,
        "FGA": 1.8,
        "FG%": "29.2%",
        "3PA": 1.0,
        "3P%": "15.4%",
        "FTA": 0.3,
        "FT%": "50.0%",
        "ORB": 0.2,
        "DRB": 0.7,
        "AST": 0.5,
        "STL": 0.4,
        "BLK": 0.1,
        "TOV": 0.2,
        "PF": 0.3,
        "PTS": 1.4
      },
      "advanced": {
        "USG%": "20.5%",
        "TS%": "34.9%",
        "AST%": "13.7%",
        "TRB%": "11.5%",
        "ORB%": "5.8%",
        "DRB%": "17.0%",
        "STL%": "4.2%",
        "BLK%": "1.7%",
        "TOV%": "7.2%"
      }
    }
  ]
,
  "LAL": [
    {
      "name": "Luka Dončić",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 97,
      "real_ovr": 93,
      "id": 1629029,
      "basic": {
        "MP": 35.4,
        "FGA": 20.5,
        "FG%": "45.0%",
        "3PA": 9.6,
        "3P%": "36.8%",
        "FTA": 7.9,
        "FT%": "78.2%",
        "ORB": 0.8,
        "DRB": 7.4,
        "AST": 7.7,
        "STL": 1.8,
        "BLK": 0.4,
        "TOV": 3.6,
        "PF": 2.5,
        "PTS": 28.2
      },
      "advanced": {
        "USG%": "33.9%",
        "TS%": "58.7%",
        "AST%": "36.1%",
        "TRB%": "12.8%",
        "ORB%": "2.6%",
        "DRB%": "22.6%",
        "STL%": "2.5%",
        "BLK%": "1.1%",
        "TOV%": "13.0%"
      }
    },
    {
      "name": "LeBron James",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 94,
      "real_ovr": 91,
      "id": 2544,
      "basic": {
        "MP": 34.9,
        "FGA": 18.1,
        "FG%": "51.3%",
        "3PA": 5.7,
        "3P%": "37.6%",
        "FTA": 4.7,
        "FT%": "78.2%",
        "ORB": 1.0,
        "DRB": 6.8,
        "AST": 8.2,
        "STL": 1.0,
        "BLK": 0.6,
        "TOV": 3.7,
        "PF": 1.4,
        "PTS": 24.4
      },
      "advanced": {
        "USG%": "30.1%",
        "TS%": "60.4%",
        "AST%": "40.3%",
        "TRB%": "12.6%",
        "ORB%": "3.4%",
        "DRB%": "21.2%",
        "STL%": "1.4%",
        "BLK%": "1.5%",
        "TOV%": "15.5%"
      }
    },
    {
      "name": "Austin Reaves",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 85,
      "real_ovr": 86,
      "id": 1630559,
      "basic": {
        "MP": 34.9,
        "FGA": 14.2,
        "FG%": "46.0%",
        "3PA": 7.3,
        "3P%": "37.7%",
        "FTA": 5.0,
        "FT%": "87.7%",
        "ORB": 0.8,
        "DRB": 3.7,
        "AST": 5.8,
        "STL": 1.1,
        "BLK": 0.3,
        "TOV": 2.4,
        "PF": 2.1,
        "PTS": 20.2
      },
      "advanced": {
        "USG%": "23.7%",
        "TS%": "61.6%",
        "AST%": "24.9%",
        "TRB%": "7.3%",
        "ORB%": "2.8%",
        "DRB%": "11.5%",
        "STL%": "1.6%",
        "BLK%": "0.8%",
        "TOV%": "12.9%"
      }
    },
    {
      "name": "Rui Hachimura",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 80,
      "real_ovr": 80,
      "id": 1629060,
      "basic": {
        "MP": 31.7,
        "FGA": 9.8,
        "FG%": "50.9%",
        "3PA": 4.2,
        "3P%": "41.3%",
        "FTA": 1.9,
        "FT%": "77.0%",
        "ORB": 1.3,
        "DRB": 3.7,
        "AST": 1.4,
        "STL": 0.8,
        "BLK": 0.4,
        "TOV": 0.8,
        "PF": 1.8,
        "PTS": 13.1
      },
      "advanced": {
        "USG%": "15.8%",
        "TS%": "61.9%",
        "AST%": "6.4%",
        "TRB%": "8.9%",
        "ORB%": "4.9%",
        "DRB%": "12.6%",
        "STL%": "1.2%",
        "BLK%": "1.3%",
        "TOV%": "7.3%"
      }
    },
    {
      "name": "Maxi Kleber",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 77,
      "real_ovr": 75,
      "id": 1628467,
      "basic": {
        "MP": 18.7,
        "FGA": 2.8,
        "FG%": "38.5%",
        "3PA": 1.4,
        "3P%": "26.5%",
        "FTA": 0.6,
        "FT%": "76.2%",
        "ORB": 0.7,
        "DRB": 2.1,
        "AST": 1.3,
        "STL": 0.3,
        "BLK": 0.5,
        "TOV": 0.7,
        "PF": 1.9,
        "PTS": 3.0
      },
      "advanced": {
        "USG%": "8.7%",
        "TS%": "48.9%",
        "AST%": "8.3%",
        "TRB%": "8.1%",
        "ORB%": "4.4%",
        "DRB%": "11.7%",
        "STL%": "0.7%",
        "BLK%": "2.3%",
        "TOV%": "17.9%"
      }
    },
    {
      "name": "Jarred Vanderbilt",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 78,
      "real_ovr": 76,
      "id": 1629020,
      "basic": {
        "MP": 16.1,
        "FGA": 3.4,
        "FG%": "48.8%",
        "3PA": 0.9,
        "3P%": "28.1%",
        "FTA": 1.0,
        "FT%": "55.6%",
        "ORB": 1.9,
        "DRB": 3.2,
        "AST": 1.1,
        "STL": 1.0,
        "BLK": 0.3,
        "TOV": 0.8,
        "PF": 1.9,
        "PTS": 4.1
      },
      "advanced": {
        "USG%": "12.5%",
        "TS%": "53.7%",
        "AST%": "9.4%",
        "TRB%": "17.6%",
        "ORB%": "13.6%",
        "DRB%": "21.5%",
        "STL%": "3.0%",
        "BLK%": "1.6%",
        "TOV%": "17.5%"
      }
    },
    {
      "name": "Gabe Vincent",
      "pos": [
        "PG"
      ],
      "ovr": 77,
      "real_ovr": 75,
      "id": 1629216,
      "basic": {
        "MP": 21.2,
        "FGA": 5.8,
        "FG%": "40.0%",
        "3PA": 4.3,
        "3P%": "35.3%",
        "FTA": 0.3,
        "FT%": "71.4%",
        "ORB": 0.3,
        "DRB": 1.0,
        "AST": 1.4,
        "STL": 0.7,
        "BLK": 0.2,
        "TOV": 0.6,
        "PF": 2.1,
        "PTS": 6.4
      },
      "advanced": {
        "USG%": "13.5%",
        "TS%": "53.6%",
        "AST%": "8.7%",
        "TRB%": "3.4%",
        "ORB%": "1.5%",
        "DRB%": "5.2%",
        "STL%": "1.6%",
        "BLK%": "0.8%",
        "TOV%": "8.7%"
      }
    },
    {
      "name": "Dalton Knecht",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 78,
      "real_ovr": 77,
      "id": 1642261,
      "basic": {
        "MP": 19.2,
        "FGA": 7.1,
        "FG%": "46.1%",
        "3PA": 4.4,
        "3P%": "37.6%",
        "FTA": 1.1,
        "FT%": "76.2%",
        "ORB": 0.5,
        "DRB": 2.3,
        "AST": 0.8,
        "STL": 0.3,
        "BLK": 0.1,
        "TOV": 0.5,
        "PF": 1.2,
        "PTS": 9.1
      },
      "advanced": {
        "USG%": "18.5%",
        "TS%": "59.4%",
        "AST%": "6.5%",
        "TRB%": "8.1%",
        "ORB%": "2.9%",
        "DRB%": "13.1%",
        "STL%": "0.8%",
        "BLK%": "0.5%",
        "TOV%": "5.9%"
      }
    },
    {
      "name": "Jaxson Hayes",
      "pos": [
        "C"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1629637,
      "basic": {
        "MP": 19.5,
        "FGA": 4.0,
        "FG%": "72.2%",
        "3PA": 0.1,
        "3P%": "0.0%",
        "FTA": 1.8,
        "FT%": "62.2%",
        "ORB": 1.4,
        "DRB": 3.4,
        "AST": 1.0,
        "STL": 0.6,
        "BLK": 0.9,
        "TOV": 0.8,
        "PF": 2.4,
        "PTS": 6.8
      },
      "advanced": {
        "USG%": "12.4%",
        "TS%": "72.0%",
        "AST%": "7.5%",
        "TRB%": "13.9%",
        "ORB%": "8.3%",
        "DRB%": "19.1%",
        "STL%": "1.4%",
        "BLK%": "4.4%",
        "TOV%": "13.9%"
      }
    },
    {
      "name": "Christian Wood",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 77,
      "real_ovr": 77,
      "id": 1626174,
      "note": "Injured / Inactive (0 GP)",
      "basic": {
        "MP": 0.0,
        "FGA": 0.0,
        "FG%": "0.0%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 0.0,
        "FT%": "0.0%",
        "ORB": 0.0,
        "DRB": 0.0,
        "AST": 0.0,
        "STL": 0.0,
        "BLK": 0.0,
        "TOV": 0.0,
        "PF": 0.0,
        "PTS": 0.0
      },
      "advanced": {
        "USG%": "0.0%",
        "TS%": "0.0%",
        "AST%": "0.0%",
        "TRB%": "0.0%",
        "ORB%": "0.0%",
        "DRB%": "0.0%",
        "STL%": "0.0%",
        "BLK%": "0.0%",
        "TOV%": "0.0%"
      }
    },
    {
      "name": "Markieff Morris",
      "pos": [
        "PF"
      ],
      "ovr": 74,
      "real_ovr": 73,
      "id": 202693,
      "basic": {
        "MP": 11.0,
        "FGA": 4.7,
        "FG%": "30.0%",
        "3PA": 2.4,
        "3P%": "25.0%",
        "FTA": 0.4,
        "FT%": "83.3%",
        "ORB": 0.2,
        "DRB": 1.3,
        "AST": 1.4,
        "STL": 0.1,
        "BLK": 0.2,
        "TOV": 0.3,
        "PF": 1.1,
        "PTS": 3.7
      },
      "advanced": {
        "USG%": "20.5%",
        "TS%": "38.5%",
        "AST%": "17.5%",
        "TRB%": "7.8%",
        "ORB%": "2.1%",
        "DRB%": "13.1%",
        "STL%": "0.6%",
        "BLK%": "1.7%",
        "TOV%": "6.4%"
      }
    },
    {
      "name": "Cam Reddish",
      "pos": [
        "SF"
      ],
      "ovr": 75,
      "real_ovr": 74,
      "id": 1629629,
      "basic": {
        "MP": 17.8,
        "FGA": 2.8,
        "FG%": "40.4%",
        "3PA": 1.4,
        "3P%": "27.7%",
        "FTA": 0.8,
        "FT%": "61.5%",
        "ORB": 0.5,
        "DRB": 1.5,
        "AST": 0.7,
        "STL": 1.0,
        "BLK": 0.3,
        "TOV": 0.4,
        "PF": 1.3,
        "PTS": 3.2
      },
      "advanced": {
        "USG%": "8.8%",
        "TS%": "49.8%",
        "AST%": "4.8%",
        "TRB%": "6.3%",
        "ORB%": "3.3%",
        "DRB%": "9.1%",
        "STL%": "2.8%",
        "BLK%": "1.6%",
        "TOV%": "10.2%"
      }
    },
    {
      "name": "Bronny James",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 1642355,
      "basic": {
        "MP": 6.7,
        "FGA": 2.5,
        "FG%": "31.3%",
        "3PA": 1.2,
        "3P%": "28.1%",
        "FTA": 0.5,
        "FT%": "78.6%",
        "ORB": 0.1,
        "DRB": 0.5,
        "AST": 0.8,
        "STL": 0.3,
        "BLK": 0.1,
        "TOV": 0.5,
        "PF": 0.5,
        "PTS": 2.3
      },
      "advanced": {
        "USG%": "20.9%",
        "TS%": "42.4%",
        "AST%": "16.5%",
        "TRB%": "5.6%",
        "ORB%": "2.6%",
        "DRB%": "8.5%",
        "STL%": "2.4%",
        "BLK%": "1.6%",
        "TOV%": "15.1%"
      }
    },
    {
      "name": "Maxwell Lewis",
      "pos": [
        "SF"
      ],
      "ovr": 73,
      "real_ovr": 74,
      "id": 1641721,
      "basic": {
        "MP": 11.7,
        "FGA": 3.9,
        "FG%": "41.7%",
        "3PA": 1.8,
        "3P%": "38.0%",
        "FTA": 0.4,
        "FT%": "70.0%",
        "ORB": 0.6,
        "DRB": 1.3,
        "AST": 0.7,
        "STL": 0.3,
        "BLK": 0.3,
        "TOV": 0.5,
        "PF": 1.0,
        "PTS": 4.1
      },
      "advanced": {
        "USG%": "16.9%",
        "TS%": "51.6%",
        "AST%": "9.0%",
        "TRB%": "9.5%",
        "ORB%": "6.0%",
        "DRB%": "13.5%",
        "STL%": "1.4%",
        "BLK%": "2.1%",
        "TOV%": "11.1%"
      }
    },
    {
      "name": "Armel Traore",
      "pos": [
        "PF"
      ],
      "ovr": 71,
      "real_ovr": 72,
      "id": 1642422,
      "basic": {
        "MP": 7.4,
        "FGA": 2.1,
        "FG%": "31.6%",
        "3PA": 0.8,
        "3P%": "0.0%",
        "FTA": 0.8,
        "FT%": "28.6%",
        "ORB": 0.2,
        "DRB": 1.4,
        "AST": 0.1,
        "STL": 0.4,
        "BLK": 0.2,
        "TOV": 0.3,
        "PF": 0.7,
        "PTS": 1.6
      },
      "advanced": {
        "USG%": "16.4%",
        "TS%": "31.7%",
        "AST%": "2.0%",
        "TRB%": "12.6%",
        "ORB%": "3.5%",
        "DRB%": "21.2%",
        "STL%": "2.9%",
        "BLK%": "2.8%",
        "TOV%": "12.0%"
      }
    }
  ]
,
  "MEM": [
    {
      "name": "Ja Morant",
      "pos": [
        "PG"
      ],
      "ovr": 91,
      "real_ovr": 88,
      "id": 1629630,
      "basic": {
        "MP": 30.4,
        "FGA": 17.8,
        "FG%": "45.4%",
        "3PA": 5.7,
        "3P%": "30.9%",
        "FTA": 6.4,
        "FT%": "82.4%",
        "ORB": 0.7,
        "DRB": 3.4,
        "AST": 7.3,
        "STL": 1.2,
        "BLK": 0.2,
        "TOV": 3.7,
        "PF": 2.3,
        "PTS": 23.2
      },
      "advanced": {
        "USG%": "32.2%",
        "TS%": "56.3%",
        "AST%": "36.0%",
        "TRB%": "7.1%",
        "ORB%": "2.4%",
        "DRB%": "11.8%",
        "STL%": "1.9%",
        "BLK%": "0.7%",
        "TOV%": "15.2%"
      }
    },
    {
      "name": "Jaren Jackson Jr.",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 89,
      "real_ovr": 87,
      "id": 1628991,
      "basic": {
        "MP": 29.8,
        "FGA": 16.4,
        "FG%": "48.8%",
        "3PA": 5.3,
        "3P%": "37.5%",
        "FTA": 5.4,
        "FT%": "78.1%",
        "ORB": 1.2,
        "DRB": 4.4,
        "AST": 2.0,
        "STL": 1.2,
        "BLK": 1.5,
        "TOV": 2.1,
        "PF": 3.5,
        "PTS": 22.2
      },
      "advanced": {
        "USG%": "28.1%",
        "TS%": "59.1%",
        "AST%": "10.1%",
        "TRB%": "10.0%",
        "ORB%": "4.4%",
        "DRB%": "15.5%",
        "STL%": "1.9%",
        "BLK%": "4.7%",
        "TOV%": "9.9%"
      }
    },
    {
      "name": "Desmond Bane",
      "pos": [
        "SG"
      ],
      "ovr": 86,
      "real_ovr": 86,
      "id": 1630217,
      "basic": {
        "MP": 32.0,
        "FGA": 14.8,
        "FG%": "48.4%",
        "3PA": 6.1,
        "3P%": "39.2%",
        "FTA": 2.9,
        "FT%": "89.4%",
        "ORB": 0.9,
        "DRB": 5.2,
        "AST": 5.3,
        "STL": 1.2,
        "BLK": 0.4,
        "TOV": 2.4,
        "PF": 2.4,
        "PTS": 19.2
      },
      "advanced": {
        "USG%": "23.3%",
        "TS%": "60.0%",
        "AST%": "23.6%",
        "TRB%": "10.0%",
        "ORB%": "3.0%",
        "DRB%": "16.9%",
        "STL%": "1.7%",
        "BLK%": "1.2%",
        "TOV%": "13.3%"
      }
    },
    {
      "name": "Marcus Smart",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 81,
      "real_ovr": 78,
      "id": 203935,
      "basic": {
        "MP": 20.0,
        "FGA": 7.6,
        "FG%": "39.3%",
        "3PA": 4.1,
        "3P%": "34.8%",
        "FTA": 2.1,
        "FT%": "76.1%",
        "ORB": 0.5,
        "DRB": 1.6,
        "AST": 3.2,
        "STL": 1.1,
        "BLK": 0.3,
        "TOV": 1.6,
        "PF": 1.6,
        "PTS": 9.0
      },
      "advanced": {
        "USG%": "20.6%",
        "TS%": "52.9%",
        "AST%": "21.7%",
        "TRB%": "5.6%",
        "ORB%": "2.8%",
        "DRB%": "8.3%",
        "STL%": "2.7%",
        "BLK%": "1.2%",
        "TOV%": "15.8%"
      }
    },
    {
      "name": "Zach Edey",
      "pos": [
        "C"
      ],
      "ovr": 80,
      "real_ovr": 80,
      "id": 1641744,
      "basic": {
        "MP": 21.5,
        "FGA": 6.6,
        "FG%": "58.0%",
        "3PA": 0.8,
        "3P%": "34.6%",
        "FTA": 1.9,
        "FT%": "70.9%",
        "ORB": 3.5,
        "DRB": 4.8,
        "AST": 1.0,
        "STL": 0.5,
        "BLK": 1.3,
        "TOV": 1.3,
        "PF": 2.8,
        "PTS": 9.2
      },
      "advanced": {
        "USG%": "16.4%",
        "TS%": "62.4%",
        "AST%": "6.1%",
        "TRB%": "20.5%",
        "ORB%": "17.5%",
        "DRB%": "23.4%",
        "STL%": "1.2%",
        "BLK%": "5.5%",
        "TOV%": "15.3%"
      }
    },
    {
      "name": "Santi Aldama",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 80,
      "real_ovr": 82,
      "id": 1630583,
      "basic": {
        "MP": 25.5,
        "FGA": 10.0,
        "FG%": "48.3%",
        "3PA": 5.0,
        "3P%": "36.8%",
        "FTA": 1.4,
        "FT%": "69.1%",
        "ORB": 1.4,
        "DRB": 5.0,
        "AST": 2.9,
        "STL": 0.8,
        "BLK": 0.4,
        "TOV": 1.1,
        "PF": 1.2,
        "PTS": 12.5
      },
      "advanced": {
        "USG%": "18.5%",
        "TS%": "58.8%",
        "AST%": "15.2%",
        "TRB%": "13.3%",
        "ORB%": "6.1%",
        "DRB%": "20.3%",
        "STL%": "1.5%",
        "BLK%": "1.6%",
        "TOV%": "9.3%"
      }
    },
    {
      "name": "Vince Williams Jr.",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 78,
      "real_ovr": 77,
      "id": 1631246,
      "basic": {
        "MP": 18.5,
        "FGA": 6.2,
        "FG%": "40.1%",
        "3PA": 3.5,
        "3P%": "27.4%",
        "FTA": 0.9,
        "FT%": "79.2%",
        "ORB": 0.8,
        "DRB": 2.8,
        "AST": 2.0,
        "STL": 0.4,
        "BLK": 0.3,
        "TOV": 1.2,
        "PF": 1.7,
        "PTS": 6.6
      },
      "advanced": {
        "USG%": "17.0%",
        "TS%": "50.4%",
        "AST%": "13.8%",
        "TRB%": "10.4%",
        "ORB%": "4.7%",
        "DRB%": "15.9%",
        "STL%": "1.1%",
        "BLK%": "1.3%",
        "TOV%": "15.7%"
      }
    },
    {
      "name": "GG Jackson",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 78,
      "real_ovr": 76,
      "id": 1641713,
      "basic": {
        "MP": 15.8,
        "FGA": 6.9,
        "FG%": "37.2%",
        "3PA": 3.3,
        "3P%": "33.7%",
        "FTA": 1.4,
        "FT%": "72.5%",
        "ORB": 0.9,
        "DRB": 2.2,
        "AST": 1.0,
        "STL": 0.4,
        "BLK": 0.2,
        "TOV": 1.1,
        "PF": 1.0,
        "PTS": 7.2
      },
      "advanced": {
        "USG%": "21.7%",
        "TS%": "48.2%",
        "AST%": "8.2%",
        "TRB%": "10.6%",
        "ORB%": "6.3%",
        "DRB%": "14.8%",
        "STL%": "1.2%",
        "BLK%": "1.0%",
        "TOV%": "12.5%"
      }
    },
    {
      "name": "Luke Kennard",
      "pos": [
        "SG"
      ],
      "ovr": 77,
      "real_ovr": 78,
      "id": 1628379,
      "basic": {
        "MP": 22.6,
        "FGA": 6.6,
        "FG%": "47.8%",
        "3PA": 4.0,
        "3P%": "43.3%",
        "FTA": 0.9,
        "FT%": "89.5%",
        "ORB": 0.6,
        "DRB": 2.2,
        "AST": 3.3,
        "STL": 0.8,
        "BLK": 0.1,
        "TOV": 1.1,
        "PF": 0.9,
        "PTS": 8.9
      },
      "advanced": {
        "USG%": "14.5%",
        "TS%": "63.1%",
        "AST%": "18.5%",
        "TRB%": "6.6%",
        "ORB%": "2.7%",
        "DRB%": "10.4%",
        "STL%": "1.6%",
        "BLK%": "0.3%",
        "TOV%": "13.6%"
      }
    },
    {
      "name": "Scotty Pippen Jr.",
      "pos": [
        "PG"
      ],
      "ovr": 77,
      "real_ovr": 80,
      "id": 1630590,
      "basic": {
        "MP": 21.3,
        "FGA": 7.5,
        "FG%": "48.0%",
        "3PA": 2.8,
        "3P%": "39.7%",
        "FTA": 2.2,
        "FT%": "71.3%",
        "ORB": 0.8,
        "DRB": 2.5,
        "AST": 4.4,
        "STL": 1.3,
        "BLK": 0.4,
        "TOV": 1.7,
        "PF": 2.6,
        "PTS": 9.9
      },
      "advanced": {
        "USG%": "19.3%",
        "TS%": "58.2%",
        "AST%": "27.1%",
        "TRB%": "8.1%",
        "ORB%": "4.1%",
        "DRB%": "12.1%",
        "STL%": "2.8%",
        "BLK%": "1.6%",
        "TOV%": "17.1%"
      }
    },
    {
      "name": "Jaylen Wells",
      "pos": [
        "SF"
      ],
      "ovr": 77,
      "real_ovr": 78,
      "id": 1642377,
      "basic": {
        "MP": 25.9,
        "FGA": 8.6,
        "FG%": "42.5%",
        "3PA": 5.0,
        "3P%": "35.2%",
        "FTA": 1.7,
        "FT%": "82.2%",
        "ORB": 1.1,
        "DRB": 2.3,
        "AST": 1.7,
        "STL": 0.6,
        "BLK": 0.1,
        "TOV": 0.9,
        "PF": 1.8,
        "PTS": 10.4
      },
      "advanced": {
        "USG%": "15.9%",
        "TS%": "56.0%",
        "AST%": "8.4%",
        "TRB%": "6.9%",
        "ORB%": "4.6%",
        "DRB%": "9.3%",
        "STL%": "1.0%",
        "BLK%": "0.4%",
        "TOV%": "8.6%"
      }
    },
    {
      "name": "John Konchar",
      "pos": [
        "SG"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1629723,
      "basic": {
        "MP": 12.1,
        "FGA": 2.0,
        "FG%": "45.1%",
        "3PA": 1.3,
        "3P%": "37.1%",
        "FTA": 0.2,
        "FT%": "87.5%",
        "ORB": 0.8,
        "DRB": 2.5,
        "AST": 0.9,
        "STL": 0.7,
        "BLK": 0.3,
        "TOV": 0.3,
        "PF": 0.7,
        "PTS": 2.4
      },
      "advanced": {
        "USG%": "8.0%",
        "TS%": "59.2%",
        "AST%": "8.8%",
        "TRB%": "14.3%",
        "ORB%": "7.1%",
        "DRB%": "21.4%",
        "STL%": "2.5%",
        "BLK%": "2.3%",
        "TOV%": "14.5%"
      }
    },
    {
      "name": "Jake LaRavia",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 75,
      "real_ovr": 78,
      "id": 1631222,
      "basic": {
        "MP": 20.4,
        "FGA": 5.1,
        "FG%": "47.5%",
        "3PA": 2.2,
        "3P%": "42.3%",
        "FTA": 1.7,
        "FT%": "67.8%",
        "ORB": 1.4,
        "DRB": 2.6,
        "AST": 2.4,
        "STL": 0.9,
        "BLK": 0.3,
        "TOV": 1.3,
        "PF": 2.0,
        "PTS": 6.9
      },
      "advanced": {
        "USG%": "14.4%",
        "TS%": "59.1%",
        "AST%": "14.6%",
        "TRB%": "10.3%",
        "ORB%": "7.2%",
        "DRB%": "13.3%",
        "STL%": "2.2%",
        "BLK%": "1.6%",
        "TOV%": "18.2%"
      }
    },
    {
      "name": "Jay Huff",
      "pos": [
        "C"
      ],
      "ovr": 75,
      "real_ovr": 77,
      "id": 1630643,
      "basic": {
        "MP": 11.7,
        "FGA": 4.8,
        "FG%": "51.5%",
        "3PA": 3.1,
        "3P%": "40.5%",
        "FTA": 0.9,
        "FT%": "78.6%",
        "ORB": 0.5,
        "DRB": 1.5,
        "AST": 0.6,
        "STL": 0.3,
        "BLK": 0.9,
        "TOV": 0.5,
        "PF": 1.2,
        "PTS": 6.9
      },
      "advanced": {
        "USG%": "19.6%",
        "TS%": "66.6%",
        "AST%": "7.0%",
        "TRB%": "9.1%",
        "ORB%": "4.3%",
        "DRB%": "13.9%",
        "STL%": "1.0%",
        "BLK%": "6.9%",
        "TOV%": "9.3%"
      }
    },
    {
      "name": "Lamar Stevens",
      "pos": [
        "PF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1630205,
      "basic": {
        "MP": 9.1,
        "FGA": 3.7,
        "FG%": "46.0%",
        "3PA": 1.6,
        "3P%": "29.6%",
        "FTA": 0.6,
        "FT%": "72.7%",
        "ORB": 0.2,
        "DRB": 2.0,
        "AST": 0.5,
        "STL": 0.3,
        "BLK": 0.2,
        "TOV": 0.6,
        "PF": 0.9,
        "PTS": 4.4
      },
      "advanced": {
        "USG%": "20.2%",
        "TS%": "54.5%",
        "AST%": "6.9%",
        "TRB%": "13.0%",
        "ORB%": "2.8%",
        "DRB%": "23.0%",
        "STL%": "1.5%",
        "BLK%": "1.8%",
        "TOV%": "12.8%"
      }
    }
  ]
,
  "MIA": [
    {
      "name": "Bam Adebayo",
      "pos": [
        "C"
      ],
      "ovr": 89,
      "real_ovr": 86,
      "id": 1628389,
      "basic": {
        "MP": 34.3,
        "FGA": 14.3,
        "FG%": "48.5%",
        "3PA": 2.8,
        "3P%": "35.7%",
        "FTA": 4.2,
        "FT%": "76.5%",
        "ORB": 2.4,
        "DRB": 7.2,
        "AST": 4.3,
        "STL": 1.3,
        "BLK": 0.7,
        "TOV": 2.1,
        "PF": 2.1,
        "PTS": 18.1
      },
      "advanced": {
        "USG%": "23.5%",
        "TS%": "56.1%",
        "AST%": "20.0%",
        "TRB%": "15.5%",
        "ORB%": "7.7%",
        "DRB%": "23.1%",
        "STL%": "1.8%",
        "BLK%": "1.9%",
        "TOV%": "11.4%"
      }
    },
    {
      "name": "Jimmy Butler",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 88,
      "real_ovr": 86,
      "id": 202710,
      "basic": {
        "MP": 31.7,
        "FGA": 10.9,
        "FG%": "50.4%",
        "3PA": 1.9,
        "3P%": "30.8%",
        "FTA": 7.1,
        "FT%": "84.2%",
        "ORB": 2.3,
        "DRB": 3.1,
        "AST": 5.4,
        "STL": 1.4,
        "BLK": 0.3,
        "TOV": 1.3,
        "PF": 0.9,
        "PTS": 17.5
      },
      "advanced": {
        "USG%": "20.8%",
        "TS%": "62.6%",
        "AST%": "25.5%",
        "TRB%": "9.2%",
        "ORB%": "7.7%",
        "DRB%": "10.8%",
        "STL%": "2.2%",
        "BLK%": "1.0%",
        "TOV%": "8.8%"
      }
    },
    {
      "name": "Tyler Herro",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 86,
      "real_ovr": 89,
      "id": 1629639,
      "basic": {
        "MP": 35.4,
        "FGA": 17.9,
        "FG%": "47.2%",
        "3PA": 8.7,
        "3P%": "37.5%",
        "FTA": 4.2,
        "FT%": "87.8%",
        "ORB": 0.5,
        "DRB": 4.7,
        "AST": 5.5,
        "STL": 0.9,
        "BLK": 0.2,
        "TOV": 2.6,
        "PF": 1.1,
        "PTS": 23.9
      },
      "advanced": {
        "USG%": "28.0%",
        "TS%": "60.5%",
        "AST%": "26.2%",
        "TRB%": "8.1%",
        "ORB%": "1.4%",
        "DRB%": "14.6%",
        "STL%": "1.3%",
        "BLK%": "0.6%",
        "TOV%": "11.5%"
      }
    },
    {
      "name": "Terry Rozier",
      "pos": [
        "PG"
      ],
      "ovr": 81,
      "real_ovr": 79,
      "id": 1626179,
      "basic": {
        "MP": 25.9,
        "FGA": 9.9,
        "FG%": "39.1%",
        "3PA": 4.8,
        "3P%": "29.5%",
        "FTA": 1.7,
        "FT%": "85.2%",
        "ORB": 0.7,
        "DRB": 3.0,
        "AST": 2.6,
        "STL": 0.6,
        "BLK": 0.2,
        "TOV": 1.2,
        "PF": 1.1,
        "PTS": 10.6
      },
      "advanced": {
        "USG%": "20.4%",
        "TS%": "49.7%",
        "AST%": "14.8%",
        "TRB%": "7.9%",
        "ORB%": "3.0%",
        "DRB%": "12.8%",
        "STL%": "1.1%",
        "BLK%": "0.8%",
        "TOV%": "10.3%"
      }
    },
    {
      "name": "Jaime Jaquez Jr.",
      "pos": [
        "SF"
      ],
      "ovr": 79,
      "real_ovr": 78,
      "id": 1631170,
      "basic": {
        "MP": 20.7,
        "FGA": 7.0,
        "FG%": "46.1%",
        "3PA": 1.8,
        "3P%": "31.1%",
        "FTA": 2.2,
        "FT%": "75.4%",
        "ORB": 1.3,
        "DRB": 3.1,
        "AST": 2.5,
        "STL": 0.9,
        "BLK": 0.2,
        "TOV": 1.5,
        "PF": 1.2,
        "PTS": 8.6
      },
      "advanced": {
        "USG%": "20.2%",
        "TS%": "54.3%",
        "AST%": "17.9%",
        "TRB%": "11.7%",
        "ORB%": "6.8%",
        "DRB%": "16.5%",
        "STL%": "2.2%",
        "BLK%": "1.0%",
        "TOV%": "15.7%"
      }
    },
    {
      "name": "Duncan Robinson",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1629130,
      "basic": {
        "MP": 24.1,
        "FGA": 9.0,
        "FG%": "43.7%",
        "3PA": 6.5,
        "3P%": "39.3%",
        "FTA": 0.7,
        "FT%": "88.7%",
        "ORB": 0.2,
        "DRB": 2.0,
        "AST": 2.4,
        "STL": 0.5,
        "BLK": 0.1,
        "TOV": 1.2,
        "PF": 1.8,
        "PTS": 11.0
      },
      "advanced": {
        "USG%": "19.2%",
        "TS%": "59.5%",
        "AST%": "14.7%",
        "TRB%": "5.2%",
        "ORB%": "1.1%",
        "DRB%": "9.1%",
        "STL%": "1.1%",
        "BLK%": "0.3%",
        "TOV%": "11.1%"
      }
    },
    {
      "name": "Nikola Jović",
      "pos": [
        "PF"
      ],
      "ovr": 78,
      "real_ovr": 79,
      "id": 1631107,
      "basic": {
        "MP": 25.1,
        "FGA": 8.2,
        "FG%": "45.6%",
        "3PA": 4.6,
        "3P%": "37.1%",
        "FTA": 1.9,
        "FT%": "82.8%",
        "ORB": 0.6,
        "DRB": 3.3,
        "AST": 2.8,
        "STL": 0.8,
        "BLK": 0.3,
        "TOV": 1.3,
        "PF": 1.8,
        "PTS": 10.7
      },
      "advanced": {
        "USG%": "18.3%",
        "TS%": "59.5%",
        "AST%": "16.6%",
        "TRB%": "8.6%",
        "ORB%": "2.5%",
        "DRB%": "14.6%",
        "STL%": "1.6%",
        "BLK%": "1.1%",
        "TOV%": "12.6%"
      }
    },
    {
      "name": "Kel'el Ware",
      "pos": [
        "C"
      ],
      "ovr": 77,
      "real_ovr": 79,
      "id": 1642276,
      "basic": {
        "MP": 22.2,
        "FGA": 7.3,
        "FG%": "55.4%",
        "3PA": 1.7,
        "3P%": "31.5%",
        "FTA": 1.0,
        "FT%": "68.7%",
        "ORB": 1.8,
        "DRB": 5.6,
        "AST": 0.9,
        "STL": 0.6,
        "BLK": 1.1,
        "TOV": 0.9,
        "PF": 1.7,
        "PTS": 9.3
      },
      "advanced": {
        "USG%": "17.2%",
        "TS%": "60.3%",
        "AST%": "6.5%",
        "TRB%": "18.4%",
        "ORB%": "9.1%",
        "DRB%": "27.5%",
        "STL%": "1.4%",
        "BLK%": "4.8%",
        "TOV%": "10.4%"
      }
    },
    {
      "name": "Kevin Love",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 77,
      "real_ovr": 77,
      "id": 201567,
      "basic": {
        "MP": 10.9,
        "FGA": 5.0,
        "FG%": "35.7%",
        "3PA": 2.9,
        "3P%": "35.8%",
        "FTA": 1.0,
        "FT%": "69.6%",
        "ORB": 1.0,
        "DRB": 3.1,
        "AST": 1.0,
        "STL": 0.7,
        "BLK": 0.2,
        "TOV": 0.6,
        "PF": 0.9,
        "PTS": 5.3
      },
      "advanced": {
        "USG%": "24.6%",
        "TS%": "48.8%",
        "AST%": "13.1%",
        "TRB%": "20.7%",
        "ORB%": "9.8%",
        "DRB%": "31.4%",
        "STL%": "3.0%",
        "BLK%": "1.5%",
        "TOV%": "10.1%"
      }
    },
    {
      "name": "Haywood Highsmith",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1629312,
      "basic": {
        "MP": 24.6,
        "FGA": 5.3,
        "FG%": "45.8%",
        "3PA": 3.1,
        "3P%": "38.2%",
        "FTA": 0.6,
        "FT%": "72.1%",
        "ORB": 1.0,
        "DRB": 2.4,
        "AST": 1.5,
        "STL": 0.9,
        "BLK": 0.5,
        "TOV": 0.7,
        "PF": 2.2,
        "PTS": 6.5
      },
      "advanced": {
        "USG%": "11.3%",
        "TS%": "58.3%",
        "AST%": "8.4%",
        "TRB%": "7.7%",
        "ORB%": "4.4%",
        "DRB%": "10.8%",
        "STL%": "1.9%",
        "BLK%": "2.0%",
        "TOV%": "11.6%"
      }
    },
    {
      "name": "Josh Richardson",
      "pos": [
        "SG"
      ],
      "ovr": 76,
      "real_ovr": 74,
      "id": 1626196,
      "basic": {
        "MP": 18.8,
        "FGA": 4.8,
        "FG%": "28.9%",
        "3PA": 2.8,
        "3P%": "27.3%",
        "FTA": 0.5,
        "FT%": "100.0%",
        "ORB": 0.8,
        "DRB": 0.8,
        "AST": 1.5,
        "STL": 1.0,
        "BLK": 0.1,
        "TOV": 1.0,
        "PF": 2.1,
        "PTS": 4.0
      },
      "advanced": {
        "USG%": "14.1%",
        "TS%": "40.2%",
        "AST%": "10.5%",
        "TRB%": "4.4%",
        "ORB%": "4.5%",
        "DRB%": "4.4%",
        "STL%": "2.7%",
        "BLK%": "0.6%",
        "TOV%": "16.8%"
      }
    },
    {
      "name": "Alec Burks",
      "pos": [
        "SG"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 202692,
      "basic": {
        "MP": 17.6,
        "FGA": 5.5,
        "FG%": "42.4%",
        "3PA": 4.2,
        "3P%": "42.5%",
        "FTA": 1.0,
        "FT%": "77.6%",
        "ORB": 0.3,
        "DRB": 2.2,
        "AST": 1.1,
        "STL": 0.6,
        "BLK": 0.1,
        "TOV": 0.6,
        "PF": 0.8,
        "PTS": 7.3
      },
      "advanced": {
        "USG%": "16.5%",
        "TS%": "60.8%",
        "AST%": "9.1%",
        "TRB%": "7.9%",
        "ORB%": "1.9%",
        "DRB%": "13.8%",
        "STL%": "1.6%",
        "BLK%": "0.8%",
        "TOV%": "9.0%"
      }
    },
    {
      "name": "Pelle Larsson",
      "pos": [
        "SG"
      ],
      "ovr": 75,
      "real_ovr": 74,
      "id": 1641796,
      "basic": {
        "MP": 14.2,
        "FGA": 3.7,
        "FG%": "43.8%",
        "3PA": 1.7,
        "3P%": "33.7%",
        "FTA": 1.1,
        "FT%": "67.2%",
        "ORB": 0.5,
        "DRB": 1.2,
        "AST": 1.2,
        "STL": 0.6,
        "BLK": 0.1,
        "TOV": 0.4,
        "PF": 1.7,
        "PTS": 4.6
      },
      "advanced": {
        "USG%": "14.4%",
        "TS%": "54.6%",
        "AST%": "11.6%",
        "TRB%": "6.5%",
        "ORB%": "4.0%",
        "DRB%": "9.0%",
        "STL%": "2.0%",
        "BLK%": "0.9%",
        "TOV%": "9.5%"
      }
    },
    {
      "name": "Thomas Bryant",
      "pos": [
        "C"
      ],
      "ovr": 74,
      "real_ovr": 77,
      "id": 1628418,
      "basic": {
        "MP": 14.6,
        "FGA": 4.9,
        "FG%": "50.8%",
        "3PA": 2.2,
        "3P%": "32.4%",
        "FTA": 1.0,
        "FT%": "85.9%",
        "ORB": 1.3,
        "DRB": 2.5,
        "AST": 0.8,
        "STL": 0.4,
        "BLK": 0.6,
        "TOV": 0.5,
        "PF": 1.2,
        "PTS": 6.5
      },
      "advanced": {
        "USG%": "17.1%",
        "TS%": "61.4%",
        "AST%": "7.6%",
        "TRB%": "14.5%",
        "ORB%": "9.7%",
        "DRB%": "19.2%",
        "STL%": "1.4%",
        "BLK%": "3.9%",
        "TOV%": "7.9%"
      }
    },
    {
      "name": "Dru Smith",
      "pos": [
        "PG"
      ],
      "ovr": 73,
      "real_ovr": 77,
      "id": 1630696,
      "basic": {
        "MP": 19.1,
        "FGA": 4.4,
        "FG%": "50.8%",
        "3PA": 2.1,
        "3P%": "53.3%",
        "FTA": 0.9,
        "FT%": "75.0%",
        "ORB": 0.9,
        "DRB": 1.7,
        "AST": 1.6,
        "STL": 1.5,
        "BLK": 0.4,
        "TOV": 1.2,
        "PF": 2.1,
        "PTS": 6.2
      },
      "advanced": {
        "USG%": "13.8%",
        "TS%": "65.6%",
        "AST%": "12.0%",
        "TRB%": "7.4%",
        "ORB%": "5.0%",
        "DRB%": "9.8%",
        "STL%": "3.9%",
        "BLK%": "2.1%",
        "TOV%": "20.4%"
      }
    }
  ]
,
  "MIL": [
    {
      "name": "Giannis Antetokounmpo",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 97,
      "real_ovr": 96,
      "id": 203507,
      "basic": {
        "MP": 34.2,
        "FGA": 19.7,
        "FG%": "60.1%",
        "3PA": 0.9,
        "3P%": "22.2%",
        "FTA": 10.6,
        "FT%": "61.7%",
        "ORB": 2.2,
        "DRB": 9.7,
        "AST": 6.5,
        "STL": 0.9,
        "BLK": 1.2,
        "TOV": 3.1,
        "PF": 2.3,
        "PTS": 30.4
      },
      "advanced": {
        "USG%": "35.2%",
        "TS%": "62.5%",
        "AST%": "36.0%",
        "TRB%": "19.0%",
        "ORB%": "7.3%",
        "DRB%": "29.7%",
        "STL%": "1.2%",
        "BLK%": "3.2%",
        "TOV%": "11.2%"
      }
    },
    {
      "name": "Damian Lillard",
      "pos": [
        "PG"
      ],
      "ovr": 89,
      "real_ovr": 90,
      "id": 203081,
      "basic": {
        "MP": 36.1,
        "FGA": 17.1,
        "FG%": "44.8%",
        "3PA": 9.0,
        "3P%": "37.6%",
        "FTA": 6.8,
        "FT%": "92.1%",
        "ORB": 0.5,
        "DRB": 4.2,
        "AST": 7.1,
        "STL": 1.2,
        "BLK": 0.2,
        "TOV": 2.8,
        "PF": 1.7,
        "PTS": 24.9
      },
      "advanced": {
        "USG%": "27.8%",
        "TS%": "62.1%",
        "AST%": "29.7%",
        "TRB%": "7.1%",
        "ORB%": "1.6%",
        "DRB%": "12.1%",
        "STL%": "1.6%",
        "BLK%": "0.4%",
        "TOV%": "12.2%"
      }
    },
    {
      "name": "Khris Middleton",
      "pos": [
        "SF"
      ],
      "ovr": 84,
      "real_ovr": 80,
      "id": 203114,
      "basic": {
        "MP": 22.8,
        "FGA": 9.1,
        "FG%": "47.5%",
        "3PA": 3.6,
        "3P%": "36.1%",
        "FTA": 2.3,
        "FT%": "85.7%",
        "ORB": 0.4,
        "DRB": 3.4,
        "AST": 4.1,
        "STL": 0.9,
        "BLK": 0.2,
        "TOV": 1.5,
        "PF": 2.0,
        "PTS": 11.9
      },
      "advanced": {
        "USG%": "22.0%",
        "TS%": "58.8%",
        "AST%": "26.8%",
        "TRB%": "8.7%",
        "ORB%": "1.7%",
        "DRB%": "15.4%",
        "STL%": "2.0%",
        "BLK%": "0.9%",
        "TOV%": "13.0%"
      }
    },
    {
      "name": "Brook Lopez",
      "pos": [
        "C"
      ],
      "ovr": 83,
      "real_ovr": 82,
      "id": 201572,
      "basic": {
        "MP": 31.8,
        "FGA": 9.7,
        "FG%": "50.9%",
        "3PA": 4.7,
        "3P%": "37.3%",
        "FTA": 1.7,
        "FT%": "82.6%",
        "ORB": 1.4,
        "DRB": 3.6,
        "AST": 1.8,
        "STL": 0.6,
        "BLK": 1.9,
        "TOV": 1.1,
        "PF": 2.1,
        "PTS": 13.0
      },
      "advanced": {
        "USG%": "15.8%",
        "TS%": "62.4%",
        "AST%": "7.8%",
        "TRB%": "8.6%",
        "ORB%": "5.0%",
        "DRB%": "11.8%",
        "STL%": "0.9%",
        "BLK%": "5.4%",
        "TOV%": "9.1%"
      }
    },
    {
      "name": "Bobby Portis",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 82,
      "real_ovr": 82,
      "id": 1626171,
      "basic": {
        "MP": 25.4,
        "FGA": 12.1,
        "FG%": "46.6%",
        "3PA": 3.6,
        "3P%": "36.5%",
        "FTA": 1.5,
        "FT%": "83.6%",
        "ORB": 1.8,
        "DRB": 6.6,
        "AST": 2.1,
        "STL": 0.7,
        "BLK": 0.5,
        "TOV": 1.2,
        "PF": 1.9,
        "PTS": 13.9
      },
      "advanced": {
        "USG%": "24.1%",
        "TS%": "54.2%",
        "AST%": "12.9%",
        "TRB%": "18.0%",
        "ORB%": "8.2%",
        "DRB%": "27.0%",
        "STL%": "1.4%",
        "BLK%": "1.9%",
        "TOV%": "8.3%"
      }
    },
    {
      "name": "Gary Trent Jr.",
      "pos": [
        "SG"
      ],
      "ovr": 79,
      "real_ovr": 78,
      "id": 1629018,
      "basic": {
        "MP": 25.6,
        "FGA": 8.9,
        "FG%": "43.1%",
        "3PA": 5.9,
        "3P%": "41.6%",
        "FTA": 1.2,
        "FT%": "84.8%",
        "ORB": 0.3,
        "DRB": 2.0,
        "AST": 1.2,
        "STL": 1.0,
        "BLK": 0.1,
        "TOV": 0.6,
        "PF": 1.7,
        "PTS": 11.1
      },
      "advanced": {
        "USG%": "17.1%",
        "TS%": "59.1%",
        "AST%": "6.4%",
        "TRB%": "4.8%",
        "ORB%": "1.2%",
        "DRB%": "8.2%",
        "STL%": "1.8%",
        "BLK%": "0.2%",
        "TOV%": "5.7%"
      }
    },
    {
      "name": "Taurean Prince",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 77,
      "real_ovr": 77,
      "id": 1627752,
      "basic": {
        "MP": 27.1,
        "FGA": 6.4,
        "FG%": "45.7%",
        "3PA": 4.2,
        "3P%": "43.9%",
        "FTA": 0.6,
        "FT%": "81.3%",
        "ORB": 0.4,
        "DRB": 3.2,
        "AST": 1.9,
        "STL": 1.0,
        "BLK": 0.2,
        "TOV": 1.0,
        "PF": 2.1,
        "PTS": 8.2
      },
      "advanced": {
        "USG%": "12.5%",
        "TS%": "61.3%",
        "AST%": "9.4%",
        "TRB%": "7.2%",
        "ORB%": "1.8%",
        "DRB%": "12.2%",
        "STL%": "1.7%",
        "BLK%": "0.6%",
        "TOV%": "13.3%"
      }
    },
    {
      "name": "Pat Connaughton",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 76,
      "real_ovr": 75,
      "id": 1626192,
      "basic": {
        "MP": 14.7,
        "FGA": 4.3,
        "FG%": "46.9%",
        "3PA": 2.0,
        "3P%": "32.1%",
        "FTA": 0.8,
        "FT%": "77.4%",
        "ORB": 0.5,
        "DRB": 2.2,
        "AST": 1.7,
        "STL": 0.2,
        "BLK": 0.3,
        "TOV": 0.6,
        "PF": 1.1,
        "PTS": 5.3
      },
      "advanced": {
        "USG%": "15.6%",
        "TS%": "56.7%",
        "AST%": "15.8%",
        "TRB%": "9.8%",
        "ORB%": "3.6%",
        "DRB%": "15.6%",
        "STL%": "0.7%",
        "BLK%": "1.7%",
        "TOV%": "11.2%"
      }
    },
    {
      "name": "Delon Wright",
      "pos": [
        "PG"
      ],
      "ovr": 76,
      "real_ovr": 75,
      "id": 1626203,
      "basic": {
        "MP": 15.9,
        "FGA": 3.3,
        "FG%": "34.4%",
        "3PA": 1.8,
        "3P%": "27.4%",
        "FTA": 0.6,
        "FT%": "60.0%",
        "ORB": 0.7,
        "DRB": 1.0,
        "AST": 1.9,
        "STL": 0.9,
        "BLK": 0.3,
        "TOV": 0.6,
        "PF": 0.6,
        "PTS": 3.1
      },
      "advanced": {
        "USG%": "11.3%",
        "TS%": "44.0%",
        "AST%": "15.0%",
        "TRB%": "5.7%",
        "ORB%": "4.9%",
        "DRB%": "6.5%",
        "STL%": "2.7%",
        "BLK%": "1.8%",
        "TOV%": "13.4%"
      }
    },
    {
      "name": "AJ Green",
      "pos": [
        "SG"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1631260,
      "basic": {
        "MP": 22.7,
        "FGA": 5.8,
        "FG%": "42.9%",
        "3PA": 5.0,
        "3P%": "42.7%",
        "FTA": 0.4,
        "FT%": "81.5%",
        "ORB": 0.2,
        "DRB": 2.1,
        "AST": 1.5,
        "STL": 0.5,
        "BLK": 0.1,
        "TOV": 0.5,
        "PF": 2.2,
        "PTS": 7.4
      },
      "advanced": {
        "USG%": "12.6%",
        "TS%": "62.1%",
        "AST%": "8.5%",
        "TRB%": "5.7%",
        "ORB%": "1.2%",
        "DRB%": "9.8%",
        "STL%": "1.1%",
        "BLK%": "0.4%",
        "TOV%": "8.4%"
      }
    },
    {
      "name": "MarJon Beauchamp",
      "pos": [
        "SF"
      ],
      "ovr": 75,
      "real_ovr": 72,
      "id": 1630699,
      "basic": {
        "MP": 4.5,
        "FGA": 1.9,
        "FG%": "41.5%",
        "3PA": 0.8,
        "3P%": "34.5%",
        "FTA": 0.6,
        "FT%": "75.0%",
        "ORB": 0.3,
        "DRB": 0.9,
        "AST": 0.3,
        "STL": 0.1,
        "BLK": 0.0,
        "TOV": 0.4,
        "PF": 0.4,
        "PTS": 2.3
      },
      "advanced": {
        "USG%": "24.9%",
        "TS%": "53.5%",
        "AST%": "10.2%",
        "TRB%": "15.6%",
        "ORB%": "8.0%",
        "DRB%": "22.6%",
        "STL%": "1.2%",
        "BLK%": "0.6%",
        "TOV%": "16.9%"
      }
    },
    {
      "name": "Andre Jackson Jr.",
      "pos": [
        "SG"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1641748,
      "basic": {
        "MP": 14.6,
        "FGA": 2.9,
        "FG%": "47.7%",
        "3PA": 1.1,
        "3P%": "39.5%",
        "FTA": 0.4,
        "FT%": "50.0%",
        "ORB": 1.0,
        "DRB": 1.7,
        "AST": 1.2,
        "STL": 0.5,
        "BLK": 0.2,
        "TOV": 0.9,
        "PF": 1.7,
        "PTS": 3.4
      },
      "advanced": {
        "USG%": "11.9%",
        "TS%": "55.4%",
        "AST%": "10.9%",
        "TRB%": "10.1%",
        "ORB%": "7.5%",
        "DRB%": "12.5%",
        "STL%": "1.7%",
        "BLK%": "1.3%",
        "TOV%": "21.8%"
      }
    },
    {
      "name": "AJ Johnson",
      "pos": [
        "PG"
      ],
      "ovr": 73,
      "real_ovr": 75,
      "id": 1642358,
      "basic": {
        "MP": 22.0,
        "FGA": 7.3,
        "FG%": "38.5%",
        "3PA": 3.1,
        "3P%": "26.7%",
        "FTA": 1.3,
        "FT%": "86.5%",
        "ORB": 0.3,
        "DRB": 1.8,
        "AST": 2.6,
        "STL": 0.4,
        "BLK": 0.1,
        "TOV": 1.2,
        "PF": 1.7,
        "PTS": 7.6
      },
      "advanced": {
        "USG%": "17.4%",
        "TS%": "48.0%",
        "AST%": "17.1%",
        "TRB%": "4.8%",
        "ORB%": "1.3%",
        "DRB%": "8.3%",
        "STL%": "0.9%",
        "BLK%": "0.4%",
        "TOV%": "13.2%"
      }
    },
    {
      "name": "Tyler Smith",
      "pos": [
        "PF"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1641890,
      "basic": {
        "MP": 5.3,
        "FGA": 2.2,
        "FG%": "48.0%",
        "3PA": 1.3,
        "3P%": "43.3%",
        "FTA": 0.3,
        "FT%": "75.0%",
        "ORB": 0.3,
        "DRB": 0.8,
        "AST": 0.2,
        "STL": 0.1,
        "BLK": 0.2,
        "TOV": 0.3,
        "PF": 0.5,
        "PTS": 2.9
      },
      "advanced": {
        "USG%": "22.1%",
        "TS%": "62.6%",
        "AST%": "4.9%",
        "TRB%": "11.1%",
        "ORB%": "5.6%",
        "DRB%": "16.3%",
        "STL%": "1.2%",
        "BLK%": "3.1%",
        "TOV%": "13.0%"
      }
    },
    {
      "name": "Chris Livingston",
      "pos": [
        "SF"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 1641753,
      "basic": {
        "MP": 5.0,
        "FGA": 1.3,
        "FG%": "33.3%",
        "3PA": 0.4,
        "3P%": "0.0%",
        "FTA": 0.8,
        "FT%": "75.0%",
        "ORB": 0.5,
        "DRB": 1.2,
        "AST": 0.2,
        "STL": 0.2,
        "BLK": 0.0,
        "TOV": 0.3,
        "PF": 0.4,
        "PTS": 1.4
      },
      "advanced": {
        "USG%": "16.6%",
        "TS%": "44.1%",
        "AST%": "6.0%",
        "TRB%": "17.9%",
        "ORB%": "10.7%",
        "DRB%": "24.6%",
        "STL%": "2.3%",
        "BLK%": "0.0%",
        "TOV%": "15.0%"
      }
    }
  ]
,
  "MIN": [
    {
      "name": "Anthony Edwards",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 94,
      "real_ovr": 92,
      "id": 1630162,
      "basic": {
        "MP": 36.3,
        "FGA": 20.4,
        "FG%": "44.7%",
        "3PA": 10.3,
        "3P%": "39.5%",
        "FTA": 6.3,
        "FT%": "83.7%",
        "ORB": 0.8,
        "DRB": 4.9,
        "AST": 4.5,
        "STL": 1.2,
        "BLK": 0.6,
        "TOV": 3.2,
        "PF": 1.9,
        "PTS": 27.6
      },
      "advanced": {
        "USG%": "31.4%",
        "TS%": "59.5%",
        "AST%": "20.9%",
        "TRB%": "8.7%",
        "ORB%": "2.4%",
        "DRB%": "14.8%",
        "STL%": "1.6%",
        "BLK%": "1.7%",
        "TOV%": "12.0%"
      }
    },
    {
      "name": "Julius Randle",
      "pos": [
        "PF"
      ],
      "ovr": 86,
      "real_ovr": 86,
      "id": 203944,
      "basic": {
        "MP": 32.3,
        "FGA": 13.6,
        "FG%": "48.5%",
        "3PA": 4.6,
        "3P%": "34.4%",
        "FTA": 4.9,
        "FT%": "80.6%",
        "ORB": 2.1,
        "DRB": 5.0,
        "AST": 4.7,
        "STL": 0.7,
        "BLK": 0.2,
        "TOV": 2.8,
        "PF": 2.5,
        "PTS": 18.7
      },
      "advanced": {
        "USG%": "25.0%",
        "TS%": "59.3%",
        "AST%": "22.5%",
        "TRB%": "12.1%",
        "ORB%": "7.3%",
        "DRB%": "16.8%",
        "STL%": "1.0%",
        "BLK%": "0.7%",
        "TOV%": "15.3%"
      }
    },
    {
      "name": "Rudy Gobert",
      "pos": [
        "C"
      ],
      "ovr": 86,
      "real_ovr": 82,
      "id": 203497,
      "basic": {
        "MP": 33.2,
        "FGA": 7.1,
        "FG%": "66.9%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 3.8,
        "FT%": "67.4%",
        "ORB": 3.7,
        "DRB": 7.2,
        "AST": 1.8,
        "STL": 0.8,
        "BLK": 1.4,
        "TOV": 1.2,
        "PF": 2.5,
        "PTS": 12.0
      },
      "advanced": {
        "USG%": "13.0%",
        "TS%": "68.7%",
        "AST%": "7.5%",
        "TRB%": "18.2%",
        "ORB%": "12.5%",
        "DRB%": "23.8%",
        "STL%": "1.2%",
        "BLK%": "4.1%",
        "TOV%": "12.4%"
      }
    },
    {
      "name": "Jaden McDaniels",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 83,
      "real_ovr": 81,
      "id": 1630183,
      "basic": {
        "MP": 31.9,
        "FGA": 10.2,
        "FG%": "47.7%",
        "3PA": 3.7,
        "3P%": "33.0%",
        "FTA": 1.6,
        "FT%": "81.3%",
        "ORB": 1.6,
        "DRB": 4.2,
        "AST": 2.0,
        "STL": 1.3,
        "BLK": 0.9,
        "TOV": 1.2,
        "PF": 2.7,
        "PTS": 12.2
      },
      "advanced": {
        "USG%": "16.3%",
        "TS%": "56.2%",
        "AST%": "9.0%",
        "TRB%": "10.0%",
        "ORB%": "5.6%",
        "DRB%": "14.2%",
        "STL%": "2.1%",
        "BLK%": "2.6%",
        "TOV%": "9.6%"
      }
    },
    {
      "name": "Naz Reid",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 82,
      "real_ovr": 83,
      "id": 1629675,
      "basic": {
        "MP": 27.5,
        "FGA": 11.5,
        "FG%": "46.2%",
        "3PA": 5.8,
        "3P%": "37.9%",
        "FTA": 1.8,
        "FT%": "77.6%",
        "ORB": 1.2,
        "DRB": 4.9,
        "AST": 2.3,
        "STL": 0.7,
        "BLK": 0.9,
        "TOV": 1.4,
        "PF": 2.4,
        "PTS": 14.2
      },
      "advanced": {
        "USG%": "21.5%",
        "TS%": "57.7%",
        "AST%": "12.6%",
        "TRB%": "12.1%",
        "ORB%": "4.7%",
        "DRB%": "19.3%",
        "STL%": "1.3%",
        "BLK%": "3.0%",
        "TOV%": "9.9%"
      }
    },
    {
      "name": "Mike Conley",
      "pos": [
        "PG"
      ],
      "ovr": 82,
      "real_ovr": 79,
      "id": 201144,
      "basic": {
        "MP": 24.7,
        "FGA": 6.6,
        "FG%": "40.0%",
        "3PA": 4.4,
        "3P%": "41.0%",
        "FTA": 1.3,
        "FT%": "90.0%",
        "ORB": 0.5,
        "DRB": 2.1,
        "AST": 4.5,
        "STL": 1.1,
        "BLK": 0.2,
        "TOV": 1.1,
        "PF": 1.6,
        "PTS": 8.2
      },
      "advanced": {
        "USG%": "14.4%",
        "TS%": "57.3%",
        "AST%": "24.5%",
        "TRB%": "5.7%",
        "ORB%": "2.1%",
        "DRB%": "9.3%",
        "STL%": "2.2%",
        "BLK%": "0.7%",
        "TOV%": "12.9%"
      }
    },
    {
      "name": "Donte DiVincenzo",
      "pos": [
        "SG"
      ],
      "ovr": 81,
      "real_ovr": 81,
      "id": 1628978,
      "basic": {
        "MP": 25.9,
        "FGA": 9.6,
        "FG%": "42.2%",
        "3PA": 7.1,
        "3P%": "39.7%",
        "FTA": 1.0,
        "FT%": "77.8%",
        "ORB": 0.5,
        "DRB": 3.2,
        "AST": 3.6,
        "STL": 1.2,
        "BLK": 0.3,
        "TOV": 1.6,
        "PF": 1.8,
        "PTS": 11.7
      },
      "advanced": {
        "USG%": "19.4%",
        "TS%": "58.2%",
        "AST%": "20.2%",
        "TRB%": "7.9%",
        "ORB%": "2.2%",
        "DRB%": "13.3%",
        "STL%": "2.2%",
        "BLK%": "1.0%",
        "TOV%": "13.8%"
      }
    },
    {
      "name": "Nickeil Alexander-Walker",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 80,
      "real_ovr": 79,
      "id": 1629638,
      "basic": {
        "MP": 25.3,
        "FGA": 7.5,
        "FG%": "43.8%",
        "3PA": 4.5,
        "3P%": "38.1%",
        "FTA": 1.4,
        "FT%": "78.0%",
        "ORB": 0.7,
        "DRB": 2.6,
        "AST": 2.7,
        "STL": 0.6,
        "BLK": 0.4,
        "TOV": 1.2,
        "PF": 1.7,
        "PTS": 9.4
      },
      "advanced": {
        "USG%": "16.0%",
        "TS%": "57.9%",
        "AST%": "15.0%",
        "TRB%": "7.1%",
        "ORB%": "2.9%",
        "DRB%": "11.1%",
        "STL%": "1.2%",
        "BLK%": "1.5%",
        "TOV%": "12.9%"
      }
    },
    {
      "name": "Rob Dillingham",
      "pos": [
        "PG"
      ],
      "ovr": 77,
      "real_ovr": 74,
      "id": 1642265,
      "basic": {
        "MP": 10.5,
        "FGA": 4.3,
        "FG%": "44.1%",
        "3PA": 1.5,
        "3P%": "33.8%",
        "FTA": 0.3,
        "FT%": "53.3%",
        "ORB": 0.2,
        "DRB": 0.8,
        "AST": 2.0,
        "STL": 0.4,
        "BLK": 0.0,
        "TOV": 1.1,
        "PF": 0.8,
        "PTS": 4.5
      },
      "advanced": {
        "USG%": "22.7%",
        "TS%": "50.3%",
        "AST%": "28.4%",
        "TRB%": "5.4%",
        "ORB%": "2.6%",
        "DRB%": "8.0%",
        "STL%": "1.9%",
        "BLK%": "0.2%",
        "TOV%": "19.6%"
      }
    },
    {
      "name": "Terrence Shannon Jr.",
      "pos": [
        "SG"
      ],
      "ovr": 75,
      "real_ovr": 74,
      "id": 1630545,
      "basic": {
        "MP": 10.6,
        "FGA": 3.6,
        "FG%": "48.2%",
        "3PA": 1.0,
        "3P%": "35.5%",
        "FTA": 0.7,
        "FT%": "81.0%",
        "ORB": 0.3,
        "DRB": 1.2,
        "AST": 1.0,
        "STL": 0.2,
        "BLK": 0.2,
        "TOV": 0.5,
        "PF": 0.8,
        "PTS": 4.3
      },
      "advanced": {
        "USG%": "17.7%",
        "TS%": "56.0%",
        "AST%": "13.8%",
        "TRB%": "7.7%",
        "ORB%": "3.3%",
        "DRB%": "11.9%",
        "STL%": "1.0%",
        "BLK%": "1.4%",
        "TOV%": "10.9%"
      }
    },
    {
      "name": "Joe Ingles",
      "pos": [
        "SF"
      ],
      "ovr": 75,
      "real_ovr": 73,
      "id": 204060,
      "basic": {
        "MP": 6.0,
        "FGA": 1.2,
        "FG%": "26.1%",
        "3PA": 0.8,
        "3P%": "20.0%",
        "FTA": 0.0,
        "FT%": "0.0%",
        "ORB": 0.1,
        "DRB": 0.5,
        "AST": 1.2,
        "STL": 0.1,
        "BLK": 0.0,
        "TOV": 0.5,
        "PF": 0.6,
        "PTS": 0.8
      },
      "advanced": {
        "USG%": "12.2%",
        "TS%": "32.6%",
        "AST%": "25.4%",
        "TRB%": "5.4%",
        "ORB%": "2.0%",
        "DRB%": "8.6%",
        "STL%": "0.9%",
        "BLK%": "0.0%",
        "TOV%": "28.1%"
      }
    },
    {
      "name": "Luka Garza",
      "pos": [
        "C"
      ],
      "ovr": 75,
      "real_ovr": 73,
      "id": 1630568,
      "basic": {
        "MP": 5.6,
        "FGA": 2.7,
        "FG%": "49.5%",
        "3PA": 0.9,
        "3P%": "27.8%",
        "FTA": 0.9,
        "FT%": "68.6%",
        "ORB": 0.8,
        "DRB": 0.6,
        "AST": 0.3,
        "STL": 0.2,
        "BLK": 0.1,
        "TOV": 0.3,
        "PF": 0.7,
        "PTS": 3.5
      },
      "advanced": {
        "USG%": "26.2%",
        "TS%": "57.3%",
        "AST%": "8.2%",
        "TRB%": "13.7%",
        "ORB%": "16.0%",
        "DRB%": "11.5%",
        "STL%": "1.4%",
        "BLK%": "1.3%",
        "TOV%": "9.1%"
      }
    },
    {
      "name": "Josh Minott",
      "pos": [
        "PF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1631169,
      "basic": {
        "MP": 6.0,
        "FGA": 2.0,
        "FG%": "48.9%",
        "3PA": 0.9,
        "3P%": "32.6%",
        "FTA": 0.4,
        "FT%": "89.5%",
        "ORB": 0.3,
        "DRB": 0.8,
        "AST": 0.4,
        "STL": 0.3,
        "BLK": 0.3,
        "TOV": 0.2,
        "PF": 0.7,
        "PTS": 2.6
      },
      "advanced": {
        "USG%": "17.2%",
        "TS%": "60.5%",
        "AST%": "9.5%",
        "TRB%": "9.4%",
        "ORB%": "4.9%",
        "DRB%": "13.8%",
        "STL%": "2.7%",
        "BLK%": "4.0%",
        "TOV%": "10.1%"
      }
    },
    {
      "name": "Leonard Miller",
      "pos": [
        "PF"
      ],
      "ovr": 74,
      "real_ovr": 72,
      "id": 1631159,
      "basic": {
        "MP": 2.5,
        "FGA": 1.2,
        "FG%": "40.0%",
        "3PA": 0.4,
        "3P%": "0.0%",
        "FTA": 0.6,
        "FT%": "100.0%",
        "ORB": 0.2,
        "DRB": 0.6,
        "AST": 0.0,
        "STL": 0.2,
        "BLK": 0.1,
        "TOV": 0.2,
        "PF": 0.2,
        "PTS": 1.5
      },
      "advanced": {
        "USG%": "27.8%",
        "TS%": "54.0%",
        "AST%": "0.0%",
        "TRB%": "19.1%",
        "ORB%": "10.6%",
        "DRB%": "27.3%",
        "STL%": "3.1%",
        "BLK%": "2.9%",
        "TOV%": "9.7%"
      }
    },
    {
      "name": "Jaylen Clark",
      "pos": [
        "SG"
      ],
      "ovr": 72,
      "real_ovr": 74,
      "id": 1641740,
      "basic": {
        "MP": 13.1,
        "FGA": 3.0,
        "FG%": "46.7%",
        "3PA": 1.3,
        "3P%": "43.1%",
        "FTA": 0.9,
        "FT%": "78.4%",
        "ORB": 0.7,
        "DRB": 0.7,
        "AST": 0.7,
        "STL": 0.9,
        "BLK": 0.1,
        "TOV": 0.2,
        "PF": 1.5,
        "PTS": 4.1
      },
      "advanced": {
        "USG%": "12.0%",
        "TS%": "59.8%",
        "AST%": "6.7%",
        "TRB%": "5.6%",
        "ORB%": "5.6%",
        "DRB%": "5.6%",
        "STL%": "3.4%",
        "BLK%": "0.4%",
        "TOV%": "5.5%"
      }
    }
  ]
,
  "NOP": [
    {
      "name": "Zion Williamson",
      "pos": [
        "PF"
      ],
      "ovr": 88,
      "real_ovr": 90,
      "id": 1629627,
      "basic": {
        "MP": 28.6,
        "FGA": 16.9,
        "FG%": "56.7%",
        "3PA": 0.4,
        "3P%": "23.1%",
        "FTA": 8.0,
        "FT%": "65.6%",
        "ORB": 2.5,
        "DRB": 4.7,
        "AST": 5.3,
        "STL": 1.2,
        "BLK": 0.9,
        "TOV": 3.0,
        "PF": 2.7,
        "PTS": 24.6
      },
      "advanced": {
        "USG%": "34.7%",
        "TS%": "60.0%",
        "AST%": "36.6%",
        "TRB%": "13.6%",
        "ORB%": "9.3%",
        "DRB%": "18.2%",
        "STL%": "2.1%",
        "BLK%": "3.0%",
        "TOV%": "12.8%"
      }
    },
    {
      "name": "Dejounte Murray",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 87,
      "real_ovr": 85,
      "id": 1627749,
      "basic": {
        "MP": 32.6,
        "FGA": 15.9,
        "FG%": "39.3%",
        "3PA": 5.6,
        "3P%": "29.9%",
        "FTA": 4.0,
        "FT%": "82.3%",
        "ORB": 0.5,
        "DRB": 5.9,
        "AST": 7.4,
        "STL": 2.0,
        "BLK": 0.4,
        "TOV": 3.4,
        "PF": 2.0,
        "PTS": 17.5
      },
      "advanced": {
        "USG%": "27.3%",
        "TS%": "49.4%",
        "AST%": "34.6%",
        "TRB%": "10.7%",
        "ORB%": "1.8%",
        "DRB%": "20.1%",
        "STL%": "3.0%",
        "BLK%": "1.1%",
        "TOV%": "16.2%"
      }
    },
    {
      "name": "Brandon Ingram",
      "pos": [
        "SF"
      ],
      "ovr": 86,
      "real_ovr": 87,
      "id": 1627742,
      "basic": {
        "MP": 33.1,
        "FGA": 18.5,
        "FG%": "46.5%",
        "3PA": 6.4,
        "3P%": "37.4%",
        "FTA": 3.1,
        "FT%": "85.5%",
        "ORB": 0.9,
        "DRB": 4.6,
        "AST": 5.2,
        "STL": 0.9,
        "BLK": 0.6,
        "TOV": 3.8,
        "PF": 2.5,
        "PTS": 22.2
      },
      "advanced": {
        "USG%": "30.2%",
        "TS%": "56.0%",
        "AST%": "26.8%",
        "TRB%": "9.1%",
        "ORB%": "3.0%",
        "DRB%": "15.5%",
        "STL%": "1.3%",
        "BLK%": "1.8%",
        "TOV%": "16.2%"
      }
    },
    {
      "name": "CJ McCollum",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 83,
      "real_ovr": 85,
      "id": 203468,
      "basic": {
        "MP": 32.7,
        "FGA": 17.9,
        "FG%": "44.4%",
        "3PA": 8.2,
        "3P%": "37.3%",
        "FTA": 3.1,
        "FT%": "71.7%",
        "ORB": 0.8,
        "DRB": 3.0,
        "AST": 4.1,
        "STL": 0.8,
        "BLK": 0.4,
        "TOV": 1.9,
        "PF": 2.2,
        "PTS": 21.1
      },
      "advanced": {
        "USG%": "27.2%",
        "TS%": "55.0%",
        "AST%": "20.6%",
        "TRB%": "6.2%",
        "ORB%": "2.4%",
        "DRB%": "10.3%",
        "STL%": "1.2%",
        "BLK%": "1.3%",
        "TOV%": "9.0%"
      }
    },
    {
      "name": "Trey Murphy III",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 82,
      "real_ovr": 86,
      "id": 1630530,
      "basic": {
        "MP": 35.0,
        "FGA": 15.8,
        "FG%": "45.4%",
        "3PA": 8.3,
        "3P%": "36.1%",
        "FTA": 4.3,
        "FT%": "88.7%",
        "ORB": 0.9,
        "DRB": 4.2,
        "AST": 3.5,
        "STL": 1.1,
        "BLK": 0.7,
        "TOV": 1.9,
        "PF": 2.1,
        "PTS": 21.2
      },
      "advanced": {
        "USG%": "23.7%",
        "TS%": "59.8%",
        "AST%": "15.9%",
        "TRB%": "7.8%",
        "ORB%": "2.7%",
        "DRB%": "13.2%",
        "STL%": "1.5%",
        "BLK%": "2.0%",
        "TOV%": "9.9%"
      }
    },
    {
      "name": "Herbert Jones",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 81,
      "real_ovr": 79,
      "id": 1630529,
      "basic": {
        "MP": 32.4,
        "FGA": 8.6,
        "FG%": "43.6%",
        "3PA": 3.6,
        "3P%": "30.6%",
        "FTA": 2.0,
        "FT%": "82.5%",
        "ORB": 1.1,
        "DRB": 2.8,
        "AST": 3.3,
        "STL": 1.9,
        "BLK": 0.5,
        "TOV": 1.8,
        "PF": 3.3,
        "PTS": 10.3
      },
      "advanced": {
        "USG%": "14.6%",
        "TS%": "54.1%",
        "AST%": "13.8%",
        "TRB%": "6.5%",
        "ORB%": "3.6%",
        "DRB%": "9.6%",
        "STL%": "2.8%",
        "BLK%": "1.3%",
        "TOV%": "15.6%"
      }
    },
    {
      "name": "Jose Alvarado",
      "pos": [
        "PG"
      ],
      "ovr": 78,
      "real_ovr": 79,
      "id": 1630631,
      "basic": {
        "MP": 24.4,
        "FGA": 9.3,
        "FG%": "39.2%",
        "3PA": 5.5,
        "3P%": "35.9%",
        "FTA": 1.3,
        "FT%": "81.1%",
        "ORB": 0.5,
        "DRB": 1.9,
        "AST": 4.6,
        "STL": 1.3,
        "BLK": 0.3,
        "TOV": 1.5,
        "PF": 1.6,
        "PTS": 10.3
      },
      "advanced": {
        "USG%": "19.8%",
        "TS%": "52.3%",
        "AST%": "27.3%",
        "TRB%": "5.4%",
        "ORB%": "2.1%",
        "DRB%": "8.9%",
        "STL%": "2.6%",
        "BLK%": "1.0%",
        "TOV%": "13.4%"
      }
    },
    {
      "name": "Jordan Hawkins",
      "pos": [
        "SG"
      ],
      "ovr": 77,
      "real_ovr": 77,
      "id": 1641722,
      "basic": {
        "MP": 23.6,
        "FGA": 9.9,
        "FG%": "37.2%",
        "3PA": 5.9,
        "3P%": "33.1%",
        "FTA": 1.8,
        "FT%": "81.6%",
        "ORB": 0.4,
        "DRB": 2.4,
        "AST": 1.2,
        "STL": 0.5,
        "BLK": 0.4,
        "TOV": 1.0,
        "PF": 0.9,
        "PTS": 10.8
      },
      "advanced": {
        "USG%": "21.0%",
        "TS%": "50.4%",
        "AST%": "7.3%",
        "TRB%": "6.5%",
        "ORB%": "2.0%",
        "DRB%": "11.2%",
        "STL%": "1.1%",
        "BLK%": "1.7%",
        "TOV%": "8.8%"
      }
    },
    {
      "name": "Daniel Theis",
      "pos": [
        "C"
      ],
      "ovr": 76,
      "real_ovr": 75,
      "id": 1628464,
      "basic": {
        "MP": 16.3,
        "FGA": 3.4,
        "FG%": "47.3%",
        "3PA": 1.0,
        "3P%": "24.3%",
        "FTA": 1.0,
        "FT%": "83.8%",
        "ORB": 1.2,
        "DRB": 3.2,
        "AST": 1.6,
        "STL": 0.5,
        "BLK": 0.5,
        "TOV": 0.7,
        "PF": 1.8,
        "PTS": 4.3
      },
      "advanced": {
        "USG%": "11.6%",
        "TS%": "55.8%",
        "AST%": "13.0%",
        "TRB%": "14.2%",
        "ORB%": "7.4%",
        "DRB%": "21.5%",
        "STL%": "1.4%",
        "BLK%": "3.1%",
        "TOV%": "14.7%"
      }
    },
    {
      "name": "Jeremiah Robinson-Earl",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1630526,
      "basic": {
        "MP": 18.8,
        "FGA": 5.3,
        "FG%": "45.5%",
        "3PA": 2.5,
        "3P%": "34.1%",
        "FTA": 0.8,
        "FT%": "83.6%",
        "ORB": 1.7,
        "DRB": 3.1,
        "AST": 1.3,
        "STL": 0.6,
        "BLK": 0.1,
        "TOV": 0.8,
        "PF": 1.2,
        "PTS": 6.3
      },
      "advanced": {
        "USG%": "14.4%",
        "TS%": "56.3%",
        "AST%": "9.9%",
        "TRB%": "13.7%",
        "ORB%": "9.3%",
        "DRB%": "18.4%",
        "STL%": "1.5%",
        "BLK%": "0.5%",
        "TOV%": "12.1%"
      }
    },
    {
      "name": "Yves Missi",
      "pos": [
        "C"
      ],
      "ovr": 75,
      "real_ovr": 79,
      "id": 1642274,
      "basic": {
        "MP": 26.8,
        "FGA": 6.7,
        "FG%": "54.7%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 2.8,
        "FT%": "62.3%",
        "ORB": 3.5,
        "DRB": 4.7,
        "AST": 1.4,
        "STL": 0.5,
        "BLK": 1.3,
        "TOV": 1.1,
        "PF": 2.0,
        "PTS": 9.1
      },
      "advanced": {
        "USG%": "14.3%",
        "TS%": "57.2%",
        "AST%": "7.2%",
        "TRB%": "16.6%",
        "ORB%": "13.7%",
        "DRB%": "19.7%",
        "STL%": "0.9%",
        "BLK%": "4.8%",
        "TOV%": "12.4%"
      }
    },
    {
      "name": "Javonte Green",
      "pos": [
        "SF"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1629750,
      "basic": {
        "MP": 18.5,
        "FGA": 4.2,
        "FG%": "42.9%",
        "3PA": 2.1,
        "3P%": "32.6%",
        "FTA": 1.1,
        "FT%": "72.4%",
        "ORB": 0.9,
        "DRB": 2.3,
        "AST": 0.8,
        "STL": 1.0,
        "BLK": 0.5,
        "TOV": 0.5,
        "PF": 1.4,
        "PTS": 5.1
      },
      "advanced": {
        "USG%": "11.8%",
        "TS%": "54.1%",
        "AST%": "5.9%",
        "TRB%": "9.4%",
        "ORB%": "5.0%",
        "DRB%": "13.9%",
        "STL%": "2.5%",
        "BLK%": "2.4%",
        "TOV%": "9.1%"
      }
    },
    {
      "name": "Antonio Reeves",
      "pos": [
        "SG"
      ],
      "ovr": 73,
      "real_ovr": 75,
      "id": 1641810,
      "basic": {
        "MP": 15.0,
        "FGA": 5.6,
        "FG%": "45.6%",
        "3PA": 2.9,
        "3P%": "39.5%",
        "FTA": 0.8,
        "FT%": "80.0%",
        "ORB": 0.4,
        "DRB": 1.0,
        "AST": 0.9,
        "STL": 0.5,
        "BLK": 0.1,
        "TOV": 0.7,
        "PF": 0.9,
        "PTS": 6.9
      },
      "advanced": {
        "USG%": "18.8%",
        "TS%": "57.9%",
        "AST%": "8.8%",
        "TRB%": "5.1%",
        "ORB%": "2.9%",
        "DRB%": "7.6%",
        "STL%": "1.5%",
        "BLK%": "0.6%",
        "TOV%": "10.2%"
      }
    },
    {
      "name": "Jamal Cain",
      "pos": [
        "SF"
      ],
      "ovr": 73,
      "real_ovr": 74,
      "id": 1631288,
      "basic": {
        "MP": 13.6,
        "FGA": 4.3,
        "FG%": "43.0%",
        "3PA": 2.2,
        "3P%": "32.5%",
        "FTA": 1.4,
        "FT%": "68.0%",
        "ORB": 0.7,
        "DRB": 1.6,
        "AST": 0.6,
        "STL": 0.6,
        "BLK": 0.2,
        "TOV": 0.6,
        "PF": 1.2,
        "PTS": 5.3
      },
      "advanced": {
        "USG%": "17.0%",
        "TS%": "54.4%",
        "AST%": "6.2%",
        "TRB%": "9.1%",
        "ORB%": "5.6%",
        "DRB%": "12.8%",
        "STL%": "2.2%",
        "BLK%": "1.7%",
        "TOV%": "10.9%"
      }
    },
    {
      "name": "Brandon Boston Jr.",
      "pos": [
        "SG"
      ],
      "ovr": 73,
      "real_ovr": 78,
      "id": 1630527,
      "basic": {
        "MP": 23.6,
        "FGA": 9.1,
        "FG%": "43.6%",
        "3PA": 3.3,
        "3P%": "35.0%",
        "FTA": 2.0,
        "FT%": "78.8%",
        "ORB": 0.7,
        "DRB": 2.5,
        "AST": 2.2,
        "STL": 1.3,
        "BLK": 0.2,
        "TOV": 1.2,
        "PF": 1.7,
        "PTS": 10.7
      },
      "advanced": {
        "USG%": "20.0%",
        "TS%": "53.5%",
        "AST%": "13.7%",
        "TRB%": "7.3%",
        "ORB%": "3.0%",
        "DRB%": "11.9%",
        "STL%": "2.6%",
        "BLK%": "0.9%",
        "TOV%": "11.1%"
      }
    }
  ]
,
  "NYK": [
    {
      "name": "Jalen Brunson",
      "pos": [
        "PG"
      ],
      "ovr": 93,
      "real_ovr": 90,
      "id": 1628973,
      "basic": {
        "MP": 35.4,
        "FGA": 18.5,
        "FG%": "48.8%",
        "3PA": 6.1,
        "3P%": "38.3%",
        "FTA": 6.9,
        "FT%": "82.1%",
        "ORB": 0.4,
        "DRB": 2.5,
        "AST": 7.3,
        "STL": 0.9,
        "BLK": 0.1,
        "TOV": 2.5,
        "PF": 2.1,
        "PTS": 26.0
      },
      "advanced": {
        "USG%": "29.5%",
        "TS%": "60.5%",
        "AST%": "32.3%",
        "TRB%": "4.7%",
        "ORB%": "1.4%",
        "DRB%": "7.9%",
        "STL%": "1.3%",
        "BLK%": "0.3%",
        "TOV%": "10.5%"
      }
    },
    {
      "name": "Karl-Anthony Towns",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 92,
      "real_ovr": 90,
      "id": 1626157,
      "basic": {
        "MP": 35.0,
        "FGA": 16.9,
        "FG%": "52.6%",
        "3PA": 4.7,
        "3P%": "42.0%",
        "FTA": 5.7,
        "FT%": "82.9%",
        "ORB": 2.9,
        "DRB": 9.8,
        "AST": 3.1,
        "STL": 1.0,
        "BLK": 0.7,
        "TOV": 2.7,
        "PF": 3.5,
        "PTS": 24.4
      },
      "advanced": {
        "USG%": "27.4%",
        "TS%": "63.0%",
        "AST%": "13.8%",
        "TRB%": "21.0%",
        "ORB%": "9.8%",
        "DRB%": "32.0%",
        "STL%": "1.4%",
        "BLK%": "1.9%",
        "TOV%": "12.1%"
      }
    },
    {
      "name": "OG Anunoby",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 87,
      "real_ovr": 84,
      "id": 1628384,
      "basic": {
        "MP": 36.6,
        "FGA": 13.9,
        "FG%": "47.6%",
        "3PA": 6.2,
        "3P%": "37.2%",
        "FTA": 3.1,
        "FT%": "81.0%",
        "ORB": 1.3,
        "DRB": 3.5,
        "AST": 2.2,
        "STL": 1.5,
        "BLK": 0.9,
        "TOV": 1.4,
        "PF": 2.3,
        "PTS": 18.0
      },
      "advanced": {
        "USG%": "19.7%",
        "TS%": "59.1%",
        "AST%": "8.5%",
        "TRB%": "7.6%",
        "ORB%": "4.2%",
        "DRB%": "11.0%",
        "STL%": "2.0%",
        "BLK%": "2.2%",
        "TOV%": "8.3%"
      }
    },
    {
      "name": "Mikal Bridges",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 85,
      "real_ovr": 84,
      "id": 1628969,
      "basic": {
        "MP": 37.0,
        "FGA": 14.4,
        "FG%": "50.0%",
        "3PA": 5.6,
        "3P%": "35.4%",
        "FTA": 1.4,
        "FT%": "81.4%",
        "ORB": 0.9,
        "DRB": 2.3,
        "AST": 3.7,
        "STL": 0.9,
        "BLK": 0.5,
        "TOV": 1.6,
        "PF": 1.5,
        "PTS": 17.6
      },
      "advanced": {
        "USG%": "19.6%",
        "TS%": "58.5%",
        "AST%": "14.4%",
        "TRB%": "4.9%",
        "ORB%": "2.7%",
        "DRB%": "7.0%",
        "STL%": "1.2%",
        "BLK%": "1.3%",
        "TOV%": "9.7%"
      }
    },
    {
      "name": "Josh Hart",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 83,
      "real_ovr": 84,
      "id": 1628404,
      "basic": {
        "MP": 37.6,
        "FGA": 10.0,
        "FG%": "52.5%",
        "3PA": 3.3,
        "3P%": "33.3%",
        "FTA": 2.7,
        "FT%": "77.6%",
        "ORB": 2.1,
        "DRB": 7.5,
        "AST": 5.9,
        "STL": 1.5,
        "BLK": 0.4,
        "TOV": 2.1,
        "PF": 2.6,
        "PTS": 13.6
      },
      "advanced": {
        "USG%": "15.3%",
        "TS%": "61.1%",
        "AST%": "20.7%",
        "TRB%": "14.6%",
        "ORB%": "6.4%",
        "DRB%": "22.6%",
        "STL%": "2.0%",
        "BLK%": "0.9%",
        "TOV%": "15.5%"
      }
    },
    {
      "name": "Mitchell Robinson",
      "pos": [
        "C"
      ],
      "ovr": 80,
      "real_ovr": 78,
      "id": 1629011,
      "basic": {
        "MP": 17.1,
        "FGA": 3.3,
        "FG%": "66.1%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 1.1,
        "FT%": "68.4%",
        "ORB": 3.1,
        "DRB": 2.9,
        "AST": 0.8,
        "STL": 0.9,
        "BLK": 1.1,
        "TOV": 0.6,
        "PF": 1.5,
        "PTS": 5.1
      },
      "advanced": {
        "USG%": "11.1%",
        "TS%": "67.6%",
        "AST%": "5.9%",
        "TRB%": "20.0%",
        "ORB%": "20.8%",
        "DRB%": "19.2%",
        "STL%": "2.7%",
        "BLK%": "5.8%",
        "TOV%": "13.4%"
      }
    },
    {
      "name": "Miles McBride",
      "pos": [
        "PG"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1630540,
      "basic": {
        "MP": 24.9,
        "FGA": 8.5,
        "FG%": "40.6%",
        "3PA": 4.9,
        "3P%": "36.9%",
        "FTA": 1.0,
        "FT%": "81.3%",
        "ORB": 0.7,
        "DRB": 1.8,
        "AST": 2.9,
        "STL": 1.0,
        "BLK": 0.3,
        "TOV": 0.6,
        "PF": 1.7,
        "PTS": 9.5
      },
      "advanced": {
        "USG%": "16.8%",
        "TS%": "53.1%",
        "AST%": "15.6%",
        "TRB%": "5.8%",
        "ORB%": "3.4%",
        "DRB%": "8.1%",
        "STL%": "2.1%",
        "BLK%": "1.0%",
        "TOV%": "6.7%"
      }
    },
    {
      "name": "Precious Achiuwa",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 78,
      "real_ovr": 77,
      "id": 1630173,
      "basic": {
        "MP": 20.5,
        "FGA": 5.7,
        "FG%": "50.2%",
        "3PA": 0.6,
        "3P%": "27.8%",
        "FTA": 1.2,
        "FT%": "59.4%",
        "ORB": 1.8,
        "DRB": 3.8,
        "AST": 1.0,
        "STL": 0.8,
        "BLK": 0.7,
        "TOV": 0.8,
        "PF": 1.4,
        "PTS": 6.6
      },
      "advanced": {
        "USG%": "14.9%",
        "TS%": "53.0%",
        "AST%": "6.2%",
        "TRB%": "15.5%",
        "ORB%": "10.0%",
        "DRB%": "21.0%",
        "STL%": "2.0%",
        "BLK%": "3.3%",
        "TOV%": "11.2%"
      }
    },
    {
      "name": "Cameron Payne",
      "pos": [
        "PG"
      ],
      "ovr": 76,
      "real_ovr": 77,
      "id": 1626166,
      "basic": {
        "MP": 15.1,
        "FGA": 6.2,
        "FG%": "40.1%",
        "3PA": 3.6,
        "3P%": "36.3%",
        "FTA": 0.8,
        "FT%": "90.7%",
        "ORB": 0.2,
        "DRB": 1.3,
        "AST": 2.8,
        "STL": 0.5,
        "BLK": 0.2,
        "TOV": 0.7,
        "PF": 1.5,
        "PTS": 6.9
      },
      "advanced": {
        "USG%": "20.8%",
        "TS%": "53.2%",
        "AST%": "25.5%",
        "TRB%": "5.5%",
        "ORB%": "1.5%",
        "DRB%": "9.4%",
        "STL%": "1.8%",
        "BLK%": "1.4%",
        "TOV%": "10.0%"
      }
    },
    {
      "name": "Landry Shamet",
      "pos": [
        "SG"
      ],
      "ovr": 76,
      "real_ovr": 74,
      "id": 1629013,
      "basic": {
        "MP": 15.2,
        "FGA": 4.6,
        "FG%": "46.1%",
        "3PA": 3.1,
        "3P%": "39.7%",
        "FTA": 0.4,
        "FT%": "66.7%",
        "ORB": 0.2,
        "DRB": 1.0,
        "AST": 0.5,
        "STL": 0.5,
        "BLK": 0.0,
        "TOV": 0.4,
        "PF": 1.0,
        "PTS": 5.7
      },
      "advanced": {
        "USG%": "14.8%",
        "TS%": "60.1%",
        "AST%": "4.7%",
        "TRB%": "4.6%",
        "ORB%": "1.7%",
        "DRB%": "7.5%",
        "STL%": "1.5%",
        "BLK%": "0.2%",
        "TOV%": "8.5%"
      }
    },
    {
      "name": "Jericho Sims",
      "pos": [
        "C"
      ],
      "ovr": 75,
      "real_ovr": 74,
      "id": 1630579,
      "basic": {
        "MP": 11.9,
        "FGA": 1.3,
        "FG%": "63.4%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 0.2,
        "FT%": "61.5%",
        "ORB": 1.3,
        "DRB": 2.4,
        "AST": 0.6,
        "STL": 0.2,
        "BLK": 0.4,
        "TOV": 0.6,
        "PF": 1.2,
        "PTS": 1.8
      },
      "advanced": {
        "USG%": "7.6%",
        "TS%": "63.9%",
        "AST%": "6.4%",
        "TRB%": "17.6%",
        "ORB%": "12.9%",
        "DRB%": "22.0%",
        "STL%": "0.8%",
        "BLK%": "2.8%",
        "TOV%": "30.1%"
      }
    },
    {
      "name": "Tyler Kolek",
      "pos": [
        "PG"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1642278,
      "basic": {
        "MP": 7.2,
        "FGA": 2.0,
        "FG%": "32.9%",
        "3PA": 1.1,
        "3P%": "29.8%",
        "FTA": 0.4,
        "FT%": "76.5%",
        "ORB": 0.2,
        "DRB": 0.5,
        "AST": 1.7,
        "STL": 0.3,
        "BLK": 0.1,
        "TOV": 0.4,
        "PF": 0.6,
        "PTS": 2.0
      },
      "advanced": {
        "USG%": "15.8%",
        "TS%": "45.3%",
        "AST%": "29.5%",
        "TRB%": "5.2%",
        "ORB%": "3.1%",
        "DRB%": "7.3%",
        "STL%": "2.0%",
        "BLK%": "1.3%",
        "TOV%": "16.7%"
      }
    },
    {
      "name": "Pacôme Dadiet",
      "pos": [
        "SF"
      ],
      "ovr": 73,
      "real_ovr": 72,
      "id": 1642359,
      "basic": {
        "MP": 6.2,
        "FGA": 1.7,
        "FG%": "32.3%",
        "3PA": 1.1,
        "3P%": "31.6%",
        "FTA": 0.3,
        "FT%": "66.7%",
        "ORB": 0.2,
        "DRB": 0.8,
        "AST": 0.3,
        "STL": 0.2,
        "BLK": 0.1,
        "TOV": 0.2,
        "PF": 0.4,
        "PTS": 1.7
      },
      "advanced": {
        "USG%": "14.7%",
        "TS%": "44.6%",
        "AST%": "5.6%",
        "TRB%": "9.3%",
        "ORB%": "3.1%",
        "DRB%": "15.4%",
        "STL%": "1.3%",
        "BLK%": "1.7%",
        "TOV%": "10.6%"
      }
    },
    {
      "name": "Ariel Hukporti",
      "pos": [
        "C"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1630574,
      "basic": {
        "MP": 8.7,
        "FGA": 1.2,
        "FG%": "67.7%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 0.5,
        "FT%": "46.2%",
        "ORB": 0.6,
        "DRB": 1.5,
        "AST": 0.4,
        "STL": 0.0,
        "BLK": 0.6,
        "TOV": 0.8,
        "PF": 1.3,
        "PTS": 1.9
      },
      "advanced": {
        "USG%": "11.6%",
        "TS%": "65.4%",
        "AST%": "6.4%",
        "TRB%": "13.5%",
        "ORB%": "7.5%",
        "DRB%": "19.4%",
        "STL%": "0.2%",
        "BLK%": "6.4%",
        "TOV%": "36.4%"
      }
    },
    {
      "name": "Jacob Toppin",
      "pos": [
        "PF"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 1631210,
      "basic": {
        "MP": 4.5,
        "FGA": 1.3,
        "FG%": "40.9%",
        "3PA": 0.6,
        "3P%": "50.0%",
        "FTA": 0.0,
        "FT%": "0.0%",
        "ORB": 0.2,
        "DRB": 0.7,
        "AST": 0.4,
        "STL": 0.1,
        "BLK": 0.0,
        "TOV": 0.2,
        "PF": 0.2,
        "PTS": 1.4
      },
      "advanced": {
        "USG%": "13.9%",
        "TS%": "52.3%",
        "AST%": "10.2%",
        "TRB%": "11.2%",
        "ORB%": "4.5%",
        "DRB%": "17.9%",
        "STL%": "1.3%",
        "BLK%": "0.0%",
        "TOV%": "12.0%"
      }
    }
  ]
,
  "OKC": [
    {
      "name": "Shai Gilgeous-Alexander",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 97,
      "real_ovr": 97,
      "id": 1628983,
      "basic": {
        "MP": 34.2,
        "FGA": 21.8,
        "FG%": "51.9%",
        "3PA": 5.7,
        "3P%": "37.5%",
        "FTA": 8.8,
        "FT%": "89.8%",
        "ORB": 0.9,
        "DRB": 4.1,
        "AST": 6.4,
        "STL": 1.7,
        "BLK": 1.0,
        "TOV": 2.4,
        "PF": 2.2,
        "PTS": 32.7
      },
      "advanced": {
        "USG%": "34.8%",
        "TS%": "63.7%",
        "AST%": "31.3%",
        "TRB%": "7.8%",
        "ORB%": "2.8%",
        "DRB%": "12.6%",
        "STL%": "2.4%",
        "BLK%": "3.0%",
        "TOV%": "8.6%"
      }
    },
    {
      "name": "Jalen Williams",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 90,
      "real_ovr": 88,
      "id": 1631114,
      "basic": {
        "MP": 32.4,
        "FGA": 16.9,
        "FG%": "48.4%",
        "3PA": 4.9,
        "3P%": "36.5%",
        "FTA": 4.3,
        "FT%": "78.9%",
        "ORB": 0.9,
        "DRB": 4.5,
        "AST": 5.1,
        "STL": 1.6,
        "BLK": 0.7,
        "TOV": 2.2,
        "PF": 2.3,
        "PTS": 21.6
      },
      "advanced": {
        "USG%": "27.5%",
        "TS%": "57.3%",
        "AST%": "23.4%",
        "TRB%": "8.8%",
        "ORB%": "2.9%",
        "DRB%": "14.6%",
        "STL%": "2.4%",
        "BLK%": "2.1%",
        "TOV%": "10.3%"
      }
    },
    {
      "name": "Chet Holmgren",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 88,
      "real_ovr": 84,
      "id": 1631096,
      "basic": {
        "MP": 27.4,
        "FGA": 10.7,
        "FG%": "49.0%",
        "3PA": 3.6,
        "3P%": "37.9%",
        "FTA": 4.2,
        "FT%": "75.4%",
        "ORB": 1.5,
        "DRB": 6.5,
        "AST": 2.0,
        "STL": 0.7,
        "BLK": 2.2,
        "TOV": 1.8,
        "PF": 2.3,
        "PTS": 15.0
      },
      "advanced": {
        "USG%": "22.0%",
        "TS%": "59.9%",
        "AST%": "9.7%",
        "TRB%": "15.7%",
        "ORB%": "6.0%",
        "DRB%": "25.0%",
        "STL%": "1.3%",
        "BLK%": "8.2%",
        "TOV%": "12.3%"
      }
    },
    {
      "name": "Isaiah Hartenstein",
      "pos": [
        "C"
      ],
      "ovr": 83,
      "real_ovr": 83,
      "id": 1628392,
      "basic": {
        "MP": 27.9,
        "FGA": 8.4,
        "FG%": "58.1%",
        "3PA": 0.3,
        "3P%": "0.0%",
        "FTA": 2.1,
        "FT%": "67.5%",
        "ORB": 2.9,
        "DRB": 7.9,
        "AST": 3.8,
        "STL": 0.8,
        "BLK": 1.1,
        "TOV": 1.7,
        "PF": 3.0,
        "PTS": 11.2
      },
      "advanced": {
        "USG%": "16.7%",
        "TS%": "59.9%",
        "AST%": "18.3%",
        "TRB%": "20.6%",
        "ORB%": "11.2%",
        "DRB%": "29.6%",
        "STL%": "1.4%",
        "BLK%": "3.9%",
        "TOV%": "15.3%"
      }
    },
    {
      "name": "Alex Caruso",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 82,
      "real_ovr": 79,
      "id": 1627936,
      "basic": {
        "MP": 19.3,
        "FGA": 5.8,
        "FG%": "44.6%",
        "3PA": 3.1,
        "3P%": "35.3%",
        "FTA": 0.9,
        "FT%": "82.4%",
        "ORB": 0.7,
        "DRB": 2.2,
        "AST": 2.5,
        "STL": 1.6,
        "BLK": 0.6,
        "TOV": 0.7,
        "PF": 1.9,
        "PTS": 7.1
      },
      "advanced": {
        "USG%": "15.2%",
        "TS%": "56.8%",
        "AST%": "16.6%",
        "TRB%": "8.2%",
        "ORB%": "4.0%",
        "DRB%": "12.2%",
        "STL%": "4.0%",
        "BLK%": "2.9%",
        "TOV%": "9.9%"
      }
    },
    {
      "name": "Luguentz Dort",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 82,
      "real_ovr": 79,
      "id": 1629652,
      "basic": {
        "MP": 29.2,
        "FGA": 8.4,
        "FG%": "43.5%",
        "3PA": 5.8,
        "3P%": "41.2%",
        "FTA": 0.6,
        "FT%": "71.7%",
        "ORB": 1.3,
        "DRB": 2.9,
        "AST": 1.6,
        "STL": 1.1,
        "BLK": 0.5,
        "TOV": 0.7,
        "PF": 2.9,
        "PTS": 10.1
      },
      "advanced": {
        "USG%": "13.6%",
        "TS%": "58.6%",
        "AST%": "6.9%",
        "TRB%": "7.6%",
        "ORB%": "4.7%",
        "DRB%": "10.3%",
        "STL%": "1.8%",
        "BLK%": "1.9%",
        "TOV%": "7.7%"
      }
    },
    {
      "name": "Cason Wallace",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 80,
      "real_ovr": 79,
      "id": 1641717,
      "basic": {
        "MP": 27.6,
        "FGA": 7.2,
        "FG%": "47.4%",
        "3PA": 3.1,
        "3P%": "35.6%",
        "FTA": 0.5,
        "FT%": "81.1%",
        "ORB": 1.0,
        "DRB": 2.3,
        "AST": 2.5,
        "STL": 1.8,
        "BLK": 0.5,
        "TOV": 0.9,
        "PF": 2.1,
        "PTS": 8.4
      },
      "advanced": {
        "USG%": "12.8%",
        "TS%": "56.2%",
        "AST%": "11.5%",
        "TRB%": "6.5%",
        "ORB%": "4.1%",
        "DRB%": "8.8%",
        "STL%": "3.1%",
        "BLK%": "1.9%",
        "TOV%": "10.5%"
      }
    },
    {
      "name": "Isaiah Joe",
      "pos": [
        "SG"
      ],
      "ovr": 79,
      "real_ovr": 78,
      "id": 1630198,
      "basic": {
        "MP": 21.7,
        "FGA": 7.9,
        "FG%": "44.0%",
        "3PA": 6.3,
        "3P%": "41.2%",
        "FTA": 0.8,
        "FT%": "82.1%",
        "ORB": 0.6,
        "DRB": 2.1,
        "AST": 1.6,
        "STL": 0.6,
        "BLK": 0.1,
        "TOV": 0.5,
        "PF": 1.5,
        "PTS": 10.2
      },
      "advanced": {
        "USG%": "17.2%",
        "TS%": "61.7%",
        "AST%": "9.7%",
        "TRB%": "6.6%",
        "ORB%": "2.8%",
        "DRB%": "10.1%",
        "STL%": "1.4%",
        "BLK%": "0.6%",
        "TOV%": "5.8%"
      }
    },
    {
      "name": "Aaron Wiggins",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 79,
      "real_ovr": 80,
      "id": 1630598,
      "basic": {
        "MP": 22.9,
        "FGA": 9.6,
        "FG%": "48.8%",
        "3PA": 4.5,
        "3P%": "38.3%",
        "FTA": 1.2,
        "FT%": "83.1%",
        "ORB": 1.1,
        "DRB": 2.8,
        "AST": 1.8,
        "STL": 0.8,
        "BLK": 0.2,
        "TOV": 0.9,
        "PF": 1.3,
        "PTS": 12.0
      },
      "advanced": {
        "USG%": "20.3%",
        "TS%": "59.6%",
        "AST%": "10.6%",
        "TRB%": "9.1%",
        "ORB%": "5.1%",
        "DRB%": "12.9%",
        "STL%": "1.7%",
        "BLK%": "1.0%",
        "TOV%": "8.3%"
      }
    },
    {
      "name": "Kenrich Williams",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 77,
      "real_ovr": 77,
      "id": 1629026,
      "basic": {
        "MP": 16.4,
        "FGA": 5.1,
        "FG%": "48.3%",
        "3PA": 2.5,
        "3P%": "38.6%",
        "FTA": 0.6,
        "FT%": "71.8%",
        "ORB": 0.9,
        "DRB": 2.6,
        "AST": 1.4,
        "STL": 0.6,
        "BLK": 0.1,
        "TOV": 0.6,
        "PF": 1.6,
        "PTS": 6.3
      },
      "advanced": {
        "USG%": "15.4%",
        "TS%": "58.7%",
        "AST%": "11.0%",
        "TRB%": "11.4%",
        "ORB%": "6.3%",
        "DRB%": "16.3%",
        "STL%": "1.8%",
        "BLK%": "0.9%",
        "TOV%": "9.5%"
      }
    },
    {
      "name": "Jaylin Williams",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 76,
      "real_ovr": 79,
      "id": 1631119,
      "basic": {
        "MP": 16.7,
        "FGA": 4.7,
        "FG%": "43.9%",
        "3PA": 3.3,
        "3P%": "39.9%",
        "FTA": 0.6,
        "FT%": "76.7%",
        "ORB": 1.0,
        "DRB": 4.6,
        "AST": 2.6,
        "STL": 0.5,
        "BLK": 0.6,
        "TOV": 0.7,
        "PF": 1.7,
        "PTS": 5.9
      },
      "advanced": {
        "USG%": "14.6%",
        "TS%": "59.4%",
        "AST%": "19.0%",
        "TRB%": "17.9%",
        "ORB%": "6.7%",
        "DRB%": "28.7%",
        "STL%": "1.3%",
        "BLK%": "3.7%",
        "TOV%": "13.0%"
      }
    },
    {
      "name": "Ousmane Dieng",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1631172,
      "basic": {
        "MP": 10.9,
        "FGA": 3.4,
        "FG%": "43.2%",
        "3PA": 1.9,
        "3P%": "32.4%",
        "FTA": 0.4,
        "FT%": "68.8%",
        "ORB": 0.5,
        "DRB": 1.7,
        "AST": 0.8,
        "STL": 0.5,
        "BLK": 0.2,
        "TOV": 0.5,
        "PF": 0.9,
        "PTS": 3.8
      },
      "advanced": {
        "USG%": "15.7%",
        "TS%": "53.8%",
        "AST%": "9.6%",
        "TRB%": "10.7%",
        "ORB%": "4.9%",
        "DRB%": "16.3%",
        "STL%": "2.0%",
        "BLK%": "1.7%",
        "TOV%": "12.0%"
      }
    },
    {
      "name": "Dillon Jones",
      "pos": [
        "SF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1641794,
      "basic": {
        "MP": 10.2,
        "FGA": 2.5,
        "FG%": "38.3%",
        "3PA": 1.2,
        "3P%": "25.4%",
        "FTA": 0.5,
        "FT%": "60.7%",
        "ORB": 0.6,
        "DRB": 1.7,
        "AST": 1.1,
        "STL": 0.3,
        "BLK": 0.1,
        "TOV": 0.5,
        "PF": 1.0,
        "PTS": 2.5
      },
      "advanced": {
        "USG%": "13.3%",
        "TS%": "46.4%",
        "AST%": "12.6%",
        "TRB%": "11.8%",
        "ORB%": "6.0%",
        "DRB%": "17.3%",
        "STL%": "1.4%",
        "BLK%": "0.7%",
        "TOV%": "16.2%"
      }
    },
    {
      "name": "Ajay Mitchell",
      "pos": [
        "PG"
      ],
      "ovr": 74,
      "real_ovr": 76,
      "id": 1642349,
      "basic": {
        "MP": 16.6,
        "FGA": 5.1,
        "FG%": "49.5%",
        "3PA": 1.7,
        "3P%": "38.3%",
        "FTA": 1.0,
        "FT%": "82.9%",
        "ORB": 0.5,
        "DRB": 1.4,
        "AST": 1.8,
        "STL": 0.7,
        "BLK": 0.1,
        "TOV": 0.8,
        "PF": 1.9,
        "PTS": 6.5
      },
      "advanced": {
        "USG%": "16.2%",
        "TS%": "58.7%",
        "AST%": "13.8%",
        "TRB%": "6.1%",
        "ORB%": "3.3%",
        "DRB%": "8.8%",
        "STL%": "2.0%",
        "BLK%": "0.7%",
        "TOV%": "12.7%"
      }
    },
    {
      "name": "Nikola Topić",
      "pos": [
        "PG"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1642260,
      "note": "Injured / Inactive (0 GP)",
      "basic": {
        "MP": 0.0,
        "FGA": 0.0,
        "FG%": "0.0%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 0.0,
        "FT%": "0.0%",
        "ORB": 0.0,
        "DRB": 0.0,
        "AST": 0.0,
        "STL": 0.0,
        "BLK": 0.0,
        "TOV": 0.0,
        "PF": 0.0,
        "PTS": 0.0
      },
      "advanced": {
        "USG%": "0.0%",
        "TS%": "0.0%",
        "AST%": "0.0%",
        "TRB%": "0.0%",
        "ORB%": "0.0%",
        "DRB%": "0.0%",
        "STL%": "0.0%",
        "BLK%": "0.0%",
        "TOV%": "0.0%"
      }
    }
  ]
,
  "ORL": [
    {
      "name": "Paolo Banchero",
      "pos": [
        "PF"
      ],
      "ovr": 89,
      "real_ovr": 91,
      "id": 1631094,
      "basic": {
        "MP": 34.4,
        "FGA": 19.8,
        "FG%": "45.2%",
        "3PA": 5.9,
        "3P%": "32.0%",
        "FTA": 8.4,
        "FT%": "72.7%",
        "ORB": 1.1,
        "DRB": 6.4,
        "AST": 4.8,
        "STL": 0.8,
        "BLK": 0.6,
        "TOV": 3.0,
        "PF": 2.1,
        "PTS": 25.9
      },
      "advanced": {
        "USG%": "33.6%",
        "TS%": "55.1%",
        "AST%": "26.0%",
        "TRB%": "12.5%",
        "ORB%": "3.5%",
        "DRB%": "22.4%",
        "STL%": "1.1%",
        "BLK%": "1.7%",
        "TOV%": "11.2%"
      }
    },
    {
      "name": "Franz Wagner",
      "pos": [
        "SF"
      ],
      "ovr": 86,
      "real_ovr": 89,
      "id": 1630532,
      "basic": {
        "MP": 33.7,
        "FGA": 19.4,
        "FG%": "46.3%",
        "3PA": 5.9,
        "3P%": "29.5%",
        "FTA": 5.2,
        "FT%": "87.1%",
        "ORB": 0.9,
        "DRB": 4.8,
        "AST": 4.7,
        "STL": 1.3,
        "BLK": 0.4,
        "TOV": 2.3,
        "PF": 2.5,
        "PTS": 24.2
      },
      "advanced": {
        "USG%": "31.0%",
        "TS%": "55.8%",
        "AST%": "26.6%",
        "TRB%": "9.7%",
        "ORB%": "3.0%",
        "DRB%": "17.1%",
        "STL%": "1.9%",
        "BLK%": "1.0%",
        "TOV%": "9.6%"
      }
    },
    {
      "name": "Jalen Suggs",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 83,
      "real_ovr": 84,
      "id": 1630591,
      "basic": {
        "MP": 28.6,
        "FGA": 13.7,
        "FG%": "41.0%",
        "3PA": 6.9,
        "3P%": "31.4%",
        "FTA": 3.1,
        "FT%": "88.2%",
        "ORB": 0.7,
        "DRB": 3.4,
        "AST": 3.7,
        "STL": 1.5,
        "BLK": 0.9,
        "TOV": 2.9,
        "PF": 2.8,
        "PTS": 16.2
      },
      "advanced": {
        "USG%": "27.5%",
        "TS%": "53.6%",
        "AST%": "21.6%",
        "TRB%": "8.1%",
        "ORB%": "2.5%",
        "DRB%": "14.2%",
        "STL%": "2.5%",
        "BLK%": "3.2%",
        "TOV%": "16.2%"
      }
    },
    {
      "name": "Kentavious Caldwell-Pope",
      "pos": [
        "SG"
      ],
      "ovr": 81,
      "real_ovr": 78,
      "id": 203484,
      "basic": {
        "MP": 29.6,
        "FGA": 7.1,
        "FG%": "43.9%",
        "3PA": 4.3,
        "3P%": "34.2%",
        "FTA": 1.2,
        "FT%": "86.3%",
        "ORB": 0.4,
        "DRB": 1.8,
        "AST": 1.8,
        "STL": 1.3,
        "BLK": 0.4,
        "TOV": 0.8,
        "PF": 1.8,
        "PTS": 8.7
      },
      "advanced": {
        "USG%": "12.4%",
        "TS%": "57.4%",
        "AST%": "8.7%",
        "TRB%": "4.3%",
        "ORB%": "1.6%",
        "DRB%": "7.2%",
        "STL%": "2.2%",
        "BLK%": "1.4%",
        "TOV%": "9.6%"
      }
    },
    {
      "name": "Jonathan Isaac",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 80,
      "real_ovr": 78,
      "id": 1628371,
      "basic": {
        "MP": 15.4,
        "FGA": 4.6,
        "FG%": "41.4%",
        "3PA": 2.1,
        "3P%": "25.8%",
        "FTA": 1.5,
        "FT%": "68.2%",
        "ORB": 1.7,
        "DRB": 2.7,
        "AST": 0.6,
        "STL": 0.9,
        "BLK": 1.1,
        "TOV": 0.5,
        "PF": 1.3,
        "PTS": 5.4
      },
      "advanced": {
        "USG%": "16.2%",
        "TS%": "51.2%",
        "AST%": "5.5%",
        "TRB%": "16.5%",
        "ORB%": "12.0%",
        "DRB%": "21.5%",
        "STL%": "2.8%",
        "BLK%": "7.0%",
        "TOV%": "8.2%"
      }
    },
    {
      "name": "Wendell Carter Jr.",
      "pos": [
        "C"
      ],
      "ovr": 80,
      "real_ovr": 79,
      "id": 1628976,
      "basic": {
        "MP": 25.9,
        "FGA": 7.2,
        "FG%": "46.0%",
        "3PA": 2.3,
        "3P%": "23.4%",
        "FTA": 2.6,
        "FT%": "73.7%",
        "ORB": 2.2,
        "DRB": 5.0,
        "AST": 2.0,
        "STL": 0.8,
        "BLK": 0.6,
        "TOV": 1.1,
        "PF": 2.9,
        "PTS": 9.1
      },
      "advanced": {
        "USG%": "16.0%",
        "TS%": "54.4%",
        "AST%": "11.5%",
        "TRB%": "16.0%",
        "ORB%": "9.4%",
        "DRB%": "23.4%",
        "STL%": "1.5%",
        "BLK%": "2.2%",
        "TOV%": "11.9%"
      }
    },
    {
      "name": "Moritz Wagner",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 80,
      "real_ovr": 82,
      "id": 1629021,
      "basic": {
        "MP": 18.8,
        "FGA": 8.3,
        "FG%": "56.2%",
        "3PA": 2.5,
        "3P%": "36.0%",
        "FTA": 3.7,
        "FT%": "71.8%",
        "ORB": 1.3,
        "DRB": 3.6,
        "AST": 1.4,
        "STL": 0.8,
        "BLK": 0.4,
        "TOV": 1.6,
        "PF": 1.8,
        "PTS": 12.9
      },
      "advanced": {
        "USG%": "26.8%",
        "TS%": "64.9%",
        "AST%": "13.7%",
        "TRB%": "15.0%",
        "ORB%": "7.7%",
        "DRB%": "23.1%",
        "STL%": "2.1%",
        "BLK%": "2.0%",
        "TOV%": "14.1%"
      }
    },
    {
      "name": "Cole Anthony",
      "pos": [
        "PG"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1630175,
      "basic": {
        "MP": 18.4,
        "FGA": 8.1,
        "FG%": "42.4%",
        "3PA": 3.3,
        "3P%": "35.3%",
        "FTA": 1.7,
        "FT%": "82.3%",
        "ORB": 0.7,
        "DRB": 2.4,
        "AST": 2.9,
        "STL": 0.7,
        "BLK": 0.5,
        "TOV": 1.5,
        "PF": 2.3,
        "PTS": 9.4
      },
      "advanced": {
        "USG%": "24.6%",
        "TS%": "53.1%",
        "AST%": "25.5%",
        "TRB%": "9.5%",
        "ORB%": "4.1%",
        "DRB%": "15.5%",
        "STL%": "1.8%",
        "BLK%": "2.5%",
        "TOV%": "14.8%"
      }
    },
    {
      "name": "Goga Bitadze",
      "pos": [
        "C"
      ],
      "ovr": 78,
      "real_ovr": 80,
      "id": 1629048,
      "basic": {
        "MP": 20.4,
        "FGA": 4.8,
        "FG%": "61.1%",
        "3PA": 0.4,
        "3P%": "10.7%",
        "FTA": 1.9,
        "FT%": "63.9%",
        "ORB": 2.4,
        "DRB": 4.2,
        "AST": 2.0,
        "STL": 0.7,
        "BLK": 1.4,
        "TOV": 1.0,
        "PF": 2.1,
        "PTS": 7.2
      },
      "advanced": {
        "USG%": "14.3%",
        "TS%": "63.1%",
        "AST%": "14.8%",
        "TRB%": "18.6%",
        "ORB%": "12.7%",
        "DRB%": "25.0%",
        "STL%": "1.7%",
        "BLK%": "6.6%",
        "TOV%": "15.3%"
      }
    },
    {
      "name": "Anthony Black",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 78,
      "real_ovr": 79,
      "id": 1641710,
      "basic": {
        "MP": 24.2,
        "FGA": 7.9,
        "FG%": "42.3%",
        "3PA": 2.5,
        "3P%": "31.8%",
        "FTA": 2.5,
        "FT%": "76.1%",
        "ORB": 0.7,
        "DRB": 2.3,
        "AST": 3.1,
        "STL": 1.1,
        "BLK": 0.6,
        "TOV": 1.8,
        "PF": 2.1,
        "PTS": 9.4
      },
      "advanced": {
        "USG%": "19.6%",
        "TS%": "52.1%",
        "AST%": "19.4%",
        "TRB%": "7.0%",
        "ORB%": "3.0%",
        "DRB%": "11.4%",
        "STL%": "2.3%",
        "BLK%": "2.4%",
        "TOV%": "16.4%"
      }
    },
    {
      "name": "Gary Harris",
      "pos": [
        "SG"
      ],
      "ovr": 76,
      "real_ovr": 74,
      "id": 203914,
      "basic": {
        "MP": 14.8,
        "FGA": 2.8,
        "FG%": "38.3%",
        "3PA": 2.1,
        "3P%": "35.6%",
        "FTA": 0.3,
        "FT%": "58.3%",
        "ORB": 0.4,
        "DRB": 0.9,
        "AST": 0.6,
        "STL": 0.5,
        "BLK": 0.3,
        "TOV": 0.4,
        "PF": 0.9,
        "PTS": 3.0
      },
      "advanced": {
        "USG%": "9.5%",
        "TS%": "52.4%",
        "AST%": "5.8%",
        "TRB%": "5.2%",
        "ORB%": "3.1%",
        "DRB%": "7.5%",
        "STL%": "1.8%",
        "BLK%": "1.6%",
        "TOV%": "10.9%"
      }
    },
    {
      "name": "Tristan da Silva",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 76,
      "real_ovr": 77,
      "id": 1641783,
      "basic": {
        "MP": 22.0,
        "FGA": 6.5,
        "FG%": "41.2%",
        "3PA": 3.2,
        "3P%": "33.5%",
        "FTA": 0.9,
        "FT%": "87.3%",
        "ORB": 1.0,
        "DRB": 2.3,
        "AST": 1.5,
        "STL": 0.4,
        "BLK": 0.2,
        "TOV": 0.8,
        "PF": 1.3,
        "PTS": 7.2
      },
      "advanced": {
        "USG%": "15.2%",
        "TS%": "52.2%",
        "AST%": "10.3%",
        "TRB%": "8.6%",
        "ORB%": "4.9%",
        "DRB%": "12.7%",
        "STL%": "1.0%",
        "BLK%": "1.1%",
        "TOV%": "9.9%"
      }
    },
    {
      "name": "Jett Howard",
      "pos": [
        "SG"
      ],
      "ovr": 74,
      "real_ovr": 73,
      "id": 1641724,
      "basic": {
        "MP": 11.7,
        "FGA": 4.4,
        "FG%": "37.4%",
        "3PA": 3.1,
        "3P%": "29.6%",
        "FTA": 0.4,
        "FT%": "69.6%",
        "ORB": 0.3,
        "DRB": 0.8,
        "AST": 0.7,
        "STL": 0.2,
        "BLK": 0.2,
        "TOV": 0.6,
        "PF": 1.1,
        "PTS": 4.5
      },
      "advanced": {
        "USG%": "19.2%",
        "TS%": "49.1%",
        "AST%": "9.6%",
        "TRB%": "5.7%",
        "ORB%": "3.1%",
        "DRB%": "8.6%",
        "STL%": "0.9%",
        "BLK%": "1.5%",
        "TOV%": "11.7%"
      }
    },
    {
      "name": "Caleb Houstan",
      "pos": [
        "SF"
      ],
      "ovr": 74,
      "real_ovr": 73,
      "id": 1631216,
      "basic": {
        "MP": 13.6,
        "FGA": 3.3,
        "FG%": "42.1%",
        "3PA": 2.8,
        "3P%": "40.0%",
        "FTA": 0.3,
        "FT%": "88.2%",
        "ORB": 0.3,
        "DRB": 1.0,
        "AST": 0.6,
        "STL": 0.4,
        "BLK": 0.1,
        "TOV": 0.2,
        "PF": 1.1,
        "PTS": 4.1
      },
      "advanced": {
        "USG%": "11.7%",
        "TS%": "60.5%",
        "AST%": "6.4%",
        "TRB%": "5.5%",
        "ORB%": "2.6%",
        "DRB%": "8.6%",
        "STL%": "1.4%",
        "BLK%": "0.7%",
        "TOV%": "6.2%"
      }
    },
    {
      "name": "Cory Joseph",
      "pos": [
        "PG"
      ],
      "ovr": 73,
      "real_ovr": 74,
      "id": 202709,
      "basic": {
        "MP": 12.2,
        "FGA": 3.1,
        "FG%": "40.3%",
        "3PA": 2.1,
        "3P%": "36.4%",
        "FTA": 0.4,
        "FT%": "77.8%",
        "ORB": 0.3,
        "DRB": 1.1,
        "AST": 1.4,
        "STL": 0.5,
        "BLK": 0.1,
        "TOV": 0.4,
        "PF": 1.0,
        "PTS": 3.5
      },
      "advanced": {
        "USG%": "12.8%",
        "TS%": "54.7%",
        "AST%": "17.0%",
        "TRB%": "6.9%",
        "ORB%": "3.0%",
        "DRB%": "11.2%",
        "STL%": "2.1%",
        "BLK%": "0.6%",
        "TOV%": "10.0%"
      }
    }
  ]
,
  "PHI": [
    {
      "name": "Joel Embiid",
      "pos": [
        "C"
      ],
      "ovr": 95,
      "real_ovr": 90,
      "id": 203954,
      "basic": {
        "MP": 30.2,
        "FGA": 16.6,
        "FG%": "44.4%",
        "3PA": 4.1,
        "3P%": "29.9%",
        "FTA": 8.9,
        "FT%": "88.2%",
        "ORB": 1.9,
        "DRB": 6.3,
        "AST": 4.5,
        "STL": 0.7,
        "BLK": 0.9,
        "TOV": 3.3,
        "PF": 2.2,
        "PTS": 23.8
      },
      "advanced": {
        "USG%": "34.2%",
        "TS%": "58.0%",
        "AST%": "25.6%",
        "TRB%": "15.3%",
        "ORB%": "6.8%",
        "DRB%": "24.5%",
        "STL%": "1.2%",
        "BLK%": "3.1%",
        "TOV%": "13.7%"
      }
    },
    {
      "name": "Paul George",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 89,
      "real_ovr": 83,
      "id": 202331,
      "basic": {
        "MP": 32.5,
        "FGA": 13.9,
        "FG%": "43.0%",
        "3PA": 6.5,
        "3P%": "35.8%",
        "FTA": 2.4,
        "FT%": "81.4%",
        "ORB": 0.6,
        "DRB": 4.8,
        "AST": 4.3,
        "STL": 1.8,
        "BLK": 0.5,
        "TOV": 2.6,
        "PF": 2.5,
        "PTS": 16.2
      },
      "advanced": {
        "USG%": "23.5%",
        "TS%": "54.3%",
        "AST%": "20.9%",
        "TRB%": "9.3%",
        "ORB%": "2.0%",
        "DRB%": "17.2%",
        "STL%": "2.8%",
        "BLK%": "1.5%",
        "TOV%": "14.7%"
      }
    },
    {
      "name": "Tyrese Maxey",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 88,
      "real_ovr": 90,
      "id": 1630178,
      "basic": {
        "MP": 37.7,
        "FGA": 21.0,
        "FG%": "43.7%",
        "3PA": 9.2,
        "3P%": "33.7%",
        "FTA": 5.6,
        "FT%": "87.9%",
        "ORB": 0.3,
        "DRB": 3.1,
        "AST": 6.1,
        "STL": 1.8,
        "BLK": 0.4,
        "TOV": 2.4,
        "PF": 2.2,
        "PTS": 26.3
      },
      "advanced": {
        "USG%": "29.8%",
        "TS%": "56.2%",
        "AST%": "28.0%",
        "TRB%": "5.0%",
        "ORB%": "0.8%",
        "DRB%": "9.6%",
        "STL%": "2.3%",
        "BLK%": "1.1%",
        "TOV%": "9.2%"
      }
    },
    {
      "name": "Kelly Oubre Jr.",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 82,
      "real_ovr": 82,
      "id": 1626162,
      "basic": {
        "MP": 34.6,
        "FGA": 12.4,
        "FG%": "47.0%",
        "3PA": 4.0,
        "3P%": "29.3%",
        "FTA": 3.1,
        "FT%": "75.1%",
        "ORB": 1.6,
        "DRB": 4.5,
        "AST": 1.8,
        "STL": 1.5,
        "BLK": 0.5,
        "TOV": 1.3,
        "PF": 3.0,
        "PTS": 15.1
      },
      "advanced": {
        "USG%": "18.9%",
        "TS%": "55.1%",
        "AST%": "7.9%",
        "TRB%": "10.0%",
        "ORB%": "5.1%",
        "DRB%": "15.4%",
        "STL%": "2.2%",
        "BLK%": "1.4%",
        "TOV%": "8.9%"
      }
    },
    {
      "name": "Caleb Martin",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 79,
      "real_ovr": 77,
      "id": 1628997,
      "basic": {
        "MP": 27.1,
        "FGA": 6.8,
        "FG%": "42.4%",
        "3PA": 2.3,
        "3P%": "35.9%",
        "FTA": 2.2,
        "FT%": "62.2%",
        "ORB": 1.2,
        "DRB": 2.8,
        "AST": 2.1,
        "STL": 1.0,
        "BLK": 0.5,
        "TOV": 1.2,
        "PF": 1.9,
        "PTS": 7.9
      },
      "advanced": {
        "USG%": "14.4%",
        "TS%": "51.3%",
        "AST%": "10.7%",
        "TRB%": "8.2%",
        "ORB%": "4.8%",
        "DRB%": "11.7%",
        "STL%": "1.9%",
        "BLK%": "1.8%",
        "TOV%": "13.9%"
      }
    },
    {
      "name": "Andre Drummond",
      "pos": [
        "C"
      ],
      "ovr": 79,
      "real_ovr": 78,
      "id": 203083,
      "basic": {
        "MP": 18.8,
        "FGA": 5.9,
        "FG%": "50.0%",
        "3PA": 0.5,
        "3P%": "15.0%",
        "FTA": 2.3,
        "FT%": "62.2%",
        "ORB": 2.7,
        "DRB": 5.0,
        "AST": 0.9,
        "STL": 1.0,
        "BLK": 0.5,
        "TOV": 1.4,
        "PF": 2.4,
        "PTS": 7.3
      },
      "advanced": {
        "USG%": "19.1%",
        "TS%": "53.5%",
        "AST%": "6.8%",
        "TRB%": "23.4%",
        "ORB%": "15.8%",
        "DRB%": "31.6%",
        "STL%": "2.6%",
        "BLK%": "2.4%",
        "TOV%": "16.7%"
      }
    },
    {
      "name": "Guerschon Yabusele",
      "pos": [
        "PF"
      ],
      "ovr": 78,
      "real_ovr": 79,
      "id": 1627824,
      "basic": {
        "MP": 27.1,
        "FGA": 8.0,
        "FG%": "50.1%",
        "3PA": 3.9,
        "3P%": "38.0%",
        "FTA": 2.0,
        "FT%": "72.5%",
        "ORB": 1.9,
        "DRB": 3.7,
        "AST": 2.1,
        "STL": 0.8,
        "BLK": 0.3,
        "TOV": 1.2,
        "PF": 2.3,
        "PTS": 11.0
      },
      "advanced": {
        "USG%": "16.3%",
        "TS%": "61.6%",
        "AST%": "11.6%",
        "TRB%": "11.8%",
        "ORB%": "7.7%",
        "DRB%": "16.3%",
        "STL%": "1.5%",
        "BLK%": "1.2%",
        "TOV%": "12.2%"
      }
    },
    {
      "name": "Kyle Lowry",
      "pos": [
        "PG"
      ],
      "ovr": 78,
      "real_ovr": 75,
      "id": 200768,
      "basic": {
        "MP": 18.8,
        "FGA": 3.3,
        "FG%": "35.0%",
        "3PA": 2.5,
        "3P%": "33.0%",
        "FTA": 0.9,
        "FT%": "81.8%",
        "ORB": 0.3,
        "DRB": 1.6,
        "AST": 2.7,
        "STL": 0.9,
        "BLK": 0.3,
        "TOV": 0.6,
        "PF": 1.8,
        "PTS": 3.9
      },
      "advanced": {
        "USG%": "10.1%",
        "TS%": "52.5%",
        "AST%": "19.2%",
        "TRB%": "5.8%",
        "ORB%": "1.8%",
        "DRB%": "10.0%",
        "STL%": "2.5%",
        "BLK%": "1.6%",
        "TOV%": "13.8%"
      }
    },
    {
      "name": "Eric Gordon",
      "pos": [
        "SG"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 201569,
      "basic": {
        "MP": 19.7,
        "FGA": 5.2,
        "FG%": "42.6%",
        "3PA": 3.5,
        "3P%": "40.9%",
        "FTA": 1.2,
        "FT%": "75.0%",
        "ORB": 0.2,
        "DRB": 1.0,
        "AST": 1.7,
        "STL": 0.7,
        "BLK": 0.3,
        "TOV": 0.7,
        "PF": 0.8,
        "PTS": 6.8
      },
      "advanced": {
        "USG%": "14.4%",
        "TS%": "59.1%",
        "AST%": "12.0%",
        "TRB%": "3.4%",
        "ORB%": "1.1%",
        "DRB%": "5.8%",
        "STL%": "1.7%",
        "BLK%": "1.5%",
        "TOV%": "11.1%"
      }
    },
    {
      "name": "Reggie Jackson",
      "pos": [
        "PG"
      ],
      "ovr": 76,
      "real_ovr": 74,
      "id": 202704,
      "basic": {
        "MP": 12.4,
        "FGA": 4.3,
        "FG%": "39.1%",
        "3PA": 2.4,
        "3P%": "33.8%",
        "FTA": 0.3,
        "FT%": "77.8%",
        "ORB": 0.3,
        "DRB": 1.1,
        "AST": 1.5,
        "STL": 0.5,
        "BLK": 0.1,
        "TOV": 0.5,
        "PF": 1.1,
        "PTS": 4.4
      },
      "advanced": {
        "USG%": "17.5%",
        "TS%": "49.6%",
        "AST%": "17.1%",
        "TRB%": "6.2%",
        "ORB%": "2.3%",
        "DRB%": "10.4%",
        "STL%": "2.1%",
        "BLK%": "0.8%",
        "TOV%": "11.0%"
      }
    },
    {
      "name": "KJ Martin",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1630231,
      "basic": {
        "MP": 21.2,
        "FGA": 4.7,
        "FG%": "55.2%",
        "3PA": 1.3,
        "3P%": "25.9%",
        "FTA": 1.1,
        "FT%": "78.7%",
        "ORB": 0.7,
        "DRB": 2.2,
        "AST": 1.1,
        "STL": 0.4,
        "BLK": 0.5,
        "TOV": 0.6,
        "PF": 2.3,
        "PTS": 6.4
      },
      "advanced": {
        "USG%": "11.5%",
        "TS%": "61.8%",
        "AST%": "7.4%",
        "TRB%": "7.6%",
        "ORB%": "3.6%",
        "DRB%": "11.8%",
        "STL%": "0.9%",
        "BLK%": "2.3%",
        "TOV%": "9.8%"
      }
    },
    {
      "name": "Ricky Council IV",
      "pos": [
        "SG"
      ],
      "ovr": 75,
      "real_ovr": 76,
      "id": 1641741,
      "basic": {
        "MP": 17.1,
        "FGA": 6.3,
        "FG%": "38.2%",
        "3PA": 2.9,
        "3P%": "25.8%",
        "FTA": 2.1,
        "FT%": "80.4%",
        "ORB": 0.7,
        "DRB": 2.2,
        "AST": 1.3,
        "STL": 0.4,
        "BLK": 0.2,
        "TOV": 0.7,
        "PF": 0.9,
        "PTS": 7.3
      },
      "advanced": {
        "USG%": "20.3%",
        "TS%": "50.2%",
        "AST%": "11.4%",
        "TRB%": "9.7%",
        "ORB%": "4.4%",
        "DRB%": "15.4%",
        "STL%": "1.3%",
        "BLK%": "1.0%",
        "TOV%": "8.9%"
      }
    },
    {
      "name": "Jared McCain",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 76,
      "real_ovr": 82,
      "id": 1642272,
      "basic": {
        "MP": 25.7,
        "FGA": 11.9,
        "FG%": "46.0%",
        "3PA": 5.8,
        "3P%": "38.3%",
        "FTA": 2.4,
        "FT%": "87.5%",
        "ORB": 0.6,
        "DRB": 1.9,
        "AST": 2.6,
        "STL": 0.7,
        "BLK": 0.0,
        "TOV": 1.6,
        "PF": 1.6,
        "PTS": 15.3
      },
      "advanced": {
        "USG%": "24.7%",
        "TS%": "58.9%",
        "AST%": "16.7%",
        "TRB%": "5.4%",
        "ORB%": "2.4%",
        "DRB%": "8.6%",
        "STL%": "1.2%",
        "BLK%": "0.0%",
        "TOV%": "11.0%"
      }
    },
    {
      "name": "Adem Bona",
      "pos": [
        "C"
      ],
      "ovr": 74,
      "real_ovr": 76,
      "id": 1641737,
      "basic": {
        "MP": 15.6,
        "FGA": 3.3,
        "FG%": "70.3%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 1.7,
        "FT%": "67.0%",
        "ORB": 1.6,
        "DRB": 2.6,
        "AST": 0.5,
        "STL": 0.4,
        "BLK": 1.2,
        "TOV": 1.1,
        "PF": 2.2,
        "PTS": 5.8
      },
      "advanced": {
        "USG%": "14.3%",
        "TS%": "71.4%",
        "AST%": "4.4%",
        "TRB%": "15.3%",
        "ORB%": "11.1%",
        "DRB%": "19.9%",
        "STL%": "1.4%",
        "BLK%": "7.5%",
        "TOV%": "20.5%"
      }
    },
    {
      "name": "Jeff Dowtin Jr.",
      "pos": [
        "PG"
      ],
      "ovr": 73,
      "real_ovr": 76,
      "id": 1630288,
      "basic": {
        "MP": 15.1,
        "FGA": 5.6,
        "FG%": "48.7%",
        "3PA": 1.7,
        "3P%": "40.0%",
        "FTA": 1.1,
        "FT%": "73.3%",
        "ORB": 0.3,
        "DRB": 1.2,
        "AST": 1.9,
        "STL": 0.6,
        "BLK": 0.3,
        "TOV": 0.4,
        "PF": 0.7,
        "PTS": 7.0
      },
      "advanced": {
        "USG%": "18.6%",
        "TS%": "57.0%",
        "AST%": "19.6%",
        "TRB%": "5.5%",
        "ORB%": "2.1%",
        "DRB%": "9.1%",
        "STL%": "1.9%",
        "BLK%": "1.9%",
        "TOV%": "5.7%"
      }
    }
  ]
,
  "PHX": [
    {
      "name": "Kevin Durant",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 94,
      "real_ovr": 91,
      "id": 201142,
      "basic": {
        "MP": 36.5,
        "FGA": 18.1,
        "FG%": "52.7%",
        "3PA": 6.0,
        "3P%": "43.0%",
        "FTA": 5.8,
        "FT%": "83.9%",
        "ORB": 0.4,
        "DRB": 5.7,
        "AST": 4.2,
        "STL": 0.8,
        "BLK": 1.2,
        "TOV": 3.1,
        "PF": 1.7,
        "PTS": 26.6
      },
      "advanced": {
        "USG%": "28.7%",
        "TS%": "64.2%",
        "AST%": "19.6%",
        "TRB%": "9.2%",
        "ORB%": "1.2%",
        "DRB%": "16.9%",
        "STL%": "1.1%",
        "BLK%": "3.2%",
        "TOV%": "12.9%"
      }
    },
    {
      "name": "Devin Booker",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 91,
      "real_ovr": 89,
      "id": 1626164,
      "basic": {
        "MP": 37.3,
        "FGA": 18.9,
        "FG%": "46.1%",
        "3PA": 7.3,
        "3P%": "33.2%",
        "FTA": 6.4,
        "FT%": "89.4%",
        "ORB": 1.0,
        "DRB": 3.1,
        "AST": 7.1,
        "STL": 0.9,
        "BLK": 0.2,
        "TOV": 2.9,
        "PF": 2.6,
        "PTS": 25.6
      },
      "advanced": {
        "USG%": "29.3%",
        "TS%": "58.9%",
        "AST%": "30.6%",
        "TRB%": "6.1%",
        "ORB%": "3.1%",
        "DRB%": "8.9%",
        "STL%": "1.2%",
        "BLK%": "0.5%",
        "TOV%": "11.9%"
      }
    },
    {
      "name": "Bradley Beal",
      "pos": [
        "SG"
      ],
      "ovr": 84,
      "real_ovr": 83,
      "id": 203078,
      "basic": {
        "MP": 32.1,
        "FGA": 13.1,
        "FG%": "49.7%",
        "3PA": 5.0,
        "3P%": "38.6%",
        "FTA": 2.6,
        "FT%": "80.3%",
        "ORB": 0.6,
        "DRB": 2.7,
        "AST": 3.7,
        "STL": 1.1,
        "BLK": 0.5,
        "TOV": 1.9,
        "PF": 2.6,
        "PTS": 17.0
      },
      "advanced": {
        "USG%": "22.1%",
        "TS%": "59.8%",
        "AST%": "17.6%",
        "TRB%": "5.8%",
        "ORB%": "2.3%",
        "DRB%": "9.1%",
        "STL%": "1.7%",
        "BLK%": "1.5%",
        "TOV%": "11.6%"
      }
    },
    {
      "name": "Jusuf Nurkić",
      "pos": [
        "C"
      ],
      "ovr": 82,
      "real_ovr": 79,
      "id": 203994,
      "basic": {
        "MP": 20.8,
        "FGA": 6.9,
        "FG%": "47.7%",
        "3PA": 2.1,
        "3P%": "30.5%",
        "FTA": 2.5,
        "FT%": "66.4%",
        "ORB": 1.7,
        "DRB": 6.1,
        "AST": 2.3,
        "STL": 0.8,
        "BLK": 0.7,
        "TOV": 1.9,
        "PF": 2.5,
        "PTS": 8.9
      },
      "advanced": {
        "USG%": "20.6%",
        "TS%": "55.5%",
        "AST%": "16.8%",
        "TRB%": "20.5%",
        "ORB%": "8.8%",
        "DRB%": "32.0%",
        "STL%": "1.9%",
        "BLK%": "3.1%",
        "TOV%": "19.2%"
      }
    },
    {
      "name": "Tyus Jones",
      "pos": [
        "PG"
      ],
      "ovr": 81,
      "real_ovr": 79,
      "id": 1626145,
      "basic": {
        "MP": 26.8,
        "FGA": 8.4,
        "FG%": "44.8%",
        "3PA": 5.0,
        "3P%": "41.4%",
        "FTA": 0.7,
        "FT%": "89.5%",
        "ORB": 0.5,
        "DRB": 1.9,
        "AST": 5.3,
        "STL": 0.9,
        "BLK": 0.1,
        "TOV": 1.1,
        "PF": 0.8,
        "PTS": 10.2
      },
      "advanced": {
        "USG%": "16.2%",
        "TS%": "58.5%",
        "AST%": "27.7%",
        "TRB%": "5.0%",
        "ORB%": "2.1%",
        "DRB%": "7.8%",
        "STL%": "1.6%",
        "BLK%": "0.3%",
        "TOV%": "11.4%"
      }
    },
    {
      "name": "Grayson Allen",
      "pos": [
        "SG"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1628960,
      "basic": {
        "MP": 24.1,
        "FGA": 7.6,
        "FG%": "44.8%",
        "3PA": 5.5,
        "3P%": "42.6%",
        "FTA": 1.8,
        "FT%": "81.6%",
        "ORB": 0.5,
        "DRB": 2.5,
        "AST": 2.1,
        "STL": 0.8,
        "BLK": 0.3,
        "TOV": 1.2,
        "PF": 1.5,
        "PTS": 10.6
      },
      "advanced": {
        "USG%": "17.6%",
        "TS%": "63.1%",
        "AST%": "12.5%",
        "TRB%": "7.0%",
        "ORB%": "2.5%",
        "DRB%": "11.3%",
        "STL%": "1.7%",
        "BLK%": "1.2%",
        "TOV%": "12.2%"
      }
    },
    {
      "name": "Royce O'Neale",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 78,
      "real_ovr": 79,
      "id": 1626220,
      "basic": {
        "MP": 24.5,
        "FGA": 7.6,
        "FG%": "42.3%",
        "3PA": 5.9,
        "3P%": "40.6%",
        "FTA": 0.3,
        "FT%": "73.1%",
        "ORB": 0.7,
        "DRB": 3.9,
        "AST": 2.2,
        "STL": 0.9,
        "BLK": 0.5,
        "TOV": 0.9,
        "PF": 2.0,
        "PTS": 9.1
      },
      "advanced": {
        "USG%": "15.5%",
        "TS%": "58.5%",
        "AST%": "12.3%",
        "TRB%": "10.6%",
        "ORB%": "3.3%",
        "DRB%": "17.5%",
        "STL%": "1.8%",
        "BLK%": "1.7%",
        "TOV%": "10.1%"
      }
    },
    {
      "name": "Mason Plumlee",
      "pos": [
        "C"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 203486,
      "basic": {
        "MP": 17.6,
        "FGA": 2.7,
        "FG%": "61.9%",
        "3PA": 0.1,
        "3P%": "0.0%",
        "FTA": 1.7,
        "FT%": "64.8%",
        "ORB": 1.6,
        "DRB": 4.6,
        "AST": 1.8,
        "STL": 0.4,
        "BLK": 0.6,
        "TOV": 0.8,
        "PF": 2.1,
        "PTS": 4.5
      },
      "advanced": {
        "USG%": "10.8%",
        "TS%": "64.5%",
        "AST%": "13.6%",
        "TRB%": "19.5%",
        "ORB%": "10.2%",
        "DRB%": "28.4%",
        "STL%": "1.3%",
        "BLK%": "3.4%",
        "TOV%": "18.6%"
      }
    },
    {
      "name": "Monte Morris",
      "pos": [
        "PG"
      ],
      "ovr": 76,
      "real_ovr": 75,
      "id": 1628420,
      "basic": {
        "MP": 12.7,
        "FGA": 4.3,
        "FG%": "42.6%",
        "3PA": 1.9,
        "3P%": "36.0%",
        "FTA": 0.9,
        "FT%": "85.7%",
        "ORB": 0.3,
        "DRB": 1.2,
        "AST": 1.6,
        "STL": 0.4,
        "BLK": 0.1,
        "TOV": 0.5,
        "PF": 0.5,
        "PTS": 5.2
      },
      "advanced": {
        "USG%": "18.1%",
        "TS%": "54.6%",
        "AST%": "18.1%",
        "TRB%": "6.5%",
        "ORB%": "2.4%",
        "DRB%": "10.5%",
        "STL%": "1.7%",
        "BLK%": "0.5%",
        "TOV%": "9.0%"
      }
    },
    {
      "name": "Josh Okogie",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 76,
      "real_ovr": 77,
      "id": 1629006,
      "basic": {
        "MP": 15.6,
        "FGA": 5.3,
        "FG%": "44.3%",
        "3PA": 2.3,
        "3P%": "34.8%",
        "FTA": 2.1,
        "FT%": "74.1%",
        "ORB": 1.1,
        "DRB": 1.7,
        "AST": 0.8,
        "STL": 1.2,
        "BLK": 0.5,
        "TOV": 0.8,
        "PF": 1.2,
        "PTS": 7.1
      },
      "advanced": {
        "USG%": "19.5%",
        "TS%": "56.7%",
        "AST%": "7.9%",
        "TRB%": "9.9%",
        "ORB%": "8.0%",
        "DRB%": "11.8%",
        "STL%": "3.8%",
        "BLK%": "2.8%",
        "TOV%": "11.1%"
      }
    },
    {
      "name": "Bol Bol",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 76,
      "real_ovr": 77,
      "id": 1629626,
      "basic": {
        "MP": 12.4,
        "FGA": 5.1,
        "FG%": "52.5%",
        "3PA": 2.6,
        "3P%": "34.4%",
        "FTA": 0.7,
        "FT%": "76.9%",
        "ORB": 0.6,
        "DRB": 2.3,
        "AST": 0.6,
        "STL": 0.3,
        "BLK": 0.7,
        "TOV": 0.6,
        "PF": 0.6,
        "PTS": 6.8
      },
      "advanced": {
        "USG%": "21.1%",
        "TS%": "62.7%",
        "AST%": "7.7%",
        "TRB%": "13.0%",
        "ORB%": "5.1%",
        "DRB%": "20.4%",
        "STL%": "1.0%",
        "BLK%": "5.2%",
        "TOV%": "9.3%"
      }
    },
    {
      "name": "Ryan Dunn",
      "pos": [
        "SF"
      ],
      "ovr": 75,
      "real_ovr": 76,
      "id": 1642346,
      "basic": {
        "MP": 19.1,
        "FGA": 6.4,
        "FG%": "43.0%",
        "3PA": 3.6,
        "3P%": "31.1%",
        "FTA": 0.5,
        "FT%": "48.7%",
        "ORB": 1.2,
        "DRB": 2.4,
        "AST": 0.8,
        "STL": 0.6,
        "BLK": 0.5,
        "TOV": 0.5,
        "PF": 2.2,
        "PTS": 6.9
      },
      "advanced": {
        "USG%": "16.7%",
        "TS%": "51.7%",
        "AST%": "5.7%",
        "TRB%": "10.6%",
        "ORB%": "7.5%",
        "DRB%": "13.5%",
        "STL%": "1.5%",
        "BLK%": "2.7%",
        "TOV%": "7.5%"
      }
    },
    {
      "name": "Oso Ighodaro",
      "pos": [
        "C"
      ],
      "ovr": 74,
      "real_ovr": 75,
      "id": 1642345,
      "basic": {
        "MP": 17.1,
        "FGA": 3.1,
        "FG%": "60.4%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 0.8,
        "FT%": "58.0%",
        "ORB": 1.1,
        "DRB": 2.6,
        "AST": 1.2,
        "STL": 0.5,
        "BLK": 0.5,
        "TOV": 0.6,
        "PF": 1.7,
        "PTS": 4.2
      },
      "advanced": {
        "USG%": "10.5%",
        "TS%": "61.0%",
        "AST%": "9.1%",
        "TRB%": "11.9%",
        "ORB%": "7.2%",
        "DRB%": "16.2%",
        "STL%": "1.3%",
        "BLK%": "2.6%",
        "TOV%": "15.7%"
      }
    },
    {
      "name": "Damion Lee",
      "pos": [
        "SG"
      ],
      "ovr": 74,
      "real_ovr": 72,
      "id": 1627814,
      "basic": {
        "MP": 5.8,
        "FGA": 3.0,
        "FG%": "36.5%",
        "3PA": 1.5,
        "3P%": "24.3%",
        "FTA": 0.8,
        "FT%": "95.2%",
        "ORB": 0.1,
        "DRB": 0.7,
        "AST": 0.4,
        "STL": 0.2,
        "BLK": 0.0,
        "TOV": 0.4,
        "PF": 0.2,
        "PTS": 3.3
      },
      "advanced": {
        "USG%": "28.6%",
        "TS%": "49.9%",
        "AST%": "11.5%",
        "TRB%": "7.8%",
        "ORB%": "2.4%",
        "DRB%": "12.8%",
        "STL%": "2.1%",
        "BLK%": "0.0%",
        "TOV%": "10.7%"
      }
    },
    {
      "name": "Collin Gillespie",
      "pos": [
        "PG"
      ],
      "ovr": 74,
      "real_ovr": 77,
      "id": 1631221,
      "basic": {
        "MP": 14.0,
        "FGA": 4.8,
        "FG%": "43.0%",
        "3PA": 2.7,
        "3P%": "43.3%",
        "FTA": 0.7,
        "FT%": "86.4%",
        "ORB": 0.7,
        "DRB": 1.7,
        "AST": 2.4,
        "STL": 0.6,
        "BLK": 0.2,
        "TOV": 0.5,
        "PF": 0.9,
        "PTS": 5.9
      },
      "advanced": {
        "USG%": "17.7%",
        "TS%": "57.8%",
        "AST%": "24.0%",
        "TRB%": "9.4%",
        "ORB%": "5.5%",
        "DRB%": "13.2%",
        "STL%": "2.3%",
        "BLK%": "1.0%",
        "TOV%": "9.2%"
      }
    }
  ]
,
  "POR": [
    {
      "name": "Anfernee Simons",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 83,
      "real_ovr": 82,
      "id": 1629014,
      "basic": {
        "MP": 32.7,
        "FGA": 16.1,
        "FG%": "42.6%",
        "3PA": 8.5,
        "3P%": "36.3%",
        "FTA": 2.8,
        "FT%": "90.2%",
        "ORB": 0.4,
        "DRB": 2.3,
        "AST": 4.8,
        "STL": 0.9,
        "BLK": 0.1,
        "TOV": 2.0,
        "PF": 2.1,
        "PTS": 19.3
      },
      "advanced": {
        "USG%": "25.8%",
        "TS%": "56.0%",
        "AST%": "22.6%",
        "TRB%": "4.4%",
        "ORB%": "1.3%",
        "DRB%": "7.5%",
        "STL%": "1.3%",
        "BLK%": "0.3%",
        "TOV%": "10.4%"
      }
    },
    {
      "name": "Jerami Grant",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 83,
      "real_ovr": 80,
      "id": 203924,
      "basic": {
        "MP": 31.8,
        "FGA": 12.3,
        "FG%": "42.8%",
        "3PA": 5.4,
        "3P%": "36.4%",
        "FTA": 3.7,
        "FT%": "81.6%",
        "ORB": 0.6,
        "DRB": 2.9,
        "AST": 2.1,
        "STL": 0.8,
        "BLK": 0.7,
        "TOV": 1.7,
        "PF": 2.2,
        "PTS": 14.4
      },
      "advanced": {
        "USG%": "21.6%",
        "TS%": "53.6%",
        "AST%": "10.2%",
        "TRB%": "6.0%",
        "ORB%": "2.1%",
        "DRB%": "9.8%",
        "STL%": "1.2%",
        "BLK%": "1.9%",
        "TOV%": "10.9%"
      }
    },
    {
      "name": "Deandre Ayton",
      "pos": [
        "C"
      ],
      "ovr": 82,
      "real_ovr": 83,
      "id": 1629028,
      "basic": {
        "MP": 30.2,
        "FGA": 11.7,
        "FG%": "56.6%",
        "3PA": 0.8,
        "3P%": "18.8%",
        "FTA": 1.7,
        "FT%": "75.0%",
        "ORB": 2.8,
        "DRB": 7.4,
        "AST": 1.6,
        "STL": 0.8,
        "BLK": 1.0,
        "TOV": 1.5,
        "PF": 2.3,
        "PTS": 14.4
      },
      "advanced": {
        "USG%": "20.2%",
        "TS%": "58.7%",
        "AST%": "8.7%",
        "TRB%": "18.0%",
        "ORB%": "9.9%",
        "DRB%": "26.3%",
        "STL%": "1.3%",
        "BLK%": "2.8%",
        "TOV%": "10.7%"
      }
    },
    {
      "name": "Scoot Henderson",
      "pos": [
        "PG"
      ],
      "ovr": 80,
      "real_ovr": 79,
      "id": 1630703,
      "basic": {
        "MP": 26.7,
        "FGA": 10.4,
        "FG%": "41.9%",
        "3PA": 4.5,
        "3P%": "35.4%",
        "FTA": 3.1,
        "FT%": "76.7%",
        "ORB": 0.5,
        "DRB": 2.5,
        "AST": 5.1,
        "STL": 1.0,
        "BLK": 0.2,
        "TOV": 2.7,
        "PF": 2.8,
        "PTS": 12.7
      },
      "advanced": {
        "USG%": "23.4%",
        "TS%": "53.9%",
        "AST%": "28.3%",
        "TRB%": "6.1%",
        "ORB%": "2.1%",
        "DRB%": "10.0%",
        "STL%": "1.8%",
        "BLK%": "0.7%",
        "TOV%": "18.6%"
      }
    },
    {
      "name": "Shaedon Sharpe",
      "pos": [
        "SG"
      ],
      "ovr": 80,
      "real_ovr": 82,
      "id": 1631101,
      "basic": {
        "MP": 31.3,
        "FGA": 14.9,
        "FG%": "44.6%",
        "3PA": 5.4,
        "3P%": "33.2%",
        "FTA": 4.3,
        "FT%": "78.4%",
        "ORB": 1.1,
        "DRB": 3.4,
        "AST": 2.8,
        "STL": 0.9,
        "BLK": 0.3,
        "TOV": 2.1,
        "PF": 2.4,
        "PTS": 18.5
      },
      "advanced": {
        "USG%": "26.1%",
        "TS%": "55.1%",
        "AST%": "14.6%",
        "TRB%": "7.7%",
        "ORB%": "3.8%",
        "DRB%": "11.6%",
        "STL%": "1.4%",
        "BLK%": "0.9%",
        "TOV%": "11.1%"
      }
    },
    {
      "name": "Deni Avdija",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 81,
      "real_ovr": 84,
      "id": 1630166,
      "basic": {
        "MP": 32.7,
        "FGA": 12.3,
        "FG%": "47.4%",
        "3PA": 4.3,
        "3P%": "36.3%",
        "FTA": 5.1,
        "FT%": "78.8%",
        "ORB": 1.4,
        "DRB": 5.9,
        "AST": 3.9,
        "STL": 1.0,
        "BLK": 0.6,
        "TOV": 2.4,
        "PF": 2.6,
        "PTS": 16.9
      },
      "advanced": {
        "USG%": "22.8%",
        "TS%": "58.1%",
        "AST%": "18.8%",
        "TRB%": "12.0%",
        "ORB%": "4.6%",
        "DRB%": "19.5%",
        "STL%": "1.5%",
        "BLK%": "1.6%",
        "TOV%": "14.2%"
      }
    },
    {
      "name": "Robert Williams III",
      "pos": [
        "C"
      ],
      "ovr": 79,
      "real_ovr": 78,
      "id": 1629057,
      "basic": {
        "MP": 17.6,
        "FGA": 4.1,
        "FG%": "64.2%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 1.4,
        "FT%": "67.9%",
        "ORB": 2.3,
        "DRB": 3.6,
        "AST": 1.1,
        "STL": 0.9,
        "BLK": 1.4,
        "TOV": 0.9,
        "PF": 2.0,
        "PTS": 5.8
      },
      "advanced": {
        "USG%": "14.1%",
        "TS%": "62.8%",
        "AST%": "8.8%",
        "TRB%": "18.1%",
        "ORB%": "14.0%",
        "DRB%": "22.0%",
        "STL%": "2.5%",
        "BLK%": "6.8%",
        "TOV%": "15.9%"
      }
    },
    {
      "name": "Donovan Clingan",
      "pos": [
        "C"
      ],
      "ovr": 78,
      "real_ovr": 79,
      "id": 1642270,
      "basic": {
        "MP": 19.8,
        "FGA": 5.3,
        "FG%": "53.2%",
        "3PA": 0.5,
        "3P%": "30.0%",
        "FTA": 1.9,
        "FT%": "62.2%",
        "ORB": 3.1,
        "DRB": 4.8,
        "AST": 1.1,
        "STL": 0.5,
        "BLK": 1.7,
        "TOV": 1.0,
        "PF": 2.4,
        "PTS": 6.5
      },
      "advanced": {
        "USG%": "15.4%",
        "TS%": "54.0%",
        "AST%": "8.0%",
        "TRB%": "21.4%",
        "ORB%": "16.8%",
        "DRB%": "26.0%",
        "STL%": "1.2%",
        "BLK%": "7.5%",
        "TOV%": "13.9%"
      }
    },
    {
      "name": "Toumani Camara",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 78,
      "real_ovr": 80,
      "id": 1641739,
      "basic": {
        "MP": 31.1,
        "FGA": 8.7,
        "FG%": "45.8%",
        "3PA": 4.1,
        "3P%": "36.2%",
        "FTA": 2.2,
        "FT%": "74.6%",
        "ORB": 1.7,
        "DRB": 4.1,
        "AST": 2.2,
        "STL": 1.5,
        "BLK": 0.5,
        "TOV": 1.2,
        "PF": 3.1,
        "PTS": 11.3
      },
      "advanced": {
        "USG%": "15.2%",
        "TS%": "58.4%",
        "AST%": "9.9%",
        "TRB%": "10.0%",
        "ORB%": "5.9%",
        "DRB%": "14.2%",
        "STL%": "2.4%",
        "BLK%": "1.4%",
        "TOV%": "11.0%"
      }
    },
    {
      "name": "Matisse Thybulle",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1629680,
      "basic": {
        "MP": 19.5,
        "FGA": 6.1,
        "FG%": "42.0%",
        "3PA": 4.3,
        "3P%": "34.8%",
        "FTA": 1.3,
        "FT%": "75.0%",
        "ORB": 0.8,
        "DRB": 2.7,
        "AST": 1.9,
        "STL": 1.7,
        "BLK": 0.8,
        "TOV": 0.9,
        "PF": 1.9,
        "PTS": 7.5
      },
      "advanced": {
        "USG%": "16.1%",
        "TS%": "55.8%",
        "AST%": "13.6%",
        "TRB%": "9.5%",
        "ORB%": "4.4%",
        "DRB%": "14.6%",
        "STL%": "4.2%",
        "BLK%": "3.5%",
        "TOV%": "11.8%"
      }
    },
    {
      "name": "Jabari Walker",
      "pos": [
        "PF"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1631133,
      "basic": {
        "MP": 15.6,
        "FGA": 4.1,
        "FG%": "45.7%",
        "3PA": 1.2,
        "3P%": "30.4%",
        "FTA": 1.4,
        "FT%": "77.6%",
        "ORB": 1.3,
        "DRB": 2.2,
        "AST": 0.6,
        "STL": 0.5,
        "BLK": 0.3,
        "TOV": 0.7,
        "PF": 1.8,
        "PTS": 5.2
      },
      "advanced": {
        "USG%": "14.9%",
        "TS%": "55.1%",
        "AST%": "5.6%",
        "TRB%": "12.0%",
        "ORB%": "9.0%",
        "DRB%": "14.9%",
        "STL%": "1.6%",
        "BLK%": "1.8%",
        "TOV%": "12.8%"
      }
    },
    {
      "name": "Duop Reath",
      "pos": [
        "C"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1641871,
      "basic": {
        "MP": 11.2,
        "FGA": 3.7,
        "FG%": "43.5%",
        "3PA": 1.8,
        "3P%": "33.3%",
        "FTA": 0.6,
        "FT%": "73.7%",
        "ORB": 0.7,
        "DRB": 1.3,
        "AST": 0.6,
        "STL": 0.3,
        "BLK": 0.4,
        "TOV": 0.5,
        "PF": 1.7,
        "PTS": 4.2
      },
      "advanced": {
        "USG%": "17.7%",
        "TS%": "53.0%",
        "AST%": "7.5%",
        "TRB%": "9.7%",
        "ORB%": "6.8%",
        "DRB%": "12.5%",
        "STL%": "1.3%",
        "BLK%": "3.1%",
        "TOV%": "11.1%"
      }
    },
    {
      "name": "Kris Murray",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1631200,
      "basic": {
        "MP": 16.5,
        "FGA": 3.8,
        "FG%": "41.6%",
        "3PA": 2.1,
        "3P%": "30.3%",
        "FTA": 0.7,
        "FT%": "65.7%",
        "ORB": 0.8,
        "DRB": 1.8,
        "AST": 1.0,
        "STL": 0.6,
        "BLK": 0.3,
        "TOV": 0.5,
        "PF": 1.3,
        "PTS": 4.2
      },
      "advanced": {
        "USG%": "12.2%",
        "TS%": "51.1%",
        "AST%": "8.2%",
        "TRB%": "8.4%",
        "ORB%": "5.3%",
        "DRB%": "11.6%",
        "STL%": "1.8%",
        "BLK%": "1.6%",
        "TOV%": "10.8%"
      }
    },
    {
      "name": "Dalano Banton",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 75,
      "real_ovr": 76,
      "id": 1630625,
      "basic": {
        "MP": 16.5,
        "FGA": 7.5,
        "FG%": "40.5%",
        "3PA": 3.5,
        "3P%": "34.2%",
        "FTA": 1.5,
        "FT%": "75.0%",
        "ORB": 0.4,
        "DRB": 1.6,
        "AST": 2.4,
        "STL": 0.7,
        "BLK": 0.3,
        "TOV": 1.2,
        "PF": 1.3,
        "PTS": 8.3
      },
      "advanced": {
        "USG%": "24.1%",
        "TS%": "50.9%",
        "AST%": "21.6%",
        "TRB%": "6.5%",
        "ORB%": "2.7%",
        "DRB%": "10.4%",
        "STL%": "2.1%",
        "BLK%": "1.7%",
        "TOV%": "12.8%"
      }
    },
    {
      "name": "Rayan Rupert",
      "pos": [
        "SG"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1641712,
      "basic": {
        "MP": 9.4,
        "FGA": 2.7,
        "FG%": "39.1%",
        "3PA": 1.4,
        "3P%": "32.4%",
        "FTA": 0.5,
        "FT%": "72.7%",
        "ORB": 0.4,
        "DRB": 0.9,
        "AST": 0.5,
        "STL": 0.4,
        "BLK": 0.1,
        "TOV": 0.4,
        "PF": 1.0,
        "PTS": 3.0
      },
      "advanced": {
        "USG%": "15.0%",
        "TS%": "51.4%",
        "AST%": "7.5%",
        "TRB%": "7.3%",
        "ORB%": "4.5%",
        "DRB%": "10.2%",
        "STL%": "2.1%",
        "BLK%": "0.9%",
        "TOV%": "12.0%"
      }
    }
  ]
,
  "SAC": [
    {
      "name": "De'Aaron Fox",
      "pos": [
        "PG"
      ],
      "ovr": 88,
      "real_ovr": 88,
      "id": 1628368,
      "basic": {
        "MP": 36.1,
        "FGA": 18.8,
        "FG%": "46.3%",
        "3PA": 6.1,
        "3P%": "31.0%",
        "FTA": 5.1,
        "FT%": "82.7%",
        "ORB": 0.9,
        "DRB": 3.9,
        "AST": 6.3,
        "STL": 1.5,
        "BLK": 0.4,
        "TOV": 2.8,
        "PF": 2.6,
        "PTS": 23.5
      },
      "advanced": {
        "USG%": "28.3%",
        "TS%": "56.0%",
        "AST%": "27.4%",
        "TRB%": "7.1%",
        "ORB%": "2.7%",
        "DRB%": "11.6%",
        "STL%": "2.0%",
        "BLK%": "1.0%",
        "TOV%": "11.7%"
      }
    },
    {
      "name": "Domantas Sabonis",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 88,
      "real_ovr": 89,
      "id": 1627734,
      "basic": {
        "MP": 34.7,
        "FGA": 12.8,
        "FG%": "59.0%",
        "3PA": 2.2,
        "3P%": "41.7%",
        "FTA": 5.0,
        "FT%": "75.4%",
        "ORB": 3.4,
        "DRB": 10.5,
        "AST": 6.0,
        "STL": 0.7,
        "BLK": 0.4,
        "TOV": 2.9,
        "PF": 3.1,
        "PTS": 19.1
      },
      "advanced": {
        "USG%": "21.6%",
        "TS%": "64.8%",
        "AST%": "25.2%",
        "TRB%": "21.8%",
        "ORB%": "11.0%",
        "DRB%": "32.6%",
        "STL%": "1.0%",
        "BLK%": "1.1%",
        "TOV%": "16.1%"
      }
    },
    {
      "name": "DeMar DeRozan",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 87,
      "real_ovr": 86,
      "id": 201942,
      "basic": {
        "MP": 35.9,
        "FGA": 17.0,
        "FG%": "47.7%",
        "3PA": 3.3,
        "3P%": "32.8%",
        "FTA": 5.8,
        "FT%": "86.8%",
        "ORB": 0.7,
        "DRB": 3.2,
        "AST": 4.4,
        "STL": 1.0,
        "BLK": 0.4,
        "TOV": 1.7,
        "PF": 1.9,
        "PTS": 22.2
      },
      "advanced": {
        "USG%": "25.4%",
        "TS%": "56.9%",
        "AST%": "19.6%",
        "TRB%": "6.0%",
        "ORB%": "2.2%",
        "DRB%": "9.8%",
        "STL%": "1.4%",
        "BLK%": "1.0%",
        "TOV%": "8.0%"
      }
    },
    {
      "name": "Keegan Murray",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 82,
      "real_ovr": 81,
      "id": 1631099,
      "basic": {
        "MP": 34.3,
        "FGA": 10.8,
        "FG%": "44.4%",
        "3PA": 5.9,
        "3P%": "34.3%",
        "FTA": 1.0,
        "FT%": "83.3%",
        "ORB": 1.9,
        "DRB": 4.8,
        "AST": 1.4,
        "STL": 0.8,
        "BLK": 0.9,
        "TOV": 0.8,
        "PF": 2.5,
        "PTS": 12.4
      },
      "advanced": {
        "USG%": "15.4%",
        "TS%": "55.2%",
        "AST%": "5.8%",
        "TRB%": "10.6%",
        "ORB%": "6.2%",
        "DRB%": "15.1%",
        "STL%": "1.1%",
        "BLK%": "2.4%",
        "TOV%": "6.7%"
      }
    },
    {
      "name": "Malik Monk",
      "pos": [
        "SG"
      ],
      "ovr": 81,
      "real_ovr": 82,
      "id": 1628370,
      "basic": {
        "MP": 31.6,
        "FGA": 14.4,
        "FG%": "43.9%",
        "3PA": 6.6,
        "3P%": "32.5%",
        "FTA": 2.7,
        "FT%": "83.2%",
        "ORB": 0.6,
        "DRB": 3.1,
        "AST": 5.6,
        "STL": 0.8,
        "BLK": 0.5,
        "TOV": 2.2,
        "PF": 2.0,
        "PTS": 17.2
      },
      "advanced": {
        "USG%": "24.8%",
        "TS%": "54.9%",
        "AST%": "26.4%",
        "TRB%": "6.4%",
        "ORB%": "2.1%",
        "DRB%": "10.7%",
        "STL%": "1.2%",
        "BLK%": "1.4%",
        "TOV%": "12.3%"
      }
    },
    {
      "name": "Keon Ellis",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1631165,
      "basic": {
        "MP": 24.4,
        "FGA": 5.8,
        "FG%": "48.9%",
        "3PA": 4.0,
        "3P%": "43.3%",
        "FTA": 1.1,
        "FT%": "78.4%",
        "ORB": 0.7,
        "DRB": 2.1,
        "AST": 1.5,
        "STL": 1.4,
        "BLK": 0.6,
        "TOV": 0.7,
        "PF": 2.2,
        "PTS": 8.1
      },
      "advanced": {
        "USG%": "13.2%",
        "TS%": "64.5%",
        "AST%": "8.8%",
        "TRB%": "6.3%",
        "ORB%": "3.2%",
        "DRB%": "9.4%",
        "STL%": "2.8%",
        "BLK%": "2.2%",
        "TOV%": "10.0%"
      }
    },
    {
      "name": "Kevin Huerter",
      "pos": [
        "SG"
      ],
      "ovr": 77,
      "real_ovr": 77,
      "id": 1628989,
      "basic": {
        "MP": 24.3,
        "FGA": 8.8,
        "FG%": "42.5%",
        "3PA": 5.7,
        "3P%": "33.8%",
        "FTA": 0.7,
        "FT%": "71.4%",
        "ORB": 0.6,
        "DRB": 2.4,
        "AST": 2.3,
        "STL": 1.0,
        "BLK": 0.3,
        "TOV": 1.0,
        "PF": 1.9,
        "PTS": 9.9
      },
      "advanced": {
        "USG%": "18.3%",
        "TS%": "54.3%",
        "AST%": "13.2%",
        "TRB%": "6.7%",
        "ORB%": "2.7%",
        "DRB%": "10.8%",
        "STL%": "2.0%",
        "BLK%": "1.1%",
        "TOV%": "9.9%"
      }
    },
    {
      "name": "Trey Lyles",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 77,
      "real_ovr": 76,
      "id": 1626168,
      "basic": {
        "MP": 19.6,
        "FGA": 5.4,
        "FG%": "42.0%",
        "3PA": 3.4,
        "3P%": "34.0%",
        "FTA": 1.2,
        "FT%": "70.0%",
        "ORB": 1.2,
        "DRB": 3.4,
        "AST": 1.2,
        "STL": 0.6,
        "BLK": 0.3,
        "TOV": 0.6,
        "PF": 1.3,
        "PTS": 6.5
      },
      "advanced": {
        "USG%": "14.6%",
        "TS%": "54.9%",
        "AST%": "8.5%",
        "TRB%": "12.7%",
        "ORB%": "6.6%",
        "DRB%": "18.9%",
        "STL%": "1.5%",
        "BLK%": "1.4%",
        "TOV%": "9.2%"
      }
    },
    {
      "name": "Alex Len",
      "pos": [
        "C"
      ],
      "ovr": 75,
      "real_ovr": 74,
      "id": 203458,
      "basic": {
        "MP": 8.3,
        "FGA": 1.4,
        "FG%": "50.8%",
        "3PA": 0.2,
        "3P%": "22.2%",
        "FTA": 0.7,
        "FT%": "55.6%",
        "ORB": 0.9,
        "DRB": 1.5,
        "AST": 0.7,
        "STL": 0.2,
        "BLK": 0.5,
        "TOV": 0.4,
        "PF": 1.4,
        "PTS": 1.9
      },
      "advanced": {
        "USG%": "11.3%",
        "TS%": "55.6%",
        "AST%": "11.2%",
        "TRB%": "15.8%",
        "ORB%": "12.1%",
        "DRB%": "19.5%",
        "STL%": "1.2%",
        "BLK%": "5.3%",
        "TOV%": "18.9%"
      }
    },
    {
      "name": "Devin Carter",
      "pos": [
        "PG"
      ],
      "ovr": 75,
      "real_ovr": 74,
      "id": 1642269,
      "basic": {
        "MP": 11.0,
        "FGA": 3.5,
        "FG%": "37.0%",
        "3PA": 1.7,
        "3P%": "29.5%",
        "FTA": 0.8,
        "FT%": "59.1%",
        "ORB": 0.5,
        "DRB": 1.6,
        "AST": 1.1,
        "STL": 0.6,
        "BLK": 0.1,
        "TOV": 0.5,
        "PF": 1.3,
        "PTS": 3.8
      },
      "advanced": {
        "USG%": "17.4%",
        "TS%": "49.3%",
        "AST%": "13.6%",
        "TRB%": "10.4%",
        "ORB%": "5.0%",
        "DRB%": "15.8%",
        "STL%": "2.6%",
        "BLK%": "0.8%",
        "TOV%": "11.5%"
      }
    },
    {
      "name": "Doug McDermott",
      "pos": [
        "SF"
      ],
      "ovr": 75,
      "real_ovr": 73,
      "id": 203926,
      "basic": {
        "MP": 8.1,
        "FGA": 2.8,
        "FG%": "42.7%",
        "3PA": 2.4,
        "3P%": "43.6%",
        "FTA": 0.1,
        "FT%": "60.0%",
        "ORB": 0.1,
        "DRB": 0.5,
        "AST": 0.2,
        "STL": 0.1,
        "BLK": 0.0,
        "TOV": 0.1,
        "PF": 0.7,
        "PTS": 3.5
      },
      "advanced": {
        "USG%": "16.8%",
        "TS%": "61.6%",
        "AST%": "3.3%",
        "TRB%": "3.5%",
        "ORB%": "1.0%",
        "DRB%": "6.0%",
        "STL%": "0.6%",
        "BLK%": "0.5%",
        "TOV%": "3.4%"
      }
    },
    {
      "name": "Jordan McLaughlin",
      "pos": [
        "PG"
      ],
      "ovr": 75,
      "real_ovr": 74,
      "id": 1629162,
      "basic": {
        "MP": 6.8,
        "FGA": 1.6,
        "FG%": "43.1%",
        "3PA": 1.0,
        "3P%": "41.3%",
        "FTA": 0.3,
        "FT%": "66.7%",
        "ORB": 0.2,
        "DRB": 0.6,
        "AST": 1.2,
        "STL": 0.3,
        "BLK": 0.1,
        "TOV": 0.3,
        "PF": 0.5,
        "PTS": 2.1
      },
      "advanced": {
        "USG%": "13.5%",
        "TS%": "60.6%",
        "AST%": "24.1%",
        "TRB%": "6.4%",
        "ORB%": "3.2%",
        "DRB%": "9.6%",
        "STL%": "2.2%",
        "BLK%": "1.2%",
        "TOV%": "14.8%"
      }
    },
    {
      "name": "Jalen McDaniels",
      "pos": [
        "PF"
      ],
      "ovr": 74,
      "real_ovr": 71,
      "id": 1629667,
      "basic": {
        "MP": 1.8,
        "FGA": 0.0,
        "FG%": "0.0%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 0.0,
        "FT%": "0.0%",
        "ORB": 0.0,
        "DRB": 0.0,
        "AST": 0.3,
        "STL": 0.3,
        "BLK": 0.0,
        "TOV": 0.0,
        "PF": 0.0,
        "PTS": 0.0
      },
      "advanced": {
        "USG%": "0.0%",
        "TS%": "0.0%",
        "AST%": "17.4%",
        "TRB%": "0.0%",
        "ORB%": "0.0%",
        "DRB%": "0.0%",
        "STL%": "6.8%",
        "BLK%": "0.0%",
        "TOV%": "0.0%"
      }
    },
    {
      "name": "Colby Jones",
      "pos": [
        "SG"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1641732,
      "basic": {
        "MP": 13.2,
        "FGA": 3.3,
        "FG%": "45.7%",
        "3PA": 1.3,
        "3P%": "32.7%",
        "FTA": 1.1,
        "FT%": "53.8%",
        "ORB": 0.6,
        "DRB": 1.5,
        "AST": 1.3,
        "STL": 0.6,
        "BLK": 0.2,
        "TOV": 0.6,
        "PF": 1.2,
        "PTS": 4.5
      },
      "advanced": {
        "USG%": "15.4%",
        "TS%": "53.8%",
        "AST%": "13.2%",
        "TRB%": "8.7%",
        "ORB%": "5.1%",
        "DRB%": "12.3%",
        "STL%": "2.2%",
        "BLK%": "1.3%",
        "TOV%": "13.6%"
      }
    },
    {
      "name": "Orlando Robinson",
      "pos": [
        "C"
      ],
      "ovr": 73,
      "real_ovr": 76,
      "id": 1631115,
      "basic": {
        "MP": 17.5,
        "FGA": 5.9,
        "FG%": "44.4%",
        "3PA": 1.2,
        "3P%": "32.7%",
        "FTA": 1.3,
        "FT%": "76.4%",
        "ORB": 2.0,
        "DRB": 3.0,
        "AST": 1.8,
        "STL": 0.4,
        "BLK": 0.4,
        "TOV": 1.1,
        "PF": 2.3,
        "PTS": 6.9
      },
      "advanced": {
        "USG%": "19.3%",
        "TS%": "53.2%",
        "AST%": "14.5%",
        "TRB%": "15.4%",
        "ORB%": "12.5%",
        "DRB%": "18.3%",
        "STL%": "1.1%",
        "BLK%": "2.0%",
        "TOV%": "14.5%"
      }
    }
  ]
,
  "SAS": [
    {
      "name": "Victor Wembanyama",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 97,
      "real_ovr": 94,
      "id": 1641705,
      "basic": {
        "MP": 33.2,
        "FGA": 18.2,
        "FG%": "47.8%",
        "3PA": 8.8,
        "3P%": "35.2%",
        "FTA": 5.8,
        "FT%": "83.6%",
        "ORB": 2.3,
        "DRB": 8.7,
        "AST": 3.7,
        "STL": 1.1,
        "BLK": 3.8,
        "TOV": 3.1,
        "PF": 2.4,
        "PTS": 24.3
      },
      "advanced": {
        "USG%": "31.4%",
        "TS%": "58.6%",
        "AST%": "19.3%",
        "TRB%": "17.7%",
        "ORB%": "7.5%",
        "DRB%": "27.6%",
        "STL%": "1.6%",
        "BLK%": "9.8%",
        "TOV%": "12.9%"
      }
    },
    {
      "name": "Chris Paul",
      "pos": [
        "PG"
      ],
      "ovr": 83,
      "real_ovr": 81,
      "id": 101108,
      "basic": {
        "MP": 28.2,
        "FGA": 7.4,
        "FG%": "43.2%",
        "3PA": 3.8,
        "3P%": "37.4%",
        "FTA": 1.2,
        "FT%": "90.9%",
        "ORB": 0.4,
        "DRB": 3.3,
        "AST": 7.8,
        "STL": 1.3,
        "BLK": 0.2,
        "TOV": 1.6,
        "PF": 1.9,
        "PTS": 8.8
      },
      "advanced": {
        "USG%": "14.8%",
        "TS%": "55.5%",
        "AST%": "36.2%",
        "TRB%": "7.1%",
        "ORB%": "1.5%",
        "DRB%": "12.6%",
        "STL%": "2.3%",
        "BLK%": "0.6%",
        "TOV%": "16.8%"
      }
    },
    {
      "name": "Devin Vassell",
      "pos": [
        "SG"
      ],
      "ovr": 83,
      "real_ovr": 83,
      "id": 1630170,
      "basic": {
        "MP": 30.6,
        "FGA": 13.9,
        "FG%": "45.1%",
        "3PA": 6.3,
        "3P%": "37.5%",
        "FTA": 2.4,
        "FT%": "80.5%",
        "ORB": 0.6,
        "DRB": 3.3,
        "AST": 3.2,
        "STL": 1.1,
        "BLK": 0.4,
        "TOV": 1.4,
        "PF": 1.7,
        "PTS": 16.3
      },
      "advanced": {
        "USG%": "24.2%",
        "TS%": "54.5%",
        "AST%": "16.8%",
        "TRB%": "6.8%",
        "ORB%": "2.2%",
        "DRB%": "11.5%",
        "STL%": "1.7%",
        "BLK%": "1.1%",
        "TOV%": "8.6%"
      }
    },
    {
      "name": "Keldon Johnson",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 81,
      "real_ovr": 80,
      "id": 1629640,
      "basic": {
        "MP": 25.4,
        "FGA": 10.4,
        "FG%": "48.2%",
        "3PA": 4.1,
        "3P%": "35.3%",
        "FTA": 2.9,
        "FT%": "78.0%",
        "ORB": 1.2,
        "DRB": 3.8,
        "AST": 1.6,
        "STL": 0.7,
        "BLK": 0.3,
        "TOV": 1.2,
        "PF": 1.8,
        "PTS": 13.3
      },
      "advanced": {
        "USG%": "22.6%",
        "TS%": "57.0%",
        "AST%": "10.3%",
        "TRB%": "10.6%",
        "ORB%": "5.2%",
        "DRB%": "15.9%",
        "STL%": "1.4%",
        "BLK%": "0.9%",
        "TOV%": "9.3%"
      }
    },
    {
      "name": "Harrison Barnes",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 80,
      "real_ovr": 80,
      "id": 203084,
      "basic": {
        "MP": 29.5,
        "FGA": 8.6,
        "FG%": "49.5%",
        "3PA": 4.0,
        "3P%": "42.5%",
        "FTA": 2.8,
        "FT%": "81.9%",
        "ORB": 1.0,
        "DRB": 3.0,
        "AST": 1.7,
        "STL": 0.6,
        "BLK": 0.2,
        "TOV": 0.9,
        "PF": 1.4,
        "PTS": 12.3
      },
      "advanced": {
        "USG%": "16.4%",
        "TS%": "62.6%",
        "AST%": "8.8%",
        "TRB%": "7.3%",
        "ORB%": "3.8%",
        "DRB%": "10.9%",
        "STL%": "1.0%",
        "BLK%": "0.7%",
        "TOV%": "8.3%"
      }
    },
    {
      "name": "Jeremy Sochan",
      "pos": [
        "PF"
      ],
      "ovr": 80,
      "real_ovr": 81,
      "id": 1631110,
      "basic": {
        "MP": 27.6,
        "FGA": 9.4,
        "FG%": "51.1%",
        "3PA": 1.8,
        "3P%": "31.2%",
        "FTA": 2.8,
        "FT%": "71.6%",
        "ORB": 2.1,
        "DRB": 4.7,
        "AST": 2.4,
        "STL": 0.8,
        "BLK": 0.5,
        "TOV": 1.5,
        "PF": 2.3,
        "PTS": 11.9
      },
      "advanced": {
        "USG%": "19.3%",
        "TS%": "56.1%",
        "AST%": "13.4%",
        "TRB%": "13.2%",
        "ORB%": "8.4%",
        "DRB%": "17.9%",
        "STL%": "1.4%",
        "BLK%": "1.5%",
        "TOV%": "12.3%"
      }
    },
    {
      "name": "Stephon Castle",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 78,
      "real_ovr": 80,
      "id": 1642264,
      "basic": {
        "MP": 27.3,
        "FGA": 11.2,
        "FG%": "43.4%",
        "3PA": 3.8,
        "3P%": "28.5%",
        "FTA": 3.7,
        "FT%": "72.7%",
        "ORB": 1.1,
        "DRB": 2.5,
        "AST": 4.0,
        "STL": 0.9,
        "BLK": 0.3,
        "TOV": 2.0,
        "PF": 2.4,
        "PTS": 12.8
      },
      "advanced": {
        "USG%": "23.4%",
        "TS%": "50.1%",
        "AST%": "23.1%",
        "TRB%": "7.1%",
        "ORB%": "4.4%",
        "DRB%": "9.8%",
        "STL%": "1.6%",
        "BLK%": "0.9%",
        "TOV%": "13.4%"
      }
    },
    {
      "name": "Tre Jones",
      "pos": [
        "PG"
      ],
      "ovr": 78,
      "real_ovr": 77,
      "id": 1630200,
      "basic": {
        "MP": 19.4,
        "FGA": 5.2,
        "FG%": "48.2%",
        "3PA": 1.4,
        "3P%": "36.4%",
        "FTA": 1.4,
        "FT%": "83.6%",
        "ORB": 0.4,
        "DRB": 1.9,
        "AST": 4.1,
        "STL": 0.8,
        "BLK": 0.1,
        "TOV": 1.0,
        "PF": 1.1,
        "PTS": 6.3
      },
      "advanced": {
        "USG%": "15.4%",
        "TS%": "54.8%",
        "AST%": "29.7%",
        "TRB%": "6.3%",
        "ORB%": "2.2%",
        "DRB%": "10.4%",
        "STL%": "2.0%",
        "BLK%": "0.4%",
        "TOV%": "14.6%"
      }
    },
    {
      "name": "Zach Collins",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 78,
      "real_ovr": 76,
      "id": 1628380,
      "basic": {
        "MP": 14.5,
        "FGA": 4.6,
        "FG%": "47.8%",
        "3PA": 1.1,
        "3P%": "30.8%",
        "FTA": 1.3,
        "FT%": "77.8%",
        "ORB": 1.1,
        "DRB": 2.9,
        "AST": 1.6,
        "STL": 0.5,
        "BLK": 0.5,
        "TOV": 1.2,
        "PF": 2.5,
        "PTS": 5.4
      },
      "advanced": {
        "USG%": "18.8%",
        "TS%": "52.5%",
        "AST%": "16.1%",
        "TRB%": "14.7%",
        "ORB%": "8.4%",
        "DRB%": "20.9%",
        "STL%": "1.7%",
        "BLK%": "3.1%",
        "TOV%": "18.8%"
      }
    },
    {
      "name": "Julian Champagnie",
      "pos": [
        "SF"
      ],
      "ovr": 76,
      "real_ovr": 77,
      "id": 1630577,
      "basic": {
        "MP": 25.1,
        "FGA": 7.9,
        "FG%": "41.6%",
        "3PA": 5.4,
        "3P%": "37.2%",
        "FTA": 1.0,
        "FT%": "84.4%",
        "ORB": 0.8,
        "DRB": 2.8,
        "AST": 1.4,
        "STL": 0.8,
        "BLK": 0.4,
        "TOV": 0.7,
        "PF": 1.9,
        "PTS": 9.2
      },
      "advanced": {
        "USG%": "16.0%",
        "TS%": "55.4%",
        "AST%": "8.3%",
        "TRB%": "7.7%",
        "ORB%": "3.5%",
        "DRB%": "11.8%",
        "STL%": "1.6%",
        "BLK%": "1.4%",
        "TOV%": "7.7%"
      }
    },
    {
      "name": "Malaki Branham",
      "pos": [
        "SG"
      ],
      "ovr": 76,
      "real_ovr": 75,
      "id": 1631103,
      "basic": {
        "MP": 15.8,
        "FGA": 6.3,
        "FG%": "45.0%",
        "3PA": 2.4,
        "3P%": "37.5%",
        "FTA": 0.9,
        "FT%": "81.0%",
        "ORB": 0.3,
        "DRB": 1.4,
        "AST": 1.5,
        "STL": 0.4,
        "BLK": 0.1,
        "TOV": 0.7,
        "PF": 1.1,
        "PTS": 7.2
      },
      "advanced": {
        "USG%": "20.5%",
        "TS%": "53.6%",
        "AST%": "15.0%",
        "TRB%": "5.7%",
        "ORB%": "2.1%",
        "DRB%": "9.4%",
        "STL%": "1.3%",
        "BLK%": "0.6%",
        "TOV%": "9.4%"
      }
    },
    {
      "name": "Blake Wesley",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 75,
      "real_ovr": 74,
      "id": 1631104,
      "basic": {
        "MP": 12.3,
        "FGA": 3.7,
        "FG%": "42.7%",
        "3PA": 1.2,
        "3P%": "29.4%",
        "FTA": 1.1,
        "FT%": "66.7%",
        "ORB": 0.3,
        "DRB": 1.0,
        "AST": 2.1,
        "STL": 0.6,
        "BLK": 0.1,
        "TOV": 0.9,
        "PF": 1.2,
        "PTS": 4.1
      },
      "advanced": {
        "USG%": "18.3%",
        "TS%": "48.9%",
        "AST%": "25.0%",
        "TRB%": "5.6%",
        "ORB%": "2.7%",
        "DRB%": "8.6%",
        "STL%": "2.4%",
        "BLK%": "0.7%",
        "TOV%": "17.7%"
      }
    },
    {
      "name": "Sandro Mamukelashvili",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1630572,
      "basic": {
        "MP": 10.8,
        "FGA": 3.5,
        "FG%": "46.2%",
        "3PA": 1.6,
        "3P%": "34.6%",
        "FTA": 0.9,
        "FT%": "72.2%",
        "ORB": 0.9,
        "DRB": 2.1,
        "AST": 0.9,
        "STL": 0.4,
        "BLK": 0.3,
        "TOV": 0.5,
        "PF": 1.0,
        "PTS": 4.5
      },
      "advanced": {
        "USG%": "17.5%",
        "TS%": "57.7%",
        "AST%": "12.7%",
        "TRB%": "14.8%",
        "ORB%": "9.1%",
        "DRB%": "20.5%",
        "STL%": "1.8%",
        "BLK%": "2.4%",
        "TOV%": "11.3%"
      }
    },
    {
      "name": "Charles Bassey",
      "pos": [
        "C"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1629646,
      "basic": {
        "MP": 10.5,
        "FGA": 2.4,
        "FG%": "58.8%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 1.1,
        "FT%": "63.6%",
        "ORB": 1.4,
        "DRB": 2.4,
        "AST": 0.7,
        "STL": 0.3,
        "BLK": 0.8,
        "TOV": 0.7,
        "PF": 1.7,
        "PTS": 3.6
      },
      "advanced": {
        "USG%": "14.8%",
        "TS%": "62.4%",
        "AST%": "9.8%",
        "TRB%": "19.2%",
        "ORB%": "14.6%",
        "DRB%": "23.8%",
        "STL%": "1.4%",
        "BLK%": "6.8%",
        "TOV%": "19.5%"
      }
    },
    {
      "name": "Sidy Cissoko",
      "pos": [
        "SG"
      ],
      "ovr": 73,
      "real_ovr": 72,
      "id": 1631321,
      "basic": {
        "MP": 6.8,
        "FGA": 1.5,
        "FG%": "36.8%",
        "3PA": 0.6,
        "3P%": "20.0%",
        "FTA": 0.8,
        "FT%": "60.0%",
        "ORB": 0.4,
        "DRB": 1.0,
        "AST": 0.6,
        "STL": 0.3,
        "BLK": 0.2,
        "TOV": 0.5,
        "PF": 0.8,
        "PTS": 1.8
      },
      "advanced": {
        "USG%": "15.3%",
        "TS%": "48.6%",
        "AST%": "12.5%",
        "TRB%": "10.9%",
        "ORB%": "6.3%",
        "DRB%": "15.6%",
        "STL%": "2.2%",
        "BLK%": "2.6%",
        "TOV%": "21.3%"
      }
    }
  ]
,
  "TOR": [
    {
      "name": "Scottie Barnes",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 86,
      "real_ovr": 86,
      "id": 1630567,
      "basic": {
        "MP": 32.8,
        "FGA": 15.6,
        "FG%": "46.1%",
        "3PA": 4.5,
        "3P%": "31.5%",
        "FTA": 4.9,
        "FT%": "77.1%",
        "ORB": 2.2,
        "DRB": 6.1,
        "AST": 6.0,
        "STL": 1.4,
        "BLK": 1.1,
        "TOV": 2.7,
        "PF": 2.2,
        "PTS": 19.3
      },
      "advanced": {
        "USG%": "25.7%",
        "TS%": "54.8%",
        "AST%": "27.4%",
        "TRB%": "13.6%",
        "ORB%": "7.3%",
        "DRB%": "19.8%",
        "STL%": "2.0%",
        "BLK%": "2.9%",
        "TOV%": "13.2%"
      }
    },
    {
      "name": "RJ Barrett",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 83,
      "real_ovr": 85,
      "id": 1629628,
      "basic": {
        "MP": 32.5,
        "FGA": 16.5,
        "FG%": "47.8%",
        "3PA": 5.2,
        "3P%": "34.6%",
        "FTA": 5.3,
        "FT%": "67.7%",
        "ORB": 1.5,
        "DRB": 4.8,
        "AST": 5.6,
        "STL": 0.8,
        "BLK": 0.3,
        "TOV": 2.8,
        "PF": 2.0,
        "PTS": 21.1
      },
      "advanced": {
        "USG%": "27.9%",
        "TS%": "56.0%",
        "AST%": "25.8%",
        "TRB%": "10.4%",
        "ORB%": "5.0%",
        "DRB%": "15.8%",
        "STL%": "1.2%",
        "BLK%": "0.8%",
        "TOV%": "13.0%"
      }
    },
    {
      "name": "Jakob Poeltl",
      "pos": [
        "C"
      ],
      "ovr": 82,
      "real_ovr": 84,
      "id": 1627751,
      "basic": {
        "MP": 29.8,
        "FGA": 9.9,
        "FG%": "61.3%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 3.7,
        "FT%": "65.5%",
        "ORB": 3.8,
        "DRB": 6.8,
        "AST": 2.8,
        "STL": 1.1,
        "BLK": 1.3,
        "TOV": 1.8,
        "PF": 3.1,
        "PTS": 14.2
      },
      "advanced": {
        "USG%": "18.6%",
        "TS%": "62.4%",
        "AST%": "13.5%",
        "TRB%": "19.0%",
        "ORB%": "13.7%",
        "DRB%": "24.3%",
        "STL%": "1.8%",
        "BLK%": "3.8%",
        "TOV%": "13.5%"
      }
    },
    {
      "name": "Immanuel Quickley",
      "pos": [
        "PG"
      ],
      "ovr": 82,
      "real_ovr": 83,
      "id": 1630193,
      "basic": {
        "MP": 29.8,
        "FGA": 13.5,
        "FG%": "42.5%",
        "3PA": 6.7,
        "3P%": "37.5%",
        "FTA": 4.1,
        "FT%": "87.0%",
        "ORB": 0.6,
        "DRB": 3.0,
        "AST": 5.9,
        "STL": 0.8,
        "BLK": 0.2,
        "TOV": 2.1,
        "PF": 2.2,
        "PTS": 17.1
      },
      "advanced": {
        "USG%": "24.4%",
        "TS%": "56.6%",
        "AST%": "28.5%",
        "TRB%": "6.5%",
        "ORB%": "2.2%",
        "DRB%": "10.8%",
        "STL%": "1.3%",
        "BLK%": "0.6%",
        "TOV%": "12.0%"
      }
    },
    {
      "name": "Gradey Dick",
      "pos": [
        "SG"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1641711,
      "basic": {
        "MP": 29.6,
        "FGA": 12.8,
        "FG%": "41.8%",
        "3PA": 6.3,
        "3P%": "35.2%",
        "FTA": 2.7,
        "FT%": "87.8%",
        "ORB": 0.9,
        "DRB": 2.8,
        "AST": 1.8,
        "STL": 0.9,
        "BLK": 0.2,
        "TOV": 1.3,
        "PF": 2.0,
        "PTS": 14.9
      },
      "advanced": {
        "USG%": "21.6%",
        "TS%": "53.6%",
        "AST%": "9.1%",
        "TRB%": "6.6%",
        "ORB%": "3.3%",
        "DRB%": "10.0%",
        "STL%": "1.5%",
        "BLK%": "0.6%",
        "TOV%": "8.5%"
      }
    },
    {
      "name": "Bruce Brown",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 78,
      "real_ovr": 77,
      "id": 1628971,
      "basic": {
        "MP": 22.8,
        "FGA": 7.4,
        "FG%": "44.2%",
        "3PA": 2.2,
        "3P%": "32.6%",
        "FTA": 1.7,
        "FT%": "81.6%",
        "ORB": 1.1,
        "DRB": 2.8,
        "AST": 2.3,
        "STL": 0.9,
        "BLK": 0.3,
        "TOV": 1.1,
        "PF": 2.1,
        "PTS": 8.4
      },
      "advanced": {
        "USG%": "17.3%",
        "TS%": "52.3%",
        "AST%": "14.2%",
        "TRB%": "9.2%",
        "ORB%": "5.3%",
        "DRB%": "13.2%",
        "STL%": "1.9%",
        "BLK%": "1.1%",
        "TOV%": "11.8%"
      }
    },
    {
      "name": "Kelly Olynyk",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 203482,
      "basic": {
        "MP": 19.3,
        "FGA": 6.3,
        "FG%": "48.2%",
        "3PA": 2.7,
        "3P%": "38.1%",
        "FTA": 1.6,
        "FT%": "82.5%",
        "ORB": 1.1,
        "DRB": 3.7,
        "AST": 3.0,
        "STL": 0.8,
        "BLK": 0.5,
        "TOV": 1.5,
        "PF": 2.6,
        "PTS": 8.1
      },
      "advanced": {
        "USG%": "18.8%",
        "TS%": "58.5%",
        "AST%": "21.6%",
        "TRB%": "13.4%",
        "ORB%": "6.3%",
        "DRB%": "20.4%",
        "STL%": "1.9%",
        "BLK%": "2.2%",
        "TOV%": "17.6%"
      }
    },
    {
      "name": "Davion Mitchell",
      "pos": [
        "PG"
      ],
      "ovr": 77,
      "real_ovr": 78,
      "id": 1630558,
      "basic": {
        "MP": 24.3,
        "FGA": 6.5,
        "FG%": "45.2%",
        "3PA": 2.8,
        "3P%": "38.5%",
        "FTA": 1.2,
        "FT%": "74.4%",
        "ORB": 0.4,
        "DRB": 1.6,
        "AST": 4.5,
        "STL": 0.8,
        "BLK": 0.2,
        "TOV": 1.5,
        "PF": 2.0,
        "PTS": 7.3
      },
      "advanced": {
        "USG%": "15.7%",
        "TS%": "52.8%",
        "AST%": "25.2%",
        "TRB%": "4.4%",
        "ORB%": "1.8%",
        "DRB%": "7.1%",
        "STL%": "1.6%",
        "BLK%": "0.7%",
        "TOV%": "17.5%"
      }
    },
    {
      "name": "Chris Boucher",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 77,
      "real_ovr": 78,
      "id": 1628449,
      "basic": {
        "MP": 16.8,
        "FGA": 6.5,
        "FG%": "49.0%",
        "3PA": 3.4,
        "3P%": "36.8%",
        "FTA": 2.1,
        "FT%": "77.5%",
        "ORB": 1.5,
        "DRB": 2.9,
        "AST": 0.7,
        "STL": 0.5,
        "BLK": 0.7,
        "TOV": 0.6,
        "PF": 1.9,
        "PTS": 9.4
      },
      "advanced": {
        "USG%": "19.8%",
        "TS%": "64.1%",
        "AST%": "6.0%",
        "TRB%": "14.1%",
        "ORB%": "9.8%",
        "DRB%": "18.3%",
        "STL%": "1.4%",
        "BLK%": "3.5%",
        "TOV%": "7.5%"
      }
    },
    {
      "name": "Ochai Agbaji",
      "pos": [
        "SG"
      ],
      "ovr": 76,
      "real_ovr": 78,
      "id": 1630534,
      "basic": {
        "MP": 26.5,
        "FGA": 7.4,
        "FG%": "49.2%",
        "3PA": 3.1,
        "3P%": "38.8%",
        "FTA": 1.4,
        "FT%": "71.4%",
        "ORB": 1.3,
        "DRB": 2.6,
        "AST": 1.6,
        "STL": 0.8,
        "BLK": 0.5,
        "TOV": 0.9,
        "PF": 2.2,
        "PTS": 9.1
      },
      "advanced": {
        "USG%": "14.3%",
        "TS%": "57.7%",
        "AST%": "8.8%",
        "TRB%": "7.9%",
        "ORB%": "5.4%",
        "DRB%": "10.4%",
        "STL%": "1.5%",
        "BLK%": "1.7%",
        "TOV%": "10.1%"
      }
    },
    {
      "name": "Ja'Kobe Walter",
      "pos": [
        "SG"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1642266,
      "basic": {
        "MP": 18.2,
        "FGA": 6.8,
        "FG%": "39.5%",
        "3PA": 4.1,
        "3P%": "34.5%",
        "FTA": 1.4,
        "FT%": "80.0%",
        "ORB": 0.6,
        "DRB": 1.9,
        "AST": 1.2,
        "STL": 0.7,
        "BLK": 0.2,
        "TOV": 0.8,
        "PF": 1.6,
        "PTS": 7.3
      },
      "advanced": {
        "USG%": "19.3%",
        "TS%": "50.4%",
        "AST%": "9.8%",
        "TRB%": "7.3%",
        "ORB%": "3.5%",
        "DRB%": "11.1%",
        "STL%": "1.9%",
        "BLK%": "0.9%",
        "TOV%": "9.8%"
      }
    },
    {
      "name": "Jonathan Mogbo",
      "pos": [
        "PF"
      ],
      "ovr": 75,
      "real_ovr": 77,
      "id": 1642367,
      "basic": {
        "MP": 18.6,
        "FGA": 4.8,
        "FG%": "50.5%",
        "3PA": 0.2,
        "3P%": "18.2%",
        "FTA": 1.6,
        "FT%": "67.1%",
        "ORB": 2.1,
        "DRB": 3.2,
        "AST": 2.0,
        "STL": 0.9,
        "BLK": 0.6,
        "TOV": 1.1,
        "PF": 2.0,
        "PTS": 5.9
      },
      "advanced": {
        "USG%": "14.5%",
        "TS%": "54.6%",
        "AST%": "15.0%",
        "TRB%": "15.3%",
        "ORB%": "12.3%",
        "DRB%": "18.3%",
        "STL%": "2.4%",
        "BLK%": "2.6%",
        "TOV%": "16.7%"
      }
    },
    {
      "name": "Jamal Shead",
      "pos": [
        "PG"
      ],
      "ovr": 75,
      "real_ovr": 76,
      "id": 1642347,
      "basic": {
        "MP": 17.5,
        "FGA": 5.2,
        "FG%": "38.6%",
        "3PA": 1.9,
        "3P%": "30.3%",
        "FTA": 1.2,
        "FT%": "77.8%",
        "ORB": 0.4,
        "DRB": 1.2,
        "AST": 3.9,
        "STL": 0.9,
        "BLK": 0.1,
        "TOV": 1.4,
        "PF": 1.7,
        "PTS": 5.3
      },
      "advanced": {
        "USG%": "17.6%",
        "TS%": "47.2%",
        "AST%": "30.4%",
        "TRB%": "4.9%",
        "ORB%": "2.5%",
        "DRB%": "7.3%",
        "STL%": "2.5%",
        "BLK%": "0.5%",
        "TOV%": "19.6%"
      }
    },
    {
      "name": "Garrett Temple",
      "pos": [
        "SG"
      ],
      "ovr": 73,
      "real_ovr": 72,
      "id": 202066,
      "basic": {
        "MP": 7.4,
        "FGA": 1.7,
        "FG%": "31.8%",
        "3PA": 1.2,
        "3P%": "27.3%",
        "FTA": 0.3,
        "FT%": "75.0%",
        "ORB": 0.2,
        "DRB": 0.7,
        "AST": 0.6,
        "STL": 0.2,
        "BLK": 0.1,
        "TOV": 0.2,
        "PF": 0.8,
        "PTS": 1.6
      },
      "advanced": {
        "USG%": "11.7%",
        "TS%": "44.0%",
        "AST%": "10.4%",
        "TRB%": "6.5%",
        "ORB%": "3.0%",
        "DRB%": "10.1%",
        "STL%": "1.3%",
        "BLK%": "1.1%",
        "TOV%": "10.0%"
      }
    },
    {
      "name": "Chomche Ulrich",
      "pos": [
        "C"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 1642279,
      "basic": {
        "MP": 5.8,
        "FGA": 1.3,
        "FG%": "42.9%",
        "3PA": 0.2,
        "3P%": "0.0%",
        "FTA": 0.6,
        "FT%": "50.0%",
        "ORB": 0.6,
        "DRB": 1.1,
        "AST": 0.2,
        "STL": 0.2,
        "BLK": 0.4,
        "TOV": 0.4,
        "PF": 0.9,
        "PTS": 1.5
      },
      "advanced": {
        "USG%": "14.2%",
        "TS%": "47.9%",
        "AST%": "4.8%",
        "TRB%": "15.8%",
        "ORB%": "11.4%",
        "DRB%": "20.1%",
        "STL%": "1.7%",
        "BLK%": "5.6%",
        "TOV%": "20.4%"
      }
    }
  ]
,
  "UTA": [
    {
      "name": "Lauri Markkanen",
      "pos": [
        "PF"
      ],
      "ovr": 86,
      "real_ovr": 85,
      "id": 1628374,
      "basic": {
        "MP": 31.8,
        "FGA": 14.1,
        "FG%": "44.2%",
        "3PA": 7.4,
        "3P%": "35.8%",
        "FTA": 4.8,
        "FT%": "88.5%",
        "ORB": 1.4,
        "DRB": 5.1,
        "AST": 1.6,
        "STL": 0.8,
        "BLK": 0.5,
        "TOV": 1.4,
        "PF": 1.7,
        "PTS": 19.2
      },
      "advanced": {
        "USG%": "23.8%",
        "TS%": "59.3%",
        "AST%": "8.0%",
        "TRB%": "11.1%",
        "ORB%": "4.8%",
        "DRB%": "17.4%",
        "STL%": "1.2%",
        "BLK%": "1.3%",
        "TOV%": "8.1%"
      }
    },
    {
      "name": "Collin Sexton",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 83,
      "real_ovr": 84,
      "id": 1629012,
      "basic": {
        "MP": 27.6,
        "FGA": 13.5,
        "FG%": "48.9%",
        "3PA": 4.6,
        "3P%": "40.2%",
        "FTA": 4.2,
        "FT%": "86.8%",
        "ORB": 0.8,
        "DRB": 2.1,
        "AST": 4.2,
        "STL": 0.8,
        "BLK": 0.2,
        "TOV": 2.2,
        "PF": 2.4,
        "PTS": 18.4
      },
      "advanced": {
        "USG%": "26.7%",
        "TS%": "60.0%",
        "AST%": "23.6%",
        "TRB%": "5.6%",
        "ORB%": "3.1%",
        "DRB%": "8.2%",
        "STL%": "1.4%",
        "BLK%": "0.6%",
        "TOV%": "12.7%"
      }
    },
    {
      "name": "John Collins",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 82,
      "real_ovr": 84,
      "id": 1628381,
      "basic": {
        "MP": 28.5,
        "FGA": 11.9,
        "FG%": "52.8%",
        "3PA": 3.7,
        "3P%": "38.6%",
        "FTA": 3.4,
        "FT%": "84.7%",
        "ORB": 2.4,
        "DRB": 6.1,
        "AST": 2.3,
        "STL": 1.1,
        "BLK": 0.9,
        "TOV": 2.1,
        "PF": 3.0,
        "PTS": 17.0
      },
      "advanced": {
        "USG%": "23.1%",
        "TS%": "63.3%",
        "AST%": "11.7%",
        "TRB%": "15.9%",
        "ORB%": "9.1%",
        "DRB%": "22.8%",
        "STL%": "1.8%",
        "BLK%": "2.8%",
        "TOV%": "13.6%"
      }
    },
    {
      "name": "Walker Kessler",
      "pos": [
        "C"
      ],
      "ovr": 81,
      "real_ovr": 82,
      "id": 1631117,
      "basic": {
        "MP": 27.8,
        "FGA": 6.8,
        "FG%": "67.4%",
        "3PA": 0.1,
        "3P%": "0.0%",
        "FTA": 2.7,
        "FT%": "61.3%",
        "ORB": 3.8,
        "DRB": 7.4,
        "AST": 1.4,
        "STL": 0.6,
        "BLK": 2.6,
        "TOV": 1.5,
        "PF": 2.9,
        "PTS": 10.7
      },
      "advanced": {
        "USG%": "15.0%",
        "TS%": "67.1%",
        "AST%": "6.8%",
        "TRB%": "21.5%",
        "ORB%": "14.9%",
        "DRB%": "28.3%",
        "STL%": "1.0%",
        "BLK%": "7.8%",
        "TOV%": "15.9%"
      }
    },
    {
      "name": "Jordan Clarkson",
      "pos": [
        "SG"
      ],
      "ovr": 80,
      "real_ovr": 80,
      "id": 203903,
      "basic": {
        "MP": 26.5,
        "FGA": 13.8,
        "FG%": "41.2%",
        "3PA": 5.9,
        "3P%": "36.2%",
        "FTA": 3.0,
        "FT%": "80.4%",
        "ORB": 0.8,
        "DRB": 2.8,
        "AST": 3.9,
        "STL": 0.7,
        "BLK": 0.2,
        "TOV": 2.1,
        "PF": 1.7,
        "PTS": 16.3
      },
      "advanced": {
        "USG%": "28.3%",
        "TS%": "53.9%",
        "AST%": "22.6%",
        "TRB%": "7.3%",
        "ORB%": "3.3%",
        "DRB%": "11.3%",
        "STL%": "1.3%",
        "BLK%": "0.6%",
        "TOV%": "12.3%"
      }
    },
    {
      "name": "Keyonte George",
      "pos": [
        "PG"
      ],
      "ovr": 79,
      "real_ovr": 80,
      "id": 1641718,
      "basic": {
        "MP": 31.4,
        "FGA": 13.1,
        "FG%": "39.4%",
        "3PA": 6.8,
        "3P%": "34.4%",
        "FTA": 4.1,
        "FT%": "83.9%",
        "ORB": 0.5,
        "DRB": 3.0,
        "AST": 5.6,
        "STL": 0.9,
        "BLK": 0.2,
        "TOV": 3.0,
        "PF": 2.1,
        "PTS": 15.8
      },
      "advanced": {
        "USG%": "24.9%",
        "TS%": "53.0%",
        "AST%": "26.3%",
        "TRB%": "6.0%",
        "ORB%": "1.8%",
        "DRB%": "10.3%",
        "STL%": "1.4%",
        "BLK%": "0.5%",
        "TOV%": "16.8%"
      }
    },
    {
      "name": "Taylor Hendricks",
      "pos": [
        "PF"
      ],
      "ovr": 77,
      "real_ovr": 73,
      "id": 1641707,
      "basic": {
        "MP": 25.0,
        "FGA": 5.0,
        "FG%": "37.5%",
        "3PA": 3.7,
        "3P%": "36.4%",
        "FTA": 1.0,
        "FT%": "66.7%",
        "ORB": 1.7,
        "DRB": 3.3,
        "AST": 0.7,
        "STL": 1.7,
        "BLK": 1.3,
        "TOV": 0.7,
        "PF": 1.7,
        "PTS": 4.7
      },
      "advanced": {
        "USG%": "10.7%",
        "TS%": "43.2%",
        "AST%": "3.8%",
        "TRB%": "10.7%",
        "ORB%": "7.3%",
        "DRB%": "14.2%",
        "STL%": "3.3%",
        "BLK%": "4.6%",
        "TOV%": "11.4%"
      }
    },
    {
      "name": "Cody Williams",
      "pos": [
        "SF"
      ],
      "ovr": 76,
      "real_ovr": 72,
      "id": 1642262,
      "basic": {
        "MP": 21.0,
        "FGA": 5.8,
        "FG%": "38.2%",
        "3PA": 2.2,
        "3P%": "28.6%",
        "FTA": 1.2,
        "FT%": "70.8%",
        "ORB": 0.6,
        "DRB": 1.8,
        "AST": 1.2,
        "STL": 0.5,
        "BLK": 0.3,
        "TOV": 1.0,
        "PF": 1.5,
        "PTS": 5.6
      },
      "advanced": {
        "USG%": "15.4%",
        "TS%": "44.2%",
        "AST%": "7.9%",
        "TRB%": "6.1%",
        "ORB%": "3.1%",
        "DRB%": "9.2%",
        "STL%": "1.2%",
        "BLK%": "1.1%",
        "TOV%": "13.6%"
      }
    },
    {
      "name": "Brice Sensabaugh",
      "pos": [
        "SF"
      ],
      "ovr": 76,
      "real_ovr": 78,
      "id": 1641729,
      "basic": {
        "MP": 19.4,
        "FGA": 8.4,
        "FG%": "43.5%",
        "3PA": 4.6,
        "3P%": "38.2%",
        "FTA": 1.8,
        "FT%": "84.3%",
        "ORB": 0.7,
        "DRB": 2.5,
        "AST": 1.4,
        "STL": 0.6,
        "BLK": 0.2,
        "TOV": 1.4,
        "PF": 2.3,
        "PTS": 10.3
      },
      "advanced": {
        "USG%": "23.6%",
        "TS%": "56.1%",
        "AST%": "11.1%",
        "TRB%": "8.8%",
        "ORB%": "3.9%",
        "DRB%": "13.8%",
        "STL%": "1.5%",
        "BLK%": "0.8%",
        "TOV%": "13.3%"
      }
    },
    {
      "name": "Isaiah Collier",
      "pos": [
        "PG"
      ],
      "ovr": 75,
      "real_ovr": 77,
      "id": 1642268,
      "basic": {
        "MP": 23.9,
        "FGA": 7.4,
        "FG%": "44.0%",
        "3PA": 1.7,
        "3P%": "24.5%",
        "FTA": 2.9,
        "FT%": "69.8%",
        "ORB": 0.6,
        "DRB": 2.5,
        "AST": 5.9,
        "STL": 1.0,
        "BLK": 0.2,
        "TOV": 2.7,
        "PF": 2.8,
        "PTS": 8.5
      },
      "advanced": {
        "USG%": "20.6%",
        "TS%": "49.0%",
        "AST%": "33.5%",
        "TRB%": "6.9%",
        "ORB%": "2.7%",
        "DRB%": "11.2%",
        "STL%": "2.0%",
        "BLK%": "0.7%",
        "TOV%": "23.7%"
      }
    },
    {
      "name": "Drew Eubanks",
      "pos": [
        "C"
      ],
      "ovr": 75,
      "real_ovr": 76,
      "id": 1629234,
      "basic": {
        "MP": 14.9,
        "FGA": 3.7,
        "FG%": "60.4%",
        "3PA": 0.2,
        "3P%": "25.0%",
        "FTA": 1.5,
        "FT%": "70.2%",
        "ORB": 1.6,
        "DRB": 3.0,
        "AST": 1.1,
        "STL": 0.3,
        "BLK": 0.9,
        "TOV": 0.8,
        "PF": 1.9,
        "PTS": 5.6
      },
      "advanced": {
        "USG%": "15.2%",
        "TS%": "64.3%",
        "AST%": "10.5%",
        "TRB%": "16.5%",
        "ORB%": "11.5%",
        "DRB%": "21.6%",
        "STL%": "1.0%",
        "BLK%": "5.3%",
        "TOV%": "15.6%"
      }
    },
    {
      "name": "Kyle Filipowski",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 75,
      "real_ovr": 78,
      "id": 1642271,
      "basic": {
        "MP": 19.3,
        "FGA": 6.8,
        "FG%": "51.1%",
        "3PA": 1.7,
        "3P%": "35.2%",
        "FTA": 1.6,
        "FT%": "66.7%",
        "ORB": 1.6,
        "DRB": 3.8,
        "AST": 1.8,
        "STL": 0.7,
        "BLK": 0.7,
        "TOV": 1.2,
        "PF": 2.7,
        "PTS": 8.7
      },
      "advanced": {
        "USG%": "19.3%",
        "TS%": "58.0%",
        "AST%": "13.6%",
        "TRB%": "15.0%",
        "ORB%": "8.9%",
        "DRB%": "21.2%",
        "STL%": "1.8%",
        "BLK%": "3.1%",
        "TOV%": "13.8%"
      }
    },
    {
      "name": "Svi Mykhailiuk",
      "pos": [
        "SF"
      ],
      "ovr": 74,
      "real_ovr": 77,
      "id": 1629004,
      "basic": {
        "MP": 17.5,
        "FGA": 6.9,
        "FG%": "41.6%",
        "3PA": 4.6,
        "3P%": "36.2%",
        "FTA": 1.2,
        "FT%": "84.8%",
        "ORB": 0.4,
        "DRB": 1.8,
        "AST": 1.5,
        "STL": 0.5,
        "BLK": 0.1,
        "TOV": 0.8,
        "PF": 1.1,
        "PTS": 7.9
      },
      "advanced": {
        "USG%": "20.1%",
        "TS%": "53.2%",
        "AST%": "12.4%",
        "TRB%": "6.7%",
        "ORB%": "2.4%",
        "DRB%": "11.1%",
        "STL%": "1.4%",
        "BLK%": "0.5%",
        "TOV%": "9.7%"
      }
    },
    {
      "name": "Johnny Juzang",
      "pos": [
        "SG"
      ],
      "ovr": 74,
      "real_ovr": 76,
      "id": 1630548,
      "basic": {
        "MP": 17.7,
        "FGA": 6.6,
        "FG%": "43.3%",
        "3PA": 4.2,
        "3P%": "39.6%",
        "FTA": 0.9,
        "FT%": "87.0%",
        "ORB": 0.6,
        "DRB": 1.8,
        "AST": 1.1,
        "STL": 0.5,
        "BLK": 0.2,
        "TOV": 0.6,
        "PF": 1.4,
        "PTS": 7.9
      },
      "advanced": {
        "USG%": "18.3%",
        "TS%": "56.4%",
        "AST%": "9.0%",
        "TRB%": "7.3%",
        "ORB%": "3.6%",
        "DRB%": "11.1%",
        "STL%": "1.4%",
        "BLK%": "1.0%",
        "TOV%": "7.9%"
      }
    },
    {
      "name": "Micah Potter",
      "pos": [
        "C"
      ],
      "ovr": 73,
      "real_ovr": 74,
      "id": 1630695,
      "basic": {
        "MP": 11.0,
        "FGA": 3.7,
        "FG%": "42.3%",
        "3PA": 1.9,
        "3P%": "32.4%",
        "FTA": 0.6,
        "FT%": "77.8%",
        "ORB": 1.0,
        "DRB": 2.5,
        "AST": 0.8,
        "STL": 0.3,
        "BLK": 0.4,
        "TOV": 0.6,
        "PF": 1.2,
        "PTS": 4.2
      },
      "advanced": {
        "USG%": "17.4%",
        "TS%": "53.0%",
        "AST%": "9.9%",
        "TRB%": "17.1%",
        "ORB%": "9.8%",
        "DRB%": "24.6%",
        "STL%": "1.3%",
        "BLK%": "3.1%",
        "TOV%": "13.1%"
      }
    }
  ]
,
  "WAS": [
    {
      "name": "Kyle Kuzma",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 83,
      "real_ovr": 83,
      "id": 1628398,
      "basic": {
        "MP": 32.4,
        "FGA": 15.6,
        "FG%": "45.8%",
        "3PA": 5.8,
        "3P%": "33.6%",
        "FTA": 3.7,
        "FT%": "77.5%",
        "ORB": 1.0,
        "DRB": 5.4,
        "AST": 3.8,
        "STL": 0.6,
        "BLK": 0.6,
        "TOV": 2.5,
        "PF": 2.2,
        "PTS": 19.3
      },
      "advanced": {
        "USG%": "25.8%",
        "TS%": "55.4%",
        "AST%": "18.6%",
        "TRB%": "10.4%",
        "ORB%": "3.3%",
        "DRB%": "17.4%",
        "STL%": "0.9%",
        "BLK%": "1.6%",
        "TOV%": "12.6%"
      }
    },
    {
      "name": "Jordan Poole",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 82,
      "real_ovr": 83,
      "id": 1629673,
      "basic": {
        "MP": 31.8,
        "FGA": 15.4,
        "FG%": "43.2%",
        "3PA": 7.9,
        "3P%": "37.1%",
        "FTA": 4.5,
        "FT%": "87.8%",
        "ORB": 0.5,
        "DRB": 2.6,
        "AST": 4.5,
        "STL": 1.3,
        "BLK": 0.3,
        "TOV": 3.1,
        "PF": 2.7,
        "PTS": 20.4
      },
      "advanced": {
        "USG%": "27.6%",
        "TS%": "58.2%",
        "AST%": "23.4%",
        "TRB%": "5.2%",
        "ORB%": "1.7%",
        "DRB%": "8.7%",
        "STL%": "2.0%",
        "BLK%": "0.9%",
        "TOV%": "15.1%"
      }
    },
    {
      "name": "Jonas Valančiūnas",
      "pos": [
        "C"
      ],
      "ovr": 82,
      "real_ovr": 82,
      "id": 202685,
      "basic": {
        "MP": 20.5,
        "FGA": 8.7,
        "FG%": "55.6%",
        "3PA": 0.8,
        "3P%": "31.0%",
        "FTA": 2.9,
        "FT%": "88.2%",
        "ORB": 2.6,
        "DRB": 5.9,
        "AST": 2.0,
        "STL": 0.4,
        "BLK": 0.8,
        "TOV": 1.4,
        "PF": 2.5,
        "PTS": 12.2
      },
      "advanced": {
        "USG%": "24.1%",
        "TS%": "61.1%",
        "AST%": "16.4%",
        "TRB%": "22.2%",
        "ORB%": "13.6%",
        "DRB%": "30.4%",
        "STL%": "1.0%",
        "BLK%": "3.5%",
        "TOV%": "12.3%"
      }
    },
    {
      "name": "Malcolm Brogdon",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 80,
      "real_ovr": 80,
      "id": 1627763,
      "basic": {
        "MP": 24.3,
        "FGA": 10.9,
        "FG%": "43.8%",
        "3PA": 4.1,
        "3P%": "34.5%",
        "FTA": 2.6,
        "FT%": "88.2%",
        "ORB": 0.7,
        "DRB": 3.1,
        "AST": 4.1,
        "STL": 0.7,
        "BLK": 0.2,
        "TOV": 1.6,
        "PF": 1.6,
        "PTS": 12.8
      },
      "advanced": {
        "USG%": "24.5%",
        "TS%": "53.2%",
        "AST%": "27.5%",
        "TRB%": "8.3%",
        "ORB%": "3.1%",
        "DRB%": "13.3%",
        "STL%": "1.4%",
        "BLK%": "0.7%",
        "TOV%": "11.7%"
      }
    },
    {
      "name": "Alex Sarr",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 79,
      "real_ovr": 80,
      "id": 1642259,
      "basic": {
        "MP": 27.2,
        "FGA": 11.4,
        "FG%": "40.3%",
        "3PA": 4.9,
        "3P%": "31.9%",
        "FTA": 2.2,
        "FT%": "66.7%",
        "ORB": 1.8,
        "DRB": 5.1,
        "AST": 2.3,
        "STL": 0.7,
        "BLK": 1.5,
        "TOV": 1.5,
        "PF": 2.6,
        "PTS": 11.8
      },
      "advanced": {
        "USG%": "21.8%",
        "TS%": "47.7%",
        "AST%": "13.0%",
        "TRB%": "13.4%",
        "ORB%": "7.0%",
        "DRB%": "19.5%",
        "STL%": "1.3%",
        "BLK%": "5.0%",
        "TOV%": "10.8%"
      }
    },
    {
      "name": "Bilal Coulibaly",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 79,
      "real_ovr": 80,
      "id": 1641731,
      "basic": {
        "MP": 31.8,
        "FGA": 10.3,
        "FG%": "44.6%",
        "3PA": 3.8,
        "3P%": "32.4%",
        "FTA": 3.7,
        "FT%": "74.8%",
        "ORB": 1.1,
        "DRB": 4.0,
        "AST": 3.3,
        "STL": 1.2,
        "BLK": 0.7,
        "TOV": 2.0,
        "PF": 2.6,
        "PTS": 12.3
      },
      "advanced": {
        "USG%": "18.9%",
        "TS%": "51.6%",
        "AST%": "15.8%",
        "TRB%": "8.5%",
        "ORB%": "3.7%",
        "DRB%": "13.1%",
        "STL%": "1.9%",
        "BLK%": "2.1%",
        "TOV%": "14.4%"
      }
    },
    {
      "name": "Corey Kispert",
      "pos": [
        "SF"
      ],
      "ovr": 77,
      "real_ovr": 77,
      "id": 1630557,
      "basic": {
        "MP": 26.4,
        "FGA": 9.4,
        "FG%": "44.2%",
        "3PA": 5.8,
        "3P%": "36.2%",
        "FTA": 1.6,
        "FT%": "76.7%",
        "ORB": 0.6,
        "DRB": 2.4,
        "AST": 1.7,
        "STL": 0.5,
        "BLK": 0.2,
        "TOV": 1.0,
        "PF": 1.6,
        "PTS": 11.2
      },
      "advanced": {
        "USG%": "18.3%",
        "TS%": "55.4%",
        "AST%": "9.9%",
        "TRB%": "6.1%",
        "ORB%": "2.5%",
        "DRB%": "9.6%",
        "STL%": "1.0%",
        "BLK%": "0.7%",
        "TOV%": "9.0%"
      }
    },
    {
      "name": "Bub Carrington",
      "pos": [
        "PG"
      ],
      "ovr": 76,
      "real_ovr": 78,
      "id": 1642267,
      "basic": {
        "MP": 29.8,
        "FGA": 9.3,
        "FG%": "41.0%",
        "3PA": 4.5,
        "3P%": "35.3%",
        "FTA": 1.6,
        "FT%": "83.6%",
        "ORB": 0.9,
        "DRB": 3.3,
        "AST": 4.3,
        "STL": 0.8,
        "BLK": 0.3,
        "TOV": 1.7,
        "PF": 2.2,
        "PTS": 9.9
      },
      "advanced": {
        "USG%": "17.4%",
        "TS%": "49.5%",
        "AST%": "21.6%",
        "TRB%": "7.5%",
        "ORB%": "3.3%",
        "DRB%": "11.6%",
        "STL%": "1.3%",
        "BLK%": "0.9%",
        "TOV%": "14.5%"
      }
    },
    {
      "name": "Marvin Bagley III",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 77,
      "real_ovr": 76,
      "id": 1628963,
      "basic": {
        "MP": 15.6,
        "FGA": 5.6,
        "FG%": "56.4%",
        "3PA": 0.3,
        "3P%": "16.7%",
        "FTA": 2.1,
        "FT%": "64.4%",
        "ORB": 1.8,
        "DRB": 3.6,
        "AST": 0.9,
        "STL": 0.4,
        "BLK": 0.6,
        "TOV": 0.9,
        "PF": 1.7,
        "PTS": 7.8
      },
      "advanced": {
        "USG%": "20.5%",
        "TS%": "59.8%",
        "AST%": "9.1%",
        "TRB%": "18.3%",
        "ORB%": "12.2%",
        "DRB%": "24.1%",
        "STL%": "1.3%",
        "BLK%": "3.5%",
        "TOV%": "12.1%"
      }
    },
    {
      "name": "Saddiq Bey",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 77,
      "real_ovr": 77,
      "id": 1630180,
      "note": "Rehab / Inactive (0 GP)",
      "basic": {
        "MP": 0.0,
        "FGA": 0.0,
        "FG%": "0.0%",
        "3PA": 0.0,
        "3P%": "0.0%",
        "FTA": 0.0,
        "FT%": "0.0%",
        "ORB": 0.0,
        "DRB": 0.0,
        "AST": 0.0,
        "STL": 0.0,
        "BLK": 0.0,
        "TOV": 0.0,
        "PF": 0.0,
        "PTS": 0.0
      },
      "advanced": {
        "USG%": "0.0%",
        "TS%": "0.0%",
        "AST%": "0.0%",
        "TRB%": "0.0%",
        "ORB%": "0.0%",
        "DRB%": "0.0%",
        "STL%": "0.0%",
        "BLK%": "0.0%",
        "TOV%": "0.0%"
      }
    },
    {
      "name": "Kyshawn George",
      "pos": [
        "SF"
      ],
      "ovr": 75,
      "real_ovr": 77,
      "id": 1642273,
      "basic": {
        "MP": 24.6,
        "FGA": 8.0,
        "FG%": "37.5%",
        "3PA": 5.0,
        "3P%": "32.6%",
        "FTA": 1.7,
        "FT%": "78.4%",
        "ORB": 0.7,
        "DRB": 3.2,
        "AST": 2.4,
        "STL": 0.9,
        "BLK": 0.6,
        "TOV": 1.6,
        "PF": 2.3,
        "PTS": 8.4
      },
      "advanced": {
        "USG%": "18.3%",
        "TS%": "48.0%",
        "AST%": "14.2%",
        "TRB%": "8.3%",
        "ORB%": "3.0%",
        "DRB%": "13.6%",
        "STL%": "1.8%",
        "BLK%": "2.3%",
        "TOV%": "15.5%"
      }
    },
    {
      "name": "Richaun Holmes",
      "pos": [
        "C"
      ],
      "ovr": 76,
      "real_ovr": 77,
      "id": 1626158,
      "basic": {
        "MP": 17.5,
        "FGA": 4.6,
        "FG%": "62.5%",
        "3PA": 0.2,
        "3P%": "20.0%",
        "FTA": 1.6,
        "FT%": "80.0%",
        "ORB": 1.9,
        "DRB": 3.7,
        "AST": 1.1,
        "STL": 0.6,
        "BLK": 0.8,
        "TOV": 0.8,
        "PF": 2.2,
        "PTS": 7.1
      },
      "advanced": {
        "USG%": "14.7%",
        "TS%": "67.0%",
        "AST%": "9.5%",
        "TRB%": "17.0%",
        "ORB%": "11.6%",
        "DRB%": "22.2%",
        "STL%": "1.7%",
        "BLK%": "4.2%",
        "TOV%": "13.2%"
      }
    },
    {
      "name": "Johnny Davis",
      "pos": [
        "SG"
      ],
      "ovr": 74,
      "real_ovr": 73,
      "id": 1631098,
      "basic": {
        "MP": 10.4,
        "FGA": 3.2,
        "FG%": "38.2%",
        "3PA": 1.0,
        "3P%": "24.1%",
        "FTA": 0.8,
        "FT%": "69.6%",
        "ORB": 0.4,
        "DRB": 1.0,
        "AST": 0.8,
        "STL": 0.5,
        "BLK": 0.2,
        "TOV": 0.5,
        "PF": 1.1,
        "PTS": 3.1
      },
      "advanced": {
        "USG%": "17.4%",
        "TS%": "43.6%",
        "AST%": "11.2%",
        "TRB%": "7.1%",
        "ORB%": "4.1%",
        "DRB%": "10.1%",
        "STL%": "2.4%",
        "BLK%": "1.7%",
        "TOV%": "12.3%"
      }
    },
    {
      "name": "Patrick Baldwin Jr.",
      "pos": [
        "PF"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1631116,
      "basic": {
        "MP": 8.7,
        "FGA": 2.5,
        "FG%": "42.0%",
        "3PA": 1.6,
        "3P%": "36.4%",
        "FTA": 0.4,
        "FT%": "75.0%",
        "ORB": 0.4,
        "DRB": 1.5,
        "AST": 0.5,
        "STL": 0.3,
        "BLK": 0.3,
        "TOV": 0.3,
        "PF": 0.9,
        "PTS": 2.8
      },
      "advanced": {
        "USG%": "15.1%",
        "TS%": "52.3%",
        "AST%": "8.5%",
        "TRB%": "11.5%",
        "ORB%": "4.9%",
        "DRB%": "18.0%",
        "STL%": "1.7%",
        "BLK%": "3.1%",
        "TOV%": "10.1%"
      }
    },
    {
      "name": "Anthony Gill",
      "pos": [
        "PF"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1630264,
      "basic": {
        "MP": 9.2,
        "FGA": 2.3,
        "FG%": "45.1%",
        "3PA": 0.7,
        "3P%": "27.8%",
        "FTA": 0.9,
        "FT%": "73.9%",
        "ORB": 0.8,
        "DRB": 1.2,
        "AST": 0.7,
        "STL": 0.3,
        "BLK": 0.2,
        "TOV": 0.4,
        "PF": 1.2,
        "PTS": 3.0
      },
      "advanced": {
        "USG%": "14.2%",
        "TS%": "55.6%",
        "AST%": "11.1%",
        "TRB%": "11.4%",
        "ORB%": "9.1%",
        "DRB%": "13.6%",
        "STL%": "1.6%",
        "BLK%": "1.9%",
        "TOV%": "12.8%"
      }
    }
  ]
};

    // 2026-27 official roster: top 15 players per team by NBA 2K27 overall.
    const TEAM_DATA_2026 = {
  "ATL": [
    {
      "name": "Jalen Johnson",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 87,
      "real_ovr": 87,
      "id": 1630552,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "CJ McCollum",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 83,
      "real_ovr": 83,
      "id": 203468,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Nickeil Alexander-Walker",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 83,
      "real_ovr": 83,
      "id": 1629638,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Dyson Daniels",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 81,
      "real_ovr": 81,
      "id": 1630700,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Onyeka Okongwu",
      "pos": [
        "C"
      ],
      "ovr": 81,
      "real_ovr": 81,
      "id": 1630168,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Luguentz Dort",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1629652,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Aaron Wiggins",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1630598,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jock Landale",
      "pos": [
        "C"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1629111,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Dorian Finney-Smith",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1627827,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Kingston Flemings",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1643412,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Asa Newell",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1642854,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Corey Kispert",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1630557,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Mouhamed Gueye",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 1631243,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jalen Wilson",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1630592,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Zuby Ejiofor",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1643544,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "BOS": [
    {
      "name": "Jayson Tatum",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 93,
      "real_ovr": 93,
      "id": 1628369,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Derrick White",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 83,
      "real_ovr": 83,
      "id": 1628401,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Paul George",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 82,
      "real_ovr": 82,
      "id": 202331,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Payton Pritchard",
      "pos": [
        "PG"
      ],
      "ovr": 82,
      "real_ovr": 82,
      "id": 1630202,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Mitchell Robinson",
      "pos": [
        "C"
      ],
      "ovr": 80,
      "real_ovr": 80,
      "id": 1629011,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Neemias Queta",
      "pos": [
        "C"
      ],
      "ovr": 80,
      "real_ovr": 80,
      "id": 1629674,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Sam Hauser",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1630573,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Baylor Scheierman",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1631248,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Devin Carter",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1642269,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Hugo González",
      "pos": [
        "SF",
        "PG"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1642864,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Luka Garza",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1630568,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Mike Conley",
      "pos": [
        "PG"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 201144,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jordan Walsh",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1641775,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Chris Cenac Jr.",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1643416,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Ron Harper Jr.",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1631199,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "BKN": [
    {
      "name": "Michael Porter Jr.",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 85,
      "real_ovr": 85,
      "id": 1629008,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Julius Randle",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 83,
      "real_ovr": 83,
      "id": 203944,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Egor Dëmin",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1642856,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Keon Ellis",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1631165,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Noah Clowney",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1641730,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Nolan Traore",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1642849,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Danny Wolf",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1642874,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Day'Ron Sharpe",
      "pos": [
        "C"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1630549,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Josh Minott",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1631169,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Mikel Brown Jr.",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1643414,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Moritz Wagner",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1629021,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Terance Mann",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1629611,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Ben Saraf",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1642879,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Drake Powell",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 1642962,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Chaney Johnson",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1643052,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "CHA": [
    {
      "name": "Brandon Miller",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 85,
      "real_ovr": 85,
      "id": 1641706,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Kon Knueppel",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 84,
      "real_ovr": 84,
      "id": 1642851,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Naz Reid",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 82,
      "real_ovr": 82,
      "id": 1629675,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Coby White",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 80,
      "real_ovr": 80,
      "id": 1629632,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Grayson Allen",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 80,
      "real_ovr": 80,
      "id": 1628960,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Moussa Diabaté",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1631217,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Ryan Kalkbrenner",
      "pos": [
        "C"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1641750,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Dennis Schröder",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 203471,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Royce O'Neale",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1626220,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Grant Williams",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1629684,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Sion James",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1642883,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Tidjane Salaün",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1642275,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Hannes Steinbach",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1643419,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Liam McNeeley",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1642862,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Pat Connaughton",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1626192,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "CHI": [
    {
      "name": "Josh Giddey",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 84,
      "real_ovr": 84,
      "id": 1630581,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Norman Powell",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 84,
      "real_ovr": 84,
      "id": 1626181,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Matas Buzelis",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 81,
      "real_ovr": 81,
      "id": 1641824,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Nic Claxton",
      "pos": [
        "C"
      ],
      "ovr": 80,
      "real_ovr": 80,
      "id": 1629651,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Tre Jones",
      "pos": [
        "PG"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1630200,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Caleb Wilson",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 77,
      "real_ovr": 77,
      "id": 1643410,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jalen Smith",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1630188,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Isaac Okoro",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1630171,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Zach Collins",
      "pos": [
        "C"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1628380,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Buddy Hield",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1627741,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Leonard Miller",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1631159,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Patrick Williams",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1630172,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Noa Essengue",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 1642855,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Dailyn Swain",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1643517,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Orlando Robinson",
      "pos": [
        "C"
      ],
      "ovr": 70,
      "real_ovr": 70,
      "id": 1631115,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "CLE": [
    {
      "name": "Donovan Mitchell",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 93,
      "real_ovr": 93,
      "id": 1628378,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Evan Mobley",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 87,
      "real_ovr": 87,
      "id": 1630596,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "James Harden",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 87,
      "real_ovr": 87,
      "id": 201935,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jarrett Allen",
      "pos": [
        "C"
      ],
      "ovr": 85,
      "real_ovr": 85,
      "id": 1628386,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Peyton Watson",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1631212,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Sam Merrill",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 77,
      "real_ovr": 77,
      "id": 1630241,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jaylon Tyson",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1642281,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Mario Hezonja",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1626209,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Thomas Bryant",
      "pos": [
        "C"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1628418,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Craig Porter Jr.",
      "pos": [
        "PG"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 1641854,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Nae'Qwan Tomlin",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1641772,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Tyrese Proctor",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1642878,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Meleek Thomas",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 70,
      "real_ovr": 70,
      "id": 1643509,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Curtis Jones",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 68,
      "real_ovr": 68,
      "id": 1642938,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Ernest Udeh, Jr.",
      "pos": [
        "C"
      ],
      "ovr": 68,
      "real_ovr": 68,
      "id": 1643640,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "DAL": [
    {
      "name": "Cooper Flagg",
      "pos": [
        "SF",
        "PG"
      ],
      "ovr": 87,
      "real_ovr": 87,
      "id": 1642843,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Kyrie Irving",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 87,
      "real_ovr": 87,
      "id": 202681,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Daniel Gafford",
      "pos": [
        "C"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1629655,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Dereck Lively II",
      "pos": [
        "C"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1641726,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Naji Marshall",
      "pos": [
        "SF",
        "PG"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1630230,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "P.J. Washington",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1629023,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Santi Aldama",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1630583,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Zaccharie Risacher",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1642258,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Max Christie",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1631108,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Marcus Sasser",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1631204,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Morez Johnson Jr.",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1643516,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Caleb Martin",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 1628997,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Dwight Powell",
      "pos": [
        "C"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 203939,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jett Howard",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1641724,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Moussa Cisse",
      "pos": [
        "C"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1630619,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "DEN": [
    {
      "name": "Nikola Jokić",
      "pos": [
        "C"
      ],
      "ovr": 97,
      "real_ovr": 97,
      "id": 203999,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jamal Murray",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 89,
      "real_ovr": 89,
      "id": 1627750,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Aaron Gordon",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 83,
      "real_ovr": 83,
      "id": 203932,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "DeMar DeRozan",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 83,
      "real_ovr": 83,
      "id": 201942,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Cameron Johnson",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 80,
      "real_ovr": 80,
      "id": 1629661,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Christian Braun",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1631128,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Marvin Bagley III",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1628963,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Julian Strawther",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1631124,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Cam Whitmore",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1641715,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Tyus Jones",
      "pos": [
        "PG"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1626145,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "KJ Simpson",
      "pos": [
        "PG"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 1642354,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Lonnie Walker IV",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 1629022,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Spencer Jones",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 1642461,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Alpha Diallo",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1643813,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "DaRon Holmes II",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1641747,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "DET": [
    {
      "name": "Cade Cunningham",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 94,
      "real_ovr": 94,
      "id": 1630595,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Ausar Thompson",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 85,
      "real_ovr": 85,
      "id": 1641709,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jalen Duren",
      "pos": [
        "C"
      ],
      "ovr": 85,
      "real_ovr": 85,
      "id": 1631105,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Daniss Jenkins",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1642450,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Duncan Robinson",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1629130,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "John Collins",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1628381,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Isaiah Joe",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1630198,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Paul Reed",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 77,
      "real_ovr": 77,
      "id": 1630194,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Javonte Green",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1629750,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Kevin Huerter",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1628989,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Taurean Prince",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1627752,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Ebuka Okorie",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1643536,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Elijah Harkless",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 70,
      "real_ovr": 70,
      "id": 1641989,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Isaac Jones",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 70,
      "real_ovr": 70,
      "id": 1642403,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Ugonna Onyenso",
      "pos": [
        "C"
      ],
      "ovr": 69,
      "real_ovr": 69,
      "id": 1642391,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "GSW": [
    {
      "name": "Stephen Curry",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 93,
      "real_ovr": 93,
      "id": 201939,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Kristaps Porziņģis",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 81,
      "real_ovr": 81,
      "id": 204001,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Brandin Podziemski",
      "pos": [
        "PG",
        "PG"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1641764,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Draymond Green",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 203110,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Gui Santos",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1630611,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Al Horford",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 77,
      "real_ovr": 77,
      "id": 201143,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Brandon Williams",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1630314,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "De'Anthony Melton",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1629001,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Moses Moody",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1630541,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Gary Payton II",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1627780,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Will Richard",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1642954,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Yaxel Lendeborg",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1642865,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Charles Bassey",
      "pos": [
        "C"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1629646,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Dalen Terry",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1631207,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Georges Niang",
      "pos": [
        "PF"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1627777,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "HOU": [
    {
      "name": "Kevin Durant",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 93,
      "real_ovr": 93,
      "id": 201142,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Alperen Sengun",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 87,
      "real_ovr": 87,
      "id": 1630578,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Amen Thompson",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 86,
      "real_ovr": 86,
      "id": 1641708,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jabari Smith Jr.",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 80,
      "real_ovr": 80,
      "id": 1631095,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Fred VanVleet",
      "pos": [
        "PG"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1627832,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Marcus Smart",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 203935,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Reed Sheppard",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1642263,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Tari Eason",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1631106,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Clint Capela",
      "pos": [
        "C"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 203991,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Steven Adams",
      "pos": [
        "C"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 203500,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Bogdan Bogdanović",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 203992,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jae'Sean Tate",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 1630256,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Julian Phillips",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1641763,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Oscar Tshiebwe",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1631131,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Bruce Thornton",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 70,
      "real_ovr": 70,
      "id": 1643570,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "IND": [
    {
      "name": "Tyrese Haliburton",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 90,
      "real_ovr": 90,
      "id": 1630169,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Pascal Siakam",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 87,
      "real_ovr": 87,
      "id": 1627783,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Ivica Zubac",
      "pos": [
        "C"
      ],
      "ovr": 84,
      "real_ovr": 84,
      "id": 1627826,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Andrew Nembhard",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 81,
      "real_ovr": 81,
      "id": 1629614,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Aaron Nesmith",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1630174,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Kelly Oubre Jr.",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1626162,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "T.J. McConnell",
      "pos": [
        "PG"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 204456,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jarace Walker",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1641716,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Obi Toppin",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1630167,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jay Huff",
      "pos": [
        "C"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1630643,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Ben Sheppard",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1641767,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Kobe Brown",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1641738,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Quenton Jackson",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1631245,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Johnny Furphy",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 1642277,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jalen Slawson",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1641771,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "LAC": [
    {
      "name": "Brandon Ingram",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 84,
      "real_ovr": 84,
      "id": 1627742,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Darius Garland",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 84,
      "real_ovr": 84,
      "id": 1629636,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Rui Hachimura",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1629060,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Max Strus",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1629622,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Brook Lopez",
      "pos": [
        "C"
      ],
      "ovr": 77,
      "real_ovr": 77,
      "id": 201572,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Derrick Jones Jr.",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 77,
      "real_ovr": 77,
      "id": 1627884,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Bradley Beal",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 203078,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Keaton Wagler",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1643413,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Kris Dunn",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1627739,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Isaiah Jackson",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1630543,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jordan Miller",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1641757,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Kobe Sanders",
      "pos": [
        "PG",
        "SF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1642920,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Gradey Dick",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1641711,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jalen Pickett",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1629618,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Yanic Konan Niederhäuser",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1642949,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "LAL": [
    {
      "name": "Luka Dončić",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 96,
      "real_ovr": 96,
      "id": 1629029,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Austin Reaves",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 88,
      "real_ovr": 88,
      "id": 1630559,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Walker Kessler",
      "pos": [
        "C"
      ],
      "ovr": 81,
      "real_ovr": 81,
      "id": 1631117,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Collin Sexton",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1629012,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Quentin Grimes",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1629656,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jarred Vanderbilt",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1629020,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Sandro Mamukelashvili",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1630572,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jake LaRavia",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1631222,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Ziaire Williams",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1630533,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Dalton Knecht",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1642261,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Matisse Thybulle",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1629680,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jaden Hardy",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1630702,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Cameron Carr",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 1643418,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Kevon Looney",
      "pos": [
        "C"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1626172,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Adou Thiero",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 70,
      "real_ovr": 70,
      "id": 1642876,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "MEM": [
    {
      "name": "Cedric Coward",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 80,
      "real_ovr": 80,
      "id": 1642907,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Ty Jerome",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 80,
      "real_ovr": 80,
      "id": 1629660,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Zach Edey",
      "pos": [
        "C"
      ],
      "ovr": 80,
      "real_ovr": 80,
      "id": 1641744,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Cameron Boozer",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1643409,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jerami Grant",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 203924,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jaylen Wells",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1642377,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "GG Jackson",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 77,
      "real_ovr": 77,
      "id": 1641713,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Isaiah Stewart",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 77,
      "real_ovr": 77,
      "id": 1630191,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Cam Spencer",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1642285,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Olivier-Maxence Prosper",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1641765,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Scotty Pippen Jr.",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1630590,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Javon Small",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1642914,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Kris Murray",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1631200,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Walter Clayton Jr.",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1642383,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Quinten Post",
      "pos": [
        "C"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1642366,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "MIA": [
    {
      "name": "Giannis Antetokounmpo",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 96,
      "real_ovr": 96,
      "id": 203507,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Bam Adebayo",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 87,
      "real_ovr": 87,
      "id": 1628389,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Bobby Portis Jr.",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 80,
      "real_ovr": 80,
      "id": 1626171,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Andrew Wiggins",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 203952,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Tim Hardaway Jr.",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 203501,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Pelle Larsson",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1641796,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Davion Mitchell",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 77,
      "real_ovr": 77,
      "id": 1630558,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Klay Thompson",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 202691,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Simone Fontecchio",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1631323,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Dru Smith",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1630696,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Nick Richards",
      "pos": [
        "C"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1630208,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Nikola Jović",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1631107,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Myron Gardner",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 1642066,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Bez Mbeng",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 70,
      "real_ovr": 70,
      "id": 1643016,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Keshad Johnson",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 70,
      "real_ovr": 70,
      "id": 1642352,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "MIL": [
    {
      "name": "Tyler Herro",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 85,
      "real_ovr": 85,
      "id": 1629639,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Ryan Rollins",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 80,
      "real_ovr": 80,
      "id": 1631157,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Kel'el Ware",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1642276,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Kevin Porter Jr.",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1629645,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Myles Turner",
      "pos": [
        "C"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1626167,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Caris LeVert",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1627747,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jaime Jaquez Jr.",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1631170,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Kyle Kuzma",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 77,
      "real_ovr": 77,
      "id": 1628398,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Ousmane Dieng",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1631172,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "AJ Green",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1631260,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Gary Trent Jr.",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1629018,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Kasparas Jakučionis",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1642857,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Brayden Burries",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1643415,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jericho Sims",
      "pos": [
        "C"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 1630579,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Kam Jones",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 1642880,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "MIN": [
    {
      "name": "Anthony Edwards",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 95,
      "real_ovr": 95,
      "id": 1630162,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "LaMelo Ball",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 86,
      "real_ovr": 86,
      "id": 1630163,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jaden McDaniels",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 85,
      "real_ovr": 85,
      "id": 1630183,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Rudy Gobert",
      "pos": [
        "C"
      ],
      "ovr": 84,
      "real_ovr": 84,
      "id": 203497,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Ayo Dosunmu",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 81,
      "real_ovr": 81,
      "id": 1630245,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Donte DiVincenzo",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1628978,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Terrence Shannon Jr",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1630545,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Bones Hyland",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1630538,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Trey Lyles",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1626168,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Cody Williams",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1642262,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jonathan Kuminga",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1630228,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jaylen Clark",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 1641740,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Joan Beringer",
      "pos": [
        "C"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 1642866,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Antonio Reeves",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 70,
      "real_ovr": 70,
      "id": 1641810,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Drew Timme",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 70,
      "real_ovr": 70,
      "id": 1631166,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "NOP": [
    {
      "name": "Trey Murphy III",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 85,
      "real_ovr": 85,
      "id": 1630530,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Zion Williamson",
      "pos": [
        "PF",
        "PG"
      ],
      "ovr": 85,
      "real_ovr": 85,
      "id": 1629627,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Dejounte Murray",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 82,
      "real_ovr": 82,
      "id": 1627749,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Saddiq Bey",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 80,
      "real_ovr": 80,
      "id": 1630180,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Bennedict Mathurin",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1631097,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Derik Queen",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1642852,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Herbert Jones",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1630529,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jeremiah Fears",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1642847,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Yves Missi",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1642274,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "DeAndre Jordan",
      "pos": [
        "C"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 201599,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jordan Poole",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1629673,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Karlo Matković",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1631255,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Bryce McGowens",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1631121,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Julian Reese",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1642882,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Trendon Watford",
      "pos": [
        "PF",
        "PG"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1630570,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "NYK": [
    {
      "name": "Jalen Brunson",
      "pos": [
        "PG"
      ],
      "ovr": 96,
      "real_ovr": 96,
      "id": 1628973,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Karl-Anthony Towns",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 93,
      "real_ovr": 93,
      "id": 1626157,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "OG Anunoby",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 88,
      "real_ovr": 88,
      "id": 1628384,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Mikal Bridges",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 84,
      "real_ovr": 84,
      "id": 1628969,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Josh Hart",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 82,
      "real_ovr": 82,
      "id": 1628404,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Miles McBride",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1630540,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jose Alvarado",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 77,
      "real_ovr": 77,
      "id": 1630631,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Landry Shamet",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 77,
      "real_ovr": 77,
      "id": 1629013,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Andre Drummond",
      "pos": [
        "C"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 203083,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jordan Clarkson",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 203903,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Bruce Brown",
      "pos": [
        "SF",
        "PG"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1628971,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Drew Eubanks",
      "pos": [
        "C"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1629234,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "John Konchar",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1629723,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Ochai Agbaji",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1630534,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Tyler Kolek",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1642278,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "OKC": [
    {
      "name": "Shai Gilgeous-Alexander",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 97,
      "real_ovr": 97,
      "id": 1628983,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Chet Holmgren",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 86,
      "real_ovr": 86,
      "id": 1631096,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jalen Williams",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 85,
      "real_ovr": 85,
      "id": 1631114,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Ajay Mitchell",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 82,
      "real_ovr": 82,
      "id": 1642349,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Isaiah Hartenstein",
      "pos": [
        "C"
      ],
      "ovr": 82,
      "real_ovr": 82,
      "id": 1628392,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Alex Caruso",
      "pos": [
        "SF",
        "PG"
      ],
      "ovr": 81,
      "real_ovr": 81,
      "id": 1627936,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Cason Wallace",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 81,
      "real_ovr": 81,
      "id": 1641717,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jared McCain",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1642272,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jaylin Williams",
      "pos": [
        "C"
      ],
      "ovr": 77,
      "real_ovr": 77,
      "id": 1631119,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Kenrich Williams",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1629026,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Aday Mara",
      "pos": [
        "C"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1643530,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Nikola Topić",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 1642260,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Thomas Sorber",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1642850,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Bennett Stirtz",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 70,
      "real_ovr": 70,
      "id": 1642892,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Brooks Barnhizer",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 69,
      "real_ovr": 69,
      "id": 1642964,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "ORL": [
    {
      "name": "Paolo Banchero",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 87,
      "real_ovr": 87,
      "id": 1631094,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Franz Wagner",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 85,
      "real_ovr": 85,
      "id": 1630532,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Desmond Bane",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 84,
      "real_ovr": 84,
      "id": 1630217,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Anthony Black",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 80,
      "real_ovr": 80,
      "id": 1641710,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jalen Suggs",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 80,
      "real_ovr": 80,
      "id": 1630591,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Wendell Carter Jr.",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1628976,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Nikola Vučević",
      "pos": [
        "C"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 202696,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Tristan da Silva",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1641783,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Goga Bitadze",
      "pos": [
        "C"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1629048,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jevon Carter",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1628975,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Noah Penda",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1642869,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jamal Cain",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 1631288,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jase Richardson",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 1642859,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jonathan Isaac",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 1628371,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Colin Castleton",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 70,
      "real_ovr": 70,
      "id": 1630658,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "PHI": [
    {
      "name": "Tyrese Maxey",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 92,
      "real_ovr": 92,
      "id": 1630178,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jaylen Brown",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 91,
      "real_ovr": 91,
      "id": 1627759,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Joel Embiid",
      "pos": [
        "C"
      ],
      "ovr": 91,
      "real_ovr": 91,
      "id": 203954,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "LeBron James",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 91,
      "real_ovr": 91,
      "id": 2544,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "VJ Edgecombe",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 83,
      "real_ovr": 83,
      "id": 1642845,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Anfernee Simons",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1629014,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Dean Wade",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1629731,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Adem Bona",
      "pos": [
        "C"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1641737,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Kentavious Caldwell-Pope",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 203484,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Dominick Barlow",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1631230,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Justin Edwards",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1642348,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Caleb Love",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1631126,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Rayan Rupert",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1641712,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Ariel Hukporti",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 1630574,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jabari Walker",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1631133,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "PHX": [
    {
      "name": "Devin Booker",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 91,
      "real_ovr": 91,
      "id": 1626164,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Dillon Brooks",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 82,
      "real_ovr": 82,
      "id": 1628415,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jalen Green",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 81,
      "real_ovr": 81,
      "id": 1630224,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Miles Bridges",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 80,
      "real_ovr": 80,
      "id": 1628970,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Collin Gillespie",
      "pos": [
        "PG"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1631221,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Mark Williams",
      "pos": [
        "C"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1631109,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jordan Goodwin",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1630692,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Luke Kennard",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1628379,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Oso Ighodaro",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1642345,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Pat Spencer",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1630311,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Ryan Dunn",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1642346,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Khaman Maluach",
      "pos": [
        "C"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1642863,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Rasheer Fleming",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1642853,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Haywood Highsmith",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1629312,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jamaree Bouyea",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1631123,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "POR": [
    {
      "name": "Deni Avdija",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 88,
      "real_ovr": 88,
      "id": 1630166,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Damian Lillard",
      "pos": [
        "PG"
      ],
      "ovr": 86,
      "real_ovr": 86,
      "id": 203081,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Ja Morant",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 84,
      "real_ovr": 84,
      "id": 1629630,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Donovan Clingan",
      "pos": [
        "C"
      ],
      "ovr": 82,
      "real_ovr": 82,
      "id": 1642270,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jrue Holiday",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 82,
      "real_ovr": 82,
      "id": 201950,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Shaedon Sharpe",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 81,
      "real_ovr": 81,
      "id": 1631101,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Toumani Camara",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 80,
      "real_ovr": 80,
      "id": 1641739,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Scoot Henderson",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1630703,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Robert Williams III",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1629057,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Vít Krejčí",
      "pos": [
        "SF",
        "PG"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1630249,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Sidy Cissoko",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1631321,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Micah Potter",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 1630695,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Branden Carlson",
      "pos": [
        "C"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1642382,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jeremy Sochan",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1631110,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Yang Hansen",
      "pos": [
        "C"
      ],
      "ovr": 70,
      "real_ovr": 70,
      "id": 1642905,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "SAC": [
    {
      "name": "Domantas Sabonis",
      "pos": [
        "C"
      ],
      "ovr": 85,
      "real_ovr": 85,
      "id": 1627734,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Zach LaVine",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 82,
      "real_ovr": 82,
      "id": 203897,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Keegan Murray",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1631099,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Malik Monk",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1628370,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Maxime Raynaud",
      "pos": [
        "C"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1642875,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "De'Andre Hunter",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 77,
      "real_ovr": 77,
      "id": 1629631,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Precious Achiuwa",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1630173,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Darius Acuff Jr.",
      "pos": [
        "PG"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1643411,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Nique Clifford",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 75,
      "real_ovr": 75,
      "id": 1642363,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Ben Simmons",
      "pos": [
        "PG",
        "C"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1627732,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Dylan Cardwell",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1642928,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Alex Karaban",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1642284,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Daeqwon Plowden",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1631342,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jonathan Mogbo",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1642367,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Elfrid Payton",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 68,
      "real_ovr": 68,
      "id": 203901,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "Unrated roster fallback"
    }
  ],
  "SAS": [
    {
      "name": "Victor Wembanyama",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 97,
      "real_ovr": 97,
      "id": 1641705,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Stephon Castle",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 87,
      "real_ovr": 87,
      "id": 1642264,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Dylan Harper",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 85,
      "real_ovr": 85,
      "id": 1642844,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "De'Aaron Fox",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 84,
      "real_ovr": 84,
      "id": 1628368,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Devin Vassell",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 81,
      "real_ovr": 81,
      "id": 1630170,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Tobias Harris",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 81,
      "real_ovr": 81,
      "id": 202699,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Julian Champagnie",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1630577,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Keldon Johnson",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1629640,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Carter Bryant",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1642868,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Harrison Barnes",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 203084,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Luke Kornet",
      "pos": [
        "C"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1628436,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jordan McLaughlin",
      "pos": [
        "PG"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1629162,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Tarris Reed Jr.",
      "pos": [
        "C"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1643542,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "David Jones Garcia",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 70,
      "real_ovr": 70,
      "id": 1642357,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jayden Quaintance",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 70,
      "real_ovr": 70,
      "id": 1643519,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "TOR": [
    {
      "name": "Kawhi Leonard",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 93,
      "real_ovr": 93,
      "id": 202695,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Scottie Barnes",
      "pos": [
        "PF",
        "PG"
      ],
      "ovr": 88,
      "real_ovr": 88,
      "id": 1630567,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Immanuel Quickley",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 82,
      "real_ovr": 82,
      "id": 1630193,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "RJ Barrett",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 82,
      "real_ovr": 82,
      "id": 1629628,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Collin Murray-Boyles",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 80,
      "real_ovr": 80,
      "id": 1642867,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jakob Poeltl",
      "pos": [
        "C"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1627751,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Ja'Kobe Walter",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1642266,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jamal Shead",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1642347,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jamison Battle",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1642419,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Kyle Anderson",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 203937,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Allen Graves",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1643512,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Andre Jackson Jr.",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1641748,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Trayce Jackson-Davis",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1631218,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Trey Jemison III",
      "pos": [
        "C"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1641998,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Alijah Martin",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 70,
      "real_ovr": 70,
      "id": 1642918,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "UTA": [
    {
      "name": "Jaren Jackson Jr.",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 86,
      "real_ovr": 86,
      "id": 1628991,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Lauri Markkanen",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 86,
      "real_ovr": 86,
      "id": 1628374,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Keyonte George",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 84,
      "real_ovr": 84,
      "id": 1641718,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Isaiah Collier",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 80,
      "real_ovr": 80,
      "id": 1642268,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Ace Bailey",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1642846,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Brice Sensabaugh",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1641729,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Darryn Peterson",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1643408,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Kyle Filipowski",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1642271,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jaxson Hayes",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1629637,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jusuf Nurkić",
      "pos": [
        "C"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 203994,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Josh Okogie",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 74,
      "real_ovr": 74,
      "id": 1629006,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Josh Green",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1630182,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Svi Mykhailiuk",
      "pos": [
        "SG",
        "SF"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1629004,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Blake Hinson",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 71,
      "real_ovr": 71,
      "id": 1642396,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Mo Bamba",
      "pos": [
        "C"
      ],
      "ovr": 70,
      "real_ovr": 70,
      "id": 1628964,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ],
  "WAS": [
    {
      "name": "Anthony Davis",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 90,
      "real_ovr": 90,
      "id": 203076,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Trae Young",
      "pos": [
        "PG"
      ],
      "ovr": 87,
      "real_ovr": 87,
      "id": 1629027,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Alex Sarr",
      "pos": [
        "C",
        "PF"
      ],
      "ovr": 83,
      "real_ovr": 83,
      "id": 1642259,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Kyshawn George",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 80,
      "real_ovr": 80,
      "id": 1642273,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "AJ Dybantsa",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 79,
      "real_ovr": 79,
      "id": 1643407,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Bilal Coulibaly",
      "pos": [
        "SF",
        "SG"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1641731,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Deandre Ayton",
      "pos": [
        "C"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1629028,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Tre Johnson",
      "pos": [
        "SG",
        "PG"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1642848,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Will Riley",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 78,
      "real_ovr": 78,
      "id": 1642860,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Bub Carrington",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1642267,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Justin Champagnie",
      "pos": [
        "PF",
        "SF"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 1630551,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Khris Middleton",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 76,
      "real_ovr": 76,
      "id": 203114,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Jamir Watkins",
      "pos": [
        "SF",
        "PF"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1642364,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Tre Mann",
      "pos": [
        "PG",
        "SG"
      ],
      "ovr": 73,
      "real_ovr": 73,
      "id": 1630544,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    },
    {
      "name": "Anthony Gill",
      "pos": [
        "PF",
        "C"
      ],
      "ovr": 72,
      "real_ovr": 72,
      "id": 1630264,
      "edition": "26",
      "basic": {
        "PTS": null,
        "REB": null,
        "AST": null
      },
      "advanced": null,
      "note": "NBA 2K27"
    }
  ]
};

    function normalizeSeasonStatsPlayerName(value) {
      return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[.'’]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    }

    function find2025_26SeasonStats(playerName) {
      const dataset = globalThis.PLAYER_STATS_2025_26;
      if (!dataset?.records) return null;
      const normalized = normalizeSeasonStatsPlayerName(playerName);
      const relaxed = normalized.replace(/\s+(jr|ii|iii)$/, '');
      const aliasKey = dataset.aliases?.[normalized] || dataset.aliases?.[relaxed];
      return dataset.records[normalized]
        || dataset.records[relaxed]
        || (aliasKey ? dataset.records[aliasKey] : null)
        || null;
    }

    function attach2025_26SeasonStats(teamData) {
      const report = { matched: 0, missing: [] };
      Object.entries(teamData || {}).forEach(([team, players]) => {
        (players || []).forEach(player => {
          const stats = find2025_26SeasonStats(player.name);
          if (!stats) {
            report.missing.push({ name: player.name, team });
            return;
          }
          player.basic = { ...stats.basic };
          player.advanced = { ...stats.advanced };
          player.srId = stats.srId;
          player.statsSeason = '2025-26';
          player.statsSource = {
            name: 'Sports Reference',
            url: 'https://www.basketball-reference.com/'
          };
          report.matched += 1;
        });
      });
      return report;
    }

    const PLAYER_STATS_2025_26_IMPORT = attach2025_26SeasonStats(TEAM_DATA_2026);

    // Current-season systems (team pools, binder and opponent rosters) use the 2026-27 list.
    const TEAM_DATA = TEAM_DATA_2026;

    function determineRarityByOvr(ovr) {
      if (ovr >= 91) return "UR";
      if (ovr >= 86) return "SSR";
      if (ovr >= 81) return "SR";
      if (ovr >= 76) return "R";
      return "N";
    }

    const ALL_30_TEAMS = Object.keys(TEAM_DATA_2026);
const EAST_15_TEAMS = ["BOS", "NYK", "MIL", "CLE", "PHI", "IND", "MIA", "ORL", "CHI", "ATL", "BKN", "TOR", "CHA", "DET", "WAS"];
    const WEST_15_TEAMS = ["DEN", "MIN", "OKC", "LAC", "DAL", "PHX", "NOP", "LAL", "GSW", "SAC", "HOU", "UTA", "MEM", "POR", "SAS"];
    const NBA_PLAYERS = [];
[
  { data: TEAM_DATA_2025, edition: '25' },
  { data: TEAM_DATA_2026, edition: '26' }
].forEach(({ data, edition }) => {
  ALL_30_TEAMS.forEach(team => {
    (data[team] || []).forEach(p => {
      // 🌟 優先採用 real_ovr 作為基礎評分，若無則回退至 ovr
      const effectiveBaseOvr = Number(p.real_ovr || p.ovr || 70);

      NBA_PLAYERS.push({
        name: p.name,
        team: team,
        edition,
        positions: p.pos,
        baseOvr: effectiveBaseOvr,
        ovr: effectiveBaseOvr,
        realOvr: effectiveBaseOvr,
        rarity: determineRarityByOvr(effectiveBaseOvr), // 稀有度同步以實力評級重新判定
        nbaId: p.id,
        basic: p.basic || null,
        advanced: p.advanced || null,
        note: p.note || ''
      });
    });
  });
});
/* =====================================================
       🏀 2K25 球員特點標籤庫 (NBA Archetypes & Traits)
    ===================================================== */
    const PLAYER_ARCHETYPES = {
      // 🌟 全能持球指揮官 (Playmaking Shot Creator)
      "Luka Dončić": { type: "playmaker", label: "大三元持球核心", badge: "🎯組織/得分" },
      "LeBron James": { type: "playmaker", label: "全能控場前鋒", badge: "👑全場指揮" },
      "Trae Young": { type: "playmaker", label: "超遠三分傳控砲手", badge: "🎯擋拆發動機" },
      "Tyrese Haliburton": { type: "playmaker", label: "頂級傳控大師", badge: "🪄手術刀妙傳" },
      "James Harden": { type: "playmaker", label: "後撤步得分組織核", badge: "🎯單打發動" },
      "Shai Gilgeous-Alexander": { type: "playmaker", label: "中距離節奏大師", badge: "⚡造犯規專家" },
      "Cade Cunningham": { type: "playmaker", label: "大型控衛大腦", badge: "🧠全能指揮" },
      "LaMelo Ball": { type: "playmaker", label: "華麗傳控射手", badge: "🎨視野寬廣" },

      // 🎯 純神射手與投射終結者 (Sharpshooter)
      "Stephen Curry": { type: "shooter", label: "歷史級無球神射手", badge: "🏹無限射程" },
      "Devin Booker": { type: "shooter", label: "中遠距離純得分手", badge: "🔥拔起跳投" },
      "Klay Thompson": { type: "shooter", label: "頂級無球接球投籃", badge: "🎯Catch & Shoot" },
      "Damian Lillard": { type: "shooter", label: "關鍵絕殺大心臟", badge: "⌚Dame Time" },
      "Buddy Hield": { type: "shooter", label: "外線連珠砲", badge: "🏹三分專家" },
      "Tyler Herro": { type: "shooter", label: "自帶擋拆得分手", badge: "🔥跑動射手" },

      // ⚡ 切入突破與運動能力怪物 (Slashing Finisher)
      "Anthony Edwards": { type: "slasher", label: "爆發力重扣箭頭", badge: "🚀海報隔扣" },
      "Giannis Antetokounmpo": { type: "slasher", label: "禁區希臘怪物", badge: "💥油漆區破壞" },
      "Ja Morant": { type: "slasher", label: "極限滯空終結者", badge: "✈️禁區拉桿" },
      "Zion Williamson": { type: "slasher", label: "重裝坦克禁區破壞", badge: "🛡️低位碾壓" },
      "De'Aaron Fox": { type: "slasher", label: "閃電第一步突破", badge: "⚡聯盟最速" },
      "Jalen Green": { type: "slasher", label: "飛人側翼終結", badge: "💨轉換快攻" },

      // 🛡️ 禁區守護與內線巨塔 (Rim Protector / Glass Cleaner)
      "Victor Wembanyama": { type: "big_rebound", label: "外星長臂禁飛區守護", badge: "🛸火鍋魔人" },
      "Anthony Davis": { type: "big_rebound", label: "頂級協防掃蕩柱石", badge: "🛑禁區鐵閘" },
      "Nikola Jokić": { type: "playmaker", label: "傳球軸心大三元中鋒", badge: "🃏球場魔術師" },
      "Joel Embiid": { type: "big_rebound", label: "禁區傳統低位霸主", badge: "🦏無解單打" },
      "Rudy Gobert": { type: "big_rebound", label: "年度最佳護框鐵壁", badge: "🔒籃板大隊長" },
      "Bam Adebayo": { type: "big_rebound", label: "五號位全能換防大鎖", badge: "🧱無限換防" },
      "Chet Holmgren": { type: "big_rebound", label: "高位空間型護框巨塔", badge: "🛡️阻攻封鎖" },

      // 🔒 頂級外線 3&D 大鎖 (3&D Lockdowns)
      "Jrue Holiday": { type: "3d", label: "外線後場終極防守鎖", badge: "🔒死亡纏繞" },
      "Alex Caruso": { type: "3d", label: "破壞戰術抄截狂人", badge: "⚡拚命三郎" },
      "OG Anunoby": { type: "3d", label: "重型側翼封鎖大閘", badge: "🧱外線封殺" },
      "Derrick White": { type: "3d", label: "全能冠軍綠葉後衛", badge: "🧠高球商防守" },
      "Herb Jones": { type: "3d", label: "長臂抄截阻截器", badge: "🪃直升機抄截" },

      // 👑 歷史傳奇巨星 (Historic Legends)
      "Kobe Bryant ('10)": { type: "shooter", label: "黑曼巴", badge: "🐍曼巴精神" },
      "Kobe Bryant": { type: "shooter", label: "黑曼巴", badge: "🐍曼巴精神" }
    };

    // 自動判斷球員特點（若不在清單中，根據位置與能力值智能賦予標籤）
    function getPlayerArchetype(player) {
      if (player && PLAYER_ARCHETYPES[player.name]) {
        return PLAYER_ARCHETYPES[player.name];
      }
      const pos = (player.positions && player.positions[0]) || player.pos || 'SG';
      const ovr = Number(player.ovr || player.baseOvr || 75);

      if (pos === 'C' || pos === 'PF') {
        return { type: "big_rebound", label: "禁區禁衛軍", badge: "🛡️護框籃板" };
      }
      if (pos === 'PG') {
        return { type: "playmaker", label: "傳導指揮官", badge: "🎯節奏掌控" };
      }
      if (ovr >= 85) {
        return { type: "slasher", label: "全方位箭頭", badge: "⚡持球突破" };
      }
      return { type: "3d", label: "3D 戰術側翼", badge: "🏹外線防守" };
    }
 const TOEIC_WORDS = [
  { id: 1, word: "incentive", pos: "n.", meaning: "誘因、動機", example: "The draft lottery alters tanking incentives.", box: 1 },
  { id: 2, word: "comply with", pos: "phr.", meaning: "遵守、符合", example: "All clubs must comply with salary regulations.", box: 1 },
  { id: 3, word: "agenda", pos: "n.", meaning: "議程、討論事項", example: "The agenda for tomorrow's meeting has been distributed.", box: 1 },
  { id: 4, word: "reimburse", pos: "v.", meaning: "核銷、償還", example: "The company will reimburse your travel expenses.", box: 1 },
  { id: 5, word: "contingency", pos: "n.", meaning: "緊急意外、應急措施", example: "We need a contingency plan in case of supply delays.", box: 1 },
  { id: 6, word: "itinerary", pos: "n.", meaning: "旅行行程表", example: "Please review the business trip itinerary.", box: 1 },
  { id: 7, word: "procurement", pos: "n.", meaning: "採購、取得", example: "The procurement team negotiated lower shipping rates.", box: 1 }
];

    /* =====================================================
       ② CARD SYSTEM (標準化與唯一 ID)
    ===================================================== */
    function createCardId() {
      return `card_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }

    function calculateCardOvr(baseOvr, star, fmvpBonus = 0) {
      return (Number(baseOvr) || 70) + Math.max(0, (Number(star || 1) - 1) * 2) + (Number(fmvpBonus) || 0);
    }

    // 🌟 定義老將導師與新秀球員名單
    const VETERAN_MENTORS = new Set([
      "LeBron James", "Chris Paul", "Stephen Curry", "Kevin Durant",
      "Al Horford", "Mike Conley", "DeMar DeRozan", "Kyle Lowry", "Brook Lopez"
    ]);

    const ROOKIE_PLAYERS = new Set([
      "Reed Sheppard", "Stephon Castle", "Dalton Knecht", "Alex Sarr",
      "Matas Buzelis", "Zaccharie Risacher", "Ron Holland II", "Donovan Clingan",
      "Rob Dillingham", "Zach Edey", "Cody Williams", "Tidjane Salaün"
    ]);

function getCardEdition(card) {
  const raw = String(card?.edition || '25').replace(/[^0-9]/g, '');
  return ['10', '25', '26'].includes(raw) ? raw : '25';
}

function getCardDisplayName(card) {
  const name = String(card?.name || '').trim();
  return name ? `${name} ('${getCardEdition(card)})` : '';
}

function createCard(basePlayer, star = 1) {
  const s = Number(star) || 1;
  const baseOvr = Number(basePlayer.baseOvr || basePlayer.ovr || basePlayer.realOvr || basePlayer.real_ovr || 70);
  const realOvr = Number(basePlayer.realOvr || basePlayer.real_ovr || baseOvr);
  const name = String(basePlayer.name || '').trim();
  const fmvpBonus = Number(basePlayer.fmvpBonus || basePlayer.legacy?.fmvps || 0);
  
  return {
    cardId: createCardId(),
    name: name,
    edition: getCardEdition(basePlayer),
    team: String(basePlayer.team || '').trim(),
    positions: Array.isArray(basePlayer.positions) ? [...basePlayer.positions] : (basePlayer.pos ? [...basePlayer.pos] : ['PG']),
    baseOvr: baseOvr,
    realOvr: realOvr,
    real_ovr: realOvr,
    fmvpBonus: fmvpBonus,
    isFmvp: !!(basePlayer.isFmvp || fmvpBonus > 0),
    ovr: calculateCardOvr(baseOvr, s, fmvpBonus),
    rarity: basePlayer.rarity || determineRarityByOvr(baseOvr),
    nbaId: basePlayer.nbaId || basePlayer.id || 0,
    stars: s,
    isLegend: !!basePlayer.isLegend,
    isMentor: VETERAN_MENTORS.has(name) || !!basePlayer.isLegend,
    isRookie: ROOKIE_PLAYERS.has(name),
    basic: basePlayer.basic ? { ...basePlayer.basic } : null,
    advanced: basePlayer.advanced ? { ...basePlayer.advanced } : null,
    srId: basePlayer.srId || null,
    statsSeason: basePlayer.statsSeason || null,
    statsSource: basePlayer.statsSource ? { ...basePlayer.statsSource } : null,
    designId: basePlayer.designId || null,
    legacy: {
      seasons: 0, games: 0, pts: 0, reb: 0, ast: 0, rings: 0, mvps: 0, fmvps: fmvpBonus, traits: []
    },
    acquiredAt: Date.now()
  };
}    function getPlayerImgUrl(nbaId) {
      return `https://cdn.nba.com/headshots/nba/latest/1040x760/${nbaId}.png`;
    }

    function getRarityBorder(rarity) {
      if (rarity === 'UR') return 'border-2 rainbow-glow border-pink-500';
      if (rarity === 'SSR') return 'border-amber-400 gold-glow';
      if (rarity === 'SR') return 'border-purple-400 purple-glow';
      if (rarity === 'R') return 'border-blue-400';
      return 'border-slate-700';
    }

    /* =====================================================
       ③ INVENTORY SYSTEM (背包與存取)
    ===================================================== */
    function addCard(card) {
      if (!state.inventory) state.inventory = [];
      state.inventory.unshift(card);
    }

    function removeCardById(cardId) {
      const idx = (state.inventory || []).findIndex(c => c && c.cardId === cardId);
      if (idx !== -1) {
        return state.inventory.splice(idx, 1)[0];
      }
      return null;
    }

    function getHighestStarCards() {
      const map = new Map();
      (state.inventory || []).forEach(p => {
        if (!p) return;
        const editionKey = `${p.name}::${getCardEdition(p)}`;
        if (!map.has(editionKey)) {
          map.set(editionKey, { ...p });
        } else {
          const exist = map.get(editionKey);
          if ((p.stars || 1) > (exist.stars || 1)) {
            exist.stars = p.stars;
            exist.ovr = p.ovr;
            exist.acquiredAt = Math.max(exist.acquiredAt || 0, p.acquiredAt || 0);
          }
        }
      });
      return Array.from(map.values());
    }

    function getSortedInventory() {
      let cards = getHighestStarCards();
      const filters = state.inventoryFilters || { position: 'ALL', team: 'ALL', rarity: 'ALL' };

      if (filters.position && filters.position !== 'ALL') {
        cards = cards.filter(c => c.positions && c.positions.includes(filters.position));
      }
      if (filters.team && filters.team !== 'ALL') {
        cards = cards.filter(c => c.team === filters.team);
      }
      if (filters.rarity && filters.rarity !== 'ALL') {
        cards = cards.filter(c => c.rarity === filters.rarity);
      }

      const rarityRank = { 'UR': 5, 'SSR': 4, 'SR': 3, 'R': 2, 'N': 1 };
      const posOrder = { 'PG': 1, 'SG': 2, 'SF': 3, 'PF': 4, 'C': 5 };
      const isAsc = state.inventorySortOrder === 'asc';

      cards.sort((a, b) => {
        let diff = 0;
        if (state.currentInventorySort === 'ovr') {
          diff = (a.ovr || a.baseOvr) - (b.ovr || b.baseOvr);
        } else if (state.currentInventorySort === 'recent') {
          diff = (a.acquiredAt || 0) - (b.acquiredAt || 0);
        } else if (state.currentInventorySort === 'position') {
          diff = (posOrder[a.positions[0]] || 9) - (posOrder[b.positions[0]] || 9);
        } else if (state.currentInventorySort === 'rarity') {
          diff = (rarityRank[a.rarity] || 0) - (rarityRank[b.rarity] || 0);
        } else if (state.currentInventorySort === 'name') {
          return isAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        }
        return isAsc ? diff : -diff;
      });

      return cards;
    }

    /* =====================================================
       ④ UPGRADE SYSTEM (升星所)
    ===================================================== */
    let upgradeSortOrder = 'desc';

    function toggleUpgradeSortOrder() {
      upgradeSortOrder = (upgradeSortOrder === 'desc') ? 'asc' : 'desc';
      const btn = document.getElementById('upgradeSortOrderBtn');
      if (btn) btn.innerText = (upgradeSortOrder === 'asc') ? '↑ 升序' : '↓ 降序';
      openUpgradeModal();
    }

    function handleUpgradeClick(btn) {
      const name = btn.getAttribute('data-name');
      const star = Number(btn.getAttribute('data-star'));
      const edition = btn.getAttribute('data-edition') || '25';
      upgradePlayerStar(name, star, edition);
    }

    function closeUpgradeModal() {
      const modal = document.getElementById('upgradeModal');
      if (modal) modal.classList.add('hidden');
    }

  function upgradePlayerStar(playerName, targetStars, edition = '25') {
  if (!state.inventory) return;
  const targetStar = Number(targetStars) || 1;
  const targetName = String(playerName || '').trim();
  const targetEdition = getCardEdition({ edition });

  // 1. 篩選出同球員、同星級的卡片清單
  const matches = state.inventory.filter(c => 
    c && 
    String(c.name || '').trim() === targetName && 
    getCardEdition(c) === targetEdition &&
    (Number(c.stars) || 1) === targetStar
  );

  // 2. 檢驗張數
  if (matches.length < 2) {
    showToast(`❌ ${getCardDisplayName({ name: targetName, edition: targetEdition })} ★${targetStar} 卡片不足（持有 ${matches.length}/2 張）！`, 'warning');
    return;
  }

  // 3. 取得兩張卡片並安全提取累積生涯紀錄 (Legacy)
  const card1 = matches[0];
  const card2 = matches[1];

  // 🌟 合併/繼承兩張卡的生涯累積數據（場次、得分、籃板、助攻、冠軍戒指）與特質
  const leg1 = card1.legacy || { seasons: 0, games: 0, pts: 0, reb: 0, ast: 0, rings: 0, mvps: 0, traits: [] };
  const leg2 = card2.legacy || { seasons: 0, games: 0, pts: 0, reb: 0, ast: 0, rings: 0, mvps: 0, traits: [] };

  const mergedLegacy = {
    seasons: Math.max(leg1.seasons || 0, leg2.seasons || 0),
    games: Math.max(leg1.games || 0, leg2.games || 0),
    pts: Math.max(leg1.pts || 0, leg2.pts || 0),
    reb: Math.max(leg1.reb || 0, leg2.reb || 0),
    ast: Math.max(leg1.ast || 0, leg2.ast || 0),
    rings: Math.max(leg1.rings || 0, leg2.rings || 0),
    mvps: Math.max(leg1.mvps || 0, leg2.mvps || 0),
    fmvps: Math.max(leg1.fmvps || 0, leg2.fmvps || 0),
    dpoys: Math.max(leg1.dpoys || 0, leg2.dpoys || 0),
    records: Math.max(leg1.records || 0, leg2.records || 0),
    // 聯集去重所有已解鎖的特質（例如【得分機器】、【冠軍成員】）
    traits: Array.from(new Set([...(leg1.traits || []), ...(leg2.traits || [])]))
  };

  // 4. 從背包中移除消耗的兩張卡片
  removeCardById(card1.cardId);
  removeCardById(card2.cardId);

  // 5. 建立升星新卡並將累積紀錄完整注入
  const upgradedCard = createCard(card1, targetStar + 1);
  upgradedCard.legacy = mergedLegacy; // 🌟 關鍵：將舊紀錄完整繼承回來！

  // 榮譽卡背、漫畫收藏與熟練度都是同一卡片的生涯歷史，升星不可消失。
  const backsById = new Map();
  [...(card1.achievementBacks || []), ...(card2.achievementBacks || [])].forEach(back => {
    if (back && back.id && !backsById.has(back.id)) backsById.set(back.id, { ...back });
  });
  upgradedCard.achievementBacks = Array.from(backsById.values());
  const preferredBack = card1.activeCardBack || card2.activeCardBack || null;
  upgradedCard.activeCardBack = upgradedCard.achievementBacks.some(back => back.id === preferredBack)
    ? preferredBack
    : (upgradedCard.achievementBacks[0]?.id || null);
  const badge1 = card1.badgeJourney || { triggers: 0, moments: [] };
  const badge2 = card2.badgeJourney || { triggers: 0, moments: [] };
  const inheritedTriggers = Math.max(Number(badge1.triggers || 0), Number(badge2.triggers || 0));
  upgradedCard.badgeJourney = {
    triggers: inheritedTriggers,
    mastery: inheritedTriggers >= 30 ? 'Hall of Fame' : inheritedTriggers >= 15 ? 'Gold' : inheritedTriggers >= 5 ? 'Silver' : 'Bronze',
    moments: Array.from(new Set([...(badge1.moments || []), ...(badge2.moments || [])]))
  };
  upgradedCard.morale = card1.morale || card2.morale || { value: 0, status: 'normal' };

  // 🌟 繼承 FMVP 燙金印記與永久 OVR 提升
  const fmvpBonus = Math.max(card1.fmvpBonus || 0, card2.fmvpBonus || 0, mergedLegacy.fmvps || 0);
  upgradedCard.fmvpBonus = fmvpBonus;
  upgradedCard.isFmvp = !!(card1.isFmvp || card2.isFmvp || fmvpBonus > 0);
  upgradedCard.ovr = calculateCardOvr(upgradedCard.baseOvr, upgradedCard.stars, fmvpBonus);

  // 如果原本解鎖過【得分機器】(永久 OVR +1)，將特質加成補回
  if (upgradedCard.legacy.traits.includes('得分機器')) {
    upgradedCard.ovr += 1;
  }

  addCard(upgradedCard);

  // 6. 存檔與同步更新畫面
  saveGame();
  renderAll();
  openUpgradeModal();

  showRewardModal({
    title: '⭐ 升星成功！',
    subtitle: `${targetName} 成功晉升為 ★${upgradedCard.stars} 星！戰力更上層樓！`,
    rewards: [
      { icon: '⭐', name: `★${upgradedCard.stars} 級星評`, amount: `★${upgradedCard.stars}` },
      { icon: '🏀', name: '綜合戰力', amount: `OVR ${upgradedCard.ovr}` }
    ],
    note: `🏆 完整繼承生涯紀錄：得分 ${upgradedCard.legacy.pts || 0} 分 ｜ 冠軍戒指 💍×${upgradedCard.legacy.rings || 0}${mergedLegacy.fmvps > 0 ? ` ｜ FMVP 🏆×${mergedLegacy.fmvps} (OVR+${fmvpBonus})` : ''}`
  });
}
/* =====================================================
       🛠️ 頂部收合選單控制
    ===================================================== */
    function toggleTopMenu(e) {
      if (e && e.stopPropagation) e.stopPropagation();
      const menu = document.getElementById('topDropdownMenu');
      if (!menu) return;
      if (e === false) {
        menu.classList.add('hidden');
      } else {
        menu.classList.toggle('hidden');
      }
    }

/* =====================================================
       🛠️ 頂部收合選單控制 (修正版：乾淨開關)
    ===================================================== */
    function openTopMenu() {
      const menu = document.getElementById('topDropdownMenu');
      const backdrop = document.getElementById('topMenuBackdrop');
      if (menu) menu.classList.remove('hidden');
      if (backdrop) backdrop.classList.remove('hidden');
      if (window.lucide) lucide.createIcons();
    }

    function closeTopMenu() {
      const menu = document.getElementById('topDropdownMenu');
      const backdrop = document.getElementById('topMenuBackdrop');
      if (menu) menu.classList.add('hidden');
      if (backdrop) backdrop.classList.add('hidden');
    }
    function openUpgradeModal() {
      const modal = document.getElementById('upgradeModal');
      const container = document.getElementById('upgradeListContainer');
      if (!modal || !container) return;

      const teamSelect = document.getElementById('upgradeFilterTeam');
      if (teamSelect && teamSelect.options.length <= 1 && typeof ALL_30_TEAMS !== 'undefined') {
        ALL_30_TEAMS.forEach(team => {
          const opt = document.createElement('option');
          opt.value = team;
          opt.innerText = team;
          teamSelect.appendChild(opt);
        });
      }

      const posFilter = document.getElementById('upgradeFilterPos')?.value || 'ALL';
      const teamFilter = document.getElementById('upgradeFilterTeam')?.value || 'ALL';
      const rarityFilter = document.getElementById('upgradeFilterRarity')?.value || 'ALL';
      const sortField = document.getElementById('upgradeSortField')?.value || 'ovr';

      const groups = {};
      (state.inventory || []).forEach(card => {
        if (!card) return;
        const star = card.stars || 1;
        const key = `${card.name}__${getCardEdition(card)}__${star}`;
        if (!groups[key]) {
          groups[key] = { sample: card, star, count: 0 };
        }
        groups[key].count++;
      });

      let upgradeGroups = Object.values(groups);

      if (posFilter !== 'ALL') {
        upgradeGroups = upgradeGroups.filter(g => {
          const pList = g.sample.positions || g.sample.pos || [];
          return Array.isArray(pList) ? pList.includes(posFilter) : pList === posFilter;
        });
      }

      if (teamFilter !== 'ALL') {
        const targetTeam = String(teamFilter).trim().toUpperCase();
        upgradeGroups = upgradeGroups.filter(g => {
          const t = String(g.sample.team || g.sample.teamCode || g.sample.teamName || '').trim().toUpperCase();
          return t === targetTeam || (t.length > 0 && targetTeam.includes(t)) || (targetTeam.length > 0 && t.includes(targetTeam));
        });
      }

      if (rarityFilter !== 'ALL') {
        upgradeGroups = upgradeGroups.filter(g => (g.sample.rarity || 'N') === rarityFilter);
      }

      const isAsc = (upgradeSortOrder === 'asc');
      upgradeGroups.sort((a, b) => {
        let diff = 0;
        if (sortField === 'ovr') {
          diff = Number(a.sample.ovr || 0) - Number(b.sample.ovr || 0);
        } else if (sortField === 'star') {
          diff = (a.star || 1) - (b.star || 1);
        } else if (sortField === 'count') {
          diff = (a.count || 0) - (b.count || 0);
        }
        return isAsc ? diff : -diff;
      });

      if (upgradeGroups.length === 0) {
        container.innerHTML = `<p class="col-span-full text-xs text-slate-500 py-8 text-center">無符合條件的球員</p>`;
      } else {
        container.innerHTML = upgradeGroups.map(g => {
          const p = g.sample;
          const canUp = g.count >= 2;
          const curRarity = p.rarity || determineRarityByOvr(p.ovr || 75);
          const pPositions = Array.isArray(p.positions) ? p.positions.join('/') : (p.positions || '');

          return `
            <div class="bg-slate-950 border ${p.isLegend ? 'silver-black-glow border-slate-200' : getRarityBorder(curRarity)} rounded-xl p-3 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full overflow-hidden bg-slate-900 flex-shrink-0">
                  <img src="${getPlayerImgUrl(p.nbaId)}" class="w-full h-full object-cover object-top" onerror="this.src='https://cdn.nba.com/headshots/nba/latest/1040x760/fallback.png'">
                </div>
                <div>
                  <div class="flex items-center gap-1.5">
                    <span class="text-[9px] font-mono text-slate-400 bg-slate-900 px-1 rounded">${p.team || ''}</span>
                    <span class="text-[9px] font-mono text-indigo-300 font-bold">${pPositions}</span>
                    <h4 class="font-bold text-xs text-white truncate max-w-[120px]">${getCardDisplayName(p)}</h4>
                  </div>
                  <div class="text-[10px] text-slate-400 mt-0.5">
                    OVR ${p.ovr || p.baseOvr} ｜ ★${g.star}➔★${g.star + 1} ｜ 擁有: <span class="${canUp ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}">${g.count}</span>/2
                  </div>
                </div>
              </div>
              <button onclick="handleUpgradeClick(this)" data-name="${p.name}" data-edition="${getCardEdition(p)}" data-star="${g.star}" type="button" class="${canUp ? 'bg-amber-500 hover:bg-amber-400 text-black font-bold cursor-pointer' : 'bg-slate-800 text-slate-500 cursor-not-allowed'} px-3 py-1.5 rounded-lg text-xs transition">
                ${canUp ? '升星' : '不足'}
              </button>
            </div>`;
        }).join('');
      }

      modal.classList.remove('hidden');
    }

    /* =====================================================
       ⑤ ROSTER & TEAM OVERALL SYSTEM
    ===================================================== */
function getPlayerFromSlot(slotData) {
  if (!slotData) return null;
  const id = typeof slotData === 'string' ? slotData : (slotData.cardId || slotData.id);
  if (!id) return null;
  return (state.inventory || []).find(c => c && (c.cardId === id || c.id === id)) || null;
}
/* =====================================================
   🏀 球隊總評計算（階梯式隊套化學反應：3人+1 / 6人+2 / 9人+3）
===================================================== */
function calculateTeamOverall() {
  const positions = ['PG', 'SG', 'SF', 'PF', 'C'];
  const starters = positions.map(pos => state.startingLineup[pos]).filter(Boolean);
  const bench = state.benchLineup.filter(Boolean);
  const allPlayers = [...starters, ...bench];

  const hasMentorOnBench = bench.some(p => p && p.isMentor);

  // 1. 計算先發平均戰力（含錯位懲罰與導師庇護）
  let totalStarterOvr = 0;
  starters.forEach(p => {
    // 找出該先發球員擺放的位置
    const assignedPos = Object.keys(state.startingLineup).find(pos => state.startingLineup[pos]?.cardId === p.cardId);
    const naturalPos = assignedPos ? p.positions.includes(assignedPos) : true;
    const isProtected = !naturalPos && p.isRookie && hasMentorOnBench;
    const penalty = (!naturalPos && !isProtected) ? 5 : 0;
    totalStarterOvr += ((p.ovr || p.baseOvr) - penalty);
  });

  const avgStarter = starters.length > 0 ? (totalStarterOvr / starters.length) : 0;
  
  // 替補評分
  const totalBenchOvr = bench.reduce((sum, p) => sum + (p.ovr || p.baseOvr), 0);
  const avgBench = bench.length > 0 ? (totalBenchOvr / bench.length) : 0;

  // 2. 統計陣容中各 NBA 球隊人數（找出人數最多的大宗隊伍）
  const teamCounts = {};
  allPlayers.forEach(p => {
    if (p.team) {
      teamCounts[p.team] = (teamCounts[p.team] || 0) + 1;
    }
  });

  let maxTeam = '';
  let maxCount = 0;
  Object.entries(teamCounts).forEach(([team, count]) => {
    if (count > maxCount) {
      maxCount = count;
      maxTeam = team;
    }
  });

  // 3. 隊套階梯加成邏輯：3人+1 / 6人+2 / 9人+3
  let chemistryBonus = 0;
  if (maxCount >= 9) {
    chemistryBonus = 3;
  } else if (maxCount >= 6) {
    chemistryBonus = 2;
  } else if (maxCount >= 3) {
    chemistryBonus = 1;
  }

  // 4. ON FIRE 額外 +2 OVR（多益打卡達成 100 字或特定激勵）
  const onFireBonus = state.toeic?.onFire ? 2 : 0;

  // 5. 計算球隊加權總評（先發佔 70%，替補佔 30%）
  let baseOverall = 0;
  if (allPlayers.length > 0) {
    baseOverall = Math.round(avgStarter * 0.7 + avgBench * 0.3);
  }
  const finalOverall = Math.max(50, baseOverall + chemistryBonus + onFireBonus);

  // 6. 更新頂部徽章文字展示（提示當前隊套進度）
  const chemBadgeEl = document.getElementById('chemistryBadge');
  if (chemBadgeEl) {
    if (maxCount >= 3) {
      chemBadgeEl.innerText = `🛡️ ${maxTeam}隊套(${maxCount}人): +${chemistryBonus} OVR`;
      chemBadgeEl.className = "text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/60 px-2 py-0.5 rounded-full";
    } else {
      chemBadgeEl.innerText = `化學反應: 同隊${maxCount}/3人 (+0 OVR)`;
      chemBadgeEl.className = "text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full";
    }
  }

  return {
    overall: finalOverall,
    baseOverall: baseOverall,
    chemistry: chemistryBonus,
    filled: allPlayers.length,
    dominantTeam: maxTeam,
    teamCount: maxCount
  };
}
    function calculateChemistry(players = []) {
      const counts = {};
      players.forEach(p => counts[p.team] = (counts[p.team] || 0) + 1);
      let chem = 0;
      Object.values(counts).forEach(c => chem += Math.floor(c / 3));
      return chem;
    }

    function isOnFire() {
      return !document.getElementById('onFireBadge')?.classList.contains('hidden');
    }

function isPlayerInRoster(cardId) {
      if (!cardId) return false;
      const inStarters = Object.values(state.startingLineup).some(p => p && p.cardId === cardId);
      const inBench = state.benchLineup.some(p => p && p.cardId === cardId);
      return inStarters || inBench;
    }

    function removePlayerFromEntireRoster(cardId) {
      if (!cardId) return;
      Object.keys(state.startingLineup).forEach(pos => {
        if (state.startingLineup[pos] && state.startingLineup[pos].cardId === cardId) {
          state.startingLineup[pos] = null;
        }
      });
      state.benchLineup = state.benchLineup.map(p => (p && p.cardId === cardId ? null : p));
    }

    function removeStarter(pos) {
      state.startingLineup[pos] = null;
      renderAll();
    }
/* =====================================================
       📱 手機版指定位置上陣邏輯
    ===================================================== */
    let currentAssignCardId = null;

    function openQuickAssignModal(cardId) {
      currentAssignCardId = cardId;
      const card = (state.inventory || []).find(c => c && c.cardId === cardId);
      if (!card) return;

      const nameEl = document.getElementById('qaPlayerName');
      const posEl = document.getElementById('qaPlayerPos');
      if (nameEl) nameEl.innerText = `${getCardDisplayName(card)} (OVR ${card.ovr})`;
      if (posEl) posEl.innerText = `原主打位置: ${(card.positions || []).join('/')}`;

      const modal = document.getElementById('quickAssignModal');
      if (modal) modal.classList.remove('hidden');
    }

    function closeQuickAssignModal() {
      currentAssignCardId = null;
      const modal = document.getElementById('quickAssignModal');
      if (modal) modal.classList.add('hidden');
    }

    // 指定上陣至先發 PG/SG/SF/PF/C
    function assignToStarterSlot(targetPos) {
      if (!currentAssignCardId) return;
      const card = (state.inventory || []).find(c => c && c.cardId === currentAssignCardId);
      if (!card) return;

      removePlayerFromEntireRoster(card.cardId);
      state.startingLineup[targetPos] = card;

      closeQuickAssignModal();
      renderAll();
      showToast(`已將 ${getCardDisplayName(card)} 指派為先發 ${targetPos}！`, "success");
    }

    // 指定放入替補席
    function assignToBenchSlot() {
      if (!currentAssignCardId) return;
      const id = currentAssignCardId;
      closeQuickAssignModal();
      addBench(id);
    }
    function addBench(cardId) {
      const card = (state.inventory || []).find(c => c && c.cardId === cardId);
      if (!card) return;
      removePlayerFromEntireRoster(card.cardId);
      const emptyIdx = state.benchLineup.findIndex(slot => slot === null);
      if (emptyIdx === -1) { 
        showToast("替補席 6 人已滿！", "warning"); 
        return; 
      }
      state.benchLineup[emptyIdx] = card;
      renderAll();
    }

    function removeBench(idx) {
      state.benchLineup[idx] = null;
      renderAll();
    }

    function autoSetHighestOvrLineup() {
      if (!state.inventory || state.inventory.length === 0) { 
        showToast("背包內尚無球員卡！", "warning"); 
        return; 
      }
      state.startingLineup = { PG: null, SG: null, SF: null, PF: null, C: null };
      state.benchLineup = [null, null, null, null, null, null];
      // 一鍵最佳陣容必須讀取完整卡庫，不能被 CARDS 頁目前的篩選條件限制。
      const available = getHighestStarCards().sort((a, b) => (b.ovr || b.baseOvr) - (a.ovr || a.baseOvr));
      const usedCardIds = new Set();

      ['PG', 'SG', 'SF', 'PF', 'C'].forEach(pos => {
        const c = available.find(p => !usedCardIds.has(p.cardId) && p.positions.includes(pos));
        if (c) { state.startingLineup[pos] = c; usedCardIds.add(c.cardId); }
      });
      ['PG', 'SG', 'SF', 'PF', 'C'].forEach(pos => {
        if (!state.startingLineup[pos]) {
          const f = available.find(p => !usedCardIds.has(p.cardId));
          if (f) { state.startingLineup[pos] = f; usedCardIds.add(f.cardId); }
        }
      });
      for (let i = 0; i < 6; i++) {
        const b = available.find(p => !usedCardIds.has(p.cardId));
        if (b) { state.benchLineup[i] = b; usedCardIds.add(b.cardId); }
      }
      renderAll();
      showToast("一鍵最佳陣容配置完成！", "success");
    }

    function handleCardDragStart(e, cardId) {
      e.dataTransfer.setData("text/plain", cardId);
      e.dataTransfer.effectAllowed = "move";
    }

    function handleDragOver(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }

    function handleStarterDrop(e, targetPos) {
      e.preventDefault();
      const draggedCardId = e.dataTransfer.getData("text/plain");
      if (!draggedCardId) return;

      const draggedPlayer = (state.inventory || []).find(p => p && p.cardId === draggedCardId);
      if (!draggedPlayer) return;

      const existingPlayer = state.startingLineup[targetPos];
      if (existingPlayer && existingPlayer.cardId === draggedCardId) return;

      let sourcePos = null;
      let sourceBenchIdx = -1;

      Object.keys(state.startingLineup).forEach(pos => {
        if (state.startingLineup[pos] && state.startingLineup[pos].cardId === draggedCardId) sourcePos = pos;
      });
      state.benchLineup.forEach((p, idx) => {
        if (p && p.cardId === draggedCardId) sourceBenchIdx = idx;
      });

      if (sourcePos !== null) {
        state.startingLineup[sourcePos] = existingPlayer;
        state.startingLineup[targetPos] = draggedPlayer;
      } else if (sourceBenchIdx !== -1) {
        state.benchLineup[sourceBenchIdx] = existingPlayer;
        state.startingLineup[targetPos] = draggedPlayer;
      } else {
        removePlayerFromEntireRoster(draggedPlayer.cardId);
        state.startingLineup[targetPos] = draggedPlayer;
      }
      renderAll();
    }

    function handleBenchDrop(e, targetBenchIdx) {
      e.preventDefault();
      const draggedCardId = e.dataTransfer.getData("text/plain");
      if (!draggedCardId) return;

      const draggedPlayer = (state.inventory || []).find(p => p && p.cardId === draggedCardId);
      if (!draggedPlayer) return;

      const existingPlayer = state.benchLineup[targetBenchIdx];
      if (existingPlayer && existingPlayer.cardId === draggedCardId) return;

      let sourcePos = null;
      let sourceBenchIdx = -1;

      Object.keys(state.startingLineup).forEach(pos => {
        if (state.startingLineup[pos] && state.startingLineup[pos].cardId === draggedCardId) sourcePos = pos;
      });
      state.benchLineup.forEach((p, idx) => {
        if (p && p.cardId === draggedCardId) sourceBenchIdx = idx;
      });

      if (sourcePos !== null) {
        state.startingLineup[sourcePos] = existingPlayer;
        state.benchLineup[targetBenchIdx] = draggedPlayer;
      } else if (sourceBenchIdx !== -1) {
        state.benchLineup[sourceBenchIdx] = existingPlayer;
        state.benchLineup[targetBenchIdx] = draggedPlayer;
      } else {
        removePlayerFromEntireRoster(draggedPlayer.cardId);
        state.benchLineup[targetBenchIdx] = draggedPlayer;
      }
      renderAll();
    }
    /* =====================================================
       ⑥ MARKET SYSTEM (交易所 & 一鍵轉化)
    ===================================================== */
    let marketSortOrder = 'desc';

    function toggleMarketSortOrder() {
      marketSortOrder = (marketSortOrder === 'desc') ? 'asc' : 'desc';
      const btn = document.getElementById('marketSortOrderBtn');
      if (btn) btn.innerText = (marketSortOrder === 'asc') ? '↑ 升序' : '↓ 降序';
      openMarketModal();
    }

function closeMarketModal() {
      if (flashTimerInterval) {
        clearInterval(flashTimerInterval);
        flashTimerInterval = null;
      }
      document.getElementById('marketModal').classList.add('hidden');
    }
    function handleConvertById(cardId) {
      const pointsMap = { 'UR': 100, 'SSR': 50, 'SR': 20, 'R': 10, 'N': 5 };
      const card = removeCardById(cardId);
      if (!card) return;

      const val = pointsMap[card.rarity] || 5;
      state.scoutPoints = (Number(state.scoutPoints) || 0) + val;

      saveGame();
      renderAll();
      openMarketModal();
      showToast(`成功轉化 ${card.name}，獲得 ${val} 點選秀碎片！`, 'success');
    }

    async function batchConvertCards() {
      const shardMap = { 'N': 1, 'R': 3, 'SR': 10, 'SSR': 30 };
      const tier = document.getElementById('convertTierSelect')?.value || 'N';

      const lineupCardIds = new Set([
        ...Object.values(state.startingLineup).filter(Boolean).map(c => c.cardId),
        ...state.benchLineup.filter(Boolean).map(c => c.cardId)
      ]);

      const targetIndexes = [];
      let totalShards = 0;

      state.inventory.forEach((card, index) => {
        if (!card) return;
        const cardRarity = (card.rarity || determineRarityByOvr(card.ovr || 70)).toUpperCase();
        if (lineupCardIds.has(card.cardId)) return;

        let isMatch = false;
        if (tier === 'N' && cardRarity === 'N') isMatch = true;
        if (tier === 'R' && cardRarity === 'R') isMatch = true;
        if (tier === 'N_R' && (cardRarity === 'N' || cardRarity === 'R')) isMatch = true;
        if (tier === 'SR' && cardRarity === 'SR') isMatch = true;

        if (isMatch) {
          targetIndexes.push(index);
          totalShards += (shardMap[cardRarity] || 1);
        }
      });

      if (targetIndexes.length === 0) {
        showToast(` 目前背包內沒有可轉化的【${tier}】閒置卡片！`, 'warning');
        return;
      }

      const confirmed = await showGameConfirm({
        title: '♻️ 確認批次轉化卡片',
        message: `確定轉化 ${targetIndexes.length} 張【${tier}】球員卡？\n預計獲得 🧩 ${totalShards} 點選秀碎片\n（先發與替補席球員均受保護不會被轉化）`,
        confirmText: '確定轉化',
        cancelText: '取消',
        type: 'warning'
      });

      if (!confirmed) return;

      targetIndexes.sort((a, b) => b - a).forEach(idx => {
        state.inventory.splice(idx, 1);
      });

      // 同步發放至 scoutPoints，全面連動頂部看板與傳奇兌換
      state.scoutPoints = (Number(state.scoutPoints) || 0) + totalShards;

      saveGame();
      renderAll();
      openMarketModal();

      showToast(` 轉化成功！獲得了 🧩 ${totalShards} 點選秀碎片！`, 'success');
    }

    function openMarketModal() {
renderFlashMarket(); // 👈 加上這行，確保打開交易所時先畫出今日黑市商品
      const modal = document.getElementById('marketModal');
      const container = document.getElementById('marketSellListContainer');
      if (!modal || !container) return;

      const teamSelect = document.getElementById('marketFilterTeam');
      if (teamSelect && teamSelect.options.length <= 1 && typeof ALL_30_TEAMS !== 'undefined') {
        ALL_30_TEAMS.forEach(team => {
          const opt = document.createElement('option');
          opt.value = team;
          opt.innerText = team;
          teamSelect.appendChild(opt);
        });
      }

      const teamFilter = document.getElementById('marketFilterTeam')?.value || 'ALL';
      const posFilter = document.getElementById('marketFilterPos')?.value || 'ALL';
      const rarityFilter = document.getElementById('marketFilterRarity')?.value || 'ALL';
      const sortField = document.getElementById('marketSortField')?.value || 'ovr';

      let cardList = [...(state.inventory || [])];

      if (teamFilter !== 'ALL') {
        const selectedTeam = String(teamFilter).trim().toUpperCase();
        cardList = cardList.filter(c => {
          const cardTeam = String(c.team || c.teamCode || '').trim().toUpperCase();
          return cardTeam === selectedTeam;
        });
      }

      if (posFilter !== 'ALL') {
        cardList = cardList.filter(c => c.positions && c.positions.includes(posFilter));
      }

      if (rarityFilter !== 'ALL') {
        cardList = cardList.filter(c => c.rarity === rarityFilter);
      }

      const isAsc = (marketSortOrder === 'asc');
      const rarityRank = { UR: 5, SSR: 4, SR: 3, R: 2, N: 1 };

      cardList.sort((a, b) => {
        let diff = 0;
        if (sortField === 'ovr') {
          diff = (a.ovr || a.baseOvr || 0) - (b.ovr || b.baseOvr || 0);
        } else if (sortField === 'rarity') {
          diff = (rarityRank[a.rarity] || 0) - (rarityRank[b.rarity] || 0);
        } else if (sortField === 'recent') {
          diff = (a.acquiredAt || 0) - (b.acquiredAt || 0);
        }
        return isAsc ? diff : -diff;
      });

      const pointsMap = { 'UR': 100, 'SSR': 50, 'SR': 20, 'R': 10, 'N': 5 };

      if (cardList.length === 0) {
        container.innerHTML = `<p class="col-span-full text-xs text-slate-500 py-8 text-center">無符合條件的球員</p>`;
      } else {
        container.innerHTML = cardList.map(p => {
          return `
            <div class="bg-slate-950 border ${p.isLegend ? 'silver-black-glow border-slate-200' : getRarityBorder(p.rarity)} rounded-xl p-2.5 flex flex-col items-center justify-between text-center shadow">
              <div class="w-full flex justify-between text-[10px] font-mono text-slate-400">
                <span>${p.team}</span>
                <span>★${p.stars || 1}</span>
              </div>
              <div class="w-10 h-10 rounded-full overflow-hidden bg-slate-900 my-1">
                <img src="${getPlayerImgUrl(p.nbaId)}" class="w-full h-full object-cover object-top" onerror="this.src='https://cdn.nba.com/headshots/nba/latest/1040x760/fallback.png'">
              </div>
              <p class="text-xs font-bold text-white truncate w-full">${getCardDisplayName(p)}</p>
              <div class="text-[10px] text-pink-400 font-bold my-1">+${pointsMap[p.rarity] || 5} 💎</div>
              <button onclick="handleConvertById('${p.cardId}')" type="button" class="w-full py-1 bg-pink-950/60 hover:bg-pink-900 text-pink-300 rounded-lg text-[10px] border border-pink-800/40 transition">
                轉化
              </button>
            </div>`;
        }).join('');
      }

      modal.classList.remove('hidden');
    }
/* =====================================================
       ⚡ FLASH MARKET (每日快閃黑市系統)
    ===================================================== */
    // 依稀有度設定黑市特惠碎決定價
    const FLASH_PRICE_TIERS = {
      'R': 40,    // 40 碎片
      'SR': 90,   // 90 碎片
      'SSR': 220  // 220 碎片特惠
    };

    // 取得或初始化當日黑市貨品
    function getDailyFlashDeals() {
      const today = getTodayString();
      if (!state.flashMarket) state.flashMarket = { date: '', deals: [] };

      // 如果跨日或尚未產生，依照今日日期做種子生成 3 張特惠卡
      if (state.flashMarket.date !== today || !state.flashMarket.deals.length) {
        state.flashMarket.date = today;
        state.flashMarket.deals = generateDailyDeals();
        saveGame();
      }
      return state.flashMarket.deals;
    }

    function generateDailyDeals() {
      const eligibleTiers = ['R', 'SR', 'SSR'];
      const deals = [];

      eligibleTiers.forEach((tier, slotIdx) => {
        const pool = NBA_PLAYERS.filter(p => p.rarity === tier && !p.isLegend);
        const player = pool[Math.floor(Math.random() * pool.length)] || NBA_PLAYERS[0];
        deals.push({
          slotId: slotIdx,
          name: player.name,
          team: player.team,
          positions: player.positions,
          baseOvr: player.baseOvr,
          ovr: player.ovr,
          rarity: player.rarity,
          nbaId: player.nbaId,
          price: FLASH_PRICE_TIERS[tier] || 50,
          bought: false
        });
      });

      return deals;
    }

    // 渲染黑市商品卡
let flashTimerInterval = null;

function renderFlashMarket() {
  const container = document.getElementById('flashMarketGrid');
  const timerEl = document.getElementById('flashMarketTimer');
  if (!container) return;

  //  加強防護：先強制清除現有定時器
  if (flashTimerInterval) {
    clearInterval(flashTimerInterval);
    flashTimerInterval = null;
  }

  const updateTimer = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diffMs = midnight - now;

    if (diffMs <= 0) {
      clearInterval(flashTimerInterval);
      flashTimerInterval = null;
      state.flashMarket = { date: '', deals: [] };
      renderFlashMarket();
      return;
    }

    const h = String(Math.floor(diffMs / 3600000)).padStart(2, '0');
    const m = String(Math.floor((diffMs % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((diffMs % 60000) / 1000)).padStart(2, '0');
    if (timerEl) timerEl.innerText = `刷新倒數: ${h}:${m}:${s}`;
  };

  updateTimer();
  flashTimerInterval = setInterval(updateTimer, 1000);
      const deals = getDailyFlashDeals();
      container.innerHTML = deals.map(item => `
        <div class="bg-slate-950/80 border ${item.bought ? 'border-slate-800 opacity-40' : getRarityBorder(item.rarity)} rounded-2xl p-3 flex items-center justify-between text-left">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-full overflow-hidden bg-slate-900 flex-shrink-0">
              <img src="${getPlayerImgUrl(item.nbaId)}" class="w-full h-full object-cover object-top" onerror="this.src='https://cdn.nba.com/headshots/nba/latest/1040x760/fallback.png'">
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <span class="text-[9px] font-mono font-bold text-amber-400 bg-slate-900 px-1 rounded">${item.rarity}</span>
                <span class="text-[9px] text-slate-400">${item.team}</span>
              </div>
              <h5 class="text-xs font-bold text-white truncate max-w-[110px]">${item.name}</h5>
              <div class="text-[10px] text-pink-400 font-mono font-bold">OVR ${item.ovr} ｜ ${item.price} 💎</div>
            </div>
          </div>
          <button onclick="buyFlashDeal(${item.slotId})" type="button" class="${item.bought ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:brightness-110 text-white font-bold cursor-pointer shadow'} px-3 py-1.5 rounded-xl text-xs transition flex-shrink-0">
            ${item.bought ? '已售出' : '兌換'}
          </button>
        </div>
      `).join('');
    }
    // 購買黑市商品
    function buyFlashDeal(slotId) {
      const deals = getDailyFlashDeals();
      const deal = deals.find(d => d.slotId === slotId);
      if (!deal || deal.bought) return;

      if (state.scoutPoints < deal.price) {
        playSound('buzz');
        showToast(`❌ 選秀碎片不足！需要 ${deal.price} 💎（目前持有 ${state.scoutPoints} 💎）`, 'warning');
        return;
      }

      state.scoutPoints -= deal.price;
      deal.bought = true;

      // 產生卡片入庫
      const newCard = createCard(deal, 1);
      addCard(newCard);

      saveGame();
      renderAll();
      openMarketModal();

      showRewardModal({
        title: '🎉 黑市簽約成功！',
        subtitle: `成功簽下球員【${deal.name}】！`,
        rewards: [
          { icon: '🏀', name: deal.name, amount: `${deal.rarity} ${deal.ovr}` }
        ]
      });
    }

    function buyKobeLegend() {
      if (state.scoutPoints < 2400) { 
        showToast("❌ 選秀碎片不足 2400 點！", "warning"); 
        return; 
      }
      state.scoutPoints -= 2400;
      const kobeCard = createCard({
        name: "Kobe Bryant", edition: '10', team: "LAL", positions: ["SG", "SF"], designId: 'mamba-signature-v1',
        baseOvr: 99, ovr: 99, realOvr: 97, real_ovr: 97, rarity: "UR", nbaId: 977, isLegend: true,
        basic: {
          MP: 38.8,
          FGA: 21.5,
          "FG%": "45.6%",
          "3PA": 4.1,
          "3P%": "32.9%",
          FTA: 7.4,
          "FT%": "81.1%",
          ORB: 1.1,
          DRB: 4.3,
          AST: 5.0,
          STL: 1.5,
          BLK: 0.3,
          TOV: 3.2,
          PF: 2.6,
          PTS: 27.0
        },
        advanced: {
          "USG%": "32.3%",
          "TS%": "54.5%",
          "AST%": "23.8%",
          "TRB%": "7.7%",
          "STL%": "2.1%",
          "BLK%": "0.5%",
          "PER": "21.9",
          "WS": "9.4",
          "BPM": "+4.1",
          "VORP": "4.4"
        }
      }, 1);
      addCard(kobeCard);
      saveGame();
      renderAll();
      openMarketModal();

      showRewardModal({
        title: '🏆 傳奇降臨！',
        subtitle: "成功兌換 NBA 傳奇球星 Kobe Bryant ('10)！",
        rewards: [
          { icon: '⭐', name: "Kobe Bryant ('10)", amount: 'UR 99' },
          { icon: '👑', name: '曼巴精神', amount: 'LEGEND' }
        ]
      });
    }

    function buyTicketWithGems() {
      if (state.scoutPoints < 50) {
        playSound('buzz');
        showToast("⚠️ 選秀碎片不足 50 點！", "warning");
        return;
      }
      state.scoutPoints -= 50;
      state.tickets += 1;
      playSound('coin');
      saveGame();
      renderAll();
      showToast("🎉 成功以 50 碎片兌換 1 張抽卡券！", "success");
    }

    /* =====================================================
       ⑦ GACHA SYSTEM (抽卡)
    ===================================================== */
    function rollRarity() {
      const rand = Math.random() * 100.0;
      if (rand < GACHA_RATES.UR) return "UR";
      if (rand < GACHA_RATES.UR + GACHA_RATES.SSR) return "SSR";
      if (rand < GACHA_RATES.UR + GACHA_RATES.SSR + GACHA_RATES.SR) return "SR";
      if (rand < GACHA_RATES.UR + GACHA_RATES.SSR + GACHA_RATES.SR + GACHA_RATES.R) return "R";
      return "N";
    }

    function launchGachaWithShopAnimation(times) {
      if (!state.isAdmin && state.tickets < times) { 
        showToast("🎟️ 抽卡券不足！", ); 
        return; 
      }
      pendingGachaTimes = times;
      document.getElementById('cardShopOverlay').classList.remove('hidden');
    }

function ripShopPack() {
  if (isRippingPack) return; // 鎖住，防止連續點擊重複觸發
  isRippingPack = true;

  const pack = document.getElementById('shopPackVisual');
  pack.classList.add('pack-ripping');
  playSound('rip');
  setTimeout(() => {
    document.getElementById('cardShopOverlay').classList.add('hidden');
    pack.classList.remove('pack-ripping');
    executeGacha(pendingGachaTimes);
    isRippingPack = false; // 動畫結束並抽完卡後解鎖
  }, 650);
}

    function executeGacha(times) {
      if (!state.isAdmin) state.tickets -= times;
      activeSessionCards = [];

      for (let i = 0; i < times; i++) {
        const rarity = rollRarity();
        const pool = NBA_PLAYERS.filter(p => p.rarity === rarity);
        const basePlayer = pool[Math.floor(Math.random() * pool.length)] || NBA_PLAYERS[0];
        const newCard = createCard(basePlayer, 1);
        addCard(newCard);
        activeSessionCards.push({ cardData: newCard, flipped: false });
      }

      // 抽卡完成後讓新球員能立刻在 TEAM → CARDS 被看見。
      // 清除舊篩選並切到「最近獲得」，但不改動卡片資料、卡池或機率。
      state.inventoryFilters = { position: 'ALL', team: 'ALL', rarity: 'ALL' };
      state.currentInventorySort = 'recent';
      state.inventorySortOrder = 'desc';

      saveGame();
      renderGachaResult(times);
      renderAll();
    }

    function getNBALogoSVG() {
      return `
        <svg class="w-10 h-16 drop-shadow-md select-none" viewBox="0 0 100 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="200" rx="12" fill="#1D428A"/>
          <path d="M50 0H100V200H50C50 200 50 0 50 0Z" fill="#C8102E"/>
          <circle cx="50" cy="55" r="14" fill="white"/>
          <path d="M46 72C38 85 30 105 24 135C35 130 45 125 52 118L44 155L38 190H52L58 148L68 128C74 122 80 115 82 102C84 88 75 80 64 76C56 74 50 72 46 72Z" fill="white"/>
          <circle cx="78" cy="118" r="8" fill="white"/>
        </svg>
      `;
    }

    function getGachaBackClass(card) {
      if (card && card.isLegend) return 'border-2 silver-black-glow';
      if (card && card.rarity === 'UR') return 'border-2 rainbow-glow border-pink-500';
      if (card && card.rarity === 'SSR') return 'border-2 gold-glow border-amber-400';
      if (card && card.rarity === 'SR') return 'border-2 purple-glow border-purple-400';
      if (card && card.rarity === 'R') return 'border-2 border-blue-400 gacha-blue-glow';
      return 'border-2 border-slate-700 gacha-normal-glow';
    }

    function flipCardDirect(idx, id) {
      if (activeSessionCards[idx].flipped) return;
      activeSessionCards[idx].flipped = true;
      playSound('flip');
      const el = document.getElementById(id);
      if (el) el.classList.add('rotate-y-180');
      if (activeSessionCards[idx].cardData.rarity === 'UR' || activeSessionCards[idx].cardData.rarity === 'SSR') {
        playSound('ur_ssr');
        confetti({ particleCount: 80 });
      }
    }

    function revealAllCards() {
      activeSessionCards.forEach((item, idx) => {
        const id = activeSessionCards.length === 1 ? 'single-card' : `ten-${idx}`;
        flipCardDirect(idx, id);
      });
    }

    function closeGachaModal() {
      document.getElementById('gachaModal').classList.add('hidden');
      renderAll();
    }

 function renderGachaResult(times) {
  const modal = document.getElementById('gachaModal');
  const singleContainer = document.getElementById('gachaSingleContainer');
  const rowTop = document.getElementById('gachaRowTop');
  const rowBottom = document.getElementById('gachaRowBottom');

  if (times === 1) {
    singleContainer.classList.remove('hidden'); rowTop.classList.add('hidden'); rowBottom.classList.add('hidden');
    const p = activeSessionCards[0].cardData;
    singleContainer.innerHTML = `
      <div class="perspective-1000 w-56 h-80 cursor-pointer select-none card-floating" onclick="flipCardDirect(0, 'single-card')">
        <div id="single-card" class="w-full h-full relative transform-style-preserve-3d transition-transform duration-700">
          <div class="absolute inset-0 backface-hidden rounded-2xl bg-slate-900 flex flex-col justify-center items-center p-4 gacha-unrevealed ${getGachaBackClass(p)}">
            ${getNBALogoSVG()}
          </div>
          <!-- 單抽翻開面：加入 👁️ 眼睛按鈕 -->
          <div class="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl border-2 ${getRarityBorder(p.rarity)} bg-slate-900 flex flex-col justify-between items-center p-4 text-center">
            <div class="flex justify-between items-center w-full text-xs font-mono font-bold">
              <span>${p.team}</span>
              <div class="flex items-center gap-1.5">
                <button onclick="showPlayerDetails(event, '${p.cardId}')" type="button" class="text-sm hover:scale-125 transition cursor-pointer" title="查看數據">👁️</button>
                <span class="${p.rarity==='UR'?'text-pink-400':'text-amber-400'}">${p.rarity}</span>
              </div>
            </div>
            <img src="${getPlayerImgUrl(p.nbaId)}" class="w-20 h-20 rounded-full object-cover object-top my-2 bg-slate-800" onerror="this.src='https://cdn.nba.com/headshots/nba/latest/1040x760/fallback.png'">
            <div class="font-bold text-sm text-white">${getCardDisplayName(p)}</div>
            <div class="text-xs font-mono text-amber-300 font-bold">OVR ${p.ovr}</div>
          </div>
        </div>
      </div>`;
  } else {
    singleContainer.classList.add('hidden'); rowTop.classList.remove('hidden'); rowBottom.classList.remove('hidden');
    // 十連抽上半排 (0~4)
    rowTop.innerHTML = activeSessionCards.slice(0, 5).map((item, idx) => `
      <div class="perspective-1000 w-20 sm:w-28 h-32 sm:h-44 cursor-pointer select-none" onclick="flipCardDirect(${idx}, 'ten-${idx}')">
        <div id="ten-${idx}" class="w-full h-full relative transform-style-preserve-3d transition-transform duration-700">
          <div class="absolute inset-0 backface-hidden rounded-xl bg-slate-900 flex flex-col justify-center items-center p-2 gacha-unrevealed ${getGachaBackClass(item.cardData)}">${getNBALogoSVG()}</div>
          <!-- 翻開面頂部：加入 👁️ 眼睛按鈕 -->
          <div class="absolute inset-0 backface-hidden rotate-y-180 rounded-xl border-2 ${getRarityBorder(item.cardData.rarity)} bg-slate-900 flex flex-col justify-between items-center p-2 text-center">
            <div class="flex justify-between items-center w-full">
              <span class="text-[9px] font-mono">${item.cardData.rarity}</span>
              <button onclick="showPlayerDetails(event, '${item.cardData.cardId}')" type="button" class="text-[10px] hover:scale-125 transition cursor-pointer" title="查看數據">👁️</button>
            </div>
            <img src="${getPlayerImgUrl(item.cardData.nbaId)}" class="w-10 h-10 rounded-full object-cover object-top bg-slate-800" onerror="this.src='https://cdn.nba.com/headshots/nba/latest/1040x760/fallback.png'">
            <p class="text-[10px] font-bold truncate w-full">${getCardDisplayName(item.cardData)}</p>
            <span class="text-[9px] font-mono text-amber-300 font-bold">${item.cardData.ovr}</span>
          </div>
        </div>
      </div>`).join('');

    // 十連抽下半排 (5~9)
    rowBottom.innerHTML = activeSessionCards.slice(5, 10).map((item, idx) => `
      <div class="perspective-1000 w-20 sm:w-28 h-32 sm:h-44 cursor-pointer select-none" onclick="flipCardDirect(${idx+5}, 'ten-${idx+5}')">
        <div id="ten-${idx+5}" class="w-full h-full relative transform-style-preserve-3d transition-transform duration-700">
          <div class="absolute inset-0 backface-hidden rounded-xl bg-slate-900 flex flex-col justify-center items-center p-2 gacha-unrevealed ${getGachaBackClass(item.cardData)}">${getNBALogoSVG()}</div>
          <!-- 翻開面頂部：加入 👁️ 眼睛按鈕 -->
          <div class="absolute inset-0 backface-hidden rotate-y-180 rounded-xl border-2 ${getRarityBorder(item.cardData.rarity)} bg-slate-900 flex flex-col justify-between items-center p-2 text-center">
            <div class="flex justify-between items-center w-full">
              <span class="text-[9px] font-mono">${item.cardData.rarity}</span>
              <button onclick="showPlayerDetails(event, '${item.cardData.cardId}')" type="button" class="text-[10px] hover:scale-125 transition cursor-pointer" title="查看數據">👁️</button>
            </div>
            <img src="${getPlayerImgUrl(item.cardData.nbaId)}" class="w-10 h-10 rounded-full object-cover object-top bg-slate-800" onerror="this.src='https://cdn.nba.com/headshots/nba/latest/1040x760/fallback.png'">
            <p class="text-[10px] font-bold truncate w-full">${getCardDisplayName(item.cardData)}</p>
            <span class="text-[9px] font-mono text-amber-300 font-bold">${item.cardData.ovr}</span>
          </div>
        </div>
      </div>`).join('');
  }
  modal.classList.remove('hidden');
}

    /* =====================================================
       ⑧ SIMULATION & BATTLE SYSTEM
    ===================================================== */
function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

    function simulateGame(teamOvr, oppOvr) {
      const win = Math.random() < (0.5 + (teamOvr - oppOvr) * 0.035);
      let myScore = Math.floor(100 + Math.random() * 20 + (teamOvr - 80));
      let oppScore = Math.floor(100 + Math.random() * 20 + (oppOvr - 80));
      if (win && myScore <= oppScore) myScore = oppScore + Math.floor(Math.random() * 6 + 1);
      if (!win && myScore >= oppScore) oppScore = myScore + Math.floor(Math.random() * 6 + 1);
      return { win, myScore, oppScore };
    }

/* =====================================================
   🛑 彈窗安全關閉與防卡死解除函式
===================================================== */
let pendingTradeContext = null;
let isSimPausedForEvent = false;
let seasonStatsTracker = [];
let games = [];

function resumeSimFromEvent(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none'; // 🌟 強制關閉，解決 Tailwind flex 衝突卡死
  }
  isSimPausedForEvent = false; // 解除暫停，跑馬燈繼續狂飆
}

function rejectTradeOffer() {
  const modal = document.getElementById('tradeDeadlineModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none'; // 🌟 強制關閉
  }
  pendingTradeContext = null;
  isSimPausedForEvent = false; // 解除暫停
}

function acceptTradeOffer() {
  if (!pendingTradeContext) {
    resumeSimFromEvent('tradeDeadlineModal');
    return;
  }
  const { giveCard, targetPlayer, lineupRole, lineupSlot } = pendingTradeContext;

  // 1. 產生新卡並替換陣容
  const newCard = createCard(targetPlayer, 1);
  addCard(newCard);

  if (lineupRole === 'starter') {
    state.startingLineup[lineupSlot] = newCard;
  } else if (lineupRole === 'bench') {
    state.benchLineup[lineupSlot] = newCard;
  }

  removeCardById(giveCard.cardId);

  // 2. 更新追蹤器 (先發或替補皆同步)
  if (typeof seasonStatsTracker !== 'undefined') {
    const tracker = seasonStatsTracker.find(t => t.player.name === giveCard.name);
    if (tracker) {
      tracker.player = newCard;
      tracker.trait = getPlayerArchetype(newCard);
      tracker.ovr = Number(newCard.ovr || newCard.baseOvr || 75);
    }
  }

  // 3. 把第 55~82 場名單全面換成新球員
  if (typeof games !== 'undefined' && games.length >= 82) {
    for (let g = 54; g < 82; g++) {
      const box = games[g].boxScore || [];
      const pBox = box.find(p => p.name === giveCard.name);
      if (pBox) {
        pBox.name = newCard.name;
        pBox.pos = (newCard.positions && newCard.positions[0]) || pBox.pos || 'G';
        pBox.trait = getPlayerArchetype(newCard);
      }
    }
  }

  confetti({ particleCount: 100, spread: 70 });
  playSound('flip');

  saveGame();
  renderAll();
  resumeSimFromEvent('tradeDeadlineModal');
}

/* =====================================================
   🏅 陣容徽章掃描解析器
===================================================== */
function analyzeLineupBadges() {
  const starters = ['PG', 'SG', 'SF', 'PF', 'C']
    .map(pos => state.startingLineup[pos])
    .filter(Boolean);

  const bench = (state.benchLineup || []).filter(Boolean);

  const starterBadgesMap = starters.map(p => ({
    player: p,
    badges: typeof getPlayerBadges === 'function' ? getPlayerBadges(p) : []
  }));

  const benchBadgesMap = bench.map(p => ({
    player: p,
    badges: typeof getPlayerBadges === 'function' ? getPlayerBadges(p) : []
  }));

  const mambaPlayers = starterBadgesMap
    .filter(item => item.badges.some(b => b.name === '曼巴精神'))
    .map(item => item.player);

  const sharpshooters = starterBadgesMap
    .filter(item => item.badges.some(b => b.name === '神射手'))
    .map(item => item.player);

  const floorGenerals = starterBadgesMap
    .filter(item => item.badges.some(b => b.name === '組織大師'))
    .map(item => item.player);

  const rimProtectors = starterBadgesMap
    .filter(item => item.badges.some(b => b.name === '木桶伯' || b.name === '禁區大鎖'))
    .map(item => item.player);

  const perimeterLocks = starterBadgesMap
    .filter(item => item.badges.some(b => b.name === '外線大鎖'))
    .map(item => item.player);

  const pickpockets = starterBadgesMap
    .filter(item => item.badges.some(b => b.name === '小偷'))
    .map(item => item.player);

  const sixthMans = benchBadgesMap
    .filter(item => item.badges.some(b => b.name === '第六人'))
    .map(item => item.player);

  return {
    starters,
    bench,
    mambaPlayers,
    hasMamba: mambaPlayers.length > 0,
    sharpshooters,
    floorGenerals,
    hasFloorGeneral: floorGenerals.length > 0,
    rimProtectors,
    perimeterLocks,
    pickpockets,
    sixthMans
  };
}

/* =====================================================
   📊 擬真 NBA Box Score 全局通用渲染器 (例行賽 & 季後賽格式完全統一)
===================================================== */
function renderOpponentBoxScoreRows(players, benchPts = 0) {
  const starters = (players || []).filter(p => p.role === 'starter');
  const bench = (players || []).filter(p => p.role === 'bench');
  const row = (p, isBench = false) => `
    <tr class="${isBench ? 'bg-slate-950/40 hover:bg-indigo-950/30' : 'hover:bg-slate-800/40'}">
      <td class="py-2.5 px-3 font-sans sticky left-0 bg-slate-950/95 z-10 border-r border-slate-800/60">
        <div class="flex items-center gap-1.5">
          <span class="text-[9px] font-black px-1.5 py-0.5 rounded ${isBench ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'}">${isBench ? (p.benchSlot || 'BENCH') : p.pos}</span>
          <span class="truncate max-w-[110px] ${isBench ? 'text-slate-300 font-medium' : 'text-white font-bold'}">${p.name}</span>
        </div>
        ${p.defendedBy ? `<div class="mt-1 text-[8px] font-bold text-cyan-300">VS ${p.defendedBy} · DEF ${p.matchupDefense || '--'}</div>` : ''}
      </td>
      <td class="py-2 px-2 text-center text-slate-400 font-mono">${p.min}</td>
      <td class="py-2 px-2 text-center font-bold font-mono ${p.pts >= 20 ? 'text-rose-300 text-sm' : 'text-slate-100'}">${p.pts}</td>
      <td class="py-2 px-2 text-center text-slate-300 font-mono">${p.fgM}-${p.fgA}</td>
      <td class="py-2 px-2 text-center text-slate-400 font-mono">${p.fgPct}%</td>
      <td class="py-2 px-2 text-center text-amber-300 font-mono">${p.threeM}-${p.threeA}</td>
      <td class="py-2 px-2 text-center text-slate-400 font-mono">${p.threePct}%</td>
      <td class="py-2 px-2 text-center text-slate-300 font-mono">${p.ftM}-${p.ftA}</td>
      <td class="py-2 px-2 text-center text-slate-400 font-mono">${p.ftPct}%</td>
      <td class="py-2 px-2 text-center text-slate-400 font-mono">${p.oReb}</td>
      <td class="py-2 px-2 text-center text-slate-400 font-mono">${p.dReb}</td>
      <td class="py-2 px-2 text-center font-bold text-slate-200 font-mono">${p.reb}</td>
      <td class="py-2 px-2 text-center font-bold text-indigo-300 font-mono">${p.ast}</td>
      <td class="py-2 px-2 text-center text-slate-300 font-mono">${p.stl}</td>
      <td class="py-2 px-2 text-center text-slate-300 font-mono">${p.blk}</td>
      <td class="py-2 px-2 text-center text-rose-400 font-mono">${p.tov}</td>
      <td class="py-2 px-2 text-center text-slate-400 font-mono">${p.pf}</td>
      <td class="py-2 px-2.5 text-center font-mono font-bold ${p.plusMinus >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${p.plusMinus >= 0 ? '+' + p.plusMinus : p.plusMinus}</td>
    </tr>`;
  return `
    <tr class="bg-slate-900/90 text-rose-300 text-[10px] font-mono font-bold border-y border-rose-500/30">
      <td colspan="18" class="py-1 px-3">🎯 對手先發與我方主防對位 (Opponent Starters)</td>
    </tr>
    ${starters.map(p => row(p, false)).join('')}
    <tr class="bg-slate-900/90 text-indigo-300 text-[10px] font-mono font-bold border-y border-indigo-500/30">
      <td colspan="18" class="py-1 px-3">🪑 對手板凳陣容 (Bench) ｜ 合計攻下 ${benchPts || 0} 分</td>
    </tr>
    ${bench.map(p => row(p, true)).join('')}`;
}

function switchGameBoxScoreSide(side = 'user') {
  const userBody = document.getElementById('modalBoxScoreTbody');
  const opponentBody = document.getElementById('modalOpponentBoxScoreTbody');
  const userButton = document.getElementById('modalBoxScoreUserBtn');
  const opponentButton = document.getElementById('modalBoxScoreOpponentBtn');
  const showOpponent = side === 'opponent' && opponentBody && opponentBody.dataset.available === 'true';
  userBody?.classList.toggle('hidden', showOpponent);
  opponentBody?.classList.toggle('hidden', !showOpponent);
  userButton?.setAttribute('aria-selected', String(!showOpponent));
  opponentButton?.setAttribute('aria-selected', String(showOpponent));
  userButton?.classList.toggle('border-amber-500/50', !showOpponent);
  userButton?.classList.toggle('bg-amber-500/15', !showOpponent);
  userButton?.classList.toggle('text-amber-300', !showOpponent);
  userButton?.classList.toggle('border-slate-700', showOpponent);
  userButton?.classList.toggle('bg-slate-950', showOpponent);
  userButton?.classList.toggle('text-slate-400', showOpponent);
  opponentButton?.classList.toggle('border-rose-500/50', showOpponent);
  opponentButton?.classList.toggle('bg-rose-500/15', showOpponent);
  opponentButton?.classList.toggle('text-rose-300', showOpponent);
  opponentButton?.classList.toggle('border-slate-700', !showOpponent);
  opponentButton?.classList.toggle('bg-slate-950', !showOpponent);
  opponentButton?.classList.toggle('text-slate-400', !showOpponent);
}
window.switchGameBoxScoreSide = switchGameBoxScoreSide;

function openGameBoxScoreModal(gameData, subTitle = '收官戰') {
  if (!gameData) return;
  const bestPlayer = gameData.bestPlayer || [...(gameData.boxScore || [])].sort((a, b) => (b.pts + (b.reb || 0) * 1.2 + (b.ast || 0) * 1.5) - (a.pts + (a.reb || 0) * 1.2 + (a.ast || 0) * 1.5))[0] || { name: '主力核心', pos: 'SG', pts: 25, reb: 5, ast: 5, trait: { badge: '🔥核心' }, plusMinus: 10 };

  const myScoreEl = document.getElementById('modalMyScore');
  const oppScoreEl = document.getElementById('modalOppScore');
  const oppTeamEl = document.getElementById('modalOppTeamName');
  const highlightEl = document.getElementById('modalHighlight');
  const tbody = document.getElementById('modalBoxScoreTbody');
  const opponentTbody = document.getElementById('modalOpponentBoxScoreTbody');
  const tabs = document.getElementById('modalBoxScoreTabs');
  const opponentButton = document.getElementById('modalBoxScoreOpponentBtn');

  if (myScoreEl) myScoreEl.innerText = gameData.myScore;
  if (oppScoreEl) oppScoreEl.innerText = gameData.oppScore;
  if (oppTeamEl) oppTeamEl.innerText = `${gameData.oppTeam} (${subTitle})`;
  if (highlightEl) {
    highlightEl.innerText = gameData.highlight || `🔥 本場焦點：【${bestPlayer.name}】(${bestPlayer.trait?.badge || '⭐'}) 豪取 ${bestPlayer.pts}分 ${bestPlayer.reb || 0}籃板 ${bestPlayer.ast || 0}助攻 (正負值 ${bestPlayer.plusMinus >= 0 ? '+' + bestPlayer.plusMinus : bestPlayer.plusMinus})！`;
  }

  if (tbody) {
    const starters = (gameData.boxScore || []).filter(p => p.role === 'starter');
    const bench = (gameData.boxScore || []).filter(p => p.role === 'bench');

    const starterRows = starters.map(p => `
      <tr class="hover:bg-slate-800/40">
        <td class="py-2.5 px-3 font-sans font-bold flex items-center gap-1.5 sticky left-0 bg-slate-950/95 z-10 border-r border-slate-800/60">
          <span class="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">${p.pos}</span>
          <span class="truncate max-w-[110px] text-white">${p.name}</span>
        </td>
        <td class="py-2 px-2 text-center text-slate-400 font-mono">${p.min}</td>
        <td class="py-2 px-2 text-center font-bold font-mono ${p.pts >= 20 ? 'text-amber-400 font-black text-sm' : 'text-slate-100'}">${p.pts}</td>
        <td class="py-2 px-2 text-center text-slate-300 font-mono">${p.fgM}-${p.fgA}</td>
        <td class="py-2 px-2 text-center text-slate-400 font-mono">${p.fgPct}%</td>
        <td class="py-2 px-2 text-center text-amber-300 font-mono">${p.threeM}-${p.threeA}</td>
        <td class="py-2 px-2 text-center text-slate-400 font-mono">${p.threePct}%</td>
        <td class="py-2 px-2 text-center text-slate-300 font-mono">${p.ftM}-${p.ftA}</td>
        <td class="py-2 px-2 text-center text-slate-400 font-mono">${p.ftPct}%</td>
        <td class="py-2 px-2 text-center text-slate-400 font-mono">${p.oReb}</td>
        <td class="py-2 px-2 text-center text-slate-400 font-mono">${p.dReb}</td>
        <td class="py-2 px-2 text-center font-bold text-slate-200 font-mono">${p.reb}</td>
        <td class="py-2 px-2 text-center font-bold text-indigo-300 font-mono">${p.ast}</td>
        <td class="py-2 px-2 text-center text-slate-300 font-mono">${p.stl}</td>
        <td class="py-2 px-2 text-center text-slate-300 font-mono">${p.blk}</td>
        <td class="py-2 px-2 text-center text-rose-400 font-mono">${p.tov}</td>
        <td class="py-2 px-2 text-center text-slate-400 font-mono">${p.pf}</td>
        <td class="py-2 px-2.5 text-center font-mono font-bold ${p.plusMinus >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${p.plusMinus >= 0 ? '+' + p.plusMinus : p.plusMinus}</td>
      </tr>
    `).join('');

    const benchRows = bench.map(p => `
      <tr class="hover:bg-indigo-950/30 bg-slate-950/40">
        <td class="py-2 px-3 font-sans font-medium flex items-center gap-1.5 sticky left-0 bg-slate-950/95 z-10 border-r border-slate-800/60">
          <span class="text-[8px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">${p.benchSlot || 'BENCH'}</span>
          <span class="truncate max-w-[110px] text-slate-300">${p.name}</span>
          ${p.isSixthMan ? '<span class="text-[8px] font-black text-orange-400 bg-orange-950 px-1 rounded border border-orange-500/40">6TH</span>' : ''}
        </td>
        <td class="py-2 px-2 text-center text-slate-500 font-mono">${p.min}</td>
        <td class="py-2 px-2 text-center font-bold font-mono ${p.pts >= 12 ? 'text-orange-400 font-bold' : 'text-slate-300'}">${p.pts}</td>
        <td class="py-2 px-2 text-center text-slate-400 font-mono">${p.fgM}-${p.fgA}</td>
        <td class="py-2 px-2 text-center text-slate-500 font-mono">${p.fgPct}%</td>
        <td class="py-2 px-2 text-center text-slate-400 font-mono">${p.threeM}-${p.threeA}</td>
        <td class="py-2 px-2 text-center text-slate-500 font-mono">${p.threePct}%</td>
        <td class="py-2 px-2 text-center text-slate-400 font-mono">${p.ftM}-${p.ftA}</td>
        <td class="py-2 px-2 text-center text-slate-500 font-mono">${p.ftPct}%</td>
        <td class="py-2 px-2 text-center text-slate-500 font-mono">${p.oReb}</td>
        <td class="py-2 px-2 text-center text-slate-500 font-mono">${p.dReb}</td>
        <td class="py-2 px-2 text-center text-slate-300 font-mono">${p.reb}</td>
        <td class="py-2 px-2 text-center text-indigo-300 font-mono">${p.ast}</td>
        <td class="py-2 px-2 text-center text-slate-400 font-mono">${p.stl}</td>
        <td class="py-2 px-2 text-center text-slate-400 font-mono">${p.blk}</td>
        <td class="py-2 px-2 text-center text-rose-400/80 font-mono">${p.tov}</td>
        <td class="py-2 px-2 text-center text-slate-500 font-mono">${p.pf}</td>
        <td class="py-2 px-2.5 text-center font-mono font-bold ${p.plusMinus >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${p.plusMinus >= 0 ? '+' + p.plusMinus : p.plusMinus}</td>
      </tr>
    `).join('');

    tbody.innerHTML = `
      <tr class="bg-slate-900/90 text-amber-400 text-[10px] font-mono font-bold border-y border-amber-500/30">
        <td colspan="18" class="py-1 px-3">⭐️ 先發五人陣容 (Starters)</td>
      </tr>
      ${starterRows}
      <tr class="bg-slate-900/90 text-indigo-300 text-[10px] font-mono font-bold border-y border-indigo-500/30">
        <td colspan="18" class="py-1 px-3">🛡️ 板凳輪替陣容 (Bench) ｜ 合計攻下 ${gameData.benchPts || 0} 分</td>
      </tr>
      ${benchRows}
    `;
  }

  const hasOpponentBoxScore = Array.isArray(gameData.opponentBoxScore) && gameData.opponentBoxScore.length > 0;
  if (opponentTbody) {
    opponentTbody.dataset.available = String(hasOpponentBoxScore);
    opponentTbody.innerHTML = hasOpponentBoxScore
      ? renderOpponentBoxScoreRows(gameData.opponentBoxScore, gameData.opponentBenchPts)
      : '';
  }
  if (tabs) {
    tabs.classList.toggle('hidden', !hasOpponentBoxScore);
    tabs.style.display = hasOpponentBoxScore ? 'grid' : 'none';
  }
  if (opponentButton) opponentButton.innerText = hasOpponentBoxScore ? `OPPONENT · ${gameData.oppTeam || ''}` : 'OPPONENT';
  switchGameBoxScoreSide('user');

  // 🏅 渲染徽章高光事件
  const badgeContainer = document.getElementById('modalBadgeMomentsContainer');
  const badgeListEl = document.getElementById('modalBadgeMomentsList');

  if (badgeContainer && badgeListEl) {
    if (gameData.badgeMoments && gameData.badgeMoments.length > 0) {
      badgeContainer.classList.remove('hidden');
      badgeListEl.innerHTML = gameData.badgeMoments.map(m => `
        <div class="p-2.5 rounded-xl border text-xs flex items-start gap-2 ${m.color}">
          <span class="text-base flex-shrink-0">${m.icon}</span>
          <div>
            <span class="font-bold block">${m.badge} ｜ ${m.player}</span>
            <p class="text-[11px] text-slate-200 mt-0.5 leading-snug">${m.desc}</p>
          </div>
        </div>
      `).join('');
    } else {
      badgeContainer.classList.add('hidden');
    }
  }

  const modalBox = document.getElementById('gameBoxScoreModal');
  if (modalBox) {
    modalBox.classList.remove('hidden');
    modalBox.style.display = 'flex';
    modalBox.style.zIndex = '9999';
  }
}
window.openGameBoxScoreModal = openGameBoxScoreModal;

/* =====================================================
   🏀 完整 11 人 Box Score 戰報數據生成器 (18 欄位真實擬真)
===================================================== */
function generateGameBoxScoreData({ starters, bench, myScore, oppScore, win, oppTeam, badgeEffects, isPlayoff = false, gameNum = 1 }) {
  if (!badgeEffects) badgeEffects = analyzeLineupBadges();

  // 確保 5 位先發
  const safeStarters = [...(starters || [])];
  while (safeStarters.length < 5) {
    safeStarters.push({ name: `主力球員 ${safeStarters.length + 1}`, positions: ['G'], ovr: 78, baseOvr: 78 });
  }

  // 確保 6 位替補
  const safeBench = [...(bench || [])];
  if (state.inventory && safeBench.length < 6) {
    const starterIds = new Set(safeStarters.map(p => p.cardId).filter(Boolean));
    const benchIds = new Set(safeBench.map(p => p.cardId).filter(Boolean));
    const extraCards = state.inventory.filter(c => !starterIds.has(c.cardId) && !benchIds.has(c.cardId));
    for (const ec of extraCards) {
      if (safeBench.length >= 6) break;
      safeBench.push(ec);
    }
  }
  while (safeBench.length < 6) {
    safeBench.push({ name: `輪替替補 ${safeBench.length + 1}`, positions: ['C'], ovr: 74, baseOvr: 74 });
  }

  const starterOvrs = safeStarters.map(p => Number(p.ovr || p.baseOvr || 75));
  const avgStarterOvr = starterOvrs.reduce((a, b) => a + b, 0) / 5;

  const starterTrackers = safeStarters.map(p => {
    const trait = getPlayerArchetype(p);
    const ovr = Number(p.ovr || p.baseOvr || 75);
    const ovrDiffFromAvg = ovr - avgStarterOvr;
    let alphaMultiplier = 1.0;
    if (ovrDiffFromAvg > 0) alphaMultiplier += Math.pow(ovrDiffFromAvg, 1.2) * 0.04;
    else alphaMultiplier -= Math.abs(ovrDiffFromAvg) * 0.025;
    alphaMultiplier = Math.max(0.65, Math.min(1.40, alphaMultiplier));
    return {
      player: p, role: 'starter', trait, ovr, alphaMultiplier,
      seasonFormBonus: (Math.random() * 3) - 1.5
    };
  });

  const benchTrackers = safeBench.slice(0, 6).map((p, idx) => {
    const trait = getPlayerArchetype(p);
    const ovr = Number(p.ovr || p.baseOvr || 75);
    const isSixthMan = badgeEffects.sixthMans ? badgeEffects.sixthMans.some(sm => sm.cardId === p.cardId) : (idx === 0);
    return {
      player: p, role: 'bench', benchSlot: idx + 1, isSixthMan,
      trait, ovr, alphaMultiplier: isSixthMan ? 1.25 : 0.75,
      seasonFormBonus: (Math.random() * 2) - 1
    };
  });

  // 模擬特定徽章事件
  const forcedBadgeStats = {};
  const gameBadgeMoments = [];

  if (badgeEffects.rimProtectors && badgeEffects.rimProtectors.length > 0 && Math.random() < 0.45) {
    const blocker = badgeEffects.rimProtectors[Math.floor(Math.random() * badgeEffects.rimProtectors.length)];
    const blocks = Math.floor(Math.random() * 3 + 4);
    forcedBadgeStats[blocker.name] = { minBlk: blocks };
    gameBadgeMoments.push({
      badge: "木桶伯", icon: "☝️", player: blocker.name,
      color: "text-rose-400 bg-rose-950/70 border-rose-500/50",
      desc: `【木桶伯】禁飛區遮天蔽日！${blocker.name} 單場狂賞 ${blocks} 記大火鍋，稱霸油漆區！`
    });
  }

  if (badgeEffects.pickpockets && badgeEffects.pickpockets.length > 0 && Math.random() < 0.40) {
    const stealer = badgeEffects.pickpockets[Math.floor(Math.random() * badgeEffects.pickpockets.length)];
    const steals = Math.floor(Math.random() * 2 + 4);
    forcedBadgeStats[stealer.name] = { minStl: steals };
    gameBadgeMoments.push({
      badge: "小偷", icon: "🧤", player: stealer.name,
      color: "text-cyan-400 bg-cyan-950/70 border-cyan-500/50",
      desc: `【小偷】神經刀快手抄截！${stealer.name} 全場送出 ${steals} 次致命抄截，打出反擊狂潮！`
    });
  }

  if (badgeEffects.sharpshooters && badgeEffects.sharpshooters.length > 0 && Math.random() < 0.35) {
    const shooter = badgeEffects.sharpshooters[Math.floor(Math.random() * badgeEffects.sharpshooters.length)];
    const threes = Math.floor(Math.random() * 3 + 5);
    forcedBadgeStats[shooter.name] = { forceThreeM: threes };
    gameBadgeMoments.push({
      badge: "神射手", icon: "🏹", player: shooter.name,
      color: "text-amber-400 bg-amber-950/70 border-amber-500/50",
      desc: `【神射手】手感滾燙射穿防線！${shooter.name} 單場狂飆 ${threes} 記三分雨！`
    });
  }

  if (badgeEffects.hasMamba && badgeEffects.mambaPlayers && badgeEffects.mambaPlayers.length > 0) {
    const mambaHero = badgeEffects.mambaPlayers[Math.floor(Math.random() * badgeEffects.mambaPlayers.length)];
    if (win || Math.random() < 0.5) {
      forcedBadgeStats[mambaHero.name] = { minPts: 30 };
      gameBadgeMoments.push({
        badge: "曼巴精神", icon: "🐍", player: mambaHero.name,
        color: "text-purple-400 bg-purple-950/70 border-purple-500/50",
        desc: `【曼巴精神】強行接管決勝時刻！${mambaHero.name} 連續單打命中致勝殺招！`
      });
    }
  }

  const gameMargin = myScore - oppScore;
  const benchBoost = (badgeEffects.sixthMans && badgeEffects.sixthMans.length > 0) ? 1 : 0;
  // 季後賽主力縮減輪替，板凳得分約佔 20%~25%
  const benchShare = isPlayoff ? 0.20 : 0.24;
  const benchPtsTotal = Math.min(45, Math.max(16, Math.round(myScore * (benchShare + (benchBoost > 0 ? 0.05 : 0)) + (Math.random() * 4 - 2))));
  const startersPtsTotal = myScore - benchPtsTotal;

  // A. 先發 5 人
  const starterWeights = starterTrackers.map(t => {
    let w = t.ovr * 0.1 * t.alphaMultiplier;
    if (t.trait.type === 'shooter') w *= 1.35;
    else if (t.trait.type === 'slasher') w *= 1.25;
    else if (t.trait.type === 'playmaker') w *= 1.20;
    else if (t.trait.type === 'big_rebound') w *= 0.90;
    else w *= 0.75;
    return w * (0.85 + Math.random() * 0.3);
  });
  const totalStarterW = starterWeights.reduce((a, b) => a + b, 0) || 1;
  let starterAllocatedPts = 0;

  const startersBox = starterTrackers.map((tracker, idx) => {
    const p = tracker.player;
    const arch = tracker.trait.type;
    const effOvr = tracker.ovr + tracker.seasonFormBonus;
    const forced = forcedBadgeStats[p.name] || {};

    const real3PA = parseFloat(p.basic ? p.basic['3PA'] : 0) || 0;
    const hasSniperBadge = (getPlayerBadges(p) || []).some(b => b.name === '神射手');
    const isVolumeShooter = arch === 'shooter' || hasSniperBadge || real3PA >= 3.0;

    let pts;
    if (forced.forceThreeM) {
      pts = Math.max(forced.forceThreeM * 3 + 4, Math.round((starterWeights[idx] / totalStarterW) * startersPtsTotal));
    } else if (forced.minPts) {
      pts = Math.max(forced.minPts, Math.round((starterWeights[idx] / totalStarterW) * startersPtsTotal));
    } else if (idx === starterTrackers.length - 1) {
      pts = Math.max(2, startersPtsTotal - starterAllocatedPts);
    } else {
      pts = Math.max(3, Math.round((starterWeights[idx] / totalStarterW) * startersPtsTotal));
    }
    starterAllocatedPts += pts;
    const min = isPlayoff 
      ? Math.round(35 + (tracker.ovr - 80) * 0.25 + (Math.random() * 4 - 2))
      : Math.round(30 + (tracker.ovr - 80) * 0.35 + (Math.random() * 4 - 2));

    let threeM = 0, threeA = 0;
    if (forced.forceThreeM) {
      threeM = forced.forceThreeM;
      threeA = threeM + Math.floor(Math.random() * 4 + 3);
    } else if (isVolumeShooter) {
      threeM = Math.min(Math.floor(pts / 3), Math.round(2 + Math.random() * 3));
      threeA = Math.max(threeM, Math.round(threeM * (2.0 + Math.random() * 0.6)));
    } else if (arch === 'playmaker' || arch === '3d') {
      threeM = Math.min(Math.floor(pts / 3), Math.round(1 + Math.random() * 2));
      threeA = Math.max(threeM, Math.round(threeM * (2.2 + Math.random() * 0.5)));
    } else if (real3PA >= 1.0) {
      threeM = Math.min(Math.floor(pts / 3), Math.random() > 0.4 ? 1 : 0);
      threeA = Math.max(threeM, threeM + Math.round(Math.random() * 2));
    }

    let remainingPts = Math.max(0, pts - (threeM * 3));
    let ftM = 0, ftA = 0;
    if (remainingPts > 0 && Math.random() < 0.75) {
      ftM = Math.min(remainingPts, Math.round(1 + Math.random() * (tracker.ovr >= 88 ? 4 : 2)));
      ftA = Math.max(ftM, ftM + (Math.random() > 0.6 ? 1 : 0));
      remainingPts -= ftM;
    }

    const twoM = Math.max(0, Math.floor(remainingPts / 2));
    const fgM = twoM + threeM;
    const fgA = Math.max(fgM, Math.round(fgM / (0.44 + (effOvr - 75) * 0.005 + (Math.random() * 0.1 - 0.05))));

    const fgPct = fgA > 0 ? ((fgM / fgA) * 100).toFixed(1) : "0.0";
    const threePct = threeA > 0 ? ((threeM / threeA) * 100).toFixed(1) : "0.0";
    const ftPct = ftA > 0 ? ((ftM / ftA) * 100).toFixed(1) : "0.0";

    let oReb = 0, dReb = 0;
    if (arch === 'big_rebound') {
      oReb = Math.round(2 + Math.random() * 3);
      dReb = Math.round(6 + Math.random() * 6);
    } else if (arch === 'slasher') {
      oReb = Math.random() > 0.5 ? 1 : 0;
      dReb = Math.round(3 + Math.random() * 4);
    } else {
      oReb = Math.random() > 0.75 ? 1 : 0;
      dReb = Math.round(2 + Math.random() * 3);
    }
    const reb = oReb + dReb;

    let ast = 0;
    if (arch === 'playmaker') ast = Math.round(6 + Math.random() * 6);
    else if (tracker.alphaMultiplier >= 1.2) ast = Math.round(3 + Math.random() * 3);
    else ast = Math.round(1 + Math.random() * 2);

    let stl = forced.minStl ? forced.minStl : ((arch === '3d' || tracker.ovr >= 92) ? (Math.random() > 0.4 ? 2 : 1) : (Math.random() > 0.65 ? 1 : 0));
    let blk = forced.minBlk ? forced.minBlk : ((arch === 'big_rebound' || p.name.includes("Wembanyama") || p.name.includes("Davis")) ? Math.round(1 + Math.random() * 3) : (Math.random() > 0.8 ? 1 : 0));
    let tov = Math.round(1 + Math.random() * (arch === 'playmaker' ? 3 : 2));
    let pf = Math.round(1 + Math.random() * 3);
    const plusMinus = win ? Math.round(gameMargin * 0.8 + (Math.random() * 6 - 3)) : Math.round(gameMargin * 0.8 + (Math.random() * 6 - 3));

    return {
      name: p.name, role: 'starter', pos: p.positions[0] || 'G', trait: tracker.trait,
      min, pts, fgM, fgA, fgPct, threeM, threeA, threePct, ftM, ftA, ftPct,
      oReb, dReb, reb, ast, stl, blk, tov, pf, plusMinus
    };
  });

  // B. 替補 6 人
  let benchAllocatedPts = 0;
  const benchWeights = benchTrackers.map(t => {
    let w = t.ovr * 0.1 * t.alphaMultiplier;
    if (t.isSixthMan) w *= 1.6;
    if (t.trait.type === 'shooter' || t.trait.type === 'slasher') w *= 1.3;
    return w * (0.8 + Math.random() * 0.4);
  });
  const totalBenchW = benchWeights.reduce((a, b) => a + b, 0) || 1;

  const benchBox = benchTrackers.map((tracker, idx) => {
    const p = tracker.player;
    const arch = tracker.trait.type;
    const effOvr = tracker.ovr + tracker.seasonFormBonus;
    const forced = forcedBadgeStats[p.name] || {};

    const real3PA = parseFloat(p.basic ? p.basic['3PA'] : 0) || 0;
    const canShootThrees = real3PA >= 0.8 || arch === 'shooter' || ['PG', 'SG'].includes(p.positions[0]);

    let pts;
    if (forced.minPts) {
      pts = forced.minPts;
    } else if (forced.forceThreeM) {
      pts = Math.max(forced.forceThreeM * 3 + 2, Math.round((benchWeights[idx] / totalBenchW) * benchPtsTotal));
    } else if (idx === benchTrackers.length - 1) {
      pts = Math.max(1, benchPtsTotal - benchAllocatedPts);
    } else {
      pts = Math.max(1, Math.round((benchWeights[idx] / totalBenchW) * benchPtsTotal));
    }
    benchAllocatedPts += pts;
    const min = Math.round((isPlayoff ? 10 : 14) + (tracker.isSixthMan ? 8 : 0) + (Math.random() * 4 - 2));

    let threeM = 0, threeA = 0;
    if (canShootThrees) {
      if (forced.forceThreeM) {
        threeM = forced.forceThreeM;
        threeA = threeM + Math.floor(Math.random() * 3 + 2);
      } else if (arch === 'shooter' || tracker.isSixthMan) {
        threeM = Math.min(Math.floor(pts / 3), Math.round(1 + Math.random() * 2));
        threeA = Math.max(threeM, threeM + (threeM > 0 ? Math.round(Math.random() * 2) : 1));
      }
    }

    let remainingPts = Math.max(0, pts - (threeM * 3));
    let ftM = 0, ftA = 0;
    if (remainingPts > 0 && Math.random() < 0.65) {
      ftM = Math.min(remainingPts, Math.round(1 + Math.random() * 3));
      ftA = Math.max(ftM, ftM + (Math.random() > 0.5 ? 1 : 0));
      remainingPts -= ftM;
    }

    const twoM = Math.max(0, Math.floor(remainingPts / 2));
    const fgM = twoM + threeM;
    const fgA = Math.max(fgM, Math.round(fgM / (canShootThrees ? 0.44 : 0.62)));

    const fgPct = fgA > 0 ? ((fgM / fgA) * 100).toFixed(1) : "0.0";
    const threePct = threeA > 0 ? ((threeM / threeA) * 100).toFixed(1) : "0.0";
    const ftPct = ftA > 0 ? ((ftM / ftA) * 100).toFixed(1) : "0.0";

    let oReb = 0, dReb = 0;
    if (arch === 'big_rebound' || p.name.includes("Gobert") || p.name.includes("Edey")) {
      oReb = Math.round(2 + Math.random() * 3);
      dReb = Math.round(5 + Math.random() * 5);
    } else {
      oReb = Math.random() > 0.7 ? 1 : 0;
      dReb = Math.round(1 + Math.random() * 2);
    }
    const reb = oReb + dReb;

    let ast = (arch === 'playmaker') ? Math.round(3 + Math.random() * 4) : Math.round(Math.random() * 2);
    let stl = forced.minStl ? forced.minStl : (Math.random() > 0.7 ? 1 : 0);
    let blk = forced.minBlk ? forced.minBlk : ((arch === 'big_rebound' || p.name.includes("Gobert")) ? Math.round(1 + Math.random() * 3) : 0);
    let tov = Math.round(Math.random() * 2);
    let pf = Math.round(1 + Math.random() * 2);
    const plusMinus = win ? Math.round(gameMargin * 0.4 + (Math.random() * 4 - 2)) : Math.round(gameMargin * 0.4 + (Math.random() * 4 - 2));

    return {
      name: p.name, role: 'bench', benchSlot: `B${tracker.benchSlot}`, pos: p.positions[0] || 'C',
      trait: tracker.trait, isSixthMan: tracker.isSixthMan, min, pts, fgM, fgA, fgPct,
      threeM, threeA, threePct, ftM, ftA, ftPct, oReb, dReb, reb, ast, stl, blk, tov, pf, plusMinus
    };
  });

  const fullBox = [...startersBox, ...benchBox];
  const bestPlayer = [...fullBox].sort((a, b) => (b.pts + b.reb * 1.2 + b.ast * 1.5) - (a.pts + a.reb * 1.2 + a.ast * 1.5))[0] || startersBox[0];

  const highlightText = win
    ? `🔥 G${gameNum} 勝利：【${bestPlayer.name}】(${bestPlayer.trait?.badge || '🔥'}) 豪取 ${bestPlayer.pts}分 ${bestPlayer.reb}籃板 ${bestPlayer.ast}助攻 (正負值 ${bestPlayer.plusMinus >= 0 ? '+' + bestPlayer.plusMinus : bestPlayer.plusMinus})，率隊斬獲關鍵勝利！`
    : `💔 G${gameNum} 惜敗：末節陷入苦戰，【${bestPlayer.name}】砍下 ${bestPlayer.pts}分 ${bestPlayer.reb}板遺憾落敗。`;

  return {
    win, oppTeam, myScore, oppScore,
    boxScore: fullBox, benchPts: benchPtsTotal,
    badgeMoments: gameBadgeMoments,
    highlight: highlightText,
    bestPlayer
  };
}
window.generateGameBoxScoreData = generateGameBoxScoreData;

/* =====================================================
   🏀 82 場例行賽即時模擬主引擎 (完全防卡死 + 11 人全數據版)
===================================================== */
function start82GamesSimulation() {
  if (isSimulating) return;
  const today = getTodayString();
  if (!state.isAdmin && state.season.lastSimDate === today) {
    playSound('buzz');
    showGameAlert({
      title: '例行賽每日額度',
      message: '今天已經進行過例行賽模擬囉！明日 00:00 自動重置！',
      type: 'info'
    });
    return;
  }
  playSound('whistle');

  const starters = ['PG', 'SG', 'SF', 'PF', 'C'].map(pos => state.startingLineup[pos]).filter(Boolean);
  if (starters.length < 5) {
    showGameAlert({
      title: '先發陣容未補齊',
      message: '⚠️ 先發五人陣容尚未補齊！請先至「陣容」頁面安排完整 5 位先發球員！',
      type: 'warning'
    });
    return;
  }

  const bench = (state.benchLineup || []).filter(Boolean);

  const teamOvr = calculateTeamOverall().overall;
  isSimulating = true;
  isSimPausedForEvent = false; // 開賽強制重置暫停狀態
  state.season.hasPlayedPlayoffs = false;
  state.season.threePtContestPlayed = false;
  state.season.threePtContestShooter = null;
  state.season.threePtContestScore = null;
  games = [];
  let simulatedWins = 0, maxS = 0, curS = 0;

  // 1. 開賽前先解析徽章
  const badgeEffects = analyzeLineupBadges();

  // 2. 初始化先發 5 人數據追蹤
  const starterOvrs = starters.map(p => Number(p.ovr || p.baseOvr || 75));
  const avgStarterOvr = starterOvrs.reduce((a, b) => a + b, 0) / 5;

  const starterTrackers = starters.map(p => {
    const trait = getPlayerArchetype(p);
    const ovr = Number(p.ovr || p.baseOvr || 75);
    const ovrDiffFromAvg = ovr - avgStarterOvr;
    let alphaMultiplier = 1.0;
    if (ovrDiffFromAvg > 0) {
      alphaMultiplier += Math.pow(ovrDiffFromAvg, 1.2) * 0.04;
    } else {
      alphaMultiplier -= Math.abs(ovrDiffFromAvg) * 0.025;
    }
    alphaMultiplier = Math.max(0.65, Math.min(1.40, alphaMultiplier));

    return {
      player: p, role: 'starter', trait: trait, ovr: ovr, alphaMultiplier: alphaMultiplier,
      seasonFormBonus: (Math.random() * 3) - 1.5,
      totalPts: 0, totalReb: 0, totalAst: 0, totalStl: 0, totalBlk: 0
    };
  });

  // 3. 初始化替補 6 人數據追蹤
  const benchTrackers = bench.map((p, idx) => {
    const trait = getPlayerArchetype(p);
    const ovr = Number(p.ovr || p.baseOvr || 75);
    const isSixthMan = badgeEffects.sixthMans.some(sm => sm.cardId === p.cardId);

    return {
      player: p, role: 'bench', benchSlot: idx + 1, isSixthMan: isSixthMan,
      trait: trait, ovr: ovr, alphaMultiplier: isSixthMan ? 1.25 : 0.75,
      seasonFormBonus: (Math.random() * 2) - 1,
      totalPts: 0, totalReb: 0, totalAst: 0, totalStl: 0, totalBlk: 0
    };
  });

  seasonStatsTracker = [...starterTrackers, ...benchTrackers];

  // 4. 模擬 82 場比賽
  for (let i = 0; i < 82; i++) {
    const oppTeam = ALL_30_TEAMS[Math.floor(Math.random() * ALL_30_TEAMS.length)];
    const oppOvr = Math.floor(77 + Math.random() * 16);

    const effectiveTeamOvr = teamOvr + (badgeEffects.hasFloorGeneral ? 1 : 0);
    const ovrDiff = effectiveTeamOvr - oppOvr;

    const winProb = Math.max(0.18, Math.min(0.84, 0.50 + (ovrDiff * 0.028) + (Math.random() * 0.1 - 0.05)));
    let win = Math.random() < winProb;

    const basePaceScore = 110 + Math.round(Math.random() * 12 - 6);
    let myGameScore, oppScore;

    if (win) {
      const margin = Math.floor(Math.random() * 14) + 2;
      myGameScore = basePaceScore + Math.round(ovrDiff * 0.25) + Math.floor(margin / 2);
      oppScore = myGameScore - margin;
    } else {
      const margin = Math.floor(Math.random() * 14) + 2;
      oppScore = basePaceScore - Math.round(ovrDiff * 0.25) + Math.floor(margin / 2);
      myGameScore = oppScore - margin;
    }

    // 🎖️ 徽章高光事件與當場球員數據強連動
    const gameBadgeMoments = [];
    const forcedBadgeStats = {};

    // ① 第六人
    let benchBoost = 0;
    if (badgeEffects.sixthMans.length > 0) {
      benchBoost = Math.min(16, badgeEffects.sixthMans.length * 6);
      myGameScore += benchBoost;
      if (Math.random() < 0.28) {
        const hero = badgeEffects.sixthMans[Math.floor(Math.random() * badgeEffects.sixthMans.length)];
        const heroPts = Math.floor(Math.random() * 5 + 16);
        forcedBadgeStats[hero.name] = { minPts: heroPts };
        gameBadgeMoments.push({
          badge: "第六人", icon: "⚡", player: hero.name,
          color: "text-orange-400 bg-orange-950/70 border-orange-500/50",
          desc: `【第六人】板凳暴徒登場！${hero.name} 替補上陣狂轟 ${heroPts} 分，引領替補席攻勢！`
        });
      }
    }

    // ② 木桶伯
    if (badgeEffects.rimProtectors.length > 0) {
      oppScore = Math.max(82, oppScore - Math.floor(Math.random() * 5 + 5));
      if (Math.random() < 0.24) {
        const blocker = badgeEffects.rimProtectors[Math.floor(Math.random() * badgeEffects.rimProtectors.length)];
        const blocks = Math.floor(Math.random() * 3 + 4);
        forcedBadgeStats[blocker.name] = { minBlk: blocks };
        gameBadgeMoments.push({
          badge: "木桶伯", icon: "☝️", player: blocker.name,
          color: "text-rose-400 bg-rose-950/70 border-rose-500/50",
          desc: `【木桶伯】禁飛區遮天蔽日！${blocker.name} 單場狂賞 ${blocks} 記大火鍋，稱霸油漆區！`
        });
      }
    }

    // ③ 小偷
    if (badgeEffects.pickpockets.length > 0 && Math.random() < 0.38) {
      myGameScore += 4;
      const stealer = badgeEffects.pickpockets[Math.floor(Math.random() * badgeEffects.pickpockets.length)];
      const steals = Math.floor(Math.random() * 2 + 4);
      forcedBadgeStats[stealer.name] = { minStl: steals };
      gameBadgeMoments.push({
        badge: "小偷", icon: "🧤", player: stealer.name,
        color: "text-cyan-400 bg-cyan-950/70 border-cyan-500/50",
        desc: `【小偷】神經刀快手抄截！${stealer.name} 全場送出 ${steals} 次致命抄截，打出反擊狂潮！`
      });
    }

    // ④ 神射手
    if (badgeEffects.sharpshooters.length > 0 && Math.random() < 0.30) {
      const shooter = badgeEffects.sharpshooters[Math.floor(Math.random() * badgeEffects.sharpshooters.length)];
      const threes = Math.floor(Math.random() * 4 + 6);
      myGameScore += 6;
      forcedBadgeStats[shooter.name] = { forceThreeM: threes };
      gameBadgeMoments.push({
        badge: "神射手", icon: "🏹", player: shooter.name,
        color: "text-amber-400 bg-amber-950/70 border-amber-500/50",
        desc: `【神射手】手感滾燙射穿防線！${shooter.name} 單場狂飆 ${threes} 記三分雨！`
      });
    }

    // ⑤ 曼巴精神
    const isClutch = Math.abs(myGameScore - oppScore) <= 6;
    if (isClutch && badgeEffects.hasMamba) {
      const mambaHero = badgeEffects.mambaPlayers[Math.floor(Math.random() * badgeEffects.mambaPlayers.length)];
      if (Math.random() < 0.78) {
        win = true;
        myGameScore = oppScore + Math.floor(Math.random() * 4 + 2);
        forcedBadgeStats[mambaHero.name] = { minPts: 28 };
        gameBadgeMoments.push({
          badge: "曼巴精神", icon: "🐍", player: mambaHero.name,
          color: "text-purple-400 bg-purple-950/70 border-purple-500/50",
          desc: `【曼巴精神】末節最後 1 分鐘接管戰局！${mambaHero.name} 連續單打命中致勝兩分！`
        });
      }
    }

    if (win && myGameScore <= oppScore) myGameScore = oppScore + Math.floor(Math.random() * 4 + 1);
    else if (!win && myGameScore >= oppScore) oppScore = myGameScore + Math.floor(Math.random() * 4 + 1);

    if (win) { simulatedWins++; curS++; if (curS > maxS) maxS = curS; } else curS = 0;

    const gameMargin = myGameScore - oppScore;
    const benchPtsTotal = Math.min(48, Math.max(22, Math.round(myGameScore * (0.24 + (benchBoost > 0 ? 0.08 : 0)) + (Math.random() * 4 - 2))));
    const startersPtsTotal = myGameScore - benchPtsTotal;

    // A. 先發 5 人
    const starterWeights = starterTrackers.map(t => {
      let w = t.ovr * 0.1 * t.alphaMultiplier;
      if (t.trait.type === 'shooter') w *= 1.35;
      else if (t.trait.type === 'slasher') w *= 1.25;
      else if (t.trait.type === 'playmaker') w *= 1.20;
      else if (t.trait.type === 'big_rebound') w *= 0.90;
      else w *= 0.75;
      return w * (0.85 + Math.random() * 0.3);
    });
    const totalStarterW = starterWeights.reduce((a, b) => a + b, 0);
    let starterAllocatedPts = 0;

    const startersBox = starterTrackers.map((tracker, idx) => {
      const p = tracker.player;
      const arch = tracker.trait.type;
      const effOvr = tracker.ovr + tracker.seasonFormBonus;
      const forced = forcedBadgeStats[p.name] || {};

      const real3PA = parseFloat(p.basic ? p.basic['3PA'] : 0) || 0;
      const hasSniperBadge = (getPlayerBadges(p) || []).some(b => b.name === '神射手');
      const isVolumeShooter = arch === 'shooter' || hasSniperBadge || real3PA >= 3.0;

      let pts;
      if (forced.forceThreeM) {
        pts = Math.max(forced.forceThreeM * 3 + 4, Math.round((starterWeights[idx] / totalStarterW) * startersPtsTotal));
      } else if (forced.minPts) {
        pts = Math.max(forced.minPts, Math.round((starterWeights[idx] / totalStarterW) * startersPtsTotal));
      } else if (idx === starterTrackers.length - 1) {
        pts = Math.max(2, startersPtsTotal - starterAllocatedPts);
      } else {
        pts = Math.max(3, Math.round((starterWeights[idx] / totalStarterW) * startersPtsTotal));
      }
      starterAllocatedPts += pts;
      const min = Math.round(30 + (tracker.ovr - 80) * 0.35 + (Math.random() * 4 - 2));

      let threeM = 0, threeA = 0;
      if (forced.forceThreeM) {
        threeM = forced.forceThreeM;
        threeA = threeM + Math.floor(Math.random() * 4 + 3);
      } else if (isVolumeShooter) {
        threeM = Math.min(Math.floor(pts / 3), Math.round(2 + Math.random() * 3));
        threeA = Math.max(threeM, Math.round(threeM * (2.0 + Math.random() * 0.6)));
      } else if (arch === 'playmaker' || arch === '3d') {
        threeM = Math.min(Math.floor(pts / 3), Math.round(1 + Math.random() * 2));
        threeA = Math.max(threeM, Math.round(threeM * (2.2 + Math.random() * 0.5)));
      } else if (real3PA >= 1.0) {
        threeM = Math.min(Math.floor(pts / 3), Math.random() > 0.4 ? 1 : 0);
        threeA = Math.max(threeM, threeM + Math.round(Math.random() * 2));
      }

      let remainingPts = Math.max(0, pts - (threeM * 3));
      let ftM = 0, ftA = 0;
      if (remainingPts > 0 && Math.random() < 0.75) {
        ftM = Math.min(remainingPts, Math.round(1 + Math.random() * (tracker.ovr >= 88 ? 4 : 2)));
        ftA = Math.max(ftM, ftM + (Math.random() > 0.6 ? 1 : 0));
        remainingPts -= ftM;
      }

      const twoM = Math.max(0, Math.floor(remainingPts / 2));
      const fgM = twoM + threeM;
      const fgA = Math.max(fgM, Math.round(fgM / (0.44 + (effOvr - 75) * 0.005 + (Math.random() * 0.1 - 0.05))));

      const fgPct = fgA > 0 ? ((fgM / fgA) * 100).toFixed(1) : "0.0";
      const threePct = threeA > 0 ? ((threeM / threeA) * 100).toFixed(1) : "0.0";
      const ftPct = ftA > 0 ? ((ftM / ftA) * 100).toFixed(1) : "0.0";

      let oReb = 0, dReb = 0;
      if (arch === 'big_rebound') {
        oReb = Math.round(2 + Math.random() * 3);
        dReb = Math.round(6 + Math.random() * 6);
      } else if (arch === 'slasher') {
        oReb = Math.random() > 0.5 ? 1 : 0;
        dReb = Math.round(3 + Math.random() * 4);
      } else {
        oReb = Math.random() > 0.75 ? 1 : 0;
        dReb = Math.round(2 + Math.random() * 3);
      }
      const reb = oReb + dReb;

      let ast = 0;
      if (arch === 'playmaker') ast = Math.round(6 + Math.random() * 6);
      else if (tracker.alphaMultiplier >= 1.2) ast = Math.round(3 + Math.random() * 3);
      else ast = Math.round(1 + Math.random() * 2);

      let stl = forced.minStl ? forced.minStl : ((arch === '3d' || tracker.ovr >= 92) ? (Math.random() > 0.4 ? 2 : 1) : (Math.random() > 0.65 ? 1 : 0));
      let blk = forced.minBlk ? forced.minBlk : ((arch === 'big_rebound' || p.name.includes("Wembanyama") || p.name.includes("Davis")) ? Math.round(1 + Math.random() * 3) : (Math.random() > 0.8 ? 1 : 0));
      let tov = Math.round(1 + Math.random() * (arch === 'playmaker' ? 3 : 2));
      let pf = Math.round(1 + Math.random() * 3);
      const plusMinus = win ? Math.round(gameMargin * 0.8 + (Math.random() * 6 - 3)) : Math.round(gameMargin * 0.8 + (Math.random() * 6 - 3));

      tracker.totalPts += pts;
      tracker.totalReb += reb;
      tracker.totalAst += ast;
      tracker.totalStl += stl;
      tracker.totalBlk += blk;

      return {
        name: p.name, role: 'starter', pos: p.positions[0] || 'G', trait: tracker.trait,
        min, pts, fgM, fgA, fgPct, threeM, threeA, threePct, ftM, ftA, ftPct,
        oReb, dReb, reb, ast, stl, blk, tov, pf, plusMinus
      };
    });

    // B. 替補 6 人
    let benchAllocatedPts = 0;
    const benchWeights = benchTrackers.map(t => {
      let w = t.ovr * 0.1 * t.alphaMultiplier;
      if (t.isSixthMan) w *= 1.6;
      if (t.trait.type === 'shooter' || t.trait.type === 'slasher') w *= 1.3;
      return w * (0.8 + Math.random() * 0.4);
    });
    const totalBenchW = benchWeights.reduce((a, b) => a + b, 0) || 1;

    const benchBox = benchTrackers.map((tracker, idx) => {
      const p = tracker.player;
      const arch = tracker.trait.type;
      const effOvr = tracker.ovr + tracker.seasonFormBonus;
      const forced = forcedBadgeStats[p.name] || {};

      const real3PA = parseFloat(p.basic ? p.basic['3PA'] : 0) || 0;
      const canShootThrees = real3PA >= 0.8 || arch === 'shooter' || ['PG', 'SG'].includes(p.positions[0]);

      let pts;
      if (forced.minPts) {
        pts = forced.minPts;
      } else if (forced.forceThreeM) {
        pts = Math.max(forced.forceThreeM * 3 + 2, Math.round((benchWeights[idx] / totalBenchW) * benchPtsTotal));
      } else if (idx === benchTrackers.length - 1) {
        pts = Math.max(1, benchPtsTotal - benchAllocatedPts);
      } else {
        pts = Math.max(1, Math.round((benchWeights[idx] / totalBenchW) * benchPtsTotal));
      }
      benchAllocatedPts += pts;
      const min = Math.round(14 + (tracker.isSixthMan ? 10 : 0) + (Math.random() * 4 - 2));

      let threeM = 0, threeA = 0;
      if (canShootThrees) {
        if (forced.forceThreeM) {
          threeM = forced.forceThreeM;
          threeA = threeM + Math.floor(Math.random() * 3 + 2);
        } else if (arch === 'shooter' || tracker.isSixthMan) {
          threeM = Math.min(Math.floor(pts / 3), Math.round(1 + Math.random() * 2));
          threeA = Math.max(threeM, threeM + (threeM > 0 ? Math.round(Math.random() * 2) : 1));
        }
      }

      let remainingPts = Math.max(0, pts - (threeM * 3));
      let ftM = 0, ftA = 0;
      if (remainingPts > 0 && Math.random() < 0.65) {
        ftM = Math.min(remainingPts, Math.round(1 + Math.random() * 3));
        ftA = Math.max(ftM, ftM + (Math.random() > 0.5 ? 1 : 0));
        remainingPts -= ftM;
      }

      const twoM = Math.max(0, Math.floor(remainingPts / 2));
      const fgM = twoM + threeM;
      const fgA = Math.max(fgM, Math.round(fgM / (canShootThrees ? 0.44 : 0.62)));

      const fgPct = fgA > 0 ? ((fgM / fgA) * 100).toFixed(1) : "0.0";
      const threePct = threeA > 0 ? ((threeM / threeA) * 100).toFixed(1) : "0.0";
      const ftPct = ftA > 0 ? ((ftM / ftA) * 100).toFixed(1) : "0.0";

      let oReb = 0, dReb = 0;
      if (arch === 'big_rebound' || p.name.includes("Gobert") || p.name.includes("Edey")) {
        oReb = Math.round(2 + Math.random() * 3);
        dReb = Math.round(5 + Math.random() * 5);
      } else {
        oReb = Math.random() > 0.7 ? 1 : 0;
        dReb = Math.round(1 + Math.random() * 2);
      }
      const reb = oReb + dReb;

      let ast = (arch === 'playmaker') ? Math.round(3 + Math.random() * 4) : Math.round(Math.random() * 2);
      let stl = forced.minStl ? forced.minStl : (Math.random() > 0.7 ? 1 : 0);
      let blk = forced.minBlk ? forced.minBlk : ((arch === 'big_rebound' || p.name.includes("Gobert")) ? Math.round(1 + Math.random() * 3) : 0);
      let tov = Math.round(Math.random() * 2);
      let pf = Math.round(1 + Math.random() * 2);
      const plusMinus = win ? Math.round(gameMargin * 0.4 + (Math.random() * 4 - 2)) : Math.round(gameMargin * 0.4 + (Math.random() * 4 - 2));

      tracker.totalPts += pts;
      tracker.totalReb += reb;
      tracker.totalAst += ast;
      tracker.totalStl += stl;
      tracker.totalBlk += blk;

      return {
        name: p.name, role: 'bench', benchSlot: `B${tracker.benchSlot}`, pos: p.positions[0] || 'C',
        trait: tracker.trait, isSixthMan: tracker.isSixthMan, min, pts, fgM, fgA, fgPct,
        threeM, threeA, threePct, ftM, ftA, ftPct, oReb, dReb, reb, ast, stl, blk, tov, pf, plusMinus
      };
    });

    const full11BoxScore = [...startersBox, ...benchBox];

    games.push({
      win, oppTeam, myScore: myGameScore, oppScore,
      boxScore: full11BoxScore, benchPts: benchPtsTotal,
      badgeMoments: gameBadgeMoments
    });
  }

  // 5. 賽季 82 場跑馬燈播放 (帶有安全防卡死機制)
  let idx = 0;
  const interval = setInterval(() => {
    if (idx >= 82) {
      clearInterval(interval);
      isSimulating = false;
      state.season.lastSimDate = today;
      state.season.lastSimRecord = `${simulatedWins} 勝 ${82 - simulatedWins} 敗`;
      state.season.lastSimWins = simulatedWins;
      state.season.lastSimStreak = maxS;
      state.season.lastSimGames = games;

      // 結算領袖數據
      const sortedScorers = [...seasonStatsTracker].sort((a, b) => b.totalPts - a.totalPts);
      const sortedRebounders = [...seasonStatsTracker].sort((a, b) => b.totalReb - a.totalReb);
      const sortedPlaymakers = [...seasonStatsTracker].sort((a, b) => b.totalAst - a.totalAst);
      const sortedStealers = [...seasonStatsTracker].sort((a, b) => b.totalStl - a.totalStl);
      const sortedBlockers = [...seasonStatsTracker].sort((a, b) => b.totalBlk - a.totalBlk);

// 🏆 評選 MVP (綜合戰力最高核心)
      const mvpCand = [...seasonStatsTracker].sort((a, b) => {
        const valA = (a.totalPts * 1.0) + (a.totalReb * 1.1) + (a.totalAst * 1.4) + ((a.totalStl + a.totalBlk) * 2.0);
        const valB = (b.totalPts * 1.0) + (b.totalReb * 1.1) + (b.totalAst * 1.4) + ((b.totalStl + b.totalBlk) * 2.0);
        return valB - valA;
      })[0];

      // 🛡️ 評選 DPOY (阻攻 + 抄截 + 籃板防守大鎖)
      const dpoyCand = [...seasonStatsTracker].sort((a, b) => {
        const defA = (a.totalBlk * 2.2) + (a.totalStl * 2.0) + (a.totalReb * 0.6);
        const defB = (b.totalBlk * 2.2) + (b.totalStl * 2.0) + (b.totalReb * 0.6);
        return defB - defA;
      })[0];

      // ⚡ 評選 6MOY (板凳席最強暴徒)
      const benchPool = seasonStatsTracker.filter(t => t.role === 'bench');
      const sixManCand = benchPool.length > 0 
        ? [...benchPool].sort((a, b) => b.totalPts - a.totalPts)[0] 
        : sortedScorers[0];

      // 🔥 評選 MIP (低評分卻打出巨星產量的黑馬)
      const mipCand = [...seasonStatsTracker].sort((a, b) => {
        const effA = (a.totalPts + a.totalReb + a.totalAst) / (a.ovr || 75);
        const effB = (b.totalPts + b.totalReb + b.totalAst) / (b.ovr || 75);
        return effB - effA;
      })[0];

      // 👑 評選最佳關鍵先生 (全季累積正負值最高贏球功臣)
      const pmTotals = {};
      games.forEach(g => {
        (g.boxScore || []).forEach(p => {
          pmTotals[p.name] = (pmTotals[p.name] || 0) + (p.plusMinus || 0);
        });
      });
      const clutchCand = [...seasonStatsTracker].sort((a, b) => (pmTotals[b.player.name] || 0) - (pmTotals[a.player.name] || 0))[0];
      const clutchPM = pmTotals[clutchCand.player.name] || 0;

      // 🎖️ 8 大年度獎項 (前 4 名第 1 排，後 4 名第 2 排)
      state.season.lastBoxScores = [
        /* === 第 1 排：四大殊榮 === */
        { 
          title: "🏆 年度 MVP", 
          player: mvpCand.player.name, 
          stat: `${(mvpCand.totalPts / 82).toFixed(1)}分 ${(mvpCand.totalReb / 82).toFixed(1)}板 ${(mvpCand.totalAst / 82).toFixed(1)}助` 
        },
        { 
          title: "🛡️ 最佳防守 DPOY", 
          player: dpoyCand.player.name, 
          stat: `${(dpoyCand.totalBlk / 82).toFixed(1)}鍋 ${(dpoyCand.totalStl / 82).toFixed(1)}抄<br><span class="text-[11px] text-slate-400 font-normal">(${(dpoyCand.totalReb / 82).toFixed(1)} 籃板)</span>` 
        },
        { 
          title: "⚡ 最佳第六人 6MOY", 
          player: sixManCand.player.name, 
          stat: `場均 ${(sixManCand.totalPts / 82).toFixed(1)}分<br><span class="text-[11px] text-slate-400 font-normal">(板凳火力核心)</span>` 
        },
        { 
          title: "🔥 最佳進步獎 MIP", 
          player: mipCand.player.name, 
          stat: `場均 ${(mipCand.totalPts / 82).toFixed(1)}分 ${(mipCand.totalReb / 82).toFixed(1)}板<br><span class="text-[11px] text-slate-400 font-normal">(評分 ${mipCand.ovr} 逆襲爆發)</span>` 
        },

        /* === 第 2 排：三大數據王 + 關鍵先生 === */
        { 
          title: "🏹 聯盟得分王", 
          player: sortedScorers[0].player.name, 
          stat: `場均 ${(sortedScorers[0].totalPts / 82).toFixed(1)}分<br><span class="text-[11px] text-slate-400 font-normal">(總分 ${sortedScorers[0].totalPts})</span>` 
        },
        { 
          title: "🎯 聯盟助攻王", 
          player: sortedPlaymakers[0].player.name, 
          stat: `場均 ${(sortedPlaymakers[0].totalAst / 82).toFixed(1)}助<br><span class="text-[11px] text-slate-400 font-normal">(總助攻 ${sortedPlaymakers[0].totalAst})</span>` 
        },
        { 
          title: "🌊 聯盟籃板王", 
          player: sortedRebounders[0].player.name, 
          stat: `場均 ${(sortedRebounders[0].totalReb / 82).toFixed(1)}板<br><span class="text-[11px] text-slate-400 font-normal">(總籃板 ${sortedRebounders[0].totalReb})</span>` 
        },
        { 
          title: "👑 最佳關鍵先生", 
          player: clutchCand.player.name, 
          stat: `正負值 ${clutchPM >= 0 ? '+' + clutchPM : clutchPM}<br><span class="text-[11px] text-slate-400 font-normal">(Jerry West 獎)</span>` 
        }
      ];
      // 收官戰 Box Score 彈窗
      const lastGame = games[81];
      openGameBoxScoreModal(lastGame, '例行賽收官戰');

      // 🌟 生涯紀錄累積
      seasonStatsTracker.forEach(tracker => {
        const card = (state.inventory || []).find(c => c && c.cardId === tracker.player.cardId);
        if (!card) return;
        if (!card.legacy) card.legacy = { games: 0, pts: 0, reb: 0, ast: 0, rings: 0, mvps: 0, traits: [] };

        card.legacy.games = (card.legacy.games || 0) + 82;
        card.legacy.pts = (card.legacy.pts || 0) + tracker.totalPts;
        card.legacy.reb = (card.legacy.reb || 0) + tracker.totalReb;
        card.legacy.ast = (card.legacy.ast || 0) + tracker.totalAst;
        card.legacy.seasons = (card.legacy.seasons || 0) + 1;


      });

      saveGame();
      renderAll();
      return;
    }

    if (isSimPausedForEvent) return;

    // 第 41 場全明星 (精確統計)
    if (idx === 40) {
      isSimPausedForEvent = true;
      const first41Games = games.slice(0, 41);
      const pointsMapIn41 = {};
      first41Games.forEach(g => {
        (g.boxScore || []).forEach(p => {
          pointsMapIn41[p.name] = (pointsMapIn41[p.name] || 0) + (p.pts || 0);
        });
      });

      let topScorerName = '';
      let maxPtsIn41 = -1;
      for (const name in pointsMapIn41) {
        if (pointsMapIn41[name] > maxPtsIn41) {
          maxPtsIn41 = pointsMapIn41[name];
          topScorerName = name;
        }
      }

      const allStarTracker = seasonStatsTracker.find(t => t.player.name === topScorerName) || seasonStatsTracker[0];
      const realPpg = (maxPtsIn41 / 41).toFixed(1);

      document.getElementById('asgPlayerImg').src = getPlayerImgUrl(allStarTracker.player.nbaId);
      document.getElementById('asgPlayerName').innerText = allStarTracker.player.name;
      document.getElementById('asgPlayerStats').innerText = `半程場均 ${realPpg}分 (${allStarTracker.trait.label})`;

      state.tickets += 2;
      state.scoutPoints = (Number(state.scoutPoints) || 0) + 30;
      playSound('ur_ssr');
      confetti({ particleCount: 100, spread: 70 });
      
      const asgBtn = document.getElementById('btnOpenThreePtFromAllStar');
      if (asgBtn) {
        if (state.season?.threePtContestPlayed) {
          asgBtn.innerText = `🎯 三分大賽 (已出戰: ${state.season.threePtContestScore ?? 0}分)`;
          asgBtn.className = "px-3 py-1.5 bg-slate-800 text-amber-400/80 border border-slate-700 font-bold rounded-lg text-xs shadow-md cursor-pointer";
        } else {
          asgBtn.innerText = "🎯 全明星三分球大賽";
          asgBtn.className = "px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs shadow-md cursor-pointer transition-all";
        }
      }

      const asgModal = document.getElementById('allStarEventModal');
      if (asgModal) {
        asgModal.classList.remove('hidden');
        asgModal.style.display = 'flex';
      }
      idx++;
      return;
    }

    // 第 55 場交易截止日
    if (idx === 54) {
      const activeRoster = [];
      ['PG', 'SG', 'SF', 'PF', 'C'].forEach(pos => {
        const card = state.startingLineup[pos];
        if (card && !card.isLegend) activeRoster.push({ card, role: 'starter', slot: pos, posDesc: `先發 ${pos}` });
      });

      (state.benchLineup || []).forEach((card, bIdx) => {
        if (card && !card.isLegend) activeRoster.push({ card, role: 'bench', slot: bIdx, posDesc: `第 ${bIdx + 1} 替補` });
      });

      if (activeRoster.length > 0) {
        isSimPausedForEvent = true;
        const targetOffer = activeRoster[Math.floor(Math.random() * activeRoster.length)];
        const giveCard = targetOffer.card;
        const targetPool = NBA_PLAYERS.filter(p => p.name !== giveCard.name && Math.abs(p.ovr - giveCard.ovr) <= 3);
        const targetPlayer = targetPool[Math.floor(Math.random() * targetPool.length)] || NBA_PLAYERS[0];

        pendingTradeContext = { giveCard, targetPlayer, lineupRole: targetOffer.role, lineupSlot: targetOffer.slot };

        document.getElementById('tradeOfferTeamBadge').innerText = `來自 ${targetPlayer.team} 的互換提案`;
        document.getElementById('tradeGiveImg').src = getPlayerImgUrl(giveCard.nbaId);
        document.getElementById('tradeGiveName').innerText = `${giveCard.name} (${targetOffer.posDesc})`;
        document.getElementById('tradeGiveOvr').innerText = `OVR ${giveCard.ovr} (${giveCard.team})`;

        document.getElementById('tradeGetImg').src = getPlayerImgUrl(targetPlayer.nbaId || targetPlayer.id);
        document.getElementById('tradeGetName').innerText = targetPlayer.name;
        document.getElementById('tradeGetOvr').innerText = `OVR ${targetPlayer.ovr} (${targetPlayer.team})`;

        const tdModal = document.getElementById('tradeDeadlineModal');
        if (tdModal) {
          tdModal.classList.remove('hidden');
          tdModal.style.display = 'flex';
        }
        idx++;
        return;
      }
    }

    const cell = document.getElementById(`game-cell-${idx + 1}`);
    if (cell) {
      cell.className = games[idx].win ? "h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center text-xs" : "h-6 rounded-md bg-rose-900 text-rose-300 flex items-center justify-center text-xs";
      cell.innerText = games[idx].win ? "✓" : "✕";
    }
    document.getElementById('seasonRecordText').innerText = `${games.slice(0, idx + 1).filter(g => g.win).length} 勝`;
    idx++;
  }, 18);
}

function getUserFranchiseName() {
  return state?.seasonJourney?.teamName || "玩家夢幻隊";
}

// 👇 依據例行賽實際勝場決定種子順位與動態對手
function initPlayoffTeams() {
      const wins = Number(state.season.lastSimWins) || 42;

      // 1. 根據例行賽 82 場勝場，決定玩家在西區 16 支球隊中的排名 (1 ~ 8 種子)
      let playerSeed = 8;
      if (wins >= 62) playerSeed = 1;
      else if (wins >= 57) playerSeed = 2;
      else if (wins >= 52) playerSeed = 3;
      else if (wins >= 48) playerSeed = 4;
      else if (wins >= 45) playerSeed = 5;
      else if (wins >= 43) playerSeed = 6;
      else if (wins >= 40) playerSeed = 7;
      else playerSeed = 8;

      // 2. 西區：其餘 15 隊隨機打亂，依序填補玩家以外的 7 個季後賽席次
      const shuffledWest = [...WEST_15_TEAMS].sort(() => Math.random() - 0.5);
      const westSeeds = {};
      westSeeds[playerSeed] = getUserFranchiseName();

      let wIdx = 0;
      for (let s = 1; s <= 8; s++) {
        if (s !== playerSeed) {
          westSeeds[s] = shuffledWest[wIdx++];
        }
      }

      // 3. 東區：15 隊隨機打亂，前 8 隊依序成為東區第 1 ~ 8 種子
      const shuffledEast = [...EAST_15_TEAMS].sort(() => Math.random() - 0.5);
      const eastSeeds = {};
      for (let s = 1; s <= 8; s++) {
        eastSeeds[s] = shuffledEast[s - 1];
      }

      // 4. 依照 NBA 標準季後賽對戰樹組裝首輪（1v8, 4v5, 3v6, 2v7）
      const westFirstRound = [
        { teamA: westSeeds[1], seedA: 1, teamB: westSeeds[8], seedB: 8, winsA: 0, winsB: 0, winner: null },
        { teamA: westSeeds[4], seedA: 4, teamB: westSeeds[5], seedB: 5, winsA: 0, winsB: 0, winner: null },
        { teamA: westSeeds[3], seedA: 3, teamB: westSeeds[6], seedB: 6, winsA: 0, winsB: 0, winner: null },
        { teamA: westSeeds[2], seedA: 2, teamB: westSeeds[7], seedB: 7, winsA: 0, winsB: 0, winner: null }
      ];

      const eastFirstRound = [
        { teamA: eastSeeds[1], seedA: 1, teamB: eastSeeds[8], seedB: 8, winsA: 0, winsB: 0, winner: null },
        { teamA: eastSeeds[4], seedA: 4, teamB: eastSeeds[5], seedB: 5, winsA: 0, winsB: 0, winner: null },
        { teamA: eastSeeds[3], seedA: 3, teamB: eastSeeds[6], seedB: 6, winsA: 0, winsB: 0, winner: null },
        { teamA: eastSeeds[2], seedA: 2, teamB: eastSeeds[7], seedB: 7, winsA: 0, winsB: 0, winner: null }
      ];

      playoffTeamsState = [
        // Round 0: 首輪 (8 組對決：西區 4 組 + 東區 4 組)
        { round: 0, matches: [...westFirstRound, ...eastFirstRound] },
        // Round 1: 分區準決賽 (4 組)
        { round: 1, matches: [
          { teamA: "TBD", seedA: "-", teamB: "TBD", seedB: "-", winsA: 0, winsB: 0, winner: null },
          { teamA: "TBD", seedA: "-", teamB: "TBD", seedB: "-", winsA: 0, winsB: 0, winner: null },
          { teamA: "TBD", seedA: "-", teamB: "TBD", seedB: "-", winsA: 0, winsB: 0, winner: null },
          { teamA: "TBD", seedA: "-", teamB: "TBD", seedB: "-", winsA: 0, winsB: 0, winner: null }
        ]},
        // Round 2: 分區冠軍賽 (2 組：西決 + 東決)
        { round: 2, matches: [
          { teamA: "TBD", seedA: "-", teamB: "TBD", seedB: "-", winsA: 0, winsB: 0, winner: null },
          { teamA: "TBD", seedA: "-", teamB: "TBD", seedB: "-", winsA: 0, winsB: 0, winner: null }
        ]},
        // Round 3: NBA 總冠軍賽 (1 組：西區冠軍 vs 東區冠軍)
        { round: 3, matches: [
          { teamA: "TBD", seedA: "-", teamB: "TBD", seedB: "-", winsA: 0, winsB: 0, winner: null }
        ]}
      ];
      currentPlayoffRound = 0;
      persistPlayoffJourney('ready');
    }

    function persistPlayoffJourney(status) {
      if (!state?.seasonJourney || !Array.isArray(playoffTeamsState) || !playoffTeamsState.length) return;
      state.seasonJourney.playoffs = {
        version: 1,
        seasonNo: Number(state.seasonJourney.seasonNo || 1),
        round: Number(currentPlayoffRound || 0),
        status: status || 'in_progress',
        bracket: JSON.parse(JSON.stringify(playoffTeamsState)),
        updatedAt: new Date().toISOString()
      };
      saveGame();
    }

    function restorePlayoffJourney() {
      const saved = state?.seasonJourney?.playoffs;
      const sameSeason = saved && Number(saved.seasonNo) === Number(state.seasonJourney?.seasonNo || 1);
      if (!sameSeason || !Array.isArray(saved.bracket) || saved.bracket.length !== 4) return false;
      playoffTeamsState = JSON.parse(JSON.stringify(saved.bracket));
      currentPlayoffRound = Math.max(0, Math.min(4, Number(saved.round || 0)));
      return true;
    }

    function renderPlayoffBracket() {
      for (let r = 0; r < 4; r++) {
        const container = document.getElementById(`bracketRound${r+1}`);
        const matches = playoffTeamsState[r].matches;
        container.innerHTML = matches.map(m => `
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-2 text-left space-y-1 text-xs">
            <div class="flex justify-between"><span>(${m.seedA}) ${m.teamA}</span><span class="font-mono font-bold">${m.winsA}</span></div>
            <div class="flex justify-between"><span>(${m.seedB}) ${m.teamB}</span><span class="font-mono font-bold">${m.winsB}</span></div>
            ${m.winner ? `<div class="text-[9px] text-emerald-400 font-bold border-t border-slate-800 pt-0.5">晉級: ${m.winner}</div>` : ''}
          </div>`).join('');

        const btn = document.getElementById(`playoffBtnR${r+1}`);
        if (r === currentPlayoffRound) {
          btn.disabled = false;
          btn.className = "mt-4 bg-amber-500 hover:bg-amber-400 text-black font-bold py-2 rounded-xl text-xs transition";
        } else {
          btn.disabled = true;
          btn.className = "mt-4 bg-slate-800 text-slate-500 font-bold py-2 rounded-xl text-xs cursor-not-allowed";
        }
      }
    }

/* =====================================================
       ⑬ PLAYOFFS (16強種子對戰樹、防暴雷播報與收官戰 Box Score)
    ===================================================== */
    let lastUserPlayoffGameBox = null; // 暫存該輪系列賽最後一場的 Box Score
    let playoffSeriesFinalCallback = null; // 播報結束後的結算回呼
    let currentPlayoffSeriesLogs = []; // 當前系列賽逐場戰報紀錄

    function closeSeriesAndShowBoxScore() {
      // 1. 關閉系列賽播報跑馬燈
      document.getElementById('playoffSeriesModal').classList.add('hidden');

      // 2. 如果該輪有收官戰 Box Score，立刻彈出規格完全一致的 17 欄全隊 Box Score
      if (lastUserPlayoffGameBox) {
        openGameBoxScoreModal(lastUserPlayoffGameBox, lastUserPlayoffGameBox.subTitle || '季後賽收官決勝戰');
      }

      // 3. 延遲 400ms 再彈出獎勵 alert，避免擋住 Box Score 的渲染
      if (playoffSeriesFinalCallback) {
        setTimeout(() => {
          if (playoffSeriesFinalCallback) {
            playoffSeriesFinalCallback();
            playoffSeriesFinalCallback = null;
          }
        }, 400);
      }
    }

    // 提供玩家在系列賽播報清單中隨時查看任意場次的完整 Box Score
    window.viewPlayoffGameBoxScore = function(idx) {
      if (currentPlayoffSeriesLogs && currentPlayoffSeriesLogs[idx] && currentPlayoffSeriesLogs[idx].fullGameData) {
        openGameBoxScoreModal(currentPlayoffSeriesLogs[idx].fullGameData, `季後賽 G${currentPlayoffSeriesLogs[idx].gameNum} 戰報`);
      }
    };

    function simulatePlayoffRound(roundIdx) {
      if (roundIdx === 0) {
        state.season.hasPlayedPlayoffs = true;
        state.playoffStats = {
          wins: 0,
          losses: 0,
          finalsPlayerStats: {}
        };
        saveGame();
      }
      if (!state.playoffStats) {
        state.playoffStats = { wins: 0, losses: 0, finalsPlayerStats: {} };
      }

      const matches = playoffTeamsState[roundIdx].matches;
      const playerTeamName = getUserFranchiseName();
      const teamOvr = calculateTeamOverall().overall;
      let userSurvivedThisRound = false;
      const roundNames = ["首輪 16強", "分區次輪 8強", "分區決賽 4強", "NBA 總冠軍賽"];

      const userMatch = matches.find(m => m.teamA === playerTeamName || m.teamB === playerTeamName);
      const userSeriesLogs = [];
      lastUserPlayoffGameBox = null;

      matches.forEach(m => {
        if (m.winner) return;
        let wA = 0, wB = 0;
        const isUserMatch = (m === userMatch);
        const isUserTeamA = (m.teamA === playerTeamName);
        const oppTeamCode = isUserTeamA ? m.teamB : m.teamA;

        while (wA < 4 && wB < 4) {
          let probA = 0.5;
          const gameNum = wA + wB + 1;
          const homeAdv = (gameNum === 1 || gameNum === 2 || gameNum === 5 || gameNum === 7) ? 0.04 : -0.04;

          if (m.teamA === playerTeamName) {
            probA = 0.50 + ((teamOvr - 85) * 0.035) + homeAdv;
          } else if (m.teamB === playerTeamName) {
            probA = 0.50 - ((teamOvr - 85) * 0.035) + homeAdv;
          } else {
            const seedDiff = (Number(m.seedB) || 5) - (Number(m.seedA) || 5);
            probA = 0.50 + (seedDiff * 0.03) + homeAdv;
          }

          probA = Math.max(0.20, Math.min(0.80, probA));
          const winA = Math.random() < probA;
          if (winA) wA++; else wB++;

          if (isUserMatch) {
            const userWonGame = (isUserTeamA && winA) || (!isUserTeamA && !winA);
            if (userWonGame) {
              state.playoffStats.wins = (state.playoffStats.wins || 0) + 1;
            } else {
              state.playoffStats.losses = (state.playoffStats.losses || 0) + 1;
            }

            // 擬真單場比分與個人數據生成
            const basePace = 108 + Math.round(Math.random() * 10 - 5);
            const margin = Math.floor(Math.random() * 12) + 2;
            const myScore = userWonGame ? basePace + margin : basePace - margin;
            const oppScore = userWonGame ? basePace : basePace + margin;

            const starters = ['PG', 'SG', 'SF', 'PF', 'C'].map(pos => state.startingLineup[pos]).filter(Boolean);
            const bench = (state.benchLineup || []).filter(Boolean);

            const singleGameData = generateGameBoxScoreData({
              starters,
              bench,
              myScore,
              oppScore,
              win: userWonGame,
              oppTeam: oppTeamCode,
              badgeEffects: analyzeLineupBadges(),
              isPlayoff: true,
              gameNum
            });

            // 🌟 若為總決賽，累計每位球員在總決賽的火燙攻防表現，供 FMVP 評選
            if (roundIdx === 3) {
              if (!state.playoffStats.finalsPlayerStats) state.playoffStats.finalsPlayerStats = {};
              singleGameData.boxScore.forEach(sp => {
                if (!state.playoffStats.finalsPlayerStats[sp.name]) {
                  state.playoffStats.finalsPlayerStats[sp.name] = {
                    name: sp.name,
                    pos: sp.pos,
                    pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, games: 0
                  };
                }
                const st = state.playoffStats.finalsPlayerStats[sp.name];
                st.pts += sp.pts;
                st.reb += sp.reb;
                st.ast += sp.ast;
                st.stl += sp.stl;
                st.blk += sp.blk;
                st.games += 1;
              });
            }

            const hero = singleGameData.bestPlayer;
            const highlightText = singleGameData.highlight;

            userSeriesLogs.push({
              gameNum,
              scoreText: `${m.teamA} ${isUserTeamA ? myScore : oppScore} - ${isUserTeamA ? oppScore : myScore} ${m.teamB}`,
              userWonGame,
              currentSeriesScore: `${wA} - ${wB}`,
              highlight: highlightText,
              fullGameData: singleGameData
            });

            // 🌟 每一場結束後都覆寫，最後自然存到該系列賽「最後一場（G4 ~ G7）決勝戰」的詳細 Box
            const isChampionshipGame = (roundIdx === 3 && (wA >= 4 || wB >= 4));
            const subTitle = isChampionshipGame 
              ? (userWonGame ? 'NBA 總冠軍賽 封王戰' : 'NBA 總冠軍賽 收官戰') 
              : `${roundNames[roundIdx]} 收官決勝戰`;

            lastUserPlayoffGameBox = {
              ...singleGameData,
              subTitle
            };
          }
        }

        m.winsA = wA;
        m.winsB = wB;
        m.winner = wA > wB ? m.teamA : m.teamB;

        if (m.winner === playerTeamName) {
          userSurvivedThisRound = true;
        }
      });

      // 晉級推進
      if (roundIdx < 3) {
        const next = playoffTeamsState[roundIdx + 1].matches;
        matches.forEach((m, idx) => {
          const target = Math.floor(idx / 2);
          if (next[target]) {
            if (idx % 2 === 0) {
              next[target].teamA = m.winner;
              next[target].seedA = (m.winner === m.teamA) ? m.seedA : m.seedB;
            } else {
              next[target].teamB = m.winner;
              next[target].seedB = (m.winner === m.teamA) ? m.seedA : m.seedB;
            }
          }
        });
      }

      currentPlayoffRound++;
      persistPlayoffJourney(roundIdx === 3 ? 'complete' : (!userSurvivedThisRound ? 'eliminated' : 'in_progress'));
      renderPlayoffBracket();

      if (userMatch) {
        document.getElementById('posRoundTitle').innerText = `2026 季後賽・${roundNames[roundIdx]} (七戰四勝制)`;
        document.getElementById('posSeriesMatchup').innerText = `${userMatch.teamA} vs ${userMatch.teamB}`;
        
        const scoreBadge = document.getElementById('posSeriesScore');
        scoreBadge.innerText = `系列賽 0 - 0`;

        const logContainer = document.getElementById('posGamesLog');
        logContainer.innerHTML = '';

        // 鎖定底部按鈕，禁止提前點擊
        const nextBtn = document.getElementById('posNextRoundBtn');
        nextBtn.disabled = true;
        nextBtn.innerText = "⏳ 戰況激烈播報中...";
        nextBtn.className = "w-full bg-slate-800 text-slate-500 font-black py-2.5 rounded-xl text-xs cursor-not-allowed transition";

        const GAME_INTERVAL = 824;
        currentPlayoffSeriesLogs = userSeriesLogs;

        // 逐場跑馬燈播報
        userSeriesLogs.forEach((g, idx) => {
          setTimeout(() => {
            scoreBadge.innerText = `系列賽 ${g.currentSeriesScore}`;

            const card = document.createElement('div');
            card.className = `p-3 rounded-xl border text-xs transition-all duration-300 transform scale-98 hover:scale-100 ${
              g.userWonGame 
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200 shadow-emerald-900/20 shadow-md' 
                : 'bg-rose-950/60 border-rose-500/50 text-rose-200 shadow-rose-900/20 shadow-md'
            }`;
            card.innerHTML = `
              <div class="flex justify-between items-center font-bold font-mono">
                <span class="text-sm">Game ${g.gameNum}: ${g.scoreText}</span>
                <div class="flex items-center gap-2">
                  <button onclick="window.viewPlayoffGameBoxScore(${idx})" type="button" class="text-[10px] bg-slate-900/90 hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/40 transition cursor-pointer shadow-sm">
                    📊 戰報
                  </button>
                  <span class="text-[11px] font-black px-2 py-0.5 rounded ${g.userWonGame ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'}">
                    ${g.userWonGame ? 'WIN 胜' : 'LOSS 败'}
                  </span>
                </div>
              </div>
              <p class="text-[11px] text-slate-300 mt-1.5 leading-relaxed font-sans">${g.highlight}</p>
            `;
            logContainer.appendChild(card);
            logContainer.scrollTop = logContainer.scrollHeight;

            if (g.userWonGame) playSound('flip');

            // 🌟 當最後一場跑完時，精準解鎖按鈕，提示查看收官戰報！
            if (idx === userSeriesLogs.length - 1) {
              setTimeout(() => {
                nextBtn.disabled = false;
                nextBtn.innerText = "📊 查看本輪收官戰報與系列賽結果 ➔";
                nextBtn.className = "w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 font-black py-2.5 rounded-xl text-xs shadow-lg cursor-pointer transition animate-pulse";
                playSound('coin');
              }, 400);
            }
          }, (idx + 1) * GAME_INTERVAL);
        });

        document.getElementById('playoffSeriesModal').classList.remove('hidden');

        // 結算獎勵 Callback（等玩家按下「查看本輪收官戰報」時才觸發，絕不提前破梗！）
        playoffSeriesFinalCallback = () => {
          if (userSurvivedThisRound && roundIdx < 3) {
            const rewardTickets = roundIdx + 1;
            state.tickets += rewardTickets;
            addNotification({
              title: `🎉 挺進【${roundNames[roundIdx + 1]}】！`,
              message: `恭喜拿下系列賽！挺進下一輪【${roundNames[roundIdx + 1]}】！獲得突破獎勵：🎟️ 抽卡券 +${rewardTickets} 張！`,
              icon: '🏆',
              type: 'achievement'
            });
            showRewardModal({
              title: `🎉 挺進【${roundNames[roundIdx + 1]}】！`,
              subtitle: '勇奪系列賽勝利，昂首挺進下一輪戰事！',
              rewards: [
                { icon: '🎟️', name: '系列賽晉級突破獎勵', amount: `+${rewardTickets} 張抽卡券` }
              ]
            });
          } else if (!userSurvivedThisRound) {
            showGameAlert({
              title: '💔 季後賽遺憾淘汰',
              message: `在【${roundNames[roundIdx]}】遭到淘汰！搶七/生死戰遺恨吞敗，下季捲土重來！`,
              type: 'warning'
            });
          }

          // 總決賽結算
          if (roundIdx === 3) {
            if (matches[0].winner === playerTeamName) {
              state.tickets += 15;
              state.scoutPoints = (Number(state.scoutPoints) || 0) + 100;

              const championshipLineup = [
                ...Object.values(state.startingLineup),
                ...state.benchLineup
              ].filter(Boolean);

              // 1. 🏅 評選系列賽表現最火燙球員為 FMVP
              const finalsStats = state.playoffStats?.finalsPlayerStats || {};
              const playerNames = Object.keys(finalsStats);
              let fmvpName = '';
              let bestScore = -1;
              let fmvpStatsObj = null;

              playerNames.forEach(name => {
                const s = finalsStats[name];
                const g = Math.max(1, s.games || 1);
                // 綜合火燙表現評分：場均得分 + 籃板*1.2 + 助攻*1.5 + 抄截*2 + 阻攻*2
                const ppg = s.pts / g;
                const rpg = s.reb / g;
                const apg = s.ast / g;
                const spg = s.stl / g;
                const bpg = s.blk / g;
                const score = ppg * 1.0 + rpg * 1.2 + apg * 1.5 + spg * 2.0 + bpg * 2.0;
                if (score > bestScore) {
                  bestScore = score;
                  fmvpName = name;
                  fmvpStatsObj = { ...s, ppg: ppg.toFixed(1), rpg: rpg.toFixed(1), apg: apg.toFixed(1) };
                }
              });

              // 若無累計數據，Fallback 至先發戰力最高球員
              let fmvpCard = null;
              if (fmvpName) {
                fmvpCard = championshipLineup.find(c => c && c.name === fmvpName) || state.inventory.find(c => c && c.name === fmvpName);
              }
              if (!fmvpCard && championshipLineup.length > 0) {
                fmvpCard = [...championshipLineup].sort((a, b) => (b.ovr || 0) - (a.ovr || 0))[0];
                fmvpName = fmvpCard.name;
              }

              // 2. 🏆 烙印金色「🏆 FMVP」徽章，並於下個賽季永久 OVR +1
              if (fmvpCard) {
                fmvpCard.isFmvp = true;
if (!fmvpCard.legacy) {
    fmvpCard.legacy = {};
}

if (!Array.isArray(fmvpCard.legacy.traits)) {
    fmvpCard.legacy.traits = [];
}

fmvpCard.legacy.fmvps =
    (Number(fmvpCard.legacy.fmvps) || 0) + 1;

if (!fmvpCard.legacy.traits.includes('總決賽MVP')) {
    fmvpCard.legacy.traits.push('總決賽MVP');
}
                // 重新計算 OVR：獲得永久 +1 OVR 加成
                fmvpCard.ovr = calculateCardOvr(fmvpCard.baseOvr, fmvpCard.stars, fmvpCard.fmvpBonus);
                if (fmvpCard.legacy.traits.includes('得分機器')) {
                  fmvpCard.ovr += 1;
                }
              }

              // 全隊出戰成員戒指累積 +1
              championshipLineup.forEach(card => {
                if (!card.legacy) card.legacy = { games: 0, pts: 0, reb: 0, ast: 0, rings: 0, mvps: 0, fmvps: 0, traits: [] };
                card.legacy.rings = (card.legacy.rings || 0) + 1;
                if (!card.legacy.traits.includes('冠軍成員')) {
                  card.legacy.traits.push('冠軍成員');
                }
              });

           // 3. 💍 生成刻字冠軍歷史至展示櫃
const ringYear = typeof state.season === 'number' 
  ? (2024 + state.season) 
  : (state.season?.year || 2026);              const playoffRecord = `${state.playoffStats?.wins || 16}-${state.playoffStats?.losses || 3}`;
              const finalsOpponent = (matches[0].teamA === playerTeamName ? matches[0].teamB : matches[0].teamA) || "對手戰隊";
              
              const fmvpSummaryText = fmvpStatsObj 
                ? `場均 ${fmvpStatsObj.ppg}分 ${fmvpStatsObj.rpg}板 ${fmvpStatsObj.apg}助`
                : '總決賽火燙統治級表現';

              // 📸 奪冠瞬間：凍結當下那一年的先發五虎快照
              const snapshotStarters = ['PG', 'SG', 'SF', 'PF', 'C'].map(pos => {
                const p = state.startingLineup[pos];
                if (!p) return { pos, name: '空缺', ovr: '--', nbaId: 0, rarity: 'N' };
                return {
                  pos: pos,
                  name: p.name,
                  ovr: p.ovr || p.baseOvr || 75,
                  nbaId: p.nbaId || 0,
                  rarity: p.rarity || 'SSR'
                };
              });

              const newRing = {
                id: 'ring_' + Date.now(),
                year: ringYear,
                record: playoffRecord,
                opponent: finalsOpponent,
                fmvpName: fmvpCard ? fmvpCard.name : '當家球星',
                fmvpNbaId: fmvpCard ? fmvpCard.nbaId : 0,
                fmvpStats: fmvpSummaryText,
                starters: snapshotStarters
              };

              if (!Array.isArray(state.championshipRings)) state.championshipRings = [];
              state.championshipRings.push(newRing);

              // 🔔 正確格式呼叫通知中心 (參數為 title, message, type)
              addNotification(
                '👑 狂賀！奪得 NBA 總冠軍！',
                `登頂世界之巔！系列賽以 ${playoffRecord} 擊敗【${finalsOpponent}】！${fmvpCard ? fmvpCard.name : ''} 榮膺 FMVP！`,
                'achievement'
              );

              // 4. 🎉 正式呼叫奪冠香檳遊行慶典彈窗
              openChampionshipCelebration(newRing, {
                name: fmvpCard ? fmvpCard.name : '當家球星',
                team: fmvpCard ? fmvpCard.team : 'LAL',
                stats: fmvpSummaryText,
                nbaId: fmvpCard ? fmvpCard.nbaId : 0
              });

            } else {
              state.tickets += 3;
              showRewardModal({
                title: '🏀 總決賽落幕',
                subtitle: `由【${matches[0].winner}】捧起歐布萊恩金盃，獲得亞軍參賽獎勵！`,
                rewards: [
                  { icon: '🎟️', name: '亞軍獎勵抽卡券', amount: '+3 張' }
                ]
              });
            }
          }

          saveGame();
          renderAll();
        };

      } else {
        saveGame();
        renderAll();
      }
    }
    /* =====================================================
       ⑨ STORAGE & ADMIN
    ===================================================== */
const defaultState = {
      currentInventorySort: 'ovr',
      inventorySortOrder: 'desc', 
      inventoryFilters: { position: 'ALL', team: 'ALL', rarity: 'ALL' },
      inventory: [],
      featuredPlayerCardId: null,
      startingLineup: { PG: null, SG: null, SF: null, PF: null, C: null },
      benchLineup: [null, null, null, null, null, null],
      tickets: 10,
      scoutPoints: 0,
      streak: 0,
      studyLogs: [], // 存放格式如 ["2026-09-17", "2026-09-16"]
      studyDetails: {}, // 格式如: { "2026-9-17": { lTotal: 30, lCorrect: 26, rTotal: 40, rCorrect: 32 } }
      appliedStudyRecoveries: [],
      pomodoro: {
        sessionId: '',
        status: 'idle',
        sessionStartAt: null,
        plannedDuration: 25 * 60 * 1000,
        pausedAccumulatedMs: 0,
        completedAt: null
      },
      focusMode: {
        active: false,
        totalFocusedMs: 0,
        dailyDate: '',
        dailyFocusedMs: 0,
        rewardsDate: '',
        rewardsClaimedToday: 0,
        rewardCountsByDate: {},
        rewardedSessionIds: [],
        dailyRewardCap: 20,
        sessionId: '',
        status: 'idle',
        sessionStartAt: null,
        pausedAccumulatedMs: 0,
        rewardedIntervals: 0,
        trackingVersion: 2,
        taskId: null,
        subject: '',
        plannedMinutes: 0,
        plannerStartAt: null,
        taskType: 'study'
      },
      studyPlanner: {
        tasks: [],
        logs: []
      },
      studyStreak: 0,
      studyStreakLastDate: '',
      studyActivityDates: [],
      isAdmin: false,
      claimedTeamRewards: [],
      redeemedCodes: [],
      championshipRings: [],
      playoffStats: { wins: 0, losses: 0, finalsPlayerStats: {} },
      // 新版逐場賽季資料；由 season-journey.js 初始化。
      seasonEnergy: null,
      seasonJourney: null,
dailyQuests: {
        date: '',
        lastLoginDate: '', // 追蹤登入日期以計算連續天數
        loginClaimed: false, // 今日是否已領取 10 抽
        wordAddedToday: 0,
        quizPerfectToday: false,
        pomodoroDoneToday: 0,
        claimed: { q1: false, q2: false, q3: false, all: false }
      },
      season: {
        lastSimDate: '',
        lastSimRecord: '',
        lastSimWins: 0,
        lastSimStreak: 0,
        lastSimGames: [],
        lastBoxScores: [],
        threePtContestPlayed: false,
        threePtContestShooter: null,
        threePtContestScore: null
      },
      toeic: {
        totalListening: 0,
        totalReading: 0,
        vocabList: [...TOEIC_WORDS],
        wrongAnswers: [],
        endlessBest: 0,
        endlessBestAt: '',
        currentQuizIndex: 0,
        quizStreak: 0,
        totalMastered: 0,
        selectedBoxFilter: 'all',
        isSpellingMode: false
      }
    };

function saveGame() {
      if (saveRecoveryBlocked) return false;
      try {
        state.saveMeta = { ...(state.saveMeta || {}), updatedAt: new Date().toISOString() };
        if (saveBackupStore) saveBackupStore.save(state);
        else localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        return true;
      } catch (e) {
        console.error("Save failed (localStorage error):", e);
        if (Date.now() - lastSaveErrorAt > 60000) {
          lastSaveErrorAt = Date.now();
          if (document.readyState !== 'loading') showToast('存檔空間不足，請到「備份與換機」匯出目前進度。', 'error');
        }
        return false;
      }
    }

    function deepMergeState(defaults, saved) {
      const result = Array.isArray(defaults) ? [] : {};
      for (const key in defaults) {
        if (saved && Object.prototype.hasOwnProperty.call(saved, key)) {
          if (
            typeof defaults[key] === 'object' && 
            defaults[key] !== null && 
            !Array.isArray(defaults[key])
          ) {
            result[key] = deepMergeState(defaults[key], saved[key]);
          } else {
            result[key] = saved[key];
          }
        } else {
          result[key] = JSON.parse(JSON.stringify(defaults[key]));
        }
      }
      // Preserve dynamic save keys that cannot exist in defaultState, such as
      // studyDetails["YYYY-MM-DD"]. The previous merge silently discarded them.
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        Object.keys(saved).forEach(key => {
          if (['__proto__', 'prototype', 'constructor'].includes(key)) return;
          if (!Object.prototype.hasOwnProperty.call(defaults, key)) {
            result[key] = saved[key];
          }
        });
      }
      return result;
    }

    /* =====================================================
       4.1 核心存檔遷移與架構規格化 (Migrate Save Data)
       - Save 穩定
       - 舊存檔相容
       - Card ID 統一 (card_*)
       - Player ID (nbaId) / Card ID (cardId) 徹底分離
       - Season / Playoff 狀態穩定完整
    ===================================================== */
    function migrateSaveData(s) {
      if (!s || typeof s !== 'object') return JSON.parse(JSON.stringify(defaultState));

      // 1. 補齊與驗證根級狀態欄位
      if (!Array.isArray(s.inventory)) s.inventory = [];
      if (!s.startingLineup || typeof s.startingLineup !== 'object') {
        s.startingLineup = { PG: null, SG: null, SF: null, PF: null, C: null };
      }
      if (!Array.isArray(s.benchLineup) || s.benchLineup.length !== 6) {
        s.benchLineup = [null, null, null, null, null, null];
      }
      if (!s.season || typeof s.season !== 'object') {
        s.season = { ...defaultState.season };
      }
      if (typeof s.season.threePtContestPlayed === 'undefined') s.season.threePtContestPlayed = false;
      if (typeof s.season.threePtContestShooter === 'undefined') s.season.threePtContestShooter = null;
      if (typeof s.season.threePtContestScore === 'undefined') s.season.threePtContestScore = null;
      if (typeof s.season.hasPlayedPlayoffs === 'undefined') s.season.hasPlayedPlayoffs = false;
      if (!Array.isArray(s.championshipRings)) s.championshipRings = [];
      if (!s.playoffStats || typeof s.playoffStats !== 'object') s.playoffStats = { wins: 0, losses: 0, finalsPlayerStats: {} };
      if (!s.studyPlanner || typeof s.studyPlanner !== 'object') s.studyPlanner = { tasks: [], logs: [] };
      if (!Array.isArray(s.studyPlanner.tasks)) s.studyPlanner.tasks = [];
      if (!Array.isArray(s.studyPlanner.logs)) s.studyPlanner.logs = [];
      if (!Array.isArray(s.studyActivityDates)) s.studyActivityDates = [];
      s.studyStreak = Math.max(0, Number(s.studyStreak) || 0);
      s.studyStreakLastDate = typeof s.studyStreakLastDate === 'string' ? s.studyStreakLastDate : '';
      if (!s.toeic || typeof s.toeic !== 'object') s.toeic = { ...defaultState.toeic };
      s.toeic.endlessBest = Math.max(0, Number(s.toeic.endlessBest) || 0);
      s.toeic.endlessBestAt = typeof s.toeic.endlessBestAt === 'string' ? s.toeic.endlessBestAt : '';

      // One-time owner recovery after the legacy deep merge removed dated studyDetails.
      // Only applies to an admin save and never overwrites an existing record.
      const recoveryId = 'owner-study-2026-10-01-international-village-listening-1';
      if (!Array.isArray(s.appliedStudyRecoveries)) s.appliedStudyRecoveries = [];
      if (s.isAdmin && !s.appliedStudyRecoveries.includes(recoveryId)) {
        const recoveryDate = '2026-10-01';
        if (!s.studyDetails || typeof s.studyDetails !== 'object') s.studyDetails = {};
        if (!s.studyDetails[recoveryDate]) {
          s.studyDetails[recoveryDate] = {
            quizName: '多益國際學村第一回（聽力）',
            totalScore: 315,
            lTotal: 100,
            lCorrect: 63,
            rTotal: 0,
            rCorrect: 0
          };
        }
        if (!Array.isArray(s.studyLogs)) s.studyLogs = [];
        if (!s.studyLogs.includes(recoveryDate)) s.studyLogs.push(recoveryDate);
        s.appliedStudyRecoveries.push(recoveryId);
      }

      // 2. 建立選手快查表 (依據官方 NBA_PLAYERS 補齊 nbaId、realOvr、positions)
      const playerLookup = new Map();
      if (typeof NBA_PLAYERS !== 'undefined' && Array.isArray(NBA_PLAYERS)) {
        NBA_PLAYERS.forEach(p => {
          if (!p.name) return;
          const playerName = p.name.trim();
          playerLookup.set(`${playerName}::${getCardEdition(p)}`, p);
          if (!playerLookup.has(playerName)) playerLookup.set(playerName, p);
        });
      }

      const seenCardIds = new Set();

      // 標準化單張卡片：確保 Card ID 統一、與 Player ID (nbaId) 徹底分離
      function normalizeCard(c) {
        if (!c || typeof c !== 'object') return null;

        // 傳奇 Kobe 使用生涯年度版本 ('10)，不歸入一般 ('25)/('26) 名單。
        if ((Number(c.nbaId || c.id) === 977 && c.isLegend) || /Kobe Bryant\s*\('\s*10\s*\)/i.test(String(c.name || ''))) {
          c.name = 'Kobe Bryant';
          c.edition = '10';
        }

        // 既有存檔未帶年度的卡片一律視為原版 2025 卡。
        c.edition = getCardEdition(c);

        // Card ID 統一 (唯一實例 ID)
        if (!c.cardId || typeof c.cardId !== 'string' || !c.cardId.startsWith('card_') || seenCardIds.has(c.cardId)) {
          c.cardId = createCardId();
        }
        seenCardIds.add(c.cardId);

        const cardName = String(c.name || '').trim();
        const refPlayer = playerLookup.get(`${cardName}::${c.edition}`) || playerLookup.get(cardName);

        // Player ID (nbaId 專屬官方球員編號，徹底分離)
        if (!c.nbaId || typeof c.nbaId !== 'number') {
          if (refPlayer && (refPlayer.nbaId || refPlayer.id)) {
            c.nbaId = Number(refPlayer.nbaId || refPlayer.id);
          } else if (typeof c.id === 'number') {
            c.nbaId = c.id;
          } else {
            c.nbaId = 0;
          }
        }
        // 清除舊存檔中容易與 cardId 混淆的無效/非字串 id
        if ('id' in c && typeof c.id !== 'string') {
          delete c.id;
        }

        // 星級與數值補正
        c.stars = Number(c.stars) || 1;
        if (!c.realOvr) {
          c.realOvr = Number(refPlayer?.realOvr || refPlayer?.real_ovr || c.baseOvr || c.ovr || 70);
        }
        if (!c.baseOvr) c.baseOvr = c.realOvr;
        const fmvpBonus = Number(c.fmvpBonus || c.legacy?.fmvps || 0);
        c.fmvpBonus = fmvpBonus;
        c.isFmvp = !!(c.isFmvp || fmvpBonus > 0);
        c.ovr = calculateCardOvr(c.baseOvr, c.stars, fmvpBonus);

        const sourcePositions = (Array.isArray(c.positions) && c.positions.length)
          ? c.positions
          : (refPlayer?.positions || refPlayer?.pos || c.pos || ['PG']);
        c.positions = typeof normalizePlayerPositions === 'function'
          ? normalizePlayerPositions(sourcePositions, ['PG'])
          : [...sourcePositions];

        // 舊版商店傳奇 Kobe 仍屬於已完成的 Mamba Special，不會被一般 UR 模板覆蓋。
        if (!c.designId && Number(c.nbaId) === 977 && c.isLegend) {
          c.designId = 'mamba-signature-v1';
        }

        if (!c.legacy || typeof c.legacy !== 'object') {
          c.legacy = { seasons: 0, games: 0, pts: 0, reb: 0, ast: 0, rings: 0, mvps: 0, fmvps: fmvpBonus, traits: [] };
        } else if (typeof c.legacy.fmvps === 'undefined') {
          c.legacy.fmvps = fmvpBonus;
        }

        if (!c.rarity) {
          c.rarity = refPlayer?.rarity || determineRarityByOvr(c.baseOvr);
        }

        // 既有 ('26) 卡在讀檔時同步最新 2025-26 賽季資料；不影響 OVR、星級或其他年度卡片。
        if (c.edition === '26' && refPlayer?.statsSeason === '2025-26') {
          c.basic = refPlayer.basic ? { ...refPlayer.basic } : (c.basic || null);
          c.advanced = refPlayer.advanced ? { ...refPlayer.advanced } : (c.advanced || null);
          c.srId = refPlayer.srId || c.srId || null;
          c.statsSeason = refPlayer.statsSeason || c.statsSeason || null;
          c.statsSource = refPlayer.statsSource ? { ...refPlayer.statsSource } : (c.statsSource || null);
        }

        return c;
      }

      // 標準化背包卡片
      s.inventory = s.inventory.map(c => normalizeCard(c)).filter(Boolean);

      // 管理員的「全球員卡庫」在名單年度更新後自動補齊缺少的版本。
      // 一般玩家不會免費取得新卡，仍維持原本的抽卡進度。
      const legacyCollectionSize = new Set(s.inventory.filter(card => getCardEdition(card) === '25').map(card => card.name)).size;
      const shouldSyncFullCollection = s.isAdmin || legacyCollectionSize >= 300;
      if (shouldSyncFullCollection && typeof NBA_PLAYERS !== 'undefined' && Array.isArray(NBA_PLAYERS)) {
        const ownedEditionKeys = new Set(s.inventory.map(card => `${card.name}::${getCardEdition(card)}`));
        NBA_PLAYERS.forEach(player => {
          const editionKey = `${player.name}::${getCardEdition(player)}`;
          if (ownedEditionKeys.has(editionKey)) return;
          const newCard = normalizeCard(createCard(player, 1));
          if (newCard) s.inventory.push(newCard);
          ownedEditionKeys.add(editionKey);
        });
      }

      // 標準化先發陣容與卡片參照
      ['PG', 'SG', 'SF', 'PF', 'C'].forEach(pos => {
        if (s.startingLineup[pos]) {
          const matched = s.inventory.find(c => c && (c.cardId === s.startingLineup[pos].cardId || (s.startingLineup[pos].name && c.name === s.startingLineup[pos].name && getCardEdition(c) === getCardEdition(s.startingLineup[pos]) && c.stars === s.startingLineup[pos].stars)));
          if (matched) {
            s.startingLineup[pos] = matched;
          } else {
            const norm = normalizeCard(s.startingLineup[pos]);
            if (norm) {
              s.inventory.push(norm);
              s.startingLineup[pos] = norm;
            } else {
              s.startingLineup[pos] = null;
            }
          }
        }
      });

      // 標準化替補陣容
      s.benchLineup = s.benchLineup.map(b => {
        if (!b) return null;
        const matched = s.inventory.find(c => c && (c.cardId === b.cardId || (b.name && c.name === b.name && getCardEdition(c) === getCardEdition(b) && c.stars === b.stars)));
        if (matched) return matched;
        const norm = normalizeCard(b);
        if (norm) s.inventory.push(norm);
        return norm;
      });

      return s;
    }

    function loadGame() {
      try {
        const recovery = saveBackupStore?.load();
        saveRecoveryBlocked = !!recovery?.blocked;
        if (recovery?.recovered || recovery?.blocked) {
          window.toeicQuestSaveRecovery = recovery;
        }
        const raw = recovery ? null : localStorage.getItem(STORAGE_KEY);
        const parsed = recovery?.state || (raw ? JSON.parse(raw) : null);
        if (!parsed) return JSON.parse(JSON.stringify(defaultState));
        const merged = deepMergeState(defaultState, parsed);
        return migrateSaveData(merged);
      } catch (e) {
        console.error("Load save error, falling back to defaultState:", e);
        saveRecoveryBlocked = true;
        window.toeicQuestSaveRecovery = { blocked: true, message: '存檔尚未成功讀取，已暫停覆寫。請從備份還原或匯入存檔。' };
        return JSON.parse(JSON.stringify(defaultState));
      }
    }

    async function resetGame() {
      const confirmed = await showGameConfirm({
        title: '⚠️ 重置遊戲存檔',
        message: '確定要重置 ToeicQuest NBA 的遊戲存檔嗎？所有收集的球員卡、賽季數據與單字庫進度將清空重置。',
        confirmText: '確定重置',
        cancelText: '取消',
        type: 'danger'
      });
      if (!confirmed) return;
      const previousState = state;
      try {
        if (saveBackupStore) saveBackupStore.snapshot(JSON.stringify(state), '重置前備份', true);
        state = JSON.parse(JSON.stringify(defaultState));
        saveRecoveryBlocked = false;
        if (!saveGame()) throw new Error('無法儲存重置後的進度');
      } catch (error) {
        state = previousState;
        showToast('無法安全重置，請先匯出目前進度。', 'error');
        return;
      }
      window.location.reload();
    }

    function adminUnlockAllPlayers() {
      if (!state.isAdmin) {
        showToast("⚠️ 請先啟用管理員權限！", "warning");
        return;
      }
      NBA_PLAYERS.forEach(player => {
        const hasPlayer = state.inventory.some(p => p.name === player.name && getCardEdition(p) === getCardEdition(player));
        if (!hasPlayer) {
          state.inventory.push(createCard(player, 1));
        }
      });
      saveGame();
      renderAll();
      showToast(`已成功解鎖全聯盟 30 隊共 ${state.inventory.length} 張球員卡！`, "success");
    }
    /*
 =====================================================
       ⑩ RENDERING & UI SYNC
    ===================================================== */
    let state = loadGame() || defaultState;
    if (!state.inventorySortOrder) state.inventorySortOrder = 'desc';
    if (!state.inventoryFilters) state.inventoryFilters = { position: 'ALL', team: 'ALL', rarity: 'ALL' };

    let activeSessionCards = [];
    let isSimulating = false;
    let pendingGachaTimes = 1;
    let isRippingPack = false;
    let pomodoroInterval = null;
    let isFocusPanelMinimized = false;
    let currentPlayoffRound = 0;
    let playoffTeamsState = [];
    let isFlipped = false;
/* =====================================================
   🏅 NBA 特色徽章字典與解析系統 (Badge System)
===================================================== */
const BADGE_ENCYCLOPEDIA = {
  "曼巴精神": {
    icon: "🐍",
    color: "text-purple-400 border-purple-500/50 bg-purple-950/60",
    condition: "場均得分 >= 24.0 或 球權使用率 USG% >= 28.5%",
    buff: "【大心臟爆發】末節與關鍵膠著時刻個人得分期望值 +15%，大幅提高單打終結能力。"
  },
  "神射手": {
    icon: "🏹",
    color: "text-amber-400 border-amber-500/50 bg-amber-950/60",
    condition: "三分命中率 3P% >= 38.0% 且 場均三分出手 >= 4.8 次",
    buff: "【精準打擊】大幅降低外線連續打鐵率，賽季中投進 5 顆以上三分的單場機率倍增。"
  },
  "組織大師": {
    icon: "🪄",
    color: "text-blue-400 border-blue-500/50 bg-blue-950/60",
    condition: "場均助攻 >= 7.0 或 助攻率 AST% >= 32.0%",
    buff: "【全場指揮】在場時先發全隊整體命中率提升 +3%，並顯著壓低隊友的失誤率。"
  },
  "木桶伯": {
    icon: "☝️",
    color: "text-rose-400 border-rose-500/50 bg-rose-950/60",
    condition: "場均火鍋 >= 2.0 次或特定長臂神獸 (如 Wemby)",
    buff: "【禁飛區搖手指】大幅提高阻攻次數，對手在油漆區上籃、灌籃的成功率遭到嚴重壓制。"
  },
  "禁區大鎖": {
    icon: "🛑",
    color: "text-emerald-400 border-emerald-500/50 bg-emerald-950/60",
    condition: "場均火鍋 >= 1.2 次且身為中鋒 (C) 或大前鋒 (PF)",
    buff: "【禁區鐵壁】對手切入後的近框拋投命中率大幅下降，鞏固後場籃板保護力。"
  },
  "小偷": {
    icon: "🧤",
    color: "text-cyan-400 border-cyan-500/50 bg-cyan-950/60",
    condition: "場均抄截 >= 1.8 次或 抄截率 STL% >= 2.8%",
    buff: "【神經刀快手】破壞對手戰術傳球路線，大幅提升發動快攻轉換得分的次數。"
  },
  "外線大鎖": {
    icon: "🔒",
    color: "text-emerald-400 border-emerald-500/50 bg-emerald-950/60",
    condition: "場均抄截 >= 1.3 次的後衛/側翼，或頂級防守專家",
    buff: "【死亡纏繞】對位的外線球星命中率強制下修 5%，限制敵方主力外圍砲火。"
  },
  "無私": {
    icon: "🤝",
    color: "text-teal-400 border-teal-500/50 bg-teal-950/60",
    condition: "球權使用率 USG% <= 16.0% 且場均助攻 >= 2.5 次",
    buff: "【團隊潤滑劑】主動放棄低效出手，優先給隊內前兩名得分主力創造高品質空檔。"
  },
  "助人為樂": {
    icon: "🎁",
    color: "text-indigo-400 border-indigo-500/50 bg-indigo-950/60",
    condition: "場均助攻 >= 5.0 次的高效策應者",
    buff: "【化學反應催化】該球員在場時，球隊化學反應額外獲得 +1 OVR 加乘。"
  },
  "第六人": {
    icon: "⚡",
    color: "text-orange-400 border-orange-500/50 bg-orange-950/60",
    condition: "放置於板凳席 (Bench) 且實力評級 real_ovr >= 80",
    buff: "【板凳匪徒】替補上陣完全不吃板凳降分懲罰，單場為替補席額外貢獻 +6 分火力。"
  },
  "總決賽MVP": {
    icon: "🏆",
    color: "text-amber-300 border-amber-400 bg-amber-950/70 shadow-[0_0_10px_rgba(245,158,11,0.5)]",
    condition: "率領球隊奪得 NBA 總冠軍並榮膺 FMVP",
    buff: "【總決賽傳奇】卡面永久烙印燙金印記，全賽季 OVR 永久 +1！季後賽關鍵關鍵戰役攻防表現全面昇華。"
  }
};

function getPlayerBadges(player) {
  if (!player) return [];
  const badges = [];
  const b = player.basic || {};
  const adv = player.advanced || {};

  const pts = Number(b.PTS) || 0;
  const ast = Number(b.AST) || 0;
  const stl = Number(b.STL) || 0;
  const blk = Number(b.BLK) || 0;
  const threePct = parseFloat(b["3P%"]) || 0;
  const threeAtt = Number(b["3PA"]) || 0;
  const usg = parseFloat(adv["USG%"]) || 0;
  const astPct = parseFloat(adv["AST%"]) || 0;
  const stlPct = parseFloat(adv["STL%"]) || 0;

  // 1. 曼巴精神
  if (pts >= 24.0 || usg >= 28.5) {
    badges.push({ name: "曼巴精神", ...BADGE_ENCYCLOPEDIA["曼巴精神"] });
  }

  // 2. 神射手
  if (threePct >= 38.0 && threeAtt >= 4.8) {
    badges.push({ name: "神射手", ...BADGE_ENCYCLOPEDIA["神射手"] });
  }

  // 3. 組織大師
  if (ast >= 7.0 || astPct >= 32.0) {
    badges.push({ name: "組織大師", ...BADGE_ENCYCLOPEDIA["組織大師"] });
  }

  // 4. 木桶伯
  if (blk >= 2.0 || player.name.includes("Wembanyama")) {
    badges.push({ name: "木桶伯", ...BADGE_ENCYCLOPEDIA["木桶伯"] });
  } 
  // 5. 禁區大鎖
  else if (blk >= 1.2 && (player.positions?.includes("C") || player.positions?.includes("PF"))) {
    badges.push({ name: "禁區大鎖", ...BADGE_ENCYCLOPEDIA["禁區大鎖"] });
  }

  // 6. 小偷
  if (stl >= 1.8 || stlPct >= 2.8) {
    badges.push({ name: "小偷", ...BADGE_ENCYCLOPEDIA["小偷"] });
  }
  // 7. 外線大鎖
  else if (stl >= 1.3 || (player.name.includes("Caruso") || player.name.includes("Holiday") || player.name.includes("Herb Jones"))) {
    badges.push({ name: "外線大鎖", ...BADGE_ENCYCLOPEDIA["外線大鎖"] });
  }

  // 8. 無私
  if (usg > 0 && usg <= 16.0 && ast >= 2.5) {
    badges.push({ name: "無私", ...BADGE_ENCYCLOPEDIA["無私"] });
  }

  // 9. 助人為樂
  if (ast >= 5.0) {
    badges.push({ name: "助人為樂", ...BADGE_ENCYCLOPEDIA["助人為樂"] });
  }

  // 10. 第六人
  const isBench = state.benchLineup?.some(p => p && (p.cardId === player.cardId || (p.name === player.name && getCardEdition(p) === getCardEdition(player))));
  if (isBench && (Number(player.realOvr || player.ovr) >= 80)) {
    badges.push({ name: "第六人", ...BADGE_ENCYCLOPEDIA["第六人"] });
  }

  // 11. 總決賽MVP (FMVP 傳奇榮譽印記)
  if (player.legacy?.fmvps > 0 || player.isFmvp) {
    badges.push({ name: "總決賽MVP", ...BADGE_ENCYCLOPEDIA["總決賽MVP"] });
  }

  return badges;
}

// 點擊卡片上的單個徽章，切換展開說明卡
function toggleBadgeDescription(badgeName) {
  const info = BADGE_ENCYCLOPEDIA[badgeName];
  const box = document.getElementById('badgeDescBox');
  if (!info || !box) return;

  document.getElementById('badgeDescIcon').innerText = info.icon;
  document.getElementById('badgeDescTitle').innerText = `${badgeName} (${info.condition})`;
  document.getElementById('badgeDescText').innerText = info.buff;

  box.classList.remove('hidden');
}

// 打開 10 大徽章全典圖鑑
function openBadgeGuideModal() {
  const container = document.getElementById('badgeGuideList');
  if (container) {
    container.innerHTML = Object.entries(BADGE_ENCYCLOPEDIA).map(([name, item]) => `
      <div class="bg-slate-950 border border-slate-800 p-2.5 rounded-xl space-y-1 text-left">
        <div class="flex justify-between items-center">
          <span class="font-bold flex items-center gap-1.5 ${item.color.split(' ')[0]}">
            <span>${item.icon}</span>
            <span>${name}</span>
          </span>
          <span class="text-[9px] font-mono text-slate-500">${item.condition}</span>
        </div>
        <p class="text-[11px] text-slate-300 leading-relaxed">${item.buff}</p>
      </div>
    `).join('');
  }
  document.getElementById('badgeGuideModal').classList.remove('hidden');
}

function closeBadgeGuideModal() {
  document.getElementById('badgeGuideModal').classList.add('hidden');
}

// 🔍 打開球員真實數據詳情彈窗
function showPlayerDetails(e, playerIdentifier) {
  if (e) e.stopPropagation();

  let p = null;
  if (typeof playerIdentifier === 'object' && playerIdentifier !== null) {
    p = playerIdentifier;
  } else if (typeof playerIdentifier === 'string') {
    p = (state.inventory || []).find(c => c && c.cardId === playerIdentifier);
    if (!p) {
      p = NBA_PLAYERS.find(item => item.name === playerIdentifier);
    }
  }

  if (p && (!p.basic || !p.advanced || !p.realOvr)) {
    const preferredTeamData = getCardEdition(p) === '25' ? TEAM_DATA_2025 : TEAM_DATA_2026;
    for (const t in preferredTeamData) {
      const match = preferredTeamData[t].find(x => x.name === p.name);
      if (match) {
        p.basic = match.basic || null;
        p.advanced = match.advanced || null;
        p.realOvr = match.real_ovr || match.ovr;
        p.real_ovr = match.real_ovr || match.ovr;
        break;
      }
    }
  }

  if (!p && typeof TEAM_DATA !== 'undefined') {
    for (const t in TEAM_DATA) {
      const match = TEAM_DATA[t].find(x => x.name === playerIdentifier || x.id === playerIdentifier);
      if (match) { 
        p = { ...match, team: t, edition: '26', realOvr: match.real_ovr || match.ovr }; 
        break; 
      }
    }
  }

  if (!p) {
    showToast("⚠️ 查無該球員的詳細數據！", "warning");
    return;
  }

  document.getElementById('detailPlayerName').innerText = getCardDisplayName(p) || '--';
  document.getElementById('detailPlayerTeam').innerText = p.team || '--';
  document.getElementById('detailPlayerPos').innerText = Array.isArray(p.positions) ? p.positions.join('/') : (p.pos ? p.pos.join('/') : '--');
  document.getElementById('detailPlayerRarity').innerText = p.rarity || determineRarityByOvr(p.ovr || 75);
// 💡 計算隊套加成 (3人+1 / 6人+2 / 9人+3)
  const teamInfo = typeof calculateTeamOverall === 'function' ? calculateTeamOverall() : { dominantTeam: '', chemistry: 0 };
  const isTeamThemeBuffed = (p.team === teamInfo.dominantTeam && teamInfo.chemistry > 0);
  const chemBonus = isTeamThemeBuffed ? teamInfo.chemistry : 0;
  const displayOvr = (p.ovr || p.baseOvr || 75) + chemBonus;

  // 渲染 OVR（若有隊套加成則顯示 +1/+2/+3 綠字提示）
  const ovrEl = document.getElementById('detailPlayerOvr');
  if (ovrEl) {
    ovrEl.innerHTML = `${displayOvr} ${isTeamThemeBuffed ? `<span class="text-emerald-400 text-xs font-black">(+${chemBonus})</span>` : ''}`;
  }
  document.getElementById('detailPlayerRealOvr').innerText = p.realOvr || p.real_ovr || p.baseOvr || '--';
  const starEl = document.getElementById('detailPlayerStars');
  if (starEl) {
    const starCount = Math.max(1, p.stars || 1);
    starEl.innerText = '★'.repeat(starCount);
  }

  // 渲染生涯榮譽與歷史累積 (Card Detail & Legacy)
  const legacyBox = document.getElementById('detailPlayerLegacy');
  if (legacyBox) {
    if (p.legacy && (p.legacy.games > 0 || p.legacy.rings > 0 || p.legacy.pts > 0 || p.legacy.seasons > 0 || (p.legacy.fmvps > 0 || p.isFmvp))) {
      document.getElementById('legacyRings').innerText = `💍 ${p.legacy.rings || 0}`;
      document.getElementById('legacyPts').innerText = `${p.legacy.pts || 0} 分`;
      document.getElementById('legacyGames').innerText = `${p.legacy.games || 0} 場`;
      document.getElementById('legacySeasons').innerText = `${p.legacy.seasons || 0} 季`;
      const fmvpEl = document.getElementById('legacyFmvps');
      if (fmvpEl) fmvpEl.innerText = `🏆 ${p.legacy.fmvps || (p.isFmvp ? 1 : 0)}`;
      legacyBox.classList.remove('hidden');
    } else {
      legacyBox.classList.add('hidden');
    }
  }

  // 渲染持有徽章列表（點擊徽章可展開說明）
  const badgeList = getPlayerBadges(p);
  const badgeContainer = document.getElementById('detailPlayerBadges');
  const descBox = document.getElementById('badgeDescBox');
  if (descBox) descBox.classList.add('hidden'); // 重開彈窗時先隱藏上次點開的說明

  if (badgeContainer) {
    if (badgeList.length > 0) {
      badgeContainer.innerHTML = badgeList.map(b => `
        <button onclick="toggleBadgeDescription('${b.name}')" type="button" 
                class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border ${b.color} shadow-sm hover:brightness-125 transition cursor-pointer">
          <span>${b.icon}</span>
          <span>${b.name}</span>
        </button>
      `).join('');
    } else {
      badgeContainer.innerHTML = `<span class="text-[10px] text-slate-500 font-mono">標準團隊輪替球員</span>`;
    }
  }

  // 渲染基礎數據 (Basic Stats)
  const basic = p.basic || {};
  const basicKeys = [
    { k: 'PTS', l: '得分' }, { k: 'DRB', l: '防守板' }, { k: 'ORB', l: '進攻板' }, { k: 'AST', l: '助攻' },
    { k: 'STL', l: '抄截' }, { k: 'BLK', l: '火鍋' }, { k: 'FG%', l: '命中率' }, { k: '3P%', l: '三分率' },
    { k: 'FT%', l: '罰球率' }, { k: 'FGA', l: '出手' }, { k: '3PA', l: '三分出手' }, { k: 'MP', l: '出賽時間' }
  ];

  const basicGrid = document.getElementById('detailBasicGrid');
  if (basicGrid) {
    if (Object.keys(basic).length > 0) {
      basicGrid.innerHTML = basicKeys.map(item => `
        <div class="bg-slate-950 p-2 rounded-xl border border-slate-800">
          <span class="text-[9px] text-slate-400 block">${item.l} (${item.k})</span>
          <span class="text-sm font-bold text-amber-300 font-mono">${basic[item.k] ?? '--'}</span>
        </div>
      `).join('');
    } else {
      basicGrid.innerHTML = `<p class="col-span-full text-slate-500 text-xs py-3 text-center">此球員暫無基礎賽季數據</p>`;
    }
  }

  // 渲染進階數據 (Advanced Stats)
  const adv = p.advanced || {};
  const advKeys = [
    { k: 'USG%', l: '球權使用率' }, { k: 'TS%', l: '真實命中率' }, { k: 'AST%', l: '助攻率' },
    { k: 'TRB%', l: '總籃板率' }, { k: 'STL%', l: '抄截率' }, { k: 'BLK%', l: '阻攻率' }
  ];

  const advGrid = document.getElementById('detailAdvGrid');
  if (advGrid) {
    if (Object.keys(adv).length > 0) {
      advGrid.innerHTML = advKeys.map(item => `
        <div class="bg-slate-950 p-2 rounded-xl border border-slate-800">
          <span class="text-[9px] text-slate-400 block">${item.l}</span>
          <span class="text-xs font-bold text-indigo-300 font-mono">${adv[item.k] ?? '--'}</span>
        </div>
      `).join('');
    } else {
      advGrid.innerHTML = `<p class="col-span-full text-slate-500 text-xs py-3 text-center">此球員暫無進階數據指標</p>`;
    }
  }

  document.getElementById('playerDetailModal').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}
/* =====================================================
   🏅 陣容徽章掃描與連攜共鳴解析器 (Lineup Badge Scanner)
===================================================== */
function analyzeLineupBadges() {
  const starters = ['PG', 'SG', 'SF', 'PF', 'C']
    .map(pos => state.startingLineup[pos])
    .filter(Boolean);

  const bench = (state.benchLineup || []).filter(Boolean);

  const starterBadgesMap = starters.map(p => ({
    player: p,
    badges: getPlayerBadges(p)
  }));

  const benchBadgesMap = bench.map(p => ({
    player: p,
    badges: getPlayerBadges(p)
  }));

  // 各專長球員名單
  const mambaPlayers = starterBadgesMap
    .filter(item => item.badges.some(b => b.name === '曼巴精神'))
    .map(item => item.player);

  const sharpshooters = starterBadgesMap
    .filter(item => item.badges.some(b => b.name === '神射手'))
    .map(item => item.player);

  const floorGenerals = starterBadgesMap
    .filter(item => item.badges.some(b => b.name === '組織大師'))
    .map(item => item.player);

  const rimProtectors = starterBadgesMap
    .filter(item => item.badges.some(b => b.name === '木桶伯' || b.name === '禁區大鎖'))
    .map(item => item.player);

  const perimeterLocks = starterBadgesMap
    .filter(item => item.badges.some(b => b.name === '外線大鎖'))
    .map(item => item.player);

  const pickpockets = starterBadgesMap
    .filter(item => item.badges.some(b => b.name === '小偷'))
    .map(item => item.player);

  const sixthMans = benchBadgesMap
    .filter(item => item.badges.some(b => b.name === '第六人'))
    .map(item => item.player);

  return {
    starters,
    bench,
    mambaPlayers,
    hasMamba: mambaPlayers.length > 0,
    sharpshooters,
    floorGenerals,
    hasFloorGeneral: floorGenerals.length > 0,
    rimProtectors,
    perimeterLocks,
    pickpockets,
    sixthMans
  };
}
function closePlayerDetailModal() {
  const modal = document.getElementById('playerDetailModal');
  if (modal) modal.classList.add('hidden');
}
function handleInventoryCardClick(cardId) {
  if (lockedRosterSlot) {
    selectCardIntoSlot(cardId);
    return;
  }
  openQuickAssignModal(cardId);
}

function getAchievementSurfaceClass(player) {
  const id = player?.activeCardBack;
  const owned = Array.isArray(player?.achievementBacks) && player.achievementBacks.some(back => back.id === id);
  return owned ? `sj-card-surface sj-surface-${id}` : '';
}

function getPlayerMoraleInfo(player) {
  const value = Math.max(-1, Math.min(1, Number(player?.morale?.value || 0)));
  if (value > 0) return { value: 1, icon: '🔥', label: '狀態火熱', className: 'text-emerald-300 bg-emerald-950/80 border-emerald-600/50' };
  if (value < 0) return { value: -1, icon: '🧊', label: '狀態不好', className: 'text-sky-300 bg-sky-950/80 border-sky-600/50' };
  return { value: 0, icon: '➖', label: '狀態普通', className: 'text-slate-400 bg-slate-900/80 border-slate-700' };
}

function renderPlayerCard(player, options = {}) {
      // 🏆 判定是否擁有 FMVP 榮譽
      const isFmvpWinner = !!player.isFmvp || (player.legacy?.fmvps > 0);
      const showFmvpSurface = isFmvpWinner && (!player.activeCardBack || player.activeCardBack === 'fmvp');

const borderClass = player.isLegend 
        ? 'silver-black-glow border-slate-200' 
        : getRarityBorder(player.rarity);

      // 榮譽標記
      const ringMark = (player.legacy?.rings > 0) ? `💍${player.legacy.rings}` : '';
      const morale = getPlayerMoraleInfo(player);
      const honorSurface = getAchievementSurfaceClass(player);

      return `
        <div onclick="handleInventoryCardClick('${player.cardId}')"
             draggable="true" 
             ondragstart="handleCardDragStart(event, '${player.cardId}')"
             class="inventory-player-card bg-slate-950 ${honorSurface} border ${borderClass} rounded-2xl p-2.5 flex flex-col justify-between text-center relative shadow-lg hover:brightness-110 active:scale-95 transition-all select-none cursor-pointer aspect-[3/4.2] overflow-hidden">
          
          <!-- 🏆 FMVP 專屬：背景斜向滿版文字矩陣 (純視覺平鋪，絕不反光暈眩) -->
          ${showFmvpSurface ? `
            <div class="fmvp-watermark-bg"></div>
            <div class="fmvp-text-pattern">
              ${Array.from({ length: 48 }).map(() => `<span>FMVP</span>`).join('')}
            </div>
          ` : ''}

          <!-- 1. 卡片頂部資訊列 (z-20 浮在底紋上方) -->
          <div class="inventory-card-header flex justify-between items-center w-full relative z-20 text-[10px] font-mono">
            <div class="flex items-center gap-1 font-bold text-slate-300">
              <span>${player.team}</span>
              <span class="text-indigo-400">${(player.positions || []).join('/')}</span>
            </div>

            <div class="inventory-card-meta flex items-center gap-1.5">
              <button onclick="showPlayerDetails(event, '${player.cardId}')" type="button" class="text-slate-400 hover:text-white p-0.5 hover:scale-125 transition" title="查看數據">👁️</button>
              ${isFmvpWinner ? `<span class="text-[8px] font-black fmvp-gold-badge text-slate-950 px-1.5 py-0.2 rounded border border-amber-200 shadow-sm">🏆 FMVP</span>` : ''}
              <span class="font-black px-1.5 py-0.2 rounded ${player.isLegend ? 'text-slate-200 bg-slate-800' : (player.rarity === 'UR' ? 'text-pink-400 bg-pink-950/60' : 'text-amber-400 bg-amber-950/60')}">
                ${player.rarity}
              </span>
            </div>
          </div>

          <!-- 2. 卡片中心：球員肖像 (浮在文字底紋上方，清晰乾淨) -->
          <div class="inventory-player-photo w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-slate-900 mx-auto my-auto relative shadow-inner z-20 border border-slate-800">
            <img src="${getPlayerImgUrl(player.nbaId)}" 
                 class="w-full h-full object-cover object-top" 
                 onerror="this.src='https://cdn.nba.com/headshots/nba/latest/1040x760/fallback.png'">
            ${options.inLineup ? `<span class="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-black text-amber-300">陣容中</span>` : ''}
          </div>

          <!-- 3. 卡片底部：姓名與數值星級 -->
          <div class="w-full relative z-20 pt-1 border-t border-slate-900/80">
            <p class="text-xs font-black text-slate-100 truncate w-full tracking-wide">${getCardDisplayName(player)}</p>
            <span class="inline-flex text-[8px] border px-1.5 py-0.5 rounded-full ${morale.className}">${morale.icon} ${morale.label}${morale.value ? ` ${morale.value > 0 ? '+' : ''}${morale.value}` : ''}</span>
            <div class="flex items-center justify-between mt-0.5 text-[11px] font-mono">
              <span class="text-amber-400 font-bold text-[9px] tracking-tighter">${'★'.repeat(player.stars || 1)}</span>
              <div class="flex items-center gap-1">
                ${ringMark ? `<span class="text-[9px] text-amber-300 font-bold">${ringMark}</span>` : ''}
                <span class="text-amber-400 font-black text-xs">OVR ${player.ovr}</span>
              </div>
            </div>
          </div>

        </div>`;
    }

/* =====================================================
   🏀 球隊陣容渲染 (同隊隊套加成即時注入卡片 OVR & 點擊鎖定換位)
===================================================== */
let lockedRosterSlot = null; // { type: 'starter' | 'bench', slot: 'PG' | 0, cardId: string, name: string, posLabel: string }
let integratedFilter = 'ALL'; // 'ALL' | 'FIT' | 'AVAILABLE'

function changeIntegratedFilter(filterType) {
  integratedFilter = filterType;
  renderRoster();
}

function cancelRosterLock() {
  lockedRosterSlot = null;
  playSound('click');
  renderRoster();
}

function handleRosterSlotClick(type, slot) {
  // 1. 若目前尚未鎖定任何槽位
  if (!lockedRosterSlot) {
    const player = (type === 'starter') ? state.startingLineup[slot] : state.benchLineup[slot];
    const posLabel = type === 'starter' ? slot : `替補 B${Number(slot) + 1}`;
    
    // 無論是已有球員或空位，都鎖定並展開整合換人/換位面板
    lockedRosterSlot = {
      type,
      slot,
      cardId: player ? player.cardId : null,
      name: player ? player.name : null,
      posLabel
    };
    integratedFilter = (type === 'starter') ? 'FIT' : 'ALL';

    playSound('click');
    triggerHaptic('medium');
    renderRoster();

    setTimeout(() => {
      document.getElementById('rosterSwapBanner')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);

    if (player) {
      showToast(`🔒 已鎖定 ${player.name} (${posLabel})！點選任一球員或空位即可互換，或從下方背包挑選換入`, "info");
    } else {
      showToast(`🎯 已選定 ${posLabel} 空位！請從下方背包挑選球員或點選現有球員放入`, "info");
    }
    return;
  }

  // 2. 若目前已鎖定槽位
  // 點擊同一個槽位 -> 取消鎖定
  if (lockedRosterSlot.type === type && String(lockedRosterSlot.slot) === String(slot)) {
    cancelRosterLock();
    showToast("已取消鎖定", "info");
    return;
  }

  // 點擊了另一個槽位（無論是先發、替補、或是空位）-> 執行互換！
  const sourceSlot = lockedRosterSlot;
  const targetSlot = { type, slot };

  const playerA = (sourceSlot.type === 'starter') ? state.startingLineup[sourceSlot.slot] : state.benchLineup[sourceSlot.slot];
  const playerB = (targetSlot.type === 'starter') ? state.startingLineup[targetSlot.slot] : state.benchLineup[targetSlot.slot];

  // 若兩邊都是空位，則直接切換選定目標
  if (!playerA && !playerB) {
    const posLabel = type === 'starter' ? slot : `替補 B${Number(slot) + 1}`;
    lockedRosterSlot = {
      type,
      slot,
      cardId: null,
      name: null,
      posLabel
    };
    integratedFilter = (type === 'starter') ? 'FIT' : 'ALL';
    renderRoster();
    return;
  }

  // 將 playerB 放入 sourceSlot
  if (sourceSlot.type === 'starter') {
    state.startingLineup[sourceSlot.slot] = playerB || null;
  } else {
    state.benchLineup[sourceSlot.slot] = playerB || null;
  }

  // 將 playerA 放入 targetSlot
  if (targetSlot.type === 'starter') {
    state.startingLineup[targetSlot.slot] = playerA || null;
  } else {
    state.benchLineup[targetSlot.slot] = playerA || null;
  }

  const sourcePosName = sourceSlot.type === 'starter' ? sourceSlot.slot : `替補 B${Number(sourceSlot.slot) + 1}`;
  const targetPosName = targetSlot.type === 'starter' ? targetSlot.slot : `替補 B${Number(targetSlot.slot) + 1}`;

  playSound('cardFlip');
  triggerHaptic('heavy');

  if (playerA && playerB) {
    showToast(`🔄 互換成功！${playerA.name} (${targetPosName}) ⇄ ${playerB.name} (${sourcePosName})`, "success");
  } else if (playerA) {
    showToast(`➡️ 已將 ${playerA.name} 調至 ${targetPosName}！`, "success");
  } else if (playerB) {
    showToast(`➡️ 已將 ${playerB.name} 調至 ${sourcePosName}！`, "success");
  }

  lockedRosterSlot = null;
  saveGame();
  renderAll();
}

function renderRoster() {
  const positions = ['PG', 'SG', 'SF', 'PF', 'C'];
  const starContainer = document.getElementById('rosterStarters');
  const benchContainer = document.getElementById('rosterBench');

  // 先計算全隊化學反應隊伍與加成數值 (3人+1 / 6人+2 / 9人+3)
  const teamInfo = calculateTeamOverall();
  const dominantTeam = teamInfo.dominantTeam;
  const chemBonus = teamInfo.chemistry;

  const hasMentorOnBench = state.benchLineup.some(p => p && p.isMentor);

  // 渲染動態換位鎖定橫幅與整合球員背包
  const swapBanner = document.getElementById('rosterSwapBanner');
  if (swapBanner) {
    if (lockedRosterSlot) {
      const lockedPlayer = lockedRosterSlot.type === 'starter' 
        ? state.startingLineup[lockedRosterSlot.slot] 
        : state.benchLineup[lockedRosterSlot.slot];

      // 取得背包去重最高星級卡
      let cards = getHighestStarCards();

      // 篩選：原位球員
      if (lockedRosterSlot.type === 'starter' && integratedFilter === 'FIT') {
        cards = cards.filter(c => c.positions && c.positions.includes(lockedRosterSlot.slot));
      } else if (integratedFilter === 'AVAILABLE') {
        cards = cards.filter(c => !isPlayerInRoster(c.cardId));
      }

      // 排序：適合目標位置 → 未上陣 → OVR。其他球員仍保留在最後供玩家錯位使用。
      cards.sort((a, b) => {
        const targetPosition = lockedRosterSlot.type === 'starter' ? lockedRosterSlot.slot : null;
        const aPositions = typeof getPlayerPositions === 'function' ? getPlayerPositions(a) : (a.positions || []);
        const bPositions = typeof getPlayerPositions === 'function' ? getPlayerPositions(b) : (b.positions || []);
        const aFits = !targetPosition || aPositions.includes(targetPosition);
        const bFits = !targetPosition || bPositions.includes(targetPosition);
        if (aFits !== bFits) return aFits ? -1 : 1;
        const aAvailable = !isPlayerInRoster(a.cardId);
        const bAvailable = !isPlayerInRoster(b.cardId);
        if (aAvailable !== bAvailable) return aAvailable ? -1 : 1;
        return Number(b.ovr || b.baseOvr || 0) - Number(a.ovr || a.baseOvr || 0);
      });

      const slotName = lockedRosterSlot.posLabel;

      swapBanner.className = "mb-4 block animate-modal-in";
      swapBanner.innerHTML = `
        <div class="bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/90 border-2 border-amber-400 rounded-3xl p-3.5 sm:p-4 shadow-[0_0_30px_rgba(245,158,11,0.25)] space-y-3">
          
          <!-- 1. 鎖定提示資訊列 (含已鎖定球員、位置標籤、眼睛查看按鈕、換位提示與取消鈕) -->
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-800">
            <div class="flex items-center gap-3 min-w-0">
              ${lockedPlayer ? `
                <div class="w-12 h-12 rounded-full overflow-hidden bg-slate-950 border-2 border-amber-400 flex-shrink-0 shadow-md">
                  <img src="${getPlayerImgUrl(lockedPlayer.nbaId)}" class="w-full h-full object-cover object-top" onerror="this.src='https://cdn.nba.com/headshots/nba/latest/1040x760/fallback.png'">
                </div>
              ` : `
                <div class="w-12 h-12 rounded-full bg-slate-950 border-2 border-dashed border-amber-400 flex items-center justify-center text-amber-400 text-xl font-black flex-shrink-0">
                  ➕
                </div>
              `}
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-black text-amber-300 truncate">
                    ${lockedPlayer ? `已鎖定：${lockedPlayer.name}` : `已選定槽位：${slotName}`}
                  </span>
                  <span class="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black shadow-sm">
                    ${slotName}
                  </span>
                  ${lockedPlayer ? `
                    <button onclick="showPlayerDetails(event, '${lockedPlayer.cardId}')" type="button" 
                            class="inline-flex items-center gap-1 text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 px-2.5 py-1 rounded-xl shadow transition active:scale-95 cursor-pointer" 
                            title="查看球員真實數據">
                      <span>👁️</span>
                      <span>查看數據</span>
                    </button>
                  ` : ''}
                </div>
                <p class="text-xs text-slate-300 mt-1 leading-snug">
                  👉 請點選下方任一<strong class="text-amber-300 font-bold">先發/替補球員或空位</strong>即可直接互換位置！也可以直接從下方<strong class="text-indigo-300 font-bold">球員背包</strong>點選球員換入：
                </p>
              </div>
            </div>

            <button onclick="cancelRosterLock()" type="button" 
                    class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600 text-xs font-bold transition active:scale-95 flex-shrink-0 cursor-pointer shadow flex items-center gap-1 self-end sm:self-center">
              <span>✕</span> 取消鎖定
            </button>
          </div>

          <!-- 2. 整合球員背包工具列 (篩選標籤) -->
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div class="flex items-center gap-1.5 text-xs text-amber-400 font-bold">
              <span>🎒 球員背包庫存</span>
              <span class="text-[10px] text-slate-400 font-normal font-mono">(點選任一張卡片即可直接換入 ${slotName})</span>
            </div>
            
            <div class="flex items-center gap-1.5 text-[10px] font-mono">
              <span class="text-slate-500">篩選:</span>
              <button onclick="changeIntegratedFilter('ALL')" type="button"
                      class="px-2.5 py-1 rounded-lg ${integratedFilter === 'ALL' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'} transition cursor-pointer">
                全部球員
              </button>
              ${lockedRosterSlot.type === 'starter' ? `
                <button onclick="changeIntegratedFilter('FIT')" type="button"
                        class="px-2.5 py-1 rounded-lg ${integratedFilter === 'FIT' ? 'bg-indigo-600 text-white font-bold shadow' : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'} transition cursor-pointer">
                  符合 ${lockedRosterSlot.slot}
                </button>
              ` : ''}
              <button onclick="changeIntegratedFilter('AVAILABLE')" type="button"
                      class="px-2.5 py-1 rounded-lg ${integratedFilter === 'AVAILABLE' ? 'bg-emerald-600 text-white font-bold shadow' : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'} transition cursor-pointer">
                未上陣
              </button>
            </div>
          </div>

          <!-- 3. 整合球員背包卡片網格 (不跑版、帶眼睛與上陣狀態) -->
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-[290px] overflow-y-auto p-1 custom-scrollbar">
            ${cards.length === 0 ? `
              <div class="col-span-full py-8 text-center text-xs text-slate-500 font-mono">
                背包中無符合此條件的球員
              </div>
            ` : cards.map(c => {
              let inStarterPos = null;
              for (const p of ['PG', 'SG', 'SF', 'PF', 'C']) {
                if (state.startingLineup[p]?.cardId === c.cardId) {
                  inStarterPos = p;
                  break;
                }
              }
              let inBenchIdx = -1;
              if (Array.isArray(state.benchLineup)) {
                inBenchIdx = state.benchLineup.findIndex(p => p && p.cardId === c.cardId);
              }

              const isEquippedInThisSlot = (lockedRosterSlot.type === 'starter' && lockedRosterSlot.slot === inStarterPos) ||
                                          (lockedRosterSlot.type === 'bench' && Number(lockedRosterSlot.slot) === inBenchIdx);
              const isEquippedInOtherSlot = !isEquippedInThisSlot && (inStarterPos !== null || inBenchIdx !== -1);
              const otherSlotLabel = inStarterPos ? `先發 ${inStarterPos}` : (inBenchIdx !== -1 ? `替補 B${inBenchIdx + 1}` : '');
              const candidatePositions = typeof getPlayerPositions === 'function' ? getPlayerPositions(c) : (c.positions || []);
              const isNatural = lockedRosterSlot.type === 'starter' ? candidatePositions.includes(lockedRosterSlot.slot) : true;

              let statusBadge = '';
              let borderClass = '';

              if (isEquippedInThisSlot) {
                borderClass = 'border-amber-400 bg-amber-500/15 shadow-[0_0_12px_rgba(245,158,11,0.3)]';
                statusBadge = `<span class="text-[8px] font-black text-amber-400 bg-amber-400/20 border border-amber-400/50 px-1.5 py-0.5 rounded-full whitespace-nowrap">✓ 當前</span>`;
              } else if (isEquippedInOtherSlot) {
                borderClass = 'border-amber-500/50 bg-slate-950 hover:border-amber-400';
                statusBadge = `<span class="text-[8px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-1 py-0.5 rounded whitespace-nowrap">已在 ${otherSlotLabel}</span>`;
              } else {
                borderClass = `${getRarityBorder(c.rarity)} bg-slate-950 hover:border-amber-400`;
                statusBadge = `<span class="text-[8px] text-slate-400 font-mono">換入</span>`;
              }

              return `
                <div onclick="selectCardIntoSlot('${c.cardId}')"
                     class="border ${borderClass} rounded-xl p-2 flex items-center gap-2 cursor-pointer transition active:scale-95 hover:brightness-110 relative group bg-slate-950/90 shadow">
                  
                  <div class="w-9 h-9 rounded-full overflow-hidden bg-slate-900 flex-shrink-0 border border-slate-800">
                    <img src="${getPlayerImgUrl(c.nbaId)}" class="w-full h-full object-cover object-top" onerror="this.src='https://cdn.nba.com/headshots/nba/latest/1040x760/fallback.png'">
                  </div>

                  <div class="min-w-0 flex-1 text-left">
                    <div class="flex items-center gap-1 text-[8px] font-mono leading-tight">
                      <span class="font-bold text-slate-400">${c.team}</span>
                      <span class="text-indigo-400 font-bold">${candidatePositions.join('/')}</span>
                      ${!isNatural ? '<span class="text-rose-400 font-bold">-5</span>' : ''}
                    </div>
                    <p class="text-[11px] font-black text-white truncate leading-snug">${getCardDisplayName(c)}</p>
                    <div class="team-v2-candidate-placement">${otherSlotLabel ? `目前：${otherSlotLabel}` : '目前：未上陣'} · 可打：${candidatePositions.join('/')}</div>
                    <div class="text-[9px] font-mono text-amber-400 font-bold leading-tight">OVR ${c.ovr}</div>
                  </div>

                  <div class="flex flex-col items-end gap-1 flex-shrink-0">
                    <button onclick="showPlayerDetails(event, '${c.cardId}')" type="button" 
                            class="text-slate-400 hover:text-white p-0.5 hover:scale-125 transition cursor-pointer text-xs" title="查看球員真實數據">
                      👁️
                    </button>
                    ${statusBadge}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

        </div>
      `;
    } else {
      swapBanner.className = "hidden";
      swapBanner.innerHTML = "";
    }
  }

  // --- 1. 先發五人陣容 ---
  starContainer.innerHTML = positions.map(pos => {
    const player = state.startingLineup[pos];
    const isThisLocked = lockedRosterSlot && lockedRosterSlot.type === 'starter' && lockedRosterSlot.slot === pos;
    const hasOtherLocked = lockedRosterSlot && !isThisLocked;

    if (!player) {
      if (hasOtherLocked) {
        return `
          <div onclick="handleRosterSlotClick('starter', '${pos}')" 
               class="bg-amber-500/10 border-2 border-dashed border-amber-400 hover:bg-amber-500/20 rounded-2xl p-2.5 flex flex-col items-center justify-between text-center min-h-[160px] transition cursor-pointer active:scale-95 group shadow-[0_0_15px_rgba(245,158,11,0.25)] animate-pulse">
            <span class="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-900 text-amber-400 font-mono">${pos}</span>
            <div class="my-auto flex flex-col items-center gap-1 text-amber-300 transition">
              <span class="text-2xl animate-bounce">⤵️</span>
              <span class="text-[11px] font-black text-amber-300">移至 ${pos}</span>
            </div>
            <span class="text-[9px] text-amber-400 font-mono font-bold">點擊放入</span>
          </div>`;
      }
      return `
        <div onclick="handleRosterSlotClick('starter', '${pos}')" 
             class="bg-slate-950/60 border-2 border-dashed border-slate-700 hover:border-amber-400 rounded-2xl p-2.5 flex flex-col items-center justify-between text-center min-h-[160px] transition cursor-pointer active:scale-95 group">
          <span class="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-900 text-amber-400 font-mono">${pos}</span>
          <div class="my-auto flex flex-col items-center gap-1 text-slate-500 group-hover:text-amber-300 transition">
            <span class="text-xl">➕</span>
            <span class="text-[10px] font-bold">選擇 ${pos}</span>
          </div>
          <span class="text-[9px] text-slate-600 font-mono">點擊選卡</span>
        </div>`;
    }

    const naturalPos = player.positions.includes(pos);
    const isProtectedByMentor = !naturalPos && player.isRookie && hasMentorOnBench;
    const isOOP = !naturalPos && !isProtectedByMentor;
    
    // 💡 判斷是否為隊套所屬球隊，並計算即時動態 OVR
    const isTeamThemeBuffed = (player.team === dominantTeam && chemBonus > 0);
    const playerChemAdd = isTeamThemeBuffed ? chemBonus : 0;
    const baseCardOvr = player.ovr || player.baseOvr;
    const morale = getPlayerMoraleInfo(player);
    const honorSurface = getAchievementSurfaceClass(player);
    const effectiveOvr = (baseCardOvr + playerChemAdd + morale.value) - (isOOP ? 5 : 0);

    const isFmvpWinner = !!player.isFmvp || (player.legacy?.fmvps > 0);
    const rings = player.legacy?.rings || 0;

    let borderClass = '';
    let lockBadge = '';
    let bottomActionText = '';

    if (isThisLocked) {
      borderClass = 'border-2 border-amber-400 ring-4 ring-amber-400/50 shadow-[0_0_25px_rgba(245,158,11,0.7)] scale-[1.03] z-20';
      lockBadge = `<span class="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 whitespace-nowrap animate-pulse">🔒 鎖定中 (點此取消)</span>`;
      bottomActionText = `<div class="w-full mt-1"><span class="text-[8px] font-bold text-amber-300 bg-slate-900/90 px-1.5 py-0.2 rounded border border-amber-400/40">點自己取消</span></div>`;
    } else if (hasOtherLocked) {
      borderClass = 'border-2 border-dashed border-indigo-400/90 hover:border-amber-400 hover:scale-[1.02] shadow-[0_0_15px_rgba(99,102,241,0.35)] transition cursor-pointer';
      bottomActionText = `<div class="w-full mt-1"><span class="text-[8px] font-black text-amber-300 bg-indigo-950/90 border border-indigo-500/60 px-1.5 py-0.2 rounded flex items-center justify-center gap-0.5 shadow">⇄ 點擊互換</span></div>`;
    } else {
      borderClass = isOOP 
        ? 'border-2 border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]' 
        : (player.isLegend ? 'silver-black-glow border-slate-200' : getRarityBorder(player.rarity));
      bottomActionText = `<div class="w-full mt-0.5 flex justify-between items-center text-[8px] text-slate-400 font-mono"><span class="text-amber-400/90 font-bold">🔒點擊鎖定</span><span>換位</span></div>`;
    }

    return `
      <div onclick="handleRosterSlotClick('starter', '${pos}')"
           class="bg-slate-950 ${honorSurface} border ${borderClass} rounded-2xl p-2 flex flex-col items-center justify-between text-center min-h-[160px] cursor-pointer active:scale-95 transition relative select-none hover:brightness-110 overflow-hidden">
        
        ${lockBadge}

        <!-- 頂部資訊 -->
        <div class="flex justify-between w-full items-center text-[10px] font-mono">
          <div class="flex items-center gap-1">
            <span class="font-black px-1.5 py-0.2 rounded bg-slate-900 text-amber-400">${pos}</span>
            ${isFmvpWinner ? `<span class="text-[8px] font-black bg-amber-400 text-slate-950 px-1 rounded shadow-sm">🏆FMVP</span>` : ''}
            ${rings > 0 ? `<span class="text-[8px] text-amber-300 font-bold">💍${rings}</span>` : ''}
          </div>
          <div class="flex items-center gap-1">
            <button onclick="event.stopPropagation(); removeStarter('${pos}');" type="button" class="text-slate-500 hover:text-rose-400 p-0.5 transition cursor-pointer" title="卸下">✕</button>
          </div>
        </div>

        <!-- 球員頭像 -->
        <div class="w-12 h-12 rounded-full overflow-hidden bg-slate-900 my-1 pointer-events-none border border-slate-800">
          <img src="${getPlayerImgUrl(player.nbaId)}" class="w-full h-full object-cover object-top" onerror="this.src='https://cdn.nba.com/headshots/nba/latest/1040x760/fallback.png'">
        </div>

        <!-- 球員姓名與 OVR 加成展示 -->
        <div class="pointer-events-none w-full">
          <p class="font-bold text-[11px] text-white truncate w-full">${getCardDisplayName(player)}</p>
          <div class="team-v2-position-readout">
            <span>目前：先發 ${pos}</span>
            <span>可打：${typeof formatPlayerPositions === 'function' ? formatPlayerPositions(player) : (player.positions || []).join('/')}</span>
            ${isOOP ? '<strong>⚠ 錯位 -5 OVR</strong>' : ''}
          </div>
          <span class="inline-flex text-[8px] border px-1.5 py-0.5 rounded-full ${morale.className}">${morale.icon} ${morale.label}</span>
          <div class="flex items-center justify-center gap-1 text-[10px] font-mono font-bold mt-0.5">
            <span class="text-amber-400 text-[9px] tracking-tighter">${'★'.repeat(player.stars || 1)}</span>
            <span class="${isOOP ? 'text-rose-400' : (isTeamThemeBuffed ? 'text-emerald-400' : 'text-amber-400')}">
              OVR ${effectiveOvr}
            </span>
            ${isTeamThemeBuffed ? `<span class="text-[9px] text-emerald-400 font-black font-mono">(+${chemBonus})</span>` : ''}
          </div>
        </div>

        ${bottomActionText}
      </div>`;
  }).join('');

  // --- 2. 替補六人陣容 ---
  benchContainer.innerHTML = state.benchLineup.map((player, idx) => {
    const isThisLocked = lockedRosterSlot && lockedRosterSlot.type === 'bench' && Number(lockedRosterSlot.slot) === idx;
    const hasOtherLocked = lockedRosterSlot && !isThisLocked;

    if (!player) {
      if (hasOtherLocked) {
        return `
          <div onclick="handleRosterSlotClick('bench', ${idx})" 
               class="bg-amber-500/10 border-2 border-dashed border-amber-400 hover:bg-amber-500/20 rounded-xl p-2 flex flex-col items-center justify-between text-center min-h-[140px] transition cursor-pointer active:scale-95 group shadow-[0_0_12px_rgba(245,158,11,0.25)] animate-pulse">
            <span class="text-[9px] text-amber-400 font-mono font-bold">B${idx+1}</span>
            <div class="my-auto flex flex-col items-center gap-1 text-amber-300 transition">
              <span class="text-xl animate-bounce">⤵️</span>
              <span class="text-[10px] font-black">移至替補</span>
            </div>
            <span class="text-[8px] text-amber-400 font-mono">點擊放入</span>
          </div>`;
      }
      return `
        <div onclick="handleRosterSlotClick('bench', ${idx})" 
             class="bg-slate-950/40 border-2 border-dashed border-slate-800 hover:border-indigo-400 rounded-xl p-2 flex flex-col items-center justify-between text-center min-h-[140px] transition cursor-pointer active:scale-95 group">
          <span class="text-[9px] text-slate-500 font-mono">B${idx+1}</span>
          <div class="my-auto flex flex-col items-center gap-1 text-slate-600 group-hover:text-indigo-300 transition">
            <span class="text-lg">➕</span>
            <span class="text-[9px]">替補</span>
          </div>
          <span class="text-[8px] text-slate-700">空</span>
        </div>`;
    }

    let borderClass = '';
    let lockBadge = '';
    let bottomActionText = '';

    if (isThisLocked) {
      borderClass = 'border-2 border-amber-400 ring-4 ring-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.7)] scale-[1.03] z-20';
      lockBadge = `<span class="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 text-[8px] font-black px-1.5 py-0.2 rounded-full shadow-md whitespace-nowrap animate-pulse">🔒 鎖定</span>`;
      bottomActionText = `<div class="w-full mt-0.5"><span class="text-[7px] font-bold text-amber-300 bg-slate-900 px-1 rounded border border-amber-400/40">點自己取消</span></div>`;
    } else if (hasOtherLocked) {
      borderClass = 'border-2 border-dashed border-indigo-400/90 hover:border-amber-400 hover:scale-[1.02] shadow-[0_0_12px_rgba(99,102,241,0.3)] transition cursor-pointer';
      bottomActionText = `<div class="w-full mt-0.5"><span class="text-[7px] font-black text-amber-300 bg-indigo-950 border border-indigo-500/50 px-1 rounded flex items-center justify-center gap-0.5 shadow">⇄ 點此互換</span></div>`;
    } else {
      borderClass = player.isLegend ? 'silver-black-glow border-slate-200' : getRarityBorder(player.rarity);
      bottomActionText = `<div class="w-full mt-0.5 flex justify-between items-center text-[7px] text-slate-400 font-mono"><span class="text-amber-400/90 font-bold">🔒點擊鎖定</span><span>換位</span></div>`;
    }

    const isFmvpWinner = !!player.isFmvp || (player.legacy?.fmvps > 0);
    const rings = player.legacy?.rings || 0;
    const morale = getPlayerMoraleInfo(player);
    const honorSurface = getAchievementSurfaceClass(player);

    // 💡 替補同隊球員一樣享受隊套加成
    const isTeamThemeBuffed = (player.team === dominantTeam && chemBonus > 0);
    const effectiveOvr = (player.ovr || player.baseOvr) + (isTeamThemeBuffed ? chemBonus : 0) + morale.value;

    return `
      <div onclick="handleRosterSlotClick('bench', ${idx})" 
           class="bg-slate-950/80 ${honorSurface} border ${borderClass} rounded-xl p-1.5 flex flex-col items-center justify-between text-center min-h-[140px] cursor-pointer active:scale-95 transition select-none hover:brightness-110 relative overflow-hidden">
        
        ${lockBadge}

        <div class="flex justify-between w-full items-center text-[9px] text-slate-500 font-mono">
          <div class="flex items-center gap-1">
            <span>B${idx+1}</span>
            ${isFmvpWinner ? `<span class="text-[7px] font-black bg-amber-400 text-slate-950 px-1 rounded">FMVP</span>` : ''}
            ${rings > 0 ? `<span class="text-[8px] text-amber-300 font-bold">💍${rings}</span>` : ''}
          </div>
          <div class="flex items-center gap-1">
            <button onclick="event.stopPropagation(); removeBench(${idx});" type="button" class="text-slate-500 hover:text-rose-400 p-0.5 transition cursor-pointer" title="卸下">✕</button>
          </div>
        </div>
        
        <div class="w-9 h-9 rounded-full overflow-hidden pointer-events-none bg-slate-900 my-0.5 border border-slate-800">
          <img src="${getPlayerImgUrl(player.nbaId)}" class="w-full h-full object-cover object-top" onerror="this.src='https://cdn.nba.com/headshots/nba/latest/1040x760/fallback.png'">
        </div>
        
        <div class="pointer-events-none w-full">
          <p class="text-[10px] text-slate-200 truncate w-full font-bold">${getCardDisplayName(player)}</p>
          <div class="team-v2-position-readout team-v2-position-readout--bench">
            <span>目前：替補 B${idx + 1}</span>
            <span>可打：${typeof formatPlayerPositions === 'function' ? formatPlayerPositions(player) : (player.positions || []).join('/')}</span>
          </div>
          <span class="inline-flex text-[7px] border px-1 py-0.5 rounded-full ${morale.className}">${morale.icon} ${morale.label}</span>
          <div class="flex items-center justify-center gap-1 text-[9px] font-mono mt-0.5">
            <span class="text-amber-400 text-[8px] tracking-tighter">${'★'.repeat(player.stars || 1)}</span>
            <span class="${isTeamThemeBuffed ? 'text-emerald-400 font-black' : 'text-amber-400 font-bold'}">
              OVR ${effectiveOvr}
            </span>
            ${isTeamThemeBuffed ? `<span class="text-[8px] text-emerald-400 font-bold">(+${chemBonus})</span>` : ''}
          </div>
        </div>
        
        ${bottomActionText}
      </div>`;
  }).join('');

  document.getElementById('teamOvrBadge').innerText = teamInfo.filled === 11 
    ? `OVR ${teamInfo.overall}` 
    : `OVR ${teamInfo.overall} (${teamInfo.filled}/11)`;
}
   function renderInventory() {
      const container = document.getElementById('cardInventory');
      const sorted = getSortedInventory();
      document.getElementById('inventoryCount').innerText = `${state.inventory.length} 張`;
      if (sorted.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-xs text-slate-500 py-8">背包無球員</p>`;
        return;
      }
      container.innerHTML = sorted.map(p => renderPlayerCard(p, { inLineup: isPlayerInRoster(p.cardId) })).join('');
    }
// 計算並更新千字庫解鎖進度條
function updateVocabProgressBar() {
  const list = state.toeic.vocabList || [];
  const totalDbCount = (typeof TOEIC_1000_RAW !== 'undefined' && TOEIC_1000_RAW.length > 0)
    ? TOEIC_1000_RAW.length
    : 1000;

  const unlockedCount = list.length;
  const percent = Math.min(100, Math.round((unlockedCount / totalDbCount) * 100));

  let b1 = 0, b2 = 0, b3 = 0;
  list.forEach(w => {
    if (w.box === 3) b3++;
    else if (w.box === 2) b2++;
    else b1++;
  });

  const barEl = document.getElementById('vocabProgressBar');
  const pctEl = document.getElementById('vocabProgressPercent');
  const unlEl = document.getElementById('vocabStatUnlocked');
  const b1El = document.getElementById('vocabStatBox1');
  const b2El = document.getElementById('vocabStatBox2');
  const b3El = document.getElementById('vocabStatBox3');

  if (barEl) barEl.style.width = `${percent}%`;
  if (pctEl) pctEl.innerText = `${percent}%`;
  if (unlEl) unlEl.innerText = `${unlockedCount} / ${totalDbCount}`;
  if (b1El) b1El.innerText = b1;
  if (b2El) b2El.innerText = b2;
  if (b3El) b3El.innerText = b3;
}
    let vocabListSortMode = 'recent';
    let vocabRandomOrder = [];

    function vocabDisplayKey(item) {
      return item?.id != null ? `id:${item.id}` : `word:${String(item?.word || '').trim().toLowerCase()}`;
    }

    function shuffleVocabItems(items) {
      const shuffled = [...items];
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
      }
      return shuffled;
    }

    function getVocabListForDisplay() {
      const source = [...(state.toeic.vocabList || [])];
      if (vocabListSortMode === 'az') {
        return source.sort((a, b) => String(a?.word || '').localeCompare(String(b?.word || ''), 'en', { sensitivity: 'base' }));
      }
      if (vocabListSortMode !== 'random') return source;

      const currentKeys = source.map(vocabDisplayKey);
      const currentKeySet = new Set(currentKeys);
      const orderIsCurrent = vocabRandomOrder.length === currentKeys.length
        && vocabRandomOrder.every(key => currentKeySet.has(key));
      if (!orderIsCurrent) vocabRandomOrder = shuffleVocabItems(source).map(vocabDisplayKey);
      const order = new Map(vocabRandomOrder.map((key, index) => [key, index]));
      return source.sort((a, b) => (order.get(vocabDisplayKey(a)) ?? source.length) - (order.get(vocabDisplayKey(b)) ?? source.length));
    }

    function changeVocabListSort(mode) {
      vocabListSortMode = ['recent', 'az', 'random'].includes(mode) ? mode : 'recent';
      if (vocabListSortMode === 'random') vocabRandomOrder = shuffleVocabItems(state.toeic.vocabList || []).map(vocabDisplayKey);
      const reshuffleButton = document.getElementById('reshuffleVocabListBtn');
      if (reshuffleButton) reshuffleButton.classList.toggle('hidden', vocabListSortMode !== 'random');
      renderVocabList();
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function reshuffleVocabList() {
      if (vocabListSortMode !== 'random') return;
      vocabRandomOrder = shuffleVocabItems(state.toeic.vocabList || []).map(vocabDisplayKey);
      renderVocabList();
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function renderVocabList() {
      const container = document.getElementById('vocabListContainer');
      document.getElementById('vocabTotalBadge').innerText = `${state.toeic.vocabList.length}`;
      if (state.toeic.vocabList.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500 py-4 text-center">單字庫為空</p>`;
        return;
      }
      container.innerHTML = getVocabListForDisplay().map(v => `
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex justify-between items-center text-xs">
          <div>
            <span class="font-bold text-amber-400">${v.word}</span>
<span class="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-700/50 px-1.5 py-0.5 rounded ml-2">${v.pos || 'n.'}</span>
            <span class="text-slate-300 ml-2">${v.meaning}</span>
<span class="text-[10px] font-mono font-bold bg-amber-950/50 border border-amber-800/40 px-1.5 py-0.5 rounded text-amber-400 ml-2">★${v.box || 1}</span>
          </div>
          <button onclick="deleteWord(${v.id})" class="text-slate-500 hover:text-rose-400"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
        </div>`).join('');
    }

    function renderSeasonTab() {
      const today = getTodayString();
      const btn = document.getElementById('simSeasonBtn');
      const playoffBtn = document.getElementById('playoffBtn');
      const recordText = document.getElementById('seasonRecordText');
      const streakBadge = document.getElementById('seasonStreakBadge');
      const rankText = document.getElementById('seasonRankText');
      const boxScoreSection = document.getElementById('boxScoreSection');
      const boxScoreList = document.getElementById('boxScoreLeadersList');
      const grid = document.getElementById('gameGrid');

      if (grid.children.length === 0) {
        grid.innerHTML = Array.from({ length: 82 }, (_, i) => `<div id="game-cell-${i+1}" class="h-6 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] text-slate-600">${i+1}</div>`).join('');
      }

// 🌟 檢查季後賽資格：需滿 40 勝且本賽季尚未打過季後賽
      if (state.season.lastSimWins >= 40) {
        playoffBtn.classList.remove('hidden');
        if (state.season.hasPlayedPlayoffs) {
          playoffBtn.disabled = true;
          playoffBtn.innerText = "本賽季季後賽已完賽";
          playoffBtn.className = "bg-slate-800 text-slate-500 font-bold px-4 py-2 rounded-xl text-xs cursor-not-allowed";
        } else {
          playoffBtn.disabled = false;
          playoffBtn.innerText = "進入 16 強季後賽 ➔";
          playoffBtn.className = "bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs cursor-pointer shadow-lg";
        }
      } else {
        playoffBtn.classList.add('hidden');
      }
      if (state.season.lastBoxScores && state.season.lastBoxScores.length > 0) {
        boxScoreSection.classList.remove('hidden');
        boxScoreList.innerHTML = state.season.lastBoxScores.map(b => `
          <div class="bg-slate-950 p-2 rounded-xl border border-slate-800 text-center">
            <span class="text-slate-400 text-[10px] block">${b.title}</span>
            <span class="text-amber-400 font-bold truncate block">${b.player}</span>
            <span class="text-slate-300 text-[11px]">${b.stat}</span>
          </div>`).join('');
      } else {
        boxScoreSection.classList.add('hidden');
      }

if (state.season.lastSimRecord) {
        recordText.innerText = state.season.lastSimRecord;
        streakBadge.innerText = `最長連勝: ${state.season.lastSimStreak}場`;

        const w = state.season.lastSimWins || 0;
        let calculatedRank = "分區第 8 名 (附加賽晉級)";
        if (w >= 62) calculatedRank = "分區第 1 名 👑 (聯盟龍頭)";
        else if (w >= 57) calculatedRank = "分區第 2 名 ⭐️ (爭冠種子)";
        else if (w >= 52) calculatedRank = "分區第 3 名 (前段種子)";
        else if (w >= 48) calculatedRank = "分區第 4 名 (首輪主場優勢)";
        else if (w >= 45) calculatedRank = "分區第 5 名 (季後賽保障名額)";
        else if (w >= 42) calculatedRank = "分區第 6 名 (季後賽保障名額)";
        else if (w >= 39) calculatedRank = "分區第 7 名 (附加賽晉級)";
        else if (w >= 36) calculatedRank = "分區第 8 名 (附加賽晉級)";
        else if (w >= 32) calculatedRank = "分區第 9-10 名 (附加賽落敗)";
        else calculatedRank = "分區第 11-16 名 (無緣季後賽・爭奪狀元籤)";

        if (rankText) rankText.innerText = `預估分區排名: ${calculatedRank}`;
      }

      // 只有「鎖定按鈕」才需要判斷是不是今天與管理員
      if (!state.isAdmin && state.season.lastSimDate === today && state.season.lastSimRecord) {
        btn.disabled = true;
        btn.innerText = "今日例行賽已完成";
      }
    }
/* =====================================================
       📋 DAILY QUESTS SYSTEM (每日學習任務)
    ===================================================== */
/* =====================================================
       ⑪ DAILY QUEST & LOGIN SYSTEM (每日簽到與任務)
    ===================================================== */
    function checkAndResetDailyQuests() {
      const today = getTodayString();
      if (!state.dailyQuests) {
        state.dailyQuests = {
          date: today,
          lastLoginDate: '',
          loginClaimed: false,
          wordAddedToday: 0,
          quizPerfectToday: false,
          pomodoroDoneToday: 0,
          claimed: { q1: false, q2: false, q3: false, all: false }
        };
      }

      // 檢查是否跨日
      if (state.dailyQuests.date !== today) {
        const lastDate = state.dailyQuests.lastLoginDate;
        
        // 自動計算連續登入天數 (Streak)
        if (lastDate) {
          const prev = new Date(lastDate.replace(/-/g, '/'));
          const curr = new Date(today.replace(/-/g, '/'));
          const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            state.streak = (Number(state.streak) || 1) + 1;
          } else if (diffDays > 1) {
            state.streak = 1;
          }
        } else {
          state.streak = 1;
        }

        state.dailyQuests.date = today;
        state.dailyQuests.lastLoginDate = today;
        state.dailyQuests.loginClaimed = false; // 新的一天重置領取狀態
        state.dailyQuests.wordAddedToday = 0;
        state.dailyQuests.quizPerfectToday = false;
        state.dailyQuests.pomodoroDoneToday = 0;
        state.dailyQuests.claimed = { q1: false, q2: false, q3: false, all: false };
        saveGame();
      } else if (!state.dailyQuests.lastLoginDate) {
        state.dailyQuests.lastLoginDate = today;
        if (!state.streak) state.streak = 1;
      }
    }

    // 📜 開關右下角任務卷軸
    function toggleQuestScroll() {
      const drawer = document.getElementById('questScrollDrawer');
      if (!drawer) return;
      const isHidden = drawer.classList.contains('hidden');
      if (isHidden) {
        drawer.classList.remove('hidden');
        drawer.classList.add('scroll-open');
        playSound('flip');
      } else {
        drawer.classList.add('hidden');
        drawer.classList.remove('scroll-open');
      }
    }

    // 🎁 領取每日登入 10 抽
    function claimDailyLoginReward() {
      checkAndResetDailyQuests();
      if (state.dailyQuests.loginClaimed) return;

      state.dailyQuests.loginClaimed = true;
      state.tickets += 10;

      addNotification({
        title: '🎉 每日簽到成功！',
        message: `已連續登入 ${state.streak} 天，領取每日登入好禮：🎟️ 抽卡券 +10 張！`,
        icon: '🎁',
        type: 'reward'
      });

      showRewardModal({
        title: '🎉 每日簽到成功！',
        subtitle: `已連續登入 ${state.streak} 天！維持專注習慣！`,
        rewards: [
          { icon: '🎟️', name: '每日抽卡券', amount: '+10 張' },
          { icon: '🔥', name: '連續登入天數', amount: `${state.streak} 天` }
        ]
      });

      saveGame();
      renderAll();
    }

    function renderDailyQuests() {
      checkAndResetDailyQuests();
      const q = state.dailyQuests;

      // 0. 每日登入簽到好禮卡狀態
      const loginBadge = document.getElementById('loginStreakBadge');
      const loginBtn = document.getElementById('claimDailyLoginBtn');
      if (loginBadge) loginBadge.innerText = `連續登入 ${state.streak || 1} 天 🔥`;
      if (loginBtn) {
        if (q.loginClaimed) {
          loginBtn.innerText = "✓ 今日已領";
          loginBtn.className = "bg-slate-800 text-slate-500 font-bold px-3 py-1.5 rounded-xl text-xs cursor-not-allowed";
          loginBtn.disabled = true;
        } else {
          loginBtn.innerText = "領取 10 🎟️";
          loginBtn.className = "bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-1.5 rounded-xl text-xs transition cursor-pointer shadow-lg animate-pulse";
          loginBtn.disabled = false;
        }
      }

      // 任務 1：10 個單字
      const q1Done = (q.wordAddedToday >= 10);
      const q1Text = document.getElementById('q1StatusText');
      const q1Btn = document.getElementById('q1ClaimBtn');
      if (q1Text) q1Text.innerText = `${Math.min(10, q.wordAddedToday)}/10`;
      if (q1Btn) {
        if (q.claimed.q1) {
          q1Btn.innerText = "已領取";
          q1Btn.className = "bg-slate-800 text-slate-500 font-bold px-2.5 py-1 rounded-xl text-[10px] cursor-not-allowed";
          q1Btn.disabled = true;
        } else if (q1Done) {
          q1Btn.innerText = "領取 30 💎";
          q1Btn.className = "bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-2.5 py-1 rounded-xl text-[10px] cursor-pointer shadow animate-bounce";
          q1Btn.disabled = false;
        } else {
          q1Btn.innerText = "未達成";
          q1Btn.className = "bg-slate-800 text-slate-500 font-bold px-2.5 py-1 rounded-xl text-[10px] cursor-not-allowed";
          q1Btn.disabled = true;
        }
      }

      // 任務 2：測驗滿分
      const q2Done = !!q.quizPerfectToday;
      const q2Text = document.getElementById('q2StatusText');
      const q2Btn = document.getElementById('q2ClaimBtn');
      if (q2Text) q2Text.innerText = q2Done ? "已滿分 (10/10)" : "未完成";
      if (q2Btn) {
        if (q.claimed.q2) {
          q2Btn.innerText = "已領取";
          q2Btn.className = "bg-slate-800 text-slate-500 font-bold px-2.5 py-1 rounded-xl text-[10px] cursor-not-allowed";
          q2Btn.disabled = true;
        } else if (q2Done) {
          q2Btn.innerText = "領取 30 💎";
          q2Btn.className = "bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-2.5 py-1 rounded-xl text-[10px] cursor-pointer shadow animate-bounce";
          q2Btn.disabled = false;
        } else {
          q2Btn.innerText = "未達成";
          q2Btn.className = "bg-slate-800 text-slate-500 font-bold px-2.5 py-1 rounded-xl text-[10px] cursor-not-allowed";
          q2Btn.disabled = true;
        }
      }

      // 任務 3：番茄鐘
      const q3Done = (q.pomodoroDoneToday >= 1);
      const q3Text = document.getElementById('q3StatusText');
      const q3Btn = document.getElementById('q3ClaimBtn');
      if (q3Text) q3Text.innerText = `${Math.min(1, q.pomodoroDoneToday)}/1 次`;
      if (q3Btn) {
        if (q.claimed.q3) {
          q3Btn.innerText = "已領取";
          q3Btn.className = "bg-slate-800 text-slate-500 font-bold px-2.5 py-1 rounded-xl text-[10px] cursor-not-allowed";
          q3Btn.disabled = true;
        } else if (q3Done) {
          q3Btn.innerText = "領取 40 💎";
          q3Btn.className = "bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-2.5 py-1 rounded-xl text-[10px] cursor-pointer shadow animate-bounce";
          q3Btn.disabled = false;
        } else {
          q3Btn.innerText = "未達成";
          q3Btn.className = "bg-slate-800 text-slate-500 font-bold px-2.5 py-1 rounded-xl text-[10px] cursor-not-allowed";
          q3Btn.disabled = true;
        }
      }

      // 全解判定
      const finishedCount = (q.claimed.q1 ? 1 : 0) + (q.claimed.q2 ? 1 : 0) + (q.claimed.q3 ? 1 : 0);
      const progEl = document.getElementById('questsProgressText');
      if (progEl) progEl.innerText = `進度: ${finishedCount} / 3`;

      const allBtn = document.getElementById('claimAllQuestsBtn');
      if (allBtn) {
        if (q.claimed.all) {
          allBtn.innerText = "✓ 全解已領完";
          allBtn.className = "bg-slate-800 text-slate-500 font-bold px-3 py-1 rounded-xl text-[10px] cursor-not-allowed";
          allBtn.disabled = true;
        } else if (finishedCount === 3) {
          allBtn.innerText = "🎁 領取全解 5 🎟️！";
          allBtn.className = "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 font-black px-3 py-1 rounded-xl text-[10px] cursor-pointer shadow-lg animate-pulse";
          allBtn.disabled = false;
        } else {
          allBtn.innerText = "全解送 5 🎟️ (未達成)";
          allBtn.className = "bg-slate-800 text-slate-500 font-bold px-3 py-1 rounded-xl text-[10px] cursor-not-allowed";
          allBtn.disabled = true;
        }
      }

      // 🌟 紅點提醒：未領取登入禮包或有任務獎勵可領時立即亮紅點
      const hasUnclaimed = 
        !q.loginClaimed ||
        (q1Done && !q.claimed.q1) || 
        (q2Done && !q.claimed.q2) || 
        (q3Done && !q.claimed.q3) || 
        (finishedCount === 3 && !q.claimed.all);

      const redDot = document.getElementById('scrollRedDot');
      const badgeCount = document.getElementById('scrollBadgeCount');
      if (redDot) redDot.classList.toggle('hidden', !hasUnclaimed);
      if (badgeCount) badgeCount.classList.toggle('hidden', !hasUnclaimed);
    }

    // 單項領取
    function claimQuestReward(qIndex) {
      checkAndResetDailyQuests();
      const q = state.dailyQuests;

      if (qIndex === 1 && !q.claimed.q1 && q.wordAddedToday >= 10) {
        q.claimed.q1 = true;
        state.scoutPoints = (Number(state.scoutPoints) || 0) + 30;
        showToast("🎉 達成任務 1【學習 10 個單字】！獲得 💎 選秀碎片 +30 點！", "success");
      } else if (qIndex === 2 && !q.claimed.q2 && q.quizPerfectToday) {
        q.claimed.q2 = true;
        state.scoutPoints = (Number(state.scoutPoints) || 0) + 30;
        showToast("🎉 達成任務 2【小考拿下滿分】！獲得 💎 選秀碎片 +30 點！", "success");
      } else if (qIndex === 3 && !q.claimed.q3 && q.pomodoroDoneToday >= 1) {
        q.claimed.q3 = true;
        state.scoutPoints = (Number(state.scoutPoints) || 0) + 40;
        showToast("🎉 達成任務 3【完成 1 次專注番茄鐘】！獲得 💎 選秀碎片 +40 點！", "success");
      }

      saveGame();
      renderAll();
    }

    // 全解領取 5 抽
    function claimAllQuestsBonus() {
      checkAndResetDailyQuests();
      const q = state.dailyQuests;

      if (q.claimed.q1 && q.claimed.q2 && q.claimed.q3 && !q.claimed.all) {
        q.claimed.all = true;
        state.tickets += 5;

        addNotification({
          title: '🏆 每日任務全解達成！',
          message: '今日 3 大學習與訓練目標完美全解！已領取終極獎勵 🎟️ 抽卡券 +5 張！',
          icon: '👑',
          type: 'achievement'
        });

        showRewardModal({
          title: '🏆 每日任務全數達成！',
          subtitle: '今日 3 大學習與訓練目標完美達標！',
          rewards: [
            { icon: '🎟️', name: '全解終極獎勵', amount: '+5 張抽卡券' }
          ]
        });

        saveGame();
        renderAll();
      }
    }
    function renderAll() {
      const adminBadge = document.getElementById('adminBadge');
      if (state.isAdmin) {
        adminBadge.classList.remove('hidden');
        document.getElementById('ticketCount').innerText = "無限";
        document.getElementById('seasonLimitTip').innerText = "⚡ ADMIN 模式：82 場模擬無次數限制";
      } else {
        adminBadge.classList.add('hidden');
        document.getElementById('ticketCount').innerText = state.tickets;
        document.getElementById('seasonLimitTip').innerText = "每日限挑戰 1 次 ｜ 82-GAME SIMULATION";
      }

      document.getElementById('streakCount').innerText = state.streak;
      document.getElementById('scoutPointsCount').innerText = state.scoutPoints;
      document.getElementById('sortSelector').value = state.currentInventorySort;
      const filters = state.inventoryFilters || { position: 'ALL', team: 'ALL', rarity: 'ALL' };
      const positionFilter = document.getElementById('filterPosition');
      const teamFilter = document.getElementById('filterTeam');
      const rarityFilter = document.getElementById('filterRarity');
      if (positionFilter) positionFilter.value = filters.position || 'ALL';
      if (teamFilter) teamFilter.value = filters.team || 'ALL';
      if (rarityFilter) rarityFilter.value = filters.rarity || 'ALL';

      const ringCount = Array.isArray(state.championshipRings) ? state.championshipRings.length : 0;
      const headerRingsEl = document.getElementById('headerRingsCount');
      if (headerRingsEl) headerRingsEl.innerText = ringCount;

      saveGame();
      renderRoster();
      renderInventory();
      renderVocabList();
      renderWrongAnswerBook();
      updateQuizCard();
updateVocabProgressBar();
      renderSeasonTab();
renderStudyCalendar();
renderDailyQuests();
renderScoreTrendChart();
      if (typeof window.renderStudyPlanner === 'function') window.renderStudyPlanner();
      lucide.createIcons();
    }

    function changeSortField(field) {
      state.currentInventorySort = field;
      renderAll();
    }

    function toggleSortOrder() {
      const current = state.inventorySortOrder || 'desc';
      state.inventorySortOrder = (current === 'desc') ? 'asc' : 'desc';
      const btn = document.getElementById('sortOrderBtn');
      if (btn) btn.innerText = state.inventorySortOrder === 'asc' ? '↑ 升序' : '↓ 降序';
      renderAll();
    }

    function changeFilter(type, value) {
      if (!state.inventoryFilters) {
        state.inventoryFilters = { position: 'ALL', team: 'ALL', rarity: 'ALL' };
      }
      if (type === 'pos') state.inventoryFilters.position = value;
      if (type === 'team') state.inventoryFilters.team = value;
      if (type === 'rarity') state.inventoryFilters.rarity = value;
      renderAll();
    }

    function switchTab(tabKey) {
      if (state.focusMode?.active && !['stats', 'planner', 'vocab'].includes(tabKey)) {
        showToast('🛡️ 專注模式中，只能使用專注、行事曆與單字學習。', 'warning');
        showFocusModePanel();
        return false;
      }
playSound('click');
      document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
      document.getElementById(`tab-${tabKey}`).classList.remove('hidden');
      document.querySelectorAll('.nav-tab').forEach(btn => {
        const isCurrent = btn.getAttribute('data-target') === tabKey;
        btn.className = `nav-tab flex flex-col items-center gap-1 text-[10px] ${isCurrent ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`;
      });
      lucide.createIcons();
    }

    /* =====================================================
       圖鑑、兌換碼、單字與番茄鐘
    ===================================================== */
    function openBinderModal() {
      const container = document.getElementById('binderTeamGrid');
      container.innerHTML = ALL_30_TEAMS.map(teamCode => {
        const teamPool = TEAM_DATA[teamCode] || [];
        const owned = state.inventory.filter(p => p.team === teamCode && getCardEdition(p) === '26');
        const hasChemistry = owned.length >= 3;
        const isMastered = owned.length >= 15;
        const hasClaimed = state.claimedTeamRewards.includes(teamCode);

        return `
          <div class="bg-slate-900 border ${isMastered ? 'border-amber-400 gold-glow' : (hasChemistry ? 'border-amber-400/70' : 'border-slate-800')} rounded-2xl p-3 flex flex-col justify-between text-center relative">
            <div class="flex justify-between items-center text-[10px] font-mono border-b border-slate-800/80 pb-1.5 mb-2">
              <span class="font-black text-amber-400 text-sm tracking-wider">${teamCode}</span>
              <span class="${isMastered ? 'text-amber-300 font-bold' : (hasChemistry ? 'text-amber-400' : 'text-slate-400')}">${owned.length} / 15 ${isMastered ? '👑' : ''}</span>
            </div>
            <div class="grid grid-cols-5 gap-1.5 my-1">
              ${teamPool.map(player => {
                const userHas = state.inventory.some(p => p.name === player.name && getCardEdition(p) === '26');
                return `<div class="w-8 h-8 rounded-full overflow-hidden border ${userHas ? 'border-amber-400 opacity-100' : 'border-slate-800 opacity-20 grayscale'} bg-slate-950 mx-auto"><img src="${getPlayerImgUrl(player.id)}" class="w-full h-full object-cover object-top" onerror="this.src='https://cdn.nba.com/headshots/nba/latest/1040x760/fallback.png'"></div>`;
              }).join('')}
            </div>
            <div class="mt-2 pt-1 border-t border-slate-800/50 flex justify-between items-center text-[9px] font-mono">
              <span class="${hasChemistry ? 'text-emerald-400 font-bold' : 'text-slate-500'}">${hasChemistry ? '🔥 化學反應 +1' : '未達 3 人'}</span>
              ${isMastered ? `<button onclick="claimTeamMasterReward('${teamCode}')" class="${hasClaimed ? 'bg-slate-800 text-slate-500' : 'bg-amber-500 text-black font-bold'} px-2 py-0.5 rounded transition">${hasClaimed ? '已領取' : '制霸領10🎟️'}</button>` : ''}
            </div>
          </div>`;
      }).join('');
      document.getElementById('binderModal').classList.remove('hidden');
      lucide.createIcons();
    }
    function closeBinderModal() { document.getElementById('binderModal').classList.add('hidden'); }

    function claimTeamMasterReward(teamCode) {
      if (state.claimedTeamRewards.includes(teamCode)) return;
      state.claimedTeamRewards.push(teamCode);
      state.tickets += 10;

      addNotification({
        title: `🏆 ${teamCode} 隊史制霸成就！`,
        message: `成功集齊 ${teamCode} 全隊球員卡，獲得 10 張抽卡券！`,
        icon: '👑',
        type: 'achievement'
      });

      showRewardModal({
        title: '🏆 隊史制霸成就達成！',
        subtitle: `恭喜集齊【${teamCode}】全隊 15 位現役與傳奇球星！`,
        rewards: [
          { icon: '🎟️', name: '隊史制霸大禮', amount: '+10 張抽卡券' },
          { icon: '👑', name: `${teamCode} 榮譽隊徽`, amount: '已解鎖' }
        ]
      });

      saveGame();
      renderAll();
      openBinderModal();
    }

    function openPlayoffBracketModal() {
      // 已開始的季後賽必須可以重新打開；Bracket 由存檔恢復，避免關閉或重整後消失。
      const restored = restorePlayoffJourney();
      if (state.season.hasPlayedPlayoffs && !restored) {
        showGameAlert({
          title: '季後賽額度已用畢',
          message: '⚠️ 這是舊版賽季紀錄，沒有可恢復的對戰表。請開啟下一季後再挑戰。',
          type: 'info'
        });
        return;
      }

      if (!restored) initPlayoffTeams();
      renderPlayoffBracket();
      document.getElementById('playoffBracketModal').classList.remove('hidden');
      lucide.createIcons();
    }
    function closePlayoffBracketModal() { document.getElementById('playoffBracketModal').classList.add('hidden'); }

    function openRedeemModal() { document.getElementById('redeemModal').classList.remove('hidden'); document.getElementById('redeemInput').value = ''; }
    function closeRedeemModal() { document.getElementById('redeemModal').classList.add('hidden'); }
    function submitRedeemCode() {
      const input = document.getElementById('redeemInput').value.trim().toLowerCase();
      if (!input) return;
      if (input === '082431') {
        state.isAdmin = true; state.tickets = 999999; state.scoutPoints = 999999;
        adminUnlockAllPlayers();
        closeRedeemModal();
        showToast("管理員測試權限已啟用！全隊解鎖，無限抽卡與碎片！", "success");
        saveGame();
        renderAll();
        return;
      }
      if (input === 'songray16') {
        state.tickets += 100;
        state.redeemedCodes.push('songray16');
        closeRedeemModal();
        showRewardModal({
          title: '🎉 兌換成功！',
          subtitle: '成功使用專屬兌換碼：songray16',
          rewards: [
            { icon: '🎟️', name: '特典抽卡券', amount: '+100 張' }
          ]
        });
        saveGame();
        renderAll();
      } else {
        showToast("❌ 兌換碼無效或已被使用！", "error");
      }
    }

    function ensureFocusState() {
      const timerApi = window.ToeicQuestFocusTimer;
      if (!state.focusMode || typeof state.focusMode !== 'object') state.focusMode = {};
      const focus = state.focusMode;
      const legacyContinuousPomodoro = state.pomodoro && Object.prototype.hasOwnProperty.call(state.pomodoro, 'rewardedIntervals');
      if (legacyContinuousPomodoro && focus.trackingVersion !== 2) {
        focus.sessionId = state.pomodoro.sessionId || createFocusSessionId();
        focus.status = state.pomodoro.status === 'running' ? 'running' : (state.pomodoro.status === 'paused' ? 'paused' : 'idle');
        focus.sessionStartAt = focus.status === 'running' ? state.pomodoro.sessionStartAt : null;
        focus.pausedAccumulatedMs = Math.max(0, Number(state.pomodoro.pausedAccumulatedMs) || 0);
        focus.rewardedIntervals = Math.max(0, Math.floor(Number(state.pomodoro.rewardedIntervals) || 0));
        state.pomodoro = timerApi.reset();
      }
      focus.trackingVersion = 2;
      state.pomodoro = timerApi.normalize(state.pomodoro);
      focus.active = !!focus.active;
      focus.totalFocusedMs = Math.max(0, Number(focus.totalFocusedMs) || 0);
      focus.dailyDate = typeof focus.dailyDate === 'string' ? focus.dailyDate : '';
      focus.dailyFocusedMs = Math.max(0, Number(focus.dailyFocusedMs) || 0);
      focus.rewardsDate = typeof focus.rewardsDate === 'string' ? focus.rewardsDate : '';
      focus.rewardsClaimedToday = Math.max(0, Number(focus.rewardsClaimedToday) || 0);
      focus.rewardCountsByDate = focus.rewardCountsByDate && typeof focus.rewardCountsByDate === 'object' ? focus.rewardCountsByDate : {};
      if (focus.rewardsDate && focus.rewardCountsByDate[focus.rewardsDate] == null) {
        focus.rewardCountsByDate[focus.rewardsDate] = focus.rewardsClaimedToday;
      }
      focus.rewardedSessionIds = Array.isArray(focus.rewardedSessionIds) ? focus.rewardedSessionIds.slice(-100) : [];
      focus.dailyRewardCap = 20;
      focus.sessionId = typeof focus.sessionId === 'string' ? focus.sessionId : '';
      focus.status = ['idle', 'running', 'paused'].includes(focus.status) ? focus.status : 'idle';
      focus.sessionStartAt = focus.status === 'running' ? (Number(focus.sessionStartAt) || Date.now()) : null;
      focus.pausedAccumulatedMs = Math.max(0, Number(focus.pausedAccumulatedMs) || 0);
      focus.rewardedIntervals = Math.max(0, Math.floor(Number(focus.rewardedIntervals) || 0));
      focus.taskId = focus.taskId ? String(focus.taskId) : null;
      focus.subject = typeof focus.subject === 'string' ? focus.subject : '';
      focus.plannedMinutes = Math.max(0, Number(focus.plannedMinutes) || 0);
      focus.plannerStartAt = Number(focus.plannerStartAt) || null;
      focus.taskType = typeof focus.taskType === 'string' ? focus.taskType : 'study';
      resetDailyFocusCounters();
    }

    function resetDailyFocusCounters() {
      const today = getTodayString();
      const focus = state.focusMode;
      if (focus.dailyDate !== today) {
        focus.dailyDate = today;
        focus.dailyFocusedMs = 0;
      }
      if (focus.rewardsDate !== today) {
        focus.rewardsDate = today;
        focus.rewardsClaimedToday = Math.max(0, Number(focus.rewardCountsByDate?.[today]) || 0);
      }
    }

    function createFocusSessionId(now = Date.now()) {
      return `focus_${now}_${Math.random().toString(36).slice(2, 10)}`;
    }

    function formatTimerMs(milliseconds, rounding = 'floor') {
      const round = rounding === 'ceil' ? Math.ceil : Math.floor;
      const totalSeconds = Math.max(0, round(milliseconds / 1000));
      const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
      const secs = (totalSeconds % 60).toString().padStart(2, '0');
      return `${mins}:${secs}`;
    }

    function getDateStringAt(timestamp) {
      const d = new Date(timestamp);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    function startPomodoroUiTicker() {
      if (pomodoroInterval) return;
      pomodoroInterval = setInterval(syncPomodoroFromClock, 1000);
    }

    function stopPomodoroUiTicker() {
      if (pomodoroInterval) clearInterval(pomodoroInterval);
      pomodoroInterval = null;
    }

    async function getFocusServiceWorkerRegistration() {
      if (!('serviceWorker' in navigator)) return null;
      try {
        return await navigator.serviceWorker.register('./sw.js', { scope: './' });
      } catch (error) {
        console.warn('Focus service worker unavailable:', error);
        return null;
      }
    }

    async function showFocusSystemNotification(title, body) {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      try {
        const registration = await getFocusServiceWorkerRegistration();
        if (registration?.showNotification) {
          await registration.showNotification(title, {
            body,
            icon: './assets/icons/toeicquest-kobe-ios-v1.png',
            badge: './assets/icons/toeicquest-kobe-ios-v1.png',
            tag: 'toeicquest-focus',
            renotify: true,
            data: { path: './' }
          });
        } else {
          new Notification(title, { body, tag: 'toeicquest-focus' });
        }
      } catch (error) {
        console.warn('Focus notification unavailable:', error);
      }
    }

    async function clearFocusSystemNotification() {
      try {
        const registration = await getFocusServiceWorkerRegistration();
        const notifications = await registration?.getNotifications?.({ tag: 'toeicquest-focus' });
        (notifications || []).forEach(notification => notification.close());
      } catch (error) {
        console.warn('Unable to clear focus notification:', error);
      }
    }

    async function requestFocusNotificationPermission(kind = 'pomodoro', now = Date.now()) {
      if (!('Notification' in window)) return;
      try {
        const permission = Notification.permission === 'default'
          ? await Notification.requestPermission()
          : Notification.permission;
        const isPomodoro = kind === 'pomodoro';
        if (permission !== 'granted' || (isPomodoro ? state.pomodoro.status !== 'running' : state.focusMode.status !== 'running')) return;
        const remaining = isPomodoro
          ? window.ToeicQuestFocusTimer.remainingMs(state.pomodoro, now)
          : Math.max(1, 25 * 60 * 1000 - (focusElapsedMs(now) % (25 * 60 * 1000)));
        const expectedAt = new Date(now + remaining).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
        await showFocusSystemNotification(
          isPomodoro ? 'ToeicQuest 番茄鐘進行中' : 'ToeicQuest 專注模式進行中',
          isPomodoro ? `預計 ${expectedAt} 完成本次 25 分鐘倒數。` : `下一張抽獎券預計 ${expectedAt} 達成；之後每 25 分鐘繼續累積。`
        );
      } catch (error) {
        console.warn('Focus notification permission unavailable:', error);
      }
    }

    function showFocusCompletionNotification(count, continuous = false) {
      return showFocusSystemNotification(
        continuous ? 'ToeicQuest 專注獎勵' : 'ToeicQuest 番茄鐘完成',
        continuous ? `已完成 ${count} 個 25 分鐘區段，專注計時會繼續累積。` : '本次 25 分鐘番茄鐘已完成。'
      );
    }

    function focusElapsedMs(now = Date.now()) {
      const focus = state.focusMode;
      const runningMs = focus.status === 'running' && focus.sessionStartAt
        ? Math.max(0, now - focus.sessionStartAt)
        : 0;
      return focus.pausedAccumulatedMs + runningMs;
    }

    function settleFocusMilestones(now = Date.now()) {
      ensureFocusState();
      const focus = state.focusMode;
      const duration = 25 * 60 * 1000;
      const completedIntervals = Math.floor(focusElapsedMs(now) / duration);
      const alreadySettled = focus.rewardedIntervals;
      if (completedIntervals <= alreadySettled) return { completed: 0, rewarded: 0 };

      let completed = 0;
      let rewarded = 0;
      let completedToday = 0;
      const completedActivityDates = new Set();
      for (let interval = alreadySettled + 1; interval <= completedIntervals; interval += 1) {
        const msNeededInCurrentSegment = Math.max(0, interval * duration - focus.pausedAccumulatedMs);
        const achievedAt = focus.status === 'running' && focus.sessionStartAt
          ? Math.min(now, focus.sessionStartAt + msNeededInCurrentSegment)
          : now;
        const achievedDate = getDateStringAt(achievedAt);
        const completion = window.ToeicQuestFocusTimer.recordCompletion(state.focusMode, {
          sessionId: `${focus.sessionId}:interval:${interval}`,
          durationMs: duration,
          dateKey: achievedDate,
          dailyRewardCap: 20
        });
        state.focusMode = completion.focus;
        if (!completion.firstCompletion) continue;
        completed += 1;
        completedActivityDates.add(achievedDate);
        if (achievedDate === getTodayString()) completedToday += 1;
        if (completion.rewardGranted) {
          rewarded += 1;
          state.tickets = (Number(state.tickets) || 0) + 1;
        }
      }
      state.focusMode.rewardedIntervals = completedIntervals;
      resetDailyFocusCounters();

      if (completed > 0) {
        checkAndResetDailyQuests();
        state.dailyQuests.pomodoroDoneToday = (state.dailyQuests.pomodoroDoneToday || 0) + completedToday;
        state.toeic.totalListening = (Number(state.toeic.totalListening) || 0) + completed * 25;
        if (typeof window.recordStudyActivityForPlanner === 'function') {
          completedActivityDates.forEach(date => window.recordStudyActivityForPlanner(date));
        }
      }
      saveGame();
      updateTimerDisplay(now);
      renderAll();
      addNotification({
        title: '⏱️ 專注時間已自動結算！',
        message: rewarded > 0 ? `完成 ${completed * 25} 分鐘，獲得 ${rewarded} 張抽獎券；計時持續中。` : `完成 ${completed * 25} 分鐘；今日獎勵已達上限。`,
        icon: '🎯',
        type: 'system'
      });
      showToast(rewarded > 0 ? `🎟️ 專注獎勵 +${rewarded} 張抽獎券，計時持續中` : '今日專注獎勵已達 20 張上限', rewarded > 0 ? 'success' : 'info');
      showFocusCompletionNotification(completed, true);
      return { completed, rewarded };
    }

    function completePomodoro(now = Date.now()) {
      ensureFocusState();
      const timerApi = window.ToeicQuestFocusTimer;
      if (state.pomodoro.status === 'completed') return false;
      const sessionId = state.pomodoro.sessionId || createFocusSessionId(now);
      state.pomodoro.sessionId = sessionId;
      state.pomodoro = timerApi.complete(state.pomodoro, now);
      const completion = timerApi.recordCompletion(state.focusMode, {
        sessionId: `pomodoro:${sessionId}`,
        durationMs: state.pomodoro.plannedDuration,
        dateKey: getTodayString(),
        dailyRewardCap: 20
      });
      state.focusMode = completion.focus;
      if (completion.firstCompletion) {
        checkAndResetDailyQuests();
        state.dailyQuests.pomodoroDoneToday = (state.dailyQuests.pomodoroDoneToday || 0) + 1;
        state.toeic.totalListening = (Number(state.toeic.totalListening) || 0) + 25;
        if (completion.rewardGranted) state.tickets = (Number(state.tickets) || 0) + 1;
        if (typeof window.recordPlannerFocusLog === 'function') {
          window.recordPlannerFocusLog({ title: '25 分鐘番茄鐘', type: 'study', plannedMinutes: 25, actualMinutes: 25, completedAt: new Date(now).toISOString() });
        }
      }
      saveGame();
      renderAll();
      showToast(completion.rewardGranted ? '🍅 番茄鐘完成，獲得 1 張抽獎券' : '🍅 番茄鐘完成，今日獎勵已達上限', completion.rewardGranted ? 'success' : 'info');
      showFocusCompletionNotification(1, false);
      return true;
    }

    function syncPomodoroFromClock(now = Date.now()) {
      ensureFocusState();
      const timerApi = window.ToeicQuestFocusTimer;
      if (state.pomodoro.status === 'running' && timerApi.remainingMs(state.pomodoro, now) <= 0) completePomodoro(now);
      if (state.focusMode.status === 'running') settleFocusMilestones(now);
      if (
        state.focusMode.active && state.focusMode.status === 'running' && state.focusMode.taskId
        && state.focusMode.plannedMinutes > 0
        && focusElapsedMs(now) >= state.focusMode.plannedMinutes * 60000
      ) {
        finishFocusModeSession(now, true);
        return;
      }
      updateTimerDisplay(now);
      updateFocusModeDisplay(now);
      if (state.pomodoro.status !== 'running' && state.focusMode.status !== 'running') {
        document.title = 'ToeicQuest NBA - 全能多益備戰與季後賽爭冠系統';
      }
      if (state.pomodoro.status === 'running' || state.focusMode.status === 'running') startPomodoroUiTicker();
      else stopPomodoroUiTicker();
    }

    function togglePomodoroTimer() {
      ensureFocusState();
      const timerApi = window.ToeicQuestFocusTimer;
      const now = Date.now();
      if (state.pomodoro.status === 'running') {
        if (timerApi.remainingMs(state.pomodoro, now) <= 0) {
          completePomodoro(now);
          return;
        }
        state.pomodoro = timerApi.pause(state.pomodoro, now);
        clearFocusSystemNotification();
      } else {
        if (state.pomodoro.status === 'completed' || state.pomodoro.status === 'idle') {
          state.pomodoro.sessionId = createFocusSessionId(now);
        }
        state.pomodoro = timerApi.start(state.pomodoro, now, state.pomodoro.sessionId);
        requestFocusNotificationPermission('pomodoro', now);
        startPomodoroUiTicker();
      }
      saveGame();
      renderFocusModeUi(now);
    }

    function resetPomodoroTimer() {
      if (state.pomodoro?.status === 'running' && window.ToeicQuestFocusTimer.remainingMs(state.pomodoro, Date.now()) <= 0) {
        completePomodoro(Date.now());
        return;
      }
      if (state.focusMode.status !== 'running') stopPomodoroUiTicker();
      clearFocusSystemNotification();
      state.pomodoro = window.ToeicQuestFocusTimer.reset();
      saveGame();
      renderFocusModeUi();
    }

    function updateTimerDisplay(now = Date.now()) {
      if (!state.pomodoro) return;
      const display = formatTimerMs(window.ToeicQuestFocusTimer.remainingMs(state.pomodoro, now), 'ceil');
      const timerDisplay = document.getElementById('timerDisplay');
      if (timerDisplay) timerDisplay.innerText = display;
      const running = state.pomodoro.status === 'running';
      const completed = state.pomodoro.status === 'completed';
      const buttonLabel = running ? '暫停倒數' : (completed ? '再來一輪' : (state.pomodoro.status === 'paused' ? '繼續倒數' : '開始番茄鐘'));
      const timerButton = document.getElementById('timerToggleBtn');
      if (timerButton) timerButton.innerText = buttonLabel;
      if (running) document.title = `${display} · ToeicQuest 番茄鐘`;
    }

    function updateFocusModeDisplay(now = Date.now()) {
      const display = formatTimerMs(focusElapsedMs(now));
      ['focusModeTimerDisplay', 'focusDockTimerDisplay'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.innerText = display;
      });
      const button = document.getElementById('focusOverlayTimerBtn');
      if (button) button.innerText = state.focusMode.status === 'running' ? '暫停專注計時' : '繼續專注計時';
      if (state.focusMode.status === 'running') document.title = `${display} · ToeicQuest 專注模式`;
      const subject = document.getElementById('focusModeSubject');
      if (subject) {
        subject.textContent = state.focusMode.subject
          ? `${state.focusMode.subject}${state.focusMode.plannedMinutes ? ` · ${state.focusMode.plannedMinutes} MIN` : ''}`
          : '自由專注';
      }
    }

    function renderFocusModeUi(now = Date.now()) {
      ensureFocusState();
      updateTimerDisplay(now);
      updateFocusModeDisplay(now);
      const focus = state.focusMode;
      const rewardStatus = document.getElementById('focusRewardStatus');
      if (rewardStatus) rewardStatus.innerText = `今日有效學習 ${Math.floor(focus.dailyFocusedMs / 60000)} 分鐘｜獎勵 ${focus.rewardsClaimedToday} / ${focus.dailyRewardCap}`;
      const modeProgress = document.getElementById('focusModeProgress');
      if (modeProgress) modeProgress.innerText = `本次專注 ${Math.floor(focusElapsedMs(now) / 60000)} 分鐘｜今日獎勵 ${focus.rewardsClaimedToday} / ${focus.dailyRewardCap}`;
      const overlay = document.getElementById('focusModeOverlay');
      const dock = document.getElementById('focusModeDock');
      if (overlay) overlay.classList.toggle('hidden', !focus.active || isFocusPanelMinimized);
      if (dock) dock.classList.toggle('hidden', !focus.active || !isFocusPanelMinimized);
      document.body.classList.toggle('toeic-focus-mode', focus.active);
      const focusToggle = document.getElementById('focusModeToggleBtn');
      if (focusToggle) focusToggle.innerText = focus.active ? '返回專注模式' : '開啟專注模式';
    }

    function toggleFocusMode() {
      ensureFocusState();
      if (state.focusMode.active) {
        showFocusModePanel();
        return;
      }
      const now = Date.now();
      state.focusMode.active = true;
      state.focusMode.status = 'running';
      state.focusMode.sessionId = createFocusSessionId(now);
      state.focusMode.sessionStartAt = now;
      state.focusMode.pausedAccumulatedMs = 0;
      state.focusMode.rewardedIntervals = 0;
      state.focusMode.taskId = null;
      state.focusMode.subject = '';
      state.focusMode.plannedMinutes = 0;
      state.focusMode.plannerStartAt = now;
      state.focusMode.taskType = 'study';
      isFocusPanelMinimized = false;
      requestFocusNotificationPermission('focus', now);
      startPomodoroUiTicker();
      saveGame();
      renderFocusModeUi(now);
    }

    function toggleFocusTracking() {
      ensureFocusState();
      const now = Date.now();
      if (!state.focusMode.active) return;
      if (state.focusMode.status === 'running') {
        settleFocusMilestones(now);
        state.focusMode.pausedAccumulatedMs = focusElapsedMs(now);
        state.focusMode.sessionStartAt = null;
        state.focusMode.status = 'paused';
        clearFocusSystemNotification();
      } else {
        state.focusMode.status = 'running';
        state.focusMode.sessionStartAt = now;
        requestFocusNotificationPermission('focus', now);
        startPomodoroUiTicker();
      }
      saveGame();
      renderFocusModeUi(now);
    }

    function showFocusModePanel() {
      if (!state.focusMode?.active) return;
      isFocusPanelMinimized = false;
      renderFocusModeUi();
    }

    function openFocusStudy(tabKey) {
      if (!['stats', 'planner', 'vocab'].includes(tabKey)) return;
      isFocusPanelMinimized = true;
      renderFocusModeUi();
      switchTab(tabKey);
    }

    function finishFocusModeSession(now = Date.now(), plannedCompletion = false) {
      ensureFocusState();
      if (state.focusMode.status === 'running') {
        settleFocusMilestones(now);
        state.focusMode.pausedAccumulatedMs = focusElapsedMs(now);
      }
      const actualMs = Math.max(0, state.focusMode.pausedAccumulatedMs);
      const actualMinutes = Math.max(0, Math.round(actualMs / 60000));
      const linkedTask = state.focusMode.taskId ? {
        taskId: state.focusMode.taskId,
        title: state.focusMode.subject,
        type: state.focusMode.taskType,
        plannedMinutes: state.focusMode.plannedMinutes,
        startAt: state.focusMode.plannerStartAt,
        actualMinutes,
        completedAt: new Date(now).toISOString()
      } : null;
      const linkedTaskCompleted = !!linkedTask && (
        plannedCompletion
        || (linkedTask.plannedMinutes > 0 && actualMs >= linkedTask.plannedMinutes * 60000)
      );
      state.focusMode.active = false;
      state.focusMode.status = 'idle';
      state.focusMode.sessionStartAt = null;
      state.focusMode.taskId = null;
      state.focusMode.subject = '';
      state.focusMode.plannedMinutes = 0;
      state.focusMode.plannerStartAt = null;
      isFocusPanelMinimized = false;
      clearFocusSystemNotification();
      saveGame();
      renderFocusModeUi();
      if (linkedTaskCompleted && typeof window.completeStudyPlannerTaskFromFocus === 'function') {
        window.completeStudyPlannerTaskFromFocus(linkedTask);
      } else if (linkedTask && actualMs >= 60000 && typeof window.recordStudyPlannerTaskProgressFromFocus === 'function') {
        window.recordStudyPlannerTaskProgressFromFocus(linkedTask);
      } else if (actualMinutes >= 25 && typeof window.recordPlannerFocusLog === 'function') {
        window.recordPlannerFocusLog({ title: '自由專注', type: 'study', plannedMinutes: actualMinutes, actualMinutes, completedAt: new Date(now).toISOString() });
      }
      const toastMessage = linkedTaskCompleted
        ? `✓「${linkedTask.title}」專注完成`
        : linkedTask
          ? `已記錄 ${formatTimerMs(actualMs)}，行程保留為未完成。`
          : `專注模式已結束，本次專注 ${formatTimerMs(actualMs)}。`;
      showToast(toastMessage, linkedTaskCompleted ? 'success' : 'info');
    }

    function endFocusMode() {
      finishFocusModeSession(Date.now(), false);
    }

    function startFocusModeFromPlanner(taskId, title, plannedMinutes, taskType = 'study') {
      ensureFocusState();
      if (state.focusMode.active) {
        showToast('已有專注計時進行中，請先結束目前的專注。', 'warning');
        showFocusModePanel();
        return false;
      }
      const now = Date.now();
      state.focusMode.active = true;
      state.focusMode.status = 'running';
      state.focusMode.sessionId = createFocusSessionId(now);
      state.focusMode.sessionStartAt = now;
      state.focusMode.pausedAccumulatedMs = 0;
      state.focusMode.rewardedIntervals = 0;
      state.focusMode.taskId = String(taskId || '');
      state.focusMode.subject = String(title || '學習任務');
      state.focusMode.plannedMinutes = Math.max(1, Number(plannedMinutes) || 25);
      state.focusMode.plannerStartAt = now;
      state.focusMode.taskType = String(taskType || 'study');
      isFocusPanelMinimized = false;
      requestFocusNotificationPermission('focus', now);
      startPomodoroUiTicker();
      saveGame();
      renderFocusModeUi(now);
      return true;
    }

    window.startFocusModeFromPlanner = startFocusModeFromPlanner;

    function initializeFocusTimer() {
      ensureFocusState();
      getFocusServiceWorkerRegistration();
      isFocusPanelMinimized = false;
      syncPomodoroFromClock();
      renderFocusModeUi();
    }

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) syncPomodoroFromClock();
    });
    window.addEventListener('pageshow', () => syncPomodoroFromClock());
    window.addEventListener('focus', () => syncPomodoroFromClock());
    window.addEventListener('pagehide', saveGame);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeFocusTimer, { once: true });
    else initializeFocusTimer();

    function changeVocabBox(box) {
      state.toeic.selectedBoxFilter = box;
      state.toeic.currentQuizIndex = 0;
      updateQuizCard();
    }
    function getFilteredVocab() {
      if (state.toeic.selectedBoxFilter === 'all') return state.toeic.vocabList;
      const bNum = parseInt(state.toeic.selectedBoxFilter.replace('box', ''));
      return state.toeic.vocabList.filter(v => (v.box || 1) === bNum);
    }
    function getCurrentQuizWord() {
      const list = getFilteredVocab();
      if (list.length === 0) return null;
      return list[state.toeic.currentQuizIndex % list.length];
    }
function updateQuizCard() {
      const item = getCurrentQuizWord();
      const posBadge = document.getElementById('flashPosBadge');

      if (item) {
        if (posBadge) {
          posBadge.innerText = item.pos || 'n.';
          posBadge.classList.remove('hidden');
        }
        document.getElementById('flashWord').innerText = item.word;
        document.getElementById('flashMeaning').innerText = `[★${item.box || 1}] ${item.meaning}`;
        document.getElementById('flashExample').innerText = item.example ? `"${item.example}"` : "";
        document.getElementById('spellingMeaning').innerText = `[★${item.box || 1}・${item.pos || 'n.'}] ${item.meaning}`;
        document.getElementById('spellingMasked').innerText = item.word.split('').map((c, i) => (i === 0 || i === item.word.length - 1 || c === ' ') ? c : '_').join(' ');
        document.getElementById('spellingInput').value = '';
      } else {
        if (posBadge) posBadge.classList.add('hidden');
        document.getElementById('flashWord').innerText = "此複習箱暫無單字";
        document.getElementById('flashMeaning').innerText = "";
        document.getElementById('flashExample').innerText = "";
      }

      // 確保換字時，喇叭小圖示會立刻畫出來
      if (window.lucide && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
      }
    }
/* =====================================================
   🃏 單字卡 Tinder 左右滑動手勢與翻面系統
===================================================== */
let isCardSwiping = false;
let startTouchX = 0;
let startTouchY = 0;
let currentDeltaX = 0;
let currentDeltaY = 0;
let hasSwipedAway = false;

// 點擊翻面判定（排除滑動過程中的點擊）
function handleCardClick(e) {
  if (isCardSwiping || Math.abs(currentDeltaX) > 10 || Math.abs(currentDeltaY) > 10) return;
  flipCard();
}

function flipCard() {
  if (state.toeic.isSpellingMode) return;
  const meaningEl = document.getElementById('flashMeaning');
  const exampleEl = document.getElementById('flashExample');
  if (!meaningEl) return;

  isFlipped = !isFlipped;
  meaningEl.classList.toggle('hidden', !isFlipped);
  if (exampleEl) exampleEl.classList.toggle('hidden', !isFlipped);
  playSound('flip');
}

// 初始化觸控手勢監聽
function initFlashcardTouchGestures() {
  const card = document.getElementById('flashcard');
  const stampLike = document.getElementById('stampLike');
  const stampNope = document.getElementById('stampNope');
  if (!card) return;

  card.addEventListener('touchstart', (e) => {
    if (state.toeic.isSpellingMode) return;
    const touch = e.touches[0];
    startTouchX = touch.clientX;
    startTouchY = touch.clientY;
    currentDeltaX = 0;
    currentDeltaY = 0;
    hasSwipedAway = false;
    isCardSwiping = false;

    card.classList.remove('card-swipe-smooth');
    card.classList.add('card-swipe-active');
  }, { passive: true });

  card.addEventListener('touchmove', (e) => {
    if (state.toeic.isSpellingMode || hasSwipedAway) return;
    const touch = e.touches[0];
    currentDeltaX = touch.clientX - startTouchX;
    currentDeltaY = touch.clientY - startTouchY;

    if (Math.abs(currentDeltaX) > 8 || Math.abs(currentDeltaY) > 8) {
      isCardSwiping = true;
    }

    // 左右跟手旋轉位移
    const rotation = currentDeltaX * 0.08;
    card.style.transform = `translate3d(${currentDeltaX}px, ${currentDeltaY * 0.3}px, 0) rotate(${rotation}deg)`;

    // 浮水印即時淡入
    if (currentDeltaX > 25) {
      const op = Math.min(1, (currentDeltaX - 25) / 60);
      if (stampLike) stampLike.style.opacity = op;
      if (stampNope) stampNope.style.opacity = 0;
    } else if (currentDeltaX < -25) {
      const op = Math.min(1, (Math.abs(currentDeltaX) - 25) / 60);
      if (stampNope) stampNope.style.opacity = op;
      if (stampLike) stampLike.style.opacity = 0;
    } else {
      if (stampLike) stampLike.style.opacity = 0;
      if (stampNope) stampNope.style.opacity = 0;
    }
  }, { passive: true });

  card.addEventListener('touchend', () => {
    if (state.toeic.isSpellingMode || hasSwipedAway) return;

    card.classList.remove('card-swipe-active');
    card.classList.add('card-swipe-smooth');

    const thresholdX = 85; // 左右滑動觸發門檻 (px)
    const thresholdY = -65; // 向上滑動翻面門檻 (px)

    // 1. 向上滑動 -> 快速翻面看中文
    if (currentDeltaY < thresholdY && Math.abs(currentDeltaX) < 50) {
      resetCardPos();
      flipCard();
      return;
    }

    // 2. 向右滑動 -> 記住了 ✅
    if (currentDeltaX > thresholdX) {
      hasSwipedAway = true;
      card.style.transform = `translate3d(120vw, ${currentDeltaY}px, 0) rotate(25deg)`;
      card.style.opacity = '0';
      if (stampLike) stampLike.style.opacity = 1;
      setTimeout(() => {
        answerQuiz(true);
        resetCardPos();
      }, 200);
      return;
    }

    // 3. 向左滑動 -> 不熟 ❌
    if (currentDeltaX < -thresholdX) {
      hasSwipedAway = true;
      card.style.transform = `translate3d(-120vw, ${currentDeltaY}px, 0) rotate(-25deg)`;
      card.style.opacity = '0';
      if (stampNope) stampNope.style.opacity = 1;
      setTimeout(() => {
        answerQuiz(false);
        resetCardPos();
      }, 200);
      return;
    }

    // 未達門檻，彈回原位
    resetCardPos();
  });

  function resetCardPos() {
    card.style.transform = '';
    card.style.opacity = '';
    if (stampLike) stampLike.style.opacity = 0;
    if (stampNope) stampNope.style.opacity = 0;
    currentDeltaX = 0;
    currentDeltaY = 0;
    setTimeout(() => { isCardSwiping = false; }, 80);
  }
}

// 頁面載入後自動註冊觸控監聽
document.addEventListener('DOMContentLoaded', () => {
  initFlashcardTouchGestures();
});
setTimeout(initFlashcardTouchGestures, 500);

function checkSpellingAnswer() {
  const item = getCurrentQuizWord();
  if (!item) return;
  const ans = document.getElementById('spellingInput').value.trim().toLowerCase();
  if (ans === item.word.toLowerCase()) {
    playSound('correct');
    confetti({ particleCount: 30, spread: 50 });
    showToast("拼字完全正確！太棒了！", "success");
    answerQuiz(true);
  } else {
    playSound('buzz');
    showToast(`答錯囉！正確拼法是：${item.word}`, "error");
    answerQuiz(false);
  }
}
/* =====================================================
       📱 手機陀螺儀 (DeviceOrientation) Prizm 反光連動
    ===================================================== */
    function initGyroRefractorEffect() {
      // 支援手機傾斜感測 (iOS / Android)
      if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', (e) => {
          // gamma: 左右傾斜 (-90 ~ 90), beta: 前後傾斜 (-180 ~ 180)
          const gamma = e.gamma || 0;
          const beta = e.beta || 0;

          // 換算成卡片折射背景坐標 (0% ~ 100%)
          const xPercent = Math.max(0, Math.min(100, ((gamma + 45) / 90) * 100));
          const yPercent = Math.max(0, Math.min(100, ((beta - 20) / 90) * 100));
          const angle = Math.round(100 + (gamma * 1.5));

          document.documentElement.style.setProperty('--foil-x', `${xPercent}%`);
          document.documentElement.style.setProperty('--foil-y', `${yPercent}%`);
          document.documentElement.style.setProperty('--glare-x', `${xPercent}%`);
          document.documentElement.style.setProperty('--glare-y', `${yPercent}%`);
          document.documentElement.style.setProperty('--reflector-angle', `${angle}deg`);
        }, { passive: true });
      }

      // 電腦滑鼠懸停時也有光澤移動效果
      window.addEventListener('mousemove', (e) => {
        const xPercent = (e.clientX / window.innerWidth) * 100;
        const yPercent = (e.clientY / window.innerHeight) * 100;
        document.documentElement.style.setProperty('--foil-x', `${xPercent}%`);
        document.documentElement.style.setProperty('--foil-y', `${yPercent}%`);
        document.documentElement.style.setProperty('--glare-x', `${xPercent}%`);
        document.documentElement.style.setProperty('--glare-y', `${yPercent}%`);
      }, { passive: true });
    }

    // 啟動監聽
    initGyroRefractorEffect();
    function answerQuiz(isCorrect) {
      const item = getCurrentQuizWord();
      if (!item) return;
      if (isCorrect) {
        playSound('correct'); // 👈 新增：記住了專屬清亮音效
        item.box = Math.min((item.box || 1) + 1, 3);
        state.toeic.quizStreak++;
        // 累加總答對次數
        state.toeic.totalMastered = (state.toeic.totalMastered || 0) + 1;
      } else {
        playSound('buzz'); // 👈 新增：單字不熟降回 ★1 提示音
        item.box = 1;
        state.toeic.quizStreak = 0;
      }

      // 介面顯示目前進度
      document.getElementById('quizStreakIndicator').innerText = `累積: ${state.toeic.totalMastered || 0}/100 ｜ 連對: ${state.toeic.quizStreak}`;

      // 達到累積 100 題門檻觸發 ON FIRE
      if ((state.toeic.totalMastered || 0) >= 100) {
        document.getElementById('onFireBadge').classList.remove('hidden');
        if (state.toeic.totalMastered === 100) {
          addNotification({
            title: '🔥 全隊進入 ON FIRE 狀態！',
            message: '達成累積背誦 100 單字！全隊球員 OVR 永久獲得 +2 加成！',
            icon: '🔥',
            type: 'achievement'
          });
          showRewardModal({
            title: '🔥 全隊 ON FIRE 啟動！',
            subtitle: '達成累積精熟背誦 100 個多益必考單字里程碑！',
            rewards: [
              { icon: '🔥', name: '全隊戰力狂飆', amount: '全隊 OVR +2' },
              { icon: '🧠', name: '單字精熟大師', amount: '100 字達標' }
            ]
          });
        }
      }
      isFlipped = false;
      document.getElementById('flashMeaning').classList.add('hidden');
      document.getElementById('flashExample').classList.add('hidden');
      state.toeic.currentQuizIndex++;
      saveGame();
      renderAll();
    }
    function speakEnglishText(text) {
      if (!text) return;
      if (!('speechSynthesis' in window)) {
        showToast("⚠️ 您的瀏覽器不支援語音朗讀功能！", "warning");
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.88;
      window.speechSynthesis.speak(utterance);
    }

    function speakWord(e) {
      if (e) {
        e.stopPropagation(); // 阻止事件冒泡，避免點發音按鈕時同時觸發翻卡
      }

      const item = getCurrentQuizWord();
      if (!item || !item.word) return;
      speakEnglishText(item.word);
    }
    function toggleQuizMode() {
      state.toeic.isSpellingMode = !state.toeic.isSpellingMode;
      document.getElementById('quizModeBtn').innerText = `模式: ${state.toeic.isSpellingMode ? '拼字填空' : '翻卡'}`;
      document.getElementById('flashcardContent').classList.toggle('hidden', state.toeic.isSpellingMode);
      document.getElementById('spellingContent').classList.toggle('hidden', !state.toeic.isSpellingMode);
      updateQuizCard();
    }
    function addWord(e) {
      e.preventDefault();
      const word = document.getElementById('inputWord').value.trim();
      const pos = document.getElementById('inputPos').value;
      const meaning = document.getElementById('inputMeaning').value.trim();
      const example = document.getElementById('inputExample').value.trim();
      if (!word || !meaning) return;

      // 1. 新增至單字庫
      state.toeic.vocabList.unshift({
        id: Date.now(),
        word,
        pos,
        meaning,
        example,
        box: 1,
        sourceType: 'manual'
      });

      // 2. 鼓勵手動學習：新增 1 個單字獎勵 1 點選秀碎片 (scoutPoints)
      state.scoutPoints = (Number(state.scoutPoints) || 0) + 1;
      checkAndResetDailyQuests();
      state.dailyQuests.wordAddedToday = (state.dailyQuests.wordAddedToday || 0) + 1;

      // 3. 重設表單與存檔更新
      document.getElementById('addWordForm').reset();
      saveGame();
      updateVocabProgressBar();
      renderAll();

      // 4. 回饋效果
      playSound('flip');
      showToast(`🎉 成功新增單字【${word}】！獲得 💎 選秀碎片 +1 點！`, "success");
    }    async function deleteWord(id) {
      const item = (state.toeic.vocabList || []).find(v => v.id === id);
      if (!item) {
        showToast('⚠️ 找不到這個單字，可能已被刪除。', 'warning');
        return;
      }

      const confirmed = await showGameConfirm({
        title: '🗑️ 刪除單字',
        message: `確定要從單字庫刪除「${item.word}」嗎？`,
        confirmText: '確定刪除',
        cancelText: '保留單字',
        type: 'danger'
      });
      if (!confirmed) return;

      state.toeic.vocabList = state.toeic.vocabList.filter(v => v.id !== id);
      saveGame();
      updateVocabProgressBar();
      renderAll();
      showToast(`已刪除單字「${item.word}」`, 'success');
    }


    function addFiveRandomWords() {
      checkAndResetDailyQuests();

      // 1. 取得千字庫（優先抓取全域變數，若無則降級為預設詞庫）
      let rawDb = [];
      if (typeof TOEIC_1000_RAW !== 'undefined' && Array.isArray(TOEIC_1000_RAW) && TOEIC_1000_RAW.length > 0) {
        rawDb = TOEIC_1000_RAW;
      } else if (typeof TOEIC_WORDS !== 'undefined' && Array.isArray(TOEIC_WORDS)) {
        rawDb = TOEIC_WORDS;
      } else {
        showToast("⚠️ 未偵測到 toeic1000.js 單字庫，請確認腳本是否正確載入！", "warning");
        return;
      }

      // 2. 標準化資料格式（自動相容「二維陣列」或「物件陣列」）
      const normalizedDb = rawDb.map((item, idx) => {
        if (Array.isArray(item)) {
          return {
            word: String(item[0] || '').trim(),
            pos: String(item[1] || 'n.').trim(),
            meaning: String(item[2] || '').trim(),
            example: String(item[3] || '').trim()
          };
        } else if (typeof item === 'object' && item !== null) {
          return {
            word: String(item.word || '').trim(),
            pos: String(item.pos || 'n.').trim(),
            meaning: String(item.meaning || '').trim(),
            example: String(item.example || '').trim()
          };
        }
        return null;
      }).filter(item => item && item.word && item.meaning);

      if (normalizedDb.length === 0) {
        showToast("⚠️ 單字庫資料為空或格式不符！", "warning");
        return;
      }

      // 3. 取得目前已擁有的單字小寫集合，避免重複抽取
      const ownedSet = new Set((state.toeic.vocabList || []).map(v => (v.word || '').toLowerCase()));

      // 4. 篩選出未學習的生詞
      let unlearned = normalizedDb.filter(item => !ownedSet.has(item.word.toLowerCase()));

      // 若已全部抽完，重置候選池
      if (unlearned.length === 0) {
        unlearned = [...normalizedDb];
      }

      // 5. 隨機打亂並抽取 5 個
      unlearned.sort(() => Math.random() - 0.5);
      const picked = unlearned.slice(0, 5);

      // 6. 規範化寫入玩家單字庫（保證欄位完全對齊）
      picked.forEach(item => {
        state.toeic.vocabList.unshift({
          id: Date.now() + Math.floor(Math.random() * 100000),
          word: item.word,
          pos: item.pos,
          meaning: item.meaning,
          example: item.example,
          box: 1,
          sourceType: 'official'
        });
      });

      // 7. 更新每日任務進度、存檔並刷新 UI
      state.dailyQuests.wordAddedToday = (state.dailyQuests.wordAddedToday || 0) + picked.length;
      saveGame();
      renderAll();

      playSound('flip');
      showToast(`🎉 成功抽取 5 個多益高頻單字入庫！`, "success");
    }
    /* =====================================================
       📝 10 題四選一測驗邏輯
    ===================================================== */
    let activeQuizList = [];
    let currentQuizStep = 0;
    let quizScore = 0;
    let isQuizAnswering = false;
    let quizSessionMode = 'all';
    let sessionWrongAnswers = [];
    const ENDLESS_QUESTION_MS = 5000;
    let endlessTimerId = null;
    let endlessDeadlineAt = 0;
    let endlessTicketsEarned = 0;
    let endlessRunEnded = false;
    let quizAdvanceTimerId = null;
    let quizPlannerTaskId = null;
    let quizSessionId = '';
    let quizSessionFinished = true;
    let quizAnswers = [];
    let quizQuestionShownAt = 0;
    let quizElapsedMs = 0;
    let endlessStartingBest = 0;
    let endlessSourceMode = 'all';

    function beginQuizLearningSession(taskId = null) {
      quizPlannerTaskId = taskId;
      quizSessionId = `quiz_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      quizSessionFinished = false;
      quizAnswers = [];
      quizElapsedMs = 0;
    }

    function recordQuizLearningResult(status = 'completed') {
      if (quizSessionFinished) return null;
      quizSessionFinished = true;
      return window.VocabLearning?.recordSession({
        id: quizSessionId, mode: quizSessionMode, status, score: quizScore,
        totalQuestions: quizAnswers.length, answers: quizAnswers, taskId: quizPlannerTaskId,
        sourceMode: quizSessionMode === 'endless' ? endlessSourceMode : '',
        actualMinutes: quizElapsedMs / 60000
      }) || null;
    }

    function recordQuizLearningAnswer(current, chosen, correct) {
      quizElapsedMs += Math.min(quizSessionMode === 'endless' ? ENDLESS_QUESTION_MS : 120000, Math.max(0, Date.now() - quizQuestionShownAt));
      quizAnswers.push({ ...normalizeQuizItem(current), chosen, correct });
    }

    function clearEndlessQuizTimers() {
      if (endlessTimerId) window.clearInterval(endlessTimerId);
      if (quizAdvanceTimerId) window.clearTimeout(quizAdvanceTimerId);
      endlessTimerId = null;
      quizAdvanceTimerId = null;
      endlessDeadlineAt = 0;
    }

    function setEndlessUiVisible(visible) {
      document.getElementById('endlessQuizHud')?.classList.toggle('hidden', !visible);
      document.getElementById('quizProgressBar')?.classList.remove('endless-timer-danger');
      if (!visible) document.getElementById('endlessResultOverlay')?.classList.add('hidden');
    }

    function updateEndlessRewardHud() {
      const rewardEl = document.getElementById('endlessRewardText');
      const bestEl = document.getElementById('endlessBestText');
      if (rewardEl) rewardEl.innerText = `${quizScore} 💎 · ${endlessTicketsEarned} 🎟️`;
      if (bestEl) bestEl.innerText = `${Math.max(Number(state.toeic.endlessBest) || 0, quizScore)} 關`;
    }

    function startEndlessQuestionTimer() {
      if (quizSessionMode !== 'endless' || endlessRunEnded) return;
      if (endlessTimerId) window.clearInterval(endlessTimerId);
      endlessDeadlineAt = Date.now() + ENDLESS_QUESTION_MS;
      const timerText = document.getElementById('endlessTimerText');
      const progress = document.getElementById('quizProgressBar');
      const update = () => {
        const remaining = Math.max(0, endlessDeadlineAt - Date.now());
        if (timerText) timerText.innerText = (remaining / 1000).toFixed(1);
        if (progress) {
          progress.style.width = `${(remaining / ENDLESS_QUESTION_MS) * 100}%`;
          progress.classList.toggle('endless-timer-danger', remaining <= 1800);
        }
        if (remaining <= 0) handleEndlessTimeout();
      };
      update();
      endlessTimerId = window.setInterval(update, 50);
    }

    function refillEndlessQuizPool() {
      const previousWord = activeQuizList[currentQuizStep - 1]?.word || '';
      activeQuizList = shuffleVocabItems(getEndlessVocabPool(endlessSourceMode)).map(normalizeQuizItem);
      if (activeQuizList.length > 1 && activeQuizList[0].word === previousWord) {
        [activeQuizList[0], activeQuizList[1]] = [activeQuizList[1], activeQuizList[0]];
      }
      currentQuizStep = 0;
    }

    function normalizeQuizItem(item) {
      if (Array.isArray(item)) {
        return {
          word: String(item[0] || '').trim(),
          pos: String(item[1] || 'n.').trim(),
          meaning: String(item[2] || '').trim(),
          example: String(item[3] || '').trim()
        };
      }
      return {
        word: String(item?.word || '').trim(),
        pos: String(item?.pos || 'n.').trim(),
        meaning: String(item?.meaning || '').trim(),
        example: String(item?.example || '').trim()
      };
    }

    function buildCombinedVocabQuizPool(officialSource = null, playerSource = null) {
      const official = officialSource || ((typeof TOEIC_1000_RAW !== 'undefined' && Array.isArray(TOEIC_1000_RAW)) ? TOEIC_1000_RAW : []);
      const playerWords = playerSource || (state.toeic.vocabList || []);
      const deduplicated = new Map();
      [...official, ...playerWords].forEach(rawItem => {
        const item = normalizeQuizItem(rawItem);
        const key = item.word.toLocaleLowerCase('en-US');
        if (!key || !item.meaning || deduplicated.has(key)) return;
        deduplicated.set(key, item);
      });
      return [...deduplicated.values()];
    }

    function buildManualVocabQuizPool(playerSource = null) {
      const playerWords = playerSource == null ? (state.toeic.vocabList || []) : playerSource;
      const deduplicated = new Map();
      playerWords.forEach(rawItem => {
        const item = normalizeQuizItem(rawItem);
        const key = item.word.toLocaleLowerCase('en-US');
        if (!key || !item.meaning || deduplicated.has(key)) return;
        deduplicated.set(key, item);
      });
      return [...deduplicated.values()];
    }

    function getEndlessVocabPool(sourceMode = 'all') {
      return sourceMode === 'manual' ? buildManualVocabQuizPool() : buildCombinedVocabQuizPool();
    }

    function openEndlessVocabSourcePicker() {
      const allCount = getEndlessVocabPool('all').length;
      const manualCount = getEndlessVocabPool('manual').length;
      const allCountEl = document.getElementById('endlessAllWordCount');
      const manualCountEl = document.getElementById('endlessManualWordCount');
      const manualButton = document.getElementById('endlessManualSourceBtn');
      const manualNote = document.getElementById('endlessManualSourceNote');
      if (allCountEl) allCountEl.innerText = `${allCount} 字`;
      if (manualCountEl) manualCountEl.innerText = `${manualCount} 字`;
      if (manualButton) {
        manualButton.disabled = manualCount < 4;
        manualButton.classList.toggle('is-disabled', manualCount < 4);
      }
      if (manualNote) manualNote.innerText = manualCount < 4 ? `自建單字需要至少 4 個，目前 ${manualCount} 個。` : '';
      document.getElementById('endlessSourcePicker')?.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }

    function closeEndlessVocabSourcePicker() {
      document.getElementById('endlessSourcePicker')?.classList.add('hidden');
      document.body.style.overflow = '';
    }

    function ensureWrongAnswerStore() {
      if (!Array.isArray(state.toeic.wrongAnswers)) state.toeic.wrongAnswers = [];
      return state.toeic.wrongAnswers;
    }

    function recordWrongAnswer(item, chosen) {
      const store = ensureWrongAnswerStore();
      const key = String(item.word || '').trim().toLowerCase();
      let record = store.find(entry => String(entry.word || '').trim().toLowerCase() === key);
      if (!record) {
        record = { ...normalizeQuizItem(item), wrongCount: 0, correctStreak: 0, lastWrongAt: '', lastChosen: '' };
        store.unshift(record);
      }
      record.wrongCount = (Number(record.wrongCount) || 0) + 1;
      record.correctStreak = 0;
      record.lastWrongAt = new Date().toISOString();
      record.lastChosen = chosen;
      if (!sessionWrongAnswers.some(entry => String(entry.word).toLowerCase() === key)) {
        sessionWrongAnswers.push({ ...normalizeQuizItem(item), chosen });
      }
    }

    function recordCorrectReview(item) {
      const store = ensureWrongAnswerStore();
      const key = String(item.word || '').trim().toLowerCase();
      const index = store.findIndex(entry => String(entry.word || '').trim().toLowerCase() === key);
      if (index < 0) return;
      store[index].correctStreak = (Number(store[index].correctStreak) || 0) + 1;
      if (store[index].correctStreak >= 2) store.splice(index, 1);
    }

    function renderWrongAnswerBook() {
      const countEl = document.getElementById('wrongAnswerCount');
      const listEl = document.getElementById('wrongAnswerList');
      const startBtn = document.getElementById('startWrongAnswerQuizBtn');
      if (!countEl || !listEl || !startBtn || !state?.toeic) return;

      const items = ensureWrongAnswerStore()
        .slice()
        .sort((a, b) => (Number(b.wrongCount) || 0) - (Number(a.wrongCount) || 0));
      countEl.innerText = `${items.length} 題`;
      startBtn.disabled = items.length === 0;

      if (items.length === 0) {
        listEl.innerHTML = `<span class="text-slate-500">目前沒有錯題，繼續保持！</span>`;
        return;
      }

      listEl.innerHTML = items.slice(0, 12).map(item => `
        <span class="inline-flex items-center gap-1 bg-slate-950 border border-rose-900/60 text-slate-300 px-2 py-1 rounded-lg">
          <strong class="text-rose-300">${escapeHtmlText(item.word)}</strong>
          <span>${escapeHtmlText(item.meaning)}</span>
          <span class="text-[9px] text-slate-500">錯 ${Number(item.wrongCount) || 1} 次・已連對 ${Number(item.correctStreak) || 0}/2</span>
        </span>
      `).join('');
    }

    function startWrongAnswerQuiz() {
      startVocabQuizModal('wrong');
    }

    // 啟動 10 題小考
    function startVocabQuizModal(mode = 'all', context = {}) {
      const fullDb = buildCombinedVocabQuizPool();
      const db = mode === 'targeted' ? buildCombinedVocabQuizPool([], context.items || []) : mode === 'wrong' ? ensureWrongAnswerStore() : fullDb;

      if (mode === 'all' && db.length < 10) {
        showToast("⚠️ 單字庫中的單字不足 10 個，請先點擊新增更多單字！", "warning");
        return;
      }
      if (mode === 'wrong' && db.length === 0) {
        showToast("🎉 目前沒有錯題需要複習！", "success");
        return;
      }

      if (mode === 'targeted' && !db.length) {
        showToast('這個行程尚無可測驗的單字。', 'warning');
        return;
      }
      if (!quizSessionFinished && quizAnswers.length) recordQuizLearningResult('quit');
      clearEndlessQuizTimers();
      quizSessionMode = mode;
      // Calendar reviews use exactly their stored word set, up to 50 words.
      const shuffledDb = shuffleVocabItems(db);
      activeQuizList = shuffledDb.slice(0, mode === 'targeted' ? 50 : Math.min(10, shuffledDb.length)).map(normalizeQuizItem);
      beginQuizLearningSession(context.taskId || null);

      currentQuizStep = 0;
      quizScore = 0;
      isQuizAnswering = false;
      sessionWrongAnswers = [];
      endlessRunEnded = false;
      setEndlessUiVisible(false);

      document.getElementById('vocabQuizModal').classList.remove('hidden');
      const modeLabel = document.getElementById('quizModeLabel');
      if (modeLabel) modeLabel.innerText = mode === 'targeted' ? 'PLANNED VOCAB REVIEW' : mode === 'wrong' ? 'WRONG ANSWER REVIEW' : 'TOEIC QUIZ';
      renderQuizStep();
    }

    function startEndlessVocabChallenge(sourceMode = 'all') {
      endlessSourceMode = sourceMode === 'manual' ? 'manual' : 'all';
      const db = getEndlessVocabPool(endlessSourceMode);
      if (db.length < 4) {
        showToast(endlessSourceMode === 'manual'
          ? `⚠️ 自建單字至少需要 4 個，目前只有 ${db.length} 個。`
          : '⚠️ 無盡挑戰至少需要 4 個不同單字。', 'warning');
        return;
      }
      closeEndlessVocabSourcePicker();
      clearEndlessQuizTimers();
      if (!quizSessionFinished && quizAnswers.length) recordQuizLearningResult('quit');
      quizSessionMode = 'endless';
      endlessStartingBest = Number(state.toeic.endlessBest) || 0;
      beginQuizLearningSession();
      activeQuizList = shuffleVocabItems(db).map(normalizeQuizItem);
      currentQuizStep = 0;
      quizScore = 0;
      endlessTicketsEarned = 0;
      endlessRunEnded = false;
      isQuizAnswering = false;
      sessionWrongAnswers = [];
      document.getElementById('vocabQuizModal').classList.remove('hidden');
      document.getElementById('endlessResultOverlay')?.classList.add('hidden');
      const modeLabel = document.getElementById('quizModeLabel');
      if (modeLabel) modeLabel.innerText = `⚡ ENDLESS · ${endlessSourceMode === 'manual' ? '自建單字' : '全部單字'} · 5 秒`;
      setEndlessUiVisible(true);
      updateEndlessRewardHud();
      renderQuizStep();
    }

    function restartEndlessVocabChallenge() {
      startEndlessVocabChallenge(endlessSourceMode);
    }

    function speakQuizWord(e) {
      if (e) e.stopPropagation();
      const item = activeQuizList[currentQuizStep];
      if (item?.word) speakEnglishText(item.word);
    }

function closeVocabQuizModal(completed = false) {
  if (!completed && !quizSessionFinished && quizAnswers.length) recordQuizLearningResult('quit');
  if (!completed) quizSessionFinished = true;
  clearEndlessQuizTimers();
  endlessRunEnded = true;
  document.getElementById('vocabQuizModal').classList.add('hidden');
}

// 渲染當前題目
function renderQuizStep() {
  if (currentQuizStep >= activeQuizList.length) {
    if (quizSessionMode === 'endless') {
      refillEndlessQuizPool();
    } else {
      finishVocabQuiz();
      return;
    }
  }

  isQuizAnswering = false;
  const current = activeQuizList[currentQuizStep];

  // 更新進度與題目
  const totalQuestions = activeQuizList.length;
  document.getElementById('quizProgressText').innerText = quizSessionMode === 'endless'
    ? `第 ${quizScore + 1} 關`
    : `第 ${currentQuizStep + 1} / ${totalQuestions} 題`;
  document.getElementById('quizProgressBar').style.width = quizSessionMode === 'endless'
    ? '100%'
    : `${((currentQuizStep + 1) / totalQuestions) * 100}%`;
  document.getElementById('quizWordPos').innerText = current.pos || 'n.';
  document.getElementById('quizQuestionWord').innerText = current.word;
  document.getElementById('quizQuestionExample').innerText = current.example ? `"${current.example}"` : '';
  const feedback = document.getElementById('quizAnswerFeedback');
  if (feedback) {
    feedback.classList.add('hidden');
    feedback.innerHTML = '';
  }

  // 產生 3 個干擾中文選項
  const allDb = quizSessionMode === 'endless' ? getEndlessVocabPool(endlessSourceMode) : buildCombinedVocabQuizPool();

  const otherMeanings = allDb
    .map(x => x.meaning)
    .filter(m => m && m !== current.meaning);

  // 隨機抽 3 個不同干擾項
  const distractors = [...new Set(otherMeanings)]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  // 正確答案 + 干擾項合併並打亂
  const options = [current.meaning, ...distractors].sort(() => Math.random() - 0.5);
  const encodeAnswer = value => encodeURIComponent(value).replace(/'/g, '%27');

  const container = document.getElementById('quizOptionsContainer');
  container.innerHTML = options.map(opt => `
    <button onclick="handleQuizAnswer(this, '${encodeAnswer(opt)}', '${encodeAnswer(current.meaning)}')"
            data-answer="${encodeAnswer(opt)}"
            type="button" 
            class="w-full text-left bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/60 p-3 rounded-2xl text-xs font-bold text-slate-200 transition flex justify-between items-center cursor-pointer">
      <span>${escapeHtmlText(opt)}</span>
      <span class="quiz-badge text-xs"></span>
    </button>
  `).join('');

  lucide.createIcons();
  quizQuestionShownAt = Date.now();
  if (quizSessionMode === 'endless') startEndlessQuestionTimer();
}

// 判定答案
function handleQuizAnswer(btn, chosenEncoded, correctEncoded) {
  if (isQuizAnswering) return;
  // The interval is only visual. This guard makes a tap after the real five-second
  // deadline lose even if Safari delayed the visual timer while in the background.
  if (quizSessionMode === 'endless' && endlessDeadlineAt && Date.now() >= endlessDeadlineAt) {
    handleEndlessTimeout();
    return;
  }
  isQuizAnswering = true;

  const chosen = decodeURIComponent(chosenEncoded);
  const correct = decodeURIComponent(correctEncoded);
  const isCorrect = (chosen === correct);
  const current = activeQuizList[currentQuizStep];
  recordQuizLearningAnswer(current, chosen, isCorrect);
  const feedback = document.getElementById('quizAnswerFeedback');
  const allBtns = document.querySelectorAll('#quizOptionsContainer button');
  allBtns.forEach(button => { button.disabled = true; });
  if (quizSessionMode === 'endless' && endlessTimerId) {
    window.clearInterval(endlessTimerId);
    endlessTimerId = null;
  }

  // 樣式回饋：正確綠色、錯誤紅色
  if (isCorrect) {
    quizScore++;
    if (quizSessionMode === 'endless') {
      if (quizScore > (Number(state.toeic.endlessBest) || 0)) {
        state.toeic.endlessBest = quizScore;
        state.toeic.endlessBestAt = new Date().toISOString();
      }
      state.scoutPoints = (Number(state.scoutPoints) || 0) + 1;
      if (quizScore % 10 === 0) {
        const milestoneTickets = quizScore / 10;
        state.tickets = (Number(state.tickets) || 0) + milestoneTickets;
        endlessTicketsEarned += milestoneTickets;
        showToast(`🎟️ 通過第 ${quizScore} 關，里程碑獎勵 +${milestoneTickets} 張！`, 'success');
      }
      updateEndlessRewardHud();
    }
    recordCorrectReview(current);
    btn.classList.remove('bg-slate-950', 'border-slate-700');
    btn.classList.add('bg-emerald-950/80', 'border-emerald-500', 'text-emerald-300');
    btn.querySelector('.quiz-badge').innerText = '✅ 正確';
    playSound('correct');
    if (feedback) {
      feedback.className = 'mt-3 text-left bg-emerald-950/35 border border-emerald-700/50 rounded-2xl p-3 text-xs leading-relaxed text-emerald-200';
      feedback.innerHTML = `<strong>答對了！</strong> ${escapeHtmlText(current.word)}＝${escapeHtmlText(correct)}${current.example ? `<br><span class="text-slate-400">例句：${escapeHtmlText(current.example)}</span>` : ''}`;
    }
  } else {
    recordWrongAnswer(current, chosen);
    playSound('buzz');
    btn.classList.remove('bg-slate-950', 'border-slate-700');
    btn.classList.add('bg-rose-950/80', 'border-rose-500', 'text-rose-300');
    btn.querySelector('.quiz-badge').innerText = '❌ 錯誤';

    // 標出正確的選項
    allBtns.forEach(b => {
      if (decodeURIComponent(b.dataset.answer || '') === correct) {
        b.classList.remove('bg-slate-950', 'border-slate-700');
        b.classList.add('bg-emerald-950/80', 'border-emerald-500', 'text-emerald-300');
        const badge = b.querySelector('.quiz-badge');
        if (badge) badge.innerText = '✅ 正解';
      }
    });
    if (feedback) {
      feedback.className = 'mt-3 text-left bg-rose-950/35 border border-rose-700/50 rounded-2xl p-3 text-xs leading-relaxed text-rose-200';
      feedback.innerHTML = `<strong>已加入錯題本。</strong> 你選了「${escapeHtmlText(chosen)}」，正確答案是「${escapeHtmlText(correct)}」。${current.example ? `<br><span class="text-slate-400">例句：${escapeHtmlText(current.example)}</span>` : ''}`;
    }
  }

  // 累積 ON FIRE 題數
  if (isCorrect) {
    state.toeic.totalMastered = (state.toeic.totalMastered || 0) + 1;
    if (state.toeic.totalMastered >= 100) {
      document.getElementById('onFireBadge')?.classList.remove('hidden');
    }
  }

  saveGame();

  if (quizSessionMode === 'endless') {
    if (!isCorrect) {
      quizAdvanceTimerId = window.setTimeout(() => finishEndlessChallenge('wrong'), 750);
      return;
    }
    quizAdvanceTimerId = window.setTimeout(() => {
      currentQuizStep++;
      renderQuizStep();
    }, 360);
    return;
  }

  // 留出閱讀正解與例句的時間，再進入下一題
  quizAdvanceTimerId = window.setTimeout(() => {
    currentQuizStep++;
    renderQuizStep();
  }, isCorrect ? 1300 : 2200);
}

function handleEndlessTimeout() {
  if (quizSessionMode !== 'endless' || endlessRunEnded || isQuizAnswering) return;
  isQuizAnswering = true;
  if (endlessTimerId) window.clearInterval(endlessTimerId);
  endlessTimerId = null;
  const current = activeQuizList[currentQuizStep];
  if (current) {
    recordWrongAnswer(current, '逾時');
    recordQuizLearningAnswer(current, '逾時', false);
  }
  document.querySelectorAll('#quizOptionsContainer button').forEach(button => {
    button.disabled = true;
    if (decodeURIComponent(button.dataset.answer || '') === current?.meaning) {
      button.classList.remove('bg-slate-950', 'border-slate-700');
      button.classList.add('bg-emerald-950/80', 'border-emerald-500', 'text-emerald-300');
      const badge = button.querySelector('.quiz-badge');
      if (badge) badge.innerText = '✅ 正解';
    }
  });
  playSound('buzz');
  saveGame();
  quizAdvanceTimerId = window.setTimeout(() => finishEndlessChallenge('timeout'), 550);
}

function finishEndlessChallenge(reason) {
  if (endlessRunEnded) return;
  endlessRunEnded = true;
  clearEndlessQuizTimers();
  const learningResult = recordQuizLearningResult(reason);
  const previousBest = endlessStartingBest;
  const isNewBest = quizScore > previousBest;
  if (isNewBest) {
    state.toeic.endlessBest = quizScore;
    state.toeic.endlessBestAt = new Date().toISOString();
  }
  if (typeof window.recordPlannerQuizLog === 'function') {
    window.recordPlannerQuizLog({
      title: `無盡單字挑戰${endlessSourceMode === 'manual' ? ' · 自建單字' : ''}`,
      type: 'vocab',
      score: quizScore,
      totalQuestions: quizScore + 1,
      sourceType: 'vocab', actualMinutes: quizElapsedMs / 60000
    });
  }
  saveGame();
  renderAll();
  const overlay = document.getElementById('endlessResultOverlay');
  const title = document.getElementById('endlessResultTitle');
  const reasonEl = document.getElementById('endlessResultReason');
  const rewardsEl = document.getElementById('endlessResultRewards');
  if (title) title.innerText = `${isNewBest ? '🏆 新紀錄 · ' : ''}通過 ${quizScore} 關`;
  if (reasonEl) reasonEl.innerText = reason === 'timeout' ? `第 ${quizScore + 1} 關時間到` : `第 ${quizScore + 1} 關答錯了`;
  if (rewardsEl) rewardsEl.innerHTML = `
    <span><b>+${quizScore}</b> 💎 碎片</span>
    <span><b>+${endlessTicketsEarned}</b> 🎟️ 抽獎券</span>
    <span><b>${Math.max(previousBest, quizScore)}</b> 🏁 最高關卡</span>
  `;
  overlay?.classList.remove('hidden');
  window.VocabLearning?.renderResultActions('endlessResultStudyActions', learningResult);
}

// 測驗結束結算
function finishVocabQuiz() {
  if (quizSessionFinished) return;
  const learningResult = recordQuizLearningResult();
  closeVocabQuizModal(true);

  const totalQuestions = activeQuizList.length;
  const accuracy = totalQuestions > 0 ? quizScore / totalQuestions : 0;
  let bonusTickets = 0;
  let bonusShards = quizScore * 2; // 每對一題得 2 點碎片

  if (totalQuestions === 10 && quizScore === 10) {
    checkAndResetDailyQuests();
    state.dailyQuests.quizPerfectToday = true; // 👈 標記今日拿下滿分！
    bonusTickets = 3; // 滿分送 3 張抽卡券
  } else if (totalQuestions >= 5 && accuracy >= 0.7) {
    bonusTickets = 1; // 至少 5 題且正確率達 70%
  }

  // 發放獎勵
  state.tickets += bonusTickets;
  state.scoutPoints = (Number(state.scoutPoints) || 0) + bonusShards;

  if (typeof window.recordPlannerQuizLog === 'function') {
    window.recordPlannerQuizLog({
      title: quizSessionMode === 'wrong' ? '錯題複習 Quiz' : '單字 Quiz',
      type: 'vocab',
      score: quizScore,
      totalQuestions,
      sourceType: 'vocab', taskId: quizPlannerTaskId, actualMinutes: quizElapsedMs / 60000
    });
  }

  saveGame();
  renderAll();

  const rewardsList = [];
  if (bonusTickets > 0) {
    rewardsList.push({ icon: '🎟️', name: '測驗抽卡券獎勵', amount: `+${bonusTickets} 張` });
  }
  if (bonusShards > 0) {
    rewardsList.push({ icon: '💎', name: '選秀碎片獎勵', amount: `+${bonusShards} 點` });
  }
  rewardsList.push({ icon: '🎯', name: '測驗最終成績', amount: `${quizScore} / ${totalQuestions} 題` });

  if (bonusTickets > 0 || bonusShards > 0) {
    addNotification({
      title: `📝 單字測驗結算（${quizScore}/${totalQuestions}）`,
      message: `獲得 🎟️ 抽卡券 +${bonusTickets} 張、💎 選秀碎片 +${bonusShards} 點！`,
      icon: '📝',
      type: 'reward'
    });
  }

  showRewardModal({
    title: quizScore === totalQuestions ? '👑 滿分通關！神級表現！' : (accuracy >= 0.7 ? '🎉 測驗大捷！成績優秀！' : '🏁 測驗完成！持續精進！'),
    subtitle: `${quizSessionMode === 'targeted' ? '行程指定單字複習' : quizSessionMode === 'wrong' ? '錯題複習' : '多益四選一測驗'}完成，答對 ${quizScore} / ${totalQuestions} 題！`,
    rewards: rewardsList,
    learningResult,
    note: sessionWrongAnswers.length
      ? `本次錯題：${sessionWrongAnswers.map(item => item.word).join('、')}。已收入錯題本，之後連續答對兩次即可畢業。`
      : '本次沒有新增錯題，繼續保持！'
  });
}
// 即時計算正確率
function calculateStudyRates() {
  const lTot = parseInt(document.getElementById('inputListenTotal')?.value) || 0;
  const lCor = parseInt(document.getElementById('inputListenCorrect')?.value) || 0;
  const rTot = parseInt(document.getElementById('inputReadTotal')?.value) || 0;
  const rCor = parseInt(document.getElementById('inputReadCorrect')?.value) || 0;

  const lRateEl = document.getElementById('listenRateText');
  const rRateEl = document.getElementById('readRateText');

  if (lRateEl) {
    if (lTot > 0) {
      const rate = Math.min(100, Math.round((lCor / lTot) * 100));
      lRateEl.innerText = `${rate}% (${lCor}/${lTot})`;
    } else {
      lRateEl.innerText = '--%';
    }
  }

  if (rRateEl) {
    if (rTot > 0) {
      const rate = Math.min(100, Math.round((rCor / rTot) * 100));
      rRateEl.innerText = `${rate}% (${rCor}/${rTot})`;
    } else {
      rRateEl.innerText = '--%';
    }
  }
}

function normalizeStudyLogDate(value) {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(value || ''));
  if (!match) return '';
  return `${match[1]}-${String(Number(match[2])).padStart(2, '0')}-${String(Number(match[3])).padStart(2, '0')}`;
}

function getStudyDetailForDate(date) {
  const details = state.studyDetails || {};
  if (details[date]) return details[date];
  const key = Object.keys(details).find(value => normalizeStudyLogDate(value) === date);
  return key ? details[key] : null;
}

// 渲染舊版打卡資料；月曆畫面已由 Study Planner 統一顯示。
function renderStudyCalendar() {
  const container = document.getElementById('studyCalendarGrid');
  const monthBadge = document.getElementById('calendarMonthBadge');
  const statusBadge = document.getElementById('todayStudyStatus');
  const checkBtn = document.getElementById('checkInBtn');
  if (!container) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayDateStr = getTodayString();
  const todayNum = now.getDate();

  if (monthBadge) monthBadge.innerText = `${year} 年 ${month + 1} 月`;

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const loggedDates = new Set((state.studyLogs || []).map(normalizeStudyLogDate).filter(Boolean));
  const isTodayLogged = loggedDates.has(todayDateStr);

  // 若今日已打卡，回填儲存的數據並鎖定輸入
  const todayDetails = getStudyDetailForDate(todayDateStr);
  if (todayDetails) {
const qNameInput = document.getElementById('inputQuizName');
  const scoreInput = document.getElementById('inputTotalScore');
  if (qNameInput && !qNameInput.value) qNameInput.value = todayDetails.quizName || '';
  if (scoreInput && !scoreInput.value) scoreInput.value = todayDetails.totalScore || '';
    const lTotInput = document.getElementById('inputListenTotal');
    const lCorInput = document.getElementById('inputListenCorrect');
    const rTotInput = document.getElementById('inputReadTotal');
    const rCorInput = document.getElementById('inputReadCorrect');
    if (lTotInput && !lTotInput.value) lTotInput.value = todayDetails.lTotal || '';
    if (lCorInput && !lCorInput.value) lCorInput.value = todayDetails.lCorrect || '';
    if (rTotInput && !rTotInput.value) rTotInput.value = todayDetails.rTotal || '';
    if (rCorInput && !rCorInput.value) rCorInput.value = todayDetails.rCorrect || '';
    calculateStudyRates();
  }

  if (statusBadge) {
    statusBadge.innerHTML = isTodayLogged
      ? `<span class="text-emerald-400 font-bold flex items-center gap-1">✅ 今日已完成紀錄</span>`
      : `<span class="text-amber-400 font-bold flex items-center gap-1">⏳ 今日尚未登錄</span>`;
  }

  if (checkBtn) {
    checkBtn.disabled = isTodayLogged && !state.isAdmin;
    if (isTodayLogged && !state.isAdmin) {
      checkBtn.className = "w-full sm:w-auto bg-slate-800 text-slate-500 font-bold px-6 py-2.5 rounded-xl text-xs cursor-not-allowed flex items-center justify-center gap-1.5";
      checkBtn.innerHTML = `<span>✓ 今日已打卡保存</span>`;
    } else {
      checkBtn.className = "w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer";
      checkBtn.innerHTML = `<i data-lucide="check-circle-2" class="w-4 h-4"></i> 保存今日紀錄並打卡 (+1 🎟️)`;
    }
  }
// 控制管理者時光機顯示
  const adminInput = document.getElementById('adminDateInput');
  if (adminInput) {
    if (state.isAdmin) {
      adminInput.classList.remove('hidden');
      // 預設帶入今天的 YYYY-MM-DD 格式
      if (!adminInput.value) {
        adminInput.value = `${year}-${String(month + 1).padStart(2, '0')}-${String(todayNum).padStart(2, '0')}`;
      }
    } else {
      adminInput.classList.add('hidden');
    }
  }
  let html = '';
  for (let i = 0; i < firstDayIndex; i++) {
    html += `<div class="aspect-square"></div>`;
  }

for (let d = 1; d <= totalDays; d++) {
  const mStr = String(month + 1).padStart(2, '0');
  const dayStr = String(d).padStart(2, '0');
  const dStr = `${year}-${mStr}-${dayStr}`; // 產出如 2026-09-20
  const isLogged = loggedDates.has(dStr);
  const isToday = (d === todayNum);
  const detail = getStudyDetailForDate(dStr);

let hoverTip = `${dStr}`;
if (detail) {
  const lRate = detail.lTotal > 0 ? Math.round((detail.lCorrect / detail.lTotal) * 100) : 0;
  const rRate = detail.rTotal > 0 ? Math.round((detail.rCorrect / detail.rTotal) * 100) : 0;
  hoverTip += `\n📝 測驗: ${detail.quizName || '日常練習'}`;
  if (detail.totalScore) hoverTip += `\n🏆 得分: ${detail.totalScore} 分`;
  hoverTip += `\n🎧 聽力: ${detail.lCorrect}/${detail.lTotal} (${lRate}%)\n📖 閱讀: ${detail.rCorrect}/${detail.rTotal} (${rRate}%)`;
} else if (isLogged) {
  hoverTip += `\n已打卡`;
}

    let circleClass = "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex flex-col items-center justify-center text-xs font-mono font-bold transition mx-auto select-none cursor-pointer ";
    if (isLogged) {
      circleClass += "bg-gradient-to-br from-amber-500 to-orange-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.5)] border border-amber-300 ";
    } else {
      circleClass += "bg-slate-900/90 text-slate-400 border border-slate-800 ";
    }
    if (isToday) {
      circleClass += "ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950 ";
    }

    html += `
      <div class="aspect-square flex items-center justify-center">
        <div class="${circleClass}" title="${hoverTip}">
          <span>${d}</span>
          ${isLogged ? '<span class="text-[8px] leading-none">🔥</span>' : ''}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  lucide.createIcons();
}

// 繪製多益模考分數走勢圖
// 繪製多益模考分數走勢圖 (精準對齊版)
function renderScoreTrendChart() {
  const svg = document.getElementById('scoreTrendSvg');
  const summaryEl = document.getElementById('scoreTrendSummary');
  const labelsEl = document.getElementById('scoreTrendLabels');
  if (!svg) return;

  const details = state.studyDetails || {};
  
  // 撈取有效分數並依時間排序
  const records = Object.keys(details)
    .filter(date => details[date] && (Number(details[date].totalScore) > 0 || Number(details[date].score) > 0))
    .map(date => {
      const item = details[date];
      const val = Number(item.totalScore) || Number(item.score) || 0;
      return {
        date: date,
        score: val,
        name: item.quizName || '模考'
      };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => {
      const tA = new Date(a.date.replace(/-/g, '/')).getTime();
      const tB = new Date(b.date.replace(/-/g, '/')).getTime();
      return tA - tB;
    });

  const recentRecords = records.slice(-8);

  // 清空外層 flex labels，改由 SVG 內統一精準渲染
  if (labelsEl) labelsEl.innerHTML = '';

  if (recentRecords.length === 0) {
    if (summaryEl) summaryEl.innerText = "打卡填寫測驗總分即可生成趨勢圖";
    svg.innerHTML = `
      <text x="250" y="85" fill="#64748b" font-size="12" text-anchor="middle">
        尚未登錄模考分數紀錄
      </text>
    `;
    return;
  }

  // 頂部摘要
  const latest = recentRecords[recentRecords.length - 1];
  if (recentRecords.length >= 2) {
    const prev = recentRecords[recentRecords.length - 2];
    const diff = latest.score - prev.score;
    const sign = diff >= 0 ? `+${diff}` : `${diff}`;
    const color = diff >= 0 ? 'text-emerald-400' : 'text-rose-400';
    if (summaryEl) summaryEl.innerHTML = `最新：<span class="text-amber-400 font-bold">${latest.score}分</span> (<span class="${color}">${sign}</span>)`;
  } else {
    if (summaryEl) summaryEl.innerHTML = `最新：<span class="text-amber-400 font-bold">${latest.score}分</span>`;
  }

  // 座標設定：寬 500，高 175 (預留底部日期文字空間)
  const W = 500;
  const H = 175;
  const padT = 30; // 頂部分數文字空間
  const padB = 32; // 底端日期文字空間
  const padL = 20;
  const padR = 15;

  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const minScore = 400;
  const maxScore = 990;

  const getY = (score) => {
    const clamped = Math.max(minScore, Math.min(maxScore, score));
    return padT + chartH - ((clamped - minScore) / (maxScore - minScore)) * chartH;
  };

  // 確保無論有幾筆資料，X 座標都嚴格一致
  const stepX = recentRecords.length > 1 ? chartW / (recentRecords.length - 1) : 0;
  const getX = (index) => {
    return recentRecords.length === 1 ? W / 2 : padL + index * stepX;
  };

  // 860 分參考虛線
  const y860 = getY(860);
  let svgContent = `
    <line x1="${padL}" y1="${y860}" x2="${W - padR}" y2="${y860}" stroke="#f59e0b" stroke-width="1" stroke-dasharray="4,4" opacity="0.3" />
    <text x="${padL - 2}" y="${y860 + 5}" fill="#f59e0b" opacity="0.6" font-size="9" text-anchor="end" font-family="monospace">860</text>
  `;

  // 折線與漸層陰影
  const points = recentRecords.map((r, i) => `${getX(i)},${getY(r.score)}`).join(' ');

  if (recentRecords.length > 1) {
    const areaPoints = `${getX(0)},${H - padB} ` + points + ` ${getX(recentRecords.length - 1)},${H - padB}`;
    svgContent += `
      <defs>
        <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      <polygon points="${areaPoints}" fill="url(#scoreGrad)" />
      <polyline fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${points}" />
    `;
  }

  // 依相同 X 座標同時繪製「分數標籤」、「圓點」與「底部日期」
  recentRecords.forEach((r, i) => {
    const cx = getX(i);
    const cy = getY(r.score);
    
    // 格式化日期：取出 MM/DD
    const parts = r.date.split('-');
    const dateText = parts.length >= 3 ? `${parts[1]}/${parts[2]}` : r.date;

    svgContent += `
      <g class="cursor-pointer">
        <title>${r.date} - ${r.name}: ${r.score}分</title>
        
        <!-- 頂部分數標籤 (置中對齊 cx) -->
        <text x="${cx}" y="${cy - 9}" fill="#f8fafc" font-size="11" font-weight="bold" font-family="monospace" text-anchor="middle">
          ${r.score}
        </text>

        <!-- 節點圓圈 (中心座標 cx) -->
        <circle cx="${cx}" cy="${cy}" r="5" fill="#020617" stroke="#f59e0b" stroke-width="2.5" />
        <circle cx="${cx}" cy="${cy}" r="2" fill="#fbbf24" />

        <!-- 底部日期標籤 (中心座標 cx，絕對垂直對齊上方圓點) -->
        <text x="${cx}" y="${H - 10}" fill="#94a3b8" font-size="10" font-family="monospace" text-anchor="middle">
          ${dateText}
        </text>
      </g>
    `;
  });

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = svgContent;
}
// 保存進度並完成打卡
function submitStudyLog() {
  // 獲取打卡目標日期（管理員可從整合後的 Calendar 選擇日期）
  let today = getTodayString();
  if (state.isAdmin) {
    const adminDateVal = document.getElementById('adminDateInput')?.value;
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(adminDateVal || ''))) today = adminDateVal;
  }
  if (!state.studyLogs) state.studyLogs = [];
  if (!state.studyDetails) state.studyDetails = {};
  const alreadyLogged = state.studyLogs.some(value => normalizeStudyLogDate(value) === today);

  if (!state.isAdmin && alreadyLogged) {
    showToast("⚠️ 今天已經完成過打卡囉！明天繼續加油！", "warning");
    return;
  }

  const quizName = document.getElementById('inputQuizName')?.value.trim() || '多益日常練習';
  const totalScore = parseInt(document.getElementById('inputTotalScore')?.value) || 0;
  const lTot = parseInt(document.getElementById('inputListenTotal')?.value) || 0;
  const lCor = parseInt(document.getElementById('inputListenCorrect')?.value) || 0;
  const rTot = parseInt(document.getElementById('inputReadTotal')?.value) || 0;
  const rCor = parseInt(document.getElementById('inputReadCorrect')?.value) || 0;

  if (lCor > lTot) {
    showToast("❌ 聽力答對題數不可大於總題數！", "error");
    return;
  }
  if (rCor > rTot) {
    showToast("❌ 閱讀答對題數不可大於總題數！", "error");
    return;
  }

  // 儲存完整明細
  state.studyDetails[today] = {
    quizName: quizName,
    totalScore: totalScore,
    lTotal: lTot,
    lCorrect: lCor,
    rTotal: rTot,
    rCorrect: rCor
  };

  if (!alreadyLogged) {
    state.studyLogs.push(today);
  }

  const ticketReward = state.isAdmin ? 0 : 1;
  if (ticketReward) state.tickets += ticketReward;

  if (typeof window.recordStudyActivityForPlanner === 'function') {
    window.recordStudyActivityForPlanner(today);
  }

  saveGame();
  if (typeof window.closePlannerSheets === 'function') window.closePlannerSheets();
  renderAll();

  const lRate = lTot > 0 ? `${Math.round((lCor / lTot) * 100)}%` : '--%';
  const rRate = rTot > 0 ? `${Math.round((rCor / rTot) * 100)}%` : '--%';

  addNotification({
    title: '📝 今日多益打卡保存！',
    message: `${quizName} 完成！聽力 ${lRate} ｜ 閱讀 ${rRate}${ticketReward ? '，獲得 🎟️ 抽卡券 +1 張！' : '，實戰紀錄已更新。'}`,
    icon: '📅',
    type: 'system'
  });

  const rewardItems = [
    { icon: '🎧', name: '聽力正確率', amount: `${lRate} (${lCor}/${lTot})` },
    { icon: '📖', name: '閱讀正確率', amount: `${rRate} (${rCor}/${rTot})` }
  ];
  if (ticketReward) rewardItems.unshift({ icon: '🎟️', name: '每日打卡獎勵', amount: '+1 張抽卡券' });
  if (totalScore > 0) {
    rewardItems.unshift({ icon: '🏆', name: '測驗模考總分', amount: `${totalScore} 分` });
  }

  showRewardModal({
    title: '🎉 今日多益戰報已保存！',
    subtitle: `測驗：${quizName}`,
    rewards: rewardItems
  });
}
    // 初始化下拉選單 30 隊選項
    const mainTeamSelect = document.getElementById('filterTeam');
    if (mainTeamSelect && mainTeamSelect.options.length <= 1) {
      ALL_30_TEAMS.forEach(team => {
        const opt = document.createElement('option');
        opt.value = team;
        opt.innerText = team;
        mainTeamSelect.appendChild(opt);
      });
      if (state.inventoryFilters) mainTeamSelect.value = state.inventoryFilters.team || 'ALL';
    }

    // 啟動首次畫面渲染
    renderAll();
/* =========================================================
 * 🎯 NBA 全明星三分大賽 (完整穩定版 - 綠必進/黃機率/紅打鐵)
 * ========================================================= */
const threePtState = {
  active: false,
  shooter: null,
  currentRack: 0,   // 0~4 架
  currentBall: 0,   // 0~4 球 (共25球)
  score: 0,
  meterProgress: 0, // 0 ~ 100
  meterDirection: 1,
  animFrameId: null,
  greenStart: 85,
  greenEnd: 95,
  yellowStart: 75,
  yellowEnd: 98,
  yellowHitRate: 0.5,
  meterSpeed: 2.2
};

// 安全獲取玩家陣容名單
function getAllMyPlayers() {
  const list = [];
  try {
    if (typeof state !== 'undefined') {
      if (state.startingLineup) {
        ['PG', 'SG', 'SF', 'PF', 'C'].forEach(pos => {
          if (state.startingLineup[pos]) list.push(state.startingLineup[pos]);
        });
      }
      if (Array.isArray(state.benchLineup)) list.push(...state.benchLineup);
      if (Array.isArray(state.bench)) list.push(...state.bench);
      if (Array.isArray(state.roster)) list.push(...state.roster);
      if (Array.isArray(state.players)) list.push(...state.players);
    }
  } catch (e) {
    console.warn("陣容讀取相容性處理", e);
  }

  const unique = [];
  const names = new Set();
  list.forEach(p => {
    if (p && p.name && !names.has(p.name)) {
      names.add(p.name);
      unique.push(p);
    }
  });
  return unique;
}

// 🔍 100% 純粹參考球員真實「三分命中率 (3P%)」
function getShooter3PtPercent(shooter) {
  if (!shooter) return 0.0;

  // 1. 優先精準讀取球員卡上的真實三分命中率 (如 basic["3P%"])
  const rawSources = [
    shooter.basic?.['3P%'], shooter.basic?.['3p%'], shooter.basic?.threePtPct,
    shooter['3P%'], shooter['3p%'], shooter['3pt%'], shooter.threePtPct,
    shooter.stats?.['3P%'], shooter.stats?.threePtPct, shooter.stats?.tpp,
    shooter.season?.threePtPct, shooter.seasonStats?.threePtPct
  ];

  for (let val of rawSources) {
    if (val !== undefined && val !== null && val !== '') {
      let num = typeof val === 'string' ? parseFloat(val.replace('%', '')) : Number(val);
      if (!isNaN(num)) {
        if (num > 0 && num < 1.0) num = num * 100; // 0.397 -> 39.7%
        return parseFloat(num.toFixed(1));
      }
    }
  }

  // 2. 若有賽季即時累積統計 (進球 / 出手)
  const fg3m = shooter.basic?.['3PM'] ?? shooter.stats?.fg3m ?? shooter.fg3m;
  const fg3a = shooter.basic?.['3PA'] ?? shooter.stats?.fg3a ?? shooter.fg3a;
  if (fg3m !== undefined && fg3a !== undefined && Number(fg3a) > 0) {
    return parseFloat(((Number(fg3m) / Number(fg3a)) * 100).toFixed(1));
  }

  // 3. 嘗試從全明星賽或賽季統計總表比對
  try {
    if (typeof state !== 'undefined') {
      const pools = [state.seasonStats, state.allStar?.stats, state.playerStats];
      for (const pool of pools) {
        if (pool && pool[shooter.name]) {
          const s = pool[shooter.name];
          const poolVal = s.basic?.['3P%'] ?? s['3P%'] ?? s.threePtPct ?? s.fg3_pct;
          if (poolVal !== undefined && poolVal !== null) {
            let n = typeof poolVal === 'string' ? parseFloat(poolVal.replace('%', '')) : Number(poolVal);
            if (!isNaN(n)) {
              if (n > 0 && n < 1.0) n = n * 100;
              return parseFloat(n.toFixed(1));
            }
          }
        }
      }
    }
  } catch (e) {}

  // 4. 若真的完全沒有任何三分數據 (0 出手)，如實回傳 0.0%
  return 0.0;
}// 🎯 核心演算法：純看「三分命中率 (3P%)」決定投籃條綠黃區
function updateMeterDifficulty(shooter) {
  const pct = getShooter3PtPercent(shooter);

  // 🟢 綠區寬度 (依 3P% 精準計算)：
  // 42%+ (神射) -> 13%~15% 超寬
  // 36%~40% (合格) -> 8%~10% 中等
  // <30% (打鐵) -> 3.5% 牙籤細線
  const greenWidth = Math.max(3.5, Math.min(15, (pct - 24) * 0.58));

  // 🟡 黃區外擴寬度
  const yellowSpread = Math.max(3.5, Math.min(10, (pct - 25) * 0.35));
  const yellowWidth = greenWidth + (yellowSpread * 2);

  const greenCenter = 88;
  threePtState.greenStart = greenCenter - (greenWidth / 2);
  threePtState.greenEnd = greenCenter + (greenWidth / 2);

  threePtState.yellowStart = Math.max(0, threePtState.greenStart - yellowSpread);
  threePtState.yellowEnd = Math.min(100, threePtState.greenEnd + yellowSpread);

  // 指針速度 (命中率越低，出手越飄、指針越快)
  threePtState.meterSpeed = Math.max(1.8, 3.8 - (pct / 20));

  // 🟡 黃區真實把握度 (42%三分者黃區有 62% 命中率；28%三分者黃區僅 18%)
  threePtState.yellowHitRate = Math.max(0.18, Math.min(0.66, (pct - 20) / 36));

  // 🎨 即時渲染投籃條色塊
  const greenEl = document.getElementById('shotMeterGreenZone');
  if (greenEl) {
    greenEl.style.left = `${threePtState.greenStart}%`;
    greenEl.style.width = `${greenWidth}%`;
  }

  const yellowEl = document.getElementById('shotMeterYellowZone');
  if (yellowEl) {
    yellowEl.style.left = `${threePtState.yellowStart}%`;
    yellowEl.style.width = `${yellowWidth}%`;
  }

  // 標籤顯示「真實三分率 (3P%)」- 單行不折行
  const badge = document.getElementById('shooterTierBadge');
  if (badge) {
    const baseClass = "px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap tracking-wide border";
    if (pct >= 40.0) {
      badge.className = `text-emerald-400 bg-emerald-950/70 border-emerald-500/50 ${baseClass}`;
      badge.innerText = `🔥 頂級射手 (${pct}%)`;
    } else if (pct >= 35.0) {
      badge.className = `text-amber-400 bg-amber-950/70 border-amber-500/50 ${baseClass}`;
      badge.innerText = `🎯 穩定射手 (${pct}%)`;
    } else {
      badge.className = `text-rose-400 bg-rose-950/70 border-rose-500/50 ${baseClass}`;
      badge.innerText = `⚠️ 外線弱 (${pct}%)`;
    }
  }

  const yellowChanceEl = document.getElementById('yellowChanceText');
  if (yellowChanceEl) {
    yellowChanceEl.innerText = `${Math.round(threePtState.yellowHitRate * 100)}%`;
  }
}

// 1. 打開三分大賽 (每賽季限玩一次，選定開打後不可更換球員)
function openThreePointContest() {
  const modal = document.getElementById('threePtModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.style.display = 'flex';

  const isSeasonPlayed = !!(state.season && state.season.threePtContestPlayed);
  const lockedShooterName = state.season?.threePtContestShooter || null;

  const myPlayers = getAllMyPlayers();
  const selectElem = document.getElementById('threePtShooterSelect');
  const lockedBadge = document.getElementById('threePtShooterLockedBadge');
  if (selectElem) selectElem.innerHTML = '';

  if (myPlayers.length > 0) {
    // 依「三分命中率 (3P%)」從高到低嚴格排序，挑出真正射手
    myPlayers.sort((a, b) => getShooter3PtPercent(b) - getShooter3PtPercent(a));
    myPlayers.forEach(p => {
      const pct = getShooter3PtPercent(p);
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.innerText = `${p.name} (3P%: ${pct}%)`;
      if (selectElem) selectElem.appendChild(opt);
    });

    if (lockedShooterName) {
      const foundLocked = myPlayers.find(p => p.name === lockedShooterName);
      if (foundLocked) {
        threePtState.shooter = foundLocked;
        if (selectElem) selectElem.value = foundLocked.name;
      } else {
        threePtState.shooter = myPlayers[0];
      }
    } else {
      threePtState.shooter = myPlayers[0];
    }
  } else {
    const opt = document.createElement('option');
    opt.value = "隊內神射手";
    opt.innerText = "隊內神射手 (3P%: 42.6%)";
    if (selectElem) selectElem.appendChild(opt);
    threePtState.shooter = { name: "隊內神射手", threePtPct: 42.6 };
  }

  // 🔒 選好球員（或已鎖定、已挑戰）後就不能換了
  if (selectElem) {
    if (lockedShooterName || isSeasonPlayed) {
      selectElem.disabled = true;
      selectElem.classList.add('opacity-60', 'cursor-not-allowed');
      if (lockedBadge) {
        lockedBadge.classList.remove('hidden');
        lockedBadge.innerText = isSeasonPlayed ? '🔒 本季已出戰' : '🔒 已鎖定';
      }
    } else {
      selectElem.disabled = false;
      selectElem.classList.remove('opacity-60', 'cursor-not-allowed');
      if (lockedBadge) lockedBadge.classList.add('hidden');
    }
  }

  updateMeterDifficulty(threePtState.shooter);

  const lb = document.getElementById('contestLeaderboard');
  if (lb) lb.style.display = 'none';

  const btnStart = document.getElementById('btnStartContest');
  const btnShoot = document.getElementById('btnReleaseShot');
  if (btnShoot) btnShoot.disabled = true;

  if (btnStart) {
    btnStart.style.display = 'block';
    if (isSeasonPlayed) {
      // 只能一個賽季只能玩一次
      btnStart.disabled = true;
      btnStart.innerText = `🔒 本賽季已完成挑戰 (${state.season.threePtContestScore ?? 0}分)`;
      btnStart.className = "flex-1 bg-slate-800 text-slate-500 border border-slate-700 font-bold py-3 rounded-xl cursor-not-allowed text-xs sm:text-sm";
    } else {
      btnStart.disabled = false;
      btnStart.innerText = '開始挑戰 (Start Round)';
      btnStart.className = 'flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl shadow-lg transition-transform active:scale-95 text-base';
    }
  }

  const cursor = document.getElementById('shotMeterCursor');
  if (cursor) cursor.style.left = '0%';

  renderRacksInitial();

  const fb = document.getElementById('shotFeedback');
  if (fb) {
    if (isSeasonPlayed) {
      fb.innerText = `⚠️ 本賽季三分大賽已出戰（得分: ${state.season.threePtContestScore ?? 0} 分）！每賽季限玩一次`;
      fb.className = 'text-center font-bold text-xs sm:text-sm text-amber-400 tracking-wide';
    } else if (lockedShooterName) {
      fb.innerText = `🔒 已選定 ${lockedShooterName} 出戰，準備就緒！`;
      fb.className = 'text-center font-bold text-xs sm:text-sm text-emerald-400 tracking-wide';
    } else {
      fb.innerText = '請選定出戰射手（點擊開始後即鎖定不可更換）';
      fb.className = 'text-center font-black text-xs sm:text-sm text-slate-300 tracking-wide';
    }
  }
}

// 下拉選單切換射手 (選定開打後不可更換)
function onShooterSelectChange(selectedName) {
  if (state.season?.threePtContestPlayed || state.season?.threePtContestShooter) {
    return; // 已鎖定球員，不可更換
  }
  const myPlayers = getAllMyPlayers();
  const found = myPlayers.find(p => p.name === selectedName);
  if (found) {
    threePtState.shooter = found;
    updateMeterDifficulty(found);
  }
}

function closeThreePointContest() {
  cancelAnimationFrame(threePtState.animFrameId);
  threePtState.active = false;
  const lb = document.getElementById('contestLeaderboard');
  if (lb) lb.style.display = 'none';
  const modal = document.getElementById('threePtModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}

// 2. 渲染 5 個球架 (響應式 Flex 排列、防擠壓、正圓不變形)
function renderRacksInitial() {
  const container = document.getElementById('racksContainer');
  if (!container) return;
  container.innerHTML = '';

  for (let r = 0; r < 5; r++) {
    const isMoneyRack = (r === 4);
    const rackDiv = document.createElement('div');
    // 球架本體：flex-1 自適應均勻填滿，移除多餘左右邊距，防擠壓
    rackDiv.className = `flex-1 flex flex-col items-center justify-center py-1 sm:py-1.5 px-0.5 rounded-lg border transition-all duration-200 min-w-0 ${r === 0 ? 'border-amber-400 bg-amber-500/15 shadow-[0_0_8px_rgba(245,158,11,0.2)]' : 'border-slate-800 bg-slate-900/60'}`;
    rackDiv.id = `rackBox_${r}`;
    
    // 5 顆球水平緊密置中，aspect-square + rounded-full + flex-shrink-0 確保在手機版永遠正圓
    let ballsHtml = '<div class="flex items-center justify-center gap-0.5 sm:gap-1 w-full overflow-hidden">';
    for (let b = 0; b < 5; b++) {
      const isMoneyBall = isMoneyRack || (b === 4);
      const ballBg = isMoneyBall 
        ? 'bg-gradient-to-r from-blue-500 via-white to-red-500 shadow-[0_0_4px_rgba(59,130,246,0.5)]' 
        : 'bg-amber-600';

      ballsHtml += `<div id="ball_${r}_${b}" class="w-2.5 h-2.5 sm:w-3 sm:h-3 min-w-[9px] min-h-[9px] sm:min-w-[12px] sm:min-h-[12px] aspect-square rounded-full ${ballBg} border border-black/60 opacity-40 flex-shrink-0 transition-all duration-150"></div>`;
    }
    ballsHtml += '</div>';
    
    rackDiv.innerHTML = ballsHtml;
    container.appendChild(rackDiv);
  }

  const scoreEl = document.getElementById('threePtScore');
  if (scoreEl) scoreEl.innerText = '0';
  const leftEl = document.getElementById('threePtBallsLeft');
  if (leftEl) leftEl.innerText = '25';
  const fb = document.getElementById('shotFeedback');
  if (fb) {
    fb.innerText = '準備就緒！點擊開始挑戰';
    fb.className = 'text-center font-black text-base text-slate-400 tracking-wider';
  }
}
// 3. 點擊「開始挑戰」按鈕 (選定球員後立即鎖定不可更換，每賽季限玩一次)
function startThreePointRound() {
  if (state.season && state.season.threePtContestPlayed) {
    showToast("⚠️ 本賽季三分球大賽已經參加過囉！每賽季限參加一次，新賽季將再次開放！", "warning");
    return;
  }

  // 🔒 選好球員開打後立即鎖定，本賽季不能再更換球員！
  if (!state.season) state.season = {};
  state.season.threePtContestShooter = threePtState.shooter.name;
  saveGame();

  const selectElem = document.getElementById('threePtShooterSelect');
  if (selectElem) {
    selectElem.disabled = true;
    selectElem.classList.add('opacity-60', 'cursor-not-allowed');
  }
  const lockedBadge = document.getElementById('threePtShooterLockedBadge');
  if (lockedBadge) {
    lockedBadge.classList.remove('hidden');
    lockedBadge.innerText = '🔒 已鎖定';
  }

  const lb = document.getElementById('contestLeaderboard');
  if (lb) lb.style.display = 'none';

  const btnStart = document.getElementById('btnStartContest');
  if (btnStart) btnStart.style.display = 'none';

  const btnShoot = document.getElementById('btnReleaseShot');
  if (btnShoot) btnShoot.disabled = false;

  threePtState.active = true;
  threePtState.currentRack = 0;
  threePtState.currentBall = 0;
  threePtState.score = 0;
  threePtState.meterProgress = 0;
  renderRacksInitial();
  
  startMeterLoop();
}

// 4. 白色指針滑動動畫
function startMeterLoop() {
  threePtState.meterProgress = 0;
  threePtState.meterDirection = 1;

  function update() {
    if (!threePtState.active) return;
    threePtState.meterProgress += threePtState.meterDirection * threePtState.meterSpeed;

    if (threePtState.meterProgress >= 100) {
      threePtState.meterProgress = 100;
      threePtState.meterDirection = -1; // 碰壁折返
    } else if (threePtState.meterProgress <= 0) {
      threePtState.meterProgress = 0;
      threePtState.meterDirection = 1;
    }

    const cursor = document.getElementById('shotMeterCursor');
    if (cursor) cursor.style.left = `${threePtState.meterProgress}%`;

    threePtState.animFrameId = requestAnimationFrame(update);
  }
  threePtState.animFrameId = requestAnimationFrame(update);
}

// 5. 按下【🟢 出手】或【空白鍵】判定
function triggerShotRelease() {
  if (!threePtState.active) return;
  cancelAnimationFrame(threePtState.animFrameId);

  const val = threePtState.meterProgress;
  
  // 核心判定邏輯：綠色必進，黃色依機率，紅色打鐵
  const isGreen = (val >= threePtState.greenStart && val <= threePtState.greenEnd);
  const isYellow = (val >= threePtState.yellowStart && val <= threePtState.yellowEnd) && !isGreen;
  
  let hit = false;
  let feedbackText = "";
  let feedbackClass = "";

  if (isGreen) {
    hit = true;
    feedbackText = "🟢 PERFECT GREEN! (100% 空心破網!)";
    feedbackClass = "text-emerald-400 drop-shadow-[0_0_10px_#10b981]";
  } else if (isYellow) {
    hit = Math.random() < threePtState.yellowHitRate;
    feedbackText = hit 
      ? `🟡 GOOD RELEASE (命中! 把握黃區機會)` 
      : `🟡 SLIGHTLY OFF (黃區涮框打鐵)`;
    feedbackClass = hit ? "text-amber-300 drop-shadow-[0_0_6px_#f59e0b]" : "text-slate-400";
  } else {
    hit = false;
    feedbackText = "🔴 BAD TIMING (時機偏離，重重打鐵!)";
    feedbackClass = "text-rose-500";
  }

  // 得分
  const isMoney = (threePtState.currentRack === 4) || (threePtState.currentBall === 4);
  const pts = hit ? (isMoney ? 2 : 1) : 0;
  threePtState.score += pts;

  const scoreEl = document.getElementById('threePtScore');
  if (scoreEl) scoreEl.innerText = threePtState.score;

  const fb = document.getElementById('shotFeedback');
  if (fb) {
    fb.innerText = feedbackText;
    fb.className = `text-center font-black text-base tracking-wider ${feedbackClass}`;
  }

  const ballDot = document.getElementById(`ball_${threePtState.currentRack}_${threePtState.currentBall}`);
  if (ballDot) {
    const ballBase = "w-2.5 h-2.5 sm:w-3 sm:h-3 min-w-[9px] min-h-[9px] sm:min-w-[12px] sm:min-h-[12px] aspect-square rounded-full border border-black/60 flex-shrink-0 transition-all duration-150";
    if (hit) {
      ballDot.className = `${ballBase} bg-emerald-400 shadow-[0_0_8px_#34d399] scale-110 opacity-100`;
    } else {
      ballDot.className = `${ballBase} bg-slate-700/60 opacity-25`;
    }
  }

  // 下一球
  threePtState.currentBall++;
  if (threePtState.currentBall >= 5) {
    threePtState.currentBall = 0;
    const oldRack = document.getElementById(`rackBox_${threePtState.currentRack}`);
    if (oldRack) {
      oldRack.className = 'flex-1 flex flex-col items-center justify-center py-1 sm:py-1.5 px-0.5 rounded-lg border transition-all duration-200 min-w-0 border-slate-800 bg-slate-900/60';
    }
    threePtState.currentRack++;
    if (threePtState.currentRack < 5) {
      const newRack = document.getElementById(`rackBox_${threePtState.currentRack}`);
      if (newRack) {
        newRack.className = 'flex-1 flex flex-col items-center justify-center py-1 sm:py-1.5 px-0.5 rounded-lg border transition-all duration-200 min-w-0 border-amber-400 bg-amber-500/15 shadow-[0_0_8px_rgba(245,158,11,0.2)]';
      }
    }
  }

  const totalBallsLeft = 25 - (threePtState.currentRack * 5 + threePtState.currentBall);
  const leftEl = document.getElementById('threePtBallsLeft');
  if (leftEl) leftEl.innerText = Math.max(0, totalBallsLeft);

  if (threePtState.currentRack >= 5) {
    setTimeout(finishContest, 600);
  } else {
    setTimeout(() => {
      startMeterLoop();
    }, 420);
  }
}

// 6. 結算畫面 (記錄本賽季已出戰，一季限玩一次)
function finishContest() {
  threePtState.active = false;
  cancelAnimationFrame(threePtState.animFrameId);

  const btnShoot = document.getElementById('btnReleaseShot');
  if (btnShoot) btnShoot.disabled = true;

  const myScore = threePtState.score;
  const playerName = threePtState.shooter ? threePtState.shooter.name : "你";

  // 📝 儲存本賽季三分大賽挑戰紀錄
  if (!state.season) state.season = {};
  state.season.threePtContestPlayed = true;
  state.season.threePtContestScore = myScore;
  state.season.threePtContestShooter = playerName;
  saveGame();

  const btnStart = document.getElementById('btnStartContest');
  if (btnStart) {
    btnStart.style.display = 'block';
    btnStart.disabled = true;
    btnStart.innerText = `🔒 本賽季已完成挑戰 (${myScore}分)`;
    btnStart.className = "flex-1 bg-slate-800 text-slate-500 border border-slate-700 font-bold py-3 rounded-xl cursor-not-allowed text-xs sm:text-sm";
  }

  const lockedBadge = document.getElementById('threePtShooterLockedBadge');
  if (lockedBadge) {
    lockedBadge.classList.remove('hidden');
    lockedBadge.innerText = '🔒 本季已出戰';
  }

  const asgBtn = document.getElementById('btnOpenThreePtFromAllStar');
  if (asgBtn) {
    asgBtn.innerText = `🎯 三分大賽 (已出戰: ${myScore}分)`;
    asgBtn.className = "px-3 py-1.5 bg-slate-800 text-amber-400/80 border border-slate-700 font-bold rounded-lg text-xs shadow-md cursor-pointer";
  }

  const aiShooters = [
    { name: playerName.includes("Curry") ? "Buddy Hield" : "Stephen Curry", score: 27 },
    { name: playerName.includes("Lillard") ? "Tyrese Haliburton" : "Damian Lillard", score: 25 },
    { name: playerName.includes("Thompson") ? "Devin Booker" : "Klay Thompson", score: 23 },
    { name: `${playerName} (你)`, score: myScore, isPlayer: true }
  ].sort((a, b) => b.score - a.score);

  const isChamp = aiShooters[0].isPlayer;

  const trophyEl = document.getElementById('contestTrophyIcon');
  if (trophyEl) trophyEl.innerText = isChamp ? '🏆' : '🥈';

  const titleEl = document.getElementById('contestResultTitle');
  if (titleEl) titleEl.innerText = isChamp ? '🎉 勇奪三分球大賽冠軍！' : '大賽結束';

  const subEl = document.getElementById('contestResultSub');
  if (subEl) {
    subEl.innerText = isChamp 
      ? `狂飆 ${myScore} 分稱霸全明星！高舉三分金盃！` 
      : `拿下 ${myScore} 分，由 ${aiShooters[0].name} 以 ${aiShooters[0].score} 分奪冠！`;
  }

  const board = document.getElementById('leaderboardRows');
  if (board) {
    board.innerHTML = aiShooters.map((c, i) => `
      <div class="flex justify-between items-center p-2 rounded-lg ${c.isPlayer ? 'bg-amber-500/20 border border-amber-500/60 text-amber-300' : 'bg-slate-800/80 text-slate-300'}">
        <span>${i === 0 ? '👑 冠軍' : `${i + 1}th`} : ${c.name}</span>
        <span class="font-black text-amber-400">${c.score} 分</span>
      </div>
    `).join('');
  }

  const fb = document.getElementById('shotFeedback');
  if (fb) {
    fb.innerText = `本賽季三分大賽挑戰結束（最終總分: ${myScore} 分）`;
    fb.className = 'text-center font-bold text-xs sm:text-sm text-amber-400 tracking-wide';
  }

  const lb = document.getElementById('contestLeaderboard');
  if (lb) lb.style.display = 'flex';
}

// 7. 空白鍵監聽
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && threePtState.active) {
    e.preventDefault();
    triggerShotRelease();
  }
});

/* =====================================================
   💍 總冠軍戒指展示櫃 & 🎉 奪冠慶典系統 (CHAMPIONSHIP CELEBRATION & RING CABINET)
===================================================== */
let confettiAnimationId = null;

function renderRingSVG(ring, size = 120) {
  const uid = Math.random().toString(36).slice(2, 7);
  const yearText = ring && ring.year ? ring.year : 2026;
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" class="drop-shadow-[0_10px_20px_rgba(245,158,11,0.45)] select-none">
      <defs>
        <radialGradient id="ringGoldOuter_${uid}" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stop-color="#fffbeb"/>
          <stop offset="28%" stop-color="#fef08a"/>
          <stop offset="60%" stop-color="#f59e0b"/>
          <stop offset="85%" stop-color="#d97706"/>
          <stop offset="100%" stop-color="#78350f"/>
        </radialGradient>
        <radialGradient id="ringGemCenter_${uid}" cx="45%" cy="38%" r="62%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="25%" stop-color="#fef9c3"/>
          <stop offset="60%" stop-color="#fbbf24"/>
          <stop offset="85%" stop-color="#d97706"/>
          <stop offset="100%" stop-color="#78350f"/>
        </radialGradient>
        <linearGradient id="ringBandShine_${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fef3c7"/>
          <stop offset="40%" stop-color="#f59e0b"/>
          <stop offset="80%" stop-color="#b45309"/>
          <stop offset="100%" stop-color="#78350f"/>
        </linearGradient>
        <filter id="goldGlow_${uid}" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      <!-- 底部厚實戒環 -->
      <ellipse cx="100" cy="150" rx="58" ry="26" fill="url(#ringBandShine_${uid})" stroke="#fef3c7" stroke-width="2.5" />
      <ellipse cx="100" cy="144" rx="44" ry="17" fill="#181512" />

      <!-- 戒指主立體金屬座台 -->
      <path d="M42 104 L64 144 Q100 156 136 144 L158 104 Z" fill="url(#ringGoldOuter_${uid})" stroke="#fde68a" stroke-width="2" />

      <!-- 戒指頂部八角形尊爵冠台 -->
      <polygon points="66,50 134,50 170,84 154,118 46,118 30,84" fill="url(#ringGoldOuter_${uid})" stroke="#ffffff" stroke-width="2.5" filter="url(#goldGlow_${uid})"/>

      <!-- 密鑲碎鑽外圈 (Pavé Diamonds) -->
      <circle cx="70" cy="56" r="3.5" fill="#ffffff" stroke="#fbbf24" stroke-width="1"/>
      <circle cx="88" cy="52" r="3.5" fill="#ffffff" stroke="#fbbf24" stroke-width="1"/>
      <circle cx="112" cy="52" r="3.5" fill="#ffffff" stroke="#fbbf24" stroke-width="1"/>
      <circle cx="130" cy="56" r="3.5" fill="#ffffff" stroke="#fbbf24" stroke-width="1"/>
      <circle cx="156" cy="78" r="3.5" fill="#ffffff" stroke="#fbbf24" stroke-width="1"/>
      <circle cx="162" cy="94" r="3.5" fill="#ffffff" stroke="#fbbf24" stroke-width="1"/>
      <circle cx="146" cy="112" r="3.5" fill="#ffffff" stroke="#fbbf24" stroke-width="1"/>
      <circle cx="124" cy="115" r="3.5" fill="#ffffff" stroke="#fbbf24" stroke-width="1"/>
      <circle cx="100" cy="116" r="3.5" fill="#ffffff" stroke="#fbbf24" stroke-width="1"/>
      <circle cx="76" cy="115" r="3.5" fill="#ffffff" stroke="#fbbf24" stroke-width="1"/>
      <circle cx="54" cy="112" r="3.5" fill="#ffffff" stroke="#fbbf24" stroke-width="1"/>
      <circle cx="38" cy="94" r="3.5" fill="#ffffff" stroke="#fbbf24" stroke-width="1"/>
      <circle cx="44" cy="78" r="3.5" fill="#ffffff" stroke="#fbbf24" stroke-width="1"/>

      <!-- 中心籃球切面主鑽石 -->
      <g class="gem-sparkle">
        <ellipse cx="100" cy="84" rx="40" ry="25" fill="url(#ringGemCenter_${uid})" stroke="#ffffff" stroke-width="2"/>
        <path d="M60 84 Q100 84 140 84" stroke="#ffffff" stroke-width="1.5" opacity="0.85"/>
        <path d="M100 59 Q100 84 100 109" stroke="#ffffff" stroke-width="1.5" opacity="0.85"/>
        <path d="M72 67 Q88 84 72 101" stroke="#ffffff" stroke-width="1.2" opacity="0.85"/>
        <path d="M128 67 Q112 84 128 101" stroke="#ffffff" stroke-width="1.2" opacity="0.85"/>
        <text x="100" y="90" text-anchor="middle" font-size="19" fill="#ffffff" filter="drop-shadow(0 0 5px #fbbf24)">🏆</text>
      </g>

      <!-- 戒面年份刻印銘牌 (Engraved Nameplate) -->
      <rect x="50" y="128" width="100" height="16" rx="4" fill="#381500" stroke="#fef08a" stroke-width="1.2"/>
      <text x="100" y="140" text-anchor="middle" font-family="monospace" font-size="9" font-weight="900" fill="#fef08a" letter-spacing="1.5">
        ${yearText} CHAMPIONS
      </text>
    </svg>
  `;
}

function playVictoryFanfare() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const chords = [
      { f: 261.63, t: 0.0, d: 0.8 }, // C4
      { f: 329.63, t: 0.12, d: 0.8 }, // E4
      { f: 392.00, t: 0.24, d: 0.8 }, // G4
      { f: 523.25, t: 0.40, d: 1.4 }, // C5
      { f: 659.25, t: 0.52, d: 1.4 }, // E5
      { f: 783.99, t: 0.64, d: 1.8 }  // G5
    ];

    chords.forEach(c => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(c.f, now + c.t);
      gain.gain.setValueAtTime(0.2, now + c.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + c.t + c.d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + c.t);
      osc.stop(now + c.t + c.d);
    });
  } catch(e) {
    console.warn("Victory audio note skipped:", e);
  }
}

// 🎊 彩帶與拉砲粒子動畫引擎
function startCelebrationConfetti() {
  const canvas = document.getElementById('celebrationConfettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#f59e0b', '#fbbf24', '#ec4899', '#3b82f6', '#10b981', '#ffffff', '#f43f5e', '#a855f7'];
  const confettiCount = 120;
  const confetti = [];

  for (let i = 0; i < confettiCount; i++) {
    confetti.push({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 3 + 2.5,
      speedX: Math.random() * 2 - 1,
      rotation: Math.random() * 360,
      rotSpeed: Math.random() * 6 - 3,
      isRibbon: Math.random() > 0.6
    });
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    confetti.forEach(p => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotSpeed;

      if (p.y > canvas.height) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;

      if (p.isRibbon) {
        ctx.fillRect(-p.size, -p.size * 2, p.size / 2, p.size * 2.5);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    confettiAnimationId = requestAnimationFrame(render);
  }

  if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
  render();
}

function stopCelebrationConfetti() {
  if (confettiAnimationId) {
    cancelAnimationFrame(confettiAnimationId);
    confettiAnimationId = null;
  }
  const canvas = document.getElementById('celebrationConfettiCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

/* =====================================================
   🎉 總冠軍香檳慶典彈窗控制 (防報錯、安全開啟)
===================================================== */
function showChampionshipCelebration(ringData, fmvpData) {
  const modal = document.getElementById('championshipCelebrationModal');
  if (!modal) return;

  modal.classList.remove('hidden');
  modal.style.display = 'flex';

  try {
    playVictoryFanfare();
  } catch (e) {
    console.warn("playVictoryFanfare error:", e);
  }

  // 1. 填入奪冠報紙資訊
  const currentYear = (ringData && ringData.year)
    ? ringData.year
    : (typeof state?.season === 'number' ? (2024 + state.season) : (state?.season?.year || 2026));
  const recordStr = (ringData && ringData.record) ? ringData.record : (state?.playoffStats ? `${state.playoffStats.wins || 16}-${state.playoffStats.losses || 3}` : '16-3');
  const oppName = (ringData && ringData.opponent) ? ringData.opponent : '對手戰隊';

  const yearEl = document.getElementById('celebNewspaperYear');
  if (yearEl) yearEl.innerText = `${currentYear} NBA CHAMPIONS`;

  const recEl = document.getElementById('celebNewspaperRecord');
  if (recEl) recEl.innerText = `季後賽戰績 ${recordStr} 登頂世界之巔！`;

  const oppEl = document.getElementById('celebNewspaperOpponent');
  if (oppEl) oppEl.innerText = `總決賽力克 ${oppName}`;

  // 2. 填入左欄戒指與戰績卡
  const ringYearEl = document.getElementById('celebRingYearText');
  if (ringYearEl) ringYearEl.innerText = `${currentYear} CHAMPIONS`;

  const ringRecEl = document.getElementById('celebRingRecordText');
  if (ringRecEl) ringRecEl.innerText = `季後賽總戰績: ${recordStr}`;

  const ringOppEl = document.getElementById('celebRingOpponentText');
  if (ringOppEl) ringOppEl.innerText = `總決賽擊敗: ${oppName}`;

  // 3. 填入 3D 戒指或金盃（防 renderRingSVG 未定義崩潰）
  const ringPlaceholder = document.getElementById('celebRingPlaceholder');
  if (ringPlaceholder) {
    if (typeof renderRingSVG === 'function') {
      try {
        ringPlaceholder.innerHTML = renderRingSVG(ringData, 100);
      } catch (err) {
        ringPlaceholder.innerHTML = `<div class="text-5xl my-2">💍</div>`;
      }
    } else {
      ringPlaceholder.innerHTML = `<div class="text-5xl my-2">🏆</div>`;
    }
  }

  // 4. 填入右欄 FMVP 得主資訊
  const fmvp = fmvpData || {};
  const fmvpNameEl = document.getElementById('celebFmvpName');
  if (fmvpNameEl) fmvpNameEl.innerText = fmvp.name || '當家核心主力';

  const fmvpTeamEl = document.getElementById('celebFmvpTeam');
  if (fmvpTeamEl) fmvpTeamEl.innerText = `${fmvp.team || '冠軍陣容'} · 總決賽最有價值球員`;

  const fmvpStatsEl = document.getElementById('celebFmvpStats');
  if (fmvpStatsEl) fmvpStatsEl.innerText = fmvp.stats || '總決賽統治級火燙表現';

  const fmvpAvatarEl = document.getElementById('celebFmvpAvatar');
  if (fmvpAvatarEl) {
    if (fmvp.nbaId) {
      fmvpAvatarEl.src = getPlayerImgUrl(fmvp.nbaId);
    } else {
      fmvpAvatarEl.src = 'https://cdn.nba.com/logos/leagues/logo-nba.svg';
    }
  }

  // 5. 確保彈窗可見並更新圖示
  modal.style.display = 'flex';
  if (window.lucide) lucide.createIcons();

  // 6. 🎊 噴射雙重彩帶與紙花拉砲（Canvas 粒子 + 全螢幕 Confetti 禮炮）
  try {
    startCelebrationConfetti();
  } catch (err) {
    console.warn("startCelebrationConfetti error:", err);
  }

  if (typeof confetti === 'function') {
    // 第一波：中央高空金粉彩帶大爆發 (提高 zIndex 防止被 z-[105] 彈窗遮擋)
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.55 },
      zIndex: 9999,
      colors: ['#f59e0b', '#fbbf24', '#ec4899', '#3b82f6', '#10b981', '#ffffff']
    });

    // 第二波：左、右兩側加農砲連發交錯噴灑
    setTimeout(() => {
      confetti({
        particleCount: 90,
        angle: 60,
        spread: 75,
        origin: { x: 0.05, y: 0.7 },
        zIndex: 9999,
        colors: ['#f59e0b', '#fbbf24', '#ec4899', '#ffffff']
      });
      confetti({
        particleCount: 90,
        angle: 120,
        spread: 75,
        origin: { x: 0.95, y: 0.7 },
        zIndex: 9999,
        colors: ['#f59e0b', '#fbbf24', '#3b82f6', '#ffffff']
      });
    }, 300);

    // 第三波：金黃色漫天紙花持續飄落
    setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 120,
        origin: { y: 0.35 },
        zIndex: 9999,
        colors: ['#f59e0b', '#fbbf24', '#d97706', '#fef08a']
      });
    }, 700);
  }
}

// 兼容函式名稱：確保不論叫 openChampionshipCelebration 還是 showChampionshipCelebration 都能觸發
function openChampionshipCelebration(ringData, fmvpData) {
  showChampionshipCelebration(ringData, fmvpData);
}

function closeChampionshipCelebration() {
  stopCelebrationConfetti();
  const modal = document.getElementById('championshipCelebrationModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}
function claimCelebrationAndShowRewards() {
  closeChampionshipCelebration();
  showRewardModal({
    title: '🏆 登頂世界之巔！榮登 NBA 總冠軍！',
    subtitle: '全體出戰球員獲授總冠軍金盃與榮譽錦旗，FMVP 榮膺燙金徽章！',
    rewards: [
      { icon: '🎟️', name: '奪冠獎勵抽卡券', amount: '+15 張' },
      { icon: '💎', name: '選秀碎片', amount: '+100 點' },
      { icon: '🏆', name: '隊史總冠軍金盃', amount: '已入櫃' },
      { icon: '👑', name: 'FMVP 傳奇印記', amount: '永久 OVR+1' }
    ],
    note: '總冠軍榮譽已收錄至頂部【🏆 展示櫃】，可隨時檢視歷屆冠軍錦旗與奪冠先發五虎！'
  });
}

function goToRingsCabinetFromCelebration() {
  closeChampionshipCelebration();
  openChampionshipRingsModal();
}
/* =====================================================
   🏆 總冠軍展示櫃 Modal 控制 (補回遺失的開關函式)
===================================================== */
function openChampionshipRingsModal() {
  renderChampionshipRingsModal();
  const modal = document.getElementById('championshipRingsModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    if (window.lucide) lucide.createIcons();
  }
}

function closeChampionshipRingsModal() {
  const modal = document.getElementById('championshipRingsModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}
// 🏛️ 渲染總冠軍展示櫃：錦旗、FMVP、那一年的先發五虎
function renderChampionshipRingsModal() {
  const rings = Array.isArray(state.championshipRings) ? state.championshipRings : [];
  const countBadge = document.getElementById('ringsCabinetTotalCount');
  if (countBadge) countBadge.innerText = `${rings.length} 座金盃`;

  const grid = document.getElementById('ringsCabinetGrid');
  if (!grid) return;

  if (rings.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-12 flex flex-col items-center justify-center text-center p-6 bg-slate-950/60 rounded-3xl border border-dashed border-slate-800">
        <div class="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-3xl mb-3">
          🏆
        </div>
        <h4 class="text-base font-black text-amber-400">榮譽展示櫃尚無總冠軍</h4>
        <p class="text-xs text-slate-400 max-w-sm mt-1.5 leading-relaxed">
          在例行賽 82 場挺進季後賽並奪下總冠軍，即可在此永久陳列【冠軍錦旗、FMVP 得主與那一屆的奪冠先發五虎】！
        </p>
        <button onclick="closeChampionshipRingsModal(); switchTab('tab-season');" class="mt-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2 rounded-xl transition cursor-pointer shadow-lg active:scale-95">
          前往賽季爭奪冠軍 ➔
        </button>
      </div>
    `;
    return;
  }

  // 倒序排列，最新奪冠的年份排在最上面
  grid.innerHTML = rings.slice().reverse().map((ring, idx) => {
    // 取得該屆奪冠先發（若舊存檔無陣容，則自動 fallback）
 // 🛡️ 嚴格讀取奪冠那一年的歷史先發快照（絕不隨當前陣容變動）
    const positions = ['PG', 'SG', 'SF', 'PF', 'C'];
    const starters = (ring.starters && ring.starters.length === 5) 
      ? ring.starters 
      : positions.map(pos => ({ pos, name: '隊史名將', ovr: '--', nbaId: 0 }));

    return `
      <div class="relative bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-amber-500/40 hover:border-amber-400 rounded-3xl p-4 shadow-xl transition-all duration-300 overflow-hidden flex flex-col text-left">
        <!-- 頂部高光金色氛圍光暈 -->
        <div class="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none"></div>

        <!-- 錦旗標題列：奪冠年份與戰績 -->
        <div class="w-full flex justify-between items-center text-[10px] font-mono mb-2 pb-2 border-b border-slate-800">
          <div class="flex items-center gap-1.5">
            <span class="text-amber-400 font-black text-sm">🏆 #${rings.length - idx}</span>
            <span class="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
              ${ring.year || '2026'} CHAMPIONS
            </span>
          </div>
          <span class="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-md font-bold">
            ${ring.record || '16-3'}
          </span>
        </div>

        <!-- FMVP 得主核心展示卡 -->
        <div class="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-2.5 flex items-center justify-between mb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-full overflow-hidden bg-slate-900 border border-amber-400/60 flex-shrink-0">
              ${ring.fmvpNbaId ? `<img src="${getPlayerImgUrl(ring.fmvpNbaId)}" class="w-full h-full object-cover object-top" onerror="this.src='https://cdn.nba.com/headshots/nba/latest/1040x760/fallback.png'">` : `<div class="w-full h-full flex items-center justify-center text-sm">🎖️</div>`}
            </div>
            <div>
              <div class="flex items-center gap-1">
                <span class="text-[9px] font-black bg-amber-400 text-slate-950 px-1 py-0.2 rounded">FMVP</span>
                <span class="text-xs font-black text-white">${ring.fmvpName || '核心主力'}</span>
              </div>
              <p class="text-[9px] text-slate-400 font-mono mt-0.5">${ring.fmvpStats || '總決賽火燙統治級表現'}</p>
            </div>
          </div>
          <div class="text-right text-[10px] font-mono text-slate-500">
            <div>對手: <span class="text-slate-300 font-bold">${ring.opponent || '東區霸主'}</span></div>
          </div>
        </div>

        <!-- 🛡️ 奪冠那一年的先發五虎 -->
        <div class="text-[10px] font-mono text-slate-400 mb-1.5 flex items-center gap-1">
          <span>🛡️ 奪冠先發五虎陣容 (Starting Five)</span>
        </div>

        <div class="grid grid-cols-5 gap-1.5">
          ${starters.map(p => `
            <div class="bg-slate-950 border border-slate-800 rounded-xl p-1.5 flex flex-col items-center text-center">
              <span class="text-[8px] font-black text-amber-400 font-mono">${p.pos}</span>
              <div class="w-8 h-8 rounded-full overflow-hidden bg-slate-900 my-1 border border-slate-800 flex-shrink-0">
                ${p.nbaId ? `<img src="${getPlayerImgUrl(p.nbaId)}" class="w-full h-full object-cover object-top" onerror="this.src='https://cdn.nba.com/headshots/nba/latest/1040x760/fallback.png'">` : `<div class="w-full h-full flex items-center justify-center text-[10px]">👤</div>`}
              </div>
              <span class="text-[9px] font-bold text-slate-200 truncate w-full">${p.name}</span>
              <span class="text-[8px] font-mono text-slate-500">OVR ${p.ovr || '--'}</span>
            </div>
          `).join('')}
        </div>

      </div>
    `;
  }).join('');
}

// 🔍 點擊深入全景檢視 (相容保留)
function inspectRingDetails(ringId) {
  openChampionshipRingsModal();
}

function closeRingDetailModal() {
  closeChampionshipRingsModal();
}

function quickAssignStarter(cardId) {
  const card = (state.inventory || []).find(c => c && c.cardId === cardId);
  if (!card) return;
  
  // 優先放入其第一位置的空缺，若已被占據則尋找任意空缺
  const primaryPos = (card.positions && card.positions[0]) || 'PG';
  removePlayerFromEntireRoster(card.cardId);

  if (!state.startingLineup[primaryPos]) {
    state.startingLineup[primaryPos] = card;
  } else {
    const emptyPos = ['PG', 'SG', 'SF', 'PF', 'C'].find(p => !state.startingLineup[p]);
    if (emptyPos) {
      state.startingLineup[emptyPos] = card;
    } else {
      // 若全滿則頂替原第一位置
      state.startingLineup[primaryPos] = card;
    }
  }
  renderAll();
  showToast(`${card.name} 已指派先發！`, "success");
}

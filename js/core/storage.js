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
        sessionId: '', status: 'idle', sessionStartAt: null,
        plannedDuration: 25 * 60 * 1000, pausedAccumulatedMs: 0, rewardedIntervals: 0, completedAt: null
      },
      focusMode: {
        active: false, totalFocusedMs: 0, dailyDate: '', dailyFocusedMs: 0,
        rewardsDate: '', rewardsClaimedToday: 0, rewardCountsByDate: {}, rewardedSessionIds: [], dailyRewardCap: 20
      },
      isAdmin: false,
      claimedTeamRewards: [],
      redeemedCodes: [],
      championshipRings: [],
      playoffStats: { wins: 0, losses: 0, finalsPlayerStats: {} },
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
        currentQuizIndex: 0,
        quizStreak: 0,
        totalMastered: 0,
        selectedBoxFilter: 'all',
        isSpellingMode: false
      }
    };

function saveGame() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.error("Save failed (localStorage error):", e);
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
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        Object.keys(saved).forEach(key => {
          if (['__proto__', 'prototype', 'constructor'].includes(key)) return;
          if (!Object.prototype.hasOwnProperty.call(defaults, key)) result[key] = saved[key];
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

      const recoveryId = 'owner-study-2026-10-01-international-village-listening-1';
      if (!Array.isArray(s.appliedStudyRecoveries)) s.appliedStudyRecoveries = [];
      if (s.isAdmin && !s.appliedStudyRecoveries.includes(recoveryId)) {
        const recoveryDate = '2026-10-01';
        if (!s.studyDetails || typeof s.studyDetails !== 'object') s.studyDetails = {};
        if (!s.studyDetails[recoveryDate]) {
          s.studyDetails[recoveryDate] = {
            quizName: '多益國際學村第一回（聽力）', totalScore: 315,
            lTotal: 100, lCorrect: 63, rTotal: 0, rCorrect: 0
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

        if ((Number(c.nbaId || c.id) === 977 && c.isLegend) || /Kobe Bryant\s*\('\s*10\s*\)/i.test(String(c.name || ''))) {
          c.name = 'Kobe Bryant';
          c.edition = '10';
        }

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

        if (!c.positions || !Array.isArray(c.positions) || c.positions.length === 0) {
          c.positions = refPlayer?.positions ? [...refPlayer.positions] : (refPlayer?.pos ? [...refPlayer.pos] : ['PG']);
        }

        if (!c.legacy || typeof c.legacy !== 'object') {
          c.legacy = { seasons: 0, games: 0, pts: 0, reb: 0, ast: 0, rings: 0, mvps: 0, fmvps: fmvpBonus, traits: [] };
        } else if (typeof c.legacy.fmvps === 'undefined') {
          c.legacy.fmvps = fmvpBonus;
        }

        if (!c.rarity) {
          c.rarity = refPlayer?.rarity || determineRarityByOvr(c.baseOvr);
        }

        return c;
      }

      // 標準化背包卡片
      s.inventory = s.inventory.map(c => normalizeCard(c)).filter(Boolean);

      // 管理員存檔在年度名單更新後，自動補齊每名球員缺少的年度版本。
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
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(defaultState));
      try {
        const parsed = JSON.parse(raw);
        const merged = deepMergeState(defaultState, parsed);
        return migrateSaveData(merged);
      } catch (e) {
        console.error("Load save error, falling back to defaultState:", e);
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
      localStorage.removeItem(STORAGE_KEY);
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

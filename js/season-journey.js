/* ToeicQuest NBA — Season Journey core
   Loaded after app.js/bootstrap.js so the old one-click 82-game simulator can
   be replaced without invalidating existing saves. */
(function () {
  'use strict';

  const ENERGY_MAX = 15;
  const ENERGY_REGEN_MS = 30 * 60 * 1000;
  const SEASON_LENGTH = 82;
  const AUTO_STEP_MS = 1800;
  const MATCH_PRESENTATION_TIMING = Object.freeze({
    event: 290,
    scorePulse: 230,
    quarterIntro: 360,
    quarterTransition: 650
  });
  const PLAYER_TEAM_FALLBACK = '玩家夢幻隊';
  const OPPONENTS = [
    'Celtics','Knicks','Nets','76ers','Raptors','Bulls','Cavaliers','Pistons','Pacers','Bucks',
    'Hawks','Hornets','Heat','Magic','Wizards','Nuggets','Timberwolves','Thunder','Trail Blazers','Jazz',
    'Warriors','Clippers','Lakers','Suns','Kings','Mavericks','Rockets','Grizzlies','Pelicans','Spurs'
  ];
  const TEAM_CODES = Object.freeze({
    Celtics: 'BOS', Knicks: 'NYK', Nets: 'BKN', '76ers': 'PHI', Raptors: 'TOR',
    Bulls: 'CHI', Cavaliers: 'CLE', Pistons: 'DET', Pacers: 'IND', Bucks: 'MIL',
    Hawks: 'ATL', Hornets: 'CHA', Heat: 'MIA', Magic: 'ORL', Wizards: 'WAS',
    Nuggets: 'DEN', Timberwolves: 'MIN', Thunder: 'OKC', 'Trail Blazers': 'POR', Jazz: 'UTA',
    Warriors: 'GSW', Clippers: 'LAC', Lakers: 'LAL', Suns: 'PHX', Kings: 'SAC',
    Mavericks: 'DAL', Rockets: 'HOU', Grizzlies: 'MEM', Pelicans: 'NOP', Spurs: 'SAS'
  });
  const LINEUP_POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];
  const BADGE_TIER_STEPS = Object.freeze([
    { name: 'Bronze', min: 0, next: 5, multiplier: 1, label: '銅' },
    { name: 'Silver', min: 5, next: 15, multiplier: 1.3, label: '銀' },
    { name: 'Gold', min: 15, next: 30, multiplier: 1.65, label: '金' },
    { name: 'Hall of Fame', min: 30, next: null, multiplier: 2, label: '名人堂' }
  ]);
  const MANUAL_SHOT_QUARTERS = [1, 3, 4];
  const CARD_BACKS = [
    { id: 'champion', icon: '💍', name: 'CHAMPION', tone: 'text-amber-300', hint: '成為冠軍隊成員' },
    { id: 'fmvp', icon: '🏆', name: 'FINALS MVP', tone: 'text-yellow-200', hint: '獲得總決賽 MVP' },
    { id: 'mvp', icon: '👑', name: 'MVP', tone: 'text-orange-300', hint: '獲得例行賽 MVP' },
    { id: 'dpoy', icon: '🛡️', name: 'DPOY', tone: 'text-cyan-300', hint: '獲得年度最佳防守球員' },
    { id: 'record', icon: '⚡', name: 'RECORD BREAKER', tone: 'text-fuchsia-300', hint: '創下指定單場或生涯紀錄' },
    { id: 'legend', icon: '🐐', name: 'FRANCHISE LEGEND', tone: 'text-amber-200', hint: '8季、400場、1冠及1項重大榮譽' }
  ];
  const BADGE_STORIES = {
    '曼巴精神': [
      ['MAMBA MENTALITY','SWISH!','決勝節，比分緊咬。','兩名防守者立刻上前包夾。','{player} 後仰躍起。','高難度投籃空心命中！'],
      ['COLD BLOODED','CLUTCH!','進攻時間只剩五秒。','防守者封住突破路線。','{player} 急停轉身出手。','壓哨球命中，全場沸騰！'],
      ['TAKEOVER','ON FIRE!','對手連續追分逼近。','球隊需要有人站出來。','{player} 要求清空一側。','連續關鍵得分接管比賽！']
    ],
    '神射手': [
      ['SHARPSHOOTER','SPLASH!','隊友突破吸引協防。','球快速傳向底角。','{player} 接球立即出手。','三分穿網，籃網幾乎沒有晃動！'],
      ['LIMITLESS RANGE','BANG!','防守者退守禁區。','{player} 在標誌附近停步。','超遠三分果斷出手。','BANG！射程之外依然命中！'],
      ['HEAT CHECK','THREE!','{player} 已連中兩記外線。','對手換防仍慢了一步。','第三次接球再次拔起。','連續三分點燃主場！']
    ],
    '組織大師': [
      ['FLOOR GENERAL','DIMES!','防守陣形突然收縮。','{player} 掃視整座球場。','一記穿越防線的擊地傳球。','隊友輕鬆灌籃完成助攻！'],
      ['NO-LOOK PASS','WOW!','兩名防守者包夾持球者。','{player} 看向完全相反方向。','不看人傳球飛向底角。','空檔三分命中！'],
      ['PICK AND ROLL','LOB!','高位掩護形成錯位。','{player} 引誘中鋒上前。','皮球高高拋向籃框。','隊友空中接力灌籃！']
    ],
    '木桶伯': [
      ['NO FLY ZONE','BLOCK!','對手突破第一線防守。','進攻者起飛準備上籃。','{player} 從弱側衝出。','BLOCKED！直接搧出界外！'],
      ['NOT IN MY HOUSE','DENIED!','對手準備雙手重扣。','全場觀眾屏住呼吸。','{player} 在最高點等待。','正面封阻，禁區禁止通行！'],
      ['CHASEDOWN','REJECTED!','對手快攻已經領先半個身位。','{player} 從後方全速追趕。','籃板前伸出長臂。','追魂鍋把球釘在籃板上！']
    ],
    '禁區大鎖': [
      ['PAINT LOCK','STOPPED!','對手中鋒在低位要球。','連續背打逼近籃框。','{player} 穩住重心守住位置。','強迫對手投出高難度偏框球！'],
      ['VERTICAL WALL','NO EASY BUCKET!','後衛高速切入油漆區。','準備用身體製造碰撞。','{player} 垂直起跳封住角度。','乾淨防守讓上籃失手！'],
      ['SECOND EFFORT','GET THAT OUT!','第一次投籃遭到干擾。','對手搶到籃板再次起跳。','{player} 二次起跳更快。','補防封阻終結這次進攻！']
    ],
    '小偷': [
      ['PICKPOCKET','STEAL!','對手放慢速度準備單打。','運球稍微離開身體。','{player} 瞬間伸手切球。','抄截成功，快攻直接得分！'],
      ['PASSING LANE','INTERCEPTED!','對手嘗試橫傳弱側。','{player} 提前讀到傳球路線。','突然加速衝入路徑。','攔截傳球後一條龍上籃！'],
      ['STRIP','GOT IT!','對手強行切入人群。','皮球暴露在身體外側。','{player} 精準下手。','球被拍掉，球權轉換！']
    ],
    '外線大鎖': [
      ['LOCKDOWN','CLAMPED!','對方王牌準備單打。','{player} 緊貼持球者。','每個運球方向都被封鎖。','被迫倉促出手，投籃偏出！'],
      ['FULL COURT PRESS','8 SECONDS!','對手從後場開始推進。','{player} 全場貼身施壓。','持球者無法順利過半場。','八秒違例！防守成功！'],
      ['CONTEST','MISSED!','射手利用掩護獲得半步空間。','{player} 奮力繞過掩護。','長臂在出手瞬間封到眼前。','高品質干擾造成投籃不中！']
    ],
    '無私': [
      ['EXTRA PASS','WIDE OPEN!','{player} 得到一次空檔。','另一側隊友機會更好。','他放棄投籃多傳一次。','完全空檔三分命中！'],
      ['TEAM FIRST','AND-ONE!','快攻形成二打一。','{player} 可以自己完成上籃。','最後一刻把球送給隊友。','灌籃加罰，板凳席全站起來！'],
      ['SCREEN ASSIST','TEAMWORK!','隊友正被防守者緊追。','{player} 主動上前設下掩護。','防線被完全擋住。','隊友獲得乾淨出手機會！']
    ],
    '助人為樂': [
      ['CHEMISTRY','CONNECTED!','進攻一度陷入停滯。','{player} 招手重新組織。','連續傳導撕開防線。','全隊完成漂亮的團隊進球！'],
      ['TOUCH PASS','BEAUTIFUL!','傳球快速飛向{player}。','防守輪轉已經追上。','他不停球直接點傳。','下一位隊友接球完成得分！'],
      ['BACKDOOR','PERFECT PASS!','防守者過度壓迫外線。','隊友突然反跑切入。','{player} 精準送出提前量。','背門上籃輕鬆得手！']
    ],
    '第六人': [
      ['BENCH MOB','INSTANT IMPACT!','先發下場休息，比分被追近。','{player} 從板凳席起身。','上場第一個回合立即得分。','替補火力重新拉開差距！'],
      ['SIXTH MAN','MICROWAVE!','球隊進攻連續三回合失手。','教練把{player}換上場。','他連續命中兩記高難度投籃。','板凳暴徒瞬間改變比賽！'],
      ['ENERGY BOOST','HUSTLE!','地板球在兩名球員中間滾動。','{player} 從板凳登場後全速撲球。','救回球權並立刻衝向前場。','拼勁帶動全隊完成快攻！']
    ],
    '總決賽MVP': [
      ['CHAMPIONSHIP DNA','CHAMPION!','比賽進入最關鍵的時刻。','所有目光集中在{player}身上。','FMVP 經驗讓他保持冷靜。','冠軍級進球穩住勝局！'],
      ['FINALS MODE','LEGACY!','對手試圖用包夾迫使傳球。','{player} 讀懂防守意圖。','突破包夾後直衝籃框。','傳奇表現再次主宰大場面！'],
      ['TROPHY MOMENT','MVP!','球場壓力來到最高點。','{player} 接過最後一攻。','曾經的冠軍記憶再次浮現。','關鍵命中展現 FMVP 本色！']
    ]
  };

  const GAME_STRATEGIES = {
    balanced: { label: '均衡', short: 'BALANCED', desc: '維持正常節奏與平均出手分配。' },
    'feature-star': { label: '主攻球星', short: 'FEATURE STAR', desc: '增加當家球星出手機會，也會提高被針對與疲勞風險。' },
    'shoot-threes': { label: '增加外線', short: 'SHOOT MORE 3S', desc: '增加三分出手與比分波動，神射手 Moment 機會稍微提高。' },
    defense: { label: '優先防守', short: 'DEFENSE FIRST', desc: '降低比賽節奏並壓低對手效率，防守徽章更容易出現。' },
    'attack-paint': { label: '攻擊禁區', short: 'ATTACK PAINT', desc: '下半場增加禁區終結，讓內線球員更常參與進攻。' },
    'lock-down': { label: '鎖死對手', short: 'LOCK DOWN', desc: '下半場犧牲一些節奏，集中壓低對方得分。' }
  };

  let activeGame = null;
  let visualGameState = null;
  let visualEventTimer = null;
  let activeComic = null;
  let shootingChallenge = null;
  let energyTimer = null;
  let autoMode = { running: false, remaining: 0, timer: null };

  function now() { return Date.now(); }
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function safeText(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[ch]);
  }
  function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function randomOf(list) { return list[Math.floor(Math.random() * list.length)]; }

  function badgeTierForTriggers(triggers) {
    const count = Math.max(0, Number(triggers) || 0);
    return [...BADGE_TIER_STEPS].reverse().find(tier => count >= tier.min) || BADGE_TIER_STEPS[0];
  }

  function ensureBadgeProgress(card, badgeName) {
    ensureCardJourney(card);
    if (!card.badgeJourney.badges[badgeName]) {
      const legacySeed = Object.keys(card.badgeJourney.badges).length === 0 ? card.badgeJourney.triggers : 0;
      card.badgeJourney.badges[badgeName] = { triggers: legacySeed, tier: badgeTierForTriggers(legacySeed).name };
    }
    const progress = card.badgeJourney.badges[badgeName];
    progress.triggers = Math.max(0, Number(progress.triggers) || 0);
    progress.tier = badgeTierForTriggers(progress.triggers).name;
    return progress;
  }

  function badgeTierInfo(card, badgeName) {
    const progress = ensureBadgeProgress(card, badgeName);
    return badgeTierForTriggers(progress.triggers);
  }

  function normalizePositions(player) {
    const raw = player?.positions ?? player?.pos ?? '';
    if (Array.isArray(raw)) return raw.map(String);
    return String(raw).split(/[,/\s-]+/).filter(Boolean);
  }

  function playerOvr(player) {
    return Number(player?.realOvr || player?.baseOvr || player?.ovr || 75);
  }

  function getOpponentRoster(game) {
    if (!game) return [];
    if (Array.isArray(game.opponentRoster) && game.opponentRoster.length === 5) return game.opponentRoster;
    const code = TEAM_CODES[game.opponent];
    const pool = typeof NBA_PLAYERS !== 'undefined'
      ? NBA_PLAYERS.filter(player => player.team === code && String(player.edition || '') === '26')
      : [];
    const unused = [...pool].sort((a, b) => playerOvr(b) - playerOvr(a));
    const roster = LINEUP_POSITIONS.map((position, index) => {
      let foundAt = unused.findIndex(player => normalizePositions(player).includes(position));
      if (foundAt < 0) foundAt = 0;
      const player = unused.splice(foundAt, 1)[0];
      return player
        ? { position, name: player.name, ovr: playerOvr(player), nbaId: player.nbaId || 0 }
        : { position, name: `${game.opponent} ${position}`, ovr: clamp(game.opponentOvr + (index === 2 ? 2 : randomInt(-3, 2)), 72, 98), nbaId: 0 };
    });
    game.opponentRoster = roster;
    return roster;
  }

  function scoutOpponent(game) {
    if (game?.scouting && Array.isArray(game.scouting.ratings) && game.scouting.ratings.length) return game.scouting;
    const roster = getOpponentRoster(game);
    const byPos = Object.fromEntries(roster.map(player => [player.position, player]));
    const avg = values => Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length));
    const ratings = [
      { key: '外線防守', icon: '🔥', value: clamp(avg(['PG','SG','SF'].map(pos => byPos[pos]?.ovr || game.opponentOvr)) + randomInt(-3, 2), 70, 98) },
      { key: '側翼得分', icon: '🔥', value: clamp(avg(['SF','PF'].map(pos => byPos[pos]?.ovr || game.opponentOvr)) + randomInt(-2, 3), 70, 98) },
      { key: '禁區護框', icon: '🛡️', value: clamp(avg(['PF','C'].map(pos => byPos[pos]?.ovr || game.opponentOvr)) + randomInt(-3, 2), 70, 98) },
      { key: '防守籃板', icon: '🏀', value: clamp(avg(['PF','C'].map(pos => byPos[pos]?.ovr || game.opponentOvr)) + randomInt(-4, 2), 68, 98) },
      { key: '替補火力', icon: '⚡', value: clamp(game.opponentOvr + randomInt(-8, 2), 68, 96) }
    ];
    game.scouting = {
      ratings,
      strengths: [...ratings].sort((a, b) => b.value - a.value).slice(0, 3),
      weaknesses: [...ratings].sort((a, b) => a.value - b.value).slice(0, 2)
    };
    return game.scouting;
  }

  function buildSchedule() {
    const rivalryAt = randomInt(10, 15);
    const christmasAt = randomInt(23, 28);
    return Array.from({ length: SEASON_LENGTH }, (_, index) => {
      const game = index + 1;
      let special = null;
      if (game === 1) special = { key: 'opening', icon: '🏟️', label: 'Opening Night' };
      else if (game === rivalryAt) special = { key: 'rivalry', icon: '⚔️', label: 'Rivalry Game' };
      else if (game === christmasAt) special = { key: 'christmas', icon: '🔥', label: 'Christmas Game' };
      else if (game === 41) special = { key: 'allstar', icon: '⭐', label: 'All-Star Break' };
      else if (game === 55) special = { key: 'deadline', icon: '🔄', label: 'Trade Deadline' };
      else if (game === 82) special = { key: 'finale', icon: '🏁', label: 'Regular Season Finale' };
      return {
        game, opponent: randomOf(OPPONENTS), opponentOvr: randomInt(78, 94),
        opponentWins: clamp(Math.round(game * (0.38 + Math.random() * .35)), 0, game), special,
        played: false, win: null, myScore: null, oppScore: null, boxScore: null, moments: []
      };
    });
  }

  function ensureCardJourney(card) {
    if (!card) return;
    if (!card.legacy || typeof card.legacy !== 'object') {
      card.legacy = { seasons: 0, games: 0, pts: 0, reb: 0, ast: 0, rings: 0, mvps: 0, fmvps: 0, traits: [] };
    }
    if (!Array.isArray(card.achievementBacks)) card.achievementBacks = [];
    if (!Array.isArray(card.legacy.traits)) card.legacy.traits = [];
    if (!card.badgeJourney || typeof card.badgeJourney !== 'object') {
      card.badgeJourney = { triggers: 0, mastery: 'Bronze', moments: [], badges: {} };
    }
    if (!Array.isArray(card.badgeJourney.moments)) card.badgeJourney.moments = [];
    if (!card.badgeJourney.badges || typeof card.badgeJourney.badges !== 'object') card.badgeJourney.badges = {};
    card.badgeJourney.triggers = Math.max(0, Number(card.badgeJourney.triggers) || 0);
    card.badgeJourney.mastery = badgeTierForTriggers(card.badgeJourney.triggers).name;
    syncHistoricalBacks(card);
  }

  function moraleValue(card) { return clamp(Number(card?.morale?.value || 0), -1, 1); }
  function moraleAdjustedCard(card) { return { ...card, ovr: Number(card?.ovr || card?.baseOvr || 75) + moraleValue(card) }; }
  function moraleStatus(value) { return value > 0 ? 'hot' : (value < 0 ? 'cold' : 'normal'); }
  function findActiveCardByName(name) {
    const lineup = ['PG','SG','SF','PF','C'].map(pos => state.startingLineup[pos]).filter(Boolean)
      .concat((state.benchLineup || []).filter(Boolean));
    return lineup.find(card => card.name === name) || (state.inventory || []).find(card => card?.name === name);
  }

  function updateTeamMorale(gameData, win, currentStreak) {
    const rows = gameData?.boxScore || [];
    rows.forEach(stat => {
      const card = findActiveCardByName(stat.name);
      if (!card) return;
      const baseOvr = Number(card.ovr || card.baseOvr || 75);
      const performance = (stat.pts || 0) + (stat.reb || 0) * 1.15 + (stat.ast || 0) * 1.4
        + (stat.stl || 0) * 2.1 + (stat.blk || 0) * 2.1 - (stat.tov || 0) * 1.5
        + clamp(Number(stat.plusMinus || 0), -20, 20) * .18;
      const expected = stat.role === 'bench'
        ? 19 + Math.max(0, baseOvr - 75) * .72
        : 34 + Math.max(0, baseOvr - 80) * 1.05;
      const streakBias = clamp((win ? 1 : -1) * (0.9 + Math.min(4, Math.abs(currentStreak || 0)) * .28), -2.1, 2.1);
      const score = performance - expected + streakBias + (Math.random() * 6 - 3);
      const value = score >= 5.5 ? 1 : (score <= -5.5 ? -1 : 0);
      card.morale = {
        value, status: moraleStatus(value), score: Number(score.toFixed(1)),
        lastGame: state.seasonJourney?.gameIndex || 0, updatedAt: new Date().toISOString()
      };
    });
  }

  function pauseAutoForEvent(label) {
    if (!autoMode.running) return;
    autoMode.running = false;
    autoMode.pausedForEvent = true;
    if (autoMode.timer) clearTimeout(autoMode.timer);
    autoMode.timer = null;
    const status = document.getElementById('sjAutoStatus');
    if (status) status.textContent = `暫停：${label}`;
  }

  function resumeAutoAfterEvent() {
    if (!autoMode.pausedForEvent) return;
    autoMode.pausedForEvent = false;
    autoMode.running = true;
    renderJourneySeasonTab();
    scheduleAutoDrive(1200);
  }

  function triggerSpecialGameEvent(item, gameData, silent = false) {
    if (!item || item.eventResolved) return;
    const special = dynamicSpecial(item);
    if (!special) return;
    item.eventResolved = true;
    item.resolvedSpecial = special;
    const notify = (title, message) => {
      if (typeof addNotification === 'function') addNotification({ title, message, icon: special.icon, type: 'achievement' });
      if (!silent && typeof showGameAlert === 'function') showGameAlert({ title, message, type: 'info' });
    };

    if (special.key === 'opening') {
      notify('🏟️ Opening Night 完成', `${state.seasonJourney.teamName} 正式展開 Season ${state.seasonJourney.seasonNo} 的旅程。`);
    } else if (special.key === 'rivalry') {
      notify('⚔️ Rivalry Game', `${item.opponent} 宿敵戰落幕，本場已套用較高的 Badge Moment 觸發機率。`);
    } else if (special.key === 'christmas') {
      if (!state.isAdmin) grantEnergy(1, 'Christmas Game 紀念獎勵');
      notify('🔥 Christmas Game', '聖誕大戰完成，獲得紀念體力球 1 顆。');
    } else if (special.key === 'allstar') {
      const totals = {};
      state.seasonJourney.schedule.slice(0, 41).forEach(game => (game.boxScore || []).forEach(row => {
        totals[row.name] = (totals[row.name] || 0) + Number(row.pts || 0);
      }));
      const topName = Object.keys(totals).sort((a,b) => totals[b] - totals[a])[0];
      const card = (state.inventory || []).find(player => player?.name === topName) || state.startingLineup.SG || state.startingLineup.PG;
      state.tickets += 2;
      state.scoutPoints = (Number(state.scoutPoints) || 0) + 30;
      if (card) {
        document.getElementById('asgPlayerImg').src = getPlayerImgUrl(card.nbaId);
        document.getElementById('asgPlayerName').textContent = card.name;
        document.getElementById('asgPlayerStats').textContent = `前 41 場場均 ${(Number(totals[card.name] || 0) / 41).toFixed(1)} 分`;
      }
      if (silent) notify('⭐ All-Star Break', `${card?.name || '球隊核心'} 入選明星賽，獲得 2 張抽卡券與 30 選秀碎片。`);
      else {
        pauseAutoForEvent('All-Star Break');
        const modal = document.getElementById('allStarEventModal');
        if (modal) { modal.classList.remove('hidden'); modal.style.display = 'flex'; }
      }
    } else if (special.key === 'deadline') {
      const activeRoster = [];
      ['PG','SG','SF','PF','C'].forEach(pos => {
        const card = state.startingLineup[pos];
        if (card && !card.isLegend) activeRoster.push({ card, role: 'starter', slot: pos, posDesc: `先發 ${pos}` });
      });
      (state.benchLineup || []).forEach((card, idx) => { if (card && !card.isLegend) activeRoster.push({ card, role: 'bench', slot: idx, posDesc: `第 ${idx + 1} 替補` }); });
      if (activeRoster.length && typeof NBA_PLAYERS !== 'undefined') {
        const offer = randomOf(activeRoster);
        const pool = NBA_PLAYERS.filter(player => player.name !== offer.card.name && Math.abs(Number(player.ovr || 0) - Number(offer.card.ovr || 0)) <= 3);
        const target = randomOf(pool.length ? pool : NBA_PLAYERS);
        pendingTradeContext = { giveCard: offer.card, targetPlayer: target, lineupRole: offer.role, lineupSlot: offer.slot };
        document.getElementById('tradeOfferTeamBadge').textContent = `來自 ${target.team} 的互換提案`;
        document.getElementById('tradeGiveImg').src = getPlayerImgUrl(offer.card.nbaId);
        document.getElementById('tradeGiveName').textContent = `${offer.card.name} (${offer.posDesc})`;
        document.getElementById('tradeGiveOvr').textContent = `OVR ${offer.card.ovr} (${offer.card.team})`;
        document.getElementById('tradeGetImg').src = getPlayerImgUrl(target.nbaId || target.id);
        document.getElementById('tradeGetName').textContent = target.name;
        document.getElementById('tradeGetOvr').textContent = `OVR ${target.ovr} (${target.team})`;
        if (silent) {
          notify('🔄 Trade Deadline', `收到以 ${offer.card.name} 交換 ${target.name} 的報價；快速模擬已自動保留原陣容。`);
          pendingTradeContext = null;
        }
        else {
          pauseAutoForEvent('Trade Deadline');
          const modal = document.getElementById('tradeDeadlineModal');
          if (modal) { modal.classList.remove('hidden'); modal.style.display = 'flex'; }
        }
      }
    } else if (special.key === 'race') {
      notify('📈 Playoff Race', `目前戰績 ${state.seasonJourney.wins}-${state.seasonJourney.losses}，每場勝負都可能改變季後賽順位。`);
    } else if (special.key === 'mustwin') {
      notify('⚠️ Must Win 結果', gameData.win ? '球隊頂住壓力拿下關鍵勝利！' : '關鍵戰失利，最後排名將受到影響。');
    } else if (special.key === 'finale') {
      notify('🏁 Regular Season Finale', `例行賽以 ${state.seasonJourney.wins}-${state.seasonJourney.losses} 收官，正式進入季後賽資格結算。`);
    }
  }

  function unlockBack(card, id, detail) {
    ensureCardJourney(card);
    if (card.achievementBacks.some(item => item.id === id)) return false;
    card.achievementBacks.push({ id, unlockedAt: new Date().toISOString(), detail: detail || '' });
    if (!card.activeCardBack) card.activeCardBack = id;
    return true;
  }

  function syncHistoricalBacks(card) {
    if (!card || !card.legacy || !Array.isArray(card.achievementBacks)) return;
    const legacy = card.legacy;
    if ((legacy.rings || 0) > 0 && !card.achievementBacks.some(x => x.id === 'champion')) {
      card.achievementBacks.push({ id: 'champion', unlockedAt: new Date().toISOString(), detail: `冠軍 ×${legacy.rings}` });
    }
    if ((legacy.fmvps || 0) > 0 && !card.achievementBacks.some(x => x.id === 'fmvp')) {
      card.achievementBacks.push({ id: 'fmvp', unlockedAt: new Date().toISOString(), detail: `FMVP ×${legacy.fmvps}` });
    }
    if ((legacy.mvps || 0) > 0 && !card.achievementBacks.some(x => x.id === 'mvp')) {
      card.achievementBacks.push({ id: 'mvp', unlockedAt: new Date().toISOString(), detail: `MVP ×${legacy.mvps}` });
    }
    if ((legacy.dpoys || 0) > 0 && !card.achievementBacks.some(x => x.id === 'dpoy')) {
      card.achievementBacks.push({ id: 'dpoy', unlockedAt: new Date().toISOString(), detail: `DPOY ×${legacy.dpoys}` });
    }
    const major = (legacy.mvps || 0) + (legacy.fmvps || 0) + (legacy.dpoys || 0) + (legacy.records || 0);
    if ((legacy.seasons || 0) >= 8 && (legacy.games || 0) >= 400 && (legacy.rings || 0) >= 1 && major >= 1 && !card.achievementBacks.some(x => x.id === 'legend')) {
      card.achievementBacks.push({ id: 'legend', unlockedAt: new Date().toISOString(), detail: `${legacy.seasons}季・${legacy.games}場` });
    }
  }

  function ensureJourneyState() {
    if (!state.seasonJourney || typeof state.seasonJourney !== 'object') {
      state.seasonJourney = {
        version: 2, seasonNo: 1, teamName: PLAYER_TEAM_FALLBACK,
        gameIndex: 0, wins: 0, losses: 0, streak: 0, bestStreak: 0,
        schedule: buildSchedule(), recent: [], history: [], completed: false,
        seasonStartedAt: new Date().toISOString()
      };
    }
    const journey = state.seasonJourney;
    journey.version = 2;
    if (!Array.isArray(journey.schedule) || journey.schedule.length !== SEASON_LENGTH) journey.schedule = buildSchedule();
    if (!Array.isArray(journey.recent)) journey.recent = [];
    if (!Array.isArray(journey.history)) journey.history = [];
    if (!Array.isArray(journey.awards)) journey.awards = [];
    journey.teamName = String(journey.teamName || PLAYER_TEAM_FALLBACK).slice(0, 24);
    journey.gameIndex = clamp(Number(journey.gameIndex) || 0, 0, SEASON_LENGTH);
    journey.schedule.forEach(game => {
      if (!Array.isArray(game.moments)) game.moments = [];
      if (game.played && !game.analysis) game.analysis = null;
    });

    if (!state.seasonEnergy || typeof state.seasonEnergy !== 'object') {
      state.seasonEnergy = { current: ENERGY_MAX, lastRegenAt: now() };
    }
    state.seasonEnergy.current = Math.max(0, Number(state.seasonEnergy.current));
    state.seasonEnergy.lastRegenAt = Number(state.seasonEnergy.lastRegenAt) || now();
    applyEnergyRegen();
    (state.inventory || []).forEach(ensureCardJourney);
  }

  function applyEnergyRegen() {
    const energy = state.seasonEnergy;
    if (!energy) return false;
    if (energy.current >= ENERGY_MAX) {
      energy.lastRegenAt = now();
      return false;
    }
    const elapsed = Math.max(0, now() - energy.lastRegenAt);
    const recovered = Math.floor(elapsed / ENERGY_REGEN_MS);
    if (recovered <= 0) return false;
    energy.current = Math.min(ENERGY_MAX, energy.current + recovered);
    energy.lastRegenAt += recovered * ENERGY_REGEN_MS;
    if (energy.current >= ENERGY_MAX) energy.lastRegenAt = now();
    return true;
  }

  function spendEnergy() {
    if (state.isAdmin) return true;
    applyEnergyRegen();
    const energy = state.seasonEnergy;
    if (energy.current < 1) return false;
    const before = energy.current;
    energy.current -= 1;
    if (before >= ENERGY_MAX && energy.current < ENERGY_MAX) energy.lastRegenAt = now();
    saveGame();
    return true;
  }

  function grantEnergy(amount, reason) {
    ensureJourneyState();
    const before = state.seasonEnergy.current;
    const previousTimer = state.seasonEnergy.lastRegenAt;
    state.seasonEnergy.current += amount;
    state.seasonEnergy.lastRegenAt = before < ENERGY_MAX && state.seasonEnergy.current < ENERGY_MAX
      ? previousTimer
      : now();
    saveGame();
    if (typeof showToast === 'function') showToast(`🏀 ${reason}：體力球 +${amount}`, 'success');
    renderEnergy();
  }

  function energyCountdown() {
    const energy = state.seasonEnergy;
    if (!energy || energy.current >= ENERGY_MAX) return '體力達到 15 以上，暫停自然恢復';
    const remain = Math.max(0, ENERGY_REGEN_MS - (now() - energy.lastRegenAt));
    const min = String(Math.floor(remain / 60000)).padStart(2, '0');
    const sec = String(Math.floor((remain % 60000) / 1000)).padStart(2, '0');
    return `下一球 ${min}:${sec}`;
  }

  function renderEnergy() {
    if (!state.seasonEnergy) return;
    if (applyEnergyRegen()) saveGame();
    const count = document.getElementById('sjEnergyCount');
    const timer = document.getElementById('sjEnergyTimer');
    if (count) count.textContent = state.isAdmin ? '∞' : `${state.seasonEnergy.current}/${ENERGY_MAX}`;
    if (timer) timer.textContent = state.isAdmin ? '管理員無限體力' : energyCountdown();
  }

  function currentGameInfo() {
    const journey = state.seasonJourney;
    return journey.schedule[Math.min(journey.gameIndex, SEASON_LENGTH - 1)];
  }

  function dynamicSpecial(game) {
    if (!game) return null;
    const journey = state.seasonJourney;
    if (game.game === 81) {
      const projected = journey.wins + Math.round((SEASON_LENGTH - journey.gameIndex) * .5);
      if (projected >= 38 && projected <= 50) return { key: 'mustwin', icon: '⚠️', label: 'Must Win / Clinching Scenario' };
    }
    if (game.game >= 70 && game.game < 82) {
      const projected = journey.wins + Math.round((SEASON_LENGTH - journey.gameIndex) * .5);
      if (projected >= 36 && projected <= 52) return { key: 'race', icon: '📈', label: 'Playoff Race' };
    }
    return game.special;
  }

  function rankLabel() {
    const j = state.seasonJourney;
    if (!j.gameIndex) return '尚未排名';
    const pct = j.wins / j.gameIndex;
    if (pct >= .72) return '西區第 1 名';
    if (pct >= .64) return '西區第 2–3 名';
    if (pct >= .56) return '西區第 4–6 名';
    if (pct >= .46) return '西區第 7–10 名';
    return '西區第 11–15 名';
  }

  function getSeasonRoadSteps() {
    const j = state.seasonJourney;
    const savedPlayoffs = j?.playoffs && Number(j.playoffs.seasonNo) === Number(j.seasonNo)
      ? j.playoffs
      : null;
    const playoffRound = Math.max(0, Number(savedPlayoffs?.round || 0));
    const playoffStatus = savedPlayoffs?.status || '';
    const latestHistory = [...(j.history || [])].reverse().find(item => Number(item.season) === Number(j.seasonNo));
    const isChampion = latestHistory?.result === 'NBA Champion'
      || (state.season?.hasPlayedPlayoffs && Number(state.playoffStats?.wins || 0) >= 16);
    const reachedFinals = playoffRound >= 3 || Number(state.playoffStats?.wins || 0) >= 12;
    const playoffsEligible = j.completed && (j.wins >= 42 || j.playInWon);

    const regular = {
      icon: j.completed ? '✓' : '82',
      label: 'REGULAR',
      detail: j.completed ? `${j.wins}-${j.losses} 完成` : `${j.gameIndex}/82`,
      state: j.completed ? 'done' : 'active'
    };

    let playIn = { icon: 'PI', label: 'PLAY-IN', detail: '資格線', state: 'locked' };
    if (j.completed) {
      if (j.wins >= 42) playIn = { icon: '↗', label: 'PLAY-IN', detail: 'TOP 6 BYE', state: 'bye' };
      else if (j.wins < 36) playIn = { icon: '×', label: 'PLAY-IN', detail: '未取得資格', state: 'out' };
      else if (!j.playInResolved) playIn = { icon: '!', label: 'PLAY-IN', detail: '一場定生死', state: 'active' };
      else if (j.playInWon) playIn = { icon: '✓', label: 'PLAY-IN', detail: `${j.playInResult?.myScore ?? ''}-${j.playInResult?.oppScore ?? ''} 晉級`, state: 'done' };
      else playIn = { icon: '×', label: 'PLAY-IN', detail: '本季止步', state: 'out' };
    }

    let playoffs = { icon: 'PO', label: 'PLAYOFFS', detail: 'Best of 7', state: 'locked' };
    if (playoffsEligible) {
      if (!state.season?.hasPlayedPlayoffs && !savedPlayoffs) playoffs = { icon: '▶', label: 'PLAYOFFS', detail: '等待開打', state: 'active' };
      else if (playoffStatus === 'eliminated') playoffs = { icon: '×', label: 'PLAYOFFS', detail: `止步 Round ${Math.max(1, playoffRound)}`, state: 'out' };
      else if (playoffRound >= 3 || playoffStatus === 'complete') playoffs = { icon: '✓', label: 'PLAYOFFS', detail: '完成分區征途', state: 'done' };
      else playoffs = { icon: Math.max(1, playoffRound + 1), label: 'PLAYOFFS', detail: `Round ${Math.max(1, playoffRound + 1)}`, state: 'active' };
    } else if (j.playInResolved && !j.playInWon) {
      playoffs = { icon: '×', label: 'PLAYOFFS', detail: '未晉級', state: 'out' };
    }

    let finals = { icon: 'F', label: 'FINALS', detail: '總冠軍賽', state: 'locked' };
    if (reachedFinals && playoffStatus !== 'complete') finals = { icon: '★', label: 'FINALS', detail: '爭奪冠軍', state: 'active' };
    if (playoffStatus === 'complete' || (state.season?.hasPlayedPlayoffs && isChampion)) {
      finals = isChampion
        ? { icon: '🏆', label: 'FINALS', detail: 'NBA CHAMPION', state: 'done' }
        : { icon: '✓', label: 'FINALS', detail: '賽季落幕', state: 'done' };
    }

    return [regular, playIn, playoffs, finals];
  }

  function renderJourneyShell() {
    const host = document.getElementById('tab-season');
    if (!host) return;
    host.innerHTML = `
      <div class="sj-shell space-y-4">
        <span id="seasonLimitTip" class="hidden">Season Journey Energy</span>
        <section class="sj-scoreboard rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
          <div class="p-4 sm:p-6 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div class="sj-kicker text-[10px] font-black text-amber-400">Season Journey · Season <span id="sjSeasonNo">1</span></div>
              <div class="flex items-center gap-2 mt-1">
                <h2 id="sjTeamName" class="text-xl sm:text-2xl font-black text-white"></h2>
                <button onclick="editJourneyTeamName()" class="text-slate-500 hover:text-amber-300 text-xs" title="修改球隊名稱">✎</button>
              </div>
              <p class="text-xs text-slate-500 mt-1">逐場寫下你的 82 場球季，不再一次跳過整季。</p>
            </div>
            <div class="flex items-center gap-3 bg-slate-950/80 border border-slate-800 rounded-2xl px-3 py-2.5">
              <span class="sj-energy-ball">🏀</span>
              <div>
                <div class="text-[10px] text-slate-500 font-bold">GAME ENERGY</div>
                <div class="flex items-baseline gap-2"><b id="sjEnergyCount" class="text-lg text-white font-mono">15/15</b><span id="sjEnergyTimer" class="text-[10px] text-amber-400"></span></div>
              </div>
            </div>
          </div>

          <div class="sj-season-road" aria-label="賽季完整旅程">
            <div class="sj-season-road__eyebrow"><span>ROAD TO THE FINALS</span><strong>82 GAMES → CHAMPIONSHIP</strong></div>
            <div id="sjSeasonRoad" class="sj-season-road__track" role="list"></div>
          </div>

          <div class="p-4 sm:p-6 grid lg:grid-cols-[1.2fr_.8fr] gap-4">
            <div class="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5">
              <div class="flex items-center justify-between gap-2">
                <span id="sjGameLabel" class="sj-kicker text-xs font-black text-slate-300">GAME 1 / 82</span>
                <span id="sjSpecialLabel" class="text-[10px] font-black text-amber-300 bg-amber-950/40 border border-amber-700/40 rounded-full px-2.5 py-1"></span>
              </div>
              <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 my-5 text-center">
                <div><div id="sjHomeName" class="font-black text-white text-lg truncate"></div><div id="sjHomeRecord" class="text-emerald-400 font-mono text-sm">0-0</div></div>
                <div class="text-slate-600 font-black text-xl">VS</div>
                <div><div id="sjAwayName" class="font-black text-white text-lg truncate"></div><div id="sjAwayRecord" class="text-rose-300 font-mono text-sm">0-0</div></div>
              </div>
              <div class="grid grid-cols-3 gap-2 text-center text-[10px]">
                <div class="rounded-xl bg-slate-900 border border-slate-800 p-2"><span class="text-slate-500 block">分區排名</span><b id="sjRank" class="text-slate-200"></b></div>
                <div class="rounded-xl bg-slate-900 border border-slate-800 p-2"><span class="text-slate-500 block">近期戰績</span><b id="sjRecent" class="text-slate-200"></b></div>
                <div class="rounded-xl bg-slate-900 border border-slate-800 p-2"><span class="text-slate-500 block">關鍵對位</span><b id="sjMatchup" class="text-slate-200"></b></div>
              </div>
              <button id="simSeasonBtn" onclick="start82GamesSimulation()" class="mt-4 w-full bg-amber-500 hover:bg-amber-400 active:scale-[.99] text-slate-950 font-black py-3.5 rounded-2xl text-sm transition shadow-lg">🏀 進入本場比賽</button>
              <button id="playoffBtn" onclick="openJourneyPostseason()" class="hidden mt-3 w-full bg-orange-500 hover:bg-orange-400 text-slate-950 font-black py-3 rounded-2xl text-sm">🏆 進入 Play-In / Playoffs</button>
              <div id="sjAutoControls" class="mt-3 rounded-2xl bg-slate-900 border border-slate-800 p-3">
                <div class="flex justify-between items-center"><b class="text-[10px] text-slate-300 sj-kicker">掛機模式</b><span id="sjAutoStatus" class="text-[10px] text-slate-500">尚未啟動</span></div>
                <div class="grid grid-cols-[1fr_auto] gap-2 mt-2">
                  <input id="sjAutoCount" type="number" min="1" value="1" class="min-w-0 bg-slate-950 border border-slate-700 rounded-xl px-3 text-xs text-white" placeholder="自動比賽場數">
                  <button id="sjAutoBtn" onclick="toggleJourneyAutoMode()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-4 py-2.5 rounded-xl text-xs">開始掛機</button>
                </div>
                <p class="text-[9px] text-slate-500 mt-2">依正常速度逐節播放；漫畫自動翻頁。可隨時停止。</p>
              </div>
            </div>
            <div class="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
              <div class="flex justify-between items-center"><h3 class="text-xs font-black text-white">預計先發</h3><span class="text-[10px] text-slate-500">球員狀態</span></div>
              <div id="sjStarters" class="mt-3 space-y-2"></div>
            </div>
          </div>
        </section>

        <section class="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-5">
          <div class="flex justify-between items-center mb-3"><h3 class="text-xs font-black text-white sj-kicker">82-Game Tracker</h3><span id="sjRecord" class="text-sm font-mono font-black text-amber-400">0-0</span></div>
          <div id="gameGrid" class="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-[repeat(21,minmax(0,1fr))] gap-1"></div>
        </section>
        <section class="grid md:grid-cols-2 gap-4">
          <div class="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-5">
            <div class="flex justify-between items-center mb-3"><h3 class="text-xs font-black text-white sj-kicker">Franchise Legacy</h3><span class="text-[10px] text-slate-500">永久球季紀錄</span></div>
            <div id="sjLegacyList" class="space-y-2"></div>
          </div>
          <div class="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-5">
            <div class="flex justify-between items-center mb-3"><h3 class="text-xs font-black text-white sj-kicker">Moment Collection</h3><span id="sjMomentCount" class="text-[10px] text-amber-400"></span></div>
            <div id="sjMomentList" class="space-y-2"></div>
          </div>
        </section>
        <section id="sjAwardsSection" class="hidden bg-gradient-to-br from-amber-950/35 to-slate-900 border border-amber-500/30 rounded-3xl p-4 sm:p-5">
          <div class="flex justify-between items-center mb-3"><div><div class="text-[10px] text-amber-400 font-black sj-kicker">Season Honors</div><h3 class="text-sm font-black text-white mt-1">年度獎項</h3></div><span class="text-2xl">🏆</span></div>
          <div id="sjAwardsList" class="grid sm:grid-cols-2 lg:grid-cols-4 gap-2"></div>
        </section>
        <section id="sjAdminPanel" class="hidden bg-indigo-950/30 border border-indigo-500/40 rounded-3xl p-4 sm:p-5">
          <div class="flex justify-between items-center"><div><div class="text-[10px] text-indigo-300 font-black sj-kicker">Administrator Simulator</div><h3 class="text-sm font-black text-white mt-1">管理員快速測試</h3></div><span class="text-xs text-amber-300 font-black">🏀 ∞</span></div>
          <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-4">
            <div class="grid grid-cols-[1fr_auto] gap-1.5"><input id="sjAdminTarget" type="number" min="1" max="82" value="82" class="min-w-0 bg-slate-950 border border-indigo-700/50 rounded-xl px-3 text-xs text-white" placeholder="模擬到第幾場"><button onclick="adminSimulateToInput()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-3 rounded-xl text-xs">執行</button></div>
            <button onclick="adminSimulateFullSeason()" class="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-xs">一鍵完成例行賽</button>
            <button onclick="adminSimulatePlayoffs()" class="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl text-xs">一鍵奪冠測試</button>
            <button onclick="openAdminBackPreview()" class="bg-fuchsia-700 hover:bg-fuchsia-600 text-white font-black py-2.5 rounded-xl text-xs">預覽全部卡背</button>
          </div>
        </section>
      </div>`;
  }

  function renderJourneySeasonTab() {
    ensureJourneyState();
    if (!document.getElementById('sjGameLabel')) renderJourneyShell();
    const j = state.seasonJourney;
    const game = currentGameInfo();
    const special = dynamicSpecial(game);
    const starters = ['PG','SG','SF','PF','C'].map(pos => ({ pos, card: state.startingLineup[pos] })).filter(x => x.card);
    const top = [...starters].sort((a,b) => (Number(b.card.ovr || 0) + moraleValue(b.card)) - (Number(a.card.ovr || 0) + moraleValue(a.card)));
    const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    set('sjSeasonNo', j.seasonNo);
    set('sjTeamName', j.teamName);
    set('sjGameLabel', j.completed ? 'REGULAR SEASON COMPLETE' : `GAME ${j.gameIndex + 1} / ${SEASON_LENGTH}`);
    set('sjHomeName', j.teamName);
    set('sjHomeRecord', `${j.wins}-${j.losses}`);
    set('sjAwayName', game ? game.opponent : '—');
    set('sjAwayRecord', game ? `${game.opponentWins}-${Math.max(0, game.game - 1 - game.opponentWins)}` : '—');
    set('sjRank', rankLabel());
    set('sjRecent', j.recent.length ? j.recent.slice(-5).map(x => x.win ? 'W' : 'L').join(' ') : '—');
    set('sjMatchup', top.length >= 2 ? `${top[0].card.name} × ${game.opponent}` : '補齊先發');
    set('sjRecord', `${j.wins}-${j.losses}`);
    const seasonRoad = document.getElementById('sjSeasonRoad');
    if (seasonRoad) seasonRoad.innerHTML = getSeasonRoadSteps().map(step => `
      <div class="sj-season-road__stage" data-state="${step.state}" role="listitem">
        <div class="sj-season-road__marker">${step.icon}</div>
        <b>${step.label}</b>
        <span>${safeText(step.detail)}</span>
      </div>`).join('');
    const specialEl = document.getElementById('sjSpecialLabel');
    if (specialEl) {
      specialEl.textContent = special ? `${special.icon} ${special.label}` : 'REGULAR GAME';
      specialEl.classList.toggle('invisible', !special);
    }
    const starterEl = document.getElementById('sjStarters');
    if (starterEl) starterEl.innerHTML = starters.length ? starters.map(({pos, card}) => {
      const morale = moraleValue(card);
      const statusText = morale > 0 ? '🔥 狀態火熱 +1' : (morale < 0 ? '🧊 狀態不好 -1' : '➖ 狀態普通');
      const statusClass = morale > 0 ? 'text-emerald-400' : (morale < 0 ? 'text-sky-400' : 'text-slate-500');
      return `
      <div class="flex items-center justify-between rounded-xl bg-slate-900/80 border border-slate-800 px-3 py-2">
        <div class="min-w-0"><span class="text-[9px] text-amber-400 font-black mr-2">${pos}</span><span class="text-xs text-white font-bold">${safeText(card.name)}</span></div>
        <div class="text-right"><b class="text-xs font-mono text-slate-200">${Number(card.ovr || card.baseOvr || 75) + morale}</b><span class="block text-[9px] ${statusClass}">${statusText}</span></div>
      </div>`;
    }).join('') : '<p class="text-xs text-slate-500 py-8 text-center">請先到陣容頁補齊先發五人</p>';
    const grid = document.getElementById('gameGrid');
    if (grid) grid.innerHTML = j.schedule.map(item => {
      const cls = item.played ? (item.win ? 'is-win' : 'is-loss') : (item.game === j.gameIndex + 1 && !j.completed ? 'is-current' : '');
      return `<div class="sj-game-cell ${cls} rounded-md border border-slate-800 bg-slate-950 flex items-center justify-center text-[10px] font-mono" title="Game ${item.game} vs ${safeText(item.opponent)}">${item.played ? (item.win ? 'W' : 'L') : item.game}</div>`;
    }).join('');
    const btn = document.getElementById('simSeasonBtn');
    if (btn) {
      const mayStartNext = j.completed && (j.wins < 36 || !!state.season.hasPlayedPlayoffs);
      btn.disabled = j.completed && !mayStartNext;
      btn.textContent = mayStartNext ? '開啟下一個賽季' : (j.completed ? '請先完成 Play-In / Playoffs' : `🏀 進入 Game ${j.gameIndex + 1}（消耗 1 球）`);
      btn.classList.toggle('opacity-50', j.completed && !mayStartNext);
    }
    const playoff = document.getElementById('playoffBtn');
    if (playoff) {
      const eliminatedInPlayIn = j.wins < 42 && j.playInResolved && !j.playInWon;
      playoff.classList.toggle('hidden', !j.completed || j.wins < 36 || eliminatedInPlayIn);
      playoff.textContent = j.wins >= 42 || j.playInWon ? '🏆 進入 Playoffs' : '⚠️ 進入 Play-In 生死戰';
    }
    const legacyList = document.getElementById('sjLegacyList');
    if (legacyList) {
      const seasons = [...j.history].reverse().slice(0, 5);
      legacyList.innerHTML = seasons.length ? seasons.map(h => `<div class="flex justify-between items-center rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs"><span class="text-slate-400">Season ${h.season}</span><b class="text-white font-mono">${safeText(h.record)}</b></div>`).join('') : '<p class="text-xs text-slate-500 py-5 text-center">完成第一個賽季後，歷史會永久留在這裡。</p>';
    }
    const allMoments = (state.inventory || []).flatMap(card => (card.badgeJourney?.moments || []).map(moment => ({ player: card.name, moment })));
    set('sjMomentCount', `${allMoments.length} unlocked`);
    const momentList = document.getElementById('sjMomentList');
    if (momentList) momentList.innerHTML = allMoments.length ? allMoments.slice(-5).reverse().map(item => `<div class="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2"><b class="text-xs text-amber-300">${safeText(item.moment.split(':').pop())}</b><span class="block text-[10px] text-slate-500 mt-0.5">${safeText(item.player)}</span></div>`).join('') : '<p class="text-xs text-slate-500 py-5 text-center">重要回合中觸發徽章，即可收藏漫畫 Moment。</p>';
    const awardsSection = document.getElementById('sjAwardsSection');
    const awardsList = document.getElementById('sjAwardsList');
    const historicalAwards = [...(j.history || [])].reverse().find(entry => Array.isArray(entry.awards) && entry.awards.length)?.awards || [];
    const legacyAwards = Array.isArray(state.season?.lastBoxScores) ? state.season.lastBoxScores.map(item => {
      const title = String(item.title || '年度獎項');
      const iconMatch = title.match(/^\s*([^\w\u4e00-\u9fff]+)\s*/);
      return { icon: iconMatch?.[1]?.trim() || '🏆', label: title.replace(/^\s*[^\w\u4e00-\u9fff]+\s*/, ''), player: item.player, stat: String(item.stat || '').replace(/<[^>]+>/g, ' ') };
    }) : [];
    const awards = Array.isArray(j.awards) && j.awards.length ? j.awards : (historicalAwards.length ? historicalAwards : legacyAwards);
    if (awardsSection) awardsSection.classList.toggle('hidden', !awards.length);
    if (awardsList) awardsList.innerHTML = awards.map(award => `
      <div class="sj-award-card">
        <span>${award.icon || '🏆'}</span><div><small>${safeText(award.label)}</small><b>${safeText(award.player)}</b><em>${safeText(award.stat || '')}</em></div>
      </div>`).join('');
    const adminPanel = document.getElementById('sjAdminPanel');
    if (adminPanel) adminPanel.classList.toggle('hidden', !state.isAdmin);
    const autoStatus = document.getElementById('sjAutoStatus');
    const autoBtn = document.getElementById('sjAutoBtn');
    if (autoStatus) autoStatus.textContent = autoMode.running ? `剩餘 ${autoMode.remaining} 場` : '尚未啟動';
    if (autoBtn) autoBtn.textContent = autoMode.running ? '停止掛機' : '開始掛機';
    renderEnergy();
  }

  function injectGameModal() {
    if (document.getElementById('sjGameModal')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div id="sjGameModal" class="fixed inset-0 z-[130] hidden bg-slate-950/95 backdrop-blur-md p-2 sm:p-5 overflow-y-auto ios-safe-modal">
        <div class="max-w-3xl mx-auto min-h-full flex items-center justify-center">
          <div class="w-full bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
            <header class="px-4 py-3 border-b border-slate-800 flex justify-between items-center">
              <div><span id="sjModalGame" class="text-[10px] text-amber-400 font-black sj-kicker"></span><h3 id="sjModalTeams" class="text-sm sm:text-base font-black text-white"></h3></div>
              <div class="flex items-center gap-1"><button id="sjModalAutoStop" onclick="stopJourneyAutoMode('已停止掛機，這場可改為手動操作')" class="hidden text-[10px] text-rose-300 bg-rose-950/60 border border-rose-700/50 px-2.5 py-1.5 rounded-lg">停止掛機</button><button onclick="closeJourneyGame()" class="text-slate-400 hover:text-white p-2">✕</button></div>
            </header>
            <div class="p-4 sm:p-6">
              <section id="sjMatchupPanel" class="sj-matchup-panel"></section>
              <div id="sjGamePresentation" class="hidden">
              <div id="sjQuarterStrip" class="grid grid-cols-5 gap-1.5 mb-4"></div>
              <div id="sjVisualStage" class="sj-visual-stage">
                <div id="sjQuarterTransition" class="sj-quarter-transition" aria-live="polite"></div>
                <div class="sj-visual-clock"><span id="sjVisualQuarter">PREGAME</span><b id="sjVisualClock">12:00</b></div>
                <div class="sj-visual-scoreboard">
                  <div id="sjHomeScoreWrap" class="sj-score-team sj-score-team--home"><b id="sjGameHome"></b><strong id="sjHomeScore">0</strong><i id="sjHomeDelta"></i></div>
                  <div class="sj-score-center"><span>VS</span><em id="sjDramaBanner"></em></div>
                  <div id="sjAwayScoreWrap" class="sj-score-team sj-score-team--away"><b id="sjGameAway"></b><strong id="sjAwayScore">0</strong><i id="sjAwayDelta"></i></div>
                </div>
                <div class="sj-momentum-labels"><span>MY TEAM</span><b>GAME FLOW</b><span>OPPONENT</span></div>
                <div id="sjMomentumTrack" class="sj-momentum-track" style="--momentum:0">
                  <div class="sj-momentum-zone sj-momentum-zone--home"></div>
                  <div class="sj-momentum-center"></div>
                  <div class="sj-momentum-zone sj-momentum-zone--away"></div>
                  <div id="sjMomentumBall" class="sj-momentum-ball" aria-label="比賽攻勢位置">🏀</div>
                </div>
                <div class="sj-visual-status">
                  <span id="sjPossessionIndicator">🏀 等待開賽</span>
                  <b id="sjRunIndicator"></b>
                  <strong id="sjEventHighlight"></strong>
                </div>
              </div>
              <section id="sjPregameStrategy" class="sj-strategy-panel mt-4" aria-label="賽前戰術"></section>
              <div id="sjPlayFeed" class="sj-play-feed sj-visual-feed mt-4" aria-live="polite"></div>
              <section id="sjHalftimePanel" class="sj-strategy-panel sj-halftime-panel hidden mt-4" aria-label="中場調整"></section>
              <section id="sjShootingChallenge" class="sj-shooting-challenge hidden mt-4" aria-live="polite"></section>
              <section id="sjGameAnalysis" class="sj-game-analysis hidden mt-4"></section>
              <div id="sjGameActions" class="grid grid-cols-2 gap-2 mt-4">
                <button id="sjContinueBtn" onclick="advanceJourneyQuarter()" class="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3.5 rounded-2xl">開始第一節</button>
                <button id="sjQuickBtn" onclick="quickSimJourneyGame()" class="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3.5 rounded-2xl border border-slate-700">快速模擬</button>
              </div>
              <div id="sjFinalActions" class="hidden grid-cols-2 gap-2 mt-4">
                <button onclick="showJourneyBoxScore()" class="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-2xl">查看 Box Score</button>
                <button onclick="closeJourneyGame()" class="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-2xl">返回賽季首頁</button>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div id="sjComicModal" class="fixed inset-0 z-[150] hidden bg-black/95 p-3 sm:p-6 ios-safe-modal">
        <div class="max-w-2xl mx-auto h-full flex items-center justify-center">
          <div class="w-full overflow-hidden rounded-3xl border border-amber-500/40 bg-slate-950 shadow-2xl">
            <div id="sjComicPanel" class="sj-comic-panel p-5 sm:p-8 flex flex-col justify-between text-center"></div>
            <button id="sjComicNext" onclick="nextComicPage()" class="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-4">下一頁</button>
          </div>
        </div>
      </div>
      <div id="sjPlayInModal" class="fixed inset-0 z-[145] hidden bg-slate-950/95 backdrop-blur-md p-3 ios-safe-modal">
        <div class="max-w-md mx-auto h-full flex items-center justify-center">
          <div class="w-full bg-slate-900 border border-orange-500/50 rounded-3xl p-5 text-center shadow-2xl">
            <div class="text-4xl">⚠️</div><div class="sj-kicker text-[10px] text-orange-400 font-black mt-2">Play-In Tournament</div>
            <h3 class="text-xl text-white font-black mt-2">一場定生死</h3>
            <p id="sjPlayInText" class="text-xs text-slate-400 mt-2">贏球晉級季後賽，輸球結束本季。</p>
            <div id="sjPlayInScore" class="hidden my-5 text-4xl text-white font-black font-mono"></div>
            <button id="sjPlayInAction" onclick="simulateJourneyPlayIn()" class="mt-5 w-full bg-orange-500 hover:bg-orange-400 text-slate-950 font-black py-3.5 rounded-2xl">進行 Play-In</button>
            <button onclick="closeJourneyPlayIn()" class="mt-2 w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-2xl">稍後再來</button>
          </div>
        </div>
      </div>
      <div id="sjTeamNameModal" class="fixed inset-0 z-[145] hidden bg-slate-950/90 backdrop-blur-md p-3 ios-safe-modal">
        <div class="max-w-sm mx-auto h-full flex items-center justify-center"><div class="w-full bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl"><h3 class="text-base text-white font-black">修改球隊名稱</h3><p class="text-xs text-slate-500 mt-1">名稱會套用到例行賽、Play-In 與賽季首頁。</p><input id="sjTeamNameInput" maxlength="24" class="w-full mt-4 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-3 text-sm text-white" placeholder="輸入球隊名稱"><div class="grid grid-cols-2 gap-2 mt-4"><button onclick="closeJourneyTeamName()" class="bg-slate-800 text-slate-300 font-bold py-3 rounded-xl">取消</button><button onclick="saveJourneyTeamName()" class="bg-amber-500 text-slate-950 font-black py-3 rounded-xl">儲存名稱</button></div></div></div>
      </div>
      <div id="sjAdminBackModal" class="fixed inset-0 z-[145] hidden bg-slate-950/95 backdrop-blur-md p-3 overflow-y-auto ios-safe-modal">
        <div class="max-w-2xl mx-auto min-h-full flex items-center justify-center"><div class="w-full bg-slate-900 border border-fuchsia-500/40 rounded-3xl p-5 shadow-2xl"><div class="flex justify-between items-center"><div><div class="text-[10px] text-fuchsia-300 font-black sj-kicker">Admin Preview</div><h3 class="text-base text-white font-black">六種榮譽卡背預覽</h3></div><button onclick="closeAdminBackPreview()" class="text-slate-400 p-2">✕</button></div><div id="sjAdminBackGrid" class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5"></div></div></div>
      </div>`);
  }

  function editJourneyTeamName() {
    const modal = document.getElementById('sjTeamNameModal');
    const input = document.getElementById('sjTeamNameInput');
    if (!modal || !input) return;
    input.value = state.seasonJourney.teamName || PLAYER_TEAM_FALLBACK;
    modal.classList.remove('hidden');
    setTimeout(() => input.focus(), 50);
  }

  function saveJourneyTeamName() {
    const input = document.getElementById('sjTeamNameInput');
    const cleaned = String(input?.value || '').trim().slice(0, 24);
    if (!cleaned) return;
    state.seasonJourney.teamName = cleaned;
    saveGame(); closeJourneyTeamName(); renderJourneySeasonTab();
    if (typeof showToast === 'function') showToast(`球隊名稱已改為「${cleaned}」`, 'success');
  }

  function closeJourneyTeamName() {
    const modal = document.getElementById('sjTeamNameModal');
    if (modal) modal.classList.add('hidden');
  }

  function renderMatchupPanel() {
    const panel = document.getElementById('sjMatchupPanel');
    if (!panel || !activeGame) return;
    panel.classList.toggle('hidden', !!activeGame.matchupConfirmed);
    const presentation = document.getElementById('sjGamePresentation');
    if (presentation) presentation.classList.toggle('hidden', !activeGame.matchupConfirmed);
    if (activeGame.matchupConfirmed) return;
    const opponentRoster = activeGame.opponentRoster;
    const scout = activeGame.scouting;
    const rows = LINEUP_POSITIONS.map((position, index) => {
      const mine = activeGame.starters[index];
      const opponent = opponentRoster[index];
      return `<div class="sj-matchup-row">
        <div><span>${position}</span><b>${safeText(mine?.name || '—')}</b><em>OVR ${playerOvr(mine)}</em></div>
        <strong>VS</strong>
        <div class="is-opponent"><span>${opponent.position}</span><b>${safeText(opponent.name)}</b><em>OVR ${opponent.ovr}</em></div>
      </div>`;
    }).join('');
    const assignments = opponentRoster.map((opponent, index) => `
      <label><span>${safeText(opponent.name)}</span><select onchange="updateJourneyMatchup(${index}, this.value)">
        ${activeGame.starters.map((card, starterIndex) => `<option value="${starterIndex}" ${Number(activeGame.matchups[index]) === starterIndex ? 'selected' : ''}>${LINEUP_POSITIONS[starterIndex]} · ${safeText(card.name)}</option>`).join('')}
      </select></label>`).join('');
    panel.innerHTML = `
      <div class="sj-matchup-head"><div><span>OPPONENT SCOUTING</span><h3>${safeText(state.seasonJourney.teamName)} <i>VS</i> ${safeText(activeGame.scheduleGame.opponent)}</h3></div><div><small>TEAM OVR</small><b>${Math.round(activeGame.teamOvr)} — ${activeGame.scheduleGame.opponentOvr}</b></div></div>
      <div class="sj-matchup-rosters">${rows}</div>
      <div class="sj-scout-grid">
        <div><b>對手優勢</b>${scout.strengths.map(item => `<p>${item.icon} ${safeText(item.key)} <strong>${item.value}</strong></p>`).join('')}</div>
        <div><b>可能弱點</b>${scout.weaknesses.map(item => `<p>• ${safeText(item.key)} <strong>${item.value}</strong></p>`).join('')}</div>
      </div>
      <div class="sj-defensive-matchups"><div><b>DEFENSIVE MATCHUP</b><span>指定誰負責主防每位對手</span></div><div class="sj-matchup-selects">${assignments}</div></div>
      <button type="button" onclick="confirmJourneyMatchup()" class="sj-confirm-matchup">確認對位並設定戰術</button>`;
  }

  function updateJourneyMatchup(opponentIndex, starterIndex) {
    if (!activeGame || activeGame.matchupConfirmed) return;
    activeGame.matchups[Number(opponentIndex)] = clamp(Number(starterIndex) || 0, 0, 4);
  }

  function confirmJourneyMatchup() {
    if (!activeGame || activeGame.matchupConfirmed) return;
    const matchupEdges = activeGame.opponentRoster.map((opponent, index) => {
      const defender = activeGame.starters[Number(activeGame.matchups[index]) || 0];
      const badges = typeof getPlayerBadges === 'function' ? getPlayerBadges(defender) : [];
      const defenseBoost = badges.some(badge => ['外線大鎖','小偷','木桶伯','禁區大鎖'].includes(badge.name)) ? 3 : 0;
      return playerOvr(defender) + defenseBoost - Number(opponent.ovr || 0);
    });
    activeGame.matchupBonus = clamp(Math.round(matchupEdges.reduce((sum, edge) => sum + edge, 0) / 12), -2, 2);
    activeGame.matchupConfirmed = true;
    activeGame.feed.push(`🧠 防守對位完成：本場防守修正 ${activeGame.matchupBonus >= 0 ? '+' : ''}${activeGame.matchupBonus}`);
    renderActiveGame();
  }

  function openJourneyGame() {
    ensureJourneyState();
    const starters = ['PG','SG','SF','PF','C'].map(pos => state.startingLineup[pos]).filter(Boolean);
    if (starters.length < 5) {
      showGameAlert({ title: '先發陣容未補齊', message: '請先安排完整的五名先發球員。', type: 'warning' });
      return;
    }
    if (state.seasonJourney.completed) {
      if (state.seasonJourney.wins < 36 || state.season.hasPlayedPlayoffs) startNextJourneySeason();
      return;
    }
    if (!spendEnergy()) {
      showGameAlert({ title: '體力不足', message: '目前沒有體力球。少於 15 球時，每 30 分鐘會恢復 1 球。', type: 'info' });
      return;
    }
    const scheduleGame = currentGameInfo();
    const baseTeamOvr = Number(calculateTeamOverall().overall || 80);
    const averageMorale = starters.reduce((sum, card) => sum + moraleValue(card), 0) / Math.max(1, starters.length);
    const teamOvr = baseTeamOvr + averageMorale;
    const opponentRoster = getOpponentRoster(scheduleGame);
    activeGame = {
      scheduleGame, starters, bench: (state.benchLineup || []).filter(Boolean), teamOvr,
      quarter: 0, homeScore: 0, awayScore: 0, homeQuarters: [], awayQuarters: [],
      feed: [], moments: [], pendingMoments: [], finalized: false, boxScore: null,
      pregameStrategy: 'balanced', secondHalfStrategy: null, awaitingHalftime: false, halftimeReport: null,
      opponentRoster, scouting: scoutOpponent(scheduleGame), matchups: [0, 1, 2, 3, 4], matchupBonus: 0, matchupConfirmed: !!autoMode.running,
      manualShots: {}, manualShotCount: 0,
      featuredStar: [...starters].sort((a, b) => (Number(b.ovr || b.baseOvr || 0) + moraleValue(b)) - (Number(a.ovr || a.baseOvr || 0) + moraleValue(a)))[0] || null,
      visual: null
    };
    saveGame();
    visualGameState = window.VisualMatchSimulator?.createState({ homeScore: 0, awayScore: 0 }) || null;
    activeGame.visual = visualGameState;
    injectGameModal();
    document.getElementById('sjGameModal').classList.remove('hidden');
    document.getElementById('sjModalGame').textContent = `GAME ${scheduleGame.game} / 82`;
    document.getElementById('sjModalTeams').textContent = `${state.seasonJourney.teamName} vs ${scheduleGame.opponent}`;
    document.getElementById('sjGameHome').textContent = state.seasonJourney.teamName;
    document.getElementById('sjGameAway').textContent = scheduleGame.opponent;
    document.getElementById('sjFinalActions').classList.add('hidden');
    document.getElementById('sjFinalActions').classList.remove('grid');
    document.getElementById('sjGameActions').classList.remove('hidden');
    renderActiveGame(); renderJourneySeasonTab();
  }

  function quarterName(q) { return q <= 4 ? `${q}Q` : 'OT'; }

  function activeStrategyForQuarter(q) {
    if (!activeGame) return 'balanced';
    return q >= 3 && activeGame.secondHalfStrategy
      ? activeGame.secondHalfStrategy
      : (activeGame.pregameStrategy || 'balanced');
  }

  function selectJourneyPregameStrategy(strategyId) {
    if (!activeGame || activeGame.quarter > 0 || !GAME_STRATEGIES[strategyId]) return;
    activeGame.pregameStrategy = strategyId;
    renderActiveGame();
  }

  function buildHalftimeReport() {
    const strategy = activeGame?.pregameStrategy || 'balanced';
    const threeBias = strategy === 'shoot-threes' ? 5 : 0;
    const defenseBias = strategy === 'defense' ? 2 : 0;
    const roster = activeGame.starters.concat(activeGame.bench).filter(Boolean);
    const ranked = [...roster].sort((a, b) => Number(b.ovr || b.baseOvr || 0) - Number(a.ovr || a.baseOvr || 0)).slice(0, 3);
    const remaining = Math.max(0, activeGame.homeScore - 12);
    const leaderPoints = [
      Math.max(6, Math.round(remaining * .34)),
      Math.max(4, Math.round(remaining * .24)),
      Math.max(3, Math.round(remaining * .17))
    ];
    return {
      fg: `${clamp(44 + Math.round((activeGame.homeScore - 52) * .16) + randomInt(-2, 2), 38, 59)}% / ${clamp(44 + Math.round((activeGame.awayScore - 52) * .14) + randomInt(-2, 2) - defenseBias, 37, 58)}%`,
      three: `${clamp(33 + threeBias + randomInt(-4, 5), 24, 52)}% / ${clamp(35 + randomInt(-4, 5) - defenseBias, 24, 50)}%`,
      rebounds: `${randomInt(20, 29)} / ${randomInt(19, 29)}`,
      turnovers: `${randomInt(4, 9)} / ${randomInt(4, 10)}`,
      leaders: ranked.map((card, index) => ({ name: card.name, pts: leaderPoints[index] || 3 }))
    };
  }

  function selectJourneyHalftimeStrategy(strategyId, silent = false) {
    if (!activeGame || !activeGame.awaitingHalftime) return;
    const chosen = strategyId === 'keep' ? activeGame.pregameStrategy : strategyId;
    if (!GAME_STRATEGIES[chosen]) return;
    activeGame.secondHalfStrategy = chosen;
    activeGame.awaitingHalftime = false;
    if (!silent) activeGame.feed.push(`🎯 中場調整：${GAME_STRATEGIES[chosen].short}`);
    renderActiveGame();
  }

  function clearVisualEventTimer() {
    if (visualEventTimer) clearTimeout(visualEventTimer);
    visualEventTimer = null;
  }

  function visualEventDelay() {
    return MATCH_PRESENTATION_TIMING.event;
  }

  function formatGameClock(seconds) {
    const safe = Math.max(0, Math.floor(Number(seconds || 0)));
    return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
  }

  function pulseVisualScore(team, points) {
    const wrap = document.getElementById(team === 'user' ? 'sjHomeScoreWrap' : 'sjAwayScoreWrap');
    const delta = document.getElementById(team === 'user' ? 'sjHomeDelta' : 'sjAwayDelta');
    if (!wrap || !delta || !points) return;
    wrap.classList.remove('is-scoring');
    delta.textContent = `+${points}`;
    void wrap.offsetWidth;
    wrap.classList.add('is-scoring');
    setTimeout(() => wrap.classList.remove('is-scoring'), MATCH_PRESENTATION_TIMING.scorePulse);
  }

  function finishQuarterPresentation(q) {
    if (!activeGame) return;
    const visual = activeGame.visual;
    if (visual) {
      visual.busy = false;
      visual.highlight = '';
      visual.scoringTeam = null;
      visual.scoreDelta = 0;
      visual.transition = {
        title: q === 2 ? 'HALFTIME' : `END OF ${q === 1 ? '1ST' : q === 2 ? '2ND' : q === 3 ? '3RD' : q > 4 ? 'OVERTIME' : '4TH'}`,
        score: `${activeGame.homeScore} — ${activeGame.awayScore}`
      };
    }
    if (q === 2) {
      activeGame.halftimeReport = buildHalftimeReport();
      activeGame.awaitingHalftime = true;
      activeGame.feed.push('⏱️ HALFTIME：查看數據並決定下半場戰術');
    }
    if (q >= 4 && activeGame.homeScore !== activeGame.awayScore) finishJourneyGame();
    else if (q >= 6 && activeGame.homeScore === activeGame.awayScore) activeGame.homeScore += 1;
    renderActiveGame();
    if (visual?.transition) {
      setTimeout(() => {
        if (!activeGame?.visual) return;
        activeGame.visual.transition = null;
        renderActiveGame();
      }, MATCH_PRESENTATION_TIMING.quarterTransition);
    }
  }

  function playNextVisualEvent(q) {
    if (!activeGame?.visual) return;
    const visual = activeGame.visual;
    const event = visual.pendingEvents.shift();
    if (!event) {
      if (visual.pendingBadgeEvent) {
        visual.busy = false;
        visual.awaitingBadge = true;
        openComic(visual.pendingBadgeEvent.moment);
        renderActiveGame();
        return;
      }
      finishQuarterPresentation(q);
      return;
    }
    window.VisualMatchSimulator.applyEvent(visual, event);
    renderActiveGame();
    pulseVisualScore(event.team, event.points);
    clearVisualEventTimer();
    visualEventTimer = setTimeout(() => playNextVisualEvent(q), visualEventDelay());
  }

  function startVisualQuarter(events, q, badgeEvent, moment) {
    if (!activeGame?.visual || !window.VisualMatchSimulator) {
      finishQuarterPresentation(q);
      return;
    }
    const visual = activeGame.visual;
    visual.busy = true;
    visual.pendingEvents = [...events];
    visual.pendingBadgeEvent = badgeEvent ? { event: badgeEvent, moment, quarter: q } : null;
    visual.transition = { title: q > 4 ? 'OVERTIME' : `${q}${q === 1 ? 'ST' : q === 2 ? 'ND' : q === 3 ? 'RD' : 'TH'} QUARTER`, score: 'TIP-OFF' };
    renderActiveGame();
    clearVisualEventTimer();
    visualEventTimer = setTimeout(() => {
      if (!activeGame?.visual) return;
      activeGame.visual.transition = null;
      renderActiveGame();
      playNextVisualEvent(q);
    }, MATCH_PRESENTATION_TIMING.quarterIntro);
  }

  function resumeVisualAfterComic() {
    if (!activeGame?.visual?.awaitingBadge) return;
    const visual = activeGame.visual;
    const pending = visual.pendingBadgeEvent;
    visual.awaitingBadge = false;
    visual.pendingBadgeEvent = null;
    if (!pending?.event || !window.VisualMatchSimulator) {
      finishQuarterPresentation(pending?.quarter || activeGame.quarter);
      return;
    }
    visual.busy = true;
    window.VisualMatchSimulator.applyEvent(visual, pending.event);
    renderActiveGame();
    pulseVisualScore(pending.event.team, pending.event.points);
    clearVisualEventTimer();
    visualEventTimer = setTimeout(() => finishQuarterPresentation(pending.quarter), visualEventDelay());
  }

  function applyQuarterStrategy(strategyId, q, home, away) {
    let adjustedHome = home;
    let adjustedAway = away;
    if (strategyId === 'feature-star') {
      adjustedHome += randomInt(0, 2);
      if (q >= 4 && Math.random() < .28) adjustedHome -= 2;
    } else if (strategyId === 'shoot-threes') {
      adjustedHome += randomInt(-3, 4);
    } else if (strategyId === 'defense' || strategyId === 'lock-down') {
      adjustedHome -= 1;
      adjustedAway -= strategyId === 'lock-down' ? randomInt(1, 3) : randomInt(1, 2);
    } else if (strategyId === 'attack-paint') {
      adjustedHome += randomInt(1, 3);
    }
    const floor = q > 4 ? 5 : 15;
    const ceiling = q > 4 ? 15 : 40;
    return { home: clamp(adjustedHome, floor, ceiling), away: clamp(adjustedAway, floor, ceiling) };
  }

  function createQuarterPlays(q, myPts, oppPts) {
    const scorers = activeGame.starters.concat(activeGame.bench).filter(Boolean);
    const strategyId = activeStrategyForQuarter(q);
    const plays = [];
    const count = randomInt(3, 5);
    for (let i = 0; i < count; i++) {
      const player = strategyId === 'feature-star' && activeGame.featuredStar && Math.random() < .58
        ? activeGame.featuredStar
        : randomOf(scorers);
      const arch = typeof getPlayerArchetype === 'function' ? getPlayerArchetype(player) : { type: 'scorer' };
      const actions = strategyId === 'shoot-threes'
        ? ['接球三分果斷出手', '利用掩護命中外線', '轉換進攻追身三分']
        : strategyId === 'attack-paint'
          ? ['強切禁區完成上籃', '低位單打轉身命中', '擋拆順下攻擊籃框']
          : arch.type === 'big_rebound'
        ? ['抓下進攻籃板補進', '封阻後發動快攻', '禁區強攻得手']
        : arch.type === 'playmaker'
          ? ['突破分球送出助攻', '擋拆後拋投命中', '找到空檔隊友完成得分']
          : arch.type === 'shooter'
            ? ['接球三分命中', '中距離急停命中', '繞掩護外線得手']
            : ['突破上籃命中', '轉換快攻完成得分', '防守反擊得手'];
      plays.push(`${player.name} ${randomOf(actions)}`);
    }
    plays.push(`${quarterName(q)} 結束：本節 ${myPts}-${oppPts}`);
    return plays;
  }

  function badgeQuarterImpact(q) {
    const roster = activeGame.starters.concat(activeGame.bench).filter(Boolean);
    let offense = 0;
    let defense = 0;
    roster.forEach(card => {
      const badges = typeof getPlayerBadges === 'function' ? getPlayerBadges(card) : [];
      badges.forEach(badge => {
        const tier = badgeTierInfo(card, badge.name);
        const weight = tier.multiplier * (activeGame.starters.includes(card) ? 1 : .55);
        if (['曼巴精神','神射手','組織大師','無私','助人為樂','第六人','總決賽MVP'].includes(badge.name)) offense += weight;
        if (['木桶伯','禁區大鎖','小偷','外線大鎖','總決賽MVP'].includes(badge.name)) defense += weight;
      });
    });
    const strategy = activeStrategyForQuarter(q);
    if (['feature-star','shoot-threes','attack-paint'].includes(strategy)) offense *= 1.15;
    if (['defense','lock-down'].includes(strategy)) defense *= 1.2;
    return {
      home: clamp(Math.floor(offense / 5.5), 0, 3),
      away: -clamp(Math.floor(defense / 4.5), 0, 3)
    };
  }

  function badgeMomentPoints(moment) {
    const tier = badgeTierInfo(moment.card, moment.badge);
    const base = moment.badge === '神射手' ? 3 : 2;
    return clamp(Math.round(base * tier.multiplier), base, 6);
  }

  function shootingRating(card) {
    const threePct = parseFloat(card?.basic?.['3P%']);
    if (Number.isFinite(threePct) && threePct > 0) return clamp(Math.round(threePct + 48), 60, 99);
    const archetype = typeof getPlayerArchetype === 'function' ? getPlayerArchetype(card) : null;
    return clamp(playerOvr(card) + (archetype?.type === 'shooter' ? 5 : -4), 55, 99);
  }

  function shouldOpenShootingChallenge(q) {
    return activeGame && activeGame.matchupConfirmed && !autoMode.running && MANUAL_SHOT_QUARTERS.includes(q)
      && !activeGame.manualShots[q] && !shootingChallenge;
  }

  function openShootingChallenge(q) {
    const panel = document.getElementById('sjShootingChallenge');
    if (!panel || !activeGame) return;
    const shooters = [...activeGame.starters].sort((a, b) => shootingRating(b) - shootingRating(a));
    const shooter = q === 4 ? (activeGame.featuredStar || shooters[0]) : shooters[(activeGame.manualShotCount || 0) % Math.min(3, shooters.length)];
    const rating = shootingRating(shooter);
    const sharpTier = (typeof getPlayerBadges === 'function' ? getPlayerBadges(shooter) : []).some(badge => badge.name === '神射手')
      ? badgeTierInfo(shooter, '神射手')
      : BADGE_TIER_STEPS[0];
    const greenWidth = clamp(12 + (rating - 70) * .28 + (sharpTier.multiplier - 1) * 8, 10, 24);
    shootingChallenge = { q, shooter, rating, greenWidth, startedAt: now(), duration: 1400 };
    panel.classList.remove('hidden');
    panel.innerHTML = `
      <div class="sj-shot-head"><div><span>KEY POSSESSION · ${quarterName(q)}</span><b>${safeText(shooter.name)} · OPEN THREE</b></div><strong>3 次操作中的第 ${activeGame.manualShotCount + 1} 次</strong></div>
      <div class="sj-shot-meter" style="--green-start:${50 - greenWidth / 2}%;--green-end:${50 + greenWidth / 2}%"><div class="sj-shot-zone"></div><i></i></div>
      <div class="sj-shot-help">能力 ${rating} · ${sharpTier.name === 'Bronze' ? '無額外神射手加成或銅級' : `${sharpTier.label}級神射手擴大綠區`}</div>
      <button type="button" onclick="stopJourneyShot()">STOP</button>`;
    const actions = document.getElementById('sjGameActions');
    if (actions) actions.classList.add('hidden');
  }

  function stopJourneyShot() {
    if (!shootingChallenge || !activeGame) return;
    const shot = shootingChallenge;
    const elapsed = Math.max(0, now() - shot.startedAt);
    const phase = (elapsed % shot.duration) / shot.duration;
    const position = phase <= .5 ? phase * 200 : (1 - phase) * 200;
    const distance = Math.abs(position - 50);
    const greenEdge = shot.greenWidth / 2;
    let zone = 'RED';
    if (distance <= greenEdge) zone = 'GREEN';
    else if (distance <= greenEdge + 18) zone = 'YELLOW';
    const makeChance = zone === 'GREEN' ? 1 : zone === 'YELLOW' ? .5 + (shot.rating - 75) * .008 : .13 + (shot.rating - 65) * .005;
    const made = Math.random() < clamp(makeChance, .08, 1);
    const points = made ? 3 : 0;
    activeGame.manualShots[shot.q] = { player: shot.shooter.name, zone, made, points, position: Math.round(position) };
    activeGame.manualShotCount += 1;
    activeGame.feed.push(`${made ? '🎯' : '❌'} 關鍵投籃：${shot.shooter.name} ${zone} ${made ? '三分命中' : '偏出'}`);
    const panel = document.getElementById('sjShootingChallenge');
    if (panel) {
      panel.innerHTML = `<div class="sj-shot-result ${made ? 'is-made' : 'is-missed'}"><strong>${zone}</strong><b>${made ? 'SWISH! +3' : 'MISSED'}</b><span>${safeText(shot.shooter.name)} 的操作結果會計入本節比分</span></div>`;
    }
    shootingChallenge = null;
    setTimeout(() => {
      document.getElementById('sjShootingChallenge')?.classList.add('hidden');
      document.getElementById('sjGameActions')?.classList.remove('hidden');
      simulateOneQuarter(false);
    }, 650);
  }

  function selectBadgeMoment(q) {
    const special = dynamicSpecial(activeGame.scheduleGame);
    const strategyId = activeStrategyForQuarter(q);
    const strategyBoost = strategyId === 'balanced' ? 0 : .08;
    const triggerChance = (special ? .72 : .52) + strategyBoost;
    if (activeGame.moments.length >= 1 || Math.random() > triggerChance) return null;
    const closeGame = Math.abs(activeGame.homeScore - activeGame.awayScore) <= 8;
    const candidates = [];
    activeGame.starters.concat(activeGame.bench).filter(Boolean).forEach(card => {
      const badges = typeof getPlayerBadges === 'function' ? getPlayerBadges(card) : [];
      badges.forEach(badge => {
        const stories = BADGE_STORIES[badge.name];
        if (!stories || !stories.length) return;
        if (badge.name === '曼巴精神' && !(q >= 4 && closeGame)) return;
        if (badge.name === '總決賽MVP' && q < 3) return;
        if (['外線大鎖','小偷'].includes(badge.name) && q < 2) return;
        const story = randomOf(stories);
        const candidate = {
          card, badge: badge.name, icon: badge.icon || '🏅',
          title: story[0], impact: story[1],
          pages: story.slice(2).map(line => line.replace(/\{player\}/g, card.name))
        };
        candidates.push(candidate);
        const isFeatureTarget = strategyId === 'feature-star' && card.cardId === activeGame.featuredStar?.cardId;
        const isShootingFit = strategyId === 'shoot-threes' && badge.name === '神射手';
        const isDefenseFit = ['defense', 'lock-down'].includes(strategyId) && ['木桶伯', '禁區大鎖', '小偷', '外線大鎖'].includes(badge.name);
        const isPaintFit = strategyId === 'attack-paint' && ['木桶伯', '禁區大鎖'].includes(badge.name);
        if (isFeatureTarget || isShootingFit || isDefenseFit || isPaintFit) candidates.push(candidate);
      });
    });
    if (!candidates.length) return null;
    const moment = randomOf(candidates);
    ensureCardJourney(moment.card);
    const progress = ensureBadgeProgress(moment.card, moment.badge);
    progress.triggers += 1;
    progress.tier = badgeTierForTriggers(progress.triggers).name;
    moment.card.badgeJourney.triggers += 1;
    const triggers = moment.card.badgeJourney.triggers;
    moment.card.badgeJourney.mastery = badgeTierForTriggers(triggers).name;
    const momentId = `${moment.badge}:${moment.title}`;
    if (!moment.card.badgeJourney.moments.includes(momentId)) moment.card.badgeJourney.moments.push(momentId);
    moment.cardId = moment.card.cardId;
    moment.player = moment.card.name;
    moment.tier = progress.tier;
    moment.points = badgeMomentPoints(moment);
    return moment;
  }

  function simulateOneQuarter(silent) {
    if (!activeGame || !activeGame.matchupConfirmed || activeGame.finalized || activeGame.awaitingHalftime || activeGame.visual?.busy || activeGame.visual?.awaitingBadge || shootingChallenge) return;
    const q = activeGame.quarter + 1;
    const diff = activeGame.teamOvr - activeGame.scheduleGame.opponentOvr;
    let home = clamp(randomInt(20, 32) + Math.round(diff * .12), 15, 40);
    let away = clamp(randomInt(20, 32) - Math.round(diff * .08), 15, 40);
    if (q > 4) { home = randomInt(5, 13); away = randomInt(5, 13); }
    const adjusted = applyQuarterStrategy(activeStrategyForQuarter(q), q, home, away);
    home = adjusted.home;
    away = adjusted.away;
    const badgeImpact = badgeQuarterImpact(q);
    const shotBonus = Number(activeGame.manualShots[q]?.points || 0);
    home = clamp(home + badgeImpact.home + shotBonus, q > 4 ? 5 : 15, q > 4 ? 18 : 45);
    away = clamp(away + badgeImpact.away - Number(activeGame.matchupBonus || 0), q > 4 ? 5 : 15, q > 4 ? 18 : 45);
    const visualEvents = window.VisualMatchSimulator?.buildQuarterEvents({
      quarter: q,
      homePoints: home,
      awayPoints: away,
      homePlayers: activeGame.starters.concat(activeGame.bench).filter(Boolean),
      awayName: activeGame.scheduleGame.opponent
    }) || [];
    activeGame.quarter = q;
    activeGame.homeScore += home;
    activeGame.awayScore += away;
    activeGame.homeQuarters.push(home); activeGame.awayQuarters.push(away);
    if (q === 1) activeGame.feed.push(`🎯 GAME PLAN：${GAME_STRATEGIES[activeGame.pregameStrategy].short}`);
    if (q === 1 && (badgeImpact.home || badgeImpact.away)) activeGame.feed.push(`✨ 徽章陣容加成：進攻 +${badgeImpact.home}／防守 ${badgeImpact.away}`);
    activeGame.feed.push(`${quarterName(q)}：本節比分 ${home}-${away}`);
    const moment = selectBadgeMoment(q);
    let badgeVisualEvent = null;
    if (moment) {
      activeGame.moments.push(moment);
      activeGame.homeScore += moment.points;
      activeGame.homeQuarters[q - 1] = Number(activeGame.homeQuarters[q - 1] || 0) + moment.points;
      activeGame.feed.push(`🏅 ${moment.player} 觸發【${moment.badge} · ${moment.tier}】+${moment.points}`);
      badgeVisualEvent = window.VisualMatchSimulator?.buildBadgeEvent(moment, q, 12) || null;
    }
    if (silent || !activeGame.visual || !window.VisualMatchSimulator) {
      if (activeGame.visual && window.VisualMatchSimulator) {
        window.VisualMatchSimulator.consumeEvents(activeGame.visual, visualEvents);
        if (badgeVisualEvent) window.VisualMatchSimulator.consumeEvents(activeGame.visual, [badgeVisualEvent]);
      }
      if (moment) activeGame.pendingMoments.push(moment);
      finishQuarterPresentation(q);
      return;
    }
    startVisualQuarter(visualEvents, q, badgeVisualEvent, moment);
  }

  function advanceJourneyQuarter() {
    if (!activeGame || !activeGame.matchupConfirmed) return;
    const nextQuarter = activeGame.quarter + 1;
    if (shouldOpenShootingChallenge(nextQuarter)) {
      openShootingChallenge(nextQuarter);
      return;
    }
    simulateOneQuarter(false);
  }

  function quickSimJourneyGame() {
    if (!activeGame || activeGame.finalized) return;
    while (!activeGame.finalized) {
      if (activeGame.awaitingHalftime) selectJourneyHalftimeStrategy('keep', true);
      simulateOneQuarter(true);
    }
    if (activeGame.pendingMoments.length) openComic(activeGame.pendingMoments.shift());
  }

  function toggleJourneyAutoMode() {
    if (autoMode.running) {
      stopJourneyAutoMode('已停止，當前比賽可手動繼續');
      return;
    }
    ensureJourneyState();
    const requested = Math.floor(Number(document.getElementById('sjAutoCount')?.value || 0));
    const seasonRemaining = SEASON_LENGTH - state.seasonJourney.gameIndex;
    const energyAvailable = state.isAdmin ? seasonRemaining : Math.floor(state.seasonEnergy.current);
    const allowed = Math.min(seasonRemaining, energyAvailable);
    if (!Number.isFinite(requested) || requested < 1 || requested > allowed) {
      showGameAlert({ title: '掛機場數無法開始', message: `目前最多可以自動進行 ${allowed} 場（受剩餘賽程與體力限制）。`, type: 'warning' });
      return;
    }
    autoMode.running = true;
    autoMode.remaining = requested;
    renderJourneySeasonTab();
    openJourneyGame();
    scheduleAutoDrive();
  }

  function scheduleAutoDrive(delay = AUTO_STEP_MS) {
    if (autoMode.timer) clearTimeout(autoMode.timer);
    if (!autoMode.running) return;
    autoMode.timer = setTimeout(driveJourneyAutoMode, delay);
  }

  function driveJourneyAutoMode() {
    if (!autoMode.running) return;
    if (activeComic) {
      nextComicPage();
      scheduleAutoDrive();
      return;
    }
    if (activeGame && !activeGame.finalized) {
      if (activeGame.visual?.busy || activeGame.visual?.awaitingBadge) {
        scheduleAutoDrive(260);
        return;
      }
      if (activeGame.awaitingHalftime) {
        selectJourneyHalftimeStrategy('keep', true);
        scheduleAutoDrive();
        return;
      }
      advanceJourneyQuarter();
      scheduleAutoDrive();
      return;
    }
    if (activeGame?.finalized) {
      document.getElementById('sjGameModal')?.classList.add('hidden');
      activeGame = null;
      autoMode.remaining -= 1;
      renderJourneySeasonTab();
      if (autoMode.remaining <= 0 || state.seasonJourney.completed) {
        stopJourneyAutoMode('掛機比賽已全部完成');
        return;
      }
      openJourneyGame();
      scheduleAutoDrive(2200);
      return;
    }
    stopJourneyAutoMode('掛機已停止');
  }

  function stopJourneyAutoMode(message) {
    autoMode.running = false;
    autoMode.remaining = 0;
    if (autoMode.timer) clearTimeout(autoMode.timer);
    autoMode.timer = null;
    renderJourneySeasonTab();
    if (message && typeof showToast === 'function') showToast(message, 'info');
  }

  function renderActiveGame() {
    if (!activeGame) return;
    renderMatchupPanel();
    const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    const visual = activeGame.visual;
    set('sjHomeScore', visual ? visual.displayHomeScore : activeGame.homeScore);
    set('sjAwayScore', visual ? visual.displayAwayScore : activeGame.awayScore);
    set('sjVisualQuarter', activeGame.quarter ? quarterName(activeGame.quarter) : 'PREGAME');
    set('sjVisualClock', formatGameClock(visual?.clock ?? (activeGame.quarter > 4 ? 300 : 720)));
    const stage = document.getElementById('sjVisualStage');
    if (stage) stage.classList.toggle('is-clutch', !!visual?.isClutchTime);
    const momentumTrack = document.getElementById('sjMomentumTrack');
    if (momentumTrack) momentumTrack.style.setProperty('--momentum', String(visual?.momentum || 0));
    const possessionLabel = visual?.possessionTeam === 'user'
      ? `🏀 ${state.seasonJourney.teamName}`
      : visual?.possessionTeam === 'opponent'
        ? `🏀 ${activeGame.scheduleGame.opponent}`
        : '🏀 等待開賽';
    set('sjPossessionIndicator', possessionLabel);
    const runLabel = visual?.currentRunPoints >= 4
      ? `${visual.currentRunTeam === 'user' ? state.seasonJourney.teamName : activeGame.scheduleGame.opponent} ${visual.currentRunPoints}-0 RUN`
      : '';
    set('sjRunIndicator', runLabel);
    set('sjEventHighlight', visual?.highlight || '');
    set('sjDramaBanner', visual?.drama || '');
    const transition = document.getElementById('sjQuarterTransition');
    if (transition) {
      transition.classList.toggle('is-visible', !!visual?.transition);
      transition.innerHTML = visual?.transition ? `<b>${safeText(visual.transition.title)}</b><span>${safeText(visual.transition.score)}</span>` : '';
    }
    const strip = document.getElementById('sjQuarterStrip');
    if (strip) strip.innerHTML = [1,2,3,4,5].map(q => {
      const isLive = activeGame.quarter === q && !!(visual?.busy || visual?.awaitingBadge);
      const score = activeGame.homeQuarters[q - 1] == null
        ? '—'
        : (isLive ? 'LIVE' : `${activeGame.homeQuarters[q - 1]}-${activeGame.awayQuarters[q - 1]}`);
      return `<div class="sj-quarter ${activeGame.quarter === q ? 'active' : ''} rounded-xl border border-slate-800 bg-slate-950 p-2 text-center text-[10px] font-black">${q === 5 ? 'OT' : q + 'Q'}<span class="block text-xs font-mono mt-1">${score}</span></div>`;
    }).join('');
    const feed = document.getElementById('sjPlayFeed');
    if (feed) {
      const commentary = visual?.commentary || [];
      const systemLines = activeGame.feed.slice(-2).map(text => ({ text, type: text.includes('Badge Moment') ? 'BADGE_MOMENT' : 'SYSTEM' }));
      const feedLines = commentary.length
        ? commentary
        : (visual?.busy || visual?.awaitingBadge)
          ? [{ text: '比賽開始，攻勢正在形成…', type: 'SYSTEM' }]
          : systemLines;
      feed.innerHTML = feedLines.length
        ? feedLines.slice(-5).map((item, index, list) => `<p class="${item.type === 'BADGE_MOMENT' ? 'is-badge' : ''} ${index === list.length - 1 ? 'is-latest' : ''}">${safeText(item.text)}</p>`).join('')
        : '<p class="sj-feed-empty">等待開賽哨聲……</p>';
    }
    const pregame = document.getElementById('sjPregameStrategy');
    if (pregame) {
      pregame.classList.toggle('hidden', activeGame.quarter > 0);
      if (activeGame.quarter === 0) {
        const selected = activeGame.pregameStrategy || 'balanced';
        pregame.innerHTML = `
          <div class="sj-strategy-panel__head"><div><span>PREGAME PLAN</span><b>選擇本場戰術</b></div><small>只作用於本場，不改 OVR</small></div>
          <div class="sj-strategy-grid sj-strategy-grid--pregame">
            ${['balanced','feature-star','shoot-threes','defense'].map(id => `<button type="button" class="${selected === id ? 'is-selected' : ''}" onclick="selectJourneyPregameStrategy('${id}')"><b>${GAME_STRATEGIES[id].label}</b><span>${GAME_STRATEGIES[id].short}</span></button>`).join('')}
          </div>
          <p>${safeText(GAME_STRATEGIES[selected].desc)}</p>`;
      }
    }
    const halftime = document.getElementById('sjHalftimePanel');
    if (halftime) {
      halftime.classList.toggle('hidden', !activeGame.awaitingHalftime);
      if (activeGame.awaitingHalftime) {
        const report = activeGame.halftimeReport || buildHalftimeReport();
        halftime.innerHTML = `
          <div class="sj-strategy-panel__head"><div><span>HALFTIME</span><b>${activeGame.homeScore} — ${activeGame.awayScore}</b></div><small>下半場調整</small></div>
          <div class="sj-halftime-stats">
            <div><b>${report.fg}</b><span>FG% · 我方/對手</span></div><div><b>${report.three}</b><span>3P%</span></div><div><b>${report.rebounds}</b><span>REB</span></div><div><b>${report.turnovers}</b><span>TOV</span></div>
          </div>
          <div class="sj-halftime-leaders">${report.leaders.map((leader, index) => `<span><i>${index + 1}</i>${safeText(leader.name)} <b>${leader.pts} PTS</b></span>`).join('')}</div>
          <div class="sj-strategy-grid sj-strategy-grid--halftime">
            <button type="button" onclick="selectJourneyHalftimeStrategy('keep')"><b>維持戰術</b><span>KEEP PLAN</span></button>
            <button type="button" onclick="selectJourneyHalftimeStrategy('attack-paint')"><b>攻擊禁區</b><span>ATTACK PAINT</span></button>
            <button type="button" onclick="selectJourneyHalftimeStrategy('shoot-threes')"><b>增加外線</b><span>SHOOT MORE 3S</span></button>
            <button type="button" onclick="selectJourneyHalftimeStrategy('lock-down')"><b>鎖死對手</b><span>LOCK DOWN</span></button>
            <button type="button" onclick="selectJourneyHalftimeStrategy('feature-star')"><b>主攻球星</b><span>FEATURE STAR</span></button>
          </div>`;
      }
    }
    const cont = document.getElementById('sjContinueBtn');
    if (cont && !activeGame.finalized) {
      const visualBusy = !!(visual?.busy || visual?.awaitingBadge);
      cont.disabled = !!activeGame.awaitingHalftime || visualBusy;
      cont.classList.toggle('opacity-45', !!activeGame.awaitingHalftime || visualBusy);
      cont.textContent = visualBusy ? '比賽進行中…' : activeGame.awaitingHalftime ? '先完成中場調整' : (activeGame.quarter === 0 ? '開始第一節' : activeGame.quarter < 4 ? `進入 ${activeGame.quarter + 1}Q` : '進入延長賽');
    }
    const quick = document.getElementById('sjQuickBtn');
    if (quick) quick.disabled = !!(visual?.busy || visual?.awaitingBadge);
    const analysisHost = document.getElementById('sjGameAnalysis');
    const analysis = activeGame.boxScore?.analysis;
    if (analysisHost) {
      analysisHost.classList.toggle('hidden', !activeGame.finalized || !analysis);
      if (activeGame.finalized && analysis) {
        analysisHost.innerHTML = `
          <div class="sj-analysis-head"><span>GAME ANALYSIS</span><b>${safeText(analysis.title)}</b></div>
          <div class="sj-analysis-reasons">${analysis.reasons.map(reason => `<div class="${reason.good ? 'is-good' : 'is-warning'}"><strong>${reason.good ? '✅' : '❌'} ${safeText(reason.title)}</strong><p>${safeText(reason.detail)}</p></div>`).join('')}</div>
          <div class="sj-roster-needs"><b>ROSTER NEEDS</b>${analysis.needs.map(need => `<p><span>${safeText(need.label)}</span><strong>${'★'.repeat(need.stars)}${'☆'.repeat(5 - need.stars)}</strong></p>`).join('')}</div>`;
      }
    }
    const autoStop = document.getElementById('sjModalAutoStop');
    if (autoStop) autoStop.classList.toggle('hidden', !autoMode.running);
  }

  function openComic(moment) {
    activeComic = { moment, page: 0 };
    document.getElementById('sjComicModal').classList.remove('hidden');
    renderComicPage();
  }

  function renderComicPage() {
    if (!activeComic) return;
    const { moment, page } = activeComic;
    const last = page === moment.pages.length - 1;
    const nbaId = moment.card?.nbaId || 0;
    const photoUrl = typeof getPlayerImgUrl === 'function' ? getPlayerImgUrl(nbaId) : '';
    const photoTransform = page % 3 === 0 ? 'scale(1.08) translateX(-3%)' : (page % 3 === 1 ? 'scale(1.18) translateX(5%)' : 'scale(1.28) translateY(-2%)');
    document.getElementById('sjComicPanel').innerHTML = `
      <div class="flex justify-between text-[10px] font-black sj-kicker text-amber-400"><span>${safeText(moment.badge)}</span><span>${page + 1} / ${moment.pages.length}</span></div>
      <div class="relative py-5 min-h-[330px] flex flex-col justify-end overflow-hidden">
        <div class="absolute inset-0 flex items-center justify-center opacity-75 pointer-events-none">
          ${photoUrl ? `<img src="${photoUrl}" alt="${safeText(moment.player)}" class="h-[310px] sm:h-[360px] max-w-none object-contain object-top drop-shadow-[0_18px_24px_rgba(0,0,0,.8)] transition-transform duration-500" style="transform:${photoTransform}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ''}
          <div class="${photoUrl ? 'hidden' : 'flex'} w-40 h-40 rounded-full bg-slate-900/80 border border-slate-700 items-center justify-center text-7xl">${moment.icon}</div>
        </div>
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent pointer-events-none"></div>
        <div class="relative z-10"><p class="text-lg sm:text-2xl font-black text-white drop-shadow-lg">${safeText(moment.pages[page])}</p>${last ? `<div class="sj-impact mt-6 font-black italic text-amber-400 drop-shadow-[0_4px_0_rgba(0,0,0,.8)]">${safeText(moment.impact)}</div><div class="mt-3 text-xs tracking-[.22em] text-white font-black">${safeText(moment.title)}</div>` : ''}</div>
      </div>
      <div class="text-[10px] text-slate-500">${safeText(moment.player)} · Badge Moment</div>`;
    document.getElementById('sjComicNext').textContent = last ? '回到比賽' : '下一頁';
  }

  function nextComicPage() {
    if (!activeComic) return;
    if (activeComic.page < activeComic.moment.pages.length - 1) { activeComic.page += 1; renderComicPage(); return; }
    document.getElementById('sjComicModal').classList.add('hidden');
    activeComic = null;
    if (activeGame?.visual?.awaitingBadge) {
      resumeVisualAfterComic();
      return;
    }
    if (activeGame && activeGame.pendingMoments.length) openComic(activeGame.pendingMoments.shift());
  }

  function buildGameAnalysis(gameData, game) {
    const rows = gameData?.boxScore || [];
    const total = key => rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
    const topScorer = [...rows].sort((a, b) => Number(b.pts || 0) - Number(a.pts || 0))[0];
    const myRebounds = total('reb');
    const myTurnovers = total('tov');
    const opponentRebounds = clamp(Math.round(36 + (game.scheduleGame.opponentOvr - 80) * .55 + randomInt(-4, 5)), 31, 58);
    const opponentThrees = clamp(Math.round(game.awayScore * .115 + game.scouting.ratings[0].value * .045 + randomInt(-2, 2)), 7, 20);
    const opponentTurnovers = clamp(Math.round(15 - (game.scheduleGame.opponentOvr - 80) * .18 + randomInt(-2, 2)), 7, 18);
    const candidates = [
      { score: opponentThrees - 12, title: '外線防守', detail: `對手命中 ${opponentThrees} 記三分。`, need: '外線大鎖' },
      { score: opponentRebounds - myRebounds, title: '籃板保護', detail: `籃板 ${myRebounds}-${opponentRebounds}，禁區對抗影響二次進攻。`, need: '籃板／護框型內線' },
      { score: myTurnovers - opponentTurnovers, title: '失誤控制', detail: `我方 ${myTurnovers} 次失誤，對手 ${opponentTurnovers} 次。`, need: '穩定組織者' },
      { score: Number(topScorer?.pts || 0) - 24, good: true, title: '球星得分', detail: `${topScorer?.name || '球隊核心'} 攻下 ${topScorer?.pts || 0} 分。`, need: '第二得分點' }
    ];
    candidates.slice(0, 3).forEach(item => { item.good = item.score <= 0; });
    const won = game.homeScore > game.awayScore;
    const negatives = candidates.filter(item => !item.good).sort((a, b) => b.score - a.score);
    const positives = candidates.filter(item => item.good).sort((a, b) => b.score - a.score);
    const reasons = won
      ? positives.concat(negatives.filter(item => item.score < 1)).slice(0, 3)
      : negatives.filter(item => item.score > -2).slice(0, 3);
    if (!reasons.length) reasons.push(won ? positives[0] : negatives[0]);
    const needs = candidates.filter(item => item.need !== '第二得分點').sort((a, b) => b.score - a.score).slice(0, 3).map((item, index) => ({
      label: item.need, stars: clamp(5 - index, 2, 5)
    }));
    return {
      title: won ? 'WHY YOU WON' : 'WHY YOU LOST',
      reasons,
      needs,
      opponent: { threes: opponentThrees, rebounds: opponentRebounds, turnovers: opponentTurnovers }
    };
  }

  function calculateSeasonAwards(journey) {
    const trackers = {};
    journey.schedule.forEach((game, gameIndex) => (game.boxScore || []).forEach(row => {
      const key = row.name;
      if (!trackers[key]) trackers[key] = { name: key, games: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, plusMinus: 0, role: row.role || 'starter', ovr: playerOvr(findActiveCardByName(key)), firstHalf: 0, secondHalf: 0 };
      const item = trackers[key];
      item.games += 1;
      ['pts','reb','ast','stl','blk'].forEach(stat => { item[stat] += Number(row[stat] || 0); });
      item.plusMinus += Number(row.plusMinus || 0);
      if (gameIndex < 41) item.firstHalf += Number(row.pts || 0) + Number(row.reb || 0) + Number(row.ast || 0);
      else item.secondHalf += Number(row.pts || 0) + Number(row.reb || 0) + Number(row.ast || 0);
      if (row.role === 'bench') item.role = 'bench';
    }));
    const players = Object.values(trackers);
    if (!players.length) return [];
    const avg = (player, stat) => player[stat] / Math.max(1, player.games);
    const best = score => [...players].sort((a, b) => score(b) - score(a))[0];
    const mvp = best(p => p.pts + p.reb * 1.1 + p.ast * 1.4 + (p.stl + p.blk) * 2);
    const dpoy = best(p => p.blk * 2.2 + p.stl * 2 + p.reb * .6);
    const bench = players.filter(p => p.role === 'bench');
    const sixth = (bench.length ? bench : players).sort((a, b) => b.pts - a.pts)[0];
    const mip = best(p => ((p.secondHalf - p.firstHalf) / Math.max(1, p.games)) + (p.pts + p.reb + p.ast) / Math.max(70, p.ovr));
    const scorer = best(p => avg(p, 'pts'));
    const passer = best(p => avg(p, 'ast'));
    const rebounder = best(p => avg(p, 'reb'));
    const clutch = best(p => p.plusMinus);
    return [
      { icon: '🏆', label: '年度 MVP', player: mvp.name, stat: `${avg(mvp,'pts').toFixed(1)}分 ${avg(mvp,'reb').toFixed(1)}板 ${avg(mvp,'ast').toFixed(1)}助` },
      { icon: '🛡️', label: '最佳防守 DPOY', player: dpoy.name, stat: `${avg(dpoy,'blk').toFixed(1)}鍋 ${avg(dpoy,'stl').toFixed(1)}抄` },
      { icon: '⚡', label: '最佳第六人 6MOY', player: sixth.name, stat: `場均 ${avg(sixth,'pts').toFixed(1)} 分` },
      { icon: '🔥', label: '最佳進步獎 MIP', player: mip.name, stat: `下半季成長核心` },
      { icon: '🏹', label: '聯盟得分王', player: scorer.name, stat: `場均 ${avg(scorer,'pts').toFixed(1)} 分` },
      { icon: '🎯', label: '聯盟助攻王', player: passer.name, stat: `場均 ${avg(passer,'ast').toFixed(1)} 助` },
      { icon: '🌊', label: '聯盟籃板王', player: rebounder.name, stat: `場均 ${avg(rebounder,'reb').toFixed(1)} 板` },
      { icon: '👑', label: '最佳關鍵先生', player: clutch.name, stat: `正負值 ${clutch.plusMinus >= 0 ? '+' : ''}${clutch.plusMinus}` }
    ];
  }

  function finishJourneyGame() {
    if (!activeGame || activeGame.finalized) return;
    activeGame.finalized = true;
    const win = activeGame.homeScore > activeGame.awayScore;
    const badgeEffects = typeof analyzeLineupBadges === 'function' ? analyzeLineupBadges() : null;
    const gameData = generateGameBoxScoreData({
      starters: activeGame.starters.map(moraleAdjustedCard), bench: activeGame.bench.map(moraleAdjustedCard),
      myScore: activeGame.homeScore, oppScore: activeGame.awayScore, win,
      oppTeam: activeGame.scheduleGame.opponent, badgeEffects, gameNum: activeGame.scheduleGame.game
    });
    gameData.badgeMoments = activeGame.moments.map(m => ({ badge: m.badge, icon: m.icon, player: m.player, color: 'text-amber-300 bg-amber-950/50 border-amber-500/40', desc: `${m.title} 漫畫時刻已收錄。` }));
    gameData.analysis = buildGameAnalysis(gameData, activeGame);
    activeGame.boxScore = gameData;
    const item = activeGame.scheduleGame;
    Object.assign(item, { played: true, win, myScore: activeGame.homeScore, oppScore: activeGame.awayScore, boxScore: gameData.boxScore, moments: gameData.badgeMoments, analysis: gameData.analysis, manualShots: activeGame.manualShots });
    const j = state.seasonJourney;
    j.gameIndex += 1; j.wins += win ? 1 : 0; j.losses += win ? 0 : 1;
    j.streak = win ? j.streak + 1 : 0; j.bestStreak = Math.max(j.bestStreak, j.streak);
    j.recent.push({ game: item.game, win, opponent: item.opponent }); j.recent = j.recent.slice(-10);
    updateTeamMorale(gameData, win, j.streak);
    (gameData.boxScore || []).forEach(stat => {
      const card = findActiveCardByName(stat.name);
      if (!card) return;
      ensureCardJourney(card);
      card.legacy.games = (card.legacy.games || 0) + 1;
      card.legacy.pts = (card.legacy.pts || 0) + (stat.pts || 0);
      card.legacy.reb = (card.legacy.reb || 0) + (stat.reb || 0);
      card.legacy.ast = (card.legacy.ast || 0) + (stat.ast || 0);
      const record = stat.pts >= 60 || stat.ast >= 20 || stat.blk >= 10;
      if (record) { card.legacy.records = (card.legacy.records || 0) + 1; unlockBack(card, 'record', `Game ${item.game}: ${stat.pts} PTS / ${stat.ast} AST / ${stat.blk} BLK`); }
    });
    triggerSpecialGameEvent(item, gameData, autoMode.running);
    if (j.gameIndex >= SEASON_LENGTH) completeRegularSeason();
    saveGame();
    const actions = document.getElementById('sjGameActions'); if (actions) actions.classList.add('hidden');
    const finals = document.getElementById('sjFinalActions'); if (finals) { finals.classList.remove('hidden'); finals.classList.add('grid'); }
    activeGame.feed.push(`${win ? '✅ FINAL 勝利' : '❌ FINAL 敗北'}：${activeGame.homeScore}-${activeGame.awayScore}`);
    renderActiveGame(); renderJourneySeasonTab();
  }

  function completeRegularSeason() {
    const j = state.seasonJourney;
    j.completed = true;
    const cards = LINEUP_POSITIONS.map(pos => state.startingLineup[pos]).filter(Boolean).concat((state.benchLineup || []).filter(Boolean));
    cards.forEach(card => { ensureCardJourney(card); card.legacy.seasons = (card.legacy.seasons || 0) + 1; });
    const totals = cards.map(card => {
      const rows = j.schedule.flatMap(g => g.boxScore || []).filter(s => s.name === card.name);
      return { card, value: rows.reduce((sum,s) => sum + (s.pts || 0) + (s.reb || 0) * 1.1 + (s.ast || 0) * 1.4, 0), defense: rows.reduce((sum,s) => sum + (s.blk || 0) * 2.2 + (s.stl || 0) * 2 + (s.reb || 0) * .5, 0) };
    });
    if (totals.length) {
      const mvp = [...totals].sort((a,b) => b.value - a.value)[0].card;
      const dpoy = [...totals].sort((a,b) => b.defense - a.defense)[0].card;
      mvp.legacy.mvps = (mvp.legacy.mvps || 0) + 1; unlockBack(mvp, 'mvp', `Season ${j.seasonNo} MVP`);
      dpoy.legacy.dpoys = (dpoy.legacy.dpoys || 0) + 1; unlockBack(dpoy, 'dpoy', `Season ${j.seasonNo} DPOY`);
    }
    j.awards = calculateSeasonAwards(j);
    j.history.push({ season: j.seasonNo, record: `${j.wins}-${j.losses}`, awards: j.awards, completedAt: new Date().toISOString() });
    state.season.lastSimRecord = `${j.wins} 勝 ${j.losses} 敗`;
    state.season.lastSimWins = j.wins;
    state.season.lastSimStreak = j.bestStreak;
    state.season.lastSimGames = j.schedule;
    state.season.lastBoxScores = j.awards.map(award => ({ title: `${award.icon} ${award.label}`, player: award.player, stat: award.stat }));
    if (typeof addNotification === 'function') addNotification({ title: '🏁 例行賽完成', message: `Season ${j.seasonNo} 以 ${j.wins}-${j.losses} 完成，MVP 與 DPOY 卡背已結算。`, icon: '🏆', type: 'achievement' });
  }

  function adminSimulateToInput() {
    const target = Math.floor(Number(document.getElementById('sjAdminTarget')?.value || 0));
    adminSimulateTo(target);
  }

  function adminSimulateFullSeason() { adminSimulateTo(SEASON_LENGTH); }

  function adminSimulateTo(target) {
    if (!state.isAdmin) return;
    ensureJourneyState();
    const j = state.seasonJourney;
    const starters = ['PG','SG','SF','PF','C'].map(pos => state.startingLineup[pos]).filter(Boolean);
    if (starters.length < 5) {
      showGameAlert({ title: '先發陣容未補齊', message: '管理員快速模擬仍需要五名先發球員。', type: 'warning' });
      return;
    }
    const finalTarget = clamp(Math.floor(Number(target) || 0), 1, SEASON_LENGTH);
    if (j.completed || finalTarget <= j.gameIndex) {
      showGameAlert({ title: '指定場次無效', message: `目前已完成 Game ${j.gameIndex}，只能指定更後面的場次。`, type: 'info' });
      return;
    }
    const bench = (state.benchLineup || []).filter(Boolean);
    while (j.gameIndex < finalTarget) {
      const item = j.schedule[j.gameIndex];
      const teamOvr = Number(calculateTeamOverall().overall || 80)
        + starters.reduce((sum, card) => sum + moraleValue(card), 0) / Math.max(1, starters.length);
      const probability = clamp(.50 + (teamOvr - item.opponentOvr) * .028, .18, .84);
      const win = Math.random() < probability;
      let mine = randomInt(101, 124), theirs = randomInt(101, 124);
      if (win && mine <= theirs) mine = theirs + randomInt(1, 10);
      if (!win && mine >= theirs) theirs = mine + randomInt(1, 10);
      const gameData = generateGameBoxScoreData({ starters: starters.map(moraleAdjustedCard), bench: bench.map(moraleAdjustedCard), myScore: mine, oppScore: theirs, win, oppTeam: item.opponent, badgeEffects: analyzeLineupBadges(), gameNum: item.game });
      Object.assign(item, { played: true, win, myScore: mine, oppScore: theirs, boxScore: gameData.boxScore, moments: gameData.badgeMoments || [] });
      j.gameIndex += 1; j.wins += win ? 1 : 0; j.losses += win ? 0 : 1;
      j.streak = win ? j.streak + 1 : 0; j.bestStreak = Math.max(j.bestStreak, j.streak);
      j.recent.push({ game: item.game, win, opponent: item.opponent }); j.recent = j.recent.slice(-10);
      updateTeamMorale(gameData, win, j.streak);
      (gameData.boxScore || []).forEach(stat => {
        const card = findActiveCardByName(stat.name);
        if (!card) return;
        ensureCardJourney(card);
        card.legacy.games = (card.legacy.games || 0) + 1;
        card.legacy.pts = (card.legacy.pts || 0) + (stat.pts || 0);
        card.legacy.reb = (card.legacy.reb || 0) + (stat.reb || 0);
        card.legacy.ast = (card.legacy.ast || 0) + (stat.ast || 0);
        if (stat.pts >= 60 || stat.ast >= 20 || stat.blk >= 10) {
          card.legacy.records = (card.legacy.records || 0) + 1;
          unlockBack(card, 'record', `Game ${item.game} 紀錄之夜`);
        }
      });
      triggerSpecialGameEvent(item, gameData, true);
    }
    if (j.gameIndex >= SEASON_LENGTH && !j.completed) completeRegularSeason();
    saveGame(); renderAll();
    if (typeof showToast === 'function') showToast(`⚡ 管理員已模擬至 Game ${finalTarget}`, 'success');
  }

  function adminSimulatePlayoffs() {
    if (!state.isAdmin) return;
    if (!state.seasonJourney.completed) adminSimulateFullSeason();
    if (!state.seasonJourney.completed) return;
    if (state.season.hasPlayedPlayoffs) {
      showGameAlert({ title: '季後賽已完成', message: '本季已經完成季後賽，請開啟下一季後再測試。', type: 'info' });
      return;
    }
    const lineup = ['PG','SG','SF','PF','C'].map(pos => state.startingLineup[pos]).filter(Boolean).concat((state.benchLineup || []).filter(Boolean));
    if (!lineup.length) return;
    const fmvp = [...lineup].sort((a,b) => Number(b.ovr || b.baseOvr || 0) - Number(a.ovr || a.baseOvr || 0))[0];
    lineup.forEach(card => {
      ensureCardJourney(card);
      card.legacy.rings = (card.legacy.rings || 0) + 1;
      if (!card.legacy.traits.includes('冠軍成員')) card.legacy.traits.push('冠軍成員');
      unlockBack(card, 'champion', `Season ${state.seasonJourney.seasonNo} Champion`);
    });
    fmvp.legacy.fmvps = (fmvp.legacy.fmvps || 0) + 1;
    fmvp.fmvpBonus = Number(fmvp.fmvpBonus || 0) + 1;
    fmvp.isFmvp = true;
    fmvp.ovr = Number(fmvp.ovr || fmvp.baseOvr || 75) + 1;
    unlockBack(fmvp, 'fmvp', `Season ${state.seasonJourney.seasonNo} FMVP`);
    const opponent = randomOf(OPPONENTS);
    const year = 2025 + Number(state.seasonJourney.seasonNo || 1);
    const newRing = {
      id: `ring_admin_${Date.now()}`, year, record: '16-4', opponent,
      fmvpName: fmvp.name, fmvpNbaId: fmvp.nbaId || 0, fmvpStats: '管理員快速模擬 FMVP',
      starters: ['PG','SG','SF','PF','C'].map(pos => {
        const card = state.startingLineup[pos];
        return card ? { pos, name: card.name, ovr: card.ovr || card.baseOvr || 75, nbaId: card.nbaId || 0, rarity: card.rarity || 'SSR' } : { pos, name: '空缺', ovr: '--', nbaId: 0 };
      })
    };
    if (!Array.isArray(state.championshipRings)) state.championshipRings = [];
    state.championshipRings.push(newRing);
    state.season.hasPlayedPlayoffs = true;
    state.playoffStats = { wins: 16, losses: 4, finalsPlayerStats: {} };
    state.seasonJourney.playoffs = {
      version: 2,
      seasonNo: Number(state.seasonJourney.seasonNo || 1),
      round: 4,
      status: 'complete',
      bracket: [],
      adminSimulated: true,
      updatedAt: new Date().toISOString()
    };
    const history = state.seasonJourney.history[state.seasonJourney.history.length - 1];
    if (history) { history.result = 'NBA Champion'; history.fmvp = fmvp.name; }
    saveGame(); renderAll();
    if (typeof showRewardModal === 'function') showRewardModal({ title: '🏆 管理員季後賽模擬完成', subtitle: `${state.seasonJourney.teamName} 奪下總冠軍，${fmvp.name} 獲選 FMVP。`, rewards: [{ icon: '💍', name: 'Champion 卡背', amount: `全隊 ${lineup.length} 人` }, { icon: '🏆', name: 'FMVP 卡背', amount: fmvp.name }] });
  }

  function openAdminBackPreview() {
    if (!state.isAdmin) return;
    const modal = document.getElementById('sjAdminBackModal');
    const grid = document.getElementById('sjAdminBackGrid');
    if (!modal || !grid) return;
    const player = ['PG','SG','SF','PF','C'].map(pos => state.startingLineup[pos]).find(Boolean) || { name: 'PREVIEW PLAYER' };
    grid.innerHTML = CARD_BACKS.map(back => `<div class="sj-cardback sj-back-${back.id} unlocked rounded-2xl border border-amber-500/50 p-3"><span class="text-2xl">${back.icon}</span><b class="block text-[10px] ${back.tone} mt-2">${back.name}</b><span class="block text-[9px] text-slate-300 mt-2">${back.hint}</span><span class="block text-[9px] text-white font-black mt-2 truncate">${safeText(player.name)}</span></div>`).join('');
    modal.classList.remove('hidden');
  }

  function closeAdminBackPreview() {
    document.getElementById('sjAdminBackModal')?.classList.add('hidden');
  }

  function startNextJourneySeason() {
    const old = state.seasonJourney;
    state.seasonJourney = {
      version: 1,
      seasonNo: (Number(old.seasonNo) || 1) + 1,
      teamName: old.teamName || PLAYER_TEAM_FALLBACK,
      gameIndex: 0, wins: 0, losses: 0, streak: 0, bestStreak: 0,
      schedule: buildSchedule(), recent: [],
      history: Array.isArray(old.history) ? old.history : [],
      awards: [], completed: false, seasonStartedAt: new Date().toISOString()
    };
    state.season.hasPlayedPlayoffs = false;
    state.season.threePtContestPlayed = false;
    state.season.threePtContestShooter = null;
    state.season.threePtContestScore = null;
    saveGame();
    renderJourneySeasonTab();
    if (typeof showToast === 'function') showToast(`🏟️ Season ${state.seasonJourney.seasonNo} 正式開幕！`, 'success');
  }

  function openJourneyPostseason() {
    const j = state.seasonJourney;
    if (!j || !j.completed) return;
    if (j.wins >= 42 || j.playInWon) {
      openPlayoffBracketModal();
      return;
    }
    if (j.wins < 36) {
      showGameAlert({ title: '賽季結束', message: '本季未取得 Play-In 資格，可以開始下一個賽季。', type: 'info' });
      return;
    }
    const modal = document.getElementById('sjPlayInModal');
    const score = document.getElementById('sjPlayInScore');
    const text = document.getElementById('sjPlayInText');
    const action = document.getElementById('sjPlayInAction');
    if (!modal) return;
    modal.classList.remove('hidden');
    if (!j.playInResolved) {
      score.classList.add('hidden');
      text.textContent = '贏球晉級季後賽，輸球結束本季。';
      action.textContent = '進行 Play-In';
      action.onclick = simulateJourneyPlayIn;
    }
  }

  function simulateJourneyPlayIn() {
    const j = state.seasonJourney;
    if (!j || j.playInResolved) return;
    const teamOvr = Number(calculateTeamOverall().overall || 80);
    const opponent = randomOf(OPPONENTS);
    const oppOvr = randomInt(80, 91);
    const probability = clamp(.50 + (teamOvr - oppOvr) * .03, .22, .80);
    const win = Math.random() < probability;
    let mine = randomInt(101, 122), theirs = randomInt(101, 122);
    if (win && mine <= theirs) mine = theirs + randomInt(1, 6);
    if (!win && mine >= theirs) theirs = mine + randomInt(1, 6);
    j.playInResolved = true;
    j.playInWon = win;
    j.playInResult = { opponent, myScore: mine, oppScore: theirs };
    if (!win) state.season.hasPlayedPlayoffs = true;
    saveGame();
    const score = document.getElementById('sjPlayInScore');
    const text = document.getElementById('sjPlayInText');
    const action = document.getElementById('sjPlayInAction');
    score.textContent = `${mine} — ${theirs}`;
    score.classList.remove('hidden');
    text.textContent = win ? `擊敗 ${opponent}，成功取得季後賽席位！` : `不敵 ${opponent}，本賽季旅程在 Play-In 結束。`;
    action.textContent = win ? '進入 Playoffs' : '返回賽季首頁';
    action.onclick = win ? enterJourneyPlayoffs : closeJourneyPlayIn;
    renderJourneySeasonTab();
  }

  function enterJourneyPlayoffs() {
    closeJourneyPlayIn();
    openPlayoffBracketModal();
  }

  function closeJourneyPlayIn() {
    const modal = document.getElementById('sjPlayInModal');
    if (modal) modal.classList.add('hidden');
    renderJourneySeasonTab();
  }

  function closeJourneyGame() {
    const modal = document.getElementById('sjGameModal');
    if (!modal) return;
    if (activeGame && !activeGame.finalized) {
      if (!window.confirm('比賽尚未結束，離開後本場體力不會退還。確定離開嗎？')) return;
    }
    modal.classList.add('hidden');
    if (activeGame && !activeGame.finalized) {
      clearVisualEventTimer();
      shootingChallenge = null;
      activeGame = null;
      visualGameState = null;
    }
    renderJourneySeasonTab();
  }

  function showJourneyBoxScore() {
    if (activeGame && activeGame.boxScore) openGameBoxScoreModal(activeGame.boxScore, `Game ${activeGame.scheduleGame.game}`);
  }

  function renderAchievementBacks(card) {
    const host = document.getElementById('sjAchievementBacks');
    if (!host || !card) return;
    ensureCardJourney(card);
    host.innerHTML = CARD_BACKS.map(back => {
      const owned = card.achievementBacks.find(item => item.id === back.id);
      const active = card.activeCardBack === back.id;
      return `<button ${owned ? `onclick="selectAchievementBack('${safeText(card.cardId)}','${back.id}')"` : 'disabled'} class="sj-cardback sj-back-${back.id} ${owned ? 'unlocked' : 'opacity-45 grayscale'} ${active ? 'active' : ''} text-left rounded-xl border border-slate-800 p-2.5">
        <span class="text-lg">${back.icon}</span><b class="block text-[9px] ${back.tone} mt-1">${back.name}</b><span class="block text-[8px] text-slate-400 mt-1">${owned ? safeText(owned.detail || '已解鎖') : '🔒 ' + back.hint}</span><span class="block text-[8px] text-white font-black mt-1 truncate">${safeText(card.name)}</span>
      </button>`;
    }).join('');
  }

  function selectAchievementBack(cardId, backId) {
    const card = (state.inventory || []).find(c => String(c.cardId) === String(cardId));
    if (!card || !card.achievementBacks.some(x => x.id === backId)) return;
    card.activeCardBack = backId;
    saveGame();
    renderAchievementBacks(card);
    if (typeof renderInventory === 'function') renderInventory();
    if (typeof renderRoster === 'function') renderRoster();
    if (typeof showToast === 'function') showToast(`已將 ${CARD_BACKS.find(x => x.id === backId).name} 設為展示卡背`, 'success');
  }

  function installPlayerDetailExtension() {
    const anchor = document.getElementById('detailPlayerBadges');
    if (!anchor || document.getElementById('sjAchievementBacks')) return;
    const section = document.createElement('section');
    section.className = 'mt-3 pt-3 border-t border-slate-800';
    section.innerHTML = '<div class="flex justify-between items-center mb-2"><h4 class="text-[10px] text-amber-400 font-black sj-kicker">Badge Journey</h4><span id="sjBadgeMastery" class="text-[9px] text-slate-400"></span></div><div id="sjBadgeProgressList" class="sj-badge-progress-list"></div><div id="sjMomentSummary" class="text-[10px] text-slate-500 mb-3"></div><div class="player-detail-backs-heading"><div><span class="player-detail-backs-kicker">ACHIEVEMENT COLLECTION</span><h4>BACKS</h4></div><span>點選已解鎖卡背展示</span></div><div id="sjAchievementBacks" class="grid grid-cols-2 sm:grid-cols-3 gap-2"></div>';
    anchor.parentElement.appendChild(section);
  }

  function hookExistingFunctions() {
    const oldRenderAll = renderAll;
    renderAll = function () { oldRenderAll(); ensureJourneyState(); renderJourneySeasonTab(); };
    renderSeasonTab = renderJourneySeasonTab;
    start82GamesSimulation = openJourneyGame;

    const oldShowPlayerDetails = showPlayerDetails;
    showPlayerDetails = function (event, cardId) {
      oldShowPlayerDetails(event, cardId);
      installPlayerDetailExtension();
      const card = (state.inventory || []).find(c => String(c.cardId) === String(cardId));
      renderAchievementBacks(card);
      if (card) {
        ensureCardJourney(card);
        const mastery = document.getElementById('sjBadgeMastery');
        const progressList = document.getElementById('sjBadgeProgressList');
        const moments = document.getElementById('sjMomentSummary');
        if (mastery) mastery.textContent = `總觸發 ${card.badgeJourney.triggers} 次`;
        if (progressList) {
          const badges = typeof getPlayerBadges === 'function' ? getPlayerBadges(card) : [];
          progressList.innerHTML = badges.length ? badges.map(badge => {
            const progress = ensureBadgeProgress(card, badge.name);
            const tier = badgeTierForTriggers(progress.triggers);
            const pct = tier.next ? clamp(((progress.triggers - tier.min) / (tier.next - tier.min)) * 100, 0, 100) : 100;
            return `<div class="sj-badge-progress tier-${tier.name.toLowerCase().replace(/\s+/g, '-')}"><div><span>${badge.icon || '🏅'}</span><b>${safeText(badge.name)}</b><strong>${tier.label}級</strong></div><i><em style="width:${pct}%"></em></i><small>${tier.next ? `${progress.triggers}/${tier.next} 次觸發升級` : `${progress.triggers} 次 · 已達最高級`}</small></div>`;
          }).join('') : '<p class="text-[10px] text-slate-500 mb-3">這名球員目前沒有可培養徽章。</p>';
        }
        if (moments) moments.textContent = card.badgeJourney.moments.length
          ? `已收藏 ${card.badgeJourney.moments.length} 個 Moment：${card.badgeJourney.moments.map(x => x.split(':').pop()).join('、')}`
          : '尚未解鎖 Badge Moment，於比賽的重要回合中探索。';
      }
    };

    const oldClaimQuestReward = claimQuestReward;
    claimQuestReward = function (qIndex) {
      const wasClaimed = !!state.dailyQuests?.claimed?.[`q${qIndex}`];
      oldClaimQuestReward(qIndex);
      const isClaimed = !!state.dailyQuests?.claimed?.[`q${qIndex}`];
      if (!wasClaimed && isClaimed) grantEnergy(1, `任務 ${qIndex} 完成`);
    };
    const oldClaimAll = claimAllQuestsBonus;
    claimAllQuestsBonus = function () {
      const wasClaimed = !!state.dailyQuests?.claimed?.all;
      oldClaimAll();
      if (!wasClaimed && state.dailyQuests?.claimed?.all) grantEnergy(2, '每日任務全解');
    };

    const oldFinishVocabQuiz = finishVocabQuiz;
    finishVocabQuiz = function () {
      const earnedGameBall = Array.isArray(activeQuizList) && activeQuizList.length === 10 && quizScore === 10;
      oldFinishVocabQuiz();
      if (earnedGameBall && !state.isAdmin) grantEnergy(1, '單字測驗 10/10 滿分');
    };
  }

  function initSeasonJourney() {
    ensureJourneyState();
    injectGameModal();
    renderJourneyShell();
    renderJourneySeasonTab();
    if (energyTimer) clearInterval(energyTimer);
    energyTimer = setInterval(renderEnergy, 1000);
    saveGame();
  }

  window.editJourneyTeamName = editJourneyTeamName;
  window.saveJourneyTeamName = saveJourneyTeamName;
  window.closeJourneyTeamName = closeJourneyTeamName;
  window.closeJourneyGame = closeJourneyGame;
  window.advanceJourneyQuarter = advanceJourneyQuarter;
  window.quickSimJourneyGame = quickSimJourneyGame;
  window.updateJourneyMatchup = updateJourneyMatchup;
  window.confirmJourneyMatchup = confirmJourneyMatchup;
  window.stopJourneyShot = stopJourneyShot;
  window.selectJourneyPregameStrategy = selectJourneyPregameStrategy;
  window.selectJourneyHalftimeStrategy = selectJourneyHalftimeStrategy;
  window.nextComicPage = nextComicPage;
  window.showJourneyBoxScore = showJourneyBoxScore;
  window.selectAchievementBack = selectAchievementBack;
  window.grantSeasonEnergy = grantEnergy;
  window.toggleJourneyAutoMode = toggleJourneyAutoMode;
  window.stopJourneyAutoMode = stopJourneyAutoMode;
  window.adminSimulateToInput = adminSimulateToInput;
  window.adminSimulateFullSeason = adminSimulateFullSeason;
  window.adminSimulatePlayoffs = adminSimulatePlayoffs;
  window.openAdminBackPreview = openAdminBackPreview;
  window.closeAdminBackPreview = closeAdminBackPreview;
  window.openJourneyPostseason = openJourneyPostseason;
  window.simulateJourneyPlayIn = simulateJourneyPlayIn;
  window.enterJourneyPlayoffs = enterJourneyPlayoffs;
  window.closeJourneyPlayIn = closeJourneyPlayIn;

  hookExistingFunctions();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSeasonJourney);
  else initSeasonJourney();
})();

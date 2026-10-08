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
  const MAX_INTERACTIVE_EVENTS = 4;
  const CARD_BACKS = [
    { id: 'champion', icon: '💍', name: 'CHAMPION', zh: '冠軍', art: './assets/cards/backs/champion-v1.webp', hint: '成為冠軍隊成員' },
    { id: 'fmvp', icon: '🏆', name: 'FINALS MVP', zh: '總冠軍賽 MVP', art: './assets/cards/backs/fmvp-v1.webp', hint: '獲得總決賽 MVP' },
    { id: 'mvp', icon: '👑', name: 'MVP', zh: '例行賽 MVP', art: './assets/cards/backs/mvp-v1.webp', hint: '獲得例行賽 MVP' },
    { id: 'dpoy', icon: '🛡️', name: 'DPOY', zh: '年度最佳防守球員', art: './assets/cards/backs/dpoy-v1.webp', hint: '獲得年度最佳防守球員' },
    { id: 'allstar', icon: '⭐', name: 'ALL-STAR', zh: '全明星入選', art: './assets/cards/backs/allstar-v1.png', hint: '正式入選全明星陣容' },
    { id: 'threepoint', icon: '🎯', name: '3-POINT CHAMPION', zh: '三分大賽冠軍', art: './assets/cards/backs/threepoint-v1.png', hint: '贏得全明星三分球大賽' },
    { id: 'record', icon: '⚡', name: 'RECORD BREAKER', zh: '紀錄突破', art: './assets/cards/backs/record-v1.webp', hint: '創下指定單場或生涯紀錄' },
    { id: 'legend', icon: '🐐', name: 'FRANCHISE LEGEND', zh: '隊史傳奇', art: './assets/cards/backs/legend-v1.webp', hint: '8季、400場、1冠及1項重大榮譽' }
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
  const badgeArtworkCache = new Map();
  let shootingChallenge = null;
  let defenseChallenge = null;
  let offenseChallenge = null;
  let arenaMusicTimer = null;
  let arenaMusicStep = 0;
  let arenaMusicMuted = false;
  let energyTimer = null;
  let autoMode = { running: false, remaining: 0, timer: null };
  let standingsConference = 'west';
  let currentSeasonView = 'journey';
  let standingsExpanded = false;
  let leagueLeaderCategory = 'PTS';
  let leaguePulseIndex = 0;
  let leaguePulseTimer = null;

  function now() { return Date.now(); }
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function safeText(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[ch]);
  }
  function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function randomOf(list) { return list[Math.floor(Math.random() * list.length)]; }
  function shuffled(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function seasonSimulation() { return window.SeasonSimulation || null; }

  function scriptRoll(script, label) {
    const simulation = seasonSimulation();
    return simulation && script ? simulation.roll(script.seed, label) : Math.random();
  }

  function scriptRandomInt(script, label, min, max) {
    return Math.floor(scriptRoll(script, label) * (max - min + 1)) + min;
  }

  function recordPlayerScore(card, stat) {
    if (!card) return -Infinity;
    const ovr = playerOvr(card);
    if (stat === 'ast') return statNumber(card, 'AST') * 9 + ovr;
    if (stat === 'reb') return statNumber(card, 'REB') * 7 + statNumber(card, 'BLK') * 4 + ovr;
    if (stat === 'blk') return statNumber(card, 'BLK') * 12 + statNumber(card, 'REB') * 2 + ovr;
    if (stat === 'stl') return statNumber(card, 'STL') * 12 + ovr;
    if (stat === 'threeM') return statNumber(card, '3PA') * 7 + statNumber(card, 'PTS') * 2 + ovr;
    return statNumber(card, 'PTS') * 4 + ovr;
  }

  function ensureGameScript(game, teamOvr, starters) {
    if (!game) return null;
    const simulation = seasonSimulation();
    if (!simulation) return null;
    if (!game.gameScript || Number(game.gameScript.version) !== 1) {
      game.gameScript = simulation.createGameScript({
        seasonNo: state.seasonJourney?.seasonNo || 1,
        seasonStartedAt: state.seasonJourney?.seasonStartedAt || '',
        game: game.game,
        opponent: game.opponent,
        teamOvr,
        opponentOvr: game.opponentOvr,
        special: dynamicSpecial(game) || game.special
      });
    }
    const script = game.gameScript;
    const lineup = (starters || []).filter(Boolean);
    if (lineup.length) {
      const currentFeatured = lineup.find(card => String(card.cardId) === String(script.featuredPlayerCardId))
        || lineup.find(card => card.name === script.featuredPlayerName);
      let featured = currentFeatured;
      if (!featured) {
        if (script.profile === 'historic') {
          featured = [...lineup].sort((a, b) => recordPlayerScore(b, script.recordStat) - recordPlayerScore(a, script.recordStat))[0];
        } else if (script.profile === 'takeover') {
          featured = [...lineup].sort((a, b) => playerOvr(b) - playerOvr(a))[0];
        } else {
          featured = lineup[Number(script.featuredSlot) % lineup.length];
        }
      }
      const cold = lineup.find(card => card.name === script.coldPlayerName)
        || lineup[Number(script.coldSlot) % lineup.length];
      script.featuredPlayerName = featured?.name || '';
      script.featuredPlayerCardId = featured?.cardId || '';
      script.coldPlayerName = cold && cold.name !== script.featuredPlayerName ? cold.name : '';
    }
    return script;
  }

  function simulationScriptForSide(script, side, roster) {
    if (!script) return null;
    const lineup = (roster || []).filter(Boolean);
    const result = { ...script };
    if (side === 'opponent') {
      const featured = script.profile === 'historic' && script.recordTeam === 'opponent'
        ? [...lineup].sort((a, b) => recordPlayerScore(b, script.recordStat) - recordPlayerScore(a, script.recordStat))[0]
        : [...lineup].sort((a, b) => playerOvr(b) - playerOvr(a))[0];
      result.featuredPlayerName = featured?.name || '';
      const cold = lineup[Number(script.coldSlot) % Math.max(1, lineup.length)];
      result.coldPlayerName = cold && cold.name !== result.featuredPlayerName ? cold.name : '';
    }
    if (script.hotTeam !== side && script.recordTeam !== side) result.featuredBoost = 1.04;
    if (script.profile === 'historic' && script.recordTeam === side) result.featuredBoost = Math.max(1.82, Number(script.featuredBoost) || 1);
    return result;
  }

  function buildInteractionPlan() {
    const types = shuffled(['shoot', 'defense', 'offense']);
    return { 1: types[0], 2: types[1], 3: types[2] };
  }

  function playJourneySound(type) {
    try {
      if (typeof playSound === 'function') playSound(type);
    } catch (error) {}
  }

  function stopJourneyArenaMusic() {
    if (arenaMusicTimer) clearTimeout(arenaMusicTimer);
    arenaMusicTimer = null;
  }

  function scheduleJourneyArenaBeat() {
    stopJourneyArenaMusic();
    if (arenaMusicMuted || !activeGame || activeGame.finalized || typeof getAudioContext !== 'function') return;
    try {
      const ctx = getAudioContext();
      const notes = [110, 110, 146.83, 110, 164.81, 146.83, 98, 110];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = arenaMusicStep % 4 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(notes[arenaMusicStep % notes.length], ctx.currentTime);
      gain.gain.setValueAtTime(.018, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .32);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + .34);
      arenaMusicStep += 1;
    } catch (error) {}
    arenaMusicTimer = setTimeout(scheduleJourneyArenaBeat, 520);
  }

  function toggleJourneyArenaMusic() {
    arenaMusicMuted = !arenaMusicMuted;
    const button = document.getElementById('sjMusicToggle');
    if (button) button.textContent = arenaMusicMuted ? '🔇' : '♫';
    if (arenaMusicMuted) stopJourneyArenaMusic();
    else scheduleJourneyArenaBeat();
  }

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
        ? { position, name: player.name, ovr: playerOvr(player), nbaId: player.nbaId || 0, positions: normalizePositions(player), basic: player.basic || null }
        : { position, name: `${game.opponent} ${position}`, ovr: clamp(game.opponentOvr + (index === 2 ? 2 : randomInt(-3, 2)), 72, 98), nbaId: 0 };
    });
    game.opponentRoster = roster;
    return roster;
  }

  function isPlaceholderOpponentBench(player, opponentName) {
    const name = String(player?.name || '');
    return !name
      || /^B[1-6]$/.test(name)
      || name.startsWith(`${opponentName || ''} 替補`)
      || name.startsWith(`${opponentName || ''} Rotation`);
  }

  function getOpponentBench(game) {
    if (!game) return [];
    const saved = Array.isArray(game.opponentBench) ? game.opponentBench : [];
    if (saved.length === 6 && saved.every(player => !isPlaceholderOpponentBench(player, game.opponent))) return saved;

    const code = TEAM_CODES[game.opponent];
    const starters = getOpponentRoster(game);
    const starterNames = new Set(starters.map(player => player.name));
    const pool = typeof NBA_PLAYERS !== 'undefined'
      ? NBA_PLAYERS
        .filter(player => player.team === code && String(player.edition || '') === '26' && !starterNames.has(player.name))
        .sort((a, b) => playerOvr(b) - playerOvr(a))
      : [];
    const preferredPositions = ['PG', 'SG', 'SF', 'PF', 'C', 'G'];
    const unused = [...pool];
    const bench = preferredPositions.map((position, index) => {
      let foundAt = unused.findIndex(player => normalizePositions(player).includes(position));
      if (foundAt < 0) foundAt = 0;
      const player = unused.splice(foundAt, 1)[0];
      return player
        ? {
            name: player.name,
            ovr: playerOvr(player),
            baseOvr: playerOvr(player),
            nbaId: player.nbaId || 0,
            positions: normalizePositions(player),
            basic: player.basic || null
          }
        : {
            name: `${game.opponent} Rotation ${index + 1}`,
            positions: [index < 2 ? 'G' : index < 4 ? 'F' : 'C'],
            ovr: clamp(Number(game.opponentOvr || 80) - 5 - index, 68, 88),
            baseOvr: clamp(Number(game.opponentOvr || 80) - 5 - index, 68, 88)
          };
    });
    game.opponentBench = bench;
    return bench;
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

  function statNumber(card, key) {
    return Number.parseFloat(card?.basic?.[key] ?? card?.stats?.[key] ?? 0) || 0;
  }

  function defensiveProfile(card) {
    const ovr = playerOvr(card);
    const stl = statNumber(card, 'STL');
    const blk = statNumber(card, 'BLK');
    const reb = statNumber(card, 'REB');
    const badges = typeof getPlayerBadges === 'function' ? getPlayerBadges(card) : [];
    const names = new Set(badges.map(badge => badge.name));
    const archetype = typeof getPlayerArchetype === 'function' ? getPlayerArchetype(card) : null;
    const perimeter = clamp(Math.round(48 + (ovr - 70) * .9 + stl * 7
      + (names.has('外線大鎖') ? 9 : 0) + (names.has('小偷') ? 5 : 0) + (archetype?.type === '3d' ? 5 : 0)), 52, 99);
    const interior = clamp(Math.round(46 + (ovr - 70) * .82 + blk * 8 + reb * .35
      + (names.has('木桶伯') ? 10 : 0) + (names.has('禁區大鎖') ? 8 : 0) + (archetype?.type === 'big_rebound' ? 4 : 0)), 50, 99);
    return { perimeter, interior, steal: clamp(Math.round(perimeter * .72 + stl * 9), 45, 99), badges: names };
  }

  function positionGroups(position) {
    if (position === 'PG') return ['guard'];
    if (position === 'SG') return ['guard', 'wing'];
    if (position === 'PF') return ['wing', 'big'];
    if (position === 'C') return ['big'];
    return ['wing'];
  }

  function matchupDefenseRating(defender, opponent) {
    const profile = defensiveProfile(defender);
    const targetPosition = opponent?.position || normalizePositions(opponent)[0] || 'SF';
    const targetGroups = positionGroups(targetPosition);
    const defenderPositions = normalizePositions(defender);
    const defenderGroups = new Set(defenderPositions.flatMap(positionGroups));
    const relevant = targetPosition === 'C'
      ? profile.interior
      : targetPosition === 'PF'
        ? Math.round((profile.perimeter + profile.interior) / 2)
        : profile.perimeter;
    const exactFit = defenderPositions.includes(targetPosition);
    const groupFit = targetGroups.some(group => defenderGroups.has(group));
    const mismatch = exactFit ? 3 : (groupFit ? 0 : -7);
    return clamp(relevant + mismatch, 45, 99);
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
      else if (game === 47) special = { key: 'allstar-selection', icon: '★', label: 'All-Star Selection' };
      else if (game === 50) special = { key: 'allstar', icon: '⭐', label: 'All-Star Weekend' };
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
    if (!Array.isArray(card.legacy.monthlyHonors)) card.legacy.monthlyHonors = [];
    if (!Array.isArray(card.legacy.allStarHonors)) card.legacy.allStarHonors = [];
    card.legacy.allStars = Math.max(0, Number(card.legacy.allStars) || 0);
    card.legacy.threePtTitles = Math.max(0, Number(card.legacy.threePtTitles) || 0);
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
    } else if (special.key === 'allstar-selection') {
      const weekend = announceAllStarSelections();
      const selected = window.SeasonAllStar?.playerSelections(weekend) || [];
      const snubs = window.SeasonAllStar?.playerSnubs(weekend) || [];
      if (selected.length) {
        state.tickets += 2;
        state.scoutPoints = (Number(state.scoutPoints) || 0) + 30;
      }
      const message = selected.length
        ? `${selected.map(player => player.name).join('、')} 入選全明星並解鎖 ALL-STAR BACK。`
        : (snubs.length ? `${snubs.map(player => player.name).join('、')} 遺憾落選，下一場進入 REVENGE GAME。` : '東西區全明星與三分大賽名單正式公布。');
      if (silent) notify('★ All-Star Selection', message);
      else {
        if (typeof addNotification === 'function') addNotification({ title: '★ All-Star Selection', message, icon: '⭐', type: 'achievement' });
        pauseAutoForEvent('All-Star Selection');
        openAllStarSelectionAnnouncement(weekend);
      }
    } else if (special.key === 'allstar') {
      const league = syncLeagueState();
      const weekend = window.SeasonAllStar?.ensure(state.seasonJourney, league);
      if (weekend) weekend.weekendSeen = true;
      if (silent) notify('⭐ All-Star Weekend', '明星賽與三分球大賽正式登場，完整名單已寫入本季紀錄。');
      else {
        pauseAutoForEvent('All-Star Weekend');
        renderAllStarWeekend(weekend);
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
    if ((legacy.allStars || 0) > 0 && !card.achievementBacks.some(x => x.id === 'allstar')) {
      card.achievementBacks.push({ id: 'allstar', unlockedAt: new Date().toISOString(), detail: `ALL-STAR ×${legacy.allStars}` });
    }
    if ((legacy.threePtTitles || 0) > 0 && !card.achievementBacks.some(x => x.id === 'threepoint')) {
      card.achievementBacks.push({ id: 'threepoint', unlockedAt: new Date().toISOString(), detail: `3-POINT CHAMPION ×${legacy.threePtTitles}` });
    }
    const major = (legacy.mvps || 0) + (legacy.fmvps || 0) + (legacy.dpoys || 0) + (legacy.records || 0);
    if ((legacy.seasons || 0) >= 8 && (legacy.games || 0) >= 400 && (legacy.rings || 0) >= 1 && major >= 1 && !card.achievementBacks.some(x => x.id === 'legend')) {
      card.achievementBacks.push({ id: 'legend', unlockedAt: new Date().toISOString(), detail: `${legacy.seasons}季・${legacy.games}場` });
    }
  }

  function activeSeasonCards() {
    const cards = LINEUP_POSITIONS.map(position => state.startingLineup?.[position])
      .concat(Array.isArray(state.benchLineup) ? state.benchLineup : [])
      .filter(Boolean);
    const seen = new Set();
    return cards.filter(card => {
      const key = card.cardId || `${card.name}:${card.edition || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function applyMonthlyCareerHonors() {
    const journey = state.seasonJourney;
    const awards = journey?.leagueState?.monthlyAwards || [];
    awards.filter(award => award.isPlayer).forEach(award => {
      const cardId = String(award.playerKey || '').replace(/^player:/, '');
      const card = (state.inventory || []).find(item => String(item.cardId) === cardId)
        || activeSeasonCards().find(item => item.name === award.player);
      if (!card) return;
      ensureCardJourney(card);
      if (card.legacy.monthlyHonors.some(honor => honor.id === award.id)) return;
      card.legacy.monthlyHonors.push({
        id: award.id, type: 'player-of-the-month', seasonNo: journey.seasonNo,
        monthKey: award.monthKey, monthLabel: award.monthLabel,
        conference: award.conference, settledAtGame: award.settledAtGame
      });
    });
  }

  function syncLeagueState(forceRace = false) {
    const journey = state.seasonJourney;
    if (!journey || !window.SeasonLeague) return null;
    const players = typeof NBA_PLAYERS !== 'undefined' && Array.isArray(NBA_PLAYERS) ? NBA_PLAYERS : [];
    const standings = window.SeasonStandings?.view(journey, players) || null;
    const league = window.SeasonLeague.sync(journey, players, activeSeasonCards(), standings);
    if (forceRace && league) window.SeasonLeague.finalizeAwards(league, journey);
    applyMonthlyCareerHonors();
    return league;
  }

  function cardForAllStarPlayer(player) {
    if (!player?.isPlayer) return null;
    const cardId = String(player.key || '').replace(/^player:/, '');
    return activeSeasonCards().find(card => String(card.cardId) === cardId)
      || activeSeasonCards().find(card => card.name === player.name)
      || (state.inventory || []).find(card => card?.name === player.name)
      || null;
  }

  function allStarRowMarkup(player, label) {
    return `<div class="rounded-xl border ${player.isPlayer ? 'border-amber-400/60 bg-amber-500/10' : 'border-slate-800 bg-slate-950/65'} px-3 py-2">
      <div class="flex min-w-0 items-center justify-between gap-2 overflow-x-auto">
        <b class="whitespace-nowrap text-xs ${player.isPlayer ? 'text-amber-300' : 'text-slate-100'}">${safeText(player.name)}</b>
        <span class="shrink-0 whitespace-nowrap text-[9px] text-slate-500">${safeText(player.team)} · ${safeText(label)}</span>
      </div>
      <span class="mt-1 block whitespace-nowrap text-[9px] font-mono text-slate-300">${Number(player.ppg || 0).toFixed(1)} PTS · ${Number(player.rpg || 0).toFixed(1)} REB · ${Number(player.apg || 0).toFixed(1)} AST</span>
    </div>`;
  }

  function applyAllStarHonors(weekend) {
    if (!weekend || weekend.honorsApplied) return;
    const selected = window.SeasonAllStar?.playerSelections(weekend) || [];
    selected.forEach(player => {
      const card = cardForAllStarPlayer(player);
      if (!card) return;
      ensureCardJourney(card);
      card.legacy.allStars = (Number(card.legacy.allStars) || 0) + 1;
      if (!Array.isArray(card.legacy.allStarHonors)) card.legacy.allStarHonors = [];
      card.legacy.allStarHonors.push({ seasonNo: state.seasonJourney.seasonNo, role: player.selectionType, conference: player.conference });
      unlockBack(card, 'allstar', `Season ${state.seasonJourney.seasonNo} · ${player.conference.toUpperCase()} ${player.selectionType.toUpperCase()}`);
    });
    weekend.revengeGames = (window.SeasonAllStar?.playerSnubs(weekend) || []).map(player => ({
      player: player.name,
      playerKey: player.key,
      game: Number(weekend.selectionGame || 47) + 1,
      reason: player.reason
    }));
    weekend.honorsApplied = true;
  }

  function announceAllStarSelections() {
    const league = syncLeagueState();
    const weekend = window.SeasonAllStar?.announce(state.seasonJourney, league);
    if (!weekend) return null;
    applyAllStarHonors(weekend);
    return weekend;
  }

  function renderAllStarSelectionAnnouncement(weekend) {
    const host = document.getElementById('allStarSelectionContent');
    if (!host || !weekend) return;
    const playerSelections = window.SeasonAllStar?.playerSelections(weekend) || [];
    const playerSnubs = window.SeasonAllStar?.playerSnubs(weekend) || [];
    const invites = window.SeasonAllStar?.playerThreePointInvites(weekend) || [];
    const conference = block => `<section><h4 class="mb-2 text-[10px] font-black tracking-[.16em] text-blue-300">${block.conference.toUpperCase()} · STARTERS / RESERVES</h4><div class="space-y-1.5">${block.selected.map(player => allStarRowMarkup(player, player.selectionType)).join('')}</div></section>`;
    host.innerHTML = `<div class="grid gap-4 md:grid-cols-2">${conference(weekend.west)}${conference(weekend.east)}</div>
      <section class="mt-4 rounded-2xl border border-rose-500/30 bg-rose-950/20 p-3"><h4 class="text-[10px] font-black tracking-[.16em] text-rose-300">SNUB WATCH</h4><div class="mt-2 space-y-1">${weekend.snubs.slice(0, 4).map(player => `<div class="flex justify-between gap-2 text-[10px]"><b class="${player.isPlayer ? 'text-amber-300' : 'text-slate-200'}">${safeText(player.name)}${player.isPlayer ? ' · REVENGE GAME' : ''}</b><span class="text-slate-500">${safeText(player.reason)}</span></div>`).join('')}</div></section>
      <section class="mt-3 rounded-2xl border border-amber-400/30 bg-amber-500/5 p-3"><h4 class="text-[10px] font-black tracking-[.16em] text-amber-300">3PT CONTEST · INVITED</h4><div class="mt-2 space-y-1">${weekend.threePointParticipants.map((player, index) => `<p class="flex items-center justify-between gap-2 text-[10px] text-slate-300"><span class="whitespace-nowrap">${index + 1}. ${safeText(player.name)}${player.isPlayer ? ' ✓' : ''}</span><span class="shrink-0 text-[9px] uppercase text-slate-500">${safeText(player.inviteType || 'invite')}</span></p>`).join('')}</div>${weekend.threePointDeclined?.length ? `<div class="mt-2 border-t border-slate-800 pt-2"><b class="text-[9px] text-slate-500">DECLINED / REPLACED</b>${weekend.threePointDeclined.map(player => `<p class="mt-1 whitespace-nowrap text-[9px] text-slate-500">${safeText(player.name)}</p>`).join('')}</div>` : ''}</section>
      <section class="mt-3 rounded-xl bg-slate-950/45 p-3 text-[10px] font-bold text-slate-400"><b class="block text-[9px] tracking-[.14em] text-slate-500">YOUR PLAYERS</b>${playerSelections.length ? playerSelections.map(player => `<p class="mt-1 whitespace-nowrap text-amber-300">${safeText(player.name)} · ALL-STAR ★</p>`).join('') : '<p class="mt-1">本季無人入選</p>'}${playerSnubs.map(player => `<p class="mt-1 whitespace-nowrap text-rose-300">${safeText(player.name)} · SNUB</p>`).join('')}${invites.map(player => `<p class="mt-1 whitespace-nowrap text-blue-300">${safeText(player.name)} · 3PT ACCEPTED</p>`).join('')}</section>`;
  }

  function openAllStarSelectionAnnouncement(weekend) {
    renderAllStarSelectionAnnouncement(weekend);
    const modal = document.getElementById('allStarSelectionModal');
    if (modal) { modal.classList.remove('hidden'); modal.style.display = 'flex'; }
  }

  function closeAllStarSelectionAnnouncement() {
    const modal = document.getElementById('allStarSelectionModal');
    if (modal) { modal.classList.add('hidden'); modal.style.display = ''; }
    resumeAutoAfterEvent();
  }

  function closeAllStarWeekend() {
    const modal = document.getElementById('allStarEventModal');
    if (modal) { modal.classList.add('hidden'); modal.style.display = ''; }
    resumeAutoAfterEvent();
  }

  function renderAllStarWeekend(weekend) {
    if (!weekend) return;
    const selections = window.SeasonAllStar?.playerSelections(weekend) || [];
    const invites = window.SeasonAllStar?.playerThreePointInvites(weekend) || [];
    const primary = selections[0] || invites[0] || weekend.west?.starters?.[0];
    const card = cardForAllStarPlayer(primary);
    const image = document.getElementById('asgPlayerImg');
    if (image) image.src = getPlayerImgUrl(card?.nbaId || primary?.nbaId || 0);
    const name = document.getElementById('asgPlayerName');
    if (name) name.textContent = primary?.name || 'LEAGUE ALL-STARS';
    const stats = document.getElementById('asgPlayerStats');
    if (stats) stats.textContent = primary ? `${primary.selectionType === 'starter' ? '先發' : '替補'} · ${primary.ppg.toFixed(1)}分 ${primary.rpg.toFixed(1)}板 ${primary.apg.toFixed(1)}助` : '東西區明星齊聚';
    const summary = document.getElementById('allStarWeekendSummary');
    const contestRanking = Array.isArray(weekend.contestResult) ? [...weekend.contestResult].sort((a, b) => Number(b.score || 0) - Number(a.score || 0)) : [];
    if (summary) summary.innerHTML = `<div class="grid grid-cols-2 gap-2 text-[10px]"><div class="rounded-xl bg-blue-950/40 border border-blue-500/20 p-2"><b class="text-blue-300">WEST</b><div class="mt-1 space-y-1 text-slate-300">${weekend.west.starters.map((player, index) => `<p class="whitespace-nowrap">${index + 1}. ${safeText(player.name)}</p>`).join('')}</div></div><div class="rounded-xl bg-rose-950/40 border border-rose-500/20 p-2"><b class="text-rose-300">EAST</b><div class="mt-1 space-y-1 text-slate-300">${weekend.east.starters.map((player, index) => `<p class="whitespace-nowrap">${index + 1}. ${safeText(player.name)}</p>`).join('')}</div></div></div>${contestRanking.length ? `<div class="mt-3 rounded-xl border border-amber-400/25 bg-amber-500/5 p-3 text-[10px]"><b class="text-amber-300">3PT CONTEST · FINAL RANKING</b><div class="mt-2 space-y-1">${contestRanking.map((player, index) => `<p class="flex items-center justify-between gap-2 ${player.isPlayer ? 'text-amber-300' : 'text-slate-300'}"><span class="whitespace-nowrap">${index + 1}. ${safeText(player.name)}${player.isPlayer ? '（你）' : ''}</span><strong class="shrink-0">${Number(player.score || 0)} 分</strong></p>`).join('')}</div></div>` : ''}`;
    const snub = document.getElementById('allStarSnubPanel');
    const playerSnubs = window.SeasonAllStar?.playerSnubs(weekend) || [];
    if (snub) {
      snub.classList.toggle('hidden', !playerSnubs.length);
      snub.innerHTML = playerSnubs.length ? `<div class="rounded-xl border border-rose-500/30 bg-rose-950/25 p-2 text-[10px]"><b class="text-rose-300">REVENGE GAME ACTIVE</b><p class="text-slate-300">${playerSnubs.map(player => safeText(player.name)).join('、')} 因落選獲得下一場敘事加成。</p></div>` : '';
    }
    const button = document.getElementById('btnOpenThreePtFromAllStar');
    if (button) {
      const canPlay = invites.length > 0 && !state.season?.threePtContestPlayed;
      button.disabled = !canPlay;
      button.innerText = state.season?.threePtContestPlayed
        ? `🎯 三分大賽已完成 · ${state.season.threePtContestScore || 0}分`
        : (canPlay ? `🎯 ${invites[0].name} · ACCEPTED` : '🎯 本季未獲三分大賽邀請');
      button.classList.toggle('opacity-50', !canPlay);
      button.classList.toggle('cursor-not-allowed', !canPlay);
    }
  }

  function allStarRevengeName(gameNumber) {
    return state.seasonJourney?.allStarWeekend?.revengeGames?.find(item => Number(item.game) === Number(gameNumber))?.player || '';
  }

  function awardThreePointChampion(playerName, score, leaderboard) {
    const card = findActiveCardByName(playerName);
    if (!card) return false;
    const weekend = state.seasonJourney?.allStarWeekend;
    if (weekend?.threePointBackAwarded) return false;
    ensureCardJourney(card);
    card.legacy.threePtTitles = (Number(card.legacy.threePtTitles) || 0) + 1;
    unlockBack(card, 'threepoint', `Season ${state.seasonJourney.seasonNo} · ${score} PTS · CONTEST WINNER`);
    if (weekend) {
      weekend.threePointBackAwarded = true;
      weekend.threePointChampionName = playerName;
      const participant = weekend.threePointParticipants?.find(player => player.name === playerName);
      weekend.threePointChampionKey = participant?.key || null;
      weekend.contestResult = (leaderboard || []).map(player => ({ name: String(player.name || '').replace(' (你)', ''), score: Number(player.score || 0), isPlayer: !!player.isPlayer }));
    }
    if (typeof addNotification === 'function') addNotification({ title: '🎯 3-POINT CHAMPION', message: `${playerName} 贏得三分球大賽，解鎖全新 Achievement BACK。`, icon: '🏆', type: 'achievement' });
    saveGame();
    return true;
  }

  function applyAllStarRevengeScript(script, gameNumber) {
    const name = allStarRevengeName(gameNumber);
    if (!script || !name) return script;
    script.featuredPlayerName = name;
    script.featuredBoost = Math.max(1.18, Number(script.featuredBoost) || 1);
    script.revengeGame = true;
    return script;
  }

  function ensureJourneyState() {
    if (!state.seasonJourney || typeof state.seasonJourney !== 'object') {
      state.seasonJourney = {
        version: 3, seasonNo: 1, teamName: PLAYER_TEAM_FALLBACK,
        gameIndex: 0, wins: 0, losses: 0, streak: 0, bestStreak: 0,
        schedule: buildSchedule(), recent: [], history: [], completed: false,
        seasonStartedAt: new Date().toISOString()
      };
    }
    const journey = state.seasonJourney;
    journey.version = 3;
    if (!Array.isArray(journey.schedule) || journey.schedule.length !== SEASON_LENGTH) journey.schedule = buildSchedule();
    if (!Array.isArray(journey.recent)) journey.recent = [];
    if (!Array.isArray(journey.history)) journey.history = [];
    if (!Array.isArray(journey.awards)) journey.awards = [];
    journey.teamName = String(journey.teamName || PLAYER_TEAM_FALLBACK).slice(0, 24);
    journey.gameIndex = clamp(Number(journey.gameIndex) || 0, 0, SEASON_LENGTH);
    journey.schedule.forEach(game => {
      if (game.game === 41 && game.special?.key === 'allstar') game.special = null;
      if (game.game === 47) game.special = { key: 'allstar-selection', icon: '★', label: 'All-Star Selection' };
      if (game.game === 50) game.special = { key: 'allstar', icon: '⭐', label: 'All-Star Weekend' };
      if (!Array.isArray(game.moments)) game.moments = [];
      if (game.played && !game.analysis) game.analysis = null;
    });
    if (seasonSimulation()) journey.recordBook = seasonSimulation().ensureRecordBook(journey.recordBook);
    window.SeasonStandings?.ensure(journey, typeof NBA_PLAYERS !== 'undefined' ? NBA_PLAYERS : []);
    syncLeagueState();

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
    return getJourneyStandings()?.rankLabel || '尚未排名';
  }

  function getJourneyStandings() {
    return window.SeasonStandings?.view(state.seasonJourney, typeof NBA_PLAYERS !== 'undefined' ? NBA_PLAYERS : []) || null;
  }

  function selectJourneyConference(conference) {
    if (!['west', 'east'].includes(conference)) return;
    standingsConference = conference;
    renderJourneyStandings();
  }

  function renderJourneyStandings() {
    const view = getJourneyStandings();
    if (!view) return;
    const progress = document.getElementById('sjStandingsProgress');
    if (progress) progress.textContent = `例行賽 ${view.round} / 82 場 · 每場結束後更新`;
    const expandButton = document.getElementById('sjStandingsExpand');
    if (expandButton) expandButton.textContent = standingsExpanded ? '收合至前 8 名' : '查看完整排名';
    document.querySelectorAll('[data-sj-conference-tab]').forEach(button => {
      const active = button.dataset.sjConferenceTab === standingsConference;
      button.setAttribute('aria-selected', String(active));
      button.classList.toggle('is-active', active);
    });
    for (const conference of ['west', 'east']) {
      const panel = document.getElementById(`sjStandings${conference === 'west' ? 'West' : 'East'}`);
      const body = document.getElementById(`sjStandings${conference === 'west' ? 'West' : 'East'}Rows`);
      if (panel) panel.dataset.active = String(standingsConference === conference);
      if (!body) continue;
      const rows = standingsExpanded ? view.conferences[conference] : view.conferences[conference].slice(0, 8);
      body.innerHTML = rows.map(team => {
        const percentage = team.games ? team.percentage.toFixed(3).replace(/^0/, '') : '—';
        const behind = team.rank === 1 || !view.round ? '—' : Number.isInteger(team.gamesBack) ? String(team.gamesBack) : team.gamesBack.toFixed(1);
        return `<tr class="${team.isPlayer ? 'is-player' : ''}">
          <td>${team.rank || '—'}</td>
          <th scope="row"><span class="sj-standings-code">${team.isPlayer ? 'YOU' : team.code}</span><span class="sj-standings-team" title="${safeText(team.name)}">${safeText(team.name)}</span></th>
          <td>${team.wins}</td><td>${team.losses}</td><td>${percentage}</td><td>${behind}</td>
        </tr>`;
      }).join('');
    }
  }

  function toggleJourneyStandingsExpansion() {
    standingsExpanded = !standingsExpanded;
    renderJourneyStandings();
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

  function seasonMovementMarkup(movement) {
    const symbol = movement === 'up' ? '↑' : (movement === 'down' ? '↓' : '—');
    return `<span class="sj-race-movement is-${movement || 'same'}" aria-label="${movement === 'up' ? '排名上升' : movement === 'down' ? '排名下降' : '排名不變'}">${symbol}</span>`;
  }

  function showSeasonView(view) {
    currentSeasonView = ['journey', 'league', 'awards'].includes(view) ? view : 'journey';
    document.querySelectorAll('[data-sj-view]').forEach(button => {
      const active = button.dataset.sjView === currentSeasonView;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('[data-sj-view-panel]').forEach(panel => panel.classList.toggle('hidden', panel.dataset.sjViewPanel !== currentSeasonView));
    if (currentSeasonView === 'league') renderLeaguePanel();
    if (currentSeasonView === 'awards') renderAwardsPanel();
  }

  function selectLeagueLeaderCategory(category) {
    leagueLeaderCategory = ['PTS', 'REB', 'AST', 'STL', 'BLK'].includes(category) ? category : 'PTS';
    renderLeaguePanel();
  }

  function openLeaguePulse(button) {
    showSeasonView(button?.dataset?.target || 'league');
  }

  function renderJourneyGameWindow() {
    const journey = state.seasonJourney;
    const host = document.getElementById('sjGameWindow');
    if (!host) return;
    const currentIndex = journey.completed ? 81 : clamp(journey.gameIndex, 0, 81);
    const start = clamp(currentIndex - 2, 0, 77);
    host.innerHTML = journey.schedule.slice(start, start + 5).map(game => {
      const current = !journey.completed && game.game === journey.gameIndex + 1;
      const complete = !!game.played;
      const special = dynamicSpecial(game);
      const marker = complete ? '✓' : (current ? '●' : '○');
      const detail = special ? `${special.icon} ${special.key.toUpperCase()}` : (complete ? (game.win ? 'WIN' : 'LOSS') : safeText(game.opponent));
      return `<div class="sj-game-node ${complete ? 'is-complete' : ''} ${current ? 'is-current' : ''}" title="Game ${game.game} vs ${safeText(game.opponent)}">
        <small>GAME ${game.game}</small><b>${marker}</b><em>${detail}</em>
      </div>`;
    }).join('');
  }

  function renderJourneyRecent() {
    const host = document.getElementById('sjRecentList');
    if (!host) return;
    const games = state.seasonJourney.schedule.filter(game => game.played).slice(-3).reverse();
    host.innerHTML = games.length ? games.map(game => `<div class="sj-recent-row ${game.win ? '' : 'is-loss'}">
      <b>${game.win ? 'W' : 'L'}</b><span>Game ${game.game} · ${safeText(game.opponent)}</span><em>${game.myScore}-${game.oppScore}</em>
    </div>`).join('') : '<p class="sj-empty-copy">完成第一場比賽後，最近賽果會顯示在這裡。</p>';
  }

  function renderLeaguePulse() {
    const button = document.getElementById('sjLeaguePulse');
    const body = document.getElementById('sjLeaguePulseBody');
    if (!button || !body || !window.SeasonLeague) return;
    const view = window.SeasonLeague.view(state.seasonJourney);
    if (!view) return;
    const mvpRace = view.awardRaces.mvp || [];
    const playerCandidate = mvpRace.find(player => player.isPlayer) || mvpRace[0];
    const hotTeam = view.teamTrends?.[0];
    const leaderCategories = ['PTS', 'AST', 'BLK'];
    const leaderCategory = leaderCategories[Math.floor(leaguePulseIndex / 3) % leaderCategories.length];
    const leader = view.leaders?.[leaderCategory]?.[0];
    const gameIndex = Number(state.seasonJourney.gameIndex || 0);
    const allStarPreview = gameIndex >= 40 && gameIndex < 47 && window.SeasonAllStar
      ? window.SeasonAllStar.build(state.seasonJourney, state.seasonJourney.leagueState)
      : null;
    const allStarWatch = allStarPreview
      ? window.SeasonAllStar.playerSelections(allStarPreview)[0]
        || allStarPreview.west?.selected?.find(player => player.isPlayer)
        || allStarPreview.west?.starters?.[0]
      : null;
    const items = [
      allStarWatch && { target: 'awards', label: 'ALL-STAR WATCH · GAME 47', name: allStarWatch.name, stat: `${allStarWatch.ppg.toFixed(1)} PPG · ${allStarWatch.selectionType.toUpperCase()} PROJECTION`, rank: '★' },
      playerCandidate && { target: 'awards', label: 'MVP RACE', name: playerCandidate.name, stat: `${playerCandidate.ppg.toFixed(1)} PPG · ${playerCandidate.teamWins} WINS`, rank: `#${playerCandidate.rank} ${seasonMovementMarkup(playerCandidate.movement)}` },
      hotTeam && { target: 'league', label: 'HOT TEAM · LAST 5', name: hotTeam.isPlayer ? state.seasonJourney.teamName : hotTeam.name, stat: hotTeam.form.join(' · ') || 'SEASON OPENING', rank: `${hotTeam.winsLast5}W` },
      leader && { target: 'league', label: `LEAGUE LEADER · ${leaderCategory}`, name: leader.name, stat: `${leader.value.toFixed(1)} ${leader.suffix}`, rank: '#1' }
    ].filter(Boolean);
    const item = items[leaguePulseIndex % Math.max(1, items.length)];
    if (!item) {
      button.dataset.target = 'league';
      body.innerHTML = '<div class="sj-league-pulse__copy"><small>LEAGUE PULSE</small><strong>賽季即將開始</strong><span>完成第一場後更新聯盟動態</span></div><div class="sj-league-pulse__rank">›</div>';
      return;
    }
    button.dataset.target = item.target;
    body.innerHTML = `<div class="sj-league-pulse__copy"><small>${item.label}</small><strong>${safeText(item.name)}</strong><span>${item.stat}</span></div><div class="sj-league-pulse__rank">${item.rank}</div>`;
  }

  function renderLeaguePanel() {
    if (!window.SeasonLeague) return;
    const view = window.SeasonLeague.view(state.seasonJourney);
    if (!view) return;
    renderJourneyStandings();
    document.querySelectorAll('[data-sj-leader]').forEach(button => button.classList.toggle('is-active', button.dataset.sjLeader === leagueLeaderCategory));
    const leaders = document.getElementById('sjLeagueLeaders');
    const rows = view.leaders?.[leagueLeaderCategory] || [];
    if (leaders) leaders.innerHTML = rows.length ? rows.map(player => `<div class="sj-ranking-row ${player.isPlayer ? 'is-player' : ''}">
      <span class="sj-ranking-row__rank">${player.rank}</span><span class="sj-ranking-row__player"><b>${safeText(player.name)}${player.isPlayer ? ' · YOU' : ''}</b><small>${player.isPlayer ? safeText(state.seasonJourney.teamName) : safeText(player.team)}${player.projected ? ' · PRESEASON' : ''}</small></span><strong class="sj-ranking-row__value">${player.value.toFixed(1)} ${player.suffix}</strong>
    </div>`).join('') : '<p class="sj-empty-copy">尚無聯盟數據。</p>';
    const trends = document.getElementById('sjTeamTrends');
    if (trends) {
      const hot = view.teamTrends?.[0];
      const win = [...(view.teamTrends || [])].filter(team => team.streakType === 'W').sort((a, b) => b.streak - a.streak)[0];
      const loss = [...(view.teamTrends || [])].filter(team => team.streakType === 'L').sort((a, b) => b.streak - a.streak)[0];
      const cards = [
        hot && { label: 'HOT · LAST 5', name: hot.isPlayer ? state.seasonJourney.teamName : hot.name, value: `${hot.winsLast5}-W` },
        win && { label: 'WIN STREAK', name: win.isPlayer ? state.seasonJourney.teamName : win.name, value: `W${win.streak}` },
        loss && { label: 'COLD STREAK', name: loss.isPlayer ? state.seasonJourney.teamName : loss.name, value: `L${loss.streak}` }
      ].filter(Boolean);
      trends.innerHTML = cards.length ? cards.map(card => `<div class="sj-trend-card"><small>${card.label}</small><b>${safeText(card.name)}</b><strong>${card.value}</strong></div>`).join('') : '<p class="sj-empty-copy">完成比賽後產生球隊趨勢。</p>';
    }
  }

  function raceMarkup(players) {
    return (players || []).map(player => `<div class="sj-ranking-row ${player.isPlayer ? 'is-player' : ''}">
      <span class="sj-ranking-row__rank">${player.rank}</span><span class="sj-ranking-row__player"><b>${safeText(player.name)}${seasonMovementMarkup(player.movement)}</b><small>${player.isPlayer ? 'YOUR TEAM' : safeText(player.team)} · ${player.ppg.toFixed(1)} PPG</small></span><strong class="sj-ranking-row__value">${player.score.toFixed(1)}</strong>
    </div>`).join('') || '<p class="sj-empty-copy">完成比賽後開始更新獎項排名。</p>';
  }

  function renderAwardsPanel() {
    if (!window.SeasonLeague) return;
    const journey = state.seasonJourney;
    const view = window.SeasonLeague.view(journey);
    if (!view) return;
    const mvp = document.getElementById('sjMvpRace');
    const dpoy = document.getElementById('sjDpoyRace');
    if (mvp) mvp.innerHTML = raceMarkup(view.awardRaces.mvp);
    if (dpoy) dpoy.innerHTML = raceMarkup(view.awardRaces.dpoy);
    const monthHost = document.getElementById('sjMonthlyAwards');
    if (monthHost) {
      const groups = [...new Set(view.monthlyAwards.map(award => award.monthKey))].reverse();
      monthHost.innerHTML = groups.length ? groups.map(monthKey => {
        const awards = view.monthlyAwards.filter(award => award.monthKey === monthKey);
        const label = awards[0] ? `${awards[0].monthLabel} ${awards[0].year}` : monthKey;
        return `<div class="sj-month-group"><b>${label}</b><div class="sj-month-winners">${['west', 'east'].map(conference => {
          const award = awards.find(item => item.conference === conference);
          return award ? `<div class="sj-month-winner ${award.isPlayer ? 'is-player' : ''}"><small>${conference.toUpperCase()} PLAYER OF THE MONTH</small><strong>${safeText(award.player)}${award.isPlayer ? ' · YOU' : ''}</strong><span>${award.stats.ppg.toFixed(1)} PTS · ${award.stats.rpg.toFixed(1)} REB · ${award.stats.apg.toFixed(1)} AST</span></div>` : '';
        }).join('')}</div></div>`;
      }).join('') : '<p class="sj-empty-copy">跨入下一個月份後，East / West 月最佳球員會保存在這裡。</p>';
    }
    const honorsHost = document.getElementById('sjAwardsList');
    const historicalAwards = [...(journey.history || [])].reverse().find(entry => Array.isArray(entry.awards) && entry.awards.length)?.awards || [];
    const honors = (journey.awards || []).length ? journey.awards : (view.finalAwards.length ? view.finalAwards : historicalAwards);
    if (honorsHost) honorsHost.innerHTML = honors.length ? honors.map(award => `<div class="sj-honor-card"><span>${award.icon || '🏆'}</span><div><small>${safeText(award.label)}</small><b>${safeText(award.player)}</b><em>${safeText(award.stat || '')}</em></div></div>`).join('') : '<p class="sj-empty-copy">82 場結束後正式鎖定 Season Honors。</p>';
  }

  function renderSeasonCollections() {
    const journey = state.seasonJourney;
    const legacyList = document.getElementById('sjLegacyList');
    if (legacyList) {
      const seasons = [...journey.history].reverse().slice(0, 5);
      legacyList.innerHTML = seasons.length ? seasons.map(history => `<div class="sj-recent-row"><b>S${history.season}</b><span>${safeText(history.result || 'REGULAR SEASON')}</span><em>${safeText(history.record)}</em></div>`).join('') : '<p class="sj-empty-copy">完成第一個賽季後，球季歷史會永久留在這裡。</p>';
    }
    const allMoments = (state.inventory || []).flatMap(card => (card.badgeJourney?.moments || []).map((moment, momentIndex) => ({ card, player: card.name, moment, momentIndex })));
    const count = document.getElementById('sjMomentCount');
    if (count) count.textContent = `${allMoments.length} unlocked`;
    const momentList = document.getElementById('sjMomentList');
    if (momentList) momentList.innerHTML = allMoments.length ? allMoments.slice(-5).reverse().map(item => `<button type="button" class="sj-moment-replay" data-card-id="${safeText(item.card.cardId)}" data-moment-index="${item.momentIndex}" onclick="replayJourneyMoment(this.dataset.cardId, Number(this.dataset.momentIndex))"><span><b>${safeText(item.moment.split(':').pop())}</b><small>${safeText(item.player)}</small></span><em>▶ REPLAY</em></button>`).join('') : '<p class="sj-empty-copy">重要回合中觸發徽章，即可收藏 Badge Moment。</p>';
  }

  function maybeOpenMonthlyAwardModal() {
    const seasonTab = document.getElementById('tab-season');
    const modal = document.getElementById('sjMonthlyAwardModal');
    const league = state.seasonJourney?.leagueState;
    if (!modal || !league || seasonTab?.classList.contains('hidden') || !modal.classList.contains('hidden')) return;
    const monthKey = [...new Set((league.monthlyAwards || []).map(award => award.monthKey))]
      .find(key => !(league.monthlyAwardsSeen || []).includes(key));
    if (!monthKey) return;
    const awards = league.monthlyAwards.filter(award => award.monthKey === monthKey);
    if (!awards.length) return;
    const label = document.getElementById('sjMonthlyModalLabel');
    const winners = document.getElementById('sjMonthlyModalWinners');
    modal.dataset.monthKey = monthKey;
    if (label) label.textContent = `${awards[0].monthLabel} ${awards[0].year} AWARDS`;
    if (winners) winners.innerHTML = ['west', 'east'].map(conference => {
      const award = awards.find(item => item.conference === conference);
      return award ? `<div class="sj-month-modal__winner"><small>${conference.toUpperCase()}</small><strong>${safeText(award.player)}${award.isPlayer ? ' · YOU' : ''}</strong><span>${award.stats.ppg.toFixed(1)} PTS · ${award.stats.rpg.toFixed(1)} REB · ${award.stats.apg.toFixed(1)} AST</span></div>` : '';
    }).join('');
    modal.classList.remove('hidden');
  }

  function closeMonthlyAwardModal(openAwards = false) {
    const modal = document.getElementById('sjMonthlyAwardModal');
    const monthKey = modal?.dataset?.monthKey;
    if (monthKey) window.SeasonLeague?.markMonthSeen(state.seasonJourney, monthKey);
    modal?.classList.add('hidden');
    saveGame();
    if (openAwards) showSeasonView('awards');
  }

  function renderJourneyShell() {
    const host = document.getElementById('tab-season');
    if (!host) return;
    host.innerHTML = `
      <div class="sj-shell">
        <span id="seasonLimitTip" class="hidden">Season Journey Energy</span>
        <nav class="sj-view-tabs" role="tablist" aria-label="Season 分頁">
          <button type="button" data-sj-view="journey" onclick="showSeasonView('journey')" role="tab" aria-selected="true" class="is-active">JOURNEY<small>82 GAMES</small></button>
          <button type="button" data-sj-view="league" onclick="showSeasonView('league')" role="tab" aria-selected="false">LEAGUE<small>NBA</small></button>
          <button type="button" data-sj-view="awards" onclick="showSeasonView('awards')" role="tab" aria-selected="false">AWARDS<small>RACES</small></button>
        </nav>

        <main data-sj-view-panel="journey" class="sj-view-panel sj-journey-layout" role="tabpanel">
          <header class="sj-compact-header">
            <div class="sj-compact-header__identity"><div id="sjSeasonLabel" class="sj-compact-header__eyebrow">SEASON 2026-27</div><h2 id="sjTeamName"></h2><div class="sj-compact-header__team"><span id="sjRecord">0-0</span><span>·</span><span id="sjRank">尚未排名</span><button type="button" onclick="editJourneyTeamName()" aria-label="修改球隊名稱">✎</button></div></div>
            <div class="sj-energy-compact"><span>🏀</span><div><b id="sjEnergyCount">15/15</b><small id="sjEnergyTimer"></small></div></div>
          </header>
          <section class="sj-progress-card">
            <div class="sj-progress-card__head"><span id="sjGameLabel">GAME 1 / 82</span><b id="sjProgressPercent">0%</b></div>
            <div class="sj-progress-meter"><i id="sjProgressFill"></i></div><div id="sjGameWindow" class="sj-game-window" aria-label="目前場次附近賽程"></div>
          </section>
          <section class="sj-next-game-card">
            <div class="sj-next-game-card__head"><b>NEXT GAME</b><span id="sjSpecialLabel"></span></div>
            <div class="sj-next-matchup"><div><strong id="sjHomeName"></strong><small id="sjHomeRecord"></small></div><i>VS</i><div><strong id="sjAwayName"></strong><small id="sjAwayRecord"></small></div></div>
            <div class="sj-next-meta"><span id="sjOpponentOvr"></span><span id="sjRecent"></span><span id="sjMatchup"></span></div>
            <button id="simSeasonBtn" onclick="start82GamesSimulation()" class="sj-play-button">PLAY GAME</button>
            <button id="playoffBtn" onclick="openJourneyPostseason()" class="sj-postseason-button hidden">進入 Playoffs</button>
            <details id="sjAutoControls" class="sj-auto-details"><summary>掛機模式 · <span id="sjAutoStatus">尚未啟動</span></summary><div class="sj-auto-details__controls"><input id="sjAutoCount" type="number" min="1" value="1" placeholder="自動比賽場數"><button id="sjAutoBtn" onclick="toggleJourneyAutoMode()">開始掛機</button></div></details>
          </section>
          <button id="sjLeaguePulse" type="button" data-target="league" onclick="openLeaguePulse(this)" class="sj-league-pulse"><div class="sj-league-pulse__head"><b>LEAGUE PULSE</b><span>VIEW LEAGUE ›</span></div><div id="sjLeaguePulseBody" class="sj-league-pulse__body"></div></button>
          <section class="sj-recent-card"><div class="sj-recent-card__head"><span>RECENT GAMES</span><span>LAST 3</span></div><div id="sjRecentList" class="sj-recent-list"></div></section>
        </main>

        <main data-sj-view-panel="league" class="sj-view-panel hidden" role="tabpanel">
          <section class="sj-standings" aria-labelledby="sjStandingsTitle"><div class="sj-standings-heading"><div><h3 id="sjStandingsTitle">Conference Standings</h3><p id="sjStandingsProgress"></p></div><button id="sjStandingsExpand" type="button" onclick="toggleJourneyStandingsExpansion()" class="sj-section-action">查看完整排名</button></div><div class="sj-standings-tabs" role="tablist" aria-label="選擇分區"><button type="button" role="tab" data-sj-conference-tab="west" onclick="selectJourneyConference('west')" aria-controls="sjStandingsWest" aria-selected="true">西區</button><button type="button" role="tab" data-sj-conference-tab="east" onclick="selectJourneyConference('east')" aria-controls="sjStandingsEast" aria-selected="false">東區</button></div><div class="sj-standings-grid"><section id="sjStandingsWest" class="sj-standings-conference" data-active="true"><h4>WEST · 西區 <small>前 8 名優先</small></h4><table aria-label="西區排名"><thead><tr><th>#</th><th>球隊</th><th>勝</th><th>敗</th><th>勝率</th><th>勝差</th></tr></thead><tbody id="sjStandingsWestRows"></tbody></table></section><section id="sjStandingsEast" class="sj-standings-conference" data-active="false"><h4>EAST · 東區 <small>前 8 名優先</small></h4><table aria-label="東區排名"><thead><tr><th>#</th><th>球隊</th><th>勝</th><th>敗</th><th>勝率</th><th>勝差</th></tr></thead><tbody id="sjStandingsEastRows"></tbody></table></section></div><p class="sj-standings-note">每場結束後同步更新；你的球隊會以金色外框標示。</p></section>
          <section class="sj-section-card"><div class="sj-section-heading"><div><h3>League Leaders</h3><p>整個聯盟 Top 5；玩家球員使用實際 Journey 數據。</p></div><span>TOP 5</span></div><div class="sj-leader-tabs">${['PTS','REB','AST','STL','BLK'].map(category => `<button type="button" data-sj-leader="${category}" onclick="selectLeagueLeaderCategory('${category}')">${category}</button>`).join('')}</div><div id="sjLeagueLeaders" class="sj-ranking-list"></div></section>
          <section class="sj-section-card"><div class="sj-section-heading"><div><h3>Team Trends</h3><p>最近 5 場熱度與連勝／連敗。</p></div><span>FORM</span></div><div id="sjTeamTrends" class="sj-trend-grid"></div></section>
        </main>

        <main data-sj-view-panel="awards" class="sj-view-panel hidden" role="tabpanel">
          <div class="sj-award-races"><section class="sj-section-card"><div class="sj-section-heading"><div><h3>MVP Race</h3><p>個人表現 70% · 戰績 20% · 月份狀態 10%</p></div><span>TOP 5</span></div><div id="sjMvpRace" class="sj-ranking-list" style="margin-top:12px"></div></section><section class="sj-section-card"><div class="sj-section-heading"><div><h3>DPOY Race</h3><p>抄截、阻攻、籃板與團隊防守。</p></div><span>TOP 5</span></div><div id="sjDpoyRace" class="sj-ranking-list" style="margin-top:12px"></div></section></div>
          <section class="sj-section-card"><div class="sj-section-heading"><div><h3>Monthly Awards</h3><p>East / West Player of the Month</p></div><span>POTM</span></div><div id="sjMonthlyAwards" class="sj-month-groups"></div></section>
          <section id="sjAwardsSection" class="sj-section-card"><div class="sj-section-heading"><div><h3>Season Honors</h3><p>82 場結束後正式鎖定，不影響 Playoffs / FMVP。</p></div><span>FINAL</span></div><div id="sjAwardsList" class="sj-honors-grid"></div></section>
          <div class="sj-awards-grid"><section class="sj-section-card"><div class="sj-section-heading"><div><h3>Franchise Legacy</h3><p>永久球季紀錄</p></div><span>HISTORY</span></div><div id="sjLegacyList" class="sj-recent-list"></div></section><section class="sj-section-card"><div class="sj-section-heading"><div><h3>Moment Collection</h3><p>比賽中解鎖的 Badge Moment</p></div><span id="sjMomentCount"></span></div><div id="sjMomentList" style="display:grid;gap:6px;margin-top:10px"></div></section></div>
          <section id="sjAdminPanel" class="sj-section-card hidden"><div class="sj-section-heading"><div><h3>Administrator Simulator</h3><p>僅供測試 Season 流程</p></div><span>🏀 ∞</span></div><div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-4"><div class="grid grid-cols-[1fr_auto] gap-1.5"><input id="sjAdminTarget" type="number" min="1" max="82" value="82" class="min-w-0 bg-slate-950 border border-indigo-700/50 rounded-xl px-3 text-xs text-white"><button onclick="adminSimulateToInput()" class="bg-indigo-600 text-white font-black px-3 rounded-xl text-xs">執行</button></div><button onclick="adminSimulateFullSeason()" class="bg-slate-900 border border-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-xs">完成例行賽</button><button onclick="adminSimulatePlayoffs()" class="bg-amber-500 text-slate-950 font-black py-2.5 rounded-xl text-xs">一鍵奪冠</button><button onclick="openAdminBackPreview()" class="bg-fuchsia-700 text-white font-black py-2.5 rounded-xl text-xs">預覽卡背</button></div></section>
        </main>
      </div>
      <div id="sjMonthlyAwardModal" class="sj-month-modal hidden" role="dialog" aria-modal="true" aria-labelledby="sjMonthlyModalLabel"><section class="sj-month-modal__card"><div class="sj-month-modal__eyebrow">MONTH COMPLETE</div><h3 id="sjMonthlyModalLabel">MONTHLY AWARDS</h3><div id="sjMonthlyModalWinners" class="sj-month-modal__winners"></div><div class="sj-month-modal__actions"><button type="button" onclick="closeMonthlyAwardModal(true)">VIEW AWARDS</button><button type="button" onclick="closeMonthlyAwardModal(false)">CONTINUE SEASON</button></div></section></div>`;
  }

  function renderJourneySeasonTab() {
    ensureJourneyState();
    if (!document.querySelector('.sj-view-tabs')) renderJourneyShell();
    const journey = state.seasonJourney;
    const game = currentGameInfo();
    const special = dynamicSpecial(game);
    const starters = LINEUP_POSITIONS.map(position => state.startingLineup[position]).filter(Boolean);
    const top = [...starters].sort((a, b) => Number(b.ovr || 0) - Number(a.ovr || 0));
    const standings = getJourneyStandings();
    const opponent = game ? standings?.byOpponent(game.opponent) : null;
    const season = window.SeasonLeague?.seasonYears(journey.seasonNo) || { label: `Season ${journey.seasonNo}` };
    const set = (id, value) => { const element = document.getElementById(id); if (element) element.textContent = value; };
    set('sjSeasonLabel', `SEASON ${season.label}`);
    set('sjTeamName', journey.teamName);
    set('sjRecord', `${journey.wins}W - ${journey.losses}L`);
    set('sjRank', rankLabel());
    set('sjGameLabel', journey.completed ? 'REGULAR SEASON COMPLETE' : `GAME ${journey.gameIndex + 1} / ${SEASON_LENGTH}`);
    set('sjProgressPercent', `${Math.round(journey.gameIndex / SEASON_LENGTH * 100)}%`);
    const progress = document.getElementById('sjProgressFill');
    if (progress) progress.style.width = `${journey.gameIndex / SEASON_LENGTH * 100}%`;
    set('sjHomeName', journey.teamName);
    set('sjHomeRecord', `${journey.wins}-${journey.losses}`);
    set('sjAwayName', game?.opponent || '—');
    set('sjAwayRecord', opponent ? `${opponent.wins}-${opponent.losses}` : '—');
    set('sjOpponentOvr', game ? `Opponent OVR ${game.opponentOvr}` : 'Season complete');
    set('sjRecent', journey.recent.length ? `Last 5 · ${journey.recent.slice(-5).map(item => item.win ? 'W' : 'L').join('')}` : 'No games yet');
    set('sjMatchup', top[0] && game ? `${top[0].name} leads` : 'Set lineup');
    set('sjSpecialLabel', special ? `${special.icon} ${special.label}` : 'REGULAR SEASON');
    renderJourneyGameWindow();
    renderJourneyRecent();
    const button = document.getElementById('simSeasonBtn');
    if (button) {
      const mayStartNext = journey.completed && (journey.wins < 36 || !!state.season.hasPlayedPlayoffs);
      button.disabled = journey.completed && !mayStartNext;
      button.textContent = mayStartNext ? 'START NEXT SEASON' : (journey.completed ? 'COMPLETE POSTSEASON FIRST' : 'PLAY GAME');
    }
    const playoff = document.getElementById('playoffBtn');
    if (playoff) {
      const eliminatedInPlayIn = journey.wins < 42 && journey.playInResolved && !journey.playInWon;
      playoff.classList.toggle('hidden', !journey.completed || journey.wins < 36 || eliminatedInPlayIn);
      playoff.textContent = journey.wins >= 42 || journey.playInWon ? '🏆 ENTER PLAYOFFS' : '⚠️ PLAY-IN GAME';
    }
    const autoStatus = document.getElementById('sjAutoStatus');
    const autoButton = document.getElementById('sjAutoBtn');
    if (autoStatus) autoStatus.textContent = autoMode.running ? `剩餘 ${autoMode.remaining} 場` : '尚未啟動';
    if (autoButton) autoButton.textContent = autoMode.running ? '停止掛機' : '開始掛機';
    const admin = document.getElementById('sjAdminPanel');
    if (admin) admin.classList.toggle('hidden', !state.isAdmin);
    renderLeaguePulse();
    renderLeaguePanel();
    renderAwardsPanel();
    renderSeasonCollections();
    renderEnergy();
    showSeasonView(currentSeasonView);
    window.requestAnimationFrame?.(maybeOpenMonthlyAwardModal);
  }

  function injectGameModal() {
    if (document.getElementById('sjGameModal')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div id="sjGameModal" class="fixed inset-0 z-[130] hidden bg-slate-950/95 backdrop-blur-md p-2 sm:p-5 overflow-y-auto ios-safe-modal">
        <div class="max-w-3xl mx-auto min-h-full flex items-center justify-center">
          <div class="w-full bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
            <header class="px-4 py-3 border-b border-slate-800 flex justify-between items-center">
              <div><span id="sjModalGame" class="text-[10px] text-amber-400 font-black sj-kicker"></span><h3 id="sjModalTeams" class="text-sm sm:text-base font-black text-white"></h3></div>
              <div class="flex items-center gap-1"><button id="sjMusicToggle" onclick="toggleJourneyArenaMusic()" class="text-slate-300 hover:text-white bg-slate-800 border border-slate-700 w-8 h-8 rounded-lg" title="切換比賽背景音樂">♫</button><button id="sjModalAutoStop" onclick="stopJourneyAutoMode('已停止掛機，這場可改為手動操作')" class="hidden text-[10px] text-rose-300 bg-rose-950/60 border border-rose-700/50 px-2.5 py-1.5 rounded-lg">停止掛機</button><button onclick="closeJourneyGame()" class="text-slate-400 hover:text-white p-2">✕</button></div>
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
                <div class="sj-momentum-labels"><span>MY TEAM</span><b id="sjGameFlowLabel">GAME FLOW</b><span>OPPONENT</span></div>
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
              <section id="sjDefenseChallenge" class="sj-defense-challenge hidden mt-4" aria-live="polite"></section>
              <section id="sjOffenseChallenge" class="sj-offense-challenge hidden mt-4" aria-live="polite"></section>
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
      <div id="sjComicModal" class="fixed inset-0 z-[150] hidden p-3 sm:p-6 ios-safe-modal">
        <div class="max-w-2xl mx-auto h-full flex items-center justify-center">
          <div class="sj-comic-shell">
            <div id="sjComicPanel" class="sj-comic-panel"></div>
            <button id="sjComicNext" onclick="nextComicPage()" class="sj-comic-next">下一幕</button>
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
      const defenseRating = matchupDefenseRating(mine, opponent);
      return `<div class="sj-matchup-row">
        <div><span>${position}</span><b>${safeText(mine?.name || '—')}</b><em>DEF ${defenseRating}</em></div>
        <strong>VS</strong>
        <div class="is-opponent"><span>${opponent.position}</span><b>${safeText(opponent.name)}</b><em>OVR ${opponent.ovr}</em></div>
      </div>`;
    }).join('');
    const assignments = opponentRoster.map((opponent, index) => `
      <label><span>${safeText(opponent.name)}</span><select onchange="updateJourneyMatchup(${index}, this.value)">
        ${activeGame.starters.map((card, starterIndex) => `<option value="${starterIndex}" ${Number(activeGame.matchups[index]) === starterIndex ? 'selected' : ''}>${LINEUP_POSITIONS[starterIndex]} · ${safeText(card.name)} · DEF ${matchupDefenseRating(card, opponent)}</option>`).join('')}
      </select></label>`).join('');
    panel.innerHTML = `
      <div class="sj-matchup-head"><div><span>OPPONENT SCOUTING</span><h3>${safeText(state.seasonJourney.teamName)} <i>VS</i> ${safeText(activeGame.scheduleGame.opponent)}</h3></div><div><small>TEAM OVR</small><b>${Math.round(activeGame.teamOvr)} — ${activeGame.scheduleGame.opponentOvr}</b></div></div>
      <div class="sj-matchup-rosters">${rows}</div>
      <div class="sj-scout-grid">
        <div><b>對手優勢</b>${scout.strengths.map(item => `<p>${item.icon} ${safeText(item.key)} <strong>${item.value}</strong></p>`).join('')}</div>
        <div><b>可能弱點</b>${scout.weaknesses.map(item => `<p>• ${safeText(item.key)} <strong>${item.value}</strong></p>`).join('')}</div>
      </div>
      <div class="sj-defensive-matchups"><div><b>DEFENSIVE MATCHUP</b><span>一對一對位；改選時會自動交換防守任務</span></div><div class="sj-matchup-selects">${assignments}</div></div>
      <button type="button" onclick="confirmJourneyMatchup()" class="sj-confirm-matchup">確認對位並設定戰術</button>`;
  }

  function updateJourneyMatchup(opponentIndex, starterIndex) {
    if (!activeGame || activeGame.matchupConfirmed) return;
    const targetIndex = clamp(Number(opponentIndex) || 0, 0, 4);
    const nextDefender = clamp(Number(starterIndex) || 0, 0, 4);
    const previousDefender = Number(activeGame.matchups[targetIndex]);
    const occupiedIndex = activeGame.matchups.findIndex((assigned, index) => index !== targetIndex && Number(assigned) === nextDefender);
    activeGame.matchups[targetIndex] = nextDefender;
    if (occupiedIndex >= 0) activeGame.matchups[occupiedIndex] = previousDefender;
    renderMatchupPanel();
  }

  function confirmJourneyMatchup() {
    if (!activeGame || activeGame.matchupConfirmed) return;
    const uniqueAssignments = new Set(activeGame.matchups.map(Number));
    if (uniqueAssignments.size !== activeGame.opponentRoster.length) {
      if (typeof showToast === 'function') showToast('每名先發只能主防一名對手，請重新設定對位。', 'warning');
      return;
    }
    const matchupResults = activeGame.opponentRoster.map((opponent, index) => {
      const starterIndex = Number(activeGame.matchups[index]) || 0;
      const defender = activeGame.starters[starterIndex];
      const defense = matchupDefenseRating(defender, opponent);
      const edge = defense - Number(opponent.ovr || 0);
      return {
        opponent: opponent.name, defender: defender.name, opponentPosition: opponent.position,
        defense, opponentOvr: opponent.ovr, edge,
        suppression: clamp(Math.round(edge / 6), -2, 4)
      };
    });
    activeGame.matchupResults = matchupResults;
    activeGame.matchupBonus = clamp(Math.round(matchupResults.reduce((sum, result) => sum + result.suppression, 0) / Math.max(1, matchupResults.length)), -2, 4);
    activeGame.matchupConfirmed = true;
    const bestMatchup = [...matchupResults].sort((a, b) => b.edge - a.edge)[0];
    activeGame.feed.push(`🧠 防守對位完成：${bestMatchup.defender} 主防效果最佳，本場每節壓制 ${activeGame.matchupBonus >= 0 ? activeGame.matchupBonus : 0} 分`);
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
    const gameScript = ensureGameScript(scheduleGame, teamOvr, starters);
    activeGame = {
      scheduleGame, starters, bench: (state.benchLineup || []).filter(Boolean), teamOvr,
      gameScript,
      quarter: 0, homeScore: 0, awayScore: 0, homeQuarters: [], awayQuarters: [],
      feed: [], moments: [], pendingMoments: [], finalized: false, boxScore: null,
      pregameStrategy: 'balanced', secondHalfStrategy: null, awaitingHalftime: false, halftimeReport: null,
      opponentRoster, scouting: scoutOpponent(scheduleGame), matchups: [0, 1, 2, 3, 4], matchupResults: [], matchupBonus: 0, matchupConfirmed: false,
      manualShots: {}, manualShotCount: 0, defenseDecisions: {}, offenseDecisions: {},
      manualScoreAdjustments: {}, interactiveEventCount: 0, interactionPlan: buildInteractionPlan(), clutchDecision: null, awaitingClutch: false,
      featuredStar: starters.find(card => card.name === gameScript?.featuredPlayerName)
        || [...starters].sort((a, b) => (Number(b.ovr || b.baseOvr || 0) + moraleValue(b)) - (Number(a.ovr || a.baseOvr || 0) + moraleValue(a)))[0] || null,
      visual: null
    };
    if (autoMode.running) confirmJourneyMatchup();
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
    playJourneySound('whistle');
    scheduleJourneyArenaBeat();
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

  function shouldOpenClutchChallenge(q, allowClutch) {
    return allowClutch && q === 4 && !autoMode.running && !activeGame.clutchDecision
      && Math.abs(activeGame.homeScore - activeGame.awayScore) <= 3 && canOpenInteractiveEvent();
  }

  function openClutchStrategyChallenge() {
    const panel = document.getElementById('sjShootingChallenge');
    if (!panel || !activeGame) return;
    activeGame.awaitingClutch = true;
    activeGame.interactiveEventCount += 1;
    panel.classList.remove('hidden');
    panel.innerHTML = `
      <div class="sj-shot-head"><div><span>FINAL POSSESSION · CLOSE GAME</span><b>選擇最後一擊戰術</b></div><strong>進球勝利 · 失手落敗</strong></div>
      <div class="sj-clutch-strategies">
        <button type="button" onclick="selectJourneyClutchStrategy('iso')"><b>🐍 ISO STAR</b><span>讓王牌單打完成最後一擊</span></button>
        <button type="button" onclick="selectJourneyClutchStrategy('pnr')"><b>🧠 PICK & ROLL</b><span>由最佳組織者發動擋拆</span></button>
        <button type="button" onclick="selectJourneyClutchStrategy('post')"><b>💪 POST UP</b><span>交給最強內線低位進攻</span></button>
        <button type="button" onclick="selectJourneyClutchStrategy('corner')"><b>🎯 CORNER 3</b><span>為最佳射手製造底角空檔</span></button>
      </div>`;
    document.getElementById('sjGameActions')?.classList.add('hidden');
    activeGame.feed.push('⏱️ 比分進入最後一擊：選擇戰術，命中即勝利。');
    renderActiveGame();
  }

  function selectJourneyClutchStrategy(strategy) {
    if (!activeGame?.awaitingClutch || shootingChallenge) return;
    const starters = activeGame.starters.filter(Boolean);
    const byOvr = list => [...list].sort((a, b) => playerOvr(b) - playerOvr(a))[0];
    const labels = { iso: 'ISO STAR', pnr: 'PICK & ROLL', post: 'POST UP', corner: 'CORNER 3' };
    let shooter = activeGame.featuredStar || byOvr(starters);
    if (strategy === 'corner') shooter = [...starters].sort((a, b) => shootingRating(b) - shootingRating(a))[0] || shooter;
    else if (strategy === 'post') shooter = byOvr(starters.filter(card => normalizePositions(card).some(pos => ['PF', 'C'].includes(pos)))) || shooter;
    else if (strategy === 'pnr') shooter = [...starters].sort((a, b) => (statNumber(b, 'AST') * 7 + playerOvr(b)) - (statNumber(a, 'AST') * 7 + playerOvr(a)))[0] || shooter;
    activeGame.clutchStrategy = strategy;
    openShootingChallenge(4, { clutch: true, shooter, strategy, strategyLabel: labels[strategy] || 'CLUTCH SHOT' });
  }

  function finishQuarterPresentation(q, allowClutch = true) {
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
    if (shouldOpenClutchChallenge(q, allowClutch)) {
      openClutchStrategyChallenge();
      return;
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
    if (['THREE_POINT_MADE', 'AND_ONE', 'FAST_BREAK_SCORE', 'CLUTCH_SCORE'].includes(event.type)) {
      playJourneySound(event.team === 'user' ? 'coin' : 'click');
    }
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
    const script = activeGame?.gameScript;
    if (strategyId === 'feature-star') {
      adjustedHome += scriptRandomInt(script, `${q}|feature-star|boost`, 0, 2);
      if (q >= 4 && scriptRoll(script, `${q}|feature-star|fatigue`) < .28) adjustedHome -= 2;
    } else if (strategyId === 'shoot-threes') {
      adjustedHome += scriptRandomInt(script, `${q}|shoot-threes`, -3, 4);
    } else if (strategyId === 'defense' || strategyId === 'lock-down') {
      adjustedHome -= 1;
      adjustedAway -= strategyId === 'lock-down'
        ? scriptRandomInt(script, `${q}|lock-down`, 1, 3)
        : scriptRandomInt(script, `${q}|defense`, 1, 2);
    } else if (strategyId === 'attack-paint') {
      adjustedHome += scriptRandomInt(script, `${q}|attack-paint`, 1, 3);
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
    const pct = typeof getShooter3PtPercent === 'function' ? getShooter3PtPercent(card) : parseFloat(card?.basic?.['3P%']);
    return Number.isFinite(pct) ? pct : 0;
  }

  function syncVisualScoreFromGame() {
    if (!activeGame?.visual) return;
    activeGame.visual.displayHomeScore = activeGame.homeScore;
    activeGame.visual.displayAwayScore = activeGame.awayScore;
    activeGame.visual.momentum = clamp(((activeGame.awayScore - activeGame.homeScore) / 30) * 100, -100, 100);
  }

  function applyImmediateScore(q, homeDelta = 0, awayDelta = 0) {
    if (!activeGame) return;
    const homePoints = Math.max(0, Number(homeDelta) || 0);
    const awayPoints = Math.max(0, Number(awayDelta) || 0);
    activeGame.homeScore += homePoints;
    activeGame.awayScore += awayPoints;
    const current = activeGame.manualScoreAdjustments[q] || { home: 0, away: 0 };
    current.home += homePoints;
    current.away += awayPoints;
    activeGame.manualScoreAdjustments[q] = current;
    syncVisualScoreFromGame();
    renderActiveGame();
    if (homePoints) pulseVisualScore('user', homePoints);
    if (awayPoints) pulseVisualScore('opponent', awayPoints);
  }

  function canOpenInteractiveEvent() {
    return activeGame && Number(activeGame.interactiveEventCount || 0) < MAX_INTERACTIVE_EVENTS;
  }

  function shouldOpenShootingChallenge(q) {
    return activeGame && activeGame.matchupConfirmed && !autoMode.running && activeGame.interactionPlan?.[q] === 'shoot'
      && !activeGame.manualShots[q] && !shootingChallenge && canOpenInteractiveEvent();
  }

  function openShootingChallenge(q, options = {}) {
    const panel = document.getElementById('sjShootingChallenge');
    if (!panel || !activeGame) return;
    const shooters = [...activeGame.starters].sort((a, b) => shootingRating(b) - shootingRating(a));
    const shooter = options.shooter || shooters[(activeGame.manualShotCount || 0) % Math.min(3, shooters.length)];
    const threePct = shootingRating(shooter);
    const greenWidth = Math.max(3.5, Math.min(15, (threePct - 24) * .58));
    const yellowSpread = Math.max(3.5, Math.min(10, (threePct - 25) * .35));
    const greenCenter = 88;
    const greenStart = greenCenter - greenWidth / 2;
    const greenEnd = greenCenter + greenWidth / 2;
    const yellowStart = Math.max(0, greenStart - yellowSpread);
    const yellowEnd = Math.min(100, greenEnd + yellowSpread);
    shootingChallenge = {
      q, shooter, threePct, greenStart, greenEnd, yellowStart, yellowEnd, clutch: !!options.clutch, strategy: options.strategy || null,
      yellowHitRate: Math.max(.18, Math.min(.66, (threePct - 20) / 36)),
      meterSpeed: Math.max(1.8, 3.8 - (threePct / 20)), meterProgress: 0, meterDirection: 1, animFrameId: null
    };
    panel.classList.remove('hidden');
    panel.innerHTML = `
      <div class="sj-shot-head"><div><span>${options.clutch ? 'GAME WINNER · FINAL POSSESSION' : `KEY POSSESSION · ${quarterName(q)}`}</span><b>${safeText(shooter.name)} · ${options.clutch ? safeText(options.strategyLabel || 'CLUTCH SHOT') : 'OPEN THREE'}</b></div><strong>${options.clutch ? '進球勝利 · 失手落敗' : `互動 ${activeGame.interactiveEventCount + 1} / ${MAX_INTERACTIVE_EVENTS}`}</strong></div>
      <div class="sj-contest-meter-wrap">
        <div class="sj-contest-meter-label"><span>投籃時機 (Shot Timing)</span><strong>${threePct >= 40 ? '🔥 頂級射手' : threePct >= 35 ? '🎯 穩定射手' : '⚠️ 外線弱'} (${threePct.toFixed(1)}%)</strong></div>
        <div class="sj-contest-shot-meter"><div class="sj-meter-red"></div><div class="sj-meter-yellow" style="left:${yellowStart}%;width:${yellowEnd - yellowStart}%"></div><div class="sj-meter-green" style="left:${greenStart}%;width:${greenWidth}%"></div><i id="sjShotCursor"></i></div>
        <div class="sj-contest-meter-legend"><span>🔴 打鐵</span><span>🟡 ${Math.round(shootingChallenge.yellowHitRate * 100)}%</span><span>🟢 必進</span></div>
      </div>
      <button type="button" onclick="stopJourneyShot()">🟢 出手 (SHOOT)!</button>`;
    const actions = document.getElementById('sjGameActions');
    if (actions) actions.classList.add('hidden');
    if (!options.clutch) activeGame.interactiveEventCount += 1;
    startJourneyShotMeterLoop();
  }

  function startJourneyShotMeterLoop() {
    if (!shootingChallenge) return;
    const update = () => {
      if (!shootingChallenge) return;
      shootingChallenge.meterProgress += shootingChallenge.meterDirection * shootingChallenge.meterSpeed;
      if (shootingChallenge.meterProgress >= 100) {
        shootingChallenge.meterProgress = 100;
        shootingChallenge.meterDirection = -1;
      } else if (shootingChallenge.meterProgress <= 0) {
        shootingChallenge.meterProgress = 0;
        shootingChallenge.meterDirection = 1;
      }
      const cursor = document.getElementById('sjShotCursor');
      if (cursor) cursor.style.left = `${shootingChallenge.meterProgress}%`;
      shootingChallenge.animFrameId = requestAnimationFrame(update);
    };
    shootingChallenge.animFrameId = requestAnimationFrame(update);
  }

  function stopJourneyShot() {
    if (!shootingChallenge || !activeGame) return;
    const shot = shootingChallenge;
    cancelAnimationFrame(shot.animFrameId);
    const position = shot.meterProgress;
    let zone = 'RED';
    if (position >= shot.greenStart && position <= shot.greenEnd) zone = 'GREEN';
    else if (position >= shot.yellowStart && position <= shot.yellowEnd) zone = 'YELLOW';
    const made = zone === 'GREEN' || (zone === 'YELLOW' && Math.random() < shot.yellowHitRate);
    const points = made ? 3 : 0;
    playJourneySound(made ? (shot.clutch ? 'ur_ssr' : 'correct') : 'buzz');
    if (shot.clutch) {
      const tiedScore = Math.max(activeGame.homeScore, activeGame.awayScore);
      const oldHome = activeGame.homeScore;
      const oldAway = activeGame.awayScore;
      activeGame.homeScore = tiedScore + (made ? 3 : 0);
      activeGame.awayScore = tiedScore + (made ? 0 : 2);
      const quarterIndex = Math.max(0, activeGame.homeQuarters.length - 1);
      activeGame.homeQuarters[quarterIndex] = Number(activeGame.homeQuarters[quarterIndex] || 0) + activeGame.homeScore - oldHome;
      activeGame.awayQuarters[quarterIndex] = Number(activeGame.awayQuarters[quarterIndex] || 0) + activeGame.awayScore - oldAway;
      activeGame.clutchDecision = { player: shot.shooter.name, strategy: shot.strategy, zone, made, points, position: Math.round(position) };
      activeGame.awaitingClutch = false;
      activeGame.feed.push(`${made ? '🏆' : '💔'} GAME WINNER：${shot.shooter.name} ${made ? '命中，直接贏下比賽！' : '失手，比賽告負。'}`);
      syncVisualScoreFromGame();
      const panel = document.getElementById('sjShootingChallenge');
      if (panel) panel.innerHTML = `<div class="sj-shot-result ${made ? 'is-made' : 'is-missed'}"><strong>${zone}</strong><b>${made ? 'GAME WINNER!' : 'MISSED · LOSS'}</b><span>${safeText(shot.shooter.name)} ${made ? '完成致勝一擊' : '未能命中最後一球'}</span></div>`;
      shootingChallenge = null;
      renderActiveGame();
      setTimeout(() => {
        document.getElementById('sjShootingChallenge')?.classList.add('hidden');
        finishJourneyGame();
      }, 850);
      return;
    }
    activeGame.manualShots[shot.q] = { player: shot.shooter.name, threePct: shot.threePct, zone, made, points, position: Math.round(position) };
    activeGame.manualShotCount += 1;
    activeGame.feed.push(`${made ? '🎯' : '❌'} 關鍵投籃：${shot.shooter.name} ${zone} ${made ? '三分命中' : '偏出'}`);
    if (made) applyImmediateScore(shot.q, 3, 0);
    const panel = document.getElementById('sjShootingChallenge');
    if (panel) {
      panel.innerHTML = `<div class="sj-shot-result ${made ? 'is-made' : 'is-missed'}"><strong>${zone}</strong><b>${made ? 'SWISH! +3' : 'MISSED'}</b><span>${made ? '記分板已立即加上 3 分' : '本次進攻沒有得分'}</span></div>`;
    }
    shootingChallenge = null;
    setTimeout(() => {
      document.getElementById('sjShootingChallenge')?.classList.add('hidden');
      document.getElementById('sjGameActions')?.classList.remove('hidden');
      simulateOneQuarter(false);
    }, 650);
  }

  function shouldOpenDefenseChallenge(q) {
    return activeGame && activeGame.matchupConfirmed && !autoMode.running && activeGame.interactionPlan?.[q] === 'defense'
      && !activeGame.defenseDecisions[q] && !defenseChallenge && canOpenInteractiveEvent();
  }

  function openDefenseChallenge(q) {
    const panel = document.getElementById('sjDefenseChallenge');
    if (!panel || !activeGame) return;
    const targets = [...activeGame.opponentRoster].sort((a, b) => Number(b.ovr || 0) - Number(a.ovr || 0));
    const target = targets[0] || activeGame.opponentRoster[0];
    const matchup = activeGame.matchupResults.find(result => result.opponent === target.name) || activeGame.matchupResults[0];
    const defender = activeGame.starters.find(card => card.name === matchup?.defender) || activeGame.starters[0];
    const threePct = Number.parseFloat(target?.basic?.['3P%']) || 0;
    let scenario;
    if ((target.position === 'C' || threePct < 32) && Math.random() < .5) {
      scenario = { key: 'non-shooter', title: `${target.name} 在弧頂持球`, detail: '他的外線威脅有限，但正在等待隊友空切。', correct: 'sag' };
    } else if (Number(target.ovr || 0) >= 90 && Math.random() < .55) {
      scenario = { key: 'star-iso', title: `${target.name} 拉開單打`, detail: '對方王牌已進入進攻節奏，弱側射手正在埋伏。', correct: 'double' };
    } else {
      scenario = { key: 'drive', title: `${target.name} 加速突破`, detail: '第一步已經啟動，你必須立刻決定防守站位。', correct: 'contain' };
    }
    defenseChallenge = { q, target, defender, matchup, scenario };
    const profile = defensiveProfile(defender);
    panel.classList.remove('hidden');
    panel.innerHTML = `
      <div class="sj-defense-head"><div><span>DEFENSIVE READ · ${quarterName(q)}</span><b>${safeText(scenario.title)}</b><p>${safeText(scenario.detail)}</p></div><div><small>ON BALL DEFENDER</small><strong>${safeText(defender.name)}</strong><em>外防 ${profile.perimeter} · 內防 ${profile.interior}</em></div></div>
      <div class="sj-defense-options">
        <button type="button" onclick="resolveJourneyDefense('contain')"><b>🛡️ 守切入</b><span>收住第一步，優先保護禁區</span></button>
        <button type="button" onclick="resolveJourneyDefense('sag')"><b>↩️ 放投</b><span>退一步防突破，考驗對手投射</span></button>
        <button type="button" onclick="resolveJourneyDefense('double')"><b>⚡ 包夾</b><span>逼迫王牌出球，但可能漏掉空檔</span></button>
      </div>`;
    activeGame.interactiveEventCount += 1;
    document.getElementById('sjGameActions')?.classList.add('hidden');
  }

  function resolveJourneyDefense(choice) {
    if (!defenseChallenge || !activeGame) return;
    const challenge = defenseChallenge;
    const rating = matchupDefenseRating(challenge.defender, challenge.target);
    const readCorrect = choice === challenge.scenario.correct;
    const successChance = readCorrect
      ? clamp(.62 + (rating - 75) * .009, .48, .94)
      : clamp(.10 + (rating - 75) * .006, .08, .34);
    const success = Math.random() < successChance;
    let outcome;
    if (readCorrect && success) outcome = { homeDelta: 2, awayDelta: 0, turnover: true, label: 'PERFECT READ', detail: `${challenge.defender.name} 判斷正確並製造失誤，直接形成反擊！` };
    else if (readCorrect) outcome = { homeDelta: 0, awayDelta: 2, turnover: false, label: 'GOOD CONTEST', detail: '站位正確，但對手仍用高難度出手得到兩分。' };
    else if (success) outcome = { homeDelta: 0, awayDelta: 0, turnover: false, label: 'RECOVERED', detail: `${challenge.defender.name} 靠防守能力補回失位，沒有付出代價。` };
    else outcome = { homeDelta: 0, awayDelta: 3, turnover: false, label: 'DEFENSE BROKEN', detail: choice === 'double' ? '包夾被看穿，對手傳到底角命中三分。' : choice === 'sag' ? '退得太深，對手直接拔起命中。' : '過度收縮禁區，弱側空切完成得分。' };
    activeGame.defenseDecisions[challenge.q] = {
      defender: challenge.defender.name, opponent: challenge.target.name, scenario: challenge.scenario.key,
      choice, correct: readCorrect, success, rating, ...outcome
    };
    activeGame.feed.push(`${success ? '🛡️' : '⚠️'} 防守決策：${outcome.label} — ${outcome.detail}`);
    playJourneySound(success ? 'correct' : 'buzz');
    applyImmediateScore(challenge.q, outcome.homeDelta, outcome.awayDelta);
    const panel = document.getElementById('sjDefenseChallenge');
    if (panel) panel.innerHTML = `<div class="sj-defense-result ${success ? 'is-success' : 'is-failure'}"><strong>${outcome.label}</strong><b>${readCorrect ? '戰術判斷正確' : '戰術判斷錯誤'}</b><span>${safeText(outcome.detail)}</span><em>防守能力 ${rating} · 成功率 ${Math.round(successChance * 100)}%</em></div>`;
    defenseChallenge = null;
    setTimeout(() => {
      document.getElementById('sjDefenseChallenge')?.classList.add('hidden');
      document.getElementById('sjGameActions')?.classList.remove('hidden');
      simulateOneQuarter(false);
    }, 850);
  }

  function shouldOpenOffenseChallenge(q) {
    return activeGame && activeGame.matchupConfirmed && !autoMode.running && activeGame.interactionPlan?.[q] === 'offense'
      && !activeGame.offenseDecisions[q] && !offenseChallenge && canOpenInteractiveEvent();
  }

  function openOffenseChallenge(q) {
    const panel = document.getElementById('sjOffenseChallenge');
    if (!panel || !activeGame) return;
    const handlers = [...activeGame.starters].sort((a, b) => {
      const aVision = statNumber(a, 'AST') * 7 + playerOvr(a);
      const bVision = statNumber(b, 'AST') * 7 + playerOvr(b);
      return bVision - aVision;
    });
    const handler = handlers[0] || activeGame.featuredStar || activeGame.starters[0];
    const scenarios = [
      { key: 'drop', title: '對手中鋒退守禁區', detail: '掩護後持球者獲得中距離空間。', correct: 'pullup' },
      { key: 'switch', title: '對手直接換防', detail: '慢速長人被迫站到持球者面前。', correct: 'reject' },
      { key: 'help', title: '弱側提前協防 Roll Man', detail: '底角射手暫時處於無人看守。', correct: 'kickout' },
      { key: 'blitz', title: '兩人強勢夾擊持球者', detail: '短擋拆接應點在罰球線附近出現。', correct: 'roll' }
    ];
    const scenario = randomOf(scenarios);
    offenseChallenge = { q, handler, scenario };
    panel.classList.remove('hidden');
    panel.innerHTML = `
      <div class="sj-defense-head"><div><span>PICK & ROLL READ · ${quarterName(q)}</span><b>${safeText(scenario.title)}</b><p>${safeText(scenario.detail)}</p></div><div><small>BALL HANDLER</small><strong>${safeText(handler.name)}</strong><em>AST ${statNumber(handler, 'AST').toFixed(1)} · OVR ${playerOvr(handler)}</em></div></div>
      <div class="sj-defense-options sj-offense-options">
        <button type="button" data-offense-choice="pullup"><b>🎯 持球投</b><span>利用防守退縮直接出手</span></button>
        <button type="button" data-offense-choice="roll"><b>🛫 傳 Roll Man</b><span>把球送進順下路線</span></button>
        <button type="button" data-offense-choice="kickout"><b>↗️ Kick Out</b><span>找到弱側底角射手</span></button>
        <button type="button" data-offense-choice="reject"><b>⚡ Reject Screen</b><span>反向突破攻擊錯位</span></button>
      </div>`;
    panel.querySelectorAll('[data-offense-choice]').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        resolveJourneyOffense(button.dataset.offenseChoice);
      }, { once: true });
    });
    activeGame.interactiveEventCount += 1;
    document.getElementById('sjGameActions')?.classList.add('hidden');
  }

  function resolveJourneyOffense(choice) {
    if (!offenseChallenge || !activeGame) return;
    const challenge = offenseChallenge;
    const readCorrect = choice === challenge.scenario.correct;
    const vision = statNumber(challenge.handler, 'AST');
    const playmakingBadge = (typeof getPlayerBadges === 'function' ? getPlayerBadges(challenge.handler) : [])
      .some(badge => ['組織大師', '無私', '助人為樂'].includes(badge.name));
    const successChance = readCorrect
      ? clamp(.62 + vision * .025 + (playmakingBadge ? .1 : 0), .58, .95)
      : clamp(.16 + vision * .012 + (playmakingBadge ? .05 : 0), .12, .42);
    const success = Math.random() < successChance;
    const shotValue = ['pullup', 'kickout'].includes(choice) ? 3 : 2;
    let outcome;
    if (success) outcome = { homeDelta: shotValue, awayDelta: 0, label: readCorrect ? 'PERFECT READ' : 'TOUGH BUCKET', detail: readCorrect ? `閱讀防守成功，${challenge.handler.name} 創造 ${shotValue} 分。` : `判斷不是最佳解，但靠個人能力拿下 ${shotValue} 分。` };
    else if (readCorrect) outcome = { homeDelta: 0, awayDelta: 0, label: 'GOOD LOOK · MISSED', detail: '戰術選擇正確，但最後出手沒有命中。' };
    else outcome = { homeDelta: 0, awayDelta: 2, label: 'TURNOVER', detail: '傳球路線被預判，對手抄截後快攻得到兩分。' };
    activeGame.offenseDecisions[challenge.q] = { handler: challenge.handler.name, scenario: challenge.scenario.key, choice, correct: readCorrect, success, ...outcome };
    activeGame.feed.push(`${success ? '🧠' : '⚠️'} 擋拆判斷：${outcome.label} — ${outcome.detail}`);
    playJourneySound(success ? 'coin' : 'buzz');
    applyImmediateScore(challenge.q, outcome.homeDelta, outcome.awayDelta);
    const panel = document.getElementById('sjOffenseChallenge');
    if (panel) panel.innerHTML = `<div class="sj-defense-result ${success ? 'is-success' : 'is-failure'}"><strong>${outcome.label}</strong><b>${readCorrect ? '判斷正確' : '判斷失誤'}</b><span>${safeText(outcome.detail)}</span><em>成功率 ${Math.round(successChance * 100)}% · 比分已即時更新</em></div>`;
    offenseChallenge = null;
    setTimeout(() => {
      document.getElementById('sjOffenseChallenge')?.classList.add('hidden');
      document.getElementById('sjGameActions')?.classList.remove('hidden');
      simulateOneQuarter(false);
    }, 850);
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
    if (!activeGame || !activeGame.matchupConfirmed || activeGame.finalized || activeGame.awaitingHalftime || activeGame.awaitingClutch || activeGame.visual?.busy || activeGame.visual?.awaitingBadge || shootingChallenge || defenseChallenge || offenseChallenge) return;
    const q = activeGame.quarter + 1;
    const diff = activeGame.teamOvr - activeGame.scheduleGame.opponentOvr;
    const scriptedScore = seasonSimulation()?.quarterScore(activeGame.gameScript, {
      quarter: q,
      teamOvr: activeGame.teamOvr,
      opponentOvr: activeGame.scheduleGame.opponentOvr,
      homeScore: activeGame.homeScore,
      awayScore: activeGame.awayScore
    });
    let home = scriptedScore?.home ?? clamp(randomInt(20, 32) + Math.round(diff * .12), 15, 40);
    let away = scriptedScore?.away ?? clamp(randomInt(20, 32) - Math.round(diff * .08), 15, 40);
    if (!scriptedScore && q > 4) { home = randomInt(5, 13); away = randomInt(5, 13); }
    const adjusted = applyQuarterStrategy(activeStrategyForQuarter(q), q, home, away);
    home = adjusted.home;
    away = adjusted.away;
    const badgeImpact = badgeQuarterImpact(q);
    home = clamp(home + badgeImpact.home, q > 4 ? 5 : 15, q > 4 ? 18 : 45);
    away = clamp(away + badgeImpact.away - Number(activeGame.matchupBonus || 0), q > 4 ? 5 : 15, q > 4 ? 18 : 45);
    const manualScore = activeGame.manualScoreAdjustments[q] || { home: 0, away: 0 };
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
    activeGame.homeQuarters.push(home + manualScore.home); activeGame.awayQuarters.push(away + manualScore.away);
    if (q === 1) {
      activeGame.feed.push(`🎯 GAME PLAN：${GAME_STRATEGIES[activeGame.pregameStrategy].short}`);
      if (activeGame.gameScript) activeGame.feed.push(`🎬 GAME FLOW：${activeGame.gameScript.label} · ${activeGame.gameScript.labelZh}`);
    }
    if (q === 1 && (badgeImpact.home || badgeImpact.away)) activeGame.feed.push(`✨ 徽章陣容加成：進攻 +${badgeImpact.home}／防守 ${badgeImpact.away}`);
    activeGame.feed.push(`${quarterName(q)}：本節比分 ${home + manualScore.home}-${away + manualScore.away}`);
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
      finishQuarterPresentation(q, !silent);
      return;
    }
    startVisualQuarter(visualEvents, q, badgeVisualEvent, moment);
  }

  function advanceJourneyQuarter() {
    if (!activeGame || !activeGame.matchupConfirmed) return;
    const nextQuarter = activeGame.quarter + 1;
    if (shouldOpenDefenseChallenge(nextQuarter)) {
      openDefenseChallenge(nextQuarter);
      return;
    }
    if (shouldOpenOffenseChallenge(nextQuarter)) {
      openOffenseChallenge(nextQuarter);
      return;
    }
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
    set('sjGameFlowLabel', activeGame.gameScript ? activeGame.gameScript.label : 'GAME FLOW');
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

  function badgeCinemaTone(badgeName) {
    if (badgeName === '曼巴精神') return 'mamba';
    if (badgeName === '神射手') return 'shooting';
    if (['木桶伯', '禁區大鎖', '小偷', '外線大鎖'].includes(badgeName)) return 'defense';
    if (['組織大師', '無私', '助人為樂'].includes(badgeName)) return 'playmaking';
    if (badgeName === '總決賽MVP') return 'champion';
    return 'energy';
  }

  function buildBadgeCinemaSlides(moment) {
    const pages = Array.isArray(moment.pages) ? moment.pages.filter(Boolean) : [];
    return [
      { label: 'TRIGGER', headline: pages[0] || `${moment.player} 觸發徽章`, detail: pages[1] || '關鍵回合開始。' },
      { label: 'ACTION', headline: pages[2] || moment.title, detail: pages[3] || pages[1] || `${moment.player} 接管這個回合。` },
      { label: 'IMPACT', headline: moment.impact || 'IMPACT!', detail: `${moment.player} 完成 ${moment.title}。` }
    ];
  }

  function badgeArtworkCandidates(moment) {
    const card = moment.card || {};
    const nbaId = Number(card.nbaId || card.id || 0);
    const sources = [];
    if (nbaId === 977 || /Kobe Bryant/i.test(String(moment.player || card.name || ''))) {
      sources.push('./assets/cards/player-art/kobe-mamba-v1.png');
    }
    if (nbaId && typeof getPlayerImgUrl === 'function') sources.push(getPlayerImgUrl(nbaId));
    sources.push('./assets/players/featured-placeholder.svg');
    return [...new Set(sources.filter(Boolean))];
  }

  function loadBadgeArtworkSource(src) {
    return new Promise(resolve => {
      const image = new Image();
      let settled = false;
      const finish = result => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        image.onload = null;
        image.onerror = null;
        resolve(result);
      };
      const timeout = setTimeout(() => finish(''), 6000);
      image.onload = () => finish(image.naturalWidth > 0 ? src : '');
      image.onerror = () => finish('');
      image.src = src;
    });
  }

  async function preloadBadgeArtwork(moment) {
    const cacheKey = `${moment.card?.nbaId || moment.card?.id || moment.player || 'unknown'}`;
    if (badgeArtworkCache.has(cacheKey)) return badgeArtworkCache.get(cacheKey);
    for (const source of badgeArtworkCandidates(moment)) {
      const loaded = await loadBadgeArtworkSource(source);
      if (loaded) {
        badgeArtworkCache.set(cacheKey, loaded);
        return loaded;
      }
    }
    badgeArtworkCache.set(cacheKey, '');
    return '';
  }

  function badgeEffectCopy(moment) {
    const points = Math.max(2, Number(moment.points || 2));
    if (['木桶伯', '禁區大鎖', '小偷', '外線大鎖'].includes(moment.badge)) return `防守成功轉成反擊，本回合即時增加 ${points} 分。`;
    if (moment.badge === '神射手') return `外線徽章發威，本回合即時增加 ${points} 分。`;
    if (moment.badge === '曼巴精神') return `關鍵球接管比賽，本回合即時增加 ${points} 分。`;
    return `徽章效果生效，本回合即時增加 ${points} 分。`;
  }

  function renderComicPage() {
    if (!activeComic) return;
    const { moment, page, slides, imageSrc, imageStatus, replay } = activeComic;
    const slide = slides[page];
    const last = page === slides.length - 1;
    const tone = badgeCinemaTone(moment.badge);
    const progress = moment.card ? ensureBadgeProgress(moment.card, moment.badge) : { triggers: 0 };
    const tier = badgeTierForTriggers(progress.triggers);
    const progressPct = tier.next ? clamp(((progress.triggers - tier.min) / (tier.next - tier.min)) * 100, 0, 100) : 100;
    const points = Math.max(2, Number(moment.points || 2));
    const scoreBefore = Number(activeGame?.visual?.displayHomeScore);
    const scorePreview = !replay && Number.isFinite(scoreBefore) ? `${scoreBefore} → ${scoreBefore + points}` : `+${points} PTS`;
    const initials = String(moment.player || 'NBA').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
    const artClass = imageSrc ? '' : ' is-visible';
    const loadingClass = imageStatus === 'loading' ? ' is-loading' : '';
    const panel = document.getElementById('sjComicPanel');
    if (!panel) return;
    panel.innerHTML = `
      <article class="sj-badge-cinema sj-badge-cinema--${tone} sj-badge-cinema--act-${page + 1}">
        <header class="sj-badge-cinema__header">
          <div><span>${safeText(moment.icon || '🏅')}</span><p>BADGE MOMENT</p><b>${safeText(moment.badge)}</b></div>
          <div><strong>${safeText(tier.label)}級</strong><small>${page + 1} / ${slides.length}</small></div>
        </header>
        <div class="sj-badge-cinema__stage${loadingClass}">
          <div class="sj-badge-cinema__fallback${artClass}" aria-hidden="true"><span>${safeText(moment.icon || '🏅')}</span><b>${safeText(initials || 'NBA')}</b></div>
          ${imageSrc ? `<img class="sj-badge-cinema__player" src="${safeText(imageSrc)}" alt="${safeText(moment.player)}" onerror="handleJourneyBadgeArtError(this)">` : ''}
          <div class="sj-badge-cinema__light" aria-hidden="true"></div>
          <div class="sj-badge-cinema__copy">
            <span>${safeText(slide.label)}</span>
            <h3>${safeText(slide.headline)}</h3>
            <p>${safeText(slide.detail)}</p>
          </div>
          ${last ? `<div class="sj-badge-cinema__impact"><div><span>IMPACT</span><strong>${safeText(scorePreview)}</strong></div><p>${safeText(badgeEffectCopy(moment))}</p></div>` : ''}
        </div>
        <footer class="sj-badge-cinema__footer">
          <div><span>${safeText(moment.player)}</span><b>${safeText(moment.title)}</b></div>
          <div class="sj-badge-cinema__progress"><i><em style="width:${progressPct}%"></em></i><small>${tier.next ? `${progress.triggers} / ${tier.next} 次升級` : `${progress.triggers} 次 · 最高級`}</small></div>
        </footer>
      </article>`;
    const nextButton = document.getElementById('sjComicNext');
    if (nextButton) nextButton.textContent = last ? (replay ? '結束重播' : '套用效果並回到比賽') : '下一幕';
  }

  function openComic(moment, options = {}) {
    const token = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    activeComic = {
      moment,
      page: 0,
      slides: buildBadgeCinemaSlides(moment),
      imageSrc: '',
      imageStatus: 'loading',
      replay: !!options.replay,
      token
    };
    document.getElementById('sjComicModal')?.classList.remove('hidden');
    renderComicPage();
    preloadBadgeArtwork(moment).then(imageSrc => {
      if (!activeComic || activeComic.token !== token) return;
      activeComic.imageSrc = imageSrc;
      activeComic.imageStatus = imageSrc ? 'ready' : 'fallback';
      renderComicPage();
    });
  }

  function handleJourneyBadgeArtError(image) {
    image.style.display = 'none';
    image.parentElement?.querySelector('.sj-badge-cinema__fallback')?.classList.add('is-visible');
  }

  function replayJourneyMoment(cardId, momentIndex) {
    const card = (state.inventory || []).find(item => String(item.cardId) === String(cardId));
    const savedMoment = card?.badgeJourney?.moments?.[Number(momentIndex)];
    if (!card || !savedMoment) return;
    const separator = savedMoment.indexOf(':');
    const badgeName = separator >= 0 ? savedMoment.slice(0, separator) : '';
    const title = separator >= 0 ? savedMoment.slice(separator + 1) : savedMoment;
    const story = (BADGE_STORIES[badgeName] || []).find(item => item[0] === title) || (BADGE_STORIES[badgeName] || [])[0];
    if (!story) {
      if (typeof showToast === 'function') showToast('這個舊 Moment 暫時無法重播。', 'warning');
      return;
    }
    const badge = (typeof getPlayerBadges === 'function' ? getPlayerBadges(card) : []).find(item => item.name === badgeName);
    const moment = {
      card,
      cardId: card.cardId,
      player: card.name,
      badge: badgeName,
      icon: badge?.icon || '🏅',
      title: story[0],
      impact: story[1],
      pages: story.slice(2).map(line => line.replace(/\{player\}/g, card.name))
    };
    moment.tier = badgeTierInfo(card, badgeName).name;
    moment.points = badgeMomentPoints(moment);
    openComic(moment, { replay: true });
  }

  function nextComicPage() {
    if (!activeComic) return;
    if (activeComic.page < activeComic.slides.length - 1) { activeComic.page += 1; renderComicPage(); return; }
    const wasReplay = activeComic.replay;
    document.getElementById('sjComicModal')?.classList.add('hidden');
    activeComic = null;
    if (wasReplay) return;
    if (activeGame?.visual?.awaitingBadge) {
      resumeVisualAfterComic();
      return;
    }
    if (activeGame && activeGame.pendingMoments.length) openComic(activeGame.pendingMoments.shift());
  }

  function buildGameAnalysis(gameData, game) {
    const rows = gameData?.boxScore || [];
    const total = key => rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
    const opponentRows = gameData?.opponentBoxScore || [];
    const opponentTotal = key => opponentRows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
    const topScorer = [...rows].sort((a, b) => Number(b.pts || 0) - Number(a.pts || 0))[0];
    const myRebounds = total('reb');
    const myTurnovers = total('tov');
    const opponentRebounds = opponentRows.length ? opponentTotal('reb') : clamp(Math.round(36 + (game.scheduleGame.opponentOvr - 80) * .55 + randomInt(-4, 5)), 31, 58);
    const opponentThrees = opponentRows.length ? opponentTotal('threeM') : clamp(Math.round(game.awayScore * .115 + game.scouting.ratings[0].value * .045 + randomInt(-2, 2)), 7, 20);
    const opponentTurnovers = opponentRows.length ? opponentTotal('tov') : clamp(Math.round(15 - (game.scheduleGame.opponentOvr - 80) * .18 + randomInt(-2, 2)), 7, 18);
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

  function refreshGameDataSummary(gameData) {
    if (!gameData || !Array.isArray(gameData.boxScore)) return;
    gameData.benchPts = gameData.boxScore.filter(row => row.role === 'bench').reduce((sum, row) => sum + Number(row.pts || 0), 0);
    gameData.bestPlayer = [...gameData.boxScore].sort((a, b) =>
      (Number(b.pts || 0) + Number(b.reb || 0) * 1.2 + Number(b.ast || 0) * 1.5)
      - (Number(a.pts || 0) + Number(a.reb || 0) * 1.2 + Number(a.ast || 0) * 1.5)
    )[0] || gameData.bestPlayer;
    if (gameData.bestPlayer) {
      const player = gameData.bestPlayer;
      gameData.highlight = `${gameData.win ? '🔥 勝利焦點' : '💔 本場焦點'}：【${player.name}】攻下 ${player.pts}分 ${player.reb || 0}籃板 ${player.ast || 0}助攻。`;
    }
  }

  function applyHistoricGameData(gameData, gameScript, side, preferredName) {
    if (!gameData || gameScript?.profile !== 'historic' || gameScript.recordTeam !== side) return null;
    const historic = seasonSimulation()?.applyHistoricLine(gameData.boxScore, gameData.myScore, gameScript, preferredName);
    if (historic) refreshGameDataSummary(gameData);
    return historic;
  }

  function evaluateJourneyRecords(gameData, scheduleGame) {
    const journey = state.seasonJourney;
    const simulation = seasonSimulation();
    if (!simulation || !journey || !gameData) return { records: [], personalBests: [] };
    (gameData.boxScore || []).forEach(row => {
      const card = findActiveCardByName(row.name);
      if (card) row.cardId = card.cardId;
    });
    const result = simulation.evaluateRecordBook(journey.recordBook, gameData.boxScore, {
      seasonNo: journey.seasonNo,
      game: scheduleGame.game,
      opponent: scheduleGame.opponent,
      createdAt: new Date().toISOString()
    });
    journey.recordBook = result.book;
    result.records.forEach(record => {
      const card = (state.inventory || []).find(item => String(item.cardId) === String(record.cardId))
        || findActiveCardByName(record.player);
      if (!card) return;
      ensureCardJourney(card);
      card.legacy.records = (card.legacy.records || 0) + 1;
      unlockBack(card, 'record', `${record.value} ${record.short} · NEW FRANCHISE RECORD`);
    });
    return result;
  }

  function recordMomentCards(result, opponentHistoric) {
    const recordIds = new Set((result.records || []).map(record => `${record.cardId}:${record.stat}`));
    const records = (result.records || []).map(record => ({
      badge: 'RECORD BREAKER', icon: '⚡', player: record.player,
      color: 'text-red-300 bg-red-950/70 border-red-500/50',
      desc: `${record.value} ${record.short} · NEW FRANCHISE RECORD（原紀錄 ${record.oldValue}）`
    }));
    const personal = (result.personalBests || [])
      .filter(best => !recordIds.has(`${best.cardId}:${best.stat}`))
      .slice(0, 2)
      .map(best => ({
        badge: 'CAREER HIGH', icon: '📈', player: best.player,
        color: 'text-amber-300 bg-amber-950/60 border-amber-500/40',
        desc: `${best.value} ${best.short} · 個人生涯新高${best.oldValue ? `（原 ${best.oldValue}）` : ''}`
      }));
    if (opponentHistoric) {
      records.push({
        badge: 'OPPONENT HISTORY', icon: '🌪️', player: opponentHistoric.player,
        color: 'text-rose-300 bg-rose-950/60 border-rose-500/40',
        desc: `對手打出紀錄之夜：${opponentHistoric.value} ${opponentHistoric.short}`
      });
    }
    return records.concat(personal);
  }

  function generateOpponentGameData(scheduleGame, homeScore, awayScore, matchupResults = [], gameScript = null) {
    const opponentRoster = getOpponentRoster(scheduleGame).map(player => ({
      ...player, positions: Array.isArray(player.positions) && player.positions.length ? player.positions : [player.position || 'G'],
      baseOvr: Number(player.ovr || scheduleGame.opponentOvr || 78), realOvr: Number(player.ovr || scheduleGame.opponentOvr || 78)
    }));
    const bench = getOpponentBench(scheduleGame).map(player => ({
      ...player,
      positions: Array.isArray(player.positions) && player.positions.length ? player.positions : ['G'],
      baseOvr: Number(player.baseOvr || player.ovr || scheduleGame.opponentOvr || 74)
    }));
    const emptyBadges = { starters: [], bench: [], mambaPlayers: [], sharpshooters: [], floorGenerals: [], rimProtectors: [], perimeterLocks: [], pickpockets: [], sixthMans: [], hasMamba: false, hasFloorGeneral: false };
    const opponentSimulationScript = simulationScriptForSide(gameScript, 'opponent', opponentRoster);
    const opponentData = generateGameBoxScoreData({
      starters: opponentRoster, bench, myScore: awayScore, oppScore: homeScore,
      win: awayScore > homeScore, oppTeam: state.seasonJourney.teamName,
      badgeEffects: emptyBadges, gameNum: scheduleGame.game, simulationScript: opponentSimulationScript
    });
    opponentData.boxScore.forEach(row => {
      const matchup = matchupResults.find(result => result.opponent === row.name);
      if (matchup) {
        row.defendedBy = matchup.defender;
        row.matchupDefense = matchup.defense;
        row.matchupEdge = matchup.edge;
      }
    });
    return opponentData;
  }

  function finishJourneyGame() {
    if (!activeGame || activeGame.finalized) return;
    activeGame.finalized = true;
    stopJourneyArenaMusic();
    playJourneySound('whistle');
    const win = activeGame.homeScore > activeGame.awayScore;
    const badgeEffects = typeof analyzeLineupBadges === 'function' ? analyzeLineupBadges() : null;
    const playerSimulationScript = applyAllStarRevengeScript(
      simulationScriptForSide(activeGame.gameScript, 'user', activeGame.starters),
      activeGame.scheduleGame.game
    );
    const gameData = generateGameBoxScoreData({
      starters: activeGame.starters.map(moraleAdjustedCard), bench: activeGame.bench.map(moraleAdjustedCard),
      myScore: activeGame.homeScore, oppScore: activeGame.awayScore, win,
      oppTeam: activeGame.scheduleGame.opponent, badgeEffects, gameNum: activeGame.scheduleGame.game,
      simulationScript: playerSimulationScript
    });
    const opponentGameData = generateOpponentGameData(activeGame.scheduleGame, activeGame.homeScore, activeGame.awayScore, activeGame.matchupResults, activeGame.gameScript);
    const userHistoric = applyHistoricGameData(gameData, activeGame.gameScript, 'user', playerSimulationScript?.featuredPlayerName);
    const opponentScript = simulationScriptForSide(activeGame.gameScript, 'opponent', activeGame.opponentRoster);
    const opponentHistoric = applyHistoricGameData(opponentGameData, activeGame.gameScript, 'opponent', opponentScript?.featuredPlayerName);
    gameData.opponentBoxScore = opponentGameData.boxScore;
    gameData.opponentBenchPts = opponentGameData.benchPts;
    const generatedMoments = Array.isArray(gameData.badgeMoments) ? gameData.badgeMoments : [];
    gameData.badgeMoments = generatedMoments.concat(activeGame.moments.map(m => ({ badge: m.badge, icon: m.icon, player: m.player, color: 'text-amber-300 bg-amber-950/50 border-amber-500/40', desc: `${m.title} 漫畫時刻已收錄。` })));
    const revengeName = allStarRevengeName(activeGame.scheduleGame.game);
    if (revengeName) gameData.badgeMoments.push({ badge: 'REVENGE GAME', icon: '🔥', player: revengeName, color: 'text-rose-300 bg-rose-950/60 border-rose-500/40', desc: `${revengeName} 回應全明星落選，本場獲得進攻戲份與 Badge Moment 加成。` });
    const recordResult = evaluateJourneyRecords(gameData, activeGame.scheduleGame);
    gameData.badgeMoments.push(...recordMomentCards(recordResult, opponentHistoric));
    gameData.records = recordResult.records;
    gameData.personalBests = recordResult.personalBests;
    gameData.historicLine = userHistoric || opponentHistoric || null;
    gameData.gameScript = activeGame.gameScript ? { ...activeGame.gameScript } : null;
    if (recordResult.records.length) {
      const record = recordResult.records[0];
      gameData.highlight = `⚡ NEW FRANCHISE RECORD：${record.player} · ${record.value} ${record.short}！`;
    }
    gameData.analysis = buildGameAnalysis(gameData, activeGame);
    activeGame.boxScore = gameData;
    const item = activeGame.scheduleGame;
    Object.assign(item, {
      played: true, win, myScore: activeGame.homeScore, oppScore: activeGame.awayScore,
      boxScore: gameData.boxScore, opponentBoxScore: gameData.opponentBoxScore, opponentBenchPts: gameData.opponentBenchPts,
      moments: gameData.badgeMoments, analysis: gameData.analysis, manualShots: activeGame.manualShots,
      defensiveMatchups: activeGame.matchupResults, defenseDecisions: activeGame.defenseDecisions,
      offenseDecisions: activeGame.offenseDecisions, clutchDecision: activeGame.clutchDecision,
      interactionPlan: activeGame.interactionPlan, interactiveEventCount: activeGame.interactiveEventCount,
      gameScript: activeGame.gameScript ? { ...activeGame.gameScript } : null,
      records: recordResult.records, personalBests: recordResult.personalBests
    });
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
    });
    triggerSpecialGameEvent(item, gameData, autoMode.running);
    if (j.gameIndex >= SEASON_LENGTH) completeRegularSeason();
    window.SeasonStandings?.ensure(j, typeof NBA_PLAYERS !== 'undefined' ? NBA_PLAYERS : []);
    syncLeagueState();
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
    const league = syncLeagueState(true);
    const leagueAwards = Array.isArray(league?.finalAwards) ? league.finalAwards : [];
    const cardForAward = award => {
      if (!award?.isPlayer) return null;
      const cardId = String(award.playerKey || '').replace(/^player:/, '');
      return cards.find(card => String(card.cardId) === cardId) || cards.find(card => card.name === award.player) || null;
    };
    const mvpAward = leagueAwards.find(award => award.awardId === 'mvp');
    const dpoyAward = leagueAwards.find(award => award.awardId === 'dpoy');
    const mvpCard = cardForAward(mvpAward);
    const dpoyCard = cardForAward(dpoyAward);
    if (mvpCard) {
      mvpCard.legacy.mvps = (mvpCard.legacy.mvps || 0) + 1;
      unlockBack(mvpCard, 'mvp', `Season ${j.seasonNo} MVP`);
    }
    if (dpoyCard) {
      dpoyCard.legacy.dpoys = (dpoyCard.legacy.dpoys || 0) + 1;
      unlockBack(dpoyCard, 'dpoy', `Season ${j.seasonNo} DPOY`);
    }
    const supportingAwards = calculateSeasonAwards(j).filter(award => !/MVP|DPOY|得分王|助攻王|籃板王/.test(award.label));
    j.awards = leagueAwards.length ? leagueAwards.concat(supportingAwards) : calculateSeasonAwards(j);
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
      const gameScript = ensureGameScript(item, teamOvr, starters);
      const scriptedResult = seasonSimulation()?.simulateGame(gameScript, {
        teamOvr,
        opponentOvr: item.opponentOvr
      });
      let mine = scriptedResult?.home ?? randomInt(92, 132);
      let theirs = scriptedResult?.away ?? randomInt(92, 132);
      if (mine === theirs) mine += scriptRoll(gameScript, 'admin-tiebreak') < .5 ? 1 : -1;
      const win = mine > theirs;
      const playerSimulationScript = applyAllStarRevengeScript(simulationScriptForSide(gameScript, 'user', starters), item.game);
      const gameData = generateGameBoxScoreData({
        starters: starters.map(moraleAdjustedCard), bench: bench.map(moraleAdjustedCard),
        myScore: mine, oppScore: theirs, win, oppTeam: item.opponent,
        badgeEffects: analyzeLineupBadges(), gameNum: item.game,
        simulationScript: playerSimulationScript
      });
      const opponentRoster = getOpponentRoster(item);
      const opponentGameData = generateOpponentGameData(item, mine, theirs, [], gameScript);
      const userHistoric = applyHistoricGameData(gameData, gameScript, 'user', playerSimulationScript?.featuredPlayerName);
      const opponentScript = simulationScriptForSide(gameScript, 'opponent', opponentRoster);
      const opponentHistoric = applyHistoricGameData(opponentGameData, gameScript, 'opponent', opponentScript?.featuredPlayerName);
      gameData.opponentBoxScore = opponentGameData.boxScore;
      gameData.opponentBenchPts = opponentGameData.benchPts;
      const recordResult = evaluateJourneyRecords(gameData, item);
      gameData.badgeMoments = (gameData.badgeMoments || []).concat(recordMomentCards(recordResult, opponentHistoric));
      const revengeName = allStarRevengeName(item.game);
      if (revengeName) gameData.badgeMoments.push({ badge: 'REVENGE GAME', icon: '🔥', player: revengeName, color: 'text-rose-300 bg-rose-950/60 border-rose-500/40', desc: `${revengeName} 回應全明星落選，本場獲得進攻戲份與 Badge Moment 加成。` });
      gameData.records = recordResult.records;
      gameData.personalBests = recordResult.personalBests;
      gameData.historicLine = userHistoric || opponentHistoric || null;
      gameData.gameScript = gameScript ? { ...gameScript } : null;
      if (recordResult.records.length) {
        const record = recordResult.records[0];
        gameData.highlight = `⚡ NEW FRANCHISE RECORD：${record.player} · ${record.value} ${record.short}！`;
      }
      Object.assign(item, {
        played: true, win, myScore: mine, oppScore: theirs, boxScore: gameData.boxScore,
        opponentBoxScore: opponentGameData.boxScore, opponentBenchPts: opponentGameData.benchPts,
        moments: gameData.badgeMoments || [], gameScript: gameScript ? { ...gameScript } : null,
        records: recordResult.records, personalBests: recordResult.personalBests
      });
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
      });
      triggerSpecialGameEvent(item, gameData, true);
    }
    if (j.gameIndex >= SEASON_LENGTH && !j.completed) completeRegularSeason();
    window.SeasonStandings?.ensure(j, typeof NBA_PLAYERS !== 'undefined' ? NBA_PLAYERS : []);
    syncLeagueState();
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
    const previewCard = {
      ...player,
      cardId: player.cardId || 'admin-back-preview',
      achievementBacks: CARD_BACKS.map(back => ({ id: back.id, detail: back.hint, unlockedAt: new Date().toISOString() }))
    };
    grid.className = 'tq-achievement-backs-grid';
    grid.innerHTML = window.ToeicQuestAchievementBacks
      ? window.ToeicQuestAchievementBacks.renderGrid(previewCard, CARD_BACKS)
      : CARD_BACKS.map(back => `<div>${safeText(back.name)}</div>`).join('');
    window.ToeicQuestAchievementBacks?.hydrateImages(grid);
    modal.classList.remove('hidden');
  }

  function closeAdminBackPreview() {
    document.getElementById('sjAdminBackModal')?.classList.add('hidden');
  }

  function startNextJourneySeason() {
    const old = state.seasonJourney;
    state.seasonJourney = {
      version: 3,
      seasonNo: (Number(old.seasonNo) || 1) + 1,
      teamName: old.teamName || PLAYER_TEAM_FALLBACK,
      gameIndex: 0, wins: 0, losses: 0, streak: 0, bestStreak: 0,
      schedule: buildSchedule(), recent: [],
      history: Array.isArray(old.history) ? old.history : [],
      awards: [], completed: false, seasonStartedAt: new Date().toISOString(),
      recordBook: seasonSimulation()?.ensureRecordBook(old.recordBook) || old.recordBook || null,
      allStarHistory: (Array.isArray(old.allStarHistory) ? old.allStarHistory : []).concat(old.allStarWeekend ? [{
        seasonNo: old.seasonNo,
        threePointParticipants: old.allStarWeekend.threePointParticipants || [],
        threePointChampionKey: old.allStarWeekend.threePointChampionKey || null
      }] : []).slice(-8)
    };
    state.season.hasPlayedPlayoffs = false;
    state.season.threePtContestPlayed = false;
    state.season.threePtContestShooter = null;
    state.season.threePtContestScore = null;
    window.SeasonStandings?.ensure(state.seasonJourney, typeof NBA_PLAYERS !== 'undefined' ? NBA_PLAYERS : []);
    syncLeagueState();
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
    stopJourneyArenaMusic();
    if (activeGame && !activeGame.finalized) {
      clearVisualEventTimer();
      if (shootingChallenge?.animFrameId) cancelAnimationFrame(shootingChallenge.animFrameId);
      shootingChallenge = null;
      defenseChallenge = null;
      offenseChallenge = null;
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
    const renderer = window.ToeicQuestAchievementBacks;
    host.innerHTML = renderer
      ? renderer.renderGrid(card, CARD_BACKS)
      : CARD_BACKS.map(back => `<button type="button" disabled>${safeText(back.name)}</button>`).join('');
    const summary = renderer?.summary(card, CARD_BACKS);
    const ownedLabel = document.getElementById('sjBacksOwnedSummary');
    const activeLabel = document.getElementById('sjBacksActiveSummary');
    if (ownedLabel) ownedLabel.textContent = summary ? `${summary.owned} / ${summary.total} 已解鎖` : '';
    if (activeLabel) activeLabel.textContent = summary?.activeName || '尚未裝備';
    if (document.getElementById('sjAchievementBacksSection')?.open) renderer?.hydrateImages(host);
  }

  function hydrateAchievementBackImages(details) {
    if (!details?.open) return;
    window.ToeicQuestAchievementBacks?.hydrateImages(details);
  }

  function openAchievementBackPreview(target, explicitBackId) {
    const cardId = typeof target === 'string' ? target : target?.dataset?.cardId;
    const backId = explicitBackId || target?.dataset?.backId;
    const card = (state.inventory || []).find(item => String(item.cardId) === String(cardId));
    const back = CARD_BACKS.find(item => item.id === backId);
    if (!card || !back) return;
    ensureCardJourney(card);
    const owned = card.achievementBacks.find(item => item.id === back.id);
    window.ToeicQuestAchievementBacks?.openPreview(card, back, owned, card.activeCardBack === back.id);
  }

  function selectAchievementBack(cardId, backId) {
    const card = (state.inventory || []).find(c => String(c.cardId) === String(cardId));
    if (!card || !card.achievementBacks.some(x => x.id === backId)) return;
    card.activeCardBack = backId;
    saveGame();
    renderAchievementBacks(card);
    window.ToeicQuestAchievementBacks?.closePreview();
    if (typeof renderInventory === 'function') renderInventory();
    if (typeof renderRoster === 'function') renderRoster();
    if (typeof showToast === 'function') showToast(`已將 ${CARD_BACKS.find(x => x.id === backId).name} 設為展示卡背`, 'success');
  }

  function installPlayerDetailExtension() {
    const anchor = document.getElementById('detailPlayerBadges');
    if (!anchor || document.getElementById('sjAchievementBacks')) return;
    const section = document.createElement('section');
    section.className = 'mt-3 pt-3 border-t border-slate-800';
    section.innerHTML = '<div class="flex justify-between items-center mb-2"><h4 class="text-[10px] text-amber-400 font-black sj-kicker">Badge Journey</h4><span id="sjBadgeMastery" class="text-[9px] text-slate-400"></span></div><div id="sjBadgeProgressList" class="sj-badge-progress-list"></div><div id="sjMomentSummary" class="text-[10px] text-slate-500 mb-3"></div><div id="sjMonthlyCareerHonors" class="sj-career-monthly hidden"><h5>MONTHLY HONORS</h5><div id="sjMonthlyCareerHonorList"></div></div><details id="sjAchievementBacksSection" class="tq-backs-collection" ontoggle="hydrateAchievementBackImages(this)"><summary><span class="tq-backs-collection__title"><span>ACHIEVEMENT COLLECTION</span><strong>BACKS</strong></span><span class="tq-backs-collection__status"><b id="sjBacksActiveSummary">尚未裝備</b><span id="sjBacksOwnedSummary">0 / 8 已解鎖</span></span><span class="tq-backs-collection__chevron" aria-hidden="true">›</span></summary><div class="tq-backs-collection__body"><p class="tq-backs-collection__note">點卡背可放大查看；已解鎖的卡背可以設為展示外觀。</p><div id="sjAchievementBacks" class="tq-achievement-backs-grid"></div></div></details>';
    anchor.parentElement.appendChild(section);
  }

  function hookExistingFunctions() {
    const oldRenderAll = renderAll;
    renderAll = function () { oldRenderAll(); ensureJourneyState(); renderJourneySeasonTab(); };
    renderSeasonTab = renderJourneySeasonTab;
    start82GamesSimulation = openJourneyGame;

    const oldSwitchTab = window.switchTab;
    if (typeof oldSwitchTab === 'function' && !oldSwitchTab.__seasonJourneyWrapped) {
      const wrappedSwitchTab = function (tabKey) {
        if (tabKey === 'season') currentSeasonView = 'journey';
        const result = oldSwitchTab.call(this, tabKey);
        if (tabKey === 'season') {
          renderJourneySeasonTab();
          showSeasonView('journey');
        }
        return result;
      };
      wrappedSwitchTab.__seasonJourneyWrapped = true;
      window.switchTab = wrappedSwitchTab;
      try { switchTab = wrappedSwitchTab; } catch (error) {}
    }

    const oldShowPlayerDetails = showPlayerDetails;
    showPlayerDetails = function (event, cardId) {
      oldShowPlayerDetails(event, cardId);
      installPlayerDetailExtension();
      const backsSection = document.getElementById('sjAchievementBacksSection');
      if (backsSection) backsSection.open = false;
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
        const monthlyHost = document.getElementById('sjMonthlyCareerHonors');
        const monthlyList = document.getElementById('sjMonthlyCareerHonorList');
        const monthlyHonors = card.legacy.monthlyHonors || [];
        if (monthlyHost) monthlyHost.classList.toggle('hidden', !monthlyHonors.length);
        if (monthlyList) monthlyList.innerHTML = monthlyHonors.map(honor => {
          const year = String(honor.monthKey || '').slice(0, 4);
          const shortMonth = String(honor.monthLabel || honor.monthKey || '').slice(0, 3).toUpperCase();
          return `<p>${safeText(shortMonth)} ${safeText(year)} · ${String(honor.conference || '').toUpperCase()} POTM</p>`;
        }).join('');
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
    if (leaguePulseTimer) clearInterval(leaguePulseTimer);
    leaguePulseTimer = setInterval(() => {
      leaguePulseIndex += 1;
      renderLeaguePulse();
    }, 8000);
    saveGame();
  }

  window.editJourneyTeamName = editJourneyTeamName;
  window.getJourneyStandings = getJourneyStandings;
  window.selectJourneyConference = selectJourneyConference;
  window.toggleJourneyStandingsExpansion = toggleJourneyStandingsExpansion;
  window.showSeasonView = showSeasonView;
  window.selectLeagueLeaderCategory = selectLeagueLeaderCategory;
  window.openLeaguePulse = openLeaguePulse;
  window.closeMonthlyAwardModal = closeMonthlyAwardModal;
  window.closeAllStarSelectionAnnouncement = closeAllStarSelectionAnnouncement;
  window.closeAllStarWeekend = closeAllStarWeekend;
  window.awardThreePointChampion = awardThreePointChampion;
  window.saveJourneyTeamName = saveJourneyTeamName;
  window.closeJourneyTeamName = closeJourneyTeamName;
  window.closeJourneyGame = closeJourneyGame;
  window.advanceJourneyQuarter = advanceJourneyQuarter;
  window.quickSimJourneyGame = quickSimJourneyGame;
  window.updateJourneyMatchup = updateJourneyMatchup;
  window.confirmJourneyMatchup = confirmJourneyMatchup;
  window.stopJourneyShot = stopJourneyShot;
  window.resolveJourneyDefense = resolveJourneyDefense;
  window.resolveJourneyOffense = resolveJourneyOffense;
  window.selectJourneyClutchStrategy = selectJourneyClutchStrategy;
  window.toggleJourneyArenaMusic = toggleJourneyArenaMusic;
  window.selectJourneyPregameStrategy = selectJourneyPregameStrategy;
  window.selectJourneyHalftimeStrategy = selectJourneyHalftimeStrategy;
  window.nextComicPage = nextComicPage;
  window.replayJourneyMoment = replayJourneyMoment;
  window.handleJourneyBadgeArtError = handleJourneyBadgeArtError;
  window.showJourneyBoxScore = showJourneyBoxScore;
  window.selectAchievementBack = selectAchievementBack;
  window.openAchievementBackPreview = openAchievementBackPreview;
  window.hydrateAchievementBackImages = hydrateAchievementBackImages;
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

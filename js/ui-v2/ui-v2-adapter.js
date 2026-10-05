/* ToeicQuest NBA UI V2 — HOME adapter.
   This file translates the existing save shape into a small presentation model
   and persists the player's explicit cover-player preference. */
(function (global) {
  'use strict';

  const V2 = global.ToeicQuestV2 = global.ToeicQuestV2 || {};
  const ENERGY_MAX = 15;
  const ENERGY_REGEN_MS = 30 * 60 * 1000;
  const PLAYER_PLACEHOLDER = './assets/players/featured-placeholder.svg';
  const OPPONENT_CODES = {
    Celtics: 'BOS', Knicks: 'NYK', Nets: 'BKN', '76ers': 'PHI', Raptors: 'TOR',
    Bulls: 'CHI', Cavaliers: 'CLE', Pistons: 'DET', Pacers: 'IND', Bucks: 'MIL',
    Hawks: 'ATL', Hornets: 'CHA', Heat: 'MIA', Magic: 'ORL', Wizards: 'WAS',
    Nuggets: 'DEN', Timberwolves: 'MIN', Thunder: 'OKC', 'Trail Blazers': 'POR', Jazz: 'UTA',
    Warriors: 'GSW', Clippers: 'LAC', Lakers: 'LAL', Suns: 'PHX', Kings: 'SAC',
    Mavericks: 'DAL', Rockets: 'HOU', Grizzlies: 'MEM', Pelicans: 'NOP', Spurs: 'SAS'
  };

  function getGameState() {
    try {
      return typeof state !== 'undefined' ? state : null;
    } catch (error) {
      return null;
    }
  }

  function numberValue(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function cardBaseOvr(card) {
    return numberValue(card?.ovr || card?.baseOvr, 0);
  }

  function moraleValue(card) {
    return Math.max(-1, Math.min(1, numberValue(card?.morale?.value, 0)));
  }

  function getTeamInfo(gameState) {
    if (!gameState) return { overall: 0, chemistry: 0, filled: 0, dominantTeam: '' };
    try {
      if (typeof calculateTeamOverall === 'function') return calculateTeamOverall();
    } catch (error) {
      console.warn('HOME V2 could not read team overall:', error);
    }
    const cards = Object.values(gameState.startingLineup || {}).filter(Boolean);
    const average = cards.length
      ? Math.round(cards.reduce((sum, card) => sum + cardBaseOvr(card), 0) / cards.length)
      : 0;
    return { overall: average, chemistry: 0, filled: cards.length, dominantTeam: '' };
  }

  function getStarterEntries(gameState) {
    return ['PG', 'SG', 'SF', 'PF', 'C']
      .map(position => ({ position, card: gameState?.startingLineup?.[position] || null }))
      .filter(entry => entry.card);
  }

  function effectiveStarterOvr(entry, gameState, teamInfo) {
    const bench = (gameState?.benchLineup || []).filter(Boolean);
    const hasMentor = bench.some(card => card?.isMentor);
    const natural = Array.isArray(entry.card.positions) && entry.card.positions.includes(entry.position);
    const protectedRookie = !natural && entry.card.isRookie && hasMentor;
    const positionPenalty = !natural && !protectedRookie ? 5 : 0;
    const chemistry = entry.card.team === teamInfo.dominantTeam ? numberValue(teamInfo.chemistry) : 0;
    return cardBaseOvr(entry.card) + chemistry + moraleValue(entry.card) - positionPenalty;
  }

  function findFeaturedPlayer(gameState, teamInfo) {
    const inventory = (gameState?.inventory || []).filter(Boolean);
    const manual = gameState?.featuredPlayerCardId
      ? inventory.find(card => String(card.cardId) === String(gameState.featuredPlayerCardId))
      : null;
    if (manual) {
      return { card: manual, effectiveOvr: cardBaseOvr(manual) + moraleValue(manual), source: 'manual' };
    }

    const starters = getStarterEntries(gameState);
    if (starters.length === 5) {
      return starters
        .map(entry => ({ card: entry.card, effectiveOvr: effectiveStarterOvr(entry, gameState, teamInfo), source: 'starter' }))
        .sort((a, b) => b.effectiveOvr - a.effectiveOvr)[0];
    }

    if (inventory.length) {
      const card = [...inventory].sort((a, b) => cardBaseOvr(b) - cardBaseOvr(a))[0];
      return { card, effectiveOvr: cardBaseOvr(card), source: 'inventory' };
    }
    return { card: null, effectiveOvr: 0, source: 'placeholder' };
  }

  function getPlayerImage(card) {
    if (!card?.nbaId) return PLAYER_PLACEHOLDER;
    try {
      if (typeof getPlayerImgUrl === 'function') return getPlayerImgUrl(card.nbaId);
    } catch (error) {
      return PLAYER_PLACEHOLDER;
    }
    return PLAYER_PLACEHOLDER;
  }

  function resolveSpecial(journey, game) {
    if (!journey || !game) return null;
    if (game.game === 81) {
      const projected = numberValue(journey.wins) + Math.round((82 - numberValue(journey.gameIndex)) * 0.5);
      if (projected >= 38 && projected <= 50) return { icon: '⚠️', label: 'MUST WIN' };
    }
    if (game.game >= 70 && game.game < 82) {
      const projected = numberValue(journey.wins) + Math.round((82 - numberValue(journey.gameIndex)) * 0.5);
      if (projected >= 36 && projected <= 52) return { icon: '📈', label: 'PLAYOFF RACE' };
    }
    if (!game.special) return null;
    return { icon: game.special.icon || '⭐', label: String(game.special.label || '').toUpperCase() };
  }

  function rankLabel(journey) {
    const standing = typeof global.getJourneyStandings === 'function' ? global.getJourneyStandings() : null;
    if (standing) return standing.rankLabel;
    const games = numberValue(journey?.gameIndex);
    if (!games) return '尚未排名';
    const pct = numberValue(journey.wins) / games;
    if (pct >= 0.72) return '西區第 1 名';
    if (pct >= 0.64) return '西區第 2–3 名';
    if (pct >= 0.56) return '西區第 4–6 名';
    if (pct >= 0.46) return '西區第 7–10 名';
    return '西區第 11–15 名';
  }

  function shortTeamCode(name, fallback = 'TQ') {
    const value = String(name || '').trim();
    if (!value) return fallback;
    if (OPPONENT_CODES[value]) return OPPONENT_CODES[value];
    if (/^[A-Za-z\s-]+$/.test(value)) {
      const words = value.split(/\s+/).filter(Boolean);
      if (words.length > 1) return words.map(word => word[0]).join('').slice(0, 3).toUpperCase();
      return value.slice(0, 3).toUpperCase();
    }
    return value.replace(/\s/g, '').slice(0, 2);
  }

  function energyTimerText(gameState) {
    if (gameState?.isAdmin) return 'ADMIN ENERGY';
    const energy = gameState?.seasonEnergy;
    if (!energy || numberValue(energy.current) >= ENERGY_MAX) return 'READY';
    const elapsed = Math.max(0, Date.now() - numberValue(energy.lastRegenAt, Date.now()));
    const remaining = Math.max(0, ENERGY_REGEN_MS - elapsed);
    return `${String(Math.floor(remaining / 60000)).padStart(2, '0')}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')}`;
  }

  function buildNews(journey, special, featuredCard) {
    const news = [];
    if (special) news.push(`${special.icon} 下一場：${special.label}`);
    const recent = Array.isArray(journey?.recent) ? [...journey.recent].reverse() : [];
    recent.slice(0, Math.max(0, 2 - news.length)).forEach(item => {
      news.push(`${item.win ? '勝利' : '惜敗'}｜Game ${item.game} vs ${item.opponent}`);
    });
    if (!news.length && featuredCard) news.push(`${typeof getCardDisplayName === 'function' ? getCardDisplayName(featuredCard) : featuredCard.name} 準備帶隊迎接新賽季。`);
    if (news.length < 2) news.push('完成比賽後，最新戰況會出現在這裡。');
    return news.slice(0, 2);
  }

  function getHomeViewModel() {
    const gameState = getGameState();
    const journey = gameState?.seasonJourney || null;
    const teamInfo = getTeamInfo(gameState);
    const featured = findFeaturedPlayer(gameState, teamInfo);
    const gameIndex = Math.max(0, Math.min(82, numberValue(journey?.gameIndex)));
    const game = journey?.schedule?.[Math.min(gameIndex, 81)] || null;
    const special = resolveSpecial(journey, game);
    const opponentWins = numberValue(game?.opponentWins);
    const opponentStanding = typeof global.getJourneyStandings === 'function' ? global.getJourneyStandings()?.byOpponent(game?.opponent) : null;
    const opponentLosses = Math.max(0, numberValue(game?.game, 1) - 1 - opponentWins);
    const starters = getStarterEntries(gameState);
    const recentForm = Array.isArray(journey?.recent) && journey.recent.length
      ? journey.recent.slice(-5).map(item => item.win ? 'W' : 'L').join(' ')
      : 'READY FOR TIP-OFF';
    const completed = !!journey?.completed;
    const postseasonAvailable = completed && numberValue(journey?.wins) >= 36 && !gameState?.season?.hasPlayedPlayoffs;
    const heroCard = featured.card;
    const heroPositions = Array.isArray(heroCard?.positions) ? heroCard.positions.join(' / ') : 'YOUR FRANCHISE STAR';
    const heroMeta = heroCard ? [heroCard.team, heroPositions].filter(Boolean).join('  •  ') : 'BUILD YOUR STARTING FIVE';
    const teamName = String(journey?.teamName || '玩家夢幻隊');

    return {
      gameState,
      profile: { name: teamName, meta: `SEASON ${numberValue(journey?.seasonNo, 1)}` },
      resources: {
        energy: gameState?.isAdmin ? '∞' : String(numberValue(gameState?.seasonEnergy?.current, ENERGY_MAX)),
        energyTimer: energyTimerText(gameState),
        tickets: gameState?.isAdmin ? '∞' : String(numberValue(gameState?.tickets, 10)),
        scoutPoints: String(numberValue(gameState?.scoutPoints))
      },
      featured: {
        cardId: heroCard?.cardId || null,
        name: heroCard ? (typeof getCardDisplayName === 'function' ? getCardDisplayName(heroCard) : heroCard.name) : 'YOUR STAR',
        meta: heroMeta,
        ovr: featured.effectiveOvr || '--',
        image: getPlayerImage(heroCard),
        placeholder: !heroCard,
        source: featured.source
      },
      gameDay: {
        number: completed ? 82 : Math.min(82, gameIndex + 1),
        homeName: teamName,
        homeCode: shortTeamCode(teamName),
        homeRecord: `${numberValue(journey?.wins)}–${numberValue(journey?.losses)}`,
        awayName: game?.opponent || 'NEXT OPPONENT',
        awayCode: shortTeamCode(game?.opponent, 'NBA'),
        awayRecord: opponentStanding ? `${opponentStanding.wins}–${opponentStanding.losses}` : (game ? `${opponentWins}–${opponentLosses}` : '0–0'),
        special: special ? `${special.icon} ${special.label}` : '',
        rank: rankLabel(journey),
        recent: recentForm,
        completed,
        postseasonAvailable,
        lineupReady: starters.length === 5,
        actionLabel: starters.length < 5
          ? 'SET STARTING FIVE'
          : (postseasonAvailable ? 'PLAY POSTSEASON' : (completed ? 'START NEXT SEASON' : 'PLAY 開始比賽'))
      },
      team: {
        overall: starters.length ? numberValue(teamInfo.overall) : '--',
        chemistry: numberValue(teamInfo.chemistry),
        lineupCount: starters.length,
        summary: starters.length < 5
          ? `先發 ${starters.length}/5｜先完成陣容配置`
          : `${teamInfo.dominantTeam || 'MIXED'} CHEMISTRY +${numberValue(teamInfo.chemistry)}｜${featured.card ? (typeof getCardDisplayName === 'function' ? getCardDisplayName(featured.card) : featured.card.name) : '核心球員'}` 
      },
      news: buildNews(journey, special, heroCard),
      placeholderImage: PLAYER_PLACEHOLDER
    };
  }

  V2.getHomeViewModel = getHomeViewModel;
  V2.getFeaturedPlayerCardId = function () {
    return getGameState()?.featuredPlayerCardId || null;
  };
  V2.setFeaturedPlayerCardId = function (cardId) {
    const gameState = getGameState();
    if (!gameState) return;
    gameState.featuredPlayerCardId = cardId || null;
    if (typeof saveGame === 'function') saveGame();
    if (typeof V2.renderHome === 'function') V2.renderHome();
  };
})(window);

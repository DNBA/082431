(function (global, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global) global.DynastyEra = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const hash = value => [...String(value)].reduce((n, c) => ((n * 31) + c.charCodeAt(0)) >>> 0, 2166136261);
  function defaults() { return { consecutiveTitles:0, totalTitles:0, active:false, dynastyLevel:0, scoutingMemory:{}, rivals:[], leagueMoves:[], previousSeasonProfile:null, threePeatEstablished:false }; }
  function ensure(state) { state.dynasty = { ...defaults(), ...(state.dynasty || {}) }; if (!Array.isArray(state.dynasty.rivals)) state.dynasty.rivals=[]; if (!Array.isArray(state.dynasty.leagueMoves)) state.dynasty.leagueMoves=[]; return state.dynasty; }
  function championHistory(journey) { return (journey?.history || []).filter(row => /champion/i.test(String(row?.result || ''))); }
  function consecutive(journey) { let count=0; const rows=[...(journey?.history || [])].reverse(); for (const row of rows) { if (/champion/i.test(String(row?.result || ''))) count++; else break; } return count; }
  function buildProfile(journey, lineup) {
    const played=(journey?.schedule || []).filter(g=>g.played); const strategy={};
    played.forEach(g=>{ const key=g.pregameStrategy || g.gameScript?.userStrategy || g.strategy || 'balanced'; strategy[key]=(strategy[key]||0)+1; });
    const top=Object.entries(strategy).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'balanced';
    const scorers={}; played.forEach(g=>(g.boxScore||[]).forEach(r=>{scorers[r.name]=(scorers[r.name]||0)+Number(r.pts||0);}));
    const primary=Object.entries(scorers).sort((a,b)=>b[1]-a[1])[0]?.[0] || lineup?.[0]?.name || '';
    return { mostUsedStrategy:top, primaryBallHandler:primary, primaryScorer:primary, threePointTendency:/three|shoot/i.test(top)?'high':'normal', paintTendency:/paint|post/i.test(top)?'high':'normal', rimProtector:[...(lineup||[])].sort((a,b)=>Number(b.basic?.BLK||0)-Number(a.basic?.BLK||0))[0]?.name||'', lineup:(lineup||[]).map(c=>c.cardId), games:played.length };
  }
  function counterFor(profile) { if (!profile) return { id:'balanced-pressure', label:'BALANCED PRESSURE', response:['KEEP BALANCED','CHANGE TEMPO','ATTACK MISMATCH'] }; if (profile.threePointTendency==='high') return { id:'switch-perimeter', label:'SWITCH PERIMETER · RUN SHOOTERS OFF LINE', response:['KEEP SHOOTING','ATTACK CLOSEOUT','USE MORE P&R'] }; if (profile.paintTendency==='high') return { id:'pack-paint', label:'PACK THE PAINT · HELP EARLY', response:['KEEP ATTACKING','FIVE-OUT','KICK TO CORNERS'] }; return { id:'early-double', label:`EARLY DOUBLE · FORCE BALL FROM ${profile.primaryScorer || 'STAR'}`, response:['KEEP STAR ISO','USE MORE P&R','MOVE OFF BALL'] }; }
  function startNextSeason(state, oldJourney, newJourney, lineup, opponents) {
    const d=ensure(state); d.previousSeasonProfile=buildProfile(oldJourney,lineup); d.consecutiveTitles=consecutive(oldJourney); d.totalTitles=championHistory(oldJourney).length; d.active=d.consecutiveTitles>=2; d.dynastyLevel=d.active?Math.min(3,d.consecutiveTitles-1):0; d.threePeatEstablished=d.consecutiveTitles>=3;
    const lastRings=(state.championshipRings||[]).slice(-3); d.rivals=[...new Set(lastRings.map(r=>r.opponent).filter(Boolean))];
    d.leagueMoves=[]; if (d.active) { const pool=(opponents||[]).filter(Boolean); const count=1+(hash(newJourney.seasonNo)%3); for(let i=0;i<count;i++){const team=pool[(hash(`${newJourney.seasonNo}:${i}`))%pool.length]; if(team&&!d.leagueMoves.some(x=>x.team===team)) d.leagueMoves.push({team,boost:2+(hash(team+newJourney.seasonNo)%3),headline:`${team} BUILDS TO STOP THE DYNASTY`});} }
    newJourney.dynastyStory=d.active?{ title:'THREE-PEAT CHASE', subtitle:'THE LEAGUE IS COMING FOR YOU.', goals:['Win 55+ Games','Finish Top 3 Conference','Beat Rival','Reach Finals','Win Third Straight Championship']}:null;
    return d;
  }
  function enhanceGame(state, journey, game, script) {
    const d=ensure(state); if(!d.active||!game) return script; const important=!!game.special||d.rivals.includes(game.opponent)||game.game>78; const seed=hash(`${journey.seasonNo}:${game.game}:${game.opponent}`); if(!important&&seed%100>=35) return script;
    const counter=counterFor(d.previousSeasonProfile); game.dynastyScouting={ counter, primaryFocus:d.previousSeasonProfile?.primaryScorer||'', revenge:d.rivals.includes(game.opponent), intensity:important?'high':'normal' };
    const hotStart = Number(journey.wins || 0) >= 20 && Number(journey.losses || 0) <= 2;
    const struggling = Number(journey.losses || 0) >= 11 && Number(journey.wins || 0) <= 8;
    if(script){ script.dynastyCounter=counter.id; script.opponentStrategyQuality=Math.min(1.18,1.03+(struggling?0:d.dynastyLevel*.025)+(important?.03:0)+(hotStart?.025:0)); script.clutchExecution=Math.min(1.15,1.02+(important?.05:0)+(hotStart?.02:0)); }
    return script;
  }
  return { ensure, buildProfile, counterFor, startNextSeason, enhanceGame, consecutive };
});

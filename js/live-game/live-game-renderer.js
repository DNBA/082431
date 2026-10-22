/* ToeicQuest NBA — LIVE GAME 2D renderer (V4.0.2 shot arc / rim finish). */
(function () {
  'use strict';

  let session = null;

  function safe(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  }
  function clock(value) {
    const seconds = Math.max(0, Math.ceil(Number(value) || 0));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }
  function ensureRoot() {
    let root = document.getElementById('liveGame2d');
    if (root) return root;
    root = document.createElement('section');
    root.id = 'liveGame2d';
    root.className = 'lg2d-overlay hidden';
    root.setAttribute('aria-label', 'LIVE GAME 2D');
    root.innerHTML = `
      <header class="lg2d-scorebar">
        <button type="button" class="lg2d-pause-button" data-lg-ui="pause" aria-label="暫停">Ⅱ</button>
        <div class="lg2d-team lg2d-team--home"><span data-lg-home-name>MY TEAM</span><b data-lg-home-score>0</b></div>
        <div class="lg2d-game-clock"><strong data-lg-quarter>1Q</strong><b data-lg-clock>2:00</b><span><i data-lg-shot-clock>24</i> SHOT</span></div>
        <div class="lg2d-team lg2d-team--away"><span data-lg-away-name>OPP</span><b data-lg-away-score>0</b></div>
      </header>
      <main class="lg2d-stage">
        <div class="lg2d-court" data-lg-court>
          <svg class="lg2d-court-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="M6 94H94V6H6Z M34 6V28H66V6 M39 28A11 11 0 0 0 61 28 M50 9V18 M44 18H56 M16 6A34 34 0 0 0 84 6 M8 79H92"/>
            <circle cx="50" cy="18" r="10"/><circle cx="50" cy="10" r="2.2"/>
          </svg>
          <div class="lg2d-hoop"><i></i><span></span></div>
          <div class="lg2d-players" data-lg-players></div>
          <div class="lg2d-ball-shadow hidden" data-lg-ball-shadow></div>
          <div class="lg2d-ball" data-lg-ball>●</div>
          <div class="lg2d-shot-meter hidden" data-lg-shot-meter><span></span><i data-lg-shot-ring></i><b data-lg-shot-label>RELEASE</b></div>
          <div class="lg2d-feedback" data-lg-feedback><b>TIP OFF</b><span>自由移動並尋找空檔</span></div>
          <div class="lg2d-transition hidden" data-lg-transition>CHANGE OF POSSESSION</div>
          <div class="lg2d-pass-targets hidden" data-lg-pass-targets></div>
        </div>
      </main>
      <footer class="lg2d-controls">
        <div class="lg2d-joystick" data-lg-joystick><span></span><i data-lg-joystick-knob></i><b>MOVE</b></div>
        <div class="lg2d-actions" data-lg-actions>
          <button type="button" data-lg-action="shoot"><b data-lg-action-label="shoot">SHOOT</b><span>HOLD</span></button>
          <button type="button" data-lg-action="pass"><b data-lg-action-label="pass">PASS</b><span>TAP / HOLD</span></button>
          <button type="button" data-lg-action="drive"><b data-lg-action-label="drive">DRIVE</b><span>MOVE</span></button>
          <button type="button" data-lg-action="screen" class="is-phase-next"><b data-lg-action-label="screen">P&amp;R</b><span>PHASE 7</span></button>
        </div>
      </footer>
      <div class="lg2d-pause-sheet hidden" data-lg-pause-sheet>
        <span>LIVE GAME PAUSED</span><h2>比賽已暫停</h2><p>回到 Season 不會結算或破壞本場比賽。</p>
        <button type="button" data-lg-ui="resume">繼續比賽</button>
        <button type="button" data-lg-ui="return">返回 Season</button>
      </div>`;
    document.body.appendChild(root);
    return root;
  }

  function makePlayerElement(player) {
    const element = document.createElement('div');
    element.className = `lg2d-player lg2d-player--${player.team}`;
    element.dataset.playerId = player.id;
    element.innerHTML = `<span class="lg2d-player__marker">▲</span><div class="lg2d-player__body"><b>${safe(player.number)}</b></div><strong>${safe(player.name.split(' ').slice(-1)[0])}</strong><small data-lg-route></small><em>YOU</em><button type="button" aria-label="傳給 ${safe(player.name)}"></button>`;
    return element;
  }

  function buildPlayers(current) {
    const host = current.root.querySelector('[data-lg-players]');
    host.innerHTML = '';
    current.playerElements = new Map();
    current.state.players.forEach(player => {
      const element = makePlayerElement(player);
      host.appendChild(element);
      current.playerElements.set(player.id, element);
      element.querySelector('button').addEventListener('click', () => {
        if (!current.passMode || player.team !== 'home') return;
        const result = window.LiveGameEngine.pass(current.state, player.id);
        if (result.ok) current.passMode = false;
      });
    });
  }

  function renderPassTargets(current) {
    const host = current.root.querySelector('[data-lg-pass-targets]');
    const holderId = current.state.ball.holderId;
    const targets = current.state.players.filter(player => player.team === 'home' && player.id !== holderId);
    host.classList.toggle('hidden', !current.passMode);
    current.playerElements.forEach((element, id) => element.classList.toggle('is-pass-target', current.passMode && targets.some(player => player.id === id)));
    const renderKey = current.passMode ? targets.map(player => player.id).join('|') : '';
    if (current.passTargetKey === renderKey) return;
    current.passTargetKey = renderKey;
    if (!current.passMode) { host.innerHTML = ''; return; }
    host.innerHTML = targets.map((player, index) => `<button type="button" data-target-id="${safe(player.id)}"><i>${index + 1}</i>${safe(player.name.split(' ').slice(-1)[0])}</button>`).join('');
    host.querySelectorAll('[data-target-id]').forEach(button => button.addEventListener('click', () => {
      const result = window.LiveGameEngine.pass(current.state, button.dataset.targetId);
      if (result.ok) current.passMode = false;
    }, { once: true }));
  }

  function updateActionMode(current) {
    const offense = current.state.possession === 'home';
    const shotAction = offense ? window.LiveGameEngine.getShotAction?.(current.state) || 'SHOOT' : 'CONTEST';
    const values = offense
      ? [['shoot', shotAction, shotAction === 'SHOOT' ? 'HOLD' : 'TAP'], ['pass', 'PASS', 'TAP / HOLD'], ['drive', 'DRIVE', 'MOVE'], ['screen', 'P&R', 'PHASE 7']]
      : [['shoot', 'CONTEST', 'TIME'], ['pass', 'STEAL', 'RISK'], ['drive', 'SWITCH', 'DEFENDER'], ['screen', 'SPRINT', 'HOLD']];
    current.root.querySelectorAll('[data-lg-action]').forEach((button, index) => {
      const [action, label, hint] = values[index];
      button.dataset.modeAction = action;
      button.querySelector('b').textContent = label;
      button.querySelector('span').textContent = hint;
      button.classList.toggle('is-phase-next', offense && action === 'screen');
    });
  }

  function action(current, slot, phase) {
    const button = current.root.querySelector(`[data-lg-action="${slot}"]`);
    const modeAction = button?.dataset.modeAction || slot;
    const engine = window.LiveGameEngine;
    if (modeAction === 'shoot') return phase === 'start' ? engine.startShot(current.state) : engine.releaseShot(current.state);
    if (modeAction === 'contest' && phase === 'start') return engine.contest(current.state);
    if (phase !== 'start') return null;
    if (modeAction === 'pass') {
      current.passMode = false;
      return engine.pass(current.state, null, current.input?.getMovement() || { x: 0, y: 0 });
    }
    if (modeAction === 'steal') return engine.steal(current.state);
    if (modeAction === 'drive') return engine.drive(current.state, current.input?.getMovement() || { x: 0, y: -1 });
    if (modeAction === 'switch') return engine.switchDefender(current.state);
    if (modeAction === 'sprint') return { ok: true };
    if (modeAction === 'screen') {
      current.state.feedback = { title: 'P&R · NEXT PHASE', detail: 'Phase 1～6 先確認核心手感', tone: 'neutral', until: current.state.elapsed + 1.4 };
      return { ok: false, reason: 'phase-7' };
    }
    return null;
  }

  function render(current) {
    const state = current.state;
    const root = current.root;
    root.querySelector('[data-lg-home-score]').textContent = state.homeScore;
    root.querySelector('[data-lg-away-score]').textContent = state.awayScore;
    root.querySelector('[data-lg-quarter]').textContent = state.quarter <= 4 ? `${state.quarter}Q` : (state.quarter === 5 ? 'OT' : `${state.quarter - 4}OT`);
    root.querySelector('[data-lg-clock]').textContent = clock(state.gameClock);
    root.querySelector('[data-lg-shot-clock]').textContent = Math.max(0, Math.ceil(state.shotClock));
    const controlledId = state.controlledPlayerId;
    const holderId = state.ball.holderId;
    const width = current.courtSize.width;
    const height = current.courtSize.height;
    current.playerElements.forEach((element, id) => {
      const player = state.players.find(item => item.id === id);
      element.style.transform = `translate3d(${player.x * width / 100}px, ${player.y * height / 100}px, 0) translate3d(-50%, -50%, 0)`;
      element.classList.toggle('is-controlled', id === controlledId);
      element.classList.toggle('has-ball', id === holderId);
      element.classList.toggle('is-recovering', player.recoveryUntil > state.elapsed);
      element.classList.toggle('is-cutting', player.routeKind === 'cut' || player.routeKind === 'give-go');
      element.classList.toggle('is-relocating', player.routeKind === 'relocate');
      element.classList.toggle('is-receiving', player.receiveFlashUntil > state.elapsed);
      const route = element.querySelector('[data-lg-route]');
      if (route) route.textContent = player.routeKind === 'cut' ? 'CUT' : player.routeKind === 'give-go' ? 'GIVE & GO' : player.routeKind === 'relocate' ? 'SPACE' : '';
    });
    const ball = root.querySelector('[data-lg-ball]');
    const ballHeight = Math.max(0, Number(state.ball.z) || 0);
    const lift = ballHeight * height / 140;
    const scale = 1 + Math.min(.28, ballHeight * .012);
    ball.style.transform = `translate3d(${state.ball.x * width / 100}px, ${state.ball.y * height / 100 - lift}px, 0) translate3d(-50%, -50%, 0) scale(${scale})`;
    ball.classList.toggle('is-flight', state.ball.inFlight);
    ball.classList.toggle('is-shot', !!state.shot && state.ball.inFlight);
    ball.style.setProperty('--lg2d-ball-height', String(ballHeight));
    const shadow = root.querySelector('[data-lg-ball-shadow]');
    shadow.classList.toggle('hidden', !state.ball.inFlight);
    shadow.style.opacity = String(Math.max(.1, .34 - ballHeight * .009));
    shadow.style.transform = `translate3d(${state.ball.x * width / 100}px, ${state.ball.y * height / 100}px, 0) translate3d(-50%, -50%, 0) scale(${1 + ballHeight * .018})`;
    const meter = root.querySelector('[data-lg-shot-meter]');
    const ring = root.querySelector('[data-lg-shot-ring]');
    meter.classList.toggle('hidden', !state.shot?.charging);
    if (state.shot?.charging) ring.style.transform = `translate3d(-50%,-50%,0) scale(${state.shot.circleScale})`;
    const feedback = root.querySelector('[data-lg-feedback]');
    feedback.className = `lg2d-feedback is-${state.feedback?.tone || 'neutral'} ${state.feedback?.until > state.elapsed ? 'is-visible' : ''}`;
    feedback.querySelector('b').textContent = state.feedback?.title || '';
    feedback.querySelector('span').textContent = state.feedback?.detail || '';
    root.querySelector('[data-lg-transition]').classList.toggle('hidden', state.transitionUntil <= state.elapsed);
    renderPassTargets(current);
    updateActionMode(current);
  }

  function frame(timestamp) {
    const current = session;
    if (!current || !current.visible) return;
    if (!current.lastTime) current.lastTime = timestamp;
    const dt = Math.min(.06, Math.max(0, (timestamp - current.lastTime) / 1000));
    current.lastTime = timestamp;
    window.LiveGameEngine.step(current.state, current.input.getMovement(), dt);
    render(current);
    if (current.state.finished) {
      const result = window.LiveGameEngine.toBoxScore(current.state);
      const finish = current.onFinish;
      close(true);
      finish?.(result);
      return;
    }
    current.raf = requestAnimationFrame(frame);
  }

  function open(config) {
    if (!window.LiveGameEngine || !window.LiveGameInput) throw new Error('LIVE GAME modules are not ready');
    if (session) close(false);
    const root = ensureRoot();
    const state = window.LiveGameEngine.create(config);
    session = {
      root, state, visible: true, raf: null, lastTime: 0, passMode: false, playerElements: new Map(),
      onFinish: config?.onFinish, onExit: config?.onExit, onSnapshot: config?.onSnapshot,
      passTargetKey: null, courtSize: { width: 1, height: 1 }
    };
    root.querySelector('[data-lg-home-name]').textContent = config?.homeName || 'MY TEAM';
    root.querySelector('[data-lg-away-name]').textContent = config?.awayName || 'OPPONENT';
    buildPlayers(session);
    session.input = window.LiveGameInput.attach(root, {
      shootStart: () => action(session, 'shoot', 'start'),
      shootEnd: () => action(session, 'shoot', 'end'),
      pass: () => action(session, 'pass', 'start'),
      passHold: () => {
        const mode = session?.root.querySelector('[data-lg-action="pass"]')?.dataset.modeAction;
        if (mode === 'pass') session.passMode = !session.passMode;
        else action(session, 'pass', 'start');
      },
      drive: () => action(session, 'drive', 'start'),
      switch: () => window.LiveGameEngine.switchDefender(session.state),
      screen: () => action(session, 'screen', 'start')
    });
    root.querySelector('[data-lg-action="screen"]').onpointerdown = event => {
      if (session?.root.querySelector('[data-lg-action="screen"]')?.dataset.modeAction === 'sprint') session.input?.setSprint(true);
      else action(session, 'screen', 'start');
      event.preventDefault();
    };
    root.querySelector('[data-lg-action="screen"]').onpointerup = () => session?.input?.setSprint(false);
    root.querySelector('[data-lg-ui="pause"]').onclick = () => pause();
    root.querySelector('[data-lg-ui="resume"]').onclick = () => resume();
    root.querySelector('[data-lg-ui="return"]').onclick = () => returnToSeason();
    root.classList.remove('hidden');
    document.body.classList.add('lg2d-active');
    const measureCourt = () => {
      const rect = root.querySelector('[data-lg-court]').getBoundingClientRect();
      if (session) session.courtSize = { width: rect.width || 1, height: rect.height || 1 };
    };
    measureCourt();
    session.resizeHandler = measureCourt;
    window.addEventListener('resize', measureCourt);
    render(session);
    session.raf = requestAnimationFrame(frame);
    return state;
  }

  function pause() {
    if (!session) return;
    window.LiveGameEngine.setPaused(session.state, true);
    session.root.querySelector('[data-lg-pause-sheet]').classList.remove('hidden');
    session.onSnapshot?.(window.LiveGameEngine.snapshot(session.state));
  }
  function resume() {
    if (!session) return false;
    session.visible = true;
    session.root.classList.remove('hidden');
    session.root.querySelector('[data-lg-pause-sheet]').classList.add('hidden');
    document.body.classList.add('lg2d-active');
    window.LiveGameEngine.setPaused(session.state, false);
    session.lastTime = 0;
    cancelAnimationFrame(session.raf);
    session.raf = requestAnimationFrame(frame);
    return true;
  }
  function returnToSeason() {
    if (!session) return;
    pause();
    session.visible = false;
    session.root.classList.add('hidden');
    document.body.classList.remove('lg2d-active');
    cancelAnimationFrame(session.raf);
    session.onExit?.(window.LiveGameEngine.snapshot(session.state));
  }
  function close(keepCallbacks) {
    if (!session) return;
    cancelAnimationFrame(session.raf);
    session.input?.destroy();
    if (session.resizeHandler) window.removeEventListener('resize', session.resizeHandler);
    session.root.classList.add('hidden');
    session.root.querySelector('[data-lg-pause-sheet]')?.classList.add('hidden');
    document.body.classList.remove('lg2d-active');
    if (!keepCallbacks) session.onSnapshot?.(window.LiveGameEngine.snapshot(session.state));
    session = null;
  }
  function hasSession() { return !!session; }
  function isVisible() { return !!session?.visible; }
  function currentState() { return session?.state || null; }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && session?.visible) pause();
  });

  window.LiveGameRenderer = { open, pause, resume, returnToSeason, close, hasSession, isVisible, currentState };
})();

const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../js/live-game/live-game-engine.js');

function card(name, ovr, extra = {}) {
  return { cardId: name.toLowerCase(), name, ovr, positions: ['PG'], basic: { AST: 6, STL: 1.2, REB: 4, '3P%': .37, '3PA': 6 }, ...extra };
}
function game(options = {}) {
  const home = [card('Alpha', 90), card('Bravo', 86), card('Charlie', 84), card('Delta', 82), card('Echo', 80)];
  const away = [card('One', 85), card('Two', 84), card('Three', 83), card('Four', 82), card('Five', 81)];
  return Engine.create({ homePlayers: home, awayPlayers: away, quarterDuration: 30, rng: () => .4, ...options });
}

test('phase 1-2 creates half court entities and movement uses player speed', () => {
  const state = game();
  assert.equal(state.players.length, 10);
  assert.equal(state.ball.holderId, state.controlledPlayerId);
  const player = Engine.helpers.controlled(state);
  const before = player.x;
  Engine.step(state, { x: 1, y: 0 }, .05);
  assert.ok(player.x > before);
});

test('phase 3 targeted pass transfers ball and control to receiver', () => {
  const state = game({ rng: () => .99 });
  const target = Engine.helpers.teamPlayers(state, 'home')[1];
  assert.equal(Engine.pass(state, target.id).ok, true);
  for (let i = 0; i < 8; i += 1) Engine.step(state, {}, .05);
  assert.equal(state.ball.holderId, target.id);
  assert.equal(state.controlledPlayerId, target.id);
});

test('V4.0.1 off-ball teammates cut or relocate instead of staying on fixed spots', () => {
  const state = game({ rng: () => .4 });
  const teammate = Engine.helpers.teamPlayers(state, 'home')[1];
  const before = { x: teammate.x, y: teammate.y };
  for (let i = 0; i < 30; i += 1) Engine.step(state, {}, .05);
  assert.ok(Math.hypot(teammate.x - before.x, teammate.y - before.y) > .5);
  assert.ok(['cut', 'relocate', 'space', 'give-go'].includes(teammate.routeKind));
});

test('V4.0.1 tap pass chooses a teammate and starts a visible pass flight', () => {
  const state = game({ rng: () => .99 });
  const passer = Engine.helpers.holder(state);
  const result = Engine.pass(state, null, { x: 1, y: 0 });
  assert.equal(result.ok, true);
  assert.ok(result.targetId);
  assert.equal(state.ball.inFlight, true);
  assert.equal(state.ball.holderId, null);
  assert.equal(passer.routeKind, 'give-go');
  for (let i = 0; i < 10; i += 1) Engine.step(state, {}, .05);
  assert.equal(state.ball.holderId, result.targetId);
  assert.equal(state.controlledPlayerId, result.targetId);
});

test('phase 4 circle shot rating changes green window and success probability', () => {
  const strong = game();
  const weak = game();
  const strongShooter = Engine.helpers.holder(strong);
  const weakShooter = Engine.helpers.holder(weak);
  weakShooter.ratings.shooting = 60;
  strongShooter.ratings.shooting = 96;
  const strongEval = Engine.evaluateShot(strong, strongShooter, { circleScale: 1.04 });
  const weakEval = Engine.evaluateShot(weak, weakShooter, { circleScale: 1.04 });
  assert.ok(strongEval.greenWindow > weakEval.greenWindow);
  assert.ok(strongEval.probability > weakEval.probability);
  assert.equal(Engine.evaluateShot(strong, strongShooter, { circleScale: 1.2 }).timing.label, 'EARLY');
  assert.equal(Engine.evaluateShot(strong, strongShooter, { circleScale: .8 }).timing.label, 'LATE');
});

test('phase 5 active close contest lowers the shot chance', () => {
  const open = game();
  const covered = game();
  const openShooter = Engine.helpers.holder(open);
  const coveredShooter = Engine.helpers.holder(covered);
  Engine.helpers.teamPlayers(open, 'away').forEach(player => { player.x = 90; player.y = 90; });
  const defender = Engine.helpers.teamPlayers(covered, 'away')[0];
  defender.x = coveredShooter.x + 1; defender.y = coveredShooter.y + 1; defender.contestUntil = 10;
  const openEval = Engine.evaluateShot(open, openShooter, { circleScale: 1 });
  const coveredEval = Engine.evaluateShot(covered, coveredShooter, { circleScale: 1 });
  assert.ok(openEval.probability > coveredEval.probability);
  assert.notEqual(coveredEval.contest.label, 'OPEN');
});

test('phase 6 drive supports crossover and step back', () => {
  const state = game();
  assert.equal(Engine.drive(state, { x: 1, y: 0 }).move, 'crossover');
  assert.equal(Engine.drive(state, { x: 0, y: 1 }).move, 'step-back');
});

test('phase 6 failed steal applies recovery and cooldown', () => {
  const state = game({ possession: 'away', rng: () => .99 });
  const defender = Engine.helpers.controlled(state);
  const handler = Engine.helpers.holder(state);
  defender.x = handler.x + 2; defender.y = handler.y + 2;
  const result = Engine.steal(state);
  assert.equal(result.ok, true);
  assert.equal(result.success, false);
  assert.ok(defender.recoveryUntil > state.elapsed);
  assert.equal(Engine.steal(state).reason, 'cooldown');
});

test('box score uses the existing Season field names', () => {
  const state = game();
  const row = Engine.toBoxScore(state).home[0];
  ['pts','reb','ast','stl','blk','fgM','fgA','threeM','threeA'].forEach(key => assert.ok(Object.hasOwn(row, key)));
});

test('full PLAY reaches FINAL without an infinite quarter and score matches player points', () => {
  const state = game({ quarterDuration: 20, rng: () => .2 });
  for (let frame = 0; frame < 10000 && !state.finished; frame += 1) Engine.step(state, {}, .05);
  assert.equal(state.finished, true);
  assert.equal(state.finishReason, 'final');
  const result = Engine.toBoxScore(state);
  assert.equal(result.home.reduce((sum, row) => sum + row.pts, 0), result.homeScore);
  assert.equal(result.away.reduce((sum, row) => sum + row.pts, 0), result.awayScore);
});

test('HYBRID returns after exactly the configured possession window', () => {
  const state = game({ mode: 'hybrid', possessions: 3, quarterDuration: 70, rng: () => .2 });
  for (let frame = 0; frame < 5000 && !state.finished; frame += 1) Engine.step(state, {}, .05);
  assert.equal(state.finished, true);
  assert.equal(state.finishReason, 'hybrid-complete');
  assert.equal(state.possessionsPlayed, 3);
});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const fixedNow = new Date('2026-10-03T12:00:00+08:00').getTime();

class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : [fixedNow])); }
  static now() { return fixedNow; }
}

function makeElement() {
  const classes = new Set();
  return {
    classList: {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
      toggle: (name, force) => {
        const enabled = force === undefined ? !classes.has(name) : !!force;
        if (enabled) classes.add(name); else classes.delete(name);
        return enabled;
      },
      contains: name => classes.has(name)
    },
    style: {},
    value: '',
    textContent: '',
    innerHTML: '',
    disabled: false,
    parentElement: null,
    appendChild(child) { child.parentElement = this; },
    focus() {}
  };
}

function loadPlanner() {
  const elements = new Map();
  const document = {
    readyState: 'loading',
    hidden: false,
    body: makeElement(),
    addEventListener() {},
    querySelectorAll() { return []; },
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeElement());
      return elements.get(id);
    }
  };
  let id = 0;
  const context = {
    console,
    Date: FixedDate,
    Math,
    Set,
    Map,
    Object,
    Array,
    Number,
    String,
    RegExp,
    JSON,
    document,
    state: {
      dailyQuests: { wordAddedToday: 10, quizPerfectToday: true, pomodoroDoneToday: 1 },
      studyLogs: ['2026-10-1', '2026-10-02'],
      studyDetails: {
        '2026-10-01': { quizName: 'Listening Test', totalScore: 315, lTotal: 100, lCorrect: 63, rTotal: 0, rCorrect: 0 }
      }
    },
    saveGame() {},
    showToast() {},
    checkAndResetDailyQuests() {},
    setTimeout(fn) { fn(); return 1; },
    clearInterval() {},
    setInterval() { return 1; },
    crypto: { randomUUID: () => `test-${++id}` }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'js', 'study-planner.js'), 'utf8'), context);
  return { context, elements };
}

{
  const { context, elements } = loadPlanner();
  context.renderStudyPlanner();
  assert.deepEqual(Array.from(context.state.studyActivityDates), ['2026-10-01', '2026-10-02']);
  assert.equal(context.state.studyStreak, 2);
  assert.equal(context.state.studyStreakLastDate, '2026-10-02');
  context.selectPlannerDate('2026-10-01');
  assert.match(elements.get('plannerLogList').innerHTML, /Listening Test/);
  assert.match(elements.get('plannerToeicRecord').innerHTML, /315 分/);

  const task = context.StudyPlanner.buildTask({
    id: 'task-main', title: '國學第一章', date: '2026-10-03', time: '16:00', plannedMinutes: 30, type: 'study'
  });
  context.state.studyPlanner.tasks.push(task);
  assert.equal(context.completePlannerTask('task-main', {
    actualMinutes: 34,
    completedAt: '2026-10-03T16:34:00+08:00'
  }), true);
  assert.equal(task.completed, true);
  assert.equal(context.state.studyPlanner.logs.length, 1);
  assert.equal(context.state.studyPlanner.logs[0].actualMinutes, 34);
  assert.equal(context.state.studyPlanner.logs[0].date, '2026-10-03');
  assert.equal(context.completePlannerTask('task-main', { actualMinutes: 40 }), false);
  assert.equal(context.state.studyPlanner.logs.length, 1);

  context.openPlannerReviewSheet('task-main');
  context.schedulePlannerReview(7);
  const review = context.state.studyPlanner.tasks.find(item => item.sourceType === 'review');
  assert.ok(review);
  assert.equal(review.date, '2026-10-10');
  assert.equal(review.type, 'review');
  assert.deepEqual(Array.from(review.sourceIds), ['task-main']);

  const partial = context.StudyPlanner.buildTask({
    id: 'task-partial', title: '計量作業', date: '2026-10-03', time: '21:00', plannedMinutes: 30
  });
  context.state.studyPlanner.tasks.push(partial);
  assert.equal(context.recordStudyPlannerTaskProgressFromFocus({
    taskId: partial.id, actualMinutes: 12, completedAt: '2026-10-03T21:12:00+08:00'
  }), true);
  assert.equal(context.state.studyPlanner.tasks.find(item => item.id === partial.id).completed, false);
  assert.equal(context.state.studyPlanner.logs.find(log => log.taskId === partial.id).actualMinutes, 12);
  assert.equal(context.completeStudyPlannerTaskFromFocus({
    taskId: partial.id, actualMinutes: 30, completedAt: '2026-10-03T21:30:00+08:00'
  }), true);
  assert.equal(context.state.studyPlanner.tasks.find(item => item.id === partial.id).completed, true);
  assert.equal(context.state.studyPlanner.logs.filter(log => log.taskId === partial.id).length, 1);
}

{
  const { context } = loadPlanner();
  context.renderStudyPlanner();
  const template = context.StudyPlanner.buildTask({ id: 'weekly', title: '週末複習', date: '2026-10-03', time: '18:30', plannedMinutes: 25 });
  context.state.studyPlanner.tasks.push(template);
  assert.equal(context.StudyPlanner.scheduleWeeklyPlannerTasks(template, [6], '2026-10-17').length, 2);
  assert.equal(context.StudyPlanner.scheduleWeeklyPlannerTasks(template, [6], '2026-10-17').length, 0, 'Repeated scheduling must be idempotent');
  assert.deepEqual(Array.from(context.state.studyPlanner.tasks, task => task.date), ['2026-10-03', '2026-10-10', '2026-10-17']);
  context.selectPlannerDate('2026-10-04');
  assert.equal(context.copyPlannerPreviousDay(), 1);
  assert.equal(context.copyPlannerPreviousDay(), 0);
  const copy = context.state.studyPlanner.tasks.find(task => task.date === '2026-10-04');
  assert.equal(copy.completed, false);
  assert.equal(copy.repeatSeriesId, '');
  context.state.studyPlanner.tasks.push(context.StudyPlanner.buildTask({ id: 'already-done', title: '已完成', date: '2026-10-04', completed: true }));
  assert.equal(context.movePlannerUnfinishedToTomorrow(), 1);
  assert.equal(context.state.studyPlanner.tasks.find(task => task.id === copy.id).date, '2026-10-05');
  assert.equal(context.state.studyPlanner.tasks.find(task => task.id === 'already-done').date, '2026-10-04');
  context.state.studyPlanner.tasks.push(context.StudyPlanner.buildTask({ id: 'overdue', title: '逾期複習', date: '2026-10-01' }));
  context.selectPlannerDate('2026-10-01');
  assert.equal(context.movePlannerUnfinishedToTomorrow(), 1);
  assert.equal(context.state.studyPlanner.tasks.find(task => task.id === 'overdue').date, '2026-10-04', 'Past unfinished tasks should move to the actual tomorrow');
  const session = { id: 'quiz-session', answers: [{ word: 'custom-review-word', meaning: '自訂測試字', correct: false }, { word: 'CUSTOM-REVIEW-WORD', meaning: '自訂測試字', correct: false }, { word: 'correct', meaning: '正確', correct: true }] };
  const review = context.scheduleQuizReviewTask(session, 1);
  assert.equal(review.date, '2026-10-04');
  assert.equal(review.quizWords.length, 1, 'Review must contain the deduplicated failed word set');
  assert.equal(context.scheduleQuizReviewTask(session, 1).id, review.id);
  context.renderStudyPlanner();
  assert.equal(context.state.studyPlanner.tasks.find(task => task.id === review.id).quizWords[0].word, 'CUSTOM-REVIEW-WORD');
  let quizContext;
  context.startVocabQuizModal = (mode, details) => { quizContext = { mode, details }; };
  assert.equal(context.startPlannerTaskQuiz(review.id), true);
  assert.equal(quizContext.mode, 'targeted');
  assert.equal(quizContext.details.taskId, review.id);
  context.recordPlannerQuizLog({ taskId: review.id, score: 1, totalQuestions: 1, actualMinutes: 2 });
  assert.equal(context.state.studyPlanner.tasks.find(task => task.id === review.id).completed, true);
  assert.equal(context.state.studyPlanner.logs.filter(log => log.taskId === review.id).length, 1);
  context.recordPlannerQuizLog({ taskId: review.id, score: 1, totalQuestions: 1, actualMinutes: 2 });
  assert.equal(context.state.studyPlanner.logs.filter(log => log.taskId === review.id).length, 1, 'Quiz completion must not duplicate the task log');
}

{
  const timer = require(path.join(root, 'js', 'focus-timer.js'));
  const startAt = new Date('2026-10-03T10:00:00+08:00').getTime();
  const running = timer.start(timer.reset(), startAt, 'lock-screen-test');
  assert.equal(timer.remainingMs(running, startAt + 25 * 60 * 1000), 0);

  const paused = timer.pause(running, startAt + 10 * 60 * 1000);
  const resumed = timer.start(paused, startAt + 30 * 60 * 1000, 'lock-screen-test');
  assert.equal(timer.remainingMs(resumed, startAt + 45 * 60 * 1000), 0);

  let focus = {};
  let rewarded = 0;
  for (let index = 1; index <= 21; index += 1) {
    const result = timer.recordCompletion(focus, {
      sessionId: `cap:${index}`, durationMs: 25 * 60 * 1000, dateKey: '2026-10-03', dailyRewardCap: 20
    });
    focus = result.focus;
    if (result.rewardGranted) rewarded += 1;
  }
  assert.equal(rewarded, 20);
  const duplicate = timer.recordCompletion(focus, {
    sessionId: 'cap:1', durationMs: 25 * 60 * 1000, dateKey: '2026-10-03', dailyRewardCap: 20
  });
  assert.equal(duplicate.firstCompletion, false);

  const beforeMidnight = timer.recordCompletion({}, {
    sessionId: 'night:1', durationMs: 25 * 60 * 1000, dateKey: '2026-10-03', dailyRewardCap: 20
  });
  const afterMidnight = timer.recordCompletion(beforeMidnight.focus, {
    sessionId: 'night:2', durationMs: 25 * 60 * 1000, dateKey: '2026-10-04', dailyRewardCap: 20
  });
  assert.equal(afterMidnight.focus.rewardCountsByDate['2026-10-03'], 1);
  assert.equal(afterMidnight.focus.rewardCountsByDate['2026-10-04'], 1);
}

{
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'css', 'study-planner.css'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
  assert.match(html, /id="plannerFocusMount"/);
  assert.match(html, /id="plannerCheckinSheet"/);
  assert.match(html, /id="plannerTrendMount"/);
  assert.match(css, /@media \(max-width: 390px\)/);
  assert.match(app, /studyPlanner:\s*\{/);
  assert.match(app, /recordStudyActivityForPlanner/);
  assert.match(app, /dailyRewardCap:\s*20/);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'HTML IDs must remain unique');
  const htmlWithoutComments = html.replace(/<!--[\s\S]*?-->/g, '');
  for (const tag of ['div', 'section', 'details']) {
    const openings = (htmlWithoutComments.match(new RegExp(`<${tag}(?:\\s|>)`, 'g')) || []).length;
    const closings = (htmlWithoutComments.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    assert.equal(openings, closings, `${tag} tags must stay balanced`);
  }
}

console.log('Study Planner, check-in integration, timer persistence, reward cap, and review tests passed.');

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const quizSource = app.slice(app.indexOf('    let activeQuizList = []'), app.indexOf('// 即時計算正確率'));

function createHarness() {
  let now = Date.parse('2026-10-05T12:00:00+08:00');
  let nextId = 0;
  const intervals = new Map(), timeouts = new Map(), elements = new Map(), logs = [];
  function element() {
    const classes = new Set();
    return {
      style: {}, dataset: {}, disabled: false, children: [], innerText: '', textContent: '',
      classList: { add: (...names) => names.forEach(name => classes.add(name)), remove: (...names) => names.forEach(name => classes.delete(name)), contains: name => classes.has(name), toggle(name, force) { const on = force === undefined ? !classes.has(name) : force; on ? classes.add(name) : classes.delete(name); } },
      append(...items) { this.children.push(...items); }, replaceChildren() { this.children = []; },
      querySelector() { this.badge = this.badge || element(); return this.badge; }
    };
  }
  const document = {
    body: element(), getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
    createElement: element, querySelectorAll() { return []; }
  };
  class FakeDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const context = {
    Date: FakeDate, document, console, Math, Map, Set, JSON,
    TOEIC_1000_RAW: Array.from({ length: 40 }, (_, index) => [`official-${index}`, 'n.', `翻譯 ${index}`, '']),
    state: { tickets: 0, scoutPoints: 0, toeic: { vocabList: [{ word: 'custom', meaning: '自訂字' }], wrongAnswers: [], endlessBest: 0 }, dailyQuests: {} },
    setInterval(fn) { const id = ++nextId; intervals.set(id, fn); return id; }, clearInterval: id => intervals.delete(id),
    setTimeout(fn) { const id = ++nextId; timeouts.set(id, fn); return id; }, clearTimeout: id => timeouts.delete(id),
    shuffleVocabItems: items => [...items], escapeHtmlText: String,
    lucide: { createIcons() {} }, playSound() {}, saveGame() {}, renderAll() {}, showToast() {}, addNotification() {}, showRewardModal() {}, checkAndResetDailyQuests() {},
    recordPlannerQuizLog(payload) { logs.push(payload); }
  };
  context.window = context; vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/learning-insights.js'), 'utf8'), context);
  vm.runInContext(quizSource, context);
  const run = source => vm.runInContext(source, context);
  function answer(correct = true) {
    const item = run('activeQuizList[currentQuizStep]');
    context.handleQuizAnswer(element(), encodeURIComponent(correct ? item.meaning : 'wrong'), encodeURIComponent(item.meaning));
  }
  function flush() { const pending = [...timeouts.values()]; timeouts.clear(); pending.forEach(fn => fn()); }
  return { context, run, answer, flush, elements, intervals, timeouts, logs, tick: ms => { now += ms; } };
}

{
  const qa = createHarness(); qa.context.startEndlessVocabChallenge();
  for (let count = 1; count <= 30; count++) {
    qa.tick(100); qa.answer();
    if ([10, 20, 30].includes(count)) assert.equal(qa.context.state.tickets, { 10: 1, 20: 3, 30: 6 }[count]);
    qa.answer();
    assert.equal(qa.context.state.scoutPoints, count, 'Double tap before advancing must not award twice');
    qa.flush();
  }
  qa.answer(false); qa.flush();
  assert.equal(qa.context.state.scoutPoints, 30);
  assert.equal(qa.context.state.tickets, 6);
  assert.equal(qa.context.state.toeic.endlessBest, 30);
  assert.equal(qa.context.state.toeic.quizHistory.at(-1).totalQuestions, 31);
  assert.equal(qa.intervals.size, 0);
  qa.context.finishEndlessChallenge('wrong');
  assert.equal(qa.context.state.toeic.quizHistory.length, 1);
  assert.equal(qa.logs.length, 1);
}
{
  const qa = createHarness(); qa.context.startEndlessVocabChallenge();
  qa.tick(5001); qa.answer(); qa.flush();
  assert.equal(qa.context.state.scoutPoints, 0, 'A correct click after the real deadline must lose');
  assert.equal(qa.context.state.toeic.quizHistory[0].status, 'timeout');
  assert.equal(qa.context.state.toeic.wrongAnswers[0].lastChosen, '逾時');
}
{
  const qa = createHarness(); qa.context.startVocabQuizModal();
  for (let count = 0; count < 10; count++) { qa.answer(); qa.flush(); }
  assert.equal(qa.context.state.tickets, 3, 'Normal quiz reward must remain unchanged');
  assert.equal(qa.context.state.scoutPoints, 20);
  assert.equal(qa.context.state.dailyQuests.quizPerfectToday, true);
  assert.equal(qa.context.VocabLearning.recentAccuracy(), 100);
  qa.context.finishVocabQuiz();
  assert.equal(qa.context.state.tickets, 3);
}
{
  const qa = createHarness();
  qa.context.startVocabQuizModal('targeted', { taskId: 'review-task', items: [{ word: "owner's-custom", meaning: "自訂'翻譯" }] });
  assert.equal(qa.run('activeQuizList.length'), 1);
  assert.equal(qa.run('activeQuizList[0].word'), "owner's-custom");
  qa.answer(); qa.flush();
  assert.equal(qa.logs[0].taskId, 'review-task');
  assert.equal(qa.context.state.toeic.quizHistory[0].taskId, 'review-task');
  const historyCount = qa.context.state.toeic.quizHistory.length;
  qa.context.VocabLearning.recordSession(qa.context.state.toeic.quizHistory[0]);
  assert.equal(qa.context.state.toeic.quizHistory.length, historyCount);
}
{
  const qa = createHarness(); qa.context.startVocabQuizModal(); qa.answer();
  qa.context.closeVocabQuizModal(); qa.flush();
  assert.equal(qa.context.state.tickets, 0);
  assert.equal(qa.context.state.scoutPoints, 0);
  assert.equal(qa.timeouts.size, 0);
  assert.equal(qa.context.state.toeic.quizHistory[0].status, 'quit');
  assert.equal(qa.context.VocabLearning.recentAccuracy(), null);
}
console.log('Quiz execution: 30-level rewards, double taps, deadline expiry, normal rewards, targeted reviews, history deduplication, and quit cleanup passed.');

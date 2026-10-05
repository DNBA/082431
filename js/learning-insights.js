(function (global) {
  'use strict';
  function wordKey(value) { return String(value || '').trim().toLowerCase(); }
  function escape(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
  function history() {
    if (!Array.isArray(state.toeic.quizHistory)) {
      state.toeic.quizHistory = (state.studyPlanner?.logs || []).filter(log => Number(log.totalQuestions) > 0).map(log => ({
        id: `legacy-${log.id}`, mode: log.title?.includes('無盡') ? 'endless' : 'all',
        score: Number(log.score) || 0, totalQuestions: Number(log.totalQuestions) || 0,
        completedAt: log.completedAt, answers: [], status: 'completed'
      })).slice(-100);
    }
    return state.toeic.quizHistory;
  }
  function recentAccuracy() {
    const sessions = history().filter(item => item.mode !== 'endless' && item.status !== 'quit').slice(-10);
    const total = sessions.reduce((sum, item) => sum + (Number(item.totalQuestions) || 0), 0);
    const correct = sessions.reduce((sum, item) => sum + (Number(item.score) || 0), 0);
    return total ? Math.round(correct / total * 100) : null;
  }
  function recordSession(payload) {
    const sessions = history();
    if (!payload?.id || sessions.some(item => item.id === payload.id)) return sessions.find(item => item.id === payload.id);
    const session = {
      id: payload.id, mode: payload.mode || 'all', status: payload.status || 'completed',
      score: Math.max(0, Number(payload.score) || 0), totalQuestions: Math.max(0, Number(payload.totalQuestions) || 0),
      completedAt: payload.completedAt || new Date().toISOString(), taskId: payload.taskId || null,
      actualMinutes: Math.max(0, Number(payload.actualMinutes) || 0),
      answers: (payload.answers || []).map(item => ({
        word: String(item.word || ''), pos: String(item.pos || 'n.'), meaning: String(item.meaning || ''),
        example: String(item.example || ''), chosen: String(item.chosen || ''), correct: !!item.correct
      })).slice(-50)
    };
    sessions.push(session);
    state.toeic.quizHistory = sessions.slice(-100);
    saveGame();
    return session;
  }
  function renderResultActions(mountId, session) {
    const mount = document.getElementById(mountId);
    if (!mount) return;
    mount.replaceChildren();
    mount.classList.toggle('hidden', !session);
    if (!session) return;
    const missed = session.answers.filter(item => !item.correct);
    const note = document.createElement('p');
    note.className = 'learning-note';
    const accuracy = recentAccuracy();
    note.textContent = `最近 10 次一般／複習測驗：${accuracy == null ? '尚無紀錄' : `${accuracy}% 正確率`} · 無盡最高 ${Number(state.toeic.endlessBest) || 0} 關`;
    mount.append(note);
    if (missed.length) {
      const words = document.createElement('p');
      words.className = 'learning-result-words';
      words.textContent = missed.map(item => `${item.word}：${item.chosen || '未作答'} → ${item.meaning}`).join('\n');
      mount.append(words);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'learning-inline-button';
      button.textContent = '明天複習這批錯字';
      button.onclick = () => {
        const task = global.scheduleQuizReviewTask?.(session, 1);
        if (task) { button.textContent = '已排進明天行事曆 ✓'; button.disabled = true; }
      };
      mount.append(button);
    }
    const detail = document.createElement('button');
    detail.type = 'button'; detail.className = 'learning-inline-button'; detail.textContent = '查看學習紀錄';
    detail.onclick = openLearningProgress;
    mount.append(detail);
  }
  function openLearningProgress() {
    const sessions = history();
    const accuracy = recentAccuracy();
    document.getElementById('learningProgressSummary').innerHTML = `<div><small>最近 10 次正確率</small><strong>${accuracy == null ? '—' : `${accuracy}%`}</strong></div><div><small>無盡最高關卡</small><strong>${Number(state.toeic.endlessBest) || 0}</strong></div>`;
    const confused = new Map();
    sessions.forEach(session => session.answers?.filter(item => !item.correct).forEach(item => {
      const key = wordKey(item.word); const record = confused.get(key) || { ...item, count: 0 };
      record.count++; record.chosen = item.chosen; confused.set(key, record);
    }));
    (state.toeic.wrongAnswers || []).forEach(item => {
      const key = wordKey(item.word);
      if (!confused.has(key)) confused.set(key, { ...item, chosen: item.lastChosen, count: item.wrongCount || 1 });
      else confused.get(key).count = Math.max(confused.get(key).count, Number(item.wrongCount) || 1);
    });
    document.getElementById('learningConfusedWords').innerHTML = [...confused.values()].sort((a, b) => b.count - a.count).slice(0, 8).map(item => `<div class="learning-history-row"><span><strong>${escape(item.word)} · ${escape(item.meaning)}</strong><small>曾選「${escape(item.chosen || '未作答')}」</small></span><small>${item.count} 次</small></div>`).join('') || '<p class="learning-note">目前沒有容易混淆的單字。</p>';
    document.getElementById('learningQuizHistory').innerHTML = sessions.slice(-20).reverse().map(item => `<div class="learning-history-row"><span><strong>${item.mode === 'endless' ? '無盡挑戰' : item.mode === 'all' ? '單字測驗' : '單字複習'}${item.status === 'quit' ? ' · 中途退出' : ''}</strong><small>${escape(new Date(item.completedAt).toLocaleString('zh-TW'))}</small></span><strong>${item.score}/${item.totalQuestions}</strong></div>`).join('') || '<p class="learning-note">完成第一次測驗後，紀錄會顯示在這裡。</p>';
    document.getElementById('learningProgressBackdrop').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeLearningProgress() {
    document.getElementById('learningProgressBackdrop')?.classList.add('hidden');
    document.body.style.overflow = '';
  }
  global.VocabLearning = { recordSession, recentAccuracy, renderResultActions, history };
  global.openLearningProgress = openLearningProgress;
  global.closeLearningProgress = closeLearningProgress;
})(window);

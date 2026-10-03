(function (global) {
  'use strict';

  const TYPE_META = Object.freeze({
    study: { icon: '📖', label: '學習' },
    review: { icon: '🔁', label: '複習' },
    homework: { icon: '✏️', label: '作業' },
    test: { icon: '📝', label: '測驗' },
    vocab: { icon: '🔤', label: '單字' },
    phrase: { icon: '💬', label: '片語' }
  });
  const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  let viewMonth = startOfMonth(new Date());
  let selectedDate = dateKey(new Date());
  let activeTaskId = '';
  let reminderTimer = null;

  function plannerState() {
    if (!state.studyPlanner || typeof state.studyPlanner !== 'object') state.studyPlanner = { tasks: [], logs: [] };
    if (!Array.isArray(state.studyPlanner.tasks)) state.studyPlanner.tasks = [];
    if (!Array.isArray(state.studyPlanner.logs)) state.studyPlanner.logs = [];
    if (!Array.isArray(state.studyActivityDates)) state.studyActivityDates = [];
    return state.studyPlanner;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  }

  function localDate(year, month, day) { return new Date(year, month, day, 12, 0, 0, 0); }
  function startOfMonth(value) { return localDate(value.getFullYear(), value.getMonth(), 1); }
  function dateKey(value) {
    const date = value instanceof Date ? value : parseDateKey(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function parseDateKey(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    return match ? localDate(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date();
  }
  function addDays(value, days) {
    const date = parseDateKey(dateKey(value));
    date.setDate(date.getDate() + Number(days || 0));
    return date;
  }
  function makeId(prefix) {
    if (global.crypto?.randomUUID) return `${prefix}_${global.crypto.randomUUID()}`;
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
  function todayKey() { return dateKey(new Date()); }
  function taskType(task) { return TYPE_META[task?.type] || TYPE_META.study; }
  function taskById(id) { return plannerState().tasks.find(task => String(task.id) === String(id)) || null; }
  function tasksOn(date) {
    return plannerState().tasks
      .filter(task => task.date === date)
      .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  }
  function logsOn(date) {
    return plannerState().logs
      .filter(log => log.date === date)
      .sort((a, b) => String(a.completedAt || '').localeCompare(String(b.completedAt || '')));
  }

  function normalizeLegacyStudyDate(value) {
    const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(value || ''));
    if (!match) return '';
    return `${match[1]}-${String(Number(match[2])).padStart(2, '0')}-${String(Number(match[3])).padStart(2, '0')}`;
  }

  function legacyStudyDetailOn(date) {
    const details = state.studyDetails && typeof state.studyDetails === 'object' ? state.studyDetails : {};
    if (details[date]) return details[date];
    const matchingKey = Object.keys(details).find(key => normalizeLegacyStudyDate(key) === date);
    return matchingKey ? details[matchingKey] : null;
  }

  function legacyStudyLoggedOn(date) {
    return (state.studyLogs || []).some(value => normalizeLegacyStudyDate(value) === date) || !!legacyStudyDetailOn(date);
  }

  function normalizeTask(raw) {
    const type = TYPE_META[raw?.type] ? raw.type : 'study';
    return {
      id: String(raw?.id || makeId('task')),
      title: String(raw?.title || '').trim(),
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(raw?.date || '')) ? raw.date : todayKey(),
      time: /^\d{2}:\d{2}$/.test(String(raw?.time || '')) ? raw.time : '16:00',
      plannedMinutes: Math.max(1, Math.min(480, Number(raw?.plannedMinutes) || 30)),
      type,
      reminderMinutes: [-1, 0, 5, 10, 30, 60].includes(Number(raw?.reminderMinutes)) ? Number(raw.reminderMinutes) : -1,
      note: String(raw?.note || '').trim(),
      completed: !!raw?.completed,
      completedAt: raw?.completedAt || null,
      sourceType: ['manual', 'vocab', 'phrase', 'review'].includes(raw?.sourceType) ? raw.sourceType : 'manual',
      sourceIds: Array.isArray(raw?.sourceIds) ? [...raw.sourceIds] : [],
      createdAt: raw?.createdAt || new Date().toISOString(),
      updatedAt: raw?.updatedAt || new Date().toISOString(),
      remindedAt: raw?.remindedAt || null
    };
  }

  function normalizePlannerData() {
    const planner = plannerState();
    planner.tasks = planner.tasks.map(normalizeTask).filter(task => task.title);
    planner.logs = planner.logs.filter(log => log && typeof log === 'object' && log.date);
    const legacyDates = (state.studyLogs || []).map(normalizeLegacyStudyDate).filter(Boolean);
    state.studyActivityDates = [...new Set([
      ...state.studyActivityDates.filter(value => /^\d{4}-\d{2}-\d{2}$/.test(String(value))),
      ...legacyDates
    ])].sort();
    updateStudyStreak();
  }

  function updateStudyStreak() {
    const dates = new Set(state.studyActivityDates || []);
    const today = parseDateKey(todayKey());
    const latestActivityDate = dates.has(dateKey(today)) ? today : addDays(today, -1);
    let cursor = latestActivityDate;
    let count = 0;
    while (dates.has(dateKey(cursor))) {
      count += 1;
      cursor = addDays(cursor, -1);
    }
    state.studyStreak = count;
    state.studyStreakLastDate = count ? dateKey(latestActivityDate) : '';
    return count;
  }

  function recordStudyActivity(date = todayKey()) {
    plannerState();
    if (!state.studyActivityDates.includes(date)) state.studyActivityDates.push(date);
    state.studyActivityDates = [...new Set(state.studyActivityDates)].sort();
    updateStudyStreak();
    if (typeof saveGame === 'function') saveGame();
    renderStudyPlanner();
  }

  function dailyQuestRows() {
    if (typeof checkAndResetDailyQuests === 'function') checkAndResetDailyQuests();
    const daily = state.dailyQuests || {};
    return [
      { label: `新增 10 個單字（${Math.min(10, Number(daily.wordAddedToday) || 0)}/10）`, done: Number(daily.wordAddedToday) >= 10 },
      { label: '單字測驗滿分', done: !!daily.quizPerfectToday },
      { label: '完成 1 次 Focus / Pomodoro', done: Number(daily.pomodoroDoneToday) >= 1 }
    ];
  }

  function renderCalendar() {
    const title = document.getElementById('plannerMonthTitle');
    const grid = document.getElementById('plannerCalendarGrid');
    if (!title || !grid) return;
    title.textContent = `${MONTHS[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;
    const firstWeekday = viewMonth.getDay();
    const gridStart = localDate(viewMonth.getFullYear(), viewMonth.getMonth(), 1 - firstWeekday);
    const today = todayKey();
    const activityDates = new Set(state.studyActivityDates || []);
    const legacyLoggedDates = new Set((state.studyLogs || []).map(normalizeLegacyStudyDate).filter(Boolean));
    const dailyRows = dailyQuestRows();

    grid.innerHTML = Array.from({ length: 42 }, (_, index) => {
      const day = addDays(gridStart, index);
      const key = dateKey(day);
      const tasks = tasksOn(key);
      const logs = logsOn(key);
      const completedPlans = tasks.filter(task => task.completed).length;
      const hasLearning = completedPlans > 0 || logs.length > 0 || activityDates.has(key) || legacyLoggedDates.has(key);
      const todayDailyComplete = key === today && dailyRows.length > 0 && dailyRows.every(row => row.done);
      const hasCompletionSet = tasks.length > 0 || (key === today && dailyRows.length > 0);
      const allComplete = hasCompletionSet && completedPlans === tasks.length && (key !== today || todayDailyComplete);
      const dots = Math.min(3, tasks.filter(task => !task.completed).length);
      const classes = [
        'planner-date',
        day.getMonth() !== viewMonth.getMonth() ? 'is-outside' : '',
        key === today ? 'is-today' : '',
        key === selectedDate ? 'is-selected' : '',
        allComplete ? 'is-all-complete' : ''
      ].filter(Boolean).join(' ');
      return `<button type="button" class="${classes}" data-date="${key}" onclick="selectPlannerDate('${key}')" role="gridcell" aria-label="${key}${tasks.length ? `，${tasks.length} 個行程` : ''}">
        <span class="planner-date-number">${day.getDate()}</span>
        ${hasLearning ? '<span class="planner-date-status" aria-label="有完成學習">✓</span>' : ''}
        <span class="planner-date-dots" aria-hidden="true">${Array.from({ length: dots }, () => '<i></i>').join('')}</span>
      </button>`;
    }).join('');
  }

  function selectedDateHeading(date) {
    const value = parseDateKey(date);
    if (date === todayKey()) return `TODAY · ${MONTHS[value.getMonth()].slice(0, 3)} ${value.getDate()}`;
    return `${WEEKDAYS[value.getDay()]} · ${MONTHS[value.getMonth()].slice(0, 3)} ${value.getDate()}`;
  }

  function renderSelectedDay() {
    const tasks = tasksOn(selectedDate);
    const logs = logsOn(selectedDate);
    const legacyDetail = legacyStudyDetailOn(selectedDate);
    const legacyLogged = legacyStudyLoggedOn(selectedDate);
    const isToday = selectedDate === todayKey();
    const questSection = document.getElementById('plannerDailyQuestSection');
    const questList = document.getElementById('plannerDailyQuestList');
    const rows = isToday ? dailyQuestRows() : [];
    const completedTasks = tasks.filter(task => task.completed).length;
    const completedQuests = rows.filter(row => row.done).length;
    const totalItems = rows.length + tasks.length;
    const completedItems = completedQuests + completedTasks;
    const totalMinutes = logs.reduce((sum, log) => sum + Math.max(0, Number(log.actualMinutes) || 0), 0);

    document.getElementById('plannerSelectedDateTitle').textContent = selectedDateHeading(selectedDate);
    document.getElementById('plannerStudyStreak').textContent = `🔥 ${state.studyStreak || 0} DAY STUDY STREAK`;
    document.getElementById('plannerTodayCount').textContent = `${completedItems} / ${totalItems || rows.length}`;
    questSection?.classList.toggle('hidden', !isToday);
    if (questList) questList.innerHTML = rows.map(row => `<div class="planner-quest-row"><span class="planner-check">${row.done ? '✓' : '○'}</span><span>${escapeHtml(row.label)}</span></div>`).join('');

    document.getElementById('plannerPlanCount').textContent = `${tasks.length} PLAN${tasks.length === 1 ? '' : 'S'}`;
    const taskList = document.getElementById('plannerTaskList');
    if (taskList) {
      taskList.innerHTML = tasks.length ? tasks.map(task => {
        const meta = taskType(task);
        return `<button type="button" class="planner-task-row ${task.completed ? 'is-complete' : ''}" onclick="openPlannerTaskDetail('${escapeHtml(task.id)}')">
          <time>${escapeHtml(task.time || '--:--')}</time><span>${meta.icon}</span>
          <span class="planner-task-copy"><strong>${escapeHtml(task.title)}</strong><small>${meta.label} · ${task.plannedMinutes} MIN</small></span>
          <span class="planner-check">${task.completed ? '✓' : '›'}</span>
        </button>`;
      }).join('') : '<p class="planner-empty">這天還沒有安排。按右下角 ＋ 新增。</p>';
    }

    document.getElementById('plannerLogTotal').textContent = `${totalMinutes} MIN`;
    const logList = document.getElementById('plannerLogList');
    if (logList) {
      const logRows = logs.map(log => {
        const suffix = log.score != null ? `${log.score}/${log.totalQuestions}` : `${Math.max(0, Number(log.actualMinutes) || 0)} MIN`;
        return `<div class="planner-log-row"><span>✓ ${escapeHtml(log.title || '學習紀錄')}</span><strong>${escapeHtml(suffix)}</strong></div>`;
      });
      if (legacyLogged) {
        const legacyScore = Number(legacyDetail?.totalScore) || Number(legacyDetail?.score) || 0;
        logRows.push(`<div class="planner-log-row"><span>✓ ${escapeHtml(legacyDetail?.quizName || '多益實戰打卡')}</span><strong>${legacyScore ? `${legacyScore} PTS` : 'CHECK-IN'}</strong></div>`);
      }
      logList.innerHTML = logRows.length ? logRows.join('') : '<p class="planner-empty">尚無實際學習紀錄。</p>';
    }

    const toeicStatus = document.getElementById('plannerToeicStatus');
    const toeicRecord = document.getElementById('plannerToeicRecord');
    const checkinButton = document.getElementById('plannerOpenCheckinBtn');
    if (toeicStatus) toeicStatus.textContent = legacyLogged ? '已登錄 ✓' : '尚未登錄';
    if (toeicRecord) {
      if (legacyDetail) {
        const listening = `${Number(legacyDetail.lCorrect) || 0}/${Number(legacyDetail.lTotal) || 0}`;
        const reading = `${Number(legacyDetail.rCorrect) || 0}/${Number(legacyDetail.rTotal) || 0}`;
        const score = Number(legacyDetail.totalScore) || Number(legacyDetail.score) || 0;
        toeicRecord.innerHTML = `<strong>${escapeHtml(legacyDetail.quizName || '多益日常練習')}</strong><span>${score ? `${score} 分 · ` : ''}聽力 ${listening} · 閱讀 ${reading}</span>`;
      } else {
        toeicRecord.innerHTML = '<span>這天還沒有多益實戰明細。</span>';
      }
    }
    if (checkinButton) {
      const canEdit = selectedDate === todayKey() || !!state.isAdmin;
      checkinButton.classList.toggle('hidden', !canEdit || (legacyLogged && !state.isAdmin));
      checkinButton.textContent = legacyLogged
        ? '編輯實戰明細'
        : `登錄${selectedDate === todayKey() ? '今日' : selectedDate}實戰 · ${state.isAdmin ? 'ADMIN' : '+1 🎟️'}`;
    }

    const complete = document.getElementById('plannerTodayComplete');
    const allPlansDone = tasks.length > 0 && completedTasks === tasks.length;
    const allDailyDone = !isToday || rows.every(row => row.done);
    complete?.classList.toggle('hidden', !(allPlansDone && allDailyDone));
    const completeMeta = document.getElementById('plannerTodayCompleteMeta');
    if (completeMeta) completeMeta.textContent = `${completedTasks} / ${tasks.length} PLANS FINISHED · ${totalMinutes} MIN FOCUSED`;
  }

  function renderStudyPlanner() {
    normalizePlannerData();
    renderCalendar();
    renderSelectedDay();
  }

  function selectPlannerDate(date) {
    selectedDate = date;
    const parsed = parseDateKey(date);
    if (parsed.getMonth() !== viewMonth.getMonth() || parsed.getFullYear() !== viewMonth.getFullYear()) viewMonth = startOfMonth(parsed);
    renderStudyPlanner();
  }

  function changePlannerMonth(delta) {
    viewMonth = localDate(viewMonth.getFullYear(), viewMonth.getMonth() + Number(delta || 0), 1);
    renderStudyPlanner();
  }

  function goPlannerToday() {
    selectedDate = todayKey();
    viewMonth = startOfMonth(new Date());
    renderStudyPlanner();
  }

  function showSheet(sheetId) {
    const backdrop = document.getElementById('plannerSheetBackdrop');
    if (!backdrop) return;
    backdrop.classList.remove('hidden');
    ['plannerTaskSheet', 'plannerDetailSheet', 'plannerReviewSheet', 'plannerCheckinSheet'].forEach(id => document.getElementById(id)?.classList.toggle('hidden', id !== sheetId));
    document.body.style.overflow = 'hidden';
  }

  function closePlannerSheets() {
    document.getElementById('plannerSheetBackdrop')?.classList.add('hidden');
    ['plannerTaskSheet', 'plannerDetailSheet', 'plannerReviewSheet', 'plannerCheckinSheet'].forEach(id => document.getElementById(id)?.classList.add('hidden'));
    document.body.style.overflow = '';
  }

  function openPlannerTaskSheet(taskId = '') {
    const task = taskId ? taskById(taskId) : null;
    activeTaskId = task?.id || '';
    document.getElementById('plannerTaskSheetTitle').textContent = task ? '編輯行程' : '新增行程';
    document.getElementById('plannerTaskId').value = task?.id || '';
    document.getElementById('plannerTaskTitle').value = task?.title || '';
    document.getElementById('plannerTaskDate').value = task?.date || selectedDate;
    document.getElementById('plannerTaskTime').value = task?.time || '16:00';
    document.getElementById('plannerTaskMinutes').value = task?.plannedMinutes || 30;
    document.getElementById('plannerTaskType').value = task?.type || 'study';
    document.getElementById('plannerTaskReminder').value = String(task?.reminderMinutes ?? -1);
    document.getElementById('plannerTaskNote').value = task?.note || '';
    showSheet('plannerTaskSheet');
    setTimeout(() => document.getElementById('plannerTaskTitle')?.focus(), 100);
  }

  async function requestPlannerNotificationPermission() {
    if (!('Notification' in global) || Notification.permission !== 'default') return;
    try { await Notification.requestPermission(); } catch (error) { console.warn('Planner notification permission unavailable:', error); }
  }

  function savePlannerTask(event) {
    event?.preventDefault();
    const planner = plannerState();
    const id = document.getElementById('plannerTaskId').value;
    const existing = id ? taskById(id) : null;
    const task = normalizeTask({
      ...(existing || {}),
      id: existing?.id || makeId('task'),
      title: document.getElementById('plannerTaskTitle').value,
      date: document.getElementById('plannerTaskDate').value,
      time: document.getElementById('plannerTaskTime').value,
      plannedMinutes: document.getElementById('plannerTaskMinutes').value,
      type: document.getElementById('plannerTaskType').value,
      reminderMinutes: document.getElementById('plannerTaskReminder').value,
      note: document.getElementById('plannerTaskNote').value,
      sourceType: existing?.sourceType || 'manual',
      sourceIds: existing?.sourceIds || [],
      updatedAt: new Date().toISOString(),
      remindedAt: null
    });
    if (!task.title) return;
    if (existing) Object.assign(existing, task);
    else planner.tasks.push(task);
    selectedDate = task.date;
    viewMonth = startOfMonth(parseDateKey(task.date));
    if (task.reminderMinutes >= 0) requestPlannerNotificationPermission();
    saveGame();
    closePlannerSheets();
    renderStudyPlanner();
    if (typeof showToast === 'function') showToast(existing ? '行程已更新' : '行程已新增', 'success');
  }

  function openPlannerTaskDetail(taskId) {
    const task = taskById(taskId);
    if (!task) return;
    activeTaskId = task.id;
    const meta = taskType(task);
    document.getElementById('plannerDetailType').textContent = `${meta.icon} ${meta.label}${task.completed ? ' · COMPLETED ✓' : ''}`;
    document.getElementById('plannerDetailTitle').textContent = task.title;
    document.getElementById('plannerDetailWhen').textContent = `${task.date === todayKey() ? '今天' : task.date} ${task.time}`;
    document.getElementById('plannerDetailMinutes').textContent = `預計 ${task.plannedMinutes} MIN`;
    const note = document.getElementById('plannerDetailNote');
    note.textContent = task.note || '';
    note.classList.toggle('hidden', !task.note);
    const focusButton = document.getElementById('plannerStartFocusBtn');
    focusButton.disabled = task.completed;
    focusButton.classList.toggle('hidden', task.completed);
    focusButton.onclick = () => startPlannerTaskFocus(task.id);
    document.getElementById('plannerEditBtn').onclick = () => openPlannerTaskSheet(task.id);
    document.getElementById('plannerCompleteBtn').onclick = () => completePlannerTask(task.id, { actualMinutes: 0, method: 'manual' });
    document.getElementById('plannerCompleteBtn').disabled = task.completed;
    document.getElementById('plannerCompleteBtn').textContent = task.completed ? '已完成' : '完成';
    document.getElementById('plannerReviewBtn').onclick = () => openPlannerReviewSheet(task.id);
    document.getElementById('plannerDeleteBtn').onclick = () => deletePlannerTask(task.id);
    showSheet('plannerDetailSheet');
  }

  function startPlannerTaskFocus(taskId) {
    const task = taskById(taskId);
    if (!task || task.completed) return;
    if (typeof global.startFocusModeFromPlanner !== 'function') {
      if (typeof showToast === 'function') showToast('專注計時器尚未準備完成，請重新開啟頁面。', 'warning');
      return;
    }
    closePlannerSheets();
    global.startFocusModeFromPlanner(task.id, task.title, task.plannedMinutes, task.type);
  }

  function addLogForTask(task, actualMinutes, completedAt) {
    const planner = plannerState();
    const existing = planner.logs.find(log => log.taskId === task.id);
    const completionDate = new Date(completedAt || Date.now());
    const log = {
      id: existing?.id || makeId('log'),
      taskId: task.id,
      title: task.title,
      type: task.type,
      date: Number.isFinite(completionDate.getTime()) ? dateKey(completionDate) : todayKey(),
      plannedMinutes: task.plannedMinutes,
      actualMinutes: Math.max(0, Math.round(Number(actualMinutes) || 0)),
      completedAt: completedAt || new Date().toISOString(),
      sourceType: task.sourceType,
      sourceIds: [...task.sourceIds]
    };
    if (existing) Object.assign(existing, log);
    else planner.logs.push(log);
  }

  function completePlannerTask(taskId, options = {}) {
    const task = taskById(taskId);
    if (!task || task.completed) return false;
    const completedAt = options.completedAt || new Date().toISOString();
    const completionDate = new Date(completedAt);
    const activityDate = Number.isFinite(completionDate.getTime()) ? dateKey(completionDate) : todayKey();
    task.completed = true;
    task.completedAt = completedAt;
    task.updatedAt = completedAt;
    addLogForTask(task, options.actualMinutes, completedAt);
    recordStudyActivity(activityDate);
    saveGame();
    closePlannerSheets();
    renderStudyPlanner();
    if (typeof showToast === 'function') showToast(`✓ 已完成「${task.title}」`, 'success');
    if (task.type === 'review' && options.offerReview !== false) setTimeout(() => openPlannerReviewSheet(task.id), 180);
    return true;
  }

  async function deletePlannerTask(taskId) {
    const task = taskById(taskId);
    if (!task) return;
    const confirmed = typeof showGameConfirm === 'function' ? await showGameConfirm({
      title: '刪除行程', message: `確定刪除「${task.title}」嗎？已留下的 Study Log 不會刪除。`, confirmText: '刪除', cancelText: '取消', type: 'danger'
    }) : global.confirm(`確定刪除「${task.title}」嗎？`);
    if (!confirmed) return;
    state.studyPlanner.tasks = plannerState().tasks.filter(item => item.id !== task.id);
    saveGame();
    closePlannerSheets();
    renderStudyPlanner();
  }

  function openPlannerReviewSheet(taskId) {
    const task = taskById(taskId);
    if (!task) return;
    activeTaskId = task.id;
    document.getElementById('plannerReviewCustomDate').value = dateKey(addDays(todayKey(), 7));
    showSheet('plannerReviewSheet');
  }

  function openPlannerCheckinSheet() {
    const isToday = selectedDate === todayKey();
    if (!isToday && !state.isAdmin) return;
    const detail = legacyStudyDetailOn(selectedDate) || {};
    const logged = legacyStudyLoggedOn(selectedDate);
    const setValue = (id, value) => {
      const input = document.getElementById(id);
      if (input) input.value = value ?? '';
    };
    setValue('inputQuizName', detail.quizName || '');
    setValue('inputTotalScore', detail.totalScore || detail.score || '');
    setValue('inputListenTotal', detail.lTotal ?? '');
    setValue('inputListenCorrect', detail.lCorrect ?? '');
    setValue('inputReadTotal', detail.rTotal ?? '');
    setValue('inputReadCorrect', detail.rCorrect ?? '');
    setValue('adminDateInput', selectedDate);
    const title = document.getElementById('plannerCheckinTitle');
    if (title) title.textContent = `${selectedDate} · 多益實戰明細`;
    const status = document.getElementById('todayStudyStatus');
    if (status) status.textContent = logged ? '✅ 已完成紀錄' : '⏳ 尚未登錄';
    const button = document.getElementById('checkInBtn');
    if (button) {
      button.disabled = logged && !state.isAdmin;
      button.textContent = logged && !state.isAdmin ? '✓ 今日已打卡保存' : (state.isAdmin && logged ? '更新實戰明細' : '保存紀錄並打卡 (+1 🎟️)');
    }
    if (typeof global.calculateStudyRates === 'function') global.calculateStudyRates();
    showSheet('plannerCheckinSheet');
  }

  function schedulePlannerReview(days) {
    const original = taskById(activeTaskId);
    if (!original) return;
    const custom = document.getElementById('plannerReviewCustomDate')?.value;
    const nextDate = days === 'custom' ? custom : dateKey(addDays(original.completedAt ? new Date(original.completedAt) : todayKey(), Number(days)));
    if (!nextDate) return;
    const next = normalizeTask({
      id: makeId('task'),
      title: original.title,
      date: nextDate,
      time: original.time,
      plannedMinutes: original.plannedMinutes,
      type: 'review',
      reminderMinutes: original.reminderMinutes,
      note: original.note,
      sourceType: 'review',
      sourceIds: [original.id]
    });
    plannerState().tasks.push(next);
    selectedDate = nextDate;
    viewMonth = startOfMonth(parseDateKey(nextDate));
    saveGame();
    closePlannerSheets();
    renderStudyPlanner();
    if (typeof showToast === 'function') showToast(`已安排 ${nextDate} 再次複習`, 'success');
  }

  function completeStudyPlannerTaskFromFocus(payload) {
    if (!payload?.taskId) return false;
    return completePlannerTask(payload.taskId, {
      actualMinutes: payload.actualMinutes,
      completedAt: payload.completedAt
    });
  }

  function recordStudyPlannerTaskProgressFromFocus(payload) {
    if (!payload?.taskId) return false;
    const task = taskById(payload.taskId);
    const actualMinutes = Math.max(0, Math.round(Number(payload.actualMinutes) || 0));
    if (!task || task.completed || actualMinutes < 1) return false;
    const completedAt = payload.completedAt || new Date().toISOString();
    const completionDate = new Date(completedAt);
    addLogForTask(task, actualMinutes, completedAt);
    recordStudyActivity(Number.isFinite(completionDate.getTime()) ? dateKey(completionDate) : todayKey());
    saveGame();
    renderStudyPlanner();
    return true;
  }

  function recordPlannerFocusLog(payload = {}) {
    const minutes = Math.max(0, Math.round(Number(payload.actualMinutes) || 0));
    if (minutes <= 0) return;
    const completedAt = payload.completedAt || new Date().toISOString();
    plannerState().logs.push({
      id: makeId('log'), taskId: null, title: payload.title || '專注學習', type: payload.type || 'study',
      date: payload.date || dateKey(new Date(completedAt)), plannedMinutes: Number(payload.plannedMinutes) || minutes,
      actualMinutes: minutes, completedAt, sourceType: 'manual', sourceIds: []
    });
    recordStudyActivity(payload.date || dateKey(new Date(completedAt)));
    saveGame();
  }

  function recordPlannerQuizLog(payload = {}) {
    const completedAt = new Date().toISOString();
    const date = todayKey();
    plannerState().logs.push({
      id: makeId('log'), taskId: payload.taskId || null, title: payload.title || '單字 Quiz', type: payload.type || 'vocab',
      date, plannedMinutes: 0, actualMinutes: Math.max(0, Number(payload.actualMinutes) || 0), completedAt,
      score: Number(payload.score) || 0, totalQuestions: Number(payload.totalQuestions) || 0,
      sourceType: payload.sourceType || 'vocab', sourceIds: Array.isArray(payload.sourceIds) ? payload.sourceIds : []
    });
    recordStudyActivity(date);
    saveGame();
  }

  function plannerTaskStartAt(task) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(task.date);
    const time = /^(\d{2}):(\d{2})$/.exec(task.time || '00:00');
    if (!match || !time) return NaN;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(time[1]), Number(time[2]), 0, 0).getTime();
  }

  function notifyPlannerTask(task) {
    const meta = taskType(task);
    const message = `${meta.icon} ${task.time} ${task.title}`;
    if (typeof showToast === 'function') showToast(`行程提醒：${message}`, 'info');
    if ('Notification' in global && Notification.permission === 'granted' && !document.hidden) {
      try { new Notification('ToeicQuest Study Planner', { body: message, tag: `planner-${task.id}` }); } catch (error) { console.warn('Planner notification unavailable:', error); }
    }
  }

  function checkPlannerReminders(now = Date.now()) {
    let changed = false;
    plannerState().tasks.forEach(task => {
      if (task.completed || task.remindedAt || Number(task.reminderMinutes) < 0) return;
      const remindAt = plannerTaskStartAt(task) - Number(task.reminderMinutes) * 60000;
      if (!Number.isFinite(remindAt) || now < remindAt || now > plannerTaskStartAt(task) + 5 * 60000) return;
      task.remindedAt = new Date(now).toISOString();
      notifyPlannerTask(task);
      changed = true;
    });
    if (changed) saveGame();
  }

  function initPlanner() {
    const moveInto = (elementId, mountId) => {
      const element = document.getElementById(elementId);
      const mount = document.getElementById(mountId);
      if (element && mount && element.parentElement !== mount) mount.appendChild(element);
    };
    moveInto('plannerFocusCard', 'plannerFocusMount');
    moveInto('legacyStudyEntry', 'plannerCheckinMount');
    moveInto('legacyScoreTrend', 'plannerTrendMount');
    document.getElementById('legacyStudyTracker')?.classList.add('hidden');
    normalizePlannerData();
    renderStudyPlanner();
    checkPlannerReminders();
    if (reminderTimer) clearInterval(reminderTimer);
    reminderTimer = setInterval(checkPlannerReminders, 30000);
  }

  global.renderStudyPlanner = renderStudyPlanner;
  global.selectPlannerDate = selectPlannerDate;
  global.changePlannerMonth = changePlannerMonth;
  global.goPlannerToday = goPlannerToday;
  global.openPlannerTaskSheet = openPlannerTaskSheet;
  global.savePlannerTask = savePlannerTask;
  global.openPlannerTaskDetail = openPlannerTaskDetail;
  global.closePlannerSheets = closePlannerSheets;
  global.completePlannerTask = completePlannerTask;
  global.openPlannerReviewSheet = openPlannerReviewSheet;
  global.openPlannerCheckinSheet = openPlannerCheckinSheet;
  global.schedulePlannerReview = schedulePlannerReview;
  global.completeStudyPlannerTaskFromFocus = completeStudyPlannerTaskFromFocus;
  global.recordStudyPlannerTaskProgressFromFocus = recordStudyPlannerTaskProgressFromFocus;
  global.recordPlannerFocusLog = recordPlannerFocusLog;
  global.recordPlannerQuizLog = recordPlannerQuizLog;
  global.recordStudyActivityForPlanner = recordStudyActivity;
  global.StudyPlanner = { normalizeTask, dateKey, buildTask: normalizeTask, tasksOn, logsOn, updateStudyStreak };

  document.addEventListener('visibilitychange', () => { if (!document.hidden) { checkPlannerReminders(); renderStudyPlanner(); } });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPlanner, { once: true });
  else initPlanner();
})(window);

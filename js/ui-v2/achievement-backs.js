(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ToeicQuestAchievementBacks = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const LEGACY_COUNT_KEYS = Object.freeze({
    champion: 'rings',
    fmvp: 'fmvps',
    mvp: 'mvps',
    dpoy: 'dpoys',
    record: 'records'
  });

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getHonorCount(card, backId, owned) {
    const legacyKey = LEGACY_COUNT_KEYS[backId];
    const legacyCount = legacyKey ? Math.max(0, Number(card?.legacy?.[legacyKey]) || 0) : 0;
    const historyCount = Array.isArray(owned?.honors) ? owned.honors.length : 0;
    if (backId === 'legend') return owned ? Math.max(1, historyCount) : 0;
    return Math.max(owned ? 1 : 0, legacyCount, historyCount);
  }

  function getUpgrade(backId, count) {
    const safeCount = Math.max(0, Number(count) || 0);
    if (safeCount >= 5) {
      return {
        tier: 'mythic',
        label: backId === 'mvp' ? 'ALL-TIME GREAT' : (backId === 'champion' ? 'DYNASTY' : 'LEGENDARY'),
        marks: 3
      };
    }
    if (safeCount >= 3) {
      return {
        tier: 'elite',
        label: backId === 'mvp' ? 'TRIPLE CROWN' : (backId === 'champion' ? 'THREE-RING CLUB' : 'ELITE'),
        marks: 3
      };
    }
    return { tier: 'base', label: '', marks: safeCount > 0 ? 1 : 0 };
  }

  function normalizeCardId(card) {
    return String(card?.cardId ?? card?.id ?? card?.name ?? 'unknown-card');
  }

  function buildModel(card, back, owned, active) {
    const count = getHonorCount(card, back.id, owned);
    const upgrade = getUpgrade(back.id, count);
    const detail = owned?.detail || back.hint || '尚未解鎖';
    return {
      id: back.id,
      name: back.name,
      zh: back.zh || '',
      art: back.art,
      hint: back.hint || '',
      cardId: normalizeCardId(card),
      playerName: card?.name || 'UNKNOWN PLAYER',
      owned: Boolean(owned),
      active: Boolean(active),
      count,
      detail,
      unlockedAt: owned?.unlockedAt || '',
      tier: upgrade.tier,
      upgradeLabel: upgrade.label,
      upgradeMarks: upgrade.marks
    };
  }

  function marksMarkup(model) {
    if (!model.owned || model.upgradeMarks <= 0) return '';
    return `<span class="tq-achievement-back__marks" aria-hidden="true">${'◆'.repeat(model.upgradeMarks)}</span>`;
  }

  function cardMarkup(model, options = {}) {
    const preview = Boolean(options.preview);
    const classes = [
      'tq-achievement-back',
      `tq-achievement-back--${model.id}`,
      `is-${model.tier}`,
      model.owned ? 'is-owned' : 'is-locked',
      model.active ? 'is-active' : '',
      preview ? 'tq-achievement-back--preview' : ''
    ].filter(Boolean).join(' ');
    const count = model.owned && model.count > 0
      ? `<span class="tq-achievement-back__count">×${model.count}</span>`
      : '<span class="tq-achievement-back__lock" aria-hidden="true">⌁</span>';
    const upgrade = model.upgradeLabel
      ? `<span class="tq-achievement-back__upgrade">${escapeHtml(model.upgradeLabel)}</span>`
      : '';
    const imageAttr = preview
      ? `src="${escapeHtml(model.art)}"`
      : `data-src="${escapeHtml(model.art)}"`;
    const body = `
      <span class="tq-achievement-back__art-wrap" aria-hidden="true">
        <img ${imageAttr} alt="" class="tq-achievement-back__art" decoding="async">
      </span>
      <span class="tq-achievement-back__shade" aria-hidden="true"></span>
      ${marksMarkup(model)}
      ${count}
      ${upgrade}
      <span class="tq-achievement-back__plaque">
        <strong>${escapeHtml(model.name)}</strong>
        <small>${escapeHtml(model.zh)}</small>
      </span>
      <span class="tq-achievement-back__player">${escapeHtml(model.playerName)}</span>
      <img class="tq-achievement-back__nba" src="./assets/cards/backs/nba-logo.svg" alt="NBA" decoding="async">
      ${model.active ? '<span class="tq-achievement-back__equipped">使用中</span>' : ''}
    `;
    if (preview) return `<div class="${classes}">${body}</div>`;
    return `<button type="button" class="${classes}" data-card-id="${escapeHtml(model.cardId)}" data-back-id="${escapeHtml(model.id)}" onclick="openAchievementBackPreview(this)" aria-label="${escapeHtml(model.name)}${model.owned ? '，已解鎖' : '，尚未解鎖'}">${body}</button>`;
  }

  function renderGrid(card, backs) {
    const ownedBacks = Array.isArray(card?.achievementBacks) ? card.achievementBacks : [];
    return (backs || []).map(back => {
      const owned = ownedBacks.find(item => item?.id === back.id);
      return cardMarkup(buildModel(card, back, owned, card?.activeCardBack === back.id));
    }).join('');
  }

  function summary(card, backs) {
    const ownedBacks = Array.isArray(card?.achievementBacks) ? card.achievementBacks : [];
    const active = (backs || []).find(back => back.id === card?.activeCardBack && ownedBacks.some(item => item?.id === back.id));
    return {
      owned: (backs || []).filter(back => ownedBacks.some(item => item?.id === back.id)).length,
      total: (backs || []).length,
      activeName: active?.name || '尚未裝備'
    };
  }

  function hydrateImages(scope) {
    if (!scope?.querySelectorAll) return;
    scope.querySelectorAll('img[data-src]').forEach(image => {
      image.src = image.dataset.src;
      image.removeAttribute('data-src');
    });
  }

  function formatUnlockedAt(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
  }

  function ensurePreviewModal() {
    if (typeof document === 'undefined') return null;
    let modal = document.getElementById('tqAchievementBackPreview');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'tqAchievementBackPreview';
    modal.className = 'tq-achievement-preview hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', '成就卡背預覽');
    modal.innerHTML = `
      <button type="button" class="tq-achievement-preview__backdrop" aria-label="關閉卡背預覽"></button>
      <section class="tq-achievement-preview__sheet">
        <button type="button" class="tq-achievement-preview__close" aria-label="關閉">×</button>
        <div class="tq-achievement-preview__stage" id="tqAchievementPreviewStage"></div>
        <div class="tq-achievement-preview__copy">
          <span id="tqAchievementPreviewEyebrow"></span>
          <h3 id="tqAchievementPreviewTitle"></h3>
          <p id="tqAchievementPreviewDetail"></p>
          <small id="tqAchievementPreviewDate"></small>
        </div>
        <button type="button" id="tqAchievementPreviewAction" class="tq-achievement-preview__action"></button>
      </section>`;
    modal.querySelector('.tq-achievement-preview__backdrop').addEventListener('click', closePreview);
    modal.querySelector('.tq-achievement-preview__close').addEventListener('click', closePreview);
    document.body.appendChild(modal);
    return modal;
  }

  function openPreview(card, back, owned, active) {
    const modal = ensurePreviewModal();
    if (!modal || !card || !back) return;
    const model = buildModel(card, back, owned, active);
    modal.dataset.cardId = model.cardId;
    modal.dataset.backId = model.id;
    modal.querySelector('#tqAchievementPreviewStage').innerHTML = cardMarkup(model, { preview: true });
    modal.querySelector('#tqAchievementPreviewEyebrow').textContent = model.owned
      ? `${model.name} · ${model.count > 0 ? `×${model.count}` : '已解鎖'}`
      : 'LOCKED ACHIEVEMENT';
    modal.querySelector('#tqAchievementPreviewTitle').textContent = model.playerName;
    modal.querySelector('#tqAchievementPreviewDetail').textContent = model.detail;
    modal.querySelector('#tqAchievementPreviewDate').textContent = model.owned
      ? (formatUnlockedAt(model.unlockedAt) || '歷史榮譽')
      : model.hint;
    const action = modal.querySelector('#tqAchievementPreviewAction');
    action.disabled = !model.owned || model.active;
    action.textContent = model.active ? '目前使用中' : (model.owned ? '設為展示卡背' : '尚未解鎖');
    action.onclick = model.owned && !model.active
      ? function () {
          if (typeof window.selectAchievementBack === 'function') {
            window.selectAchievementBack(modal.dataset.cardId, modal.dataset.backId);
          }
        }
      : null;
    modal.classList.remove('hidden');
    document.body.classList.add('tq-achievement-preview-open');
  }

  function closePreview() {
    if (typeof document === 'undefined') return;
    document.getElementById('tqAchievementBackPreview')?.classList.add('hidden');
    document.body.classList.remove('tq-achievement-preview-open');
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closePreview();
    });
  }

  return Object.freeze({
    escapeHtml,
    getHonorCount,
    getUpgrade,
    buildModel,
    cardMarkup,
    renderGrid,
    summary,
    hydrateImages,
    openPreview,
    closePreview
  });
});

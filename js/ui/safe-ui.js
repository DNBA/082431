/* 共用安全輸出與外部套件保護 */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function refreshIcons() {
  if (!window.lucide || typeof window.lucide.createIcons !== 'function') return false;
  try {
    window.lucide.createIcons();
    return true;
  } catch (error) {
    console.warn('Lucide icons failed to render:', error);
    return false;
  }
}

function launchConfetti(options = {}) {
  if (typeof window.confetti !== 'function') return false;
  try {
    window.confetti(options);
    return true;
  } catch (error) {
    console.warn('Confetti effect failed:', error);
    return false;
  }
}

window.addEventListener('load', () => {
  const missing = [];
  if (!window.lucide) missing.push('圖示');
  if (typeof window.confetti !== 'function') missing.push('慶祝特效');
  if (missing.length && typeof showToast === 'function') {
    showToast(`部分網路資源未載入：${missing.join('、')}。核心遊戲仍可繼續使用。`, 'warning', 5000);
  }
  refreshIcons();
});

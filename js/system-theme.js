(function () {
  'use strict';

  const query = window.matchMedia('(prefers-color-scheme: dark)');
  const appleStatusMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');

  function syncSystemTheme(event) {
    const isDark = typeof event?.matches === 'boolean' ? event.matches : query.matches;
    document.documentElement.dataset.systemTheme = isDark ? 'dark' : 'light';
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    if (appleStatusMeta) appleStatusMeta.setAttribute('content', isDark ? 'black-translucent' : 'default');
  }

  syncSystemTheme(query);
  if (typeof query.addEventListener === 'function') query.addEventListener('change', syncSystemTheme);
  else if (typeof query.addListener === 'function') query.addListener(syncSystemTheme);
})();

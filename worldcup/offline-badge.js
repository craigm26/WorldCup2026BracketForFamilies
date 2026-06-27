/* Kid-friendly offline indicator. Plain JS (no React/Babel) so it works on every
   app and shows instantly. A big friendly pill drops in when the internet drops,
   and a green "back online" pill confirms reconnection, then fades. Apps can fire
   window.dispatchEvent(new CustomEvent('app-syncing')) to flash "catching up…".

   Per-app copy override (optional), set BEFORE this script:
     window.OFFLINE_MSGS = { offline:"…", online:"…", syncing:"…" }; */
(function () {
  var M = Object.assign({
    offline: '📴 No Wi-Fi — keep playing! Everything saves on this device.',
    online: '✅ Back online!',
    syncing: '🔄 Back online — catching up…',
  }, window.OFFLINE_MSGS || {});

  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function () {
    var css = document.createElement('style');
    css.textContent =
      '.netbadge{position:fixed;left:50%;transform:translateX(-50%) translateY(-140%);' +
      'top:calc(8px + env(safe-area-inset-top));z-index:10000;max-width:92vw;' +
      'display:flex;align-items:center;gap:8px;padding:11px 16px;border-radius:16px;' +
      'font-family:inherit;font-weight:700;font-size:15px;line-height:1.3;color:#fff;' +
      'box-shadow:0 8px 24px rgba(0,0,0,.32);transition:transform .35s ease,opacity .35s ease;opacity:0;' +
      'text-align:center;pointer-events:none}' +
      '.netbadge.show{transform:translateX(-50%) translateY(0);opacity:1}' +
      '.netbadge.off{background:#e8893a}' +     // amber = offline (calm, not alarming)
      '.netbadge.on{background:#34c77b}' +       // green = back online
      '@media(prefers-reduced-motion:reduce){.netbadge{transition:opacity .2s}}';
    document.head.appendChild(css);

    var el = document.createElement('div');
    el.className = 'netbadge';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);

    var hideTimer = null;
    function show(kind, text, autoHideMs) {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      el.textContent = text;
      el.className = 'netbadge ' + (kind === 'off' ? 'off' : 'on') + ' show';
      if (autoHideMs) hideTimer = setTimeout(function () { el.classList.remove('show'); }, autoHideMs);
    }
    function hide() { if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; } el.classList.remove('show'); }

    function goOffline() { show('off', M.offline, 0); }       // stays until back online
    function goOnline() { show('on', M.online, 3500); }

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    // App can announce it's refetching after reconnect.
    window.addEventListener('app-syncing', function () { if (navigator.onLine) show('on', M.syncing, 2500); });

    // If we boot already offline, tell the kids right away.
    if (navigator.onLine === false) goOffline();
  });
})();

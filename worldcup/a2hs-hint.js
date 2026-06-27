/* "Add to Home Screen" hint for iPad/iPhone Safari. Plain JS (no React/Babel) so it
   shows instantly. Self-contained; dismissible; never shows when already installed
   (standalone) or once dismissed. */
(function () {
  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function () {
    var ua = navigator.userAgent || '';
    var isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var standalone = navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    var KEY = 'wc26-a2hs-dismissed', dismissed;
    try { dismissed = localStorage.getItem(KEY) === '1'; } catch (e) { dismissed = false; }
    if (!isIOS || standalone || dismissed) return;

    var css = document.createElement('style');
    css.textContent =
      '.a2hs{position:fixed;left:0;right:0;bottom:0;z-index:9000;' +
      'padding:12px 14px calc(12px + env(safe-area-inset-bottom));background:rgba(21,50,127,.97);color:#fff;' +
      'font-family:inherit;display:flex;align-items:center;gap:12px;box-shadow:0 -6px 22px rgba(0,0,0,.32);animation:a2hsUp .35s ease}' +
      '@keyframes a2hsUp{from{transform:translateY(110%)}to{transform:translateY(0)}}' +
      '@media(prefers-reduced-motion:reduce){.a2hs{animation:none}}' +
      '.a2hs-tx{flex:1;font-size:15px;line-height:1.4;font-weight:600}' +
      '.a2hs-tx .sh{font-weight:800;color:#f4b740}' +
      '.a2hs-x{flex:none;border:none;background:rgba(255,255,255,.18);color:#fff;width:34px;height:34px;border-radius:10px;font-size:18px;font-weight:800;cursor:pointer}';
    document.head.appendChild(css);

    var bar = document.createElement('div');
    bar.className = 'a2hs';
    bar.setAttribute('role', 'note');
    bar.innerHTML = '<div class="a2hs-tx">Get the World Cup Hub on your home screen — works even with no Wi-Fi! Tap <span class="sh">Share ⮫</span> then <span class="sh">Add to Home Screen</span>.</div>' +
      '<button class="a2hs-x" aria-label="Close">×</button>';
    document.body.appendChild(bar);
    bar.querySelector('.a2hs-x').addEventListener('click', function () { try { localStorage.setItem(KEY, '1'); } catch (e) {} bar.remove(); });
  });
})();

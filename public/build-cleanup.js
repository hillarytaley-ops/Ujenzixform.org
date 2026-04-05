/**
 * Runs before the app bundle. Kept external so Content-Security-Policy can omit
 * unsafe-inline for HTML (GA still injects inline scripts from the app — see cspHeaders).
 */
(function () {
  var BUILD = 'v123-vercel-assets-spa-fallback';
  var KEY = 'ujenzi_build';
  var last = localStorage.getItem(KEY);
  if (last === BUILD) {
    console.log('🚀 UjenziXform BUILD:', BUILD);
    return;
  }
  localStorage.setItem(KEY, BUILD);
  if (last) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        regs.forEach(function (r) {
          r.unregister();
        });
      });
    }
    if ('caches' in window) {
      caches.keys().then(function (names) {
        names.forEach(function (n) {
          caches.delete(n);
        });
      });
    }
    var url = new URL(window.location.href);
    url.searchParams.set('_cb', Date.now());
    window.location.replace(url.toString());
    return;
  }
  console.log('🚀 UjenziXform BUILD:', BUILD);
})();

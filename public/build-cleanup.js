/**
 * Runs before the app bundle. Kept external so Content-Security-Policy can omit
 * unsafe-inline for HTML (GA still injects inline scripts from the app — see cspHeaders).
 *
 * BUILD id comes from <meta name="ujenzi-asset-build-id"> (injected per deploy in production).
 * When it changes after a new deploy, we unregister SW + clear caches + reload so dynamic
 * import chunks (e.g. ProfessionalBuilderDashboard-*.js) are not 404 from stale cached HTML/JS.
 */
(function () {
  var meta = document.querySelector('meta[name="ujenzi-asset-build-id"]');
  var BUILD =
    (meta && meta.getAttribute('content') && String(meta.getAttribute('content')).trim()) ||
    'dev-local';
  if (BUILD === '%UJENZI_ASSET_BUILD_ID%') BUILD = 'dev-local';
  var KEY = 'ujenzi_build';
  var last = localStorage.getItem(KEY);
  if (last === BUILD) {
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
})();

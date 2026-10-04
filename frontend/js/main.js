(function () {
  'use strict';
  var App = window.App;
  var S = window.YPDC.state;
  App.state = window.YPDC.state;
  App.actions = window.YPDC.actions;
  App.route = function () { return App.parseHash(); };
  App.version = '1.0.0';

  function boot() {
    if (App.installImageFallback) App.installImageFallback();
    if (App.bindChrome) App.bindChrome();
    App.bindGlobal();
    App.render();

    var api = window.YPDC.api;
    if (!api) return;
    api.detect().then(function (ok) {
      if (!ok) { console.info('[YPDC] backend not found — offline mode (public website only).'); return; }
      console.info('[YPDC] backend online — data is served from SQLite.');
      document.documentElement.setAttribute('data-backend', 'on');

      var setCount = function (c) {
        if (!c || !window.YPDC.state.inductionDrive) return;
        if (window.YPDC.state.inductionDrive.received === c.applications) return;
        window.YPDC.state.inductionDrive.received = c.applications;
        Array.prototype.forEach.call(document.querySelectorAll('[data-live="induction"]'), function (el) {
          el.setAttribute('data-count', c.applications);
          el.setAttribute('data-pad', 1);
          el.textContent = c.applications;
        });
      };
      setCount(api.counts);

      return api.me().then(function (r) {
        if (!r.user) {
          if (!api.publicSite) { console.info('[YPDC] publicSite API not available — older server.'); return; }
          return api.publicSite().then(function (p) {
            if (!p || !p.content) return;
            window.YPDC.loadPublic(p.content);
            App.state = window.YPDC.state;
            App.render();
            console.info('[YPDC] guest mode — website content loaded from the server (' + Object.keys(p.content).length + ' collections).');
          }).catch(function (e) { console.warn('[YPDC] public content:', e.message); });
        }
        return api.loadState().then(function (cols) {
          window.YPDC.loadFromServer(cols);
          App.state = window.YPDC.state;
          S.session = {
            role: r.user.role.charAt(0).toUpperCase() + r.user.role.slice(1),
            email: r.user.email, name: r.user.name, id: r.user.id, api: true
          };
          App.render();
        });
      });
    }).catch(function (e) { console.warn('[YPDC] boot sync:', e.message); });
  }
  console.log('%c YPDC UON · build R38.2 (3 Oct 2026) ', 'background:#0B4A24;color:#D8F2E2;padding:2px 6px;border-radius:3px');
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

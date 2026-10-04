(function () {
  'use strict';
  var App = window.App;
  var S = window.YPDC.state;
  var A = window.YPDC.actions;
  var $ = App.$, $$ = App.$$, esc = App.esc, img = App.img,
      I = App.Icons, fmtDate = App.fmtDate, initials = App.initials,
      money = App.money, slugTitle = App.slugTitle, roleTitle = App.roleTitle;

  function publicHeader() { return App.publicHeader.apply(null, arguments); }
  function footer() { return App.footer.apply(null, arguments); }
  function loginPage() { return App.loginPage.apply(null, arguments); }
  function toast() { return App.toast.apply(null, arguments); }
  var Public = App.Public || (App.Public = {});
  var routes = {
    '': Public.home, '/': Public.home, 'about': Public.about, 'directorates': Public.directorates,
    'cabinet': Public.cabinet, 'highlights': Public.highlights, 'events': Public.events, 'news': Public.news,
    'achievements': Public.achievements, 'membership': Public.membership, 'feedback': Public.feedback,
    'contact': Public.contact, 'induction': Public.induction, 'shaheen': Public.shaheen, 'teams': Public.teams
  };

  function parseHash() {
    var h = location.hash.replace(/^#\/?/, '');
    var qs = {};
    var qi = h.indexOf('?');
    if (qi > -1) { h.slice(qi + 1).split('&').forEach(function (kv) { var p = kv.split('='); qs[p[0]] = decodeURIComponent(p[1] || ''); }); h = h.slice(0, qi); }
    return { parts: h.split('/').filter(Boolean), qs: qs };
  }

  var lastLoad = 0;
  var lastShaheen = 0;
  function fetchShaheenPublic() {
    var api = window.YPDC.api;
    if (!api || !api.available) return;
    if (Date.now() - lastShaheen < 20000) return;
    lastShaheen = Date.now();
    api.shaheenInfo().then(function (info) {
      if (!info) return;
      S.shaheen = S.shaheen || {};
      S.shaheen.open = info.open;
      S.shaheen.batch = info.batch || S.shaheen.batch;
      S.shaheen.seats = info.seats || S.shaheen.seats;
      S.shaheen.message = info.message || S.shaheen.message;
      S.shaheen.registered = info.registered;
      render();
    }).catch(function () {});
  }
  function refreshFromServer() {
    var api = window.YPDC.api;
    if (!api || !api.available || !S.session || !S.session.api) return;
    if (Date.now() - lastLoad < 15000) return;
    if (api.lastSave && Date.now() - api.lastSave.getTime() < 5000) return;
    lastLoad = Date.now();
    api.loadState().then(function (cols) {
      window.YPDC.loadFromServer(cols);
      render();
    }).catch(function () {});
  }

  function render() {
    var r = parseHash(), parts = r.parts, app = $('#app');
    var page = parts[0] || '';

    if (page === 'shaheen') fetchShaheenPublic();

    if (page === 'login') {
      if (r.qs.role === 'admin') { location.hash = '#/admin'; return; }
      if (r.qs.role === 'directorate') { location.hash = '#/directorate'; return; }
      app.innerHTML = loginPage(r.qs.role); window.scrollTo(0, 0); updateTitle('Portal Login'); return;
    }

    if (page === 'admin') {
      if (S.session && S.session.role === 'Admin') { location.hash = '#/portal/admin/dashboard'; return; }
      app.innerHTML = window.App.adminLoginPage();
      window.scrollTo(0, 0); updateTitle('Administrator Access');
      return;
    }

    if (page === 'directorate') {
      if (S.session && S.session.role === 'Directorate') { location.hash = '#/portal/directorate/dashboard'; return; }
      app.innerHTML = window.App.directorateLoginPage();
      window.scrollTo(0, 0); updateTitle('Directorate Sign In');
      return;
    }

    if (page === 'forgot') {
      app.innerHTML = window.App.forgotPage();
      window.scrollTo(0, 0); updateTitle('Forgot password');
      return;
    }

    if (page === 'reset') {
      app.innerHTML = window.App.resetPage(r.qs.token || '');
      window.scrollTo(0, 0); updateTitle('Reset password');
      return;
    }

    if (page === 'portal') {
      var wantRole = String(parts[1] || '').toLowerCase();
      if (!S.session && wantRole === 'guest') {
        app.innerHTML = window.Portal.shell('guest', parts[2] || 'dashboard');
        window.scrollTo(0, 0);
        updateTitle('Guest / Public Portal · ' + slugTitle(parts[2] || 'dashboard'));
        return;
      }
      if (!S.session) { location.hash = '#/login'; return; }
      var role = S.session.role.toLowerCase();
      if (!window.Portal.has(role)) role = (parts[1] && window.Portal.has(parts[1])) ? parts[1] : 'student';
      var section = parts[2] || 'dashboard';
      page = 'portal';
      app.innerHTML = window.Portal.shell(role, section);
      window.scrollTo(0, 0);
      updateTitle(slugTitle(role) + ' Portal · ' + slugTitle(section));
      refreshFromServer();
      if (S.session && window.YPDC.api && window.YPDC.api.available && !window.YPDC.api.notifLoaded) {
        window.App.loadServerNotifs().then(function () { if (window.App.refreshUnreadBadge) window.App.refreshUnreadBadge(); });
      }
      if (role === 'admin' && (section === 'shaheen' || section === 'dashboard')) {
        var shState = window.App.shaheenState;
        if (shState && !shState.data && !shState.loading) {
          window.App.shaheenLoad().then(function (d) { if (d) render(); });
        }
      }
      return;
    }

    app.innerHTML = publicHeader(navLabelFor(page)) + '<main id="main">' + publicBody(page, r) + '</main>' + footer();
    if (App.bindChrome) App.bindChrome();
    if (location.hash.indexOf('#section-') === 0) { /* anchor jump handled by the browser */ }
    window.scrollTo(0, 0);
    updateTitle(navLabelFor(page) || 'Home');
  }

  function publicBody(page, r) {
    if (page === 'event') return Public.eventDetail(r.parts[1]);
    if (page === 'events' && r.qs.cat) return Public.events(r.qs.cat);
    var fn = routes[page];
    return fn ? fn() : Public.home();
  }
  function navLabelFor(page) {
    var map = { '': 'Home', 'about': 'About', 'directorates': 'Directorates', 'events': 'Events', 'news': 'News', 'achievements': 'Achievements', 'membership': 'Membership', 'contact': 'Contact', 'feedback': 'Feedback', 'cabinet': 'Home', 'highlights': 'Home', 'induction': 'Membership', 'event': 'Events', 'shaheen': 'Bano Shaheen', 'teams': 'Teams', 'forgot': 'Forgot password', 'reset': 'Reset password', 'directorate': 'Directorate Sign In', 'login': 'Portal Login', 'admin': 'Administrator' };
    return map[page] !== undefined ? map[page] : 'Home';
  }
  function updateTitle(t) { document.title = 'YPDC UON · ' + t; }

  window.addEventListener('hashchange', render);

  App.render = render;
  App.parseHash = parseHash;
  window.PublicPages = Public;
  App.publicBody = publicBody;
  App.navLabelFor = navLabelFor;
})();

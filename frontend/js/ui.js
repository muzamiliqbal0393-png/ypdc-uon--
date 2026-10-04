(function () {
  'use strict';
  var App = window.App;
  var S = window.YPDC.state;
  var A = window.YPDC.actions;
  var $ = App.$, $$ = App.$$, esc = App.esc, img = App.img,
      I = App.Icons, fmtDate = App.fmtDate, initials = App.initials,
      money = App.money, slugTitle = App.slugTitle, roleTitle = App.roleTitle;
  function toast(msg, gold) {
    var wrap = $('#toasts') || (function () {
      var w = document.createElement('div'); w.id = 'toasts'; w.className = 'toast-wrap';
      document.body.appendChild(w); return w;
    })();
    var t = document.createElement('div');
    t.className = 'toast' + (gold ? ' gold' : '');
    t.innerHTML = (gold ? '' : I.check) + '<span>' + esc(msg) + '</span>';
    wrap.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; }, 2600);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3000);
  }

  function ensureDrawer() {
    if ($('#notif-drawer')) return;
    var mask = document.createElement('div'); mask.className = 'drawer-mask'; mask.id = 'drawer-mask';
    var d = document.createElement('aside'); d.className = 'drawer'; d.id = 'notif-drawer';
    document.body.appendChild(mask); document.body.appendChild(d);
    mask.addEventListener('click', closeDrawer);
  }
  var SERVER_CATS = ['all', 'announcement', 'application', 'event', 'account', 'system'];
  var srvFilter = 'all';

  function srvLoaded() {
    var api = window.YPDC.api;
    return !!(api && api.available && api.notifLoaded);
  }

  function srvNotifList() {
    var api = window.YPDC.api;
    var list = (api && api.notifCache) || [];
    if (srvFilter !== 'all') list = list.filter(function (n) { return n.category === srvFilter; });
    return list;
  }

  function notifCard(n, server) {
    var who = server ? (n.category || 'system') : n.group;
    var when = server ? App.fmtDate(n.at) + ' · ' + (n.at || '').slice(11, 16) + ' UTC' : n.time;
    var read = server ? n.read : n.read;
    return '<div class="notif' + (read ? '' : ' unread') + '">' +
      '<div class="ico">' + esc(String(n.title || n.text || '?').charAt(0).toUpperCase()) + '</div>' +
      '<div style="flex:1"><b>' + esc(n.title || n.text) + '</b>' +
      (n.body || n.meta ? '<small>' + esc(n.body || n.meta) + '</small>' : '') +
      '<div class="mut" style="font-size:.72rem;margin-top:4px">' + esc(when) + ' · ' + esc(who) + '</div>' +
      (n.link ? '<a class="mut" style="font-size:.76rem" href="' + esc(n.link) + '" data-action="close-drawer">Open →</a>' : '') +
      '</div>' +
      (read ? '' : '<button class="btn btn-xs btn-quiet" data-action="' + (server ? 'read-notif-srv" data-nid="' + esc(n.id) : 'read-notif" data-id="' + esc(n.id)) + '">Read</button>') +
      (server ? '<button class="btn btn-xs btn-quiet" data-action="del-notif-srv" data-nid="' + esc(n.id) + '" title="Delete">' + I.x + '</button>' : '') +
      '</div>';
  }

  function serverNotifList() {
    var api = window.YPDC.api;
    if (!api || !api.available) return '';
    if (!srvLoaded()) return '<div class="search-empty">Loading your notifications…</div>';
    var list = srvNotifList();
    if (!list.length) return '<div class="search-empty">' + (srvFilter === 'all' ? 'Nothing here yet — announcements, application updates and event reminders land in this list.' : 'No ' + srvFilter + ' notifications.') + '</div>';
    return list.map(function (n) { return notifCard(n, true); }).join('');
  }

  function openDrawer() {
    ensureDrawer();
    var api = window.YPDC.api;
    var live = !!(api && api.available);
    var d = $('#notif-drawer');
    var srvUnread = live ? (api.notifUnread || 0) : 0;
    var localUnread = unreadCount();
    d.innerHTML =
      '<div class="drawer-head"><div><span class="eyebrow">Stay updated</span><h3 style="margin-top:6px">Notifications</h3></div>' +
      '<button class="x-btn" data-action="close-drawer" aria-label="Close">' + I.x + '</button></div>' +
      '<div class="drawer-body">' +
      (live
        ? '<div class="chip-row mb-16">' + SERVER_CATS.map(function (c) {
            return '<button class="chip' + (srvFilter === c ? ' active' : '') + '" data-action="filter-srv" data-cat="' + c + '">' + (c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)) + '</button>';
          }).join('') + '</div>' +
          '<div id="notif-list">' + serverNotifList() + '</div>'
        : '<div id="notif-list">' + notifList() + '</div>') +
      (localUnread ? '<div class="panel-note mt-16">This session · ' + localUnread + ' update' + (localUnread > 1 ? 's' : '') + '</div>' + notifList() : '') +
      '</div>' +
      '<div class="drawer-foot flex-between"><span class="mut" style="font-size:.84rem">' + (srvUnread + localUnread) + ' unread</span>' +
      '<button class="btn btn-green btn-sm" data-action="' + (live ? 'read-all-srv' : 'read-all') + '">Mark all as read</button></div>';
    $('#drawer-mask').classList.add('open'); d.classList.add('open');
  }

  function closeDrawer() {
    var d = $('#notif-drawer'); if (!d) return;
    d.classList.remove('open'); $('#drawer-mask').classList.remove('open');
  }
  function unreadCount() { return S.notifications.filter(function (n) { return !n.read; }).length; }
  function notifList(group) {
    var list = S.notifications.filter(function (n) { return !group || n.group === group; });
    if (!list.length) return '<div class="search-empty">No notifications in this category.</div>';
    return list.map(function (n) {
      return '<div class="notif' + (n.read ? '' : ' unread') + '">' +
        '<div class="ico">' + esc(n.type.charAt(0)) + '</div>' +
        '<div style="flex:1"><b>' + esc(n.text) + '</b><small>' + esc(n.meta) + '</small>' +
        '<div class="mut" style="font-size:.72rem;margin-top:4px">' + esc(n.time) + ' · ' + esc(n.group) + '</div></div>' +
        (n.read ? '' : '<button class="btn btn-xs btn-quiet" data-action="read-notif" data-id="' + n.id + '">Read</button>') +
        '</div>';
    }).join('');
  }

  function loadServerNotifs() {
    var api = window.YPDC.api;
    if (!api || !api.available) return Promise.resolve(null);
    return api.notifications(60).then(function (r) {
      api.notifCache = r.notifications || [];
      api.notifLoaded = true;
      return r;
    }).catch(function () { api.notifLoaded = true; api.notifCache = []; return null; });
  }

  function openModal(opts) {
    var mask = $('#modal-mask');
    if (!mask) {
      mask = document.createElement('div'); mask.className = 'modal-mask'; mask.id = 'modal-mask';
      mask.innerHTML = '<div class="modal" id="modal-box"></div>';
      document.body.appendChild(mask);
      mask.addEventListener('click', function (e) { if (e.target === mask) closeModal(); });
    }
    $('#modal-box').innerHTML =
      '<div class="modal-head"><div>' + (opts.eyebrow ? '<span class="eyebrow">' + esc(opts.eyebrow) + '</span>' : '') +
      '<h3 style="margin-top:6px">' + esc(opts.title) + '</h3>' + (opts.sub ? '<p class="mut" style="font-size:.88rem;margin-top:6px">' + esc(opts.sub) + '</p>' : '') +
      '</div><button class="x-btn" data-action="close-modal">' + I.x + '</button></div>' +
      '<div class="modal-body">' + opts.body + '</div>' +
      (opts.foot ? '<div class="modal-foot">' + opts.foot + '</div>' : '');
    mask.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    var mask = $('#modal-mask'); if (!mask) return;
    mask.classList.remove('open'); document.body.style.overflow = '';
    var box = $('#modal-box');
    if (box) setTimeout(function () { if (!$('#modal-mask').classList.contains('open')) box.innerHTML = ''; }, 240);
  }

  function searchIndex() {
    var idx = [];
    S.people.forEach(function (p) {
      idx.push({ type: 'Member / User', title: p.name, sub: p.type + ' · ' + p.directorate, go: '#/portal/admin/people' });
    });
    S.events.forEach(function (e) {
      idx.push({ type: 'Event', title: e.title, sub: fmtDate(e.date) + (e.location || e.venue ? ' · ' + (e.location || e.venue) : ''), go: '#/event/' + e.id });
    });
    S.directorates.forEach(function (d) {
      idx.push({ type: 'Directorate', title: d.name, sub: d.members + ' members · ' + d.status, go: '#/directorates' });
    });
    S.tasks.forEach(function (t) { idx.push({ type: 'Task', title: t.title, sub: t.status + ' · due ' + fmtDate(t.due), go: '#/portal/member/tasks' }); });
    S.applications.forEach(function (a) { idx.push({ type: 'Application', title: a.name, sub: a.program + ' · ' + a.status, go: '#/portal/admin/applications' }); });
    S.news.forEach(function (n) { idx.push({ type: 'News', title: n.title, sub: fmtDate(n.date), go: '#/news' }); });
    S.certificates.forEach(function (c) { idx.push({ type: 'Certificate', title: c.title, sub: c.event + ' · ' + c.status, go: '#/portal/student/certificates' }); });
    S.highlights.forEach(function (h) { idx.push({ type: 'Highlight', title: h.title, sub: h.type + ' · ' + h.status, go: '#/highlights' }); });
    return idx;
  }
  function runSearch(q) {
    q = (q || '').trim().toLowerCase();
    if (!q) return [];
    return searchIndex().filter(function (r) {
      return (r.title + ' ' + r.sub + ' ' + r.type).toLowerCase().indexOf(q) > -1;
    }).slice(0, 12);
  }
  function searchBoxHTML(id, ph) {
    return '<div class="search-shell" data-search="' + id + '">' +
      '<div class="search-box">' + I.search +
      '<input type="search" placeholder="' + esc(ph || 'Search users, members, events...') + '" aria-label="Search" data-search-input>' +
      '<button type="button" class="search-clear" data-action="search-clear" aria-label="Clear search">' + I.x + '</button></div>' +
      '<div class="search-results hide" data-search-results></div></div>';
  }

  function searchLoading() {
    return '<div class="search-group"><div class="search-loading"><span class="spin-dot"></span>Searching the database…</div></div>';
  }

  function searchGrouped(groups, q) {
    if (!groups || !groups.length) {
      return '<div class="search-empty">No results for “' + esc(q) + '”.<div class="mut mt-6" style="font-size:.8rem">Try a name, an event, a directorate or a status instead.</div></div>';
    }
    return groups.map(function (g) {
      return '<div class="search-group"><h5>' + esc(g.label) + '<span class="mut" style="font-weight:400"> · ' + g.items.length + '</span></h5>' +
        g.items.map(function (x) {
          return '<div class="res" data-action="goto" data-go="' + esc(x.link) + '">' +
            '<span class="av" style="width:34px;height:34px;flex:0 0 34px;border-radius:10px;background:var(--green-800);color:var(--gold);display:grid;place-items:center;font-size:.7rem;font-weight:700">' + esc(String(x.type || '?').slice(0, 2).toUpperCase()) + '</span>' +
            '<div><b style="font-size:.9rem">' + esc(x.title) + '</b><small>' + esc(x.sub || x.type) + '</small></div></div>';
        }).join('') + '</div>';
    }).join('');
  }

  App.toast = toast;
  App.ensureDrawer = ensureDrawer;
  App.openDrawer = openDrawer;
  App.loadServerNotifs = loadServerNotifs;
  App.srvFilterSet = function (c) { srvFilter = c; };
  App.serverNotifCard = serverNotifList;
  App.closeDrawer = closeDrawer;
  App.unreadCount = unreadCount;
  App.notifList = notifList;
  App.openModal = openModal;
  App.closeModal = closeModal;
  App.searchIndex = searchIndex;
  App.runSearch = runSearch;
  App.searchBoxHTML = searchBoxHTML;
  App.searchLoading = searchLoading;
  App.searchGrouped = searchGrouped;
})();

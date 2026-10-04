(function () {
  'use strict';
  var PC = window.PC;
  var S = PC.S, A = PC.A, esc = PC.esc, fmt = PC.fmt, I = PC.I, img = PC.img, ini = PC.ini, PP = PC.PP;
  var NAV = PC.NAV, HERO = PC.HERO, QUICK = PC.QUICK, SEC = PC.SEC;
  var heroBlock = PC.heroBlock, stats = PC.stats, quickAccess = PC.quickAccess,
      focusPanel = PC.focusPanel, pageHead = PC.pageHead, table = PC.table,
      statusBadge = PC.statusBadge, pretty = PC.pretty, profileForm = PC.profileForm,
      taskRow = PC.taskRow;
  function shell(role, section) {
    var nav = (NAV[role] || NAV.student).slice();
    if (!SEC[role]) role = 'student';
    var anon = !S.session;
    if (!anon && !nav.some(function (n) { return n[0] === 'messages'; })) nav.push(['messages', 'Messages']);
    var secFn = section === 'messages' && window.PC.MSG ? window.PC.MSG.section : SEC[role][section];
    if (!secFn) { section = 'dashboard'; secFn = SEC[role].dashboard; }
    var p = S.profiles[role] || {};
    var api = window.YPDC.api;
    var unread = S.notifications.filter(function (n) { return !n.read; }).length + ((api && api.available) ? (api.msgUnread || 0) + (api.notifUnread || 0) : 0);
    var roleLabel = { student: 'VOLUNTEER PORTAL', member: 'GENERAL MEMBER PORTAL', directorate: 'DIRECTORATE PORTAL', faculty: 'FACULTY PORTAL', admin: 'ADMIN PORTAL', alumni: 'ALUMNI PORTAL', guest: 'GUEST / PUBLIC' }[role];

    return '<div class="portal">' +
      '<div class="drawer-mask" id="side-mask" data-action="toggle-sidebar"></div>' +
      '<aside class="side" id="portal-side">' +
      '<div class="side-brand">' + window.App.logoBlock() + '</div>' +
      '<div class="side-role"><small>' + esc(roleLabel) + '</small><b>' + esc(p.name || role) + '</b></div>' +
      '<nav class="side-nav">' + nav.map(function (n) {
        var badge = (n[0] === 'messages' && api && api.available && api.msgUnread)
          ? '<span class="dot-count" style="position:static;margin-left:8px">' + api.msgUnread + '</span>' : '';
        return '<a href="#/portal/' + role + '/' + n[0] + '" class="' + (n[0] === section ? 'active' : '') + '">' +
          '<span class="ico">' + (n[0] === section ? '●' : '○') + '</span>' + esc(n[1]) + badge + '</a>';
      }).join('') + '</nav>' +
      '<div class="side-foot">' +
      '<a href="#/">← Public website</a>' +
      '<a href="#/portal/' + role + '/feedback" style="display:block;margin-top:8px">Feedback / Comments</a>' +
      (anon ? '<a class="btn btn-gold btn-sm btn-block mt-16" href="#/login">Portal login</a>'
            : '<button class="btn btn-gold btn-sm btn-block mt-16" data-action="logout">Sign out</button>') +
      '</div></aside>' +
      '<div class="pmain">' +
      '<header class="ptop">' +
      '<button class="header-icon" data-action="toggle-sidebar" title="Menu">' + I.menu + '</button>' +
      '<a class="ptop-link" href="#/feedback">Feedback / Comments</a>' +
      searchBoxHTML('portal-search', 'Search users, members, events...') +
      '<span class="ptop-univ">&middot; ' + esc(p.university || 'University of Narowal') + '</span>' +
      '<button class="header-icon" data-action="open-notifs" title="Notifications">' + I.bell + (unread ? '<span class="dot-count">' + unread + '</span>' : '') + '</button>' +
      '<div class="user-chip"><span class="avatar-gold">' + ini(p.name || role) + '</span>' +
      '<span class="user-meta"><b>' + esc(p.name || role) + '</b><small>' + esc(roleLabelTitle(role)) + '</small></span></div>' +
      '</header>' +
      '<div class="pbody">' + secFn() + '</div>' +
      '</div></div>';
  }

  function roleLabelTitle(role) {
    return ({ student: 'Volunteer', member: 'General Member', directorate: 'Directorate', faculty: 'Faculty',
      admin: 'Admin', alumni: 'Alumni', guest: 'Guest' })[role] || 'YPDC';
  }

  function searchBoxHTML(id, ph) {
    return '<div class="search-shell" data-search="' + id + '">' +
      '<div class="search-box">' + I.search + '<input type="search" placeholder="' + esc(ph) + '" data-search-input aria-label="Search">' +
      '<button type="button" class="search-clear" data-action="search-clear" aria-label="Clear search">' + I.x + '</button></div>' +
      '<div class="search-results hide" data-search-results></div></div>';
  }

  window.Portal = {
    has: function (role) { return !!SEC[role]; },
    shell: shell,
    currentRole: (S.session && S.session.role.toLowerCase()) || 'student',
    nav: NAV
  };

  window.Portal.roleLabelTitle = roleLabelTitle;
  window.Portal.searchBoxHTML = searchBoxHTML;
  window.Portal.navFor = function (role) { return NAV[role] || []; };
})();

(function () {
  'use strict';
  var PC = window.PC;
  var S = PC.S, A = PC.A, esc = PC.esc, fmt = PC.fmt, I = PC.I, img = PC.img, ini = PC.ini, PP = PC.PP;
  var NAV = PC.NAV, HERO = PC.HERO, QUICK = PC.QUICK, SEC = PC.SEC;
  var heroBlock = PC.heroBlock, stats = PC.stats, quickAccess = PC.quickAccess,
      focusPanel = PC.focusPanel, pageHead = PC.pageHead, table = PC.table,
      statusBadge = PC.statusBadge, pretty = PC.pretty, profileForm = PC.profileForm,
      taskRow = PC.taskRow;
  var SRV = { loading: true, data: null, error: null, audit: [], log: null, logLoaded: false, logLoading: false, logError: null, perm: null, permLoading: false, permError: null, mail: null, mailLoaded: false, mailError: null, ann: null, annLoaded: false, annError: null,
    logQ: { q: '', role: '', action: '', status: '', from: '', to: '', page: 1, perPage: 25 },
    usersQ: { q: '', role: '', state: '', page: 1, perPage: 15 }, usersData: null, usersLoading: false, usersError: null, userOpen: null,
    charts: null, chartsLoading: false, chartsError: null, chartsMonths: 6 };

  function serverStats() {
    var d = SRV.data;
    if (!d) return null;
    return [
      { label: 'Accounts', value: String(d.users.total), sub: d.users.active + ' active accounts' },
      { label: 'New applications', value: String(d.applications.new), sub: d.applications.total + ' total received', style: 'gold' },
      { label: 'Event registrations', value: String(d.events.registrations), sub: d.events.upcoming + ' upcoming events' },
      { label: 'Audit entries', value: String(d.site.auditEntries), sub: 'Every login & write logged' }
    ];
  }

  function peopleTiles() {
    var api = window.YPDC.api;
    if (api && api.available) {
      if (!SRV.data) {
        ensureSummary(api);
        return '<section class="grid g4">' + [0, 1, 2, 3].map(function () {
          return '<div class="stat"><span class="stat-label">Loading\u2026</span>' +
            '<span class="stat-value" style="font-size:1.15rem">\u2026</span>' +
            '<span class="stat-sub">From the SQLite database</span></div>';
        }).join('') + '</section>';
      }
      var d = SRV.data;
      var dirs = S.directorates.length;
      return stats([
        { label: 'Accounts', value: String(d.users.total), sub: d.users.active + ' active' },
        { label: 'Members directory', value: String(S.people.length), sub: 'Records in database', style: 'gold' },
        { label: 'Applications', value: String(d.applications.total), sub: (S.inductionDrive.batch || 'Induction Drive') },
        { label: 'Directorates', value: String(dirs), sub: 'All active' }
      ]);
    }
    var mem = S.people.filter(function (p) { return p.role === 'member' || p.role === 'student'; }).length;
    var vol = S.people.filter(function (p) { return p.post && p.post !== 'General Member'; }).length;
    var cert = S.certificates.length;
    return stats([
      PC.statNum(S.people.length, 'People in directory', mem ? (mem + ' member accounts') : 'Database is empty'),
      PC.statNum(vol, 'Post holders / volunteers', vol ? 'Across directorates' : 'No posts assigned yet', { style: 'gold' }),
      PC.statNum(cert, 'Certificates issued', cert ? 'Verified records' : 'No certificates yet'),
      PC.statNum(S.directorates.length, 'Directorates', 'YPDC structure')
    ]);
  }

  function engagementRows() {
    var api = window.YPDC.api;
    var live = api && api.available;
    if (live && !SRV.data) { ensureSummary(api); return '<p class="mut" style="font-size:.88rem">Loading\u2026</p>'; }
    var names = { student: 'Volunteers', member: 'General Members', directorate: 'Directorate leads', faculty: 'Faculty', alumni: 'Alumni', admin: 'Admins' };
    if (live) {
      var total = SRV.data.users.total || 1;
      return SRV.data.users.byRole.map(function (r) {
        var pct = Math.max(4, Math.round((r.c / total) * 100));
        return barRow(names[r.role] || r.role, r.c + ' (' + Math.round((r.c / total) * 100) + '%)', pct);
      }).join('');
    }
    return '<p class="mut" style="font-size:.88rem">No data yet — the server is not connected. Role counts appear here once the backend is running.</p>';
  }

  function barRow(label, value, pct) {
    return '<div class="bar-row"><div class="top"><span>' + esc(label) + '</span><b>' + esc(String(value)) + '</b></div>' +
      '<div class="bar"><span style="width:' + pct + '%"></span></div></div>';
  }

  function directorateRows() {
    var api = window.YPDC.api;
    if (api && api.available) {
      var tasks = S.tasks || [];
      if (!tasks.length) return '<p class="mut" style="font-size:.88rem">There are no tasks in the database yet.</p>';
      var counts = S.directorates.map(function (d) {
        var mine = tasks.filter(function (t) { return t.directorate === d.name; });
        return { name: d.name, total: mine.length, open: mine.filter(function (t) { return t.status !== 'Completed'; }).length };
      });
      var max = Math.max.apply(null, counts.map(function (c) { return c.total; }).concat([1]));
      return counts.map(function (c) {
        return barRow(c.name, c.total + ' tasks \u00b7 ' + c.open + ' open', Math.round((c.total / max) * 100));
      }).join('');
    }
    return S.directorates.map(function (d) {
      return barRow(d.name, d.activity + '%', d.activity);
    }).join('');
  }

  function fillRate() {
    var evs = S.events || [];
    var cap = evs.reduce(function (a, e) { return a + (Number(e.capacity) || 0); }, 0);
    var reg = evs.reduce(function (a, e) { return a + (Number(e.registered) || 0); }, 0);
    return cap ? Math.round((reg / cap) * 100) : 0;
  }

  function photosPanel() {
    var st = (window.YPDC.state.site && window.YPDC.state.site.photos) || {};
    var heroCustom = App.storedImg(st.hero);
    var logoCustom = App.storedImg(window.YPDC.state.site.logo);
    var up = (st.gallery || []).filter(App.storedImg);
    return '<section class="panel mt-22"><div class="panel-head"><h3>Photos &amp; logo</h3>' +
      '<span class="badge badge-gold">Live on the website</span></div>' +
      '<div class="panel-body">' +
      '<p class="mut" style="font-size:.9rem">Upload pictures from your device — they are saved in the database and appear on the public website immediately.</p>' +
      '<div class="grid g2 mt-16" style="gap:16px">' +
        '<div class="card card-tight" style="border:1px solid var(--line)">' +
          '<div class="flex-between"><b>Homepage hero photo</b>' + (heroCustom ? '<span class="badge badge-ok">Custom</span>' : '<span class="badge badge-line">Design photo</span>') + '</div>' +
          '<img src="' + App.brand('hero', 'hero-campus.jpg') + '" alt="Hero" style="width:100%;height:132px;object-fit:cover;border-radius:10px;margin-top:10px">' +
          '<div class="btn-row mt-16"><button class="btn btn-xs btn-green" data-action="pick-photo" data-kind="hero">' + (heroCustom ? 'Change photo' : 'Upload photo') + '</button>' +
          (heroCustom ? '<button class="btn btn-xs btn-quiet" data-action="reset-photo" data-kind="hero">Remove</button>' : '') + '</div>' +
        '</div>' +
        '<div class="card card-tight" style="border:1px solid var(--line)">' +
          '<div class="flex-between"><b>Website logo</b>' + (logoCustom ? '<span class="badge badge-ok">Custom</span>' : '<span class="badge badge-line">Official logo</span>') + '</div>' +
          '<div style="text-align:center;padding:8px 0"><img src="' + App.logoImg('logo-ypdc.png') + '" alt="Logo" style="height:112px;width:112px;border-radius:50%"></div>' +
          '<div class="btn-row"><button class="btn btn-xs btn-green" data-action="pick-photo" data-kind="logo">' + (logoCustom ? 'Change logo' : 'Upload logo') + '</button>' +
          (logoCustom ? '<button class="btn btn-xs btn-quiet" data-action="reset-photo" data-kind="logo">Reset</button>' : '') + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="mt-22"><div class="flex-between"><b>Gallery photos</b>' +
      '<span class="badge badge-line">' + (up.length ? up.length + ' uploaded' : 'design gallery') + '</span></div>' +
      '<div class="gallery mt-10" style="grid-template-columns:repeat(6,1fr)">' + window.App.gallery().slice(0, 12).map(function (src, i) {
        return '<div style="position:relative"><img src="' + src + '" alt="Gallery" style="height:88px;width:100%;object-fit:cover;border-radius:10px">' +
          (up.length ? '<button class="btn btn-xs btn-danger" style="position:absolute;top:4px;right:4px;padding:2px 7px" data-action="remove-gallery" data-index="' + i + '">×</button>' : '') +
          '</div>';
      }).join('') + '</div>' +
      '<div class="btn-row mt-16"><button class="btn btn-xs btn-green" data-action="pick-photo" data-kind="gallery">+ Add gallery photos</button>' +
      (up.length ? '<button class="btn btn-xs btn-quiet" data-action="reset-photo" data-kind="gallery">Use the default gallery</button>' : '') + '</div></div>' +
      '</div></section>';
  }

  function overviewRows() {
    var api = window.YPDC.api;
    var d = SRV.data;
    if (api && api.available) {
      if (!d) {
        ensureSummary(api);
        return [['Server data', 'Loading\u2026', '<span class="badge badge-line">SQLite</span>']];
      }
      return [
        ['Total users', d.users.total, '<span class="badge badge-ok">' + d.users.active + ' active</span>'],
        ['Induction applications', d.applications.total, '<span class="badge badge-info">' + d.applications.new + ' new</span>'],
        ['Event registrations', d.events.registrations, '<span class="badge badge-line">' + d.events.upcoming + ' upcoming events</span>'],
        ['Seats filled', fillRate() + '%', '<span class="badge badge-line">' + (S.events || []).length + ' events</span>'],
        ['Pending approvals', d.applications.new + (d.feedback ? d.feedback.new : 0), '<span class="badge badge-warn">needs review</span>'],
        ['Audit log entries', d.site.auditEntries, '<span class="badge badge-ok">live</span>']
      ];
    }
    var an = S.analytics;
    return [
      ['Total users', an.totalUsers, '<span class="badge badge-line">from the database</span>'],
      ['Active members', an.activeMembers, '<span class="badge badge-line">verified accounts</span>'],
      ['Avg. attendance', an.avgAttendance + '%', '<span class="badge badge-line">from records</span>'],
      ['Pending approvals', an.pendingApprovals, '<span class="badge badge-warn">needs review</span>'],
      ['Induction applications', S.applications.length + ' new', '<span class="badge badge-info">Fall 2026</span>']
    ];
  }

  function analyticsTiles() {
    var api = window.YPDC.api;
    var an = S.analytics;
    if (api && api.available) {
      if (!SRV.data) {
        ensureSummary(api);
        return '<section class="grid g4">' + [0, 1, 2, 3].map(function () {
          return '<div class="stat"><span class="stat-label">Loading\u2026</span>' +
            '<span class="stat-value" style="font-size:1.15rem">\u2026</span>' +
            '<span class="stat-sub">From the SQLite database</span></div>';
        }).join('') + '</section>';
      }
      var d = SRV.data;
      var fill = fillRate();
      return stats([
        { label: 'Total users', value: String(d.users.total), sub: 'All roles' },
        { label: 'Active accounts', value: String(d.users.active), sub: 'Verified', style: 'gold' },
        { label: 'Events', value: String(d.events.total), sub: d.events.upcoming + ' upcoming' },
        { label: 'Seats filled', value: fill + '%', ring: fill, sub: 'Across events' }
      ]);
    }
    return stats([{ label: 'Total users', value: String(an.totalUsers), sub: 'All roles' },
      { label: 'Active members', value: String(an.activeMembers), sub: 'Verified', style: 'gold' },
      { label: 'Events this term', value: String(an.eventsThisTerm), sub: 'Delivered' },
      { label: 'Avg. attendance', value: an.avgAttendance + '%', ring: an.avgAttendance, sub: 'Across events' }]);
  }

  function recentActivity(limit) {
    var api = window.YPDC.api;
    if (api && api.available) {
      if (!SRV.audit || !SRV.audit.length) {
        ensureSummary(api);
        return '<p class="mut" style="font-size:.88rem">Loading\u2026</p>';
      }
      return SRV.audit.slice(0, limit).map(function (a) {
        return '<div class="list-row"><span class="av">' + esc(String(a.action).charAt(0).toUpperCase()) + '</span>' +
          '<div class="txt"><b>' + esc(a.action) + '</b><small>' + esc(a.email || 'guest') + ' \u00b7 ' +
          esc(String(a.at || '').replace('T', ' ').slice(0, 16)) + '</small></div></div>';
      }).join('');
    }
    return S.activityLog.slice(0, limit).map(function (l) {
      return '<div class="list-row"><span class="av">' + esc(l.text.charAt(0)) + '</span>' +
        '<div class="txt"><b>' + esc(l.text) + '</b><small>' + esc(l.meta) + '</small></div>' + statusBadge(l.status) + '</div>';
    }).join('');
  }

  function repaint() {
    if (window.App && window.App.render && location.hash.indexOf('portal/admin') > -1) window.App.render();
  }

  /* ---- Batch D: audit log filters + user management (server driven) ---- */
  var ROLE_LABEL = { student: 'Student / Volunteer', member: 'General Member', directorate: 'Directorate', faculty: 'Faculty', admin: 'Admin', alumni: 'Alumni' };
  /* R39.0 — registration documents (photo + ID card) admin view */
  function docsCell(rec) {
    var items = [['Photo', rec.photo], ['ID card', rec.idCard]];
    var have = items.filter(function (x) { return !!x[1]; });
    if (!have.length) return '<span class="mut" style="font-size:.78rem">Not uploaded</span>';
    return '<div class="doc-cell">' + have.map(function (x) {
      return '<button type="button" class="doc-thumb" data-action="view-doc" data-src="' + esc(x[1]) +
        '" data-title="' + esc((rec.name || 'Applicant') + ' — ' + x[0]) + '" title="' + esc(x[0]) + '">' +
        '<img src="' + esc(x[1]) + '" alt="' + esc(x[0]) + '" loading="lazy">' +
        '<span>' + esc(x[0]) + '</span></button>';
    }).join('') + '</div>';
  }

  var ACTION_LABEL = {
    login: 'Login', logout: 'Logout', 'admin-login': 'Admin login', 'directorate-login': 'Directorate login',
    'user-register': 'Self sign-up (new account)', 'user-create': 'Admin created an account', 'user-disable': 'Account deactivated',
    'user-enable': 'Account activated', 'user-role-change': 'Role changed', 'user-password-reset': 'Password set by admin',
    'user-access-reset': 'Access reset by admin', 'user-sessions-revoked': 'Sessions revoked', 'user-delete': 'Account deleted',
    'password-reset-request': 'Reset link requested', 'password-reset': 'Password reset from link', 'password-change': 'Password changed'
  };

  function loadAudit(force) {
    var api = window.YPDC.api;
    if (!api || !api.available) return;
    if (SRV.logLoading) return;
    SRV.logLoading = true;
    if (!SRV.log && !force) repaint();
    return api.adminAudit(SRV.logQ).then(function (r) {
      SRV.log = r; SRV.logLoaded = true; SRV.logError = null; SRV.logLoading = false; repaint();
    }).catch(function (e) {
      SRV.logError = e.message || 'The audit log could not be loaded.'; SRV.logLoading = false; repaint();
    });
  }

  function loadUsers(force) {
    var api = window.YPDC.api;
    if (!api || !api.available) return;
    if (SRV.usersLoading) return;
    SRV.usersLoading = true;
    if (!SRV.usersData && !force) repaint();
    return api.adminUsers(SRV.usersQ).then(function (r) {
      SRV.usersData = r; SRV.usersError = null; SRV.usersLoading = false; repaint();
    }).catch(function (e) {
      SRV.usersError = e.message || 'Accounts could not be loaded.'; SRV.usersLoading = false; repaint();
    });
  }

  function loadCharts(force) {
    var api = window.YPDC.api;
    if (!api || !api.available) return Promise.resolve();
    if (SRV.chartsLoading) return Promise.resolve();
    SRV.chartsLoading = true;
    return api.adminCharts(SRV.chartsMonths).then(function (r) {
      SRV.charts = r; SRV.chartsError = null; SRV.chartsLoading = false; repaint();
    }).catch(function (e) {
      SRV.chartsError = e.message || 'Charts could not be loaded.'; SRV.chartsLoading = false; repaint();
    });
  }

  function chartsSection() {
    var api = window.YPDC.api;
    if (!api || !api.available) return '';
    var C = PC.charts;
    var range = '<div class="chip-row mb-16">' + [3, 6, 12].map(function (m) {
      return '<button class="chip' + (SRV.chartsMonths === m ? ' active' : '') + '" data-action="charts-range" data-months="' + m + '">' + m + ' months</button>';
    }).join('') + '<span class="chip mut" style="cursor:default">Registration trend range</span></div>';

    var head = pageHead ? '' : '';
    if (SRV.chartsError) {
      return '<section class="panel mt-22"><div class="panel-head"><h3>Live charts</h3><span class="badge badge-line">From the database</span></div>' +
        '<div class="panel-body"><b style="color:var(--danger)">Charts not available</b><p class="mut mt-6" style="font-size:.88rem">' + esc(SRV.chartsError) + '</p>' +
        '<button class="btn btn-outline btn-sm mt-16" data-action="charts-refresh">Try again</button></div></section>';
    }
    if (!SRV.charts) {
      if (!SRV.chartsLoading) loadCharts();
      return '<section class="panel mt-22"><div class="panel-head"><h3>Live charts</h3><span class="badge badge-line">From the database</span></div>' +
        '<div class="panel-body"><div class="chart-empty"><b>Loading charts\u2026</b><p class="mut">Reading the SQLite database.</p></div></div></section>';
    }
    var d = SRV.charts;

    var roles = C.card('Users by role', d.totals.users + ' accounts',
      C.bars((d.usersByRole || []).map(function (r) {
        return { label: r.label, value: r.count, note: r.active + ' active · ' + (r.count - r.active) + ' inactive' };
      })), 'Straight from the users table (role column).');

    var apps = C.card('Applications by status', d.totals.applications + ' received',
      C.donut((d.applicationsByStatus || []).map(function (a) { return { label: a.status, value: a.count }; }),
        { center: 'Applications', aria: 'Applications by status' }), 'Induction applications by their current status.');

    var events = C.card('Top events — registrations', d.totals.registrations + ' of ' + d.totals.seats + ' seats filled',
      C.bars((d.topEvents || []).map(function (e) {
        return { label: e.title, value: e.registered, note: [e.date, e.status, e.capacity ? ('capacity ' + e.capacity) : ''].filter(Boolean).join(' · ') };
      })), 'Six events with the most registrations.');

    var dirs = C.card('Directorate activity', (d.directorates || []).length + ' directorates',
      C.bars((d.directorates || []).map(function (x) {
        return { label: x.name, value: x.members, note: x.tasks + ' tasks · ' + x.events + ' events · ' + x.registrations + ' registrations' };
      })), 'Members, tasks and registrations grouped by directorate.');

    var monthly = C.card('Monthly activity', SRV.chartsMonths + ' months',
      C.columns((d.monthly || []).map(function (m) {
        return { label: m.label, values: { registrations: m.registrations, applications: m.applications, accounts: m.accounts, activity: m.activity } };
      }), [
        { key: 'activity', label: 'Audit entries' },
        { key: 'registrations', label: 'Event registrations' },
        { key: 'applications', label: 'Applications' },
        { key: 'accounts', label: 'New accounts' }
      ], { aria: 'Monthly activity' }), 'Every bar is a real row count for that month.');

    return '<section class="panel mt-22"><div class="panel-head"><h3>Live charts</h3>' +
      '<span class="badge badge-ok">Live backend</span>' +
      '<button class="btn btn-xs btn-quiet" data-action="charts-refresh">Refresh</button></div>' +
      '<div class="panel-body">' + range +
      '<div class="charts-grid">' +
      '<div>' + roles + '</div><div>' + apps + '</div>' +
      '<div>' + events + '</div><div>' + dirs + '</div>' +
      '<div class="span2">' + monthly + '</div>' +
      '</div></div></section>';
  }

  function pager(state, total, pages, action) {
    if (pages <= 1) return '<div class="panel-foot"><span class="mut" style="font-size:.84rem">' + total + ' record' + (total === 1 ? '' : 's') + '</span></div>';
    var from = (state.page - 1) * state.perPage + 1, to = Math.min(state.page * state.perPage, total);
    return '<div class="panel-foot pager"><span class="mut" style="font-size:.84rem">Showing ' + from + '–' + to + ' of ' + total + '</span>' +
      '<span class="pager-btns">' +
      '<button class="btn btn-xs btn-quiet" data-action="' + action + '" data-page="' + (state.page - 1) + '"' + (state.page <= 1 ? ' disabled' : '') + '>‹ Prev</button>' +
      '<span class="badge badge-line">Page ' + state.page + ' / ' + pages + '</span>' +
      '<button class="btn btn-xs btn-quiet" data-action="' + action + '" data-page="' + (state.page + 1) + '"' + (state.page >= pages ? ' disabled' : '') + '>Next ›</button>' +
      '</span></div>';
  }

  function selectHTML(name, options, current) {
    return '<select name="' + name + '" data-filter="' + name + '">' + options.map(function (o) {
      return '<option value="' + esc(o[0]) + '"' + (o[0] === current ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
    }).join('') + '</select>';
  }

  function logPage() {
    var api = window.YPDC.api, live = api && api.available;
    var head = pageHead('Admin portal', 'Activity Log', 'Every login, write, approval and admin action — straight from the audit_log table in the database.',
      '<button class="btn btn-outline btn-sm" data-action="refresh-audit">Refresh</button>');

    if (!live) {
      return head + '<section class="panel"><div class="panel-body">' + table(['#', 'Action', 'Details', 'Date', 'Status'], S.activityLog.map(function (l, i) {
        return ['0' + (i + 1), '<b>' + esc(l.text) + '</b>', esc(l.meta), fmt(l.date), statusBadge(l.status)];
      })) + '</div></section>';
    }
    var Q = SRV.logQ;
    var f = (SRV.log && SRV.log.filters) || { actions: [], roles: [], status: { ok: 0, fail: 0 } };
    var actions = [['', 'All actions']].concat((f.actions || []).map(function (a) { return [a.action, (ACTION_LABEL[a.action] || a.action) + ' (' + a.c + ')']; }));
    var roles = [['', 'All roles']].concat((f.roles || []).map(function (r) { return [r.role, (ROLE_LABEL[r.role] || r.role) + ' (' + r.c + ')']; }));

    var filters = '<section class="panel"><div class="panel-head"><h3>Filters</h3>' +
      '<span class="badge badge-line">' + ((f.status && f.status.fail) || 0) + ' failed attempts recorded</span></div>' +
      '<div class="panel-body filter-bar">' +
      '<label class="field"><span>Search (user, action, detail, IP)</span><input data-filter="q" value="' + esc(Q.q) + '" placeholder="e.g. shaheen, admin@uon.edu.pk, 127.0.0.1"></label>' +
      '<label class="field"><span>Role</span>' + selectHTML('role', roles, Q.role) + '</label>' +
      '<label class="field"><span>Action</span>' + selectHTML('action', actions, Q.action) + '</label>' +
      '<label class="field"><span>Result</span>' + selectHTML('status', [['', 'All results'], ['ok', 'Success only'], ['fail', 'Failed only']], Q.status) + '</label>' +
      '<label class="field"><span>From date</span><input type="date" data-filter="from" value="' + esc(Q.from) + '"></label>' +
      '<label class="field"><span>To date</span><input type="date" data-filter="to" value="' + esc(Q.to) + '"></label>' +
      '<label class="field"><span>Rows per page</span>' + selectHTML('perPage', [['25', '25'], ['50', '50'], ['100', '100'], ['200', '200']], String(Q.perPage)) + '</label>' +
      '<div class="field filter-actions"><button class="btn btn-green btn-sm" data-action="log-apply">Apply filters</button>' +
      '<button class="btn btn-outline btn-sm" data-action="log-reset">Reset</button></div>' +
      '</div></section>';

    if (SRV.logError) {
      return head + filters + '<section class="panel"><div class="panel-body"><b style="color:var(--danger)">Audit log not available</b><p class="mut mt-6" style="font-size:.88rem">' + esc(SRV.logError) + '</p></div></section>';
    }
    if (!SRV.log) return head + filters + '<section class="panel"><div class="panel-body">Loading the audit log…</div></section>';

    var rows = SRV.log.entries.map(function (e) {
      var who = '<b>' + esc(e.email || 'guest') + '</b><div class="mut" style="font-size:.78rem">' + esc(ROLE_LABEL[e.role] || e.role || '—') + '</div>';
      var detail = esc(e.detail || e.target || '—') + (e.record_id ? '<div class="mut" style="font-size:.78rem">' + esc(e.record_id) + '</div>' : '');
      return [
        '<b>' + esc(ACTION_LABEL[e.action] || e.action) + '</b><div class="mut" style="font-size:.78rem">' + esc(e.action) + '</div>',
        who,
        esc(e.target || '—') + (e.target ? '<div class="mut" style="font-size:.78rem">' + esc(detail.replace(/<\/?[^>]+>/g, ' ')) + '</div>' : '<div class="mut" style="font-size:.78rem">' + esc(e.record_id || '') + '</div>'),
        (e.at || '').replace('T', ' ').slice(0, 19),
        esc(e.ip || '—'),
        e.ok ? statusBadge('Success') : '<span class="badge badge-danger">Failed</span>',
        e.user_id ? '<button class="btn btn-xs btn-quiet" data-action="user-open" data-id="' + esc(e.user_id) + '">View user</button>' : '<span class="mut" style="font-size:.78rem">—</span>'
      ];
    });

    return head + filters +
      '<section class="panel"><div class="panel-head"><h3>Recorded activity</h3><span class="badge badge-ok">' + SRV.log.total + ' matching entries</span></div>' +
      '<div class="panel-body" style="padding-top:0">' + table(['Action', 'Who', 'Target / detail', 'When (UTC)', 'IP', 'Result', ''], rows) + '</div>' +
      pager(Q, SRV.log.total, SRV.log.pages, 'log-page') + '</section>';
  }

  function ensurePermissions(api) {
    if (SRV.permLoading) return;
    SRV.permLoading = true;
    api.adminPermissions().then(function (p) { SRV.perm = p; window.YPDC.adminPerm = p; repaint(); })
      .catch(function (e) { SRV.permError = e.message; repaint(); });
  }

  function ensureSummary(api) {
    if (SRV.loading) {
      SRV.loading = false;
      api.adminSummary().then(function (d) { SRV.data = d; repaint(); })
        .catch(function (e) { SRV.error = e.message; repaint(); });
      api.adminAudit(6).then(function (r) { SRV.audit = r.entries || []; repaint(); }).catch(function () {});
    }
  }

  function shaheenCard() {
    var api = window.YPDC.api;
    var live = api && api.available;
    var SH = window.App.shaheenState;
    var st = (SH && SH.data && SH.data.settings) || S.shaheen || {};
    var c = (SH && SH.data && SH.data.counts) || {};
    var open = !!st.open;
    var loading = live && SH && !SH.data;
    var badge = open ? '<span class="badge badge-ok">Registration OPEN</span>' : '<span class="badge badge-line">Registration CLOSED</span>';
    var counts = live && SH && SH.data
      ? '<div class="chip-row mt-16">' +
        '<span class="badge badge-gold">' + (c.pending || 0) + ' pending</span>' +
        '<span class="badge badge-ok">' + (c.approved || 0) + ' approved</span>' +
        '<span class="badge badge-line">' + (c.total || 0) + ' received</span>' +
        '<span class="badge badge-info">' + (c.fresh || 0) + ' new applicants</span>' +
        '<span class="badge badge-info">' + (c.existing || 0) + ' existing members</span></div>'
      : '<p class="mut mt-10" style="font-size:.9rem">' + (live ? 'Reading registrations from the server…' : 'The server is offline — start it to manage registrations.') + '</p>';
    return '<section class="panel mt-22" id="admin-shaheen-card"><div class="panel-head"><h3>' + esc(st.batch || 'Bano Shaheen') + ' registration</h3>' + badge + '</div>' +
      '<div class="panel-body">' +
      '<p class="mut" style="font-size:.9rem">Open or close the public registration window from here — the homepage strip and the ' + esc(st.batch || 'Bano Shaheen') + ' page change with it. Approvals and the expected list are on the full page.</p>' +
      counts +
      '<div class="btn-row mt-16">' +
      '<button class="btn ' + (open ? 'btn-danger' : 'btn-green') + ' btn-sm" data-action="shaheen-toggle"' + (loading ? ' disabled' : '') + '>' + (open ? 'Close registration' : 'Open registration') + '</button>' +
      '<button class="btn btn-outline btn-sm" data-action="goto" data-go="#/portal/admin/shaheen">Approvals &amp; expected list</button>' +
      '<a class="btn btn-quiet btn-sm" href="#/shaheen" target="_blank" rel="noopener">View public page</a>' +
      '</div></div></section>';
  }

  function serverPanel() {
    var api = window.YPDC.api;
    if (!api || !api.available) {
      return '<section class="grid g4">' +
        '<div class="stat" style="grid-column:1/-1;border-color:var(--gold-line);background:var(--gold-soft)">' +
        '<span class="stat-label">Backend</span>' +
        '<span class="stat-value" style="font-size:1.05rem;color:var(--warn)">Server offline</span>' +
        '<span class="stat-sub">Server is not running — data lives only in this browser\'s localStorage. ' +
        'For the real database: cd backend/server &amp;&amp; npm start</span></div></section>';
    }
    ensureSummary(api);
    if (SRV.error) {
      return '<section class="panel"><div class="panel-body"><b style="color:var(--danger)">No data received from the server</b>' +
        '<p class="mut mt-6" style="font-size:.88rem">' + esc(SRV.error) + '</p></div></section>';
    }
    if (!SRV.data) {
      return '<section class="grid g4"><div class="stat"><span class="stat-label">Server</span>' +
        '<span class="stat-value" style="font-size:1.1rem">Loading…</span>' +
        '<span class="stat-sub">Live data is coming from the SQLite database</span></div></section>';
    }

    var d = SRV.data;
    var info = [
      ['Accounts', String(d.users.total), d.users.active + ' active · ' + d.users.loginsToday + ' logins today'],
      ['Induction applications', String(d.applications.total), d.applications.new + ' new · ' + d.applications.approved + ' approved'],
      ['Event registrations', String(d.events.registrations), d.events.upcoming + ' upcoming events'],
      ['Audit log entries', String(d.site.auditEntries), 'Every login/write is recorded']
    ];
    return '<section class="panel" style="border-color:var(--green-line)">' +
      '<div class="panel-head"><div><span class="eyebrow">Live backend</span>' +
      '<h3 class="mt-6">Server &amp; database — live data (SQLite)</h3></div>' +
      '<span class="badge badge-ok">Connected</span></div>' +
      '<div class="panel-body">' +
      '<div class="grid g4">' + info.map(function (i) {
        return '<div class="stat"><span class="stat-label">' + esc(i[0]) + '</span>' +
          '<span class="stat-value">' + esc(i[1]) + '</span><span class="stat-sub">' + esc(i[2]) + '</span></div>';
      }).join('') + '</div>' +
      '<div class="grid g2 mt-22" style="gap:16px">' +
      '<div><b style="font-size:.94rem">Roles in database</b><div class="mt-10" style="display:grid;gap:8px">' +
      (d.users.byRole || []).map(function (x) {
        return '<div class="list-row" style="padding:8px 12px"><span class="badge badge-line">' + esc(x.role) + '</span>' +
          '<div class="txt"><b>' + esc(x.c) + ' account' + (x.c > 1 ? 's' : '') + '</b></div></div>';
      }).join('') + '</div></div>' +
      '<div><b style="font-size:.94rem">Latest security activity</b><div class="mt-10" style="display:grid;gap:8px">' +
      (SRV.audit.length ? SRV.audit.map(function (e) {
        return '<div class="list-row" style="padding:8px 12px"><span class="badge ' + (e.ok ? 'badge-ok' : 'badge-danger') + '">' + esc(e.action) + '</span>' +
          '<div class="txt"><b>' + esc(e.email || 'guest') + '</b><small>' + esc(e.role || '') + ' · ' + esc((e.at || '').slice(11, 19)) + ' UTC</small></div></div>';
      }).join('') : '<p class="mut" style="font-size:.86rem">No activity yet.</p>') +
      '</div></div>' +
      '<p class="mut mt-22" style="font-size:.8rem">This data comes from the server\'s SQLite database — logins, applications, ' +
      'registrations, feedback and the audit log live in real tables. Security: bcrypt password + JWT httpOnly cookie + CSRF token + rate limit.</p>' +
      '</div></section>';
  }

  window.PC.adminMailReload = function () { SRV.mailLoaded = false; SRV.mail = null; };
  window.PC.adminAnnReload = function () { SRV.annLoaded = false; SRV.ann = null; };

  /* Batch D — bindings in filters, pager aur user modal ke liye */
  window.PC.adminCharts = {
    state: SRV,
    load: function () { SRV.chartsLoading = false; return loadCharts(true); },
    setMonths: function (m) { SRV.chartsMonths = m; SRV.charts = null; return loadCharts(true); }
  };

  window.PC.adminData = {
    logQ: SRV.logQ,
    usersQ: SRV.usersQ,
    roleLabel: ROLE_LABEL,
    actionLabel: ACTION_LABEL,
    loadAudit: function () { SRV.logLoading = false; return loadAudit(true); },
    loadUsers: function () { SRV.usersLoading = false; return loadUsers(true); },
    userById: function (id) {
      var list = (SRV.usersData && SRV.usersData.users) || [];
      return list.filter(function (u) { return u.id === id; })[0] || null;
    },
    forgetUser: function (id) {
      if (SRV.usersData) SRV.usersData.users = SRV.usersData.users.filter(function (u) { return u.id !== id; });
    }
  };

  SEC.admin = {
    teams: function () { return window.PC.TEAM.adminSection(); },
    dashboard: function () {
      var an = S.analytics;
      return heroBlock('admin') +
        serverPanel() +
        shaheenCard() +
        stats(serverStats() || [{ label: 'Users', value: String(an.totalUsers), sub: 'Registered accounts' },
          { label: 'Approvals', value: String(an.pendingApprovals), sub: 'Pending action', style: 'gold' },
          { label: 'Events', value: String(an.eventsThisTerm), sub: 'This term' },
          { label: 'Certificates', value: String(an.certificates), sub: 'Issued' }]) +
        '<section class="grid g23" style="align-items:start">' +
        focusPanel('admin') +
        quickAccess('admin') + '</section>' +
        chartsSection() +
        '<div class="grid" style="gap:16px">' +
        '<div class="panel"><div class="panel-head"><h3>System overview</h3>' +
        '<button class="btn btn-xs btn-quiet" data-action="goto" data-go="#/portal/admin/analytics">Open analytics</button></div>' +
        '<div class="panel-body">' + table(['Metric', 'Value', 'Trend'], overviewRows()) + '</div></div>' +
        '<div class="panel"><div class="panel-head"><h3>Recent system activity</h3></div>' +
        '<div class="panel-body" style="padding-top:6px;padding-bottom:6px">' + recentActivity(5) + '</div></div></div>';
    },
    people: function () {
      var api = window.YPDC.api, live = api && api.available;
      var head = pageHead('Admin portal', 'People Directory', 'Every account in the database — search, filter, change roles, activate or lock access.',
        '<button class="btn btn-outline btn-sm" data-action="export-accounts">Export directory</button><button class="btn btn-green btn-sm" data-action="add-person">+ Add member</button>');

      if (!live) {
        return head + peopleTiles() +
          '<section class="panel mt-22"><div class="panel-body" style="padding-top:0">' + table(['Name', 'Type', 'Directorate', 'Post / Role', 'Status', 'Actions'], S.people.map(function (p) {
            return ['<b>' + esc(p.name) + '</b><div class="mut" style="font-size:.78rem">' + esc(p.email) + '</div>', esc(p.type), esc(p.directorate), esc(p.post), statusBadge(p.status),
              '<button class="btn btn-xs btn-quiet" data-action="person-role" data-id="' + p.id + '">Change role</button> ' +
              '<button class="btn btn-xs ' + (p.status === 'Active' ? 'btn-danger' : 'btn-green') + '" data-action="person-status" data-id="' + p.id + '" data-status="' + (p.status === 'Active' ? 'Inactive' : 'Active') + '">' + (p.status === 'Active' ? 'Deactivate' : 'Activate') + '</button>'];
          })) + '</div><div class="panel-foot"><span class="mut" style="font-size:.84rem">Server band hai — yeh offline directory hai.</span></div></section>';
      }

      if (!SRV.usersData && !SRV.usersLoading) loadUsers();
      var Q = SRV.usersQ;
      var c = (SRV.usersData && SRV.usersData.counts) || { total: 0, active: 0, inactive: 0, byRole: [] };

      var countOf = function (role) { return ((c.byRole || []).filter(function (r) { return r.role === role; })[0] || {}).c || 0; };
      var tiles = stats([
        { label: 'Accounts', value: String(c.total), sub: c.active + ' active · ' + c.inactive + ' inactive' },
        { label: 'Admins', value: String(countOf('admin')), sub: 'Full control' },
        { label: 'Students / volunteers', value: String(countOf('student')), sub: 'Volunteer portal' },
        { label: 'Faculty & directorate', value: String(countOf('faculty') + countOf('directorate')), sub: 'Review & reporting', style: 'gold' }
      ]).replace('class="grid g4"', 'class="grid g4 mt-22"');

      var filters = '<section class="panel mt-22"><div class="panel-head"><h3>Search & filters</h3>' +
        '<span class="badge badge-line">' + c.total + ' accounts</span></div>' +
        '<div class="panel-body filter-bar">' +
        '<label class="field"><span>Search</span><input data-filter="q" value="' + esc(Q.q) + '" placeholder="name, email, directorate or program"></label>' +
        '<label class="field"><span>Role</span>' + selectHTML('role', [['', 'All roles'], ['student', 'Student / Volunteer'], ['member', 'General Member'], ['directorate', 'Directorate'], ['faculty', 'Faculty'], ['admin', 'Admin'], ['alumni', 'Alumni']], Q.role) + '</label>' +
        '<label class="field"><span>Account state</span>' + selectHTML('state', [['', 'All accounts'], ['active', 'Active only'], ['inactive', 'Deactivated only']], Q.state) + '</label>' +
        '<label class="field"><span>Rows per page</span>' + selectHTML('perPage', [['15', '15'], ['25', '25'], ['50', '50']], String(Q.perPage)) + '</label>' +
        '<div class="field filter-actions"><button class="btn btn-green btn-sm" data-action="users-apply">Apply filters</button>' +
        '<button class="btn btn-outline btn-sm" data-action="users-reset">Reset</button></div>' +
        '</div></section>';

      if (SRV.usersError) {
        return head + tiles + filters + '<section class="panel"><div class="panel-body"><b style="color:var(--danger)">Accounts not available</b><p class="mut mt-6" style="font-size:.88rem">' + esc(SRV.usersError) + '</p></div></section>';
      }
      if (!SRV.usersData) return head + tiles + filters + '<section class="panel"><div class="panel-body">Loading accounts…</div></section>';

      var me = (window.YPDC.api && window.YPDC.api.user) || {};
      var rows = SRV.usersData.users.map(function (u) {
        var self = u.id === me.id, locked = !u.is_active;
        var actions = '<div class="row-actions">' +
          '<button class="btn btn-xs btn-quiet" data-action="user-open" data-id="' + esc(u.id) + '">View</button>' +
          '<button class="btn btn-xs btn-quiet" data-action="user-role" data-id="' + esc(u.id) + '">Role</button>' +
          '<button class="btn btn-xs btn-quiet" data-action="user-reset-access" data-id="' + esc(u.id) + '" data-email="' + esc(u.email) + '">Reset access</button>' +
          (self ? '<span class="badge badge-gold">You</span>'
                : '<button class="btn btn-xs ' + (locked ? 'btn-green' : 'btn-danger') + '" data-action="user-status" data-id="' + esc(u.id) + '" data-status="' + (locked ? 'active' : 'inactive') + '">' + (locked ? 'Activate' : 'Deactivate') + '</button>' +
                  '<button class="btn btn-xs btn-danger" data-action="user-delete" data-id="' + esc(u.id) + '" data-email="' + esc(u.email) + '">Delete</button>') +
          '</div>';
        return [
          '<b>' + esc(u.name) + '</b><div class="mut" style="font-size:.78rem">' + esc(u.email) + '</div>',
          '<span class="badge badge-line">' + esc(ROLE_LABEL[u.role] || u.role) + '</span>' + (u.is_last_admin ? '<div class="mut" style="font-size:.74rem">last admin</div>' : ''),
          esc(u.directorate || '—') + '<div class="mut" style="font-size:.78rem">' + esc(u.program || '') + '</div>',
          (u.is_active ? statusBadge('Active') : '<span class="badge badge-danger">Deactivated</span>'),
          esc((u.last_login || '').replace('T', ' ').slice(0, 16) || 'Never'),
          actions
        ];
      });

      return head + tiles + filters +
        '<section class="panel"><div class="panel-head"><h3>Accounts in the database</h3>' +
        (SRV.usersLoading ? '<span class="badge badge-line">Updating…</span>' : '<span class="badge badge-ok">' + SRV.usersData.total + ' matching</span>') +
        '</div><div class="panel-body" style="padding-top:0">' +
        table(['Person', 'Role', 'Directorate / program', 'Status', 'Last login (UTC)', 'Actions'], rows) + '</div>' +
        pager(Q, SRV.usersData.total, SRV.usersData.pages, 'users-page') + '</section>';
    },
    members: function () {
      return pageHead('Admin portal', 'General Members', 'General member records, induction batches and assignments.') +
        '<section class="panel"><div class="panel-head"><h3>Membership records</h3><span class="badge badge-gold">Induction ' + esc(S.inductionDrive.batch) + '</span></div><div class="panel-body">' +
        table(['Member', 'Type', 'Batch', 'Directorate', 'Post', 'Status'], S.people.map(function (p) {
          return ['<b>' + esc(p.name) + '</b>', esc(p.type), esc(p.batch || '—'), esc(p.directorate), esc(p.post), statusBadge(p.status)];
        })) + '</div></section>';
    },
    directorates: function () {
      return pageHead('Admin portal', 'Directorates & Posts', 'See exactly which members belong to each directorate and which YPDC posts are occupied.') +
        '<section class="grid g32" style="align-items:start">' +
        '<div class="panel"><div class="panel-head"><h3>Directorate membership</h3></div><div class="panel-body">' +
        table(['Directorate', 'Members', 'Active', 'Vacancy'], S.directorates.map(function (d) {
          return ['<b>' + esc(d.name) + '</b>', String(d.members), String(d.active), String(d.vacancy)];
        })) + '</div></div>' +
        '<div class="grid" style="gap:16px">' +
        '<div class="panel"><div class="panel-head"><h3>YPDC posts</h3></div><div class="panel-body" style="padding-top:6px;padding-bottom:6px">' +
        S.cabinet.posts.slice(0, 5).map(function (p) {
          return '<div class="list-row"><span class="av">' + ini(p.title) + '</span><div class="txt"><b>' + esc(p.title) + '</b><small>' + esc(p.holder) + '</small></div>' +
            '<span class="badge badge-ok">Assigned</span></div>';
        }).join('') + '</div></div>' +
        '<div class="panel"><div class="panel-head"><h3>Selected directorate · ' + esc(S.directorates[0].name) + '</h3></div><div class="panel-body">' +
        table(['Member', 'Post', 'Membership', 'Status'], S.people.slice(0, 4).map(function (p) {
          return ['<b>' + esc(p.name) + '</b>', esc(p.post), esc(p.type), statusBadge(p.status)];
        })) + '</div><div class="panel-foot"><button class="btn btn-outline btn-sm" data-action="goto" data-go="#/portal/admin/people">Manage assignments</button></div></div>' +
        '</div></section>' +
        '<section class="panel mt-22"><div class="panel-head"><h3>Directorate status control</h3></div><div class="panel-body" style="padding-top:6px;padding-bottom:6px">' +
        S.directorates.map(function (d) {
          return '<div class="list-row"><div class="txt"><b>' + esc(d.name) + '</b><small>' + d.members + ' members · lead ' + esc(d.lead) + '</small></div>' +
            statusBadge(d.status) +
            '<button class="btn btn-xs btn-quiet" data-action="toggle-dir-status" data-id="' + d.id + '" data-status="' + (d.status === 'Active' ? 'Inactive' : 'Active') + '">' +
            (d.status === 'Active' ? 'Deactivate' : 'Activate') + '</button></div>';
        }).join('') + '</div></section>';
    },
    faculty: function () {
      var api = window.YPDC.api;
      var live = api && api.available;
      var rows = S.accounts.filter(function (a) { return a.role === 'faculty'; });
      var approved = S.applications.filter(function (a) { return a.status === 'Approved'; }).length;
      var feedbackCount = S.feedback.length;
      var body = live
        ? (rows.length
          ? table(['Name', 'Email', 'Role', 'Status', 'Actions'], rows.map(function (a) {
              return ['<b>' + esc(a.name) + '</b>', esc(a.email), esc(a.role), statusBadge(a.status),
                '<button class="btn btn-xs btn-quiet" data-action="person-status" data-id="' + esc(a.id) + '" data-status="' + (a.status === 'Active' ? 'Disabled' : 'Active') + '">' + (a.status === 'Active' ? 'Disable' : 'Enable') + '</button>' +
                '<button class="btn btn-xs btn-quiet" data-action="person-role" data-id="' + esc(a.id) + '">Change role</button>'];
            }))
          : '<div class="empty-block"><b>No faculty accounts yet</b>' +
            '<p class="mut mt-6" style="font-size:.9rem">Create a new account from Admin → Accounts and set the role to <b>faculty</b>.</p></div>')
        : '<div class="panel-note">Server offline — accounts come from the server.</div>';
      return pageHead('Admin portal', 'Faculty', 'Faculty accounts, departments and oversight roles.') +
        '<section class="panel"><div class="panel-head"><h3>Faculty accounts</h3><span class="badge badge-line">' + (live ? rows.length + ' accounts' : 'offline') + '</span></div><div class="panel-body">' +
        body + '</div></section>' +
        '<section class="grid g3 mt-22">' + [
          ['Applications approved', String(approved), 'Real records'],
          ['Faculty accounts', String(rows.length), 'Users table'],
          ['Feedback received', String(feedbackCount) + ' (' + S.feedback.filter(function (f) { return f.status !== 'Reviewed'; }).length + ' pending)', 'From public form']
        ].map(function (s) {
          return '<div class="card"><span class="stat-label mut">' + s[0] + '</span><div style="font-family:var(--serif);font-size:1.8rem;color:var(--green-800)">' + s[1] + '</div><div class="mut" style="font-size:.8rem">' + s[2] + '</div></div>';
        }).join('') + '</section>';
    },
    shaheen: function () {
      var SH = (window.App.shaheenState && window.App.shaheenState.data) || null;
      if (!SH) {
        return pageHead('Admin portal', 'Bano Shaheen', 'Registration window, expected list and approvals for the Bano Shaheen batch.') +
          '<section class="panel"><div class="panel-body"><div class="empty-block"><b>Loading the Shaheen panel…</b>' +
          '<p class="mut mt-10">Reading registrations from the server.</p></div></div></section>';
      }
      var st = SH.settings || {};
      var c = SH.counts || {};
      var regs = SH.registrations || [];
      var roster = SH.roster || [];
      var statusBadgeFor = function (s2) {
        var cls = s2 === 'Approved' ? 'badge-ok' : (s2 === 'Rejected' ? 'badge-line' : (s2 === 'Pending' ? 'badge-gold' : 'badge-line'));
        return '<span class="badge ' + cls + '">' + esc(s2) + '</span>';
      };
      var rosterRows = roster.map(function (r) {
        return ['<b>' + esc(r.name || '—') + '</b>', esc(r.email),
          r.existingMember ? '<span class="badge badge-gold">Existing YPDC member</span>' : (r.registered ? '<span class="badge badge-info">New applicant</span>' : '<span class="mut">—</span>'),
          statusBadgeFor(r.status), esc(r.note || '—')];
      });
      var regRows = regs.map(function (r) {
        return ['<b>' + esc(r.name) + '</b><div class="mut" style="font-size:.78rem">' + esc(r.email) + (r.phone ? ' · ' + esc(r.phone) : '') + '</div>',
          esc(r.department || r.program || '—') + (r.semester ? '<div class="mut" style="font-size:.78rem">' + esc(r.semester) + '</div>' : ''),
          r.existingMember ? '<span class="badge badge-gold">Existing YPDC member</span>' : '<span class="badge badge-info">New applicant</span>',
          docsCell(r),
          fmt(r.date), statusBadgeFor(r.status),
          (r.status === 'Pending'
            ? '<button class="btn btn-xs btn-green" data-action="shaheen-approve" data-id="' + r.id + '">Approve</button> ' +
              '<button class="btn btn-xs btn-outline" data-action="shaheen-reject" data-id="' + r.id + '">Reject</button> '
            : '') +
          '<button class="btn btn-xs btn-danger" data-action="shaheen-delete" data-id="' + r.id + '">Delete</button>'];
      });
      return pageHead('Admin portal', 'Bano Shaheen', st.message || 'Registration window, expected list and approvals for the Bano Shaheen batch.',
        '<button class="btn ' + (st.open ? 'btn-danger' : 'btn-green') + ' btn-sm" data-action="shaheen-toggle">' +
        (st.open ? 'Close registration' : 'Open registration') + '</button>' +
        '<button class="btn btn-outline btn-sm" data-action="refresh-data">Refresh data</button>') +
        '<section class="grid g4" style="gap:16px">' +
        [['Batch', esc(st.batch || 'Shaheen'), st.open ? 'Registration is OPEN' : 'Registration is CLOSED'],
         ['Registrations', String(c.total || 0), (c.pending || 0) + ' pending · ' + (c.approved || 0) + ' approved'],
         ['Existing YPDC members', String(c.existing || 0), 'Matched by email'],
         ['New applicants', String(c.fresh || 0), 'No YPDC account yet']
        ].map(function (x) {
          return '<div class="card"><span class="stat-label mut">' + x[0] + '</span>' +
            '<div style="font-family:var(--serif);font-size:1.7rem;color:var(--green-800)">' + x[1] + '</div>' +
            '<div class="mut" style="font-size:.8rem">' + x[2] + '</div></div>';
        }).join('') + '</section>' +

        '<section class="panel mt-22"><div class="panel-head"><h3>Registration window</h3>' +
        (st.open ? '<span class="badge badge-ok">Open</span>' : '<span class="badge badge-line">Closed</span>') + '</div>' +
        '<div class="panel-body"><div class="form-grid">' +
        '<label class="field"><span>Batch name</span><input id="shaheen-batch" value="' + esc(st.batch || '') + '"></label>' +
        '<label class="field"><span>Seats</span><input id="shaheen-seats" type="number" min="1" value="' + esc(String(st.seats || 10)) + '"></label>' +
        '<label class="field full"><span>Short description (shown on the public page)</span><textarea id="shaheen-message">' + esc(st.message || '') + '</textarea></label>' +
        '<div class="field full" style="margin-bottom:0"><button class="btn btn-green btn-sm" data-action="shaheen-save-settings">Save settings</button></div>' +
        '</div><div class="panel-note mt-16">' + (st.open
          ? 'Registration is <b>open</b> — the public page accepts new registrations and the top strip shows “Registration is OPEN”.'
          : 'Registration is <b>closed</b> — the form is hidden and the top strip shows “Registration is CLOSED”.') + '</div>' +
        '</div></section>' +

        '<section class="panel mt-22"><div class="panel-head"><h3>Registrations</h3><span class="badge badge-line">' + regs.length + ' records</span></div>' +
        '<div class="panel-body">' + (regs.length
          ? table(['Name', 'Department', 'Type', 'Documents', 'Date', 'Status', 'Actions'], regRows)
          : '<div class="empty-block"><b>No registrations yet</b><p class="mut mt-10">' + (st.open
              ? 'Registration is open — new applications will appear here as Pending.'
              : 'Registration is closed right now. Open it when you want to collect applications.') + '</p></div>') +
        '</div></section>' +

        '<section class="panel mt-22"><div class="panel-head"><h3>' + esc(st.batch || 'Bano Shaheen') + ' expected list</h3>' +
        '<span class="badge badge-gold">' + roster.length + ' on the list</span></div>' +
        '<div class="panel-body">' +
        '<label class="field"><span>One person per line — <code>Name, email@example.com, note</code> (email alone is enough)</span>' +
        '<textarea id="shaheen-roster" rows="7" placeholder="Ali Raza, ali.raza@gmail.com, already a YPDC member\nSara Khan, sara.khan@gmail.com, new applicant">' +
        roster.map(function (r) { return esc((r.name ? r.name + ', ' : '') + r.email + (r.note ? ', ' + r.note : '')); }).join('\n') + '</textarea></label>' +
        '<button class="btn btn-green btn-sm" data-action="shaheen-save-roster">Save expected list</button>' +
        '<div class="panel-note mt-16">The list tells you who is still missing: every email is matched with the registrations above — status shows <b>Not registered yet</b>, <b>Pending</b> or <b>Approved</b>.</div>' +
        (roster.length ? '<div class="mt-16">' + table(['Name', 'Email', 'Type', 'Status', 'Note'], rosterRows) + '</div>' : '') +
        '</div></section>';
    },

    events: function () {
      return pageHead('Admin portal', 'Events', 'Create, edit and publish events — they appear on the calendar and the public website at once.', '<button class="btn btn-green btn-sm" data-action="add-event">+ Create event</button>') +
        PC.calendar({ title: 'Event calendar', emptyNote: 'No events in this month — use + Create event to add one.' }) +
        '<section class="panel"><div class="panel-head"><h3>Event management</h3><span class="badge badge-line">' + S.events.length + ' records</span></div><div class="panel-body">' +
        table(['Event', 'Date', 'Venue', 'Registered', 'Status', 'Actions'], S.events.map(function (e) {
          return ['<b>' + esc(e.title) + '</b><div class="mut" style="font-size:.78rem">' + esc(e.organizer) + '</div>', fmt(e.date), esc(e.venue || e.location || ''),
            e.registered + ' / ' + e.capacity, statusBadge(e.status),
            '<button class="btn btn-xs btn-quiet" data-action="cal-open" data-id="' + e.id + '">View</button> ' +
            '<button class="btn btn-xs btn-quiet" data-action="edit-event" data-id="' + e.id + '">Edit</button> ' +
            '<button class="btn btn-xs btn-danger" data-action="del-event" data-id="' + e.id + '" data-title="' + esc(e.title) + '">Delete</button>'];
        })) + '</div></section>';
    },
    induction: function () {
      return pageHead('Admin portal', 'Induction Drive', 'Control the current drive, batch and application flow.') +
        '<section class="grid g23" style="align-items:start"><div class="grid" style="gap:16px">' +
        '<div class="panel"><div class="panel-head"><h3>Current drive</h3><span class="badge badge-gold">' + esc(S.inductionDrive.status) + '</span></div>' +
        '<div class="panel-body">' + table(['Field', 'Value'], [
          ['Induction batch', esc(S.inductionDrive.batch)],
          ['Applications received', String(S.inductionDrive.received)],
          ['Directorates', String(S.directorates.length) + ' directorates · ' + S.cabinet.posts.length + ' cabinet posts'],
          ['Form location', 'Public website → Induction Drive (no external link)']
        ]) + '</div>' +
        '<div class="panel-foot"><span class="mut" style="font-size:.84rem">The drive status is controlled from site settings.</span>' +
        '<button class="btn btn-green btn-sm" data-action="goto" data-go="#/portal/admin/applications">Open applications DB</button></div></div>' +
        '<div class="panel"><div class="panel-head"><h3>Workflow</h3></div><div class="panel-body"><div class="timeline">' +
        ['Open application', 'Review profile', 'Shortlist / Approve / Reject', 'Assign directorate &amp; post', 'Notify applicant'].map(function (t, i) {
          return '<div class="tl-item"><b>' + t + '</b><small>Step ' + (i + 1) + '</small></div>';
        }).join('') + '</div></div></div></div>' +
        '<aside class="grid" style="gap:16px">' +
        '<div class="stat gold"><span class="stat-label">Applications</span><span class="stat-value" data-live="induction">' + S.inductionDrive.received + '</span><span class="stat-sub">Fall 2026 drive</span></div>' +
        '<div class="card"><b>Public page</b><p class="mut mt-6" style="font-size:.86rem">The induction form is embedded on the website; submissions land directly in this database.</p>' +
        '<a class="btn btn-outline btn-sm btn-block mt-16" href="#/induction">Preview public form</a></div></aside></section>';
    },
    applications: function () {
      var counts = { New: 0, Shortlisted: 0, Approved: 0, Rejected: 0 };
      S.applications.forEach(function (a) { counts[a.status] = (counts[a.status] || 0) + 1; });
      return pageHead('Admin portal', 'Induction Drive Application Database', 'Every portal submission is stored here for review, filtering, assignment and approval.',
        '<button class="btn btn-outline btn-sm" data-action="export-applications">Export CSV</button>') +
        stats([{ label: 'Applications', value: String(S.inductionDrive.received), sub: 'Received' },
          { label: 'New', value: String(counts.New), sub: 'Awaiting review', style: 'gold' },
          { label: 'Shortlisted', value: String(counts.Shortlisted), sub: 'Pending interview' },
          { label: 'Approved', value: String(counts.Approved), sub: 'Members added' }]) +
        '<section class="panel mt-22"><div class="panel-head"><h3>Application records</h3><span class="badge badge-line">workflow: open → review → shortlist → assign → notify</span></div><div class="panel-body">' +
        table(['Applicant', 'Department', 'Semester', 'Documents', 'Preferred directorate', 'Date', 'Status', 'Actions'], S.applications.map(function (a) {
          return ['<b>' + esc(a.name) + '</b><div class="mut" style="font-size:.78rem">' + esc(a.email) + '</div>',
            esc(a.department || a.program || '—'), esc(a.semester || '—'), docsCell(a),
            esc(a.directorate), fmt(a.date), statusBadge(a.status),
            '<button class="btn btn-xs btn-quiet" data-action="app-status" data-id="' + a.id + '" data-status="Shortlisted">Shortlist</button> ' +
            '<button class="btn btn-xs btn-green" data-action="app-status" data-id="' + a.id + '" data-status="Approved">Approve</button> ' +
            '<button class="btn btn-xs btn-danger" data-action="app-status" data-id="' + a.id + '" data-status="Rejected">Reject</button> ' +
            '<button class="btn btn-xs btn-outline" data-action="app-assign" data-id="' + a.id + '">Assign</button>'];
        })) + '</div></section>';
    },
    analytics: function () {
      var an = S.analytics;
      return pageHead('Admin portal', 'Analytics & Participation Overview', 'Advanced administrative view for monitoring membership, event participation, approvals, directorate activity and engagement trends.') +
        analyticsTiles() +
        chartsSection() +
        '<section class="grid g23 mt-22" style="align-items:start">' +
        '<div class="panel"><div class="panel-head"><h3>Directorate activity</h3><span class="badge badge-gold">Live overview</span></div><div class="panel-body">' +
        directorateRows() + '</div></div>' +
        '<div class="grid" style="gap:16px">' +
        '<div class="panel"><div class="panel-head"><h3>Engagement mix</h3></div><div class="panel-body">' +
        engagementRows() + '</div></div>' +
        '<div class="panel"><div class="panel-head"><h3>Recent system activity</h3></div><div class="panel-body" style="padding-top:6px;padding-bottom:6px">' +
        recentActivity(4) + '</div><div class="panel-foot"><button class="btn btn-xs btn-quiet" data-action="goto" data-go="#/portal/admin/log">Full activity log</button></div></div>' +
        '</div></section>';
    },
    content: function () {
      return pageHead('Admin portal', 'Website Content', 'Public pages can be edited and previewed from one place.') +
        '<section class="grid g2">' + [
          ['info', 'YPDC Information', 'Name, tagline and homepage introduction used across the public website.'],
          ['vision', 'Vision &amp; Mission', 'Vision and mission statements shown on the About page.'],
          ['contact', 'Contact Information', 'Email, phone, office address and working hours in the footer.'],
          ['news', 'News &amp; Updates', 'Publish or edit announcements shown in the news section.'],
          ['popup', 'Popup Notice', 'The Apply Now popup visitors see when they open the website.']
        ].map(function (c) {
          return '<div class="card"><div class="flex-between"><b>' + c[1] + '</b><span class="badge badge-line">Editable</span></div>' +
            '<p class="mut mt-10" style="font-size:.9rem">' + c[2] + '</p>' +
            '<div class="btn-row mt-16">' +
            (c[0] === 'news'
              ? '<button class="btn btn-xs btn-green" data-action="publish-news">Publish news</button><a class="btn btn-xs btn-quiet" href="#/news">Preview</a>'
              : c[0] === 'popup'
              ? '<button class="btn btn-xs btn-green" data-action="edit-content" data-key="popup">Edit popup</button>' +
                '<button class="btn btn-xs btn-quiet" data-action="popup-toggle">' +
                (((S.site && S.site.popup && S.site.popup.enabled) === false) ? 'Show popup' : 'Hide popup') + '</button>' +
                '<button class="btn btn-xs btn-quiet" data-action="popup-preview">Preview</button>'
              : '<button class="btn btn-xs btn-green" data-action="edit-content" data-key="' + c[0] + '">Edit</button><a class="btn btn-xs btn-quiet" href="#/">Preview</a>') +
            '</div></div>';
        }).join('') + '</section>' +
        photosPanel() +
        '<section class="panel mt-22"><div class="panel-head"><h3>Live preview</h3><a class="btn btn-xs btn-quiet" href="#/">Open public website</a></div>' +
        '<div class="panel-body grid g3">' +
        '<div class="card card-tight" style="background:var(--cream-2)"><span class="stat-label mut">Homepage intro</span><p class="mt-6" style="font-size:.88rem">' + esc(S.site.intro) + '</p></div>' +
        '<div class="card card-tight" style="background:var(--cream-2)"><span class="stat-label mut">Vision</span><p class="mt-6" style="font-size:.88rem">' + esc(S.site.vision) + '</p></div>' +
        '<div class="card card-tight" style="background:var(--cream-2)"><span class="stat-label mut">Contact</span><p class="mt-6" style="font-size:.88rem">' + esc(S.site.contact.email) + '<br>' + esc(S.site.contact.phone) + '</p></div>' +
        '</div></section>';
    },
    cabinet: function () {
      return pageHead('Admin portal', 'Cabinet Editor', 'Admin can edit cabinet information, executive posts and public YPDC information.', '<button class="btn btn-green btn-sm" data-action="add-cabinet">+ Add post</button>') +
        '<section class="grid g23" style="align-items:start"><div class="panel"><div class="panel-head"><h3>Executive posts · ' + esc(S.cabinet.session) + '</h3><span class="badge badge-gold">Admin only</span></div>' +
        '<div class="panel-body" id="cabinet-editor">' + S.cabinet.posts.map(function (p) {
          return '<div class="grid g3" data-post style="gap:12px;align-items:end;margin-bottom:12px">' +
            '<label class="field" style="margin:0"><span>Post title</span><input data-field="title" value="' + esc(p.title) + '"></label>' +
            '<label class="field" style="margin:0"><span>Holder</span><input data-field="holder" value="' + esc(p.holder) + '"></label>' +
            '<label class="field" style="margin:0"><span>Status</span><select data-field="status"><option' + (p.status === 'Active' ? ' selected' : '') + '>Active</option><option' + (p.status === 'Vacant' ? ' selected' : '') + '>Vacant</option></select></label>' +
            '</div>';
        }).join('') + '</div>' +
        '<div class="panel-foot"><button class="btn btn-green" data-action="save-cabinet">Save cabinet information</button>' +
        '<a class="btn btn-outline" href="#/cabinet">Preview public page</a></div></div>' +
        '<aside class="card"><b>Publishing rules</b><ul class="checked-list mt-16"><li style="color:var(--ink)">Cabinet changes apply to the public cabinet page instantly</li><li style="color:var(--ink)">Executive posts marked vacant show a vacancy notice</li><li style="color:var(--ink)">Every change is recorded in the activity log</li></ul>' +
        '<div class="panel-note mt-16">Last cabinet update is logged in Activity Log → "Cabinet information updated".</div></aside></section>';
    },
    highlights: function () {
      return pageHead('Admin portal', 'Highlights & Picks', 'Select which events, activities and opportunities appear on the public highlights page.') +
        (S.highlights.length ? '<section class="grid g3">' + S.highlights.map(function (h) {
          return '<div class="card" style="padding:0;overflow:hidden">' +
            '<div class="media-frame" style="border-radius:0;box-shadow:none;aspect-ratio:16/10"><img src="' + img(h.image) + '" alt="' + esc(h.title) + '"></div>' +
            '<div style="padding:20px">' + statusBadge(h.status) +
            '<h4 class="mt-16">' + esc(h.title) + '</h4>' +
            '<p class="mut mt-10" style="font-size:.88rem">' + esc(h.desc) + '</p>' +
            '<div class="btn-row mt-16">' + (h.status === 'Published'
              ? '<button class="btn btn-xs btn-outline" data-action="highlight-status" data-id="' + h.id + '" data-status="Draft">Move to draft</button>'
              : '<button class="btn btn-xs btn-green" data-action="highlight-status" data-id="' + h.id + '" data-status="Published">Publish</button>') +
            '<a class="btn btn-xs btn-quiet" href="#/highlights">Preview</a></div></div></div>';
        }).join('') + '</section>'
          : PC.emptyNote('No highlights yet', 'Once events/highlights are added, publish them from here.'));
    },
    roles: function () {
      var api = window.YPDC.api;
      if (api && api.available) {
        if (!SRV.perm && window.YPDC.adminPerm) SRV.perm = window.YPDC.adminPerm;
        if (!SRV.perm) { ensurePermissions(api); return pageHead('Admin portal', 'Roles & Permissions', 'Loading permissions from the server\u2026') + '<section class="panel"><div class="panel-body">Loading\u2026</div></section>'; }
        var pm = SRV.perm;
        var roleNames = { student: 'Volunteer', member: 'General Member', directorate: 'Directorate', faculty: 'Faculty', admin: 'Admin', alumni: 'Alumni', guest: 'Guest' };
        var byRole = pm.byRole || {};
        return pageHead('Admin portal', 'Roles & Permissions', 'This matrix comes from the server\'s real role guards — each role shows exactly which collections it may write to.') +
          '<section class="panel"><div class="panel-head"><h3>Role permission matrix</h3><span class="badge badge-gold">Live from server</span></div><div class="panel-body">' +
          table(['Role', 'Collections that can be written', 'Records'], Object.keys(byRole).map(function (r) {
            var list = byRole[r] || [];
            return ['<b>' + esc(roleNames[r] || r) + '</b>',
              (list.length ? list.slice(0, 6).join(', ') + (list.length > 6 ? ' \u2026 +' + (list.length - 6) : '') : '<span class="mut">none (read-only)</span>'),
              String(list.length)];
          })) + '</div><div class="panel-foot"><span class="mut" style="font-size:.84rem">Every write is recorded in the audit log.</span>' +
          '<button class="btn btn-outline btn-sm" data-action="refresh-permissions">Refresh</button></div></section>' +
          '<section class="grid g2 mt-22">' +
          '<div class="card"><b>How this works</b><p class="mut mt-10">The server sets a writer-role for every collection. A role that is not in the list can only read that collection. The matrix comes straight from the server code, so the UI and the backend can never drift apart.</p></div>' +
          '<div class="card card-green"><b style="color:#fff">Security notes</b><ul class="checked-list mt-16"><li>Admin-only routes for user and content management</li><li>Faculty can review but never edit records</li><li>Every approval, edit and status change is logged with time</li></ul></div>' +
          '</section>';
      }
      return pageHead('Admin portal', 'Roles & Permissions', 'Role-based control comes from the server.') +
        '<section class="panel"><div class="panel-body"><b>Server offline</b>' +
        '<p class="mut mt-6" style="font-size:.9rem">The real permission matrix lives inside the server — start the server to see the collections for all 7 roles herengi.</p></div></section>' +
        '<section class="panel mt-22"><div class="panel-head"><h3>Role permission matrix</h3><span class="badge badge-gold">Admin only</span></div><div class="panel-body">' +
        table(['Role', 'Content', 'Approvals', 'Users'], S.roles.map(function (r) {
          return ['<b>' + esc(r.role) + '</b>',
            '<span class="badge ' + (r.content === 'Edit' ? 'badge-ok' : r.content === 'View' ? 'badge-line' : 'badge-info') + '">' + esc(r.content) + '</span>',
            '<span class="badge ' + (/Full|Publish/.test(r.approvals) ? 'badge-ok' : r.approvals === 'None' ? 'badge-line' : 'badge-info') + '">' + esc(r.approvals) + '</span>',
            '<span class="badge ' + (r.users === 'Manage' ? 'badge-ok' : 'badge-line') + '">' + esc(r.users) + '</span>'];
        })) + '</div></section>' +
        '<section class="grid g2 mt-22">' +
        '<div class="card"><b>Why this makes the system stronger</b><p class="mut mt-10">Role-based permissions reduce accidental edits, while the audit history makes important changes traceable. Together with search, notifications, content management and analytics, this gives the YPDC portal a complete institutional workflow.</p></div>' +
        '<div class="card card-green"><b style="color:#fff">Security notes</b><ul class="checked-list mt-16"><li>Admin-only routes for user and content management</li><li>Faculty can review but never edit records</li><li>Every approval, edit and status change is logged with time</li></ul></div>' +
        '</section>';
    },
    log: function () {
      var api = window.YPDC.api;
      if (api && api.available) {
        if (!SRV.log && !SRV.logLoading) loadAudit();
        return logPage();
      }
      return pageHead('Admin portal', 'Activity Log', 'Every login, write and approval is recorded for accountability.') +
        '<section class="panel"><div class="panel-head"><h3>Recorded activity</h3><span class="badge badge-line">' + S.activityLog.length + ' entries</span></div><div class="panel-body">' +
        table(['#', 'Action', 'Details', 'Date', 'Status'], S.activityLog.map(function (l, i) {
          return ['0' + (i + 1), '<b>' + esc(l.text) + '</b>', esc(l.meta), fmt(l.date), statusBadge(l.status)];
        })) + '</div></section>';
    },

    announcements: function () {
      var api = window.YPDC.api;
      if (api && api.available) {
        if (!SRV.annLoaded) {
          SRV.annLoaded = true;
          api.adminAnnouncements().then(function (r) { SRV.ann = r; repaint(); })
            .catch(function (e) { SRV.annError = e.message; repaint(); });
        }
        if (SRV.annError) {
          return pageHead('Admin portal', 'Announcements', 'Send one message to everyone, a role or a directorate.') +
            '<section class="panel"><div class="panel-body"><b style="color:var(--danger)">Announcements not available</b>' +
            '<p class="mut mt-6" style="font-size:.88rem">' + esc(SRV.annError) + '</p></div></section>';
        }
        if (!SRV.ann) {
          return pageHead('Admin portal', 'Announcements', 'Send one message to everyone, a role or a directorate.') +
            '<section class="panel"><div class="panel-body">Loading…</div></section>';
        }
        var a = SRV.ann;
        return pageHead('Admin portal', 'Announcements', 'One message, delivered to the bell of every selected account (table: notifications).') +
          '<section class="grid g23" style="align-items:start">' +
          '<div class="panel"><div class="panel-head"><h3>New announcement</h3><span class="badge badge-gold">Admin only</span></div>' +
          '<div class="panel-body">' +
          '<form data-form="announce">' +
          '<label class="field"><span>Title</span><input name="title" type="text" placeholder="e.g. Volunteer orientation on Friday" required></label>' +
          '<label class="field"><span>Message</span><textarea name="body" rows="4" placeholder="Write the announcement the way members should read it." required></textarea></label>' +
          '<div class="grid g2" style="gap:12px">' +
          '<label class="field"><span>Audience</span><select name="audience">' + a.audiences.map(function (o) {
            return '<option value="' + esc(o.value) + '">' + esc(o.label) + '</option>';
          }).join('') + '</select></label>' +
          '<label class="field"><span>Link they land on (optional)</span><input name="link" type="text" placeholder="#/events"></label>' +
          '</div>' +
          '<label class="flex" style="gap:10px;align-items:center;margin:6px 0 14px"><input type="checkbox" name="email" value="1" style="width:auto"><span style="font-size:.9rem">Also send it as an email (uses the email module + outbox)</span></label>' +
          '<button class="btn btn-green" type="submit">Send announcement</button>' +
          '</form></div></div>' +
          '<aside class="card"><b>Who receives it</b><ul class="checked-list mt-16">' +
          '<li style="color:var(--ink)">Bell notification for every selected account</li>' +
          '<li style="color:var(--ink)">Optional email through the outbox (SMTP ready)</li>' +
          '<li style="color:var(--ink)">Each delivery is written to the audit log</li>' +
          '</ul><div class="panel-note mt-16">Role and directorate lists come straight from the database.</div></aside></section>' +
          '<section class="panel mt-22"><div class="panel-head"><h3>Sent announcements</h3>' +
          '<span class="badge badge-line">' + a.announcements.length + ' shown</span></div><div class="panel-body">' +
          (a.announcements.length ? table(['Title', 'Message', 'Delivered', 'Sent (UTC)', 'Actions'], a.announcements.map(function (x) {
            return [
              '<b>' + esc(x.title) + '</b>',
              esc(x.body || ''),
              '<span class="badge badge-ok">' + x.delivered + ' account(s)</span>',
              (x.at || '').replace('T', ' ').slice(0, 19),
              '<button class="btn btn-xs btn-danger" data-action="del-announcement" data-nid="' + esc(x.id) + '" data-title="' + esc(x.title) + '">Delete for everyone</button>'
            ];
          })) : '<p class="mut">No announcement has been sent yet.</p>') + '</div></section>';
      }

      return pageHead('Admin portal', 'Announcements', 'Send one message to everyone, a role or a directorate.') +
        '<section class="panel"><div class="panel-body">Announcements need the server database. Start the backend and open this page again.</div></section>';
    },

    emails: function () {
      var api = window.YPDC.api;
      if (api && api.available) {
        if (!SRV.mailLoaded) {
          SRV.mailLoaded = true;
          api.adminEmails(80).then(function (r) { SRV.mail = r; repaint(); })
            .catch(function (e) { SRV.mailError = e.message; repaint(); });
        }
        if (SRV.mailError) {
          return pageHead('Admin portal', 'Email Outbox', 'Every email the system sends is recorded here.') +
            '<section class="panel"><div class="panel-body"><b style="color:var(--danger)">Outbox not available</b>' +
            '<p class="mut mt-6" style="font-size:.88rem">' + esc(SRV.mailError) + '</p></div></section>';
        }
        if (!SRV.mail) {
          return pageHead('Admin portal', 'Email Outbox', 'Every email the system sends is recorded here.') +
            '<section class="panel"><div class="panel-body">Loading…</div></section>';
        }
        var m = SRV.mail;
        var mailStatus = m.smtp
          ? '<span class="badge badge-ok">SMTP connected</span>'
          : '<span class="badge badge-gold">No SMTP — emails stay in this outbox</span>';
        return pageHead('Admin portal', 'Email Outbox', 'Every email the system sends is recorded here (table: email_logs).',
          '<button class="btn btn-outline btn-sm" data-action="refresh-emails">Refresh</button>') +
          '<section class="panel mt-16"><div class="panel-head"><h3>Where does mail go?</h3>' + mailStatus + '</div>' +
          '<div class="panel-body"><p class="mut" style="font-size:.9rem">Notifications for sign-up, applications, approvals, event registrations and password resets all pass through one email module. ' +
          (m.smtp
            ? 'SMTP is configured, so mail is delivered straight to the inbox.'
            : 'Add <b>SMTP_HOST</b>, <b>SMTP_USER</b> and <b>SMTP_PASS</b> to <b>backend/server/.env</b> and every message below starts being delivered — nothing else changes.') +
          ' Sender: <b>' + esc(m.from) + '</b>.</p></div></section>' +
          '<section class="panel mt-16"><div class="panel-head"><h3>Recent emails</h3>' +
          '<span class="badge badge-line">' + m.emails.length + ' shown</span></div>' +
          '<div class="panel-body">' + (m.emails.length ? table(['When (UTC)', 'To', 'Subject', 'Template', 'Status'], m.emails.map(function (e) {
            var st = e.status === 'sent' ? '<span class="badge badge-ok">sent</span>'
              : e.status === 'failed' ? '<span class="badge" style="background:#FDECEC;color:var(--danger)">failed</span>'
              : '<span class="badge badge-line">outbox</span>';
            return [
              (e.at || '').replace('T', ' ').slice(0, 19),
              esc(e.to_email),
              '<b>' + esc(e.subject) + '</b>' + (e.body ? '<details class="mt-6"><summary class="mut" style="font-size:.78rem;cursor:pointer">Read the message</summary><pre class="mail-body">' + esc(e.body) + '</pre></details>' : ''),
              esc(e.template || '—'),
              st
            ];
          })) : '<p class="mut">No email has been sent yet from this database.</p>') + '</div></section>';
      }

      return pageHead('Admin portal', 'Email Outbox', 'Every email the system sends is recorded here.') +
        '<section class="panel"><div class="panel-body">The outbox needs the server database. Start the backend and open this page again.</div></section>';
    },

    settings: function () {
      var api = window.YPDC.api;
      return pageHead('Admin portal', 'Settings', 'Portal configuration, notifications and data tools.') +
        '<section class="grid g2">' +
        '<div class="card"><b>Portal configuration</b>' +
        '<p class="mut mt-10" style="font-size:.9rem">These values come from the server config (backend/server/.env and database settings).</p>' +
        '<div class="field mt-16"><span>Portal name</span><input value="' + esc(S.site.name || 'YPDC UON') + '" readonly></div>' +
        '<div class="field"><span>Induction session</span><input value="' + esc(S.cabinet.session || '') + '" readonly></div>' +
        '<div class="field"><span>Site mode</span><input value="' + (api && api.available ? 'Live — server database (' + (api.counts ? (api.counts.users + ' users · ' + api.counts.messages + ' messages · ' + api.counts.applications + ' applications') : 'live') + ')' : 'Offline (server not running)') + '" readonly></div>' +
        '<div class="panel-note mt-16">Notifications and email are controlled by server settings — no toggle here, only the real value.</div></div>' +
        '<div class="card"><b>Data tools</b><p class="mut mt-10" style="font-size:.9rem">All data lives in the server database (SQLite). From here you can refresh the data or take a backup.</p>' +
        '<div class="btn-row mt-16"><button class="btn btn-green btn-sm" data-action="refresh-data">Refresh data</button>' +
        '<button class="btn btn-outline btn-sm" data-action="export-all">Export JSON (backup)</button>' +
        '<button class="btn btn-outline btn-sm" data-action="export-accounts">Export accounts CSV</button></div>' +
        '<div class="panel-note mt-16">Available on the server: ' + (api && api.counts ? Object.keys(api.counts).map(function (k) { return k + ': ' + api.counts[k]; }).join(' · ') : 'offline') + '</div>' +
        '<div class="panel-note mt-10">The website has no "reset" button — whatever is written on the server is the real record.</div></div>' +
        '<div class="card"><b>My account</b><p class="mut mt-10" style="font-size:.9rem">Your own sign-in details. Role and email cannot be changed from this form.</p>' +
        '<div class="mt-16">' + profileForm('admin', [['name'], ['email'], ['phone'], ['program'], ['city']]) + '</div></div>' +
        '</section>';
    }
  };
})();

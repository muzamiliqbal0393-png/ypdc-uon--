(function () {
  'use strict';

  var S = window.YPDC.state;
  var A = window.YPDC.actions;
  var esc = window.App.esc, fmt = window.App.fmtDate, I = window.App.I, img = window.App.img, ini = window.App.initials;
  var PP = window.PublicPages;

  var NAV = {
    student: [
      ['dashboard', 'Dashboard'], ['profile', 'Profile'], ['myteam', 'My Team'], ['membership', 'Membership'], ['events', 'Events'],
      ['registration', 'Event Registration'], ['volunteer', 'Volunteer'], ['attendance', 'Attendance'],
      ['certificates', 'Certificates'], ['achievements', 'Achievements'], ['feedback', 'Feedback / Comments']
    ],
    member: [
      ['dashboard', 'Dashboard'], ['profile', 'Profile & Member ID'], ['myteam', 'My Team'], ['directorate', 'Directorate'],
      ['responsibilities', 'Responsibilities'], ['tasks', 'Tasks'], ['duties', 'Events / Duties'],
      ['attendance', 'Attendance'], ['reports', 'Reports']
    ],
    directorate: [
      ['dashboard', 'Dashboard'], ['profile', 'Directorate Profile'], ['leadership', 'Leadership'],
      ['team', 'Team Members'], ['objectives', 'Objectives'], ['workplan', 'Work Plan'],
      ['tasks', 'Tasks'], ['proposals', 'Event Proposals']
    ],
    faculty: [
      ['dashboard', 'Dashboard'], ['profile', 'Faculty Profile'], ['department', 'Department'],
      ['role', 'YPDC Role'], ['events', 'Events'], ['activities', 'Volunteer Activities'],
      ['approvals', 'Approvals'], ['reports', 'Reports']
    ],
    admin: [
      ['dashboard', 'Dashboard'], ['people', 'People Directory'], ['members', 'General Members'],
      ['directorates', 'Directorates & Posts'], ['faculty', 'Faculty'], ['teams', 'Team Management'], ['events', 'Events'],
      ['induction', 'Induction Drive'], ['shaheen', 'Bano Shaheen'], ['applications', 'Applications DB'], ['analytics', 'Analytics'],
      ['content', 'Website Content'], ['cabinet', 'Cabinet Editor'], ['highlights', 'Highlights & Picks'],
      ['roles', 'Roles & Permissions'], ['announcements', 'Announcements'], ['log', 'Activity Log'], ['emails', 'Email Outbox'], ['settings', 'Settings']
    ],
    alumni: [
      ['dashboard', 'Dashboard'], ['profile', 'Alumni Profile'], ['academic', 'Academic Info'],
      ['professional', 'Professional Info'], ['skills', 'Skills'], ['network', 'Alumni Network'],
      ['mentorship', 'Mentorship'], ['careers', 'Careers']
    ],
    guest: [
      ['dashboard', 'Public Home'], ['about', 'About YPDC'], ['vision', 'Vision & Mission'],
      ['leadership', 'Leadership'], ['directorates', 'Directorates'], ['projects', 'Projects'],
      ['events', 'Events'], ['news', 'News'], ['achievements', 'Achievements'], ['gallery', 'Gallery'],
      ['publications', 'Publications'], ['feedback', 'Feedback / Comments']
    ]
  };

  var HERO = {
    student: { eyebrow: 'Learn · Lead · Participate', title: 'Your campus journey, all in one place.', text: 'Discover events, register, volunteer, track attendance, collect certificates and turn participation into visible achievement.', welcome: 'Volunteer Workspace', focus: 'Peace Leadership Summit', focusText: 'Your next registered activity is ready. Review schedule, venue, participation status and volunteer opportunities.' },
    member: { eyebrow: 'Serve · Contribute · Grow', title: 'Turn responsibility into measurable impact.', text: 'A focused workspace for your member identity, directorate, responsibilities, tasks, event duties, attendance and performance.', welcome: 'General Member Workspace', focus: 'Community Action Duty', focusText: 'View assigned responsibilities, reporting time and completion status for the upcoming community initiative.' },
    directorate: { eyebrow: 'Plan · Coordinate · Deliver', title: 'Lead your team with clarity and purpose.', text: 'Coordinate leadership, objectives, work plans, team responsibilities, activities, proposals, documents and performance.', welcome: 'Directorate Workspace', focus: 'Directorate Work Plan', focusText: 'Monitor objectives, task ownership, upcoming activities and proposal status from one command-focused workspace.' },
    faculty: { eyebrow: 'Guide · Review · Enable', title: 'Oversight designed for meaningful student growth.', text: 'Review YPDC activities, student participation, approvals, reports and feedback while keeping faculty oversight simple and visible.', welcome: 'Faculty Workspace', focus: 'Pending Activity Approvals', focusText: 'Open the activity queue to approve, request changes or add guidance.' },
    admin: { eyebrow: 'Manage · Govern · Analyze', title: 'One command center for the entire YPDC ecosystem.', text: 'Manage users, members, directorates, faculty, events, applications, attendance, certificates, reports, content and permissions.', welcome: 'Admin Workspace', focus: 'System Overview', focusText: 'Track approvals, user activity, event operations and certificate issuance with direct access to management workflows.' },
    alumni: { eyebrow: 'Connect · Mentor · Advance', title: 'Stay connected. Give back. Keep growing.', text: 'Build your alumni profile, network with peers, mentor students, explore opportunities and support the next generation of YPDC.', welcome: 'Alumni Workspace', focus: 'Mentorship & Career Network', focusText: 'New mentorship requests and career opportunities are available in your network. Connect, guide and collaborate.' },
    guest: { eyebrow: 'Discover · Connect · Participate', title: 'Discover the people, projects and purpose behind YPDC UON.', text: 'A public gateway to leadership, directorates, projects, events, news, achievements, gallery, publications and opportunities to get involved.', welcome: 'Guest / Public Workspace', focus: 'Explore YPDC UON', focusText: 'Open public information, discover events and projects, or continue to membership and volunteer registration.' }
  };

  var QUICK = {
    student: [['Membership', 'membership'], ['Event Registration', 'registration'], ['Volunteer', 'volunteer'], ['Certificates', 'certificates']],
    member: [['Member ID', 'profile'], ['My Directorate', 'directorate'], ['Tasks', 'tasks'], ['Reports', 'reports']],
    directorate: [['Leadership', 'leadership'], ['Team Members', 'team'], ['Work Plan', 'workplan'], ['Event Proposals', 'proposals']],
    faculty: [['YPDC Role', 'role'], ['Activities', 'activities'], ['Approvals', 'approvals'], ['Reports', 'reports']],
    admin: [['User Management', 'people'], ['Applications', 'applications'], ['Analytics', 'analytics'], ['Roles & Permissions', 'roles']],
    alumni: [['Alumni Network', 'network'], ['Mentorship', 'mentorship'], ['Careers', 'careers'], ['Volunteer', 'mentorship']],
    guest: [['About YPDC', 'about'], ['Events', 'events'], ['Membership', 'projects'], ['Volunteer', 'projects']]
  };

  var PHOTO = {
    student: 'portal-student.jpg',
    member: 'portal-member.jpg',
    directorate: 'portal-directorate.jpg',
    faculty: 'portal-faculty.jpg',
    admin: 'portal-admin.jpg',
    alumni: 'portal-student.jpg',
    guest: 'portal-admin.jpg'
  };

  function heroBlock(role) {
    var h = HERO[role];
    return '<section class="phero">' +
      '<div class="phero-cover" aria-hidden="true">' +
      '<img src="' + img(PHOTO[role]) + '" alt="">' +
      '<span class="phero-cover-label">— YPDC UON</span></div>' +
      '<div class="phero-body"><div class="phero-copy">' +
      '<span class="eyebrow">' + esc(h.eyebrow) + '</span>' +
      '<h2>' + esc(h.title) + '</h2>' +
      '<p>' + esc(h.text) + '</p></div>' +
      '<div class="welcome-box"><span class="eyebrow">Welcome</span>' +
      '<h4>' + esc(h.welcome) + '</h4>' +
      '<p>Everything important for this role is organized here — current activity, quick actions, updates and progress.</p></div>' +
      '</div></section>';
  }

  function stats(items) {
    return '<section class="grid g4">' + items.map(function (s) {
      return '<div class="stat' + (s.style ? ' ' + s.style : '') + (s.zero ? ' is-zero' : '') + '">' +
        '<span class="stat-label">' + esc(s.label) + '</span>' +
        '<span class="stat-value">' + esc(s.value) + '</span>' +
        (s.ring ? '<div class="ring gold" style="--p:' + s.ring + '" data-label="' + s.ring + '%"></div>' : '') +
        (s.sub ? '<span class="stat-sub">' + esc(s.sub) + '</span>' : '') + '</div>';
    }).join('') + '</section>';
  }

  function emptyNote(title, sub, extraHTML, onDark) {
    return '<div class="empty-block' + (onDark ? ' on-dark' : '') + '"><b>' + esc(title) + '</b>' +
      (sub ? '<p class="mut mt-6">' + esc(sub) + '</p>' : '') +
      (extraHTML || '') + '</div>';
  }

  function csvCell(v) {
    var s = (v == null ? '' : String(v)).replace(/"/g, '""');
    return /[",\n]/.test(s) ? '"' + s + '"' : s;
  }
  function download(filename, text, mime) {
    try {
      var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
      return true;
    } catch (e) { return false; }
  }
  function exportCsv(name, rows) {
    var csv = rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
    return download(name + '-' + new Date().toISOString().slice(0, 10) + '.csv', '\ufeff' + csv, 'text/csv;charset=utf-8');
  }
  function exportJson(name, obj) {
    return download(name + '-' + new Date().toISOString().slice(0, 10) + '.json',
      JSON.stringify(obj, null, 2), 'application/json');
  }

  function statNum(n, label, sub, extra) {
    var o = { label: label, value: String(n), sub: sub, zero: !n };
    if (extra && extra.style) o.style = extra.style;
    if (extra && extra.ring != null) o.ring = extra.ring;
    return o;
  }

  function num(n) { return String(n == null ? 0 : n); }

  function quickAccess(role) {
    return '<aside class="quick-card"><span class="eyebrow">Quick access</span>' +
      '<h3 style="color:#fff;margin-top:8px">Move faster.</h3>' +
      (QUICK[role] || []).map(function (l) {
        return '<button class="qa" style="width:100%;text-align:left" data-action="goto" data-go="#/portal/' + role + '/' + l[1] + '">' +
          esc(l[0]) + ' <span>→</span></button>';
      }).join('') + '</aside>';
  }

  function nextFocus(role) {
    var S = PC.S, fmt = PC.fmt, soon = function (a) { return (a || []).slice().sort(function (x, y) { return String(x.date || '').localeCompare(String(y.date || '')); })[0]; };
    var ev = soon((S.events || []).filter(function (e) { return e.status === 'Upcoming'; }));
    if (role === 'student' || role === 'guest') {
      if (!ev) return null;
      var place = ev.venue || ev.place || ev.location || '';
      return { title: ev.title, text: [fmt(ev.date), ev.time, place].filter(Boolean).join(' · ') };
    }
    if (role === 'member') {
      var duty = soon(S.duties) || soon((S.tasks || []).filter(function (t) { return t.status !== 'Done'; }));
      if (!duty) return null;
      return duty.event ? { title: duty.title || duty.event, text: duty.event + ' · ' + fmt(duty.date) + ' · ' + (duty.time || '') } : { title: duty.title || 'Task', text: (duty.status || '') + ' · ' + fmt(duty.date) };
    }
    if (role === 'directorate') {
      var w = (S.workplan || []).filter(function (x) { return Number(x.progress) < 100; })[0];
      return w ? { title: w.objective, text: (w.owner || '') + ' · ' + (w.quarter || '') + ' · ' + w.progress + '% complete' } : null;
    }
    if (role === 'faculty') {
      var a = (S.facultyActivities || []).filter(function (x) { return x.status === 'Pending'; })[0];
      return a ? { title: a.title, text: (a.directorate || '') + ' · ' + (a.students || 0) + ' students · ' + fmt(a.date) } : null;
    }
    if (role === 'admin') {
      var p = (S.applications || []).filter(function (x) { return x.status === 'New' || x.status === 'Pending'; })[0];
      return p ? { title: p.name + ' — ' + (p.program || 'Application'), text: 'Induction application · ' + fmt(p.date) } : null;
    }
    if (role === 'alumni') {
      var m = (S.mentorship || [])[0];
      return m ? { title: m.topic || 'Mentorship request', text: (m.student || '') + ' · ' + (m.program || '') } : null;
    }
    return null;
  }

  function focusPanel(role) {
    var f = nextFocus(role);
    var title = f ? f.title : 'No activity scheduled yet';
    var text = f ? f.text : 'Nothing is listed for you right now — as soon as real records are added (events, duties, tasks, applications), your next focus appears here.';
    return '<div class="panel focus-panel">' +
      '<div class="focus-media"><img src="' + img(PHOTO[role]) + '" alt="YPDC UON"></div>' +
      '<div class="panel-body">' +
      '<span class="eyebrow">Next focus</span><h3 class="mt-10">' + esc(title) + '</h3>' +
      '<p class="mut mt-10">' + esc(text) + '</p>' +
      '</div></div>';
  }

  function pageHead(eyebrow, title, sub, actionHTML) {
    return '<div class="flex-between flex-wrap"><div class="page-title">' +
      '<span class="eyebrow">' + esc(eyebrow) + '</span><h2 class="mt-6">' + esc(title) + '</h2>' +
      (sub ? '<p class="mut mt-6" style="max-width:70ch">' + esc(sub) + '</p>' : '') + '</div>' +
      (actionHTML ? '<div class="btn-row">' + actionHTML + '</div>' : '') + '</div>';
  }

  function table(head, rows, minW) {
    if (!rows || !rows.length) {
      return emptyNote('No records yet', 'Records appear here as soon as data is added from the admin panel.',
        '<div class="btn-row mt-16" style="justify-content:center"><a class="btn btn-outline btn-sm" href="#/portal/admin/dashboard">Admin panel</a></div>');
    }
    return '<div class="table-wrap"><table class="table"' + (minW ? ' style="min-width:' + minW + 'px"' : '') + '>' +
      '<thead><tr>' + head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead>' +
      '<tbody>' + rows.map(function (r) {
        return '<tr>' + r.map(function (c, i) {
          return '<td data-label="' + esc(head[i] || '') + '">' + c + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  function statusBadge(s) {
    var map = { 'Active': 'badge-ok', 'Approved': 'badge-ok', 'Done': 'badge-ok', 'Published': 'badge-gold', 'Completed': 'badge-ok', 'Issued': 'badge-ok', 'Present': 'badge-ok', 'Registered': 'badge-info', 'Upcoming': 'badge-info', 'In Progress': 'badge-info', 'Pending': 'badge-warn', 'Pending confirmation': 'badge-warn', 'Shortlisted': 'badge-warn', 'Changes Requested': 'badge-warn', 'Processing': 'badge-warn', 'Draft': 'badge-warn', 'At Risk': 'badge-warn', 'New': 'badge-info', 'Requested': 'badge-info', 'Scheduled': 'badge-info', 'Assigned': 'badge-info', 'Rejected': 'badge-danger', 'Absent': 'badge-danger', 'Inactive': 'badge-danger', 'Open': 'badge-ok', 'On Track': 'badge-ok' };
    return '<span class="badge ' + (map[s] || 'badge-line') + '">' + esc(s) + '</span>';
  }

  function pretty(k) {
    return String(k).replace(/([A-Z])/g, ' $1').replace(/^./, function (c) { return c.toUpperCase(); })
      .replace(/^Reg$/, 'Registration No').replace(/Cgpa/i, 'CGPA');
  }
  function profileForm(role, fields) {
    var p = S.profiles[role] || {};
    return '<form data-form="profile"><input type="hidden" name="roleKey" value="' + role + '">' +
      '<div class="form-grid">' + fields.map(function (f) {
        var val = p[f[0]] == null ? '' : p[f[0]];
        var full = f[2] ? ' full' : '';
        if (f[1] === 'textarea') return '<label class="field full"><span>' + esc(pretty(f[0])) + '</span><textarea name="' + f[0] + '">' + esc(val) + '</textarea></label>';
        if (f[0] === 'email') return '<label class="field' + full + '"><span>Email (cannot be changed)</span><input name="email" value="' + esc(val) + '" readonly style="background:#F3F5F4;color:var(--muted)"></label>';
        return '<label class="field' + full + '"><span>' + esc(pretty(f[0])) + '</span><input name="' + f[0] + '" value="' + esc(val) + '"></label>';
      }).join('') + '</div>' +
      '<div class="btn-row"><button class="btn btn-green" type="submit">Save profile</button>' +
      '<button class="btn btn-outline" type="reset">Reset fields</button></div></form>';
  }

  var SEC = {};

  function taskRow(t) {
    return '<div class="list-row"><span class="av soft">' + (t.status === 'Done' ? '✓' : '!') + '</span>' +
      '<div class="txt"><b>' + esc(t.title) + '</b><small>' + esc(t.owner) + ' · due ' + fmt(t.due) + ' · ' + esc(t.priority) + ' priority</small></div>' +
      statusBadge(t.status) +
      '<button class="btn btn-xs btn-quiet" data-action="task-status" data-id="' + t.id + '" data-status="' + (t.status === 'Done' ? 'Pending' : 'Done') + '">' +
      (t.status === 'Done' ? 'Reopen' : 'Done') + '</button></div>';
  }

  /* ---- Batch E: charts (pure inline SVG — server data, koi dummy value nahi) ---- */
  var TONE = ['#0B4A24', '#2F8F5B', '#106934', '#59C17A', '#35594A', '#7FBFA0'];

  function chartCard(title, sub, svg, foot) {
    return '<section class="panel chart-card"><div class="panel-head"><h3>' + esc(title) + '</h3>' +
      (sub ? '<span class="badge badge-line">' + esc(sub) + '</span>' : '') + '</div>' +
      '<div class="panel-body">' + svg + '</div>' +
      (foot ? '<div class="panel-foot"><span class="mut" style="font-size:.84rem">' + foot + '</span></div>' : '') +
      '</section>';
  }

  function chartEmpty(msg) {
    return '<div class="chart-empty"><b>Nothing to plot yet</b><p class="mut">' + esc(msg) + '</p></div>';
  }

  // horizontal bars — {label, value, note}
  function barChart(items, opts) {
    opts = opts || {};
    var max = Math.max.apply(null, items.map(function (i) { return Number(i.value) || 0; }).concat([1]));
    if (!items.length) return chartEmpty('No rows to show.');
    return '<div class="chart-bars">' + items.map(function (it, i) {
      var v = Number(it.value) || 0;
      var pct = Math.max(v ? 3 : 0, Math.round((v / max) * 100));
      return '<div class="cbar">' +
        '<div class="cbar-top"><span>' + esc(it.label) + '</span><b>' + esc(String(v)) + (opts.unit ? ' ' + esc(opts.unit) : '') + '</b></div>' +
        '<div class="cbar-track"><span style="width:' + pct + '%;background:' + (it.tone || TONE[i % TONE.length]) + '"></span></div>' +
        (it.note ? '<div class="cbar-note mut">' + esc(it.note) + '</div>' : '') +
        '</div>';
    }).join('') + '</div>';
  }

  // donut — {label, value}, center total
  function donutChart(items, opts) {
    opts = opts || {};
    var total = items.reduce(function (a, i) { return a + (Number(i.value) || 0); }, 0);
    if (!total) return chartEmpty('No rows to show.');
    var r = 52, cx = 70, cy = 70, C = 2 * Math.PI * r, off = 0;
    var arcs = items.map(function (it, i) {
      var v = Number(it.value) || 0;
      var len = (v / total) * C;
      var seg = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + (it.tone || TONE[i % TONE.length]) + '" stroke-width="20" ' +
        'stroke-dasharray="' + len.toFixed(2) + ' ' + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" ' +
        'transform="rotate(-90 ' + cx + ' ' + cy + ')"><title>' + esc(it.label) + ': ' + v + '</title></circle>';
      off += len;
      return seg;
    }).join('');
    var legend = '<div class="chart-legend">' + items.map(function (it, i) {
      var v = Number(it.value) || 0;
      return '<div class="lg-row"><span class="lg-dot" style="background:' + (it.tone || TONE[i % TONE.length]) + '"></span>' +
        '<span class="lg-label">' + esc(it.label) + '</span><b>' + v + '</b>' +
        '<span class="mut">' + Math.round((v / total) * 100) + '%</span></div>';
    }).join('') + '</div>';
    return '<div class="chart-donut"><svg viewBox="0 0 140 140" class="donut" role="img" aria-label="' + esc(opts.aria || 'Donut chart') + '">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#E7E0D0" stroke-width="20"></circle>' + arcs +
      '<text x="70" y="66" text-anchor="middle" class="donut-num">' + total + '</text>' +
      '<text x="70" y="84" text-anchor="middle" class="donut-cap">' + esc(opts.center || 'Total') + '</text>' +
      '</svg>' + legend + '</div>';
  }

  // grouped columns — series: [{key,label,tone}], rows: [{label, values:{key:number}}]
  function columnChart(rows, seriesList, opts) {
    opts = opts || {};
    if (!rows.length) return chartEmpty('No months to show.');
    var W = 640, H = 240, pad = 34, bottom = 42;
    var max = 1;
    rows.forEach(function (r) { seriesList.forEach(function (s) { max = Math.max(max, Number(r.values[s.key]) || 0); }); });
    var step = (W - pad * 2) / rows.length;
    var barW = Math.max(6, Math.min(18, (step - 12) / seriesList.length));
    var grid = [0, 0.25, 0.5, 0.75, 1].map(function (p) {
      var y = pad + (H - pad - bottom) * (1 - p);
      return '<line x1="' + pad + '" y1="' + y + '" x2="' + (W - pad) + '" y2="' + y + '" class="grid-line"></line>' +
        '<text x="' + (pad - 6) + '" y="' + (y + 4) + '" text-anchor="end" class="axis">' + Math.round(max * p) + '</text>';
    }).join('');
    var cols = rows.map(function (r, i) {
      var x0 = pad + i * step + (step / 2) - (barW * seriesList.length) / 2;
      var bars = seriesList.map(function (s, k) {
        var v = Number(r.values[s.key]) || 0;
        var h = Math.round(((H - pad - bottom) * v) / max);
        return '<rect x="' + (x0 + k * barW).toFixed(1) + '" y="' + (H - bottom - h) + '" width="' + barW + '" height="' + h + '" rx="2" fill="' + (s.tone || TONE[k % TONE.length]) + '">' +
          '<title>' + esc(r.label + ' · ' + s.label + ': ' + v) + '</title></rect>';
      }).join('');
      return bars + '<text x="' + (pad + i * step + step / 2).toFixed(1) + '" y="' + (H - bottom + 18) + '" text-anchor="middle" class="axis">' + esc(r.label) + '</text>';
    }).join('');
    var legend = '<div class="chart-legend inline">' + seriesList.map(function (s, k) {
      return '<span class="lg-row"><span class="lg-dot" style="background:' + (s.tone || TONE[k % TONE.length]) + '"></span>' + esc(s.label) + '</span>';
    }).join('') + '</div>';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="columns" role="img" aria-label="' + esc(opts.aria || 'Column chart') + '">' +
      grid + cols + '</svg>' + legend;
  }

  /* ---- Batch F: event calendar (monthly grid, mobile friendly) ---- */
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function todayYmd() { return ymd(new Date()); }

  function calState() {
    var Y = window.YPDC;
    if (!Y.cal || !/^\d{4}-\d{2}$/.test(Y.cal.ym || '')) {
      var n = new Date();
      Y.cal = { ym: n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') };
    }
    return Y.cal;
  }

  function shiftMonth(ym, delta) {
    var parts = ym.split('-'), d = new Date(Number(parts[0]), Number(parts[1]) - 1 + delta, 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function eventsInMonth(ym) {
    return (S.events || []).filter(function (e) { return String(e.date || '').slice(0, 7) === ym; })
      .sort(function (a, b) { return String(a.date).localeCompare(String(b.date)) || String(a.time || '').localeCompare(String(b.time || '')); });
  }

  function calChip(e) {
    return '<button class="cal-ev' + (e.status === 'Completed' ? ' past' : '') + '" data-action="cal-open" data-id="' + esc(e.id) + '" title="' +
      esc(e.title + ' \u00b7 ' + (e.time || '') + ' \u00b7 ' + (e.venue || e.location || '')) + '">' +
      '<span class="cal-dot"></span><b>' + esc(e.title) + '</b></button>';
  }

  function calendarBlock(opts) {
    opts = opts || {};
    var st = calState();
    var ym = opts.ym || st.ym;
    var parts = ym.split('-'), year = Number(parts[0]), month = Number(parts[1]) - 1;
    var first = new Date(year, month, 1);
    var start = (first.getDay() + 6) % 7;                       // Monday-first grid
    var days = new Date(year, month + 1, 0).getDate();
    var list = eventsInMonth(ym);
    var byDay = {};
    list.forEach(function (e) { var d = Number(String(e.date).slice(8, 10)); (byDay[d] = byDay[d] || []).push(e); });
    var today = todayYmd();

    var cells = '';
    for (var i = 0; i < start; i++) cells += '<div class="cal-cell cal-cell-empty"></div>';
    for (var d = 1; d <= days; d++) {
      var dateStr = ym + '-' + String(d).padStart(2, '0');
      var evs = byDay[d] || [];
      cells += '<div class="cal-cell' + (dateStr === today ? ' is-today' : '') + (evs.length ? ' has-events' : '') + '" data-day="' + dateStr + '">' +
        '<span class="cal-day">' + d + '</span>' +
        '<div class="cal-evs">' + evs.slice(0, 3).map(calChip).join('') +
        (evs.length > 3 ? '<button class="cal-more" data-action="cal-day" data-day="' + dateStr + '">+' + (evs.length - 3) + ' more</button>' : '') +
        '</div></div>';
    }
    var pad = (7 - ((start + days) % 7)) % 7;
    for (var j = 0; j < pad; j++) cells += '<div class="cal-cell cal-cell-empty"></div>';

    var agenda = list.length
      ? '<div class="cal-agenda">' + list.map(function (e) {
          return '<div class="cal-agenda-row"><span class="cal-agenda-date">' + fmt(e.date).slice(0, 6) + '</span>' +
            '<div class="txt"><b>' + esc(e.title) + '</b><small>' + esc(e.time || '') + ' \u00b7 ' + esc(e.venue || e.location || '') + ' \u00b7 ' + esc(e.status || '') + '</small></div>' +
            '<button class="btn btn-xs btn-quiet" data-action="cal-open" data-id="' + esc(e.id) + '">Details</button></div>';
        }).join('') + '</div>'
      : '<div class="cal-empty"><b>No events this month</b><p class="mut">' + esc(opts.emptyNote || 'Use the arrows to look at another month.') + '</p></div>';

    var upcoming = (S.events || []).filter(function (e) { return String(e.date || '') >= today && e.status !== 'Completed'; }).length;

    return '<section class="panel cal-panel' + (opts.mt === false ? '' : ' mt-22') + '">' +
      '<div class="panel-head cal-head"><div><h3>' + esc(opts.title || 'Event calendar') + '</h3>' +
      '<span class="mut" style="font-size:.84rem">' + MONTHS[month] + ' ' + year + ' \u00b7 ' + list.length + ' event' + (list.length === 1 ? '' : 's') +
      (upcoming ? ' \u00b7 ' + upcoming + ' upcoming' : '') + '</span></div>' +
      '<div class="cal-nav">' +
      '<button class="btn btn-xs btn-quiet" data-action="cal-prev" aria-label="Previous month">\u2039</button>' +
      '<button class="btn btn-xs btn-outline" data-action="cal-today">Today</button>' +
      '<button class="btn btn-xs btn-quiet" data-action="cal-next" aria-label="Next month">\u203a</button>' +
      '</div></div>' +
      '<div class="panel-body">' +
      '<div class="cal-wrap">' +
      '<div class="cal-grid cal-dow">' + DOW.map(function (x) { return '<div class="cal-dow-cell">' + x + '</div>'; }).join('') + '</div>' +
      '<div class="cal-grid cal-body">' + cells + '</div>' +
      '</div>' +
      '<div class="cal-list-head"><b>' + MONTHS[month] + ' ' + year + '</b>' +
      '<span class="mut" style="font-size:.82rem">Tap an event for date, venue, description and registration status.</span></div>' +
      agenda +
      '</div></section>';
  }

  window.PC = {
    S: S, A: A, esc: esc, fmt: fmt, I: I, img: img, ini: ini, PP: PP,
    NAV: NAV, HERO: HERO, QUICK: QUICK, SEC: SEC, PHOTO: PHOTO,
    heroBlock: heroBlock, stats: stats, quickAccess: quickAccess, focusPanel: focusPanel, num: num,
    pageHead: pageHead, table: table, statusBadge: statusBadge, pretty: pretty,
    profileForm: profileForm, taskRow: taskRow, statNum: statNum, emptyNote: emptyNote,
    exportCsv: exportCsv, exportJson: exportJson, download: download,
    charts: { card: chartCard, empty: chartEmpty, bars: barChart, donut: donutChart, columns: columnChart, tones: TONE },
    calendar: calendarBlock, calState: calState, shiftMonth: shiftMonth, eventsInMonth: eventsInMonth,
    monthName: function (ym) {
      var p = String(ym || '').split('-');
      return (MONTHS[Number(p[1]) - 1] || '') + ' ' + (p[0] || '');
    }
  };
})();

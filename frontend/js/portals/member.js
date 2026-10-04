(function () {
  'use strict';
  var PC = window.PC;

  function attPct() {
    var rows = S.attendance || [];
    var present = rows.filter(function (a) { return a.status === 'Present'; }).length;
    var absent = rows.filter(function (a) { return a.status === 'Absent'; }).length;
    return (present + absent) ? Math.round((present / (present + absent)) * 100) : 0;
  }
  function dutyCount(word) {
    return (S.duties || []).filter(function (d) { return String(d.status).toLowerCase().indexOf(word) > -1; }).length;
  }
  function perfSnapshot() {
    var tasks = (S.tasks || []).filter(function (t) { return t.role === 'member'; });
    var done = tasks.filter(function (t) { return t.status === 'Done'; }).length;
    var reports = S.reports || [];
    var sent = reports.filter(function (r) { return String(r.status || '').toLowerCase().indexOf('submit') > -1; }).length;
    if (!tasks.length && !(S.attendance || []).length && !reports.length) {
      return '<aside class="card"><b>Performance snapshot</b><p class="mut mt-10">No performance records yet — as soon as tasks, attendance and reports are recorded, the figures appear here.</p></aside>';
    }
    var bar = function (label, pct) {
      return '<div class="bar-row"><div class="top"><span>' + label + '</span><b>' + pct + '%</b></div><div class="bar"><span style="width:' + pct + '%"></span></div></div>';
    };
    return '<aside class="card"><b>Performance snapshot</b><div class="mt-16">' +
      bar('Task completion', tasks.length ? Math.round((done / tasks.length) * 100) : 0) +
      bar('Attendance', attPct()) +
      bar('Reports submitted', reports.length ? Math.round((sent / reports.length) * 100) : 0) +
      '</div><div class="panel-note mt-10">These figures are calculated from your own records in the database.</div></aside>';
  }

  var S = PC.S, A = PC.A, esc = PC.esc, fmt = PC.fmt, I = PC.I, img = PC.img, ini = PC.ini, PP = PC.PP;
  var NAV = PC.NAV, HERO = PC.HERO, QUICK = PC.QUICK, SEC = PC.SEC;
  var heroBlock = PC.heroBlock, stats = PC.stats, quickAccess = PC.quickAccess,
      focusPanel = PC.focusPanel, pageHead = PC.pageHead, table = PC.table,
      statusBadge = PC.statusBadge, pretty = PC.pretty, profileForm = PC.profileForm,
      taskRow = PC.taskRow;
  SEC.member = {
    dashboard: function () {
      var p = S.profiles.member;
      var myTasks = S.tasks.filter(function (t) { return t.role === 'member'; });
      return heroBlock('member') +
        stats([
          { label: 'Event duties', value: PC.num(S.duties.length), sub: 'Assigned this term' },
          { label: 'Active tasks', value: PC.num(myTasks.filter(function (t) { return t.status !== 'Done'; }).length), sub: 'Pending + in progress', style: 'gold' },
          { label: 'Attendance', value: attPct() + '%', sub: (S.attendance.length ? 'Calculated from records' : 'No attendance records yet'), ring: attPct() },
          { label: 'Reports', value: PC.num(S.reports.length), sub: 'Submitted & drafts' }
        ]) +
        '<section class="grid g23" style="align-items:start">' +
        focusPanel('member') +
        quickAccess('member') + '</section>' +
        '<div class="grid" style="gap:16px">' +
        '<div class="panel"><div class="panel-head"><h3>My tasks</h3>' +
        '<button class="btn btn-xs btn-quiet" data-action="goto" data-go="#/portal/member/tasks">All tasks</button></div>' +
        '<div class="panel-body" style="padding-top:6px;padding-bottom:6px">' + myTasks.slice(0, 4).map(taskRow).join('') + '</div></div>' +
        '<div class="panel"><div class="panel-head"><h3>Event duties</h3><span class="badge badge-gold">' + esc(p.directorate) + '</span></div>' +
        '<div class="panel-body">' + table(['Duty', 'Event', 'Date', 'Reporting', 'Status'], S.duties.map(function (d) {
          return ['<b>' + esc(d.title) + '</b>', esc(d.event), fmt(d.date), esc(d.time) + ' · ' + esc(d.place), statusBadge(d.status)];
        })) + '</div></div></div>';
    },
    profile: function () {
      var p = S.profiles.member;
      return pageHead('General Member portal', 'Profile & Member ID', 'Your official YPDC membership identity.') +
        '<section class="grid g23" style="align-items:start">' +
        '<div class="panel"><div class="panel-head"><h3>Member information</h3></div><div class="panel-body">' +
        profileForm('member', [['name'], ['email'], ['memberId'], ['post'], ['directorate'], ['joined'], ['program'], ['semester'], ['phone'], ['city']]) +
        '</div></div>' +
        '<aside class="card card-green" style="background:linear-gradient(135deg,var(--green-800),var(--green-600))">' +
        '<span class="eyebrow">YPDC Member ID</span>' +
        '<div class="mt-16" style="font-family:var(--serif);font-size:1.35rem;color:var(--gold)">' + esc(p.memberId) + '</div>' +
        '<hr style="border-color:rgba(255,255,255,.2);margin:18px 0">' +
        '<div style="font-size:.88rem;color:#C6D8D1" class="grid">' +
        '<div>Name · <b style="color:#fff">' + esc(p.name) + '</b></div>' +
        '<div>Post · <b style="color:#fff">' + esc(p.post) + '</b></div>' +
        '<div>Directorate · <b style="color:#fff">' + esc(p.directorate) + '</b></div>' +
        '<div>Joined · <b style="color:#fff">' + esc(p.joined) + '</b></div></div>' +
        '<div class="mt-22"><span class="badge badge-gold">Active</span></div></aside></section>';
    },
    directorate: function () {
      var p = S.profiles.member;
      var d = S.directorates.filter(function (x) { return x.name === p.directorate; })[0] || S.directorates[0];
      return pageHead('General Member portal', 'My Directorate', d.name) +
        '<section class="grid g23" style="align-items:start">' +
        '<div class="grid" style="gap:16px">' +
        '<div class="card"><div class="flex-between"><b>' + esc(d.name) + '</b>' + statusBadge(d.status) + '</div>' +
        '<p class="mut mt-10">' + esc(d.focus) + '</p>' +
        '<div class="bar-row mt-16"><div class="top"><span class="mut" style="font-size:.82rem">Activity score</span><b>' + d.activity + '%</b></div><div class="bar"><span style="width:' + d.activity + '%"></span></div></div>' +
        '<div class="mut" style="font-size:.84rem">Lead: ' + (d.lead ? esc(d.lead) : 'not assigned yet') + ' · ' + d.members + ' members (' + d.active + ' active)</div></div>' +
        '<div class="panel"><div class="panel-head"><h3>Directorate members</h3></div><div class="panel-body">' +
        table(['Name', 'Post', 'Type', 'Status'], S.people.filter(function (x) { return x.directorate === d.name; }).map(function (x) {
          return ['<b>' + esc(x.name) + '</b>', esc(x.post || '\u2014'), esc(x.type || '\u2014'), statusBadge(x.status)];
        })) + '</div></div></div>' + quickAccess('member') + '</section>';
    },
    responsibilities: function () {
      return pageHead('General Member portal', 'Responsibilities', 'What is expected from you as an active YPDC member.') +
        '<section class="grid g23" style="align-items:start">' +
        '<div class="panel"><div class="panel-head"><h3>Standard responsibilities</h3></div><div class="panel-body">' +
        '<ul class="checked-list" style="color:inherit">' + S.responsibilities.map(function (r) {
          return '<li style="color:var(--ink)">' + esc(r) + '</li>';
        }).join('') + '</ul></div></div>' +
        perfSnapshot() + '</section>';
    },
    tasks: function () {
      var mine = S.tasks.filter(function (t) { return t.role === 'member'; });
      return pageHead('General Member portal', 'Tasks', 'Tasks assigned to you by your directorate, with status tracking.') +
        '<section class="panel"><div class="panel-head"><h3>My task list</h3><span class="badge badge-gold">' + mine.filter(function (t) { return t.status !== 'Done'; }).length + ' open</span></div>' +
        '<div class="panel-body" style="padding-top:6px;padding-bottom:6px">' + mine.map(taskRow).join('') + '</div></section>' +
        '<section class="panel mt-22"><div class="panel-head"><h3>All directorate tasks</h3></div><div class="panel-body">' +
        table(['Task', 'Owner', 'Directorate', 'Due', 'Priority', 'Status', 'Action'], S.tasks.map(function (t) {
          return ['<b>' + esc(t.title) + '</b>', esc(t.owner), esc(t.directorate), fmt(t.due),
            '<span class="badge ' + (t.priority === 'High' ? 'badge-danger' : 'badge-line') + '">' + esc(t.priority) + '</span>',
            statusBadge(t.status),
            '<button class="btn btn-xs btn-quiet" data-action="task-status" data-id="' + t.id + '" data-status="' + (t.status === 'Done' ? 'Pending' : 'Done') + '">' + (t.status === 'Done' ? 'Reopen' : 'Mark done') + '</button>'];
        })) + '</div></section>';
    },
    duties: function () {
      return pageHead('General Member portal', 'Events / Duties', 'Event duties, reporting details and completion status.') +
        (S.duties.length ? '<section class="grid g3">' + S.duties.map(function (d) {
          return '<div class="card"><div class="flex-between">' + statusBadge(d.status) + '<span class="mut" style="font-size:.78rem">' + fmt(d.date) + '</span></div>' +
            '<h4 class="mt-16">' + esc(d.title) + '</h4>' +
            '<p class="mut mt-10" style="font-size:.88rem">' + esc(d.event) + '</p>' +
            '<div class="flex-between mt-16"><span class="mut" style="font-size:.82rem">' + esc(d.time) + '</span><span class="mut" style="font-size:.82rem">' + esc(d.place) + '</span></div>' +
            '<div class="btn-row mt-16"><button class="btn btn-xs btn-green" data-action="confirm-duty" data-id="' + d.id + '">Confirm availability</button></div></div>';
        }).join('') + '</section>'
          : PC.emptyNote('No duties assigned yet', 'Duties appear here once assigned by your directorate.'));
    },
    attendance: function () {
      return pageHead('General Member portal', 'Attendance', 'Duty and event attendance verified by the HR directorate.') +
        stats([{ label: 'Attendance', value: attPct() + '%', ring: attPct(), style: 'gold', sub: 'Eligible for certificates', zero: !S.attendance.length },
          PC.statNum(dutyCount('complete'), 'Duties completed', 'Marked by HR directorate'),
          PC.statNum(dutyCount('late'), 'Late arrivals', 'Recorded'),
          PC.statNum(S.attendance.filter(function (a) { return a.status === 'Present'; }).length * 4, 'Volunteer hours', 'Calculated from attendance')]) +
        '<section class="panel mt-22"><div class="panel-head"><h3>Attendance log</h3></div><div class="panel-body">' +
        table(['Event / Duty', 'Date', 'Status'], S.attendance.map(function (a) { return [esc(a.event), fmt(a.date), statusBadge(a.status)]; })) +
        '</div></section>';
    },
    reports: function () {
      return pageHead('General Member portal', 'Reports', 'Monthly performance, duty summaries and attendance reports.') +
        '<section class="panel"><div class="panel-head"><h3>Report list</h3></div><div class="panel-body">' +
        table(['Report', 'Period', 'Submitted by', 'Date', 'Status'], S.reports.map(function (r) {
          return ['<b>' + esc(r.title) + '</b>', esc(r.period), esc(r.by), fmt(r.date), statusBadge(r.status)];
        })) + '</div></section>' +
        '<section class="grid g2 mt-22">' +
        '<div class="card"><b>Submit a duty report</b><p class="mut mt-10" style="font-size:.9rem">Write what happened at your duty, attendance count and issues — the report is saved with your directorate.</p>' +
        '<div class="field mt-16"><textarea id="report-text" placeholder="Duty report details..."></textarea></div>' +
        '<button class="btn btn-green btn-sm" data-action="submit-report">Submit report</button></div>' +
        '<div class="card"><b>Reporting rules</b><ul class="checked-list mt-16" style="color:var(--ink)"><li style="color:var(--ink)">Submit within 3 days of the duty</li><li style="color:var(--ink)">Attach attendance sheet if available</li><li style="color:var(--ink)">Director reviews and forwards to faculty when needed</li></ul></div>' +
        '</section>';
    }
,
    myteam: function () { return window.PC.TEAM.section(); }
  };
})();

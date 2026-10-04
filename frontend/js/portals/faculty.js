(function () {
  'use strict';
  var PC = window.PC;

  function attPct() {
    var rows = S.attendance || [];
    var present = rows.filter(function (a) { return a.status === 'Present'; }).length;
    var absent = rows.filter(function (a) { return a.status === 'Absent'; }).length;
    return (present + absent) ? Math.round((present / (present + absent)) * 100) : 0;
  }

  var S = PC.S, A = PC.A, esc = PC.esc, fmt = PC.fmt, I = PC.I, img = PC.img, ini = PC.ini, PP = PC.PP;
  var NAV = PC.NAV, HERO = PC.HERO, QUICK = PC.QUICK, SEC = PC.SEC;
  var heroBlock = PC.heroBlock, stats = PC.stats, quickAccess = PC.quickAccess,
      focusPanel = PC.focusPanel, pageHead = PC.pageHead, table = PC.table,
      statusBadge = PC.statusBadge, pretty = PC.pretty, profileForm = PC.profileForm,
      taskRow = PC.taskRow;
  SEC.faculty = {
    dashboard: function () {
      var pending = S.facultyActivities.filter(function (a) { return a.status === 'Pending'; });
      return heroBlock('faculty') +
        stats([{ label: 'Activities', value: PC.num(S.facultyActivities.length), sub: 'This term' },
          { label: 'Approvals', value: PC.num(pending.length), sub: 'Pending review', style: 'gold' },
          { label: 'Reports', value: PC.num(S.reports.length), sub: 'Received' },
          { label: 'Feedback', value: PC.num(S.feedback.length), sub: 'From volunteers & members' }]) +
        '<section class="grid g23" style="align-items:start">' +
        focusPanel('faculty') +
        quickAccess('faculty') + '</section>' +
        '<div class="grid" style="gap:16px">' +
        '<div class="panel"><div class="panel-head"><h3>Approval queue</h3><button class="btn btn-xs btn-quiet" data-action="goto" data-go="#/portal/faculty/approvals">Open queue</button></div>' +
        '<div class="panel-body" style="padding-top:6px;padding-bottom:6px">' + pending.map(function (a) {
          return '<div class="list-row"><span class="av">' + esc(a.title.charAt(0)) + '</span>' +
            '<div class="txt"><b>' + esc(a.title) + '</b><small>' + esc(a.directorate) + ' · ' + a.students + ' volunteers · ' + fmt(a.date) + '</small></div>' +
            '<button class="btn btn-xs btn-green" data-action="activity-status" data-id="' + a.id + '" data-status="Approved">Approve</button>' +
            '<button class="btn btn-xs btn-outline" data-action="activity-status" data-id="' + a.id + '" data-status="Changes Requested">Request changes</button></div>';
        }).join('') + '</div></div>' +
        '<div class="panel"><div class="panel-head"><h3>Participation trend</h3></div><div class="panel-body">' +
        S.directorates.map(function (d) {
          return '<div class="bar-row"><div class="top"><span>' + esc(d.name) + '</span><b>' + d.activity + '%</b></div><div class="bar"><span style="width:' + d.activity + '%"></span></div></div>';
        }).join('') + '</div></div></div>';
    },
    profile: function () {
      return pageHead('Faculty portal', 'Faculty Profile', 'Your faculty record linked with YPDC oversight duties.') +
        '<section class="grid g23" style="align-items:start"><div class="panel"><div class="panel-head"><h3>Faculty information</h3></div><div class="panel-body">' +
        profileForm('faculty', [['name'], ['email'], ['designation'], ['department'], ['ypdcRole'], ['office'], ['phone']]) +
        '</div></div>' +
        '<aside class="card card-green"><span class="eyebrow">Faculty advisor</span>' +
        '<h3 class="mt-10" style="color:#fff">' + esc(S.profiles.faculty.name) + '</h3>' +
        '<p class="mt-10" style="color:#C6D8D1;font-size:.9rem">' + esc(S.profiles.faculty.ypdcRole) + '</p>' +
        '<hr style="border-color:rgba(255,255,255,.2);margin:18px 0">' +
        '<div style="font-size:.88rem;color:#C6D8D1">Department · <b style="color:#fff">' + esc(S.profiles.faculty.department) + '</b><br>Office · <b style="color:#fff">' + esc(S.profiles.faculty.office) + '</b></div></aside></section>';
    },
    department: function () {
      return pageHead('Faculty portal', 'Department', 'Volunteers of your department active in YPDC.') +
        stats([
          PC.statNum(S.people.filter(function (p) { return (p.program || '').indexOf('CS') > -1; }).length, 'Volunteers in YPDC', 'Computer Science records'),
          PC.statNum(S.people.filter(function (p) { return (p.directorate || '') && (p.directorate || '').indexOf('None') === -1; }).length, 'Assigned volunteers', 'Directorate records'),
          PC.statNum(S.events.filter(function (e) { return e.status === 'Completed'; }).length, 'Events completed', 'Server records'),
          { label: 'Avg. attendance', value: attPct() + '%', ring: attPct(), style: 'gold', sub: 'From attendance records', zero: !S.attendance.length }
        ]) +
        '<section class="panel mt-22"><div class="panel-head"><h3>Department volunteer list</h3></div><div class="panel-body">' +
        table(['Volunteer', 'Program', 'Directorate', 'Post', 'Status'], S.people.map(function (p) {
          return ['<b>' + esc(p.name) + '</b>', esc(p.program), esc(p.directorate), esc(p.post || '\u2014'), statusBadge(p.status)];
        })) + '</div></section>';
    },
    role: function () {
      return pageHead('Faculty portal', 'YPDC Role', 'Your oversight role, permissions and responsibilities.') +
        '<section class="grid g23" style="align-items:start"><div class="panel"><div class="panel-head"><h3>Role &amp; permissions</h3></div><div class="panel-body">' +
        table(['Capability', 'Permission'], [
          ['View student activities', '<span class="badge badge-ok">Allowed</span>'],
          ['Review activity proposals', '<span class="badge badge-ok">Allowed</span>'],
          ['Approve / request changes', '<span class="badge badge-ok">Allowed</span>'],
          ['Edit portal content', '<span class="badge badge-danger">Not allowed</span>'],
          ['Manage users &amp; roles', '<span class="badge badge-danger">Not allowed</span>']
        ]) + '</div></div>' +
        '<aside class="card"><b>Responsibilities</b><ul class="checked-list mt-16"><li style="color:var(--ink)">Review and approve directorate activities</li><li style="color:var(--ink)">Guide students on event quality and safety</li><li style="color:var(--ink)">Verify reports before public publication</li><li style="color:var(--ink)">Provide feedback to the cabinet</li></ul></aside></section>';
    },
    events: function () {
      return pageHead('Faculty portal', 'Events', 'Monthly calendar plus all YPDC events with oversight status.') +
        PC.calendar({ title: 'Event calendar' }) +
        '<section class="panel"><div class="panel-head"><h3>Event register</h3></div><div class="panel-body">' +
        table(['Event', 'Organizer', 'Date', 'Venue', 'Participants', 'Status'], S.events.map(function (e) {
          return ['<b>' + esc(e.title) + '</b>', esc(e.organizer), fmt(e.date), esc(e.venue || e.location || ''), String(e.registered), statusBadge(e.status)];
        })) + '</div></section>';
    },
    activities: function () {
      return pageHead('Faculty portal', 'Volunteer Activities', 'Activity records with volunteer participation numbers.') +
        '<section class="panel"><div class="panel-head"><h3>Activity records</h3><span class="badge badge-gold">' + S.facultyActivities.length + ' records</span></div><div class="panel-body">' +
        table(['Activity', 'Directorate', 'Volunteers', 'Date', 'Status', 'Action'], S.facultyActivities.map(function (a) {
          return ['<b>' + esc(a.title) + '</b>', esc(a.directorate), String(a.students), fmt(a.date), statusBadge(a.status),
            '<button class="btn btn-xs btn-quiet" data-action="activity-status" data-id="' + a.id + '" data-status="Approved">Mark reviewed</button>'];
        })) + '</div></section>';
    },
    approvals: function () {
      return pageHead('Faculty portal', 'Approvals', 'Approve, request changes or add guidance for pending activities and proposals.') +
        '<section class="panel"><div class="panel-head"><h3>Pending approvals</h3><span class="badge badge-warn">' + S.facultyActivities.filter(function (a) { return a.status === 'Pending'; }).length + ' waiting</span></div>' +
        '<div class="panel-body" style="padding-top:6px;padding-bottom:6px">' + S.facultyActivities.map(function (a) {
          return '<div class="list-row"><span class="av">' + esc(a.title.charAt(0)) + '</span>' +
            '<div class="txt"><b>' + esc(a.title) + '</b><small>' + esc(a.directorate) + ' · ' + a.students + ' students · ' + fmt(a.date) + '</small></div>' +
            statusBadge(a.status) +
            '<button class="btn btn-xs btn-green" data-action="activity-status" data-id="' + a.id + '" data-status="Approved">Approve</button>' +
            '<button class="btn btn-xs btn-outline" data-action="activity-status" data-id="' + a.id + '" data-status="Changes Requested">Changes</button>' +
            '<button class="btn btn-xs btn-danger" data-action="activity-status" data-id="' + a.id + '" data-status="Rejected">Reject</button></div>';
        }).join('') + '</div></section>' +
        '<section class="panel mt-22"><div class="panel-head"><h3>Directorate proposals</h3></div><div class="panel-body">' +
        table(['Proposal', 'Directorate', 'Budget', 'Status', 'Action'], S.proposals.map(function (p) {
          return ['<b>' + esc(p.title) + '</b>', esc(p.directorate), esc(p.budget), statusBadge(p.status),
            '<button class="btn btn-xs btn-green" data-action="proposal-status" data-id="' + p.id + '" data-status="Approved">Approve</button>'];
        })) + '</div></section>';
    },
    reports: function () {
      return pageHead('Faculty portal', 'Reports', 'Reports received from directorates and members.') +
        '<section class="panel"><div class="panel-head"><h3>Report inbox</h3></div><div class="panel-body">' +
        table(['Report', 'Period', 'By', 'Date', 'Status', 'Action'], S.reports.map(function (r) {
          return ['<b>' + esc(r.title) + '</b>', esc(r.period), esc(r.by), fmt(r.date), statusBadge(r.status),
            '<button class="btn btn-xs btn-quiet" data-action="reply-feedback" data-id="' + r.id + '">Mark reviewed</button>'];
        })) + '</div></section>' +
        '<section class="panel mt-22"><div class="panel-head"><h3>Volunteer &amp; member feedback</h3></div><div class="panel-body" style="padding-top:6px;padding-bottom:6px">' +
        S.feedback.map(function (f) {
          return '<div class="list-row"><span class="av soft">' + esc(f.rating) + '★</span>' +
            '<div class="txt"><b>' + esc(f.name) + ' <span class="mut" style="font-weight:400;font-size:.82rem">(' + esc(f.role) + ')</span></b><small>' + esc(f.text) + '</small></div>' +
            (f.replied ? statusBadge('Done') : '<button class="btn btn-xs btn-quiet" data-action="reply-feedback" data-id="' + f.id + '">Mark responded</button>') + '</div>';
        }).join('') + '</div></section>';
    }
  };
})();

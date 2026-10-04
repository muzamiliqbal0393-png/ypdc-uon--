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
  SEC.student = {
    dashboard: function () {
      var regs = S.registrations.filter(function (r) { return r.email === S.profiles.student.email; });
      return heroBlock('student') +
        stats([
          { label: 'Upcoming events', value: PC.num(S.events.filter(function (e) { return e.status === 'Upcoming'; }).length), sub: 'Open for registration' },
          { label: 'Registered', value: PC.num(regs.length), sub: 'Confirmed registrations', style: 'gold' },
          { label: 'Attendance', value: attPct() + '%', sub: 'This term', ring: attPct() },
          { label: 'Certificates', value: PC.num(S.certificates.length), sub: (S.certificates.length ? 'Issued to you' : 'No certificates yet') }
        ]) +
        '<section class="grid g23" style="align-items:start">' +
        focusPanel('student') +
        quickAccess('student') + '</section>' +
        '<div class="grid" style="gap:16px">' +
        '<div class="panel"><div class="panel-head"><h3>My registrations</h3>' +
        '<button class="btn btn-xs btn-quiet" data-action="goto" data-go="#/portal/student/registration">Register more</button></div>' +
        '<div class="panel-body" style="padding-top:6px;padding-bottom:6px">' +
        (regs.length ? regs.map(function (r) {
          var e = S.events.filter(function (x) { return x.id === r.eventId; })[0] || { title: 'Event', date: r.date, location: '—' };
          return '<div class="list-row"><span class="av">' + esc(e.title.charAt(0)) + '</span>' +
            '<div class="txt"><b>' + esc(e.title) + '</b><small>' + fmt(e.date) + ' · ' + esc(e.venue || e.location || '') + '</small></div>' +
            statusBadge(r.status) +
            '<button class="btn btn-xs btn-danger" data-action="cancel-registration" data-id="' + r.id + '">Cancel</button></div>';
        }).join('') : '<p class="mut" style="padding:14px 0">No registrations yet — browse upcoming events.</p>') +
        '</div></div>' +
        '<div class="panel"><div class="panel-head"><h3>Upcoming for you</h3></div>' +
        '<div class="panel-body grid g2" style="gap:16px">' + S.events.filter(function (e) { return e.status === 'Upcoming'; }).slice(0, 2).map(function (e) {
          return '<div class="card card-tight card-flat" style="border:1px solid var(--line)">' +
            '<span class="badge badge-info">' + esc(e.category) + '</span>' +
            '<b class="mt-10" style="display:block">' + esc(e.title) + '</b>' +
            '<div class="mut" style="font-size:.82rem;margin-top:6px">' + fmt(e.date) + ' · ' + esc(e.time) + '</div>' +
            '<div class="mut" style="font-size:.82rem">' + esc(e.venue || e.location || '') + '</div>' +
            '<button class="btn btn-green btn-xs mt-16" data-action="register-event" data-id="' + e.id + '">Register</button></div>';
        }).join('') + '</div></div>' +
        '</div>';
    },
    profile: function () {
      return pageHead('Volunteer portal', 'My Profile', 'Your academic identity, contact details and directorate preference.') +
        '<section class="grid g23" style="align-items:start"><div class="panel"><div class="panel-head"><h3>Profile information</h3><span class="badge badge-ok">Active volunteer</span></div>' +
        '<div class="panel-body">' + profileForm('student', [['name'], ['email'], ['program'], ['semester'], ['reg'], ['cgpa'], ['directorate'], ['phone'], ['city'], ['dob'], ['skills', 'textarea']]) + '</div></div>' +
        '<aside class="card card-green"><div class="flex"><span class="av" style="width:54px;height:54px;border-radius:50%;background:rgba(255,255,255,.12);display:grid;place-items:center;font-weight:700">' + ini(S.profiles.student.name) + '</span>' +
        '<div><b style="color:#fff;display:block">' + esc(S.profiles.student.name) + '</b><small style="color:#B9CFC7">' + esc(S.profiles.student.reg) + '</small></div></div>' +
        '<hr style="border-color:rgba(255,255,255,.16);margin:20px 0">' +
        '<div class="grid" style="gap:12px;font-size:.88rem;color:#C6D8D1">' +
        '<div>Program · <b style="color:#fff">' + esc(S.profiles.student.program) + '</b></div>' +
        '<div>Semester · <b style="color:#fff">' + esc(S.profiles.student.semester) + '</b></div>' +
        '<div>CGPA · <b style="color:#fff">' + esc(S.profiles.student.cgpa) + '</b></div>' +
        '<div>Directorate · <b style="color:#fff">' + esc(S.profiles.student.directorate) + '</b></div></div>' +
        '<div class="btn-row mt-22"><a class="btn btn-gold btn-sm" href="#/portal/student/certificates">My certificates</a></div></aside></section>';
    },
    membership: function () {
      var p = S.profiles.student;
      return pageHead('Volunteer portal', 'Membership', 'Membership status, directorate placement and benefits.') +
        '<section class="grid g23" style="align-items:start"><div class="grid" style="gap:16px">' +
        '<div class="panel"><div class="panel-head"><h3>Membership record</h3>' +
        (S.session && S.session.role ? statusBadge('Active') : '<span class="badge badge-line">Login required</span>') + '</div>' +
        '<div class="panel-body">' + table(['Field', 'Detail'], [
          ['Account', esc((S.session && S.session.email) || '—')],
          ['Directorate', esc(p.directorate || '—')],
          ['Registration no.', esc(p.reg || '—')],
          ['Program', esc(p.program || '—')],
          ['Attendance records', String((S.attendance || []).length)],
          ['Member ID', 'Available in the General Member Portal after admin approval']
        ]) + '</div>' +
        '<div class="panel-foot"><a class="btn btn-green btn-sm" href="#/induction">Apply for upgrade</a>' +
        '<a class="btn btn-outline btn-sm" href="#/membership">Public membership info</a></div></div>' +
        '<div class="panel"><div class="panel-head"><h3>Benefits</h3></div><div class="panel-body">' +
        '<ul class="checked-list">' +
        ['Priority registration for YPDC events and workshops', 'Eligibility for participation certificates', 'Access to alumni mentorship circles', 'Volunteer hours verification and appreciation awards', 'Eligibility to apply for directorate posts']
          .map(function (b) { return '<li>' + b + '</li>'; }).join('') + '</ul></div></div>' +
        '</div>' + quickAccess('student') + '</section>';
    },
    events: function () {
      return pageHead('Volunteer portal', 'Events', 'Monthly calendar plus every YPDC event with registration status and details.', '<button class="btn btn-outline btn-sm" data-action="goto" data-go="#/events">Public events page</button>') +
        PC.calendar({ title: 'Event calendar' }) +
        (S.events.length
          ? '<div class="grid g3">' + S.events.map(function (e) { return window.App.eventCard(e); }).join('') + '</div>'
          : PC.emptyNote('No events published yet', 'New events appear here once added from Admin panel → Events.'));
    },
    registration: function () {
      var regs = S.registrations;
      return pageHead('Volunteer portal', 'Event Registration', 'Register for open events — confirmation appears instantly and seats update live.') +
        '<section class="panel"><div class="panel-head"><h3>Open registration</h3><span class="badge badge-gold">' + regs.length + ' my registrations</span></div>' +
        '<div class="panel-body">' + table(['Event', 'Date', 'Venue', 'Seats', 'Status', 'Action'], S.events.filter(function (e) { return e.status === 'Upcoming'; }).map(function (e) {
          var mine = regs.filter(function (r) { return r.eventId === e.id; })[0];
          return ['<b>' + esc(e.title) + '</b>', fmt(e.date), esc(e.location), e.registered + ' / ' + e.capacity,
            mine ? statusBadge('Registered') : statusBadge('Open'),
            mine ? '<button class="btn btn-xs btn-danger" data-action="cancel-registration" data-id="' + mine.id + '">Cancel</button>'
              : '<button class="btn btn-xs btn-green" data-action="register-event" data-id="' + e.id + '">Register</button>'];
        })) + '</div></section>';
    },
    volunteer: function () {
      return pageHead('Volunteer portal', 'Volunteer', 'Apply for volunteer drives and track your service hours.', '<button class="btn btn-outline btn-sm" href="#/portal/student/attendance">Attendance</button>') +
        ((S.events.filter(function (e) { return e.status === 'Upcoming'; }).length)
          ? '<section class="grid g3">' + S.events.filter(function (e) { return e.status === 'Upcoming'; }).map(function (e) {
          return '<div class="card"><span class="badge badge-info">' + esc(e.category) + '</span>' +
            '<h4 class="mt-16">' + esc(e.title) + ' — Volunteer</h4>' +
            '<p class="mut mt-10" style="font-size:.88rem">Support registration desk, logistics or field work. Volunteers receive duty verification and certificates.</p>' +
            '<div class="flex-between mt-16"><span class="mut" style="font-size:.82rem">' + fmt(e.date) + '</span>' +
            '<button class="btn btn-xs btn-green" data-action="apply-volunteer" data-drive="' + esc(e.title) + '" data-role="Field Volunteer">Apply</button></div></div>';
        }).join('') + '</section>'
          : PC.emptyNote('No drives open yet', 'Volunteer applications appear here once an event is published from the admin panel.')) +
        '<section class="panel mt-22"><div class="panel-head"><h3>My volunteer record</h3></div><div class="panel-body">' +
        table(['Drive', 'Role', 'Hours', 'Date', 'Status'], S.volunteer.map(function (v) {
          return [esc(v.drive), esc(v.role), v.hours + ' hrs', fmt(v.date), statusBadge(v.status)];
        })) + '</div></section>';
    },
    attendance: function () {
      var present = S.attendance.filter(function (a) { return a.status === 'Present'; }).length;
      return pageHead('Volunteer portal', 'Attendance', 'Attendance record across events, with eligibility tracking.') +
        stats([
          { label: 'Overall attendance', value: attPct() + '%', sub: 'Term average', ring: attPct(), style: 'gold' },
          { label: 'Events attended', value: String(present), sub: 'Marked present' },
          { label: 'Registered upcoming', value: String(S.attendance.filter(function (a) { return a.status === 'Registered'; }).length), sub: 'Awaiting event' },
          { label: 'Absences', value: String(S.attendance.filter(function (a) { return a.status === 'Absent'; }).length), sub: 'Inform HR if genuine' }
        ]) +
        '<section class="panel mt-22"><div class="panel-head"><h3>Attendance detail</h3></div><div class="panel-body">' +
        table(['Event', 'Date', 'Status'], S.attendance.map(function (a) { return [esc(a.event), fmt(a.date), statusBadge(a.status)]; })) +
        '</div><div class="panel-foot"><span class="mut" style="font-size:.84rem">Attendance is marked by the YPDC admin and faculty — a volunteer cannot mark it for themselves.</span></div></section>';
    },
    certificates: function () {
      return pageHead('Volunteer portal', 'Certificates', 'Download and verify participation certificates issued through the portal.') +
        (S.certificates.length ? '<section class="grid g3">' + S.certificates.map(function (c) {
          return '<div class="card lift"><div class="flex-between">' + statusBadge(c.status) + '<span class="mut" style="font-size:.78rem">' + esc(c.code) + '</span></div>' +
            '<h4 class="mt-16">' + esc(c.title) + '</h4>' +
            '<p class="mut mt-10" style="font-size:.88rem">' + esc(c.event) + '<br>Issued: ' + fmt(c.date) + '</p>' +
            '<div class="btn-row mt-16"><button class="btn btn-xs btn-green" data-action="view-certificate" data-id="' + c.id + '">View / Download</button></div></div>';
        }).join('') + '</section>'
          : PC.emptyNote('No certificates yet', 'Certificates are issued here after events and volunteer work.'));
    },
    achievements: function () {
      var milestones = [];
      (S.registrations || []).forEach(function (r) { milestones.push(['Event registration — ' + (r.title || r.eventId), r.date]); });
      (S.attendance || []).forEach(function (a) { milestones.push([a.event + ' (' + a.status + ')', a.date]); });
      (S.certificates || []).forEach(function (c) { milestones.push(['Certificate — ' + (c.title || c.name || 'Issued'), c.date]); });
      (S.volunteer || []).forEach(function (v) { milestones.push(['Volunteer — ' + (v.drive || 'Drive'), v.date]); });
      return pageHead('Volunteer portal', 'Achievements', 'Your participation record and the milestones it contributes to.') +
        (S.achievements.length ? '<section class="grid g4">' + S.achievements.map(function (a) {
          return '<div class="card text-center"><div style="font-family:var(--serif);font-size:2rem;color:var(--green-800)">' + esc(a.count) + '</div>' +
            '<b class="mt-6" style="display:block">' + esc(a.title) + '</b><p class="mut mt-6" style="font-size:.85rem">' + esc(a.detail) + '</p></div>';
        }).join('') + '</section>'
          : '<section>' + PC.emptyNote('No achievements published yet', 'Achievements appear here once published from Admin → Highlights / Achievements.') + '</section>') +
        '<section class="panel mt-22"><div class="panel-head"><h3>My milestones</h3></div><div class="panel-body">' +
        (milestones.length
          ? '<div class="timeline">' + milestones.slice(0, 8).map(function (m) {
              return '<div class="tl-item"><b>' + esc(m[0]) + '</b><small>' + fmt(m[1]) + '</small></div>';
            }).join('') + '</div>'
          : PC.emptyNote('No milestones yet', 'Register for events or volunteer to start building your service record.')) +
        '</div></section>';
    },
    myteam: function () { return window.PC.TEAM.section(); },
    feedback: function () {
      return pageHead('Volunteer portal', 'Feedback / Comments', 'Send suggestions to the YPDC admin team and see recent public feedback.') +
        '<section>' + window.App.feedbackForm('Share a suggestion about events, portal features or your directorate.', 'student') + '</section>';
    }
  };
})();

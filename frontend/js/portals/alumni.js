(function () {
  'use strict';
  var PC = window.PC;

  var S = PC.S, A = PC.A, esc = PC.esc, fmt = PC.fmt, I = PC.I, img = PC.img, ini = PC.ini, PP = PC.PP;
  var NAV = PC.NAV, HERO = PC.HERO, QUICK = PC.QUICK, SEC = PC.SEC;
  var heroBlock = PC.heroBlock, stats = PC.stats, quickAccess = PC.quickAccess,
      focusPanel = PC.focusPanel, pageHead = PC.pageHead, table = PC.table,
      statusBadge = PC.statusBadge, pretty = PC.pretty, profileForm = PC.profileForm,
      taskRow = PC.taskRow;
  SEC.alumni = {
    dashboard: function () {
      return heroBlock('alumni') +
        stats([{ label: 'Connections', value: PC.num((S.alumniNetwork || []).length), sub: 'Alumni network' },
          { label: 'Mentorship', value: PC.num(S.mentorship.length), sub: 'Requests & active', style: 'gold' },
          { label: 'Events', value: PC.num((S.events || []).length), sub: 'Alumni invitations' },
          { label: 'Opportunities', value: PC.num(S.careers.length), sub: 'Open positions' }]) +
        '<section class="grid g23" style="align-items:start">' +
        focusPanel('alumni') +
        quickAccess('alumni') + '</section>' +
        '<div class="grid" style="gap:16px">' +
        '<div class="panel"><div class="panel-head"><h3>Mentorship requests</h3><button class="btn btn-xs btn-quiet" data-action="request-mentorship">+ New request</button></div>' +
        '<div class="panel-body" style="padding-top:6px;padding-bottom:6px">' + S.mentorship.map(function (m) {
          return '<div class="list-row"><span class="av">' + ini(m.student) + '</span>' +
            '<div class="txt"><b>' + esc(m.student) + '</b><small>' + esc(m.program) + ' · ' + esc(m.topic) + '</small></div>' +
            statusBadge(m.status) +
            '<button class="btn btn-xs btn-green" data-action="mentor-status" data-id="' + m.id + '" data-status="Accepted">Accept request</button></div>';
        }).join('') + '</div></div>' +
        '<div class="panel"><div class="panel-head"><h3>Career opportunities</h3></div><div class="panel-body">' +
        table(['Position', 'Company', 'Type', 'Deadline', 'Status'], S.careers.map(function (c) {
          return ['<b>' + esc(c.title) + '</b>', esc(c.company), esc(c.type), fmt(c.deadline), statusBadge(c.status)];
        })) + '</div></div>' +
        '</div>';
    },
    profile: function () {
      return pageHead('Alumni portal', 'Alumni Profile', 'Your alumni identity, accessible to students seeking mentorship.') +
        '<section class="grid g23" style="align-items:start"><div class="panel"><div class="panel-head"><h3>Profile information</h3></div><div class="panel-body">' +
        profileForm('alumni', [['name'], ['email'], ['batch'], ['program'], ['directorate'], ['profession'], ['company'], ['city'], ['phone']]) +
        '</div></div>' +
        '<aside class="card card-green"><div class="flex"><span class="av" style="width:54px;height:54px;border-radius:50%;background:rgba(255,255,255,.12);display:grid;place-items:center;font-family:var(--serif)">' + ini(S.profiles.alumni.name) + '</span>' +
        '<div><b style="color:#fff;display:block">' + esc(S.profiles.alumni.name) + '</b><small style="color:#B9CFC7">' + esc(S.profiles.alumni.batch) + '</small></div></div>' +
        '<hr style="border-color:rgba(255,255,255,.2);margin:18px 0">' +
        '<div style="font-size:.88rem;color:#C6D8D1">' + esc(S.profiles.alumni.profession) + ' at <b style="color:#fff">' + esc(S.profiles.alumni.company) + '</b><br>Mentor status: <b style="color:var(--gold)">Available</b></div>' +
        '<div class="btn-row mt-22"><a class="btn btn-gold btn-sm" href="#/portal/alumni/mentorship">Mentorship</a></div></aside></section>';
    },
    academic: function () {
      var p = S.profiles.alumni;
      return pageHead('Alumni portal', 'Academic Info', 'Your YPDC and academic record as an alumnus.') +
        '<section class="panel"><div class="panel-head"><h3>Academic record</h3><span class="badge badge-gold">' + esc(p.batch) + '</span></div><div class="panel-body">' +
        table(['Field', 'Detail'], [
          ['Degree program', esc(p.program || '—')], ['Batch', esc(p.batch || '—')], ['YPDC directorate', esc(p.directorate || '—')],
          ['Certificates earned', String((S.certificates || []).length) + ' (verified)'],
          ['Member ID (historic)', esc(p.reg || p.memberId || '—')]
        ]) + '</div></section>' +
        '<div class="mt-22"><a class="btn btn-outline" href="#/achievements">See YPDC achievements ' + I.arrow + '</a></div>';
    },
    professional: function () {
      return pageHead('Alumni portal', 'Professional Info', 'Career details shown to students and the alumni network.') +
        '<section class="grid g2"><div class="panel"><div class="panel-head"><h3>Current position</h3></div><div class="panel-body">' +
        table(['Field', 'Detail'], [['Profession', esc(S.profiles.alumni.profession || '—')], ['Company', esc(S.profiles.alumni.company || '—')], ['City', esc(S.profiles.alumni.city || '—')], ['Experience', esc(S.profiles.alumni.experience || '—')]]) +
        '</div></div>' +
        '<div class="panel"><div class="panel-head"><h3>Career journey</h3></div><div class="panel-body">' +
        ((S.activityLog || []).length
          ? '<div class="timeline">' + S.activityLog.slice(0, 6).map(function (l) {
              return '<div class="tl-item"><b>' + esc(l.text) + '</b><small>' + fmt(l.date) + '</small></div>';
            }).join('') + '</div>'
          : PC.emptyNote('No records yet', 'Your career journey builds here as your YPDC work progresses.')) +
        '</div></div></section>';
    },
    skills: function () {
      var skills = (S.profiles.alumni.skills || '').split(',').map(function (s) { return s.trim(); });
      return pageHead('Alumni portal', 'Skills', 'Skills you can teach or mentor students in.') +
        '<section class="card"><div class="chip-row">' + skills.map(function (s) {
          return '<span class="chip active">' + esc(s) + '</span>';
        }).join('') + '</div>' +
        '<div class="field mt-22"><span>Add a skill</span><input id="skill-input" placeholder="e.g. UI design, Public speaking"></div>' +
        '<button class="btn btn-green btn-sm" data-action="save-skills">Save skills</button></section>' +
        '<section class="panel mt-22"><div class="panel-head"><h3>Mentorship topics requested from you</h3></div><div class="panel-body">' +
        table(['Volunteer', 'Topic', 'Status'], S.mentorship.map(function (m) {
          return [esc(m.student), esc(m.topic), statusBadge(m.status)];
        })) + '</div></section>';
    },
    network: function () {
      return pageHead('Alumni portal', 'Alumni Network', 'Connect with fellow YPDC graduates.') +
        (S.alumniNetwork.length ? '<section class="grid g3">' + S.alumniNetwork.map(function (a) {
          return '<div class="card lift"><div class="flex"><span class="av" style="width:48px;height:48px;border-radius:50%;background:var(--green-800);color:var(--gold);display:grid;place-items:center;font-weight:700">' + ini(a.name) + '</span>' +
            '<div><b>' + esc(a.name) + '</b><div class="mut" style="font-size:.8rem">' + esc(a.batch) + '</div></div></div>' +
            '<p class="mut mt-16" style="font-size:.88rem">' + esc(a.profession) + ' · ' + esc(a.company) + '</p>' +
            '<div class="mut" style="font-size:.8rem">' + esc(a.city) + ' · ' + esc(a.directorate) + '</div>' +
            '<button class="btn btn-xs btn-quiet mt-16" data-action="ask-mentorship" data-name="' + esc(a.name) + '">Request mentorship</button></div>';
        }).join('') + '</section>'
          : PC.emptyNote('No alumni registered yet', 'The network appears here as alumni accounts are added from the admin panel.'));
    },
    mentorship: function () {
      return pageHead('Alumni portal', 'Mentorship', 'Guide students, track requests and record mentoring sessions.', '<button class="btn btn-green btn-sm" data-action="request-mentorship">+ New mentorship</button>') +
        '<section class="panel"><div class="panel-head"><h3>Mentorship records</h3></div><div class="panel-body">' +
        table(['Volunteer', 'Program', 'Topic', 'Requested', 'Status', 'Action'], S.mentorship.map(function (m) {
          return ['<b>' + esc(m.student) + '</b>', esc(m.program), esc(m.topic), fmt(m.date), statusBadge(m.status),
            '<button class="btn btn-xs btn-quiet" data-action="mentor-status" data-id="' + m.id + '" data-status="Completed">Mark completed</button>'];
        })) + '</div></section>' +
        (S.mentorship.length ? (function () {
          var done = S.mentorship.filter(function (m) { return m.status === 'Done' || m.status === 'Completed'; }).length;
          var students = {}; S.mentorship.forEach(function (m) { if (m.student) students[m.student] = 1; });
          var tiles = [['Mentees', String(Object.keys(students).length), 'From records'],
                       ['Sessions completed', String(done), 'Marked done'],
                       ['Open requests', String(S.mentorship.length - done), 'Pending']];
          return '<section class="grid g3 mt-22">' + tiles.map(function (t) {
            return '<div class="card"><span class="stat-label mut">' + t[0] + '</span>' +
              '<div style="font-family:var(--serif);font-size:1.8rem;color:var(--green-800)">' + t[1] + '</div>' +
              '<div class="mut" style="font-size:.8rem">' + t[2] + '</div></div>';
          }).join('') + '</section>';
        })() : '');
    },
    careers: function () {
      return pageHead('Alumni portal', 'Careers', 'Opportunities shared with the YPDC network — post or apply.') +
        (S.careers.length ? '<section class="grid g3">' + S.careers.map(function (c) {
          return '<div class="card lift"><div class="flex-between"><span class="badge badge-info">' + esc(c.type) + '</span>' + statusBadge(c.status) + '</div>' +
            '<h4 class="mt-16">' + esc(c.title) + '</h4>' +
            '<p class="mut mt-10" style="font-size:.88rem">' + esc(c.company) + ' · ' + esc(c.location) + '</p>' +
            '<div class="mut" style="font-size:.82rem">Apply before ' + fmt(c.deadline) + '</div>' +
            '<button class="btn btn-xs btn-green mt-16" data-action="apply-career" data-title="' + esc(c.title) + '">Send application</button></div>';
        }).join('') + '</section>'
          : PC.emptyNote('No opportunities posted yet', 'Careers appear here once posted from the admin panel.'));
    }
  };
})();

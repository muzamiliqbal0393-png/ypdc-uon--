(function () {
  'use strict';
  var PC = window.PC;

  function myDirectorate() {
    var _me = (S.session && S.session.name) || '';
    return S.directorates.filter(function (x) { return x.lead === _me; })[0] || S.directorates[0];
  }

  var S = PC.S, A = PC.A, esc = PC.esc, fmt = PC.fmt, I = PC.I, img = PC.img, ini = PC.ini, PP = PC.PP;
  var NAV = PC.NAV, HERO = PC.HERO, QUICK = PC.QUICK, SEC = PC.SEC;
  var heroBlock = PC.heroBlock, stats = PC.stats, quickAccess = PC.quickAccess,
      focusPanel = PC.focusPanel, pageHead = PC.pageHead, table = PC.table,
      statusBadge = PC.statusBadge, pretty = PC.pretty, profileForm = PC.profileForm,
      taskRow = PC.taskRow;
  SEC.directorate = {
    dashboard: function () {
      var d = myDirectorate();
      var myTasks = S.tasks.filter(function (t) { return t.directorate === d.name; });
      var open = myTasks.filter(function (t) { return t.status !== 'Done'; }).length;
      var myEvents = (S.events || []).filter(function (e) { return e.organizer === d.name; });
      var team = S.people.filter(function (p) { return p.directorate === d.name; });
      var teamTile = team.length
        ? { label: 'Team members', value: String(team.length), sub: team.filter(function (p) { return p.status === 'Active'; }).length + ' active in directory' }
        : { label: 'Team members', value: String(d.members), sub: d.active + ' active (recorded)' };
      return heroBlock('directorate') +
        stats([teamTile,
          { label: 'Open tasks', value: String(open), sub: myTasks.length + ' total', style: 'gold' },
          { label: 'Events', value: String(myEvents.length), sub: 'Organised by us' },
          { label: 'Reports', value: PC.num(S.reports.length), sub: 'Submitted / drafts' }]) +
        '<section class="grid g23" style="align-items:start">' +
        focusPanel('directorate') +
        quickAccess('directorate') + '</section>' +
        '<div class="grid" style="gap:16px">' +
        '<div class="panel"><div class="panel-head"><h3>Work plan progress</h3><span class="badge badge-gold">' + esc(d.name) + '</span></div>' +
        '<div class="panel-body">' + S.workplan.map(function (w) {
          return '<div class="bar-row"><div class="top"><span>' + esc(w.objective) + '</span><b>' + w.progress + '%</b></div>' +
            '<div class="bar"><span style="width:' + w.progress + '%"></span></div>' +
            '<div class="mut" style="font-size:.78rem;margin-top:5px">' + esc(w.owner) + ' · ' + esc(w.quarter) + ' · ' + esc(w.status) + '</div></div>';
        }).join('') + '</div></div>' +
        '<div class="panel"><div class="panel-head"><h3>Team tasks</h3><button class="btn btn-xs btn-quiet" data-action="add-task">+ Assign task</button></div>' +
        '<div class="panel-body" style="padding-top:6px;padding-bottom:6px">' + S.tasks.filter(function (t) { return t.directorate === d.name; }).map(taskRow).join('') + '</div></div>' +
        '</div>';
    },
    profile: function () {
      var d = myDirectorate();
      return pageHead('Directorate portal', 'Directorate Profile', d.focus) +
        '<section class="grid g23" style="align-items:start">' +
        '<div class="grid" style="gap:16px">' +
        '<div class="panel"><div class="panel-head"><h3>' + esc(d.name) + '</h3>' + statusBadge(d.status) + '</div>' +
        '<div class="panel-body">' + table(['Field', 'Detail'], [
          ['Lead', esc(d.lead)], ['Members', d.members + ' (' + d.active + ' active)'], ['Vacancy', String(d.vacancy)],
          ['Activity score', d.activity + '%'], ['Focus area', esc(d.focus)],
          ['Deliverables', 'Trainings, portal modules, documentation, digital skills sessions']
        ]) + '</div></div>' +
        '<div class="panel"><div class="panel-head"><h3>Objectives</h3><button class="btn btn-xs btn-quiet" data-action="goto" data-go="#/portal/directorate/objectives">Manage</button></div>' +
        '<div class="panel-body">' + S.objectives.map(function (o) {
          return '<div class="bar-row"><div class="top"><span>' + esc(o.text) + '</span><b>' + o.progress + '%</b></div><div class="bar"><span style="width:' + o.progress + '%"></span></div></div>';
        }).join('') + '</div></div>' +
        '<div class="panel"><div class="panel-head"><h3>Your account</h3></div><div class="panel-body">' +
        '<p class="mut" style="font-size:.9rem">Your own sign-in details. Role and email cannot be changed from this form.</p>' +
        '<div class="mt-16">' + profileForm('directorate', [['name'], ['email'], ['phone'], ['program'], ['city']]) + '</div>' +
        '</div></div></div>' + quickAccess('directorate') + '</section>';
    },
    leadership: function () {
      var d = myDirectorate();
      var leaders = S.people.filter(function (p) { return ['Director', 'Assistant Director'].indexOf(p.post) > -1; });
      return pageHead('Directorate portal', 'Leadership', 'Directorate leadership team and their responsibilities.') +
        '<section class="grid g4">' + leaders.map(function (p) {
          return '<div class="card text-center"><div class="center-x" style="width:64px;height:64px;border-radius:50%;background:var(--green-800);color:var(--gold);display:grid;place-items:center;font-family:var(--serif);font-size:1.3rem">' + ini(p.name) + '</div>' +
            '<b class="mt-16" style="display:block">' + esc(p.name) + '</b>' +
            '<div class="mut" style="font-size:.86rem">' + esc(p.post || '\u2014') + '</div>' +
            '<div class="mut" style="font-size:.8rem">' + esc(p.directorate) + '</div>' +
            '<div class="mt-10">' + statusBadge(p.status) + '</div></div>';
        }).join('') + '</section>' +
        '<section class="panel mt-22"><div class="panel-head"><h3>Cabinet coordination</h3><span class="badge badge-gold">' + esc(S.cabinet.session) + '</span></div>' +
        '<div class="panel-body">' + table(['Executive post', 'Status'], S.cabinet.posts.map(function (p) {
          return [esc(p.title), statusBadge(p.status)];
        })) + '</div></section>' +
        '<div class="mt-22"><a class="btn btn-outline" href="#/cabinet">View public cabinet page ' + I.arrow + '</a></div>';
    },
    team: function () {
      var d = myDirectorate();
      return pageHead('Directorate portal', 'Team Members', d.name + ' · ' + d.members + ' members') +
        '<section class="panel"><div class="panel-head"><h3>Team roster</h3><span class="badge badge-line">' + d.active + ' active · ' + d.vacancy + ' vacancy</span></div><div class="panel-body">' +
        table(['Member', 'Post', 'Membership', 'Joined', 'Status'], S.people.map(function (p) {
          return ['<b>' + esc(p.name) + '</b>', esc(p.post || '\u2014'), esc(p.type || '\u2014'), esc(p.batch || '\u2014'), statusBadge(p.status)];
        })) + '</div></section>' +
        '<section class="grid g3 mt-22">' + S.people.slice(0, 3).map(function (p) {
          return '<div class="card card-tight"><div class="flex"><span class="av" style="width:42px;height:42px;border-radius:12px;background:var(--mint);color:var(--green-700);display:grid;place-items:center;font-weight:700">' + ini(p.name) + '</span>' +
            '<div><b>' + esc(p.name) + '</b><div class="mut" style="font-size:.8rem">' + esc(p.post || '\u2014') + '</div></div></div>' +
            '<div class="mut mt-10" style="font-size:.8rem">' + esc(p.program) + '</div></div>';
        }).join('') + '</section>';
    },
    objectives: function () {
      return pageHead('Directorate portal', 'Objectives', 'Term objectives with measurable progress.') +
        (S.objectives.length ? '<section class="grid g2">' + S.objectives.map(function (o) {
          return '<div class="card"><b>' + esc(o.text) + '</b>' +
            '<div class="bar-row mt-16"><div class="top"><span class="mut" style="font-size:.82rem">Progress</span><b>' + o.progress + '%</b></div>' +
            '<div class="bar"><span style="width:' + o.progress + '%"></span></div></div></div>';
        }).join('') + '</section>'
          : PC.emptyNote('No objectives yet', 'Add directorate objectives from the admin/directorate portal.'));
    },
    workplan: function () {
      return pageHead('Directorate portal', 'Work Plan', 'Objectives, ownership, timeline and delivery status.') +
        '<section class="panel"><div class="panel-head"><h3>Quarterly work plan</h3><span class="badge badge-gold">Q4 2026 focus</span></div><div class="panel-body">' +
        table(['Objective', 'Owner', 'Quarter', 'Progress', 'Status'], S.workplan.map(function (w) {
          return ['<b>' + esc(w.objective) + '</b>', esc(w.owner), esc(w.quarter),
            '<div class="bar" style="min-width:110px"><span style="width:' + w.progress + '%"></span></div>',
            statusBadge(w.status)];
        })) + '</div><div class="panel-foot"><span class="mut" style="font-size:.84rem">Work plan is visible to faculty and admin for oversight.</span>' +
        '<button class="btn btn-outline btn-sm" data-action="export-workplan">Export CSV</button></div></section>';
    },
    tasks: function () {
      return pageHead('Directorate portal', 'Tasks', 'Assign and track team tasks.', '<button class="btn btn-green btn-sm" data-action="add-task">+ Assign task</button>') +
        '<section class="panel"><div class="panel-head"><h3>Team task board</h3></div><div class="panel-body" style="padding-top:6px;padding-bottom:6px">' +
        (S.tasks.length ? S.tasks.map(taskRow).join('') : PC.emptyNote('No tasks yet', 'Create the first task with “+ Assign task”.')) + '</div></section>';
    },
    proposals: function () {
      return pageHead('Directorate portal', 'Event Proposals', 'Submit proposals for approval by faculty and admin.', '<button class="btn btn-green btn-sm" data-action="add-proposal">+ New proposal</button>') +
        '<section class="panel"><div class="panel-head"><h3>Proposal pipeline</h3><span class="badge badge-line">' + S.proposals.length + ' total</span></div><div class="panel-body">' +
        table(['Proposal', 'Directorate', 'Submitted by', 'Budget', 'Date', 'Status', 'Action'], S.proposals.map(function (p) {
          return ['<b>' + esc(p.title) + '</b><div class="mut" style="font-size:.8rem">' + esc(p.desc) + '</div>', esc(p.directorate), esc(p.by), esc(p.budget), fmt(p.date), statusBadge(p.status),
            (p.status === 'Pending' || p.status === 'Changes Requested')
              ? '<button class="btn btn-xs btn-green" data-action="proposal-status" data-id="' + p.id + '" data-status="Approved">Approve</button>'
              : '<button class="btn btn-xs btn-quiet" data-action="proposal-status" data-id="' + p.id + '" data-status="Pending">Reopen</button>'];
        })) + '</div></section>';
    }
  };
})();

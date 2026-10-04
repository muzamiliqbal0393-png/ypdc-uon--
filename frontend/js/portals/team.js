(function () {
  'use strict';
  /* Team Leader dashboard + Team Member view + Admin team management.
     Data har waqt /api/teams/* se aati hai — frontend sirf dikhata hai. */

  var S = window.YPDC.state;
  var A = window.YPDC.actions;
  var esc = window.App.esc, I = window.App.I, fmt = window.App.fmtDate, ini = window.App.initials;

  var state = { owner: null, loading: false, mine: null, team: null, error: null, tab: 'members', admin: null, adminLoading: false, adminFilter: { q: '', status: '', page: 1 } };

  function api() { return window.YPDC.api; }
  function live() { var a = api(); return !!(a && a.available); }
  function toast() { return window.App.toast.apply(null, arguments); }
  function openModal() { return window.App.openModal.apply(null, arguments); }
  function closeModal() { return window.App.closeModal.apply(null, arguments); }
  function panel() { return window.App.$('[data-team-panel]'); }
  function head() { return window.PC.pageHead.apply(null, arguments); }

  function statusBadge(s) { return (window.App.Team || {}).statusBadge ? window.App.Team.statusBadge(s) : '<span class="badge badge-line">' + esc(s) + '</span>'; }

  /* account badalne par purana cached team/admin data hata dete hain */
  function ownerKey() {
    var me = S.me || {};
    var ss = S.session || {};
    return String(me.email || ss.email || ss.user_email || '') + '|' + String(ss.role || me.role || '');
  }
  function sync() {
    var key = ownerKey();
    if (state.owner === key) return;
    state.owner = key;
    state.mine = null; state.team = null; state.error = null; state.tab = 'members';
    state.admin = null; state.adminFilter = { q: '', status: '', page: 1 };
  }
  function loading(label) {
    return '<div class="team-empty"><b>' + esc(label || 'Loading team data…') + '</b><p>Fetching the latest record from the YPDC server.</p></div>';
  }

  /* ---------------- shared question: kaun hoon main is team mein ---------------- */
  function load() {
    if (!live()) { state.error = 'The YPDC server is not reachable right now.'; paint(); return; }
    state.loading = true; paint();
    api().teamMine().then(function (r) {
      state.mine = r;
      state.loading = false;
      var t = r.asLeader || (r.asMember && r.asMember.team) || null;
      if (!t) { state.team = null; paint(); return Promise.resolve(); }
      return api().teamGet(t.teamId).then(function (d) { state.team = d; paint(); });
    }).catch(function (e) {
      state.loading = false;
      state.error = (e && e.message) || 'Unable to load your team.';
      paint();
    });
  }

  /* ---------------- role-aware section ---------------- */
  function section() {
    sync();
    if (!state.mine && !state.loading && !state.error) setTimeout(load, 0);
    return head('Portal', 'My Team', 'Create and manage a team as its leader, or follow your team as a member.') +
      '<div data-team-panel>' + body() + '</div>';
  }

  function body() {
    if (state.error) {
      return '<div class="team-empty"><b>Unable to load team data</b><p>' + esc(state.error) + '</p>' +
        '<button class="btn btn-outline btn-sm" data-action="team-reload">Try again</button></div>';
    }
    if (state.loading || !state.mine) return loading();

    if (!state.mine.asLeader && !state.mine.asMember) {
      return '<div class="team-empty"><b>You are not in a team yet</b>' +
        '<p>Register your own team as a leader, or join an existing YPDC team as a member.</p>' +
        '<div class="btn-row" style="justify-content:center">' +
        '<button class="btn btn-gold btn-sm" data-action="team-leader-form">Register as Team Leader</button>' +
        '<button class="btn btn-outline btn-sm" data-action="join-team-form">Join a Team</button>' +
        '</div></div>';
    }

    var asLeader = state.mine.asLeader;
    var asMember = state.mine.asMember;
    var team = state.team ? state.team.team : (asLeader || (asMember && asMember.team));
    var relation = state.team ? state.team.relation : (asLeader ? 'leader' : 'member');
    var members = (state.team && state.team.members) || [];
    var tasks = (state.team && state.team.tasks) || [];
    var canManage = relation === 'leader' || relation === 'staff';

    var head_ =
      '<div class="team-panel-head">' +
      '<div><span class="eyebrow">' + (relation === 'leader' ? 'Team Leader dashboard' : 'Team member view') + '</span>' +
      '<h3 class="mt-6">' + esc(team.name) + '</h3>' +
      '<div class="tph-id">Team ID: <b>' + esc(team.teamId) + '</b> · created ' + fmt(team.createdAt) + '</div></div>' +
      '<div class="flex" style="gap:8px;flex-wrap:wrap">' + statusBadge(team.status) +
      '<span class="badge badge-line">' + (relation === 'leader' ? 'Leader' : 'Member') + '</span>' +
      (canManage ? '<button class="btn btn-outline btn-xs" data-action="team-edit">Edit team</button>' : '') +
      '</div></div>';

    var activeCount = members.filter(function (m) { return m.status === 'Active'; }).length;
    var pendingCount = members.filter(function (m) { return m.status === 'Pending'; }).length;
    var openTasks = tasks.filter(function (t) { return t.status !== 'Done'; }).length;
    var kpis = '<div class="team-kpis">' +
      '<div class="team-kpi"><div class="tk-k">Active members</div><div class="tk-v">' + activeCount + '</div><div class="tk-s">of ' + (team.expectedMembers || '—') + ' expected</div></div>' +
      '<div class="team-kpi"><div class="tk-k">Pending requests</div><div class="tk-v">' + pendingCount + '</div><div class="tk-s">' + (canManage ? 'waiting for your approval' : 'with the team leader') + '</div></div>' +
      '<div class="team-kpi"><div class="tk-k">Open tasks</div><div class="tk-v">' + openTasks + '</div><div class="tk-s">' + tasks.length + ' total</div></div>' +
      '<div class="team-kpi"><div class="tk-k">My status</div><div class="tk-v" style="font-size:18px">' + esc(relation === 'leader' ? 'Team Leader' : (asMember ? asMember.status : team.status)) + '</div>' +
      '<div class="tk-s">' + esc(relation === 'leader' ? 'Full control of this team' : 'Assigned by the leader') + '</div></div>' +
      '</div>';

    var anns = (state.team && state.team.announcements) || [];
    var tabs = '<div class="team-tabs">' +
      '<button class="' + (state.tab === 'members' ? 'is-on' : '') + '" data-action="team-tab" data-tab="members">Members</button>' +
      '<button class="' + (state.tab === 'tasks' ? 'is-on' : '') + '" data-action="team-tab" data-tab="tasks">Tasks</button>' +
      '<button class="' + (state.tab === 'ann' ? 'is-on' : '') + '" data-action="team-tab" data-tab="ann">Announcements' +
      (anns.length ? ' <b>' + anns.length + '</b>' : '') + '</button>' +
      '<button class="' + (state.tab === 'info' ? 'is-on' : '') + '" data-action="team-tab" data-tab="info">Team info</button>' +
      '</div>';

    var pane = state.tab === 'tasks' ? tasksPane(team, tasks, relation)
      : state.tab === 'ann' ? annPane(team, anns, relation)
        : state.tab === 'info' ? infoPane(team, relation)
          : membersPane(team, members, relation);

    return head_ + kpis + tabs + pane;
  }

  function memberActions(team, m, relation) {
    if (relation !== 'leader' && relation !== 'staff') return '';
    if (m.status === 'Pending') {
      return '<button class="btn btn-xs btn-green" data-action="team-member-status" data-id="' + esc(m.id) + '" data-status="Active">Approve</button>' +
        '<button class="btn btn-xs btn-danger" data-action="team-member-remove" data-id="' + esc(m.id) + '">Remove</button>';
    }
    if (m.status === 'Active') return '<button class="btn btn-xs btn-danger" data-action="team-member-remove" data-id="' + esc(m.id) + '">Remove</button>';
    return '';
  }

  function membersPane(team, members, relation) {
    var canManage = relation === 'leader' || relation === 'staff';
    return '<section class="panel mt-22"><div class="panel-head"><h3>Team members</h3>' +
      (canManage ? '<button class="btn btn-xs btn-gold" data-action="team-add-member">+ Add member</button>' : '') +
      '</div><div class="panel-body">' +
      (members.length ? members.map(function (m) {
        return '<div class="member-row"><span class="av">' + esc(ini(m.name)) + '</span>' +
          '<div class="tx"><b>' + esc(m.name) + '</b><small>' + esc(m.email) + (m.program ? ' · ' + esc(m.program) : '') + (m.semester ? ' · ' + esc(m.semester) + ' semester' : '') + '</small></div>' +
          '<div class="mr-act">' + statusBadge(m.status) + memberActions(team, m, relation) + '</div></div>';
      }).join('') : '<div class="team-empty"><b>No team members found</b><p>Approved and pending members appear here.</p></div>') +
      '</div></section>';
  }

  function annPane(team, anns, relation) {
    var canManage = relation === 'leader' || relation === 'staff';
    var composer = canManage
      ? '<div class="panel-note"><b>New announcement</b><p>Active members see this in their portal and get a notification.</p>' +
        '<form id="team-ann-form" novalidate><div class="form-grid">' +
        '<label class="field full"><span>Title *</span><input id="ann-title" required maxlength="120" placeholder="e.g. Meeting moved to Thursday"></label>' +
        '<label class="field full"><span>Announcement *</span><textarea id="ann-body" required maxlength="2000" placeholder="Write the full announcement for your team…"></textarea></label>' +
        '</div></form><div class="form-status" id="team-ann-status"></div>' +
        '<button class="btn btn-gold btn-sm mt-12" id="team-ann-post" data-action="team-ann-post">Post announcement</button></div>'
      : '<div class="panel-note"><b>Announcements from your team leader</b><p>Only the team leader can post here.</p></div>';
    return '<section class="panel mt-22"><div class="panel-head"><h3>Team announcements</h3>' +
      '<span class="badge badge-line">' + anns.length + '</span></div><div class="panel-body">' + composer +
      (anns.length ? anns.map(function (a) {
        return '<div class="member-row"><span class="av">' + esc(ini(a.author || 'YP')) + '</span>' +
          '<div class="tx"><b>' + esc(a.title) + '</b><small>' + esc(a.author || '') + ' · ' + fmt(a.createdAt) + '</small>' +
          '<p class="ann-body">' + esc(a.body) + '</p></div>' +
          '<div class="mr-act">' + (canManage ? '<button class="btn btn-xs btn-danger" data-action="team-ann-del" data-id="' + esc(a.id) + '">Delete</button>' : '') + '</div></div>';
      }).join('') : '<div class="team-empty"><b>No announcements yet</b><p>' +
        (canManage ? 'Post the first update for your team.' : 'Your team leader has not posted anything yet.') + '</p></div>') +
      '</div></section>';
  }

  function tasksPane(team, tasks, relation) {
    var canManage = relation === 'leader' || relation === 'staff';
    var rows = tasks.map(function (t) {
      var mine = String(t.assignee || '').toLowerCase() === String((S.me && S.me.email) || '').toLowerCase();
      return '<div class="member-row"><span class="av">' + esc((t.title || '?').slice(0, 2).toUpperCase()) + '</span>' +
        '<div class="tx"><b>' + esc(t.title) + '</b><small>' + (t.assignee ? 'Assigned to ' + esc(t.assignee) : 'Whole team') +
        (t.due ? ' · due ' + fmt(t.due) : '') + ' · ' + esc(t.priority) + '</small></div>' +
        '<div class="mr-act">' + statusBadge(t.status) +
        ((canManage || mine) ? '<button class="btn btn-xs btn-quiet" data-action="team-task-status" data-id="' + esc(t.id) + '" data-status="' + (t.status === 'Done' ? 'Pending' : 'Done') + '">' + (t.status === 'Done' ? 'Reopen' : 'Mark done') + '</button>' : '') +
        (canManage ? '<button class="btn btn-xs btn-danger" data-action="team-task-delete" data-id="' + esc(t.id) + '">Delete</button>' : '') +
        '</div></div>';
    }).join('');
    return '<section class="panel mt-22"><div class="panel-head"><h3>Team tasks</h3>' +
      (canManage ? '<button class="btn btn-xs btn-gold" data-action="team-task-add">+ Add task</button>' : '') +
      '</div><div class="panel-body">' +
      (tasks.length ? rows : '<div class="team-empty"><b>No team tasks yet</b><p>' + (canManage ? 'Add the first task for your team.' : 'Your leader has not added any task yet.') + '</p></div>') +
      '</div></section>';
  }

  function infoPane(team, relation) {
    return '<section class="panel mt-22"><div class="panel-head"><h3>Team information</h3>' +
      ((relation === 'leader' || relation === 'staff') ? '<button class="btn btn-xs btn-outline" data-action="team-edit">Edit</button>' : '') +
      '</div><div class="panel-body">' +
      '<div class="kv-list">' +
      '<div class="kv"><span>Team ID</span><b>' + esc(team.teamId) + '</b></div>' +
      '<div class="kv"><span>Team name</span><b>' + esc(team.name) + '</b></div>' +
      '<div class="kv"><span>Status</span><b>' + esc(team.status) + '</b></div>' +
      '<div class="kv"><span>Leader</span><b>' + esc(team.leader.name) + '</b></div>' +
      '<div class="kv"><span>Leader email</span><b>' + esc(team.leader.email) + '</b></div>' +
      '<div class="kv"><span>Program</span><b>' + esc(team.leader.program || '—') + '</b></div>' +
      '<div class="kv"><span>Expected members</span><b>' + (team.expectedMembers || '—') + '</b></div>' +
      '<div class="kv"><span>Created</span><b>' + fmt(team.createdAt) + '</b></div>' +
      '</div>' +
      '<div class="panel-note mt-16">' + esc(team.purpose || 'No purpose written yet.') + '</div>' +
      (team.description ? '<p class="mt-16" style="font-size:.94rem">' + esc(team.description) + '</p>' : '') +
      '</div></section>';
  }

  /* ---------------- paint / bind ---------------- */
  function paint() {
    var box = panel();
    if (!box) return;
    box.innerHTML = body();
  }

  function teamId() {
    var t = state.team && state.team.team;
    return t ? t.teamId : null;
  }

  function after(fn) {
    fn.then(function () { return load(); }).catch(function (e) { toast((e && e.message) || 'Action failed'); });
  }

  function bind() {
    var root = document;
    root.addEventListener('click', function (e) {
      var t = e.target.closest('[data-action]');
      if (!t) return;
      var a = t.getAttribute('data-action');
      var id = t.getAttribute('data-id');
      if (a.indexOf('team-') !== 0 && a.indexOf('admin-team-') !== 0) return;
      if (!panel() && !window.App.$('[data-admin-teams]')) return;

      if (a === 'team-reload') { state.error = null; load(); }
      if (a === 'team-tab') { state.tab = t.getAttribute('data-tab'); paint(); }
      if (a === 'team-member-status' && teamId()) {
        after(api().teamMemberPatch(teamId(), id, { status: t.getAttribute('data-status') }));
        toast('Member status updated', true);
      }
      if (a === 'team-member-remove' && teamId()) {
        after(api().teamMemberRemove(teamId(), id));
        toast('Member removed from the team', true);
      }
      if (a === 'team-task-status' && teamId()) {
        after(api().teamTaskPatch(teamId(), id, { status: t.getAttribute('data-status') }));
        toast('Task updated', true);
      }
      if (a === 'team-task-delete' && teamId()) {
        after(api().teamTaskDelete(teamId(), id));
        toast('Task deleted', true);
      }
      if (a === 'team-ann-post') postAnnouncement();
      if (a === 'team-ann-del' && teamId()) {
        after(api().teamAnnounceDelete(teamId(), id));
        toast('Announcement removed', true);
      }
      if (a === 'team-edit') editTeam();
      if (a === 'team-add-member') addMember();
      if (a === 'team-task-add') addTask();
      if (a === 'admin-team-view') adminView(id);
      if (a === 'admin-team-status') {
        var st = t.getAttribute('data-status');
        openModal({
          title: 'Please confirm',
          body: '<p class="mut">Team <b>' + esc(t.getAttribute('data-team')) + '</b> will be marked <b>' + esc(st) + '</b>. ' +
            (st === 'Active' ? 'Approved teams appear on the public team page and accept member registrations.' : 'Inactive teams no longer accept new members.') + '</p>',
          foot: '<button class="btn btn-outline" data-action="close-modal">Cancel</button>' +
            '<button class="btn btn-green" id="admin-team-confirm">' + esc(st) + '</button>'
        });
        window.App.$('#admin-team-confirm').addEventListener('click', function () {
          closeModal();
          api().teamPatch(id, { status: st }).then(function () { toast('Team ' + st, true); adminLoad(); }).catch(function (err) { toast((err && err.message) || 'Action failed'); });
        });
      }
      if (a === 'admin-team-member-status') {
        api().teamMemberPatch(id, t.getAttribute('data-mid'), { status: t.getAttribute('data-status') })
          .then(function () { toast('Member updated', true); adminView(id); adminLoad(); })
          .catch(function (err) { toast((err && err.message) || 'Action failed'); });
      }
      if (a === 'admin-team-member-remove') {
        api().teamMemberRemove(id, t.getAttribute('data-mid'))
          .then(function () { toast('Member removed', true); adminView(id); adminLoad(); })
          .catch(function (err) { toast((err && err.message) || 'Action failed'); });
      }
      if (a === 'admin-team-delete') {
        openModal({
          title: 'Please confirm',
          body: '<p class="mut">Team <b>' + esc(t.getAttribute('data-team')) + '</b> will be deactivated (kept in the database for the record).</p>',
          foot: '<button class="btn btn-outline" data-action="close-modal">Cancel</button><button class="btn btn-danger" id="admin-team-del">Deactivate</button>'
        });
        window.App.$('#admin-team-del').addEventListener('click', function () {
          closeModal();
          api().teamDelete(id).then(function () { toast('Team deactivated', true); adminLoad(); }).catch(function (err) { toast((err && err.message) || 'Action failed'); });
        });
      }
    });
  }

  /* ---------------- leader actions ---------------- */
  function editTeam() {
    var t = state.team && state.team.team;
    if (!t) return;
    openModal({
      eyebrow: t.teamId, title: 'Edit team',
      body: '<form id="team-edit-form" novalidate><div class="form-grid">' +
        '<label class="field full"><span>Team name</span><input id="te-name" value="' + esc(t.name) + '" maxlength="60"></label>' +
        '<label class="field"><span>Expected members</span><input id="te-expected" type="number" min="2" max="500" value="' + (t.expectedMembers || 2) + '"></label>' +
        '<label class="field full"><span>Team purpose</span><textarea id="te-purpose" maxlength="600">' + esc(t.purpose || '') + '</textarea></label>' +
        '<label class="field full"><span>Description</span><textarea id="te-desc" maxlength="600">' + esc(t.description || '') + '</textarea></label>' +
        '</div></form><div class="form-status" id="team-edit-status"></div>',
      foot: '<button class="btn btn-outline" data-action="close-modal">Cancel</button><button class="btn btn-gold" id="team-edit-save">Save changes</button>'
    });
    var btn = window.App.$('#team-edit-save');
    btn.addEventListener('click', function () {
      btn.classList.add('is-busy'); btn.disabled = true;
      api().teamPatch(t.teamId, {
        teamName: window.App.$('#te-name').value.trim(),
        expectedMembers: Number(window.App.$('#te-expected').value || 0),
        purpose: window.App.$('#te-purpose').value.trim(),
        description: window.App.$('#te-desc').value.trim()
      }).then(function () {
        closeModal(); toast('Team updated', true); load();
      }).catch(function (err) {
        var s = window.App.$('#team-edit-status');
        s.className = 'form-status is-err show';
        s.textContent = (err && err.message) || 'Unable to save changes. Please try again.';
      }).then(function () { btn.classList.remove('is-busy'); btn.disabled = false; });
    });
  }

  function addMember() {
    var t = state.team && state.team.team;
    if (!t) return;
    openModal({
      eyebrow: t.teamId, title: 'Add team member',
      sub: 'The member is saved against ' + t.teamId + ' and can sign in later with this email.',
      body: '<form id="team-member-form" novalidate><div class="form-grid">' +
        '<label class="field"><span>Full name *</span><input id="tm-name" required maxlength="120"></label>' +
        '<label class="field"><span>Email *</span><input id="tm-email" type="email" required></label>' +
        '<label class="field"><span>Program</span><input id="tm-program" maxlength="90"></label>' +
        '<label class="field"><span>Semester</span><input id="tm-semester" maxlength="30"></label>' +
        '</div></form><div class="form-status" id="team-member-status"></div>',
      foot: '<button class="btn btn-outline" data-action="close-modal">Cancel</button>' +
        '<button class="btn btn-gold" id="team-member-save">Add member</button>'
    });
    var btn = window.App.$('#team-member-save');
    btn.addEventListener('click', function () {
      var f = window.App.$('#team-member-form');
      if (!f.reportValidity()) return;
      btn.classList.add('is-busy'); btn.disabled = true;
      api().teamJoin(t.teamId, {
        name: window.App.$('#tm-name').value.trim(),
        email: window.App.$('#tm-email').value.trim(),
        program: window.App.$('#tm-program').value.trim(),
        semester: window.App.$('#tm-semester').value.trim()
      }).then(function (r) {
        closeModal(); toast('Member added to ' + t.teamId, true); load();
        return r;
      }).catch(function (err) {
        var s = window.App.$('#team-member-status');
        s.className = 'form-status is-err show';
        s.textContent = (err && err.message) || 'Unable to add this member. Please try again.';
      }).then(function () { btn.classList.remove('is-busy'); btn.disabled = false; });
    });
  }

  function postAnnouncement() {
    var t = state.team && state.team.team;
    if (!t) return;
    var f = window.App.$('#team-ann-form');
    var btn = window.App.$('#team-ann-post');
    if (!f || !f.reportValidity()) return;
    var st = window.App.$('#team-ann-status');
    btn.classList.add('is-busy'); btn.disabled = true;
    api().teamAnnounce(t.teamId, {
      title: window.App.$('#ann-title').value.trim(),
      body: window.App.$('#ann-body').value.trim()
    }).then(function () {
      state.tab = 'ann';
      toast('Announcement posted to ' + t.teamId, true);
      load();
    }).catch(function (err) {
      st.className = 'form-status is-err show';
      st.textContent = (err && err.message) || 'Unable to post the announcement. Please try again.';
    }).then(function () { btn.classList.remove('is-busy'); btn.disabled = false; });
  }

  function addTask() {
    var t = state.team && state.team.team;
    if (!t) return;
    var members = (state.team.members || []).filter(function (m) { return m.status === 'Active'; });
    openModal({
      eyebrow: t.teamId, title: 'Add team task',
      body: '<form id="team-task-form" novalidate><div class="form-grid">' +
        '<label class="field full"><span>Task title *</span><input id="tt-title" required maxlength="140" placeholder="e.g. Prepare posters for the peace walk"></label>' +
        '<label class="field"><span>Assign to</span><select id="tt-assignee"><option value="">Whole team</option>' +
        members.map(function (m) { return '<option value="' + esc(m.email) + '">' + esc(m.name) + ' (' + esc(m.email) + ')</option>'; }).join('') +
        '</select></label>' +
        '<label class="field"><span>Due date</span><input id="tt-due" type="date"></label>' +
        '<label class="field"><span>Priority</span><select id="tt-priority"><option>Normal</option><option>High</option><option>Low</option></select></label>' +
        '<label class="field full"><span>Details</span><textarea id="tt-detail" maxlength="600"></textarea></label>' +
        '</div></form><div class="form-status" id="team-task-status"></div>',
      foot: '<button class="btn btn-outline" data-action="close-modal">Cancel</button><button class="btn btn-gold" id="team-task-save">Add task</button>'
    });
    var btn = window.App.$('#team-task-save');
    btn.addEventListener('click', function () {
      var f = window.App.$('#team-task-form');
      if (!f.reportValidity()) return;
      btn.classList.add('is-busy'); btn.disabled = true;
      api().teamTaskAdd(t.teamId, {
        title: window.App.$('#tt-title').value.trim(),
        assignee: window.App.$('#tt-assignee').value,
        due: window.App.$('#tt-due').value,
        priority: window.App.$('#tt-priority').value,
        detail: window.App.$('#tt-detail').value.trim()
      }).then(function () {
        closeModal(); state.tab = 'tasks'; toast('Team task added', true); load();
      }).catch(function (err) {
        var s = window.App.$('#team-task-status');
        s.className = 'form-status is-err show';
        s.textContent = (err && err.message) || 'Unable to add this task.';
      }).then(function () { btn.classList.remove('is-busy'); btn.disabled = false; });
    });
  }

  /* ---------------- admin team management ---------------- */
  /* R39.0 — team leader documents (photo + ID card) */
  function teamDocs(person) {
    var items = [['Photo', person && person.photo], ['ID card', person && person.idCard]];
    var have = items.filter(function (x) { return !!x[1]; });
    if (!have.length) return '<span class="mut" style="font-size:.78rem">—</span>';
    return '<div class="doc-cell">' + have.map(function (x) {
      return '<button type="button" class="doc-thumb" data-action="view-doc" data-src="' + esc(x[1]) +
        '" data-title="' + esc(((person && person.name) || 'Member') + ' — ' + x[0]) + '" title="' + esc(x[0]) + '">' +
        '<img src="' + esc(x[1]) + '" alt="' + esc(x[0]) + '" loading="lazy"><span>' + esc(x[0]) + '</span></button>';
    }).join('') + '</div>';
  }

  function adminSection() {
    sync();
    if (!state.admin && !state.adminLoading) setTimeout(adminLoad, 0);
    return head('Admin portal', 'Team Management', 'Every team, its leader and members — search, review, approve, activate or deactivate.',
      '<button class="btn btn-outline btn-sm" data-action="refresh-data">Refresh data</button>') +
      '<div data-admin-teams>' + adminBody() + '</div>';
  }

  function adminBody() {
    if (state.adminLoading || !state.admin) return loading('Loading teams…');
    var d = state.admin;
    var c = d.counts || {};
    return '<section class="panel"><div class="panel-head"><h3>Teams</h3>' +
      '<div class="tm-counts">' +
      ['all', 'pending', 'active', 'inactive', 'rejected'].map(function (k) {
        var val = k === 'all' ? (d.total || 0) : (c[k] || 0);
        return '<span class="tm-count">' + k.charAt(0).toUpperCase() + k.slice(1) + ' <b>' + val + '</b></span>';
      }).join('') + '</div></div>' +
      '<div class="panel-body">' +
      '<div class="tm-filter">' +
      '<label class="field" style="margin-bottom:0;flex:1 1 240px"><span>Search</span>' +
      '<input id="tm-q" placeholder="Team name, leader or TEAM-001" value="' + esc(state.adminFilter.q) + '"></label>' +
      '<label class="field" style="margin-bottom:0"><span>Status</span><select id="tm-status">' +
      ['', 'Pending', 'Active', 'Inactive', 'Rejected'].map(function (s) {
        return '<option value="' + s + '"' + (state.adminFilter.status === s ? ' selected' : '') + '>' + (s || 'All statuses') + '</option>';
      }).join('') + '</select></label>' +
      '<button class="btn btn-gold btn-sm" data-action="admin-teams-filter">Apply</button>' +
      '<button class="btn btn-outline btn-sm" data-action="admin-teams-clear">Clear</button>' +
      '</div>' +
      (d.teams && d.teams.length ? '<div style="overflow:auto" class="mt-16">' + window.PC.table(
        ['Team', 'Team ID', 'Leader', 'Documents', 'Members', 'Created', 'Status', 'Actions'],
        d.teams.map(function (t) {
          return ['<b>' + esc(t.name) + '</b>', '<code>' + esc(t.teamId) + '</code>',
            esc(t.leader.name) + '<br><small class="mut">' + esc(t.leader.email) + '</small>',
            teamDocs(t.leader),
            String(t.members), fmt(t.createdAt), statusBadge(t.status),
            '<div class="btn-row" style="gap:6px">' +
            '<button class="btn btn-xs btn-quiet" data-action="admin-team-view" data-id="' + esc(t.teamId) + '">View</button>' +
            (t.status !== 'Active' ? '<button class="btn btn-xs btn-green" data-action="admin-team-status" data-id="' + esc(t.teamId) + '" data-status="Active" data-team="' + esc(t.name) + '">Activate</button>' : '') +
            (t.status === 'Active' || t.status === 'Pending' ? '<button class="btn btn-xs btn-danger" data-action="admin-team-status" data-id="' + esc(t.teamId) + '" data-status="Rejected" data-team="' + esc(t.name) + '">Reject</button>' : '') +
            (t.status !== 'Inactive' ? '<button class="btn btn-xs btn-danger" data-action="admin-team-delete" data-id="' + esc(t.teamId) + '" data-team="' + esc(t.name) + '">Deactivate</button>' : '') +
            '</div>'];
        })
      ) + '</div>' : '<div class="team-empty mt-16"><b>No teams found</b><p>' + (state.adminFilter.q || state.adminFilter.status ? 'Try a different search or status filter.' : 'Team leader registrations from the public website appear here.') + '</p></div>') +
      (d.pages > 1 ? '<div class="btn-row mt-16">' +
        '<button class="btn btn-outline btn-xs" data-action="admin-teams-page" data-page="' + Math.max(1, d.page - 1) + '">‹ Prev</button>' +
        '<span class="mut" style="align-self:center;font-size:13px">Page ' + d.page + ' of ' + d.pages + ' · ' + d.total + ' teams</span>' +
        '<button class="btn btn-outline btn-xs" data-action="admin-teams-page" data-page="' + Math.min(d.pages, d.page + 1) + '">Next ›</button></div>' : '') +
      '</div></section>';
  }

  function adminLoad() {
    if (!live()) { state.adminLoading = false; state.admin = { teams: [], total: 0, counts: {} }; paintAdmin(); return; }
    state.adminLoading = true; paintAdmin();
    var f = state.adminFilter;
    api().teamsList({ q: f.q || undefined, status: f.status || undefined, page: f.page, perPage: 20 }).then(function (d) {
      state.adminLoading = false; state.admin = d; paintAdmin();
    }).catch(function (e) {
      state.adminLoading = false;
      state.admin = { teams: [], total: 0, counts: {}, error: (e && e.message) || 'Unable to load teams.' };
      paintAdmin();
    });
  }

  function paintAdmin() {
    var box = window.App.$('[data-admin-teams]');
    if (!box) return;
    if (state.admin && state.admin.error) {
      box.innerHTML = '<div class="team-empty"><b>Unable to load teams</b><p>' + esc(state.admin.error) + '</p></div>';
      return;
    }
    box.innerHTML = adminBody();
    var q = window.App.$('#tm-q'), st = window.App.$('#tm-status');
    if (q) q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { state.adminFilter.q = q.value.trim(); state.adminFilter.page = 1; adminLoad(); } });
    if (st) st.addEventListener('change', function () { state.adminFilter.status = st.value; state.adminFilter.page = 1; adminLoad(); });
  }

  function adminView(teamId) {
    api().teamGet(teamId).then(function (d) {
      var t = d.team;
      var members = d.members || [];
      var tasks = d.tasks || [];
      openModal({
        eyebrow: 'TEAM DETAILS', title: t.name, sub: t.teamId + ' · ' + t.status + ' · created ' + fmt(t.createdAt),
        body:
          '<div class="grid g2" style="gap:12px">' +
          '<div class="card card-tight"><span class="stat-label mut">Leader</span><b>' + esc(t.leader.name) + '</b><small class="mut" style="display:block">' + esc(t.leader.email) + '</small></div>' +
          '<div class="card card-tight"><span class="stat-label mut">Members</span><b>' + members.length + '</b><small class="mut" style="display:block">' + members.filter(function (m) { return m.status === 'Active'; }).length + ' active · ' + members.filter(function (m) { return m.status === 'Pending'; }).length + ' pending</small></div>' +
          '</div>' +
          '<div class="panel-note mt-16">' + esc(t.purpose || 'No purpose written.') + '</div>' +
          (t.description ? '<p class="mt-16" style="font-size:.93rem">' + esc(t.description) + '</p>' : '') +
          '<h4 class="mt-22">Members</h4>' +
          (members.length ? members.map(function (m) {
            return '<div class="member-row"><span class="av">' + esc(ini(m.name)) + '</span>' +
              '<div class="tx"><b>' + esc(m.name) + '</b><small>' + esc(m.email) + (m.program ? ' · ' + esc(m.program) : '') + ' · joined ' + fmt(m.joinedAt) + '</small></div>' +
              '<div class="mr-act">' + statusBadge(m.status) +
              (m.status === 'Pending' ? '<button class="btn btn-xs btn-green" data-action="admin-team-member-status" data-id="' + esc(t.teamId) + '" data-mid="' + esc(m.id) + '" data-status="Active">Approve</button>' : '') +
              '<button class="btn btn-xs btn-danger" data-action="admin-team-member-remove" data-id="' + esc(t.teamId) + '" data-mid="' + esc(m.id) + '">Remove</button>' +
              '</div></div>';
          }).join('') : '<p class="mut">No team members found.</p>') +
          '<h4 class="mt-22">Team tasks</h4>' +
          (tasks.length ? tasks.map(function (x) {
            return '<div class="member-row"><div class="tx"><b>' + esc(x.title) + '</b><small>' + (x.assignee ? esc(x.assignee) : 'Whole team') + (x.due ? ' · due ' + fmt(x.due) : '') + '</small></div><div class="mr-act">' + statusBadge(x.status) + '</div></div>';
          }).join('') : '<p class="mut">No team tasks yet.</p>'),
        foot: '<button class="btn btn-outline" data-action="close-modal">Close</button>' +
          (t.status !== 'Active' ? '<button class="btn btn-green" data-action="admin-team-status" data-id="' + esc(t.teamId) + '" data-status="Active" data-team="' + esc(t.name) + '">Activate team</button>' : '')
      });
    }).catch(function (e) { toast((e && e.message) || 'Unable to load this team.'); });
  }

  /* admin teams filter actions are handled here (they are team-* / admin-team-* prefixed) */
  function bindAdmin() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-action]');
      if (!t) return;
      var a = t.getAttribute('data-action');
      if (a === 'admin-teams-filter') { state.adminFilter.q = (window.App.$('#tm-q') || {}).value || ''; state.adminFilter.page = 1; adminLoad(); }
      if (a === 'admin-teams-clear') { state.adminFilter = { q: '', status: '', page: 1 }; adminLoad(); }
      if (a === 'admin-teams-page') { state.adminFilter.page = Number(t.getAttribute('data-page') || 1); adminLoad(); }
    });
  }

  bind();
  bindAdmin();

  window.PC.TEAM = {
    section: section,
    adminSection: adminSection,
    reload: load,
    adminLoad: adminLoad,
    state: state
  };
  window.App.TeamPortal = window.PC.TEAM;
})();

(function () {
  'use strict';
  var App = window.App;
  var S = window.YPDC.state;
  var A = window.YPDC.actions;
  var $ = App.$, $$ = App.$$, esc = App.esc, img = App.img,
      I = App.Icons, fmtDate = App.fmtDate, initials = App.initials,
      money = App.money, slugTitle = App.slugTitle, roleTitle = App.roleTitle;

  function table() { return window.PC.table.apply(null, arguments); }
  function statusBadge() { return window.PC.statusBadge.apply(null, arguments); }
  function toast() { return App.toast.apply(null, arguments); }
  function openModal() { return App.openModal.apply(null, arguments); }
  function closeModal() { return App.closeModal.apply(null, arguments); }
  function render() { return App.render.apply(null, arguments); }
  function openRegisterModal(id) {
    var e = S.events.filter(function (x) { return x.id === id; })[0];
    if (!e) return;
    var p = S.session ? (S.profiles[S.session.role.toLowerCase()] || {}) : {};
    openModal({
      eyebrow: 'Event registration', title: e.title,
      sub: [fmtDate(e.date), e.time, e.venue || e.location || ''].filter(Boolean).join(' · '),
      body: '<div class="grid g2 mb-16">' +
        '<div class="card card-tight"><span class="stat-label mut">Organized by</span><b style="display:block">' + esc(e.organizer) + '</b></div>' +
        '<div class="card card-tight"><span class="stat-label mut">Seats</span><b style="display:block">' + e.registered + ' / ' + e.capacity + ' filled</b></div></div>' +
        '<form data-form="register" id="reg-form"><div class="form-grid">' +
        '<label class="field"><span>Full name</span><input name="name" required value="' + esc(p.name || '') + '"></label>' +
        '<label class="field"><span>Email</span><input name="email" type="email" required value="' + esc(p.email || '') + '"></label>' +
        '<label class="field full"><span>Note (optional)</span><input name="note" placeholder="Any accessibility or duty preference?"></label>' +
        '<input type="hidden" name="eventId" value="' + e.id + '">' +
        '</div></form>',
      foot: '<button class="btn btn-outline" data-action="close-modal">Cancel</button>' +
        '<button class="btn btn-gold" data-action="do-register" data-id="' + e.id + '">Confirm registration ' + I.arrow + '</button>'
    });
    var btn = $('[data-action="do-register"]');
    btn.addEventListener('click', function () {
      var f = $('#reg-form');
      if (!f.reportValidity()) return;
      var d = {}; $$('input', f).forEach(function (el) { d[el.name] = el.value; });
      var res = A.registerEvent(d.eventId, d.name, d.email, d.note);
      if (res === 'duplicate') { toast('This email is already registered for the event'); return; }
      closeModal(); toast('Registration confirmed — see you at ' + e.title + '!', true); render();
    });
  }

  function openCertificateModal(id) {
    var c = S.certificates.filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    openModal({
      eyebrow: 'Certificate', title: c.title, sub: c.event + ' · ' + c.status,
      body: '<div class="card" style="background:var(--cream-2);border:1px dashed var(--gold-strong);text-align:center;padding:34px">' +
        '<div style="display:flex;justify-content:center">' +
        '<img src="' + App.img('logo-ypdc-mark.png') + '" alt="YPDC" width="56" height="56"></div>' +
        '<h3 class="mt-16">YPDC UON — Certificate of Participation</h3>' +
        '<p class="mut mt-10">This certifies that</p>' +
        '<p style="font-family:var(--serif);font-size:1.5rem;color:var(--green-800)" class="mt-6">' + esc((S.profiles[S.session ? S.session.role.toLowerCase() : 'student'] || {}).name || 'YPDC Member') + '</p>' +
        '<p class="mut mt-10">participated in <b>' + esc(c.event) + '</b></p>' +
        '<div class="flex-between mt-32"><span class="mut" style="font-size:.8rem">Code: ' + esc(c.code) + '</span>' +
        '<span class="mut" style="font-size:.8rem">Issued: ' + fmtDate(c.date) + '</span></div></div>' +
        '<div class="panel-note mt-16">This is the certificate preview (code verified by the server). The PDF file is generated server-side.</div>',
      foot: '<button class="btn btn-outline" data-action="close-modal">Close</button>' +
        '<button class="btn btn-green" data-action="close-modal">Close preview</button>'
    });
  }

  function openAssignModal(id) {
    var a = S.applications.filter(function (x) { return x.id === id; })[0];
    if (!a) return;
    openModal({
      eyebrow: 'Assign directorate', title: a.name, sub: a.program,
      body: '<form id="assign-form"><div class="field"><span>Preferred</span><input value="' + esc(a.directorate) + '" readonly></div>' +
        '<label class="field"><span>Assign to directorate</span><select name="dir">' +
        S.directorates.map(function (d) { return '<option' + (d.name === a.directorate ? ' selected' : '') + '>' + esc(d.name) + '</option>'; }).join('') +
        '</select></label>' +
        '<label class="field"><span>Post</span><select name="post"><option>Member</option><option>Volunteer</option><option>Web Volunteer</option><option>Event Volunteer</option><option>Assistant Director</option></select></label></form>',
      foot: '<button class="btn btn-outline" data-action="close-modal">Cancel</button>' +
        '<button class="btn btn-green" data-action="assign-confirm" data-id="' + a.id + '">Assign &amp; notify ' + I.arrow + '</button>'
    });
    $('[data-action="assign-confirm"]').addEventListener('click', function () {
      var sel = $('#assign-form select[name="dir"]');
      A.assignDirectorate(a.id, sel.value);
      closeModal(); toast(a.name + ' assigned to ' + sel.value, true); render();
    });
  }

  function openRoleModal(id) {
    var p = S.people.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    var api = window.YPDC.api;
    var server = !!(api && api.available && ACCOUNT_ROLES.indexOf(p.role) > -1);

    var options = server ? ACCOUNT_ROLES
      : ['Member', 'Volunteer', 'Web Volunteer', 'Event Volunteer', 'Assistant Director', 'Director', 'Lead'];
    var current = server ? p.role : p.post;

    openModal({
      eyebrow: server ? 'Account role' : 'Change role', title: p.name,
      sub: server ? (p.email + ' · change login role') : (p.directorate + ' · ' + p.type),
      body: '<label class="field"><span>' + (server ? 'Login role' : 'Post / Role') + '</span><select id="role-select">' +
        options.map(function (r) {
          return '<option' + (r === current ? ' selected' : '') + '>' + r + '</option>';
        }).join('') + '</select></label>' +
        '<div class="panel-note">' + (server
          ? 'Changing a role requires that user to log in again (the old session ends). The change is recorded in the audit log.'
          : 'Role change is recorded in the admin activity log for transparency.') + '</div>',
      foot: '<button class="btn btn-outline" data-action="close-modal">Cancel</button>' +
        '<button class="btn btn-green" data-action="role-confirm" data-id="' + p.id + '">Save role</button>'
    });
    $('[data-action="role-confirm"]').addEventListener('click', function () {
      var newRole = $('#role-select').value;
      if (server) {
        api.adminUpdateUser(p.id, { role: newRole }).then(function () { return api.loadState(); })
          .then(function (cols) { window.YPDC.loadFromServer(cols); closeModal(); toast('Role is now ' + newRole + ' — ' + p.name); render(); })
          .catch(function (err) { toast(err.message || 'Role change fail'); });
        return;
      }
      A.changePersonRole(p.id, newRole);
      closeModal(); toast('Role updated for ' + p.name); render();
    });
  }

  /* Batch D — user detail + activity (admin) */
  function userIdOf(id) {
    var list = (window.PC && window.PC.adminData && window.PC.adminData.userById(id)) || null;
    return list;
  }

  function activityList(rows, roleLabel) {
    if (!rows || !rows.length) return '<p class="mut" style="font-size:.88rem">No activity recorded for this account yet.</p>';
    var label = (window.PC && window.PC.adminData && window.PC.adminData.actionLabel) || {};
    return '<div class="activity-list">' + rows.map(function (e) {
      return '<div class="activity-row"><span class="badge ' + (e.ok ? 'badge-line' : 'badge-danger') + '">' + (e.ok ? 'OK' : 'Failed') + '</span>' +
        '<div class="txt"><b>' + esc(label[e.action] || e.action) + '</b><small>' + esc(e.detail || e.target || '—') + '</small></div>' +
        '<span class="mut" style="font-size:.76rem;white-space:nowrap">' + esc((e.at || '').replace('T', ' ').slice(0, 16)) + '</span></div>';
    }).join('') + '</div>';
  }

  function openUserModal(id) {
    var api = window.YPDC.api;
    var local = userIdOf(id);
    var roleLabel = (window.PC && window.PC.adminData && window.PC.adminData.roleLabel) || {};
    if (!api || !api.available) { toast('The server is offline'); return; }

    var shell = function (body) {
      openModal({
        eyebrow: 'Admin · Account', title: local ? local.name : 'Account',
        sub: local ? (local.email + ' · ' + (roleLabel[local.role] || local.role)) : '',
        body: body
      });
    };
    shell('<p class="mut">Loading account details…</p>');

    Promise.all([api.adminUser(id), api.adminUserActivity(id, { perPage: 10 })]).then(function (r) {
      var u = r[0].user, flags = r[0].flags || {}, sum = r[1].summary || {};
      var meta = (u.meta && typeof u.meta === 'object') ? u.meta : {};
      var isSelf = flags.is_self, lastAdmin = flags.is_last_admin;
      var acts = '<div class="btn-row mt-16">' +
        '<button class="btn btn-outline btn-sm" data-action="user-role" data-id="' + esc(u.id) + '">Change role</button>' +
        '<button class="btn btn-outline btn-sm" data-action="user-reset-access" data-id="' + esc(u.id) + '" data-email="' + esc(u.email) + '">Reset access</button>' +
        '<button class="btn btn-outline btn-sm" data-action="user-revoke" data-id="' + esc(u.id) + '" data-email="' + esc(u.email) + '">Sign out everywhere</button>' +
        (isSelf || lastAdmin ? '' :
          '<button class="btn btn-sm ' + (u.is_active ? 'btn-danger' : 'btn-green') + '" data-action="user-status" data-id="' + esc(u.id) + '" data-status="' + (u.is_active ? 'inactive' : 'active') + '">' + (u.is_active ? 'Deactivate' : 'Activate') + '</button>' +
          '<button class="btn btn-danger btn-sm" data-action="user-delete" data-id="' + esc(u.id) + '" data-email="' + esc(u.email) + '">Delete account</button>') +
        '</div>';

      openModal({
        eyebrow: 'Admin · Account', title: u.name,
        sub: u.email + ' · ' + (roleLabel[u.role] || u.role) + (isSelf ? ' · this is you' : '') + (lastAdmin ? ' · last admin' : ''),
        body: '<div class="panel-note">' + (u.is_active ? 'Active account.' : 'This account is deactivated and cannot sign in.') +
            (lastAdmin ? ' This is the last active admin — it can never be deactivated, deleted or demoted.' : '') + '</div>' +
          '<div class="grid g3 mt-16">' +
          [['Logins', sum.logins || 0], ['Failed attempts', sum.failed || 0], ['Notifications', sum.notifications || 0],
           ['Messages', sum.messages || 0], ['Created', (u.created_at || '').slice(0, 10) || '—'], ['Last login', (u.last_login || 'never').replace('T', ' ').slice(0, 16)]]
            .map(function (t) { return '<div class="card card-tight"><span class="stat-label mut">' + t[0] + '</span><b style="display:block">' + esc(String(t[1])) + '</b></div>'; }).join('') +
          '</div>' +
          '<div class="mt-16">' + table(['Field', 'Value'], [
            ['Role', esc(roleLabel[u.role] || u.role)],
            ['Directorate', esc(u.directorate || '—')],
            ['Program', esc(u.program || '—')],
            ['Phone', esc(u.phone || '—')],
            ['City', esc(meta.city || '—')],
            ['Account status', u.is_active ? statusBadge('Active') : '<span class="badge badge-danger">Deactivated</span>']
          ]) + '</div>' +
          '<h4 class="mt-22">Recent activity</h4>' + activityList(r[1].entries, roleLabel) +
          '<div class="panel-note mt-16">Every entry above comes from the audit_log table. Passwords and tokens are never shown.</div>' + acts
      });
    }).catch(function (e) {
      shell('<b style="color:var(--danger)">Could not load this account</b><p class="mut mt-6" style="font-size:.88rem">' + esc(e.message || '') + '</p>');
    });
  }

  function openUserRoleModal(id) {
    var api = window.YPDC.api;
    var u = userIdOf(id);
    if (!api || !api.available || !u) { openRoleModal(id); return; }
    if (u.is_last_admin) { toast('The last active admin cannot be demoted'); return; }
    var roles = ['student', 'member', 'directorate', 'faculty', 'admin', 'alumni'];
    var label = (window.PC && window.PC.adminData && window.PC.adminData.roleLabel) || {};
    openModal({
      eyebrow: 'Admin · Account role', title: u.name, sub: u.email + ' · change login role',
      body: '<label class="field"><span>Login role</span><select id="user-role-select">' +
        roles.map(function (r) { return '<option value="' + r + '"' + (r === u.role ? ' selected' : '') + '>' + esc(label[r] || r) + '</option>'; }).join('') +
        '</select></label><div class="panel-note">Changing a role signs that user out of every device (the old session ends). The change is recorded in the audit log.</div>',
      foot: '<button class="btn btn-outline" data-action="close-modal">Cancel</button>' +
        '<button class="btn btn-green" data-action="user-role-save" data-id="' + esc(u.id) + '">Save role</button>'
    });
  }

  function openEventModal() {
    openModal({
      eyebrow: 'Admin · Events', title: 'Create new event',
      body: '<form data-form="event" id="event-form"><div class="form-grid">' +
        '<label class="field full"><span>Event title</span><input name="title" required placeholder="e.g. Campus Peace Dialogue"></label>' +
        '<label class="field"><span>Date</span><input name="date" type="date" required value="' + window.YPDC.today() + '"></label>' +
        '<label class="field"><span>Time</span><input name="time" required placeholder="11:00 AM"></label>' +
        '<label class="field"><span>Location</span><input name="location" required placeholder="Seminar Hall"></label>' +
        '<label class="field"><span>Category</span><input name="category" placeholder="Leadership / Workshop / Community"></label>' +
        '<label class="field"><span>Organizer</span><input name="organizer" value="YPDC UON"></label>' +
        '<label class="field"><span>Directorate</span><select name="directorate">' + S.directorates.map(function (d) { return '<option>' + esc(d.name) + '</option>'; }).join('') + '</select></label>' +
        '<label class="field"><span>Capacity</span><input name="capacity" type="number" value="100"></label>' +
        '<label class="field"><span>Status</span><select name="status"><option selected>Upcoming</option><option>Completed</option></select></label>' +
        '<label class="field full"><span>Description</span><textarea name="desc" placeholder="Short event description for the public page..."></textarea></label>' +
        '</div></form>',
      foot: '<button class="btn btn-outline" data-action="close-modal">Cancel</button>' +
        '<button class="btn btn-gold" id="event-save">Publish event ' + I.arrow + '</button>'
    });
    $('#event-save').addEventListener('click', function () {
      var f = $('#event-form');
      if (!f.reportValidity()) return;
      var d = {}; $$('input,select,textarea', f).forEach(function (el) { if (el.name) d[el.name] = el.value; });
      A.addEvent({
        title: d.title, date: d.date, time: d.time, venue: d.location, location: d.location,
        category: d.category || 'General', organizer: d.organizer || 'YPDC UON', directorate: d.directorate,
        capacity: Number(d.capacity || 100), status: d.status || 'Upcoming', featured: false, registered: 0,
        desc: d.desc || 'YPDC UON activity — details will be shared with registered participants.',
        image: 'summit-hall.jpg'
      });
      closeModal(); toast('Event published — it is on the calendar now', true); render();
    });
  }

  function openEditEventModal(id) {
    var e = S.events.filter(function (x) { return x.id === id; })[0];
    if (!e) return;
    openModal({
      eyebrow: 'Admin · Events', title: 'Edit event', sub: e.title,
      body: '<form id="event-edit"><div class="form-grid">' +
        '<label class="field full"><span>Title</span><input name="title" value="' + esc(e.title) + '"></label>' +
        '<label class="field"><span>Date</span><input name="date" type="date" value="' + e.date + '"></label>' +
        '<label class="field"><span>Time</span><input name="time" value="' + esc(e.time) + '"></label>' +
        '<label class="field"><span>Location</span><input name="location" value="' + esc(e.venue || e.location || '') + '"></label>' +
        '<label class="field"><span>Category</span><input name="category" value="' + esc(e.category || 'General') + '"></label>' +
        '<label class="field"><span>Capacity</span><input name="capacity" type="number" value="' + (e.capacity || 0) + '"></label>' +
        '<label class="field"><span>Directorate</span><select name="directorate">' + S.directorates.map(function (d) {
          return '<option' + ((e.directorate || '') === d.name ? ' selected' : '') + '>' + esc(d.name) + '</option>';
        }).join('') + '</select></label>' +
        '<label class="field"><span>Status</span><select name="status"><option' + (e.status === 'Upcoming' ? ' selected' : '') + '>Upcoming</option><option' + (e.status === 'Completed' ? ' selected' : '') + '>Completed</option></select></label>' +
        '<label class="field full"><span>Description</span><textarea name="desc">' + esc(e.desc || '') + '</textarea></label>' +
        '</div></form>',
      foot: '<button class="btn btn-outline" data-action="close-modal">Cancel</button>' +
        '<button class="btn btn-green" id="event-update">Save changes</button>'
    });
    $('#event-update').addEventListener('click', function () {
      var d = {}; $$('input,select,textarea', $('#event-edit')).forEach(function (el) { if (el.name) d[el.name] = el.value; });
      A.updateEvent(e.id, {
        title: d.title, date: d.date, time: d.time, venue: d.location, location: d.location,
        category: d.category, directorate: d.directorate, capacity: Number(d.capacity),
        status: d.status, desc: d.desc
      });
      closeModal(); toast('Event updated — calendar and public page follow', true); render();
    });
  }

  /* Batch F — event detail (calendar + agenda se) */
  function openEventDetailModal(id) {
    var e = S.events.filter(function (x) { return x.id === id; })[0];
    if (!e) { toast('This event is no longer available'); return; }
    var api = window.YPDC.api;
    var u = (api && api.user) || (S.session || {});
    var loggedIn = !!(api && api.available && u && u.id);
    var reg = (S.registrations || []).filter(function (r) { return r.eventId === e.id && (r.email === u.email || r.userId === u.id); })[0];
    var regCount = Number(e.registered) || 0;
    var cap = Number(e.capacity) || 0;
    var left = Math.max(0, cap - regCount);
    var isAdmin = (u.role || '').toLowerCase() === 'admin';
    var open = e.status === 'Upcoming' && (!cap || left > 0);

    var statusBadgeHtml = reg
      ? '<span class="badge badge-ok">You are registered</span>'
      : open ? '<span class="badge badge-gold">Registration open</span>'
      : '<span class="badge badge-line">' + (e.status === 'Completed' ? 'Event completed' : 'Seats full') + '</span>';

    var body = '<div class="panel-note">' + statusBadgeHtml +
      ' <b>' + regCount + '</b> registered' + (cap ? ' of ' + cap + ' seats · ' + left + ' left' : ' · open entry') + '</div>' +
      '<div class="grid g2 mt-16">' +
      [['Date', fmtDate(e.date)], ['Time', esc(e.time || '\u2014')], ['Venue', esc(e.venue || e.location || '\u2014')], ['Category', esc(e.category || 'General')],
       ['Organized by', esc(e.organizer || 'YPDC UON')], ['Directorate', esc(e.directorate || '\u2014')]]
        .map(function (x) { return '<div class="card card-tight"><span class="stat-label mut">' + x[0] + '</span><b style="display:block">' + x[1] + '</b></div>'; }).join('') +
      '</div>' +
      (e.desc ? '<p class="mt-16" style="font-size:.92rem">' + esc(e.desc) + '</p>' : '') +
      (reg ? '<div class="panel-note mt-16">Your registration is confirmed. Bring your student card to the venue; attendance is marked by the organisers.</div>' : '') +
      '<div class="btn-row mt-16">' +
      (isAdmin ? '<button class="btn btn-outline btn-sm" data-action="edit-event" data-id="' + esc(e.id) + '">Edit event</button>' +
                 '<button class="btn btn-danger btn-sm" data-action="del-event" data-id="' + esc(e.id) + '" data-title="' + esc(e.title) + '">Delete event</button>' : '') +
      '<a class="btn btn-quiet btn-sm" href="#/event/' + esc(e.id) + '">Open full page</a>' +
      (loggedIn ? (reg
        ? '<button class="btn btn-danger btn-sm" data-action="cancel-registration" data-id="' + esc(reg.id) + '">Cancel my registration</button>'
        : (open ? '<button class="btn btn-green btn-sm" data-action="register-event" data-id="' + esc(e.id) + '">Register for this event</button>'
                : '<span class="badge badge-line" style="align-self:center">Registration is closed</span>'))
        : '<a class="btn btn-green btn-sm" href="#/login">Sign in to register</a>') +
      '</div>';

    openModal({
      eyebrow: e.status === 'Upcoming' ? 'Upcoming event' : 'Past event',
      title: e.title,
      sub: [fmtDate(e.date), e.time, e.venue || e.location].filter(Boolean).join(' \u00b7 '),
      body: body,
      foot: '<button class="btn btn-outline" data-action="close-modal">Close</button>'
    });
  }

  function openTaskModal() {
    openModal({
      eyebrow: 'Directorate', title: 'Assign a new task',
      body: '<form id="task-form"><div class="form-grid">' +
        '<label class="field full"><span>Task title</span><input name="title" required placeholder="e.g. Prepare volunteer briefing notes"></label>' +
        '<label class="field"><span>Assign to</span><select name="owner">' + S.people.map(function (p) { return '<option>' + esc(p.name) + '</option>'; }).join('') + '</select></label>' +
        '<label class="field"><span>Directorate</span><select name="directorate">' + S.directorates.map(function (d) { return '<option>' + esc(d.name) + '</option>'; }).join('') + '</select></label>' +
        '<label class="field"><span>Due date</span><input name="due" type="date" value="' + window.YPDC.today() + '"></label>' +
        '<label class="field"><span>Priority</span><select name="priority"><option>High</option><option selected>Medium</option><option>Low</option></select></label>' +
        '</div></form>',
      foot: '<button class="btn btn-outline" data-action="close-modal">Cancel</button>' +
        '<button class="btn btn-green" id="task-save">Assign task</button>'
    });
    $('#task-save').addEventListener('click', function () {
      var f = $('#task-form'); if (!f.reportValidity()) return;
      var d = {}; $$('input,select', f).forEach(function (el) { if (el.name) d[el.name] = el.value; });
      A.addTask({ title: d.title, owner: d.owner, role: 'member', directorate: d.directorate, due: d.due, status: 'Pending', priority: d.priority });
      closeModal(); toast('Task assigned to ' + d.owner); render();
    });
  }

  var ACCOUNT_ROLES = ['student', 'member', 'directorate', 'faculty', 'admin', 'alumni'];

  function openPersonModal() {
    var api = window.YPDC.api;
    var server = !!(api && api.available);
    openModal({
      eyebrow: 'Admin · People', title: server ? 'Create account' : 'Add member',
      body: '<form id="person-form"><div class="form-grid">' +
        '<label class="field"><span>Full name</span><input name="name" required></label>' +
        '<label class="field"><span>Email</span><input name="email" type="email" required placeholder="name@uon.edu.pk"></label>' +
        '<label class="field"><span>Program</span><input name="program" placeholder="BSCS · Sem 3"></label>' +
        (server
          ? '<label class="field"><span>Role (login role)</span><select name="role">' + ACCOUNT_ROLES.map(function (r) { return '<option>' + r + '</option>'; }).join('') + '</select></label>' +
            '<label class="field full"><span>Password (for login)</span><input name="password" type="text" required placeholder="At least 8 chars, letters + a number"></label>' +
            '<div class="panel-note full">This creates a real account in the database — the person can log in with this email/password.</div>'
          : '<label class="field"><span>Type</span><select name="type"><option>General Member</option><option>Volunteer</option></select></label>') +
        '<label class="field"><span>Directorate</span><select name="directorate">' + S.directorates.map(function (d) { return '<option>' + esc(d.name) + '</option>'; }).join('') + '</select></label>' +
        (server ? '' : '<label class="field"><span>Post</span><select name="post"><option>Member</option><option>Volunteer</option><option>Web Volunteer</option><option>Event Volunteer</option></select></label>') +
        '</div></form>',
      foot: '<button class="btn btn-outline" data-action="close-modal">Cancel</button>' +
        '<button class="btn btn-green" id="person-save">' + (server ? 'Create account' : 'Add to directory') + '</button>'
    });
    $('#person-save').addEventListener('click', function () {
      var f = $('#person-form'); if (!f.reportValidity()) return;
      var d = {}; $$('input,select', f).forEach(function (el) { if (el.name) d[el.name] = el.value; });

      if (server) {
        var btn = $('#person-save'); btn.disabled = true; btn.textContent = 'Creating…';
        api.adminCreateUser({
          name: d.name, email: d.email, role: d.role, password: d.password,
          directorate: d.directorate, program: d.program
        }).then(function () {
          return api.loadState();
        }).then(function (cols) {
          window.YPDC.loadFromServer(cols);
          closeModal(); toast('Account created: ' + d.email + ' (' + d.role + ')', true); render();
        }).catch(function (err) {
          btn.disabled = false; btn.textContent = 'Create account';
          toast(err.message || 'Account could not be created');
        });
        return;
      }

      d.batch = S.inductionDrive.batch; d.status = 'Active';
      A.addPerson(d); closeModal(); toast(d.name + ' added to the people directory'); render();
    });
  }

  function saveCabinetEditor() {
    var posts = $$('#cabinet-editor [data-post]').map(function (row) {
      return {
        title: row.querySelector('[data-field="title"]').value,
        holder: row.querySelector('[data-field="holder"]').value || 'Admin editable',
        status: row.querySelector('[data-field="status"]').value
      };
    });
    A.saveCabinet(posts);
    toast('Cabinet information saved', true);
    render();
  }
  function openCabinetModal() {
    openModal({
      eyebrow: 'Admin · Cabinet', title: 'Add executive post',
      body: '<div class="form-grid"><label class="field"><span>Post title</span><input id="cp-title" placeholder="e.g. Deputy General Secretary"></label>' +
        '<label class="field"><span>Holder name</span><input id="cp-holder" placeholder="Admin editable"></label></div>',
      foot: '<button class="btn btn-outline" data-action="close-modal">Cancel</button>' +
        '<button class="btn btn-green" id="cp-save">Add post</button>'
    });
    $('#cp-save').addEventListener('click', function () {
      var t = $('#cp-title').value; if (!t) { toast('Enter a post title'); return; }
      A.addCabinetPost({ title: t, holder: $('#cp-holder').value });
      closeModal(); toast('Executive post added'); render();
    });
  }

  var CONTENT_KEYS = {
    'info': { label: 'YPDC Information', fields: [['name', 'Short name'], ['full', 'Full name'], ['tagline', 'Tagline'], ['intro', 'Homepage intro']] },
    'vision': { label: 'Vision & Mission', fields: [['vision', 'Vision statement'], ['mission', 'Mission statement']] },
    'contact': { label: 'Contact Information', fields: [['email', 'Email'], ['phone', 'Phone'], ['office', 'Office address'], ['hours', 'Office hours']] },
    'popup': { label: 'Popup notice', fields: [['title', 'Heading'], ['text', 'Message'], ['ctaText', 'Button text'], ['ctaHref', 'Button link']] }
  };
  function openContentModal(key) {
    var cfg = CONTENT_KEYS[key] || CONTENT_KEYS.info;
    var src = key === 'contact' ? S.site.contact : (key === 'popup' ? (S.site.popup || {}) : S.site);
    openModal({
      eyebrow: 'Admin · Website content', title: cfg.label,
      sub: 'Changes appear on the public website immediately after saving.',
      body: '<form id="content-form">' +
        (key === 'popup'
          ? '<label class="switch-row"><input type="checkbox" id="popup-enabled"' + (src.enabled === false ? '' : ' checked') + '>' +
            '<span><b>Show this popup on the website</b><i>Visitors can close it with the ✕ button.</i></span></label>'
          : '') +
        cfg.fields.map(function (f) {
        return '<label class="field"><span>' + esc(f[1]) + '</span><textarea name="' + f[0] + '" style="min-height:' + (f[0] === 'intro' || f[0] === 'vision' || f[0] === 'mission' ? '120' : '70') + 'px">' + esc(src[f[0]] || '') + '</textarea></label>';
      }).join('') + '</form>',
      foot: '<button class="btn btn-outline" data-action="close-modal">Cancel</button>' +
        '<button class="btn btn-green" id="content-save">Save &amp; preview</button>'
    });
    $('#content-save').addEventListener('click', function () {
      var d = {}; $$('#content-form textarea').forEach(function (el) { d[el.name] = el.value; });
      var on = $('#popup-enabled');
      if (key === 'popup') {
        d.enabled = !!(on && on.checked);
        d.title = d.title || 'Announcement';
        S.site.popup = d; A.save();
        closeModal(); toast('Popup notice updated', true); render();
        if (App.showPopupNotice && d.enabled) setTimeout(function () { App.showPopupNotice(true); }, 220);
        return;
      }
      if (key === 'contact') { Object.keys(d).forEach(function (k) { S.site.contact[k] = d[k]; }); A.save(); } else { A.saveContent(d); }
      closeModal(); toast('Website content updated', true); render();
    });
  }

  function openPhotoModal(kind) {
    var cfg = {
      hero: { title: 'Homepage hero photo', sub: 'This picture is shown at the top of the public homepage.', multi: false },
      gallery: { title: 'Gallery photos', sub: 'These pictures fill the gallery on the homepage and the public workspace.', multi: true },
      logo: { title: 'Website logo', sub: 'Shown in the header, the portal sidebar, the login page and the browser tab.', multi: false }
    }[kind] || { title: 'Photo', sub: '', multi: false };
    openModal({
      eyebrow: 'Admin · Photos',
      title: cfg.title,
      sub: cfg.sub,
      body: '<form id="photo-form">' +
        '<label class="field"><span>Choose a picture from your device' + (cfg.multi ? ' (you can pick several)' : '') + '</span>' +
        '<input type="file" name="files" accept="image/*"' + (cfg.multi ? ' multiple' : '') + ' data-photo="' + esc(kind) + '"></label>' +
        '<p class="mut" style="font-size:.85rem">JPG, PNG or WebP. Big pictures are resized automatically (max 1400 px) so the website stays fast.</p>' +
        '</form>',
      foot: '<button class="btn btn-outline" data-action="close-modal">Cancel</button>' +
        (kind === 'hero' ? '<button class="btn btn-outline" data-action="reset-photo" data-kind="hero">Use the default photo</button>' : '') +
        (kind === 'gallery' ? '<button class="btn btn-outline" data-action="reset-photo" data-kind="gallery">Use the default gallery</button>' : '') +
        (kind === 'logo' ? '<button class="btn btn-outline" data-action="reset-photo" data-kind="logo">Use the default logo</button>' : '')
    });
  }

  function openNewsModal() {
    openModal({
      eyebrow: 'Admin · News', title: 'Publish news update',
      body: '<form id="news-form"><label class="field"><span>Headline</span><input name="title" required></label>' +
        '<label class="field"><span>Tag</span><select name="tag"><option>Membership</option><option>Events</option><option>Technology</option><option>Impact</option><option>Reports</option></select></label>' +
        '<label class="field"><span>Body</span><textarea name="body" required></textarea></label></form>',
      foot: '<button class="btn btn-outline" data-action="close-modal">Cancel</button>' +
        '<button class="btn btn-gold" id="news-save">Publish ' + I.arrow + '</button>'
    });
    $('#news-save').addEventListener('click', function () {
      var f = $('#news-form'); if (!f.reportValidity()) return;
      A.addNews({ title: $('#news-form [name=title]').value, tag: $('#news-form [name=tag]').value, body: $('#news-form [name=body]').value });
      closeModal(); toast('News published to the public website', true); render();
    });
  }

  function openProposalModal() {
    openModal({
      eyebrow: 'Directorate', title: 'Submit event proposal',
      body: '<form id="prop-form"><div class="form-grid">' +
        '<label class="field full"><span>Proposal title</span><input name="title" required placeholder="e.g. Digital Literacy for Schools"></label>' +
        '<label class="field"><span>Directorate</span><select name="directorate">' + S.directorates.map(function (d) { return '<option>' + esc(d.name) + '</option>'; }).join('') + '</select></label>' +
        '<label class="field"><span>Estimated budget (PKR)</span><input name="budget" type="number" value="25000"></label>' +
        '<label class="field full"><span>Description</span><textarea name="desc" required placeholder="What will be done, for whom and expected outcome..."></textarea></label>' +
        '</div></form>',
      foot: '<button class="btn btn-outline" data-action="close-modal">Cancel</button>' +
        '<button class="btn btn-green" id="prop-save">Submit for approval ' + I.arrow + '</button>'
    });
    $('#prop-save').addEventListener('click', function () {
      var f = $('#prop-form'); if (!f.reportValidity()) return;
      var d = {}; $$('input,select,textarea', f).forEach(function (el) { if (el.name) d[el.name] = el.value; });
      A.addProposal({ title: d.title, directorate: d.directorate, by: (S.session && S.session.name) || 'Directorate', budget: 'PKR ' + money(d.budget), desc: d.desc });
      closeModal(); toast('Proposal submitted to faculty for approval', true); render();
    });
  }

  function openCertificateIssueModal() {
    openModal({
      eyebrow: 'Admin · Certificates', title: 'Issue certificate',
      body: '<form id="cert-form"><label class="field"><span>Member name</span><input name="name" required></label>' +
        '<label class="field"><span>Certificate title</span><input name="title" required value="Certificate of Participation"></label>' +
        '<label class="field"><span>Event / Activity</span><select name="event">' + S.events.map(function (e) { return '<option>' + esc(e.title) + '</option>'; }).join('') + '</select></label></form>',
      foot: '<button class="btn btn-outline" data-action="close-modal">Cancel</button>' +
        '<button class="btn btn-gold" id="cert-save">Generate ' + I.arrow + '</button>'
    });
    $('#cert-save').addEventListener('click', function () {
      var f = $('#cert-form'); if (!f.reportValidity()) return;
      A.addCertificate({ title: $('#cert-form [name=title]').value, event: $('#cert-form [name=event]').value });
      closeModal(); toast('Certificate generated and logged', true); render();
    });
  }

  function openMentorshipModal() {
    openModal({
      eyebrow: 'Alumni Network', title: 'Request mentorship',
      body: '<form id="ment-form"><label class="field"><span>Volunteer name</span><input name="student" required></label>' +
        '<label class="field"><span>Program</span><input name="program" placeholder="BSCS · Sem 3"></label>' +
        '<label class="field"><span>Topic</span><input name="topic" required placeholder="e.g. Frontend career path"></label></form>',
      foot: '<button class="btn btn-outline" data-action="close-modal">Cancel</button>' +
        '<button class="btn btn-green" id="ment-save">Send request</button>'
    });
    $('#ment-save').addEventListener('click', function () {
      var f = $('#ment-form'); if (!f.reportValidity()) return;
      A.requestMentorship({ student: $('#ment-form [name=student]').value, program: $('#ment-form [name=program]').value || '—', topic: $('#ment-form [name=topic]').value });
      closeModal(); toast('Mentorship request created', true); render();
    });
  }

  App.openRegisterModal = openRegisterModal;
  App.openCertificateModal = openCertificateModal;
  App.openAssignModal = openAssignModal;
  App.openRoleModal = openRoleModal;
  App.openEventModal = openEventModal;
  App.openEditEventModal = openEditEventModal;
  App.openTaskModal = openTaskModal;
  App.openPersonModal = openPersonModal;
  App.saveCabinetEditor = saveCabinetEditor;
  App.openCabinetModal = openCabinetModal;
  App.openContentModal = openContentModal;
  App.openPhotoModal = openPhotoModal;
  App.openNewsModal = openNewsModal;
  App.openProposalModal = openProposalModal;
  App.openCertificateIssueModal = openCertificateIssueModal;
  App.openEventDetailModal = openEventDetailModal;
  App.openUserModal = openUserModal;
  App.openUserRoleModal = openUserRoleModal;
  App.openMentorshipModal = openMentorshipModal;
  App.modals = {
    openRegisterModal: openRegisterModal,
    openCertificateModal: openCertificateModal,
    openAssignModal: openAssignModal,
    openRoleModal: openRoleModal,
    openEventModal: openEventModal,
    openEditEventModal: openEditEventModal,
    openTaskModal: openTaskModal,
    openPersonModal: openPersonModal,
    saveCabinetEditor: saveCabinetEditor,
    openCabinetModal: openCabinetModal,
    openContentModal: openContentModal,
    openPhotoModal: openPhotoModal,
    openNewsModal: openNewsModal,
    openProposalModal: openProposalModal,
    openCertificateIssueModal: openCertificateIssueModal,
    openMentorshipModal: openMentorshipModal,
    openUserModal: openUserModal,
    openUserRoleModal: openUserRoleModal,
    openEventDetailModal: openEventDetailModal
  };
  App.openMentorshipModal = openMentorshipModal;
})();

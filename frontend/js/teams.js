(function () {
  'use strict';
  var App = window.App;
  var S = window.YPDC.state;
  var $ = App.$ || function (s, r) { return (r || document).querySelector(s); };
  var $$ = App.$$ || function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = App.esc, I = App.Icons, fmtDate = App.fmtDate, initials = App.initials;

  function toast() { return App.toast.apply(null, arguments); }
  function openModal() { return App.openModal.apply(null, arguments); }
  function closeModal() { return App.closeModal.apply(null, arguments); }
  function api() { return window.YPDC.api; }
  function live() { var a = api(); return !!(a && a.available); }

  var TEAM_ICON = {
    leader: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/><path d="M12 3v14"/></svg>',
    member: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.4"/><path d="M3.6 19.6c.8-3 2.7-4.5 5.4-4.5s4.6 1.5 5.4 4.5"/><path d="M17 7v6M20 10h-6"/></svg>'
  };

  function statusBadge(status) {
    var map = {
      Pending: 'badge-warn', Active: 'badge-ok', Inactive: 'badge-line', Rejected: 'badge-danger',
      Removed: 'badge-line', 'In Progress': 'badge-info', Done: 'badge-ok'
    };
    return '<span class="badge ' + (map[status] || 'badge-line') + '">' + esc(status || '—') + '</span>';
  }

  /* ---------- form plumbing: loading, validation, server errors ---------- */
  function field(name, label, opts) {
    opts = opts || {};
    var tag = opts.textarea ? 'textarea' : 'input';
    var attrs = 'name="' + name + '" id="tf-' + name + '"' + (opts.type ? ' type="' + opts.type + '"' : '') +
      (opts.required ? ' required' : '') + (opts.placeholder ? ' placeholder="' + esc(opts.placeholder) + '"' : '') +
      (opts.value ? ' value="' + esc(opts.value) + '"' : '') +
      (opts.min !== undefined ? ' min="' + opts.min + '"' : '') + (opts.max !== undefined ? ' max="' + opts.max + '"' : '') +
      (opts.maxlength ? ' maxlength="' + opts.maxlength + '"' : '');
    return '<label class="field' + (opts.full ? ' full' : '') + '"><span>' + esc(label) + (opts.required ? ' *' : '') + '</span>' +
      '<' + tag + ' ' + attrs + '>' + (opts.textarea ? '</textarea>' : '') +
      (opts.hint ? '<span class="hint">' + esc(opts.hint) + '</span>' : '') + '</label>';
  }

  function formStatus(kind, msg) {
    return '<div class="form-status is-' + kind + ' show" id="team-form-status">' + esc(msg) + '</div>';
  }

  function showStatus(kind, msg) {
    var box = $('#team-form-status');
    if (!box) return;
    box.className = 'form-status is-' + kind + ' show';
    box.textContent = msg;
  }

  function failFrom(err) {
    var msg = (err && err.message) || 'Unable to submit registration. Please try again.';
    if (err && err.status === 429) msg = msg;
    return msg;
  }

  function submitForm(btn, fn) {
    if (!btn) return;
    btn.classList.add('is-busy');
    btn.setAttribute('disabled', 'disabled');
    fn().catch(function () {}).then(function () {
      btn.classList.remove('is-busy');
      btn.removeAttribute('disabled');
    });
  }

  function values(form, names) {
    var d = {};
    names.forEach(function (n) {
      var el = $('#tf-' + n, form);
      d[n] = el ? String(el.value || '').trim() : '';
    });
    return d;
  }

  function successPanel(title, sub, teamId, extra) {
    return '<div class="team-success">' +
      '<div class="ts-ic">' + I.check + '</div>' +
      '<h3>' + esc(title) + '</h3>' +
      '<p class="mut mt-10">' + esc(sub) + '</p>' +
      (teamId ? '<div class="team-id-box"><span class="tib-k">Team ID</span><span class="tib-v">' + esc(teamId) + '</span></div>' : '') +
      (extra || '') + '</div>';
  }

  /* ---------- 1) team leader registration ---------- */
  function openTeamLeaderForm() {
    openModal({
      eyebrow: 'Teams · Section A',
      title: 'Register as Team Leader',
      sub: 'Register your team, get a unique Team ID and manage your members from your own dashboard.',
      body:
        formStatus('info', 'Fill the form below — a YPDC admin reviews the registration and activates the team.') +
        '<form id="team-leader-form" novalidate><div class="form-grid">' +
        field('name', 'Full name', { required: true, placeholder: 'e.g. Ali Khan', maxlength: 120 }) +
        field('email', 'Email', { required: true, type: 'email', placeholder: 'you@uon.edu.pk' }) +
        field('phone', 'Phone / WhatsApp', { placeholder: '0300 0000000' }) +
        field('program', 'University / Program', { required: true, placeholder: 'e.g. University of Narowal · BS CS' }) +
        field('semester', 'Semester', { placeholder: 'e.g. 5th' }) +
        field('teamName', 'Team name', { required: true, placeholder: 'e.g. Peace Builders', maxlength: 60 }) +
        field('expectedMembers', 'Expected members', { required: true, type: 'number', min: 2, max: 500, value: '10' }) +
        field('purpose', 'Team purpose', { required: true, textarea: true, full: true, maxlength: 600, placeholder: 'What will this team do for YPDC UON?' }) +
        field('description', 'Team description (optional)', { textarea: true, full: true, maxlength: 600, placeholder: 'How will the team work, where will it meet, what events will it run?' }) +
        '</div>' +
        '<div class="pf-section"><span class="pf-sec-title">Required documents</span>' +
        '<p class="pf-sec-note mut">Har registration ke liye apni photo aur ID card ki tasveer lazmi hai — camera se lein ya gallery se chunein.</p>' +
        (App.registrationDocs ? App.registrationDocs() : '') +
        '</div></form>',
      foot: '<button class="btn btn-outline" data-action="close-modal">Cancel</button>' +
        '<button class="btn btn-gold" id="team-leader-submit">Submit registration</button>'
    });

    var btn = $('#team-leader-submit');
    btn.addEventListener('click', function () {
      var form = $('#team-leader-form');
      if (!form.reportValidity()) return;
      var d = values(form, ['name', 'email', 'phone', 'program', 'semester', 'teamName', 'expectedMembers', 'purpose', 'description']);
      d.expectedMembers = Number(d.expectedMembers || 0);
      App.docValues(form, d);
      var missL = App.docsMissing(form);
      if (missL.length) { showStatus('is-err', App.docsHelp(missL)); return; }

      if (!live()) { showStatus('is-err', 'The YPDC server is not reachable right now. Please try again in a moment.'); return; }

      submitForm(btn, function () {
        return api().teamRegister(d).then(function (r) {
          openModal({
            eyebrow: 'Teams · Section A',
            title: 'Registration submitted',
            body: successPanel('Team Leader registration submitted successfully.',
              'Your team is pending admin approval. Keep this Team ID — your members will use it to join your team.',
              r.team && r.team.teamId,
              '<p class="mut mt-16" style="font-size:.86rem">Sign in with your YPDC account to open the Team Leader dashboard; approvals also arrive by email.</p>') +
              '<div class="btn-row mt-22" style="justify-content:center">' +
              '<a class="btn btn-gold" href="#/teams">Browse YPDC teams</a>' +
              '<a class="btn btn-outline" href="' + (S.session ? '#/portal' : '#/login') + '">' + (S.session ? 'Open my portal' : 'Sign in') + '</a></div>',
            foot: '<button class="btn btn-outline" data-action="close-modal">Close</button>'
          });
          toast('Team Leader registration submitted successfully.', true);
        }).catch(function (err) { showStatus('is-err', failFrom(err)); });
      });
    });
  }

  /* ---------- 2) join a team ---------- */
  function openJoinTeamForm(presetId) {
    openModal({
      eyebrow: 'Teams · Section B',
      title: 'Register as Team Member',
      sub: 'Pick an active YPDC team, add your details and the team leader will see your registration.',
      body:
        formStatus('info', 'Only active teams are shown. Type in the box to search by team name or leader.') +
        '<div id="team-picker"><div class="search-box" style="margin-bottom:14px">' + I.search +
        '<input type="search" id="team-search" placeholder="Search teams…" aria-label="Search teams"></div>' +
        '<div id="team-options" class="team-options"><div class="search-loading"><span class="spin-dot"></span>Loading teams…</div></div></div>' +
        '<form id="team-join-form" class="mt-16" novalidate><div class="form-grid">' +
        field('name', 'Full name', { required: true, maxlength: 120, placeholder: 'e.g. Ahmed Raza' }) +
        field('email', 'Email', { required: true, type: 'email', placeholder: 'you@uon.edu.pk' }) +
        field('phone', 'Phone / WhatsApp', { placeholder: '0300 0000000' }) +
        field('program', 'University / Program', { required: true, placeholder: 'e.g. University of Narowal · BA English' }) +
        field('semester', 'Semester', { placeholder: 'e.g. 3rd' }) +
        field('motivation', 'Why this team? (optional)', { textarea: true, full: true, maxlength: 400 }) +
        '</div>' +
        '<div class="pf-section"><span class="pf-sec-title">Required documents</span>' +
        '<p class="pf-sec-note mut">Apni photo aur ID card ki tasveer lazmi hai.</p>' +
        (App.registrationDocs ? App.registrationDocs() : '') +
        '</div></form>',
      foot: '<button class="btn btn-outline" data-action="close-modal">Cancel</button>' +
        '<button class="btn btn-gold" id="team-join-submit" disabled>Join team</button>'
    });

    var picked = presetId ? { teamId: presetId } : null;
    var opts = $('#team-options');
    var submitBtn = $('#team-join-submit');

    function renderOptions(list) {
      if (!list.length) {
        opts.innerHTML = '<div class="team-empty"><b>No active teams right now</b><p>Teams appear here as soon as an admin activates them. You can register your own team from Section A.</p></div>';
        return;
      }
      opts.innerHTML = list.map(function (t) {
        var on = picked && picked.teamId === t.teamId;
        return '<button type="button" class="team-option' + (on ? ' is-on' : '') + '" data-team="' + esc(t.teamId) + '" data-name="' + esc(t.name) + '">' +
          '<span class="to-ic">' + I.users + '</span>' +
          '<span class="to-tx"><b>' + esc(t.name) + '</b><small>' + esc(t.teamId) + ' · Leader ' + esc(t.leader) + ' · ' + t.members + ' member' + (t.members === 1 ? '' : 's') + '</small>' +
          (t.purpose ? '<small class="mut">' + esc(t.purpose) + '</small>' : '') + '</span>' +
          '<span class="to-check">' + (on ? I.check : '') + '</span></button>';
      }).join('');
      $$('#team-options .team-option').forEach(function (b) {
        b.addEventListener('click', function () {
          picked = { teamId: b.getAttribute('data-team'), name: b.getAttribute('data-name') };
          $$('#team-options .team-option').forEach(function (x) { x.classList.toggle('is-on', x === b); x.querySelector('.to-check').innerHTML = x === b ? I.check : ''; });
          submitBtn.removeAttribute('disabled');
        });
      });
    }

    function load(q) {
      if (!live()) { opts.innerHTML = '<div class="team-empty"><b>Server not reachable</b><p>Start the YPDC backend to load the team list.</p></div>'; return; }
      api().teamsOpen(q).then(function (r) { renderOptions((r && r.teams) || []); })
        .catch(function () { opts.innerHTML = '<div class="team-empty"><b>Unable to load teams</b><p>Please close this window and try again.</p></div>'; });
    }
    load('');
    if (picked) submitBtn.removeAttribute('disabled');

    var searchTimer = null;
    $('#team-search').addEventListener('input', function (e) {
      var q = e.target.value.trim();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { load(q); }, 260);
    });

    submitBtn.addEventListener('click', function () {
      if (!picked) { showStatus('is-err', 'Please choose a team first.'); return; }
      var form = $('#team-join-form');
      if (!form.reportValidity()) return;
      var d = values(form, ['name', 'email', 'phone', 'program', 'semester', 'motivation']);
      App.docValues(form, d);
      var missM = App.docsMissing(form);
      if (missM.length) { showStatus('is-err', App.docsHelp(missM)); return; }
      if (!live()) { showStatus('is-err', 'The YPDC server is not reachable right now. Please try again in a moment.'); return; }

      submitForm(submitBtn, function () {
        return api().teamJoin(picked.teamId, d).then(function (r) {
          openModal({
            eyebrow: 'Teams · Section B',
            title: 'Registration submitted',
            body: successPanel('Team member registration submitted successfully.',
              'You asked to join ' + picked.name + '. The team leader will review your registration.',
              picked.teamId,
              '<p class="mut mt-16" style="font-size:.86rem">Approved members appear in the team dashboard and get a notification.</p>') +
              '<div class="btn-row mt-22" style="justify-content:center">' +
              '<a class="btn btn-gold" href="#/teams">See all teams</a>' +
              '<a class="btn btn-outline" href="' + (S.session ? '#/portal' : '#/login') + '">' + (S.session ? 'Open my portal' : 'Sign in') + '</a></div>',
            foot: '<button class="btn btn-outline" data-action="close-modal">Close</button>'
          });
          toast('Team member registration submitted successfully.', true);
        }).catch(function (err) { showStatus('is-err', failFrom(err)); });
      });
    });
  }

  /* ---------- 3) team detail (public teams page) ---------- */
  function openTeamPreview(teamId) {
    if (!live()) { toast('Start the YPDC backend to see team details.'); return; }
    api().teamGet(teamId).then(function (r) {
      var t = r.team;
      openModal({
        eyebrow: 'YPDC team · ' + t.teamId,
        title: t.name,
        sub: 'Led by ' + t.leader.name + ' · ' + t.members + ' member' + (t.members === 1 ? '' : 's') + ' · ' + t.status,
        body: '<div class="panel-note">' + esc(t.purpose || 'No purpose written yet.') + '</div>' +
          (t.description ? '<p class="mt-16" style="font-size:.94rem">' + esc(t.description) + '</p>' : '') +
          '<div class="grid g2 mt-16" style="gap:12px">' +
          '<div class="card card-tight"><span class="stat-label mut">Expected members</span><b>' + (t.expectedMembers || '—') + '</b></div>' +
          '<div class="card card-tight"><span class="stat-label mut">Created</span><b>' + fmtDate(t.createdAt) + '</b></div>' +
          '</div>',
        foot: '<button class="btn btn-outline" data-action="close-modal">Close</button>' +
          '<button class="btn btn-gold" data-action="join-team-form" data-id="' + esc(t.teamId) + '">Join this team</button>'
      });
    }).catch(function (err) { toast(failFrom(err)); });
  }

  /* ---------- live counters on the home page (real DB numbers) ---------- */
  function loadStats() {
    if (!live()) {
      $$('[data-team-live]').forEach(function (el) { el.textContent = '0'; });
      return;
    }
    api().teamsOpen('').then(function (r) {
      var list = (r && r.teams) || [];
      var members = list.reduce(function (a, t) { return a + (Number(t.members) || 0); }, 0);
      $$('[data-team-live="count"]').forEach(function (el) { el.textContent = String(list.length); });
      $$('[data-team-live="members"]').forEach(function (el) { el.textContent = String(members); });
    }).catch(function () {});
  }


  /* ---------- public team directory (#/teams) ---------- */
  function dirCard(t) {
    return '<article class="card team-dir-card">' +
      '<div class="tdc-top"><span class="badge badge-ok">' + esc(t.status || 'Active') + '</span>' +
      '<span class="tdc-id">' + esc(t.teamId || '') + '</span></div>' +
      '<h3 class="mt-12">' + esc(t.name || 'YPDC team') + '</h3>' +
      '<p class="mut tdc-lead">' + esc(t.leader || 'Team leader') + (t.program ? ' · ' + esc(t.program) : '') + '</p>' +
      '<p class="tdc-purpose">' + esc((t.purpose || t.description || '').slice(0, 150)) + '</p>' +
      '<div class="tdc-meta"><span>' + I.users + ' ' + (Number(t.members) || 0) + ' member' + ((Number(t.members) || 0) === 1 ? '' : 's') + '</span>' +
      '<span>' + I.target + ' ' + (Number(t.expected) || 0) + ' expected</span></div>' +
      '<button class="btn btn-outline btn-block mt-16" data-action="join-team-form" data-id="' + esc(t.teamId || '') + '">Join this team ' + I.arrow + '</button>' +
      '</article>';
  }

  function dirEmpty(q) {
    return '<div class="empty-block" style="grid-column:1/-1"><b>' + (q ? 'No team matches “' + esc(q) + '”' : 'No active teams right now') + '</b>' +
      '<p class="mut mt-6">' + (q ? 'Try another team or leader name.' : 'New teams appear here as soon as a YPDC admin approves them. You can start one yourself as a team leader.') + '</p>' +
      '<button class="btn btn-gold mt-16" data-action="team-leader-form">Register as Team Leader</button></div>';
  }

  var dirTimer = null;
  function loadDirectory() {
    var box = $('#team-directory');
    if (!box) return;
    var q = ($('#team-dir-search') && $('#team-dir-search').value.trim()) || '';
    if (!live()) {
      box.innerHTML = '<div class="empty-block" style="grid-column:1/-1"><b>The YPDC server is not reachable right now</b>' +
        '<p class="mut mt-6">The team list is stored on the YPDC server. Please try again in a moment.</p>' +
        '<button class="btn btn-outline mt-16" data-action="team-dir-retry">Try again</button></div>';
      return;
    }
    api().teamsOpen(q).then(function (r) {
      var list = (r && r.teams) || [];
      var count = $('#team-dir-count');
      if (count) count.textContent = list.length + (list.length === 1 ? ' active team' : ' active teams');
      box.innerHTML = list.length ? list.map(dirCard).join('') : dirEmpty(q);
    }).catch(function () {
      box.innerHTML = '<div class="empty-block" style="grid-column:1/-1"><b>Unable to load teams right now</b>' +
        '<p class="mut mt-6">Please try again in a moment.</p>' +
        '<button class="btn btn-outline mt-16" data-action="team-dir-retry">Try again</button></div>';
    });
  }
  function bindDirectory() {
    var inp = $('#team-dir-search');
    if (!inp) return;
    inp.addEventListener('input', function () {
      clearTimeout(dirTimer);
      dirTimer = setTimeout(loadDirectory, 260);
    });
  }

  App.Team = {
    loadStats: loadStats,
    openTeamLeaderForm: openTeamLeaderForm,
    loadDirectory: loadDirectory,
    bindDirectory: bindDirectory,
    openJoinTeamForm: openJoinTeamForm,
    openTeamPreview: openTeamPreview,
    statusBadge: statusBadge,
    TEAM_ICON: TEAM_ICON,
    formStatus: formStatus,
    showStatus: showStatus,
    submitForm: submitForm,
    successPanel: successPanel
  };
})();

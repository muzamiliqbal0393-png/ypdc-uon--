(function () {
  'use strict';

  var App = window.App || (window.App = {});
  var Y = window.YPDC || (window.YPDC = {});

  function cookie(name) {
    var m = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[2]) : '';
  }

  var CSRF_COOKIE = 'ypdc_csrf';

  var hasFetch = (typeof window.fetch === 'function') && (typeof window.Promise === 'function')
    && location.protocol !== 'file:';

  function qs(o) {
    return Object.keys(o).filter(function (k) { return o[k] !== undefined && o[k] !== null && o[k] !== ''; })
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(o[k]); }).join('&');
  }

  function req(path, opts) {
    if (!hasFetch) return Promise.reject(new Error('fetch not available'));
    opts = opts || {};
    var headers = { 'Content-Type': 'application/json' };
    var csrf = cookie(CSRF_COOKIE);
    if (csrf && (opts.method || 'GET') !== 'GET') headers['X-YPDC-CSRF'] = csrf;

    return fetch(path, {
      method: opts.method || 'GET',
      headers: headers,
      credentials: 'same-origin',
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok && res.status !== 207) {
          var err = new Error(data.error || ('Request fail (' + res.status + ')'));
          err.status = res.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  }

  var api = {
    available: false,
    counts: null,
    checked: false,
    user: null,
    role: null,
    snapshot: null,
    lastSave: null,
    error: null,

    detect: function () {
      var self = this;
      if (self.checked) return Promise.resolve(self.available);
      self.checked = true;
      if (!hasFetch) { self.available = false; Y.apiMode = false; return Promise.resolve(false); }
      return req('/api/healthz').then(function (h) {
        self.available = !!(h && h.ok);
        self.counts = h.counts || h.database || null;
        Y.apiMode = self.available;
        return self.available;
      }).catch(function () {
        self.available = false;
        Y.apiMode = false;
        return false;
      });
    },

    publicSite: function () { return req('/api/public/site'); },

    refreshCounts: function () {
      if (!api.available) return Promise.resolve(api.counts);
      return req('/api/healthz').then(function (h) {
        api.counts = h.database || null;
        return api.counts;
      }).catch(function () { return api.counts; });
    },

    me: function () {
      return req('/api/auth/me').then(function (r) {
        api.user = r.user; api.role = r.user ? r.user.role : null;
        return r;
      }).catch(function () { return { user: null }; });
    },

    login: function (email, password, role) {
      return req('/api/auth/login', { method: 'POST', body: { email: email, password: password, role: role } })
        .then(function (r) { api.user = r.user; api.role = r.role; return r; });
    },

    register: function (payload) {
      return req('/api/auth/register', { method: 'POST', body: payload })
        .then(function (r) { api.user = r.user; api.role = r.role; return r; });
    },

    adminLogin: function (email, password, adminKey) {
      return req('/api/auth/login-admin', { method: 'POST', body: { email: email, password: password, adminKey: adminKey } })
        .then(function (r) { api.user = r.user; api.role = 'admin'; return r; });
    },

    loginDirectorate: function (email, password) {
      return req('/api/auth/login-directorate', { method: 'POST', body: { email: email, password: password } })
        .then(function (r) { api.user = r.user; api.role = 'directorate'; return r; });
    },

    shaheenInfo: function () { return req('/api/public/shaheen'); },

    shaheenRegister: function (payload) { return req('/api/public/shaheen/register', { method: 'POST', body: payload }); },

    shaheenPanel: function () { return req('/api/admin/shaheen'); },
    shaheenSettings: function (patch) { return req('/api/admin/shaheen/settings', { method: 'POST', body: patch }); },
    shaheenRoster: function (list) { return req('/api/admin/shaheen/roster', { method: 'POST', body: { list: list } }); },
    shaheenApprove: function (id) { return req('/api/admin/shaheen/' + encodeURIComponent(id) + '/approve', { method: 'POST' }); },
    shaheenReject: function (id) { return req('/api/admin/shaheen/' + encodeURIComponent(id) + '/reject', { method: 'POST' }); },
    shaheenDelete: function (id) { return req('/api/admin/shaheen/' + encodeURIComponent(id), { method: 'DELETE' }); },

    logout: function () {
      return req('/api/auth/logout', { method: 'POST' }).catch(function () {}).then(function () {
        api.user = null; api.role = null; api.snapshot = null;
      });
    },

    updateMe: function (patch) {
      return req('/api/auth/me', { method: 'PATCH', body: patch }).then(function (r) {
        api.user = r.user;
        return r;
      });
    },

    changePassword: function (currentPassword, newPassword) {
      return req('/api/auth/change-password', { method: 'POST', body: { currentPassword: currentPassword, newPassword: newPassword } });
    },

    forgotPassword: function (email) {
      return req('/api/auth/forgot-password', { method: 'POST', body: { email: email } });
    },

    resetPassword: function (token, password) {
      return req('/api/auth/reset-password', { method: 'POST', body: { token: token, password: password } });
    },

    loadState: function () {
      return req('/api/state').then(function (r) {
        api.snapshot = JSON.parse(JSON.stringify(r.collections));
        return r.collections;
      });
    },

    saveState: function (state) {
      if (!api.available || !api.snapshot) return Promise.resolve({ skipped: true });

      var changed = {};
      var count = 0;
      var LOCAL_ONLY = { session: 1 };
      Object.keys(state).forEach(function (k) {
        if (LOCAL_ONLY[k]) return;
        var now = JSON.stringify(state[k]);
        if (now !== JSON.stringify(api.snapshot[k])) { changed[k] = state[k]; count++; }
      });
      if (!count) return Promise.resolve({ skipped: true, same: true });
      if (count > 40) return Promise.resolve({ skipped: true, tooMany: count });

      return req('/api/state', { method: 'POST', body: { changed: changed } }).then(function (r) {
        Object.keys(changed).forEach(function (k) { api.snapshot[k] = JSON.parse(JSON.stringify(changed[k])); });
        api.lastSave = new Date();
        if (r.denied && r.denied.length) {
          console.warn('[api] some collections were not saved (role guard):', r.denied);
        }
        return r;
      }).catch(function (e) {
        api.error = e.message;
        console.warn('[api] save fail:', e.message);
        return { error: e.message };
      });
    },

    uploadPhoto: function (blob) {
      if (!hasFetch) return Promise.reject(new Error('Upload is not available offline.'));
      var headers = { 'Content-Type': 'application/octet-stream' };
      var csrf = cookie(CSRF_COOKIE);
      if (csrf) headers['X-YPDC-CSRF'] = csrf;
      return fetch('/api/public/upload', {
        method: 'POST', headers: headers, credentials: 'same-origin', body: blob
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok) throw new Error(data.error || ('Upload failed (' + res.status + ')'));
          return data;
        });
      });
    },
    submitApplication: function (data) {
      return req('/api/public/apply', { method: 'POST', body: data });
    },
    submitFeedback: function (data) {
      return req('/api/public/feedback', { method: 'POST', body: data });
    },
    registerEvent: function (eventId) {
      return req('/api/register-event', { method: 'POST', body: { eventId: eventId } });
    },
    /* ---- teams (Batch G) ---- */
    teamsOpen: function (q) { return req('/api/teams/open' + (q ? '?q=' + encodeURIComponent(q) : '')); },
    teamRegister: function (payload) { return req('/api/teams', { method: 'POST', body: payload }); },
    teamsList: function (opts) { return req('/api/teams' + (opts ? '?' + qs(opts) : '')); },
    teamGet: function (teamId) { return req('/api/teams/' + encodeURIComponent(teamId)); },
    teamMine: function () { return req('/api/teams/mine'); },
    teamAnnouncements: function (teamId) { return req('/api/teams/' + encodeURIComponent(teamId) + '/announcements'); },
    teamAnnounce: function (teamId, payload) { return req('/api/teams/' + encodeURIComponent(teamId) + '/announcements', { method: 'POST', body: payload }); },
    teamAnnounceDelete: function (teamId, id) { return req('/api/teams/' + encodeURIComponent(teamId) + '/announcements/' + encodeURIComponent(id), { method: 'DELETE' }); },
    teamPatch: function (teamId, patch) { return req('/api/teams/' + encodeURIComponent(teamId), { method: 'PATCH', body: patch }); },
    teamDelete: function (teamId, hard) { return req('/api/teams/' + encodeURIComponent(teamId) + (hard ? '?hard=1' : ''), { method: 'DELETE' }); },
    teamJoin: function (teamId, payload) { return req('/api/teams/' + encodeURIComponent(teamId) + '/members', { method: 'POST', body: payload }); },
    teamMemberPatch: function (teamId, memberId, patch) {
      return req('/api/teams/' + encodeURIComponent(teamId) + '/members/' + encodeURIComponent(memberId), { method: 'PATCH', body: patch });
    },
    teamMemberRemove: function (teamId, memberId) {
      return req('/api/teams/' + encodeURIComponent(teamId) + '/members/' + encodeURIComponent(memberId), { method: 'DELETE' });
    },
    teamTasks: function (teamId) { return req('/api/teams/' + encodeURIComponent(teamId) + '/tasks'); },
    teamTaskAdd: function (teamId, payload) { return req('/api/teams/' + encodeURIComponent(teamId) + '/tasks', { method: 'POST', body: payload }); },
    teamTaskPatch: function (teamId, taskId, patch) {
      return req('/api/teams/' + encodeURIComponent(teamId) + '/tasks/' + encodeURIComponent(taskId), { method: 'PATCH', body: patch });
    },
    teamTaskDelete: function (teamId, taskId) {
      return req('/api/teams/' + encodeURIComponent(teamId) + '/tasks/' + encodeURIComponent(taskId), { method: 'DELETE' });
    },

    adminSummary: function () { return req('/api/admin/summary'); },
    adminCharts: function (months) { return req('/api/admin/charts' + (months ? '?months=' + months : '')); },
    adminAudit: function (opts) {
      var q = typeof opts === 'object' && opts ? opts : { limit: opts || 60 };
      return req('/api/admin/audit?' + qs(q));
    },
    adminUsers: function (opts) { return req('/api/admin/users' + (opts ? '?' + qs(opts) : '')); },
    adminUser: function (id) { return req('/api/admin/users/' + encodeURIComponent(id)); },
    adminUserActivity: function (id, opts) {
      return req('/api/admin/users/' + encodeURIComponent(id) + '/activity' + (opts ? '?' + qs(opts) : ''));
    },
    adminResetAccess: function (id, body) { return req('/api/admin/users/' + encodeURIComponent(id) + '/reset-access', { method: 'POST', body: body || {} }); },
    adminRevokeSessions: function (id) { return req('/api/admin/users/' + encodeURIComponent(id) + '/revoke-sessions', { method: 'POST', body: {} }); },
    adminCreateUser: function (u) { return req('/api/admin/users', { method: 'POST', body: u }); },
    adminUpdateUser: function (id, patch) { return req('/api/admin/users/' + encodeURIComponent(id), { method: 'PATCH', body: patch }); },
    adminDeleteUser: function (id) { return req('/api/admin/users/' + encodeURIComponent(id), { method: 'DELETE' }); },
    adminDecideApplication: function (id, status) {
      return req('/api/admin/applications/' + encodeURIComponent(id), { method: 'PATCH', body: { status: status } });
    },
    uploadPhoto: function (dataUrl) {
      var csrf = cookie(CSRF_COOKIE);
      var headers = { 'Content-Type': 'application/octet-stream' };
      if (csrf) headers['X-YPDC-CSRF'] = csrf;
      return fetch(dataUrl).then(function (r) { return r.blob(); }).then(function (blob) {
        if (blob.type) headers['Content-Type'] = blob.type;
        return fetch('/api/admin/upload', { method: 'POST', headers: headers, credentials: 'same-origin', body: blob });
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (d) {
          if (!res.ok) { var err = new Error(d.error || ('Upload fail (' + res.status + ')')); err.status = res.status; throw err; }
          return d;
        });
      });
    },
    adminPermissions: function () { return req('/api/admin/permissions'); },
    adminEmails: function (limit) { return req('/api/admin/emails?limit=' + (limit || 50)); },

    search: function (q) { return req('/api/search?q=' + encodeURIComponent(q)); },

    notifications: function (limit) {
      return req('/api/notifications?limit=' + (limit || 50)).then(function (r) {
        api.notifUnread = r.unread;
        return r;
      });
    },
    notifRead: function (id) { return req('/api/notifications/' + encodeURIComponent(id) + '/read', { method: 'PATCH' }).then(function (r) { api.notifUnread = r.unread; return r; }); },
    notifReadAll: function () { return req('/api/notifications/read-all', { method: 'POST' }).then(function (r) { api.notifUnread = 0; return r; }); },
    notifDelete: function (id) { return req('/api/notifications/' + encodeURIComponent(id), { method: 'DELETE' }).then(function (r) { api.notifUnread = r.unread; return r; }); },
    adminAnnouncements: function () { return req('/api/admin/announcements'); },
    adminAnnounce: function (payload) { return req('/api/admin/announcements', { method: 'POST', body: payload }); },
    adminAnnounceDelete: function (id) { return req('/api/admin/announcements/' + encodeURIComponent(id), { method: 'DELETE' }); },

    directory: function () { return req('/api/directory'); },
    messages: function () { return req('/api/messages'); },
    sendMessage: function (to, subject, body) {
      return req('/api/messages', { method: 'POST', body: { to: to, subject: subject, body: body } });
    },
    readMessage: function (id) { return req('/api/messages/' + encodeURIComponent(id) + '/read', { method: 'POST' }); },
    deleteMessage: function (id) { return req('/api/messages/' + encodeURIComponent(id), { method: 'DELETE' }); },
    msgUnread: 0
  };

  function adminLoginPage() {
    var I = App.Icons || {};
    var html = '<div class="auth-wrap admin-auth">' +
      '<div class="auth-left">' + (App.logoBlock ? App.logoBlock() : '') +
      '<div style="margin-top:auto"><span class="eyebrow">Restricted area</span>' +
      '<h1 class="mt-16">Administrator <span class="accent">access only.</span></h1>' +
      '<p class="lead mt-16" style="color:#C6D8D1">This portal is separate from the normal login. Admin login needs three things: ' +
      'email, password and the ADMIN_KEY (security key). Every attempt is recorded in the audit log.</p>' +
      '<div class="grid mt-32" style="gap:12px">' +
      '<div class="auth-feature">bcrypt password check</div>' +
      '<div class="auth-feature">JWT httpOnly session cookie</div>' +
      '<div class="auth-feature">Rate limit + audit log</div>' +
      '</div></div>' +
      '<div class="mut mt-32" style="font-size:.8rem;color:#B9CFC7">Do not attempt unauthorized access — all attempts are recorded.</div>' +
      '</div>' +
      '<div class="auth-right"><div class="auth-card center-x admin-card">' +
      '<span class="eyebrow">Administrator</span><h2 class="mt-10">Admin sign in</h2>' +
      '<p class="mut mt-10">For the system administrator only.</p>' +
      '<form class="mt-22" data-form="admin-login">' +
      '<label class="field"><span>Admin email</span><input name="email" type="email" placeholder="admin@uon.edu.pk" autocomplete="username" required></label>' +
      '<label class="field"><span>Password</span><input name="password" type="password" autocomplete="current-password" required></label>' +
      '<label class="field"><span>Security key (ADMIN_KEY)</span><input name="adminKey" type="password" placeholder="••••••••" autocomplete="off" required></label>' +
      '<button class="btn btn-green btn-block" type="submit">Unlock admin dashboard ' + (I.arrow || '') + '</button>' +
      '</form>' +
      '<div id="admin-login-msg" class="panel-note mt-22">Administrator email, password and security key — all three are required. They are set in your server\'s <code>.env</code> file.</div>' +
      '<div class="flex mt-22" style="gap:14px"><a class="mut" style="font-size:.84rem" href="#/">← Back to website</a>' +
      '<a class="mut" style="font-size:.84rem" href="#/login">Normal user login</a></div>' +
      '</div></div></div>';
    return html;
  }

  function directorateLoginPage() {
    var I = App.Icons || {};
    return '<div class="auth-wrap admin-auth">' +
      '<div class="auth-left">' + (App.logoBlock ? App.logoBlock() : '') +
      '<div style="margin-top:auto"><span class="eyebrow">Directorate area</span>' +
      '<h1 class="mt-16">Directorate <span class="accent">sign in.</span></h1>' +
      '<p class="lead mt-16" style="color:#C6D8D1">This sign-in link is only for YPDC directorate accounts. It is not listed anywhere on the public website. ' +
      'Every attempt is recorded in the audit log.</p>' +
      '<div class="grid mt-32" style="gap:12px">' +
      '<div class="auth-feature">Directorate accounts only</div>' +
      '<div class="auth-feature">Rate limited sign-in</div>' +
      '<div class="auth-feature">Audit logged</div>' +
      '</div></div>' +
      '<div class="mut mt-32" style="font-size:.8rem;color:#B9CFC7">Do not attempt unauthorized access — all attempts are recorded.</div>' +
      '</div>' +
      '<div class="auth-right"><div class="auth-card center-x admin-card">' +
      '<span class="eyebrow">Directorate</span><h2 class="mt-10">Directorate sign in</h2>' +
      '<p class="mut mt-10">For YPDC directorate accounts only.</p>' +
      '<form class="mt-22" data-form="directorate-login">' +
      '<label class="field"><span>Email</span><input name="email" type="email" placeholder="your.name@uon.edu.pk" autocomplete="username" required></label>' +
      '<label class="field"><span>Password</span><input name="password" type="password" autocomplete="current-password" required></label>' +
      '<button class="btn btn-green btn-block" type="submit">Open directorate dashboard ' + (I.arrow || '') + '</button>' +
      '</form>' +
      '<div id="directorate-login-msg" class="panel-note mt-22">Directorate accounts are created by the admin. If you cannot sign in, contact the YPDC office.</div>' +
      '<div class="flex mt-22" style="gap:14px"><a class="mut" style="font-size:.84rem" href="#/">← Back to website</a>' +
      '<a class="mut" style="font-size:.84rem" href="#/login">Normal user login</a></div>' +
      '</div></div></div>';
  }

  Y.api = api;
  App.adminLoginPage = adminLoginPage;
  App.directorateLoginPage = directorateLoginPage;
  App.api = api;
})();

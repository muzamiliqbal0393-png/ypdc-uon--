(function (global) {
  'use strict';
  var KEY = 'ypdc_uon_store_v1';
  function content() { return global.YPDC_CONTENT(); }
  var state = load();

  function load() {
    try {
      var raw = global.localStorage.getItem(KEY);
      if (!raw) return content();
      var parsed = JSON.parse(raw);
      var base = content();
      Object.keys(base).forEach(function (k) {
        if (parsed[k] === undefined) parsed[k] = base[k];
      });
      var bv = (base.meta && base.meta.version) || 1;
      var pv = (parsed.meta && parsed.meta.version) || 1;
      if (pv !== bv) {
        ['site', 'portals', 'roles'].forEach(function (k) { if (base[k] !== undefined) parsed[k] = base[k]; });
        parsed.meta = base.meta;
        try { global.localStorage.setItem(KEY, JSON.stringify(parsed)); } catch (e) {}
      }
      return parsed;
    } catch (e) { return content(); }
  }
  function save() {
    try { global.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    var api = global.YPDC && global.YPDC.api;
    if (api && api.available && api.snapshot) {
      clearTimeout(save._t);
      save._t = setTimeout(function () { api.saveState(state); }, 350);
    }
    document.dispatchEvent(new CustomEvent('store:change'));
  }

  function tidyEvents(list) {
    if (!Array.isArray(list)) return list;
    return list.map(function (e) {
      e = e || {};
      e.registered = Number(e.registered) || 0;
      e.capacity = Number(e.capacity) || 0;
      e.category = e.category || 'General';
      e.status = e.status || 'Upcoming';
      e.organizer = e.organizer || 'YPDC UON';
      return e;
    });
  }

  function loadFromServer(collections) {
    if (!collections) return false;
    if (collections.events) collections.events = tidyEvents(collections.events);
    var base = content();
    var localSession = (state.session && state.session.role) ? state.session : null;
    var PRIVATE = { people: 1, accounts: 1 };
    Object.keys(base).forEach(function (k) {
      if (collections[k] === undefined && !PRIVATE[k]) collections[k] = base[k];
    });
    Object.keys(state).forEach(function (k) { delete state[k]; });
    Object.keys(collections).forEach(function (k) { state[k] = collections[k]; });
    if (localSession) state.session = localSession;
    try { global.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    document.dispatchEvent(new CustomEvent('store:change'));
    return true;
  }
  function blankOf(v) {
    if (Array.isArray(v)) return [];
    if (v && typeof v === 'object') {
      var o = {};
      Object.keys(v).forEach(function (k) { o[k] = blankOf(v[k]); });
      return o;
    }
    if (typeof v === 'number') return 0;
    if (typeof v === 'boolean') return false;
    if (typeof v === 'string') return '';
    return null;
  }

  function loadPublic(cols) {
    if (!cols) return false;
    var base = content();
    var localSession = (state.session && state.session.role) ? state.session : null;
    var next = {};
    Object.keys(base).forEach(function (k) {
      next[k] = (cols[k] !== undefined) ? cols[k] : blankOf(base[k]);
    });
    Object.keys(cols).forEach(function (k) { next[k] = cols[k]; });
    Object.keys(state).forEach(function (k) { delete state[k]; });
    Object.keys(next).forEach(function (k) { state[k] = next[k]; });
    if (localSession) state.session = localSession;
    try { global.localStorage.removeItem(KEY); } catch (e) {}
    document.dispatchEvent(new CustomEvent('store:change'));
    return true;
  }

  function reset() {
    var fresh = content();
    Object.keys(state).forEach(function (k) { delete state[k]; });
    Object.keys(fresh).forEach(function (k) { state[k] = fresh[k]; });
    try { global.localStorage.removeItem(KEY); } catch (e) {}
    try { global.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    document.dispatchEvent(new CustomEvent('store:change'));
  }

  function uid(p) { return p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function pushLog(text, meta) {
    state.activityLog.unshift({ id: uid('l'), text: text, meta: meta || '', status: 'Logged', date: today() });
    if (state.activityLog.length > 60) state.activityLog.pop();
  }
  function notify(type, text, meta, group) {
    state.notifications.unshift({ id: uid('nt'), type: type, text: text, meta: meta, read: false, time: 'Just now', group: group });
    if (state.notifications.length > 40) state.notifications.pop();
  }

  var Actions = {
    reset: reset,
    save: save,
    loadFromServer: loadFromServer,

    login: function (role, email, name) {
      var p = state.profiles[role] || {};
      state.session = {
        role: role,
        email: email || p.email || '',
        name: name || p.name || 'YPDC User',
        at: new Date().toISOString()
      };
      save();
      return state.session;
    },
    logout: function () { state.session = null; save(); },

    registerEvent: function (eventId, name, email, note) {
      var ev = state.events.filter(function (e) { return e.id === eventId; })[0];
      if (!ev) return false;
      var dup = state.registrations.filter(function (r) { return r.eventId === eventId && r.email === email; })[0];
      if (dup) return 'duplicate';
      state.registrations.unshift({ id: uid('r'), eventId: eventId, name: name, email: email, date: today(), status: 'Registered', note: note || '' });
      ev.registered = (ev.registered || 0) + 1;
      notify('Registration', 'Registration confirmed', 'You are registered for ' + ev.title + '.', 'Registrations');
      pushLog('Event registration', name + ' registered for ' + ev.title);
      save();
      return true;
    },
    cancelRegistration: function (id) {
      var r = state.registrations.filter(function (x) { return x.id === id; })[0];
      if (!r) return;
      state.registrations = state.registrations.filter(function (x) { return x.id !== id; });
      var ev = state.events.filter(function (e) { return e.id === r.eventId; })[0];
      if (ev && ev.registered > 0) ev.registered--;
      pushLog('Registration cancelled', r.name + ' cancelled registration');
      save();
    },

    addEvent: function (ev) {
      ev.id = uid('e');
      ev.registered = ev.registered || 0;
      ev.image = ev.image || 'event-volunteers.jpg';
      state.events.unshift(ev);
      pushLog('Event created', ev.title + ' added by admin');
      notify('Event', 'New event published', ev.title + ' · ' + ev.date, 'Events');
      save();
      return ev;
    },
    updateEvent: function (id, patch) {
      var ev = state.events.filter(function (e) { return e.id === id; })[0];
      if (!ev) return;
      Object.keys(patch).forEach(function (k) { ev[k] = patch[k]; });
      pushLog('Event edited', ev.title + ' updated');
      save();
    },
    deleteEvent: function (id) {
      state.events = state.events.filter(function (e) { return e.id !== id; });
      pushLog('Event removed', 'An event record was deleted');
      save();
    },

    toggleTask: function (id, status) {
      var t = state.tasks.filter(function (x) { return x.id === id; })[0];
      if (!t) return;
      t.status = status || (t.status === 'Done' ? 'Pending' : 'Done');
      pushLog('Task updated', t.title + ' → ' + t.status);
      save();
    },
    addTask: function (task) {
      task.id = uid('t');
      state.tasks.unshift(task);
      notify('Task', 'New task assigned', task.title, 'Tasks');
      pushLog('Task assigned', task.title + ' → ' + task.owner);
      save();
    },

    addProposal: function (p) {
      p.id = uid('p'); p.status = 'Pending'; p.date = today();
      state.proposals.unshift(p);
      notify('Proposal', 'Proposal submitted', p.title + ' sent for review', 'Proposals');
      pushLog('Proposal submitted', p.title + ' · ' + p.directorate);
      save();
    },
    setProposalStatus: function (id, status) {
      var p = state.proposals.filter(function (x) { return x.id === id; })[0];
      if (!p) return;
      p.status = status;
      var fa = state.facultyActivities.filter(function (f) { return f.title === p.title; })[0];
      if (fa) fa.status = status === 'Approved' ? 'Approved' : (status === 'Rejected' ? 'Rejected' : fa.status);
      notify('Approval', 'Proposal ' + status.toLowerCase(), p.title + ' ' + status.toLowerCase(), 'Approvals');
      pushLog('Proposal ' + status.toLowerCase(), p.title + ' by ' + p.by);
      save();
    },

    setActivityStatus: function (id, status) {
      var a = state.facultyActivities.filter(function (x) { return x.id === id; })[0];
      if (!a) return;
      a.status = status;
      pushLog('Activity ' + status.toLowerCase(), a.title + ' reviewed by faculty');
      save();
    },

    setApplicationStatus: function (id, status) {
      var a = state.applications.filter(function (x) { return x.id === id; })[0];
      if (!a) return;
      a.status = status;
      if (status === 'Approved') {
        state.people.push({
          id: uid('u'), name: a.name, type: 'General Member', directorate: a.directorate,
          post: 'Member', status: 'Active', email: a.email, program: a.program, batch: state.inductionDrive.batch
        });
        var d = state.directorates.filter(function (x) { return x.name === a.directorate; })[0];
        if (d) { d.members++; d.active++; }
      }
      notify('Approval', 'Application ' + status.toLowerCase(), a.name + ' · ' + a.directorate, 'Approvals');
      pushLog('Application ' + status.toLowerCase(), a.name + ' · ' + a.directorate);
      save();
    },
    assignDirectorate: function (id, directorate) {
      var a = state.applications.filter(function (x) { return x.id === id; })[0];
      if (!a) return;
      a.directorate = directorate;
      a.decidedAt = today();
      pushLog('Directorate assigned', a.name + ' → ' + directorate);
      notify('Applications', 'Directorate assigned', a.name + ' → ' + directorate + ' (' + a.email + ')', 'Approvals');
      save();
    },
    submitApplication: function (app) {
      app.id = uid('ap'); app.date = today(); app.status = 'New';
      state.applications.unshift(app);
      state.inductionDrive.received++;
      pushLog('New application received', 'Induction batch ' + state.inductionDrive.batch + ' · ' + app.name);
      notify('Approval', 'New application received', app.name + ' applied for ' + app.directorate, 'Approvals');
      save();
      return app;
    },

    addPerson: function (p) {
      p.id = uid('u'); p.status = p.status || 'Active';
      state.people.push(p);
      pushLog('Member added', p.name + ' → ' + p.directorate);
      save();
    },
    setPersonStatus: function (id, status) {
      var p = state.people.filter(function (x) { return x.id === id; })[0];
      if (!p) return;
      p.status = status;
      pushLog('Member status changed', p.name + ' marked ' + status);
      save();
    },
    changePersonRole: function (id, post) {
      var p = state.people.filter(function (x) { return x.id === id; })[0];
      if (!p) return;
      p.post = post;
      pushLog('Post changed', p.name + ' → ' + post);
      save();
    },

    saveCabinet: function (posts) {
      state.cabinet.posts = posts;
      pushLog('Cabinet information updated', 'Executive posts updated by Admin');
      save();
    },
    addCabinetPost: function (post) {
      state.cabinet.posts.push({ title: post.title, holder: post.holder || 'Admin editable', status: 'Active' });
      pushLog('Cabinet post added', post.title);
      save();
    },
    setDirectorateStatus: function (id, status) {
      var d = state.directorates.filter(function (x) { return x.id === id; })[0];
      if (!d) return;
      d.status = status;
      pushLog('Directorate status changed', d.name + ' → ' + status);
      save();
    },

    saveHighlight: function (id, patch) {
      var h = state.highlights.filter(function (x) { return x.id === id; })[0];
      if (!h) return;
      Object.keys(patch).forEach(function (k) { h[k] = patch[k]; });
      notify('Event', 'Highlight ' + (h.status === 'Published' ? 'published' : 'moved to draft'), h.title, 'Events');
      pushLog('Highlight published', h.title + ' moved to ' + h.status);
      save();
    },
    addHighlight: function (h) {
      h.id = uid('h'); h.status = h.status || 'Draft';
      state.highlights.unshift(h);
      pushLog('Highlight created', h.title);
      save();
    },
    saveContent: function (patch) {
      Object.keys(patch).forEach(function (k) { state.site[k] = patch[k]; });
      pushLog('Website content updated', 'Public pages edited by Admin');
      save();
    },
    addNews: function (n) {
      n.id = uid('n'); n.date = today();
      state.news.unshift(n);
      pushLog('News published', n.title);
      save();
    },

    addFeedback: function (f) {
      f.id = uid('f'); f.date = today();
      state.feedback.unshift(f);
      pushLog('Feedback received', (f.name || 'Visitor') + ' sent feedback');
      notify('Task', 'New feedback received', (f.name || 'Visitor') + ' rated ' + (f.rating || 5) + '/5', 'Tasks');
      save();
    },
    replyFeedback: function (id) {
      var f = state.feedback.filter(function (x) { return x.id === id; })[0];
      if (f) { f.replied = true; save(); }
    },

    markNotifRead: function (id) {
      var n = state.notifications.filter(function (x) { return x.id === id; })[0];
      if (n) { n.read = true; save(); }
    },
    markAllNotifRead: function () {
      state.notifications.forEach(function (n) { n.read = true; });
      save();
    },

    addCertificate: function (c) {
      c.id = uid('c'); c.code = 'YPDC-C-' + Math.floor(1000 + Math.random() * 8999);
      c.date = today(); c.status = 'Issued';
      state.certificates.unshift(c);
      pushLog('Certificate issued', c.title + ' · ' + c.event);
      save();
    },
    applyVolunteer: function (v) {
      v.id = uid('v');
      state.volunteer.unshift(v);
      notify('Task', 'Volunteer request sent', v.drive + ' · ' + v.role, 'Tasks');
      save();
    },
    requestMentorship: function (m) {
      m.id = uid('m'); m.status = 'Requested'; m.date = today();
      state.mentorship.unshift(m);
      save();
    },
    saveProfile: function (role, patch) {
      Object.keys(patch).forEach(function (k) { state.profiles[role][k] = patch[k]; });
      pushLog('Profile updated', (state.profiles[role].name || role) + ' profile saved');
      save();
    }
  };

  global.YPDC = {
    state: state,
    content: content,
    save: save,
    reset: reset,
    loadFromServer: loadFromServer,
    loadPublic: loadPublic,
    actions: Actions,
    uid: uid,
    today: today
  };
})(window);

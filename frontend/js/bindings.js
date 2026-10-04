(function () {
  'use strict';

  function flushServer(keys, okMsg) {
    var api = window.YPDC.api;
    if (!api || !api.available || !api.snapshot) {
      toast('Saved in this browser only — the server is offline');
      render();
      return;
    }
    api.saveState(S).then(function (r) {
      var denied = (r && r.denied) || [];
      var blocked = keys.filter(function (k) { return denied.indexOf(k) > -1; });
      if (blocked.length) toast('Not allowed for the ' + S.session.role + ' role: ' + blocked.join(', '));
      else if (r && r.error) toast('Not saved: ' + r.error);
      else toast(okMsg, true);
      render();
    });
  }

  function pickPortal(id) {
    if (!id) return;
    var rail = document.querySelector('.pe-rail');
    if (!rail) return;
    window.__peRole = id;
    Array.prototype.forEach.call(rail.querySelectorAll('.pe-item'), function (b) {
      var on = b.getAttribute('data-role') === id;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    var panel = document.querySelector('.pe-panel');
    if (!panel) return;
    Array.prototype.forEach.call(panel.querySelectorAll('.pe-pane'), function (pn) {
      pn.classList.toggle('is-on', pn.getAttribute('data-pane') === id);
    });
  }

  var App = window.App;
  function PC() { return window.PC; }
  var S = window.YPDC.state;
  var A = window.YPDC.actions;
  var $ = App.$, $$ = App.$$, esc = App.esc, I = App.Icons, initials = App.initials,
      roleTitle = App.roleTitle, img = App.img, fmtDate = App.fmtDate;

  /* Batch D — admin filters, pagination aur user management actions */
  function adminData() { return (window.PC && window.PC.adminData) || null; }

  function readFilters(state) {
    ['q', 'role', 'action', 'status', 'from', 'to', 'state', 'perPage'].forEach(function (k) {
      var el = document.querySelector('[data-filter="' + k + '"]');
      if (!el) return;
      if (state[k] !== undefined) state[k] = (k === 'perPage') ? Number(el.value) : el.value;
    });
    return state;
  }

  function refreshUsers() {
    var d = adminData();
    if (d) { d.usersQ.page = 1; return d.loadUsers(); }
    return Promise.resolve();
  }

  function removeUserRow(id) {
    var d = adminData();
    if (d) d.forgetUser(id);
  }

  function toast() { return App.toast.apply(null, arguments); }
  function openModal() { return App.openModal.apply(null, arguments); }
  function closeModal() { return App.closeModal.apply(null, arguments); }
  function openDrawer() { return App.openDrawer.apply(null, arguments); }
  function closeDrawer() { return App.closeDrawer.apply(null, arguments); }
  function notifList() { return App.notifList.apply(null, arguments); }
  function runSearch() { return App.runSearch.apply(null, arguments); }
  function openModalUser() { return (App.openUserModal || function () {}).apply(null, arguments); }
  function openEventDetail() { return (App.openEventDetailModal || function () {}).apply(null, arguments); }
  function openUserRole() { return (App.openUserRoleModal || function () {}).apply(null, arguments); }
  function ensurePhotos() {
    var st = window.YPDC.state;
    if (!st.site) st.site = {};
    if (!st.site.photos) st.site.photos = { hero: '', gallery: [] };
    if (!Array.isArray(st.site.photos.gallery)) st.site.photos.gallery = [];
    return st.site.photos;
  }

  function readPhoto(file, maxW, quality) {
    return new Promise(function (resolve, reject) {
      if (!file || String(file.type || '').indexOf('image/') !== 0) return reject(new Error('Please choose an image file.'));
      var fr = new FileReader();
      fr.onerror = function () { reject(new Error('Could not read that file.')); };
      fr.onload = function () {
        var im = new Image();
        im.onerror = function () { reject(new Error('That file is not a valid image.')); };
        im.onload = function () {
          var scale = Math.min(1, maxW / (im.width || maxW));
          var w = Math.max(1, Math.round(im.width * scale)), h = Math.max(1, Math.round(im.height * scale));
          var c = document.createElement('canvas');
          c.width = w; c.height = h;
          var ctx = c.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
          ctx.drawImage(im, 0, 0, w, h);
          try { resolve(c.toDataURL('image/jpeg', quality || 0.8)); } catch (e) { reject(new Error('Could not process that image.')); }
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  function afterPhotoChange(message) {
    A.save();
    toast(message, true);
    render();
  }

  function storePhoto(dataUri) {
    var api = window.YPDC.api;
    if (!api || !api.available || !api.uploadPhoto) return Promise.resolve(dataUri);
    return api.uploadPhoto(dataUri).then(function (r) { return (r && r.url) ? r.url : dataUri; })
      .catch(function () { return dataUri; });
  }

  function handlePhotoFiles(input) {
    var kind = input.getAttribute('data-photo');
    var files = Array.prototype.slice.call(input.files || []);
    if (!files.length) return;
    var photos = ensurePhotos();
    var jobs = files.map(function (fl) {
      return readPhoto(fl, kind === 'logo' ? 512 : (kind === 'gallery' ? 1100 : 1600), kind === 'logo' ? 0.92 : 0.82);
    });
    Promise.all(jobs).then(function (list) {
      return Promise.all(list.map(storePhoto));
    }).then(function (list) {
      if (kind === 'hero') { photos.hero = list[0]; }
      else if (kind === 'logo') { window.YPDC.state.site.logo = list[0]; }
      else { list.forEach(function (d) { photos.gallery.push(d); }); }
      var btn = document.querySelector('#photo-form') ? null : null;
      afterPhotoChange(kind === 'gallery' ? (list.length + ' photo' + (list.length > 1 ? 's' : '') + ' added to the gallery') :
        (kind === 'logo' ? 'Logo updated — it is live on the website' : 'Homepage photo updated'));
      closeModal();
    }).catch(function (e) {
      toast(e.message || 'Could not use that image', false);
    });
  }

  function resetPhoto(kind) {
    var st = window.YPDC.state;
    if (kind === 'hero') ensurePhotos().hero = '';
    else if (kind === 'gallery') ensurePhotos().gallery = [];
    else if (kind === 'logo') st.site.logo = '';
    afterPhotoChange(kind === 'gallery' ? 'Gallery reset to the default photos' : (kind === 'logo' ? 'Default logo restored' : 'Default photo restored'));
  }

  function removeGalleryPhoto(i) {
    var g = ensurePhotos().gallery;
    if (i < 0 || i >= g.length) return;
    g.splice(i, 1);
    afterPhotoChange('Photo removed from the gallery');
  }

  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el && el.getAttribute && el.getAttribute('data-photo')) handlePhotoFiles(el);
  });

  function roleName(id) {
    var p = (S.portals || []).filter(function (x) { return x.id === id; })[0];
    return p ? p.title.replace(' Portal', '') : App.roleTitle(id);
  }

  function render() { return App.render.apply(null, arguments); }
  function openRegisterModal() { return App.openRegisterModal.apply(null, arguments); }
  function openCertificateModal() { return App.openCertificateModal.apply(null, arguments); }
  function openAssignModal() { return App.openAssignModal.apply(null, arguments); }
  function openRoleModal() { return App.openRoleModal.apply(null, arguments); }
  function openEventModal() { return App.openEventModal.apply(null, arguments); }
  function openEditEventModal() { return App.openEditEventModal.apply(null, arguments); }
  function openTaskModal() { return App.openTaskModal.apply(null, arguments); }
  function openPersonModal() { return App.openPersonModal.apply(null, arguments); }
  function saveCabinetEditor() { return App.saveCabinetEditor.apply(null, arguments); }
  function openCabinetModal() { return App.openCabinetModal.apply(null, arguments); }
  function openContentModal() { return App.openContentModal.apply(null, arguments); }
  function openNewsModal() { return App.openNewsModal.apply(null, arguments); }
  function openProposalModal() { return App.openProposalModal.apply(null, arguments); }
  function openCertificateIssueModal() { return App.openCertificateIssueModal.apply(null, arguments); }
  function openMentorshipModal() { return App.openMentorshipModal.apply(null, arguments); }
  function refreshUnreadBadge() {
    var api = window.YPDC.api;
    if (!api || !api.available) return;
    var dots = $$('.ptop [data-action="open-notifs"] .dot-count');
    var count = (api.notifUnread || 0) + (api.msgUnread || 0) + S.notifications.filter(function (n) { return !n.read; }).length;
    dots.forEach(function (dot) {
      if (count) { dot.textContent = count; dot.style.display = ''; }
      else { dot.parentNode.removeChild(dot); }
    });
    if (count) {
      $$('.ptop [data-action="open-notifs"]').forEach(function (btn) {
        if (!btn.querySelector('.dot-count')) {
          var s = document.createElement('span'); s.className = 'dot-count'; s.textContent = count; btn.appendChild(s);
        }
      });
    }
  }

  function confirmDialog(question, note, onYes) {
    openModal({
      title: 'Please confirm',
      body: '<p class="mut">' + esc(note || '') + '</p>',
      foot: '<button class="btn btn-quiet" data-action="close-modal">Cancel</button>' +
        '<button class="btn btn-danger" id="confirm-yes">' + esc(question) + '</button>'
    });
    var y = $('#confirm-yes');
    if (y) y.addEventListener('click', function () { closeModal(); onYes(); });
  }

  function bindGlobal() {
    var searchTimer = null, searchSeq = 0;
    document.addEventListener('input', function (e) {
      var input = e.target.closest('[data-search-input]');
      if (!input) return;
      var shell = input.closest('[data-search]');
      var out = $('[data-search-results]', shell);
      var q = input.value.trim();
      shell.classList.toggle('has-text', !!q);
      var api = window.YPDC.api;
      var live = !!(api && api.available && window.YPDC.state.session);
      if (!q) { out.classList.add('hide'); out.innerHTML = ''; return; }

      if (!live) {            // guest / single-file build: purana local search
        var res = runSearch(input.value);
        out.classList.remove('hide');
        out.innerHTML = res.length ? res.map(function (x) {
          return '<div class="res" data-action="goto" data-go="' + esc(x.go) + '"><span class="av" style="width:34px;height:34px;flex:0 0 34px;border-radius:10px;background:var(--green-800);color:var(--gold);display:grid;place-items:center;font-size:.75rem;font-weight:700">' + initials(x.title) + '</span>' +
            '<div><b style="font-size:.9rem">' + esc(x.title) + '</b><small>' + esc(x.type) + ' · ' + esc(x.sub) + '</small></div></div>';
        }).join('') : '<div class="search-empty">No results for "' + esc(input.value) + '"</div>';
        return;
      }

      if (q.length < 2) {
        out.classList.remove('hide');
        out.innerHTML = '<div class="search-group"><div class="search-loading">Type one more letter…</div></div>';
        return;
      }

      out.classList.remove('hide');
      out.innerHTML = App.searchLoading();
      var seq = ++searchSeq;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        api.search(q).then(function (r) {
          if (seq !== searchSeq) return;                    // purana jawab ignore
          if (input.value.trim() !== q) return;
          out.innerHTML = App.searchGrouped(r.groups, q);
        }).catch(function (err) {
          if (seq !== searchSeq) return;
          out.innerHTML = '<div class="search-empty">' + esc(err.message || 'Search is not available right now.') + '</div>';
        });
      }, 220);
    });
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-action="search-clear"]')) {
        var shell = e.target.closest('[data-search]');
        var inp = $('[data-search-input]', shell);
        if (inp) { inp.value = ''; inp.focus(); }
        shell.classList.remove('has-text');
        var o = $('[data-search-results]', shell);
        if (o) { o.innerHTML = ''; o.classList.add('hide'); }
        e.preventDefault();
        return;
      }
      if (!e.target.closest('[data-search]')) $$('[data-search-results]').forEach(function (o) { o.classList.add('hide'); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeModal(); closeDrawer(); $$('[data-search-results]').forEach(function (o) { o.innerHTML = ''; o.classList.add('hide'); }); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); var i = $('[data-search-input]'); if (i) i.focus(); }
      if (e.key === 'Enter' && e.target && e.target.matches && e.target.matches('[data-filter="q"]')) {
        e.preventDefault();
        var apply = document.querySelector('[data-action="log-apply"], [data-action="users-apply"]');
        if (apply) apply.click();
      }
    });

    document.addEventListener('submit', function (e) {
      var f = e.target.closest('[data-form]');
      if (!f) return;
      e.preventDefault();
      var kind = f.getAttribute('data-form');
      var data = {};
      $$('input,select,textarea', f).forEach(function (el) { if (el.name) data[el.name] = el.value; });

      if (kind === 'signup') {
        var sapi = window.YPDC.api;
        var sbtn = f.querySelector('button[type="submit"]');
        var errBox = function (msg) {
          var b = f.querySelector('.login-error') || document.createElement('div');
          b.className = 'panel-note login-error mt-16';
          b.style.borderColor = 'var(--danger)';
          b.textContent = msg;
          if (!b.parentNode) f.appendChild(b);
          if (sbtn) { sbtn.disabled = false; sbtn.textContent = 'Create my account'; }
        };
        if (!(sapi && sapi.available)) return errBox('Server is not running — start the backend (npm start in backend/server) to create an account.');
        if (data.password !== data.confirm) return errBox('The two passwords do not match.');
        if (String(data.name || '').trim().length < 3) return errBox('Please enter your full name.');
        if (sbtn) { sbtn.disabled = true; sbtn.textContent = 'Creating your account…'; }
        sapi.register({
          name: data.name, email: data.email, role: data.role || 'student',
          password: data.password, program: data.program, directorate: data.directorate
        }).then(function (r) {
          return sapi.loadState().then(function (cols) { window.YPDC.loadFromServer(cols); return r; });
        }).then(function (r) {
          window.__authTab = 'signin';
          S.session = { role: roleName(r.role), email: r.user.email, name: r.user.name, id: r.user.id, api: true };
          toast('Account created — welcome, ' + r.user.name, true);
          location.hash = '#/portal/' + r.role + '/dashboard';
          render();
        }).catch(function (e) {
          errBox(e.message || 'Could not create the account.');
        });
        return;
      }
      if (kind === 'announce') {
        var anapi = window.YPDC.api;
        var anbtn = f.querySelector('button[type="submit"]');
        if (!(anapi && anapi.available)) { toast('Server is not running — start the backend first.'); return; }
        if (anbtn) { anbtn.disabled = true; anbtn.textContent = 'Sending…'; }
        anapi.adminAnnounce({
          title: data.title, body: data.body, audience: data.audience,
          link: data.link || '', email: !!f.querySelector('input[name="email"]').checked
        }).then(function (r) {
          if (window.PC.adminAnnReload) window.PC.adminAnnReload();
          toast('Announcement sent to ' + r.delivered + ' account(s)' + (r.emailed ? ' · ' + r.emailed + ' email(s) queued' : ''), true);
          f.reset(); render();
        }).catch(function (e) {
          if (anbtn) { anbtn.disabled = false; anbtn.textContent = 'Send announcement'; }
          toast(e.message || 'Could not send the announcement');
        });
        return;
      }

      if (kind === 'forgot') {
        var fapi = window.YPDC.api;
        var fbtn = f.querySelector('button[type="submit"]');
        var fnote = function (msg, tone) {
          var box = f.querySelector('.login-error') || document.createElement('div');
          box.className = 'panel-note login-error mt-16';
          if (tone === 'ok') box.style.borderColor = 'var(--gold)';
          else box.style.borderColor = 'var(--danger)';
          box.innerHTML = msg;
          if (!box.parentNode) f.appendChild(box);
          if (fbtn) { fbtn.disabled = false; fbtn.textContent = 'Send reset link'; }
        };
        if (!(fapi && fapi.available)) return fnote('Server is not running — start the backend (npm start in backend/server) to reset a password.');
        if (!String(data.email || '').trim()) return fnote('Please enter your email address.');
        if (fbtn) { fbtn.disabled = true; fbtn.textContent = 'Sending…'; }
        fapi.forgotPassword(data.email).then(function (r) {
          fnote(esc(r.message || 'Check your inbox for the reset link.') +
            (r.devLink ? '<div class="mt-10" style="font-size:.82rem">No SMTP on this machine, so here is the same link: <a href="' + esc(r.devLink) + '">open reset link</a></div>' : ''), 'ok');
          toast('Reset link sent — check the inbox', true);
        }).catch(function (e) {
          fnote(esc(e.message || 'Could not send the reset link.'));
        });
        return;
      }

      if (kind === 'reset') {
        var rapi = window.YPDC.api;
        var rbtn = f.querySelector('button[type="submit"]');
        var rnote = function (msg) {
          var box = f.querySelector('.login-error') || document.createElement('div');
          box.className = 'panel-note login-error mt-16';
          box.style.borderColor = 'var(--danger)';
          box.textContent = msg;
          if (!box.parentNode) f.appendChild(box);
          if (rbtn) { rbtn.disabled = false; rbtn.textContent = 'Save new password'; }
        };
        if (!(rapi && rapi.available)) return rnote('Server is not running — start the backend to reset a password.');
        if (data.password !== data.confirm) return rnote('The two passwords do not match.');
        if (String(data.password || '').length < 8) return rnote('Password must be at least 8 characters.');
        if (rbtn) { rbtn.disabled = true; rbtn.textContent = 'Saving…'; }
        rapi.resetPassword(data.token, data.password).then(function (r) {
          toast(r.message || 'Password updated — please log in', true);
          window.__authTab = 'signin';
          location.hash = '#/login';
          render();
        }).catch(function (e) {
          rnote(e.message || 'Could not reset the password.');
        });
        return;
      }

      if (kind === 'login') {
        var api = window.YPDC.api;
        if (api && api.available) {
          var btn = f.querySelector('button[type="submit"]');
          if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }
          api.login(data.email, data.password, data.role || 'student').then(function (r) {
            return api.loadState().then(function (cols) { window.YPDC.loadFromServer(cols); return r; });
          }).then(function (r) {
            S.session = { role: S.portals.filter(function (p) { return p.id === r.role; })[0].title.replace(' Portal', ''), email: r.user.email, name: r.user.name, id: r.user.id, api: true };
            toast('Welcome back, ' + r.user.name, true);
            location.hash = '#/portal/' + r.role + '/dashboard';
            render();
          }).catch(function (err) {
            var box = f.querySelector('.login-error') || document.createElement('div');
            box.className = 'panel-note login-error mt-16';
            box.style.borderColor = 'var(--danger)';
            box.textContent = err.message || 'Login fail';
            if (!box.parentNode) f.appendChild(box);
            if (btn) { btn.disabled = false; btn.textContent = 'Sign in to workspace'; }
          });
          return;
        }
        var nb = f.querySelector('.login-error') || document.createElement('div');
        nb.className = 'panel-note login-error mt-16';
        nb.style.borderColor = 'var(--danger)';
        nb.textContent = 'Server is not running — start the backend to log in.';
        if (!nb.parentNode) f.appendChild(nb);
        return;
      }
      if (kind === 'admin-login') {
        var msg = document.getElementById('admin-login-msg');
        var abtn = f.querySelector('button[type="submit"]');
        if (abtn) { abtn.disabled = true; abtn.textContent = 'Checking…'; }
        window.YPDC.api.adminLogin(data.email, data.password, data.adminKey).then(function (r) {
          return window.YPDC.api.loadState().then(function (cols) { window.YPDC.loadFromServer(cols); return r; });
        }).then(function (r) {
          S.session = { role: 'Admin', email: r.user.email, name: r.user.name, id: r.user.id, api: true };
          if (msg) { msg.style.borderColor = 'var(--ok)'; msg.textContent = 'Access granted — opening the admin dashboard…'; }
          location.hash = '#/portal/admin/dashboard';
          render();
        }).catch(function (err) {
          if (msg) { msg.style.borderColor = 'var(--danger)'; msg.textContent = err.message || 'Admin login fail'; }
          if (abtn) { abtn.disabled = false; abtn.textContent = 'Unlock admin dashboard'; }
        });
        return;
      }
      if (kind === 'directorate-login') {
        var dmsg = document.getElementById('directorate-login-msg');
        var dbtn = f.querySelector('button[type="submit"]');
        if (dbtn) { dbtn.disabled = true; dbtn.textContent = 'Checking…'; }
        window.YPDC.api.loginDirectorate(data.email, data.password).then(function (r) {
          return window.YPDC.api.loadState().then(function (cols) { window.YPDC.loadFromServer(cols); return r; });
        }).then(function (r) {
          S.session = { role: 'Directorate', email: r.user.email, name: r.user.name, id: r.user.id, api: true };
          if (dmsg) { dmsg.style.borderColor = 'var(--ok)'; dmsg.textContent = 'Signed in — opening the directorate dashboard…'; }
          location.hash = '#/portal/directorate/dashboard';
          render();
        }).catch(function (err) {
          if (dmsg) { dmsg.style.borderColor = 'var(--danger)'; dmsg.textContent = err.message || 'Sign in failed'; }
          if (dbtn) { dbtn.disabled = false; dbtn.textContent = 'Open directorate dashboard'; }
        });
        return;
      }
      if (kind === 'shaheen') {
        var shapi = window.YPDC.api;
        var sbtn2 = f.querySelector('button[type="submit"]');
        var sErr = function (m) {
          var b = f.querySelector('.login-error') || document.createElement('div');
          b.className = 'panel-note login-error mt-16';
          b.style.borderColor = 'var(--danger)';
          b.textContent = m;
          if (!b.parentNode) f.appendChild(b);
          if (sbtn2) { sbtn2.disabled = false; sbtn2.textContent = 'Submit registration'; }
        };
        if (!(shapi && shapi.available)) return sErr('Server is not running — start the backend to register.');
        if (data.password !== data.confirm) return sErr('The two passwords do not match.');
        if (String(data.name || '').trim().length < 3) return sErr('Please enter your full name.');
        if (!String(data.department || '').trim()) return sErr('Please enter your department / program.');
        if (!String(data.semester || '').trim()) return sErr('Please select your semester.');
        if (App.docsMissing) {
          var missS = App.docsMissing(f);
          if (missS.length) return sErr(App.docsHelp(missS));
        }
        if (sbtn2) { sbtn2.disabled = true; sbtn2.textContent = 'Submitting…'; }
        (function () {
          var box = f.querySelector('.login-error');
          if (box) box.remove();
        })();
        var shDocs = (App.docValues ? App.docValues(f, {}) : {});
        shapi.shaheenRegister({
          name: data.name, email: data.email, phone: data.phone,
          program: data.program || data.department, department: data.department || data.program,
          semester: data.semester, reason: data.reason,
          photo: shDocs.photo, idCard: shDocs.idCard,
          password: data.password, confirm: data.confirm
        }).then(function (r) {
          f.reset();
          var note = document.createElement('div');
          note.className = 'panel-note mt-16';
          note.style.borderColor = 'var(--ok)';
          note.innerHTML = '<b>Registration received.</b> ' + esc(r.message || 'The admin will review your registration.');
          f.parentNode.appendChild(note);
          toast('Bano Shaheen registration submitted — waiting for admin approval', true);
          return shapi.shaheenInfo().then(function (info) {
            if (S.shaheen && info) { S.shaheen.registered = info.registered; S.shaheen.open = info.open; }
          });
        }).catch(function (err) { sErr(err.message || 'Registration was not submitted'); });
        return;
      }
      if (kind === 'feedback') {
        var fapi = window.YPDC.api;
        if (fapi && fapi.available) {
          fapi.submitFeedback({
            name: data.name, email: data.email, type: data.type || 'General',
            message: data.text || data.message || '', role: 'Public'
          }).then(function () {
            toast('Thanks! Your feedback reached the admin dashboard.', true);
            f.reset();
          }).catch(function (err) { toast(err.message || 'Feedback was not submitted'); });
          return;
        }
        A.addFeedback({ name: data.name, email: data.email, text: data.text, rating: Number(data.rating), role: 'Public' });
        toast('Thanks! Your feedback was sent to the YPDC admin dashboard.', true);
        f.reset(); render(); return;
      }
      if (kind === 'induction') {
        var iapi = window.YPDC.api;
        var payload = {
          name: data.name, email: data.email,
          department: data.department, semester: data.semester,
          program: (data.department || '') + ' · ' + (data.semester || ''),
          directorate: data.directorate, motivation: data.motivation
        };
        if (App.docValues) App.docValues(form || document, payload);
        if (App.docsMissing) {
          var missI = App.docsMissing(form || document);
          if (missI.length) { toast(App.docsHelp(missI)); return; }
        }
        if (iapi && iapi.available) {
          iapi.submitApplication(payload).then(function (r) {
            toast('Application submitted (ID: ' + r.id + ')', true);
            return iapi.refreshCounts().then(function (c) {
              if (c && S.inductionDrive) S.inductionDrive.received = c.applications;
              render();
            });
          }).catch(function (err) {
            toast(err.message || 'Application was not submitted');
          });
          return;
        }
        A.submitApplication(payload);
        var af = $('#app'); render();
        openModal({
          eyebrow: 'Application received', title: 'Thank you, ' + data.name + '!',
          sub: 'Your application was submitted to the YPDC database.',
          body: '<div class="grid g2"><div class="card card-tight"><span class="stat-label mut">Preferred directorate</span><b style="display:block">' + esc(data.directorate) + '</b></div>' +
            '<div class="card card-tight"><span class="stat-label mut">Batch</span><b style="display:block">' + esc(S.inductionDrive.batch) + '</b></div></div>' +
            '<div class="panel-note mt-16">Next steps: admin review → shortlisting → interview/assignment → notification in your portal.</div>' +
            '<div class="field mt-22" style="margin-bottom:0"><span>Applicant name</span><input value="' + esc(data.name) + '" readonly></div>',
          foot: '<a class="btn btn-outline" href="#/">Back to home</a><a class="btn btn-green" href="#/portal/admin/applications">See in admin database ' + I.arrow + '</a>'
        });
        return;
      }
      if (kind === 'contact') {
        toast('Message sent — the YPDC office will respond on ' + data.email, true);
        f.reset(); return;
      }
      if (kind === 'profile') {
        var pfApi = window.YPDC.api;
        var pfRole = data.roleKey || window.Portal.currentRole;
        if (pfApi && pfApi.available && S.session && S.session.api) {
          var pfBtn = f.querySelector('button[type="submit"]');
          var patch = {};
          ['name', 'phone', 'program', 'directorate', 'semester', 'reg', 'cgpa', 'city', 'dob', 'skills'].forEach(function (k) {
            if (data[k] !== undefined) patch[k] = data[k];
          });
          if (pfBtn) { pfBtn.disabled = true; pfBtn.textContent = 'Saving…'; }
          pfApi.updateMe(patch).then(function () {
            return pfApi.loadState();
          }).then(function (cols) {
            window.YPDC.loadFromServer(cols);
            toast('Profile saved to the server', true);
            render();
          }).catch(function (err) {
            if (pfBtn) { pfBtn.disabled = false; pfBtn.textContent = 'Save profile'; }
            toast(err.message || 'Profile was not saved');
          });
          return;
        }
        A.saveProfile(pfRole, data);
        toast('Profile updated');
        render(); return;
      }
      if (kind === 'event') {
        A.addEvent({
          title: data.title, date: data.date, time: data.time, location: data.location,
          category: data.category || 'General', organizer: data.organizer || 'YPDC UON',
          capacity: Number(data.capacity || 100), status: data.status || 'Upcoming',
          featured: data.featured === 'on', desc: data.desc || '', image: 'event-volunteers.jpg'
        });
        toast('Event published'); closeModal(); render(); return;
      }
      if (kind === 'task') {
        A.addTask({
          title: data.title, owner: data.owner, role: 'member', directorate: data.directorate || 'IT & Web Development',
          due: data.due || window.YPDC.today(), status: 'Pending', priority: data.priority || 'Medium'
        });
        toast('Task assigned'); closeModal(); render(); return;
      }
    });

    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-action]');
      if (!t) return;
      var a = t.getAttribute('data-action'), id = t.getAttribute('data-id'), go = t.getAttribute('data-go');
      switch (a) {
        case 'open-notifs': {
          var napi = window.YPDC.api;
          if (napi && napi.available && !napi.notifLoaded) {
            openDrawer();
            App.loadServerNotifs().then(function () { openDrawer(); });
            break;
          }
          openDrawer(); break;
        }
        case 'filter-srv': {
          App.srvFilterSet(t.getAttribute('data-cat') || 'all');
          openDrawer(); break;
        }
        case 'read-notif-srv': {
          var rapi2 = window.YPDC.api;
          t.disabled = true;
          rapi2.notifRead(t.getAttribute('data-nid')).then(function () {
            return App.loadServerNotifs();
          }).then(function () { openDrawer(); refreshUnreadBadge(); })
            .catch(function (e) { t.disabled = false; toast(e.message || 'Could not mark it as read'); });
          break;
        }
        case 'read-all-srv': {
          var rapi3 = window.YPDC.api;
          t.disabled = true;
          rapi3.notifReadAll().then(function () {
            (rapi3.notifCache || []).forEach(function (n) { n.read = true; });
            openDrawer(); refreshUnreadBadge(); toast('All notifications marked as read', true);
          }).catch(function (e) { t.disabled = false; toast(e.message || 'Could not update'); });
          break;
        }
        case 'del-announcement': {
          var aapi = window.YPDC.api;
          var aid = t.getAttribute('data-nid');
          var atitle = t.getAttribute('data-title') || 'this announcement';
          confirmDialog('Delete for everyone?', '“' + atitle + '” will be removed from every member’s notification list. The audit log keeps the record.', function () {
            aapi.adminAnnounceDelete(aid).then(function (r) {
              if (window.PC.adminAnnReload) window.PC.adminAnnReload();
              toast('Removed from ' + r.removed + ' account(s)', true);
              render();
            }).catch(function (e) { toast(e.message || 'Could not delete it'); });
          });
          break;
        }
        case 'del-notif-srv': {
          var rapi4 = window.YPDC.api;
          var nid = t.getAttribute('data-nid');
          confirmDialog('Delete this notification?', 'It disappears from your list only. Admins keep the audit record.', function () {
            rapi4.notifDelete(nid).then(function () {
              return App.loadServerNotifs();
            }).then(function () { openDrawer(); refreshUnreadBadge(); toast('Notification deleted', true); })
              .catch(function (e) { toast(e.message || 'Could not delete it'); });
          });
          break;
        }
        case 'close-drawer': closeDrawer(); break;
        case 'close-modal': closeModal(); break;
        case 'read-notif': A.markNotifRead(id); openDrawer(); break;
        case 'read-all': A.markAllNotifRead(); openDrawer(); toast('All notifications marked as read'); break;
        case 'filter-notif': {
          var g = t.getAttribute('data-group');
          $$('[data-action="filter-notif"]').forEach(function (b) { b.classList.remove('active'); });
          t.classList.add('active');
          var l = $('#notif-list'); if (l) l.innerHTML = notifList(g);
          break;
        }
        case 'toggle-mobile-nav': { var mn = $('#mobile-nav'); if (mn) mn.classList.toggle('show'); break; }
        case 'toggle-sidebar': { var sb = $('#portal-side'); if (sb) sb.classList.toggle('open'); var mk = $('#side-mask'); if (mk) mk.classList.toggle('open'); break; }
        case 'logout': {
          var lapi = window.YPDC.api;
          if (lapi && lapi.available && S.session && S.session.api) {
            lapi.logout().then(function () {
              A.logout(); toast('Signed out'); location.hash = '#/'; render();
            });
            break;
          }
          A.logout(); toast('Signed out'); location.hash = '#/'; render(); break;
        }
        case 'pick-role': location.hash = '#/login?role=' + t.getAttribute('data-role'); break;
        case 'goto': location.hash = go; break;
        case 'filter-events': location.hash = '#/events?cat=' + encodeURIComponent(t.getAttribute('data-cat')); break;
        case 'export-workplan': {
          var wCsv = window.PC.exportCsv;
          if (!wCsv) break;
          var wRows = [['Objective', 'Owner', 'Quarter', 'Progress %', 'Status']];
          (S.workplan || []).forEach(function (w) { wRows.push([w.objective, w.owner, w.quarter, w.progress, w.status]); });
          (S.objectives || []).forEach(function (o) { if (!S.workplan || !S.workplan.length) wRows.push([o.text, '', '', o.progress, '']); });
          toast(wCsv('ypdc-workplan', wRows) ? 'CSV download started' : 'No data', true);
          break;
        }
        case 'export-applications': {
          var eCsv = window.PC.exportCsv;
          if (!eCsv) break;
          var aRows = [['Name', 'Email', 'Program', 'Directorate', 'Date', 'Status', 'Motivation']];
          S.applications.forEach(function (a) {
            aRows.push([a.name, a.email, a.program, a.directorate, a.date, a.status, a.motivation || '']);
          });
          toast(eCsv('ypdc-applications', aRows) ? 'CSV download started' : 'Download fail', true);
          break;
        }
        case 'export-accounts': {
          var aCsv = window.PC.exportCsv;
          if (!aCsv) break;
          var acc = S.accounts || S.people || [];
          if (!acc.length) { toast('No account data (served by the server)'); break; }
          var rows2 = [['Name', 'Email', 'Role', 'Directorate', 'Program', 'Status', 'Last login']];
          acc.forEach(function (a) { rows2.push([a.name, a.email, a.role, a.directorate, a.program, a.status, a.lastLogin || '']); });
          toast(aCsv('ypdc-accounts', rows2) ? 'Accounts CSV download started' : 'Download fail', true);
          break;
        }
        case 'export-all': {
          var eJson = window.PC.exportJson;
          if (!eJson) break;
          var snap = {
            exportedAt: new Date().toISOString(),
            server: window.YPDC.api && window.YPDC.api.available ? 'live' : 'offline',
            counts: (window.YPDC.api && window.YPDC.api.counts) || null,
            data: {
              people: S.people, directorates: S.directorates, events: S.events, applications: S.applications,
              registrations: S.registrations, feedback: S.feedback, tasks: S.tasks, cabinet: S.cabinet,
              highlights: S.highlights, news: S.news, certificates: S.certificates, activityLog: S.activityLog
            }
          };
          toast(eJson('ypdc-backup', snap) ? 'JSON backup download started' : 'Download fail', true);
          break;
        }
        case 'refresh-permissions': {
          var pApi = window.YPDC.api;
          if (!pApi || !pApi.available) { toast('Backend is offline'); break; }
          t.disabled = true; t.textContent = 'Refreshing\u2026';
          pApi.adminPermissions().then(function (p) {
            window.YPDC.adminPerm = p;
            toast('Permissions refreshed', true);
            render();
          }).catch(function (err) { toast(err.message || 'Refresh fail'); });
          break;
        }

        case 'auth-tab': {
        window.__authTab = t.getAttribute('data-tab') === 'signup' ? 'signup' : 'signin';
        render();
        break;
      }
      case 'msg-tab': {
          if (window.PC.MSG) { window.PC.MSG.state.tab = t.getAttribute('data-tab'); window.PC.MSG.state.openId = null; render(); }
          break;
        }
        case 'msg-refresh': {
          if (window.PC.MSG) {
            t.disabled = true;
            window.PC.MSG.state.cache = null;
            window.PC.MSG.load(true);
            setTimeout(function () { t.disabled = false; }, 1200);
          }
          break;
        }
        case 'msg-new': if (window.PC.MSG) window.PC.MSG.openCompose(null, null); break;
        case 'msg-open': {
          var mOpen = window.PC.MSG;
          if (!mOpen) break;
          var mid = t.getAttribute('data-id');
          var mall = (mOpen.state.cache ? mOpen.state.cache.inbox.concat(mOpen.state.cache.sent) : []);
          var mrow = mall.filter(function (x) { return x.id === mid; })[0];
          mOpen.state.openId = mid;
          if (mrow && mrow.direction === 'received' && !mrow.read) {
            var mrapi = window.YPDC.api;
            if (mrapi && mrapi.available) {
              mrapi.readMessage(mid).then(function () {
                mrow.read = true;
                if (mOpen.state.cache && mOpen.state.cache.unread > 0) mOpen.state.cache.unread--;
                mrapi.msgUnread = (mOpen.state.cache || {}).unread || 0;
                render();
              }).catch(function () { render(); });
              break;
            }
          }
          render();
          break;
        }
        case 'msg-close': if (window.PC.MSG) { window.PC.MSG.state.openId = null; render(); } break;
        case 'msg-reply': {
          var mRep = window.PC.MSG;
          if (!mRep) break;
          var rid2 = t.getAttribute('data-id');
          var rall = (mRep.state.cache ? mRep.state.cache.inbox.concat(mRep.state.cache.sent) : []);
          var rrow = rall.filter(function (x) { return x.id === rid2; })[0];
          if (rrow) mRep.openCompose(rrow.direction === 'received' ? rrow.from.id : rrow.to.id, rrow.direction === 'received' ? rrow : null);
          break;
        }
        case 'msg-delete': {
          var mDel = window.PC.MSG;
          var dapi = window.YPDC.api;
          if (!mDel || !dapi || !dapi.available) break;
          var did = t.getAttribute('data-id');
          if (!confirm('Delete this message?')) break;
          dapi.deleteMessage(did).then(function () {
            mDel.state.openId = null;
            mDel.state.cache = null;
            mDel.load(true);
            toast('Message deleted', true);
          }).catch(function (e) { toast(e.message || 'Delete failed'); });
          break;
        }
        case 'refresh-data': {
          var rdapi = window.YPDC.api;
          if (!rdapi || !rdapi.available) { toast('Backend is offline'); break; }
          t.disabled = true; t.textContent = 'Refreshing\u2026';
          Promise.all([rdapi.loadState(), rdapi.refreshCounts()]).then(function (r) {
            window.YPDC.loadFromServer(r[0]);
            toast('Fresh data loaded from the server', true);
            render();
          }).catch(function (err) { t.disabled = false; t.textContent = 'Refresh data'; toast(err.message || 'Refresh fail'); });
          break;
        }
        case 'refresh-emails': {
          var eapi = window.YPDC.api;
          if (eapi && eapi.available) {
            t.disabled = true; t.textContent = 'Refreshing\u2026';
            eapi.adminEmails(80).then(function () {
              if (window.PC.adminMailReload) window.PC.adminMailReload();
              t.disabled = false; t.textContent = 'Refresh';
              toast('Outbox refreshed', true); render();
            }).catch(function (err) { t.disabled = false; t.textContent = 'Refresh'; toast(err.message || 'Refresh fail'); });
            break;
          }
        }
        case 'refresh-audit': {
          var rapi = window.YPDC.api;
          if (rapi && rapi.available) {
            t.disabled = true; t.textContent = 'Refreshing\u2026';
            rapi.adminAudit(40).then(function () { toast('Audit log refreshed', true); render(); })
              .catch(function (err) { t.disabled = false; t.textContent = 'Refresh'; toast(err.message || 'Refresh fail'); });
            break;
          }
          render(); break;
        }
        case 'charts-refresh': {
          var ch = window.PC && window.PC.adminCharts;
          if (!ch) break;
          t.disabled = true; t.textContent = 'Refreshing\u2026';
          ch.load().then(function () { t.disabled = false; t.textContent = 'Refresh'; });
          break;
        }
        case 'charts-range': {
          var cr = window.PC && window.PC.adminCharts;
          if (!cr) break;
          cr.setMonths(Number(t.getAttribute('data-months')) || 6);
          break;
        }
        case 'log-apply': {
          var dl = adminData(); if (!dl) break;
          readFilters(dl.logQ); dl.logQ.page = 1;
          t.disabled = true; t.textContent = 'Loading\u2026';
          dl.loadAudit().then(function () { t.disabled = false; t.textContent = 'Apply filters'; });
          break;
        }
        case 'log-reset': {
          var dlr = adminData(); if (!dlr) break;
          ['q', 'role', 'action', 'status', 'from', 'to'].forEach(function (k) { dlr.logQ[k] = ''; });
          dlr.logQ.page = 1; dlr.logQ.perPage = 25;
          dlr.loadAudit(); break;
        }
        case 'log-page': {
          var dlp = adminData(); if (!dlp) break;
          dlp.logQ.page = Number(t.getAttribute('data-page')) || 1;
          dlp.loadAudit(); break;
        }
        case 'users-apply': {
          var du = adminData(); if (!du) break;
          readFilters(du.usersQ); du.usersQ.page = 1;
          t.disabled = true; t.textContent = 'Loading\u2026';
          du.loadUsers().then(function () { t.disabled = false; t.textContent = 'Apply filters'; });
          break;
        }
        case 'users-reset': {
          var dur = adminData(); if (!dur) break;
          ['q', 'role', 'state'].forEach(function (k) { dur.usersQ[k] = ''; });
          dur.usersQ.page = 1; dur.usersQ.perPage = 15;
          dur.loadUsers(); break;
        }
        case 'users-page': {
          var dup = adminData(); if (!dup) break;
          dup.usersQ.page = Number(t.getAttribute('data-page')) || 1;
          dup.loadUsers(); break;
        }
        case 'user-open': { closeModal(); openModalUser(id); break; }
        case 'user-role': { closeModal(); openUserRole(id); break; }
        case 'user-role-save': {
          var uapi = window.YPDC.api;
          var sel = document.getElementById('user-role-select');
          if (!uapi || !uapi.available || !sel) break;
          t.disabled = true; t.textContent = 'Saving\u2026';
          uapi.adminUpdateUser(id, { role: sel.value }).then(function () {
            toast('Role updated', true); closeModal(); render(); return refreshUsers();
          }).catch(function (err) { t.disabled = false; t.textContent = 'Save role'; toast(err.message || 'Role change failed'); });
          break;
        }
        case 'user-status': {
          var suapi = window.YPDC.api;
          var want = t.getAttribute('data-status');
          if (!suapi || !suapi.available) break;
          var verb = want === 'active' ? 'Activate' : 'Deactivate';
          confirmDialog(verb + ' this account?', want === 'active'
            ? 'The person will be able to log in again.'
            : 'The person is signed out everywhere and cannot log in until you activate the account again.', function () {
            t.disabled = true; t.textContent = 'Saving\u2026';
            suapi.adminUpdateUser(id, { is_active: want === 'active' }).then(function () {
              toast('Account ' + (want === 'active' ? 'activated' : 'deactivated'), true);
              closeModal(); render(); return refreshUsers();
            }).catch(function (err) { t.disabled = false; t.textContent = verb; toast(err.message || 'Update failed'); });
          });
          break;
        }
        case 'user-reset-access': {
          var rapi2 = window.YPDC.api;
          if (!rapi2 || !rapi2.available) break;
          confirmDialog('Reset access for this user?', 'Every session is signed out and a single-use password link (valid for a short time) is emailed. The link only works once.', function () {
            t.disabled = true; t.textContent = 'Sending\u2026';
            rapi2.adminResetAccess(id, { email: true }).then(function (r) {
              toast('Reset link sent · ' + r.minutes + ' min', true);
              if (r.devLink) { window.__lastResetLink = r.devLink; }
              closeModal(); render();
            }).catch(function (err) { t.disabled = false; t.textContent = 'Reset access'; toast(err.message || 'Reset failed'); });
          });
          break;
        }
        case 'user-revoke': {
          var vapi = window.YPDC.api;
          if (!vapi || !vapi.available) break;
          confirmDialog('Sign this user out everywhere?', 'Every device must log in again. The password stays the same.', function () {
            t.disabled = true; t.textContent = 'Working\u2026';
            vapi.adminRevokeSessions(id).then(function () {
              toast('All sessions signed out', true); closeModal(); render();
            }).catch(function (err) { t.disabled = false; t.textContent = 'Sign out everywhere'; toast(err.message || 'Action failed'); });
          });
          break;
        }
        case 'user-delete': {
          var dapi = window.YPDC.api;
          if (!dapi || !dapi.available) break;
          confirmDialog('Delete this account permanently?', 'The account and its messages are removed. This cannot be undone. The audit log keeps the record of the deletion.', function () {
            t.disabled = true; t.textContent = 'Deleting\u2026';
            dapi.adminDeleteUser(id).then(function () {
              toast('Account deleted', true); removeUserRow(id); closeModal(); render(); return refreshUsers();
            }).catch(function (err) { t.disabled = false; t.textContent = 'Delete account'; toast(err.message || 'Delete failed'); });
          });
          break;
        }
        case 'confirm-duty': {
          var duty = (S.duties || []).filter(function (x) { return x.id === id; })[0];
          if (!duty) break;
          if (duty.confirmed) { toast('Availability already confirmed'); break; }
          duty.confirmed = true;
          duty.status = 'Confirmed';
          t.disabled = true;
          t.textContent = 'Confirmed';
          flushServer(['duties'], 'Availability confirmed — the directorate can see it');
          break;
        }
        case 'submit-report': {
          var rta = document.getElementById('report-text');
          var rtext = rta ? rta.value.trim() : '';
          if (rtext.length < 10) { toast('Please write at least 10 characters before submitting'); break; }
          var ruser = (S.session && S.session.user) || {};
          S.reports.unshift({
            id: 'r-' + Date.now().toString(36),
            title: rtext.split('\n')[0].slice(0, 64),
            period: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
            by: ruser.name || 'Member',
            date: new Date().toISOString().slice(0, 10),
            status: 'Submitted',
            body: rtext
          });
          if (rta) rta.value = '';
          t.disabled = true;
          flushServer(['reports'], 'Duty report submitted to your directorate');
          break;
        }
        case 'save-skills': {
          var sk = document.getElementById('skill-input');
          var skill = sk ? sk.value.trim() : '';
          if (skill.length < 2) { toast('Please enter a skill first'); break; }
          var skApi = window.YPDC.api;
          if (!skApi || !skApi.available) { toast('The server is offline — sign in again to save skills'); break; }
          var skProfile = (S.profiles && S.profiles[S.session.role]) || {};
          var skList = String(skProfile.skills || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
          if (skList.indexOf(skill) === -1) skList.push(skill);
          skApi.updateMe({ skills: skList.join(', ') }).then(function () {
            return skApi.loadState();
          }).then(function (cols) {
            window.YPDC.loadFromServer(cols);
            toast('Skill saved to your profile', true);
            render();
          }).catch(function (err) { toast(err.message || 'Skill was not saved'); });
          break;
        }
        case 'ask-mentorship': {
          var amName = t.getAttribute('data-name') || 'Alumni';
          var amMe = (S.session && S.session.user) || {};
          S.mentorship.unshift({
            id: 'm-' + Date.now().toString(36),
            student: amName,
            program: 'Alumni network',
            topic: 'Mentorship requested by ' + (amMe.name || 'you'),
            date: new Date().toISOString().slice(0, 10),
            status: 'Requested'
          });
          t.disabled = true;
          flushServer(['mentorship'], 'Mentorship request sent to ' + amName);
          break;
        }
        case 'mentor-status': {
          var msRec = (S.mentorship || []).filter(function (x) { return x.id === id; })[0];
          if (!msRec) break;
          msRec.status = t.getAttribute('data-status') || 'Completed';
          t.disabled = true;
          flushServer(['mentorship'], 'Mentorship marked ' + msRec.status.toLowerCase());
          break;
        }
        case 'apply-career': {
          var jTitle = t.getAttribute('data-title') || 'this position';
          var job = (S.careers || []).filter(function (x) { return x.title === jTitle; })[0];
          var jUser = (S.session && S.session.user) || {};
          if (job) {
            job.applicants = (job.applicants || []).concat([{ name: jUser.name || 'Alumni', date: new Date().toISOString().slice(0, 10) }]);
          }
          t.disabled = true;
          t.textContent = 'Application sent';
          flushServer(['careers'], 'Your application for ' + jTitle + ' was recorded with YPDC');
          break;
        }
        case 'portal-pick': pickPortal(t.getAttribute('data-role')); e.preventDefault(); break;
        case 'open-chat': if (window.Chatbot) { window.Chatbot.open(); } break;
        case 'register-event': openRegisterModal(id); break;
        case 'cancel-registration': A.cancelRegistration(id); toast('Registration cancelled'); render(); break;
        case 'subscribe-news': {
          var em = $('#news-sub-email');
          if (em && em.value) { toast('Subscribed: ' + em.value, true); em.value = ''; } else { toast('Please enter your email first'); }
          break;
        }
        case 'quick-interest': {
          var n = $('#quick-name'), em2 = $('#quick-email');
          if (n && n.value && em2 && em2.value) {
            A.submitApplication({ name: n.value, email: em2.value, program: '— · —', directorate: S.directorates[0].name, motivation: 'Requested application link from membership page.' });
            toast('Application link sent to ' + em2.value, true); n.value = ''; em2.value = '';
          } else { toast('Please enter name and email'); }
          break;
        }
        case 'view-certificate': openCertificateModal(id); break;
        case 'task-status': A.toggleTask(id, t.getAttribute('data-status')); render(); break;
        case 'proposal-status': A.setProposalStatus(id, t.getAttribute('data-status')); toast('Proposal ' + t.getAttribute('data-status').toLowerCase()); render(); break;
        case 'activity-status': A.setActivityStatus(id, t.getAttribute('data-status')); toast('Activity ' + t.getAttribute('data-status').toLowerCase()); render(); break;
        case 'app-status': {
          var newStatus = t.getAttribute('data-status');
          var sapi = window.YPDC.api;
          if (sapi && sapi.available) {
            t.disabled = true;
            sapi.adminDecideApplication(id, newStatus).then(function () {
              return sapi.loadState();
            }).then(function (cols) {
              window.YPDC.loadFromServer(cols);
              toast('Application ' + newStatus.toLowerCase() + ' (saved to the database)', true);
              render();
            }).catch(function (err) {
              t.disabled = false;
              toast(err.message || 'Status was not updated');
            });
            break;
          }
          A.setApplicationStatus(id, newStatus);
          toast('Application ' + newStatus.toLowerCase());
          render();
          break;
        }
        case 'app-assign': openAssignModal(id); break;
        case 'person-status': {
          var pStatus = t.getAttribute('data-status');
          var papi = window.YPDC.api;
          if (papi && papi.available && papi.user && papi.user.id === id) {
            toast('You cannot deactivate your own account');
            break;
          }
          if (papi && papi.available && /^u[-_]/.test(id)) {
            t.disabled = true;
            papi.adminUpdateUser(id, { is_active: pStatus === 'Active' }).then(function () {
              return papi.loadState();
            }).then(function (cols) {
              window.YPDC.loadFromServer(cols);
              toast('Account ' + (pStatus === 'Active' ? 'activate' : 'deactivate') + 'd', true);
              render();
            }).catch(function (err) {
              t.disabled = false;
              toast(err.message || 'Update failed');
            });
            break;
          }
          A.setPersonStatus(id, pStatus); render(); break;
        }
        case 'person-role': openRoleModal(id); break;
        case 'shaheen-toggle': {
          var shApi = window.YPDC.api;
          var cur = (window.App.shaheenState && window.App.shaheenState.data && window.App.shaheenState.data.settings) || S.shaheen || {};
          if (!shApi || !shApi.available) { toast('Backend is offline'); break; }
          t.disabled = true;
          shApi.shaheenSettings({ open: !cur.open }).then(function (r) {
            if (S.shaheen) S.shaheen.open = r.settings.open;
            toast('Bano Shaheen registration is now ' + (r.settings.open ? 'OPEN' : 'CLOSED'), true);
            return window.App.shaheenLoad(true);
          }).then(function () { render(); }).catch(function (e) { t.disabled = false; toast(e.message || 'Could not change the setting'); });
          break;
        }
        case 'shaheen-save-settings': {
          var shApi2 = window.YPDC.api;
          if (!shApi2 || !shApi2.available) { toast('Backend is offline'); break; }
          var batchEl = $('#shaheen-batch'), seatsEl = $('#shaheen-seats'), msgEl = $('#shaheen-message');
          t.disabled = true;
          shApi2.shaheenSettings({
            batch: batchEl ? batchEl.value : undefined,
            seats: seatsEl ? Number(seatsEl.value) : undefined,
            message: msgEl ? msgEl.value : undefined
          }).then(function (r) {
            if (S.shaheen) { S.shaheen.batch = r.settings.batch; S.shaheen.seats = r.settings.seats; S.shaheen.message = r.settings.message; }
            toast('Bano Shaheen settings saved', true);
            return window.App.shaheenLoad(true);
          }).then(function () { render(); }).catch(function (e) { t.disabled = false; toast(e.message || 'Could not save the settings'); });
          break;
        }
        case 'shaheen-save-roster': {
          var shApi3 = window.YPDC.api;
          if (!shApi3 || !shApi3.available) { toast('Backend is offline'); break; }
          var ta = $('#shaheen-roster');
          var list = String(ta ? ta.value : '').split('\n').map(function (line) {
            var parts = line.split(',').map(function (x) { return x.trim(); });
            if (!parts[0]) return null;
            if (parts[0].indexOf('@') > -1) return { name: '', email: parts[0].toLowerCase(), note: parts[1] || '' };
            return { name: parts[0], email: (parts[1] || '').toLowerCase(), note: parts[2] || '' };
          }).filter(Boolean);
          t.disabled = true;
          shApi3.shaheenRoster(list).then(function () {
            toast('Bano Shaheen list saved — ' + list.length + ' expected members', true);
            return window.App.shaheenLoad(true);
          }).then(function () { render(); }).catch(function (e) { t.disabled = false; toast(e.message || 'Could not save the list'); });
          break;
        }
        case 'shaheen-approve': {
          var shApi4 = window.YPDC.api;
          if (!shApi4 || !shApi4.available) { toast('Backend is offline'); break; }
          t.disabled = true; t.textContent = 'Approving…';
          shApi4.shaheenApprove(id).then(function (r) {
            toast(r.account === 'linked' ? 'Approved — linked to the existing YPDC account' : 'Approved — new volunteer account created', true);
            return window.App.shaheenLoad(true);
          }).then(function () { render(); }).catch(function (e) { t.disabled = false; t.textContent = 'Approve'; toast(e.message || 'Approve failed'); });
          break;
        }
        case 'shaheen-reject': {
          var shApi5 = window.YPDC.api;
          if (!shApi5 || !shApi5.available) { toast('Backend is offline'); break; }
          t.disabled = true;
          shApi5.shaheenReject(id).then(function () {
            toast('Registration rejected');
            return window.App.shaheenLoad(true);
          }).then(function () { render(); }).catch(function (e) { t.disabled = false; toast(e.message || 'Reject failed'); });
          break;
        }
        case 'shaheen-delete': {
          var shApi6 = window.YPDC.api;
          if (!shApi6 || !shApi6.available) { toast('Backend is offline'); break; }
          t.disabled = true;
          shApi6.shaheenDelete(id).then(function () {
            toast('Registration removed');
            return window.App.shaheenLoad(true);
          }).then(function () { render(); }).catch(function (e) { t.disabled = false; toast(e.message || 'Delete failed'); });
          break;
        }
        case 'team-leader-form': (App.Team || {}).openTeamLeaderForm && App.Team.openTeamLeaderForm(); break;
        case 'team-dir-retry': (App.Team || {}).loadDirectory && App.Team.loadDirectory(); break;
        case 'join-team-form': (App.Team || {}).openJoinTeamForm && App.Team.openJoinTeamForm(t.getAttribute('data-id')); break;
        case 'team-preview': (App.Team || {}).openTeamPreview && App.Team.openTeamPreview(id); break;
        case 'add-event': openEventModal(); break;
        case 'edit-event': openEditEventModal(id); break;
        case 'del-event': {
          var dTitle = t.getAttribute('data-title') || (S.events.filter(function (x) { return x.id === id; })[0] || {}).title || 'this event';
          confirmDialog('Delete this event?', '“' + dTitle + '” will be removed from the calendar, the public site and the admin list. Registrations for it are cleared too. This cannot be undone.', function () {
            closeModal();
            A.deleteEvent(id);
            toast('Event deleted', true);
            render();
          });
          break;
        }
        case 'cal-prev': {
          var cs = PC().calState();
          cs.ym = PC().shiftMonth(cs.ym, -1); render(); break;
        }
        case 'cal-next': {
          var cs2 = PC().calState();
          cs2.ym = PC().shiftMonth(cs2.ym, 1); render(); break;
        }
        case 'cal-today': {
          var d0 = new Date();
          PC().calState().ym = d0.getFullYear() + '-' + String(d0.getMonth() + 1).padStart(2, '0');
          render(); break;
        }
        case 'cal-open': openEventDetail(id); break;
        case 'cal-day': {
          var day = t.getAttribute('data-day');
          var list = (S.events || []).filter(function (e) { return e.date === day; });
          openModal({
            eyebrow: 'Events on this day', title: PC().monthName(day.slice(0, 7)).replace(/ (\d{4})$/, ' $1') + ' · ' + day.slice(8),
            body: '<div class="cal-agenda">' + list.map(function (e) {
              return '<div class="cal-agenda-row"><span class="cal-agenda-date">' + esc(e.time || '') + '</span>' +
                '<div class="txt"><b>' + esc(e.title) + '</b><small>' + esc(e.venue || e.location || '') + ' · ' + esc(e.status || '') + '</small></div>' +
                '<button class="btn btn-xs btn-green" data-action="cal-open" data-id="' + esc(e.id) + '">Open</button></div>';
            }).join('') + '</div>',
            foot: '<button class="btn btn-outline" data-action="close-modal">Close</button>'
          });
          break;
        }
        case 'add-task': openTaskModal(); break;
        case 'add-person': openPersonModal(); break;
        case 'save-cabinet': saveCabinetEditor(); break;
        case 'add-cabinet': openCabinetModal(); break;
        case 'toggle-dir-status': A.setDirectorateStatus(id, t.getAttribute('data-status')); render(); break;
        case 'highlight-status': A.saveHighlight(id, { status: t.getAttribute('data-status') }); toast('Highlight ' + t.getAttribute('data-status')); render(); break;
        case 'view-doc':
          (function () {
            var src = t.getAttribute('data-src'), ttl = t.getAttribute('data-title') || 'Document';
            openModal({
              eyebrow: 'Registration document', title: ttl,
              body: '<div class="doc-view"><img src="' + esc(src) + '" alt="' + esc(ttl) + '"></div>' +
                '<div class="btn-row mt-16" style="justify-content:center"><a class="btn btn-outline btn-sm" href="' + esc(src) + '" target="_blank" rel="noopener">Open full size</a></div>',
              foot: '<button class="btn btn-outline" data-action="close-modal">Close</button>'
            });
          })(); break;
        case 'edit-content': openContentModal(t.getAttribute('data-key')); break;
        case 'popup-toggle':
          S.site.popup = S.site.popup || App.popupDefaults();
          S.site.popup.enabled = !S.site.popup.enabled;
          A.save(); toast(S.site.popup.enabled ? 'Popup notice is now visible on the website' : 'Popup notice hidden'); render(); break;
        case 'popup-preview':
          S.site.popup = S.site.popup || App.popupDefaults();
          S.site.popup.enabled = true;
          App.showPopupNotice(true); break;
        case 'pick-photo': window.App.openPhotoModal(t.getAttribute('data-kind')); break;
        case 'reset-photo': resetPhoto(t.getAttribute('data-kind')); break;
        case 'remove-gallery': removeGalleryPhoto(Number(t.getAttribute('data-index'))); break;
        case 'publish-news': openNewsModal(); break;
        case 'reply-feedback': A.replyFeedback(id); toast('Marked as responded'); render(); break;
        case 'add-proposal': openProposalModal(); break;
        case 'issue-certificate': openCertificateIssueModal(); break;
        case 'apply-volunteer': A.applyVolunteer({ drive: t.getAttribute('data-drive'), role: t.getAttribute('data-role'), hours: 0, status: 'Requested', date: window.YPDC.today() }); toast('Volunteer request sent'); render(); break;
        case 'request-mentorship': openMentorshipModal(); break;
        default: break;
      }
    });
  }

    document.addEventListener('click', function (e) {
      var send = e.target.closest ? e.target.closest('#compose-send') : null;
      if (!send) return;
      var form = document.querySelector('[data-form="compose"]');
      var msgEl = document.getElementById('compose-msg');
      var api = window.YPDC.api;
      if (!form || !api || !api.available) { if (msgEl) msgEl.textContent = 'Server is offline.'; return; }
      var to = (form.querySelector('[name="to"]') || {}).value || '';
      var subject = (form.querySelector('[name="subject"]') || {}).value || '';
      var body = (form.querySelector('[name="body"]') || {}).value || '';
      if (!to || !subject.trim() || !body.trim()) {
        if (msgEl) msgEl.textContent = 'Fill in recipient, subject and message.';
        return;
      }
      send.disabled = true;
      send.textContent = 'Sending\u2026';
      api.sendMessage(to, subject.trim(), body.trim()).then(function () {
        closeModal();
        toast('Message sent', true);
        if (window.PC.MSG) window.PC.MSG.afterSend();
        render();
      }).catch(function (err) {
        send.disabled = false;
        send.textContent = 'Send message';
        if (msgEl) msgEl.textContent = err.message || 'Message could not be sent.';
      });
    }, true);

  var SH = { data: null, loading: false };
  function shaheenLoad(force) {
    var api = window.YPDC.api;
    if (!api || !api.available) return Promise.resolve(null);
    if (SH.loading) return Promise.resolve(SH.data);
    if (SH.data && !force) return Promise.resolve(SH.data);
    SH.loading = true;
    return api.shaheenPanel().then(function (d) {
      SH.data = d; SH.loading = false;
      return d;
    }).catch(function (e) {
      SH.loading = false;
      if (e && e.status === 403) toast('Admin only');
      return null;
    });
  }
  App.shaheenState = SH;
  App.shaheenLoad = shaheenLoad;

  App.refreshUnreadBadge = refreshUnreadBadge;
  App.bindGlobal = bindGlobal;
})();

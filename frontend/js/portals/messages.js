(function () {
  'use strict';
  var PC = window.PC;
  var S = PC.S, A = PC.A, esc = PC.esc, fmt = PC.fmt, I = PC.I, ini = PC.ini;
  var pageHead = PC.pageHead, table = PC.table, statusBadge = PC.statusBadge;

  var M = {
    tab: 'inbox',
    cache: null,
    dir: null,
    error: null,
    openId: null,
    loading: false
  };

  function repaint() {
    if (window.App && window.App.render && location.hash.indexOf('messages') > -1) window.App.render();
  }

  function load(force) {
    var api = window.YPDC.api;
    if (!api || !api.available || M.loading) return;
    if (M.cache && !force) return;
    M.loading = true;
    api.messages().then(function (d) {
      M.cache = d;
      M.error = null;
      api.msgUnread = d.unread;
      M.loading = false;
      repaint();
    }).catch(function (e) {
      M.error = e.message;
      M.loading = false;
      repaint();
    });
  }

  function loadDirectory() {
    var api = window.YPDC.api;
    if (!api || !api.available) return;
    if (M.dir) return;
    api.directory().then(function (d) { M.dir = d.users || []; repaint(); })
      .catch(function () { M.dir = []; repaint(); });
  }

  function when(iso) {
    if (!iso) return '';
    var s = String(iso).replace('T', ' ');
    return s.slice(0, 16);
  }

  function shortBody(text) {
    return String(text || '').replace(/\s+/g, ' ').slice(0, 90);
  }

  function openCompose(toId, replyOf) {
    var api = window.YPDC.api;
    if (!api || !api.available) {
      App.openModal({
        eyebrow: 'Messages', title: 'Backend required',
        sub: 'Messages are saved in the server database. Messaging does not work while the server is offline.',
        body: '<div class="panel-note">Once the server is running: <code>npm start</code></div>',
        foot: '<button class="btn btn-outline" data-action="close-modal">Close</button>'
      });
      return;
    }
    if (!M.dir) {
      App.openModal({
        eyebrow: 'New message', title: 'Loading recipients\u2026',
        sub: 'Fetching the list of YPDC accounts from the server.',
        body: '<div class="panel-note">One moment\u2026</div>',
        foot: '<button class="btn btn-outline" data-action="close-modal">Cancel</button>'
      });
      api.directory().then(function (d) {
        M.dir = d.users || [];
        openCompose(toId, replyOf);
      }).catch(function (e) {
        App.openModal({
          eyebrow: 'New message', title: 'No recipients found',
          sub: e.message || 'The directory could not be loaded.',
          body: '<div class="panel-note">Log in again or refresh the page.</div>',
          foot: '<button class="btn btn-outline" data-action="close-modal">Close</button>'
        });
      });
      return;
    }
    var list = M.dir || [];
    var options = list.map(function (u) {
      return '<option value="' + esc(u.id) + '"' + (u.id === toId ? ' selected' : '') + '>' +
        esc(u.name) + ' — ' + esc(u.role) + (u.directorate ? ' · ' + esc(u.directorate) : '') + '</option>';
    }).join('');
    if (!options) options = '<option value="">(no other account available)</option>';
    App.openModal({
      eyebrow: 'New message',
      title: replyOf ? 'Reply' : 'New message',
      sub: replyOf ? ('Reply → ' + replyOf.from.name) : 'Send a message directly to any YPDC account.',
      body: '<form data-form="compose">' +
        '<label class="field mt-10"><span>Recipient</span><select name="to"' + (replyOf ? ' disabled' : '') + '>' + options + '</select></label>' +
        (replyOf ? '<input type="hidden" name="to" value="' + esc(replyOf.from.id) + '">' : '') +
        '<label class="field"><span>Subject</span><input name="subject" value="' + (replyOf ? 'Re: ' + esc(replyOf.subject) : '') + '" maxlength="120" required></label>' +
        '<label class="field"><span>Message</span><textarea name="body" rows="5" maxlength="4000" required>' + (replyOf ? '\n\n--- ' + esc(replyOf.from.name) + ' wrote: ' + esc(shortBody(replyOf.body)) : '') + '</textarea></label>' +
        '<div id="compose-msg" class="panel-note mt-10">The message is saved in the server database and appears in the recipient\'s inbox.</div>' +
        '</form>',
      foot: '<button class="btn btn-outline" data-action="close-modal">Cancel</button>' +
        '<button class="btn btn-green" id="compose-send">Send message ' + I.arrow + '</button>'
    });
  }

  function section() {
    var api = window.YPDC.api;
    if (!api || !api.available) {
      return pageHead('Messages', 'Messages', 'The server must be running for real messaging.') +
        '<section class="panel"><div class="panel-body"><b>Backend is offline</b>' +
        '<p class="mut mt-6" style="font-size:.9rem">Messages are saved in the database. This section works once the server is running ' +
        '(<code>cd backend/server &amp;&amp; npm start</code>).</p></div></section>';
    }

    load(false);

    if (!M.cache && !M.error) {
      return pageHead('Messages', 'Messages', 'Loading\u2026') +
        '<section class="panel"><div class="panel-body">Loading messages from the server\u2026</div></section>';
    }
    if (M.error) {
      return pageHead('Messages', 'Messages', 'Messages could not be loaded.') +
        '<section class="panel"><div class="panel-body"><b style="color:var(--danger)">' + esc(M.error) + '</b>' +
        '<div class="btn-row mt-16"><button class="btn btn-outline btn-sm" data-action="msg-refresh">Try again</button></div></div></section>';
    }

    var d = M.cache;
    var list = M.tab === 'sent' ? d.sent : d.inbox;
    var unread = d.unread || 0;

    var detail = '';
    if (M.openId) {
      var all = d.inbox.concat(d.sent);
      var one = all.filter(function (m) { return m.id === M.openId; })[0];
      if (one) {
        detail = '<section class="panel mt-22" style="border-color:var(--gold-line)">' +
          '<div class="panel-head"><div><span class="eyebrow">' + (one.direction === 'received' ? 'Received' : 'Sent') + '</span>' +
          '<h3 class="mt-6">' + esc(one.subject) + '</h3></div>' + statusBadge(one.read ? 'Read' : 'Unread') + '</div>' +
          '<div class="panel-body">' +
          '<div class="list-row" style="border:0"><span class="av">' + ini(one.direction === 'received' ? one.from.name : one.to.name) + '</span>' +
          '<div class="txt"><b>' + esc(one.direction === 'received' ? one.from.name : one.to.name) + '</b>' +
          '<small>' + esc(one.direction === 'received' ? (one.from.role || '') : 'recipient') + ' · ' + when(one.created_at) + '</small></div></div>' +
          '<p class="mt-16" style="white-space:pre-wrap;color:var(--body)">' + esc(one.body) + '</p>' +
          '<div class="btn-row mt-22">' +
          (one.direction === 'received' ? '<button class="btn btn-green btn-sm" data-action="msg-reply" data-id="' + esc(one.id) + '">Reply</button>' : '') +
          '<button class="btn btn-outline btn-sm" data-action="msg-close">Close</button>' +
          '<button class="btn btn-quiet btn-sm" data-action="msg-delete" data-id="' + esc(one.id) + '">Delete</button>' +
          '</div></div></section>';
      }
    }

    return pageHead('Messages', 'Messages',
        unread ? (unread + ' unread message' + (unread > 1 ? 's' : '')) : 'All messages have been read.',
        '<button class="btn btn-outline btn-sm" data-action="msg-refresh">Refresh</button>' +
        '<button class="btn btn-green btn-sm" data-action="msg-new">+ New message</button>') +
      '<section class="panel"><div class="chip-row mb-16">' +
        '<button class="chip' + (M.tab === 'inbox' ? ' active' : '') + '" data-action="msg-tab" data-tab="inbox">Inbox (' + d.inbox.length + ')</button>' +
        '<button class="chip' + (M.tab === 'sent' ? ' active' : '') + '" data-action="msg-tab" data-tab="sent">Sent (' + d.sent.length + ')</button>' +
      '</div>' +
      '<div class="panel-body" style="padding-top:0">' +
      (list.length
        ? table(['From / To', 'Subject', 'Message', 'When', ''], list.map(function (m) {
            var other = m.direction === 'received' ? m.from : m.to;
            return [
              '<b>' + esc(other.name) + '</b>' + (other.role ? '<div class="mut" style="font-size:.78rem">' + esc(other.role) + '</div>' : ''),
              '<b>' + esc(m.subject) + '</b>',
              '<span class="mut">' + esc(shortBody(m.body)) + '</span>',
              when(m.created_at) + (m.direction === 'received' && !m.read ? ' <span class="badge badge-warn">new</span>' : ''),
              '<button class="btn btn-xs btn-quiet" data-action="msg-open" data-id="' + esc(m.id) + '">Open</button>' +
              '<button class="btn btn-xs btn-danger" data-action="msg-delete" data-id="' + esc(m.id) + '">Delete</button>'
            ];
          }))
        : '<div class="empty-block"><b>No messages yet</b>' +
          '<p class="mut mt-6" style="font-size:.9rem">' + (M.tab === 'sent'
            ? 'You have not sent any messages yet.'
            : 'Your inbox is empty — messages appear here as soon as someone writes to you.') +
          '</p><div class="btn-row mt-16"><button class="btn btn-green btn-sm" data-action="msg-new">+ New message</button></div></div>') +
      '</div></section>' + detail;
  }

  PC.MSG = {
    section: section,
    state: M,
    load: load,
    openCompose: openCompose,
    afterSend: function () { M.cache = null; load(true); }
  };
})();

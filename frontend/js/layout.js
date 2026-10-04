(function () {
  'use strict';
  var App = window.App;
  var S = window.YPDC.state;
  var A = window.YPDC.actions;
  var $ = App.$, $$ = App.$$, esc = App.esc, img = App.img,
      I = App.Icons, fmtDate = App.fmtDate, initials = App.initials,
      money = App.money, slugTitle = App.slugTitle, roleTitle = App.roleTitle;

  function openDrawer() { return App.openDrawer.apply(null, arguments); }
  function unreadCount() { return App.unreadCount.apply(null, arguments); }
  function runSearch() { return App.runSearch.apply(null, arguments); }
  function notifList() { return App.notifList.apply(null, arguments); }
  function imgTag() { return App.imgTag.apply(null, arguments); }

  function logoBlock(sub) {
    var full = imgTag(App.logoImg('logo-ypdc.png'), 'YPDC — Young Peace & Development Corps, University of Narowal', { cls: 'brand-lockup', fb: 'logo' });
    var mark = imgTag(App.logoImg('logo-ypdc-mark.png'), 'YPDC — Young Peace & Development Corps', { cls: 'brand-mark', fb: 'logo' });
    return '<a class="brand" href="#/" aria-label="YPDC — Young Peace & Development Corps, University of Narowal">' +
      (sub === false ? mark : '<span class="brand-img-wrap">' + full + mark + '</span>') + '</a>';
  }

  /* ---------- top announcement bar: sirf asli notices (DB se) ---------- */
  function notices() {
    var out = [];
    var sh = S.shaheen || {};
    out.push(sh.open
      ? { kind: 'Registration', text: '<b>' + esc(sh.batch || 'Bano Shaheen') + ' registration is open</b> — apply online', href: '#/shaheen' }
      : { kind: 'Notice', text: '<b>' + esc(sh.batch || 'Bano Shaheen') + ' registration is currently closed</b>', href: '#/shaheen' });

    var ind = S.inductionDrive || {};
    if (ind.batch) {
      out.push({
        kind: 'Applications',
        text: '<b>Induction Drive ' + esc(ind.batch) + '</b> — ' + (Number(ind.received) || 0) + ' application' + ((Number(ind.received) || 0) === 1 ? '' : 's') + ' received',
        href: '#/induction'
      });
    }

    (S.events || []).filter(function (e) { return e.status === 'Upcoming'; })
      .sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); })
      .slice(0, 2).forEach(function (e) {
        out.push({
          kind: 'Event',
          text: '<b>' + esc(e.title) + '</b> — ' + fmtDate(e.date) + (e.venue || e.location ? ' · ' + esc(e.venue || e.location) : ''),
          href: '#/event/' + esc(e.id)
        });
      });

    (S.highlights || []).filter(function (h) { return h.status === 'Published'; }).slice(0, 2).forEach(function (h) {
      out.push({ kind: 'Update', text: '<b>' + esc(h.title) + '</b> — ' + esc(h.desc || '').slice(0, 90), href: '#/highlights' });
    });

    return out;
  }

  function announcementBar() {
    var list = notices();
    var items = list.length ? list : [{ kind: 'Notice', text: '<b>No new notices right now</b> — announcements appear here as soon as they are published', href: '#/news' }];
    var one = items.map(function (n) {
      var body = '<span class="ab-kind">' + esc(n.kind) + '</span><span class="ab-dot" aria-hidden="true"></span><span>' + n.text + '</span>';
      return '<a class="ab-item link" href="' + n.href + '">' + body + '</a>';
    }).join('');
    var count = items.length;
    return '<div class="announce-bar" role="region" aria-label="Announcements">' +
      '<span class="ab-tag">' + (I.megaphone || I.bell) + 'Announcements</span>' +
      '<div class="ab-window"><div class="ab-track" aria-live="off">' + one + one + '</div></div>' +
      '<a class="ab-view" href="#/news">All notices <span aria-hidden="true">' + count + '</span></a>' +
      '</div>';
  }

  function publicHeader(active) {
    var nav = [
      ['Home', '#/'], ['About', '#/about'], ['Directorates', '#/directorates'], ['Events', '#/events'],
      ['Teams', '#/teams'], ['News', '#/news'], ['Achievements', '#/achievements'], ['Membership', '#/membership'],
      ['Contact', '#/contact']
    ];
    var sess = S.session;
    return '<header class="site-header">' + '<div class="wrap hdr">' + logoBlock() +
      '<nav class="main-nav">' + nav.map(function (n) {
        return '<a href="' + n[1] + '"' + (active === n[0] ? ' class="active"' : '') + '>' + n[0] + '</a>';
      }).join('') + '</nav>' +
      '<div class="header-actions">' +
      '<button class="header-icon" data-action="open-notifs" title="Notifications">' + I.bell +
      (unreadCount() ? '<span class="dot-count">' + unreadCount() + '</span>' : '') + '</button>' +
      (sess ? '<a class="btn btn-gold btn-sm" href="#/portal">' + esc(roleTitle(sess.role)) + ' Portal</a>'
        : '<a class="btn btn-gold btn-sm" href="#/login">Portal Login</a>') +
      '<button class="burger" data-action="toggle-mobile-nav" aria-label="Menu">' + I.menu + '</button>' +
      '</div></div>' +
      '<div class="mobile-nav wrap" id="mobile-nav">' + nav.map(function (n) {
        return '<a href="' + n[1] + '"' + (active === n[0] ? ' class="active"' : '') + '>' + n[0] + '</a>';
      }).join('') +
      '<a href="#/login" data-action="open-notifs" class="mobile-extra">Notifications' +
      (unreadCount() ? ' <span class="badge badge-gold" style="margin-left:6px">' + unreadCount() + '</span>' : '') + '</a>' +
      '<div class="mt-16"><a class="btn btn-gold btn-block" href="#/login">' +
      (sess ? esc(roleTitle(sess.role)) + ' Portal' : 'Portal Login') + '</a></div>' +
      '</div></header>';
  }

  function logoFormats() {
    var marks = [
      ['footer-logo-paigham.png', 'is-round', 'Paigham-e-Pakistan — a message of peace from Pakistan'],
      ['footer-logo-uon.png', 'is-tall', 'University of Narowal'],
      ['footer-logo-cve.png', 'is-tall', 'Punjab Centre of Excellence on Countering Violent Extremism — Home Department'],
      ['footer-logo-ypdc.png', 'is-wide is-card', 'YPDC — Young Peace & Development Corps, University of Narowal']
    ];
    return '<div class="foot-marks"><div class="wrap foot-marks-in"><div class="foot-marks-row">' +
      marks.map(function (m) {
        var src = App.img(m[0]);
        return '<a class="mark ' + m[1] + '" href="' + src + '" target="_blank" rel="noopener" title="' + m[2] + ' — open full size">' +
          '<span class="m-in">' + imgTag(src, m[2], { fb: 'logo' }) + '</span></a>';
      }).join('') +
      '</div></div></div>';
  }

  function footer() {
    var c = S.site.contact;
    return '<footer class="site-footer"><div class="wrap">' +
      '<div class="foot-grid">' +
      '<div>' + logoBlock() +
      '<p class="mt-16" style="max-width:34ch;color:#A9C1B8">' + esc(S.site.full) + ' — ' + esc(S.site.university) +
      '. A student-led corps for leadership, peacebuilding and community service.</p>' +
      '<div class="foot-social mt-22">' +
      '<a href="https://facebook.com" target="_blank" rel="noopener" class="soc-facebook" title="Facebook" aria-label="Facebook">' + I.facebook + '</a>' +
      '<a href="https://instagram.com" target="_blank" rel="noopener" class="soc-instagram" title="Instagram" aria-label="Instagram">' + I.instagram + '</a>' +
      '<a href="https://tiktok.com" target="_blank" rel="noopener" class="soc-tiktok" title="TikTok" aria-label="TikTok">' + I.tiktok + '</a>' +
      '<a href="https://twitter.com" target="_blank" rel="noopener" class="soc-twitter" title="Twitter / X" aria-label="Twitter X">' + I.twitter + '</a>' +
      '<a href="mailto:' + esc(c.email) + '" class="soc-mail" title="Email" aria-label="Email">' + I.mail + '</a>' +
      '<a href="https://wa.me/923025423333" target="_blank" rel="noopener" class="soc-whatsapp" title="WhatsApp" aria-label="WhatsApp">' + I.whatsapp + '</a>' +
      '</div>' +
      '<div class="foot-follow">Follow <b style="color:#CFE0D9">@ypdc.uon</b> on social media</div></div>' +
      '<div><h4>Explore</h4><a href="#/about">About YPDC</a><a href="#/cabinet">Cabinet</a><a href="#/directorates">Directorates</a><a href="#/highlights">Highlights &amp; Picks</a></div>' +
      '<div><h4>Engage</h4><a href="#/teams">Teams &amp; Team Leaders</a><a href="#/shaheen">Bano Shaheen</a><a href="#/induction">Induction Drive</a><a href="#/membership">Become a Member</a><a href="#/events">Event Registration</a><a href="#/feedback">Feedback</a></div>' +
      '<div><h4>Contact</h4>' +
      '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>' +
      '<a href="tel:' + esc(c.phone.replace(/\s/g, '')) + '">' + esc(c.phone) + '</a>' +
      '<a class="foot-office">' + esc(c.office).replace(/\n/g, '<br>') + '</a><a>' + esc(c.hours) + '</a></div>' +
      '</div>' +
      logoFormats() +
      '<div class="foot-bottom"><span>© ' + new Date().getFullYear() + ' YPDC UON · Young Peace &amp; Development Corps, University of Narowal.</span>' +
      '<span style="opacity:.75">All data live from YPDC server</span>' +
      '<span class="foot-build" title="Website build — if you see an older tag, refresh the page (Ctrl + F5).">Build R38.2 · 3 Oct 2026</span></div>' +
      '</div>' +
      '<div class="foot-bar">YPDC UON</div></footer>';
  }

  /* ---------- header behaviour: compact on scroll, mobile nav ---------- */
  var chromeBound = false;
  function bindChrome() {
    if (App.Team && App.Team.loadStats && $('[data-team-live]')) App.Team.loadStats();
    if (App.Team && App.Team.loadDirectory && $('#team-directory')) { App.Team.loadDirectory(); App.Team.bindDirectory(); }
    if (!$('.site-header')) return;
    var apply = function () {
      var el = $('.site-header');                       // header node navigation par badalta hai
      if (el) el.classList.toggle('is-stuck', window.scrollY > 18);
    };
    apply();
    var onScroll = function () {
      if (onScroll._r) return;
      onScroll._r = true;
      requestAnimationFrame(function () { onScroll._r = false; apply(); });
    };
    if (!chromeBound) {
      window.addEventListener('scroll', onScroll, { passive: true });
      chromeBound = true;
    }
  }

  App.bindChrome = bindChrome;
  App.logoBlock = logoBlock;
  App.announcementBar = announcementBar;
  App.notices = notices;
  App.publicHeader = publicHeader;
  App.announcementBar = announcementBar;
  App.footer = footer;
})();

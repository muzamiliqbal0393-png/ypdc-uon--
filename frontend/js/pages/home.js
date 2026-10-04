(function () {
  'use strict';
  var App = window.App;
  var S = window.YPDC.state;
  var A = window.YPDC.actions;
  var $ = App.$, $$ = App.$$, esc = App.esc, img = App.img,
      I = App.Icons, fmtDate = App.fmtDate, initials = App.initials,
      money = App.money, slugTitle = App.slugTitle, roleTitle = App.roleTitle;

  function eventCard() { return App.eventCard.apply(null, arguments); }
  function feedbackForm() { return App.feedbackForm.apply(null, arguments); }
  function imgTag() { return App.imgTag.apply(null, arguments); }
  function teamIcon(k) { return (App.Team && App.Team.TEAM_ICON[k]) || ''; }
  var Public = {};

  var PE_ICON = {
    student: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M22 9.2 12 4 2 9.2l10 5.2 10-5.2Z"/><path d="M6.2 11.6V16c0 1.7 2.6 3.1 5.8 3.1s5.8-1.4 5.8-3.1v-4.4"/><path d="M20.6 10v5.4"/></svg>',
    member: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.2" width="18" height="15.6" rx="3"/><circle cx="9" cy="10.8" r="2.2"/><path d="M5.7 16.9c.7-1.6 1.9-2.4 3.3-2.4s2.6.8 3.3 2.4M14.6 9.6h4M14.6 13.1h3"/></svg>',
    directorate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3 7.6 12 12.2l9-4.6L12 3Z"/><path d="m3 12.2 9 4.6 9-4.6M3 16.6 12 21.2l9-4.6"/></svg>',
    faculty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.6A2.6 2.6 0 0 1 6.6 3H20v14.6H6.6A2.6 2.6 0 0 0 4 20.2V5.6Z"/><path d="M20 17.6v3.4H6.6M8.2 7h8M8.2 10.6h5.2"/></svg>',
    admin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7.2 2.8v6c0 4.3-3 7.8-7.2 9.2-4.2-1.4-7.2-4.9-7.2-9.2v-6L12 3Z"/><path d="m8.8 12.1 2.3 2.3 4.4-4.6"/></svg>',
    alumni: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3.6 19.6c.8-3 2.7-4.5 5.4-4.5s4.6 1.5 5.4 4.5"/><path d="M16.2 5.5a3 3 0 0 1 0 5.4M17.6 15.4c2.1.6 3.3 2.1 3.8 4.2"/></svg>',
    guest: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3.2 12h17.6M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>'
  };

  var PE_STEPS = [
    ['1', 'Pick your role', 'Choose a role from the list — the workspace, feature list and login link update on the spot.'],
    ['2', 'Sign in to that portal', 'Every role has its own portal — login is with your real YPDC account.'],
    ['3', 'Your workspace opens', 'Dashboard, sections, tasks, approvals and records — all organised for that role.']
  ];

  function portalExplorer() {
    var PCc = window.PC || {}, NAV = PCc.NAV || {}, HERO = PCc.HERO || {};
    var ids = S.portals.map(function (p) { return p.id; });
    var active = (window.__peRole && ids.indexOf(window.__peRole) >= 0) ? window.__peRole : ids[0];

    var rail = S.portals.map(function (p) {
      var on = p.id === active;
      return '<button class="pe-item' + (on ? ' is-on' : '') + '" type="button" role="tab"' +
        ' aria-selected="' + on + '" aria-controls="pe-pane-' + p.id + '"' +
        ' data-action="portal-pick" data-role="' + p.id + '">' +
        '<span class="pe-ic">' + (PE_ICON[p.id] || '') + '</span>' +
        '<span class="pe-tx"><span class="pe-t">' + esc(p.title) + '</span>' +
        '<span class="pe-d">' + esc(p.desc) + '</span></span>' +
        '<span class="pe-i">' + esc(p.num) + ' <span class="pe-arw">' + I.arrow + '</span></span>' +
        '</button>';
    }).join('');

    var panes = S.portals.map(function (p) {
      var h = HERO[p.id] || {};
      var inside = (NAV[p.id] || []).slice(0, 8).map(function (sec) {
        return '<span class="pe-tag">' + esc(sec[1]) + '</span>';
      }).join('');
      return '<div class="pe-pane' + (p.id === active ? ' is-on' : '') + '" id="pe-pane-' + p.id + '" role="tabpanel" data-pane="' + p.id + '">' +
        '<span class="pe-ghost">' + esc(p.num) + '</span>' +
        '<span class="pe-eyebrow">' + esc(p.title) + ' &middot; Workspace ' + esc(p.num) + '</span>' +
        '<h3>' + esc(h.title || p.desc) + '</h3>' +
        '<p>' + esc(h.text || p.desc) + '</p>' +
        (inside ? '<div class="pe-tags"><span class="pe-tag" style="border-color:rgba(255,255,255,.45);color:#E8F4EC">What&rsquo;s inside</span>' + inside + '</div>' : '') +
        '<div class="pe-cta"><a class="btn btn-gold" href="' + (p.id === 'guest' ? '#/portal/guest/dashboard' : '#/login?role=' + p.id) + '">' + (p.id === 'guest' ? 'Open the public workspace' : 'Open ' + esc(p.title)) + ' ' + I.arrow + '</a>' +
        '<span class="pe-note">' + ((!window.YPDC.api || !window.YPDC.api.checked || window.YPDC.api.available) ? 'Login with your YPDC account.' : 'Server is not running — start the backend to use the portal.') + '</span></div>' +
        '</div>';
    }).join('');

    return '<section class="section" id="portal-explorer"><div class="wrap">' +
      '<div class="sec-head"><div class="sh-t"><span class="eyebrow">How to login</span>' +
      '<h2>One vision, seven workspaces</h2>' +
      '<p>Different roles, a shared purpose. Select your role — its workspace, features and login appear right away.</p>' +
      '<div class="sec-rule"></div></div>' +
      '<a class="btn btn-outline" href="#/portal">Go to workspace ' + I.arrow + '</a></div>' +
      '<div class="pe-grid">' +
      '<div class="pe-rail" role="tablist" aria-label="YPDC portals">' + rail + '</div>' +
      '<div class="pe-panel">' + panes + '</div>' +
      '</div>' +
      '<div class="pe-steps">' + PE_STEPS.map(function (st) {
        return '<div class="pe-step"><span class="pe-sn">' + st[0] + '</span>' +
          '<div><b>' + esc(st[1]) + '</b><span>' + esc(st[2]) + '</span></div></div>';
      }).join('') + '</div>' +
      '</div></section>';
  }

  /* ---------- what we do ---------- */
  var PATHWAYS = [
    {
      ic: I.target, tag: '01', title: 'Peacebuilding & dialogue',
      text: 'Peace walks, campus dialogues and inter-university sittings that build tolerance and civic responsibility.',
      href: '#/about', label: 'About YPDC'
    },
    {
      ic: I.award, tag: '02', title: 'Leadership & training',
      text: 'Workshops, mentoring circles and Bano Shaheen leadership batches that turn students into team leaders.',
      href: '#/shaheen', label: 'Bano Shaheen'
    },
    {
      ic: I.handshake, tag: '03', title: 'Community service',
      text: 'Clean drives, plantation campaigns, blood donation camps and relief work with the University and district partners.',
      href: '#/directorates', label: 'Our directorates'
    },
    {
      ic: I.cal, tag: '04', title: 'Events & competitions',
      text: 'Speech contests, exhibitions and volunteering drives — every event is published on the public calendar with online registration.',
      href: '#/events', label: 'Event calendar'
    }
  ];

  function pathSection() {
    return '<section class="section section-tint" id="what-we-do"><div class="wrap">' +
      '<div class="sec-head"><div class="sh-t"><span class="eyebrow">What YPDC does</span>' +
      '<h2>Four ways we work on campus</h2>' +
      '<p>' + esc(S.site.intro || '') + '</p>' +
      '<div class="sec-rule"></div></div>' +
      '<a class="btn btn-outline" href="#/directorates">All directorates ' + I.arrow + '</a></div>' +
      '<div class="path-grid">' + PATHWAYS.map(function (p) {
        return '<article class="path-card"><span class="pc-num">' + p.tag + '</span>' +
          '<span class="pc-ic">' + p.ic + '</span>' +
          '<h3>' + esc(p.title) + '</h3>' +
          '<p>' + esc(p.text) + '</p>' +
          '<a class="pc-link" href="' + p.href + '">' + esc(p.label) + ' ' + I.arrow + '</a></article>';
      }).join('') + '</div></div></section>';
  }

  /* ---------- team sections (A: leader · B: member) ---------- */
  function teamSection() {
    return '<section class="section" id="teams"><div class="wrap">' +
      '<div class="sec-head"><div class="sh-t"><span class="eyebrow">Teams at YPDC UON</span>' +
      '<h2>Lead a team, or join one</h2>' +
      '<p>Teams are YPDC’s working units — small groups of volunteers who run their own activities under a team leader. ' +
      'This is separate from normal YPDC membership: here you either create a team or join an existing one.</p>' +
      '<div class="sec-rule"></div></div>' +
      '<div class="tm-counts"><span class="tm-count">Active teams <b data-team-live="count">—</b></span>' +
      '<span class="tm-count">Team members <b data-team-live="members">—</b></span></div></div>' +

      '<div class="team-grid">' +
      '<article class="team-card" id="team-leader">' +
      '<span class="tc-kicker">Section A · Team Leader</span>' +
      '<span class="tc-ic">' + teamIcon('leader') + '</span>' +
      '<h3>Become a Team Leader</h3>' +
      '<p>Register your own team and get a unique Team ID. You choose the team name and purpose, invite members and manage your team’s work.</p>' +
      '<ul>' +
      '<li>' + I.check + '<span>Create and manage your own YPDC team</span></li>' +
      '<li>' + I.check + '<span>Approve members and see everyone’s status</span></li>' +
      '<li>' + I.check + '<span>Assign team tasks and track progress</span></li>' +
      '</ul>' +
      '<div class="tc-foot">' +
      '<button class="btn btn-gold" data-action="team-leader-form">Register as Team Leader</button>' +
      '<span class="tc-meta">A YPDC admin reviews every new team before it goes live.</span>' +
      '</div></article>' +

      '<article class="team-card is-member" id="join-team">' +
      '<span class="tc-kicker">Section B · Team Member</span>' +
      '<span class="tc-ic">' + teamIcon('member') + '</span>' +
      '<h3>Join a Team</h3>' +
      '<p>Do not want to lead? Join an existing team as a member — pick a team, add your details and the team leader sees your registration.</p>' +
      '<ul>' +
      '<li>' + I.check + '<span>Search active teams by name or leader</span></li>' +
      '<li>' + I.check + '<span>See team tasks and announcements</span></li>' +
      '<li>' + I.check + '<span>Your membership is stored against the Team ID</span></li>' +
      '</ul>' +
      '<div class="tc-foot">' +
      '<button class="btn btn-outline" data-action="join-team-form">Register as Team Member</button>' +
      '<a class="btn btn-quiet" href="#/teams">Browse teams</a>' +
      '</div></article>' +
      '</div>' +

      '<div class="team-flow">' +
      ['User', 'Team Leader', 'Team (TEAM-001)', 'Team Members', 'Team Tasks'].map(function (n, i) {
        return (i ? '<span class="tf-arw">' + I.arrow + '</span>' : '') + '<span class="tf-node">' + esc(n) + '</span>';
      }).join('') +
      '</div></div></section>';
  }

  /* ---------- hero ---------- */
  function hero(st) {
    var sh = S.shaheen || {}; void sh;
    return '<section class="hero">' +
      '<video class="hero-bg" autoplay muted loop playsinline preload="metadata" aria-hidden="true" tabindex="-1" poster="' + App.img('hero-loop-poster.jpg') + '">' +
      '<source src="' + App.media('hero-loop.mp4') + '" type="video/mp4"></video>' +
      '<span class="hero-scrim" aria-hidden="true"></span>' +
      '<div class="wrap"><div class="hero-grid">' +
      '<div class="hero-copy">' +
      '<span class="hero-badge"><span class="hb-dot"></span>' + esc(S.site.full || 'YPDC UON') + ' · ' + esc(S.site.university || 'University of Narowal') + '</span>' +
      '<h1>Students today, <span class="accent">leaders</span> tomorrow.</h1>' +
      '<p class="lead">' + esc(S.site.intro || '') + '</p>' +
      '<div class="hero-cta btn-row">' +
      '<a class="btn btn-gold" href="#/membership">Become a Member ' + I.arrow + '</a>' +
      '<a class="btn btn-outline" href="#/events">See events &amp; projects</a>' +
      '</div>' +
      '<div class="hero-mini">' +
      '<div class="hm">' + I.users + '<div><b>Join a team</b><span>Work with a team leader on real activities.</span></div></div>' +
      '<div class="hm">' + I.shieldCheck + '<div><b>Transparent records</b><span>Applications, events and members are stored on the YPDC server.</span></div></div>' +
      '</div>' +
      '</div>' +
      '<div class="hero-figure">' +
      '<div class="hero-photo">' + imgTag(App.brand('hero', 'hero-campus.jpg'), 'YPDC UON volunteers and campus', { fb: 'photo' }) + '</div>' +
      '</div>' +
      '</div>' +
      '<div class="hero-stats">' + st.map(function (s) {
        return '<div class="hs"><div class="num">' + esc(s.value) + '</div><div class="lbl">' + esc(s.label) + '</div></div>';
      }).join('') + '</div>' +
      '</div></section>' +
      '<div class="hero-notice-wrap"><div class="wrap">' +
      (App.announcementBar ? App.announcementBar() : '') +
      '</div></div>';
  }

  /* ---------- about ---------- */
  function aboutSection() {
    var IC = [I.target, I.handshake, I.globe, I.sparkles];
    return '<section class="section" id="about"><div class="wrap about-grid">' +
      '<div><span class="eyebrow">Who we are</span>' +
      '<h2 class="mt-10">A student corps built on peace, service and leadership.</h2>' +
      '<p class="lead mt-16">' + esc((S.site.aboutProse && S.site.aboutProse[0]) || '') + '</p>' +
      '<div class="value-grid">' + (S.site.values || []).slice(0, 4).map(function (v, i) {
        return '<div class="value-item"><span class="vi-ic">' + (IC[i] || I.check) + '</span>' +
          '<div><b>' + esc(v) + '</b><span>A core value behind every YPDC activity.</span></div></div>';
      }).join('') + '</div>' +
      '<div class="btn-row mt-22"><a class="btn btn-gold" href="#/about">More about YPDC ' + I.arrow + '</a>' +
      '<a class="btn btn-outline" href="#/cabinet">Current cabinet</a></div></div>' +
      '<div class="about-media">' +
      '<div class="media-frame ratio-43 am-tall">' + imgTag(img('event-volunteers.jpg'), 'YPDC volunteers on a campus drive', { fb: 'photo' }) +
      '<span class="media-cap">Volunteers on a campus drive</span></div>' +
      '<div class="media-frame ratio-169">' + imgTag(img('dialogue-stage.jpg'), 'Narowal Peace Dialogue', { fb: 'photo' }) +
      '<span class="media-cap">Narowal Peace Dialogue</span></div>' +
      '<div class="media-frame ratio-169">' + imgTag(img('mentorship.jpg'), 'YPDC mentoring session', { fb: 'photo' }) +
      '<span class="media-cap">Mentoring circle</span></div>' +
      '</div></div></section>';
  }

  /* ---------- events ---------- */
  function eventsSection(ev, EN) {
    return '<section class="section section-tint" id="events-home"><div class="wrap">' +
      '<div class="sec-head"><div class="sh-t"><span class="eyebrow">Where to find events &amp; projects</span>' +
      '<h2>Upcoming events &amp; activities</h2>' +
      '<p>Every event has a date, venue and online registration — the same calendar drives the public site, the student portal and the admin panel.</p>' +
      '<div class="sec-rule"></div></div>' +
      '<a class="btn btn-outline" href="#/events">All events ' + I.arrow + '</a></div>' +
      '<div class="grid g3">' + (ev.length ? ev.map(function (e) { return eventCard(e); }).join('')
        : EN('No upcoming events yet', 'Publish a new event from Admin panel → Events — it appears here and on the calendar instantly.')) + '</div>' +
      '</div></section>';
  }

  /* ---------- news + induction ---------- */
  function newsSection(news, EN) {
    return '<section class="section"><div class="wrap grid-2-1">' +
      '<div><span class="eyebrow">News &amp; updates</span><h2 class="mt-10">Latest from YPDC</h2>' +
      '<div class="news-list mt-22">' +
      (news.length ? news.map(function (n) {
        return '<a class="nl-row" href="#/news"><span class="tag-pill">' + esc(n.tag) + '</span>' +
          '<span class="txt"><b>' + esc(n.title) + '</b><small>' + fmtDate(n.date) + '</small></span>' + I.arrow + '</a>';
      }).join('') : EN('No news yet', 'Add news from Admin → Content.')) +
      '</div>' +
      '<div class="mt-22"><a class="btn btn-outline" href="#/news">All news ' + I.arrow + '</a></div></div>' +
      '<div>' + inductionCard() + '</div>' +
      '</div></section>';
  }

  function inductionCard() {
    var ind = S.inductionDrive || {};
    return '<div class="cta-band">' +
      '<div><span class="eyebrow" style="color:#B7E1C8">Join the community</span>' +
      '<h3>Induction Drive ' + esc(ind.batch || '') + '</h3>' +
      '<p>Apply directly through the YPDC portal — no external form link required. Choose your preferred directorate and tell us why you want to join.</p>' +
      '<div class="cb-stats">' +
      '<span class="cbs"><b data-live="induction" data-count="' + (Number(ind.received) || 0) + '">' + (Number(ind.received) || 0) + '</b><span>Applications received</span></span>' +
      '<span class="cbs"><b>' + (ind.batch ? 'Open' : '—') + '</b><span>Status</span></span>' +
      '</div></div>' +
      '<div class="btn-row"><a class="btn btn-gold" href="#/induction">Start application ' + I.arrow + '</a>' +
      '<a class="btn btn-ghost" href="#/membership">Membership info</a></div>' +
      '</div>';
  }

  /* ---------- highlights ---------- */
  function highlightsSection(hl, EN) {
    return '<section class="section section-green"><div class="wrap">' +
      '<div class="sec-head on-dark"><div class="sh-t"><span class="eyebrow">Featured by YPDC UON</span>' +
      '<h2>Highlights &amp; picks</h2>' +
      '<p>Selected events, activities, achievements and opportunities — curated and published by the admin team.</p>' +
      '<div class="sec-rule" style="background:#8FD0AC"></div></div>' +
      '<a class="btn btn-ghost" href="#/highlights">See all highlights ' + I.arrow + '</a></div>' +
      '<div class="grid g3">' + (S.highlights.length ? hl.concat(S.highlights.filter(function (h) { return h.status !== 'Published'; })).slice(0, 3).map(function (h) {
        return '<article class="card" style="background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.16);color:#fff">' +
          '<span class="badge ' + (h.status === 'Published' ? 'badge-gold' : 'badge-line') + '"' + (h.status === 'Published' ? '' : ' style="border-color:rgba(255,255,255,.3);color:#D6E8DE"') + '>' + esc(h.type) + '</span>' +
          '<h3 class="mt-16" style="color:#fff">' + esc(h.title) + '</h3>' +
          '<p class="mt-10" style="color:#CDE7D7;font-size:.92rem">' + esc(h.desc) + '</p>' +
          '<div class="mt-16" style="font-size:.78rem;color:#9FC4B2">' + esc(h.status) + '</div></article>';
      }).join('') : EN('No highlights published yet', 'Publish content from Admin → Highlights.')) + '</div>' +
      '</div></section>';
  }

  /* ---------- cabinet + directorates ---------- */
  function cabinetSection(EN) {
    return '<section class="section"><div class="wrap">' +
      '<div class="sec-head"><div class="sh-t"><span class="eyebrow">Current leadership structure</span>' +
      '<h2>Cabinet &amp; directorates · ' + esc(S.cabinet.session) + '</h2>' +
      '<div class="sec-rule"></div></div>' +
      '<a class="btn btn-outline" href="#/cabinet">Cabinet details ' + I.arrow + '</a></div>' +
      '<div class="grid g4">' + (S.cabinet.posts.length ? S.cabinet.posts.slice(0, 4).map(function (p) {
        return '<div class="card card-tight"><div class="flex-between"><b>' + esc(p.title) + '</b>' +
          '<span class="badge badge-ok">' + esc(p.status) + '</span></div>' +
          '<p class="mut mt-10" style="font-size:.86rem">' + esc(p.holder) + '</p></div>';
      }).join('') : EN('No cabinet posts added yet', 'Add new posts and holders from Admin panel → Cabinet.')) + '</div>' +
      '<div class="grid g4 mt-22">' + S.directorates.slice(0, 4).map(function (d) {
        return '<div class="card card-tight"><b>' + esc(d.name) + '</b>' +
          '<p class="mut mt-6" style="font-size:.84rem">' + d.members + ' members · ' + d.active + ' active</p>' +
          '<div class="bar mt-10"><span style="width:' + d.activity + '%"></span></div></div>';
      }).join('') + '</div>' +
      '</div></section>';
  }

  /* ---------- gallery + feedback ---------- */
  function gallerySection() {
    return '<section class="section section-tint"><div class="wrap">' +
      '<div class="sec-head"><div class="sh-t"><span class="eyebrow">Gallery</span><h2>Moments from our activities</h2>' +
      '<div class="sec-rule"></div></div>' +
      '<a class="btn btn-outline" href="#/achievements">Achievements ' + I.arrow + '</a></div>' +
      '<div class="gallery">' + App.gallery().map(function (src) {
        return imgTag(src, 'YPDC activity', { fb: 'photo' });
      }).join('') + '</div>' +
      '<div class="mt-48">' + feedbackForm('Share a suggestion, comment or feedback about YPDC UON.', 'guest') + '</div>' +
      '</div></section>';
  }

  Public.home = function () {
    var st = (S.site.stats && S.site.stats.length) ? S.site.stats : [
      { label: 'Directorates', value: String((S.directorates || []).length) },
      { label: 'Team Members', value: String((S.directorates || []).reduce(function (a, d) { return a + (d.members || 0); }, 0)) },
      { label: 'Events', value: String((S.events || []).length) },
      { label: 'News Updates', value: String((S.news || []).length) }
    ];
    var ev = S.events.filter(function (e) { return e.status === 'Upcoming'; }).slice(0, 3);
    var hl = S.highlights.filter(function (h) { return h.status === 'Published'; });
    var news = S.news.slice(0, 4);
    var EN = (window.PC && window.PC.emptyNote) || function (t, s) { return '<div class="empty-block"><b>' + t + '</b><p class="mut mt-6">' + (s || '') + '</p></div>'; };

    return hero(st) + pathSection() + teamSection() + aboutSection() + eventsSection(ev, EN) +
      portalExplorer() + highlightsSection(hl, EN) + newsSection(news, EN) + cabinetSection(EN) + gallerySection();
  };

  App.Public = Public;
})();

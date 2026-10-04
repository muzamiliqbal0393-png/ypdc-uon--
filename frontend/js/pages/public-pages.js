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
  function toast() { return App.toast.apply(null, arguments); }
  function render() { return App.render.apply(null, arguments); }
  var Public = App.Public || (App.Public = {});
  Public.about = function () {
    return '<section class="section">' +
      '<div class="wrap grid g23" style="align-items:center">' +
      '<div><span class="eyebrow">About YPDC UON</span><h1 class="mt-16">Building leaders who serve.</h1>' +
      '<p class="lead mt-16">' + esc(S.site.aboutProse[0]) + '</p><p class="lead mt-10">' + esc(S.site.aboutProse[1]) + '</p></div>' +
      '<div class="media-frame ratio-43"><img src="' + img('event-volunteers.jpg') + '" alt="YPDC team"></div></div>' +
      '</section>' +
      '<section class="section-sm section-cream2"><div class="wrap grid g2">' +
      '<div class="card"><span class="eyebrow">Vision</span><h3 class="mt-10">Our Vision</h3><p class="mut mt-10">' + esc(S.site.vision) + '</p></div>' +
      '<div class="card"><span class="eyebrow">Mission</span><h3 class="mt-10">Our Mission</h3><p class="mut mt-10">' + esc(S.site.mission) + '</p></div>' +
      '</div></section>' +
      '<section class="section"><div class="wrap">' +
      '<span class="eyebrow">What we stand for</span><h2 class="mt-10">Values &amp; working model</h2>' +
      '<div class="grid g3 mt-32">' + S.site.values.map(function (v) {
        return '<div class="card card-tight"><div class="feature-row" style="border:0;padding:0"><span class="ico">✦</span>' +
          '<div><b>' + esc(v) + '</b><div class="mut" style="font-size:.86rem;margin-top:6px">Practised across all seven directorates and every activity.</div></div></div></div>';
      }).join('') + '</div>' +
      '<div class="grid g23 mt-48" style="align-items:center">' +
      '<div class="media-frame ratio-169"><img src="' + img('dialogue-stage.jpg') + '" alt="Narowal Peace Dialogue 2026"></div>' +
      '<div><span class="eyebrow">How we work</span><h3 class="mt-10">A connected system</h3>' +
      '<ol class="num-list mt-22"><li><b>Discover</b><div class="mut">Students explore directorates, events and opportunities.</div></li>' +
      '<li><b>Apply</b><div class="mut">Induction drive applications are submitted through the portal.</div></li>' +
      '<li><b>Contribute</b><div class="mut">Members take tasks, duties and lead activities in their directorate.</div></li>' +
      '<li><b>Grow</b><div class="mut">Attendance, certificates, reports and mentoring record real progress.</div></li></ol>' +
      '</div></div></div></section>';
  };

  var DIR_PHOTO = {
    'Peace & Civic Engagement': 'dialogue-stage.jpg',
    'Community Development': 'community-drive.jpg',
    'Media & Communications': 'dialogue-panel.jpg',
    'IT & Web Development': 'freshers-desk.jpg',
    'Events & Operations': 'event-volunteers.jpg',
    'Human Resource & Membership': 'mentorship.jpg',
    'Finance & Sponsorship': 'award-ceremony.jpg'
  };

  Public.directorates = function () {
    return '<section class="section"><div class="wrap">' +
      '<span class="eyebrow">Seven focused teams</span><h1 class="mt-16">Directorates</h1>' +
      '<p class="lead mt-16">Each directorate owns a domain, a team and a work plan — together they deliver the YPDC mission.</p>' +
      '<div class="grid g3 mt-32">' + S.directorates.map(function (d) {
        return '<article class="card lift is-photo"><div class="card-photo"><img src="' + img(DIR_PHOTO[d.name] || 'event-volunteers.jpg') + '" alt="' + esc(d.name) + ' — YPDC UON"></div>' +
          '<div class="flex-between"><span class="badge ' + (d.status === 'Active' ? 'badge-ok' : 'badge-warn') + '">' + esc(d.status) + '</span>' +
          '<span class="mut" style="font-size:.78rem">' + d.vacancy + ' vacancy</span></div>' +
          '<h3 class="mt-16" style="font-size:1.25rem">' + esc(d.name) + '</h3>' +
          '<p class="mut mt-10" style="font-size:.9rem">' + esc(d.focus) + '</p>' +
          '<div class="bar-row mt-16"><div class="top"><span class="mut" style="font-size:.8rem">Activity score</span><b>' + d.activity + '%</b></div>' +
          '<div class="bar"><span style="width:' + d.activity + '%"></span></div></div>' +
          '<div class="flex-between mt-16"><span class="mut" style="font-size:.84rem">' + d.members + ' members · ' + d.active + ' active</span></div>' +
          '<div class="mut mt-10" style="font-size:.82rem">Lead: ' + (d.lead ? esc(d.lead) : 'not assigned yet') + '</div>' +
          '</article>';
      }).join('') + '</div></div></section>';
  };

  Public.cabinet = function () {
    var d = S.directorates;
    return '<section class="section"><div class="wrap">' +
      '<span class="eyebrow">Current leadership structure</span><h1 class="mt-16">YPDC UON Cabinet</h1>' +
      '<p class="lead mt-16">The public page shows the current cabinet/session, total directorates, active directorates, member strength and YPDC executive posts.</p>' +
      '<div class="media-frame ratio-169 mt-32"><img src="' + img('dialogue-panel.jpg') + '" alt="YPDC UON cabinet — Peace Dialogue panel"></div>' +
      '<div class="grid g4 mt-32">' +
      '<div class="stat gold"><span class="stat-label">Session</span><span class="stat-value">' + esc(S.cabinet.session) + '</span><span class="stat-sub">Current cabinet</span></div>' +
      '<div class="stat"><span class="stat-label">Directorates</span><span class="stat-value">' + d.length + '</span><span class="stat-sub">' + d.filter(function (x) { return x.status === 'Active'; }).length + ' active</span></div>' +
      '<div class="stat"><span class="stat-label">Members</span><span class="stat-value">' + d.reduce(function (a, b) { return a + b.members; }, 0) + '</span><span class="stat-sub">Across all teams</span></div>' +
      '<div class="stat"><span class="stat-label">Executive Posts</span><span class="stat-value">' + S.cabinet.posts.length + '</span><span class="stat-sub">Active</span></div>' +
      '</div>' +
      '<div class="grid g2 mt-32">' +
      '<div class="panel"><div class="panel-head"><h3>Executive Posts</h3><span class="badge badge-gold">Admin editable</span></div>' +
      '<div class="panel-body" style="padding-top:6px;padding-bottom:6px">' + (S.cabinet.posts.length ? S.cabinet.posts.map(function (p) {
        return '<div class="list-row"><span class="av">' + initials(p.title) + '</span>' +
          '<div class="txt"><b>' + esc(p.title) + '</b><small>' + esc(p.holder) + '</small></div>' +
          '<span class="badge badge-ok">' + esc(p.status) + '</span></div>';
      }).join('') : EN('No cabinet posts added yet', 'Add posts from Admin panel → Cabinet.')) + '</div></div>' +
      '<div class="panel"><div class="panel-head"><h3>Directorates &amp; active status</h3></div>' +
      '<div class="panel-body" style="padding-top:6px;padding-bottom:6px">' + (d.length ? d.map(function (x) {
        return '<div class="list-row"><div class="txt"><b>' + esc(x.name) + '</b><small>' + x.members + ' members · lead ' + (x.lead ? esc(x.lead) : 'not assigned yet') + '</small></div>' +
          '<span class="badge ' + (x.status === 'Active' ? 'badge-ok' : 'badge-warn') + '">' + esc(x.status) + '</span></div>';
      }).join('') : EN('Directorates not loaded yet', 'The seven directorates appear here once the server data loads.')) + '</div></div></div>' +
      '</div></section>';
  };

  Public.highlights = function () {
    return '<section class="section"><div class="wrap">' +
      '<span class="eyebrow">Featured by YPDC UON</span><h1 class="mt-16">Highlights &amp; Picks</h1>' +
      '<p class="lead mt-16">A dedicated public page for selected events, activities, achievements and opportunities. Admin controls what is published.</p>' +
      '<div class="media-frame ratio-169 mt-32"><img src="' + img('dialogue-stage.jpg') + '" alt="Narowal Peace Dialogue 2026 — featured by YPDC UON"></div>' +
      '<div class="grid g3 mt-32">' + (S.highlights.length ? S.highlights.map(function (h) {
        return '<article class="card lift" style="padding:0;overflow:hidden">' +
          '<div class="media-frame" style="border-radius:0;box-shadow:none;aspect-ratio:16/10"><img src="' + img(h.image) + '" alt="' + esc(h.title) + '"></div>' +
          '<div style="padding:22px"><span class="badge ' + (h.status === 'Published' ? 'badge-gold' : 'badge-warn') + '">' + esc(h.type) + '</span>' +
          '<h3 class="mt-16" style="font-size:1.2rem">' + esc(h.title) + '</h3>' +
          '<p class="mut mt-10" style="font-size:.9rem">' + esc(h.desc) + '</p>' +
          '<div class="flex-between mt-16"><span class="mut" style="font-size:.78rem">' + esc(h.status) + '</span>' +
          '<a class="btn btn-xs btn-quiet" href="#/events">Explore ' + I.arrow + '</a></div></div></article>';
      }).join('') : EN('No highlights published yet', 'Publish the first item from Admin → Highlights.')) + '</div>' +
      '<div class="banner-strip mt-48"><div><span class="eyebrow">Homepage integration</span>' +
      '<h3>Cabinet, Events and Highlights are linked directly from the public website.</h3></div>' +
      '<a class="btn btn-gold" href="#/">Back to home ' + I.arrow + '</a></div>' +
      '</div></section>';
  };

  function EN(title, sub, onDark) {
    if (window.PC && window.PC.emptyNote) return window.PC.emptyNote(title, sub, '', onDark);
    return '<div class="empty-block' + (onDark ? ' on-dark' : '') + '"><b>' + esc(title) + '</b><p class="mut mt-6">' + esc(sub || '') + '</p></div>';
  }

  Public.events = function (filterCat) {
    var cats = ['All'].concat(S.events.map(function (e) { return e.category; }).filter(function (v, i, a) { return a.indexOf(v) === i; }));
    var list = S.events.filter(function (e) { return !filterCat || filterCat === 'All' || e.category === filterCat; });
    return '<section class="section"><div class="wrap">' +
      '<div class="flex-between flex-wrap"><div><span class="eyebrow">Events &amp; activities</span>' +
      '<h1 class="mt-16">What\'s happening at YPDC</h1>' +
      '<p class="lead mt-16">Complete event information is visible before registration — schedule, venue and registration status.</p></div>' +
      '<a class="btn btn-outline" href="#/portal/student/events">My events ' + I.arrow + '</a></div>' +
      '<div class="media-frame ratio-169 mt-32"><img src="' + img('dialogue-panel.jpg') + '" alt="YPDC UON event — Narowal Peace Dialogue 2026"></div>' +
      '<div class="chip-row mt-32">' + cats.map(function (c) {
        return '<button class="chip' + ((filterCat || 'All') === c ? ' active' : '') + '" data-action="filter-events" data-cat="' + esc(c) + '">' + esc(c) + '</button>';
      }).join('') + '</div>' +
      window.PC.calendar({ title: 'Monthly calendar', mt: true, emptyNote: 'No events are scheduled in this month yet.' }) +
      '<div class="grid g3 mt-32">' + (list.length ? list.map(function (e) { return eventCard(e); }).join('')
        : EN('No events published yet', 'Create a new event from Admin panel → Events — it appears here right away.')) + '</div>' +
      '</div></section>';
  };

  Public.eventDetail = function (id) {
    var e = S.events.filter(function (x) { return x.id === id; })[0];
    if (!e) return Public.events();
    var regs = S.registrations.filter(function (r) { return r.eventId === id; });
    var pct = Math.round((e.registered / (e.capacity || 1)) * 100);
    return '<section class="section"><div class="wrap">' +
      '<a class="btn btn-xs btn-quiet" href="#/events">← All events</a>' +
      '<div class="flex-between flex-wrap mt-22">' +
      '<div class="page-title"><span class="eyebrow">' + (e.status === 'Upcoming' ? 'Upcoming event' : 'Past event') + '</span>' +
      '<h1 class="mt-16" style="font-size:clamp(2rem,4vw,2.9rem)">' + esc(e.title) + '</h1>' +
      '<p class="lead mt-16">Complete event information is visible before registration so students and members know the schedule, venue and registration status.</p></div>' +
      '<span class="badge badge-line" style="align-self:flex-start">' + esc(e.status) + '</span></div>' +

      '<div class="grid g23 mt-32" style="align-items:start">' +
      '<div class="panel"><div class="panel-head"><h3>Event Details</h3></div>' +
      '<div class="panel-body">' +
      '<div class="grid g2">' +
      '<div class="info-box mint"><span class="k">Date</span><span class="v">' + fmtDate(e.date) + '</span></div>' +
      '<div class="info-box gold"><span class="k">Time</span><span class="v">' + esc(e.time) + '</span></div>' +
      '<div class="info-box mint"><span class="k">Location</span><span class="v">' + esc(e.location) + '</span></div>' +
      '<div class="info-box gold"><span class="k">Participants</span><span class="v">' + e.registered + ' registered</span></div>' +
      '</div>' +
      '<p class="mt-22" style="font-size:14.5px"><b>Organized by:</b> <span class="mut">' + esc(e.organizer) + '</span></p>' +
      '<p class="mt-16 mut" style="font-size:14.5px">' + esc(e.desc) + '</p>' +
      '<div class="bar-row mt-22"><div class="top"><span class="mut">Seats filled</span><b>' + pct + '%</b></div>' +
      '<div class="bar"><span style="width:' + Math.min(100, pct) + '%"></span></div></div>' +
      '</div></div>' +
      '<aside class="panel"><div class="panel-head"><h3>Registration Information</h3></div>' +
      '<div class="panel-body">' +
      '<div class="reg-open"><b>' + (e.status === 'Upcoming' ? 'Registration Open' : 'Event completed') + '</b>' +
      '<small>Deadline: ' + fmtDate(e.date) + '</small></div>' +
      '<div class="kv-list">' +
      '<div class="kv"><span>Status</span><b>' + esc(e.status) + '</b></div>' +
      '<div class="kv"><span>Registration</span><b>' + (e.status === 'Upcoming' ? 'Available' : 'Closed') + '</b></div>' +
      '<div class="kv"><span>Seats left</span><b>' + Math.max(0, e.capacity - e.registered) + '</b></div>' +
      '<div class="kv"><span>Category</span><b>' + esc(e.category) + '</b></div>' +
      '</div>' +
      '<button class="btn btn-green btn-block mt-22" data-action="register-event" data-id="' + e.id + '">Register for Event</button>' +
      (regs.length ? '<div class="mt-16 center"><span class="badge badge-gold">' + regs.length + ' portal registration' + (regs.length > 1 ? 's' : '') + '</span></div>' : '') +
      '</div></aside></div>' +

      '<div class="media-frame ratio-169 mt-32"><img src="' + img(e.image) + '" alt="' + esc(e.title) + '"></div>' +
      '<div class="mt-22"><a class="btn btn-outline btn-sm" href="#/events">Browse all events ' + I.arrow + '</a></div>' +
      '</div></section>';
  };

  Public.news = function () {
    return '<section class="section"><div class="wrap">' +
      '<span class="eyebrow">News &amp; updates</span><h1 class="mt-16">Latest from YPDC UON</h1>' +
      '<div class="media-frame ratio-169 mt-32"><img src="' + img('award-ceremony.jpg') + '" alt="YPDC UON news — award ceremony"></div>' +
      '<div class="grid g23 mt-32" style="align-items:start">' +
      '<div>' + (S.news.length ? S.news.map(function (n) {
        return '<article class="card mb-16"><div class="flex-between"><span class="badge badge-info">' + esc(n.tag) + '</span>' +
          '<span class="mut" style="font-size:.8rem">' + fmtDate(n.date) + '</span></div>' +
          '<h3 class="mt-16" style="font-size:1.2rem">' + esc(n.title) + '</h3>' +
          '<p class="mut mt-10">' + esc(n.body) + '</p></article>';
      }).join('') : EN('No news updates yet', 'Publish news from Admin → Content.')) + '</div>' +
      '<aside class="grid" style="gap:16px">' +
      '<div class="panel panel-green"><div class="panel-head"><h3 style="color:#fff">Notifications</h3></div>' +
      '<div class="panel-body" style="padding-top:8px">' + (S.notifications.length ? S.notifications.slice(0, 4).map(function (n) {
        return '<div class="list-row" style="border-color:rgba(255,255,255,.14)"><span class="av">' + esc(n.type.charAt(0)) + '</span>' +
          '<div class="txt"><b style="color:#fff;font-size:.9rem">' + esc(n.text) + '</b><small style="color:#A9C1B8">' + esc(n.meta) + '</small></div></div>';
      }).join('') : EN('No notifications', 'Notifications appear in your portal after login.', true)) + '</div></div>' +
      '<div class="card"><b>Subscribe for updates</b><p class="mut mt-6" style="font-size:.86rem">Get event and induction announcements in your inbox.</p>' +
      '<div class="field mt-16" style="margin-bottom:10px"><input type="email" placeholder="name@uon.edu.pk" id="news-sub-email"></div>' +
      '<button class="btn btn-green btn-block btn-sm" data-action="subscribe-news">Subscribe</button></div>' +
      '</aside></div></div></section>';
  };

  Public.achievements = function () {
    return '<section class="section"><div class="wrap">' +
      '<span class="eyebrow">Impact record</span><h1 class="mt-16">Achievements</h1>' +
      '<p class="lead mt-16">Numbers, certificates and milestones delivered by YPDC UON across the current and previous sessions.</p>' +
      '<div class="grid g4 mt-32">' + (S.achievements.length ? S.achievements.map(function (a) {
        return '<div class="card lift"><span class="stat-value" style="font-family:var(--serif);font-size:2.4rem;color:var(--green-800)">' + esc(a.count) + '</span>' +
          '<b class="mt-10" style="display:block">' + esc(a.title) + '</b><p class="mut mt-6" style="font-size:.86rem">' + esc(a.detail) + '</p></div>';
      }).join('') : EN('No achievements added yet', 'Update achievements from Admin → Content.')) + '</div>' +
      '<div class="grid g23 mt-48" style="align-items:center">' +
      '<div class="media-frame ratio-43"><img src="' + img('award-ceremony.jpg') + '" alt="Token of appreciation — YPDC UON"></div>' +
      '<div><span class="eyebrow">Participation</span><h3 class="mt-10">Directorate activity score</h3>' +
      '<div class="mt-22">' + S.directorates.map(function (d) {
        return '<div class="bar-row"><div class="top"><span>' + esc(d.name) + '</span><b>' + d.activity + '%</b></div>' +
          '<div class="bar"><span style="width:' + d.activity + '%"></span></div></div>';
      }).join('') + '</div></div></div>' +
      '</div></section>';
  };

  Public.membership = function () {
    return '<section class="section"><div class="wrap grid g23" style="align-items:start">' +
      '<div><span class="eyebrow">Membership</span><h1 class="mt-16">Become a Member</h1>' +
      '<p class="lead mt-16">Membership is open to all enrolled students of the University of Narowal. Choose one directorate, take responsibilities and grow through real work.</p>' +
      '<div class="media-frame ratio-169 mt-26"><img src="' + img('event-volunteers.jpg') + '" alt="YPDC UON members — national seminar"></div>' +
      '<div class="grid g2 mt-32">' +
      '<div class="card"><b>General Member</b><p class="mut mt-10" style="font-size:.9rem">Participate in events, trainings, volunteering and mentorship. Eligible for certificates.</p></div>' +
      '<div class="card"><b>Volunteer</b><p class="mut mt-10" style="font-size:.9rem">Join event duties and community drives with flexible hours and duty verification.</p></div>' +
      '<div class="card"><b>Directorate Member</b><p class="mut mt-10" style="font-size:.9rem">Work inside a directorate with tasks, reporting and leadership opportunities.</p></div>' +
      '<div class="card"><b>Executive / Post Holder</b><p class="mut mt-10" style="font-size:.9rem">Selected through internal evaluation for cabinet and directorate posts.</p></div>' +
      '</div>' +
      '<h3 class="mt-32">Eligibility &amp; process</h3>' +
      '<ol class="num-list mt-16">' +
      '<li><b>Submit application</b><div class="mut">Complete the induction form in the portal with your preferred directorate.</div></li>' +
      '<li><b>Review &amp; shortlisting</b><div class="mut">HR directorate and faculty review applications; shortlisted students are contacted.</div></li>' +
      '<li><b>Interview &amp; assignment</b><div class="mut">Selected students are assigned to a directorate with a member ID.</div></li>' +
      '<li><b>Active membership</b><div class="mut">Members take duties, earn certificates and become eligible for posts.</div></li>' +
      '</ol>' +
      '<div class="panel mt-32"><div class="panel-head"><h3>Membership at a glance</h3></div><div class="panel-body">' +
      '<div class="grid g3">' +
      '<div><span class="stat-label mut">Total members</span><b style="display:block;font-family:var(--serif);font-size:1.6rem">' + S.directorates.reduce(function (a, b) { return a + b.members; }, 0) + '</b></div>' +
      '<div><span class="stat-label mut">Volunteers</span><b style="display:block;font-family:var(--serif);font-size:1.6rem">42</b></div>' +
      '<div><span class="stat-label mut">Directorates</span><b style="display:block;font-family:var(--serif);font-size:1.6rem">7</b></div>' +
      '</div></div><div class="panel-foot"><a class="btn btn-gold btn-sm" href="#/induction">Apply now ' + I.arrow + '</a>' +
      '<a class="btn btn-outline btn-sm" href="#/login">Sign in to portal</a></div></div>' +
      '</div>' +
      '<aside class="card card-green">' +
      '<span class="eyebrow">Induction ' + esc(S.inductionDrive.batch) + '</span>' +
      '<h3 class="mt-10" style="color:#fff">Applications open</h3>' +
      '<p class="mt-10" style="color:#C6D8D1;font-size:.9rem">Received so far: <b style="color:var(--gold)" data-live="induction">' + S.inductionDrive.received + '</b></p>' +
      '<div class="field mt-22" style="color:#fff"><span style="font-size:.82rem">Quick interest (name + email)</span>' +
      '<input id="quick-name" placeholder="Full name" style="margin-bottom:8px"><input id="quick-email" placeholder="name@uon.edu.pk"></div>' +
      '<button class="btn btn-gold btn-block" data-action="quick-interest">Request application link</button>' +
      '<p class="mt-16" style="font-size:.76rem;color:#9FBAB0">Or apply directly in the Induction Drive page — no external link needed.</p>' +
      '</aside></div></section>';
  };

  Public.feedback = function () {
    return '<section class="section"><div class="wrap-narrow wrap">' +
      '<span class="eyebrow">Say something</span><h1 class="mt-16">Feedback &amp; Comments</h1>' +
      '<p class="lead mt-16">Tell us what to improve — event flow, portal features, communication or anything else.</p>' +
      '<div class="media-frame ratio-169 mt-26"><img src="' + img('workshop-lab.jpg') + '" alt="YPDC UON session in progress"></div>' +
      '<div class="mt-32 flex-between flex-wrap" style="gap:12px"><div><b>Need an instant answer?</b>' +
      '<p class="mut" style="font-size:.86rem;margin-top:4px">Ask the YPDC Assistant — events, membership, directorates, portal login.</p></div>' +
      '<button class="btn btn-green" type="button" data-action="open-chat">Ask YPDC Assistant ' + I.arrow + '</button></div>' +
      '<div class="mt-32">' + feedbackForm('Share a suggestion, comment or feedback about YPDC UON.', 'public') + '</div>' +
      '</div></section>';
  };

  Public.contact = function () {
    var c = S.site.contact;
    return '<section class="section"><div class="wrap grid g23" style="align-items:start">' +
      '<div><span class="eyebrow">Get in touch</span><h1 class="mt-16">Contact YPDC UON</h1>' +
      '<p class="lead mt-16">For membership, events, collaborations or media queries — reach the Office of the President.</p>' +
      '<div class="grid g2 mt-32">' +
      '<div class="card"><div class="flex"><span class="ico" style="width:44px;height:44px;border-radius:12px;background:var(--mint);display:grid;place-items:center">' + I.mail + '</span>' +
      '<div><span class="stat-label mut">Email</span><b style="display:block">' + esc(c.email) + '</b></div></div></div>' +
      '<div class="card"><div class="flex"><span class="ico" style="width:44px;height:44px;border-radius:12px;background:var(--mint);display:grid;place-items:center">' + I.phone + '</span>' +
      '<div><span class="stat-label mut">Phone</span><b style="display:block">' + esc(c.phone) + '</b></div></div></div>' +
      '<div class="card"><div class="flex"><span class="ico" style="width:44px;height:44px;border-radius:12px;background:var(--mint);display:grid;place-items:center">' + I.pin + '</span>' +
      '<div><span class="stat-label mut">Office</span><b style="display:block;font-size:.9rem">' + esc(c.office).replace(/\n/g, '<br>') + '</b></div></div></div>' +
      '<div class="card"><div class="flex"><span class="ico" style="width:44px;height:44px;border-radius:12px;background:var(--mint);display:grid;place-items:center">' + I.cal + '</span>' +
      '<div><span class="stat-label mut">Office hours</span><b style="display:block;font-size:.9rem">' + esc(c.hours) + '</b></div></div></div>' +
      '</div>' +
      '<div class="panel mt-32"><div class="panel-head"><h3>Contact form</h3></div><div class="panel-body">' +
      '<form data-form="contact"><div class="form-grid">' +
      '<label class="field"><span>Name</span><input name="name" required></label>' +
      '<label class="field"><span>Email</span><input name="email" type="email" required></label>' +
      '<label class="field"><span>Department / Program</span><input name="dept" placeholder="e.g. BS Computer Science"></label>' +
      '<label class="field"><span>Subject</span><input name="subject" placeholder="Membership / Event / Media"></label>' +
      '<label class="field full"><span>Message</span><textarea name="message" required placeholder="Write your message..."></textarea></label>' +
      '<div class="field full" style="margin-bottom:0"><button class="btn btn-green" type="submit">Send message ' + I.arrow + '</button></div>' +
      '</div></form></div></div></div>' +
      '<aside class="grid" style="gap:16px">' +
      '<div class="media-frame ratio-43"><img src="' + img('campus-gate.jpg') + '" alt="University of Narowal — main gate"></div>' +
      '<div class="card"><b>YPDC Assistant</b>' +
      '<p class="mut mt-6" style="font-size:.88rem">Events, membership, directorates or portal login — get an instant answer from the assistant.</p>' +
      '<button class="btn btn-green btn-block mt-16" type="button" data-action="open-chat">Ask the assistant ' + I.arrow + '</button></div>' +
      '<div class="card card-green"><span class="eyebrow">Quick links</span>' +
      S.portals.slice(0, 5).map(function (p) {
        return '<a class="qa" style="display:flex;justify-content:space-between;padding:12px 16px;border-radius:999px;background:rgba(255,255,255,.09);margin-top:10px;font-size:.85rem" href="#/login?role=' + p.id + '">' + esc(p.title) + ' <span>→</span></a>';
      }).join('') + '</div>' +
      '<div class="card"><b>Follow YPDC UON</b><p class="mut mt-6" style="font-size:.88rem">@ypdc.uon — official handles</p>' +
      '<div class="foot-social mt-16" style="--shadow:none">' +
      '<a class="soc-facebook" href="https://facebook.com" target="_blank" rel="noopener" aria-label="Facebook">' + I.facebook + '</a>' +
      '<a class="soc-instagram" href="https://instagram.com" target="_blank" rel="noopener" aria-label="Instagram">' + I.instagram + '</a>' +
      '<a class="soc-tiktok" href="https://tiktok.com" target="_blank" rel="noopener" aria-label="TikTok">' + I.tiktok + '</a>' +
      '<a class="soc-twitter" href="https://twitter.com" target="_blank" rel="noopener" aria-label="Twitter X">' + I.twitter + '</a>' +
      '<a class="soc-mail" href="mailto:' + esc(S.site.contact.email) + '" aria-label="Email">' + I.mail + '</a>' +
      '<a class="soc-whatsapp" href="https://wa.me/923025423333" target="_blank" rel="noopener" aria-label="WhatsApp">' + I.whatsapp + '</a>' +
      '</div></div>' +
      '<div class="card"><b>Feedback instead?</b><p class="mut mt-6" style="font-size:.88rem">Share comments and suggestions directly with the admin team.</p>' +
      '<a class="btn btn-outline btn-block btn-sm mt-16" href="#/feedback">Open feedback form</a></div>' +
      '</aside></div></section>';
  };

  Public.induction = function () {
    var opts = S.directorates.map(function (d) { return '<option>' + esc(d.name) + '</option>'; }).join('');
    return '<section class="section"><div class="wrap grid g23" style="align-items:start">' +
      '<div><span class="eyebrow">Join the YPDC UON community</span><h1 class="mt-16">Induction Drive</h1>' +
      '<p class="lead mt-16">Apply directly through the YPDC portal — no external form link required. Your application is stored in the YPDC database for review.</p>' +
      '<div class="panel mt-32"><div class="panel-head"><h3>YPDC Membership Application</h3><span class="badge badge-gold">Application open</span></div>' +
      '<div class="panel-body"><form data-form="induction"><div class="form-grid">' +
      '<label class="field"><span>Full Name</span><input name="name" required placeholder="Full name"></label>' +
      '<label class="field"><span>University Email</span><input name="email" type="email" required placeholder="name@uon.edu.pk"></label>' +
      '<label class="field"><span>Department / Program</span><input name="department" required placeholder="e.g. BS Computer Science"></label>' +
      '<label class="field"><span>Semester</span><select name="semester" required><option value="">Select semester</option>' +
      [1, 2, 3, 4, 5, 6, 7, 8].map(function (n) { return '<option>Semester ' + n + '</option>'; }).join('') + '</select></label>' +
      '<label class="field full"><span>Preferred Directorate</span><select name="directorate" required><option value="">Select directorate</option>' + opts + '</select></label>' +
      '<label class="field full"><span>Interest / Motivation</span><textarea name="motivation" required placeholder="Tell us why you want to join YPDC..."></textarea></label>' +
      '</div>' +
      '<div class="pf-section"><span class="pf-sec-title">Required documents</span>' +
      '<p class="pf-sec-note mut">Har registration ke liye apni photo aur ID card ki tasveer lazmi hai — camera se lein ya gallery se chunein.</p>' +
      (App.registrationDocs ? App.registrationDocs() : '') +
      '</div>' +
      '<div class="field full" style="margin-bottom:0"><button class="btn btn-green btn-block" type="submit">Submit Application ' + I.arrow + '</button></div>' +
      '</form></div></div></div>' +
      '<aside class="grid" style="gap:16px">' +
      '<div class="card"><span class="eyebrow">How it works</span><ol class="num-list mt-16">' +
      '<li>Complete application</li><li>Submit to YPDC database</li><li>Admin reviews application</li><li>Status notification is sent</li></ol></div>' +
      '<div class="card card-green"><span class="eyebrow">Current drive</span>' +
      '<div class="mt-16" style="font-size:.92rem;color:#C6D8D1">Induction Batch: <b style="color:#fff">' + esc(S.inductionDrive.batch) + '</b><br>' +
      'Applications received: <b style="color:var(--gold)" data-live="induction">' + S.inductionDrive.received + '</b><br>Status: ' + esc(S.inductionDrive.status) + '</div>' +
      '<div class="btn-row mt-22"><a class="btn btn-gold btn-sm" href="#/login?role=student">Volunteer Portal</a>' +
      '<a class="btn btn-ghost btn-sm" href="#/membership">Membership info</a></div></div>' +
      '<div class="media-frame ratio-43"><img src="' + img('freshers-desk.jpg') + '" alt="YPDC UON Freshers Week help desk"></div>' +
      '</aside></div></section>';
  };


  Public.shaheen = function () {
    var sh = S.shaheen || {};
    var open = !!sh.open;
    var seats = Number(sh.seats) || 0;
    var registered = Number(sh.registered) || 0;
    var left = seats ? Math.max(0, seats - registered) : null;
    var statusBadge = open
      ? '<span class="badge badge-ok">Registration open</span>'
      : '<span class="badge badge-line">Registration closed</span>';
    return '<section class="section"><div class="wrap grid g23" style="align-items:start">' +
      '<div><div class="bs-head"><span class="bs-plate"><img class="bs-mark" src="' + App.img('bano-shaheen-logo.png') + '" alt="' + esc(sh.batch || 'Bano Shaheen') + ' programme logo"></span>' +
      '<span class="eyebrow">YPDC UON flagship programme</span></div><h1 class="mt-16">' + esc(sh.batch || 'Bano Shaheen') + ' Registration</h1>' +
      '<p class="lead mt-16">' + esc(sh.message || 'Apply for the next ' + (sh.batch || 'Bano Shaheen') + ' batch.') + '</p>' +
      '<div class="panel mt-32"><div class="panel-head"><h3>' + esc(sh.batch || 'Bano Shaheen') + ' application</h3>' + statusBadge + '</div>' +
      '<div class="panel-body">' +
      (open
        ? '<form data-form="shaheen"><div class="form-grid">' +
          '<label class="field"><span>Full name</span><input name="name" required placeholder="e.g. Ayesha Khan" autocomplete="name"></label>' +
          '<label class="field"><span>Email address (Gmail)</span><input name="email" type="email" required placeholder="your.name@gmail.com" autocomplete="email"></label>' +
          '<label class="field"><span>Phone</span><input name="phone" placeholder="03xx-xxxxxxx" autocomplete="tel"></label>' +
          '<label class="field"><span>Department / Program</span><input name="department" required placeholder="e.g. BS Computer Science"></label>' +
          '<label class="field"><span>Semester</span><select name="semester" required><option value="">Select semester</option>' +
          [1,2,3,4,5,6,7,8].map(function (n) { return '<option>Semester ' + n + '</option>'; }).join('') + '</select></label>' +
          '<label class="field"><span>Password</span><input name="password" type="password" required placeholder="8+ characters, letters and a number" autocomplete="new-password"></label>' +
          '<label class="field"><span>Confirm password</span><input name="confirm" type="password" required autocomplete="new-password"></label>' +
          '<label class="field full"><span>Why do you want to join ' + esc(sh.batch || 'Bano Shaheen') + '?</span><textarea name="reason" placeholder="A short answer (a few lines)"></textarea></label>' +
          '</div>' +
          '<div class="pf-section"><span class="pf-sec-title">Required documents</span>' +
          '<p class="pf-sec-note mut">Har registration ke liye apni photo aur ID card ki tasveer lazmi hai — camera se lein ya gallery se chunein.</p>' +
          (App.registrationDocs ? App.registrationDocs() : '') +
          '</div>' +
          '<div class="field full" style="margin-bottom:0"><button class="btn btn-green btn-block" type="submit">Submit registration ' + I.arrow + '</button></div>' +
          '</form>' +
          '<div class="panel-note mt-16">Your account is created only after the YPDC admin approves your registration. Until then you cannot sign in. Use the same email and password to sign in once you are approved.</div>'
        : '<div class="empty-block"><b>Registration is closed right now</b>' +
          '<p class="mut mt-10">The ' + esc(sh.batch || 'Bano Shaheen') + ' registration window is not open at the moment. Follow the website news section or contact the YPDC office.</p>' +
          '<div class="btn-row mt-16"><a class="btn btn-outline btn-sm" href="#/contact">Contact YPDC office</a>' +
          '<a class="btn btn-green btn-sm" href="#/login">I already have an account</a></div></div>') +
      '</div></div></div>' +
      '<aside class="grid" style="gap:16px">' +
      '<div class="card"><span class="eyebrow">Batch status</span>' +
      '<div class="mt-16" style="font-size:.93rem">Batch: <b>' + esc(sh.batch || 'Bano Shaheen') + '</b><br>' +
      'Seats: <b data-live="shaheen-seats">' + (seats || '\u2014') + '</b><br>' +
      'Registrations received: <b data-live="shaheen-count">' + registered + '</b>' +
      (left === null ? '' : '<br>Seats remaining: <b>' + left + '</b>') + '</div></div>' +
      '<div class="card"><span class="eyebrow">How it works</span><ol class="num-list mt-16">' +
      '<li>Fill the registration form</li><li>Your request reaches the admin panel as <b>Pending</b></li>' +
      '<li>The admin checks it — existing YPDC members are shown with a tag</li>' +
      '<li>On approval your account is created and your dashboard opens</li></ol></div>' +
      '<div class="media-frame ratio-43"><img src="' + img('summit-hall.jpg') + '" alt="YPDC UON leadership programme"></div>' +
      '</aside></div></section>';
  };

  /* ---------- public teams directory (Batch G) ---------- */
  Public.teams = function () {
    return '<section class="page-head-basic"><div class="wrap">' +
      '<span class="eyebrow">YPDC UON teams</span>' +
      '<h1 class="mt-10">Teams &amp; team leaders</h1>' +
      '<p class="lead mt-16">Teams are YPDC’s working units. A team leader registers a team and gets a unique Team ID; members join a team and work with their leader. ' +
      'Team registration is separate from normal YPDC membership.</p>' +
      '<div class="btn-row mt-22">' +
      '<button class="btn btn-gold" data-action="team-leader-form">Register as Team Leader</button>' +
      '<button class="btn btn-outline" data-action="join-team-form">Register as Team Member</button>' +
      '</div></div></section>' +

      '<section class="section-sm"><div class="wrap">' +
      '<div class="flex-between flex-wrap dir-head">' +
      '<div><span class="eyebrow">Active teams</span><h2 class="mt-8">Teams you can join</h2>' +
      '<p class="mut mt-8" id="team-dir-count">Loading teams…</p></div>' +
      '<label class="field dir-search"><span>Search teams</span>' +
      '<input id="team-dir-search" type="search" placeholder="Team name or leader" maxlength="60"></label>' +
      '</div>' +
      '<div class="grid g3 mt-26" id="team-directory">' +
      '<div class="empty-block" style="grid-column:1/-1"><b>Loading teams…</b><p class="mut mt-6">Fetching the active team list from the YPDC server.</p></div>' +
      '</div>' +
      '<div class="team-flow mt-32">' +
      ['Register as Team Leader', 'Team ID (TEAM-001)', 'Admin approval', 'Members join', 'Team tasks'].map(function (n, i) {
        return (i ? '<span class="tf-arw">' + I.arrow + '</span>' : '') + '<span class="tf-node">' + esc(n) + '</span>';
      }).join('') + '</div>' +
      '</div></section>' +

      '<section class="section section-tint"><div class="wrap grid g23">' +
      '<div><span class="eyebrow">Questions</span><h2 class="mt-10">How team registration works</h2>' +
      '<div class="kv-list mt-22">' +
      '<div class="kv"><span>Who can register a team?</span><b>Any student, volunteer or member</b></div>' +
      '<div class="kv"><span>What do I get?</span><b>A unique Team ID (TEAM-001, TEAM-002 …)</b></div>' +
      '<div class="kv"><span>Who approves a team?</span><b>The YPDC admin team</b></div>' +
      '<div class="kv"><span>Where do I manage members?</span><b>Team Leader dashboard in your portal</b></div>' +
      '<div class="kv"><span>Is this the same as membership?</span><b>No — membership is separate (see Membership page)</b></div>' +
      '</div></div>' +
      '<div class="card"><span class="eyebrow">Team leader</span><h3 class="mt-10">Create and manage your own team</h3>' +
      '<p class="mut mt-10" style="font-size:.94rem">Register your team, get the Team ID, then approve members, assign tasks and track progress from your dashboard.</p>' +
      '<button class="btn btn-gold btn-block mt-22" data-action="team-leader-form">Register as Team Leader</button></div>' +
      '</div></section>';
  };

  ['about','directorates','cabinet','highlights','events','eventDetail','news',
   'achievements','membership','feedback','contact','induction','shaheen','teams'].forEach(function (k) {
    if (Public[k]) App.Public[k] = Public[k];
  });
})();

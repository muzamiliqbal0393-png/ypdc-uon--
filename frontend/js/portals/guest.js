(function () {
  'use strict';
  var PC = window.PC;
  var S = PC.S, A = PC.A, esc = PC.esc, fmt = PC.fmt, I = PC.I, img = PC.img, ini = PC.ini, PP = PC.PP;
  var NAV = PC.NAV, HERO = PC.HERO, QUICK = PC.QUICK, SEC = PC.SEC;
  var heroBlock = PC.heroBlock, stats = PC.stats, quickAccess = PC.quickAccess,
      focusPanel = PC.focusPanel, pageHead = PC.pageHead, table = PC.table,
      statusBadge = PC.statusBadge, pretty = PC.pretty, profileForm = PC.profileForm,
      taskRow = PC.taskRow;
  SEC.guest = {
    dashboard: function () {
      return heroBlock('guest') +
        stats([
          PC.statNum(S.directorates.length, 'Directorates', 'YPDC structure'),
          PC.statNum((window.YPDC.api && window.YPDC.api.counts && window.YPDC.api.counts.users) || S.people.length, 'Members in directory', 'Live records', { style: 'gold' }),
          PC.statNum(S.events.length, 'Events published', S.events.filter(function (e) { return e.status === 'Upcoming'; }).length + ' upcoming'),
          PC.statNum(S.highlights.length, 'Highlights & reports', 'Public content')
        ]) +
        '<section class="grid g23" style="align-items:start">' +
        focusPanel('guest') +
        quickAccess('guest') + '</section>' +
        '<div class="grid" style="gap:16px">' +
        '<div class="panel"><div class="panel-head"><h3>Public information</h3><a class="btn btn-xs btn-quiet" href="#/about">Open website</a></div>' +
        '<div class="panel-body" style="padding-top:6px;padding-bottom:6px">' + [
          ['About YPDC', 'Who we are, vision, mission and values', '#/about'],
          ['Directorates', 'Seven teams with focus areas and leads', '#/directorates'],
          ['Events', 'Upcoming and past activities with registration', '#/events'],
          ['Induction Drive', 'Apply for membership through the portal', '#/induction'],
          ['Achievements', 'Impact numbers and certificates', '#/achievements'],
          ['Highlights & Picks', 'Featured activities published by admin', '#/highlights']
        ].map(function (r) {
          return '<div class="list-row"><span class="av">' + esc(r[0].charAt(0)) + '</span><div class="txt"><b>' + esc(r[0]) + '</b><small>' + esc(r[1]) + '</small></div>' +
            '<a class="btn btn-xs btn-quiet" href="' + r[2] + '">Open</a></div>';
        }).join('') + '</div></div>' +
        '<div class="panel"><div class="panel-head"><h3>Upcoming public events</h3></div><div class="panel-body grid g2" style="gap:16px">' +
        S.events.filter(function (e) { return e.status === 'Upcoming'; }).slice(0, 2).map(function (e) {
          return '<div class="card card-tight card-flat" style="border:1px solid var(--line)"><span class="badge badge-info">' + esc(e.category) + '</span>' +
            '<b class="mt-10" style="display:block">' + esc(e.title) + '</b><div class="mut" style="font-size:.82rem">' + fmt(e.date) + ' · ' + esc(e.venue || e.location || '') + '</div>' +
            '<button class="btn btn-xs btn-green mt-16" data-action="register-event" data-id="' + e.id + '">Register</button></div>';
        }).join('') + '</div></div></div>';
    },
    about: function () { return PP.about(); },
    vision: function () {
      return pageHead('Guest / public portal', 'Vision & Mission', 'The purpose that drives YPDC UON.') +
        '<section class="grid g2"><div class="card"><span class="eyebrow">Vision</span><h3 class="mt-10">Our Vision</h3><p class="mut mt-10">' + esc(S.site.vision) + '</p></div>' +
        '<div class="card"><span class="eyebrow">Mission</span><h3 class="mt-10">Our Mission</h3><p class="mut mt-10">' + esc(S.site.mission) + '</p></div></section>' +
        '<section class="panel mt-22"><div class="panel-head"><h3>Core values</h3></div><div class="panel-body"><div class="chip-row">' +
        S.site.values.map(function (v) { return '<span class="chip">' + esc(v) + '</span>'; }).join('') + '</div></div></section>';
    },
    leadership: function () { return PP.cabinet(); },
    directorates: function () { return PP.directorates(); },
    projects: function () {
      return pageHead('Guest / public portal', 'Projects', 'Ongoing and completed YPDC UON projects.') +
        '<section class="grid g3">' + S.highlights.concat(S.highlights).slice(0, 3).map(function (h, i) {
          var titles = ['Digital Literacy for Schools', 'Campus Cleanliness Championship', 'Interfaith Harmony Week'];
          var descs = ['Weekend digital classes for three nearby schools delivered by student instructors.',
            'Inter-department cleanliness competition with weekly scoring and community participation.',
            'A week of dialogues, poster exhibitions and community engagement activities.'];
          return '<div class="card lift"><span class="badge badge-gold">Project ' + (i + 1) + '</span>' +
            '<h4 class="mt-16">' + titles[i] + '</h4><p class="mut mt-10" style="font-size:.9rem">' + descs[i] + '</p>' +
            '<div class="mut mt-16" style="font-size:.8rem">Directorate: ' + esc(S.directorates[i].name) + '</div></div>';
        }).join('') + '</section>' +
        '<div class="mt-22"><a class="btn btn-outline" href="#/highlights">Highlights &amp; Picks ' + I.arrow + '</a></div>';
    },
    events: function () { return PP.events(); },
    news: function () { return PP.news(); },
    achievements: function () { return PP.achievements(); },
    gallery: function () {
      return pageHead('Guest / public portal', 'Gallery', 'Moments from YPDC UON activities, events and community drives.') +
        '<section class="gallery">' + window.App.gallery().map(function (src) {
          return '<img src="' + src + '" alt="YPDC gallery">';
        }).join('') + '</section>';
    },
    publications: function () {
      return pageHead('Guest / public portal', 'Publications', 'Reports, newsletters and documents published by YPDC UON.') +
        '<section class="panel"><div class="panel-head"><h3>Document library</h3></div><div class="panel-body">' +
        '<p class="mut" style="padding:14px 0">No publications yet — reports, newsletters and documents appear here once the admin publishes them.</p></div></section>';
    },
    feedback: function () {
      return pageHead('Guest / public portal', 'Feedback / Comments', 'Share a suggestion, comment or feedback about YPDC UON.') +
        '<section>' + window.App.feedbackForm('Write your feedback below — it reaches the YPDC admin dashboard.', 'guest') + '</section>';
    }
  };
})();

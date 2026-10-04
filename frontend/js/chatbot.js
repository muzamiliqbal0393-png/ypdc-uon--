(function () {
  'use strict';

  var App = window.App;
  var Y = window.YPDC;
  var LOG_KEY = 'ypdc_chat_log_v1';
  var CFG_KEY = 'ypdc_chat_cfg_v1';

  function S() { return Y.state; }
  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmt(iso) {
    if (!iso) return '—';
    var p = String(iso).split('-');
    if (p.length < 3) return iso;
    return Number(p[2]) + ' ' + MONTHS[Number(p[1]) - 1] + ' ' + p[0];
  }
  function now() {
    var d = new Date();
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }
  function list(items, cls) {
    return '<ul' + (cls ? ' class="' + cls + '"' : '') + '>' + items.map(function (i) {
      return '<li>' + i + '</li>';
    }).join('') + '</ul>';
  }
  function upcoming(n) {
    return S().events.filter(function (e) { return e.status === 'Upcoming'; }).slice(0, n || 3);
  }
  function eventLine(e) {
    return '<b>' + esc(e.title) + '</b> — ' + [fmt(e.date), esc(e.time), esc(e.venue || e.location || '')].filter(Boolean).join(' · ');
  }
  function go(label, href) { return { label: label, href: href }; }
  function attLine() {
    var rows = S().attendance || [];
    var p = rows.filter(function (a) { return a.status === 'Present'; }).length;
    var a = rows.filter(function (a) { return a.status === 'Absent'; }).length;
    return (p + a) ? Math.round((p / (p + a)) * 100) + '%' : 'no records yet';
  }

  var INTENTS = [
    {
      id: 'greet', keys: ['hi', 'hello', 'hey', 'salam', 'assalam', 'aoa', 'hy', 'good morning', 'good evening'],
      reply: function () {
        return {
          text: 'Hello! 👋 I am the <b>YPDC UON Assistant</b> — Young Peace &amp; Development Corps, University of Narowal.<br>Events, membership, directorates, portals or contact — ask anything you like.',
          actions: [go('Upcoming events', '#/events'), go('How to join?', 'ask:how to join'), go('Directorates', 'ask:directorates')]
        };
      }
    },
    {
      id: 'who', keys: ['who are you', 'what are you', 'your name', 'tum kon', 'aap kon', 'bot', 'assistant', 'chatbot', 'real person'],
      reply: function () {
        return {
          text: 'I am the <b>YPDC UON assistant</b> — I answer from this website\'s own data.<br>Turn on AI mode from Settings ⚙️ and add your API key to get answers from a real AI model.',
          actions: [go('Open settings', { settings: true }), go('About YPDC', '#/about')]
        };
      }
    },
    {
      id: 'about', keys: ['about', 'ypdc kya', 'what is ypdc', 'who is ypdc', 'corps', 'introduce', 'tell me about'],
      reply: function () {
        var s = S().site;
        return {
          text: '<b>' + esc(s.name) + '</b> (' + esc(s.full) + ') — ' + esc(s.university) + '.<br>' + esc(s.aboutProse[0]),
          actions: [go('Read more', '#/about'), go('Vision & mission', '#/about')]
        };
      }
    },
    {
      id: 'vision', keys: ['vision', 'mission', 'purpose', 'maqsad', 'goal', 'aim'],
      reply: function () {
        var s = S().site;
        return {
          text: '<b>Vision:</b> ' + esc(s.vision) + '<br><br><b>Mission:</b> ' + esc(s.mission),
          actions: [go('About page', '#/about')]
        };
      }
    },
    {
      id: 'events', keys: ['event', 'events', 'upcoming', 'schedule', 'happening', 'summit', 'dialogue', 'workshop', 'kab', 'taqreeb'],
      reply: function () {
        var up = upcoming(4);
        if (!up.length) return { text: 'There are no upcoming events in the list right now — please check again later.' };
        return {
          text: 'There are <b>' + S().events.filter(function (e) { return e.status === 'Upcoming'; }).length + ' upcoming events</b>:<br>' +
            list(up.map(eventLine)) + 'Use the "Register" button on the event page to register.',
          actions: [go('All events', '#/events'), go('Register', '#/portal/student/registration')]
        };
      }
    },
    {
      id: 'join', keys: ['join', 'membership', 'member', 'apply', 'sign up', 'signup', 'enroll', 'enrol', 'kaise join', 'membership lena', 'shamil'],
      reply: function () {
        return {
          text: 'Joining YPDC is easy:<br>' +
            list(['See benefits and eligibility on the <b>Membership</b> page',
                  'fill the <b>Induction form</b> (name, program, directorate preference)',
                  'The admin reviews it — then your <b>Volunteer Portal</b> opens',
                  'After that you can register for events, take volunteer duties and earn certificates']),
          actions: [go('Membership info', '#/membership'), go('Induction form', '#/induction')]
        };
      }
    },
    {
      id: 'induction', keys: ['induction', 'drive', 'application', 'form', 'batch', 'intake', 'fall 2026', 'submit'],
      reply: function () {
        var d = S().inductionDrive;
        return {
          text: 'Induction drive <b>' + esc(d.batch) + '</b> — status: <b>' + esc(d.status) + '</b> (' + d.received + ' applications received).<br>The form takes 2 minutes: full name, program, semester, registration no, directorate preference and a short motivation text.',
          actions: [go('Open induction form', '#/induction')]
        };
      }
    },
    {
      id: 'directorates', keys: ['directorate', 'directorates', 'wing', 'department', 'departments', 'teams', 'units', 'shubay'],
      reply: function () {
        var d = S().directorates;
        return {
          text: 'YPDC has <b>' + d.length + ' directorates</b> — each with its own lead, team and focus area:<br>' +
            list(d.map(function (x) {
              return '<b>' + esc(x.name) + '</b> — ' + esc(x.focus) + ' (' + x.members + ' members)';
            })),
          actions: [go('Directorates page', '#/directorates')]
        };
      }
    },
    {
      id: 'volunteer', keys: ['volunteer', 'volunteering', 'serve', 'sewa', 'help out', 'community service'],
      reply: function () {
        var v = S().volunteer || [];
        return {
          text: 'Volunteering is the heart of YPDC — community drives, event duties and mentorship.<br>' +
            (v.length ? 'There are <b>' + v.length + ' volunteer records</b> in the system. ' : '') +
            'Track hours and duties from <b>Volunteer</b> in the Volunteer Portal.',
          actions: [go('Volunteer section', '#/portal/student/volunteer'), go('Events', '#/events')]
        };
      }
    },
    {
      id: 'login', keys: ['login', 'log in', 'sign in', 'portal', 'dashboard', 'password', 'account', 'username', 'andhar', 'kaise kholein'],
      reply: function () {
        var sess = S().session;
        return {
          text: (sess ? 'You are logged in as <b>' + esc(sess.role) + '</b>. ' : '') +
            'Enter your <b>YPDC email and password</b> on the login page — the portal for your role opens (Volunteer · General Member · Directorate · Faculty · Alumni). No account yet? Apply from the <b>Membership</b> page.',
          actions: [go('Portal Login', '#/login'), go(sess ? 'My dashboard' : 'Try Volunteer', sess ? '#/portal/' + sess.role.toLowerCase() + '/dashboard' : '#/login?role=student')]
        };
      }
    },
    {
      id: 'student', keys: ['certificate', 'attendance', 'my registration', 'my profile', 'hasrat', 'meri attendance', 'my tasks', 'report card'],
      reply: function () {
        var st = S().profiles.student;
        return {
          text: 'The Volunteer Portal gives you all of this:<br>' +
            list(['<b>Certificates</b> — issued and in process',
                  '<b>Attendance</b> — with the attendance eligibility requirement (80% or above)',
                  '<b>Event Registration</b> — register/cancel',
                  '<b>Volunteer</b>, <b>Achievements</b> and <b>Profile</b>']),
          actions: [go('Certificates', '#/portal/student/certificates'), go('Attendance', '#/portal/student/attendance')]
        };
      }
    },
    {
      id: 'admin', keys: ['admin', 'manage', 'analytics', 'content edit', 'permission', 'permissions', 'roles', 'induction database', 'users'],
      reply: function () {
        var an = S().analytics;
        return {
          text: 'The Admin Portal is a command center: <b>People Directory, Members, Directorates &amp; Posts, Faculty, Events, Applications DB, Analytics, Website Content, Cabinet Editor, Highlights, Roles &amp; Permissions</b> and <b>Activity Log</b>.<br>Right now analytics show ' + (an ? an.totalUsers + ' users, ' + an.pendingApprovals + ' pending approvals' : 'live metrics') + '.',
          actions: [go('Login as Admin', '#/login?role=admin'), go('Roles & permissions', '#/portal/admin/roles')]
        };
      }
    },
    {
      id: 'alumni', keys: ['alumni', 'graduate', 'mentorship', 'mentor', 'network', 'career', 'job', 'internship', 'naukri'],
      reply: function () {
        var n = (S().alumniNetwork || []).length, c = (S().careers || []).length;
        return {
          text: 'The Alumni Portal has <b>' + n + ' alumni</b> network, and <b>' + c + ' careers/internships</b> are open. Students can also request mentorship (with topic + program).',
          actions: [go('Alumni portal', '#/login?role=alumni'), go('Mentorship request', '#/portal/alumni/mentorship')]
        };
      }
    },
    {
      id: 'cabinet', keys: ['cabinet', 'president', 'general secretary', 'leadership', 'core team', 'office bearer', 'head', 'convenor'],
      reply: function () {
        var cb = S().cabinet || [];
        var rows = cb.slice(0, 5).map(function (p) { return '<b>' + esc(p.post) + '</b> — ' + esc(p.name); });
        return {
          text: 'YPDC cabinet (' + esc(S().cabinet_session || 'current session') + '):<br>' + list(rows),
          actions: [go('Cabinet page', '#/cabinet')]
        };
      }
    },
    {
      id: 'faculty', keys: ['faculty', 'teacher', 'adviser', 'advisor', 'staff', 'department head', 'ustad'],
      reply: function () {
        var f = S().people.filter(function (p) { return /faculty|advis/i.test(p.type || '') || /Faculty/i.test(p.type || ''); });
        return {
          text: 'Faculty members provide oversight for YPDC — proposal review, approvals and reports.' +
            (f.length ? '<br>' + list(f.slice(0, 4).map(function (p) { return '<b>' + esc(p.name) + '</b> — ' + esc(p.post || p.type); })) : ''),
          actions: [go('Faculty portal', '#/login?role=faculty')]
        };
      }
    },
    {
      id: 'contact', keys: ['contact', 'email', 'phone', 'number', 'address', 'office', 'location', 'kahan', 'timing', 'hours', 'reach', 'rabta'],
      reply: function () {
        var c = S().site.contact;
        return {
          text: '<b>Contact YPDC UON</b><br>' +
            list(['📧 <b>Email:</b> ' + esc(c.email), '☎️ <b>Phone:</b> ' + esc(c.phone), '📍 <b>Office:</b> ' + esc(c.office), '🕘 <b>Hours:</b> ' + esc(c.hours)]),
          actions: [go('Contact page', '#/contact'), { label: 'Feedback form', href: '#/feedback' }]
        };
      }
    },
    {
      id: 'fees', keys: ['fee', 'fees', 'dues', 'cost', 'charge', 'paid', 'free', 'paisa', 'kitna paisa', 'kharcha'],
      reply: function () {
        return {
          text: 'YPDC membership is <b>free for students</b> — no joining fee and no monthly dues. Events are free too because they are campus-based; only off-campus trips involve a shared cost (stated on the event page).',
          actions: [go('Membership', '#/membership')]
        };
      }
    },
    {
      id: 'news', keys: ['news', 'update', 'announcement', 'latest', 'khabar', 'new'],
      reply: function () {
        var n = (S().news || []).slice(0, 3);
        return {
          text: n.length ? 'Latest news:<br>' + list(n.map(function (x) { return '<b>' + esc(x.title) + '</b> — ' + fmt(x.date); })) : 'The news section will be updated soon.',
          actions: [go('News page', '#/news')]
        };
      }
    },
    {
      id: 'achievements', keys: ['achievement', 'award', 'recognition', 'winner', 'honor', 'inaam', 'result'],
      reply: function () {
        var a = (S().achievements || []).slice(0, 4);
        return {
          text: a.length ? 'YPDC achievements:<br>' + list(a.map(function (x) { return '<b>' + esc(x.title) + '</b> — ' + esc(x.meta || x.detail || ''); })) : 'Achievements page dekhein.',
          actions: [go('Achievements', '#/achievements')]
        };
      }
    },
    {
      id: 'feedback', keys: ['feedback', 'suggestion', 'complaint', 'review', 'comment', 'shikayat', 'issue', 'problem'],
      reply: function () {
        return {
          text: 'Feedback is always welcome — suggestions go to the admin dashboard where the team replies.<br>You can send it from the <b>Feedback / Comments</b> section in the Volunteer Portal or the public feedback page.',
          actions: [go('Give feedback', '#/feedback'), go('Contact team', '#/contact')]
        };
      }
    },
    {
      id: 'me', keys: ['my registration', 'am i registered', 'my events', 'meri registration', 'my certificates', 'my attendance'],
      reply: function () {
        var st = S(), sess = st.session;
        if (!sess) {
          return {
            text: 'You are not logged in right now. Open Portal Login and sign in to your role — then I can show your registrations, attendance and certificates.',
            actions: [go('Portal Login', '#/login')]
          };
        }
        var role = String(sess.role).toLowerCase();
        if (role === 'student') {
          var regs = st.registrations.filter(function (r) { return r.email === st.profiles.student.email; });
          return {
            text: '<b>' + esc(st.profiles.student.name) + '</b> (Volunteer)<br>' +
              list(['Registered events: <b>' + regs.length + '</b>', 'Attendance: <b>' + attLine() + '</b>', 'Certificates: <b>' + st.certificates.length + '</b>']),
            actions: [go('My dashboard', '#/portal/student/dashboard')]
          };
        }
        return {
          text: 'You are in the <b>' + esc(sess.role) + '</b> workspace. Open your dashboard, tasks or reports from the sidebar.',
          actions: [go('My dashboard', '#/portal/' + role + '/dashboard')]
        };
      }
    },
    {
      id: 'help', keys: ['help', 'what can you do', 'options', 'menu', 'guide', 'madad', 'kya kar sakte'],
      reply: function () {
        return {
          text: 'I can help with these:<br>' +
            list(['Upcoming events and their details', 'Membership / induction process', 'How the 7 directorates work', 'Portal login (7 roles)', 'Certificates, attendance, volunteer hours', 'Contact details and feedback']),
          actions: [go('Upcoming events', 'ask:upcoming events'), go('How to join?', 'ask:how to join'), go('Contact', 'ask:contact details')]
        };
      }
    },
    {
      id: 'thanks', keys: ['thanks', 'thank you', 'shukriya', 'thanx', 'jazak', 'great', 'nice'],
      reply: function () { return { text: 'Goodbye! 🌿 I am here whenever you need anything else.' }; }
    },
    {
      id: 'bye', keys: ['bye', 'goodbye', 'khuda hafiz', 'see you', 'allah hafiz'],
      reply: function () { return { text: 'Goodbye! Thank you for staying connected with YPDC UON. 💚' }; }
    }
  ];

  var FALLBACK = {
    text: 'I could not find an exact answer 🤔 — but I can help with these:<br>' +
      list(['Upcoming events', 'Membership / induction', 'Directorates', 'Portal login help', 'Contact details']),
    actions: [go('Upcoming events', 'ask:upcoming events'), go('How to join?', 'ask:how to join'),
              go('Contact', 'ask:contact details'), go('Talk to team', '#/contact')]
  };

  function normalise(q) {
    return ' ' + String(q || '').toLowerCase().replace(/[^a-z0-9\s\u0600-\u06FF]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  }
  function scoreIntent(intent, q) {
    var score = 0;
    intent.keys.forEach(function (k) {
      var key = k.toLowerCase();
      if (key.indexOf(' ') > -1) {
        if (q.indexOf(' ' + key + ' ') > -1) score += 3 + key.split(' ').length;
      } else {
        var re = new RegExp('\\b' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
        if (re.test(q)) score += key.length > 5 ? 2 : 1;
      }
    });
    return score;
  }
  function matchEvent(q) {
    var best = null, bestScore = 0;
    S().events.forEach(function (e) {
      var words = String(e.title).toLowerCase().split(' ');
      var hit = words.filter(function (w) { return w.length > 3 && q.indexOf(' ' + w) > -1; }).length;
      if (hit > bestScore) { bestScore = hit; best = e; }
    });
    return bestScore >= 2 ? best : null;
  }
  function answer(raw) {
    var q = normalise(raw);
    var ev = matchEvent(q);
    if (ev) {
      return {
        text: '<b>' + esc(ev.title) + '</b><br>' +
          list(['📅 ' + fmt(ev.date) + ' · ' + esc(ev.time), '📍 ' + esc(ev.venue || ev.location || ''),
                '🏷 ' + esc(ev.category) + ' · by ' + esc(ev.organizer),
                '👥 ' + ev.registered + ' / ' + ev.capacity + ' seats filled', esc(ev.desc || '')]),
        actions: [go('Event details', '#/event/' + ev.id), go('All events', '#/events')]
      };
    }
    var best = null, bestScore = 0;
    INTENTS.forEach(function (it) {
      var s = scoreIntent(it, q);
      if (s > bestScore) { bestScore = s; best = it; }
    });
    if (!best || bestScore === 0) return FALLBACK;
    return best.reply(q);
  }

  function cfg() {
    try { return JSON.parse(localStorage.getItem(CFG_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function saveCfg(c) { try { localStorage.setItem(CFG_KEY, JSON.stringify(c)); } catch (e) {} }
  function aiReady() { var c = cfg(); return !!(c.enabled && c.key && c.endpoint); }

  function siteContext() {
    var s = S().site, d = S().directorates, e = upcoming(4);
    return 'YPDC UON = Young Peace & Development Corps, University of Narowal (student-led corps).\n' +
      'Tagline: ' + s.tagline + '\nVision: ' + s.vision + '\nContact: ' + s.contact.email + ', ' + s.contact.phone + ', ' + s.contact.office + '\n' +
      'Directorates: ' + d.map(function (x) { return x.name; }).join(', ') + '\n' +
      'Upcoming events: ' + e.map(function (x) { return x.title + ' (' + fmt(x.date) + ', ' + x.location + ')'; }).join('; ') + '\n' +
      'Site pages: #/ #/about #/directorates #/cabinet #/events #/news #/achievements #/membership #/induction #/feedback #/contact and #/portal/<role>/<section>.';
  }
  function askAI(history) {
    var c = cfg();
    var msgs = [{ role: 'system', content: 'You are the YPDC UON website assistant. Answer in English, max 90 words, friendly and factual. Use only this site data:\n' + siteContext() }]
      .concat(history.slice(-6));
    return fetch(c.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + c.key },
      body: JSON.stringify({ model: c.model || 'gpt-4o-mini', messages: msgs, temperature: 0.3, max_tokens: 320 })
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (j) {
      var txt = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      if (!txt) throw new Error('empty response');
      return String(txt).trim();
    });
  }

  var ICON = {
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1.4-4.6A8 8 0 1 1 21 12Z"/><circle cx="9" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="12.5" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="1.1" fill="currentColor" stroke="none"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l16-8-6 16-3.2-6.6L4 12Z"/></svg>'
  };
  var CHIPS = [
    ['Upcoming events', 'ask:upcoming events'],
    ['How to join?', 'ask:how to join'],
    ['Directorates', 'ask:directorates'],
    ['Portal login', 'ask:portal login'],
    ['Contact', 'ask:contact details'],
    ['Fees?', 'ask:is there any fee']
  ];

  var log = [];
  var el = {};
  var busy = false;

  function loadLog() {
    try {
      var saved = JSON.parse(sessionStorage.getItem(LOG_KEY) || 'null');
      if (saved && saved.length) log = saved;
    } catch (e) {}
  }
  function saveLog() {
    try { sessionStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-24))); } catch (e) {}
  }

  function msgHTML(m) {
    var acts = (m.actions || []).map(function (a) {
      var val = typeof a.href === 'string' ? a.href : '';
      if (a.href && a.href.settings) return '<button type="button" data-chat-settings="1">' + esc(a.label) + '</button>';
      if (val.indexOf('ask:') === 0) return '<button type="button" data-chat-ask="' + esc(val.slice(4)) + '">' + esc(a.label) + '</button>';
      return '<a href="' + esc(val) + '" data-chat-go="' + esc(val) + '">' + esc(a.label) + '</a>';
    }).join('');
    return '<div class="msg ' + (m.role === 'me' ? 'me' : 'bot') + '">' +
      '<span class="av">' + (m.role === 'me' ? 'You' : 'Y') + '</span>' +
      '<div class="bubble">' + m.text +
      (acts ? '<div class="chat-acts">' + acts + '</div>' : '') +
      '<time>' + esc(m.time || now()) + '</time></div></div>';
  }
  function paint() {
    el.log.innerHTML = log.map(msgHTML).join('');
    el.log.scrollTop = el.log.scrollHeight;
  }
  function push(role, text, actions) {
    log.push({ role: role, text: text, actions: actions || [], time: now() });
    saveLog();
    paint();
  }
  function typing(on) {
    var t = el.log.querySelector('.msg.typing-wrap');
    if (on && !t) {
      el.log.insertAdjacentHTML('beforeend', '<div class="msg bot typing-wrap"><span class="av">Y</span><div class="bubble"><div class="typing"><i></i><i></i><i></i></div></div></div>');
      el.log.scrollTop = el.log.scrollHeight;
    } else if (!on && t) { t.remove(); }
  }

  function respond(userText) {
    if (busy) return;
    busy = true;
    push('me', esc(userText));
    typing(true);
    var delay = 380 + Math.min(700, userText.length * 14);

    var finish = function (text, actions) {
      typing(false);
      push('bot', text, actions);
      busy = false;
    };

    if (aiReady()) {
      var history = log.filter(function (m) { return m.role === 'me' || m.role === 'bot'; })
        .map(function (m) {
          return { role: m.role === 'me' ? 'user' : 'assistant', content: String(m.text).replace(/<[^>]+>/g, ' ') };
        });
      askAI(history).then(function (txt) {
        setTimeout(function () { finish(esc(txt).replace(/\n/g, '<br>')); }, Math.min(delay, 500));
      }).catch(function (err) {
        var local = answer(userText);
        setTimeout(function () {
          finish('<i>No answer from AI mode (' + esc(err.message) + ') — from the local assistant:</i><br><br>' + local.text, local.actions);
        }, 300);
      });
      return;
    }
    setTimeout(function () {
      var a = answer(userText);
      finish(a.text, a.actions);
    }, delay);
  }

  function open() {
    el.panel.classList.add('open');
    el.launcher.classList.add('hidden');
    if (!log.length) {
      push('bot', 'Hello! 👋 I am the <b>YPDC UON Assistant</b>.<br>Events, membership, directorates or portal login — what would you like to know?',
        [go('Upcoming events', 'ask:upcoming events'), go('How to join?', 'ask:how to join'), go('Contact', 'ask:contact details')]);
    }
    setTimeout(function () { if (el.input) el.input.focus(); }, 180);
  }
  function close() {
    el.panel.classList.remove('open');
    el.launcher.classList.remove('hidden');
    el.settings.classList.remove('open');
  }
  function toggle() { el.panel.classList.contains('open') ? close() : open(); }

  function fillSettings() {
    var c = cfg();
    el.sEnabled.checked = !!c.enabled;
    el.sKey.value = c.key || '';
    el.sModel.value = c.model || 'gpt-4o-mini';
    el.sEndpoint.value = c.endpoint || 'https://api.openai.com/v1/chat/completions';
  }
  function readSettings() {
    saveCfg({
      enabled: el.sEnabled.checked,
      key: el.sKey.value.trim(),
      model: el.sModel.value.trim() || 'gpt-4o-mini',
      endpoint: el.sEndpoint.value.trim() || 'https://api.openai.com/v1/chat/completions'
    });
  }

  function build() {
    var wrap = document.createElement('div');
    wrap.className = 'chat-root';
    wrap.innerHTML =
      '<button class="chat-launcher" type="button" aria-label="Open YPDC assistant">' + ICON.chat + '<span class="chat-dot"></span></button>' +
      '<section class="chat-panel" role="dialog" aria-label="YPDC assistant">' +
        '<header class="chat-head">' +
          '<span class="chat-avatar"><img src="' + App.img('logo-ypdc-mark.png') + '" alt="YPDC"></span>' +
          '<span class="chat-who"><b>YPDC Assistant</b><small><i></i> Online</small></span>' +
          '<button class="ch-ico" type="button" data-chat="settings" title="Assistant settings" aria-label="Settings">' + ICON.gear + '</button>' +
          '<button class="ch-ico" type="button" data-chat="reset" title="New chat" aria-label="New chat">' + ICON.reset + '</button>' +
          '<button class="ch-ico" type="button" data-chat="close" title="Close" aria-label="Close chat">' + ICON.close + '</button>' +
        '</header>' +
        '<div class="chat-log" id="chat-log" aria-live="polite"></div>' +
        '<div class="chat-chips">' + CHIPS.map(function (c) {
          return '<button type="button" data-chat-ask="' + esc(c[1].slice(4)) + '">' + esc(c[0]) + '</button>';
        }).join('') + '</div>' +
        '<form class="chat-form" autocomplete="off">' +
          '<input type="text" placeholder="Type your question…" aria-label="Message">' +
          '<button class="ch-send" type="submit" aria-label="Send">' + ICON.send + '</button>' +
        '</form>' +
        '<p class="chat-note">Answers come from this site\'s own data. For <b>AI mode</b>, add your API key from ⚙️ Settings.</p>' +
        '<div class="chat-settings">' +
          '<h5>Assistant settings</h5>' +
          '<p>Default: <b>offline assistant</b> (site data, no key needed). For real AI answers, add your own key below — the key is saved only in your browser.</p>' +
          '<label>AI mode (use API key)</label>' +
          '<label class="sw-row" style="display:flex;align-items:center;gap:9px;font-weight:600;font-size:12.5px">' +
            '<input type="checkbox" id="chat-ai-enabled" style="width:auto;height:auto"> <span>Enable real AI answers</span></label>' +
          '<label for="chat-ai-key">API key</label>' +
          '<input type="password" id="chat-ai-key" placeholder="sk-...">' +
          '<label for="chat-ai-model">Model</label>' +
          '<input type="text" id="chat-ai-model" placeholder="gpt-4o-mini">' +
          '<label for="chat-ai-endpoint">Endpoint</label>' +
          '<input type="text" id="chat-ai-endpoint" placeholder="https://api.openai.com/v1/chat/completions">' +
          '<div class="row"><button class="btn btn-green btn-sm" type="button" data-chat="save-settings">Save</button>' +
          '<button class="btn btn-outline btn-sm" type="button" data-chat="close-settings">Cancel</button></div>' +
          '<div class="hintbox" style="margin-top:14px"><b>Note:</b> this key is saved only in your browser. In production it is better to route it through the backend.</div>' +
        '</div>' +
      '</section>';
    document.body.appendChild(wrap);

    el.root = wrap;
    el.launcher = wrap.querySelector('.chat-launcher');
    el.panel = wrap.querySelector('.chat-panel');
    el.log = wrap.querySelector('.chat-log');
    el.form = wrap.querySelector('.chat-form');
    el.input = wrap.querySelector('.chat-form input');
    el.settings = wrap.querySelector('.chat-settings');
    el.sEnabled = wrap.querySelector('#chat-ai-enabled');
    el.sKey = wrap.querySelector('#chat-ai-key');
    el.sModel = wrap.querySelector('#chat-ai-model');
    el.sEndpoint = wrap.querySelector('#chat-ai-endpoint');
    fillSettings();
  }

  function bind() {
    el.launcher.addEventListener('click', open);
    el.form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = el.input.value.trim();
      if (!v) return;
      el.input.value = '';
      respond(v);
    });
    el.root.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-chat],[data-chat-ask],[data-chat-go],[data-chat-settings]') : null;
      if (!t) return;
      if (t.hasAttribute('data-chat-ask')) { respond(t.getAttribute('data-chat-ask')); return; }
      if (t.hasAttribute('data-chat-settings')) { el.settings.classList.add('open'); return; }
      if (t.hasAttribute('data-chat-go')) {
        e.preventDefault();
        var href = t.getAttribute('data-chat-go');
        close();
        if (href) { location.hash = href; if (App.render) App.render(); }
        return;
      }
      switch (t.getAttribute('data-chat')) {
        case 'close': close(); break;
        case 'reset':
          log = []; saveLog(); paint();
          push('bot', 'New chat started! 🌿 What would you like to know?', [go('Upcoming events', 'ask:upcoming events'), go('How to join?', 'ask:how to join')]);
          break;
        case 'settings': el.settings.classList.add('open'); break;
        case 'close-settings': el.settings.classList.remove('open'); break;
        case 'save-settings':
          readSettings();
          el.settings.classList.remove('open');
          push('bot', aiReady()
            ? 'AI mode is <b>on</b> — answers will now come from your API model. 🤖'
            : 'Settings saved — <b>offline assistant mode</b> is running (no API key).');
          break;
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && el.panel.classList.contains('open')) close();
    });
  }

  function boot() {
    build();
    bind();
    loadLog();
    if (log.length) paint();
    window.Chatbot = {
      open: open, close: close, toggle: toggle,
      ask: function (q) { respond(q); },
      answer: answer,
      intents: INTENTS,
      clear: function () { log = []; saveLog(); paint(); }
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

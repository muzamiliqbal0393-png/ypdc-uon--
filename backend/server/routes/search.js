'use strict';

/* Global search — ek hi endpoint, role ke hisaab se groups.
   Har query parameterized hai; collections (JSON) memory mein filter hoti hain. */

const express = require('express');
const { db, getCollections } = require('../db');
const A = require('../auth');
const S = require('../security');

const router = express.Router();

const PER_GROUP = 5;
const like = q => '%' + String(q).replace(/[\\%_]/g, m => '\\' + m) + '%';

const hit = (title, sub, link, type) => ({ title: String(title || '').slice(0, 160), sub: String(sub || '').slice(0, 200), link, type });

function collectionHits(list, keys, q, link, type) {
  const needle = q.toLowerCase();
  return (Array.isArray(list) ? list : [])
    .filter(row => keys.some(k => String(row && row[k] || '').toLowerCase().indexOf(needle) > -1))
    .slice(0, PER_GROUP)
    .map(row => hit(row.title || row.name || row.id, keys.map(k => row[k]).filter(Boolean).slice(1, 3).join(' · '), link(row), type));
}

router.get('/search', A.requireAuth, (req, res) => {
  const q = S.text(req.query.q, 80);
  if (q.length < 2) return res.status(400).json({ error: 'Type at least two letters to search.' });

  const isAdmin = req.user.role === 'admin';
  const c = getCollections();
  const groups = [];
  const push = (key, label, items) => { if (items.length) groups.push({ key, label, items }); };

  // ---- public content (har logged-in user ke liye) ----
  push('events', 'Events', collectionHits(c.events, ['title', 'venue', 'place', 'category', 'desc'], q, r => '#/event/' + r.id, 'Event'));
  push('news', 'News', collectionHits(c.news, ['title', 'body', 'text', 'tag'], q, () => '#/news', 'News'));
  push('achievements', 'Achievements', collectionHits(c.achievements, ['title', 'detail', 'desc'], q, () => '#/achievements', 'Achievement'));
  push('directorates', 'Directorates', collectionHits(c.directorates, ['name', 'lead', 'focus'], q, () => '#/directorates', 'Directorate'));

  // ---- portal work (jin roles ka kaam hai) ----
  if (['admin', 'directorate', 'faculty', 'member'].indexOf(req.user.role) > -1) {
    push('tasks', 'Tasks', collectionHits(c.tasks, ['title', 'owner', 'directorate', 'status'], q, () => '#/portal/' + req.user.role + '/tasks', 'Task'));
  }
  if (isAdmin) {
    push('reports', 'Reports', collectionHits(c.reports, ['title', 'period', 'by', 'status'], q, () => '#/portal/admin/dashboard', 'Report'));
    push('feedback', 'Feedback', collectionHits(c.feedback, ['message', 'name', 'type'], q, () => '#/portal/admin/dashboard', 'Feedback'));
  }

  // ---- people + applications: sirf admin ----
  if (isAdmin) {
    const users = db.prepare(`SELECT id, name, email, role, directorate, program FROM users
      WHERE lower(name) LIKE ? ESCAPE '\\' OR lower(email) LIKE ? ESCAPE '\\' OR lower(role) LIKE ? ESCAPE '\\' OR lower(COALESCE(directorate,'')) LIKE ? ESCAPE '\\'
      ORDER BY name LIMIT ?`).all(...Array(4).fill(like(q)), PER_GROUP);
    push('users', 'Users', users.map(u => hit(u.name, [u.role, u.directorate, u.email].filter(Boolean).join(' · '), '#/portal/admin/people', 'User')));

    const apps = db.prepare(`SELECT id, name, email, program, directorate, status FROM applications
      WHERE lower(name) LIKE ? ESCAPE '\\' OR lower(email) LIKE ? ESCAPE '\\' OR lower(COALESCE(directorate,'')) LIKE ? ESCAPE '\\' OR lower(status) LIKE ? ESCAPE '\\'
      ORDER BY created_at DESC LIMIT ?`).all(...Array(4).fill(like(q)), PER_GROUP);
    push('applications', 'Applications', apps.map(a => hit(a.name, [a.status, a.directorate, a.email].filter(Boolean).join(' · '), '#/portal/admin/applications', 'Application')));

    const sh = db.prepare(`SELECT id, name, email, program, status FROM shaheen
      WHERE lower(name) LIKE ? ESCAPE '\\' OR lower(email) LIKE ? ESCAPE '\\' OR lower(status) LIKE ? ESCAPE '\\'
      ORDER BY created_at DESC LIMIT ?`).all(...Array(3).fill(like(q)), PER_GROUP);
    push('shaheen', 'Bano Shaheen', sh.map(s => hit(s.name, [s.status, s.program, s.email].filter(Boolean).join(' · '), '#/portal/admin/shaheen', 'Registration')));

    const act = db.prepare(`SELECT at, action, email, role, detail FROM audit_log
      WHERE lower(action) LIKE ? ESCAPE '\\' OR lower(COALESCE(email,'')) LIKE ? ESCAPE '\\' OR lower(COALESCE(detail,'')) LIKE ? ESCAPE '\\'
      ORDER BY id DESC LIMIT ?`).all(...Array(3).fill(like(q)), PER_GROUP);
    push('activity', 'Activity log', act.map(a => hit(a.action, [a.email || 'guest', (a.at || '').slice(0, 10)].filter(Boolean).join(' · '), '#/portal/admin/log', 'Audit')));
  }

  // ---- messages: sirf apne ----
  const mine = db.prepare(`SELECT id, from_name, subject, body FROM messages
    WHERE to_id = ? AND (lower(subject) LIKE ? ESCAPE '\\' OR lower(body) LIKE ? ESCAPE '\\' OR lower(COALESCE(from_name,'')) LIKE ? ESCAPE '\\')
    ORDER BY created_at DESC LIMIT ?`).all(req.user.id, ...Array(3).fill(like(q)), PER_GROUP);
  push('messages', 'Messages', mine.map(m => hit(m.subject, String(m.body || '').slice(0, 90), '#/portal/' + req.user.role + '/messages', 'Message')));

  // ---- my registrations (admin ko sab) ----
  const regRows = isAdmin
    ? db.prepare(`SELECT r.id, r.email, r.event_id, r.status FROM registrations r ORDER BY r.created_at DESC LIMIT 200`).all()
    : db.prepare(`SELECT id, email, event_id, status FROM registrations WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`).all(req.user.id);
  const evBy = {};
  (c.events || []).forEach(e => { evBy[e.id] = e; });
  const regHits = regRows
    .map(r => ({ r, ev: evBy[r.event_id] }))
    .filter(x => (x.ev && String(x.ev.title || '').toLowerCase().indexOf(q.toLowerCase()) > -1) || String(x.r.email || '').toLowerCase().indexOf(q.toLowerCase()) > -1 || String(x.r.status || '').toLowerCase().indexOf(q.toLowerCase()) > -1)
    .slice(0, PER_GROUP)
    .map(x => hit(x.ev ? x.ev.title : x.r.event_id, [x.r.status, isAdmin ? x.r.email : 'You'].filter(Boolean).join(' · '), '#/portal/' + req.user.role + (isAdmin ? '/events' : '/registration'), 'Registration'));
  push('registrations', 'Registrations', regHits);

  // ---- documents (Batch G bhar raha hai; table mojood hai) ----
  const docs = db.prepare(`SELECT id, title, category FROM documents
    WHERE lower(title) LIKE ? ESCAPE '\\' OR lower(category) LIKE ? ESCAPE '\\' ORDER BY created_at DESC LIMIT ?`)
    .all(...Array(2).fill(like(q)), PER_GROUP);
  push('documents', 'Documents', docs.map(d => hit(d.title, d.category, '#/portal/' + req.user.role + (isAdmin ? '/documents' : '/dashboard'), 'Document')));

  const total = groups.reduce((n, g) => n + g.items.length, 0);
  res.json({ q, total, groups, searched: ['users', 'events', 'news', 'applications', 'messages', 'activity', 'documents', 'tasks', 'registrations'] });
});

module.exports = { router };

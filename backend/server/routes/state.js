'use strict';

const express = require('express');
const { db, now, getCollections, setCollection, audit } = require('../db');
const A = require('../auth');
const S = require('../security');
const { ipOf } = require('./auth');

const router = express.Router();

const rowApplication = r => ({
  id: r.id, name: r.name, email: r.email, program: r.program || '', directorate: r.directorate || '',
  department: r.department || '', semester: r.semester || '',
  photo: r.photo || '', idCard: r.id_card || '',
  motivation: r.motivation || '', date: (r.created_at || '').slice(0, 10), status: r.status,
  decidedBy: r.decided_by || null, decidedAt: r.decided_at || null
});
const rowRegistration = r => ({
  id: r.id, userId: r.user_id, email: r.email, eventId: r.event_id, status: r.status,
  date: (r.created_at || '').slice(0, 10)
});
const rowFeedback = r => ({
  id: r.id, name: r.name || '', email: r.email || '', role: r.role || '', type: r.type || 'General',
  message: r.message, status: r.status, date: (r.created_at || '').slice(0, 10)
});
const rowUser = u => ({
  id: u.id, name: u.name, email: u.email, role: u.role, directorate: u.directorate || '',
  program: u.program || '', phone: u.phone || '', status: u.is_active ? 'Active' : 'Disabled',
  lastLogin: u.last_login || null
});

router.get('/state', A.requireAuth, (req, res) => {
  const state = getCollections();
  const role = req.user.role;
  const staff = role === 'admin' || role === 'faculty';
  delete state.session;
  delete state.shaheenRoster;

  const all = db.prepare('SELECT * FROM registrations ORDER BY created_at DESC').all().map(rowRegistration);
  state.registrations = (staff || role === 'directorate')
    ? all
    : all.filter(r => r.userId === req.user.id || String(r.email).toLowerCase() === String(req.user.email).toLowerCase());

  state.applications = staff
    ? db.prepare('SELECT * FROM applications ORDER BY created_at DESC').all().map(rowApplication)
    : [];

  state.feedback = staff
    ? db.prepare('SELECT * FROM feedback ORDER BY created_at DESC').all().map(rowFeedback)
    : [];

  const profileOf = u => Object.assign({
    id: u.id, name: u.name, email: u.email, role: u.role,
    directorate: u.directorate || '', program: u.program || '', phone: u.phone || '',
    title: u.role.charAt(0).toUpperCase() + u.role.slice(1) + ' Workspace'
  }, A.metaOf(u));

  state.profiles = {};
  db.prepare('SELECT * FROM users ORDER BY role').all().forEach(u => { state.profiles[u.role] = profileOf(u); });
  state.profiles[req.user.role] = profileOf(req.user);
  state.me = profileOf(req.user);

  const typeOf = r => ({ student: 'Volunteer', member: 'General Member', directorate: 'Directorate', faculty: 'Faculty', admin: 'Admin', alumni: 'Alumni' })[r] || r;
  state.people = db.prepare('SELECT id, name, email, role, directorate, program, is_active FROM users ORDER BY role, name').all()
    .map(u => (staff || u.id === req.user.id
      ? { id: u.id, name: u.name, email: u.email, role: u.role, type: typeOf(u.role), directorate: u.directorate || '', program: u.program || '', status: u.is_active ? 'Active' : 'Disabled' }
      : { id: u.id, name: u.name, role: u.role, type: typeOf(u.role), directorate: u.directorate || '', program: u.program || '', status: u.is_active ? 'Active' : 'Disabled' }));

  state.accounts = staff ? db.prepare('SELECT * FROM users ORDER BY role, name').all().map(rowUser) : [];

  res.json({
    meta: { version: (state.meta && state.meta.version) || 1, servedAt: now(), backend: true },
    role,
    collections: state
  });
});

router.post('/state', A.requireAuth, A.csrfGuard, S.writeLimit, (req, res) => {
  const changed = (req.body && req.body.changed) || {};
  const keys = Object.keys(changed);
  if (!keys.length) return res.json({ ok: true, saved: [] });
  if (keys.length > 40) return res.status(400).json({ error: 'Too many collections at once.' });

  const saved = [], denied = [];
  const tx = db.transaction(() => {
    for (const key of keys) {
      if (!/^[A-Za-z][A-Za-z0-9]{0,30}$/.test(key)) { denied.push({ key, why: 'bad key' }); continue; }
      if (!S.canWrite(req.user.role, key)) { denied.push({ key, why: 'role ' + req.user.role + ' is not allowed' }); continue; }

      if (key === 'applications') { saveApplications(changed[key], req); }
      else if (key === 'registrations') { saveRegistrations(changed[key], req); }
      else if (key === 'feedback') { saveFeedback(changed[key], req); }
      else { setCollection(key, changed[key], req.user.email); }

      saved.push(key);
      audit({
        action: 'write', user_id: req.user.id, email: req.user.email, role: req.user.role,
        target: key, ip: ipOf(req),
        detail: Array.isArray(changed[key]) ? changed[key].length + ' records' : 'object'
      });
    }
  });
  tx();

  if (denied.length) return res.status(207).json({ ok: true, saved, denied });
  res.json({ ok: true, saved });
});

function saveApplications(list, req) {
  if (!Array.isArray(list)) return;
  const upsert = db.prepare(`INSERT INTO applications (id, name, email, program, directorate, motivation, status, decided_by, decided_at, created_at)
    VALUES (@id, @name, @email, @program, @directorate, @motivation, @status, @decided_by, @decided_at, @created_at)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, email=excluded.email, program=excluded.program,
      directorate=excluded.directorate, motivation=excluded.motivation, status=excluded.status,
      decided_by=excluded.decided_by, decided_at=excluded.decided_at`);
  const known = new Set(db.prepare('SELECT id FROM applications').all().map(r => r.id));
  list.slice(0, 2000).forEach((a, i) => {
    if (!a || !a.id) return;
    const fresh = !known.has(a.id);
    upsert.run({
      id: S.text(a.id, 64),
      name: S.text(a.name, 120) || 'Unknown',
      email: S.text(a.email, 120),
      program: S.text(a.program, 80),
      directorate: S.text(a.directorate, 80),
      motivation: S.text(a.motivation, 1000),
      status: ['New', 'Shortlisted', 'Approved', 'Rejected'].includes(a.status) ? a.status : 'New',
      decided_by: a.decidedBy ? S.text(a.decidedBy, 120) : null,
      decided_at: a.decidedAt || (fresh ? null : now()),
      created_at: a.date ? new Date(a.date).toISOString() : now()
    });
    if (fresh) audit({ action: 'application-create', user_id: req.user.id, email: req.user.email, role: req.user.role, target: 'applications', record_id: a.id, detail: a.name + ' · ' + a.directorate });
    else if (a.status && a.status !== 'New') audit({ action: 'application-' + a.status.toLowerCase(), user_id: req.user.id, email: req.user.email, role: req.user.role, target: 'applications', record_id: a.id, detail: a.name });
  });
  const ids = new Set(list.map(a => a && a.id).filter(Boolean));
  for (const r of db.prepare('SELECT id FROM applications').all()) {
    if (!ids.has(r.id)) { db.prepare('DELETE FROM applications WHERE id = ?').run(r.id); audit({ action: 'delete', user_id: req.user.id, email: req.user.email, role: req.user.role, target: 'applications', record_id: r.id }); }
  }
}

function saveRegistrations(list, req) {
  if (!Array.isArray(list)) return;
  const upsert = db.prepare(`INSERT INTO registrations (id, user_id, email, event_id, status, created_at)
    VALUES (@id, @user_id, @email, @event_id, @status, @created_at)
    ON CONFLICT(id) DO UPDATE SET status=excluded.status, email=excluded.email, event_id=excluded.event_id`);
  list.slice(0, 5000).forEach(r => {
    if (!r || !r.id) return;
    upsert.run({
      id: S.text(r.id, 64), user_id: S.text(r.userId || req.user.id, 64),
      email: S.text(r.email || req.user.email, 120), event_id: S.text(r.eventId, 64),
      status: S.text(r.status, 40) || 'Registered', created_at: r.date ? new Date(r.date).toISOString() : now()
    });
  });
  const ids = new Set(list.map(r => r && r.id).filter(Boolean));
  const mine = req.user.role === 'admin' ? db.prepare('SELECT id FROM registrations').all()
    : db.prepare('SELECT id FROM registrations WHERE user_id = ?').all(req.user.id);
  for (const row of mine) {
    if (!ids.has(row.id)) { db.prepare('DELETE FROM registrations WHERE id = ?').run(row.id); audit({ action: 'delete', user_id: req.user.id, email: req.user.email, role: req.user.role, target: 'registrations', record_id: row.id }); }
  }
}

function saveFeedback(list, req) {
  if (!Array.isArray(list)) return;
  const upsert = db.prepare(`INSERT INTO feedback (id, name, email, role, type, message, status, created_at)
    VALUES (@id, @name, @email, @role, @type, @message, @status, @created_at)
    ON CONFLICT(id) DO UPDATE SET status=excluded.status, message=excluded.message`);
  list.slice(0, 2000).forEach(f => {
    if (!f || !f.id || !f.message) return;
    upsert.run({
      id: S.text(f.id, 64), name: S.text(f.name, 120), email: S.text(f.email, 120), role: S.text(f.role, 40),
      type: S.text(f.type, 60) || 'General', message: S.text(f.message, 2000),
      status: S.text(f.status, 40) || 'New', created_at: f.date ? new Date(f.date).toISOString() : now()
    });
  });
}

module.exports = { router };


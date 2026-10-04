'use strict';

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { db, now, getCollections, audit, bcrypt } = require('../db');
const A = require('../auth');
const mail = require('../email');
const N = require('../notify');
const S = require('../security');
const { ipOf } = require('./auth');

const router = express.Router();
const rid = p => p + '-' + crypto.randomBytes(6).toString('hex');

const PUBLIC_CONTENT_KEYS = [
  'site', 'contact', 'portals', 'gallery', 'news', 'highlights', 'achievements',
  'values', 'faqs', 'partners', 'testimonials', 'timeline', 'events',
  'directorates', 'cabinet', 'inductionDrive', 'shaheen'
];

router.get('/public/site', (req, res) => {
  const all = getCollections();
  const content = {};
  PUBLIC_CONTENT_KEYS.forEach(k => { if (all[k] !== undefined) content[k] = all[k]; });
  res.set('Cache-Control', 'public, max-age=20');
  res.json({
    ok: true,
    content,
    counts: {
      users: db.prepare('SELECT COUNT(*) c FROM users WHERE is_active = 1').get().c,
      events: (content.events || []).length,
      applications: db.prepare('SELECT COUNT(*) c FROM applications').get().c
    },
    servedAt: now()
  });
});

router.post('/public/apply', S.writeLimit, (req, res) => {
  const b = req.body || {};
  const name = S.text(b.name, 120);
  const email = S.text(b.email, 120).toLowerCase();
  const program = S.text(b.program, 80);
  const directorate = S.text(b.directorate, 80);
  const motivation = S.text(b.motivation, 1000);
  const department = S.text(b.department, 120);
  const semester = S.text(b.semester, 40);
  const photo = S.text(b.photo, 300);
  const idCard = S.text(b.idCard, 300);

  if (name.length < 3) return res.status(400).json({ error: 'Enter your full name.' });
  if (!S.isEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (!department) return res.status(400).json({ error: 'Enter your department / program.' });
  if (!semester) return res.status(400).json({ error: 'Select your semester.' });
  if (!S.isUploadPath(photo)) return res.status(400).json({ error: 'Please upload your photograph (camera or gallery).' });
  if (!S.isUploadPath(idCard)) return res.status(400).json({ error: 'Please upload a picture of your ID card.' });
  if (!program) return res.status(400).json({ error: 'Select program / semester.' });
  if (!directorate) return res.status(400).json({ error: 'Select a directorate.' });
  if (motivation.length < 10) return res.status(400).json({ error: 'Motivation must be at least 10 characters.' });

  const dup = db.prepare("SELECT id FROM applications WHERE email = ? COLLATE NOCASE AND status IN ('New','Shortlisted','Approved')").get(email);
  if (dup) return res.status(409).json({ error: 'An application with this email already exists.', id: dup.id });

  const id = rid('ap');
  db.prepare(`INSERT INTO applications (id, name, email, program, department, semester, photo, id_card,
              directorate, motivation, status, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'New', ?)`)
    .run(id, name, email, program, department, semester, photo, idCard, directorate, motivation, now());

  const drive = getCollections().inductionDrive || {};
  const total = db.prepare('SELECT COUNT(*) c FROM applications').get().c;
  drive.received = total;
  require('../db').setCollection('inductionDrive', drive, 'system');

  mail.sendTemplate('applicationReceived', email, { name, id, batch: (drive.batch || 'YPDC UON') });
  N.createFor(N.audienceIds('role:admin'), { title: 'New induction application', body: name + ' applied for ' + directorate + '.', category: 'application', link: '#/portal/admin/applications' });
  audit({ action: 'application-submit', email, role: 'public', target: 'applications', record_id: id, detail: name + ' · ' + directorate, ip: ipOf(req) });
  res.status(201).json({ ok: true, id, message: 'Application submitted. The admin will review it.' });
});

router.post('/public/feedback', S.writeLimit, (req, res) => {
  const b = req.body || {};
  const message = S.text(b.message, 2000);
  const email = S.text(b.email, 120).toLowerCase();
  if (message.length < 5) return res.status(400).json({ error: 'Please write your feedback in a bit more detail.' });
  if (email && !S.isEmail(email)) return res.status(400).json({ error: 'Email does not look valid.' });

  const id = rid('fb');
  db.prepare(`INSERT INTO feedback (id, name, email, role, type, message, status, created_at)
              VALUES (?, ?, ?, ?, ?, ?, 'New', ?)`)
    .run(id, S.text(b.name, 120) || 'Guest', email, S.text(b.role, 40), S.text(b.type, 60) || 'General', message, now());
  audit({ action: 'feedback-submit', email, role: 'public', target: 'feedback', record_id: id, ip: ipOf(req) });
  N.createFor(N.audienceIds('role:admin'), { title: 'New feedback received', body: (S.text(b.name, 120) || 'A guest') + ' sent feedback from the public page.', category: 'system', link: '#/portal/admin/dashboard' });
  res.status(201).json({ ok: true, id });
});

const SHAHEEN_DEFAULTS = { open: false, batch: 'Bano Shaheen', seats: 10, message: 'Bano Shaheen is YPDC UON\u2019s flagship youth leadership programme.' };

function shaheenSettings() {
  const stored = (getCollections().shaheen || {});
  return Object.assign({}, SHAHEEN_DEFAULTS, stored);
}

const rowShaheen = r => ({
  id: r.id, name: r.name, email: r.email, phone: r.phone || '', program: r.program || '',
  department: r.department || '', semester: r.semester || '',
  photo: r.photo || '', idCard: r.id_card || '',
  reason: r.reason || '', status: r.status,
  existingMember: !!r.existing_member, userId: r.user_id || null,
  decidedBy: r.decided_by || null, decidedAt: r.decided_at || null,
  date: (r.created_at || '').slice(0, 10)
});

router.get('/public/shaheen', (req, res) => {
  const s = shaheenSettings();
  const rows = db.prepare('SELECT status, COUNT(*) c FROM shaheen GROUP BY status').all();
  const count = st => (rows.find(r => r.status === st) || { c: 0 }).c;
  res.json({
    ok: true,
    open: !!s.open,
    batch: S.text(s.batch, 60) || 'Bano Shaheen',
    seats: S.int(s.seats, 10),
    message: S.text(s.message, 600),
    registered: count('Pending') + count('Approved'),
    approved: count('Approved')
  });
});

router.post('/public/shaheen/register', S.shaheenLimit, (req, res) => {
  const b = req.body || {};
  const settings = shaheenSettings();
  if (!settings.open) return res.status(403).json({ error: 'Shaheen registration is closed right now.' });

  const name = S.text(b.name, 120);
  const email = S.text(b.email, 120).toLowerCase();
  const password = String(b.password || '');
  if (name.length < 3) return res.status(400).json({ error: 'Please enter your full name.' });
  if (!S.isEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  const pwProblem = S.passwordProblem(password);
  if (pwProblem) return res.status(400).json({ error: pwProblem });
  if (b.confirm !== undefined && b.confirm !== password) return res.status(400).json({ error: 'The two passwords do not match.' });

  const photo = S.text(b.photo, 300);
  const idCard = S.text(b.idCard, 300);
  const department = S.text(b.department || b.program, 120);
  const semester = S.text(b.semester, 40);
  if (!department) return res.status(400).json({ error: 'Enter your department / program.' });
  if (!semester) return res.status(400).json({ error: 'Select your semester.' });
  if (!S.isUploadPath(photo)) return res.status(400).json({ error: 'Please upload your photograph (camera or gallery).' });
  if (!S.isUploadPath(idCard)) return res.status(400).json({ error: 'Please upload a picture of your ID card.' });

  const known = db.prepare('SELECT id, status FROM shaheen WHERE email = ?').get(email);
  if (known && known.status !== 'Rejected') {
    return res.status(409).json({ error: 'This email has already registered for Shaheen. The admin will review it.' });
  }

  const existing = A.findUserByEmail(email);
  const id = known ? known.id : rid('sh');
  const hash = bcrypt.hashSync(password, 10);
  if (known) {
    db.prepare("UPDATE shaheen SET name=?, phone=?, program=?, department=?, semester=?, photo=?, id_card=?, reason=?, password_hash=?, status='Pending', existing_member=?, created_at=? WHERE id=?")
      .run(name, S.text(b.phone, 30), S.text(b.program, 80), department, semester, photo, idCard, S.text(b.reason, 800), hash, existing ? 1 : 0, now(), id);
  } else {
    db.prepare("INSERT INTO shaheen (id, name, email, phone, program, department, semester, photo, id_card, reason, password_hash, existing_member, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .run(id, name, email, S.text(b.phone, 30), S.text(b.program, 80), department, semester, photo, idCard, S.text(b.reason, 800), hash, existing ? 1 : 0, now());
  }
  mail.sendTemplate('applicationReceived', email, { name, id, batch: settings.batch || 'Bano Shaheen' });
  N.createFor(N.audienceIds('role:admin'), { title: 'New Bano Shaheen registration', body: name + ' registered' + (existing ? ' (existing YPDC member)' : '') + '.', category: 'application', link: '#/portal/admin/shaheen' });
  audit({ action: 'shaheen-register', email, role: 'public', target: 'shaheen', record_id: id, detail: name + (existing ? ' · existing YPDC account' : ' · new applicant'), ip: ipOf(req) });
  res.status(201).json({
    ok: true,
    message: 'Registration received. Your account is created after the YPDC admin approves your registration — you will be able to sign in with this email and password then.'
  });
});

router.get('/admin/emails', A.requireAdmin, (req, res) => {
  res.json({
    smtp: mail.smtpConfigured(),
    devPreview: mail.devPreview(),
    from: mail.FROM,
    emails: mail.recent(Math.min(S.int(req.query.limit, 50), 200))
  });
});

router.get('/admin/shaheen', A.requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM shaheen ORDER BY created_at DESC').all();
  const roster = (getCollections().shaheenRoster || []);
  const byEmail = {};
  rows.forEach(r => { byEmail[String(r.email).toLowerCase()] = r; });
  res.json({
    settings: shaheenSettings(),
    roster: roster.map(x => {
      const hit = byEmail[String(x.email || '').toLowerCase()];
      return {
        name: x.name || '', email: String(x.email || '').toLowerCase(), note: x.note || '',
        registered: !!hit, status: hit ? hit.status : 'Not registered yet',
        existingMember: hit ? !!hit.existing_member : false
      };
    }),
    registrations: rows.map(rowShaheen),
    counts: {
      total: rows.length,
      pending: rows.filter(r => r.status === 'Pending').length,
      approved: rows.filter(r => r.status === 'Approved').length,
      rejected: rows.filter(r => r.status === 'Rejected').length,
      existing: rows.filter(r => r.existing_member).length,
      fresh: rows.filter(r => !r.existing_member).length
    }
  });
});

router.post('/admin/shaheen/settings', A.requireAdmin, A.csrfGuard, (req, res) => {
  const b = req.body || {};
  const next = Object.assign(shaheenSettings(), {
    open: b.open === undefined ? shaheenSettings().open : !!b.open,
    batch: S.text(b.batch, 60) || shaheenSettings().batch,
    seats: S.int(b.seats, shaheenSettings().seats),
    message: b.message === undefined ? shaheenSettings().message : S.text(b.message, 600)
  });
  require('../db').setCollection('shaheen', next, req.user.email);
  audit({ action: 'shaheen-settings', user_id: req.user.id, email: req.user.email, role: req.user.role, target: 'shaheen', detail: next.open ? 'registration open' : 'registration closed', ip: ipOf(req) });
  res.json({ ok: true, settings: next });
});

router.post('/admin/shaheen/roster', A.requireAdmin, A.csrfGuard, (req, res) => {
  const list = Array.isArray(req.body && req.body.list) ? req.body.list : [];
  const clean = list.slice(0, 200).map(x => ({
    name: S.text(x && x.name, 120),
    email: S.text(x && x.email, 120).toLowerCase(),
    note: S.text(x && x.note, 160)
  })).filter(x => x.email && S.isEmail(x.email));
  require('../db').setCollection('shaheenRoster', clean, req.user.email);
  audit({ action: 'shaheen-roster', user_id: req.user.id, email: req.user.email, role: req.user.role, target: 'shaheen', detail: clean.length + ' expected members', ip: ipOf(req) });
  res.json({ ok: true, roster: clean });
});

router.post('/admin/shaheen/:id/approve', A.requireAdmin, A.csrfGuard, (req, res) => {
  const row = db.prepare('SELECT * FROM shaheen WHERE id = ?').get(S.text(req.params.id, 64));
  if (!row) return res.status(404).json({ error: 'This registration does not exist.' });
  if (row.status === 'Approved') return res.status(400).json({ error: 'This registration is already approved.' });

  let userId = row.user_id;
  const existing = A.findUserByEmail(row.email);
  if (existing) {
    userId = existing.id;
  } else {
    userId = rid('u');
    const t = db.transaction(() => {
      db.prepare(`INSERT INTO users (id, name, email, role, directorate, program, phone, password_hash, is_active, created_at)
                  VALUES (?, ?, ?, 'student', ?, ?, ?, ?, 1, ?)`)
        .run(userId, row.name, row.email, S.text(req.body && req.body.directorate, 80), row.program || '', row.phone || '', row.password_hash, now());
      audit({ action: 'user-register', user_id: req.user.id, email: row.email, role: 'student', target: 'users', record_id: userId, detail: row.name + ' · approved from Shaheen', ip: ipOf(req) });
    });
    t();
  }

  db.prepare("UPDATE shaheen SET status='Approved', user_id=?, decided_by=?, decided_at=? WHERE id=?")
    .run(userId, req.user.email, now(), row.id);
  mail.sendTemplate('applicationApproved', row.email, { name: row.name, batch: (getCollections().shaheen || {}).batch || 'Bano Shaheen' });
  N.create(userId, { title: 'Your Bano Shaheen application is approved', body: 'Your account is ready — sign in whenever you like.', category: 'application', link: '#/login', by: req.user.email });
  audit({ action: 'shaheen-approve', user_id: req.user.id, email: row.email, role: req.user.role, target: 'shaheen', record_id: row.id, detail: existing ? 'linked to an existing account' : 'new volunteer account created', ip: ipOf(req) });

  res.json({ ok: true, userId, account: existing ? 'linked' : 'created' });
});

router.post('/admin/shaheen/:id/reject', A.requireAdmin, A.csrfGuard, (req, res) => {
  const row = db.prepare('SELECT * FROM shaheen WHERE id = ?').get(S.text(req.params.id, 64));
  if (!row) return res.status(404).json({ error: 'This registration does not exist.' });
  db.prepare("UPDATE shaheen SET status='Rejected', decided_by=?, decided_at=? WHERE id=?")
    .run(req.user.email, now(), row.id);
  mail.sendTemplate('applicationRejected', row.email, { name: row.name, batch: (getCollections().shaheen || {}).batch || 'Bano Shaheen', reason: S.text(req.body && req.body.reason, 300) });
  if (row.user_id) N.create(row.user_id, { title: 'Update on your Bano Shaheen application', body: 'Your application could not be accepted this time.', category: 'application', link: '#/shaheen', by: req.user.email });
  audit({ action: 'shaheen-reject', user_id: req.user.id, email: row.email, role: req.user.role, target: 'shaheen', record_id: row.id, detail: row.name, ip: ipOf(req) });
  res.json({ ok: true });
});

router.delete('/admin/shaheen/:id', A.requireAdmin, A.csrfGuard, (req, res) => {
  const row = db.prepare('SELECT * FROM shaheen WHERE id = ?').get(S.text(req.params.id, 64));
  if (!row) return res.status(404).json({ error: 'This registration does not exist.' });
  db.prepare('DELETE FROM shaheen WHERE id = ?').run(row.id);
  audit({ action: 'shaheen-delete', user_id: req.user.id, email: row.email, role: req.user.role, target: 'shaheen', record_id: row.id, detail: row.name, ip: ipOf(req) });
  res.json({ ok: true });
});

router.post('/register-event', A.requireAuth, A.csrfGuard, (req, res) => {
  const eventId = S.text(req.body && req.body.eventId, 64);
  if (!S.isId(eventId)) return res.status(400).json({ error: 'Invalid event id.' });

  const ev = (getCollections().events || []).find(e => e.id === eventId);
  if (!ev) return res.status(404).json({ error: 'This event does not exist.' });
  if (ev.status && ev.status !== 'Upcoming') return res.status(400).json({ error: 'Registration for this event is closed.' });

  const has = db.prepare('SELECT id FROM registrations WHERE user_id = ? AND event_id = ?').get(req.user.id, eventId);
  if (has) return res.status(409).json({ error: 'You are already registered.', id: has.id });

  const id = rid('rg');
  db.prepare(`INSERT INTO registrations (id, user_id, email, event_id, status, created_at)
              VALUES (?, ?, ?, ?, 'Registered', ?)`).run(id, req.user.id, req.user.email, eventId, now());
  mail.sendTemplate('eventRegistered', req.user.email, { name: req.user.name, event: ev.title, date: ev.date, venue: ev.venue || ev.place });
  N.create(req.user.id, { title: 'Registered — ' + ev.title, body: (ev.date || '') + (ev.venue || ev.place ? ' · ' + (ev.venue || ev.place) : ''), category: 'event', link: '#/portal/' + req.user.role + '/events', by: req.user.email });
  audit({ action: 'event-register', user_id: req.user.id, email: req.user.email, role: req.user.role, target: 'registrations', record_id: id, detail: ev.title, ip: ipOf(req) });
  res.status(201).json({ ok: true, id, event: ev.title });
});

router.get('/admin/summary', A.requireAdmin, (req, res) => {
  const c = getCollections();
  const one = (sql, ...args) => db.prepare(sql).get(...args).c;
  const byStatus = db.prepare('SELECT status, COUNT(*) c FROM applications GROUP BY status').all();

  res.json({
    servedAt: now(),
    users: {
      total: one('SELECT COUNT(*) c FROM users'),
      active: one('SELECT COUNT(*) c FROM users WHERE is_active = 1'),
      byRole: db.prepare('SELECT role, COUNT(*) c FROM users GROUP BY role').all(),
      loginsToday: one("SELECT COUNT(*) c FROM audit_log WHERE action LIKE '%login' AND ok = 1 AND substr(at,1,10) = ?", now().slice(0, 10))
    },
    applications: {
      total: one('SELECT COUNT(*) c FROM applications'),
      new: one("SELECT COUNT(*) c FROM applications WHERE status = 'New'"),
      shortlisted: one("SELECT COUNT(*) c FROM applications WHERE status = 'Shortlisted'"),
      approved: one("SELECT COUNT(*) c FROM applications WHERE status = 'Approved'"),
      rejected: one("SELECT COUNT(*) c FROM applications WHERE status = 'Rejected'"),
      byStatus,
      recent: db.prepare('SELECT * FROM applications ORDER BY created_at DESC LIMIT 5').all()
        .map(r => ({ id: r.id, name: r.name, directorate: r.directorate, status: r.status, date: r.created_at.slice(0, 10) }))
    },
    events: {
      total: (c.events || []).length,
      upcoming: (c.events || []).filter(e => e.status === 'Upcoming').length,
      registrations: one('SELECT COUNT(*) c FROM registrations')
    },
    feedback: {
      total: one('SELECT COUNT(*) c FROM feedback'),
      new: one("SELECT COUNT(*) c FROM feedback WHERE status = 'New'")
    },
    site: {
      members: (c.people || []).length,
      directorates: (c.directorates || []).length,
      tasks: (c.tasks || []).length,
      notifications: (c.notifications || []).length,
      auditEntries: one('SELECT COUNT(*) c FROM audit_log')
    }
  });
});

/* ---- dashboard charts: sab series asli DB se (koi dummy data nahi) ---- */
const ROLE_ORDER = ['student', 'member', 'directorate', 'faculty', 'alumni', 'admin'];
const ROLE_LABEL = { student: 'Volunteers', member: 'General Members', directorate: 'Directorate', faculty: 'Faculty', alumni: 'Alumni', admin: 'Admins' };
const APP_STATUS_ORDER = ['New', 'Shortlisted', 'Approved', 'Rejected'];
const MONTH_LABEL = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthKeys(count) {
  const out = [];
  const d = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
    out.push({ key: x.toISOString().slice(0, 7), label: MONTH_LABEL[x.getUTCMonth()] + ' ' + String(x.getUTCFullYear()).slice(2) });
  }
  return out;
}
const monthExpr = col => "substr(" + col + ", 1, 7)";            // created_at ISO hai

router.get('/admin/charts', A.requireAdmin, (req, res) => {
  const c = getCollections();
  const months = Math.min(Math.max(S.int(req.query.months, 6), 3), 12);
  const keys = monthKeys(months);
  const since = keys[0].key;

  const byRole = db.prepare('SELECT role, COUNT(*) total, SUM(is_active = 1) active FROM users GROUP BY role').all();
  const roleMap = {};
  byRole.forEach(r => { roleMap[r.role] = r; });
  const usersByRole = ROLE_ORDER.map(role => ({
    role, label: ROLE_LABEL[role],
    count: roleMap[role] ? roleMap[role].total : 0,
    active: roleMap[role] ? (roleMap[role].active || 0) : 0
  }));

  const appRows = db.prepare('SELECT status, COUNT(*) c FROM applications GROUP BY status').all();
  const appMap = {};
  appRows.forEach(r => { appMap[r.status] = r.c; });
  const applicationsByStatus = APP_STATUS_ORDER.map(status => ({ status, count: appMap[status] || 0 }))
    .concat(appRows.filter(r => APP_STATUS_ORDER.indexOf(r.status) < 0).map(r => ({ status: r.status, count: r.c })));

  const evs = c.events || [];
  const regByEvent = db.prepare('SELECT event_id, COUNT(*) c FROM registrations GROUP BY event_id').all();
  const regMap = {};
  regByEvent.forEach(r => { regMap[r.event_id] = r.c; });
  const topEvents = evs.map(e => ({
    id: e.id, title: e.title, date: e.date || '',
    registered: regMap[e.id] || 0, capacity: Number(e.capacity) || 0, status: e.status || ''
  })).sort((a, b) => b.registered - a.registered).slice(0, 6);

  const series = (table, col) => {
    const rows = db.prepare('SELECT ' + monthExpr(col || 'created_at') + ' m, COUNT(*) c FROM ' + table + ' WHERE ' + (col || 'created_at') + " >= ? GROUP BY m").all(since);
    const map = {};
    rows.forEach(r => { map[r.m] = r.c; });
    return keys.map(k => map[k.key] || 0);
  };
  const monthly = keys.map((k, i) => ({
    key: k.key, label: k.label,
    registrations: series('registrations')[i],
    applications: series('applications')[i],
    accounts: series('users')[i],
    activity: series('audit_log', 'at')[i]
  }));

  const dirNames = (c.directorates || []).map(d => d.name);
  const usersByDir = db.prepare('SELECT directorate d, COUNT(*) c FROM users WHERE directorate IS NOT NULL GROUP BY d').all();
  const dirUserMap = {};
  usersByDir.forEach(r => { dirUserMap[r.d] = r.c; });
  const dirTasks = {};
  (c.tasks || []).forEach(t => { if (t.directorate) dirTasks[t.directorate] = (dirTasks[t.directorate] || 0) + 1; });
  const dirEvents = {};
  evs.forEach(e => { const d = e.directorate || e.organizer; if (d) dirEvents[d] = (dirEvents[d] || 0) + 1; });
  const dirRegs = {};
  evs.forEach(e => { const d = e.directorate || e.organizer; if (d) dirRegs[d] = (dirRegs[d] || 0) + (regMap[e.id] || 0); });
  const directorates = dirNames.map(name => ({
    name, members: dirUserMap[name] || 0, tasks: dirTasks[name] || 0,
    events: dirEvents[name] || 0, registrations: dirRegs[name] || 0
  })).sort((a, b) => (b.members + b.registrations) - (a.members + a.registrations));

  const feedbackRows = db.prepare('SELECT status, COUNT(*) c FROM feedback GROUP BY status').all();

  res.json({
    generatedAt: now(),
    months: keys.map(k => k.label),
    usersByRole, applicationsByStatus, topEvents, monthly, directorates,
    feedback: feedbackRows,
    totals: {
      users: usersByRole.reduce((a, r) => a + r.count, 0),
      activeUsers: usersByRole.reduce((a, r) => a + r.active, 0),
      applications: applicationsByStatus.reduce((a, r) => a + r.count, 0),
      events: evs.length,
      registrations: db.prepare('SELECT COUNT(*) c FROM registrations').get().c,
      seats: evs.reduce((a, e) => a + (Number(e.capacity) || 0), 0),
      messages: db.prepare('SELECT COUNT(*) c FROM messages').get().c,
      unreadMessages: db.prepare('SELECT COUNT(*) c FROM messages WHERE read_at IS NULL').get().c
    }
  });
});

/* ---- audit log: filters (user · role · action · status · date range) + pagination ---- */
const likeTerm = v => '%' + String(v).replace(/[\\%_]/g, ch => '\\' + ch) + '%';   // % _ \ ko literal rakhta hai

function auditWhere(q) {
  const where = [];
  const args = [];
  const s = v => S.text(v, 120);
  if (s(q.q)) {
    where.push("(email LIKE ? ESCAPE '\\' OR action LIKE ? ESCAPE '\\' OR target LIKE ? ESCAPE '\\' OR detail LIKE ? ESCAPE '\\' OR record_id LIKE ? ESCAPE '\\' OR ip LIKE ? ESCAPE '\\')");
    const t = likeTerm(s(q.q));
    args.push(t, t, t, t, t, t);
  }
  if (S.isRole(s(q.role))) { where.push('role = ?'); args.push(s(q.role)); }
  if (s(q.action)) { where.push("action = ?"); args.push(s(q.action)); }
  if (s(q.target)) { where.push('target = ?'); args.push(s(q.target)); }
  if (q.status === 'ok' || q.status === 'fail') { where.push('ok = ?'); args.push(q.status === 'ok' ? 1 : 0); }
  if (s(q.from)) { where.push('at >= ?'); args.push(s(q.from).slice(0, 10) + 'T00:00:00'); }
  if (s(q.to)) { where.push('at <= ?'); args.push(s(q.to).slice(0, 10) + 'T23:59:59.999Z'); }
  if (s(q.user_id)) { where.push('user_id = ?'); args.push(s(q.user_id)); }
  if (s(q.email)) { where.push('LOWER(email) = ?'); args.push(s(q.email).toLowerCase()); }
  return { sql: where.length ? ' WHERE ' + where.join(' AND ') : '', args };
}

const SECRET_HINT = /(pass(word)?|secret|token|api[-_]?key|admin[-_]?key)\s*[:=]\s*\S+/gi;
const maskSecrets = v => (v == null ? v : String(v).replace(SECRET_HINT, m => m.replace(/:=\s*\S+$/, '').replace(/\s*[:=]\s*\S+/, ' = ***')));

router.get('/admin/audit', A.requireAdmin, (req, res) => {
  const q = req.query || {};
  const { sql, args } = auditWhere(q);
  const total = db.prepare('SELECT COUNT(*) c FROM audit_log' + sql).get(...args).c;
  const perPage = Math.min(Math.max(S.int(q.perPage, S.int(q.limit, 40)), 1), 200);
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(S.int(q.page, 1), 1), pages);
  const entries = db.prepare('SELECT * FROM audit_log' + sql + ' ORDER BY id DESC LIMIT ? OFFSET ?')
    .all(...args, perPage, (page - 1) * perPage)
    .map(r => ({ ...r, ok: !!r.ok, detail: maskSecrets(r.detail) }));      // secret jaisa kuch bhi kabhi bahar nahi

  res.json({
    entries, total, page, perPage, pages,
    filters: {
      actions: db.prepare('SELECT action, COUNT(*) c FROM audit_log GROUP BY action ORDER BY c DESC').all(),
      roles: db.prepare("SELECT role, COUNT(*) c FROM audit_log WHERE role IS NOT NULL GROUP BY role ORDER BY c DESC").all(),
      status: {
        ok: db.prepare('SELECT COUNT(*) c FROM audit_log WHERE ok = 1').get().c,
        fail: db.prepare('SELECT COUNT(*) c FROM audit_log WHERE ok = 0').get().c
      }
    }
  });
});

/* ---- ek user ki poori activity (audit + summary) ---- */
router.get('/admin/users/:id/activity', A.requireAdmin, (req, res) => {
  const user = A.findUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const q = req.query || {};
  const perPage = Math.min(Math.max(S.int(q.perPage, S.int(q.limit, 20)), 1), 200);
  const total = db.prepare('SELECT COUNT(*) c FROM audit_log WHERE user_id = ? OR LOWER(email) = ?').get(user.id, String(user.email).toLowerCase()).c;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(S.int(q.page, 1), 1), pages);
  const entries = db.prepare('SELECT * FROM audit_log WHERE user_id = ? OR LOWER(email) = ? ORDER BY id DESC LIMIT ? OFFSET ?')
    .all(user.id, String(user.email).toLowerCase(), perPage, (page - 1) * perPage)
    .map(r => ({ ...r, ok: !!r.ok, detail: maskSecrets(r.detail) }));
  res.json({
    user: A.publicUser(user), entries, total, page, perPage, pages,
    summary: {
      logins: db.prepare("SELECT COUNT(*) c FROM audit_log WHERE (user_id = ? OR LOWER(email) = ?) AND action LIKE '%login'").get(user.id, String(user.email).toLowerCase()).c,
      failed: db.prepare('SELECT COUNT(*) c FROM audit_log WHERE (user_id = ? OR LOWER(email) = ?) AND ok = 0').get(user.id, String(user.email).toLowerCase()).c,
      notifications: db.prepare('SELECT COUNT(*) c FROM notifications WHERE user_id = ?').get(user.id).c,
      messages: db.prepare('SELECT COUNT(*) c FROM messages WHERE from_id = ? OR to_id = ?').get(user.id, user.id).c
    }
  });
});

/* ---- ek user ki poori detail (admin ke liye) ---- */
router.get('/admin/users/:id', A.requireAdmin, (req, res) => {
  const user = A.findUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const activeAdmins = db.prepare("SELECT COUNT(*) c FROM users WHERE role = 'admin' AND is_active = 1").get().c;
  res.json({
    user: A.publicUser(user),
    flags: {
      is_last_admin: user.role === 'admin' && (activeAdmins <= 1 || !user.is_active),
      is_self: user.id === req.user.id
    },
    recent: db.prepare('SELECT * FROM audit_log WHERE user_id = ? OR LOWER(email) = ? ORDER BY id DESC LIMIT 8')
      .all(user.id, String(user.email).toLowerCase()).map(r => ({ ...r, ok: !!r.ok, detail: maskSecrets(r.detail) }))
  });
});

function activeAdminCount(excludeId) {
  return db.prepare("SELECT COUNT(*) c FROM users WHERE role = 'admin' AND is_active = 1 AND id <> ?").get(excludeId || '').c;
}

/* ---- access reset: sessions band + naya single-use reset link ---- */
router.post('/admin/users/:id/reset-access', A.requireAdmin, A.csrfGuard, (req, res) => {
  const user = A.findUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const b = req.body || {};
  const ip = ipOf(req);
  const sendEmail = b.email !== false;

  if (user.id === req.user.id) return res.status(400).json({ error: 'Use your own profile page to change your password.' });
  if (user.role === 'admin' && user.is_active && activeAdminCount(user.id) === 0) {
    return res.status(400).json({ error: 'The last admin account cannot be locked out. Add another admin first.' });
  }

  db.prepare('UPDATE users SET token_version = token_version + 1 WHERE id = ?').run(user.id);   // har purana session dead

  const minutes = S.int(process.env.RESET_MINUTES, 30);
  const raw = crypto.randomBytes(32).toString('hex');
  db.prepare('UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL').run(now(), user.id);
  db.prepare('INSERT INTO password_reset_tokens (token_hash, user_id, expires_at, created_at, ip) VALUES (?, ?, ?, ?, ?)')
    .run(crypto.createHash('sha256').update(raw).digest('hex'), user.id, new Date(Date.now() + minutes * 60000).toISOString(), now(), ip);

  const link = mail.link('/#/reset?token=' + raw);
  if (sendEmail) {
    mail.sendTemplate('passwordReset', user.email, { name: user.name, link, minutes });
    N.create(user.id, { title: 'Access was reset by the admin', body: 'Your password reset link is valid for ' + minutes + ' minutes and every old session was signed out.', category: 'account', link: '#/login' });
  }
  audit({ action: 'user-access-reset', user_id: req.user.id, email: req.user.email, role: 'admin', target: 'users', record_id: user.id, detail: user.email + (sendEmail ? ' · email sent' : ' · link only'), ip });
  res.json({ ok: true, emailed: sendEmail, minutes, devLink: sendEmail && !mail.devPreview() ? undefined : link });
});

/* ---- sessions revoke (bina password chhue) ---- */
router.post('/admin/users/:id/revoke-sessions', A.requireAdmin, A.csrfGuard, (req, res) => {
  const user = A.findUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  db.prepare('UPDATE users SET token_version = token_version + 1 WHERE id = ?').run(user.id);
  audit({ action: 'user-sessions-revoked', user_id: req.user.id, email: req.user.email, role: 'admin', target: 'users', record_id: user.id, detail: user.email, ip: ipOf(req) });
  res.json({ ok: true });
});

const USER_COLS = 'id, name, email, role, directorate, program, phone, is_active, last_login, created_at, meta';

router.get('/admin/users', A.requireAdmin, (req, res) => {
  const q = req.query || {};
  const where = [];
  const args = [];
  if (S.text(q.q, 120)) {
    where.push("(name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR directorate LIKE ? ESCAPE '\\' OR program LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\')");
    const t = likeTerm(S.text(q.q, 120));
    args.push(t, t, t, t, t);
  }
  if (S.isRole(S.text(q.role, 20).toLowerCase())) { where.push('role = ?'); args.push(S.text(q.role, 20).toLowerCase()); }
  if (q.state === 'active' || q.state === 'inactive') { where.push('is_active = ?'); args.push(q.state === 'active' ? 1 : 0); }
  const sql = where.length ? ' WHERE ' + where.join(' AND ') : '';
  const total = db.prepare('SELECT COUNT(*) c FROM users' + sql).get(...args).c;
  const perPage = Math.min(Math.max(S.int(q.perPage, S.int(q.limit, 25)), 1), 200);
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(S.int(q.page, 1), 1), pages);
  const users = db.prepare('SELECT ' + USER_COLS + ' FROM users' + sql + ' ORDER BY role, name LIMIT ? OFFSET ?')
    .all(...args, perPage, (page - 1) * perPage)
    .map(u => ({ ...u, is_active: !!u.is_active, meta: undefined, is_last_admin: u.role === 'admin' && (activeAdminCount(u.id) === 0) }));
  res.json({
    users, total, page, perPage, pages,
    counts: {
      total: db.prepare('SELECT COUNT(*) c FROM users').get().c,
      active: db.prepare('SELECT COUNT(*) c FROM users WHERE is_active = 1').get().c,
      inactive: db.prepare('SELECT COUNT(*) c FROM users WHERE is_active = 0').get().c,
      byRole: db.prepare('SELECT role, COUNT(*) c FROM users GROUP BY role ORDER BY role').all()
    }
  });
});

router.post('/admin/users', A.requireAdmin, A.csrfGuard, (req, res) => {
  const b = req.body || {};
  const name = S.text(b.name, 120);
  const email = S.text(b.email, 120).toLowerCase();
  const role = S.text(b.role, 20).toLowerCase();
  const password = b.password || '';

  if (name.length < 3) return res.status(400).json({ error: 'Name is too short.' });
  if (!S.isEmail(email)) return res.status(400).json({ error: 'Invalid email.' });
  if (!S.isRole(role)) return res.status(400).json({ error: 'Invalid role (student/member/directorate/faculty/admin/alumni).' });
  const pwProblem = S.passwordProblem(password);
  if (pwProblem) return res.status(400).json({ error: pwProblem });
  if (A.findUserByEmail(email)) return res.status(409).json({ error: 'This email already exists.' });

  const id = rid('u');
  A.createUser({
    id, name, email, role,
    directorate: S.text(b.directorate, 80), program: S.text(b.program, 80), phone: S.text(b.phone, 30), password
  }, { role: 'admin', email: req.user.email });
  mail.sendTemplate('welcome', email, { name, role });
  N.create(id, { title: 'Welcome to YPDC UON', body: 'Your account was created by the admin. Complete your profile to get started.', category: 'account', link: '#/portal/' + role + '/profile', by: req.user.email });
  audit({ action: 'user-create', user_id: req.user.id, email: req.user.email, role: 'admin', target: 'users', record_id: id, detail: email + ' · ' + role, ip: ipOf(req) });
  res.status(201).json({ ok: true, id });
});

router.patch('/admin/users/:id', A.requireAdmin, A.csrfGuard, (req, res) => {
  const user = A.findUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const b = req.body || {};
  if (typeof b.is_active === 'boolean') {
    if (!b.is_active && req.user.id === user.id) return res.status(400).json({ error: 'You cannot deactivate your own account.' });
    if (!b.is_active && user.role === 'admin' && activeAdminCount(user.id) === 0) {
      return res.status(400).json({ error: 'The last admin account cannot be deactivated.' });
    }
    db.prepare('UPDATE users SET is_active = ?, token_version = token_version + 1 WHERE id = ?').run(b.is_active ? 1 : 0, user.id);
    audit({ action: b.is_active ? 'user-enable' : 'user-disable', user_id: req.user.id, email: req.user.email, role: 'admin', target: 'users', record_id: user.id, ip: ipOf(req) });
  }
  if (b.role !== undefined && b.role !== user.role) {
    if (!S.isRole(b.role)) return res.status(400).json({ error: 'Invalid role.' });
    if (user.id === req.user.id) return res.status(400).json({ error: 'You cannot change your own role.' });
    if (user.role === 'admin' && b.role !== 'admin' && user.is_active && activeAdminCount(user.id) === 0) {
      return res.status(400).json({ error: 'This is the last active admin — the role cannot be changed.' });
    }
    db.prepare('UPDATE users SET role = ?, token_version = token_version + 1 WHERE id = ?').run(b.role, user.id);
    audit({ action: 'user-role-change', user_id: req.user.id, email: req.user.email, role: 'admin', target: 'users', record_id: user.id, detail: b.role, ip: ipOf(req) });
  }
  if (b.password) {
    const problem = S.passwordProblem(b.password);
    if (problem) return res.status(400).json({ error: problem });
    A.setPassword(user.id, b.password);
    audit({ action: 'user-password-reset', user_id: req.user.id, email: req.user.email, role: 'admin', target: 'users', record_id: user.id, ip: ipOf(req) });
  }
  res.json({ ok: true });
});

router.patch('/admin/applications/:id', A.requireAdmin, A.csrfGuard, (req, res) => {
  const status = S.text(req.body && req.body.status, 20);
  if (!['New', 'Shortlisted', 'Approved', 'Rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  const row = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Application not found.' });

  db.prepare('UPDATE applications SET status = ?, decided_by = ?, decided_at = ? WHERE id = ?')
    .run(status, req.user.email, now(), row.id);
  audit({ action: 'application-' + status.toLowerCase(), user_id: req.user.id, email: req.user.email, role: 'admin', target: 'applications', record_id: row.id, detail: row.name, ip: ipOf(req) });
  res.json({ ok: true, id: row.id, status });
});

router.get('/admin/password-policy', (req, res) => {
  res.json({ min: 8, max: 72, need: 'letter + number ya symbol', hashing: 'bcrypt 12 rounds' });
});

router.get('/directory', A.requireAuth, (req, res) => {
  const rows = db.prepare(`SELECT id, name, role, directorate FROM users
                           WHERE is_active = 1 ORDER BY role, name`).all();
  res.json({ users: rows.filter(u => u.id !== req.user.id) });
});

function publicMessage(m, meId) {
  return {
    id: m.id,
    from: { id: m.from_id, name: m.from_name, role: m.from_role },
    to: { id: m.to_id, name: m.to_name },
    subject: m.subject,
    body: m.body,
    read: !!m.read_at,
    created_at: m.created_at,
    direction: m.from_id === meId ? 'sent' : 'received'
  };
}

router.get('/messages', A.requireAuth, (req, res) => {
  const me = req.user.id;
  const rows = db.prepare(`SELECT * FROM messages WHERE to_id = ? OR from_id = ?
                           ORDER BY created_at DESC LIMIT 200`).all(me, me);
  const list = rows.map(m => publicMessage(m, me));
  res.json({
    inbox: list.filter(m => m.direction === 'received'),
    sent: list.filter(m => m.direction === 'sent'),
    unread: list.filter(m => m.direction === 'received' && !m.read).length
  });
});

router.post('/messages', A.requireAuth, A.csrfGuard, S.writeLimit, (req, res) => {
  const b = req.body || {};
  const toId = S.text(b.to, 60);
  const subject = S.text(b.subject, 120);
  const body = S.text(b.body, 4000);

  if (!toId) return res.status(400).json({ error: 'Choose a recipient for this message.' });
  if (!subject) return res.status(400).json({ error: 'Enter a subject.' });
  if (!body) return res.status(400).json({ error: 'Enter a message.' });
  if (toId === req.user.id) return res.status(400).json({ error: 'You cannot send a message to yourself.' });

  const to = A.findUserById(toId);
  if (!to || !to.is_active) return res.status(404).json({ error: 'This user does not exist (or is deactivated).' });

  const id = rid('msg');
  db.prepare(`INSERT INTO messages (id, from_id, from_name, from_role, to_id, to_name, subject, body, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, req.user.id, req.user.name, req.user.role, to.id, to.name, subject, body, now());

  audit({ action: 'message-send', user_id: req.user.id, email: req.user.email, role: req.user.role,
    target: 'messages', record_id: id, detail: to.name + ' · ' + subject, ip: ipOf(req) });

  const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
  res.status(201).json({ ok: true, message: publicMessage(row, req.user.id) });
});

router.post('/messages/:id/read', A.requireAuth, A.csrfGuard, (req, res) => {
  const m = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Message not found.' });
  if (m.to_id !== req.user.id) return res.status(403).json({ error: 'This is not your message.' });
  if (!m.read_at) db.prepare('UPDATE messages SET read_at = ? WHERE id = ?').run(now(), m.id);
  res.json({ ok: true });
});

router.delete('/messages/:id', A.requireAuth, A.csrfGuard, (req, res) => {
  const m = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Message not found.' });
  if (m.to_id !== req.user.id && m.from_id !== req.user.id) {
    return res.status(403).json({ error: 'This is not your message.' });
  }
  db.prepare('DELETE FROM messages WHERE id = ?').run(m.id);
  audit({ action: 'message-delete', user_id: req.user.id, email: req.user.email, role: req.user.role,
    target: 'messages', record_id: m.id, ip: ipOf(req) });
  res.json({ ok: true });
});

router.get('/admin/permissions', A.requireAdmin, (req, res) => {
  const byRole = {};
  Object.keys(S.WRITERS).forEach(key => {
    const roles = S.WRITERS[key];
    roles.forEach(r => { (byRole[r] = byRole[r] || []).push(key); });
  });
  res.json({ writers: S.WRITERS, byRole, readme: 'Which role can write which data (this is what the server enforces).' });
});

router.delete('/admin/users/:id', A.requireAdmin, A.csrfGuard, (req, res) => {
  const user = A.findUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (user.id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account.' });
  if (user.role === 'admin' && activeAdminCount(user.id) === 0) {
    return res.status(400).json({ error: 'The last admin account cannot be deleted.' });
  }
  db.prepare('DELETE FROM messages WHERE to_id = ? OR from_id = ?').run(user.id, user.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
  audit({ action: 'user-delete', user_id: req.user.id, email: req.user.email, role: 'admin',
    target: 'users', record_id: user.id, detail: user.email, ip: ipOf(req) });
  res.json({ ok: true });
});

const MAX_UPLOAD = 6 * 1024 * 1024;
const rawBody = express.raw({ type: ['application/octet-stream', 'image/*', 'text/plain'], limit: '9mb' });
/* registration uploads ke liye alag (chhota) parser */
const regRaw = rawBody;

const IMAGE_KINDS = [
  { ext: 'jpg', match: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', match: b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: 'webp', match: b => b.length > 12 && b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP' },
  { ext: 'gif', match: b => b.length > 6 && b.slice(0, 4).toString() === 'GIF8' }
];
const imageKind = buf => IMAGE_KINDS.filter(k => k.match(buf))[0] || null;

function bodyToBuffer(body, type) {
  if (Buffer.isBuffer(body)) {
    if ((type || '').indexOf('text/plain') === 0) return Buffer.from(body.toString().replace(/^data:[^,]+,/, ''), 'base64');
    return body;
  }
  if (typeof body === 'string') return Buffer.from(body.replace(/^data:[^,]+,/, ''), 'base64');
  if (body && typeof body === 'object' && typeof body.data === 'string') return Buffer.from(body.data.replace(/^data:[^,]+,/, ''), 'base64');
  return Buffer.alloc(0);
}

router.post('/admin/upload', A.requireAdmin, A.csrfGuard, rawBody, (req, res) => {
  const buf = bodyToBuffer(req.body, req.get('content-type'));
  if (!buf.length) return res.status(400).json({ error: 'No image was received.' });
  if (buf.length > MAX_UPLOAD) return res.status(413).json({ error: 'The image is too large (maximum 6 MB).' });
  const kind = imageKind(buf);
  if (!kind) return res.status(400).json({ error: 'Only JPG, PNG, WebP or GIF images are allowed.' });

  const dir = req.app.get('uploadDir');
  const name = 'u-' + Date.now().toString(36) + crypto.randomBytes(4).toString('hex') + '.' + kind.ext;
  try {
    fs.writeFileSync(path.join(dir, name), buf);
  } catch (e) {
    return res.status(500).json({ error: 'The image could not be saved on the server.' });
  }
  const url = req.app.get('uploadUrl') + name;
  audit({ action: 'upload', user_id: req.user.id, email: req.user.email, role: req.user.role,
    target: 'uploads', record_id: name, detail: Math.round(buf.length / 1024) + ' KB', ip: ipOf(req) });
  res.status(201).json({ ok: true, url, bytes: buf.length });
});

/* ---- public registration upload: photo / ID card (auth nahi, rate-limited) ---- */
const MAX_REG_UPLOAD = 6 * 1024 * 1024;
router.post('/public/upload', S.uploadLimit, rawBody, (req, res) => {
  const buf = bodyToBuffer(req.body, req.get('content-type'));
  if (!buf.length) return res.status(400).json({ error: 'No image was received.' });
  if (buf.length > MAX_REG_UPLOAD) return res.status(413).json({ error: 'The image is too large (maximum 6 MB).' });
  const kind = imageKind(buf);
  if (!kind) return res.status(400).json({ error: 'Only JPG, PNG, WebP or GIF images are allowed.' });

  const dir = req.app.get('uploadDir');
  const name = 'reg-' + Date.now().toString(36) + crypto.randomBytes(5).toString('hex') + '.' + kind.ext;
  try {
    fs.writeFileSync(path.join(dir, name), buf);
  } catch (e) {
    return res.status(500).json({ error: 'The image could not be saved on the server.' });
  }
  audit({ action: 'public-upload', user_id: null, email: null, role: 'public', target: 'uploads',
    record_id: name, detail: Math.round(buf.length / 1024) + ' KB', ip: ipOf(req) });
  res.status(201).json({ ok: true, url: req.app.get('uploadUrl') + name, bytes: buf.length });
});

router.get('/admin/backup', A.requireAdmin, (req, res) => {
  const file = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'ypdc.sqlite');
  try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch (e) {}
  audit({ action: 'backup', user_id: req.user.id, email: req.user.email, role: 'admin', target: 'database', ip: ipOf(req) });
  res.download(file, 'ypdc-backup-' + now().slice(0, 10) + '.sqlite');
});

module.exports = { router };

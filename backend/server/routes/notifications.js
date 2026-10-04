'use strict';

const express = require('express');
const { db, now, audit } = require('../db');
const A = require('../auth');
const S = require('../security');
const N = require('../notify');
const mail = require('../email');

const router = express.Router();
const ipOf = req => (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
const shape = n => ({
  id: n.id, title: n.title, body: n.body, category: n.category, link: n.link,
  read: !!n.read_at, readAt: n.read_at || null, at: n.created_at
});

router.get('/notifications', A.requireAuth, (req, res) => {
  const unreadOnly = S.bool(req.query.unread) || req.query.unread === '1';
  const rows = N.listFor(req.user.id, { limit: S.int(req.query.limit, 50), unreadOnly });
  res.json({ notifications: rows.map(shape), unread: N.unreadCount(req.user.id), categories: N.CATEGORIES });
});

router.patch('/notifications/:id/read', A.requireAuth, A.csrfGuard, (req, res) => {
  const changed = N.markRead(req.user.id, S.text(req.params.id, 64));
  if (!changed) return res.status(404).json({ error: 'That notification does not exist.' });
  res.json({ ok: true, unread: N.unreadCount(req.user.id) });
});

router.post('/notifications/read-all', A.requireAuth, A.csrfGuard, (req, res) => {
  const changed = N.markAllRead(req.user.id);
  res.json({ ok: true, changed, unread: 0 });
});

router.delete('/notifications/:id', A.requireAuth, A.csrfGuard, (req, res) => {
  const changed = N.remove(req.user.id, S.text(req.params.id, 64));
  if (!changed) return res.status(404).json({ error: 'That notification does not exist.' });
  res.json({ ok: true, unread: N.unreadCount(req.user.id) });
});

/* ---- admin announcements: sab / ek role / ek directorate ---- */
router.get('/admin/announcements', A.requireAdmin, (req, res) => {
  const rows = db.prepare(`SELECT id, title, body, category, link, created_at FROM notifications
                           WHERE category = 'announcement' GROUP BY title, body, created_at
                           ORDER BY created_at DESC LIMIT 40`).all();
  const counts = db.prepare(`SELECT title, COUNT(*) c FROM notifications WHERE category = 'announcement' GROUP BY title`).all();
  const map = {}; counts.forEach(c => { map[c.title] = c.c; });
  res.json({
    announcements: rows.map(r => ({ id: r.id, title: r.title, body: r.body, at: r.created_at, delivered: map[r.title] || 0 })),
    roles: S.ROLES,
    audiences: [
      { value: 'all', label: 'Every active account' },
      ...S.ROLES.map(r => ({ value: 'role:' + r, label: 'Role · ' + r })),
      ...db.prepare("SELECT DISTINCT directorate FROM users WHERE directorate IS NOT NULL AND directorate <> '' ORDER BY directorate").all()
        .map(d => ({ value: 'directorate:' + d.directorate, label: 'Directorate · ' + d.directorate }))
    ]
  });
});

router.post('/admin/announcements', A.requireAdmin, A.csrfGuard, S.writeLimit, (req, res) => {
  const b = req.body || {};
  const title = S.text(b.title, 160);
  const body = S.text(b.body, 600);
  const target = S.text(b.audience, 120) || 'all';
  const alsoEmail = S.bool(b.email);

  if (title.length < 3) return res.status(400).json({ error: 'Give the announcement a title (at least 3 letters).' });
  if (body.length < 5) return res.status(400).json({ error: 'Write the announcement text.' });
  const ids = N.audienceIds(target);
  if (target !== 'all' && !ids.length && ['role:', 'directorate:'].some(p => target.indexOf(p) === 0) === false) {
    return res.status(400).json({ error: 'Pick an audience from the list.' });
  }

  const created = N.createFor(ids, {
    title, body, category: 'announcement',
    link: S.text(b.link, 120) || '#/portal/' + req.user.role + '/dashboard',
    by: req.user.email
  });

  let emailed = 0;
  if (alsoEmail && ids.length) {
    const people = db.prepare(`SELECT email, name FROM users WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids);
    people.forEach(u => { mail.sendTemplate('announcement', u.email, { title, body }); emailed++; });
  }

  audit({ action: 'announcement-send', user_id: req.user.id, email: req.user.email, role: req.user.role,
    target: 'notifications', detail: title + ' · ' + ids.length + ' recipient(s) · ' + (alsoEmail ? 'email + bell' : 'bell only'), ip: ipOf(req) });
  res.status(201).json({ ok: true, delivered: ids.length, emailed, title, at: now() });
});

router.delete('/admin/announcements/:id', A.requireAdmin, A.csrfGuard, (req, res) => {
  const id = S.text(req.params.id, 64);
  const row = db.prepare("SELECT * FROM notifications WHERE id = ? AND category = 'announcement'").get(id);
  if (!row) return res.status(404).json({ error: 'That announcement does not exist.' });
  const del = db.prepare("DELETE FROM notifications WHERE category = 'announcement' AND title = ? AND created_at = ?").run(row.title, row.created_at);
  audit({ action: 'announcement-delete', user_id: req.user.id, email: req.user.email, role: req.user.role,
    target: 'notifications', record_id: id, detail: row.title + ' · ' + del.changes + ' copy(ies) removed', ip: ipOf(req) });
  res.json({ ok: true, removed: del.changes });
});

module.exports = { router };

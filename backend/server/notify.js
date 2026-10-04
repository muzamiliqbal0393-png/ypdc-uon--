'use strict';

/* Notification centre ka backend: sab notifications ek table mein, per user.
   Koi notification bahar se seedha bhi bheji ja sakti hai (admin announcement). */

const crypto = require('crypto');
const { db, now } = require('./db');

const CATEGORIES = ['system', 'account', 'application', 'event', 'announcement'];
const rid = prefix => prefix + '-' + crypto.randomBytes(5).toString('hex');

function create(userId, { title, body, category, link, by }) {
  if (!userId || !title) return null;
  const id = rid('nt');
  db.prepare(`INSERT INTO notifications (id, user_id, title, body, category, link, created_by, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, userId, String(title).slice(0, 200), body ? String(body).slice(0, 600) : null,
      CATEGORIES.includes(category) ? category : 'system', link || null, by || null, now());
  return id;
}

function createFor(ids, payload) {
  const out = [];
  const run = db.transaction(list => list.forEach(uid => { const id = create(uid, payload); if (id) out.push(id); }));
  run([...new Set((ids || []).filter(Boolean))]);
  return out;
}

const listFor = (userId, { limit = 50, unreadOnly = false } = {}) =>
  db.prepare(`SELECT id, title, body, category, link, read_at, created_at FROM notifications
              WHERE user_id = ?${unreadOnly ? ' AND read_at IS NULL' : ''}
              ORDER BY created_at DESC LIMIT ?`).all(userId, Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200));

const unreadCount = userId => db.prepare('SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND read_at IS NULL').get(userId).c;

const markRead = (userId, id) =>
  db.prepare('UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL').run(now(), id, userId).changes;

const markAllRead = userId =>
  db.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL').run(now(), userId).changes;

const remove = (userId, id) =>
  db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(id, userId).changes;

/* audience: all | role:<role> | directorate:<name> */
function audienceIds(target) {
  const t = String(target || 'all');
  if (t === 'all') return db.prepare('SELECT id FROM users WHERE is_active = 1').all().map(r => r.id);
  if (t.indexOf('role:') === 0) {
    const role = t.slice(5);
    return db.prepare('SELECT id FROM users WHERE is_active = 1 AND role = ?').all(role).map(r => r.id);
  }
  if (t.indexOf('directorate:') === 0) {
    const dir = t.slice(12);
    return db.prepare('SELECT id FROM users WHERE is_active = 1 AND directorate = ? COLLATE NOCASE').all(dir).map(r => r.id);
  }
  return [];
}

function audienceCount(target) { return audienceIds(target).length; }

module.exports = { create, createFor, listFor, unreadCount, markRead, markAllRead, remove, audienceIds, audienceCount, CATEGORIES };

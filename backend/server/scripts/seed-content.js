'use strict';
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { db, now, setCollection, audit } = require('../db');
const A = require('../auth');

const CONTENT = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'site-content.json'), 'utf8'));

let written = 0;
Object.keys(CONTENT).forEach(key => {
  if (key === 'session' || key === 'profiles') return;
  setCollection(key, CONTENT[key], 'seed-content');
  written++;
});

const RECORD_KEYS = [
  'events', 'news', 'highlights', 'achievements', 'people', 'registrations', 'attendance',
  'certificates', 'volunteer', 'tasks', 'duties', 'responsibilities', 'reports', 'proposals',
  'workplan', 'objectives', 'facultyActivities', 'applications', 'alumniNetwork', 'mentorship',
  'careers', 'activityLog', 'feedback', 'notifications', 'session'
];
RECORD_KEYS.forEach(k => { if (CONTENT[k] === undefined) setCollection(k, [], 'seed-content'); });
['registrations', 'applications', 'feedback', 'messages'].forEach(t => {
  try { db.prepare('DELETE FROM ' + t).run(); } catch (e) {}
});
try { db.prepare('DELETE FROM audit_log').run(); } catch (e) {}

const email = (process.env.ADMIN_EMAIL || 'admin@uon.edu.pk').toLowerCase();
const given = process.env.ADMIN_PASSWORD;
const password = given || crypto.randomBytes(9).toString('base64url') + '9!';
const name = process.env.ADMIN_NAME || 'System Administrator';

let existing = null;
try { existing = A.findUserByEmail(email); } catch (e) { existing = null; }

if (existing) {
  A.setPassword(existing.id, password);
  db.prepare("UPDATE users SET role = 'admin', is_active = 1 WHERE id = ?").run(existing.id);
} else {
  A.createUser({ id: 'u-admin', name, email, role: 'admin', password }, { role: 'system' });
  existing = { id: 'u-admin' };
}

audit({ action: 'db-seed-content', user_id: existing.id, email, role: 'admin', target: 'db', detail: written + ' collections (sirf website content)', ip: 'seed' });

const count = t => { try { return db.prepare('SELECT COUNT(*) c FROM ' + t).get().c; } catch (e) { return 0; } };

console.log('\n─────────────────────────────────────────────');
console.log('  READY — website content + empty database');
console.log('─────────────────────────────────────────────');
console.log('  Collections written : ' + written + '  (site copy · directorates · portals)');
console.log('  Directorates        : ' + ((CONTENT.directorates) || []).length + '  (numbers 0 · lead empty)');
console.log('  Users               : ' + count('users') + '  (admin only — no demo accounts)');
console.log('  Events / News / Highlights / Achievements : 0');
console.log('  Applications        : ' + count('applications'));
console.log('  Registrations       : ' + count('registrations'));
console.log('  Messages            : ' + count('messages'));
console.log('  Feedback            : ' + count('feedback'));
console.log('  Admin login         : ' + email + (given ? '  (from ADMIN_PASSWORD)' : '  · password (random): ' + password));
console.log('─────────────────────────────────────────────\n');


'use strict';
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { db, now, setCollection, audit } = require('../db');
const A = require('../auth');

const C = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'site-content.json'), 'utf8'));

if (process.argv.includes('--force') === false) {
  const have = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  if (have > 0) {
    console.log('✓ Database already has data (' + have + ' user account) — nothing was changed.');
    console.log('  Re-seed from scratch:  delete the database file (or run: npm run seed -- --force)');
    process.exit(0);
  }
}

const blank = {};
Object.keys(C).forEach(key => {
  const v = C[key];
  if (key === 'site') { blank.site = v; return; }
  if (key === 'portals') { blank.portals = v; return; }
  if (key === 'notificationGroups') { blank.notificationGroups = v; return; }
  if (Array.isArray(v)) { blank[key] = []; return; }
  if (v && typeof v === 'object') { blank[key] = Object.assign({}, v); return; }
  blank[key] = v;
});
blank.meta = Object.assign({}, C.meta, { version: (C.meta && C.meta.version) || 1, seeded: now(), real: true });
blank.directorates = (C.directorates || []).map(d => Object.assign({}, d, {
  members: 0, active: 0, vacancy: 0, activity: 0, lead: '', status: 'Active'
}));
blank.cabinet = { session: '', status: '', posts: [] };
blank.analytics = { totalUsers: 0, activeMembers: 0, eventsThisTerm: 0, avgAttendance: 0, pendingApprovals: 0, certificates: 0 };
blank.inductionDrive = { batch: '', received: 0, approved: 0, shortlisted: 0, rejected: 0, status: '' };
blank.roles = [];

let written = 0;
Object.keys(blank).forEach(key => {
  if (key === 'session' || key === 'profiles') return;
  setCollection(key, blank[key], 'seed-real');
  written++;
});
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
  console.log('\n✓ Admin account already existed — password updated:');
} else {
  A.createUser({ id: 'u-admin', name, email, role: 'admin', password }, { role: 'system' });
  console.log('\n✓ Admin account created:');
}

audit({ action: 'db-seed-real', target: 'all', role: 'system', detail: written + ' collections (khali) + admin' });

console.log('   ' + email);
if (!given) {
  console.log('   password (randomly generated): ' + password);
  console.log('   → note it down now and change it after login (change-password API / settings).');
} else {
  console.log('   password: (taken from env ADMIN_PASSWORD)');
}

console.log('\n─────────────────────────────────────────────');
console.log('  EMPTY DATABASE READY (no demo data)');
console.log('─────────────────────────────────────────────');
console.log('  Collections written: ' + written + '   (all empty — fill with real work)');
console.log('  Directorates      : ' + blank.directorates.length + ' (numbers 0 — the admin fills them)');
console.log('  Users             : ' + db.prepare('SELECT COUNT(*) c FROM users').get().c);
console.log('  Events / News / Highlights / Achievements : 0');
console.log('  Applications      : ' + db.prepare('SELECT COUNT(*) c FROM applications').get().c);
console.log('  Messages          : ' + db.prepare('SELECT COUNT(*) c FROM messages').get().c);
console.log('─────────────────────────────────────────────');
console.log('  Admin login  : <site>/#/admin  (email + password + ADMIN_KEY)');
console.log('  ADMIN_KEY    : ' + A.ADMIN_KEY + '   (in server/.env)');
console.log('  Website login: create accounts from the admin panel (People → + Add member)');
console.log('─────────────────────────────────────────────\n');

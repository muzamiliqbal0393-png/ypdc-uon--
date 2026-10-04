'use strict';
require('dotenv').config();

const crypto = require('crypto');
const { db, now } = require('../db');
const A = require('../auth');

const [email, password, ...nameParts] = process.argv.slice(2);
const name = nameParts.join(' ').trim() || 'YPDC Administrator';

if (!email || !password) {
  console.log('\nUsage:     node scripts/make-admin.js <email> <password> ["Name"]\n' +
    'Example:   node scripts/make-admin.js admin@ypdc.uon.edu.pk "StrongPass#9" "System Administrator"\n');
  process.exit(1);
}
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('✗ Email does not look valid: ' + email);
  process.exit(1);
}
const weak = password.length < 10 ? 'password must be at least 10 characters' : null;
if (weak) {
  console.error('✗ ' + weak + ' (production ke liye).');
  process.exit(1);
}

const existing = A.findUserByEmail(email);
if (existing) {
  db.prepare("UPDATE users SET role = 'admin', is_active = 1 WHERE id = ?").run(existing.id);
  A.setPassword(existing.id, password);
  console.log('\n✓ Existing account is now an admin:');
  console.log('   ' + existing.email + '  (id: ' + existing.id + ')');
  console.log('   New password set · old sessions logged out.');
} else {
  const id = 'u-' + crypto.randomBytes(6).toString('hex');
  A.createUser({ id, name, email, role: 'admin', password }, { role: 'system' });
  console.log('\n✓ New admin account created:');
  console.log('   ' + email + '  (id: ' + id + ')');
}

console.log('\n  Login:  <site>/#/admin   →  email + password + ADMIN_KEY\n' +
  '  ADMIN_KEY: ' + (process.env.ADMIN_KEY ? 'is set (server/.env or hosting env)' : 'NOT found — check .env') + '\n');

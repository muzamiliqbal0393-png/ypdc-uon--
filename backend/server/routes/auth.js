'use strict';

const express = require('express');
const crypto = require('crypto');
const { db, now, audit, bcrypt } = require('../db');
const A = require('../auth');
const S = require('../security');
const mail = require('../email');
const N = require('../notify');

const router = express.Router();
const ipOf = req => (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();

const RESET_MINUTES = S.int(process.env.RESET_MINUTES, 30);
const hashToken = raw => crypto.createHash('sha256').update(String(raw || '')).digest('hex');

router.post('/login', S.loginLimit, (req, res) => {
  const email = S.text(req.body && req.body.email, 120).toLowerCase();
  const password = (req.body && req.body.password) || '';
  const wantRole = S.text(req.body && req.body.role, 20).toLowerCase();

  if (!S.isEmail(email) || !password) {
    audit({ action: 'login', email, ok: 0, detail: 'bad input', ip: ipOf(req) });
    return res.status(400).json({ error: 'Enter a valid email and password.' });
  }

  const user = A.findUserByEmail(email);
  const okPass = user ? bcrypt.compareSync(password, user.password_hash) : false;

  if (!user || !okPass || !user.is_active) {
    audit({ action: 'login', email, ok: 0, detail: !user ? 'no user' : (!okPass ? 'bad password' : 'inactive'), ip: ipOf(req) });
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }
  if (user.role === 'admin') {
    audit({ action: 'login', email, ok: 0, detail: 'block admin on the normal login', ip: ipOf(req) });
    return res.status(403).json({ error: 'Administrators must use the separate admin login.', adminLogin: true });
  }
  if (user.role === 'directorate') {
    audit({ action: 'login', email, ok: 0, detail: 'block directorate on the normal login', ip: ipOf(req) });
    return res.status(403).json({ error: 'Directorate members must use the separate directorate sign-in link.', directorateLogin: true });
  }
  if (wantRole && wantRole !== user.role) {
    audit({ action: 'login', email, role: user.role, ok: 1, detail: 'role field ' + wantRole + ' found, account role ' + user.role, ip: ipOf(req) });
  }

  const token = A.signToken(user, 'user');
  const csrf = A.newCsrf();
  A.setAuthCookies(res, token, csrf);
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(now(), user.id);
  audit({ action: 'login', user_id: user.id, email: user.email, role: user.role, ok: 1, ip: ipOf(req) });

  res.json({ user: A.publicUser(user), csrf, role: user.role });
});

router.post('/register', S.registerLimit, (req, res) => {
  const b = req.body || {};
  const name = S.text(b.name, 120);
  const email = S.text(b.email, 120).toLowerCase();
  const role = S.text(b.role, 20).toLowerCase() || 'student';
  const password = b.password || '';
  const ip = ipOf(req);

  if (name.length < 3) return res.status(400).json({ error: 'Please enter your full name (at least 3 letters).' });
  if (!S.isEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (!S.canSignUp(role)) return res.status(400).json({ error: 'Pick a role: volunteer, general member, faculty or alumni. Directorate and admin accounts are added by the admin.' });
  const pwProblem = S.passwordProblem(password);
  if (pwProblem) return res.status(400).json({ error: pwProblem });
  if (A.findUserByEmail(email)) return res.status(409).json({ error: 'This email is already registered — please log in instead.' });

  const id = 'u-' + require('crypto').randomBytes(4).toString('hex');
  A.createUser({
    id, name, email, role,
    directorate: S.text(b.directorate, 80), program: S.text(b.program, 80), phone: S.text(b.phone, 30), password
  }, { role: 'self sign-up', email });
  audit({ action: 'user-register', user_id: id, email, role, target: 'users', record_id: id, detail: 'self sign-up · ' + name, ip });

  const user = A.findUserByEmail(email);
  const token = A.signToken(user, 'user');
  const csrf = A.newCsrf();
  A.setAuthCookies(res, token, csrf);
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(now(), user.id);
  mail.sendTemplate('welcome', email, { name, role });
  N.create(user.id, { title: 'Welcome to YPDC UON', body: 'Your account is ready. Complete your profile to get started.', category: 'account', link: '#/portal/' + role + '/profile' });
  audit({ action: 'login', user_id: user.id, email, role, ok: 1, detail: 'after sign-up', ip });

  res.status(201).json({ ok: true, user: A.publicUser(user), csrf, role: user.role });
});

router.post('/login-admin', S.adminLimit, (req, res) => {
  const email = S.text(req.body && req.body.email, 120).toLowerCase();
  const password = (req.body && req.body.password) || '';
  const adminKey = S.text(req.body && req.body.adminKey, 120);

  const user = S.isEmail(email) ? A.findUserByEmail(email) : null;
  const okPass = user ? bcrypt.compareSync(password, user.password_hash) : false;
  const okKey = A.keyMatches(adminKey, A.ADMIN_KEY);

  if (!user || user.role !== 'admin' || !okPass || !okKey) {
    audit({ action: 'admin-login', email, ok: 0, detail: !user ? 'no user' : (user.role !== 'admin' ? 'not admin' : (!okPass ? 'bad password' : 'bad admin key')), ip: ipOf(req) });
    return res.status(401).json({ error: 'Admin credentials or security key is incorrect.' });
  }

  const token = A.signToken(user, 'admin');
  const csrf = A.newCsrf();
  A.setAuthCookies(res, token, csrf);
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(now(), user.id);
  audit({ action: 'admin-login', user_id: user.id, email: user.email, role: 'admin', ok: 1, ip: ipOf(req) });

  res.json({ user: A.publicUser(user), csrf, role: 'admin' });
});

router.post('/login-directorate', S.loginLimit, (req, res) => {
  const email = S.text(req.body && req.body.email, 120).toLowerCase();
  const password = (req.body && req.body.password) || '';

  const user = S.isEmail(email) ? A.findUserByEmail(email) : null;
  const okPass = user ? bcrypt.compareSync(password, user.password_hash) : false;

  if (!user || user.role !== 'directorate' || !okPass || !user.is_active) {
    audit({ action: 'directorate-login', email, ok: 0, detail: !user ? 'no user' : (user.role !== 'directorate' ? 'not directorate' : 'bad password'), ip: ipOf(req) });
    return res.status(401).json({ error: 'Directorate email or password is incorrect.' });
  }

  const token = A.signToken(user, 'user');
  const csrf = A.newCsrf();
  A.setAuthCookies(res, token, csrf);
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(now(), user.id);
  audit({ action: 'directorate-login', user_id: user.id, email: user.email, role: user.role, ok: 1, ip: ipOf(req) });
  res.json({ user: A.publicUser(user), csrf, role: user.role });
});

router.post('/forgot-password', S.forgotLimit, (req, res) => {
  const email = S.text(req.body && req.body.email, 120).toLowerCase();
  const ip = ipOf(req);
  if (!S.isEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

  const generic = { ok: true, message: 'If that email is registered, a reset link is on its way. Check your inbox.' };
  const user = A.findUserByEmail(email);

  if (!user || !user.is_active) {
    audit({ action: 'password-reset-request', email, ok: 0, detail: 'no active account', ip });
    return res.json(generic);                       // koi farq nahi batate ke email registered hai ya nahi
  }

  const raw = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + RESET_MINUTES * 60000).toISOString();
  db.prepare('UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL').run(now(), user.id);
  db.prepare('INSERT INTO password_reset_tokens (token_hash, user_id, expires_at, created_at, ip) VALUES (?, ?, ?, ?, ?)')
    .run(hashToken(raw), user.id, expires, now(), ip);

  const resetLink = mail.link('/#/reset?token=' + raw);
  mail.sendTemplate('passwordReset', user.email, { name: user.name, link: resetLink, minutes: RESET_MINUTES });
  audit({ action: 'password-reset-request', user_id: user.id, email: user.email, role: user.role, ok: 1, detail: 'link sent · expires in ' + RESET_MINUTES + ' min', ip });

  const body = Object.assign({}, generic);
  if (mail.devPreview()) body.devLink = resetLink;   // sirf jab MAIL_DEV_PREVIEW=1 ho (local testing)
  res.json(body);
});

router.post('/reset-password', S.resetLimit, (req, res) => {
  const raw = S.text(req.body && req.body.token, 200);
  const password = (req.body && req.body.password) || '';
  const ip = ipOf(req);

  const problem = S.passwordProblem(password);
  if (problem) return res.status(400).json({ error: problem });
  if (!raw) return res.status(400).json({ error: 'This reset link is invalid or has expired.' });

  const row = db.prepare('SELECT * FROM password_reset_tokens WHERE token_hash = ?').get(hashToken(raw));
  if (!row || row.used_at || row.expires_at <= now()) {
    audit({ action: 'password-reset', email: null, ok: 0, detail: row ? (row.used_at ? 'token already used' : 'token expired') : 'unknown token', ip });
    return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
  }

  const user = A.findUserById(row.user_id);
  if (!user || !user.is_active) return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });

  A.setPassword(user.id, password);                 // bcrypt hash + token_version +1 (sab purane sessions band)
  N.create(user.id, { title: 'Your password was reset', body: 'The new password is active and every old session was signed out.', category: 'account', link: '#/login' });
  db.prepare('UPDATE password_reset_tokens SET used_at = ? WHERE token_hash = ?').run(now(), row.token_hash);
  A.clearAuthCookies(res);
  audit({ action: 'password-reset', user_id: user.id, email: user.email, role: user.role, ok: 1, detail: 'password set from email link', ip });

  res.json({ ok: true, message: 'Password updated. Please log in with your new password.' });
});

router.get('/me', A.attachUser, (req, res) => {
  res.json({
    user: req.user ? A.publicUser(req.user) : null,
    csrf: (req.cookies && req.cookies[A.CSRF_COOKIE]) || null,
    backend: true
  });
});

router.post('/logout', A.attachUser, (req, res) => {
  if (req.user) {
    db.prepare('UPDATE users SET token_version = token_version + 1 WHERE id = ?').run(req.user.id);
    audit({ action: 'logout', user_id: req.user.id, email: req.user.email, role: req.user.role, ok: 1, ip: ipOf(req) });
  }
  A.clearAuthCookies(res);
  res.json({ ok: true });
});

router.patch('/me', A.requireAuth, A.csrfGuard, (req, res) => {
  const b = req.body || {};
  const { PROFILE_FIELDS } = require('../db');
  const patch = {};

  if (b.name !== undefined) {
    const name = S.text(b.name, 120);
    if (name.length < 3) return res.status(400).json({ error: 'Please enter your full name.' });
    patch.name = name;
  }
  if (b.phone !== undefined) patch.phone = S.text(b.phone, 30);
  if (b.program !== undefined) patch.program = S.text(b.program, 80);
  if (b.directorate !== undefined) patch.directorate = S.text(b.directorate, 80);

  const meta = Object.assign({}, req.user.meta || {});
  PROFILE_FIELDS.forEach(f => { if (b[f] !== undefined) meta[f] = S.text(b[f], 300); });

  const cols = [], vals = [];
  Object.keys(patch).forEach(k => { cols.push(k + ' = ?'); vals.push(patch[k]); });
  if (cols.length) db.prepare('UPDATE users SET ' + cols.join(', ') + ' WHERE id = ?').run(...vals, req.user.id);
  db.prepare('UPDATE users SET meta = ? WHERE id = ?').run(JSON.stringify(meta), req.user.id);

  audit({ action: 'profile-update', user_id: req.user.id, email: req.user.email, role: req.user.role, target: 'users', record_id: req.user.id, detail: Object.keys(patch).concat(Object.keys(meta)).slice(0, 8).join(', '), ip: ipOf(req) });
  res.json({ ok: true, user: A.publicUser(A.findUserById(req.user.id)) });
});

router.post('/change-password', A.requireAuth, A.csrfGuard, (req, res) => {
  const oldPw = (req.body && req.body.currentPassword) || '';
  const newPw = (req.body && req.body.newPassword) || '';
  const problem = S.passwordProblem(newPw);
  if (problem) return res.status(400).json({ error: problem });
  if (!bcrypt.compareSync(oldPw, req.user.password_hash)) {
    audit({ action: 'password-change', user_id: req.user.id, email: req.user.email, role: req.user.role, ok: 0, detail: 'galat current password', ip: ipOf(req) });
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }
  A.setPassword(req.user.id, newPw);
  N.create(req.user.id, { title: 'Your password was changed', body: 'If this was not you, contact the YPDC admin immediately.', category: 'account', link: '#/login' });
  audit({ action: 'password-change', user_id: req.user.id, email: req.user.email, role: req.user.role, ok: 1, ip: ipOf(req) });
  A.clearAuthCookies(res);
  res.json({ ok: true, message: 'Password changed — please log in again.' });
});

module.exports = { router, ipOf };

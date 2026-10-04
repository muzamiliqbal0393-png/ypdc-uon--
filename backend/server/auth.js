'use strict';

const crypto = require('crypto');

const jwt = require('jsonwebtoken');
const { db, now, audit, bcrypt } = require('./db');
const S = require('./security');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me';
const ADMIN_KEY = process.env.ADMIN_KEY || 'ypdc-admin-2026';
if (!process.env.ADMIN_KEY) console.warn('⚠️  ADMIN_KEY is not set in .env — using the built-in default. Set your own key before going live.');

const keyMatches = (given, real) => {
  const a = Buffer.from(String(given || ''));
  const b = Buffer.from(String(real || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const TOKEN_HOURS = S.int(process.env.TOKEN_HOURS, 8);
const COOKIE = 'ypdc_token';
const CSRF_COOKIE = 'ypdc_csrf';

if (!process.env.JWT_SECRET) {
  console.warn('[warn] JWT_SECRET is not set — add it to .env (required in production).');
}

const metaOf = u => {
  if (!u) return {};
  if (u.meta && typeof u.meta === 'object') return u.meta;
  try { return u.meta ? JSON.parse(u.meta) : {}; } catch (e) { return {}; }
};

const withMeta = u => {
  if (!u) return u;
  return Object.assign({}, u, { meta: metaOf(u) });
};

const findUserByEmail = email =>
  withMeta(db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email));

const findUserById = id => withMeta(db.prepare('SELECT * FROM users WHERE id = ?').get(id));

const publicUser = u => Object.assign({
  id: u.id, name: u.name, email: u.email, role: u.role,
  directorate: u.directorate || null, program: u.program || null, phone: u.phone || null
}, u.meta || {});

function createUser({ id, name, email, role, directorate, program, phone, password }, by) {
  const hash = bcrypt.hashSync(password, 12);
  db.prepare(`INSERT INTO users (id, name, email, role, directorate, program, phone, password_hash, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, name, email, role, directorate || null, program || null, phone || null, hash, now());
  audit({ action: 'user-create', target: 'users', record_id: id, detail: role + ' · ' + email, by: by || 'system', role: (by && by.role) || 'system', ok: 1 });
  return findUserById(id);
}

function setPassword(id, plain) {
  const hash = bcrypt.hashSync(plain, 12);
  db.prepare('UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?').run(hash, id);
}

function signToken(user, kind) {
  return jwt.sign(
    { sub: user.id, role: user.role, kind: kind || 'user', v: user.token_version || 0 },
    JWT_SECRET,
    { expiresIn: TOKEN_HOURS + 'h', issuer: 'ypdc-uon', audience: 'ypdc-web' }
  );
}

function verifyToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET, { issuer: 'ypdc-uon', audience: 'ypdc-web' });
    const user = findUserById(payload.sub);
    if (!user || !user.is_active) return null;
    if ((user.token_version || 0) !== (payload.v || 0)) return null;
    return { user, kind: payload.kind };
  } catch (e) {
    return null;
  }
}

function setAuthCookies(res, token, csrf) {
  const prod = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE, token, {
    httpOnly: true, sameSite: 'strict', secure: prod,
    maxAge: TOKEN_HOURS * 3600 * 1000, path: '/'
  });
  res.cookie(CSRF_COOKIE, csrf, {
    httpOnly: false, sameSite: 'strict', secure: prod,   // the frontend must read it (sends it in a header)
    maxAge: TOKEN_HOURS * 3600 * 1000, path: '/'
  });
}

function clearAuthCookies(res) {
  res.clearCookie(COOKIE, { path: '/' });
  res.clearCookie(CSRF_COOKIE, { path: '/' });
}

const newCsrf = () => require('crypto').randomBytes(24).toString('hex');

function attachUser(req, res, next) {
  req.user = null;
  const token = (req.cookies && req.cookies[COOKIE]) ||
    (req.headers.authorization && req.headers.authorization.replace(/^Bearer\s+/i, ''));
  if (token) {
    const hit = verifyToken(token);
    if (hit) { req.user = hit.user; req.kind = hit.kind; }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Login required.' });
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Login required.' });
    if (req.user.role === 'admin' || roles.includes(req.user.role)) return next();
    return res.status(403).json({ error: 'You are not allowed to perform this action (' + req.user.role + ').' });
  };
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Login required.' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Administrator only.' });
  next();
}

function csrfGuard(req, res, next) {
  const safe = ['GET', 'HEAD', 'OPTIONS'];
  if (safe.includes(req.method)) return next();
  const fromCookie = req.cookies && req.cookies[CSRF_COOKIE];
  const fromHeader = req.get('X-YPDC-CSRF');
  if (!fromCookie || !fromHeader || fromCookie !== fromHeader) {
    return res.status(403).json({ error: 'CSRF check failed — refresh the page and try again.' });
  }
  next();
}

module.exports = {
  findUserByEmail, findUserById, publicUser, createUser, setPassword, metaOf,
  signToken, verifyToken, setAuthCookies, clearAuthCookies, newCsrf,
  attachUser, requireAuth, requireRole, requireAdmin, csrfGuard,
  ADMIN_KEY, keyMatches, COOKIE, CSRF_COOKIE, TOKEN_HOURS
};

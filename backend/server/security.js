'use strict';

const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const headers = () => helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: false
});

const frameAncestors = () => {
  const list = (process.env.FRAME_ANCESTORS || "'self' https://*.e2b.app https://*.arena.ai").trim();
  return (req, res, next) => { res.setHeader('Content-Security-Policy', 'frame-ancestors ' + list); next(); };
};

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

function corsSelf(req, res, next) {
  const origin = req.headers.origin;
  if (origin) {
    const host = String(req.headers.host || '').toLowerCase();
    const originHost = origin.replace(/^https?:\/\//i, '').toLowerCase();
    if (host && originHost === host) return next();
  }
  return cors(corsOptions)(req, res, next);
}

const corsOptions = {
  origin(origin, cb) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Origin not allowed by CORS: ' + origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-YPDC-CSRF'],
  maxAge: 600
};

const limitsOff = process.env.RATE_LIMIT_OFF === '1';
if (limitsOff) console.log('⚠️  RATE_LIMIT_OFF=1 — rate limits are disabled for this test run only (do not use in production).');
const pass = (req, res, next) => next();

const globalLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests — please try again shortly.' }
});
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 8, skipSuccessfulRequests: true,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many login attempts — please try again in 15 minutes.' }
});
const registerLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 6, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many sign-up attempts — please try again in a little while.' }
});
const shaheenLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 12, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many Shaheen registration attempts — please try again later.' }
});
const teamLimit = rateLimit({             // team registration / join: 10 per 15 min
  windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many team registration attempts — please try again later.' }
});
const uploadLimit = rateLimit({          // registration photo / ID card: 40 per 15 min
  windowMs: 15 * 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many uploads — please try again in a little while.' }
});
const forgotLimit = rateLimit({          // reset link maangna: 8 per 15 min
  windowMs: 15 * 60 * 1000, max: 8,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many reset-link requests — please try again in 15 minutes.' }
});
const resetLimit = rateLimit({           // naya password set karna: 12 per 15 min
  windowMs: 15 * 60 * 1000, max: 12,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many password-reset attempts — please try again in 15 minutes.' }
});
const adminLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 4, skipSuccessfulRequests: true,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Admin login temporarily blocked (too many attempts).' }
});
const writeLimit = rateLimit({
  windowMs: 60 * 1000, max: 90, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many writes — please wait a minute and try again.' }
});

const pick = fn => (limitsOff ? pass : fn);

const ROLES = ['student', 'member', 'directorate', 'faculty', 'admin', 'alumni'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

const isUploadPath = (u) => /^(\/uploads|assets\/uploads)\/[A-Za-z0-9._-]{1,120}$/.test(String(u || '').trim());

const isEmail = v => typeof v === 'string' && v.length <= 120 && EMAIL_RE.test(v.trim());
const isId = v => typeof v === 'string' && ID_RE.test(v);
const isRole = v => ROLES.includes(v);
const text = (v, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const bool = v => v === true || v === 1 || v === '1';
const int = (v, def = 0) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : def; };

function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 8) return 'Password must be at least 8 characters.';
  if (pw.length > 72) return 'Password is too long (max 72).';
  if (!/[A-Za-z]/.test(pw) || (!/[0-9]/.test(pw) && !/[^A-Za-z0-9]/.test(pw))) return 'Password must include a number or symbol along with letters.';
  return null;
}

const WRITERS = {
  site: ['admin'], portals: ['admin'], directorates: ['admin'], cabinet: ['admin'],
  news: ['admin'], highlights: ['admin'], achievements: ['admin'], events: ['admin', 'faculty', 'directorate'],
  inductionDrive: ['admin'], roles: ['admin'], analytics: ['admin'], notificationGroups: ['admin'],
  notifications: ['admin', 'faculty', 'directorate'],
  people: ['admin'], profiles: ['admin'],
  tasks: ['admin', 'directorate', 'member', 'faculty'],
  duties: ['admin', 'member', 'directorate'],
  responsibilities: ['admin', 'member'],
  reports: ['admin', 'member', 'directorate', 'faculty'],
  proposals: ['admin', 'directorate', 'faculty'],
  workplan: ['admin', 'directorate'],
  objectives: ['admin', 'directorate'],
  facultyActivities: ['admin', 'faculty'],
  attendance: ['admin', 'faculty', 'directorate'],
  certificates: ['admin', 'faculty'],
  volunteer: ['admin', 'member', 'student'],
  registrations: ['admin', 'student', 'member'],
  applications: ['admin'],
  feedback: ['admin', 'faculty'],
  alumniNetwork: ['admin'], mentorship: ['admin', 'alumni'], careers: ['admin', 'alumni'],
  activityLog: ['admin', 'faculty', 'directorate'],
  meta: ['admin'], session: [],
  shaheen: ['admin'], shaheenRoster: ['admin']
};

const SIGNUP_ROLES = ['student', 'member', 'faculty', 'alumni'];
const canSignUp = role => SIGNUP_ROLES.includes(String(role || '').toLowerCase());

const canWrite = (role, key) => {
  const allowed = WRITERS[key];
  if (!allowed) return role === 'admin';
  return allowed.includes(role);
};

module.exports = {
  headers, frameAncestors, corsOptions, cors, corsSelf, limitsOff,
  globalLimit: pick(globalLimit), loginLimit: pick(loginLimit), adminLimit: pick(adminLimit), writeLimit: pick(writeLimit),
  registerLimit: pick(registerLimit), shaheenLimit: pick(shaheenLimit), resetLimit: pick(resetLimit), forgotLimit: pick(forgotLimit), teamLimit: pick(teamLimit), uploadLimit: pick(uploadLimit),
  ROLES, SIGNUP_ROLES, canSignUp, isEmail, isUploadPath, isId, isRole, text, bool, int, passwordProblem, WRITERS, canWrite
};

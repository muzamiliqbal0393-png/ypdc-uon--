'use strict';

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cookieParser = require('cookie-parser');

const S = require('./security');
const A = require('./auth');
const { db, now, getCollections, audit } = require('./db');
const authRoutes = require('./routes/auth');
const stateRoutes = require('./routes/state');
const dataRoutes = require('./routes/data');
const notifRoutes = require('./routes/notifications');
const searchRoutes = require('./routes/search');
const teamRoutes = require('./routes/teams');

const app = express();
const PORT = S.int(process.env.PORT, 8000);
const HOST = process.env.HOST || '0.0.0.0';

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(S.headers());
app.use(S.frameAncestors());
app.use(S.corsSelf);
app.use('/api/state', express.json({ limit: '3mb' }));
app.use(express.json({ limit: '600kb' }));
app.use(express.urlencoded({ extended: false, limit: '200kb' }));
app.use(cookieParser());
app.use(A.attachUser);
app.use('/api', S.globalLimit);

app.get('/api/healthz', (req, res) => {
  const count = sql => { try { return db.prepare(sql).get().c; } catch (e) { return 0; } };
  const collections = getCollections();
  const users = count('SELECT COUNT(*) c FROM users');
  const apps = count('SELECT COUNT(*) c FROM applications');
  const regs = count('SELECT COUNT(*) c FROM registrations');
  const feedback = count('SELECT COUNT(*) c FROM feedback');
  const messages = count('SELECT COUNT(*) c FROM messages');
  res.json({
    ok: true, service: 'ypdc-uon-api', time: now(),
    database: { users, applications: apps, seeded: users > 0 },
    counts: {
      users,
      directorates: Array.isArray(collections.directorates) ? collections.directorates.length : 0,
      events: Array.isArray(collections.events) ? collections.events.length : 0,
      applications: apps,
      registrations: regs,
      feedback,
      messages,
      certificates: Array.isArray(collections.certificates) ? collections.certificates.length : 0,
      tasks: Array.isArray(collections.tasks) ? collections.tasks.length : 0
    },
    security: { passwords: 'bcrypt-12', session: 'jwt-httpOnly-cookie', csrf: true, rateLimit: true }
  });
});

app.use('/api/auth', authRoutes.router);
app.use('/api', stateRoutes.router);
app.use('/api', dataRoutes.router);
app.use('/api', notifRoutes.router);
app.use('/api', searchRoutes.router);
app.use('/api', teamRoutes.router);

function findWebRoot() {
  if (process.env.WEB_ROOT) {
    try { if (fs.existsSync(path.join(process.env.WEB_ROOT, 'index.html'))) return process.env.WEB_ROOT; } catch (e) {}
  }
  const candidates = [
    path.join(__dirname, '..', '..', 'frontend'),
    path.join(__dirname, '..'),
    path.join(__dirname, '..', '..'),
    path.join(__dirname, '..', 'frontend')
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(path.join(c, 'index.html'))) return c; } catch (e) {}
  }
  return path.join(__dirname, '..');
}
const WEB_ROOT = findWebRoot();

const DEFAULT_UPLOADS = path.join(WEB_ROOT, 'assets', 'uploads');
const UPLOAD_DIR = process.env.UPLOAD_DIR || DEFAULT_UPLOADS;
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const UPLOAD_URL = UPLOAD_DIR === DEFAULT_UPLOADS ? 'assets/uploads/' : '/uploads/';
app.set('uploadDir', UPLOAD_DIR);
app.set('uploadUrl', UPLOAD_URL);
if (UPLOAD_URL === '/uploads/') {
  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', immutable: true }));
}

app.use(express.static(WEB_ROOT, {
  extensions: ['html'],
  setHeaders(res, file) {
    if (/\.(html|css|js)$/.test(file)) res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    else if (/\.(png|jpg|jpeg|svg|woff2|ico)$/.test(file)) res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  }
}));
app.get('/', (req, res) => res.sendFile(path.join(WEB_ROOT, 'index.html'), { headers: { 'Cache-Control': 'no-cache, must-revalidate' } }));

app.use('/api', (req, res) => res.status(404).json({ error: 'This API endpoint does not exist.' }));

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) {
    console.error('[error]', err.message);
    audit({ action: 'server-error', target: req.path, detail: err.message, ip: (req.ip || '').toString(), ok: 0 });
  }
  res.status(status).json({ error: status >= 500 ? 'A server error occurred.' : err.message });
});

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    const c = getCollections();
    const users = db.prepare('SELECT COUNT(*) c FROM users').get().c;
    console.log('─────────────────────────────────────────────');
    console.log('  YPDC UON server is running');
    console.log('  Website : http://localhost:' + PORT + '/   (files: ' + WEB_ROOT + ')');
    console.log('  API     : http://localhost:' + PORT + '/api/healthz');
    console.log('  Users   : ' + users + ' | collections: ' + Object.keys(c).length);
    if (!users) console.log('  ⚠ database is empty — first run: npm run seed');
    if (process.env.NODE_ENV !== 'production') {
      const A = require('./auth');
      console.log('  ─ login ─────────────────────────────────────');
      console.log('  Admin   : /#/admin  ·  ' + (process.env.ADMIN_EMAIL || 'admin@uon.edu.pk'));
      console.log('  Password: ADMIN_PASSWORD in server/.env (the one you set)' );
      console.log('  Note    : no demo accounts — add volunteers from the admin panel');
      console.log('  Admin key: ' + A.ADMIN_KEY + '   (in server/.env)');
    }
    console.log('─────────────────────────────────────────────');
  });
}

module.exports = app;

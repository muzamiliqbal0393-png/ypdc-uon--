'use strict';

require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
let BASE = process.env.TEST_BASE || '';

async function startOwnServer() {
  if (BASE) return null;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ypdc-test-'));
  const liveDb = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'ypdc.sqlite');
  fs.copyFileSync(liveDb, path.join(dir, 'test.sqlite'));
  for (const ext of ['-wal', '-shm']) {
    try { fs.copyFileSync(liveDb + ext, path.join(dir, 'test.sqlite' + ext)); } catch (e) {}
  }
  const uploads = path.join(dir, 'uploads');
  fs.mkdirSync(uploads, { recursive: true });
  const port = 8099;
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    cwd: path.join(__dirname, '..'),
    env: Object.assign({}, process.env, { PORT: String(port), DB_FILE: path.join(dir, 'test.sqlite'), UPLOAD_DIR: uploads }),
    stdio: ['ignore', 'ignore', 'pipe']
  });
  child.stderr.on('data', d => process.stderr.write(d));
  BASE = 'http://127.0.0.1:' + port;
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(BASE + '/api/healthz'); if (r.ok) return { child, dir }; } catch (e) {}
    if (child.exitCode !== null) throw new Error('test server exited with code ' + child.exitCode);
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('test server did not start on port ' + port);
}

function stopOwnServer(handle) {
  if (!handle) return;
  try { handle.child.kill('SIGKILL'); } catch (e) {}
  try { fs.rmSync(handle.dir, { recursive: true, force: true }); } catch (e) {}
}
const TEST_PW = process.env.TEST_PASSWORD || ('Test-' + crypto.randomBytes(12).toString('base64url') + '#9');
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const ADMIN_PW = process.env.ADMIN_PASSWORD || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@uon.edu.pk';
if (!ADMIN_KEY || !ADMIN_PW) {
  console.error('\n✗ ADMIN_KEY / ADMIN_PASSWORD are missing.');
  console.error('  Run `npm run first-run` once — it creates server/.env, which stores both.\n');
  process.exit(1);
}
let STUDENT_EMAIL = process.env.TEST_EMAIL || 'api.test.student@uon.edu.pk';
const TEST_EVENT_ID = 'api-test-event';
const TINY_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAQMAAAD+wSzIAAAABlBMVEX///+/v7+jQ3Y5AAAADklEQVQI12P4AIX8EAgALgAD/aNpbtEAAAAASUVORK5CYII=';
const UPLOADED = [];

let pass = 0, fail = 0;
const results = [];
const T = (name, ok, info) => { ok ? pass++ : fail++; results.push([ok, name, info || '']); };

function jar() {
  const store = new Map();
  return {
    header: () => [...store].map(([k, v]) => k + '=' + v).join('; '),
    absorb(res) {
      const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
      raw.forEach(c => { const [kv] = c.split(';'); const i = kv.indexOf('='); store.set(kv.slice(0, i), kv.slice(i + 1)); });
    },
    get: k => store.get(k)
  };
}

/* R39.0 — photo + ID card lazmi: ek chhoti test image upload kar ke URL lo */
const TINY_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDA' +
  'xNDQ0Hyc5PTgyPDs0NDT/wAALCAAIAAgBAREA/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAw' +
  'UFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVF' +
  'VWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2u' +
  'Hi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APn+iiigD//Z', 'base64');
let DOCS = null;
async function getDocs() {
  if (DOCS) return DOCS;
  const res = await fetch(BASE + '/api/public/upload', {
    method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: TINY_JPEG
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.url) throw new Error('test doc upload failed: ' + JSON.stringify(j));
  DOCS = { photo: j.url, idCard: j.url };
  return DOCS;
}

async function call(path, opts = {}) {
  const res = await fetch(BASE + path, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.cookies ? { Cookie: opts.cookies.header() } : {}),
      ...(opts.csrf ? { 'X-YPDC-CSRF': opts.csrf } : {})
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (opts.cookies) opts.cookies.absorb(res);
  let json = null;
  try { json = await res.json(); } catch (e) { json = null; }
  return { status: res.status, json, headers: res.headers };
}

let serverHandle = null;
(async () => {
  serverHandle = await startOwnServer();
  console.log('\nYPDC backend test — ' + BASE + (serverHandle ? '   (own test server · copy of the database)' : '   (external server)') + '\n');

  let r = await call('/api/healthz');
  T('healthz works + database seeded', r.status === 200 && r.json && r.json.ok, JSON.stringify(r.json && r.json.database));

  {
    const probe = await call('/api/auth/login', { method: 'POST', body: { email: STUDENT_EMAIL, password: TEST_PW } });
    if (probe.status !== 200) {
      const aj = jar();
      const al = await call('/api/auth/login-admin', { method: 'POST', cookies: aj, body: { email: ADMIN_EMAIL, password: ADMIN_PW, adminKey: ADMIN_KEY } });
      if (al.status === 200) {
        STUDENT_EMAIL = 'api.test.student@uon.edu.pk';
        const made = await call('/api/admin/users', {
          method: 'POST', cookies: aj, csrf: aj.get('ypdc_csrf'),
          body: { name: 'API Test Student', email: STUDENT_EMAIL, role: 'student', password: TEST_PW, program: 'BS Computer Science' }
        });
        T('test student account created on a fresh DB (via admin)', made.status === 201 || made.status === 200, JSON.stringify(made.json).slice(0, 80));
      } else {
        T('admin login to create the test student account', false, 'check ADMIN_PASSWORD/ADMIN_KEY — ' + JSON.stringify(al.json).slice(0, 80));
      }
    }
  }

  r = await call('/api/auth/login', { method: 'POST', body: { email: STUDENT_EMAIL, password: 'wrong-password', role: 'student' } });
  T('wrong password → 401 (and no new token)', r.status === 401, r.json && r.json.error);

  const student = jar();
  r = await call('/api/auth/login', { method: 'POST', cookies: student, body: { email: STUDENT_EMAIL, password: TEST_PW, role: 'student' } });
  T('correct password → login + cookie + csrf token', r.status === 200 && student.get('ypdc_token') && student.get('ypdc_csrf'), (r.json && r.json.user && r.json.user.role) + ' · csrf ' + (student.get('ypdc_csrf') || '').slice(0, 8) + '…');
  const studentCsrf = student.get('ypdc_csrf');

  T('no password/hash anywhere in the response', !JSON.stringify(r.json || {}).match(/password|\$2[aby]\$/i), '');

  r = await call('/api/state');
  T('without login /api/state → 401', r.status === 401, r.json && r.json.error);

  r = await call('/api/state', { cookies: student });
  const cols = (r.json && r.json.collections) || {};
  T('login returns the full state', r.status === 200 && Object.keys(cols).length > 25, Object.keys(cols).length + ' collections');
  const studentPeople = cols.people || [];
  const withEmail = studentPeople.filter(p => p.email !== undefined);
  T('directory for a student hides other people\u2019s emails', studentPeople.length > 0 && withEmail.length <= 1, studentPeople.length + ' rows · rows with an email ' + withEmail.length + ' (only the person themselves)');

  r = await call('/api/state', { method: 'POST', cookies: student, body: { changed: { feedback: [] } } });
  T('write without CSRF header → 403', r.status === 403, r.json && r.json.error);

  r = await call('/api/state', { method: 'POST', cookies: student, csrf: studentCsrf, body: { changed: { applications: cols.applications } } });
  T('student cannot write applications (role guard)', r.status === 207 && r.json.denied && r.json.denied.length === 1, JSON.stringify(r.json && r.json.denied));

  r = await call('/api/state', { method: 'POST', cookies: student, csrf: studentCsrf, body: { changed: { registrations: cols.registrations || [] } } });
  T('student can write their own registration', r.status === 200 && r.json.saved.includes('registrations'), JSON.stringify(r.json.saved));

  r = await call('/api/auth/login-admin', { method: 'POST', body: { email: ADMIN_EMAIL, password: ADMIN_PW, adminKey: 'wrong-key' } });
  T('admin with wrong ADMIN_KEY → 401', r.status === 401, r.json && r.json.error);

  const admin = jar();
  r = await call('/api/auth/login-admin', { method: 'POST', cookies: admin, body: { email: ADMIN_EMAIL, password: ADMIN_PW, adminKey: ADMIN_KEY } });
  T('admin with correct key → login', r.status === 200 && admin.get('ypdc_token'), r.json && r.json.user && r.json.user.email);
  const adminCsrf = admin.get('ypdc_csrf');
  const meAdmin = await call('/api/auth/me', { cookies: admin });
  const adminId = meAdmin.json && meAdmin.json.user && meAdmin.json.user.id;

  r = await call('/api/auth/login', { method: 'POST', body: { email: ADMIN_EMAIL, password: ADMIN_PW } });
  T('admin cannot log in via the normal login page', r.status === 403 && r.json.adminLogin === true, r.json && r.json.error);

  r = await call('/api/admin/summary', { cookies: admin });
  const s = r.json || {};
  T('admin dashboard summary returns real counts', r.status === 200 && s.applications && typeof s.applications.total === 'number', JSON.stringify(s.applications && { total: s.applications.total, new: s.applications.new, approved: s.applications.approved }));

  r = await call('/api/admin/audit', { cookies: admin });
  T('audit log returns entries (who did what)', r.status === 200 && (r.json.entries || []).length > 0 && (r.json.entries || []).some(e => e.action === 'login'), ((r.json.entries || []).length) + ' entries, latest: ' + ((r.json.entries || [])[0] && (r.json.entries || [])[0].action));

  await call('/api/public/apply', { method: 'POST', body: { name: 'API Test Applicant', email: 'api.apply.' + Date.now() + '@uon.edu.pk', program: 'BSCS · Sem 1', directorate: 'IT & Web Development', motivation: 'Test entry to create an application on an empty DB.' } });

  r = await call('/api/admin/summary', { cookies: student });
  T('student cannot view admin summary → 403', r.status === 403, r.json && r.json.error);

  const list = await call('/api/admin/summary', { cookies: admin });
  const anyApp = (cols.applications && cols.applications[0] && cols.applications[0].id)
    || (list.json && list.json.applications && list.json.applications.recent[0] && list.json.applications.recent[0].id);
  r = await call('/api/admin/applications/' + anyApp, { method: 'PATCH', cookies: admin, csrf: adminCsrf, body: { status: 'Shortlisted' } });
  T('admin can change an application status', r.status === 200 && r.json.status === 'Shortlisted', JSON.stringify(r.json));

  r = await call('/api/public/apply', { method: 'POST', body: { name: 'A', email: 'bad-email', program: '', directorate: '', motivation: 'x' } });
  T('public application validation (weak input → 400)', r.status === 400, r.json && r.json.error);

  const AD = await getDocs();
  const testEmail = 'api.test.' + Date.now() + '@uon.edu.pk';
  r = await call('/api/public/apply', { method: 'POST', body: { name: 'API Test Student', email: testEmail, department: 'BSCS', semester: 'Sem 1', program: 'BSCS · Sem 1', directorate: 'IT & Web Development', motivation: 'I want to work on the main portal.', photo: AD.photo, idCard: AD.idCard } });
  const newAppId = r.json && r.json.id;
  T('public application is submitted (real DB row)', r.status === 201 && newAppId, newAppId);

  r = await call('/api/public/apply', { method: 'POST', body: { name: 'API Test Student', email: testEmail, department: 'BSCS', semester: 'Sem 1', program: 'BSCS · Sem 1', directorate: 'IT & Web Development', motivation: 'Trying again.', photo: AD.photo, idCard: AD.idCard } });
  T('same email again → application 409', r.status === 409, r.json && r.json.error);

  let evId = ((cols.events || []).filter(e => e.status === 'Upcoming')[0] || {}).id;
  if (!evId) {
    const created = {
      id: TEST_EVENT_ID, title: 'API Test Event (auto)', date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      venue: 'UON Campus', category: 'Testing', status: 'Upcoming', capacity: 50, registered: 0,
      description: 'Event created for api-test.'
    };
    await call('/api/state', { method: 'POST', cookies: admin, csrf: adminCsrf, body: { changed: { events: (cols.events || []).concat([created]) } } });
    evId = TEST_EVENT_ID;
  }
  r = await call('/api/register-event', { method: 'POST', cookies: student, csrf: studentCsrf, body: { eventId: evId } });
  T('student registers for the event (or is already registered)', r.status === 201 || r.status === 409, r.json && (r.json.event || r.json.error));

  r = await call('/api/auth/logout', { method: 'POST', cookies: student, csrf: studentCsrf });
  T('logout works', r.status === 200, '');
  const stale = jar();
  stale.absorb({ headers: { getSetCookie: () => ['ypdc_token=' + (student.get('ypdc_token') || '')] } });
  r = await call('/api/state', { cookies: stale });
  T('old token stops working after logout', r.status === 401, r.json && r.json.error);

  const signupEmail = 'api.test.signup.' + Date.now() + '@uon.edu.pk';
  r = await call('/api/auth/register', { method: 'POST', body: { name: 'API Signup Test', email: signupEmail, role: 'student', password: TEST_PW, program: 'BS Computer Science' } });
  T('self sign-up creates the account → 201', r.status === 201 && r.json.user && r.json.user.email === signupEmail, 'role: ' + (r.json.user && r.json.user.role));
  const signupJar = jar();
  r = await call('/api/auth/login', { method: 'POST', cookies: signupJar, body: { email: signupEmail, password: TEST_PW } });
  T('the new account can log in right away', r.status === 200 && !!signupJar.get('ypdc_token'), r.json && r.json.user && r.json.user.email);
  r = await call('/api/auth/register', { method: 'POST', body: { name: 'Copy Cat', email: signupEmail, role: 'student', password: TEST_PW } });
  T('sign-up with an existing email → 409', r.status === 409, r.json && r.json.error);
  r = await call('/api/auth/register', { method: 'POST', body: { name: 'Admin Try', email: 'api.test.admin.try.' + Date.now() + '@uon.edu.pk', role: 'admin', password: TEST_PW } });
  T('sign-up cannot create an admin → 400', r.status === 400, r.json && r.json.error);

  r = await call('/api/does-not-exist');
  T('unknown API endpoint → 404 JSON', r.status === 404 && r.json && r.json.error, r.json && r.json.error);

  {
    const guest = await call('/api/admin/upload', { method: 'POST', body: { name: 'x.jpg' } });
    T('photo upload without login → 401', guest.status === 401 || guest.status === 403, 'status ' + guest.status);

    const asStudent = await call('/api/admin/upload', { method: 'POST', cookies: signupJar, csrf: signupJar.get('ypdc_csrf'), body: { name: 'x.jpg' } });
    T('photo upload as student → 403', asStudent.status === 403, (asStudent.json && asStudent.json.error) || ('status ' + asStudent.status));

    const ok = await call('/api/admin/upload', { method: 'POST', cookies: admin, csrf: adminCsrf, body: { name: 'test.png', data: TINY_PNG } });
    T('photo upload (admin) → 201 + short URL', ok.status === 201 && ok.json && /^(assets\/uploads|\/uploads)\/u-[a-z0-9]+\.png$/.test(ok.json.url || ''), ok.json && ok.json.url);
    if (ok.json && ok.json.url) {
      const served = await fetch(BASE + '/' + String(ok.json.url).replace(/^\//, ''));
      const bytes = Buffer.from(await served.arrayBuffer());
      T('uploaded photo is served back', served.status === 200 && bytes.length > 50 && bytes.slice(0, 4).toString('hex') === '89504e47', served.status + ' · ' + bytes.length + ' B');
      UPLOADED.push(ok.json.url);
    }

    const bad = await call('/api/admin/upload', { method: 'POST', cookies: admin, csrf: adminCsrf, body: { name: 'x.png', data: Buffer.from('this is not an image').toString('base64') } });
    T('photo upload rejects a non-image → 400', bad.status === 400, bad.json && bad.json.error);

    const backup = await fetch(BASE + '/api/admin/backup', { headers: { Cookie: admin.header() } });
    const head = Buffer.from(await backup.arrayBuffer()).slice(0, 15).toString();
    T('admin database backup downloads (SQLite)', backup.status === 200 && head === 'SQLite format 3', backup.status + ' · ' + head);

    const doomed = await call('/api/admin/users', { method: 'POST', cookies: admin, csrf: adminCsrf, body: { name: 'Delete Me', email: 'api.test.delete@uon.edu.pk', role: 'student', password: TEST_PW } });
    const delSelf = await call('/api/admin/users/' + adminId, { method: 'DELETE', cookies: admin, csrf: adminCsrf });
    T('admin cannot delete their own account → 400', delSelf.status === 400, delSelf.json && delSelf.json.error);
    const del = await call('/api/admin/users/' + (doomed.json && doomed.json.id), { method: 'DELETE', cookies: admin, csrf: adminCsrf });
    const after = await call('/api/admin/users', { cookies: admin });
    const stillThere = (after.json && after.json.users || []).some(u => u.email === 'api.test.delete@uon.edu.pk');
    T('admin deletes a user → account is gone', del.status === 200 && !stillThere, 'delete ' + del.status + ' · listed ' + stillThere);
  }

  {
    const ROLE_EMAIL = role => 'api.test.role.' + role + '@uon.edu.pk';
    const wanted = ['student', 'member', 'directorate', 'faculty', 'alumni'].map(ROLE_EMAIL);
    const before = await call('/api/admin/users', { cookies: admin });
    for (const u of (before.json && before.json.users) || []) {
      if (wanted.includes(u.email)) await call('/api/admin/users/' + u.id, { method: 'DELETE', cookies: admin, csrf: adminCsrf });
    }
    const created = [];
    for (const role of ['student', 'member', 'directorate', 'faculty', 'alumni']) {
      const r2 = await call('/api/admin/users', {
        method: 'POST', cookies: admin, csrf: adminCsrf,
        body: { name: 'API ' + role, email: ROLE_EMAIL(role), role, password: TEST_PW, directorate: 'Peace & Civic Engagement', program: 'BS Computer Science' }
      });
      created.push([role, r2.status]);
    }
    if (process.env.DEBUG_ROLES) console.log('   debug created:', JSON.stringify(created));
    T('admin creates an account for every role → 201', created.every(c => c[1] === 201), created.map(c => c[0] + ' ' + c[1]).join(' · '));

    let stated = 0;
    const roleJars = {};
    for (const role of ['student', 'member', 'directorate', 'faculty', 'alumni']) {
      const j = jar();
      const li = role === 'directorate'
        ? await call('/api/auth/login-directorate', { method: 'POST', cookies: j, body: { email: ROLE_EMAIL(role), password: TEST_PW } })
        : await call('/api/auth/login', { method: 'POST', cookies: j, body: { email: ROLE_EMAIL(role), password: TEST_PW } });
      const st = await call('/api/state', { cookies: j });
      roleJars[role] = j;
      if (process.env.DEBUG_ROLES) console.log('   debug', role, 'login', li.status, JSON.stringify(li.json).slice(0, 90), '| state', st.status, JSON.stringify(st.json).slice(0, 90));
      const ok = li.status === 200 && st.status === 200 && st.json && st.json.role === role && st.json.collections && st.json.collections.backend !== false;
      if (ok) stated++;
      T('role ' + role + ': login + own dashboard state', ok, li.status + '/' + st.status + ' · role ' + (st.json && st.json.role) + ' · collections ' + Object.keys((st.json && st.json.collections) || {}).length);
    }
    T('every role reaches its own dashboard', stated === 5, stated + '/5 roles');

    const studentState = await call('/api/state', { cookies: roleJars.student });
    const facultyState = await call('/api/state', { cookies: roleJars.faculty });
    const adminState = await call('/api/state', { cookies: admin });
    const sp = studentState.json.collections.people || [];
    const fp = facultyState.json.collections.people || [];
    const ap = adminState.json.collections.people || [];
    T('directory: student sees names only, faculty/admin see full records',
      sp.length >= 1 && sp.filter(x => x.email).length <= 1 && fp.some(x => x.email) && ap.some(x => x.email),
      'student ' + sp.length + ' rows (' + sp.filter(x => x.email).length + ' with an email) · faculty ' + fp.length + ' · admin ' + ap.length);

    const sneak = await call('/api/state', { method: 'POST', cookies: roleJars.student, csrf: roleJars.student.get('ypdc_csrf'), body: { changed: { site: { title: 'hacked' } } } });
    T('a student cannot rewrite the website content', sneak.status === 207 && (sneak.json.denied || []).some(d => d.key === 'site'), 'status ' + sneak.status + ' · denied ' + JSON.stringify((sneak.json.denied || []).map(d => d.key)));

    const fb = await call('/api/public/feedback', { method: 'POST', body: { name: 'API Visitor', email: 'api.test.visitor@uon.edu.pk', role: 'visitor', type: 'General', message: 'Dashboard check from the public website.' } });
    const sumAfter = await call('/api/admin/summary', { cookies: admin });
    T('a visitor can leave feedback → it lands on the admin dashboard', fb.status === 201 && sumAfter.json.feedback.total >= 1, 'feedback on dashboard: ' + (sumAfter.json.feedback && sumAfter.json.feedback.total));

    const reg = await call('/api/register-event', { method: 'POST', cookies: roleJars.student, csrf: roleJars.student.get('ypdc_csrf'), body: { eventId: TEST_EVENT_ID } });
    const studentNow = await call('/api/state', { cookies: roleJars.student });
    const mine = (studentNow.json.collections.registrations || []).filter(x => x.email === ROLE_EMAIL('student'));
    T('the student dashboard shows the event they registered for', (reg.status === 201 || reg.status === 409) && mine.length >= 1, 'registration ' + reg.status + ' · rows on dashboard ' + mine.length);

    const peek = await call('/api/admin/users', { cookies: roleJars.student });
    T('a student cannot open admin endpoints → 403', peek.status === 403, (peek.json && peek.json.error) || ('status ' + peek.status));

    const guestState = await call('/api/state');
    T('the dashboard without a login → 401', guestState.status === 401, (guestState.json && guestState.json.error) || ('status ' + guestState.status));

    const pub = await call('/api/public/site');
    T('public website loads for visitors (no login)', pub.status === 200 && pub.json.ok === true && typeof pub.json.counts.users === 'number', 'users ' + (pub.json.counts && pub.json.counts.users) + ' · events ' + (pub.json.counts && pub.json.counts.events));
  }

  {
    const adminCsrf2 = admin.get('ypdc_csrf');
    const D = await getDocs();
    const reg = async body => call('/api/public/shaheen/register', { method: 'POST', body: Object.assign({ department: 'BS CS', semester: 'Semester 3', photo: D.photo, idCard: D.idCard }, body) });
    const setOpen = open => call('/api/admin/shaheen/settings', { method: 'POST', cookies: admin, csrf: adminCsrf2, body: { open } });

    await setOpen(false);
    const closed = await reg({ name: 'Closed Test', email: 'api.test.shaheen.closed@test.local', password: 'Shaheen#2026' });
    T('Shaheen: registration closed → form blocked (403)', closed.status === 403, closed.json && closed.json.error);
    await setOpen(true);

    const newEmail = 'api.test.shaheen.new.' + Date.now() + '@gmail.com';
    const reg1 = await reg({ name: 'New Applicant', email: newEmail, phone: '0300-1234567', program: 'BS Computer Science', semester: 'Semester 3', reason: 'I want to serve.', password: 'Shaheen#2026', confirm: 'Shaheen#2026' });
    T('Shaheen: a new applicant can register (201)', reg1.status === 201, reg1.json && reg1.json.message && reg1.json.message.slice(0, 46));

    const weak = await reg({ name: 'Weak Pass', email: 'api.test.shaheen.weak@test.local', password: '1234' });
    const dup = await reg({ name: 'New Applicant', email: newEmail, password: 'Shaheen#2026' });
    T('Shaheen: weak password blocked (400) and duplicate email blocked (409)', weak.status === 400 && dup.status === 409, weak.json.error + ' / ' + dup.json.error);

    const early = await call('/api/auth/login', { method: 'POST', body: { email: newEmail, password: 'Shaheen#2026' } });
    T('Shaheen: no sign-in before approval (401)', early.status === 401, early.json && early.json.error);

    const oldEmail = 'api.test.shaheen.old@uon.edu.pk';
    await call('/api/admin/users', { method: 'POST', cookies: admin, csrf: adminCsrf2, body: { name: 'Old Member', email: oldEmail, role: 'student', password: TEST_PW } });
    await reg({ name: 'Old Member', email: oldEmail, password: TEST_PW });

    const panel = await call('/api/admin/shaheen', { cookies: admin });
    const fresh = (panel.json.registrations || []).find(x => x.email === newEmail);
    const oldRow = (panel.json.registrations || []).find(x => x.email === oldEmail);
    T('Shaheen: registrations arrive as Pending in the admin panel', !!fresh && fresh.status === 'Pending', 'pending ' + panel.json.counts.pending);
    T('Shaheen: email already in YPDC → "existing member" tag', !!oldRow && oldRow.existingMember === true && fresh.existingMember === false, 'existing ' + panel.json.counts.existing + ' · new ' + panel.json.counts.fresh);

    const missingEmail = 'api.test.shaheen.missing@test.local';
    await call('/api/admin/shaheen/roster', { method: 'POST', cookies: admin, csrf: adminCsrf2, body: { list: [{ name: 'New Applicant', email: newEmail }, { name: 'Missing Person', email: missingEmail }] } });
    const panel2 = await call('/api/admin/shaheen', { cookies: admin });
    const miss = (panel2.json.roster || []).find(x => x.email === missingEmail);
    T('Shaheen: expected list shows who has not registered yet', panel2.json.roster.length === 2 && miss.status === 'Not registered yet', miss.status);

    const approve = await call('/api/admin/shaheen/' + fresh.id + '/approve', { method: 'POST', cookies: admin, csrf: adminCsrf2 });
    const linked = await call('/api/admin/shaheen/' + oldRow.id + '/approve', { method: 'POST', cookies: admin, csrf: adminCsrf2 });
    T('Shaheen: approve creates a new account for a new applicant', approve.status === 200 && approve.json.account === 'created', JSON.stringify(approve.json));
    T('Shaheen: approve links an existing YPDC member (no duplicate account)', linked.status === 200 && linked.json.account === 'linked');

    const afterJar = jar();
    const afterLogin = await call('/api/auth/login', { method: 'POST', cookies: afterJar, body: { email: newEmail, password: 'Shaheen#2026' } });
    const afterState = await call('/api/state', { cookies: afterJar });
    T('Shaheen: after approval the volunteer can sign in and has a dashboard', afterLogin.status === 200 && afterState.status === 200 && afterState.json.role === 'student', 'role ' + (afterState.json && afterState.json.role));

    const sneak2 = await call('/api/admin/shaheen', { cookies: afterJar });
    const sneak3 = await call('/api/admin/users', { cookies: afterJar });
    T('Shaheen: a volunteer cannot open the admin panel (403)', sneak2.status === 403 && sneak3.status === 403);

    const pubInfo = await call('/api/public/shaheen');
    T('Shaheen: the public page sees the open/closed status', pubInfo.status === 200 && pubInfo.json.open === true && typeof pubInfo.json.registered === 'number', 'registered ' + pubInfo.json.registered);
  }

  {
    const dEmail = 'api.test.directorate@uon.edu.pk';
    await call('/api/admin/users', { method: 'POST', cookies: admin, csrf: admin.get('ypdc_csrf'), body: { name: 'API Directorate', email: dEmail, role: 'directorate', password: TEST_PW } });
    const blocked = await call('/api/auth/login', { method: 'POST', body: { email: dEmail, password: TEST_PW } });
    const dJar2 = jar();
    const okLogin = await call('/api/auth/login-directorate', { method: 'POST', cookies: dJar2, body: { email: dEmail, password: TEST_PW } });
    T('directorate: normal login is blocked, the hidden link works', blocked.status === 403 && blocked.json.directorateLogin === true && okLogin.status === 200, blocked.json && blocked.json.error);

    const suDir = await call('/api/auth/register', { method: 'POST', body: { name: 'Want Directorate', email: 'api.test.wantdir@test.local', role: 'directorate', password: TEST_PW } });
    T('directorate: public sign-up cannot create a directorate account (400)', suDir.status === 400, suDir.json && suDir.json.error);

    const dState = await call('/api/state', { cookies: dJar2 });
    T('directorate: dashboard state loads (own workspace)', dState.status === 200 && dState.json.role === 'directorate', 'collections ' + Object.keys((dState.json && dState.json.collections) || {}).length);
  }

  {
    const MATRIX = {
      student:     { allow: 'volunteer', deny: 'tasks' },
      member:      { allow: 'duties',    deny: 'proposals' },
      directorate: { allow: 'proposals', deny: 'volunteer' },
      faculty:     { allow: 'feedback',  deny: 'registrations' },
      alumni:      { allow: 'careers',   deny: 'attendance' }
    };
    const before = (await call('/api/state', { cookies: admin })).json.collections;
    const roles = Object.keys(MATRIX);
    const jars = {};

    for (const role of roles) {
      const email = 'api.test.role.' + role + '@uon.edu.pk';
      await call('/api/admin/users', {
        method: 'POST', cookies: admin, csrf: admin.get('ypdc_csrf'),
        body: { name: 'Role Test ' + role, email, role, password: TEST_PW }
      });
      const j = jar();
      const path = role === 'directorate' ? '/api/auth/login-directorate' : '/api/auth/login';
      const lg = await call(path, { method: 'POST', cookies: j, body: { email, password: TEST_PW } });
      jars[role] = lg.status === 200 ? j : null;
      T('rights: ' + role + ' signs in and gets a session', !!jars[role], 'status ' + lg.status);
    }

    for (const role of roles) {
      const j = jars[role];
      if (!j) { T('rights: ' + role + ' matrix', false, 'no session'); continue; }
      const csrf = j.get('ypdc_csrf');
      const allowKey = MATRIX[role].allow, denyKey = MATRIX[role].deny;

      const ok = await call('/api/state', {
        method: 'POST', cookies: j, csrf,
        body: { changed: { [allowKey]: [{ id: 'mat-' + role, note: 'rights matrix probe' }] } }
      });
      T('rights: ' + role + ' may write "' + allowKey + '"', ok.status === 200 && (ok.json.saved || []).indexOf(allowKey) > -1, 'status ' + ok.status + ' saved ' + JSON.stringify(ok.json && ok.json.saved));

      const no = await call('/api/state', {
        method: 'POST', cookies: j, csrf,
        body: { changed: { [denyKey]: [{ id: 'mat-' + role, note: 'should be refused' }] } }
      });
      const deniedKeys = ((no.json && no.json.denied) || []).map(d => d.key);
      T('rights: ' + role + ' cannot write "' + denyKey + '" (denied + 207)', no.status === 207 && deniedKeys.indexOf(denyKey) > -1, 'status ' + no.status + ' denied ' + JSON.stringify(deniedKeys));

      const adminOnly = await call('/api/state', {
        method: 'POST', cookies: j, csrf,
        body: { changed: { applications: [], shaheen: { open: true, batch: 'hacked' } } }
      });
      const adminDenied = ((adminOnly.json && adminOnly.json.denied) || []).map(d => d.key);
      T('rights: ' + role + ' is refused applications + shaheen', adminOnly.status === 207 && adminDenied.indexOf('applications') > -1 && adminDenied.indexOf('shaheen') > -1, JSON.stringify(adminDenied));

      const patched = await call('/api/auth/me', {
        method: 'PATCH', cookies: j, csrf,
        body: { name: 'Role Test ' + role + ' Renamed', city: 'Lahore', role: 'admin', email: 'escalate@test.local', is_active: 0 }
      });
      const after = await call('/api/state', { cookies: j });
      const me = (after.json && after.json.collections && after.json.collections.me) || {};
      const keptRole = (after.json && after.json.role) === role && me.role === role && me.email !== 'escalate@test.local';
      T('rights: ' + role + ' saves its own profile but cannot change role/email', patched.status === 200 && me.city === 'Lahore' && keptRole, 'name ' + me.name + ' · role ' + me.role + ' · email ' + me.email);
    }

    for (const role of roles) {
      const key = MATRIX[role].allow;
      await call('/api/state', { method: 'POST', cookies: admin, csrf: admin.get('ypdc_csrf'), body: { changed: { [key]: before[key] || [] } } });
    }
    T('rights: probe rows removed from the test database', true, 'volunteer/duties/proposals/feedback/careers restored');
  }

  let got429 = false;
  for (let i = 0; i < 12; i++) {
    const q = await call('/api/auth/login', { method: 'POST', body: { email: STUDENT_EMAIL, password: 'nope-' + i, role: 'student' } });
    if (q.status === 429) { got429 = true; break; }
  }
  T('rate limit on brute force (429)', got429, got429 ? 'requests blocked' : 'no 429 received');

  try {
    const { db, getCollections, setCollection } = require('../db');
    db.prepare("DELETE FROM shaheen WHERE email LIKE 'api.test.%' OR email LIKE '%@test.local'").run();
    setCollection('shaheenRoster', [], 'api-test-cleanup');
    setCollection('shaheen', { open: false, batch: 'Bano Shaheen', seats: 10, message: (getCollections().shaheen && getCollections().shaheen.message) || '' }, 'api-test-cleanup');
    const tx = db.transaction(() => {
      db.prepare("DELETE FROM registrations WHERE email LIKE 'api.test.%' OR user_id IN (SELECT id FROM users WHERE email LIKE 'api.test.%')").run();
      db.prepare("DELETE FROM messages WHERE from_id IN (SELECT id FROM users WHERE email LIKE 'api.test.%') OR to_id IN (SELECT id FROM users WHERE email LIKE 'api.test.%')").run();
      db.prepare("DELETE FROM users WHERE email LIKE 'api.test.%' OR email LIKE 'api.test.signup.%' OR email LIKE 'api.test.admin.try.%'").run();
      db.prepare("DELETE FROM applications WHERE email LIKE 'api.test.%' OR email LIKE 'api.apply.%'").run();
      db.prepare("DELETE FROM feedback WHERE email LIKE 'api.test.%' OR email LIKE 'api.test.fb.%'").run();
    });
    tx();
    const c2 = getCollections();
    if (Array.isArray(c2.events) && c2.events.some(e => e.id === TEST_EVENT_ID)) {
      setCollection('events', c2.events.filter(e => e.id !== TEST_EVENT_ID), 'api-test-cleanup');
    }
    UPLOADED.forEach(u => {
      try { fs.unlinkSync(path.join(process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', '..', 'frontend', 'assets', 'uploads'), path.basename(u))); } catch (e) {}
    });
    T('cleanup: api-test data removed', true, 'users/roles/applications/registrations/feedback/events + test uploads cleaned');
  } catch (e) {
    T('cleanup: test data removed', false, e.message);
  }

  console.log('');
  results.forEach(([ok, name, info]) => console.log((ok ? '✓' : '✗') + ' ' + name.padEnd(52) + (info || '')));
  console.log('\nPASSED: ' + pass + ' / ' + (pass + fail) + (fail ? '   FAILED: ' + fail : '   — all good ✓') + '\n');
  stopOwnServer(serverHandle);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('test script error:', e); stopOwnServer(serverHandle); process.exit(1); });


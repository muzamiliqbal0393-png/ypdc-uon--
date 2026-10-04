'use strict';

/* Teams — team leader registration, team records, team members, team tasks.
   Sab kuch SQLite mein rehta hai (source of truth), frontend sirf display karta hai. */

const express = require('express');
const crypto = require('crypto');
const { db, now, audit } = require('../db');
const A = require('../auth');
const S = require('../security');
const mail = require('../email');
const N = require('../notify');
const { ipOf } = require('./auth');

const router = express.Router();
const rid = p => p + '-' + crypto.randomBytes(6).toString('hex');

const TEAM_STATUS = ['Pending', 'Active', 'Inactive', 'Rejected'];
const MEMBER_STATUS = ['Pending', 'Active', 'Removed'];
const TASK_STATUS = ['Pending', 'In Progress', 'Done'];

const memberCount = teamId =>
  db.prepare("SELECT COUNT(*) c FROM team_members WHERE team_id = ? AND status <> 'Removed'").get(teamId).c;

const rowTeam = r => ({
  id: r.id,
  teamId: r.team_id,
  name: r.team_name,
  leader: { id: r.leader_user_id || null, name: r.leader_name, email: r.leader_email, phone: r.leader_phone || '', program: r.program || '', semester: r.semester || '', photo: r.photo || '', idCard: r.id_card || '' },
  description: r.description || '',
  purpose: r.purpose || '',
  expectedMembers: r.expected_members || 0,
  status: r.status,
  decidedBy: r.decided_by || null,
  decidedAt: r.decided_at || null,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  members: memberCount(r.team_id)
});

const rowMember = r => ({
  id: r.id, teamId: r.team_id, userId: r.user_id || null, name: r.name, email: r.email,
  phone: r.phone || '', program: r.program || '', semester: r.semester || '', motivation: r.motivation || '',
  photo: r.photo || '', idCard: r.id_card || '',
  status: r.status, joinedAt: r.joined_at, decidedAt: r.decided_at || null
});

const rowTask = r => ({
  id: r.id, teamId: r.team_id, title: r.title, detail: r.detail || '', assignee: r.assignee || '',
  due: r.due || '', priority: r.priority, status: r.status,
  createdBy: r.created_by || '', createdAt: r.created_at, updatedAt: r.updated_at
});

const getTeam = teamId => db.prepare('SELECT * FROM teams WHERE team_id = ?').get(String(teamId || ''));

/* naya public team id: TEAM-001, TEAM-002 ... (transaction ke andar, is liye duplicate nahi) */
function nextTeamId() {
  const rows = db.prepare('SELECT team_id FROM teams').all();
  let max = 0;
  rows.forEach(r => {
    const m = /^TEAM-(\d+)$/.exec(String(r.team_id || ''));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return 'TEAM-' + String(max + 1).padStart(3, '0');
}

/* kis user ka kya rishta hai is team se */
function relationOf(team, user) {
  if (!team || !user) return 'none';
  if (user.role === 'admin' || user.role === 'faculty') return 'staff';
  if ((team.leader_user_id && team.leader_user_id === user.id) ||
      String(team.leader_email).toLowerCase() === String(user.email).toLowerCase()) return 'leader';
  const m = db.prepare("SELECT * FROM team_members WHERE team_id = ? AND (user_id = ? OR email = ? COLLATE NOCASE) AND status <> 'Removed'")
    .get(team.team_id, user.id, String(user.email || '').toLowerCase());
  if (m) return m.status === 'Active' ? 'member' : 'applicant';
  return 'none';
}

const teamByUser = user => {
  if (!user) return null;
  const led = db.prepare('SELECT * FROM teams WHERE leader_user_id = ? OR leader_email = ? COLLATE NOCASE ORDER BY created_at DESC')
    .get(user.id, String(user.email || '').toLowerCase());
  if (led) return led;
  const m = db.prepare("SELECT t.* FROM team_members m JOIN teams t ON t.team_id = m.team_id WHERE (m.user_id = ? OR m.email = ? COLLATE NOCASE) AND m.status <> 'Removed' ORDER BY m.joined_at DESC")
    .get(user.id, String(user.email || '').toLowerCase());
  return m || null;
};

/* ---------------- public: joinable teams ---------------- */
router.get('/teams/open', (req, res) => {
  const q = S.text(req.query.q, 60);
  let rows = db.prepare("SELECT * FROM teams WHERE status = 'Active' ORDER BY team_name COLLATE NOCASE").all();
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter(t => (t.team_name + ' ' + t.leader_name + ' ' + (t.purpose || '')).toLowerCase().indexOf(needle) >= 0);
  }
  res.json({
    ok: true,
    teams: rows.slice(0, 200).map(t => ({
      teamId: t.team_id, name: t.team_name, leader: t.leader_name,
      purpose: (t.purpose || '').slice(0, 180), members: memberCount(t.team_id),
      expectedMembers: t.expected_members || 0, since: (t.decided_at || t.created_at || '').slice(0, 10)
    })),
    total: rows.length
  });
});

/* ---------------- public: team leader registration ---------------- */
router.post('/teams', S.teamLimit, (req, res) => {
  const b = req.body || {};
  const name = S.text(b.name, 120);
  const email = S.text(b.email, 120).toLowerCase();
  const teamName = S.text(b.teamName, 80);
  const phone = S.text(b.phone, 30);
  const program = S.text(b.program, 90);
  const semester = S.text(b.semester, 30);
  const description = S.text(b.description, 600);
  const purpose = S.text(b.purpose, 600);
  const expected = S.int(b.expectedMembers, 0);

  const photo = S.text(b.photo, 300);
  const idCard = S.text(b.idCard, 300);

  if (name.length < 3) return res.status(400).json({ error: 'Please enter your full name (at least 3 characters).' });
  if (!S.isEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (!S.isUploadPath(photo)) return res.status(400).json({ error: 'Please upload your photograph (camera or gallery).' });
  if (!S.isUploadPath(idCard)) return res.status(400).json({ error: 'Please upload a picture of your ID card.' });
  if (phone && !/^[0-9+()\-\s]{7,20}$/.test(phone)) return res.status(400).json({ error: 'Please enter a valid phone number.' });
  if (!program) return res.status(400).json({ error: 'Please enter your university / program.' });
  if (!teamName || teamName.length < 3) return res.status(400).json({ error: 'Please enter a team name (at least 3 characters).' });
  if (teamName.length > 60) return res.status(400).json({ error: 'Team name is too long (60 characters maximum).' });
  if (!/[A-Za-z]/.test(teamName)) return res.status(400).json({ error: 'Please use a readable team name.' });
  if (purpose.length < 10) return res.status(400).json({ error: 'Please describe the team purpose (at least 10 characters).' });
  if (!expected || expected < 2 || expected > 500) return res.status(400).json({ error: 'Expected members must be between 2 and 500.' });

  const dupeLeader = db.prepare("SELECT team_id, team_name FROM teams WHERE leader_email = ? COLLATE NOCASE AND status <> 'Rejected'").get(email);
  if (dupeLeader) return res.status(409).json({ error: 'You already have a team registration (' + dupeLeader.team_id + ' — ' + dupeLeader.team_name + ').' });

  const dupeName = db.prepare("SELECT team_id FROM teams WHERE team_name = ? COLLATE NOCASE AND status <> 'Rejected'").get(teamName);
  if (dupeName) return res.status(409).json({ error: 'This team name is already registered. Please choose another name.' });

  const user = A.findUserByEmail(email);
  const teamId = nextTeamId();
  const id = rid('t');
  db.prepare(`INSERT INTO teams (id, team_id, team_name, leader_user_id, leader_name, leader_email, leader_phone,
              program, semester, photo, id_card, description, purpose, expected_members, status, created_at, updated_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'Pending',?,?)`)
    .run(id, teamId, teamName, user ? user.id : null, name, email, phone, program, semester, photo, idCard,
         description, purpose, expected, now(), now());

  audit({ action: 'team-register', user_id: user ? user.id : null, email, role: user ? user.role : 'public', target: 'teams', record_id: teamId, detail: teamName + ' · leader ' + name, ip: ipOf(req) });
  mail.sendTemplate('teamLeaderReceived', email, { name, team: teamName, teamId });
  N.createFor(N.audienceIds('role:admin'), {
    title: 'New team leader registration', body: name + ' registered team ' + teamId + ' — ' + teamName,
    category: 'application', link: '#/portal/admin/teams', by: email
  });

  res.status(201).json({
    ok: true,
    message: 'Team Leader registration submitted successfully.',
    team: { teamId, name: teamName, status: 'Pending', createdAt: now(), leader: name }
  });
});

/* ---------------- my team (leader or member view) ---------------- */
router.get('/teams/mine', A.requireAuth, (req, res) => {
  const email = String(req.user.email || '').toLowerCase();
  const led = db.prepare('SELECT * FROM teams WHERE leader_user_id = ? OR leader_email = ? COLLATE NOCASE ORDER BY created_at DESC').get(req.user.id, email);
  if (led && !led.leader_user_id) db.prepare('UPDATE teams SET leader_user_id = ?, updated_at = ? WHERE team_id = ?').run(req.user.id, now(), led.team_id);
  const mem = db.prepare("SELECT m.*, t.team_id AS t_id FROM team_members m JOIN teams t ON t.team_id = m.team_id WHERE (m.user_id = ? OR m.email = ? COLLATE NOCASE) AND m.status <> 'Removed' ORDER BY m.joined_at DESC")
    .get(req.user.id, email);
  if (mem && !mem.user_id) db.prepare('UPDATE team_members SET user_id = ? WHERE id = ?').run(req.user.id, mem.id);
  res.json({
    ok: true,
    asLeader: led ? rowTeam(led) : null,
    asMember: mem ? Object.assign(rowMember(mem), { team: rowTeam(getTeam(mem.team_id)) }) : null,
    team: rowTeam(teamByUser(req.user) || {}) && teamByUser(req.user) ? rowTeam(teamByUser(req.user)) : null
  });
});

/* ---------------- list (admin / faculty) ---------------- */
router.get('/teams', A.requireAuth, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'faculty') {
    return res.status(403).json({ error: 'You are not authorized to view the full team list.' });
  }
  const q = S.text(req.query.q, 60).toLowerCase();
  const status = S.text(req.query.status, 20);
  const page = Math.max(1, S.int(req.query.page, 1));
  const perPage = Math.min(50, Math.max(5, S.int(req.query.perPage, 20)));

  let rows = db.prepare('SELECT * FROM teams ORDER BY created_at DESC').all();
  if (status && TEAM_STATUS.indexOf(status) >= 0) rows = rows.filter(t => t.status === status);
  if (q) rows = rows.filter(t => (t.team_name + ' ' + t.leader_name + ' ' + t.leader_email + ' ' + t.team_id).toLowerCase().indexOf(q) >= 0);

  const counts = { total: rows.length };
  TEAM_STATUS.forEach(s => { counts[s.toLowerCase()] = rows.filter(t => t.status === s).length; });

  const start = (page - 1) * perPage;
  res.json({
    ok: true,
    teams: rows.slice(start, start + perPage).map(rowTeam),
    total: rows.length, page, perPage,
    pages: Math.max(1, Math.ceil(rows.length / perPage)),
    counts
  });
});

/* ---------------- one team ---------------- */
router.get('/teams/:teamId', A.requireAuth, (req, res) => {
  const t = getTeam(req.params.teamId);
  if (!t) return res.status(404).json({ error: 'Team not found.' });
  const rel = relationOf(t, req.user);
  if (rel === 'none') return res.status(403).json({ error: 'You are not authorized to view this team.' });

  const all = db.prepare('SELECT * FROM team_members WHERE team_id = ? ORDER BY joined_at ASC').all(t.team_id);
  const visible = rel === 'staff' || rel === 'leader'
    ? all.filter(m => m.status !== 'Removed')
    : all.filter(m => m.status === 'Active' || (m.user_id === req.user.id || String(m.email).toLowerCase() === String(req.user.email).toLowerCase()));

  const tasks = rel === 'member' || rel === 'applicant'
    ? db.prepare("SELECT * FROM team_tasks WHERE team_id = ? AND (assignee = '' OR assignee IS NULL OR assignee = ? COLLATE NOCASE) ORDER BY created_at DESC").all(t.team_id, String(req.user.email).toLowerCase())
    : db.prepare('SELECT * FROM team_tasks WHERE team_id = ? ORDER BY created_at DESC').all(t.team_id);

  res.json({
    ok: true,
    relation: rel,
    team: rowTeam(t),
    members: visible.map(rowMember),
    tasks: tasks.map(rowTask),
    announcements: db.prepare('SELECT * FROM team_announcements WHERE team_id = ? ORDER BY created_at DESC').all(t.team_id).map(rowAnn),
    permissions: {
      canManage: rel === 'staff' || rel === 'leader',
      canApproveMembers: rel === 'staff' || rel === 'leader',
      canCreateTasks: rel === 'staff' || rel === 'leader',
      canSetStatus: rel === 'staff'
    }
  });
});

/* ---------------- update team ---------------- */
router.patch('/teams/:teamId', A.requireAuth, A.csrfGuard, (req, res) => {
  const t = getTeam(req.params.teamId);
  if (!t) return res.status(404).json({ error: 'Team not found.' });
  const rel = relationOf(t, req.user);
  const isStaff = rel === 'staff';
  if (!isStaff && rel !== 'leader') return res.status(403).json({ error: 'You are not authorized to perform this action.' });

  const b = req.body || {};
  const patch = {};

  if (b.teamName !== undefined) {
    const val = S.text(b.teamName, 80);
    if (val.length < 3) return res.status(400).json({ error: 'Team name must be at least 3 characters.' });
    const dupe = db.prepare("SELECT team_id FROM teams WHERE team_name = ? COLLATE NOCASE AND team_id <> ? AND status <> 'Rejected'").get(val, t.team_id);
    if (dupe) return res.status(409).json({ error: 'This team name is already registered. Please choose another name.' });
    patch.team_name = val;
  }
  if (b.description !== undefined) patch.description = S.text(b.description, 600);
  if (b.purpose !== undefined) patch.purpose = S.text(b.purpose, 600);
  if (b.expectedMembers !== undefined) {
    const n = S.int(b.expectedMembers, 0);
    if (n < 2 || n > 500) return res.status(400).json({ error: 'Expected members must be between 2 and 500.' });
    patch.expected_members = n;
  }
  if (b.status !== undefined) {
    if (!isStaff) return res.status(403).json({ error: 'Only an administrator can change the team status.' });
    if (TEAM_STATUS.indexOf(b.status) < 0) return res.status(400).json({ error: 'Unknown team status.' });
    patch.status = b.status;
    patch.decided_by = req.user.email;
    patch.decided_at = now();
  }
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'Nothing to update.' });

  const sets = Object.keys(patch).map(k => k + ' = @' + k).join(', ');
  db.prepare('UPDATE teams SET ' + sets + ', updated_at = @updated_at WHERE team_id = @team_id')
    .run(Object.assign({}, patch, { updated_at: now(), team_id: t.team_id }));

  audit({ action: 'team-update', user_id: req.user.id, email: req.user.email, role: req.user.role, target: 'teams', record_id: t.team_id, detail: Object.keys(patch).join(','), ip: ipOf(req) });

  if (patch.status && t.leader_user_id) {
    N.create(t.leader_user_id, {
      title: 'Team ' + t.team_id + ' is now ' + patch.status,
      body: t.team_name + ' — status updated by the YPDC admin.', category: 'system', link: '#/portal', by: req.user.email
    });
  }
  res.json({ ok: true, team: rowTeam(getTeam(t.team_id)) });
});

/* ---------------- delete team (admin) ---------------- */
router.delete('/teams/:teamId', A.requireAdmin, A.csrfGuard, (req, res) => {
  const t = getTeam(req.params.teamId);
  if (!t) return res.status(404).json({ error: 'Team not found.' });
  if (String(req.query.hard) === '1') {
    db.prepare('DELETE FROM team_members WHERE team_id = ?').run(t.team_id);
    db.prepare('DELETE FROM team_tasks WHERE team_id = ?').run(t.team_id);
    db.prepare('DELETE FROM team_announcements WHERE team_id = ?').run(t.team_id);
    db.prepare('DELETE FROM teams WHERE team_id = ?').run(t.team_id);
    audit({ action: 'team-delete', user_id: req.user.id, email: req.user.email, role: req.user.role, target: 'teams', record_id: t.team_id, detail: t.team_name + ' (hard delete)', ip: ipOf(req) });
    return res.json({ ok: true, deleted: true });
  }
  db.prepare("UPDATE teams SET status = 'Inactive', updated_at = ? WHERE team_id = ?").run(now(), t.team_id);
  audit({ action: 'team-deactivate', user_id: req.user.id, email: req.user.email, role: req.user.role, target: 'teams', record_id: t.team_id, detail: t.team_name, ip: ipOf(req) });
  res.json({ ok: true, team: rowTeam(getTeam(t.team_id)) });
});

/* ---------------- join a team (public) ---------------- */
router.post('/teams/:teamId/members', S.teamLimit, (req, res) => {
  const t = getTeam(req.params.teamId);

  if (!t) return res.status(404).json({ error: 'Team not found.' });
  if (t.status !== 'Active') return res.status(403).json({ error: 'This team is not accepting members right now.' });

  const b = req.body || {};
  const name = S.text(b.name, 120);
  const email = S.text(b.email, 120).toLowerCase();
  const phone = S.text(b.phone, 30);
  const program = S.text(b.program, 90);
  const semester = S.text(b.semester, 30);
  const motivation = S.text(b.motivation, 400);
  const photo = S.text(b.photo, 300);
  const idCard = S.text(b.idCard, 300);

  if (name.length < 3) return res.status(400).json({ error: 'Please enter your full name (at least 3 characters).' });
  if (!S.isUploadPath(photo)) return res.status(400).json({ error: 'Please upload your photograph (camera or gallery).' });
  if (!S.isUploadPath(idCard)) return res.status(400).json({ error: 'Please upload a picture of your ID card.' });
  if (!S.isEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (phone && !/^[0-9+()\-\s]{7,20}$/.test(phone)) return res.status(400).json({ error: 'Please enter a valid phone number.' });
  if (!program) return res.status(400).json({ error: 'Please enter your university / program.' });
  if (String(t.leader_email).toLowerCase() === email) return res.status(409).json({ error: 'You are the leader of this team.' });

  const dupe = db.prepare("SELECT id FROM team_members WHERE team_id = ? AND email = ? COLLATE NOCASE AND status <> 'Removed'").get(t.team_id, email);
  if (dupe) return res.status(409).json({ error: 'This email is already registered with this team.' });

  const other = db.prepare("SELECT t.team_id, t.team_name FROM team_members m JOIN teams t ON t.team_id = m.team_id WHERE m.email = ? COLLATE NOCASE AND m.status <> 'Removed'").get(email);
  if (other) return res.status(409).json({ error: 'This email is already a member of ' + other.team_id + ' — ' + other.team_name + '.' });

  const user = A.findUserByEmail(email);
  const id = rid('tm');
  db.prepare(`INSERT INTO team_members (id, team_id, user_id, name, email, phone, program, semester, photo, id_card, motivation, status, joined_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?, 'Pending', ?)`)
    .run(id, t.team_id, user ? user.id : null, name, email, phone, program, semester, photo, idCard, motivation, now());

  audit({ action: 'team-join', user_id: user ? user.id : null, email, role: user ? user.role : 'public', target: 'team_members', record_id: t.team_id, detail: name + ' → ' + t.team_name, ip: ipOf(req) });
  mail.sendTemplate('teamMemberReceived', email, { name, team: t.team_name, teamId: t.team_id });
  if (t.leader_user_id) {
    N.create(t.leader_user_id, {
      title: 'New member registration', body: name + ' wants to join ' + t.team_name + '.', category: 'application',
      link: '#/portal', by: email
    });
  } else {
    N.createFor(N.audienceIds('role:admin'), { title: 'New team member registration', body: name + ' → ' + t.team_id + ' ' + t.team_name, category: 'application', link: '#/portal/admin/teams', by: email });
  }

  res.status(201).json({
    ok: true,
    message: 'Team member registration submitted successfully.',
    member: { name, email, teamId: t.team_id, teamName: t.team_name, status: 'Pending' }
  });
});

/* ---------------- approve / remove a member ---------------- */
router.patch('/teams/:teamId/members/:memberId', A.requireAuth, A.csrfGuard, (req, res) => {
  const t = getTeam(req.params.teamId);
  if (!t) return res.status(404).json({ error: 'Team not found.' });
  const rel = relationOf(t, req.user);
  if (rel !== 'staff' && rel !== 'leader') return res.status(403).json({ error: 'You are not authorized to manage this team.' });

  const m = db.prepare('SELECT * FROM team_members WHERE id = ? AND team_id = ?').get(String(req.params.memberId), t.team_id);
  if (!m) return res.status(404).json({ error: 'Team member not found.' });

  const status = S.text((req.body || {}).status, 20);
  if (MEMBER_STATUS.indexOf(status) < 0) return res.status(400).json({ error: 'Unknown member status.' });

  db.prepare('UPDATE team_members SET status = ?, decided_by = ?, decided_at = ? WHERE id = ?')
    .run(status, req.user.email, now(), m.id);
  audit({ action: 'team-member-' + status.toLowerCase(), user_id: req.user.id, email: req.user.email, role: req.user.role, target: 'team_members', record_id: t.team_id, detail: m.name + ' → ' + status, ip: ipOf(req) });

  if (m.user_id) {
    N.create(m.user_id, {
      title: status === 'Active' ? 'You joined ' + t.team_name : 'Membership update — ' + t.team_name,
      body: 'Team ' + t.team_id + ' · status: ' + status, category: 'system', link: '#/portal', by: req.user.email
    });
  }
  res.json({ ok: true, member: rowMember(db.prepare('SELECT * FROM team_members WHERE id = ?').get(m.id)) });
});

router.delete('/teams/:teamId/members/:memberId', A.requireAuth, A.csrfGuard, (req, res) => {
  const t = getTeam(req.params.teamId);
  if (!t) return res.status(404).json({ error: 'Team not found.' });
  const rel = relationOf(t, req.user);
  const m = db.prepare('SELECT * FROM team_members WHERE id = ? AND team_id = ?').get(String(req.params.memberId), t.team_id);
  if (!m) return res.status(404).json({ error: 'Team member not found.' });

  const self = (m.user_id && m.user_id === req.user.id) || String(m.email).toLowerCase() === String(req.user.email).toLowerCase();
  if (rel !== 'staff' && rel !== 'leader' && !self) return res.status(403).json({ error: 'You are not authorized to remove this member.' });

  db.prepare("UPDATE team_members SET status = 'Removed', decided_by = ?, decided_at = ? WHERE id = ?").run(req.user.email, now(), m.id);
  audit({ action: 'team-member-removed', user_id: req.user.id, email: req.user.email, role: req.user.role, target: 'team_members', record_id: t.team_id, detail: m.name + (self ? ' left the team' : ' removed'), ip: ipOf(req) });
  res.json({ ok: true, removed: m.id });
});

/* ---------------- team announcements ---------------- */
const rowAnn = r => ({
  id: r.id, teamId: r.team_id, title: r.title, body: r.body,
  author: r.author_name || '', authorRole: r.author_email || '', createdAt: r.created_at
});

router.get('/teams/:teamId/announcements', A.requireAuth, (req, res) => {
  const ctx = teamAccess(req, res);
  if (!ctx) return;
  const rows = db.prepare('SELECT * FROM team_announcements WHERE team_id = ? ORDER BY created_at DESC').all(ctx.t.team_id);
  res.json({ ok: true, announcements: rows.map(rowAnn), relation: ctx.rel });
});

router.post('/teams/:teamId/announcements', A.requireAuth, A.csrfGuard, (req, res) => {
  const ctx = teamAccess(req, res);
  if (!ctx) return;
  if (ctx.rel !== 'leader' && ctx.rel !== 'staff') return res.status(403).json({ error: 'Only the team leader can post team announcements.' });

  const title = S.text((req.body || {}).title, 120);
  const body = S.text((req.body || {}).body, 2000);
  if (title.length < 3) return res.status(400).json({ error: 'Please write an announcement title (at least 3 characters).' });
  if (body.length < 10) return res.status(400).json({ error: 'Please write the announcement (at least 10 characters).' });

  const id = rid('ANN');
  db.prepare(`INSERT INTO team_announcements (id, team_id, author_user_id, author_name, author_email, title, body, created_at)
    VALUES (?,?,?,?,?,?,?,?)`)
    .run(id, ctx.t.team_id, req.user.id, req.user.name || req.user.email, req.user.email, title, body, now());

  const members = db.prepare("SELECT user_id, email FROM team_members WHERE team_id = ? AND status = 'Active'").all(ctx.t.team_id);
  members.forEach(m => {
    if (m.user_id) N.create(m.user_id, { title: ctx.t.team_name + ': ' + title, body: body.slice(0, 140), category: 'system', link: '#/portal', by: req.user.email });
  });
  audit({ action: 'team-announcement-create', user_id: req.user.id, email: req.user.email, role: req.user.role, target: 'team_announcements', record_id: ctx.t.team_id, detail: title, ip: ipOf(req) });
  res.status(201).json({ ok: true, announcement: rowAnn(db.prepare('SELECT * FROM team_announcements WHERE id = ?').get(id)), notified: members.length });
});

router.delete('/teams/:teamId/announcements/:annId', A.requireAuth, A.csrfGuard, (req, res) => {
  const ctx = teamAccess(req, res);
  if (!ctx) return;
  if (ctx.rel !== 'leader' && ctx.rel !== 'staff') return res.status(403).json({ error: 'Only the team leader can remove team announcements.' });
  const row = db.prepare('SELECT * FROM team_announcements WHERE id = ? AND team_id = ?').get(String(req.params.annId), ctx.t.team_id);
  if (!row) return res.status(404).json({ error: 'Announcement not found.' });
  db.prepare('DELETE FROM team_announcements WHERE id = ?').run(row.id);
  audit({ action: 'team-announcement-delete', user_id: req.user.id, email: req.user.email, role: req.user.role, target: 'team_announcements', record_id: ctx.t.team_id, detail: row.title, ip: ipOf(req) });
  res.json({ ok: true, deleted: row.id });
});

/* ---------------- team tasks ---------------- */
function teamAccess(req, res) {
  const t = getTeam(req.params.teamId);
  if (!t) { res.status(404).json({ error: 'Team not found.' }); return null; }
  const rel = relationOf(t, req.user);
  if (rel === 'none') { res.status(403).json({ error: 'You are not authorized to view this team.' }); return null; }
  return { t, rel };
}

router.get('/teams/:teamId/tasks', A.requireAuth, (req, res) => {
  const ctx = teamAccess(req, res);
  if (!ctx) return;
  const rows = db.prepare('SELECT * FROM team_tasks WHERE team_id = ? ORDER BY created_at DESC').all(ctx.t.team_id);
  res.json({ ok: true, tasks: rows.map(rowTask), relation: ctx.rel });
});

router.post('/teams/:teamId/tasks', A.requireAuth, A.csrfGuard, (req, res) => {
  const ctx = teamAccess(req, res);
  if (!ctx) return;
  if (ctx.rel !== 'staff' && ctx.rel !== 'leader') return res.status(403).json({ error: 'Only the team leader can add team tasks.' });

  const b = req.body || {};
  const title = S.text(b.title, 140);
  if (title.length < 3) return res.status(400).json({ error: 'Task title is required (at least 3 characters).' });
  const status = TASK_STATUS.indexOf(b.status) >= 0 ? b.status : 'Pending';
  const priority = ['Low', 'Normal', 'High'].indexOf(b.priority) >= 0 ? b.priority : 'Normal';
  const assignee = S.text(b.assignee, 120).toLowerCase();

  const id = rid('tt');
  db.prepare(`INSERT INTO team_tasks (id, team_id, title, detail, assignee, due, priority, status, created_by, created_at, updated_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, ctx.t.team_id, title, S.text(b.detail, 600), assignee, S.text(b.due, 30), priority, status, req.user.email, now(), now());

  audit({ action: 'team-task-create', user_id: req.user.id, email: req.user.email, role: req.user.role, target: 'team_tasks', record_id: ctx.t.team_id, detail: title, ip: ipOf(req) });
  res.status(201).json({ ok: true, task: rowTask(db.prepare('SELECT * FROM team_tasks WHERE id = ?').get(id)) });
});

router.patch('/teams/:teamId/tasks/:taskId', A.requireAuth, A.csrfGuard, (req, res) => {
  const ctx = teamAccess(req, res);
  if (!ctx) return;
  const row = db.prepare('SELECT * FROM team_tasks WHERE id = ? AND team_id = ?').get(String(req.params.taskId), ctx.t.team_id);
  if (!row) return res.status(404).json({ error: 'Task not found.' });

  const b = req.body || {};
  const manager = ctx.rel === 'staff' || ctx.rel === 'leader';
  const mine = String(row.assignee || '').toLowerCase() === String(req.user.email).toLowerCase();
  if (!manager && !mine) return res.status(403).json({ error: 'You can only update tasks assigned to you.' });

  const patch = {};
  if (b.status !== undefined) {
    if (TASK_STATUS.indexOf(b.status) < 0) return res.status(400).json({ error: 'Unknown task status.' });
    patch.status = b.status;
  }
  if (manager) {
    if (b.title !== undefined) {
      const title = S.text(b.title, 140);
      if (title.length < 3) return res.status(400).json({ error: 'Task title is required (at least 3 characters).' });
      patch.title = title;
    }
    if (b.detail !== undefined) patch.detail = S.text(b.detail, 600);
    if (b.due !== undefined) patch.due = S.text(b.due, 30);
    if (b.priority !== undefined && ['Low', 'Normal', 'High'].indexOf(b.priority) >= 0) patch.priority = b.priority;
    if (b.assignee !== undefined) patch.assignee = S.text(b.assignee, 120).toLowerCase();
  }
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'Nothing to update.' });

  const sets = Object.keys(patch).map(k => k + ' = @' + k).join(', ');
  db.prepare('UPDATE team_tasks SET ' + sets + ', updated_at = @updated_at WHERE id = @id')
    .run(Object.assign({}, patch, { updated_at: now(), id: row.id }));

  audit({ action: 'team-task-update', user_id: req.user.id, email: req.user.email, role: req.user.role, target: 'team_tasks', record_id: ctx.t.team_id, detail: row.title + ' → ' + Object.keys(patch).join(','), ip: ipOf(req) });
  res.json({ ok: true, task: rowTask(db.prepare('SELECT * FROM team_tasks WHERE id = ?').get(row.id)) });
});

router.delete('/teams/:teamId/tasks/:taskId', A.requireAuth, A.csrfGuard, (req, res) => {
  const ctx = teamAccess(req, res);
  if (!ctx) return;
  if (ctx.rel !== 'staff' && ctx.rel !== 'leader') return res.status(403).json({ error: 'You are not authorized to delete this task.' });
  const row = db.prepare('SELECT * FROM team_tasks WHERE id = ? AND team_id = ?').get(String(req.params.taskId), ctx.t.team_id);
  if (!row) return res.status(404).json({ error: 'Task not found.' });
  db.prepare('DELETE FROM team_tasks WHERE id = ?').run(row.id);
  audit({ action: 'team-task-delete', user_id: req.user.id, email: req.user.email, role: req.user.role, target: 'team_tasks', record_id: ctx.t.team_id, detail: row.title, ip: ipOf(req) });
  res.json({ ok: true, deleted: row.id });
});

module.exports = { router, TEAM_STATUS, MEMBER_STATUS, TASK_STATUS };

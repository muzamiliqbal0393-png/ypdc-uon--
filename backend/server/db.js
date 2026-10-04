'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const PROFILE_FIELDS = ['semester', 'reg', 'cgpa', 'city', 'dob', 'skills', 'batch', 'profession', 'company', 'memberId', 'post', 'joined', 'designation', 'department', 'ypdcRole', 'office'];

const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'data', 'ypdc.sqlite');
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

const db = new Database(DB_FILE);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  role          TEXT NOT NULL,                 -- student | member | directorate | faculty | admin | alumni
  directorate   TEXT,
  program       TEXT,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  is_active     INTEGER NOT NULL DEFAULT 1,
  token_version INTEGER NOT NULL DEFAULT 0,    -- logout / password change par +1 (purane tokens dead)
  meta          TEXT,                           -- profile fields (semester, city, skills ...) JSON
  last_login    TEXT,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  program     TEXT,
  directorate TEXT,
  motivation  TEXT,
  status      TEXT NOT NULL DEFAULT 'New',     -- New | Shortlisted | Approved | Rejected
  decided_by  TEXT,
  decided_at  TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS registrations (
  id         TEXT PRIMARY KEY,
  user_id    TEXT,
  email      TEXT,
  event_id   TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'Registered',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback (
  id         TEXT PRIMARY KEY,
  name       TEXT,
  email      TEXT,
  role       TEXT,
  type       TEXT,
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'New',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shaheen (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone           TEXT,
  program         TEXT,
  semester        TEXT,
  reason          TEXT,
  password_hash   TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'Pending',
  existing_member INTEGER NOT NULL DEFAULT 0,
  user_id         TEXT,
  decided_by      TEXT,
  decided_at      TEXT,
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (          -- users ke aapas mein asli messages
  id         TEXT PRIMARY KEY,
  from_id    TEXT NOT NULL,
  from_name  TEXT,
  from_role  TEXT,
  to_id      TEXT NOT NULL,
  to_name    TEXT,
  subject    TEXT NOT NULL,
  body       TEXT NOT NULL,
  read_at    TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_to   ON messages (to_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_from ON messages (from_id, created_at DESC);

CREATE TABLE IF NOT EXISTS collections (       -- site copy, events, tasks, news...
  key        TEXT PRIMARY KEY,
  json       TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  at         TEXT NOT NULL,
  user_id    TEXT,
  email      TEXT,
  role       TEXT,
  action     TEXT NOT NULL,                    -- login / logout / write / delete / approve
  target     TEXT,                             -- collection ya table ka naam
  record_id  TEXT,
  detail     TEXT,
  ip         TEXT,
  ok         INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_log(at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_email ON audit_log(email);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
`);

const userCols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
if (!userCols.includes('meta')) db.exec('ALTER TABLE users ADD COLUMN meta TEXT');

/* ---- R39.0: har registration ke liye photo + ID card (lazmi) ---- */
(function () {
  [['applications', 'photo'], ['applications', 'id_card'], ['applications', 'department'], ['applications', 'semester'],
   ['shaheen', 'photo'], ['shaheen', 'id_card'], ['shaheen', 'department'],
   ['teams', 'photo'], ['teams', 'id_card'],
   ['team_members', 'photo'], ['team_members', 'id_card']].forEach(function (pair) {
    var cols = db.prepare('PRAGMA table_info(' + pair[0] + ')').all().map(function (c) { return c.name; });
    if (cols.length && cols.indexOf(pair[1]) === -1) db.exec('ALTER TABLE ' + pair[0] + ' ADD COLUMN ' + pair[1] + ' TEXT');
  });
})();

/* ---- migrations: naye tables (purana data bilkul waise hi rehta hai) ---- */
db.exec(`
CREATE TABLE IF NOT EXISTS password_reset_tokens (   -- sirf token ka hash, plain token kabhi store nahi
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at    TEXT,
  created_at TEXT NOT NULL,
  ip         TEXT
);
CREATE INDEX IF NOT EXISTS idx_reset_user ON password_reset_tokens (user_id);

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  category   TEXT NOT NULL DEFAULT 'system',          -- system | account | application | event | announcement
  link       TEXT,
  read_at    TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifs_user ON notifications (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS documents (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'Other',          -- Reports | Policies | Certificates | Meeting Documents | Applications | Other
  file_name   TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  mime        TEXT,
  size        INTEGER NOT NULL DEFAULT 0,
  uploaded_by TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_docs_cat ON documents (category, created_at DESC);

CREATE TABLE IF NOT EXISTS email_logs (               -- outbox: SMTP na ho to yahan dikhta hai
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  at       TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject  TEXT NOT NULL,
  template TEXT,
  body     TEXT,
  status   TEXT NOT NULL DEFAULT 'queued',            -- sent | queued | failed
  error    TEXT
);
CREATE INDEX IF NOT EXISTS idx_email_at ON email_logs (at DESC);
`);

/* ---- migration: team system (team leader / team members / team tasks) ---- */
db.exec(`
CREATE TABLE IF NOT EXISTS teams (
  id               TEXT PRIMARY KEY,
  team_id          TEXT NOT NULL UNIQUE,          -- public id: TEAM-001
  team_name        TEXT NOT NULL,
  leader_user_id   TEXT,                          -- users.id (null jab tak account link na ho)
  leader_name      TEXT NOT NULL,
  leader_email     TEXT NOT NULL,
  leader_phone     TEXT,
  program          TEXT,
  semester         TEXT,
  description      TEXT,
  purpose          TEXT,
  expected_members INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'Pending',   -- Pending | Active | Inactive | Rejected
  decided_by       TEXT,
  decided_at       TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_teams_status ON teams (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teams_leader ON teams (leader_user_id);
CREATE INDEX IF NOT EXISTS idx_teams_email  ON teams (leader_email);

CREATE TABLE IF NOT EXISTS team_members (
  id         TEXT PRIMARY KEY,
  team_id    TEXT NOT NULL,                       -- teams.team_id
  user_id    TEXT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  program    TEXT,
  semester   TEXT,
  motivation TEXT,
  status     TEXT NOT NULL DEFAULT 'Pending',     -- Pending | Active | Removed
  joined_at  TEXT NOT NULL,
  decided_by TEXT,
  decided_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_tm_team ON team_members (team_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_tm_user ON team_members (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tm_unique ON team_members (team_id, email COLLATE NOCASE) WHERE status <> 'Removed';

CREATE TABLE IF NOT EXISTS team_tasks (
  id         TEXT PRIMARY KEY,
  team_id    TEXT NOT NULL,
  title      TEXT NOT NULL,
  detail     TEXT,
  assignee   TEXT,                                -- member email (khaali = poore team ke liye)
  due        TEXT,
  priority   TEXT NOT NULL DEFAULT 'Normal',
  status     TEXT NOT NULL DEFAULT 'Pending',     -- Pending | In Progress | Done
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tt_team ON team_tasks (team_id, created_at DESC);

CREATE TABLE IF NOT EXISTS team_announcements (
  id             TEXT PRIMARY KEY,
  team_id        TEXT NOT NULL,
  author_user_id TEXT,
  author_name    TEXT,
  author_email   TEXT,
  title          TEXT NOT NULL,
  body           TEXT NOT NULL,
  created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ta_team ON team_announcements (team_id, created_at DESC);
`);


const now = () => new Date().toISOString();

const getCollections = () => {
  const out = {};
  for (const row of db.prepare('SELECT key, json FROM collections').all()) {
    try { out[row.key] = JSON.parse(row.json); } catch (e) { out[row.key] = null; }
  }
  return out;
};

const setCollection = (key, value, by) => {
  db.prepare(`INSERT INTO collections (key, json, updated_at, updated_by) VALUES (?, ?, ?, ?)
              ON CONFLICT(key) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at,
              updated_by = excluded.updated_by`).run(key, JSON.stringify(value), now(), by || 'system');
};

const audit = (entry) => {
  db.prepare(`INSERT INTO audit_log (at, user_id, email, role, action, target, record_id, detail, ip, ok)
              VALUES (@at, @user_id, @email, @role, @action, @target, @record_id, @detail, @ip, @ok)`)
    .run({
      at: entry.at || now(),
      user_id: entry.user_id || null,
      email: entry.email || null,
      role: entry.role || null,
      action: entry.action,
      target: entry.target || null,
      record_id: entry.record_id == null ? null : String(entry.record_id),
      detail: entry.detail ? String(entry.detail).slice(0, 500) : null,
      ip: entry.ip || null,
      ok: entry.ok === 0 ? 0 : 1
    });
};

module.exports = { db, now, getCollections, setCollection, audit, bcrypt, DB_FILE, PROFILE_FIELDS };

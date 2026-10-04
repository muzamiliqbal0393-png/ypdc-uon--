# YPDC UON — Backend (API + Database)

This folder is the **backend** of the website. It runs with three commands:

```bash
cd backend/server
npm install          # once (packages)
npm run first-run    # once: creates .env + the database + one real admin account
npm start            # → http://localhost:8000
```

Now open `http://localhost:8000` — the same website, but every record comes from the real
**SQLite** database and login uses real **passwords**.

> If the server is down, only the public website is shown. There is **no demo login and no demo
> data**, in either mode. Both modes use the same frontend code.

---

## 1. What actually works (real, not fake)

| Feature | Behaviour |
|---|---|
| Login | real accounts, bcrypt-12 hashed passwords |
| Session | JWT in an httpOnly cookie (8 hours); survives refresh |
| Admin login | separate page `#/admin` + email + password + **ADMIN_KEY** (three things) |
| Induction application | row in the `applications` table, counter +1 |
| Event registration | `registrations` table, duplicate blocked |
| Feedback | `feedback` table |
| Admin dashboard | real counts from the server (accounts, applications, registrations, audit entries) |
| "Who did what" | `audit_log` table — every login, write, approve, delete |
| Admin decisions | `PATCH /api/admin/applications/:id` → DB update + audit entry |
| Create a user | `POST /api/admin/users` → a real account that can log in |
| Photos & logo | `POST /api/admin/upload` → the picture is saved as a file; the site stores only a short URL (`assets/uploads/...`), never a heavy base64 blob |
| Messaging | per-portal Inbox / Sent / Compose, stored permanently in `messages` |

---

## 2. Security (strong, and visible in the code)

| # | Feature | Where |
|---|---|---|
| 1 | **bcrypt (12 rounds)** — passwords are never stored in plain text | `db.js`, `auth.js` |
| 2 | **JWT in an httpOnly cookie** (not readable by JS) | `auth.js` |
| 3 | **CSRF guard** — every write needs the `X-YPDC-CSRF` header | `auth.js` |
| 4 | **Rate limits** — login attempts and writes are throttled (429) | `security.js` |
| 5 | **Role guards** — each role may write only its own collections | `routes/state.js`, `auth.js` |
| 6 | **Audit log** — every sensitive action is recorded | `db.js` |
| 7 | **Password policy** (min 8 chars, letters + number/symbol, max 72) | `security.js` |
| 8 | **Body size limits** (600 KB JSON / 200 KB form; 3 MB only on the authenticated `/api/state` route for admin photo uploads) | `server.js` |
| 9 | **Helmet-style headers** + `x-powered-by` disabled | `server.js` |
| 10 | **CORS allowlist** — same origin by default, `ALLOWED_ORIGINS` for others | `security.js` |
| 11 | Last admin protection (cannot deactivate/demote the only admin) | `routes/data.js` |

Tested by `npm test` (53 checks) — including wrong password, CSRF-less writes, role guards and rate limits.

---

## 3. API endpoints

| Method | Path | Who |
|---|---|---|
| GET | `/api/healthz` | public — health + counts |
| POST | `/api/auth/login` | public — user login |
| POST | `/api/auth/login-admin` | public — admin login (email + password + ADMIN_KEY) |
| GET | `/api/auth/me` | logged in |
| POST | `/api/auth/logout` | logged in |
| POST | `/api/auth/change-password` | logged in |
| GET | `/api/public/site` | public — website content only |
| POST | `/api/public/apply` | public — induction application |
| POST | `/api/public/feedback` | public — feedback |
| POST | `/api/register-event` | public — event registration |
| GET | `/api/state` | logged in — full state for the portal |
| POST | `/api/state` | logged in — write collections (role-guarded) |
| GET | `/api/directory` | logged in — accounts you may message |
| GET/POST | `/api/messages` | logged in — inbox / send |
| POST | `/api/messages/:id/read` · DELETE `/api/messages/:id` | logged in |
| GET | `/api/admin/summary` | admin — dashboard counts |
| GET | `/api/admin/audit` | admin — audit log |
| GET/POST | `/api/admin/users` · PATCH `/api/admin/users/:id` | admin — accounts |
| PATCH | `/api/admin/applications/:id` | admin — approve / reject |
| GET | `/api/admin/password-policy` · `/api/admin/permissions` | admin |
| POST | `/api/admin/upload` | admin — a picture is stored as a file and comes back as a short URL |
| GET/POST | `/api/public/shaheen` · `/api/public/shaheen/register` | public — Bano Shaheen registration status / apply (only while the window is open) |
| GET/POST | `/api/admin/shaheen` · `/settings` · `/roster` · `/:id/approve` · `/:id/reject` · `/:id` | admin — Bano Shaheen registrations, expected list, approve (creates the account), reject, delete |
| POST | `/api/auth/login-directorate` | directorate — separate hidden sign-in link (`#/directorate`) |
| GET | `/api/admin/backup` | admin — downloads the whole SQLite database (backup) |
| DELETE | `/api/admin/users/:id` | admin — delete an account (never your own / the last admin) |

---

## 4. Database

SQLite (`better-sqlite3`). File: `data/ypdc.sqlite` (path configurable with `DB_FILE`).

- Real tables: `users`, `applications`, `registrations`, `feedback`, `messages`, `audit_log`
- Flexible content: `collections(key, json)` — site copy, directorates, portals, events, news,
  highlights, achievements, tasks, certificates, notifications, …

It starts empty: **1 admin account + 7 directorates**, plus the website's own content
(name, tagline, contact, 7 directorates, 7 portals) from `data/site-content.json`.

---

## 5. Commands

| Command | What it does |
|---|---|
| `npm start` | run the server (default port 8000) |
| `npm run dev` | run with auto-restart |
| `npm run first-run` | first-time setup: `.env` + database + real admin account |
| `npm run seed` | empty setup (1 admin + 7 directorates) |
| `npm run seed:content` | the above + website content |
| `npm run export:content` | `../js/site-content.js` → `data/site-content.json` |
| `npm run make-admin` | turn an existing account into an admin / reset its password |
| `npm test` | 53 backend checks — starts its own test server on port 8099 with a **copy** of the database, so the live site data is never touched |

`npm test` covers: sign-up, login/logout, roles & permissions (each role reaches its own dashboard), the upload → short-URL flow, backup download, user delete, event registration, feedback, rate limits and public endpoints.

**There is no demo/sample seed in this project.** Whatever is written to the server is the real record.

---

## 6. Important

- `ADMIN_PASSWORD` and `ADMIN_KEY` live in `.env` (created by `first-run`) — never share that file.
- Change `JWT_SECRET` and `ADMIN_KEY` before going live, and set `NODE_ENV=production`.
- Accounts are created by the admin (Admin panel → **People Directory** → **+ Add member**) or by the visitor through **Create account** on the login page.
- **Bano Shaheen registration**: admin panel → **Bano Shaheen** → *Open registration*. While it is open the public page `#/shaheen` accepts applications (they arrive as **Pending**); approving creates the volunteer account, so the person can sign in only after approval. Emails that already exist in YPDC are tagged *Existing YPDC member*, all others *New applicant*; the expected list shows who has not registered yet. Closing the window blocks the form and the homepage strip changes to “Registration is CLOSED”. (The batch name defaults to **Bano Shaheen** and can be changed in the panel.)
- **Hidden links** (not shown anywhere on the public site): `/#/admin` for the administrator and `/#/directorate` for directorate accounts. Directorate accounts cannot sign in through the normal login and cannot be created through public sign-up.
- Photos uploaded in the admin panel are saved as files in `frontend/assets/uploads/` (change `UPLOAD_DIR` in `.env` to store them elsewhere).
- The server serves the `frontend/` folder itself, so keep both folders together.

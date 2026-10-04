# YPDC UON — Complete Website + 7 Portals

**Young Peace & Development Corps · University of Narowal**
Built with **plain HTML + CSS + JavaScript** (no framework, no build step) plus an optional
**Node.js + SQLite backend** in the `backend/` folder.

**Design colors match the source PDF exactly** (every value sampled from the PDF pixels — screenshot verified):

| Use | Color |
|---|---|
| Sidebar / header / topbar / portal hero card | `#003C2A` |
| Buttons, banner strip, footer bar | `#004A38` |
| Quick-access card, feature box | `#0B4638` |
| Gold (CTA, active nav, stat numbers, keys) | `#F6D88A` |
| Gold border | `#D8BB6B` |
| Page background (cream) | `#FBF4E8` |
| Mint card | `#EAF0EA` |
| Cream-gold card | `#FCF6DE` |
| Body text / muted | `#5E6663` |

**Fonts:** Poppins (body/UI) + Playfair Display (headings), both **embedded in `css/fonts.css`**
(base64 woff2, latin subset, 142 KB) — the design stays identical without internet.
**Logo:** the official YPDC emblem (University of Narowal + YPDC) is the uploaded PNG in
`assets/img/logo-ypdc.png` (512 px) with a smaller `logo-ypdc-mark.png` (256 px) for tight spaces.
It is shown **on its own** — no extra wordmark text next to it — everywhere: header, footer,
login page, portal sidebar, chatbot and the browser tab. Build R33.4 sizes: header 62 px,
login 64 px, sidebar 56 px, footer 52 px, chatbot 33 px, phone header 46 px.

---

## 1. What is included

### Public website (13 routes + login)
`#/` home · about · directorates · cabinet · highlights · events · news · achievements · membership ·
forums/feedback · contact · induction (membership form) · portal login · admin login · 404 page.

### 7 portals — 69 working pages in total

| Portal | Pages | Sections |
|---|---|---|
| **Student** | 10 | dashboard, profile, membership, events, attendance, volunteer, certificates, achievements, milestones, feedback |
| **Member** | 8 | dashboard, profile, directorate, duties, tasks, attendance, reports, messages |
| **Directorate** | 8 | dashboard, profile, leadership, team, objectives, work plan, tasks, proposals |
| **Faculty** | 8 | dashboard, profile, department, projects, reviews, reports, approvals, guidance |
| **Admin** | 15 | dashboard, people, members, directorates, faculty, events, induction, applications, analytics, content, cabinet, highlights, roles & permissions, activity log, settings |
| **Alumni** | 8 | dashboard, profile, academic, career, network, mentorship, events, opportunities |
| **Guest** | 12 | dashboard, about, vision, directorates, events, news, highlights, achievements, gallery, contact, feedback, join |

**7 dashboards — one per portal.** Every number on a dashboard comes from the database;
when a page has no records it shows `0` and a clean message such as
*"No records yet — records appear here as soon as data is added from the admin panel."*
There is **no demo/fake data and no demo login** anywhere in the project.

---

## 2. Backend (real server + database + security)

```bash
cd backend/server
npm install          # once
npm run first-run    # once: creates .env + the database + a real admin account
npm start            # → http://localhost:8000
```

Open `http://localhost:8000` — the same website, but data comes from the real **SQLite** database
and login uses real **passwords**. The server serves this `frontend/` folder by itself, so keep
both folders together.

> If the server is not running, only the public website is shown (from `data/site-content.json`).
> There is no demo login and no demo data in that mode either.

| Feature | With the backend |
|---|---|
| Login | real accounts, bcrypt-12 hashed passwords |
| Session | JWT in an httpOnly cookie (8 hours) + survives refresh |
| Admin login | separate page `#/admin` — email + password + **ADMIN_KEY** (three things) |
| Induction application | row in the SQLite `applications` table, counter +1 |
| Event registration | `registrations` table, duplicates blocked |
| Feedback | `feedback` table |
| Admin dashboard | real counts from the server (accounts, applications, registrations, audit entries) |
| "Who did what" | **audit_log** table — every login, write, approve, delete |
| Admin decisions | `PATCH /api/admin/applications/:id` → DB update + audit entry |
| Create a user | `POST /api/admin/users` → real account (can log in) |
| Messaging | per-portal Inbox / Sent / Compose, stored in the `messages` table |
| Bano Shaheen window | controlled from the **admin dashboard card** (Open / Close, counters) or the full Bano Shaheen page — the homepage strip and the public form follow it instantly |
| Profile self-service | `PATCH /api/auth/me` — name, phone, program, directorate + profile fields; role/email/status are locked |
| Hidden sign-in links | `#/admin` and `#/directorate` exist but are not linked anywhere on the public site |

---

## 2b. Who can do what (roles and rights)

Two sign-in pages are deliberately not linked anywhere on the website — you type or bookmark
them: **`#/admin`** (email + password + ADMIN_KEY) and **`#/directorate`**. The public site,
the footer and the normal login page show no hint of either one.

| Role | Dashboard | Can save (the server checks every write) | Refused — button hidden *and* request blocked |
|---|---|---|---|
| **Admin** (`#/admin`) | Admin panel: every page | applications, Bano Shaheen drive + roster, people, accounts, roles, site content, events, and every other collection | — |
| **Directorate** (`#/directorate`) | Directorate portal | events, notifications, tasks, duties, reports, proposals, workplan, objectives, attendance, activity log | applications, Bano Shaheen, accounts/roles, site content → **403** |
| **Faculty** | Faculty portal | events, notifications, tasks, reports, proposals, faculty activities, attendance, certificates, feedback replies, activity log | applications, Bano Shaheen, accounts/roles → **403** |
| **General Member** | General Member portal | tasks, duties (confirm availability), responsibilities, reports (submit duty report), volunteer, registrations | proposals, attendance, applications, Bano Shaheen → **403** |
| **Volunteer** (student) | Volunteer portal | volunteer requests, event registrations | tasks, marking attendance, applications, Bano Shaheen → **403** |
| **Alumni** | Alumni portal | mentorship records, careers (apply / refer) | attendance, tasks, applications, Bano Shaheen → **403** |

Rules that hold for every role:

- **Sign-up roles** are volunteer, general member, faculty and alumni only. Directorate and admin
  accounts are created by the admin, so no one can self-promote.
- **Own profile** — every role can save its own profile (name, phone, program, directorate, semester,
  reg, cgpa, city, dob, skills) via `PATCH /api/auth/me`. `role`, `email` and account status are
  ignored on that endpoint; sending them changes nothing.
- **Hiding a button is never the only guard.** Send the request by hand and the server answers
  with **403** (or `denied: [...]` on the batch endpoint) and writes an audit row.
- **Login gate** — a directorate account cannot use the normal login page, and admin needs the
  ADMIN_KEY as a third factor. Shaheen applicants get a dashboard only after approval.
- `npm test` proves all of this: it signs in as all five roles and checks one allowed write and one
  refused write per role (§7).

---

## 3. Files (modular)

```
frontend/
├── index.html                  ← entry point (loads every file below)
├── ypdc-uon-website.html       ← the WHOLE website in one file (images embedded, works offline)
├── css/  base · components · forms · public · footer · portal · animations · chatbot · responsive · fonts
├── js/
│   ├── site-content.js         ← website's own content (name, copy, 7 directorates, 7 portals)
│   ├── store.js                ← localStorage store + all actions (window.YPDC)
│   ├── core.js · ui.js · layout.js
│   ├── pages/  event-card · forms · home · public-pages · login
│   ├── router.js · modals.js · bindings.js
│   ├── portals/  core · student · member · directorate · faculty · admin · alumni · guest · messages · shell
│   ├── animations.js · chatbot.js · api.js · main.js
└── assets/img/                 ← photos + logo (PDF mockup images)
```

Load order matters and is documented inside `index.html`.

---

## 4. How to run

| Goal | What to do |
|---|---|
| Just see the website | double-click `index.html` (or open `ypdc-uon-website.html` for the single file) |
| Real login + database | `cd backend/server && npm install && npm run first-run && npm start` → http://localhost:8000 |
| Send the site to someone | send `ypdc-uon-website.html` (single file, no internet needed) |

Device support: mobile, tablet, laptop, desktop — media queries in `css/responsive.css`.
Animations: pure CSS + vanilla JS (reveal on scroll, counters, progress bars, back-to-top),
all respecting `prefers-reduced-motion`.

**AI chatbot ("YPDC Assistant")** — every page has a floating assistant.
Default = **offline assistant** (answers from the site's own data, no key needed).
Optional **AI mode**: add your own API key in the widget settings; the key is stored only in your browser.

---

## 5. Customising

| What | Where |
|---|---|
| Texts, tagline, contact details, directorate names | `js/site-content.js` (and `backend/server/data/site-content.json` for the server) |
| Colors, sizes, spacing | `css/base.css` (tokens) |
| Portal pages / sections | `js/portals/*.js` (`NAV`, `SEC.<role>`) |
| Footer, social icons | `js/layout.js` |
| Server behaviour, security limits | `backend/server/.env` |

After editing `js/site-content.js` run `npm run export:content` inside `backend/server`
(or `node scripts/export-content.js`) to refresh `data/site-content.json`.

---

## 6. Where dashboard numbers come from (nothing is fake)

Every counter is read from the server state (`GET /api/state`) — logins, applications,
registrations, events, tasks, certificates, messages, audit entries.
When a collection is empty the UI shows `0` or an empty-state message.
No hardcoded numbers, no sample members, no demo events exist in this project.

---

## 6b. Accounts and photos

**Sign-up:** the login page (`#/login`) has a *Create account* tab. A new user picks a role
(Student / Member / Directorate / Faculty / Alumni), sets a password and is signed in at once —
the account is written to the SQLite `users` table. Admin accounts can only be created with the
ADMIN_KEY, never from the sign-up form. Every sign-up shows up in **Admin → People Directory**
and in the activity log (`user-register`).

**Photos from the dashboard:** Admin panel → **Website Content** → *Photos & logo*.
The admin can upload the homepage hero picture, gallery photos and a custom logo (or reset each
back to the official logo). Pictures are resized in the browser (hero ≤ 1600 px, gallery ≤ 1100 px,
logo ≤ 512 px, JPEG) and stored in the `site` collection, so the public website shows them immediately.

**Cache:** pages, scripts and styles are served with `Cache-Control: no-cache, must-revalidate`,
so a new build can never get stuck in a browser. Images carry a version in their file name and may
be cached for a week. Every page footer shows the build tag, e.g. `Build R33.4 · 27 Sep 2026`.

## 7. Tests

Backend suite (runs against a live server):

```bash
cd backend/server
npm start                     # in one terminal
npm test                      # in another → 94 checks (security, login, CSRF, rate limit, role guard matrix, audit, cleanup)
```

100% pass on a fresh database. The suite creates and removes its own test data. The download is
also checked the way a new user would: ZIP → `npm install` → `npm run first-run` → `npm start` on an
empty database (7/7 browser checks on the fresh copy). The role guard
matrix (§2b) creates one account per role, checks that each role can save what it may save, that
every refused write comes back as `207 + denied`, that admin-only keys (`applications`, `shaheen`)
stay admin-only, and that no role can change its own role or email.

---

## 8. Deploying

| Part | Where |
|---|---|
| `frontend/` | any static host (Vercel, Netlify, GitHub Pages, cPanel) — just upload |
| `backend/` | Render / Railway / Fly.io / any VPS — `Dockerfile`, `docker-compose.yml`, `render.yaml`, `fly.toml` included |
| Both | start the server; it serves `frontend/` and the API on the same origin |

Before going live: change `JWT_SECRET` and `ADMIN_KEY` in `.env`, set `NODE_ENV=production`,
and keep `.env` out of version control.

---

## 9. Notes

- The database starts empty: **1 admin account + 7 directorates**, everything else at 0.
- Only the admin can create accounts (Admin panel → People Directory → + Add member); those users
  then log in with their own email/password.
- PDF export, CSV export and JSON backup are generated server-side / from real records only.
- The single-file build (`ypdc-uon-website.html`) is generated from `index.html` + `css/` + `js/` +
  `assets/img/` (all images embedded as data URIs) — it behaves exactly like the normal site,
  only without the backend.

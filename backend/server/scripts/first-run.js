'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const ENV = path.join(ROOT, '.env');
const ENV_EXAMPLE = path.join(ROOT, '.env.example');
const DB = path.join(ROOT, 'data', 'ypdc.sqlite');

function randomHex(bytes) { return crypto.randomBytes(bytes).toString('hex'); }

let created = false;
if (!fs.existsSync(ENV)) {
  let text = fs.existsSync(ENV_EXAMPLE) ? fs.readFileSync(ENV_EXAMPLE, 'utf8') : '';
  if (!text) text = 'PORT=8000\nHOST=0.0.0.0\nNODE_ENV=development\nDB_FILE=./data/ypdc.sqlite\nJWT_SECRET=x\nADMIN_KEY=x\nTOKEN_HOURS=8\nALLOWED_ORIGINS=\n';
  const jwt = randomHex(48);
  const adminKey = randomHex(8);
  text = text.replace(/^JWT_SECRET=.*$/m, 'JWT_SECRET=' + jwt);
  text = text.replace(/^ADMIN_KEY=.*$/m, 'ADMIN_KEY=' + adminKey);
  if (process.env.PORT) text = text.replace(/^PORT=.*$/m, 'PORT=' + process.env.PORT);
  fs.writeFileSync(ENV, text, 'utf8');
  created = true;
  console.log('✓ .env created (JWT_SECRET and ADMIN_KEY generated randomly)');
} else {
  const env = fs.readFileSync(ENV, 'utf8');
  const weak = /^JWT_SECRET=(change-this-to-a-long-random-string|dev-only-change-me|x)?\s*$/m.test(env);
  const weakKey = /^ADMIN_KEY=(change-this-admin-key|x)?\s*$/m.test(env);
  if (weak || weakKey) {
    let fixed = env;
    if (weak) fixed = fixed.replace(/^JWT_SECRET=.*$/m, 'JWT_SECRET=' + randomHex(48));
    if (weakKey) fixed = fixed.replace(/^ADMIN_KEY=.*$/m, 'ADMIN_KEY=' + randomHex(8));
    fs.writeFileSync(ENV, fixed, 'utf8');
    console.log('✓ .env had default values — replaced with strong random values');
  } else {
    console.log('✓ .env already exists (values kept as they are)');
  }
}

{
  let t = fs.readFileSync(ENV, 'utf8');
  const fromEnv = process.env.ADMIN_PASSWORD || (t.match(/^ADMIN_PASSWORD=(.*)$/m) || [])[1] || '';
  const pw = fromEnv || (crypto.randomBytes(9).toString('base64url') + '9!');
  if (/^ADMIN_PASSWORD=/m.test(t)) t = t.replace(/^ADMIN_PASSWORD=.*$/m, () => 'ADMIN_PASSWORD=' + pw);
  else t = t.replace(/^ADMIN_KEY=.*$/m, m => 'ADMIN_PASSWORD=' + pw + '\n' + m);
  fs.writeFileSync(ENV, t, 'utf8');
  process.env.ADMIN_PASSWORD = pw;
  console.log(fromEnv ? '✓ ADMIN_PASSWORD is stored in .env' : '✓ new ADMIN_PASSWORD generated and written to .env');
}

require('dotenv').config({ path: ENV });
const ADMIN_KEY = process.env.ADMIN_KEY;

const seedScript = process.env.FIRST_RUN_EMPTY === '1' ? 'seed-real.js' : 'seed-content.js';
if (fs.existsSync(DB)) {
  console.log('✓ Database already exists — seed skipped');
} else {
  console.log('→ Creating the database (' + (process.env.FIRST_RUN_EMPTY === '1'
    ? 'real setup — everything empty'
    : 'real setup + website content') + ' + admin account)...');
  execFileSync(process.execPath, [path.join(__dirname, seedScript)], { cwd: ROOT, stdio: 'inherit' });
}

console.log('\n─────────────────────────────────────────────');
console.log('  ALL SET — now start the server:  npm start');
console.log('─────────────────────────────────────────────');
console.log('  Website        : http://localhost:' + (process.env.PORT || 8000) + '/');
console.log('  Admin panel    : create accounts first (People Directory → + Add member)');
console.log('  Admin login    : http://localhost:' + (process.env.PORT || 8000) + '/#/admin');
console.log('                   ' + (process.env.ADMIN_EMAIL || 'admin@uon.edu.pk') + '  ·  password in .env ADMIN_PASSWORD  ·  key: ' + ADMIN_KEY);
console.log('─────────────────────────────────────────────\n');
if (created) console.log('(These values are stored in server/.env — never share them with anyone.)\n');

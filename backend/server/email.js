'use strict';

/* Email bhejne ka ek hi darwaza. SMTP .env se aata hai — code mein koi credential nahi.
   SMTP set na ho to har email email_logs (outbox) mein save hoti hai, jo admin panel mein dikhta hai. */

const { db, now } = require('./db');

const HOST = process.env.SMTP_HOST || '';
const PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const USER = process.env.SMTP_USER || '';
const PASS = process.env.SMTP_PASS || '';
const SECURE = String(process.env.SMTP_SECURE || '') === '1' || PORT === 465;
const FROM = process.env.MAIL_FROM || 'YPDC UON <no-reply@ypdc-uon.local>';

const smtpConfigured = () => !!(HOST && USER && PASS);
const devPreview = () => process.env.MAIL_DEV_PREVIEW === '1';
const siteUrl = () => (process.env.SITE_URL || 'http://localhost:' + (process.env.PORT || 8000)).replace(/\/+$/, '');
const link = path => siteUrl() + (path || '/');

const wrap = (title, lines) =>
  [title, '', ...lines, '', '— YPDC UON · Young Peace & Development Corps', 'University of Narowal'].join('\n');

const TEMPLATES = {
  welcome: v => ({
    subject: 'Your YPDC UON account is ready',
    body: wrap('Assalam-o-Alaikum ' + (v.name || '') + ',', [
      'Your YPDC UON account has been created (' + (v.role || 'member') + ').',
      'Sign in here: ' + link('/#/login'),
      'For your safety, change your password after the first sign-in.'
    ])
  }),
  applicationReceived: v => ({
    subject: 'We received your application — ' + (v.batch || 'YPDC UON'),
    body: wrap('Assalam-o-Alaikum ' + (v.name || '') + ',', [
      'Your application for ' + (v.batch || 'YPDC UON') + ' has been received.',
      'Reference: ' + (v.id || '—'),
      'The team will review it and you will hear from us again at this email address.'
    ])
  }),
  applicationApproved: v => ({
    subject: 'Your application is approved — ' + (v.batch || 'YPDC UON'),
    body: wrap('Congratulations ' + (v.name || '') + ',', [
      'Your application for ' + (v.batch || 'YPDC UON') + ' has been approved.',
      'Sign in with the email and password you chose while applying: ' + link('/#/login'),
      'Welcome to the corps.'
    ])
  }),
  applicationRejected: v => ({
    subject: 'Update on your application — ' + (v.batch || 'YPDC UON'),
    body: wrap('Assalam-o-Alaikum ' + (v.name || '') + ',', [
      'Thank you for applying to ' + (v.batch || 'YPDC UON') + '.',
      'Your application could not be accepted this time.',
      (v.reason ? 'Note: ' + v.reason : 'You are welcome to apply again in the next cycle.')
    ])
  }),
  eventRegistered: v => ({
    subject: 'You are registered — ' + (v.event || 'YPDC UON event'),
    body: wrap('Assalam-o-Alaikum ' + (v.name || '') + ',', [
      'Your registration is confirmed for: ' + (v.event || ''),
      (v.date ? 'Date: ' + v.date : ''),
      (v.venue ? 'Venue: ' + v.venue : ''),
      'Your registration status is visible in your portal under Event Registration.'
    ])
  }),
  eventReminder: v => ({
    subject: 'Reminder — ' + (v.event || 'YPDC UON event') + ' is coming up',
    body: wrap('Assalam-o-Alaikum ' + (v.name || '') + ',', [
      'This is a reminder for ' + (v.event || '') + '.',
      (v.date ? 'Date: ' + v.date : ''),
      (v.venue ? 'Venue: ' + v.venue : ''),
      'Please arrive on time; your attendance will be marked in the portal.'
    ])
  }),
  passwordReset: v => ({
    subject: 'Reset your YPDC UON password',
    body: wrap('Assalam-o-Alaikum ' + (v.name || '') + ',', [
      'Use the link below to set a new password.',
      v.link || '',
      'This link can be used once and expires in ' + (v.minutes || 30) + ' minutes.',
      'If you did not ask for this, ignore this email — nothing changes.'
    ])
  }),
  teamLeaderReceived: v => ({
    subject: 'Team Leader registration received — ' + (v.teamId || ''),
    body: wrap('Team Leader registration received', [
      'Dear ' + (v.name || '') + ',',
      'We received your team leader registration for <b>' + (v.team || '') + '</b> (' + (v.teamId || '') + ').',
      'The YPDC admin team will review it. You will get another email as soon as your team is activated.',
      'Team ID: <b>' + (v.teamId || '') + '</b>'
    ])
  }),
  teamMemberReceived: v => ({
    subject: 'Team member registration received — ' + (v.team || ''),
    body: wrap('Team member registration received', [
      'Dear ' + (v.name || '') + ',',
      'Your request to join <b>' + (v.team || '') + '</b> (' + (v.teamId || '') + ') has been received.',
      'The team leader and the YPDC admin team can see it in their dashboards.'
    ])
  }),
  announcement: v => ({
    subject: 'YPDC UON — ' + (v.title || 'Announcement'),
    body: wrap('Assalam-o-Alaikum,', [v.body || '', v.link ? 'Open in the portal: ' + link(v.link) : ''].filter(Boolean))
  })
};

let transport;
function getTransport() {
  if (!smtpConfigured()) return null;
  if (transport !== undefined) return transport;
  try {
    const nodemailer = require('nodemailer');
    transport = nodemailer.createTransport({
      host: HOST, port: PORT, secure: SECURE,
      auth: { user: USER, pass: PASS }
    });
  } catch (e) {
    console.warn('[email] SMTP is set but nodemailer is not installed — emails stay in the outbox (run npm install).');
    transport = null;
  }
  return transport;
}

function send({ to, subject, body, template }) {
  const id = db.prepare('INSERT INTO email_logs (at, to_email, subject, template, body, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run(now(), String(to || '').slice(0, 160), String(subject || '').slice(0, 200), template || null, body || null, smtpConfigured() ? 'queued' : 'outbox').lastInsertRowid;

  const t = getTransport();
  if (t) {
    t.sendMail({ from: FROM, to, subject, text: body })
      .then(() => db.prepare('UPDATE email_logs SET status = ? WHERE id = ?').run('sent', id))
      .catch(e => db.prepare('UPDATE email_logs SET status = ?, error = ? WHERE id = ?').run('failed', String(e.message || e).slice(0, 300), id));
  }
  return id;
}

function sendTemplate(name, to, vars) {
  const t = TEMPLATES[name];
  if (!t) throw new Error('Unknown email template: ' + name);
  const msg = t(vars || {});
  return send({ to, subject: msg.subject, body: msg.body, template: name });
}

const recent = (limit = 50) =>
  db.prepare('SELECT id, at, to_email, subject, template, status, error, body FROM email_logs ORDER BY id DESC LIMIT ?')
    .all(Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200));

module.exports = { send, sendTemplate, recent, smtpConfigured, devPreview, link, siteUrl, FROM, TEMPLATES };

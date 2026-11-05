'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const nodemailer = require('nodemailer');

const DATA_DIR = path.join(__dirname, '..', 'data');

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

function createTransport(config) {
  const { mail } = config;
  if (mail.mode === 'log' || mail.mode === 'file') {
    // log: builds the full message but sends nothing. file: enquiries are saved to disk (see saveEnquiry).
    return nodemailer.createTransport({ jsonTransport: true });
  }
  return nodemailer.createTransport({
    host: mail.host,
    port: mail.port,
    secure: mail.secure, // true for 465 (implicit TLS); false => STARTTLS is negotiated on 587
    requireTLS: !mail.secure,
    auth: { user: mail.user, pass: mail.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

const istTime = () =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date()) + ' IST';

/**
 * MAIL_MODE=file: no email account needed. Appends the enquiry to data/enquiries.jsonl
 * (read it with 
pm run leads). Returns the record id.
 */
async function saveEnquiry(enquiry, meta) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const id = crypto.randomUUID();
  const record = {
    id,
    receivedAt: new Date().toISOString(),
    receivedIST: istTime(),
    source: /^\[Sent via the website AI chatbot\]/.test(enquiry.message || '') ? 'chatbot' : 'contact form',
    name: enquiry.name,
    company: enquiry.company || '',
    email: enquiry.email,
    interest: enquiry.interest,
    message: enquiry.message || '',
    ip: meta.ip || null,
  };
  await fs.appendFile(path.join(DATA_DIR, 'enquiries.jsonl'), JSON.stringify(record) + '\n', 'utf8');
  return id;
}

/**
 * Sends one enquiry to the company inbox.
 * - From is always our own mailbox (SPF/DKIM alignment); the visitor goes in Reply-To only.
 * - Every visitor-controlled value is HTML-escaped in the HTML part.
 */
async function sendEnquiry(transport, config, enquiry, meta = {}) {
  if (config.mail.mode === 'file') return saveEnquiry(enquiry, meta);
  const { name, company, email, interest, message } = enquiry;
  const when = istTime();
  const details = message || '(No additional details)';

  const text = [
    'New enquiry from the KSS website',
    '',
    `Name:        ${name}`,
    `Company:     ${company || '-'}`,
    `Email:       ${email}`,
    `Interested:  ${interest}`,
    '',
    'Details:',
    details,
    '',
    '---',
    `Received: ${when}`,
    `IP: ${meta.ip || 'unknown'}`,
    'Reply to this email to respond to the visitor.',
  ].join('\n');

  const row = (k, v) =>
    `<tr><td style="padding:6px 16px 6px 0;color:#5b6b8a;white-space:nowrap;vertical-align:top">${k}</td>` +
    `<td style="padding:6px 0;color:#0b1530">${v}</td></tr>`;

  const html =
    `<div style="font:15px/1.5 -apple-system,Segoe UI,Arial,sans-serif;color:#0b1530">` +
    `<h2 style="margin:0 0 12px;font-size:18px">New enquiry from the KSS website</h2>` +
    `<table style="border-collapse:collapse">` +
    row('Name', esc(name)) +
    row('Company', esc(company || '-')) +
    row('Email', `<a href="mailto:${esc(email)}">${esc(email)}</a>`) +
    row('Interested in', esc(interest)) +
    `</table>` +
    `<p style="margin:16px 0 4px;color:#5b6b8a">Details</p>` +
    `<div style="white-space:pre-wrap;padding:12px 14px;background:#f3f8ff;border-left:3px solid #1f5cff">${esc(details)}</div>` +
    `<p style="margin-top:16px;font-size:12px;color:#8190ab">Received ${esc(when)} · IP ${esc(meta.ip || 'unknown')}` +
    ` · Reply to this email to respond to the visitor.</p></div>`;

  const info = await transport.sendMail({
    from: { name: 'Kalpanaaa Website', address: config.mail.from },
    to: config.mail.to,
    replyTo: { name, address: email },
    subject: `Project enquiry: ${interest} — ${name}`,
    text,
    html,
  });
  return info.messageId;
}

module.exports = { createTransport, sendEnquiry };

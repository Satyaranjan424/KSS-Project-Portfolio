'use strict';

// Must match the <option> values in frontend/index.html.
const INTERESTS = [
  'Mobile App Development',
  'WhatsApp Chatbot Development',
  'AI Chatbot / Automation',
  'Web Platform',
  'Something else',
];

const LIMITS = { name: 80, company: 80, email: 254, message: 2000 };

// C0 controls (except \n handled separately), DEL, and Unicode line/paragraph separators.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029]/g;

// Collapses all whitespace (incl. CR/LF/tab) so the value is safe for headers like Subject/Reply-To.
const singleLine = (v) =>
  String(v ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(CONTROL_CHARS, '')
    .replace(/ {2,}/g, ' ')
    .trim();

const multiLine = (v) =>
  String(v ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHARS, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

// Pragmatic address check: rejects quoted local parts and exotic forms on purpose.
const EMAIL_RE =
  /^[^\s@<>"',;:()[\]\\]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

function parseEnquiry(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: { form: 'Invalid request.' } };
  }

  // Honeypot: real users never see or fill this field.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return { ok: false, spam: true };
  }

  const errors = {};
  const isStr = (v) => typeof v === 'string';

  const name = isStr(body.name) ? singleLine(body.name) : '';
  const company = isStr(body.company) ? singleLine(body.company) : '';
  const email = isStr(body.email) ? singleLine(body.email) : '';
  const interest = isStr(body.interest) ? singleLine(body.interest) : '';
  const message = isStr(body.message) ? multiLine(body.message) : '';

  if (name.length < 2) errors.name = 'Please enter your name.';
  else if (name.length > LIMITS.name) errors.name = `Name must be at most ${LIMITS.name} characters.`;

  if (company.length > LIMITS.company) errors.company = `Company must be at most ${LIMITS.company} characters.`;

  const [local = ''] = email.split('@');
  if (!email) errors.email = 'Please enter your email address.';
  else if (email.length > LIMITS.email || local.length > 64 || !EMAIL_RE.test(email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!INTERESTS.includes(interest)) errors.interest = 'Please choose a valid option.';

  if (message.length > LIMITS.message) errors.message = `Details must be at most ${LIMITS.message} characters.`;

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, company, email, interest, message } };
}

module.exports = { parseEnquiry, INTERESTS, LIMITS };

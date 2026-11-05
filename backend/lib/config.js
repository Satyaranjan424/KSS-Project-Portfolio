'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
require('dotenv').config();

const bool = (v, fallback = false) =>
  v === undefined || v === '' ? fallback : /^(1|true|yes|on)$/i.test(String(v).trim());

const list = (v) =>
  String(v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

// TRUST_PROXY: "" / "false" -> false, "1" -> 1 hop, anything else passed through (e.g. "loopback").
const parseTrustProxy = (v) => {
  if (v === undefined || v === '' || /^false$/i.test(v)) return false;
  if (/^\d+$/.test(v)) return Number(v);
  if (/^true$/i.test(v)) return true;
  return v;
};

const smtpPort = Number(process.env.SMTP_PORT) || 587;

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  // Extra browser origins allowed to call the API (only needed if the site is hosted elsewhere).
  allowedOrigins: list(process.env.ALLOWED_ORIGINS),
  serveStatic: bool(process.env.SERVE_STATIC, true),
  rateLimit: {
    windowMs: (Number(process.env.RATE_LIMIT_WINDOW_MIN) || 15) * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 5,
  },
  mail: {
    mode: String(process.env.MAIL_MODE || 'smtp').toLowerCase(), // "smtp" | "file" (save to data/enquiries.jsonl, no email account needed) | "log" (dev: nothing stored or sent)
    to: process.env.MAIL_TO || 'info@kalpanaaasoftwaresolutions.in',
    host: process.env.SMTP_HOST || '',
    port: smtpPort,
    secure: bool(process.env.SMTP_SECURE, smtpPort === 465),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || process.env.SMTP_USER || '',
  },
};

// AI chatbot (POST /api/chat). Disabled automatically when no API key is set.
// Extra JSON merged into the model request. Default turns off the model's hidden 'thinking' phase so replies are fast and never cut off.
function parseExtraBody(raw) {
  if (raw === undefined || raw === '') return { chat_template_kwargs: { enable_thinking: false } };
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

config.chat = {
  extraBody: parseExtraBody(process.env.CHAT_EXTRA_BODY),
  enabled: Boolean(process.env.NVIDIA_API_KEY),
  apiKey: process.env.NVIDIA_API_KEY || '',
  apiUrl: process.env.NVIDIA_API_URL || 'https://integrate.api.nvidia.com/v1/chat/completions',
  model: process.env.CHAT_MODEL || 'nvidia/nemotron-3.5-lightning-30b-a3b', // any tool-calling model id from build.nvidia.com
  maxTokens: Number(process.env.CHAT_MAX_TOKENS) || 500,
  timeoutMs: Number(process.env.CHAT_TIMEOUT_MS) || 25000,
  rateMax: Number(process.env.CHAT_RATE_MAX) || 20,          // messages per IP per 10 minutes
  dailyCap: Number(process.env.CHAT_DAILY_CAP) || 400,       // total model calls per day (spend guard)
  leadsPerIp: Number(process.env.CHAT_LEADS_PER_IP) || 3,    // enquiries the bot may email per IP per 15 min
};
if (!['smtp', 'file', 'log'].includes(config.mail.mode)) {
  throw new Error(`MAIL_MODE must be "smtp", "file" or "log" (got "${config.mail.mode}")`);
}
if (config.mail.mode === 'smtp') {
  const missing = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(
      `Missing required env var(s): ${missing.join(', ')}. ` +
        'Copy .env.example to .env, or set MAIL_MODE=file to save enquiries without an email account.'
    );
  }
}

module.exports = config;

'use strict';

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const config = require('./lib/config');
const { parseEnquiry } = require('./lib/validate');
const { createTransport, sendEnquiry } = require('./lib/mailer');
const { parseMessages, generateReply, createCounter, createDailyCap } = require('./lib/chat');

// One JSON object per line: easy to grep locally, easy to ingest in prod.
// Never log message bodies or SMTP credentials.
const log = (level, msg, extra = {}) =>
  (level === 'error' ? console.error : console.log)(
    JSON.stringify({ ts: new Date().toISOString(), level, msg, ...extra })
  );

const transport = createTransport(config);
const app = express();

app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);

// CSP is intentionally off: the static site uses an inline boot script and inline styles.
// Hash/nonce them before enabling it. All other helmet defaults stay on.
app.use(helmet({ contentSecurityPolicy: false }));

app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));

/* ------------------------------- API -------------------------------- */
const api = express.Router();

// Browsers send Origin on cross-origin and on same-origin POSTs. Accept: no Origin (curl, server-to-server),
// the same host that serves the API, or an explicitly allowed origin. Rejecting the rest stops
// third-party pages from posting to the form on a visitor's behalf.
api.use((req, res, next) => {
  const origin = req.get('origin');
  if (!origin) return next();
  let sameHost = false;
  try {
    sameHost = new URL(origin).host === req.get('host');
  } catch {
    /* malformed Origin -> not same host */
  }
  if (sameHost || config.allowedOrigins.includes(origin)) return next();
  log('warn', 'origin_rejected', { reqId: req.id, origin });
  return res.status(403).json({ ok: false, error: 'forbidden_origin' });
});

api.use(cors({ origin: config.allowedOrigins, methods: ['POST', 'OPTIONS'], maxAge: 600 }));

const contactLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  limit: config.rateLimit.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    log('warn', 'rate_limited', { reqId: req.id, ip: req.ip });
    res.status(429).json({ ok: false, error: 'rate_limited' });
  },
});

api.post('/contact', contactLimiter, express.json({ limit: '10kb' }), async (req, res) => {
  const result = parseEnquiry(req.body);

  if (result.spam) {
    // Pretend success so bots get no signal to adapt to.
    log('warn', 'honeypot_hit', { reqId: req.id, ip: req.ip });
    return res.json({ ok: true });
  }
  if (!result.ok) {
    return res.status(400).json({ ok: false, errors: result.errors });
  }

  try {
    const messageId = await sendEnquiry(transport, config, result.value, { ip: req.ip });
    log('info', 'enquiry_sent', { reqId: req.id, messageId, interest: result.value.interest });
    return res.json({ ok: true });
  } catch (err) {
    log('error', 'enquiry_send_failed', {
      reqId: req.id,
      code: err.code,
      responseCode: err.responseCode,
      error: err.message,
    });
    return res.status(502).json({ ok: false, error: 'delivery_failed' });
  }
});

/* ----------------------------- AI chat ------------------------------ */
const chatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: config.chat.rateMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    log('warn', 'chat_rate_limited', { reqId: req.id, ip: req.ip });
    res.status(429).json({ ok: false, error: 'rate_limited' });
  },
});
const takeDaily = createDailyCap(config.chat.dailyCap);
const allowLead = createCounter(config.chat.leadsPerIp, 15 * 60 * 1000);

api.post('/chat', chatLimiter, express.json({ limit: '20kb' }), async (req, res) => {
  if (!config.chat.enabled) return res.status(503).json({ ok: false, error: 'chat_unavailable' });

  const messages = parseMessages(req.body);
  if (!messages) return res.status(400).json({ ok: false, error: 'invalid_messages' });

  if (!takeDaily()) {
    log('warn', 'chat_daily_cap_reached', { reqId: req.id });
    return res.status(503).json({ ok: false, error: 'chat_busy' });
  }

  const started = Date.now();
  try {
    const { reply, leadSent } = await generateReply({
      config,
      transport,
      messages,
      ip: req.ip,
      allowLead,
      log: (level, msg, extra) => log(level, msg, { reqId: req.id, ...extra }),
    });
    log('info', 'chat_reply', { reqId: req.id, turns: messages.length, leadSent, ms: Date.now() - started });
    return res.json({ ok: true, reply, leadSent });
  } catch (err) {
    log('error', 'chat_failed', { reqId: req.id, status: err.status, error: err.message, detail: err.detail, ms: Date.now() - started });
    return res.status(502).json({ ok: false, error: 'chat_failed' });
  }
});
api.use((_req, res) => res.status(404).json({ ok: false, error: 'not_found' }));
app.use('/api', api);

/* --------------------------- Static site ---------------------------- */
if (config.serveStatic) {
  app.use(
    express.static(path.join(__dirname, '..', 'frontend'), {
      maxAge: config.env === 'production' ? '1h' : 0,
    })
  );
}

/* ----------------------------- Errors ------------------------------- */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ ok: false, error: 'payload_too_large' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ ok: false, error: 'invalid_json' });
  log('error', 'unhandled', { reqId: req.id, error: err.message });
  return res.status(500).json({ ok: false, error: 'internal_error' });
});

/* ----------------------------- Startup ------------------------------ */
const server = app.listen(config.port, () => {
  log('info', 'listening', {
    port: config.port,
    env: config.env,
    mailMode: config.mail.mode,
    mailTo: config.mail.to,
    serveStatic: config.serveStatic,
    chat: config.chat.enabled ? config.chat.model : 'disabled (no NVIDIA_API_KEY)',
  });
  if (config.mail.mode === 'smtp') {
    // Don't crash if SMTP is briefly unreachable; just make misconfiguration visible at boot.
    transport
      .verify()
      .then(() => log('info', 'smtp_verified', { host: config.mail.host }))
      .catch((err) => log('error', 'smtp_verify_failed', { host: config.mail.host, error: err.message }));
  }
});

const shutdown = (signal) => {
  log('info', 'shutting_down', { signal });
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => log('error', 'unhandled_rejection', { error: String(err) }));

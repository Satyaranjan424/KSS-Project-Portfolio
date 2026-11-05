# KSS Portfolio: backend

Express API that receives the website's contact form and emails it to `info@kalpanaaasoftwaresolutions.in` over SMTP. It also serves `../frontend`, so one process hosts everything.

## Run

```
cd backend
npm install
copy .env.example .env      # then fill in SMTP_HOST / SMTP_USER / SMTP_PASS
npm run test:smtp -- --send # verifies credentials and sends a test email to MAIL_TO
npm start                   # http://localhost:3000
```

For local testing without sending email: `MAIL_MODE=log` in `.env`.

## SMTP settings

Use the SMTP details for the **mailbox that hosts info@kalpanaaasoftwaresolutions.in** (Google Workspace, Zoho, your hosting provider's cPanel mail, etc.). Typical values:

| Provider | Host | Port | Notes |
|---|---|---|---|
| Google Workspace | smtp.gmail.com | 587 | needs an App Password (2-Step Verification on) |
| Zoho Mail | smtp.zoho.in (or .com) | 587 / 465 | use an app-specific password if 2FA is on |
| cPanel / hosting | mail.yourdomain | 465 or 587 | use the mailbox password |

Keep `MAIL_FROM` equal to that mailbox (or an alias it may send as). For deliverability, the domain should have SPF/DKIM/DMARC records for the provider.

## API

`POST /api/contact` (JSON): `name`*, `email`*, `interest`*, `company`, `message`, `website` (honeypot; must stay empty)

| Status | Meaning |
|---|---|
| 200 `{ok:true}` | sent (also returned silently for honeypot hits) |
| 400 `{errors:{field:msg}}` | validation failed |
| 403 | request from a non-allowed browser origin |
| 413 / 415-ish | body > 10 KB / invalid JSON |
| 429 | rate limited (default 5 per 15 min per IP) |
| 502 | SMTP delivery failed (details in server log) |

`GET /healthz` returns `{ok:true}`.

## Deploy notes

- Run behind a reverse proxy (nginx, Caddy, a PaaS)? Set `TRUST_PROXY=1`, otherwise every visitor shares the proxy's IP and the rate limit hits everyone at once.
- Site on a different host/CDN? Set `SERVE_STATIC=false`, `ALLOWED_ORIGINS=https://your-site`, and set `CONFIG.apiUrl` in `frontend/script.js` to the full API URL.
- Use a process manager (pm2, systemd, Docker) and keep `.env` out of git (already in `.gitignore`).
- Delivery is synchronous with no queue or retry: if SMTP is down the visitor sees an error with a `mailto:` fallback. Add a queue only if enquiry volume or reliability needs justify it.
- Helmet's CSP is disabled because the site uses an inline boot script and inline styles.

## AI chatbot

`POST /api/chat` (JSON `{messages:[{role,content},...]}`, up to 12 messages, first and last from `user`) returns `{ok, reply, leadSent}`. It calls the NVIDIA API (OpenAI-compatible chat completions at integrate.api.nvidia.com) from the server, so the key never reaches the browser.

- **Enable:** set `NVIDIA_API_KEY` in `.env` (generate one at build.nvidia.com/settings/api-keys; it starts with `nvapi-`). Empty key = chatbot disabled; the endpoint returns 503 and the widget shows the contact-form fallback.
- **Model:** `CHAT_MODEL` (default `nvidia/nemotron-3.5-lightning-30b-a3b`). Use any hosted model id from build.nvidia.com that supports tool/function calling, since the bot relies on the `send_enquiry` tool. Check the model's page for current availability and free-tier rate limits (models are retired from time to time; a 410 in the server log means the model is gone). CHAT_EXTRA_BODY (JSON) is merged into the request; the default disables the model's thinking phase, set it to {} for a model that rejects that field.
- **Knowledge and rules:** the system prompt is in `lib/chat.js`. It is built from the site's content. Edit it to add pricing policy, FAQs, or new projects; the bot is told not to invent prices, timelines or clients.
- **Lead capture:** the model can call a `send_enquiry` tool after the visitor confirms their name, email, interest and project. The server re-validates the input with the same rules as the contact form and emails it to `MAIL_TO` (marked "Sent via the website AI chatbot"). Limited to `CHAT_LEADS_PER_IP` per 15 min.
- **Cost and abuse controls:** per-IP limit (`CHAT_RATE_MAX`, default 20 per 10 min), a global daily cap (`CHAT_DAILY_CAP`, default 400 calls/day), 600 chars per user message, 500 output tokens, 25 s upstream timeout. The daily counter and lead counter are in memory and reset on restart.
- **Not stored:** conversations are not persisted or logged (only metadata). Replies are non-streaming (the widget shows a typing indicator).
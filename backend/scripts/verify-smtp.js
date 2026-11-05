'use strict';

// Usage:
//   npm run test:smtp            -> checks SMTP connection + auth only
//   npm run test:smtp -- --send  -> also sends a test email to MAIL_TO
const config = require('../lib/config');
const { createTransport, sendEnquiry } = require('../lib/mailer');

(async () => {
  const transport = createTransport(config);
  try {
    if (config.mail.mode === 'smtp') {
      await transport.verify();
      console.log(`SMTP OK: ${config.mail.host}:${config.mail.port} (secure=${config.mail.secure}) as ${config.mail.user}`);
    } else {
      console.log('MAIL_MODE=log: nothing to verify.');
    }
    if (process.argv.includes('--send')) {
      const id = await sendEnquiry(
        transport,
        config,
        {
          name: 'SMTP Test',
          company: 'KSS',
          email: config.mail.from || 'test@example.com',
          interest: 'Something else',
          message: 'This is a test message from scripts/verify-smtp.js.',
        },
        { ip: 'local' }
      );
      console.log(`Test email sent to ${config.mail.to} (messageId ${id})`);
    }
  } catch (err) {
    console.error(`FAILED: ${err.code || ''} ${err.responseCode || ''} ${err.message}`);
    process.exitCode = 1;
  }
})();

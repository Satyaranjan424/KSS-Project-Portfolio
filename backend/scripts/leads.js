'use strict';
// Prints enquiries saved by MAIL_MODE=file (newest first).
//   npm run leads            readable list
//   npm run leads -- --json  raw JSON
//   npm run leads -- --csv   CSV (opens in Excel)
const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'data', 'enquiries.jsonl');
if (!fs.existsSync(file)) {
  console.log('No enquiries saved yet.');
  process.exit(0);
}
const rows = fs
  .readFileSync(file, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      return null;
    }
  })
  .filter(Boolean)
  .reverse();

const arg = process.argv[2];
if (arg === '--json') {
  console.log(JSON.stringify(rows, null, 2));
} else if (arg === '--csv') {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
  const cols = ['receivedIST', 'source', 'name', 'company', 'email', 'interest', 'message', 'ip', 'id'];
  console.log(cols.join(','));
  for (const r of rows) console.log(cols.map((c) => q(r[c])).join(','));
} else {
  console.log(`${rows.length} enquir${rows.length === 1 ? 'y' : 'ies'} (newest first)\n`);
  for (const r of rows) {
    console.log(`[${r.receivedIST}]  via ${r.source}`);
    console.log(`  Name:     ${r.name}${r.company ? ` (${r.company})` : ''}`);
    console.log(`  Email:    ${r.email}`);
    console.log(`  Interest: ${r.interest}`);
    console.log(`  Details:  ${String(r.message || '-').replace(/\n/g, '\n            ')}`);
    console.log('');
  }
}

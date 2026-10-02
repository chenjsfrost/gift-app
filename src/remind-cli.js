// Sends the reminder email. Run on a schedule (see README), or by hand:
//   npm run remind              send if anything is open
//   npm run remind -- --dry-run print the email instead of sending it
import nodemailer from 'nodemailer';
import { openDb } from './db.js';
import { upcomingSections, localToday } from './upcoming.js';
import { buildReminder } from './reminder.js';

const env = process.env;
const days = Number(env.REMIND_DAYS ?? 30);
const today = localToday();
const db = openDb(env.DB_PATH ?? 'data/gifts.db');
const email = buildReminder({
  sections: upcomingSections(db, today, days),
  today,
  days,
  appUrl: `http://localhost:${env.PORT ?? 3000}`,
});

if (!email) {
  console.log(`Nothing still to buy in the next ${days} days. No email sent.`);
  process.exit(0);
}
if (process.argv.includes('--dry-run')) {
  console.log(`Subject: ${email.subject}\n\n${email.text}`);
  process.exit(0);
}

const missing = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'REMIND_TO'].filter((k) => !env[k]);
if (missing.length) {
  console.error(`Can't send: set ${missing.join(', ')} in .env. Here is what would have been sent:\n`);
  console.error(`Subject: ${email.subject}\n\n${email.text}`);
  process.exit(1);
}

const port = Number(env.SMTP_PORT ?? 465);
const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port,
  secure: port === 465,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});
await transport.sendMail({ from: env.SMTP_USER, to: env.REMIND_TO, subject: email.subject, text: email.text });
console.log(`Sent "${email.subject}" to ${env.REMIND_TO}.`);

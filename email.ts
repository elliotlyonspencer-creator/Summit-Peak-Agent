import nodemailer from 'nodemailer';
import crypto from 'crypto';

const {
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
  FROM_EMAIL, FROM_NAME,
  APP_URL,
  UNSUBSCRIBE_SECRET
} = process.env;

if (!FROM_EMAIL) throw new Error('FROM_EMAIL is required');

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 587),
  secure: false,
  auth: { user: SMTP_USER, pass: SMTP_PASS }
});

function unsubToken(email: string) {
  return crypto.createHmac('sha256', (UNSUBSCRIBE_SECRET || 'secret'))
    .update(email).digest('hex');
}

export function unsubscribeLink(email: string) {
  const base = APP_URL || 'http://localhost:' + (process.env.APP_PORT || '8080');
  return `${base}/unsubscribe?email=${encodeURIComponent(email)}&token=${unsubToken(email)}`;
}

export async function sendEmail(to: string, subject: string, html: string) {
  const footer = `
    <hr>
    <small>
      Summit Peak Properties — Utah<br>
      Prefer not to hear from us? <a href="\${unsubscribeLink(to)}">Unsubscribe</a>.
    </small>
  `;
  await transporter.sendMail({
    from: `${FROM_NAME || 'Summit Peak Properties'} <${FROM_EMAIL}>`,
    to,
    subject,
    html: `${html}${footer}`
  });
}

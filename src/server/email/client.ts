import nodemailer, { type Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

/**
 * Lazily creates a shared SMTP transporter from env vars. Returns `null` when
 * SMTP isn't configured so local development can run without Brevo credentials.
 */
export function getTransporter(): Transporter | null {
  if (transporter) {
    return transporter;
  }

  const host = process.env['SMTP_HOST'];
  const port = process.env['SMTP_PORT'];
  const user = process.env['SMTP_USER'];
  const pass = process.env['SMTP_PASS'];

  if (!host || !port || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
  });

  return transporter;
}

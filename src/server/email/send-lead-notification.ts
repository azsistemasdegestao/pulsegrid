import { getTransporter } from './client';
import type { NewLead } from '../db/schema';

export async function sendLeadNotification(lead: NewLead): Promise<void> {
  const transporter = getTransporter();
  const to = process.env['EMAIL_TO'];
  const from = process.env['EMAIL_FROM'];

  if (!transporter || !to || !from) {
    console.warn('Email notification skipped: SMTP not configured.');
    return;
  }

  await transporter.sendMail({
    from,
    to,
    replyTo: lead.email,
    subject: `New Pulsegrid demo request from ${lead.company}`,
    text: [
      `Name: ${lead.name}`,
      `Email: ${lead.email}`,
      `Company: ${lead.company}`,
      `Message: ${lead.message || '(none)'}`,
    ].join('\n'),
    html: [
      `<p><strong>Name:</strong> ${lead.name}</p>`,
      `<p><strong>Email:</strong> ${lead.email}</p>`,
      `<p><strong>Company:</strong> ${lead.company}</p>`,
      `<p><strong>Message:</strong> ${lead.message || '(none)'}</p>`,
    ].join('\n'),
  });
}

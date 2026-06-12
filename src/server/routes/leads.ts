import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { leads } from '../db/schema';
import { sendLeadNotification } from '../email/send-lead-notification';
import { rateLimit } from '../lib/rate-limit';

const leadSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().toLowerCase().email(),
  company: z.string().trim().min(1),
  message: z.string().trim().optional().default(''),
  consent: z.literal(true),
  // Honeypot field: real visitors never fill this in.
  website: z.string().optional().default(''),
});

export const leadsRouter = Router();

leadsRouter.post(
  '/',
  rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: 'Too many requests. Please try again later.',
  }),
  async (req, res) => {
    const result = leadSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({ message: 'Please check your information and try again.' });
      return;
    }

    const { website, ...lead } = result.data;

    if (website) {
      // Honeypot tripped: respond as if successful without persisting anything.
      res.status(201).json({ success: true });
      return;
    }

    try {
      const [inserted] = await db
        .insert(leads)
        .values({ ...lead, ipAddress: req.ip })
        .returning();

      sendLeadNotification(inserted).catch((err: unknown) => {
        console.error('Failed to send lead notification email', err);
      });

      res.status(201).json({ success: true });
    } catch (err) {
      console.error('Failed to save lead', err);
      res.status(500).json({ message: 'Something went wrong. Please try again in a moment.' });
    }
  },
);

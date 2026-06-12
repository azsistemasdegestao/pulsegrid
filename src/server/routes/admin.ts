import { desc } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { leads } from '../db/schema';
import {
  ADMIN_COOKIE_MAX_AGE_MS,
  ADMIN_COOKIE_NAME,
  createAdminToken,
  requireAdmin,
  verifyAdminPassword,
} from '../lib/admin-auth';
import { rateLimit } from '../lib/rate-limit';

const loginSchema = z.object({
  password: z.string().min(1),
});

export const adminRouter = Router();

adminRouter.post(
  '/login',
  rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    message: 'Too many attempts. Please try again later.',
  }),
  (req, res) => {
    const result = loginSchema.safeParse(req.body);

    if (!result.success || !verifyAdminPassword(result.data.password)) {
      res.status(401).json({ message: 'Incorrect password.' });
      return;
    }

    res.cookie(ADMIN_COOKIE_NAME, createAdminToken(), {
      httpOnly: true,
      sameSite: 'lax',
      // `req.secure` reflects X-Forwarded-Proto (trust proxy is enabled), so the
      // cookie is only marked Secure when the original request was over HTTPS.
      // This keeps the admin panel working over plain HTTP (default Docker Compose setup)
      // while still adding the Secure flag once TLS is in front of the app.
      secure: req.secure,
      maxAge: ADMIN_COOKIE_MAX_AGE_MS,
    });
    res.json({ success: true });
  },
);

adminRouter.post('/logout', (_req, res) => {
  res.clearCookie(ADMIN_COOKIE_NAME);
  res.json({ success: true });
});

adminRouter.get('/leads', requireAdmin, async (_req, res) => {
  const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));
  res.json({ leads: allLeads });
});

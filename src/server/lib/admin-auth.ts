import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const COOKIE_NAME = 'pulsegrid_admin';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function getSessionSecret(): string {
  const secret = process.env['SESSION_SECRET'];
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is required');
  }
  return secret;
}

function sign(value: string): string {
  return createHmac('sha256', getSessionSecret()).update(value).digest('hex');
}

/** Builds a signed `expiry.signature` token proving the admin authenticated before `expiresAt`. */
export function createAdminToken(): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  return `${expiresAt}.${sign(String(expiresAt))}`;
}

function isValidAdminToken(token: string): boolean {
  const [expiresAt, signature] = token.split('.');
  if (!expiresAt || !signature) {
    return false;
  }

  const expected = sign(expiresAt);
  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (signatureBuf.length !== expectedBuf.length || !timingSafeEqual(signatureBuf, expectedBuf)) {
    return false;
  }

  return Number(expiresAt) > Date.now();
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
export const ADMIN_COOKIE_MAX_AGE_MS = SESSION_TTL_MS;

export function verifyAdminPassword(password: string): boolean {
  const expected = process.env['ADMIN_PASSWORD'];
  if (!expected) {
    throw new Error('ADMIN_PASSWORD environment variable is required');
  }

  const providedBuf = Buffer.from(password);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }

  return timingSafeEqual(providedBuf, expectedBuf);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAME];

  if (typeof token !== 'string' || !isValidAdminToken(token)) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  next();
}

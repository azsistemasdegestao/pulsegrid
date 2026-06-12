import type { NextFunction, Request, Response } from 'express';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
}

interface Hit {
  count: number;
  resetAt: number;
}

/**
 * Minimal in-memory, per-IP rate limiter. Good enough for a single-instance
 * deployment; swap for a shared store (e.g. Redis) if scaling horizontally.
 */
export function rateLimit({ windowMs, max, message }: RateLimitOptions) {
  const hits = new Map<string, Hit>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const hit = hits.get(key);

    if (!hit || hit.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (hit.count >= max) {
      res.status(429).json({ message });
      return;
    }

    hit.count += 1;
    next();
  };
}

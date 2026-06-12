import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';
import { rateLimit } from './rate-limit';

function createMockRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests under the limit and blocks once the limit is exceeded', () => {
    const middleware = rateLimit({ windowMs: 1000, max: 2, message: 'Too many requests.' });
    const req = { ip: '1.2.3.4' } as Request;

    const next1 = vi.fn();
    middleware(req, createMockRes(), next1);
    expect(next1).toHaveBeenCalledOnce();

    const next2 = vi.fn();
    middleware(req, createMockRes(), next2);
    expect(next2).toHaveBeenCalledOnce();

    const res3 = createMockRes();
    const next3 = vi.fn();
    middleware(req, res3, next3);
    expect(next3).not.toHaveBeenCalled();
    expect(res3.statusCode).toBe(429);
    expect(res3.body).toEqual({ message: 'Too many requests.' });
  });

  it('resets the count once the window has elapsed', () => {
    const middleware = rateLimit({ windowMs: 1000, max: 1, message: 'Too many requests.' });
    const req = { ip: '5.6.7.8' } as Request;

    middleware(req, createMockRes(), vi.fn());

    const blocked = createMockRes();
    middleware(req, blocked, vi.fn());
    expect(blocked.statusCode).toBe(429);

    vi.setSystemTime(1001);

    const next = vi.fn();
    const allowed = createMockRes();
    middleware(req, allowed, next);
    expect(next).toHaveBeenCalledOnce();
    expect(allowed.statusCode).toBe(0);
  });

  it('tracks each client IP independently', () => {
    const middleware = rateLimit({ windowMs: 1000, max: 1, message: 'Too many requests.' });

    const next1 = vi.fn();
    middleware({ ip: '1.1.1.1' } as Request, createMockRes(), next1);
    expect(next1).toHaveBeenCalledOnce();

    const next2 = vi.fn();
    middleware({ ip: '2.2.2.2' } as Request, createMockRes(), next2);
    expect(next2).toHaveBeenCalledOnce();
  });
});

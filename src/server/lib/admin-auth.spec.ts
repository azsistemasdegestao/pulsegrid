import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';
import {
  ADMIN_COOKIE_NAME,
  createAdminToken,
  requireAdmin,
  verifyAdminPassword,
} from './admin-auth';

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

function createMockReq(cookies: Record<string, string> = {}) {
  return { cookies } as unknown as Request;
}

describe('admin-auth', () => {
  beforeEach(() => {
    process.env['SESSION_SECRET'] = 'test-session-secret';
    process.env['ADMIN_PASSWORD'] = 'correct-password';
  });

  describe('verifyAdminPassword', () => {
    it('returns true for the correct password', () => {
      expect(verifyAdminPassword('correct-password')).toBe(true);
    });

    it('returns false for an incorrect password', () => {
      expect(verifyAdminPassword('wrong-password')).toBe(false);
    });

    it('returns false for a password of a different length', () => {
      expect(verifyAdminPassword('short')).toBe(false);
    });
  });

  describe('requireAdmin', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(0);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('rejects requests with no session cookie', () => {
      const res = createMockRes();
      const next = vi.fn();

      requireAdmin(createMockReq(), res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(401);
    });

    it('allows requests with a valid, unexpired token', () => {
      const token = createAdminToken();
      const res = createMockRes();
      const next = vi.fn();

      requireAdmin(createMockReq({ [ADMIN_COOKIE_NAME]: token }), res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.statusCode).toBe(0);
    });

    it('rejects an expired token', () => {
      const token = createAdminToken();

      vi.setSystemTime(9 * 60 * 60 * 1000); // 9 hours later, past the 8-hour TTL

      const res = createMockRes();
      const next = vi.fn();
      requireAdmin(createMockReq({ [ADMIN_COOKIE_NAME]: token }), res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(401);
    });

    it('rejects a token with a tampered signature', () => {
      const token = createAdminToken();
      const [expiresAt] = token.split('.');
      const tampered = `${expiresAt}.${'0'.repeat(64)}`;

      const res = createMockRes();
      const next = vi.fn();
      requireAdmin(createMockReq({ [ADMIN_COOKIE_NAME]: tampered }), res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(401);
    });
  });
});

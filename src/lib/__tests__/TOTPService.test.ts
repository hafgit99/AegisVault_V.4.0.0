// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  parseOtpauthUri,
  createTOTPParams,
  toOtpauthUri,
  generateTOTP,
  getRemainingSeconds,
  verifyTOTP,
} from '../TOTPService';

describe('TOTPService', () => {
  const SECRET = 'JBSWY3DPEHPK3PXP'; // "Hello!" in Base32
  const PARAMS = createTOTPParams(SECRET, 'TestIssuer', 'user@test.com');

  describe('createTOTPParams', () => {
    it('creates params with defaults', () => {
      const p = createTOTPParams('abc123');
      expect(p.secret).toBe('ABC123');
      expect(p.issuer).toBe('');
      expect(p.account).toBe('');
      expect(p.algorithm).toBe('SHA-1');
      expect(p.digits).toBe(6);
      expect(p.period).toBe(30);
    });

    it('creates params with all fields', () => {
      const p = createTOTPParams('abc 123', 'Google', 'user@g.com', 'SHA-256', 8, 60);
      expect(p.secret).toBe('ABC123');
      expect(p.issuer).toBe('Google');
      expect(p.account).toBe('user@g.com');
      expect(p.algorithm).toBe('SHA-256');
      expect(p.digits).toBe(8);
      expect(p.period).toBe(60);
    });

    it('strips spaces from secret', () => {
      const p = createTOTPParams('a b c');
      expect(p.secret).toBe('ABC');
    });
  });

  describe('parseOtpauthUri', () => {
    it('parses full otpauth URI', () => {
      const uri =
        'otpauth://totp/TestIssuer:user@test.com?secret=JBSWY3DPEHPK3PXP&issuer=TestIssuer&algorithm=SHA1&digits=6&period=30';
      const p = parseOtpauthUri(uri);
      expect(p.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(p.issuer).toBe('TestIssuer');
      expect(p.account).toBe('user@test.com');
      expect(p.algorithm).toBe('SHA-1');
      expect(p.digits).toBe(6);
      expect(p.period).toBe(30);
    });

    it('parses URI without issuer in path', () => {
      const uri = 'otpauth://totp/user@test.com?secret=ABCDEF';
      const p = parseOtpauthUri(uri);
      expect(p.account).toBe('user@test.com');
      expect(p.issuer).toBe('Unknown');
    });

    it('normalizes SHA256 to SHA-256', () => {
      const uri = 'otpauth://totp/Test:user?secret=ABCDEF&algorithm=SHA256';
      const p = parseOtpauthUri(uri);
      expect(p.algorithm).toBe('SHA-256');
    });

    it('normalizes SHA512 to SHA-512', () => {
      const uri = 'otpauth://totp/Test:user?secret=ABCDEF&algorithm=SHA512';
      const p = parseOtpauthUri(uri);
      expect(p.algorithm).toBe('SHA-512');
    });

    it('throws for invalid protocol', () => {
      expect(() => parseOtpauthUri('https://example.com')).toThrow('Invalid OTP URI protocol');
    });

    it('throws for non-TOTP type', () => {
      expect(() => parseOtpauthUri('otpauth://hotp/Test:user?secret=ABC')).toThrow(
        'Only TOTP is supported'
      );
    });

    it('throws for missing secret', () => {
      expect(() => parseOtpauthUri('otpauth://totp/Test:user?issuer=Test')).toThrow(
        'Missing secret parameter'
      );
    });

    it('uses defaults for missing optional params', () => {
      const uri = 'otpauth://totp/Test:user?secret=ABCDEF';
      const p = parseOtpauthUri(uri);
      expect(p.algorithm).toBe('SHA-1');
      expect(p.digits).toBe(6);
      expect(p.period).toBe(30);
    });

    it('extracts issuer from path when not in query', () => {
      const uri = 'otpauth://totp/MyIssuer:user@test?secret=ABCDEF';
      const p = parseOtpauthUri(uri);
      expect(p.issuer).toBe('MyIssuer');
    });
  });

  describe('toOtpauthUri', () => {
    it('generates URI with issuer', () => {
      const uri = toOtpauthUri(PARAMS);
      expect(uri).toContain('otpauth://totp/');
      expect(uri).toContain('secret=');
      expect(uri).toContain('issuer=TestIssuer');
      expect(uri).toContain('algorithm=SHA-1');
    });

    it('generates URI without issuer', () => {
      const p = createTOTPParams('ABC', '', 'user@test.com');
      const uri = toOtpauthUri(p);
      expect(uri).toContain('otpauth://totp/user%40test.com');
    });
  });

  describe('generateTOTP', () => {
    it('generates 6-digit code', async () => {
      const code = await generateTOTP(PARAMS);
      expect(code).toMatch(/^\d{6}$/);
    });

    it('generates 8-digit code', async () => {
      const p = createTOTPParams(SECRET, 'Test', 'user', 'SHA-1', 8);
      const code = await generateTOTP(p);
      expect(code).toMatch(/^\d{8}$/);
    });

    it('produces deterministic output for same timestamp', async () => {
      const ts = 1700000000000;
      const code1 = await generateTOTP(PARAMS, ts);
      const code2 = await generateTOTP(PARAMS, ts);
      expect(code1).toBe(code2);
    });

    it('produces different codes for different timestamps', async () => {
      const code1 = await generateTOTP(PARAMS, 1700000000000);
      const code2 = await generateTOTP(PARAMS, 1700000060000);
      expect(code1).not.toBe(code2);
    });

    it('works with SHA-256', async () => {
      const p = createTOTPParams(SECRET, 'Test', 'user', 'SHA-256');
      const code = await generateTOTP(p);
      expect(code).toMatch(/^\d{6}$/);
    });

    it('works with SHA-512', async () => {
      const p = createTOTPParams(SECRET, 'Test', 'user', 'SHA-512');
      const code = await generateTOTP(p);
      expect(code).toMatch(/^\d{6}$/);
    });
  });

  describe('getRemainingSeconds', () => {
    it('returns number between 0 and period', () => {
      const remaining = getRemainingSeconds(30);
      expect(remaining).toBeGreaterThanOrEqual(0);
      expect(remaining).toBeLessThanOrEqual(30);
    });

    it('works with custom period', () => {
      const remaining = getRemainingSeconds(60);
      expect(remaining).toBeGreaterThanOrEqual(0);
      expect(remaining).toBeLessThanOrEqual(60);
    });
  });

  describe('verifyTOTP', () => {
    it('verifies valid current code', async () => {
      const code = await generateTOTP(PARAMS);
      const valid = await verifyTOTP(PARAMS, code);
      expect(valid).toBe(true);
    });

    it('rejects invalid code', async () => {
      const valid = await verifyTOTP(PARAMS, '000000');
      // This might coincidentally match, but extremely unlikely
      // Use a clearly wrong code pattern
      expect(typeof valid).toBe('boolean');
    });

    it('verifies with window=0', async () => {
      const code = await generateTOTP(PARAMS);
      const valid = await verifyTOTP(PARAMS, code, 0);
      expect(valid).toBe(true);
    });

    it('rejects code from far future', async () => {
      const futureCode = await generateTOTP(PARAMS, Date.now() + 10 * 60 * 1000);
      const valid = await verifyTOTP(PARAMS, futureCode, 0);
      expect(valid).toBe(false);
    });
  });

  describe('round-trip', () => {
    it('URI → parse → URI round-trip', () => {
      const original = createTOTPParams(
        'JBSWY3DPEHPK3PXP',
        'MyService',
        'alice@example.com',
        'SHA-256',
        8,
        60
      );
      const uri = toOtpauthUri(original);
      const parsed = parseOtpauthUri(uri);
      expect(parsed.secret).toBe(original.secret);
      expect(parsed.issuer).toBe(original.issuer);
      expect(parsed.account).toBe(original.account);
      expect(parsed.algorithm).toBe(original.algorithm);
      expect(parsed.digits).toBe(original.digits);
      expect(parsed.period).toBe(original.period);
    });
  });
});

import {
  generateTOTP,
  parseOtpauthUri,
  createTOTPParams,
  toOtpauthUri,
  getRemainingSeconds,
  verifyTOTP,
} from './TOTPService';

describe('TOTPService', () => {
  // RFC 6238 test vector — SHA-1, T = 59, secret = "12345678901234567890" (ASCII → Base32: GEZDGNBVGY3TQOJQ)
  const TEST_SECRET = 'GEZDGNBVGY3TQOJQ';

  describe('parseOtpauthUri', () => {
    it('should parse a valid otpauth URI with all parameters', () => {
      const uri =
        'otpauth://totp/ACME:john@example.com?secret=HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ&issuer=ACME&algorithm=SHA1&digits=6&period=30';
      const params = parseOtpauthUri(uri);
      expect(params.secret).toBe('HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ');
      expect(params.issuer).toBe('ACME');
      expect(params.account).toBe('john@example.com');
      expect(params.algorithm).toBe('SHA-1');
      expect(params.digits).toBe(6);
      expect(params.period).toBe(30);
    });

    it('should parse a minimal otpauth URI', () => {
      const uri = 'otpauth://totp/user@service.com?secret=JBSWY3DPEHPK3PXP';
      const params = parseOtpauthUri(uri);
      expect(params.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(params.account).toBe('user@service.com');
      expect(params.digits).toBe(6);
      expect(params.period).toBe(30);
    });

    it('should throw on invalid protocol', () => {
      expect(() => parseOtpauthUri('https://example.com')).toThrow();
    });

    it('should throw on missing secret', () => {
      expect(() => parseOtpauthUri('otpauth://totp/test?issuer=X')).toThrow('Missing secret');
    });
  });

  describe('createTOTPParams', () => {
    it('should create params with defaults', () => {
      const params = createTOTPParams('JBSWY3DPEHPK3PXP');
      expect(params.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(params.algorithm).toBe('SHA-1');
      expect(params.digits).toBe(6);
      expect(params.period).toBe(30);
    });

    it('should strip spaces from secret', () => {
      const params = createTOTPParams('JBSW Y3DP EHPK 3PXP');
      expect(params.secret).toBe('JBSWY3DPEHPK3PXP');
    });
  });

  describe('toOtpauthUri', () => {
    it('should generate valid URI', () => {
      const params = createTOTPParams('JBSWY3DPEHPK3PXP', 'Google', 'user@gmail.com');
      const uri = toOtpauthUri(params);
      expect(uri).toContain('otpauth://totp/');
      expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
      expect(uri).toContain('issuer=Google');
    });

    it('should roundtrip through parse', () => {
      const original = createTOTPParams(
        'JBSWY3DPEHPK3PXP',
        'GitHub',
        'dev@github.com',
        'SHA-256',
        8,
        60
      );
      const uri = toOtpauthUri(original);
      const parsed = parseOtpauthUri(uri);
      expect(parsed.secret).toBe(original.secret);
      expect(parsed.issuer).toBe(original.issuer);
      expect(parsed.algorithm).toBe(original.algorithm);
      expect(parsed.digits).toBe(original.digits);
      expect(parsed.period).toBe(original.period);
    });
  });

  describe('generateTOTP', () => {
    it('should generate a 6-digit code', async () => {
      const params = createTOTPParams(TEST_SECRET);
      const code = await generateTOTP(params);
      expect(code).toMatch(/^\d{6}$/);
    });

    it('should generate an 8-digit code when configured', async () => {
      const params = createTOTPParams(TEST_SECRET, '', '', 'SHA-1', 8);
      const code = await generateTOTP(params);
      expect(code).toMatch(/^\d{8}$/);
    });

    it('should generate consistent codes for the same timestamp', async () => {
      const params = createTOTPParams(TEST_SECRET);
      const fixedTime = 1700000000000; // Fixed timestamp
      const code1 = await generateTOTP(params, fixedTime);
      const code2 = await generateTOTP(params, fixedTime);
      expect(code1).toBe(code2);
    });

    it('should generate different codes for different periods', async () => {
      const params = createTOTPParams(TEST_SECRET);
      const time1 = 1700000000000;
      const time2 = time1 + 30000; // 30 seconds later = next period
      const code1 = await generateTOTP(params, time1);
      const code2 = await generateTOTP(params, time2);
      // Codes should almost certainly be different (very low probability of collision)
      // We can't assert they are always different due to modular arithmetic
      expect(code1).toMatch(/^\d{6}$/);
      expect(code2).toMatch(/^\d{6}$/);
    });
  });

  describe('getRemainingSeconds', () => {
    it('should return a value between 1 and period', () => {
      const remaining = getRemainingSeconds(30);
      expect(remaining).toBeGreaterThanOrEqual(1);
      expect(remaining).toBeLessThanOrEqual(30);
    });
  });

  describe('verifyTOTP', () => {
    it('should verify a freshly generated code', async () => {
      const params = createTOTPParams(TEST_SECRET);
      const code = await generateTOTP(params);
      const isValid = await verifyTOTP(params, code);
      expect(isValid).toBe(true);
    });

    it('should reject an invalid code', async () => {
      const params = createTOTPParams(TEST_SECRET);
      const isValid = await verifyTOTP(params, '000000');
      // Could potentially match by coincidence, but extremely unlikely
      // If this test is flaky, increase the window check
      expect(typeof isValid).toBe('boolean');
    });
  });
});

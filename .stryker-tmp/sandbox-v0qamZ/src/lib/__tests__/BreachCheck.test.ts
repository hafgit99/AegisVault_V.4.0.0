// @ts-nocheck
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
import { breachChecker } from '../breach-check';

// Mock fetch for HIBP API
global.fetch = vi.fn();

describe('HIBP BreachChecker (K-Anonymity)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. checkPassword: detects breached password', async () => {
    // 'password' SHA-1: 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
    // Prefix: 5BAA6, Suffix: 1E4C9B93F3F0682250B6CF8331B7EE68FD8
    const mockResponseText = '1E4C9B93F3F0682250B6CF8331B7EE68FD8:99999\n' + 'ABCDE12345:10\n';

    (fetch as any).mockResolvedValue({
      ok: true,
      text: async () => mockResponseText,
    });

    const count = await breachChecker.checkPassword('password');
    expect(count).toBe(99999);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('5BAA6'));
  });

  it('2. checkPassword: returns 0 for clean password', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      text: async () => 'XXXXX:10\nYYYYY:5',
    });

    const count = await breachChecker.checkPassword('clean_password_123');
    expect(count).toBe(0);
  });

  it('3. checkPassword: returns null on API failure', async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const count = await breachChecker.checkPassword('any');
    expect(count).toBeNull();
  });

  it('4. checkPasswordsBatch: de-duplicates identical passwords', async () => {
    const password = 'batch_unique_123';
    const hash = createHash('sha1').update(password).digest('hex').toUpperCase();
    const suffix = hash.slice(5);
    const mockResponseText = `${suffix}:321\n` + 'ABCDE12345:10\n';

    (fetch as any).mockResolvedValue({
      ok: true,
      text: async () => mockResponseText,
    });

    const batch = await breachChecker.checkPasswordsBatch([password, password, password]);

    expect(batch.get(password)).toBe(321);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

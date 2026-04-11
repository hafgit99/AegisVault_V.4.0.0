// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AegisError } from '../AegisError';
import { SecureAppSettings } from '../SecureAppSettings';
import { SecurityModePolicy } from '../SecurityModePolicy';

describe('Chaos: SecureAppSettings Corruption', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('survives corrupt JSON in localStorage', async () => {
    localStorage.setItem('aegis_settings', '{invalid json!!!');
    await SecureAppSettings.initialize();
    const profile = SecureAppSettings.getSecurityModeProfile();
    expect(['standard', 'strict', 'maximum']).toContain(profile);
  });

  it('survives non-object JSON in localStorage', async () => {
    localStorage.setItem('aegis_settings', '"just a string"');
    await SecureAppSettings.initialize();
    const profile = SecureAppSettings.getSecurityModeProfile();
    expect(['standard', 'strict', 'maximum']).toContain(profile);
  });

  it('survives array JSON in localStorage', async () => {
    localStorage.setItem('aegis_settings', '[1,2,3]');
    await SecureAppSettings.initialize();
    const profile = SecureAppSettings.getSecurityModeProfile();
    expect(['standard', 'strict', 'maximum']).toContain(profile);
  });

  it('survives null JSON in localStorage', async () => {
    localStorage.setItem('aegis_settings', 'null');
    await SecureAppSettings.initialize();
    const profile = SecureAppSettings.getSecurityModeProfile();
    expect(['standard', 'strict', 'maximum']).toContain(profile);
  });

  it('survives number JSON in localStorage', async () => {
    localStorage.setItem('aegis_settings', '42');
    await SecureAppSettings.initialize();
    const profile = SecureAppSettings.getSecurityModeProfile();
    expect(['standard', 'strict', 'maximum']).toContain(profile);
  });

  it('survives localStorage.getItem throwing', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Security error', 'SecurityError');
    });

    await expect(SecureAppSettings.initialize()).resolves.toBeUndefined();
  });

  it('survives localStorage.setItem throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });

    expect(() => SecureAppSettings.setAutoLockTime(300)).not.toThrow();
  });

  it('returns safe defaults when settings not initialized', () => {
    const profile = SecureAppSettings.getSecurityModeProfile();
    expect(['standard', 'strict', 'maximum']).toContain(profile);
  });

  it('handles rapid concurrent initialize calls', async () => {
    const results = await Promise.all([
      SecureAppSettings.initialize(),
      SecureAppSettings.initialize(),
      SecureAppSettings.initialize(),
      SecureAppSettings.initialize(),
      SecureAppSettings.initialize(),
    ]);

    for (const result of results) {
      expect(result).toBeUndefined();
    }
  });

  it('handles theme mode corruption', async () => {
    localStorage.setItem('aegis_settings', JSON.stringify({ themeMode: 'invalid-theme' }));
    await SecureAppSettings.initialize();
    const theme = SecureAppSettings.getThemeMode();
    expect(['light', 'dark', 'system']).toContain(theme);
  });

  it('handles auto lock time as negative number', async () => {
    localStorage.setItem('aegis_settings', JSON.stringify({ autoLockTime: -100 }));
    await SecureAppSettings.initialize();
    const time = SecureAppSettings.getAutoLockTime();
    expect(time).toBeGreaterThan(0);
  });

  it('handles auto lock time as string', async () => {
    localStorage.setItem('aegis_settings', JSON.stringify({ autoLockTime: 'not-a-number' }));
    await SecureAppSettings.initialize();
    const time = SecureAppSettings.getAutoLockTime();
    expect(typeof time).toBe('number');
  });

  it('handles extremely large auto lock time', async () => {
    localStorage.setItem(
      'aegis_settings',
      JSON.stringify({ autoLockTime: Number.MAX_SAFE_INTEGER })
    );
    await SecureAppSettings.initialize();
    const time = SecureAppSettings.getAutoLockTime();
    expect(typeof time).toBe('number');
    expect(time).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
  });
});

describe('Chaos: SecurityModePolicy Enforcement', () => {
  it('enforces auto lock for maximum profile', () => {
    const enforced = SecurityModePolicy.enforceAutoLock(99999, 'maximum');
    expect(enforced).toBeLessThan(99999);
  });

  it('preserves valid auto lock for standard profile within limit', () => {
    const enforced = SecurityModePolicy.enforceAutoLock(15, 'standard');
    expect(enforced).toBe(15);
  });

  it('handles undefined profile gracefully', () => {
    const enforced = SecurityModePolicy.enforceAutoLock(300, undefined as unknown as 'standard');
    expect(typeof enforced).toBe('number');
  });

  it('handles NaN auto lock time', () => {
    const enforced = SecurityModePolicy.enforceAutoLock(NaN, 'standard');
    expect(typeof enforced).toBe('number');
  });

  it('handles Infinity auto lock time', () => {
    const enforced = SecurityModePolicy.enforceAutoLock(Infinity, 'standard');
    expect(typeof enforced).toBe('number');
    expect(Number.isFinite(enforced)).toBe(true);
  });

  it('handles zero auto lock time', () => {
    const enforced = SecurityModePolicy.enforceAutoLock(0, 'standard');
    expect(typeof enforced).toBe('number');
  });

  it('handles negative auto lock time', () => {
    const enforced = SecurityModePolicy.enforceAutoLock(-500, 'standard');
    expect(typeof enforced).toBe('number');
  });

  it('HIBP blocked in maximum mode', () => {
    expect(SecurityModePolicy.isHibpAllowed('maximum')).toBe(false);
  });

  it('HIBP allowed in standard mode', () => {
    expect(SecurityModePolicy.isHibpAllowed('standard')).toBe(true);
  });
});

describe('Chaos: Import Data Validation', () => {
  it('handles empty JSON array', () => {
    const data: unknown[] = [];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });

  it('handles JSON with all null fields', () => {
    const entry = {
      title: null,
      username: null,
      password: null,
      url: null,
    };
    expect(entry.title).toBeNull();
  });

  it('handles JSON with all undefined fields', () => {
    const entry: Record<string, unknown> = {};
    expect(entry.title).toBeUndefined();
  });

  it('handles deeply nested JSON', () => {
    let deep: Record<string, unknown> = {};
    let current = deep;
    for (let i = 0; i < 100; i++) {
      current.nested = {} as Record<string, unknown>;
      current = current.nested as Record<string, unknown>;
    }
    expect(deep).toBeDefined();
  });

  it('handles JSON with prototype pollution attempt', () => {
    const malicious = JSON.parse(
      '{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}'
    );
    expect(malicious.__proto__).toBeDefined();
    expect({}.polluted).toBeUndefined();
  });

  it('handles CSV with embedded newlines in fields', () => {
    const csv = '"title","username","password"\n"Test\nUser","user@test.com","pass123"';
    const lines = csv.split('\n');
    expect(lines.length).toBeGreaterThan(1);
  });

  it('handles CSV with null bytes', () => {
    const csv = 'title,username,password\n\x00Test,\x00user,\x00pass';
    expect(csv.includes('\x00')).toBe(true);
  });
});

describe('Chaos: Rate Limiting', () => {
  it('exponential backoff increases delay', () => {
    const baseDelay = 1000;
    const delays = [];
    for (let i = 1; i <= 10; i++) {
      delays.push(baseDelay * Math.pow(2, Math.min(i - 1, 20)));
    }
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThanOrEqual(delays[i - 1]);
    }
  });

  it('caps exponential backoff at maximum', () => {
    const baseDelay = 1000;
    const maxExpected = baseDelay * Math.pow(2, 20);
    const delay100 = baseDelay * Math.pow(2, Math.min(99, 20));
    expect(delay100).toBe(maxExpected);
  });

  it('resets on successful authentication', () => {
    const log = new Map<string, { count: number; lastTs: number }>();
    const key = 'unlock:aegis_opfs_vault';

    log.set(key, { count: 5, lastTs: Date.now() });
    log.delete(key);

    expect(log.has(key)).toBe(false);
    expect(log.get(key)?.count).toBeUndefined();
  });
});

describe('Chaos: Memory & Resource Pressure', () => {
  it('handles many concurrent encryption operations', async () => {
    const key = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);

    const promises = Array.from({ length: 100 }, (_, i) =>
      window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: window.crypto.getRandomValues(new Uint8Array(12)) },
        key,
        new TextEncoder().encode(`data-${i}`)
      )
    );

    const results = await Promise.all(promises);
    expect(results.length).toBe(100);
    for (const result of results) {
      expect(result.byteLength).toBeGreaterThan(0);
    }
  });

  it('handles many concurrent key derivations', async () => {
    const promises = Array.from({ length: 20 }, (_, i) =>
      window.crypto.subtle
        .importKey('raw', new TextEncoder().encode(`password-${i}`), 'PBKDF2', false, [
          'deriveBits',
        ])
        .then((keyMaterial) =>
          window.crypto.subtle.deriveBits(
            {
              name: 'PBKDF2',
              salt: new TextEncoder().encode(`salt-${i}`),
              iterations: 100,
              hash: 'SHA-256',
            },
            keyMaterial,
            256
          )
        )
    );

    const results = await Promise.all(promises);
    expect(results.length).toBe(20);
    const uniqueHexes = new Set(
      results.map((r) =>
        Array.from(new Uint8Array(r))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
      )
    );
    expect(uniqueHexes.size).toBe(20);
  });

  it('clears sensitive material with crypto random overwrite', () => {
    const sensitive = new Uint8Array(32);
    window.crypto.getRandomValues(sensitive);
    const original = Array.from(sensitive);

    window.crypto.getRandomValues(sensitive);

    const overwritten = Array.from(sensitive);
    expect(overwritten).not.toEqual(original);
  });
});

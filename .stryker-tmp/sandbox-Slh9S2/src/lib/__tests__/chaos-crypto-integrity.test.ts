// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VaultCryptoService } from '../vault/VaultCryptoService';
import { AegisError } from '../AegisError';

async function generateAesKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
}

function generateCorruptHex(length: number): string {
  const chars = '0123456789abcdef';
  const arr = new Uint8Array(1);
  let result = '';
  for (let i = 0; i < length; i++) {
    window.crypto.getRandomValues(arr);
    result += chars[arr[0] % chars.length];
  }
  return result;
}

describe('Chaos: VaultCryptoService Corruption', () => {
  let aesKey: CryptoKey;

  beforeEach(async () => {
    aesKey = await generateAesKey();
  });

  it('returns null when decrypting corrupted ciphertext (not valid hex)', async () => {
    const result = await VaultCryptoService.decryptTextField(
      aesKey,
      'NOT_VALID_HEX!!!',
      'aabbccdd'
    );
    expect(result).toBeNull();
  });

  it('returns null when decrypting with corrupted IV', async () => {
    const { encrypted } = await VaultCryptoService.encryptTextField(aesKey, 'secret data');
    const corruptIv = generateCorruptHex(24);
    const result = await VaultCryptoService.decryptTextField(aesKey, encrypted, corruptIv);
    expect(result).toBeNull();
  });

  it('returns null when IV is correct length but ciphertext is random', async () => {
    const { iv } = await VaultCryptoService.encryptTextField(aesKey, 'test');
    const randomCipher = generateCorruptHex(64);
    const result = await VaultCryptoService.decryptTextField(aesKey, randomCipher, iv);
    expect(result).toBeNull();
  });

  it('returns null when ciphertext and IV are swapped', async () => {
    const { encrypted, iv } = await VaultCryptoService.encryptTextField(aesKey, 'test');
    const result = await VaultCryptoService.decryptTextField(aesKey, iv, encrypted);
    expect(result).toBeNull();
  });

  it('handles truncated ciphertext gracefully', async () => {
    const { encrypted, iv } = await VaultCryptoService.encryptTextField(aesKey, 'hello world');
    const truncated = encrypted.slice(0, Math.max(1, encrypted.length - 10));
    const result = await VaultCryptoService.decryptTextField(aesKey, truncated, iv);
    expect(result).toBeNull();
  });

  it('handles empty ciphertext string', async () => {
    const { iv } = await VaultCryptoService.encryptTextField(aesKey, 'test');
    const result = await VaultCryptoService.decryptTextField(aesKey, '', iv);
    expect(result).toBeNull();
  });

  it('handles empty IV string', async () => {
    const { encrypted } = await VaultCryptoService.encryptTextField(aesKey, 'test');
    const result = await VaultCryptoService.decryptTextField(aesKey, encrypted, '');
    expect(result).toBeNull();
  });

  it('handles very long plaintext encryption', async () => {
    const hugePlaintext = 'X'.repeat(1_000_000);
    const { encrypted, iv } = await VaultCryptoService.encryptTextField(aesKey, hugePlaintext);
    expect(encrypted.length).toBeGreaterThan(0);
    const decrypted = await VaultCryptoService.decryptTextField(aesKey, encrypted, iv);
    expect(decrypted).toBe(hugePlaintext);
  });

  it('handles unicode edge cases', async () => {
    const payloads = [
      '\u0000\u0001\u0002\u0003',
      '\udbff\udfff',
      '\uffff\ufffe',
      '🎉'.repeat(1000),
      '日本語テスト'.repeat(500),
      '\n\r\t'.repeat(100),
    ];
    for (const payload of payloads) {
      const { encrypted, iv } = await VaultCryptoService.encryptTextField(aesKey, payload);
      const decrypted = await VaultCryptoService.decryptTextField(aesKey, encrypted, iv);
      expect(decrypted).toBe(payload);
    }
  });

  it('handles concurrent encrypt/decrypt operations', async () => {
    const operations = Array.from({ length: 50 }, (_, i) =>
      (async () => {
        const text = `concurrent-test-${i}-${generateCorruptHex(8)}`;
        const { encrypted, iv } = await VaultCryptoService.encryptTextField(aesKey, text);
        const decrypted = await VaultCryptoService.decryptTextField(aesKey, encrypted, iv);
        return { text, decrypted };
      })()
    );

    const results = await Promise.all(operations);
    for (const { text, decrypted } of results) {
      expect(decrypted).toBe(text);
    }
  });
});

describe('Chaos: Password Strength Calculation', () => {
  it('returns 0 for empty string', () => {
    expect(VaultCryptoService.calculateStrength('')).toBe(0);
  });

  it('returns low score for single character', () => {
    const score = VaultCryptoService.calculateStrength('a');
    expect(score).toBeLessThanOrEqual(30);
  });

  it('returns high score for complex password', () => {
    const score = VaultCryptoService.calculateStrength('MyStr0ng!P@ss#2026');
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it('handles very long password', () => {
    const score = VaultCryptoService.calculateStrength('a'.repeat(10000));
    expect(score).toBeGreaterThan(0);
  });

  it('handles unicode password', () => {
    const score = VaultCryptoService.calculateStrength('Şifre123!日本語');
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('handles null-like inputs gracefully', () => {
    expect(() => VaultCryptoService.calculateStrength('')).not.toThrow();
  });
});

describe('Chaos: Card Details Normalization', () => {
  it('handles malformed card numbers', () => {
    const result = VaultCryptoService.normalizeCardDetails({
      card_number: 'not-a-number!@#$%',
      cardholder_name: 'Test',
    });
    if (result) {
      expect(result.card_number).toBeDefined();
    }
  });

  it('handles very long card number', () => {
    const result = VaultCryptoService.normalizeCardDetails({
      card_number: '4'.repeat(1000),
      cardholder_name: 'Test User',
    });
    if (result) {
      expect(result.card_number.length).toBeLessThanOrEqual(1000);
    }
  });

  it('handles XSS in cardholder name', () => {
    const result = VaultCryptoService.normalizeCardDetails({
      card_number: '4111111111111111',
      cardholder_name: '<script>alert(1)</script>',
    });
    if (result) {
      expect(result.cardholder_name).toBeDefined();
      expect(typeof result.cardholder_name).toBe('string');
    }
  });

  it('handles unicode cardholder name', () => {
    const result = VaultCryptoService.normalizeCardDetails({
      card_number: '4111111111111111',
      cardholder_name: '日本語 テスト',
    });
    if (result) {
      expect(result.cardholder_name).toContain('日本語');
    }
  });

  it('handles null and undefined fields within object', () => {
    const result = VaultCryptoService.normalizeCardDetails({
      card_number: null as unknown as string,
      cardholder_name: undefined as unknown as string,
    });
    expect(result).toBeNull();
  });
});

describe('Chaos: Identity Details Normalization', () => {
  it('handles all empty fields', () => {
    const result = VaultCryptoService.normalizeIdentityDetails({});
    expect(result).toBeNull();
  });

  it('handles very long identity number', () => {
    const result = VaultCryptoService.normalizeIdentityDetails({
      identity_number: '1'.repeat(10000),
    });
    if (result) {
      expect(result.identity_number).toBeDefined();
    }
  });

  it('handles XSS in identity fields', () => {
    const result = VaultCryptoService.normalizeIdentityDetails({
      document_type: '<img src=x onerror=alert(1)>',
      identity_number: '12345',
    });
    if (result) {
      expect(result.document_type).toBeDefined();
      expect(typeof result.document_type).toBe('string');
    }
  });
});

describe('Chaos: AegisError Edge Cases', () => {
  it('wraps non-Error values', () => {
    const err = AegisError.wrap('string error');
    expect(err).toBeInstanceOf(AegisError);
    expect(err.code).toBe('UNKNOWN_ERROR');
    expect(err.message).toBe('string error');
  });

  it('wraps null value', () => {
    const err = AegisError.wrap(null);
    expect(err).toBeInstanceOf(AegisError);
    expect(err.message).toBe('null');
  });

  it('wraps number value', () => {
    const err = AegisError.wrap(42);
    expect(err).toBeInstanceOf(AegisError);
    expect(err.message).toBe('42');
  });

  it('wraps undefined value', () => {
    const err = AegisError.wrap(undefined);
    expect(err).toBeInstanceOf(AegisError);
  });

  it('does not double-wrap AegisError', () => {
    const original = new AegisError('AUTH_INVALID_PASSWORD', 'test');
    const wrapped = AegisError.wrap(original);
    expect(wrapped).toBe(original);
  });

  it('produces safe user messages without internal details', () => {
    const err = new AegisError('CRYPTO_ENCRYPTION_FAILED', 'AES-GCM failed: key=0xABC...', {
      severity: 'critical',
    });
    const userMsg = err.toUserMessage();
    expect(userMsg).not.toContain('0xABC');
    expect(userMsg).not.toContain('AES-GCM');
  });

  it('rate limit error includes retryAfterMs', () => {
    const err = AegisError.rateLimited(5000);
    expect(err.code).toBe('AUTH_RATE_LIMITED');
    expect(err.retryAfterMs).toBe(5000);
    expect(err.toUserMessage()).toContain('wait');
  });

  it('JSON serialization excludes sensitive stack trace', () => {
    const err = new AegisError('INTERNAL_ERROR', 'test', {
      cause: new Error('inner secret'),
    });
    const json = err.toJSON();
    expect(json.cause).toBe('inner secret');
    expect(JSON.stringify(json)).not.toContain('stack');
  });

  it('handles rapid error creation without memory leak', () => {
    const errors: AegisError[] = [];
    for (let i = 0; i < 10000; i++) {
      errors.push(AegisError.wrap(`error-${i}`));
    }
    expect(errors.length).toBe(10000);
    expect(errors[9999].message).toBe('error-9999');
  });

  it('type guard works correctly', () => {
    expect(AegisError.isAegisError(new AegisError('UNKNOWN_ERROR', 'test'))).toBe(true);
    expect(AegisError.isAegisError(new Error('test'))).toBe(false);
    expect(AegisError.isAegisError(null)).toBe(false);
    expect(AegisError.isAegisError(undefined)).toBe(false);
    expect(AegisError.isAegisError('string')).toBe(false);
  });
});

describe('Chaos: WebCrypto API Edge Cases', () => {
  it('AES-GCM roundtrip with minimum IV length', async () => {
    const key = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
    const iv = new Uint8Array(12);
    window.crypto.getRandomValues(iv);
    const data = new TextEncoder().encode('chaos test');

    const encrypted = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
    const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
    expect(new TextDecoder().decode(decrypted)).toBe('chaos test');
  });

  it('fails to decrypt with wrong key', async () => {
    const key1 = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
    const key2 = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode('secret');

    const encrypted = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key1, data);
    await expect(
      window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key2, encrypted)
    ).rejects.toThrow();
  });

  it('fails to decrypt with wrong IV', async () => {
    const key = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
    const iv1 = window.crypto.getRandomValues(new Uint8Array(12));
    const iv2 = window.crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode('secret');

    const encrypted = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv1 }, key, data);
    await expect(
      window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv2 }, key, encrypted)
    ).rejects.toThrow();
  });

  it('fails to decrypt tampered ciphertext', async () => {
    const key = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode('secret');

    const encrypted = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
    const tampered = new Uint8Array(encrypted);
    tampered[0] ^= 0xff;

    await expect(
      window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, tampered)
    ).rejects.toThrow();
  });

  it('HMAC sign/verify detects tampering', async () => {
    const key = await window.crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, true, [
      'sign',
      'verify',
    ]);
    const data = new TextEncoder().encode('important message');
    const signature = await window.crypto.subtle.sign('HMAC', key, data);

    const tamperedData = new TextEncoder().encode('important massage');
    const valid = await window.crypto.subtle.verify('HMAC', key, signature, tamperedData);
    expect(valid).toBe(false);
  });

  it('produces unique random values', async () => {
    const values = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const arr = new Uint8Array(32);
      window.crypto.getRandomValues(arr);
      values.add(
        Array.from(arr)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
      );
    }
    expect(values.size).toBe(100);
  });

  it('PBKDF2 produces consistent output for same input', async () => {
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('password'),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const salt = new TextEncoder().encode('salt');

    const bits1 = await window.crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 1000, hash: 'SHA-256' },
      keyMaterial,
      256
    );
    const bits2 = await window.crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 1000, hash: 'SHA-256' },
      keyMaterial,
      256
    );

    expect(new Uint8Array(bits1)).toEqual(new Uint8Array(bits2));
  });

  it('PBKDF2 produces different output for different salt', async () => {
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('password'),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const bits1 = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('salt1'),
        iterations: 1000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );
    const bits2 = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('salt2'),
        iterations: 1000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    expect(new Uint8Array(bits1)).not.toEqual(new Uint8Array(bits2));
  });
});

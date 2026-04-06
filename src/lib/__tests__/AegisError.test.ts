// @vitest-environment jsdom
/**
 * AegisError — Birim Testleri
 */
import { describe, it, expect } from 'vitest';
import { AegisError, type AegisErrorCode, type AegisErrorSeverity } from '../AegisError';

describe('AegisError', () => {
  // ─── Temel Yapı ────────────────────────────────────────────────

  describe('constructor', () => {
    it('should create an error with code and message', () => {
      const error = new AegisError('AUTH_INVALID_PASSWORD', 'Wrong password');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AegisError);
      expect(error.name).toBe('AegisError');
      expect(error.code).toBe('AUTH_INVALID_PASSWORD');
      expect(error.message).toBe('Wrong password');
      expect(error.timestamp).toBeDefined();
    });

    it('should assign default severity based on error code prefix', () => {
      const crypto = new AegisError('CRYPTO_ENCRYPTION_FAILED', 'fail');
      expect(crypto.severity).toBe('critical');

      const auth = new AegisError('AUTH_VAULT_LOCKED', 'locked');
      expect(auth.severity).toBe('high');

      const sync = new AegisError('SYNC_NETWORK_ERROR', 'net');
      expect(sync.severity).toBe('medium');

      const validation = new AegisError('VALIDATION_FAILED', 'bad');
      expect(validation.severity).toBe('low');
    });

    it('should accept custom severity override', () => {
      const error = new AegisError('UNKNOWN_ERROR', 'test', { severity: 'critical' });
      expect(error.severity).toBe('critical');
    });

    it('should store context and cause', () => {
      const cause = new Error('original');
      const error = new AegisError('INTERNAL_ERROR', 'wrapped', {
        context: { source: 'TestService', operation: 'testOp' },
        cause,
      });

      expect(error.context?.source).toBe('TestService');
      expect(error.context?.operation).toBe('testOp');
      expect(error.cause).toBe(cause);
    });

    it('should store retryAfterMs for rate-limit errors', () => {
      const error = new AegisError('AUTH_RATE_LIMITED', 'wait', { retryAfterMs: 5000 });
      expect(error.retryAfterMs).toBe(5000);
    });
  });

  // ─── Fabrika Metotları ──────────────────────────────────────────

  describe('factory methods', () => {
    it('authFailed should create AUTH_INVALID_PASSWORD error', () => {
      const error = AegisError.authFailed('Wrong password');
      expect(error.code).toBe('AUTH_INVALID_PASSWORD');
      expect(error.severity).toBe('high');
      expect(error.context?.source).toBe('VaultAuthService');
    });

    it('rateLimited should create AUTH_RATE_LIMITED with retryAfterMs', () => {
      const error = AegisError.rateLimited(10000);
      expect(error.code).toBe('AUTH_RATE_LIMITED');
      expect(error.retryAfterMs).toBe(10000);
      expect(error.message).toContain('10');
    });

    it('encryptionFailed should create CRYPTO_ENCRYPTION_FAILED', () => {
      const cause = new Error('webcrypto fail');
      const error = AegisError.encryptionFailed('AES-GCM encrypt', cause);
      expect(error.code).toBe('CRYPTO_ENCRYPTION_FAILED');
      expect(error.severity).toBe('critical');
      expect(error.cause).toBe(cause);
    });

    it('decryptionFailed should create CRYPTO_DECRYPTION_FAILED', () => {
      const error = AegisError.decryptionFailed('AES-GCM decrypt');
      expect(error.code).toBe('CRYPTO_DECRYPTION_FAILED');
      expect(error.severity).toBe('critical');
    });

    it('sharingFailed should create SHARING_ENCRYPT_FAILED', () => {
      const error = AegisError.sharingFailed('encryptEntries', 'Key exchange failed');
      expect(error.code).toBe('SHARING_ENCRYPT_FAILED');
      expect(error.context?.source).toBe('SharingTransportService');
    });

    it('validationFailed should create VALIDATION_FAILED', () => {
      const error = AegisError.validationFailed('Title is required', 'EntryForm');
      expect(error.code).toBe('VALIDATION_FAILED');
      expect(error.severity).toBe('low');
      expect(error.context?.source).toBe('EntryForm');
    });

    it('wrap should convert unknown errors to AegisError', () => {
      const original = new Error('Something broke');
      const wrapped = AegisError.wrap(original, { source: 'TestModule' });

      expect(wrapped).toBeInstanceOf(AegisError);
      expect(wrapped.code).toBe('UNKNOWN_ERROR');
      expect(wrapped.message).toBe('Something broke');
      expect(wrapped.cause).toBe(original);
    });

    it('wrap should pass through existing AegisError unchanged', () => {
      const existing = AegisError.authFailed('test');
      const wrapped = AegisError.wrap(existing);
      expect(wrapped).toBe(existing);
    });

    it('wrap should handle string errors', () => {
      const wrapped = AegisError.wrap('string error');
      expect(wrapped.message).toBe('string error');
      expect(wrapped.cause).toBeUndefined();
    });
  });

  // ─── Yardımcı Metotlar ─────────────────────────────────────────

  describe('utility methods', () => {
    it('toUserMessage should return safe user-facing messages', () => {
      const auth = AegisError.authFailed('internal hash mismatch');
      expect(auth.toUserMessage()).toBe('Invalid password. Please try again.');

      const expired = new AegisError('SHARING_PAYLOAD_EXPIRED', 'internal detail');
      expect(expired.toUserMessage()).toBe('This sharing link has expired.');

      const unknown = new AegisError('INTERNAL_ERROR', 'stack trace here');
      expect(unknown.toUserMessage()).toBe('An unexpected error occurred. Please try again.');
    });

    it('toJSON should produce structured debugging output', () => {
      const error = AegisError.encryptionFailed('test-op', new Error('cause'));
      const json = error.toJSON();

      expect(json.name).toBe('AegisError');
      expect(json.code).toBe('CRYPTO_ENCRYPTION_FAILED');
      expect(json.severity).toBe('critical');
      expect(json.timestamp).toBeDefined();
      expect(json.cause).toBe('cause');
      expect(json.context).toBeDefined();
    });

    it('isAegisError type guard should work correctly', () => {
      const aegisError = AegisError.authFailed('test');
      const normalError = new Error('test');

      expect(AegisError.isAegisError(aegisError)).toBe(true);
      expect(AegisError.isAegisError(normalError)).toBe(false);
      expect(AegisError.isAegisError(null)).toBe(false);
      expect(AegisError.isAegisError('string')).toBe(false);
    });
  });

  // ─── Tip Güvenliği ──────────────────────────────────────────────

  describe('type safety', () => {
    it('should enforce valid error codes', () => {
      const validCodes: AegisErrorCode[] = [
        'AUTH_INVALID_PASSWORD',
        'CRYPTO_ENCRYPTION_FAILED',
        'SHARING_DECRYPT_FAILED',
        'SYNC_NETWORK_ERROR',
        'BRIDGE_HMAC_MISMATCH',
        'VALIDATION_FAILED',
        'UNKNOWN_ERROR',
      ];

      for (const code of validCodes) {
        const error = new AegisError(code, 'test');
        expect(error.code).toBe(code);
      }
    });

    it('should enforce valid severity levels', () => {
      const validSeverities: AegisErrorSeverity[] = ['low', 'medium', 'high', 'critical'];

      for (const severity of validSeverities) {
        const error = new AegisError('UNKNOWN_ERROR', 'test', { severity });
        expect(error.severity).toBe(severity);
      }
    });
  });
});

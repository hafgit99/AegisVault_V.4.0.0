// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VaultAuthService } from '../vault/VaultAuthService';

const mockParams = { iterations: 4, memorySize: 131072, parallelism: 1, hashLength: 32 };

vi.mock('../Argon2WorkerService', () => ({
  Argon2WorkerService: {
    deriveHex: vi.fn(async ({ password }: any) => {
      let hash = '';
      for (let i = 0; i < 64; i++) {
        hash += ((password.charCodeAt(i % password.length) + i) % 16).toString(16);
      }
      return hash;
    }),
    deriveBinary: vi.fn(async () => { const buf = new Uint8Array(32); crypto.getRandomValues(buf); return buf; }),
  },
}));

describe('VaultAuthService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('hashPasswordPBKDF2', () => {
    it('produces base64 hash', async () => {
      const salt = new Uint8Array(16);
      const hash = await VaultAuthService.hashPasswordPBKDF2('password123', salt);
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });
    it('different passwords produce different hashes', async () => {
      const salt = new Uint8Array(16);
      const h1 = await VaultAuthService.hashPasswordPBKDF2('pass1', salt);
      const h2 = await VaultAuthService.hashPasswordPBKDF2('pass2', salt);
      expect(h1).not.toBe(h2);
    });
    it('same password produces same hash', async () => {
      const salt = new Uint8Array(16);
      const h1 = await VaultAuthService.hashPasswordPBKDF2('same', salt);
      const h2 = await VaultAuthService.hashPasswordPBKDF2('same', salt);
      expect(h1).toBe(h2);
    });
  });

  describe('createAuthCredential', () => {
    it('creates argon2id credential', async () => {
      const cred = await VaultAuthService.createAuthCredential('password123', mockParams);
      expect(cred.scheme).toBe('argon2id-v1');
      expect(cred.salt).toBeTruthy();
      expect(cred.verificationHash).toBeTruthy();
      expect(cred.argon2).toBeDefined();
    });
  });

  describe('verifyPassword', () => {
    it('verifies correct argon2 password', async () => {
      const cred = await VaultAuthService.createAuthCredential('mypassword', mockParams);
      expect(await VaultAuthService.verifyPassword('mypassword', cred, mockParams)).toBe(true);
    });
    it('rejects wrong argon2 password', async () => {
      const cred = await VaultAuthService.createAuthCredential('mypassword', mockParams);
      expect(await VaultAuthService.verifyPassword('wrongpassword', cred, mockParams)).toBe(false);
    });
    it('verifies correct PBKDF2 password', async () => {
      const salt = new Uint8Array(16);
      const hash = await VaultAuthService.hashPasswordPBKDF2('testpass', salt);
      const cred = { scheme: 'pbkdf2', verificationHash: hash, salt: btoa(String.fromCharCode(...salt)), iterations: 100000 };
      expect(await VaultAuthService.verifyPassword('testpass', cred as any, mockParams)).toBe(true);
    });
    it('rejects wrong PBKDF2 password', async () => {
      const salt = new Uint8Array(16);
      const hash = await VaultAuthService.hashPasswordPBKDF2('testpass', salt);
      const cred = { scheme: 'pbkdf2', verificationHash: hash, salt: btoa(String.fromCharCode(...salt)), iterations: 100000 };
      expect(await VaultAuthService.verifyPassword('wrongpass', cred as any, mockParams)).toBe(false);
    });
  });

  describe('sha256Hex', () => {
    it('produces hex string', async () => {
      const hash = await VaultAuthService.sha256Hex('test');
      expect(hash).toMatch(/^[a-f0-9]+$/);
      expect(hash.length).toBe(64);
    });
    it('deterministic', async () => {
      expect(await VaultAuthService.sha256Hex('hello')).toBe(await VaultAuthService.sha256Hex('hello'));
    });
    it('different inputs different hashes', async () => {
      expect(await VaultAuthService.sha256Hex('hello')).not.toBe(await VaultAuthService.sha256Hex('world'));
    });
  });
});
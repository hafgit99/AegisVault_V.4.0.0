// @ts-nocheck
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { Argon2WorkerService } from '../Argon2WorkerService';

describe('Argon2WorkerService', () => {
  const tp = {
    password: 'test-password',
    salt: new Uint8Array(16),
    parallelism: 1,
    iterations: 2,
    memorySize: 65536,
    hashLength: 32,
  };

  describe('deriveHex', () => {
    it('produces hex string', async () => {
      const r = await Argon2WorkerService.deriveHex(tp);
      expect(typeof r).toBe('string');
      expect(r).toMatch(/^[a-f0-9]+$/);
      expect(r.length).toBe(64);
    });
    it('same input same result', async () => {
      expect(await Argon2WorkerService.deriveHex(tp)).toBe(await Argon2WorkerService.deriveHex(tp));
    });
    it('different password different result', async () => {
      const r1 = await Argon2WorkerService.deriveHex(tp);
      const r2 = await Argon2WorkerService.deriveHex({ ...tp, password: 'other' });
      expect(r1).not.toBe(r2);
    });
  });

  describe('deriveBinary', () => {
    it('produces Uint8Array', async () => {
      const r = await Argon2WorkerService.deriveBinary(tp);
      expect(r).toBeInstanceOf(Uint8Array);
      expect(r.length).toBe(32);
    });
    it('same input same result', async () => {
      const r1 = await Argon2WorkerService.deriveBinary(tp);
      const r2 = await Argon2WorkerService.deriveBinary(tp);
      expect(r1).toEqual(r2);
    });
  });
});

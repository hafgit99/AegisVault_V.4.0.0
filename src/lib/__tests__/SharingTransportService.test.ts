// @vitest-environment jsdom
/**
 * SharingTransportService — Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock ALL dependency chains BEFORE importing the service under test.
// vi.mock paths are resolved relative to THIS test file.

// 1) SharingAuditService → uses SecureAppSettings → uses localStorage
vi.mock('../SharingAuditService', () => ({
  SharingAuditService: {
    recordEvent: vi.fn(),
    listEvents: vi.fn(() => []),
    clearEvents: vi.fn(),
  },
}));

// 2) crypto-types → may use WebCrypto APIs at module level
vi.mock('../crypto-types', async () => {
  const actual = await vi.importActual<typeof import('../crypto-types')>('../crypto-types');
  return actual;
});

// 3) vaultService → heavy OPFS/IndexedDB/SQLite chain (type-only import in source, but may still be resolved)
vi.mock('../../vaultService', () => ({}));

// 4) canonical-schema → type-only but resolved by vitest transform
vi.mock('../canonical-schema', () => ({}));

import { SharingTransportService } from '../SharingTransportService';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeFakeEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: Math.floor(Math.random() * 10000),
    title: 'Test Entry',
    username: 'user@example.com',
    pass: 'SuperSecret123!',
    url: 'https://example.com',
    notes: 'Test notes',
    category: 'general',
    totpSecret: '',
    tags: ['test'],
    fav: 0,
    ...overrides,
  } as any;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('SharingTransportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Key Generation ─────────────────────────────────────────────────────

  describe('generateKeyPair', () => {
    it('should generate a valid ECDH key pair with P-256 curve', async () => {
      const keyPair = await SharingTransportService.generateKeyPair();

      expect(keyPair).toBeDefined();
      expect(keyPair.publicKeyJwk).toBeDefined();
      expect(keyPair.privateKeyJwk).toBeDefined();
      expect(keyPair.publicKeyFingerprint).toBeDefined();
      expect(keyPair.publicKeyFingerprint.length).toBe(16);
      expect(keyPair.createdAt).toBeDefined();
      expect(keyPair.publicKeyJwk.kty).toBe('EC');
      expect(keyPair.publicKeyJwk.crv).toBe('P-256');
    });

    it('should generate unique key pairs each time', async () => {
      const kp1 = await SharingTransportService.generateKeyPair();
      const kp2 = await SharingTransportService.generateKeyPair();

      expect(kp1.publicKeyFingerprint).not.toBe(kp2.publicKeyFingerprint);
      expect(kp1.privateKeyJwk.d).not.toBe(kp2.privateKeyJwk.d);
    });

    it('should export public key in JWK format without private key material', async () => {
      const keyPair = await SharingTransportService.generateKeyPair();

      expect(keyPair.publicKeyJwk.kty).toBe('EC');
      expect(keyPair.publicKeyJwk.crv).toBe('P-256');
      expect(keyPair.publicKeyJwk.x).toBeDefined();
      expect(keyPair.publicKeyJwk.y).toBeDefined();
      expect(keyPair.publicKeyJwk.d).toBeUndefined();
    });
  });

  // ─── Key Pair Export/Import ──────────────────────────────────────────────

  describe('exportKeyPair / importKeyPair', () => {
    it('should round-trip a key pair via JSON serialization', async () => {
      const keyPair = await SharingTransportService.generateKeyPair();
      const exported = SharingTransportService.exportKeyPair(keyPair);
      const imported = SharingTransportService.importKeyPair(exported);

      expect(imported.publicKeyFingerprint).toBe(keyPair.publicKeyFingerprint);
      expect(imported.publicKeyJwk).toEqual(keyPair.publicKeyJwk);
      expect(imported.privateKeyJwk).toEqual(keyPair.privateKeyJwk);
      expect(imported.createdAt).toBe(keyPair.createdAt);
    });

    it('should produce valid JSON from exportKeyPair', async () => {
      const keyPair = await SharingTransportService.generateKeyPair();
      const exported = SharingTransportService.exportKeyPair(keyPair);

      expect(() => JSON.parse(exported)).not.toThrow();
      const parsed = JSON.parse(exported);
      expect(parsed.publicKeyJwk).toBeDefined();
      expect(parsed.privateKeyJwk).toBeDefined();
    });
  });

  // ─── Payload Validation ─────────────────────────────────────────────────

  describe('validatePayload', () => {
    it('should reject invalid JSON', () => {
      const result = SharingTransportService.validatePayload('not json {{{');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid JSON payload');
    });

    it('should reject wrong protocol version', () => {
      const result = SharingTransportService.validatePayload(
        JSON.stringify({
          version: 'wrong-version',
          ephemeralPublicKey: {},
          ciphertext: 'x',
          iv: 'y',
          hmac: 'z',
        })
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unsupported version');
    });

    it('should reject missing ephemeralPublicKey', () => {
      const result = SharingTransportService.validatePayload(
        JSON.stringify({ version: 'aegis-share-v1', ciphertext: 'x', iv: 'y', hmac: 'z' })
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing ephemeral public key');
    });

    it('should reject missing ciphertext', () => {
      const result = SharingTransportService.validatePayload(
        JSON.stringify({
          version: 'aegis-share-v1',
          ephemeralPublicKey: { kty: 'EC' },
          iv: 'y',
          hmac: 'z',
        })
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing ciphertext');
    });

    it('should reject missing IV', () => {
      const result = SharingTransportService.validatePayload(
        JSON.stringify({
          version: 'aegis-share-v1',
          ephemeralPublicKey: { kty: 'EC' },
          ciphertext: 'x',
          hmac: 'z',
        })
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing IV');
    });

    it('should reject missing HMAC', () => {
      const result = SharingTransportService.validatePayload(
        JSON.stringify({
          version: 'aegis-share-v1',
          ephemeralPublicKey: { kty: 'EC' },
          ciphertext: 'x',
          iv: 'y',
        })
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing HMAC');
    });

    it('should reject expired payloads', () => {
      const result = SharingTransportService.validatePayload(
        JSON.stringify({
          version: 'aegis-share-v1',
          ephemeralPublicKey: { kty: 'EC', crv: 'P-256' },
          ciphertext: 'abc',
          iv: 'def',
          hmac: 'ghi',
          entryCount: 1,
          expiresAt: new Date(Date.now() - 3600000).toISOString(),
        })
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Payload expired');
    });

    it('should accept a valid payload structure', () => {
      const payload = {
        version: 'aegis-share-v1',
        ephemeralPublicKey: { kty: 'EC', crv: 'P-256' },
        ciphertext: 'abc',
        iv: 'def',
        hmac: 'ghi',
        entryCount: 3,
      };
      const result = SharingTransportService.validatePayload(JSON.stringify(payload));
      expect(result.valid).toBe(true);
      expect(result.entryCount).toBe(3);
    });

    it('should accept payload with future expiry', () => {
      const payload = {
        version: 'aegis-share-v1',
        ephemeralPublicKey: { kty: 'EC', crv: 'P-256' },
        ciphertext: 'abc',
        iv: 'def',
        hmac: 'ghi',
        entryCount: 1,
        expiresAt: new Date(Date.now() + 7200000).toISOString(),
      };
      const result = SharingTransportService.validatePayload(JSON.stringify(payload));
      expect(result.valid).toBe(true);
    });
  });

  // ─── Size / Transport ───────────────────────────────────────────────────

  describe('getPayloadSizeCategory / getRecommendedTransport', () => {
    it('should categorize small payloads', () => {
      const small = JSON.stringify({ version: 'aegis-share-v1', ciphertext: 'x'.repeat(100) });
      expect(SharingTransportService.getPayloadSizeCategory(small)).toBe('small');
      expect(SharingTransportService.getRecommendedTransport(small)).toBe('qr');
    });

    it('should categorize medium payloads', () => {
      const medium = JSON.stringify({ version: 'aegis-share-v1', ciphertext: 'x'.repeat(5000) });
      expect(SharingTransportService.getPayloadSizeCategory(medium)).toBe('medium');
      expect(SharingTransportService.getRecommendedTransport(medium)).toBe('clipboard');
    });

    it('should categorize large payloads', () => {
      const large = JSON.stringify({ version: 'aegis-share-v1', ciphertext: 'x'.repeat(100000) });
      expect(SharingTransportService.getPayloadSizeCategory(large)).toBe('large');
      expect(SharingTransportService.getRecommendedTransport(large)).toBe('file');
    });
  });

  // ─── Encrypt / Decrypt ──────────────────────────────────────────────────

  describe('encryptEntries / decryptEntries', () => {
    it('should reject empty entries array', async () => {
      const result = await SharingTransportService.encryptEntries([], {} as JsonWebKey);
      expect(result.success).toBe(false);
      expect(result.error).toBe('No entries to encrypt');
      expect(result.entryCount).toBe(0);
    });

    it('should encrypt and decrypt entries in a full round-trip', async () => {
      const senderKP = await SharingTransportService.generateKeyPair();
      const recipientKP = await SharingTransportService.generateKeyPair();

      const entries = [
        makeFakeEntry({ id: 1, title: 'GitHub', username: 'dev@gh.com', pass: 'gh_pass!' }),
        makeFakeEntry({ id: 2, title: 'AWS', username: 'admin@aws.com', pass: 'aws_key_123' }),
      ];

      const encryptResult = await SharingTransportService.encryptEntries(
        entries,
        recipientKP.publicKeyJwk,
        { senderKeyPair: senderKP, description: 'Test share' }
      );

      expect(encryptResult.success).toBe(true);
      expect(encryptResult.payload).toBeDefined();
      expect(encryptResult.entryCount).toBe(2);
      expect(encryptResult.sizeBytes).toBeGreaterThan(0);

      const decryptResult = await SharingTransportService.decryptEntries(
        encryptResult.payload!,
        recipientKP.privateKeyJwk
      );

      expect(decryptResult.success).toBe(true);
      expect(decryptResult.entries).toBeDefined();
      expect(decryptResult.entryCount).toBe(2);
      expect(decryptResult.entries![0].title).toBe('GitHub');
      expect(decryptResult.entries![0].password).toBe('gh_pass!');
      expect(decryptResult.entries![1].title).toBe('AWS');
      expect(decryptResult.entries![1].password).toBe('aws_key_123');
      expect(decryptResult.senderFingerprint).toBe(senderKP.publicKeyFingerprint);
    });

    it('should preserve optional fields (notes, category, tags, totpSecret)', async () => {
      const senderKP = await SharingTransportService.generateKeyPair();
      const recipientKP = await SharingTransportService.generateKeyPair();

      const entries = [
        makeFakeEntry({
          id: 1,
          title: 'Full Entry',
          notes: 'Important notes',
          category: 'work',
          totpSecret: 'JBSWY3DPEHPK3PXP',
          tags: ['important', 'work'],
        }),
      ];

      const encResult = await SharingTransportService.encryptEntries(
        entries,
        recipientKP.publicKeyJwk,
        { senderKeyPair: senderKP }
      );
      expect(encResult.success).toBe(true);

      const decResult = await SharingTransportService.decryptEntries(
        encResult.payload!,
        recipientKP.privateKeyJwk
      );
      expect(decResult.success).toBe(true);
      expect(decResult.entries![0].notes).toBe('Important notes');
      expect(decResult.entries![0].category).toBe('work');
      expect(decResult.entries![0].totpSecret).toBe('JBSWY3DPEHPK3PXP');
      expect(decResult.entries![0].tags).toEqual(['important', 'work']);
    });

    it('should fail to decrypt with wrong private key', async () => {
      const senderKP = await SharingTransportService.generateKeyPair();
      const recipientKP = await SharingTransportService.generateKeyPair();
      const wrongKP = await SharingTransportService.generateKeyPair();

      const entries = [makeFakeEntry({ id: 1 })];

      const encryptResult = await SharingTransportService.encryptEntries(
        entries,
        recipientKP.publicKeyJwk,
        { senderKeyPair: senderKP }
      );
      expect(encryptResult.success).toBe(true);

      const decryptResult = await SharingTransportService.decryptEntries(
        encryptResult.payload!,
        wrongKP.privateKeyJwk
      );
      expect(decryptResult.success).toBe(false);
    });

    it('should reject expired payloads during decryption', async () => {
      const senderKP = await SharingTransportService.generateKeyPair();
      const recipientKP = await SharingTransportService.generateKeyPair();

      const entries = [makeFakeEntry({ id: 1 })];

      const encryptResult = await SharingTransportService.encryptEntries(
        entries,
        recipientKP.publicKeyJwk,
        {
          senderKeyPair: senderKP,
          expiresAt: new Date(Date.now() - 3600000).toISOString(),
        }
      );
      expect(encryptResult.success).toBe(true);

      const decryptResult = await SharingTransportService.decryptEntries(
        encryptResult.payload!,
        recipientKP.privateKeyJwk
      );
      expect(decryptResult.success).toBe(false);
      expect(decryptResult.error).toContain('expired');
    });

    it('should reject tampered payloads (HMAC failure)', async () => {
      const senderKP = await SharingTransportService.generateKeyPair();
      const recipientKP = await SharingTransportService.generateKeyPair();

      const entries = [makeFakeEntry({ id: 1 })];

      const encryptResult = await SharingTransportService.encryptEntries(
        entries,
        recipientKP.publicKeyJwk,
        { senderKeyPair: senderKP }
      );
      expect(encryptResult.success).toBe(true);

      const tampered = JSON.parse(encryptResult.payload!);
      tampered.ciphertext = tampered.ciphertext.replace(/./g, 'A');

      const decryptResult = await SharingTransportService.decryptEntries(
        JSON.stringify(tampered),
        recipientKP.privateKeyJwk
      );
      expect(decryptResult.success).toBe(false);
      expect(decryptResult.error).toContain('HMAC');
    });

    it('should encrypt without sender key pair (auto-generate ephemeral)', async () => {
      const recipientKP = await SharingTransportService.generateKeyPair();
      const entries = [makeFakeEntry({ id: 1, title: 'Auto Test' })];

      const encResult = await SharingTransportService.encryptEntries(
        entries,
        recipientKP.publicKeyJwk
      );
      expect(encResult.success).toBe(true);
      expect(encResult.entryCount).toBe(1);

      const decResult = await SharingTransportService.decryptEntries(
        encResult.payload!,
        recipientKP.privateKeyJwk
      );
      expect(decResult.success).toBe(true);
      expect(decResult.entries![0].title).toBe('Auto Test');
    });

    it('should reject invalid payload JSON during decryption', async () => {
      const kp = await SharingTransportService.generateKeyPair();
      const result = await SharingTransportService.decryptEntries(
        'not valid json',
        kp.privateKeyJwk
      );
      expect(result.success).toBe(false);
    });

    it('should reject wrong protocol version during decryption', async () => {
      const kp = await SharingTransportService.generateKeyPair();
      const badPayload = JSON.stringify({
        version: 'wrong-v2',
        ephemeralPublicKey: {},
        ciphertext: 'x',
        iv: 'y',
        hmac: 'z',
      });
      const result = await SharingTransportService.decryptEntries(badPayload, kp.privateKeyJwk);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported');
    });
  });

  // ─── createSharePackage ─────────────────────────────────────────────────

  describe('createSharePackage', () => {
    it('should create a self-contained share package', async () => {
      const entries = [
        makeFakeEntry({ id: 1, title: 'Test 1' }),
        makeFakeEntry({ id: 2, title: 'Test 2' }),
      ];

      const { keyPair, result } = await SharingTransportService.createSharePackage(entries, {
        description: 'Package test',
        expiresInHours: 48,
      });

      expect(keyPair).toBeDefined();
      expect(keyPair.publicKeyFingerprint).toBeDefined();
      expect(keyPair.publicKeyFingerprint.length).toBe(16);
      expect(result.success).toBe(true);
      expect(result.entryCount).toBe(2);
      expect(result.sizeBytes).toBeGreaterThan(0);
    });

    it('should create package without expiry when expiresInHours not provided', async () => {
      const entries = [makeFakeEntry({ id: 1 })];
      const { keyPair, result } = await SharingTransportService.createSharePackage(entries);

      expect(result.success).toBe(true);
      const payload = JSON.parse(result.payload!);
      expect(payload.expiresAt).toBeUndefined();
      expect(keyPair).toBeDefined();
    });
  });
});

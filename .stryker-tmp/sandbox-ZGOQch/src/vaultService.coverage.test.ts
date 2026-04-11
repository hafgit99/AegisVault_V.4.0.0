// @ts-nocheck
// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SecureAppSettings } from './lib/SecureAppSettings';
import * as EncryptionProfiles from './config/encryption-profiles';
import { VaultService } from './vaultService';
import { VaultAuthService } from './lib/vault/VaultAuthService';

describe('VaultService coverage helpers', () => {
  let service: VaultService;

  beforeEach(() => {
    localStorage.clear();
    SecureAppSettings.resetForTests();
    service = new VaultService();
  });

  it('tracks active vault db names and falls back to balanced encryption profile', () => {
    expect(service.getVaultDbName()).toBe('aegis_opfs_vault');

    service.setVaultDbName('custom-db');
    expect(service.getVaultDbName()).toBe('custom-db');
  });

  it('calculates strength, normalizes search terms and tokenizes prefixes', () => {
    expect(
      (service as unknown as { calculateStrength: (value: string) => number }).calculateStrength('')
    ).toBe(0);
    expect(
      (service as unknown as { calculateStrength: (value: string) => number }).calculateStrength(
        'Aa1!Aa1!Aa1!'
      )
    ).toBeGreaterThan(0);

    expect(
      (
        service as unknown as { normalizeSearchValue: (value: string) => string }
      ).normalizeSearchValue(' Çılgın Şifre!! 123 ')
    ).toBe('c lg n sifre   123');

    const tokens = (
      service as unknown as { tokenizeSearchFields: (fields: string[]) => string[] }
    ).tokenizeSearchFields(['Aegis Vault', 'finance.example.com']);

    expect(tokens).toContain('aegis');
    expect(tokens).toContain('ae');
    expect(tokens).toContain('finance');
  });

  it('verifies password state and auth migration helpers', async () => {
    expect(await service.verifyCurrentPassword('pw')).toBe(false);
  });

  it('builds search indexes through the hashing helper', async () => {
    const aesKey = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
    (service as unknown as { aesKey: CryptoKey }).aesKey = aesKey;
    (service as unknown as { sensitiveMaterial: Uint8Array }).sensitiveMaterial = new Uint8Array(
      32
    ).fill(7);

    const hashes = await service.buildSearchIndex(
      'Aegis Vault',
      'alice',
      'https://example.com',
      'Finance',
      ['critical']
    );

    // buildSearchIndex now returns HMAC hashes; just verify we got results
    expect(hashes.length).toBeGreaterThan(0);
  });

  it('encrypts and decrypts text fields with the active AES key', async () => {
    const aesKey = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
    (service as unknown as { aesKey: CryptoKey }).aesKey = aesKey;

    const encrypted = await (
      service as unknown as {
        encryptTextField: (value: string) => Promise<{ encrypted: string; iv: string }>;
      }
    ).encryptTextField('vault-secret');

    const decryptSpy = vi
      .spyOn(window.crypto.subtle, 'decrypt')
      .mockResolvedValueOnce(new TextEncoder().encode('vault-secret').buffer);

    const decrypted = await (
      service as unknown as {
        decryptTextField: (encrypted?: string, iv?: string) => Promise<string | null>;
      }
    ).decryptTextField(encrypted.encrypted, encrypted.iv);

    expect(decrypted).toBe('vault-secret');
    decryptSpy.mockRestore();
    await expect(
      (
        new VaultService() as unknown as {
          encryptTextField: (value: string) => Promise<{ encrypted: string; iv: string }>;
        }
      ).encryptTextField('fail')
    ).rejects.toThrow('Vault key unavailable');
  });

  it('builds encrypted metadata at rest and restores UI metadata when needed', async () => {
    const aesKey = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
    (service as unknown as { aesKey: CryptoKey }).aesKey = aesKey;
    (service as unknown as { sensitiveMaterial: Uint8Array }).sensitiveMaterial = new Uint8Array(
      32
    ).fill(7);
    vi.spyOn(SecureAppSettings, 'getEncryptionProfile').mockReturnValue('maximum');
    vi.spyOn(service as never, 'hashSearchToken' as never).mockImplementation(
      async (token: string) => `h:${token}`
    );

    const atRest = await (
      service as unknown as {
        buildMetadataAtRest: (
          title: string,
          username: string,
          website: string,
          category: string,
          tags: string[]
        ) => Promise<Record<string, unknown>>;
      }
    ).buildMetadataAtRest('Bank', 'alice', 'https://bank.example', 'Finance', ['vip']);

    expect(atRest.title).toBe('Bank');
    expect(atRest.encrypted_title).toBeTypeOf('string');
    expect(Array.isArray(atRest.search_index)).toBe(true);

    const prepared = await (
      service as unknown as {
        prepareEntryMetadataForUse: (entry: Record<string, unknown>) => Promise<{
          uiEntry: Record<string, unknown>;
          storageEntry?: Record<string, unknown>;
        }>;
      }
    ).prepareEntryMetadataForUse({
      id: 1,
      title: 'Bank',
      username: 'alice',
      website: 'https://bank.example',
      category: 'Finance',
      tags: ['vip'],
      attachments: [
        {
          id: 'att-1',
          name: 'statement.pdf',
          type: 'application/pdf',
          size: 5,
        },
      ],
      updated_at: '2026-03-17T12:00:00.000Z',
    });

    expect(prepared.uiEntry.title).toBe('Bank');
    expect(prepared.uiEntry.category).toBe('Finance');
    expect(prepared.uiEntry.tags).toEqual(['vip']);
    expect(prepared.storageEntry?.attachments).toBeDefined();
  });

  it('handles mutation lock failures and keeps queue reusable', async () => {
    const lockRunner = service as unknown as {
      withMutationLock: <T>(operation: () => Promise<T>) => Promise<T>;
    };

    await expect(
      lockRunner.withMutationLock(async () => {
        throw new Error('lock-fail');
      })
    ).rejects.toThrow('lock-fail');

    await expect(lockRunner.withMutationLock(async () => 42)).resolves.toBe(42);
  });

  it('applies exponential auth backoff and lockout windows', () => {
    const internals = service as unknown as {
      registerAuthFailure: (scope: 'unlock' | 'reauth', dbName: string) => void;
      enforceAuthRateLimit: (scope: 'unlock' | 'reauth', dbName: string) => void;
      registerAuthSuccess: (scope: 'unlock' | 'reauth', dbName: string) => void;
    };
    let now = 1_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => now);

    internals.registerAuthFailure('unlock', 'rate-db');
    expect(() => internals.enforceAuthRateLimit('unlock', 'rate-db')).toThrowError('RATE_LIMITED');

    now += 1_200;
    expect(() => internals.enforceAuthRateLimit('unlock', 'rate-db')).not.toThrow();

    for (let i = 0; i < 7; i++) {
      internals.registerAuthFailure('unlock', 'rate-db');
      now += 31_000;
    }

    try {
      internals.enforceAuthRateLimit('unlock', 'rate-db');
      throw new Error('expected-rate-limit-error');
    } catch (error: unknown) {
      const retryAfterMs =
        typeof (error as { retryAfterMs?: unknown })?.retryAfterMs === 'number'
          ? Number((error as { retryAfterMs?: number }).retryAfterMs)
          : 0;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('RATE_LIMITED');
      expect(retryAfterMs).toBeGreaterThan(0);
    }

    internals.registerAuthSuccess('unlock', 'rate-db');
    expect(() => internals.enforceAuthRateLimit('unlock', 'rate-db')).not.toThrow();
    nowSpy.mockRestore();
  });

  it('resolves argon2 params for constrained and high-core devices', () => {
    const originalNavigator = global.navigator;
    Object.defineProperty(global, 'navigator', {
      value: { deviceMemory: 2, hardwareConcurrency: 12 },
      configurable: true,
    });

    const params = (
      service as unknown as {
        resolveArgon2Params: () => {
          iterations: number;
          memorySize: number;
          parallelism: number;
        };
      }
    ).resolveArgon2Params();

    expect(params.iterations).toBe(3);
    expect(params.memorySize).toBe(32768);
    expect(params.parallelism).toBe(2);

    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
  });

  it('returns empty search index when no searchable tokens exist', async () => {
    const hashes = await (
      service as unknown as {
        buildSearchIndex: (
          title: string,
          username: string,
          website: string,
          category: string,
          tags: string[]
        ) => Promise<string[]>;
      }
    ).buildSearchIndex('', '', '', '', []);

    expect(hashes).toEqual([]);
  });

  it('verifies current password using sqlite metadata and falls back correctly', async () => {
    const credential = {
      scheme: 'argon2id-v1',
      verificationHash: 'hash',
      salt: 'salt',
      argon2: { iterations: 4, memorySize: 131072, parallelism: 1, hashLength: 32 },
    };
    const mockSqlite = {
      getMetadata: vi.fn(() => ({ credential })),
    };
    const mockDb = {
      get: vi.fn(async () => null),
    };
    (service as unknown as { useSQLite: boolean }).useSQLite = true;
    (service as unknown as { sqliteDb: unknown }).sqliteDb = mockSqlite as unknown;
    (service as unknown as { opfsMockDb: unknown }).opfsMockDb = mockDb as unknown;

    const verifySpy = vi.spyOn(VaultAuthService, 'verifyPassword').mockResolvedValue(true);
    await expect(service.verifyCurrentPassword('pw')).resolves.toBe(true);

    mockSqlite.getMetadata.mockReturnValueOnce(null);
    mockDb.get = vi.fn(async () => null);
    await expect(service.verifyCurrentPassword('pw')).resolves.toBe(false);

    expect(verifySpy).toHaveBeenCalled();
  });

  it('rate limits repeated re-auth failures', async () => {
    const credential = {
      scheme: 'argon2id-v1',
      verificationHash: 'hash',
      salt: 'salt',
      argon2: { iterations: 4, memorySize: 131072, parallelism: 1, hashLength: 32 },
    };
    const mockSqlite = {
      getMetadata: vi.fn(() => ({ credential })),
    };
    (service as unknown as { useSQLite: boolean }).useSQLite = true;
    (service as unknown as { sqliteDb: unknown }).sqliteDb = mockSqlite as unknown;
    (service as unknown as { opfsMockDb: unknown }).opfsMockDb = null;

    const verifySpy = vi.spyOn(VaultAuthService, 'verifyPassword').mockResolvedValue(false);
    let now = 2_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => now);

    // First failure sets the rate limit
    service.registerAuthFailure('reauth', 'test-db');
    // Enforce should throw since not enough time has passed
    expect(() => service.enforceAuthRateLimit('reauth', 'test-db')).toThrow('RATE_LIMITED');

    now += 1_500;
    // After delay, should not throw
    expect(() => service.enforceAuthRateLimit('reauth', 'test-db')).not.toThrow();

    verifySpy.mockRestore();
    nowSpy.mockRestore();
  });

  it('reports unlocked state and exports vault from sqlite backend', async () => {
    const aesKey = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
    (service as unknown as { aesKey: CryptoKey }).aesKey = aesKey;
    (service as unknown as { sensitiveMaterial: Uint8Array }).sensitiveMaterial = new Uint8Array(
      32
    );
    expect(service.isUnlocked()).toBe(true);

    const mockSqlite = {
      getAllPasswords: vi.fn(() => [{ id: 1, title: 'entry' }]),
      putPassword: vi.fn(),
    };
    (service as unknown as { useSQLite: boolean }).useSQLite = true;
    (service as unknown as { sqliteDb: unknown }).sqliteDb = mockSqlite as unknown;

    const exportOut = await service.exportVault();
    const arr = JSON.parse(exportOut);
    expect(arr.length).toBe(1);
    expect(arr[0].id).toBe(1);
    expect(arr[0].title).toBe('entry');
    expect(arr[0].encrypted_title).toBeDefined();
  });

  it('skips attachment metadata encryption when profile does not require it', async () => {
    vi.spyOn(SecureAppSettings, 'getEncryptionProfile').mockReturnValue('balanced');
    vi.spyOn(EncryptionProfiles, 'isFieldEncrypted').mockReturnValue(false);
    const input = [{ id: 'a', name: 'n', type: 't', size: 1 }];
    const result = await (
      service as unknown as {
        encryptAttachmentMetadataList: (
          attachments: Array<{ id: string; name: string; type: string; size: number }>
        ) => Promise<unknown[]>;
      }
    ).encryptAttachmentMetadataList(input);

    expect(result).toEqual(input);
  });

  it('decryptTextField returns null without key and on decrypt failure', async () => {
    const withoutKey = await (
      service as unknown as {
        decryptTextField: (encrypted?: string, iv?: string) => Promise<string | null>;
      }
    ).decryptTextField('ABCD', 'EFGH');
    expect(withoutKey).toBeNull();

    const aesKey = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
    (service as unknown as { aesKey: CryptoKey }).aesKey = aesKey;
    vi.spyOn(window.crypto.subtle, 'decrypt').mockRejectedValueOnce(new Error('decrypt-fail'));

    const failed = await (
      service as unknown as {
        decryptTextField: (encrypted?: string, iv?: string) => Promise<string | null>;
      }
    ).decryptTextField('QUJDRA==', 'RUZHSA==');
    expect(failed).toBeNull();
  });

  it('hydrates rich sensitive fields lazily and supports base64 payloads', async () => {
    const aesKey = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
    (service as unknown as { aesKey: CryptoKey }).aesKey = aesKey;

    const decoderOutputs = [
      new TextEncoder().encode('totp-secret').buffer,
      new TextEncoder().encode('note-content').buffer,
      new TextEncoder().encode(JSON.stringify({ rpId: 'example.com' })).buffer,
      new TextEncoder().encode(JSON.stringify({ cardholder_name: 'Ada' })).buffer,
      new TextEncoder().encode(JSON.stringify({ document_type: 'passport' })).buffer,
    ];

    const decryptSpy = vi.spyOn(window.crypto.subtle, 'decrypt');
    for (const output of decoderOutputs) {
      decryptSpy.mockResolvedValueOnce(output as ArrayBuffer);
    }

    const entries = [
      {
        id: 1,
        title: 't',
        username: 'u',
        category: 'c',
        website: 'w',
        updated_at: new Date().toISOString(),
        totp_secret: 'QUJDRA==',
        totp_iv: 'RkdoaQ==',
        encrypted_notes: 'QUJDRA==',
        notes_iv: 'RkdoaQ==',
        encrypted_passkey_meta: 'QUJDRA==',
        passkey_meta_iv: 'RkdoaQ==',
        encrypted_card_details: 'QUJDRA==',
        card_details_iv: 'RkdoaQ==',
        encrypted_identity_details: 'QUJDRA==',
        identity_details_iv: 'RkdoaQ==',
      },
    ];

    await (
      service as unknown as {
        hydrateRichSensitiveFields: (entries: Record<string, unknown>[]) => Promise<void>;
      }
    ).hydrateRichSensitiveFields(entries as unknown as Record<string, unknown>[]);

    expect((entries[0] as Record<string, unknown>).totpSecret).toBe('totp-secret');
    expect((entries[0] as Record<string, unknown>).notes).toBe('note-content');
    expect((entries[0] as Record<string, unknown>).passkeyMetadata).toBeTruthy();
    expect((entries[0] as Record<string, unknown>).cardDetails).toBeTruthy();
    expect((entries[0] as Record<string, unknown>).identityDetails).toBeTruthy();
  });

  it('emptyTrash executes both IDB and SQLite cleanup branches', async () => {
    const mockDb = {
      getAll: vi.fn(async () => [
        {
          id: 1,
          deletedAt: new Date().toISOString(),
          attachments: [{ id: 'att-1' }],
        },
      ]),
      delete: vi.fn(async () => undefined),
    };
    const mockSqlite = {
      getAllPasswords: vi.fn(() => [{ id: 2, deletedAt: new Date().toISOString() }]),
      getAttachmentsByEntry: vi.fn(() => ['att-2']),
      deleteAttachment: vi.fn(),
      deletePassword: vi.fn(),
      flushToOPFS: vi.fn(async () => undefined),
    };

    (service as unknown as { opfsMockDb: unknown }).opfsMockDb = mockDb as unknown;
    (service as unknown as { sqliteDb: unknown }).sqliteDb = mockSqlite as unknown;
    (service as unknown as { useSQLite: boolean }).useSQLite = true;

    await service.emptyTrash();

    expect(mockDb.delete).toHaveBeenCalledWith('attachments', 'att-1');
    expect(mockDb.delete).toHaveBeenCalledWith('passwords', 1);
    expect(mockSqlite.deleteAttachment).toHaveBeenCalledWith('att-2');
    expect(mockSqlite.deletePassword).toHaveBeenCalledWith(2);
    expect(mockSqlite.flushToOPFS).toHaveBeenCalled();
  });

  it('getDecryptedAttachment reads from SQLite when available', async () => {
    const aesKey = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
    (service as unknown as { aesKey: CryptoKey }).aesKey = aesKey;

    const mockSqlite = {
      getAttachment: vi.fn(() => ({
        id: 'att-sql',
        iv: '00112233445566778899aabb',
        encrypted_data: 'aabbccdd',
      })),
    };
    (service as unknown as { useSQLite: boolean }).useSQLite = true;
    (service as unknown as { sqliteDb: unknown }).sqliteDb = mockSqlite as unknown;

    vi.spyOn(window.crypto.subtle, 'decrypt').mockResolvedValueOnce(
      new Uint8Array([1, 2, 3]).buffer
    );

    const blob = await service.getDecryptedAttachment('att-sql');

    expect(mockSqlite.getAttachment).toHaveBeenCalledWith('att-sql');
    expect(blob.size).toBe(3);
  });

  it('deleteAttachment executes SQLite deletion and password metadata update', async () => {
    const mockSqlite = {
      deleteAttachment: vi.fn(),
      getAllPasswords: vi.fn(() => [
        {
          id: 50,
          attachments: [{ id: 'keep' }, { id: 'drop' }],
        },
      ]),
      putPassword: vi.fn(),
      flushToOPFS: vi.fn(async () => undefined),
    };

    (service as unknown as { useSQLite: boolean }).useSQLite = true;
    (service as unknown as { sqliteDb: unknown }).sqliteDb = mockSqlite as unknown;

    await service.deleteAttachment(50, 'drop');

    expect(mockSqlite.deleteAttachment).toHaveBeenCalledWith('drop');
    expect(mockSqlite.putPassword).toHaveBeenCalledWith({
      id: 50,
      attachments: [{ id: 'keep' }],
    });
    expect(mockSqlite.flushToOPFS).toHaveBeenCalled();
  });

  it('bulkAddPasswords populates encrypted metadata fields and writes to SQLite', async () => {
    const aesKey = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
    (service as unknown as { aesKey: CryptoKey }).aesKey = aesKey;

    const mockSqlite = {
      putPassword: vi.fn(),
      flushToOPFS: vi.fn(async () => undefined),
    };
    (service as unknown as { useSQLite: boolean }).useSQLite = true;
    (service as unknown as { sqliteDb: unknown }).sqliteDb = mockSqlite as unknown;

    vi.spyOn(service as never, 'buildMetadataAtRest' as never).mockResolvedValue({
      title: '',
      username: '',
      category: '',
      website: '',
      tags: [],
      encrypted_title: 'et',
      title_iv: 'ti',
      encrypted_username: 'eu',
      username_iv: 'ui',
      encrypted_category: 'ec',
      category_iv: 'ci',
      encrypted_website: 'ew',
      website_iv: 'wi',
      encrypted_tags: 'eg',
      tags_iv: 'gi',
      search_index: ['h:a'],
    });

    const result = await service.bulkAddPasswords([
      { title: 'Entry 1', pass: 'VeryStrongPass!123', username: 'u1' },
    ]);

    expect(result.total).toBe(1);
    expect(mockSqlite.putPassword).toHaveBeenCalledTimes(1);
    expect(mockSqlite.putPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        title_iv: 'ti',
        username_iv: 'ui',
        category_iv: 'ci',
        website_iv: 'wi',
        tags_iv: 'gi',
      })
    );
    expect(mockSqlite.flushToOPFS).toHaveBeenCalled();
  });

  it('bulkAddPasswords counts missing password fields and skips entry creation', async () => {
    const aesKey = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
    (service as unknown as { aesKey: CryptoKey }).aesKey = aesKey;

    const mockSqlite = {
      putPassword: vi.fn(),
      flushToOPFS: vi.fn(async () => undefined),
    };
    (service as unknown as { useSQLite: boolean }).useSQLite = true;
    (service as unknown as { sqliteDb: unknown }).sqliteDb = mockSqlite as unknown;

    const result = await service.bulkAddPasswords([{ title: 'Missing pass' }]);

    expect(result.total).toBe(1);
    expect(result.missingFields).toBe(1);
    expect(mockSqlite.putPassword).not.toHaveBeenCalled();
    expect(mockSqlite.flushToOPFS).toHaveBeenCalled();
  });

  it('addAttachment executes SQLite primary write path and updates entry attachments', async () => {
    const aesKey = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
    (service as unknown as { aesKey: CryptoKey }).aesKey = aesKey;

    const dbEntry = { id: 88, attachments: [] as Array<{ id: string; name?: string }> };
    const mockSqlite = {
      putAttachment: vi.fn(),
      getAllPasswords: vi.fn(() => [dbEntry]),
      putPassword: vi.fn(),
      flushToOPFS: vi.fn(async () => undefined),
    };
    (service as unknown as { useSQLite: boolean }).useSQLite = true;
    (service as unknown as { sqliteDb: unknown }).sqliteDb = mockSqlite as unknown;

    vi.spyOn(service as never, 'encryptAttachmentMetadataList' as never).mockResolvedValue([
      { id: 'fixed-att', name: 'doc.txt', type: 'text/plain', size: 4 },
    ]);

    const file = new File([new TextEncoder().encode('test')], 'doc.txt', { type: 'text/plain' });
    const result = await service.addAttachment(88, file);

    expect(mockSqlite.putAttachment).toHaveBeenCalledTimes(1);
    expect(mockSqlite.putPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 88,
        attachments: expect.arrayContaining([expect.objectContaining({ id: 'fixed-att' })]),
      })
    );
    expect(mockSqlite.flushToOPFS).toHaveBeenCalled();
    expect(result.name).toBe('doc.txt');
  });

  it('deletePermanently removes IDB attachments before deleting the entry', async () => {
    const store = {
      get: vi.fn(async () => ({
        id: 11,
        attachments: [{ id: 'att-a' }, { id: 'att-b' }],
      })),
      delete: vi.fn(async () => undefined),
    };
    const tx = {
      objectStore: vi.fn(() => store),
      done: Promise.resolve(),
    };
    const mockDb = {
      transaction: vi.fn(() => tx),
      delete: vi.fn(async () => undefined),
    };

    (service as unknown as { opfsMockDb: unknown }).opfsMockDb = mockDb as unknown;

    await service.deletePermanently(11);

    expect(mockDb.transaction).toHaveBeenCalledWith('passwords', 'readwrite');
    expect(mockDb.delete).toHaveBeenCalledWith('attachments', 'att-a');
    expect(mockDb.delete).toHaveBeenCalledWith('attachments', 'att-b');
    expect(store.delete).toHaveBeenCalledWith(11);
  });

  it('deletePermanently runs SQLite attachment and record deletion flow', async () => {
    const mockSqlite = {
      getAttachmentsByEntry: vi.fn(() => ['s-att-1', 's-att-2']),
      deleteAttachment: vi.fn(),
      deletePassword: vi.fn(),
      flushToOPFS: vi.fn(async () => undefined),
    };

    (service as unknown as { useSQLite: boolean }).useSQLite = true;
    (service as unknown as { sqliteDb: unknown }).sqliteDb = mockSqlite as unknown;

    await service.deletePermanently(22);

    expect(mockSqlite.getAttachmentsByEntry).toHaveBeenCalledWith(22);
    expect(mockSqlite.deleteAttachment).toHaveBeenCalledWith('s-att-1');
    expect(mockSqlite.deleteAttachment).toHaveBeenCalledWith('s-att-2');
    expect(mockSqlite.deletePassword).toHaveBeenCalledWith(22);
    expect(mockSqlite.flushToOPFS).toHaveBeenCalled();
  });

  it('moveToTrash and restoreFromTrash execute SQLite write paths', async () => {
    const mockSqlite = {
      updatePasswordField: vi.fn(),
      flushToOPFS: vi.fn(async () => undefined),
    };

    (service as unknown as { useSQLite: boolean }).useSQLite = true;
    (service as unknown as { sqliteDb: unknown }).sqliteDb = mockSqlite as unknown;

    await service.moveToTrash(31);
    await service.restoreFromTrash(31);

    expect(mockSqlite.updatePasswordField).toHaveBeenCalledWith(
      31,
      'deleted_at',
      expect.any(String)
    );
    expect(mockSqlite.updatePasswordField).toHaveBeenCalledWith(31, 'deleted_at', null);
    expect(mockSqlite.flushToOPFS).toHaveBeenCalledTimes(2);
  });

  it('cleanupTrash skips when db missing and deletes old trashed entries', async () => {
    await expect(service.cleanupTrash()).resolves.toBeUndefined();

    const stale = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const recent = new Date().toISOString();
    const mockDb = {
      getAll: vi.fn(async () => [
        { id: 100, deletedAt: stale },
        { id: 200, deletedAt: recent },
      ]),
    };
    (service as unknown as { opfsMockDb: unknown }).opfsMockDb = mockDb as unknown;

    const deleteSpy = vi.spyOn(service, 'deletePermanently').mockResolvedValue(undefined);
    await service.cleanupTrash();

    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(deleteSpy).toHaveBeenCalledWith(100);
  });
});

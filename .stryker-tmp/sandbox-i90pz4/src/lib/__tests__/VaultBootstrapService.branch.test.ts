// @ts-nocheck
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VaultBootstrapService } from '../vault/VaultBootstrapService';
import { SQLiteOPFS, isOPFSAvailable } from '../SQLiteOPFS';
import { openDB } from 'idb';
import { getAesKey } from '../../vaultService';

vi.mock('../SQLiteOPFS', () => {
  const MockSQLiteOPFS = vi.fn();
  MockSQLiteOPFS.prototype.open = vi.fn().mockResolvedValue(undefined);
  MockSQLiteOPFS.prototype.countPasswords = vi.fn().mockReturnValue(0);
  MockSQLiteOPFS.prototype.putPassword = vi.fn();
  MockSQLiteOPFS.prototype.putMetadata = vi.fn();
  MockSQLiteOPFS.prototype.getMetadata = vi.fn();
  MockSQLiteOPFS.prototype.putAttachment = vi.fn();
  MockSQLiteOPFS.prototype.flushToOPFS = vi.fn().mockResolvedValue(undefined);
  MockSQLiteOPFS.prototype.close = vi.fn().mockResolvedValue(undefined);

  return {
    isOPFSAvailable: vi.fn(),
    SQLiteOPFS: MockSQLiteOPFS,
  };
});

vi.mock('idb', () => ({
  openDB: vi.fn(),
}));

// Provide minimal implementations for crypto types
vi.mock('../crypto-types', () => ({
  isLikelyHex: (val: string) => /^[0-9a-fA-F]+$/.test(val),
  hexToBuffer: (hex: string) => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  },
  toBufferSource: (array: Uint8Array) => array.buffer,
}));

vi.mock('../vault/VaultAuthService', () => ({
  VaultAuthService: {
    sha256Hex: vi.fn().mockResolvedValue('fake-hash'),
  },
}));

vi.mock('../../vaultService', () => ({
  getAesKey: vi.fn(),
  setAesKey: vi.fn(),
}));

describe('VaultBootstrapService Branch Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks for global dependencies
    vi.stubGlobal('indexedDB', {
      databases: vi.fn().mockResolvedValue([{ name: 'test_db' }]),
      deleteDatabase: vi.fn().mockReturnValue({
        set onsuccess(cb: () => void) {
          cb();
        },
      }),
    });
    vi.stubGlobal('navigator', {
      storage: {
        getDirectory: vi.fn().mockResolvedValue({
          removeEntry: vi.fn().mockResolvedValue(undefined),
        }),
      },
    });

    vi.stubGlobal('crypto', {
      subtle: {
        decrypt: vi.fn().mockResolvedValue(new ArrayBuffer(16)),
      },
      getRandomValues: vi.fn().mockReturnValue(new Uint8Array(16)),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('wipeAllData', () => {
    it('closes and deletes both databases', async () => {
      const mockSqlite = new SQLiteOPFS() as any;
      const mockIdb = { name: 'test_db_idb', close: vi.fn() } as any;

      await VaultBootstrapService.wipeAllData(mockIdb, mockSqlite);

      expect(mockSqlite.close).toHaveBeenCalled();
      expect(mockIdb.close).toHaveBeenCalled();
      expect(indexedDB.deleteDatabase).toHaveBeenCalledWith('test_db_idb');
      expect(navigator.storage.getDirectory).toHaveBeenCalled();
    });

    it('handles errors gracefully', async () => {
      const mockSqlite = new SQLiteOPFS() as any;
      mockSqlite.close.mockRejectedValueOnce(new Error('err'));

      const mockIdb = { name: 'test_db_idb', close: vi.fn() } as any;

      vi.stubGlobal('indexedDB', {
        deleteDatabase: vi.fn().mockReturnValue({
          error: new Error('idb err'),
          set onerror(cb: () => void) {
            cb();
          },
        }),
      });

      await expect(VaultBootstrapService.wipeAllData(mockIdb, mockSqlite)).rejects.toThrow(
        'idb err'
      );
    });
  });

  describe('initDb', () => {
    const mockDerive = vi.fn().mockResolvedValue({
      saltB64: 'salt',
      aesKey: { type: 'secret' } as unknown as CryptoKey,
      sensitiveMaterial: new Uint8Array(32),
    });
    const setCache = vi.fn();
    const createAuth = vi.fn().mockResolvedValue('auth_cred');

    let mockIdb: any;

    beforeEach(() => {
      mockIdb = {
        name: 'test_db',
        transaction: vi.fn().mockReturnValue({
          objectStore: vi.fn().mockReturnValue({
            put: vi.fn().mockResolvedValue(undefined),
            get: vi.fn().mockImplementation((key: string) => mockIdb.get('vault_metadata', key)),
            count: vi.fn().mockImplementation(() => mockIdb.count('passwords')),
          }),
          done: Promise.resolve(),
        }),
        get: vi.fn(),
        getAll: vi.fn(),
        count: vi.fn(),
      };

      vi.mocked(openDB).mockResolvedValue(mockIdb as any);
    });

    it('runs IDB to SQLite migration', async () => {
      // Simulate isOPFSAvailable true
      vi.mocked(isOPFSAvailable).mockReturnValue(true);

      // Simulate IDB has data, SQLite has none -> trigger migration
      mockIdb.get.mockImplementation((store: string, key: string) => {
        if (store === 'vault_metadata' && key === 'device_config') {
          return Promise.resolve(null);
        }
        if (store === 'vault_metadata' && key === 'auth_credential')
          return Promise.resolve({ credential: { scheme: 'argon2id-v1' } });
        return Promise.resolve(null);
      });
      mockIdb.count.mockImplementation((store: string) => {
        if (store === 'passwords') return 5;
        return 0;
      });
      mockIdb.getAll.mockImplementation((store: string) => {
        if (store === 'passwords')
          return [
            {
              id: 1,
              encrypted_password: 'abcdef',
              iv: '123456',
            },
          ];
        if (store === 'attachments')
          return [
            { id: 'a1', entryId: 1, iv: new Uint8Array(12), encrypted_data: new ArrayBuffer(12) },
          ];
        return [];
      });

      // Need AES key config for tryDecrypt
      vi.mocked(getAesKey).mockReturnValue({ type: 'secret' } as any);

      const result = await VaultBootstrapService.initDb({
        password: 'pass',
        secretKey: 'secret',
        dbName: 'test_db',
        isSetupAction: false,
        deriveMasterKey: mockDerive,
        createAuthCredential: createAuth,
        setDecryptedEntriesCache: setCache,
        getAesKey: vi.fn().mockReturnValue({ type: 'secret' } as any),
        setAesKey: vi.fn(),
        verifyPassword: vi.fn().mockResolvedValue(true),
        migrateAuthCredentialToArgon2: vi.fn(),
      });

      expect(result.useSQLite).toBe(true);
      expect(result.sqliteDb).toBeDefined();

      // Inside initDb, it does: new SQLiteOPFS()
      // Then it should have called countPasswords etc.
      // We can grab the mock instance that was created
      const sqliteInstance = vi.mocked(SQLiteOPFS).mock.instances[0] as any;
      expect(sqliteInstance.putPassword).toHaveBeenCalled();
      expect(sqliteInstance.flushToOPFS).toHaveBeenCalled();
    });

    it('handles base64 encoded data in tryDecrypt', async () => {
      vi.mocked(isOPFSAvailable).mockReturnValue(false); // test without sqlite just for tryDecrypt

      mockIdb.get.mockImplementation((store: string, key: string) => {
        if (store === 'vault_metadata' && key === 'device_config') {
          return Promise.resolve(null);
        }
        if (store === 'vault_metadata' && key === 'auth_credential')
          return Promise.resolve({ credential: { scheme: 'argon2id-v1' } });
        return Promise.resolve(null);
      });
      mockIdb.count.mockImplementation((store: string) => (store === 'passwords' ? 1 : 0));

      vi.mocked(getAesKey).mockReturnValue({ type: 'secret' } as any);

      // Base64 entries
      mockIdb.getAll.mockImplementation((store: string) => {
        if (store === 'passwords') {
          return [
            {
              id: 1,
              encrypted_password: btoa('test_cipher'),
              iv: btoa('test_iv123'),
            },
          ];
        }
        return [];
      });

      const result = await VaultBootstrapService.initDb({
        password: 'pass',
        secretKey: 'secret',
        dbName: 'test_db',
        isSetupAction: false,
        deriveMasterKey: mockDerive,
        createAuthCredential: createAuth,
        setDecryptedEntriesCache: setCache,
        getAesKey: vi.fn().mockReturnValue({ type: 'secret' } as any),
        setAesKey: vi.fn(),
        verifyPassword: vi.fn().mockResolvedValue(true),
        migrateAuthCredentialToArgon2: vi.fn(),
      });

      expect(window.crypto.subtle.decrypt).toHaveBeenCalled();
      expect(result.aesKey).toBeDefined();
    });

    it('creates new vault when isSetupAction is true and vault is empty', async () => {
      vi.mocked(isOPFSAvailable).mockReturnValue(true);

      mockIdb.get.mockResolvedValue(null);
      mockIdb.count.mockResolvedValue(0);

      await VaultBootstrapService.initDb({
        password: 'pass',
        secretKey: 'secret',
        dbName: 'test_db',
        isSetupAction: true,
        deriveMasterKey: mockDerive,
        createAuthCredential: createAuth,
        setDecryptedEntriesCache: setCache,
        getAesKey: vi.fn().mockReturnValue({ type: 'secret' } as any),
        setAesKey: vi.fn(),
        verifyPassword: vi.fn().mockResolvedValue(true),
        migrateAuthCredentialToArgon2: vi.fn(),
      });

      // Verify metadata is written to both DBs
      expect(mockIdb.transaction).toHaveBeenCalledWith('vault_metadata', 'readwrite');
      const sqliteInstance = vi.mocked(SQLiteOPFS).mock.instances[0] as any;
      expect(sqliteInstance.putMetadata).toHaveBeenCalledWith(
        'auth_credential',
        expect.any(Object)
      );
      expect(sqliteInstance.putMetadata).toHaveBeenCalledWith('device_config', expect.any(Object));
    });

    it('throws NO_VAULT_FOUND if vault is empty and isSetupAction is false', async () => {
      mockIdb.get.mockResolvedValue(null);
      mockIdb.count.mockResolvedValue(0);

      await expect(
        VaultBootstrapService.initDb({
          password: 'pass',
          secretKey: 'secret',
          dbName: 'test_db',
          isSetupAction: false,
          deriveMasterKey: mockDerive,
          createAuthCredential: createAuth,
          setDecryptedEntriesCache: setCache,
          getAesKey: vi.fn().mockReturnValue({ type: 'secret' } as any),
          setAesKey: vi.fn(),
          verifyPassword: vi.fn().mockResolvedValue(true),
          migrateAuthCredentialToArgon2: vi.fn(),
        })
      ).rejects.toThrow('NO_VAULT_FOUND');
    });

    it('throws error if device secret hash does not match', async () => {
      mockIdb.get.mockImplementation((store: string, key: string) => {
        if (store === 'vault_metadata' && key === 'device_config') {
          return Promise.resolve({ deviceSecretHash: 'different-hash' });
        }
        if (store === 'vault_metadata' && key === 'auth_credential')
          return Promise.resolve({ credential: { scheme: 'argon2id-v1' } });
        return Promise.resolve(null);
      });
      mockIdb.count.mockResolvedValue(1);

      await expect(
        VaultBootstrapService.initDb({
          password: 'pass',
          secretKey: 'secret',
          dbName: 'test_db',
          isSetupAction: false,
          deriveMasterKey: mockDerive,
          createAuthCredential: createAuth,
          setDecryptedEntriesCache: setCache,
          getAesKey: vi.fn().mockReturnValue({ type: 'secret' } as any),
          setAesKey: vi.fn(),
          verifyPassword: vi.fn().mockResolvedValue(true),
          migrateAuthCredentialToArgon2: vi.fn(),
        })
      ).rejects.toThrow('Invalid device secret key');
    });

    it('throws error if tryDecrypt fails for all entries', async () => {
      mockIdb.get.mockImplementation((store: string, key: string) => {
        if (store === 'vault_metadata' && key === 'auth_credential')
          return Promise.resolve({ credential: { scheme: 'argon2id-v1' } });
        return Promise.resolve(null);
      });
      mockIdb.count.mockResolvedValue(1);

      vi.mocked(getAesKey).mockReturnValue({ type: 'secret' } as any);

      mockIdb.getAll.mockImplementation((store: string) => {
        if (store === 'passwords') {
          return [
            {
              id: 1,
              encrypted_password: 'aa', // invalid hex
              iv: 'bb',
            },
          ];
        }
        return [];
      });

      // Decrypt fails
      vi.mocked(window.crypto.subtle.decrypt).mockRejectedValueOnce(new Error('Decrypt failed'));

      await expect(
        VaultBootstrapService.initDb({
          password: 'pass',
          secretKey: 'secret',
          dbName: 'test_db',
          isSetupAction: false,
          deriveMasterKey: mockDerive,
          createAuthCredential: createAuth,
          setDecryptedEntriesCache: setCache,
          getAesKey: vi.fn().mockReturnValue({ type: 'secret' } as any),
          setAesKey: vi.fn(),
          verifyPassword: vi.fn().mockResolvedValue(true),
          migrateAuthCredentialToArgon2: vi.fn(),
        })
      ).rejects.toThrow('Invalid device secret key for this vault');
    });
  });
});

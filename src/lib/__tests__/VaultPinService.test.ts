// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VaultPinService } from '../vault/VaultPinService';

async function createAesKey(): Promise<CryptoKey> {
  return window.crypto.subtle.importKey('raw', new Uint8Array(32), { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

function createMockIDB() {
  const store = new Map<string, any>();
  const mockStore: any = {
    get: vi.fn(async (id: string) => store.get(id)),
    put: vi.fn(async (v: any) => {
      store.set(v.id, v);
    }),
  };
  const mockTx: any = { objectStore: vi.fn(() => mockStore), done: Promise.resolve() };
  return {
    store,
    mockDb: {
      transaction: vi.fn(() => mockTx),
      get: vi.fn(async (_s: string, id: string) => store.get(id)),
    } as any,
  };
}

function createMockSQLite() {
  const store = new Map<string, any>();
  return {
    store,
    mockDb: {
      putMetadata: vi.fn((key: string, val: any) => {
        store.set(key, val);
      }),
      getMetadata: vi.fn((key: string) => store.get(key) || null),
    } as any,
  };
}

function mockRandomBytes(len: number): Uint8Array {
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) arr[i] = i + 1;
  return arr;
}

describe('VaultPinService', () => {
  let aesKey: CryptoKey;
  let idb: ReturnType<typeof createMockIDB>;
  let sqlite: ReturnType<typeof createMockSQLite>;

  beforeEach(async () => {
    aesKey = await createAesKey();
    idb = createMockIDB();
    sqlite = createMockSQLite();
  });

  describe('saveSecurityPins', () => {
    it('saves pins to IDB', async () => {
      await VaultPinService.saveSecurityPins({
        aesKey,
        opfsMockDb: idb.mockDb,
        sqliteDb: null,
        useSQLite: false,
        duressPin: '1111',
        killPin: '9999',
        randomBytes: mockRandomBytes,
      });
      expect(idb.store.has('security_pins')).toBe(true);
      const record = idb.store.get('security_pins');
      expect(record.encrypted_data).toBeTruthy();
      expect(record.iv).toBeTruthy();
    });

    it('saves pins to SQLite', async () => {
      await VaultPinService.saveSecurityPins({
        aesKey,
        opfsMockDb: null,
        sqliteDb: sqlite.mockDb,
        useSQLite: true,
        duressPin: '2222',
        killPin: '8888',
        randomBytes: mockRandomBytes,
      });
      expect(sqlite.mockDb.putMetadata).toHaveBeenCalledWith(
        'security_pins',
        expect.objectContaining({
          id: 'security_pins',
          encrypted_data: expect.any(String),
          iv: expect.any(String),
        })
      );
    });

    it('throws when aesKey is null', async () => {
      await expect(
        VaultPinService.saveSecurityPins({
          aesKey: null,
          opfsMockDb: idb.mockDb,
          sqliteDb: null,
          useSQLite: false,
          duressPin: '1111',
          killPin: '9999',
          randomBytes: mockRandomBytes,
        })
      ).rejects.toThrow('Vault not initialized');
    });

    it('throws when both dbs are null', async () => {
      await expect(
        VaultPinService.saveSecurityPins({
          aesKey,
          opfsMockDb: null,
          sqliteDb: null,
          useSQLite: false,
          duressPin: '1111',
          killPin: '9999',
          randomBytes: mockRandomBytes,
        })
      ).rejects.toThrow('Vault not initialized');
    });
  });

  describe('getSecurityPins', () => {
    it('round-trips pins through IDB', async () => {
      await VaultPinService.saveSecurityPins({
        aesKey,
        opfsMockDb: idb.mockDb,
        sqliteDb: null,
        useSQLite: false,
        duressPin: '1234',
        killPin: '5678',
        randomBytes: mockRandomBytes,
      });
      const result = await VaultPinService.getSecurityPins({
        aesKey,
        opfsMockDb: idb.mockDb,
        sqliteDb: null,
        useSQLite: false,
      });
      expect(result.duressPin).toBe('1234');
      expect(result.killPin).toBe('5678');
    });

    it('round-trips pins through SQLite', async () => {
      await VaultPinService.saveSecurityPins({
        aesKey,
        opfsMockDb: null,
        sqliteDb: sqlite.mockDb,
        useSQLite: true,
        duressPin: '4321',
        killPin: '8765',
        randomBytes: mockRandomBytes,
      });
      const result = await VaultPinService.getSecurityPins({
        aesKey,
        opfsMockDb: null,
        sqliteDb: sqlite.mockDb,
        useSQLite: true,
      });
      expect(result.duressPin).toBe('4321');
      expect(result.killPin).toBe('8765');
    });

    it('returns empty when no pins saved', async () => {
      const result = await VaultPinService.getSecurityPins({
        aesKey,
        opfsMockDb: idb.mockDb,
        sqliteDb: null,
        useSQLite: false,
      });
      expect(result).toEqual({ duressPin: '', killPin: '' });
    });

    it('returns empty when aesKey is null', async () => {
      const result = await VaultPinService.getSecurityPins({
        aesKey: null,
        opfsMockDb: idb.mockDb,
        sqliteDb: null,
        useSQLite: false,
      });
      expect(result).toEqual({ duressPin: '', killPin: '' });
    });

    it('returns empty when both dbs are null', async () => {
      const result = await VaultPinService.getSecurityPins({
        aesKey,
        opfsMockDb: null,
        sqliteDb: null,
        useSQLite: false,
      });
      expect(result).toEqual({ duressPin: '', killPin: '' });
    });

    it('returns empty when decrypting with wrong key', async () => {
      await VaultPinService.saveSecurityPins({
        aesKey,
        opfsMockDb: idb.mockDb,
        sqliteDb: null,
        useSQLite: false,
        duressPin: '9999',
        killPin: '0000',
        randomBytes: mockRandomBytes,
      });
      const wrongKeyMaterial = new Uint8Array(32);
      crypto.getRandomValues(wrongKeyMaterial);
      const wrongKey = await window.crypto.subtle.importKey(
        'raw',
        wrongKeyMaterial,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
      const result = await VaultPinService.getSecurityPins({
        aesKey: wrongKey,
        opfsMockDb: idb.mockDb,
        sqliteDb: null,
        useSQLite: false,
      });
      expect(result).toEqual({ duressPin: '', killPin: '' });
    });
  });
});

const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'lib', '__tests__');

// SearchService test
fs.writeFileSync(
  path.join(dir, 'SearchService.test.ts'),
  `// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { SearchService } from '../SearchService';
import type { VaultEntry } from '../../vaultService';

function makeEntry(overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    id: 1, title: 'Test Entry', username: 'user@test.com', pass: 'secret',
    website: 'https://example.com', category: 'General', tags: ['tag1'],
    encrypted_password: '', iv: '', updated_at: '2026-01-01T00:00:00Z',
    strength: 80, pwned_count: 0, ...overrides,
  } as VaultEntry;
}

describe('SearchService', () => {
  describe('normalize', () => {
    it('converts to lowercase', () => expect(SearchService.normalize('HELLO')).toBe('hello'));
    it('removes diacritics', () => expect(SearchService.normalize('caf\u00e9')).toBe('cafe'));
    it('replaces special chars', () => expect(SearchService.normalize('hello@world.com')).toBe('hello world com'));
    it('handles empty', () => expect(SearchService.normalize('')).toBe(''));
    it('handles undefined', () => expect(SearchService.normalize(undefined as any)).toBe(''));
  });

  describe('tokenize', () => {
    it('generates word tokens', () => {
      const t = SearchService.tokenize(['hello world']);
      expect(t).toContain('hello'); expect(t).toContain('world');
    });
    it('generates prefix tokens', () => {
      const t = SearchService.tokenize(['hello']);
      expect(t).toContain('he'); expect(t).toContain('hel'); expect(t).toContain('hello');
    });
    it('limits to 256', () => {
      const f = Array.from({length:100},(_,i)=>'word'+i+' another'+i);
      expect(SearchService.tokenize(f).length).toBeLessThanOrEqual(256);
    });
    it('deduplicates', () => {
      expect(SearchService.tokenize(['hello','hello']).filter(t=>t==='hello').length).toBe(1);
    });
    it('handles empty fields', () => expect(SearchService.tokenize(['','',''])).toEqual([]));
  });

  describe('isSubsequence', () => {
    it('matches', () => expect(SearchService.isSubsequence('hlo','hello')).toBe(true));
    it('rejects longer needle', () => expect(SearchService.isSubsequence('hello world','hello')).toBe(false));
    it('rejects non-subsequence', () => expect(SearchService.isSubsequence('olh','hello')).toBe(false));
    it('matches empty needle', () => expect(SearchService.isSubsequence('','hello')).toBe(true));
    it('rejects empty haystack', () => expect(SearchService.isSubsequence('a','')).toBe(false));
  });

  describe('searchDecrypted', () => {
    const entries: VaultEntry[] = [
      makeEntry({id:1,title:'Google',username:'user@gmail.com',website:'google.com',tags:['search']}),
      makeEntry({id:2,title:'GitHub',username:'dev@github.com',website:'github.com',tags:['code']}),
      makeEntry({id:3,title:'Netflix',username:'user@netflix.com',website:'netflix.com',tags:['streaming']}),
    ];
    it('returns all for empty query', () => expect(SearchService.searchDecrypted(entries,'')).toHaveLength(3));
    it('finds by title prefix', () => {
      const r = SearchService.searchDecrypted(entries,'Goo');
      expect(r.length).toBeGreaterThanOrEqual(1); expect(r[0].title).toBe('Google');
    });
    it('finds by username', () => expect(SearchService.searchDecrypted(entries,'dev@github').length).toBeGreaterThanOrEqual(1));
    it('returns empty for no match', () => expect(SearchService.searchDecrypted(entries,'zzzzz')).toHaveLength(0));
    it('scopes to title', () => expect(SearchService.searchDecrypted(entries,'dev@github','title')).toHaveLength(0));
    it('scopes to username', () => expect(SearchService.searchDecrypted(entries,'Google','username')).toHaveLength(0));
    it('scopes to tags', () => expect(SearchService.searchDecrypted(entries,'Google','tags')).toHaveLength(0));
    it('handles empty array', () => expect(SearchService.searchDecrypted([], 'test')).toHaveLength(0));
    it('finds by category', () => expect(SearchService.searchDecrypted(entries,'General').length).toBeGreaterThanOrEqual(1));
    it('finds by tag', () => {
      const r = SearchService.searchDecrypted(entries,'streaming');
      expect(r.length).toBeGreaterThanOrEqual(1); expect(r[0].title).toBe('Netflix');
    });
    it('handles whitespace query', () => expect(SearchService.searchDecrypted(entries,'   ')).toHaveLength(3));
    it('finds by title contains', () => {
      const r = SearchService.searchDecrypted(entries,'hub');
      expect(r.some(e=>e.title==='GitHub')).toBe(true);
    });
    it('multi-word query', () => expect(SearchService.searchDecrypted(entries,'Git code').length).toBeGreaterThanOrEqual(1));
  });
});
`,
  'utf8'
);

// VaultAuthService test
fs.writeFileSync(
  path.join(dir, 'VaultAuthService.test.ts'),
  `// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VaultAuthService } from '../vault/VaultAuthService';

const mockArgon2Params = {
  iterations: 4,
  memorySize: 131072,
  parallelism: 1,
  hashLength: 32,
};

vi.mock('../Argon2WorkerService', () => ({
  Argon2WorkerService: {
    deriveHex: vi.fn(async () => 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'),
    deriveBinary: vi.fn(async () => {
      const buf = new Uint8Array(32);
      crypto.getRandomValues(buf);
      return buf;
    }),
  },
}));

describe('VaultAuthService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('calibrateArgon2Params', () => {
    it('returns default params', () => {
      const p = VaultAuthService.calibrateArgon2Params();
      expect(p.iterations).toBeGreaterThanOrEqual(3);
      expect(p.memorySize).toBeGreaterThanOrEqual(32768);
      expect(p.hashLength).toBe(32);
    });

    it('adjusts for low memory devices', () => {
      Object.defineProperty(navigator, 'deviceMemory', { value: 1, configurable: true });
      Object.defineProperty(navigator, 'hardwareConcurrency', { value: 2, configurable: true });
      const p = VaultAuthService.calibrateArgon2Params();
      expect(p.memorySize).toBe(32768);
      expect(p.iterations).toBe(3);
    });

    it('adjusts for 4GB devices', () => {
      Object.defineProperty(navigator, 'deviceMemory', { value: 4, configurable: true });
      const p = VaultAuthService.calibrateArgon2Params();
      expect(p.memorySize).toBe(65536);
    });

    it('adjusts parallelism for 8+ cores', () => {
      Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8, configurable: true });
      const p = VaultAuthService.calibrateArgon2Params();
      expect(p.parallelism).toBe(2);
    });
  });

  describe('hashPasswordPBKDF2', () => {
    it('produces base64 hash', async () => {
      const salt = new Uint8Array(16);
      const hash = await VaultAuthService.hashPasswordPBKDF2('password123', salt);
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('produces different hashes for different passwords', async () => {
      const salt = new Uint8Array(16);
      const h1 = await VaultAuthService.hashPasswordPBKDF2('pass1', salt);
      const h2 = await VaultAuthService.hashPasswordPBKDF2('pass2', salt);
      expect(h1).not.toBe(h2);
    });

    it('produces same hash for same inputs', async () => {
      const salt = new Uint8Array(16);
      const h1 = await VaultAuthService.hashPasswordPBKDF2('same', salt);
      const h2 = await VaultAuthService.hashPasswordPBKDF2('same', salt);
      expect(h1).toBe(h2);
    });
  });

  describe('hashPasswordArgon2', () => {
    it('calls Argon2WorkerService.deriveHex', async () => {
      const salt = new Uint8Array(16);
      const result = await VaultAuthService.hashPasswordArgon2('password', salt, mockArgon2Params);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('createAuthCredential', () => {
    it('creates argon2id credential', async () => {
      const cred = await VaultAuthService.createAuthCredential('password123', mockArgon2Params);
      expect(cred.scheme).toBe('argon2id-v1');
      expect(cred.salt).toBeTruthy();
      expect(cred.verificationHash).toBeTruthy();
      expect(cred.argon2).toBeDefined();
      expect(cred.argon2?.iterations).toBe(4);
    });
  });

  describe('verifyPassword', () => {
    it('verifies correct password with argon2', async () => {
      const cred = await VaultAuthService.createAuthCredential('mypassword', mockArgon2Params);
      const valid = await VaultAuthService.verifyPassword('mypassword', cred, mockArgon2Params);
      expect(valid).toBe(true);
    });

    it('rejects wrong password with argon2', async () => {
      const cred = await VaultAuthService.createAuthCredential('mypassword', mockArgon2Params);
      const valid = await VaultAuthService.verifyPassword('wrongpassword', cred, mockArgon2Params);
      expect(valid).toBe(false);
    });

    it('verifies correct password with PBKDF2', async () => {
      const salt = new Uint8Array(16);
      const hash = await VaultAuthService.hashPasswordPBKDF2('testpass', salt);
      const cred = { scheme: 'pbkdf2', verificationHash: hash, salt: btoa(String.fromCharCode(...salt)), iterations: 100000 };
      const valid = await VaultAuthService.verifyPassword('testpass', cred as any, mockArgon2Params);
      expect(valid).toBe(true);
    });

    it('rejects wrong password with PBKDF2', async () => {
      const salt = new Uint8Array(16);
      const hash = await VaultAuthService.hashPasswordPBKDF2('testpass', salt);
      const cred = { scheme: 'pbkdf2', verificationHash: hash, salt: btoa(String.fromCharCode(...salt)), iterations: 100000 };
      const valid = await VaultAuthService.verifyPassword('wrongpass', cred as any, mockArgon2Params);
      expect(valid).toBe(false);
    });
  });

  describe('migrateCredentialToArgon2', () => {
    it('returns same credential if already argon2id', async () => {
      const cred = await VaultAuthService.createAuthCredential('pass', mockArgon2Params);
      const migrated = await VaultAuthService.migrateCredentialToArgon2('pass', cred, mockArgon2Params);
      expect(migrated).toBe(cred);
    });

    it('migrates PBKDF2 credential to argon2', async () => {
      const salt = new Uint8Array(16);
      const hash = await VaultAuthService.hashPasswordPBKDF2('pass123', salt);
      const oldCred = { scheme: 'pbkdf2', verificationHash: hash, salt: btoa(String.fromCharCode(...salt)), iterations: 100000 };
      const migrated = await VaultAuthService.migrateCredentialToArgon2('pass123', oldCred as any, mockArgon2Params);
      expect(migrated.scheme).toBe('argon2id-v1');
      expect(migrated.argon2).toBeDefined();
    });
  });

  describe('deriveMasterKey', () => {
    it('derives AES key from password and secret', async () => {
      const result = await VaultAuthService.deriveMasterKey({
        password: 'mypass', secretKey: 'mysecret', params: mockArgon2Params,
      });
      expect(result.aesKey).toBeInstanceOf(CryptoKey);
      expect(result.saltB64).toBeTruthy();
      expect(result.sensitiveMaterial).toBeInstanceOf(Uint8Array);
    });

    it('uses provided salt', async () => {
      const salt = new Uint8Array(16);
      crypto.getRandomValues(salt);
      const saltB64 = btoa(String.fromCharCode(...salt));
      const result = await VaultAuthService.deriveMasterKey({
        password: 'mypass', secretKey: 'mysecret', saltB64, params: mockArgon2Params,
      });
      expect(result.saltB64).toBe(saltB64);
    });

    it('produces different keys for different passwords', async () => {
      const r1 = await VaultAuthService.deriveMasterKey({ password: 'pass1', secretKey: 'secret', params: mockArgon2Params });
      const r2 = await VaultAuthService.deriveMasterKey({ password: 'pass2', secretKey: 'secret', params: mockArgon2Params });
      expect(r1.saltB64).not.toBe(r2.saltB64);
    });
  });

  describe('sha256Hex', () => {
    it('produces hex string', async () => {
      const hash = await VaultAuthService.sha256Hex('test');
      expect(hash).toMatch(/^[a-f0-9]+$/);
      expect(hash.length).toBe(64);
    });

    it('produces same hash for same input', async () => {
      const h1 = await VaultAuthService.sha256Hex('hello');
      const h2 = await VaultAuthService.sha256Hex('hello');
      expect(h1).toBe(h2);
    });

    it('produces different hash for different input', async () => {
      const h1 = await VaultAuthService.sha256Hex('hello');
      const h2 = await VaultAuthService.sha256Hex('world');
      expect(h1).not.toBe(h2);
    });
  });
});
`,
  'utf8'
);

// VaultEntryService test
fs.writeFileSync(
  path.join(dir, 'VaultEntryService.test.ts'),
  `// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VaultEntryService } from '../vault/VaultEntryService';
import type { VaultEntry } from '../../vaultService';

async function createAesKey(): Promise<CryptoKey> {
  return window.crypto.subtle.importKey(
    'raw', new Uint8Array(32), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
  );
}

function makeEntry(overrides: Partial<VaultEntry> = {}): Partial<VaultEntry> {
  return {
    title: 'Test Site',
    username: 'user@test.com',
    pass: 'MyPassword123',
    website: 'https://example.com',
    category: 'General',
    tags: ['test'],
    ...overrides,
  };
}

function createMockIDB() {
  const store = new Map();
  const mockStore: any = {
    get: vi.fn(async (id) => store.get(id)),
    put: vi.fn(async (v) => { store.set(v.id, v); }),
    count: vi.fn(async () => store.size),
    getAll: vi.fn(async () => Array.from(store.values())),
  };
  const mockTx: any = { objectStore: vi.fn(() => mockStore), done: Promise.resolve() };
  return {
    store,
    mockDb: {
      transaction: vi.fn(() => mockTx),
      put: vi.fn(async (s, v) => { store.set(v.id, v); }),
      get: vi.fn(async (s, id) => store.get(id)),
      getAll: vi.fn(async () => Array.from(store.values())),
      count: vi.fn(async () => store.size),
    } as any,
  };
}

function createMockSQLite() {
  const store = new Map();
  return {
    store,
    mockDb: {
      putPassword: vi.fn((e) => store.set(e.id, e)),
      getAllPasswords: vi.fn(() => Array.from(store.values())),
      putMetadata: vi.fn((k, v) => store.set(k, v)),
      getMetadata: vi.fn((k) => store.get(k) || null),
      countPasswords: vi.fn(() => store.size),
      flushToOPFS: vi.fn(async () => {}),
    } as any,
  };
}

const defaultDeps = {
  generateEntryId: () => Date.now(),
  calculateStrength: (p: string) => Math.min(p.length * 10, 100),
  buildMetadataAtRest: async (title: string, username: string, website: string, category: string, tags: string[]) => ({
    title, username, website, category, tags,
    encrypted_title: 'enc_title', title_iv: 'iv_title',
    encrypted_username: 'enc_user', username_iv: 'iv_user',
    encrypted_category: 'enc_cat', category_iv: 'iv_cat',
    encrypted_website: 'enc_web', website_iv: 'iv_web',
    encrypted_tags: 'enc_tags', tags_iv: 'iv_tags',
    search_index: ['test'],
  }),
  normalizeCardDetails: (d: any) => d || null,
  normalizeIdentityDetails: (d: any) => d || null,
  encryptAttachmentMetadataList: async (a: any) => a,
};

describe('VaultEntryService', () => {
  let aesKey: CryptoKey;
  let idb: ReturnType<typeof createMockIDB>;
  let sqlite: ReturnType<typeof createMockSQLite>;

  beforeEach(async () => {
    aesKey = await createAesKey();
    idb = createMockIDB();
    sqlite = createMockSQLite();
  });

  describe('addPassword', () => {
    it('adds entry to IDB', async () => {
      const id = await VaultEntryService.addPassword({
        entry: makeEntry(), aesKey, opfsMockDb: idb.mockDb, sqliteDb: null, useSQLite: false, ...defaultDeps,
      });
      expect(id).toBeGreaterThan(0);
    });

    it('adds entry to SQLite', async () => {
      const id = await VaultEntryService.addPassword({
        entry: makeEntry(), aesKey, opfsMockDb: null, sqliteDb: sqlite.mockDb, useSQLite: true, ...defaultDeps,
      });
      expect(id).toBeGreaterThan(0);
      expect(sqlite.mockDb.putPassword).toHaveBeenCalled();
    });

    it('throws when aesKey is null', async () => {
      await expect(VaultEntryService.addPassword({
        entry: makeEntry(), aesKey: null, opfsMockDb: idb.mockDb, sqliteDb: null, useSQLite: false, ...defaultDeps,
      })).rejects.toThrow('Vault not initialized');
    });

    it('throws when both dbs are null', async () => {
      await expect(VaultEntryService.addPassword({
        entry: makeEntry(), aesKey, opfsMockDb: null, sqliteDb: null, useSQLite: false, ...defaultDeps,
      })).rejects.toThrow('Vault not initialized');
    });

    it('encrypts TOTP secret when provided', async () => {
      const id = await VaultEntryService.addPassword({
        entry: makeEntry({ totpSecret: 'JBSWY3DPEHPK3PXP', totp_issuer: 'Test', totp_algorithm: 'SHA-1', totp_digits: 6, totp_period: 30 }),
        aesKey, opfsMockDb: idb.mockDb, sqliteDb: null, useSQLite: false, ...defaultDeps,
      });
      expect(id).toBeGreaterThan(0);
    });

    it('encrypts notes when provided', async () => {
      const id = await VaultEntryService.addPassword({
        entry: makeEntry({ notes: 'My secret notes' }),
        aesKey, opfsMockDb: idb.mockDb, sqliteDb: null, useSQLite: false, ...defaultDeps,
      });
      expect(id).toBeGreaterThan(0);
    });

    it('handles entry with passkey metadata', async () => {
      const id = await VaultEntryService.addPassword({
        entry: makeEntry({ passkeyMetadata: { credentialId: 'abc123' } as any }),
        aesKey, opfsMockDb: idb.mockDb, sqliteDb: null, useSQLite: false, ...defaultDeps,
      });
      expect(id).toBeGreaterThan(0);
    });

    it('handles entry with card details', async () => {
      const id = await VaultEntryService.addPassword({
        entry: makeEntry({ cardDetails: { cardNumber: '4111111111111111', expiry: '12/30' } as any }),
        aesKey, opfsMockDb: idb.mockDb, sqliteDb: null, useSQLite: false, ...defaultDeps,
      });
      expect(id).toBeGreaterThan(0);
    });

    it('handles entry with identity details', async () => {
      const id = await VaultEntryService.addPassword({
        entry: makeEntry({ identityDetails: { fullName: 'John Doe' } as any }),
        aesKey, opfsMockDb: idb.mockDb, sqliteDb: null, useSQLite: false, ...defaultDeps,
      });
      expect(id).toBeGreaterThan(0);
    });

    it('handles entry with attachments', async () => {
      const id = await VaultEntryService.addPassword({
        entry: makeEntry({ attachments: [{ id: 'att1', name: 'file.pdf', size: 1024 }] as any }),
        aesKey, opfsMockDb: idb.mockDb, sqliteDb: null, useSQLite: false, ...defaultDeps,
      });
      expect(id).toBeGreaterThan(0);
    });

    it('uses custom entry id when provided', async () => {
      const id = await VaultEntryService.addPassword({
        entry: makeEntry({ id: 42 }),
        aesKey, opfsMockDb: idb.mockDb, sqliteDb: null, useSQLite: false, ...defaultDeps,
      });
      expect(id).toBe(42);
    });

    it('calculates strength', async () => {
      const id = await VaultEntryService.addPassword({
        entry: makeEntry({ pass: 'short' }),
        aesKey, opfsMockDb: idb.mockDb, sqliteDb: null, useSQLite: false, ...defaultDeps,
      });
      expect(id).toBeGreaterThan(0);
    });
  });

  describe('getPasswords', () => {
    it('returns empty when no aesKey', async () => {
      const result = await VaultEntryService.getPasswords({
        searchQuery: '', categoryFilter: '', isTrash: false, searchScope: 'all',
        aesKey: null, opfsMockDb: idb.mockDb, sqliteDb: null, useSQLite: false,
        decryptedEntriesCache: null,
        prepareEntryMetadataForUse: async (e) => ({ uiEntry: e }),
        hydrateRichSensitiveFields: async () => {},
      });
      expect(result.entries).toEqual([]);
    });

    it('returns empty when no db', async () => {
      const result = await VaultEntryService.getPasswords({
        searchQuery: '', categoryFilter: '', isTrash: false, searchScope: 'all',
        aesKey, opfsMockDb: null, sqliteDb: null, useSQLite: false,
        decryptedEntriesCache: null,
        prepareEntryMetadataForUse: async (e) => ({ uiEntry: e }),
        hydrateRichSensitiveFields: async () => {},
      });
      expect(result.entries).toEqual([]);
    });

    it('uses cache when available', async () => {
      const cachedEntry = makeEntry({ id: 1, title: 'Cached' }) as VaultEntry;
      const result = await VaultEntryService.getPasswords({
        searchQuery: '', categoryFilter: '', isTrash: false, searchScope: 'all',
        aesKey, opfsMockDb: idb.mockDb, sqliteDb: null, useSQLite: false,
        decryptedEntriesCache: [cachedEntry],
        prepareEntryMetadataForUse: async (e) => ({ uiEntry: e }),
        hydrateRichSensitiveFields: async () => {},
      });
      expect(result.entries.length).toBeGreaterThanOrEqual(1);
    });

    it('filters trash entries', async () => {
      const trashedEntry = makeEntry({ id: 1, title: 'Trashed', deletedAt: '2026-01-01' }) as VaultEntry;
      const activeEntry = makeEntry({ id: 2, title: 'Active' }) as VaultEntry;
      const result = await VaultEntryService.getPasswords({
        searchQuery: '', categoryFilter: '', isTrash: true, searchScope: 'all',
        aesKey, opfsMockDb: idb.mockDb, sqliteDb: null, useSQLite: false,
        decryptedEntriesCache: [trashedEntry, activeEntry],
        prepareEntryMetadataForUse: async (e) => ({ uiEntry: e }),
        hydrateRichSensitiveFields: async () => {},
      });
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].title).toBe('Trashed');
    });

    it('filters by category', async () => {
      const entries = [
        makeEntry({ id: 1, title: 'Work', category: 'Work' }) as VaultEntry,
        makeEntry({ id: 2, title: 'Social', category: 'Social' }) as VaultEntry,
      ];
      const result = await VaultEntryService.getPasswords({
        searchQuery: '', categoryFilter: 'Work', isTrash: false, searchScope: 'all',
        aesKey, opfsMockDb: idb.mockDb, sqliteDb: null, useSQLite: false,
        decryptedEntriesCache: entries,
        prepareEntryMetadataForUse: async (e) => ({ uiEntry: e }),
        hydrateRichSensitiveFields: async () => {},
      });
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].title).toBe('Work');
    });

    it('filters by tag (category starts with #)', async () => {
      const entries = [
        makeEntry({ id: 1, title: 'Tagged', tags: ['important'] }) as VaultEntry,
        makeEntry({ id: 2, title: 'Untagged', tags: ['other'] }) as VaultEntry,
      ];
      const result = await VaultEntryService.getPasswords({
        searchQuery: '', categoryFilter: '#important', isTrash: false, searchScope: 'all',
        aesKey, opfsMockDb: idb.mockDb, sqliteDb: null, useSQLite: false,
        decryptedEntriesCache: entries,
        prepareEntryMetadataForUse: async (e) => ({ uiEntry: e }),
        hydrateRichSensitiveFields: async () => {},
      });
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].title).toBe('Tagged');
    });

    it('searches within entries', async () => {
      const entries = [
        makeEntry({ id: 1, title: 'Google' }) as VaultEntry,
        makeEntry({ id: 2, title: 'GitHub' }) as VaultEntry,
      ];
      const result = await VaultEntryService.getPasswords({
        searchQuery: 'Google', categoryFilter: '', isTrash: false, searchScope: 'all',
        aesKey, opfsMockDb: idb.mockDb, sqliteDb: null, useSQLite: false,
        decryptedEntriesCache: entries,
        prepareEntryMetadataForUse: async (e) => ({ uiEntry: e }),
        hydrateRichSensitiveFields: async () => {},
      });
      expect(result.entries.length).toBeGreaterThanOrEqual(1);
      expect(result.entries[0].title).toBe('Google');
    });
  });
});
`,
  'utf8'
);

// Argon2WorkerService test
fs.writeFileSync(
  path.join(dir, 'Argon2WorkerService.test.ts'),
  `// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { Argon2WorkerService } from '../Argon2WorkerService';

describe('Argon2WorkerService', () => {
  const testParams = {
    password: 'test-password',
    salt: new Uint8Array(16),
    parallelism: 1,
    iterations: 2,
    memorySize: 65536,
    hashLength: 32,
  };

  describe('deriveHex', () => {
    it('produces hex string', async () => {
      const result = await Argon2WorkerService.deriveHex(testParams);
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^[a-f0-9]+$/);
      expect(result.length).toBe(64);
    });

    it('produces same result for same input', async () => {
      const r1 = await Argon2WorkerService.deriveHex(testParams);
      const r2 = await Argon2WorkerService.deriveHex(testParams);
      expect(r1).toBe(r2);
    });

    it('produces different result for different password', async () => {
      const r1 = await Argon2WorkerService.deriveHex(testParams);
      const r2 = await Argon2WorkerService.deriveHex({ ...testParams, password: 'other' });
      expect(r1).not.toBe(r2);
    });

    it('produces different result for different salt', async () => {
      const salt2 = new Uint8Array(16);
      crypto.getRandomValues(salt2);
      const r1 = await Argon2WorkerService.deriveHex(testParams);
      const r2 = await Argon2WorkerService.deriveHex({ ...testParams, salt: salt2 });
      expect(r1).not.toBe(r2);
    });
  });

  describe('deriveBinary', () => {
    it('produces Uint8Array', async () => {
      const result = await Argon2WorkerService.deriveBinary(testParams);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(32);
    });

    it('produces same result for same input', async () => {
      const r1 = await Argon2WorkerService.deriveBinary(testParams);
      const r2 = await Argon2WorkerService.deriveBinary(testParams);
      expect(r1).toEqual(r2);
    });
  });

  describe('derive', () => {
    it('produces hex output for hex type', async () => {
      const result = await Argon2WorkerService.derive({ ...testParams, outputType: 'hex' });
      expect(typeof result).toBe('string');
    });

    it('produces binary output for binary type', async () => {
      const result = await Argon2WorkerService.derive({ ...testParams, outputType: 'binary' });
      expect(result).toBeInstanceOf(Uint8Array);
    });
  });
});
`,
  'utf8'
);

console.log('All test files written successfully');

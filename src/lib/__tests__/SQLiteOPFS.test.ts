// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sql.js', () => ({
  default: vi.fn(),
}));

vi.mock('sql.js/dist/sql-wasm.wasm?url', () => ({
  default: 'mock-sql-wasm-url',
}));

import { SQLiteOPFS, clearAllOPFSFiles, deleteOPFSFile, isOPFSAvailable } from '../SQLiteOPFS';

type FakeStmtRow = Record<string, unknown>;

class FakeStatement {
  private index = -1;

  constructor(private readonly rows: FakeStmtRow[]) {}

  bind(): void {}

  step(): boolean {
    this.index += 1;
    return this.index < this.rows.length;
  }

  getAsObject(): FakeStmtRow {
    return this.rows[this.index] || {};
  }

  free(): void {}

  run(): void {}
}

class FakeDb {
  public passwords = new Map<number, Record<string, unknown>>();
  public metadata = new Map<string, string>();
  public attachments = new Map<
    string,
    { id: string; entry_id: number; iv: Uint8Array; encrypted_data: Uint8Array }
  >();
  public lastSql = '';
  public sqlHistory: string[] = [];
  public close = vi.fn();

  run(sql: string): void {
    this.lastSql = sql;
    this.sqlHistory.push(sql);

    // Improved Parser for MUTATION TESTING
    if (sql.startsWith('INSERT OR REPLACE INTO passwords')) {
      // Basic extraction of ID and Title for validation
      const idMatch = sql.match(/VALUES \(([^,]+),/);
      const titleMatch = sql.match(/VALUES \([^,]+, '((?:''|[^'])*)'/);
      const id = idMatch ? Number(idMatch[1].replace(/'/g, '')) : Date.now();
      const title = titleMatch ? titleMatch[1].replace(/''/g, "'") : 'Untitled';
      const hasProdTag = sql.includes('["prod"]');

      this.passwords.set(id, {
        id,
        title,
        tags: hasProdTag ? '["prod"]' : '[]',
        attachments: '[]',
        search_index: '[]',
      });
    } else if (sql.startsWith('DELETE FROM passwords WHERE id = ')) {
      const id = Number(sql.slice('DELETE FROM passwords WHERE id = '.length));
      this.passwords.delete(id);
    } else if (sql === 'DELETE FROM passwords') {
      this.passwords.clear();
    } else if (sql === 'DELETE FROM vault_metadata') {
      this.metadata.clear();
    } else if (sql === 'DELETE FROM attachments') {
      this.attachments.clear();
    } else if (sql.startsWith('DELETE FROM attachments WHERE id = ')) {
      const quoted = sql.match(/'([^']+)'/);
      if (quoted) this.attachments.delete(quoted[1]);
    } else if (sql.startsWith('DELETE FROM vault_metadata WHERE id = ')) {
      const quoted = sql.match(/'([^']+)'/);
      if (quoted) this.metadata.delete(quoted[1]);
    } else if (sql.startsWith('INSERT OR REPLACE INTO vault_metadata')) {
      const matches = [...sql.matchAll(/'((?:''|[^'])*)'/g)].map((match) =>
        match[1].replace(/''/g, "'")
      );
      if (matches.length >= 2) {
        this.metadata.set(matches[0], matches[1]);
      }
    }
  }

  prepare(sql: string): FakeStatement {
    if (sql === 'SELECT * FROM passwords') {
      return new FakeStatement(Array.from(this.passwords.values()));
    }
    if (sql === 'SELECT iv, encrypted_data FROM attachments WHERE id = ?') {
      return new FakeStatement(Array.from(this.attachments.values()));
    }
    if (sql === 'SELECT id FROM attachments WHERE entry_id = ?') {
      return new FakeStatement(Array.from(this.attachments.values()));
    }
    if (sql.startsWith('INSERT OR REPLACE INTO attachments')) {
      const attachments = this.attachments;
      const stmt = new FakeStatement([]);
      return {
        ...stmt,
        run(values?: unknown[]) {
          if (!values) return;
          attachments.set(String(values[0]), {
            id: String(values[0]),
            entry_id: Number(values[1]),
            iv: new Uint8Array(values[2] as Uint8Array),
            encrypted_data: new Uint8Array(values[3] as Uint8Array),
          });
        },
        free() {
          stmt.free();
        },
      } as unknown as FakeStatement;
    }
    return new FakeStatement([]);
  }

  exec(sql: string): Array<{ values: unknown[][] }> {
    if (sql === 'SELECT COUNT(*) as count FROM passwords') {
      return [{ values: [[this.passwords.size]] }];
    }

    if (sql.startsWith('SELECT data FROM vault_metadata WHERE id = ')) {
      const quoted = sql.match(/'([^']+)'/);
      const value = quoted ? this.metadata.get(quoted[1]) : null;
      return value ? [{ values: [[value]] }] : [];
    }

    if (sql === 'PRAGMA table_info(passwords)') {
      // Mock limited columns to trigger migration
      return [
        {
          values: [
            [0, 'id', 'INTEGER', 0, null, 1],
            [1, 'title', 'TEXT', 0, null, 0],
          ],
        },
      ];
    }

    return [];
  }

  export(): Uint8Array {
    return new Uint8Array([1, 2, 3]);
  }

  getRowsModified(): number {
    return 1;
  }
}

describe('SQLiteOPFS', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {},
    });
    vi.clearAllMocks();
  });

  it('reports OPFS availability and handles file deletion helpers', async () => {
    // Edge case 1: NO storage
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { storage: {} },
    });
    expect(isOPFSAvailable()).toBe(false);

    // Edge case 2: NO navigator
    const tempNav = globalThis.navigator;
    // @ts-ignore
    delete globalThis.navigator;
    expect(isOPFSAvailable()).toBe(false);
    globalThis.navigator = tempNav;

    const removeEntry = vi.fn().mockImplementation((name) => {
      if (name === 'throws.sqlite') throw new Error('File not found');
    });

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        storage: {
          getDirectory: vi.fn().mockResolvedValue({
            removeEntry,
            entries: async function* () {
              yield ['vault-a.sqlite'];
              yield ['notes.txt'];
              yield ['vault-b.sqlite'];
              yield ['throws.sqlite'];
            },
          }),
        },
      },
    });

    expect(isOPFSAvailable()).toBe(true);

    // Success deletion
    await deleteOPFSFile('vault-a.sqlite');
    expect(removeEntry).toHaveBeenCalledWith('vault-a.sqlite');

    // Test catch block for deleteOPFSFile
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await deleteOPFSFile('throws.sqlite'); // should swallow error

    // Test clearAll discarding .txt, failing on throws.sqlite, returning successfully
    await clearAllOPFSFiles();

    expect(removeEntry).toHaveBeenCalledWith('vault-b.sqlite');
    expect(removeEntry).not.toHaveBeenCalledWith('notes.txt');
    consoleSpy.mockRestore();
  });

  it('stores, reads and updates password and metadata records correctly with escaping', () => {
    const sqlite = new SQLiteOPFS('coverage-db');
    const fakeDb = new FakeDb();
    (sqlite as unknown as { db: FakeDb }).db = fakeDb;

    // Test with single quotes to verify sqlVal escaping mutant
    const titleWithQuote = "O'Reilly's Vault";
    sqlite.putPassword({
      id: 1,
      title: titleWithQuote,
      username: 'alice',
      category: 'General',
      website: 'https://example.com',
      tags: ['prod'],
      search_index: ['hash-1'],
      attachments: [{ id: 'att-1', name: 'Doc', type: 'text/plain', size: 1 }],
      updated_at: '2026-03-17T12:00:00.000Z',
    });

    // Check if the SQL actually escaped the title correctly
    expect(fakeDb.lastSql).toContain("'O''Reilly''s Vault'");

    sqlite.putMetadata('meta-1', { ok: true, name: "Special ' Name" });
    expect(fakeDb.lastSql).toContain("Special '' Name");

    sqlite.updatePasswordField(1, 'notes_iv', 'iv-1');

    const passwords = sqlite.getAllPasswords();
    const metadata = sqlite.getMetadata<{ ok: boolean }>('meta-1');

    expect(passwords[0]?.title).toBe(titleWithQuote);
    expect(passwords[0]?.tags).toEqual(['prod']);
    expect(metadata?.ok).toBe(true);
    expect(sqlite.countPasswords()).toBe(1);
    expect(fakeDb.sqlHistory).toContain('ALTER TABLE passwords ADD COLUMN notes_iv TEXT');
  });

  it('handles JSON parsing errors gracefully in getAllPasswords', () => {
    const sqlite = new SQLiteOPFS('error-db');
    const fakeDb = new FakeDb();
    (sqlite as unknown as { db: FakeDb }).db = fakeDb;

    fakeDb.passwords.set(1, {
      id: 1,
      tags: 'invalid-json',
      attachments: '{ bad: json }',
      search_index: null,
    });

    const passwords = sqlite.getAllPasswords();
    expect(passwords[0].tags).toEqual([]);
    expect(passwords[0].attachments).toEqual([]);
    expect(passwords[0].search_index).toEqual([]);
  });

  it('handles metadata parsing errors gracefully', () => {
    const sqlite = new SQLiteOPFS('error-db');
    const fakeDb = new FakeDb();
    (sqlite as unknown as { db: FakeDb }).db = fakeDb;

    fakeDb.metadata.set('corrupt', 'not-json');
    const result = sqlite.getMetadata('corrupt');
    expect(result).toBeNull();
  });

  it('stores, reads and deletes attachment records', () => {
    const sqlite = new SQLiteOPFS('coverage-db');
    const fakeDb = new FakeDb();
    (sqlite as unknown as { db: FakeDb }).db = fakeDb;

    sqlite.putAttachment('att-1', 7, new Uint8Array([1, 2]), new Uint8Array([3, 4]).buffer);

    const attachment = sqlite.getAttachment('att-1');
    const attachmentIds = sqlite.getAttachmentsByEntry(7);

    expect(Array.from(attachment?.iv || [])).toEqual([1, 2]);
    expect(Array.from(attachment?.encrypted_data || [])).toEqual([3, 4]);
    expect(attachmentIds).toContain('att-1');

    sqlite.deleteAttachment('att-1');
    expect(fakeDb.attachments.has('att-1')).toBe(false);
  });

  it('flushes, wipes and closes the database cleanly', async () => {
    vi.useFakeTimers();
    const sqlite = new SQLiteOPFS('coverage-db');
    const fakeDb = new FakeDb();
    (sqlite as unknown as { db: FakeDb }).db = fakeDb;
    const persistSpy = vi.spyOn(sqlite, 'persistToOPFS').mockResolvedValue();

    sqlite.schedulePersist();
    await vi.runAllTimersAsync();
    expect(persistSpy).toHaveBeenCalledTimes(1);

    await sqlite.flushToOPFS();
    await sqlite.wipeAll();
    await sqlite.close();

    expect(fakeDb.close).toHaveBeenCalledTimes(1);
    expect(sqlite.isOpen).toBe(false);

    vi.useRealTimers();
  });

  it('initializes and migrates schema with all required columns, and falls back if OPFS fails', async () => {
    const sqlite = new SQLiteOPFS('init-test');

    const mockFile = {
      // Throw an error on getFile to trigger the readOPFSFile catch block -> return null -> new Database()
      getFile: vi.fn().mockRejectedValue(new Error('File access denied')),
      createWritable: vi.fn().mockResolvedValue({
        write: vi.fn(),
        close: vi.fn(),
      }),
    };
    const mockDir = {
      getFileHandle: vi.fn().mockResolvedValue(mockFile),
      removeEntry: vi.fn(),
    };
    Object.defineProperty(navigator, 'storage', {
      value: { getDirectory: vi.fn().mockResolvedValue(mockDir) },
      configurable: true,
    });

    class Database extends FakeDb {}
    const initSqlJsMock = await import('sql.js');
    (initSqlJsMock.default as any).mockResolvedValue({ Database: Database });

    await sqlite.open();

    expect(sqlite.isOpen).toBe(true);
    // Verify migration triggered for ALL missing columns to kill array/literal mutations
    const expectedCols = [
      'encrypted_title',
      'title_iv',
      'encrypted_username',
      'username_iv',
      'encrypted_website',
      'website_iv',
      'encrypted_category',
      'category_iv',
      'encrypted_tags',
      'tags_iv',
      'search_index',
      'deleted_at',
      'totp_secret',
      'totp_iv',
      'totp_issuer',
      'totp_algorithm',
      'totp_digits',
      'totp_period',
      'encrypted_notes',
      'notes_iv',
      'encrypted_passkey_meta',
      'passkey_meta_iv',
      'encrypted_card_details',
      'card_details_iv',
      'encrypted_identity_details',
      'identity_details_iv',
    ];

    // Some are integers, some text. Let's just check the column name is added safely.
    for (const col of expectedCols) {
      expect(
        sqlite['db']?.sqlHistory.some((sql) =>
          sql.startsWith(`ALTER TABLE passwords ADD COLUMN ${col}`)
        )
      ).toBe(true);
    }

    // Verify the giant SCHEMA_SQL hasn't been mutated
    const schemaSql = sqlite['db']?.sqlHistory.find((sql) =>
      sql.includes('CREATE TABLE IF NOT EXISTS passwords')
    );
    expect(schemaSql).toBeDefined();
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS vault_metadata');
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS attachments');
    expect(schemaSql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_passwords_category ON passwords(category);'
    );
    expect(schemaSql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_passwords_title ON passwords(title);'
    );
    expect(schemaSql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_attachments_entry ON attachments(entry_id);'
    );
    expect(schemaSql).toContain("search_index TEXT DEFAULT '[]'");
    expect(schemaSql).toContain("tags TEXT DEFAULT '[]'");
    expect(schemaSql).toContain("attachments TEXT DEFAULT '[]'");
    expect(schemaSql).toContain('deleted_at TEXT');
  });

  it('handles null values correctly in sqlVal', () => {
    const sqlite = new SQLiteOPFS('null-db');
    const fakeDb = new FakeDb();
    (sqlite as unknown as { db: FakeDb }).db = fakeDb;

    sqlite.putMetadata('null-test', null);
    expect(fakeDb.lastSql).toContain("VALUES ('null-test', NULL)");
  });

  it('putPassword applies default fallbacks correctly', () => {
    const sqlite = new SQLiteOPFS('default-db');
    const fakeDb = new FakeDb();
    (sqlite as any).db = fakeDb;

    sqlite.putPassword({ id: 99 } as any);
    const sql = fakeDb.lastSql;
    expect(sql).toContain("'Untitled'"); // title fallback
    expect(sql).toContain("'General'"); // category fallback
    expect(sql).toContain("'[]'"); // tags fallback
  });

  it('getAllPasswords handles malformed JSON fields gracefully', () => {
    const sqlite = new SQLiteOPFS('malformed-db');
    const fakeDb = new FakeDb();
    (sqlite as any).db = fakeDb;

    // Inject corrupt JSON into the mock
    fakeDb.passwords.set(1, {
      id: 1,
      title: 'X',
      tags: '{!!BAD_JSON!!}',
      attachments: '["item1"]',
      search_index: 'corrupt',
    } as any);

    const all = sqlite.getAllPasswords();
    expect(all[0].tags).toEqual([]); // fallback to empty array
    expect(all[0].attachments).toEqual(['item1']);
    expect(all[0].search_index).toEqual([]); // fallback to empty array
  });

  it('throws or returns defaults when database is closed', () => {
    const sqlite = new SQLiteOPFS('closed-db');
    // Default sqlite has no db initialized

    expect(() => sqlite.putPassword({ id: 1 } as any)).toThrowError('Database not open');
    expect(() => sqlite.deletePassword(1)).toThrowError('Database not open');
    expect(() => sqlite.updatePasswordField(1, 'title', 'New')).toThrowError('Database not open');
    expect(() => sqlite.putMetadata('k', 'v')).toThrowError('Database not open');
    expect(() => sqlite.putAttachment('att', 1, new Uint8Array(), new ArrayBuffer(0))).toThrowError(
      'Database not open'
    );
    expect(() => sqlite.deleteAttachment('att')).toThrowError('Database not open');

    expect(sqlite.getAllPasswords()).toEqual([]);
    expect(sqlite.countPasswords()).toBe(0);
    expect(sqlite.getMetadata('k')).toBeNull();
    expect(sqlite.getAttachment('att')).toBeNull();
    expect(sqlite.getAttachmentsByEntry(1)).toEqual([]);

    // Should not throw
    expect(() => sqlite.deleteMetadata('k')).not.toThrow();
    expect(sqlite.isOpen).toBe(false);
  });

  it('getAttachment handles missing statement result gracefully', () => {
    const sqlite = new SQLiteOPFS('mocked-stmt');
    (sqlite as any).db = {
      prepare: () => ({
        bind: vi.fn(),
        step: () => false, // no results
        free: vi.fn(),
      }),
    };
    expect(sqlite.getAttachment('non-existent')).toBeNull();
  });

  it('countPasswords handles empty result array gracefully', () => {
    const sqlite = new SQLiteOPFS('mocked-exec');
    (sqlite as any).db = {
      exec: () => [], // no results
    };
    expect(sqlite.countPasswords()).toBe(0);
  });

  it('sqlVal handles numbers correctly', () => {
    const sqlite = new SQLiteOPFS('test-val');
    // @ts-ignore private method access
    expect(sqlite.sqlVal(42)).toBe('42');
  });

  it('updatePasswordField adds missing columns safely and handles undefined/null', () => {
    const sqlite = new SQLiteOPFS('add-col');
    const fakeDb = new FakeDb();
    (sqlite as any).db = fakeDb;

    sqlite.updatePasswordField(1, 'new_column_xyz', 'value');
    expect(
      fakeDb.sqlHistory.some((sql) =>
        sql.includes('ALTER TABLE passwords ADD COLUMN new_column_xyz TEXT')
      )
    ).toBe(true);

    sqlite.updatePasswordField(2, 'new_column_xyz', undefined);
    expect(
      fakeDb.sqlHistory.some((sql) =>
        sql.includes('UPDATE passwords SET new_column_xyz = NULL WHERE id = 2')
      )
    ).toBe(true);

    sqlite.updatePasswordField(3, 'new_column_xyz', null);
    expect(
      fakeDb.sqlHistory.some((sql) =>
        sql.includes('UPDATE passwords SET new_column_xyz = NULL WHERE id = 3')
      )
    ).toBe(true);
  });

  it('schedulePersist handles debouncing properly', () => {
    vi.useFakeTimers();
    const sqlite = new SQLiteOPFS('debounce-db');
    const fakeDb = new FakeDb();
    (sqlite as any).db = fakeDb;
    const persistSpy = vi.spyOn(sqlite, 'persistToOPFS').mockResolvedValue();

    sqlite.schedulePersist();
    sqlite.schedulePersist();
    sqlite.schedulePersist(); // Should clear previous timeouts

    vi.runAllTimers();

    expect(persistSpy).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('handles OPFS API failure during clearAllOPFSFiles', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        storage: {
          getDirectory: vi.fn().mockRejectedValue(new Error('Drive failed')),
        },
      },
    });

    await clearAllOPFSFiles();
    expect(consoleWarnSpy).toHaveBeenCalledWith('[OPFS] Toplu silme hatası:', expect.any(Error));
    consoleWarnSpy.mockRestore();
  });

  it('getAllPasswords handles deleted_at fallback to deletedAt', () => {
    const sqlite = new SQLiteOPFS('fallback');
    const fakeDb = new FakeDb();
    (sqlite as any).db = fakeDb;

    fakeDb.passwords.set(1, { id: 1, deleted_at: '2026-01-01' } as any);

    const res = sqlite.getAllPasswords();
    expect(res[0].deletedAt).toBe('2026-01-01');
  });

  it('putPassword prevents logic mutations by asserting exact SQL fallback string', () => {
    const sqlite = new SQLiteOPFS('exact-sql');
    const fakeDb = new FakeDb();
    (sqlite as any).db = fakeDb;

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    // Passing completely empty entry (id only)
    sqlite.putPassword({ id: 999 } as any);

    // The exact expected string if NO mutations occurred.
    // If a literal like 'General' changes to '', or new Date().toISOString() changes, this kills it.
    expect(fakeDb.lastSql).toContain(
      "VALUES (999, 'Untitled', NULL, NULL, '', NULL, NULL, NULL, NULL, 'General', NULL, NULL, '', NULL, NULL, NULL, NULL, '[]', '2026-01-01T00:00:00.000Z', 0, '[]', 0, '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)"
    );

    // Now test with specific values to ensure they do not trigger fallbacks
    sqlite.putPassword({
      id: 888,
      category: 'Work',
      website: 'a.com',
      username: 'usr',
      title: 'T',
      tags: ['a'],
      attachments: [{ id: '1' } as any],
      deletedAt: 'del',
    } as any);

    expect(fakeDb.lastSql).toContain(
      "VALUES (888, 'T', NULL, NULL, 'usr', NULL, NULL, NULL, NULL, 'Work', NULL, NULL, 'a.com', NULL, NULL, NULL, NULL, '[]', '2026-01-01T00:00:00.000Z', 0, '[\"a\"]', 0, '[{\"id\":\"1\"}]', 'del', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)"
    );

    vi.useRealTimers();
  });
  it('sqlVal handles various types correctly', () => {
    const sqlite = new SQLiteOPFS('types-db');
    // @ts-ignore
    expect(sqlite.sqlVal(true)).toBe("'true'");
    // @ts-ignore
    expect(sqlite.sqlVal(false)).toBe("'false'");
    // @ts-ignore
    expect(sqlite.sqlVal("quote's'quotes")).toBe("'quote''s''quotes'");
  });

  it('persistToOPFS updates isDirty correctly', async () => {
    const sqlite = new SQLiteOPFS('dirty-db');
    const fakeDb = new FakeDb();
    (sqlite as any).db = fakeDb;

    // Mock writeOPFSFile implicitly via setting up nav.storage
    Object.defineProperty(navigator, 'storage', {
      value: {
        getDirectory: vi.fn().mockResolvedValue({
          getFileHandle: vi.fn().mockResolvedValue({
            createWritable: vi.fn().mockResolvedValue({
              write: vi.fn(),
              close: vi.fn(),
            }),
          }),
        }),
      },
      configurable: true,
    });

    (sqlite as any).isDirty = true;
    await sqlite.persistToOPFS();
    expect((sqlite as any).isDirty).toBe(false);
  });

  it('flushToOPFS logic for timeout and dirty state', async () => {
    const sqlite = new SQLiteOPFS('flush-db');
    const fakeDb = new FakeDb();
    (sqlite as any).db = fakeDb;
    const persistSpy = vi.spyOn(sqlite, 'persistToOPFS').mockResolvedValue();

    // 1. Timeout exists, dirty is true
    (sqlite as any).saveTimeout = setTimeout(() => {}, 1000);
    (sqlite as any).isDirty = true;
    await sqlite.flushToOPFS();
    expect((sqlite as any).saveTimeout).toBeNull();
    expect(persistSpy).toHaveBeenCalledTimes(1);

    persistSpy.mockClear();

    // 2. No timeout, dirty is false
    (sqlite as any).isDirty = false;
    await sqlite.flushToOPFS();
    expect(persistSpy).not.toHaveBeenCalled();
  });

  it('clearAllOPFSFiles only deletes .sqlite files and handles non-standard names', async () => {
    const removeEntry = vi.fn();
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        storage: {
          getDirectory: vi.fn().mockResolvedValue({
            removeEntry,
            entries: async function* () {
              yield ['test.sqlite'];
              yield ['TEST.SQLITE']; // casing test
              yield ['test.sqlite.backup']; // should NOT delete
              yield ['sqlite']; // should NOT delete
            },
          }),
        },
      },
    });

    await clearAllOPFSFiles();
    expect(removeEntry).toHaveBeenCalledWith('test.sqlite');
    expect(removeEntry).not.toHaveBeenCalledWith('TEST.SQLITE'); // endsWith is case sensitive
    expect(removeEntry).not.toHaveBeenCalledWith('test.sqlite.backup');
    expect(removeEntry).not.toHaveBeenCalledWith('sqlite');
  });

  it('putPassword correctly maps all 42 fields into the SQL string', () => {
    const sqlite = new SQLiteOPFS('exhaustive-db');
    const fakeDb = new FakeDb();
    (sqlite as any).db = fakeDb;

    const entry: any = {
      id: 1,
      title: 'T',
      encrypted_title: 'ET',
      title_iv: 'TIV',
      username: 'U',
      encrypted_username: 'EU',
      username_iv: 'UIV',
      encrypted_password: 'EP',
      iv: 'IV',
      category: 'C',
      encrypted_category: 'EC',
      category_iv: 'CIV',
      website: 'W',
      encrypted_website: 'EW',
      website_iv: 'WIV',
      encrypted_tags: 'EGT',
      tags_iv: 'TGTIV',
      search_index: ['idx'],
      updated_at: '2026-01-01',
      strength: 50,
      tags: ['tag1'],
      pwned_count: 5,
      attachments: [{ id: 'a1' }],
      deletedAt: '2026-01-02',
      totp_secret: 'TS',
      totp_iv: 'TIV2',
      totp_issuer: 'TI',
      totp_algorithm: 'SHA1',
      totp_digits: 6,
      totp_period: 30,
      encrypted_notes: 'EN',
      notes_iv: 'NIV',
      encrypted_passkey_meta: 'EPM',
      passkey_meta_iv: 'PMIV',
      encrypted_card_details: 'ECD',
      card_details_iv: 'CDIV',
      encrypted_identity_details: 'EID',
      identity_details_iv: 'IDIV',
      encrypted_alias_details: 'EAD',
      alias_details_iv: 'ADIV',
      encrypted_history: 'EH',
      history_iv: 'HIV',
    };

    sqlite.putPassword(entry);

    const valuesStr = fakeDb.lastSql.split('VALUES (')[1].replace(')', '');
    const vals = valuesStr
      .split(',')
      .map((s) => s.trim().replace(/^'|'$/g, '').replace(/''/g, "'"));

    expect(vals[0]).toBe('1');
    expect(vals[1]).toBe('T');
    expect(vals[2]).toBe('ET');
    expect(vals[3]).toBe('TIV');
    expect(vals[4]).toBe('U');
    expect(vals[5]).toBe('EU');
    expect(vals[6]).toBe('UIV');
    expect(vals[7]).toBe('EP');
    expect(vals[8]).toBe('IV');
    expect(vals[9]).toBe('C');
    expect(vals[10]).toBe('EC');
    expect(vals[11]).toBe('CIV');
    expect(vals[12]).toBe('W');
    expect(vals[13]).toBe('EW');
    expect(vals[14]).toBe('WIV');
    expect(vals[15]).toBe('EGT');
    expect(vals[16]).toBe('TGTIV');
    expect(vals[17]).toBe('["idx"]');
    expect(vals[18]).toBe('2026-01-01');
    expect(vals[19]).toBe('50');
    expect(vals[20]).toBe('["tag1"]');
    expect(vals[21]).toBe('5');
    expect(vals[22]).toBe('[{"id":"a1"}]');
    expect(vals[23]).toBe('2026-01-02');
    expect(vals[24]).toBe('TS');
    expect(vals[25]).toBe('TIV2');
    expect(vals[26]).toBe('TI');
    expect(vals[27]).toBe('SHA1');
    expect(vals[28]).toBe('6');
    expect(vals[29]).toBe('30');
    expect(vals[30]).toBe('EN');
    expect(vals[31]).toBe('NIV');
    expect(vals[32]).toBe('EPM');
    expect(vals[33]).toBe('PMIV');
    expect(vals[34]).toBe('ECD');
    expect(vals[35]).toBe('CDIV');
    expect(vals[36]).toBe('EID');
    expect(vals[37]).toBe('IDIV');
    expect(vals[38]).toBe('EAD');
    expect(vals[39]).toBe('ADIV');
    expect(vals[40]).toBe('EH');
    expect(vals[41]).toBe('HIV');
  });

  it('wipeAll clears all tables and deletes the file from OPFS', async () => {
    const sqlite = new SQLiteOPFS('wipe-db');
    const fakeDb = new FakeDb();
    (sqlite as any).db = fakeDb;

    fakeDb.passwords.set(1, { id: 1 });
    fakeDb.metadata.set('m1', 'v1');
    fakeDb.attachments.set('a1', { id: 'a1' } as any);

    const removeEntry = vi.fn();
    const getFileHandle = vi.fn().mockResolvedValue({
      createWritable: vi.fn().mockResolvedValue({
        write: vi.fn(),
        close: vi.fn(),
      }),
    });

    Object.defineProperty(navigator, 'storage', {
      value: {
        getDirectory: vi.fn().mockResolvedValue({
          removeEntry,
          getFileHandle,
        }),
      },
      configurable: true,
    });

    await sqlite.wipeAll();

    expect(fakeDb.passwords.size).toBe(0);
    expect(fakeDb.metadata.size).toBe(0);
    expect(fakeDb.attachments.size).toBe(0);
    expect(removeEntry).toHaveBeenCalledWith('wipe-db.sqlite');
  });

  it('deletePassword removes the correct entry and schedules persist', () => {
    const sqlite = new SQLiteOPFS('del-db');
    const fakeDb = new FakeDb();
    (sqlite as any).db = fakeDb;
    const scheduleSpy = vi.spyOn(sqlite, 'schedulePersist');

    fakeDb.passwords.set(1, { id: 1 });
    fakeDb.passwords.set(2, { id: 2 });

    sqlite.deletePassword(1);
    expect(fakeDb.passwords.has(1)).toBe(false);
    expect(fakeDb.passwords.has(2)).toBe(true);
    expect(scheduleSpy).toHaveBeenCalled();
  });

  it('getMetadata returns null for non-existent keys', () => {
    const sqlite = new SQLiteOPFS('meta-db');
    const fakeDb = new FakeDb();
    (sqlite as any).db = fakeDb;
    expect(sqlite.getMetadata('missing')).toBeNull();
  });
});

// @ts-nocheck
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
    expect(isOPFSAvailable()).toBe(false);

    const removeEntry = vi.fn();
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
            },
          }),
        },
      },
    });

    expect(isOPFSAvailable()).toBe(true);

    await deleteOPFSFile('vault-a.sqlite');
    await clearAllOPFSFiles();

    expect(removeEntry).toHaveBeenCalledWith('vault-a.sqlite');
    expect(removeEntry).toHaveBeenCalledWith('vault-b.sqlite');
    expect(removeEntry).not.toHaveBeenCalledWith('notes.txt');
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

  it('initializes and migrates schema with all required columns', async () => {
    const sqlite = new SQLiteOPFS('init-test');

    const mockFile = {
      getFile: vi.fn().mockResolvedValue({
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      }),
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
    // Verify migration triggered for missing columns (we only mocked id and title)
    expect(sqlite['db']?.sqlHistory).toContain('ALTER TABLE passwords ADD COLUMN totp_secret TEXT');
    expect(sqlite['db']?.sqlHistory).toContain(
      'ALTER TABLE passwords ADD COLUMN encrypted_passkey_meta TEXT'
    );
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
    expect(() => sqlite.putAttachment('att', 1, new Uint8Array(), new ArrayBuffer(0))).toThrowError('Database not open');
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
      })
    };
    expect(sqlite.getAttachment('non-existent')).toBeNull();
  });

  it('countPasswords handles empty result array gracefully', () => {
    const sqlite = new SQLiteOPFS('mocked-exec');
    (sqlite as any).db = {
      exec: () => [] // no results
    };
    expect(sqlite.countPasswords()).toBe(0);
  });

  it('sqlVal handles numbers correctly', () => {
    const sqlite = new SQLiteOPFS('test-val');
    //  private method access
    expect(sqlite.sqlVal(42)).toBe('42');
  });

  it('updatePasswordField adds missing columns safely', () => {
    const sqlite = new SQLiteOPFS('add-col');
    const fakeDb = new FakeDb();
    (sqlite as any).db = fakeDb;

    sqlite.updatePasswordField(1, 'new_column_xyz', 'value');
    expect(fakeDb.sqlHistory.some(sql => sql.includes('ALTER TABLE passwords ADD COLUMN new_column_xyz TEXT'))).toBe(true);
  });

  it('handles OPFS API failure during clearAllOPFSFiles', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        storage: {
          getDirectory: vi.fn().mockRejectedValue(new Error('Drive failed'))
        }
      }
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
});

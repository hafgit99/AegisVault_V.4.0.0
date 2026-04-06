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

    if (sql.startsWith('DELETE FROM passwords WHERE id = ')) {
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
      const matches = [...sql.matchAll(/'([^']*)'/g)].map((match) => match[1].replace(/''/g, "'"));
      this.metadata.set(matches[0], matches[1]);
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

  it('stores, reads and updates password and metadata records', () => {
    const sqlite = new SQLiteOPFS('coverage-db');
    const fakeDb = new FakeDb();
    (sqlite as unknown as { db: FakeDb }).db = fakeDb;

    sqlite.putPassword({
      id: 1,
      title: 'Vault Entry',
      username: 'alice',
      category: 'General',
      website: 'https://example.com',
      tags: ['prod'],
      search_index: ['hash-1'],
      attachments: [{ id: 'att-1', name: 'Doc', type: 'text/plain', size: 1 }],
      updated_at: '2026-03-17T12:00:00.000Z',
    });
    fakeDb.passwords.set(1, {
      id: 1,
      title: 'Vault Entry',
      tags: '["prod"]',
      attachments: '[{"id":"att-1"}]',
      search_index: '["hash-1"]',
      deleted_at: '2026-03-17T12:00:00.000Z',
    });

    sqlite.putMetadata('meta-1', { ok: true });
    sqlite.updatePasswordField(1, 'notes_iv', 'iv-1');

    const passwords = sqlite.getAllPasswords();
    const metadata = sqlite.getMetadata<{ ok: boolean }>('meta-1');

    expect(passwords[0]?.deletedAt).toBe('2026-03-17T12:00:00.000Z');
    expect(passwords[0]?.tags).toEqual(['prod']);
    expect(passwords[0]?.attachments).toEqual([{ id: 'att-1' }]);
    expect(passwords[0]?.search_index).toEqual(['hash-1']);
    expect(metadata).toEqual({ ok: true });
    expect(sqlite.countPasswords()).toBe(1);
    expect(fakeDb.sqlHistory).toContain('ALTER TABLE passwords ADD COLUMN notes_iv TEXT');
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

  it('5. open() initializes and migrates schema', async () => {
    const sqlite = new SQLiteOPFS('init-test');

    // Mock navigator.storage.getDirectory for readOPFSFile
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

    // Mock sql.js Database constructor
    class Database extends FakeDb {}
    const initSqlJsMock = await import('sql.js');
    (initSqlJsMock.default as any).mockResolvedValue({ Database: Database });

    await sqlite.open();

    expect(sqlite.isOpen).toBe(true);
  });
});

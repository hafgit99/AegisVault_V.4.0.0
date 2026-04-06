// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VaultTrashService } from '../vault/VaultTrashService';

function createMockIDB(entries: any[] = []) {
  const store = new Map<number, any>();
  entries.forEach((e) => store.set(e.id, { ...e }));
  const attStore = new Map<number, any>();
  const mockStore: any = {
    get: vi.fn(async (id: number) => store.get(id)),
    put: vi.fn(async (v: any) => { store.set(v.id, v); }),
    delete: vi.fn(async (id: number) => { store.delete(id); }),
  };
  const mockTx: any = { objectStore: vi.fn(() => mockStore), done: Promise.resolve() };
  return {
    store, attStore,
    mockDb: {
      transaction: vi.fn(() => mockTx),
      getAll: vi.fn(async () => [...store.values()]),
      get: vi.fn(async (_s: string, id: number) => store.get(id)),
      delete: vi.fn(async (s: string, id: number) => {
        if (s === 'attachments') attStore.delete(id); else store.delete(id);
      }),
    } as any,
  };
}

function createMockSQLite(entries: any[] = []) {
  const store = new Map<number, any>();
  entries.forEach((e) => store.set(e.id, { ...e }));
  const attStore = new Map<number, any>();
  return {
    store, attStore,
    mockDb: {
      updatePasswordField: vi.fn((id: number, f: string, v: any) => {
        const e = store.get(id);
        if (e) { if (v === null) delete e[f]; else e[f] = v; }
      }),
      flushToOPFS: vi.fn(async () => {}),
      getAttachmentsByEntry: vi.fn((eid: number) =>
        [...attStore.entries()].filter(([, v]) => v.entryId === eid).map(([k]) => k)
      ),
      deleteAttachment: vi.fn((id: number) => { attStore.delete(id); }),
      deletePassword: vi.fn((id: number) => { store.delete(id); }),
      getAllPasswords: vi.fn(() => [...store.values()]),
    } as any,
  };
}

describe('VaultTrashService', () => {
  let invalidateCache: ReturnType<typeof vi.fn>;
  beforeEach(() => { invalidateCache = vi.fn(); });

  describe('moveToTrash', () => {
    it('marks entry as deleted in IDB', async () => {
      const { mockDb, store } = createMockIDB([{ id: 1, title: 'Test', password: 'secret' }]);
      await VaultTrashService.moveToTrash({
        opfsMockDb: mockDb, sqliteDb: null, useSQLite: false, entryId: 1, invalidateCache,
      });
      expect(store.get(1).deletedAt).toBeTruthy();
      expect(invalidateCache).toHaveBeenCalled();
    });

    it('marks entry as deleted in SQLite', async () => {
      const { mockDb } = createMockSQLite([{ id: 1, title: 'Test' }]);
      await VaultTrashService.moveToTrash({
        opfsMockDb: null, sqliteDb: mockDb, useSQLite: true, entryId: 1, invalidateCache,
      });
      expect(mockDb.updatePasswordField).toHaveBeenCalledWith(1, 'deleted_at', expect.any(String));
    });

    it('skips non-existent entry', async () => {
      const { mockDb } = createMockIDB([]);
      await VaultTrashService.moveToTrash({
        opfsMockDb: mockDb, sqliteDb: null, useSQLite: false, entryId: 999, invalidateCache,
      });
      expect(invalidateCache).toHaveBeenCalled();
    });
  });

  describe('restoreFromTrash', () => {
    it('removes deletedAt from entry in IDB', async () => {
      const { mockDb, store } = createMockIDB([{ id: 1, title: 'Test', deletedAt: '2026-01-01' }]);
      await VaultTrashService.restoreFromTrash({
        opfsMockDb: mockDb, sqliteDb: null, useSQLite: false, entryId: 1, invalidateCache,
      });
      expect(store.get(1).deletedAt).toBeUndefined();
    });

    it('sets deleted_at to null in SQLite', async () => {
      const { mockDb } = createMockSQLite([{ id: 1, title: 'Test' }]);
      await VaultTrashService.restoreFromTrash({
        opfsMockDb: null, sqliteDb: mockDb, useSQLite: true, entryId: 1, invalidateCache,
      });
      expect(mockDb.updatePasswordField).toHaveBeenCalledWith(1, 'deleted_at', null);
    });
  });

  describe('deletePermanently', () => {
    it('deletes entry and attachments from IDB', async () => {
      const { mockDb, store, attStore } = createMockIDB([{ id: 1, title: 'T', attachments: [{ id: 10 }, { id: 20 }] }]);
      attStore.set(10, { id: 10, entryId: 1 });
      attStore.set(20, { id: 20, entryId: 1 });
      await VaultTrashService.deletePermanently({
        opfsMockDb: mockDb, sqliteDb: null, useSQLite: false, entryId: 1, invalidateCache,
      });
      expect(store.has(1)).toBe(false);
      expect(invalidateCache).toHaveBeenCalled();
    });

    it('deletes entry from SQLite with attachments', async () => {
      const { mockDb, attStore } = createMockSQLite([{ id: 1, title: 'T' }]);
      attStore.set(10, { id: 10, entryId: 1 });
      await VaultTrashService.deletePermanently({
        opfsMockDb: null, sqliteDb: mockDb, useSQLite: true, entryId: 1, invalidateCache,
      });
      expect(mockDb.deletePassword).toHaveBeenCalledWith(1);
    });
  });

  describe('emptyTrash', () => {
    it('deletes all trashed entries from IDB', async () => {
      const { mockDb } = createMockIDB([
        { id: 1, title: 'Active' },
        { id: 2, title: 'Trashed', deletedAt: '2026-01-01' },
        { id: 3, title: 'Also', deletedAt: '2026-01-02', attachments: [{ id: 30 }] },
      ]);
      await VaultTrashService.emptyTrash({ opfsMockDb: mockDb, sqliteDb: null, useSQLite: false });
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('deletes all trashed from SQLite', async () => {
      const { mockDb } = createMockSQLite([
        { id: 1, title: 'Active' },
        { id: 2, title: 'Trashed', deletedAt: '2026-01-01' },
      ]);
      await VaultTrashService.emptyTrash({ opfsMockDb: null, sqliteDb: mockDb, useSQLite: true });
      expect(mockDb.deletePassword).toHaveBeenCalled();
    });
  });

  describe('cleanupTrash', () => {
    it('deletes entries older than 30 days', async () => {
      const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
      const { mockDb } = createMockIDB([
        { id: 1, title: 'Old', deletedAt: oldDate },
        { id: 2, title: 'Recent', deletedAt: new Date().toISOString() },
      ]);
      const deleteFn = vi.fn();
      await VaultTrashService.cleanupTrash({ opfsMockDb: mockDb, deletePermanently: deleteFn });
      expect(deleteFn).toHaveBeenCalledTimes(1);
      expect(deleteFn).toHaveBeenCalledWith(1);
    });

    it('does nothing when db is null', async () => {
      const deleteFn = vi.fn();
      await VaultTrashService.cleanupTrash({ opfsMockDb: null, deletePermanently: deleteFn });
      expect(deleteFn).not.toHaveBeenCalled();
    });

    it('skips active entries', async () => {
      const { mockDb } = createMockIDB([{ id: 1, title: 'Active' }]);
      const deleteFn = vi.fn();
      await VaultTrashService.cleanupTrash({ opfsMockDb: mockDb, deletePermanently: deleteFn });
      expect(deleteFn).not.toHaveBeenCalled();
    });
  });
});

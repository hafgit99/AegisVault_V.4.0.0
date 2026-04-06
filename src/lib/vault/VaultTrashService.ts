import type { IDBPDatabase } from 'idb';
import type { VaultEntry } from '../../vaultService';
import type { SQLiteOPFS } from '../SQLiteOPFS';

export class VaultTrashService {
  static async moveToTrash(args: {
    opfsMockDb: IDBPDatabase | null;
    sqliteDb: SQLiteOPFS | null;
    useSQLite: boolean;
    entryId: number;
    invalidateCache: () => void;
  }): Promise<void> {
    const { opfsMockDb, sqliteDb, useSQLite, entryId, invalidateCache } = args;
    const deletedTime = new Date().toISOString();

    if (opfsMockDb) {
      const tx = opfsMockDb.transaction('passwords', 'readwrite');
      const store = tx.objectStore('passwords');
      const entry = await store.get(entryId);
      if (entry) {
        entry.deletedAt = deletedTime;
        await store.put(entry);
      }
      await tx.done;
    }

    if (useSQLite && sqliteDb) {
      sqliteDb.updatePasswordField(entryId, 'deleted_at', deletedTime);
      await sqliteDb.flushToOPFS();
    }

    invalidateCache();
  }

  static async restoreFromTrash(args: {
    opfsMockDb: IDBPDatabase | null;
    sqliteDb: SQLiteOPFS | null;
    useSQLite: boolean;
    entryId: number;
    invalidateCache: () => void;
  }): Promise<void> {
    const { opfsMockDb, sqliteDb, useSQLite, entryId, invalidateCache } = args;

    if (opfsMockDb) {
      const tx = opfsMockDb.transaction('passwords', 'readwrite');
      const store = tx.objectStore('passwords');
      const entry = await store.get(entryId);
      if (entry) {
        delete entry.deletedAt;
        await store.put(entry);
      }
      await tx.done;
    }

    if (useSQLite && sqliteDb) {
      sqliteDb.updatePasswordField(entryId, 'deleted_at', null);
      await sqliteDb.flushToOPFS();
    }

    invalidateCache();
  }

  static async deletePermanently(args: {
    opfsMockDb: IDBPDatabase | null;
    sqliteDb: SQLiteOPFS | null;
    useSQLite: boolean;
    entryId: number;
    invalidateCache: () => void;
  }): Promise<void> {
    const { opfsMockDb, sqliteDb, useSQLite, entryId, invalidateCache } = args;

    if (opfsMockDb) {
      const tx = opfsMockDb.transaction('passwords', 'readwrite');
      const store = tx.objectStore('passwords');
      const entry = await store.get(entryId);
      if (entry && entry.attachments) {
        for (const att of entry.attachments) {
          await opfsMockDb.delete('attachments', att.id);
        }
      }
      await store.delete(entryId);
      await tx.done;
    }

    if (useSQLite && sqliteDb) {
      const dbAtts = sqliteDb.getAttachmentsByEntry(entryId);
      for (const id of dbAtts) {
        sqliteDb.deleteAttachment(id);
      }
      sqliteDb.deletePassword(entryId);
      await sqliteDb.flushToOPFS();
    }

    invalidateCache();
  }

  static async emptyTrash(args: {
    opfsMockDb: IDBPDatabase | null;
    sqliteDb: SQLiteOPFS | null;
    useSQLite: boolean;
  }): Promise<void> {
    const { opfsMockDb, sqliteDb, useSQLite } = args;

    if (opfsMockDb) {
      const all = await opfsMockDb.getAll('passwords');
      const trashed = all.filter((entry) => entry.deletedAt);
      for (const trashedEntry of trashed) {
        if (trashedEntry.attachments) {
          for (const attachment of trashedEntry.attachments) {
            await opfsMockDb.delete('attachments', attachment.id);
          }
        }
        await opfsMockDb.delete('passwords', trashedEntry.id);
      }
    }

    if (useSQLite && sqliteDb) {
      const allSql = sqliteDb.getAllPasswords() as VaultEntry[];
      const trashedSql = allSql.filter((entry) => entry.deletedAt);
      for (const trashedEntry of trashedSql) {
        const dbAtts = sqliteDb.getAttachmentsByEntry(trashedEntry.id);
        for (const id of dbAtts) sqliteDb.deleteAttachment(id);
        sqliteDb.deletePassword(trashedEntry.id);
      }
      await sqliteDb.flushToOPFS();
    }
  }

  static async cleanupTrash(args: {
    opfsMockDb: IDBPDatabase | null;
    deletePermanently: (entryId: number) => Promise<void>;
  }): Promise<void> {
    const { opfsMockDb, deletePermanently } = args;
    if (!opfsMockDb) return;

    const allEntries: VaultEntry[] = await opfsMockDb.getAll('passwords');
    const msIn30Days = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const oldTrashEntries = allEntries.filter(
      (entry) => entry.deletedAt && now - new Date(entry.deletedAt).getTime() > msIn30Days
    );

    for (const entry of oldTrashEntries) {
      await deletePermanently(entry.id);
    }
  }
}

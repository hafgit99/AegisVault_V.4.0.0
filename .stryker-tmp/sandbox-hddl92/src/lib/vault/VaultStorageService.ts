// @ts-nocheck
import type { IDBPDatabase } from 'idb';
import type { SQLiteOPFS } from '../SQLiteOPFS';
import type { VaultAttachmentMeta } from '../../vaultService';

export class VaultStorageService {
  static ensureVaultInitialized(
    aesKey: CryptoKey | null,
    opfsMockDb: IDBPDatabase | null,
    sqliteDb: SQLiteOPFS | null
  ): void {
    if (!aesKey || (!opfsMockDb && !sqliteDb)) {
      throw new Error('Vault not initialized');
    }
  }

  static ensureVaultOpen(opfsMockDb: IDBPDatabase | null, sqliteDb: SQLiteOPFS | null): void {
    if (!opfsMockDb && !sqliteDb) {
      throw new Error('Vault not open');
    }
  }

  static findEntryById(records: Array<Record<string, unknown>>, entryId: number) {
    return records.find((entry) => Number(entry.id) === Number(entryId));
  }

  static removeAttachmentFromEntry(
    entry: Record<string, unknown>,
    attachmentId: string
  ): Record<string, unknown> {
    if (Array.isArray(entry.attachments)) {
      entry.attachments = entry.attachments.filter(
        (item: VaultAttachmentMeta) => item.id !== attachmentId
      );
    }
    return entry;
  }
}

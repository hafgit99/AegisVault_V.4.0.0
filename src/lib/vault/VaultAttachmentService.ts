import type { IDBPDatabase } from 'idb';
import { isFieldEncrypted, type EncryptionProfile } from '../../config/encryption-profiles';
import type { VaultAttachmentMeta } from '../../vaultService';
import type { SQLiteOPFS } from '../SQLiteOPFS';
import { bufferToHex, hexToBuffer, toBufferSource } from '../crypto-types';
import { VaultStorageService } from './VaultStorageService';

type EncryptTextFn = (value: string) => Promise<{ encrypted: string; iv: string }>;
type DecryptTextFn = (encrypted?: string, iv?: string) => Promise<string | null>;

export class VaultAttachmentService {
  static async encryptAttachmentMetadataList(
    profile: EncryptionProfile,
    attachments: VaultAttachmentMeta[],
    encryptTextField: EncryptTextFn
  ): Promise<VaultAttachmentMeta[]> {
    if (!isFieldEncrypted(profile, 'attachments')) return attachments;

    return Promise.all(
      attachments.map(async (item) => {
        const nameEnc = await encryptTextField(item.name || '');
        const typeEnc = await encryptTextField(item.type || '');
        return {
          id: item.id,
          size: item.size,
          name: '',
          type: '',
          encrypted_name: nameEnc.encrypted,
          name_iv: nameEnc.iv,
          encrypted_type: typeEnc.encrypted,
          type_iv: typeEnc.iv,
        };
      })
    );
  }

  static async decryptAttachmentMetadataList(
    attachments: VaultAttachmentMeta[],
    decryptTextField: DecryptTextFn
  ): Promise<VaultAttachmentMeta[]> {
    return Promise.all(
      attachments.map(async (item) => {
        if (!item.encrypted_name && !item.encrypted_type) return item;

        const decName = await decryptTextField(item.encrypted_name, item.name_iv);
        const decType = await decryptTextField(item.encrypted_type, item.type_iv);
        return {
          ...item,
          name: decName ?? item.name ?? '',
          type: decType ?? item.type ?? '',
        };
      })
    );
  }

  static async addAttachment(args: {
    aesKey: CryptoKey | null;
    opfsMockDb: IDBPDatabase | null;
    sqliteDb: SQLiteOPFS | null;
    useSQLite: boolean;
    entryId: number;
    file: File;
    encryptAttachmentMetadataList: (
      attachments: VaultAttachmentMeta[]
    ) => Promise<VaultAttachmentMeta[]>;
  }): Promise<{ id: string; name: string; type: string; size: number }> {
    const {
      aesKey,
      opfsMockDb,
      sqliteDb,
      useSQLite,
      entryId,
      file,
      encryptAttachmentMetadataList,
    } = args;
    VaultStorageService.ensureVaultInitialized(aesKey, opfsMockDb, sqliteDb);
    if (file.size > 50 * 1024 * 1024) throw new Error('File exceeds 50MB limit');

    const fileBuffer = await file.arrayBuffer();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: toBufferSource(iv) },
      aesKey as CryptoKey,
      toBufferSource(fileBuffer)
    );

    const attachmentId = crypto.randomUUID();
    const attachmentMeta: VaultAttachmentMeta = {
      id: attachmentId,
      name: file.name,
      type: file.type,
      size: file.size,
    };
    const attachmentMetaAtRest = (await encryptAttachmentMetadataList([attachmentMeta]))[0];

    if (useSQLite && sqliteDb) {
      sqliteDb.putAttachment(attachmentId, entryId, iv, cipherBuffer);
      const existingEntries = sqliteDb.getAllPasswords();
      const entry = VaultStorageService.findEntryById(existingEntries, entryId);
      if (entry) {
        const attachments = Array.isArray(entry.attachments) ? entry.attachments : [];
        attachments.push(attachmentMetaAtRest);
        entry.attachments = attachments;
        sqliteDb.putPassword(entry);
      }
      await sqliteDb.flushToOPFS();
    }

    if (opfsMockDb) {
      await opfsMockDb.put('attachments', {
        id: attachmentId,
        entryId,
        iv: bufferToHex(iv),
        encrypted_data: bufferToHex(cipherBuffer as ArrayBuffer),
      });

      const tx = opfsMockDb.transaction('passwords', 'readwrite');
      const store = tx.objectStore('passwords');
      const entry = await store.get(entryId);
      if (entry) {
        if (!entry.attachments) entry.attachments = [];
        entry.attachments.push(attachmentMetaAtRest);
        await store.put(entry);
      }
      await tx.done;
    }

    return attachmentMeta;
  }

  static async getDecryptedAttachment(args: {
    aesKey: CryptoKey | null;
    opfsMockDb: IDBPDatabase | null;
    sqliteDb: SQLiteOPFS | null;
    useSQLite: boolean;
    attachmentId: string;
  }): Promise<Blob> {
    const { aesKey, opfsMockDb, sqliteDb, useSQLite, attachmentId } = args;
    VaultStorageService.ensureVaultInitialized(aesKey, opfsMockDb, sqliteDb);

    let record: Record<string, unknown> | null = null;

    if (useSQLite && sqliteDb) {
      const sqliteRecord = sqliteDb.getAttachment(attachmentId);
      if (sqliteRecord) record = sqliteRecord;
    }

    if (!record && opfsMockDb) {
      record = await opfsMockDb.get('attachments', attachmentId);
    }

    if (!record) throw new Error('Attachment not found');

    const plainBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toBufferSource(hexToBuffer(record.iv as string)) },
      aesKey as CryptoKey,
      toBufferSource(hexToBuffer(record.encrypted_data as string))
    );

    return new Blob([plainBuffer]);
  }

  static async deleteAttachment(args: {
    opfsMockDb: IDBPDatabase | null;
    sqliteDb: SQLiteOPFS | null;
    useSQLite: boolean;
    entryId: number;
    attachmentId: string;
  }): Promise<void> {
    const { opfsMockDb, sqliteDb, useSQLite, entryId, attachmentId } = args;
    VaultStorageService.ensureVaultOpen(opfsMockDb, sqliteDb);

    if (useSQLite && sqliteDb) {
      sqliteDb.deleteAttachment(attachmentId);
      const existingEntries = sqliteDb.getAllPasswords();
      const entry = VaultStorageService.findEntryById(existingEntries, entryId);
      if (entry) {
        sqliteDb.putPassword(VaultStorageService.removeAttachmentFromEntry(entry, attachmentId));
      }
      await sqliteDb.flushToOPFS();
    }

    if (opfsMockDb) {
      await opfsMockDb.delete('attachments', attachmentId);

      const tx = opfsMockDb.transaction('passwords', 'readwrite');
      const store = tx.objectStore('passwords');
      const entry = await store.get(entryId);
      if (entry) {
        await store.put(VaultStorageService.removeAttachmentFromEntry(entry, attachmentId));
      }
      await tx.done;
    }
  }
}

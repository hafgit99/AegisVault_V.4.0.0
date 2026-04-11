// @ts-nocheck
import type { IDBPDatabase } from 'idb';
import type { SQLiteOPFS } from '../SQLiteOPFS';
import { bufferToHex, hexToBuffer, toBufferSource } from '../crypto-types';

export class VaultPinService {
  static async saveSecurityPins(args: {
    aesKey: CryptoKey | null;
    opfsMockDb: IDBPDatabase | null;
    sqliteDb: SQLiteOPFS | null;
    useSQLite: boolean;
    duressPin: string;
    killPin: string;
    randomBytes: (len: number) => Uint8Array;
  }): Promise<void> {
    const { aesKey, opfsMockDb, sqliteDb, useSQLite, duressPin, killPin, randomBytes } = args;
    if (!aesKey || (!opfsMockDb && !sqliteDb)) throw new Error('Vault not initialized');

    const enc = new TextEncoder();
    const payload = JSON.stringify({ duressPin, killPin });
    const iv = randomBytes(12);

    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: toBufferSource(iv) },
      aesKey,
      toBufferSource(enc.encode(payload))
    );

    const pinData = {
      id: 'security_pins',
      encrypted_data: bufferToHex(cipherBuffer),
      iv: bufferToHex(iv),
    };

    if (useSQLite && sqliteDb) {
      sqliteDb.putMetadata('security_pins', pinData);
    }

    if (opfsMockDb) {
      const tx = opfsMockDb.transaction('vault_metadata', 'readwrite');
      await tx.objectStore('vault_metadata').put(pinData);
      await tx.done;
    }
  }

  static async getSecurityPins(args: {
    aesKey: CryptoKey | null;
    opfsMockDb: IDBPDatabase | null;
    sqliteDb: SQLiteOPFS | null;
    useSQLite: boolean;
  }): Promise<{ duressPin: string; killPin: string }> {
    const { aesKey, opfsMockDb, sqliteDb, useSQLite } = args;
    if (!aesKey || (!opfsMockDb && !sqliteDb)) return { duressPin: '', killPin: '' };

    try {
      let record: Record<string, unknown> | null = null;
      if (useSQLite && sqliteDb) {
        record = sqliteDb.getMetadata('security_pins');
      } else if (opfsMockDb) {
        record = await opfsMockDb.get('vault_metadata', 'security_pins');
      }

      if (!record || !record.encrypted_data || !record.iv) {
        return { duressPin: '', killPin: '' };
      }

      const cipherArray = hexToBuffer(record.encrypted_data as string);
      const ivArray = hexToBuffer(record.iv as string);

      const plainBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: toBufferSource(ivArray) },
        aesKey,
        toBufferSource(cipherArray)
      );

      const dec = new TextDecoder();
      return JSON.parse(dec.decode(plainBuffer));
    } catch {
      return { duressPin: '', killPin: '' };
    }
  }
}

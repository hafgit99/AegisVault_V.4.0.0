// @ts-nocheck
import { argon2id } from 'hash-wasm';
import { toBufferSource } from './crypto-types';
import {
  AEGIS_APP_VERSION,
  AEGIS_BACKUP_FORMAT,
  AEGIS_CANONICAL_EXPORT_KIND,
  AEGIS_CANONICAL_SCHEMA_VERSION,
} from '../config/schema-registry';
import type { CanonicalVaultRecord } from './canonical-schema';

export interface BackupFormat {
  version: string;
  format: typeof AEGIS_BACKUP_FORMAT;
  salt: string;    // Base64
  iv: string;      // Base64
  payload: string; // Base64 encrypted JSON
  payload_kind?: 'legacy-array' | typeof AEGIS_CANONICAL_EXPORT_KIND;
  payload_schema_version?: typeof AEGIS_CANONICAL_SCHEMA_VERSION;
}

export interface CanonicalBackupPayload {
  kind: typeof AEGIS_CANONICAL_EXPORT_KIND;
  schemaVersion: typeof AEGIS_CANONICAL_SCHEMA_VERSION;
  exportedAt: string;
  records: CanonicalVaultRecord[];
}

export class BackupService {
  private static readonly ITERATIONS = 3;
  private static readonly MEMORY_SIZE = 65536; // 64 MB

  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const derivedBits = await argon2id({
      password: password,
      salt: salt,
      parallelism: 1,
      iterations: this.ITERATIONS,
      memorySize: this.MEMORY_SIZE,
      hashLength: 32,
      outputType: 'binary',
    });

    return window.crypto.subtle.importKey(
      "raw",
      toBufferSource(derivedBits),
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  private static encodeBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  static async encryptBackup<T>(data: T[], password: string): Promise<string> {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const key = await this.deriveKey(password, salt);
    
    const enc = new TextEncoder();
    const payloadBuffer = enc.encode(JSON.stringify(data));
    
    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: toBufferSource(iv) },
      key,
      toBufferSource(payloadBuffer)
    );

    const backup: BackupFormat = {
      version: AEGIS_APP_VERSION,
      format: AEGIS_BACKUP_FORMAT,
      salt: this.encodeBase64(salt),
      iv: this.encodeBase64(iv),
      payload: this.encodeBase64(cipherBuffer),
      payload_kind: 'legacy-array',
    };

    return JSON.stringify(backup, null, 2);
  }

  static async encryptCanonicalBackup(records: CanonicalVaultRecord[], password: string): Promise<string> {
    const payload: CanonicalBackupPayload = {
      kind: AEGIS_CANONICAL_EXPORT_KIND,
      schemaVersion: AEGIS_CANONICAL_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      records,
    };

    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(password, salt);
    const enc = new TextEncoder();
    const payloadBuffer = enc.encode(JSON.stringify(payload));
    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: toBufferSource(iv) },
      key,
      toBufferSource(payloadBuffer)
    );

    const backup: BackupFormat = {
      version: AEGIS_APP_VERSION,
      format: AEGIS_BACKUP_FORMAT,
      salt: this.encodeBase64(salt),
      iv: this.encodeBase64(iv),
      payload: this.encodeBase64(cipherBuffer),
      payload_kind: AEGIS_CANONICAL_EXPORT_KIND,
      payload_schema_version: AEGIS_CANONICAL_SCHEMA_VERSION,
    };

    return JSON.stringify(backup, null, 2);
  }

  static async decryptBackup<T>(backupContent: string, password: string): Promise<T[]> {
    let backup: BackupFormat;
    try {
      backup = JSON.parse(backupContent);
    } catch {
      throw new Error("INVALID_JSON");
    }

    if (backup.format !== AEGIS_BACKUP_FORMAT) {
      throw new Error("UNSUPPORTED_FORMAT");
    }

    const salt = Uint8Array.from(atob(backup.salt), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(backup.iv), c => c.charCodeAt(0));
    const cipherText = Uint8Array.from(atob(backup.payload), c => c.charCodeAt(0));

    const key = await this.deriveKey(password, salt);

    try {
      const plainBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: toBufferSource(iv) },
        key,
        toBufferSource(cipherText)
      );
      
      const dec = new TextDecoder();
      return JSON.parse(dec.decode(plainBuffer)) as T[];
    } catch {
      throw new Error("DECRYPTION_FAILED");
    }
  }

  static async decryptCanonicalBackup(
    backupContent: string,
    password: string
  ): Promise<CanonicalBackupPayload> {
    let backup: BackupFormat;
    try {
      backup = JSON.parse(backupContent);
    } catch {
      throw new Error("INVALID_JSON");
    }

    if (backup.format !== AEGIS_BACKUP_FORMAT) {
      throw new Error("UNSUPPORTED_FORMAT");
    }

    if (backup.payload_kind !== AEGIS_CANONICAL_EXPORT_KIND) {
      throw new Error("UNSUPPORTED_CANONICAL_PAYLOAD");
    }

    const salt = Uint8Array.from(atob(backup.salt), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(backup.iv), c => c.charCodeAt(0));
    const cipherText = Uint8Array.from(atob(backup.payload), c => c.charCodeAt(0));
    const key = await this.deriveKey(password, salt);

    try {
      const plainBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: toBufferSource(iv) },
        key,
        toBufferSource(cipherText)
      );
      const dec = new TextDecoder();
      const payload = JSON.parse(dec.decode(plainBuffer)) as CanonicalBackupPayload;

      if (payload.kind !== AEGIS_CANONICAL_EXPORT_KIND || !Array.isArray(payload.records)) {
        throw new Error("INVALID_CANONICAL_PAYLOAD");
      }

      return payload;
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_CANONICAL_PAYLOAD") {
        throw error;
      }
      throw new Error("DECRYPTION_FAILED");
    }
  }
}

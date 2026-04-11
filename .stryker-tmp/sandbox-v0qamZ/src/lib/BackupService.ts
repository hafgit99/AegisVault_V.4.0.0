// @ts-nocheck
import { Argon2WorkerService } from './Argon2WorkerService';
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
  envelope_version?: 1 | 2;
  salt: string; // Base64
  iv: string; // Base64
  payload: string; // Base64 encrypted JSON
  payload_kind?: 'legacy-array' | typeof AEGIS_CANONICAL_EXPORT_KIND;
  payload_schema_version?: typeof AEGIS_CANONICAL_SCHEMA_VERSION;
  integrity?: {
    algorithm: 'HMAC-SHA256';
    mac: string; // Base64
  };
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
  private static readonly INTEGRITY_DOMAIN = 'aegis-backup-integrity-v2';

  private static async deriveKeys(
    password: string,
    salt: Uint8Array
  ): Promise<{ encryptionKey: CryptoKey; integrityKey: Uint8Array }> {
    const derivedBits = await Argon2WorkerService.deriveBinary({
      password: password,
      salt: salt,
      parallelism: 1,
      iterations: this.ITERATIONS,
      memorySize: this.MEMORY_SIZE,
      hashLength: 64,
    });

    const encryptionMaterial = derivedBits.slice(0, 32);
    const integrityMaterial = derivedBits.slice(32, 64);

    const encryptionKey = await window.crypto.subtle.importKey(
      'raw',
      toBufferSource(encryptionMaterial),
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    return { encryptionKey, integrityKey: integrityMaterial };
  }

  private static encodeBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private static parseSemver(value: string): { major: number; minor: number; patch: number } {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(value || '').trim());
    if (!match) {
      throw new Error('INVALID_BACKUP_VERSION');
    }
    return {
      major: Number(match[1]),
      minor: Number(match[2]),
      patch: Number(match[3]),
    };
  }

  private static assertVersionCompatibility(version: string): void {
    const backupVersion = this.parseSemver(version);
    const currentVersion = this.parseSemver(AEGIS_APP_VERSION);
    if (backupVersion.major > currentVersion.major) {
      throw new Error('UNSUPPORTED_BACKUP_VERSION');
    }
  }

  private static buildIntegrityPayload(backup: BackupFormat): string {
    return [
      this.INTEGRITY_DOMAIN,
      backup.version || '',
      backup.format || '',
      String(backup.envelope_version || 1),
      backup.payload_kind || 'legacy-array',
      backup.payload_schema_version || '',
      backup.salt || '',
      backup.iv || '',
      backup.payload || '',
    ].join('|');
  }

  private static async computeIntegrityMac(
    integrityKey: Uint8Array,
    backup: BackupFormat
  ): Promise<string> {
    const key = await window.crypto.subtle.importKey(
      'raw',
      toBufferSource(integrityKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const payload = new TextEncoder().encode(this.buildIntegrityPayload(backup));
    const mac = await window.crypto.subtle.sign('HMAC', key, toBufferSource(payload));
    return this.encodeBase64(mac);
  }

  private static async verifyBackupIntegrity(
    integrityKey: Uint8Array,
    backup: BackupFormat
  ): Promise<void> {
    const envelopeVersion = backup.envelope_version || 1;
    const integrity = backup.integrity;

    if (envelopeVersion >= 2 && !integrity) {
      throw new Error('MISSING_BACKUP_INTEGRITY');
    }

    // Legacy v1 backups rely on AES-GCM auth tag. If integrity is absent, keep compatibility.
    if (!integrity) {
      return;
    }

    if (integrity.algorithm !== 'HMAC-SHA256' || !integrity.mac) {
      throw new Error('INVALID_BACKUP_INTEGRITY');
    }

    const expectedMac = await this.computeIntegrityMac(integrityKey, {
      ...backup,
      integrity: undefined,
    });

    if (expectedMac.length !== integrity.mac.length) {
      throw new Error('BACKUP_INTEGRITY_FAILED');
    }

    let mismatch = 0;
    for (let i = 0; i < expectedMac.length; i++) {
      mismatch |= expectedMac.charCodeAt(i) ^ integrity.mac.charCodeAt(i);
    }
    if (mismatch !== 0) {
      throw new Error('BACKUP_INTEGRITY_FAILED');
    }
  }

  static async encryptBackup<T>(data: T[], password: string): Promise<string> {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const { encryptionKey, integrityKey } = await this.deriveKeys(password, salt);

    const enc = new TextEncoder();
    const payloadBuffer = enc.encode(JSON.stringify(data));

    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: toBufferSource(iv) },
      encryptionKey,
      toBufferSource(payloadBuffer)
    );

    const backup: BackupFormat = {
      version: AEGIS_APP_VERSION,
      format: AEGIS_BACKUP_FORMAT,
      envelope_version: 2,
      salt: this.encodeBase64(salt),
      iv: this.encodeBase64(iv),
      payload: this.encodeBase64(cipherBuffer),
      payload_kind: 'legacy-array',
    };
    backup.integrity = {
      algorithm: 'HMAC-SHA256',
      mac: await this.computeIntegrityMac(integrityKey, backup),
    };

    return JSON.stringify(backup, null, 2);
  }

  static async encryptCanonicalBackup(
    records: CanonicalVaultRecord[],
    password: string
  ): Promise<string> {
    const payload: CanonicalBackupPayload = {
      kind: AEGIS_CANONICAL_EXPORT_KIND,
      schemaVersion: AEGIS_CANONICAL_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      records,
    };

    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const { encryptionKey, integrityKey } = await this.deriveKeys(password, salt);
    const enc = new TextEncoder();
    const payloadBuffer = enc.encode(JSON.stringify(payload));
    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: toBufferSource(iv) },
      encryptionKey,
      toBufferSource(payloadBuffer)
    );

    const backup: BackupFormat = {
      version: AEGIS_APP_VERSION,
      format: AEGIS_BACKUP_FORMAT,
      envelope_version: 2,
      salt: this.encodeBase64(salt),
      iv: this.encodeBase64(iv),
      payload: this.encodeBase64(cipherBuffer),
      payload_kind: AEGIS_CANONICAL_EXPORT_KIND,
      payload_schema_version: AEGIS_CANONICAL_SCHEMA_VERSION,
    };
    backup.integrity = {
      algorithm: 'HMAC-SHA256',
      mac: await this.computeIntegrityMac(integrityKey, backup),
    };

    return JSON.stringify(backup, null, 2);
  }

  static async decryptBackup<T>(backupContent: string, password: string): Promise<T[]> {
    let backup: BackupFormat;
    try {
      backup = JSON.parse(backupContent);
    } catch {
      throw new Error('INVALID_JSON');
    }

    if (backup.format !== AEGIS_BACKUP_FORMAT) {
      throw new Error('UNSUPPORTED_FORMAT');
    }
    this.assertVersionCompatibility(backup.version);

    const salt = Uint8Array.from(atob(backup.salt), (c) => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(backup.iv), (c) => c.charCodeAt(0));
    const cipherText = Uint8Array.from(atob(backup.payload), (c) => c.charCodeAt(0));
    const { encryptionKey, integrityKey } = await this.deriveKeys(password, salt);
    await this.verifyBackupIntegrity(integrityKey, backup);

    try {
      const plainBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: toBufferSource(iv) },
        encryptionKey,
        toBufferSource(cipherText)
      );

      const dec = new TextDecoder();
      return JSON.parse(dec.decode(plainBuffer)) as T[];
    } catch {
      throw new Error('DECRYPTION_FAILED');
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
      throw new Error('INVALID_JSON');
    }

    if (backup.format !== AEGIS_BACKUP_FORMAT) {
      throw new Error('UNSUPPORTED_FORMAT');
    }
    this.assertVersionCompatibility(backup.version);

    if (backup.payload_kind !== AEGIS_CANONICAL_EXPORT_KIND) {
      throw new Error('UNSUPPORTED_CANONICAL_PAYLOAD');
    }
    if (backup.payload_schema_version !== AEGIS_CANONICAL_SCHEMA_VERSION) {
      throw new Error('UNSUPPORTED_CANONICAL_SCHEMA_VERSION');
    }

    const salt = Uint8Array.from(atob(backup.salt), (c) => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(backup.iv), (c) => c.charCodeAt(0));
    const cipherText = Uint8Array.from(atob(backup.payload), (c) => c.charCodeAt(0));
    const { encryptionKey, integrityKey } = await this.deriveKeys(password, salt);
    await this.verifyBackupIntegrity(integrityKey, backup);

    try {
      const plainBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: toBufferSource(iv) },
        encryptionKey,
        toBufferSource(cipherText)
      );
      const dec = new TextDecoder();
      const payload = JSON.parse(dec.decode(plainBuffer)) as CanonicalBackupPayload;

      if (payload.kind !== AEGIS_CANONICAL_EXPORT_KIND || !Array.isArray(payload.records)) {
        throw new Error('INVALID_CANONICAL_PAYLOAD');
      }
      if (payload.schemaVersion !== AEGIS_CANONICAL_SCHEMA_VERSION) {
        throw new Error('UNSUPPORTED_CANONICAL_SCHEMA_VERSION');
      }

      return payload;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === 'INVALID_CANONICAL_PAYLOAD' ||
          error.message === 'UNSUPPORTED_CANONICAL_SCHEMA_VERSION')
      ) {
        throw error;
      }
      throw new Error('DECRYPTION_FAILED');
    }
  }
}

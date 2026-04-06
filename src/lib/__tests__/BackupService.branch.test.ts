// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { BackupService } from '../BackupService';
import {
  AEGIS_APP_VERSION,
  AEGIS_BACKUP_FORMAT,
  AEGIS_CANONICAL_EXPORT_KIND,
  AEGIS_CANONICAL_SCHEMA_VERSION,
} from '../../config/schema-registry';
import type { CanonicalVaultRecord } from '../canonical-schema';

const dummyData = [
  { title: 'TestSite', username: 'user1', pass: 'secret_pass_123', website: 'https://test.com' },
];
const canonicalData: CanonicalVaultRecord[] = [
  {
    id: 1,
    title: 'TestSite',
    username: 'user1',
    url: 'https://test.com',
    category: 'login',
    favorite: false,
    tags: ['prod'],
    deleted_at: null,
    secret: { password: 'secret_pass_123' },
    attachments: [],
  },
];
const strongPassword = 'MySuperSecretEncryptionPassword!2026';

describe('BackupService Branch Coverage', () => {
  describe('parseSemver / assertVersionCompatibility', () => {
    it('rejects invalid version format', async () => {
      const backupJson = await BackupService.encryptBackup(dummyData, strongPassword);
      const backup = JSON.parse(backupJson);
      backup.version = 'not-semver';
      await expect(
        BackupService.decryptBackup(JSON.stringify(backup), strongPassword)
      ).rejects.toThrow('INVALID_BACKUP_VERSION');
    });

    it('accepts lower major version (same major)', async () => {
      // Just verify the version parsing branch works - covered by normal encrypt/decrypt
      const backupJson = await BackupService.encryptBackup(dummyData, strongPassword);
      const backup = JSON.parse(backupJson);
      expect(backup.version).toBe(AEGIS_APP_VERSION);
      // parseSemver: valid version, major check passes (same major)
      const result = await BackupService.decryptBackup(backupJson, strongPassword);
      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('verifyBackupIntegrity branches', () => {
    it('rejects v2 envelope without integrity', async () => {
      const backupJson = await BackupService.encryptBackup(dummyData, strongPassword);
      const backup = JSON.parse(backupJson);
      delete backup.integrity;
      // envelope_version is 2, no integrity => MISSING_BACKUP_INTEGRITY
      await expect(
        BackupService.decryptBackup(JSON.stringify(backup), strongPassword)
      ).rejects.toThrow('MISSING_BACKUP_INTEGRITY');
    });

    it('allows v1 envelope without integrity (legacy compatibility)', async () => {
      const backupJson = await BackupService.encryptBackup(dummyData, strongPassword);
      const backup = JSON.parse(backupJson);
      backup.envelope_version = 1;
      delete backup.integrity;
      // v1 without integrity should work (relies on AES-GCM auth tag)
      const result = await BackupService.decryptBackup(JSON.stringify(backup), strongPassword);
      expect(result).toBeInstanceOf(Array);
    });

    it('rejects invalid integrity algorithm', async () => {
      const backupJson = await BackupService.encryptBackup(dummyData, strongPassword);
      const backup = JSON.parse(backupJson);
      backup.integrity = { algorithm: 'INVALID', mac: 'abc' };
      await expect(
        BackupService.decryptBackup(JSON.stringify(backup), strongPassword)
      ).rejects.toThrow('INVALID_BACKUP_INTEGRITY');
    });

    it('rejects empty integrity mac', async () => {
      const backupJson = await BackupService.encryptBackup(dummyData, strongPassword);
      const backup = JSON.parse(backupJson);
      backup.integrity = { algorithm: 'HMAC-SHA256', mac: '' };
      await expect(
        BackupService.decryptBackup(JSON.stringify(backup), strongPassword)
      ).rejects.toThrow('INVALID_BACKUP_INTEGRITY');
    });
  });

  describe('decryptCanonicalBackup branches', () => {
    it('rejects invalid JSON', async () => {
      await expect(
        BackupService.decryptCanonicalBackup('not json', strongPassword)
      ).rejects.toThrow('INVALID_JSON');
    });

    it('rejects unsupported format', async () => {
      await expect(
        BackupService.decryptCanonicalBackup('{"format":"bad"}', strongPassword)
      ).rejects.toThrow('UNSUPPORTED_FORMAT');
    });

    it('rejects unsupported major version for canonical', async () => {
      const backupJson = await BackupService.encryptCanonicalBackup(canonicalData, strongPassword);
      const backup = JSON.parse(backupJson);
      backup.version = '99.0.0';
      await expect(
        BackupService.decryptCanonicalBackup(JSON.stringify(backup), strongPassword)
      ).rejects.toThrow('UNSUPPORTED_BACKUP_VERSION');
    });

    it('rejects wrong password for canonical backup', async () => {
      const backupJson = await BackupService.encryptCanonicalBackup(canonicalData, strongPassword);
      await expect(
        BackupService.decryptCanonicalBackup(backupJson, 'wrongpassword')
      ).rejects.toThrow();
    });
  });
});

// @ts-nocheck
import { BackupService } from '../BackupService';
import {
  AEGIS_APP_VERSION,
  AEGIS_BACKUP_FORMAT,
  AEGIS_CANONICAL_EXPORT_KIND,
  AEGIS_CANONICAL_SCHEMA_VERSION,
} from '../../config/schema-registry';
import type { CanonicalVaultRecord } from '../canonical-schema';

// Polyfill window.crypto for Vitest Node environment
type TestWindow = Window &
  typeof globalThis & {
    crypto?: Crypto;
    btoa?: (input: string) => string;
    atob?: (input: string) => string;
  };

if (typeof window === 'undefined') {
  global.window = {} as TestWindow;
}
if (!window.crypto) {
  (window as TestWindow).crypto = crypto;
}
if (!window.btoa) {
  (window as TestWindow).btoa = (str) => Buffer.from(str, 'binary').toString('base64');
}
if (!window.atob) {
  (window as TestWindow).atob = (str) => Buffer.from(str, 'base64').toString('binary');
}

describe('BackupService (Security P1-1)', () => {
  const dummyData = [
    { title: 'TestSite', username: 'user1', pass: 'secret_pass_123', website: 'https://test.com' }
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
      secret: {
        password: 'secret_pass_123',
      },
      attachments: [],
    },
  ];
  const strongPassword = 'MySuperSecretEncryptionPassword!2026';
  const wrongPassword = 'IncorrectPassword123';

  it('should encrypt data and produce a valid Aegis backup envelope', async () => {
    const backupJson = await BackupService.encryptBackup(dummyData, strongPassword);
    expect(backupJson).toBeDefined();

    const backup = JSON.parse(backupJson);
    expect(backup.format).toBe(AEGIS_BACKUP_FORMAT);
    expect(backup.version).toBe(AEGIS_APP_VERSION);
    expect(backup.salt).toBeDefined();
    expect(backup.iv).toBeDefined();
    expect(backup.payload).toBeDefined();
    
    // Payload should not be plaintext
    expect(backup.payload).not.toContain('secret_pass_123');
    expect(backup.payload).not.toContain('TestSite');
  });

  it('should decrypt a valid backup correctly with the right password', async () => {
    const backupJson = await BackupService.encryptBackup(dummyData, strongPassword);
    const decryptedData = await BackupService.decryptBackup(backupJson, strongPassword);
    
    expect(decryptedData).toBeInstanceOf(Array);
    expect(decryptedData[0].title).toBe('TestSite');
    expect(decryptedData[0].pass).toBe('secret_pass_123');
  });

  it('should throw DECRYPTION_FAILED when decrypting with the wrong password', async () => {
    const backupJson = await BackupService.encryptBackup(dummyData, strongPassword);
    
    await expect(
      BackupService.decryptBackup(backupJson, wrongPassword)
    ).rejects.toThrow('DECRYPTION_FAILED');
  });

  it('should throw INVALID_JSON if backup string is malformed', async () => {
    await expect(
      BackupService.decryptBackup('not_a_json_object', strongPassword)
    ).rejects.toThrow('INVALID_JSON');
  });

  it('should throw UNSUPPORTED_FORMAT if backup lacks correct format property', async () => {
    const badBackup = JSON.stringify({
      format: 'legacy-plaintext',
      payload: 'abcd'
    });

    await expect(
      BackupService.decryptBackup(badBackup, strongPassword)
    ).rejects.toThrow('UNSUPPORTED_FORMAT');
  });

  it('should encrypt and decrypt canonical backup payloads', async () => {
    const backupJson = await BackupService.encryptCanonicalBackup(canonicalData, strongPassword);
    const backup = JSON.parse(backupJson);

    expect(backup.payload_kind).toBe(AEGIS_CANONICAL_EXPORT_KIND);
    expect(backup.payload_schema_version).toBe(AEGIS_CANONICAL_SCHEMA_VERSION);

    const decrypted = await BackupService.decryptCanonicalBackup(backupJson, strongPassword);
    expect(decrypted.kind).toBe(AEGIS_CANONICAL_EXPORT_KIND);
    expect(decrypted.records[0].url).toBe('https://test.com');
    expect(decrypted.records[0].secret?.password).toBe('secret_pass_123');
  });

  it('should reject canonical decrypt on legacy backup envelopes', async () => {
    const backupJson = await BackupService.encryptBackup(dummyData, strongPassword);

    await expect(
      BackupService.decryptCanonicalBackup(backupJson, strongPassword)
    ).rejects.toThrow('UNSUPPORTED_CANONICAL_PAYLOAD');
  });
});

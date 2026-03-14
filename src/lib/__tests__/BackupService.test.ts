import { BackupService } from '../BackupService';

// Polyfill window.crypto for Vitest Node environment
if (typeof window === 'undefined') {
  global.window = {} as any;
}
if (!window.crypto) {
  window.crypto = crypto as any;
}
if (!window.btoa) {
  window.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
}
if (!window.atob) {
  window.atob = (str) => Buffer.from(str, 'base64').toString('binary');
}

describe('BackupService (Security P1-1)', () => {
  const dummyData = [
    { title: 'TestSite', username: 'user1', pass: 'secret_pass_123', website: 'https://test.com' }
  ];
  const strongPassword = 'MySuperSecretEncryptionPassword!2026';
  const wrongPassword = 'IncorrectPassword123';

  it('should encrypt data and produce a valid aegis-encrypted-v1 backup format', async () => {
    const backupJson = await BackupService.encryptBackup(dummyData, strongPassword);
    expect(backupJson).toBeDefined();

    const backup = JSON.parse(backupJson);
    expect(backup.format).toBe('aegis-encrypted-v1');
    expect(backup.version).toBe('4.0.0');
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
});

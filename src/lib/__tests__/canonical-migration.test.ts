// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { CanonicalMigrationService } from '../canonical-migration';
import { BackupService } from '../BackupService';
import { toCanonicalVaultRecords } from '../canonical-adapters';

vi.mock('../SyncAuditService', () => ({
  SyncAuditService: {
    recordEvent: vi.fn(),
  },
}));

describe('CanonicalMigrationService', () => {
  const password = 'test-password';
  const legacyEntries = [
    {
      id: 1,
      title: 'Legacy 1',
      pass: 'p1',
      category: 'Cards',
      updated_at: new Date().toISOString(),
      cardDetails: {
        cardholder_name: 'Legacy User',
        card_number: '5555444433331111',
      },
      identityDetails: {
        document_type: 'passport',
        identity_number: 'X1234567',
      },
    },
  ];

  it('1. migrateLegacyBackupToCanonical: Legacy yedekleri canonical formata donusturur', async () => {
    const legacyBackup = await BackupService.encryptBackup(legacyEntries, password);
    const canonicalBackup = await CanonicalMigrationService.migrateLegacyBackupToCanonical(
      legacyBackup,
      password
    );

    const decrypted = await BackupService.decryptCanonicalBackup(canonicalBackup, password);
    expect(decrypted.kind).toBe('canonical-export-v1');
    expect(decrypted.records.length).toBe(1);
    expect(decrypted.records[0].title).toBe('Legacy 1');
    expect(
      (decrypted.records[0].custom_data as Record<string, any>)?.card_details?.card_number
    ).toBe('5555444433331111');
  });

  it('2. restoreCanonicalBackupToVaultEntries: Canonical yedekten vault girislerini geri yukler', async () => {
    const canonicalRecords = toCanonicalVaultRecords(legacyEntries as any);
    const canonicalBackup = await BackupService.encryptCanonicalBackup(canonicalRecords, password);

    const restored = await CanonicalMigrationService.restoreCanonicalBackupToVaultEntries(
      canonicalBackup,
      password
    );
    expect(restored.length).toBe(1);
    expect(restored[0].title).toBe('Legacy 1');
    expect(restored[0].cardDetails?.card_number).toBe('5555444433331111');
    expect(restored[0].identityDetails?.identity_number).toBe('X1234567');
  });

  it('3. restoreCanonicalBackupToVaultEntriesWithReport: Rapor ile birlikte geri yukleme yapar', async () => {
    const canonicalRecords = toCanonicalVaultRecords(legacyEntries as any);
    const canonicalBackup = await BackupService.encryptCanonicalBackup(canonicalRecords, password);

    const result = await CanonicalMigrationService.restoreCanonicalBackupToVaultEntriesWithReport(
      canonicalBackup,
      password,
      []
    );
    expect(result.entries.length).toBe(1);
    expect(result.report.success).toBe(true);
    expect(result.report.migratedRecords).toBe(1);
  });

  it('4. migrateLegacyBackupToCanonicalWithReport: Rapor ile birlikte donusum yapar', async () => {
    const legacyBackup = await BackupService.encryptBackup(legacyEntries, password);
    const result = await CanonicalMigrationService.migrateLegacyBackupToCanonicalWithReport(
      legacyBackup,
      password,
      password,
      []
    );

    expect(result.backup).toBeDefined();
    expect(result.report.success).toBe(true);
    expect(result.report.source).toBe('legacy-desktop-backup');
  });
});

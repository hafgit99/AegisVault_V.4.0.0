import { describe, expect, it } from 'vitest';
import type { VaultEntry } from '../../vaultService';
import { BackupService } from '../BackupService';
import { CanonicalMigrationService } from '../canonical-migration';
import { fromCanonicalVaultRecord, toCanonicalVaultRecord } from '../canonical-adapters';

describe('CanonicalMigrationService', () => {
  const password = 'MigrationSecret!2026';
  const legacyEntries: Partial<VaultEntry>[] = [
    {
      id: 7,
      title: 'Portal',
      username: 'alice',
      website: 'https://portal.example.com',
      category: 'Work',
      tags: ['ops'],
      pass: 'Sup3rSecret!',
      notes: 'vpn required',
      cardDetails: {
        cardholder_name: 'Alice Doe',
        card_number: '4111111111111111',
        brand: 'visa',
      },
      identityDetails: {
        document_type: 'national_id',
        identity_number: '12345678901',
        issuing_country: 'TR',
      },
      sharing: [
        {
          space_id: 'space-1',
          role: 'viewer',
          shared_by: 'owner@example.com',
        },
      ],
      updated_at: '2026-03-23T11:00:00.000Z',
    },
  ];

  it('maps vault entries to canonical records and back', () => {
    const canonical = toCanonicalVaultRecord(legacyEntries[0] as VaultEntry);
    const restored = fromCanonicalVaultRecord(canonical);

    expect(canonical.url).toBe('https://portal.example.com');
    expect(canonical.secret?.password).toBe('Sup3rSecret!');
    expect((canonical.custom_data as Record<string, any>)?.card_details?.card_number).toBe(
      '4111111111111111'
    );
    expect((canonical.custom_data as Record<string, any>)?.identity_details?.identity_number).toBe(
      '12345678901'
    );
    expect(canonical.sharing?.[0]?.space_id).toBe('space-1');
    expect(restored.website).toBe('https://portal.example.com');
    expect(restored.pass).toBe('Sup3rSecret!');
    expect(restored.notes).toBe('vpn required');
    expect(restored.cardDetails?.card_number).toBe('4111111111111111');
    expect(restored.identityDetails?.identity_number).toBe('12345678901');
    expect(restored.sharing?.[0]?.shared_by).toBe('owner@example.com');
  });

  it('migrates legacy encrypted backups into canonical encrypted backups', async () => {
    const legacyBackup = await BackupService.encryptBackup(legacyEntries, password);
    const canonicalBackup = await CanonicalMigrationService.migrateLegacyBackupToCanonical(
      legacyBackup,
      password
    );
    const canonicalPayload = await BackupService.decryptCanonicalBackup(canonicalBackup, password);

    expect(canonicalPayload.kind).toBe('canonical-export-v1');
    expect(canonicalPayload.records[0]?.title).toBe('Portal');
    expect(canonicalPayload.records[0]?.secret?.password).toBe('Sup3rSecret!');
  });

  it('restores canonical backups back into vault entry shapes', async () => {
    const legacyBackup = await BackupService.encryptBackup(legacyEntries, password);
    const canonicalBackup = await CanonicalMigrationService.migrateLegacyBackupToCanonical(
      legacyBackup,
      password
    );
    const restored = await CanonicalMigrationService.restoreCanonicalBackupToVaultEntries(
      canonicalBackup,
      password
    );

    expect(restored[0]).toMatchObject({
      title: 'Portal',
      username: 'alice',
      website: 'https://portal.example.com',
      pass: 'Sup3rSecret!',
      notes: 'vpn required',
    });
  });

  it('produces a migration report for legacy to canonical migration', async () => {
    const legacyBackup = await BackupService.encryptBackup(legacyEntries, password);
    const result = await CanonicalMigrationService.migrateLegacyBackupToCanonicalWithReport(
      legacyBackup,
      password,
      password,
      [
        {
          id: 99,
          title: 'Portal',
          username: 'alice',
          website: 'https://portal.example.com',
          pass: 'Sup3rSecret!',
        } as VaultEntry,
      ]
    );

    expect(result.report.success).toBe(true);
    expect(result.report.source).toBe('legacy-desktop-backup');
    expect(result.report.target).toBe('canonical-backup');
    expect(result.report.migratedRecords).toBe(1);
    expect(typeof result.report.generatedAt).toBe('string');
    expect(
      (result.report.metadata?.conflictSummary as { duplicateCount?: number })?.duplicateCount
    ).toBe(1);
  });

  it('produces a restore report with conflict summary for canonical backups', async () => {
    const legacyBackup = await BackupService.encryptBackup(legacyEntries, password);
    const canonicalBackup = await CanonicalMigrationService.migrateLegacyBackupToCanonical(
      legacyBackup,
      password
    );
    const result = await CanonicalMigrationService.restoreCanonicalBackupToVaultEntriesWithReport(
      canonicalBackup,
      password,
      [
        {
          id: 5,
          title: 'Portal',
          username: 'alice',
          website: 'https://portal.example.com',
          pass: 'Sup3rSecret!',
        } as VaultEntry,
      ]
    );

    expect(result.entries).toHaveLength(1);
    expect(result.report.source).toBe('canonical-backup');
    expect(result.report.target).toBe('desktop-vault-entry');
    expect(
      (result.report.metadata?.conflictSummary as { duplicateCount?: number })?.duplicateCount
    ).toBe(1);
  });
});

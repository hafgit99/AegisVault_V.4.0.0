// @ts-nocheck
import type { VaultEntry } from '../vaultService';
import { BackupService } from './BackupService';
import { toCanonicalVaultRecords, fromCanonicalVaultRecords } from './canonical-adapters';
import type { CanonicalBackupPayload } from './BackupService';
import { createMigrationReport, type MigrationReport } from './migration-report';
import { SyncConflictResolutionService } from './SyncConflictResolutionService';
import { SyncAuditService } from './SyncAuditService';

export class CanonicalMigrationService {
  static async migrateLegacyBackupToCanonical(
    backupContent: string,
    currentPassword: string,
    nextPassword: string = currentPassword
  ): Promise<string> {
    const legacyEntries = await BackupService.decryptBackup<Partial<VaultEntry>>(backupContent, currentPassword);
    const canonicalRecords = toCanonicalVaultRecords(legacyEntries as VaultEntry[]);
    return BackupService.encryptCanonicalBackup(canonicalRecords, nextPassword);
  }

  static async restoreCanonicalBackupToVaultEntries(
    backupContent: string,
    password: string
  ): Promise<Partial<VaultEntry>[]> {
    const payload: CanonicalBackupPayload = await BackupService.decryptCanonicalBackup(backupContent, password);
    return fromCanonicalVaultRecords(payload.records);
  }

  static async restoreCanonicalBackupToVaultEntriesWithReport(
    backupContent: string,
    password: string,
    currentEntries: VaultEntry[] = []
  ): Promise<{ entries: Partial<VaultEntry>[]; report: MigrationReport }> {
    const payload: CanonicalBackupPayload = await BackupService.decryptCanonicalBackup(backupContent, password);
    const entries = fromCanonicalVaultRecords(payload.records);
    const conflictSummary = SyncConflictResolutionService.summarize(
      currentEntries,
      entries,
      'backup_import'
    );

    const result = {
      entries,
      report: createMigrationReport({
        source: 'canonical-backup',
        target: 'desktop-vault-entry',
        success: true,
        migratedRecords: entries.length,
        issues: [],
        metadata: {
          conflictSummary,
        },
      }),
    };

    this.recordRestoreReportToSyncAudit(result.report);
    return result;
  }

  static async migrateLegacyBackupToCanonicalWithReport(
    backupContent: string,
    currentPassword: string,
    nextPassword: string = currentPassword,
    currentEntries: VaultEntry[] = []
  ): Promise<{ backup: string; report: MigrationReport }> {
    const legacyEntries = await BackupService.decryptBackup<Partial<VaultEntry>>(backupContent, currentPassword);
    const canonicalRecords = toCanonicalVaultRecords(legacyEntries as VaultEntry[]);
    const backup = await BackupService.encryptCanonicalBackup(canonicalRecords, nextPassword);
    const conflictSummary = SyncConflictResolutionService.summarize(
      currentEntries,
      legacyEntries,
      'backup_import'
    );

    const result = {
      backup,
      report: createMigrationReport({
        source: 'legacy-desktop-backup',
        target: 'canonical-backup',
        success: true,
        migratedRecords: canonicalRecords.length,
        issues: [],
        metadata: {
          passwordRotated: currentPassword !== nextPassword,
          conflictSummary,
        },
      }),
    };

    this.recordMigrationReportToSyncAudit(result.report);
    return result;
  }

  static recordRestoreReportToSyncAudit(report: MigrationReport): void {
    const conflictSummary = report.metadata?.conflictSummary as
      | { duplicateCount?: number; exactMatchCount?: number }
      | undefined;

    SyncAuditService.recordEvent({
      type: 'canonical_restore_completed',
      source: 'canonical_restore',
      detail: 'Canonical restore report recorded',
      metadata: {
        migratedRecords: report.migratedRecords,
        duplicates: conflictSummary?.duplicateCount ?? 0,
        exact: conflictSummary?.exactMatchCount ?? 0,
      },
    });
  }

  static recordMigrationReportToSyncAudit(report: MigrationReport): void {
    const conflictSummary = report.metadata?.conflictSummary as
      | { duplicateCount?: number; exactMatchCount?: number }
      | undefined;

    SyncAuditService.recordEvent({
      type: 'migration_completed',
      source: 'migration',
      detail: 'Migration report recorded',
      metadata: {
        migratedRecords: report.migratedRecords,
        duplicates: conflictSummary?.duplicateCount ?? 0,
        exact: conflictSummary?.exactMatchCount ?? 0,
      },
    });
  }
}

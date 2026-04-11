// @ts-nocheck
export interface MigrationIssue {
  code: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
}

export interface MigrationReport {
  source: 'legacy-desktop-backup' | 'canonical-backup' | 'android-backup';
  target: 'canonical-backup' | 'desktop-vault-entry';
  success: boolean;
  migratedRecords: number;
  generatedAt: string;
  issues: MigrationIssue[];
  metadata?: Record<string, unknown>;
}

export const createMigrationReport = (
  input: Omit<MigrationReport, 'generatedAt'>
): MigrationReport => ({
  ...input,
  generatedAt: new Date().toISOString(),
});

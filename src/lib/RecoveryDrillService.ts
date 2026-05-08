import { AEGIS_CANONICAL_EXPORT_KIND } from '../config/schema-registry';
import { BackupService, type BackupFormat, type CanonicalBackupPayload } from './BackupService';
import type { CanonicalVaultRecord } from './canonical-schema';
import type { VaultEntry } from '../vaultService';
import { CRYPTO_WALLET_CATEGORY, CryptoWalletVault } from './wallet/CryptoWalletVault';

export interface RecoveryDrillReport {
  status: 'passed';
  checkedAt: string;
  payloadKind: 'legacy-array' | typeof AEGIS_CANONICAL_EXPORT_KIND;
  backupVersion: string;
  recordCount: number;
  categoryCounts: Record<string, number>;
  cryptoRecordCount: number;
  passkeyRecordCount: number;
  totpRecordCount: number;
  secretRecordCount: number;
  warnings: string[];
}

const parseBackupEnvelope = (backupContent: string): BackupFormat => {
  try {
    return JSON.parse(backupContent) as BackupFormat;
  } catch {
    throw new Error('INVALID_JSON');
  }
};

const increment = (counts: Record<string, number>, key: string) => {
  counts[key] = (counts[key] || 0) + 1;
};

const normalizeLegacyCategory = (entry: Partial<VaultEntry>) =>
  String(entry.category || 'Uncategorized');

const normalizeCanonicalCategory = (record: CanonicalVaultRecord) =>
  String(record.category || 'Uncategorized');

export class RecoveryDrillService {
  static async runEncryptedBackupDrill(
    backupContent: string,
    password: string
  ): Promise<RecoveryDrillReport> {
    const envelope = parseBackupEnvelope(backupContent);
    const payloadKind =
      envelope.payload_kind === AEGIS_CANONICAL_EXPORT_KIND
        ? AEGIS_CANONICAL_EXPORT_KIND
        : 'legacy-array';

    if (payloadKind === AEGIS_CANONICAL_EXPORT_KIND) {
      const payload = await BackupService.decryptCanonicalBackup(backupContent, password);
      return this.buildCanonicalReport(envelope.version, payload);
    }

    const entries = await BackupService.decryptBackup<Partial<VaultEntry>>(backupContent, password);
    return this.buildLegacyReport(envelope.version, entries);
  }

  private static buildLegacyReport(
    backupVersion: string,
    entries: Array<Partial<VaultEntry>>
  ): RecoveryDrillReport {
    const categoryCounts: Record<string, number> = {};
    let cryptoRecordCount = 0;
    let passkeyRecordCount = 0;
    let totpRecordCount = 0;
    let secretRecordCount = 0;

    for (const entry of entries) {
      const category = normalizeLegacyCategory(entry);
      increment(categoryCounts, category);
      if (category === CRYPTO_WALLET_CATEGORY) cryptoRecordCount++;
      if (category === 'Passkeys' || entry.passkeyMetadata) passkeyRecordCount++;
      if (entry.totpSecret) totpRecordCount++;
      if (entry.pass && entry.pass !== CryptoWalletVault.watchOnlySentinel) secretRecordCount++;
    }

    return {
      status: 'passed',
      checkedAt: new Date().toISOString(),
      payloadKind: 'legacy-array',
      backupVersion,
      recordCount: entries.length,
      categoryCounts,
      cryptoRecordCount,
      passkeyRecordCount,
      totpRecordCount,
      secretRecordCount,
      warnings: this.buildWarnings(entries.length, cryptoRecordCount, passkeyRecordCount),
    };
  }

  private static buildCanonicalReport(
    backupVersion: string,
    payload: CanonicalBackupPayload
  ): RecoveryDrillReport {
    const categoryCounts: Record<string, number> = {};
    let cryptoRecordCount = 0;
    let passkeyRecordCount = 0;
    let totpRecordCount = 0;
    let secretRecordCount = 0;

    for (const record of payload.records) {
      const category = normalizeCanonicalCategory(record);
      increment(categoryCounts, category);
      if (category === CRYPTO_WALLET_CATEGORY || category === 'crypto_wallet') cryptoRecordCount++;
      if (category === 'passkey' || record.passkey) passkeyRecordCount++;
      if (record.secret?.totp) totpRecordCount++;
      if (record.secret && Object.keys(record.secret).length > 0) secretRecordCount++;
    }

    return {
      status: 'passed',
      checkedAt: new Date().toISOString(),
      payloadKind: AEGIS_CANONICAL_EXPORT_KIND,
      backupVersion,
      recordCount: payload.records.length,
      categoryCounts,
      cryptoRecordCount,
      passkeyRecordCount,
      totpRecordCount,
      secretRecordCount,
      warnings: this.buildWarnings(payload.records.length, cryptoRecordCount, passkeyRecordCount),
    };
  }

  private static buildWarnings(
    recordCount: number,
    cryptoRecordCount: number,
    passkeyRecordCount: number
  ): string[] {
    const warnings: string[] = [];
    if (recordCount === 0) warnings.push('RECOVERY_DRILL_EMPTY_BACKUP');
    if (cryptoRecordCount > 0) warnings.push('RECOVERY_DRILL_CRYPTO_REVIEW_REQUIRED');
    if (passkeyRecordCount > 0) warnings.push('RECOVERY_DRILL_PASSKEY_REENROLLMENT_REVIEW');
    return warnings;
  }
}

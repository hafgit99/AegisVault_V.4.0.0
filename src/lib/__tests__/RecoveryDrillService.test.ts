import { BackupService } from '../BackupService';
import { RecoveryDrillService } from '../RecoveryDrillService';
import { AEGIS_CANONICAL_EXPORT_KIND } from '../../config/schema-registry';
import type { CanonicalVaultRecord } from '../canonical-schema';
import { CRYPTO_WALLET_CATEGORY, CryptoWalletVault } from '../wallet/CryptoWalletVault';

type TestWindow = Window &
  typeof globalThis & {
    crypto?: Crypto;
    btoa?: (input: string) => string;
    atob?: (input: string) => string;
  };

if (typeof window === 'undefined') {
  global.window = globalThis as TestWindow;
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

describe('RecoveryDrillService', () => {
  const password = 'RecoveryDrillPassword123!';

  const canonicalRecord = (
    overrides: Partial<CanonicalVaultRecord> = {}
  ): CanonicalVaultRecord => ({
    id: 1,
    title: 'Aegis Login',
    username: 'user@example.com',
    url: 'https://example.com',
    category: 'General',
    favorite: false,
    tags: [],
    deleted_at: null,
    secret: {
      password: 'secret',
      totp: 'JBSWY3DPEHPK3PXP',
    },
    attachments: [],
    ...overrides,
  });

  it('summarizes legacy encrypted backup coverage without mutating the vault', async () => {
    const cryptoRecord = CryptoWalletVault.fromDraft({
      name: 'BTC Watch',
      chain: 'bitcoin',
      publicAddress: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080',
      custodyMode: 'watch_only',
    });
    const backupJson = await BackupService.encryptBackup(
      [
        {
          title: 'Login',
          username: 'user',
          pass: 'secret',
          category: 'General',
          totpSecret: 'JBSWY3DPEHPK3PXP',
        },
        {
          title: 'Site Passkey',
          category: 'Passkeys',
          passkeyMetadata: {
            rp_id: 'example.com',
            credential_id: 'cred-1',
          },
        },
        cryptoRecord,
      ],
      password
    );

    const report = await RecoveryDrillService.runEncryptedBackupDrill(backupJson, password);

    expect(report.status).toBe('passed');
    expect(report.payloadKind).toBe('legacy-array');
    expect(report.recordCount).toBe(3);
    expect(report.categoryCounts).toMatchObject({
      General: 1,
      Passkeys: 1,
      CryptoWallet: 1,
    });
    expect(report.secretRecordCount).toBe(1);
    expect(report.totpRecordCount).toBe(1);
    expect(report.passkeyRecordCount).toBe(1);
    expect(report.cryptoRecordCount).toBe(1);
    expect(report.warnings).toEqual([
      'RECOVERY_DRILL_CRYPTO_REVIEW_REQUIRED',
      'RECOVERY_DRILL_PASSKEY_REENROLLMENT_REVIEW',
    ]);
  });

  it('summarizes canonical encrypted backup coverage and does not count empty secrets', async () => {
    const backupJson = await BackupService.encryptCanonicalBackup(
      [
        canonicalRecord(),
        canonicalRecord({
          id: 2,
          title: 'Canonical Passkey',
          category: 'passkey',
          secret: {},
          passkey: {
            rp_id: 'example.com',
            origin: 'https://example.com',
            credential_id: 'cred-2',
          },
        }),
        canonicalRecord({
          id: 3,
          title: 'Watch Address',
          category: 'crypto_wallet',
          secret: {},
        }),
      ],
      password
    );

    const report = await RecoveryDrillService.runEncryptedBackupDrill(backupJson, password);

    expect(report.payloadKind).toBe(AEGIS_CANONICAL_EXPORT_KIND);
    expect(report.recordCount).toBe(3);
    expect(report.categoryCounts).toMatchObject({
      General: 1,
      passkey: 1,
      crypto_wallet: 1,
    });
    expect(report.secretRecordCount).toBe(1);
    expect(report.totpRecordCount).toBe(1);
    expect(report.passkeyRecordCount).toBe(1);
    expect(report.cryptoRecordCount).toBe(1);
  });

  it('warns when an encrypted backup is valid but empty', async () => {
    const backupJson = await BackupService.encryptBackup([], password);

    const report = await RecoveryDrillService.runEncryptedBackupDrill(backupJson, password);

    expect(report.recordCount).toBe(0);
    expect(report.categoryCounts).toEqual({});
    expect(report.warnings).toEqual(['RECOVERY_DRILL_EMPTY_BACKUP']);
  });

  it('keeps legacy signal detection independent for categories, metadata and watch-only sentinels', async () => {
    const backupJson = await BackupService.encryptBackup(
      [
        {
          title: 'Category-only passkey',
          category: 'Passkeys',
        },
        {
          title: 'Metadata-only passkey',
          category: 'General',
          passkeyMetadata: {
            rp_id: 'metadata.example',
            credential_id: 'cred-metadata',
          },
        },
        CryptoWalletVault.fromDraft({
          name: 'Watch Only Without Secret',
          chain: 'ethereum',
          publicAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
          custodyMode: 'watch_only',
        }),
        {
          title: 'No Category',
        },
      ],
      password
    );

    const report = await RecoveryDrillService.runEncryptedBackupDrill(backupJson, password);

    expect(report.passkeyRecordCount).toBe(2);
    expect(report.cryptoRecordCount).toBe(1);
    expect(report.secretRecordCount).toBe(0);
    expect(report.categoryCounts.Uncategorized).toBe(1);
  });

  it('keeps canonical signal detection independent for categories, metadata and missing secrets', async () => {
    const backupJson = await BackupService.encryptCanonicalBackup(
      [
        canonicalRecord({
          id: 10,
          title: 'Category-only crypto',
          category: CRYPTO_WALLET_CATEGORY as never,
          secret: undefined,
        }),
        canonicalRecord({
          id: 11,
          title: 'Category-only passkey',
          category: 'passkey',
          secret: undefined,
          passkey: null,
        }),
        canonicalRecord({
          id: 12,
          title: 'Metadata-only passkey',
          category: 'General' as never,
          secret: undefined,
          passkey: {
            rp_id: 'metadata.example',
            origin: 'https://metadata.example',
            credential_id: 'cred-metadata',
          },
        }),
        canonicalRecord({
          id: 13,
          title: 'No Category',
          category: undefined as never,
          secret: undefined,
        }),
      ],
      password
    );

    const report = await RecoveryDrillService.runEncryptedBackupDrill(backupJson, password);

    expect(report.cryptoRecordCount).toBe(1);
    expect(report.passkeyRecordCount).toBe(2);
    expect(report.secretRecordCount).toBe(0);
    expect(report.totpRecordCount).toBe(0);
    expect(report.categoryCounts.Uncategorized).toBe(1);
  });

  it('fails closed for malformed JSON before any decrypt attempt', async () => {
    await expect(
      RecoveryDrillService.runEncryptedBackupDrill('not-json', password)
    ).rejects.toThrow('INVALID_JSON');
  });

  it('fails closed when the backup password is wrong', async () => {
    const backupJson = await BackupService.encryptBackup([{ title: 'Login' }], password);

    await expect(
      RecoveryDrillService.runEncryptedBackupDrill(backupJson, 'wrong-password')
    ).rejects.toThrow(/DECRYPTION_FAILED|BACKUP_INTEGRITY_FAILED/);
  });
});

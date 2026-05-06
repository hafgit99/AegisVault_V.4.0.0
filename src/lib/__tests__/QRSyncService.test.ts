// @vitest-environment jsdom
import { QRSyncService } from '../QRSyncService';
import { SecureAppSettings } from '../SecureAppSettings';
import { AEGIS_APP_VERSION, AEGIS_QR_SYNC_FORMAT } from '../../config/schema-registry';
import { CryptoWalletVault } from '../wallet/CryptoWalletVault';

describe('QRSyncService', () => {
  const entries = [
    {
      title: 'Example',
      username: 'alice',
      pass: 'Sup3rSecret!',
      website: 'https://example.com',
      category: 'Work',
      tags: ['critical'],
      cardDetails: {
        cardholder_name: 'Alice Doe',
        card_number: '4111111111111111',
        brand: 'visa',
      },
      identityDetails: {
        document_type: 'national_id',
        identity_number: '12345678901',
      },
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    SecureAppSettings.setQrConsumedPackages({});
    SecureAppSettings.setQrTransferLedger({});
    SecureAppSettings.setQrTransferAudit([]);
  });

  it('exports encrypted QR packages without plaintext secrets', async () => {
    const transferCode = 'ABCD-EFGH-IJKL-MNOP';
    const result = await QRSyncService.createPackage(entries, { transferCode });

    expect(result.rawPackage).toContain(AEGIS_QR_SYNC_FORMAT);
    expect(result.rawPackage).not.toContain('Sup3rSecret!');
    expect(result.rawPackage).not.toContain('Example');
    expect(result.packageInfo.protectionMode).toBe('transfer-code');
    expect(result.packageInfo.version).toBe(AEGIS_APP_VERSION);
  });

  it('round-trips entries with the correct transfer code', async () => {
    const transferCode = 'ABCD-EFGH-IJKL-MNOP';
    const result = await QRSyncService.createPackage(entries, { transferCode });
    const parsed = await QRSyncService.parsePackage(result.rawPackage, { transferCode });

    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe('Example');
    expect(parsed[0].pass).toBe('Sup3rSecret!');
    expect(parsed[0].cardDetails?.card_number).toBe('4111111111111111');
    expect(parsed[0].identityDetails?.identity_number).toBe('12345678901');
  });

  it('preserves crypto wallet payload details during QR sync round trips', async () => {
    const transferCode = 'ABCD-EFGH-IJKL-MNOP';
    const cryptoEntry = {
      title: 'ETH Watch',
      username: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      pass: CryptoWalletVault.watchOnlySentinel,
      website: 'Ethereum / EVM',
      category: CryptoWalletVault.category,
      tags: ['crypto', 'wallet', 'ethereum', 'watch_only'],
      notes: CryptoWalletVault.fromDraft({
        name: 'ETH Watch',
        chain: 'ethereum',
        publicAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        custodyMode: 'watch_only',
        derivationPath: "m/44'/60'/0'/0/0",
        lastKnownBalance: '1.25 ETH',
        notes: 'Watch-only treasury address',
      }).notes,
    };

    const result = await QRSyncService.createPackage([cryptoEntry], { transferCode });
    const parsed = await QRSyncService.parsePackage(result.rawPackage, { transferCode });
    const record = CryptoWalletVault.toRecord({
      id: 88,
      updated_at: '2026-05-06T00:00:00.000Z',
      ...parsed[0],
    } as never);

    expect(record).toMatchObject({
      name: 'ETH Watch',
      chain: 'ethereum',
      custodyMode: 'watch_only',
      derivationPath: "m/44'/60'/0'/0/0",
      lastKnownBalance: '1.25 ETH',
      notes: 'Watch-only treasury address',
    });
  });

  it('rejects incorrect transfer codes', async () => {
    const result = await QRSyncService.createPackage(entries, {
      transferCode: 'ABCD-EFGH-IJKL-MNOP',
    });

    await expect(
      QRSyncService.parsePackage(result.rawPackage, { transferCode: 'WXYZ-1234-WXYZ-1234' })
    ).rejects.toThrow('BACKUP_INTEGRITY_FAILED');
  });

  it('rejects expired packages', async () => {
    const result = await QRSyncService.createPackage(entries, {
      transferCode: 'ABCD-EFGH-IJKL-MNOP',
      expiresInMs: -1000,
    });

    await expect(
      QRSyncService.parsePackage(result.rawPackage, { transferCode: 'ABCD-EFGH-IJKL-MNOP' })
    ).rejects.toThrow('QR_SYNC_PACKAGE_EXPIRED');
  });

  it('marks packages as one-time use after successful import', async () => {
    const transferCode = 'ABCD-EFGH-IJKL-MNOP';
    const result = await QRSyncService.createPackage(entries, { transferCode });

    await QRSyncService.parsePackage(result.rawPackage, { transferCode });

    await expect(QRSyncService.parsePackage(result.rawPackage, { transferCode })).rejects.toThrow(
      'QR_SYNC_PACKAGE_ALREADY_USED'
    );
  });

  it('records audit history for created and consumed transfers', async () => {
    const transferCode = 'ABCD-EFGH-IJKL-MNOP';
    const result = await QRSyncService.createPackage(entries, { transferCode });

    await QRSyncService.parsePackage(result.rawPackage, { transferCode });

    const history = QRSyncService.listTransferHistory();
    const audit = QRSyncService.listAuditEvents();

    expect(history[0]?.sessionId).toBe(result.packageInfo.sessionId);
    expect(history[0]?.status).toBe('consumed');
    expect(audit.some((event) => event.type === 'package_created')).toBe(true);
    expect(audit.some((event) => event.type === 'package_consumed')).toBe(true);
  });

  it('revokes active transfers and blocks later import', async () => {
    const transferCode = 'ABCD-EFGH-IJKL-MNOP';
    const result = await QRSyncService.createPackage(entries, { transferCode });

    expect(QRSyncService.revokeTransfer(result.packageInfo.sessionId, 'test_revoke')).toBe(true);
    await expect(QRSyncService.parsePackage(result.rawPackage, { transferCode })).rejects.toThrow(
      'QR_SYNC_PACKAGE_REVOKED'
    );

    const history = QRSyncService.listTransferHistory();
    expect(history[0]?.status).toBe('revoked');
    expect(history[0]?.revokeReason).toBe('test_revoke');
  });

  it('supports optional ECDH receiver pairing', async () => {
    const receiverSession = await QRSyncService.createReceiverSession();
    const result = await QRSyncService.createPackage(entries, {
      transferCode: 'ABCD-EFGH-IJKL-MNOP',
      recipientPublicKey: receiverSession.publicKey,
    });

    const parsed = await QRSyncService.parsePackage(result.rawPackage, {
      transferCode: 'ABCD-EFGH-IJKL-MNOP',
      receiverSession,
    });

    expect(result.packageInfo.protectionMode).toBe('transfer-code+ecdh');
    expect(parsed[0].pass).toBe('Sup3rSecret!');
  });

  it('rejects receiver pairing mismatches', async () => {
    const receiverSession = await QRSyncService.createReceiverSession();
    const wrongReceiverSession = await QRSyncService.createReceiverSession();
    const result = await QRSyncService.createPackage(entries, {
      transferCode: 'ABCD-EFGH-IJKL-MNOP',
      recipientPublicKey: receiverSession.publicKey,
    });

    await expect(
      QRSyncService.parsePackage(result.rawPackage, {
        transferCode: 'ABCD-EFGH-IJKL-MNOP',
        receiverSession: wrongReceiverSession,
      })
    ).rejects.toThrow('QR_SYNC_PAIRING_MISMATCH');
  });

  it('preserves expiry and entry metadata for regression visibility', async () => {
    const result = await QRSyncService.createPackage(entries, {
      transferCode: 'ABCD-EFGH-IJKL-MNOP',
      expiresInMs: 5 * 60 * 1000,
    });

    expect(result.packageInfo.entryCount).toBe(1);
    expect(result.packageInfo.expiresAt).toBeTruthy();
    expect(result.packageInfo.createdAt).toBeTruthy();
  });
});

// @ts-nocheck
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VaultService } from '../../vaultService';

describe('VaultService: SQLite Integration (Attachments & Import)', () => {
  let mockSQLite: any;
  let vaultService: VaultService;

  beforeEach(async () => {
    vi.clearAllMocks();
    vaultService = new VaultService();

    mockSQLite = {
      putPassword: vi.fn(),
      putAttachment: vi.fn(),
      getAllPasswords: vi.fn().mockReturnValue([]),
      getMetadata: vi.fn(),
      flushToOPFS: vi.fn().mockResolvedValue(undefined),
    };

    (vaultService as any).sqliteDb = mockSQLite;
    (vaultService as any).useSQLite = true;
    (vaultService as any).sensitiveMaterial = new Uint8Array(32);
    (vaultService as any).aesKey = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  });

  it('1. addAttachment: SQLite backend üzerinden kayıt yapar', async () => {
    const file = new File(['test data'], 'test.png', { type: 'image/png' });
    mockSQLite.getAllPasswords.mockReturnValue([{ id: 101, attachments: [] }]);

    const result = await vaultService.addAttachment(101, file);

    expect(result.name).toBe('test.png');
    expect(mockSQLite.putAttachment).toHaveBeenCalled();
    expect(mockSQLite.putPassword).toHaveBeenCalled();
    expect(mockSQLite.flushToOPFS).toHaveBeenCalled();
  });

  it('2. importEntries: SQLite backend üzerinden toplu içe aktarım yapar', async () => {
    const entries = [
      { title: 'Import 1', pass: 'p1' },
      { title: 'Import 2', pass: 'p2' },
    ];

    const result = await vaultService.bulkAddPasswords(entries);

    expect(result.total).toBe(2);
    expect(mockSQLite.putPassword).toHaveBeenCalledTimes(2);
  });

  it('3. deletePermanently: SQLite backend üzerinde kalıcı silme yapar', async () => {
    mockSQLite.getAttachmentsByEntry = vi.fn().mockReturnValue(['att-1']);
    mockSQLite.deleteAttachment = vi.fn();
    mockSQLite.deletePassword = vi.fn();

    await vaultService.deletePermanently(101);

    expect(mockSQLite.deleteAttachment).toHaveBeenCalledWith('att-1');
    expect(mockSQLite.deletePassword).toHaveBeenCalledWith(101);
    expect(mockSQLite.flushToOPFS).toHaveBeenCalled();
  });

  it('4. emptyTrash: SQLite backend üzerinde tüm çöpleri temizler', async () => {
    const deletedEntries = [
      { id: 1, deletedAt: new Date().toISOString() },
      { id: 2 }, // active
    ];
    mockSQLite.getAllPasswords.mockReturnValue(deletedEntries);
    mockSQLite.deletePassword = vi.fn();
    mockSQLite.getAttachmentsByEntry = vi.fn().mockReturnValue([]);

    await vaultService.emptyTrash();

    expect(mockSQLite.deletePassword).toHaveBeenCalledWith(1);
    expect(mockSQLite.deletePassword).not.toHaveBeenCalledWith(2);
    expect(mockSQLite.flushToOPFS).toHaveBeenCalled();
  });

  it('5. moveToTrash / restoreFromTrash: SQLite ve IDB entegrasyonu', async () => {
    mockSQLite.updatePasswordField = vi.fn();
    await vaultService.moveToTrash(101);
    expect(mockSQLite.updatePasswordField).toHaveBeenCalledWith(
      101,
      'deleted_at',
      expect.any(String)
    );

    await vaultService.restoreFromTrash(101);
    expect(mockSQLite.updatePasswordField).toHaveBeenCalledWith(101, 'deleted_at', null);
  });
});

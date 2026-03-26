// @ts-nocheck
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { vaultService, VaultEntry } from '../../vaultService';

describe('VaultService SQLite Branch Coverage', () => {
    let mockSqlite: any;

    beforeEach(async () => {
        const key = await window.crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
        mockSqlite = {
            putPassword: vi.fn(),
            updatePasswordField: vi.fn(),
            deletePassword: vi.fn(),
            getAllPasswords: vi.fn().mockReturnValue([]),
            getAttachment: vi.fn(),
            putAttachment: vi.fn(),
            deleteAttachment: vi.fn(),
            getAttachmentsByEntry: vi.fn().mockReturnValue([]),
            flushToOPFS: vi.fn().mockResolvedValue(true)
        };
        (vaultService as any).sqliteDb = mockSqlite;
        (vaultService as any).useSQLite = true;
        (vaultService as any).isConnected = true;
        (vaultService as any).opfsMockDb = null;
        (vaultService as any).aesKey = key;
    });

    it('1. moveToTrash path with SQLite', async () => {
        await vaultService.moveToTrash(123);
        expect(mockSqlite.updatePasswordField).toHaveBeenCalledWith(123, 'deleted_at', expect.any(String));
        expect(mockSqlite.flushToOPFS).toHaveBeenCalled();
    });

    it('2. restoreFromTrash path with SQLite', async () => {
        await vaultService.restoreFromTrash(123);
        expect(mockSqlite.updatePasswordField).toHaveBeenCalledWith(123, 'deleted_at', null);
    });

    it('3. deletePermanently path with SQLite', async () => {
        mockSqlite.getAttachmentsByEntry.mockReturnValue(['att-1']);
        await vaultService.deletePermanently(456);
        expect(mockSqlite.deleteAttachment).toHaveBeenCalledWith('att-1');
        expect(mockSqlite.deletePassword).toHaveBeenCalledWith(456);
    });

    it('4. emptyTrash path with SQLite', async () => {
        mockSqlite.getAllPasswords.mockReturnValue([{ id: 789, deletedAt: '...' }]);
        mockSqlite.getAttachmentsByEntry.mockReturnValue([]);
        await vaultService.emptyTrash();
        expect(mockSqlite.deletePassword).toHaveBeenCalledWith(789);
    });

    it('5. addAttachment path with SQLite', async () => {
        (vaultService as any).aesKey = { type: 'secret' } as any; 
        const blob = new Blob(["hello"], { type: "text/plain" });
        (blob as any).arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(5));
        
        // Mock subtle.encrypt to avoid "not a CryptoKey" error in jsdom
        vi.spyOn(window.crypto.subtle, 'encrypt').mockResolvedValue(new ArrayBuffer(16));

        mockSqlite.getAllPasswords.mockReturnValue([{ id: 101, attachments: [] }]);
        
        await vaultService.addAttachment(101, blob as any);
        expect(mockSqlite.putAttachment).toHaveBeenCalled();
        expect(mockSqlite.putPassword).toHaveBeenCalled();
    });

    it('6. deleteAttachment path with SQLite', async () => {
        mockSqlite.getAllPasswords.mockReturnValue([{ id: 101, attachments: [{ id: 'att-x' }] }]);
        await vaultService.deleteAttachment(101, 'att-x');
        expect(mockSqlite.deleteAttachment).toHaveBeenCalledWith('att-x');
    });
});

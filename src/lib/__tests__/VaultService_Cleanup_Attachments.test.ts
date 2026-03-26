import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VaultService } from '../../vaultService';

describe('VaultService: Attachments & Trash Cleanup', () => {
    
    let mockIDB: any;
    let vaultService: VaultService;

    beforeEach(async () => {
        vi.clearAllMocks();
        vaultService = new VaultService();
        
        // Mock IDB (opfsMockDb)
        mockIDB = {
            put: vi.fn(),
            get: vi.fn(),
            delete: vi.fn(),
            close: vi.fn(),
            getAll: vi.fn().mockResolvedValue([]),
            transaction: vi.fn().mockReturnValue({
                objectStore: vi.fn().mockReturnValue({
                    get: vi.fn(),
                    put: vi.fn(),
                    delete: vi.fn()
                }),
                done: Promise.resolve()
            })
        };

        (vaultService as any).opfsMockDb = mockIDB;
        (vaultService as any).aesKey = await window.crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
        (vaultService as any).useSQLite = false; // Isolation for IDB fallback path
        
        // Mock window.indexedDB.databases (missing in jsdom)
        if (!window.indexedDB) (window as any).indexedDB = {};
        (window.indexedDB as any).databases = vi.fn().mockResolvedValue([{ name: 'aegis_test_db' }]);
    });

    it('1. addAttachment: IDB (fallback) akışını yönetir', async () => {
        const file = new File(['test'], 'test.txt', { type: 'text/plain' });
        // Mock get for entry
        mockIDB.transaction().objectStore().get.mockResolvedValue({ id: 101, attachments: [] });

        const result = await vaultService.addAttachment(101, file);
        expect(result.name).toBe('test.txt');
        expect(mockIDB.put).toHaveBeenCalledWith('attachments', expect.any(Object));
        expect(mockIDB.transaction().objectStore().put).toHaveBeenCalled();
    });

    it('2. cleanupTrash: 30 günü geçmiş kayıtları siler', async () => {
        const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
        const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
        
        const allEntries = [
            { id: 1, deletedAt: oldDate },
            { id: 2, deletedAt: recentDate },
            { id: 3 } // active
        ];
        mockIDB.getAll.mockResolvedValue(allEntries);
        
        // Mock deletePermanently behavior on IDB
        vi.spyOn(vaultService, 'deletePermanently').mockResolvedValue();

        await vaultService.cleanupTrash();
        
        expect(vaultService.deletePermanently).toHaveBeenCalledWith(1);
        expect(vaultService.deletePermanently).not.toHaveBeenCalledWith(2);
        expect(vaultService.deletePermanently).not.toHaveBeenCalledWith(3);
    });

    it('3. emptyTrash: IDB üzerindeki tüm çöpleri siler', async () => {
        const allEntries = [
            { id: 1, deletedAt: new Date().toISOString() },
            { id: 2 } // active
        ];
        mockIDB.getAll.mockResolvedValue(allEntries);

        await vaultService.emptyTrash();
        
        expect(mockIDB.delete).toHaveBeenCalledWith('passwords', 1);
        expect(mockIDB.delete).not.toHaveBeenCalledWith('passwords', 2);
    });

    it('4. wipeAllData: Tüm veri depolarını temizler', async () => {
        (window.indexedDB as any).deleteDatabase = vi.fn().mockImplementation(() => ({}));
        await vaultService.wipeAllData();
        expect(window.indexedDB.deleteDatabase).toHaveBeenCalled();
    });
});

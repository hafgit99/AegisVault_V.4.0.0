// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncManager } from '../SyncManager';
import { SyncDeviceService } from '../SyncDeviceService';
import { SyncCryptoService } from '../SyncCryptoService';
import { vaultService } from '../../vaultService';

// Mock fetch
global.fetch = vi.fn();

describe('SyncManager Integration Logic', () => {
    const rootSecret = new Uint8Array(32).fill(0xAA);
    const sessionId = 'test-session';

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('1. push: Verileri sifreler ve gonderir', async () => {
        (fetch as any).mockResolvedValue({ ok: true });
        
        const result = await SyncManager.push(sessionId, rootSecret, [], 1);
        expect(result).toBe(true);
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/sync/push'), expect.objectContaining({
            method: 'POST'
        }));
    });

    it('2. pullAndMerge: Sunucudan veri alir ve merge eder', async () => {
        const mockEnvelope = {
            version: '1.0',
            sessionId,
            deviceId: 'dv-1',
            timestamp: new Date().toISOString(),
            sequenceNumber: 10,
            payload: '...', 
            iv: '...',
            hmac: '...'
        };

        (fetch as any).mockResolvedValue({
            ok: true,
            json: async () => [mockEnvelope]
        });

        // Mock SyncCryptoService methods
        vi.spyOn(SyncCryptoService, 'deriveSubKeys').mockResolvedValue({ encryptionKey: {} as any, authKey: {} as any });
        vi.spyOn(SyncCryptoService, 'verifyAndDecrypt').mockResolvedValue([{ id: 1, title: 'Remote', updated_at: '2026-03-25T10:00:00Z' }]);

        const result = await SyncManager.pullAndMerge(sessionId, rootSecret, [], 0);
        
        expect(result).not.toBeNull();
        expect(result?.newSequence).toBe(10);
        expect(result?.merged.length).toBe(1);
        expect(result?.merged[0].title).toBe('Remote');
    });

    it('3. pullAndMerge: API hatasını yakalar (catch)', async () => {
        (fetch as any).mockRejectedValue(new Error('Network error'));
        const result = await SyncManager.pullAndMerge(sessionId, rootSecret, [], 0);
        expect(result).toBeNull();
    });
});

describe('SyncDeviceService Persistence', () => {
    it('1. addDevice ve getDevices listeyi saklar', async () => {
        const device = {
            id: 'dv-test-1',
            label: 'Test PC',
            addedAt: new Date().toISOString(),
            status: 'active' as const,
            isCurrent: false
        };

        await SyncDeviceService.addDevice(device);
        const list = await SyncDeviceService.getDevices();
        
        expect(list.find(d => d.id === 'dv-test-1')).toBeDefined();
    });

    it('2. revokeDevice statusu günceller', async () => {
        const device = {
            id: 'dv-rev-1',
            label: 'Revoke Me',
            addedAt: new Date().toISOString(),
            status: 'active' as const,
            isCurrent: false
        };
        await SyncDeviceService.addDevice(device);
        await SyncDeviceService.revokeDevice('dv-rev-1');
        
        const list = await SyncDeviceService.getDevices();
        const rev = list.find(d => d.id === 'dv-rev-1');
        expect(rev?.status).toBe('revoked');
    });
});

// @ts-nocheck
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { SyncManager } from '../SyncManager';
import { SyncDeviceService } from '../SyncDeviceService';
import { SyncCryptoService } from '../SyncCryptoService';

global.fetch = vi.fn();

describe('SyncManager Integration Logic', () => {
  const rootSecret = new Uint8Array(32).fill(0xaa);
  const sessionId = 'test-session';
  const env = import.meta.env as ImportMetaEnv & {
    VITE_AEGIS_SYNC_RELAY_URL?: string;
  };
  const originalRelayUrl = env.VITE_AEGIS_SYNC_RELAY_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    env.VITE_AEGIS_SYNC_RELAY_URL = 'https://relay.example.test';
  });

  afterAll(() => {
    env.VITE_AEGIS_SYNC_RELAY_URL = originalRelayUrl;
  });

  it('1. push: encrypts and sends signed envelope', async () => {
    (fetch as any).mockResolvedValue({ ok: true });
    vi.spyOn(SyncCryptoService, 'createEnvelopeMac').mockResolvedValue('mock-envelope-mac');

    const result = await SyncManager.push(sessionId, rootSecret, [], 1);
    expect(result).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/sync/push'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('2. pullAndMerge: verifies envelope MAC then merges', async () => {
    const mockEnvelope = {
      version: '1.0',
      sessionId,
      deviceId: 'dv-1',
      timestamp: new Date().toISOString(),
      sequenceNumber: 10,
      nonce: 'nonce-1',
      payload: '...',
      iv: '...',
      hmac: '...',
      envelopeMac: 'mock-envelope-mac',
    };

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [mockEnvelope],
    });

    vi.spyOn(SyncCryptoService, 'deriveSubKeys').mockResolvedValue({
      encryptionKey: {} as any,
      authKey: {} as any,
    });
    vi.spyOn(SyncCryptoService, 'verifyEnvelopeMac').mockResolvedValue(true);
    vi.spyOn(SyncCryptoService, 'verifyAndDecrypt').mockResolvedValue([
      { id: 1, title: 'Remote', updated_at: '2026-03-25T10:00:00Z' } as any,
    ]);

    const result = await SyncManager.pullAndMerge(sessionId, rootSecret, [], 0);

    expect(result).not.toBeNull();
    expect(result?.newSequence).toBe(10);
    expect(result?.merged.length).toBe(1);
    expect(result?.merged[0].title).toBe('Remote');
  });

  it('3. pullAndMerge: catches network errors', async () => {
    (fetch as any).mockRejectedValue(new Error('Network error'));
    const result = await SyncManager.pullAndMerge(sessionId, rootSecret, [], 0);
    expect(result).toBeNull();
  });

  it('4. rejects non-HTTPS relay URL from env', async () => {
    env.VITE_AEGIS_SYNC_RELAY_URL = 'http://insecure-relay.example.test';
    const result = await SyncManager.push(sessionId, rootSecret, [], 1);
    expect(result).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('SyncDeviceService Persistence', () => {
  it('1. addDevice and getDevices persist records', async () => {
    const device = {
      id: 'dv-test-1',
      label: 'Test PC',
      addedAt: new Date().toISOString(),
      status: 'active' as const,
      isCurrent: false,
    };

    await SyncDeviceService.addDevice(device);
    const list = await SyncDeviceService.getDevices();

    expect(list.find((d) => d.id === 'dv-test-1')).toBeDefined();
  });

  it('2. revokeDevice updates status', async () => {
    const device = {
      id: 'dv-rev-1',
      label: 'Revoke Me',
      addedAt: new Date().toISOString(),
      status: 'active' as const,
      isCurrent: false,
    };
    await SyncDeviceService.addDevice(device);
    await SyncDeviceService.revokeDevice('dv-rev-1');

    const list = await SyncDeviceService.getDevices();
    const rev = list.find((d) => d.id === 'dv-rev-1');
    expect(rev?.status).toBe('revoked');
  });
});

// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { SyncManager } from '../SyncManager';

vi.mock('../SyncCryptoService', () => ({
  SyncCryptoService: {
    deriveSubKeys: vi.fn().mockResolvedValue({
      encryptionKey: new Uint8Array(32),
      authKey: new Uint8Array(32),
    }),
    encryptAndSign: vi.fn().mockResolvedValue({
      payload: 'encrypted',
      iv: 'iv',
      hmac: 'hmac',
      nonce: 'nonce',
    }),
    createEnvelopeMac: vi.fn().mockResolvedValue('envelopeMac'),
    verifyEnvelopeMac: vi.fn().mockResolvedValue(true),
    verifyAndDecrypt: vi.fn().mockResolvedValue([{ id: '1', title: 'Remote' }]),
  },
}));

vi.mock('../SyncEnvelope', () => ({
  SyncEnvelopeUtil: {
    create: vi.fn().mockReturnValue({
      payload: 'p',
      iv: 'i',
      hmac: 'h',
      nonce: 'n',
      sessionId: 's',
      sequenceNumber: 1,
      envelopeMac: '',
      entryCount: 0,
      timestamp: '',
      deviceId: '',
      deviceName: '',
    }),
    validate: vi.fn().mockReturnValue(true),
  },
}));

vi.mock('../SyncDeviceService', () => ({
  SyncDeviceService: {
    getLocalFingerprint: vi.fn().mockReturnValue({ id: 'dev1', name: 'Test' }),
  },
}));

vi.mock('../SyncConflictService', () => ({
  SyncConflictService: {
    resolve: vi.fn().mockReturnValue({ merged: [{ id: '1', title: 'Merged' }], conflicts: [] }),
  },
}));

vi.mock('../vaultService', () => ({
  vaultService: {},
}));

const originalFetch = globalThis.fetch;

describe('SyncManager: Branch Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
    // Stub env for relay URL
    vi.stubEnv('VITE_AEGIS_SYNC_RELAY_URL', 'https://relay.aegis.dev');
    vi.stubEnv('VITE_AEGIS_SYNC_RELAY_KEY', 'test-key');
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it('push: successful push returns true', async () => {
    (globalThis.fetch as any).mockResolvedValue({ ok: true });
    const result = await SyncManager.push('sess1', new Uint8Array(32), [], 1);
    expect(result).toBe(true);
  });

  it('push: server error returns false', async () => {
    (globalThis.fetch as any).mockResolvedValue({ ok: false });
    const result = await SyncManager.push('sess1', new Uint8Array(32), [], 1);
    expect(result).toBe(false);
  });

  it('push: fetch exception returns false', async () => {
    (globalThis.fetch as any).mockRejectedValue(new Error('Network error'));
    const result = await SyncManager.push('sess1', new Uint8Array(32), [], 1);
    expect(result).toBe(false);
  });

  it('pullAndMerge: empty envelopes returns local entries', async () => {
    (globalThis.fetch as any).mockResolvedValue({ ok: true, json: async () => [] });
    const localEntries = [{ id: 'local', title: 'Local' }] as any[];
    const result = await SyncManager.pullAndMerge('sess1', new Uint8Array(32), localEntries, 0);
    expect(result).not.toBeNull();
    expect(result!.merged.length).toBe(1);
    expect(result!.newSequence).toBe(0);
  });

  it('pullAndMerge: with envelopes merges successfully', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [
        {
          payload: 'p',
          iv: 'i',
          hmac: 'h',
          nonce: 'n',
          sessionId: 's',
          sequenceNumber: 5,
          envelopeMac: 'em',
          entryCount: 1,
          timestamp: '',
          deviceId: '',
          deviceName: '',
        },
      ],
    });
    const result = await SyncManager.pullAndMerge('sess1', new Uint8Array(32), [], 0);
    expect(result).not.toBeNull();
    expect(result!.newSequence).toBe(5);
  });

  it('pullAndMerge: server not ok returns null', async () => {
    (globalThis.fetch as any).mockResolvedValue({ ok: false });
    const result = await SyncManager.pullAndMerge('sess1', new Uint8Array(32), [], 0);
    expect(result).toBeNull();
  });

  it('pullAndMerge: fetch exception returns null', async () => {
    (globalThis.fetch as any).mockRejectedValue(new Error('fail'));
    const result = await SyncManager.pullAndMerge('sess1', new Uint8Array(32), [], 0);
    expect(result).toBeNull();
  });

  it('getRelayUrl: missing URL throws', () => {
    vi.stubEnv('VITE_AEGIS_SYNC_RELAY_URL', '');
    const mgr = SyncManager as any;
    expect(() => mgr.getRelayUrl()).toThrow('Missing relay URL');
  });

  it('getRelayUrl: invalid URL throws', () => {
    vi.stubEnv('VITE_AEGIS_SYNC_RELAY_URL', 'not-a-url');
    const mgr = SyncManager as any;
    expect(() => mgr.getRelayUrl()).toThrow('Invalid relay URL');
  });

  it('getRelayUrl: non-HTTPS throws', () => {
    vi.stubEnv('VITE_AEGIS_SYNC_RELAY_URL', 'http://insecure.com');
    const mgr = SyncManager as any;
    expect(() => mgr.getRelayUrl()).toThrow('must use HTTPS');
  });

  it('getRelayUrl: valid HTTPS URL works', () => {
    vi.stubEnv('VITE_AEGIS_SYNC_RELAY_URL', 'https://relay.example.com/');
    const mgr = SyncManager as any;
    const url = mgr.getRelayUrl();
    expect(url).toBe('https://relay.example.com');
  });

  it('buildRelayHeaders: includes API key when set', () => {
    vi.stubEnv('VITE_AEGIS_SYNC_RELAY_KEY', 'my-key');
    const mgr = SyncManager as any;
    mgr.relayApiKey = 'my-key';
    const headers = mgr.buildRelayHeaders();
    expect(headers['X-Aegis-Relay-Key']).toBe('my-key');
  });

  it('buildRelayHeaders: omits API key when empty', () => {
    vi.stubEnv('VITE_AEGIS_SYNC_RELAY_KEY', '');
    const mgr = SyncManager as any;
    mgr.relayApiKey = '';
    const headers = mgr.buildRelayHeaders();
    expect(headers['X-Aegis-Relay-Key']).toBeUndefined();
  });
});

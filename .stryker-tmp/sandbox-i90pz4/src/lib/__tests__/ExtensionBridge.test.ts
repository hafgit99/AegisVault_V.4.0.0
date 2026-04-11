// @ts-nocheck
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extensionBridge } from '../ExtensionBridge';
import { vaultService } from '../../vaultService';

// Mock vaultService
vi.mock('../../vaultService', () => ({
  vaultService: {
    isUnlocked: vi.fn(() => true),
    getPasswords: vi
      .fn()
      .mockResolvedValue([
        { title: 'Test', username: 'user', pass: 'p123', website: 'example.com' },
      ]),
  },
}));

describe('ExtensionBridge', () => {
  let mockPort: any;
  let mockRuntime: any;
  let onMessageListener: any;

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.removeItem('aegis_extension_allowlist_v1');
    onMessageListener = null;
    extensionBridge.reset();

    mockPort = {
      postMessage: vi.fn(),
      disconnect: vi.fn(),
      onMessage: {
        addListener: vi.fn((l) => {
          onMessageListener = l;
        }),
      },
      onDisconnect: {
        addListener: vi.fn(),
      },
    };

    mockRuntime = {
      connect: vi.fn().mockReturnValue(mockPort),
    };

    (window as any).chrome = {
      runtime: mockRuntime,
    };

    extensionBridge.init();
  });

  it('1. Hello mesaji ile baglanti kurar ve token paylasir (allowlist)', async () => {
    const helloMsg = new MessageEvent('message', {
      data: {
        type: 'AEGIS_EXTENSION_HELLO',
        extensionId: 'gddgomiecgnihlljfkogfjgakedoielk',
      },
      origin: window.location.origin,
    });

    window.dispatchEvent(helloMsg);

    expect(mockRuntime.connect).toHaveBeenCalledWith('gddgomiecgnihlljfkogfjgakedoielk', {
      name: 'aegis-pwa-vault-port',
    });
    expect(mockPort.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SYNC_TOKEN',
        token: expect.any(String),
      })
    );
  });

  it('2. Yetkisiz extension id reddedilir', async () => {
    const evilMsg = new MessageEvent('message', {
      data: {
        type: 'AEGIS_EXTENSION_HELLO',
        extensionId: 'malicious_id',
      },
      origin: window.location.origin,
    });

    window.dispatchEvent(evilMsg);
    expect(mockRuntime.connect).not.toHaveBeenCalled();
  });

  it('3. CHALLENGE istegine yanit verir', async () => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'AEGIS_EXTENSION_HELLO', extensionId: 'kjbdjkfijeflhhbnkjgkmccljifidpcc' },
        origin: window.location.origin,
      })
    );

    await vi.waitFor(() => expect(mockRuntime.connect).toHaveBeenCalled());
    const token = mockPort.postMessage.mock.calls[0][0].token;

    await onMessageListener({ type: 'REQUEST_CHALLENGE', token });

    expect(mockPort.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CHALLENGE_RESPONSE',
        nonce: expect.any(String),
      })
    );
  });

  it('4. Yanlis token ile gelen istekleri reddeder', async () => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'AEGIS_EXTENSION_HELLO', extensionId: 'kjbdjkfijeflhhbnkjgkmccljifidpcc' },
        origin: window.location.origin,
      })
    );

    await vi.waitFor(() => expect(mockRuntime.connect).toHaveBeenCalled());
    await onMessageListener({ type: 'REQUEST_CHALLENGE', token: 'wrong-token' });
    expect(mockPort.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ERROR', error: 'UNAUTHORIZED_TOKEN' })
    );
  });

  it('5. lockAndDisconnect portu kapatir ve temizlik yapar', async () => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'AEGIS_EXTENSION_HELLO', extensionId: 'kjbdjkfijeflhhbnkjgkmccljifidpcc' },
        origin: window.location.origin,
      })
    );

    await vi.waitFor(() => expect(mockRuntime.connect).toHaveBeenCalled());
    extensionBridge.lockAndDisconnect();
    expect(mockPort.postMessage).toHaveBeenCalledWith({ type: 'VAULT_LOCKED' });
    expect(mockPort.disconnect).toHaveBeenCalled();
  });

  it('6. get_decrypted_creds: imzali istegi dogrular ve verileri doner', async () => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'AEGIS_EXTENSION_HELLO', extensionId: 'kjbdjkfijeflhhbnkjgkmccljifidpcc' },
        origin: window.location.origin,
      })
    );
    await vi.waitFor(() => expect(mockRuntime.connect).toHaveBeenCalled());
    const token = mockPort.postMessage.mock.calls[0][0].token;

    await onMessageListener({ type: 'REQUEST_CHALLENGE', token });
    const nonce = mockPort.postMessage.mock.calls[1][0].nonce;
    const ts = Date.now();

    const payload = `get_decrypted_creds:example.com:${nonce}:${ts}`;
    const key = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(token),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuffer = await window.crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(payload)
    );
    const signature = Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    await onMessageListener({
      type: 'get_decrypted_creds',
      token,
      nonce,
      ts,
      signature,
      domain: 'example.com',
    });

    await vi.waitFor(() =>
      expect(mockPort.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DECRYPTED_CREDS_RESPONSE',
          data: expect.any(Array),
        })
      )
    );

    const response = mockPort.postMessage.mock.calls.find(
      (c) => c[0].type === 'DECRYPTED_CREDS_RESPONSE'
    )[0];
    expect(response.data.length).toBe(1);
  });

  it('7. Runtime allowlist update permits new extension id', async () => {
    extensionBridge.updateAllowedExtensionIds(['runtime_ext_1']);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'AEGIS_EXTENSION_HELLO', extensionId: 'runtime_ext_1' },
        origin: window.location.origin,
      })
    );

    await vi.waitFor(() =>
      expect(mockRuntime.connect).toHaveBeenCalledWith('runtime_ext_1', {
        name: 'aegis-pwa-vault-port',
      })
    );
  });

  it('8. Supports multiple active ports and disconnects all on lock', async () => {
    const mockPortA = {
      postMessage: vi.fn(),
      disconnect: vi.fn(),
      onMessage: { addListener: vi.fn() },
      onDisconnect: { addListener: vi.fn() },
    };
    const mockPortB = {
      postMessage: vi.fn(),
      disconnect: vi.fn(),
      onMessage: { addListener: vi.fn() },
      onDisconnect: { addListener: vi.fn() },
    };

    mockRuntime.connect
      .mockReset()
      .mockReturnValueOnce(mockPortA as any)
      .mockReturnValueOnce(mockPortB as any);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'AEGIS_EXTENSION_HELLO', extensionId: 'gddgomiecgnihlljfkogfjgakedoielk' },
        origin: window.location.origin,
      })
    );
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'AEGIS_EXTENSION_HELLO', extensionId: 'kjbdjkfijeflhhbnkjgkmccljifidpcc' },
        origin: window.location.origin,
      })
    );

    await vi.waitFor(() => expect(mockRuntime.connect).toHaveBeenCalledTimes(2));
    extensionBridge.lockAndDisconnect();
    expect(mockPortA.postMessage).toHaveBeenCalledWith({ type: 'VAULT_LOCKED' });
    expect(mockPortB.postMessage).toHaveBeenCalledWith({ type: 'VAULT_LOCKED' });
    expect(mockPortA.disconnect).toHaveBeenCalledTimes(1);
    expect(mockPortB.disconnect).toHaveBeenCalledTimes(1);
  });

  it('9. normalizeDomain handles various URL formats and case sensitivity', () => {
    const normalize = (extensionBridge as any).normalizeDomain.bind(extensionBridge);
    expect(normalize('HTTPS://GOOGLE.COM/path')).toBe('google.com');
    expect(normalize('www.example.co.uk')).toBe('example.co.uk');
    expect(normalize('invalid-url::::')).toBe('invalid-url::::');
    expect(normalize('')).toBe('');
  });

  it('10. toRegistrableDomain extracts the correct base domain', () => {
    const toReg = (extensionBridge as any).toRegistrableDomain.bind(extensionBridge);
    expect(toReg('sub.example.com')).toBe('example.com');
    expect(toReg('a.b.c.example.co.uk')).toBe('co.uk');
  });

  it('11. verifySignedRequest enforces strict time drift and nonce validity', async () => {
    const session = {
      extensionId: 'id',
      token: 'token123',
      challengeNonceMap: new Map([['valid-nonce', Date.now() + 10000]]),
    };
    const verify = (extensionBridge as any).verifySignedRequest.bind(extensionBridge);

    session.challengeNonceMap.set('expired', Date.now() - 1000);
    expect(await verify(session, 'type', 'dom', 'expired', Date.now(), 'sig')).toBe(false);
    expect(await verify(session, 'type', 'dom', 'valid-nonce', Date.now() + 60000, 'sig')).toBe(
      false
    );
    expect(await verify(session, 'type', 'dom', 'valid-nonce', Date.now() - 60000, 'sig')).toBe(
      false
    );
    expect(await verify(session, 'type', 'dom', 'missing', Date.now(), 'sig')).toBe(false);
  });

  it('12. updateAllowedExtensionIds with empty list defaults to default IDs', () => {
    extensionBridge.updateAllowedExtensionIds(['custom_1']);
    expect(extensionBridge.getAllowedExtensionIds()).toContain('custom_1');
    extensionBridge.updateAllowedExtensionIds([]);
    expect(extensionBridge.getAllowedExtensionIds()).toContain('gddgomiecgnihlljfkogfjgakedoielk');
  });

  it('13. removeAllowedExtensionId with last ID defaults back', () => {
    const all = extensionBridge.getAllowedExtensionIds();
    all.forEach((id) => extensionBridge.removeAllowedExtensionId(id));
    expect(extensionBridge.getAllowedExtensionIds().length).toBeGreaterThan(0);
    expect(extensionBridge.getAllowedExtensionIds()).toContain('kjbdjkfijeflhhbnkjgkmccljifidpcc');
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extensionBridge } from '../ExtensionBridge';
import { vaultService } from '../../vaultService';

// Mock vaultService
vi.mock('../../vaultService', () => ({
  vaultService: {
    isConnected: true,
    getPasswords: vi.fn().mockResolvedValue([
      { title: 'Test', username: 'user', pass: 'p123', website: 'example.com' }
    ]),
  },
}));

describe('ExtensionBridge', () => {
  let mockPort: any;
  let mockRuntime: any;
  let onMessageListener: any;

  beforeEach(() => {
    vi.clearAllMocks();
    onMessageListener = null;
    extensionBridge.reset();

    mockPort = {
      postMessage: vi.fn(),
      disconnect: vi.fn(),
      onMessage: {
        addListener: vi.fn((l) => { onMessageListener = l; }),
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

  it('1. Hello mesajı ile bağlantı kurar ve Token paylaşır (Allowlist)', async () => {
    const helloMsg = new MessageEvent('message', {
      data: {
        type: 'AEGIS_EXTENSION_HELLO',
        extensionId: 'gddgomiecgnihlljfkogfjgakedoielk' // Allowlist default
      },
      origin: window.location.origin
    });

    window.dispatchEvent(helloMsg);

    expect(mockRuntime.connect).toHaveBeenCalledWith('gddgomiecgnihlljfkogfjgakedoielk', { name: "aegis-pwa-vault-port" });
    expect(mockPort.postMessage).toHaveBeenCalledWith(expect.objectContaining({ 
        type: 'SYNC_TOKEN',
        token: expect.any(String)
    }));
  });

  it('2. Yetkisiz Extension ID reddedilir', async () => {
    const evilMsg = new MessageEvent('message', {
      data: {
        type: 'AEGIS_EXTENSION_HELLO',
        extensionId: 'malicious_id'
      },
      origin: window.location.origin
    });

    window.dispatchEvent(evilMsg);
    expect(mockRuntime.connect).not.toHaveBeenCalled();
  });

  it('3. CHALLENGE isteğine yanıt verir', async () => {
    // Önce handshake yapalım
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'AEGIS_EXTENSION_HELLO', extensionId: 'kjbdjkfijeflhhbnkjgkmccljifidpcc' },
      origin: window.location.origin
    }));

    await vi.waitFor(() => expect(mockRuntime.connect).toHaveBeenCalled());
    const token = mockPort.postMessage.mock.calls[0][0].token;

    // Challenge isteği gönder
    await onMessageListener({ type: 'REQUEST_CHALLENGE', token });

    expect(mockPort.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'CHALLENGE_RESPONSE',
      nonce: expect.any(String)
    }));
  });

  it('4. Yanlış Token ile gelen istekleri reddeder', async () => {
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'AEGIS_EXTENSION_HELLO', extensionId: 'kjbdjkfijeflhhbnkjgkmccljifidpcc' },
      origin: window.location.origin
    }));

    await vi.waitFor(() => expect(mockRuntime.connect).toHaveBeenCalled());
    await onMessageListener({ type: 'REQUEST_CHALLENGE', token: 'wrong-token' });
    expect(mockPort.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'ERROR', error: 'UNAUTHORIZED_TOKEN' }));
  });

  it('5. lockAndDisconnect portu kapatır ve temizlik yapar', async () => {
    // Bağlantı kuralım
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'AEGIS_EXTENSION_HELLO', extensionId: 'kjbdjkfijeflhhbnkjgkmccljifidpcc' },
      origin: window.location.origin
    }));

    await vi.waitFor(() => expect(mockRuntime.connect).toHaveBeenCalled());
    extensionBridge.lockAndDisconnect();
    expect(mockPort.postMessage).toHaveBeenCalledWith({ type: 'VAULT_LOCKED' });
    expect(mockPort.disconnect).toHaveBeenCalled();
  });

  it('6. get_decrypted_creds: İmzalı isteği doğrular ve verileri döner', async () => {
    // 1. Handshake
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'AEGIS_EXTENSION_HELLO', extensionId: 'kjbdjkfijeflhhbnkjgkmccljifidpcc' },
      origin: window.location.origin
    }));
    await vi.waitFor(() => expect(mockRuntime.connect).toHaveBeenCalled());
    const token = mockPort.postMessage.mock.calls[0][0].token;

    // 2. Request Challenge
    await onMessageListener({ type: 'REQUEST_CHALLENGE', token });
    const nonce = mockPort.postMessage.mock.calls[1][0].nonce;
    const ts = Date.now();

    // 3. İmza oluştur
    const payload = `get_decrypted_creds:example.com:${nonce}:${ts}`;
    const key = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(token),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuffer = await window.crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    const signature = Array.from(new Uint8Array(sigBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');

    // 4. İmzalı isteği gönder
    await onMessageListener({
      type: 'get_decrypted_creds',
      token,
      nonce,
      ts,
      signature,
      domain: 'example.com'
    });

    await vi.waitFor(() => expect(mockPort.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'DECRYPTED_CREDS_RESPONSE',
      data: expect.any(Array)
    })));
    
    const response = mockPort.postMessage.mock.calls.find(c => c[0].type === 'DECRYPTED_CREDS_RESPONSE')[0];
    expect(response.data.length).toBe(1);
  });
});

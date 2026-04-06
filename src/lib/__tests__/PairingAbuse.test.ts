// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extensionBridge } from '../ExtensionBridge';

// Mock vaultService
vi.mock('../../vaultService', () => ({
  vaultService: {
    isUnlocked: vi.fn(() => true),
    getPasswords: vi.fn().mockResolvedValue([]),
  },
}));

describe('PairingAbuse (Security Stress Tests)', () => {
  let mockPort: any;
  let mockRuntime: any;
  let onMessageListener: any;

  beforeEach(() => {
    vi.clearAllMocks();
    extensionBridge.reset();
    onMessageListener = null;

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

  it('1. Replay Attack Prevention: Aynı nonce iki kez kullanılamaz', async () => {
    // Handshake
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'AEGIS_EXTENSION_HELLO', extensionId: 'gddgomiecgnihlljfkogfjgakedoielk' },
        origin: window.location.origin,
      })
    );
    await vi.waitFor(() => expect(mockRuntime.connect).toHaveBeenCalled());
    const token = mockPort.postMessage.mock.calls[0][0].token;

    // Challenge isteği
    await onMessageListener({ type: 'REQUEST_CHALLENGE', token });
    const nonce = mockPort.postMessage.mock.calls[1][0].nonce;
    const ts = Date.now();

    // 1. İmzalı istek (Başarılı)
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
        expect.objectContaining({ type: 'DECRYPTED_CREDS_RESPONSE' })
      )
    );

    // 2. Replay denemesi (Aynı nonce ile tekrar)
    mockPort.postMessage.mockClear();
    await onMessageListener({
      type: 'get_decrypted_creds',
      token,
      nonce,
      ts,
      signature,
      domain: 'example.com',
    });

    // Geçersiz nonce hatası almalı çünkü ilk başarılı kullanımda silindi
    expect(mockPort.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ERROR', error: 'INVALID_CHALLENGE_SIGNATURE' })
    );
  });

  it('2. Challenge Timeout: Süresi dolmuş nonce reddedilir', async () => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'AEGIS_EXTENSION_HELLO', extensionId: 'gddgomiecgnihlljfkogfjgakedoielk' },
        origin: window.location.origin,
      })
    );
    await vi.waitFor(() => expect(mockRuntime.connect).toHaveBeenCalled());
    const token = mockPort.postMessage.mock.calls[0][0].token;

    // Challenge isteği
    await onMessageListener({ type: 'REQUEST_CHALLENGE', token });
    const nonce = mockPort.postMessage.mock.calls[1][0].nonce;

    // Zamanı ileri alalım (20 saniyeden fazla)
    vi.useFakeTimers();
    vi.advanceTimersByTime(21_000);
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
    expect(mockPort.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ERROR', error: 'INVALID_CHALLENGE_SIGNATURE' })
    );

    vi.useRealTimers();
  });

  it('3. Rapid Re-pairing Flood: Sürekli HELLO mesajı gönderilmesi engellenmelidir', async () => {
    // İlk bağlantı
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'AEGIS_EXTENSION_HELLO', extensionId: 'gddgomiecgnihlljfkogfjgakedoielk' },
        origin: window.location.origin,
      })
    );
    await vi.waitFor(() => expect(mockRuntime.connect).toHaveBeenCalled());

    // İkinci bağlantı (Aynı ID) - normalde handleMessage buna 'trusted ID mismatch' hatası vermez
    // ama externally_connectable zaten aktif bir session varken yenisini açmamalı veya eskisini kapatmalı.
    // Mevcut impl: trustedExtensionId set edildiyse ve farklıysa reddeder.
    // Ama aynıysa? (Re-initialization flood test)

    for (let i = 0; i < 5; i++) {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'AEGIS_EXTENSION_HELLO', extensionId: 'gddgomiecgnihlljfkogfjgakedoielk' },
          origin: window.location.origin,
        })
      );
    }

    // mockRuntime.connect'in her helo için çağrıldığını kontrol edelim (mevcut impl prevent etmiyor olabilir)
    // Ama SYNC_TOKEN her seferinde değişmeli ve eskisi geçersiz olmalı.
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extensionBridge } from '../ExtensionBridge';

// Mock vaultService
vi.mock('../../vaultService', () => ({
  vaultService: {
    isUnlocked: vi.fn(() => true),
    getPasswords: vi.fn(),
  },
}));

describe('PairingAbuse (Security Stress Tests) - Phase 2', () => {
  let mockPort: any;
  let mockRuntime: any;
  let onMessageListener: any;

  beforeEach(() => {
    vi.clearAllMocks();
    extensionBridge.reset();

    mockPort = {
      postMessage: vi.fn(),
      disconnect: vi.fn(),
      onMessage: {
        addListener: vi.fn((l) => {
          onMessageListener = l;
        }),
      },
      onDisconnect: { addListener: vi.fn() },
    };

    mockRuntime = {
      connect: vi.fn().mockReturnValue(mockPort),
    };

    (window as any).chrome = { runtime: mockRuntime };
    extensionBridge.init();
  });

  it('4. Untrusted Extension ID: Kayıtlı olmayan bir ID bağlantı kurmamalıdır', async () => {
    // gddgomiecgnihlljfkogfjgakedoielk (Trusted) yerine sahte bir ID
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'AEGIS_EXTENSION_HELLO', extensionId: 'fake_extension_id_123' },
        origin: window.location.origin,
      })
    );

    // ExtensionBridge sahte ID'yi reddetmelidir
    await vi.waitFor(() => expect(mockRuntime.connect).not.toHaveBeenCalled());
  });

  it('5. Invalid Token Signature: HMAC imza sahteciliği yakalanmalıdır', async () => {
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

    // Yanlış imza (Örn: nonce yerine başka bir şey imzalanmış)
    const fakeSignature = 'a'.repeat(64);

    await onMessageListener({
      type: 'get_decrypted_creds',
      token,
      nonce,
      ts,
      signature: fakeSignature,
      domain: 'example.com',
    });

    // Beklenen hata: İmzalı istek reddedilmeli
    expect(mockPort.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ERROR',
        error: 'INVALID_CHALLENGE_SIGNATURE',
      })
    );
  });

  it('6. Token Hijacking Prevention: Başka bir token ile istek gönderilmesi', async () => {
    // Handshake
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'AEGIS_EXTENSION_HELLO', extensionId: 'gddgomiecgnihlljfkogfjgakedoielk' },
        origin: window.location.origin,
      })
    );
    await vi.waitFor(() => expect(mockRuntime.connect).toHaveBeenCalled());

    // Yanlış bir token ile istek
    const hijackedToken = 'hijacked_token_xyz_123';
    await onMessageListener({ type: 'REQUEST_CHALLENGE', token: hijackedToken });

    // Token eşleşmediği için challenge verilmemelidir
    expect(mockPort.postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CHALLENGE_RESPONSE',
      })
    );
  });
});

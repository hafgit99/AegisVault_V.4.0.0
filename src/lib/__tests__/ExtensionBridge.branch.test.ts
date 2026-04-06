// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extensionBridge } from '../ExtensionBridge';

vi.mock('../../vaultService', () => ({
  vaultService: {
    isUnlocked: vi.fn(() => false),
    getPasswords: vi.fn().mockResolvedValue([]),
  },
}));

describe('ExtensionBridge: Branch Coverage', () => {
  let mockPort: any;
  let mockRuntime: any;
  let onMessageListener: any;
  let onDisconnectListener: any;

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.removeItem('aegis_extension_allowlist_v1');
    onMessageListener = null;
    onDisconnectListener = null;
    extensionBridge.reset();

    mockPort = {
      postMessage: vi.fn(),
      disconnect: vi.fn(),
      onMessage: {
        addListener: vi.fn((l: any) => { onMessageListener = l; }),
      },
      onDisconnect: {
        addListener: vi.fn((l: any) => { onDisconnectListener = l; }),
      },
    };

    mockRuntime = {
      connect: vi.fn().mockReturnValue(mockPort),
    };

    (window as any).chrome = { runtime: mockRuntime };
    extensionBridge.init();
  });

  it('ignores message with wrong origin', () => {
    const msg = new MessageEvent('message', {
      data: { type: 'AEGIS_EXTENSION_HELLO', extensionId: 'gddgomiecgnihlljfkogfjgakedoielk' },
      origin: 'https://evil.com',
    });
    window.dispatchEvent(msg);
    expect(mockRuntime.connect).not.toHaveBeenCalled();
  });

  it('ignores message without AEGIS_EXTENSION_HELLO type', () => {
    const msg = new MessageEvent('message', {
      data: { type: 'OTHER_TYPE', extensionId: 'gddgomiecgnihlljfkogfjgakedoielk' },
      origin: window.location.origin,
    });
    window.dispatchEvent(msg);
    expect(mockRuntime.connect).not.toHaveBeenCalled();
  });

  it('ignores message with non-string extensionId', () => {
    const msg = new MessageEvent('message', {
      data: { type: 'AEGIS_EXTENSION_HELLO', extensionId: 12345 },
      origin: window.location.origin,
    });
    window.dispatchEvent(msg);
    expect(mockRuntime.connect).not.toHaveBeenCalled();
  });

  it('ignores message with missing extensionId', () => {
    const msg = new MessageEvent('message', {
      data: { type: 'AEGIS_EXTENSION_HELLO' },
      origin: window.location.origin,
    });
    window.dispatchEvent(msg);
    expect(mockRuntime.connect).not.toHaveBeenCalled();
  });

  it('ignores non-object data', () => {
    const msg = new MessageEvent('message', {
      data: 'string-data',
      origin: window.location.origin,
    });
    window.dispatchEvent(msg);
    expect(mockRuntime.connect).not.toHaveBeenCalled();
  });

  it('handles missing chrome.runtime gracefully', () => {
    (window as any).chrome = {};
    const msg = new MessageEvent('message', {
      data: { type: 'AEGIS_EXTENSION_HELLO', extensionId: 'gddgomiecgnihlljfkogfjgakedoielk' },
      origin: window.location.origin,
    });
    window.dispatchEvent(msg);
    expect(mockRuntime.connect).not.toHaveBeenCalled();
  });

  it('handles runtime.connect throwing error', () => {
    mockRuntime.connect.mockImplementation(() => { throw new Error('connect failed'); });
    const msg = new MessageEvent('message', {
      data: { type: 'AEGIS_EXTENSION_HELLO', extensionId: 'gddgomiecgnihlljfkogfjgakedoielk' },
      origin: window.location.origin,
    });
    expect(() => window.dispatchEvent(msg)).not.toThrow();
  });

  it('get_decrypted_creds with vault locked returns VAULT_LOCKED', async () => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'AEGIS_EXTENSION_HELLO', extensionId: 'kjbdjkfijeflhhbnkjgkmccljifidpcc' },
        origin: window.location.origin,
      })
    );
    await vi.waitFor(() => expect(mockRuntime.connect).toHaveBeenCalled());
    const token = mockPort.postMessage.mock.calls[0][0].token;

    // Get a challenge
    await onMessageListener({ type: 'REQUEST_CHALLENGE', token });
    const nonce = mockPort.postMessage.mock.calls[1][0].nonce;
    const ts = Date.now();

    // Sign with valid signature
    const payload = `get_decrypted_creds:example.com:${nonce}:${ts}`;
    const key = await window.crypto.subtle.importKey(
      'raw', new TextEncoder().encode(token),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sigBuffer = await window.crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    const signature = Array.from(new Uint8Array(sigBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');

    await onMessageListener({ type: 'get_decrypted_creds', token, nonce, ts, signature, domain: 'example.com' });

    await vi.waitFor(() =>
      expect(mockPort.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'ERROR', error: 'VAULT_LOCKED' })
      )
    );
  });

  it('get_decrypted_creds with invalid signature returns INVALID_CHALLENGE_SIGNATURE', async () => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'AEGIS_EXTENSION_HELLO', extensionId: 'kjbdjkfijeflhhbnkjgkmccljifidpcc' },
        origin: window.location.origin,
      })
    );
    await vi.waitFor(() => expect(mockRuntime.connect).toHaveBeenCalled());
    const token = mockPort.postMessage.mock.calls[0][0].token;

    await onMessageListener({ type: 'get_decrypted_creds', token, nonce: 'fake', ts: Date.now(), signature: 'badsig', domain: 'example.com' });

    await vi.waitFor(() =>
      expect(mockPort.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'ERROR', error: 'INVALID_CHALLENGE_SIGNATURE' })
      )
    );
  });

  it('removeAllowedExtensionId resets to defaults when set becomes empty', () => {
    extensionBridge.updateAllowedExtensionIds(['test-ext-id']);
    expect(extensionBridge.getAllowedExtensionIds()).toContain('test-ext-id');

    extensionBridge.removeAllowedExtensionId('test-ext-id');
    const ids = extensionBridge.getAllowedExtensionIds();
    expect(ids.length).toBeGreaterThan(0);
    // Should have reverted to defaults
    expect(ids).toContain('gddgomiecgnihlljfkogfjgakedoielk');
  });

  it('addAllowedExtensionId ignores empty string', () => {
    const before = extensionBridge.getAllowedExtensionIds().length;
    extensionBridge.addAllowedExtensionId('   ');
    expect(extensionBridge.getAllowedExtensionIds().length).toBe(before);
  });

  it('addAllowedExtensionId adds valid id', () => {
    extensionBridge.addAllowedExtensionId('new-ext-id');
    expect(extensionBridge.getAllowedExtensionIds()).toContain('new-ext-id');
  });

  it('updateAllowedExtensionIds with empty array resets to defaults', () => {
    extensionBridge.updateAllowedExtensionIds([]);
    const ids = extensionBridge.getAllowedExtensionIds();
    expect(ids).toContain('gddgomiecgnihlljfkogfjgakedoielk');
  });

  it('dispose removes listener and disconnects', () => {
    extensionBridge.dispose();
    // Calling init again should work after dispose
    extensionBridge.init();
    const msg = new MessageEvent('message', {
      data: { type: 'AEGIS_EXTENSION_HELLO', extensionId: 'gddgomiecgnihlljfkogfjgakedoielk' },
      origin: window.location.origin,
    });
    window.dispatchEvent(msg);
    expect(mockRuntime.connect).toHaveBeenCalled();
  });

  it('init called twice does not duplicate listener', () => {
    extensionBridge.init(); // second call - should be no-op
    const msg = new MessageEvent('message', {
      data: { type: 'AEGIS_EXTENSION_HELLO', extensionId: 'gddgomiecgnihlljfkogfjgakedoielk' },
      origin: window.location.origin,
    });
    window.dispatchEvent(msg);
    // Should only connect once even though init was called twice
    expect(mockRuntime.connect).toHaveBeenCalledTimes(1);
  });

  it('onDisconnect listener clears session', async () => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'AEGIS_EXTENSION_HELLO', extensionId: 'kjbdjkfijeflhhbnkjgkmccljifidpcc' },
        origin: window.location.origin,
      })
    );
    await vi.waitFor(() => expect(mockRuntime.connect).toHaveBeenCalled());
    expect(onDisconnectListener).toBeTruthy();
    onDisconnectListener();
    // After disconnect, lockAndDisconnect should not throw
    extensionBridge.lockAndDisconnect();
  });

  it('accepts chrome-extension:// origin', () => {
    const msg = new MessageEvent('message', {
      data: { type: 'AEGIS_EXTENSION_HELLO', extensionId: 'gddgomiecgnihlljfkogfjgakedoielk' },
      origin: 'chrome-extension://abcdef',
    });
    window.dispatchEvent(msg);
    expect(mockRuntime.connect).toHaveBeenCalled();
  });
});
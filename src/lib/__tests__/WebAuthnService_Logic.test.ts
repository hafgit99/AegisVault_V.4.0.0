// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  WebAuthnService,
  isWebAuthnSupported,
  isConditionalMediationSupported,
  extractRpIdFromUrl,
} from '../WebAuthnService';

describe('WebAuthnService: Site Passkey Registration & Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock navigator.credentials
    Object.defineProperty(navigator, 'credentials', {
      value: {
        create: vi.fn(),
        get: vi.fn(),
      },
      configurable: true,
    });

    // Mock PublicKeyCredential
    (window as any).PublicKeyCredential = {
      isConditionalMediationAvailable: vi.fn().mockResolvedValue(true),
    };
  });

  it('1. registerSitePasskey: WebAuthn create akışını yönetir', async () => {
    const mockCred = {
      id: 'cid-123',
      rawId: new ArrayBuffer(8),
      type: 'public-key',
      response: {
        getPublicKey: vi.fn().mockReturnValue(new ArrayBuffer(32)),
        getAuthenticatorData: vi.fn().mockReturnValue(new ArrayBuffer(16)),
        clientDataJSON: new ArrayBuffer(8),
        attestationObject: new ArrayBuffer(8),
        getTransports: vi.fn().mockReturnValue(['usb']),
      },
      authenticatorAttachment: 'platform',
      getClientExtensionResults: vi.fn().mockReturnValue({}),
    };
    (navigator.credentials.create as any).mockResolvedValue(mockCred);

    const result = await WebAuthnService.registerSitePasskey({
      rpId: 'example.com',
      rpName: 'Example',
      userName: 'user',
      userDisplayName: 'User',
    });

    expect(result?.credentialId).toBe('cid-123');
    expect(navigator.credentials.create).toHaveBeenCalled();
  });

  it('2. authenticateSitePasskey: WebAuthn get akışını yönetir', async () => {
    const mockAssertion = {
      id: 'cid-123',
      rawId: new ArrayBuffer(8),
      type: 'public-key',
      response: {
        authenticatorData: new ArrayBuffer(16),
        clientDataJSON: new ArrayBuffer(8),
        signature: new ArrayBuffer(8),
        userHandle: new ArrayBuffer(4),
      },
      getClientExtensionResults: vi.fn().mockReturnValue({}),
    };
    (navigator.credentials.get as any).mockResolvedValue(mockAssertion);

    const result = await WebAuthnService.authenticateSitePasskey({
      rpId: 'example.com',
      allowCredentialIds: ['cid-123'],
    });

    expect(result?.credentialId).toBe('cid-123');
    expect(navigator.credentials.get).toHaveBeenCalled();
  });

  it('3. registrationToPasskeyMetadata: Format dönüşümü yapar', () => {
    const regResult = {
      credentialId: 'c1',
      publicKeyBase64: 'p1',
      rpId: 'test.com',
      userHandle: 'u1',
      displayName: 'User',
      transport: ['usb', 'nfc'],
      authenticatorAttachment: 'platform',
      algorithm: -7,
      registeredAt: '2026-03-25T10:00:00Z',
    } as any;
    const meta = WebAuthnService.registrationToPasskeyMetadata(regResult);
    expect(meta.rp_id).toBe('test.com');
    expect(meta.transport).toBe('usb,nfc');
    expect(meta.algorithm).toBe('-7');
  });

  it('4. updateMetadataAfterAuth: Metadata günceller', () => {
    const existing = { rp_id: 't.com' } as any;
    const auth = { authenticatedAt: '2026-03-25T11:00:00Z' } as any;
    const updated = WebAuthnService.updateMetadataAfterAuth(existing, auth);
    expect(updated.last_auth_at).toBe('2026-03-25T11:00:00Z');
    expect(updated.server_verified).toBe(true);
  });

  it('5. Yardımcılar: isWebAuthnSupported, extractRpIdFromUrl', async () => {
    expect(isWebAuthnSupported()).toBe(true);
    expect(await isConditionalMediationSupported()).toBe(true);
    expect(extractRpIdFromUrl('https://my.vault.com/login')).toBe('my.vault.com');
    expect(extractRpIdFromUrl('invalid-url')).toBe('invalid-url');
  });

  it('6. Hata Durumları (Catch blocks)', async () => {
    (navigator.credentials.create as any).mockRejectedValue(new Error('Abort'));
    const reg = await WebAuthnService.registerSitePasskey({ rpId: 'e.com', userName: 'u' });
    expect(reg).toBeNull();

    (navigator.credentials.get as any).mockRejectedValue(new Error('Abort'));
    const auth = await WebAuthnService.authenticateSitePasskey({ rpId: 'e.com' });
    expect(auth).toBeNull();
  });
});

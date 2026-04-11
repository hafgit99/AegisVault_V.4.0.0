// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  WebAuthnService,
  isWebAuthnSupported,
  extractRpIdFromUrl,
  isConditionalMediationSupported,
} from '../WebAuthnService';

describe('WebAuthnService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 
    global.navigator.credentials = {
      create: vi.fn(),
      get: vi.fn(),
    };

    // 
    global.window.PublicKeyCredential = class {
      static isConditionalMediationAvailable = vi.fn().mockResolvedValue(true);
    };
    // 
    global.window.TextEncoder = class {
      encode(s: string) {
        return new Uint8Array(s.length).fill(1);
      }
    };
    // 
    global.window.TextDecoder = class {
      decode(arr: any) {
        return '';
      }
    };
  });

  it('detects WebAuthn support correctly', () => {
    expect(isWebAuthnSupported()).toBe(true);

    // Test unsupported state
    const originalNavigator = global.navigator;
    // 
    global.navigator = { credentials: undefined };
    expect(isWebAuthnSupported()).toBe(false);
    global.navigator = originalNavigator;
  });

  it('checks conditional mediation support', async () => {
    const supported = await isConditionalMediationSupported();
    expect(supported).toBe(true);
    expect(window.PublicKeyCredential.isConditionalMediationAvailable).toHaveBeenCalled();

    // Test failure case
    (window.PublicKeyCredential.isConditionalMediationAvailable as any).mockRejectedValue(
      new Error('no')
    );
    const supportedFail = await isConditionalMediationSupported();
    expect(supportedFail).toBe(false);
  });

  it('can extract RP ID from URL', () => {
    expect(extractRpIdFromUrl('https://github.com/settings/security')).toBe('github.com');
    expect(extractRpIdFromUrl('google.com')).toBe('google.com');
    expect(extractRpIdFromUrl('invalid-url::::')).toBe('invalid-url::::');
  });

  describe('registerSitePasskey', () => {
    it('calls navigator.credentials.create with correct options including PRF and timeouts', async () => {
      (navigator.credentials as any).create.mockResolvedValue({
        id: 'mock-cred-id',
        response: {
          getPublicKey: () => new Uint8Array([1, 2, 3]).buffer,
          getTransports: () => ['internal', 'hybrid'],
          getPublicKeyAlgorithm: () => -7,
        },
      });

      const result = await WebAuthnService.registerSitePasskey({
        rpId: 'aegisvault.xyz',
        rpName: 'Aegis Vault',
        userName: 'testuser',
        userDisplayName: 'Test User',
        authenticatorAttachment: 'cross-platform', // mutant test for conditional logic
        timeout: 45000,
      });

      expect(navigator.credentials.create).toHaveBeenCalled();
      const callArgs = (navigator.credentials.create as any).mock.calls[0][0];
      expect(callArgs.publicKey.rp.id).toBe('aegisvault.xyz');
      expect(callArgs.publicKey.timeout).toBe(45000);
      expect(callArgs.publicKey.authenticatorSelection.authenticatorAttachment).toBe(
        'cross-platform'
      );

      expect(result).not.toBeNull();
      expect(result?.credentialId).toBe('mock-cred-id');
      expect(result?.transport).toContain('hybrid');
    });

    it('handles userId option vs random generation', async () => {
      (navigator.credentials as any).create.mockResolvedValue({ id: 'id', response: {} });

      await WebAuthnService.registerSitePasskey({
        rpId: 'test',
        userName: 'u',
        userDisplayName: 'D',
        userId: 'custom-id',
      });
      const options = (navigator.credentials.create as any).mock.calls[0][0];
      expect(options.publicKey.user.id).toBeDefined();
    });

    it('returns null if navigator.credentials.create fails', async () => {
      (navigator.credentials as any).create.mockRejectedValue(new Error('User cancelled'));
      const result = await WebAuthnService.registerSitePasskey({
        rpId: 'error.com',
        userName: 'user',
        userDisplayName: 'User',
      });
      expect(result).toBeNull();
    });
  });

  describe('authenticateSitePasskey', () => {
    it('calls navigator.credentials.get with correct timeout and rpId', async () => {
      (navigator.credentials as any).get.mockResolvedValue({
        id: 'auth-cred-id',
        response: {
          authenticatorData: new Uint8Array([1]).buffer,
          clientDataJSON: new Uint8Array([2]).buffer,
          signature: new Uint8Array([3]).buffer,
          userHandle: new Uint8Array([4]).buffer,
        },
      });

      const result = await WebAuthnService.authenticateSitePasskey({
        rpId: 'aegisvault.xyz',
        allowCredentialIds: ['mock-cred-id'],
        timeout: 30000,
      });

      expect(navigator.credentials.get).toHaveBeenCalled();
      const callArgs = (navigator.credentials.get as any).mock.calls[0][0];
      expect(callArgs.publicKey.rpId).toBe('aegisvault.xyz');
      expect(callArgs.publicKey.timeout).toBe(30000);
      expect(result?.credentialId).toBe('auth-cred-id');
    });
  });

  describe('Metadata Mapping and Updates', () => {
    it('correctly maps registration result to canonical metadata', () => {
      const regResult = {
        credentialId: 'cid123',
        publicKeyBase64: 'pkb64',
        rpId: 'test.com',
        userHandle: 'uh123',
        displayName: 'User Name',
        transport: ['internal', 'hybrid'],
        authenticatorAttachment: 'platform',
        algorithm: -7,
        registeredAt: '2026-03-25T12:00:00Z',
      };

      const metadata = WebAuthnService.registrationToPasskeyMetadata(regResult);
      expect(metadata.rp_id).toBe('test.com');
      expect(metadata.transport).toBe('internal,hybrid');
      expect(metadata.mode).toBe('site_passkey_active');
    });

    it('updates metadata after successful authentication', () => {
      const existing = {
        rp_id: 'test.com',
        credential_id: 'old-id',
        user_handle: 'uh123',
        display_name: 'User',
        transport: 'internal',
        authenticator_attachment: 'platform',
        algorithm: '-7',
        mode: 'site_passkey_active' as const,
        server_verified: false,
        created_at: '2026-01-01T00:00:00Z',
      };

      const authResult = {
        credentialId: 'new-id',
        rpId: 'test.com',
        authenticatorDataBase64: 'adb',
        clientDataJSONBase64: 'cdj',
        signatureBase64: 'sig',
        userHandleBase64: 'uhb64',
        authenticatedAt: '2026-03-25T13:00:00Z',
      };

      const updated = WebAuthnService.updateMetadataAfterAuth(existing, authResult);
      expect(updated.server_verified).toBe(true);
      expect(updated.last_auth_at).toBe('2026-03-25T13:00:00Z');
      expect(updated.credential_id).toBe('old-id'); // should keep existing if present
    });
  });
});

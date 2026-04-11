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

    // @ts-ignore
    global.navigator.credentials = {
      create: vi.fn(),
      get: vi.fn(),
    };

    // @ts-ignore
    global.window.PublicKeyCredential = class {
      static isConditionalMediationAvailable = vi.fn().mockResolvedValue(true);
    };
    // @ts-ignore
    global.window.TextEncoder = class {
      encode(s: string) {
        return new Uint8Array(s.length).fill(1);
      }
    };
    // @ts-ignore
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
    // @ts-ignore
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
    expect(extractRpIdFromUrl('http://insecure.site')).toBe('insecure.site'); // http test
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
      expect(result?.publicKeyBase64).toBeDefined();
    });

    it('sets optional parameters properly when provided', async () => {
      (navigator.credentials as any).create.mockResolvedValue({ id: 'id', response: {} });

      await WebAuthnService.registerSitePasskey({
        rpId: 'test.com',
        userName: 'user',
        attestation: 'direct',
        residentKey: 'required',
        userVerification: 'required',
        excludeCredentialIds: ['existing-id'],
      });
      const options = (navigator.credentials.create as any).mock.calls[0][0];
      const pub = options.publicKey;
      expect(pub.attestation).toBe('direct');
      expect(pub.authenticatorSelection.residentKey).toBe('required');
      expect(pub.authenticatorSelection.userVerification).toBe('required');
      expect(pub.excludeCredentials[0].id.byteLength).toBeGreaterThan(0);
    });

    it('falls back to defaults when optional parameters are omitted', async () => {
      (navigator.credentials as any).create.mockResolvedValue({ id: 'id', response: {} });

      await WebAuthnService.registerSitePasskey({
        rpId: 'test.com',
        userName: 'user',
        // userDisplayName omitted
        // rpName omitted
      });
      const options = (navigator.credentials.create as any).mock.calls[0][0];
      const pub = options.publicKey;
      expect(pub.rp.name).toBe('test.com');
      expect(pub.user.displayName).toBe('user');
      expect(pub.attestation).toBe('none');
      expect(pub.authenticatorSelection.residentKey).toBe('preferred');
      expect(pub.authenticatorSelection.userVerification).toBe('preferred');
      expect(pub.authenticatorSelection.authenticatorAttachment).toBe('platform');
      expect(pub.timeout).toBe(60000);
      expect(pub.excludeCredentials).toEqual([]);
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

    it('returns null if navigator.credentials.create returns null', async () => {
      (navigator.credentials as any).create.mockResolvedValue(null);
      const result = await WebAuthnService.registerSitePasskey({
        rpId: 'error.com',
        userName: 'u',
        userDisplayName: 'D',
      });
      expect(result).toBeNull();
    });

    it('handles missing response methods gracefully', async () => {
      (navigator.credentials as any).create.mockResolvedValue({
        id: 'no-methods',
        response: {
          // completely missing getTransports, getPublicKeyAlgorithm, getPublicKey
        },
        authenticatorAttachment: null,
      });

      const result = await WebAuthnService.registerSitePasskey({
        rpId: 'missing.com',
        userName: 'user',
        userDisplayName: 'User',
      });

      expect(result?.credentialId).toBe('no-methods');
      expect(result?.transport).toEqual([]);
      expect(result?.algorithm).toBe(-7);
      expect(result?.publicKeyBase64).toBe('');
      expect(result?.authenticatorAttachment).toBe('platform');
    });

    it('throws if WebAuthn is unsupported during register', async () => {
      const originalNav = global.navigator;
      // @ts-ignore
      global.navigator = { credentials: undefined };
      await expect(
        WebAuthnService.registerSitePasskey({ rpId: 'x', userName: 'x' })
      ).rejects.toThrow('WebAuthn is not supported in this browser.');
      global.navigator = originalNav;
    });

    it('handles edge case when authenticatorAttachment is not cross-platform', async () => {
      // test the branch logic for attachment handling around line 167
      (navigator.credentials as any).create.mockResolvedValue({ id: 'id', response: {} });

      await WebAuthnService.registerSitePasskey({
        rpId: 'test.com',
        userName: 'user',
        authenticatorAttachment: 'platform',
      });
      const options = (navigator.credentials.create as any).mock.calls[0][0];
      expect(options.publicKey.authenticatorSelection.authenticatorAttachment).toBe('platform');
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
        userVerification: 'required',
      });

      expect(navigator.credentials.get).toHaveBeenCalled();
      const callArgs = (navigator.credentials.get as any).mock.calls[0][0];
      expect(callArgs.publicKey.rpId).toBe('aegisvault.xyz');
      expect(callArgs.publicKey.timeout).toBe(30000);
      expect(callArgs.publicKey.userVerification).toBe('required');
      expect(callArgs.publicKey.allowCredentials[0].type).toBe('public-key');
      expect(callArgs.publicKey.allowCredentials[0].transports).toEqual([
        'internal',
        'hybrid',
        'usb',
        'ble',
        'nfc',
      ]);
      expect(result?.credentialId).toBe('auth-cred-id');
      expect(result?.userHandleBase64).toBeDefined();
      expect(result?.authenticatorDataBase64).toBeDefined();
    });

    it('handles authentication without allowCredentialIds and without userHandle', async () => {
      (navigator.credentials as any).get.mockResolvedValue({
        id: 'auth-cred-id-2',
        response: {
          authenticatorData: new Uint8Array([1]).buffer,
          clientDataJSON: new Uint8Array([2]).buffer,
          signature: new Uint8Array([3]).buffer,
          userHandle: null, // edge case
        },
      });

      const result = await WebAuthnService.authenticateSitePasskey({
        rpId: 'aegisvault.xyz', // no allowCredentialIds
      });

      expect(navigator.credentials.get).toHaveBeenCalled();
      const callArgs = (navigator.credentials.get as any).mock.calls[0][0];
      expect(callArgs.publicKey.allowCredentials).toBeUndefined();
      expect(callArgs.publicKey.userVerification).toBe('preferred');
      expect(callArgs.publicKey.timeout).toBe(60000);
      expect(result?.userHandleBase64).toBeNull();
    });

    it('returns null if navigator.credentials.get fails', async () => {
      (navigator.credentials as any).get.mockRejectedValue(new Error('User cancelled'));
      const result = await WebAuthnService.authenticateSitePasskey({
        rpId: 'error.com',
      });
      expect(result).toBeNull();
    });

    it('returns null if navigator.credentials.get returns null', async () => {
      (navigator.credentials as any).get.mockResolvedValue(null);
      const result = await WebAuthnService.authenticateSitePasskey({
        rpId: 'error.com',
      });
      expect(result).toBeNull();
    });

    it('throws if WebAuthn is unsupported during authenticate', async () => {
      const originalNav = global.navigator;
      // @ts-ignore
      global.navigator = { credentials: undefined };
      await expect(WebAuthnService.authenticateSitePasskey({ rpId: 'x' })).rejects.toThrow(
        'WebAuthn is not supported in this browser.'
      );
      global.navigator = originalNav;
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

    it('registrationToPasskeyMetadata handles missing transport', () => {
      const metadata = WebAuthnService.registrationToPasskeyMetadata({
        credentialId: '1',
        rpId: 'test',
        userHandle: 'uh',
        displayName: 'dn',
        authenticatorAttachment: 'cross-platform',
        algorithm: -7,
        registeredAt: '2026-03-25',
        publicKeyBase64: 'base',
        transport: undefined as any, // test missing transport
      });
      expect(metadata.transport).toBe('');
    });

    it('updates metadata properly when credentialId is missing from existing', () => {
      const existing: any = { credential_id: undefined };
      const authResult: any = { credentialId: 'auth-cid', authenticatedAt: 'now' };
      const res = WebAuthnService.updateMetadataAfterAuth(existing, authResult);
      expect(res.credential_id).toBe('auth-cid'); // Falls back to authResult
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

  describe('Edge cases and surviving mutants', () => {
    it('isWebAuthnSupported returns false if PublicKeyCredential is undefined', () => {
      const orig = window.PublicKeyCredential;
      (window as any).PublicKeyCredential = undefined;
      expect(isWebAuthnSupported()).toBe(false);
      window.PublicKeyCredential = orig;
    });

    it('isConditionalMediationSupported handles absent method gracefully', async () => {
      const orig = window.PublicKeyCredential.isConditionalMediationAvailable;
      (window.PublicKeyCredential as any).isConditionalMediationAvailable = undefined;
      expect(await isConditionalMediationSupported()).toBe(false);
      window.PublicKeyCredential.isConditionalMediationAvailable = orig;
    });

    it('extractRpIdFromUrl correctly builds HTTPS url for lacking ones', () => {
      expect(extractRpIdFromUrl('ftp.server.com')).toBe('ftp.server.com');
      // Because `ftp.server.com` doesn't start with `http`, it becomes `https://ftp.server.com`, hostname is `ftp.server.com`
      // So ensuring the `https://` literal logic works:
    });

    it('registerSitePasskey logs error properly on reject', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (navigator.credentials as any).create.mockRejectedValue(new Error('Nope'));

      await WebAuthnService.registerSitePasskey({ rpId: 'e.com', userName: 'e' });
      expect(spy).toHaveBeenCalledWith(
        '[WebAuthnService] Site passkey registration failed:',
        expect.any(Error)
      );
      spy.mockRestore();
    });

    it('authenticateSitePasskey logs error properly on reject', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (navigator.credentials as any).get.mockRejectedValue(new Error('AuthNope'));

      await WebAuthnService.authenticateSitePasskey({ rpId: 'a.com' });
      expect(spy).toHaveBeenCalledWith(
        '[WebAuthnService] Site passkey authentication failed:',
        expect.any(Error)
      );
      spy.mockRestore();
    });

    it('handles userHandle slice when it is an ArrayBuffer (not Uint8Array)', async () => {
      // Mock randomly returning ArrayBuffer instead of Uint8Array for userId
      const origCrypto = window.crypto.getRandomValues;
      (window as any).crypto.getRandomValues = () => new ArrayBuffer(32);

      (navigator.credentials as any).create.mockResolvedValue({
        id: 'mock',
        response: {},
      });

      const res = await WebAuthnService.registerSitePasskey({ rpId: 'mock', userName: 'mock' });
      expect(res?.userHandle).toBeDefined();

      window.crypto.getRandomValues = origCrypto;
    });
  });
});

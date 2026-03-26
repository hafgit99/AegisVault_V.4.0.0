import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebAuthnService, isWebAuthnSupported, extractRpIdFromUrl } from '../WebAuthnService';

// WebAuthn API Mocking
const mockNavigator = {
  credentials: {
    create: vi.fn(),
    get: vi.fn(),
  },
};

describe('WebAuthnService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-ignore
    global.navigator = mockNavigator;
    // @ts-ignore
    global.window = {
      crypto: {
        getRandomValues: (arr: any) => arr.fill(0),
      },
      PublicKeyCredential: class {},
    };
  });

  it('detects WebAuthn support correctly', () => {
    console.log('--- TEST RUNNING: isWebAuthnSupported ---');
    expect(isWebAuthnSupported()).toBe(true);
  });

  it('can extract RP ID from URL', () => {
    expect(extractRpIdFromUrl('https://github.com/settings/security')).toBe('github.com');
    expect(extractRpIdFromUrl('google.com')).toBe('google.com');
  });

  describe('registerSitePasskey', () => {
    it('calls navigator.credentials.create with correct options', async () => {
      mockNavigator.credentials.create.mockResolvedValue({
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
      });

      expect(mockNavigator.credentials.create).toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect(result?.credentialId).toBe('mock-cred-id');
      expect(result?.transport).toContain('hybrid');
    });

    it('returns null if navigator.credentials.create fails', async () => {
      mockNavigator.credentials.create.mockRejectedValue(new Error('User cancelled'));
      const result = await WebAuthnService.registerSitePasskey({
        rpId: 'error.com',
        userName: 'user',
        userDisplayName: 'User',
      });
      expect(result).toBeNull();
    });
  });

  describe('authenticateSitePasskey', () => {
    it('calls navigator.credentials.get with correct options', async () => {
      mockNavigator.credentials.get.mockResolvedValue({
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
      });

      expect(mockNavigator.credentials.get).toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect(result?.credentialId).toBe('auth-cred-id');
    });
  });

  describe('Metadata Mapping', () => {
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
  });
});

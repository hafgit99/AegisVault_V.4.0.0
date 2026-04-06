/**
 * WebAuthnService — Aegis 4.2 Faz 1 / Adim 1.1
 *
 * Site passkey kayit (registration) ve kimlik dogrulama (authentication)
 * islemlerini yoneten servis katmani.
 *
 * 4.1'deki vault-unlock PRF akisindan farkli olarak bu servis,
 * kullanicinin web sitelerine passkey ile giris yapmasini saglayan
 * relying-party (RP) odakli WebAuthn akislarini yonetir.
 */

import { bufferToBase64url, base64urlToBuffer } from './webAuthn';
import type { CanonicalPasskeyFields } from './canonical-schema';

/* ------------------------------------------------------------------ */
/*  Tipler                                                             */
/* ------------------------------------------------------------------ */

/** Site passkey kayit sonucu */
export interface SitePasskeyRegistrationResult {
  credentialId: string;
  publicKeyBase64: string;
  rpId: string;
  userHandle: string;
  displayName: string;
  transport: string[];
  authenticatorAttachment: string;
  algorithm: number;
  registeredAt: string;
}

/** Site passkey kimlik dogrulama sonucu */
export interface SitePasskeyAuthResult {
  credentialId: string;
  rpId: string;
  authenticatorDataBase64: string;
  clientDataJSONBase64: string;
  signatureBase64: string;
  userHandleBase64: string | null;
  authenticatedAt: string;
}

/** Kayit icin gerekli RP bilgisi */
export interface SitePasskeyRegistrationOptions {
  rpId: string;
  rpName: string;
  userName: string;
  userDisplayName: string;
  userId?: string;
  timeout?: number;
  authenticatorAttachment?: AuthenticatorAttachment;
  residentKey?: ResidentKeyRequirement;
  userVerification?: UserVerificationRequirement;
  attestation?: AttestationConveyancePreference;
  excludeCredentialIds?: string[];
}

/** Dogrulama icin gerekli bilgi */
export interface SitePasskeyAuthOptions {
  rpId: string;
  allowCredentialIds?: string[];
  timeout?: number;
  userVerification?: UserVerificationRequirement;
}

/* ------------------------------------------------------------------ */
/*  WebAuthn Tip Genişletmeleri                                        */
/* ------------------------------------------------------------------ */

/** TypeScript DOM lib henüz authenticatorAttachment içermiyor */
interface PublicKeyCredentialWithAttachment extends PublicKeyCredential {
  authenticatorAttachment: string | null;
}

/* ------------------------------------------------------------------ */
/*  Yardimci fonksiyonlar                                              */
/* ------------------------------------------------------------------ */

/** WebAuthn API destegini kontrol eder */
export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator.credentials !== 'undefined'
  );
}

/** Conditional UI (autofill) destegini kontrol eder */
export async function isConditionalMediationSupported(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    if (typeof PublicKeyCredential.isConditionalMediationAvailable === 'function') {
      return await PublicKeyCredential.isConditionalMediationAvailable();
    }
  } catch {
    /* tarayici desteklemiyorsa sessizce false don */
  }
  return false;
}

/** RP ID'yi URL'den cikarir */
export function extractRpIdFromUrl(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname;
  } catch {
    return url;
  }
}

/* ------------------------------------------------------------------ */
/*  Ana servis                                                         */
/* ------------------------------------------------------------------ */

export class WebAuthnService {
  /**
   * Bir web sitesi (RP) icin yeni site passkey kaydeder.
   *
   * Bu fonksiyon `navigator.credentials.create()` kullanarak
   * WebAuthn kayit seremoni baslatir.
   */
  static async registerSitePasskey(
    options: SitePasskeyRegistrationOptions
  ): Promise<SitePasskeyRegistrationResult | null> {
    if (!isWebAuthnSupported()) {
      throw new Error('WebAuthn is not supported in this browser.');
    }

    const userId = options.userId
      ? new TextEncoder().encode(options.userId)
      : window.crypto.getRandomValues(new Uint8Array(32));

    const challenge = window.crypto.getRandomValues(new Uint8Array(32));

    const excludeCredentials: PublicKeyCredentialDescriptor[] = (
      options.excludeCredentialIds || []
    ).map((id) => ({
      type: 'public-key' as const,
      id: base64urlToBuffer(id),
    }));

    const publicKeyOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        id: options.rpId,
        name: options.rpName || options.rpId,
      },
      user: {
        id: userId,
        name: options.userName,
        displayName: options.userDisplayName || options.userName,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      timeout: options.timeout || 60000,
      attestation: options.attestation || 'none',
      excludeCredentials,
      authenticatorSelection: {
        authenticatorAttachment: options.authenticatorAttachment || 'platform',
        residentKey: options.residentKey || 'preferred',
        userVerification: options.userVerification || 'preferred',
      },
    };

    // Note: When attachment is 'cross-platform', browsers usually offer QR code (hybrid).
    // We allow the user to specify it via options, defaulting to 'platform'.
    if (
      options.authenticatorAttachment === 'cross-platform' &&
      publicKeyOptions.authenticatorSelection
    ) {
      publicKeyOptions.authenticatorSelection.authenticatorAttachment = 'cross-platform';
    }

    try {
      const resp = await navigator.credentials.create({
        publicKey: publicKeyOptions,
      });
      const credential = resp as PublicKeyCredential;

      if (!credential) return null;

      const response = credential.response as AuthenticatorAttestationResponse;
      const publicKeyBytes = response.getPublicKey?.();

      // Transport bilgisi
      let transports: string[] = [];
      if (typeof response.getTransports === 'function') {
        transports = response.getTransports() as string[];
      }

      // Algoritma bilgisi
      let algorithm = -7; // ES256 varsayilan
      if (typeof response.getPublicKeyAlgorithm === 'function') {
        algorithm = response.getPublicKeyAlgorithm();
      }

      return {
        credentialId: credential.id,
        publicKeyBase64: publicKeyBytes ? bufferToBase64url(publicKeyBytes) : '',
        rpId: options.rpId,
        userHandle: bufferToBase64url(
          userId instanceof Uint8Array
            ? userId.buffer.slice(userId.byteOffset, userId.byteOffset + userId.byteLength)
            : userId
        ),
        displayName: options.userDisplayName || options.userName,
        transport: transports,
        authenticatorAttachment:
          (credential as PublicKeyCredentialWithAttachment).authenticatorAttachment ||
          options.authenticatorAttachment ||
          'platform',
        algorithm,
        registeredAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[WebAuthnService] Site passkey registration failed:', error);
      return null;
    }
  }

  /**
   * Kayitli bir site passkey ile kimlik dogrulama yapar.
   *
   * Bu fonksiyon `navigator.credentials.get()` kullanarak
   * WebAuthn dogrulama seremoni baslatir.
   */
  static async authenticateSitePasskey(
    options: SitePasskeyAuthOptions
  ): Promise<SitePasskeyAuthResult | null> {
    if (!isWebAuthnSupported()) {
      throw new Error('WebAuthn is not supported in this browser.');
    }

    const challenge = window.crypto.getRandomValues(new Uint8Array(32));

    const allowCredentials: PublicKeyCredentialDescriptor[] | undefined =
      options.allowCredentialIds?.map((id) => ({
        type: 'public-key' as const,
        id: base64urlToBuffer(id),
        transports: ['internal', 'hybrid', 'usb', 'ble', 'nfc'] as AuthenticatorTransport[],
      }));

    const publicKeyOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      rpId: options.rpId,
      allowCredentials,
      userVerification: options.userVerification || 'preferred',
      timeout: options.timeout || 60000,
    };

    try {
      const assertion = (await navigator.credentials.get({
        publicKey: publicKeyOptions,
      })) as PublicKeyCredential | null;

      if (!assertion) return null;

      const response = assertion.response as AuthenticatorAssertionResponse;

      return {
        credentialId: assertion.id,
        rpId: options.rpId,
        authenticatorDataBase64: bufferToBase64url(response.authenticatorData),
        clientDataJSONBase64: bufferToBase64url(response.clientDataJSON),
        signatureBase64: bufferToBase64url(response.signature),
        userHandleBase64: response.userHandle ? bufferToBase64url(response.userHandle) : null,
        authenticatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[WebAuthnService] Site passkey authentication failed:', error);
      return null;
    }
  }

  /**
   * Kayit sonucunu CanonicalPasskeyFields formatina donusturur.
   * Bu format VaultEntry.passkeyMetadata ile uyumludur.
   */
  static registrationToPasskeyMetadata(
    result: SitePasskeyRegistrationResult
  ): CanonicalPasskeyFields {
    return {
      rp_id: result.rpId,
      credential_id: result.credentialId,
      user_handle: result.userHandle,
      display_name: result.displayName,
      transport: result.transport.join(','),
      authenticator_attachment: result.authenticatorAttachment,
      algorithm: String(result.algorithm),
      mode: 'site_passkey_active',
      server_verified: false,
      created_at: result.registeredAt,
      last_registration_at: result.registeredAt,
      last_auth_at: undefined,
    };
  }

  /**
   * Basarili dogrulama sonrasi passkey metadata'yi gunceller.
   */
  static updateMetadataAfterAuth(
    existing: CanonicalPasskeyFields,
    authResult: SitePasskeyAuthResult
  ): CanonicalPasskeyFields {
    return {
      ...existing,
      credential_id: existing.credential_id || authResult.credentialId,
      server_verified: true,
      last_auth_at: authResult.authenticatedAt,
    };
  }
}

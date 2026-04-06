/**
 * SharingTransportService — Aegis 4.2 Faz 1 / Adim 1.1
 *
 * E2E Encrypted sharing transport for vault entries.
 * Uses ECDH key exchange + AES-256-GCM for secure peer-to-peer sharing.
 * Payloads can be transferred via QR code, clipboard, or file export.
 *
 * @module SharingTransportService
 */

import { toBufferSource, generateRandomBytes, bufferToHex, hexToBuffer } from './crypto-types';
import { SharingAuditService } from './SharingAuditService';
import type { VaultEntry } from '../vaultService';
import type { CanonicalSharingAssignment } from './canonical-schema';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SharingKeyPair {
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
  publicKeyFingerprint: string;
  createdAt: string;
}

export interface EncryptedSharingPayload {
  /** Protocol version */
  version: 'aegis-share-v1';
  /** ECDH ephemeral public key (JWK) */
  ephemeralPublicKey: JsonWebKey;
  /** AES-256-GCM encrypted entry data (base64url) */
  ciphertext: string;
  /** 12-byte IV (base64url) */
  iv: string;
  /** HMAC-SHA256 authentication tag (base64url) */
  hmac: string;
  /** Sender's public key fingerprint */
  senderFingerprint: string;
  /** Timestamp */
  timestamp: string;
  /** Number of entries in payload */
  entryCount: number;
  /** Optional description */
  description?: string;
  /** Expiry ISO date (optional) */
  expiresAt?: string;
}

export interface DecryptedSharingPayload {
  entries: ShareableEntry[];
  senderFingerprint: string;
  timestamp: string;
  description?: string;
}

export interface ShareableEntry {
  title: string;
  username: string;
  password: string;
  url: string;
  notes?: string;
  category?: string;
  totpSecret?: string;
  tags?: string[];
}

export interface TransportResult {
  success: boolean;
  payload?: string; // JSON stringified EncryptedSharingPayload
  error?: string;
  entryCount: number;
  sizeBytes: number;
}

export interface ReceiveResult {
  success: boolean;
  entries?: ShareableEntry[];
  error?: string;
  entryCount: number;
  senderFingerprint?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function bufferToBase64url(buffer: Uint8Array | ArrayBuffer): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBuffer(b64url: string): Uint8Array {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ─── Service ────────────────────────────────────────────────────────────────

export class SharingTransportService {
  private static readonly EC_ALGORITHM = 'ECDH';
  private static readonly EC_CURVE: EcKeyGenParams = { name: 'ECDH', namedCurve: 'P-256' };
  private static readonly AES_ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;

  /**
   * Generates a new ECDH key pair for sharing.
   * The public key is shared with the recipient; the private key is kept locally.
   */
  static async generateKeyPair(): Promise<SharingKeyPair> {
    const keyPair = await window.crypto.subtle.generateKey(this.EC_CURVE, true, [
      'deriveBits',
      'deriveKey',
    ]);

    const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);

    // Derive fingerprint from public key
    const publicKeyBytes = await window.crypto.subtle.exportKey('raw', keyPair.publicKey);
    const fingerprintBytes = await window.crypto.subtle.digest('SHA-256', publicKeyBytes);
    const fingerprint = bufferToHex(new Uint8Array(fingerprintBytes)).substring(0, 16);

    return {
      publicKeyJwk,
      privateKeyJwk,
      publicKeyFingerprint: fingerprint,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Exports a key pair to a storable JSON string.
   */
  static exportKeyPair(keyPair: SharingKeyPair): string {
    return JSON.stringify(keyPair);
  }

  /**
   * Imports a key pair from a stored JSON string.
   */
  static importKeyPair(json: string): SharingKeyPair {
    return JSON.parse(json) as SharingKeyPair;
  }

  /**
   * Encrypts vault entries for sharing with ECDH + AES-256-GCM.
   *
   * Flow:
   * 1. Generate ephemeral ECDH key pair
   * 2. Derive shared secret using recipient's public key
   * 3. Derive AES-256 key + HMAC key from shared secret (HKDF)
   * 4. Encrypt entries with AES-256-GCM
   * 5. Sign with HMAC-SHA256
   * 6. Package into transportable payload
   *
   * @param entries - Vault entries to encrypt
   * @param recipientPublicKeyJwk - Recipient's ECDH public key (JWK)
   * @param options - Optional description and expiry
   */
  static async encryptEntries(
    entries: VaultEntry[],
    recipientPublicKeyJwk: JsonWebKey,
    options?: { description?: string; expiresAt?: string; senderKeyPair?: SharingKeyPair }
  ): Promise<TransportResult> {
    try {
      if (!entries || entries.length === 0) {
        return { success: false, error: 'No entries to encrypt', entryCount: 0, sizeBytes: 0 };
      }

      // Step 1: Use provided or generate ephemeral key pair
      const ephemeralKeyPair = options?.senderKeyPair || (await this.generateKeyPair());

      // Step 2: Import recipient's public key
      const recipientPublicKey = await window.crypto.subtle.importKey(
        'jwk',
        recipientPublicKeyJwk,
        this.EC_CURVE,
        false,
        []
      );

      // Import ephemeral private key
      const ephemeralPrivateKey = await window.crypto.subtle.importKey(
        'jwk',
        ephemeralKeyPair.privateKeyJwk,
        this.EC_CURVE,
        false,
        ['deriveBits', 'deriveKey']
      );

      // Step 3: Derive shared secret → encryption + auth keys via HKDF
      const { encryptionKey, authKey } = await this.deriveSharedKeys(
        ephemeralPrivateKey,
        recipientPublicKey
      );

      // Step 4: Prepare shareable entries (strip internal fields)
      const shareableEntries: ShareableEntry[] = entries.map((entry) => ({
        title: entry.title || '',
        username: entry.username || '',
        password: entry.pass || '',
        url: entry.website || '',
        notes: entry.notes || undefined,
        category: entry.category || undefined,
        totpSecret: entry.totpSecret || undefined,
        tags: entry.tags || undefined,
      }));

      // Step 5: Encrypt with AES-256-GCM
      const iv = generateRandomBytes(this.IV_LENGTH);
      const plaintext = new TextEncoder().encode(JSON.stringify(shareableEntries));

      const ciphertext = await window.crypto.subtle.encrypt(
        { name: this.AES_ALGORITHM, iv: toBufferSource(iv) },
        encryptionKey,
        toBufferSource(plaintext)
      );

      // Step 6: HMAC signature
      const hmacData = new Uint8Array(iv.length + ciphertext.byteLength);
      hmacData.set(iv, 0);
      hmacData.set(new Uint8Array(ciphertext), iv.length);

      const hmac = await window.crypto.subtle.sign('HMAC', authKey, toBufferSource(hmacData));

      // Step 7: Build payload
      const payload: EncryptedSharingPayload = {
        version: 'aegis-share-v1',
        ephemeralPublicKey: ephemeralKeyPair.publicKeyJwk,
        ciphertext: bufferToBase64url(ciphertext),
        iv: bufferToBase64url(iv),
        hmac: bufferToBase64url(hmac),
        senderFingerprint: ephemeralKeyPair.publicKeyFingerprint,
        timestamp: new Date().toISOString(),
        entryCount: shareableEntries.length,
        description: options?.description,
        expiresAt: options?.expiresAt,
      };

      const payloadJson = JSON.stringify(payload);

      // Audit
      SharingAuditService.recordEvent({
        type: 'sharing_transport_encrypt',
        metadata: {
          entryCount: entries.length,
          senderFingerprint: ephemeralKeyPair.publicKeyFingerprint,
          sizeBytes: payloadJson.length,
        },
      });

      return {
        success: true,
        payload: payloadJson,
        entryCount: shareableEntries.length,
        sizeBytes: new TextEncoder().encode(payloadJson).length,
      };
    } catch (err) {
      console.error('[SharingTransport] Encryption failed:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Encryption failed',
        entryCount: entries.length,
        sizeBytes: 0,
      };
    }
  }

  /**
   * Decrypts a received sharing payload.
   *
   * @param payloadJson - JSON string of EncryptedSharingPayload
   * @param recipientPrivateKeyJwk - Recipient's ECDH private key (JWK)
   */
  static async decryptEntries(
    payloadJson: string,
    recipientPrivateKeyJwk: JsonWebKey
  ): Promise<ReceiveResult> {
    try {
      const payload: EncryptedSharingPayload = JSON.parse(payloadJson);

      // Version check
      if (payload.version !== 'aegis-share-v1') {
        return { success: false, error: 'Unsupported sharing protocol version', entryCount: 0 };
      }

      // Expiry check
      if (payload.expiresAt && new Date(payload.expiresAt) < new Date()) {
        return { success: false, error: 'Sharing payload has expired', entryCount: 0 };
      }

      // Import ephemeral public key from payload
      const ephemeralPublicKey = await window.crypto.subtle.importKey(
        'jwk',
        payload.ephemeralPublicKey,
        this.EC_CURVE,
        false,
        []
      );

      // Import recipient's private key
      const recipientPrivateKey = await window.crypto.subtle.importKey(
        'jwk',
        recipientPrivateKeyJwk,
        this.EC_CURVE,
        false,
        ['deriveBits', 'deriveKey']
      );

      // Derive shared secret → encryption + auth keys
      const { encryptionKey, authKey } = await this.deriveSharedKeys(
        recipientPrivateKey,
        ephemeralPublicKey
      );

      // Verify HMAC
      const iv = base64urlToBuffer(payload.iv);
      const ciphertext = base64urlToBuffer(payload.ciphertext);
      const hmac = base64urlToBuffer(payload.hmac);

      const hmacData = new Uint8Array(iv.length + ciphertext.length);
      hmacData.set(iv, 0);
      hmacData.set(ciphertext, iv.length);

      const isValid = await window.crypto.subtle.verify(
        'HMAC',
        authKey,
        toBufferSource(hmac),
        toBufferSource(hmacData)
      );

      if (!isValid) {
        return {
          success: false,
          error: 'HMAC verification failed — payload may be tampered',
          entryCount: 0,
        };
      }

      // Decrypt
      const decrypted = await window.crypto.subtle.decrypt(
        { name: this.AES_ALGORITHM, iv: toBufferSource(iv) },
        encryptionKey,
        toBufferSource(ciphertext)
      );

      const entries: ShareableEntry[] = JSON.parse(new TextDecoder().decode(decrypted));

      // Audit
      SharingAuditService.recordEvent({
        type: 'sharing_transport_decrypt',
        metadata: {
          entryCount: entries.length,
          senderFingerprint: payload.senderFingerprint,
        },
      });

      return {
        success: true,
        entries,
        entryCount: entries.length,
        senderFingerprint: payload.senderFingerprint,
      };
    } catch (err) {
      console.error('[SharingTransport] Decryption failed:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Decryption failed',
        entryCount: 0,
      };
    }
  }

  /**
   * Derives AES-256 encryption key and HMAC-SHA256 auth key from ECDH shared secret.
   */
  private static async deriveSharedKeys(
    privateKey: CryptoKey,
    publicKey: CryptoKey
  ): Promise<{ encryptionKey: CryptoKey; authKey: CryptoKey }> {
    // Derive raw shared secret via ECDH using deriveBits (spec-compliant)
    const sharedSecretBits = await window.crypto.subtle.deriveBits(
      { name: this.EC_ALGORITHM, public: publicKey },
      privateKey,
      this.KEY_LENGTH // 256 bits for P-256
    );

    // Import raw shared secret as HKDF base key for subkey derivation
    const baseKey = await window.crypto.subtle.importKey('raw', sharedSecretBits, 'HKDF', false, [
      'deriveKey',
    ]);

    const encryptionKey = await window.crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        salt: new TextEncoder().encode('aegis_share_v1_encryption'),
        info: new TextEncoder().encode('aes-256-gcm'),
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );

    const authKey = await window.crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        salt: new TextEncoder().encode('aegis_share_v1_authentication'),
        info: new TextEncoder().encode('hmac-sha256'),
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'HMAC', hash: 'SHA-256', length: 256 },
      false,
      ['sign', 'verify']
    );

    return { encryptionKey, authKey };
  }

  /**
   * Validates a payload structure without decrypting.
   */
  static validatePayload(payloadJson: string): {
    valid: boolean;
    error?: string;
    entryCount?: number;
  } {
    try {
      const payload: EncryptedSharingPayload = JSON.parse(payloadJson);

      if (payload.version !== 'aegis-share-v1') {
        return { valid: false, error: 'Unsupported version' };
      }
      if (!payload.ephemeralPublicKey) {
        return { valid: false, error: 'Missing ephemeral public key' };
      }
      if (!payload.ciphertext) {
        return { valid: false, error: 'Missing ciphertext' };
      }
      if (!payload.iv) {
        return { valid: false, error: 'Missing IV' };
      }
      if (!payload.hmac) {
        return { valid: false, error: 'Missing HMAC' };
      }
      if (payload.expiresAt && new Date(payload.expiresAt) < new Date()) {
        return { valid: false, error: 'Payload expired' };
      }

      return { valid: true, entryCount: payload.entryCount };
    } catch {
      return { valid: false, error: 'Invalid JSON payload' };
    }
  }

  /**
   * Gets the estimated size category of a payload for transport method recommendation.
   */
  static getPayloadSizeCategory(payloadJson: string): 'small' | 'medium' | 'large' {
    const bytes = new TextEncoder().encode(payloadJson).length;
    if (bytes < 2000) return 'small'; // QR code friendly
    if (bytes < 50000) return 'medium'; // Clipboard/email OK
    return 'large'; // File export recommended
  }

  /**
   * Gets the recommended transport method based on payload size.
   */
  static getRecommendedTransport(payloadJson: string): 'qr' | 'clipboard' | 'file' {
    const category = this.getPayloadSizeCategory(payloadJson);
    switch (category) {
      case 'small':
        return 'qr';
      case 'medium':
        return 'clipboard';
      case 'large':
        return 'file';
    }
  }

  /**
   * Creates a self-contained sharing package that includes the sender's public key.
   * This is used when the recipient doesn't have the sender's public key yet.
   */
  static async createSharePackage(
    entries: VaultEntry[],
    options?: { description?: string; expiresInHours?: number }
  ): Promise<{ keyPair: SharingKeyPair; result: TransportResult }> {
    const keyPair = await this.generateKeyPair();
    const expiresAt = options?.expiresInHours
      ? new Date(Date.now() + options.expiresInHours * 3600000).toISOString()
      : undefined;

    const result = await this.encryptEntries(entries, keyPair.publicKeyJwk, {
      description: options?.description,
      expiresAt,
      senderKeyPair: keyPair,
    });

    return { keyPair, result };
  }
}

// @ts-nocheck
import { toBufferSource } from './crypto-types';
import { bufferToBase64url, base64urlToBuffer } from './webAuthn';

/**
 * SyncCryptoService — Aegis 4.2 Faz 2 / Adim 2.1
 * 
 * E2E Encrypted senkronizasyon icin anahtar turetimi, 
 * sifreleme ve imzalama islemlerini yonetir.
 */

export interface SyncCryptoPackage {
  payload: string; // Base64url(AES-GCM-Encrypted)
  iv: string;      // Base64url(12-byte IV)
  hmac: string;    // Base64url(HMAC-SHA256)
  nonce: string;   // Unique session nonce
}

export class SyncCryptoService {
  /**
   * Sync Root Secret'tan Encryption ve Auth anahtarlarını türetir (HKDF).
   */
  static async deriveSubKeys(rootSecret: Uint8Array): Promise<{ encryptionKey: CryptoKey, authKey: CryptoKey }> {
    const baseKey = await window.crypto.subtle.importKey(
      'raw',
      toBufferSource(rootSecret),
      'HKDF',
      false,
      ['deriveKey']
    );

    const encryptionKey = await window.crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        salt: new TextEncoder().encode('aegis_sync_v1_hkdf'),
        info: new TextEncoder().encode('encryption'),
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    const authKey = await window.crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        salt: new TextEncoder().encode('aegis_sync_v1_hkdf'),
        info: new TextEncoder().encode('authentication'),
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
   * Veriyi E2E şifreler ve imzalar.
   */
  static async encryptAndSign(
    payload: any,
    encryptionKey: CryptoKey,
    authKey: CryptoKey
  ): Promise<SyncCryptoPackage> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const nonce = window.crypto.randomUUID();
    const encoded = new TextEncoder().encode(JSON.stringify({ payload, nonce }));

    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: toBufferSource(iv) },
      encryptionKey,
      toBufferSource(encoded)
    );

    const hmacSource = new Uint8Array(iv.length + ciphertext.byteLength);
    hmacSource.set(iv, 0);
    hmacSource.set(new Uint8Array(ciphertext), iv.length);

    const hmac = await window.crypto.subtle.sign(
      'HMAC',
      authKey,
      toBufferSource(hmacSource)
    );

    return {
      payload: bufferToBase64url(ciphertext),
      iv: bufferToBase64url(iv.buffer as ArrayBuffer),
      hmac: bufferToBase64url(hmac),
      nonce,
    };
  }

  /**
   * Şifreli paketi doğrular ve çözer.
   */
  static async verifyAndDecrypt<T = any>(
    pkg: SyncCryptoPackage,
    encryptionKey: CryptoKey,
    authKey: CryptoKey
  ): Promise<T | null> {
    try {
      const iv = new Uint8Array(base64urlToBuffer(pkg.iv));
      const ciphertext = new Uint8Array(base64urlToBuffer(pkg.payload));
      const hmac = new Uint8Array(base64urlToBuffer(pkg.hmac));

      const hmacSource = new Uint8Array(iv.length + ciphertext.byteLength);
      hmacSource.set(iv, 0);
      hmacSource.set(new Uint8Array(ciphertext), iv.length);

      const isValid = await window.crypto.subtle.verify(
        'HMAC',
        authKey,
        toBufferSource(hmac),
        toBufferSource(hmacSource)
      );

      if (!isValid) {
        console.error('[SyncCrypto] Invalid HMAC signature');
        return null;
      }

      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: toBufferSource(iv) },
        encryptionKey,
        toBufferSource(ciphertext)
      );

      const decoded = JSON.parse(new TextDecoder().decode(decrypted));
      
      // Nonce check or session validation logic here...
      if (decoded.nonce !== pkg.nonce) {
         console.warn('[SyncCrypto] Nonce mismatch');
      }

      return decoded.payload as T;
    } catch (err) {
      console.error('[SyncCrypto] Decryption failed:', err);
      return null;
    }
  }
}

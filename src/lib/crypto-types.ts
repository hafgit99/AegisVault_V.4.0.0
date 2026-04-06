/**
 * Crypto Type Safety Utilities
 *
 * Provides safe type conversion functions for WebCrypto API operations.
 * Handles TypeScript 5.x compatibility issues with Uint8Array and ArrayBuffer types.
 *
 * @module crypto-types
 */

/**
 * SafeBuffer - Type-safe wrapper for buffer operations
 * Ensures compatibility with SubtleCrypto API that requires strict ArrayBuffer types
 */

/**
 * Safely converts a Uint8Array to an ArrayBuffer
 * Handles both regular ArrayBuffer and SharedArrayBuffer sources
 *
 * @param data - The Uint8Array to convert
 * @returns A regular ArrayBuffer (not SharedArrayBuffer)
 * @throws TypeError if data is not a Uint8Array
 *
 * @example
 * ```typescript
 * const data = new Uint8Array(16);
 * const buffer = ensureArrayBuffer(data);
 * await crypto.subtle.sign('HMAC', key, buffer); // ✅ Type-safe
 * ```
 */
export function ensureArrayBuffer(data: Uint8Array): ArrayBuffer {
  if (!(data instanceof Uint8Array)) {
    throw new TypeError('Expected Uint8Array');
  }

  // Check if it's already a regular ArrayBuffer (not SharedArrayBuffer)
  const isShared =
    typeof SharedArrayBuffer !== 'undefined' && data.buffer instanceof SharedArrayBuffer;

  if (data.buffer instanceof ArrayBuffer && !isShared) {
    return data.buffer;
  }

  // Create a copy into a regular ArrayBuffer (for SharedArrayBuffer or safety)
  const safeCopy = new Uint8Array(data.length);
  safeCopy.set(data);
  return safeCopy.buffer as ArrayBuffer;
}

/**
 * Type-safe buffer conversion for WebCrypto API operations
 * Accepts both Uint8Array and ArrayBuffer, always returns BufferSource
 *
 * @param data - The data to convert (Uint8Array or ArrayBuffer)
 * @returns A BufferSource compatible with WebCrypto subtleCrypto methods
 *
 * @example
 * ```typescript
 * const key = new Uint8Array(32);
 * const salt = new Uint8Array(16);
 *
 * // Before (type error):
 * await crypto.subtle.sign('HMAC', key, salt); // ❌ Error
 *
 * // After (type safe):
 * await crypto.subtle.sign('HMAC', key, toBufferSource(salt)); // ✅ OK
 * ```
 */
export function toBufferSource(data: Uint8Array | ArrayBuffer | BufferSource): BufferSource {
  if (data instanceof ArrayBuffer) {
    return data;
  }

  if (data instanceof Uint8Array) {
    return ensureArrayBuffer(data);
  }

  // Already BufferSource-compatible (DataView, etc.)
  return data as BufferSource;
}

/**
 * Creates a random Uint8Array of specified length
 * Useful for generating salts, IVs, and nonces
 *
 * @param length - Number of bytes to generate
 * @returns A cryptographically random Uint8Array
 *
 * @example
 * ```typescript
 * const salt = generateRandomBytes(16); // 128-bit salt
 * const iv = generateRandomBytes(12);   // 96-bit IV for GCM
 * ```
 */
export function generateRandomBytes(length: number): Uint8Array {
  if (length <= 0 || !Number.isInteger(length)) {
    throw new RangeError(`Length must be positive integer, got ${length}`);
  }

  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Safely overwrites a Uint8Array with random data
 * Useful for clearing sensitive material from memory
 *
 * @param buffer - The buffer to overwrite
 * @returns void
 *
 * @example
 * ```typescript
 * const key = new Uint8Array(32);
 * // ... use key for encryption
 * overwriteBuffer(key); // Clear from memory
 * ```
 */
export function overwriteBuffer(buffer: Uint8Array): void {
  if (!(buffer instanceof Uint8Array)) {
    throw new TypeError('Expected Uint8Array');
  }

  const randomData = crypto.getRandomValues(new Uint8Array(buffer.length));
  buffer.set(randomData);
}

/**
 * Converts Uint8Array to hexadecimal string
 * Useful for logging, comparison, and storage
 *
 * @param buffer - The buffer to convert
 * @returns Hexadecimal string representation
 *
 * @example
 * ```typescript
 * const data = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
 * console.log(bufferToHex(data)); // "48656c6c6f"
 * ```
 */
export function bufferToHex(buffer: Uint8Array | ArrayBuffer): string {
  const bytes = ArrayBuffer.isView(buffer)
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : new Uint8Array(buffer);

  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converts hexadecimal string to Uint8Array
 * Useful for deserializing stored hex values
 *
 * @param hex - Hexadecimal string to convert
 * @returns Uint8Array representation
 * @throws SyntaxError if hex string is invalid
 *
 * @example
 * ```typescript
 * const data = hexToBuffer('48656c6c6f');
 * console.log(new TextDecoder().decode(data)); // "Hello"
 * ```
 */
export function hexToBuffer(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new SyntaxError('Hex string must have even length');
  }

  if (!/^[0-9a-fA-F]*$/.test(hex)) {
    throw new SyntaxError('Invalid hex string');
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }

  return bytes;
}

/**
 * Determines if a string is likely hexadecimal encoded
 * Useful for detecting format of stored data
 *
 * @param str - String to test
 * @returns true if string appears to be valid hex
 *
 * @example
 * ```typescript
 * isLikelyHex('48656c6c6f'); // true
 * isLikelyHex('Hello');      // false
 * isLikelyHex('ABC');        // false (odd length)
 * ```
 */
export function isLikelyHex(str: string): boolean {
  if (typeof str !== 'string') {
    return false;
  }

  if (str.length % 2 !== 0) {
    return false;
  }

  return /^[0-9a-fA-F]+$/.test(str);
}

/**
 * Type guard to check if a value is a valid BufferSource
 *
 * @param value - Value to check
 * @returns true if value is a valid BufferSource
 */
export function isBufferSource(value: unknown): value is BufferSource {
  return value instanceof ArrayBuffer || value instanceof Uint8Array || value instanceof DataView;
}

export interface StoredCredential {
  verificationHash: string;
  salt: string;
  scheme?: 'pbkdf2-sha256' | 'argon2id-v1';
  iterations?: number; // legacy PBKDF2 only
  argon2?: {
    iterations: number;
    memorySize: number;
    parallelism: number;
    hashLength: number;
  };
}

export interface VaultAttachmentMeta {
  id: string;
  name: string;
  type: string;
  size: number;
  encrypted_name?: string;
  name_iv?: string;
  encrypted_type?: string;
  type_iv?: string;
}

export interface VaultCardDetails {
  cardholder_name?: string;
  card_number?: string;
  brand?: string;
  expiry_month?: string;
  expiry_year?: string;
  cvv?: string;
  pin?: string;
  billing_zip?: string;
  billing_address?: string;
}

export interface VaultIdentityDetails {
  document_type?: string;
  identity_number?: string;
  issuing_country?: string;
  nationality?: string;
  date_of_birth?: string;
  issued_at?: string;
  expires_at?: string;
}

import type { CanonicalPasskeyFields } from './canonical-schema';

export interface VaultEntry {
  id: number;
  title: string;
  username: string;
  encrypted_title?: string;
  title_iv?: string;
  encrypted_username?: string;
  username_iv?: string;
  encrypted_password?: string; // Stored as Hex (legacy Base64 supported)
  iv?: string; // Stored as Hex (legacy Base64 supported)
  category: string;
  encrypted_category?: string;
  category_iv?: string;
  website: string;
  encrypted_website?: string;
  website_iv?: string;
  encrypted_tags?: string;
  tags_iv?: string;
  search_index?: string[];
  updated_at: string;
  strength?: number;
  tags?: string[];
  pwned_count?: number; // Tracks HIBP breaches
  attachments?: VaultAttachmentMeta[];
  deletedAt?: string; // ISO String indicating when it was moved to trash

  // TOTP (2FA) — encrypted at rest
  totp_secret?: string; // AES-GCM encrypted Base32 secret
  totp_iv?: string; // IV for TOTP encryption
  totp_issuer?: string; // Issuer label (stored plain — not sensitive)
  totp_algorithm?: 'SHA-1' | 'SHA-256' | 'SHA-512';
  totp_digits?: number; // 6 or 8
  totp_period?: number; // Usually 30

  // Secure Notes — encrypted at rest
  encrypted_notes?: string; // AES-GCM encrypted notes content
  notes_iv?: string; // IV for notes encryption
  encrypted_passkey_meta?: string; // AES-GCM encrypted site passkey metadata JSON
  passkey_meta_iv?: string; // IV for passkey metadata encryption
  encrypted_card_details?: string; // AES-GCM encrypted credit/debit card details JSON
  card_details_iv?: string; // IV for card details encryption
  encrypted_identity_details?: string; // AES-GCM encrypted identity card details JSON
  identity_details_iv?: string; // IV for identity details encryption

  // Decrypted fields for UI (never persisted)
  pass?: string;
  totpSecret?: string; // Decrypted TOTP secret (only in memory)
  notes?: string; // Decrypted notes content (only in memory)
  passkeyMetadata?: CanonicalPasskeyFields | null; // Decrypted passkey metadata for site-passkey MVP
  cardDetails?: VaultCardDetails | null; // Decrypted card details (only in memory)
  identityDetails?: VaultIdentityDetails | null; // Decrypted identity details (only in memory)
  sharing?: any[]; // Canonical sharing metadata for UI/export helpers
  ui_focus_context?: 'sharing_issue' | 'sharing_audit'; // Transient UI hint for edit flows
  ui_focus_label?: string; // Transient UI label shown in edit flows
}

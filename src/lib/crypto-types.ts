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
  const isShared = typeof SharedArrayBuffer !== 'undefined' && data.buffer instanceof SharedArrayBuffer;
  
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
export function toBufferSource(
  data: Uint8Array | ArrayBuffer | BufferSource
): BufferSource {
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
  return (
    value instanceof ArrayBuffer ||
    value instanceof Uint8Array ||
    value instanceof DataView
  );
}

// @ts-nocheck
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  bufferToBase64url,
  base64urlToBuffer,
  encryptWithPRF,
  decryptWithPRF,
  registerPasskeyWithPRF,
  authenticatePasskeyWithPRF,
} from '../webAuthn';

describe('WebAuthn Utils & PRF Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock PublicKeyCredential globally
    (window as any).PublicKeyCredential = vi.fn();

    // Mock navigator.credentials
    if (!(navigator as any).credentials) {
      (navigator as any).credentials = {
        create: vi.fn(),
        get: vi.fn(),
      };
    }
  });

  it('1. Roundtrip: buffer -> base64url -> buffer', () => {
    const original = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const b64 = bufferToBase64url(original.buffer as ArrayBuffer);
    expect(b64).toBe('SGVsbG8');

    const restored = base64urlToBuffer(b64);
    expect(new Uint8Array(restored)).toEqual(original);
  });

  it('2. encryptWithPRF / decryptWithPRF roundtrip', async () => {
    const prfKey = new Uint8Array(32).fill(0x01).buffer;
    const plaintext = 'Secret Message';

    const encrypted = await encryptWithPRF(prfKey, plaintext);
    expect(typeof encrypted).toBe('string');

    const decrypted = await decryptWithPRF(prfKey, encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('3. registerPasskeyWithPRF: Success path', async () => {
    const mockCred = {
      id: 'cred_123',
      getClientExtensionResults: () => ({
        prf: {
          enabled: true,
          results: { first: new Uint8Array(32).buffer },
        },
      }),
    };
    (navigator.credentials as any).create.mockResolvedValue(mockCred);

    const res = await registerPasskeyWithPRF();
    expect(res?.id).toBe('cred_123');
    expect(res?.salt).toBeDefined();
  });

  it('4. authenticatePasskeyWithPRF: Success path', async () => {
    const mockAssertion = {
      getClientExtensionResults: () => ({
        prf: {
          results: { first: new Uint8Array(32).buffer },
        },
      }),
    };
    (navigator.credentials as any).get.mockResolvedValue(mockAssertion);

    const res = await authenticatePasskeyWithPRF('cred_id', 'salt_b64');
    expect(res).toBeDefined();
    expect(res?.byteLength).toBe(32);
  });

  it('6. Base64url edge cases: padding and special chars', () => {
    // 1 char -> 4 base64 chars (2 payload + 2 padding) -> "YQ"
    const oneChar = new Uint8Array([97]); // 'a'
    expect(bufferToBase64url(oneChar.buffer as ArrayBuffer)).toBe('YQ');
    expect(new Uint8Array(base64urlToBuffer('YQ'))).toEqual(oneChar);

    // 2 chars -> "YWI"
    const twoChars = new Uint8Array([97, 98]); // 'ab'
    expect(bufferToBase64url(twoChars.buffer as ArrayBuffer)).toBe('YWI');
    expect(new Uint8Array(base64urlToBuffer('YWI'))).toEqual(twoChars);

    // Special chars: + and / (0xFB 0xFF)
    const special = new Uint8Array([0xfb, 0xff]);
    // Std b64: "+/8=" -> B64URL: "-_8"
    const b64 = bufferToBase64url(special.buffer as ArrayBuffer);
    expect(b64).toBe('-_8');
    expect(new Uint8Array(base64urlToBuffer('-_8'))).toEqual(special);

    // Empty
    expect(bufferToBase64url(new Uint8Array([]).buffer as ArrayBuffer)).toBe('');
    expect(base64urlToBuffer('').byteLength).toBe(0);
  });

  it('7. registerPasskeyWithPRF handles missing PRF extension in response', async () => {
    const mockCred = {
      id: 'cred_no_prf',
      getClientExtensionResults: () => ({ prf: { enabled: false } }),
    };
    (navigator.credentials as any).create.mockResolvedValue(mockCred);
    const res = await registerPasskeyWithPRF();
    expect(res).toBeNull();
  });

  it('8. registerPasskeyWithPRF handles missing results.first', async () => {
    const mockCred = {
      id: 'cred_partial_prf',
      getClientExtensionResults: () => ({ prf: { enabled: true } }), // enabled but no results
    };
    (navigator.credentials as any).create.mockResolvedValue(mockCred);
    const res = await registerPasskeyWithPRF();
    expect(res).toBeNull();
  });

  it('9. registerPasskeyWithPRF handles rejection', async () => {
    (navigator.credentials as any).create.mockRejectedValue(new Error('fail'));
    const res = await registerPasskeyWithPRF();
    expect(res).toBeNull();
  });
});

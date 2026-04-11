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

    // Test slice parameters mutants
    const combinedData = new Uint8Array(base64urlToBuffer(encrypted));
    expect(combinedData.length).toBeGreaterThan(12); // IV is 12 bytes
  });

  it('3. registerPasskeyWithPRF: Success path and argument verification', async () => {
    const mockCred = {
      id: 'cred_123',
      getClientExtensionResults: () => ({
        prf: {
          enabled: true,
          results: { first: new Uint8Array(32).fill(0xaa).buffer },
        },
      }),
    };
    (navigator.credentials as any).create.mockResolvedValue(mockCred);

    const res = await registerPasskeyWithPRF();
    expect(res?.id).toBe('cred_123');
    expect(res?.salt).toBeDefined();
    expect(new Uint8Array(res!.prfKey)[0]).toBe(0xaa);

    // Verify exact arguments to kill literal mutants
    expect(navigator.credentials.create).toHaveBeenCalled();
    const createArgs = (navigator.credentials as any).create.mock.calls[0][0];
    expect(createArgs.publicKey.rp.name).toBe('Aegis Vault Local');
    expect(createArgs.publicKey.user.name).toBe('vault_user');
    expect(createArgs.publicKey.user.displayName).toBe('Aegis Vault Owner');
    expect(createArgs.publicKey.pubKeyCredParams).toEqual([
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 },
    ]);
    expect(createArgs.publicKey.timeout).toBe(60000);
    expect(createArgs.publicKey.attestation).toBe('none');
    expect(createArgs.publicKey.authenticatorSelection.userVerification).toBe('preferred');
    expect(createArgs.publicKey.challenge.byteLength).toBe(32);
    expect(createArgs.publicKey.user.id.byteLength).toBe(16);
    expect(createArgs.publicKey.extensions.prf.eval.first.byteLength).toBe(32);
  });

  it('4. authenticatePasskeyWithPRF: Success path and argument verification', async () => {
    const mockAssertion = {
      getClientExtensionResults: () => ({
        prf: {
          results: { first: new Uint8Array(32).fill(0xbb).buffer },
        },
      }),
    };
    (navigator.credentials as any).get.mockResolvedValue(mockAssertion);

    // Provide base64 variants so we can test base64urlToBuffer execution inside
    const res = await authenticatePasskeyWithPRF('Y3JlZF9pZA', 'c2FsdF9iNjQ');
    expect(res).toBeDefined();
    expect(res?.byteLength).toBe(32);
    expect(new Uint8Array(res!)[0]).toBe(0xbb);

    expect(navigator.credentials.get).toHaveBeenCalled();
    const getArgs = (navigator.credentials as any).get.mock.calls[0][0];

    expect(getArgs.publicKey.timeout).toBe(60000);
    expect(getArgs.publicKey.userVerification).toBe('required');
    expect(getArgs.publicKey.challenge.byteLength).toBe(32);
    expect(getArgs.publicKey.allowCredentials).toHaveLength(1);
    expect(getArgs.publicKey.allowCredentials[0].type).toBe('public-key');
    // 'Y3JlZF9pZA' decoded is 'cred_id'
    expect(new TextDecoder().decode(getArgs.publicKey.allowCredentials[0].id)).toBe('cred_id');
    // 'c2FsdF9iNjQ' decoded is 'salt_b64'
    expect(new TextDecoder().decode(getArgs.publicKey.extensions.prf.eval.first)).toBe('salt_b64');
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

    // Explicit pad lengths to kill math mutants
    // Length 1 -> padding 3 -> 'a' -> 'YQ==' -> 'YQ'
    expect(bufferToBase64url(new Uint8Array([97]).buffer as ArrayBuffer)).toBe('YQ');
    expect(base64urlToBuffer('YQ').byteLength).toBe(1);

    // Length 2 -> padding 2 -> 'ab' -> 'YWI=' -> 'YWI'
    expect(bufferToBase64url(new Uint8Array([97, 98]).buffer as ArrayBuffer)).toBe('YWI');
    expect(base64urlToBuffer('YWI').byteLength).toBe(2);

    // Length 3 -> padding 0 -> 'abc' -> 'YWJj' -> 'YWJj'
    expect(bufferToBase64url(new Uint8Array([97, 98, 99]).buffer as ArrayBuffer)).toBe('YWJj');
    expect(base64urlToBuffer('YWJj').byteLength).toBe(3);

    // Verify padding is removed in bufferToBase64url
    const withPad = new Uint8Array([1, 2]);
    const res = bufferToBase64url(withPad.buffer as ArrayBuffer);
    expect(res).not.toContain('=');
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

  it('10. throws if WebAuthn is unsupported during registration', async () => {
    (window as any).PublicKeyCredential = undefined;
    await expect(registerPasskeyWithPRF()).rejects.toThrow(
      'WebAuthn is not supported in this browser.'
    );
  });

  it('11. throws if WebAuthn is unsupported during authentication', async () => {
    (window as any).PublicKeyCredential = undefined;
    await expect(authenticatePasskeyWithPRF('id', 'salt')).rejects.toThrow(
      'WebAuthn is not supported.'
    );
  });

  it('12. registerPasskeyWithPRF handles Uint8Array slices', async () => {
    // Return a Uint8Array view instead of ArrayBuffer to test toArrayBuffer
    const view = new Uint8Array([1, 2, 3, 4]).subarray(1, 4); // length 3
    const mockCred = {
      id: 'cred_slice',
      getClientExtensionResults: () => ({
        prf: {
          enabled: true,
          results: { first: view },
        },
      }),
    };
    (navigator.credentials as any).create.mockResolvedValue(mockCred);
    const res = await registerPasskeyWithPRF();
    expect(res?.prfKey.byteLength).toBe(3);
  });

  it('13. authenticatePasskeyWithPRF handles Uint8Array slices', async () => {
    const view = new Uint8Array([1, 2, 3, 4]).subarray(1, 4); // len 3, offset 1
    const mockAssertion = {
      getClientExtensionResults: () => ({
        prf: {
          results: { first: view },
        },
      }),
    };
    (navigator.credentials as any).get.mockResolvedValue(mockAssertion);

    const res = await authenticatePasskeyWithPRF('cred_id', 'salt');
    expect(res?.byteLength).toBe(3);
  });

  it('14. authenticatePasskeyWithPRF handles failure cases', async () => {
    // Network or user aborted
    (navigator.credentials as any).get.mockRejectedValue(new Error('fail'));
    const res = await authenticatePasskeyWithPRF('cred', 'salt');
    expect(res).toBeNull();

    // No assertion
    (navigator.credentials as any).get.mockResolvedValue(null);
    const res2 = await authenticatePasskeyWithPRF('cred', 'salt');
    expect(res2).toBeNull();

    // No PRF data
    const mockNoPrf = { getClientExtensionResults: () => ({ prf: {} }) };
    (navigator.credentials as any).get.mockResolvedValue(mockNoPrf);
    const res3 = await authenticatePasskeyWithPRF('cred', 'salt');
    expect(res3).toBeNull();
  });
});

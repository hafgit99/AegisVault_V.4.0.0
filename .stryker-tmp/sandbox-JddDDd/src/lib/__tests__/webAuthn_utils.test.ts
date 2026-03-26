// @ts-nocheck
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
    bufferToBase64url, 
    base64urlToBuffer,
    encryptWithPRF,
    decryptWithPRF,
    registerPasskeyWithPRF,
    authenticatePasskeyWithPRF
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
                get: vi.fn()
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
                    results: { first: new Uint8Array(32).buffer } 
                }
            })
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
                    results: { first: new Uint8Array(32).buffer } 
                }
            })
        };
        (navigator.credentials as any).get.mockResolvedValue(mockAssertion);

        const res = await authenticatePasskeyWithPRF('cred_id', 'salt_b64');
        expect(res).toBeDefined();
        expect(res?.byteLength).toBe(32);
    });

    it('5. error handling: PRF login fails', async () => {
        (navigator.credentials as any).get.mockRejectedValue(new Error('User cancelled'));
        const res = await authenticatePasskeyWithPRF('id', 'salt');
        expect(res).toBeNull();
    });
});

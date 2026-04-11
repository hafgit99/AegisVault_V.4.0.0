// @ts-nocheck
// Helper to convert base64 to Uint8Array and vice-versa
import { toBufferSource } from './crypto-types';

type PrfExtensionResult = {
  enabled?: boolean;
  results?: {
    first?: BufferSource;
  };
};

type PublicKeyCredentialWithExtensions = PublicKeyCredential & {
  getClientExtensionResults: () => AuthenticationExtensionsClientOutputs & {
    prf?: PrfExtensionResult;
  };
};

type CreationOptionsWithPrf = PublicKeyCredentialCreationOptions & {
  extensions: AuthenticationExtensionsClientInputs & {
    prf: {
      eval: {
        first: Uint8Array;
      };
    };
  };
};

type RequestOptionsWithPrf = PublicKeyCredentialRequestOptions & {
  extensions: AuthenticationExtensionsClientInputs & {
    prf: {
      eval: {
        first: BufferSource;
      };
    };
  };
};

const toArrayBuffer = (value: BufferSource): ArrayBuffer =>
  value instanceof ArrayBuffer
    ? value
    : value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);

export const bufferToBase64url = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const charCode of bytes) {
    str += String.fromCharCode(charCode);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

export const base64urlToBuffer = (base64url: string): ArrayBuffer => {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLen);
  const str = atob(padded);
  const buffer = new ArrayBuffer(str.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return buffer;
};

// WebAuthn PRF Encrypt Payload (True Zero-Knowledge Passkey Vault)
export const encryptWithPRF = async (
  prfKeyBuffer: ArrayBuffer,
  plaintext: string
): Promise<string> => {
  const key = await window.crypto.subtle.importKey(
    'raw',
    toBufferSource(new Uint8Array(prfKeyBuffer)),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedPlaintext = new TextEncoder().encode(plaintext);

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toBufferSource(iv) },
    key,
    toBufferSource(encodedPlaintext)
  );

  // Concat IV + Ciphertext and save as Base64url
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return bufferToBase64url(toBufferSource(combined) as ArrayBuffer);
};

export const decryptWithPRF = async (
  prfKeyBuffer: ArrayBuffer,
  encryptedDataB64: string
): Promise<string> => {
  const key = await window.crypto.subtle.importKey(
    'raw',
    toBufferSource(new Uint8Array(prfKeyBuffer)),
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const combined = new Uint8Array(base64urlToBuffer(encryptedDataB64));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toBufferSource(iv) },
    key,
    toBufferSource(ciphertext)
  );

  return new TextDecoder().decode(decrypted);
};

export const registerPasskeyWithPRF = async (): Promise<{
  id: string;
  salt: string;
  prfKey: ArrayBuffer;
} | null> => {
  if (!window.PublicKeyCredential) {
    throw new Error('WebAuthn is not supported in this browser.');
  }

  const challenge = window.crypto.getRandomValues(new Uint8Array(32));
  const userId = window.crypto.getRandomValues(new Uint8Array(16));
  const prfSalt = window.crypto.getRandomValues(new Uint8Array(32));

  const publicKey: CreationOptionsWithPrf = {
    challenge,
    rp: { name: 'Aegis Vault Local' },
    user: { id: userId, name: 'vault_user', displayName: 'Aegis Vault Owner' },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 }, // ES256
      { type: 'public-key', alg: -257 }, // RS256
    ],
    authenticatorSelection: { userVerification: 'preferred' },
    timeout: 60000,
    attestation: 'none',
    extensions: {
      prf: {
        eval: {
          first: prfSalt,
        },
      },
    },
  };

  try {
    const credential = (await navigator.credentials.create({
      publicKey,
    })) as PublicKeyCredentialWithExtensions | null;
    if (credential) {
      const extensionResults = credential.getClientExtensionResults();
      if (extensionResults.prf && extensionResults.prf.enabled) {
        // Some authenticators return results on creation, some don't.
        // If we don't have .results.first here, we need to assert immediately to get the PRF key.
        if (extensionResults.prf.results && extensionResults.prf.results.first) {
          return {
            id: credential.id,
            salt: bufferToBase64url(prfSalt.buffer),
            prfKey: toArrayBuffer(extensionResults.prf.results.first),
          };
        } else {
          // Re-authenticate immediately to fetch the PRF key
          return null; // For simplicity in this demo, we expect it during creation (Chromium 116+) or we will fall back on the caller side.
        }
      }
    }
  } catch (error) {
    console.error('Passkey PRF registration failed:', error);
  }
  return null;
};

export const authenticatePasskeyWithPRF = async (
  credentialId: string,
  saltB64: string
): Promise<ArrayBuffer | null> => {
  if (!window.PublicKeyCredential) {
    throw new Error('WebAuthn is not supported.');
  }

  const challenge = window.crypto.getRandomValues(new Uint8Array(32));
  const prfSalt = base64urlToBuffer(saltB64);

  const allowCredentials: PublicKeyCredentialDescriptor[] = [
    {
      type: 'public-key',
      id: base64urlToBuffer(credentialId),
    },
  ];

  const publicKey: RequestOptionsWithPrf = {
    challenge,
    allowCredentials,
    userVerification: 'required',
    timeout: 60000,
    extensions: {
      prf: {
        eval: {
          first: prfSalt,
        },
      },
    },
  };

  try {
    const assertion = (await navigator.credentials.get({
      publicKey,
    })) as PublicKeyCredentialWithExtensions | null;
    if (assertion) {
      const extensionResults = assertion.getClientExtensionResults();
      if (
        extensionResults.prf &&
        extensionResults.prf.results &&
        extensionResults.prf.results.first
      ) {
        return toArrayBuffer(extensionResults.prf.results.first);
      }
    }
  } catch (error) {
    console.error('Passkey PRF authentication failed:', error);
  }
  return null;
};

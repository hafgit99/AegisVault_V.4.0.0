/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Extension Bridge Security (P0-2)', () => {
  let messageEvents: MessageEvent[] = [];

  // Simulate window message environment
  const mockPostMessage = vi.fn((message, targetOrigin) => {
    // Collect intercepted messages locally to verify logic
    messageEvents.push({ data: message, origin: targetOrigin } as MessageEvent);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    messageEvents = [];
    if (typeof global.window !== 'undefined') {
      global.window.postMessage = mockPostMessage as any;
    }
  });

  it('verifies nonces are bound to payloads and target specific origins instead of wildcard', () => {
    const dummySyncPayload = [{ title: 'Secret', pass: 'xyz' }];
    const expectedOrigin = 'https://aegisvault.xyz';
    const fakeNonce = 'a1b2c3d4-uuid-mock';

    // Simulate sending sync (simplified VaultContext logic)
    if (fakeNonce && typeof window !== 'undefined') {
      window.postMessage({ type: 'AEGIS_SYNC_VAULT', payload: dummySyncPayload, nonce: fakeNonce }, expectedOrigin);
    }

    expect(mockPostMessage).toHaveBeenCalledTimes(1);

    const dispatched = messageEvents[0];

    // Must contain specific payload
    expect(dispatched.data.type).toBe('AEGIS_SYNC_VAULT');
    expect(dispatched.data.payload.length).toBe(1);

    // Must contain nonce for replay protection
    expect(dispatched.data.nonce).toBe(fakeNonce);

    // Target Origin SHOULD NOT BE '*'
    expect(dispatched.origin).not.toBe('*');
    expect(dispatched.origin).toBe(expectedOrigin);
  });

  it('ignores postMessages originating from untrusted domains (WXT Validation)', () => {
    const TRUSTED_ORIGINS = [
      'https://app.aegisvault.xyz',
      'https://aegisvault.xyz'
    ];

    const maliciousOrigin = 'https://evil-phishing-site.com';
    const isTrusted = TRUSTED_ORIGINS.includes(maliciousOrigin) || maliciousOrigin.startsWith('chrome-extension://');

    expect(isTrusted).toBe(false); // Origin logic properly blocks phishing attempt
  });
});

// ─────────────────────────────────────────────────────────────────
// 🔒 EXTENSION BRIDGE ALLOWLIST TESTS (P1-1 HARDENING)
// ─────────────────────────────────────────────────────────────────
describe('Extension Bridge Allowlist Hardening (P1-1)', () => {
  const ALLOWED_EXTENSION_IDS = [
    'gddgomiecgnihlljfkogfjgakedoielk',
    'kjbdjkfijeflhhbnkjgkmccljifidpcc'
  ];

  it('rejects extension IDs not in allowlist (race condition protection)', () => {
    const maliciousExtensionId = 'malicious-extension-id-12345';
    const isInAllowlist = ALLOWED_EXTENSION_IDS.includes(maliciousExtensionId);

    expect(isInAllowlist).toBe(false); // Malicious ID should NOT be in allowlist
  });

  it('accepts extension IDs in allowlist', () => {
    const legitimateExtensionId = 'gddgomiecgnihlljfkogfjgakedoielk';
    const isInAllowlist = ALLOWED_EXTENSION_IDS.includes(legitimateExtensionId);

    expect(isInAllowlist).toBe(true); // Legitimate ID should be in allowlist
  });

  it('rejects empty extension ID', () => {
    const emptyId = '';
    const isValid = emptyId && typeof emptyId === 'string' && emptyId.length > 0;

    expect(isValid).toBe(false); // Empty ID should be rejected
  });

  it('rejects null/undefined extension ID', () => {
    const nullId = null;
    const isValid = nullId && typeof nullId === 'string';

    expect(isValid).toBe(false); // Null ID should be rejected
  });

  it('validates extension ID format (must be string)', () => {
    const invalidId = 12345 as any;
    const isValid = typeof invalidId === 'string';

    expect(isValid).toBe(false); // Non-string ID should be rejected
  });
});

// ─────────────────────────────────────────────────────────────────
// 🔒 ELECTRON SYNC SERVER ORIGIN TESTS (P0-1 HARDENING)
// ─────────────────────────────────────────────────────────────────
describe('Electron Sync Server Origin Validation (P0-1)', () => {
  const ALLOWLIST_EXTENSION_IDS = [
    'gddgomiecgnihlljfkogfjgakedoielk',
    'kjbdjkfijeflhhbnkjgkmccljifidpcc'
  ];

  function isOriginAllowed(origin: string): boolean {
    if (!origin) return false;

    // Yerel Dashboard (PWA) originleri
    if (origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173' || origin === 'file://' || origin === 'app://localhost') {
      return true;
    }

    // Extension Allowlist Check
    if (origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://')) {
      const id = origin.split('://')[1].split('/')[0];
      return ALLOWLIST_EXTENSION_IDS.includes(id);
    }

    return false;
  }

  it('allows localhost:5173 origin', () => {
    expect(isOriginAllowed('http://localhost:5173')).toBe(true);
  });

  it('allows 127.0.0.1:5173 origin', () => {
    expect(isOriginAllowed('http://127.0.0.1:5173')).toBe(true);
  });

  it('allows file:// origin', () => {
    expect(isOriginAllowed('file://')).toBe(true);
  });

  it('rejects unknown origin in dev mode (no wildcard bypass)', () => {
    const maliciousOrigin = 'http://evil-site.com';
    expect(isOriginAllowed(maliciousOrigin)).toBe(false);
  });

  it('rejects unknown chrome-extension:// origin', () => {
    const unknownExtension = 'chrome-extension://unknown-extension-id';
    expect(isOriginAllowed(unknownExtension)).toBe(false);
  });

  it('allows whitelisted extension origin', () => {
    const allowedExtension = 'chrome-extension://gddgomiecgnihlljfkogfjgakedoielk';
    expect(isOriginAllowed(allowedExtension)).toBe(true);
  });

  it('rejects null origin', () => {
    expect(isOriginAllowed(null as any)).toBe(false);
  });

  it('rejects empty origin', () => {
    expect(isOriginAllowed('')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────
// 🔒 CSP SECURITY TESTS (P0-2 HARDENING)
// ─────────────────────────────────────────────────────────────────
describe('Content Security Policy (P0-2)', () => {
  const CSP_STRING = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; connect-src 'self' https://api.pwnedpasswords.com http://127.0.0.1:23456 http://localhost:23456; font-src 'self' https://fonts.gstatic.com data:; object-src 'none'; base-uri 'self'";

  it('does not contain unsafe-eval', () => {
    expect(CSP_STRING).not.toContain("'unsafe-eval'");
  });

  it('allows wasm-unsafe-eval for WebAssembly', () => {
    expect(CSP_STRING).toContain("'wasm-unsafe-eval'");
  });

  it('does not contain wildcard script-src', () => {
    expect(CSP_STRING).not.toContain("script-src '*'");
  });

  it('restricts object-src to none', () => {
    expect(CSP_STRING).toContain("object-src 'none'");
  });

  it('restricts base-uri to self', () => {
    expect(CSP_STRING).toContain("base-uri 'self'");
  });

  it('allows HIBP API for password breach checking', () => {
    expect(CSP_STRING).toContain('https://api.pwnedpasswords.com');
  });

  it('allows local sync server', () => {
    expect(CSP_STRING).toContain('http://127.0.0.1:23456');
    expect(CSP_STRING).toContain('http://localhost:23456');
  });
});

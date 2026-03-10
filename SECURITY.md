# Aegis Vault - Security Policy

## Security Model and Threat Mitigation
Aegis Vault is designed as a Zero-Knowledge architecture. All sensitive data is encrypted client-side using `AES-GCM` with a 256-bit key derived via `Argon2id`.
Your Master Password NEVER leaves your local device.

### Security Hardening (v4.0.0+)

#### P0 Critical Fixes Applied
- ✅ **Dev Mode Origin Bypass Closed**: Development mode no longer allows wildcard (`*`) CORS origins. All origins must be explicitly allowlisted.
- ✅ **CSP Hardened**: Removed `'unsafe-eval'` and `'unsafe-inline'` from script-src. Only `'wasm-unsafe-eval'` is permitted for WebAssembly.
- ✅ **Extension Allowlist Hardening**: Extension bridge now uses static allowlist for ID validation, preventing race condition attacks during initial connection.

#### P1 High Priority Fixes Applied
- ✅ **Origin Validation Tests**: Added comprehensive test coverage for origin validation in `ExtensionSecurity.test.ts`.
- ✅ **CSP Tests**: Automated tests verify CSP string does not contain dangerous directives.
- ✅ **Extension ID Format Validation**: Null, empty, and non-string extension IDs are now rejected.

### In Scope
- Vulnerabilities allowing extraction or bypassing of the Master Password.
- Replay attacks on the WXT Extension Bridge.
- Electron IPC isolation bypasses.
- Unauthorized token extraction or usage.
- Data leakage to non-whitelisted origins.
- CORS bypass vulnerabilities.
- Content Security Policy violations.

### Out of Scope
- Denial of Service (DoS) attacks on the user's personal device.
- Malware on the victim's device that acts as a keylogger or memory dumper.
- Social engineering (phishing a user's master password).

## Reporting a Vulnerability

Please do not open a public issue if the flaw concerns a sensitive data breach vector.
Instead, email the maintainers directly at security@aegisvault.xyz with:
1. Steps to reproduce the vulnerability.
2. The version of Aegis Vault affected.
3. Proof-of-Concept code (if any).

We will try to respond within 48 hours and work on a patch immediately. Your report will be kept strictly confidential until the fix is deployed.

## Disclosure Policy

- We will acknowledge receipt of your vulnerability report within 48 hours.
- We aim to deploy an update within 10 days for critical issues (P0).
- Public disclosure will only occur after the fix has been verified and distributed.

## Security Practices
- Dependencies are scanned automatically using GitHub actions.
- Any change affecting encryption or communication requires manual security review.
- Encrypted export (`.aes`) is the default mechanism. Plaintext is heavily discouraged.

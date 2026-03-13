# 🔐 Aegis Vault — Security Policy

## Security Model

Aegis Vault is a **Zero-Knowledge** password manager. All sensitive data is encrypted client-side:

- **Key Derivation:** `Argon2id` (64 MB memory, 3 iterations)
- **Encryption:** `AES-256-GCM`
- **Extension Bridge:** `HMAC-SHA256` challenge-response
- **Biometrics:** `WebAuthn PRF` (device-bound, no server contact)

Your **Master Password NEVER leaves your device.**

---

## Security Hardening (v4.0.0)

### ✅ P0 Critical Fixes Applied
- **Dev Mode Origin Bypass Closed** — No wildcard (`*`) CORS origins in any mode.
- **CSP Hardened** — Removed `'unsafe-eval'` and `'unsafe-inline'`. Only `'wasm-unsafe-eval'` for WebAssembly.
- **Extension Allowlist Hardening** — Static allowlist for extension ID validation; race condition attacks blocked.
- **IPC Sender Validation** — Electron IPC messages validated against `mainWindow.webContents.mainFrame`.

### ✅ P1 High Priority Fixes Applied
- **Comprehensive Test Coverage** — Origin validation, CSP headers, extension ID format.
- **Extension ID Format Validation** — Null, empty, and non-string extension IDs rejected.
- **TypeScript Strict Types** — `Uint8Array` ↔ `BufferSource` conversions hardened.

---

## Scope

### In-Scope
| Component | Description |
|-----------|-------------|
| `src/vaultService.ts` | AES-256-GCM encryption, Argon2id KDF |
| `src/lib/webAuthn.ts` | WebAuthn / Passkey PRF extension |
| `src/lib/ExtensionBridge.ts` | HMAC challenge-response bridge |
| `electron-main.cjs` | Electron IPC hardening |
| `src/components/VaultLogin.tsx` | Authentication UI |
| `aegis-wxt/` | Browser extension (WXT + MV3) |

### Out-of-Scope
- Denial of Service (DoS) attacks on personal devices
- Malware/keyloggers on the victim's device
- Social engineering / phishing
- Third-party dependency vulnerabilities (report upstream)

---

## Reporting a Vulnerability

> ⚠️ **Do NOT open a public GitHub issue for security vulnerabilities.**

Please email us directly:

**📧 admin@aegisvault.xyz**

Include:
1. Detailed steps to reproduce
2. Affected version of Aegis Vault
3. Proof-of-Concept code (if applicable)
4. Estimated severity (Critical / High / Medium / Low)

We will acknowledge receipt **within 48 hours** and aim to deploy a fix **within 10 days** for critical issues.

---

## Disclosure Policy

| Phase | Timeline |
|-------|----------|
| Acknowledgment | Within 48 hours |
| Triage & Assessment | Within 5 business days |
| Patch Development | Within 10 days (P0 Critical) |
| Public Disclosure | After fix is verified and distributed |

We follow **responsible disclosure**. Your report will remain strictly confidential until a patch is available.

---

## Security Practices

- 🔍 Dependencies scanned via GitHub Actions (Dependabot enabled)
- 🛡️ Any change affecting encryption or IPC requires manual security review
- 📜 Encrypted export (`.aes`) is the default; plaintext export is heavily discouraged
- 🧪 E2E security tests run on every PR (`npm run test:e2e`)

---

## Acknowledgments

We are grateful to the security researchers who have responsibly disclosed vulnerabilities:

> *This section will be updated as reports are received and verified.*

---

## Contact

- **Security:** admin@aegisvault.xyz
- **GitHub:** https://github.com/hafgit99/AegisVault_V.4.0.0
- **Security Policy:** https://github.com/hafgit99/AegisVault_V.4.0.0/blob/main/SECURITY.md
- **security.txt:** https://aegisvault.xyz/.well-known/security.txt

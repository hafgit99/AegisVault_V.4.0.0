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
- **Loopback Pairing Hardening** — Desktop extension sync now requires explicit enablement plus a shared pairing secret before any challenge is issued.
- **Main Process Plaintext Reduction** — Electron main no longer keeps a replicated plaintext vault; credentials are requested from the renderer on demand per domain.
- **Native Messaging Migration Foundation** — The extension can now prefer a native messaging transport when a registered native host is available, reducing long-term dependence on loopback HTTP.
- **Native Host Skeleton Added** — The repository now contains a native messaging host bridge and manifest generator to support the next migration step away from loopback-only desktop sync.
- **Cross-Browser Native Host Registration** — Windows installer and recovery scripts now register and clean up native host entries for Chrome, Edge, and Firefox.
- **Native Host Artifact Verification** — CI validates generated native host manifests before publishing Windows artifacts.
- **Direct Local IPC for Native Host** — The native host now reaches Electron through a local named pipe / Unix socket bridge instead of calling the loopback HTTP server internally.
- **Native IPC Request Authentication** — Electron now requires HMAC-authenticated native-bridge messages, so raw pipe access alone is not enough to query vault state or domain credentials.
- **Loopback Fallback Narrowed** — When native messaging is enabled, the extension no longer falls back to loopback automatically unless explicitly allowed for recovery/dev scenarios.
- **Runtime Pairing Secret Foundation** — The extension can now store a pairing secret in browser storage, reducing dependence on build-time secret injection and preparing for a fuller persistent pairing model.
- **User-Approved Pairing Foundation** — Electron can now approve and persist per-extension pairing secrets, forming the basis for a stronger long-lived desktop-extension trust relationship.

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

## Audit Readiness

The project is now in a pre-audit preparation phase rather than an early hardening-only phase.

Current state:

- Desktop-extension native messaging and pairing are operational
- Main-process plaintext spread has been reduced
- Windows native host packaging and registration flows exist
- Trust boundary and data-flow documentation has been formalized in the whitepaper and threat model
- Lint and test evidence are still not at audit-ready quality

Reference note:

- `guvenlik/SECURITY_AUDIT_READINESS_2026-03-15_TR.md`
- `guvenlik/SECURITY_WHITEPAPER.md`
- `guvenlik/THREAT_MODEL.md`

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

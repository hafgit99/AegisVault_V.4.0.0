# Changelog

## [4.1.0] - Cross-Platform Security & Governance Update

We are proud to release version 4.1.0 of Aegis Vault. This update brings major architectural improvements to security monitoring, cross-platform compatibility, and release governance.

### 🔐 Security Center 2.0 & Triage
- **Proactive Risk Signals:** Real-time monitoring for missing 2FA, 180+ day password age, and unmonitored sensitive shares.
- **Security Triage Queue:** A dedicated interface to review and resolve security findings with a 7-day trend analysis.
- **Immutable Audit History:** Every security action (ignore, resolve, reopen) is now cryptographically logged for local audit-ready forensics.

### 🌐 Cross-Platform & Canonical Standards
- **Unified Schema Registry:** Introduced a canonical schema (v0.1) for seamless Android-to-Desktop data migration.
- **Encrypted Backup Envelope:** Aligned Android and Desktop backup formats for cross-device restoration.
- **Migration Rationale:** Detailed migration reports now provide transparency on how data is transformed during version upgrades.

### 🛠️ Passkey Governance (Phase 4)
- **Site-Passkey Inventory:** Comprehensive management for all stored FIDO2/WebAuthn credentials.
- **Risk-Based Remediation:** Automated triage for credentials with missing RP IDs or weak metadata.
- **Bulk Operations:** Perform security audits and cleanup on multiple passkeys simultaneously.

### 🏢 Sharing & Team Collaboration (Phase 6)
- **Member Lifecycle Management:** New `invite -> approve -> emergency_only -> remove` workflow for Shared Spaces.
- **Granular Audit Logs:** Every membership change is tracked and filterable in the Sharing Audit Panel.
- **Accessibility (A11y):** Enhanced keyboard navigation and screen-reader support for all sharing modals.

### 🛡️ Release Governance & Trust (Phase 8-9)
- **Audit-Ready Evidence:** Native support for SBOM (Software Bill of Materials) and Provenance tracking.
- **Release Trust Panel:** A new internal dashboard for owners to verify the integrity of the build chain before deployment.
- **Automated Checklists:** The application now auto-validates CI quality gates and release requirements.

---

## [4.0.0] - Secure-by-Default Update

We are excited to announce version 4.0.0 of Aegis Vault. This release represents a massive leap forward in our security architecture, focusing on a zero-knowledge approach, secure cross-origin bridges, and hardened user experience.

### 🛡️ Critical Security Improvements
- **Strict Origin Allowlist & WXT Content Security:** Communication bridges now strictly validate origins (no longer using wildcard `*`). Only trusted domains (e.g., `aegisvault.xyz`) and whitelisted extension IDs are permitted to interact with the Desktop Client IPC.
- **One-Time Nonce Replay Protection:** Vault Sync and Vault Lock requests over `postMessage` now require a cryptographic, single-use `nonce` randomly generated per session. Captured sync payloads can no longer be blindly replayed by attackers.
- **Eliminated Access Token Leaks:** Status endpoint (`/api/status`) no longer leaks synchronization tokens. The sync token model has been deprecated in favor of robust IPC validation.
- **Argon2id KDF & 64MB Memory Limits:** Key Derivation has been updated. We now enforce a memory-hard KDF (Argon2id) utilizing 64MB of RAM per key generation step.
- **Safe-by-Default Configuration:** Sample credentials initialization code has been wrapped entirely in development mode blocks. Production vaults now launch natively zero-knowledge.

### ✨ Advanced Features & UX Hardening
- **Encrypted Backup Export (AES-GCM):** Plaintext exports (JSON/CSV) are no longer the default behavior. User vaults export into an encrypted `.aes` container that requires a password (with Argon2id hashing) to import.
- **Critical Action Re-Authentication:** The Master Password must now be re-entered (ReAuth) for sensitive actions like Vault Exporting, QR syncing, and modifying Duress/Kill PIN settings.
- **Destructive Action Barriers:** Factory Reset no longer relies on a simple browser confirm popup. Users must confront a visually distinct warning modal and manually type `DELETE ALL DATA` to irreversibly wipe the vault.
- **Accessibility Improvements (A11y):** All security modals are properly tracked via `role="dialog"`, trapped with `aria-modal="true"`, strictly labeled via `id/htmlFor`, and support `ESC` to close comfortably.
- **UI Modularization:** The `SettingsDrawer` has been heavily refactored, extracting the Advanced Password Generator functionality into a dedicated modular component for cleaner maintainability.
- **JIT Fill Architecture:** Implemented `browser.scripting` for Just-In-Time (JIT) credential injection. This allows the extension to remain zero-privilege on most sites until the user explicitly requests an action, significantly improving browser security.
- **Loopback-Extension Bridge:** Added `X-Aegis-Client` header validation for Electron-to-Extension communication. Resolved `ERR_BLOCKED_BY_CLIENT` and origin-less fetch issues common in Service Worker environments.

### 🐛 Selected Fixes
- Removed deprecated legacy extension build commands.
- Fixed a bug where `import.meta.env.DEV` conditions were bypassed in some fallback cases.
- Repaired visual overlay z-index issues when showing the Re-Auth and Wipe modals sequentially.

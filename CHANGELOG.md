# Changelog

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

### 🐛 Selected Fixes
- Removed deprecated legacy extension build commands.
- Fixed a bug where `import.meta.env.DEV` conditions were bypassed in some fallback cases.
- Repaired visual overlay z-index issues when showing the Re-Auth and Wipe modals sequentially.

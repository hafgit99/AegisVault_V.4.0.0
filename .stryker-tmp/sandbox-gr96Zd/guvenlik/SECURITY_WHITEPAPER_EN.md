# Aegis Vault Security Whitepaper (English)

Version: 1.0 (Draft)
Date: 2026-03-12
Status: Public Technical Whitepaper (Pre-Audit)

## 1) Executive Summary

Aegis Vault is an offline-first, local-zero-knowledge password management platform.
The product includes a web app (PWA), desktop runtime (Electron), and browser extension.

This whitepaper is intended to:

- Document the security architecture in an auditable way
- Define the threat model and trust boundaries
- Explain implemented controls and residual risks
- Prepare a technical baseline for external security audit

This is a pre-audit release. A later revision will include third-party audit outcomes and remediation notes.

## 2) Security Design Principles

### 2.1 Offline-First by Default

Vault data remains on user devices by default. Cloud dependency is not required.

### 2.2 Local Zero-Knowledge Model

Decryption keys are derived on-device. The system is designed to avoid unnecessary plaintext exposure outside the local security boundary.

### 2.3 Defense in Depth

Security is enforced through layered controls:

- Strong KDF and symmetric encryption
- Session locking and in-memory sanitization
- Hardened bridge authentication
- Metadata encryption + private search index
- Policy-driven data flow restrictions

### 2.4 Least-Data Transfer

Only the minimum required data is transferred between components, especially for extension and bridge paths.

## 3) System Architecture

### 3.1 Main Components

- PWA UI + Vault service (`src/vaultService.ts`)
- Electron main process + loopback bridge (`electron-main.cjs`)
- Browser extension background/content/popup (`aegis-wxt/src/entrypoints/*`)
- Local storage layer (IndexedDB + SQLite/OPFS)

### 3.2 Trust Boundaries

1. User interaction boundary (UI)
2. Cryptographic boundary (vault service)
3. PWA <-> extension boundary
4. Extension <-> Electron loopback boundary
5. At-rest storage boundary

Each boundary crossing is protected with explicit controls and verification.

## 4) Threat Model Overview

### 4.1 Protected Assets

- Authentication verifier material
- Vault plaintext fields (password, notes, TOTP)
- Sensitive metadata (title, username, website, tags, category)
- Passkey binding artifacts

### 4.2 Assumed Threat Actors

- Low-privilege local process
- Malicious browser extension/tab context
- Wrong-origin or wrong-identity bridge caller
- Storage dump attacker with at-rest read access

### 4.3 Out of Scope

- Full root/kernel compromise
- Physical hardware side-channel attacks
- User endpoint compromise outside product controls

## 5) Cryptographic Architecture

### 5.1 Key Derivation

- Vault key derivation: Argon2id
- Authentication verifier: `argon2id-v1`
- Legacy PBKDF2 verifier records migrate automatically on unlock

### 5.2 Encryption

- AES-GCM for vault secrets (password, secure notes, TOTP, attachment payload)
- Metadata encryption for high-value semantic fields

### 5.3 Metadata Encryption

Encrypted at rest:

- title
- username
- website
- category
- tags
- attachment metadata (name/type)

### 5.4 Private Search Index

Search uses an HMAC-based blind index (`search_index`) instead of plaintext indexing.

- Tokens are normalized
- Tokens are HMAC-hashed
- Queries are matched by hash comparison

This preserves search usability while reducing metadata disclosure risk at rest.

## 6) Authentication and Session Security

### 6.1 Verifier Migration

Legacy PBKDF2 verifier entries are validated for compatibility and migrated to Argon2id model (`argon2id-v1`) after successful unlock.

### 6.2 Passkey / PRF Hardening

Passkey handling is profile-scoped:

- Profile-bound passkey binding store
- Profile/database context checks
- Recovery package export/import flow
- Per-profile revocation
- Rotation recommendation model

## 7) Bridge and Extension Security

### 7.1 PWA <-> Extension

- Challenge-response contract
- HMAC-signed requests
- Nonce + TTL replay resistance

### 7.2 Extension <-> Electron Loopback

- `/api/challenge` endpoint for one-time challenge bootstrap
- HMAC-SHA256 request validation
- Extension ID allowlist checks
- Replay-safe nonce lifecycle

### 7.3 Data-Flow Controls

- Domain-scoped credential fetch model
- Legacy full-vault fallback disabled by default
- Cross-domain fallback credential exposure removed

## 8) TOTP Security Profile Mode

TOTP storage policy supports two modes:

- `same_vault`
- `separate_2fa_vault`

In separate mode, TOTP write in primary vault path is blocked by policy. UI provides migration warnings and direct switch action to dedicated 2FA profile.

## 9) Privacy: HIBP / Watchtower

- HIBP breach scan is opt-in
- Network/API uncertainty is reported as `unknown` (not silently treated as safe)
- User-facing state messaging is provided in UI

## 10) Storage Hygiene and Wipe

- Local storage audit/cleanup action is available
- Deep wipe clears passkey/TOTP policy artifacts

## 11) Security Testing Strategy

Current security validation includes:

- Extension security unit tests
- Vault cryptography and migration regression tests
- Metadata encryption and lazy migration tests
- Auth verifier migration tests
- Search index benchmark suite (`npm run bench:search-index`)

## 12) Known Limitations

- Fully automated TOTP migration wizard is not complete yet
- External third-party audit is not published yet
- Final disclosure workflow and process SLA still being operationalized

## 13) Responsible Disclosure (Summary)

A coordinated disclosure process is in progress and documented in:

- `guvenlik/SECURITY_DISCLOSURE.md`

Key flow:

- Private intake
- Severity triage
- Remediation and verification
- Coordinated publication

## 14) External Audit Readiness

Audit prep tracking is documented in:

- `guvenlik/EXTERNAL_AUDIT_PREP.md`

Planned scope includes cryptography, bridge/extension attack surface, storage model, and Electron posture.

## 15) Conclusion

Aegis Vault combines offline-first operation with modern security hardening controls.
This whitepaper provides the baseline technical reference for public review and upcoming external audit.

Next revisions will include:

- Third-party audit findings
- Remediation status matrix
- Updated threat model annexes

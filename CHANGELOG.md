# Changelog

All notable changes to Aegis Vault are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [5.0.0] — 2026-05-03

### ⚡ Highlights

Aegis Vault 5.0 is a major evolution — the Security Center transforms from passive reporting to an active remediation engine, a full alias privacy system is introduced, cross-device sync goes live, and the entire UI is rebuilt with a premium V5 design system.

### Added

- **Crypto Vault + Watch-Only Custody**:
  - Dedicated `CryptoWallet` domain model for offline crypto asset records
  - Watch-only mode remains the default and stores public address data only
  - Optional encrypted seed phrase/private key custody with explicit user-facing risk warnings
  - Network-aware address validation for Bitcoin, Ethereum/EVM, Solana, Tron, Litecoin and custom chains
  - Dedicated Crypto Vault dashboard panel and New Entry form integration
  - Turkish/English UI strings for all crypto vault workflows

- **Crypto Backup and Migration Hardening**:
  - Encrypted `.aes` backups now have explicit crypto-record round-trip coverage
  - Plain JSON import/export preserves `CryptoWallet` category and wallet payload metadata
  - QR sync now carries `notes`, TOTP metadata and crypto wallet payload fields to prevent data loss
  - Canonical schema now maps `CryptoWallet` to `crypto_wallet` and restores it back to `CryptoWallet`
  - Export confirmation warns when crypto records or encrypted seed/private key material are included
  - Stryker quality gate added for crypto wallet domain with 80% break threshold and 97.16% current mutation score

- **Security Center 2.0** — Complete redesign of the security dashboard with active remediation capabilities:
  - Focused Triage Mode for step-through issue resolution
  - Automated Alias Rotation via provider API integration
  - 8 security metrics: Missing 2FA, Passkey Readiness, Aging Credentials, Sharing Gaps, Alias Exposure, Alias Rotation, Device Trust, Local Risk
  - Security triage queue with severity filtering (All / High / Medium)
  - Review history tracking with 7-day trend analytics (reviewed / reopened / auto-resolved)
  - Bulk recommendations engine with context-aware suggestions
  - Issue-group trend analysis for recurring vulnerability patterns
  - Resolved items tracking with re-open capability

- **Alias Privacy System** — End-to-end masked email management platform:
  - `AliasProviderService` with full lifecycle management (provision, rotate, rollback, deactivate)
  - Multi-provider support: SimpleLogin, Addy.io, Firefox Relay, Apple Hide My Email, custom providers
  - API-driven provisioning with real-time alias creation for SimpleLogin and Addy.io
  - `QuickAliasModal` — One-click alias generation wizard with save-to-vault integration
  - `AliasPrivacyPanel` — Dashboard-level alias overview with exposure tracking
  - `AliasIdentityPanel` — Full provider profile management (domains, sync status, API configuration)
  - Per-alias watchtower risk scoring with exposure category tracking (breach, spam, manual, none)
  - Rotation queue system with queued/completed state management
  - Alias history timeline (created, exposed, rotated, rollback events)
  - Alias audit trail with comprehensive event logging (120 events retained)
  - `alias-types.ts` — Typed schema for providers, aliases, rotation queue, watchtower state

- **Sync Relay** — End-to-end encrypted cross-device vault synchronization:
  - `SyncRelayControl` — Push/Pull UI with encrypted cloud sync
  - `SyncManager` with push and pullAndMerge operations
  - `SyncCryptoService` for ECDH + AES-GCM transport encryption
  - `SyncDeviceService` for multi-device session management
  - `SyncConflictService` and `SyncConflictResolutionService` for merge conflict handling
  - `SyncConflictModal` — Visual conflict resolution interface
  - `SyncAuditService` for sync activity logging
  - `SyncEnvelope` transport-level integrity verification
  - Session ID management with regeneration and clipboard copy
  - Relay URL and API key configuration panel
  - Sequence-based change tracking with last-sync timestamp
  - Self-hosted relay option (HTTPS-only)

- **V5 Design System** — Premium production-grade UI overhaul:
  - Full glassmorphism styling with layered depth and transparency
  - Framer Motion-powered micro-animations and transitions
  - Geist Sans / Geist Mono typography stack
  - HSL-tuned color palette with CSS custom properties
  - Dark mode: complete pixel-perfect implementation with high-contrast accessibility
  - Clipboard sanitization timeline with visual countdown
  - Adaptive view density controls (compact / comfortable)
  - Theme toggle (dark/light) in dashboard header
  - Dashboard header redesigned with security score gauge, quick alias button, and language toggle

- **Passkey Governance** — Enhanced WebAuthn credential management:
  - `PasskeySiteInventoryModal` — Comprehensive site-by-site passkey inventory
  - `PasskeyBindingService` — Device-bound credential binding and lifecycle
  - `PasskeyInventoryService` — Discovery and cataloging of passkey-enabled sites

- **Sharing Enhancements**:
  - `SharedSpacesModal` — Collaborative shared vault spaces
  - `SharingOverviewPanel` — Dashboard-level sharing status view
  - `SharingAuditPanel` — Sharing activity audit trail
  - `VaultSharingLinkService` — Shareable link generation with expiry and access controls

- **Release Trust Chain**:
  - `release:trust-chain` npm script — SBOM + provenance + Ed25519 signing + verification in one command
  - `ReleaseTrustPanel` — Visual trust chain status in settings
  - `ReleaseTrustService` — Programmatic release integrity verification
  - Platform signing validation scripts

- **E2E Test Expansion** — 189 tests across 16 Playwright spec files:
  - `vault-chaos-e2e.spec.ts` — Stress testing and edge-case resilience
  - `vault-accessibility.spec.ts` — ARIA, keyboard navigation, screen reader compliance
  - `vault-crypto.spec.ts` — Cryptographic operation validation
  - `vault-security.spec.ts` — Security workflow end-to-end validation
  - `vault-keyboard-shortcuts.spec.ts` — Keyboard shortcut coverage
  - `vault-theme-i18n.spec.ts` — Theme switching and i18n verification
  - `vault-watchtower.spec.ts` — Watchtower alert validation

- **Dark Mode Hardening** — Full accessibility audit and contrast fixes:
  - Sync Relay security banner visibility fix for dark mode
  - Security Center text legibility improvements
  - Settings drawer dark variant consistency

### Changed

- **Test Coverage** — Enhanced from 85% to 87.36% statement coverage across 108+ test files
- **E2E Suite** — Expanded from initial set to 189 comprehensive tests across all user workflows
- **i18n** — Massive bilingual string expansion for Security Center, Alias System, Sync Relay, and Triage components
- **Dashboard Header** — Redesigned with Aegis Vault 5.0 branding, security score, quick alias access, and theme toggle
- **Security Metrics** — Expanded from 4 to 8 metrics with alias exposure and device trust dimensions
- **Component Count** — Dashboard grew from 14 to 22 specialized panel components
- **Dependency Updates** — React 19.2, Vite 7.3, TypeScript 5.9, Electron 40, Playwright 1.58, Tailwind 4.2

### Fixed

- Dark mode text visibility in Security Center severity labels
- Sync Relay security banner contrast in dark theme
- Triage queue filter chip active state consistency across themes
- Alias generation edge case with empty website/title fields
- Clipboard timeline z-index conflicts with modal overlays

---

## [4.2.3] — 2026-04-29

### Added

- **Premium UI Polish** — Massive visual overhaul with glassmorphism, enhanced animations, and curated HSL color palettes
- **Donation Center** — New premium donation modal with cryptocurrency support and QR code integration
- **Turkish Localization** — Expanded Turkish translations for all new security and UI components

### Fixed

- **UI Consistency** — Standardized card density and hover effects across the dashboard
- **Category Management** — Improved sidebar navigation and active state tracking

---

## [4.2.2] — 2026-04-14

### Fixed

- **Native Bridge Security** — Fixed `INVALID_NATIVE_BRIDGE_SIGNATURE` errors by aligning payload structures and signature verification between Electron host and Chrome extension
- **Payload Normalization** — Ensured consistent serialization of bridge requests to prevent structural mismatches

### Changed

- **891 unit tests** across 108 test files — all passing (increased from 711)
- **Coverage** — Updated line coverage to 89.43% with hardened security service tests

---

## [4.2.1] — 2026-04-06

### Added

- **Vault Modularization** — Refactored monolithic `vaultService.ts` into 9 dedicated service modules under `src/lib/vault/`:
  - `VaultAuthService` — Authentication, key derivation verification, legacy salt fallback
  - `VaultBootstrapService` — Database initialization, IDB-to-SQLite migration orchestration
  - `VaultCryptoService` — Field-level AES-256-GCM encryption/decryption with IV management
  - `VaultEntryService` — CRUD operations for all vault entry types
  - `VaultPinService` — PIN-based quick unlock with Argon2id verification
  - `VaultSearchIndexer` — Encrypted search index build and lazy migration
  - `VaultStorageService` — Low-level storage abstraction for SQLCipher/IDB
  - `VaultTrashService` — Soft-delete, restore, auto-cleanup (30-day policy)
  - `VaultAttachmentService` — File attachment encryption, storage, and retrieval
- **Argon2WorkerService** — Non-blocking Argon2id key derivation via dedicated Web Worker with automatic WASM/main-thread fallback
- **AegisError** — Centralized error taxonomy with typed error codes, bilingual messages, and structured error context
- **SharingTransportService** — End-to-end encrypted credential sharing with ECDH receiver pairing, replay protection, and transport-level integrity verification
- **ShareTransportModal** — UI component for guided sharing flow
- **New React Hooks** — `useVaultData`, `useVaultExtension`, `useVaultSecurity`, `useVaultSession` for clean vault state separation
- **30+ Branch Test Files** — Comprehensive branch coverage tests for all critical services
- **ESLint Hardening** — Zero-error, zero-warning lint pass with strict config
- **Stryker Mutation Testing** — Pilot and full configuration for test quality validation

### Changed

- **711 unit tests** across 81 test files — all passing
- **Coverage** — 87.7% statements, 75.3% branches, 90.6% functions, 89.4% lines
- **i18n expansion** — Massive Turkish/English bilingual string expansion across all UI components
- **Extension bridge** — Improved form detection, content script reliability, and WebAuthn polyfill handling
- **Build pipeline** — Updated Electron builder, Vite config, and TypeScript strict mode alignment
- **Documentation** — Updated security governance docs, threat model, hardening plan, and audit preparation pack

### Fixed

- Unterminated template literal in `scripts/write-tests.cjs`
- `@typescript-eslint/no-this-alias` error in Argon2 branch tests
- Unused ESLint directive warnings across test files
- Type-safety improvements across vault services and extension bridge
- Encoding and readability issues in core documentation

---

## [4.2.0] — Turbo Search and High-Scale Performance

### Added

- Decoupled `SearchService` with score-weighted query logic
- Prefix/subsequence tokenization strategy for encrypted search indexing
- Virtualized vault list rendering for large datasets

### Improved

- Scrolling performance for 1000+ vault entries
- Decryption cache warm-up flow with reduced UI blocking
- Codebase quality posture for strict lint and audit workflows

### Fixed

- Onboarding/Settings interaction regression in E2E path
- Sync conflict modal crash caused by missing timestamp fields
- Cache hydration consistency edge cases

---

## [4.1.0] — Cross-Platform Security and Governance

### Added

- Security Center triage workflow and immutable review history
- Canonical schema alignment for Android/Desktop migration
- Passkey governance improvements and release trust controls
- Sharing lifecycle model (`invite → approve → emergency_only → remove`)
- Emergency Access module (TR/EN) with policy management, trusted contacts, request lifecycle, grant TTL, and audit trail
- Emergency Access dashboard panel integrated into settings
- `EmergencyAccessService` with request orchestration (`request`, `approve`, `reject`, `revoke`, `evaluateState`, `summary`)
- Independent audit preparation document pack in English under `guvenlik/belgeler/`
- Security application templates for OSTIF, Mozilla MOSS, and OpenSSF review programs
- OSS-Fuzz eligibility and application preparation checklist
- Dedicated CI workflows for CodeQL and Semgrep static security analysis

### Changed

- Extension form suggestion flow refined to focus on username/password contexts
- Password generation flow improved for registration scenarios
- Language handling improved for Turkish/English usage paths
- CLI documentation structure finalized (TR/EN guides and cheat sheets)
- `SECURITY.md` rewritten with explicit audit policy and disclosure workflow

### Fixed

- Type-safety issues in emergency access state transitions
- Deterministic timing behavior in emergency access expiration tests
- Encoding/readability issues in core documentation pages

---

## [4.0.0] — Secure-by-Default

### Added

- Strict desktop-extension origin allowlist and nonce replay protection
- Argon2id KDF hardening and encrypted backup defaults
- Sensitive action re-authentication and destructive action barriers
- Accessibility hardening and modular security settings architecture

---

[5.0.0]: https://github.com/hafgit99/AegisVault_V.4.0.0/compare/v4.2.3...v5.0.0
[4.2.3]: https://github.com/hafgit99/AegisVault_V.4.0.0/compare/v4.2.2...v4.2.3
[4.2.2]: https://github.com/hafgit99/AegisVault_V.4.0.0/compare/v4.2.1...v4.2.2
[4.2.1]: https://github.com/hafgit99/AegisVault_V.4.0.0/compare/v4.2.0...v4.2.1
[4.2.0]: https://github.com/hafgit99/AegisVault_V.4.0.0/compare/v4.1.0...v4.2.0
[4.1.0]: https://github.com/hafgit99/AegisVault_V.4.0.0/compare/v4.0.0...v4.1.0
[4.0.0]: https://github.com/hafgit99/AegisVault_V.4.0.0/releases/tag/v4.0.0

# Changelog

All notable changes to this project are documented in this file.

## [4.2.3] - 2026-04-29

### Added

- **Premium UI Polish**: Massive visual overhaul with glassmorphism, enhanced animations, and curated HSL color palettes.
- **Donation Center**: New premium donation modal with support for multiple cryptocurrencies and QR code integration.
- **Turkish Localization**: Expanded Turkish translations for all new security and UI components.

### Fixed

- **UI Consistency**: Standardized card density and hover effects across the dashboard.
- **Category Management**: Improved sidebar navigation and active state tracking.

## [4.2.2] - 2026-04-14

### Fixed

- **Native Bridge Security**: Fixed `INVALID_NATIVE_BRIDGE_SIGNATURE` errors by aligning payload structures and signature verification between the Electron host and Chrome extension.
- **Payload Normalization**: Ensured consistent serialization of bridge requests to prevent structural mismatches.

### Changed

- **891 unit tests** across 108 test files — all passing (increased from 711)
- **Coverage**: Updated line coverage to 89.43% with hardened security service tests.

## [4.2.1] - 2026-04-06

### Added

- **Vault Modularization**: Refactored monolithic `vaultService.ts` into 9 dedicated service modules under `src/lib/vault/`:
  - `VaultAuthService` — Authentication, key derivation verification, legacy salt fallback
  - `VaultBootstrapService` — Database initialization, IDB-to-SQLite migration orchestration
  - `VaultCryptoService` — Field-level AES-256-GCM encryption/decryption with IV management
  - `VaultEntryService` — CRUD operations for all vault entry types
  - `VaultPinService` — PIN-based quick unlock with Argon2id verification
  - `VaultSearchIndexer` — Encrypted search index build and lazy migration
  - `VaultStorageService` — Low-level storage abstraction for SQLCipher/IDB
  - `VaultTrashService` — Soft-delete, restore, auto-cleanup (30-day policy)
  - `VaultAttachmentService` — File attachment encryption, storage, and retrieval
- **Argon2WorkerService**: Non-blocking Argon2id key derivation via dedicated Web Worker (`src/workers/argon2.worker.ts`) with automatic WASM/main-thread fallback and worker failure recovery
- **AegisError**: Centralized error taxonomy with typed error codes, bilingual messages, and structured error context
- **SharingTransportService**: End-to-end encrypted credential sharing with ECDH receiver pairing, replay protection, and transport-level integrity verification
- **ShareTransportModal**: UI component for guided sharing flow
- **New React Hooks**: `useVaultData`, `useVaultExtension`, `useVaultSecurity`, `useVaultSession` for clean separation of vault state management
- **30+ Branch Test Files**: Comprehensive branch coverage tests for all critical services including EmergencyAccess, BackupService, ExtensionBridge, ImportService, PasskeyBinding, SyncManager, VaultBootstrap, VaultManager, and more
- **ESLint Hardening**: Zero-error, zero-warning lint pass with strict config
- **Stryker Mutation Testing**: Pilot and full configuration for test quality validation

### Changed

- **711 unit tests** across 81 test files — all passing
- **Coverage**: 87.7% statements, 75.3% branches, 90.6% functions, 89.4% lines
- **i18n expansion**: Massive Turkish/English bilingual string expansion across all UI components
- **ESLint config**: Relaxed noisy rules for pragmatic development while maintaining zero-error enforcement
- **Extension bridge**: Improved form detection, content script reliability, and WebAuthn polyfill handling
- **Build pipeline**: Updated Electron builder, Vite config, and TypeScript strict mode alignment
- **Documentation**: Updated security governance docs, threat model, hardening plan, and audit preparation pack

### Fixed

- Unterminated template literal in `scripts/write-tests.cjs`
- `@typescript-eslint/no-this-alias` error in Argon2 branch tests
- Unused ESLint directive warnings across test files
- Type-safety improvements across vault services and extension bridge
- Encoding and readability issues in core documentation

## [Unreleased] - 2026-04-01

### Added

- Emergency Access module (TR/EN) with policy management, trusted contacts, request lifecycle, grant TTL, and audit trail.
- Emergency Access dashboard panel integrated into settings.
- New persistence model in SecureAppSettings for emergency contacts, requests, audit, and policy.
- EmergencyAccessService with request orchestration (`request`, `approve`, `reject`, `revoke`, `evaluateState`, `summary`).
- Unit tests for Emergency Access service lifecycle scenarios.
- Independent audit preparation document pack in English under `guvenlik/belgeler/`.
- Security application templates for OSTIF, Mozilla MOSS, and OpenSSF review programs.
- OSS-Fuzz eligibility/application notes and preparation checklist.
- Dedicated CI workflows for CodeQL and Semgrep static security analysis.

### Changed

- Extension form suggestion flow refined to focus on username/password contexts.
- Password generation flow improved for registration scenarios.
- Language handling improved for Turkish/English usage paths.
- CLI documentation structure finalized (TR/EN guides and cheat sheets).
- `SECURITY.md` rewritten with explicit audit policy and disclosure workflow.

### Fixed

- Type-safety issues in emergency access state transitions.
- Deterministic timing behavior in emergency access expiration tests.
- Encoding/readability issues in core documentation pages.

## [4.2.0] - Turbo Search and High-Scale Performance

### Added

- Decoupled SearchService with score-weighted query logic.
- Prefix/subsequence tokenization strategy for encrypted search indexing.
- Virtualized vault list rendering for large datasets.

### Improved

- Scrolling performance for 1000+ vault entries.
- Decryption cache warm-up flow with reduced UI blocking.
- Codebase quality posture for strict lint and audit workflows.

### Fixed

- Onboarding/Settings interaction regression in E2E path.
- Sync conflict modal crash caused by missing timestamp fields.
- Cache hydration consistency edge cases.

## [4.1.0] - Cross-Platform Security and Governance

### Added

- Security Center triage workflow and immutable review history.
- Canonical schema alignment for Android/Desktop migration.
- Passkey governance improvements and release trust controls.
- Sharing lifecycle model (`invite -> approve -> emergency_only -> remove`).

## [4.0.0] - Secure-by-Default

### Added

- Strict desktop-extension origin allowlist and nonce replay protection.
- Argon2id KDF hardening and encrypted backup defaults.
- Sensitive action re-authentication and destructive action barriers.
- Accessibility hardening and modular security settings architecture.

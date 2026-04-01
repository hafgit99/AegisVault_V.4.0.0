# Changelog

All notable changes to this project are documented in this file.

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

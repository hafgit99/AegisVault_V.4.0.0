<div align="center">

# Aegis Vault

**Zero-Knowledge Password Manager & Secure Vault**

_Offline-first, end-to-end encrypted credential management for desktop and browser._

<img src="public/icon.png" alt="Aegis Vault" width="100">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-4.2.0-6c5ce7.svg)](https://github.com/hafgit99/AegisVault_V.4.0.0)
[![Tests](https://img.shields.io/badge/Tests-711%20passed-brightgreen.svg)](#test-coverage)
[![Coverage](https://img.shields.io/badge/Coverage-89%25%20Lines-green.svg)](#test-coverage)
[![Lint](https://img.shields.io/badge/Lint-0%20errors-success.svg)](#code-quality)
[![Security](https://img.shields.io/badge/Security-Zero--Knowledge-0f766e.svg)](SECURITY.md)

[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev)
[![Electron](https://img.shields.io/badge/Electron-Latest-47848f?logo=electron&logoColor=white)](https://electronjs.org)
[![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)](https://vitejs.dev)
[![Vitest](https://img.shields.io/badge/Vitest-Latest-729b1b?logo=vitest&logoColor=white)](https://vitest.dev)

</div>

---

## Architecture Overview

```
Aegis Vault 4.2
├── Desktop App (Electron + React 19)
├── Browser Extension (Chrome / Firefox / Safari via WXT)
├── CLI (Node.js, TR/EN bilingual)
├── Sync Relay (self-hosted, HTTPS-only)
└── Native Host Bridge (desktop-extension pairing)
```

### Cryptographic Stack

| Component        | Algorithm                                 |
| ---------------- | ----------------------------------------- |
| Key Derivation   | Argon2id (worker thread + WASM fallback)  |
| Encryption       | AES-256-GCM                               |
| Vault Storage    | SQLCipher (WASM) with OPFS / IDB fallback |
| Backup Integrity | HMAC-SHA256 envelope verification         |
| Sync Transport   | ECDH + AES-GCM end-to-end encryption      |
| Release Signing  | Ed25519 manifest + trust chain            |

## Key Features

- **Zero-Knowledge Architecture** — All encryption/decryption happens client-side; no plaintext ever leaves the device
- **Offline-First Vault** — Full functionality without network; encrypted local SQLite storage
- **Argon2id Worker** — Dedicated Web Worker for non-blocking key derivation with automatic fallback
- **Modular Vault Services** — Cleanly separated concerns: Auth, Crypto, Bootstrap, Entry, Pin, Search, Storage, Trash, Attachments
- **Cross-Platform** — Desktop (Electron), browser extension (Chrome, Firefox, Safari via WXT)
- **Emergency Access** — Trusted contacts, configurable wait windows, grant TTL, full audit trail
- **Special Entry Types** — Logins, credit cards, identity cards, passkeys, TOTP, secure notes
- **QR Sync** — Encrypted credential transfer via QR codes with one-time-use enforcement
- **Sharing Transport** — End-to-end encrypted entry sharing with ECDH receiver pairing
- **Bilingual (TR/EN)** — Full Turkish/English support across UI, CLI, and documentation
- **Security Center** — Breach monitoring (HIBP), watchtower alerts, security score gauge
- **Release Trust Chain** — SBOM generation, Ed25519 signing, provenance verification

## Test Coverage

| Metric          | Score             |
| --------------- | ----------------- |
| **Test Files**  | 81                |
| **Total Tests** | 711 (all passing) |
| **Statements**  | 87.7%             |
| **Branches**    | 75.3%             |
| **Functions**   | 90.6%             |
| **Lines**       | 89.4%             |

Run coverage:

```bash
npm run test:coverage
```

## Code Quality

- **ESLint**: Zero errors, zero warnings across the entire codebase
- **TypeScript Strict**: Full strict mode enabled
- **Mutation Testing**: Stryker integration for test quality validation
- **E2E Tests**: Playwright-based end-to-end test suite
- **CI Quality Gate**: `npm run test:quality-gate` enforces lint + unit + regression + e2e

## What's New in 4.2

### Vault Modularization

Refactored monolithic `vaultService.ts` into dedicated service modules under `src/lib/vault/`:

- `VaultAuthService` — Authentication and key verification
- `VaultBootstrapService` — Database initialization and migration orchestration
- `VaultCryptoService` — Field-level encryption/decryption
- `VaultEntryService` — CRUD operations for vault entries
- `VaultPinService` — PIN-based quick unlock
- `VaultSearchIndexer` — Encrypted search index management
- `VaultStorageService` — Low-level storage abstraction
- `VaultTrashService` — Soft-delete and trash lifecycle
- `VaultAttachmentService` — File attachment handling

### New Services

- **Argon2WorkerService** — Non-blocking Argon2id derivation via Web Worker with automatic WASM/main-thread fallback
- **AegisError** — Centralized error taxonomy with typed error codes
- **SharingTransportService** — End-to-end encrypted credential sharing with ECDH pairing

### Branch Test Suite

30+ new branch test files covering edge cases across all critical services for improved reliability.

### Web Worker Support

Dedicated `argon2.worker.ts` for offloaded key derivation, preventing UI blocking during heavy crypto operations.

For the complete changelog, see [CHANGELOG.md](CHANGELOG.md).

## Quick Start

### Requirements

- Node.js 20+
- npm 10+

### Install

```bash
git clone https://github.com/hafgit99/AegisVault_V.4.0.0.git
cd aegis-4.0
npm install
npm --prefix aegis-wxt install
```

### Run

```bash
# Web UI (development)
npm run dev

# Desktop (Electron)
npm run start:electron

# Browser extension (development)
npm --prefix aegis-wxt run dev
```

### Build

```bash
# Web production build
npm run build

# Electron package
npm run build:electron

# Browser extension
npm run build:extension
```

## CLI (TR/EN)

Bilingual command-line interface for automation and operational workflows.

- Turkish guide: [docs/CLI/2026-04-01_AEGIS_CLI_KULLANIM_KILAVUZU_TR.md](docs/CLI/2026-04-01_AEGIS_CLI_KULLANIM_KILAVUZU_TR.md)
- English guide: [docs/CLI/2026-04-01_AEGIS_CLI_USAGE_GUIDE_EN.md](docs/CLI/2026-04-01_AEGIS_CLI_USAGE_GUIDE_EN.md)
- CLI index: [docs/CLI/README.md](docs/CLI/README.md)

```bash
npm run cli -- help
npm run cli -- status --lang tr
npm run cli -- list --limit 25
npm run cli -- export --format json
```

## Scripts

| Command                     | Description                                           |
| --------------------------- | ----------------------------------------------------- |
| `npm run dev`               | Start Vite dev server                                 |
| `npm run build`             | TypeScript check + Vite production build              |
| `npm run lint`              | ESLint (zero errors enforced)                         |
| `npm run test`              | Run all unit tests                                    |
| `npm run test:coverage`     | Tests with v8 coverage report                         |
| `npm run test:e2e`          | Playwright end-to-end tests                           |
| `npm run test:quality-gate` | Full CI quality gate (lint + unit + regression + e2e) |
| `npm run test:mutate`       | Stryker mutation testing                              |
| `npm run format`            | Prettier code formatting                              |

## Security & Governance

| Resource                                                                   | Language |
| -------------------------------------------------------------------------- | -------- |
| [Security Policy](SECURITY.md)                                             | EN       |
| [Threat Model](guvenlik/belgeler/THREAT_MODEL_EN.md)                       | EN       |
| [Security Whitepaper](guvenlik/belgeler/SECURITY_WHITEPAPER_EN.md)         | EN       |
| [Audit Application Pack](guvenlik/belgeler/AUDIT_APPLICATION_PACK_EN.md)   | EN       |
| [OSS-Fuzz Application Notes](guvenlik/belgeler/OSS_FUZZ_APPLICATION_EN.md) | EN       |
| [Incident Response](INCIDENT_RESPONSE.md)                                  | EN       |
| [Release Verification Guide](docs/VERIFY_RELEASE_TR.md)                    | TR       |
| [Hardening Plan](guvenlik/HARDENING_PLAN.md)                               | TR       |

## Project Structure

```
src/
├── components/          # React UI components
│   ├── dashboard/       # Main dashboard panels
│   ├── onboarding/      # Setup wizard
│   ├── settings/        # Settings drawers and selectors
│   └── ui/              # Shared UI primitives
├── config/              # Encryption profiles, security settings, sync strategy
├── contexts/            # React context providers
├── hooks/               # Custom React hooks
├── lib/                 # Core business logic
│   └── vault/           # Modular vault services
├── workers/             # Web Workers (Argon2)
└── generated/           # Auto-generated artifacts
```

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

---

<div align="center">

**Built with security-first principles. No compromises.**

</div>

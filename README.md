<div align="center">

<img src="public/icon.png" alt="Aegis Vault" width="120">

# Aegis Vault

### Next-Generation Zero-Knowledge Password Manager

_Offline-first, end-to-end encrypted credential management for Desktop, Browser & CLI._

<br>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-5.0.0-6c5ce7.svg)](https://github.com/hafgit99/AegisVault_V.4.0.0)
[![Tests](https://img.shields.io/badge/Tests-891%2B%20passed-brightgreen.svg)](#test-coverage)
[![Coverage](https://img.shields.io/badge/Coverage-87.36%25%20Statements-green.svg)](#test-coverage)
[![E2E](https://img.shields.io/badge/E2E-189%20tests-0f766e.svg)](#test-coverage)
[![Lint](https://img.shields.io/badge/Lint-0%20errors-success.svg)](#code-quality)
[![Security](https://img.shields.io/badge/Security-Zero--Knowledge-0f766e.svg)](SECURITY.md)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev)
[![Electron](https://img.shields.io/badge/Electron-40-47848f?logo=electron&logoColor=white)](https://electronjs.org)
[![Vite](https://img.shields.io/badge/Vite-7-646cff?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

</div>

---

## ✨ What's New in 5.0

Aegis Vault 5.0 is a **major milestone** — a ground-up evolution of security architecture, privacy tooling, and user experience.

### 🛡️ Security Center 2.0 & Automated Triage

The Security Center has been transformed from a passive reporting dashboard into an **active remediation engine**:

- **Focused Triage Mode** — Step-through wizard for systematically resolving security issues by severity
- **Automated Alias Rotation** — One-click API-driven rotation for compromised or exposed email aliases
- **8 Security Metrics** — Missing 2FA, passkey readiness, aging credentials, sharing gaps, alias exposure, alias rotation, device trust, local risk
- **Review History & Trend Analytics** — 7-day activity windows with reviewed/reopened/auto-resolved tracking
- **Bulk Recommendations Engine** — Context-aware suggestions based on current vault state

### 🎭 Alias Privacy System

A complete masked email management platform built directly into the vault:

- **Quick Alias Modal** — Generate privacy-preserving email aliases in seconds
- **Multi-Provider Support** — SimpleLogin, Addy.io, Firefox Relay, Apple Hide My Email, plus custom providers
- **API-Driven Provisioning** — Direct integration with alias provider APIs for real-time alias creation
- **Watchtower Risk Scoring** — Per-alias risk evaluation with exposure tracking and rotation recommendations
- **Alias Identity Panel** — Full provider profile management with sync status, domain configuration, and audit trail

### ☁️ Sync Relay

End-to-end encrypted cross-device vault synchronization:

- **Push/Pull Architecture** — Manual encrypted sync with sequence-based conflict tracking
- **Self-Hosted Relay** — Deploy your own HTTPS-only relay server for full sovereignty
- **Session Management** — UUID-based sessions with regeneration and device pairing
- **Zero-Knowledge Transport** — All data encrypted client-side before relay transmission

### 🎨 V5 Design System

Premium, production-grade UI overhaul:

- **Glassmorphism & Micro-Animations** — Framer Motion-powered transitions throughout
- **Dark Mode (Full)** — Pixel-perfect dark theme with high-contrast accessibility
- **Geist Typography** — Inter/Geist Sans/Geist Mono font stack for professional legibility
- **Adaptive Layout** — Responsive from mobile to ultra-wide with view density controls (compact/comfortable)
- **Clipboard Timeline** — Visual countdown for auto-sanitizing copied credentials

---

## 🏗️ Architecture

```
Aegis Vault 5.0
├── Desktop App          Electron 40 + React 19 + Vite 7
├── Browser Extension    Chrome / Firefox / Safari (WXT framework)
├── CLI                  Node.js — bilingual TR/EN interface
├── Sync Relay           Self-hosted HTTPS-only encrypted relay
└── Native Host Bridge   Desktop ↔ Extension secure pairing
```

### Cryptographic Stack

| Layer             | Implementation                              |
| ----------------- | ------------------------------------------- |
| Key Derivation    | Argon2id (Web Worker + WASM fallback)       |
| Encryption        | AES-256-GCM with per-field IV management    |
| Vault Storage     | SQLCipher (WASM) with OPFS / IDB fallback   |
| Backup Integrity  | HMAC-SHA256 envelope verification           |
| Sync Transport    | ECDH + AES-GCM end-to-end encryption        |
| Sharing Transport | ECDH receiver pairing + replay protection   |
| Release Signing   | Ed25519 manifest + trust chain verification |
| Biometric Unlock  | WebAuthn (device-bound credentials)         |

### Modular Vault Architecture

The vault core is decomposed into **9 dedicated service modules** under `src/lib/vault/`:

| Service                  | Responsibility                                       |
| ------------------------ | ---------------------------------------------------- |
| `VaultAuthService`       | Authentication, key derivation, legacy salt fallback |
| `VaultBootstrapService`  | Database initialization, IDB→SQLite migration        |
| `VaultCryptoService`     | Field-level AES-256-GCM encryption/decryption        |
| `VaultEntryService`      | CRUD operations for all vault entry types            |
| `VaultPinService`        | PIN-based quick unlock with Argon2id verification    |
| `VaultSearchIndexer`     | Encrypted search index build and lazy migration      |
| `VaultStorageService`    | Low-level storage abstraction (SQLCipher/IDB)        |
| `VaultTrashService`      | Soft-delete, restore, auto-cleanup (30-day policy)   |
| `VaultAttachmentService` | File attachment encryption, storage, and retrieval   |

---

## 🔐 Key Features

| Feature                         | Description                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------ |
| **Zero-Knowledge Architecture** | All encryption/decryption happens client-side; no plaintext ever leaves device |
| **Offline-First Vault**         | Full functionality without network; encrypted local SQLite storage             |
| **Security Center 2.0**         | Active triage engine with automated remediation and 8 security metrics         |
| **Alias Privacy System**        | Masked email generation, provider API integration, watchtower risk scoring     |
| **Sync Relay**                  | E2E encrypted cross-device sync with self-hosted relay option                  |
| **Emergency Access**            | Trusted contacts, configurable wait windows, grant TTL, full audit trail       |
| **Special Entry Types**         | Logins, credit cards, identity cards, passkeys, TOTP, secure notes             |
| **QR Sync**                     | Encrypted credential transfer via QR codes with one-time-use enforcement       |
| **Sharing Transport**           | E2E encrypted entry sharing with ECDH receiver pairing & replay protection     |
| **Bilingual (TR/EN)**           | Complete Turkish/English support across UI, CLI, and documentation             |
| **Argon2 Web Worker**           | Non-blocking key derivation with automatic WASM/main-thread fallback           |
| **Release Trust Chain**         | SBOM generation, Ed25519 signing, provenance verification                      |
| **Passkey Governance**          | Site inventory, WebAuthn binding, credential lifecycle management              |
| **Watchtower**                  | Breach monitoring (HIBP), credential age alerts, security score gauge          |
| **Dark Mode**                   | Full dark theme with high-contrast accessibility compliance                    |

---

## 📊 Test Coverage

| Metric                  | Score               |
| ----------------------- | ------------------- |
| **Test Files**          | 108+                |
| **Unit Tests**          | 891+ (all passing)  |
| **E2E Tests**           | 189 (16 spec files) |
| **Statements**          | 87.36%              |
| **Branches**            | 75.4%               |
| **Functions**           | 90.6%               |
| **Lines**               | 89.43%              |
| **Mutation Resilience** | 76.0% (Stryker)     |

### Mutation Resilience (Security Services)

| Service Category      | Mutation Score |
| --------------------- | -------------- |
| WebAuthn / Passkeys   | 82.5%          |
| Vault Logic / Crypto  | 80.3%          |
| Extension Bridge      | 75.6%          |
| Passkey Storage (IDB) | 72.7%          |

```bash
# Run unit tests
npm run test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run mutation tests
npm run test:mutate

# Full CI quality gate (lint + unit + regression + e2e)
npm run test:quality-gate
```

---

## 🔒 Code Quality

- **ESLint**: Zero errors, zero warnings across the entire codebase
- **TypeScript Strict**: Full strict mode enabled (TS 5.9)
- **Mutation Testing**: Stryker integration for test quality validation
- **E2E Resilience**: Playwright-based suite with `toPass` assertions and async state sync
- **CI Quality Gate**: `npm run test:quality-gate` enforces lint + unit + regression + e2e
- **Static Analysis**: CodeQL and Semgrep in CI for automated vulnerability scanning

---

## 🚀 Quick Start

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

---

## 💻 CLI (TR/EN)

Bilingual command-line interface for automation and operational workflows.

```bash
npm run cli -- help
npm run cli -- status --lang tr
npm run cli -- list --limit 25
npm run cli -- export --format json
```

| Resource      | Link                                                                           |
| ------------- | ------------------------------------------------------------------------------ |
| Turkish Guide | [CLI Kullanım Kılavuzu](docs/CLI/2026-04-01_AEGIS_CLI_KULLANIM_KILAVUZU_TR.md) |
| English Guide | [CLI Usage Guide](docs/CLI/2026-04-01_AEGIS_CLI_USAGE_GUIDE_EN.md)             |
| CLI Index     | [docs/CLI/README.md](docs/CLI/README.md)                                       |

---

## 📜 Scripts Reference

| Command                       | Description                                           |
| ----------------------------- | ----------------------------------------------------- |
| `npm run dev`                 | Start Vite dev server                                 |
| `npm run build`               | TypeScript check + Vite production build              |
| `npm run lint`                | ESLint (zero errors enforced)                         |
| `npm run test`                | Run all unit tests                                    |
| `npm run test:coverage`       | Tests with v8 coverage report                         |
| `npm run test:e2e`            | Playwright end-to-end tests                           |
| `npm run test:quality-gate`   | Full CI quality gate (lint + unit + regression + e2e) |
| `npm run test:mutate`         | Stryker mutation testing                              |
| `npm run format`              | Prettier code formatting                              |
| `npm run release:trust-chain` | SBOM + provenance + signing + verification            |
| `npm run cli`                 | Aegis CLI interface                                   |

---

## 🛡️ Security & Governance

| Resource                                                                   | Language |
| -------------------------------------------------------------------------- | -------- |
| [Security Policy](SECURITY.md)                                             | EN       |
| [Threat Model](guvenlik/belgeler/THREAT_MODEL_EN.md)                       | EN       |
| [Security Whitepaper](guvenlik/belgeler/SECURITY_WHITEPAPER_EN.md)         | EN       |
| [Audit Application Pack](guvenlik/belgeler/AUDIT_APPLICATION_PACK_EN.md)   | EN       |
| [OSS-Fuzz Application Notes](guvenlik/belgeler/OSS_FUZZ_APPLICATION_EN.md) | EN       |
| [Incident Response](INCIDENT_RESPONSE.md)                                  | EN       |
| [Hardening Plan](guvenlik/HARDENING_PLAN.md)                               | TR       |
| [Release Verification Guide](docs/VERIFY_RELEASE_TR.md)                    | TR       |
| [Competitor Analysis](guvenlik/COMPETITOR_POSITIONING_ANALYSIS.md)         | EN       |
| [Security Roadmap](guvenlik/SECURITY_ROADMAP.md)                           | TR       |

---

## 📁 Project Structure

```
aegis-4.0/
├── src/
│   ├── components/
│   │   ├── dashboard/          # Main dashboard panels (22 components)
│   │   │   ├── SecurityCenterPanel    # Security Center 2.0 with triage engine
│   │   │   ├── QuickAliasModal        # Quick alias generation wizard
│   │   │   ├── SyncRelayControl       # Sync relay push/pull controls
│   │   │   ├── AliasPrivacyPanel      # Alias privacy management
│   │   │   ├── EmergencyAccessPanel   # Emergency access controls
│   │   │   ├── ReleaseTrustPanel      # Release trust chain viewer
│   │   │   └── ...                    # Entry forms, sharing, watchtower, etc.
│   │   ├── onboarding/         # Setup wizard
│   │   ├── settings/           # Settings drawers, alias identity panel
│   │   └── ui/                 # Shared UI primitives
│   ├── config/                 # Encryption profiles, security settings, sync strategy
│   ├── contexts/               # React context providers (VaultContext)
│   ├── hooks/                  # Custom hooks (useVaultData, useVaultSecurity, etc.)
│   ├── lib/                    # Core business logic (48 modules)
│   │   ├── vault/              # Modular vault services (9 services)
│   │   ├── AliasProviderService        # Multi-provider alias management
│   │   ├── SecurityCenterService       # Security scoring & triage engine
│   │   ├── SharingTransportService     # E2E encrypted sharing
│   │   ├── SyncManager                 # Relay sync orchestration
│   │   ├── EmergencyAccessService      # Emergency access lifecycle
│   │   └── ...                         # Crypto, import/export, passkeys, etc.
│   └── workers/                # Web Workers (Argon2id)
├── aegis-wxt/                  # Browser extension (WXT framework)
├── tests/                      # E2E tests (Playwright, 16 spec files)
├── guvenlik/                   # Security governance documentation
├── docs/                       # Technical documentation & CLI guides
├── scripts/                    # Build, release, CI tooling
└── relay/                      # Sync relay server
```

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

---

<div align="center">

**Built with security-first principles. Zero knowledge. No compromises.**

<sub>Aegis Vault 5.0 — © 2026 hafgit99</sub>

</div>

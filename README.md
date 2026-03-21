# Aegis Vault

Offline-first, zero-knowledge password manager and 2FA authenticator with Electron desktop, React web app, and cross-browser extension support.

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Desktop](https://img.shields.io/badge/Desktop-Electron-47848f?logo=electron)
![Frontend](https://img.shields.io/badge/Frontend-React%2019-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)
![Extension](https://img.shields.io/badge/Extension-WXT-0f172a)
![Security](https://img.shields.io/badge/Security-Zero--Knowledge-0f766e)

## Overview

Aegis Vault is a privacy-focused credential vault built around a simple principle: sensitive data should stay on the user's device and be encrypted before it is ever stored.

The project currently includes:

- A web and desktop vault UI
- A browser extension for autofill and desktop pairing
- Offline QR-based encrypted migration flows
- Native messaging and local desktop bridge support
- Hardened release verification and CI quality gates

## Core Capabilities

- Zero-knowledge local vault model
- Argon2id-based key derivation and AES-256-GCM encryption
- Secure metadata-at-rest handling and private search indexing
- Browser extension pairing with native messaging support
- QR sync with audit and revoke history
- Import and export flows with vendor fixture regression coverage
- Multi-vault and dedicated 2FA vault policies
- Desktop fail-safe and startup diagnostics
- Security mode profiles for stricter local policy enforcement

## Architecture

### Apps

- `src/`: main React application and desktop-facing vault UI
- `electron-main.cjs`: Electron main process, diagnostics, native bridge, local desktop services
- `aegis-wxt/`: Chrome / Edge / Firefox extension built with WXT

### Security-Critical Areas

- `src/vaultService.ts`: vault cryptography, migration and metadata handling
- `src/lib/SQLiteOPFS.ts`: encrypted local persistence layer
- `src/lib/SecureAppSettings.ts`: hardened local security settings state
- `scripts/`: native host, release verification, CI enforcement, signing helpers

## Security Posture

Aegis Vault is designed as an offline-first, local-first system:

- Master secrets stay on device
- Encryption/decryption happens client-side
- Native bridge requests are scoped and authenticated
- Desktop-extension pairing is allowlist-aware and fail-closed
- Release trust chain includes verification-oriented metadata and CI enforcement

Current status: pre-audit, security-hardened technical draft.

For detailed security documentation:

- [Security Policy](SECURITY.md)
- [Security Whitepaper EN](guvenlik/SECURITY_WHITEPAPER_EN.md)
- [Security Whitepaper TR](guvenlik/SECURITY_WHITEPAPER.md)
- [Threat Model EN](guvenlik/THREAT_MODEL_EN.md)
- [Threat Model TR](guvenlik/THREAT_MODEL.md)

## Tech Stack

- React 19
- TypeScript
- Vite
- Electron
- WXT
- Web Crypto API
- Argon2id
- AES-256-GCM
- WA-SQLite / OPFS / IndexedDB

## Development

### Requirements

- Node.js LTS
- npm

### Install

```bash
npm install
npm --prefix aegis-wxt install
```

### Run

Web UI:

```bash
npm run dev
```

Desktop:

```bash
npm run dev:electron
```

Extension:

```bash
npm --prefix aegis-wxt run dev
```

Firefox extension dev:

```bash
npm --prefix aegis-wxt run dev:firefox
```

## Build

Desktop app:

```bash
npm run build:electron
```

Chromium extension:

```bash
npm --prefix aegis-wxt run build
```

Firefox extension:

```bash
npm --prefix aegis-wxt run build:firefox
```

## Quality

Type checking:

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Lint:

```bash
npm run lint
```

Unit tests:

```bash
npm test
```

Coverage:

```bash
npm run test:coverage
```

## Repository Notes

- Security and audit working notes under `guvenlik/` are maintained separately from the public project overview.
- Generated release artifacts, local reports, logs, and native-host build outputs should not be committed.
- Release announcement text and distribution-facing release notes are intentionally not maintained in this README.

## Contributing

Issues and pull requests are welcome, especially in these areas:

- cryptographic review
- secure storage hardening
- cross-browser extension compatibility
- automated test coverage
- accessibility and UX polish

If you are reporting a security issue, please use the process described in [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).

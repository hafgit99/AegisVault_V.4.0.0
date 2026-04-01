# Aegis Vault

Secure, offline-first, zero-knowledge credential vault for desktop and browser extensions.

<p align="center">
  <img src="public/icon.png" alt="Aegis Vault icon" width="120">
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Desktop](https://img.shields.io/badge/Desktop-Electron-47848f?logo=electron)](https://electronjs.org)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019-61dafb?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![Security](https://img.shields.io/badge/Security-Zero--Knowledge-0f766e)](SECURITY.md)

## Highlights

- Cross-browser extension support (Chrome, Firefox, Safari via WXT flow)
- Offline vault with local encryption (Argon2id + AES-GCM)
- Desktop + extension bridge with pairing secret and strict validation
- Bilingual experience (Turkish/English) across app and CLI
- Emergency Access workflow with policy, trusted contacts, approvals, grant TTL, and audit trail
- Desktop-native CLI for automation and operational workflows
- Special entry types including credit card and identity card records

## Recent Updates (2026-04)

- Added full Emergency Access module with:
  - trusted contacts
  - pending/approved/granted/revoked/expired request lifecycle
  - policy controls (manual approval, wait window, grant TTL)
  - audit events and bilingual UI messages
- Improved extension behavior:
  - smarter field targeting for suggestions (username/password focused)
  - secure password generation flow improvements
  - language handling enhancements
- Added and documented CLI command set and bilingual guide pack

For full details, see [CHANGELOG.md](CHANGELOG.md).

## Quick Start

### Requirements

- Node.js 20+
- npm 10+

### Install

```bash
git clone https://github.com/hafgit99/Aegis-Vault.git
cd Aegis-Vault
npm install
npm --prefix aegis-wxt install
```

### Run

```bash
# Web UI
npm run dev

# Desktop (Electron)
npm run start:electron

# Extension development
npm --prefix aegis-wxt run dev
```

## CLI (TR/EN)

- Turkish guide: [docs/CLI/2026-04-01_AEGIS_CLI_KULLANIM_KILAVUZU_TR.md](docs/CLI/2026-04-01_AEGIS_CLI_KULLANIM_KILAVUZU_TR.md)
- English guide: [docs/CLI/2026-04-01_AEGIS_CLI_USAGE_GUIDE_EN.md](docs/CLI/2026-04-01_AEGIS_CLI_USAGE_GUIDE_EN.md)
- CLI index: [docs/CLI/README.md](docs/CLI/README.md)

Example:

```bash
npm run cli -- help
npm run cli -- status --lang tr
npm run cli -- list --limit 25
```

## Security and Governance

- [Security Policy](SECURITY.md)
- [Threat Model (TR)](guvenlik/THREAT_MODEL.md)
- [Threat Model (EN)](guvenlik/THREAT_MODEL_EN.md)
- [Security Whitepaper (TR)](guvenlik/SECURITY_WHITEPAPER.md)
- [Security Whitepaper (EN)](guvenlik/SECURITY_WHITEPAPER_EN.md)
- [Release Verification Guide](docs/VERIFY_RELEASE_TR.md)

## GitHub Safety Note

Before pushing, run a secret check and verify no local credentials are staged:

```bash
git status
git diff --staged
rg -n "BEGIN (RSA|OPENSSH) PRIVATE KEY|API_KEY|SECRET|TOKEN|PASSWORD|ACCESS_KEY" .
```

Also keep `.env*`, signing keys, and private certificates out of git (already covered in `.gitignore`).

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

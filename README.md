# Aegis Vault 4.2.0

**Secure. Private. Professional.**  
The offline-first, zero-knowledge credential vault for the modern web.

<p align="center">
  <img src="public/icon.png" alt="Aegis Vault icon" width="120">
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Desktop](https://img.shields.io/badge/Desktop-Electron-47848f?logo=electron)](https://electronjs.org)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019-61dafb?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![Security](https://img.shields.io/badge/Security-Zero--Knowledge-0f766e)](SECURITY.md)
[![Lint](https://img.shields.io/badge/Lint-Zero--Warnings-success)](#quality)

---

## 🚀 What's New in 4.2.0

Aegis Vault 4.2.0 introduces **Turbo Search** and **High-Scale Performance** optimizations, making it the most fluid offline vault on the market.

- **High-Performance Search:** A decoupled, score-weighted search engine with HMAC-compatible prefix tokenization. Get instant results even in vaults with thousands of entries.
- **Virtualized Rendering:** Truly virtualized list rendering (60 FPS) that handles 1000+ entries with zero memory overhead or scroll stutter.
- **Zero-Lint Quality:** A completely clean codebase with 0 warnings, meeting strict enterprise audit and stability requirements.
- **WebAuthn Runtime:** Full support for Site Passkeys (FIDO2) with seamless extension autofill and cross-device sync.
- **E2E Encrypted Cloud Sync:** Optional, zero-knowledge cloud synchronization via encrypted relay servers.

---

## 🔐 Core Security Principles

- **Zero-Knowledge Architecture:** Master secrets never leave your device. All encryption/decryption happens locally.
- **Hardened KDF:** Argon2id-based key derivation with enforced memory limits (64MB) to prevent brute-force attacks.
- **Modern Cryptography:** AES-256-GCM for all vault data, with unique IVs per entry and field-level encryption.
- **Secure IPC Bridge:** Strictly validated origin allowlists and one-time nonces for Electron-to-Extension communication.
- **Supply Chain Integrity:** SBOM (Software Bill of Materials) and SLSA-compliant provenance tracking for every release.

---

## 🛠️ Tech Stack

- **Core:** React 19, TypeScript 5.x, Vite
- **Desktop:** Electron 40.x (Performance & Security Hardened)
- **Extension:** WXT (Web Extension Toolbox) for Cross-Browser Support
- **Database:** WA-SQLite with OPFS & IndexedDB persistence
- **Crypto:** Web Crypto API, Argon2id, AES-GCM

---

## 📦 Getting Started

### Prerequisites

- Node.js 20+ (LTS)
- npm 10+

### Installation

```bash
# Clone the repository
git clone https://github.com/hafgit99/Aegis-Vault.git
cd Aegis-Vault

# Install dependencies
npm install

# Install extension dependencies
cd aegis-wxt && npm install && cd ..
```

### Development

```bash
# Start Web UI (Dev Server)
npm run dev

# Start Desktop Application (Electron)
npm run start:electron

# Start Extension (WXT)
npm --prefix aegis-wxt run dev
```

---

## 🛡️ Security & Auditing

Aegis Vault is designed for transparency. You can verify the security posture through our detailed documentation:

- [Security Policy](SECURITY.md)
- [Security Whitepaper (EN)](guvenlik/SECURITY_WHITEPAPER_EN.md) | [(TR)](guvenlik/SECURITY_WHITEPAPER.md)
- [Threat Model (EN)](guvenlik/THREAT_MODEL_EN.md) | [(TR)](guvenlik/THREAT_MODEL.md)
- [Verification Guide](docs/VERIFY_RELEASE_TR.md)

---

## ✅ Quality Standards

We maintain a strict quality gate in our CI/CD pipeline:

- **Linting:** 0 warnings / 0 errors.
- **Coverage:** ~78.2% statement coverage, >92% on critical crypto modules.
- **Mutation Score:** ~98.7% Kill Rate (Stryker Mutator).
- **E2E:** Playwright-backed security and regression suites.

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ by the Aegis Team.
</p>

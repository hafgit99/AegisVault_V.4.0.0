# 🛡️ Aegis Vault V.4.0.0 (Hardened Release)

![Aegis Vault Banner](https://raw.githubusercontent.com/hafgit99/AegisVault_V.4.0.0/main/public/icon.png)

> **The Ultimate Secure Vault for Your Digital Life.**
> Experience professional-grade security with a premium aesthetic and a hardened cross-platform bridge. Built for users who demand zero-knowledge privacy without compromising on design.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-4.0.0--Hardened-blue.svg)](https://github.com/hafgit99/AegisVault_V.4.0.0)
[![Security](https://img.shields.io/badge/Security-Hardened-red.svg)](guvenlik/SECURITY_WHITEPAPER_EN.md)
[![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646cff.svg?logo=vite)](https://vitejs.dev/)
[![Electron](https://img.shields.io/badge/Electron-40-47848f.svg?logo=electron)](https://www.electronjs.org/)

---

<p align="center">
  <img src="https://raw.githubusercontent.com/hafgit99/AegisVault_V.4.0.0/main/public/AegisVault_V4.0.0.png" alt="Aegis Vault V4.0.0 Infographic" width="100%">
</p>

---

## 🌟 Overview

**Aegis Vault** is a high-security, multi-platform vault application designed to protect your sensitive information—from passwords to private documents. Built with a focus on **Visual Excellence** and **Unbreakable Security**, Aegis Vault offers a seamless experience across Web, Desktop (Windows), and Browser Extensions (Chrome/Edge/Firefox).

The V.4.0.0 "Hardened" release introduces a completely redesigned communication bridge, military-grade key derivation parameters, and native browser integration.

## ✨ Key Features

-   **🔒 Local Zero-Knowledge Architecture**: Encryption and decryption happen strictly on your device. Your Master Password never touches a server.
-   **🌉 Zero-Trust Communication Bridge**: Secure communication between Extension and Desktop via HMAC-SHA256 signed requests, cryptographic nonces, and **Native Messaging**.
-   **🛡️ Biometric PRF Unlock**: Zero-knowledge biometric authentication using WebAuthn PRF extension (Windows Hello / Mac TouchID).
-   **🏗️ Advanced KDF (Argon2id)**: Protects against brute-force attacks using memory-hard Argon2id (64MB / 3 iterations / 4 parallelism).
-   **🔐 AES-256-GCM Encryption**: Authenticated encryption for all vault entries, ensuring both confidentiality and data integrity.
-   **🔄 Cross-Platform Sync**: Reliable synchronization between the PWA, Windows Desktop App, and Browser Extensions.
-   **🎨 Premium UI/UX**: Stunning interface featuring Glassmorphism, Framer Motion, and a curated professional color palette with full Dark Mode support.
-   **📊 QR Data Migration**: Fully offline device-to-device synchronization via encrypted QR data packets.

---

## 🛡️ Security & Transparency

We believe in "Security through Transparency." Our architecture is fully documented and built upon open cryptographic standards.

| Document | English (EN) | Türkçe (TR) |
| :--- | :--- | :--- |
| **Security Whitepaper** | [Read EN](guvenlik/SECURITY_WHITEPAPER_EN.md) | [Oku TR](guvenlik/SECURITY_WHITEPAPER.md) |
| **Threat Model** | [View EN](guvenlik/THREAT_MODEL_EN.md) | [Görüntüle TR](guvenlik/THREAT_MODEL.md) |
| **Security Disclosure** | [Policy](guvenlik/SECURITY_DISCLOSURE_EN.md) | [Politika](guvenlik/SECURITY_DISCLOSURE.md) |
| **Hardening Plan** | [Plan](guvenlik/HARDENING_PLAN.md) | - |
| **Security Roadmap** | [Roadmap](guvenlik/SECURITY_ROADMAP.md) | - |

> [!IMPORTANT]
> Aegis Vault is currently in **Public Technical Draft (Pre-Audit)** status. While the core cryptography is robust, we recommend reviewing our [Whitepaper](guvenlik/SECURITY_WHITEPAPER_EN.md) for full implementation details.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Framer Motion, Tailwind CSS 4 |
| **Desktop** | Electron 40, Electron Builder (Hardened IPC & Local Sync Server) |
| **Extension** | WXT Framework (Manifest V3, Cross-Browser Support) |
| **Cryptography** | Argon2id, AES-GCM (Browser Crypto API / SubtleCrypto) |
| **Storage** | IndexedDB (idb), WA-SQLite with OPFS persistence |

---

## 🚀 Getting Started

### Prerequisites

-   **Node.js** (Latest LTS)
-   **npm** (comes with Node.js)

### Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/hafgit99/AegisVault_V.4.0.0.git
    cd AegisVault_V.4.0.0
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Run Development Tools**
    - **PWA / Web**: `npm run dev`
    - **Desktop**: `npm run dev:electron` (requires separate terminal)
    - **Extension**: `cd aegis-wxt && npm run dev`

### Building for Production

-   **Web App**: `npm run build`
-   **Desktop App (Windows)**: `npm run build:electron`
-   -   **Browser Extension**: `cd aegis-wxt && npm run build` (Outputs to `dist/`)

### Hardened Desktop Sync

Desktop-to-extension loopback sync is now disabled unless you explicitly opt in and configure a shared pairing secret on both sides.

- Desktop app env vars:
  - `AEGIS_ENABLE_LOOPBACK_SYNC=1`
  - `AEGIS_EXTENSION_PAIRING_SECRET=<32+ chars>`
- Extension build env vars:
  - `WXT_AEGIS_ENABLE_DESKTOP_SYNC=1`
  - `WXT_AEGIS_DESKTOP_PAIRING_SECRET=<same secret>`

Without this pairing secret, the extension will not request desktop challenges over `127.0.0.1`.

The hardened bridge no longer performs full-vault loopback replication. The extension polls only vault status and requests credentials on demand for the active domain.
Electron main now keeps only vault state metadata for this bridge and asks the renderer for short-lived domain-scoped credentials when needed.

### Native Messaging Foundation

The extension now includes a native messaging transport layer that can be enabled as the preferred desktop bridge when a registered native host is available. The native host no longer depends on loopback HTTP internally; it talks to Electron over a direct local IPC channel.

- Extension build env vars:
  - `WXT_AEGIS_ENABLE_NATIVE_MESSAGING=1`
  - `WXT_AEGIS_NATIVE_HOST_NAME=com.aegisvault.desktop`
  - `WXT_AEGIS_ENABLE_LOOPBACK_FALLBACK=1` only for explicit recovery/dev fallback
  - `WXT_AEGIS_DESKTOP_PAIRING_SECRET=<optional build-time fallback>`

Current state:

- Native messaging is implemented as the preferred transport on the extension side
- The native host now talks to Electron over a direct local IPC bridge
- The local IPC bridge now also requires HMAC proof validation with the shared pairing secret
- Loopback fallback is no longer automatic when native messaging is enabled
- The extension can now keep a runtime pairing secret in browser storage instead of relying only on build-time env configuration
- A user-approved native pairing flow foundation now exists for storing and rotating desktop bridge secrets per extension
- The popup now exposes a real pair/unpair desktop bridge flow for end users
- The desktop app settings screen now lists paired extensions and lets you revoke them directly
- Windows production flow now registers the native host for Chrome, Edge, and Firefox
- CI now verifies generated native host manifests before publishing artifacts

Repository foundation:

- Native host bridge script: `scripts/aegis-native-host.cjs`
- Manifest generator: `npm run build:native-host-manifest`
- Manifest verifier: `npm run verify:native-host-manifest`

Example setup flow:

1. For production, set `AEGIS_EXTENSION_ALLOWLIST` or `AEGIS_EXTENSION_ID`
2. Set `AEGIS_EXTENSION_PAIRING_SECRET`
3. Run `npm run build:native-host-manifest`
4. Register the generated manifest from `build/native-host/` with the browser
   Windows quick path:
   `npm run register:native-host`
5. Optionally verify the generated artifacts:
   `npm run verify:native-host-manifest`
6. Build the extension with `WXT_AEGIS_ENABLE_NATIVE_MESSAGING=1`

Development note:

- Chromium development builds now use a stable manifest key from `aegis-wxt/dev/chromium-extension-key.txt`
- The matching default dev extension ID is `iockeheicjcnfoegjjboooljndjcafae`
- `npm run build:native-host-manifest` automatically includes that dev ID in `allowed_origins`
- This avoids the common `wxt dev` pairing failure where the unpacked extension ID changes and the desktop app never receives the request

Windows cleanup:

- `npm run unregister:native-host`

Production note:

- Windows NSIS installer now bundles the native host PowerShell bridge
- Installation runs native host registration automatically
- Uninstall removes the Chrome/Edge/Firefox native host registry keys automatically

---

## 🤝 Support & Donation

If you find Aegis Vault useful, consider supporting the project. **Donations are accepted exclusively within the application** via the secure Donation Modal.

- **GitHub**: Star the project on [GitHub](https://github.com/hafgit99/AegisVault_V.4.0.0)
- **Contribution**: PRs are welcome! Check our [Hardening Plan](guvenlik/HARDENING_PLAN.md) for open tasks.

---

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.

Copyright © 2026 Aegis Vault.

---

<p align="center">
  MADE BY <a href="https://github.com/hafgit99"><b>HAFGIT99</b></a> WITH ❤️
</p>

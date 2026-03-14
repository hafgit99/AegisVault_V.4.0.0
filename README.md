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

The V.4.0.0 "Hardened" release introduces a completely redesigned communication bridge and military-grade key derivation parameters.

## ✨ Key Features

-   **🔒 Local Zero-Knowledge Architecture**: Encryption and decryption happen strictly on your device. Your Master Password never touches a server.
-   **🌉 Production-Grade Hardened Bridge**: Secure communication between Extension and Desktop via HMAC-SHA256 signed requests and cryptographic nonces.
-   **🛡️ JIT Scripting Injection**: Uses high-performance `browser.scripting` for JIT injection, eliminating persistent content script overhead and increasing privacy.
-   **🏗️ Advanced KDF (Argon2id)**: Protects against brute-force attacks using memory-hard Argon2id (64MB / 3 iterations / 4 parallelism).
-   **🔐 AES-256-GCM Encryption**: Authenticated encryption for all vault entries, ensuring both confidentiality and data integrity.
-   **🔄 Cross-Platform Sync**: Reliable synchronization between the PWA, Windows Desktop App, and Browser Extensions.
-   **🎨 Premium UI/UX**: Stunning interface featuring Glassmorphism, Framer Motion, and a curated professional color palette.
-   **🔑 Smart Password Generator**: Real-time strength analysis with entropy estimation and customizable complexity.
-   **📊 QR Data Migration**: Fully offline device-to-device synchronization via encrypted QR data packets.

---

## 🛡️ Security & Transparency

We believe in "Security through Transparency." Our architecture is fully documented and prepared for external audits.

| Document | English (EN) | Türkçe (TR) |
| :--- | :--- | :--- |
| **Security Whitepaper** | [Read EN](guvenlik/SECURITY_WHITEPAPER_EN.md) | [Oku TR](guvenlik/SECURITY_WHITEPAPER.md) |
| **Threat Model** | [View EN](guvenlik/THREAT_MODEL_EN.md) | [Görüntüle TR](guvenlik/THREAT_MODEL.md) |
| **Security Analysis** | - | [Analiz TR](guvenlik/AEGIS_DERIN_GUVENLIK_VE_RAKIP_ANALIZ_RAPORU.md) |
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

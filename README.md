# 🛡️ Aegis Vault V.4.0.0

![Aegis Vault Banner](https://raw.githubusercontent.com/hafgit99/AegisVault_V.4.0.0/main/public/icon.png)

> **The Ultimate Secure Vault for Your Digital Life.**
> Experience professional-grade security with a premium aesthetic.

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-4.0.0-blue.svg)](https://github.com/hafgit99/AegisVault_V.4.0.0)
[![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646cff.svg?logo=vite)](https://vitejs.dev/)
[![Electron](https://img.shields.io/badge/Electron-40-47848f.svg?logo=electron)](https://www.electronjs.org/)

---

## 🌟 Overview

**Aegis Vault** is a high-security, multi-platform vault application designed to protect your sensitive information—from passwords to private documents. Built with a focus on **Visual Excellence** and **Unbreakable Security**, Aegis Vault offers a seamless experience across Web, Desktop (Windows), and Browser Extensions (Chrome/Edge/Firefox).

## ✨ Key Features

-   **🔒 Military-Grade Encryption**: Powered by AES-256 via `crypto-js` and `hash-wasm` for maximum data protection.
-   **🌐 Multi-Platform Support**: Use it as a Web App, a Desktop application (Electron), or a Browser Extension.
-   **🎨 Premium UI/UX**: A stunning, modern interface with glassmorphism, smooth animations (Framer Motion), and a curated Sage Green & Cloud Dancer color palette.
-   **🌍 Multi-lingual**: Full support for **English** and **Turkish**, automatically detecting your preference.
-   **📊 QR Data Sync**: Synchronize your vault across devices securely using local QR-based data sync.
-   **♻️ Smart Trash System**: Recently deleted items are held in a secure trash bin for 30 days before permanent removal.
-   **🔑 Password Generator**: Built-in secure password generator with strength analysis.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite |
| **Styling** | Tailwind CSS 4, Framer Motion, Lucide Icons |
| **Desktop** | Electron 40, Electron Builder |
| **Extension** | WXT / Vite Extension Config |
| **Storage** | IndexedDB (idb), WA-SQLite |
| **Security** | Crypto-JS, Hash-WASM, DOMPurify |

---

## 🚀 Getting Started

### Prerequisites

-   **Node.js** (Latest LTS recommended)
-   **npm** or **yarn**

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

3.  **Run Development Server**
    ```bash
    npm run dev
    ```

### Building for Production

-   **Web App**: `npm run build`
-   **Browser Extension**: `npm run build:extension`
-   **Desktop App (Windows)**: `npm run build:electron`

---

## 🛡️ Security First

Aegis Vault is designed with a **Zero-Knowledge Architecture**. Your data is encrypted locally on your device before it ever touches storage. We do not have access to your master password or your decrypted data.

---

## 🤝 Support & Donation

If you find Aegis Vault useful, consider supporting the project. Your contributions help us maintain and improve the security features.

-   **Crypto Donations**: Available in-app via the Donation Modal.
-   **GitHub**: [hafgit99](https://github.com/hafgit99)

---

## ⚖️ License

Copyright © 2026 Aegis Vault. All Rights Reserved.
This project is proprietary. Unauthorized copying of files, via any medium, is strictly prohibited.

---

<p align="center">
  MADE BY <a href="https://github.com/hafgit99"><b>HAFGIT99</b></a> WITH ❤️
</p>

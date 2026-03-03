# Aegis Vault V.4.0.0 Technical Whitepaper

## 1. Executive Summary
Aegis Vault V.4.0.0 is a next-generation, high-security digital vault designed to provide multi-platform sensitive data management (passwords, documents, and private credentials). Built on a **Zero-Knowledge Architecture**, Aegis Vault ensures that the user's data is encrypted locally on their device before storage. This whitepaper details the technical foundations, cryptographic primitives, and architectural decisions that make Aegis Vault one of the most secure and visually refined personal security solutions.

## 2. Core Architectural Principles
Aegis Vault is designed as a client-side application where the server (if any) or storage layer never receives decrypted data or the user's master password.

*   **Zero-Knowledge Implementation**: All encryption and decryption occur solely within the user's browser or Electron main process. No plain-text data or encryption keys are ever transmitted over a network.
*   **Multi-Platform Decoupling**: The core logic (`VaultService.ts`) is shared across the Web App, Browser Extension (WXT), and Desktop Application (Electron), ensuring a consistent security posture.
*   **Aesthetic-Security Dualism**: Aegis Vault prioritizes a premium UI/UX (built with React 19 and Framer Motion) without compromising the rigor of low-level cryptographic operations.

## 3. Cryptographic Framework
Aegis Vault employs industry-standard and peer-reviewed cryptographic algorithms to ensure data confidentiality and integrity.

### 3.1. Key Derivation Function (KDF): Argon2id
To mitigate brute-force and hardware-accelerated (ASIC/GPU) attacks, Aegis Vault uses **Argon2id** (via `hash-wasm`) for master key derivation.
*   **Memory-Hard Process**: Configured with 64 MB of memory, 3 iterations, and a parallelism factor of 1.
*   **Combined Material**: The key is derived from both the user's **Master Password** and a **Device-Specific Secret**, creating a dual-layered protection mechanism.
*   **Dynamic Salt**: Each vault instance generates a cryptographically secure random 16-byte salt (`crypto.getRandomValues`) to prevent rainbow table attacks.

### 3.2. Symmetric Encryption: AES-256-GCM
Data at rest is protected using **Advanced Encryption Standard (AES)** in **Galois/Counter Mode (GCM)** with a 256-bit key.
*   **Authenticated Encryption**: AES-GCM provides both confidentiality and data integrity (tamper-evident encryption). If the ciphertext is modified, decryption will fail automatically.
*   **Initialization Vector (IV)**: A unique 12-byte IV is generated for every single entry and attachment using the Web Crypto API, ensuring that identical passwords result in different ciphertexts.

### 3.3. Authentication: PBKDF2 with SHA-256
For local vault unlocking, a separate **PBKDF2** hash of the master password is used for verification.
*   **Parameters**: 100,000 iterations with SHA-256 HMAC.
*   **Non-Extractable Keys**: CryptoKeys imported into the Web Crypto Subtle API are flagged as `{ extractable: false }`, preventing memory-scraping tools from exporting the raw master key.

## 4. Storage Architecture (OPFS & SQLCipher Simulation)
Aegis Vault leverages modern browser storage APIs to ensure data persistence and performance.
*   **Direct-to-Disk (OPFS)**: On supported environments, Aegis Vault targets the **Origin Private File System (OPFS)** for high-performance, private data storage.
*   **IndexedDB (IDB) Fallback**: For broader compatibility, Aegis Vault uses `idb` to simulate a robust storage layer.
*   **SQLCipher Logic**: The application implements logical structures similar to SQLCipher, ensuring that all database-level partitions (passwords, metadata, attachments) remain encrypted.

## 5. Security Hardening & Memory Management
Aegis Vault implements several "defense-in-depth" measures:
*   **Memory Sanitization (Sanitizing Memory)**: When the vault is locked, sensitive key material (Uint8Array) is explicitly overwritten with random values (`crypto.getRandomValues`) before being cleared from memory.
*   **Auto-Lock Mechanism**: The system automatically terminates active DB connections and clears session-specific CryptoKeys after a period of inactivity or manual lock.
*   **Legacy Migration Logic**: Aegis Vault includes logic to upgrade legacy static-salt vaults to the new dynamic-salt standard without data loss, ensuring backward compatibility with improved security.

## 6. Extended Features
*   **Secure Attachments**: Files up to 50MB are encrypted using the same AES-256-GCM logic before being stored as Blobs in IndexedDB.
*   **QR Data Sync**: Secure, local-only synchronization of encrypted vault blobs via QR codes, avoiding the need for a centralized cloud hub.
*   **Smart Trash Bin**: A 30-day retention system for deleted items, allowing secure recovery before permanent cryptographic erasure.

## 7. Technical Stack
| Layer | technology |
| :--- | :--- |
| **Logic** | TypeScript 5.x |
| **UI Framework** | React 19 |
| **Animation** | Framer Motion |
| **Cryptography** | Web Crypto API, hash-wasm |
| **Build System** | Vite 7, Electron 40 |
| **Platform** | Windows, Web, Chrome/Edge/Firefox |

## 8. Conclusion
Aegis Vault V.4.0.0 represents a modern approach to digital security. By combining the memory-hard resistance of Argon2id with the efficiency and integrity of AES-256-GCM, it provides a "Military-Grade" environment for individuals and professionals. Its Zero-Knowledge architecture ensures that privacy is not just a policy, but a technical mathematical certainty.

---
*© 2026 Aegis Vault Project. Technical Documentation version 1.0.0.*

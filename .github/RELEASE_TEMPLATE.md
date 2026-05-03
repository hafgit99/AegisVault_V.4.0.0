# 🛡️ Aegis Vault v5.0.0 Release

## 🌟 Overview

We are thrilled to announce **Aegis Vault 5.0** — the most significant release in the project's history. This major version brings a completely reimagined Security Center with active remediation, a full-featured alias privacy system, end-to-end encrypted cross-device sync, and a premium V5 design system.

---

## ⚡ Highlights

### 🔒 Security Center 2.0

- **Focused Triage Mode** — Step-through wizard for systematically resolving security issues by severity
- **Automated Alias Rotation** — One-click API-driven rotation for compromised email aliases
- **8 Security Metrics** — Missing 2FA, passkey readiness, aging credentials, sharing gaps, alias exposure, alias rotation, device trust, local risk
- **7-Day Trend Analytics** — Reviewed, reopened, and auto-resolved issue tracking

### 🎭 Alias Privacy System

- **Quick Alias Modal** — Generate privacy-preserving masked emails in seconds
- **Multi-Provider Support** — SimpleLogin, Addy.io, Firefox Relay, Apple Hide My Email, and custom providers
- **API-Driven Provisioning** — Direct integration with provider APIs for real-time alias creation
- **Watchtower Risk Scoring** — Per-alias risk evaluation with exposure tracking and rotation recommendations

### ☁️ Sync Relay

- **Push/Pull Architecture** — Manual encrypted sync with sequence-based conflict tracking
- **Self-Hosted Option** — Deploy your own HTTPS-only relay server for full data sovereignty
- **Zero-Knowledge Transport** — All data encrypted client-side before transmission

### 🎨 V5 Design System

- **Glassmorphism UI** — Premium visual overhaul with Framer Motion micro-animations
- **Full Dark Mode** — Pixel-perfect dark theme with high-contrast accessibility
- **Geist Typography** — Professional font stack (Geist Sans / Geist Mono)
- **Adaptive Layout** — View density controls (compact / comfortable) with responsive design

---

## 📊 Quality Metrics

| Metric             | Score               |
| ------------------ | ------------------- |
| Unit Tests         | 891+ (all passing)  |
| E2E Tests          | 189 (16 spec files) |
| Statement Coverage | 87.36%              |
| Line Coverage      | 89.43%              |
| Mutation Score     | 76.0% (Stryker)     |
| Lint Errors        | 0                   |

---

## 📦 Installation

### Windows

1. Download `Aegis-Vault-Setup-5.0.0.exe` below.
2. Run the installer and follow the setup wizard.

### macOS

1. Download `Aegis-Vault-5.0.0.dmg`.
2. Drag **Aegis Vault** to your Applications folder.

### Linux

1. Download `Aegis-Vault-5.0.0.AppImage`.
2. Mark as executable: `chmod +x Aegis-Vault-5.0.0.AppImage`
3. Run the file.

### From Source

```bash
git clone https://github.com/hafgit99/AegisVault_V.4.0.0.git
cd aegis-4.0
npm install
npm run build
npm run build:electron
```

---

## 🔒 Verification

| Platform              | Format    | SHA-256 Checksum     |
| :-------------------- | :-------- | :------------------- |
| **Windows Installer** | .exe      | `[HASH_PLACEHOLDER]` |
| **macOS Disk Image**  | .dmg      | `[HASH_PLACEHOLDER]` |
| **Linux AppImage**    | .AppImage | `[HASH_PLACEHOLDER]` |

### Release Trust Chain

This release is signed with Ed25519 and includes:

- **SBOM** — Software Bill of Materials
- **Provenance** — Build provenance attestation
- **Signed Manifest** — Ed25519 release manifest

Verify the release:

```bash
npm run release:verify
```

---

## 🤝 Support the Project

Aegis Vault is built with ❤️ by **hafgit99**.
If you value your digital security, consider supporting us:

- **Crypto Donation**: Use the **Donation Modal** directly inside the application
- **Star on GitHub**: Help us grow by starring the repo!

---

**Full Changelog**: [v4.2.3...v5.0.0](https://github.com/hafgit99/AegisVault_V.4.0.0/compare/v4.2.3...v5.0.0)

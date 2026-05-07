# Aegis Vault Security Policy

Last updated: 2026-05-07

Aegis Vault is an offline-first, zero-knowledge password manager for local vault storage, browser autofill, passkeys, encrypted backup, optional E2E sync, sharing, alias privacy, and crypto vault custody records.

This document explains the security support policy, reporting process, and current security posture. Architecture details are split into the dedicated documents linked below.

## Trust Documentation

| Document                                             | Purpose                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------- |
| [THREAT_MODEL.md](THREAT_MODEL.md)                   | Assets, trust boundaries, attacker model, and mitigations           |
| [BACKUP_RECOVERY.md](BACKUP_RECOVERY.md)             | Backup, restore, import/export, QR sync, and recovery controls      |
| [CRYPTO_VAULT_SECURITY.md](CRYPTO_VAULT_SECURITY.md) | Crypto Vault + watch-only custody model                             |
| [PRIVACY_MODEL.md](PRIVACY_MODEL.md)                 | Local-first privacy, HIBP, aliases, autofill, and extension privacy |
| [docs/TRUST_CENTER.md](docs/TRUST_CENTER.md)         | Trust center index for release, audit, sync, and evidence documents |

## Supported Versions

Security fixes are provided for:

- `main` development line
- Latest production release line: `5.x`
- Current browser extension release line under `aegis-wxt`

Older `4.x` application builds are not the primary security support target unless a release branch is explicitly announced.

## Security Architecture Summary

| Layer             | Current implementation                                                |
| ----------------- | --------------------------------------------------------------------- |
| Vault model       | Offline-first, local-first, zero-knowledge                            |
| Key derivation    | Argon2id with Web Worker/WASM fallback where available                |
| Field encryption  | AES-256-GCM with per-field IV handling                                |
| Local storage     | SQLCipher/WASM with OPFS and IndexedDB fallback paths                 |
| Backup integrity  | Encrypted backup envelope with HMAC verification                      |
| Sync transport    | Optional E2E encrypted relay model; relay does not receive plaintext  |
| QR/device pairing | Local pairing flows with replay/nonce protections                     |
| Sharing transport | ECDH receiver pairing and replay-aware encrypted sharing              |
| Browser extension | WXT extension for Chrome/Firefox with desktop bridge policy controls  |
| Passkeys          | WebAuthn site passkey inventory, RP ID/origin visibility, risk badges |
| Crypto vault      | Watch-only default; optional encrypted seed/private key records       |
| Release trust     | SBOM/provenance/signing evidence tracked in release trust program     |

Plaintext master credentials and decrypted vault entries are designed to remain on the user's device. Sync, export, sharing, and extension flows must preserve this boundary unless the user explicitly exports plaintext data.

## Private Vulnerability Reporting

Do not open public GitHub issues for security vulnerabilities.

Primary contact:

- Email: `admin@aegisvault.xyz`

Please include:

1. Affected component, version, commit, or extension build
2. Reproduction steps and prerequisites
3. Impact, expected attacker capability, and affected data class
4. Proof-of-concept details if safe to share privately
5. Suggested mitigation if known

## Response Targets

| Phase               | Target                                   |
| ------------------- | ---------------------------------------- |
| Acknowledgement     | Within 48 hours                          |
| Initial triage      | Within 5 business days                   |
| Critical fix target | Within 10 days when feasible             |
| Public advisory     | After a patch or mitigation is available |

## Coordinated Disclosure

1. Report is received and acknowledged.
2. Impact and affected versions are triaged.
3. Patch, tests, and documentation updates are prepared.
4. Release artifacts are built and verified.
5. Public advisory is published after users have an upgrade path.

## In Scope

- `src/lib/vault/*`, `src/vaultService.ts`, and vault storage/encryption paths
- Import/export, backup, QR sync, restore, and canonical migration
- Crypto Vault + watch-only wallet domain
- Passkey/WebAuthn inventory, binding, and extension WebAuthn handling
- Alias privacy, HIBP checks, Watchtower, and Security Center
- `aegis-wxt/` browser extension and native messaging bridge
- `relay/` optional sync relay
- Release signing, SBOM, provenance, and build verification scripts

## Out of Scope

- Fully compromised user device or operating system
- Keyloggers, screen capture malware, clipboard malware outside Aegis control
- Social engineering of the user outside the product UX
- Third-party provider compromise unless Aegis mishandles provider data
- Denial of service without security impact

## Security Quality Gates

Recommended local release checks:

```bash
npm run lint
npm run test
npm run test:security-regression
npm run test:quality-gate
npm run test:mutate:crypto
npm run build
```

Extension checks:

```bash
cd aegis-wxt
npm run compile
npm run format:check
npm run build
npm run build:firefox
```

## Audit Status

Aegis maintains audit-ready documentation and release evidence, but this repository should not be interpreted as having completed an independent third-party security audit unless a signed external audit report is linked from the release notes.

Current audit preparation materials are indexed in [docs/TRUST_CENTER.md](docs/TRUST_CENTER.md).

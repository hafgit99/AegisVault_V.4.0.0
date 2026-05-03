# Aegis Vault Security Policy

Last updated: 2026-05-03

## Security model

Aegis Vault is designed as an **offline-first, zero-knowledge password manager** with end-to-end encrypted cross-device sync capabilities.

| Layer                  | Implementation                                  |
| ---------------------- | ----------------------------------------------- |
| Key derivation         | `Argon2id` (Web Worker + WASM fallback)         |
| Encryption             | `AES-256-GCM` with per-field IV management      |
| Vault storage          | `SQLCipher` (WASM) with OPFS / IDB fallback     |
| Backup integrity       | `HMAC-SHA256` envelope verification             |
| Sync transport         | `ECDH + AES-GCM` end-to-end encryption         |
| Sharing transport      | `ECDH` receiver pairing with replay protection  |
| Extension bridge       | Challenge-response with integrity verification  |
| Biometric unlock       | `WebAuthn` (device-bound credentials)           |
| Release signing        | `Ed25519` manifest + trust chain verification   |

Master credentials and decrypted vault data **never leave the user's device as plaintext**, including during sync relay operations.

## Supported versions

Security fixes are currently provided for:

- `main` (development line)
- Latest production tag (`v5.x`)

Older tags (`v4.x` and below) are no longer receiving security patches.

## Private vulnerability reporting

**Do not open public issues for security vulnerabilities.**

Primary contact:

- Email: `admin@aegisvault.xyz`

### Recommended report content

1. Affected component and version/commit
2. Reproduction steps with clear preconditions
3. Impact and likely attack path
4. Optional PoC and mitigations

### Target response times

| Phase               | Target            |
| ------------------- | ----------------- |
| Acknowledgement     | Within 48 hours   |
| Initial triage      | Within 5 business days |
| Critical fix target | Within 10 days (when feasible) |

## Coordinated disclosure policy

We follow coordinated disclosure:

1. Report received and acknowledged.
2. Severity triage and fix plan.
3. Patch development and validation.
4. Public advisory after patch availability.

## Security audit policy

The project is in active independent-audit preparation.

### Current policy

- Threat model and whitepaper are published in [`guvenlik/belgeler`](guvenlik/belgeler).
- Static analysis runs in CI (`CodeQL`, `Semgrep`) for pull requests and pushes.
- High-risk areas (crypto, vault storage, bridge auth, import/export, sync, alias provisioning) require explicit security review.
- Security-impacting changes must include tests and updated documentation.
- Release trust chain (SBOM + Ed25519 signing + provenance verification) is enforced for production builds.

### Planned external review channels

- OSTIF proposal submission
- Mozilla MOSS submission
- OpenSSF Security Review submission
- OSS-Fuzz/ClusterFuzz assessment and submission package

See:

- [`guvenlik/belgeler/AUDIT_APPLICATION_PACK_EN.md`](guvenlik/belgeler/AUDIT_APPLICATION_PACK_EN.md)

## In-scope components

- `src/vaultService.ts` and `src/lib/vault/*` (modular vault services)
- `src/lib/*` (crypto, import/export, sync, bridge, emergency access, alias provisioning, sharing transport)
- `electron-main.cjs` and native host scripts
- `aegis-wxt/` browser extension runtime
- `relay/` sync relay server
- `scripts/` release signing and trust chain tooling

## Out-of-scope examples

- Device-level malware or keyloggers
- Full OS/kernel compromise
- Social engineering attacks
- Third-party vulnerabilities that must be fixed upstream

## Best-practice reminders

- Never commit secrets, signing keys, private certificates, or `.env` credentials.
- Keep dependency updates and lockfiles reviewed.
- Run local checks before release candidates:
  ```bash
  npm run lint
  npm run test
  npm run test:security-regression
  npm run test:quality-gate
  npm run release:trust-chain
  ```

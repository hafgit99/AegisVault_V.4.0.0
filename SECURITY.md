# Aegis Vault Security Policy

Last updated: 2026-04-01

## Security model

Aegis Vault is designed as an offline-first, local zero-knowledge password manager.

- Key derivation: `Argon2id`
- Encryption: `AES-256-GCM`
- Extension/Desktop bridge: challenge-response with integrity verification
- Biometric unlock path: `WebAuthn` (device-bound)

Master credentials and decrypted vault data are not intended to leave the user's device as plaintext.

## Supported versions

Security fixes are currently provided for:

- `main` (development line)
- Latest production tag (`v4.x`)

Older tags may be unsupported for security patches.

## Private vulnerability reporting

Do not open public issues for security vulnerabilities.

Primary contact:

- Email: `admin@aegisvault.xyz`

Recommended report content:

1. Affected component and version/commit.
2. Reproduction steps with clear preconditions.
3. Impact and likely attack path.
4. Optional PoC and mitigations.

Target response times:

- Acknowledgement: within 48 hours
- Initial triage: within 5 business days
- Critical fix target: within 10 days (when feasible)

## Coordinated disclosure policy

We follow coordinated disclosure:

1. Report received and acknowledged.
2. Severity triage and fix plan.
3. Patch development and validation.
4. Public advisory after patch availability.

## Security audit policy

The project is in active independent-audit preparation.

Current policy:

- Threat model and whitepaper are published in [`guvenlik/belgeler`](guvenlik/belgeler).
- Static analysis runs in CI (`CodeQL`, `Semgrep`) for pull requests and pushes.
- High-risk areas (crypto, vault storage, bridge auth, import/export, sync) require explicit security review.
- Security-impacting changes should include tests and updated documentation.

Planned external review channels:

- OSTIF proposal submission
- Mozilla MOSS submission
- OpenSSF Security Review submission
- OSS-Fuzz/ClusterFuzz assessment and submission package

See:

- [`guvenlik/belgeler/README_AUDIT_PREP_EN.md`](guvenlik/belgeler/README_AUDIT_PREP_EN.md)
- [`guvenlik/belgeler/AUDIT_APPLICATION_PACK_EN.md`](guvenlik/belgeler/AUDIT_APPLICATION_PACK_EN.md)

## In-scope components

- `src/vaultService.ts`
- `src/lib/*` (crypto, import/export, sync, bridge, emergency access)
- `electron-main.cjs` and native host scripts
- `aegis-wxt/` browser extension runtime

## Out-of-scope examples

- Device-level malware or keyloggers
- Full OS/kernel compromise
- Social engineering attacks
- Third-party vulnerabilities that must be fixed upstream

## Best-practice reminders

- Never commit secrets, signing keys, private certificates, or `.env` credentials.
- Keep dependency updates and lockfiles reviewed.
- Run local checks before release candidates:
  - `npm run lint`
  - `npm run test:unit`
  - `npm run test:security-regression`

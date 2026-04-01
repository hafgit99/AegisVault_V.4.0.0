# Aegis Vault Threat Model

Version: 1.1  
Date: 2026-04-01  
Status: Audit Preparation (Public)

## 1. Scope

Covered components:

- PWA application and vault runtime
- Electron desktop runtime
- Browser extension (Chrome/Firefox/Safari flow)
- Local storage and import/export paths
- Sync and backup transport boundaries

## 2. Security objectives

1. Prevent unauthorized disclosure of plaintext secrets.
2. Prevent unauthorized credential retrieval across trust boundaries.
3. Reduce replay, impersonation, and downgrade risks.
4. Preserve data integrity during import/export/sync workflows.
5. Limit blast radius of extension and local bridge interactions.

## 3. Protected assets

- Master credential verifier and derived key material
- Passwords, secure notes, TOTP secrets, passkey metadata
- Card and identity structured records
- Encrypted backup payloads and QR transfer payloads
- Security/audit state (review markers, sync audit events)

## 4. Trust boundaries

1. UI boundary: user input and rendered secrets.
2. Cryptographic boundary: derive/decrypt/encrypt operations.
3. Extension boundary: web page context to extension runtime.
4. Desktop bridge boundary: extension/native host/desktop channel.
5. Storage boundary: IndexedDB/SQLite/backup files and transfer payloads.

## 5. Threat actors

- Local unprivileged process attacker
- Malicious or compromised browser context/extension
- Wrong-origin or wrong-identity bridge caller
- Offline storage exfiltration attacker
- User workflow misuse and policy misconfiguration

## 6. Key attack scenarios and controls

### Scenario A: Bridge abuse and identity spoofing

Controls:
- Extension allowlist checks
- Challenge-response and request validation
- Pairing constraints and limited-scope data responses

Residual risk:
- Compromised host environment can still increase risk.

### Scenario B: Import/export data loss or corruption

Controls:
- Canonical schema mapping for all record types
- Regression tests for import/export/sync transformations
- Conflict and migration reporting

Residual risk:
- User-side manual file handling errors remain possible.

### Scenario C: At-rest metadata leakage

Controls:
- Encrypted metadata fields
- Blind/private search indexing strategy
- Reduced plaintext handling in runtime paths

Residual risk:
- Access pattern metadata cannot be fully eliminated.

### Scenario D: Credential aging and weak second-factor posture

Controls:
- Security Center scoring and triage model
- Reviewed-item workflow and risk resurfacing rules
- Policy guidance for second-factor adoption

Residual risk:
- User decisions still influence final posture.

## 7. Assumptions

- Host OS and browser are reasonably trusted.
- No kernel/root compromise in baseline model.
- Cryptographic primitives remain computationally secure.

## 8. Out-of-scope

- Physical side-channel attacks
- Full system compromise (root-level malware)
- Social engineering and credential phishing outside product controls

## 9. Verification and evidence

- Unit and integration security tests in CI
- Static analysis through CodeQL and Semgrep
- Release and artifact verification scripts

## 10. Planned independent review

- OSTIF proposal
- Mozilla MOSS application
- OpenSSF Security Review application
- OSS-Fuzz/ClusterFuzz eligibility and onboarding package

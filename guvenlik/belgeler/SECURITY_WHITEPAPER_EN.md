# Aegis Vault Security Whitepaper

Version: 1.1  
Date: 2026-04-01  
Status: Public Audit Preparation Whitepaper

## Executive summary

Aegis Vault is an offline-first credential manager with local zero-knowledge security goals across web, desktop, and extension surfaces. This whitepaper documents architecture, trust boundaries, controls, and remaining risks to support external security assessment.

## Security principles

1. Offline-first ownership of vault data.
2. Minimized plaintext movement between components.
3. Defense in depth across crypto, bridge, storage, and UI.
4. Explicit trust boundaries and policy-driven access decisions.

## Architecture overview

Core surfaces:
- PWA/React application and vault logic
- Electron runtime for desktop flows
- Browser extension runtime for field interaction
- Local persistence and backup/transfer services

## Cryptography and key management

- Master-key derivation based on Argon2id.
- Authenticated encryption using AES-256-GCM.
- Encrypted structured payloads for password, notes, TOTP, card, and identity records.
- Migration support for legacy verifier/data paths where required.

## Data model and schema safety

- Canonical adapters and migration services normalize record formats.
- Import/export and sync paths preserve extended record types.
- Regression tests guard against schema drops and silent data loss.

## Bridge and extension security posture

- Strict trust decisions for desktop-extension interaction.
- Controlled request scope for decrypted responses.
- Pairing and identity checks for privileged operations.

## Security operations posture

- CI-based quality gates plus static analysis integrations.
- Documented vulnerability disclosure policy.
- Security-impacting changes require explicit review and tests.

## Residual risks

- Host-level compromise can bypass local protections.
- User operational mistakes (file handling, weak password choice) remain external factors.
- Some telemetry-free local workflows trade convenience for stricter security controls.

## Independent audit readiness

Preparation targets:
- OSTIF independent audit proposal
- Mozilla MOSS support request
- OpenSSF security review track
- OSS-Fuzz/ClusterFuzz compatibility path

Supporting pack:
- Threat model
- Security policy and disclosure process
- CI static analysis configuration
- Submission templates for review programs

# Aegis Vault Threat Model (English)

Version: 1.0 (Draft)
Date: 2026-03-12
Status: Pre-Audit

## 1) Scope

This document defines the threat model for the following Aegis Vault components:

- PWA UI + Vault Service
- Electron runtime and loopback bridge
- Browser extension (background/content/popup)
- Local storage layer (IndexedDB / SQLite-OPFS)

## 2) Security Objectives

- Prevent unauthorized disclosure of vault plaintext
- Reduce authentication bypass risk
- Minimize bridge and extension attack surface
- Reduce at-rest metadata exposure
- Prevent replay, downgrade, and wrong-context access

## 3) Assets

Critical assets include:

- Master credential verifier data
- Derived key material
- Vault plaintext fields (`pass`, `notes`, `totpSecret`)
- Encrypted metadata blobs
- Blind search index
- Passkey binding and recovery artifacts

## 4) Trust Boundaries

TB1: User input/UI boundary  
TB2: Vault cryptography boundary  
TB3: PWA <-> Extension bridge boundary  
TB4: Extension <-> Electron loopback boundary  
TB5: At-rest storage boundary

Each boundary crossing is protected by policy, verification, and minimum-data contracts.

## 5) Threat Actors

- TA1: Low-privilege local process
- TA2: Malicious browser extension/tab script context
- TA3: Wrong-origin/wrong-extension identity bridge caller
- TA4: At-rest storage dump attacker
- TA5: User workflow mistakes (wrong-profile writes, misplaced secrets)

## 6) Attack Scenarios and Controls

### S1: Loopback endpoint abuse

Risk:
- Unauthorized local process attempts to fetch vault data via loopback API

Controls:
- Challenge endpoint + HMAC signature validation
- Nonce/TTL replay protection
- Extension ID allowlist
- Domain-scoped minimal response model

Residual risk:
- Host-level compromise can still enable advanced process-level abuse

### S2: Full-vault plaintext spread

Risk:
- Unnecessary bulk plaintext transfer to extension/popup paths

Controls:
- GET_DOMAIN_CREDS contract
- Legacy full-vault behavior disabled by default
- Cross-domain fallback listing removed

Residual risk:
- Minimal active-domain credentials may still exist in runtime memory briefly

### S3: Metadata disclosure at rest

Risk:
- Site/username/tag intelligence leakage without decrypting passwords

Controls:
- Metadata encryption (title/username/website/category/tags)
- Attachment metadata encryption (name/type)
- Blind search index

Residual risk:
- Timing and usage pattern metadata cannot be fully removed

### S4: Auth verifier brute-force economics

Risk:
- Legacy PBKDF2 verifier with weaker cost profile

Controls:
- `argon2id-v1` verifier model
- Automatic PBKDF2 -> Argon2id migration on successful unlock

Residual risk:
- Weak user-chosen master passwords remain a user-side risk

### S5: Wrong-profile TOTP write

Risk:
- 2FA secrets stored in primary vault by mistake

Controls:
- TOTP vault policy mode (`same_vault` / `separate_2fa_vault`)
- Policy enforcement blocks writes in separate mode
- Migration warning + guided profile switch action

Residual risk:
- Data may remain split across profiles until migration is completed

## 7) Assumptions

- Endpoint is not fully compromised at kernel/root level
- Browser and platform cryptographic primitives are correctly implemented
- Users choose sufficiently strong master and recovery passwords

## 8) Out of Scope

- Rootkits / kernel implants
- Physical side-channel attacks (DMA/cold-boot)
- Hardware EM analysis and advanced physical lab attacks

## 9) Current Risk Register

- R1: No published third-party audit yet (Severity: Medium, Likelihood: Medium)
- R2: Operational security runbooks still maturing (M/M)
- R3: Fully automated TOTP migration wizard not complete (Low/Medium)

## 10) Mitigation Roadmap

Short term:
- Finalize disclosure policy and channels
- Freeze audit scope and evidence bundle
- Introduce periodic threat-model review cadence

Mid term:
- Execute external audit
- Publish remediation matrix
- Define security SLA and incident playbooks

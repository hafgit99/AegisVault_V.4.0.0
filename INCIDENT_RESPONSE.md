# Aegis Vault - Incident Response Runbook

## Overview

This document specifies the response procedures for a potential security compromise involving the Aegis Vault application or extension bridge.

## Phase 1: Triage and Identification

- **When to start**: Upon receiving a report of data leakage, token theft, or malicious origin spoofing via `security@aegisvault.xyz` or GitHub Issues.
- **Action**: Verify the finding. Confirm if the vulnerability is a client-side execution path (XSS) or a bridge architecture flaw (`AEGIS_SYNC_VAULT` replay or origin bypass).

## Phase 2: Containment (Short-term mitigation)

If the vulnerability allows an immediate external extraction of secrets without a Master Password prompt:

1. **Kill Switch on Bridge**: If the vulnerability is found in the WXT Web-to-Extension communication or Electron IPC (`electron-main.cjs`), immediately patch `ALLOWLIST_EXTENSION_IDS` or `TRUSTED_ORIGINS` to essentially drop all requests temporarily.
2. **Alert Users**: If the deployed bridge infrastructure is compromised, alert all users via the main domain `aegisvault.xyz` and advise to `Lock Vault` immediately and do not sync.
3. **Issue Advisory**: Create a GitHub Security Advisory explaining the vector.

## Phase 3: Eradication and Recovery

1. **Fix nonces and origin validation**: Ensure the One-Time Nonce architecture in `VaultContext` is properly terminating older nonces.
2. **Invalidate old Vault Configurations**: If any configuration was maliciously tampered with, prompt users upon the next update to force an encrypted export/import cycle, re-hashing their entries.
3. **Roll out a Hotfix Release**: Prepare `4.x.x-hotfix` for immediate distribution on the Chrome Web Store and GitHub Releases.

## Phase 4: Post-Incident Review

1. Analyze how the tests missed the vulnerability.
2. Implement automated E2E tests for the specific spoofing pattern that caused the leak.
3. Publish a post-mortem to reassure transparency and learning.

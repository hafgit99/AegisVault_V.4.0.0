# Aegis Vault Security Disclosure Policy (English)

Version: 1.0 (Draft)
Date: 2026-03-12
Status: Pre-Audit Public Policy

## 1) Policy Statement

Aegis Vault supports responsible and coordinated disclosure of security vulnerabilities.
This policy defines the reporting workflow between security researchers and the product team.

## 2) Preferred Reporting Channel

Temporary pre-audit channel:

- Email: security@aegisvault.local (placeholder)

Note:

- A production channel and PGP key will be published in a later revision.

## 3) Scope

In-scope:

- Authentication bypass
- Vault data exposure (plaintext/metadata)
- Bridge abuse (extension/electron/pwa)
- Cryptographic misuse and key handling flaws
- Privilege escalation and isolation bypass

Out-of-scope:

- Social engineering
- Attacks requiring physical access
- Upstream-only dependency issues without product exploit path
- DDoS / pure availability stress tests

## 4) Rules of Engagement

- Do not harm users or production data
- Do not destroy/alter/exfiltrate user data
- Use minimum viable PoC
- Operate under legal and ethical boundaries

## 5) Report Format

Please include:

- Title
- Affected version/component
- Reproduction steps
- Expected vs observed behavior
- Impact analysis (CIA)
- PoC (if possible)
- Suggested fix (optional)

## 6) Triage and SLA Targets

Target response windows:

- Initial response: 3 business days
- Triage completion: 7 business days
- Severity assignment: 10 business days

Target remediation windows:

- Critical: 7-14 days
- High: 30 days
- Medium: 60 days
- Low: 90 days

These are operational targets and may vary by complexity and regression risk.

## 7) Severity Classification

- Critical: Unauthorized plaintext vault access / full auth bypass
- High: Practical high-impact exploit path
- Medium: Conditional exploitability with bounded impact
- Low: Low impact and/or difficult exploitation

## 8) Coordinated Disclosure

- Public exploit details should be delayed until fix availability
- Release and advisory timing should be coordinated
- Researcher credit is provided with consent

## 9) Safe Harbor Intent

Good-faith research under this policy is not intended to trigger legal action.
This intent does not replace formal legal protections.

## 10) Hall of Thanks (Planned)

Accepted reports may be acknowledged publicly with researcher consent.

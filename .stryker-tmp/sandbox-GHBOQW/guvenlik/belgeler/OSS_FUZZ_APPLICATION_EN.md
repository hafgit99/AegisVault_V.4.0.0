# OSS-Fuzz Application Notes (Aegis Vault)

## Objective

Prepare an OSS-Fuzz submission package and validate technical eligibility.

## Important eligibility note

OSS-Fuzz primarily targets projects with parsers or components in C/C++, Rust, Go, Java, Python, and selected ecosystems with fuzz harness support.

Aegis Vault is mainly TypeScript/Electron, so acceptance may depend on:

1. A clearly fuzzable parser/logic surface, and
2. A supported fuzzing harness strategy.

If OSS-Fuzz eligibility is limited, use ClusterFuzzLite or continuous local fuzzing as the primary path.

## Candidate fuzz targets

1. Import parsers (CSV/JSON vendor imports)
2. Canonical migration adapters
3. Sync envelope decode/validation
4. QR transfer payload parse and verify path

## Submission preparation checklist

- [ ] Short project description and security impact
- [ ] Link to public repository and active maintainers
- [ ] Defined fuzz targets and expected bug classes
- [ ] Build instructions and test corpus seed plan
- [ ] Contact email for triage and reports
- [ ] OSS-Fuzz project files prepared from templates in `guvenlik/belgeler/oss-fuzz-template/`

## Suggested submission text (template)

Project: Aegis Vault  
Use case: Offline-first credential manager with local cryptographic data handling  
Focus: Hardening import/sync parser surfaces and schema transformations  
Maintainers: security and core engineering team  
Repository: https://github.com/hafgit99/AegisVault_V.4.0.0

## Follow-up strategy

- If accepted: integrate findings workflow into CI + security advisory process.
- If not accepted: ship ClusterFuzzLite/Jazzer-based pipeline for parser-focused fuzzing.

## Ready-to-edit templates

Use:

- `guvenlik/belgeler/oss-fuzz-template/project.yaml.template`
- `guvenlik/belgeler/oss-fuzz-template/Dockerfile.template`
- `guvenlik/belgeler/oss-fuzz-template/build.sh.template`
- `guvenlik/belgeler/oss-fuzz-template/PR_CHECKLIST_EN.md`

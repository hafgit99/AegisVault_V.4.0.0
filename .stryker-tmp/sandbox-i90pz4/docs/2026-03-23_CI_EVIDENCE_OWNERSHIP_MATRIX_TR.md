# Aegis 4.1 - CI Evidence Ownership Matrix

Tarih: 23 Mart 2026

## Amac

Faz 2 kalite kapisi ve audit-ready surecinde hangi evidence maddesinden hangi alanin sorumlu oldugunu netlestirmek.

## Sahiplik Matrisi

### Desktop

- Unit test raporu
- Native host artefact'lari
- Desktop smoke ve quality gate gecisi

### Data

- Import/export regression raporu
- Schema/migration regression kaniti

### Security

- Security regression raporu
- Threat boundary ve sertlestirme kaniti

### QA

- E2E sonucu
- Browser matrix
- Manual exploratory regression

### Extension

- Chrome/Firefox extension build artefact'lari
- Extension packaging kaniti

### Release

- Release smoke
- Release verification
- Platform signing verification

### Supply-chain

- SBOM
- Provenance
- Release manifest zinciri

## Repo Ciktilari

- `ci-artifacts/quality/quality-gate-checklist.json`
- `release/evidence/release-evidence-manifest.json`
- `ci-artifacts/evidence-ownership.json`
- `ci-artifacts/evidence-ownership.md`

## Sonraki Adim

- Android evidence maddelerini de ayni sahiplik modeline eklemek
- Eksik sahiplik bosluklari icin backlog olusturmak

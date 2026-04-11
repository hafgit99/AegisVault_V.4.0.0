# Aegis 4.1 - Quality Gate Checklist

Tarih: 23 Mart 2026

## Quality Gate

Bir quality gate gecisi icin asagidaki maddeler beklenir:

1. `npm run lint` basarili olmali
2. `npm run test:unit:ci` raporu uretilmis olmali
3. `npm run test:import-export-regression` raporu uretilmis olmali
4. `npm run test:security-regression` raporu uretilmis olmali
5. Extension build artefact'lari uretilmis olmali
6. Native host manifest artefact'lari uretilmis olmali
7. `npm run ci:report` quality summary uretmis olmali
8. `npm run ci:enforce:quality` basarili olmali

## Release Gate

Bir release gate gecisi icin quality gate'e ek olarak:

1. `npm run release:validate-signing-env`
2. `npm run release:validate-platform-signing-env`
3. `npm run release:smoke`
4. `npm run release:verify`
5. `npm run release:verify-platform-signing`
6. SBOM ve provenance ciktilari
7. Release evidence manifest'i

## Repo Icindeki Sabit Referanslar

- `ci-artifacts/quality/quality-gate-checklist.template.json`
- `release/evidence/release-evidence-manifest.template.json`
- `ci-artifacts/quality-summary.json`
- `ci-artifacts/quality-gate-quality.json`
- `ci-artifacts/quality-gate-release.json`

## Sonraki Adim

- Checklist'i otomatik uretilen manifestlerle beslemek
- Evidence backlog ile gate maddeleri arasinda birebir izlenebilirlik kurmak

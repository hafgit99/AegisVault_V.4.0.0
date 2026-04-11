# Aegis 4.1 - CI Artifact ve Evidence Standarti

Tarih: 23 Mart 2026

## Amac

Faz 2 kalite kapisi ve audit evidence ciktilari icin repo icinde tek ve tekrar edilebilir bir klasor standardi tanimlamak.

## Standart Klasorler

- `ci-artifacts/`
- `ci-artifacts/quality/`
- `ci-artifacts/release/`
- `test-results/`
- `vitest-results/`
- `playwright-report/`
- `release/evidence/`
- `release/evidence/quality/`
- `release/evidence/release/`

## Kullanim

- Yerelde veya CI icinde `npm run ci:prepare:artifacts` calistirilir.
- Kalite raporlari `test-results/`, `vitest-results/` ve `ci-artifacts/` altina yazilir.
- Release trust-chain ve signing evidence dosyalari `release/evidence/` altinda tutulur.

## Faz 2 Ile Iliskisi

Bu standart, kalite kapisinin belge seviyesinden cikarak repo kurali haline gelmesini saglar.

## Sonraki Adim

- Evidence backlog dosyasini olusturmak
- Quality gate checklist'ini bu klasor yapisina baglamak

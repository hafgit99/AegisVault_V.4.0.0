# Aegis 4.1 - CI Evidence Backlog

Tarih: 23 Mart 2026

## Amac

Faz 2 kalite kapisi ve audit-ready sureci icin hangi evidence dosyalarinin zorunlu oldugunu ve hangi alanlarin henuz eksik oldugunu takip etmek.

## Kalite Evidence Backlog

### Hazir veya temeli olanlar

- Unit test JSON raporu
- Import/export regression JSON raporu
- Security regression JSON raporu
- Playwright sonucu
- Extension build artefact'lari
- Native host manifest artefact'lari
- Quality summary JSON ve Markdown ciktilari
- Quality gate sonuc dosyalari

### Kismen hazir, olgunlastirilacaklar

- E2E failure triage standardi
- Platform bazli smoke kaniti
- Build matrix kaniti
- Signed release environment validation kayitlari

### Henuz eksik veya resmilesmemisler

- Android device matrix kaniti
- Browser matrix kaniti
- Manual exploratory regression kaydi
- Audit packet icin residual risk ozeti
- Supply-chain evidence toplama rehberi

## Sahiplik Onerisı

- Desktop core: unit, native host, smoke
- Data/import-export: migration ve regression evidence
- Security: security regression, threat boundary evidence
- QA: e2e, matrix, manual regression
- Release: signing, provenance, sbom, verification

## Sonraki Adim

1. Quality gate checklist'ini backlog maddeleriyle eslemek
2. Eksik evidence'lar icin sahiplik atamak
3. Faz 3 Android matrix kanitlarini bu backlog'a baglamak

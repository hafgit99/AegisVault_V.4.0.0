# Aegis 4.1 - Android Production Candidate Checklist v2

Tarih: 23 Mart 2026

## Amac

Android uygulamasini "controlled beta hazir" seviyesinden "production candidate" seviyesine tasimak icin Faz 3 kalite kapisini netlestirmek.

## Checklist Basliklari

- controlled beta readiness kaynagi mevcut mu
- minimum device matrix tamamlandi mi
- autofill browser davranisi dogrulandi mi
- autofill native app davranisi dogrulandi mi
- passkey + biyometri + recovery kombinasyonlari gercek cihazda denendi mi
- UI encoding polish borclari temizlendi mi
- ceviri/metin polish borclari temizlendi mi
- staged rollout plani hazir mi
- staged rollout monitoring notlari hazir mi

## Mevcut Durum

- Controlled beta readiness kaynagi mevcut.
- Minimum device matrix hedefi tamamlandi.
- Browser autofill tarafinda minimum hedefe yaklasildi; native app autofill icin takip devam ediyor.
- Browser ve native app autofill tarafinda minimum hedef tamamlandi.
- Passkey/biyometri/recovery kombinasyonlari device matrix completed kayitlariyla daha guclu hale geldi.
- UI encoding/polish maddesi kanit dosyasina baglandi.
- Ceviri/metin polish maddesi ayri takip kalemi olarak kanit dosyasina baglandi.
- Staged rollout plani kaynaktan destekleniyor; monitoring maddesi de kanit dosyasina baglandi.

## Coverage Kuralı

Faz 3 icin minimum device matrix hedefi su uc cihaz sinifinin `completed` olmasiyla saglanir:

- amiral gemisi / Pixel referans
- orta segment / Samsung referans
- dusuk RAM / Xiaomi referans

Bu esik gecildiginde:

- `device_matrix.coverageStatus = minimum_target_met`
- production candidate checklist icinde `device_matrix_completed = passed`

## Canli Artefact

- `ci-artifacts/android/release-readiness/production-candidate-checklist.template.json`
- `ci-artifacts/android/release-readiness/production-candidate-checklist.json`

## Sonraki Adim

1. Faz 3 checklist kapanis durumunu ana yol haritasina islemek
2. Faz 4 passkey programina gecmek

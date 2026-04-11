# Aegis Schema Migration Policy

Tarih: 23 Mart 2026
Durum: Faz 1 resmi migration policy
Versiyon: 2026-03-23.v1

## 1. Temel Ilke

Platformlar arasi migration envelope seviyesinde degil, payload seviyesinde yapilir.

Kural:

1. once kaynak format cozulur
2. kaynak payload canonical modele normalize edilir
3. hedef platform envelope'unu kendi guvenlik modeliyle yeniden uretir

## 2. Yon Kurallari

### Desktop Legacy -> Canonical

- kaynak: `legacy-array`
- hedef: `canonical-export-v1`
- arac: `CanonicalMigrationService`

Durum: destekleniyor

### Canonical -> Desktop Restore

- kaynak: `canonical-export-v1`
- hedef: `VaultEntry[]`
- arac: canonical reverse adapter + restore helper

Durum: destekleniyor

### Android Payload -> Canonical

- kaynak: Android `items/sharedSpaces`
- hedef: canonical records + canonical shared spaces
- envelope: Android tarafi kendi kripto metadata'sini korur

Durum: belge seviyesinde net, tam adapter kapsami sonraki fazlarda genisleyecek

## 3. Alan Donusum Kurallari

- `website` / `url` -> canonical `url`
- `pass` / `password` -> `secret.password`
- `notes` -> `secret.notes`
- TOTP alanlari -> `secret.totp.*`
- passkey metadata -> canonical `passkey`
- sharing assignment -> canonical `sharing`

## 4. Versiyon Politikasi

Asagidaki alanlar merkezi registry tarafindan takip edilir:

- `appVersion`
- `backup.format`
- `qrSync.format`
- `canonical.exportKind`
- `canonical.schemaVersion`
- `canonical.compatibilityChecklistVersion`
- `canonical.migrationPolicyVersion`

Kural:

- schema degisirse `canonical.schemaVersion`
- migration kurali degisirse `migrationPolicyVersion`
- sadece rapor/checklist degisirse `compatibilityChecklistVersion`

## 5. Geriye Donuk Uyumluluk Kurali

- legacy desktop backup destegi korunur
- canonical backup yeni varsayilan migration omurgasidir
- compatibility alias alanlari (`website`, `pass`, `notes`) adapter katmaninda tutulabilir
- canonical storage alanlari legacy UI alanlarina zorla geri yazdirilmaz; yalnizca adapter seviyesi korunur

## 6. Veri Kaybi Kirmizi Cizgileri

Asagidaki alanlar canonical migration sirasinda kaybolamaz:

- password
- title
- username
- url
- TOTP secret ve metadata
- passkey metadata
- shared assignment metadata
- deleted / created / updated timestamp alanlari

Bir alan birebir tasinamiyorsa:

1. `custom_data` altina compatibility metadata olarak alinmali
2. migration report icinde not dusulmeli

## 7. Faz 1 Sonu Karari

Bu policy ile Faz 1 sonunda migration mantigi artik yazili, izlenebilir ve merkezi registry ile uyumlu hale gelmistir.

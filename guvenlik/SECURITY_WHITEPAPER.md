# Aegis Vault Security Whitepaper

Version: 1.0 (Draft)
Date: 2026-03-12
Status: Public Technical Whitepaper (Pre-Audit)

## 1) Executive Summary

Aegis Vault, offline-first ve local-zero-knowledge prensibiyle tasarlanmis bir sifre yonetimi platformudur.
Urun; web app (PWA), desktop runtime (Electron) ve browser extension bilesenlerinden olusan hibrit bir mimari kullanir.

Bu whitepaper'in amaci:

- Guvenlik mimarisini teknik ve denetlenebilir sekilde belgelemek
- Tehdit modelini acikca tanimlamak
- Uygulanan kontrolleri ve kalan riskleri netlestirmek
- Harici audit surecine giris icin teknik zemin olusturmak

Bu dokuman "pre-audit" asamasindadir. Harici audit tamamlandiginda bulgular ve remediation notlari yeni surumde yayinlanacaktir.

## 2) Tasarim Prensipleri

### 2.1 Offline-First

Vault verisi varsayilan olarak kullanicinin cihazinda kalir. Cloud bagimliligi zorunlu degildir.

### 2.2 Zero-Knowledge Yerel Model

Sifreli veri cozumleme anahtari kullanicinin cihazinda turetilir. Uygulama disi hizmetlere plaintext vault aktarimi tasarim hedefi degildir.

### 2.3 Defense-in-Depth

Tek bir kontrol yerine cok katmanli guvenlik uygulanir:

- KDF + simetrik sifreleme
- Oturum kilitleme ve bellek temizligi
- Bridge kimlik dogrulama sertlestirmeleri
- Metadata sifreleme + private search index
- Policy tabanli veri akis kisitlari (domain-scoped, profile-scoped)

### 2.4 Principle of Least Data

Ozellikle extension ve bridge tarafinda sadece gerekli minimum veri tasinmasi hedeflenir.

## 3) Sistem Mimarisi

### 3.1 Bilesenler

- PWA UI + Vault Service (`src/vaultService.ts`)
- Electron Main + preload + loopback sync server (`electron-main.cjs`)
- Browser Extension background/content/popup (`aegis-wxt/src/entrypoints/*`)
- Local storage katmanlari: IndexedDB + SQLite/OPFS

### 3.2 Guven Sinirlari

1. Kullanici UI alani
2. Vault sifreleme/sifre cozme alani
3. Extension bridge alani
4. Desktop loopback bridge alani
5. Diskte at-rest depolama alani

Her sinir bir saldiri yuzeyi olarak ele alinmistir ve ayrik kontrollerle sertlestirilmistir.

## 4) Tehdit Modeli (Ozet)

### 4.1 Korunan Varliklar

- Master credential dogrulama verisi
- Vault entry plaintext alanlari (pass, notes, totp)
- Metadata (title, username, website, category, tags, attachment meta)
- Passkey baglama verisi

### 4.2 Varsayilan Tehdit Aktorleri

- Cihaza erisen dusuk yetkili lokal prosesler
- Kotu amacli browser extension/sekme icerigi
- Yanlis origin/yanlis kimlik ile bridge erisim denemeleri
- Storage dump alan saldirgan (at-rest okuma)

### 4.3 Out-of-Scope (Bu Surum)

- Root/kernel-level tam sistem kompromizasyonu
- Fiziksel donanim saldirilari (cold-boot, DMA vb.)
- Kullanici tarafinda guvensiz endpoint davranislari (keylogger vb.)

## 5) Kriptografi Mimarisi

### 5.1 Anahtar Turetme

- Vault key derivation: Argon2id
- Auth verifier modeli: `argon2id-v1` (legacy PBKDF2 -> otomatik migration)

### 5.2 Veri Sifreleme

- Simetrik sifreleme: AES-GCM
- TOTP secret, secure notes ve attachment payload sifreli saklanir

### 5.3 Metadata Sifreleme

At-rest metadata plaintext yuzeyi azaltilmistir.
Sifrelenen alanlar:

- title
- username
- website
- category
- tags
- attachment metadata (name/type)

### 5.4 Private Search Index

Arama performansi icin plaintext index yerine HMAC tabanli blind `search_index` modeli uygulanir.

- Tokenlar normalize edilir
- Token hashleri HMAC ile uretilir
- Sorgu sirasi hash karsilastirma ile filtreleme yapilir

Bu model, metadata arama ihtiyacini korurken at-rest plaintext sizintisini azaltir.

## 6) Kimlik Dogrulama ve Oturum Guvenligi

### 6.1 Auth Credential Migration

Legacy PBKDF2 dogrulama kayitlari acilis sirasinda Argon2id modeline tasinir.

### 6.2 Passkey / PRF

Passkey akisi profile-scoped olacak sekilde sertlestirilmistir:

- Profil bazli binding store (`aegis_passkey_bindings_v1`)
- Profile/db context dogrulamasi
- Recovery export/import paketi (sifreli)
- Revocation (profil bazli)
- Rotation uyari modeli (yas bazli)

## 7) Bridge ve Extension Guvenligi

### 7.1 PWA <-> Extension

- Challenge-response + HMAC imzali istek kontrati
- Nonce/TTL kontrolleri
- Session token bagli dogrulama

### 7.2 Extension <-> Electron Loopback

- Challenge endpoint (`/api/challenge`)
- HMAC-SHA256 imzali istek dogrulama
- Extension ID allowlist
- Replay korumasi (tek kullanim nonce + TTL)

### 7.3 Veri Akis Kisitlari

- Domain-scoped credential modeli
- Legacy full-vault endpoint devre disi varsayimi
- Domain disi fallback credential gosterimi kaldirildi

## 8) TOTP Guvenlik Profili

TOTP saklama stratejisi policy tabanlidir:

- `same_vault`
- `separate_2fa_vault`

Ayrik mod aktifken ana kasada TOTP yazimi engellenir. Kullanici migration uyari ve yonlendirme aksiyonlari ile 2FA profiline gecirilir.

## 9) Privacy ve Watchtower/HIBP

- HIBP taramasi opt-in modele alinmistir
- Network/API sorunlarinda sonuc "unknown" olarak islenir (false-safe varsayimi yerine)
- Kullaniciya durum bildirimi UI seviyesinde verilir

## 10) Storage Hijyeni ve Wipe

- localStorage audit/cleanup aksiyonu mevcuttur
- Deep wipe akisi passkey/totp policy artefactlarini da temizler

## 11) Test Stratejisi

Uygulanan guvenlik degisiklikleri test regresyonlariyla desteklenir:

- Extension security unit testleri
- Vault cryptography/regression testleri
- Metadata encryption + lazy migration testleri
- Auth credential migration testleri
- Search index benchmark suiti (`npm run bench:search-index`)

## 12) Bilinen Riskler ve Limitler

Bu surumde halen acik gelisim alanlari:

- TOTP migration wizard (tam otomasyon) heniz tamamlanmadi
- Formal threat model dokumani (diagram + trust boundary matrix) ayri artefact olarak finalize edilmedi
- Harici audit raporu henuz yok
- Disclosure policy taslagi ayrica yayinlanacak

## 13) Responsible Disclosure (Taslak)

Guvenlik acigi bildirimleri icin koordineli aciklama prensibi benimsenir:

- Ilk temas: private kanal
- Triaging + yeniden uretim dogrulamasi
- Severity siniflandirmasi
- Duzeltme + yayin plani
- Gerektiginde CVE/credit notu

Detayli politika bu whitepaper'a bagli ayri bir `SECURITY_DISCLOSURE.md` dokumani olarak yayinlanacaktir.

## 14) Harici Audit Hazirlik Kapsami

Audit kapsaminda hedeflenen alanlar:

- Kriptografi implementasyonu
- Bridge/extension saldiri yuzeyi
- Storage ve migration guvenligi
- Electron security posture
- Secret handling ve memory lifecycle

Audit oncesi checklist:

- Scope freeze
- Reproducible test matrix
- Security test evidence bundle
- Known-issue register

## 15) Sonuc

Aegis Vault, offline-first ve local-zero-knowledge hedefini modern bir guvenlik mimarisiyle birlestirmeyi amaclar.
Bu whitepaper; mevcut kontrolleri, kalan riskleri ve audit yol haritasini teknik olarak belgeleyen temel referans dokumandir.

Bir sonraki surumde bu dokuman;

- harici audit bulgulari,
- remediation metrikleri,
- ve formal threat model ekleri

ile guncellenecektir.

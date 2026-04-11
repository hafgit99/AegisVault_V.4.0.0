# Aegis 4.1 - Site Passkey MVP Karar Dokumani

Tarih: 23 Mart 2026

## Amac

Passkey tarafini sadece kasa acma ozelligi olmaktan cikarip, 4.1 icin sinirli ama net bir `site passkey MVP` kapsamina baglamak.

## 4.1 Kapsami

4.1 icinde site passkey tarafinda minimum hedef:

- site passkey kayitlarini veri modelinde ayirt etmek
- inventory tarafinda vault unlock passkey ile site passkey ayrimini gorunur yapmak
- metadata seviyesinde `rp_id`, `credential_id`, `display_name`, `mode`, `created_at`, `last_auth_at` alanlarini standartlastirmak
- UI ve export/import tarafinda site passkey kayitlarinin kaybolmadan tasinmasini garanti etmek

## 4.1 Disinda Birakilanlar

- tam relying party backend entegrasyonu
- web sitesine dogrudan passkey kaydetme/kullanma runtime'i
- passkey senkronizasyonu
- cross-device site passkey imzalama akislari

## Karar

4.1 icin site passkey `metadata-first MVP` olarak ele alinacak.

Bu karar su anlama gelir:

- Aegis 4.1 site passkey runtime'ini tam bitirmeye calismayacak
- bunun yerine veri modeli, inventory, migration ve urun sinirlari netlestirilecek
- Faz 4 sonunda 4.2 veya 5.0 icin runtime genisletmeye uygun temiz zemin olusacak

## Gerekli Veri Alanlari

- `rp_id`
- `credential_id`
- `display_name`
- `user_handle`
- `authenticator_attachment`
- `transport`
- `algorithm`
- `mode`
- `server_verified`
- `created_at`
- `last_registration_at`
- `last_auth_at`

## Mode Kurali

`mode` alani su degerleri kullanir:

- `vault_unlock`
- `site_passkey_mvp`
- `site_passkey_future_rp`

## Basari Kriteri

4.1 sonunda ekip su sorulara net cevap verebilmelidir:

- hangi passkey kaydi kasa acma icin
- hangi passkey kaydi site passkey metadata kaydi
- hangisi 4.1 MVP kapsami icinde
- hangisi ileri runtime kapsamina ertelendi

## Sonraki Adim

1. Bu karari kod icinde tek bir passkey program tanimina baglamak
2. Inventory tarafinda `vault_unlock` ve `site_passkey_mvp` ayrimini gostermek
3. Canonical schema `mode` yorumunu bu belgeyle hizalamak

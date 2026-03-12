# Aegis Vault Threat Model

Version: 1.0 (Draft)
Date: 2026-03-12
Status: Pre-Audit

## 1) Scope

Bu dokuman Aegis Vault'un su bilesenleri icin tehdit modelini tanimlar:

- PWA UI + Vault Service
- Electron runtime ve loopback bridge
- Browser extension (background/content/popup)
- Local depolama (IndexedDB / SQLite-OPFS)

## 2) Security Objectives

- Vault plaintextin yetkisiz ifsasini onlemek
- Kimlik dogrulama bypass riskini azaltmak
- Bridge ve extension saldiri yuzeyini daraltmak
- At-rest metadata sizintisini minimize etmek
- Replay, downgrade ve yanlis-baglamsal erisimleri engellemek

## 3) Assets

Kritik varliklar:

- Master credential verifier
- Derived key material
- Vault entry plaintext (`pass`, `notes`, `totpSecret`)
- Encrypted metadata bloblari
- Search blind index
- Passkey binding ve recovery artefactlari

## 4) Trust Boundaries

TB1: Kullanici girisi / UI boundary
TB2: Vault cryptography boundary
TB3: PWA <-> Extension bridge boundary
TB4: Extension <-> Electron loopback boundary
TB5: At-rest storage boundary

Her boundary crossing bir policy + dogrulama + minimum-data kontrati ile korunur.

## 5) Threat Actors

- TA1: Local dusuk-yetkili proses
- TA2: Kotu niyetli tarayici extension/sekme scripti
- TA3: Yanlis origin/yanlis extension id ile bridge erisim denemesi
- TA4: Disk/storage dump alan saldirgan
- TA5: Kullanici hatasi (yanlis profile yazim, secretsin yanlis yerde saklanmasi)

## 6) Attack Scenarios and Controls

### S1: Loopback endpoint abuse

Risk:
- Yetkisiz prosesin loopback API'den veri cekmesi

Kontroller:
- Challenge endpoint + HMAC imza
- Nonce/TTL replay korumasi
- Extension ID allowlist
- Domain-scoped / minimal response modeli

Residual risk:
- Host kompromizasyonu durumunda process-level saldirilar tamamen dislanamaz

### S2: Full-vault plaintext yayilimi

Risk:
- Extension/popup katmanlarina gereksiz toplu plaintext akisi

Kontroller:
- GET_DOMAIN_CREDS kontrati
- Legacy full-vault davranisinin devre disi kalmasi
- Fallback listelemenin kaldirilmasi

Residual risk:
- Aktif domain icin gereken minimum credential hala runtime memoryde kisa sure bulunur

### S3: Metadata disclosure at-rest

Risk:
- Sifre cozulmese bile site/username/tags ifsasi

Kontroller:
- Metadata encryption (title/username/website/category/tags)
- Attachment metadata encryption (name/type)
- Blind search index

Residual risk:
- Trafik ve davranis metadatasi (timing/frequency) tamamen ortadan kaldirilamaz

### S4: Auth verifier brute-force economics

Risk:
- Legacy PBKDF2 verifierin zayif maliyet profili

Kontroller:
- `argon2id-v1` verifier modeli
- Legacy PBKDF2 -> Argon2id auto-migration

Residual risk:
- Zayif master password secimi kullanici kaynakli risktir

### S5: Yanlis profile TOTP yazimi

Risk:
- 2FA secretin ana vaulta yanlislikla kaydedilmesi

Kontroller:
- TOTP vault mode policy (`same_vault` / `separate_2fa_vault`)
- Separate mode'da policy enforcement (yazim blokaj)
- Migration warning + switch action

Residual risk:
- Manuel migration tamamlanmadan iki profile daginik veri kalabilir

## 7) Assumptions

- Cihaz kernel/root seviyesinde tamamen kompromize degil
- Browser platformu temel WebAuthn ve crypto primitive'lerini dogru uygular
- Kullanici master credential ve recovery password seciminde makul guclu degerler kullanir

## 8) Out of Scope

- Rootkit / kernel implant
- Donanim saldirilari (DMA/cold-boot)
- Fiziksel side-channel ve EM analiz

## 9) Risk Register (Current)

- R1: Formal third-party audit yok (Severity: Medium, Likelihood: Medium)
- R2: Threat model artefactlarinin surumlenmis operasyon prosedurleri eksik (M/M)
- R3: TOTP toplu migration wizard henuz tam otomatik degil (Low/Medium)

## 10) Mitigation Roadmap

Kisa vade:
- Disclosure policy finalize
- Audit scope freeze
- Threat model review cadence (quarterly)

Orta vade:
- External audit execution
- Public remediation matrix
- Security SLA ve incident playbook

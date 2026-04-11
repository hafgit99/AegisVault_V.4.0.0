# Aegis Vault Güvenlik Yol Haritası

## Amaç

Bu belge, Aegis Vault'un güvenlik seviyesini hobi/prototip seviyesinden denetlenebilir, profesyonel ve rekabetçi bir ürün seviyesine taşımak için hazırlanmıştır. Yol haritasi P0, P1 ve P2 önceliklerine göre düzenlenmiştir.

## Uygulanan Güncellemeler (2026-03-12)

Bu yol haritasındaki P0 maddelerine paralel olarak kod tabanında aşağıdaki iyileştirmeler uygulanmıştır:

- `P0-2` kapsamında extension tarafında domain dışı fallback credential gösterimi kaldırıldı.
- Content script artık toplu `GET_VAULT` yerine yalnızca aktif domain için `GET_DOMAIN_CREDS` çağrısı yapıyor.
- Background message handler tarafında `GET_DOMAIN_CREDS` eklendi ve istek domain'i ile `sender.tab.url` domain'i eşleştirilerek doğrulama yapılıyor.
- `SAVE_VAULT` akışında extension cache'e alınan kayıtlar sanitize ediliyor; website/parola içermeyen kayıtlar cache'e alınmıyor.
- PWA tarafında extension/electron senkronizasyonundan periyodik 30 saniye plaintext yeniden yayın kaldırıldı; senkronizasyon yalnızca veri değişiminde tetikleniyor.
- `P0-1` kapsamında domain-scoped credential taleplerine nonce zorunluluğu eklendi (istek tekrar kullanımına karşı).
- Domain-scoped taleplere kısa aralık rate-limit eklendi (tab+domain anahtarı ile).
- Legacy `GET_VAULT` endpointi varsayılan olarak devre dışı bırakıldı (surface reduction).
- Extension popup akışı da domain-scoped veri modeline geçirildi; toplu kasa çekimi kaldırıldı.
- Popup ve content overlay metinleri TR/EN locale'e göre iki dilli hale getirildi.
- Electron loopback sync kanalına tek-kullanimlik challenge endpointi (`/api/challenge`) eklendi.
- Extension -> Electron isteklerinde HMAC-SHA256 imzali challenge dogrulama zorunlu hale getirildi.
- Challenge yapisi extension-id bagimli, TTL sinirli ve replay-safe (nonce tek kullanim).
- `X-Aegis-Extension-Id` allowlist kontrolu ile desktop bridge tarafinda ek kimlik dogrulamasi aktif edildi.
- Extension kimligi sabit hardcode modelinden cikarildi; extension tarafinda runtime-id/env tabanli kimlik kullanimi eklendi.
- Electron allowlist artik `AEGIS_EXTENSION_ALLOWLIST`/`AEGIS_EXTENSION_ID` env degiskenlerinden okunabiliyor.
- Vault metadata encryption iskeleti eklendi (title/username/website alanlari icin encrypted\__ + _\_iv).
- Eski kayitlar icin lazy migration akisi eklendi: ilk okuma sirasinda metadata sifreli formata tasiniyor.
- Metadata arama icin ilk private search index (HMAC tabanli blind index) katmani eklendi.
- `search_index` alanlari ile sorgu tokenlari hash karsilastirma ile filtreleniyor (plaintext metadata dizini tutulmuyor).
- Metadata encryption kapsami genisletildi: `category` ve `tags` alanlari da at-rest sifreli moda alindi.
- Attachment metadata (dosya adi ve mime type) sifreli saklanacak sekilde guncellendi.
- `vaultService` test setine metadata encryption + private index + lazy migration regression testleri eklendi.
- PWA extension bridge kanalinda challenge-response + HMAC imzali istek dogrulamasi eklendi (`REQUEST_CHALLENGE`/`CHALLENGE_RESPONSE`).
- Auth dogrulama katmaninda Argon2id tabanli credential modeli aktif edildi (`scheme: argon2id-v1`).
- Legacy PBKDF2 credential acilis sirasinda otomatik Argon2id credential'a migrate ediliyor.
- Search index performansi icin ayri benchmark suiti eklendi (`npm run bench:search-index`).
- Passkey akisina profile-bound payload kontrolu eklendi (dbName/profileId baglamasi).
- Passkey metadata kaydi eklendi (`createdAt/lastUsedAt/version`) ve 90 gun rotasyon uyarisi aktif edildi.
- Passkey revoke (yerel cihazdan kayit temizleme) akisi eklendi.
- Wipe akisinda `aegis_passkey_meta` dahil tum passkey artefact'lari temizleniyor.
- Passkey binding depolamasi profil-bazli kayit modeline tasindi (`aegis_passkey_bindings_v1`).
- Passkey recovery paketi export/import akisi eklendi (sifreli `.aes` paket, profil/db uyumluluk kontrolu).
- Watchtower HIBP taramasi privacy-toggle ile opt-in hale getirildi.
- HIBP ag hatalarinda sonuc `unknown` durumuna cekiliyor (safe varsayimi yerine belirsizlik bildirimi).
- localStorage audit/cleanup aksiyonu ayarlara eklendi (stale Aegis anahtarlari temizlenebilir).
- TOTP icin "separate 2FA vault" profil modu eklendi (same-vault / separate-vault secimi).
- Ayrik mod aktifken ana kasada TOTP kaydi engelleniyor, veri akisi 2FA profiline yonlendiriliyor.
- Ayrik moda geciste migration uyarilari ve 2FA kasa profiline hizli gecis butonu eklendi.

Kalan kritik adımlar:

- ✅ Native messaging veya HMAC tabanlı challenge-response ile köprü kimlik doğrulamasını bir üst seviyeye taşımak.
- ✅ Metadata encryption (title/website/username/tags) için şema geçişini başlatmak.
- ✅ Auth verifier katmanını Argon2id'ye taşımak.

## Uygulama Durumları (Checklist)

### Tamamlananlar

- ✅ P0-1 Bridge hardening (challenge endpoint + HMAC + nonce/TTL + allowlist + env tabanlı extension kimliği)
- ✅ P0-2 Full vault plaintext fallback kaldırma (domain-scoped minimal credential modeli)
- ✅ P0-3 Metadata encryption (title/username/website/category/tags + attachment metadata)
- ✅ P0-3 Private search index (HMAC blind index + lazy migration)
- ✅ P1-1 Auth verifier Argon2id migration (`argon2id-v1`, legacy PBKDF2 auto-migration)
- ✅ Security regression genişletmeleri (`vaultService` ve extension security testleri)
- ✅ Search index benchmark suiti (`npm run bench:search-index`)

### Devam Eden / Sonraki Adımlar

- ✅ P1-2 Passkey / PRF modeli: recovery/export-import + profil-bazli revocation uygulandi
- ✅ P1-4 HIBP privacy modu: opt-in + unknown fallback + kullanici bildirimi uygulandi
- ✅ P1-5 TOTP ayrışma modu: ayrı 2FA vault profil modu + migration uyarı akışı uygulandı
- ✅ P0-4 / P2 dokümantasyon: whitepaper + threat model + disclosure + audit prep checklist hazirlandi

### Dokuman Ciktilari

- ✅ Security Whitepaper: `guvenlik/SECURITY_WHITEPAPER.md`
- ✅ Security Whitepaper (EN): `guvenlik/SECURITY_WHITEPAPER_EN.md`
- ✅ Threat Model: `guvenlik/THREAT_MODEL.md`
- ✅ Threat Model (EN): `guvenlik/THREAT_MODEL_EN.md`
- ✅ Security Disclosure Policy: `guvenlik/SECURITY_DISCLOSURE.md`
- ✅ Security Disclosure Policy (EN): `guvenlik/SECURITY_DISCLOSURE_EN.md`
- ✅ External Audit Prep: `guvenlik/EXTERNAL_AUDIT_PREP.md`

## Sıradaki Adımlar (Hazır Plan)

1. Passkey recovery/revocation akışını ekle ve security regression testlerini genişlet.
2. HIBP privacy davranışını ürün ayarlarına taşı (opt-in + unknown state + açıklama metni).
3. TOTP için "aynı vault" / "ayrı 2FA vault" güvenlik profilini devreye al.
4. Threat model + whitepaper dokümanlarını oluştur, audit hazırlık checklistini bağla.

---

## Mevcut Durum Özeti

Aegis Vault halihazırda şu güçlü temellere sahiptir:

- Argon2id tabanlı anahtar türetme
- AES-GCM ile parola/şifreli not/TOTP/ek dosya şifreleme
- Electron hardening (`nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`)
- Duress PIN ve silent wipe gibi ileri seviye özellikler
- Offline-first QR sync yaklaşımı
- Browser extension ile JIT content script injection

Ancak şu alanlar kritik gelişim gerektirir:

- Metadata plaintext saklanıyor
- Extension/desktop bridge fazla geniş attack surface oluşturuyor
- Vault plaintext verisi unlock sonrası başka süreçlere taşınıyor
- Harici audit ve formal threat model eksik
- Kimlik doğrulama yan katmanında PBKDF2 hâlen kullanılıyor

---

# P0 - Kritik Güvenlik İyileştirmeleri

## P0-1: Extension/Desktop Bridge Yeniden Tasarimi

### Problem

Mevcut localhost / loopback bridge modeli, `X-Aegis-Client` gibi header tabanlı doğrulama ile çalışıyor. Bu model internetten değil ama lokal kötü amaçlı süreçler, malware veya browser-istismar zincirleri karşısında gerektiğinden fazla risk taşıyor.

### Hedef

Vault verisini extension ve desktop arasında taşırken sadece güvenilir istemcilerin, sadece aktif oturum boyunca ve sadece doğrulanmış talepler üzerinden erişim sağlaması.

### Önerilen çözüm

1. HTTP loopback yerine tercihen **native messaging** kullan
2. Eğer loopback korunacaksa:
   - per-session random secret
   - challenge-response handshake
   - request body HMAC imzası
   - replay-protected nonce
   - strict expiry
   - rate limiting
   - exact extension binding
3. `/api/vault` gibi toplu plaintext endpointleri kaldır
4. Domain-bazlı, kullanıcı aksiyonlu, minimum veri yanıt modeli kur

### Başarı Kriterleri

- Unknown local process vault endpointine erişemez
- Eski/replayed request kabul edilmez
- Extension kimliği + oturum sırrı olmadan veri alınmaz
- Plaintext full-vault endpoint kalmaz

### Puan etkisi

Güvenlik puanına en büyük olumlu etkiyi bu değişiklik yapar.

---

## P0-2: Full Vault Plaintext Sync Modelini Kaldırma

### Problem

Vault unlock olduktan sonra plaintext veriler extension/electron tarafına toplu aktarılıyor. Bu, ana şifreleme modelini zayıflatıyor.

### Hedef

"Decrypt only what is needed, only when needed."

### Önerilen çözüm

- Tüm kasayı senkronize etme
- Sadece aktif domain ile eşleşen girişleri gönder
- Sadece kullanıcı autofill istediğinde decryption yap
- Kısa ömürlü memory token kullan
- Fill sonrası bellekte veri tutma süresini asgariye indir
- Site bazlı minimum alan modeli:
  - username
  - password
  - gerekiyorsa TOTP
- Secure notes, attachments ve diğer gereksiz alanları extension path'ine hiç sokma

### Başarı Kriterleri

- Full vault plaintext cache ortadan kalkar
- Extension sadece seçili siteye ait kayıtları geçici alır
- Fill sonrası cache hemen temizlenir

---

## P0-3: Metadata Encryption

### Problem

Parolalar şifreli, ama metadata alanları plaintext:

- title
- username
- website
- category
- tags
- attachment metadata
- vault profile isimleri

### Neden kritik

Bir saldırgan şifreleri çözemese bile:

- hangi bankaları kullandığını
- hangi sitelere üye olduğunu
- kullanıcı adlarını
- ilgi alanlarını
- hassas kategori etiketlerini
  görür.

### Hedef

Vault içerisindeki tüm hassas anlamsal bilginin şifrelenmesi.

### Önerilen çözüm

#### Aşama 1

Aşağıdaki alanları şifrele:

- title
- username
- website
- tags
- notes metadata
- attachment file name/type

#### Aşama 2

Arama için private index modeli ekle:

- normalized token hash
- blind index
- per-vault keyed hash
- exact/prefix search için kısıtlı private search

#### Aşama 3

İki mod sun:

- Standard Search Mode
- Private Search Mode

### Başarı Kriterleri

- Storage dump alan saldırgan site listesi göremez
- Vault metadata açık olarak okunamaz
- Arama deneyimi kabul edilebilir performansta korunur

---

## P0-4: Formal Threat Model ve Security Whitepaper

### Problem

Kodda iyi niyetli hardening var ama resmi güvenlik modeli dokümante edilmemiş.

### Önerilen çözüm

- Trust boundaries çiz
- Threat actors tanımla
- Attack surface haritası çıkar
- "What we protect / what we do not protect" belgesi yaz
- Kriptografi akışını teknik olarak belgeye bağla

### Başarı Kriterleri

- Yeni contributor'lar mimariyi yanlış genişletmez
- Audit öncesi hazırlık tamamlanır
- Pazarlama dili teknik gerçekle hizalanır

---

# P1 - Yüksek Öncelikli İyileştirmeler

## P1-1: PBKDF2 Doğrulama Katmanını Argon2id'e Taşıma

### Problem

Vault key derivation güçlü ama auth verifier katmanı PBKDF2 tabanlı.

### Önerilen çözüm

- `auth_credential` verifier katmanını da Argon2id'e taşı
- Migration path ekle
- Legacy uyumluluğu kontrollü sürdür

### Beklenen fayda

Teknik tutarlılık artar, brute-force direnci güçlenir.

---

## P1-2: Passkey / PRF Modelini Güçlendirme

### Problem

Passkey akışı iyi ama localStorage bağımlılığı ve operational fallback'ler daha da sertleştirilebilir.

### Önerilen çözüm

- Passkey payload storage modelini gözden geçir
- PRF failure handling daha netleştir
- Device-bound encrypted envelope tasarla
- Recovery ve revocation akışı ekle

---

## P1-3: Security Regression Test Suite

### Eklenmesi gereken testler

- malicious localhost client simulation
- replay request testleri
- wrong-origin/wrong-extension bağlantı testleri
- lock sonrası memory residue regression
- metadata dump inspection tests
- corrupted migration tests
- large attachment edge cases

---

## P1-4: HIBP Privacy Modu İyileştirmesi

### Öneriler

- Varsayılan opt-in
- "network error = unknown" durumu
- Kullanıcıya açık privacy metni
- Scan scheduling ve backoff mantığı

---

## P1-5: TOTP Ayrışma Seçeneği

### Öneriler

- "TOTP aynı kasada" ve "ayrı 2FA vault" seçenekleri
- Kullanıcıyı risk konusunda bilgilendiren açıklama
- High-security profilinde ayrı vault önerisi

---

# P2 - Orta Vadeli Profesyonelleşme

## P2-1: Harici Güvenlik Auditi

- Bağımsız audit firması
- Bulguların remediation takibi
- Public audit summary

## P2-2: Bug Bounty / Responsible Disclosure

- Güvenlik e-posta adresi
- PGP anahtarı
- Scope tanımı
- Severity policy

## P2-3: Secure Telemetry YOK ya da Opt-in

- Varsayılan kapalı
- Sıfır hassas veri
- Açık belge

## P2-4: Supply Chain Hardening

- Lockfile denetimi
- Dependency review
- Reproducible build hedefi
- Signed releases

## P2-5: Release Security Checklist

- Build integrity hash
- CSP review
- Extension permission diff
- Electron config audit
- Migration rollback kontrolü

---

# 90 Günlük Uygulama Sırası

## İlk 30 gün

1. Bridge redesign taslağı
2. Full-vault plaintext sync kaldırma
3. Threat model taslağı
4. Security whitepaper v0.1

## 31-60 gün

1. Metadata encryption prototipi
2. Argon2id verifier migration
3. Security regression tests
4. Passkey akışı sertleştirme

## 61-90 gün

1. Audit hazırlığı
2. Bug bounty / disclosure policy
3. Release hardening checklist
4. Public güvenlik dokümantasyonu

---

# Hedeflenen Sonuç

Bu roadmap tamamlandığında Aegis Vault:

- sadece ilgi çekici bir offline şifre yöneticisi olmayacak,
- aynı zamanda denetlenebilir,
- teknik olarak savunulabilir,
- rakiplerle aynı masaya oturabilecek
  bir güvenlik ürününe dönüşecek.

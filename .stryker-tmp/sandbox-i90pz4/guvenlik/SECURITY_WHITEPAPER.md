# Aegis Vault Security Whitepaper

## 14. 17 Mart 2026 Secure Storage Guncellemesi

Bu whitepaper'in onceki versiyonlarinda "yardimci hassas veriler icin ilave secure storage iyilestirmeleri" acik bir gelisim alani olarak not edilmisti. Son guncelleme ile bu alan buyuk olcude daraltilmistir.

Merkezi ve IndexedDB tabanli secure settings modeli artik su veri siniflarini kapsamaktadir:

- passkey binding, revoke listesi, policy ve event log
- plaintext export policy
- HIBP state ve local cache
- auto-lock ve idle-timeout
- view density
- theme mode
- onboarding/tour state
- encryption profile preference
- TOTP vault policy
- QR sync consumed package ledger
- vault profile listesi ve aktif vault secimi
- sync relay session state ve sequence tracking
- passkey registration/auth ephemeral state

Bu degisiklik, uygulama tarafinda daginik `localStorage` kullanimlarini azaltmis ve istemci tarafli ayar/meta veri depolamasini daha denetlenebilir tek bir modele toplamIstir.

### Guncel yorum

Bu belge acisindan son durum:

- secure storage gecisi: ileri seviyede
- residual risk: azalmis ancak tamamen sifirlanmamis
- kalan fark: yayin guveni, bagimsiz audit ve operasyonel kanit zinciri

Dolayisiyla Aegis Vault'un bugunku sinifi:

- teknik olarak guclu
- mimari olarak olgunlasan
- operasyonel olarak pre-audit

bir guvenlik urunu olarak degerlendirilmelidir.

## 15. Kurumsal Sert Mod Profilleri

Son guncelleme ile Aegis istemci tarafinda merkezi politika profilleri destekler hale gelmistir. Bu profiller:

- `standard`
- `strict`
- `maximum`

olarak tanimlanir ve tekil ayar ogeleri yerine davranis siniflarini zorlar.

Bu katman su alanlarda enforcement uygular:

- plaintext CSV/JSON export izni
- QR sync kullanilabilirligi
- HIBP ag taramasi
- auto-lock ust siniri

Bu degisiklikle guvenlik tercihleri "kullanici isterse acar" modelinden cikmis, "urunun belirli bir guven profiline gore calismasi" modeline yaklasmistir.

### 15.1 Guvenlik faydasi

- riskli plaintext disa aktarma akislarini profille kapatabilme
- QR sync gibi fiziksel transfer yuzeylerini yuksek guven modunda kapatabilme
- HIBP ag baglantisini maksimum gizlilik modunda devre disi birakabilme
- uzun oturumlarin otomatik kilit ile sinirlandirilmasi

### 15.2 Operasyonel fayda

- daha ongorulebilir son kullanici davranisi
- audit oncesi daha net guvenlik profili tanimlama
- ileride cihaz/tenant bazli yonetimli policy bundle tasima zemini

## 17. Release Guven Zinciri

Son guncelleme ile yayin artefact'lari icin hash tabanli minimum dogrulamanin ustune cikilmistir.

Yeni zincir su halkalardan olusur:

- `SHA-256` artifact hash dosyalari
- release SBOM
- release provenance bildirimi
- release manifest
- release trust-chain verification raporu

Manifest imzasi build ortaminda opsiyonel anahtar ile desteklenir. Yani gelistirme ve yerel build ortaminda zincir unsigned calisabilir; uretim CI ortami ise ozel anahtar/certificate ile bu halkayi zorunlu hale getirebilir.

Son guncelleme ile bu zorunluluk GitHub Actions release job'ina da baglanmistir:

- `AEGIS_REQUIRE_SIGNED_RELEASE=1`
- `AEGIS_RELEASE_SIGNING_PRIVATE_KEY`
- `AEGIS_RELEASE_SIGNING_PUBLIC_KEY`

CI ortami bu anahtar cifti olmadan release asamasina gecmez.

### 17.1 Guvenlik faydasi

- yayin dosyalarinin icerik dogrulamasi
- build kaynagi ve artefact iliskisinin kayda alinmasi
- tedarik zinciri (supply-chain) riskine karsi daha profesyonel bir dagitim modeli
- kullaniciya ve denetciye daha acik yayin kaniti

### 17.2 Kalan fark

Tam "signed release" seviyesi icin su adim hala gereklidir:

- ozel signing key veya kod imzalama sertifikasinin CI ortaminda zorunlu kullanimi
- release manifest imzasinin her yayin icin dogrulanmasi
- tercihen harici artifact attestation/provenance entegrasyonu (TAMAMLANDI: GitHub Build Attestation / SLSA Level 2)
- Reproducible Build (TAMAMLANDI: Docker-native deterministic build)

## 16. Paketli Electron Fail-Safe ve Self-Diagnostic Katmani

Son guncelleme ile packaged Electron calisma modeline operasyonel dayanıklilik katmani eklenmistir.

Kapsanan senaryolar:

- renderer `did-fail-load`
- `render-process-gone`
- pencere `unresponsive`
- renderer fatal error / unhandled rejection
- kok DOM mount noktasi bulunamama durumu

Saglanan davranis:

- beyaz ekran yerine cift dilli recovery/diagnostic ekranina dusus
- startup ozeti, son olaylar ve temel kontrollerin gorunur olmasi
- preload uzerinden `reload` ve `quit` aksiyonlari

Bu katman dogrudan kriptografik bir kontrol degildir; ancak yuksek guven beklenen bir parola yoneticisinde operasyonel guvenilirlik ve tani kabiliyeti acisindan onemli bir savunma katmanidir.

## 16. Import/Export Motoru ve Regresyon Seti

Son guncelleme ile veri tasima katmani da sertlestirilmistir.

Import tarafinda:

- dayanikli CSV ayraci ve quoted field isleme
- cok satirli alan destegi
- Bitwarden ve 1Password format tespiti
- JSON `items`, `entries` ve `login` varyantlarini esleme
- atlanan satir, eksik kritik alan, zayif sifre ve olasi yinelenen kayit raporu

eklenmistir.

Export tarafinda:

- CSV kacis kurallari tek bir servis altinda standartlastirilmis
- JSON export semasi tek yerden uretilir hale getirilmis
- UI katmani ham string birlestirme yerine servis tabanli export kullanir hale gelmistir

Regresyon modeli:

- import regression unit testleri
- export escaping unit testleri
- kalite kapisina bagli `test:import-export-regression` komutu
- vendor fixture paketi: Bitwarden CSV/JSON, 1Password CSV, KeePassXC CSV, Proton Pass CSV

Bu alan kriptografik olarak birincil risk sinifi degildir; ancak veri butunlugu, kullanici guveni ve migration emniyeti acisindan yuksek operasyonel oneme sahiptir.

## 17. CI Quality Gate Sertlestirmesi

Son guncelleme ile CI katmani yalnizca test calistiran bir boru hatti olmaktan cikarilmis, rapor ve artifact butunlugunu da zorunlu kilan bir denetim modeline alinmistir.

Yeni guvenceler:

- import/export regresyon seti quality gate'e dahil edildi
- Chrome ve Firefox extension buildleri quality asamasinda uretilir hale geldi
- native host manifest uretimi ve dogrulamasi quality asamasina eklendi
- `ci:report` artik iki dilli quality summary uretir
- `ci:enforce:quality` unit, import/export, security regression, e2e, extension build ve native host artifact varligini zorunlu kilir
- `ci:enforce:release` release smoke ve artifact butunlugunu zorunlu kilir
- workflow concurrency ile stale kosular iptal edilir

Bu katman, audit yerine gecmez; ancak operasyonel guven ve surekli dogrulama disiplinini belirgin sekilde artirir.

## 18. QR Sync Audit ve Revoke Gecmisi

QR sync mekanizmasi artik sadece sifreli paket ve transfer kodundan ibaret degildir. Son guncelleme ile su operasyonel guven katmanlari eklenmistir:

- aktif transfer ledgeri
- transfer olusturma / tuketme / iptal / reddetme olaylari
- receiver session olayi kaydi
- manuel transfer iptali
- iptal edilen sessionId icin import reddi

Bu modelin kazanci:

- kullanici ve denetci hangi transferin ne zaman uretildigini gorebilir
- riskli veya yanlis paylasilmis bir transfer importtan once iptal edilebilir
- "bir kez olusturulduktan sonra sadece sure dolmasi beklenir" modeli yerine yonetilebilir bir transfer yasam dongusu saglanir

Bu alan, QR sync guven modelini sadece kriptografik degil, denetlenebilir ve geri alinabilir hale getirir.

## 19. E2E Encrypted Sync Relay Protokolü (V1)

Aegis 4.2 ile opsiyonel bulut senkronizasyonu "sıfır-bilgi" (zero-knowledge) prensibiyle eklenmiştir.

### 19.1 Anahtar Yönetimi

- **Sync Root Secret**: Kasa anahtarından bağımsız olarak cihaz eşleştirme sırasında oluşturulur.
- **Sub-key Derivation**: HKDF-SHA256 kullanılarak `encryptionKey` (AES-256-GCM) ve `authKey` (HMAC-SHA256) türetilir.

### 19.2 Paket Yapısı (Enveloping)

Her senkronizasyon paketi şu alanları içerir:

- `payload`: Base64url(AES-GCM-Encrypted veriler)
- `iv`: 12-byte rastgele initialization vector
- `hmac`: Tüm paketin (IV + Ciphertext) HMAC-SHA256 imzası
- `sequenceNumber`: Replay ve downgrade saldırılarını önleyen artan sayaç

### 19.3 Sunucu Rolü

Relay sunucusu (Aegis Sync Relay) sadece şifreli paketleri saklar ve taşır. Sunucu:

- Plaintext veriyi göremez (Sıfır-bilgi)
- Veriyi değiştiremez (HMAC doğrulaması istemci tarafında yapılır)
- Eski veriyi enjekte edemez (Sequence number kontrolü)

## 20. WebAuthn (Passkey) Runtime Entegrasyonu

Aegis 4.2, tarayıcı eklentisi üzerinden sitelere "Passkey" (FIDO2/WebAuthn) desteği sağlar.

### 20.1 Güvenlik Kontrolleri

- **Origin Isolation**: WebAuthn API, talebin geldiği sitenin RP-ID'sini (domain) tarayıcı seviyesinde doğrular.
- **Safe Bridge**: Passkey kayıt ve kimlik doğrulama talepleri, Aegis Secure Bridge (Native Host) üzerinden izole bir şekilde Electron ortamına iletilir.
- **Entry Binding**: Üretilen Federal Credential ID, kasa içerisindeki ilgili girdiyle (entry) sıkıca bağlanır; bu sayede bir sitenin passkey'i başka bir site için kullanılamaz.

Version: 1.1
Date: 2026-03-15
Status: Public Technical Whitepaper (Pre-Audit)

## 1. Executive Summary

Aegis Vault, offline-first ve local-zero-knowledge prensibiyle tasarlanmis bir sifre yonetimi platformudur. Urun; PWA, Electron desktop runtime, native host ve browser extension bilesenlerinden olusan hibrit bir mimari kullanir.

Bu whitepaper'in amaci:

- guvenlik mimarisini profesyonel ve denetlenebilir sekilde tanimlamak
- trust boundary'leri acikca gostermek
- desktop-extension-native host veri akislarini belgelemek
- QR sync guven modelini resmilestirmek
- kabul edilen ve kapatilan riskleri ayirmak

## 2. Tasarim Prensipleri

### 2.1 Offline-First

Vault verisi varsayilan olarak kullanicinin cihazinda kalir. Cloud bagimliligi zorunlu degildir.

### 2.2 Local Zero-Knowledge

Anahtar turetme ve plaintext cozumleme cihaz tarafinda yapilir. Plaintext vault'un uzak servislere aktarimi tasarim hedefi degildir.

### 2.3 Defense-in-Depth

Tek bir kontrole bagli kalinmaz:

- Argon2id
- AES-GCM
- metadata encryption
- native host HMAC dogrulamasi
- domain-scoped veri akisi
- pairing governance
- QR transfer sifrelemesi

### 2.4 Least Data / Least Privilege

Ozellikle extension ve desktop bridge tarafinda sadece gerekli minimum veri tasinmasi hedeflenir.

## 3. Resmi Mimari Ozeti

### 3.1 Bilesenler

- PWA UI
- Vault Service / kriptografi mantigi
- Electron main + preload
- Native messaging host
- Browser extension background / popup / content
- IndexedDB / SQLite OPFS
- QR sync export/import akisi

### 3.2 Trust Boundary Diyagrami

```text
[User]
  |
  v
[PWA UI]
  | TB1
  v
[Vault Service / Crypto]
  | TB2
  v
[Encrypted Storage]

[Extension]
  | TB3
  v
[Native Host]
  | TB4
  v
[Electron Main]
  | TB5
  v
[Renderer domain credential provider]
  | TB6 (HTTPS + E2EE)
  v
[Aegis Sync Relay / Cloud]
```

### 3.3 Desktop-Extension-Native Host Veri Akisi

```text
Extension popup/content
  -> background
  -> native messaging
  -> native host
  -> HMAC-authenticated local IPC
  -> Electron main
  -> renderer domain credential request
  -> Electron main
  -> native host
  -> extension background
  -> popup/content
```

Guvenlik kurallari:

- extension, desktop'a tam vault degil baglamsal talep gonderir
- native host ile Electron arasi trafik HMAC proof ile korunur
- Electron main process full plaintext vault cache tutmaz
- pairing iliskisi artik cihaz izi ve kullanim izi ile kayit altina alinir

## 4. Kriptografi Mimarisi

### 4.1 Anahtar Turetme

- master key derivation: Argon2id
- auth verifier modeli: `argon2id-v1`
- legacy PBKDF2 kayitlari acilis sirasinda migrate edilir

### 4.2 Veri Sifreleme

- AES-GCM authenticated encryption
- vault entry plaintext
- notes
- TOTP secret
- attachment payload

### 4.3 Metadata Sifreleme

At-rest plaintext yuzeyi azaltmak icin su alanlar sifrelenir:

- title
- username
- website
- category
- tags
- attachment metadata

### 4.4 Private Search Index

Arama ihtiyaci plaintext index yerine HMAC tabanli blind search index ile desteklenir.

## 5. Kimlik Dogrulama ve Oturum Guvenligi

### 5.1 Master Credential

- kullanici master password ile kasa acar
- verifier plaintext olarak saklanmaz
- migration ile eski dogrulama modeli daha guclu profile cekilir

### 5.2 Passkey / Recovery

- profile-scoped binding store
- recovery export/import paketi
- revoke ve yeniden baglama akislari

## 6. Desktop-Extension Pairing Guven Modeli

Bu alan urunun en kritik modernlesme basligidir.

### 6.1 Onceki Problem

Eski modelde desktop-extension guven bagini daha zayif bir yerel kanal temsil ediyordu. Bu, yerel kotu niyetli surec senaryolarinda yeterince guclu bir guven koku olusturmuyordu.

### 6.2 Bugunku Model

Bugunki modelde:

- native messaging tercihli tasiyici
- local IPC HMAC proof
- per-extension pairing secret
- allowlist
- kullanici onayli pairing
- cihaz parmak izi
- installId
- son kullanim zamani
- son onay zamani
- pairing history
- riskli yeniden eslestirme uyarilari

bulunur.

### 6.3 Pairing Karar Kaydi

Bir pairing kaydi artik sadece secret degildir. Su alanlari da tasir:

- `deviceFingerprint`
- `installId`
- `clientLabel`
- `lastUsedAt`
- `lastApprovedAt`
- `currentRiskFlags`
- `pairingHistory`

Bu, pairing modelini “teknik gizli anahtar” seviyesinden “yonetilebilir guven iliskisi” seviyesine tasir.

## 7. QR Sync Guven Modeli

### 7.1 Hedef

Cihazlar arasi offline veri tasimayi plaintext JSON yerine kontrollu ve sifreli hale getirmek.

### 7.2 Veri Akisi

```text
Selected entries
  -> QRSyncService.createPackage
  -> encrypted QR package
  -> scan on target device
  -> QRSyncService.parsePackage
  -> import to vault
```

### 7.3 Uygulanan Kontroller

- sifreli QR paket formati
- transfer code
- package expiry
- one-time-use kaydi
- opsiyonel ECDH receiver binding

### 7.4 Residual Risk

- transfer code ayni anda aciga cikarsa operasyonel risk olusur
- shoulder surfing veya ekran kaydi bu modelin disinda kabul edilen kullanici/endpoint riskidir

## 8. Yerel Kotu Niyetli Surec Senaryolari

### 8.1 Senaryo A: Pairing taklidi

Saldirgan, ayni cihazda calisan bir proses olarak desktop bridge'i kandirmaya calisir.

Bugunku savunmalar:

- native host kayit zinciri
- HMAC proof
- allowlist
- riskli yeniden eslestirme tespiti
- kullanici onayi

### 8.2 Senaryo B: Full vault replication

Saldirgan, desktop ana surecinden tum plaintext kasayi cekmeye calisir.

Bugunku savunmalar:

- full vault main-process replication kaldirildi
- domain-scoped veri modeli
- kisa omurlu renderer talebi

### 8.3 Senaryo C: QR payload gozlemi

Saldirgan QR payload'i veya transfer code'u ayni fiziksel ortamda gozlemlemeye calisir.

Bugunku savunmalar:

- sifreli paket
- sure sonu
- tek kullanim
- opsiyonel receiver binding

## 9. Kapatilan, Azaltilan ve Kabul Edilen Riskler

### 9.1 Kapatilan Riskler

- QR sync plaintext JSON aktarimi
- full-vault plaintext replication
- native host icinde loopback bagimliligi

### 9.2 Buyuk Olcude Azaltilan Riskler

- local malicious process impersonation
- desktop-extension eslestirmesinin sessizce yenilenmesi
- baglamsiz veri akisiyla gereksiz credential yayilimi

### 9.3 Bilincli Kabul Edilen Riskler

- root/kernel seviyesinde cihaz kompromizasyonu
- keylogger ve ekran kaydedici malware
- zayif kullanici parolasi secimi
- fiziksel omuz ustu gozlem

## 10. Test ve Surekli Dogrulama

Guvenlik mimarisi yalnizca belge ile degil surekli kanitla desteklenir:

- unit CI raporu
- security regression raporu
- Playwright E2E raporu
- native host bridge entegrasyon testi
- QR sync regresyon testi
- release smoke kontrolu
- CI artifact summary

Bu alan, urunun audit hazirliginda en hizli olgunlasan bolumlerden biridir.

## 11. Bilinen Limitler

- harici bagimsiz audit henuz tamamlanmadi
- pairing modeli guclense de daha ileri platform-bound kimlik modeli icin yol vardir
- yardimci hassas veri depolamada ilave secure storage iyilestirmeleri mumkundur

## 12. Audit Hazirlik Konumu

Aegis Vault bugun:

- erken prototip degil
- guclu pre-audit urun
- ciddi rakip adayi

olarak degerlendirilmelidir.

Ancak 1Password, Bitwarden, KeePassXC ve Proton Pass ile ayni denetim ve operasyonel guven seviyesine tam yerlesebilmesi icin:

- bagimsiz audit
- daha da guclu pairing kaniti
- surekli yesil test kaniti

gereklidir.

## 13. Sonuc

Bu whitepaper, Aegis Vault'un guvenlik mimarisini artik yalnizca “hangi algoritmalar kullaniliyor” seviyesinde degil, “hangi sinirlar korunuyor, hangi veri nasil hareket ediyor ve hangi risk neden kabul edildi” seviyesinde belgelemektedir.

Bir sonraki surumde bu belgeye:

- audit bulgulari
- remediation matrix
- versioned risk register

eklenecektir.

# Aegis Vault Threat Model

Version: 1.1
Date: 2026-03-15
Status: Pre-Audit / Formalized Draft

## 1. Amac

Bu dokuman, Aegis Vault 4.0 icin:

- korunan varliklari
- guven sinirlarini
- saldiri yuzeylerini
- baslica tehdit senaryolarini
- uygulanan kontrolleri
- kabul edilen ve kapatilan riskleri

resmi ve denetlenebilir bicimde tanimlar.

## 2. Kapsam

Kapsamdaki bilesenler:

- PWA UI ve uygulama mantigi
- `vaultService` kriptografi ve depolama akislari
- Electron desktop runtime
- Electron preload ve IPC kopruleri
- browser extension: background, popup, content script
- native messaging host
- yerel depolama: IndexedDB / SQLite OPFS / localStorage yardimci verileri
- QR sync export/import akisi
- opsiyonel E2E encrypted sync relay ve istemci entegrasyonu
- WebAuthn site passkey runtime (registration/auth)

Kapsam disi:

- root/kernel seviyesinde tam sistem kompromizasyonu
- fiziksel saldirilar: DMA, cold boot, side-channel
- kullanicinin cihazina yerlestirilmis keylogger veya ekran kaydedici malware
- ucuncu taraf tarayici veya isletim sistemi zafiyetleri

## 3. Guvenlik Hedefleri

1. Vault plaintext'in yetkisiz ifsasini onlemek
2. Desktop-extension veri akislarini en az yetki prensibiyle sinirlamak
3. Pairing iliskisini taklit edilmesi zor bir guven bagina donusturmek
4. QR sync aktarimlarini plaintext'ten cikarmak ve baglamsal olarak korumak
5. At-rest metadata sizintisini azaltmak
6. Replay, downgrade, spoofing ve yanlis baglamda veri erisimini engellemek
7. Sync relay uzerinden sifir-bilgi (zero-knowledge) veri surekliligi saglamak
8. Passkey operasyonlarinda origin baglamini (RP-ID) korumak

## 4. Korunan Varliklar

Kritik varliklar:

- master credential verifier
- derived key material
- vault entry plaintext alanlari: `pass`, `notes`, `totpSecret`
- sifreli metadata bloblari
- attachment payload ve attachment metadata
- passkey binding ve recovery package artefactlari
- desktop-extension pairing secret'lari
- QR sync transfer code ve opsiyonel receiver pairing artefactlari
- sync root secret ve türetilmiş sync encryption/auth anahtarları
- şifreli sync blob paketleri (payload + IV + HMAC)

## 5. Trust Boundary Diyagramlari

### 5.1 Ust Duzey Sistem Sinirlari

```text
                [ User ]
                   |
                   v
      +---------------------------+
      | PWA / React UI            |
      | Vault actions, settings   |
      +---------------------------+
          | TB1: UI -> Crypto
          v
      +---------------------------+
      | Vault Service / Crypto    |
      | Argon2id + AES-GCM        |
      +---------------------------+
          | TB2: Runtime -> Storage
          v
      +---------------------------+
      | IndexedDB / SQLite OPFS   |
      | Encrypted at-rest data    |
      +---------------------------+

      +---------------------------+
      | Browser Extension         |
      | background/popup/content  |
      +---------------------------+
          | TB3: Extension <-> Desktop bridge
          v
      +---------------------------+
      | Native Host               |
      | signed local bridge       |
      +---------------------------+
          | TB4: Native host <-> Electron IPC
          v
      +---------------------------+
      | Electron Main / Preload   |
      | state only, no full vault |
      +---------------------------+
          | TB5: Main -> Renderer request
          v
      +---------------------------+
      | Renderer domain resolver  |
      | short-lived credential    |
      +---------------------------+
          | TB6: Client -> Cloud (HTTPS + E2EE)
          v
      +---------------------------+
      | Aegis Sync Relay Server   |
      | Zero-knowledge blob store |
      +---------------------------+
```

### 5.2 Desktop-Extension-Native Host Veri Akisi

```text
Extension Popup/Content
    |
    | runtime message
    v
Extension Background
    |
    | native messaging + clientInfo + pairing secret
    v
Native Host
    |
    | HMAC-authenticated local IPC message
    v
Electron Main
    |
    | requestId + domain-scoped request
    v
Renderer / Vault Context
    |
    | short-lived credential response
    v
Electron Main
    |
    | minimal response
    v
Native Host -> Extension Background -> Popup/Content
```

### 5.3 QR Sync Guven Siniri

```text
Source Device
    |
    | selected entries
    v
QRSyncService.createPackage
    |
    | transfer code derived protection
    | optional ECDH receiver binding
    v
Encrypted QR payload
    |
    | camera / offline scan
    v
Target Device
    |
    | transfer code + optional receiver session
    v
QRSyncService.parsePackage
    |
    | expiry / one-time-use / pairing checks
    v
Imported entries
```

## 6. Tehdit Aktorleri

- TA1: Yerel dusuk yetkili proses
- TA2: Kotu niyetli tarayici eklentisi
- TA3: Yanlis origin / yanlis extension ID ile bridge denemesi yapan istemci
- TA4: Storage dump alan saldirgan
- TA5: Kullanici hatasi veya guvensiz operasyonel kullanim
- TA6: Kotu niyetli veya kompromize olmus Sync Relay sunucusu
- TA7: Ortadaki adam (MITM) veya sahte WebAuthn RP sunucusu

## 7. Baslica Tehdit Senaryolari

### T1. Yerel kotu niyetli proses desktop bridge'i taklit etmeye calisir

Hedef:
- native host veya Electron tarafindan gercek extension gibi kabul edilmek

Kontroller:
- allowlist extension ID modeli
- pairing secret
- native host uzerinden gecen imzali local IPC mesaji
- cihaz izi, installId, riskli yeniden eslestirme bayraklari
- kullanici onayli pairing diyalogu

Durum:
- tam kapatilmadi, ama onceki loopback-only modele gore belirgin bicimde daraltildi

Residual risk:
- host kompromizasyonunda veya pairing secret'in ele gecmesi halinde local attacker riski tamamen sifirlanmaz

### T2. Desktop uygulamadan full vault plaintext kopyasi alinmasi

Hedef:
- ana surecte veya extension tarafinda tum vault'u topluca elde etmek

Kontroller:
- Electron main process'te full plaintext vault cache kaldirildi
- domain-scoped credential modeli
- renderer'dan sadece ihtiyac aninda minimum veri talebi

Durum:
- onceki tasarima gore buyuk olcude kapatildi

Residual risk:
- aktif domain icin gereken minimum credential runtime memory'de kisa sure tutulur

### T3. QR sync plaintext export ele gecirilir

Hedef:
- QR paketleri taranarak sifresiz veri elde edilmesi

Kontroller:
- sifreli `aegis-qr-sync-v1` paket formati
- transfer code
- sure sonu
- tek kullanim kaydi
- opsiyonel ECDH alici baglama

Durum:
- plaintext aktarim riski kapatildi

Residual risk:
- transfer code zayif paylasilirsa veya ayni anda aciga cikarsa operasyonel risk devam eder

### T4. At-rest metadata disclosure

Hedef:
- site, username, tags, attachment metadata gibi alanlari diskten cikarmak

Kontroller:
- metadata encryption
- blind search index
- attachment metadata encryption

Residual risk:
- kullanici davranis metadatasi ve kullanim sikligi tam olarak gizlenemez

### T5. Yanlis profile TOTP veya passkey baglama yazimi

Hedef:
- guvenlik artefact'larinin yanlis profile veya yanlis kasa baglamina yazilmasi

Kontroller:
- profile-scoped passkey binding
- TOTP policy modeli
- recovery import/export context dogrulamasi

Residual risk:
- manuel migration sureclerinde kullanici hatasi tamamen yok edilemez

### T6. Sync Relay uzerinden veri sizintisi veya manipulasyonu

Hedef:
- sunucudaki blob'lari deşifre etmek veya sahte blob enjekte etmek

Kontroller:
- E2EE (AES-256-GCM): sunucu sadece şifreli blob'u görür
- HMAC-SHA256: her paket auth key ile imzalanır, sunucu veya MITM manipüle edemez
- Sequence Number: replay saldırılarını ve eski veriyle üzerine yazmayı (overwrite) engeller
- Separate Keys: vault şifreleme anahtarı ile sync anahtarı HKDF ile ayrıştırılmıştır

Durum:
- Sıfır-bilgi mimarisiyle sunucu tarafındaki risk minimize edildi

Residual risk:
- Sunucu veriyi silebilebilir (DoS), ancak okuyamaz veya değiştiremez

### T7. Passkey Spoofing veya Yanlış RP Bağlama

Hedef:
- bir sitenin passkey'ini başka bir site için kullanmak veya sahte passkey enjekte etmek

Kontroller:
- Browser-Enforced Origin: WebAuthn API tarayıcı seviyesinde RP-ID doğrulaması yapar
- Metadata Binding: Passkey credential_id ve metadata'sı vault entry'ye sıkıca bağlanır
- Audit Log: Her passkey auth işlemi `last_auth_at` ile izlenir

Durum:
- WebAuthn standartları gereği spoofing riski tarayıcı güvenliğine tabidir

## 8. Yerel Kotu Niyetli Surec Senaryolari

Bu dokumanin en onemli ozel senaryosu yerel saldirgandir.

### LM1. Ayni kullanici baglaminda calisan proses

Kabiliyetler:

- loopback veya local IPC kanalina erisme denemesi
- process injection olmadan yerel istemci taklidi
- diskteki pairing store veya config artefactlarini arama

Savunmalar:

- loopback fallback varsayilan kapali
- native host tercihli yol
- HMAC proof
- per-extension pairing store
- son kullanim ve risk kaydi

### LM2. Pairing yenileme suistimali

Kabiliyetler:

- ayni extension ID ile sik yeniden eslestirme talebi
- yeni cihaz gibi gorunmeye calisma

Savunmalar:

- fingerprint degisimi tespiti
- installId degisimi tespiti
- rapid_repair uyarisi
- kullanici onayi
- pairing gecmisi

### LM3. QR export operasyonunu gozleme

Kabiliyetler:

- ekrandaki QR veya transfer code'u ayni ortamdan gorme

Savunmalar:

- payload sifreli
- sure sonu
- tek kullanim
- opsiyonel aliciya bagli ECDH

Residual risk:

- omuz ustu gozlem veya ekran kaydi out-of-scope ya da operasyonel risktir

## 9. Risk Karar Matrisi

### 9.1 Kapatilan veya buyuk olcude azaltılan riskler

- full-vault plaintext replication
- loopback uzerinden challenge alip full vault cekme modeli
- QR sync plaintext JSON aktarimi
- pairing iliskisinin yalnizca secret saklayan basit kayit olarak kalmasi
- sync relay uzerinden vault plaintext ifşası (E2EE ile kapatıldı)

### 9.2 Kismi olarak azaltılan riskler

- local malicious process impersonation
- pairing secret ele gecirilmesi halinde yerel misuse
- runtime memory'de aktif domain credential bulunmasi

### 9.3 Bilincli olarak kabul edilen riskler

- root/kernel seviyesinde tam cihaz kompromizasyonu
- kullanicinin zayif master password secmesi
- shoulder surfing / ekran kaydi / fiziksel gozlem
- ayni cihazda yuksek yetkili malware varligi

## 10. Varsayimlar

- cihaz root/kernel seviyesinde tam kompromize degildir
- browser ve isletim sistemi temel WebCrypto / WebAuthn primitive'lerini dogru uygular
- kullanici guclu master credential ve recovery password kullanir
- release artefact'lari beklenen imza/hash zinciriyle dagitilir

## 11. Mitigation Roadmap

Kisa vade:

- pairing event audit log export
- revoke nedeni kaydi
- quality summary ve release smoke artefact'larini CI'da kalici hale getirme

Orta vade:

- harici audit
- whitepaper + threat model versioning cadence
- protocol-specific abuse tests

Uzun vade:

- daha guclu platform-bound pairing
- secure storage tarafinda yardimci hassas verileri daha da daraltma

## 12. Sonuc

Aegis Vault'un tehdit modeli artik yalnizca kriptografi ve storage ile sinirli degildir. Desktop-extension-native host zinciri, QR sync akisi ve yerel saldirgan senaryolari bu modelin resmi parcasi haline getirilmistir.

Bu belgeye gore urun:

- guclu pre-audit seviyededir
- en kritik eski risklerin bir kismini kapatmistir
- ancak bagimsiz audit ve daha ileri pairing kaniti tamamlanmadan ust lig urunlerle tamamen esitlenmis sayilmamalidir

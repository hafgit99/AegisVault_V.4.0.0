# Aegis E2E Encrypted Sync Protocol V1

## 1. Giris

Aegis Sync, kullanicilarin vault verilerini birden fazla cihaz arasinda senkronize etmesini saglayan opsiyonel, uc-tan-uca sifreli (E2EE) bir katmandir. Sistem, **Sifir Bilgi (Zero-Knowledge)** prensibiyle calisir; sunucu (relay) asla plaintext veriyi goremez, anahtar turetimi ve sifreleme tamamen istemcide yapilir.

## 2. Anahtar Turetimi (Key Derivation)

Sync anahtari, Master Password'dan degil, Master Password ile acilan vault icindeki **"Sync Root Secret"** (rastgele uretilmis 256-bit) verisinden turetilir.

- **Sync Root Secret:** Vault icinde gizli olarak saklanir.
- **Sync Master Key:** `HKDF(Sync Root Secret, salt: "aegis_sync_v1_hkdf", info: "master")` -> 256-bit.
- **Sync Encryption Key:** `HKDF(Sync Master Key, salt, info: "encryption")` -> 256-bit (AES-GCM).
- **Sync Auth Key:** `HKDF(Sync Master Key, salt, info: "authentication")` -> 256-bit (HMAC-SHA256).

## 3. Veri Paketi (Sync Envelope)

Her senkronizasyon birimi bir "Envelope" (Zarf) icindedir:

```json
{
  "version": "1.0",
  "sessionId": "UUID",
  "deviceId": "Fingerprint",
  "timestamp": "ISO-8601",
  "payload": "BASE64(AES-GCM-Encrypted-Blob)",
  "iv": "BASE64(12-byte IV)",
  "hmac": "BASE64(HMAC-SHA256-Signature)",
  "sequenceNumber": 123
}
```

## 4. Senkronizasyon Akisi

1. **Prepare:** Istemci vault snapshot'ini alır, `Sync Encryption Key` ile sifreler.
2. **Sign:** Sifreli paketi `Sync Auth Key` ile imzalar (HMAC).
3. **Push:** Paketi Relay sunucusuna gonderir. Sunucu `nonce` ve `timestamp` kontrolü yapar.
4. **Pull:** Diger cihazlar paketi indirir, imzayi dogrular, kendi anahtarlariyla cozer.
5. **Conflict:** `Last-Write-Wins` veya `Explicit Merge` politikasi uygulanir.

## 5. Trust Modeli (Device Pairing)

Yeni bir cihaz sync grubuna ancak **QR pairing** (Adim 1.3'teki Pairing altyapisi) ile eklenir. Bu sayede "Sync Root Secret" güvenli bir sekilde (kablosuz/offline) yeni cihaza aktarilir.

## 6. Guvenlik Garantileri

- **Confidentiality:** Relay sunucusu `Sync Encryption Key`'e sahip degildir.
- **Integrity:** HMAC sayesinde paketlerin sunucu veya kisi tarafindan degistirilmesi engellenir.
- **Authenticity:** Sadece gecerli `Sync Auth Key`'e sahip cihazlar gruba paket ekleyebilir.
- **Replay Protection:** `sessionId` ve her pakete ozel `sequenceNumber` ile replay saldirilari onlenir.

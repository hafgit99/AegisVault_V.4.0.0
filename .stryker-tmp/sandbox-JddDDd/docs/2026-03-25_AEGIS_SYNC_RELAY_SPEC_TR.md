# Aegis Sync Relay Server Spec V1

## 1. Amac
Sync Relay, Aegis istemcileri arasinda sifreli paketlerin (Envelope) takas edilmesini saglayan bir posta kutusu (mailbox) gorevi gorur. Sunucu, paket icerigini goremez; sadece kimlik dogrulanmis cihazlarin paket yuklemesine ve indirmesine izin verir.

## 2. Veri Yapisi (Server-Side)
Sunucu paketleri `sessionId` bazli kuyruklarda (veya snapshot slotlarinda) saklar.

```table
| Alan | Tip | Aciklama |
|---|---|---|
| id | PK | Otomatik artan ID |
| session_id | UUID | Sync grubunun benzersiz kimligi |
| device_id | String | Paketi gonderen cihaz |
| version | String | Protokol versiyonu |
| payload | Blob/LongText | Base64url(AES-GCM-Encrypted) |
| iv | String | Base64url(12-byte IV) |
| hmac | String | Base64url(HMAC-SHA256) |
| sequence_number | Int | Catisma ve replay onleme icin |
| created_at | Timestamp | Yukleme zamani |
```

## 3. API Uclari (Endpoints)

### `POST /v1/sync/push`
- **Girdi:** `SyncEnvelope`
- **Auth:** `Device-Access-Token` veya HMAC signature validation.
- **Islem:** Paketi gecerli `sessionId` altina kaydet. `sequence_number` kontrolü yap.
- **Cikti:** `200 OK` veya `409 Conflict` (Eger gonderilen sequence eskiyse).

### `GET /v1/sync/pull`
- **Parametre:** `sessionId`, `afterSequenceNumber`
- **Islem:** Belirtilen `sessionId` altindaki en guncel paketi veya degisiklikleri getir.
- **Cikti:** `SyncEnvelope[]`

### `DELETE /v1/sync/session`
- **Islem:** Sync grubunu ve tum paketleri sil (Revocation).

## 4. Guvenlik Gereksinimleri
1. **Plaintext No-Read:** Sunucu asla `SyncEncryptionKey` veya `SyncAuthKey` almamalidir.
2. **Quota:** Her `sessionId` icin maksimum snapshot boyutu (orn. 5MB) ve sayisi belirlenmelidir.
3. **Expiry:** Uzun sure ulasilmayan paketler otomatik silinmelidir (TTL).
4. **Rate Limiting:** IP veya Cihaz bazli rate limiting saldirilari onlemek icin elzemdir.

## 5. Implementasyon Notu
Relay sunucusu minimal olmali; veri dogrulamasi (Payload decryption) tamamen istemci sorumlulugundadır. Sunucu sadece HMAC imzalarinin gecerli bir cihaza ait oldugunu (eger secret paylasimi sunucuda varsa) veya sadece `Device-ID` bazli ACL kontrolü yapabilir.

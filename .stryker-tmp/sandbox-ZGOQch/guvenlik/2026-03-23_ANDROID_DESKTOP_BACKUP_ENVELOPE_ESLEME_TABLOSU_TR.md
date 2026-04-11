# Android - Desktop Backup Envelope Esleme Tablosu

Tarih: 23 Mart 2026
Durum: Faz 1 teknik esleme belgesi

## 1. Amaç

Bu belge Android backup envelope ile desktop canonical backup envelope arasindaki alan farklarini ve migration yönünü netlestirir.

## 2. Desktop Encrypted Envelope

Kaynak: `src/lib/BackupService.ts`

Alanlar:

- `version`
- `format`
- `salt`
- `iv`
- `payload`
- `payload_kind`
- `payload_schema_version`

Canonical payload icinde:

- `kind`
- `schemaVersion`
- `exportedAt`
- `records`

## 3. Android Encrypted Envelope

Kaynak: `android-aegis-temp/src/BackupModule.ts`

Alanlar:

- `version`
- `app`
- `encrypted`
- `algorithm`
- `kdf`
- `memory`
- `iterations`
- `parallelism`
- `hashLength`
- `salt`
- `iv`
- `authTag`
- `exported_at`
- `count`
- `data`

Sifre cozuldugunde plaintext payload:

- `items`
- `sharedSpaces`

## 4. Ana Farklar

### 4.1 Envelope seviyesi

Desktop:

- `format` alanina sahip
- `payload_kind` ve `payload_schema_version` ile ileri uyumluluk aciyor

Android:

- `app`, `encrypted`, `algorithm`, `kdf`, `authTag` alanlari daha acik
- envelope metadata daha zengin

### 4.2 Payload seviyesi

Desktop canonical:

- `records`

Android:

- `items`
- `sharedSpaces`

### 4.3 Kriptografik metadata

Desktop:

- sade envelope
- AES-GCM tag ciphertext icine gomulu, WebCrypto yolu uzerinden dogal

Android:

- `authTag` ayri alan
- `kdf`, `memory`, `iterations`, `parallelism`, `hashLength` acik meta olarak disari cikiyor

## 5. Onerilen Esleme

### Android -> Canonical

- `version` -> compatibility metadata
- `exported_at` -> `exportedAt`
- `items` -> `records`
- `sharedSpaces` -> ayri migration bolumu
- `count` -> rapor metadatasi

### Desktop Canonical -> Android yonu

- `records` -> `items`
- `exportedAt` -> `exported_at`
- `kind/schemaVersion` -> Android tarafinda compatibility metadata olarak saklanabilir

## 6. Ortak Migration Kurali

1. Envelope metadata asla dogrudan birebir kopyalanmamalidir.
2. Once payload sifresi acilir.
3. Payload canonical modele normalize edilir.
4. Hedef platform envelope’u kendi guvenlik modeliyle yeniden uretilir.

Bu sayede:

- platforma ozgu KDF ve crypto metadata korunur
- uygulamalar birbirinin envelope’unu taklit etmek zorunda kalmaz
- ortak schema payload seviyesinde birlesir

## 7. Sonraki Teknik Adim

1. Migration report formatini standardize et
2. Android payload -> canonical payload adapter taslagi yaz
3. SharedSpaces icin canonical yan model tasarla

# Aegis Cross-Platform Schema Envanteri

Tarih: 23 Mart 2026
Kapsam: Desktop/web kasasi ile Android kasasi arasindaki temel veri modeli farklari
Amac: 4.1 Faz 1 icin ortak schema ve migration kararlarina zemin hazirlamak

## 1. Ozet

Desktop ve Android urunleri ayni amaca hizmet etse de bugun farkli veri modelleri kullaniyor:

- Desktop modeli daha guclu sifreleme odakli ve metadata encryption iceriyor.
- Android modeli daha genis kategori kapsami, local sharing ve operational settings odakli.

Bu farklar kotu degil, ancak ortak schema tanimlanmadan:

- backup/import uyumu kirilgan kalir
- migration maliyeti buyur
- paylasim, passkey ve sync tarafinda veri borcu artar

## 2. Desktop Ana Modeli

Kaynak: `src/vaultService.ts`

Desktop `VaultEntry` cekirdegi:

- `id`
- `title`
- `username`
- `website`
- `category`
- `tags`
- `encrypted_password`
- `iv`
- `encrypted_title`
- `encrypted_username`
- `encrypted_website`
- `encrypted_category`
- `encrypted_tags`
- `search_index`
- `totp_secret`
- `totp_iv`
- `totp_issuer`
- `totp_algorithm`
- `totp_digits`
- `totp_period`
- `encrypted_notes`
- `notes_iv`
- `attachments`
- `deletedAt`
- UI-only: `pass`, `totpSecret`, `notes`

Temel karakter:

- metadata encryption var
- attachment metadata encryption var
- private search index var
- TOTP ayri alanlar halinde modelliyor

## 3. Android Ana Modeli

Kaynak: `android-aegis-temp/src/SecurityModule.ts`

Android `VaultItem` cekirdegi:

- `id`
- `title`
- `username`
- `password`
- `url`
- `notes`
- `category`
- `favorite`
- `data`
- `is_deleted`
- `deleted_at`
- `created_at`
- `updated_at`

Android attachment modeli:

- `id`
- `item_id`
- `filename`
- `mime_type`
- `size`
- `file_data`

Android category-specific `data` yaklasimi:

- login: `totp_secret`
- card: `cardholder`, `card_number`, `expiry`, `cvv`, `pin`, `brand`
- identity: `first_name`, `last_name`, `national_id`, `birthday`, `phone`, `email`, `address`, `gender`, `company`
- note: `content`
- wifi: `ssid`, `wifi_password`, `security`, `hidden`
- passkey: `rp_id`, `credential_id`, `user_handle`, `display_name`, `transport`, `authenticator_attachment`, `algorithm`, `mode`, `server_verified`

Temel karakter:

- daha genis kategori kapsamı var
- metadata encryption desktop kadar zengin gorunmuyor
- category-specific alanlar `data` JSON icine toplanmis
- sharing ve local operational data daha gelismis

## 4. En Kritik Farklar

### 4.1 Secret field modeli

Desktop:

- parola `encrypted_password`
- not `encrypted_notes`
- TOTP `totp_secret`

Android:

- parola `password`
- not `notes`
- TOTP `data.totp_secret`

Yorum:

Desktop alanlari daha ayrik ve kriptografik olarak daha acik modellenmis.
Android ise daha esnek ama daha gevsek bir kategori bazli `data` modeli kullaniyor.

### 4.2 Metadata modeli

Desktop:

- `title`, `username`, `website`, `category`, `tags` icin sifreli at-rest secenegi var

Android:

- `title`, `username`, `url`, `category` dogrudan alan olarak tutuluyor

Yorum:

4.1'de Android metadata encryption kapsamı yeniden degerlendirilmelidir.

### 4.3 URL alan adi farki

Desktop:

- `website`

Android:

- `url`

Yorum:

4.1 ortak schema icin canonical alan adi secilmeli.
Oneri:

- canonical storage field: `url`
- desktop UI compatibility alias: `website`

Alternatif:

- canonical shared contract: `website`
- Android adapter katmani ile map etsin

### 4.4 Notes modeli

Desktop:

- `encrypted_notes`
- `notes_iv`
- UI-only `notes`

Android:

- top-level `notes`
- bazen category-specific `data.content`

Yorum:

Android note ve secure note ayrimi netlestirilmeli.

### 4.5 TOTP modeli

Desktop:

- top-level ayrik alanlar

Android:

- `data.totp_secret`

Yorum:

4.1 ortak schema icin TOTP nesnesi yaklasimi daha temiz olur.

Oneri:

- `totp.secret`
- `totp.issuer`
- `totp.algorithm`
- `totp.digits`
- `totp.period`

### 4.6 Attachment modeli

Desktop:

- attachment metadata ayrik
- sifreli metadata desteği var

Android:

- dosya verisi `file_data`
- metadata `filename`, `mime_type`, `size`

Yorum:

4.1'de attachment ortak modeli ve export/import davranisi standartlastirilmalidir.

### 4.7 Category kapsami

Desktop:

- login merkezli genisletilmis kasa

Android:

- login
- passkey
- card
- identity
- note
- wifi

Yorum:

4.1 ortak urun modeli icin desktop kategori kapsami Android ile hizalanmalidir.

### 4.8 Sharing modeli

Desktop:

- dogrudan entry modelinde paylasim yapisi gorunmuyor

Android:

- `SharedVaultSpace`
- `SharedVaultMember`
- `SharedItemAssignment`

Yorum:

Sharing tarafi su an mobilde daha ileride.
Desktop ve web bu modele adapte edilmeli veya ortak yeni model tanimlanmali.

### 4.9 Passkey modeli

Desktop:

- kasa acma ve binding/policy tarafi guclu

Android:

- item seviyesi `passkey` category ve passkey metadata var

Yorum:

Iki platform farkli passkey problemlerini cozmeye calisiyor:

- desktop: vault unlock passkey
- Android: passkey item ve RP helper mantigi

  4.1 icin bunlar tek bir urun dili altinda ayrilmali:

- `vault_passkey`
- `site_passkey`

## 5. 4.1 Icin Onerilen Canonical Schema Yonleri

Asagidaki alanlar ortak cekirdek olarak dusunulmeli:

- `id`
- `title`
- `username`
- `url`
- `category`
- `favorite`
- `tags`
- `secret.password`
- `secret.notes`
- `secret.totp`
- `attachments`
- `deleted_at`
- `created_at`
- `updated_at`
- `custom_data`

Ek prensipler:

- UI adapter alanlari canonical schema degil, compatibility katmani olmali
- `website` ve `pass` gibi alanlar compatibility alias olarak kalabilir
- category-specific alanlar kontrollu `custom_data` ya da typed sub-objects olarak tutulmali

## 6. Hemen Alinmasi Gereken Kararlar

1. Canonical alan adi `website` mi `url` mi olacak?
2. TOTP top-level mi olacak yoksa nested object mi?
3. Android category-specific `data` modeli korunacak mi?
4. Desktop metadata encryption modelinin ne kadari mobile tasinacak?
5. Sharing modeli entry seviyesinde mi, vault/space seviyesinde mi standardize edilecek?
6. Passkey icin vault unlock ve site passkey kesin olarak ayrilacak mi?

## 7. Sonraki Teknik Adim

Bir sonraki uygulama adimi:

- canonical schema taslagi cikar
- desktop ve Android icin adapter tablosu yaz
- backup/import/export alan map'lerini belgeleyip kod tarafinda migration helper tasarlamaya basla

## 8. Durum

Bu belge Faz 1'in ikinci cikti belgesidir.

Tamamlananlar:

- ortak version/format registry baslatildi
- desktop backup ve QR sync version sabitleri merkezilestirildi
- desktop vs Android temel model farklari resmi envantere dokuldu

Siradaki hedef:

- canonical cross-platform schema v0.1

# Aegis Canonical Schema v0.1

Tarih: 23 Mart 2026
Durum: Taslak
Kapsam: Desktop, web, extension ve Android ortak veri sozlesmesi icin ilk canonical model

## 1. Amac

Bu belge Aegis 4.1 icin ortak veri modelinin ilk resmi taslagidir.

Hedef:

- platformlar arasi import/export uyumu
- migration kurallarini basitlestirme
- sharing, passkey ve sync katmanlari icin ortak temel
- iki farkli repo arasinda ayni kavramlara ayni isimleri vermek

## 2. Tasarim Ilkeleri

1. Canonical schema, UI modeli degildir.
2. Compatibility alias alanlari canonical alan sayilmaz.
3. Secret alanlar nested object mantigina tasinmalidir.
4. Category-specific alanlar kontrolsuz serbest JSON yerine typed alt nesnelere dogru gitmelidir.
5. Metadata encryption uygulanmasi schema'dan bagimsiz olabilir, ama schema bunu tasimaya uygun olmalidir.

## 3. Canonical Cekirdek Model

### 3.1 Vault Record

- `id: string | number`
- `title: string`
- `username: string`
- `url: string`
- `category: CanonicalCategory`
- `favorite: boolean`
- `tags: string[]`
- `deleted_at?: string | null`
- `created_at?: string`
- `updated_at?: string`
- `secret?: CanonicalSecretFields`
- `attachments?: CanonicalAttachment[]`
- `passkey?: CanonicalPasskeyFields | null`
- `sharing?: CanonicalSharingAssignment[]`
- `custom_data?: Record<string, unknown>`

### 3.2 Secret Fields

- `password?: string`
- `notes?: string`
- `totp?: CanonicalTotpFields | null`

### 3.3 TOTP Fields

- `secret: string`
- `issuer?: string`
- `algorithm?: 'SHA-1' | 'SHA-256' | 'SHA-512'`
- `digits?: number`
- `period?: number`

### 3.4 Attachment Fields

- `id: string`
- `name: string`
- `mime_type: string`
- `size: number`

### 3.5 Passkey Fields

- `rp_id?: string`
- `credential_id?: string`
- `user_handle?: string`
- `display_name?: string`
- `transport?: string`
- `authenticator_attachment?: string`
- `algorithm?: string`
- `mode?: 'local_helper' | 'rp_connected' | 'vault_unlock'`
- `server_verified?: boolean`
- `created_at?: string`
- `last_registration_at?: string`
- `last_auth_at?: string`

### 3.6 Sharing Assignment

- `space_id: string`
- `role: 'viewer' | 'editor'`
- `shared_by?: string`
- `is_sensitive?: boolean`
- `emergency_access?: boolean`
- `notes?: string`
- `last_reviewed_at?: string`

## 4. Category Listesi

Canonical kategori listesi:

- `login`
- `passkey`
- `card`
- `identity`
- `note`
- `wifi`
- `document`
- `other`

## 5. Alan Esleme Kurallari

### Desktop -> Canonical

- `website` -> `url`
- `pass` -> `secret.password`
- `notes` -> `secret.notes`
- `totpSecret` veya `totp_secret` -> `secret.totp.secret`
- `attachments[].type` -> `attachments[].mime_type`
- `deletedAt` -> `deleted_at`

### Android -> Canonical

- `password` -> `secret.password`
- `notes` -> `secret.notes`
- `url` -> `url`
- `favorite` -> `favorite` boolean'a donusturulmeli
- `data.totp_secret` -> `secret.totp.secret`
- `data` icindeki passkey alanlari -> `passkey`

## 6. Bilincli Olarak Compatibility Katmaninda Birakilanlar

Asagidaki alanlar UI veya legacy uyumluluk icin kalabilir:

- desktop `website`
- desktop `pass`
- desktop `notes`
- Android `password`
- Android `data` ham string formatı

Bunlar canonical storage model degil, adapter seviyesindedir.

## 7. Faz 1 Icinde Koda Tasinacak Ilk Parcasi

Ilk kod parcasi olarak:

1. canonical tip dosyasi
2. desktop -> canonical adapter
3. export/import servislerinde canonical mapleme yardimcilari

## 8. UI ve Tema Notu

Bu schema calismasi dogrudan UI degisikligi yapmaz.
Ancak sonraki ekranlar icin su zorunlu olacak:

- yeni alanlar iki dilli metinlerle aciklanmali
- tum yeni ayarlar light ve dark theme ile test edilmeli
- category ve passkey/sharing ekranlari tema token'lari uzerinden ilerlemeli

## 9. Sonraki Adim

`src/lib/canonical-schema.ts`
ve
`src/lib/canonical-adapters.ts`
katmani ile import tarafina canonical parser yardimcilari eklenecek.

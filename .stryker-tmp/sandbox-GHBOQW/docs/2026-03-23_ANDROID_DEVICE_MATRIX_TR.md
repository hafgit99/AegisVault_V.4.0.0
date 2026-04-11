# Aegis 4.1 - Android Device Matrix

Tarih: 23 Mart 2026

## Amac

Faz 3 kapsaminda Android surumunu controlled beta seviyesinden production candidate seviyesine tasimak icin minimum cihaz matrisi tanimlamak.

## Test Boyutlari

- Android surumu
- OEM / uretici
- cihaz sinifi
- biyometri
- Credential Manager / passkey
- autofill
- recovery
- cloud sync
- crash monitoring

## Minimum Hedef Matris

### Android Surumleri

- Android 10
- Android 11
- Android 12
- Android 13
- Android 14
- Android 15

### OEM Dagilimi

- Google Pixel
- Samsung Galaxy
- Xiaomi / Redmi / Poco
- OnePlus
- Motorola

### Cihaz Siniflari

- dusuk RAM / giris segmenti
- orta segment
- amiral gemisi
- tablet veya buyuk ekran opsiyonel dogrulama

## Kritik Senaryolar

1. Vault unlock
2. Biometric unlock
3. Passkey create/verify
4. Autofill in browser
5. Autofill in native app
6. Encrypted backup export/import
7. Recovery flow on clean profile
8. Shared space create/edit/assign
9. Cloud sync basic smoke
10. Crash monitoring capture and clear

## Evidence Ciktilari

- `ci-artifacts/android/device-matrix/device-matrix.template.json`
- `ci-artifacts/android/device-matrix/device-matrix.json`
- manuel veya otomatik cihaz matrisi sonucu
- ekran goruntusu veya kisa test notu

## Canli Kayit Formati

Canli matrix artik `completion_criteria` alani da tasir.

Bir cihazin `completed` sayilmasi icin minimum olarak su senaryolarin tamamlanmis olmasi beklenir:

- `vault_unlock`
- `biometric_unlock`
- `passkey_create_verify`
- `autofill_browser`
- `encrypted_backup_export_import`
- `recovery_clean_profile`

Ek olarak su alt validasyonlar tamamlanmis olmalidir:

- `autofill.browser_chrome`
- `passkey_biometric_recovery.passkey_create`
- `passkey_biometric_recovery.biometric_unlock`

Her cihaz satirinda su alanlar bulunmali:

- `id`
- `android_version`
- `oem`
- `device_class`
- `device_label`
- `owner`
- `priority`
- `status`
- `validation_focus`
- `dependencies`
- `scenarios`
- `validation_groups`
- `notes`
- `last_updated`

`scenarios` icinde minimum olarak su durumlar takip edilir:

- `vault_unlock`
- `biometric_unlock`
- `passkey_create_verify`
- `autofill_browser`
- `autofill_native_app`
- `encrypted_backup_export_import`
- `recovery_clean_profile`
- `shared_space_create_edit_assign`
- `cloud_sync_basic_smoke`
- `crash_monitoring_capture_clear`

`validation_groups` altinda iki zorunlu kombine takip grubu bulunur:

- `autofill`
  - `browser_chrome`
  - `native_app_login`
  - `save_prompt`
- `passkey_biometric_recovery`
  - `passkey_create`
  - `passkey_verify`
  - `biometric_unlock`
  - `recovery_after_clean_profile`

Ilk template artik en az 3 referans cihaz goreviyle gelir:

- Pixel / Android 15 / amiral gemisi / `p0`
- Samsung / Android 14 / orta segment / `p0`
- Xiaomi / Android 13 / dusuk RAM / `p1`

Bu 3 kayit artik sadece cihaz listesi degil, ilk QA gorev backlog'u olarak davranir:

- her kayit bir cihaz sahibine baglanir
- her kayit kombine validasyon alt durumlarini tasir
- her kayit not ve bagimlilik alanlariyla OEM farkliliklarini izler

## Ilk Canli Durum

Template icinde ilk aktif saha kaydi Pixel Android 15 referans cihazidir.

- durum: `completed`
- tamamlananlar: vault unlock, biometric unlock, passkey create/verify, browser autofill, encrypted backup export/import, recovery temiz profil
- acik kalan takip noktalar: native app autofill ve crash monitoring izleme notlari
- amac: Credential Manager ve Android 15 davranisini Faz 3 icin ilk referans completed cihaz olarak sabitlemek

Ikinci aktif saha kaydi Samsung Android 14 orta segment cihazidir.

- durum: `completed`
- tamamlananlar: vault unlock, browser/native autofill, biyometri, passkey create/verify, recovery temiz profil, shared spaces create/edit/assign
- acik kalan takip noktalar: cloud sync basic smoke ve crash monitoring izleme notlari
- amac: One UI ve Samsung autofill farkliliklarini Faz 3 icin ikinci completed cihaz kaniti olarak sabitlemek

Ucuncu aktif saha kaydi Xiaomi Android 13 dusuk RAM cihazidir.

- durum: `completed`
- tamamlananlar: vault unlock, biyometri, passkey create/verify, browser/native autofill, encrypted backup export/import, recovery temiz profil, crash monitoring
- acik kalan takip noktalar: shared spaces ve cloud sync basic smoke takip backlog'unda
- amac: dusuk bellek ve agresif OEM optimizasyonlari altinda ilk completed low-memory kanitini olusturmak

## Sonraki Adim

- Template kayitlarini gercek cihaz adlari ve sonuc notlariyla doldurmak
- Autofill ve passkey kombinasyonlarini OEM bazli gorevlere ayirmak

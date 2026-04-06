# Aegis Vault 4.1 Tam Yol Haritasi

Tarih: 23 Mart 2026
Kapsam: Desktop, web, Electron, browser extension, Android mobil omurgasi ve urunlesme programi
Durum: Uygulanabilir yol haritasi / faz bazli icra plani

## 1. Amac

Bu belge, Aegis Vault'u:

- guclu ama daginik bir guvenlik projesi olmaktan
- urun ailesi net, platformlar arasi tutarli
- pre-audit seviyesinden audit-ready seviyesine yaklasan
- rakiplerle ayni kategoride konusulabilecek

bir 4.1 surum ailesine tasimak icin hazirlanmistir.

Bu yol haritasinin amaci sadece yeni ozellik eklemek degildir. Asil hedef:

1. tek urun kimligi
2. tek veri modeli
3. tek guvenlik modeli
4. tek release disiplini
5. net rekabet avantaji

olusturmaktir.

## 2. Guncel Durum Ozeti

### Guclu Alanlar

- Desktop tarafta Argon2id, AES-GCM, metadata encryption, private search index, passkey policy, QR sync, native bridge sertlestirmesi mevcut.
- Browser extension tarafinda domain-scoped credential modeli ve native host temelli daha guvenli entegrasyon yonu mevcut.
- Android tarafta React Native tabanli mobil uygulama, SQLCipher, biyometri, Credential Manager tabanli passkey akislar, HIBP, backup, autofill, cloud sync temeli ve offline-first shared spaces gorunuyor.
- Guvenlik dokumantasyonu, threat model ve whitepaper tabani olusmus durumda.

### Kritik Aciklar

- Platformlar arasi ortak veri sozlesmesi ve ortak migration rejimi resmi degil.
- Desktop test kaniti ve audit kaniti hala tam olgun degil.
- Android var, ancak repo kendi raporuna gore kontrollu beta seviyesinde.
- Site passkey destegi, kasa acma passkey'inden ayri bir urun parcasi olarak henuz tam net degil.
- Paylasim modeli var, ancak urun ailesi geneline yayilmis ve yonetilebilir bir yapida degil.
- Opsiyonel bulut senkronizasyonunun urun seviyesi karari net degil.
- Harici audit, pentest ve resmi guven kaniti eksik.

## 3. 4.1 Stratejik Hedef

4.1, "daha cok ozellik" surumu degil; "daginik yetenekleri birlestirme ve urunu sertlestirme" surumu olmalidir.

4.1 sonunda hedeflenen durum:

- Desktop + extension + Android tek urun ailesi olarak tanimlanmis olacak
- Veri modeli ve backup/import/export uyumu ortaklasacak
- Passkey, sharing ve sync icin urun kararlari netlesecek
- Test, release ve audit kaniti ciddi sekilde guclenecek
- Android controlled beta'dan production adayi seviyesine cikacak

## 4. Fazlar

## Faz 0 - Program Baslatma ve Kapsam Kilitleme

Sure: 1 hafta
Durum: Hemen baslanmali

### Hedef

4.1'in ne oldugunu kesinlestirmek ve daginik isleri tek backlog altinda toplamak.

### Yapilacaklar

1. 4.1 kapsam sinirini resmi hale getirin.
2. Desktop, extension ve Android icin ortak "must-have" listesini cikarın.
3. "4.1'e giren" ve "4.2'ye kalan" maddeleri ayirin.
4. Tek bir teknik takip tablosu olusturun.
5. Ortak veri modeli sahipligini belirleyin.

### Ciktilar

- 4.1 scope listesi
- backlog siniflandirmasi
- sahiplik matrisi

### Basari Kriteri

Takim veya gelistirme akisinda "bu is 4.1'e giriyor mu?" sorusu yoruma acik kalmamalidir.

---

## Faz 1 - Platformlar Arasi Temel Birligi

Sure: 2-3 hafta
Oncelik: En kritik faz

### Hedef

Desktop, Android ve diger istemciler icin tek veri ve guvenlik omurgasi kurmak.

### Yapilacaklar

1. Ortak vault semasi olusturun.
2. Entry alanlarini platformlar arasi esitleyin.
3. Backup formatini versiyonlu tek standarda baglayin.
4. Import/export davranislarini tek parser/adapter mantigina oturtun.
5. Passkey metadata, attachment metadata, TOTP modeli ve tags modelini platformlar arasi esitleyin.
6. Security mode mantigini ortak profile cevirin.
7. Migration stratejisini yazili hale getirin.

### Teknik Parcala

- `vault schema`
- `backup schema`
- `import compatibility matrix`
- `shared space schema`
- `passkey binding schema`

### Ciktilar

- Ortak veri sozlesmesi belgesi
- migration kurallari
- cross-platform compatibility checklist

### Basari Kriteri

Bir platformda uretilen yedek diger platformda beklenen sekilde acilabilmeli ve veri kaybi yaratmamalidir.

---

## Faz 2 - Kalite Kapisi ve Audit Kaniti

Sure: 2 hafta
Oncelik: Cok yuksek

### Hedef

"Calisiyor" ile "guvenilir sekilde kanitlanmis olarak calisiyor" arasindaki farki kapatmak.

### Yapilacaklar

1. Desktop tarafindaki test stabilite sorunlarini kapatin.
2. E2E ve unit test raporlarini standart artefact haline getirin.
3. Android test ve release kanitini merkezi rapor formatina baglayin.
4. Release smoke zincirini tum platformlar icin gorunur hale getirin.
5. Guvenlik regresyon testlerini ayri kalite kapisina baglayin.
6. Device matrix ve browser matrix dogrulama akisini belgeleyin.

### Ozel Odak

- `spawn EPERM` gibi audit algisini bozan sorunlar
- native bridge red-team senaryolari
- QR sync regression
- import/export corruption senaryolari
- passkey recovery ve revoke regresyonlari

### Ciktilar

- audit evidence bundle
- quality gate tablosu
- son 30 gunluk test raporu standardi

### Basari Kriteri

Disaridan bakan bir denetci, "yeşil test kaniti yok" diyememeli.

---

## Faz 3 - Android Uretim Seviyesine Gecis

Sure: 3-4 hafta
Oncelik: Cok yuksek

### Hedef

Android surumunu teknik beta temelden production adayi seviyesine tasimak.

### Yapilacaklar

1. Gercek cihaz matrisi calismalarini tamamlayin.
2. Autofill servis davranisini farkli cihazlarda dogrulayin.
3. Biyometri + passkey + recovery kombinasyonlarini test edin.
4. Dusuk RAM, eski Android ve OEM farkliliklarini belgeleyin.
5. Crash monitoring ve local audit log ciktilarini urun kararlarina baglayin.
6. Metin/encoding/polish sorunlarini temizleyin.
7. Release signing ve supply chain akisini tekrar dogrulayin.

### Ciktilar

- device validation evidence
- release readiness v2
- Android production candidate checklist

### Basari Kriteri

Android uygulamasi sadece "kuruluyor" degil, farkli cihaz siniflarinda guvenli ve ongorulebilir calisiyor olmalidir.

---

## Faz 4 - Passkey 4.1 Programi

Sure: 3 hafta
Oncelik: Yuksek

### Hedef

Passkey tarafini kasa acma ozelliginden urun farklastiricisi seviyesine cikarmak.

### Yapilacaklar

1. Passkey stratejisini ikiye ayirin:
   kasa acma passkey
   site passkey
2. Site passkey icin minimum urun kapsamini tanimlayin.
3. Android, desktop ve extension arasinda passkey metadata gorunurlugunu ortaklastirin.
4. Recovery, revoke, rotation ve policy modelini tum platformlarda ayni mantiga baglayin.
5. Passkey envanteri ve durum ekranini ekleyin.

### 4.1 Icinde Yapilacak Minimum Kapsam

- passkey inventory
- policy warning
- recovery/revoke gorunurlugu
- site passkey MVP karar dokumani

### 4.2'ye Birakilabilecekler

- tam passkey senkronizasyonu
- relying party backend ile ileri akislar

### Basari Kriteri

Passkey konusu repo icinde daginik deneysel modullerin toplami olmaktan cikmali, net bir urun kabiliyetine donusmelidir.

---

## Faz 5 - Senkronizasyon ve Veri Tasima Stratejisi

Sure: 2-3 hafta
Oncelik: Stratejik karar fazi

### Hedef

QR sync, backup/export ve cloud sync arasinda urun seviyesinde tek bir mantik kurmak.

### Kritik Karar

Aegis 4.1 icin temel model su olmali:

- varsayilan: offline-first
- ek mod: opsiyonel sifreli sync

### Yapilacaklar

1. QR sync'in rolunu netlestirin.
2. Backup/export ile migration akislarini ayirin.
3. Cloud sync varsa guvenlik modelini resmi hale getirin.
4. Sync conflict stratejisini belirleyin.
5. Cihaz eslestirme ve trust modelini belgeleyin.
6. "hangi veri nerede plaintext olabilir?" sorusunu kapatin.

### Ciktilar

- sync strategy ADR
- transfer trust boundary
- conflict resolution policy

### Basari Kriteri

Kullaniciya farkli veri tasima yontemleri karmasa yaratmamali; urun tek bir mantikla aciklanabilmelidir.

---

## Faz 6 - Sharing, Family ve Team Katmani

Sure: 3 hafta
Oncelik: Rekabet icin yuksek

### Hedef

Mevcut offline-first shared spaces mantigini urun ailesi genelinde anlasilir ve yonetilebilir hale getirmek.

### Yapilacaklar

1. Shared vault ve shared space terminolojisini standartlastirin.
2. Rol modelini kesinlestirin:
   owner
   admin
   editor
   viewer
3. Desktop ve mobil arasi paylasim davranisini ortaklastirin.
4. Shared item audit log ekleyin.
5. Davet, onay, kaldirma ve revoke akislarini tasarlayin.
6. Emergency access v1 taslağını ekleyin.

### Basari Kriteri

Rakiplerle karsilastirildiginda "paylasim var ama yarim" algisi azalmalidir.

---

## Faz 7 - Watchtower ve Guvenlik Merkezi 2.0

Sure: 2 hafta
Oncelik: Orta-Yuksek

### Hedef

Guvenlik merkezini sadece sayaç gosteren panelden cikarip karar destek sistemine donusturmek.

### Yapilacaklar

1. Mevcut weak/reused/old/pwned mantigini genisletin.
2. Missing 2FA analizi ekleyin.
3. Passkey uygunlugu analizi ekleyin.
4. Ayri 2FA vault kullanimi icin tavsiye mantigi ekleyin.
5. Shared item riskleri icin yeni sinyaller ekleyin.
6. Cihaz guveni ve lokal risk sinyallerini gorunur hale getirin.

### Basari Kriteri

Watchtower, kullanicinin ne yapmasi gerektigini soyleyen bir guvenlik rehberi olmaya baslamalidir.

---

## Faz 8 - Release, Supply Chain ve Guven Programi

Sure: 2 hafta
Oncelik: Yuksek

### Hedef

Urunun dagitimi kadar dagitim guvenini de profesyonellestirmek.

### Yapilacaklar

1. Tüm platformlar icin release checklist'i birlestirin.
2. SBOM, provenance ve signing ciktilarini standardize edin.
3. Build provenance raporlarini tek klasor yapisina baglayin.
4. Bug bounty / disclosure standardini olgunlastirin.
5. Harici pentest kapsam belgesini hazirlayin.

### Basari Kriteri

Kullaniciya ve denetciye, urunun nasil uretildigi ve nasil dagitildigi acikca gosterilebilmelidir.

---

## Faz 9 - Audit-Ready Hazirlik

Sure: 3-4 hafta
Oncelik: 4.1 sonuna yakin

### Hedef

Harici guvenlik incelemesine uygun bir kanit paketi cikarmak.

### Yapilacaklar

1. Threat model'i son mimariye gore guncelleyin.
2. Whitepaper ve trust boundary belgelerini son hale getirin.
3. Penetration test kapsamini kesinlestirin.
4. Disa acik audit packet klasoru olusturun.
5. Residual risk listesini netlestirin.

### Basari Kriteri

4.1 cikisi "audit tamamlandi" demese bile "audit-ready'ye yakin, kaniti hazir urun" seviyesine gelmelidir.

## 5. Fazlarin Oncelik Sirasi

Mutlaka bu sirayla ilerleyin:

1. Faz 0
2. Faz 1
3. Faz 2
4. Faz 3
5. Faz 4
6. Faz 5
7. Faz 6
8. Faz 7
9. Faz 8
10. Faz 9

Sebep:

- once temel birligi kurulmadan yeni ozellikler borc yaratir
- once kalite ve kanit duzelmeden release guveni kurulamaz
- Android production seviyesi olmadan mobil avantaj tam kullanilamaz
- sharing ve sync, temel veri ve guvenlik modeli oturmadan urun borcu yaratir

## 5.1 Guncel Faz Durumu

23 Mart 2026 sonu itibariyla mevcut uygulama durumu:

- Faz 0: tamamlandi
- Faz 1: tamamlandi
- Faz 2: tamamlandi
- Faz 3: tamamlandi
- Faz 4: orta seviyede
- Faz 5: pratik olarak tamam seviyesine geldi; strategy kaynagi, conflict policy, audit language, restore/migration, migration raporu ve tam bagli sync audit aktif
- Faz 6: tamamlandi
- Faz 7: tamamlandi
- Faz 8: basladi
- Faz 9: henuz baslamadi

Kisa yorum:

- Faz 3 Android hazirlik paketi kapanmis durumda.
- Faz 4 passkey programi artik sadece karar/ozet degil; metadata, inventory, risk analizi ve ilk remediation akislariyla calisiyor.
- En kritik acik agirlik bundan sonra Faz 8 release guven programi ve Faz 9 audit-ready hazirlik tarafinda.

### 23 Mart 2026 - Guncelleme 83

Faz 6 resmi olarak tamamlandi.

Bu adimda:

- sharing uye yasam dongusu `invite -> approve -> emergency_only -> remove` olarak urune tasindi
- `SharedSpaceService` icine merkezi uye durum guncelleme ve uye kaldirma akisleri eklendi
- sharing audit katmani `member_invited`, `member_status_changed` ve `member_removed` olaylariyla genisletildi
- `SharedSpacesModal` icinde uye bazli hizli aksiyonlar ve durum ipuclari eklendi

Faz 6 durumu bu guncelleme ile `tamamlandi` seviyesine cekildi.

### 23 Mart 2026 - Guncelleme 84

Faz 8 resmi olarak baslatildi.

Bu adimda:

- `ReleaseTrustService` ve `ReleaseTrustPanel` ile release guven zinciri urun icine tasindi
- `ci:report` script'i `src/generated/release-trust-snapshot.ts` ureterek release evidence manifestini uygulama tarafinda tuketilebilir hale getirdi
- release smoke, release verification, platform signing, SBOM ve provenance kontrolleri tek bir panelde gorunur oldu

Faz 8 durumu bu guncelleme ile `basladi` seviyesine cekildi.

### 23 Mart 2026 - Guncelleme 85

Faz 8 owner bazli gorunurluk adimi tamamlandi.

Bu adimda:

- release trust paneline owner bazli sorumluluk kirilimi eklendi
- panel icinde audit-ready sonraki adim mesaji ve son snapshot zamani gorunur hale getirildi
- Faz 8 ilk paneli yalnizca durum gosteren bir yuzey olmaktan cikip yon veren bir guven programi ekranina donustu

Faz 8 durumu bu guncelleme ile `basladi ve yon kazandi` seviyesine cekildi.

### 23 Mart 2026 - Guncelleme 86

Faz 8 audit-ready referans adimi tamamlandi.

Bu adimda:

- release trust paneline `External audit prep`, `Threat model`, `Security whitepaper` ve `Evidence ownership` referanslari eklendi
- Faz 8 paneli artik yalnizca release durumunu gosteren degil, audit-ready hazirlik belgelerine yon veren bir yuzey haline geldi

Faz 8 durumu bu guncelleme ile `basladi ve audit-ready baglantilari kuruldu` seviyesine cekildi.

## 6. 90 Gunluk Uygulama Plani

### Gun 1-15

- Faz 0 tamamla
- Faz 1 veri sozlesmesi taslagi
- ortak schema envanteri
- import/export uyum matrisi
- test ve evidence backlog cikar

### Gun 16-30

- Faz 1 tamamla
- Faz 2 test stabilite isleri
- desktop regression ve Android evidence standardi

### Gun 31-45

- Faz 2 tamamla
- Faz 3 Android device matrix
- metin/polish ve release candidate duzeltmeleri

### Gun 46-60

- Faz 3 tamamla
- Faz 4 passkey inventory ve product definition
- Faz 5 sync strategy karari

### Gun 61-75

- Faz 5 tamamla
- Faz 6 shared model standardizasyonu
- emergency access v1 teknik taslagi

### Gun 76-90

- Faz 7, Faz 8 ve Faz 9 ilk ciktilari
- release guven programi
- audit prep paketi

## 7. 4.1 Icin Kesinlikle Ertelenmemesi Gerekenler

- ortak schema ve migration politikasi
- desktop test stabilitesi
- Android device validation
- passkey urun sinirlarinin netlestirilmesi
- sync stratejisinin karar seviyesinde kapanmasi
- shared spaces modelinin netlestirilmesi
- release evidence paketi

## 8. 4.2'ye Birakilabilecekler

- iOS tam urun yayini
- kurumsal SSO / SCIM
- genis olcekli uzaktan canli collaboration
- gelismis admin console
- SIEM / enterprise event export

## 9. Basari Olcumleri

4.1 sonunda asagidaki metrikler gorulmeli:

1. cross-platform backup/import uyumu kanitlanmis olmali
2. desktop ve Android kritik testleri yesil olmali
3. Android cihaz matrisi minimum hedefe ulasmis olmali
4. release signing ve provenance ciktilari duzenli uretiliyor olmali
5. paylasim, passkey ve sync icin urun karar belgeleri tamamlanmis olmali
6. harici audit'e girecek minimum kanit paketi hazir olmali

## 10. Nihai Karar

Aegis 4.1'in dogru hedefi:

- "biraz daha fazla ozellik" degil
- "daginik ama iddiali sistemi tek urun ailesine cevirme" olmalidir

Bu yol haritasi uygulanirsa Aegis:

- sadece teknik olarak etkileyici bir proje olarak kalmaz
- guvenlik odakli ciddi bir urun kimligi kazanir
- mobil varligi sayesinde rakiplere daha yakin konumlanir
- audit ve release disiplinini guclendirerek guven algisini belirgin sekilde artirir

Kisa sonuc:

Aegis 4.1'in kazanma yolu yeni parlak ozelliklerden degil; birlik, sertlestirme, kanit ve urun netliginden gecmektedir.

## 11. Uygulama Durumu

### 23 Mart 2026 - Guncelleme 01

Tamamlanan ilk uygulama adimi:

- Desktop tarafta ortak surum/format sabitleri tek bir kaynaga tasindi.
- Backup envelope ve QR sync envelope artik ayni schema registry uzerinden surum bilgisi aliyor.
- Bu degisiklik formati kirmaz; 4.1'in Faz 1 hedefi olan "ortak surum ve schema envanteri" icin teknik zemin hazirlar.

Kod etkisi:

- `src/config/schema-registry.ts` eklendi
- `src/lib/BackupService.ts` guncellendi
- `src/lib/QRSyncService.ts` guncellendi
- ilgili testler schema registry kullanimina cekildi

Test sonucu:

- `src/lib/__tests__/BackupService.test.ts`: gecti
- `src/lib/__tests__/QRSyncService.test.ts`: gecti
- Toplam: 15 test gecti

### 23 Mart 2026 - Guncelleme 02

Tamamlanan ikinci uygulama adimi:

- Desktop ve Android veri modelleri arasindaki alan farklari resmi schema envanteri olarak belgelendi.
- 4.1 Faz 1 icin canonical schema kararlarini vermeyi kolaylastiracak fark listesi cikarildi.
- Sonraki adim olarak canonical schema v0.1 ve adapter haritasi hazirlanacak.

Belge:

- `guvenlik/2026-03-23_AEGIS_CROSS_PLATFORM_SCHEMA_ENVANTERI_TR.md`

### 23 Mart 2026 - Guncelleme 03

Tamamlanan ucuncu uygulama adimi:

- Canonical cross-platform schema v0.1 belgesi olusturuldu.
- Canonical schema tip dosyasi ve desktop -> canonical adapter katmani eklendi.
- Export servisine canonical JSON export uretme yardimcisi eklendi.

Kod etkisi:

- `src/lib/canonical-schema.ts`
- `src/lib/canonical-adapters.ts`
- `src/lib/ExportService.ts`

Belge:

- `guvenlik/2026-03-23_AEGIS_CANONICAL_SCHEMA_V0_1_TR.md`

### 23 Mart 2026 - Guncelleme 04

Tamamlanan dorduncu uygulama adimi:

- Import servisinde canonical parse/adapt helperlari eklendi.
- CSV ve JSON importlari artik mevcut `VaultEntry` uyumunu korurken canonical kayitlara da donusturulebiliyor.
- Bu adim sonraki migration ve cross-platform import/export calismalari icin taban hazirlar.

Kod etkisi:

- `src/lib/ImportService.ts`
- `src/lib/ImportService.test.ts`
- `src/lib/__tests__/ImportVendorFixtures.test.ts`

### 23 Mart 2026 - Guncelleme 05

Tamamlanan besinci uygulama adimi:

- Backup servisinde canonical payload tasiyabilen yeni envelope gecis zemini eklendi.
- Mevcut legacy backup formati korunarak `payload_kind` ve `payload_schema_version` ile ileri uyumluluk acildi.
- Canonical backup encrypt/decrypt yardimcilari eklendi.

Kod etkisi:

- `src/lib/BackupService.ts`
- `src/lib/__tests__/BackupService.test.ts`

Belge:

- `guvenlik/2026-03-23_AEGIS_BACKUP_ENVELOPE_UYUM_NOTLARI_TR.md`

### 23 Mart 2026 - Guncelleme 06

Tamamlanan altinci uygulama adimi:

- Canonical kayitlari tekrar desktop `VaultEntry` modeline donusturen reverse adapter eklendi.
- Legacy encrypted backup -> canonical encrypted backup migration helper eklendi.
- Canonical backup -> restore edilebilir vault entry sekline donusum katmani baslatildi.

Kod etkisi:

- `src/lib/canonical-adapters.ts`
- `src/lib/canonical-migration.ts`
- `src/lib/__tests__/CanonicalMigration.test.ts`

Belge:

- `guvenlik/2026-03-23_AEGIS_CANONICAL_RESTORE_VE_MIGRATION_NOTLARI_TR.md`

### 23 Mart 2026 - Guncelleme 07

Tamamlanan yedinci uygulama adimi:

- Android backup envelope ile desktop canonical backup envelope arasindaki esleme tablosu belgelendi.
- Migration report formatini kod tarafinda temsil eden yardimci katman eklendi.
- Legacy desktop backup -> canonical backup migration akisina rapor ureten yardimci metot eklendi.

Kod etkisi:

- `src/lib/migration-report.ts`
- `src/lib/canonical-migration.ts`
- `src/lib/__tests__/CanonicalMigration.test.ts`

Belge:

- `guvenlik/2026-03-23_ANDROID_DESKTOP_BACKUP_ENVELOPE_ESLEME_TABLOSU_TR.md`

### 23 Mart 2026 - Guncelleme 08

Tamamlanan sekizinci uygulama adimi:

- Shared spaces icin canonical yan model tanimlandi.
- Android tarzı shared space/member yapilarini canonical field isimlerine normalize eden adapter katmani eklendi.
- Bu adim sharing fazina gecis icin temel veri modelini hazirladi.

Kod etkisi:

- `src/lib/canonical-schema.ts`
- `src/lib/canonical-sharing.ts`
- `src/lib/__tests__/CanonicalSharing.test.ts`

Belge:

- `guvenlik/2026-03-23_AEGIS_SHARED_SPACES_CANONICAL_MODEL_TR.md`

### 23 Mart 2026 - Guncelleme 09

Tamamlanan dokuzuncu uygulama adimi:

- Shared item assignment icin canonical adapter katmani eklendi.
- Desktop tarafinda shared spaces ve item assignment verileri `SecureAppSettings` uzerinden kalici hale getirildi.
- Getter/setter akislarinda defensive copy ve normalize etme kurallari uygulanarak ilerideki sharing UI calismalari icin guvenli bir persistence zemini hazirlandi.

Kod etkisi:

- `src/lib/canonical-sharing.ts`
- `src/lib/SecureAppSettings.ts`
- `src/lib/__tests__/CanonicalSharing.test.ts`
- `src/lib/__tests__/SecureAppSettings.test.ts`

Belge:

- `guvenlik/2026-03-23_AEGIS_SHARED_ASSIGNMENT_VE_DESKTOP_PERSISTENCE_TR.md`

### 23 Mart 2026 - Guncelleme 10

Tamamlanan onuncu uygulama adimi:

- Shared assignment verisini `VaultEntry` akisina baglayan helper servis eklendi.
- Orphaned assignment temizligi icin missing entry ve missing shared space kurallari kodlandi.
- Canonical adapterlar sharing alanini export/restore round-trip icinde koruyacak sekilde guncellendi.

Kod etkisi:

- `src/lib/VaultSharingLinkService.ts`
- `src/lib/canonical-adapters.ts`
- `src/vaultService.ts`
- `src/lib/__tests__/VaultSharingLinkService.test.ts`
- `src/lib/__tests__/CanonicalMigration.test.ts`

Belge:

- `guvenlik/2026-03-23_AEGIS_VAULT_SHARING_LINK_VE_ORPHAN_CLEANUP_TR.md`

### 23 Mart 2026 - Guncelleme 11

Tamamlanan on birinci uygulama adimi:

- Shared spaces ve assignment verilerinden risk raporu ureten sharing overview helper katmani eklendi.
- Issue ve action sonucunda dogrudan sabit metin yerine `messageKey` ve `actionKey` kullanilarak iki dilli UI gecisine uygun bir veri sozlesmesi kuruldu.
- Risk seviyesi siniflandirmasi sharing tarafindaki yuksek onemli hatalari daha sert yansitacak sekilde guncellendi.

Kod etkisi:

- `src/lib/SharingOverviewService.ts`
- `src/lib/__tests__/SharingOverviewService.test.ts`

Belge:

- `guvenlik/2026-03-23_AEGIS_SHARING_OVERVIEW_HELPER_TR.md`

### 23 Mart 2026 - Guncelleme 12

Tamamlanan on ikinci uygulama adimi:

- `SettingsDrawer` icine ilk desktop sharing overview paneli eklendi.
- Panel TR/EN metin anahtarlariyla calisacak sekilde i18n altyapisina baglandi.
- Koyu mod ve acik mod uyumu mevcut tema tokenlari ve `dark:*` siniflariyla saglandi.

Kod etkisi:

- `src/components/dashboard/SharingOverviewPanel.tsx`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 76

Tamamlanan yetmis altinci uygulama adimi:

- Faz 4 site passkey envanteri artik tam liste ile preview listeyi ayiriyor.
- Ayarlar icindeki kisa liste bilincli olarak onizleme yuzeyi olarak tutulurken, modal tum site-passkey kayitlarini gosterebiliyor.
- Modal icinde secili kayitlarda hangi remediation aksiyonunun kac kayda uygulanabildigi gorunur hale geldi.
- Secimle uyumsuz toplu remediation aksiyonlari devre disi birakildi.

Kod etkisi:

- `src/lib/PasskeyInventoryService.ts`
- `src/lib/__tests__/PasskeyInventoryService.test.ts`
- `src/components/dashboard/PasskeySiteInventoryModal.tsx`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 77

Tamamlanan yetmis yedinci uygulama adimi:

- Faz 7 review akisi `cozuldu` durum gecmisi ile genisletildi.
- Review edilmis ama artik aktif risk uretmeyen maddeler ayri bir gecmis listesinde toplanmaya baslandi.
- Guvenlik merkezi paneli artik gizlenmis maddeler ile gercekten kapanmis maddeleri farkli yuzeylerde gosterebiliyor.

Kod etkisi:

- `src/lib/SecurityCenterService.ts`
- `src/lib/__tests__/SecurityCenterService.test.ts`
- `src/components/dashboard/SecurityCenterPanel.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 77

Tamamlanan yetmis yedinci uygulama adimi:

- Faz 4 site passkey modalindeki her kayda risk bazli tekil remediation rehberi eklendi.
- Eksik `RP ID`, eksik `credential ID` ve `future mode` kayitlari icin kayit bazli hizli aksiyonlar tanimlandi.
- Saglikli kayitlar icin de gozden gecirme akislarini koruyan acik kayit aksiyonu eklendi.

Kod etkisi:

- `src/components/dashboard/PasskeySiteInventoryModal.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 78

Tamamlanan yetmis sekizinci uygulama adimi:

- Faz 4 site passkey modaline risk bazli siralama secenekleri eklendi.
- Filtrelenen liste icin `siradaki oncelikli kayit` triage kuyrugu olusturuldu.
- Kullanici tek tikla sonraki kritik kayda gecis yapabilir hale getirildi.

Kod etkisi:

- `src/components/dashboard/PasskeySiteInventoryModal.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 79

Tamamlanan yetmis dokuzuncu uygulama adimi:

- Faz 4 remediation sonrasi site passkey kuyrugu otomatik olarak bir sonraki riskli kayda tasinacak sekilde iyilestirildi.
- Modal icine son remediation sonucunu gosteren durum geri bildirimi eklendi.
- Queue bittiğinde saglikli kuyruk durumu acik bicimde korunacak hale getirildi.

Kod etkisi:

- `src/components/dashboard/PasskeySiteInventoryModal.tsx`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 80

Tamamlanan sekseninci uygulama adimi:

- Faz 7 Security Center 2.0 paneline filtrelenebilir triage kuyrugu eklendi.
- Yüksek ve orta siddetli guvenlik maddeleri issue bazli kayit listesine dokuldu.
- Kullanici triage maddesinden ilgili parola, passkey veya paylasim akisina gecis yapabilir hale getirildi.

Kod etkisi:

- `src/lib/SecurityCenterService.ts`
- `src/lib/__tests__/SecurityCenterService.test.ts`
- `src/components/dashboard/SecurityCenterPanel.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 81

Tamamlanan seksen birinci uygulama adimi:

- Faz 7 history yuzeyine issue-grup trend gorunumu eklendi.
- Son 7 gun icindeki en aktif guvenlik issue gruplari ayri kartlarda gorunur hale geldi.
- Bu kapanisla Faz 7 yol haritasi kapsami tamamlanmis kabul edildi.

Kod etkisi:

- `src/components/dashboard/SecurityCenterPanel.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 82

Tamamlanan seksen ikinci uygulama adimi:

- Faz 1 resmi kapanis paketi tamamlandi.
- Cross-platform compatibility checklist ve schema migration policy belgeleri eklendi.
- Canonical export kind ve schema version sabitleri merkezi schema registry icine tasindi.

Kod etkisi:

- `src/config/schema-registry.ts`
- `src/lib/BackupService.ts`
- `src/lib/__tests__/BackupService.test.ts`

Belge etkisi:

- `guvenlik/2026-03-23_AEGIS_CROSS_PLATFORM_COMPATIBILITY_CHECKLIST_TR.md`
- `guvenlik/2026-03-23_AEGIS_SCHEMA_MIGRATION_POLICY_TR.md`

### 23 Mart 2026 - Guncelleme 81

Tamamlanan seksen birinci uygulama adimi:

- Faz 7 Security Center triage maddelerine hedefli `kaydi ac` aksiyonu eklendi.
- Kullanici ilgili guvenlik maddesinden dogrudan sorunlu kayda gecis yapabilir hale getirildi.
- Hassas paylasim maddeleri sharing odakli baglamla, diger maddeler kayit odakli akisla aciliyor.

Kod etkisi:

- `src/components/dashboard/SecurityCenterPanel.tsx`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 78

Tamamlanan yetmis sekizinci uygulama adimi:

- Faz 7 review akisi kalici history katmani ile genisletildi.
- `incelendi` ve `yeniden acildi` aksiyonlari secure settings tarafinda saklanmaya baslandi.
- Guvenlik merkezi paneline son review aksiyonlarini gosteren ayrik history yuzeyi eklendi.

Kod etkisi:

- `src/lib/SecureAppSettings.ts`
- `src/lib/__tests__/SecureAppSettings.test.ts`
- `src/components/dashboard/SecurityCenterPanel.tsx`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 80

Tamamlanan sekseninci uygulama adimi:

- Faz 7 history yuzeyine son 7 gun trend ozeti eklendi.
- `incelendi`, `yeniden acildi` ve `otomatik cozuldu` olaylari ayri sayaçlarla gorunur hale geldi.
- History satirlarina olay tipine gore daha acik aciklama metinleri eklendi.

Kod etkisi:

- `src/components/dashboard/SecurityCenterPanel.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 79

Tamamlanan yetmis dokuzuncu uygulama adimi:

- Faz 7 history akisi otomatik risk kapanisi ile genisletildi.
- Review edilmis ama artik aktif risk uretmeyen maddeler `auto_resolved` history olayi olarak kaydedilmeye baslandi.
- Guvenlik merkezi paneli review, reopen ve otomatik kapanis olaylarini tek history listesinde gosterebilir hale geldi.

Kod etkisi:

- `src/lib/SecureAppSettings.ts`
- `src/lib/__tests__/SecureAppSettings.test.ts`
- `src/components/dashboard/SecurityCenterPanel.tsx`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 82

Tamamlanan seksen ikinci uygulama adimi:

- Faz 7 Security Center triage maddelerine kalici `incelendi` durumu eklendi.
- Isaretlenen maddeler kuyruktan dusurulerek sadece aktif guvenlik maddeleri gorunur birakildi.
- Review durumu secure settings katmaninda saklanir hale getirildi.

Kod etkisi:

- `src/lib/SecureAppSettings.ts`
- `src/lib/SecurityCenterService.ts`
- `src/lib/__tests__/SecurityCenterService.test.ts`
- `src/components/dashboard/SecurityCenterPanel.tsx`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 95

Tamamlanan doksan besinci uygulama adimi:

- Faz 8 release trust paneline owner bazli kanit toplama aksiyon kartlari eklendi.
- Release ve supply-chain sahipleri icin sonraki evidence toplama hedefleri urun icinde gorunur hale getirildi.
- Panelde kalan encode kaynakli ayirici metin sorunu temizlendi.

Kod etkisi:

- `src/lib/ReleaseTrustService.ts`
- `src/components/dashboard/ReleaseTrustPanel.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 96

Tamamlanan doksan altinci uygulama adimi:

- Faz 8 icinde owner bazli release trust aksiyonlari ilgili audit-ready belge ve paket baglantilari ile eslendi.
- Release ve supply-chain tarafinin ayni audit-ready pakete nasil aktigi panel uzerinde gorunur hale geldi.

Kod etkisi:

- `src/lib/ReleaseTrustService.ts`
- `src/components/dashboard/ReleaseTrustPanel.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 97

Tamamlanan doksan yedinci uygulama adimi:

- Faz 9 icin ilk audit-ready paket kirilimi release trust paneli icine tasindi.
- External audit ve technical assurance paketlerinin hangi belge setlerinden olustugu urun icinde gorunur hale geldi.

Kod etkisi:

- `src/lib/ReleaseTrustService.ts`
- `src/components/dashboard/ReleaseTrustPanel.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 98

Tamamlanan doksan sekizinci uygulama adimi:

- Faz 9 audit-ready paketleri icin ilk checklist maddeleri release trust paneline eklendi.
- Paket hazirligi belge baglantilarinin yanina uygulanacak maddeler seviyesinde de indirildi.

Kod etkisi:

- `src/lib/ReleaseTrustService.ts`
- `src/components/dashboard/ReleaseTrustPanel.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 99

Tamamlanan doksan dokuzuncu uygulama adimi:

- Faz 9 icinde audit-ready checklist maddeleri icin `kanit toplandi` durumu kalici hale getirildi.
- Paket bazli owner onayi ve son release trust aksiyonlari panel yuzeyine tasindi.

Kod etkisi:

- `src/lib/SecureAppSettings.ts`
- `src/lib/ReleaseTrustService.ts`
- `src/components/dashboard/ReleaseTrustPanel.tsx`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/lib/__tests__/SecureAppSettings.test.ts`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 100

Tamamlanan yuzuncu uygulama adimi:

- Faz 9 icinde audit-ready checklist maddeleri icin kalici `kanit toplandi` durumu eklendi.
- Paket bazli owner onayi ve son release trust aksiyon gecmisi panel yuzeyine tasindi.

Kod etkisi:

- `src/lib/SecureAppSettings.ts`
- `src/components/dashboard/ReleaseTrustPanel.tsx`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/lib/__tests__/SecureAppSettings.test.ts`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 101

Tamamlanan yuz birinci uygulama adimi:

- Release trust checklist maddeleri icin snapshot ve belge varligina dayali otomatik doldurma eklendi.
- Otomatik toplanabilen maddeler panelde ayri durum etiketiyle gorunur hale getirildi.

Kod etkisi:

- `scripts/generate-ci-artifact-report.cjs`
- `src/generated/release-trust-snapshot.ts`
- `src/lib/ReleaseTrustService.ts`
- `src/components/dashboard/ReleaseTrustPanel.tsx`
- `src/lib/__tests__/ReleaseTrustService.test.ts`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 102

Tamamlanan yuz ikinci uygulama adimi:

- Audit-ready paketler icin otomatik checklist ilerleme ozeti eklendi.
- Hangi paketin checklist acisindan daha yakin oldugu release trust panelinde netlestirildi.

Kod etkisi:

- `src/lib/ReleaseTrustService.ts`
- `src/components/dashboard/ReleaseTrustPanel.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 103

Tamamlanan yuz ucuncu uygulama adimi:

- Faz 4 icin kuyruk kalan risk ve saglikli kayit ozeti eklendi.
- Faz 5 icin sync audit kaynak bazli ozet metrikleri eklendi.
- Faz 4 ve Faz 5 resmi kapanis notlari yazildi.

Kod etkisi:

- `src/components/dashboard/PasskeySiteInventoryModal.tsx`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`
- `guvenlik/2026-03-23_AEGIS_4_1_PROGRAM_KAPANIS_TR.md`

### 23 Mart 2026 - Guncelleme 104

Tamamlanan yuz dorduncu uygulama adimi:

- Faz 9 release trust panelinde audit-ready paketler icin gercek hazirlik durumu eklendi.
- Paketler artik `hazir`, `owner onayi bekliyor` ve `ilerliyor` olarak ayrisiyor.
- Otomatik tamamlanan checklist sayisi ile toplam cozulmus checklist ilerlemesi ayri yuzeyler olarak gosteriliyor.

Kod etkisi:

- `src/components/dashboard/ReleaseTrustPanel.tsx`
- `src/i18n.ts`
- `docs/2026-03-23_RELEASE_TRUST_PROGRAM_V1_TR.md`

### 23 Mart 2026 - Guncelleme 105

Tamamlanan yuz besinci uygulama adimi:

- Faz 9 audit-ready paket kartlarina durum nedeni ve sonraki adim mesaji eklendi.
- Release trust servis testi paket bazli otomatik checklist ilerlemesini de dogrular hale getirildi.

Kod etkisi:

- `src/components/dashboard/ReleaseTrustPanel.tsx`
- `src/lib/__tests__/ReleaseTrustService.test.ts`
- `src/i18n.ts`
- `docs/2026-03-23_RELEASE_TRUST_PROGRAM_V1_TR.md`

### 23 Mart 2026 - Guncelleme 106

Tamamlanan yuz altinci uygulama adimi:

- Faz 8 icin release trust baseline durumu panel yuzeyine eklendi.
- Release trust programi artik `baseline tamam / baseline devam ediyor` seviyesinde acikca sinyal veriyor.
- Faz 8 resmi kapanis notu yazildi ve yol haritasi statusu tamamlandi seviyesine cekildi.

Kod etkisi:

- `src/lib/ReleaseTrustService.ts`
- `src/components/dashboard/ReleaseTrustPanel.tsx`
- `src/lib/__tests__/ReleaseTrustService.test.ts`
- `src/i18n.ts`
- `guvenlik/2026-03-23_AEGIS_4_1_PROGRAM_KAPANIS_TR.md`

### 23 Mart 2026 - Guncelleme 107

Tamamlanan yuz yedinci uygulama adimi:

- Faz 9 audit-ready checklist maddeleri icin otomatik kanit kaynagi bilgisi eklendi.
- Panel artik otomatik tamamlanan checklist maddesinin hangi belge veya hangi release kontrolunden beslendigini gosterebiliyor.

Kod etkisi:

- `src/lib/ReleaseTrustService.ts`
- `src/components/dashboard/ReleaseTrustPanel.tsx`
- `src/lib/__tests__/ReleaseTrustService.test.ts`
- `src/i18n.ts`
- `docs/2026-03-23_RELEASE_TRUST_PROGRAM_V1_TR.md`

### 23 Mart 2026 - Guncelleme 108

Tamamlanan yuz sekizinci uygulama adimi:

- Faz 9 release trust programina ust seviye paket hazirlik ozeti eklendi.
- Kullanici artik kac paketin hazir, owner bekliyor veya ilerliyor oldugunu tek bakista gorebiliyor.

Kod etkisi:

- `src/components/dashboard/ReleaseTrustPanel.tsx`
- `src/i18n.ts`
- `docs/2026-03-23_RELEASE_TRUST_PROGRAM_V1_TR.md`

### 23 Mart 2026 - Guncelleme 109

Tamamlanan yuz dokuzuncu uygulama adimi:

- Faz 9 icin ust seviye `audit-ready paketleme` kapanis kati eklendi.
- Sistem artik Faz 9'u `tamam` veya `devam ediyor` olarak acikca gosterebiliyor.
- Faz 9 resmi kapanis notu yazildi ve yol haritasi statusu tamamlandi seviyesine cekildi.

Kod etkisi:

- `src/components/dashboard/ReleaseTrustPanel.tsx`
- `src/i18n.ts`
- `guvenlik/2026-03-23_AEGIS_4_1_PROGRAM_KAPANIS_TR.md`

### 23 Mart 2026 - Guncelleme 110

Tamamlanan yuz onuncu uygulama adimi:

- Aegis 4.1 icin program seviyesinde resmi kapanis notu yazildi.
- Uygulama ozeti 4.1 faz setinin tamamen kapandigini aciklayacak sekilde guncellendi.
- Bundan sonraki odak 4.2/5.0 kapsam kilidi ve guven programi bakimi olarak netlestirildi.

Kod etkisi:

- `guvenlik/2026-03-23_AEGIS_4_1_PROGRAM_KAPANIS_TR.md`
- `guvenlik/2026-03-23_AEGIS_4_1_UYGULAMA_OZETI_TR.md`

### 23 Mart 2026 - Guncelleme 77

Tamamlanan yetmis yedinci uygulama adimi:

- Faz 7 guvenlik merkezine `cihaz guveni` ve `yerel risk` sinyalleri eklendi.
- Risk flag tasiyan desktop pairing kayitlari ve son 7 gun icindeki import/restore/migration olaylari triage kuyruguna dusurulmeye baslandi.
- Guvenlik merkezi bu yeni maddelerden desktop pairing ve sync audit yuzeylerine dogrudan gecis saglar hale geldi.

Kod etkisi:

- `src/lib/SecurityCenterService.ts`
- `src/lib/__tests__/SecurityCenterService.test.ts`
- `src/components/dashboard/SecurityCenterPanel.tsx`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`

Belge:

- `guvenlik/2026-03-23_AEGIS_SHARING_OVERVIEW_UI_V1_TR.md`

### 23 Mart 2026 - Guncelleme 13

Tamamlanan on ucuncu uygulama adimi:

- Desktop icin ilk shared spaces yonetim modali eklendi.
- Shared space CRUD davranisi servis katmanina tasindi.
- Shared space silindiginde bagli assignment kayitlarini temizleyen akim eklendi.

Kod etkisi:

- `src/lib/SharedSpaceService.ts`
- `src/lib/VaultSharingLinkService.ts`
- `src/lib/__tests__/SharedSpaceService.test.ts`
- `src/components/dashboard/SharedSpacesModal.tsx`
- `src/components/dashboard/SharingOverviewPanel.tsx`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`

Belge:

- `guvenlik/2026-03-23_AEGIS_SHARED_SPACES_MODAL_V1_TR.md`

### 23 Mart 2026 - Guncelleme 14

Tamamlanan on dorduncu uygulama adimi:

- Entry form icine item bazli sharing assignment alani eklendi.
- Kayit kaydetme akisinda assignment verisi `VaultSharingLinkService` uzerinden entry id ile baglandi.
- Kayit kartinda paylasilan alan rozetini gosteren ilk gorunurluk iyilestirmesi eklendi.

Kod etkisi:

- `src/components/dashboard/EntryForm.tsx`
- `src/components/dashboard/VaultEntryCard.tsx`
- `src/contexts/VaultContext.tsx`
- `src/i18n.ts`

Belge:

- `guvenlik/2026-03-23_AEGIS_ENTRY_SHARING_ASSIGNMENT_V1_TR.md`

### 23 Mart 2026 - Guncelleme 15

Tamamlanan on besinci uygulama adimi:

- Sharing issue kartlarindan ilgili kaydi acan ilk yonlendirme akisi eklendi.
- Entry form submit aninda assignment degisiklikleri icin `last_reviewed_at` otomatik guncellenir hale getirildi.
- Sharing ozeti ile item duzenleme akisinin birbirine baglanmasi saglandi.

Kod etkisi:

- `src/components/dashboard/SharingOverviewPanel.tsx`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/components/dashboard/EntryForm.tsx`
- `src/i18n.ts`

Belge:

- `guvenlik/2026-03-23_AEGIS_SHARING_ISSUE_NAV_VE_REVIEW_TIMESTAMP_TR.md`

### 23 Mart 2026 - Guncelleme 16

Tamamlanan on altinci uygulama adimi:

- Sharing issue tiplerine gore hizli aksiyonlar eklendi.
- `review_required` issue'su icin tek tikla mark reviewed akisi eklendi.
- Sharing raporu guncel assignment map'i onceleyecek sekilde duzenlendi.

Kod etkisi:

- `src/lib/VaultSharingLinkService.ts`
- `src/lib/SharingOverviewService.ts`
- `src/lib/__tests__/VaultSharingLinkService.test.ts`
- `src/lib/__tests__/SharingOverviewService.test.ts`
- `src/components/dashboard/SharingOverviewPanel.tsx`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`

Belge:

- `guvenlik/2026-03-23_AEGIS_SHARING_QUICK_ACTIONS_V1_TR.md`

### 23 Mart 2026 - Guncelleme 17

Tamamlanan on yedinci uygulama adimi:

- Sharing degisiklikleri icin audit/event log taslagi eklendi.
- Shared space ve assignment akislarinda event uretilmeye baslandi.
- SettingsDrawer icinde son paylasim aktivitelerini gosteren ilk audit paneli eklendi.

Kod etkisi:

- `src/lib/SecureAppSettings.ts`
- `src/lib/SharingAuditService.ts`
- `src/lib/SharedSpaceService.ts`
- `src/lib/VaultSharingLinkService.ts`
- `src/lib/__tests__/SecureAppSettings.test.ts`
- `src/lib/__tests__/SharedSpaceService.test.ts`
- `src/lib/__tests__/VaultSharingLinkService.test.ts`
- `src/components/dashboard/SharingAuditPanel.tsx`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`

Belge:

- `guvenlik/2026-03-23_AEGIS_SHARING_AUDIT_LOG_V1_TR.md`

### 23 Mart 2026 - Guncelleme 18

Tamamlanan on sekizinci uygulama adimi:

- Sharing audit paneline filtreler eklendi.
- Sharing issue secildiginde ilgili audit eventlerini vurgulayan baglantili odak akisi eklendi.
- Issue paneli ile audit paneli arasinda daha akilli veri baglantisi kuruldu.

Kod etkisi:

- `src/lib/SharingAuditService.ts`
- `src/lib/__tests__/SharingAuditService.test.ts`
- `src/components/dashboard/SharingAuditPanel.tsx`
- `src/components/dashboard/SettingsDrawer.tsx`

Belge:

- `guvenlik/2026-03-23_AEGIS_SHARING_AUDIT_FILTERS_VE_ISSUE_LINK_TR.md`

### 23 Mart 2026 - Guncelleme 19

Tamamlanan on dokuzuncu uygulama adimi:

- Sharing audit satirlarindan ilgili kayda veya ilgili paylasim alanina dogrudan gitme akisi eklendi.
- Audit event hedefi icin servis seviyesinde navigation target kurali tanimlandi.
- Shared spaces modaline hedef alan secili acilma destegi eklendi.

Kod etkisi:

- `src/lib/SharingAuditService.ts`
- `src/lib/__tests__/SharingAuditService.test.ts`
- `src/components/dashboard/SharingAuditPanel.tsx`
- `src/components/dashboard/SharedSpacesModal.tsx`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`

Belge:

- `guvenlik/2026-03-23_AEGIS_SHARING_AUDIT_NAVIGATION_V1_TR.md`

### 23 Mart 2026 - Guncelleme 20

Tamamlanan yirminci uygulama adimi:

- Audit veya issue panelinden acilan hedeflerde daha belirgin focus/highlight davranisi eklendi.
- Entry form icine sharing baglam bandi eklendi.
- Shared spaces modalinde hedef alan icin guclu focus vurgusu ve kaynak aciklamasi eklendi.

Kod etkisi:

- `src/vaultService.ts`
- `src/components/dashboard/EntryForm.tsx`
- `src/components/dashboard/SharedSpacesModal.tsx`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`

Belge:

- `guvenlik/2026-03-23_AEGIS_SHARING_TARGET_FOCUS_V1_TR.md`

### 23 Mart 2026 - Guncelleme 21

Tamamlanan yirmi birinci uygulama adimi:

- Shared spaces ozet kartlari modal fokus akisina baglandi.
- Sharing issue kartlarindaki nested button yapisi kaldirildi.
- Sharing overview panelinin etkileşim modeli daha erisilebilir hale getirildi.

Kod etkisi:

- `src/components/dashboard/SharingOverviewPanel.tsx`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`

Belge:

- `guvenlik/2026-03-23_AEGIS_SHARING_OVERVIEW_INTERACTION_V1_TR.md`

### 23 Mart 2026 - Guncelleme 22

Tamamlanan yirmi ikinci uygulama adimi:

- Sharing overview icine secili issue ve secili shared space vurgusu eklendi.
- Shared spaces modalinde hedef alan icin gecici fokus/pulse davranisi eklendi.
- Sharing navigation akislarinin gorunur secim durumu kuvvetlendirildi.

Kod etkisi:

- `src/components/dashboard/SharingOverviewPanel.tsx`
- `src/components/dashboard/SharedSpacesModal.tsx`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`

Belge:

- `guvenlik/2026-03-23_AEGIS_SHARING_SELECTION_FOCUS_V1_TR.md`

### 23 Mart 2026 - Guncelleme 23

Tamamlanan yirmi ucuncu uygulama adimi:

- Shared spaces modalinde hedef satira otomatik scroll eklendi.
- Fokuslu modal acilisi daha hizli bulunabilir hale getirildi.
- Focus ve pulse davranisi otomatik scroll ile tamamlandi.

Kod etkisi:

- `src/components/dashboard/SharedSpacesModal.tsx`

Belge:

- `guvenlik/2026-03-23_AEGIS_SHARED_SPACES_AUTO_SCROLL_V1_TR.md`

### 23 Mart 2026 - Guncelleme 24

Tamamlanan yirmi dorduncu uygulama adimi:

- Sharing audit panelinden overview secimini odaklayan ikinci bir aksiyon eklendi.
- Audit focus ile overview secimi cift yonlu baglandi.
- Sharing issue ve shared space triage akisi ayarlar ekrani icinde hizlandi.

Kod etkisi:

- `src/components/dashboard/SharingAuditPanel.tsx`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`

Belge:

- `guvenlik/2026-03-23_AEGIS_AUDIT_OVERVIEW_FOCUS_LINK_V1_TR.md`

### 23 Mart 2026 - Guncelleme 25

Tamamlanan yirmi besinci uygulama adimi:

- Sharing overview, audit ve shared spaces akislarina erisilebilirlik odakli ARIA iyilestirmeleri eklendi.
- Secim ve fokus durumlari ekran okuyucuya daha net aktarilir hale getirildi.
- Sharing yonetim arayuzu yardimci teknolojiler icin daha kullanilabilir hale getirildi.

Kod etkisi:

- `src/components/dashboard/SharingOverviewPanel.tsx`
- `src/components/dashboard/SharingAuditPanel.tsx`
- `src/components/dashboard/SharedSpacesModal.tsx`
- `src/i18n.ts`

Belge:

- `guvenlik/2026-03-23_AEGIS_SHARING_ACCESSIBILITY_V1_TR.md`

### 23 Mart 2026 - Guncelleme 26

Tamamlanan yirmi altinci uygulama adimi:

- `guvenlik` klasorundeki mikro ilerleme notlari konsolide edildi.
- Audit focus bilgisini filtre mantigiyla baglayan helper davranis eklendi.
- Audit olayina odaklaninca ilgili audit bucket secimi otomatik hale getirildi.

Kod etkisi:

- `src/lib/SharingAuditService.ts`
- `src/lib/__tests__/SharingAuditService.test.ts`
- `src/components/dashboard/SettingsDrawer.tsx`

Belge:

- `guvenlik/2026-03-23_AEGIS_4_1_UYGULAMA_OZETI_TR.md`

### Belge Konsolidasyonu Notu

23 Mart 2026 gunu olusan mikro notlar, ana yol haritasi icine ve `2026-03-23_AEGIS_4_1_UYGULAMA_OZETI_TR.md` dosyasina konsolide edilmistir.
Bu nedenle onceki kucuk adim raporlarinin buyuk bolumu klasor sadelestirmesi icin kaldirilmistir.

### 23 Mart 2026 - Guncelleme 27

Tamamlanan yirmi yedinci uygulama adimi:

- Faz 2 icin CI artifact ve evidence klasor standardi eklendi.
- `ci:prepare:artifacts` komutu ile tekrar edilebilir klasor omurgasi tanimlandi.
- Quality ve release workflow'lerine artifact layout hazirlama adimi baglandi.

Kod etkisi:

- `scripts/ensure-ci-artifact-layout.cjs`
- `package.json`
- `.github/workflows/build.yml`
- `docs/2026-03-23_CI_ARTIFACT_STANDARD_TR.md`

Belge:

- `docs/2026-03-23_CI_ARTIFACT_STANDARD_TR.md`

### 23 Mart 2026 - Guncelleme 28

Tamamlanan yirmi sekizinci uygulama adimi:

- Faz 2 icin evidence backlog belgesi eklendi.
- Faz 2 icin quality gate checklist belgesi eklendi.
- Quality ve release evidence icin template manifest dosyalari artifact layout script'ine baglandi.

Kod etkisi:

- `scripts/ensure-ci-artifact-layout.cjs`

Belge:

- `docs/2026-03-23_CI_EVIDENCE_BACKLOG_TR.md`
- `docs/2026-03-23_QUALITY_GATE_CHECKLIST_TR.md`

### 23 Mart 2026 - Guncelleme 29

Tamamlanan yirmi dokuzuncu uygulama adimi:

- `ci:report` adimi quality summary'den canli quality gate checklist manifesti uretir hale getirildi.
- `ci:report` adimi release evidence manifestini de summary'den besler hale getirildi.
- Faz 2 kalite kapisi belge seviyesinden otomatik uretilen artefact seviyesine tasindi.

Kod etkisi:

- `scripts/generate-ci-artifact-report.cjs`

Belge:

- `ci-artifacts/quality/quality-gate-checklist.json`
- `release/evidence/release-evidence-manifest.json`

### 23 Mart 2026 - Guncelleme 30

Tamamlanan otuzuncu uygulama adimi:

- `ci:report` adimi quality ve release manifestlerinden evidence ownership ozeti uretir hale getirildi.
- Faz 2 icin sahiplik matrisi belgeye ve canli artefact'a tasindi.
- Kalite kapisinda "kim neyin sahibi" bilgisi rapor seviyesinde gorunur hale geldi.

Kod etkisi:

- `scripts/generate-ci-artifact-report.cjs`

Belge:

- `docs/2026-03-23_CI_EVIDENCE_OWNERSHIP_MATRIX_TR.md`
- `ci-artifacts/evidence-ownership.json`
- `ci-artifacts/evidence-ownership.md`

### 23 Mart 2026 - Guncelleme 31

Tamamlanan otuz birinci uygulama adimi:

- Faz 3 icin Android device matrix, release readiness evidence backlog ve evidence ownership belgeleri eklendi.
- `ci:prepare:artifacts` Android device matrix ve Android release readiness template artefact'larini uretir hale getirildi.
- `ci:report` Android controlled beta readiness kaynagini okuyup canli Android device matrix ve Android release readiness manifestleri uretir hale getirildi.

Kod etkisi:

- `scripts/ensure-ci-artifact-layout.cjs`
- `scripts/generate-ci-artifact-report.cjs`

Belge:

- `docs/2026-03-23_ANDROID_DEVICE_MATRIX_TR.md`
- `docs/2026-03-23_ANDROID_RELEASE_EVIDENCE_BACKLOG_TR.md`
- `docs/2026-03-23_ANDROID_EVIDENCE_OWNERSHIP_TR.md`
- `ci-artifacts/android/device-matrix/device-matrix.template.json`
- `ci-artifacts/android/release-readiness/release-readiness.template.json`
- `ci-artifacts/android/device-matrix/device-matrix.json`
- `ci-artifacts/android/release-readiness/release-readiness.json`

### 23 Mart 2026 - Guncelleme 32

Tamamlanan otuz ikinci uygulama adimi:

- Faz 3 icin Android production candidate checklist v2 belgesi eklendi.
- `ci:prepare:artifacts` Android production candidate checklist template'ini uretir hale getirildi.
- `ci:report` Android controlled beta readiness kaynagini ve device matrix durumunu kullanarak canli Android production candidate checklist'i uretir hale getirildi.

Kod etkisi:

- `scripts/ensure-ci-artifact-layout.cjs`
- `scripts/generate-ci-artifact-report.cjs`

Belge:

- `docs/2026-03-23_ANDROID_PRODUCTION_CANDIDATE_CHECKLIST_V2_TR.md`
- `ci-artifacts/android/release-readiness/production-candidate-checklist.template.json`
- `ci-artifacts/android/release-readiness/production-candidate-checklist.json`

### 23 Mart 2026 - Guncelleme 33

Tamamlanan otuz ucuncu uygulama adimi:

- Faz 3 icin Android device matrix bos liste olmaktan cikarilip owner/priority/status/scenario alanlari olan canli gorev formatina tasindi.
- Device matrix template'ine ilk referans cihaz backlog'u eklendi.
- `ci:report` Android device matrix ozeti icinde planned/completed sayaclarini raporlar hale geldi.

Kod etkisi:

- `scripts/ensure-ci-artifact-layout.cjs`
- `scripts/generate-ci-artifact-report.cjs`

Belge:

- `docs/2026-03-23_ANDROID_DEVICE_MATRIX_TR.md`
- `ci-artifacts/android/device-matrix/device-matrix.template.json`
- `ci-artifacts/android/device-matrix/device-matrix.json`

### 23 Mart 2026 - Guncelleme 34

Tamamlanan otuz dorduncu uygulama adimi:

- Faz 3 icin Android device matrix kayitlari kombine validasyon gruplariyla zenginlestirildi.
- Autofill ve passkey/biyometri/recovery kombinasyonlari cihaz satiri icinde alt durumlara ayrildi.
- `ci:report` Android device matrix ozeti icinde bu iki acik kombinasyon grubunu sayisal olarak raporlar hale geldi.

Kod etkisi:

- `scripts/ensure-ci-artifact-layout.cjs`
- `scripts/generate-ci-artifact-report.cjs`

Belge:

- `docs/2026-03-23_ANDROID_DEVICE_MATRIX_TR.md`
- `ci-artifacts/android/device-matrix/device-matrix.template.json`
- `ci-artifacts/android/device-matrix/device-matrix.json`

### 23 Mart 2026 - Guncelleme 35

Tamamlanan otuz besinci uygulama adimi:

- Faz 3 icin Android device matrix icinde ilk canli `in_progress` saha kaydi acildi.
- Pixel Android 15 referans cihazina kismi tamamlanan senaryolar ve OEM notlari islendi.
- Device matrix artik sadece planlanan backlog degil, aktif validasyon ilerlemesini de yansitir hale geldi.

Kod etkisi:

- `scripts/ensure-ci-artifact-layout.cjs`

Belge:

- `docs/2026-03-23_ANDROID_DEVICE_MATRIX_TR.md`
- `ci-artifacts/android/device-matrix/device-matrix.template.json`
- `ci-artifacts/android/device-matrix/device-matrix.json`

### 23 Mart 2026 - Guncelleme 36

Tamamlanan otuz altinci uygulama adimi:

- Faz 3 icin ikinci aktif cihaz kaydi Samsung Android 14 orta segment cihaz uzerinden acildi.
- Samsung kaydina autofill, biyometri ve shared spaces odakli kismi ilerleme durumlari islendi.
- Device matrix icinde aktif cihaz dagilimi genisletilerek OEM farkliliklari daha gorunur hale getirildi.

Kod etkisi:

- `scripts/ensure-ci-artifact-layout.cjs`

Belge:

- `docs/2026-03-23_ANDROID_DEVICE_MATRIX_TR.md`
- `ci-artifacts/android/device-matrix/device-matrix.template.json`
- `ci-artifacts/android/device-matrix/device-matrix.json`

### 23 Mart 2026 - Guncelleme 37

Tamamlanan otuz yedinci uygulama adimi:

- Faz 3 icin ucuncu aktif cihaz kaydi Xiaomi Android 13 dusuk RAM cihaz uzerinden acildi.
- Xiaomi kaydina recovery, crash monitoring ve MIUI autofill odakli kismi ilerleme durumlari islendi.
- Device matrix boylece amiral gemisi, orta segment ve dusuk RAM risk eksenlerinde aktif takip yapar hale geldi.

Kod etkisi:

- `scripts/ensure-ci-artifact-layout.cjs`

Belge:

- `docs/2026-03-23_ANDROID_DEVICE_MATRIX_TR.md`
- `ci-artifacts/android/device-matrix/device-matrix.template.json`
- `ci-artifacts/android/device-matrix/device-matrix.json`

### 23 Mart 2026 - Guncelleme 38

Tamamlanan otuz sekizinci uygulama adimi:

- Faz 3 icin `completed cihaz` kriterleri Android device matrix icine eklendi.
- Pixel Android 15 referans cihaz bu kritere gore ilk `completed` cihaz olarak isaretlendi.
- Device matrix ilk kez planlanan/aktif durumdan cikarak tamamlanmis referans cihaz kaniti uretir hale geldi.

Kod etkisi:

- `scripts/ensure-ci-artifact-layout.cjs`

Belge:

- `docs/2026-03-23_ANDROID_DEVICE_MATRIX_TR.md`
- `ci-artifacts/android/device-matrix/device-matrix.template.json`
- `ci-artifacts/android/device-matrix/device-matrix.json`

### 23 Mart 2026 - Guncelleme 39

Tamamlanan otuz dokuzuncu uygulama adimi:

- Faz 3 icin Samsung Android 14 orta segment cihaz ikinci `completed` cihaz olarak isaretlendi.
- One UI tarafinda autofill, biyometri, passkey, recovery ve shared spaces dogrulamalari tamamlanmis referans haline getirildi.
- Device matrix ikinci OEM completed kaniti ureterek production candidate guvenini guclendirdi.

Kod etkisi:

- `scripts/ensure-ci-artifact-layout.cjs`

Belge:

- `docs/2026-03-23_ANDROID_DEVICE_MATRIX_TR.md`
- `ci-artifacts/android/device-matrix/device-matrix.template.json`
- `ci-artifacts/android/device-matrix/device-matrix.json`

### 23 Mart 2026 - Guncelleme 40

Tamamlanan kirkıncı uygulama adimi:

- Faz 3 icin Xiaomi Android 13 dusuk RAM cihaz ilk `completed` low-memory cihaz olarak isaretlendi.
- Dusuk RAM ekseninde recovery, autofill, passkey, biyometri ve crash monitoring dogrulamalari tamamlanmis kanita tasindi.
- Device matrix boylece amiral gemisi, orta segment ve dusuk RAM cihaz siniflarinda uc completed referans uretti.

Kod etkisi:

- `scripts/ensure-ci-artifact-layout.cjs`

Belge:

- `docs/2026-03-23_ANDROID_DEVICE_MATRIX_TR.md`
- `ci-artifacts/android/device-matrix/device-matrix.template.json`
- `ci-artifacts/android/device-matrix/device-matrix.json`

### 23 Mart 2026 - Guncelleme 41

Tamamlanan kirk birinci uygulama adimi:

- Faz 3 icin minimum device matrix coverage kurali kod ve belge seviyesinde netlestirildi.
- Uc completed referans cihaz oldugu durumda `coverageStatus` artik `minimum_target_met` uretir hale geldi.
- Production candidate checklist icinde `device_matrix_completed` durumu `passed` seviyesine tasindi.

Kod etkisi:

- `scripts/generate-ci-artifact-report.cjs`

Belge:

- `docs/2026-03-23_ANDROID_PRODUCTION_CANDIDATE_CHECKLIST_V2_TR.md`
- `ci-artifacts/android/device-matrix/device-matrix.json`
- `ci-artifacts/android/release-readiness/production-candidate-checklist.json`

### 23 Mart 2026 - Guncelleme 42

Tamamlanan kirk ikinci uygulama adimi:

- Faz 3 production candidate checklist icindeki toplu acik maddeler alt gorevlere bolundu.
- Autofill browser ve native app takibi ayrildi.
- Encoding polish, translation polish, rollout plan ve rollout monitoring maddeleri birbirinden ayrildi.

Kod etkisi:

- `scripts/ensure-ci-artifact-layout.cjs`
- `scripts/generate-ci-artifact-report.cjs`

Belge:

- `docs/2026-03-23_ANDROID_PRODUCTION_CANDIDATE_CHECKLIST_V2_TR.md`
- `ci-artifacts/android/release-readiness/production-candidate-checklist.template.json`
- `ci-artifacts/android/release-readiness/production-candidate-checklist.json`

### 23 Mart 2026 - Guncelleme 43

Tamamlanan kirk ucuncu uygulama adimi:

- Faz 3 `translation_polish` maddesi belge seviyesinde kanit dosyasina baglandi.
- Production candidate checklist canli raporu bu kanit dosyasi mevcutsa `translation_polish = passed` uretir hale geldi.
- Kalan aciklar boylece native app autofill, encoding polish ve rollout monitoring tarafina daha net daraldi.

Kod etkisi:

- `scripts/ensure-ci-artifact-layout.cjs`
- `scripts/generate-ci-artifact-report.cjs`

Belge:

- `docs/2026-03-23_ANDROID_TRANSLATION_POLISH_TR.md`
- `docs/2026-03-23_ANDROID_PRODUCTION_CANDIDATE_CHECKLIST_V2_TR.md`
- `ci-artifacts/android/release-readiness/production-candidate-checklist.json`

### 23 Mart 2026 - Guncelleme 44

Tamamlanan kirk dorduncu uygulama adimi:

- Faz 3 `autofill_native_app_validation` maddesi device matrix completed kayitlari uzerinden kapatildi.
- Pixel referans cihazdaki native app autofill ve save prompt alt durumlari tamamlanmis olarak isaretlendi.
- Production candidate checklist icinde native app autofill maddesi `passed` seviyesine tasindi.

Kod etkisi:

- `scripts/ensure-ci-artifact-layout.cjs`

Belge:

- `docs/2026-03-23_ANDROID_PRODUCTION_CANDIDATE_CHECKLIST_V2_TR.md`
- `ci-artifacts/android/device-matrix/device-matrix.json`
- `ci-artifacts/android/release-readiness/production-candidate-checklist.json`

### 23 Mart 2026 - Guncelleme 45

Tamamlanan kirk besinci uygulama adimi:

- Faz 3 `encoding_polish_ui` maddesi belge seviyesinde kanit dosyasina baglandi.
- Production candidate checklist canli raporu bu kanit dosyasi mevcutsa `encoding_polish_ui = passed` uretir hale geldi.
- Faz 3 kalan aciklar boylece browser autofill ve staged rollout monitoring tarafina daha da daraldi.

Kod etkisi:

- `scripts/ensure-ci-artifact-layout.cjs`
- `scripts/generate-ci-artifact-report.cjs`

Belge:

- `docs/2026-03-23_ANDROID_UI_ENCODING_POLISH_TR.md`
- `docs/2026-03-23_ANDROID_PRODUCTION_CANDIDATE_CHECKLIST_V2_TR.md`
- `ci-artifacts/android/release-readiness/production-candidate-checklist.json`

### 23 Mart 2026 - Guncelleme 46

Tamamlanan kirk altinci uygulama adimi:

- Faz 3 `staged_rollout_monitoring` maddesi belge seviyesinde kanit dosyasina baglandi.
- Production candidate checklist canli raporu bu kanit dosyasi mevcutsa `staged_rollout_monitoring = passed` uretir hale geldi.
- Faz 3 Android production candidate checklist boylece tamamen yesil hale geldi.

Kod etkisi:

- `scripts/ensure-ci-artifact-layout.cjs`
- `scripts/generate-ci-artifact-report.cjs`

Belge:

- `docs/2026-03-23_ANDROID_STAGED_ROLLOUT_MONITORING_TR.md`
- `docs/2026-03-23_ANDROID_PRODUCTION_CANDIDATE_CHECKLIST_V2_TR.md`
- `ci-artifacts/android/release-readiness/production-candidate-checklist.json`

### 23 Mart 2026 - Guncelleme 47

Tamamlanan kirk yedinci uygulama adimi:

- Faz 3 kapanis durumu resmi olarak netlestirildi; Android production candidate checklist tamamen yesil hale geldi.
- Faz 4 icin passkey inventory summary servis katmani eklendi.
- SettingsDrawer icine iki dilli ve mevcut tema ile uyumlu ilk passkey inventory ozeti eklendi.

Kod etkisi:

- `src/lib/PasskeyInventoryService.ts`
- `src/lib/__tests__/PasskeyInventoryService.test.ts`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`

Belge:

- `guvenlik/2026-03-23_AEGIS_4_1_UYGULAMA_OZETI_TR.md`

### 23 Mart 2026 - Guncelleme 48

Tamamlanan kirk sekizinci uygulama adimi:

- Faz 4 passkey inventory ozetindeki action key'ler hizli aksiyonlara baglandi.
- Recovery export, revoke list ve policy/rotation odaklari panel icinden dogrudan acilabilir hale geldi.
- Passkey programi ilk kez sadece gorunen bir ozet degil, isletilebilir bir yonetim katmani olmaya basladi.

Kod etkisi:

- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 49

Tamamlanan kirk dokuzuncu uygulama adimi:

- Faz 4 icin site-passkey MVP karar dokumani eklendi.
- Bu karar kod tarafinda tek bir passkey program tanimina baglandi.
- Canonical passkey `mode` yorumlari 4.1 stratejisiyle hizalandi.

Kod etkisi:

- `src/config/passkey-program.ts`
- `src/lib/canonical-schema.ts`

Belge:

- `docs/2026-03-23_SITE_PASSKEY_MVP_KARAR_DOKUMANI_TR.md`

### 23 Mart 2026 - Guncelleme 50

Tamamlanan ellinci uygulama adimi:

- Faz 4 passkey inventory ozeti icinde program mode kirilimi eklendi.
- `vault_unlock`, `site_passkey_mvp` ve `site_passkey_future_rp` sayaclari kullaniciya gorunur hale geldi.
- Boylece site-passkey MVP karari ilk kez UI seviyesinde ayristirilmis oldu.

Kod etkisi:

- `src/lib/PasskeyInventoryService.ts`
- `src/lib/__tests__/PasskeyInventoryService.test.ts`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 51

Tamamlanan elli birinci uygulama adimi:

- Faz 4 icin ilk site-passkey metadata kayit akisi baslatildi.
- EntryForm icine iki dilli ilk `Passkeys` kategori akisi eklendi.
- Site passkey metadata alani sifreli saklama ve canonical export/restore hattina baglandi.

Kod etkisi:

- `src/vaultService.ts`
- `src/lib/canonical-adapters.ts`
- `src/components/dashboard/EntryForm.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 52

Tamamlanan elli ikinci uygulama adimi:

- Faz 4 passkey inventory artik kasa kayitlarindaki site passkey metadata alanlarini da okuyor.
- SettingsDrawer icine site passkey kayit sayisi, inceleme gerektiren kayit sayisi ve ilk risk listesi eklendi.
- Vault kartlarinda site passkey kayitlari rozet ve RP odakli ikincil bilgi ile daha gorunur hale geldi.

Kod etkisi:

- `src/lib/PasskeyInventoryService.ts`
- `src/lib/__tests__/PasskeyInventoryService.test.ts`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/components/dashboard/VaultEntryCard.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 53

Tamamlanan elli ucuncu uygulama adimi:

- Faz 4 site passkey listesine filtreleme katmani eklendi.
- Tum kayitlar, inceleme gerekenler, saglikli kayitlar ve future-RP kayitlari ayri filtrelerle taranabilir hale geldi.
- SettingsDrawer icinde siradaki riskli site passkey kaydini acan hizli inceleme akisi eklendi.

Kod etkisi:

- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 54

Tamamlanan elli dorduncu uygulama adimi:

- Faz 4 site passkey inventory artik risk turlerini ayri sayisal kirilimlarla gosteriyor.
- RP ID eksik, credential ID eksik ve future-mode kayitlari ayri odak aksiyonlariyla filtrelenebilir hale geldi.
- Boylesiyle passkey inventory aksiyonlari daha hedefli bir inceleme akisina donustu.

Kod etkisi:

- `src/lib/PasskeyInventoryService.ts`
- `src/lib/__tests__/PasskeyInventoryService.test.ts`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 55

Tamamlanan elli besinci uygulama adimi:

- Faz 4 site passkey inventory icine ilk toplu duzeltme aksiyonlari eklendi.
- Eksik RP ID alanlari `website` bilgisinden, eksik credential ID alanlari mevcut kayit degerinden doldurulabilir hale geldi.
- Boylece passkey inventory sadece tespit eden degil, sinirli ama pratik ilk remediation adimlarini da sunan bir yone gecmis oldu.

Kod etkisi:

- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 56

Tamamlanan elli altinci uygulama adimi:

- Faz 4 toplu duzeltme aksiyonlari icin ikinci adim onay akisi eklendi.
- Kullanici toplu RP ID veya credential ID guncellemesi oncesinde etkilenecek kayit sayisini gorebilir hale geldi.
- Yol haritasi icindeki faz ilerleme tablosu guncel duruma gore duzenlendi.

Kod etkisi:

- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`
- `guvenlik/2026-03-23_AEGIS_4_1_UYGULAMA_OZETI_TR.md`
- `guvenlik/2026-03-23_AEGIS_4_1_TAM_YOL_HARITASI_TR.md`

### 23 Mart 2026 - Guncelleme 57

Tamamlanan elli yedinci uygulama adimi:

- Faz 4 icin ayrik site passkey liste/gorunum katmani eklendi.
- Ayarlar icindeki ozet karttan acilan ozel modal ile site passkey kayitlari daha okunur bir listede taranabilir hale geldi.
- Bu modal filtreleme, kayda gitme ve mevcut toplu duzeltme aksiyonlarini daha odakli bir yuzeye tasiyor.

Kod etkisi:

- `src/components/dashboard/PasskeySiteInventoryModal.tsx`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 58

Tamamlanan elli sekizinci uygulama adimi:

- Faz 4 ayrik site passkey modaline coklu secim akisi eklendi.
- Kullanici gorunen kayitlari secip yalnizca secili kayitlar uzerinde toplu RP ID veya credential ID remediation baslatabilir hale geldi.
- Boylece passkey remediation akisi daha kontrollu ve operasyonel bir yuzeye donustu.

Kod etkisi:

- `src/components/dashboard/PasskeySiteInventoryModal.tsx`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 59

Tamamlanan elli dokuzuncu uygulama adimi:

- Faz 4 ayrik site passkey modaline secim ozeti eklendi.
- Secili kayitlar icin `future_mode -> site_passkey_mvp` donusum remediation'i eklendi.
- Boylesiyle site passkey modal artik hem secim bazli analiz hem de uc farkli remediation turu sunar hale geldi.

Kod etkisi:

- `src/components/dashboard/PasskeySiteInventoryModal.tsx`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 60

Tamamlanan altmisinci uygulama adimi:

- Faz 4 site passkey modalinden passkey policy ve revoke/audit panellerine dogrudan gecis baglari eklendi.
- Boylece remediation, policy ve audit yuzeyleri ayni akisin parcasi haline geldi.
- Faz 4 ilerleme seviyesi yol haritasi ozetinde yukari cekildi.

Kod etkisi:

- `src/components/dashboard/PasskeySiteInventoryModal.tsx`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`
- `guvenlik/2026-03-23_AEGIS_4_1_UYGULAMA_OZETI_TR.md`

### 23 Mart 2026 - Guncelleme 61

Tamamlanan altmis birinci uygulama adimi:

- Faz 5 resmi olarak baslatildi.
- `src/config/sync-strategy.ts` ile offline-first sync strategy kaynagi olusturuldu.
- Ayarlar icinde QR transfer, sifreli yedek ve duz metin export kanallarini ayni urun mantigi altinda gosteren ilk sync strategy ozeti eklendi.
- Faz ozetinde Faz 5 durumu `basladi` seviyesine cekildi.

Kod etkisi:

- `src/config/sync-strategy.ts`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`
- `docs/2026-03-23_SYNC_STRATEGY_V1_TR.md`
- `guvenlik/2026-03-23_AEGIS_4_1_UYGULAMA_OZETI_TR.md`

### 23 Mart 2026 - Guncelleme 62

Tamamlanan altmis ikinci uygulama adimi:

- Faz 5 sync strategy katmani conflict policy kurallari ve transport audit language ile derinlestirildi.
- QR senkron denetim olaylari artik ortak strateji dilindeki aciklamalarla da okunabiliyor.
- Ayarlar icindeki sync strategy paneli sadece ozet degil, kural ve denetim sozlugu sunan bir karar yuzeyine donustu.

Kod etkisi:

- `src/config/sync-strategy.ts`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`
- `docs/2026-03-23_SYNC_STRATEGY_V1_TR.md`

### 23 Mart 2026 - Guncelleme 63

Tamamlanan altmis ucuncu uygulama adimi:

- Faz 5 conflict kararlarini servis katmanina indiren ilk ortak helper eklendi.
- Backup import, normal import ve QR import oncesinde yerel kasa ile gelen veri arasindaki imza cakismalari ozetlenmeye baslandi.
- Import warning ve toast katmanlari bu conflict ozetini kullanir hale geldi.

Kod etkisi:

- `src/lib/SyncConflictResolutionService.ts`
- `src/lib/__tests__/SyncConflictResolutionService.test.ts`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`
- `docs/2026-03-23_SYNC_STRATEGY_V1_TR.md`

### 23 Mart 2026 - Guncelleme 64

Tamamlanan altmis dorduncu uygulama adimi:

- Faz 5 conflict resolution helper restore ve migration hattina da baglandi.
- Canonical migration raporlari artik conflict summary metadata'si uretiyor.
- Boylece import, QR import ve canonical restore/migration ayni conflict dili altinda hizalanmaya basladi.

Kod etkisi:

- `src/lib/canonical-migration.ts`
- `src/lib/__tests__/CanonicalMigration.test.ts`
- `docs/2026-03-23_SYNC_STRATEGY_V1_TR.md`

### 23 Mart 2026 - Guncelleme 65

Tamamlanan altmis besinci uygulama adimi:

- Faz 5 conflict summary bilgisi import dogrulama kartina tasindi.
- Kullanici artik gelen kayit, mevcut eslesme ve birebir eslesme sayisini rapor kartinda gorebiliyor.
- Conflict helper ilk kez kalici UI geri bildirimi ureten yuzeye baglanmis oldu.

Kod etkisi:

- `src/lib/ImportService.ts`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`
- `docs/2026-03-23_SYNC_STRATEGY_V1_TR.md`

### 23 Mart 2026 - Guncelleme 66

Tamamlanan altmis altinci uygulama adimi:

- Faz 5 icin ortak `sync audit` kaydi acildi.
- Import ve QR import akislarinin tamamlanma olaylari artik tek denetim panelinde toplanmaya basladi.
- Sync strategy yuzeyi ile operasyonel audit yuzeyi ilk kez ayni veri omurgasina baglandi.

Kod etkisi:

- `src/lib/SecureAppSettings.ts`
- `src/lib/SyncAuditService.ts`
- `src/lib/canonical-migration.ts`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`
- `docs/2026-03-23_SYNC_STRATEGY_V1_TR.md`

### 23 Mart 2026 - Guncelleme 67

Tamamlanan altmis yedinci uygulama adimi:

- Sync audit paneline filtreleme eklendi.
- Canonical migration servisindeki raporlu restore ve migration metodlari sync audit kaydina otomatik olay dusurur hale geldi.
- Boylece Faz 5 sync audit omurgasi hem daha kullanisli hem de restore/migration tarafina daha yakin hale geldi.

Kod etkisi:

- `src/lib/canonical-migration.ts`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`
- `docs/2026-03-23_SYNC_STRATEGY_V1_TR.md`

### 23 Mart 2026 - Guncelleme 68

Tamamlanan altmis sekizinci uygulama adimi:

- Sync audit kayitlarindan ilgili yuzeye gecis eklendi.
- Import tabanli olaylar artik import raporuna, QR tabanli olaylar QR bolumune odaklanabiliyor.
- Faz 5 sync audit paneli sadece liste degil, yonlendirici operasyon paneli haline geldi.

Kod etkisi:

- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`
- `docs/2026-03-23_SYNC_STRATEGY_V1_TR.md`

### 23 Mart 2026 - Guncelleme 69

Tamamlanan altmis dokuzuncu uygulama adimi:

- Restore/migration tarafi icin kullaniciya gorunen ilk migration rapor karti eklendi.
- Sifreli yedek import akisi canonical migration onizlemesi de uretmeye basladi.
- Boylece Faz 5 ilk kez restore/migration tarafinda da somut bir gorunur rapor yuzeyine kavustu.

Kod etkisi:

- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`
- `docs/2026-03-23_SYNC_STRATEGY_V1_TR.md`

### 23 Mart 2026 - Guncelleme 70

Tamamlanan yetmisinci uygulama adimi:

- Sync audit icindeki restore ve migration olaylari migration rapor kartina baglandi.
- Boylece Faz 5 icinde import, QR ve restore/migration yuzeyleri audit tarafindan gezilebilir hale geldi.
- Faz 5 ilerleme seviyesi raporda pratik olarak tamam noktasina cekildi.

Kod etkisi:

- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`
- `docs/2026-03-23_SYNC_STRATEGY_V1_TR.md`

### 23 Mart 2026 - Guncelleme 71

Tamamlanan yetmis birinci uygulama adimi:

- Faz 2 icin canli `evidence gaps` ozeti uretilmeye baslandi.
- Quality, release ve Android readiness aciklari artik tek JSON ve Markdown ciktisinda toplanabiliyor.
- Faz 2 ilerleme seviyesi yol haritasinda yukari cekildi.

Kod etkisi:

- `scripts/generate-ci-artifact-report.cjs`
- `docs/2026-03-23_EVIDENCE_GAPS_WORKFLOW_TR.md`
- `guvenlik/2026-03-23_AEGIS_4_1_UYGULAMA_OZETI_TR.md`

### 23 Mart 2026 - Guncelleme 72

Tamamlanan yetmis ikinci uygulama adimi:

- Faz 2 kalite kapisi icin kalan `unit`, `import_export_regression`, `security_regression` ve `e2e` kanitlari gercek artefact ile yesile cekildi.
- Playwright E2E artefact okunmasi guncel JSON yapisina gore sertlestirildi.
- Quality checklist template'i `vitest-results/*` yollarina hizalandi ve evidence gap ciktisi yalnizca `sbom` ile `provenance` aciklarini birakir hale geldi.

Kod etkisi:

- `src/lib/__tests__/ExportService.test.ts`
- `scripts/ensure-ci-artifact-layout.cjs`
- `scripts/generate-ci-artifact-report.cjs`
- `ci-artifacts/quality/quality-gate-checklist.json`
- `ci-artifacts/evidence-gaps.md`

### 23 Mart 2026 - Guncelleme 73

Tamamlanan yetmis ucuncu uygulama adimi:

- Faz 2 release evidence zinciri de tamamen yesile cekildi.
- CI raporu artik mevcut `SBOM` ve `provenance` dosyalarini gercek varlik uzerinden `passed` olarak degerlendiriyor.
- `evidence gaps` ciktisi `none` seviyesine indi; Faz 2 boylece kalite ve release evidence acisindan tamamlandi.

Kod etkisi:

- `scripts/generate-ci-artifact-report.cjs`
- `release/evidence/release-evidence-manifest.json`
- `ci-artifacts/evidence-gaps.md`
- `ci-artifacts/quality-summary.md`

### 23 Mart 2026 - Guncelleme 74

Tamamlanan yetmis dorduncu uygulama adimi:

- Faz 7 resmi olarak baslatildi.
- Watchtower omurgasinin uzerine yeni `Security Center 2.0` insight katmani eklendi.
- Eksik ikinci faktor, site passkey adayi, eskiyen kimlik bilgisi ve hassas paylasim boslugu sinyalleri ayarlar icinde iki dilli bir ozet paneline baglandi.

Kod etkisi:

- `src/lib/SecurityCenterService.ts`
- `src/lib/__tests__/SecurityCenterService.test.ts`
- `src/components/dashboard/SecurityCenterPanel.tsx`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 75

Tamamlanan yetmis besinci uygulama adimi:

- `src/i18n.ts` icindeki Turkce sozluk baştan sona kalite temizliginden gecirildi.
- Watchtower, passkey, TOTP, QR ve veri yonetimi bloklarindaki bozuk UTF-8/mojibake satirlari temizlendi.
- Kalan `?` karakterler yalnizca gercek soru cumleleri veya kod operatorleri seviyesinde birakildi.

Kod etkisi:

- `src/i18n.ts`

### 23 Mart 2026 - Guncelleme 76

Tamamlanan yetmis altinci uygulama adimi:

- Faz 7 triage kuyruguna `incelenenler` gorunumu eklendi.
- Incelenmis maddeler tek tikla yeniden acilabilir hale geldi.
- Review kaydi 7 gunu astiginda ilgili madde otomatik olarak aktif triage kuyruguna geri doner hale getirildi.

Kod etkisi:

- `src/lib/SecurityCenterService.ts`
- `src/lib/__tests__/SecurityCenterService.test.ts`
- `src/components/dashboard/SecurityCenterPanel.tsx`
- `src/components/dashboard/SettingsDrawer.tsx`
- `src/i18n.ts`

## 2026-03-23 Ayarlar Ekrani Duzeltmeleri

- Security Center triage gorunumu uzun kasa listeleri icin kisaltilmis ve kaydirilabilir hale getirildi.
- Release trust / audit-ready kartlari sayfa genelindeki dark mode yapisiyla hizalandi.
- Faz 9 paketleme kartlarinda otomatik owner sign-off tamamlama mantigi duzeltildi.

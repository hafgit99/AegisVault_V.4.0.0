# Aegis Vault 5.0 Tasarim Sistemi Standardi

**Tarih:** 2026-05-15  
**Durum:** Faz 1 uygulama baslangici  
**Amac:** Aegis Vault arayuzunde renk, yuzey, buton, rozet, input ve focus davranislarini koyu/acik mod ile Turkce/Ingilizce metinlere dayanikli tek bir sistem altinda toplamak.

## 1. Temel Yaklasim

Aegis Vault bir sifre yoneticisi oldugu icin tasarim dili dekoratif olmaktan cok guven veren, okunabilir ve kontrollu olmalidir. Bu nedenle Faz 1'de yeni bir gorsel katman eklemek yerine mevcut V5 arayuzunu besleyen semantik tokenlar olusturulmustur.

Bu yaklasim su avantajlari saglar:

- Koyu ve acik mod ayni karar sistemiyle calisir.
- Yeni ekranlar ayni buton, rozet ve kart dilini kullanir.
- Kritik aksiyonlar daha net ayrisir.
- Uzun Turkce metinlerde buton ve rozetler daha dayanikli olur.
- Sonraki fazlarda kayit kartlari, formlar ve ayarlar daha kolay standardize edilir.

## 2. Semantik Token Gruplari

### 2.1 Yuzey Tokenlari

- `--aegis-surface-canvas`: Sayfa arka plani.
- `--aegis-surface-base`: Standart kart ve panel zemini.
- `--aegis-surface-raised`: Input, buton ve one cikan kart zemini.
- `--aegis-surface-muted`: Ikinci seviye bilgi kutulari.
- `--aegis-surface-soft`: Hover, secili veya dusuk vurgu zeminleri.

### 2.2 Metin Tokenlari

- `--aegis-text-primary`: Ana baslik ve kritik metin.
- `--aegis-text-secondary`: Aciklama ve ikincil bilgi.
- `--aegis-text-muted`: Placeholder, yardimci metin ve dusuk vurgu.
- `--aegis-text-inverse`: Koyu zemin uzerindeki ters metin.

### 2.3 Kenarlik ve Focus Tokenlari

- `--aegis-border-subtle`: Standart ince ayrim.
- `--aegis-border-strong`: Input ve kontrol kenarligi.
- `--aegis-border-accent`: Focus, hover ve secili durum vurgusu.
- `--aegis-focus-ring`: Klavye ve focus gorunurlugu.

### 2.4 Durum Tokenlari

- `--aegis-success`: Basarili ve guvenli durum.
- `--aegis-warning`: Dikkat gerektiren durum.
- `--aegis-danger`: Riskli veya geri alinamaz aksiyon.
- `--aegis-info`: Bilgilendirici durum.

Her durumun soft arka plan karsiligi vardir:

- `--aegis-success-soft`
- `--aegis-warning-soft`
- `--aegis-danger-soft`
- `--aegis-info-soft`

## 3. Ortak Bilesen Siniflari

### 3.1 Yuzeyler

- `aegis-surface` / `v5-surface-standard`
- `aegis-surface-raised` / `v5-surface-raised`
- `aegis-surface-muted` / `v5-surface-muted`

Bu siniflar kart, panel, empty-state ve modal alt bolumlerinde kullanilmalidir.

### 3.2 Butonlar

- `aegis-btn` / `v5-btn`
- `aegis-btn-primary` / `v5-btn-primary`
- `aegis-btn-secondary` / `v5-btn-secondary`
- `aegis-btn-success` / `v5-btn-success`
- `aegis-btn-warning` / `v5-btn-warning`
- `aegis-btn-danger` / `v5-btn-danger`

Kullanim ilkeleri:

- Ana aksiyon icin primary.
- Ikincil ama normal aksiyon icin secondary.
- Guvenli/basarili durum icin success.
- Dikkat gerektiren ama yikici olmayan islem icin warning.
- Silme, sifirlama, geri alinamaz islem icin danger.

### 3.3 Rozetler

- `aegis-badge` / `v5-badge`
- `aegis-badge-positive` / `v5-badge-positive`
- `aegis-badge-warning` / `v5-badge-warning`
- `aegis-badge-danger` / `v5-badge-danger`

Rozetlerde uzun Turkce metin kullanilmamali; mumkunse 1-3 kelime tercih edilmelidir.

## 4. Geriye Uyumlu Sinif Eslemesi

Faz 1 kapsaminda mevcut siniflar yeni token sistemine baglanmistir:

- `btn-ink`
- `settings-action-btn-primary`
- `settings-action-btn-secondary`
- `settings-action-btn-danger`
- `settings-secondary-btn`
- `settings-plain-btn`
- `settings-pill-secondary`
- `totp-btn-secondary`
- `entry-action-btn-muted`
- `recovery-drill-run-btn`
- `sensitive-action-confirm-btn`
- `emergency-kit-btn`
- `settings-badge-muted`
- `settings-badge-positive`
- `passkey-status-chip`
- `v5-entry-badge`
- `dashboard-storage-chip`
- `v5-vault-count-chip`

Bu sayede mevcut ekranlarda buyuk refactor yapmadan tutarlilik baslatilmistir.

## 5. Yeni Ekranlar Icin Kural

Yeni bir UI parcasi eklenirken once mevcut ortak siniflar kullanilmalidir. Ozel renk veya elle yazilmis `rgba` degeri sadece gercekten ekrana ozel bir durum varsa tercih edilmelidir.

Onerilen oncelik:

1. Token kullan.
2. Ortak `aegis-*` veya `v5-*` sinifini kullan.
3. Mevcut ekran sinifini tokenlara bagla.
4. En son care olarak yeni ozel stil yaz.

## 6. Kontrol Listesi

Her yeni tasarim degisikliginde asagidaki kontroller yapilmalidir:

- Koyu mod okunabilir mi?
- Acik mod input ve kart sinirlari net mi?
- Turkce uzun metin buton veya rozeti bozuyor mu?
- Ingilizce kisa metin bosluklari dengesiz gosteriyor mu?
- Focus halkasi gorunur mu?
- Disabled durum gercekten pasif gorunuyor mu?
- Danger aksiyon normal primary aksiyona benzemiyor mu?
- Success rengi koyu modda fazla parlak veya okunmaz degil mi?

## 7. Sonraki Fazlara Etkisi

Bu standardizasyon sonraki calismalarin temelidir:

- Faz 2 ana giris ekrani tipografi ve yuzey rafinesi
- Faz 3 kayit kartlari mikro detaylari
- Faz 4 uzun kayit formu bolumleme
- Faz 5 ayarlar deneyimi
- Faz 8 yedekleme ve kurtarma provasi sihirbazi
- Faz 9 kripto kasa watch-only gorsel dili

Bu dosya, yeni tasarim kararlarinda referans alinacak temel tasarim sistemi notudur.

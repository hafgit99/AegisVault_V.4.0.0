# Aegis 4.1 Sync Strategy V1

Tarih: 23 Mart 2026

## Karar Ozeti

Aegis 4.1 senkronizasyon stratejisi `offline-first` olarak sabitlenir.

- Yerel kasa ana dogruluk kaynagidir.
- QR transfer cihazlar arasi, kullanici baslatmali ve kisa omurlu sifreli tasima yuzeyidir.
- Sifreli yedek geri yukleme, gecis ve afet kurtarma amacli tasima kanalidir.
- Duz metin CSV/JSON disa aktarma sadece gecici migration aracidir ve varsayilan olarak kapali kalmalidir.
- Gelecekteki bulut tabanli E2E senkron, 4.1 cekirdegine zorunlu olarak baglanmaz; opsiyonel ikinci katman olarak konumlanir.

## Guven Sinirlari

1. QR transfer
- Kaynak cihaz
- Alici cihaz
- Tek kullanimlik transfer kodu

2. Sifreli yedek
- Yedek parolasi
- Yerel dosya depolama
- Geri yukleme hedef cihazi

3. Duz metin export
- Kullanici kontrollu gecici dosya kullanimi
- Sifreli kasa korumasi disina cikan veri

4. Opsiyonel sifreli senkron
- Yalnizca sifreli payload
- Uzak relay sunucu duz metin otoritesi degildir

## 4.1 Icinde Acilan Ilk Uygulama Adimi

- `src/config/sync-strategy.ts` ile ortak strateji kaynagi olusturuldu.
- `SettingsDrawer` icinde kullaniciya gorunen ilk senkron stratejisi ozeti eklendi.
- QR transfer, sifreli yedek ve duz metin export artik ayni urun mantigi altinda aciklanmaya baslandi.
- Conflict policy kurallari ve transport audit language ilk kez ayni strateji katmanina baglandi.
- Import, backup restore ve QR import oncesi yerel kasa ile gelen veriyi karsilastiran ilk ortak conflict resolution helper eklendi.
- Canonical restore ve migration raporlari da ayni conflict summary mantigini metadata seviyesinde tasimaya basladi.
- Import dogrulama karti conflict summary verisini kullaniciya dogrudan gosterecek sekilde genisletildi.
- Ortak sync audit kaydi acildi; import ve QR akislarinin olaylari tek denetim panelinde toplanmaya baslandi.
- Migration servisindeki raporlu restore ve migration metodlari sync audit kaydina otomatik olay dusurecek sekilde baglandi.
- Sync audit panelinden ilgili import raporuna ve QR bolumune gecis davranisi eklendi.
- Sifreli yedek ice aktarma sonrasinda canonical migration onizlemesini gosteren ilk migration rapor karti eklendi.
- Sync audit icindeki restore/migration olaylarindan migration rapor kartina odaklanma baglantisi eklendi.

## Sonraki Isler

1. Sync conflict resolution politikasini teknik gorev listesine ayirmak
2. Optional encrypted sync icin kapsama dahil olmayan maddeleri ayri backlog'a tasimak
3. QR transfer, backup restore ve export izlerini ayni denetim diliyle birlestirmek

# Aegis Release Trust Program v1

Tarih: 23 Mart 2026
Faz: Faz 8 - Release Guven Programi

## Amac

Release guven programinin ilk adimi, mevcut CI evidence zincirini urun icinde gorunur hale getirmek ve release kararlarini tek bir guven ozetine baglamaktir.

## Bu Turda Eklenenler

- `ReleaseTrustService` ile release evidence manifestinden tuketilen ortak summary katmani
- `ReleaseTrustPanel` ile ayarlar icinde ilk release trust gorunumu
- `ci:report` sonrasi `src/generated/release-trust-snapshot.ts` ureten snapshot akisi
- release smoke, release verification, platform signing, SBOM ve provenance kontrollerinin tek panelde gorunmesi

## V1 Kapsami

- release trust skoru
- risk seviyesi
- zorunlu kontroller ozet sayaci
- acik evidence gap sayisi
- kontrol bazli durum listesi
- owner bazli evidence toplama aksiyonlari
- audit-ready paket kirilimi
- paket checklist maddeleri
- `kanit toplandi` durumu
- paket bazli owner onayi
- son release trust aksiyon gecmisi
- release snapshot ve belge varligindan beslenen otomatik checklist doldurma
- paket bazli `hazir / owner onayi bekliyor / ilerliyor` durumu
- otomatik tamamlanan ve toplam cozulmus checklist sayilarinin ayri gorunmesi
- her audit-ready paket icin neden o durumda oldugunu aciklayan kisa sonraki adim mesaji
- otomatik checklist maddeleri icin hangi belge veya hangi release kanitindan beslendigini gosteren kaynak bilgisi
- audit-ready paketlerin toplam hazirlik dagilimini gosteren ust seviye paket ozeti

## Sonraki Adimlar

- checklist ve owner onayi durumlarini daha genis belge bazli toplama otomasyonuna baglamak
- audit-ready paketlerini belge varligi, owner onayi ve checklist hazirlik durumu ile daha otomatik hale getirmek
- supply-chain ve release tarafi icin daha zengin audit export dili eklemek

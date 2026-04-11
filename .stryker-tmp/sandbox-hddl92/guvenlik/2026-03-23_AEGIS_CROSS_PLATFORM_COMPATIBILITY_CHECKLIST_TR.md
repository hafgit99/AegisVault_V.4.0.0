# Aegis Cross-Platform Compatibility Checklist

Tarih: 23 Mart 2026
Durum: Faz 1 kapanis checklist'i
Versiyon: 2026-03-23.v1

## 1. Amac

Bu belge Faz 1 sonunda platformlar arasi temel birligin hangi basliklarda kapandigini resmi hale getirir.

## 2. Kapanis Kriterleri

### 2.1 Ortak Sozlesme

- `canonical vault record` tipi kodda mevcut
- desktop -> canonical adapter mevcut
- canonical -> desktop adapter mevcut
- passkey metadata ortak alana baglandi
- sharing assignment ortak alana baglandi

Durum: tamamlandi

### 2.2 Backup / Restore Uyumu

- legacy encrypted desktop backup -> canonical backup migration mevcut
- canonical backup decrypt/restore helper mevcut
- canonical payload versiyonu merkezi registry'den geliyor
- Android/Desktop envelope esleme tablosu yazili

Durum: tamamlandi

### 2.3 Import / Export Uyumu

- CSV/JSON import canonical parse yardimcilari mevcut
- canonical JSON export helper mevcut
- import conflict summary ve migration report zinciri mevcut

Durum: tamamlandi

### 2.4 Sharing ve Passkey Veri Zemini

- shared spaces canonical modeli mevcut
- shared assignment canonical modeli mevcut
- passkey metadata canonical kayit icinde tasiniyor

Durum: tamamlandi

### 2.5 Ortak Versiyonlama

- app version merkezi
- backup format merkezi
- QR sync format merkezi
- canonical export kind merkezi
- canonical schema version merkezi
- compatibility checklist version merkezi
- migration policy version merkezi

Durum: tamamlandi

## 3. Faz 1 Sonu Kabul Karari

Asagidaki maddeler Faz 1 icin yeterli kabul edilir:

1. veri modeli artik yazili ve kodda temsil edilen tek bir canonical eksene sahip
2. import/export/backup/migration davranislari bu canonical ekseni kullanabiliyor
3. Android/Desktop envelope farklari payload seviyesinde normalize edilmis kurallara sahip
4. sharing ve passkey yeni bir ikinci schema yerine ayni canonical omurgada tasiniyor

## 4. Bilincli Olarak Faz 1 Disinda Birakilanlar

- iOS uyum matrix'i
- tum Android payload adapterlarinin koda alinmasi
- enterprise/organizational schema katmanlari
- cloud sync payload standardi

Bunlar Faz 1'in kapanisini engellemez; sonraki fazlarda ele alinacaktir.

## 5. Nihai Sonuc

Faz 1, "tum platformlar ayni kodu kullaniyor" seviyesinde degil; fakat "tum platformlar ayni veri sozlesmesine baglanabilir" seviyesinde kapanmistir.

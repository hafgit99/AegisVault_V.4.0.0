# Aegis CLI Guide Versioning Template

Bu dosya CLI dokumantasyonu icin standart surumleme sablonudur.

## 1. Dosya Adi Formati

- TR: `YYYY-MM-DD_AEGIS_CLI_KULLANIM_KILAVUZU_TR.md`
- EN: `YYYY-MM-DD_AEGIS_CLI_USAGE_GUIDE_EN.md`

## 2. Baslik Bloku

Her dokuman su bilgileri icermelidir:

- Tarih
- Surum
- Uyumlu Aegis Vault surumu

## 3. Minimum Bolumler

1. Genel Bakis
2. On Kosullar
3. Guvenlik Modeli
4. Hizli Baslangic
5. Komut Referansi
6. Dil Secenekleri
7. JSON/Otomasyon
8. Hata Cozumu
9. Ileri Notlar
10. Onerilen Akis

## 4. Guncelleme Kurallari

1. Once yeni tarihli dosyayi olustur.
2. Eski surumu oldugu gibi birak.
3. `docs/CLI/README.md` linklerini yeni dosyaya cevir.
4. Gerekirse ana `README.md` linklerini de guncelle.

## 5. Dil Tutarliligi

- TR ve EN dokumanlar ayni komut setini kapsamalidir.
- Komut ornekleri birebir esdeger olmali.
- Terminoloji sabit olmali (`pair`, `status`, `list`, `get`, `add`, `update`, `delete`, `restore`, `empty-trash`, `unpair`).

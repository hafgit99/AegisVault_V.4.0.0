# Aegis CLI Kullanim Kilavuzu (TR)

Tarih: 1 Nisan 2026  
Surum: Aegis CLI v1 (Aegis Vault 4.2.x ile uyumlu)

## 1. Genel Bakis

Aegis CLI, masaustu uygulamasina guvenli bridge uzerinden baglanarak kasadaki kayitlari komut satirindan yonetmenizi saglar.

Temel ozellikler:
- CLI-Desktop eslestirme (`pair`)
- Durum kontrolu (`status`)
- Kayit listeleme/arama (`list`)
- Kayit goruntuleme (`get`)
- Kayit ekleme/guncelleme/silme/geri alma
- Cop kutusunu bosaltma
- TR/EN cikti secenegi (`--lang tr|en`)

## 2. On Kosullar

- Aegis masaustu uygulamasi kurulu ve calisiyor olmali.
- Native bridge ayakta olmali.
- CLI komutlari proje kokunden calistirilir:

```bash
npm run cli -- help
```

Not: CLI ilk calismada kullanici dizininde bir config dosyasi olusturur:
- Windows: `C:\Users\<kullanici>\.aegis-vault\cli-config.json`
- macOS/Linux: `~/.aegis-vault/cli-config.json`

## 3. Guvenlik Modeli (Kisa)

- CLI istekleri imzalanir (ECDSA P-256).
- Desktop tarafi extension/cli kimligini ve imzayi dogrular.
- Kasa kilitliyse veri mutasyon komutlari calismaz.
- `pair` ile kalici guven iliskisi kurulur.

## 4. Hizli Baslangic

```bash
# 1) Yardim
npm run cli -- help

# 2) Eslestir
npm run cli -- pair

# 3) Durum kontrolu
npm run cli -- status

# 4) Kayit listele
npm run cli -- list --limit 25
```

## 5. Komut Referansi

## 5.1 help

Kullanim ve komut listesini gosterir.

```bash
npm run cli -- help
```

## 5.2 pair

CLI ile desktop bridge arasinda eslestirme yapar (ilk adim).

```bash
npm run cli -- pair
```

## 5.3 status

Eslestirme ve kasa durumunu ozetler.

```bash
npm run cli -- status
```

Ornek cikti:
- `paired`: CLI eslesmesi var mi
- `isUnlocked`: Kasa acik mi
- `entryCount`: Kayit adedi

## 5.4 language

Desktop UI dilini bridge uzerinden okur.

```bash
npm run cli -- language
```

## 5.5 list

Kayitlari listeler. Arama ve filtre destekler.

```bash
npm run cli -- list --limit 50
npm run cli -- list --query github
npm run cli -- list --category General
npm run cli -- list --scope trash
npm run cli -- list --searchScope title
```

Desteklenen opsiyonlar:
- `--query <metin>`
- `--category <kategori>`
- `--scope active|trash`
- `--searchScope all|title|username|tags`
- `--limit <sayi>` (1-200 arasi onerilir)
- `--json` (ham JSON cikti)

## 5.6 get <id>

Belirli kaydi ID ile getirir.

```bash
npm run cli -- get 12
```

## 5.7 add

Yeni kayit ekler.

```bash
npm run cli -- add --title "GitHub" --username "user@example.com" --pass "StrongPass123!" --website "https://github.com"
```

Opsiyonlar:
- Zorunlu: `--title`, `--pass`
- Opsiyonel: `--username`, `--website`, `--category`, `--tags`

`--tags` virgulle ayrilir:

```bash
npm run cli -- add --title "Mail" --pass "..." --tags "work,email,critical"
```

## 5.8 update <id>

Mevcut kaydi gunceller (yalnizca verdigin alanlar degisir).

```bash
npm run cli -- update 12 --pass "NewStrongPass!"
npm run cli -- update 12 --title "GitHub Personal" --tags "personal,dev"
```

## 5.9 delete <id>

Kaydi cop kutusuna tasir (hard delete degildir).

```bash
npm run cli -- delete 12
```

## 5.10 restore <id>

Cop kutusundaki kaydi geri alir.

```bash
npm run cli -- restore 12
```

## 5.11 empty-trash

Cop kutusunu tamamen bosaltir.

```bash
npm run cli -- empty-trash
```

## 5.12 unpair

CLI eslesmesini kaldirir.

```bash
npm run cli -- unpair
```

## 6. Dil Secenekleri (CLI Cikti)

CLI cikti dilini komut bazinda degistirebilirsin:

```bash
npm run cli -- status --lang tr
npm run cli -- status --lang en
```

Ek olarak bu parametreyi verecegin komutlar:
- `list`, `get`, `add`, `update`, `delete`, `restore`, `empty-trash`, `pair`, `status`

## 7. JSON Cikti ile Otomasyon

Script entegrasyonunda `--json` kullan:

```bash
npm run cli -- list --limit 10 --json
npm run cli -- get 12 --json
```

PowerShell ornegi:

```powershell
$raw = npm run cli -- list --limit 10 --json
$obj = $raw | ConvertFrom-Json
$obj.data | Format-Table id,title,username,website
```

## 8. Hata Cozumu

## 8.1 `pair` oncesi komut hatasi

Belirti:
- `Run aegis-cli pair before this operation.` benzeri hata

Cozum:
1. `npm run cli -- pair`
2. Sonra komutu tekrar calistir

## 8.2 `VAULT_LOCKED`

Belirti:
- Listeleme/CRUD komutlarinda kasa kilitli hatasi

Cozum:
1. Aegis desktop uygulamasini ac
2. Kasayi unlock et
3. Komutu tekrar dene

## 8.3 `FORBIDDEN_EXTENSION_ID`

Belirti:
- Bridge allowlist hatasi

Cozum:
1. Native host allowlist ayarlarini kontrol et
2. Gerekirse `AEGIS_CLI_EXTENSION_ID` ile uygun kimlik ver

## 8.4 `NATIVE_BRIDGE_TIMEOUT` / `NATIVE_BRIDGE_EOF`

Belirti:
- Bridge baglantisi zaman asimi veya kopma

Cozum:
1. Desktop uygulamasi acik mi kontrol et
2. Native bridge yeniden baslat
3. Komutu tekrar dene

## 9. Ileri Kullanim Notlari

- Farkli kimlikle calismak icin:

```bash
npm run cli -- status --extensionId "aegisvault-cli@local"
```

- Cop kutusu dahil tum kayitlar:

```bash
npm run cli -- list --scope trash --limit 200
```

- Basit arama:

```bash
npm run cli -- list --query "github"
```

## 10. Onerilen Gunluk Akis

1. `pair` (tek sefer)
2. `status` (oturum basinda)
3. `list --query ...`
4. `add` veya `update`
5. Gerektiginde `delete` / `restore`


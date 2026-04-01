# Aegis CLI Cheat Sheet (TR)

## Baslangic

```bash
npm run cli -- help
npm run cli -- pair
npm run cli -- status
```

## Listeleme ve Arama

```bash
npm run cli -- list --limit 25
npm run cli -- list --query github
npm run cli -- list --scope trash
npm run cli -- list --searchScope title
```

## Kayit Isleri

```bash
# Getir
npm run cli -- get 12

# Ekle
npm run cli -- add --title "GitHub" --username "user@example.com" --pass "StrongPass123!" --website "https://github.com"

# Guncelle
npm run cli -- update 12 --pass "NewStrongPass!"

# Sil / Geri al
npm run cli -- delete 12
npm run cli -- restore 12
```

## Cop Kutusu

```bash
npm run cli -- empty-trash
```

## Dil ve JSON

```bash
npm run cli -- status --lang tr
npm run cli -- status --lang en
npm run cli -- list --json
```

## Eslestirme

```bash
npm run cli -- unpair
npm run cli -- pair
```

## Sik Hatalar

- `Run aegis-cli pair...`: once `pair` calistir.
- `VAULT_LOCKED`: desktop uygulamada kasayi ac.
- `NATIVE_BRIDGE_TIMEOUT`: app/bridge acikligini kontrol et.


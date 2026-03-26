# Aegis Sync Relay: Self-Hosting Guide

## 1. Giris
Aegis Vault, verilerinizin kontrolünün tamamen sizde olmasını amaçlar. Bu rehber, kendi Aegis Sync Relay sunucunuzu nasıl kuracağınızı ve güvenli hale getireceğinizi anlatır.

## 2. Gereksinimler
- Node.js 18.x veya üzeri
- SQLite 3
- (Opsiyonel) Ters Vekil (Reverse Proxy) - Nginx veya Caddy

## 3. Kurulum

### 1. Dosyalari Hazirlayin
`relay/server.ts` dosyasini bir sunucuya kopyalayin.

### 2. Bagimliliklari Yukleyin
```bash
npm install fastify sqlite3 sqlite
```

### 3. Sunucuyu Baslatin
```bash
npx ts-node server.ts
```
Varsayilan olarak port 3000 üzerinden dinler.

## 4. Aegis Ayarlari
Aegis uygulamasinda Ayarlar > Senkronizasyon bölümünden "Custom Relay Server" seçeneğini aktif edin ve kendi sunucu adresinizi girin.

## 5. Guvenlik Tavsiyeleri
- **HTTPS Kullanin:** Veriler zaten E2EE sifreli olsa da, transport güvenligi (TLS) ek bir katmandir.
- **Firewall:** Port 3000'i sadece güvendiginiz IP'lere veya local aga açin.
- **Fail2Ban:** API endpoint'lerine yapilan brute-force saldirilarini engellemek için Fail2Ban kullanin.

## 6. Veri Gizliligi Notu
Kendi sunucunuzu host ettiginizde bile, sunucu asla verilerinizin plaintext (acik metin) halini göremez. Tüm sifreleme ve anahtar yönetimi tamamen Aegis istemcilerinde (telefon veya bilgisayar) yapilir.

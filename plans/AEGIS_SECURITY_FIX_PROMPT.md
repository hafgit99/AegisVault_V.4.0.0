# AEGIS 4.0 GÜVENLİK DÜZELTMELERİ - PROFESYONEL AI PROMPTU

Bu prompt, güvenlik açıklarını kapatmak için Code moduna veya başka bir AI aracına verilebilir.

---

## 📋 ANA PROMPT (Kopyalanabilir)

```
# AEGIS 4.0 GÜVENLİK DÜZELTMELERİ - KRİTİK ÖNCELİK

## Bağlam
Aegis 4.0, React + TypeScript + Vite ile geliştirilen çevrimdışı bir şifre yöneticisidir. 
Zero-Knowledge mimari kullanır ve AES-256-GCM + Argon2id ile şifreleme yapar.

## Görev
Aşağıda belirtilen güvenlik açıklarını kapat. Kod değişikliklerini uygula.

---

## AÇIK #1: STATİC SALT (KRİTİK - CVSS 7.5)

### Mevcut Durum
Dosya: src/vaultService.ts (Satır 35)
Dosya: src/db.ts (Satır 16)

```typescript
// MEVCUT GÜVENSİZ KOD:
const derivedBits = await argon2id({
  password: combinedMaterial,
  salt: "aegis-premium-salt-v4", // ❌ STATİK SALT - GÜVENLİK AÇIĞI
  parallelism: 1,
  iterations: 3,
  memorySize: 65536,
  hashLength: 32,
  outputType: 'binary',
});
```

### Güvenlik Riski
- Rainbow table saldırılarına açık
- Aynı parolaya sahip kullanıcılar için aynı anahtar üretiliyor
- OWASP A02:2021 Cryptographic Failures kategorisi

### Gereksinimler
1. Her kasa oluşturulduğunda 16-byte rastgele salt üret (crypto.getRandomValues)
2. Salt'ı IndexedDB'de `vault_metadata` object store'ında sakla
3. initDb() çağrıldığında mevcut salt'ı oku, yoksa yeni oluştur
4. Mevcut kullanıcılar için migration mekanizması ekle

### Beklenen Kod
```typescript
// VaultMetadata arayüzü ekle:
interface VaultMetadata {
  id: string;
  salt: string; // Base64 encoded 16-byte random salt
  createdAt: string;
  version: number;
}

// deriveMasterKey fonksiyonunu güncelle:
async deriveMasterKey(password: string, secretKey: string, saltB64?: string): Promise<string> {
  // Eğer salt verildiyse kullan, yoksa yeni oluştur
  let salt: Uint8Array;
  if (saltB64) {
    salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  } else {
    salt = crypto.getRandomValues(new Uint8Array(16));
  }
  
  const combinedMaterial = `${password}:${secretKey}`;
  const derivedBits = await argon2id({
    password: combinedMaterial,
    salt: salt, // ✅ Dinamik salt
    parallelism: 1,
    iterations: 3,
    memorySize: 65536,
    hashLength: 32,
    outputType: 'binary',
  });
  
  // Anahtarı import et
  this.aesKey = await window.crypto.subtle.importKey(
    "raw",
    derivedBits,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  
  // Salt'ı Base64 olarak döndür
  return btoa(String.fromCharCode(...salt));
}
```

---

## AÇIK #2: HARDCODED DEMO PAROLA (ORTA - CVSS 5.3)

### Mevcut Durum
Dosya: src/vaultService.ts (Satır 59)
Dosya: src/db.ts (Satır 42)

```typescript
// MEVCUT GÜVENSİZ KOD:
if (dbName === 'aegis_opfs_vault' && password !== "admin123") {
  throw new Error("Invalid master key or secret key");
}
```

### Güvenlik Riski
- Production'da demo parola bırakılmış
- Sosyal mühendislik saldırılarına açık

### Gereksinimler
1. Demo parola kontrolünü kaldır
2. Gerçek parola doğrulama mekanizması kur:
   - İlk kurulumda parola hash'i sakla (PBKDF2 ile)
   - Girişte hash karşılaştırması yap
3. Environment-based demo mode ekle (sadece development'te)

### Beklenen Kod
```typescript
// Yeni interface:
interface StoredCredential {
  verificationHash: string; // PBKDF2 hash of master password
  iterations: number;
  salt: string;
}

// Parola doğrulama fonksiyonu:
private async hashPassword(password: string, salt: Uint8Array, iterations: number = 100000): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );
  
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

async verifyPassword(password: string, stored: StoredCredential): Promise<boolean> {
  const salt = Uint8Array.from(atob(stored.salt), c => c.charCodeAt(0));
  const computedHash = await this.hashPassword(password, salt, stored.iterations);
  return computedHash === stored.verificationHash;
}

// initDb içinde:
async initDb(password: string, secretKey: string, dbName: string = 'aegis_opfs_vault'): Promise<void> {
  // Demo mode sadece development'te
  if (import.meta.env.DEV && password === "demo123") {
    console.warn("DEMO MODE ACTIVE - Not for production!");
  }
  
  // Gerçek doğrulama:
  const storedCred = await this.getStoredCredential(dbName);
  if (storedCred) {
    const isValid = await this.verifyPassword(password, storedCred);
    if (!isValid) throw new Error("Invalid credentials");
  }
  
  // ... devam
}
```

---

## AÇIK #3: BASE64 ENCODING (DÜŞÜK - CVSS 3.1)

### Mevcut Durum
Dosya: src/vaultService.ts (Satır 141-142)

```typescript
encrypted_password: btoa(String.fromCharCode(...new Uint8Array(cipherBuffer))),
iv: btoa(String.fromCharCode(...iv)),
```

### Gereksinimler
1. Base64 yerine Hex encoding kullan (daha güvenli)
2. Veya en azından URL-safe Base64 kullan

### Beklenen Kod
```typescript
// Hex encoding utility:
private bufToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

private hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Kullanım:
encrypted_password: this.bufToHex(new Uint8Array(cipherBuffer)),
iv: this.bufToHex(iv),
```

---

## DOĞRULAMA KRİTERLERİ

Her düzeltme sonrası şu testleri çalıştır:
1. Yeni kasa oluşturma - benzersiz salt üretildiğini doğrula
2. Mevcut kasa açma - eski salt ile uyumluluğu doğrula
3. Parola değiştirme - yeni salt üretildiğini doğrula
4. Unit test ekle: `vaultService.test.ts`

---

## ÇIKTI FORMATI

Her dosya için:
1. Değiştirilen kod bloklarını göster
2. Eklenen yeni fonksiyonları listele
3. Breaking changes varsa belirt
4. Migration script'i gerekiyorsa ekle
```

---

## 🔧 Kullanım Talimatları

1. **Code Moduna Geçiş:** Yukarıdaki prompt'u kopyalayıp Code moduna verin
2. **Adım Adım Uygulama:** Her açığı sırayla düzeltmesini isteyin
3. **Test Ettirme:** Her düzeltmeden sonra test çalıştırmasını isteyin
4. **Migration:** Mevcut kullanıcılar için veri migrasyonu ekletin

---

## 📁 İlgili Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `src/vaultService.ts` | Ana şifreleme servisi - Salt ve parola doğrulama |
| `src/db.ts` | Veritabanı bağlantısı - Salt ve parola doğrulama |
| `src/vaultService.test.ts` | Test dosyası - Yeni testler eklenecek |

---

## 📊 Öncelik Matrisi

| Açık | CVSS Skoru | Öncelik | Tahmini Süre |
|------|------------|---------|--------------|
| Static Salt | 7.5 | KRİTİK | Yüksek |
| Hardcoded Password | 5.3 | ORTA | Orta |
| Base64 Encoding | 3.1 | DÜŞÜK | Düşük |

---

## ⚠️ Önemli Notlar

1. **Migration Gerekli:** Mevcut kullanıcıların verileri yeni salt ile uyumlu olmayacaktır. Migration script'i gereklidir.
2. **Breaking Change:** Parola doğrulama mekanizması değişeceğinden, mevcut kullanıcılar parolalarını sıfırlamak zorunda kalabilir.
3. **Test Coverage:** Her değişiklik için unit test eklenmelidir.

---

*Bu prompt, Aegis 4.0 Güvenlik Denetim Raporu'na dayanmaktadır.*
*Tarih: 20 Şubat 2026*

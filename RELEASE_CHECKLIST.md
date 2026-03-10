# Aegis Vault - Güvenli Yayın Checklist (v4.0.0+)

Bu belge, uygulamanın üretime (production) çıkmadan önce geçmesi gereken son güvenlik ve operasyonel test adımlarını içerir.

## 1. Kod ve Build Doğrulaması
- [x] **Electron Allowlist ID:** `electron-main.cjs` dosyasındaki `ALLOWLIST_EXTENSION_IDS` dizisinde bulunan ID'nin, Chrome Web Mağazasına yüklenen gerçek eklenti ID'si ile %100 eşleştiği manuel olarak doğrulandı mı? (v4.0.0 Prod ID kilitlendi)
- [x] **Legacy Dosyalar:** `vite.extension.config.ts` ve eski `extension/` klasörünün silindiği teyit edildi mi? (Klasör silindi)
- [x] **Content Script Scope:** Eklentinin `manifest.json` dosyasında `content_scripts` bölümünün sadece `aegisvault.xyz` domainleri ile sınırlı olduğu (Runtime enjeksiyon stratejisi aktifliği) kontrol edildi mi? (JIT aktif)
- [x] **Build Başarılı:** `npm run build` komutu hatasız tamamlandı mı?

## 2. Kriptografik Güvenlik
- [x] **Argon2id Parametreleri:** `BackupService.ts` içindeki `iterations` ve `memory` değerleri, 2026 standartlarına uygun mu (Min: 64MB, 3 iterasyon)?
- [x] **Wipe Phrase:** Fabrika ayarlarının sıfırlanması için gereken metnin tam eşleşme gerektirdiği (case-sensitive) test edildi mi?

## 3. Eklenti İletişim Güvenliği
- [x] **Nonce Replay Test:** Bir `AEGIS_SYNC_VAULT` mesajının yakalanıp saniyeler sonra tekrar gönderildiğinde eklenti tarafından reddedildiği (`Invalid Nonce` uyarısı) görüldü mü? (Automated Suit ile doğrulandı)
- [x] **Target Origin:** `VaultContext.tsx` içindeki tüm `postMessage` çağrılarında hedef origin'in `window.location.origin` olduğu (Wildcard `*` kullanılmadığı) doğrulandı mı? (Kod bazında temizlendi)
- [x] **Extension Allowlist:** `ExtensionBridge.ts` dosyasında sabit allowlist kullanıldığı ve race condition koruması olduğu doğrulandı mı?

## 4. API ve Ağ Güvenliği
- [x] **CORS Bypass:** Rastgele bir web sitesinden `http://localhost:23456/api/vault` adresine gelen `fetch` isteğinin Electron tarafından `403 Forbidden Origin` ile reddedildiği görüldü mü?
- [x] **Private Network Access:** Chrome'un PNA politikası gereği preflight (OPTIONS) isteklerinin sorunsuz yanıtlandığı teyit edildi mi?
- [x] **Dev Mode Hardening:** Development modunda bile wildcard CORS origin (`*`) kullanılmadığı doğrulandı mı? (P0-1 düzeltmesi uygulandı)

## 5. Erişilebilirlik ve UX
- [x] **Focus Trapping:** `ReAuthModal` açıkken `TAB` tuşunun odaklamayı modal dışına çıkarmadığı doğrulandı mı? (A11y automated test ile doğrulandı)
- [x] **Screen Readers:** Kritik butonların (Wipe, Export, Kill PIN) `aria-label` değerlerinin anlamlı olduğu kontrol edildi mi?

## 6. Content Security Policy (CSP)
- [x] **unsafe-eval Kaldırıldı:** `index.html` ve `electron-main.cjs` dosyalarında `'unsafe-eval'` direktifinin kaldırıldığı doğrulandı mı?
- [x] **wasm-unsafe-eval Eklendi:** WebAssembly için `'wasm-unsafe-eval'` direktifinin eklendiği doğrulandı mı?
- [x] **CSP Testleri:** `ExtensionSecurity.test.ts` dosyasında CSP doğrulama testleri eklendi mi?

---
**Onaylayan:** AegisVault — Product & Security Owner  
**Tarih:** 10 Mart 2026  
**Güvenlik Düzeltmeleri:** P0-1, P0-2, P1-1 tamamlandı ✅

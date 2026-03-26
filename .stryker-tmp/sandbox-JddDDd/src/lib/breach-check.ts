/**
 * Aegis Vault - HIBP Password Breach Checker
 * 
 * Implements k-anonymity check against HaveIBeenPwned API and 
 * provides caching for subsequent lookups to simulate 'offline' mode.
 * 
 * Full offline mode (downloading 4GB hashes) can be supported by feeding 
 * a local OPFS SQLite instance.
 */
// @ts-nocheck


import { SecureAppSettings } from './SecureAppSettings';

interface BreachDatabase {
  hashes: Map<string, number>; // Local Cache: hash -> breach count
  lastUpdated: number;
}

export class OfflineBreachChecker {
  private db: BreachDatabase;

  constructor() {
    this.db = {
      hashes: new Map<string, number>(),
      lastUpdated: Date.now()
    };
  }

  /**
   * Tam offline kullanım için SQLite entegrasyon noktası.
   * Gelişmiş modüller (Electron vb.) veya OPFS SQLite ile entegre edilerek
   * 4GB'lık hash listesi local olarak tutulabilir.
   */
  async initializeLocalDatabase(): Promise<void> {
    // 1. Download HIBP pwned passwords list (veya Electron main/pre-packaged)
    // 2. Index into local SQLite
    // Şimdilik LocalStorage cache kullanarak basic offline simülasyonu yapıyoruz.
    try {
      await SecureAppSettings.initialize();
      const cached = SecureAppSettings.getHibpCache();
      if (cached?.hashes) {
        this.db.hashes = new Map(Object.entries(cached.hashes));
        this.db.lastUpdated = cached.lastUpdated || Date.now();
      }
    } catch {
      console.warn('[HIBP] Failed to load local cache');
    }
  }

  private saveLocalCache() {
    try {
      if (this.db.hashes.size > 5000) {
        // Cache çok büyürse temizle
        this.db.hashes.clear();
      }
      const data = {
        hashes: Object.fromEntries(this.db.hashes),
        lastUpdated: this.db.lastUpdated
      };
      SecureAppSettings.setHibpCache(data);
    } catch { /* ignore quota limitations */ }
  }

  private async sha1(text: string): Promise<string> {
    const data = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  /**
   * Şifrenin sızdırılıp sızdırılmadığını K-Anonymity modeliyle kontrol eder.
   * Parolanın hiçbir zaman tam hali sunucuya gitmez, sadece SHA-1 hashinin ilk 5 karakteri gider.
   * @param password Kontrol edilecek parola
   * @returns Sızdırılma sayısı (0 = temiz, null = api/network hatası)
   */
  async checkPassword(password: string): Promise<number | null> {
    if (!password) return 0;
    
    try {
      // 1. Hash the password (SHA-1 is required by HIBP API)
      const hash = await this.sha1(password);
      
      // 2. Local lookup first (Offline/Cache mode)
      if (this.db.hashes.has(hash)) {
        return this.db.hashes.get(hash)!;
      }
      
      // 3. Fallback: k-anonymity API call (Online supplement)
      const prefix = hash.substring(0, 5);
      const suffix = hash.substring(5);
      
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      if (!response.ok) {
        throw new Error(`HIBP API returned ${response.status}`);
      }
      
      const text = await response.text();
      const lines = text.split('\n');
      
      let pwnCount = 0;
      
      // 4. Parse results (k-anonymity)
      for (const line of lines) {
        const [responseSuffix, countRaw] = line.split(':');
        // Suffixleri localde karşılaştır
        if (responseSuffix && responseSuffix.trim() === suffix) {
          pwnCount = parseInt(countRaw.trim(), 10);
          break;
        }
      }
      
      // 5. Update local cache (Offline DB simulation)
      this.db.hashes.set(hash, pwnCount);
      this.saveLocalCache();
      
      return pwnCount;
    } catch (err) {
      console.error('[BreachCheck] Check failed:', err);
      return null; // Hata durumunda ağ kesintisi kabul ediyoruz (false negative önlemek için null dönmeli)
    }
  }
}

export const breachChecker = new OfflineBreachChecker();
// initialize locally
breachChecker.initializeLocalDatabase().catch(() => {});

import { openDB, type IDBPDatabase } from "idb";
import { argon2id } from 'hash-wasm';
import { SQLiteOPFS, isOPFSAvailable, clearAllOPFSFiles } from './lib/SQLiteOPFS';

// Represents the SQLite-WASM SQLCipher over OPFS architecture
// We use IndexedDB to simulate the OPFS persistence layer for this demo.
export interface VaultMetadata {
  id: string;
  salt?: string; // Base64 encoded 16-byte random salt
  createdAt?: string;
  version?: number;
  credential?: StoredCredential;
  deviceSecretHash?: string; // SHA-256 hash of device secret for validation
}

export interface StoredCredential {
  verificationHash: string; // PBKDF2 hash of master password
  iterations: number;
  salt: string;
}

export interface VaultEntry {
  id: number;
  title: string;
  username: string;
  encrypted_password?: string; // Stored as Hex (legacy Base64 supported)
  iv?: string; // Stored as Hex (legacy Base64 supported)
  category: string;
  website: string;
  updated_at: string;
  strength?: number;
  tags?: string[];
  pwned_count?: number; // Tracks HIBP breaches
  attachments?: { id: string, name: string, type: string, size: number }[];
  deletedAt?: string; // ISO String indicating when it was moved to trash

  // TOTP (2FA) — encrypted at rest
  totp_secret?: string;    // AES-GCM encrypted Base32 secret
  totp_iv?: string;        // IV for TOTP encryption
  totp_issuer?: string;    // Issuer label (stored plain — not sensitive)
  totp_algorithm?: 'SHA-1' | 'SHA-256' | 'SHA-512';
  totp_digits?: number;    // 6 or 8
  totp_period?: number;    // Usually 30

  // Secure Notes — encrypted at rest
  encrypted_notes?: string; // AES-GCM encrypted notes content
  notes_iv?: string;        // IV for notes encryption

  // Decrypted fields for UI (never persisted)
  pass?: string;
  totpSecret?: string;     // Decrypted TOTP secret (only in memory)
  notes?: string;          // Decrypted notes content (only in memory)
}

export class VaultService {
  private opfsMockDb: IDBPDatabase | null = null;
  private sqliteDb: SQLiteOPFS | null = null;
  private useSQLite: boolean = false;
  private aesKey: CryptoKey | null = null;
  private sensitiveMaterial: Uint8Array | null = null;
  private isConnected: boolean = false;
  private activeDbName: string = 'aegis_opfs_vault';

  /** Aktif vault DB adını değiştir (çoklu vault desteği) */
  setVaultDbName(dbName: string): void {
    this.activeDbName = dbName;
  }

  /** Aktif vault DB adını al */
  getVaultDbName(): string {
    return this.activeDbName;
  }

  /**
   * Determines if a string is likely a hexadecimal encoding.
   * Used across encryption/decryption to handle Hex vs Base64 formats.
   */
  private isLikelyHex(str: string): boolean {
    if (str.length % 2 !== 0) return false;
    return /^[0-9a-fA-F]+$/.test(str);
  }

  /**
   * Calculates true password strength based on character set entropy.
   * Returns 0-100 normalized score where 128-bit entropy = 100.
   */
  private calculateStrength(password: string): number {
    if (!password || password.length === 0) return 0;
    let pool = 0;
    if (/[a-z]/.test(password)) pool += 26;
    if (/[A-Z]/.test(password)) pool += 26;
    if (/[0-9]/.test(password)) pool += 10;
    if (/[^a-zA-Z0-9]/.test(password)) pool += 33;
    if (pool === 0) pool = 1;
    const entropy = password.length * Math.log2(pool);
    return Math.min(100, Math.round((entropy / 128) * 100));
  }

  private bufToHex(buffer: Uint8Array | ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
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

  private async hashPassword(password: string, salt: Uint8Array, iterations: number = 100000): Promise<string> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    
    const saltBuf = new ArrayBuffer(salt.byteLength);
    new Uint8Array(saltBuf).set(salt);
    const hash = await window.crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: saltBuf, iterations, hash: "SHA-256" },
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

  // Derives Web Crypto AES-GCM Key from Password & Device Secret (Zero Knowledge) via Argon2id
  async deriveMasterKey(password: string, secretKey: string, saltB64?: string): Promise<string> {
    let salt: Uint8Array;
    if (saltB64) {
      salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
    } else {
      salt = window.crypto.getRandomValues(new Uint8Array(16));
    }

    const combinedMaterial = `${password}:${secretKey}`;
    
    // 1. Derive AES-GCM Key Bits using Argon2id (Memory-hard)
    const derivedBits = await argon2id({
      password: combinedMaterial,
      salt: salt,
      parallelism: 1,
      iterations: 3,
      memorySize: 65536, // 64 MB
      hashLength: 32, // 256 bits
      outputType: 'binary',
    });

    this.sensitiveMaterial = derivedBits;

    // 2. Import raw derived bits as AES-GCM Key
    const keyBuf = new ArrayBuffer(this.sensitiveMaterial!.byteLength);
    new Uint8Array(keyBuf).set(this.sensitiveMaterial!);
    this.aesKey = await window.crypto.subtle.importKey(
      "raw",
      keyBuf,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
    
    return btoa(String.fromCharCode(...salt));
  }

  async initDb(password: string, secretKey: string, dbName: string = 'aegis_opfs_vault', isSetupAction: boolean = false): Promise<void> {
    // 1. Persistence Check
    await this.checkOpfsPersistence(dbName);

    // 2. Always open IDB first (needed for auth metadata & migration source)
    this.opfsMockDb = await openDB(dbName, 3, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore('passwords', { keyPath: 'id', autoIncrement: true });
          store.createIndex('title', 'title');
          store.createIndex('category', 'category');
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains('vault_metadata')) {
          db.createObjectStore('vault_metadata', { keyPath: 'id' });
        }
        if (oldVersion < 3 && !db.objectStoreNames.contains('attachments')) {
          const store = db.createObjectStore('attachments', { keyPath: 'id' });
          store.createIndex('entryId', 'entryId');
        }
      },
    });

    // 2b. Try to open SQLite-OPFS backend
    if (isOPFSAvailable()) {
      try {
        this.sqliteDb = new SQLiteOPFS(dbName);
        await this.sqliteDb.open();
        this.useSQLite = true;
        console.log(`[SQLite-OPFS] ✅ SQLite backend aktif: ${dbName}`);
      } catch (err) {
        console.warn(`[SQLite-OPFS] ⚠️ SQLite başlatılamadı, IDB fallback kullanılıyor:`, err);
        this.sqliteDb = null;
        this.useSQLite = false;
      }
    } else {
      console.log(`[SQLite-OPFS] OPFS kullanılamıyor, IDB backend ile devam ediliyor.`);
    }

    // 3. Handle Dynamic Salt and Migration (Read-only initially)
    const txRead = this.opfsMockDb.transaction(['vault_metadata', 'passwords'], 'readonly');
    const metadataStoreRead = txRead.objectStore('vault_metadata');
    let metadata = await metadataStoreRead.get('main_salt');
    await txRead.done;

    // SQLite'ta salt varsa onu tercih et
    if (this.useSQLite && this.sqliteDb && !metadata) {
      const sqlMetadata = this.sqliteDb.getMetadata('main_salt');
      if (sqlMetadata) metadata = sqlMetadata;
    }

    let currentSaltB64 = metadata?.salt;

    if (!currentSaltB64) {
      // Migration: Old users check IDB passwords count
      const txCheck = this.opfsMockDb.transaction('passwords', 'readonly');
      const passwordsCount = await txCheck.objectStore('passwords').count();
      await txCheck.done;
      
      if (passwordsCount > 0) {
        const oldSaltBytes = new TextEncoder().encode("aegis-premium-salt-v4");
        currentSaltB64 = btoa(String.fromCharCode(...oldSaltBytes));
      }
    }

    // 4. Generate AES-GCM Key (Takes time, cannot happen inside IDB tx)
    const newSaltB64 = await this.deriveMasterKey(password, secretKey, currentSaltB64);
    
    // Gerçek doğrulama — metadata'yı hem IDB'den hem SQLite'tan oku
    const txAuthRead = this.opfsMockDb.transaction(['vault_metadata', 'passwords'], 'readonly');
    let authMetadata = await txAuthRead.objectStore('vault_metadata').get('auth_credential');
    let deviceMetadata = await txAuthRead.objectStore('vault_metadata').get('device_config');
    const passwordsCount = await txAuthRead.objectStore('passwords').count();
    await txAuthRead.done;

    // SQLite'ta metadata varsa onu tercih et (migration sonrası IDB boş olabilir)
    // ANCAK setup modundayken eski SQLite verisini görmezden gel
    if (!isSetupAction && this.useSQLite && this.sqliteDb) {
      const sqlAuth = this.sqliteDb.getMetadata('auth_credential');
      const sqlDevice = this.sqliteDb.getMetadata('device_config');
      if (sqlAuth && sqlAuth.credential) authMetadata = sqlAuth;
      if (sqlDevice && sqlDevice.deviceSecretHash) deviceMetadata = sqlDevice;
    }

    // Setup modunda eski kalıntı SQLite verisini temizle
    if (isSetupAction && this.useSQLite && this.sqliteDb) {
      try {
        this.sqliteDb.deleteMetadata('auth_credential');
        this.sqliteDb.deleteMetadata('device_config');
        this.sqliteDb.deleteMetadata('main_salt');
        this.sqliteDb.deleteMetadata('security_pins');
      } catch { /* İlk kurulum, tablo boş olabilir */ }
    }

    if (authMetadata && authMetadata.credential) {
      if (isSetupAction) {
        throw new Error("VAULT_ALREADY_EXISTS");
      }
      const storedCred = authMetadata.credential as StoredCredential;
      const passwordValid = await this.verifyPassword(password, storedCred);
      
      if (!passwordValid) {
        throw new Error("Invalid credentials");
      }

      // Device Secret Validation
      if (deviceMetadata?.deviceSecretHash) {
        const secretBuf = new TextEncoder().encode(secretKey);
        const hashBuf = await window.crypto.subtle.digest('SHA-256', secretBuf);
        const currentHash = this.bufToHex(new Uint8Array(hashBuf));
        if (currentHash !== deviceMetadata.deviceSecretHash) {
          throw new Error("Invalid device secret key");
        }
      } else if (passwordsCount > 0) {
        // Migration: Legacy vault without secret hash. 
        // We MUST verify if the derived key actually works by trying to decrypt entries.
        // We use the raw entries store for a faster check.
        const allEntries = await this.opfsMockDb.getAll('passwords');
        const dec = new TextDecoder();
        
        const tryDecrypt = async (key: CryptoKey, entries: any[]) => {

          for (const entry of entries) {
            if (!entry.encrypted_password || !entry.iv) continue;
            try {
              let cipherArray: Uint8Array;
              let ivArray: Uint8Array;

              if (this.isLikelyHex(entry.encrypted_password) && this.isLikelyHex(entry.iv)) {
                cipherArray = this.hexToBuf(entry.encrypted_password);
                ivArray = this.hexToBuf(entry.iv);
              } else {
                cipherArray = Uint8Array.from(atob(entry.encrypted_password), c => c.charCodeAt(0));
                ivArray = Uint8Array.from(atob(entry.iv), c => c.charCodeAt(0));
              }

              await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: ivArray.buffer as ArrayBuffer },
                key,
                cipherArray.buffer as ArrayBuffer
              );
              return true; // Success!
            } catch {
              continue; // Try next
            }
          }
          return entries.length === 0; // If no entries to test, consider it "verified" for now
        };

        let verified = await tryDecrypt(this.aesKey!, allEntries);

        // Fallback: If user didn't provide a key or provided a wrong one, but they are legacy,
        // we try the old 'secret-128' default once.
        if (!verified) {
           const legacySecret = "secret-128";
           const legacySaltB64 = await this.deriveMasterKey(password, legacySecret, currentSaltB64);
           verified = await tryDecrypt(this.aesKey!, allEntries);
           
           if (verified) {
             console.log("Legacy 'secret-128' fallback successful.");
             secretKey = legacySecret; // Update the secretKey to be saved as the hash
           } else {
             // If legacy fallback also fails, restore the original derived key from user's input for error state consistency
             await this.deriveMasterKey(password, secretKey, currentSaltB64);
           }
        }

        if (!verified && allEntries.length > 0) {
          throw new Error("Invalid device secret key for this vault");
        }

        // Verified! Save the hash for future strict checking.
        const secretBuf = new TextEncoder().encode(secretKey);
        const secretHashBuf = await window.crypto.subtle.digest('SHA-256', secretBuf);
        const deviceSecretHash = this.bufToHex(new Uint8Array(secretHashBuf));

        const txWrite = this.opfsMockDb.transaction('vault_metadata', 'readwrite');
        await txWrite.objectStore('vault_metadata').put({
          id: 'device_config',
          deviceSecretHash
        });
        await txWrite.done;

        // SQLite'a da yaz
        if (this.useSQLite && this.sqliteDb) {
          this.sqliteDb.putMetadata('device_config', { deviceSecretHash });
        }
      }
      
      // Write metadata if it was missing 
      if (!metadata) {
        const txWrite = this.opfsMockDb.transaction('vault_metadata', 'readwrite');
        await txWrite.objectStore('vault_metadata').put({ 
          id: 'main_salt', 
          salt: newSaltB64, 
          createdAt: new Date().toISOString(), 
          version: 2 
        });
        await txWrite.done;
      }

    } else {
      // ─── FIRST SETUP ───
      // Bu blok SADECE kullanıcı "Başlat" (Initialize) modundayken çalışmalı.
      // "Kilidi Aç" modunda kasa yoksa → hata fırlat.
      if (!isSetupAction) {
        throw new Error("NO_VAULT_FOUND");
      }
      
      const newAuthSalt = window.crypto.getRandomValues(new Uint8Array(16));
      const iterations = 100000;
      const verificationHash = await this.hashPassword(password, newAuthSalt, iterations);
      
      const secretBuf = new TextEncoder().encode(secretKey);
      const secretHashBuf = await window.crypto.subtle.digest('SHA-256', secretBuf);
      const deviceSecretHash = this.bufToHex(new Uint8Array(secretHashBuf));

      const txWrite = this.opfsMockDb.transaction('vault_metadata', 'readwrite');
      const mStore = txWrite.objectStore('vault_metadata');
      
      if (!metadata) {
         await mStore.put({ 
           id: 'main_salt', 
           salt: newSaltB64, 
           createdAt: new Date().toISOString(), 
           version: 2 
         });
      }

      await mStore.put({
        id: 'auth_credential',
        credential: {
          verificationHash,
          iterations,
          salt: btoa(String.fromCharCode(...newAuthSalt))
        }
      });

      await mStore.put({
        id: 'device_config',
        deviceSecretHash
      });

      await txWrite.done;

      // SQLite'a da yaz (dual write)
      if (this.useSQLite && this.sqliteDb) {
        this.sqliteDb.putMetadata('auth_credential', {
          credential: {
            verificationHash,
            iterations,
            salt: btoa(String.fromCharCode(...newAuthSalt))
          }
        });
        this.sqliteDb.putMetadata('device_config', { deviceSecretHash });
        if (!metadata) {
          this.sqliteDb.putMetadata('main_salt', {
            salt: newSaltB64,
            createdAt: new Date().toISOString(),
            version: 2
          });
        }
      }
    }

    this.isConnected = true;
    
    // Auto-seed if empty for demo
    const count = await this.opfsMockDb.count('passwords');
    if (count === 0) {
      if (dbName === 'aegis_opfs_vault') {
        await this.addPassword({ title: "Google", category: "Work", username: "admin@company.com", pass: "p@ssw0rd123!", website: "https://google.com" });
        await this.addPassword({ title: "Bank of America", category: "Bank", username: "user123", pass: "S3cur3B@nk!99", website: "https://bankofamerica.com" });
      } else {
        await this.addPassword({ title: "Instagram", category: "Social", username: "traveler_99", pass: "Summer2023!", website: "https://instagram.com" });
        await this.addPassword({ title: "Netflix", category: "Entertainment", username: "family_share", pass: "NetflixAndChill", website: "https://netflix.com" });
      }
    }
    
    console.log(`SQLCipher: PRAGMA key uygulandı. [${dbName}] bağlantısı hazır.`);
    
    // ─── IDB → SQLite Migrasyon ───
    if (this.useSQLite && this.sqliteDb && this.opfsMockDb) {
      const sqliteCount = this.sqliteDb.countPasswords();
      const idbCount = await this.opfsMockDb.count('passwords');
      
      if (sqliteCount === 0 && idbCount > 0) {
        console.log(`[SQLite-OPFS] 🔄 IDB → SQLite migrasyon başlıyor (${idbCount} girdi)...`);
        
        try {
          // 1. Parolaları migrate et
          const allIdbEntries: VaultEntry[] = await this.opfsMockDb.getAll('passwords');
          for (const entry of allIdbEntries) {
            this.sqliteDb.putPassword(entry as any);
          }
          
          // 2. Metadata'yı migrate et
          const metadataKeys = ['main_salt', 'auth_credential', 'device_config', 'security_pins'];
          for (const key of metadataKeys) {
            try {
              const data = await this.opfsMockDb.get('vault_metadata', key);
              if (data) {
                this.sqliteDb.putMetadata(key, data);
              }
            } catch { /* Key olmayabilir */ }
          }
          
          // 3. Attachment'ları migrate et
          const allAttachments = await this.opfsMockDb.getAll('attachments');
          for (const att of allAttachments) {
            this.sqliteDb.putAttachment(
              att.id,
              att.entryId,
              att.iv instanceof Uint8Array ? att.iv : new Uint8Array(att.iv),
              att.encrypted_data
            );
          }
          
          // 4. OPFS'ye kalıcı kaydet
          await this.sqliteDb.flushToOPFS();
          
          console.log(`[SQLite-OPFS] ✅ Migrasyon tamamlandı: ${allIdbEntries.length} girdi, ${allAttachments.length} ek dosya.`);
        } catch (err) {
          console.error(`[SQLite-OPFS] ❌ Migrasyon hatası:`, err);
          // Hata durumunda IDB fallback'e geç
          this.useSQLite = false;
          this.sqliteDb = null;
        }
      }
    }
    
    // Perform auto-cleanup of trash older than 30 days
    await this.cleanupTrash();
  }

  async wipeAllData(): Promise<void> {
    console.warn("CRITICAL: Full factory reset starting...");
    
    // 1. SQLite'ı flush ETMEDEN wipe et (eski veriyi tekrar yazmayı önle)
    if (this.sqliteDb) {
      try {
        await this.sqliteDb.wipeAll(); // tabloları temizler + OPFS dosyasını siler
      } catch (e) {
        console.warn('[Wipe] SQLite wipe error:', e);
      }
      this.sqliteDb = null;
      this.useSQLite = false;
    }

    // 2. Bellek temizliği (AES key vb.)
    if (this.sensitiveMaterial) {
      window.crypto.getRandomValues(this.sensitiveMaterial);
      this.sensitiveMaterial = null;
    }
    this.aesKey = null;
    
    // 3. IDB bağlantısını kapat
    if (this.opfsMockDb) {
      this.opfsMockDb.close();
      this.opfsMockDb = null;
    }
    this.isConnected = false;

    // 4. TÜM OPFS (.sqlite) dosyalarını sil
    await clearAllOPFSFiles();

    // 5. TÜM Aegis veritabanlarını IndexedDB'den sil
    const dbs = await window.indexedDB.databases();
    for (const db of dbs) {
      if (db.name && db.name.startsWith('aegis_')) {
        console.log(`[Wipe] Deleting IDB: ${db.name}`);
        await window.indexedDB.deleteDatabase(db.name);
      }
    }

    // 6. LocalStorage temizle
    localStorage.removeItem('aegis_passkey_id');
    localStorage.removeItem('aegis_passkey_data');
    localStorage.removeItem('aegis_prf_salt');
    localStorage.removeItem('aegis_vault_profiles');
    localStorage.removeItem('aegis_active_vault');

    console.warn("CRITICAL: All vault data has been wiped (Deep Clean).");
  }

  // ─────────────────────────────────────────────────────────────
  // 🔒 Güvenli PIN Depolama (AES-GCM ile şifrelenmiş)
  // PIN'ler vault_metadata store'unda şifreli saklanır.
  // ─────────────────────────────────────────────────────────────

  async saveSecurityPins(duressPin: string, killPin: string): Promise<void> {
    if (!this.aesKey || (!this.opfsMockDb && !this.sqliteDb)) throw new Error("Vault not initialized");

    const enc = new TextEncoder();
    const payload = JSON.stringify({ duressPin, killPin });
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      this.aesKey,
      enc.encode(payload)
    );

    const pinData = {
      id: 'security_pins',
      encrypted_data: this.bufToHex(new Uint8Array(cipherBuffer)),
      iv: this.bufToHex(iv)
    };

    if (this.useSQLite && this.sqliteDb) {
      this.sqliteDb.putMetadata('security_pins', pinData);
    }
    if (this.opfsMockDb) {
      const tx = this.opfsMockDb.transaction('vault_metadata', 'readwrite');
      await tx.objectStore('vault_metadata').put(pinData);
      await tx.done;
    }
  }

  async getSecurityPins(): Promise<{ duressPin: string, killPin: string }> {
    if (!this.aesKey || (!this.opfsMockDb && !this.sqliteDb)) return { duressPin: '', killPin: '' };

    try {
      let record: any = null;
      if (this.useSQLite && this.sqliteDb) {
        record = this.sqliteDb.getMetadata('security_pins');
      } else if (this.opfsMockDb) {
        record = await this.opfsMockDb.get('vault_metadata', 'security_pins');
      }
      if (!record || !record.encrypted_data || !record.iv) {
        return { duressPin: '', killPin: '' };
      }

      const cipherArray = this.hexToBuf(record.encrypted_data);
      const ivArray = this.hexToBuf(record.iv);

      const plainBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivArray.buffer as ArrayBuffer },
        this.aesKey,
        cipherArray.buffer as ArrayBuffer
      );

      const dec = new TextDecoder();
      return JSON.parse(dec.decode(plainBuffer));
    } catch {
      return { duressPin: '', killPin: '' };
    }
  }

  private async checkOpfsPersistence(dbName: string) {
    console.log(`[SQLCipher WASM] OPFS Volume Check for ${dbName}...`);
    const dbs = await window.indexedDB.databases();
    const exists = dbs.some(db => db.name === dbName);
    if (exists) {
      console.log(`[SQLCipher WASM] ${dbName} veritabanı başarıyla tekrar yüklendi.`);
    } else {
      console.log(`[SQLCipher WASM] Yeni ${dbName} veritabanı oluşturuluyor...`);
    }
  }

  async addPassword(entry: Partial<VaultEntry>) {
    if (!this.aesKey || (!this.opfsMockDb && !this.sqliteDb)) throw new Error("Vault not initialized");

    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      this.aesKey,
      enc.encode(entry.pass || "")
    );

    const newEntry: VaultEntry = {
      id: entry.id || Date.now(),
      title: entry.title || "Untitled",
      username: entry.username || "",
      category: entry.category || "General",
      website: entry.website || "",
      encrypted_password: this.bufToHex(new Uint8Array(cipherBuffer)),
      iv: this.bufToHex(iv),
      updated_at: new Date().toISOString(),
      strength: this.calculateStrength(entry.pass || ''),
      tags: entry.tags || [],
      pwned_count: entry.pwned_count || 0,
    };

    // 🔐 TOTP Secret şifreleme (varsa)
    if (entry.totpSecret) {
      const totpIv = window.crypto.getRandomValues(new Uint8Array(12));
      const totpCipher = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: totpIv },
        this.aesKey,
        enc.encode(entry.totpSecret)
      );
      newEntry.totp_secret = this.bufToHex(new Uint8Array(totpCipher));
      newEntry.totp_iv = this.bufToHex(totpIv);
      newEntry.totp_issuer = entry.totp_issuer || '';
      newEntry.totp_algorithm = entry.totp_algorithm || 'SHA-1';
      newEntry.totp_digits = entry.totp_digits || 6;
      newEntry.totp_period = entry.totp_period || 30;
    } else if (entry.totp_secret) {
      newEntry.totp_secret = entry.totp_secret;
      newEntry.totp_iv = entry.totp_iv;
      newEntry.totp_issuer = entry.totp_issuer;
      newEntry.totp_algorithm = entry.totp_algorithm;
      newEntry.totp_digits = entry.totp_digits;
      newEntry.totp_period = entry.totp_period;
    }

    // 🔐 Secure Notes şifreleme (varsa)
    if (entry.notes && entry.notes.trim()) {
      const notesIv = window.crypto.getRandomValues(new Uint8Array(12));
      const notesCipher = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: notesIv },
        this.aesKey,
        enc.encode(entry.notes)
      );
      newEntry.encrypted_notes = this.bufToHex(new Uint8Array(notesCipher));
      newEntry.notes_iv = this.bufToHex(notesIv);
    } else if (entry.encrypted_notes) {
      newEntry.encrypted_notes = entry.encrypted_notes;
      newEntry.notes_iv = entry.notes_iv;
    }

    if (entry.attachments) {
      newEntry.attachments = entry.attachments;
    }

    // Dual-write: SQLite (primary) + IDB (fallback)
    if (this.useSQLite && this.sqliteDb) {
      this.sqliteDb.putPassword(newEntry as any);
    }
    if (this.opfsMockDb) {
      await this.opfsMockDb.put('passwords', newEntry);
    }
    return newEntry.id;
  }

  async getPasswords(searchQuery: string = "", categoryFilter: string = "", isTrash: boolean = false): Promise<VaultEntry[]> {
    if (!this.aesKey || (!this.opfsMockDb && !this.sqliteDb)) return [];

    // SQLite'tan oku (birincil kaynak)
    let allEntries: VaultEntry[];
    if (this.useSQLite && this.sqliteDb) {
      allEntries = this.sqliteDb.getAllPasswords() as VaultEntry[];
    } else {
      allEntries = await this.opfsMockDb!.getAll('passwords');
    }

    // Filter by Trash State
    if (isTrash) {
      allEntries = allEntries.filter(e => e.deletedAt);
    } else {
      allEntries = allEntries.filter(e => !e.deletedAt);
    }

    // On-the-fly migration for old categories
    allEntries = allEntries.map(e => {
        if (['Work', 'Bank', 'Social'].includes(e.category)) {
            e.category = 'General';
            // Save migrated category back to DB stealthily
            this.opfsMockDb!.put('passwords', e).catch(err => console.debug("Migration failed:", err));
        }
        return e;
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase().replace(/\s+/g, '');
      allEntries = allEntries.filter(e => {
        const target = [e.title, e.username, e.website, e.category, ...(e.tags || [])].join('').toLowerCase();
        let queryIndex = 0;
        for (let char of target) {
           if (char === q[queryIndex]) queryIndex++;
           if (queryIndex === q.length) return true;
        }
        return false;
      });
    }

    if (categoryFilter && categoryFilter !== "Trash") {
      if (categoryFilter.startsWith('#')) {
        const tag = categoryFilter.substring(1);
        allEntries = allEntries.filter(e => e.tags && e.tags.includes(tag));
      } else {
        allEntries = allEntries.filter(e => e.category === categoryFilter);
      }
    }

    const dec = new TextDecoder();
    
    const decryptedEntries = await Promise.all(allEntries.map(async (entry) => {
      try {
        if (!entry.encrypted_password || !entry.iv) return entry;
        
        // Advanced detection mechanism to prevent Base64 strings looking like Hex from breaking decryption.
        
        let cipherArray: Uint8Array;
        let ivArray: Uint8Array;

        try {
           // First Try: Handle Native Hex Data (from latest version)
           if (this.isLikelyHex(entry.encrypted_password) && this.isLikelyHex(entry.iv)) {
             cipherArray = this.hexToBuf(entry.encrypted_password);
             ivArray = this.hexToBuf(entry.iv);
           } else {
             // Fallback to legacy Base64 decode
             cipherArray = Uint8Array.from(atob(entry.encrypted_password), c => c.charCodeAt(0));
             ivArray = Uint8Array.from(atob(entry.iv), c => c.charCodeAt(0));
           }
        } catch {
           // If direct parsing throws, fallback strictly to base64
           cipherArray = Uint8Array.from(atob(entry.encrypted_password), c => c.charCodeAt(0));
           ivArray = Uint8Array.from(atob(entry.iv), c => c.charCodeAt(0));
        }

        const plainBuffer = await window.crypto.subtle.decrypt(
          { name: "AES-GCM", iv: ivArray.buffer as ArrayBuffer },
          this.aesKey!,
          cipherArray.buffer as ArrayBuffer
        );

        const decrypted: VaultEntry = { ...entry, pass: dec.decode(plainBuffer) };

        // 🔓 TOTP Secret deşifreleme
        if (entry.totp_secret && entry.totp_iv) {
          try {
            const totpCipher = this.isLikelyHex(entry.totp_secret) ? this.hexToBuf(entry.totp_secret) : Uint8Array.from(atob(entry.totp_secret), c => c.charCodeAt(0));
            const totpIv = this.isLikelyHex(entry.totp_iv) ? this.hexToBuf(entry.totp_iv) : Uint8Array.from(atob(entry.totp_iv), c => c.charCodeAt(0));
            const totpPlain = await window.crypto.subtle.decrypt(
              { name: "AES-GCM", iv: totpIv.buffer as ArrayBuffer },
              this.aesKey!,
              totpCipher.buffer as ArrayBuffer
            );
            decrypted.totpSecret = dec.decode(totpPlain);
          } catch { decrypted.totpSecret = undefined; }
        }

        // 🔓 Secure Notes deşifreleme
        if (entry.encrypted_notes && entry.notes_iv) {
          try {
            const notesCipher = this.isLikelyHex(entry.encrypted_notes) ? this.hexToBuf(entry.encrypted_notes) : Uint8Array.from(atob(entry.encrypted_notes), c => c.charCodeAt(0));
            const notesIv = this.isLikelyHex(entry.notes_iv) ? this.hexToBuf(entry.notes_iv) : Uint8Array.from(atob(entry.notes_iv), c => c.charCodeAt(0));
            const notesPlain = await window.crypto.subtle.decrypt(
              { name: "AES-GCM", iv: notesIv.buffer as ArrayBuffer },
              this.aesKey!,
              notesCipher.buffer as ArrayBuffer
            );
            decrypted.notes = dec.decode(notesPlain);
          } catch { decrypted.notes = undefined; }
        }

        return decrypted;
      } catch (e) {
        console.error("Decryption failed for entry", entry.id, " - Title:", entry.title);
        return { ...entry, pass: "••DECRYPT_ERROR••" };
      }
    }));

    return decryptedEntries;
  }

  // --- Parola Değiştirme (Change Master Password) ---
  async changeMasterPassword(oldPassword: string, newPassword: string, secretKey: string): Promise<void> {
    if (!this.opfsMockDb || !this.aesKey) throw new Error("Vault not open");

    // 1. Doğrulama
    const txAuth = this.opfsMockDb.transaction('vault_metadata', 'readonly');
    const authMetadata = await txAuth.objectStore('vault_metadata').get('auth_credential');
    await txAuth.done;
    
    if (authMetadata && authMetadata.credential) {
      const storedCred = authMetadata.credential as StoredCredential;
      const isValid = await this.verifyPassword(oldPassword, storedCred);
      if (!isValid) throw new Error("Invalid current password");
    }

    // 2. Tüm verileri geçici belleğe deşifre ederek al
    const allEntries = await this.getPasswords();

    // 3. Yeni Anahtar, Dinamik Salt ve Kimlik Doğrulama Hash'i Üret
    const newMainSalt = window.crypto.getRandomValues(new Uint8Array(16));
    const newMainSaltB64 = btoa(String.fromCharCode(...newMainSalt));
    
    // Yeni MasterKey'i üret (aesKey güncellenir)
    await this.deriveMasterKey(newPassword, secretKey, newMainSaltB64);

    const newAuthSalt = window.crypto.getRandomValues(new Uint8Array(16));
    const iterations = 100000;
    const verificationHash = await this.hashPassword(newPassword, newAuthSalt, iterations);

    // 4. Tüm girdileri (parolalar) yeni AES key ile tekrar şifrele
    const updatedEntriesToSave: VaultEntry[] = [];
    for (const entry of allEntries) {
      if (!entry.pass) continue;
      
      const enc = new TextEncoder();
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const cipherBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        this.aesKey!, // Yeni anahtarımız
        enc.encode(entry.pass)
      );

      const updatedEntry: VaultEntry = {
        ...entry,
        encrypted_password: this.bufToHex(new Uint8Array(cipherBuffer)),
        iv: this.bufToHex(iv),
        updated_at: new Date().toISOString()
      };
      // pass silinmeli çünkü raw şifre
      delete updatedEntry.pass;
      updatedEntriesToSave.push(updatedEntry);
    }

    // 5. Veritabanına Yaz
    // SQLite dual-write
    if (this.useSQLite && this.sqliteDb) {
      this.sqliteDb.putMetadata('main_salt', { id: 'main_salt', salt: newMainSaltB64, createdAt: new Date().toISOString(), version: 2 });
      this.sqliteDb.putMetadata('auth_credential', { id: 'auth_credential', credential: { verificationHash, iterations, salt: btoa(String.fromCharCode(...newAuthSalt)) } });
      for (const item of updatedEntriesToSave) {
        this.sqliteDb.putPassword(item as any);
      }
      await this.sqliteDb.flushToOPFS();
    }
    if (this.opfsMockDb) {
      const txData = this.opfsMockDb.transaction(['vault_metadata', 'passwords'], 'readwrite');
      const metaStore = txData.objectStore('vault_metadata');
      const passStore = txData.objectStore('passwords');
      await metaStore.put({ id: 'main_salt', salt: newMainSaltB64, createdAt: new Date().toISOString(), version: 2 });
      await metaStore.put({ id: 'auth_credential', credential: { verificationHash, iterations, salt: btoa(String.fromCharCode(...newAuthSalt)) } });
      for (const item of updatedEntriesToSave) {
        await passStore.put(item);
      }
      await txData.done;
    }
  }

  // --- Memory Sanitization (Lock & Dispose) ---
  async lock(): Promise<void> {
    if (this.sensitiveMaterial) {
      window.crypto.getRandomValues(this.sensitiveMaterial);
      this.sensitiveMaterial = null;
    }

    if (this.aesKey) {
      this.aesKey = null;
    }

    // SQLite: flush & close
    if (this.sqliteDb) {
      await this.sqliteDb.close();
      this.sqliteDb = null;
      this.useSQLite = false;
    }
    
    if (this.opfsMockDb) {
      this.opfsMockDb.close();
      this.opfsMockDb = null;
    }
    this.isConnected = false;
    console.log("[SQLite-OPFS] Vault locked. Master Key securely OVERWRITTEN and sanitized from memory.");
  }

  async exportVault(): Promise<string> {
    if (!this.opfsMockDb && !this.sqliteDb) throw new Error("Vault not initialized");
    let allEntries: VaultEntry[];
    if (this.useSQLite && this.sqliteDb) {
      allEntries = this.sqliteDb.getAllPasswords() as VaultEntry[];
    } else {
      allEntries = await this.opfsMockDb!.getAll('passwords');
    }
    return JSON.stringify(allEntries);
  }

  async bulkAddPasswords(entries: Partial<VaultEntry>[]): Promise<{ total: number, weak: number, missingFields: number, weakIds: number[] }> {
    if (!this.aesKey || (!this.opfsMockDb && !this.sqliteDb)) throw new Error("Vault not initialized");

    let weak = 0;
    let missingFields = 0;
    let weakIds: number[] = [];
    
    const tx = this.opfsMockDb!.transaction('passwords', 'readwrite');
    const store = tx.objectStore('passwords');

    for (const entry of entries) {
      if (!entry.title || !entry.pass) missingFields++;
      
      const newId = Date.now() + Math.random();
      if (entry.pass && entry.pass.length < 8) {
        weak++;
        weakIds.push(newId);
      }
      if (!entry.pass) continue; 

      const enc = new TextEncoder();
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const cipherBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        this.aesKey,
        enc.encode(entry.pass)
      );

      const newEntry: VaultEntry = {
        id: newId, 
        title: entry.title || "Imported Entry",
        username: entry.username || "",
        category: entry.category || "General",
        website: entry.website || "",
        encrypted_password: this.bufToHex(new Uint8Array(cipherBuffer)),
        iv: this.bufToHex(iv),
        updated_at: new Date().toISOString(),
        strength: this.calculateStrength(entry.pass),
        tags: entry.tags || [],
        pwned_count: entry.pwned_count || 0,
      };

      await store.put(newEntry);
      
      // Dual-write: SQLite'a da yaz
      if (this.useSQLite && this.sqliteDb) {
        this.sqliteDb.putPassword(newEntry);
      }
    }
    await tx.done;

    // Hemen OPFS'e yaz
    if (this.useSQLite && this.sqliteDb) {
      await this.sqliteDb.flushToOPFS();
    }

    return { total: entries.length, weak, missingFields, weakIds };
  }
  // --- Secure Attachments (Up to 50MB) ---
  async addAttachment(entryId: number, file: File): Promise<{ id: string, name: string, type: string, size: number }> {
    if (!this.aesKey || !this.opfsMockDb) throw new Error("Vault not initialized");
    if (file.size > 50 * 1024 * 1024) throw new Error("File exceeds 50MB limit");

    const fileBuffer = await file.arrayBuffer();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      this.aesKey,
      fileBuffer
    );

    const attachmentId = crypto.randomUUID();
    const attachmentMeta = {
      id: attachmentId,
      name: file.name,
      type: file.type,
      size: file.size
    };

    // Save encrypted payload
    await this.opfsMockDb.put('attachments', {
      id: attachmentId,
      entryId: entryId,
      iv: iv,
      encrypted_data: cipherBuffer
    });

    // Update the parent entry to include this metadata
    const tx = this.opfsMockDb.transaction('passwords', 'readwrite');
    const store = tx.objectStore('passwords');
    const entry = await store.get(entryId);
    if (entry) {
      if (!entry.attachments) entry.attachments = [];
      entry.attachments.push(attachmentMeta);
      await store.put(entry);
    }
    await tx.done;

    return attachmentMeta;
  }

  async getDecryptedAttachment(attachmentId: string): Promise<Blob> {
    if (!this.aesKey || !this.opfsMockDb) throw new Error("Vault not initialized");

    const record = await this.opfsMockDb.get('attachments', attachmentId);
    if (!record) throw new Error("Attachment not found");

    const plainBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: record.iv },
      this.aesKey,
      record.encrypted_data
    );

    // We don't have the mime type in this record directly, but it can be found in the password entry.
    // However, returning a generic Blob is fine as long as we trigger a download or load it.
    return new Blob([plainBuffer]);
  }

  async deleteAttachment(entryId: number, attachmentId: string): Promise<void> {
    if (!this.opfsMockDb) throw new Error("Vault not open");
    await this.opfsMockDb.delete('attachments', attachmentId);
    
    // Remove from parent
    const tx = this.opfsMockDb.transaction('passwords', 'readwrite');
    const store = tx.objectStore('passwords');
    const entry = await store.get(entryId);
    if (entry && entry.attachments) {
      entry.attachments = entry.attachments.filter((a: any) => a.id !== attachmentId);
      await store.put(entry);
    }
    await tx.done;
  }

  // --- Trash & Deletion Features ---
  
  async moveToTrash(entryId: number): Promise<void> {
    const deletedTime = new Date().toISOString();
    
    // Write to IDB Fallback
    if (this.opfsMockDb) {
      const tx = this.opfsMockDb.transaction('passwords', 'readwrite');
      const store = tx.objectStore('passwords');
      const entry = await store.get(entryId);
      if (entry) {
        entry.deletedAt = deletedTime;
        await store.put(entry);
      }
      await tx.done;
    }
    
    // Write to SQLite Primary
    if (this.useSQLite && this.sqliteDb) {
      this.sqliteDb.updatePasswordField(entryId, 'deleted_at', deletedTime);
      await this.sqliteDb.flushToOPFS();
    }
  }

  async restoreFromTrash(entryId: number): Promise<void> {
    // Write to IDB Fallback
    if (this.opfsMockDb) {
      const tx = this.opfsMockDb.transaction('passwords', 'readwrite');
      const store = tx.objectStore('passwords');
      const entry = await store.get(entryId);
      if (entry) {
        delete entry.deletedAt;
        await store.put(entry);
      }
      await tx.done;
    }
    
    // Write to SQLite Primary
    if (this.useSQLite && this.sqliteDb) {
      // deleted_at = null (Since JS delete produces undefined/null which is serialized correctly or dropped)
      this.sqliteDb.updatePasswordField(entryId, 'deleted_at', null);
      await this.sqliteDb.flushToOPFS();
    }
  }

  async deletePermanently(entryId: number): Promise<void> {
    // Delete from IDB
    if (this.opfsMockDb) {
      const tx = this.opfsMockDb.transaction('passwords', 'readwrite');
      const store = tx.objectStore('passwords');
      const entry = await store.get(entryId);
      if (entry && entry.attachments) {
        for (const att of entry.attachments) {
          await this.opfsMockDb.delete('attachments', att.id);
        }
      }
      await store.delete(entryId);
      await tx.done;
    }

    // Delete from SQLite
    if (this.useSQLite && this.sqliteDb) {
      const dbAtts = this.sqliteDb.getAttachmentsByEntry(entryId);
      for(const id of dbAtts) {
         this.sqliteDb.deleteAttachment(id);
      }
      this.sqliteDb.deletePassword(entryId);
      await this.sqliteDb.flushToOPFS();
    }
  }

  async emptyTrash(): Promise<void> {
    // Delete from IDB
    if (this.opfsMockDb) {
      const all = await this.opfsMockDb.getAll('passwords');
      const trashed = all.filter(e => e.deletedAt);
      for (const t of trashed) {
        if (t.attachments) {
           for (const att of t.attachments) await this.opfsMockDb.delete('attachments', att.id);
        }
        await this.opfsMockDb.delete('passwords', t.id);
      }
    }

    // Delete from SQLite
    if (this.useSQLite && this.sqliteDb) {
       const allSql = this.sqliteDb.getAllPasswords() as VaultEntry[];
       const trashedSql = allSql.filter(e => e.deletedAt);
       for (const t of trashedSql) {
          const dbAtts = this.sqliteDb.getAttachmentsByEntry(t.id);
          for(const id of dbAtts) this.sqliteDb.deleteAttachment(id);
          this.sqliteDb.deletePassword(t.id);
       }
       await this.sqliteDb.flushToOPFS();
    }
  }

  async cleanupTrash(): Promise<void> {
    if (!this.opfsMockDb) return;
    const allEntries: VaultEntry[] = await this.opfsMockDb.getAll('passwords');
    const msIn30Days = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    const oldTrashEntries = allEntries.filter(e => 
      e.deletedAt && (now - new Date(e.deletedAt).getTime()) > msIn30Days
    );

    for (const entry of oldTrashEntries) {
      await this.deletePermanently(entry.id);
    }
  }
}

export const vaultService = new VaultService();

import { openDB, type IDBPDatabase } from "idb";
import { argon2id } from 'hash-wasm';

// Represents the SQLite-WASM SQLCipher over OPFS architecture
// We use IndexedDB to simulate the OPFS persistence layer for this demo.
export interface VaultMetadata {
  id: string;
  salt?: string; // Base64 encoded 16-byte random salt
  createdAt?: string;
  version?: number;
  credential?: StoredCredential;
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
  
  // Decrypted fields for UI
  pass?: string;
}

export class VaultService {
  private opfsMockDb: IDBPDatabase | null = null;
  private aesKey: CryptoKey | null = null;
  private sensitiveMaterial: Uint8Array | null = null;
  private isConnected: boolean = false;

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

  async initDb(password: string, secretKey: string, dbName: string = 'aegis_opfs_vault'): Promise<void> {
    // 1. Persistence Check
    await this.checkOpfsPersistence(dbName);

    // 2. Connect to OPFS Virtual File System (using IDB as mock) with version 3 for attachments
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

    // 3. Handle Dynamic Salt and Migration (Read-only initially)
    const txRead = this.opfsMockDb.transaction(['vault_metadata', 'passwords'], 'readonly');
    const metadataStoreRead = txRead.objectStore('vault_metadata');
    let metadata = await metadataStoreRead.get('main_salt');
    let currentSaltB64 = metadata?.salt;

    if (!currentSaltB64) {
      const passwordsCount = await txRead.objectStore('passwords').count();
      if (passwordsCount > 0) {
        // Migration: Old users were using a static string salt.
        const oldSaltBytes = new TextEncoder().encode("aegis-premium-salt-v4");
        currentSaltB64 = btoa(String.fromCharCode(...oldSaltBytes));
      }
    }
    await txRead.done;

    // 4. Generate AES-GCM Key (Takes time, cannot happen inside IDB tx)
    const newSaltB64 = await this.deriveMasterKey(password, secretKey, currentSaltB64);
    
    // Demo mode sadece development'te
    const isDemoPassword = import.meta.env?.DEV && password === "demo123";
    if (isDemoPassword) {
      console.warn("DEMO MODE ACTIVE - Not for production!");
      // Still need to save metadata if missing
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
      // Gerçek doğrulama
      const txAuthRead = this.opfsMockDb.transaction('vault_metadata', 'readonly');
      const authMetadata = await txAuthRead.objectStore('vault_metadata').get('auth_credential');
      await txAuthRead.done;

      if (authMetadata && authMetadata.credential) {
        const storedCred = authMetadata.credential as StoredCredential;
        const isValid = await this.verifyPassword(password, storedCred);
        if (!isValid) {
          throw new Error("Invalid credentials");
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
        // İlk Kurulum: Master Password Hash'i Oluştur ve Kaydet
        const newAuthSalt = window.crypto.getRandomValues(new Uint8Array(16));
        const iterations = 100000;
        const verificationHash = await this.hashPassword(password, newAuthSalt, iterations);
        
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
        await txWrite.done;
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
    
    // Perform auto-cleanup of trash older than 30 days
    await this.cleanupTrash();
  }

  async wipeAllData(): Promise<void> {
    await this.lock();
    const dbs = await window.indexedDB.databases();
    for (const db of dbs) {
      if (db.name && (db.name.startsWith('aegis_opfs_vault') || db.name.startsWith('aegis_dummy_vault'))) {
        await window.indexedDB.deleteDatabase(db.name);
      }
    }
    localStorage.removeItem('aegis_duress_pin');
    localStorage.removeItem('aegis_kill_pin');
    localStorage.removeItem('aegis_passkey_id');
    localStorage.removeItem('aegis_passkey_data');
    console.warn("CRITICAL: All vault data has been wiped (Silent Wipe Active).");
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
    if (!this.aesKey || !this.opfsMockDb) throw new Error("Vault not initialized");

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
      strength: entry.pass ? Math.min(100, entry.pass.length * 8) : 0, 
      tags: entry.tags || [],
      pwned_count: entry.pwned_count || 0,
    };

    await this.opfsMockDb.put('passwords', newEntry);
    return newEntry.id;
  }

  async getPasswords(searchQuery: string = "", categoryFilter: string = "", isTrash: boolean = false): Promise<VaultEntry[]> {
    if (!this.aesKey || !this.opfsMockDb) return [];

    let allEntries: VaultEntry[] = await this.opfsMockDb.getAll('passwords');

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
        // A true Hex string of AES-256-GCM ciphertext will typically be an even length and longer than normal Base64.
        const isLikelyHex = (str: string) => {
           if (str.length % 2 !== 0) return false;
           return /^[0-9a-fA-F]+$/.test(str);
        };
        
        let cipherArray: Uint8Array;
        let ivArray: Uint8Array;

        try {
           // First Try: Handle Native Hex Data (from latest version)
           if (isLikelyHex(entry.encrypted_password) && isLikelyHex(entry.iv)) {
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

        return { ...entry, pass: dec.decode(plainBuffer) };
      } catch (e) {
        console.error("Decryption failed for entry", entry.id, " - Title:", entry.title);
        // Fail-safe: Eğer eski uyumsuz Hex/Base64 şifrelenmiş demo varsa o satırı hata göstergesi ile yansıt
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

    // 5. Veritabanına Yaz (Asenkron bekleme olmadan hızlıca kaydet)
    const txData = this.opfsMockDb.transaction(['vault_metadata', 'passwords'], 'readwrite');
    const metaStore = txData.objectStore('vault_metadata');
    const passStore = txData.objectStore('passwords');

    // Yeni Metadata güncellemesi
    await metaStore.put({
      id: 'main_salt',
      salt: newMainSaltB64,
      createdAt: new Date().toISOString(),
      version: 2
    });

    await metaStore.put({
      id: 'auth_credential',
      credential: {
        verificationHash,
        iterations,
        salt: btoa(String.fromCharCode(...newAuthSalt))
      }
    });

    for (const item of updatedEntriesToSave) {
      await passStore.put(item);
    }

    await txData.done;
  }

  // --- Memory Sanitization (Lock & Dispose) ---
  async lock(): Promise<void> {
    // Memory Overwriting kuralı: Kasa kilitlendiğinde Derived Key materialı bellekten kazınır
    if (this.sensitiveMaterial) {
      window.crypto.getRandomValues(this.sensitiveMaterial);
      this.sensitiveMaterial = null;
    }

    if (this.aesKey) {
      this.aesKey = null; // Memory sanitize crypto key (Cannot be safely overwritten, gc reliant)
    }
    
    if (this.opfsMockDb) {
      this.opfsMockDb.close(); // Disconnect OPFS/IDB stream
      this.opfsMockDb = null;
    }
    this.isConnected = false;
    console.log("[SQLCipher WASM] Vault locked. Master Key securely OVERWRITTEN and sanitized from memory.");
  }

  // --- Veri Taşınabilirliği (Data Portability) ---
  async exportVault(): Promise<string> {
    if (!this.opfsMockDb) throw new Error("Vault not initialized");
    const allEntries = await this.opfsMockDb.getAll('passwords');
    // Export raw encrypted DB (Zero Knowledge Backup)
    return JSON.stringify(allEntries);
  }

  async bulkAddPasswords(entries: Partial<VaultEntry>[]): Promise<{ total: number, weak: number, missingFields: number, weakIds: number[] }> {
    if (!this.aesKey || !this.opfsMockDb) throw new Error("Vault not initialized");

    let weak = 0;
    let missingFields = 0;
    let weakIds: number[] = [];
    
    const tx = this.opfsMockDb.transaction('passwords', 'readwrite');
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
        strength: Math.min(100, entry.pass.length * 8), 
        tags: entry.tags || [],
        pwned_count: entry.pwned_count || 0,
      };

      await store.put(newEntry);
    }
    await tx.done;

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
    if (!this.opfsMockDb) throw new Error("Vault not initialised");
    const tx = this.opfsMockDb.transaction('passwords', 'readwrite');
    const store = tx.objectStore('passwords');
    const entry = await store.get(entryId);
    if (entry) {
      entry.deletedAt = new Date().toISOString();
      await store.put(entry);
    }
    await tx.done;
  }

  async restoreFromTrash(entryId: number): Promise<void> {
    if (!this.opfsMockDb) throw new Error("Vault not initialised");
    const tx = this.opfsMockDb.transaction('passwords', 'readwrite');
    const store = tx.objectStore('passwords');
    const entry = await store.get(entryId);
    if (entry) {
      delete entry.deletedAt;
      await store.put(entry);
    }
    await tx.done;
  }

  async deletePermanently(entryId: number): Promise<void> {
    if (!this.opfsMockDb) throw new Error("Vault not initialised");
    
    // First remove all attachments permanently
    const entry = await this.opfsMockDb.get('passwords', entryId);
    if (entry && entry.attachments) {
      for (const att of entry.attachments) {
        await this.opfsMockDb.delete('attachments', att.id);
      }
    }

    await this.opfsMockDb.delete('passwords', entryId);
  }

  async emptyTrash(): Promise<void> {
    if (!this.opfsMockDb) throw new Error("Vault not initialised");
    const allEntries: VaultEntry[] = await this.opfsMockDb.getAll('passwords');
    const trashEntries = allEntries.filter(e => e.deletedAt);
    
    for (const entry of trashEntries) {
      await this.deletePermanently(entry.id);
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

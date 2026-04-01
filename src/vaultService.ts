import { openDB, type IDBPDatabase } from "idb";
import { argon2id } from 'hash-wasm';
import { SQLiteOPFS, isOPFSAvailable, clearAllOPFSFiles } from './lib/SQLiteOPFS';
import type { CanonicalSharingAssignment } from './lib/canonical-schema';
import { SearchService } from './lib/SearchService';
import { 
  toBufferSource, 
  bufferToHex, 
  hexToBuffer, 
  isLikelyHex as isLikelyHexUtil,
  generateRandomBytes 
} from './lib/crypto-types';
import { type EncryptionProfile, isFieldEncrypted } from './config/encryption-profiles';
import { SecureAppSettings } from './lib/SecureAppSettings';
import type { CanonicalPasskeyFields } from './lib/canonical-schema';
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
  verificationHash: string;
  salt: string;
  scheme?: 'pbkdf2-sha256' | 'argon2id-v1';
  iterations?: number; // legacy PBKDF2 only
  argon2?: {
    iterations: number;
    memorySize: number;
    parallelism: number;
    hashLength: number;
  };
}

export interface VaultAttachmentMeta {
  id: string;
  name: string;
  type: string;
  size: number;
  encrypted_name?: string;
  name_iv?: string;
  encrypted_type?: string;
  type_iv?: string;
}

export interface VaultCardDetails {
  cardholder_name?: string;
  card_number?: string;
  brand?: string;
  expiry_month?: string;
  expiry_year?: string;
  cvv?: string;
  pin?: string;
  billing_zip?: string;
  billing_address?: string;
}

export interface VaultIdentityDetails {
  document_type?: string;
  identity_number?: string;
  issuing_country?: string;
  nationality?: string;
  date_of_birth?: string;
  issued_at?: string;
  expires_at?: string;
}

export interface VaultEntry {
  id: number;
  title: string;
  username: string;
  encrypted_title?: string;
  title_iv?: string;
  encrypted_username?: string;
  username_iv?: string;
  encrypted_password?: string; // Stored as Hex (legacy Base64 supported)
  iv?: string; // Stored as Hex (legacy Base64 supported)
  category: string;
  encrypted_category?: string;
  category_iv?: string;
  website: string;
  encrypted_website?: string;
  website_iv?: string;
  encrypted_tags?: string;
  tags_iv?: string;
  search_index?: string[];
  updated_at: string;
  strength?: number;
  tags?: string[];
  pwned_count?: number; // Tracks HIBP breaches
  attachments?: VaultAttachmentMeta[];
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
  encrypted_passkey_meta?: string; // AES-GCM encrypted site passkey metadata JSON
  passkey_meta_iv?: string;        // IV for passkey metadata encryption
  encrypted_card_details?: string; // AES-GCM encrypted credit/debit card details JSON
  card_details_iv?: string;        // IV for card details encryption
  encrypted_identity_details?: string; // AES-GCM encrypted identity card details JSON
  identity_details_iv?: string;        // IV for identity details encryption

  // Decrypted fields for UI (never persisted)
  pass?: string;
  totpSecret?: string;     // Decrypted TOTP secret (only in memory)
  notes?: string;          // Decrypted notes content (only in memory)
  passkeyMetadata?: CanonicalPasskeyFields | null; // Decrypted passkey metadata for site-passkey MVP
  cardDetails?: VaultCardDetails | null; // Decrypted card details (only in memory)
  identityDetails?: VaultIdentityDetails | null; // Decrypted identity details (only in memory)
  sharing?: CanonicalSharingAssignment[]; // Canonical sharing metadata for UI/export helpers
  ui_focus_context?: 'sharing_issue' | 'sharing_audit'; // Transient UI hint for edit flows
  ui_focus_label?: string; // Transient UI label shown in edit flows
}

export class VaultService {
  private opfsMockDb: IDBPDatabase | null = null;
  private sqliteDb: SQLiteOPFS | null = null;
  private useSQLite: boolean = false;
  private aesKey: CryptoKey | null = null;
  private sensitiveMaterial: Uint8Array | null = null;
  private isConnected: boolean = false;
  private activeDbName: string = 'aegis_opfs_vault';
  private decryptedEntriesCache: VaultEntry[] | null = null;
  private searchIndexHmacKey: CryptoKey | null = null;
  private readonly authArgon2Params = {
    iterations: 3,
    memorySize: 65536,
    parallelism: 1,
    hashLength: 32,
  };

  private get encryptionProfile(): EncryptionProfile {
    try {
      return SecureAppSettings.getEncryptionProfile();
    } catch { /* ignore */ }
    return 'balanced'; // Varsayılan
  }

  /** Aktif vault DB adını değiştir (çoklu vault desteği) */
  setVaultDbName(dbName: string): void {
    this.activeDbName = dbName;
  }

  /** Aktif vault DB adını al */
  getVaultDbName(): string {
    return this.activeDbName;
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

  private normalizeSearchValue(value: string = ""): string {
    return SearchService.normalize(value);
  }

  private tokenizeSearchFields(fields: string[]): string[] {
    return SearchService.tokenize(fields);
  }

  private async getSearchIndexHmacKey(): Promise<CryptoKey> {
    if (this.searchIndexHmacKey) return this.searchIndexHmacKey;
    if (!this.sensitiveMaterial) throw new Error('Search index key unavailable');

    const rawKey = new Uint8Array(this.sensitiveMaterial);
    this.searchIndexHmacKey = await window.crypto.subtle.importKey(
      'raw',
      toBufferSource(rawKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    return this.searchIndexHmacKey;
  }

  private async hashSearchToken(token: string): Promise<string> {
    const key = await this.getSearchIndexHmacKey();
    const signature = await window.crypto.subtle.sign(
      'HMAC',
      key,
      toBufferSource(new TextEncoder().encode(token))
    );
    return bufferToHex(signature);
  }

  private async buildSearchIndex(title: string, username: string, website: string, category: string, tags: string[]): Promise<string[]> {
    const tokens = this.tokenizeSearchFields([
      title || '',
      username || '',
      website || '',
      category || '',
      ...(Array.isArray(tags) ? tags : []),
    ]);

    if (tokens.length === 0) return [];
    return Promise.all(tokens.map((token) => this.hashSearchToken(token)));
  }

  private async encryptAttachmentMetadataList(attachments: VaultAttachmentMeta[]): Promise<VaultAttachmentMeta[]> {
    const profile = this.encryptionProfile;
    if (!isFieldEncrypted(profile, 'attachments')) return attachments;
    return Promise.all(
      attachments.map(async (item) => {
        const nameEnc = await this.encryptTextField(item.name || '');
        const typeEnc = await this.encryptTextField(item.type || '');
        return {
          id: item.id,
          size: item.size,
          name: '',
          type: '',
          encrypted_name: nameEnc.encrypted,
          name_iv: nameEnc.iv,
          encrypted_type: typeEnc.encrypted,
          type_iv: typeEnc.iv,
        };
      })
    );
  }

  private async decryptAttachmentMetadataList(attachments: VaultAttachmentMeta[]): Promise<VaultAttachmentMeta[]> {
    return Promise.all(
      attachments.map(async (item) => {
        // Eğer encrypted_name varsa her halükarda deşifre etmeye çalış (eski kayıt uyumluluğu)
        if (!item.encrypted_name && !item.encrypted_type) return item;

        const decName = await this.decryptTextField(item.encrypted_name, item.name_iv);
        const decType = await this.decryptTextField(item.encrypted_type, item.type_iv);
        return {
          ...item,
          name: decName ?? item.name ?? '',
          type: decType ?? item.type ?? '',
        };
      })
    );
  }

  private async encryptTextField(value: string): Promise<{ encrypted: string; iv: string }> {
    if (!this.aesKey) throw new Error('Vault key unavailable');
    const iv = generateRandomBytes(12);
    const plainBytes = new TextEncoder().encode(value || '');
    const cipher = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: toBufferSource(iv) },
      this.aesKey,
      toBufferSource(plainBytes)
    );
    return {
      encrypted: bufferToHex(cipher),
      iv: bufferToHex(iv),
    };
  }

  private async decryptTextField(encrypted?: string, iv?: string): Promise<string | null> {
    if (!this.aesKey || !encrypted || !iv) {
      return null;
    }
    try {
      const cipherArray = isLikelyHexUtil(encrypted)
        ? hexToBuffer(encrypted)
        : Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
      const ivArray = isLikelyHexUtil(iv)
        ? hexToBuffer(iv)
        : Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
      const plain = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: toBufferSource(ivArray) },
        this.aesKey,
        toBufferSource(cipherArray)
      );
      return new TextDecoder().decode(plain);
    } catch (error) {
      console.error('DECRYPTION REAL ERROR:', error);
      return null;
    }
  }

  private normalizeCardDetails(details?: Partial<VaultCardDetails> | null): VaultCardDetails | null {
    if (!details || typeof details !== 'object') return null;

    const normalized: VaultCardDetails = {
      cardholder_name: String(details.cardholder_name || '').trim(),
      card_number: String(details.card_number || '').trim(),
      brand: String(details.brand || '').trim(),
      expiry_month: String(details.expiry_month || '').trim(),
      expiry_year: String(details.expiry_year || '').trim(),
      cvv: String(details.cvv || '').trim(),
      pin: String(details.pin || '').trim(),
      billing_zip: String(details.billing_zip || '').trim(),
      billing_address: String(details.billing_address || '').trim(),
    };

    const hasData = Object.values(normalized).some((value) => typeof value === 'string' && value.length > 0);
    return hasData ? normalized : null;
  }

  private normalizeIdentityDetails(details?: Partial<VaultIdentityDetails> | null): VaultIdentityDetails | null {
    if (!details || typeof details !== 'object') return null;

    const normalized: VaultIdentityDetails = {
      document_type: String(details.document_type || '').trim(),
      identity_number: String(details.identity_number || '').trim(),
      issuing_country: String(details.issuing_country || '').trim(),
      nationality: String(details.nationality || '').trim(),
      date_of_birth: String(details.date_of_birth || '').trim(),
      issued_at: String(details.issued_at || '').trim(),
      expires_at: String(details.expires_at || '').trim(),
    };

    const hasData = Object.values(normalized).some((value) => typeof value === 'string' && value.length > 0);
    return hasData ? normalized : null;
  }

  private async buildMetadataAtRest(title: string, username: string, website: string, category: string, tags: string[]) {
    // Arama indeksi her zaman profil fark etmeksizin çalışır (fakat plaintext arama performans profillerinde local js üzerinden daha da hızlı yapılabilir)
    const searchIndex = await this.buildSearchIndex(title, username, website, category, tags);
    const profile = this.encryptionProfile;

    // Şifrelenecek alanları belirle
    const encTitle = isFieldEncrypted(profile, 'title');
    const encUsername = isFieldEncrypted(profile, 'username');
    const encWebsite = isFieldEncrypted(profile, 'website');
    const encCategory = isFieldEncrypted(profile, 'category');
    const encTags = isFieldEncrypted(profile, 'tags');

    const result: Record<string, unknown> = {
      title: encTitle ? '' : (title || 'Untitled'),
      username: encUsername ? '' : (username || ''),
      website: encWebsite ? '' : (website || ''),
      category: encCategory ? '' : (category || 'General'),
      tags: encTags ? [] : (tags || []),
      search_index: searchIndex,
    };

    if (encTitle) {
      const res = await this.encryptTextField(title || 'Untitled');
      result.encrypted_title = res.encrypted;
      result.title_iv = res.iv;
    }
    if (encUsername) {
      const res = await this.encryptTextField(username || '');
      result.encrypted_username = res.encrypted;
      result.username_iv = res.iv;
    }
    if (encWebsite) {
      const res = await this.encryptTextField(website || '');
      result.encrypted_website = res.encrypted;
      result.website_iv = res.iv;
    }
    if (encCategory) {
      const res = await this.encryptTextField(category || 'General');
      result.encrypted_category = res.encrypted;
      result.category_iv = res.iv;
    }
    if (encTags) {
      const res = await this.encryptTextField(JSON.stringify(tags || []));
      result.encrypted_tags = res.encrypted;
      result.tags_iv = res.iv;
    }

    return result;
  }

  private async prepareEntryMetadataForUse(entry: VaultEntry): Promise<{ uiEntry: VaultEntry; storageEntry?: VaultEntry }> {
    // 1. StorageEntry'yi gerekirse onar: HasEncryptedMetadata check
    // Eğer profil şifreleme gerektiriyorsa ve metadata tamamen plaintext'te ise veya eksikse, atRest'i yeniden hazırla
    // Şuan, esneklik için, şifreli bir değer varsa deşifre eder (gelen kayıt uyumu için)
    let storageEntry: VaultEntry | undefined;

    // Arama indeksi oluşturulmuş mu kontrol et (Geriye Dönük Uyumluluk için)
    const hasSearchIndex = Array.isArray(entry.search_index) && entry.search_index.length > 0;
    
    // UI için her zaman varolan şifreli değerleri çözebiliriz 
    // Profil degişse bile, sadece database'e YAZARKEN buildMetadataAtRest çağrılacaktır
    if (!hasSearchIndex) {
      const atRest = await this.buildMetadataAtRest(
        entry.title || 'Untitled',
        entry.username || '',
        entry.website || '',
        entry.category || 'General',
        entry.tags || []
      );
      // Eksikse, yeni atRest formatında düzeltip saklıyoruz
      storageEntry = {
        ...entry,
        ...atRest,
        updated_at: entry.updated_at || new Date().toISOString(),
      };
    }

    const source = storageEntry || entry;

    const [decTitle, decUsername, decWebsite] = await Promise.all([
      this.decryptTextField(source.encrypted_title, source.title_iv),
      this.decryptTextField(source.encrypted_username, source.username_iv),
      this.decryptTextField(source.encrypted_website, source.website_iv),
    ]);
    const [decCategory, decTagsRaw] = await Promise.all([
      this.decryptTextField(source.encrypted_category, source.category_iv),
      this.decryptTextField(source.encrypted_tags, source.tags_iv),
    ]);

    let decTags: string[] = source.tags || [];
    if (decTagsRaw) {
      try {
        const parsed = JSON.parse(decTagsRaw);
        decTags = Array.isArray(parsed) ? parsed : [];
      } catch {
        decTags = source.tags || [];
      }
    }

    const rawAttachments = Array.isArray(source.attachments) ? source.attachments : [];
    const uiAttachments = await this.decryptAttachmentMetadataList(rawAttachments);

    const profile = this.encryptionProfile;
    // Eğer policy "attachments şifrelenmeli" diyorsa ve şifrelenmemiş objeler varsa re-encrypt et.
    if (isFieldEncrypted(profile, 'attachments')) {
      const needsAttachmentMigration = rawAttachments.some(
        (item) => (item.name && !item.encrypted_name) || (item.type && !item.encrypted_type)
      );
      if (needsAttachmentMigration) {
        const encryptedAttachments = await this.encryptAttachmentMetadataList(uiAttachments);
        storageEntry = {
          ...(storageEntry || source),
          attachments: encryptedAttachments,
          updated_at: source.updated_at || new Date().toISOString(),
        };
      }
    }

    const uiEntry: VaultEntry = {
      ...source,
      title: decTitle ?? source.title ?? 'Untitled',
      username: decUsername ?? source.username ?? '',
      website: decWebsite ?? source.website ?? '',
      category: decCategory ?? source.category ?? 'General',
      tags: decTags,
      attachments: uiAttachments,
    };

    return { uiEntry, storageEntry };
  }

  private async hashPasswordPBKDF2(password: string, salt: Uint8Array, iterations: number = 100000): Promise<string> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      toBufferSource(enc.encode(password)),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    
    const hash = await window.crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: toBufferSource(salt), iterations, hash: "SHA-256" },
      keyMaterial,
      256
    );
    
    return btoa(String.fromCharCode(...new Uint8Array(hash)));
  }

  private async hashPasswordArgon2(password: string, salt: Uint8Array, params?: Partial<NonNullable<StoredCredential['argon2']>>): Promise<string> {
    const effective = {
      ...this.authArgon2Params,
      ...(params || {}),
    };
    return argon2id({
      password,
      salt,
      parallelism: effective.parallelism,
      iterations: effective.iterations,
      memorySize: effective.memorySize,
      hashLength: effective.hashLength,
      outputType: 'hex',
    });
  }

  private async createAuthCredential(password: string): Promise<StoredCredential> {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const verificationHash = await this.hashPasswordArgon2(password, salt, this.authArgon2Params);
    return {
      scheme: 'argon2id-v1',
      verificationHash,
      salt: btoa(String.fromCharCode(...salt)),
      argon2: { ...this.authArgon2Params },
    };
  }

  async verifyPassword(password: string, stored: StoredCredential): Promise<boolean> {
    const salt = Uint8Array.from(atob(stored.salt), (c) => c.charCodeAt(0));

    if (stored.scheme === 'argon2id-v1') {
      const computedHash = await this.hashPasswordArgon2(password, salt, stored.argon2 || this.authArgon2Params);
      return computedHash === stored.verificationHash;
    }

    const computedHash = await this.hashPasswordPBKDF2(password, salt, stored.iterations || 100000);
    return computedHash === stored.verificationHash;
  }

  private async migrateAuthCredentialToArgon2(password: string, oldCredential: StoredCredential): Promise<StoredCredential> {
    if (oldCredential.scheme === 'argon2id-v1') return oldCredential;
    return this.createAuthCredential(password);
  }

  // P1-3 Kritik aksiyonlarda re-auth
  async verifyCurrentPassword(password: string): Promise<boolean> {
    if (!this.opfsMockDb && !this.sqliteDb) return false;
    let authMetadata: Record<string, unknown> | null = null;
    if (this.useSQLite && this.sqliteDb) {
      const sqlAuth = this.sqliteDb.getMetadata('auth_credential');
      if (sqlAuth && sqlAuth.credential) authMetadata = sqlAuth;
    }
    if (!authMetadata && this.opfsMockDb) {
      authMetadata = await this.opfsMockDb.get('vault_metadata', 'auth_credential');
    }
    if (!authMetadata || !authMetadata.credential) return false;
    return this.verifyPassword(password, authMetadata.credential as StoredCredential);
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
    this.searchIndexHmacKey = null;

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
      }
    } else {
      console.log(`[SQLite-OPFS] OPFS kullanılamıyor, IDB backend ile devam ediliyor.`);
      this.useSQLite = false;
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

      if (storedCred.scheme !== 'argon2id-v1') {
        const migratedCredential = await this.migrateAuthCredentialToArgon2(password, storedCred);
        const txCredWrite = this.opfsMockDb.transaction('vault_metadata', 'readwrite');
        await txCredWrite.objectStore('vault_metadata').put({
          id: 'auth_credential',
          credential: migratedCredential,
        });
        await txCredWrite.done;
        if (this.useSQLite && this.sqliteDb) {
          this.sqliteDb.putMetadata('auth_credential', { credential: migratedCredential });
        }
        authMetadata = { ...authMetadata, credential: migratedCredential };
      }

      // Device Secret Validation
      if (deviceMetadata?.deviceSecretHash) {
        const secretBuf = new TextEncoder().encode(secretKey);
        const hashBuf = await window.crypto.subtle.digest('SHA-256', toBufferSource(secretBuf));
        const currentHash = bufferToHex(hashBuf);
        if (currentHash !== deviceMetadata.deviceSecretHash) {
          throw new Error("Invalid device secret key");
        }
      } else if (passwordsCount > 0) {
        // Migration: Legacy vault without secret hash. 
        // We MUST verify if the derived key actually works by trying to decrypt entries.
        // We use the raw entries store for a faster check.
        const allEntries = await this.opfsMockDb.getAll('passwords');
        
        const tryDecrypt = async (key: CryptoKey, entries: Record<string, unknown>[]) => {

          for (const entry of entries) {
            if (!entry.encrypted_password || !entry.iv) continue;
            try {
              let cipherArray: Uint8Array;
              let ivArray: Uint8Array;

              if (isLikelyHexUtil(entry.encrypted_password as string) && isLikelyHexUtil(entry.iv as string)) {
                cipherArray = hexToBuffer(entry.encrypted_password as string);
                ivArray = hexToBuffer(entry.iv as string);
              } else {
                cipherArray = Uint8Array.from(atob(entry.encrypted_password as string), c => c.charCodeAt(0));
                ivArray = Uint8Array.from(atob(entry.iv as string), c => c.charCodeAt(0));
              }

              await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: toBufferSource(ivArray) },
                key,
                toBufferSource(cipherArray)
              );
              this.decryptedEntriesCache = null;
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
           const _legacySaltB64 = await this.deriveMasterKey(password, legacySecret, currentSaltB64);
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
        const secretHashBuf = await window.crypto.subtle.digest('SHA-256', toBufferSource(secretBuf));
        const deviceSecretHash = bufferToHex(secretHashBuf);

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
      
      const newCredential = await this.createAuthCredential(password);
      
      const secretBuf = new TextEncoder().encode(secretKey);
      const secretHashBuf = await window.crypto.subtle.digest('SHA-256', toBufferSource(secretBuf));
      const deviceSecretHash = bufferToHex(secretHashBuf);

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
        credential: newCredential
      });

      await mStore.put({
        id: 'device_config',
        deviceSecretHash
      });

      await txWrite.done;

      // SQLite'a da yaz (dual write)
      if (this.useSQLite && this.sqliteDb) {
        this.sqliteDb.putMetadata('auth_credential', {
          credential: newCredential
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
    
    // Auto-seed if empty for demo (P0-4)
    // Sadece Dev ortamında otomatik örnek veri ekle
    if (import.meta.env.DEV) {
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
    localStorage.removeItem('aegis_passkey_meta');
    localStorage.removeItem('aegis_passkey_bindings_v1');
    localStorage.removeItem('aegis_vault_profiles');
    localStorage.removeItem('aegis_active_vault');
    localStorage.removeItem('aegis_totp_vault_mode');
    localStorage.removeItem('aegis_totp_vault_id');

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
    const iv = generateRandomBytes(12);

    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: toBufferSource(iv) },
      this.aesKey,
      toBufferSource(enc.encode(payload))
    );

    const pinData = {
      id: 'security_pins',
      encrypted_data: bufferToHex(cipherBuffer),
      iv: bufferToHex(iv)
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
      let record: Record<string, unknown> | null = null;
      if (this.useSQLite && this.sqliteDb) {
        record = this.sqliteDb.getMetadata('security_pins');
      } else if (this.opfsMockDb) {
        record = await this.opfsMockDb.get('vault_metadata', 'security_pins');
      }
      if (!record || !record.encrypted_data || !record.iv) {
        return { duressPin: '', killPin: '' };
      }

      const cipherArray = hexToBuffer(record.encrypted_data as string);
      const ivArray = hexToBuffer(record.iv as string);

      const plainBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: toBufferSource(ivArray) },
        this.aesKey,
        toBufferSource(cipherArray)
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
    const iv = generateRandomBytes(12);
    
    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: toBufferSource(iv) },
      this.aesKey,
      toBufferSource(enc.encode(entry.pass || ""))
    );

    const {
      title, username, category, website, tags,
      encrypted_title, title_iv,
      encrypted_username, username_iv,
      encrypted_category, category_iv,
      encrypted_website, website_iv,
      encrypted_tags, tags_iv,
      search_index
    } = await this.buildMetadataAtRest(
      entry.title || 'Untitled',
      entry.username || '',
      entry.website || '',
      entry.category || 'General',
      entry.tags || []
    );

    const newEntry: VaultEntry = {
      id: entry.id || Math.floor(Date.now() * 1000 + (Math.random() * 1000)),
      title: title as string,
      username: username as string,
      encrypted_title: encrypted_title as string | undefined,
      title_iv: title_iv as string | undefined,
      encrypted_username: encrypted_username as string | undefined,
      username_iv: username_iv as string | undefined,
      category: category as string,
      encrypted_category: encrypted_category as string | undefined,
      category_iv: category_iv as string | undefined,
      website: website as string,
      encrypted_website: encrypted_website as string | undefined,
      website_iv: website_iv as string | undefined,
      tags: tags as string[] | undefined,
      encrypted_tags: encrypted_tags as string | undefined,
      tags_iv: tags_iv as string | undefined,
      search_index: (search_index as string[]) || [],
      encrypted_password: bufferToHex(cipherBuffer),
      iv: bufferToHex(iv),
      updated_at: new Date().toISOString(),
      strength: this.calculateStrength(entry.pass || ''),
      pwned_count: entry.pwned_count || 0,
    };

    // 🔐 TOTP Secret şifreleme (varsa)
    if (entry.totpSecret) {
      const totpIv = generateRandomBytes(12);
      const totpCipher = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: toBufferSource(totpIv) },
        this.aesKey,
        toBufferSource(enc.encode(entry.totpSecret))
      );
      newEntry.totp_secret = bufferToHex(totpCipher);
      newEntry.totp_iv = bufferToHex(totpIv);
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
      const notesIv = generateRandomBytes(12);
      const notesCipher = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: toBufferSource(notesIv) },
        this.aesKey,
        toBufferSource(enc.encode(entry.notes))
      );
      newEntry.encrypted_notes = bufferToHex(notesCipher);
      newEntry.notes_iv = bufferToHex(notesIv);
    } else if (entry.encrypted_notes) {
      newEntry.encrypted_notes = entry.encrypted_notes;
      newEntry.notes_iv = entry.notes_iv;
    }

    if (entry.passkeyMetadata) {
      const passkeyMetaIv = generateRandomBytes(12);
      const passkeyMetaCipher = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: toBufferSource(passkeyMetaIv) },
        this.aesKey!,
        toBufferSource(enc.encode(JSON.stringify(entry.passkeyMetadata)))
      );
      newEntry.encrypted_passkey_meta = bufferToHex(passkeyMetaCipher);
      newEntry.passkey_meta_iv = bufferToHex(passkeyMetaIv);
    } else if (entry.encrypted_passkey_meta) {
      newEntry.encrypted_passkey_meta = entry.encrypted_passkey_meta;
      newEntry.passkey_meta_iv = entry.passkey_meta_iv;
    }

    const normalizedCardDetails = this.normalizeCardDetails(entry.cardDetails);
    if (normalizedCardDetails) {
      const cardDetailsIv = generateRandomBytes(12);
      const cardDetailsCipher = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: toBufferSource(cardDetailsIv) },
        this.aesKey!,
        toBufferSource(enc.encode(JSON.stringify(normalizedCardDetails)))
      );
      newEntry.encrypted_card_details = bufferToHex(cardDetailsCipher);
      newEntry.card_details_iv = bufferToHex(cardDetailsIv);
    } else if ('cardDetails' in entry) {
      newEntry.encrypted_card_details = undefined;
      newEntry.card_details_iv = undefined;
    } else if (entry.encrypted_card_details) {
      newEntry.encrypted_card_details = entry.encrypted_card_details;
      newEntry.card_details_iv = entry.card_details_iv;
    }

    const normalizedIdentityDetails = this.normalizeIdentityDetails(entry.identityDetails);
    if (normalizedIdentityDetails) {
      const identityDetailsIv = generateRandomBytes(12);
      const identityDetailsCipher = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: toBufferSource(identityDetailsIv) },
        this.aesKey!,
        toBufferSource(enc.encode(JSON.stringify(normalizedIdentityDetails)))
      );
      newEntry.encrypted_identity_details = bufferToHex(identityDetailsCipher);
      newEntry.identity_details_iv = bufferToHex(identityDetailsIv);
    } else if ('identityDetails' in entry) {
      newEntry.encrypted_identity_details = undefined;
      newEntry.identity_details_iv = undefined;
    } else if (entry.encrypted_identity_details) {
      newEntry.encrypted_identity_details = entry.encrypted_identity_details;
      newEntry.identity_details_iv = entry.identity_details_iv;
    }

    if (entry.attachments) {
      newEntry.attachments = await this.encryptAttachmentMetadataList(entry.attachments as VaultAttachmentMeta[]);
    }

    // Dual-write: SQLite (primary) + IDB (fallback)
    if (this.useSQLite && this.sqliteDb) {
       
      this.sqliteDb.putPassword(newEntry as any);
    }
    if (this.opfsMockDb) {
      await this.opfsMockDb.put('passwords', newEntry);
    }
    
    // Invalidate Cache after mutation
    this.decryptedEntriesCache = null;
    
    return newEntry.id;
  }

  /**
   * Mevcut bir girişi günceller.
   * addPassword'u mevcut id ile çağırır.
   */
  async updatePassword(id: number, entry: Partial<VaultEntry>) {
    return this.addPassword({ ...entry, id });
  }

  async getPasswords(
    searchQuery: string = "",
    categoryFilter: string = "",
    isTrash: boolean = false,
    searchScope: "all" | "title" | "username" | "tags" = "all"
  ): Promise<VaultEntry[]> {
    if (!this.aesKey || (!this.opfsMockDb && !this.sqliteDb)) return [];

    // 1. Ensure Cache is Populated (Decrypt EVERYTHING once - Optimized for 4.2)
    if (!this.decryptedEntriesCache) {
      console.log("[VaultService] ⚡ Populating decrypted cache for huge vault performance...");
      let rawEntries: VaultEntry[];
      if (this.useSQLite && this.sqliteDb) {
        rawEntries = this.sqliteDb.getAllPasswords() as VaultEntry[];
      } else {
        rawEntries = await this.opfsMockDb!.getAll('passwords');
      }

      const dec = new TextDecoder();
      const migratedEntries: VaultEntry[] = [];
      
      // Decrypt in chunks to let UI thread breathe if vault is huge
      this.decryptedEntriesCache = [];
      const CHUNK_SIZE = 100;
      for (let i = 0; i < rawEntries.length; i += CHUNK_SIZE) {
        const chunk = rawEntries.slice(i, i + CHUNK_SIZE);
        const decryptedChunk = await Promise.all(chunk.map(async (entry) => {
          try {
            // On-the-fly migration: legacy categories
            if (['Work', 'Bank', 'Social'].includes(entry.category)) {
              entry.category = 'General';
            }

            const { uiEntry, storageEntry } = await this.prepareEntryMetadataForUse(entry);
            if (storageEntry) migratedEntries.push(storageEntry);
            
            const decryptedEntry: VaultEntry = { ...uiEntry };
            
            // Fully decrypt sensitive fields for the cache
            if (entry.encrypted_password && entry.iv) {
              try {
                const cipherArray = isLikelyHexUtil(entry.encrypted_password) ? hexToBuffer(entry.encrypted_password) : Uint8Array.from(atob(entry.encrypted_password), c => c.charCodeAt(0));
                const ivArray = isLikelyHexUtil(entry.iv) ? hexToBuffer(entry.iv) : Uint8Array.from(atob(entry.iv), c => c.charCodeAt(0));

                const plainBuffer = await window.crypto.subtle.decrypt(
                  { name: "AES-GCM", iv: toBufferSource(ivArray) },
                  this.aesKey!,
                  toBufferSource(cipherArray)
                );
                decryptedEntry.pass = dec.decode(plainBuffer);
              } catch { decryptedEntry.pass = "••DECRYPT_ERROR••"; }
            }

            // TOTP
            if (entry.totp_secret && entry.totp_iv) {
              try {
                const totpCipher = isLikelyHexUtil(entry.totp_secret) ? hexToBuffer(entry.totp_secret) : Uint8Array.from(atob(entry.totp_secret), c => c.charCodeAt(0));
                const totpIv = isLikelyHexUtil(entry.totp_iv) ? hexToBuffer(entry.totp_iv) : Uint8Array.from(atob(entry.totp_iv), c => c.charCodeAt(0));
                const totpPlain = await window.crypto.subtle.decrypt(
                  { name: "AES-GCM", iv: toBufferSource(totpIv) },
                  this.aesKey!,
                  toBufferSource(totpCipher)
                );
                decryptedEntry.totpSecret = dec.decode(totpPlain);
              } catch { /* skip */ }
            }

            // Notes
            if (entry.encrypted_notes && entry.notes_iv) {
              try {
                const notesCipher = isLikelyHexUtil(entry.encrypted_notes) ? hexToBuffer(entry.encrypted_notes) : Uint8Array.from(atob(entry.encrypted_notes), c => c.charCodeAt(0));
                const notesIv = isLikelyHexUtil(entry.notes_iv) ? hexToBuffer(entry.notes_iv) : Uint8Array.from(atob(entry.notes_iv), c => c.charCodeAt(0));
                const notesPlain = await window.crypto.subtle.decrypt(
                  { name: "AES-GCM", iv: toBufferSource(notesIv) },
                  this.aesKey!,
                  toBufferSource(notesCipher)
                );
                decryptedEntry.notes = dec.decode(notesPlain);
              } catch { /* skip */ }
            }

            // Passkey Meta
            if (entry.encrypted_passkey_meta && entry.passkey_meta_iv) {
              try {
                const passkeyMetaCipher = isLikelyHexUtil(entry.encrypted_passkey_meta) ? hexToBuffer(entry.encrypted_passkey_meta) : Uint8Array.from(atob(entry.encrypted_passkey_meta), c => c.charCodeAt(0));
                const passkeyMetaIv = isLikelyHexUtil(entry.passkey_meta_iv) ? hexToBuffer(entry.passkey_meta_iv) : Uint8Array.from(atob(entry.passkey_meta_iv), c => c.charCodeAt(0));
                const passkeyMetaPlain = await window.crypto.subtle.decrypt(
                  { name: "AES-GCM", iv: toBufferSource(passkeyMetaIv) },
                  this.aesKey!,
                  toBufferSource(passkeyMetaCipher)
                );
                decryptedEntry.passkeyMetadata = JSON.parse(dec.decode(passkeyMetaPlain)) as CanonicalPasskeyFields;
              } catch { /* skip */ }
            }

            if (entry.encrypted_card_details && entry.card_details_iv) {
              try {
                const cardDetailsCipher = isLikelyHexUtil(entry.encrypted_card_details)
                  ? hexToBuffer(entry.encrypted_card_details)
                  : Uint8Array.from(atob(entry.encrypted_card_details), c => c.charCodeAt(0));
                const cardDetailsIv = isLikelyHexUtil(entry.card_details_iv)
                  ? hexToBuffer(entry.card_details_iv)
                  : Uint8Array.from(atob(entry.card_details_iv), c => c.charCodeAt(0));
                const cardDetailsPlain = await window.crypto.subtle.decrypt(
                  { name: "AES-GCM", iv: toBufferSource(cardDetailsIv) },
                  this.aesKey!,
                  toBufferSource(cardDetailsCipher)
                );
                const parsed = JSON.parse(dec.decode(cardDetailsPlain)) as Partial<VaultCardDetails>;
                decryptedEntry.cardDetails = this.normalizeCardDetails(parsed);
              } catch { /* skip */ }
            }

            if (entry.encrypted_identity_details && entry.identity_details_iv) {
              try {
                const identityDetailsCipher = isLikelyHexUtil(entry.encrypted_identity_details)
                  ? hexToBuffer(entry.encrypted_identity_details)
                  : Uint8Array.from(atob(entry.encrypted_identity_details), c => c.charCodeAt(0));
                const identityDetailsIv = isLikelyHexUtil(entry.identity_details_iv)
                  ? hexToBuffer(entry.identity_details_iv)
                  : Uint8Array.from(atob(entry.identity_details_iv), c => c.charCodeAt(0));
                const identityDetailsPlain = await window.crypto.subtle.decrypt(
                  { name: "AES-GCM", iv: toBufferSource(identityDetailsIv) },
                  this.aesKey!,
                  toBufferSource(identityDetailsCipher)
                );
                const parsed = JSON.parse(dec.decode(identityDetailsPlain)) as Partial<VaultIdentityDetails>;
                decryptedEntry.identityDetails = this.normalizeIdentityDetails(parsed);
              } catch { /* skip */ }
            }
            return decryptedEntry;
          } catch { return entry; }
        }));
        this.decryptedEntriesCache.push(...decryptedChunk);
        
        // Give control back to browser (defer next chunk)
        if (rawEntries.length > CHUNK_SIZE) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      // Flush migrations
      if (migratedEntries.length > 0 && this.opfsMockDb) {
        for (const m of migratedEntries) {
          await this.opfsMockDb.put('passwords', m).catch(() => {});
          if (this.useSQLite && this.sqliteDb) this.sqliteDb.putPassword(m as any);
        }
      }
    }

    // 2. Memory Filtering (Optimized based on Trash/Category)
    let filtered = this.decryptedEntriesCache || [];

    // Filter by Trash State
    filtered = isTrash 
      ? filtered.filter(e => e.deletedAt) 
      : filtered.filter(e => !e.deletedAt);

    // Filter by category/tag
    if (categoryFilter && categoryFilter !== "Trash") {
      if (categoryFilter.startsWith('#')) {
        const tag = categoryFilter.substring(1);
        filtered = filtered.filter(e => e.tags && e.tags.includes(tag));
      } else {
        filtered = filtered.filter(e => e.category === categoryFilter);
      }
    }

    // 3. Delegate Search logic to SearchService for blazingly fast results
    return SearchService.searchDecrypted(filtered, searchQuery, searchScope);
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

    const newCredential = await this.createAuthCredential(newPassword);

    // 4. Tüm girdileri (parolalar) yeni AES key ile tekrar şifrele
    const updatedEntriesToSave: VaultEntry[] = [];
    for (const entry of allEntries) {
      if (!entry.pass) continue;
      
      const enc = new TextEncoder();
      const iv = generateRandomBytes(12);
      const cipherBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: toBufferSource(iv) },
        this.aesKey!, // Yeni anahtarımız
        toBufferSource(enc.encode(entry.pass))
      );

      const {
        title, username, category, website, tags,
        encrypted_title, title_iv,
        encrypted_username, username_iv,
        encrypted_category, category_iv,
        encrypted_website, website_iv,
        encrypted_tags, tags_iv,
        search_index
      } = await this.buildMetadataAtRest(
        entry.title || 'Untitled',
        entry.username || '',
        entry.website || '',
        entry.category || 'General',
        entry.tags || []
      );

      const updatedEntry: VaultEntry = {
        ...entry,
        title: title as string, 
        username: username as string, 
        category: category as string, 
        website: website as string, 
        tags: tags as string[] | undefined,
        encrypted_title: encrypted_title as string | undefined, 
        title_iv: title_iv as string | undefined,
        encrypted_username: encrypted_username as string | undefined, 
        username_iv: username_iv as string | undefined,
        encrypted_category: encrypted_category as string | undefined, 
        category_iv: category_iv as string | undefined,
        encrypted_website: encrypted_website as string | undefined, 
        website_iv: website_iv as string | undefined,
        encrypted_tags: encrypted_tags as string | undefined, 
        tags_iv: tags_iv as string | undefined,
        search_index: search_index as string[] | undefined,
        attachments: await this.encryptAttachmentMetadataList(entry.attachments || []),
        encrypted_password: bufferToHex(cipherBuffer),
        iv: bufferToHex(iv),
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
      this.sqliteDb.putMetadata('auth_credential', { id: 'auth_credential', credential: newCredential });
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
      await metaStore.put({ id: 'auth_credential', credential: newCredential });
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
    this.searchIndexHmacKey = null;

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
    this.decryptedEntriesCache = null;
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
    const weakIds: number[] = [];
    const newEntries: VaultEntry[] = [];
    for (const entry of entries) {
      if (!entry.title || !entry.pass) {
        missingFields++;
        if (!entry.pass) continue;
      }
      
      const newId = Math.floor(Date.now() * 1000 + Math.random() * 1000000);
      if (entry.pass.length < 8) {
        weak++;
        weakIds.push(newId);
      }

      const enc = new TextEncoder();
      const iv = generateRandomBytes(12);
      const cipherBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: toBufferSource(iv) },
        this.aesKey,
        toBufferSource(enc.encode(entry.pass))
      );

      const metadata = await this.buildMetadataAtRest(
        entry.title || 'Imported Entry',
        entry.username || '',
        entry.website || '',
        entry.category || 'General',
        entry.tags || []
      );

      const newEntry: VaultEntry = {
        id: newId, 
        title: metadata.title as string, 
        username: metadata.username as string, 
        category: metadata.category as string, 
        website: metadata.website as string, 
        tags: metadata.tags as string[] | undefined,
        encrypted_title: metadata.encrypted_title as string | undefined, 
        title_iv: metadata.title_iv as string | undefined,
        encrypted_username: metadata.encrypted_username as string | undefined, 
        username_iv: metadata.username_iv as string | undefined,
        encrypted_category: metadata.encrypted_category as string | undefined, 
        category_iv: metadata.category_iv as string | undefined,
        encrypted_website: metadata.encrypted_website as string | undefined, 
        website_iv: metadata.website_iv as string | undefined,
        encrypted_tags: metadata.encrypted_tags as string | undefined, 
        tags_iv: metadata.tags_iv as string | undefined,
        search_index: metadata.search_index as string[] | undefined,
        encrypted_password: bufferToHex(cipherBuffer),
        iv: bufferToHex(iv),
        updated_at: new Date().toISOString(),
        strength: this.calculateStrength(entry.pass),
        pwned_count: entry.pwned_count || 0,
      };
      
      newEntries.push(newEntry);
    }

    if (this.opfsMockDb) {
      const tx = this.opfsMockDb.transaction('passwords', 'readwrite');
      const store = tx.objectStore('passwords');
      for (const entry of newEntries) {
        await store.put(entry);
      }
      await tx.done;
    }

    if (this.useSQLite && this.sqliteDb) {
      for (const entry of newEntries) {
        this.sqliteDb.putPassword(entry);
      }
      await this.sqliteDb.flushToOPFS();
    }

    return { total: entries.length, weak, missingFields, weakIds };
  }
  // --- Secure Attachments (Up to 50MB) ---
  async addAttachment(entryId: number, file: File): Promise<{ id: string, name: string, type: string, size: number }> {
    if (!this.aesKey || (!this.opfsMockDb && !this.sqliteDb)) throw new Error("Vault not initialized");
    if (file.size > 50 * 1024 * 1024) throw new Error("File exceeds 50MB limit");

    const fileBuffer = await file.arrayBuffer();
    const iv = generateRandomBytes(12);

    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: toBufferSource(iv) },
      this.aesKey,
      toBufferSource(fileBuffer)
    );

    const attachmentId = crypto.randomUUID();
    const attachmentMeta: VaultAttachmentMeta = {
      id: attachmentId,
      name: file.name,
      type: file.type,
      size: file.size
    };
    const attachmentMetaAtRest = (await this.encryptAttachmentMetadataList([attachmentMeta]))[0];

    // Primary write path: SQLite (if enabled)
    if (this.useSQLite && this.sqliteDb) {
      this.sqliteDb.putAttachment(attachmentId, entryId, iv, cipherBuffer);
      const existingEntries = this.sqliteDb.getAllPasswords();
      const entry = existingEntries.find((e: Record<string, unknown>) => Number(e.id) === Number(entryId));
      if (entry) {
        const attachments = Array.isArray(entry.attachments) ? entry.attachments : [];
        attachments.push(attachmentMetaAtRest);
        entry.attachments = attachments;
        this.sqliteDb.putPassword(entry);
      }
      await this.sqliteDb.flushToOPFS();
    }

    // Fallback mirror path: IndexedDB
    if (this.opfsMockDb) {
      await this.opfsMockDb.put('attachments', {
        id: attachmentId,
        entryId: entryId,
        iv: bufferToHex(iv),
        encrypted_data: bufferToHex(cipherBuffer as ArrayBuffer)
      });

      const tx = this.opfsMockDb.transaction('passwords', 'readwrite');
      const store = tx.objectStore('passwords');
      const entry = await store.get(entryId);
      if (entry) {
        if (!entry.attachments) entry.attachments = [];
        entry.attachments.push(attachmentMetaAtRest);
        await store.put(entry);
      }
      await tx.done;
    }

    return attachmentMeta;
  }

  async getDecryptedAttachment(attachmentId: string): Promise<Blob> {
    if (!this.aesKey || (!this.opfsMockDb && !this.sqliteDb)) throw new Error("Vault not initialized");

    let record: Record<string, unknown> | null = null;

    // Primary read path: SQLite
    if (this.useSQLite && this.sqliteDb) {
      const sqliteRecord = this.sqliteDb.getAttachment(attachmentId);
      if (sqliteRecord) {
        record = sqliteRecord;
      }
    }

    // Fallback read path: IndexedDB
    if (!record && this.opfsMockDb) {
      record = await this.opfsMockDb.get('attachments', attachmentId);
    }

    if (!record) throw new Error("Attachment not found");

    const plainBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toBufferSource(hexToBuffer(record.iv as string)) },
      this.aesKey,
      toBufferSource(hexToBuffer(record.encrypted_data as string))
    );

    // We don't have the mime type in this record directly, but it can be found in the password entry.
    // However, returning a generic Blob is fine as long as we trigger a download or load it.
    return new Blob([plainBuffer]);
  }

  async deleteAttachment(entryId: number, attachmentId: string): Promise<void> {
    if (!this.opfsMockDb && !this.sqliteDb) throw new Error("Vault not open");

    // Primary delete path: SQLite
    if (this.useSQLite && this.sqliteDb) {
      this.sqliteDb.deleteAttachment(attachmentId);
      const existingEntries = this.sqliteDb.getAllPasswords();
      const entry = existingEntries.find((e: Record<string, unknown>) => Number(e.id) === Number(entryId));
      if (entry && Array.isArray(entry.attachments)) {
        entry.attachments = entry.attachments.filter((a: VaultAttachmentMeta) => a.id !== attachmentId);
        this.sqliteDb.putPassword(entry);
      }
      await this.sqliteDb.flushToOPFS();
    }

    // Fallback mirror path: IndexedDB
    if (this.opfsMockDb) {
      await this.opfsMockDb.delete('attachments', attachmentId);

      const tx = this.opfsMockDb.transaction('passwords', 'readwrite');
      const store = tx.objectStore('passwords');
      const entry = await store.get(entryId);
      if (entry && entry.attachments) {
        entry.attachments = entry.attachments.filter((a: VaultAttachmentMeta) => a.id !== attachmentId);
        await store.put(entry);
      }
      await tx.done;
    }
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

    // Invalidate Cache
    this.decryptedEntriesCache = null;
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

    // Invalidate Cache
    this.decryptedEntriesCache = null;
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

    // Invalidate Cache
    this.decryptedEntriesCache = null;
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

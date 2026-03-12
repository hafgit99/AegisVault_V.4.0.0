// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { vaultService } from './vaultService';
import 'fake-indexeddb/auto';

// Mock sql.js and opfs availability to force IDB fallback immediately
vi.mock('sql.js', () => ({
  default: vi.fn().mockRejectedValue(new Error('sql.js not available in test'))
}));
vi.mock('./lib/SQLiteOPFS', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    isOPFSAvailable: () => false,
  };
});

// Mock TextEncoder / TextDecoder if missing
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

describe('VaultService Security & Cryptography', () => {
  const TEST_PASSWORD = 'strong_password_123';
  const SEC_KEY = 'device_secret_xyz';
  let dbNameCounter = 0;

  const deriveLegacyPBKDF2Hash = async (password: string, saltB64: string, iterations: number) => {
    const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const hash = await window.crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations, hash: 'SHA-256' },
      keyMaterial,
      256
    );
    return btoa(String.fromCharCode(...new Uint8Array(hash)));
  };

  beforeEach(() => {
    // Tweak to ensure a fresh IndexedDB instance each run
    dbNameCounter++;
  });

  it('1. Yeni Kasa Oluşturma: Benzersiz Dinamik Salt Üretilmelidir', async () => {
    const dbName = `test_vault_${dbNameCounter}`;
    
    // DB'yi ilk defa init ediyoruz
    await vaultService.initDb(TEST_PASSWORD, SEC_KEY, dbName, true);

    // IndexedDB'den metadata'yı kontrol et
    const request = indexedDB.open(dbName, 3);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const tx = db.transaction('vault_metadata', 'readonly');
    const store = tx.objectStore('vault_metadata');
    
    const mainSaltData = await new Promise<any>((resolve) => {
      const getReq = store.get('main_salt');
      getReq.onsuccess = () => resolve(getReq.result);
    });
    
    const authCredData = await new Promise<any>((resolve) => {
      const getReq = store.get('auth_credential');
      getReq.onsuccess = () => resolve(getReq.result);
    });

    expect(mainSaltData).toBeDefined();
    expect(mainSaltData.salt).toBeTypeOf('string');
    // Base64 regex check for 16-byte random values (~22-24 chars base64)
    expect(mainSaltData.salt.length).toBeGreaterThan(10);
    expect(mainSaltData.version).toBe(2);

    expect(authCredData).toBeDefined();
    expect(authCredData.credential.verificationHash).toBeDefined();
    expect(authCredData.credential.scheme).toBe('argon2id-v1');
    
    await vaultService.lock();
    db.close();
  }, 30000);

  it('2. Mevcut Kasa Açma: Eski Salt ve Şifre Modelleri ile Uyumluluk (Legacy Fallback)', async () => {
    const dbName = `legacy_vault_${dbNameCounter}`;
    
    // Yapay olarak eski sistemdeki gibi "sadece passwords store'u var, metadata yok" yaratıyoruz
    const request = indexedDB.open(dbName, 1);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore('passwords', { keyPath: 'id', autoIncrement: true });
        store.put({ id: 999, title: "Test Legacy", pass: "something_encrypted" }); // Simulate old data
      };
      request.onsuccess = () => resolve(request.result);
    });
    db.close();

    // Init the vault - this triggers the migration block under the hood
    // and tests if backward compatibility logic works (falls back to fixed salt logic dynamically wrapped)
    await vaultService.initDb(TEST_PASSWORD, SEC_KEY, dbName, true);

    // Kasa başarıyla bağlanmalı
    expect(vaultService['isConnected']).toBe(true);

    // Kontrol: Metadata 2. versiyona taşınmış ve main_salt olarak eski statik kilit dinamik kayda geçmiş mi?
    const checkReq = indexedDB.open(dbName, 3);
    const checkDb = await new Promise<IDBDatabase>((resolve) => {
      checkReq.onsuccess = () => resolve(checkReq.result);
    });
    
    const checkTx = checkDb.transaction('vault_metadata', 'readonly');
    const mainSaltData = await new Promise<any>((resolve) => {
      const getReq = checkTx.objectStore('vault_metadata').get('main_salt');
      getReq.onsuccess = () => resolve(getReq.result);
    });

    // It should have migrated the old string "aegis-premium-salt-v4" into a base64 encoded string format
    const oldSaltBytes = new TextEncoder().encode("aegis-premium-salt-v4");
    const oldSaltB64 = btoa(String.fromCharCode(...oldSaltBytes));
    
    expect(mainSaltData.salt).toBe(oldSaltB64);
    
    await vaultService.lock();
    checkDb.close();
  }, 30000);

  it('3. Parola Değiştirme: Yeni Salt, Anahtar Üretimi ve De-şifreleme (Re-encryption)', async () => {
    const dbName = `change_pw_vault_${dbNameCounter}`;
    
    // 1. Kasayı oluştur ve bir giriş at
    await vaultService.initDb(TEST_PASSWORD, SEC_KEY, dbName, true);
    await vaultService.addPassword({ title: 'Github', pass: 'token_123', category: 'Work' });

    // Önceki Metadata Salt'ını al
    const request1 = indexedDB.open(dbName, 3);
    const db1 = await new Promise<IDBDatabase>((resolve) => { request1.onsuccess = () => resolve(request1.result); });
    const oldMainSaltData = await new Promise<any>((resolve) => {
      const getReq = db1.transaction('vault_metadata', 'readonly').objectStore('vault_metadata').get('main_salt');
      getReq.onsuccess = () => resolve(getReq.result);
    });
    const oldAuthData = await new Promise<any>((resolve) => {
      const getReq = db1.transaction('vault_metadata', 'readonly').objectStore('vault_metadata').get('auth_credential');
      getReq.onsuccess = () => resolve(getReq.result);
    });
    db1.close();

    // 2. Parolayı değiştir
    const NEW_PASSWORD = 'super_secure_new_password_!!!';
    await vaultService.changeMasterPassword(TEST_PASSWORD, NEW_PASSWORD, SEC_KEY);

    // 3. Yeni Metadata'yı kontrol et
    const request2 = indexedDB.open(dbName, 3);
    const db2 = await new Promise<IDBDatabase>((resolve) => { request2.onsuccess = () => resolve(request2.result); });
    
    const newMainSaltData = await new Promise<any>((resolve) => {
      const getReq = db2.transaction('vault_metadata', 'readonly').objectStore('vault_metadata').get('main_salt');
      getReq.onsuccess = () => resolve(getReq.result);
    });
    const newAuthData = await new Promise<any>((resolve) => {
      const getReq = db2.transaction('vault_metadata', 'readonly').objectStore('vault_metadata').get('auth_credential');
      getReq.onsuccess = () => resolve(getReq.result);
    });
    db2.close();

    // Kıyas: Yeni Tuz eskisi ile EŞİT OLMAMALIDIR!
    expect(newMainSaltData.salt).not.toBe(oldMainSaltData.salt);
    expect(newAuthData.credential.salt).not.toBe(oldAuthData.credential.salt);
    expect(newAuthData.credential.verificationHash).not.toBe(oldAuthData.credential.verificationHash);
    expect(newAuthData.credential.scheme).toBe('argon2id-v1');
    
    // 4. Yeni parola ile şifreleri hala deşifre edebiliyor mu kontrol et
    const passwords = await vaultService.getPasswords();
    
    // Auto-seed from demo might add 2 items + 1 item we added = 3 items total
    expect(passwords.length).toBeGreaterThanOrEqual(1);
    
    const githubEntry = passwords.find(p => p.title === 'Github');
    expect(githubEntry).toBeDefined();
    expect(githubEntry?.pass).toBe('token_123'); // Şifre başarılı çözüldü
    // Encrypted string hex kontrolü
    expect(githubEntry?.encrypted_password).toMatch(/^[0-9a-fA-F]+$/);
    
    await vaultService.lock();
  }, 30000);

  it('4. Metadata Encryption + Attachment Metadata: At-rest plaintext sizintisi olmamali', async () => {
    const dbName = `metadata_enc_vault_${dbNameCounter}`;
    await vaultService.initDb(TEST_PASSWORD, SEC_KEY, dbName, true);

    const entryId = await vaultService.addPassword({
      title: 'MetaEnc Entry',
      username: 'fin.user@example.com',
      website: 'https://finance.example.com',
      category: 'Finance',
      tags: ['bank', 'critical'],
      pass: 'UltraStrong#123',
    });

    const attachmentFile = new File(['hello'], 'secret-statement.pdf', { type: 'application/pdf' });
    await vaultService.addAttachment(Number(entryId), attachmentFile);

    const req = indexedDB.open(dbName, 3);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const stored = await new Promise<any>((resolve) => {
      const getReq = db.transaction('passwords', 'readonly').objectStore('passwords').get(entryId);
      getReq.onsuccess = () => resolve(getReq.result);
    });

    expect(stored).toBeDefined();
    expect(stored.encrypted_title).toBeTypeOf('string');
    expect(stored.encrypted_username).toBeTypeOf('string');
    expect(stored.encrypted_website).toBeTypeOf('string');
    expect(stored.encrypted_category).toBeTypeOf('string');
    expect(stored.encrypted_tags).toBeTypeOf('string');
    expect(Array.isArray(stored.search_index)).toBe(true);
    expect(stored.search_index.length).toBeGreaterThan(0);

    const firstAttachment = Array.isArray(stored.attachments) ? stored.attachments[0] : null;
    expect(firstAttachment).toBeDefined();
    expect(firstAttachment.encrypted_name).toBeTypeOf('string');
    expect(firstAttachment.encrypted_type).toBeTypeOf('string');

    const uiEntries = await vaultService.getPasswords('metaenc');
    const uiEntry = uiEntries.find((p) => p.id === entryId);
    expect(uiEntry).toBeDefined();
    expect(uiEntry?.title).toBe('MetaEnc Entry');
    expect(uiEntry?.category).toBe('Finance');
    expect(uiEntry?.tags).toContain('bank');
    expect(uiEntry?.attachments?.[0]?.name).toBe('secret-statement.pdf');
    expect(uiEntry?.attachments?.[0]?.type).toBe('application/pdf');

    await vaultService.lock();
    db.close();
  }, 30000);

  it('5. Private Search Index: legacy plaintext metadata kayitlari lazy migrate edilmeli', async () => {
    const dbName = `metadata_migration_vault_${dbNameCounter}`;
    await vaultService.initDb(TEST_PASSWORD, SEC_KEY, dbName, true);

    const entryId = await vaultService.addPassword({
      title: 'Legacy Migrating Entry',
      username: 'legacy.user',
      website: 'https://legacy.example.com',
      category: 'Finance',
      tags: ['legacytag'],
      pass: 'LegacyPass#2026',
    });

    const req1 = indexedDB.open(dbName, 3);
    const db1 = await new Promise<IDBDatabase>((resolve, reject) => {
      req1.onsuccess = () => resolve(req1.result);
      req1.onerror = () => reject(req1.error);
    });

    const tx1 = db1.transaction('passwords', 'readwrite');
    const store1 = tx1.objectStore('passwords');
    const existing = await new Promise<any>((resolve) => {
      const getReq = store1.get(entryId);
      getReq.onsuccess = () => resolve(getReq.result);
    });

    existing.title = 'Legacy Migrating Entry';
    existing.username = 'legacy.user';
    existing.website = 'https://legacy.example.com';
    existing.category = 'Finance';
    existing.tags = ['legacytag'];
    existing.search_index = [];
    delete existing.encrypted_title;
    delete existing.title_iv;
    delete existing.encrypted_username;
    delete existing.username_iv;
    delete existing.encrypted_website;
    delete existing.website_iv;
    delete existing.encrypted_category;
    delete existing.category_iv;
    delete existing.encrypted_tags;
    delete existing.tags_iv;

    await new Promise<void>((resolve, reject) => {
      const putReq = store1.put(existing);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    });
    await new Promise<void>((resolve, reject) => {
      tx1.oncomplete = () => resolve();
      tx1.onerror = () => reject(tx1.error);
    });
    db1.close();

    const results = await vaultService.getPasswords('legacy migrating');
    const migratedUiEntry = results.find((p) => p.id === entryId);
    expect(migratedUiEntry).toBeDefined();
    expect(migratedUiEntry?.title).toBe('Legacy Migrating Entry');
    expect(migratedUiEntry?.category).toBe('Finance');

    const req2 = indexedDB.open(dbName, 3);
    const db2 = await new Promise<IDBDatabase>((resolve, reject) => {
      req2.onsuccess = () => resolve(req2.result);
      req2.onerror = () => reject(req2.error);
    });

    const migratedRaw = await new Promise<any>((resolve) => {
      const getReq = db2.transaction('passwords', 'readonly').objectStore('passwords').get(entryId);
      getReq.onsuccess = () => resolve(getReq.result);
    });

    expect(migratedRaw.encrypted_title).toBeTypeOf('string');
    expect(migratedRaw.encrypted_category).toBeTypeOf('string');
    expect(migratedRaw.encrypted_tags).toBeTypeOf('string');
    expect(Array.isArray(migratedRaw.search_index)).toBe(true);
    expect(migratedRaw.search_index.length).toBeGreaterThan(0);

    await vaultService.lock();
    db2.close();
  }, 30000);

  it('6. Auth Credential Migration: legacy PBKDF2 dogrulamasi Argon2id modeline otomatik tasinmali', async () => {
    const dbName = `auth_migration_vault_${dbNameCounter}`;
    await vaultService.initDb(TEST_PASSWORD, SEC_KEY, dbName, true);
    await vaultService.lock();

    const req1 = indexedDB.open(dbName, 3);
    const db1 = await new Promise<IDBDatabase>((resolve, reject) => {
      req1.onsuccess = () => resolve(req1.result);
      req1.onerror = () => reject(req1.error);
    });

    const legacySalt = btoa(String.fromCharCode(...window.crypto.getRandomValues(new Uint8Array(16))));
    const legacyIterations = 100000;
    const legacyHash = await deriveLegacyPBKDF2Hash(TEST_PASSWORD, legacySalt, legacyIterations);

    const tx1 = db1.transaction('vault_metadata', 'readwrite');
    const store1 = tx1.objectStore('vault_metadata');

    await new Promise<void>((resolve, reject) => {
      const putReq = store1.put({
        id: 'auth_credential',
        credential: {
          verificationHash: legacyHash,
          iterations: legacyIterations,
          salt: legacySalt,
        },
      });
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    });
    await new Promise<void>((resolve, reject) => {
      tx1.oncomplete = () => resolve();
      tx1.onerror = () => reject(tx1.error);
    });
    db1.close();

    await vaultService.initDb(TEST_PASSWORD, SEC_KEY, dbName, false);

    const req2 = indexedDB.open(dbName, 3);
    const db2 = await new Promise<IDBDatabase>((resolve, reject) => {
      req2.onsuccess = () => resolve(req2.result);
      req2.onerror = () => reject(req2.error);
    });
    const migratedAuth = await new Promise<any>((resolve) => {
      const getReq = db2.transaction('vault_metadata', 'readonly').objectStore('vault_metadata').get('auth_credential');
      getReq.onsuccess = () => resolve(getReq.result);
    });

    expect(migratedAuth.credential.scheme).toBe('argon2id-v1');
    expect(migratedAuth.credential.argon2).toBeDefined();
    expect(migratedAuth.credential.verificationHash).not.toBe(legacyHash);

    await vaultService.lock();
    db2.close();
  }, 30000);
});

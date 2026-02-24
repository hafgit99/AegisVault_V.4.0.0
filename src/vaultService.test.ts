// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { vaultService } from './vaultService';
import 'fake-indexeddb/auto';

// Mock TextEncoder / TextDecoder if missing
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

describe('VaultService Security & Cryptography', () => {
  const TEST_PASSWORD = 'strong_password_123';
  const SEC_KEY = 'device_secret_xyz';
  let dbNameCounter = 0;

  beforeEach(() => {
    // Tweak to ensure a fresh IndexedDB instance each run
    dbNameCounter++;
  });

  it('1. Yeni Kasa Oluşturma: Benzersiz Dinamik Salt Üretilmelidir', async () => {
    const dbName = `test_vault_${dbNameCounter}`;
    
    // DB'yi ilk defa init ediyoruz
    await vaultService.initDb(TEST_PASSWORD, SEC_KEY, dbName);

    // IndexedDB'den metadata'yı kontrol et
    const request = indexedDB.open(dbName, 2);
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
    
    await vaultService.lock();
    db.close();
  });

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
    await vaultService.initDb(TEST_PASSWORD, SEC_KEY, dbName);

    // Kasa başarıyla bağlanmalı
    expect(vaultService['isConnected']).toBe(true);

    // Kontrol: Metadata 2. versiyona taşınmış ve main_salt olarak eski statik kilit dinamik kayda geçmiş mi?
    const checkReq = indexedDB.open(dbName, 2);
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
  });

  it('3. Parola Değiştirme: Yeni Salt, Anahtar Üretimi ve De-şifreleme (Re-encryption)', async () => {
    const dbName = `change_pw_vault_${dbNameCounter}`;
    
    // 1. Kasayı oluştur ve bir giriş at
    await vaultService.initDb(TEST_PASSWORD, SEC_KEY, dbName);
    await vaultService.addPassword({ title: 'Github', pass: 'token_123', category: 'Work' });

    // Önceki Metadata Salt'ını al
    const request1 = indexedDB.open(dbName, 2);
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
    const request2 = indexedDB.open(dbName, 2);
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
  });
});

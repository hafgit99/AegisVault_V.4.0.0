import { openDB, type IDBPDatabase } from 'idb';
import { SQLiteOPFS, isOPFSAvailable } from '../SQLiteOPFS';
import { VaultAuthService } from './VaultAuthService';
import { hexToBuffer, isLikelyHex as isLikelyHexUtil, toBufferSource } from '../crypto-types';
import type { StoredCredential, VaultEntry } from '../../vaultService';

export class VaultBootstrapService {
  private static async checkOpfsPersistence(dbName: string): Promise<void> {
    console.log(`[SQLCipher WASM] OPFS Volume Check for ${dbName}...`);
    const dbs = await window.indexedDB.databases();
    const exists = dbs.some((db) => db.name === dbName);
    if (exists) {
      console.log(`[SQLCipher WASM] ${dbName} veritabani basariyla tekrar yuklendi.`);
    } else {
      console.log(`[SQLCipher WASM] Yeni ${dbName} veritabani olusturuluyor...`);
    }
  }

  static async initDb(args: {
    password: string;
    secretKey: string;
    dbName: string;
    isSetupAction: boolean;
    deriveMasterKey: (
      password: string,
      secretKey: string,
      saltB64?: string,
      version?: number
    ) => Promise<{ saltB64: string; aesKey: CryptoKey; sensitiveMaterial: Uint8Array }>;
    verifyPassword: (password: string, stored: StoredCredential) => Promise<boolean>;
    migrateAuthCredentialToArgon2: (
      password: string,
      oldCredential: StoredCredential
    ) => Promise<StoredCredential>;
    createAuthCredential: (password: string) => Promise<StoredCredential>;
    getAesKey: () => CryptoKey | null;
    setAesKey: (key: CryptoKey) => void;
    setDecryptedEntriesCache: (entries: VaultEntry[] | null) => void;
  }): Promise<{
    opfsMockDb: IDBPDatabase;
    sqliteDb: SQLiteOPFS | null;
    useSQLite: boolean;
    aesKey: CryptoKey | null;
    sensitiveMaterial: Uint8Array | null;
  }> {
    const {
      password,
      secretKey,
      dbName,
      isSetupAction,
      deriveMasterKey,
      verifyPassword,
      migrateAuthCredentialToArgon2,
      createAuthCredential,
      getAesKey,
      setAesKey,
      setDecryptedEntriesCache,
    } = args;

    await this.checkOpfsPersistence(dbName);

    const opfsMockDb = await openDB(dbName, 3, {
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

    let sqliteDb: SQLiteOPFS | null = null;
    let useSQLite = false;

    if (isOPFSAvailable()) {
      try {
        sqliteDb = new SQLiteOPFS(dbName);
        await sqliteDb.open();
        useSQLite = true;
        console.log(`[SQLite-OPFS] SQLite backend aktif: ${dbName}`);
      } catch (err) {
        console.warn(`[SQLite-OPFS] SQLite baslatilamadi, IDB fallback kullaniliyor:`, err);
        sqliteDb = null;
      }
    } else {
      console.log(`[SQLite-OPFS] OPFS kullanilamiyor, IDB backend ile devam ediliyor.`);
      useSQLite = false;
    }

    const txRead = opfsMockDb.transaction(['vault_metadata', 'passwords'], 'readonly');
    const metadataStoreRead = txRead.objectStore('vault_metadata');
    let metadata = await metadataStoreRead.get('main_salt');
    await txRead.done;

    if (useSQLite && sqliteDb && !metadata) {
      const sqlMetadata = sqliteDb.getMetadata('main_salt');
      if (sqlMetadata) metadata = sqlMetadata;
    }

    let currentSaltB64 = metadata?.salt;
    let usesLegacyFallbackSalt = false;

    if (!currentSaltB64) {
      const txCheck = opfsMockDb.transaction('passwords', 'readonly');
      const passwordsCount = await txCheck.objectStore('passwords').count();
      await txCheck.done;

      if (passwordsCount > 0) {
        const oldSaltBytes = new TextEncoder().encode('aegis-premium-salt-v4');
        currentSaltB64 = btoa(String.fromCharCode(...oldSaltBytes));
        usesLegacyFallbackSalt = true;
      }
    }

    const vaultVersion = metadata?.version || (usesLegacyFallbackSalt ? 2 : 3);
    const deriveResult = await deriveMasterKey(password, secretKey, currentSaltB64, vaultVersion);
    const newSaltB64 = deriveResult.saltB64;
    let activeKey = deriveResult.aesKey;
    let activeSensitiveMaterial = deriveResult.sensitiveMaterial;

    if (activeKey) setAesKey(activeKey);

    const txAuthRead = opfsMockDb.transaction(['vault_metadata', 'passwords'], 'readonly');
    let authMetadata = await txAuthRead.objectStore('vault_metadata').get('auth_credential');
    let deviceMetadata = await txAuthRead.objectStore('vault_metadata').get('device_config');
    const passwordsCount = await txAuthRead.objectStore('passwords').count();
    await txAuthRead.done;

    if (!isSetupAction && useSQLite && sqliteDb) {
      const sqlAuth = sqliteDb.getMetadata('auth_credential');
      const sqlDevice = sqliteDb.getMetadata('device_config');
      if (sqlAuth && sqlAuth.credential) authMetadata = sqlAuth;
      if (sqlDevice && sqlDevice.deviceSecretHash) deviceMetadata = sqlDevice;
    }

    if (isSetupAction && useSQLite && sqliteDb) {
      try {
        sqliteDb.deleteMetadata('auth_credential');
        sqliteDb.deleteMetadata('device_config');
        sqliteDb.deleteMetadata('main_salt');
        sqliteDb.deleteMetadata('security_pins');
      } catch {
        /* ilk kurulumda bos olabilir */
      }
    }

    if (authMetadata && authMetadata.credential) {
      if (isSetupAction) {
        throw new Error('VAULT_ALREADY_EXISTS');
      }

      const storedCred = authMetadata.credential as StoredCredential;
      const passwordValid = await verifyPassword(password, storedCred);
      if (!passwordValid) throw new Error('Invalid credentials');

      if (storedCred.scheme !== 'argon2id-v1') {
        const migratedCredential = await migrateAuthCredentialToArgon2(password, storedCred);
        const txCredWrite = opfsMockDb.transaction('vault_metadata', 'readwrite');
        await txCredWrite.objectStore('vault_metadata').put({
          id: 'auth_credential',
          credential: migratedCredential,
        });
        await txCredWrite.done;
        if (useSQLite && sqliteDb) {
          sqliteDb.putMetadata('auth_credential', { credential: migratedCredential });
        }
      }

      if (deviceMetadata?.deviceSecretHash) {
        let currentHash: string;
        if (deviceMetadata.isArgon2) {
          const deviceSalt = Uint8Array.from(atob(deviceMetadata.salt), (c) => c.charCodeAt(0));
          currentHash = await VaultAuthService.hashPasswordArgon2(secretKey, deviceSalt, {
            iterations: 2,
            memorySize: 32768,
            parallelism: 1,
            hashLength: 32,
          });
        } else {
          currentHash = await VaultAuthService.sha256Hex(secretKey);
        }

        if (!VaultAuthService.timingSafeEqual(currentHash, deviceMetadata.deviceSecretHash)) {
          throw new Error('Invalid device secret key');
        }

        if (!deviceMetadata.isArgon2) {
          const deviceSalt = window.crypto.getRandomValues(new Uint8Array(16));
          const newHash = await VaultAuthService.hashPasswordArgon2(secretKey, deviceSalt, {
            iterations: 2,
            memorySize: 32768,
            parallelism: 1,
            hashLength: 32,
          });
          const txWrite = opfsMockDb.transaction('vault_metadata', 'readwrite');
          await txWrite.objectStore('vault_metadata').put({
            id: 'device_config',
            deviceSecretHash: newHash,
            salt: btoa(String.fromCharCode(...deviceSalt)),
            isArgon2: true,
          });
          await txWrite.done;
          if (useSQLite && sqliteDb) {
            sqliteDb.putMetadata('device_config', {
              deviceSecretHash: newHash,
              salt: btoa(String.fromCharCode(...deviceSalt)),
              isArgon2: true,
            });
          }
        }
      } else if (passwordsCount > 0) {
        const allEntries = await opfsMockDb.getAll('passwords');
        const activeKey = getAesKey();
        if (!activeKey) throw new Error('Vault key unavailable');

        const tryDecrypt = async (key: CryptoKey, entries: Record<string, unknown>[]) => {
          for (const entry of entries) {
            if (!entry.encrypted_password || !entry.iv) continue;
            try {
              let cipherArray: Uint8Array;
              let ivArray: Uint8Array;

              if (
                isLikelyHexUtil(entry.encrypted_password as string) &&
                isLikelyHexUtil(entry.iv as string)
              ) {
                cipherArray = hexToBuffer(entry.encrypted_password as string);
                ivArray = hexToBuffer(entry.iv as string);
              } else {
                cipherArray = Uint8Array.from(atob(entry.encrypted_password as string), (c) =>
                  c.charCodeAt(0)
                );
                ivArray = Uint8Array.from(atob(entry.iv as string), (c) => c.charCodeAt(0));
              }

              await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: toBufferSource(ivArray) },
                key,
                toBufferSource(cipherArray)
              );
              setDecryptedEntriesCache(null);
              return true;
            } catch {
              continue;
            }
          }
          return entries.length === 0;
        };

        const verified = await tryDecrypt(activeKey, allEntries);
        if (!verified && allEntries.length > 0) {
          throw new Error('Invalid device secret key for this vault');
        }

        const deviceSalt = window.crypto.getRandomValues(new Uint8Array(16));
        const deviceSecretHash = await VaultAuthService.hashPasswordArgon2(secretKey, deviceSalt, {
          iterations: 2,
          memorySize: 32768,
          parallelism: 1,
          hashLength: 32,
        });
        const txWrite = opfsMockDb.transaction('vault_metadata', 'readwrite');
        await txWrite.objectStore('vault_metadata').put({
          id: 'device_config',
          deviceSecretHash,
          salt: btoa(String.fromCharCode(...deviceSalt)),
          isArgon2: true,
        });
        await txWrite.done;

        if (useSQLite && sqliteDb) {
          sqliteDb.putMetadata('device_config', {
            deviceSecretHash,
            salt: btoa(String.fromCharCode(...deviceSalt)),
            isArgon2: true,
          });
        }
      }

      if (!metadata) {
        const txWrite = opfsMockDb.transaction('vault_metadata', 'readwrite');
        await txWrite.objectStore('vault_metadata').put({
          id: 'main_salt',
          salt: newSaltB64,
          createdAt: new Date().toISOString(),
          version: 3,
        });
        await txWrite.done;
      }
    } else {
      if (!isSetupAction) {
        throw new Error('NO_VAULT_FOUND');
      }

      const newCredential = await createAuthCredential(password);
      const deviceSalt = window.crypto.getRandomValues(new Uint8Array(16));
      const deviceSecretHash = await VaultAuthService.hashPasswordArgon2(secretKey, deviceSalt, {
        iterations: 2,
        memorySize: 32768,
        parallelism: 1,
        hashLength: 32,
      });

      const txWrite = opfsMockDb.transaction('vault_metadata', 'readwrite');
      const mStore = txWrite.objectStore('vault_metadata');

      if (!metadata) {
        await mStore.put({
          id: 'main_salt',
          salt: newSaltB64,
          createdAt: new Date().toISOString(),
          version: 3,
        });
      }

      await mStore.put({ id: 'auth_credential', credential: newCredential });
      await mStore.put({
        id: 'device_config',
        deviceSecretHash,
        salt: btoa(String.fromCharCode(...deviceSalt)),
        isArgon2: true,
      });
      await txWrite.done;

      if (useSQLite && sqliteDb) {
        sqliteDb.putMetadata('auth_credential', { credential: newCredential });
        sqliteDb.putMetadata('device_config', {
          deviceSecretHash,
          salt: btoa(String.fromCharCode(...deviceSalt)),
          isArgon2: true,
        });
        if (!metadata) {
          sqliteDb.putMetadata('main_salt', {
            salt: newSaltB64,
            createdAt: new Date().toISOString(),
            version: 3,
          });
        }
      }
    }

    const canDecryptAnyStoredPassword = async (key: CryptoKey, entries: VaultEntry[]) => {
      const encryptedEntries = entries.filter((entry) => entry.encrypted_password && entry.iv);
      if (encryptedEntries.length === 0) return true;

      for (const entry of encryptedEntries.slice(0, 5)) {
        try {
          const cipherArray = isLikelyHexUtil(entry.encrypted_password!)
            ? hexToBuffer(entry.encrypted_password!)
            : Uint8Array.from(atob(entry.encrypted_password!), (c) => c.charCodeAt(0));
          const ivArray = isLikelyHexUtil(entry.iv!)
            ? hexToBuffer(entry.iv!)
            : Uint8Array.from(atob(entry.iv!), (c) => c.charCodeAt(0));
          await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: toBufferSource(ivArray) },
            key,
            toBufferSource(cipherArray)
          );
          return true;
        } catch {
          /* try next sample */
        }
      }
      return false;
    };

    if (!isSetupAction && metadata?.version === 3 && passwordsCount > 0 && currentSaltB64) {
      const storedEntries =
        useSQLite && sqliteDb && sqliteDb.countPasswords() > 0
          ? (sqliteDb.getAllPasswords() as VaultEntry[])
          : ((await opfsMockDb.getAll('passwords')) as VaultEntry[]);

      const currentKeyWorks = await canDecryptAnyStoredPassword(activeKey, storedEntries);
      if (!currentKeyWorks) {
        const legacyDerive = await deriveMasterKey(password, secretKey, currentSaltB64, 2);
        const legacyKeyWorks = await canDecryptAnyStoredPassword(
          legacyDerive.aesKey,
          storedEntries
        );
        if (legacyKeyWorks) {
          activeKey = legacyDerive.aesKey;
          activeSensitiveMaterial = legacyDerive.sensitiveMaterial;
          setAesKey(activeKey);

          const repairedMetadata = {
            id: 'main_salt',
            salt: currentSaltB64,
            createdAt: metadata.createdAt || new Date().toISOString(),
            version: 2,
          };
          const txRepair = opfsMockDb.transaction('vault_metadata', 'readwrite');
          await txRepair.objectStore('vault_metadata').put(repairedMetadata);
          await txRepair.done;
          if (useSQLite && sqliteDb) {
            sqliteDb.putMetadata('main_salt', repairedMetadata);
          }
          console.warn(
            '[VaultBootstrapService] Legacy v2 vault-key fallback applied and metadata repaired.'
          );
        } else {
          setAesKey(activeKey);
        }
      }
    }

    console.log(`SQLCipher: PRAGMA key uygulandi. [${dbName}] baglantisi hazir.`);

    if (useSQLite && sqliteDb) {
      const sqliteCount = sqliteDb.countPasswords();
      const idbCount = await opfsMockDb.count('passwords');

      if (sqliteCount === 0 && idbCount > 0) {
        console.log(`[SQLite-OPFS] IDB -> SQLite migrasyon basliyor (${idbCount} girdi)...`);

        try {
          const allIdbEntries: VaultEntry[] = await opfsMockDb.getAll('passwords');
          for (const entry of allIdbEntries) {
            sqliteDb.putPassword(entry as unknown as Record<string, unknown>);
          }

          const metadataKeys = ['main_salt', 'auth_credential', 'device_config', 'security_pins'];
          for (const key of metadataKeys) {
            try {
              const data = await opfsMockDb.get('vault_metadata', key);
              if (data) {
                sqliteDb.putMetadata(key, data);
              }
            } catch {
              /* key yoksa gec */
            }
          }

          const allAttachments = await opfsMockDb.getAll('attachments');
          for (const att of allAttachments) {
            sqliteDb.putAttachment(
              att.id,
              att.entryId,
              att.iv instanceof Uint8Array ? att.iv : new Uint8Array(att.iv),
              att.encrypted_data
            );
          }

          await sqliteDb.flushToOPFS();
          console.log(
            `[SQLite-OPFS] Migrasyon tamamlandi: ${allIdbEntries.length} girdi, ${allAttachments.length} ek dosya.`
          );
        } catch (err) {
          console.error(`[SQLite-OPFS] Migrasyon hatasi:`, err);
          useSQLite = false;
          sqliteDb = null;
        }
      }
    }

    return {
      opfsMockDb,
      sqliteDb,
      useSQLite,
      aesKey: activeKey,
      sensitiveMaterial: activeSensitiveMaterial,
    };
  }

  static async wipeAllData(
    opfsMockDb: IDBPDatabase | null,
    sqliteDb: SQLiteOPFS | null
  ): Promise<void> {
    if (sqliteDb) {
      try {
        await sqliteDb.close();
      } catch {
        /* skip */
      }
      try {
        const root = await navigator.storage.getDirectory();
        const activeDbName = opfsMockDb ? opfsMockDb.name : 'aegis_opfs_vault';
        await root.removeEntry(activeDbName + '.sqlite', { recursive: true });
      } catch {
        /* skip */
      }
    }

    if (opfsMockDb) {
      const dbName = opfsMockDb.name;
      opfsMockDb.close();
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase(dbName);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        req.onblocked = () => resolve(); // Ignore blocks in wipe
      });
    }

    localStorage.removeItem('aegis_active_vault');
    localStorage.removeItem('aegis_vault_remember_me');
  }
}

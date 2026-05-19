import type { IDBPDatabase } from 'idb';
import type { SQLiteOPFS } from '../SQLiteOPFS';
import type {
  StoredCredential,
  VaultAttachmentMeta,
  VaultAliasDetails,
  VaultCardDetails,
  VaultEntry,
  VaultIdentityDetails,
} from '../../vaultService';
import { SearchService } from '../SearchService';
import {
  bufferToHex,
  generateRandomBytes,
  hexToBuffer,
  isLikelyHex as isLikelyHexUtil,
  toBufferSource,
} from '../crypto-types';
import { VaultSearchIndexer } from './VaultSearchIndexer';
import { AliasProviderService } from '../AliasProviderService';

const WATCHTOWER_FILTER_PREFIX = '__watchtower:';
const FAVORITES_FILTER = '__favorites';
const isUsableWatchtowerPassword = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  !value.toUpperCase().includes('DECRYPT_ERROR') &&
  value !== 'SANITIZE_OVERWRITE';

const applyWatchtowerFilter = (entries: VaultEntry[], categoryFilter: string): VaultEntry[] => {
  if (!categoryFilter.startsWith(WATCHTOWER_FILTER_PREFIX)) return entries;

  const filter = categoryFilter.slice(WATCHTOWER_FILTER_PREFIX.length);
  const seenPasswords = new Set<string>();
  const reusedPasswords = new Set<string>();

  entries.forEach((entry) => {
    if (!isUsableWatchtowerPassword(entry.pass)) return;
    if (seenPasswords.has(entry.pass)) reusedPasswords.add(entry.pass);
    else seenPasswords.add(entry.pass);
  });

  const oneYearMs = 1000 * 60 * 60 * 24 * 365;

  return entries.filter((entry) => {
    const usablePassword = isUsableWatchtowerPassword(entry.pass) ? entry.pass : '';
    if (filter === 'weak') return usablePassword.length > 0 && usablePassword.length < 8;
    if (filter === 'reused') return Boolean(usablePassword && reusedPasswords.has(usablePassword));
    if (filter === 'old') {
      return Boolean(
        entry.updated_at && Date.now() - new Date(entry.updated_at).getTime() > oneYearMs
      );
    }
    if (filter === 'pwned') return (entry.pwned_count || 0) > 0;

    const aliasRisk = entry.aliasDetails
      ? AliasProviderService.evaluateAliasRisk(entry.aliasDetails)
      : null;
    if (filter === 'alias-risk') return Boolean(aliasRisk && aliasRisk.score < 75);
    if (filter === 'alias-rotation') return Boolean(aliasRisk?.needsRotation);
    return true;
  });
};

export class VaultEntryService {
  static async addPassword(args: {
    entry: Partial<VaultEntry>;
    aesKey: CryptoKey | null;
    opfsMockDb: IDBPDatabase | null;
    sqliteDb: SQLiteOPFS | null;
    useSQLite: boolean;
    generateEntryId: () => number;
    calculateStrength: (password: string) => number;
    buildMetadataAtRest: (
      title: string,
      username: string,
      website: string,
      category: string,
      tags: string[]
    ) => Promise<Record<string, unknown>>;
    normalizeCardDetails: (details?: Partial<VaultCardDetails> | null) => VaultCardDetails | null;
    normalizeIdentityDetails: (
      details?: Partial<VaultIdentityDetails> | null
    ) => VaultIdentityDetails | null;
    normalizeAliasDetails: (
      details?: Partial<VaultAliasDetails> | null
    ) => VaultAliasDetails | null;
    encryptAttachmentMetadataList: (
      attachments: VaultAttachmentMeta[]
    ) => Promise<VaultAttachmentMeta[]>;
  }): Promise<number> {
    const {
      entry,
      aesKey,
      opfsMockDb,
      sqliteDb,
      useSQLite,
      generateEntryId,
      calculateStrength,
      buildMetadataAtRest,
      normalizeCardDetails,
      normalizeIdentityDetails,
      normalizeAliasDetails,
      encryptAttachmentMetadataList,
    } = args;

    if (!aesKey) {
      console.error('[VaultEntryService] CRITICAL: aesKey is missing during addPassword');
      throw new Error('Vault encryption key not initialized (AES Key Null)');
    }
    if (!opfsMockDb && !sqliteDb) {
      console.error('[VaultEntryService] CRITICAL: Storage backend missing during addPassword');
      throw new Error('Vault storage (IDB/SQLite) not initialized');
    }

    let oldEntry: VaultEntry | null = null;
    if (entry.id) {
      if (useSQLite && sqliteDb) {
        oldEntry = sqliteDb.getPassword(entry.id) as VaultEntry;
      } else if (opfsMockDb) {
        oldEntry = await opfsMockDb.get('passwords', entry.id);
      }
    }

    const enc = new TextEncoder();
    const hasUsablePassword =
      typeof entry.pass === 'string' &&
      entry.pass.length > 0 &&
      !entry.pass.toUpperCase().includes('DECRYPT_ERROR');
    const shouldPreserveExistingPassword = Boolean(
      entry.id && !hasUsablePassword && oldEntry?.encrypted_password && oldEntry?.iv
    );
    let encryptedPassword = oldEntry?.encrypted_password || '';
    let passwordIv = oldEntry?.iv || '';

    if (!shouldPreserveExistingPassword) {
      const iv = generateRandomBytes(12);
      const cipherBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: toBufferSource(iv) },
        aesKey,
        toBufferSource(enc.encode(entry.pass || ''))
      );
      encryptedPassword = bufferToHex(cipherBuffer);
      passwordIv = bufferToHex(iv);
    }

    const {
      title,
      username,
      category,
      website,
      tags,
      encrypted_title,
      title_iv,
      encrypted_username,
      username_iv,
      encrypted_category,
      category_iv,
      encrypted_website,
      website_iv,
      encrypted_tags,
      tags_iv,
      search_index,
    } = await buildMetadataAtRest(
      entry.title || 'Untitled',
      entry.username || '',
      entry.website || '',
      entry.category || 'General',
      entry.tags || []
    );

    const newEntry: VaultEntry = {
      id: entry.id || generateEntryId(),
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
      encrypted_password: encryptedPassword,
      iv: passwordIv,
      updated_at: new Date().toISOString(),
      strength: hasUsablePassword
        ? calculateStrength(entry.pass || '')
        : oldEntry?.strength || calculateStrength(entry.pass || ''),
      pwned_count: entry.pwned_count || 0,
      favorite: Boolean(entry.favorite ?? oldEntry?.favorite),
    };

    if (entry.totpSecret) {
      const totpIv = generateRandomBytes(12);
      const totpCipher = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: toBufferSource(totpIv) },
        aesKey,
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

    if (entry.notes && entry.notes.trim()) {
      const notesIv = generateRandomBytes(12);
      const notesCipher = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: toBufferSource(notesIv) },
        aesKey,
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
        { name: 'AES-GCM', iv: toBufferSource(passkeyMetaIv) },
        aesKey,
        toBufferSource(enc.encode(JSON.stringify(entry.passkeyMetadata)))
      );
      newEntry.encrypted_passkey_meta = bufferToHex(passkeyMetaCipher);
      newEntry.passkey_meta_iv = bufferToHex(passkeyMetaIv);
    } else if (entry.encrypted_passkey_meta) {
      newEntry.encrypted_passkey_meta = entry.encrypted_passkey_meta;
      newEntry.passkey_meta_iv = entry.passkey_meta_iv;
    }

    const normalizedCardDetails = normalizeCardDetails(entry.cardDetails);
    if (normalizedCardDetails) {
      const cardDetailsIv = generateRandomBytes(12);
      const cardDetailsCipher = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: toBufferSource(cardDetailsIv) },
        aesKey,
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

    const normalizedIdentityDetails = normalizeIdentityDetails(entry.identityDetails);
    if (normalizedIdentityDetails) {
      const identityDetailsIv = generateRandomBytes(12);
      const identityDetailsCipher = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: toBufferSource(identityDetailsIv) },
        aesKey,
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

    const normalizedAliasDetails = normalizeAliasDetails(entry.aliasDetails);
    if (normalizedAliasDetails) {
      const aliasDetailsIv = generateRandomBytes(12);
      const aliasDetailsCipher = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: toBufferSource(aliasDetailsIv) },
        aesKey,
        toBufferSource(enc.encode(JSON.stringify(normalizedAliasDetails)))
      );
      newEntry.encrypted_alias_details = bufferToHex(aliasDetailsCipher);
      newEntry.alias_details_iv = bufferToHex(aliasDetailsIv);
    } else if ('aliasDetails' in entry) {
      newEntry.encrypted_alias_details = undefined;
      newEntry.alias_details_iv = undefined;
    } else if (entry.encrypted_alias_details) {
      newEntry.encrypted_alias_details = entry.encrypted_alias_details;
      newEntry.alias_details_iv = entry.alias_details_iv;
    }

    if (entry.attachments) {
      newEntry.attachments = await encryptAttachmentMetadataList(
        entry.attachments as VaultAttachmentMeta[]
      );
    }

    // --- Professional Item Versioning & History ---
    if (entry.id) {
      if (oldEntry) {
        let historyList: VaultEntry[] = [];
        if (oldEntry.encrypted_history && oldEntry.history_iv) {
          try {
            const historyIvArray = hexToBuffer(oldEntry.history_iv);
            const historyCipherArray = hexToBuffer(oldEntry.encrypted_history);
            const historyPlainBuffer = await window.crypto.subtle.decrypt(
              { name: 'AES-GCM', iv: toBufferSource(historyIvArray) },
              aesKey,
              toBufferSource(historyCipherArray)
            );
            historyList = JSON.parse(new TextDecoder().decode(historyPlainBuffer));
          } catch (e) {
            console.warn('[VaultEntryService] History decryption failed:', e);
          }
        }

        // Add previous state to history
        const historyItem = { ...oldEntry };
        delete historyItem.encrypted_history;
        delete historyItem.history_iv;
        delete historyItem.history;

        historyList.unshift(historyItem);
        if (historyList.length > 5) historyList = historyList.slice(0, 5); // Retention policy: 5 versions

        // Re-encrypt history
        const hIv = generateRandomBytes(12);
        const hCipher = await window.crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: toBufferSource(hIv) },
          aesKey,
          toBufferSource(new TextEncoder().encode(JSON.stringify(historyList)))
        );
        newEntry.encrypted_history = bufferToHex(hCipher);
        newEntry.history_iv = bufferToHex(hIv);
      }
    }

    if (useSQLite && sqliteDb) {
      sqliteDb.putPassword(newEntry as unknown as Record<string, unknown>);
    }
    if (opfsMockDb) {
      await opfsMockDb.put('passwords', newEntry);
    }

    return newEntry.id;
  }

  static async getPasswords(args: {
    searchQuery: string;
    categoryFilter: string;
    isTrash: boolean;
    searchScope: 'all' | 'title' | 'username' | 'tags';
    aesKey: CryptoKey | null;
    opfsMockDb: IDBPDatabase | null;
    sqliteDb: SQLiteOPFS | null;
    useSQLite: boolean;
    decryptedEntriesCache: VaultEntry[] | null;
    prepareEntryMetadataForUse: (
      entry: VaultEntry
    ) => Promise<{ uiEntry: VaultEntry; storageEntry?: VaultEntry }>;
    hydrateRichSensitiveFields: (entries: VaultEntry[]) => Promise<void>;
  }): Promise<{ entries: VaultEntry[]; cache: VaultEntry[] | null }> {
    const {
      searchQuery,
      categoryFilter,
      isTrash,
      searchScope,
      aesKey,
      opfsMockDb,
      sqliteDb,
      useSQLite,
      prepareEntryMetadataForUse,
      hydrateRichSensitiveFields,
    } = args;

    let { decryptedEntriesCache } = args;

    if (!aesKey || (!opfsMockDb && !sqliteDb)) {
      return { entries: [], cache: decryptedEntriesCache };
    }

    if (!decryptedEntriesCache) {
      console.log('[VaultService] Populating decrypted cache for huge vault performance...');
      let rawEntries: VaultEntry[];
      if (useSQLite && sqliteDb) {
        rawEntries = sqliteDb.getAllPasswords() as VaultEntry[];
      } else {
        rawEntries = await opfsMockDb!.getAll('passwords');
      }

      const dec = new TextDecoder();
      const migratedEntries: VaultEntry[] = [];

      decryptedEntriesCache = [];
      const CHUNK_SIZE = 100;
      for (let i = 0; i < rawEntries.length; i += CHUNK_SIZE) {
        const chunk = rawEntries.slice(i, i + CHUNK_SIZE);
        const decryptedChunk = await Promise.all(
          chunk.map(async (entry) => {
            try {
              if (['Work', 'Bank', 'Social'].includes(entry.category)) {
                entry.category = 'General';
              }

              const { uiEntry, storageEntry } = await prepareEntryMetadataForUse(entry);
              if (storageEntry) migratedEntries.push(storageEntry);

              const decryptedEntry: VaultEntry = { ...uiEntry };
              if (entry.encrypted_password && entry.iv) {
                try {
                  const cipherArray = isLikelyHexUtil(entry.encrypted_password)
                    ? hexToBuffer(entry.encrypted_password)
                    : Uint8Array.from(atob(entry.encrypted_password), (c) => c.charCodeAt(0));
                  const ivArray = isLikelyHexUtil(entry.iv)
                    ? hexToBuffer(entry.iv)
                    : Uint8Array.from(atob(entry.iv), (c) => c.charCodeAt(0));

                  const plainBuffer = await window.crypto.subtle.decrypt(
                    { name: 'AES-GCM', iv: toBufferSource(ivArray) },
                    aesKey,
                    toBufferSource(cipherArray)
                  );
                  decryptedEntry.pass = dec.decode(plainBuffer);
                } catch {
                  decryptedEntry.pass = 'DECRYPT_ERROR';
                }
              }

              return decryptedEntry;
            } catch {
              return entry;
            }
          })
        );

        decryptedEntriesCache.push(...decryptedChunk);
        if (rawEntries.length > CHUNK_SIZE) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      if (migratedEntries.length > 0 && opfsMockDb) {
        for (const m of migratedEntries) {
          await opfsMockDb.put('passwords', m).catch(() => {});
          if (useSQLite && sqliteDb) sqliteDb.putPassword(m as unknown as Record<string, unknown>);
        }
      }
    }

    let filtered = decryptedEntriesCache || [];
    filtered = isTrash ? filtered.filter((e) => e.deletedAt) : filtered.filter((e) => !e.deletedAt);

    filtered = applyWatchtowerFilter(filtered, categoryFilter);

    if (
      categoryFilter &&
      categoryFilter !== 'Trash' &&
      categoryFilter !== FAVORITES_FILTER &&
      !categoryFilter.startsWith(WATCHTOWER_FILTER_PREFIX)
    ) {
      if (categoryFilter.startsWith('#')) {
        const tag = categoryFilter.substring(1);
        filtered = filtered.filter((e) => e.tags && e.tags.includes(tag));
      } else {
        filtered = filtered.filter((e) => e.category === categoryFilter);
      }
    }

    if (categoryFilter === FAVORITES_FILTER) {
      filtered = filtered.filter((e) => Boolean(e.favorite));
    }

    const searched = SearchService.searchDecrypted(filtered, searchQuery, searchScope);
    if (searched.length > 0 && searched.length <= 300) {
      await hydrateRichSensitiveFields(searched);
    }

    return { entries: searched, cache: decryptedEntriesCache };
  }

  static async changeMasterPassword(args: {
    oldPassword: string;
    newPassword: string;
    secretKey: string;
    opfsMockDb: IDBPDatabase | null;
    sqliteDb: SQLiteOPFS | null;
    useSQLite: boolean;
    aesKey: CryptoKey | null;
    verifyPassword: (password: string, stored: StoredCredential) => Promise<boolean>;
    getPasswords: () => Promise<VaultEntry[]>;
    deriveMasterKey: (password: string, secretKey: string, saltB64?: string) => Promise<string>;
    createAuthCredential: (password: string) => Promise<StoredCredential>;
    buildMetadataAtRest: (
      title: string,
      username: string,
      website: string,
      category: string,
      tags: string[]
    ) => Promise<Record<string, unknown>>;
    encryptAttachmentMetadataList: (
      attachments: VaultAttachmentMeta[]
    ) => Promise<VaultAttachmentMeta[]>;
    getAesKey: () => CryptoKey | null;
  }): Promise<void> {
    const {
      oldPassword,
      newPassword,
      secretKey,
      opfsMockDb,
      sqliteDb,
      useSQLite,
      aesKey,
      verifyPassword,
      getPasswords,
      deriveMasterKey,
      createAuthCredential,
      buildMetadataAtRest,
      encryptAttachmentMetadataList,
      getAesKey,
    } = args;

    if (!opfsMockDb || !aesKey) throw new Error('Vault not open');

    const txAuth = opfsMockDb.transaction('vault_metadata', 'readonly');
    const authMetadata = await txAuth.objectStore('vault_metadata').get('auth_credential');
    await txAuth.done;

    if (authMetadata && authMetadata.credential) {
      const storedCred = authMetadata.credential as StoredCredential;
      const isValid = await verifyPassword(oldPassword, storedCred);
      if (!isValid) throw new Error('Invalid current password');
    }

    const allEntries = await getPasswords();

    const newMainSalt = window.crypto.getRandomValues(new Uint8Array(16));
    const newMainSaltB64 = btoa(String.fromCharCode(...newMainSalt));
    const deriveResult = await deriveMasterKey(newPassword, secretKey, newMainSaltB64);
    const actualNewSaltB64 = deriveResult;

    const nextAesKey = getAesKey();
    if (!nextAesKey) throw new Error('Vault key unavailable');

    const newCredential = await createAuthCredential(newPassword);
    const updatedEntriesToSave: VaultEntry[] = [];

    for (const entry of allEntries) {
      if (!entry.pass) continue;

      const enc = new TextEncoder();
      const iv = generateRandomBytes(12);
      const cipherBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: toBufferSource(iv) },
        nextAesKey,
        toBufferSource(enc.encode(entry.pass))
      );

      const {
        title,
        username,
        category,
        website,
        tags,
        encrypted_title,
        title_iv,
        encrypted_username,
        username_iv,
        encrypted_category,
        category_iv,
        encrypted_website,
        website_iv,
        encrypted_tags,
        tags_iv,
        search_index,
      } = await buildMetadataAtRest(
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
        attachments: await encryptAttachmentMetadataList(entry.attachments || []),
        encrypted_password: bufferToHex(cipherBuffer),
        iv: bufferToHex(iv),
        updated_at: new Date().toISOString(),
      };

      delete updatedEntry.pass;
      updatedEntriesToSave.push(updatedEntry);
    }

    if (useSQLite && sqliteDb) {
      sqliteDb.putMetadata('main_salt', {
        id: 'main_salt',
        salt: newMainSaltB64,
        createdAt: new Date().toISOString(),
        version: 3,
      });
      sqliteDb.putMetadata('auth_credential', {
        id: 'auth_credential',
        credential: newCredential,
      });
      for (const item of updatedEntriesToSave) {
        sqliteDb.putPassword(item as unknown as Record<string, unknown>);
      }
      await sqliteDb.flushToOPFS();
    }

    const txData = opfsMockDb.transaction(['vault_metadata', 'passwords'], 'readwrite');
    const metaStore = txData.objectStore('vault_metadata');
    const passStore = txData.objectStore('passwords');
    await metaStore.put({
      id: 'main_salt',
      salt: newMainSaltB64,
      createdAt: new Date().toISOString(),
      version: 3,
    });
    await metaStore.put({ id: 'auth_credential', credential: newCredential });
    for (const item of updatedEntriesToSave) {
      await passStore.put(item);
    }
    await txData.done;
  }

  static async bulkAddPasswords(args: {
    entries: Partial<VaultEntry>[];
    aesKey: CryptoKey | null;
    opfsMockDb: IDBPDatabase | null;
    sqliteDb: SQLiteOPFS | null;
    useSQLite: boolean;
    generateEntryId: () => number;
    calculateStrength: (password: string) => number;
    buildMetadataAtRest: (
      title: string,
      username: string,
      website: string,
      category: string,
      tags: string[]
    ) => Promise<Record<string, unknown>>;
  }): Promise<{ total: number; weak: number; missingFields: number; weakIds: number[] }> {
    const {
      entries,
      aesKey,
      opfsMockDb,
      sqliteDb,
      useSQLite,
      generateEntryId,
      calculateStrength,
      buildMetadataAtRest,
    } = args;

    if (!aesKey) {
      console.error('[VaultEntryService] CRITICAL: aesKey is missing during bulkAdd');
      throw new Error('Vault encryption key not initialized (AES Key Null)');
    }
    if (!opfsMockDb && !sqliteDb) {
      console.error('[VaultEntryService] CRITICAL: Storage backend missing during bulkAdd');
      throw new Error('Vault storage (IDB/SQLite) not initialized');
    }

    let weak = 0;
    let missingFields = 0;
    const weakIds: number[] = [];
    const newEntries: VaultEntry[] = [];

    for (const entry of entries) {
      if (!entry.title || !entry.pass) {
        missingFields++;
        if (!entry.pass) continue;
      }

      const newId = generateEntryId();
      if (entry.pass.length < 8) {
        weak++;
        weakIds.push(newId);
      }

      const enc = new TextEncoder();
      const iv = generateRandomBytes(12);
      const cipherBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: toBufferSource(iv) },
        aesKey,
        toBufferSource(enc.encode(entry.pass))
      );

      const metadata = await buildMetadataAtRest(
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
        strength: calculateStrength(entry.pass),
        pwned_count: entry.pwned_count || 0,
        favorite: Boolean(entry.favorite),
      };

      newEntries.push(newEntry);
    }

    if (opfsMockDb) {
      const tx = opfsMockDb.transaction('passwords', 'readwrite');
      const store = tx.objectStore('passwords');
      for (const entry of newEntries) {
        await store.put(entry);
      }
      await tx.done;
    }

    if (useSQLite && sqliteDb) {
      for (const entry of newEntries) {
        sqliteDb.putPassword(entry);
      }
      await sqliteDb.flushToOPFS();
    }

    return { total: entries.length, weak, missingFields, weakIds };
  }
}

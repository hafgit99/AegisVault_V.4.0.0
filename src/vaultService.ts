/**
 * Aegis Vault Service - Facade Orchestrator (V5.0)
 */

import type { IDBPDatabase } from 'idb';
import type { SQLiteOPFS } from './lib/SQLiteOPFS';
import { AegisError } from './lib/AegisError';
import type { AegisErrorCode } from './lib/AegisError';
import {
  type VaultEntry,
  type VaultAliasDetails,
  type VaultCardDetails,
  type VaultIdentityDetails,
  type VaultAttachmentMeta,
  type StoredCredential,
  hexToBuffer,
  toBufferSource,
} from './lib/crypto-types';

export type {
  VaultEntry,
  VaultAliasDetails,
  VaultCardDetails,
  VaultIdentityDetails,
  VaultAttachmentMeta,
  StoredCredential,
};

// Servisler
import { VaultCryptoService } from './lib/vault/VaultCryptoService';
import { VaultSearchIndexer } from './lib/vault/VaultSearchIndexer';
import { VaultAttachmentService } from './lib/vault/VaultAttachmentService';
import { VaultTrashService } from './lib/vault/VaultTrashService';
import { VaultAuthService } from './lib/vault/VaultAuthService';
import { VaultBootstrapService } from './lib/vault/VaultBootstrapService';
import { VaultEntryService } from './lib/vault/VaultEntryService';
import { VaultPinService } from './lib/vault/VaultPinService';
import { SecureAppSettings } from './lib/SecureAppSettings';
import * as EncryptionProfiles from './config/encryption-profiles';

export class VaultService {
  // ─── State ───
  public aesKey: CryptoKey | null = null;
  public sensitiveMaterial: Uint8Array | null = null;
  public searchIndexHmacKey: CryptoKey | null = null;
  public isConnected = false;
  public opfsMockDb: IDBPDatabase | null = null;
  public sqliteDb: SQLiteOPFS | null = null;
  public useSQLite = false;
  public decryptedEntriesCache: VaultEntry[] | null = null;
  public mutationLock: Promise<void> = Promise.resolve();
  public activeVaultDbNames: string[] = [];
  private _vaultDbName: string = 'aegis_opfs_vault';
  private _authFailureLog: Map<string, { count: number; lastTs: number }> = new Map();

  // ─── Getters ───
  public isUnlocked(): boolean {
    return this.aesKey !== null;
  }

  public getVaultDbName(): string {
    return this._vaultDbName;
  }

  public setVaultDbName(name: string): void {
    this._vaultDbName = name;
  }

  // ─── Test & Coverage Bridge Metodları ───
  public calculateStrength(password: string): number {
    return VaultCryptoService.calculateStrength(password);
  }

  public static async verifyPassword(password: string, stored: StoredCredential): Promise<boolean> {
    return VaultAuthService.verifyPassword(
      password,
      stored,
      VaultAuthService.calibrateArgon2Params()
    );
  }

  public async encryptTextField(value: string): Promise<{ encrypted: string; iv: string }> {
    return VaultCryptoService.encryptTextField(this.aesKey, value);
  }

  public async decryptTextField(encrypted?: string, iv?: string): Promise<string | null> {
    return VaultCryptoService.decryptTextField(this.aesKey, encrypted, iv);
  }

  public async verifyCurrentPassword(password: string): Promise<boolean> {
    const stored = await this.getAuthCredential();
    if (!stored) return false;
    return VaultAuthService.verifyPassword(
      password,
      stored,
      VaultAuthService.calibrateArgon2Params()
    );
  }

  private async getAuthCredential(): Promise<StoredCredential | null> {
    if (this.useSQLite && this.sqliteDb) {
      const meta = (
        this.sqliteDb as unknown as { getMetadata: () => Record<string, unknown> | null }
      ).getMetadata?.();
      return (meta?.credential as StoredCredential) ?? null;
    }
    if (this.opfsMockDb) {
      const meta = await (
        this.opfsMockDb as unknown as {
          get: (store: string, key: string) => Promise<Record<string, unknown> | undefined>;
        }
      ).get('meta', 'auth');
      return (meta?.credential as StoredCredential) ?? null;
    }
    return null;
  }

  public normalizeSearchValue(value: string): string {
    return VaultSearchIndexer.normalize(value);
  }

  public tokenizeSearchFields(fields: string[]): string[] {
    return VaultSearchIndexer.tokenize(fields);
  }

  private async getHmacKey(): Promise<CryptoKey> {
    return VaultSearchIndexer.getOrCreateHmacKey(this.sensitiveMaterial, this.searchIndexHmacKey);
  }

  public async hashSearchToken(token: string): Promise<string> {
    if (!this.aesKey) return '';
    const hmacKey = await this.getHmacKey();
    return VaultSearchIndexer.hashToken(token, hmacKey);
  }

  public async buildSearchIndex(
    title: string,
    username: string,
    website: string,
    category: string,
    tags: string[]
  ): Promise<string[]> {
    if (!this.aesKey) return [];
    const hmacKey = await this.getHmacKey();
    return VaultSearchIndexer.buildIndex({ title, username, website, category, tags }, async (t) =>
      VaultSearchIndexer.hashToken(t, hmacKey)
    );
  }

  public async prepareEntryMetadataForUse(entry: VaultEntry) {
    const res = await VaultCryptoService.prepareEntryMetadataForUse(entry, this.aesKey);

    // Gen search_index if missing during lazy migration
    if (!res.uiEntry.search_index || res.uiEntry.search_index.length === 0) {
      if (res.uiEntry.title) {
        const hmacKey = await this.getHmacKey();
        const rawTokens = [
          res.uiEntry.title,
          res.uiEntry.username || '',
          res.uiEntry.website || '',
          res.uiEntry.category || '',
          ...(res.uiEntry.tags || []),
        ];
        const tokens = VaultSearchIndexer.tokenize(rawTokens);
        const uniqueTokens = Array.from(new Set(tokens));
        const searchIndex: string[] = [];
        for (const token of uniqueTokens) {
          const hash = await VaultSearchIndexer.hashToken(token, hmacKey);
          searchIndex.push(hash);
        }
        res.uiEntry.search_index = searchIndex;
        if (res.storageEntry) {
          res.storageEntry.search_index = searchIndex;
        } else {
          res.storageEntry = { ...res.uiEntry };
        }
      }
    }
    return res;
  }

  public async buildMetadataAtRest(
    title: string,
    username: string,
    website: string,
    category: string,
    tags: string[]
  ): Promise<Record<string, unknown>> {
    if (!this.aesKey) return {};
    return VaultCryptoService.buildMetadataAtRest({
      title,
      username,
      website,
      category,
      tags,
      aesKey: this.aesKey,
      getSearchIndexHmacKey: () => this.getHmacKey(),
    });
  }

  public async encryptAttachmentMetadataList(
    attachments: Array<{ id: string; name: string; type: string; size: number }>
  ): Promise<VaultAttachmentMeta[]> {
    if (
      !EncryptionProfiles.isFieldEncrypted(SecureAppSettings.getEncryptionProfile(), 'attachments')
    ) {
      return attachments as unknown as Array<VaultAttachmentMeta>;
    }
    return VaultCryptoService.encryptAttachmentMetadataList(
      attachments as VaultAttachmentMeta[],
      this.aesKey
    );
  }

  public async hydrateRichSensitiveFields(entries: VaultEntry[]): Promise<void> {
    return VaultCryptoService.hydrateRichSensitiveFields(entries, this.aesKey);
  }

  public registerAuthFailure(scope: 'unlock' | 'reauth', dbName: string): void {
    const key = `${scope}:${dbName}`;
    const entry = this._authFailureLog.get(key) || { count: 0, lastTs: 0 };
    entry.count += 1;
    entry.lastTs = Date.now();
    this._authFailureLog.set(key, entry);
  }

  public enforceAuthRateLimit(scope: 'unlock' | 'reauth', dbName: string): void {
    const key = `${scope}:${dbName}`;
    const entry = this._authFailureLog.get(key);
    if (!entry || entry.count === 0) return;
    const baseDelay = 1000; // 1 second base
    const delay = baseDelay * Math.pow(2, Math.min(entry.count - 1, 20));
    const elapsed = Date.now() - entry.lastTs;
    if (elapsed < delay) {
      const err = new Error('RATE_LIMITED') as Error & { retryAfterMs: number };
      err.retryAfterMs = delay - elapsed;
      throw err;
    }
  }

  public registerAuthSuccess(scope: 'unlock' | 'reauth', dbName: string): void {
    const key = `${scope}:${dbName}`;
    this._authFailureLog.delete(key);
  }

  public resolveArgon2Params(): NonNullable<StoredCredential['argon2']> {
    return VaultAuthService.calibrateArgon2Params();
  }

  // ─── Orkestrasyon Yardımcıları ───
  private async withMutationLock<T>(fn: () => Promise<T>): Promise<T> {
    const unlock = this.mutationLock;
    let resolveLock: () => void;
    this.mutationLock = new Promise((resolve) => {
      resolveLock = resolve;
    });
    await unlock;
    try {
      return await fn();
    } finally {
      resolveLock!();
    }
  }

  // ─── Bootstrap & Auth ───
  async initDb(
    password: string,
    secretKey: string,
    dbName: string = 'aegis_opfs_vault',
    isSetupAction: boolean = false
  ): Promise<void> {
    const result = await VaultBootstrapService.initDb({
      password,
      secretKey,
      dbName,
      isSetupAction,
      deriveMasterKey: (pw, sk, salt) => this.deriveMasterKey(pw, sk, salt),
      verifyPassword: (pw, stored) =>
        VaultAuthService.verifyPassword(pw, stored, VaultAuthService.calibrateArgon2Params()),
      migrateAuthCredentialToArgon2: (pw, old) =>
        VaultAuthService.migrateCredentialToArgon2(
          pw,
          old,
          VaultAuthService.calibrateArgon2Params()
        ),
      createAuthCredential: (pw) =>
        VaultAuthService.createAuthCredential(pw, VaultAuthService.calibrateArgon2Params()),
      getAesKey: () => this.aesKey,
      setAesKey: (k) => {
        this.aesKey = k;
      },
      setDecryptedEntriesCache: (e) => {
        this.decryptedEntriesCache = e;
      },
    });

    // Anahtar derivedMasterKey callback'i tarafindan set edildi, ama garanti olsun diye return'den de alak
    if (result.aesKey && !this.aesKey) {
      this.aesKey = result.aesKey;
    }
    this.opfsMockDb = result.opfsMockDb;
    this.sqliteDb = result.sqliteDb;
    this.useSQLite = result.useSQLite;
    this.isConnected = true;
    this.decryptedEntriesCache = null;
    if (!this.activeVaultDbNames.includes(dbName)) {
      this.activeVaultDbNames.push(dbName);
    }
    this.aesKey = result.aesKey;
    this.sensitiveMaterial = result.sensitiveMaterial;
    console.log('[VaultService] initDb SUCCESS:', { hasKey: !!this.aesKey });
  }

  async deriveMasterKey(
    password: string,
    secretKey: string,
    saltB64?: string
  ): Promise<{ saltB64: string; aesKey: CryptoKey; sensitiveMaterial: Uint8Array }> {
    const result = await VaultAuthService.deriveMasterKey({
      password,
      secretKey,
      saltB64,
      params: VaultAuthService.calibrateArgon2Params(),
    });
    this.aesKey = result.aesKey;
    this.sensitiveMaterial = result.sensitiveMaterial;
    await Promise.resolve();
    return result;
  }

  async wipeAllData(): Promise<void> {
    await VaultBootstrapService.wipeAllData(this.opfsMockDb, this.sqliteDb);
    localStorage.removeItem('aegis_active_vault');
    localStorage.removeItem('aegis_vault_remember_me');
    await this.lock();
  }

  async exportVault(): Promise<string> {
    const entries = await this.getPasswords();
    return JSON.stringify(entries);
  }

  // ─── Entry CRUD ───
  async addPassword(entry: Partial<VaultEntry>): Promise<number> {
    return this.withMutationLock(async () => {
      if (!this.aesKey) {
        console.error('[VaultService] Blocking addPassword: NO KEY AVAILABLE');
        throw new AegisError('AUTH_VAULT_LOCKED', 'Vault encryption key not initialized', {
          severity: 'high',
          context: { source: 'VaultService', operation: 'addPassword' },
        });
      }
      const id = await VaultEntryService.addPassword({
        entry,
        aesKey: this.aesKey,
        opfsMockDb: this.opfsMockDb,
        sqliteDb: this.sqliteDb,
        useSQLite: this.useSQLite,
        generateEntryId: () => Math.floor(Math.random() * 1000000000),
        calculateStrength: (password) => VaultCryptoService.calculateStrength(password),
        buildMetadataAtRest: (title, username, website, category, tags) =>
          this.buildMetadataAtRest(title, username, website, category, tags),
        normalizeCardDetails: (details) => VaultCryptoService.normalizeCardDetails(details),
        normalizeIdentityDetails: (details) => VaultCryptoService.normalizeIdentityDetails(details),
        normalizeAliasDetails: (details) => VaultCryptoService.normalizeAliasDetails(details),
        encryptAttachmentMetadataList: (attachments) =>
          this.encryptAttachmentMetadataList(attachments),
      });
      this.decryptedEntriesCache = null;
      return id;
    });
  }

  async updatePassword(id: number, entry: Partial<VaultEntry>): Promise<number> {
    return this.addPassword({ ...entry, id });
  }

  async decryptHistory(entry: VaultEntry): Promise<VaultEntry[]> {
    if (!this.aesKey || !entry.encrypted_history || !entry.history_iv) return [];
    try {
      const historyIvArray = hexToBuffer(entry.history_iv);
      const historyCipherArray = hexToBuffer(entry.encrypted_history);
      const historyPlainBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: toBufferSource(historyIvArray) },
        this.aesKey,
        toBufferSource(historyCipherArray)
      );
      return JSON.parse(new TextDecoder().decode(historyPlainBuffer));
    } catch (e) {
      console.error('[VaultService] History decryption failed:', e);
      return [];
    }
  }

  async getPasswords(
    searchQuery: string = '',
    categoryFilter: string = '',
    isTrash: boolean = false,
    searchScope: 'all' | 'title' | 'username' | 'tags' = 'all'
  ): Promise<VaultEntry[]> {
    const result = await VaultEntryService.getPasswords({
      searchQuery,
      categoryFilter,
      isTrash,
      searchScope,
      aesKey: this.aesKey,
      opfsMockDb: this.opfsMockDb,
      sqliteDb: this.sqliteDb,
      useSQLite: this.useSQLite,
      decryptedEntriesCache: this.decryptedEntriesCache,
      prepareEntryMetadataForUse: (entry) => this.prepareEntryMetadataForUse(entry),
      hydrateRichSensitiveFields: (entries) => this.hydrateRichSensitiveFields(entries),
    });

    this.decryptedEntriesCache = result.cache;
    return result.entries;
  }

  async bulkAddPasswords(
    entries: Partial<VaultEntry>[]
  ): Promise<{ total: number; weak: number; missingFields: number; weakIds: number[] }> {
    return this.withMutationLock(async () => {
      const result = await VaultEntryService.bulkAddPasswords({
        entries,
        aesKey: this.aesKey,
        opfsMockDb: this.opfsMockDb,
        sqliteDb: this.sqliteDb,
        useSQLite: this.useSQLite,
        generateEntryId: () => Math.floor(Math.random() * 1000000000),
        calculateStrength: (password) => VaultCryptoService.calculateStrength(password),
        buildMetadataAtRest: (title, username, website, category, tags) =>
          this.buildMetadataAtRest(title, username, website, category, tags),
      });
      this.decryptedEntriesCache = null;
      return result;
    });
  }

  async changeMasterPassword(
    oldPassword: string,
    newPassword: string,
    secretKey: string
  ): Promise<void> {
    return this.withMutationLock(async () => {
      await VaultEntryService.changeMasterPassword({
        oldPassword,
        newPassword,
        secretKey,
        opfsMockDb: this.opfsMockDb,
        sqliteDb: this.sqliteDb,
        useSQLite: this.useSQLite,
        aesKey: this.aesKey,
        verifyPassword: (password, stored) =>
          VaultAuthService.verifyPassword(
            password,
            stored,
            VaultAuthService.calibrateArgon2Params()
          ),
        getPasswords: () => this.getPasswords(),
        deriveMasterKey: async (password, key, salt) =>
          (await this.deriveMasterKey(password, key, salt)).saltB64,
        createAuthCredential: (password) =>
          VaultAuthService.createAuthCredential(password, VaultAuthService.calibrateArgon2Params()),
        buildMetadataAtRest: (t, u, w, c, tg) => this.buildMetadataAtRest(t, u, w, c, tg),
        encryptAttachmentMetadataList: (a) => this.encryptAttachmentMetadataList(a),
        getAesKey: () => this.aesKey,
      });
      this.decryptedEntriesCache = null;
    });
  }

  async addAttachment(
    entryId: number,
    file: File
  ): Promise<{ id: string; name: string; type: string; size: number }> {
    return this.withMutationLock(async () => {
      return VaultAttachmentService.addAttachment({
        aesKey: this.aesKey,
        opfsMockDb: this.opfsMockDb,
        sqliteDb: this.sqliteDb,
        useSQLite: this.useSQLite,
        entryId,
        file,
        encryptAttachmentMetadataList: (attachments) =>
          this.encryptAttachmentMetadataList(attachments),
      });
    });
  }

  async getDecryptedAttachment(attachmentId: string): Promise<Blob> {
    return VaultAttachmentService.getDecryptedAttachment({
      aesKey: this.aesKey,
      opfsMockDb: this.opfsMockDb,
      sqliteDb: this.sqliteDb,
      useSQLite: this.useSQLite,
      attachmentId,
    });
  }

  async deleteAttachment(entryId: number, attachmentId: string): Promise<void> {
    return this.withMutationLock(async () => {
      await VaultAttachmentService.deleteAttachment({
        opfsMockDb: this.opfsMockDb,
        sqliteDb: this.sqliteDb,
        useSQLite: this.useSQLite,
        entryId,
        attachmentId,
      });
      this.decryptedEntriesCache = null;
    });
  }

  async moveToTrash(entryId: number): Promise<void> {
    return this.withMutationLock(async () => {
      await VaultTrashService.moveToTrash({
        opfsMockDb: this.opfsMockDb,
        sqliteDb: this.sqliteDb,
        useSQLite: this.useSQLite,
        entryId,
        invalidateCache: () => {
          this.decryptedEntriesCache = null;
        },
      });
    });
  }

  async restoreFromTrash(entryId: number): Promise<void> {
    return this.withMutationLock(async () => {
      await VaultTrashService.restoreFromTrash({
        opfsMockDb: this.opfsMockDb,
        sqliteDb: this.sqliteDb,
        useSQLite: this.useSQLite,
        entryId,
        invalidateCache: () => {
          this.decryptedEntriesCache = null;
        },
      });
    });
  }

  async deletePermanently(entryId: number): Promise<void> {
    return this.withMutationLock(async () => {
      await VaultTrashService.deletePermanently({
        opfsMockDb: this.opfsMockDb,
        sqliteDb: this.sqliteDb,
        useSQLite: this.useSQLite,
        entryId,
        invalidateCache: () => {
          this.decryptedEntriesCache = null;
        },
      });
    });
  }

  async emptyTrash(): Promise<void> {
    return this.withMutationLock(async () => {
      await VaultTrashService.emptyTrash({
        opfsMockDb: this.opfsMockDb,
        sqliteDb: this.sqliteDb,
        useSQLite: this.useSQLite,
      });
      this.decryptedEntriesCache = null;
    });
  }

  async cleanupTrash(): Promise<void> {
    await VaultTrashService.cleanupTrash({
      opfsMockDb: this.opfsMockDb,
      deletePermanently: (id) => this.deletePermanently(id),
    });
  }

  async saveSecurityPins(duressPin: string, killPin: string): Promise<void> {
    await VaultPinService.saveSecurityPins({
      aesKey: this.aesKey,
      opfsMockDb: this.opfsMockDb,
      sqliteDb: this.sqliteDb,
      useSQLite: this.useSQLite,
      duressPin,
      killPin,
      randomBytes: (len: number) => window.crypto.getRandomValues(new Uint8Array(len)),
    });
  }

  async getSecurityPins(): Promise<{ duressPin: string; killPin: string }> {
    return VaultPinService.getSecurityPins({
      aesKey: this.aesKey,
      opfsMockDb: this.opfsMockDb,
      sqliteDb: this.sqliteDb,
      useSQLite: this.useSQLite,
    });
  }

  async getSearchIndexHmacKey(): Promise<CryptoKey> {
    if (this.searchIndexHmacKey) return this.searchIndexHmacKey;
    if (!this.sensitiveMaterial && !this.aesKey)
      throw new Error('Lock required for HMAC key derivation');
    const key = await VaultSearchIndexer.getOrCreateHmacKey(this.sensitiveMaterial, null);
    this.searchIndexHmacKey = key;
    return key;
  }

  async lock(): Promise<void> {
    if (this.sensitiveMaterial) {
      window.crypto.getRandomValues(this.sensitiveMaterial);
      this.sensitiveMaterial = null;
    }
    this.aesKey = null;
    this.searchIndexHmacKey = null;

    if (this.sqliteDb) {
      this.sqliteDb.close();
      this.sqliteDb = null;
    }
    if (this.opfsMockDb) {
      this.opfsMockDb.close();
      this.opfsMockDb = null;
    }

    this.useSQLite = false;
    this.decryptedEntriesCache = null;
    this.isConnected = false;
    this.activeVaultDbNames = [];
    console.log('[SQLite-OPFS] Vault locked.');
  }
}

export const vaultService = new VaultService();

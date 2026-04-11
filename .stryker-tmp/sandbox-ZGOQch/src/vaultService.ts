/**
 * Aegis Vault Service - Facade Orchestrator (V5.0)
 */
// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import type { IDBPDatabase } from 'idb';
import type { SQLiteOPFS } from './lib/SQLiteOPFS';
import { AegisError } from './lib/AegisError';
import type { AegisErrorCode } from './lib/AegisError';
import type { VaultEntry, VaultCardDetails, VaultIdentityDetails, VaultAttachmentMeta, StoredCredential } from './lib/crypto-types';
export type { VaultEntry, VaultCardDetails, VaultIdentityDetails, VaultAttachmentMeta, StoredCredential };

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
  public isConnected = stryMutAct_9fa48("1656") ? true : (stryCov_9fa48("1656"), false);
  public opfsMockDb: IDBPDatabase | null = null;
  public sqliteDb: SQLiteOPFS | null = null;
  public useSQLite = stryMutAct_9fa48("1657") ? true : (stryCov_9fa48("1657"), false);
  public decryptedEntriesCache: VaultEntry[] | null = null;
  public mutationLock: Promise<void> = Promise.resolve();
  public activeVaultDbNames: string[] = stryMutAct_9fa48("1658") ? ["Stryker was here"] : (stryCov_9fa48("1658"), []);
  private _vaultDbName: string = stryMutAct_9fa48("1659") ? "" : (stryCov_9fa48("1659"), 'aegis_opfs_vault');
  private _authFailureLog: Map<string, {
    count: number;
    lastTs: number;
  }> = new Map();

  // ─── Getters ───
  public isUnlocked(): boolean {
    if (stryMutAct_9fa48("1660")) {
      {}
    } else {
      stryCov_9fa48("1660");
      return stryMutAct_9fa48("1663") ? this.aesKey === null : stryMutAct_9fa48("1662") ? false : stryMutAct_9fa48("1661") ? true : (stryCov_9fa48("1661", "1662", "1663"), this.aesKey !== null);
    }
  }
  public getVaultDbName(): string {
    if (stryMutAct_9fa48("1664")) {
      {}
    } else {
      stryCov_9fa48("1664");
      return this._vaultDbName;
    }
  }
  public setVaultDbName(name: string): void {
    if (stryMutAct_9fa48("1665")) {
      {}
    } else {
      stryCov_9fa48("1665");
      this._vaultDbName = name;
    }
  }

  // ─── Test & Coverage Bridge Metodları ───
  public calculateStrength(password: string): number {
    if (stryMutAct_9fa48("1666")) {
      {}
    } else {
      stryCov_9fa48("1666");
      return VaultCryptoService.calculateStrength(password);
    }
  }
  public static async verifyPassword(password: string, stored: StoredCredential): Promise<boolean> {
    if (stryMutAct_9fa48("1667")) {
      {}
    } else {
      stryCov_9fa48("1667");
      return VaultAuthService.verifyPassword(password, stored, VaultAuthService.calibrateArgon2Params());
    }
  }
  public async encryptTextField(value: string): Promise<{
    encrypted: string;
    iv: string;
  }> {
    if (stryMutAct_9fa48("1668")) {
      {}
    } else {
      stryCov_9fa48("1668");
      return VaultCryptoService.encryptTextField(this.aesKey, value);
    }
  }
  public async decryptTextField(encrypted?: string, iv?: string): Promise<string | null> {
    if (stryMutAct_9fa48("1669")) {
      {}
    } else {
      stryCov_9fa48("1669");
      return VaultCryptoService.decryptTextField(this.aesKey, encrypted, iv);
    }
  }
  public async verifyCurrentPassword(password: string): Promise<boolean> {
    if (stryMutAct_9fa48("1670")) {
      {}
    } else {
      stryCov_9fa48("1670");
      const stored = await this.getAuthCredential();
      if (stryMutAct_9fa48("1673") ? false : stryMutAct_9fa48("1672") ? true : stryMutAct_9fa48("1671") ? stored : (stryCov_9fa48("1671", "1672", "1673"), !stored)) return stryMutAct_9fa48("1674") ? true : (stryCov_9fa48("1674"), false);
      return VaultAuthService.verifyPassword(password, stored, VaultAuthService.calibrateArgon2Params());
    }
  }
  private async getAuthCredential(): Promise<StoredCredential | null> {
    if (stryMutAct_9fa48("1675")) {
      {}
    } else {
      stryCov_9fa48("1675");
      if (stryMutAct_9fa48("1678") ? this.useSQLite || this.sqliteDb : stryMutAct_9fa48("1677") ? false : stryMutAct_9fa48("1676") ? true : (stryCov_9fa48("1676", "1677", "1678"), this.useSQLite && this.sqliteDb)) {
        if (stryMutAct_9fa48("1679")) {
          {}
        } else {
          stryCov_9fa48("1679");
          const meta = stryMutAct_9fa48("1680") ? (this.sqliteDb as unknown as {
            getMetadata: () => Record<string, unknown> | null;
          }).getMetadata() : (stryCov_9fa48("1680"), (this.sqliteDb as unknown as {
            getMetadata: () => Record<string, unknown> | null;
          }).getMetadata?.());
          return stryMutAct_9fa48("1681") ? meta?.credential as StoredCredential && null : (stryCov_9fa48("1681"), meta?.credential as StoredCredential ?? null);
        }
      }
      if (stryMutAct_9fa48("1683") ? false : stryMutAct_9fa48("1682") ? true : (stryCov_9fa48("1682", "1683"), this.opfsMockDb)) {
        if (stryMutAct_9fa48("1684")) {
          {}
        } else {
          stryCov_9fa48("1684");
          const meta = await (this.opfsMockDb as unknown as {
            get: (store: string, key: string) => Promise<Record<string, unknown> | undefined>;
          }).get(stryMutAct_9fa48("1685") ? "" : (stryCov_9fa48("1685"), 'meta'), stryMutAct_9fa48("1686") ? "" : (stryCov_9fa48("1686"), 'auth'));
          return stryMutAct_9fa48("1687") ? meta?.credential as StoredCredential && null : (stryCov_9fa48("1687"), meta?.credential as StoredCredential ?? null);
        }
      }
      return null;
    }
  }
  public normalizeSearchValue(value: string): string {
    if (stryMutAct_9fa48("1688")) {
      {}
    } else {
      stryCov_9fa48("1688");
      return VaultSearchIndexer.normalize(value);
    }
  }
  public tokenizeSearchFields(fields: string[]): string[] {
    if (stryMutAct_9fa48("1689")) {
      {}
    } else {
      stryCov_9fa48("1689");
      return VaultSearchIndexer.tokenize(fields);
    }
  }
  private async getHmacKey(): Promise<CryptoKey> {
    if (stryMutAct_9fa48("1690")) {
      {}
    } else {
      stryCov_9fa48("1690");
      return VaultSearchIndexer.getOrCreateHmacKey(this.sensitiveMaterial, this.searchIndexHmacKey);
    }
  }
  public async hashSearchToken(token: string): Promise<string> {
    if (stryMutAct_9fa48("1691")) {
      {}
    } else {
      stryCov_9fa48("1691");
      if (stryMutAct_9fa48("1694") ? false : stryMutAct_9fa48("1693") ? true : stryMutAct_9fa48("1692") ? this.aesKey : (stryCov_9fa48("1692", "1693", "1694"), !this.aesKey)) return stryMutAct_9fa48("1695") ? "Stryker was here!" : (stryCov_9fa48("1695"), '');
      const hmacKey = await this.getHmacKey();
      return VaultSearchIndexer.hashToken(token, hmacKey);
    }
  }
  public async buildSearchIndex(title: string, username: string, website: string, category: string, tags: string[]): Promise<string[]> {
    if (stryMutAct_9fa48("1696")) {
      {}
    } else {
      stryCov_9fa48("1696");
      if (stryMutAct_9fa48("1699") ? false : stryMutAct_9fa48("1698") ? true : stryMutAct_9fa48("1697") ? this.aesKey : (stryCov_9fa48("1697", "1698", "1699"), !this.aesKey)) return stryMutAct_9fa48("1700") ? ["Stryker was here"] : (stryCov_9fa48("1700"), []);
      const hmacKey = await this.getHmacKey();
      return VaultSearchIndexer.buildIndex(stryMutAct_9fa48("1701") ? {} : (stryCov_9fa48("1701"), {
        title,
        username,
        website,
        category,
        tags
      }), stryMutAct_9fa48("1702") ? () => undefined : (stryCov_9fa48("1702"), async t => VaultSearchIndexer.hashToken(t, hmacKey)));
    }
  }
  public async prepareEntryMetadataForUse(entry: VaultEntry) {
    if (stryMutAct_9fa48("1703")) {
      {}
    } else {
      stryCov_9fa48("1703");
      const res = await VaultCryptoService.prepareEntryMetadataForUse(entry, this.aesKey);

      // Gen search_index if missing during lazy migration
      if (stryMutAct_9fa48("1706") ? !res.uiEntry.search_index && res.uiEntry.search_index.length === 0 : stryMutAct_9fa48("1705") ? false : stryMutAct_9fa48("1704") ? true : (stryCov_9fa48("1704", "1705", "1706"), (stryMutAct_9fa48("1707") ? res.uiEntry.search_index : (stryCov_9fa48("1707"), !res.uiEntry.search_index)) || (stryMutAct_9fa48("1709") ? res.uiEntry.search_index.length !== 0 : stryMutAct_9fa48("1708") ? false : (stryCov_9fa48("1708", "1709"), res.uiEntry.search_index.length === 0)))) {
        if (stryMutAct_9fa48("1710")) {
          {}
        } else {
          stryCov_9fa48("1710");
          if (stryMutAct_9fa48("1712") ? false : stryMutAct_9fa48("1711") ? true : (stryCov_9fa48("1711", "1712"), res.uiEntry.title)) {
            if (stryMutAct_9fa48("1713")) {
              {}
            } else {
              stryCov_9fa48("1713");
              const hmacKey = await this.getHmacKey();
              const rawTokens = stryMutAct_9fa48("1714") ? [] : (stryCov_9fa48("1714"), [res.uiEntry.title, stryMutAct_9fa48("1717") ? res.uiEntry.username && '' : stryMutAct_9fa48("1716") ? false : stryMutAct_9fa48("1715") ? true : (stryCov_9fa48("1715", "1716", "1717"), res.uiEntry.username || (stryMutAct_9fa48("1718") ? "Stryker was here!" : (stryCov_9fa48("1718"), ''))), stryMutAct_9fa48("1721") ? res.uiEntry.website && '' : stryMutAct_9fa48("1720") ? false : stryMutAct_9fa48("1719") ? true : (stryCov_9fa48("1719", "1720", "1721"), res.uiEntry.website || (stryMutAct_9fa48("1722") ? "Stryker was here!" : (stryCov_9fa48("1722"), ''))), stryMutAct_9fa48("1725") ? res.uiEntry.category && '' : stryMutAct_9fa48("1724") ? false : stryMutAct_9fa48("1723") ? true : (stryCov_9fa48("1723", "1724", "1725"), res.uiEntry.category || (stryMutAct_9fa48("1726") ? "Stryker was here!" : (stryCov_9fa48("1726"), ''))), ...(stryMutAct_9fa48("1729") ? res.uiEntry.tags && [] : stryMutAct_9fa48("1728") ? false : stryMutAct_9fa48("1727") ? true : (stryCov_9fa48("1727", "1728", "1729"), res.uiEntry.tags || (stryMutAct_9fa48("1730") ? ["Stryker was here"] : (stryCov_9fa48("1730"), []))))]);
              const tokens = VaultSearchIndexer.tokenize(rawTokens);
              const uniqueTokens = Array.from(new Set(tokens));
              const searchIndex: string[] = stryMutAct_9fa48("1731") ? ["Stryker was here"] : (stryCov_9fa48("1731"), []);
              for (const token of uniqueTokens) {
                if (stryMutAct_9fa48("1732")) {
                  {}
                } else {
                  stryCov_9fa48("1732");
                  const hash = await VaultSearchIndexer.hashToken(token, hmacKey);
                  searchIndex.push(hash);
                }
              }
              res.uiEntry.search_index = searchIndex;
              if (stryMutAct_9fa48("1734") ? false : stryMutAct_9fa48("1733") ? true : (stryCov_9fa48("1733", "1734"), res.storageEntry)) {
                if (stryMutAct_9fa48("1735")) {
                  {}
                } else {
                  stryCov_9fa48("1735");
                  res.storageEntry.search_index = searchIndex;
                }
              } else {
                if (stryMutAct_9fa48("1736")) {
                  {}
                } else {
                  stryCov_9fa48("1736");
                  res.storageEntry = stryMutAct_9fa48("1737") ? {} : (stryCov_9fa48("1737"), {
                    ...res.uiEntry
                  });
                }
              }
            }
          }
        }
      }
      return res;
    }
  }
  public async buildMetadataAtRest(title: string, username: string, website: string, category: string, tags: string[]): Promise<Record<string, unknown>> {
    if (stryMutAct_9fa48("1738")) {
      {}
    } else {
      stryCov_9fa48("1738");
      if (stryMutAct_9fa48("1741") ? false : stryMutAct_9fa48("1740") ? true : stryMutAct_9fa48("1739") ? this.aesKey : (stryCov_9fa48("1739", "1740", "1741"), !this.aesKey)) return {};
      return VaultCryptoService.buildMetadataAtRest(stryMutAct_9fa48("1742") ? {} : (stryCov_9fa48("1742"), {
        title,
        username,
        website,
        category,
        tags,
        aesKey: this.aesKey,
        getSearchIndexHmacKey: stryMutAct_9fa48("1743") ? () => undefined : (stryCov_9fa48("1743"), () => this.getHmacKey())
      }));
    }
  }
  public async encryptAttachmentMetadataList(attachments: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
  }>): Promise<VaultAttachmentMeta[]> {
    if (stryMutAct_9fa48("1744")) {
      {}
    } else {
      stryCov_9fa48("1744");
      if (stryMutAct_9fa48("1747") ? false : stryMutAct_9fa48("1746") ? true : stryMutAct_9fa48("1745") ? EncryptionProfiles.isFieldEncrypted(SecureAppSettings.getEncryptionProfile(), 'attachments') : (stryCov_9fa48("1745", "1746", "1747"), !EncryptionProfiles.isFieldEncrypted(SecureAppSettings.getEncryptionProfile(), stryMutAct_9fa48("1748") ? "" : (stryCov_9fa48("1748"), 'attachments')))) {
        if (stryMutAct_9fa48("1749")) {
          {}
        } else {
          stryCov_9fa48("1749");
          return attachments as unknown as Array<VaultAttachmentMeta>;
        }
      }
      return VaultCryptoService.encryptAttachmentMetadataList(attachments as VaultAttachmentMeta[], this.aesKey);
    }
  }
  public async hydrateRichSensitiveFields(entries: VaultEntry[]): Promise<void> {
    if (stryMutAct_9fa48("1750")) {
      {}
    } else {
      stryCov_9fa48("1750");
      return VaultCryptoService.hydrateRichSensitiveFields(entries, this.aesKey);
    }
  }
  public registerAuthFailure(scope: 'unlock' | 'reauth', dbName: string): void {
    if (stryMutAct_9fa48("1751")) {
      {}
    } else {
      stryCov_9fa48("1751");
      const key = stryMutAct_9fa48("1752") ? `` : (stryCov_9fa48("1752"), `${scope}:${dbName}`);
      const entry = stryMutAct_9fa48("1755") ? this._authFailureLog.get(key) && {
        count: 0,
        lastTs: 0
      } : stryMutAct_9fa48("1754") ? false : stryMutAct_9fa48("1753") ? true : (stryCov_9fa48("1753", "1754", "1755"), this._authFailureLog.get(key) || (stryMutAct_9fa48("1756") ? {} : (stryCov_9fa48("1756"), {
        count: 0,
        lastTs: 0
      })));
      stryMutAct_9fa48("1757") ? entry.count -= 1 : (stryCov_9fa48("1757"), entry.count += 1);
      entry.lastTs = Date.now();
      this._authFailureLog.set(key, entry);
    }
  }
  public enforceAuthRateLimit(scope: 'unlock' | 'reauth', dbName: string): void {
    if (stryMutAct_9fa48("1758")) {
      {}
    } else {
      stryCov_9fa48("1758");
      const key = stryMutAct_9fa48("1759") ? `` : (stryCov_9fa48("1759"), `${scope}:${dbName}`);
      const entry = this._authFailureLog.get(key);
      if (stryMutAct_9fa48("1762") ? !entry && entry.count === 0 : stryMutAct_9fa48("1761") ? false : stryMutAct_9fa48("1760") ? true : (stryCov_9fa48("1760", "1761", "1762"), (stryMutAct_9fa48("1763") ? entry : (stryCov_9fa48("1763"), !entry)) || (stryMutAct_9fa48("1765") ? entry.count !== 0 : stryMutAct_9fa48("1764") ? false : (stryCov_9fa48("1764", "1765"), entry.count === 0)))) return;
      const baseDelay = 1000; // 1 second base
      const delay = stryMutAct_9fa48("1766") ? baseDelay / Math.pow(2, Math.min(entry.count - 1, 20)) : (stryCov_9fa48("1766"), baseDelay * Math.pow(2, stryMutAct_9fa48("1767") ? Math.max(entry.count - 1, 20) : (stryCov_9fa48("1767"), Math.min(stryMutAct_9fa48("1768") ? entry.count + 1 : (stryCov_9fa48("1768"), entry.count - 1), 20))));
      const elapsed = stryMutAct_9fa48("1769") ? Date.now() + entry.lastTs : (stryCov_9fa48("1769"), Date.now() - entry.lastTs);
      if (stryMutAct_9fa48("1773") ? elapsed >= delay : stryMutAct_9fa48("1772") ? elapsed <= delay : stryMutAct_9fa48("1771") ? false : stryMutAct_9fa48("1770") ? true : (stryCov_9fa48("1770", "1771", "1772", "1773"), elapsed < delay)) {
        if (stryMutAct_9fa48("1774")) {
          {}
        } else {
          stryCov_9fa48("1774");
          const err = new Error('RATE_LIMITED') as Error & {
            retryAfterMs: number;
          };
          err.retryAfterMs = stryMutAct_9fa48("1775") ? delay + elapsed : (stryCov_9fa48("1775"), delay - elapsed);
          throw err;
        }
      }
    }
  }
  public registerAuthSuccess(scope: 'unlock' | 'reauth', dbName: string): void {
    if (stryMutAct_9fa48("1776")) {
      {}
    } else {
      stryCov_9fa48("1776");
      const key = stryMutAct_9fa48("1777") ? `` : (stryCov_9fa48("1777"), `${scope}:${dbName}`);
      this._authFailureLog.delete(key);
    }
  }
  public resolveArgon2Params(): NonNullable<StoredCredential['argon2']> {
    if (stryMutAct_9fa48("1778")) {
      {}
    } else {
      stryCov_9fa48("1778");
      return VaultAuthService.calibrateArgon2Params();
    }
  }

  // ─── Orkestrasyon Yardımcıları ───
  private async withMutationLock<T>(fn: () => Promise<T>): Promise<T> {
    if (stryMutAct_9fa48("1779")) {
      {}
    } else {
      stryCov_9fa48("1779");
      const unlock = this.mutationLock;
      let resolveLock: () => void;
      this.mutationLock = new Promise(resolve => {
        if (stryMutAct_9fa48("1780")) {
          {}
        } else {
          stryCov_9fa48("1780");
          resolveLock = resolve;
        }
      });
      await unlock;
      try {
        if (stryMutAct_9fa48("1781")) {
          {}
        } else {
          stryCov_9fa48("1781");
          return await fn();
        }
      } finally {
        if (stryMutAct_9fa48("1782")) {
          {}
        } else {
          stryCov_9fa48("1782");
          resolveLock!();
        }
      }
    }
  }

  // ─── Bootstrap & Auth ───
  async initDb(password: string, secretKey: string, dbName: string = stryMutAct_9fa48("1783") ? "" : (stryCov_9fa48("1783"), 'aegis_opfs_vault'), isSetupAction: boolean = stryMutAct_9fa48("1784") ? true : (stryCov_9fa48("1784"), false)): Promise<void> {
    if (stryMutAct_9fa48("1785")) {
      {}
    } else {
      stryCov_9fa48("1785");
      const result = await VaultBootstrapService.initDb(stryMutAct_9fa48("1786") ? {} : (stryCov_9fa48("1786"), {
        password,
        secretKey,
        dbName,
        isSetupAction,
        deriveMasterKey: stryMutAct_9fa48("1787") ? () => undefined : (stryCov_9fa48("1787"), (pw, sk, salt) => this.deriveMasterKey(pw, sk, salt)),
        verifyPassword: stryMutAct_9fa48("1788") ? () => undefined : (stryCov_9fa48("1788"), (pw, stored) => VaultAuthService.verifyPassword(pw, stored, VaultAuthService.calibrateArgon2Params())),
        migrateAuthCredentialToArgon2: stryMutAct_9fa48("1789") ? () => undefined : (stryCov_9fa48("1789"), (pw, old) => VaultAuthService.migrateCredentialToArgon2(pw, old, VaultAuthService.calibrateArgon2Params())),
        createAuthCredential: stryMutAct_9fa48("1790") ? () => undefined : (stryCov_9fa48("1790"), pw => VaultAuthService.createAuthCredential(pw, VaultAuthService.calibrateArgon2Params())),
        getAesKey: stryMutAct_9fa48("1791") ? () => undefined : (stryCov_9fa48("1791"), () => this.aesKey),
        setAesKey: k => {
          if (stryMutAct_9fa48("1792")) {
            {}
          } else {
            stryCov_9fa48("1792");
            this.aesKey = k;
          }
        },
        setDecryptedEntriesCache: e => {
          if (stryMutAct_9fa48("1793")) {
            {}
          } else {
            stryCov_9fa48("1793");
            this.decryptedEntriesCache = e;
          }
        }
      }));

      // Anahtar derivedMasterKey callback'i tarafindan set edildi, ama garanti olsun diye return'den de alak
      if (stryMutAct_9fa48("1796") ? result.aesKey || !this.aesKey : stryMutAct_9fa48("1795") ? false : stryMutAct_9fa48("1794") ? true : (stryCov_9fa48("1794", "1795", "1796"), result.aesKey && (stryMutAct_9fa48("1797") ? this.aesKey : (stryCov_9fa48("1797"), !this.aesKey)))) {
        if (stryMutAct_9fa48("1798")) {
          {}
        } else {
          stryCov_9fa48("1798");
          this.aesKey = result.aesKey;
        }
      }
      this.opfsMockDb = result.opfsMockDb;
      this.sqliteDb = result.sqliteDb;
      this.useSQLite = result.useSQLite;
      this.isConnected = stryMutAct_9fa48("1799") ? false : (stryCov_9fa48("1799"), true);
      this.decryptedEntriesCache = null;
      if (stryMutAct_9fa48("1802") ? false : stryMutAct_9fa48("1801") ? true : stryMutAct_9fa48("1800") ? this.activeVaultDbNames.includes(dbName) : (stryCov_9fa48("1800", "1801", "1802"), !this.activeVaultDbNames.includes(dbName))) {
        if (stryMutAct_9fa48("1803")) {
          {}
        } else {
          stryCov_9fa48("1803");
          this.activeVaultDbNames.push(dbName);
        }
      }
      this.aesKey = result.aesKey;
      this.sensitiveMaterial = result.sensitiveMaterial;
      console.log(stryMutAct_9fa48("1804") ? "" : (stryCov_9fa48("1804"), '[VaultService] initDb SUCCESS:'), stryMutAct_9fa48("1805") ? {} : (stryCov_9fa48("1805"), {
        hasKey: stryMutAct_9fa48("1806") ? !this.aesKey : (stryCov_9fa48("1806"), !(stryMutAct_9fa48("1807") ? this.aesKey : (stryCov_9fa48("1807"), !this.aesKey)))
      }));
    }
  }
  async deriveMasterKey(password: string, secretKey: string, saltB64?: string): Promise<{
    saltB64: string;
    aesKey: CryptoKey;
    sensitiveMaterial: Uint8Array;
  }> {
    if (stryMutAct_9fa48("1808")) {
      {}
    } else {
      stryCov_9fa48("1808");
      const result = await VaultAuthService.deriveMasterKey(stryMutAct_9fa48("1809") ? {} : (stryCov_9fa48("1809"), {
        password,
        secretKey,
        saltB64,
        params: VaultAuthService.calibrateArgon2Params()
      }));
      this.aesKey = result.aesKey;
      this.sensitiveMaterial = result.sensitiveMaterial;
      await Promise.resolve();
      return result;
    }
  }
  async wipeAllData(): Promise<void> {
    if (stryMutAct_9fa48("1810")) {
      {}
    } else {
      stryCov_9fa48("1810");
      await VaultBootstrapService.wipeAllData(this.opfsMockDb, this.sqliteDb);
      localStorage.removeItem(stryMutAct_9fa48("1811") ? "" : (stryCov_9fa48("1811"), 'aegis_active_vault'));
      localStorage.removeItem(stryMutAct_9fa48("1812") ? "" : (stryCov_9fa48("1812"), 'aegis_vault_remember_me'));
      await this.lock();
    }
  }
  async exportVault(): Promise<string> {
    if (stryMutAct_9fa48("1813")) {
      {}
    } else {
      stryCov_9fa48("1813");
      const entries = await this.getPasswords();
      return JSON.stringify(entries);
    }
  }

  // ─── Entry CRUD ───
  async addPassword(entry: Partial<VaultEntry>): Promise<number> {
    if (stryMutAct_9fa48("1814")) {
      {}
    } else {
      stryCov_9fa48("1814");
      return this.withMutationLock(async () => {
        if (stryMutAct_9fa48("1815")) {
          {}
        } else {
          stryCov_9fa48("1815");
          if (stryMutAct_9fa48("1818") ? false : stryMutAct_9fa48("1817") ? true : stryMutAct_9fa48("1816") ? this.aesKey : (stryCov_9fa48("1816", "1817", "1818"), !this.aesKey)) {
            if (stryMutAct_9fa48("1819")) {
              {}
            } else {
              stryCov_9fa48("1819");
              console.error(stryMutAct_9fa48("1820") ? "" : (stryCov_9fa48("1820"), '[VaultService] Blocking addPassword: NO KEY AVAILABLE'));
              throw new AegisError(stryMutAct_9fa48("1821") ? "" : (stryCov_9fa48("1821"), 'AUTH_VAULT_LOCKED'), stryMutAct_9fa48("1822") ? "" : (stryCov_9fa48("1822"), 'Vault encryption key not initialized'), stryMutAct_9fa48("1823") ? {} : (stryCov_9fa48("1823"), {
                severity: stryMutAct_9fa48("1824") ? "" : (stryCov_9fa48("1824"), 'high'),
                context: stryMutAct_9fa48("1825") ? {} : (stryCov_9fa48("1825"), {
                  source: stryMutAct_9fa48("1826") ? "" : (stryCov_9fa48("1826"), 'VaultService'),
                  operation: stryMutAct_9fa48("1827") ? "" : (stryCov_9fa48("1827"), 'addPassword')
                })
              }));
            }
          }
          const id = await VaultEntryService.addPassword(stryMutAct_9fa48("1828") ? {} : (stryCov_9fa48("1828"), {
            entry,
            aesKey: this.aesKey,
            opfsMockDb: this.opfsMockDb,
            sqliteDb: this.sqliteDb,
            useSQLite: this.useSQLite,
            generateEntryId: stryMutAct_9fa48("1829") ? () => undefined : (stryCov_9fa48("1829"), () => Math.floor(stryMutAct_9fa48("1830") ? Math.random() / 1000000000 : (stryCov_9fa48("1830"), Math.random() * 1000000000))),
            calculateStrength: stryMutAct_9fa48("1831") ? () => undefined : (stryCov_9fa48("1831"), password => VaultCryptoService.calculateStrength(password)),
            buildMetadataAtRest: stryMutAct_9fa48("1832") ? () => undefined : (stryCov_9fa48("1832"), (title, username, website, category, tags) => this.buildMetadataAtRest(title, username, website, category, tags)),
            normalizeCardDetails: stryMutAct_9fa48("1833") ? () => undefined : (stryCov_9fa48("1833"), details => VaultCryptoService.normalizeCardDetails(details)),
            normalizeIdentityDetails: stryMutAct_9fa48("1834") ? () => undefined : (stryCov_9fa48("1834"), details => VaultCryptoService.normalizeIdentityDetails(details)),
            encryptAttachmentMetadataList: stryMutAct_9fa48("1835") ? () => undefined : (stryCov_9fa48("1835"), attachments => this.encryptAttachmentMetadataList(attachments))
          }));
          this.decryptedEntriesCache = null;
          return id;
        }
      });
    }
  }
  async updatePassword(id: number, entry: Partial<VaultEntry>): Promise<number> {
    if (stryMutAct_9fa48("1836")) {
      {}
    } else {
      stryCov_9fa48("1836");
      return this.addPassword(stryMutAct_9fa48("1837") ? {} : (stryCov_9fa48("1837"), {
        ...entry,
        id
      }));
    }
  }
  async getPasswords(searchQuery: string = stryMutAct_9fa48("1838") ? "Stryker was here!" : (stryCov_9fa48("1838"), ''), categoryFilter: string = stryMutAct_9fa48("1839") ? "Stryker was here!" : (stryCov_9fa48("1839"), ''), isTrash: boolean = stryMutAct_9fa48("1840") ? true : (stryCov_9fa48("1840"), false), searchScope: 'all' | 'title' | 'username' | 'tags' = stryMutAct_9fa48("1841") ? "" : (stryCov_9fa48("1841"), 'all')): Promise<VaultEntry[]> {
    if (stryMutAct_9fa48("1842")) {
      {}
    } else {
      stryCov_9fa48("1842");
      const result = await VaultEntryService.getPasswords(stryMutAct_9fa48("1843") ? {} : (stryCov_9fa48("1843"), {
        searchQuery,
        categoryFilter,
        isTrash,
        searchScope,
        aesKey: this.aesKey,
        opfsMockDb: this.opfsMockDb,
        sqliteDb: this.sqliteDb,
        useSQLite: this.useSQLite,
        decryptedEntriesCache: this.decryptedEntriesCache,
        prepareEntryMetadataForUse: stryMutAct_9fa48("1844") ? () => undefined : (stryCov_9fa48("1844"), entry => this.prepareEntryMetadataForUse(entry)),
        hydrateRichSensitiveFields: stryMutAct_9fa48("1845") ? () => undefined : (stryCov_9fa48("1845"), entries => this.hydrateRichSensitiveFields(entries))
      }));
      this.decryptedEntriesCache = result.cache;
      return result.entries;
    }
  }
  async bulkAddPasswords(entries: Partial<VaultEntry>[]): Promise<{
    total: number;
    weak: number;
    missingFields: number;
    weakIds: number[];
  }> {
    if (stryMutAct_9fa48("1846")) {
      {}
    } else {
      stryCov_9fa48("1846");
      return this.withMutationLock(async () => {
        if (stryMutAct_9fa48("1847")) {
          {}
        } else {
          stryCov_9fa48("1847");
          const result = await VaultEntryService.bulkAddPasswords(stryMutAct_9fa48("1848") ? {} : (stryCov_9fa48("1848"), {
            entries,
            aesKey: this.aesKey,
            opfsMockDb: this.opfsMockDb,
            sqliteDb: this.sqliteDb,
            useSQLite: this.useSQLite,
            generateEntryId: stryMutAct_9fa48("1849") ? () => undefined : (stryCov_9fa48("1849"), () => Math.floor(stryMutAct_9fa48("1850") ? Math.random() / 1000000000 : (stryCov_9fa48("1850"), Math.random() * 1000000000))),
            calculateStrength: stryMutAct_9fa48("1851") ? () => undefined : (stryCov_9fa48("1851"), password => VaultCryptoService.calculateStrength(password)),
            buildMetadataAtRest: stryMutAct_9fa48("1852") ? () => undefined : (stryCov_9fa48("1852"), (title, username, website, category, tags) => this.buildMetadataAtRest(title, username, website, category, tags))
          }));
          this.decryptedEntriesCache = null;
          return result;
        }
      });
    }
  }
  async changeMasterPassword(oldPassword: string, newPassword: string, secretKey: string): Promise<void> {
    if (stryMutAct_9fa48("1853")) {
      {}
    } else {
      stryCov_9fa48("1853");
      return this.withMutationLock(async () => {
        if (stryMutAct_9fa48("1854")) {
          {}
        } else {
          stryCov_9fa48("1854");
          await VaultEntryService.changeMasterPassword(stryMutAct_9fa48("1855") ? {} : (stryCov_9fa48("1855"), {
            oldPassword,
            newPassword,
            secretKey,
            opfsMockDb: this.opfsMockDb,
            sqliteDb: this.sqliteDb,
            useSQLite: this.useSQLite,
            aesKey: this.aesKey,
            verifyPassword: stryMutAct_9fa48("1856") ? () => undefined : (stryCov_9fa48("1856"), (password, stored) => VaultAuthService.verifyPassword(password, stored, VaultAuthService.calibrateArgon2Params())),
            getPasswords: stryMutAct_9fa48("1857") ? () => undefined : (stryCov_9fa48("1857"), () => this.getPasswords()),
            deriveMasterKey: stryMutAct_9fa48("1858") ? () => undefined : (stryCov_9fa48("1858"), async (password, key, salt) => (await this.deriveMasterKey(password, key, salt)).saltB64),
            createAuthCredential: stryMutAct_9fa48("1859") ? () => undefined : (stryCov_9fa48("1859"), password => VaultAuthService.createAuthCredential(password, VaultAuthService.calibrateArgon2Params())),
            buildMetadataAtRest: stryMutAct_9fa48("1860") ? () => undefined : (stryCov_9fa48("1860"), (t, u, w, c, tg) => this.buildMetadataAtRest(t, u, w, c, tg)),
            encryptAttachmentMetadataList: stryMutAct_9fa48("1861") ? () => undefined : (stryCov_9fa48("1861"), a => this.encryptAttachmentMetadataList(a)),
            getAesKey: stryMutAct_9fa48("1862") ? () => undefined : (stryCov_9fa48("1862"), () => this.aesKey)
          }));
          this.decryptedEntriesCache = null;
        }
      });
    }
  }
  async addAttachment(entryId: number, file: File): Promise<{
    id: string;
    name: string;
    type: string;
    size: number;
  }> {
    if (stryMutAct_9fa48("1863")) {
      {}
    } else {
      stryCov_9fa48("1863");
      return this.withMutationLock(async () => {
        if (stryMutAct_9fa48("1864")) {
          {}
        } else {
          stryCov_9fa48("1864");
          return VaultAttachmentService.addAttachment(stryMutAct_9fa48("1865") ? {} : (stryCov_9fa48("1865"), {
            aesKey: this.aesKey,
            opfsMockDb: this.opfsMockDb,
            sqliteDb: this.sqliteDb,
            useSQLite: this.useSQLite,
            entryId,
            file,
            encryptAttachmentMetadataList: stryMutAct_9fa48("1866") ? () => undefined : (stryCov_9fa48("1866"), attachments => this.encryptAttachmentMetadataList(attachments))
          }));
        }
      });
    }
  }
  async getDecryptedAttachment(attachmentId: string): Promise<Blob> {
    if (stryMutAct_9fa48("1867")) {
      {}
    } else {
      stryCov_9fa48("1867");
      return VaultAttachmentService.getDecryptedAttachment(stryMutAct_9fa48("1868") ? {} : (stryCov_9fa48("1868"), {
        aesKey: this.aesKey,
        opfsMockDb: this.opfsMockDb,
        sqliteDb: this.sqliteDb,
        useSQLite: this.useSQLite,
        attachmentId
      }));
    }
  }
  async deleteAttachment(entryId: number, attachmentId: string): Promise<void> {
    if (stryMutAct_9fa48("1869")) {
      {}
    } else {
      stryCov_9fa48("1869");
      return this.withMutationLock(async () => {
        if (stryMutAct_9fa48("1870")) {
          {}
        } else {
          stryCov_9fa48("1870");
          await VaultAttachmentService.deleteAttachment(stryMutAct_9fa48("1871") ? {} : (stryCov_9fa48("1871"), {
            opfsMockDb: this.opfsMockDb,
            sqliteDb: this.sqliteDb,
            useSQLite: this.useSQLite,
            entryId,
            attachmentId
          }));
          this.decryptedEntriesCache = null;
        }
      });
    }
  }
  async moveToTrash(entryId: number): Promise<void> {
    if (stryMutAct_9fa48("1872")) {
      {}
    } else {
      stryCov_9fa48("1872");
      return this.withMutationLock(async () => {
        if (stryMutAct_9fa48("1873")) {
          {}
        } else {
          stryCov_9fa48("1873");
          await VaultTrashService.moveToTrash(stryMutAct_9fa48("1874") ? {} : (stryCov_9fa48("1874"), {
            opfsMockDb: this.opfsMockDb,
            sqliteDb: this.sqliteDb,
            useSQLite: this.useSQLite,
            entryId,
            invalidateCache: () => {
              if (stryMutAct_9fa48("1875")) {
                {}
              } else {
                stryCov_9fa48("1875");
                this.decryptedEntriesCache = null;
              }
            }
          }));
        }
      });
    }
  }
  async restoreFromTrash(entryId: number): Promise<void> {
    if (stryMutAct_9fa48("1876")) {
      {}
    } else {
      stryCov_9fa48("1876");
      return this.withMutationLock(async () => {
        if (stryMutAct_9fa48("1877")) {
          {}
        } else {
          stryCov_9fa48("1877");
          await VaultTrashService.restoreFromTrash(stryMutAct_9fa48("1878") ? {} : (stryCov_9fa48("1878"), {
            opfsMockDb: this.opfsMockDb,
            sqliteDb: this.sqliteDb,
            useSQLite: this.useSQLite,
            entryId,
            invalidateCache: () => {
              if (stryMutAct_9fa48("1879")) {
                {}
              } else {
                stryCov_9fa48("1879");
                this.decryptedEntriesCache = null;
              }
            }
          }));
        }
      });
    }
  }
  async deletePermanently(entryId: number): Promise<void> {
    if (stryMutAct_9fa48("1880")) {
      {}
    } else {
      stryCov_9fa48("1880");
      return this.withMutationLock(async () => {
        if (stryMutAct_9fa48("1881")) {
          {}
        } else {
          stryCov_9fa48("1881");
          await VaultTrashService.deletePermanently(stryMutAct_9fa48("1882") ? {} : (stryCov_9fa48("1882"), {
            opfsMockDb: this.opfsMockDb,
            sqliteDb: this.sqliteDb,
            useSQLite: this.useSQLite,
            entryId,
            invalidateCache: () => {
              if (stryMutAct_9fa48("1883")) {
                {}
              } else {
                stryCov_9fa48("1883");
                this.decryptedEntriesCache = null;
              }
            }
          }));
        }
      });
    }
  }
  async emptyTrash(): Promise<void> {
    if (stryMutAct_9fa48("1884")) {
      {}
    } else {
      stryCov_9fa48("1884");
      return this.withMutationLock(async () => {
        if (stryMutAct_9fa48("1885")) {
          {}
        } else {
          stryCov_9fa48("1885");
          await VaultTrashService.emptyTrash(stryMutAct_9fa48("1886") ? {} : (stryCov_9fa48("1886"), {
            opfsMockDb: this.opfsMockDb,
            sqliteDb: this.sqliteDb,
            useSQLite: this.useSQLite
          }));
          this.decryptedEntriesCache = null;
        }
      });
    }
  }
  async cleanupTrash(): Promise<void> {
    if (stryMutAct_9fa48("1887")) {
      {}
    } else {
      stryCov_9fa48("1887");
      await VaultTrashService.cleanupTrash(stryMutAct_9fa48("1888") ? {} : (stryCov_9fa48("1888"), {
        opfsMockDb: this.opfsMockDb,
        deletePermanently: stryMutAct_9fa48("1889") ? () => undefined : (stryCov_9fa48("1889"), id => this.deletePermanently(id))
      }));
    }
  }
  async saveSecurityPins(duressPin: string, killPin: string): Promise<void> {
    if (stryMutAct_9fa48("1890")) {
      {}
    } else {
      stryCov_9fa48("1890");
      await VaultPinService.saveSecurityPins(stryMutAct_9fa48("1891") ? {} : (stryCov_9fa48("1891"), {
        aesKey: this.aesKey,
        opfsMockDb: this.opfsMockDb,
        sqliteDb: this.sqliteDb,
        useSQLite: this.useSQLite,
        duressPin,
        killPin,
        randomBytes: stryMutAct_9fa48("1892") ? () => undefined : (stryCov_9fa48("1892"), (len: number) => window.crypto.getRandomValues(new Uint8Array(len)))
      }));
    }
  }
  async getSecurityPins(): Promise<{
    duressPin: string;
    killPin: string;
  }> {
    if (stryMutAct_9fa48("1893")) {
      {}
    } else {
      stryCov_9fa48("1893");
      return VaultPinService.getSecurityPins(stryMutAct_9fa48("1894") ? {} : (stryCov_9fa48("1894"), {
        aesKey: this.aesKey,
        opfsMockDb: this.opfsMockDb,
        sqliteDb: this.sqliteDb,
        useSQLite: this.useSQLite
      }));
    }
  }
  async getSearchIndexHmacKey(): Promise<CryptoKey> {
    if (stryMutAct_9fa48("1895")) {
      {}
    } else {
      stryCov_9fa48("1895");
      if (stryMutAct_9fa48("1897") ? false : stryMutAct_9fa48("1896") ? true : (stryCov_9fa48("1896", "1897"), this.searchIndexHmacKey)) return this.searchIndexHmacKey;
      if (stryMutAct_9fa48("1900") ? !this.sensitiveMaterial || !this.aesKey : stryMutAct_9fa48("1899") ? false : stryMutAct_9fa48("1898") ? true : (stryCov_9fa48("1898", "1899", "1900"), (stryMutAct_9fa48("1901") ? this.sensitiveMaterial : (stryCov_9fa48("1901"), !this.sensitiveMaterial)) && (stryMutAct_9fa48("1902") ? this.aesKey : (stryCov_9fa48("1902"), !this.aesKey)))) throw new Error(stryMutAct_9fa48("1903") ? "" : (stryCov_9fa48("1903"), 'Lock required for HMAC key derivation'));
      const key = await VaultSearchIndexer.getOrCreateHmacKey(this.sensitiveMaterial, null);
      this.searchIndexHmacKey = key;
      return key;
    }
  }
  async lock(): Promise<void> {
    if (stryMutAct_9fa48("1904")) {
      {}
    } else {
      stryCov_9fa48("1904");
      if (stryMutAct_9fa48("1906") ? false : stryMutAct_9fa48("1905") ? true : (stryCov_9fa48("1905", "1906"), this.sensitiveMaterial)) {
        if (stryMutAct_9fa48("1907")) {
          {}
        } else {
          stryCov_9fa48("1907");
          window.crypto.getRandomValues(this.sensitiveMaterial);
          this.sensitiveMaterial = null;
        }
      }
      this.aesKey = null;
      this.searchIndexHmacKey = null;
      if (stryMutAct_9fa48("1909") ? false : stryMutAct_9fa48("1908") ? true : (stryCov_9fa48("1908", "1909"), this.sqliteDb)) {
        if (stryMutAct_9fa48("1910")) {
          {}
        } else {
          stryCov_9fa48("1910");
          this.sqliteDb.close();
          this.sqliteDb = null;
        }
      }
      if (stryMutAct_9fa48("1912") ? false : stryMutAct_9fa48("1911") ? true : (stryCov_9fa48("1911", "1912"), this.opfsMockDb)) {
        if (stryMutAct_9fa48("1913")) {
          {}
        } else {
          stryCov_9fa48("1913");
          this.opfsMockDb.close();
          this.opfsMockDb = null;
        }
      }
      this.useSQLite = stryMutAct_9fa48("1914") ? true : (stryCov_9fa48("1914"), false);
      this.decryptedEntriesCache = null;
      this.isConnected = stryMutAct_9fa48("1915") ? true : (stryCov_9fa48("1915"), false);
      this.activeVaultDbNames = stryMutAct_9fa48("1916") ? ["Stryker was here"] : (stryCov_9fa48("1916"), []);
      console.log(stryMutAct_9fa48("1917") ? "" : (stryCov_9fa48("1917"), '[SQLite-OPFS] Vault locked.'));
    }
  }
}
export const vaultService = new VaultService();
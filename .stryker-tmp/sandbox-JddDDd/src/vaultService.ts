// @ts-nocheck
function stryNS_9fa48() {
  const g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  const ns = g.__stryker__ || (g.__stryker__ = {});
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
  const ns = stryNS_9fa48();
  const cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    let c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    const a = arguments;
    for (let i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  const ns = stryNS_9fa48();
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
import { openDB, type IDBPDatabase } from "idb";
import { argon2id } from 'hash-wasm';
import { SQLiteOPFS, isOPFSAvailable, clearAllOPFSFiles } from './lib/SQLiteOPFS';
import type { CanonicalSharingAssignment } from './lib/canonical-schema';
import { toBufferSource, bufferToHex, hexToBuffer, isLikelyHex as isLikelyHexUtil, generateRandomBytes } from './lib/crypto-types';
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
  totp_secret?: string; // AES-GCM encrypted Base32 secret
  totp_iv?: string; // IV for TOTP encryption
  totp_issuer?: string; // Issuer label (stored plain — not sensitive)
  totp_algorithm?: 'SHA-1' | 'SHA-256' | 'SHA-512';
  totp_digits?: number; // 6 or 8
  totp_period?: number; // Usually 30

  // Secure Notes — encrypted at rest
  encrypted_notes?: string; // AES-GCM encrypted notes content
  notes_iv?: string; // IV for notes encryption
  encrypted_passkey_meta?: string; // AES-GCM encrypted site passkey metadata JSON
  passkey_meta_iv?: string; // IV for passkey metadata encryption

  // Decrypted fields for UI (never persisted)
  pass?: string;
  totpSecret?: string; // Decrypted TOTP secret (only in memory)
  notes?: string; // Decrypted notes content (only in memory)
  passkeyMetadata?: CanonicalPasskeyFields | null; // Decrypted passkey metadata for site-passkey MVP
  sharing?: CanonicalSharingAssignment[]; // Canonical sharing metadata for UI/export helpers
  ui_focus_context?: 'sharing_issue' | 'sharing_audit'; // Transient UI hint for edit flows
  ui_focus_label?: string; // Transient UI label shown in edit flows
}
export class VaultService {
  private opfsMockDb: IDBPDatabase | null = null;
  private sqliteDb: SQLiteOPFS | null = null;
  private useSQLite: boolean = stryMutAct_9fa48("0") ? true : (stryCov_9fa48("0"), false);
  private aesKey: CryptoKey | null = null;
  private sensitiveMaterial: Uint8Array | null = null;
  private isConnected: boolean = stryMutAct_9fa48("1") ? true : (stryCov_9fa48("1"), false);
  private activeDbName: string = stryMutAct_9fa48("2") ? "" : (stryCov_9fa48("2"), 'aegis_opfs_vault');
  private decryptedEntriesCache: VaultEntry[] | null = null;
  private searchIndexHmacKey: CryptoKey | null = null;
  private readonly authArgon2Params = stryMutAct_9fa48("3") ? {} : (stryCov_9fa48("3"), {
    iterations: 3,
    memorySize: 65536,
    parallelism: 1,
    hashLength: 32
  });
  private get encryptionProfile(): EncryptionProfile {
    if (stryMutAct_9fa48("4")) {
      {}
    } else {
      stryCov_9fa48("4");
      try {
        if (stryMutAct_9fa48("5")) {
          {}
        } else {
          stryCov_9fa48("5");
          return SecureAppSettings.getEncryptionProfile();
        }
      } catch {/* ignore */}
      return stryMutAct_9fa48("6") ? "" : (stryCov_9fa48("6"), 'balanced'); // Varsayılan
    }
  }

  /** Aktif vault DB adını değiştir (çoklu vault desteği) */
  setVaultDbName(dbName: string): void {
    if (stryMutAct_9fa48("7")) {
      {}
    } else {
      stryCov_9fa48("7");
      this.activeDbName = dbName;
    }
  }

  /** Aktif vault DB adını al */
  getVaultDbName(): string {
    if (stryMutAct_9fa48("8")) {
      {}
    } else {
      stryCov_9fa48("8");
      return this.activeDbName;
    }
  }

  /**
   * Calculates true password strength based on character set entropy.
   * Returns 0-100 normalized score where 128-bit entropy = 100.
   */
  private calculateStrength(password: string): number {
    if (stryMutAct_9fa48("9")) {
      {}
    } else {
      stryCov_9fa48("9");
      if (stryMutAct_9fa48("12") ? !password && password.length === 0 : stryMutAct_9fa48("11") ? false : stryMutAct_9fa48("10") ? true : (stryCov_9fa48("10", "11", "12"), (stryMutAct_9fa48("13") ? password : (stryCov_9fa48("13"), !password)) || (stryMutAct_9fa48("15") ? password.length !== 0 : stryMutAct_9fa48("14") ? false : (stryCov_9fa48("14", "15"), password.length === 0)))) return 0;
      let pool = 0;
      if (stryMutAct_9fa48("17") ? false : stryMutAct_9fa48("16") ? true : (stryCov_9fa48("16", "17"), (stryMutAct_9fa48("18") ? /[^a-z]/ : (stryCov_9fa48("18"), /[a-z]/)).test(password))) stryMutAct_9fa48("19") ? pool -= 26 : (stryCov_9fa48("19"), pool += 26);
      if (stryMutAct_9fa48("21") ? false : stryMutAct_9fa48("20") ? true : (stryCov_9fa48("20", "21"), (stryMutAct_9fa48("22") ? /[^A-Z]/ : (stryCov_9fa48("22"), /[A-Z]/)).test(password))) stryMutAct_9fa48("23") ? pool -= 26 : (stryCov_9fa48("23"), pool += 26);
      if (stryMutAct_9fa48("25") ? false : stryMutAct_9fa48("24") ? true : (stryCov_9fa48("24", "25"), (stryMutAct_9fa48("26") ? /[^0-9]/ : (stryCov_9fa48("26"), /[0-9]/)).test(password))) stryMutAct_9fa48("27") ? pool -= 10 : (stryCov_9fa48("27"), pool += 10);
      if (stryMutAct_9fa48("29") ? false : stryMutAct_9fa48("28") ? true : (stryCov_9fa48("28", "29"), (stryMutAct_9fa48("30") ? /[a-zA-Z0-9]/ : (stryCov_9fa48("30"), /[^a-zA-Z0-9]/)).test(password))) stryMutAct_9fa48("31") ? pool -= 33 : (stryCov_9fa48("31"), pool += 33);
      if (stryMutAct_9fa48("34") ? pool !== 0 : stryMutAct_9fa48("33") ? false : stryMutAct_9fa48("32") ? true : (stryCov_9fa48("32", "33", "34"), pool === 0)) pool = 1;
      const entropy = stryMutAct_9fa48("35") ? password.length / Math.log2(pool) : (stryCov_9fa48("35"), password.length * Math.log2(pool));
      return stryMutAct_9fa48("36") ? Math.max(100, Math.round(entropy / 128 * 100)) : (stryCov_9fa48("36"), Math.min(100, Math.round(stryMutAct_9fa48("37") ? entropy / 128 / 100 : (stryCov_9fa48("37"), (stryMutAct_9fa48("38") ? entropy * 128 : (stryCov_9fa48("38"), entropy / 128)) * 100))));
    }
  }
  private normalizeSearchValue(value: string = stryMutAct_9fa48("39") ? "Stryker was here!" : (stryCov_9fa48("39"), "")): string {
    if (stryMutAct_9fa48("40")) {
      {}
    } else {
      stryCov_9fa48("40");
      return stryMutAct_9fa48("42") ? value.toUpperCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, " ").trim() : stryMutAct_9fa48("41") ? value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, " ") : (stryCov_9fa48("41", "42"), value.toLowerCase().normalize(stryMutAct_9fa48("43") ? "" : (stryCov_9fa48("43"), "NFKD")).replace(stryMutAct_9fa48("44") ? /[^\u0300-\u036f]/g : (stryCov_9fa48("44"), /[\u0300-\u036f]/g), stryMutAct_9fa48("45") ? "Stryker was here!" : (stryCov_9fa48("45"), "")).replace(stryMutAct_9fa48("46") ? /[a-z0-9]/g : (stryCov_9fa48("46"), /[^a-z0-9]/g), stryMutAct_9fa48("47") ? "" : (stryCov_9fa48("47"), " ")).trim());
    }
  }
  private tokenizeSearchFields(fields: string[]): string[] {
    if (stryMutAct_9fa48("48")) {
      {}
    } else {
      stryCov_9fa48("48");
      const tokenSet = new Set<string>();
      for (const rawField of fields) {
        if (stryMutAct_9fa48("49")) {
          {}
        } else {
          stryCov_9fa48("49");
          const normalized = this.normalizeSearchValue(stryMutAct_9fa48("52") ? rawField && "" : stryMutAct_9fa48("51") ? false : stryMutAct_9fa48("50") ? true : (stryCov_9fa48("50", "51", "52"), rawField || (stryMutAct_9fa48("53") ? "Stryker was here!" : (stryCov_9fa48("53"), ""))));
          if (stryMutAct_9fa48("56") ? false : stryMutAct_9fa48("55") ? true : stryMutAct_9fa48("54") ? normalized : (stryCov_9fa48("54", "55", "56"), !normalized)) continue;
          const parts = stryMutAct_9fa48("57") ? normalized.split(/\s+/) : (stryCov_9fa48("57"), normalized.split(stryMutAct_9fa48("59") ? /\S+/ : stryMutAct_9fa48("58") ? /\s/ : (stryCov_9fa48("58", "59"), /\s+/)).filter(Boolean));
          for (const token of parts) {
            if (stryMutAct_9fa48("60")) {
              {}
            } else {
              stryCov_9fa48("60");
              tokenSet.add(token);
              const maxPrefix = stryMutAct_9fa48("61") ? Math.max(8, token.length) : (stryCov_9fa48("61"), Math.min(8, token.length));
              for (let i = 2; stryMutAct_9fa48("64") ? i > maxPrefix : stryMutAct_9fa48("63") ? i < maxPrefix : stryMutAct_9fa48("62") ? false : (stryCov_9fa48("62", "63", "64"), i <= maxPrefix); stryMutAct_9fa48("65") ? i-- : (stryCov_9fa48("65"), i++)) {
                if (stryMutAct_9fa48("66")) {
                  {}
                } else {
                  stryCov_9fa48("66");
                  tokenSet.add(stryMutAct_9fa48("67") ? token : (stryCov_9fa48("67"), token.slice(0, i)));
                }
              }
            }
          }
        }
      }
      return stryMutAct_9fa48("68") ? Array.from(tokenSet) : (stryCov_9fa48("68"), Array.from(tokenSet).slice(0, 256));
    }
  }
  private async getSearchIndexHmacKey(): Promise<CryptoKey> {
    if (stryMutAct_9fa48("69")) {
      {}
    } else {
      stryCov_9fa48("69");
      if (stryMutAct_9fa48("71") ? false : stryMutAct_9fa48("70") ? true : (stryCov_9fa48("70", "71"), this.searchIndexHmacKey)) return this.searchIndexHmacKey;
      if (stryMutAct_9fa48("74") ? false : stryMutAct_9fa48("73") ? true : stryMutAct_9fa48("72") ? this.sensitiveMaterial : (stryCov_9fa48("72", "73", "74"), !this.sensitiveMaterial)) throw new Error(stryMutAct_9fa48("75") ? "" : (stryCov_9fa48("75"), 'Search index key unavailable'));
      const rawKey = new Uint8Array(this.sensitiveMaterial);
      this.searchIndexHmacKey = await window.crypto.subtle.importKey(stryMutAct_9fa48("76") ? "" : (stryCov_9fa48("76"), 'raw'), toBufferSource(rawKey), stryMutAct_9fa48("77") ? {} : (stryCov_9fa48("77"), {
        name: stryMutAct_9fa48("78") ? "" : (stryCov_9fa48("78"), 'HMAC'),
        hash: stryMutAct_9fa48("79") ? "" : (stryCov_9fa48("79"), 'SHA-256')
      }), stryMutAct_9fa48("80") ? true : (stryCov_9fa48("80"), false), stryMutAct_9fa48("81") ? [] : (stryCov_9fa48("81"), [stryMutAct_9fa48("82") ? "" : (stryCov_9fa48("82"), 'sign')]));
      return this.searchIndexHmacKey;
    }
  }
  private async hashSearchToken(token: string): Promise<string> {
    if (stryMutAct_9fa48("83")) {
      {}
    } else {
      stryCov_9fa48("83");
      const key = await this.getSearchIndexHmacKey();
      const signature = await window.crypto.subtle.sign(stryMutAct_9fa48("84") ? "" : (stryCov_9fa48("84"), 'HMAC'), key, toBufferSource(new TextEncoder().encode(token)));
      return bufferToHex(signature);
    }
  }
  private async buildSearchIndex(title: string, username: string, website: string, category: string, tags: string[]): Promise<string[]> {
    if (stryMutAct_9fa48("85")) {
      {}
    } else {
      stryCov_9fa48("85");
      const tokens = this.tokenizeSearchFields(stryMutAct_9fa48("86") ? [] : (stryCov_9fa48("86"), [stryMutAct_9fa48("89") ? title && '' : stryMutAct_9fa48("88") ? false : stryMutAct_9fa48("87") ? true : (stryCov_9fa48("87", "88", "89"), title || (stryMutAct_9fa48("90") ? "Stryker was here!" : (stryCov_9fa48("90"), ''))), stryMutAct_9fa48("93") ? username && '' : stryMutAct_9fa48("92") ? false : stryMutAct_9fa48("91") ? true : (stryCov_9fa48("91", "92", "93"), username || (stryMutAct_9fa48("94") ? "Stryker was here!" : (stryCov_9fa48("94"), ''))), stryMutAct_9fa48("97") ? website && '' : stryMutAct_9fa48("96") ? false : stryMutAct_9fa48("95") ? true : (stryCov_9fa48("95", "96", "97"), website || (stryMutAct_9fa48("98") ? "Stryker was here!" : (stryCov_9fa48("98"), ''))), stryMutAct_9fa48("101") ? category && '' : stryMutAct_9fa48("100") ? false : stryMutAct_9fa48("99") ? true : (stryCov_9fa48("99", "100", "101"), category || (stryMutAct_9fa48("102") ? "Stryker was here!" : (stryCov_9fa48("102"), ''))), ...(Array.isArray(tags) ? tags : stryMutAct_9fa48("103") ? ["Stryker was here"] : (stryCov_9fa48("103"), []))]));
      if (stryMutAct_9fa48("106") ? tokens.length !== 0 : stryMutAct_9fa48("105") ? false : stryMutAct_9fa48("104") ? true : (stryCov_9fa48("104", "105", "106"), tokens.length === 0)) return stryMutAct_9fa48("107") ? ["Stryker was here"] : (stryCov_9fa48("107"), []);
      return Promise.all(tokens.map(stryMutAct_9fa48("108") ? () => undefined : (stryCov_9fa48("108"), token => this.hashSearchToken(token))));
    }
  }
  private async encryptAttachmentMetadataList(attachments: VaultAttachmentMeta[]): Promise<VaultAttachmentMeta[]> {
    if (stryMutAct_9fa48("109")) {
      {}
    } else {
      stryCov_9fa48("109");
      const profile = this.encryptionProfile;
      if (stryMutAct_9fa48("112") ? false : stryMutAct_9fa48("111") ? true : stryMutAct_9fa48("110") ? isFieldEncrypted(profile, 'attachments') : (stryCov_9fa48("110", "111", "112"), !isFieldEncrypted(profile, stryMutAct_9fa48("113") ? "" : (stryCov_9fa48("113"), 'attachments')))) return attachments;
      return Promise.all(attachments.map(async item => {
        if (stryMutAct_9fa48("114")) {
          {}
        } else {
          stryCov_9fa48("114");
          const nameEnc = await this.encryptTextField(stryMutAct_9fa48("117") ? item.name && '' : stryMutAct_9fa48("116") ? false : stryMutAct_9fa48("115") ? true : (stryCov_9fa48("115", "116", "117"), item.name || (stryMutAct_9fa48("118") ? "Stryker was here!" : (stryCov_9fa48("118"), ''))));
          const typeEnc = await this.encryptTextField(stryMutAct_9fa48("121") ? item.type && '' : stryMutAct_9fa48("120") ? false : stryMutAct_9fa48("119") ? true : (stryCov_9fa48("119", "120", "121"), item.type || (stryMutAct_9fa48("122") ? "Stryker was here!" : (stryCov_9fa48("122"), ''))));
          return stryMutAct_9fa48("123") ? {} : (stryCov_9fa48("123"), {
            id: item.id,
            size: item.size,
            name: stryMutAct_9fa48("124") ? "Stryker was here!" : (stryCov_9fa48("124"), ''),
            type: stryMutAct_9fa48("125") ? "Stryker was here!" : (stryCov_9fa48("125"), ''),
            encrypted_name: nameEnc.encrypted,
            name_iv: nameEnc.iv,
            encrypted_type: typeEnc.encrypted,
            type_iv: typeEnc.iv
          });
        }
      }));
    }
  }
  private async decryptAttachmentMetadataList(attachments: VaultAttachmentMeta[]): Promise<VaultAttachmentMeta[]> {
    if (stryMutAct_9fa48("126")) {
      {}
    } else {
      stryCov_9fa48("126");
      return Promise.all(attachments.map(async item => {
        if (stryMutAct_9fa48("127")) {
          {}
        } else {
          stryCov_9fa48("127");
          // Eğer encrypted_name varsa her halükarda deşifre etmeye çalış (eski kayıt uyumluluğu)
          if (stryMutAct_9fa48("130") ? !item.encrypted_name || !item.encrypted_type : stryMutAct_9fa48("129") ? false : stryMutAct_9fa48("128") ? true : (stryCov_9fa48("128", "129", "130"), (stryMutAct_9fa48("131") ? item.encrypted_name : (stryCov_9fa48("131"), !item.encrypted_name)) && (stryMutAct_9fa48("132") ? item.encrypted_type : (stryCov_9fa48("132"), !item.encrypted_type)))) return item;
          const decName = await this.decryptTextField(item.encrypted_name, item.name_iv);
          const decType = await this.decryptTextField(item.encrypted_type, item.type_iv);
          return stryMutAct_9fa48("133") ? {} : (stryCov_9fa48("133"), {
            ...item,
            name: stryMutAct_9fa48("134") ? (decName ?? item.name) && '' : (stryCov_9fa48("134"), (stryMutAct_9fa48("135") ? decName && item.name : (stryCov_9fa48("135"), decName ?? item.name)) ?? (stryMutAct_9fa48("136") ? "Stryker was here!" : (stryCov_9fa48("136"), ''))),
            type: stryMutAct_9fa48("137") ? (decType ?? item.type) && '' : (stryCov_9fa48("137"), (stryMutAct_9fa48("138") ? decType && item.type : (stryCov_9fa48("138"), decType ?? item.type)) ?? (stryMutAct_9fa48("139") ? "Stryker was here!" : (stryCov_9fa48("139"), '')))
          });
        }
      }));
    }
  }
  private async encryptTextField(value: string): Promise<{
    encrypted: string;
    iv: string;
  }> {
    if (stryMutAct_9fa48("140")) {
      {}
    } else {
      stryCov_9fa48("140");
      if (stryMutAct_9fa48("143") ? false : stryMutAct_9fa48("142") ? true : stryMutAct_9fa48("141") ? this.aesKey : (stryCov_9fa48("141", "142", "143"), !this.aesKey)) throw new Error(stryMutAct_9fa48("144") ? "" : (stryCov_9fa48("144"), 'Vault key unavailable'));
      const iv = generateRandomBytes(12);
      const plainBytes = new TextEncoder().encode(stryMutAct_9fa48("147") ? value && '' : stryMutAct_9fa48("146") ? false : stryMutAct_9fa48("145") ? true : (stryCov_9fa48("145", "146", "147"), value || (stryMutAct_9fa48("148") ? "Stryker was here!" : (stryCov_9fa48("148"), ''))));
      const cipher = await window.crypto.subtle.encrypt(stryMutAct_9fa48("149") ? {} : (stryCov_9fa48("149"), {
        name: stryMutAct_9fa48("150") ? "" : (stryCov_9fa48("150"), 'AES-GCM'),
        iv: toBufferSource(iv)
      }), this.aesKey, toBufferSource(plainBytes));
      return stryMutAct_9fa48("151") ? {} : (stryCov_9fa48("151"), {
        encrypted: bufferToHex(cipher),
        iv: bufferToHex(iv)
      });
    }
  }
  private async decryptTextField(encrypted?: string, iv?: string): Promise<string | null> {
    if (stryMutAct_9fa48("152")) {
      {}
    } else {
      stryCov_9fa48("152");
      if (stryMutAct_9fa48("155") ? (!this.aesKey || !encrypted) && !iv : stryMutAct_9fa48("154") ? false : stryMutAct_9fa48("153") ? true : (stryCov_9fa48("153", "154", "155"), (stryMutAct_9fa48("157") ? !this.aesKey && !encrypted : stryMutAct_9fa48("156") ? false : (stryCov_9fa48("156", "157"), (stryMutAct_9fa48("158") ? this.aesKey : (stryCov_9fa48("158"), !this.aesKey)) || (stryMutAct_9fa48("159") ? encrypted : (stryCov_9fa48("159"), !encrypted)))) || (stryMutAct_9fa48("160") ? iv : (stryCov_9fa48("160"), !iv)))) {
        if (stryMutAct_9fa48("161")) {
          {}
        } else {
          stryCov_9fa48("161");
          return null;
        }
      }
      try {
        if (stryMutAct_9fa48("162")) {
          {}
        } else {
          stryCov_9fa48("162");
          const cipherArray = isLikelyHexUtil(encrypted) ? hexToBuffer(encrypted) : Uint8Array.from(atob(encrypted), stryMutAct_9fa48("163") ? () => undefined : (stryCov_9fa48("163"), c => c.charCodeAt(0)));
          const ivArray = isLikelyHexUtil(iv) ? hexToBuffer(iv) : Uint8Array.from(atob(iv), stryMutAct_9fa48("164") ? () => undefined : (stryCov_9fa48("164"), c => c.charCodeAt(0)));
          const plain = await window.crypto.subtle.decrypt(stryMutAct_9fa48("165") ? {} : (stryCov_9fa48("165"), {
            name: stryMutAct_9fa48("166") ? "" : (stryCov_9fa48("166"), 'AES-GCM'),
            iv: toBufferSource(ivArray)
          }), this.aesKey, toBufferSource(cipherArray));
          return new TextDecoder().decode(plain);
        }
      } catch (error) {
        if (stryMutAct_9fa48("167")) {
          {}
        } else {
          stryCov_9fa48("167");
          console.error(stryMutAct_9fa48("168") ? "" : (stryCov_9fa48("168"), 'DECRYPTION REAL ERROR:'), error);
          return null;
        }
      }
    }
  }
  private async buildMetadataAtRest(title: string, username: string, website: string, category: string, tags: string[]) {
    if (stryMutAct_9fa48("169")) {
      {}
    } else {
      stryCov_9fa48("169");
      // Arama indeksi her zaman profil fark etmeksizin çalışır (fakat plaintext arama performans profillerinde local js üzerinden daha da hızlı yapılabilir)
      const searchIndex = await this.buildSearchIndex(title, username, website, category, tags);
      const profile = this.encryptionProfile;

      // Şifrelenecek alanları belirle
      const encTitle = isFieldEncrypted(profile, stryMutAct_9fa48("170") ? "" : (stryCov_9fa48("170"), 'title'));
      const encUsername = isFieldEncrypted(profile, stryMutAct_9fa48("171") ? "" : (stryCov_9fa48("171"), 'username'));
      const encWebsite = isFieldEncrypted(profile, stryMutAct_9fa48("172") ? "" : (stryCov_9fa48("172"), 'website'));
      const encCategory = isFieldEncrypted(profile, stryMutAct_9fa48("173") ? "" : (stryCov_9fa48("173"), 'category'));
      const encTags = isFieldEncrypted(profile, stryMutAct_9fa48("174") ? "" : (stryCov_9fa48("174"), 'tags'));
      const result: Record<string, unknown> = stryMutAct_9fa48("175") ? {} : (stryCov_9fa48("175"), {
        title: encTitle ? stryMutAct_9fa48("176") ? "Stryker was here!" : (stryCov_9fa48("176"), '') : stryMutAct_9fa48("179") ? title && 'Untitled' : stryMutAct_9fa48("178") ? false : stryMutAct_9fa48("177") ? true : (stryCov_9fa48("177", "178", "179"), title || (stryMutAct_9fa48("180") ? "" : (stryCov_9fa48("180"), 'Untitled'))),
        username: encUsername ? stryMutAct_9fa48("181") ? "Stryker was here!" : (stryCov_9fa48("181"), '') : stryMutAct_9fa48("184") ? username && '' : stryMutAct_9fa48("183") ? false : stryMutAct_9fa48("182") ? true : (stryCov_9fa48("182", "183", "184"), username || (stryMutAct_9fa48("185") ? "Stryker was here!" : (stryCov_9fa48("185"), ''))),
        website: encWebsite ? stryMutAct_9fa48("186") ? "Stryker was here!" : (stryCov_9fa48("186"), '') : stryMutAct_9fa48("189") ? website && '' : stryMutAct_9fa48("188") ? false : stryMutAct_9fa48("187") ? true : (stryCov_9fa48("187", "188", "189"), website || (stryMutAct_9fa48("190") ? "Stryker was here!" : (stryCov_9fa48("190"), ''))),
        category: encCategory ? stryMutAct_9fa48("191") ? "Stryker was here!" : (stryCov_9fa48("191"), '') : stryMutAct_9fa48("194") ? category && 'General' : stryMutAct_9fa48("193") ? false : stryMutAct_9fa48("192") ? true : (stryCov_9fa48("192", "193", "194"), category || (stryMutAct_9fa48("195") ? "" : (stryCov_9fa48("195"), 'General'))),
        tags: encTags ? stryMutAct_9fa48("196") ? ["Stryker was here"] : (stryCov_9fa48("196"), []) : stryMutAct_9fa48("199") ? tags && [] : stryMutAct_9fa48("198") ? false : stryMutAct_9fa48("197") ? true : (stryCov_9fa48("197", "198", "199"), tags || (stryMutAct_9fa48("200") ? ["Stryker was here"] : (stryCov_9fa48("200"), []))),
        search_index: searchIndex
      });
      if (stryMutAct_9fa48("202") ? false : stryMutAct_9fa48("201") ? true : (stryCov_9fa48("201", "202"), encTitle)) {
        if (stryMutAct_9fa48("203")) {
          {}
        } else {
          stryCov_9fa48("203");
          const res = await this.encryptTextField(stryMutAct_9fa48("206") ? title && 'Untitled' : stryMutAct_9fa48("205") ? false : stryMutAct_9fa48("204") ? true : (stryCov_9fa48("204", "205", "206"), title || (stryMutAct_9fa48("207") ? "" : (stryCov_9fa48("207"), 'Untitled'))));
          result.encrypted_title = res.encrypted;
          result.title_iv = res.iv;
        }
      }
      if (stryMutAct_9fa48("209") ? false : stryMutAct_9fa48("208") ? true : (stryCov_9fa48("208", "209"), encUsername)) {
        if (stryMutAct_9fa48("210")) {
          {}
        } else {
          stryCov_9fa48("210");
          const res = await this.encryptTextField(stryMutAct_9fa48("213") ? username && '' : stryMutAct_9fa48("212") ? false : stryMutAct_9fa48("211") ? true : (stryCov_9fa48("211", "212", "213"), username || (stryMutAct_9fa48("214") ? "Stryker was here!" : (stryCov_9fa48("214"), ''))));
          result.encrypted_username = res.encrypted;
          result.username_iv = res.iv;
        }
      }
      if (stryMutAct_9fa48("216") ? false : stryMutAct_9fa48("215") ? true : (stryCov_9fa48("215", "216"), encWebsite)) {
        if (stryMutAct_9fa48("217")) {
          {}
        } else {
          stryCov_9fa48("217");
          const res = await this.encryptTextField(stryMutAct_9fa48("220") ? website && '' : stryMutAct_9fa48("219") ? false : stryMutAct_9fa48("218") ? true : (stryCov_9fa48("218", "219", "220"), website || (stryMutAct_9fa48("221") ? "Stryker was here!" : (stryCov_9fa48("221"), ''))));
          result.encrypted_website = res.encrypted;
          result.website_iv = res.iv;
        }
      }
      if (stryMutAct_9fa48("223") ? false : stryMutAct_9fa48("222") ? true : (stryCov_9fa48("222", "223"), encCategory)) {
        if (stryMutAct_9fa48("224")) {
          {}
        } else {
          stryCov_9fa48("224");
          const res = await this.encryptTextField(stryMutAct_9fa48("227") ? category && 'General' : stryMutAct_9fa48("226") ? false : stryMutAct_9fa48("225") ? true : (stryCov_9fa48("225", "226", "227"), category || (stryMutAct_9fa48("228") ? "" : (stryCov_9fa48("228"), 'General'))));
          result.encrypted_category = res.encrypted;
          result.category_iv = res.iv;
        }
      }
      if (stryMutAct_9fa48("230") ? false : stryMutAct_9fa48("229") ? true : (stryCov_9fa48("229", "230"), encTags)) {
        if (stryMutAct_9fa48("231")) {
          {}
        } else {
          stryCov_9fa48("231");
          const res = await this.encryptTextField(JSON.stringify(stryMutAct_9fa48("234") ? tags && [] : stryMutAct_9fa48("233") ? false : stryMutAct_9fa48("232") ? true : (stryCov_9fa48("232", "233", "234"), tags || (stryMutAct_9fa48("235") ? ["Stryker was here"] : (stryCov_9fa48("235"), [])))));
          result.encrypted_tags = res.encrypted;
          result.tags_iv = res.iv;
        }
      }
      return result;
    }
  }
  private async prepareEntryMetadataForUse(entry: VaultEntry): Promise<{
    uiEntry: VaultEntry;
    storageEntry?: VaultEntry;
  }> {
    if (stryMutAct_9fa48("236")) {
      {}
    } else {
      stryCov_9fa48("236");
      // 1. StorageEntry'yi gerekirse onar: HasEncryptedMetadata check
      // Eğer profil şifreleme gerektiriyorsa ve metadata tamamen plaintext'te ise veya eksikse, atRest'i yeniden hazırla
      // Şuan, esneklik için, şifreli bir değer varsa deşifre eder (gelen kayıt uyumu için)
      let storageEntry: VaultEntry | undefined;

      // Arama indeksi oluşturulmuş mu kontrol et (Geriye Dönük Uyumluluk için)
      const hasSearchIndex = stryMutAct_9fa48("239") ? Array.isArray(entry.search_index) || entry.search_index.length > 0 : stryMutAct_9fa48("238") ? false : stryMutAct_9fa48("237") ? true : (stryCov_9fa48("237", "238", "239"), Array.isArray(entry.search_index) && (stryMutAct_9fa48("242") ? entry.search_index.length <= 0 : stryMutAct_9fa48("241") ? entry.search_index.length >= 0 : stryMutAct_9fa48("240") ? true : (stryCov_9fa48("240", "241", "242"), entry.search_index.length > 0)));

      // UI için her zaman varolan şifreli değerleri çözebiliriz 
      // Profil degişse bile, sadece database'e YAZARKEN buildMetadataAtRest çağrılacaktır
      if (stryMutAct_9fa48("245") ? false : stryMutAct_9fa48("244") ? true : stryMutAct_9fa48("243") ? hasSearchIndex : (stryCov_9fa48("243", "244", "245"), !hasSearchIndex)) {
        if (stryMutAct_9fa48("246")) {
          {}
        } else {
          stryCov_9fa48("246");
          const atRest = await this.buildMetadataAtRest(stryMutAct_9fa48("249") ? entry.title && 'Untitled' : stryMutAct_9fa48("248") ? false : stryMutAct_9fa48("247") ? true : (stryCov_9fa48("247", "248", "249"), entry.title || (stryMutAct_9fa48("250") ? "" : (stryCov_9fa48("250"), 'Untitled'))), stryMutAct_9fa48("253") ? entry.username && '' : stryMutAct_9fa48("252") ? false : stryMutAct_9fa48("251") ? true : (stryCov_9fa48("251", "252", "253"), entry.username || (stryMutAct_9fa48("254") ? "Stryker was here!" : (stryCov_9fa48("254"), ''))), stryMutAct_9fa48("257") ? entry.website && '' : stryMutAct_9fa48("256") ? false : stryMutAct_9fa48("255") ? true : (stryCov_9fa48("255", "256", "257"), entry.website || (stryMutAct_9fa48("258") ? "Stryker was here!" : (stryCov_9fa48("258"), ''))), stryMutAct_9fa48("261") ? entry.category && 'General' : stryMutAct_9fa48("260") ? false : stryMutAct_9fa48("259") ? true : (stryCov_9fa48("259", "260", "261"), entry.category || (stryMutAct_9fa48("262") ? "" : (stryCov_9fa48("262"), 'General'))), stryMutAct_9fa48("265") ? entry.tags && [] : stryMutAct_9fa48("264") ? false : stryMutAct_9fa48("263") ? true : (stryCov_9fa48("263", "264", "265"), entry.tags || (stryMutAct_9fa48("266") ? ["Stryker was here"] : (stryCov_9fa48("266"), []))));
          // Eksikse, yeni atRest formatında düzeltip saklıyoruz
          storageEntry = stryMutAct_9fa48("267") ? {} : (stryCov_9fa48("267"), {
            ...entry,
            ...atRest,
            updated_at: stryMutAct_9fa48("270") ? entry.updated_at && new Date().toISOString() : stryMutAct_9fa48("269") ? false : stryMutAct_9fa48("268") ? true : (stryCov_9fa48("268", "269", "270"), entry.updated_at || new Date().toISOString())
          });
        }
      }
      const source = stryMutAct_9fa48("273") ? storageEntry && entry : stryMutAct_9fa48("272") ? false : stryMutAct_9fa48("271") ? true : (stryCov_9fa48("271", "272", "273"), storageEntry || entry);
      const [decTitle, decUsername, decWebsite] = await Promise.all(stryMutAct_9fa48("274") ? [] : (stryCov_9fa48("274"), [this.decryptTextField(source.encrypted_title, source.title_iv), this.decryptTextField(source.encrypted_username, source.username_iv), this.decryptTextField(source.encrypted_website, source.website_iv)]));
      const [decCategory, decTagsRaw] = await Promise.all(stryMutAct_9fa48("275") ? [] : (stryCov_9fa48("275"), [this.decryptTextField(source.encrypted_category, source.category_iv), this.decryptTextField(source.encrypted_tags, source.tags_iv)]));
      let decTags: string[] = stryMutAct_9fa48("278") ? source.tags && [] : stryMutAct_9fa48("277") ? false : stryMutAct_9fa48("276") ? true : (stryCov_9fa48("276", "277", "278"), source.tags || (stryMutAct_9fa48("279") ? ["Stryker was here"] : (stryCov_9fa48("279"), [])));
      if (stryMutAct_9fa48("281") ? false : stryMutAct_9fa48("280") ? true : (stryCov_9fa48("280", "281"), decTagsRaw)) {
        if (stryMutAct_9fa48("282")) {
          {}
        } else {
          stryCov_9fa48("282");
          try {
            if (stryMutAct_9fa48("283")) {
              {}
            } else {
              stryCov_9fa48("283");
              const parsed = JSON.parse(decTagsRaw);
              decTags = Array.isArray(parsed) ? parsed : stryMutAct_9fa48("284") ? ["Stryker was here"] : (stryCov_9fa48("284"), []);
            }
          } catch {
            if (stryMutAct_9fa48("285")) {
              {}
            } else {
              stryCov_9fa48("285");
              decTags = stryMutAct_9fa48("288") ? source.tags && [] : stryMutAct_9fa48("287") ? false : stryMutAct_9fa48("286") ? true : (stryCov_9fa48("286", "287", "288"), source.tags || (stryMutAct_9fa48("289") ? ["Stryker was here"] : (stryCov_9fa48("289"), [])));
            }
          }
        }
      }
      const rawAttachments = Array.isArray(source.attachments) ? source.attachments : stryMutAct_9fa48("290") ? ["Stryker was here"] : (stryCov_9fa48("290"), []);
      const uiAttachments = await this.decryptAttachmentMetadataList(rawAttachments);
      const profile = this.encryptionProfile;
      // Eğer policy "attachments şifrelenmeli" diyorsa ve şifrelenmemiş objeler varsa re-encrypt et.
      if (stryMutAct_9fa48("292") ? false : stryMutAct_9fa48("291") ? true : (stryCov_9fa48("291", "292"), isFieldEncrypted(profile, stryMutAct_9fa48("293") ? "" : (stryCov_9fa48("293"), 'attachments')))) {
        if (stryMutAct_9fa48("294")) {
          {}
        } else {
          stryCov_9fa48("294");
          const needsAttachmentMigration = stryMutAct_9fa48("295") ? rawAttachments.every(item => item.name && !item.encrypted_name || item.type && !item.encrypted_type) : (stryCov_9fa48("295"), rawAttachments.some(stryMutAct_9fa48("296") ? () => undefined : (stryCov_9fa48("296"), item => stryMutAct_9fa48("299") ? item.name && !item.encrypted_name && item.type && !item.encrypted_type : stryMutAct_9fa48("298") ? false : stryMutAct_9fa48("297") ? true : (stryCov_9fa48("297", "298", "299"), (stryMutAct_9fa48("301") ? item.name || !item.encrypted_name : stryMutAct_9fa48("300") ? false : (stryCov_9fa48("300", "301"), item.name && (stryMutAct_9fa48("302") ? item.encrypted_name : (stryCov_9fa48("302"), !item.encrypted_name)))) || (stryMutAct_9fa48("304") ? item.type || !item.encrypted_type : stryMutAct_9fa48("303") ? false : (stryCov_9fa48("303", "304"), item.type && (stryMutAct_9fa48("305") ? item.encrypted_type : (stryCov_9fa48("305"), !item.encrypted_type))))))));
          if (stryMutAct_9fa48("307") ? false : stryMutAct_9fa48("306") ? true : (stryCov_9fa48("306", "307"), needsAttachmentMigration)) {
            if (stryMutAct_9fa48("308")) {
              {}
            } else {
              stryCov_9fa48("308");
              const encryptedAttachments = await this.encryptAttachmentMetadataList(uiAttachments);
              storageEntry = stryMutAct_9fa48("309") ? {} : (stryCov_9fa48("309"), {
                ...(stryMutAct_9fa48("312") ? storageEntry && source : stryMutAct_9fa48("311") ? false : stryMutAct_9fa48("310") ? true : (stryCov_9fa48("310", "311", "312"), storageEntry || source)),
                attachments: encryptedAttachments,
                updated_at: stryMutAct_9fa48("315") ? source.updated_at && new Date().toISOString() : stryMutAct_9fa48("314") ? false : stryMutAct_9fa48("313") ? true : (stryCov_9fa48("313", "314", "315"), source.updated_at || new Date().toISOString())
              });
            }
          }
        }
      }
      const uiEntry: VaultEntry = stryMutAct_9fa48("316") ? {} : (stryCov_9fa48("316"), {
        ...source,
        title: stryMutAct_9fa48("317") ? (decTitle ?? source.title) && 'Untitled' : (stryCov_9fa48("317"), (stryMutAct_9fa48("318") ? decTitle && source.title : (stryCov_9fa48("318"), decTitle ?? source.title)) ?? (stryMutAct_9fa48("319") ? "" : (stryCov_9fa48("319"), 'Untitled'))),
        username: stryMutAct_9fa48("320") ? (decUsername ?? source.username) && '' : (stryCov_9fa48("320"), (stryMutAct_9fa48("321") ? decUsername && source.username : (stryCov_9fa48("321"), decUsername ?? source.username)) ?? (stryMutAct_9fa48("322") ? "Stryker was here!" : (stryCov_9fa48("322"), ''))),
        website: stryMutAct_9fa48("323") ? (decWebsite ?? source.website) && '' : (stryCov_9fa48("323"), (stryMutAct_9fa48("324") ? decWebsite && source.website : (stryCov_9fa48("324"), decWebsite ?? source.website)) ?? (stryMutAct_9fa48("325") ? "Stryker was here!" : (stryCov_9fa48("325"), ''))),
        category: stryMutAct_9fa48("326") ? (decCategory ?? source.category) && 'General' : (stryCov_9fa48("326"), (stryMutAct_9fa48("327") ? decCategory && source.category : (stryCov_9fa48("327"), decCategory ?? source.category)) ?? (stryMutAct_9fa48("328") ? "" : (stryCov_9fa48("328"), 'General'))),
        tags: decTags,
        attachments: uiAttachments
      });
      return stryMutAct_9fa48("329") ? {} : (stryCov_9fa48("329"), {
        uiEntry,
        storageEntry
      });
    }
  }
  private async hashPasswordPBKDF2(password: string, salt: Uint8Array, iterations: number = 100000): Promise<string> {
    if (stryMutAct_9fa48("330")) {
      {}
    } else {
      stryCov_9fa48("330");
      const enc = new TextEncoder();
      const keyMaterial = await window.crypto.subtle.importKey(stryMutAct_9fa48("331") ? "" : (stryCov_9fa48("331"), "raw"), toBufferSource(enc.encode(password)), stryMutAct_9fa48("332") ? "" : (stryCov_9fa48("332"), "PBKDF2"), stryMutAct_9fa48("333") ? true : (stryCov_9fa48("333"), false), stryMutAct_9fa48("334") ? [] : (stryCov_9fa48("334"), [stryMutAct_9fa48("335") ? "" : (stryCov_9fa48("335"), "deriveBits")]));
      const hash = await window.crypto.subtle.deriveBits(stryMutAct_9fa48("336") ? {} : (stryCov_9fa48("336"), {
        name: stryMutAct_9fa48("337") ? "" : (stryCov_9fa48("337"), "PBKDF2"),
        salt: toBufferSource(salt),
        iterations,
        hash: stryMutAct_9fa48("338") ? "" : (stryCov_9fa48("338"), "SHA-256")
      }), keyMaterial, 256);
      return btoa(String.fromCharCode(...new Uint8Array(hash)));
    }
  }
  private async hashPasswordArgon2(password: string, salt: Uint8Array, params?: Partial<NonNullable<StoredCredential['argon2']>>): Promise<string> {
    if (stryMutAct_9fa48("339")) {
      {}
    } else {
      stryCov_9fa48("339");
      const effective = stryMutAct_9fa48("340") ? {} : (stryCov_9fa48("340"), {
        ...this.authArgon2Params,
        ...(stryMutAct_9fa48("343") ? params && {} : stryMutAct_9fa48("342") ? false : stryMutAct_9fa48("341") ? true : (stryCov_9fa48("341", "342", "343"), params || {}))
      });
      return argon2id(stryMutAct_9fa48("344") ? {} : (stryCov_9fa48("344"), {
        password,
        salt,
        parallelism: effective.parallelism,
        iterations: effective.iterations,
        memorySize: effective.memorySize,
        hashLength: effective.hashLength,
        outputType: stryMutAct_9fa48("345") ? "" : (stryCov_9fa48("345"), 'hex')
      }));
    }
  }
  private async createAuthCredential(password: string): Promise<StoredCredential> {
    if (stryMutAct_9fa48("346")) {
      {}
    } else {
      stryCov_9fa48("346");
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const verificationHash = await this.hashPasswordArgon2(password, salt, this.authArgon2Params);
      return stryMutAct_9fa48("347") ? {} : (stryCov_9fa48("347"), {
        scheme: stryMutAct_9fa48("348") ? "" : (stryCov_9fa48("348"), 'argon2id-v1'),
        verificationHash,
        salt: btoa(String.fromCharCode(...salt)),
        argon2: stryMutAct_9fa48("349") ? {} : (stryCov_9fa48("349"), {
          ...this.authArgon2Params
        })
      });
    }
  }
  async verifyPassword(password: string, stored: StoredCredential): Promise<boolean> {
    if (stryMutAct_9fa48("350")) {
      {}
    } else {
      stryCov_9fa48("350");
      const salt = Uint8Array.from(atob(stored.salt), stryMutAct_9fa48("351") ? () => undefined : (stryCov_9fa48("351"), c => c.charCodeAt(0)));
      if (stryMutAct_9fa48("354") ? stored.scheme !== 'argon2id-v1' : stryMutAct_9fa48("353") ? false : stryMutAct_9fa48("352") ? true : (stryCov_9fa48("352", "353", "354"), stored.scheme === (stryMutAct_9fa48("355") ? "" : (stryCov_9fa48("355"), 'argon2id-v1')))) {
        if (stryMutAct_9fa48("356")) {
          {}
        } else {
          stryCov_9fa48("356");
          const computedHash = await this.hashPasswordArgon2(password, salt, stryMutAct_9fa48("359") ? stored.argon2 && this.authArgon2Params : stryMutAct_9fa48("358") ? false : stryMutAct_9fa48("357") ? true : (stryCov_9fa48("357", "358", "359"), stored.argon2 || this.authArgon2Params));
          return stryMutAct_9fa48("362") ? computedHash !== stored.verificationHash : stryMutAct_9fa48("361") ? false : stryMutAct_9fa48("360") ? true : (stryCov_9fa48("360", "361", "362"), computedHash === stored.verificationHash);
        }
      }
      const computedHash = await this.hashPasswordPBKDF2(password, salt, stryMutAct_9fa48("365") ? stored.iterations && 100000 : stryMutAct_9fa48("364") ? false : stryMutAct_9fa48("363") ? true : (stryCov_9fa48("363", "364", "365"), stored.iterations || 100000));
      return stryMutAct_9fa48("368") ? computedHash !== stored.verificationHash : stryMutAct_9fa48("367") ? false : stryMutAct_9fa48("366") ? true : (stryCov_9fa48("366", "367", "368"), computedHash === stored.verificationHash);
    }
  }
  private async migrateAuthCredentialToArgon2(password: string, oldCredential: StoredCredential): Promise<StoredCredential> {
    if (stryMutAct_9fa48("369")) {
      {}
    } else {
      stryCov_9fa48("369");
      if (stryMutAct_9fa48("372") ? oldCredential.scheme !== 'argon2id-v1' : stryMutAct_9fa48("371") ? false : stryMutAct_9fa48("370") ? true : (stryCov_9fa48("370", "371", "372"), oldCredential.scheme === (stryMutAct_9fa48("373") ? "" : (stryCov_9fa48("373"), 'argon2id-v1')))) return oldCredential;
      return this.createAuthCredential(password);
    }
  }

  // P1-3 Kritik aksiyonlarda re-auth
  async verifyCurrentPassword(password: string): Promise<boolean> {
    if (stryMutAct_9fa48("374")) {
      {}
    } else {
      stryCov_9fa48("374");
      if (stryMutAct_9fa48("377") ? !this.opfsMockDb || !this.sqliteDb : stryMutAct_9fa48("376") ? false : stryMutAct_9fa48("375") ? true : (stryCov_9fa48("375", "376", "377"), (stryMutAct_9fa48("378") ? this.opfsMockDb : (stryCov_9fa48("378"), !this.opfsMockDb)) && (stryMutAct_9fa48("379") ? this.sqliteDb : (stryCov_9fa48("379"), !this.sqliteDb)))) return stryMutAct_9fa48("380") ? true : (stryCov_9fa48("380"), false);
      let authMetadata: Record<string, unknown> | null = null;
      if (stryMutAct_9fa48("383") ? this.useSQLite || this.sqliteDb : stryMutAct_9fa48("382") ? false : stryMutAct_9fa48("381") ? true : (stryCov_9fa48("381", "382", "383"), this.useSQLite && this.sqliteDb)) {
        if (stryMutAct_9fa48("384")) {
          {}
        } else {
          stryCov_9fa48("384");
          const sqlAuth = this.sqliteDb.getMetadata(stryMutAct_9fa48("385") ? "" : (stryCov_9fa48("385"), 'auth_credential'));
          if (stryMutAct_9fa48("388") ? sqlAuth || sqlAuth.credential : stryMutAct_9fa48("387") ? false : stryMutAct_9fa48("386") ? true : (stryCov_9fa48("386", "387", "388"), sqlAuth && sqlAuth.credential)) authMetadata = sqlAuth;
        }
      }
      if (stryMutAct_9fa48("391") ? !authMetadata || this.opfsMockDb : stryMutAct_9fa48("390") ? false : stryMutAct_9fa48("389") ? true : (stryCov_9fa48("389", "390", "391"), (stryMutAct_9fa48("392") ? authMetadata : (stryCov_9fa48("392"), !authMetadata)) && this.opfsMockDb)) {
        if (stryMutAct_9fa48("393")) {
          {}
        } else {
          stryCov_9fa48("393");
          authMetadata = await this.opfsMockDb.get(stryMutAct_9fa48("394") ? "" : (stryCov_9fa48("394"), 'vault_metadata'), stryMutAct_9fa48("395") ? "" : (stryCov_9fa48("395"), 'auth_credential'));
        }
      }
      if (stryMutAct_9fa48("398") ? !authMetadata && !authMetadata.credential : stryMutAct_9fa48("397") ? false : stryMutAct_9fa48("396") ? true : (stryCov_9fa48("396", "397", "398"), (stryMutAct_9fa48("399") ? authMetadata : (stryCov_9fa48("399"), !authMetadata)) || (stryMutAct_9fa48("400") ? authMetadata.credential : (stryCov_9fa48("400"), !authMetadata.credential)))) return stryMutAct_9fa48("401") ? true : (stryCov_9fa48("401"), false);
      return this.verifyPassword(password, authMetadata.credential as StoredCredential);
    }
  }

  // Derives Web Crypto AES-GCM Key from Password & Device Secret (Zero Knowledge) via Argon2id
  async deriveMasterKey(password: string, secretKey: string, saltB64?: string): Promise<string> {
    if (stryMutAct_9fa48("402")) {
      {}
    } else {
      stryCov_9fa48("402");
      let salt: Uint8Array;
      if (stryMutAct_9fa48("404") ? false : stryMutAct_9fa48("403") ? true : (stryCov_9fa48("403", "404"), saltB64)) {
        if (stryMutAct_9fa48("405")) {
          {}
        } else {
          stryCov_9fa48("405");
          salt = Uint8Array.from(atob(saltB64), stryMutAct_9fa48("406") ? () => undefined : (stryCov_9fa48("406"), c => c.charCodeAt(0)));
        }
      } else {
        if (stryMutAct_9fa48("407")) {
          {}
        } else {
          stryCov_9fa48("407");
          salt = window.crypto.getRandomValues(new Uint8Array(16));
        }
      }
      const combinedMaterial = stryMutAct_9fa48("408") ? `` : (stryCov_9fa48("408"), `${password}:${secretKey}`);

      // 1. Derive AES-GCM Key Bits using Argon2id (Memory-hard)
      const derivedBits = await argon2id(stryMutAct_9fa48("409") ? {} : (stryCov_9fa48("409"), {
        password: combinedMaterial,
        salt: salt,
        parallelism: 1,
        iterations: 3,
        memorySize: 65536,
        // 64 MB
        hashLength: 32,
        // 256 bits
        outputType: stryMutAct_9fa48("410") ? "" : (stryCov_9fa48("410"), 'binary')
      }));
      this.sensitiveMaterial = derivedBits;
      this.searchIndexHmacKey = null;

      // 2. Import raw derived bits as AES-GCM Key
      const keyBuf = new ArrayBuffer(this.sensitiveMaterial!.byteLength);
      new Uint8Array(keyBuf).set(this.sensitiveMaterial!);
      this.aesKey = await window.crypto.subtle.importKey(stryMutAct_9fa48("411") ? "" : (stryCov_9fa48("411"), "raw"), keyBuf, stryMutAct_9fa48("412") ? {} : (stryCov_9fa48("412"), {
        name: stryMutAct_9fa48("413") ? "" : (stryCov_9fa48("413"), "AES-GCM"),
        length: 256
      }), stryMutAct_9fa48("414") ? true : (stryCov_9fa48("414"), false), stryMutAct_9fa48("415") ? [] : (stryCov_9fa48("415"), [stryMutAct_9fa48("416") ? "" : (stryCov_9fa48("416"), "encrypt"), stryMutAct_9fa48("417") ? "" : (stryCov_9fa48("417"), "decrypt")]));
      return btoa(String.fromCharCode(...salt));
    }
  }
  async initDb(password: string, secretKey: string, dbName: string = stryMutAct_9fa48("418") ? "" : (stryCov_9fa48("418"), 'aegis_opfs_vault'), isSetupAction: boolean = stryMutAct_9fa48("419") ? true : (stryCov_9fa48("419"), false)): Promise<void> {
    if (stryMutAct_9fa48("420")) {
      {}
    } else {
      stryCov_9fa48("420");
      // 1. Persistence Check
      await this.checkOpfsPersistence(dbName);

      // 2. Always open IDB first (needed for auth metadata & migration source)
      this.opfsMockDb = await openDB(dbName, 3, stryMutAct_9fa48("421") ? {} : (stryCov_9fa48("421"), {
        upgrade(db, oldVersion) {
          if (stryMutAct_9fa48("422")) {
            {}
          } else {
            stryCov_9fa48("422");
            if (stryMutAct_9fa48("426") ? oldVersion >= 1 : stryMutAct_9fa48("425") ? oldVersion <= 1 : stryMutAct_9fa48("424") ? false : stryMutAct_9fa48("423") ? true : (stryCov_9fa48("423", "424", "425", "426"), oldVersion < 1)) {
              if (stryMutAct_9fa48("427")) {
                {}
              } else {
                stryCov_9fa48("427");
                const store = db.createObjectStore(stryMutAct_9fa48("428") ? "" : (stryCov_9fa48("428"), 'passwords'), stryMutAct_9fa48("429") ? {} : (stryCov_9fa48("429"), {
                  keyPath: stryMutAct_9fa48("430") ? "" : (stryCov_9fa48("430"), 'id'),
                  autoIncrement: stryMutAct_9fa48("431") ? false : (stryCov_9fa48("431"), true)
                }));
                store.createIndex(stryMutAct_9fa48("432") ? "" : (stryCov_9fa48("432"), 'title'), stryMutAct_9fa48("433") ? "" : (stryCov_9fa48("433"), 'title'));
                store.createIndex(stryMutAct_9fa48("434") ? "" : (stryCov_9fa48("434"), 'category'), stryMutAct_9fa48("435") ? "" : (stryCov_9fa48("435"), 'category'));
              }
            }
            if (stryMutAct_9fa48("438") ? oldVersion < 2 || !db.objectStoreNames.contains('vault_metadata') : stryMutAct_9fa48("437") ? false : stryMutAct_9fa48("436") ? true : (stryCov_9fa48("436", "437", "438"), (stryMutAct_9fa48("441") ? oldVersion >= 2 : stryMutAct_9fa48("440") ? oldVersion <= 2 : stryMutAct_9fa48("439") ? true : (stryCov_9fa48("439", "440", "441"), oldVersion < 2)) && (stryMutAct_9fa48("442") ? db.objectStoreNames.contains('vault_metadata') : (stryCov_9fa48("442"), !db.objectStoreNames.contains(stryMutAct_9fa48("443") ? "" : (stryCov_9fa48("443"), 'vault_metadata')))))) {
              if (stryMutAct_9fa48("444")) {
                {}
              } else {
                stryCov_9fa48("444");
                db.createObjectStore(stryMutAct_9fa48("445") ? "" : (stryCov_9fa48("445"), 'vault_metadata'), stryMutAct_9fa48("446") ? {} : (stryCov_9fa48("446"), {
                  keyPath: stryMutAct_9fa48("447") ? "" : (stryCov_9fa48("447"), 'id')
                }));
              }
            }
            if (stryMutAct_9fa48("450") ? oldVersion < 3 || !db.objectStoreNames.contains('attachments') : stryMutAct_9fa48("449") ? false : stryMutAct_9fa48("448") ? true : (stryCov_9fa48("448", "449", "450"), (stryMutAct_9fa48("453") ? oldVersion >= 3 : stryMutAct_9fa48("452") ? oldVersion <= 3 : stryMutAct_9fa48("451") ? true : (stryCov_9fa48("451", "452", "453"), oldVersion < 3)) && (stryMutAct_9fa48("454") ? db.objectStoreNames.contains('attachments') : (stryCov_9fa48("454"), !db.objectStoreNames.contains(stryMutAct_9fa48("455") ? "" : (stryCov_9fa48("455"), 'attachments')))))) {
              if (stryMutAct_9fa48("456")) {
                {}
              } else {
                stryCov_9fa48("456");
                const store = db.createObjectStore(stryMutAct_9fa48("457") ? "" : (stryCov_9fa48("457"), 'attachments'), stryMutAct_9fa48("458") ? {} : (stryCov_9fa48("458"), {
                  keyPath: stryMutAct_9fa48("459") ? "" : (stryCov_9fa48("459"), 'id')
                }));
                store.createIndex(stryMutAct_9fa48("460") ? "" : (stryCov_9fa48("460"), 'entryId'), stryMutAct_9fa48("461") ? "" : (stryCov_9fa48("461"), 'entryId'));
              }
            }
          }
        }
      }));
      // 2b. Try to open SQLite-OPFS backend
      if (stryMutAct_9fa48("463") ? false : stryMutAct_9fa48("462") ? true : (stryCov_9fa48("462", "463"), isOPFSAvailable())) {
        if (stryMutAct_9fa48("464")) {
          {}
        } else {
          stryCov_9fa48("464");
          try {
            if (stryMutAct_9fa48("465")) {
              {}
            } else {
              stryCov_9fa48("465");
              this.sqliteDb = new SQLiteOPFS(dbName);
              await this.sqliteDb.open();
              this.useSQLite = stryMutAct_9fa48("466") ? false : (stryCov_9fa48("466"), true);
              console.log(stryMutAct_9fa48("467") ? `` : (stryCov_9fa48("467"), `[SQLite-OPFS] ✅ SQLite backend aktif: ${dbName}`));
            }
          } catch (err) {
            if (stryMutAct_9fa48("468")) {
              {}
            } else {
              stryCov_9fa48("468");
              console.warn(stryMutAct_9fa48("469") ? `` : (stryCov_9fa48("469"), `[SQLite-OPFS] ⚠️ SQLite başlatılamadı, IDB fallback kullanılıyor:`), err);
              this.sqliteDb = null;
            }
          }
        }
      } else {
        if (stryMutAct_9fa48("470")) {
          {}
        } else {
          stryCov_9fa48("470");
          console.log(stryMutAct_9fa48("471") ? `` : (stryCov_9fa48("471"), `[SQLite-OPFS] OPFS kullanılamıyor, IDB backend ile devam ediliyor.`));
          this.useSQLite = stryMutAct_9fa48("472") ? true : (stryCov_9fa48("472"), false);
        }
      }

      // 3. Handle Dynamic Salt and Migration (Read-only initially)
      const txRead = this.opfsMockDb.transaction(stryMutAct_9fa48("473") ? [] : (stryCov_9fa48("473"), [stryMutAct_9fa48("474") ? "" : (stryCov_9fa48("474"), 'vault_metadata'), stryMutAct_9fa48("475") ? "" : (stryCov_9fa48("475"), 'passwords')]), stryMutAct_9fa48("476") ? "" : (stryCov_9fa48("476"), 'readonly'));
      const metadataStoreRead = txRead.objectStore(stryMutAct_9fa48("477") ? "" : (stryCov_9fa48("477"), 'vault_metadata'));
      let metadata = await metadataStoreRead.get(stryMutAct_9fa48("478") ? "" : (stryCov_9fa48("478"), 'main_salt'));
      await txRead.done;

      // SQLite'ta salt varsa onu tercih et
      if (stryMutAct_9fa48("481") ? this.useSQLite && this.sqliteDb || !metadata : stryMutAct_9fa48("480") ? false : stryMutAct_9fa48("479") ? true : (stryCov_9fa48("479", "480", "481"), (stryMutAct_9fa48("483") ? this.useSQLite || this.sqliteDb : stryMutAct_9fa48("482") ? true : (stryCov_9fa48("482", "483"), this.useSQLite && this.sqliteDb)) && (stryMutAct_9fa48("484") ? metadata : (stryCov_9fa48("484"), !metadata)))) {
        if (stryMutAct_9fa48("485")) {
          {}
        } else {
          stryCov_9fa48("485");
          const sqlMetadata = this.sqliteDb.getMetadata(stryMutAct_9fa48("486") ? "" : (stryCov_9fa48("486"), 'main_salt'));
          if (stryMutAct_9fa48("488") ? false : stryMutAct_9fa48("487") ? true : (stryCov_9fa48("487", "488"), sqlMetadata)) metadata = sqlMetadata;
        }
      }
      let currentSaltB64 = stryMutAct_9fa48("489") ? metadata.salt : (stryCov_9fa48("489"), metadata?.salt);
      if (stryMutAct_9fa48("492") ? false : stryMutAct_9fa48("491") ? true : stryMutAct_9fa48("490") ? currentSaltB64 : (stryCov_9fa48("490", "491", "492"), !currentSaltB64)) {
        if (stryMutAct_9fa48("493")) {
          {}
        } else {
          stryCov_9fa48("493");
          // Migration: Old users check IDB passwords count
          const txCheck = this.opfsMockDb.transaction(stryMutAct_9fa48("494") ? "" : (stryCov_9fa48("494"), 'passwords'), stryMutAct_9fa48("495") ? "" : (stryCov_9fa48("495"), 'readonly'));
          const passwordsCount = await txCheck.objectStore(stryMutAct_9fa48("496") ? "" : (stryCov_9fa48("496"), 'passwords')).count();
          await txCheck.done;
          if (stryMutAct_9fa48("500") ? passwordsCount <= 0 : stryMutAct_9fa48("499") ? passwordsCount >= 0 : stryMutAct_9fa48("498") ? false : stryMutAct_9fa48("497") ? true : (stryCov_9fa48("497", "498", "499", "500"), passwordsCount > 0)) {
            if (stryMutAct_9fa48("501")) {
              {}
            } else {
              stryCov_9fa48("501");
              const oldSaltBytes = new TextEncoder().encode(stryMutAct_9fa48("502") ? "" : (stryCov_9fa48("502"), "aegis-premium-salt-v4"));
              currentSaltB64 = btoa(String.fromCharCode(...oldSaltBytes));
            }
          }
        }
      }

      // 4. Generate AES-GCM Key (Takes time, cannot happen inside IDB tx)
      const newSaltB64 = await this.deriveMasterKey(password, secretKey, currentSaltB64);

      // Gerçek doğrulama — metadata'yı hem IDB'den hem SQLite'tan oku
      const txAuthRead = this.opfsMockDb.transaction(stryMutAct_9fa48("503") ? [] : (stryCov_9fa48("503"), [stryMutAct_9fa48("504") ? "" : (stryCov_9fa48("504"), 'vault_metadata'), stryMutAct_9fa48("505") ? "" : (stryCov_9fa48("505"), 'passwords')]), stryMutAct_9fa48("506") ? "" : (stryCov_9fa48("506"), 'readonly'));
      let authMetadata = await txAuthRead.objectStore(stryMutAct_9fa48("507") ? "" : (stryCov_9fa48("507"), 'vault_metadata')).get(stryMutAct_9fa48("508") ? "" : (stryCov_9fa48("508"), 'auth_credential'));
      let deviceMetadata = await txAuthRead.objectStore(stryMutAct_9fa48("509") ? "" : (stryCov_9fa48("509"), 'vault_metadata')).get(stryMutAct_9fa48("510") ? "" : (stryCov_9fa48("510"), 'device_config'));
      const passwordsCount = await txAuthRead.objectStore(stryMutAct_9fa48("511") ? "" : (stryCov_9fa48("511"), 'passwords')).count();
      await txAuthRead.done;

      // SQLite'ta metadata varsa onu tercih et (migration sonrası IDB boş olabilir)
      // ANCAK setup modundayken eski SQLite verisini görmezden gel
      if (stryMutAct_9fa48("514") ? !isSetupAction && this.useSQLite || this.sqliteDb : stryMutAct_9fa48("513") ? false : stryMutAct_9fa48("512") ? true : (stryCov_9fa48("512", "513", "514"), (stryMutAct_9fa48("516") ? !isSetupAction || this.useSQLite : stryMutAct_9fa48("515") ? true : (stryCov_9fa48("515", "516"), (stryMutAct_9fa48("517") ? isSetupAction : (stryCov_9fa48("517"), !isSetupAction)) && this.useSQLite)) && this.sqliteDb)) {
        if (stryMutAct_9fa48("518")) {
          {}
        } else {
          stryCov_9fa48("518");
          const sqlAuth = this.sqliteDb.getMetadata(stryMutAct_9fa48("519") ? "" : (stryCov_9fa48("519"), 'auth_credential'));
          const sqlDevice = this.sqliteDb.getMetadata(stryMutAct_9fa48("520") ? "" : (stryCov_9fa48("520"), 'device_config'));
          if (stryMutAct_9fa48("523") ? sqlAuth || sqlAuth.credential : stryMutAct_9fa48("522") ? false : stryMutAct_9fa48("521") ? true : (stryCov_9fa48("521", "522", "523"), sqlAuth && sqlAuth.credential)) authMetadata = sqlAuth;
          if (stryMutAct_9fa48("526") ? sqlDevice || sqlDevice.deviceSecretHash : stryMutAct_9fa48("525") ? false : stryMutAct_9fa48("524") ? true : (stryCov_9fa48("524", "525", "526"), sqlDevice && sqlDevice.deviceSecretHash)) deviceMetadata = sqlDevice;
        }
      }

      // Setup modunda eski kalıntı SQLite verisini temizle
      if (stryMutAct_9fa48("529") ? isSetupAction && this.useSQLite || this.sqliteDb : stryMutAct_9fa48("528") ? false : stryMutAct_9fa48("527") ? true : (stryCov_9fa48("527", "528", "529"), (stryMutAct_9fa48("531") ? isSetupAction || this.useSQLite : stryMutAct_9fa48("530") ? true : (stryCov_9fa48("530", "531"), isSetupAction && this.useSQLite)) && this.sqliteDb)) {
        if (stryMutAct_9fa48("532")) {
          {}
        } else {
          stryCov_9fa48("532");
          try {
            if (stryMutAct_9fa48("533")) {
              {}
            } else {
              stryCov_9fa48("533");
              this.sqliteDb.deleteMetadata(stryMutAct_9fa48("534") ? "" : (stryCov_9fa48("534"), 'auth_credential'));
              this.sqliteDb.deleteMetadata(stryMutAct_9fa48("535") ? "" : (stryCov_9fa48("535"), 'device_config'));
              this.sqliteDb.deleteMetadata(stryMutAct_9fa48("536") ? "" : (stryCov_9fa48("536"), 'main_salt'));
              this.sqliteDb.deleteMetadata(stryMutAct_9fa48("537") ? "" : (stryCov_9fa48("537"), 'security_pins'));
            }
          } catch {/* İlk kurulum, tablo boş olabilir */}
        }
      }
      if (stryMutAct_9fa48("540") ? authMetadata || authMetadata.credential : stryMutAct_9fa48("539") ? false : stryMutAct_9fa48("538") ? true : (stryCov_9fa48("538", "539", "540"), authMetadata && authMetadata.credential)) {
        if (stryMutAct_9fa48("541")) {
          {}
        } else {
          stryCov_9fa48("541");
          if (stryMutAct_9fa48("543") ? false : stryMutAct_9fa48("542") ? true : (stryCov_9fa48("542", "543"), isSetupAction)) {
            if (stryMutAct_9fa48("544")) {
              {}
            } else {
              stryCov_9fa48("544");
              throw new Error(stryMutAct_9fa48("545") ? "" : (stryCov_9fa48("545"), "VAULT_ALREADY_EXISTS"));
            }
          }
          const storedCred = authMetadata.credential as StoredCredential;
          const passwordValid = await this.verifyPassword(password, storedCred);
          if (stryMutAct_9fa48("548") ? false : stryMutAct_9fa48("547") ? true : stryMutAct_9fa48("546") ? passwordValid : (stryCov_9fa48("546", "547", "548"), !passwordValid)) {
            if (stryMutAct_9fa48("549")) {
              {}
            } else {
              stryCov_9fa48("549");
              throw new Error(stryMutAct_9fa48("550") ? "" : (stryCov_9fa48("550"), "Invalid credentials"));
            }
          }
          if (stryMutAct_9fa48("553") ? storedCred.scheme === 'argon2id-v1' : stryMutAct_9fa48("552") ? false : stryMutAct_9fa48("551") ? true : (stryCov_9fa48("551", "552", "553"), storedCred.scheme !== (stryMutAct_9fa48("554") ? "" : (stryCov_9fa48("554"), 'argon2id-v1')))) {
            if (stryMutAct_9fa48("555")) {
              {}
            } else {
              stryCov_9fa48("555");
              const migratedCredential = await this.migrateAuthCredentialToArgon2(password, storedCred);
              const txCredWrite = this.opfsMockDb.transaction(stryMutAct_9fa48("556") ? "" : (stryCov_9fa48("556"), 'vault_metadata'), stryMutAct_9fa48("557") ? "" : (stryCov_9fa48("557"), 'readwrite'));
              await txCredWrite.objectStore(stryMutAct_9fa48("558") ? "" : (stryCov_9fa48("558"), 'vault_metadata')).put(stryMutAct_9fa48("559") ? {} : (stryCov_9fa48("559"), {
                id: stryMutAct_9fa48("560") ? "" : (stryCov_9fa48("560"), 'auth_credential'),
                credential: migratedCredential
              }));
              await txCredWrite.done;
              if (stryMutAct_9fa48("563") ? this.useSQLite || this.sqliteDb : stryMutAct_9fa48("562") ? false : stryMutAct_9fa48("561") ? true : (stryCov_9fa48("561", "562", "563"), this.useSQLite && this.sqliteDb)) {
                if (stryMutAct_9fa48("564")) {
                  {}
                } else {
                  stryCov_9fa48("564");
                  this.sqliteDb.putMetadata(stryMutAct_9fa48("565") ? "" : (stryCov_9fa48("565"), 'auth_credential'), stryMutAct_9fa48("566") ? {} : (stryCov_9fa48("566"), {
                    credential: migratedCredential
                  }));
                }
              }
              authMetadata = stryMutAct_9fa48("567") ? {} : (stryCov_9fa48("567"), {
                ...authMetadata,
                credential: migratedCredential
              });
            }
          }

          // Device Secret Validation
          if (stryMutAct_9fa48("570") ? deviceMetadata.deviceSecretHash : stryMutAct_9fa48("569") ? false : stryMutAct_9fa48("568") ? true : (stryCov_9fa48("568", "569", "570"), deviceMetadata?.deviceSecretHash)) {
            if (stryMutAct_9fa48("571")) {
              {}
            } else {
              stryCov_9fa48("571");
              const secretBuf = new TextEncoder().encode(secretKey);
              const hashBuf = await window.crypto.subtle.digest(stryMutAct_9fa48("572") ? "" : (stryCov_9fa48("572"), 'SHA-256'), toBufferSource(secretBuf));
              const currentHash = bufferToHex(hashBuf);
              if (stryMutAct_9fa48("575") ? currentHash === deviceMetadata.deviceSecretHash : stryMutAct_9fa48("574") ? false : stryMutAct_9fa48("573") ? true : (stryCov_9fa48("573", "574", "575"), currentHash !== deviceMetadata.deviceSecretHash)) {
                if (stryMutAct_9fa48("576")) {
                  {}
                } else {
                  stryCov_9fa48("576");
                  throw new Error(stryMutAct_9fa48("577") ? "" : (stryCov_9fa48("577"), "Invalid device secret key"));
                }
              }
            }
          } else if (stryMutAct_9fa48("581") ? passwordsCount <= 0 : stryMutAct_9fa48("580") ? passwordsCount >= 0 : stryMutAct_9fa48("579") ? false : stryMutAct_9fa48("578") ? true : (stryCov_9fa48("578", "579", "580", "581"), passwordsCount > 0)) {
            if (stryMutAct_9fa48("582")) {
              {}
            } else {
              stryCov_9fa48("582");
              // Migration: Legacy vault without secret hash. 
              // We MUST verify if the derived key actually works by trying to decrypt entries.
              // We use the raw entries store for a faster check.
              const allEntries = await this.opfsMockDb.getAll(stryMutAct_9fa48("583") ? "" : (stryCov_9fa48("583"), 'passwords'));
              const tryDecrypt = async (key: CryptoKey, entries: Record<string, unknown>[]) => {
                if (stryMutAct_9fa48("584")) {
                  {}
                } else {
                  stryCov_9fa48("584");
                  for (const entry of entries) {
                    if (stryMutAct_9fa48("585")) {
                      {}
                    } else {
                      stryCov_9fa48("585");
                      if (stryMutAct_9fa48("588") ? !entry.encrypted_password && !entry.iv : stryMutAct_9fa48("587") ? false : stryMutAct_9fa48("586") ? true : (stryCov_9fa48("586", "587", "588"), (stryMutAct_9fa48("589") ? entry.encrypted_password : (stryCov_9fa48("589"), !entry.encrypted_password)) || (stryMutAct_9fa48("590") ? entry.iv : (stryCov_9fa48("590"), !entry.iv)))) continue;
                      try {
                        if (stryMutAct_9fa48("591")) {
                          {}
                        } else {
                          stryCov_9fa48("591");
                          let cipherArray: Uint8Array;
                          let ivArray: Uint8Array;
                          if (stryMutAct_9fa48("594") ? isLikelyHexUtil(entry.encrypted_password as string) || isLikelyHexUtil(entry.iv as string) : stryMutAct_9fa48("593") ? false : stryMutAct_9fa48("592") ? true : (stryCov_9fa48("592", "593", "594"), isLikelyHexUtil(entry.encrypted_password as string) && isLikelyHexUtil(entry.iv as string))) {
                            if (stryMutAct_9fa48("595")) {
                              {}
                            } else {
                              stryCov_9fa48("595");
                              cipherArray = hexToBuffer(entry.encrypted_password as string);
                              ivArray = hexToBuffer(entry.iv as string);
                            }
                          } else {
                            if (stryMutAct_9fa48("596")) {
                              {}
                            } else {
                              stryCov_9fa48("596");
                              cipherArray = Uint8Array.from(atob(entry.encrypted_password as string), stryMutAct_9fa48("597") ? () => undefined : (stryCov_9fa48("597"), c => c.charCodeAt(0)));
                              ivArray = Uint8Array.from(atob(entry.iv as string), stryMutAct_9fa48("598") ? () => undefined : (stryCov_9fa48("598"), c => c.charCodeAt(0)));
                            }
                          }
                          await window.crypto.subtle.decrypt(stryMutAct_9fa48("599") ? {} : (stryCov_9fa48("599"), {
                            name: stryMutAct_9fa48("600") ? "" : (stryCov_9fa48("600"), "AES-GCM"),
                            iv: toBufferSource(ivArray)
                          }), key, toBufferSource(cipherArray));
                          this.decryptedEntriesCache = null;
                          return stryMutAct_9fa48("601") ? false : (stryCov_9fa48("601"), true); // Success!
                        }
                      } catch {
                        if (stryMutAct_9fa48("602")) {
                          {}
                        } else {
                          stryCov_9fa48("602");
                          continue; // Try next
                        }
                      }
                    }
                  }
                  return stryMutAct_9fa48("605") ? entries.length !== 0 : stryMutAct_9fa48("604") ? false : stryMutAct_9fa48("603") ? true : (stryCov_9fa48("603", "604", "605"), entries.length === 0); // If no entries to test, consider it "verified" for now
                }
              };
              let verified = await tryDecrypt(this.aesKey!, allEntries);

              // Fallback: If user didn't provide a key or provided a wrong one, but they are legacy,
              // we try the old 'secret-128' default once.
              if (stryMutAct_9fa48("608") ? false : stryMutAct_9fa48("607") ? true : stryMutAct_9fa48("606") ? verified : (stryCov_9fa48("606", "607", "608"), !verified)) {
                if (stryMutAct_9fa48("609")) {
                  {}
                } else {
                  stryCov_9fa48("609");
                  const legacySecret = stryMutAct_9fa48("610") ? "" : (stryCov_9fa48("610"), "secret-128");
                  const _legacySaltB64 = await this.deriveMasterKey(password, legacySecret, currentSaltB64);
                  verified = await tryDecrypt(this.aesKey!, allEntries);
                  if (stryMutAct_9fa48("612") ? false : stryMutAct_9fa48("611") ? true : (stryCov_9fa48("611", "612"), verified)) {
                    if (stryMutAct_9fa48("613")) {
                      {}
                    } else {
                      stryCov_9fa48("613");
                      console.log(stryMutAct_9fa48("614") ? "" : (stryCov_9fa48("614"), "Legacy 'secret-128' fallback successful."));
                      secretKey = legacySecret; // Update the secretKey to be saved as the hash
                    }
                  } else {
                    if (stryMutAct_9fa48("615")) {
                      {}
                    } else {
                      stryCov_9fa48("615");
                      // If legacy fallback also fails, restore the original derived key from user's input for error state consistency
                      await this.deriveMasterKey(password, secretKey, currentSaltB64);
                    }
                  }
                }
              }
              if (stryMutAct_9fa48("618") ? !verified || allEntries.length > 0 : stryMutAct_9fa48("617") ? false : stryMutAct_9fa48("616") ? true : (stryCov_9fa48("616", "617", "618"), (stryMutAct_9fa48("619") ? verified : (stryCov_9fa48("619"), !verified)) && (stryMutAct_9fa48("622") ? allEntries.length <= 0 : stryMutAct_9fa48("621") ? allEntries.length >= 0 : stryMutAct_9fa48("620") ? true : (stryCov_9fa48("620", "621", "622"), allEntries.length > 0)))) {
                if (stryMutAct_9fa48("623")) {
                  {}
                } else {
                  stryCov_9fa48("623");
                  throw new Error(stryMutAct_9fa48("624") ? "" : (stryCov_9fa48("624"), "Invalid device secret key for this vault"));
                }
              }

              // Verified! Save the hash for future strict checking.
              const secretBuf = new TextEncoder().encode(secretKey);
              const secretHashBuf = await window.crypto.subtle.digest(stryMutAct_9fa48("625") ? "" : (stryCov_9fa48("625"), 'SHA-256'), toBufferSource(secretBuf));
              const deviceSecretHash = bufferToHex(secretHashBuf);
              const txWrite = this.opfsMockDb.transaction(stryMutAct_9fa48("626") ? "" : (stryCov_9fa48("626"), 'vault_metadata'), stryMutAct_9fa48("627") ? "" : (stryCov_9fa48("627"), 'readwrite'));
              await txWrite.objectStore(stryMutAct_9fa48("628") ? "" : (stryCov_9fa48("628"), 'vault_metadata')).put(stryMutAct_9fa48("629") ? {} : (stryCov_9fa48("629"), {
                id: stryMutAct_9fa48("630") ? "" : (stryCov_9fa48("630"), 'device_config'),
                deviceSecretHash
              }));
              await txWrite.done;

              // SQLite'a da yaz
              if (stryMutAct_9fa48("633") ? this.useSQLite || this.sqliteDb : stryMutAct_9fa48("632") ? false : stryMutAct_9fa48("631") ? true : (stryCov_9fa48("631", "632", "633"), this.useSQLite && this.sqliteDb)) {
                if (stryMutAct_9fa48("634")) {
                  {}
                } else {
                  stryCov_9fa48("634");
                  this.sqliteDb.putMetadata(stryMutAct_9fa48("635") ? "" : (stryCov_9fa48("635"), 'device_config'), stryMutAct_9fa48("636") ? {} : (stryCov_9fa48("636"), {
                    deviceSecretHash
                  }));
                }
              }
            }
          }

          // Write metadata if it was missing 
          if (stryMutAct_9fa48("639") ? false : stryMutAct_9fa48("638") ? true : stryMutAct_9fa48("637") ? metadata : (stryCov_9fa48("637", "638", "639"), !metadata)) {
            if (stryMutAct_9fa48("640")) {
              {}
            } else {
              stryCov_9fa48("640");
              const txWrite = this.opfsMockDb.transaction(stryMutAct_9fa48("641") ? "" : (stryCov_9fa48("641"), 'vault_metadata'), stryMutAct_9fa48("642") ? "" : (stryCov_9fa48("642"), 'readwrite'));
              await txWrite.objectStore(stryMutAct_9fa48("643") ? "" : (stryCov_9fa48("643"), 'vault_metadata')).put(stryMutAct_9fa48("644") ? {} : (stryCov_9fa48("644"), {
                id: stryMutAct_9fa48("645") ? "" : (stryCov_9fa48("645"), 'main_salt'),
                salt: newSaltB64,
                createdAt: new Date().toISOString(),
                version: 2
              }));
              await txWrite.done;
            }
          }
        }
      } else {
        if (stryMutAct_9fa48("646")) {
          {}
        } else {
          stryCov_9fa48("646");
          // ─── FIRST SETUP ───
          // Bu blok SADECE kullanıcı "Başlat" (Initialize) modundayken çalışmalı.
          // "Kilidi Aç" modunda kasa yoksa → hata fırlat.
          if (stryMutAct_9fa48("649") ? false : stryMutAct_9fa48("648") ? true : stryMutAct_9fa48("647") ? isSetupAction : (stryCov_9fa48("647", "648", "649"), !isSetupAction)) {
            if (stryMutAct_9fa48("650")) {
              {}
            } else {
              stryCov_9fa48("650");
              throw new Error(stryMutAct_9fa48("651") ? "" : (stryCov_9fa48("651"), "NO_VAULT_FOUND"));
            }
          }
          const newCredential = await this.createAuthCredential(password);
          const secretBuf = new TextEncoder().encode(secretKey);
          const secretHashBuf = await window.crypto.subtle.digest(stryMutAct_9fa48("652") ? "" : (stryCov_9fa48("652"), 'SHA-256'), toBufferSource(secretBuf));
          const deviceSecretHash = bufferToHex(secretHashBuf);
          const txWrite = this.opfsMockDb.transaction(stryMutAct_9fa48("653") ? "" : (stryCov_9fa48("653"), 'vault_metadata'), stryMutAct_9fa48("654") ? "" : (stryCov_9fa48("654"), 'readwrite'));
          const mStore = txWrite.objectStore(stryMutAct_9fa48("655") ? "" : (stryCov_9fa48("655"), 'vault_metadata'));
          if (stryMutAct_9fa48("658") ? false : stryMutAct_9fa48("657") ? true : stryMutAct_9fa48("656") ? metadata : (stryCov_9fa48("656", "657", "658"), !metadata)) {
            if (stryMutAct_9fa48("659")) {
              {}
            } else {
              stryCov_9fa48("659");
              await mStore.put(stryMutAct_9fa48("660") ? {} : (stryCov_9fa48("660"), {
                id: stryMutAct_9fa48("661") ? "" : (stryCov_9fa48("661"), 'main_salt'),
                salt: newSaltB64,
                createdAt: new Date().toISOString(),
                version: 2
              }));
            }
          }
          await mStore.put(stryMutAct_9fa48("662") ? {} : (stryCov_9fa48("662"), {
            id: stryMutAct_9fa48("663") ? "" : (stryCov_9fa48("663"), 'auth_credential'),
            credential: newCredential
          }));
          await mStore.put(stryMutAct_9fa48("664") ? {} : (stryCov_9fa48("664"), {
            id: stryMutAct_9fa48("665") ? "" : (stryCov_9fa48("665"), 'device_config'),
            deviceSecretHash
          }));
          await txWrite.done;

          // SQLite'a da yaz (dual write)
          if (stryMutAct_9fa48("668") ? this.useSQLite || this.sqliteDb : stryMutAct_9fa48("667") ? false : stryMutAct_9fa48("666") ? true : (stryCov_9fa48("666", "667", "668"), this.useSQLite && this.sqliteDb)) {
            if (stryMutAct_9fa48("669")) {
              {}
            } else {
              stryCov_9fa48("669");
              this.sqliteDb.putMetadata(stryMutAct_9fa48("670") ? "" : (stryCov_9fa48("670"), 'auth_credential'), stryMutAct_9fa48("671") ? {} : (stryCov_9fa48("671"), {
                credential: newCredential
              }));
              this.sqliteDb.putMetadata(stryMutAct_9fa48("672") ? "" : (stryCov_9fa48("672"), 'device_config'), stryMutAct_9fa48("673") ? {} : (stryCov_9fa48("673"), {
                deviceSecretHash
              }));
              if (stryMutAct_9fa48("676") ? false : stryMutAct_9fa48("675") ? true : stryMutAct_9fa48("674") ? metadata : (stryCov_9fa48("674", "675", "676"), !metadata)) {
                if (stryMutAct_9fa48("677")) {
                  {}
                } else {
                  stryCov_9fa48("677");
                  this.sqliteDb.putMetadata(stryMutAct_9fa48("678") ? "" : (stryCov_9fa48("678"), 'main_salt'), stryMutAct_9fa48("679") ? {} : (stryCov_9fa48("679"), {
                    salt: newSaltB64,
                    createdAt: new Date().toISOString(),
                    version: 2
                  }));
                }
              }
            }
          }
        }
      }
      this.isConnected = stryMutAct_9fa48("680") ? false : (stryCov_9fa48("680"), true);

      // Auto-seed if empty for demo (P0-4)
      // Sadece Dev ortamında otomatik örnek veri ekle
      if (stryMutAct_9fa48("682") ? false : stryMutAct_9fa48("681") ? true : (stryCov_9fa48("681", "682"), import.meta.env.DEV)) {
        if (stryMutAct_9fa48("683")) {
          {}
        } else {
          stryCov_9fa48("683");
          const count = await this.opfsMockDb.count(stryMutAct_9fa48("684") ? "" : (stryCov_9fa48("684"), 'passwords'));
          if (stryMutAct_9fa48("687") ? count !== 0 : stryMutAct_9fa48("686") ? false : stryMutAct_9fa48("685") ? true : (stryCov_9fa48("685", "686", "687"), count === 0)) {
            if (stryMutAct_9fa48("688")) {
              {}
            } else {
              stryCov_9fa48("688");
              if (stryMutAct_9fa48("691") ? dbName !== 'aegis_opfs_vault' : stryMutAct_9fa48("690") ? false : stryMutAct_9fa48("689") ? true : (stryCov_9fa48("689", "690", "691"), dbName === (stryMutAct_9fa48("692") ? "" : (stryCov_9fa48("692"), 'aegis_opfs_vault')))) {
                if (stryMutAct_9fa48("693")) {
                  {}
                } else {
                  stryCov_9fa48("693");
                  await this.addPassword(stryMutAct_9fa48("694") ? {} : (stryCov_9fa48("694"), {
                    title: stryMutAct_9fa48("695") ? "" : (stryCov_9fa48("695"), "Google"),
                    category: stryMutAct_9fa48("696") ? "" : (stryCov_9fa48("696"), "Work"),
                    username: stryMutAct_9fa48("697") ? "" : (stryCov_9fa48("697"), "admin@company.com"),
                    pass: stryMutAct_9fa48("698") ? "" : (stryCov_9fa48("698"), "p@ssw0rd123!"),
                    website: stryMutAct_9fa48("699") ? "" : (stryCov_9fa48("699"), "https://google.com")
                  }));
                  await this.addPassword(stryMutAct_9fa48("700") ? {} : (stryCov_9fa48("700"), {
                    title: stryMutAct_9fa48("701") ? "" : (stryCov_9fa48("701"), "Bank of America"),
                    category: stryMutAct_9fa48("702") ? "" : (stryCov_9fa48("702"), "Bank"),
                    username: stryMutAct_9fa48("703") ? "" : (stryCov_9fa48("703"), "user123"),
                    pass: stryMutAct_9fa48("704") ? "" : (stryCov_9fa48("704"), "S3cur3B@nk!99"),
                    website: stryMutAct_9fa48("705") ? "" : (stryCov_9fa48("705"), "https://bankofamerica.com")
                  }));
                }
              } else {
                if (stryMutAct_9fa48("706")) {
                  {}
                } else {
                  stryCov_9fa48("706");
                  await this.addPassword(stryMutAct_9fa48("707") ? {} : (stryCov_9fa48("707"), {
                    title: stryMutAct_9fa48("708") ? "" : (stryCov_9fa48("708"), "Instagram"),
                    category: stryMutAct_9fa48("709") ? "" : (stryCov_9fa48("709"), "Social"),
                    username: stryMutAct_9fa48("710") ? "" : (stryCov_9fa48("710"), "traveler_99"),
                    pass: stryMutAct_9fa48("711") ? "" : (stryCov_9fa48("711"), "Summer2023!"),
                    website: stryMutAct_9fa48("712") ? "" : (stryCov_9fa48("712"), "https://instagram.com")
                  }));
                  await this.addPassword(stryMutAct_9fa48("713") ? {} : (stryCov_9fa48("713"), {
                    title: stryMutAct_9fa48("714") ? "" : (stryCov_9fa48("714"), "Netflix"),
                    category: stryMutAct_9fa48("715") ? "" : (stryCov_9fa48("715"), "Entertainment"),
                    username: stryMutAct_9fa48("716") ? "" : (stryCov_9fa48("716"), "family_share"),
                    pass: stryMutAct_9fa48("717") ? "" : (stryCov_9fa48("717"), "NetflixAndChill"),
                    website: stryMutAct_9fa48("718") ? "" : (stryCov_9fa48("718"), "https://netflix.com")
                  }));
                }
              }
            }
          }
        }
      }
      console.log(stryMutAct_9fa48("719") ? `` : (stryCov_9fa48("719"), `SQLCipher: PRAGMA key uygulandı. [${dbName}] bağlantısı hazır.`));

      // ─── IDB → SQLite Migrasyon ───
      if (stryMutAct_9fa48("722") ? this.useSQLite && this.sqliteDb || this.opfsMockDb : stryMutAct_9fa48("721") ? false : stryMutAct_9fa48("720") ? true : (stryCov_9fa48("720", "721", "722"), (stryMutAct_9fa48("724") ? this.useSQLite || this.sqliteDb : stryMutAct_9fa48("723") ? true : (stryCov_9fa48("723", "724"), this.useSQLite && this.sqliteDb)) && this.opfsMockDb)) {
        if (stryMutAct_9fa48("725")) {
          {}
        } else {
          stryCov_9fa48("725");
          const sqliteCount = this.sqliteDb.countPasswords();
          const idbCount = await this.opfsMockDb.count(stryMutAct_9fa48("726") ? "" : (stryCov_9fa48("726"), 'passwords'));
          if (stryMutAct_9fa48("729") ? sqliteCount === 0 || idbCount > 0 : stryMutAct_9fa48("728") ? false : stryMutAct_9fa48("727") ? true : (stryCov_9fa48("727", "728", "729"), (stryMutAct_9fa48("731") ? sqliteCount !== 0 : stryMutAct_9fa48("730") ? true : (stryCov_9fa48("730", "731"), sqliteCount === 0)) && (stryMutAct_9fa48("734") ? idbCount <= 0 : stryMutAct_9fa48("733") ? idbCount >= 0 : stryMutAct_9fa48("732") ? true : (stryCov_9fa48("732", "733", "734"), idbCount > 0)))) {
            if (stryMutAct_9fa48("735")) {
              {}
            } else {
              stryCov_9fa48("735");
              console.log(stryMutAct_9fa48("736") ? `` : (stryCov_9fa48("736"), `[SQLite-OPFS] 🔄 IDB → SQLite migrasyon başlıyor (${idbCount} girdi)...`));
              try {
                if (stryMutAct_9fa48("737")) {
                  {}
                } else {
                  stryCov_9fa48("737");
                  // 1. Parolaları migrate et
                  const allIdbEntries: VaultEntry[] = await this.opfsMockDb.getAll(stryMutAct_9fa48("738") ? "" : (stryCov_9fa48("738"), 'passwords'));
                  for (const entry of allIdbEntries) {
                    if (stryMutAct_9fa48("739")) {
                      {}
                    } else {
                      stryCov_9fa48("739");
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      this.sqliteDb.putPassword(entry as any);
                    }
                  }

                  // 2. Metadata'yı migrate et
                  const metadataKeys = stryMutAct_9fa48("740") ? [] : (stryCov_9fa48("740"), [stryMutAct_9fa48("741") ? "" : (stryCov_9fa48("741"), 'main_salt'), stryMutAct_9fa48("742") ? "" : (stryCov_9fa48("742"), 'auth_credential'), stryMutAct_9fa48("743") ? "" : (stryCov_9fa48("743"), 'device_config'), stryMutAct_9fa48("744") ? "" : (stryCov_9fa48("744"), 'security_pins')]);
                  for (const key of metadataKeys) {
                    if (stryMutAct_9fa48("745")) {
                      {}
                    } else {
                      stryCov_9fa48("745");
                      try {
                        if (stryMutAct_9fa48("746")) {
                          {}
                        } else {
                          stryCov_9fa48("746");
                          const data = await this.opfsMockDb.get(stryMutAct_9fa48("747") ? "" : (stryCov_9fa48("747"), 'vault_metadata'), key);
                          if (stryMutAct_9fa48("749") ? false : stryMutAct_9fa48("748") ? true : (stryCov_9fa48("748", "749"), data)) {
                            if (stryMutAct_9fa48("750")) {
                              {}
                            } else {
                              stryCov_9fa48("750");
                              this.sqliteDb.putMetadata(key, data);
                            }
                          }
                        }
                      } catch {/* Key olmayabilir */}
                    }
                  }

                  // 3. Attachment'ları migrate et
                  const allAttachments = await this.opfsMockDb.getAll(stryMutAct_9fa48("751") ? "" : (stryCov_9fa48("751"), 'attachments'));
                  for (const att of allAttachments) {
                    if (stryMutAct_9fa48("752")) {
                      {}
                    } else {
                      stryCov_9fa48("752");
                      this.sqliteDb.putAttachment(att.id, att.entryId, att.iv instanceof Uint8Array ? att.iv : new Uint8Array(att.iv), att.encrypted_data);
                    }
                  }

                  // 4. OPFS'ye kalıcı kaydet
                  await this.sqliteDb.flushToOPFS();
                  console.log(stryMutAct_9fa48("753") ? `` : (stryCov_9fa48("753"), `[SQLite-OPFS] ✅ Migrasyon tamamlandı: ${allIdbEntries.length} girdi, ${allAttachments.length} ek dosya.`));
                }
              } catch (err) {
                if (stryMutAct_9fa48("754")) {
                  {}
                } else {
                  stryCov_9fa48("754");
                  console.error(stryMutAct_9fa48("755") ? `` : (stryCov_9fa48("755"), `[SQLite-OPFS] ❌ Migrasyon hatası:`), err);
                  // Hata durumunda IDB fallback'e geç
                  this.useSQLite = stryMutAct_9fa48("756") ? true : (stryCov_9fa48("756"), false);
                  this.sqliteDb = null;
                }
              }
            }
          }
        }
      }

      // Perform auto-cleanup of trash older than 30 days
      await this.cleanupTrash();
    }
  }
  async wipeAllData(): Promise<void> {
    if (stryMutAct_9fa48("757")) {
      {}
    } else {
      stryCov_9fa48("757");
      console.warn(stryMutAct_9fa48("758") ? "" : (stryCov_9fa48("758"), "CRITICAL: Full factory reset starting..."));

      // 1. SQLite'ı flush ETMEDEN wipe et (eski veriyi tekrar yazmayı önle)
      if (stryMutAct_9fa48("760") ? false : stryMutAct_9fa48("759") ? true : (stryCov_9fa48("759", "760"), this.sqliteDb)) {
        if (stryMutAct_9fa48("761")) {
          {}
        } else {
          stryCov_9fa48("761");
          try {
            if (stryMutAct_9fa48("762")) {
              {}
            } else {
              stryCov_9fa48("762");
              await this.sqliteDb.wipeAll(); // tabloları temizler + OPFS dosyasını siler
            }
          } catch (e) {
            if (stryMutAct_9fa48("763")) {
              {}
            } else {
              stryCov_9fa48("763");
              console.warn(stryMutAct_9fa48("764") ? "" : (stryCov_9fa48("764"), '[Wipe] SQLite wipe error:'), e);
            }
          }
          this.sqliteDb = null;
          this.useSQLite = stryMutAct_9fa48("765") ? true : (stryCov_9fa48("765"), false);
        }
      }

      // 2. Bellek temizliği (AES key vb.)
      if (stryMutAct_9fa48("767") ? false : stryMutAct_9fa48("766") ? true : (stryCov_9fa48("766", "767"), this.sensitiveMaterial)) {
        if (stryMutAct_9fa48("768")) {
          {}
        } else {
          stryCov_9fa48("768");
          window.crypto.getRandomValues(this.sensitiveMaterial);
          this.sensitiveMaterial = null;
        }
      }
      this.aesKey = null;

      // 3. IDB bağlantısını kapat
      if (stryMutAct_9fa48("770") ? false : stryMutAct_9fa48("769") ? true : (stryCov_9fa48("769", "770"), this.opfsMockDb)) {
        if (stryMutAct_9fa48("771")) {
          {}
        } else {
          stryCov_9fa48("771");
          this.opfsMockDb.close();
          this.opfsMockDb = null;
        }
      }
      this.isConnected = stryMutAct_9fa48("772") ? true : (stryCov_9fa48("772"), false);

      // 4. TÜM OPFS (.sqlite) dosyalarını sil
      await clearAllOPFSFiles();

      // 5. TÜM Aegis veritabanlarını IndexedDB'den sil
      const dbs = await window.indexedDB.databases();
      for (const db of dbs) {
        if (stryMutAct_9fa48("773")) {
          {}
        } else {
          stryCov_9fa48("773");
          if (stryMutAct_9fa48("776") ? db.name || db.name.startsWith('aegis_') : stryMutAct_9fa48("775") ? false : stryMutAct_9fa48("774") ? true : (stryCov_9fa48("774", "775", "776"), db.name && (stryMutAct_9fa48("777") ? db.name.endsWith('aegis_') : (stryCov_9fa48("777"), db.name.startsWith(stryMutAct_9fa48("778") ? "" : (stryCov_9fa48("778"), 'aegis_')))))) {
            if (stryMutAct_9fa48("779")) {
              {}
            } else {
              stryCov_9fa48("779");
              console.log(stryMutAct_9fa48("780") ? `` : (stryCov_9fa48("780"), `[Wipe] Deleting IDB: ${db.name}`));
              await window.indexedDB.deleteDatabase(db.name);
            }
          }
        }
      }

      // 6. LocalStorage temizle
      localStorage.removeItem(stryMutAct_9fa48("781") ? "" : (stryCov_9fa48("781"), 'aegis_passkey_id'));
      localStorage.removeItem(stryMutAct_9fa48("782") ? "" : (stryCov_9fa48("782"), 'aegis_passkey_data'));
      localStorage.removeItem(stryMutAct_9fa48("783") ? "" : (stryCov_9fa48("783"), 'aegis_prf_salt'));
      localStorage.removeItem(stryMutAct_9fa48("784") ? "" : (stryCov_9fa48("784"), 'aegis_passkey_meta'));
      localStorage.removeItem(stryMutAct_9fa48("785") ? "" : (stryCov_9fa48("785"), 'aegis_passkey_bindings_v1'));
      localStorage.removeItem(stryMutAct_9fa48("786") ? "" : (stryCov_9fa48("786"), 'aegis_vault_profiles'));
      localStorage.removeItem(stryMutAct_9fa48("787") ? "" : (stryCov_9fa48("787"), 'aegis_active_vault'));
      localStorage.removeItem(stryMutAct_9fa48("788") ? "" : (stryCov_9fa48("788"), 'aegis_totp_vault_mode'));
      localStorage.removeItem(stryMutAct_9fa48("789") ? "" : (stryCov_9fa48("789"), 'aegis_totp_vault_id'));
      console.warn(stryMutAct_9fa48("790") ? "" : (stryCov_9fa48("790"), "CRITICAL: All vault data has been wiped (Deep Clean)."));
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 🔒 Güvenli PIN Depolama (AES-GCM ile şifrelenmiş)
  // PIN'ler vault_metadata store'unda şifreli saklanır.
  // ─────────────────────────────────────────────────────────────

  async saveSecurityPins(duressPin: string, killPin: string): Promise<void> {
    if (stryMutAct_9fa48("791")) {
      {}
    } else {
      stryCov_9fa48("791");
      if (stryMutAct_9fa48("794") ? !this.aesKey && !this.opfsMockDb && !this.sqliteDb : stryMutAct_9fa48("793") ? false : stryMutAct_9fa48("792") ? true : (stryCov_9fa48("792", "793", "794"), (stryMutAct_9fa48("795") ? this.aesKey : (stryCov_9fa48("795"), !this.aesKey)) || (stryMutAct_9fa48("797") ? !this.opfsMockDb || !this.sqliteDb : stryMutAct_9fa48("796") ? false : (stryCov_9fa48("796", "797"), (stryMutAct_9fa48("798") ? this.opfsMockDb : (stryCov_9fa48("798"), !this.opfsMockDb)) && (stryMutAct_9fa48("799") ? this.sqliteDb : (stryCov_9fa48("799"), !this.sqliteDb)))))) throw new Error(stryMutAct_9fa48("800") ? "" : (stryCov_9fa48("800"), "Vault not initialized"));
      const enc = new TextEncoder();
      const payload = JSON.stringify(stryMutAct_9fa48("801") ? {} : (stryCov_9fa48("801"), {
        duressPin,
        killPin
      }));
      const iv = generateRandomBytes(12);
      const cipherBuffer = await window.crypto.subtle.encrypt(stryMutAct_9fa48("802") ? {} : (stryCov_9fa48("802"), {
        name: stryMutAct_9fa48("803") ? "" : (stryCov_9fa48("803"), "AES-GCM"),
        iv: toBufferSource(iv)
      }), this.aesKey, toBufferSource(enc.encode(payload)));
      const pinData = stryMutAct_9fa48("804") ? {} : (stryCov_9fa48("804"), {
        id: stryMutAct_9fa48("805") ? "" : (stryCov_9fa48("805"), 'security_pins'),
        encrypted_data: bufferToHex(cipherBuffer),
        iv: bufferToHex(iv)
      });
      if (stryMutAct_9fa48("808") ? this.useSQLite || this.sqliteDb : stryMutAct_9fa48("807") ? false : stryMutAct_9fa48("806") ? true : (stryCov_9fa48("806", "807", "808"), this.useSQLite && this.sqliteDb)) {
        if (stryMutAct_9fa48("809")) {
          {}
        } else {
          stryCov_9fa48("809");
          this.sqliteDb.putMetadata(stryMutAct_9fa48("810") ? "" : (stryCov_9fa48("810"), 'security_pins'), pinData);
        }
      }
      if (stryMutAct_9fa48("812") ? false : stryMutAct_9fa48("811") ? true : (stryCov_9fa48("811", "812"), this.opfsMockDb)) {
        if (stryMutAct_9fa48("813")) {
          {}
        } else {
          stryCov_9fa48("813");
          const tx = this.opfsMockDb.transaction(stryMutAct_9fa48("814") ? "" : (stryCov_9fa48("814"), 'vault_metadata'), stryMutAct_9fa48("815") ? "" : (stryCov_9fa48("815"), 'readwrite'));
          await tx.objectStore(stryMutAct_9fa48("816") ? "" : (stryCov_9fa48("816"), 'vault_metadata')).put(pinData);
          await tx.done;
        }
      }
    }
  }
  async getSecurityPins(): Promise<{
    duressPin: string;
    killPin: string;
  }> {
    if (stryMutAct_9fa48("817")) {
      {}
    } else {
      stryCov_9fa48("817");
      if (stryMutAct_9fa48("820") ? !this.aesKey && !this.opfsMockDb && !this.sqliteDb : stryMutAct_9fa48("819") ? false : stryMutAct_9fa48("818") ? true : (stryCov_9fa48("818", "819", "820"), (stryMutAct_9fa48("821") ? this.aesKey : (stryCov_9fa48("821"), !this.aesKey)) || (stryMutAct_9fa48("823") ? !this.opfsMockDb || !this.sqliteDb : stryMutAct_9fa48("822") ? false : (stryCov_9fa48("822", "823"), (stryMutAct_9fa48("824") ? this.opfsMockDb : (stryCov_9fa48("824"), !this.opfsMockDb)) && (stryMutAct_9fa48("825") ? this.sqliteDb : (stryCov_9fa48("825"), !this.sqliteDb)))))) return stryMutAct_9fa48("826") ? {} : (stryCov_9fa48("826"), {
        duressPin: stryMutAct_9fa48("827") ? "Stryker was here!" : (stryCov_9fa48("827"), ''),
        killPin: stryMutAct_9fa48("828") ? "Stryker was here!" : (stryCov_9fa48("828"), '')
      });
      try {
        if (stryMutAct_9fa48("829")) {
          {}
        } else {
          stryCov_9fa48("829");
          let record: Record<string, unknown> | null = null;
          if (stryMutAct_9fa48("832") ? this.useSQLite || this.sqliteDb : stryMutAct_9fa48("831") ? false : stryMutAct_9fa48("830") ? true : (stryCov_9fa48("830", "831", "832"), this.useSQLite && this.sqliteDb)) {
            if (stryMutAct_9fa48("833")) {
              {}
            } else {
              stryCov_9fa48("833");
              record = this.sqliteDb.getMetadata(stryMutAct_9fa48("834") ? "" : (stryCov_9fa48("834"), 'security_pins'));
            }
          } else if (stryMutAct_9fa48("836") ? false : stryMutAct_9fa48("835") ? true : (stryCov_9fa48("835", "836"), this.opfsMockDb)) {
            if (stryMutAct_9fa48("837")) {
              {}
            } else {
              stryCov_9fa48("837");
              record = await this.opfsMockDb.get(stryMutAct_9fa48("838") ? "" : (stryCov_9fa48("838"), 'vault_metadata'), stryMutAct_9fa48("839") ? "" : (stryCov_9fa48("839"), 'security_pins'));
            }
          }
          if (stryMutAct_9fa48("842") ? (!record || !record.encrypted_data) && !record.iv : stryMutAct_9fa48("841") ? false : stryMutAct_9fa48("840") ? true : (stryCov_9fa48("840", "841", "842"), (stryMutAct_9fa48("844") ? !record && !record.encrypted_data : stryMutAct_9fa48("843") ? false : (stryCov_9fa48("843", "844"), (stryMutAct_9fa48("845") ? record : (stryCov_9fa48("845"), !record)) || (stryMutAct_9fa48("846") ? record.encrypted_data : (stryCov_9fa48("846"), !record.encrypted_data)))) || (stryMutAct_9fa48("847") ? record.iv : (stryCov_9fa48("847"), !record.iv)))) {
            if (stryMutAct_9fa48("848")) {
              {}
            } else {
              stryCov_9fa48("848");
              return stryMutAct_9fa48("849") ? {} : (stryCov_9fa48("849"), {
                duressPin: stryMutAct_9fa48("850") ? "Stryker was here!" : (stryCov_9fa48("850"), ''),
                killPin: stryMutAct_9fa48("851") ? "Stryker was here!" : (stryCov_9fa48("851"), '')
              });
            }
          }
          const cipherArray = hexToBuffer(record.encrypted_data as string);
          const ivArray = hexToBuffer(record.iv as string);
          const plainBuffer = await window.crypto.subtle.decrypt(stryMutAct_9fa48("852") ? {} : (stryCov_9fa48("852"), {
            name: stryMutAct_9fa48("853") ? "" : (stryCov_9fa48("853"), "AES-GCM"),
            iv: toBufferSource(ivArray)
          }), this.aesKey, toBufferSource(cipherArray));
          const dec = new TextDecoder();
          return JSON.parse(dec.decode(plainBuffer));
        }
      } catch {
        if (stryMutAct_9fa48("854")) {
          {}
        } else {
          stryCov_9fa48("854");
          return stryMutAct_9fa48("855") ? {} : (stryCov_9fa48("855"), {
            duressPin: stryMutAct_9fa48("856") ? "Stryker was here!" : (stryCov_9fa48("856"), ''),
            killPin: stryMutAct_9fa48("857") ? "Stryker was here!" : (stryCov_9fa48("857"), '')
          });
        }
      }
    }
  }
  private async checkOpfsPersistence(dbName: string) {
    if (stryMutAct_9fa48("858")) {
      {}
    } else {
      stryCov_9fa48("858");
      console.log(stryMutAct_9fa48("859") ? `` : (stryCov_9fa48("859"), `[SQLCipher WASM] OPFS Volume Check for ${dbName}...`));
      const dbs = await window.indexedDB.databases();
      const exists = stryMutAct_9fa48("860") ? dbs.every(db => db.name === dbName) : (stryCov_9fa48("860"), dbs.some(stryMutAct_9fa48("861") ? () => undefined : (stryCov_9fa48("861"), db => stryMutAct_9fa48("864") ? db.name !== dbName : stryMutAct_9fa48("863") ? false : stryMutAct_9fa48("862") ? true : (stryCov_9fa48("862", "863", "864"), db.name === dbName))));
      if (stryMutAct_9fa48("866") ? false : stryMutAct_9fa48("865") ? true : (stryCov_9fa48("865", "866"), exists)) {
        if (stryMutAct_9fa48("867")) {
          {}
        } else {
          stryCov_9fa48("867");
          console.log(stryMutAct_9fa48("868") ? `` : (stryCov_9fa48("868"), `[SQLCipher WASM] ${dbName} veritabanı başarıyla tekrar yüklendi.`));
        }
      } else {
        if (stryMutAct_9fa48("869")) {
          {}
        } else {
          stryCov_9fa48("869");
          console.log(stryMutAct_9fa48("870") ? `` : (stryCov_9fa48("870"), `[SQLCipher WASM] Yeni ${dbName} veritabanı oluşturuluyor...`));
        }
      }
    }
  }
  async addPassword(entry: Partial<VaultEntry>) {
    if (stryMutAct_9fa48("871")) {
      {}
    } else {
      stryCov_9fa48("871");
      if (stryMutAct_9fa48("874") ? !this.aesKey && !this.opfsMockDb && !this.sqliteDb : stryMutAct_9fa48("873") ? false : stryMutAct_9fa48("872") ? true : (stryCov_9fa48("872", "873", "874"), (stryMutAct_9fa48("875") ? this.aesKey : (stryCov_9fa48("875"), !this.aesKey)) || (stryMutAct_9fa48("877") ? !this.opfsMockDb || !this.sqliteDb : stryMutAct_9fa48("876") ? false : (stryCov_9fa48("876", "877"), (stryMutAct_9fa48("878") ? this.opfsMockDb : (stryCov_9fa48("878"), !this.opfsMockDb)) && (stryMutAct_9fa48("879") ? this.sqliteDb : (stryCov_9fa48("879"), !this.sqliteDb)))))) throw new Error(stryMutAct_9fa48("880") ? "" : (stryCov_9fa48("880"), "Vault not initialized"));
      const enc = new TextEncoder();
      const iv = generateRandomBytes(12);
      const cipherBuffer = await window.crypto.subtle.encrypt(stryMutAct_9fa48("881") ? {} : (stryCov_9fa48("881"), {
        name: stryMutAct_9fa48("882") ? "" : (stryCov_9fa48("882"), "AES-GCM"),
        iv: toBufferSource(iv)
      }), this.aesKey, toBufferSource(enc.encode(stryMutAct_9fa48("885") ? entry.pass && "" : stryMutAct_9fa48("884") ? false : stryMutAct_9fa48("883") ? true : (stryCov_9fa48("883", "884", "885"), entry.pass || (stryMutAct_9fa48("886") ? "Stryker was here!" : (stryCov_9fa48("886"), ""))))));
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
        search_index
      } = await this.buildMetadataAtRest(stryMutAct_9fa48("889") ? entry.title && 'Untitled' : stryMutAct_9fa48("888") ? false : stryMutAct_9fa48("887") ? true : (stryCov_9fa48("887", "888", "889"), entry.title || (stryMutAct_9fa48("890") ? "" : (stryCov_9fa48("890"), 'Untitled'))), stryMutAct_9fa48("893") ? entry.username && '' : stryMutAct_9fa48("892") ? false : stryMutAct_9fa48("891") ? true : (stryCov_9fa48("891", "892", "893"), entry.username || (stryMutAct_9fa48("894") ? "Stryker was here!" : (stryCov_9fa48("894"), ''))), stryMutAct_9fa48("897") ? entry.website && '' : stryMutAct_9fa48("896") ? false : stryMutAct_9fa48("895") ? true : (stryCov_9fa48("895", "896", "897"), entry.website || (stryMutAct_9fa48("898") ? "Stryker was here!" : (stryCov_9fa48("898"), ''))), stryMutAct_9fa48("901") ? entry.category && 'General' : stryMutAct_9fa48("900") ? false : stryMutAct_9fa48("899") ? true : (stryCov_9fa48("899", "900", "901"), entry.category || (stryMutAct_9fa48("902") ? "" : (stryCov_9fa48("902"), 'General'))), stryMutAct_9fa48("905") ? entry.tags && [] : stryMutAct_9fa48("904") ? false : stryMutAct_9fa48("903") ? true : (stryCov_9fa48("903", "904", "905"), entry.tags || (stryMutAct_9fa48("906") ? ["Stryker was here"] : (stryCov_9fa48("906"), []))));
      const newEntry: VaultEntry = stryMutAct_9fa48("907") ? {} : (stryCov_9fa48("907"), {
        id: stryMutAct_9fa48("910") ? entry.id && Math.floor(Date.now() * 1000 + Math.random() * 1000) : stryMutAct_9fa48("909") ? false : stryMutAct_9fa48("908") ? true : (stryCov_9fa48("908", "909", "910"), entry.id || Math.floor(stryMutAct_9fa48("911") ? Date.now() * 1000 - Math.random() * 1000 : (stryCov_9fa48("911"), (stryMutAct_9fa48("912") ? Date.now() / 1000 : (stryCov_9fa48("912"), Date.now() * 1000)) + (stryMutAct_9fa48("913") ? Math.random() / 1000 : (stryCov_9fa48("913"), Math.random() * 1000))))),
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
        search_index: stryMutAct_9fa48("916") ? search_index as string[] && [] : stryMutAct_9fa48("915") ? false : stryMutAct_9fa48("914") ? true : (stryCov_9fa48("914", "915", "916"), search_index as string[] || (stryMutAct_9fa48("917") ? ["Stryker was here"] : (stryCov_9fa48("917"), []))),
        encrypted_password: bufferToHex(cipherBuffer),
        iv: bufferToHex(iv),
        updated_at: new Date().toISOString(),
        strength: this.calculateStrength(stryMutAct_9fa48("920") ? entry.pass && '' : stryMutAct_9fa48("919") ? false : stryMutAct_9fa48("918") ? true : (stryCov_9fa48("918", "919", "920"), entry.pass || (stryMutAct_9fa48("921") ? "Stryker was here!" : (stryCov_9fa48("921"), '')))),
        pwned_count: stryMutAct_9fa48("924") ? entry.pwned_count && 0 : stryMutAct_9fa48("923") ? false : stryMutAct_9fa48("922") ? true : (stryCov_9fa48("922", "923", "924"), entry.pwned_count || 0)
      });

      // 🔐 TOTP Secret şifreleme (varsa)
      if (stryMutAct_9fa48("926") ? false : stryMutAct_9fa48("925") ? true : (stryCov_9fa48("925", "926"), entry.totpSecret)) {
        if (stryMutAct_9fa48("927")) {
          {}
        } else {
          stryCov_9fa48("927");
          const totpIv = generateRandomBytes(12);
          const totpCipher = await window.crypto.subtle.encrypt(stryMutAct_9fa48("928") ? {} : (stryCov_9fa48("928"), {
            name: stryMutAct_9fa48("929") ? "" : (stryCov_9fa48("929"), "AES-GCM"),
            iv: toBufferSource(totpIv)
          }), this.aesKey, toBufferSource(enc.encode(entry.totpSecret)));
          newEntry.totp_secret = bufferToHex(totpCipher);
          newEntry.totp_iv = bufferToHex(totpIv);
          newEntry.totp_issuer = stryMutAct_9fa48("932") ? entry.totp_issuer && '' : stryMutAct_9fa48("931") ? false : stryMutAct_9fa48("930") ? true : (stryCov_9fa48("930", "931", "932"), entry.totp_issuer || (stryMutAct_9fa48("933") ? "Stryker was here!" : (stryCov_9fa48("933"), '')));
          newEntry.totp_algorithm = stryMutAct_9fa48("936") ? entry.totp_algorithm && 'SHA-1' : stryMutAct_9fa48("935") ? false : stryMutAct_9fa48("934") ? true : (stryCov_9fa48("934", "935", "936"), entry.totp_algorithm || (stryMutAct_9fa48("937") ? "" : (stryCov_9fa48("937"), 'SHA-1')));
          newEntry.totp_digits = stryMutAct_9fa48("940") ? entry.totp_digits && 6 : stryMutAct_9fa48("939") ? false : stryMutAct_9fa48("938") ? true : (stryCov_9fa48("938", "939", "940"), entry.totp_digits || 6);
          newEntry.totp_period = stryMutAct_9fa48("943") ? entry.totp_period && 30 : stryMutAct_9fa48("942") ? false : stryMutAct_9fa48("941") ? true : (stryCov_9fa48("941", "942", "943"), entry.totp_period || 30);
        }
      } else if (stryMutAct_9fa48("945") ? false : stryMutAct_9fa48("944") ? true : (stryCov_9fa48("944", "945"), entry.totp_secret)) {
        if (stryMutAct_9fa48("946")) {
          {}
        } else {
          stryCov_9fa48("946");
          newEntry.totp_secret = entry.totp_secret;
          newEntry.totp_iv = entry.totp_iv;
          newEntry.totp_issuer = entry.totp_issuer;
          newEntry.totp_algorithm = entry.totp_algorithm;
          newEntry.totp_digits = entry.totp_digits;
          newEntry.totp_period = entry.totp_period;
        }
      }

      // 🔐 Secure Notes şifreleme (varsa)
      if (stryMutAct_9fa48("949") ? entry.notes || entry.notes.trim() : stryMutAct_9fa48("948") ? false : stryMutAct_9fa48("947") ? true : (stryCov_9fa48("947", "948", "949"), entry.notes && (stryMutAct_9fa48("950") ? entry.notes : (stryCov_9fa48("950"), entry.notes.trim())))) {
        if (stryMutAct_9fa48("951")) {
          {}
        } else {
          stryCov_9fa48("951");
          const notesIv = generateRandomBytes(12);
          const notesCipher = await window.crypto.subtle.encrypt(stryMutAct_9fa48("952") ? {} : (stryCov_9fa48("952"), {
            name: stryMutAct_9fa48("953") ? "" : (stryCov_9fa48("953"), "AES-GCM"),
            iv: toBufferSource(notesIv)
          }), this.aesKey, toBufferSource(enc.encode(entry.notes)));
          newEntry.encrypted_notes = bufferToHex(notesCipher);
          newEntry.notes_iv = bufferToHex(notesIv);
        }
      } else if (stryMutAct_9fa48("955") ? false : stryMutAct_9fa48("954") ? true : (stryCov_9fa48("954", "955"), entry.encrypted_notes)) {
        if (stryMutAct_9fa48("956")) {
          {}
        } else {
          stryCov_9fa48("956");
          newEntry.encrypted_notes = entry.encrypted_notes;
          newEntry.notes_iv = entry.notes_iv;
        }
      }
      if (stryMutAct_9fa48("958") ? false : stryMutAct_9fa48("957") ? true : (stryCov_9fa48("957", "958"), entry.passkeyMetadata)) {
        if (stryMutAct_9fa48("959")) {
          {}
        } else {
          stryCov_9fa48("959");
          const passkeyMetaIv = generateRandomBytes(12);
          const passkeyMetaCipher = await window.crypto.subtle.encrypt(stryMutAct_9fa48("960") ? {} : (stryCov_9fa48("960"), {
            name: stryMutAct_9fa48("961") ? "" : (stryCov_9fa48("961"), "AES-GCM"),
            iv: toBufferSource(passkeyMetaIv)
          }), this.aesKey!, toBufferSource(enc.encode(JSON.stringify(entry.passkeyMetadata))));
          newEntry.encrypted_passkey_meta = bufferToHex(passkeyMetaCipher);
          newEntry.passkey_meta_iv = bufferToHex(passkeyMetaIv);
        }
      } else if (stryMutAct_9fa48("963") ? false : stryMutAct_9fa48("962") ? true : (stryCov_9fa48("962", "963"), entry.encrypted_passkey_meta)) {
        if (stryMutAct_9fa48("964")) {
          {}
        } else {
          stryCov_9fa48("964");
          newEntry.encrypted_passkey_meta = entry.encrypted_passkey_meta;
          newEntry.passkey_meta_iv = entry.passkey_meta_iv;
        }
      }
      if (stryMutAct_9fa48("966") ? false : stryMutAct_9fa48("965") ? true : (stryCov_9fa48("965", "966"), entry.attachments)) {
        if (stryMutAct_9fa48("967")) {
          {}
        } else {
          stryCov_9fa48("967");
          newEntry.attachments = await this.encryptAttachmentMetadataList(entry.attachments as VaultAttachmentMeta[]);
        }
      }

      // Dual-write: SQLite (primary) + IDB (fallback)
      if (stryMutAct_9fa48("970") ? this.useSQLite || this.sqliteDb : stryMutAct_9fa48("969") ? false : stryMutAct_9fa48("968") ? true : (stryCov_9fa48("968", "969", "970"), this.useSQLite && this.sqliteDb)) {
        if (stryMutAct_9fa48("971")) {
          {}
        } else {
          stryCov_9fa48("971");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.sqliteDb.putPassword(newEntry as any);
        }
      }
      if (stryMutAct_9fa48("973") ? false : stryMutAct_9fa48("972") ? true : (stryCov_9fa48("972", "973"), this.opfsMockDb)) {
        if (stryMutAct_9fa48("974")) {
          {}
        } else {
          stryCov_9fa48("974");
          await this.opfsMockDb.put(stryMutAct_9fa48("975") ? "" : (stryCov_9fa48("975"), 'passwords'), newEntry);
        }
      }

      // Invalidate Cache after mutation
      this.decryptedEntriesCache = null;
      return newEntry.id;
    }
  }

  /**
   * Mevcut bir girişi günceller.
   * addPassword'u mevcut id ile çağırır.
   */
  async updatePassword(id: number, entry: Partial<VaultEntry>) {
    if (stryMutAct_9fa48("976")) {
      {}
    } else {
      stryCov_9fa48("976");
      return this.addPassword(stryMutAct_9fa48("977") ? {} : (stryCov_9fa48("977"), {
        ...entry,
        id
      }));
    }
  }
  async getPasswords(searchQuery: string = stryMutAct_9fa48("978") ? "Stryker was here!" : (stryCov_9fa48("978"), ""), categoryFilter: string = stryMutAct_9fa48("979") ? "Stryker was here!" : (stryCov_9fa48("979"), ""), isTrash: boolean = stryMutAct_9fa48("980") ? true : (stryCov_9fa48("980"), false), searchScope: "all" | "title" | "username" | "tags" = stryMutAct_9fa48("981") ? "" : (stryCov_9fa48("981"), "all")): Promise<VaultEntry[]> {
    if (stryMutAct_9fa48("982")) {
      {}
    } else {
      stryCov_9fa48("982");
      if (stryMutAct_9fa48("985") ? !this.aesKey && !this.opfsMockDb && !this.sqliteDb : stryMutAct_9fa48("984") ? false : stryMutAct_9fa48("983") ? true : (stryCov_9fa48("983", "984", "985"), (stryMutAct_9fa48("986") ? this.aesKey : (stryCov_9fa48("986"), !this.aesKey)) || (stryMutAct_9fa48("988") ? !this.opfsMockDb || !this.sqliteDb : stryMutAct_9fa48("987") ? false : (stryCov_9fa48("987", "988"), (stryMutAct_9fa48("989") ? this.opfsMockDb : (stryCov_9fa48("989"), !this.opfsMockDb)) && (stryMutAct_9fa48("990") ? this.sqliteDb : (stryCov_9fa48("990"), !this.sqliteDb)))))) return stryMutAct_9fa48("991") ? ["Stryker was here"] : (stryCov_9fa48("991"), []);

      // 1. Ensure Cache is Populated
      if (stryMutAct_9fa48("994") ? false : stryMutAct_9fa48("993") ? true : stryMutAct_9fa48("992") ? this.decryptedEntriesCache : (stryCov_9fa48("992", "993", "994"), !this.decryptedEntriesCache)) {
        if (stryMutAct_9fa48("995")) {
          {}
        } else {
          stryCov_9fa48("995");
          // Fetch ALL raw entries
          let rawEntries: VaultEntry[];
          if (stryMutAct_9fa48("998") ? this.useSQLite || this.sqliteDb : stryMutAct_9fa48("997") ? false : stryMutAct_9fa48("996") ? true : (stryCov_9fa48("996", "997", "998"), this.useSQLite && this.sqliteDb)) {
            if (stryMutAct_9fa48("999")) {
              {}
            } else {
              stryCov_9fa48("999");
              rawEntries = this.sqliteDb.getAllPasswords() as VaultEntry[];
            }
          } else {
            if (stryMutAct_9fa48("1000")) {
              {}
            } else {
              stryCov_9fa48("1000");
              rawEntries = await this.opfsMockDb!.getAll(stryMutAct_9fa48("1001") ? "" : (stryCov_9fa48("1001"), 'passwords'));
            }
          }
          const dec = new TextDecoder();
          const migratedEntries: VaultEntry[] = stryMutAct_9fa48("1002") ? ["Stryker was here"] : (stryCov_9fa48("1002"), []);

          // Decrypt EVERYTHING once
          this.decryptedEntriesCache = await Promise.all(rawEntries.map(async entry => {
            if (stryMutAct_9fa48("1003")) {
              {}
            } else {
              stryCov_9fa48("1003");
              try {
                if (stryMutAct_9fa48("1004")) {
                  {}
                } else {
                  stryCov_9fa48("1004");
                  // On-the-fly migration: legacy categories
                  if (stryMutAct_9fa48("1006") ? false : stryMutAct_9fa48("1005") ? true : (stryCov_9fa48("1005", "1006"), (stryMutAct_9fa48("1007") ? [] : (stryCov_9fa48("1007"), [stryMutAct_9fa48("1008") ? "" : (stryCov_9fa48("1008"), 'Work'), stryMutAct_9fa48("1009") ? "" : (stryCov_9fa48("1009"), 'Bank'), stryMutAct_9fa48("1010") ? "" : (stryCov_9fa48("1010"), 'Social')])).includes(entry.category))) {
                    if (stryMutAct_9fa48("1011")) {
                      {}
                    } else {
                      stryCov_9fa48("1011");
                      entry.category = stryMutAct_9fa48("1012") ? "" : (stryCov_9fa48("1012"), 'General');
                      stryMutAct_9fa48("1013") ? this.opfsMockDb.put('passwords', entry).catch(() => {}) : (stryCov_9fa48("1013"), this.opfsMockDb?.put(stryMutAct_9fa48("1014") ? "" : (stryCov_9fa48("1014"), 'passwords'), entry).catch(() => {}));
                    }
                  }
                  const {
                    uiEntry,
                    storageEntry
                  } = await this.prepareEntryMetadataForUse(entry);
                  if (stryMutAct_9fa48("1016") ? false : stryMutAct_9fa48("1015") ? true : (stryCov_9fa48("1015", "1016"), storageEntry)) migratedEntries.push(storageEntry);
                  const decryptedEntry: VaultEntry = stryMutAct_9fa48("1017") ? {} : (stryCov_9fa48("1017"), {
                    ...uiEntry
                  });

                  // Fully decrypt sensitive fields for the cache
                  if (stryMutAct_9fa48("1020") ? entry.encrypted_password || entry.iv : stryMutAct_9fa48("1019") ? false : stryMutAct_9fa48("1018") ? true : (stryCov_9fa48("1018", "1019", "1020"), entry.encrypted_password && entry.iv)) {
                    if (stryMutAct_9fa48("1021")) {
                      {}
                    } else {
                      stryCov_9fa48("1021");
                      try {
                        if (stryMutAct_9fa48("1022")) {
                          {}
                        } else {
                          stryCov_9fa48("1022");
                          let cipherArray: Uint8Array;
                          let ivArray: Uint8Array;
                          if (stryMutAct_9fa48("1025") ? isLikelyHexUtil(entry.encrypted_password) || isLikelyHexUtil(entry.iv) : stryMutAct_9fa48("1024") ? false : stryMutAct_9fa48("1023") ? true : (stryCov_9fa48("1023", "1024", "1025"), isLikelyHexUtil(entry.encrypted_password) && isLikelyHexUtil(entry.iv))) {
                            if (stryMutAct_9fa48("1026")) {
                              {}
                            } else {
                              stryCov_9fa48("1026");
                              cipherArray = hexToBuffer(entry.encrypted_password);
                              ivArray = hexToBuffer(entry.iv);
                            }
                          } else {
                            if (stryMutAct_9fa48("1027")) {
                              {}
                            } else {
                              stryCov_9fa48("1027");
                              cipherArray = Uint8Array.from(atob(entry.encrypted_password), stryMutAct_9fa48("1028") ? () => undefined : (stryCov_9fa48("1028"), c => c.charCodeAt(0)));
                              ivArray = Uint8Array.from(atob(entry.iv), stryMutAct_9fa48("1029") ? () => undefined : (stryCov_9fa48("1029"), c => c.charCodeAt(0)));
                            }
                          }
                          const plainBuffer = await window.crypto.subtle.decrypt(stryMutAct_9fa48("1030") ? {} : (stryCov_9fa48("1030"), {
                            name: stryMutAct_9fa48("1031") ? "" : (stryCov_9fa48("1031"), "AES-GCM"),
                            iv: toBufferSource(ivArray)
                          }), this.aesKey!, toBufferSource(cipherArray));
                          decryptedEntry.pass = dec.decode(plainBuffer);
                        }
                      } catch {
                        if (stryMutAct_9fa48("1032")) {
                          {}
                        } else {
                          stryCov_9fa48("1032");
                          decryptedEntry.pass = stryMutAct_9fa48("1033") ? "" : (stryCov_9fa48("1033"), "••DECRYPT_ERROR••");
                        }
                      }
                    }
                  }

                  // TOTP
                  if (stryMutAct_9fa48("1036") ? entry.totp_secret || entry.totp_iv : stryMutAct_9fa48("1035") ? false : stryMutAct_9fa48("1034") ? true : (stryCov_9fa48("1034", "1035", "1036"), entry.totp_secret && entry.totp_iv)) {
                    if (stryMutAct_9fa48("1037")) {
                      {}
                    } else {
                      stryCov_9fa48("1037");
                      try {
                        if (stryMutAct_9fa48("1038")) {
                          {}
                        } else {
                          stryCov_9fa48("1038");
                          const totpCipher = isLikelyHexUtil(entry.totp_secret) ? hexToBuffer(entry.totp_secret) : Uint8Array.from(atob(entry.totp_secret), stryMutAct_9fa48("1039") ? () => undefined : (stryCov_9fa48("1039"), c => c.charCodeAt(0)));
                          const totpIv = isLikelyHexUtil(entry.totp_iv) ? hexToBuffer(entry.totp_iv) : Uint8Array.from(atob(entry.totp_iv), stryMutAct_9fa48("1040") ? () => undefined : (stryCov_9fa48("1040"), c => c.charCodeAt(0)));
                          const totpPlain = await window.crypto.subtle.decrypt(stryMutAct_9fa48("1041") ? {} : (stryCov_9fa48("1041"), {
                            name: stryMutAct_9fa48("1042") ? "" : (stryCov_9fa48("1042"), "AES-GCM"),
                            iv: toBufferSource(totpIv)
                          }), this.aesKey!, toBufferSource(totpCipher));
                          decryptedEntry.totpSecret = dec.decode(totpPlain);
                        }
                      } catch {/* skip */}
                    }
                  }

                  // Notes
                  if (stryMutAct_9fa48("1045") ? entry.encrypted_notes || entry.notes_iv : stryMutAct_9fa48("1044") ? false : stryMutAct_9fa48("1043") ? true : (stryCov_9fa48("1043", "1044", "1045"), entry.encrypted_notes && entry.notes_iv)) {
                    if (stryMutAct_9fa48("1046")) {
                      {}
                    } else {
                      stryCov_9fa48("1046");
                      try {
                        if (stryMutAct_9fa48("1047")) {
                          {}
                        } else {
                          stryCov_9fa48("1047");
                          const notesCipher = isLikelyHexUtil(entry.encrypted_notes) ? hexToBuffer(entry.encrypted_notes) : Uint8Array.from(atob(entry.encrypted_notes), stryMutAct_9fa48("1048") ? () => undefined : (stryCov_9fa48("1048"), c => c.charCodeAt(0)));
                          const notesIv = isLikelyHexUtil(entry.notes_iv) ? hexToBuffer(entry.notes_iv) : Uint8Array.from(atob(entry.notes_iv), stryMutAct_9fa48("1049") ? () => undefined : (stryCov_9fa48("1049"), c => c.charCodeAt(0)));
                          const notesPlain = await window.crypto.subtle.decrypt(stryMutAct_9fa48("1050") ? {} : (stryCov_9fa48("1050"), {
                            name: stryMutAct_9fa48("1051") ? "" : (stryCov_9fa48("1051"), "AES-GCM"),
                            iv: toBufferSource(notesIv)
                          }), this.aesKey!, toBufferSource(notesCipher));
                          decryptedEntry.notes = dec.decode(notesPlain);
                        }
                      } catch {/* skip */}
                    }
                  }

                  // Passkey Meta
                  if (stryMutAct_9fa48("1054") ? entry.encrypted_passkey_meta || entry.passkey_meta_iv : stryMutAct_9fa48("1053") ? false : stryMutAct_9fa48("1052") ? true : (stryCov_9fa48("1052", "1053", "1054"), entry.encrypted_passkey_meta && entry.passkey_meta_iv)) {
                    if (stryMutAct_9fa48("1055")) {
                      {}
                    } else {
                      stryCov_9fa48("1055");
                      try {
                        if (stryMutAct_9fa48("1056")) {
                          {}
                        } else {
                          stryCov_9fa48("1056");
                          const passkeyMetaCipher = isLikelyHexUtil(entry.encrypted_passkey_meta) ? hexToBuffer(entry.encrypted_passkey_meta) : Uint8Array.from(atob(entry.encrypted_passkey_meta), stryMutAct_9fa48("1057") ? () => undefined : (stryCov_9fa48("1057"), c => c.charCodeAt(0)));
                          const passkeyMetaIv = isLikelyHexUtil(entry.passkey_meta_iv) ? hexToBuffer(entry.passkey_meta_iv) : Uint8Array.from(atob(entry.passkey_meta_iv), stryMutAct_9fa48("1058") ? () => undefined : (stryCov_9fa48("1058"), c => c.charCodeAt(0)));
                          const passkeyMetaPlain = await window.crypto.subtle.decrypt(stryMutAct_9fa48("1059") ? {} : (stryCov_9fa48("1059"), {
                            name: stryMutAct_9fa48("1060") ? "" : (stryCov_9fa48("1060"), "AES-GCM"),
                            iv: toBufferSource(passkeyMetaIv)
                          }), this.aesKey!, toBufferSource(passkeyMetaCipher));
                          decryptedEntry.passkeyMetadata = JSON.parse(dec.decode(passkeyMetaPlain)) as CanonicalPasskeyFields;
                        }
                      } catch {/* skip */}
                    }
                  }
                  return decryptedEntry;
                }
              } catch {
                if (stryMutAct_9fa48("1061")) {
                  {}
                } else {
                  stryCov_9fa48("1061");
                  return entry;
                }
              }
            }
          }));

          // Flush migrations
          if (stryMutAct_9fa48("1064") ? migratedEntries.length > 0 || this.opfsMockDb : stryMutAct_9fa48("1063") ? false : stryMutAct_9fa48("1062") ? true : (stryCov_9fa48("1062", "1063", "1064"), (stryMutAct_9fa48("1067") ? migratedEntries.length <= 0 : stryMutAct_9fa48("1066") ? migratedEntries.length >= 0 : stryMutAct_9fa48("1065") ? true : (stryCov_9fa48("1065", "1066", "1067"), migratedEntries.length > 0)) && this.opfsMockDb)) {
            if (stryMutAct_9fa48("1068")) {
              {}
            } else {
              stryCov_9fa48("1068");
              for (const m of migratedEntries) {
                if (stryMutAct_9fa48("1069")) {
                  {}
                } else {
                  stryCov_9fa48("1069");
                  await this.opfsMockDb.put(stryMutAct_9fa48("1070") ? "" : (stryCov_9fa48("1070"), 'passwords'), m);
                  if (stryMutAct_9fa48("1073") ? this.useSQLite || this.sqliteDb : stryMutAct_9fa48("1072") ? false : stryMutAct_9fa48("1071") ? true : (stryCov_9fa48("1071", "1072", "1073"), this.useSQLite && this.sqliteDb)) this.sqliteDb.putPassword(m as any);
                }
              }
            }
          }
        }
      }

      // 2. Memory Filtering (Blazing Fast)
      let filtered = stryMutAct_9fa48("1076") ? this.decryptedEntriesCache && [] : stryMutAct_9fa48("1075") ? false : stryMutAct_9fa48("1074") ? true : (stryCov_9fa48("1074", "1075", "1076"), this.decryptedEntriesCache || (stryMutAct_9fa48("1077") ? ["Stryker was here"] : (stryCov_9fa48("1077"), [])));

      // Filter by Trash State
      if (stryMutAct_9fa48("1079") ? false : stryMutAct_9fa48("1078") ? true : (stryCov_9fa48("1078", "1079"), isTrash)) {
        if (stryMutAct_9fa48("1080")) {
          {}
        } else {
          stryCov_9fa48("1080");
          filtered = stryMutAct_9fa48("1081") ? filtered : (stryCov_9fa48("1081"), filtered.filter(stryMutAct_9fa48("1082") ? () => undefined : (stryCov_9fa48("1082"), e => e.deletedAt)));
        }
      } else {
        if (stryMutAct_9fa48("1083")) {
          {}
        } else {
          stryCov_9fa48("1083");
          filtered = stryMutAct_9fa48("1084") ? filtered : (stryCov_9fa48("1084"), filtered.filter(stryMutAct_9fa48("1085") ? () => undefined : (stryCov_9fa48("1085"), e => stryMutAct_9fa48("1086") ? e.deletedAt : (stryCov_9fa48("1086"), !e.deletedAt))));
        }
      }

      // Filter by category/tag
      if (stryMutAct_9fa48("1089") ? categoryFilter || categoryFilter !== "Trash" : stryMutAct_9fa48("1088") ? false : stryMutAct_9fa48("1087") ? true : (stryCov_9fa48("1087", "1088", "1089"), categoryFilter && (stryMutAct_9fa48("1091") ? categoryFilter === "Trash" : stryMutAct_9fa48("1090") ? true : (stryCov_9fa48("1090", "1091"), categoryFilter !== (stryMutAct_9fa48("1092") ? "" : (stryCov_9fa48("1092"), "Trash")))))) {
        if (stryMutAct_9fa48("1093")) {
          {}
        } else {
          stryCov_9fa48("1093");
          if (stryMutAct_9fa48("1096") ? categoryFilter.endsWith('#') : stryMutAct_9fa48("1095") ? false : stryMutAct_9fa48("1094") ? true : (stryCov_9fa48("1094", "1095", "1096"), categoryFilter.startsWith(stryMutAct_9fa48("1097") ? "" : (stryCov_9fa48("1097"), '#')))) {
            if (stryMutAct_9fa48("1098")) {
              {}
            } else {
              stryCov_9fa48("1098");
              const tag = stryMutAct_9fa48("1099") ? categoryFilter : (stryCov_9fa48("1099"), categoryFilter.substring(1));
              filtered = stryMutAct_9fa48("1100") ? filtered : (stryCov_9fa48("1100"), filtered.filter(stryMutAct_9fa48("1101") ? () => undefined : (stryCov_9fa48("1101"), e => stryMutAct_9fa48("1104") ? e.tags || e.tags.includes(tag) : stryMutAct_9fa48("1103") ? false : stryMutAct_9fa48("1102") ? true : (stryCov_9fa48("1102", "1103", "1104"), e.tags && e.tags.includes(tag)))));
            }
          } else {
            if (stryMutAct_9fa48("1105")) {
              {}
            } else {
              stryCov_9fa48("1105");
              filtered = stryMutAct_9fa48("1106") ? filtered : (stryCov_9fa48("1106"), filtered.filter(stryMutAct_9fa48("1107") ? () => undefined : (stryCov_9fa48("1107"), e => stryMutAct_9fa48("1110") ? e.category !== categoryFilter : stryMutAct_9fa48("1109") ? false : stryMutAct_9fa48("1108") ? true : (stryCov_9fa48("1108", "1109", "1110"), e.category === categoryFilter))));
            }
          }
        }
      }

      // Handle Search
      if (stryMutAct_9fa48("1113") ? false : stryMutAct_9fa48("1112") ? true : stryMutAct_9fa48("1111") ? searchQuery.trim() : (stryCov_9fa48("1111", "1112", "1113"), !(stryMutAct_9fa48("1114") ? searchQuery : (stryCov_9fa48("1114"), searchQuery.trim())))) {
        if (stryMutAct_9fa48("1115")) {
          {}
        } else {
          stryCov_9fa48("1115");
          return filtered;
        }
      }
      const normalize = stryMutAct_9fa48("1116") ? () => undefined : (stryCov_9fa48("1116"), (() => {
        const normalize = (value: string = stryMutAct_9fa48("1117") ? "Stryker was here!" : (stryCov_9fa48("1117"), "")) => this.normalizeSearchValue(value).replace(stryMutAct_9fa48("1119") ? /\S+/g : stryMutAct_9fa48("1118") ? /\s/g : (stryCov_9fa48("1118", "1119"), /\s+/g), stryMutAct_9fa48("1120") ? "Stryker was here!" : (stryCov_9fa48("1120"), ""));
        return normalize;
      })());
      const queryTokens = stryMutAct_9fa48("1123") ? searchQuery.toUpperCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().split(/\s+/).filter(Boolean) : stryMutAct_9fa48("1122") ? searchQuery.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").split(/\s+/).filter(Boolean) : stryMutAct_9fa48("1121") ? searchQuery.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().split(/\s+/) : (stryCov_9fa48("1121", "1122", "1123"), searchQuery.toLowerCase().normalize(stryMutAct_9fa48("1124") ? "" : (stryCov_9fa48("1124"), "NFKD")).replace(stryMutAct_9fa48("1125") ? /[^\u0300-\u036f]/g : (stryCov_9fa48("1125"), /[\u0300-\u036f]/g), stryMutAct_9fa48("1126") ? "Stryker was here!" : (stryCov_9fa48("1126"), "")).trim().split(stryMutAct_9fa48("1128") ? /\S+/ : stryMutAct_9fa48("1127") ? /\s/ : (stryCov_9fa48("1127", "1128"), /\s+/)).filter(Boolean));

      // Filter logic...
      const isSubsequence = (needle: string, haystack: string) => {
        if (stryMutAct_9fa48("1129")) {
          {}
        } else {
          stryCov_9fa48("1129");
          let i = 0;
          let j = 0;
          while (stryMutAct_9fa48("1131") ? i < needle.length || j < haystack.length : stryMutAct_9fa48("1130") ? false : (stryCov_9fa48("1130", "1131"), (stryMutAct_9fa48("1134") ? i >= needle.length : stryMutAct_9fa48("1133") ? i <= needle.length : stryMutAct_9fa48("1132") ? true : (stryCov_9fa48("1132", "1133", "1134"), i < needle.length)) && (stryMutAct_9fa48("1137") ? j >= haystack.length : stryMutAct_9fa48("1136") ? j <= haystack.length : stryMutAct_9fa48("1135") ? true : (stryCov_9fa48("1135", "1136", "1137"), j < haystack.length)))) {
            if (stryMutAct_9fa48("1138")) {
              {}
            } else {
              stryCov_9fa48("1138");
              if (stryMutAct_9fa48("1141") ? needle[i] !== haystack[j] : stryMutAct_9fa48("1140") ? false : stryMutAct_9fa48("1139") ? true : (stryCov_9fa48("1139", "1140", "1141"), needle[i] === haystack[j])) stryMutAct_9fa48("1142") ? i-- : (stryCov_9fa48("1142"), i++);
              stryMutAct_9fa48("1143") ? j-- : (stryCov_9fa48("1143"), j++);
            }
          }
          return stryMutAct_9fa48("1146") ? i !== needle.length : stryMutAct_9fa48("1145") ? false : stryMutAct_9fa48("1144") ? true : (stryCov_9fa48("1144", "1145", "1146"), i === needle.length);
        }
      };
      const scored = stryMutAct_9fa48("1147") ? filtered.map(entry => {
        const title = normalize(entry.title || "");
        const username = normalize(entry.username || "");
        const website = normalize(entry.website || "");
        const category = normalize(entry.category || "");
        const tags = (entry.tags || []).map(t => normalize(t));
        const scopedFields = searchScope === "title" ? [title] : searchScope === "username" ? [username] : searchScope === "tags" ? tags : [title, username, website, category, ...tags];
        const fullByScope = searchScope === "title" ? title : searchScope === "username" ? username : searchScope === "tags" ? tags.join("") : `${title}${username}${website}${category}${tags.join("")}`;
        let score = 0;
        let matchedAllTokens = true;
        let prefixMatchedAllTokens = true;
        for (const rawToken of queryTokens) {
          const token = normalize(rawToken);
          if (!token) continue;
          let tokenMatched = false;
          const tokenPrefixMatched = scopedFields.some(f => f.startsWith(token));
          if (!tokenPrefixMatched) prefixMatchedAllTokens = false;
          if ((searchScope === "all" || searchScope === "title") && title.startsWith(token)) {
            score += 120;
            tokenMatched = true;
          } else if ((searchScope === "all" || searchScope === "title") && title.includes(token)) {
            score += 90;
            tokenMatched = true;
          }
          if (!tokenMatched && (searchScope === "all" || searchScope === "username") && username.includes(token)) {
            score += 60;
            tokenMatched = true;
          }
          if (!tokenMatched && searchScope === "all" && website.includes(token)) {
            score += 50;
            tokenMatched = true;
          }
          if (!tokenMatched && searchScope === "all" && category.includes(token)) {
            score += 35;
            tokenMatched = true;
          }
          if (!tokenMatched && (searchScope === "all" || searchScope === "tags") && tags.some(tag => tag.includes(token))) {
            score += 40;
            tokenMatched = true;
          }
          if (!tokenMatched && token.length >= 4 && isSubsequence(token, fullByScope)) {
            score += 20;
            tokenMatched = true;
          }
          if (!tokenMatched) {
            matchedAllTokens = false;
            break;
          }
        }
        return {
          entry,
          score,
          matchedAllTokens,
          prefixMatchedAllTokens
        };
      }) : (stryCov_9fa48("1147"), filtered.map(entry => {
        if (stryMutAct_9fa48("1148")) {
          {}
        } else {
          stryCov_9fa48("1148");
          const title = normalize(stryMutAct_9fa48("1151") ? entry.title && "" : stryMutAct_9fa48("1150") ? false : stryMutAct_9fa48("1149") ? true : (stryCov_9fa48("1149", "1150", "1151"), entry.title || (stryMutAct_9fa48("1152") ? "Stryker was here!" : (stryCov_9fa48("1152"), ""))));
          const username = normalize(stryMutAct_9fa48("1155") ? entry.username && "" : stryMutAct_9fa48("1154") ? false : stryMutAct_9fa48("1153") ? true : (stryCov_9fa48("1153", "1154", "1155"), entry.username || (stryMutAct_9fa48("1156") ? "Stryker was here!" : (stryCov_9fa48("1156"), ""))));
          const website = normalize(stryMutAct_9fa48("1159") ? entry.website && "" : stryMutAct_9fa48("1158") ? false : stryMutAct_9fa48("1157") ? true : (stryCov_9fa48("1157", "1158", "1159"), entry.website || (stryMutAct_9fa48("1160") ? "Stryker was here!" : (stryCov_9fa48("1160"), ""))));
          const category = normalize(stryMutAct_9fa48("1163") ? entry.category && "" : stryMutAct_9fa48("1162") ? false : stryMutAct_9fa48("1161") ? true : (stryCov_9fa48("1161", "1162", "1163"), entry.category || (stryMutAct_9fa48("1164") ? "Stryker was here!" : (stryCov_9fa48("1164"), ""))));
          const tags = (stryMutAct_9fa48("1167") ? entry.tags && [] : stryMutAct_9fa48("1166") ? false : stryMutAct_9fa48("1165") ? true : (stryCov_9fa48("1165", "1166", "1167"), entry.tags || (stryMutAct_9fa48("1168") ? ["Stryker was here"] : (stryCov_9fa48("1168"), [])))).map(stryMutAct_9fa48("1169") ? () => undefined : (stryCov_9fa48("1169"), t => normalize(t)));
          const scopedFields = (stryMutAct_9fa48("1172") ? searchScope !== "title" : stryMutAct_9fa48("1171") ? false : stryMutAct_9fa48("1170") ? true : (stryCov_9fa48("1170", "1171", "1172"), searchScope === (stryMutAct_9fa48("1173") ? "" : (stryCov_9fa48("1173"), "title")))) ? stryMutAct_9fa48("1174") ? [] : (stryCov_9fa48("1174"), [title]) : (stryMutAct_9fa48("1177") ? searchScope !== "username" : stryMutAct_9fa48("1176") ? false : stryMutAct_9fa48("1175") ? true : (stryCov_9fa48("1175", "1176", "1177"), searchScope === (stryMutAct_9fa48("1178") ? "" : (stryCov_9fa48("1178"), "username")))) ? stryMutAct_9fa48("1179") ? [] : (stryCov_9fa48("1179"), [username]) : (stryMutAct_9fa48("1182") ? searchScope !== "tags" : stryMutAct_9fa48("1181") ? false : stryMutAct_9fa48("1180") ? true : (stryCov_9fa48("1180", "1181", "1182"), searchScope === (stryMutAct_9fa48("1183") ? "" : (stryCov_9fa48("1183"), "tags")))) ? tags : stryMutAct_9fa48("1184") ? [] : (stryCov_9fa48("1184"), [title, username, website, category, ...tags]);
          const fullByScope = (stryMutAct_9fa48("1187") ? searchScope !== "title" : stryMutAct_9fa48("1186") ? false : stryMutAct_9fa48("1185") ? true : (stryCov_9fa48("1185", "1186", "1187"), searchScope === (stryMutAct_9fa48("1188") ? "" : (stryCov_9fa48("1188"), "title")))) ? title : (stryMutAct_9fa48("1191") ? searchScope !== "username" : stryMutAct_9fa48("1190") ? false : stryMutAct_9fa48("1189") ? true : (stryCov_9fa48("1189", "1190", "1191"), searchScope === (stryMutAct_9fa48("1192") ? "" : (stryCov_9fa48("1192"), "username")))) ? username : (stryMutAct_9fa48("1195") ? searchScope !== "tags" : stryMutAct_9fa48("1194") ? false : stryMutAct_9fa48("1193") ? true : (stryCov_9fa48("1193", "1194", "1195"), searchScope === (stryMutAct_9fa48("1196") ? "" : (stryCov_9fa48("1196"), "tags")))) ? tags.join(stryMutAct_9fa48("1197") ? "Stryker was here!" : (stryCov_9fa48("1197"), "")) : stryMutAct_9fa48("1198") ? `` : (stryCov_9fa48("1198"), `${title}${username}${website}${category}${tags.join(stryMutAct_9fa48("1199") ? "Stryker was here!" : (stryCov_9fa48("1199"), ""))}`);
          let score = 0;
          let matchedAllTokens = stryMutAct_9fa48("1200") ? false : (stryCov_9fa48("1200"), true);
          let prefixMatchedAllTokens = stryMutAct_9fa48("1201") ? false : (stryCov_9fa48("1201"), true);
          for (const rawToken of queryTokens) {
            if (stryMutAct_9fa48("1202")) {
              {}
            } else {
              stryCov_9fa48("1202");
              const token = normalize(rawToken);
              if (stryMutAct_9fa48("1205") ? false : stryMutAct_9fa48("1204") ? true : stryMutAct_9fa48("1203") ? token : (stryCov_9fa48("1203", "1204", "1205"), !token)) continue;
              let tokenMatched = stryMutAct_9fa48("1206") ? true : (stryCov_9fa48("1206"), false);
              const tokenPrefixMatched = stryMutAct_9fa48("1207") ? scopedFields.every(f => f.startsWith(token)) : (stryCov_9fa48("1207"), scopedFields.some(stryMutAct_9fa48("1208") ? () => undefined : (stryCov_9fa48("1208"), f => stryMutAct_9fa48("1209") ? f.endsWith(token) : (stryCov_9fa48("1209"), f.startsWith(token)))));
              if (stryMutAct_9fa48("1212") ? false : stryMutAct_9fa48("1211") ? true : stryMutAct_9fa48("1210") ? tokenPrefixMatched : (stryCov_9fa48("1210", "1211", "1212"), !tokenPrefixMatched)) prefixMatchedAllTokens = stryMutAct_9fa48("1213") ? true : (stryCov_9fa48("1213"), false);
              if (stryMutAct_9fa48("1216") ? searchScope === "all" || searchScope === "title" || title.startsWith(token) : stryMutAct_9fa48("1215") ? false : stryMutAct_9fa48("1214") ? true : (stryCov_9fa48("1214", "1215", "1216"), (stryMutAct_9fa48("1218") ? searchScope === "all" && searchScope === "title" : stryMutAct_9fa48("1217") ? true : (stryCov_9fa48("1217", "1218"), (stryMutAct_9fa48("1220") ? searchScope !== "all" : stryMutAct_9fa48("1219") ? false : (stryCov_9fa48("1219", "1220"), searchScope === (stryMutAct_9fa48("1221") ? "" : (stryCov_9fa48("1221"), "all")))) || (stryMutAct_9fa48("1223") ? searchScope !== "title" : stryMutAct_9fa48("1222") ? false : (stryCov_9fa48("1222", "1223"), searchScope === (stryMutAct_9fa48("1224") ? "" : (stryCov_9fa48("1224"), "title")))))) && (stryMutAct_9fa48("1225") ? title.endsWith(token) : (stryCov_9fa48("1225"), title.startsWith(token))))) {
                if (stryMutAct_9fa48("1226")) {
                  {}
                } else {
                  stryCov_9fa48("1226");
                  stryMutAct_9fa48("1227") ? score -= 120 : (stryCov_9fa48("1227"), score += 120);
                  tokenMatched = stryMutAct_9fa48("1228") ? false : (stryCov_9fa48("1228"), true);
                }
              } else if (stryMutAct_9fa48("1231") ? searchScope === "all" || searchScope === "title" || title.includes(token) : stryMutAct_9fa48("1230") ? false : stryMutAct_9fa48("1229") ? true : (stryCov_9fa48("1229", "1230", "1231"), (stryMutAct_9fa48("1233") ? searchScope === "all" && searchScope === "title" : stryMutAct_9fa48("1232") ? true : (stryCov_9fa48("1232", "1233"), (stryMutAct_9fa48("1235") ? searchScope !== "all" : stryMutAct_9fa48("1234") ? false : (stryCov_9fa48("1234", "1235"), searchScope === (stryMutAct_9fa48("1236") ? "" : (stryCov_9fa48("1236"), "all")))) || (stryMutAct_9fa48("1238") ? searchScope !== "title" : stryMutAct_9fa48("1237") ? false : (stryCov_9fa48("1237", "1238"), searchScope === (stryMutAct_9fa48("1239") ? "" : (stryCov_9fa48("1239"), "title")))))) && title.includes(token))) {
                if (stryMutAct_9fa48("1240")) {
                  {}
                } else {
                  stryCov_9fa48("1240");
                  stryMutAct_9fa48("1241") ? score -= 90 : (stryCov_9fa48("1241"), score += 90);
                  tokenMatched = stryMutAct_9fa48("1242") ? false : (stryCov_9fa48("1242"), true);
                }
              }
              if (stryMutAct_9fa48("1245") ? !tokenMatched && (searchScope === "all" || searchScope === "username") || username.includes(token) : stryMutAct_9fa48("1244") ? false : stryMutAct_9fa48("1243") ? true : (stryCov_9fa48("1243", "1244", "1245"), (stryMutAct_9fa48("1247") ? !tokenMatched || searchScope === "all" || searchScope === "username" : stryMutAct_9fa48("1246") ? true : (stryCov_9fa48("1246", "1247"), (stryMutAct_9fa48("1248") ? tokenMatched : (stryCov_9fa48("1248"), !tokenMatched)) && (stryMutAct_9fa48("1250") ? searchScope === "all" && searchScope === "username" : stryMutAct_9fa48("1249") ? true : (stryCov_9fa48("1249", "1250"), (stryMutAct_9fa48("1252") ? searchScope !== "all" : stryMutAct_9fa48("1251") ? false : (stryCov_9fa48("1251", "1252"), searchScope === (stryMutAct_9fa48("1253") ? "" : (stryCov_9fa48("1253"), "all")))) || (stryMutAct_9fa48("1255") ? searchScope !== "username" : stryMutAct_9fa48("1254") ? false : (stryCov_9fa48("1254", "1255"), searchScope === (stryMutAct_9fa48("1256") ? "" : (stryCov_9fa48("1256"), "username")))))))) && username.includes(token))) {
                if (stryMutAct_9fa48("1257")) {
                  {}
                } else {
                  stryCov_9fa48("1257");
                  stryMutAct_9fa48("1258") ? score -= 60 : (stryCov_9fa48("1258"), score += 60);
                  tokenMatched = stryMutAct_9fa48("1259") ? false : (stryCov_9fa48("1259"), true);
                }
              }
              if (stryMutAct_9fa48("1262") ? !tokenMatched && searchScope === "all" || website.includes(token) : stryMutAct_9fa48("1261") ? false : stryMutAct_9fa48("1260") ? true : (stryCov_9fa48("1260", "1261", "1262"), (stryMutAct_9fa48("1264") ? !tokenMatched || searchScope === "all" : stryMutAct_9fa48("1263") ? true : (stryCov_9fa48("1263", "1264"), (stryMutAct_9fa48("1265") ? tokenMatched : (stryCov_9fa48("1265"), !tokenMatched)) && (stryMutAct_9fa48("1267") ? searchScope !== "all" : stryMutAct_9fa48("1266") ? true : (stryCov_9fa48("1266", "1267"), searchScope === (stryMutAct_9fa48("1268") ? "" : (stryCov_9fa48("1268"), "all")))))) && website.includes(token))) {
                if (stryMutAct_9fa48("1269")) {
                  {}
                } else {
                  stryCov_9fa48("1269");
                  stryMutAct_9fa48("1270") ? score -= 50 : (stryCov_9fa48("1270"), score += 50);
                  tokenMatched = stryMutAct_9fa48("1271") ? false : (stryCov_9fa48("1271"), true);
                }
              }
              if (stryMutAct_9fa48("1274") ? !tokenMatched && searchScope === "all" || category.includes(token) : stryMutAct_9fa48("1273") ? false : stryMutAct_9fa48("1272") ? true : (stryCov_9fa48("1272", "1273", "1274"), (stryMutAct_9fa48("1276") ? !tokenMatched || searchScope === "all" : stryMutAct_9fa48("1275") ? true : (stryCov_9fa48("1275", "1276"), (stryMutAct_9fa48("1277") ? tokenMatched : (stryCov_9fa48("1277"), !tokenMatched)) && (stryMutAct_9fa48("1279") ? searchScope !== "all" : stryMutAct_9fa48("1278") ? true : (stryCov_9fa48("1278", "1279"), searchScope === (stryMutAct_9fa48("1280") ? "" : (stryCov_9fa48("1280"), "all")))))) && category.includes(token))) {
                if (stryMutAct_9fa48("1281")) {
                  {}
                } else {
                  stryCov_9fa48("1281");
                  stryMutAct_9fa48("1282") ? score -= 35 : (stryCov_9fa48("1282"), score += 35);
                  tokenMatched = stryMutAct_9fa48("1283") ? false : (stryCov_9fa48("1283"), true);
                }
              }
              if (stryMutAct_9fa48("1286") ? !tokenMatched && (searchScope === "all" || searchScope === "tags") || tags.some(tag => tag.includes(token)) : stryMutAct_9fa48("1285") ? false : stryMutAct_9fa48("1284") ? true : (stryCov_9fa48("1284", "1285", "1286"), (stryMutAct_9fa48("1288") ? !tokenMatched || searchScope === "all" || searchScope === "tags" : stryMutAct_9fa48("1287") ? true : (stryCov_9fa48("1287", "1288"), (stryMutAct_9fa48("1289") ? tokenMatched : (stryCov_9fa48("1289"), !tokenMatched)) && (stryMutAct_9fa48("1291") ? searchScope === "all" && searchScope === "tags" : stryMutAct_9fa48("1290") ? true : (stryCov_9fa48("1290", "1291"), (stryMutAct_9fa48("1293") ? searchScope !== "all" : stryMutAct_9fa48("1292") ? false : (stryCov_9fa48("1292", "1293"), searchScope === (stryMutAct_9fa48("1294") ? "" : (stryCov_9fa48("1294"), "all")))) || (stryMutAct_9fa48("1296") ? searchScope !== "tags" : stryMutAct_9fa48("1295") ? false : (stryCov_9fa48("1295", "1296"), searchScope === (stryMutAct_9fa48("1297") ? "" : (stryCov_9fa48("1297"), "tags")))))))) && (stryMutAct_9fa48("1298") ? tags.every(tag => tag.includes(token)) : (stryCov_9fa48("1298"), tags.some(stryMutAct_9fa48("1299") ? () => undefined : (stryCov_9fa48("1299"), tag => tag.includes(token))))))) {
                if (stryMutAct_9fa48("1300")) {
                  {}
                } else {
                  stryCov_9fa48("1300");
                  stryMutAct_9fa48("1301") ? score -= 40 : (stryCov_9fa48("1301"), score += 40);
                  tokenMatched = stryMutAct_9fa48("1302") ? false : (stryCov_9fa48("1302"), true);
                }
              }
              if (stryMutAct_9fa48("1305") ? !tokenMatched && token.length >= 4 || isSubsequence(token, fullByScope) : stryMutAct_9fa48("1304") ? false : stryMutAct_9fa48("1303") ? true : (stryCov_9fa48("1303", "1304", "1305"), (stryMutAct_9fa48("1307") ? !tokenMatched || token.length >= 4 : stryMutAct_9fa48("1306") ? true : (stryCov_9fa48("1306", "1307"), (stryMutAct_9fa48("1308") ? tokenMatched : (stryCov_9fa48("1308"), !tokenMatched)) && (stryMutAct_9fa48("1311") ? token.length < 4 : stryMutAct_9fa48("1310") ? token.length > 4 : stryMutAct_9fa48("1309") ? true : (stryCov_9fa48("1309", "1310", "1311"), token.length >= 4)))) && isSubsequence(token, fullByScope))) {
                if (stryMutAct_9fa48("1312")) {
                  {}
                } else {
                  stryCov_9fa48("1312");
                  stryMutAct_9fa48("1313") ? score -= 20 : (stryCov_9fa48("1313"), score += 20);
                  tokenMatched = stryMutAct_9fa48("1314") ? false : (stryCov_9fa48("1314"), true);
                }
              }
              if (stryMutAct_9fa48("1317") ? false : stryMutAct_9fa48("1316") ? true : stryMutAct_9fa48("1315") ? tokenMatched : (stryCov_9fa48("1315", "1316", "1317"), !tokenMatched)) {
                if (stryMutAct_9fa48("1318")) {
                  {}
                } else {
                  stryCov_9fa48("1318");
                  matchedAllTokens = stryMutAct_9fa48("1319") ? true : (stryCov_9fa48("1319"), false);
                  break;
                }
              }
            }
          }
          return stryMutAct_9fa48("1320") ? {} : (stryCov_9fa48("1320"), {
            entry,
            score,
            matchedAllTokens,
            prefixMatchedAllTokens
          });
        }
      }).filter(stryMutAct_9fa48("1321") ? () => undefined : (stryCov_9fa48("1321"), item => item.matchedAllTokens)));
      const hasPrefixOnlySet = stryMutAct_9fa48("1322") ? scored.every(item => item.prefixMatchedAllTokens) : (stryCov_9fa48("1322"), scored.some(stryMutAct_9fa48("1323") ? () => undefined : (stryCov_9fa48("1323"), item => item.prefixMatchedAllTokens)));
      const filteredForSort = hasPrefixOnlySet ? stryMutAct_9fa48("1324") ? scored : (stryCov_9fa48("1324"), scored.filter(stryMutAct_9fa48("1325") ? () => undefined : (stryCov_9fa48("1325"), item => item.prefixMatchedAllTokens))) : scored;
      const ranked = stryMutAct_9fa48("1326") ? filteredForSort.map(item => item.entry) : (stryCov_9fa48("1326"), filteredForSort.sort((a, b) => {
        if (stryMutAct_9fa48("1327")) {
          {}
        } else {
          stryCov_9fa48("1327");
          if (stryMutAct_9fa48("1330") ? b.score === a.score : stryMutAct_9fa48("1329") ? false : stryMutAct_9fa48("1328") ? true : (stryCov_9fa48("1328", "1329", "1330"), b.score !== a.score)) return stryMutAct_9fa48("1331") ? b.score + a.score : (stryCov_9fa48("1331"), b.score - a.score);
          const aTime = a.entry.updated_at ? new Date(a.entry.updated_at).getTime() : 0;
          const bTime = b.entry.updated_at ? new Date(b.entry.updated_at).getTime() : 0;
          return stryMutAct_9fa48("1332") ? bTime + aTime : (stryCov_9fa48("1332"), bTime - aTime);
        }
      }).map(stryMutAct_9fa48("1333") ? () => undefined : (stryCov_9fa48("1333"), item => item.entry)));
      return ranked;
    }
  }

  // --- Parola Değiştirme (Change Master Password) ---
  async changeMasterPassword(oldPassword: string, newPassword: string, secretKey: string): Promise<void> {
    if (stryMutAct_9fa48("1334")) {
      {}
    } else {
      stryCov_9fa48("1334");
      if (stryMutAct_9fa48("1337") ? !this.opfsMockDb && !this.aesKey : stryMutAct_9fa48("1336") ? false : stryMutAct_9fa48("1335") ? true : (stryCov_9fa48("1335", "1336", "1337"), (stryMutAct_9fa48("1338") ? this.opfsMockDb : (stryCov_9fa48("1338"), !this.opfsMockDb)) || (stryMutAct_9fa48("1339") ? this.aesKey : (stryCov_9fa48("1339"), !this.aesKey)))) throw new Error(stryMutAct_9fa48("1340") ? "" : (stryCov_9fa48("1340"), "Vault not open"));

      // 1. Doğrulama
      const txAuth = this.opfsMockDb.transaction(stryMutAct_9fa48("1341") ? "" : (stryCov_9fa48("1341"), 'vault_metadata'), stryMutAct_9fa48("1342") ? "" : (stryCov_9fa48("1342"), 'readonly'));
      const authMetadata = await txAuth.objectStore(stryMutAct_9fa48("1343") ? "" : (stryCov_9fa48("1343"), 'vault_metadata')).get(stryMutAct_9fa48("1344") ? "" : (stryCov_9fa48("1344"), 'auth_credential'));
      await txAuth.done;
      if (stryMutAct_9fa48("1347") ? authMetadata || authMetadata.credential : stryMutAct_9fa48("1346") ? false : stryMutAct_9fa48("1345") ? true : (stryCov_9fa48("1345", "1346", "1347"), authMetadata && authMetadata.credential)) {
        if (stryMutAct_9fa48("1348")) {
          {}
        } else {
          stryCov_9fa48("1348");
          const storedCred = authMetadata.credential as StoredCredential;
          const isValid = await this.verifyPassword(oldPassword, storedCred);
          if (stryMutAct_9fa48("1351") ? false : stryMutAct_9fa48("1350") ? true : stryMutAct_9fa48("1349") ? isValid : (stryCov_9fa48("1349", "1350", "1351"), !isValid)) throw new Error(stryMutAct_9fa48("1352") ? "" : (stryCov_9fa48("1352"), "Invalid current password"));
        }
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
      const updatedEntriesToSave: VaultEntry[] = stryMutAct_9fa48("1353") ? ["Stryker was here"] : (stryCov_9fa48("1353"), []);
      for (const entry of allEntries) {
        if (stryMutAct_9fa48("1354")) {
          {}
        } else {
          stryCov_9fa48("1354");
          if (stryMutAct_9fa48("1357") ? false : stryMutAct_9fa48("1356") ? true : stryMutAct_9fa48("1355") ? entry.pass : (stryCov_9fa48("1355", "1356", "1357"), !entry.pass)) continue;
          const enc = new TextEncoder();
          const iv = generateRandomBytes(12);
          const cipherBuffer = await window.crypto.subtle.encrypt(stryMutAct_9fa48("1358") ? {} : (stryCov_9fa48("1358"), {
            name: stryMutAct_9fa48("1359") ? "" : (stryCov_9fa48("1359"), "AES-GCM"),
            iv: toBufferSource(iv)
          }), this.aesKey!,
          // Yeni anahtarımız
          toBufferSource(enc.encode(entry.pass)));
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
            search_index
          } = await this.buildMetadataAtRest(stryMutAct_9fa48("1362") ? entry.title && 'Untitled' : stryMutAct_9fa48("1361") ? false : stryMutAct_9fa48("1360") ? true : (stryCov_9fa48("1360", "1361", "1362"), entry.title || (stryMutAct_9fa48("1363") ? "" : (stryCov_9fa48("1363"), 'Untitled'))), stryMutAct_9fa48("1366") ? entry.username && '' : stryMutAct_9fa48("1365") ? false : stryMutAct_9fa48("1364") ? true : (stryCov_9fa48("1364", "1365", "1366"), entry.username || (stryMutAct_9fa48("1367") ? "Stryker was here!" : (stryCov_9fa48("1367"), ''))), stryMutAct_9fa48("1370") ? entry.website && '' : stryMutAct_9fa48("1369") ? false : stryMutAct_9fa48("1368") ? true : (stryCov_9fa48("1368", "1369", "1370"), entry.website || (stryMutAct_9fa48("1371") ? "Stryker was here!" : (stryCov_9fa48("1371"), ''))), stryMutAct_9fa48("1374") ? entry.category && 'General' : stryMutAct_9fa48("1373") ? false : stryMutAct_9fa48("1372") ? true : (stryCov_9fa48("1372", "1373", "1374"), entry.category || (stryMutAct_9fa48("1375") ? "" : (stryCov_9fa48("1375"), 'General'))), stryMutAct_9fa48("1378") ? entry.tags && [] : stryMutAct_9fa48("1377") ? false : stryMutAct_9fa48("1376") ? true : (stryCov_9fa48("1376", "1377", "1378"), entry.tags || (stryMutAct_9fa48("1379") ? ["Stryker was here"] : (stryCov_9fa48("1379"), []))));
          const updatedEntry: VaultEntry = stryMutAct_9fa48("1380") ? {} : (stryCov_9fa48("1380"), {
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
            attachments: await this.encryptAttachmentMetadataList(stryMutAct_9fa48("1383") ? entry.attachments && [] : stryMutAct_9fa48("1382") ? false : stryMutAct_9fa48("1381") ? true : (stryCov_9fa48("1381", "1382", "1383"), entry.attachments || (stryMutAct_9fa48("1384") ? ["Stryker was here"] : (stryCov_9fa48("1384"), [])))),
            encrypted_password: bufferToHex(cipherBuffer),
            iv: bufferToHex(iv),
            updated_at: new Date().toISOString()
          });
          // pass silinmeli çünkü raw şifre
          delete updatedEntry.pass;
          updatedEntriesToSave.push(updatedEntry);
        }
      }

      // 5. Veritabanına Yaz
      // SQLite dual-write
      if (stryMutAct_9fa48("1387") ? this.useSQLite || this.sqliteDb : stryMutAct_9fa48("1386") ? false : stryMutAct_9fa48("1385") ? true : (stryCov_9fa48("1385", "1386", "1387"), this.useSQLite && this.sqliteDb)) {
        if (stryMutAct_9fa48("1388")) {
          {}
        } else {
          stryCov_9fa48("1388");
          this.sqliteDb.putMetadata(stryMutAct_9fa48("1389") ? "" : (stryCov_9fa48("1389"), 'main_salt'), stryMutAct_9fa48("1390") ? {} : (stryCov_9fa48("1390"), {
            id: stryMutAct_9fa48("1391") ? "" : (stryCov_9fa48("1391"), 'main_salt'),
            salt: newMainSaltB64,
            createdAt: new Date().toISOString(),
            version: 2
          }));
          this.sqliteDb.putMetadata(stryMutAct_9fa48("1392") ? "" : (stryCov_9fa48("1392"), 'auth_credential'), stryMutAct_9fa48("1393") ? {} : (stryCov_9fa48("1393"), {
            id: stryMutAct_9fa48("1394") ? "" : (stryCov_9fa48("1394"), 'auth_credential'),
            credential: newCredential
          }));
          for (const item of updatedEntriesToSave) {
            if (stryMutAct_9fa48("1395")) {
              {}
            } else {
              stryCov_9fa48("1395");
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              this.sqliteDb.putPassword(item as any);
            }
          }
          await this.sqliteDb.flushToOPFS();
        }
      }
      if (stryMutAct_9fa48("1397") ? false : stryMutAct_9fa48("1396") ? true : (stryCov_9fa48("1396", "1397"), this.opfsMockDb)) {
        if (stryMutAct_9fa48("1398")) {
          {}
        } else {
          stryCov_9fa48("1398");
          const txData = this.opfsMockDb.transaction(stryMutAct_9fa48("1399") ? [] : (stryCov_9fa48("1399"), [stryMutAct_9fa48("1400") ? "" : (stryCov_9fa48("1400"), 'vault_metadata'), stryMutAct_9fa48("1401") ? "" : (stryCov_9fa48("1401"), 'passwords')]), stryMutAct_9fa48("1402") ? "" : (stryCov_9fa48("1402"), 'readwrite'));
          const metaStore = txData.objectStore(stryMutAct_9fa48("1403") ? "" : (stryCov_9fa48("1403"), 'vault_metadata'));
          const passStore = txData.objectStore(stryMutAct_9fa48("1404") ? "" : (stryCov_9fa48("1404"), 'passwords'));
          await metaStore.put(stryMutAct_9fa48("1405") ? {} : (stryCov_9fa48("1405"), {
            id: stryMutAct_9fa48("1406") ? "" : (stryCov_9fa48("1406"), 'main_salt'),
            salt: newMainSaltB64,
            createdAt: new Date().toISOString(),
            version: 2
          }));
          await metaStore.put(stryMutAct_9fa48("1407") ? {} : (stryCov_9fa48("1407"), {
            id: stryMutAct_9fa48("1408") ? "" : (stryCov_9fa48("1408"), 'auth_credential'),
            credential: newCredential
          }));
          for (const item of updatedEntriesToSave) {
            if (stryMutAct_9fa48("1409")) {
              {}
            } else {
              stryCov_9fa48("1409");
              await passStore.put(item);
            }
          }
          await txData.done;
        }
      }
    }
  }

  // --- Memory Sanitization (Lock & Dispose) ---
  async lock(): Promise<void> {
    if (stryMutAct_9fa48("1410")) {
      {}
    } else {
      stryCov_9fa48("1410");
      if (stryMutAct_9fa48("1412") ? false : stryMutAct_9fa48("1411") ? true : (stryCov_9fa48("1411", "1412"), this.sensitiveMaterial)) {
        if (stryMutAct_9fa48("1413")) {
          {}
        } else {
          stryCov_9fa48("1413");
          window.crypto.getRandomValues(this.sensitiveMaterial);
          this.sensitiveMaterial = null;
        }
      }
      if (stryMutAct_9fa48("1415") ? false : stryMutAct_9fa48("1414") ? true : (stryCov_9fa48("1414", "1415"), this.aesKey)) {
        if (stryMutAct_9fa48("1416")) {
          {}
        } else {
          stryCov_9fa48("1416");
          this.aesKey = null;
        }
      }
      this.searchIndexHmacKey = null;

      // SQLite: flush & close
      if (stryMutAct_9fa48("1418") ? false : stryMutAct_9fa48("1417") ? true : (stryCov_9fa48("1417", "1418"), this.sqliteDb)) {
        if (stryMutAct_9fa48("1419")) {
          {}
        } else {
          stryCov_9fa48("1419");
          await this.sqliteDb.close();
          this.sqliteDb = null;
          this.useSQLite = stryMutAct_9fa48("1420") ? true : (stryCov_9fa48("1420"), false);
        }
      }
      if (stryMutAct_9fa48("1422") ? false : stryMutAct_9fa48("1421") ? true : (stryCov_9fa48("1421", "1422"), this.opfsMockDb)) {
        if (stryMutAct_9fa48("1423")) {
          {}
        } else {
          stryCov_9fa48("1423");
          this.opfsMockDb.close();
          this.opfsMockDb = null;
        }
      }
      this.decryptedEntriesCache = null;
      this.isConnected = stryMutAct_9fa48("1424") ? true : (stryCov_9fa48("1424"), false);
      console.log(stryMutAct_9fa48("1425") ? "" : (stryCov_9fa48("1425"), "[SQLite-OPFS] Vault locked. Master Key securely OVERWRITTEN and sanitized from memory."));
    }
  }
  async exportVault(): Promise<string> {
    if (stryMutAct_9fa48("1426")) {
      {}
    } else {
      stryCov_9fa48("1426");
      if (stryMutAct_9fa48("1429") ? !this.opfsMockDb || !this.sqliteDb : stryMutAct_9fa48("1428") ? false : stryMutAct_9fa48("1427") ? true : (stryCov_9fa48("1427", "1428", "1429"), (stryMutAct_9fa48("1430") ? this.opfsMockDb : (stryCov_9fa48("1430"), !this.opfsMockDb)) && (stryMutAct_9fa48("1431") ? this.sqliteDb : (stryCov_9fa48("1431"), !this.sqliteDb)))) throw new Error(stryMutAct_9fa48("1432") ? "" : (stryCov_9fa48("1432"), "Vault not initialized"));
      let allEntries: VaultEntry[];
      if (stryMutAct_9fa48("1435") ? this.useSQLite || this.sqliteDb : stryMutAct_9fa48("1434") ? false : stryMutAct_9fa48("1433") ? true : (stryCov_9fa48("1433", "1434", "1435"), this.useSQLite && this.sqliteDb)) {
        if (stryMutAct_9fa48("1436")) {
          {}
        } else {
          stryCov_9fa48("1436");
          allEntries = this.sqliteDb.getAllPasswords() as VaultEntry[];
        }
      } else {
        if (stryMutAct_9fa48("1437")) {
          {}
        } else {
          stryCov_9fa48("1437");
          allEntries = await this.opfsMockDb!.getAll(stryMutAct_9fa48("1438") ? "" : (stryCov_9fa48("1438"), 'passwords'));
        }
      }
      return JSON.stringify(allEntries);
    }
  }
  async bulkAddPasswords(entries: Partial<VaultEntry>[]): Promise<{
    total: number;
    weak: number;
    missingFields: number;
    weakIds: number[];
  }> {
    if (stryMutAct_9fa48("1439")) {
      {}
    } else {
      stryCov_9fa48("1439");
      if (stryMutAct_9fa48("1442") ? !this.aesKey && !this.opfsMockDb && !this.sqliteDb : stryMutAct_9fa48("1441") ? false : stryMutAct_9fa48("1440") ? true : (stryCov_9fa48("1440", "1441", "1442"), (stryMutAct_9fa48("1443") ? this.aesKey : (stryCov_9fa48("1443"), !this.aesKey)) || (stryMutAct_9fa48("1445") ? !this.opfsMockDb || !this.sqliteDb : stryMutAct_9fa48("1444") ? false : (stryCov_9fa48("1444", "1445"), (stryMutAct_9fa48("1446") ? this.opfsMockDb : (stryCov_9fa48("1446"), !this.opfsMockDb)) && (stryMutAct_9fa48("1447") ? this.sqliteDb : (stryCov_9fa48("1447"), !this.sqliteDb)))))) throw new Error(stryMutAct_9fa48("1448") ? "" : (stryCov_9fa48("1448"), "Vault not initialized"));
      let weak = 0;
      let missingFields = 0;
      const weakIds: number[] = stryMutAct_9fa48("1449") ? ["Stryker was here"] : (stryCov_9fa48("1449"), []);
      const newEntries: VaultEntry[] = stryMutAct_9fa48("1450") ? ["Stryker was here"] : (stryCov_9fa48("1450"), []);
      for (const entry of entries) {
        if (stryMutAct_9fa48("1451")) {
          {}
        } else {
          stryCov_9fa48("1451");
          if (stryMutAct_9fa48("1454") ? !entry.title && !entry.pass : stryMutAct_9fa48("1453") ? false : stryMutAct_9fa48("1452") ? true : (stryCov_9fa48("1452", "1453", "1454"), (stryMutAct_9fa48("1455") ? entry.title : (stryCov_9fa48("1455"), !entry.title)) || (stryMutAct_9fa48("1456") ? entry.pass : (stryCov_9fa48("1456"), !entry.pass)))) {
            if (stryMutAct_9fa48("1457")) {
              {}
            } else {
              stryCov_9fa48("1457");
              stryMutAct_9fa48("1458") ? missingFields-- : (stryCov_9fa48("1458"), missingFields++);
              if (stryMutAct_9fa48("1461") ? false : stryMutAct_9fa48("1460") ? true : stryMutAct_9fa48("1459") ? entry.pass : (stryCov_9fa48("1459", "1460", "1461"), !entry.pass)) continue;
            }
          }
          const newId = Math.floor(stryMutAct_9fa48("1462") ? Date.now() * 1000 - Math.random() * 1000000 : (stryCov_9fa48("1462"), (stryMutAct_9fa48("1463") ? Date.now() / 1000 : (stryCov_9fa48("1463"), Date.now() * 1000)) + (stryMutAct_9fa48("1464") ? Math.random() / 1000000 : (stryCov_9fa48("1464"), Math.random() * 1000000))));
          if (stryMutAct_9fa48("1468") ? entry.pass.length >= 8 : stryMutAct_9fa48("1467") ? entry.pass.length <= 8 : stryMutAct_9fa48("1466") ? false : stryMutAct_9fa48("1465") ? true : (stryCov_9fa48("1465", "1466", "1467", "1468"), entry.pass.length < 8)) {
            if (stryMutAct_9fa48("1469")) {
              {}
            } else {
              stryCov_9fa48("1469");
              stryMutAct_9fa48("1470") ? weak-- : (stryCov_9fa48("1470"), weak++);
              weakIds.push(newId);
            }
          }
          const enc = new TextEncoder();
          const iv = generateRandomBytes(12);
          const cipherBuffer = await window.crypto.subtle.encrypt(stryMutAct_9fa48("1471") ? {} : (stryCov_9fa48("1471"), {
            name: stryMutAct_9fa48("1472") ? "" : (stryCov_9fa48("1472"), "AES-GCM"),
            iv: toBufferSource(iv)
          }), this.aesKey, toBufferSource(enc.encode(entry.pass)));
          const metadata = await this.buildMetadataAtRest(stryMutAct_9fa48("1475") ? entry.title && 'Imported Entry' : stryMutAct_9fa48("1474") ? false : stryMutAct_9fa48("1473") ? true : (stryCov_9fa48("1473", "1474", "1475"), entry.title || (stryMutAct_9fa48("1476") ? "" : (stryCov_9fa48("1476"), 'Imported Entry'))), stryMutAct_9fa48("1479") ? entry.username && '' : stryMutAct_9fa48("1478") ? false : stryMutAct_9fa48("1477") ? true : (stryCov_9fa48("1477", "1478", "1479"), entry.username || (stryMutAct_9fa48("1480") ? "Stryker was here!" : (stryCov_9fa48("1480"), ''))), stryMutAct_9fa48("1483") ? entry.website && '' : stryMutAct_9fa48("1482") ? false : stryMutAct_9fa48("1481") ? true : (stryCov_9fa48("1481", "1482", "1483"), entry.website || (stryMutAct_9fa48("1484") ? "Stryker was here!" : (stryCov_9fa48("1484"), ''))), stryMutAct_9fa48("1487") ? entry.category && 'General' : stryMutAct_9fa48("1486") ? false : stryMutAct_9fa48("1485") ? true : (stryCov_9fa48("1485", "1486", "1487"), entry.category || (stryMutAct_9fa48("1488") ? "" : (stryCov_9fa48("1488"), 'General'))), stryMutAct_9fa48("1491") ? entry.tags && [] : stryMutAct_9fa48("1490") ? false : stryMutAct_9fa48("1489") ? true : (stryCov_9fa48("1489", "1490", "1491"), entry.tags || (stryMutAct_9fa48("1492") ? ["Stryker was here"] : (stryCov_9fa48("1492"), []))));
          const newEntry: VaultEntry = stryMutAct_9fa48("1493") ? {} : (stryCov_9fa48("1493"), {
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
            pwned_count: stryMutAct_9fa48("1496") ? entry.pwned_count && 0 : stryMutAct_9fa48("1495") ? false : stryMutAct_9fa48("1494") ? true : (stryCov_9fa48("1494", "1495", "1496"), entry.pwned_count || 0)
          });
          newEntries.push(newEntry);
        }
      }
      if (stryMutAct_9fa48("1498") ? false : stryMutAct_9fa48("1497") ? true : (stryCov_9fa48("1497", "1498"), this.opfsMockDb)) {
        if (stryMutAct_9fa48("1499")) {
          {}
        } else {
          stryCov_9fa48("1499");
          const tx = this.opfsMockDb.transaction(stryMutAct_9fa48("1500") ? "" : (stryCov_9fa48("1500"), 'passwords'), stryMutAct_9fa48("1501") ? "" : (stryCov_9fa48("1501"), 'readwrite'));
          const store = tx.objectStore(stryMutAct_9fa48("1502") ? "" : (stryCov_9fa48("1502"), 'passwords'));
          for (const entry of newEntries) {
            if (stryMutAct_9fa48("1503")) {
              {}
            } else {
              stryCov_9fa48("1503");
              await store.put(entry);
            }
          }
          await tx.done;
        }
      }
      if (stryMutAct_9fa48("1506") ? this.useSQLite || this.sqliteDb : stryMutAct_9fa48("1505") ? false : stryMutAct_9fa48("1504") ? true : (stryCov_9fa48("1504", "1505", "1506"), this.useSQLite && this.sqliteDb)) {
        if (stryMutAct_9fa48("1507")) {
          {}
        } else {
          stryCov_9fa48("1507");
          for (const entry of newEntries) {
            if (stryMutAct_9fa48("1508")) {
              {}
            } else {
              stryCov_9fa48("1508");
              this.sqliteDb.putPassword(entry);
            }
          }
          await this.sqliteDb.flushToOPFS();
        }
      }
      return stryMutAct_9fa48("1509") ? {} : (stryCov_9fa48("1509"), {
        total: entries.length,
        weak,
        missingFields,
        weakIds
      });
    }
  }
  // --- Secure Attachments (Up to 50MB) ---
  async addAttachment(entryId: number, file: File): Promise<{
    id: string;
    name: string;
    type: string;
    size: number;
  }> {
    if (stryMutAct_9fa48("1510")) {
      {}
    } else {
      stryCov_9fa48("1510");
      if (stryMutAct_9fa48("1513") ? !this.aesKey && !this.opfsMockDb && !this.sqliteDb : stryMutAct_9fa48("1512") ? false : stryMutAct_9fa48("1511") ? true : (stryCov_9fa48("1511", "1512", "1513"), (stryMutAct_9fa48("1514") ? this.aesKey : (stryCov_9fa48("1514"), !this.aesKey)) || (stryMutAct_9fa48("1516") ? !this.opfsMockDb || !this.sqliteDb : stryMutAct_9fa48("1515") ? false : (stryCov_9fa48("1515", "1516"), (stryMutAct_9fa48("1517") ? this.opfsMockDb : (stryCov_9fa48("1517"), !this.opfsMockDb)) && (stryMutAct_9fa48("1518") ? this.sqliteDb : (stryCov_9fa48("1518"), !this.sqliteDb)))))) throw new Error(stryMutAct_9fa48("1519") ? "" : (stryCov_9fa48("1519"), "Vault not initialized"));
      if (stryMutAct_9fa48("1523") ? file.size <= 50 * 1024 * 1024 : stryMutAct_9fa48("1522") ? file.size >= 50 * 1024 * 1024 : stryMutAct_9fa48("1521") ? false : stryMutAct_9fa48("1520") ? true : (stryCov_9fa48("1520", "1521", "1522", "1523"), file.size > (stryMutAct_9fa48("1524") ? 50 * 1024 / 1024 : (stryCov_9fa48("1524"), (stryMutAct_9fa48("1525") ? 50 / 1024 : (stryCov_9fa48("1525"), 50 * 1024)) * 1024)))) throw new Error(stryMutAct_9fa48("1526") ? "" : (stryCov_9fa48("1526"), "File exceeds 50MB limit"));
      const fileBuffer = await file.arrayBuffer();
      const iv = generateRandomBytes(12);
      const cipherBuffer = await window.crypto.subtle.encrypt(stryMutAct_9fa48("1527") ? {} : (stryCov_9fa48("1527"), {
        name: stryMutAct_9fa48("1528") ? "" : (stryCov_9fa48("1528"), "AES-GCM"),
        iv: toBufferSource(iv)
      }), this.aesKey, toBufferSource(fileBuffer));
      const attachmentId = crypto.randomUUID();
      const attachmentMeta: VaultAttachmentMeta = stryMutAct_9fa48("1529") ? {} : (stryCov_9fa48("1529"), {
        id: attachmentId,
        name: file.name,
        type: file.type,
        size: file.size
      });
      const attachmentMetaAtRest = (await this.encryptAttachmentMetadataList(stryMutAct_9fa48("1530") ? [] : (stryCov_9fa48("1530"), [attachmentMeta])))[0];

      // Primary write path: SQLite (if enabled)
      if (stryMutAct_9fa48("1533") ? this.useSQLite || this.sqliteDb : stryMutAct_9fa48("1532") ? false : stryMutAct_9fa48("1531") ? true : (stryCov_9fa48("1531", "1532", "1533"), this.useSQLite && this.sqliteDb)) {
        if (stryMutAct_9fa48("1534")) {
          {}
        } else {
          stryCov_9fa48("1534");
          this.sqliteDb.putAttachment(attachmentId, entryId, iv, cipherBuffer);
          const existingEntries = this.sqliteDb.getAllPasswords();
          const entry = existingEntries.find(stryMutAct_9fa48("1535") ? () => undefined : (stryCov_9fa48("1535"), (e: Record<string, unknown>) => stryMutAct_9fa48("1538") ? Number(e.id) !== Number(entryId) : stryMutAct_9fa48("1537") ? false : stryMutAct_9fa48("1536") ? true : (stryCov_9fa48("1536", "1537", "1538"), Number(e.id) === Number(entryId))));
          if (stryMutAct_9fa48("1540") ? false : stryMutAct_9fa48("1539") ? true : (stryCov_9fa48("1539", "1540"), entry)) {
            if (stryMutAct_9fa48("1541")) {
              {}
            } else {
              stryCov_9fa48("1541");
              const attachments = Array.isArray(entry.attachments) ? entry.attachments : stryMutAct_9fa48("1542") ? ["Stryker was here"] : (stryCov_9fa48("1542"), []);
              attachments.push(attachmentMetaAtRest);
              entry.attachments = attachments;
              this.sqliteDb.putPassword(entry);
            }
          }
          await this.sqliteDb.flushToOPFS();
        }
      }

      // Fallback mirror path: IndexedDB
      if (stryMutAct_9fa48("1544") ? false : stryMutAct_9fa48("1543") ? true : (stryCov_9fa48("1543", "1544"), this.opfsMockDb)) {
        if (stryMutAct_9fa48("1545")) {
          {}
        } else {
          stryCov_9fa48("1545");
          await this.opfsMockDb.put(stryMutAct_9fa48("1546") ? "" : (stryCov_9fa48("1546"), 'attachments'), stryMutAct_9fa48("1547") ? {} : (stryCov_9fa48("1547"), {
            id: attachmentId,
            entryId: entryId,
            iv: bufferToHex(iv),
            encrypted_data: bufferToHex(cipherBuffer as ArrayBuffer)
          }));
          const tx = this.opfsMockDb.transaction(stryMutAct_9fa48("1548") ? "" : (stryCov_9fa48("1548"), 'passwords'), stryMutAct_9fa48("1549") ? "" : (stryCov_9fa48("1549"), 'readwrite'));
          const store = tx.objectStore(stryMutAct_9fa48("1550") ? "" : (stryCov_9fa48("1550"), 'passwords'));
          const entry = await store.get(entryId);
          if (stryMutAct_9fa48("1552") ? false : stryMutAct_9fa48("1551") ? true : (stryCov_9fa48("1551", "1552"), entry)) {
            if (stryMutAct_9fa48("1553")) {
              {}
            } else {
              stryCov_9fa48("1553");
              if (stryMutAct_9fa48("1556") ? false : stryMutAct_9fa48("1555") ? true : stryMutAct_9fa48("1554") ? entry.attachments : (stryCov_9fa48("1554", "1555", "1556"), !entry.attachments)) entry.attachments = stryMutAct_9fa48("1557") ? ["Stryker was here"] : (stryCov_9fa48("1557"), []);
              entry.attachments.push(attachmentMetaAtRest);
              await store.put(entry);
            }
          }
          await tx.done;
        }
      }
      return attachmentMeta;
    }
  }
  async getDecryptedAttachment(attachmentId: string): Promise<Blob> {
    if (stryMutAct_9fa48("1558")) {
      {}
    } else {
      stryCov_9fa48("1558");
      if (stryMutAct_9fa48("1561") ? !this.aesKey && !this.opfsMockDb && !this.sqliteDb : stryMutAct_9fa48("1560") ? false : stryMutAct_9fa48("1559") ? true : (stryCov_9fa48("1559", "1560", "1561"), (stryMutAct_9fa48("1562") ? this.aesKey : (stryCov_9fa48("1562"), !this.aesKey)) || (stryMutAct_9fa48("1564") ? !this.opfsMockDb || !this.sqliteDb : stryMutAct_9fa48("1563") ? false : (stryCov_9fa48("1563", "1564"), (stryMutAct_9fa48("1565") ? this.opfsMockDb : (stryCov_9fa48("1565"), !this.opfsMockDb)) && (stryMutAct_9fa48("1566") ? this.sqliteDb : (stryCov_9fa48("1566"), !this.sqliteDb)))))) throw new Error(stryMutAct_9fa48("1567") ? "" : (stryCov_9fa48("1567"), "Vault not initialized"));
      let record: Record<string, unknown> | null = null;

      // Primary read path: SQLite
      if (stryMutAct_9fa48("1570") ? this.useSQLite || this.sqliteDb : stryMutAct_9fa48("1569") ? false : stryMutAct_9fa48("1568") ? true : (stryCov_9fa48("1568", "1569", "1570"), this.useSQLite && this.sqliteDb)) {
        if (stryMutAct_9fa48("1571")) {
          {}
        } else {
          stryCov_9fa48("1571");
          const sqliteRecord = this.sqliteDb.getAttachment(attachmentId);
          if (stryMutAct_9fa48("1573") ? false : stryMutAct_9fa48("1572") ? true : (stryCov_9fa48("1572", "1573"), sqliteRecord)) {
            if (stryMutAct_9fa48("1574")) {
              {}
            } else {
              stryCov_9fa48("1574");
              record = sqliteRecord;
            }
          }
        }
      }

      // Fallback read path: IndexedDB
      if (stryMutAct_9fa48("1577") ? !record || this.opfsMockDb : stryMutAct_9fa48("1576") ? false : stryMutAct_9fa48("1575") ? true : (stryCov_9fa48("1575", "1576", "1577"), (stryMutAct_9fa48("1578") ? record : (stryCov_9fa48("1578"), !record)) && this.opfsMockDb)) {
        if (stryMutAct_9fa48("1579")) {
          {}
        } else {
          stryCov_9fa48("1579");
          record = await this.opfsMockDb.get(stryMutAct_9fa48("1580") ? "" : (stryCov_9fa48("1580"), 'attachments'), attachmentId);
        }
      }
      if (stryMutAct_9fa48("1583") ? false : stryMutAct_9fa48("1582") ? true : stryMutAct_9fa48("1581") ? record : (stryCov_9fa48("1581", "1582", "1583"), !record)) throw new Error(stryMutAct_9fa48("1584") ? "" : (stryCov_9fa48("1584"), "Attachment not found"));
      const plainBuffer = await window.crypto.subtle.decrypt(stryMutAct_9fa48("1585") ? {} : (stryCov_9fa48("1585"), {
        name: stryMutAct_9fa48("1586") ? "" : (stryCov_9fa48("1586"), "AES-GCM"),
        iv: toBufferSource(hexToBuffer(record.iv as string))
      }), this.aesKey, toBufferSource(hexToBuffer(record.encrypted_data as string)));

      // We don't have the mime type in this record directly, but it can be found in the password entry.
      // However, returning a generic Blob is fine as long as we trigger a download or load it.
      return new Blob(stryMutAct_9fa48("1587") ? [] : (stryCov_9fa48("1587"), [plainBuffer]));
    }
  }
  async deleteAttachment(entryId: number, attachmentId: string): Promise<void> {
    if (stryMutAct_9fa48("1588")) {
      {}
    } else {
      stryCov_9fa48("1588");
      if (stryMutAct_9fa48("1591") ? !this.opfsMockDb || !this.sqliteDb : stryMutAct_9fa48("1590") ? false : stryMutAct_9fa48("1589") ? true : (stryCov_9fa48("1589", "1590", "1591"), (stryMutAct_9fa48("1592") ? this.opfsMockDb : (stryCov_9fa48("1592"), !this.opfsMockDb)) && (stryMutAct_9fa48("1593") ? this.sqliteDb : (stryCov_9fa48("1593"), !this.sqliteDb)))) throw new Error(stryMutAct_9fa48("1594") ? "" : (stryCov_9fa48("1594"), "Vault not open"));

      // Primary delete path: SQLite
      if (stryMutAct_9fa48("1597") ? this.useSQLite || this.sqliteDb : stryMutAct_9fa48("1596") ? false : stryMutAct_9fa48("1595") ? true : (stryCov_9fa48("1595", "1596", "1597"), this.useSQLite && this.sqliteDb)) {
        if (stryMutAct_9fa48("1598")) {
          {}
        } else {
          stryCov_9fa48("1598");
          this.sqliteDb.deleteAttachment(attachmentId);
          const existingEntries = this.sqliteDb.getAllPasswords();
          const entry = existingEntries.find(stryMutAct_9fa48("1599") ? () => undefined : (stryCov_9fa48("1599"), (e: Record<string, unknown>) => stryMutAct_9fa48("1602") ? Number(e.id) !== Number(entryId) : stryMutAct_9fa48("1601") ? false : stryMutAct_9fa48("1600") ? true : (stryCov_9fa48("1600", "1601", "1602"), Number(e.id) === Number(entryId))));
          if (stryMutAct_9fa48("1605") ? entry || Array.isArray(entry.attachments) : stryMutAct_9fa48("1604") ? false : stryMutAct_9fa48("1603") ? true : (stryCov_9fa48("1603", "1604", "1605"), entry && Array.isArray(entry.attachments))) {
            if (stryMutAct_9fa48("1606")) {
              {}
            } else {
              stryCov_9fa48("1606");
              entry.attachments = stryMutAct_9fa48("1607") ? entry.attachments : (stryCov_9fa48("1607"), entry.attachments.filter(stryMutAct_9fa48("1608") ? () => undefined : (stryCov_9fa48("1608"), (a: VaultAttachmentMeta) => stryMutAct_9fa48("1611") ? a.id === attachmentId : stryMutAct_9fa48("1610") ? false : stryMutAct_9fa48("1609") ? true : (stryCov_9fa48("1609", "1610", "1611"), a.id !== attachmentId))));
              this.sqliteDb.putPassword(entry);
            }
          }
          await this.sqliteDb.flushToOPFS();
        }
      }

      // Fallback mirror path: IndexedDB
      if (stryMutAct_9fa48("1613") ? false : stryMutAct_9fa48("1612") ? true : (stryCov_9fa48("1612", "1613"), this.opfsMockDb)) {
        if (stryMutAct_9fa48("1614")) {
          {}
        } else {
          stryCov_9fa48("1614");
          await this.opfsMockDb.delete(stryMutAct_9fa48("1615") ? "" : (stryCov_9fa48("1615"), 'attachments'), attachmentId);
          const tx = this.opfsMockDb.transaction(stryMutAct_9fa48("1616") ? "" : (stryCov_9fa48("1616"), 'passwords'), stryMutAct_9fa48("1617") ? "" : (stryCov_9fa48("1617"), 'readwrite'));
          const store = tx.objectStore(stryMutAct_9fa48("1618") ? "" : (stryCov_9fa48("1618"), 'passwords'));
          const entry = await store.get(entryId);
          if (stryMutAct_9fa48("1621") ? entry || entry.attachments : stryMutAct_9fa48("1620") ? false : stryMutAct_9fa48("1619") ? true : (stryCov_9fa48("1619", "1620", "1621"), entry && entry.attachments)) {
            if (stryMutAct_9fa48("1622")) {
              {}
            } else {
              stryCov_9fa48("1622");
              entry.attachments = stryMutAct_9fa48("1623") ? entry.attachments : (stryCov_9fa48("1623"), entry.attachments.filter(stryMutAct_9fa48("1624") ? () => undefined : (stryCov_9fa48("1624"), (a: VaultAttachmentMeta) => stryMutAct_9fa48("1627") ? a.id === attachmentId : stryMutAct_9fa48("1626") ? false : stryMutAct_9fa48("1625") ? true : (stryCov_9fa48("1625", "1626", "1627"), a.id !== attachmentId))));
              await store.put(entry);
            }
          }
          await tx.done;
        }
      }
    }
  }

  // --- Trash & Deletion Features ---

  async moveToTrash(entryId: number): Promise<void> {
    if (stryMutAct_9fa48("1628")) {
      {}
    } else {
      stryCov_9fa48("1628");
      const deletedTime = new Date().toISOString();

      // Write to IDB Fallback
      if (stryMutAct_9fa48("1630") ? false : stryMutAct_9fa48("1629") ? true : (stryCov_9fa48("1629", "1630"), this.opfsMockDb)) {
        if (stryMutAct_9fa48("1631")) {
          {}
        } else {
          stryCov_9fa48("1631");
          const tx = this.opfsMockDb.transaction(stryMutAct_9fa48("1632") ? "" : (stryCov_9fa48("1632"), 'passwords'), stryMutAct_9fa48("1633") ? "" : (stryCov_9fa48("1633"), 'readwrite'));
          const store = tx.objectStore(stryMutAct_9fa48("1634") ? "" : (stryCov_9fa48("1634"), 'passwords'));
          const entry = await store.get(entryId);
          if (stryMutAct_9fa48("1636") ? false : stryMutAct_9fa48("1635") ? true : (stryCov_9fa48("1635", "1636"), entry)) {
            if (stryMutAct_9fa48("1637")) {
              {}
            } else {
              stryCov_9fa48("1637");
              entry.deletedAt = deletedTime;
              await store.put(entry);
            }
          }
          await tx.done;
        }
      }

      // Write to SQLite Primary
      if (stryMutAct_9fa48("1640") ? this.useSQLite || this.sqliteDb : stryMutAct_9fa48("1639") ? false : stryMutAct_9fa48("1638") ? true : (stryCov_9fa48("1638", "1639", "1640"), this.useSQLite && this.sqliteDb)) {
        if (stryMutAct_9fa48("1641")) {
          {}
        } else {
          stryCov_9fa48("1641");
          this.sqliteDb.updatePasswordField(entryId, stryMutAct_9fa48("1642") ? "" : (stryCov_9fa48("1642"), 'deleted_at'), deletedTime);
          await this.sqliteDb.flushToOPFS();
        }
      }

      // Invalidate Cache
      this.decryptedEntriesCache = null;
    }
  }
  async restoreFromTrash(entryId: number): Promise<void> {
    if (stryMutAct_9fa48("1643")) {
      {}
    } else {
      stryCov_9fa48("1643");
      // Write to IDB Fallback
      if (stryMutAct_9fa48("1645") ? false : stryMutAct_9fa48("1644") ? true : (stryCov_9fa48("1644", "1645"), this.opfsMockDb)) {
        if (stryMutAct_9fa48("1646")) {
          {}
        } else {
          stryCov_9fa48("1646");
          const tx = this.opfsMockDb.transaction(stryMutAct_9fa48("1647") ? "" : (stryCov_9fa48("1647"), 'passwords'), stryMutAct_9fa48("1648") ? "" : (stryCov_9fa48("1648"), 'readwrite'));
          const store = tx.objectStore(stryMutAct_9fa48("1649") ? "" : (stryCov_9fa48("1649"), 'passwords'));
          const entry = await store.get(entryId);
          if (stryMutAct_9fa48("1651") ? false : stryMutAct_9fa48("1650") ? true : (stryCov_9fa48("1650", "1651"), entry)) {
            if (stryMutAct_9fa48("1652")) {
              {}
            } else {
              stryCov_9fa48("1652");
              delete entry.deletedAt;
              await store.put(entry);
            }
          }
          await tx.done;
        }
      }

      // Write to SQLite Primary
      if (stryMutAct_9fa48("1655") ? this.useSQLite || this.sqliteDb : stryMutAct_9fa48("1654") ? false : stryMutAct_9fa48("1653") ? true : (stryCov_9fa48("1653", "1654", "1655"), this.useSQLite && this.sqliteDb)) {
        if (stryMutAct_9fa48("1656")) {
          {}
        } else {
          stryCov_9fa48("1656");
          // deleted_at = null (Since JS delete produces undefined/null which is serialized correctly or dropped)
          this.sqliteDb.updatePasswordField(entryId, stryMutAct_9fa48("1657") ? "" : (stryCov_9fa48("1657"), 'deleted_at'), null);
          await this.sqliteDb.flushToOPFS();
        }
      }

      // Invalidate Cache
      this.decryptedEntriesCache = null;
    }
  }
  async deletePermanently(entryId: number): Promise<void> {
    if (stryMutAct_9fa48("1658")) {
      {}
    } else {
      stryCov_9fa48("1658");
      // Delete from IDB
      if (stryMutAct_9fa48("1660") ? false : stryMutAct_9fa48("1659") ? true : (stryCov_9fa48("1659", "1660"), this.opfsMockDb)) {
        if (stryMutAct_9fa48("1661")) {
          {}
        } else {
          stryCov_9fa48("1661");
          const tx = this.opfsMockDb.transaction(stryMutAct_9fa48("1662") ? "" : (stryCov_9fa48("1662"), 'passwords'), stryMutAct_9fa48("1663") ? "" : (stryCov_9fa48("1663"), 'readwrite'));
          const store = tx.objectStore(stryMutAct_9fa48("1664") ? "" : (stryCov_9fa48("1664"), 'passwords'));
          const entry = await store.get(entryId);
          if (stryMutAct_9fa48("1667") ? entry || entry.attachments : stryMutAct_9fa48("1666") ? false : stryMutAct_9fa48("1665") ? true : (stryCov_9fa48("1665", "1666", "1667"), entry && entry.attachments)) {
            if (stryMutAct_9fa48("1668")) {
              {}
            } else {
              stryCov_9fa48("1668");
              for (const att of entry.attachments) {
                if (stryMutAct_9fa48("1669")) {
                  {}
                } else {
                  stryCov_9fa48("1669");
                  await this.opfsMockDb.delete(stryMutAct_9fa48("1670") ? "" : (stryCov_9fa48("1670"), 'attachments'), att.id);
                }
              }
            }
          }
          await store.delete(entryId);
          await tx.done;
        }
      }

      // Delete from SQLite
      if (stryMutAct_9fa48("1673") ? this.useSQLite || this.sqliteDb : stryMutAct_9fa48("1672") ? false : stryMutAct_9fa48("1671") ? true : (stryCov_9fa48("1671", "1672", "1673"), this.useSQLite && this.sqliteDb)) {
        if (stryMutAct_9fa48("1674")) {
          {}
        } else {
          stryCov_9fa48("1674");
          const dbAtts = this.sqliteDb.getAttachmentsByEntry(entryId);
          for (const id of dbAtts) {
            if (stryMutAct_9fa48("1675")) {
              {}
            } else {
              stryCov_9fa48("1675");
              this.sqliteDb.deleteAttachment(id);
            }
          }
          this.sqliteDb.deletePassword(entryId);
          await this.sqliteDb.flushToOPFS();
        }
      }

      // Invalidate Cache
      this.decryptedEntriesCache = null;
    }
  }
  async emptyTrash(): Promise<void> {
    if (stryMutAct_9fa48("1676")) {
      {}
    } else {
      stryCov_9fa48("1676");
      // Delete from IDB
      if (stryMutAct_9fa48("1678") ? false : stryMutAct_9fa48("1677") ? true : (stryCov_9fa48("1677", "1678"), this.opfsMockDb)) {
        if (stryMutAct_9fa48("1679")) {
          {}
        } else {
          stryCov_9fa48("1679");
          const all = await this.opfsMockDb.getAll(stryMutAct_9fa48("1680") ? "" : (stryCov_9fa48("1680"), 'passwords'));
          const trashed = stryMutAct_9fa48("1681") ? all : (stryCov_9fa48("1681"), all.filter(stryMutAct_9fa48("1682") ? () => undefined : (stryCov_9fa48("1682"), e => e.deletedAt)));
          for (const t of trashed) {
            if (stryMutAct_9fa48("1683")) {
              {}
            } else {
              stryCov_9fa48("1683");
              if (stryMutAct_9fa48("1685") ? false : stryMutAct_9fa48("1684") ? true : (stryCov_9fa48("1684", "1685"), t.attachments)) {
                if (stryMutAct_9fa48("1686")) {
                  {}
                } else {
                  stryCov_9fa48("1686");
                  for (const att of t.attachments) await this.opfsMockDb.delete(stryMutAct_9fa48("1687") ? "" : (stryCov_9fa48("1687"), 'attachments'), att.id);
                }
              }
              await this.opfsMockDb.delete(stryMutAct_9fa48("1688") ? "" : (stryCov_9fa48("1688"), 'passwords'), t.id);
            }
          }
        }
      }

      // Delete from SQLite
      if (stryMutAct_9fa48("1691") ? this.useSQLite || this.sqliteDb : stryMutAct_9fa48("1690") ? false : stryMutAct_9fa48("1689") ? true : (stryCov_9fa48("1689", "1690", "1691"), this.useSQLite && this.sqliteDb)) {
        if (stryMutAct_9fa48("1692")) {
          {}
        } else {
          stryCov_9fa48("1692");
          const allSql = this.sqliteDb.getAllPasswords() as VaultEntry[];
          const trashedSql = stryMutAct_9fa48("1693") ? allSql : (stryCov_9fa48("1693"), allSql.filter(stryMutAct_9fa48("1694") ? () => undefined : (stryCov_9fa48("1694"), e => e.deletedAt)));
          for (const t of trashedSql) {
            if (stryMutAct_9fa48("1695")) {
              {}
            } else {
              stryCov_9fa48("1695");
              const dbAtts = this.sqliteDb.getAttachmentsByEntry(t.id);
              for (const id of dbAtts) this.sqliteDb.deleteAttachment(id);
              this.sqliteDb.deletePassword(t.id);
            }
          }
          await this.sqliteDb.flushToOPFS();
        }
      }
    }
  }
  async cleanupTrash(): Promise<void> {
    if (stryMutAct_9fa48("1696")) {
      {}
    } else {
      stryCov_9fa48("1696");
      if (stryMutAct_9fa48("1699") ? false : stryMutAct_9fa48("1698") ? true : stryMutAct_9fa48("1697") ? this.opfsMockDb : (stryCov_9fa48("1697", "1698", "1699"), !this.opfsMockDb)) return;
      const allEntries: VaultEntry[] = await this.opfsMockDb.getAll(stryMutAct_9fa48("1700") ? "" : (stryCov_9fa48("1700"), 'passwords'));
      const msIn30Days = stryMutAct_9fa48("1701") ? 30 * 24 * 60 * 60 / 1000 : (stryCov_9fa48("1701"), (stryMutAct_9fa48("1702") ? 30 * 24 * 60 / 60 : (stryCov_9fa48("1702"), (stryMutAct_9fa48("1703") ? 30 * 24 / 60 : (stryCov_9fa48("1703"), (stryMutAct_9fa48("1704") ? 30 / 24 : (stryCov_9fa48("1704"), 30 * 24)) * 60)) * 60)) * 1000);
      const now = Date.now();
      const oldTrashEntries = stryMutAct_9fa48("1705") ? allEntries : (stryCov_9fa48("1705"), allEntries.filter(stryMutAct_9fa48("1706") ? () => undefined : (stryCov_9fa48("1706"), e => stryMutAct_9fa48("1709") ? e.deletedAt || now - new Date(e.deletedAt).getTime() > msIn30Days : stryMutAct_9fa48("1708") ? false : stryMutAct_9fa48("1707") ? true : (stryCov_9fa48("1707", "1708", "1709"), e.deletedAt && (stryMutAct_9fa48("1712") ? now - new Date(e.deletedAt).getTime() <= msIn30Days : stryMutAct_9fa48("1711") ? now - new Date(e.deletedAt).getTime() >= msIn30Days : stryMutAct_9fa48("1710") ? true : (stryCov_9fa48("1710", "1711", "1712"), (stryMutAct_9fa48("1713") ? now + new Date(e.deletedAt).getTime() : (stryCov_9fa48("1713"), now - new Date(e.deletedAt).getTime())) > msIn30Days))))));
      for (const entry of oldTrashEntries) {
        if (stryMutAct_9fa48("1714")) {
          {}
        } else {
          stryCov_9fa48("1714");
          await this.deletePermanently(entry.id);
        }
      }
    }
  }
}
export const vaultService = new VaultService();
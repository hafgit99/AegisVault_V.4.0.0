/**
 * SQLiteOPFS — sql.js (SQLite-WASM) + OPFS persistence katmanı.
 *
 * Mimari:
 * 1. sql.js ile bellek içi SQLite veritabanı açılır
 * 2. OPFS (Origin Private File System) üzerinde .sqlite dosyası olarak kalıcı depolama
 * 3. Her yazma işleminden sonra veritabanı OPFS'ye kaydedilir
 * 4. IndexedDB'den otomatik migrasyon desteği
 *
 * Uygulama düzeyinde AES-GCM şifreleme korunur — SQLite yalnızca
 * şifrelenmiş alanları depolar, hiçbir plaintext diske yazılmaz.
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
import type { VaultEntry } from '../vaultService';
//  sql.js type surface is incomplete in this setup
import initSqlJs, { type Database } from 'sql.js';

// sql.js WASM dosyasını Vite asset olarak yükle
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
type SQLitePasswordRow = Partial<VaultEntry> & Record<string, unknown> & {
  tags?: unknown;
  attachments?: unknown;
  search_index?: unknown;
  deleted_at?: string;
  deletedAt?: string;
  iv?: Uint8Array | ArrayLike<number>;
  encrypted_data?: Uint8Array | ArrayLike<number>;
  id?: string;
};
type SQLiteColumnInfoRow = [number, string, string, number, unknown, number];

// ─────────────────────────────────────────────────────────────────
// OPFS Yardımcıları
// ─────────────────────────────────────────────────────────────────

/** OPFS kullanılabilir mi? */
export function isOPFSAvailable(): boolean {
  if (stryMutAct_9fa48("928")) {
    {}
  } else {
    stryCov_9fa48("928");
    return stryMutAct_9fa48("931") ? typeof navigator !== 'undefined' && 'storage' in navigator || 'getDirectory' in navigator.storage : stryMutAct_9fa48("930") ? false : stryMutAct_9fa48("929") ? true : (stryCov_9fa48("929", "930", "931"), (stryMutAct_9fa48("933") ? typeof navigator !== 'undefined' || 'storage' in navigator : stryMutAct_9fa48("932") ? true : (stryCov_9fa48("932", "933"), (stryMutAct_9fa48("935") ? typeof navigator === 'undefined' : stryMutAct_9fa48("934") ? true : (stryCov_9fa48("934", "935"), typeof navigator !== (stryMutAct_9fa48("936") ? "" : (stryCov_9fa48("936"), 'undefined')))) && (stryMutAct_9fa48("937") ? "" : (stryCov_9fa48("937"), 'storage')) in navigator)) && (stryMutAct_9fa48("938") ? "" : (stryCov_9fa48("938"), 'getDirectory')) in navigator.storage);
  }
}

/** OPFS'den dosya oku (yoksa null döner) */
async function readOPFSFile(filename: string): Promise<Uint8Array | null> {
  if (stryMutAct_9fa48("939")) {
    {}
  } else {
    stryCov_9fa48("939");
    try {
      if (stryMutAct_9fa48("940")) {
        {}
      } else {
        stryCov_9fa48("940");
        const root = await navigator.storage.getDirectory();
        const fileHandle = await root.getFileHandle(filename);
        const file = await fileHandle.getFile();
        const buffer = await file.arrayBuffer();
        return new Uint8Array(buffer);
      }
    } catch {
      if (stryMutAct_9fa48("941")) {
        {}
      } else {
        stryCov_9fa48("941");
        return null; // Dosya bulunamadı
      }
    }
  }
}

/** OPFS'ye dosya yaz */
async function writeOPFSFile(filename: string, data: Uint8Array): Promise<void> {
  if (stryMutAct_9fa48("942")) {
    {}
  } else {
    stryCov_9fa48("942");
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(filename, stryMutAct_9fa48("943") ? {} : (stryCov_9fa48("943"), {
      create: stryMutAct_9fa48("944") ? false : (stryCov_9fa48("944"), true)
    }));
    const writable = await fileHandle.createWritable();
    await writable.write(new Blob(stryMutAct_9fa48("945") ? [] : (stryCov_9fa48("945"), [Uint8Array.from(data)])));
    await writable.close();
  }
}

/** OPFS'den dosya sil */
export async function deleteOPFSFile(filename: string): Promise<void> {
  if (stryMutAct_9fa48("946")) {
    {}
  } else {
    stryCov_9fa48("946");
    try {
      if (stryMutAct_9fa48("947")) {
        {}
      } else {
        stryCov_9fa48("947");
        const root = await navigator.storage.getDirectory();
        await root.removeEntry(filename);
      }
    } catch {
      // Dosya zaten yok
    }
  }
}

/** TÜM OPFS dosyalarını sil (Fabrika Ayarları için) */
export async function clearAllOPFSFiles(): Promise<void> {
  if (stryMutAct_9fa48("948")) {
    {}
  } else {
    stryCov_9fa48("948");
    if (stryMutAct_9fa48("951") ? false : stryMutAct_9fa48("950") ? true : stryMutAct_9fa48("949") ? isOPFSAvailable() : (stryCov_9fa48("949", "950", "951"), !isOPFSAvailable())) return;
    try {
      if (stryMutAct_9fa48("952")) {
        {}
      } else {
        stryCov_9fa48("952");
        const root = await navigator.storage.getDirectory();
        //  entries async iterator is not modeled on all TS lib versions
        for await (const [name] of root.entries()) {
          if (stryMutAct_9fa48("953")) {
            {}
          } else {
            stryCov_9fa48("953");
            if (stryMutAct_9fa48("956") ? name.startsWith('.sqlite') : stryMutAct_9fa48("955") ? false : stryMutAct_9fa48("954") ? true : (stryCov_9fa48("954", "955", "956"), name.endsWith(stryMutAct_9fa48("957") ? "" : (stryCov_9fa48("957"), '.sqlite')))) {
              if (stryMutAct_9fa48("958")) {
                {}
              } else {
                stryCov_9fa48("958");
                await root.removeEntry(name);
                console.log(stryMutAct_9fa48("959") ? `` : (stryCov_9fa48("959"), `[OPFS] Silindi: ${name}`));
              }
            }
          }
        }
      }
    } catch (error) {
      if (stryMutAct_9fa48("960")) {
        {}
      } else {
        stryCov_9fa48("960");
        console.warn(stryMutAct_9fa48("961") ? "" : (stryCov_9fa48("961"), '[OPFS] Toplu silme hatası:'), error);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// SQL Şeması
// ─────────────────────────────────────────────────────────────────

const SCHEMA_SQL = stryMutAct_9fa48("962") ? `` : (stryCov_9fa48("962"), `
CREATE TABLE IF NOT EXISTS passwords (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled',
  encrypted_title TEXT,
  title_iv TEXT,
  username TEXT DEFAULT '',
  encrypted_username TEXT,
  username_iv TEXT,
  encrypted_password TEXT,
  iv TEXT,
  category TEXT DEFAULT 'General',
  encrypted_category TEXT,
  category_iv TEXT,
  website TEXT DEFAULT '',
  encrypted_website TEXT,
  website_iv TEXT,
  encrypted_tags TEXT,
  tags_iv TEXT,
  search_index TEXT DEFAULT '[]',
  updated_at TEXT,
  strength INTEGER DEFAULT 0,
  tags TEXT DEFAULT '[]',
  pwned_count INTEGER DEFAULT 0,
  attachments TEXT DEFAULT '[]',
  deleted_at TEXT,
  totp_secret TEXT,
  totp_iv TEXT,
  totp_issuer TEXT,
  totp_algorithm TEXT,
  totp_digits INTEGER,
  totp_period INTEGER,
  encrypted_notes TEXT,
  notes_iv TEXT,
  encrypted_passkey_meta TEXT,
  passkey_meta_iv TEXT,
  encrypted_card_details TEXT,
  card_details_iv TEXT,
  encrypted_identity_details TEXT,
  identity_details_iv TEXT
);

CREATE TABLE IF NOT EXISTS vault_metadata (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  entry_id INTEGER,
  iv BLOB,
  encrypted_data BLOB
);

CREATE INDEX IF NOT EXISTS idx_passwords_category ON passwords(category);
CREATE INDEX IF NOT EXISTS idx_passwords_title ON passwords(title);
CREATE INDEX IF NOT EXISTS idx_attachments_entry ON attachments(entry_id);
`);

// ─────────────────────────────────────────────────────────────────
// SQLiteOPFS Sınıfı
// ─────────────────────────────────────────────────────────────────

export class SQLiteOPFS {
  private db: Database | null = null;
  private dbFilename: string;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private isDirty = stryMutAct_9fa48("963") ? true : (stryCov_9fa48("963"), false);
  constructor(dbName: string = stryMutAct_9fa48("964") ? "" : (stryCov_9fa48("964"), 'aegis_vault')) {
    if (stryMutAct_9fa48("965")) {
      {}
    } else {
      stryCov_9fa48("965");
      this.dbFilename = stryMutAct_9fa48("966") ? `` : (stryCov_9fa48("966"), `${dbName}.sqlite`);
    }
  }

  /** Veritabanını aç — OPFS'den yükle veya yeni oluştur */
  async open(): Promise<void> {
    if (stryMutAct_9fa48("967")) {
      {}
    } else {
      stryCov_9fa48("967");
      const SQL = await initSqlJs(stryMutAct_9fa48("968") ? {} : (stryCov_9fa48("968"), {
        locateFile: stryMutAct_9fa48("969") ? () => undefined : (stryCov_9fa48("969"), () => sqlWasmUrl)
      }));

      // OPFS'den mevcut veritabanını yükle
      const existingData = await readOPFSFile(this.dbFilename);
      if (stryMutAct_9fa48("972") ? existingData || existingData.length > 0 : stryMutAct_9fa48("971") ? false : stryMutAct_9fa48("970") ? true : (stryCov_9fa48("970", "971", "972"), existingData && (stryMutAct_9fa48("975") ? existingData.length <= 0 : stryMutAct_9fa48("974") ? existingData.length >= 0 : stryMutAct_9fa48("973") ? true : (stryCov_9fa48("973", "974", "975"), existingData.length > 0)))) {
        if (stryMutAct_9fa48("976")) {
          {}
        } else {
          stryCov_9fa48("976");
          this.db = new SQL.Database(existingData);
          console.log(stryMutAct_9fa48("977") ? `` : (stryCov_9fa48("977"), `[SQLiteOPFS] Mevcut veritabanı OPFS'den yüklendi: ${this.dbFilename} (${existingData.length} bytes)`));
        }
      } else {
        if (stryMutAct_9fa48("978")) {
          {}
        } else {
          stryCov_9fa48("978");
          this.db = new SQL.Database();
          console.log(stryMutAct_9fa48("979") ? `` : (stryCov_9fa48("979"), `[SQLiteOPFS] Yeni veritabanı oluşturuldu: ${this.dbFilename}`));
        }
      }

      // Şemayı uygula (IF NOT EXISTS güvenli)
      this.db.run(SCHEMA_SQL);

      // Eski veritabanları için eksik sütunları ekle (şema migrasyonu)
      const tableInfo = this.db.exec(stryMutAct_9fa48("980") ? "" : (stryCov_9fa48("980"), 'PRAGMA table_info(passwords)'));
      const existingCols = (stryMutAct_9fa48("984") ? tableInfo.length <= 0 : stryMutAct_9fa48("983") ? tableInfo.length >= 0 : stryMutAct_9fa48("982") ? false : stryMutAct_9fa48("981") ? true : (stryCov_9fa48("981", "982", "983", "984"), tableInfo.length > 0)) ? (tableInfo[0].values as SQLiteColumnInfoRow[]).map(stryMutAct_9fa48("985") ? () => undefined : (stryCov_9fa48("985"), row => row[1])) : stryMutAct_9fa48("986") ? ["Stryker was here"] : (stryCov_9fa48("986"), []);
      const requiredCols: [string, string][] = stryMutAct_9fa48("987") ? [] : (stryCov_9fa48("987"), [stryMutAct_9fa48("988") ? [] : (stryCov_9fa48("988"), [stryMutAct_9fa48("989") ? "" : (stryCov_9fa48("989"), 'encrypted_title'), stryMutAct_9fa48("990") ? "" : (stryCov_9fa48("990"), 'TEXT')]), stryMutAct_9fa48("991") ? [] : (stryCov_9fa48("991"), [stryMutAct_9fa48("992") ? "" : (stryCov_9fa48("992"), 'title_iv'), stryMutAct_9fa48("993") ? "" : (stryCov_9fa48("993"), 'TEXT')]), stryMutAct_9fa48("994") ? [] : (stryCov_9fa48("994"), [stryMutAct_9fa48("995") ? "" : (stryCov_9fa48("995"), 'encrypted_username'), stryMutAct_9fa48("996") ? "" : (stryCov_9fa48("996"), 'TEXT')]), stryMutAct_9fa48("997") ? [] : (stryCov_9fa48("997"), [stryMutAct_9fa48("998") ? "" : (stryCov_9fa48("998"), 'username_iv'), stryMutAct_9fa48("999") ? "" : (stryCov_9fa48("999"), 'TEXT')]), stryMutAct_9fa48("1000") ? [] : (stryCov_9fa48("1000"), [stryMutAct_9fa48("1001") ? "" : (stryCov_9fa48("1001"), 'encrypted_website'), stryMutAct_9fa48("1002") ? "" : (stryCov_9fa48("1002"), 'TEXT')]), stryMutAct_9fa48("1003") ? [] : (stryCov_9fa48("1003"), [stryMutAct_9fa48("1004") ? "" : (stryCov_9fa48("1004"), 'website_iv'), stryMutAct_9fa48("1005") ? "" : (stryCov_9fa48("1005"), 'TEXT')]), stryMutAct_9fa48("1006") ? [] : (stryCov_9fa48("1006"), [stryMutAct_9fa48("1007") ? "" : (stryCov_9fa48("1007"), 'encrypted_category'), stryMutAct_9fa48("1008") ? "" : (stryCov_9fa48("1008"), 'TEXT')]), stryMutAct_9fa48("1009") ? [] : (stryCov_9fa48("1009"), [stryMutAct_9fa48("1010") ? "" : (stryCov_9fa48("1010"), 'category_iv'), stryMutAct_9fa48("1011") ? "" : (stryCov_9fa48("1011"), 'TEXT')]), stryMutAct_9fa48("1012") ? [] : (stryCov_9fa48("1012"), [stryMutAct_9fa48("1013") ? "" : (stryCov_9fa48("1013"), 'encrypted_tags'), stryMutAct_9fa48("1014") ? "" : (stryCov_9fa48("1014"), 'TEXT')]), stryMutAct_9fa48("1015") ? [] : (stryCov_9fa48("1015"), [stryMutAct_9fa48("1016") ? "" : (stryCov_9fa48("1016"), 'tags_iv'), stryMutAct_9fa48("1017") ? "" : (stryCov_9fa48("1017"), 'TEXT')]), stryMutAct_9fa48("1018") ? [] : (stryCov_9fa48("1018"), [stryMutAct_9fa48("1019") ? "" : (stryCov_9fa48("1019"), 'search_index'), stryMutAct_9fa48("1020") ? "" : (stryCov_9fa48("1020"), 'TEXT')]), stryMutAct_9fa48("1021") ? [] : (stryCov_9fa48("1021"), [stryMutAct_9fa48("1022") ? "" : (stryCov_9fa48("1022"), 'deleted_at'), stryMutAct_9fa48("1023") ? "" : (stryCov_9fa48("1023"), 'TEXT')]), stryMutAct_9fa48("1024") ? [] : (stryCov_9fa48("1024"), [stryMutAct_9fa48("1025") ? "" : (stryCov_9fa48("1025"), 'totp_secret'), stryMutAct_9fa48("1026") ? "" : (stryCov_9fa48("1026"), 'TEXT')]), stryMutAct_9fa48("1027") ? [] : (stryCov_9fa48("1027"), [stryMutAct_9fa48("1028") ? "" : (stryCov_9fa48("1028"), 'totp_iv'), stryMutAct_9fa48("1029") ? "" : (stryCov_9fa48("1029"), 'TEXT')]), stryMutAct_9fa48("1030") ? [] : (stryCov_9fa48("1030"), [stryMutAct_9fa48("1031") ? "" : (stryCov_9fa48("1031"), 'totp_issuer'), stryMutAct_9fa48("1032") ? "" : (stryCov_9fa48("1032"), 'TEXT')]), stryMutAct_9fa48("1033") ? [] : (stryCov_9fa48("1033"), [stryMutAct_9fa48("1034") ? "" : (stryCov_9fa48("1034"), 'totp_algorithm'), stryMutAct_9fa48("1035") ? "" : (stryCov_9fa48("1035"), 'TEXT')]), stryMutAct_9fa48("1036") ? [] : (stryCov_9fa48("1036"), [stryMutAct_9fa48("1037") ? "" : (stryCov_9fa48("1037"), 'totp_digits'), stryMutAct_9fa48("1038") ? "" : (stryCov_9fa48("1038"), 'INTEGER')]), stryMutAct_9fa48("1039") ? [] : (stryCov_9fa48("1039"), [stryMutAct_9fa48("1040") ? "" : (stryCov_9fa48("1040"), 'totp_period'), stryMutAct_9fa48("1041") ? "" : (stryCov_9fa48("1041"), 'INTEGER')]), stryMutAct_9fa48("1042") ? [] : (stryCov_9fa48("1042"), [stryMutAct_9fa48("1043") ? "" : (stryCov_9fa48("1043"), 'encrypted_notes'), stryMutAct_9fa48("1044") ? "" : (stryCov_9fa48("1044"), 'TEXT')]), stryMutAct_9fa48("1045") ? [] : (stryCov_9fa48("1045"), [stryMutAct_9fa48("1046") ? "" : (stryCov_9fa48("1046"), 'notes_iv'), stryMutAct_9fa48("1047") ? "" : (stryCov_9fa48("1047"), 'TEXT')]), stryMutAct_9fa48("1048") ? [] : (stryCov_9fa48("1048"), [stryMutAct_9fa48("1049") ? "" : (stryCov_9fa48("1049"), 'encrypted_passkey_meta'), stryMutAct_9fa48("1050") ? "" : (stryCov_9fa48("1050"), 'TEXT')]), stryMutAct_9fa48("1051") ? [] : (stryCov_9fa48("1051"), [stryMutAct_9fa48("1052") ? "" : (stryCov_9fa48("1052"), 'passkey_meta_iv'), stryMutAct_9fa48("1053") ? "" : (stryCov_9fa48("1053"), 'TEXT')]), stryMutAct_9fa48("1054") ? [] : (stryCov_9fa48("1054"), [stryMutAct_9fa48("1055") ? "" : (stryCov_9fa48("1055"), 'encrypted_card_details'), stryMutAct_9fa48("1056") ? "" : (stryCov_9fa48("1056"), 'TEXT')]), stryMutAct_9fa48("1057") ? [] : (stryCov_9fa48("1057"), [stryMutAct_9fa48("1058") ? "" : (stryCov_9fa48("1058"), 'card_details_iv'), stryMutAct_9fa48("1059") ? "" : (stryCov_9fa48("1059"), 'TEXT')]), stryMutAct_9fa48("1060") ? [] : (stryCov_9fa48("1060"), [stryMutAct_9fa48("1061") ? "" : (stryCov_9fa48("1061"), 'encrypted_identity_details'), stryMutAct_9fa48("1062") ? "" : (stryCov_9fa48("1062"), 'TEXT')]), stryMutAct_9fa48("1063") ? [] : (stryCov_9fa48("1063"), [stryMutAct_9fa48("1064") ? "" : (stryCov_9fa48("1064"), 'identity_details_iv'), stryMutAct_9fa48("1065") ? "" : (stryCov_9fa48("1065"), 'TEXT')])]);
      for (const [col, type] of requiredCols) {
        if (stryMutAct_9fa48("1066")) {
          {}
        } else {
          stryCov_9fa48("1066");
          if (stryMutAct_9fa48("1069") ? false : stryMutAct_9fa48("1068") ? true : stryMutAct_9fa48("1067") ? existingCols.includes(col) : (stryCov_9fa48("1067", "1068", "1069"), !existingCols.includes(col))) {
            if (stryMutAct_9fa48("1070")) {
              {}
            } else {
              stryCov_9fa48("1070");
              console.warn(stryMutAct_9fa48("1071") ? `` : (stryCov_9fa48("1071"), `[SQLiteOPFS] Migration: Adding missing column "${col}" to passwords table`));
              this.db.run(stryMutAct_9fa48("1072") ? `` : (stryCov_9fa48("1072"), `ALTER TABLE passwords ADD COLUMN ${col} ${type}`));
            }
          }
        }
      }

      // WAL modu — daha iyi eşzamanlılık
      this.db.run(stryMutAct_9fa48("1073") ? "" : (stryCov_9fa48("1073"), 'PRAGMA journal_mode = WAL;'));

      // İlk kayıt
      await this.persistToOPFS();
    }
  }

  /** Veritabanını OPFS'ye kaydet */
  async persistToOPFS(): Promise<void> {
    if (stryMutAct_9fa48("1074")) {
      {}
    } else {
      stryCov_9fa48("1074");
      if (stryMutAct_9fa48("1077") ? false : stryMutAct_9fa48("1076") ? true : stryMutAct_9fa48("1075") ? this.db : (stryCov_9fa48("1075", "1076", "1077"), !this.db)) return;
      const data = this.db.export();
      const uint8 = new Uint8Array(data);
      await writeOPFSFile(this.dbFilename, uint8);
      this.isDirty = stryMutAct_9fa48("1078") ? true : (stryCov_9fa48("1078"), false);
    }
  }

  /** Debounced kaydet — sık yazma işlemlerinde performans için */
  schedulePersist(): void {
    if (stryMutAct_9fa48("1079")) {
      {}
    } else {
      stryCov_9fa48("1079");
      this.isDirty = stryMutAct_9fa48("1080") ? false : (stryCov_9fa48("1080"), true);
      if (stryMutAct_9fa48("1082") ? false : stryMutAct_9fa48("1081") ? true : (stryCov_9fa48("1081", "1082"), this.saveTimeout)) clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => {
        if (stryMutAct_9fa48("1083")) {
          {}
        } else {
          stryCov_9fa48("1083");
          this.persistToOPFS().catch(console.error);
        }
      }, 500);
    }
  }

  /** Hemen kaydet + debounce iptal */
  async flushToOPFS(): Promise<void> {
    if (stryMutAct_9fa48("1084")) {
      {}
    } else {
      stryCov_9fa48("1084");
      if (stryMutAct_9fa48("1086") ? false : stryMutAct_9fa48("1085") ? true : (stryCov_9fa48("1085", "1086"), this.saveTimeout)) {
        if (stryMutAct_9fa48("1087")) {
          {}
        } else {
          stryCov_9fa48("1087");
          clearTimeout(this.saveTimeout);
          this.saveTimeout = null;
        }
      }
      if (stryMutAct_9fa48("1089") ? false : stryMutAct_9fa48("1088") ? true : (stryCov_9fa48("1088", "1089"), this.isDirty)) {
        if (stryMutAct_9fa48("1090")) {
          {}
        } else {
          stryCov_9fa48("1090");
          await this.persistToOPFS();
        }
      }
    }
  }

  // ─── Passwords CRUD ───

  /** SQL değer formatla (sql.js db.run param binding çalışmadığı için inline kullanıyoruz) */
  private sqlVal(v: unknown): string {
    if (stryMutAct_9fa48("1091")) {
      {}
    } else {
      stryCov_9fa48("1091");
      if (stryMutAct_9fa48("1094") ? v === null && v === undefined : stryMutAct_9fa48("1093") ? false : stryMutAct_9fa48("1092") ? true : (stryCov_9fa48("1092", "1093", "1094"), (stryMutAct_9fa48("1096") ? v !== null : stryMutAct_9fa48("1095") ? false : (stryCov_9fa48("1095", "1096"), v === null)) || (stryMutAct_9fa48("1098") ? v !== undefined : stryMutAct_9fa48("1097") ? false : (stryCov_9fa48("1097", "1098"), v === undefined)))) return stryMutAct_9fa48("1099") ? "" : (stryCov_9fa48("1099"), 'NULL');
      if (stryMutAct_9fa48("1102") ? typeof v !== 'number' : stryMutAct_9fa48("1101") ? false : stryMutAct_9fa48("1100") ? true : (stryCov_9fa48("1100", "1101", "1102"), typeof v === (stryMutAct_9fa48("1103") ? "" : (stryCov_9fa48("1103"), 'number')))) return String(v);
      // String: tek tırnak escape
      return stryMutAct_9fa48("1104") ? `` : (stryCov_9fa48("1104"), `'${String(v).replace(/'/g, stryMutAct_9fa48("1105") ? "" : (stryCov_9fa48("1105"), "''"))}'`);
    }
  }
  putPassword(entry: VaultEntry | SQLitePasswordRow): void {
    if (stryMutAct_9fa48("1106")) {
      {}
    } else {
      stryCov_9fa48("1106");
      if (stryMutAct_9fa48("1109") ? false : stryMutAct_9fa48("1108") ? true : stryMutAct_9fa48("1107") ? this.db : (stryCov_9fa48("1107", "1108", "1109"), !this.db)) throw new Error(stryMutAct_9fa48("1110") ? "" : (stryCov_9fa48("1110"), 'Database not open'));
      const tags = JSON.stringify(stryMutAct_9fa48("1113") ? entry.tags && [] : stryMutAct_9fa48("1112") ? false : stryMutAct_9fa48("1111") ? true : (stryCov_9fa48("1111", "1112", "1113"), entry.tags || (stryMutAct_9fa48("1114") ? ["Stryker was here"] : (stryCov_9fa48("1114"), []))));
      const attachments = JSON.stringify(stryMutAct_9fa48("1117") ? entry.attachments && [] : stryMutAct_9fa48("1116") ? false : stryMutAct_9fa48("1115") ? true : (stryCov_9fa48("1115", "1116", "1117"), entry.attachments || (stryMutAct_9fa48("1118") ? ["Stryker was here"] : (stryCov_9fa48("1118"), []))));
      const sql = stryMutAct_9fa48("1119") ? `` : (stryCov_9fa48("1119"), `INSERT OR REPLACE INTO passwords 
       (id, title, encrypted_title, title_iv, username, encrypted_username, username_iv, encrypted_password, iv, category, encrypted_category, category_iv, website, encrypted_website, website_iv, encrypted_tags, tags_iv, search_index, updated_at, strength, tags, pwned_count, attachments, deleted_at, totp_secret, totp_iv, totp_issuer, totp_algorithm, totp_digits, totp_period, encrypted_notes, notes_iv, encrypted_passkey_meta, passkey_meta_iv, encrypted_card_details, card_details_iv, encrypted_identity_details, identity_details_iv)
       VALUES (${this.sqlVal(entry.id)}, ${this.sqlVal(stryMutAct_9fa48("1122") ? entry.title && 'Untitled' : stryMutAct_9fa48("1121") ? false : stryMutAct_9fa48("1120") ? true : (stryCov_9fa48("1120", "1121", "1122"), entry.title || (stryMutAct_9fa48("1123") ? "" : (stryCov_9fa48("1123"), 'Untitled'))))}, ${this.sqlVal(stryMutAct_9fa48("1126") ? entry.encrypted_title && null : stryMutAct_9fa48("1125") ? false : stryMutAct_9fa48("1124") ? true : (stryCov_9fa48("1124", "1125", "1126"), entry.encrypted_title || null))}, ${this.sqlVal(stryMutAct_9fa48("1129") ? entry.title_iv && null : stryMutAct_9fa48("1128") ? false : stryMutAct_9fa48("1127") ? true : (stryCov_9fa48("1127", "1128", "1129"), entry.title_iv || null))}, ${this.sqlVal(stryMutAct_9fa48("1132") ? entry.username && '' : stryMutAct_9fa48("1131") ? false : stryMutAct_9fa48("1130") ? true : (stryCov_9fa48("1130", "1131", "1132"), entry.username || (stryMutAct_9fa48("1133") ? "Stryker was here!" : (stryCov_9fa48("1133"), ''))))}, ${this.sqlVal(stryMutAct_9fa48("1136") ? entry.encrypted_username && null : stryMutAct_9fa48("1135") ? false : stryMutAct_9fa48("1134") ? true : (stryCov_9fa48("1134", "1135", "1136"), entry.encrypted_username || null))}, ${this.sqlVal(stryMutAct_9fa48("1139") ? entry.username_iv && null : stryMutAct_9fa48("1138") ? false : stryMutAct_9fa48("1137") ? true : (stryCov_9fa48("1137", "1138", "1139"), entry.username_iv || null))}, ${this.sqlVal(stryMutAct_9fa48("1142") ? entry.encrypted_password && null : stryMutAct_9fa48("1141") ? false : stryMutAct_9fa48("1140") ? true : (stryCov_9fa48("1140", "1141", "1142"), entry.encrypted_password || null))}, ${this.sqlVal(stryMutAct_9fa48("1145") ? entry.iv && null : stryMutAct_9fa48("1144") ? false : stryMutAct_9fa48("1143") ? true : (stryCov_9fa48("1143", "1144", "1145"), entry.iv || null))}, ${this.sqlVal(stryMutAct_9fa48("1148") ? entry.category && 'General' : stryMutAct_9fa48("1147") ? false : stryMutAct_9fa48("1146") ? true : (stryCov_9fa48("1146", "1147", "1148"), entry.category || (stryMutAct_9fa48("1149") ? "" : (stryCov_9fa48("1149"), 'General'))))}, ${this.sqlVal(stryMutAct_9fa48("1152") ? entry.encrypted_category && null : stryMutAct_9fa48("1151") ? false : stryMutAct_9fa48("1150") ? true : (stryCov_9fa48("1150", "1151", "1152"), entry.encrypted_category || null))}, ${this.sqlVal(stryMutAct_9fa48("1155") ? entry.category_iv && null : stryMutAct_9fa48("1154") ? false : stryMutAct_9fa48("1153") ? true : (stryCov_9fa48("1153", "1154", "1155"), entry.category_iv || null))}, ${this.sqlVal(stryMutAct_9fa48("1158") ? entry.website && '' : stryMutAct_9fa48("1157") ? false : stryMutAct_9fa48("1156") ? true : (stryCov_9fa48("1156", "1157", "1158"), entry.website || (stryMutAct_9fa48("1159") ? "Stryker was here!" : (stryCov_9fa48("1159"), ''))))}, ${this.sqlVal(stryMutAct_9fa48("1162") ? entry.encrypted_website && null : stryMutAct_9fa48("1161") ? false : stryMutAct_9fa48("1160") ? true : (stryCov_9fa48("1160", "1161", "1162"), entry.encrypted_website || null))}, ${this.sqlVal(stryMutAct_9fa48("1165") ? entry.website_iv && null : stryMutAct_9fa48("1164") ? false : stryMutAct_9fa48("1163") ? true : (stryCov_9fa48("1163", "1164", "1165"), entry.website_iv || null))}, ${this.sqlVal(stryMutAct_9fa48("1168") ? entry.encrypted_tags && null : stryMutAct_9fa48("1167") ? false : stryMutAct_9fa48("1166") ? true : (stryCov_9fa48("1166", "1167", "1168"), entry.encrypted_tags || null))}, ${this.sqlVal(stryMutAct_9fa48("1171") ? entry.tags_iv && null : stryMutAct_9fa48("1170") ? false : stryMutAct_9fa48("1169") ? true : (stryCov_9fa48("1169", "1170", "1171"), entry.tags_iv || null))}, ${this.sqlVal(JSON.stringify(stryMutAct_9fa48("1174") ? entry.search_index && [] : stryMutAct_9fa48("1173") ? false : stryMutAct_9fa48("1172") ? true : (stryCov_9fa48("1172", "1173", "1174"), entry.search_index || (stryMutAct_9fa48("1175") ? ["Stryker was here"] : (stryCov_9fa48("1175"), [])))))}, ${this.sqlVal(stryMutAct_9fa48("1178") ? entry.updated_at && new Date().toISOString() : stryMutAct_9fa48("1177") ? false : stryMutAct_9fa48("1176") ? true : (stryCov_9fa48("1176", "1177", "1178"), entry.updated_at || new Date().toISOString()))}, ${this.sqlVal(stryMutAct_9fa48("1181") ? entry.strength && 0 : stryMutAct_9fa48("1180") ? false : stryMutAct_9fa48("1179") ? true : (stryCov_9fa48("1179", "1180", "1181"), entry.strength || 0))}, ${this.sqlVal(tags)}, ${this.sqlVal(stryMutAct_9fa48("1184") ? entry.pwned_count && 0 : stryMutAct_9fa48("1183") ? false : stryMutAct_9fa48("1182") ? true : (stryCov_9fa48("1182", "1183", "1184"), entry.pwned_count || 0))}, ${this.sqlVal(attachments)}, ${this.sqlVal(stryMutAct_9fa48("1187") ? entry.deletedAt && ((entry as SQLitePasswordRow).deleted_at ?? null) : stryMutAct_9fa48("1186") ? false : stryMutAct_9fa48("1185") ? true : (stryCov_9fa48("1185", "1186", "1187"), entry.deletedAt || (stryMutAct_9fa48("1188") ? (entry as SQLitePasswordRow).deleted_at && null : (stryCov_9fa48("1188"), (entry as SQLitePasswordRow).deleted_at ?? null))))}, ${this.sqlVal(stryMutAct_9fa48("1191") ? entry.totp_secret && null : stryMutAct_9fa48("1190") ? false : stryMutAct_9fa48("1189") ? true : (stryCov_9fa48("1189", "1190", "1191"), entry.totp_secret || null))}, ${this.sqlVal(stryMutAct_9fa48("1194") ? entry.totp_iv && null : stryMutAct_9fa48("1193") ? false : stryMutAct_9fa48("1192") ? true : (stryCov_9fa48("1192", "1193", "1194"), entry.totp_iv || null))}, ${this.sqlVal(stryMutAct_9fa48("1197") ? entry.totp_issuer && null : stryMutAct_9fa48("1196") ? false : stryMutAct_9fa48("1195") ? true : (stryCov_9fa48("1195", "1196", "1197"), entry.totp_issuer || null))}, ${this.sqlVal(stryMutAct_9fa48("1200") ? entry.totp_algorithm && null : stryMutAct_9fa48("1199") ? false : stryMutAct_9fa48("1198") ? true : (stryCov_9fa48("1198", "1199", "1200"), entry.totp_algorithm || null))}, ${this.sqlVal(stryMutAct_9fa48("1203") ? entry.totp_digits && null : stryMutAct_9fa48("1202") ? false : stryMutAct_9fa48("1201") ? true : (stryCov_9fa48("1201", "1202", "1203"), entry.totp_digits || null))}, ${this.sqlVal(stryMutAct_9fa48("1206") ? entry.totp_period && null : stryMutAct_9fa48("1205") ? false : stryMutAct_9fa48("1204") ? true : (stryCov_9fa48("1204", "1205", "1206"), entry.totp_period || null))}, ${this.sqlVal(stryMutAct_9fa48("1209") ? entry.encrypted_notes && null : stryMutAct_9fa48("1208") ? false : stryMutAct_9fa48("1207") ? true : (stryCov_9fa48("1207", "1208", "1209"), entry.encrypted_notes || null))}, ${this.sqlVal(stryMutAct_9fa48("1212") ? entry.notes_iv && null : stryMutAct_9fa48("1211") ? false : stryMutAct_9fa48("1210") ? true : (stryCov_9fa48("1210", "1211", "1212"), entry.notes_iv || null))}, ${this.sqlVal(stryMutAct_9fa48("1215") ? entry.encrypted_passkey_meta && null : stryMutAct_9fa48("1214") ? false : stryMutAct_9fa48("1213") ? true : (stryCov_9fa48("1213", "1214", "1215"), entry.encrypted_passkey_meta || null))}, ${this.sqlVal(stryMutAct_9fa48("1218") ? entry.passkey_meta_iv && null : stryMutAct_9fa48("1217") ? false : stryMutAct_9fa48("1216") ? true : (stryCov_9fa48("1216", "1217", "1218"), entry.passkey_meta_iv || null))}, ${this.sqlVal(stryMutAct_9fa48("1221") ? entry.encrypted_card_details && null : stryMutAct_9fa48("1220") ? false : stryMutAct_9fa48("1219") ? true : (stryCov_9fa48("1219", "1220", "1221"), entry.encrypted_card_details || null))}, ${this.sqlVal(stryMutAct_9fa48("1224") ? entry.card_details_iv && null : stryMutAct_9fa48("1223") ? false : stryMutAct_9fa48("1222") ? true : (stryCov_9fa48("1222", "1223", "1224"), entry.card_details_iv || null))}, ${this.sqlVal(stryMutAct_9fa48("1227") ? entry.encrypted_identity_details && null : stryMutAct_9fa48("1226") ? false : stryMutAct_9fa48("1225") ? true : (stryCov_9fa48("1225", "1226", "1227"), entry.encrypted_identity_details || null))}, ${this.sqlVal(stryMutAct_9fa48("1230") ? entry.identity_details_iv && null : stryMutAct_9fa48("1229") ? false : stryMutAct_9fa48("1228") ? true : (stryCov_9fa48("1228", "1229", "1230"), entry.identity_details_iv || null))})`);
      this.db.run(sql);
      this.schedulePersist();
    }
  }
  getAllPasswords(): SQLitePasswordRow[] {
    if (stryMutAct_9fa48("1231")) {
      {}
    } else {
      stryCov_9fa48("1231");
      if (stryMutAct_9fa48("1234") ? false : stryMutAct_9fa48("1233") ? true : stryMutAct_9fa48("1232") ? this.db : (stryCov_9fa48("1232", "1233", "1234"), !this.db)) return stryMutAct_9fa48("1235") ? ["Stryker was here"] : (stryCov_9fa48("1235"), []);
      const stmt = this.db.prepare(stryMutAct_9fa48("1236") ? "" : (stryCov_9fa48("1236"), 'SELECT * FROM passwords'));
      const results: SQLitePasswordRow[] = stryMutAct_9fa48("1237") ? ["Stryker was here"] : (stryCov_9fa48("1237"), []);
      while (stryMutAct_9fa48("1238") ? false : (stryCov_9fa48("1238"), stmt.step())) {
        if (stryMutAct_9fa48("1239")) {
          {}
        } else {
          stryCov_9fa48("1239");
          const row = stmt.getAsObject() as SQLitePasswordRow;
          // JSON alanlarını parse et
          try {
            if (stryMutAct_9fa48("1240")) {
              {}
            } else {
              stryCov_9fa48("1240");
              row.tags = JSON.parse(String(stryMutAct_9fa48("1243") ? row.tags && '[]' : stryMutAct_9fa48("1242") ? false : stryMutAct_9fa48("1241") ? true : (stryCov_9fa48("1241", "1242", "1243"), row.tags || (stryMutAct_9fa48("1244") ? "" : (stryCov_9fa48("1244"), '[]')))));
            }
          } catch {
            if (stryMutAct_9fa48("1245")) {
              {}
            } else {
              stryCov_9fa48("1245");
              row.tags = stryMutAct_9fa48("1246") ? ["Stryker was here"] : (stryCov_9fa48("1246"), []);
            }
          }
          try {
            if (stryMutAct_9fa48("1247")) {
              {}
            } else {
              stryCov_9fa48("1247");
              row.attachments = JSON.parse(String(stryMutAct_9fa48("1250") ? row.attachments && '[]' : stryMutAct_9fa48("1249") ? false : stryMutAct_9fa48("1248") ? true : (stryCov_9fa48("1248", "1249", "1250"), row.attachments || (stryMutAct_9fa48("1251") ? "" : (stryCov_9fa48("1251"), '[]')))));
            }
          } catch {
            if (stryMutAct_9fa48("1252")) {
              {}
            } else {
              stryCov_9fa48("1252");
              row.attachments = stryMutAct_9fa48("1253") ? ["Stryker was here"] : (stryCov_9fa48("1253"), []);
            }
          }
          try {
            if (stryMutAct_9fa48("1254")) {
              {}
            } else {
              stryCov_9fa48("1254");
              row.search_index = JSON.parse(String(stryMutAct_9fa48("1257") ? row.search_index && '[]' : stryMutAct_9fa48("1256") ? false : stryMutAct_9fa48("1255") ? true : (stryCov_9fa48("1255", "1256", "1257"), row.search_index || (stryMutAct_9fa48("1258") ? "" : (stryCov_9fa48("1258"), '[]')))));
            }
          } catch {
            if (stryMutAct_9fa48("1259")) {
              {}
            } else {
              stryCov_9fa48("1259");
              row.search_index = stryMutAct_9fa48("1260") ? ["Stryker was here"] : (stryCov_9fa48("1260"), []);
            }
          }
          // deleted_at → deletedAt dönüşümü (IDB uyumluluğu)
          if (stryMutAct_9fa48("1262") ? false : stryMutAct_9fa48("1261") ? true : (stryCov_9fa48("1261", "1262"), row.deleted_at)) row.deletedAt = row.deleted_at;
          results.push(row);
        }
      }
      stmt.free();
      return results;
    }
  }
  deletePassword(id: number): void {
    if (stryMutAct_9fa48("1263")) {
      {}
    } else {
      stryCov_9fa48("1263");
      if (stryMutAct_9fa48("1266") ? false : stryMutAct_9fa48("1265") ? true : stryMutAct_9fa48("1264") ? this.db : (stryCov_9fa48("1264", "1265", "1266"), !this.db)) throw new Error(stryMutAct_9fa48("1267") ? "" : (stryCov_9fa48("1267"), 'Database not open'));
      this.db.run(stryMutAct_9fa48("1268") ? `` : (stryCov_9fa48("1268"), `DELETE FROM passwords WHERE id = ${id}`));
      this.schedulePersist();
    }
  }
  updatePasswordField(id: number, field: string, value: unknown): void {
    if (stryMutAct_9fa48("1269")) {
      {}
    } else {
      stryCov_9fa48("1269");
      if (stryMutAct_9fa48("1272") ? false : stryMutAct_9fa48("1271") ? true : stryMutAct_9fa48("1270") ? this.db : (stryCov_9fa48("1270", "1271", "1272"), !this.db)) throw new Error(stryMutAct_9fa48("1273") ? "" : (stryCov_9fa48("1273"), 'Database not open'));

      // Check if the column exists — old OPFS files may lack newer columns
      const tableInfo = this.db.exec(stryMutAct_9fa48("1274") ? "" : (stryCov_9fa48("1274"), 'PRAGMA table_info(passwords)'));
      const columns = (stryMutAct_9fa48("1278") ? tableInfo.length <= 0 : stryMutAct_9fa48("1277") ? tableInfo.length >= 0 : stryMutAct_9fa48("1276") ? false : stryMutAct_9fa48("1275") ? true : (stryCov_9fa48("1275", "1276", "1277", "1278"), tableInfo.length > 0)) ? (tableInfo[0].values as SQLiteColumnInfoRow[]).map(stryMutAct_9fa48("1279") ? () => undefined : (stryCov_9fa48("1279"), row => row[1])) : stryMutAct_9fa48("1280") ? ["Stryker was here"] : (stryCov_9fa48("1280"), []);
      if (stryMutAct_9fa48("1283") ? false : stryMutAct_9fa48("1282") ? true : stryMutAct_9fa48("1281") ? columns.includes(field) : (stryCov_9fa48("1281", "1282", "1283"), !columns.includes(field))) {
        if (stryMutAct_9fa48("1284")) {
          {}
        } else {
          stryCov_9fa48("1284");
          console.warn(stryMutAct_9fa48("1285") ? `` : (stryCov_9fa48("1285"), `[SQLiteOPFS] Migration: Adding missing column "${field}" to passwords table`));
          this.db.run(stryMutAct_9fa48("1286") ? `` : (stryCov_9fa48("1286"), `ALTER TABLE passwords ADD COLUMN ${field} TEXT`));
        }
      }

      // Use prepared statement to avoid sql.js db.run() param binding issues
      const safeValue = (stryMutAct_9fa48("1289") ? value === null && value === undefined : stryMutAct_9fa48("1288") ? false : stryMutAct_9fa48("1287") ? true : (stryCov_9fa48("1287", "1288", "1289"), (stryMutAct_9fa48("1291") ? value !== null : stryMutAct_9fa48("1290") ? false : (stryCov_9fa48("1290", "1291"), value === null)) || (stryMutAct_9fa48("1293") ? value !== undefined : stryMutAct_9fa48("1292") ? false : (stryCov_9fa48("1292", "1293"), value === undefined)))) ? stryMutAct_9fa48("1294") ? "" : (stryCov_9fa48("1294"), 'NULL') : stryMutAct_9fa48("1295") ? `` : (stryCov_9fa48("1295"), `'${String(value).replace(/'/g, stryMutAct_9fa48("1296") ? "" : (stryCov_9fa48("1296"), "''"))}'`);
      const sql = stryMutAct_9fa48("1297") ? `` : (stryCov_9fa48("1297"), `UPDATE passwords SET ${field} = ${safeValue} WHERE id = ${id}`);
      this.db.run(sql);
      const modified = this.db.getRowsModified();
      console.log(stryMutAct_9fa48("1298") ? `` : (stryCov_9fa48("1298"), `[SQLiteOPFS] updatePasswordField id=${id} field=${field} rowsModified=${modified}`));
      this.schedulePersist();
    }
  }
  countPasswords(): number {
    if (stryMutAct_9fa48("1299")) {
      {}
    } else {
      stryCov_9fa48("1299");
      if (stryMutAct_9fa48("1302") ? false : stryMutAct_9fa48("1301") ? true : stryMutAct_9fa48("1300") ? this.db : (stryCov_9fa48("1300", "1301", "1302"), !this.db)) return 0;
      const result = this.db.exec(stryMutAct_9fa48("1303") ? "" : (stryCov_9fa48("1303"), 'SELECT COUNT(*) as count FROM passwords'));
      return (stryMutAct_9fa48("1307") ? result.length <= 0 : stryMutAct_9fa48("1306") ? result.length >= 0 : stryMutAct_9fa48("1305") ? false : stryMutAct_9fa48("1304") ? true : (stryCov_9fa48("1304", "1305", "1306", "1307"), result.length > 0)) ? result[0].values[0][0] as number : 0;
    }
  }

  // ─── Metadata CRUD ───

  putMetadata<T>(id: string, data: T): void {
    if (stryMutAct_9fa48("1308")) {
      {}
    } else {
      stryCov_9fa48("1308");
      if (stryMutAct_9fa48("1311") ? false : stryMutAct_9fa48("1310") ? true : stryMutAct_9fa48("1309") ? this.db : (stryCov_9fa48("1309", "1310", "1311"), !this.db)) throw new Error(stryMutAct_9fa48("1312") ? "" : (stryCov_9fa48("1312"), 'Database not open'));
      const val = (stryMutAct_9fa48("1315") ? data !== null : stryMutAct_9fa48("1314") ? false : stryMutAct_9fa48("1313") ? true : (stryCov_9fa48("1313", "1314", "1315"), data === null)) ? null : JSON.stringify(data);
      this.db.run(stryMutAct_9fa48("1316") ? `` : (stryCov_9fa48("1316"), `INSERT OR REPLACE INTO vault_metadata (id, data) VALUES (${this.sqlVal(id)}, ${this.sqlVal(val)})`));
      this.schedulePersist();
    }
  }
  deleteMetadata(id: string): void {
    if (stryMutAct_9fa48("1317")) {
      {}
    } else {
      stryCov_9fa48("1317");
      if (stryMutAct_9fa48("1320") ? false : stryMutAct_9fa48("1319") ? true : stryMutAct_9fa48("1318") ? this.db : (stryCov_9fa48("1318", "1319", "1320"), !this.db)) return;
      this.db.run(stryMutAct_9fa48("1321") ? `` : (stryCov_9fa48("1321"), `DELETE FROM vault_metadata WHERE id = ${this.sqlVal(id)}`));
      this.schedulePersist();
    }
  }
  getMetadata<T = Record<string, unknown>>(id: string): T | null {
    if (stryMutAct_9fa48("1322")) {
      {}
    } else {
      stryCov_9fa48("1322");
      if (stryMutAct_9fa48("1325") ? false : stryMutAct_9fa48("1324") ? true : stryMutAct_9fa48("1323") ? this.db : (stryCov_9fa48("1323", "1324", "1325"), !this.db)) return null;
      const sql = stryMutAct_9fa48("1326") ? `` : (stryCov_9fa48("1326"), `SELECT data FROM vault_metadata WHERE id = ${this.sqlVal(id)}`);
      const resultArr = this.db.exec(sql);
      if (stryMutAct_9fa48("1329") ? resultArr.length > 0 || resultArr[0].values.length > 0 : stryMutAct_9fa48("1328") ? false : stryMutAct_9fa48("1327") ? true : (stryCov_9fa48("1327", "1328", "1329"), (stryMutAct_9fa48("1332") ? resultArr.length <= 0 : stryMutAct_9fa48("1331") ? resultArr.length >= 0 : stryMutAct_9fa48("1330") ? true : (stryCov_9fa48("1330", "1331", "1332"), resultArr.length > 0)) && (stryMutAct_9fa48("1335") ? resultArr[0].values.length <= 0 : stryMutAct_9fa48("1334") ? resultArr[0].values.length >= 0 : stryMutAct_9fa48("1333") ? true : (stryCov_9fa48("1333", "1334", "1335"), resultArr[0].values.length > 0)))) {
        if (stryMutAct_9fa48("1336")) {
          {}
        } else {
          stryCov_9fa48("1336");
          try {
            if (stryMutAct_9fa48("1337")) {
              {}
            } else {
              stryCov_9fa48("1337");
              const val = resultArr[0].values[0][0];
              return val ? JSON.parse(val as string) as T : null;
            }
          } catch (error) {
            if (stryMutAct_9fa48("1338")) {
              {}
            } else {
              stryCov_9fa48("1338");
              console.error(stryMutAct_9fa48("1339") ? "" : (stryCov_9fa48("1339"), '[SQLiteOPFS] Metadata parse error:'), error);
              return null;
            }
          }
        }
      }
      return null;
    }
  }

  // ─── Attachments CRUD ───

  putAttachment(id: string, entryId: number, iv: Uint8Array, encryptedData: ArrayBuffer): void {
    if (stryMutAct_9fa48("1340")) {
      {}
    } else {
      stryCov_9fa48("1340");
      if (stryMutAct_9fa48("1343") ? false : stryMutAct_9fa48("1342") ? true : stryMutAct_9fa48("1341") ? this.db : (stryCov_9fa48("1341", "1342", "1343"), !this.db)) throw new Error(stryMutAct_9fa48("1344") ? "" : (stryCov_9fa48("1344"), 'Database not open'));
      // Attachments still use param binding since they deal with binary BLOB data
      // that can't be safely inlined into SQL strings
      const stmt = this.db.prepare(stryMutAct_9fa48("1345") ? "" : (stryCov_9fa48("1345"), 'INSERT OR REPLACE INTO attachments (id, entry_id, iv, encrypted_data) VALUES (?, ?, ?, ?)'));
      stmt.run(stryMutAct_9fa48("1346") ? [] : (stryCov_9fa48("1346"), [id, entryId, iv, new Uint8Array(encryptedData)]));
      stmt.free();
      this.schedulePersist();
    }
  }
  getAttachment(id: string): {
    iv: Uint8Array;
    encrypted_data: Uint8Array;
  } | null {
    if (stryMutAct_9fa48("1347")) {
      {}
    } else {
      stryCov_9fa48("1347");
      if (stryMutAct_9fa48("1350") ? false : stryMutAct_9fa48("1349") ? true : stryMutAct_9fa48("1348") ? this.db : (stryCov_9fa48("1348", "1349", "1350"), !this.db)) return null;
      const stmt = this.db.prepare(stryMutAct_9fa48("1351") ? "" : (stryCov_9fa48("1351"), 'SELECT iv, encrypted_data FROM attachments WHERE id = ?'));
      stmt.bind(stryMutAct_9fa48("1352") ? [] : (stryCov_9fa48("1352"), [id]));
      let result: {
        iv: Uint8Array;
        encrypted_data: Uint8Array;
      } | null = null;
      if (stryMutAct_9fa48("1354") ? false : stryMutAct_9fa48("1353") ? true : (stryCov_9fa48("1353", "1354"), stmt.step())) {
        if (stryMutAct_9fa48("1355")) {
          {}
        } else {
          stryCov_9fa48("1355");
          const row = stmt.getAsObject() as SQLitePasswordRow;
          result = stryMutAct_9fa48("1356") ? {} : (stryCov_9fa48("1356"), {
            iv: new Uint8Array(row.iv as ArrayLike<number>),
            encrypted_data: new Uint8Array(row.encrypted_data as ArrayLike<number>)
          });
        }
      }
      stmt.free();
      return result;
    }
  }
  deleteAttachment(id: string): void {
    if (stryMutAct_9fa48("1357")) {
      {}
    } else {
      stryCov_9fa48("1357");
      if (stryMutAct_9fa48("1360") ? false : stryMutAct_9fa48("1359") ? true : stryMutAct_9fa48("1358") ? this.db : (stryCov_9fa48("1358", "1359", "1360"), !this.db)) throw new Error(stryMutAct_9fa48("1361") ? "" : (stryCov_9fa48("1361"), 'Database not open'));
      this.db.run(stryMutAct_9fa48("1362") ? `` : (stryCov_9fa48("1362"), `DELETE FROM attachments WHERE id = ${this.sqlVal(id)}`));
      this.schedulePersist();
    }
  }
  getAttachmentsByEntry(entryId: number): string[] {
    if (stryMutAct_9fa48("1363")) {
      {}
    } else {
      stryCov_9fa48("1363");
      if (stryMutAct_9fa48("1366") ? false : stryMutAct_9fa48("1365") ? true : stryMutAct_9fa48("1364") ? this.db : (stryCov_9fa48("1364", "1365", "1366"), !this.db)) return stryMutAct_9fa48("1367") ? ["Stryker was here"] : (stryCov_9fa48("1367"), []);
      const stmt = this.db.prepare(stryMutAct_9fa48("1368") ? "" : (stryCov_9fa48("1368"), 'SELECT id FROM attachments WHERE entry_id = ?'));
      stmt.bind(stryMutAct_9fa48("1369") ? [] : (stryCov_9fa48("1369"), [entryId]));
      const ids: string[] = stryMutAct_9fa48("1370") ? ["Stryker was here"] : (stryCov_9fa48("1370"), []);
      while (stryMutAct_9fa48("1371") ? false : (stryCov_9fa48("1371"), stmt.step())) {
        if (stryMutAct_9fa48("1372")) {
          {}
        } else {
          stryCov_9fa48("1372");
          ids.push(stmt.getAsObject().id as string);
        }
      }
      stmt.free();
      return ids;
    }
  }

  // ─── Genel İşlemler ───

  /** Tüm veritabanını temizle */
  async wipeAll(): Promise<void> {
    if (stryMutAct_9fa48("1373")) {
      {}
    } else {
      stryCov_9fa48("1373");
      if (stryMutAct_9fa48("1375") ? false : stryMutAct_9fa48("1374") ? true : (stryCov_9fa48("1374", "1375"), this.db)) {
        if (stryMutAct_9fa48("1376")) {
          {}
        } else {
          stryCov_9fa48("1376");
          this.db.run(stryMutAct_9fa48("1377") ? "" : (stryCov_9fa48("1377"), 'DELETE FROM passwords'));
          this.db.run(stryMutAct_9fa48("1378") ? "" : (stryCov_9fa48("1378"), 'DELETE FROM vault_metadata'));
          this.db.run(stryMutAct_9fa48("1379") ? "" : (stryCov_9fa48("1379"), 'DELETE FROM attachments'));
          await this.persistToOPFS();
        }
      }
      await deleteOPFSFile(this.dbFilename);
    }
  }

  /** Veritabanını kapat */
  async close(): Promise<void> {
    if (stryMutAct_9fa48("1380")) {
      {}
    } else {
      stryCov_9fa48("1380");
      await this.flushToOPFS();
      if (stryMutAct_9fa48("1382") ? false : stryMutAct_9fa48("1381") ? true : (stryCov_9fa48("1381", "1382"), this.db)) {
        if (stryMutAct_9fa48("1383")) {
          {}
        } else {
          stryCov_9fa48("1383");
          this.db.close();
          this.db = null;
        }
      }
    }
  }

  /** Veritabanı açık mı? */
  get isOpen(): boolean {
    if (stryMutAct_9fa48("1384")) {
      {}
    } else {
      stryCov_9fa48("1384");
      return stryMutAct_9fa48("1387") ? this.db === null : stryMutAct_9fa48("1386") ? false : stryMutAct_9fa48("1385") ? true : (stryCov_9fa48("1385", "1386", "1387"), this.db !== null);
    }
  }
}
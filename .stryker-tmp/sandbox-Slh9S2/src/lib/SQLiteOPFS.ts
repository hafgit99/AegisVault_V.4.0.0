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
  if (stryMutAct_9fa48("0")) {
    {}
  } else {
    stryCov_9fa48("0");
    return stryMutAct_9fa48("3") ? typeof navigator !== 'undefined' && 'storage' in navigator || 'getDirectory' in navigator.storage : stryMutAct_9fa48("2") ? false : stryMutAct_9fa48("1") ? true : (stryCov_9fa48("1", "2", "3"), (stryMutAct_9fa48("5") ? typeof navigator !== 'undefined' || 'storage' in navigator : stryMutAct_9fa48("4") ? true : (stryCov_9fa48("4", "5"), (stryMutAct_9fa48("7") ? typeof navigator === 'undefined' : stryMutAct_9fa48("6") ? true : (stryCov_9fa48("6", "7"), typeof navigator !== (stryMutAct_9fa48("8") ? "" : (stryCov_9fa48("8"), 'undefined')))) && (stryMutAct_9fa48("9") ? "" : (stryCov_9fa48("9"), 'storage')) in navigator)) && (stryMutAct_9fa48("10") ? "" : (stryCov_9fa48("10"), 'getDirectory')) in navigator.storage);
  }
}

/** OPFS'den dosya oku (yoksa null döner) */
async function readOPFSFile(filename: string): Promise<Uint8Array | null> {
  if (stryMutAct_9fa48("11")) {
    {}
  } else {
    stryCov_9fa48("11");
    try {
      if (stryMutAct_9fa48("12")) {
        {}
      } else {
        stryCov_9fa48("12");
        const root = await navigator.storage.getDirectory();
        const fileHandle = await root.getFileHandle(filename);
        const file = await fileHandle.getFile();
        const buffer = await file.arrayBuffer();
        return new Uint8Array(buffer);
      }
    } catch {
      if (stryMutAct_9fa48("13")) {
        {}
      } else {
        stryCov_9fa48("13");
        return null; // Dosya bulunamadı
      }
    }
  }
}

/** OPFS'ye dosya yaz */
async function writeOPFSFile(filename: string, data: Uint8Array): Promise<void> {
  if (stryMutAct_9fa48("14")) {
    {}
  } else {
    stryCov_9fa48("14");
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(filename, stryMutAct_9fa48("15") ? {} : (stryCov_9fa48("15"), {
      create: stryMutAct_9fa48("16") ? false : (stryCov_9fa48("16"), true)
    }));
    const writable = await fileHandle.createWritable();
    await writable.write(new Blob(stryMutAct_9fa48("17") ? [] : (stryCov_9fa48("17"), [Uint8Array.from(data)])));
    await writable.close();
  }
}

/** OPFS'den dosya sil */
export async function deleteOPFSFile(filename: string): Promise<void> {
  if (stryMutAct_9fa48("18")) {
    {}
  } else {
    stryCov_9fa48("18");
    try {
      if (stryMutAct_9fa48("19")) {
        {}
      } else {
        stryCov_9fa48("19");
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
  if (stryMutAct_9fa48("20")) {
    {}
  } else {
    stryCov_9fa48("20");
    if (stryMutAct_9fa48("23") ? false : stryMutAct_9fa48("22") ? true : stryMutAct_9fa48("21") ? isOPFSAvailable() : (stryCov_9fa48("21", "22", "23"), !isOPFSAvailable())) return;
    try {
      if (stryMutAct_9fa48("24")) {
        {}
      } else {
        stryCov_9fa48("24");
        const root = await navigator.storage.getDirectory();
        //  entries async iterator is not modeled on all TS lib versions
        for await (const [name] of root.entries()) {
          if (stryMutAct_9fa48("25")) {
            {}
          } else {
            stryCov_9fa48("25");
            if (stryMutAct_9fa48("28") ? name.startsWith('.sqlite') : stryMutAct_9fa48("27") ? false : stryMutAct_9fa48("26") ? true : (stryCov_9fa48("26", "27", "28"), name.endsWith(stryMutAct_9fa48("29") ? "" : (stryCov_9fa48("29"), '.sqlite')))) {
              if (stryMutAct_9fa48("30")) {
                {}
              } else {
                stryCov_9fa48("30");
                await root.removeEntry(name);
                console.log(stryMutAct_9fa48("31") ? `` : (stryCov_9fa48("31"), `[OPFS] Silindi: ${name}`));
              }
            }
          }
        }
      }
    } catch (error) {
      if (stryMutAct_9fa48("32")) {
        {}
      } else {
        stryCov_9fa48("32");
        console.warn(stryMutAct_9fa48("33") ? "" : (stryCov_9fa48("33"), '[OPFS] Toplu silme hatası:'), error);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// SQL Şeması
// ─────────────────────────────────────────────────────────────────

const SCHEMA_SQL = stryMutAct_9fa48("34") ? `` : (stryCov_9fa48("34"), `
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
  private isDirty = stryMutAct_9fa48("35") ? true : (stryCov_9fa48("35"), false);
  constructor(dbName: string = stryMutAct_9fa48("36") ? "" : (stryCov_9fa48("36"), 'aegis_vault')) {
    if (stryMutAct_9fa48("37")) {
      {}
    } else {
      stryCov_9fa48("37");
      this.dbFilename = stryMutAct_9fa48("38") ? `` : (stryCov_9fa48("38"), `${dbName}.sqlite`);
    }
  }

  /** Veritabanını aç — OPFS'den yükle veya yeni oluştur */
  async open(): Promise<void> {
    if (stryMutAct_9fa48("39")) {
      {}
    } else {
      stryCov_9fa48("39");
      const SQL = await initSqlJs(stryMutAct_9fa48("40") ? {} : (stryCov_9fa48("40"), {
        locateFile: stryMutAct_9fa48("41") ? () => undefined : (stryCov_9fa48("41"), () => sqlWasmUrl)
      }));

      // OPFS'den mevcut veritabanını yükle
      const existingData = await readOPFSFile(this.dbFilename);
      if (stryMutAct_9fa48("44") ? existingData || existingData.length > 0 : stryMutAct_9fa48("43") ? false : stryMutAct_9fa48("42") ? true : (stryCov_9fa48("42", "43", "44"), existingData && (stryMutAct_9fa48("47") ? existingData.length <= 0 : stryMutAct_9fa48("46") ? existingData.length >= 0 : stryMutAct_9fa48("45") ? true : (stryCov_9fa48("45", "46", "47"), existingData.length > 0)))) {
        if (stryMutAct_9fa48("48")) {
          {}
        } else {
          stryCov_9fa48("48");
          this.db = new SQL.Database(existingData);
          console.log(stryMutAct_9fa48("49") ? `` : (stryCov_9fa48("49"), `[SQLiteOPFS] Mevcut veritabanı OPFS'den yüklendi: ${this.dbFilename} (${existingData.length} bytes)`));
        }
      } else {
        if (stryMutAct_9fa48("50")) {
          {}
        } else {
          stryCov_9fa48("50");
          this.db = new SQL.Database();
          console.log(stryMutAct_9fa48("51") ? `` : (stryCov_9fa48("51"), `[SQLiteOPFS] Yeni veritabanı oluşturuldu: ${this.dbFilename}`));
        }
      }

      // Şemayı uygula (IF NOT EXISTS güvenli)
      this.db.run(SCHEMA_SQL);

      // Eski veritabanları için eksik sütunları ekle (şema migrasyonu)
      const tableInfo = this.db.exec(stryMutAct_9fa48("52") ? "" : (stryCov_9fa48("52"), 'PRAGMA table_info(passwords)'));
      const existingCols = (stryMutAct_9fa48("56") ? tableInfo.length <= 0 : stryMutAct_9fa48("55") ? tableInfo.length >= 0 : stryMutAct_9fa48("54") ? false : stryMutAct_9fa48("53") ? true : (stryCov_9fa48("53", "54", "55", "56"), tableInfo.length > 0)) ? (tableInfo[0].values as SQLiteColumnInfoRow[]).map(stryMutAct_9fa48("57") ? () => undefined : (stryCov_9fa48("57"), row => row[1])) : stryMutAct_9fa48("58") ? ["Stryker was here"] : (stryCov_9fa48("58"), []);
      const requiredCols: [string, string][] = stryMutAct_9fa48("59") ? [] : (stryCov_9fa48("59"), [stryMutAct_9fa48("60") ? [] : (stryCov_9fa48("60"), [stryMutAct_9fa48("61") ? "" : (stryCov_9fa48("61"), 'encrypted_title'), stryMutAct_9fa48("62") ? "" : (stryCov_9fa48("62"), 'TEXT')]), stryMutAct_9fa48("63") ? [] : (stryCov_9fa48("63"), [stryMutAct_9fa48("64") ? "" : (stryCov_9fa48("64"), 'title_iv'), stryMutAct_9fa48("65") ? "" : (stryCov_9fa48("65"), 'TEXT')]), stryMutAct_9fa48("66") ? [] : (stryCov_9fa48("66"), [stryMutAct_9fa48("67") ? "" : (stryCov_9fa48("67"), 'encrypted_username'), stryMutAct_9fa48("68") ? "" : (stryCov_9fa48("68"), 'TEXT')]), stryMutAct_9fa48("69") ? [] : (stryCov_9fa48("69"), [stryMutAct_9fa48("70") ? "" : (stryCov_9fa48("70"), 'username_iv'), stryMutAct_9fa48("71") ? "" : (stryCov_9fa48("71"), 'TEXT')]), stryMutAct_9fa48("72") ? [] : (stryCov_9fa48("72"), [stryMutAct_9fa48("73") ? "" : (stryCov_9fa48("73"), 'encrypted_website'), stryMutAct_9fa48("74") ? "" : (stryCov_9fa48("74"), 'TEXT')]), stryMutAct_9fa48("75") ? [] : (stryCov_9fa48("75"), [stryMutAct_9fa48("76") ? "" : (stryCov_9fa48("76"), 'website_iv'), stryMutAct_9fa48("77") ? "" : (stryCov_9fa48("77"), 'TEXT')]), stryMutAct_9fa48("78") ? [] : (stryCov_9fa48("78"), [stryMutAct_9fa48("79") ? "" : (stryCov_9fa48("79"), 'encrypted_category'), stryMutAct_9fa48("80") ? "" : (stryCov_9fa48("80"), 'TEXT')]), stryMutAct_9fa48("81") ? [] : (stryCov_9fa48("81"), [stryMutAct_9fa48("82") ? "" : (stryCov_9fa48("82"), 'category_iv'), stryMutAct_9fa48("83") ? "" : (stryCov_9fa48("83"), 'TEXT')]), stryMutAct_9fa48("84") ? [] : (stryCov_9fa48("84"), [stryMutAct_9fa48("85") ? "" : (stryCov_9fa48("85"), 'encrypted_tags'), stryMutAct_9fa48("86") ? "" : (stryCov_9fa48("86"), 'TEXT')]), stryMutAct_9fa48("87") ? [] : (stryCov_9fa48("87"), [stryMutAct_9fa48("88") ? "" : (stryCov_9fa48("88"), 'tags_iv'), stryMutAct_9fa48("89") ? "" : (stryCov_9fa48("89"), 'TEXT')]), stryMutAct_9fa48("90") ? [] : (stryCov_9fa48("90"), [stryMutAct_9fa48("91") ? "" : (stryCov_9fa48("91"), 'search_index'), stryMutAct_9fa48("92") ? "" : (stryCov_9fa48("92"), 'TEXT')]), stryMutAct_9fa48("93") ? [] : (stryCov_9fa48("93"), [stryMutAct_9fa48("94") ? "" : (stryCov_9fa48("94"), 'deleted_at'), stryMutAct_9fa48("95") ? "" : (stryCov_9fa48("95"), 'TEXT')]), stryMutAct_9fa48("96") ? [] : (stryCov_9fa48("96"), [stryMutAct_9fa48("97") ? "" : (stryCov_9fa48("97"), 'totp_secret'), stryMutAct_9fa48("98") ? "" : (stryCov_9fa48("98"), 'TEXT')]), stryMutAct_9fa48("99") ? [] : (stryCov_9fa48("99"), [stryMutAct_9fa48("100") ? "" : (stryCov_9fa48("100"), 'totp_iv'), stryMutAct_9fa48("101") ? "" : (stryCov_9fa48("101"), 'TEXT')]), stryMutAct_9fa48("102") ? [] : (stryCov_9fa48("102"), [stryMutAct_9fa48("103") ? "" : (stryCov_9fa48("103"), 'totp_issuer'), stryMutAct_9fa48("104") ? "" : (stryCov_9fa48("104"), 'TEXT')]), stryMutAct_9fa48("105") ? [] : (stryCov_9fa48("105"), [stryMutAct_9fa48("106") ? "" : (stryCov_9fa48("106"), 'totp_algorithm'), stryMutAct_9fa48("107") ? "" : (stryCov_9fa48("107"), 'TEXT')]), stryMutAct_9fa48("108") ? [] : (stryCov_9fa48("108"), [stryMutAct_9fa48("109") ? "" : (stryCov_9fa48("109"), 'totp_digits'), stryMutAct_9fa48("110") ? "" : (stryCov_9fa48("110"), 'INTEGER')]), stryMutAct_9fa48("111") ? [] : (stryCov_9fa48("111"), [stryMutAct_9fa48("112") ? "" : (stryCov_9fa48("112"), 'totp_period'), stryMutAct_9fa48("113") ? "" : (stryCov_9fa48("113"), 'INTEGER')]), stryMutAct_9fa48("114") ? [] : (stryCov_9fa48("114"), [stryMutAct_9fa48("115") ? "" : (stryCov_9fa48("115"), 'encrypted_notes'), stryMutAct_9fa48("116") ? "" : (stryCov_9fa48("116"), 'TEXT')]), stryMutAct_9fa48("117") ? [] : (stryCov_9fa48("117"), [stryMutAct_9fa48("118") ? "" : (stryCov_9fa48("118"), 'notes_iv'), stryMutAct_9fa48("119") ? "" : (stryCov_9fa48("119"), 'TEXT')]), stryMutAct_9fa48("120") ? [] : (stryCov_9fa48("120"), [stryMutAct_9fa48("121") ? "" : (stryCov_9fa48("121"), 'encrypted_passkey_meta'), stryMutAct_9fa48("122") ? "" : (stryCov_9fa48("122"), 'TEXT')]), stryMutAct_9fa48("123") ? [] : (stryCov_9fa48("123"), [stryMutAct_9fa48("124") ? "" : (stryCov_9fa48("124"), 'passkey_meta_iv'), stryMutAct_9fa48("125") ? "" : (stryCov_9fa48("125"), 'TEXT')]), stryMutAct_9fa48("126") ? [] : (stryCov_9fa48("126"), [stryMutAct_9fa48("127") ? "" : (stryCov_9fa48("127"), 'encrypted_card_details'), stryMutAct_9fa48("128") ? "" : (stryCov_9fa48("128"), 'TEXT')]), stryMutAct_9fa48("129") ? [] : (stryCov_9fa48("129"), [stryMutAct_9fa48("130") ? "" : (stryCov_9fa48("130"), 'card_details_iv'), stryMutAct_9fa48("131") ? "" : (stryCov_9fa48("131"), 'TEXT')]), stryMutAct_9fa48("132") ? [] : (stryCov_9fa48("132"), [stryMutAct_9fa48("133") ? "" : (stryCov_9fa48("133"), 'encrypted_identity_details'), stryMutAct_9fa48("134") ? "" : (stryCov_9fa48("134"), 'TEXT')]), stryMutAct_9fa48("135") ? [] : (stryCov_9fa48("135"), [stryMutAct_9fa48("136") ? "" : (stryCov_9fa48("136"), 'identity_details_iv'), stryMutAct_9fa48("137") ? "" : (stryCov_9fa48("137"), 'TEXT')])]);
      for (const [col, type] of requiredCols) {
        if (stryMutAct_9fa48("138")) {
          {}
        } else {
          stryCov_9fa48("138");
          if (stryMutAct_9fa48("141") ? false : stryMutAct_9fa48("140") ? true : stryMutAct_9fa48("139") ? existingCols.includes(col) : (stryCov_9fa48("139", "140", "141"), !existingCols.includes(col))) {
            if (stryMutAct_9fa48("142")) {
              {}
            } else {
              stryCov_9fa48("142");
              console.warn(stryMutAct_9fa48("143") ? `` : (stryCov_9fa48("143"), `[SQLiteOPFS] Migration: Adding missing column "${col}" to passwords table`));
              this.db.run(stryMutAct_9fa48("144") ? `` : (stryCov_9fa48("144"), `ALTER TABLE passwords ADD COLUMN ${col} ${type}`));
            }
          }
        }
      }

      // WAL modu — daha iyi eşzamanlılık
      this.db.run(stryMutAct_9fa48("145") ? "" : (stryCov_9fa48("145"), 'PRAGMA journal_mode = WAL;'));

      // İlk kayıt
      await this.persistToOPFS();
    }
  }

  /** Veritabanını OPFS'ye kaydet */
  async persistToOPFS(): Promise<void> {
    if (stryMutAct_9fa48("146")) {
      {}
    } else {
      stryCov_9fa48("146");
      if (stryMutAct_9fa48("149") ? false : stryMutAct_9fa48("148") ? true : stryMutAct_9fa48("147") ? this.db : (stryCov_9fa48("147", "148", "149"), !this.db)) return;
      const data = this.db.export();
      const uint8 = new Uint8Array(data);
      await writeOPFSFile(this.dbFilename, uint8);
      this.isDirty = stryMutAct_9fa48("150") ? true : (stryCov_9fa48("150"), false);
    }
  }

  /** Debounced kaydet — sık yazma işlemlerinde performans için */
  schedulePersist(): void {
    if (stryMutAct_9fa48("151")) {
      {}
    } else {
      stryCov_9fa48("151");
      this.isDirty = stryMutAct_9fa48("152") ? false : (stryCov_9fa48("152"), true);
      if (stryMutAct_9fa48("154") ? false : stryMutAct_9fa48("153") ? true : (stryCov_9fa48("153", "154"), this.saveTimeout)) clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => {
        if (stryMutAct_9fa48("155")) {
          {}
        } else {
          stryCov_9fa48("155");
          this.persistToOPFS().catch(console.error);
        }
      }, 500);
    }
  }

  /** Hemen kaydet + debounce iptal */
  async flushToOPFS(): Promise<void> {
    if (stryMutAct_9fa48("156")) {
      {}
    } else {
      stryCov_9fa48("156");
      if (stryMutAct_9fa48("158") ? false : stryMutAct_9fa48("157") ? true : (stryCov_9fa48("157", "158"), this.saveTimeout)) {
        if (stryMutAct_9fa48("159")) {
          {}
        } else {
          stryCov_9fa48("159");
          clearTimeout(this.saveTimeout);
          this.saveTimeout = null;
        }
      }
      if (stryMutAct_9fa48("161") ? false : stryMutAct_9fa48("160") ? true : (stryCov_9fa48("160", "161"), this.isDirty)) {
        if (stryMutAct_9fa48("162")) {
          {}
        } else {
          stryCov_9fa48("162");
          await this.persistToOPFS();
        }
      }
    }
  }

  // ─── Passwords CRUD ───

  /** SQL değer formatla (sql.js db.run param binding çalışmadığı için inline kullanıyoruz) */
  private sqlVal(v: unknown): string {
    if (stryMutAct_9fa48("163")) {
      {}
    } else {
      stryCov_9fa48("163");
      if (stryMutAct_9fa48("166") ? v === null && v === undefined : stryMutAct_9fa48("165") ? false : stryMutAct_9fa48("164") ? true : (stryCov_9fa48("164", "165", "166"), (stryMutAct_9fa48("168") ? v !== null : stryMutAct_9fa48("167") ? false : (stryCov_9fa48("167", "168"), v === null)) || (stryMutAct_9fa48("170") ? v !== undefined : stryMutAct_9fa48("169") ? false : (stryCov_9fa48("169", "170"), v === undefined)))) return stryMutAct_9fa48("171") ? "" : (stryCov_9fa48("171"), 'NULL');
      if (stryMutAct_9fa48("174") ? typeof v !== 'number' : stryMutAct_9fa48("173") ? false : stryMutAct_9fa48("172") ? true : (stryCov_9fa48("172", "173", "174"), typeof v === (stryMutAct_9fa48("175") ? "" : (stryCov_9fa48("175"), 'number')))) return String(v);
      // String: tek tırnak escape
      return stryMutAct_9fa48("176") ? `` : (stryCov_9fa48("176"), `'${String(v).replace(/'/g, stryMutAct_9fa48("177") ? "" : (stryCov_9fa48("177"), "''"))}'`);
    }
  }
  putPassword(entry: VaultEntry | SQLitePasswordRow): void {
    if (stryMutAct_9fa48("178")) {
      {}
    } else {
      stryCov_9fa48("178");
      if (stryMutAct_9fa48("181") ? false : stryMutAct_9fa48("180") ? true : stryMutAct_9fa48("179") ? this.db : (stryCov_9fa48("179", "180", "181"), !this.db)) throw new Error(stryMutAct_9fa48("182") ? "" : (stryCov_9fa48("182"), 'Database not open'));
      const tags = JSON.stringify(stryMutAct_9fa48("185") ? entry.tags && [] : stryMutAct_9fa48("184") ? false : stryMutAct_9fa48("183") ? true : (stryCov_9fa48("183", "184", "185"), entry.tags || (stryMutAct_9fa48("186") ? ["Stryker was here"] : (stryCov_9fa48("186"), []))));
      const attachments = JSON.stringify(stryMutAct_9fa48("189") ? entry.attachments && [] : stryMutAct_9fa48("188") ? false : stryMutAct_9fa48("187") ? true : (stryCov_9fa48("187", "188", "189"), entry.attachments || (stryMutAct_9fa48("190") ? ["Stryker was here"] : (stryCov_9fa48("190"), []))));
      const sql = stryMutAct_9fa48("191") ? `` : (stryCov_9fa48("191"), `INSERT OR REPLACE INTO passwords 
       (id, title, encrypted_title, title_iv, username, encrypted_username, username_iv, encrypted_password, iv, category, encrypted_category, category_iv, website, encrypted_website, website_iv, encrypted_tags, tags_iv, search_index, updated_at, strength, tags, pwned_count, attachments, deleted_at, totp_secret, totp_iv, totp_issuer, totp_algorithm, totp_digits, totp_period, encrypted_notes, notes_iv, encrypted_passkey_meta, passkey_meta_iv, encrypted_card_details, card_details_iv, encrypted_identity_details, identity_details_iv)
       VALUES (${this.sqlVal(entry.id)}, ${this.sqlVal(stryMutAct_9fa48("194") ? entry.title && 'Untitled' : stryMutAct_9fa48("193") ? false : stryMutAct_9fa48("192") ? true : (stryCov_9fa48("192", "193", "194"), entry.title || (stryMutAct_9fa48("195") ? "" : (stryCov_9fa48("195"), 'Untitled'))))}, ${this.sqlVal(stryMutAct_9fa48("198") ? entry.encrypted_title && null : stryMutAct_9fa48("197") ? false : stryMutAct_9fa48("196") ? true : (stryCov_9fa48("196", "197", "198"), entry.encrypted_title || null))}, ${this.sqlVal(stryMutAct_9fa48("201") ? entry.title_iv && null : stryMutAct_9fa48("200") ? false : stryMutAct_9fa48("199") ? true : (stryCov_9fa48("199", "200", "201"), entry.title_iv || null))}, ${this.sqlVal(stryMutAct_9fa48("204") ? entry.username && '' : stryMutAct_9fa48("203") ? false : stryMutAct_9fa48("202") ? true : (stryCov_9fa48("202", "203", "204"), entry.username || (stryMutAct_9fa48("205") ? "Stryker was here!" : (stryCov_9fa48("205"), ''))))}, ${this.sqlVal(stryMutAct_9fa48("208") ? entry.encrypted_username && null : stryMutAct_9fa48("207") ? false : stryMutAct_9fa48("206") ? true : (stryCov_9fa48("206", "207", "208"), entry.encrypted_username || null))}, ${this.sqlVal(stryMutAct_9fa48("211") ? entry.username_iv && null : stryMutAct_9fa48("210") ? false : stryMutAct_9fa48("209") ? true : (stryCov_9fa48("209", "210", "211"), entry.username_iv || null))}, ${this.sqlVal(stryMutAct_9fa48("214") ? entry.encrypted_password && null : stryMutAct_9fa48("213") ? false : stryMutAct_9fa48("212") ? true : (stryCov_9fa48("212", "213", "214"), entry.encrypted_password || null))}, ${this.sqlVal(stryMutAct_9fa48("217") ? entry.iv && null : stryMutAct_9fa48("216") ? false : stryMutAct_9fa48("215") ? true : (stryCov_9fa48("215", "216", "217"), entry.iv || null))}, ${this.sqlVal(stryMutAct_9fa48("220") ? entry.category && 'General' : stryMutAct_9fa48("219") ? false : stryMutAct_9fa48("218") ? true : (stryCov_9fa48("218", "219", "220"), entry.category || (stryMutAct_9fa48("221") ? "" : (stryCov_9fa48("221"), 'General'))))}, ${this.sqlVal(stryMutAct_9fa48("224") ? entry.encrypted_category && null : stryMutAct_9fa48("223") ? false : stryMutAct_9fa48("222") ? true : (stryCov_9fa48("222", "223", "224"), entry.encrypted_category || null))}, ${this.sqlVal(stryMutAct_9fa48("227") ? entry.category_iv && null : stryMutAct_9fa48("226") ? false : stryMutAct_9fa48("225") ? true : (stryCov_9fa48("225", "226", "227"), entry.category_iv || null))}, ${this.sqlVal(stryMutAct_9fa48("230") ? entry.website && '' : stryMutAct_9fa48("229") ? false : stryMutAct_9fa48("228") ? true : (stryCov_9fa48("228", "229", "230"), entry.website || (stryMutAct_9fa48("231") ? "Stryker was here!" : (stryCov_9fa48("231"), ''))))}, ${this.sqlVal(stryMutAct_9fa48("234") ? entry.encrypted_website && null : stryMutAct_9fa48("233") ? false : stryMutAct_9fa48("232") ? true : (stryCov_9fa48("232", "233", "234"), entry.encrypted_website || null))}, ${this.sqlVal(stryMutAct_9fa48("237") ? entry.website_iv && null : stryMutAct_9fa48("236") ? false : stryMutAct_9fa48("235") ? true : (stryCov_9fa48("235", "236", "237"), entry.website_iv || null))}, ${this.sqlVal(stryMutAct_9fa48("240") ? entry.encrypted_tags && null : stryMutAct_9fa48("239") ? false : stryMutAct_9fa48("238") ? true : (stryCov_9fa48("238", "239", "240"), entry.encrypted_tags || null))}, ${this.sqlVal(stryMutAct_9fa48("243") ? entry.tags_iv && null : stryMutAct_9fa48("242") ? false : stryMutAct_9fa48("241") ? true : (stryCov_9fa48("241", "242", "243"), entry.tags_iv || null))}, ${this.sqlVal(JSON.stringify(stryMutAct_9fa48("246") ? entry.search_index && [] : stryMutAct_9fa48("245") ? false : stryMutAct_9fa48("244") ? true : (stryCov_9fa48("244", "245", "246"), entry.search_index || (stryMutAct_9fa48("247") ? ["Stryker was here"] : (stryCov_9fa48("247"), [])))))}, ${this.sqlVal(stryMutAct_9fa48("250") ? entry.updated_at && new Date().toISOString() : stryMutAct_9fa48("249") ? false : stryMutAct_9fa48("248") ? true : (stryCov_9fa48("248", "249", "250"), entry.updated_at || new Date().toISOString()))}, ${this.sqlVal(stryMutAct_9fa48("253") ? entry.strength && 0 : stryMutAct_9fa48("252") ? false : stryMutAct_9fa48("251") ? true : (stryCov_9fa48("251", "252", "253"), entry.strength || 0))}, ${this.sqlVal(tags)}, ${this.sqlVal(stryMutAct_9fa48("256") ? entry.pwned_count && 0 : stryMutAct_9fa48("255") ? false : stryMutAct_9fa48("254") ? true : (stryCov_9fa48("254", "255", "256"), entry.pwned_count || 0))}, ${this.sqlVal(attachments)}, ${this.sqlVal(stryMutAct_9fa48("259") ? entry.deletedAt && ((entry as SQLitePasswordRow).deleted_at ?? null) : stryMutAct_9fa48("258") ? false : stryMutAct_9fa48("257") ? true : (stryCov_9fa48("257", "258", "259"), entry.deletedAt || (stryMutAct_9fa48("260") ? (entry as SQLitePasswordRow).deleted_at && null : (stryCov_9fa48("260"), (entry as SQLitePasswordRow).deleted_at ?? null))))}, ${this.sqlVal(stryMutAct_9fa48("263") ? entry.totp_secret && null : stryMutAct_9fa48("262") ? false : stryMutAct_9fa48("261") ? true : (stryCov_9fa48("261", "262", "263"), entry.totp_secret || null))}, ${this.sqlVal(stryMutAct_9fa48("266") ? entry.totp_iv && null : stryMutAct_9fa48("265") ? false : stryMutAct_9fa48("264") ? true : (stryCov_9fa48("264", "265", "266"), entry.totp_iv || null))}, ${this.sqlVal(stryMutAct_9fa48("269") ? entry.totp_issuer && null : stryMutAct_9fa48("268") ? false : stryMutAct_9fa48("267") ? true : (stryCov_9fa48("267", "268", "269"), entry.totp_issuer || null))}, ${this.sqlVal(stryMutAct_9fa48("272") ? entry.totp_algorithm && null : stryMutAct_9fa48("271") ? false : stryMutAct_9fa48("270") ? true : (stryCov_9fa48("270", "271", "272"), entry.totp_algorithm || null))}, ${this.sqlVal(stryMutAct_9fa48("275") ? entry.totp_digits && null : stryMutAct_9fa48("274") ? false : stryMutAct_9fa48("273") ? true : (stryCov_9fa48("273", "274", "275"), entry.totp_digits || null))}, ${this.sqlVal(stryMutAct_9fa48("278") ? entry.totp_period && null : stryMutAct_9fa48("277") ? false : stryMutAct_9fa48("276") ? true : (stryCov_9fa48("276", "277", "278"), entry.totp_period || null))}, ${this.sqlVal(stryMutAct_9fa48("281") ? entry.encrypted_notes && null : stryMutAct_9fa48("280") ? false : stryMutAct_9fa48("279") ? true : (stryCov_9fa48("279", "280", "281"), entry.encrypted_notes || null))}, ${this.sqlVal(stryMutAct_9fa48("284") ? entry.notes_iv && null : stryMutAct_9fa48("283") ? false : stryMutAct_9fa48("282") ? true : (stryCov_9fa48("282", "283", "284"), entry.notes_iv || null))}, ${this.sqlVal(stryMutAct_9fa48("287") ? entry.encrypted_passkey_meta && null : stryMutAct_9fa48("286") ? false : stryMutAct_9fa48("285") ? true : (stryCov_9fa48("285", "286", "287"), entry.encrypted_passkey_meta || null))}, ${this.sqlVal(stryMutAct_9fa48("290") ? entry.passkey_meta_iv && null : stryMutAct_9fa48("289") ? false : stryMutAct_9fa48("288") ? true : (stryCov_9fa48("288", "289", "290"), entry.passkey_meta_iv || null))}, ${this.sqlVal(stryMutAct_9fa48("293") ? entry.encrypted_card_details && null : stryMutAct_9fa48("292") ? false : stryMutAct_9fa48("291") ? true : (stryCov_9fa48("291", "292", "293"), entry.encrypted_card_details || null))}, ${this.sqlVal(stryMutAct_9fa48("296") ? entry.card_details_iv && null : stryMutAct_9fa48("295") ? false : stryMutAct_9fa48("294") ? true : (stryCov_9fa48("294", "295", "296"), entry.card_details_iv || null))}, ${this.sqlVal(stryMutAct_9fa48("299") ? entry.encrypted_identity_details && null : stryMutAct_9fa48("298") ? false : stryMutAct_9fa48("297") ? true : (stryCov_9fa48("297", "298", "299"), entry.encrypted_identity_details || null))}, ${this.sqlVal(stryMutAct_9fa48("302") ? entry.identity_details_iv && null : stryMutAct_9fa48("301") ? false : stryMutAct_9fa48("300") ? true : (stryCov_9fa48("300", "301", "302"), entry.identity_details_iv || null))})`);
      this.db.run(sql);
      this.schedulePersist();
    }
  }
  getAllPasswords(): SQLitePasswordRow[] {
    if (stryMutAct_9fa48("303")) {
      {}
    } else {
      stryCov_9fa48("303");
      if (stryMutAct_9fa48("306") ? false : stryMutAct_9fa48("305") ? true : stryMutAct_9fa48("304") ? this.db : (stryCov_9fa48("304", "305", "306"), !this.db)) return stryMutAct_9fa48("307") ? ["Stryker was here"] : (stryCov_9fa48("307"), []);
      const stmt = this.db.prepare(stryMutAct_9fa48("308") ? "" : (stryCov_9fa48("308"), 'SELECT * FROM passwords'));
      const results: SQLitePasswordRow[] = stryMutAct_9fa48("309") ? ["Stryker was here"] : (stryCov_9fa48("309"), []);
      while (stryMutAct_9fa48("310") ? false : (stryCov_9fa48("310"), stmt.step())) {
        if (stryMutAct_9fa48("311")) {
          {}
        } else {
          stryCov_9fa48("311");
          const row = stmt.getAsObject() as SQLitePasswordRow;
          // JSON alanlarını parse et
          try {
            if (stryMutAct_9fa48("312")) {
              {}
            } else {
              stryCov_9fa48("312");
              row.tags = JSON.parse(String(stryMutAct_9fa48("315") ? row.tags && '[]' : stryMutAct_9fa48("314") ? false : stryMutAct_9fa48("313") ? true : (stryCov_9fa48("313", "314", "315"), row.tags || (stryMutAct_9fa48("316") ? "" : (stryCov_9fa48("316"), '[]')))));
            }
          } catch {
            if (stryMutAct_9fa48("317")) {
              {}
            } else {
              stryCov_9fa48("317");
              row.tags = stryMutAct_9fa48("318") ? ["Stryker was here"] : (stryCov_9fa48("318"), []);
            }
          }
          try {
            if (stryMutAct_9fa48("319")) {
              {}
            } else {
              stryCov_9fa48("319");
              row.attachments = JSON.parse(String(stryMutAct_9fa48("322") ? row.attachments && '[]' : stryMutAct_9fa48("321") ? false : stryMutAct_9fa48("320") ? true : (stryCov_9fa48("320", "321", "322"), row.attachments || (stryMutAct_9fa48("323") ? "" : (stryCov_9fa48("323"), '[]')))));
            }
          } catch {
            if (stryMutAct_9fa48("324")) {
              {}
            } else {
              stryCov_9fa48("324");
              row.attachments = stryMutAct_9fa48("325") ? ["Stryker was here"] : (stryCov_9fa48("325"), []);
            }
          }
          try {
            if (stryMutAct_9fa48("326")) {
              {}
            } else {
              stryCov_9fa48("326");
              row.search_index = JSON.parse(String(stryMutAct_9fa48("329") ? row.search_index && '[]' : stryMutAct_9fa48("328") ? false : stryMutAct_9fa48("327") ? true : (stryCov_9fa48("327", "328", "329"), row.search_index || (stryMutAct_9fa48("330") ? "" : (stryCov_9fa48("330"), '[]')))));
            }
          } catch {
            if (stryMutAct_9fa48("331")) {
              {}
            } else {
              stryCov_9fa48("331");
              row.search_index = stryMutAct_9fa48("332") ? ["Stryker was here"] : (stryCov_9fa48("332"), []);
            }
          }
          // deleted_at → deletedAt dönüşümü (IDB uyumluluğu)
          if (stryMutAct_9fa48("334") ? false : stryMutAct_9fa48("333") ? true : (stryCov_9fa48("333", "334"), row.deleted_at)) row.deletedAt = row.deleted_at;
          results.push(row);
        }
      }
      stmt.free();
      return results;
    }
  }
  deletePassword(id: number): void {
    if (stryMutAct_9fa48("335")) {
      {}
    } else {
      stryCov_9fa48("335");
      if (stryMutAct_9fa48("338") ? false : stryMutAct_9fa48("337") ? true : stryMutAct_9fa48("336") ? this.db : (stryCov_9fa48("336", "337", "338"), !this.db)) throw new Error(stryMutAct_9fa48("339") ? "" : (stryCov_9fa48("339"), 'Database not open'));
      this.db.run(stryMutAct_9fa48("340") ? `` : (stryCov_9fa48("340"), `DELETE FROM passwords WHERE id = ${id}`));
      this.schedulePersist();
    }
  }
  updatePasswordField(id: number, field: string, value: unknown): void {
    if (stryMutAct_9fa48("341")) {
      {}
    } else {
      stryCov_9fa48("341");
      if (stryMutAct_9fa48("344") ? false : stryMutAct_9fa48("343") ? true : stryMutAct_9fa48("342") ? this.db : (stryCov_9fa48("342", "343", "344"), !this.db)) throw new Error(stryMutAct_9fa48("345") ? "" : (stryCov_9fa48("345"), 'Database not open'));

      // Check if the column exists — old OPFS files may lack newer columns
      const tableInfo = this.db.exec(stryMutAct_9fa48("346") ? "" : (stryCov_9fa48("346"), 'PRAGMA table_info(passwords)'));
      const columns = (stryMutAct_9fa48("350") ? tableInfo.length <= 0 : stryMutAct_9fa48("349") ? tableInfo.length >= 0 : stryMutAct_9fa48("348") ? false : stryMutAct_9fa48("347") ? true : (stryCov_9fa48("347", "348", "349", "350"), tableInfo.length > 0)) ? (tableInfo[0].values as SQLiteColumnInfoRow[]).map(stryMutAct_9fa48("351") ? () => undefined : (stryCov_9fa48("351"), row => row[1])) : stryMutAct_9fa48("352") ? ["Stryker was here"] : (stryCov_9fa48("352"), []);
      if (stryMutAct_9fa48("355") ? false : stryMutAct_9fa48("354") ? true : stryMutAct_9fa48("353") ? columns.includes(field) : (stryCov_9fa48("353", "354", "355"), !columns.includes(field))) {
        if (stryMutAct_9fa48("356")) {
          {}
        } else {
          stryCov_9fa48("356");
          console.warn(stryMutAct_9fa48("357") ? `` : (stryCov_9fa48("357"), `[SQLiteOPFS] Migration: Adding missing column "${field}" to passwords table`));
          this.db.run(stryMutAct_9fa48("358") ? `` : (stryCov_9fa48("358"), `ALTER TABLE passwords ADD COLUMN ${field} TEXT`));
        }
      }

      // Use prepared statement to avoid sql.js db.run() param binding issues
      const safeValue = (stryMutAct_9fa48("361") ? value === null && value === undefined : stryMutAct_9fa48("360") ? false : stryMutAct_9fa48("359") ? true : (stryCov_9fa48("359", "360", "361"), (stryMutAct_9fa48("363") ? value !== null : stryMutAct_9fa48("362") ? false : (stryCov_9fa48("362", "363"), value === null)) || (stryMutAct_9fa48("365") ? value !== undefined : stryMutAct_9fa48("364") ? false : (stryCov_9fa48("364", "365"), value === undefined)))) ? stryMutAct_9fa48("366") ? "" : (stryCov_9fa48("366"), 'NULL') : stryMutAct_9fa48("367") ? `` : (stryCov_9fa48("367"), `'${String(value).replace(/'/g, stryMutAct_9fa48("368") ? "" : (stryCov_9fa48("368"), "''"))}'`);
      const sql = stryMutAct_9fa48("369") ? `` : (stryCov_9fa48("369"), `UPDATE passwords SET ${field} = ${safeValue} WHERE id = ${id}`);
      this.db.run(sql);
      const modified = this.db.getRowsModified();
      console.log(stryMutAct_9fa48("370") ? `` : (stryCov_9fa48("370"), `[SQLiteOPFS] updatePasswordField id=${id} field=${field} rowsModified=${modified}`));
      this.schedulePersist();
    }
  }
  countPasswords(): number {
    if (stryMutAct_9fa48("371")) {
      {}
    } else {
      stryCov_9fa48("371");
      if (stryMutAct_9fa48("374") ? false : stryMutAct_9fa48("373") ? true : stryMutAct_9fa48("372") ? this.db : (stryCov_9fa48("372", "373", "374"), !this.db)) return 0;
      const result = this.db.exec(stryMutAct_9fa48("375") ? "" : (stryCov_9fa48("375"), 'SELECT COUNT(*) as count FROM passwords'));
      return (stryMutAct_9fa48("379") ? result.length <= 0 : stryMutAct_9fa48("378") ? result.length >= 0 : stryMutAct_9fa48("377") ? false : stryMutAct_9fa48("376") ? true : (stryCov_9fa48("376", "377", "378", "379"), result.length > 0)) ? result[0].values[0][0] as number : 0;
    }
  }

  // ─── Metadata CRUD ───

  putMetadata<T>(id: string, data: T): void {
    if (stryMutAct_9fa48("380")) {
      {}
    } else {
      stryCov_9fa48("380");
      if (stryMutAct_9fa48("383") ? false : stryMutAct_9fa48("382") ? true : stryMutAct_9fa48("381") ? this.db : (stryCov_9fa48("381", "382", "383"), !this.db)) throw new Error(stryMutAct_9fa48("384") ? "" : (stryCov_9fa48("384"), 'Database not open'));
      const val = (stryMutAct_9fa48("387") ? data !== null : stryMutAct_9fa48("386") ? false : stryMutAct_9fa48("385") ? true : (stryCov_9fa48("385", "386", "387"), data === null)) ? null : JSON.stringify(data);
      this.db.run(stryMutAct_9fa48("388") ? `` : (stryCov_9fa48("388"), `INSERT OR REPLACE INTO vault_metadata (id, data) VALUES (${this.sqlVal(id)}, ${this.sqlVal(val)})`));
      this.schedulePersist();
    }
  }
  deleteMetadata(id: string): void {
    if (stryMutAct_9fa48("389")) {
      {}
    } else {
      stryCov_9fa48("389");
      if (stryMutAct_9fa48("392") ? false : stryMutAct_9fa48("391") ? true : stryMutAct_9fa48("390") ? this.db : (stryCov_9fa48("390", "391", "392"), !this.db)) return;
      this.db.run(stryMutAct_9fa48("393") ? `` : (stryCov_9fa48("393"), `DELETE FROM vault_metadata WHERE id = ${this.sqlVal(id)}`));
      this.schedulePersist();
    }
  }
  getMetadata<T = Record<string, unknown>>(id: string): T | null {
    if (stryMutAct_9fa48("394")) {
      {}
    } else {
      stryCov_9fa48("394");
      if (stryMutAct_9fa48("397") ? false : stryMutAct_9fa48("396") ? true : stryMutAct_9fa48("395") ? this.db : (stryCov_9fa48("395", "396", "397"), !this.db)) return null;
      const sql = stryMutAct_9fa48("398") ? `` : (stryCov_9fa48("398"), `SELECT data FROM vault_metadata WHERE id = ${this.sqlVal(id)}`);
      const resultArr = this.db.exec(sql);
      if (stryMutAct_9fa48("401") ? resultArr.length > 0 || resultArr[0].values.length > 0 : stryMutAct_9fa48("400") ? false : stryMutAct_9fa48("399") ? true : (stryCov_9fa48("399", "400", "401"), (stryMutAct_9fa48("404") ? resultArr.length <= 0 : stryMutAct_9fa48("403") ? resultArr.length >= 0 : stryMutAct_9fa48("402") ? true : (stryCov_9fa48("402", "403", "404"), resultArr.length > 0)) && (stryMutAct_9fa48("407") ? resultArr[0].values.length <= 0 : stryMutAct_9fa48("406") ? resultArr[0].values.length >= 0 : stryMutAct_9fa48("405") ? true : (stryCov_9fa48("405", "406", "407"), resultArr[0].values.length > 0)))) {
        if (stryMutAct_9fa48("408")) {
          {}
        } else {
          stryCov_9fa48("408");
          try {
            if (stryMutAct_9fa48("409")) {
              {}
            } else {
              stryCov_9fa48("409");
              const val = resultArr[0].values[0][0];
              return val ? JSON.parse(val as string) as T : null;
            }
          } catch (error) {
            if (stryMutAct_9fa48("410")) {
              {}
            } else {
              stryCov_9fa48("410");
              console.error(stryMutAct_9fa48("411") ? "" : (stryCov_9fa48("411"), '[SQLiteOPFS] Metadata parse error:'), error);
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
    if (stryMutAct_9fa48("412")) {
      {}
    } else {
      stryCov_9fa48("412");
      if (stryMutAct_9fa48("415") ? false : stryMutAct_9fa48("414") ? true : stryMutAct_9fa48("413") ? this.db : (stryCov_9fa48("413", "414", "415"), !this.db)) throw new Error(stryMutAct_9fa48("416") ? "" : (stryCov_9fa48("416"), 'Database not open'));
      // Attachments still use param binding since they deal with binary BLOB data
      // that can't be safely inlined into SQL strings
      const stmt = this.db.prepare(stryMutAct_9fa48("417") ? "" : (stryCov_9fa48("417"), 'INSERT OR REPLACE INTO attachments (id, entry_id, iv, encrypted_data) VALUES (?, ?, ?, ?)'));
      stmt.run(stryMutAct_9fa48("418") ? [] : (stryCov_9fa48("418"), [id, entryId, iv, new Uint8Array(encryptedData)]));
      stmt.free();
      this.schedulePersist();
    }
  }
  getAttachment(id: string): {
    iv: Uint8Array;
    encrypted_data: Uint8Array;
  } | null {
    if (stryMutAct_9fa48("419")) {
      {}
    } else {
      stryCov_9fa48("419");
      if (stryMutAct_9fa48("422") ? false : stryMutAct_9fa48("421") ? true : stryMutAct_9fa48("420") ? this.db : (stryCov_9fa48("420", "421", "422"), !this.db)) return null;
      const stmt = this.db.prepare(stryMutAct_9fa48("423") ? "" : (stryCov_9fa48("423"), 'SELECT iv, encrypted_data FROM attachments WHERE id = ?'));
      stmt.bind(stryMutAct_9fa48("424") ? [] : (stryCov_9fa48("424"), [id]));
      let result: {
        iv: Uint8Array;
        encrypted_data: Uint8Array;
      } | null = null;
      if (stryMutAct_9fa48("426") ? false : stryMutAct_9fa48("425") ? true : (stryCov_9fa48("425", "426"), stmt.step())) {
        if (stryMutAct_9fa48("427")) {
          {}
        } else {
          stryCov_9fa48("427");
          const row = stmt.getAsObject() as SQLitePasswordRow;
          result = stryMutAct_9fa48("428") ? {} : (stryCov_9fa48("428"), {
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
    if (stryMutAct_9fa48("429")) {
      {}
    } else {
      stryCov_9fa48("429");
      if (stryMutAct_9fa48("432") ? false : stryMutAct_9fa48("431") ? true : stryMutAct_9fa48("430") ? this.db : (stryCov_9fa48("430", "431", "432"), !this.db)) throw new Error(stryMutAct_9fa48("433") ? "" : (stryCov_9fa48("433"), 'Database not open'));
      this.db.run(stryMutAct_9fa48("434") ? `` : (stryCov_9fa48("434"), `DELETE FROM attachments WHERE id = ${this.sqlVal(id)}`));
      this.schedulePersist();
    }
  }
  getAttachmentsByEntry(entryId: number): string[] {
    if (stryMutAct_9fa48("435")) {
      {}
    } else {
      stryCov_9fa48("435");
      if (stryMutAct_9fa48("438") ? false : stryMutAct_9fa48("437") ? true : stryMutAct_9fa48("436") ? this.db : (stryCov_9fa48("436", "437", "438"), !this.db)) return stryMutAct_9fa48("439") ? ["Stryker was here"] : (stryCov_9fa48("439"), []);
      const stmt = this.db.prepare(stryMutAct_9fa48("440") ? "" : (stryCov_9fa48("440"), 'SELECT id FROM attachments WHERE entry_id = ?'));
      stmt.bind(stryMutAct_9fa48("441") ? [] : (stryCov_9fa48("441"), [entryId]));
      const ids: string[] = stryMutAct_9fa48("442") ? ["Stryker was here"] : (stryCov_9fa48("442"), []);
      while (stryMutAct_9fa48("443") ? false : (stryCov_9fa48("443"), stmt.step())) {
        if (stryMutAct_9fa48("444")) {
          {}
        } else {
          stryCov_9fa48("444");
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
    if (stryMutAct_9fa48("445")) {
      {}
    } else {
      stryCov_9fa48("445");
      if (stryMutAct_9fa48("447") ? false : stryMutAct_9fa48("446") ? true : (stryCov_9fa48("446", "447"), this.db)) {
        if (stryMutAct_9fa48("448")) {
          {}
        } else {
          stryCov_9fa48("448");
          this.db.run(stryMutAct_9fa48("449") ? "" : (stryCov_9fa48("449"), 'DELETE FROM passwords'));
          this.db.run(stryMutAct_9fa48("450") ? "" : (stryCov_9fa48("450"), 'DELETE FROM vault_metadata'));
          this.db.run(stryMutAct_9fa48("451") ? "" : (stryCov_9fa48("451"), 'DELETE FROM attachments'));
          await this.persistToOPFS();
        }
      }
      await deleteOPFSFile(this.dbFilename);
    }
  }

  /** Veritabanını kapat */
  async close(): Promise<void> {
    if (stryMutAct_9fa48("452")) {
      {}
    } else {
      stryCov_9fa48("452");
      await this.flushToOPFS();
      if (stryMutAct_9fa48("454") ? false : stryMutAct_9fa48("453") ? true : (stryCov_9fa48("453", "454"), this.db)) {
        if (stryMutAct_9fa48("455")) {
          {}
        } else {
          stryCov_9fa48("455");
          this.db.close();
          this.db = null;
        }
      }
    }
  }

  /** Veritabanı açık mı? */
  get isOpen(): boolean {
    if (stryMutAct_9fa48("456")) {
      {}
    } else {
      stryCov_9fa48("456");
      return stryMutAct_9fa48("459") ? this.db === null : stryMutAct_9fa48("458") ? false : stryMutAct_9fa48("457") ? true : (stryCov_9fa48("457", "458", "459"), this.db !== null);
    }
  }
}
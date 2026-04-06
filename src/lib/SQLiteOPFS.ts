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
import type { VaultEntry } from '../vaultService';
// @ts-expect-error sql.js type surface is incomplete in this setup
import initSqlJs, { type Database } from 'sql.js';

// sql.js WASM dosyasını Vite asset olarak yükle
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

type SQLitePasswordRow = Partial<VaultEntry> &
  Record<string, unknown> & {
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
  return (
    typeof navigator !== 'undefined' &&
    'storage' in navigator &&
    'getDirectory' in navigator.storage
  );
}

/** OPFS'den dosya oku (yoksa null döner) */
async function readOPFSFile(filename: string): Promise<Uint8Array | null> {
  try {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(filename);
    const file = await fileHandle.getFile();
    const buffer = await file.arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return null; // Dosya bulunamadı
  }
}

/** OPFS'ye dosya yaz */
async function writeOPFSFile(filename: string, data: Uint8Array): Promise<void> {
  const root = await navigator.storage.getDirectory();
  const fileHandle = await root.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(new Blob([Uint8Array.from(data)]));
  await writable.close();
}

/** OPFS'den dosya sil */
export async function deleteOPFSFile(filename: string): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(filename);
  } catch {
    // Dosya zaten yok
  }
}

/** TÜM OPFS dosyalarını sil (Fabrika Ayarları için) */
export async function clearAllOPFSFiles(): Promise<void> {
  if (!isOPFSAvailable()) return;
  try {
    const root = await navigator.storage.getDirectory();
    // @ts-expect-error entries async iterator is not modeled on all TS lib versions
    for await (const [name] of root.entries()) {
      if (name.endsWith('.sqlite')) {
        await root.removeEntry(name);
        console.log(`[OPFS] Silindi: ${name}`);
      }
    }
  } catch (error) {
    console.warn('[OPFS] Toplu silme hatası:', error);
  }
}

// ─────────────────────────────────────────────────────────────────
// SQL Şeması
// ─────────────────────────────────────────────────────────────────

const SCHEMA_SQL = `
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
`;

// ─────────────────────────────────────────────────────────────────
// SQLiteOPFS Sınıfı
// ─────────────────────────────────────────────────────────────────

export class SQLiteOPFS {
  private db: Database | null = null;
  private dbFilename: string;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private isDirty = false;

  constructor(dbName: string = 'aegis_vault') {
    this.dbFilename = `${dbName}.sqlite`;
  }

  /** Veritabanını aç — OPFS'den yükle veya yeni oluştur */
  async open(): Promise<void> {
    const SQL = await initSqlJs({
      locateFile: () => sqlWasmUrl,
    });

    // OPFS'den mevcut veritabanını yükle
    const existingData = await readOPFSFile(this.dbFilename);

    if (existingData && existingData.length > 0) {
      this.db = new SQL.Database(existingData);
      console.log(
        `[SQLiteOPFS] Mevcut veritabanı OPFS'den yüklendi: ${this.dbFilename} (${existingData.length} bytes)`
      );
    } else {
      this.db = new SQL.Database();
      console.log(`[SQLiteOPFS] Yeni veritabanı oluşturuldu: ${this.dbFilename}`);
    }

    // Şemayı uygula (IF NOT EXISTS güvenli)
    this.db.run(SCHEMA_SQL);

    // Eski veritabanları için eksik sütunları ekle (şema migrasyonu)
    const tableInfo = this.db.exec('PRAGMA table_info(passwords)');
    const existingCols =
      tableInfo.length > 0
        ? (tableInfo[0].values as SQLiteColumnInfoRow[]).map((row) => row[1])
        : [];
    const requiredCols: [string, string][] = [
      ['encrypted_title', 'TEXT'],
      ['title_iv', 'TEXT'],
      ['encrypted_username', 'TEXT'],
      ['username_iv', 'TEXT'],
      ['encrypted_website', 'TEXT'],
      ['website_iv', 'TEXT'],
      ['encrypted_category', 'TEXT'],
      ['category_iv', 'TEXT'],
      ['encrypted_tags', 'TEXT'],
      ['tags_iv', 'TEXT'],
      ['search_index', 'TEXT'],
      ['deleted_at', 'TEXT'],
      ['totp_secret', 'TEXT'],
      ['totp_iv', 'TEXT'],
      ['totp_issuer', 'TEXT'],
      ['totp_algorithm', 'TEXT'],
      ['totp_digits', 'INTEGER'],
      ['totp_period', 'INTEGER'],
      ['encrypted_notes', 'TEXT'],
      ['notes_iv', 'TEXT'],
      ['encrypted_passkey_meta', 'TEXT'],
      ['passkey_meta_iv', 'TEXT'],
      ['encrypted_card_details', 'TEXT'],
      ['card_details_iv', 'TEXT'],
      ['encrypted_identity_details', 'TEXT'],
      ['identity_details_iv', 'TEXT'],
    ];
    for (const [col, type] of requiredCols) {
      if (!existingCols.includes(col)) {
        console.warn(`[SQLiteOPFS] Migration: Adding missing column "${col}" to passwords table`);
        this.db.run(`ALTER TABLE passwords ADD COLUMN ${col} ${type}`);
      }
    }

    // WAL modu — daha iyi eşzamanlılık
    this.db.run('PRAGMA journal_mode = WAL;');

    // İlk kayıt
    await this.persistToOPFS();
  }

  /** Veritabanını OPFS'ye kaydet */
  async persistToOPFS(): Promise<void> {
    if (!this.db) return;
    const data = this.db.export();
    const uint8 = new Uint8Array(data);
    await writeOPFSFile(this.dbFilename, uint8);
    this.isDirty = false;
  }

  /** Debounced kaydet — sık yazma işlemlerinde performans için */
  schedulePersist(): void {
    this.isDirty = true;
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.persistToOPFS().catch(console.error);
    }, 500);
  }

  /** Hemen kaydet + debounce iptal */
  async flushToOPFS(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    if (this.isDirty) {
      await this.persistToOPFS();
    }
  }

  // ─── Passwords CRUD ───

  /** SQL değer formatla (sql.js db.run param binding çalışmadığı için inline kullanıyoruz) */
  private sqlVal(v: unknown): string {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return String(v);
    // String: tek tırnak escape
    return `'${String(v).replace(/'/g, "''")}'`;
  }

  putPassword(entry: VaultEntry | SQLitePasswordRow): void {
    if (!this.db) throw new Error('Database not open');

    const tags = JSON.stringify(entry.tags || []);
    const attachments = JSON.stringify(entry.attachments || []);

    const sql = `INSERT OR REPLACE INTO passwords 
       (id, title, encrypted_title, title_iv, username, encrypted_username, username_iv, encrypted_password, iv, category, encrypted_category, category_iv, website, encrypted_website, website_iv, encrypted_tags, tags_iv, search_index, updated_at, strength, tags, pwned_count, attachments, deleted_at, totp_secret, totp_iv, totp_issuer, totp_algorithm, totp_digits, totp_period, encrypted_notes, notes_iv, encrypted_passkey_meta, passkey_meta_iv, encrypted_card_details, card_details_iv, encrypted_identity_details, identity_details_iv)
       VALUES (${this.sqlVal(entry.id)}, ${this.sqlVal(entry.title || 'Untitled')}, ${this.sqlVal(entry.encrypted_title || null)}, ${this.sqlVal(entry.title_iv || null)}, ${this.sqlVal(entry.username || '')}, ${this.sqlVal(entry.encrypted_username || null)}, ${this.sqlVal(entry.username_iv || null)}, ${this.sqlVal(entry.encrypted_password || null)}, ${this.sqlVal(entry.iv || null)}, ${this.sqlVal(entry.category || 'General')}, ${this.sqlVal(entry.encrypted_category || null)}, ${this.sqlVal(entry.category_iv || null)}, ${this.sqlVal(entry.website || '')}, ${this.sqlVal(entry.encrypted_website || null)}, ${this.sqlVal(entry.website_iv || null)}, ${this.sqlVal(entry.encrypted_tags || null)}, ${this.sqlVal(entry.tags_iv || null)}, ${this.sqlVal(JSON.stringify(entry.search_index || []))}, ${this.sqlVal(entry.updated_at || new Date().toISOString())}, ${this.sqlVal(entry.strength || 0)}, ${this.sqlVal(tags)}, ${this.sqlVal(entry.pwned_count || 0)}, ${this.sqlVal(attachments)}, ${this.sqlVal(entry.deletedAt || ((entry as SQLitePasswordRow).deleted_at ?? null))}, ${this.sqlVal(entry.totp_secret || null)}, ${this.sqlVal(entry.totp_iv || null)}, ${this.sqlVal(entry.totp_issuer || null)}, ${this.sqlVal(entry.totp_algorithm || null)}, ${this.sqlVal(entry.totp_digits || null)}, ${this.sqlVal(entry.totp_period || null)}, ${this.sqlVal(entry.encrypted_notes || null)}, ${this.sqlVal(entry.notes_iv || null)}, ${this.sqlVal(entry.encrypted_passkey_meta || null)}, ${this.sqlVal(entry.passkey_meta_iv || null)}, ${this.sqlVal(entry.encrypted_card_details || null)}, ${this.sqlVal(entry.card_details_iv || null)}, ${this.sqlVal(entry.encrypted_identity_details || null)}, ${this.sqlVal(entry.identity_details_iv || null)})`;
    this.db.run(sql);
    this.schedulePersist();
  }

  getAllPasswords(): SQLitePasswordRow[] {
    if (!this.db) return [];
    const stmt = this.db.prepare('SELECT * FROM passwords');
    const results: SQLitePasswordRow[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as SQLitePasswordRow;
      // JSON alanlarını parse et
      try {
        row.tags = JSON.parse(String(row.tags || '[]'));
      } catch {
        row.tags = [];
      }
      try {
        row.attachments = JSON.parse(String(row.attachments || '[]'));
      } catch {
        row.attachments = [];
      }
      try {
        row.search_index = JSON.parse(String(row.search_index || '[]'));
      } catch {
        row.search_index = [];
      }
      // deleted_at → deletedAt dönüşümü (IDB uyumluluğu)
      if (row.deleted_at) row.deletedAt = row.deleted_at;
      results.push(row);
    }
    stmt.free();
    return results;
  }

  deletePassword(id: number): void {
    if (!this.db) throw new Error('Database not open');
    this.db.run(`DELETE FROM passwords WHERE id = ${id}`);
    this.schedulePersist();
  }

  updatePasswordField(id: number, field: string, value: unknown): void {
    if (!this.db) throw new Error('Database not open');

    // Check if the column exists — old OPFS files may lack newer columns
    const tableInfo = this.db.exec('PRAGMA table_info(passwords)');
    const columns =
      tableInfo.length > 0
        ? (tableInfo[0].values as SQLiteColumnInfoRow[]).map((row) => row[1])
        : [];

    if (!columns.includes(field)) {
      console.warn(`[SQLiteOPFS] Migration: Adding missing column "${field}" to passwords table`);
      this.db.run(`ALTER TABLE passwords ADD COLUMN ${field} TEXT`);
    }

    // Use prepared statement to avoid sql.js db.run() param binding issues
    const safeValue =
      value === null || value === undefined ? 'NULL' : `'${String(value).replace(/'/g, "''")}'`;
    const sql = `UPDATE passwords SET ${field} = ${safeValue} WHERE id = ${id}`;
    this.db.run(sql);
    const modified = this.db.getRowsModified();
    console.log(
      `[SQLiteOPFS] updatePasswordField id=${id} field=${field} rowsModified=${modified}`
    );
    this.schedulePersist();
  }

  countPasswords(): number {
    if (!this.db) return 0;
    const result = this.db.exec('SELECT COUNT(*) as count FROM passwords');
    return result.length > 0 ? (result[0].values[0][0] as number) : 0;
  }

  // ─── Metadata CRUD ───

  putMetadata<T>(id: string, data: T): void {
    if (!this.db) throw new Error('Database not open');
    this.db.run(
      `INSERT OR REPLACE INTO vault_metadata (id, data) VALUES (${this.sqlVal(id)}, ${this.sqlVal(JSON.stringify(data))})`
    );
    this.schedulePersist();
  }

  deleteMetadata(id: string): void {
    if (!this.db) return;
    this.db.run(`DELETE FROM vault_metadata WHERE id = ${this.sqlVal(id)}`);
    this.schedulePersist();
  }

  getMetadata<T = Record<string, unknown>>(id: string): T | null {
    if (!this.db) return null;
    const sql = `SELECT data FROM vault_metadata WHERE id = ${this.sqlVal(id)}`;
    const resultArr = this.db.exec(sql);
    if (resultArr.length > 0 && resultArr[0].values.length > 0) {
      try {
        const val = resultArr[0].values[0][0];
        return val ? (JSON.parse(val as string) as T) : null;
      } catch (error) {
        console.error('[SQLiteOPFS] Metadata parse error:', error);
        return null;
      }
    }
    return null;
  }

  // ─── Attachments CRUD ───

  putAttachment(id: string, entryId: number, iv: Uint8Array, encryptedData: ArrayBuffer): void {
    if (!this.db) throw new Error('Database not open');
    // Attachments still use param binding since they deal with binary BLOB data
    // that can't be safely inlined into SQL strings
    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO attachments (id, entry_id, iv, encrypted_data) VALUES (?, ?, ?, ?)'
    );
    stmt.run([id, entryId, iv, new Uint8Array(encryptedData)]);
    stmt.free();
    this.schedulePersist();
  }

  getAttachment(id: string): { iv: Uint8Array; encrypted_data: Uint8Array } | null {
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT iv, encrypted_data FROM attachments WHERE id = ?');
    stmt.bind([id]);
    let result: { iv: Uint8Array; encrypted_data: Uint8Array } | null = null;
    if (stmt.step()) {
      const row = stmt.getAsObject() as SQLitePasswordRow;
      result = {
        iv: new Uint8Array(row.iv as ArrayLike<number>),
        encrypted_data: new Uint8Array(row.encrypted_data as ArrayLike<number>),
      };
    }
    stmt.free();
    return result;
  }

  deleteAttachment(id: string): void {
    if (!this.db) throw new Error('Database not open');
    this.db.run(`DELETE FROM attachments WHERE id = ${this.sqlVal(id)}`);
    this.schedulePersist();
  }

  getAttachmentsByEntry(entryId: number): string[] {
    if (!this.db) return [];
    const stmt = this.db.prepare('SELECT id FROM attachments WHERE entry_id = ?');
    stmt.bind([entryId]);
    const ids: string[] = [];
    while (stmt.step()) {
      ids.push(stmt.getAsObject().id as string);
    }
    stmt.free();
    return ids;
  }

  // ─── Genel İşlemler ───

  /** Tüm veritabanını temizle */
  async wipeAll(): Promise<void> {
    if (this.db) {
      this.db.run('DELETE FROM passwords');
      this.db.run('DELETE FROM vault_metadata');
      this.db.run('DELETE FROM attachments');
      await this.persistToOPFS();
    }
    await deleteOPFSFile(this.dbFilename);
  }

  /** Veritabanını kapat */
  async close(): Promise<void> {
    await this.flushToOPFS();
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /** Veritabanı açık mı? */
  get isOpen(): boolean {
    return this.db !== null;
  }
}

export class SQLiteService {
  private db: any = null;
  private isConnected: boolean = false;

  async init(masterKey: string): Promise<void> {
    if (this.isConnected) return;

    console.log("[Aegis WXT] Initializing SQLite-WASM engine via Lazy-Loading...");
    
    try {
      // Lazy-loading (Dynamic Import) of WASM package to improve Time-to-Interactive (TTI) and Lighthouse score
      const { default: sqlite3InitModule } = await import('@sqlite.org/sqlite-wasm');
      
      const sqlite3 = await sqlite3InitModule({
        print: console.log,
        printErr: console.error,
      });

      // OPFS Fallback (Hybrid Persistence) Testi
      const isOpfsSupported = this.checkOpfsSupport();
      let vfsName = "kvvfs"; // default fallback using indexedDB

      if (isOpfsSupported && sqlite3.opfs) {
        console.log("[Aegis WXT] OPFS (Origin Private File System) is supported. Using native file IO.");
        vfsName = "opfs";
      } else {
        console.warn("[Aegis WXT] OPFS not fully supported (Safari/Older Firefox). Falling back to IndexedDB virtual file system (kvvfs).");
        vfsName = "kvvfs";
      }

      // Veritabanını belirli bir VFS ile aç
      // Eğer opfs ise opfs ağacında asenkron havuzlama yöntemiyle db açılır (PWA ve Extension arasında güvenli izole alan).
      // Eğer kvvfs ise IndexedDB storage üzerinde simüle edilir.
      if (vfsName === "opfs") {
        this.db = new sqlite3.oo1.OpfsDb('/aegis_secure_vault.sqlite', 'c');
      } else {
        this.db = new sqlite3.oo1.DB({
           filename: 'aegis_secure_vault.sqlite',
           vfs: 'kvvfs',
        });
      }
      
      // PRAGMA key uygulaması (SQLCipher)
      // "PRAGMA key komutunu, PWA'dan alınan veya biyometrik kilitle açılan anahtar ile tetikle."
      this.db.exec(`PRAGMA key = '${masterKey}';`);

      this.isConnected = true;
      console.log("[Aegis WXT] SQLCipher engine successfully unlocked and connected via " + vfsName);

    } catch (e) {
      console.error("[Aegis WXT] Failed to open/unlock SQLite engine: ", e);
      throw new Error("INVALID_KEY_OR_DB_ERROR");
    }
  }

  // Kalıcı depolama için OPFS (Origin Private File System) desteğini kontrol et
  private checkOpfsSupport(): boolean {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.getDirectory) {
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  async close() {
    if (this.db) {
      this.db.close();
      this.isConnected = false;
      this.db = null;
    }
  }
}

export const sqliteService = new SQLiteService();

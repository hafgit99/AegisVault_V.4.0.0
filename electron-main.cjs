const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const crypto = require('crypto');

// ─────────────────────────────────────────────────────────────────
// 🔒 GÜVENLİK: Kasa verileri bellekte tutulur, sıkı erişim kontrolü
// ─────────────────────────────────────────────────────────────────
let vaultCache = [];
let syncToken = null; // Tek kullanımlık oturum token'ı

/**
 * Kriptografik güvenli rastgele token üretir.
 */
function generateSyncToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ─────────────────────────────────────────────────────────────────
// 📡 Yerel HTTP Sync Server (Extension İletişimi)
// Güvenli: Token bazlı kimlik doğrulama + Origin kısıtlaması
// ─────────────────────────────────────────────────────────────────
const http = require('http');

// İzin verilen origin'ler — Sadece bilinen kaynaklar
const ALLOWED_ORIGINS = [
  'chrome-extension://',       // Chrome eklenti prefix'i
  'moz-extension://',          // Firefox eklenti prefix'i
  'http://localhost:5173',     // Vite dev server
  'http://127.0.0.1:5173'     // Vite dev server (alt)
];

function isOriginAllowed(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
}

const syncServer = http.createServer((req, res) => {
  const origin = req.headers.origin || '';
  
  // CORS & Private Network Access
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Aegis-Token');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Preflight (OPTIONS) isteklerini yanıtla
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // İstek izin kontrolü
  if (origin && !isOriginAllowed(origin)) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'FORBIDDEN_ORIGIN' }));
    return;
  }

  // ─── Token Doğrulama ───
  const requestToken = req.headers['x-aegis-token'];
  
  if (req.url === '/api/status' && req.method === 'GET') {
    // Status endpoint — Kasa durumu + token döndür
    if (!syncToken && vaultCache.length > 0) {
      syncToken = generateSyncToken();
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      isUnlocked: vaultCache.length > 0,
      version: '4.0.0',
      token: vaultCache.length > 0 ? syncToken : null
    }));
    return;
  }

  if (req.url === '/api/vault' && req.method === 'GET') {
    // 🔒 Vault endpoint — Token doğrulama
    if (!syncToken || !requestToken || requestToken !== syncToken) {
      // Token yoksa boş dizi dön (uzantı "kasa kilitli" anlasın)
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([]));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(vaultCache));

    // Token rotasyonu: Her başarılı istek sonrası yeni token üret
    syncToken = generateSyncToken();
    return;
  }

  res.writeHead(404);
  res.end();
});

// Sadece loopback'e bağlan (dış ağ erişimini engelle)
syncServer.listen(23456, '127.0.0.1', () => {
  console.log('[Aegis] Güvenli yerel sync server: 127.0.0.1:23456');
});

// ─────────────────────────────────────────────────────────────────
// 📨 IPC Event Handlers (Renderer ↔ Main)
// ─────────────────────────────────────────────────────────────────
ipcMain.on('sync-vault', (_event, passwords) => {
  // Girdi validasyonu: Sadece beklenen yapıda veri kabul et
  if (!Array.isArray(passwords)) return;
  vaultCache = passwords.map(p => ({
    title: String(p.title || ''),
    username: String(p.username || ''),
    pass: String(p.pass || ''),
    website: String(p.website || '')
  }));
  
  // Her sync'te token yenile
  syncToken = generateSyncToken();
});

ipcMain.on('lock-vault', () => {
  // 🔒 Kasa kilitlendiğinde önbelleği ve token'ı temizle
  vaultCache = [];
  syncToken = null;
});

// ─────────────────────────────────────────────────────────────────
// 🪟 Ana Pencere Oluşturma
// ─────────────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // 🔒 GÜVENLİK HARDENİNG
      nodeIntegration: false,           // ❌ Node.js API'sine erişimi kapat
      contextIsolation: true,           // ✅ Renderer ve preload arasında güvenli izolasyon
      preload: path.join(__dirname, 'preload.cjs'), // ✅ Güvenli köprü
      sandbox: true,                    // ✅ Renderer sürecini sandbox'la
      webSecurity: true,                // ✅ Same-origin policy aktif
      allowRunningInsecureContent: false // ✅ Mixed content engelle
    }
  });

  // Dist klasöründen yükle
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  
  // Menü çubuğunu gizle
  win.setMenuBarVisibility(false);
}

// ─────────────────────────────────────────────────────────────────
// 🔒 Content Security Policy (CSP) — Global header enjeksiyonu
// ─────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // CSP: Yalnızca kendi kaynaklarından script ve stil yükle
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'wasm-unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' https://fonts.gstatic.com; " +
          "img-src 'self' data: blob:; " +
          "connect-src 'self' https://api.pwnedpasswords.com http://127.0.0.1:23456; " +
          "worker-src 'self' blob:; " +
          "object-src 'none'; " +
          "base-uri 'self'"
        ]
      }
    });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Kasa kapatıldığında güvenli temizlik
  vaultCache = [];
  syncToken = null;

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

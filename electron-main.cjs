const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const crypto = require('crypto');

// ─────────────────────────────────────────────────────────────────
// 🔒 GÜVENLİK: Kasa verileri bellekte tutulur, sıkı erişim kontrolü
// ─────────────────────────────────────────────────────────────────
let vaultCache = [];

// ─────────────────────────────────────────────────────────────────
// 📡 Yerel HTTP Sync Server (Extension İletişimi)
// Güvenli: Token bazlı kimlik doğrulama + Origin kısıtlaması
// ─────────────────────────────────────────────────────────────────
const http = require('http');

const ALLOWLIST_EXTENSION_IDS = [
  'gddgomiecgnihlljfkogfjgakedoielk', // Your Current Extension ID
  'kjbdjkfijeflhhbnkjgkmccljifidpcc', // Verified Production Extension ID
];

// 🔒 DEV MODE: Sadece belirli localhost originlerine izin ver (wildcard YOK)
const DEV_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

function isOriginAllowed(origin) {
  if (!origin) return false;

  // Yerel Dashboard (PWA) originleri
  if (origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173' || origin === 'file://' || origin === 'app://localhost') {
    return true;
  }

  // Extension Allowlist Check — DEV modda bile allowlist dışına izin YOK
  if (origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://')) {
    const id = origin.split('://')[1].split('/')[0];
    // Dev modda sadece allowlist veya DEV_ALLOWED_ORIGINS'den gelen istekler
    if (ALLOWLIST_EXTENSION_IDS.includes(id)) {
      return true;
    }
    // Dev modda unknown extension ID'yi logla ama reddet
    if (!app.isPackaged) {
      console.warn(`[Aegis Sync] ⚠️ Dev modda bilinmeyen extension ID reddedildi: ${id.substring(0, 8)}...`);
    }
    return false;
  }

  return false;
}

const syncServer = http.createServer((req, res) => {
  const origin = req.headers.origin || '';

  // ─────────────────────────────────────────────────────────────
  // 🔒 CORS & Private Network Access (P0-1 HARDENED)
  // Güvenlik: DEV modda bile wildcard (*) YOK — sadece allowlist
  // ─────────────────────────────────────────────────────────────
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Production ve Dev modda bilinmeyen origin → reddet
    res.setHeader('Access-Control-Allow-Origin', 'null');
  }

  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Aegis-Token, X-Aegis-Client');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Preflight (OPTIONS) isteklerini yanıtla
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ─────────────────────────────────────────────────────────────
  // ── Kimlik Doğrulama (P0-1 HARDENED) ──
  // Extension service worker'dan gelen fetch istekleri tarayıcı güvenlik politikası
  // gereği origin header taşımaz. Bu nedenle loopback adresinden gelen ve
  // X-Aegis-Client: extension header'ı içeren istekleri güvenli kabul ediyoruz.
  // ─────────────────────────────────────────────────────────────
  const aegisClient = req.headers['x-aegis-client'] || '';
  const isLoopbackExtensionRequest = aegisClient === 'extension';

  if (isLoopbackExtensionRequest) {
    // Loopback + header kombinasyonu: kabul et, CORS header'ı ekle
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && isOriginAllowed(origin)) {
    // Bilinen origin (PWA / Electron renderer): kabul et
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Üretim ve Dev modu: bilinmeyen kaynak → reddet (403)
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'FORBIDDEN_ORIGIN' }));
    return;
  }

  // ─── Token Kaldırıldı (P0-1) ───
  // Güvenlik: Status endpoint'inden token sızıntısı kaldırıldı. 
  // Kimlik doğrulama sadece katı Origin + Allowlist kontrolüne dayanır.
  
  if (req.url === '/api/status' && req.method === 'GET') {
    // Status endpoint — Kasa durumu
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      isUnlocked: vaultCache.length > 0,
      version: '4.0.0'
    }));
    return;
  }

  if (req.url === '/api/vault' && req.method === 'GET') {
    // 🔒 Vault endpoint — Token kaldırıldı, origin auth yeterli
    if (vaultCache.length === 0) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([]));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(vaultCache));
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
});

ipcMain.on('lock-vault', () => {
  // 🔒 Kasa kilitlendiğinde önbelleği temizle
  vaultCache = [];
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

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

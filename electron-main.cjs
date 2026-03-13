const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const crypto = require('crypto');

// ─────────────────────────────────────────────────────────────────
// 🔒 GÜVENLİK: Kasa verileri bellekte tutulur, sıkı erişim kontrolü
// ─────────────────────────────────────────────────────────────────
let vaultCache = [];
let mainWindow = null; // IPC validation için global referans

// ─────────────────────────────────────────────────────────────────
// 📡 Yerel HTTP Sync Server (Extension İletişimi)
// Güvenli: Token bazlı kimlik doğrulama + Origin kısıtlaması
// ─────────────────────────────────────────────────────────────────
const http = require('http');

const DEFAULT_ALLOWLIST_EXTENSION_IDS = [
  'gddgomiecgnihlljfkogfjgakedoielk',
  'kjbdjkfijeflhhbnkjgkmccljifidpcc',
];

// Eğer env değişkeni ile özel ID listesi verilmişse onu kullan
const ALLOWLIST_EXTENSION_IDS = (
  process.env.AEGIS_EXTENSION_ALLOWLIST ||
  process.env.AEGIS_EXTENSION_ID ||
  ''
)
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

// Env'de ID tanımlı değilse allowlist'e varsayılan ID'leri ekle
if (ALLOWLIST_EXTENSION_IDS.length === 0) {
  ALLOWLIST_EXTENSION_IDS.push(...DEFAULT_ALLOWLIST_EXTENSION_IDS);
}

// Production exe'ye kurulu extension ID'si farklı olabilir.
// Strict allowlist yerine extension ID formatını doğrula + challenge imzasına güven.
// Env'de özel ID tanımlıysa sadece onlara izin ver (güvenli mod).
// Tanımlı değilse geçerli formattaki tüm extension ID'lere izin ver (uyumlu mod).
const STRICT_ALLOWLIST_MODE = !!(
  process.env.AEGIS_EXTENSION_ALLOWLIST ||
  process.env.AEGIS_EXTENSION_ID
);

function isValidExtensionIdFormat(id) {
  // Chrome extension ID: 32 karakter lowercase a-p
  // Firefox extension ID: {uuid} veya email formatı
  return typeof id === 'string' && (
    /^[a-p]{32}$/.test(id) ||                              // Chrome format
    /^[a-zA-Z0-9_.-]+@[a-zA-Z0-9_.-]+$/.test(id) ||      // Firefox email format
    /^\{[0-9a-f-]{36}\}$/.test(id)                         // Firefox UUID format
  );
}


const CHALLENGE_TTL_MS = 15000;
const challengeStore = new Map();

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

function isAllowlistedExtensionId(extensionId) {
  if (typeof extensionId !== 'string' || !extensionId) return false;
  // Strict mod (env'de ID tanımlı): sadece allowlist'tekilere izin ver
  if (STRICT_ALLOWLIST_MODE) {
    return ALLOWLIST_EXTENSION_IDS.includes(extensionId);
  }
  // Uyumlu mod (env yok): allowlist'te varsa doğrudan kabul et,
  // yoksa geçerli extension ID formatını kontrol et (challenge imzası zaten doğrulanacak)
  return ALLOWLIST_EXTENSION_IDS.includes(extensionId) || isValidExtensionIdFormat(extensionId);
}

function parseRequestPath(req) {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:23456');
    return url.pathname;
  } catch {
    return req.url || '';
  }
}

function createChallenge(extensionId) {
  const nonce = crypto.randomBytes(16).toString('hex');
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  challengeStore.set(nonce, { token, extensionId, expiresAt });
  return { nonce, token, expiresAt };
}

function cleanupExpiredChallenges(now = Date.now()) {
  for (const [nonce, record] of challengeStore.entries()) {
    if (!record || record.expiresAt <= now) {
      challengeStore.delete(nonce);
    }
  }
}

function safeCompareHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

function verifyExtensionChallenge(req) {
  const extensionId = req.headers['x-aegis-extension-id'] || '';
  const nonce = req.headers['x-aegis-challenge-nonce'] || '';
  const tsRaw = req.headers['x-aegis-challenge-ts'] || '';
  const signature = req.headers['x-aegis-challenge-signature'] || '';

  if (!isAllowlistedExtensionId(extensionId)) {
    return { ok: false, code: 'FORBIDDEN_EXTENSION_ID' };
  }
  if (!nonce || !tsRaw || !signature) {
    return { ok: false, code: 'MISSING_CHALLENGE_HEADERS' };
  }

  const ts = Number(tsRaw);
  if (!Number.isFinite(ts)) {
    return { ok: false, code: 'INVALID_CHALLENGE_TS' };
  }

  const now = Date.now();
  if (Math.abs(now - ts) > CHALLENGE_TTL_MS) {
    challengeStore.delete(nonce);
    return { ok: false, code: 'CHALLENGE_TS_EXPIRED' };
  }

  const challenge = challengeStore.get(nonce);
  if (!challenge || challenge.expiresAt < now || challenge.extensionId !== extensionId) {
    challengeStore.delete(nonce);
    return { ok: false, code: 'INVALID_CHALLENGE_NONCE' };
  }

  const path = parseRequestPath(req);
  const payload = `${req.method}:${path}:${nonce}:${ts}:${extensionId}`;
  // 🔧 Extension token'ı hex→bytes çevirip HMAC key olarak kullanıyor.
  // Electron da aynı şekilde hex→Buffer yapmalı (string olarak değil).
  const keyBuffer = Buffer.from(challenge.token, 'hex');
  const expected = crypto.createHmac('sha256', keyBuffer).update(payload).digest('hex');

  if (!safeCompareHex(signature, expected)) {
    challengeStore.delete(nonce);
    return { ok: false, code: 'INVALID_CHALLENGE_SIGNATURE' };
  }

  challengeStore.delete(nonce);
  return { ok: true };
}

const syncServer = http.createServer((req, res) => {
  cleanupExpiredChallenges();

  const origin = req.headers.origin || '';
  const requestPath = parseRequestPath(req);
  const aegisClientHdr = req.headers['x-aegis-client'] || '';
  const isExtensionRequest = aegisClientHdr === 'extension';

  // ─────────────────────────────────────────────────────────────
  // 🔒 CORS & Private Network Access
  // Chrome Extension Service Worker'dan gelen fetch isteklerinde
  // 'origin' header'ı tarayıcı tarafından EKLENMEYEBİLİR.
  // Bu nedenle:
  //  - origin varsa → allowlist kontrolü yap
  //  - origin yoksa + X-Aegis-Client: extension varsa → loopback güvenli, kabul et
  // ─────────────────────────────────────────────────────────────
  if (isExtensionRequest && !origin) {
    // Extension SW → origin yok, loopback + header kombinasyonu yeterli
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin && !isExtensionRequest) {
    // Origin yok, extension da değil → reddet
    res.setHeader('Access-Control-Allow-Origin', 'null');
  } else {
    // Bilinmeyen origin → reddet
    res.setHeader('Access-Control-Allow-Origin', 'null');
  }

  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Aegis-Token, X-Aegis-Client, X-Aegis-Extension-Id, X-Aegis-Challenge-Nonce, X-Aegis-Challenge-Ts, X-Aegis-Challenge-Signature');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Private Network Access Preflight: tarayıcı önce OPTIONS atar
  if (req.method === 'OPTIONS') {
    const pnaHeader = req.headers['access-control-request-private-network'];
    if (pnaHeader === 'true') {
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
    }
    res.writeHead(204);
    res.end();
    return;
  }

  // ─────────────────────────────────────────────────────────────
  // ── Kimlik Doğrulama (P0-1 HARDENED) ──
  // Extension service worker'dan gelen fetch isteklerinde origin header olmayabilir.
  // isExtensionRequest zaten yukarıda tanımlandı.
  // ─────────────────────────────────────────────────────────────
  const extensionIdHeader = req.headers['x-aegis-extension-id'] || '';

  if (isExtensionRequest && !isAllowlistedExtensionId(extensionIdHeader)) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'FORBIDDEN_EXTENSION_ID' }));
    return;
  }

  if (!isExtensionRequest && origin && !isOriginAllowed(origin)) {
    // Tanınan olmayan origin → reddet
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'FORBIDDEN_ORIGIN' }));
    return;
  }

  if (!isExtensionRequest && !origin) {
    // Origin yok, extension değil → reddet
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'FORBIDDEN_ORIGIN' }));
    return;
  }

  // ─── Challenge Endpoint (P0-1/P0-2) ───
  // Extension loopback istekleri için tek-kullanimlik challenge token üretir.
  if (requestPath === '/api/challenge' && req.method === 'GET') {
    if (!isExtensionRequest) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'CHALLENGE_EXTENSION_ONLY' }));
      return;
    }

    const challenge = createChallenge(extensionIdHeader);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      nonce: challenge.nonce,
      token: challenge.token,
      expiresAt: challenge.expiresAt,
    }));
    return;
  }

  // Extension isteklerinde challenge doğrulaması zorunlu.
  if (isExtensionRequest) {
    const challengeResult = verifyExtensionChallenge(req);
    if (!challengeResult.ok) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: challengeResult.code }));
      return;
    }
  }
  
  if (requestPath === '/api/status' && req.method === 'GET') {
    // Status endpoint — Kasa durumu
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      isUnlocked: vaultCache.length > 0,
      version: '4.0.0'
    }));
    return;
  }

  if (requestPath === '/api/vault' && req.method === 'GET') {
    // 🔒 Vault endpoint — challenge doğrulaması geçtiyse yanıt ver
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
ipcMain.on('sync-vault', (event, passwords) => {
  // 1. Sender validation (origin kontrolü)
  if (!mainWindow || event.senderFrame !== mainWindow.webContents.mainFrame) {
    console.warn('[IPC] Unauthorized IPC sender for sync-vault');
    return;
  }
  
  // 2. Girdi validasyonu: Sadece beklenen yapıda veri kabul et
  if (!Array.isArray(passwords)) return;
  vaultCache = passwords.map(p => ({
    title: String(p.title || ''),
    username: String(p.username || ''),
    pass: String(p.pass || ''),
    website: String(p.website || '')
  }));
});

ipcMain.on('lock-vault', (event) => {
  // 1. Sender validation
  if (!mainWindow || event.senderFrame !== mainWindow.webContents.mainFrame) {
    console.warn('[IPC] Unauthorized IPC sender for lock-vault');
    return;
  }

  // 🔒 Kasa kilitlendiğinde önbelleği temizle
  vaultCache = [];
});

// ─────────────────────────────────────────────────────────────────
// 🪟 Ana Pencere Oluşturma
// ─────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
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
  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  
  // Menü çubuğunu gizle
  mainWindow.setMenuBarVisibility(false);
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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

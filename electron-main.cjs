// ─────────────────────────────────────────────────────────────────
// 📄 .env dosyasını yükle (loopback sync ayarları için)
// ─────────────────────────────────────────────────────────────────
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { app, BrowserWindow, ipcMain, session, dialog } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const net = require('net');
const { execSync } = require('child_process');

// ─────────────────────────────────────────────────────────────────
// 🔒 GÜVENLİK: Ana süreçte plaintext kasa tutulmaz; yalnızca durum bilgisi ve kısa ömürlü IPC istekleri yönetilir
// ─────────────────────────────────────────────────────────────────
const vaultState = {
  unlocked: false,
  entryCount: 0,
};
let desktopUiLanguage = 'en';
let mainWindow = null; // IPC validation için global referans
const pendingDomainCredentialRequests = new Map();
const pendingDomainPasskeyRequests = new Map();
const pendingPasskeyAuthRequests = new Map();
const pendingPasskeyRegRequests = new Map();
const pendingAutosaveCredentialRequests = new Map();
const pendingVaultCliRequests = new Map();
let nativeBridgeServer = null;
let nativeBridgeSocketPath = null;
let desktopBridgeIdentity = null;
let startupDiagnosticMode = false;
const persistentPairings = new Map();
const nativeBridgeNonceStore = new Map();
const PAIRING_HISTORY_LIMIT = 12;
const RAPID_REPAIR_WINDOW_MS = 12 * 60 * 60 * 1000;
const NATIVE_BRIDGE_MESSAGE_TTL_MS = 15 * 1000;
const STARTUP_DIAGNOSTIC_EVENT_LIMIT = 20;
const startupDiagnosticEvents = [];

// ─────────────────────────────────────────────────────────────────
// 📡 Yerel HTTP Sync Server (Extension İletişimi)
// Güvenli: Token bazlı kimlik doğrulama + Origin kısıtlaması
// ─────────────────────────────────────────────────────────────────
const http = require('http');

const DEFAULT_ALLOWLIST_EXTENSION_IDS = [
  'iockeheicjcnfoegjjboooljndjcafae',
  'gddgomiecgnihlljfkogfjgakedoielk',
  'kjbdjkfijeflhhbnkjgkmccljifidpcc',
  'aegisvault@example.com',
  'aegisvault-cli@local',
];
const chromiumDevExtensionIdPath = path.join(
  __dirname,
  'aegis-wxt',
  'dev',
  'chromium-extension-id.txt'
);
if (fs.existsSync(chromiumDevExtensionIdPath)) {
  const devExtensionId = fs.readFileSync(chromiumDevExtensionIdPath, 'utf8').trim();
  if (devExtensionId && !DEFAULT_ALLOWLIST_EXTENSION_IDS.includes(devExtensionId)) {
    DEFAULT_ALLOWLIST_EXTENSION_IDS.push(devExtensionId);
  }
}

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

// Varsayılan davranış: STRICT allowlist zorunlu.
// Geriye dönük uyumluluk gerektiğinde AEGIS_STRICT_ALLOWLIST_MODE=0 verilerek gevşetilebilir.
const STRICT_ALLOWLIST_MODE = (process.env.AEGIS_STRICT_ALLOWLIST_MODE || '1') !== '0';
const LOOPBACK_SYNC_ENABLED = process.env.AEGIS_ENABLE_LOOPBACK_SYNC !== '0';
const PAIRING_SECRET = (process.env.AEGIS_EXTENSION_PAIRING_SECRET || '').trim();
const PAIRING_TTL_MS = 10000;

function isValidExtensionIdFormat(id) {
  // Chrome extension ID: 32 karakter lowercase alphanumeric
  // Firefox extension ID: {uuid} veya email formatı
  return (
    typeof id === 'string' &&
    (/^[a-z0-9]{32}$/.test(id) || // Chrome format (lowercase alphanumeric)
      /^[a-zA-Z0-9_.-]+@[a-zA-Z0-9_.-]+$/.test(id) || // Firefox email format
      /^\{[0-9a-f-]{36}\}$/.test(id)) // Firefox UUID format
  );
}

const CHALLENGE_TTL_MS = 15000;
const challengeStore = new Map();

// 🔒 DEV MODE: Sadece belirli localhost originlerine izin ver (wildcard YOK)
const DEV_ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

function isOriginAllowed(origin) {
  if (!origin) return false;

  // Yerel Dashboard (PWA) originleri
  if (
    origin === 'http://localhost:5173' ||
    origin === 'http://127.0.0.1:5173' ||
    origin === 'file://' ||
    origin === 'app://localhost'
  ) {
    return true;
  }

  // Extension Allowlist Check
  if (origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://')) {
    const id = origin.split('://')[1].split('/')[0];
    // Dev modda sadece allowlist veya geçerli extension ID'ler (uyumlu mod)
    if (isAllowlistedExtensionId(id)) {
      return true;
    }
    // Dev modda unknown extension ID'yi logla ama reddet
    if (!app.isPackaged) {
      console.warn(
        `[Aegis Sync] ⚠️ Dev modda bilinmeyen extension ID reddedildi: ${id.substring(0, 8)}...`
      );
    }
    return false;
  }

  return false;
}

function isAllowlistedExtensionId(extensionId) {
  if (typeof extensionId !== 'string' || !extensionId) return false;
  // Strict mod: sadece allowlist'tekilere izin ver
  if (STRICT_ALLOWLIST_MODE) {
    return ALLOWLIST_EXTENSION_IDS.includes(extensionId);
  }
  // Uyumlu mod (opsiyonel): allowlist'te varsa doğrudan kabul et,
  // yoksa geçerli extension ID formatını kontrol et.
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

function parseRequestUrl(req) {
  try {
    return new URL(req.url, 'http://127.0.0.1:23456');
  } catch {
    return null;
  }
}

function normalizeDomain(input) {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return '';
  try {
    const parsed = trimmed.includes('://') ? new URL(trimmed) : new URL(`https://${trimmed}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return trimmed.replace(/^www\./, '');
  }
}

function isDomainMatch(entryWebsite, requestedDomain) {
  const entryDomain = normalizeDomain(entryWebsite);
  const wanted = normalizeDomain(requestedDomain);
  if (!entryDomain || !wanted) return false;
  return (
    entryDomain === wanted ||
    entryDomain.endsWith(`.${wanted}`) ||
    wanted.endsWith(`.${entryDomain}`)
  );
}

function sanitizeCredentialArray(data) {
  if (!Array.isArray(data)) return [];
  return data
    .filter((item) => item && typeof item === 'object')
    .slice(0, 5)
    .map((item) => ({
      title: String(item.title || ''),
      username: String(item.username || ''),
      pass: String(item.pass || ''),
      website: String(item.website || ''),
      category: String(item.category || ''),
      cardDetails:
        item.cardDetails && typeof item.cardDetails === 'object'
          ? {
              cardholder_name: String(item.cardDetails.cardholder_name || ''),
              card_number: String(item.cardDetails.card_number || ''),
              brand: String(item.cardDetails.brand || ''),
              expiry_month: String(item.cardDetails.expiry_month || ''),
              expiry_year: String(item.cardDetails.expiry_year || ''),
              cvv: String(item.cardDetails.cvv || ''),
              pin: String(item.cardDetails.pin || ''),
              billing_zip: String(item.cardDetails.billing_zip || ''),
              billing_address: String(item.cardDetails.billing_address || ''),
            }
          : null,
      identityDetails:
        item.identityDetails && typeof item.identityDetails === 'object'
          ? {
              document_type: String(item.identityDetails.document_type || ''),
              identity_number: String(item.identityDetails.identity_number || ''),
              issuing_country: String(item.identityDetails.issuing_country || ''),
              nationality: String(item.identityDetails.nationality || ''),
              date_of_birth: String(item.identityDetails.date_of_birth || ''),
              issued_at: String(item.identityDetails.issued_at || ''),
              expires_at: String(item.identityDetails.expires_at || ''),
            }
          : null,
    }))
    .filter((item) => item.pass && item.website);
}

function sanitizePasskeyArray(data) {
  if (!Array.isArray(data)) return [];
  return data
    .filter((item) => item && typeof item === 'object')
    .slice(0, 5)
    .map((item) => ({
      title: String(item.title || ''),
      username: String(item.username || ''),
      website: String(item.website || ''),
      passkeyMetadata: item.passkeyMetadata
        ? {
            credential_id: String(item.passkeyMetadata.credential_id || ''),
            rp_id: String(item.passkeyMetadata.rp_id || ''),
            mode: String(item.passkeyMetadata.mode || ''),
          }
        : null,
    }))
    .filter((item) => item.passkeyMetadata && item.website);
}

function sanitizeAutosaveCredential(value) {
  if (!value || typeof value !== 'object') return null;
  const candidate = value;
  const website = String(candidate.website || '').trim();
  const pass = String(candidate.pass || '');
  if (!website || !pass) return null;

  return {
    title: String(candidate.title || '').slice(0, 120),
    username: String(candidate.username || '').slice(0, 256),
    pass: pass.slice(0, 1024),
    website: website.slice(0, 512),
    submittedAt:
      typeof candidate.submittedAt === 'string' ? candidate.submittedAt : new Date().toISOString(),
    source: typeof candidate.source === 'string' ? candidate.source : 'browser_form',
  };
}

function sanitizeVaultEntryForBridge(value) {
  if (!value || typeof value !== 'object') return null;
  const item = value;
  const id = Number(item.id);
  if (!Number.isFinite(id)) return null;
  return {
    id,
    title: String(item.title || '').slice(0, 256),
    username: String(item.username || '').slice(0, 256),
    pass: String(item.pass || '').slice(0, 1024),
    website: String(item.website || '').slice(0, 512),
    category: String(item.category || 'General').slice(0, 64),
    tags: Array.isArray(item.tags)
      ? item.tags.slice(0, 32).map((tag) => String(tag || '').slice(0, 64))
      : [],
    updated_at: typeof item.updated_at === 'string' ? item.updated_at : '',
    deletedAt: typeof item.deletedAt === 'string' ? item.deletedAt : undefined,
  };
}

function sanitizeVaultEntryInput(value) {
  if (!value || typeof value !== 'object') return null;
  const candidate = value;
  const pass = String(candidate.pass || '');
  return {
    title: String(candidate.title || '').slice(0, 256),
    username: String(candidate.username || '').slice(0, 256),
    pass: pass.slice(0, 1024),
    website: String(candidate.website || '').slice(0, 512),
    category: String(candidate.category || 'General').slice(0, 64),
    tags: Array.isArray(candidate.tags)
      ? candidate.tags.slice(0, 32).map((tag) => String(tag || '').slice(0, 64))
      : [],
  };
}

function requestDomainCredentialsFromRenderer(domain) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return Promise.resolve([]);
  }

  const requestId = crypto.randomUUID();
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      pendingDomainCredentialRequests.delete(requestId);
      resolve([]);
    }, 3000);

    pendingDomainCredentialRequests.set(requestId, {
      resolve: (data) => {
        clearTimeout(timeout);
        resolve(sanitizeCredentialArray(data));
      },
    });

    try {
      mainWindow.webContents.send('aegis-domain-credentials-request', {
        requestId,
        domain,
      });
    } catch {
      clearTimeout(timeout);
      pendingDomainCredentialRequests.delete(requestId);
      resolve([]);
    }
  });
}

function requestDomainPasskeysFromRenderer(domain) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return Promise.resolve([]);
  }

  const requestId = crypto.randomUUID();
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      pendingDomainPasskeyRequests.delete(requestId);
      resolve([]);
    }, 3000);

    pendingDomainPasskeyRequests.set(requestId, {
      resolve: (data) => {
        clearTimeout(timeout);
        resolve(sanitizePasskeyArray(data));
      },
    });

    try {
      mainWindow.webContents.send('aegis-domain-passkeys-request', {
        requestId,
        domain,
      });
    } catch {
      clearTimeout(timeout);
      pendingDomainPasskeyRequests.delete(requestId);
      resolve([]);
    }
  });
}

function requestPasskeyAuthFromRenderer(options) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return Promise.reject(new Error('MAIN_WINDOW_NOT_AVAILABLE'));
  }

  const requestId = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingPasskeyAuthRequests.delete(requestId);
      reject(new Error('TIMEOUT'));
    }, 60000);

    pendingPasskeyAuthRequests.set(requestId, {
      resolve: (data) => {
        clearTimeout(timeout);
        resolve(data);
      },
      reject: (err) => {
        clearTimeout(timeout);
        reject(err);
      },
    });

    try {
      mainWindow.webContents.send('aegis-auth-passkey-request', {
        requestId,
        options,
      });
    } catch (err) {
      clearTimeout(timeout);
      pendingPasskeyAuthRequests.delete(requestId);
      reject(err);
    }
  });
}

function requestAutosaveCredentialFromRenderer(credential, context = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return Promise.resolve({ saved: false, error: 'MAIN_WINDOW_NOT_AVAILABLE' });
  }

  const sanitizedCredential = sanitizeAutosaveCredential(credential);
  if (!sanitizedCredential) {
    return Promise.resolve({ saved: false, error: 'INVALID_CREDENTIAL' });
  }

  const requestId = crypto.randomUUID();
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      pendingAutosaveCredentialRequests.delete(requestId);
      resolve({ saved: false, error: 'TIMEOUT' });
    }, 4000);

    pendingAutosaveCredentialRequests.set(requestId, {
      resolve: (result) => {
        clearTimeout(timeout);
        if (!result || typeof result !== 'object') {
          resolve({ saved: false, error: 'INVALID_RENDERER_RESPONSE' });
          return;
        }
        resolve({
          saved: Boolean(result.saved),
          action: typeof result.action === 'string' ? result.action : 'none',
          entryId: Number.isFinite(Number(result.entryId)) ? Number(result.entryId) : undefined,
          error: typeof result.error === 'string' ? result.error : undefined,
        });
      },
    });

    try {
      mainWindow.webContents.send('aegis-autosave-credential-request', {
        requestId,
        credential: sanitizedCredential,
        context: {
          extensionId: typeof context.extensionId === 'string' ? context.extensionId : '',
          domain: typeof context.domain === 'string' ? context.domain : '',
          browserName: typeof context.browserName === 'string' ? context.browserName : '',
        },
      });
    } catch {
      clearTimeout(timeout);
      pendingAutosaveCredentialRequests.delete(requestId);
      resolve({ saved: false, error: 'IPC_SEND_FAILED' });
    }
  });
}

function requestVaultCliOperationFromRenderer(operation, payload = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return Promise.resolve({ ok: false, error: 'MAIN_WINDOW_NOT_AVAILABLE' });
  }

  const requestId = crypto.randomUUID();
  const normalizedOperation = typeof operation === 'string' ? operation.trim().toLowerCase() : '';

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      pendingVaultCliRequests.delete(requestId);
      resolve({ ok: false, error: 'TIMEOUT' });
    }, 8000);

    pendingVaultCliRequests.set(requestId, {
      resolve: (result) => {
        clearTimeout(timeout);
        if (!result || typeof result !== 'object') {
          resolve({ ok: false, error: 'INVALID_RENDERER_RESPONSE' });
          return;
        }
        const ok = Boolean(result.ok);
        const error = typeof result.error === 'string' ? result.error : undefined;
        if (normalizedOperation === 'list') {
          const list = Array.isArray(result.data) ? result.data : [];
          resolve({
            ok,
            error: ok ? undefined : error || 'LIST_FAILED',
            data: list.map((entry) => sanitizeVaultEntryForBridge(entry)).filter(Boolean),
          });
          return;
        }
        if (normalizedOperation === 'get') {
          resolve({
            ok,
            error: ok ? undefined : error || 'GET_FAILED',
            data: sanitizeVaultEntryForBridge(result.data),
          });
          return;
        }
        resolve({
          ok,
          error: ok ? undefined : error || 'CLI_OPERATION_FAILED',
          data: result.data,
        });
      },
    });

    try {
      mainWindow.webContents.send('aegis-vault-cli-request', {
        requestId,
        operation: normalizedOperation,
        payload: payload && typeof payload === 'object' ? payload : {},
      });
    } catch {
      clearTimeout(timeout);
      pendingVaultCliRequests.delete(requestId);
      resolve({ ok: false, error: 'IPC_SEND_FAILED' });
    }
  });
}

async function refreshVaultStateFromRenderer() {
  const result = await requestVaultCliOperationFromRenderer('status');
  const isUnlocked = Boolean(result?.ok && result?.data?.isUnlocked);
  const entryCount = Number.isFinite(Number(result?.data?.entryCount))
    ? Math.max(0, Number(result.data.entryCount))
    : 0;

  vaultState.unlocked = isUnlocked;
  vaultState.entryCount = isUnlocked ? entryCount : 0;

  return {
    ok: Boolean(result?.ok),
    isUnlocked,
    entryCount,
    error: result?.ok ? undefined : String(result?.error || 'STATUS_REFRESH_FAILED'),
  };
}

function getNativeBridgeSocketPath() {
  if (nativeBridgeSocketPath) {
    return nativeBridgeSocketPath;
  }

  if (process.platform === 'win32') {
    nativeBridgeSocketPath = '\\\\.\\pipe\\aegis-vault-native-v1';
    return nativeBridgeSocketPath;
  }

  nativeBridgeSocketPath = path.join(os.tmpdir(), 'aegis-vault-native-v1.sock');
  return nativeBridgeSocketPath;
}

function cleanupNativeBridgeSocketFile() {
  const socketPath = getNativeBridgeSocketPath();
  if (process.platform === 'win32') {
    return;
  }

  try {
    if (fs.existsSync(socketPath)) {
      fs.unlinkSync(socketPath);
    }
  } catch {}
}

function getPairingStorePath() {
  return path.join(app.getPath('userData'), 'native-bridge-pairings.json');
}

function getDesktopBridgeIdentityPath() {
  return path.join(app.getPath('userData'), 'native-bridge-desktop-identity.json');
}

function normalizeUiLanguage(value) {
  return typeof value === 'string' && value.toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

function getUiPreferencesPath() {
  return path.join(app.getPath('userData'), 'ui-preferences.json');
}

function loadUiPreferences() {
  try {
    const filePath = getUiPreferencesPath();
    if (!fs.existsSync(filePath)) {
      desktopUiLanguage = 'en';
      return;
    }
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    desktopUiLanguage = normalizeUiLanguage(parsed?.language);
  } catch {
    desktopUiLanguage = 'en';
  }
}

function saveUiPreferences() {
  try {
    fs.writeFileSync(
      getUiPreferencesPath(),
      JSON.stringify({ language: desktopUiLanguage }, null, 2),
      'utf8'
    );
  } catch {}
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function recordStartupDiagnosticEvent(level, code, message, detail) {
  startupDiagnosticEvents.unshift({
    at: new Date().toISOString(),
    level: level || 'info',
    code: code || 'UNKNOWN',
    message: String(message || ''),
    detail: detail ? String(detail) : '',
  });

  if (startupDiagnosticEvents.length > STARTUP_DIAGNOSTIC_EVENT_LIMIT) {
    startupDiagnosticEvents.length = STARTUP_DIAGNOSTIC_EVENT_LIMIT;
  }
}

function getStartupDiagnostics() {
  const distIndexPath = path.join(__dirname, 'dist', 'index.html');
  const preloadPath = path.join(__dirname, 'preload.cjs');
  const nativeHostDir = app.isPackaged
    ? path.join(process.resourcesPath, 'native-host')
    : path.join(__dirname, 'build', 'native-host');

  return {
    success: true,
    language: desktopUiLanguage,
    summary: {
      isPackaged: app.isPackaged,
      appVersion: app.getVersion(),
      startupDiagnosticMode,
      nativeBridgeServerActive: Boolean(nativeBridgeServer),
      nativeBridgeSocketPath: getNativeBridgeSocketPath(),
      pairingCount: persistentPairings.size,
      uiLanguage: desktopUiLanguage,
      platform: process.platform,
    },
    checks: [
      {
        key: 'dist-index',
        label: 'dist/index.html',
        status: fs.existsSync(distIndexPath) ? 'ok' : 'error',
        detail: distIndexPath,
      },
      {
        key: 'preload',
        label: 'preload.cjs',
        status: fs.existsSync(preloadPath) ? 'ok' : 'error',
        detail: preloadPath,
      },
      {
        key: 'native-host-assets',
        label: app.isPackaged ? 'native-host resources' : 'native-host build output',
        status: fs.existsSync(nativeHostDir) ? 'ok' : 'warn',
        detail: nativeHostDir,
      },
      {
        key: 'desktop-identity',
        label: 'desktop bridge identity',
        status: desktopBridgeIdentity?.keyId ? 'ok' : 'warn',
        detail: desktopBridgeIdentity?.keyId || 'NOT_INITIALIZED',
      },
      {
        key: 'loopback-sync',
        label: 'loopback sync',
        status: LOOPBACK_SYNC_ENABLED ? (isLoopbackSyncReady() ? 'warn' : 'warn') : 'ok',
        detail: LOOPBACK_SYNC_ENABLED
          ? isLoopbackSyncReady()
            ? 'ENABLED_EXPLICITLY'
            : 'ENABLED_BUT_NOT_READY'
          : 'DISABLED_BY_DEFAULT',
      },
      {
        key: 'strict-allowlist',
        label: 'strict extension allowlist',
        status: STRICT_ALLOWLIST_MODE ? 'ok' : 'warn',
        detail: STRICT_ALLOWLIST_MODE ? 'ENFORCED' : 'COMPATIBILITY_MODE',
      },
    ],
    recentEvents: [...startupDiagnosticEvents],
  };
}

function getStartupDiagnosticText(language) {
  const lang = normalizeUiLanguage(language);
  if (lang === 'tr') {
    return {
      title: 'Aegis Vault kurtarma ekrani',
      subtitle:
        'Uygulama acilisi sirasinda bir sorun algilandi. Asagidaki tani ozeti ile yeniden yuklemeyi deneyebilirsiniz.',
      summaryTitle: 'Tani ozeti',
      eventsTitle: 'Son olaylar',
      reload: 'Uygulamayi yeniden yukle',
      quit: 'Uygulamayi kapat',
      packaged: 'Paketli calisma',
      bridge: 'Yerel kopru',
      pairings: 'Eslesme kaydi',
      noEvents: 'Kayitli olay yok',
      footer: 'Sorun devam ederse bu ekrandaki tani bilgisini raporlayin.',
    };
  }

  return {
    title: 'Aegis Vault recovery screen',
    subtitle:
      'A startup problem was detected. Review the diagnostics below and try reloading the app.',
    summaryTitle: 'Diagnostic summary',
    eventsTitle: 'Recent events',
    reload: 'Reload app',
    quit: 'Quit app',
    packaged: 'Packaged mode',
    bridge: 'Local bridge',
    pairings: 'Pairing records',
    noEvents: 'No recorded events',
    footer: 'If the issue persists, report the diagnostics shown on this screen.',
  };
}

function showStartupDiagnosticPage(reason, detail) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  startupDiagnosticMode = true;
  recordStartupDiagnosticEvent(
    'error',
    reason || 'STARTUP_DIAGNOSTIC',
    reason || 'Startup diagnostic page opened',
    detail
  );

  const diagnostics = getStartupDiagnostics();
  const text = getStartupDiagnosticText(desktopUiLanguage);
  const summaryItems = [
    `${text.packaged}: ${diagnostics.summary.isPackaged ? 'yes' : 'no'}`,
    `${text.bridge}: ${diagnostics.summary.nativeBridgeServerActive ? 'ok' : 'down'}`,
    `${text.pairings}: ${diagnostics.summary.pairingCount}`,
  ]
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');

  const eventItems = diagnostics.recentEvents.length
    ? diagnostics.recentEvents
        .map(
          (event) =>
            `<li><strong>${escapeHtml(event.code)}</strong> - ${escapeHtml(event.message)}<br/><small>${escapeHtml(event.at)}${event.detail ? ` - ${escapeHtml(event.detail)}` : ''}</small></li>`
        )
        .join('')
    : `<li>${escapeHtml(text.noEvents)}</li>`;

  const html = `<!doctype html>
<html lang="${escapeHtml(desktopUiLanguage)}">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(text.title)}</title>
    <style>
      body { margin:0; font-family: Segoe UI, Arial, sans-serif; background:#101827; color:#e5eef8; }
      .wrap { max-width: 860px; margin: 0 auto; padding: 48px 24px; }
      .card { background:#172235; border:1px solid rgba(255,255,255,0.08); border-radius:18px; padding:24px; margin-top:20px; }
      h1 { margin:0 0 8px; font-size:34px; }
      p { color:#bfd0e5; line-height:1.6; }
      ul { padding-left: 20px; }
      li { margin: 10px 0; }
      .actions { display:flex; gap:12px; margin-top:24px; flex-wrap: wrap; }
      button { border:0; border-radius:12px; padding:12px 18px; font-size:15px; font-weight:600; cursor:pointer; }
      .primary { background:#5f8dd3; color:#fff; }
      .secondary { background:#2b3a52; color:#fff; }
      .reason { color:#ffd7a8; font-weight:600; }
      small { color:#9fb3cb; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>${escapeHtml(text.title)}</h1>
      <p>${escapeHtml(text.subtitle)}</p>
      <p class="reason">${escapeHtml(reason || 'STARTUP_DIAGNOSTIC')}</p>
      <div class="card">
        <h2>${escapeHtml(text.summaryTitle)}</h2>
        <ul>${summaryItems}</ul>
      </div>
      <div class="card">
        <h2>${escapeHtml(text.eventsTitle)}</h2>
        <ul>${eventItems}</ul>
      </div>
      <div class="actions">
        <button class="primary" onclick="window.aegisElectron && window.aegisElectron.reloadApp && window.aegisElectron.reloadApp()">${escapeHtml(text.reload)}</button>
        <button class="secondary" onclick="window.aegisElectron && window.aegisElectron.quitApp && window.aegisElectron.quitApp()">${escapeHtml(text.quit)}</button>
      </div>
      <p><small>${escapeHtml(text.footer)}</small></p>
    </div>
  </body>
</html>`;

  void mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

function normalizeDesktopBridgePublicJwk(jwk) {
  if (!jwk || typeof jwk !== 'object') return null;
  const kty = typeof jwk.kty === 'string' ? jwk.kty : '';
  const crv = typeof jwk.crv === 'string' ? jwk.crv : '';
  const x = typeof jwk.x === 'string' ? jwk.x : '';
  const y = typeof jwk.y === 'string' ? jwk.y : '';
  if (kty !== 'EC' || crv !== 'P-256' || !x || !y) return null;
  return {
    key_ops: ['verify'],
    ext: true,
    kty: 'EC',
    crv: 'P-256',
    x,
    y,
  };
}

function normalizeDesktopBridgePrivateJwk(jwk) {
  if (!jwk || typeof jwk !== 'object') return null;
  const kty = typeof jwk.kty === 'string' ? jwk.kty : '';
  const crv = typeof jwk.crv === 'string' ? jwk.crv : '';
  const x = typeof jwk.x === 'string' ? jwk.x : '';
  const y = typeof jwk.y === 'string' ? jwk.y : '';
  const d = typeof jwk.d === 'string' ? jwk.d : '';
  if (kty !== 'EC' || crv !== 'P-256' || !x || !y || !d) return null;
  return {
    key_ops: ['sign'],
    ext: true,
    kty: 'EC',
    crv: 'P-256',
    x,
    y,
    d,
  };
}

function canonicalizeDesktopBridgePublicJwk(jwk) {
  const normalized = normalizeDesktopBridgePublicJwk(jwk);
  return normalized ? JSON.stringify(normalized) : '';
}

function computeDesktopBridgeKeyId(jwk) {
  const canonical = canonicalizeDesktopBridgePublicJwk(jwk);
  if (!canonical) return '';
  return crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 24);
}

function loadDesktopBridgeIdentity() {
  try {
    const filePath = getDesktopBridgeIdentityPath();
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const publicJwk = normalizeDesktopBridgePublicJwk(parsed?.publicJwk);
      const privateJwk = normalizeDesktopBridgePrivateJwk(parsed?.privateJwk);
      const keyId =
        typeof parsed?.keyId === 'string' ? parsed.keyId : computeDesktopBridgeKeyId(publicJwk);
      if (publicJwk && privateJwk && keyId) {
        desktopBridgeIdentity = { publicJwk, privateJwk, keyId };
        return desktopBridgeIdentity;
      }
    }
  } catch {}

  const generated = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: { format: 'jwk' },
    privateKeyEncoding: { format: 'jwk' },
  });
  const publicJwk = normalizeDesktopBridgePublicJwk(generated.publicKey);
  const privateJwk = normalizeDesktopBridgePrivateJwk(generated.privateKey);
  const keyId = computeDesktopBridgeKeyId(publicJwk);
  desktopBridgeIdentity = { publicJwk, privateJwk, keyId };
  try {
    fs.writeFileSync(
      getDesktopBridgeIdentityPath(),
      JSON.stringify(desktopBridgeIdentity, null, 2),
      'utf8'
    );
  } catch {}
  return desktopBridgeIdentity;
}

function loadPersistentPairings() {
  try {
    const storePath = getPairingStorePath();
    if (!fs.existsSync(storePath)) {
      persistentPairings.clear();
      return;
    }

    const raw = fs.readFileSync(storePath, 'utf8');
    const parsed = JSON.parse(raw);
    persistentPairings.clear();

    for (const [extensionId, record] of Object.entries(parsed || {})) {
      if (!isAllowlistedExtensionId(extensionId)) continue;
      const secret = typeof record?.secret === 'string' ? record.secret.trim() : '';
      if (secret.length < 32) continue;
      const pairedAt =
        typeof record?.pairedAt === 'string' ? record.pairedAt : new Date().toISOString();
      const browserName = typeof record?.browserName === 'string' ? record.browserName : '';
      const deviceFingerprint =
        typeof record?.deviceFingerprint === 'string' ? record.deviceFingerprint : '';
      const installId = typeof record?.installId === 'string' ? record.installId : '';
      const clientLabel = typeof record?.clientLabel === 'string' ? record.clientLabel : '';
      const clientKeyId = typeof record?.clientKeyId === 'string' ? record.clientKeyId : '';
      const clientPublicJwk = normalizeClientPublicJwk(record?.clientPublicJwk);
      const pairingMode =
        typeof record?.pairingMode === 'string'
          ? record.pairingMode
          : clientPublicJwk
            ? 'signed-p256-v1'
            : 'legacy-secret-v1';
      const lastUsedAt = typeof record?.lastUsedAt === 'string' ? record.lastUsedAt : '';
      const lastApprovedAt =
        typeof record?.lastApprovedAt === 'string' ? record.lastApprovedAt : pairedAt;
      const currentRiskFlags = Array.isArray(record?.currentRiskFlags)
        ? record.currentRiskFlags.filter((item) => typeof item === 'string').slice(0, 6)
        : [];
      const pairingHistory = Array.isArray(record?.pairingHistory)
        ? record.pairingHistory
            .filter((item) => item && typeof item === 'object')
            .slice(-PAIRING_HISTORY_LIMIT)
            .map((item) => ({
              at: typeof item.at === 'string' ? item.at : pairedAt,
              type: typeof item.type === 'string' ? item.type : 'paired',
              detail: typeof item.detail === 'string' ? item.detail : '',
              riskFlags: Array.isArray(item.riskFlags)
                ? item.riskFlags.filter((flag) => typeof flag === 'string').slice(0, 6)
                : [],
            }))
        : [];
      persistentPairings.set(extensionId, {
        secret,
        pairedAt,
        browserName,
        deviceFingerprint,
        installId,
        clientLabel,
        clientKeyId,
        clientPublicJwk,
        pairingMode,
        lastUsedAt,
        lastApprovedAt,
        currentRiskFlags,
        pairingHistory,
      });
    }
  } catch {
    persistentPairings.clear();
  }
}

function savePersistentPairings() {
  const serialized = {};
  for (const [extensionId, record] of persistentPairings.entries()) {
    serialized[extensionId] = {
      secret: record.secret,
      pairedAt: record.pairedAt,
      browserName: record.browserName || '',
      deviceFingerprint: record.deviceFingerprint || '',
      installId: record.installId || '',
      clientLabel: record.clientLabel || '',
      clientKeyId: record.clientKeyId || '',
      clientPublicJwk: normalizeClientPublicJwk(record.clientPublicJwk),
      pairingMode:
        record.pairingMode || (record.clientPublicJwk ? 'signed-p256-v1' : 'legacy-secret-v1'),
      lastUsedAt: record.lastUsedAt || '',
      lastApprovedAt: record.lastApprovedAt || '',
      currentRiskFlags: Array.isArray(record.currentRiskFlags) ? record.currentRiskFlags : [],
      pairingHistory: Array.isArray(record.pairingHistory) ? record.pairingHistory : [],
    };
  }

  try {
    fs.writeFileSync(getPairingStorePath(), JSON.stringify(serialized, null, 2), 'utf8');
  } catch (error) {
    console.error('[Aegis Native Bridge] Pairing store save failed:', error.message);
  }
}

function getPairingSecretForExtension(extensionId) {
  const persistent = persistentPairings.get(extensionId);

  // Loopback-fallback eşleşmesi varsa: eklenti env secret'ı kullandığından,
  // masaüstü de aynı env secret'ı döndürmeli (HMAC proof uyuşması için).
  // signed-p256-v1 modunda ise oluşturulan özel secret kullanılır.
  if (persistent?.secret?.length >= 32) {
    const mode = persistent.pairingMode || '';
    if (mode === 'loopback-fallback-v1') {
      // Env secret'ı tercih et (eklenti de bunu kullanıyor)
      const envSecret =
        (process.env.AEGIS_EXTENSION_PAIRING_SECRET || '').trim() ||
        (process.env.AEGIS_NATIVE_HOST_PAIRING_SECRET || '').trim() ||
        PAIRING_SECRET;
      if (envSecret.length >= 32) {
        return envSecret;
      }
    }
    return persistent.secret;
  }

  // Runtime'da set edilen secret kontrol et (ensureNativeHostPairingSecret tarafından)
  const runtimeSecret = (process.env.AEGIS_NATIVE_HOST_PAIRING_SECRET || '').trim();
  if (runtimeSecret.length >= 32) {
    return runtimeSecret;
  }

  // Fallback: Build-time secret
  if (PAIRING_SECRET.length >= 32) {
    return PAIRING_SECRET;
  }

  return '';
}

function normalizeClientPublicJwk(jwk) {
  if (!jwk || typeof jwk !== 'object') return null;
  const kty = typeof jwk.kty === 'string' ? jwk.kty : '';
  const crv = typeof jwk.crv === 'string' ? jwk.crv : '';
  const x = typeof jwk.x === 'string' ? jwk.x : '';
  const y = typeof jwk.y === 'string' ? jwk.y : '';
  if (kty !== 'EC' || crv !== 'P-256' || !x || !y) {
    return null;
  }
  return {
    key_ops: ['verify'],
    ext: true,
    kty: 'EC',
    crv: 'P-256',
    x,
    y,
  };
}

function canonicalizeClientPublicJwk(jwk) {
  const normalized = normalizeClientPublicJwk(jwk);
  return normalized ? JSON.stringify(normalized) : '';
}

function computeClientKeyId(jwk) {
  const canonical = canonicalizeClientPublicJwk(jwk);
  if (!canonical) return '';
  return crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 24);
}

function cleanupNativeBridgeNonces(now = Date.now()) {
  for (const [compoundKey, createdAt] of nativeBridgeNonceStore.entries()) {
    if (!Number.isFinite(createdAt) || now - createdAt > NATIVE_BRIDGE_MESSAGE_TTL_MS) {
      nativeBridgeNonceStore.delete(compoundKey);
    }
  }
}

function rememberNativeBridgeNonce(extensionId, nonce, now = Date.now()) {
  cleanupNativeBridgeNonces(now);
  const compoundKey = `${extensionId}:${nonce}`;
  if (nativeBridgeNonceStore.has(compoundKey)) {
    return false;
  }
  nativeBridgeNonceStore.set(compoundKey, now);
  return true;
}

function normalizeClientInfo(clientInfo, extensionId = '') {
  const browserName =
    typeof clientInfo?.browserName === 'string' ? clientInfo.browserName.trim() : '';
  const browserVersion =
    typeof clientInfo?.browserVersion === 'string' ? clientInfo.browserVersion.trim() : '';
  const platform = typeof clientInfo?.platform === 'string' ? clientInfo.platform.trim() : '';
  const locale = typeof clientInfo?.locale === 'string' ? clientInfo.locale.trim() : '';
  const installId = typeof clientInfo?.installId === 'string' ? clientInfo.installId.trim() : '';
  const extensionVersion =
    typeof clientInfo?.extensionVersion === 'string' ? clientInfo.extensionVersion.trim() : '';
  const userAgent = typeof clientInfo?.userAgent === 'string' ? clientInfo.userAgent.trim() : '';
  const clientKeyId =
    typeof clientInfo?.clientKeyId === 'string' ? clientInfo.clientKeyId.trim() : '';
  const normalizedPayload = JSON.stringify({
    extensionId,
    browserName,
    browserVersion,
    platform,
    locale,
    installId,
    extensionVersion,
    userAgent,
  });
  const deviceFingerprint = crypto
    .createHash('sha256')
    .update(normalizedPayload)
    .digest('hex')
    .slice(0, 16);
  const clientLabelParts = [browserName, browserVersion, platform].filter(Boolean);
  return {
    browserName,
    browserVersion,
    platform,
    locale,
    installId,
    extensionVersion,
    userAgent,
    clientKeyId,
    deviceFingerprint,
    clientLabel: clientLabelParts.join(' / '),
  };
}

function buildPairingRiskFlags(existingRecord, clientInfo) {
  const flags = [];
  if (!existingRecord) return flags;
  if (
    existingRecord.deviceFingerprint &&
    clientInfo.deviceFingerprint &&
    existingRecord.deviceFingerprint !== clientInfo.deviceFingerprint
  ) {
    flags.push('fingerprint_changed');
  }
  if (
    existingRecord.installId &&
    clientInfo.installId &&
    existingRecord.installId !== clientInfo.installId
  ) {
    flags.push('install_id_changed');
  }
  if (
    existingRecord.browserName &&
    clientInfo.browserName &&
    existingRecord.browserName !== clientInfo.browserName
  ) {
    flags.push('browser_changed');
  }
  if (
    existingRecord.clientKeyId &&
    clientInfo.clientKeyId &&
    existingRecord.clientKeyId !== clientInfo.clientKeyId
  ) {
    flags.push('client_key_changed');
  }
  const lastApprovalTs = Date.parse(existingRecord.lastApprovedAt || existingRecord.pairedAt || '');
  if (Number.isFinite(lastApprovalTs) && Date.now() - lastApprovalTs < RAPID_REPAIR_WINDOW_MS) {
    flags.push('rapid_repair');
  }
  return Array.from(new Set(flags));
}

function appendPairingHistory(record, event) {
  const history = Array.isArray(record.pairingHistory) ? record.pairingHistory : [];
  history.push(event);
  record.pairingHistory = history.slice(-PAIRING_HISTORY_LIMIT);
}

function getRiskLevel(riskFlags) {
  if (!Array.isArray(riskFlags) || riskFlags.length === 0) return 'low';
  if (riskFlags.includes('fingerprint_changed') || riskFlags.includes('install_id_changed'))
    return 'high';
  return 'medium';
}

function touchPairingUsage(extensionId, clientInfo, eventType) {
  const record = persistentPairings.get(extensionId);
  if (!record) return;
  const now = new Date().toISOString();
  record.lastUsedAt = now;
  if (clientInfo.browserName) record.browserName = clientInfo.browserName;
  if (clientInfo.clientLabel) record.clientLabel = clientInfo.clientLabel;
  if (clientInfo.installId) record.installId = clientInfo.installId;
  if (clientInfo.deviceFingerprint) record.deviceFingerprint = clientInfo.deviceFingerprint;
  if (clientInfo.clientKeyId) record.clientKeyId = clientInfo.clientKeyId;
  appendPairingHistory(record, {
    at: now,
    type: eventType,
    detail: clientInfo.clientLabel || clientInfo.browserName || extensionId,
    riskFlags: Array.isArray(record.currentRiskFlags) ? record.currentRiskFlags : [],
  });
  savePersistentPairings();
}

async function approvePairingRequest(
  extensionId,
  browserName = '',
  clientInfo = null,
  riskFlags = []
) {
  const existing = persistentPairings.get(extensionId);
  const detailLines = [
    `Extension ID: ${extensionId}`,
    browserName ? `Browser: ${browserName}` : '',
    clientInfo?.platform ? `Platform: ${clientInfo.platform}` : '',
    clientInfo?.deviceFingerprint ? `Device fingerprint: ${clientInfo.deviceFingerprint}` : '',
    clientInfo?.clientKeyId ? `Client key: ${clientInfo.clientKeyId}` : '',
    persistentPairings.has(extensionId)
      ? 'Bu işlem mevcut eşleşmeyi döndürür ve yeni secret üretir.'
      : 'Bu işlem yeni bir masaüstü-e-klenti eşleşmesi oluşturur.',
  ].filter(Boolean);

  if (Array.isArray(riskFlags) && riskFlags.length > 0) {
    detailLines.push('Risk warnings:');
    for (const flag of riskFlags) {
      if (flag === 'fingerprint_changed')
        detailLines.push('- Device fingerprint changed since last pairing');
      if (flag === 'install_id_changed') detailLines.push('- Installation identifier changed');
      if (flag === 'browser_changed') detailLines.push('- Browser identity changed');
      if (flag === 'client_key_changed') detailLines.push('- Client signing key changed');
      if (flag === 'rapid_repair') detailLines.push('- Pairing is being renewed unusually quickly');
    }
  }

  if (existing?.lastUsedAt) {
    detailLines.push(`Last used: ${existing.lastUsedAt}`);
  }
  if (existing?.lastApprovedAt) {
    detailLines.push(`Last approval: ${existing.lastApprovedAt}`);
  }

  const result = await dialog.showMessageBox(mainWindow || undefined, {
    type: 'question',
    buttons: ['Reddet', 'Onayla'],
    defaultId: 1,
    cancelId: 0,
    noLink: true,
    title: 'Aegis Extension Pairing Request',
    message: 'Tarayıcı eklentisi masaüstü köprüsü için eşleşme istiyor.',
    detail: detailLines.join('\n'),
  });

  return result.response === 1;
}

async function handleNativeBridgeRequest(message) {
  const type = typeof message?.type === 'string' ? message.type : 'UNKNOWN';
  console.log(`[Aegis Native Bridge] Received message type: ${type}`);
  const extensionId = typeof message?.extensionId === 'string' ? message.extensionId.trim() : '';
  const clientInfo = normalizeClientInfo(message?.clientInfo, extensionId);

  if (type === 'GET_UI_LANGUAGE') {
    if (!isAllowlistedExtensionId(extensionId)) {
      return { ok: false, error: 'FORBIDDEN_EXTENSION_ID' };
    }
    const proofResult = verifyNativeBridgeProof(message);
    if (!proofResult.ok && persistentPairings.has(extensionId)) {
      return { ok: false, error: proofResult.error };
    }

    return {
      ok: true,
      language: desktopUiLanguage,
    };
  }

  if (type === 'GET_PAIRING_STATUS') {
    if (!isAllowlistedExtensionId(extensionId)) {
      return { ok: false, error: 'FORBIDDEN_EXTENSION_ID' };
    }
    const proofResult = verifyNativeBridgeProof(message);
    if (!proofResult.ok && persistentPairings.has(extensionId)) {
      return { ok: false, error: proofResult.error };
    }

    const existing = persistentPairings.get(extensionId);
    return {
      ok: true,
      paired: Boolean(existing),
      pairedAt: existing?.pairedAt || null,
      browserName: existing?.browserName || null,
      clientLabel: existing?.clientLabel || null,
      clientKeyId: existing?.clientKeyId || null,
      pairingMode:
        existing?.pairingMode ||
        (existing?.clientPublicJwk ? 'signed-p256-v1' : existing ? 'legacy-secret-v1' : 'none'),
      deviceFingerprint: existing?.deviceFingerprint || null,
      lastUsedAt: existing?.lastUsedAt || null,
      lastApprovedAt: existing?.lastApprovedAt || null,
      riskFlags: Array.isArray(existing?.currentRiskFlags) ? existing.currentRiskFlags : [],
      riskLevel: getRiskLevel(existing?.currentRiskFlags),
      pairingHistory: Array.isArray(existing?.pairingHistory)
        ? existing.pairingHistory.slice(-5).reverse()
        : [],
      secretSource: existing ? 'persistent' : PAIRING_SECRET.length >= 32 ? 'env' : 'none',
    };
  }

  if (type === 'INIT_PAIRING') {
    if (!isAllowlistedExtensionId(extensionId)) {
      return { ok: false, error: 'FORBIDDEN_EXTENSION_ID' };
    }

    // INIT_PAIRING için proof doğrulamasını burada yap (proofResult daha aşağıda tanımlı değil)
    const pairingProofResult = verifyNativeBridgeProof(message);
    if (!pairingProofResult.ok) {
      return { ok: false, error: pairingProofResult.error };
    }

    const browserName =
      clientInfo.browserName ||
      (typeof message?.browserName === 'string' ? message.browserName.trim() : '');
    const existing = persistentPairings.get(extensionId);
    clientInfo.clientKeyId =
      pairingProofResult.clientKeyId || computeClientKeyId(pairingProofResult.clientPublicJwk);
    const riskFlags = buildPairingRiskFlags(existing, clientInfo);
    const approved = await approvePairingRequest(extensionId, browserName, clientInfo, riskFlags);
    if (!approved) {
      return { ok: false, error: 'PAIRING_REJECTED' };
    }

    const generatedSecret = crypto.randomBytes(32).toString('hex');
    const pairedAt = new Date().toISOString();
    const nextRecord = {
      secret: generatedSecret,
      pairedAt,
      browserName,
      deviceFingerprint: clientInfo.deviceFingerprint,
      installId: clientInfo.installId,
      clientLabel: clientInfo.clientLabel,
      clientKeyId: clientInfo.clientKeyId,
      clientPublicJwk: pairingProofResult.clientPublicJwk,
      pairingMode: 'signed-p256-v1',
      lastUsedAt: existing?.lastUsedAt || '',
      lastApprovedAt: pairedAt,
      currentRiskFlags: riskFlags,
      pairingHistory: Array.isArray(existing?.pairingHistory)
        ? existing.pairingHistory.slice(-PAIRING_HISTORY_LIMIT + 1)
        : [],
    };
    appendPairingHistory(nextRecord, {
      at: pairedAt,
      type: existing ? 're-paired' : 'paired',
      detail: clientInfo.clientLabel || browserName || extensionId,
      riskFlags,
    });
    persistentPairings.set(extensionId, nextRecord);
    savePersistentPairings();

    return {
      ok: true,
      paired: true,
      secret: generatedSecret,
      pairedAt,
      browserName,
      riskFlags,
      deviceFingerprint: clientInfo.deviceFingerprint,
      clientKeyId: clientInfo.clientKeyId,
      pairingMode: 'signed-p256-v1',
    };
  }

  if (type === 'CLEAR_PAIRING') {
    const proofResult = verifyNativeBridgeProof(message);
    if (!proofResult.ok) {
      return { ok: false, error: proofResult.error };
    }

    persistentPairings.delete(extensionId);
    savePersistentPairings();
    return { ok: true, cleared: true };
  }

  const proofResult = verifyNativeBridgeProof(message);
  if (!proofResult.ok) {
    console.warn(
      `[Aegis Native Bridge] ❌ Proof verification failed for ${type}: ${proofResult.error}`
    );
    return { ok: false, error: proofResult.error };
  }

  if (type === 'GET_VAULT_STATUS') {
    if (!vaultState.unlocked) {
      await refreshVaultStateFromRenderer().catch(() => undefined);
    }
    touchPairingUsage(extensionId, clientInfo, 'status-check');
    return {
      ok: true,
      isUnlocked: !!vaultState.unlocked,
      entryCount: vaultState.entryCount || 0,
      version: '4.0.0',
    };
  }

  if (type === 'GENERATE_ALIAS') {
    const requestDomain = normalizeDomain(
      typeof message?.domain === 'string' ? message.domain : ''
    );
    if (!requestDomain) {
      return { ok: false, error: 'INVALID_DOMAIN' };
    }
    if (!vaultState.unlocked) {
      const refreshed = await refreshVaultStateFromRenderer().catch(() => ({
        ok: false,
        isUnlocked: false,
        error: 'STATUS_REFRESH_FAILED',
      }));
      if (!refreshed.isUnlocked) {
        return { ok: false, error: refreshed.error || 'VAULT_LOCKED' };
      }
    }

    const result = await requestVaultCliOperationFromRenderer('generate-alias', {
      domain: requestDomain,
      website: `https://${requestDomain}`,
      title:
        typeof message?.title === 'string' && message.title.trim()
          ? message.title.trim()
          : requestDomain,
    });
    touchPairingUsage(extensionId, clientInfo, 'generate-alias');
    return {
      ok: Boolean(result?.ok),
      error: result?.ok ? undefined : String(result?.error || 'ALIAS_GENERATION_FAILED'),
      alias: typeof result?.data?.alias === 'string' ? result.data.alias : '',
      providerLabel:
        typeof result?.data?.providerLabel === 'string' ? result.data.providerLabel : '',
      providerSyncStatus:
        typeof result?.data?.providerSyncStatus === 'string'
          ? result.data.providerSyncStatus
          : 'manual',
      providerManagementUrl:
        typeof result?.data?.providerManagementUrl === 'string'
          ? result.data.providerManagementUrl
          : '',
    };
  }

  if (type === 'GET_DOMAIN_CREDS') {
    const requestDomain = normalizeDomain(
      typeof message?.domain === 'string' ? message.domain : ''
    );
    if (!requestDomain) {
      return { ok: false, error: 'INVALID_DOMAIN', data: [] };
    }

    if (!vaultState.unlocked) {
      return { ok: true, data: [] };
    }

    const matches = await requestDomainCredentialsFromRenderer(requestDomain);
    touchPairingUsage(extensionId, clientInfo, 'domain-credentials');
    return { ok: true, data: matches };
  }

  if (type === 'GET_DOMAIN_PASSKEYS') {
    const requestDomain = normalizeDomain(
      typeof message?.domain === 'string' ? message.domain : ''
    );
    if (!requestDomain) {
      return { ok: false, error: 'INVALID_DOMAIN', data: [] };
    }

    if (!vaultState.unlocked) {
      return { ok: true, data: [] };
    }

    const matches = await requestDomainPasskeysFromRenderer(requestDomain);
    touchPairingUsage(extensionId, clientInfo, 'domain-passkeys');
    return { ok: true, data: matches };
  }

  if (type === 'AUTOSAVE_CREDENTIAL') {
    const requestDomain = normalizeDomain(
      typeof message?.domain === 'string' ? message.domain : ''
    );
    const credential = sanitizeAutosaveCredential(message?.credential);
    if (!requestDomain || !credential) {
      return { ok: false, error: 'INVALID_AUTOSAVE_PAYLOAD' };
    }

    if (!vaultState.unlocked) {
      return { ok: false, error: 'VAULT_LOCKED' };
    }

    const result = await requestAutosaveCredentialFromRenderer(credential, {
      extensionId,
      domain: requestDomain,
      browserName: clientInfo.browserName,
    });
    touchPairingUsage(extensionId, clientInfo, 'autosave-credential');
    return {
      ok: Boolean(result.saved),
      saved: Boolean(result.saved),
      action: typeof result.action === 'string' ? result.action : 'none',
      entryId: Number.isFinite(Number(result.entryId)) ? Number(result.entryId) : undefined,
      error: result.saved ? undefined : result.error || 'AUTOSAVE_REJECTED',
    };
  }

  if (type === 'LIST_VAULT_ENTRIES') {
    if (!vaultState.unlocked) {
      return { ok: false, error: 'VAULT_LOCKED', data: [] };
    }
    const result = await requestVaultCliOperationFromRenderer('list', {
      query: typeof message?.query === 'string' ? message.query : '',
      category: typeof message?.category === 'string' ? message.category : '',
      scope: typeof message?.scope === 'string' ? message.scope : 'active',
      searchScope: typeof message?.searchScope === 'string' ? message.searchScope : 'all',
      limit: Number.isFinite(Number(message?.limit)) ? Number(message.limit) : 50,
    });
    touchPairingUsage(extensionId, clientInfo, 'cli-list');
    return {
      ok: Boolean(result?.ok),
      error: result?.ok ? undefined : String(result?.error || 'CLI_LIST_FAILED'),
      data: Array.isArray(result?.data) ? result.data : [],
    };
  }

  if (type === 'GET_VAULT_ENTRY') {
    if (!vaultState.unlocked) {
      return { ok: false, error: 'VAULT_LOCKED', data: null };
    }
    const entryId = Number.isFinite(Number(message?.entryId)) ? Number(message.entryId) : NaN;
    if (!Number.isFinite(entryId)) {
      return { ok: false, error: 'INVALID_ENTRY_ID', data: null };
    }
    const result = await requestVaultCliOperationFromRenderer('get', { entryId });
    touchPairingUsage(extensionId, clientInfo, 'cli-get');
    return {
      ok: Boolean(result?.ok),
      error: result?.ok ? undefined : String(result?.error || 'CLI_GET_FAILED'),
      data: result?.data || null,
    };
  }

  if (type === 'CREATE_VAULT_ENTRY') {
    if (!vaultState.unlocked) {
      return { ok: false, error: 'VAULT_LOCKED' };
    }
    const entry = sanitizeVaultEntryInput(message?.entry);
    if (!entry?.title || !entry?.pass) {
      return { ok: false, error: 'INVALID_ENTRY_PAYLOAD' };
    }
    const result = await requestVaultCliOperationFromRenderer('create', { entry });
    touchPairingUsage(extensionId, clientInfo, 'cli-create');
    return {
      ok: Boolean(result?.ok),
      error: result?.ok ? undefined : String(result?.error || 'CLI_CREATE_FAILED'),
      data: result?.data || null,
    };
  }

  if (type === 'UPDATE_VAULT_ENTRY') {
    if (!vaultState.unlocked) {
      return { ok: false, error: 'VAULT_LOCKED' };
    }
    const entryId = Number.isFinite(Number(message?.entryId)) ? Number(message.entryId) : NaN;
    const entry = sanitizeVaultEntryInput(message?.entry);
    if (!Number.isFinite(entryId) || !entry) {
      return { ok: false, error: 'INVALID_ENTRY_PAYLOAD' };
    }
    const result = await requestVaultCliOperationFromRenderer('update', { entryId, entry });
    touchPairingUsage(extensionId, clientInfo, 'cli-update');
    return {
      ok: Boolean(result?.ok),
      error: result?.ok ? undefined : String(result?.error || 'CLI_UPDATE_FAILED'),
      data: result?.data || null,
    };
  }

  if (type === 'DELETE_VAULT_ENTRY') {
    if (!vaultState.unlocked) {
      return { ok: false, error: 'VAULT_LOCKED' };
    }
    const entryId = Number.isFinite(Number(message?.entryId)) ? Number(message.entryId) : NaN;
    if (!Number.isFinite(entryId)) {
      return { ok: false, error: 'INVALID_ENTRY_ID' };
    }
    const result = await requestVaultCliOperationFromRenderer('delete', { entryId });
    touchPairingUsage(extensionId, clientInfo, 'cli-delete');
    return {
      ok: Boolean(result?.ok),
      error: result?.ok ? undefined : String(result?.error || 'CLI_DELETE_FAILED'),
      data: result?.data || null,
    };
  }

  if (type === 'RESTORE_VAULT_ENTRY') {
    if (!vaultState.unlocked) {
      return { ok: false, error: 'VAULT_LOCKED' };
    }
    const entryId = Number.isFinite(Number(message?.entryId)) ? Number(message.entryId) : NaN;
    if (!Number.isFinite(entryId)) {
      return { ok: false, error: 'INVALID_ENTRY_ID' };
    }
    const result = await requestVaultCliOperationFromRenderer('restore', { entryId });
    touchPairingUsage(extensionId, clientInfo, 'cli-restore');
    return {
      ok: Boolean(result?.ok),
      error: result?.ok ? undefined : String(result?.error || 'CLI_RESTORE_FAILED'),
      data: result?.data || null,
    };
  }

  if (type === 'EMPTY_VAULT_TRASH') {
    if (!vaultState.unlocked) {
      return { ok: false, error: 'VAULT_LOCKED' };
    }
    const result = await requestVaultCliOperationFromRenderer('empty-trash', {});
    touchPairingUsage(extensionId, clientInfo, 'cli-empty-trash');
    return {
      ok: Boolean(result?.ok),
      error: result?.ok ? undefined : String(result?.error || 'CLI_EMPTY_TRASH_FAILED'),
      data: result?.data || null,
    };
  }

  if (type === 'AUTH_PASSKEY') {
    const options = message?.options;
    if (!options) {
      return { ok: false, error: 'INVALID_OPTIONS' };
    }

    if (!vaultState.unlocked) {
      return { ok: false, error: 'VAULT_LOCKED' };
    }

    try {
      const authResult = await requestPasskeyAuthFromRenderer(options);
      touchPairingUsage(extensionId, clientInfo, 'passkey-auth');
      return { ok: true, authResult };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  return { ok: false, error: 'UNSUPPORTED_MESSAGE_TYPE' };
}

/**
 * 🖥️ Native Host Auto-Registration (Windows only)
 * Her başlatmada manifest ve launcher dosyalarını dinamik olarak oluşturur,
 * böylece farklı kullanıcılarda da otomatik çalışır.
 */
function registerNativeHostWindows() {
  if (process.platform !== 'win32') {
    return;
  }

  try {
    const regCheckPath = path.join(app.getPath('userData'), 'last-native-host-reg.json');
    const currentVersion = app.getVersion();
    const nativeHostDir = path.join(app.getPath('userData'), 'native-host');
    const manifestPath = path.join(nativeHostDir, `com.aegisvault.desktop.json`);

    // Only register if version changed or manifest is missing
    if (fs.existsSync(regCheckPath) && fs.existsSync(manifestPath)) {
      const regInfo = JSON.parse(fs.readFileSync(regCheckPath, 'utf8'));
      if (regInfo.version === currentVersion) {
        console.log('[Aegis Auto-Register] Native host registration skipped (already up to date)');
        return;
      }
    }
    const hostScriptPath = app.isPackaged
      ? path.join(process.resourcesPath, 'native-host', 'aegis-native-host.ps1')
      : path.join(__dirname, 'scripts', 'aegis-native-host.ps1');

    if (!fs.existsSync(hostScriptPath)) {
      console.warn('[Aegis Auto-Register] Native host script not found:', hostScriptPath);
      return;
    }

    fs.mkdirSync(nativeHostDir, { recursive: true });

    const combinedAllowlist = [...new Set([...ALLOWLIST_EXTENSION_IDS, 'aegisvault@example.com'])];
    const allowedExtensionIdsJson = JSON.stringify(combinedAllowlist);
    const allowedExtensionIdsCsv = combinedAllowlist.join(',');

    // 1. Launcher CMD dosyasını dinamik olarak oluştur
    const launcherPath = path.join(nativeHostDir, 'aegis-native-host-launcher.cmd');
    const launcherContent = [
      '@echo off',
      'setlocal',
      `set "AEGIS_EXTENSION_ALLOWLIST=${allowedExtensionIdsCsv}"`,
      `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "${hostScriptPath}" -AllowedExtensionIdsJson "${allowedExtensionIdsJson.replace(/"/g, '\\"')}"`,
      '',
    ].join('\r\n');
    fs.writeFileSync(launcherPath, launcherContent, 'ascii');

    // 2. Chrome/Edge manifest dosyasını dinamik olarak oluştur
    const hostName = 'com.aegisvault.desktop';
    const chromeManifestPath = path.join(nativeHostDir, `${hostName}.json`);
    const chromeManifest = {
      name: hostName,
      description: 'Aegis Vault native messaging bridge',
      path: launcherPath,
      type: 'stdio',
      allowed_origins: ALLOWLIST_EXTENSION_IDS.map((id) => `chrome-extension://${id}/`),
    };
    fs.writeFileSync(chromeManifestPath, JSON.stringify(chromeManifest, null, 2), 'utf8');

    // 3. Firefox manifest dosyasını dinamik olarak oluştur
    const firefoxManifestPath = path.join(nativeHostDir, `${hostName}.firefox.json`);
    const firefoxManifest = {
      name: hostName,
      description: 'Aegis Vault native messaging bridge',
      path: launcherPath,
      type: 'stdio',
      allowed_extensions: ['aegisvault@example.com'],
    };
    fs.writeFileSync(firefoxManifestPath, JSON.stringify(firefoxManifest, null, 2), 'utf8');

    const escapedManifestPath = chromeManifestPath.replace(/"/g, '\\"');
    const escapedFirefoxPath = firefoxManifestPath.replace(/"/g, '\\"');

    // 4. Registry'ye kaydet (Chrome, Edge, Firefox)
    const psCommand = `
      $HostName = "${hostName}"
      $ManifestPath = "${escapedManifestPath}"
      $FirefoxManifestPath = "${escapedFirefoxPath}"
      
      # Chrome
      $chromeKey = "HKCU:\\Software\\Google\\Chrome\\NativeMessagingHosts\\$HostName"
      New-Item -Path $chromeKey -Force -ErrorAction SilentlyContinue | Out-Null
      New-ItemProperty -Path $chromeKey -Name "(default)" -Value $ManifestPath -Force -ErrorAction SilentlyContinue | Out-Null
      
      # Edge
      $edgeKey = "HKCU:\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\$HostName"
      New-Item -Path $edgeKey -Force -ErrorAction SilentlyContinue | Out-Null
      New-ItemProperty -Path $edgeKey -Name "(default)" -Value $ManifestPath -Force -ErrorAction SilentlyContinue | Out-Null
      
      # Firefox
      $firefoxKey = "HKCU:\\Software\\Mozilla\\NativeMessagingHosts\\$HostName"
      New-Item -Path $firefoxKey -Force -ErrorAction SilentlyContinue | Out-Null
      New-ItemProperty -Path $firefoxKey -Name "(default)" -Value $FirefoxManifestPath -Force -ErrorAction SilentlyContinue | Out-Null
      
      Write-Output "Native host registered"
    `;

    try {
      execSync(`powershell.exe -NoProfile -Command "${psCommand.replace(/"/g, '\\"')}"`, {
        timeout: 10000,
        stdio: 'pipe',
      });
      console.log('[Aegis Auto-Register] Native host registry entries updated');
      fs.writeFileSync(
        regCheckPath,
        JSON.stringify({ version: currentVersion, registeredAt: new Date().toISOString() }),
        'utf8'
      );
      console.log(`[Aegis Auto-Register] Native host launcher: ${launcherPath}`);
    } catch (execErr) {
      console.warn(
        '[Aegis Auto-Register] PowerShell execution warning:',
        execErr.message.substring(0, 100)
      );
    }
  } catch (err) {
    console.warn('[Aegis Auto-Register] Native host registration error:', err.message);
  }
}

/**
 * 🔐 Native Host Pairing Secret Initialization
 * Pairing secret oluşturulmadıysa, otomatik olarak güvenli şekilde oluştur
 */
function ensureNativeHostPairingSecret() {
  const secretPath = path.join(app.getPath('userData'), 'native-host-pairing-secret.json');

  console.log(`[Aegis Pairing] Secret file path: ${secretPath}`);

  try {
    // Eğer secret zaten mevcutsa, kullan
    if (fs.existsSync(secretPath)) {
      const data = JSON.parse(fs.readFileSync(secretPath, 'utf8'));
      if (data.secret && data.secret.length >= 32) {
        process.env.AEGIS_NATIVE_HOST_PAIRING_SECRET = data.secret;
        console.log('[Aegis Pairing] ✅ Existing pairing secret loaded and set to environment');
        return;
      }
    }

    // Yeni secret oluştur: 64 karakter hex string (256-bit entropy)
    const secret = crypto.randomBytes(32).toString('hex');
    console.log(`[Aegis Pairing] Generated new secret: ${secret.substring(0, 16)}...`);

    const secretData = {
      secret,
      createdAt: new Date().toISOString(),
      version: '1.0',
    };

    fs.writeFileSync(secretPath, JSON.stringify(secretData, null, 2), 'utf8');
    fs.chmodSync(secretPath, 0o600); // Sadece owner okuyabilir

    process.env.AEGIS_NATIVE_HOST_PAIRING_SECRET = secret;
    console.log('[Aegis Pairing] ✅ New pairing secret generated and stored');
  } catch (err) {
    console.error('[Aegis Pairing] ❌ Failed to initialize pairing secret:', err.message);
    console.error('[Aegis Pairing] Error details:', err);

    // Fallback: Bellekte geçici secret oluştur
    const tempSecret = crypto.randomBytes(32).toString('hex');
    process.env.AEGIS_NATIVE_HOST_PAIRING_SECRET = tempSecret;
    console.log('[Aegis Pairing] ⚠️  Generated fallback in-memory secret for this session');
  }
}

function startNativeBridgeServer() {
  cleanupNativeBridgeSocketFile();
  loadDesktopBridgeIdentity();
  const socketPath = getNativeBridgeSocketPath();

  nativeBridgeServer = net.createServer((socket) => {
    socket.setEncoding('utf8');
    let buffer = '';

    socket.on('data', (chunk) => {
      buffer += chunk;

      const newlineIndex = buffer.indexOf('\n');
      if (newlineIndex === -1) {
        return;
      }

      const rawMessage = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);

      void (async () => {
        let response = { ok: false, error: 'INVALID_NATIVE_BRIDGE_MESSAGE' };
        let parsedMessage = {};

        try {
          parsedMessage = JSON.parse(rawMessage || '{}');
          response = await handleNativeBridgeRequest(parsedMessage);
        } catch {}

        try {
          response.desktopAuth = signDesktopBridgeResponse(
            response,
            parsedMessage,
            parsedMessage?.type === 'INIT_PAIRING' || parsedMessage?.type === 'GET_PAIRING_STATUS'
          );
        } catch {}

        try {
          socket.end(`${JSON.stringify(response)}\n`);
        } catch {
          socket.destroy();
        }
      })();
    });

    socket.on('error', () => {
      socket.destroy();
    });
  });

  nativeBridgeServer.on('error', (error) => {
    console.error('[Aegis Native Bridge] Failed to start:', error.message);
  });

  nativeBridgeServer.listen(socketPath, () => {
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(socketPath, 0o600);
      } catch {}
    }
    console.log(`[Aegis Native Bridge] Ready on ${socketPath}`);
  });
}

function stopNativeBridgeServer() {
  if (nativeBridgeServer) {
    try {
      nativeBridgeServer.close();
    } catch {}
    nativeBridgeServer = null;
  }
  cleanupNativeBridgeSocketFile();
}

function createChallenge(extensionId) {
  const nonce = crypto.randomBytes(16).toString('hex');
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  challengeStore.set(nonce, { token, extensionId, expiresAt });
  return { nonce, token, expiresAt };
}

function isLoopbackSyncReady() {
  return LOOPBACK_SYNC_ENABLED && PAIRING_SECRET.length >= 32;
}

function buildPairingPayload(method, path, ts, extensionId) {
  return `${method}:${path}:${ts}:${extensionId}`;
}

function buildNativeBridgePayload(message) {
  const clientInfo = normalizeClientInfo(
    message?.clientInfo,
    typeof message?.extensionId === 'string' ? message.extensionId.trim() : ''
  );
  const clientPublicJwk = normalizeClientPublicJwk(message?.clientPublicJwk);
  const credential =
    message?.credential && typeof message.credential === 'object'
      ? {
          title: typeof message.credential.title === 'string' ? message.credential.title : '',
          username:
            typeof message.credential.username === 'string' ? message.credential.username : '',
          pass: typeof message.credential.pass === 'string' ? message.credential.pass : '',
          website: typeof message.credential.website === 'string' ? message.credential.website : '',
          submittedAt:
            typeof message.credential.submittedAt === 'string'
              ? message.credential.submittedAt
              : '',
          source:
            typeof message.credential.source === 'string'
              ? message.credential.source
              : 'browser_form',
        }
      : null;
  // ⚠️ Bu payload, Chrome eklentisinin buildSignedNativeBridgePayload fonksiyonu ile
  // BİREBİR aynı field yapısına sahip olmalıdır. Eklenti sadece aşağıdaki 10 alanı
  // imzalar. Ekstra alanlar (entry, entryId, query vs.) imza uyumsuzluğuna yol açar.
  return JSON.stringify({
    type: typeof message?.type === 'string' ? message.type : '',
    extensionId: typeof message?.extensionId === 'string' ? message.extensionId.trim() : '',
    domain: normalizeDomain(typeof message?.domain === 'string' ? message.domain : ''),
    requestNonce: typeof message?.requestNonce === 'string' ? message.requestNonce.trim() : '',
    clientKeyId: typeof message?.clientKeyId === 'string' ? message.clientKeyId.trim() : '',
    clientTimestamp:
      typeof message?.clientTimestamp === 'string' ? message.clientTimestamp.trim() : '',
    clientNonce: typeof message?.clientNonce === 'string' ? message.clientNonce.trim() : '',
    clientInfo: {
      browserName: clientInfo.browserName,
      browserVersion: clientInfo.browserVersion,
      platform: clientInfo.platform,
      locale: clientInfo.locale,
      installId: clientInfo.installId,
      extensionVersion: clientInfo.extensionVersion,
      userAgent: clientInfo.userAgent,
    },
    clientPublicJwk,
    credential,
  });
}

function buildDesktopBridgeResponsePayload(response, requestMessage, timestamp) {
  const payload = JSON.stringify({
    type: typeof requestMessage?.type === 'string' ? requestMessage.type : '',
    extensionId:
      typeof requestMessage?.extensionId === 'string' ? requestMessage.extensionId.trim() : '',
    requestNonce:
      typeof requestMessage?.requestNonce === 'string' ? requestMessage.requestNonce.trim() : '',
    clientNonce:
      typeof requestMessage?.clientNonce === 'string' ? requestMessage.clientNonce.trim() : '',
    timestamp,
    response,
  });

  if (process.env.NODE_ENV === 'development') {
    console.debug(`[Aegis Native Bridge] Signing payload: ${payload.substring(0, 100)}...`);
  }
  return payload;
}

function signDesktopBridgeResponse(response, requestMessage, includePublicJwk = false) {
  const identity = desktopBridgeIdentity || loadDesktopBridgeIdentity();
  const timestamp = Date.now().toString();
  const signer = crypto.createSign('SHA256');
  signer.update(buildDesktopBridgeResponsePayload(response, requestMessage, timestamp));
  signer.end();
  const privateKey = crypto.createPrivateKey({ key: identity.privateJwk, format: 'jwk' });
  const signature = signer.sign(privateKey).toString('hex');
  return {
    keyId: identity.keyId,
    timestamp,
    requestNonce:
      typeof requestMessage?.requestNonce === 'string' ? requestMessage.requestNonce.trim() : '',
    clientNonce:
      typeof requestMessage?.clientNonce === 'string' ? requestMessage.clientNonce.trim() : '',
    signature,
    ...(includePublicJwk ? { publicJwk: identity.publicJwk } : {}),
  };
}

function verifyNativeBridgeProof(message) {
  const extensionId = typeof message?.extensionId === 'string' ? message.extensionId.trim() : '';
  if (!isAllowlistedExtensionId(extensionId)) {
    return { ok: false, error: 'FORBIDDEN_EXTENSION_ID' };
  }

  const type = typeof message?.type === 'string' ? message.type : '';
  const existing = persistentPairings.get(extensionId);
  const clientTimestamp =
    typeof message?.clientTimestamp === 'string' ? message.clientTimestamp.trim() : '';
  const clientNonce = typeof message?.clientNonce === 'string' ? message.clientNonce.trim() : '';
  const clientSignature =
    typeof message?.clientSignature === 'string' ? message.clientSignature.trim() : '';
  const clientKeyId = typeof message?.clientKeyId === 'string' ? message.clientKeyId.trim() : '';
  const providedClientPublicJwk = normalizeClientPublicJwk(message?.clientPublicJwk);

  const verifySignedProof = (publicJwk, expectedKeyId = '') => {
    const timestampValue = Number(clientTimestamp);
    if (!Number.isFinite(timestampValue)) {
      return { ok: false, error: 'INVALID_NATIVE_BRIDGE_TIMESTAMP' };
    }
    if (Math.abs(Date.now() - timestampValue) > NATIVE_BRIDGE_MESSAGE_TTL_MS) {
      return { ok: false, error: 'NATIVE_BRIDGE_TIMESTAMP_EXPIRED' };
    }
    if (!clientNonce || clientNonce.length < 16) {
      return { ok: false, error: 'MISSING_NATIVE_BRIDGE_NONCE' };
    }
    if (!rememberNativeBridgeNonce(extensionId, clientNonce, Date.now())) {
      return { ok: false, error: 'NATIVE_BRIDGE_NONCE_REPLAYED' };
    }
    if (!clientSignature) {
      return { ok: false, error: 'MISSING_NATIVE_BRIDGE_SIGNATURE' };
    }
    const normalizedPublicJwk = normalizeClientPublicJwk(publicJwk);
    if (!normalizedPublicJwk) {
      return { ok: false, error: 'INVALID_CLIENT_PUBLIC_KEY' };
    }
    const derivedKeyId = computeClientKeyId(normalizedPublicJwk);
    if (
      !clientKeyId ||
      (expectedKeyId && clientKeyId !== expectedKeyId) ||
      clientKeyId !== derivedKeyId
    ) {
      return { ok: false, error: 'CLIENT_KEY_ID_MISMATCH' };
    }
    try {
      const verificationPayload = buildNativeBridgePayload(message);
      console.log(
        '[Aegis Native Bridge] 🔍 VERIFY PAYLOAD:',
        verificationPayload.substring(0, 500)
      );
      console.log(
        '[Aegis Native Bridge] 🔍 CLIENT SIGNATURE HEX:',
        clientSignature.substring(0, 40) + '...'
      );
      console.log('[Aegis Native Bridge] 🔍 PUBLIC JWK:', JSON.stringify(normalizedPublicJwk));
      const verifier = crypto.createVerify('SHA256');
      verifier.update(verificationPayload);
      verifier.end();
      const publicKey = crypto.createPublicKey({ key: normalizedPublicJwk, format: 'jwk' });
      const signatureBuffer = Buffer.from(clientSignature, 'hex');
      const ok = verifier.verify(publicKey, signatureBuffer);
      if (!ok) {
        console.error(
          '[Aegis Native Bridge] ❌ Signature verification FAILED! Payload length:',
          verificationPayload.length
        );
        try {
          const fs = require('fs');
          const path = require('path');
          const logPath = path.resolve(require('os').homedir(), 'aegis-debug.log');
          fs.appendFileSync(
            logPath,
            '\n--- SIG FAIL ---\nMSG: ' +
              JSON.stringify(message) +
              '\nPAYLOAD: ' +
              verificationPayload +
              '\n'
          );
        } catch (e) {}
        return { ok: false, error: 'INVALID_NATIVE_BRIDGE_SIGNATURE' };
      }
      return {
        ok: true,
        mode: 'signed-p256-v1',
        clientKeyId: derivedKeyId,
        clientPublicJwk: normalizedPublicJwk,
      };
    } catch (verifyErr) {
      console.error('[Aegis Native Bridge] ❌ Signature verification THREW:', verifyErr?.message);
      return { ok: false, error: 'INVALID_NATIVE_BRIDGE_SIGNATURE' };
    }
  };

  if (type === 'INIT_PAIRING') {
    if (!providedClientPublicJwk) {
      return { ok: false, error: 'CLIENT_PUBLIC_KEY_REQUIRED' };
    }
    return verifySignedProof(providedClientPublicJwk);
  }

  if (existing?.clientPublicJwk && existing?.clientKeyId) {
    return verifySignedProof(existing.clientPublicJwk, existing.clientKeyId);
  }

  if ((type === 'GET_PAIRING_STATUS' || type === 'GET_UI_LANGUAGE') && !existing) {
    return { ok: true, mode: 'unpaired-status' };
  }

  const pairingSecret = getPairingSecretForExtension(extensionId);
  if (pairingSecret.length < 32) {
    return { ok: false, error: 'NATIVE_BRIDGE_SECRET_MISSING' };
  }

  const proof = typeof message?.proof === 'string' ? message.proof.trim() : '';
  if (!proof) {
    return { ok: false, error: 'MISSING_NATIVE_BRIDGE_PROOF' };
  }

  const expected = crypto
    .createHmac('sha256', Buffer.from(pairingSecret, 'utf8'))
    .update(buildNativeBridgePayload(message))
    .digest('hex');

  if (!safeCompareHex(proof, expected)) {
    return { ok: false, error: 'INVALID_NATIVE_BRIDGE_PROOF' };
  }

  return { ok: true, mode: 'legacy-secret-v1' };
}

function buildChallengePayload(method, path, nonce, ts, extensionId, requestDomain = '') {
  return `${method}:${path}:${nonce}:${ts}:${extensionId}:${normalizeDomain(requestDomain)}`;
}

function verifyPairingProof(req) {
  const extensionId = req.headers['x-aegis-extension-id'] || '';
  const pairingSecret = getPairingSecretForExtension(extensionId);
  if (!LOOPBACK_SYNC_ENABLED || pairingSecret.length < 32) {
    return { ok: false, code: 'LOOPBACK_SYNC_DISABLED' };
  }

  const proof = req.headers['x-aegis-pairing-proof'] || '';
  const tsRaw = req.headers['x-aegis-pairing-ts'] || '';

  if (!isAllowlistedExtensionId(extensionId)) {
    return { ok: false, code: 'FORBIDDEN_EXTENSION_ID' };
  }

  if (!proof || !tsRaw) {
    return { ok: false, code: 'MISSING_PAIRING_HEADERS' };
  }

  const ts = Number(tsRaw);
  if (!Number.isFinite(ts)) {
    return { ok: false, code: 'INVALID_PAIRING_TS' };
  }

  const now = Date.now();
  if (Math.abs(now - ts) > PAIRING_TTL_MS) {
    return { ok: false, code: 'PAIRING_TS_EXPIRED' };
  }

  const path = parseRequestPath(req);
  const payload = buildPairingPayload(req.method, path, ts, extensionId);
  const expected = crypto
    .createHmac('sha256', Buffer.from(pairingSecret, 'utf8'))
    .update(payload)
    .digest('hex');

  if (!safeCompareHex(proof, expected)) {
    return { ok: false, code: 'INVALID_PAIRING_PROOF' };
  }

  return { ok: true };
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
  const requestDomain = req.headers['x-aegis-request-domain'] || '';

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
  const payload = buildChallengePayload(req.method, path, nonce, ts, extensionId, requestDomain);
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

const syncServer = http.createServer(async (req, res) => {
  try {
    console.log(`[Aegis API] Incoming request: ${req.method} ${req.url}`);
    cleanupExpiredChallenges();

    const origin = req.headers.origin || '';
    const requestPath = parseRequestPath(req);
    const aegisClientHdr = req.headers['x-aegis-client'] || '';
    const isExtensionRequest = aegisClientHdr === 'extension';
    const extensionIdHeader = req.headers['x-aegis-extension-id'] || '';

    // ─────────────────────────────────────────────────────────────
    // 🔒 CORS & Private Network Access
    // Chrome Extension Service Worker'dan gelen fetch isteklerinde
    // 'origin' header'ı tarayıcı tarafından EKLENMEYEBİLİR.
    // Bu nedenle:
    //  - origin varsa → allowlist kontrolü yap
    //  - origin yoksa + X-Aegis-Client: extension varsa → loopback güvenli, kabul et
    // ─────────────────────────────────────────────────────────────
    if (isExtensionRequest && !origin && isAllowlistedExtensionId(extensionIdHeader)) {
      // Origin header eksikse bile allowlist'teki extension id'ye sabit origin döndür.
      res.setHeader('Access-Control-Allow-Origin', `chrome-extension://${extensionIdHeader}`);
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
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, X-Aegis-Token, X-Aegis-Client, X-Aegis-Extension-Id, X-Aegis-Pairing-Proof, X-Aegis-Pairing-Ts, X-Aegis-Request-Domain, X-Aegis-Challenge-Nonce, X-Aegis-Challenge-Ts, X-Aegis-Challenge-Signature'
    );
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); // ⚡ KESİNLİKLE CACHE YAKALAMA

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
    if (isExtensionRequest && !isAllowlistedExtensionId(extensionIdHeader)) {
      console.warn(`[Aegis API] ❌ Extension ID not in allowlist: "${extensionIdHeader}"`);
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'FORBIDDEN_EXTENSION_ID' }));
      return;
    }

    if (
      isExtensionRequest &&
      requestPath !== '/api/pairing-secret' &&
      requestPath !== '/api/status'
    ) {
      const pairingResult = verifyPairingProof(req);
      if (!pairingResult.ok) {
        console.warn(`[Aegis API] ❌ Pairing proof rejected: ${pairingResult.code}`);
        const status = pairingResult.code === 'LOOPBACK_SYNC_DISABLED' ? 503 : 401;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: pairingResult.code }));
        return;
      }
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
        console.warn(
          `[Aegis API] ❌ /api/challenge blocked: CHALLENGE_EXTENSION_ONLY (Headers: ${JSON.stringify(req.headers)})`
        );
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'CHALLENGE_EXTENSION_ONLY' }));
        return;
      }

      const challenge = createChallenge(extensionIdHeader);
      console.log(
        `[Aegis API] ✅ /api/challenge successful for ${extensionIdHeader.substring(0, 8)}...`
      );
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          nonce: challenge.nonce,
          token: challenge.token,
          expiresAt: challenge.expiresAt,
        })
      );
      return;
    }

    // Extension isteklerinde challenge doğrulaması zorunlu.
    // AMA /api/pairing-secret endpoint'i için challenge zorunlu değil (henüz paired değil)
    if (isExtensionRequest && requestPath !== '/api/pairing-secret') {
      const challengeResult = verifyExtensionChallenge(req);
      if (!challengeResult.ok) {
        console.warn(`[Aegis API] ❌ Challenge rejected: ${challengeResult.code}`);
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: challengeResult.code }));
        return;
      }
    }

    if (requestPath === '/api/status' && req.method === 'GET') {
      // Status endpoint — Kasa durumu
      res.writeHead(200, { 'Content-Type': 'application/json' });
      const responseData = {
        isUnlocked: vaultState.unlocked,
        entryCount: vaultState.entryCount,
        version: '4.0.0',
      };
      console.log(
        `[Aegis API] /api/status requested. Returning unlocked: ${responseData.isUnlocked}, entryCount: ${responseData.entryCount}`
      );
      res.end(JSON.stringify(responseData));
      return;
    }

    if (requestPath === '/api/vault' && req.method === 'GET') {
      res.writeHead(410, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'FULL_VAULT_SYNC_DISABLED' }));
      return;
    }

    if (requestPath === '/api/pairing-secret' && req.method === 'GET') {
      // 🔐 Pairing secret endpoint — Loopback Fallback Eşleşme
      const requestUrl = parseRequestUrl(req);
      const extensionId = requestUrl?.searchParams.get('extensionId') || '';

      console.log(
        `[Aegis API] /api/pairing-secret request from extensionId: ${extensionId.substring(0, 8) || 'EMPTY'}...`
      );

      // Extension ID doğrulama
      if (!isValidExtensionIdFormat(extensionId)) {
        console.warn(`[Aegis API] ❌ Invalid extension ID format: "${extensionId}"`);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'INVALID_EXTENSION_ID' }));
        return;
      }

      // Allowlist kontrol
      if (!isAllowlistedExtensionId(extensionId)) {
        console.warn(`[Aegis API] ❌ Extension ID not in allowlist: ${extensionId}`);
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'FORBIDDEN_EXTENSION_ID' }));
        return;
      }

      // ── KRITIK: Her iki tarafın da aynı secret'ı kullanması zorunlu ──
      // Extension bu secret'ı alır → HMAC challenge proof üretmek için kullanır.
      // Desktop, getPairingSecretForExtension() ile doğrulama yapar.
      // Dolayısıyla burada dönen secret, doğrulamada kullanılan secret ile AYNI olmalı.
      // Loopback-fallback modunda bu secret = PAIRING_SECRET (env'den).
      const sharedSecret =
        PAIRING_SECRET ||
        (process.env.AEGIS_NATIVE_HOST_PAIRING_SECRET || '').trim() ||
        (process.env.AEGIS_EXTENSION_PAIRING_SECRET || '').trim();

      if (sharedSecret.length < 32) {
        console.error(`[Aegis API] ❌ No valid env pairing secret configured.`);
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'PAIRING_SECRET_UNAVAILABLE' }));
        return;
      }

      // ── Mevcut loopback eşleşmesi varsa dialog gösterme, sadece secret döndür ──
      const existing = persistentPairings.get(extensionId);
      if (existing && existing.pairingMode === 'loopback-fallback-v1') {
        // Kaydı env secret ile güncelle (eski random secret olabilir)
        existing.secret = sharedSecret;
        savePersistentPairings();
        console.log(
          `[Aegis API] ✅ Existing loopback pairing refreshed for ${extensionId.substring(0, 8)}...`
        );
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ secret: sharedSecret }));
        return;
      }

      // ── İlk eşleşme: Kullanıcıdan onay al ──
      const loopbackClientInfo = normalizeClientInfo({}, extensionId);
      const riskFlags = buildPairingRiskFlags(existing, loopbackClientInfo);

      let approved = false;
      try {
        const detailLines = [
          `Extension ID: ${extensionId}`,
          'Bağlantı türü: Loopback HTTP Fallback',
          existing
            ? 'Bu işlem mevcut eşleşmeyi yenileyecek.'
            : 'Bu işlem yeni bir masaüstü-eklenti eşleşmesi oluşturacaktır.',
        ];
        if (Array.isArray(riskFlags) && riskFlags.length > 0) {
          detailLines.push('Risk uyarıları:');
          for (const flag of riskFlags) {
            if (flag === 'fingerprint_changed') detailLines.push('- Cihaz parmak izi değişti');
            if (flag === 'install_id_changed') detailLines.push('- Kurulum kimliği değişti');
            if (flag === 'rapid_repair')
              detailLines.push('- Eşleşme alışılmadık hızda yenileniyor');
          }
        }
        const result = await dialog.showMessageBox(mainWindow || undefined, {
          type: 'question',
          buttons: ['Reddet', 'Onayla'],
          defaultId: 1,
          cancelId: 0,
          noLink: true,
          title: 'Aegis Extension Eşleşme İsteği',
          message: 'Tarayıcı eklentisi masaüstü kasanıza bağlanmak istiyor.',
          detail: detailLines.join('\n'),
        });
        approved = result.response === 1;
      } catch (dialogErr) {
        console.error('[Aegis API] Dialog error:', dialogErr.message);
        approved = false;
      }

      if (!approved) {
        console.warn(
          `[Aegis API] ❌ Pairing rejected by user for ${extensionId.substring(0, 8)}...`
        );
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'PAIRING_REJECTED' }));
        return;
      }

      // ── Eşleşme kaydını env secret ile oluştur ──
      const pairedAt = new Date().toISOString();
      const nextRecord = {
        secret: sharedSecret, // ← env secret, extension ile aynı
        pairedAt,
        browserName: 'Loopback Fallback',
        deviceFingerprint: loopbackClientInfo.deviceFingerprint,
        installId: loopbackClientInfo.installId,
        clientLabel: 'Loopback Extension',
        clientKeyId: '',
        clientPublicJwk: null,
        pairingMode: 'loopback-fallback-v1',
        lastUsedAt: '',
        lastApprovedAt: pairedAt,
        currentRiskFlags: riskFlags,
        pairingHistory: Array.isArray(existing?.pairingHistory)
          ? existing.pairingHistory.slice(-PAIRING_HISTORY_LIMIT + 1)
          : [],
      };
      appendPairingHistory(nextRecord, {
        at: pairedAt,
        type: existing ? 're-paired' : 'paired',
        detail: `Loopback Fallback (${extensionId.substring(0, 8)}...)`,
        riskFlags,
      });
      persistentPairings.set(extensionId, nextRecord);
      savePersistentPairings();

      console.log(
        `[Aegis API] ✅ Pairing registered & secret sent for ${extensionId.substring(0, 8)}... (persistentPairings size: ${persistentPairings.size})`
      );
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ secret: sharedSecret }));
      return;
    }

    if (requestPath === '/api/domain-credentials' && req.method === 'GET') {
      const requestUrl = parseRequestUrl(req);
      const requestDomain = normalizeDomain(
        req.headers['x-aegis-request-domain'] || '' || requestUrl?.searchParams.get('domain') || ''
      );

      if (!requestDomain) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'INVALID_DOMAIN' }));
        return;
      }

      if (!vaultState.unlocked) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }

      const matches = await requestDomainCredentialsFromRenderer(requestDomain);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(matches));
      return;
    }

    if (requestPath === '/api/domain-passkeys' && req.method === 'GET') {
      const requestUrl = parseRequestUrl(req);
      const requestDomain = normalizeDomain(
        req.headers['x-aegis-request-domain'] || '' || requestUrl?.searchParams.get('domain') || ''
      );

      if (!requestDomain) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'INVALID_DOMAIN' }));
        return;
      }

      if (!vaultState.unlocked) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }

      const matches = await requestDomainPasskeysFromRenderer(requestDomain);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(matches));
      return;
    }

    res.writeHead(404);
    res.end();
  } catch (err) {
    console.error(`[Aegis API] 💥 Unhandled Server Error: ${err.message}`, err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'INTERNAL_SERVER_ERROR' }));
  }
});

if (LOOPBACK_SYNC_ENABLED) {
  // Sadece loopback'e bağlan (dış ağ erişimini engelle)
  syncServer.listen(23456, '127.0.0.1', () => {
    if (!isLoopbackSyncReady()) {
      console.warn(
        '[Aegis] Loopback sync explicitly enabled but not ready. Configure a strong AEGIS_EXTENSION_PAIRING_SECRET.'
      );
    } else {
      console.log('[Aegis] Güvenli yerel sync server: 127.0.0.1:23456');
    }
  });
} else {
  console.log('[Aegis] Loopback sync disabled by default. Native host is the preferred bridge.');
}

// ─────────────────────────────────────────────────────────────────
// 📨 IPC Event Handlers (Renderer ↔ Main)
// ─────────────────────────────────────────────────────────────────
ipcMain.on('sync-vault-state', (event, state) => {
  // 1. Sender validation
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    console.warn('[IPC] Unauthorized IPC sender for sync-vault-state');
    return;
  }

  vaultState.unlocked = Boolean(state && state.unlocked);
  vaultState.entryCount = Number.isFinite(Number(state?.entryCount))
    ? Math.max(0, Number(state.entryCount))
    : 0;

  console.log(
    `[Aegis] 🔓 Vault state updated: ${vaultState.unlocked ? 'UNLOCKED' : 'LOCKED'} (${vaultState.entryCount} entries)`
  );
});

ipcMain.on('lock-vault', (event) => {
  // 1. Sender validation
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    console.warn('[IPC] Unauthorized IPC sender for lock-vault');
    return;
  }

  vaultState.unlocked = false;
  vaultState.entryCount = 0;
});

ipcMain.on('aegis-domain-credentials-response', (event, payload) => {
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    console.warn('[IPC] Unauthorized IPC sender for aegis-domain-credentials-response');
    return;
  }

  const requestId = typeof payload?.requestId === 'string' ? payload.requestId : '';
  if (!requestId) return;

  const pending = pendingDomainCredentialRequests.get(requestId);
  if (!pending) return;

  pendingDomainCredentialRequests.delete(requestId);
  pending.resolve(payload?.data);
});

ipcMain.on('aegis-domain-passkeys-response', (event, payload) => {
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    console.warn('[IPC] Unauthorized IPC sender for aegis-domain-passkeys-response');
    return;
  }

  const requestId = typeof payload?.requestId === 'string' ? payload.requestId : '';
  if (!requestId) return;

  const pending = pendingDomainPasskeyRequests.get(requestId);
  if (!pending) return;

  pendingDomainPasskeyRequests.delete(requestId);
  pending.resolve(payload?.data);
});

ipcMain.on('aegis-auth-passkey-response', (event, payload) => {
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    console.warn('[IPC] Unauthorized IPC sender for aegis-auth-passkey-response');
    return;
  }

  const requestId = typeof payload?.requestId === 'string' ? payload.requestId : '';
  if (!requestId) return;

  const pending = pendingPasskeyAuthRequests.get(requestId);
  if (!pending) return;

  pendingPasskeyAuthRequests.delete(requestId);
  if (payload?.error) {
    pending.reject(new Error(payload.error));
  } else {
    pending.resolve(payload?.data);
  }
});

ipcMain.on('aegis-autosave-credential-response', (event, payload) => {
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    console.warn('[IPC] Unauthorized IPC sender for aegis-autosave-credential-response');
    return;
  }

  const requestId = typeof payload?.requestId === 'string' ? payload.requestId : '';
  if (!requestId) return;

  const pending = pendingAutosaveCredentialRequests.get(requestId);
  if (!pending) return;

  pendingAutosaveCredentialRequests.delete(requestId);
  pending.resolve(payload?.data || { saved: false, error: 'EMPTY_RESPONSE' });
});

ipcMain.on('aegis-vault-cli-response', (event, payload) => {
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    console.warn('[IPC] Unauthorized IPC sender for aegis-vault-cli-response');
    return;
  }

  const requestId = typeof payload?.requestId === 'string' ? payload.requestId : '';
  if (!requestId) return;

  const pending = pendingVaultCliRequests.get(requestId);
  if (!pending) return;

  pendingVaultCliRequests.delete(requestId);
  pending.resolve(payload?.data || { ok: false, error: 'EMPTY_RESPONSE' });
});

ipcMain.handle('list-extension-pairings', (event) => {
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    console.warn('[IPC] Unauthorized IPC sender for list-extension-pairings');
    return [];
  }

  return Array.from(persistentPairings.entries())
    .map(([extensionId, record]) => ({
      extensionId,
      browserName: record.browserName || '',
      clientLabel: record.clientLabel || '',
      clientKeyId: record.clientKeyId || '',
      pairingMode:
        record.pairingMode || (record.clientPublicJwk ? 'signed-p256-v1' : 'legacy-secret-v1'),
      deviceFingerprint: record.deviceFingerprint || '',
      pairedAt: record.pairedAt || '',
      lastUsedAt: record.lastUsedAt || '',
      lastApprovedAt: record.lastApprovedAt || '',
      riskFlags: Array.isArray(record.currentRiskFlags) ? record.currentRiskFlags : [],
      riskLevel: getRiskLevel(record.currentRiskFlags),
      pairingHistory: Array.isArray(record.pairingHistory)
        ? record.pairingHistory.slice(-5).reverse()
        : [],
      secretSource: 'persistent',
    }))
    .sort(
      (left, right) =>
        Date.parse(right.lastUsedAt || right.pairedAt || '') -
        Date.parse(left.lastUsedAt || left.pairedAt || '')
    );
});

ipcMain.handle('remove-extension-pairing', (event, extensionId) => {
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    console.warn('[IPC] Unauthorized IPC sender for remove-extension-pairing');
    return { success: false, error: 'UNAUTHORIZED' };
  }

  const normalizedExtensionId = typeof extensionId === 'string' ? extensionId.trim() : '';
  if (!normalizedExtensionId || !persistentPairings.has(normalizedExtensionId)) {
    return { success: false, error: 'PAIRING_NOT_FOUND' };
  }

  persistentPairings.delete(normalizedExtensionId);
  savePersistentPairings();
  return { success: true };
});

ipcMain.handle('set-ui-language', (event, language) => {
  if (event.sender !== mainWindow?.webContents) {
    console.warn('[IPC] Unauthorized IPC sender for set-ui-language');
    return { success: false, error: 'UNAUTHORIZED_SENDER' };
  }

  desktopUiLanguage = normalizeUiLanguage(language);
  saveUiPreferences();
  return { success: true, language: desktopUiLanguage };
});

ipcMain.handle('get-ui-language', (event) => {
  if (event.sender !== mainWindow?.webContents) {
    console.warn('[IPC] Unauthorized IPC sender for get-ui-language');
    return { success: false, error: 'UNAUTHORIZED_SENDER', language: 'en' };
  }

  return { success: true, language: desktopUiLanguage };
});

ipcMain.handle('get-startup-diagnostics', (event) => {
  if (event.sender !== mainWindow?.webContents) {
    console.warn('[IPC] Unauthorized IPC sender for get-startup-diagnostics');
    return { success: false, error: 'UNAUTHORIZED_SENDER', language: desktopUiLanguage };
  }

  return getStartupDiagnostics();
});

ipcMain.handle('reload-app', (event) => {
  if (event.sender !== mainWindow?.webContents) {
    console.warn('[IPC] Unauthorized IPC sender for reload-app');
    return { success: false, error: 'UNAUTHORIZED_SENDER' };
  }

  if (!mainWindow || mainWindow.isDestroyed()) {
    return { success: false, error: 'WINDOW_NOT_AVAILABLE' };
  }

  startupDiagnosticMode = false;
  recordStartupDiagnosticEvent(
    'info',
    'RELOAD_REQUESTED',
    'Application reload requested from diagnostic UI'
  );
  void mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html')).catch((error) => {
    showStartupDiagnosticPage(
      'LOAD_FILE_FAILED',
      error instanceof Error ? error.message : String(error)
    );
  });
  return { success: true };
});

ipcMain.handle('quit-app', (event) => {
  if (event.sender !== mainWindow?.webContents) {
    console.warn('[IPC] Unauthorized IPC sender for quit-app');
    return { success: false, error: 'UNAUTHORIZED_SENDER' };
  }

  app.quit();
  return { success: true };
});

// ─────────────────────────────────────────────────────────────────
// 🪟 Ana Pencere Oluşturma
// ─────────────────────────────────────────────────────────────────
function createWindow() {
  const mainAppPath = path.join(__dirname, 'dist', 'index.html');
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // 🔒 GÜVENLİK HARDENİNG
      nodeIntegration: false, // ❌ Node.js API'sine erişimi kapat
      contextIsolation: true, // ✅ Renderer ve preload arasında güvenli izolasyon
      preload: path.join(__dirname, 'preload.cjs'), // ✅ Güvenli köprü
      sandbox: true, // ✅ Renderer sürecini sandbox'la
      webSecurity: true, // ✅ Same-origin policy aktif
      allowRunningInsecureContent: false, // ✅ Mixed content engelle
    },
  });

  // Dist klasöründen yükle
  recordStartupDiagnosticEvent('info', 'WINDOW_CREATED', 'Main BrowserWindow created', mainAppPath);
  void mainWindow.loadFile(mainAppPath).catch((error) => {
    showStartupDiagnosticPage(
      'LOAD_FILE_FAILED',
      error instanceof Error ? error.message : String(error)
    );
  });

  // Menü çubuğunu gizle
  mainWindow.setMenuBarVisibility(false);

  mainWindow.webContents.on('did-finish-load', () => {
    if (!startupDiagnosticMode) {
      recordStartupDiagnosticEvent('info', 'WINDOW_READY', 'Renderer finished loading');
    }
  });

  mainWindow.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!isMainFrame || startupDiagnosticMode) return;
      showStartupDiagnosticPage(
        'WEBCONTENTS_DID_FAIL_LOAD',
        `${errorCode} ${errorDescription} ${validatedURL || ''}`.trim()
      );
    }
  );

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    if (startupDiagnosticMode) return;
    showStartupDiagnosticPage('RENDER_PROCESS_GONE', JSON.stringify(details || {}));
  });

  mainWindow.on('unresponsive', async () => {
    recordStartupDiagnosticEvent('error', 'WINDOW_UNRESPONSIVE', 'Main window became unresponsive');
    const text = getStartupDiagnosticText(desktopUiLanguage);
    const response = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: [text.reload, text.quit],
      defaultId: 0,
      cancelId: 1,
      title: text.title,
      message: text.subtitle,
    });

    if (response.response === 0) {
      startupDiagnosticMode = false;
      void mainWindow.loadFile(mainAppPath).catch((error) => {
        showStartupDiagnosticPage(
          'LOAD_FILE_FAILED',
          error instanceof Error ? error.message : String(error)
        );
      });
    } else {
      app.quit();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─────────────────────────────────────────────────────────────────
// 🔒 Content Security Policy (CSP) — Global header enjeksiyonu
// ─────────────────────────────────────────────────────────────────
process.on('uncaughtException', (error) => {
  recordStartupDiagnosticEvent(
    'error',
    'UNCAUGHT_EXCEPTION',
    error?.message || 'Uncaught exception',
    error?.stack || ''
  );
});

process.on('unhandledRejection', (reason) => {
  const detail =
    reason instanceof Error ? `${reason.message}\n${reason.stack || ''}` : String(reason);
  recordStartupDiagnosticEvent(
    'error',
    'UNHANDLED_REJECTION',
    'Unhandled promise rejection',
    detail
  );
});

app.whenReady().then(() => {
  recordStartupDiagnosticEvent('info', 'APP_READY', 'Electron app ready');

  // 1. Minimum initialization for Window
  loadUiPreferences();
  createWindow();

  // 2. Perform non-critical startup tasks in background to preserve cold start speed
  process.nextTick(() => {
    loadPersistentPairings();
    if (!LOOPBACK_SYNC_ENABLED) {
      recordStartupDiagnosticEvent(
        'info',
        'LOOPBACK_DISABLED',
        'Loopback sync disabled by default'
      );
    }

    // 🖥️ Auto-register native host and initialize pairing secret
    // Defer heavy PowerShell hit slightly
    setTimeout(() => {
      registerNativeHostWindows();
      ensureNativeHostPairingSecret();
      startNativeBridgeServer();
    }, 1500);

    // Global CSP HeaderInjection
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
              `connect-src 'self' https://api.pwnedpasswords.com${LOOPBACK_SYNC_ENABLED ? ' http://127.0.0.1:23456' : ''}; ` +
              "worker-src 'self' blob:; " +
              "object-src 'none'; " +
              "base-uri 'self'",
          ],
        },
      });
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Kasa kapatıldığında güvenli temizlik
  vaultState.unlocked = false;
  vaultState.entryCount = 0;
  pendingDomainCredentialRequests.clear();
  pendingDomainPasskeyRequests.clear();
  pendingPasskeyAuthRequests.clear();
  pendingAutosaveCredentialRequests.clear();
  pendingVaultCliRequests.clear();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopNativeBridgeServer();
});

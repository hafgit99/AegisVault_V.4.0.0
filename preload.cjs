/**
 * Aegis Vault — Electron Preload Script
 * 
 * SECURITY: Bu dosya contextBridge ile güvenli IPC API'yi renderer'a açar.
 * nodeIntegration: false ve contextIsolation: true ile çalışır.
 * Renderer tarafında `window.aegisElectron` üzerinden erişilir.
 */
const { contextBridge, ipcRenderer } = require('electron');

let domainCredentialProvider = null;

ipcRenderer.on('aegis-domain-credentials-request', async (_event, payload) => {
  const requestId = typeof payload?.requestId === 'string' ? payload.requestId : '';
  const domain = typeof payload?.domain === 'string' ? payload.domain : '';

  if (!requestId) return;

  try {
    const rawResult = domainCredentialProvider ? await domainCredentialProvider(domain) : [];
    const sanitized = Array.isArray(rawResult)
      ? rawResult.slice(0, 5).map((item) => ({
          title: String(item?.title || ''),
          username: String(item?.username || ''),
          pass: String(item?.pass || ''),
          website: String(item?.website || ''),
        }))
      : [];

    ipcRenderer.send('aegis-domain-credentials-response', {
      requestId,
      data: sanitized,
    });
  } catch {
    ipcRenderer.send('aegis-domain-credentials-response', {
      requestId,
      data: [],
    });
  }
});

contextBridge.exposeInMainWorld('aegisElectron', {
  /**
   * Electron ana sürecine yalnızca kasa durumunu gönderir.
   */
  syncVaultState: (state) => {
    const sanitizedState = {
      unlocked: Boolean(state?.unlocked),
      entryCount: Number.isFinite(Number(state?.entryCount)) ? Number(state.entryCount) : 0,
    };
    ipcRenderer.send('sync-vault-state', sanitizedState);
  },

  /**
   * Main process ihtiyaç duyduğunda domain bazlı credential üreticisini çağırır.
   */
  setDomainCredentialProvider: (provider) => {
    domainCredentialProvider = typeof provider === 'function' ? provider : null;
  },

  /**
   * Kasa kilitlendiğinde Electron ana sürecine sinyal gönderir.
   */
  lockVault: () => {
    ipcRenderer.send('lock-vault');
  },

  listExtensionPairings: () => ipcRenderer.invoke('list-extension-pairings'),

  removeExtensionPairing: (extensionId) =>
    ipcRenderer.invoke('remove-extension-pairing', String(extensionId || '')),

  setUiLanguage: (language) =>
    ipcRenderer.invoke('set-ui-language', typeof language === 'string' ? language : 'en'),

  getUiLanguage: () => ipcRenderer.invoke('get-ui-language'),

  getStartupDiagnostics: () => ipcRenderer.invoke('get-startup-diagnostics'),

  reloadApp: () => ipcRenderer.invoke('reload-app'),

  quitApp: () => ipcRenderer.invoke('quit-app'),

  /**
   * Electron ortamında çalışıp çalışmadığını belirtir.
   */
  isElectron: true
});

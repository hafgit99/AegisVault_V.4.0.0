/**
 * Aegis Vault — Electron Preload Script
 *
 * SECURITY: Bu dosya contextBridge ile güvenli IPC API'yi renderer'a açar.
 * nodeIntegration: false ve contextIsolation: true ile çalışır.
 * Renderer tarafında `window.aegisElectron` üzerinden erişilir.
 */
const { contextBridge, ipcRenderer } = require('electron');
const AEGIS_RELEASE_PAGE_URL = 'https://github.com/hafgit99/AegisVault_V.4.0.0/releases/latest';

let domainCredentialProvider = null;
let domainPasskeyProvider = null;
let passkeyAuthHandler = null;
let autosaveCredentialHandler = null;
let vaultCliHandler = null;

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
          category: String(item?.category || ''),
          cardDetails:
            item?.cardDetails && typeof item.cardDetails === 'object'
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
            item?.identityDetails && typeof item.identityDetails === 'object'
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

ipcRenderer.on('aegis-domain-passkeys-request', async (_event, payload) => {
  const requestId = typeof payload?.requestId === 'string' ? payload.requestId : '';
  const domain = typeof payload?.domain === 'string' ? payload.domain : '';

  if (!requestId) return;

  try {
    const rawResult = domainPasskeyProvider ? await domainPasskeyProvider(domain) : [];
    const sanitized = Array.isArray(rawResult)
      ? rawResult.slice(0, 5).map((item) => ({
          title: String(item?.title || ''),
          username: String(item?.username || ''),
          website: String(item?.website || ''),
          passkeyMetadata: item?.passkeyMetadata
            ? {
                credential_id: String(item.passkeyMetadata.credential_id || ''),
                rp_id: String(item.passkeyMetadata.rp_id || ''),
                mode: String(item.passkeyMetadata.mode || ''),
              }
            : null,
        }))
      : [];

    ipcRenderer.send('aegis-domain-passkeys-response', {
      requestId,
      data: sanitized,
    });
  } catch {
    ipcRenderer.send('aegis-domain-passkeys-response', {
      requestId,
      data: [],
    });
  }
});

ipcRenderer.on('aegis-auth-passkey-request', async (_event, payload) => {
  const requestId = typeof payload?.requestId === 'string' ? payload.requestId : '';
  const options = payload?.options;

  if (!requestId || !options) return;

  try {
    if (!passkeyAuthHandler) throw new Error('PASSKEY_AUTH_HANDLER_NOT_SET');
    const result = await passkeyAuthHandler(options); // options: SitePasskeyAuthOptions
    ipcRenderer.send('aegis-auth-passkey-response', {
      requestId,
      data: result, // result: SitePasskeyAuthResult
    });
  } catch (err) {
    ipcRenderer.send('aegis-auth-passkey-response', {
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

ipcRenderer.on('aegis-autosave-credential-request', async (_event, payload) => {
  const requestId = typeof payload?.requestId === 'string' ? payload.requestId : '';
  const credential = payload?.credential;

  if (!requestId || !credential) return;

  try {
    if (!autosaveCredentialHandler) throw new Error('AUTOSAVE_HANDLER_NOT_SET');
    const result = await autosaveCredentialHandler(credential);
    ipcRenderer.send('aegis-autosave-credential-response', {
      requestId,
      data: result,
    });
  } catch (err) {
    ipcRenderer.send('aegis-autosave-credential-response', {
      requestId,
      data: {
        saved: false,
        error: err instanceof Error ? err.message : String(err),
      },
    });
  }
});

ipcRenderer.on('aegis-vault-cli-request', async (_event, payload) => {
  const requestId = typeof payload?.requestId === 'string' ? payload.requestId : '';
  const operation = typeof payload?.operation === 'string' ? payload.operation : '';
  const requestPayload =
    payload?.payload && typeof payload.payload === 'object' ? payload.payload : {};

  if (!requestId || !operation) return;

  try {
    if (!vaultCliHandler) throw new Error('VAULT_CLI_HANDLER_NOT_SET');
    const result = await vaultCliHandler(operation, requestPayload);
    ipcRenderer.send('aegis-vault-cli-response', {
      requestId,
      data: result,
    });
  } catch (err) {
    ipcRenderer.send('aegis-vault-cli-response', {
      requestId,
      data: {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
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

  setDomainPasskeyProvider: (provider) => {
    domainPasskeyProvider = typeof provider === 'function' ? provider : null;
  },

  setPasskeyAuthHandler: (handler) => {
    passkeyAuthHandler = typeof handler === 'function' ? handler : null;
  },

  setAutosaveCredentialHandler: (handler) => {
    autosaveCredentialHandler = typeof handler === 'function' ? handler : null;
  },

  setVaultCliHandler: (handler) => {
    vaultCliHandler = typeof handler === 'function' ? handler : null;
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

  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  openReleasePage: (releaseUrl) =>
    ipcRenderer.invoke(
      'open-release-page',
      typeof releaseUrl === 'string' && releaseUrl.startsWith('https://')
        ? releaseUrl
        : AEGIS_RELEASE_PAGE_URL
    ),

  secureClipboardWrite: (text, ttlMs) =>
    ipcRenderer.invoke('secure-clipboard-write', {
      text: typeof text === 'string' ? text : '',
      ttlMs: Number.isFinite(Number(ttlMs)) ? Number(ttlMs) : 30000,
    }),

  secureClipboardClear: (expectedText) =>
    ipcRenderer.invoke(
      'secure-clipboard-clear',
      typeof expectedText === 'string' ? expectedText : undefined
    ),

  reloadApp: () => ipcRenderer.invoke('reload-app'),

  quitApp: () => ipcRenderer.invoke('quit-app'),

  /**
   * Electron ortamında çalışıp çalışmadığını belirtir.
   */
  isElectron: true,
});

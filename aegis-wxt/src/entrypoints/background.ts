import { defineBackground } from 'wxt/sandbox';

type WxtEnvMap = Record<string, string | undefined>;
type NativeHostResponse = Record<string, unknown>;
type DesktopAuthEnvelope = {
  keyId?: string;
  timestamp?: string;
  requestNonce?: string;
  clientNonce?: string;
  signature?: string;
  publicJwk?: JsonWebKey | null;
};
type DesktopVaultStatus = {
  isUnlocked: boolean;
  entryCount: number;
};
type DesktopPairingStatus = {
  paired: boolean;
  pairedAt: string;
  secretSource: string;
  pairingMode?: string;
  clientKeyId?: string;
  clientLabel?: string;
  deviceFingerprint?: string;
  lastUsedAt?: string;
  lastApprovedAt?: string;
  riskFlags?: string[];
  riskLevel?: string;
  pairingHistory?: Array<{ at?: string; type?: string; detail?: string; riskFlags?: string[] }>;
};
type NativePairingInitResult =
  | {
      ok: true;
      secret: string;
      pairedAt: string;
      riskFlags?: string[];
      deviceFingerprint?: string;
      pairingMode?: string;
      clientKeyId?: string;
    }
  | { ok: false; error: string };
type VaultCacheEntry = {
  title: string;
  username: string;
  pass: string;
  website: string;
  category?: string;
  cardDetails?: {
    cardholder_name?: string;
    card_number?: string;
    brand?: string;
    expiry_month?: string;
    expiry_year?: string;
    cvv?: string;
    pin?: string;
    billing_zip?: string;
    billing_address?: string;
  } | null;
  identityDetails?: {
    document_type?: string;
    identity_number?: string;
    issuing_country?: string;
    nationality?: string;
    date_of_birth?: string;
    issued_at?: string;
    expires_at?: string;
  } | null;
};
type AutosaveCredentialPayload = {
  title: string;
  username: string;
  pass: string;
  website: string;
  submittedAt: string;
  source: 'browser_form';
};
type PendingAutosaveQueueItem = {
  id: string;
  domain: string;
  credential: AutosaveCredentialPayload;
  createdAt: string;
};
type AutofillSitePolicy = 'allow' | 'ask' | 'block';
type RuntimeMessageSenderWithOrigin = browser.Runtime.MessageSender & {
  origin?: string;
};

// Kıdemli Mimar Notu: WXT, defineBackground ile arka plan yapısını tek kaynaktan yönetir.
// Chrome/Safari Manifest V3 -> type: "module" -> service_worker olarak derlenir.
// Firefox Manifest V3 -> scripts: [...] -> standart arka plan betiği (background script) olarak derlenir.
export default defineBackground({
  type: 'module', // Chrome/Safari V3 Service Worker gereksinimi

  main() {
    const env = import.meta.env as WxtEnvMap;
    console.log('[Aegis Vault] Hybrid background loaded.');

    browser.runtime.onInstalled.addListener(() => {
      console.log('Aegis Vault WXT extension installed and started.');
    });

    browser.contextMenus.create({
      id: 'aegis-fill',
      title: 'Aegis: Bu sayfayi analiz et ve doldur',
      contexts: ['page', 'editable'],
    });
    browser.contextMenus.create({
      id: 'aegis-generate-alias',
      title: 'Aegis: Bu site icin alias olustur',
      contexts: ['page', 'editable'],
    });

    // ─── RUNTIME ENJEKSİYON (P0-3: Attack Surface Reduction) ───
    // Kullanıcı ikona tıkladığında veya sağ tık menüsünü kullandığında
    // content script o sekmeye inject edilir.
    const injectContentScript = async (tabId: number) => {
      try {
        // Script ve CSS enjeksiyonu
        await browser.scripting.executeScript({
          target: { tabId },
          files: ['content-scripts/content.js'],
        });

        // CSS dosyasının varlığından emin olun (WXT build çıktısı)
        await browser.scripting
          .insertCSS({
            target: { tabId },
            files: ['content-scripts/content.css'],
          })
          .catch(() => {}); // CSS olmayabilirse hata fırlatmasın

        console.log(`[Aegis Vault] 💉 JIT: Content script tabId:${tabId} üzerine enjekte edildi.`);
      } catch (err) {
        console.error('[Aegis Vault] ❌ Enjeksiyon hatası (Scripting API):', err);
      }
    };

    browser.action.onClicked.addListener((tab) => {
      if (tab.id) injectContentScript(tab.id);
    });

    browser.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === 'aegis-fill' && tab?.id) {
        injectContentScript(tab.id);
        return;
      }
      if (info.menuItemId === 'aegis-generate-alias' && tab?.id && tab.url) {
        void generateAliasForTab(tab.id, tab.url, tab.title || '');
      }
    });

    // ──────────────────────────────────────────────────────────────────────
    // 🔒 TEK KAYNAK GÜVENLİK MİMARİSİ (Single Source of Truth)
    // ──────────────────────────────────────────────────────────────────────
    //
    // Eklenti SADECE ve SADECE şu kaynaktan veri alır:
    //   → SAVE_VAULT mesajı (PWA Dashboard kasayı açtığında gönderir)
    //
    // Hiçbir localhost API, hiçbir fetch, hiçbir harici kaynak KULLANILMAZ.
    // Bu, kasa kapalıyken veri sızmasını %100 engeller.
    //
    // Kasa varsayılan olarak KİLİTLİ başlar.
    // Sadece SAVE_VAULT ile açılır, LOCK_VAULT ile kilitlenir.
    // ──────────────────────────────────────────────────────────────────────

    // Kasa durumu (in-memory, volatile)
    let isVaultUnlocked = false;

    // Merkezi Hafıza: Sadece SAVE_VAULT ile doldurulur (Oturuma özel)
    const vaultCache: VaultCacheEntry[] = [];
    const pendingAutosaveQueue: PendingAutosaveQueueItem[] = [];
    const LEGACY_GET_VAULT_ENABLED = false;
    const DOMAIN_REQ_MIN_INTERVAL_MS = 350;
    const AUTOSAVE_MIN_INTERVAL_MS = 15_000;
    const AUTOSAVE_QUEUE_LIMIT = 20;
    const NONCE_TTL_MS = 30 * 1000;
    const DESKTOP_CHALLENGE_TTL_MS = 60 * 1000;
    const EXTENSION_ID = (env.WXT_AEGIS_EXTENSION_ID || browser.runtime.id || '').trim();
    const DESKTOP_PAIRING_SECRET = (env.WXT_AEGIS_DESKTOP_PAIRING_SECRET || '').trim();
    const _DESKTOP_SYNC_ENABLED = (env.WXT_AEGIS_ENABLE_DESKTOP_SYNC || '0') === '1';
    const NATIVE_MESSAGING_ENABLED = (env.WXT_AEGIS_ENABLE_NATIVE_MESSAGING || '1') === '1';
    const NATIVE_HOST_NAME = (env.WXT_AEGIS_NATIVE_HOST_NAME || 'com.aegisvault.desktop').trim();
    const LOOPBACK_FALLBACK_ENABLED = (env.WXT_AEGIS_ENABLE_LOOPBACK_FALLBACK || '1') === '1';
    const recentDomainRequestMap = new Map<string, number>();
    const recentAutosaveMap = new Map<string, number>();
    const requestNonceMap = new Map<string, number>();
    const normalizeUiLanguage = (value: unknown) =>
      typeof value === 'string' && value.toLowerCase().startsWith('tr') ? 'tr' : 'en';
    let runtimePairingSecret = '';
    let runtimePairingKeyMaterial: {
      publicJwk: JsonWebKey;
      privateJwk: JsonWebKey;
      keyId: string;
    } | null = null;
    let runtimeDesktopBridgeIdentity: { publicJwk: JsonWebKey; keyId: string } | null = null;
    let runtimeUiLanguage = normalizeUiLanguage(
      typeof navigator !== 'undefined' ? navigator.language : 'en'
    );
    let hasPersistedUiLanguage = false;
    let runtimeInstallationId = '';
    let warnedAboutLegacyNativeResponse = false;
    const UI_LANGUAGE_STORAGE_KEY = 'aegis_ui_language';
    const INSTALLATION_ID_STORAGE_KEY = 'aegis_extension_installation_id';
    const PAIRING_SECRET_STORAGE_KEY = 'aegis_desktop_pairing_secret';
    const PAIRING_PRIVATE_JWK_STORAGE_KEY = 'aegis_desktop_pairing_private_jwk';
    const PAIRING_PUBLIC_JWK_STORAGE_KEY = 'aegis_desktop_pairing_public_jwk';
    const PAIRING_KEY_ID_STORAGE_KEY = 'aegis_desktop_pairing_key_id';
    const DESKTOP_BRIDGE_PUBLIC_JWK_STORAGE_KEY = 'aegis_desktop_bridge_public_jwk';
    const DESKTOP_BRIDGE_KEY_ID_STORAGE_KEY = 'aegis_desktop_bridge_key_id';
    const AUTOSAVE_QUEUE_SESSION_KEY = 'aegis_pending_autosave_queue_v1';
    const SITE_AUTOFILL_POLICY_STORAGE_KEY = 'aegis_site_autofill_policy_v1';
    let runtimeSiteAutofillPolicies: Record<string, AutofillSitePolicy> = {};

    // MV3 Dayanıklılık: Kilit durumunu browser.storage.session ile kalıcı yap
    const persistVaultState = async (unlocked: boolean) => {
      try {
        await browser.storage.session.set({ aegis_vault_unlocked: unlocked });
      } catch {
        // Firefox eski sürümlerinde storage.session olmayabilir
      }
    };

    const loadRuntimePairingSecret = async () => {
      try {
        const result = await browser.storage.local.get(PAIRING_SECRET_STORAGE_KEY);
        runtimePairingSecret =
          typeof result[PAIRING_SECRET_STORAGE_KEY] === 'string'
            ? result[PAIRING_SECRET_STORAGE_KEY].trim()
            : '';
      } catch {
        runtimePairingSecret = '';
      }
    };

    const normalizeClientPublicJwk = (value: unknown): JsonWebKey | null => {
      if (!value || typeof value !== 'object') return null;
      const candidate = value as JsonWebKey;
      if (
        candidate.kty !== 'EC' ||
        candidate.crv !== 'P-256' ||
        typeof candidate.x !== 'string' ||
        typeof candidate.y !== 'string'
      ) {
        return null;
      }
      return {
        key_ops: ['verify'],
        ext: true,
        kty: 'EC',
        crv: 'P-256',
        x: candidate.x,
        y: candidate.y,
      };
    };

    const normalizeClientPrivateJwk = (value: unknown): JsonWebKey | null => {
      if (!value || typeof value !== 'object') return null;
      const candidate = value as JsonWebKey;
      if (
        candidate.kty !== 'EC' ||
        candidate.crv !== 'P-256' ||
        typeof candidate.x !== 'string' ||
        typeof candidate.y !== 'string' ||
        typeof candidate.d !== 'string'
      ) {
        return null;
      }
      return {
        key_ops: ['sign'],
        ext: true,
        kty: 'EC',
        crv: 'P-256',
        x: candidate.x,
        y: candidate.y,
        d: candidate.d,
      };
    };

    const canonicalizePublicJwk = (publicJwk: JsonWebKey) =>
      JSON.stringify({
        key_ops: ['verify'],
        ext: true,
        kty: 'EC',
        crv: 'P-256',
        x: publicJwk.x,
        y: publicJwk.y,
      });

    const digestString = async (value: string) => {
      const bytes = new TextEncoder().encode(value);
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return toHex(digest);
    };

    const computeClientKeyId = async (publicJwk: JsonWebKey) =>
      (await digestString(canonicalizePublicJwk(publicJwk))).slice(0, 24);

    const loadRuntimePairingKeyMaterial = async () => {
      try {
        const result = await browser.storage.local.get([
          PAIRING_PRIVATE_JWK_STORAGE_KEY,
          PAIRING_PUBLIC_JWK_STORAGE_KEY,
          PAIRING_KEY_ID_STORAGE_KEY,
        ]);
        const publicJwk = normalizeClientPublicJwk(result[PAIRING_PUBLIC_JWK_STORAGE_KEY]);
        const privateJwk = normalizeClientPrivateJwk(result[PAIRING_PRIVATE_JWK_STORAGE_KEY]);
        const keyId =
          typeof result[PAIRING_KEY_ID_STORAGE_KEY] === 'string'
            ? result[PAIRING_KEY_ID_STORAGE_KEY].trim()
            : '';
        if (publicJwk && privateJwk && keyId) {
          runtimePairingKeyMaterial = { publicJwk, privateJwk, keyId };
          return runtimePairingKeyMaterial;
        }
      } catch {
        // ignore and regenerate
      }
      runtimePairingKeyMaterial = null;
      return null;
    };

    const loadRuntimeDesktopBridgeIdentity = async () => {
      try {
        const result = await browser.storage.local.get([
          DESKTOP_BRIDGE_PUBLIC_JWK_STORAGE_KEY,
          DESKTOP_BRIDGE_KEY_ID_STORAGE_KEY,
        ]);
        const publicJwk = normalizeClientPublicJwk(result[DESKTOP_BRIDGE_PUBLIC_JWK_STORAGE_KEY]);
        const keyId =
          typeof result[DESKTOP_BRIDGE_KEY_ID_STORAGE_KEY] === 'string'
            ? result[DESKTOP_BRIDGE_KEY_ID_STORAGE_KEY].trim()
            : '';
        if (publicJwk && keyId) {
          runtimeDesktopBridgeIdentity = { publicJwk, keyId };
          return runtimeDesktopBridgeIdentity;
        }
      } catch {
        // ignore
      }
      runtimeDesktopBridgeIdentity = null;
      return null;
    };

    const toAutosavePreview = (item: PendingAutosaveQueueItem) => ({
      id: item.id,
      domain: item.domain,
      title: item.credential.title,
      username: item.credential.username,
      website: item.credential.website,
      createdAt: item.createdAt,
      source: item.credential.source,
    });

    const persistAutosaveQueue = async () => {
      try {
        await browser.storage.session.set({
          [AUTOSAVE_QUEUE_SESSION_KEY]: pendingAutosaveQueue,
        });
      } catch {
        // Firefox eski sürümlerde storage.session olmayabilir
      }
    };

    const loadAutosaveQueue = async () => {
      try {
        const result = await browser.storage.session.get(AUTOSAVE_QUEUE_SESSION_KEY);
        const rawQueue = result[AUTOSAVE_QUEUE_SESSION_KEY];
        if (!Array.isArray(rawQueue)) return;

        pendingAutosaveQueue.length = 0;
        for (const raw of rawQueue) {
          if (!raw || typeof raw !== 'object') continue;
          const item = raw as Partial<PendingAutosaveQueueItem>;
          if (
            typeof item.id !== 'string' ||
            typeof item.domain !== 'string' ||
            !item.credential ||
            typeof item.credential !== 'object'
          ) {
            continue;
          }
          const credentialCandidate = item.credential as Partial<AutosaveCredentialPayload>;
          const website =
            typeof credentialCandidate.website === 'string'
              ? credentialCandidate.website.trim()
              : '';
          const pass = typeof credentialCandidate.pass === 'string' ? credentialCandidate.pass : '';
          if (!website || !pass) continue;
          const sanitizedCredential: AutosaveCredentialPayload = {
            title:
              typeof credentialCandidate.title === 'string'
                ? credentialCandidate.title.slice(0, 120)
                : '',
            username:
              typeof credentialCandidate.username === 'string'
                ? credentialCandidate.username.slice(0, 256)
                : '',
            pass: pass.slice(0, 1024),
            website: website.slice(0, 512),
            submittedAt:
              typeof credentialCandidate.submittedAt === 'string'
                ? credentialCandidate.submittedAt
                : new Date().toISOString(),
            source: 'browser_form',
          };
          if (!sanitizedCredential) continue;
          pendingAutosaveQueue.push({
            id: item.id,
            domain: item.domain,
            credential: sanitizedCredential,
            createdAt:
              typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
          });
        }
      } catch {
        // ignore queue restore errors
      }
    };

    const clearAutosaveQueue = () => {
      pendingAutosaveQueue.length = 0;
      void persistAutosaveQueue();
    };

    const enqueueAutosaveCandidate = (domain: string, credential: AutosaveCredentialPayload) => {
      const dedupIndex = pendingAutosaveQueue.findIndex(
        (item) =>
          item.domain === domain &&
          item.credential.website === credential.website &&
          item.credential.username.toLowerCase() === credential.username.toLowerCase() &&
          item.credential.pass === credential.pass
      );
      if (dedupIndex >= 0) {
        const existing = pendingAutosaveQueue[dedupIndex];
        existing.createdAt = new Date().toISOString();
        pendingAutosaveQueue.splice(dedupIndex, 1);
        pendingAutosaveQueue.unshift(existing);
        void persistAutosaveQueue();
        return existing;
      }

      const created: PendingAutosaveQueueItem = {
        id: generateRequestNonce(),
        domain,
        credential,
        createdAt: new Date().toISOString(),
      };
      pendingAutosaveQueue.unshift(created);
      if (pendingAutosaveQueue.length > AUTOSAVE_QUEUE_LIMIT) {
        pendingAutosaveQueue.length = AUTOSAVE_QUEUE_LIMIT;
      }
      void persistAutosaveQueue();
      return created;
    };

    const storeRuntimeDesktopBridgeIdentity = async (publicJwk: JsonWebKey, keyId: string) => {
      runtimeDesktopBridgeIdentity = { publicJwk, keyId };
      await browser.storage.local.set({
        [DESKTOP_BRIDGE_PUBLIC_JWK_STORAGE_KEY]: publicJwk,
        [DESKTOP_BRIDGE_KEY_ID_STORAGE_KEY]: keyId,
      });
      return runtimeDesktopBridgeIdentity;
    };

    const clearRuntimeDesktopBridgeIdentity = async () => {
      runtimeDesktopBridgeIdentity = null;
      await browser.storage.local.remove([
        DESKTOP_BRIDGE_PUBLIC_JWK_STORAGE_KEY,
        DESKTOP_BRIDGE_KEY_ID_STORAGE_KEY,
      ]);
    };

    const ensureRuntimePairingKeyMaterial = async () => {
      if (runtimePairingKeyMaterial) return runtimePairingKeyMaterial;
      const loaded = await loadRuntimePairingKeyMaterial();
      if (loaded) return loaded;

      const keyPair = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign', 'verify']
      );
      const publicJwk = normalizeClientPublicJwk(
        await crypto.subtle.exportKey('jwk', keyPair.publicKey)
      );
      const privateJwk = normalizeClientPrivateJwk(
        await crypto.subtle.exportKey('jwk', keyPair.privateKey)
      );
      if (!publicJwk || !privateJwk) {
        throw new Error('PAIRING_KEY_EXPORT_FAILED');
      }
      const keyId = await computeClientKeyId(publicJwk);
      runtimePairingKeyMaterial = { publicJwk, privateJwk, keyId };
      await browser.storage.local.set({
        [PAIRING_PUBLIC_JWK_STORAGE_KEY]: publicJwk,
        [PAIRING_PRIVATE_JWK_STORAGE_KEY]: privateJwk,
        [PAIRING_KEY_ID_STORAGE_KEY]: keyId,
      });
      return runtimePairingKeyMaterial;
    };

    const ensureActivePairingSecret = async () => {
      if (runtimePairingSecret) return runtimePairingSecret;
      if (DESKTOP_PAIRING_SECRET) return DESKTOP_PAIRING_SECRET;
      await loadRuntimePairingSecret();
      return runtimePairingSecret || DESKTOP_PAIRING_SECRET || '';
    };

    const loadRuntimeUiLanguage = async () => {
      try {
        const result = await browser.storage.local.get(UI_LANGUAGE_STORAGE_KEY);
        const stored = result[UI_LANGUAGE_STORAGE_KEY];
        if (typeof stored === 'string' && stored.trim()) {
          runtimeUiLanguage = normalizeUiLanguage(stored);
          hasPersistedUiLanguage = true;
          return;
        }
        runtimeUiLanguage = normalizeUiLanguage(
          typeof navigator !== 'undefined' ? navigator.language : runtimeUiLanguage
        );
        hasPersistedUiLanguage = false;
      } catch {
        runtimeUiLanguage = normalizeUiLanguage(
          typeof navigator !== 'undefined' ? navigator.language : runtimeUiLanguage
        );
        hasPersistedUiLanguage = false;
      }
    };

    const detectBrowserUiLanguage = () =>
      normalizeUiLanguage(
        typeof navigator !== 'undefined' ? navigator.language : runtimeUiLanguage
      );

    const ensureRuntimeInstallationId = async () => {
      if (runtimeInstallationId) return runtimeInstallationId;
      try {
        const result = await browser.storage.local.get(INSTALLATION_ID_STORAGE_KEY);
        const existing =
          typeof result[INSTALLATION_ID_STORAGE_KEY] === 'string'
            ? result[INSTALLATION_ID_STORAGE_KEY].trim()
            : '';
        if (existing) {
          runtimeInstallationId = existing;
          return runtimeInstallationId;
        }
      } catch {
        // continue with generation
      }

      const generated =
        typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      runtimeInstallationId = generated;
      try {
        await browser.storage.local.set({ [INSTALLATION_ID_STORAGE_KEY]: generated });
      } catch {
        // best effort persistence
      }
      return runtimeInstallationId;
    };

    const buildClientInfo = async () => ({
      browserName: browser.runtime.getManifest().name || 'Aegis Vault',
      browserVersion: browser.runtime.getManifest().version || '',
      platform:
        typeof navigator !== 'undefined'
          ? (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
              ?.platform ||
            navigator.platform ||
            'unknown'
          : 'unknown',
      locale: typeof navigator !== 'undefined' ? navigator.language || 'en' : 'en',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      extensionVersion: browser.runtime.getManifest().version || '',
      installId: await ensureRuntimeInstallationId(),
    });

    const buildSignedNativeBridgePayload = (
      message: Record<string, unknown>,
      clientInfo: Awaited<ReturnType<typeof buildClientInfo>>,
      keyId: string,
      timestamp: string,
      nonce: string,
      clientPublicJwk?: JsonWebKey | null
    ) =>
      JSON.stringify({
        type: typeof message.type === 'string' ? message.type : '',
        extensionId: EXTENSION_ID,
        domain: normalizeBridgeDomain(message.domain),
        requestNonce: typeof message.requestNonce === 'string' ? message.requestNonce.trim() : '',
        clientKeyId: keyId,
        clientTimestamp: timestamp,
        clientNonce: nonce,
        clientInfo: {
          browserName: clientInfo.browserName,
          browserVersion: clientInfo.browserVersion,
          platform: clientInfo.platform,
          locale: clientInfo.locale,
          installId: clientInfo.installId,
          extensionVersion: clientInfo.extensionVersion,
          userAgent: clientInfo.userAgent,
        },
        clientPublicJwk: clientPublicJwk || null,
        credential:
          message.credential && typeof message.credential === 'object'
            ? {
                title:
                  typeof (message.credential as Record<string, unknown>).title === 'string'
                    ? (message.credential as Record<string, unknown>).title
                    : '',
                username:
                  typeof (message.credential as Record<string, unknown>).username === 'string'
                    ? (message.credential as Record<string, unknown>).username
                    : '',
                pass:
                  typeof (message.credential as Record<string, unknown>).pass === 'string'
                    ? (message.credential as Record<string, unknown>).pass
                    : '',
                website:
                  typeof (message.credential as Record<string, unknown>).website === 'string'
                    ? (message.credential as Record<string, unknown>).website
                    : '',
                submittedAt:
                  typeof (message.credential as Record<string, unknown>).submittedAt === 'string'
                    ? (message.credential as Record<string, unknown>).submittedAt
                    : '',
                source:
                  typeof (message.credential as Record<string, unknown>).source === 'string'
                    ? (message.credential as Record<string, unknown>).source
                    : 'browser_form',
              }
            : null,
      });

    const signNativeBridgeMessage = async (
      message: Record<string, unknown>,
      clientInfo: Awaited<ReturnType<typeof buildClientInfo>>
    ) => {
      const keyMaterial = await ensureRuntimePairingKeyMaterial();
      const timestamp = Date.now().toString();
      const nonce = generateRequestNonce();
      const includePublicKey = message.type === 'INIT_PAIRING';
      const payload = buildSignedNativeBridgePayload(
        message,
        clientInfo,
        keyMaterial.keyId,
        timestamp,
        nonce,
        includePublicKey ? keyMaterial.publicJwk : null
      );
      console.log('[Aegis Extension] 🔍 SIGN PAYLOAD:', payload.substring(0, 500));
      console.log('[Aegis Extension] 🔍 CLIENT KEY ID:', keyMaterial.keyId);
      console.log(
        '[Aegis Extension] 🔍 PUBLIC JWK:',
        JSON.stringify(includePublicKey ? keyMaterial.publicJwk : null)
      );
      const privateKey = await crypto.subtle.importKey(
        'jwk',
        keyMaterial.privateJwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
      );
      const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        privateKey,
        new TextEncoder().encode(payload)
      );
      const derSignature = convertP1363SignatureToDer(signature);
      return {
        clientKeyId: keyMaterial.keyId,
        clientTimestamp: timestamp,
        clientNonce: nonce,
        clientSignature: toHex(derSignature),
        ...(includePublicKey ? { clientPublicJwk: keyMaterial.publicJwk } : {}),
      };
    };

    const buildDesktopBridgeResponsePayload = (
      response: Record<string, unknown>,
      requestType: string,
      requestNonce: string,
      clientNonce: string,
      timestamp: string
    ) =>
      JSON.stringify({
        type: requestType,
        extensionId: EXTENSION_ID,
        requestNonce,
        clientNonce,
        timestamp,
        response,
      });

    const verifyDesktopBridgeResponse = async (
      requestMessage: Record<string, unknown>,
      response: NativeHostResponse
    ) => {
      const auth = (response?.desktopAuth || null) as DesktopAuthEnvelope | null;
      if (!auth || typeof auth !== 'object') {
        throw new Error('DESKTOP_AUTH_MISSING');
      }

      const timestamp = typeof auth.timestamp === 'string' ? auth.timestamp.trim() : '';
      const signatureHex = typeof auth.signature === 'string' ? auth.signature.trim() : '';
      const keyId = typeof auth.keyId === 'string' ? auth.keyId.trim() : '';
      const requestNonce = typeof auth.requestNonce === 'string' ? auth.requestNonce.trim() : '';
      const clientNonce = typeof auth.clientNonce === 'string' ? auth.clientNonce.trim() : '';
      const responseBody = { ...response };
      delete responseBody.desktopAuth;

      if (!timestamp || !signatureHex || !keyId) {
        throw new Error('DESKTOP_AUTH_INVALID');
      }

      const timestampValue = Number(timestamp);
      if (!Number.isFinite(timestampValue) || Math.abs(Date.now() - timestampValue) > 15_000) {
        throw new Error('DESKTOP_AUTH_EXPIRED');
      }

      const expectedRequestNonce =
        typeof requestMessage.requestNonce === 'string' ? requestMessage.requestNonce.trim() : '';
      const expectedClientNonce =
        typeof requestMessage.clientNonce === 'string' ? requestMessage.clientNonce.trim() : '';
      if (requestNonce !== expectedRequestNonce || clientNonce !== expectedClientNonce) {
        throw new Error('DESKTOP_AUTH_CONTEXT_MISMATCH');
      }

      const suppliedPublicJwk = normalizeClientPublicJwk(auth.publicJwk);
      let identity = runtimeDesktopBridgeIdentity || (await loadRuntimeDesktopBridgeIdentity());

      if (!identity) {
        if (!suppliedPublicJwk) {
          throw new Error('DESKTOP_AUTH_KEY_MISSING');
        }
        const derivedKeyId = await computeClientKeyId(suppliedPublicJwk);
        if (derivedKeyId !== keyId) {
          throw new Error('DESKTOP_AUTH_KEY_ID_MISMATCH');
        }
        identity = await storeRuntimeDesktopBridgeIdentity(suppliedPublicJwk, keyId);
      } else if (identity.keyId !== keyId) {
        if (suppliedPublicJwk) {
          const derivedKeyId = await computeClientKeyId(suppliedPublicJwk);
          if (derivedKeyId !== keyId) {
            throw new Error('DESKTOP_AUTH_KEY_ID_MISMATCH');
          }
          identity = await storeRuntimeDesktopBridgeIdentity(suppliedPublicJwk, keyId);
        } else {
          throw new Error('DESKTOP_AUTH_KEY_ROTATED');
        }
      }

      const payload = buildDesktopBridgeResponsePayload(
        responseBody,
        typeof requestMessage.type === 'string' ? requestMessage.type : '',
        requestNonce,
        clientNonce,
        timestamp
      );
      const verifyKey = await crypto.subtle.importKey(
        'jwk',
        identity.publicJwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify']
      );
      const signature = convertDerSignatureToP1363(hexToUint8(signatureHex));
      const ok = await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        verifyKey,
        signature,
        new TextEncoder().encode(payload)
      );

      if (!ok) {
        throw new Error('DESKTOP_AUTH_SIGNATURE_INVALID');
      }

      return responseBody;
    };

    const getActivePairingSecret = () => runtimePairingSecret || DESKTOP_PAIRING_SECRET;
    const isLoopbackSyncActive = () => {
      // Runtime/build secret mevcutsa ve fallback aciksa loopback'e izin ver.
      // DESKTOP_SYNC_ENABLED legacy env bayragidir; runtime pairing varsa bloklamamali.
      return LOOPBACK_FALLBACK_ENABLED && Boolean(getActivePairingSecret());
    };
    const getActiveUiLanguage = () => runtimeUiLanguage;

    // Service worker yeniden başladığında durumu geri yükle
    // NOT: Cache (şifreler) bellekte tutulur ve SW ölümünde kaybolur.
    // Bu güvenli davranıştır - kasa yeniden açılana kadar veri gelmez.
    const restoreVaultState = async () => {
      try {
        const result = await browser.storage.session.get('aegis_vault_unlocked');
        if (result.aegis_vault_unlocked === true) {
          isVaultUnlocked = true;
          console.log('[Aegis Vault] ℹ️ Önceki oturum durumu geri yüklendi (cache bekleniyor).');
        }
      } catch {
        // storage.session her ortamda mevcut olmayabilir
      }
    };
    restoreVaultState();
    loadRuntimePairingSecret();
    loadRuntimeUiLanguage();
    void loadAutosaveQueue();
    void ensureRuntimeInstallationId();
    void loadRuntimePairingKeyMaterial();
    void loadRuntimeDesktopBridgeIdentity();

    const hexToUint8 = (hex: string) => {
      const normalized = (hex || '').trim();
      if (!normalized || normalized.length % 2 !== 0) return new Uint8Array();
      const bytes = new Uint8Array(normalized.length / 2);
      for (let i = 0; i < normalized.length; i += 2) {
        bytes[i / 2] = parseInt(normalized.substring(i, i + 2), 16);
      }
      return bytes;
    };

    const decodeDerLength = (bytes: Uint8Array, offset: number) => {
      const first = bytes[offset];
      if (typeof first !== 'number') throw new Error('INVALID_DER_LENGTH');
      if ((first & 0x80) === 0) {
        return { length: first, bytesRead: 1 };
      }
      const octetCount = first & 0x7f;
      if (octetCount <= 0 || octetCount > 4 || offset + 1 + octetCount > bytes.length) {
        throw new Error('INVALID_DER_LENGTH');
      }
      let length = 0;
      for (let i = 0; i < octetCount; i += 1) {
        length = (length << 8) | bytes[offset + 1 + i];
      }
      return { length, bytesRead: 1 + octetCount };
    };

    const normalizeDerInteger = (value: Uint8Array, size: number) => {
      let normalized = value;
      while (normalized.length > 0 && normalized[0] === 0) {
        normalized = normalized.slice(1);
      }
      if (normalized.length > size) throw new Error('INVALID_DER_INTEGER');
      const result = new Uint8Array(size);
      result.set(normalized, size - normalized.length);
      return result;
    };

    const convertDerSignatureToP1363 = (signature: Uint8Array, size = 32) => {
      if (signature.length < 8 || signature[0] !== 0x30) {
        throw new Error('INVALID_DER_SIGNATURE');
      }
      const sequenceLength = decodeDerLength(signature, 1);
      let offset = 1 + sequenceLength.bytesRead;
      if (offset + sequenceLength.length > signature.length) {
        throw new Error('INVALID_DER_SIGNATURE');
      }
      if (signature[offset] !== 0x02) {
        throw new Error('INVALID_DER_SIGNATURE');
      }
      const rLength = decodeDerLength(signature, offset + 1);
      const rStart = offset + 1 + rLength.bytesRead;
      const rEnd = rStart + rLength.length;
      if (rEnd > signature.length) {
        throw new Error('INVALID_DER_SIGNATURE');
      }
      const r = signature.slice(rStart, rEnd);
      offset = rEnd;
      if (signature[offset] !== 0x02) {
        throw new Error('INVALID_DER_SIGNATURE');
      }
      const sLength = decodeDerLength(signature, offset + 1);
      const sStart = offset + 1 + sLength.bytesRead;
      const sEnd = sStart + sLength.length;
      if (sEnd > signature.length) {
        throw new Error('INVALID_DER_SIGNATURE');
      }
      const s = signature.slice(sStart, sEnd);
      const normalizedR = normalizeDerInteger(r, size);
      const normalizedS = normalizeDerInteger(s, size);
      return Uint8Array.from([...normalizedR, ...normalizedS]);
    };

    const toHex = (buffer: ArrayBuffer) => {
      const bytes = new Uint8Array(buffer);
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    };

    const trimLeadingZeroes = (bytes: Uint8Array) => {
      let start = 0;
      while (start < bytes.length - 1 && bytes[start] === 0) {
        start += 1;
      }
      return bytes.slice(start);
    };

    const encodeDerLength = (length: number) => {
      if (length < 0x80) {
        return Uint8Array.from([length]);
      }
      const octets: number[] = [];
      let remaining = length;
      while (remaining > 0) {
        octets.unshift(remaining & 0xff);
        remaining >>= 8;
      }
      return Uint8Array.from([0x80 | octets.length, ...octets]);
    };

    const encodeDerInteger = (value: Uint8Array) => {
      const normalized = trimLeadingZeroes(value);
      const needsPadding = (normalized[0] & 0x80) !== 0;
      const body = needsPadding ? Uint8Array.from([0, ...normalized]) : normalized;
      return Uint8Array.from([0x02, ...encodeDerLength(body.length), ...body]);
    };

    const convertP1363SignatureToDer = (signature: ArrayBuffer) => {
      const bytes = new Uint8Array(signature);
      if (bytes.length % 2 !== 0) {
        throw new Error('INVALID_ECDSA_SIGNATURE_LENGTH');
      }
      const half = bytes.length / 2;
      const r = bytes.slice(0, half);
      const s = bytes.slice(half);
      const encodedR = encodeDerInteger(r);
      const encodedS = encodeDerInteger(s);
      const sequenceBody = Uint8Array.from([...encodedR, ...encodedS]);
      return Uint8Array.from([0x30, ...encodeDerLength(sequenceBody.length), ...sequenceBody])
        .buffer;
    };

    const generateRequestNonce = () => {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    };

    const normalizeBridgeDomain = (value: unknown) => {
      if (typeof value !== 'string') return '';
      const trimmed = value.trim().toLowerCase();
      if (!trimmed) return '';
      try {
        const parsed = trimmed.includes('://') ? new URL(trimmed) : new URL(`https://${trimmed}`);
        return parsed.hostname.replace(/^www\./, '');
      } catch {
        return trimmed.replace(/^www\./, '');
      }
    };

    const normalizeAutofillSitePolicy = (value: unknown): AutofillSitePolicy =>
      value === 'ask' || value === 'block' ? value : 'allow';

    const isExtensionSurface = (senderInfo: RuntimeMessageSenderWithOrigin) =>
      !senderInfo?.tab &&
      ((typeof senderInfo?.url === 'string' &&
        (senderInfo.url.startsWith('chrome-extension://') ||
          senderInfo.url.startsWith('moz-extension://'))) ||
        (typeof senderInfo?.origin === 'string' &&
          (senderInfo.origin.startsWith('chrome-extension://') ||
            senderInfo.origin.startsWith('moz-extension://'))));

    const getSiteAutofillPolicies = async (): Promise<Record<string, AutofillSitePolicy>> => {
      try {
        const result = await browser.storage.local.get(SITE_AUTOFILL_POLICY_STORAGE_KEY);
        const raw = result[SITE_AUTOFILL_POLICY_STORAGE_KEY];
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
        const policies = Object.fromEntries(
          Object.entries(raw as Record<string, unknown>)
            .map(([domain, policy]) => [
              normalizeBridgeDomain(domain),
              normalizeAutofillSitePolicy(policy),
            ])
            .filter(([domain]) => Boolean(domain))
        );
        runtimeSiteAutofillPolicies = policies;
        return policies;
      } catch {
        runtimeSiteAutofillPolicies = {};
        return {};
      }
    };

    const getSiteAutofillPolicy = async (domain: string): Promise<AutofillSitePolicy> => {
      const normalizedDomain = normalizeBridgeDomain(domain);
      if (!normalizedDomain) return 'allow';
      const policies = await getSiteAutofillPolicies();
      return normalizeAutofillSitePolicy(policies[normalizedDomain]);
    };

    const setSiteAutofillPolicy = async (domain: string, policy: AutofillSitePolicy) => {
      const normalizedDomain = normalizeBridgeDomain(domain);
      if (!normalizedDomain) return false;
      const policies = await getSiteAutofillPolicies();
      policies[normalizedDomain] = normalizeAutofillSitePolicy(policy);
      runtimeSiteAutofillPolicies = policies;
      await browser.storage.local.set({ [SITE_AUTOFILL_POLICY_STORAGE_KEY]: policies });
      return true;
    };

    void getSiteAutofillPolicies();

    const sendNativeHostMessage = async (
      message: Record<string, unknown>,
      allowRecovery: boolean = true
    ) => {
      if (!NATIVE_MESSAGING_ENABLED || !NATIVE_HOST_NAME || !EXTENSION_ID) {
        return {
          ok: false,
          error: 'NATIVE_HOST_UNAVAILABLE',
        } satisfies NativeHostResponse;
      }
      try {
        const runtimeApi = browser.runtime as typeof browser.runtime & {
          sendNativeMessage?: (
            application: string,
            message: Record<string, unknown>
          ) => Promise<NativeHostResponse>;
        };
        if (typeof runtimeApi?.sendNativeMessage !== 'function') {
          return {
            ok: false,
            error: 'NATIVE_HOST_UNAVAILABLE',
          } satisfies NativeHostResponse;
        }
        const activePairingSecret = await ensureActivePairingSecret();
        const clientInfo = await buildClientInfo();
        const signedEnvelope = await signNativeBridgeMessage(message, clientInfo);
        const requestMessage = {
          ...message,
          extensionId: EXTENSION_ID,
          clientInfo,
          ...signedEnvelope,
          ...(activePairingSecret ? { pairingSecret: activePairingSecret } : {}),
        };
        const rawResponse = await runtimeApi.sendNativeMessage(NATIVE_HOST_NAME, requestMessage);
        if (!rawResponse || typeof rawResponse !== 'object') {
          return {
            ok: false,
            error: 'INVALID_NATIVE_RESPONSE',
          } satisfies NativeHostResponse;
        }
        if (!('desktopAuth' in rawResponse) || rawResponse.desktopAuth == null) {
          if (!warnedAboutLegacyNativeResponse) {
            warnedAboutLegacyNativeResponse = true;
            console.warn(
              '[Aegis Vault] Native host returned an unsigned legacy response; accepting compatibility mode.'
            );
          }
          return rawResponse;
        }
        try {
          return await verifyDesktopBridgeResponse(requestMessage, rawResponse);
        } catch (error) {
          const errorCode = error instanceof Error ? error.message : 'NATIVE_HOST_UNAVAILABLE';
          const canRecover =
            allowRecovery &&
            errorCode !== 'DESKTOP_AUTH_MISSING' &&
            errorCode !== 'DESKTOP_AUTH_INVALID' &&
            errorCode !== 'DESKTOP_AUTH_EXPIRED' &&
            errorCode !== 'DESKTOP_AUTH_CONTEXT_MISMATCH';

          if (canRecover) {
            try {
              await clearRuntimeDesktopBridgeIdentity();
              if (message.type !== 'GET_PAIRING_STATUS') {
                const pairingStatusRequest = {
                  type: 'GET_PAIRING_STATUS',
                };
                const pairingClientInfo = await buildClientInfo();
                const pairingSignedEnvelope = await signNativeBridgeMessage(
                  pairingStatusRequest,
                  pairingClientInfo
                );
                const pairingRequestMessage = {
                  ...pairingStatusRequest,
                  extensionId: EXTENSION_ID,
                  clientInfo: pairingClientInfo,
                  ...pairingSignedEnvelope,
                  ...(activePairingSecret ? { pairingSecret: activePairingSecret } : {}),
                };
                const pairingStatusResponse = await runtimeApi.sendNativeMessage(
                  NATIVE_HOST_NAME,
                  pairingRequestMessage
                );
                if (pairingStatusResponse && typeof pairingStatusResponse === 'object') {
                  await verifyDesktopBridgeResponse(pairingRequestMessage, pairingStatusResponse);
                }
              }
              return await sendNativeHostMessage(message, false);
            } catch {
              return {
                ok: false,
                error: errorCode,
              } satisfies NativeHostResponse;
            }
          }

          return {
            ok: false,
            error: errorCode,
          } satisfies NativeHostResponse;
        }
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'NATIVE_HOST_UNAVAILABLE',
        } satisfies NativeHostResponse;
      }
    };

    const getNativeVaultStatus = async () => {
      const response = await sendNativeHostMessage({ type: 'GET_VAULT_STATUS' });
      if (!response || typeof response !== 'object') return null;
      return {
        isUnlocked: Boolean(response.isUnlocked),
        entryCount: Number(response.entryCount || 0),
      } satisfies DesktopVaultStatus;
    };

    const getNativePairingStatus = async () => {
      const response = await sendNativeHostMessage({ type: 'GET_PAIRING_STATUS' });
      if (!response || typeof response !== 'object') return null;
      return {
        paired: Boolean(response.paired),
        pairedAt: typeof response.pairedAt === 'string' ? response.pairedAt : '',
        secretSource: typeof response.secretSource === 'string' ? response.secretSource : 'none',
        pairingMode: typeof response.pairingMode === 'string' ? response.pairingMode : 'none',
        clientKeyId: typeof response.clientKeyId === 'string' ? response.clientKeyId : '',
        clientLabel: typeof response.clientLabel === 'string' ? response.clientLabel : '',
        deviceFingerprint:
          typeof response.deviceFingerprint === 'string' ? response.deviceFingerprint : '',
        lastUsedAt: typeof response.lastUsedAt === 'string' ? response.lastUsedAt : '',
        lastApprovedAt: typeof response.lastApprovedAt === 'string' ? response.lastApprovedAt : '',
        riskFlags: Array.isArray(response.riskFlags)
          ? response.riskFlags.filter((item): item is string => typeof item === 'string')
          : [],
        riskLevel: typeof response.riskLevel === 'string' ? response.riskLevel : 'low',
        pairingHistory: Array.isArray(response.pairingHistory)
          ? response.pairingHistory.filter(
              (
                item
              ): item is { at?: string; type?: string; detail?: string; riskFlags?: string[] } =>
                Boolean(item) && typeof item === 'object'
            )
          : [],
      } satisfies DesktopPairingStatus;
    };

    const getNativeUiLanguage = async () => {
      const response = await sendNativeHostMessage({ type: 'GET_UI_LANGUAGE' });
      if (!response || typeof response !== 'object') return null;
      return normalizeUiLanguage(response.language);
    };

    const initNativePairing = async () => {
      const response = await sendNativeHostMessage({
        type: 'INIT_PAIRING',
        browserName: browser.runtime.getManifest().name || 'Aegis Vault',
      });
      if (!response || typeof response !== 'object') {
        // Native host başarısız ise, loopback fallback dene
        if (LOOPBACK_FALLBACK_ENABLED) {
          return initLoopbackFallbackPairing();
        }
        return { ok: false, error: 'NATIVE_HOST_UNAVAILABLE' };
      }
      if (!response.ok) {
        return {
          ok: false,
          error: typeof response.error === 'string' ? response.error : 'PAIRING_FAILED',
        };
      }
      const secret = typeof response.secret === 'string' ? response.secret.trim() : '';
      const pairedAt = typeof response.pairedAt === 'string' ? response.pairedAt : '';
      if (secret.length < 32) {
        return { ok: false, error: 'INVALID_PAIRING_SECRET' };
      }
      return {
        ok: true,
        secret,
        pairedAt,
        pairingMode:
          typeof response.pairingMode === 'string' ? response.pairingMode : 'signed-p256-v1',
        clientKeyId: typeof response.clientKeyId === 'string' ? response.clientKeyId : '',
      } satisfies NativePairingInitResult;
    };

    const initLoopbackFallbackPairing = async () => {
      // Loopback HTTP'nden pairing secret'i iste
      let extensionId = EXTENSION_ID;

      // Ensure we have an ID
      if (!extensionId || extensionId.length === 0) {
        extensionId = browser?.runtime?.id || '';
      }

      if (!extensionId) {
        console.error('[Aegis Vault] ❌ EXTENSION_ID bulunamadı. Fallback pairing iptal edildi.');
        return { ok: false, error: 'EXTENSION_ID_MISSING' };
      }

      console.log(
        `[Aegis Vault] 🔄 Fallback pairing başlatılıyor (Aktif ID: ${extensionId.substring(0, 8)}...)`
      );

      const hosts = ['127.0.0.1', 'localhost'];
      for (const host of hosts) {
        try {
          const url = `http://${host}:23456/api/pairing-secret?extensionId=${encodeURIComponent(extensionId)}`;
          console.log(`[Aegis Vault] 🔄 Fallback: ${url} çağrılıyor...`);
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'X-Aegis-Client': 'extension',
              'X-Aegis-Extension-Id': extensionId,
            },
          });
          console.log(`[Aegis Vault] 🔄 Response status: ${response.status}`);
          if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            console.warn(
              `[Aegis Vault] 🔄 Fallback: ${host} failed with status ${response.status}: ${errorText}`
            );
            continue;
          }
          const data = await response.json();
          if (data.secret && typeof data.secret === 'string' && data.secret.length >= 32) {
            console.log(`[Aegis Vault] ✅ Fallback pairing başarılı (secret alındı)`);
            const now = new Date().toISOString();
            return {
              ok: true,
              secret: data.secret,
              pairedAt: now,
              pairingMode: 'loopback-fallback-v1',
              clientKeyId: '',
            } satisfies NativePairingInitResult;
          }
        } catch (err) {
          console.warn(
            `[Aegis Vault] 🔄 Fallback error (${host}):`,
            err instanceof Error ? err.message : String(err)
          );
        }
      }
      console.error('[Aegis Vault] ❌ Fallback pairing failed: LOOPBACK_FALLBACK_UNAVAILABLE');
      return { ok: false, error: 'LOOPBACK_FALLBACK_UNAVAILABLE' };
    };

    const clearNativePairing = async () => {
      const response = await sendNativeHostMessage({ type: 'CLEAR_PAIRING' });
      return Boolean(response && typeof response === 'object' && response.ok);
    };

    const getNativeDomainCredentials = async (domain: string) => {
      const response = await sendNativeHostMessage({
        type: 'GET_DOMAIN_CREDS',
        domain,
        requestNonce: generateRequestNonce(),
      });
      if (!response || typeof response !== 'object') return [];
      const data = response.data;
      return Array.isArray(data) ? data : [];
    };

    const getNativeDomainPasskeys = async (domain: string) => {
      const response = await sendNativeHostMessage({
        type: 'GET_DOMAIN_PASSKEYS',
        domain,
        requestNonce: generateRequestNonce(),
      });
      if (!response || typeof response !== 'object') return [];
      const data = response.data;
      return Array.isArray(data) ? data : [];
    };

    const signDesktopChallenge = async (tokenHex: string, payload: string) => {
      const keyBytes = hexToUint8(tokenHex);
      const payloadBytes = new TextEncoder().encode(payload);
      const key = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const sig = await crypto.subtle.sign('HMAC', key, payloadBytes);
      return toHex(sig);
    };

    const signPairingPayload = async (
      method: 'GET',
      path:
        | '/api/challenge'
        | '/api/status'
        | '/api/vault'
        | '/api/domain-credentials'
        | '/api/domain-passkeys'
    ) => {
      const activePairingSecret = await ensureActivePairingSecret();
      if (!activePairingSecret || !EXTENSION_ID) return null;
      const ts = Date.now().toString();
      const payload = `${method}:${path}:${ts}:${EXTENSION_ID}`;
      const keyBytes = new TextEncoder().encode(activePairingSecret);
      const payloadBytes = new TextEncoder().encode(payload);
      const key = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const sig = await crypto.subtle.sign('HMAC', key, payloadBytes);
      return {
        ts,
        proof: toHex(sig),
      };
    };

    // Desktop status endpoint'ini challenge ile çağır
    const getDesktopStatus = async () => {
      const activePairingSecret = await ensureActivePairingSecret();
      if (!isLoopbackSyncActive() || !activePairingSecret || !EXTENSION_ID) return null;
      const hosts = ['127.0.0.1', 'localhost'];
      for (const host of hosts) {
        try {
          const challenge = await getDesktopChallenge(host);
          if (!challenge) continue;
          const ts = Date.now().toString();
          const normalizedDomain = '';
          const payload = `GET:/api/status:${challenge.nonce}:${ts}:${EXTENSION_ID}:${normalizedDomain}`;
          const signature = await signDesktopChallenge(challenge.token, payload);
          const statusRes = await fetch(`http://${host}:23456/api/status`, {
            method: 'GET',
            mode: 'cors',
            headers: {
              'X-Aegis-Client': 'extension',
              'X-Aegis-Extension-Id': EXTENSION_ID,
              'X-Aegis-Challenge-Nonce': challenge.nonce,
              'X-Aegis-Challenge-Ts': ts,
              'X-Aegis-Challenge-Signature': signature,
            },
          });
          if (!statusRes.ok) continue;
          const status = await statusRes.json();
          return {
            isUnlocked: Boolean(status.isUnlocked),
            entryCount: Number(status.entryCount || 0),
          };
        } catch {
          // try next host
        }
      }
      return null;
    };

    const getDesktopChallenge = async (host: string) => {
      const activePairingSecret = await ensureActivePairingSecret();
      if (!isLoopbackSyncActive() || !activePairingSecret || !EXTENSION_ID) return null;
      try {
        const pairing = await signPairingPayload('GET', '/api/challenge');
        if (!pairing) {
          console.debug(`[Aegis Vault] ❌ getDesktopChallenge no pairing`);
          return null;
        }
        const response = await fetch(`http://${host}:23456/api/challenge`, {
          method: 'GET',
          mode: 'cors',
          headers: {
            'X-Aegis-Client': 'extension',
            'X-Aegis-Extension-Id': EXTENSION_ID,
            'X-Aegis-Pairing-Ts': pairing.ts,
            'X-Aegis-Pairing-Proof': pairing.proof,
          },
        });
        if (!response.ok) {
          const t = await response.text();
          console.debug(`[Aegis Vault] ❌ getDesktopChallenge !ok: ${response.status} => ${t}`);
          return null;
        }
        const challenge = await response.json();
        if (!challenge?.nonce || !challenge?.token || !challenge?.expiresAt) {
          console.debug(`[Aegis Vault] ❌ getDesktopChallenge missing fields:`, challenge);
          return null;
        }
        if (
          Number(challenge.expiresAt) - Date.now() <= 0 ||
          Number(challenge.expiresAt) - Date.now() > DESKTOP_CHALLENGE_TTL_MS * 2
        ) {
          console.debug(
            `[Aegis Vault] ❌ getDesktopChallenge TTL issue: expiresAt=${challenge.expiresAt}, diff=${Number(challenge.expiresAt) - Date.now()}`
          );
          return null;
        }
        return challenge;
      } catch (err) {
        console.debug(`[Aegis Vault] ❌ getDesktopChallenge fetch err:`, err);
        return null;
      }
    };

    const desktopSignedGet = async (
      host: string,
      path: '/api/status' | '/api/vault' | '/api/domain-credentials' | '/api/domain-passkeys',
      requestDomain: string = ''
    ) => {
      const activePairingSecret = await ensureActivePairingSecret();
      if (!isLoopbackSyncActive() || !activePairingSecret || !EXTENSION_ID) return null;
      const challenge = await getDesktopChallenge(host);
      if (!challenge) return null;

      const pairing = await signPairingPayload('GET', path);
      if (!pairing) return null;
      const ts = Date.now().toString();
      const normalizedDomain = requestDomain.toLowerCase().trim();
      const payload = `GET:${path}:${challenge.nonce}:${ts}:${EXTENSION_ID}:${normalizedDomain}`;
      const signature = await signDesktopChallenge(challenge.token, payload);

      try {
        const url =
          path === '/api/domain-credentials'
            ? `http://${host}:23456${path}?domain=${encodeURIComponent(normalizedDomain)}`
            : `http://${host}:23456${path}`;
        const finalResponse = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          headers: {
            'X-Aegis-Client': 'extension',
            'X-Aegis-Extension-Id': EXTENSION_ID,
            'X-Aegis-Pairing-Ts': pairing.ts,
            'X-Aegis-Pairing-Proof': pairing.proof,
            ...(normalizedDomain ? { 'X-Aegis-Request-Domain': normalizedDomain } : {}),
            'X-Aegis-Challenge-Nonce': challenge.nonce,
            'X-Aegis-Challenge-Ts': ts,
            'X-Aegis-Challenge-Signature': signature,
          },
        });
        if (!finalResponse.ok) {
          const dbgTxt = await finalResponse.text();
          console.debug(
            `[Aegis Vault] ❌ desktopSignedGet path=${path} !ok: ${finalResponse.status} => ${dbgTxt}`
          );
        }
        return finalResponse;
      } catch (err) {
        console.debug(`[Aegis Vault] ❌ desktopSignedGet fetch err for path=${path}:`, err);
        return null;
      }
    };

    const fetchDomainCredentialsFromDesktop = async (domain: string) => {
      const nativeMatches = await getNativeDomainCredentials(domain);
      if (nativeMatches.length > 0) {
        return nativeMatches;
      }

      const activePairingSecret = await ensureActivePairingSecret();
      if (!isLoopbackSyncActive() || !activePairingSecret) return [];
      const normalizedDomain = domain.toLowerCase().trim();
      if (!normalizedDomain) return [];

      const hosts = ['127.0.0.1', 'localhost'];
      for (const host of hosts) {
        try {
          const res = await desktopSignedGet(host, '/api/domain-credentials', normalizedDomain);
          if (!res || !res.ok) {
            continue;
          }
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        } catch {
          // try next host
        }
      }

      return [];
    };

    const fetchDomainPasskeysFromDesktop = async (domain: string) => {
      const nativeMatches = await getNativeDomainPasskeys(domain);
      if (nativeMatches.length > 0) {
        return nativeMatches;
      }

      const activePairingSecret = await ensureActivePairingSecret();
      if (!isLoopbackSyncActive() || !activePairingSecret) return [];
      const normalizedDomain = domain.toLowerCase().trim();
      if (!normalizedDomain) return [];

      const hosts = ['127.0.0.1', 'localhost'];
      for (const host of hosts) {
        try {
          const res = await desktopSignedGet(host, '/api/domain-passkeys', normalizedDomain);
          if (!res || !res.ok) {
            continue;
          }
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        } catch {
          // try next host
        }
      }

      return [];
    };

    /**
     * 🖥️ Desktop Sync (Electron)
     * Masaüstü uygulaması açık ve kilitliyse (port 23456), verileri oradan çek.
     * Bu, PWA (localhost:5173) kapalı olsa bile eklentinin çalışmasını sağlar.
     * MV3 için setInterval yerine alarms kullanıyoruz (Sürekli uyanık kalma garantisi için).
     */
    const pollDesktopVault = async () => {
      if (NATIVE_MESSAGING_ENABLED) {
        try {
          const nativeStatus = await getNativeVaultStatus();
          if (nativeStatus) {
            if (!nativeStatus.isUnlocked) {
              if (isVaultUnlocked) {
                console.log('[Aegis Vault] 🖥️ Native host üzerinden kasa kilitli tespit edildi.');
                secureWipeCache();
                clearAllBadges();
              }
            } else {
              if (!isVaultUnlocked) {
                isVaultUnlocked = true;
                persistVaultState(true);
                console.log('[Aegis Vault] ✅ Native messaging köprüsü üzerinden kasa açık.');
              }
              resetSessionTimeout();
              return;
            }
          }
        } catch {
          // loopback fallback yalnızca açıkça etkinse kullanılacak
        }
      }

      if (!LOOPBACK_FALLBACK_ENABLED) {
        return;
      }

      const activePairingSecret = await ensureActivePairingSecret();
      if (!isLoopbackSyncActive() || !activePairingSecret) {
        return;
      }
      const hosts = ['127.0.0.1', 'localhost'];

      for (const host of hosts) {
        try {
          console.debug(
            `[Aegis Vault] 🔍 Desktop poll başlatılıyor: ${host}, EXTENSION_ID: ${EXTENSION_ID.substring(0, 8)}...`
          );

          // 1. Status endpoint — kasa açık mı?
          const statusRes = await desktopSignedGet(host, '/api/status');
          if (!statusRes) {
            console.debug(
              `[Aegis Vault] ⚠️ Status isteği null döndü (${host}) — challenge başarısız veya fetch engellendi`
            );
            continue;
          }
          if (!statusRes.ok) {
            const errText = await statusRes.text().catch(() => '');
            console.warn(`[Aegis Vault] ⚠️ Status ${statusRes.status}: ${errText} (${host})`);
            continue;
          }
          const status = await statusRes.json();
          console.debug(`[Aegis Vault] 📊 Status yanıtı (${host}):`, status);

          if (!status.isUnlocked) {
            if (isVaultUnlocked) {
              console.log('[Aegis Vault] 🖥️ Masaüstü kasası kilitli tespit edildi.');
              secureWipeCache();
              clearAllBadges();
            }
            return;
          }

          if (!isVaultUnlocked) {
            isVaultUnlocked = true;
            persistVaultState(true);
            console.log(`[Aegis Vault] ✅ Masaüstü (${host}) erişilebilir ve kasa açık.`);
          }
          resetSessionTimeout();
          return;
        } catch (e) {
          console.debug(`[Aegis Vault] 🔍 Desktop sync deneme başarısız (${host}):`, e);
        }
      }
    };

    // Alarmları kur ve dinle (MV3 Service Worker dostu polling)
    browser.alarms.create('desktop-sync', { periodInMinutes: 0.15 }); // ~9 saniyede bir
    browser.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'desktop-sync') {
        pollDesktopVault();
      }
    });

    // İlk yüklemede ve SW uyandığında hemen kontrol et
    pollDesktopVault();

    // Oturum zaman aşımı (failsafe): 5 dk hareketsizlikte cache temizlenir
    const SESSION_TIMEOUT_MS = 5 * 60 * 1000;
    let sessionTimeoutId: ReturnType<typeof setTimeout> | null = null;

    /**
     * 🧹 Güvenli Bellek Temizleme (Secure Memory Wipe)
     * Plaintext şifreleri null byte ile üzerine yazar, sonra diziyi temizler.
     */
    const secureWipeCache = (wipeAutosaveQueue: boolean = true) => {
      for (let i = 0; i < vaultCache.length; i++) {
        if (vaultCache[i]) {
          if (typeof vaultCache[i].pass === 'string') {
            vaultCache[i].pass = '\0'.repeat(vaultCache[i].pass.length);
          }
          if (typeof vaultCache[i].username === 'string') {
            vaultCache[i].username = '\0'.repeat(vaultCache[i].username.length);
          }
          vaultCache[i] = null;
        }
      }
      vaultCache.length = 0;
      if (wipeAutosaveQueue) {
        clearAutosaveQueue();
      }
      isVaultUnlocked = false;
      persistVaultState(false);
      console.log('[Aegis Vault] 🔒 Önbellek güvenli bir şekilde temizlendi.');
    };

    const resetSessionTimeout = () => {
      if (sessionTimeoutId !== null) {
        clearTimeout(sessionTimeoutId);
      }
      sessionTimeoutId = setTimeout(() => {
        console.warn('[Aegis Vault] ⏰ Oturum zaman aşımı. Önbellek temizleniyor.');
        secureWipeCache();
        clearAllBadges();
      }, SESSION_TIMEOUT_MS);
    };

    const clearAllBadges = async () => {
      try {
        const tabs = await browser.tabs.query({});
        for (const tab of tabs) {
          if (tab.id) {
            browser.action.setBadgeText({ text: '', tabId: tab.id });
          }
        }
      } catch {
        // badge temizleme hatasi ana akisi durdurmamali
      }
    };

    const getDomain = (url: string) => {
      try {
        return new URL(url).hostname.replace(/^www\./, '');
      } catch {
        return '';
      }
    };

    const isDomainMatch = (entryWebsite: string, domain: string) => {
      const normalizedEntry = entryWebsite.toLowerCase().trim();
      const normalizedDomain = domain.toLowerCase().trim();
      return (
        normalizedEntry.includes(normalizedDomain) || normalizedDomain.includes(normalizedEntry)
      );
    };

    const getRequestKey = (sender: RuntimeMessageSenderWithOrigin, domain: string) => {
      const tabId = typeof sender?.tab?.id === 'number' ? sender.tab.id : 'unknown';
      return `${tabId}:${domain}`;
    };

    const cleanupNonceMap = (now: number) => {
      for (const [nonce, ts] of requestNonceMap.entries()) {
        if (now - ts > NONCE_TTL_MS) {
          requestNonceMap.delete(nonce);
        }
      }
      for (const [key, ts] of recentAutosaveMap.entries()) {
        if (now - ts > AUTOSAVE_MIN_INTERVAL_MS * 8) {
          recentAutosaveMap.delete(key);
        }
      }
    };

    const sanitizeVaultEntry = (entry: unknown): VaultCacheEntry | null => {
      if (!entry || typeof entry !== 'object') return null;
      const candidate = entry as Partial<VaultCacheEntry>;
      if (typeof candidate.pass !== 'string' || !candidate.pass) return null;
      if (typeof candidate.website !== 'string' || !candidate.website.trim()) return null;

      return {
        title: typeof candidate.title === 'string' ? candidate.title : '',
        username: typeof candidate.username === 'string' ? candidate.username : '',
        pass: candidate.pass,
        website: candidate.website,
        category: typeof candidate.category === 'string' ? candidate.category : '',
        cardDetails:
          candidate.cardDetails && typeof candidate.cardDetails === 'object'
            ? {
                cardholder_name:
                  typeof candidate.cardDetails.cardholder_name === 'string'
                    ? candidate.cardDetails.cardholder_name
                    : '',
                card_number:
                  typeof candidate.cardDetails.card_number === 'string'
                    ? candidate.cardDetails.card_number
                    : '',
                brand:
                  typeof candidate.cardDetails.brand === 'string'
                    ? candidate.cardDetails.brand
                    : '',
                expiry_month:
                  typeof candidate.cardDetails.expiry_month === 'string'
                    ? candidate.cardDetails.expiry_month
                    : '',
                expiry_year:
                  typeof candidate.cardDetails.expiry_year === 'string'
                    ? candidate.cardDetails.expiry_year
                    : '',
                cvv: typeof candidate.cardDetails.cvv === 'string' ? candidate.cardDetails.cvv : '',
                pin: typeof candidate.cardDetails.pin === 'string' ? candidate.cardDetails.pin : '',
                billing_zip:
                  typeof candidate.cardDetails.billing_zip === 'string'
                    ? candidate.cardDetails.billing_zip
                    : '',
                billing_address:
                  typeof candidate.cardDetails.billing_address === 'string'
                    ? candidate.cardDetails.billing_address
                    : '',
              }
            : null,
        identityDetails:
          candidate.identityDetails && typeof candidate.identityDetails === 'object'
            ? {
                document_type:
                  typeof candidate.identityDetails.document_type === 'string'
                    ? candidate.identityDetails.document_type
                    : '',
                identity_number:
                  typeof candidate.identityDetails.identity_number === 'string'
                    ? candidate.identityDetails.identity_number
                    : '',
                issuing_country:
                  typeof candidate.identityDetails.issuing_country === 'string'
                    ? candidate.identityDetails.issuing_country
                    : '',
                nationality:
                  typeof candidate.identityDetails.nationality === 'string'
                    ? candidate.identityDetails.nationality
                    : '',
                date_of_birth:
                  typeof candidate.identityDetails.date_of_birth === 'string'
                    ? candidate.identityDetails.date_of_birth
                    : '',
                issued_at:
                  typeof candidate.identityDetails.issued_at === 'string'
                    ? candidate.identityDetails.issued_at
                    : '',
                expires_at:
                  typeof candidate.identityDetails.expires_at === 'string'
                    ? candidate.identityDetails.expires_at
                    : '',
              }
            : null,
      };
    };

    const sanitizeAutosaveCredential = (entry: unknown): AutosaveCredentialPayload | null => {
      if (!entry || typeof entry !== 'object') return null;
      const candidate = entry as Partial<AutosaveCredentialPayload>;
      const website = typeof candidate.website === 'string' ? candidate.website.trim() : '';
      const pass = typeof candidate.pass === 'string' ? candidate.pass : '';
      if (!website || !pass) return null;

      return {
        title: typeof candidate.title === 'string' ? candidate.title.slice(0, 120) : '',
        username: typeof candidate.username === 'string' ? candidate.username.slice(0, 256) : '',
        pass: pass.slice(0, 1024),
        website: website.slice(0, 512),
        submittedAt:
          typeof candidate.submittedAt === 'string'
            ? candidate.submittedAt
            : new Date().toISOString(),
        source: 'browser_form',
      };
    };

    const fillAliasIntoTab = async (tabId: number, aliasEmail: string) => {
      const [result] = await browser.scripting.executeScript({
        target: { tabId },
        func: (value: string) => {
          const fillField = (el: HTMLInputElement, nextValue: string) => {
            el.focus();
            const nativeSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              'value'
            )?.set;
            if (nativeSetter) nativeSetter.call(el, nextValue);
            else el.value = nextValue;

            ['input', 'change'].forEach((eventName) => {
              el.dispatchEvent(new Event(eventName, { bubbles: true, cancelable: true }));
            });
            el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
            el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
            el.dispatchEvent(new Event('blur', { bubbles: true }));
          };

          const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input')).filter(
            (input) => {
              const style = window.getComputedStyle(input);
              return (
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                input.offsetParent !== null &&
                !input.disabled &&
                !input.readOnly
              );
            }
          );

          const activeInput =
            document.activeElement instanceof HTMLInputElement ? document.activeElement : null;
          const isAliasTarget = (input: HTMLInputElement) => {
            const type = (input.type || 'text').toLowerCase();
            const autocomplete = (input.autocomplete || '').toLowerCase();
            const descriptor = [
              input.name || '',
              input.id || '',
              input.placeholder || '',
              autocomplete,
            ]
              .join(' ')
              .toLowerCase();
            return (
              type === 'email' ||
              type === 'text' ||
              type === 'username' ||
              autocomplete.includes('email') ||
              autocomplete.includes('username') ||
              /(email|mail|user|login|account)/.test(descriptor)
            );
          };

          const target =
            (activeInput && isAliasTarget(activeInput) ? activeInput : null) ||
            inputs.find((input) => (input.type || '').toLowerCase() === 'email') ||
            inputs.find(isAliasTarget) ||
            null;

          if (!target) {
            return { success: false, reason: 'NO_EDITABLE_FIELD' };
          }

          fillField(target, value);
          return { success: true };
        },
        args: [aliasEmail],
      });

      return (result?.result || { success: false, reason: 'UNKNOWN' }) as {
        success: boolean;
        reason?: string;
      };
    };

    const requestGeneratedAlias = async (domain: string, requestedTitle = '') => {
      const normalizedDomain = normalizeBridgeDomain(domain);
      if (!normalizedDomain) {
        throw new Error('INVALID_DOMAIN');
      }
      if (!NATIVE_MESSAGING_ENABLED) {
        throw new Error('ALIAS_GENERATION_UNAVAILABLE');
      }

      const response = await sendNativeHostMessage({
        type: 'GENERATE_ALIAS',
        domain: normalizedDomain,
        requestNonce: generateRequestNonce(),
        title: requestedTitle || normalizedDomain,
      });

      if (!response || typeof response !== 'object' || !response.ok) {
        throw new Error(
          response && typeof response === 'object' && typeof response.error === 'string'
            ? response.error
            : 'ALIAS_GENERATION_FAILED'
        );
      }

      const alias =
        typeof response.alias === 'string'
          ? response.alias
          : typeof response.email === 'string'
            ? response.email
            : '';
      if (!alias) {
        throw new Error('ALIAS_GENERATION_FAILED');
      }

      return {
        alias,
        providerLabel:
          typeof response.providerLabel === 'string' ? response.providerLabel : 'Alias Provider',
        providerSyncStatus:
          typeof response.providerSyncStatus === 'string' ? response.providerSyncStatus : 'manual',
      };
    };

    const generateAliasForTab = async (tabId: number, rawUrl: string, tabTitle = '') => {
      const domain = getDomain(rawUrl);
      if (!domain) {
        return { success: false, error: 'INVALID_DOMAIN' };
      }

      const generated = await requestGeneratedAlias(domain, tabTitle || domain);
      const fillResult = await fillAliasIntoTab(tabId, generated.alias);
      if (!fillResult.success) {
        return {
          success: false,
          error: fillResult.reason || 'NO_EDITABLE_FIELD',
          alias: generated.alias,
          providerLabel: generated.providerLabel,
          providerSyncStatus: generated.providerSyncStatus,
        };
      }

      return {
        success: true,
        alias: generated.alias,
        providerLabel: generated.providerLabel,
        providerSyncStatus: generated.providerSyncStatus,
      };
    };

    // Badge güncelleyici - SADECE cache'den çalışır
    const updateBadge = async (tabId: number, url?: string) => {
      if (!isVaultUnlocked || vaultCache.length === 0) {
        browser.action.setBadgeText({ text: '', tabId });
        return;
      }

      if (!url) return;
      const domain = getDomain(url);
      if (!domain) return;

      try {
        const matches = vaultCache.filter((p) => p.website && isDomainMatch(p.website, domain));
        if (matches.length > 0) {
          browser.action.setBadgeText({ text: matches.length.toString(), tabId });
          browser.action.setBadgeBackgroundColor({ color: '#22c55e', tabId });
        } else {
          browser.action.setBadgeText({ text: '', tabId });
        }
      } catch (error) {
        console.error(error);
      }
    };

    // Sekme olayları
    browser.tabs.onActivated.addListener(async (activeInfo) => {
      try {
        const tab = await browser.tabs.get(activeInfo.tabId);
        if (tab?.url) updateBadge(tab.id as number, tab.url);
      } catch {
        // sekme degisimi sirasinda gecici erisim hatalari olabilir
      }
    });

    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if ((changeInfo.url || changeInfo.status === 'complete') && tab?.url) {
        updateBadge(tabId, tab.url);
      }
    });

    // ──────────────────────────────────────────────────────────────────────
    // 📨 Mesaj İşleyici (Message Handler)
    // ──────────────────────────────────────────────────────────────────────
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const runtimeSender = sender as RuntimeMessageSenderWithOrigin;

      // ── SAVE_VAULT: Kasa açık, şifreleri al ──
      if (message.type === 'SAVE_VAULT') {
        // Önce mevcut cache'i güvenli şekilde temizle
        secureWipeCache(false);

        if (Array.isArray(message.data) && message.data.length > 0) {
          const sanitizedEntries = message.data
            .map((entry: unknown) => sanitizeVaultEntry(entry))
            .filter((entry): entry is VaultCacheEntry => Boolean(entry))
            .slice(0, 1000);

          vaultCache.push(...sanitizedEntries);
          isVaultUnlocked = true;
          persistVaultState(true);
          resetSessionTimeout();

          console.log('[Aegis Vault] ✅ Kasa Eşitlendi, Toplam:', vaultCache.length);

          // Aktif sekmedeki badge'i güncelle
          browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
            if (tabs[0]?.url) updateBadge(tabs[0].id as number, tabs[0].url);
          });
        }

        sendResponse({ success: true, count: vaultCache.length });
      }

      // ── LOCK_VAULT: Kasa kilitlendi ──
      else if (message.type === 'LOCK_VAULT') {
        console.log('[Aegis Vault] 🔐 Kasa kilitleniyor...');

        if (sessionTimeoutId !== null) {
          clearTimeout(sessionTimeoutId);
          sessionTimeoutId = null;
        }

        secureWipeCache();
        clearAllBadges();

        sendResponse({ success: true, locked: true });
      }

      // ── GET_DOMAIN_CREDS: Sadece aktif domain'e uygun kayıtları ver ──
      else if (message.type === 'GET_SITE_AUTOFILL_POLICY') {
        const requestedDomain = normalizeBridgeDomain(message.domain);
        const senderUrl = runtimeSender?.tab?.url;
        const senderDomain = senderUrl ? getDomain(senderUrl) : '';
        const isFromPopup = isExtensionSurface(runtimeSender);

        if (!requestedDomain) {
          sendResponse({ success: false, policy: 'allow' });
          return true;
        }

        if (!isFromPopup && (!senderDomain || requestedDomain !== senderDomain)) {
          sendResponse({ success: false, policy: 'allow', error: 'DOMAIN_MISMATCH' });
          return true;
        }

        getSiteAutofillPolicy(requestedDomain)
          .then((policy) => sendResponse({ success: true, policy }))
          .catch(() => sendResponse({ success: true, policy: 'allow' }));
        return true;
      } else if (message.type === 'SET_SITE_AUTOFILL_POLICY') {
        if (!isExtensionSurface(runtimeSender)) {
          sendResponse({ success: false, error: 'FORBIDDEN_SENDER' });
          return true;
        }

        const requestedDomain = normalizeBridgeDomain(message.domain);
        const policy = normalizeAutofillSitePolicy(message.policy);
        if (!requestedDomain) {
          sendResponse({ success: false, error: 'INVALID_DOMAIN' });
          return true;
        }

        setSiteAutofillPolicy(requestedDomain, policy)
          .then((success) => sendResponse({ success, policy }))
          .catch(() => sendResponse({ success: false, error: 'STORAGE_FAILED' }));
        return true;
      } else if (message.type === 'GET_DOMAIN_CREDS') {
        const requestedDomain =
          typeof message.domain === 'string' ? message.domain.toLowerCase().trim() : '';
        const requestNonce =
          typeof message.requestNonce === 'string' ? message.requestNonce.trim() : '';
        const now = Date.now();

        // Sender'ın kim olduğunu belirle:
        // - Content script → sender.tab.url mevcut (web sayfası domain'i)
        // - Extension popup → sender.tab YOK, sender.url "chrome-extension://" ile başlar
        const senderUrl = runtimeSender?.tab?.url;
        const senderDomain = senderUrl ? getDomain(senderUrl) : '';
        const isFromPopup =
          !runtimeSender?.tab &&
          ((typeof runtimeSender?.url === 'string' &&
            (runtimeSender.url.startsWith('chrome-extension://') ||
              runtimeSender.url.startsWith('moz-extension://'))) ||
            (typeof runtimeSender?.origin === 'string' &&
              (runtimeSender.origin.startsWith('chrome-extension://') ||
                runtimeSender.origin.startsWith('moz-extension://'))));

        cleanupNonceMap(now);

        if (!requestedDomain || !requestNonce) {
          sendResponse({ success: false, data: [] });
          return true;
        }

        // Content script'ten gelen isteklerde domain eşleşmesi zorunlu
        // Popup'tan gelen isteklerde ise sender.tab olmadığı için bu kontrolü atlıyoruz
        if (!isFromPopup && (!senderDomain || requestedDomain !== senderDomain)) {
          sendResponse({ success: false, data: [] });
          return true;
        }

        if (requestNonceMap.has(requestNonce)) {
          sendResponse({ success: false, data: [] });
          return true;
        }

        const requestKey = getRequestKey(runtimeSender, requestedDomain);
        const lastReqAt = recentDomainRequestMap.get(requestKey) || 0;
        if (now - lastReqAt < DOMAIN_REQ_MIN_INTERVAL_MS) {
          sendResponse({ success: true, data: [] });
          return true;
        }

        requestNonceMap.set(requestNonce, now);
        recentDomainRequestMap.set(requestKey, now);

        if (
          !isFromPopup &&
          normalizeAutofillSitePolicy(
            runtimeSiteAutofillPolicies[normalizeBridgeDomain(requestedDomain)]
          ) === 'block'
        ) {
          sendResponse({ success: true, data: [] });
          return true;
        }

        const cachedMatches = vaultCache
          .filter((p) => p.website && isDomainMatch(p.website, requestedDomain))
          .slice(0, 5) // Popup'ta daha fazla kayıt göster
          .map((p) => ({
            title: p.title,
            username: p.username,
            pass: p.pass,
            website: p.website,
            category: p.category || '',
            cardDetails: p.cardDetails || null,
            identityDetails: p.identityDetails || null,
          }));

        if (cachedMatches.length > 0) {
          sendResponse({ success: true, data: cachedMatches });
          return true;
        }

        const resolveDesktopMatches = async () => {
          if (NATIVE_MESSAGING_ENABLED) {
            const nativeStatus = await getNativeVaultStatus();
            if (nativeStatus?.isUnlocked) {
              if (!isVaultUnlocked) {
                isVaultUnlocked = true;
                await persistVaultState(true);
              }
            } else if (nativeStatus && !nativeStatus.isUnlocked) {
              if (isVaultUnlocked) {
                secureWipeCache();
              }
              sendResponse({ success: true, data: [] });
              return;
            }
          } else if (!isVaultUnlocked) {
            sendResponse({ success: true, data: [] });
            return;
          }

          const matches = await fetchDomainCredentialsFromDesktop(requestedDomain);
          resetSessionTimeout();
          sendResponse({ success: true, data: matches.slice(0, 5) });
        };

        resolveDesktopMatches().catch(() => {
          sendResponse({ success: true, data: [] });
        });
        return true;
      }

      // ── GET_DOMAIN_PASSKEYS: Sadece aktif domain'e uygun passkey'leri ver ──
      else if (message.type === 'GET_DOMAIN_PASSKEYS') {
        const requestedDomain =
          typeof message.domain === 'string' ? message.domain.toLowerCase().trim() : '';
        const requestNonce =
          typeof message.requestNonce === 'string' ? message.requestNonce.trim() : '';
        const now = Date.now();

        const runtimeSender = sender as RuntimeMessageSenderWithOrigin;
        const senderUrl = runtimeSender?.tab?.url;
        const senderDomain = senderUrl ? getDomain(senderUrl) : '';
        const isFromPopup =
          !runtimeSender?.tab &&
          ((typeof runtimeSender?.url === 'string' &&
            (runtimeSender.url.startsWith('chrome-extension://') ||
              runtimeSender.url.startsWith('moz-extension://'))) ||
            (typeof runtimeSender?.origin === 'string' &&
              (runtimeSender.origin.startsWith('chrome-extension://') ||
                runtimeSender.origin.startsWith('moz-extension://'))));

        cleanupNonceMap(now);

        if (!requestedDomain || !requestNonce) {
          sendResponse({ success: false, data: [] });
          return true;
        }

        if (!isFromPopup && (!senderDomain || requestedDomain !== senderDomain)) {
          sendResponse({ success: false, data: [] });
          return true;
        }

        if (requestNonceMap.has(requestNonce)) {
          sendResponse({ success: false, data: [] });
          return true;
        }

        requestNonceMap.set(requestNonce, now);

        const resolveDesktopPasskeys = async () => {
          if (
            !isFromPopup &&
            normalizeAutofillSitePolicy(
              runtimeSiteAutofillPolicies[normalizeBridgeDomain(requestedDomain)]
            ) === 'block'
          ) {
            sendResponse({ success: true, data: [] });
            return;
          }

          if (NATIVE_MESSAGING_ENABLED) {
            const nativeStatus = await getNativeVaultStatus();
            if (nativeStatus && !nativeStatus.isUnlocked) {
              sendResponse({ success: true, data: [] });
              return;
            }
          } else if (!isVaultUnlocked) {
            sendResponse({ success: true, data: [] });
            return;
          }

          const matches = await fetchDomainPasskeysFromDesktop(requestedDomain);
          resetSessionTimeout();
          sendResponse({ success: true, data: matches.slice(0, 5) });
        };

        resolveDesktopPasskeys().catch(() => {
          sendResponse({ success: true, data: [] });
        });
        return true;
      } else if (message.type === 'AUTOSAVE_CREDENTIAL') {
        const requestedDomain = normalizeBridgeDomain(message.domain);
        const requestNonce =
          typeof message.requestNonce === 'string' ? message.requestNonce.trim() : '';
        const credential = sanitizeAutosaveCredential(message.credential);
        const now = Date.now();
        const senderUrl = runtimeSender?.tab?.url;
        const senderDomain = senderUrl ? getDomain(senderUrl) : '';

        cleanupNonceMap(now);

        if (!requestedDomain || !requestNonce || !credential) {
          sendResponse({ success: false, error: 'INVALID_AUTOSAVE_PAYLOAD' });
          return true;
        }

        if (!senderDomain || requestedDomain !== senderDomain) {
          sendResponse({ success: false, error: 'DOMAIN_MISMATCH' });
          return true;
        }

        if (requestNonceMap.has(requestNonce)) {
          sendResponse({ success: false, error: 'NONCE_REPLAY' });
          return true;
        }
        requestNonceMap.set(requestNonce, now);

        const autosaveKey = `${getRequestKey(runtimeSender, requestedDomain)}:${credential.username.toLowerCase()}`;
        const lastAutosave = recentAutosaveMap.get(autosaveKey) || 0;
        if (now - lastAutosave < AUTOSAVE_MIN_INTERVAL_MS) {
          sendResponse({ success: true, queued: false, saved: false, action: 'throttled' });
          return true;
        }
        recentAutosaveMap.set(autosaveKey, now);

        const resolveAutosave = async () => {
          if (NATIVE_MESSAGING_ENABLED) {
            const nativeStatus = await getNativeVaultStatus();
            if (!nativeStatus?.isUnlocked) {
              sendResponse({ success: false, saved: false, error: 'VAULT_LOCKED' });
              return;
            }
          } else if (!isVaultUnlocked) {
            sendResponse({ success: false, saved: false, error: 'VAULT_LOCKED' });
            return;
          }

          const queued = enqueueAutosaveCandidate(requestedDomain, credential);
          resetSessionTimeout();
          sendResponse({
            success: true,
            queued: true,
            saved: false,
            action: 'queued',
            queueItem: toAutosavePreview(queued),
          });
        };

        resolveAutosave().catch(() => {
          sendResponse({ success: false, saved: false, error: 'AUTOSAVE_FAILED' });
        });
        return true;
      } else if (message.type === 'GET_AUTOSAVE_QUEUE') {
        const isFromPopup =
          !runtimeSender?.tab &&
          ((typeof runtimeSender?.url === 'string' &&
            (runtimeSender.url.startsWith('chrome-extension://') ||
              runtimeSender.url.startsWith('moz-extension://'))) ||
            (typeof runtimeSender?.origin === 'string' &&
              (runtimeSender.origin.startsWith('chrome-extension://') ||
                runtimeSender.origin.startsWith('moz-extension://'))));
        if (!isFromPopup) {
          sendResponse({ success: false, error: 'FORBIDDEN_SENDER' });
          return true;
        }
        sendResponse({
          success: true,
          data: pendingAutosaveQueue.map((item) => toAutosavePreview(item)),
        });
        return true;
      } else if (message.type === 'REJECT_AUTOSAVE_CREDENTIAL') {
        const isFromPopup =
          !runtimeSender?.tab &&
          ((typeof runtimeSender?.url === 'string' &&
            (runtimeSender.url.startsWith('chrome-extension://') ||
              runtimeSender.url.startsWith('moz-extension://'))) ||
            (typeof runtimeSender?.origin === 'string' &&
              (runtimeSender.origin.startsWith('chrome-extension://') ||
                runtimeSender.origin.startsWith('moz-extension://'))));
        if (!isFromPopup) {
          sendResponse({ success: false, error: 'FORBIDDEN_SENDER' });
          return true;
        }
        const autosaveId = typeof message.id === 'string' ? message.id.trim() : '';
        if (!autosaveId) {
          sendResponse({ success: false, error: 'INVALID_AUTOSAVE_ID' });
          return true;
        }
        const index = pendingAutosaveQueue.findIndex((item) => item.id === autosaveId);
        if (index < 0) {
          sendResponse({ success: false, error: 'AUTOSAVE_NOT_FOUND' });
          return true;
        }
        pendingAutosaveQueue.splice(index, 1);
        void persistAutosaveQueue();
        sendResponse({ success: true, rejected: true });
        return true;
      } else if (message.type === 'APPROVE_AUTOSAVE_CREDENTIAL') {
        const isFromPopup =
          !runtimeSender?.tab &&
          ((typeof runtimeSender?.url === 'string' &&
            (runtimeSender.url.startsWith('chrome-extension://') ||
              runtimeSender.url.startsWith('moz-extension://'))) ||
            (typeof runtimeSender?.origin === 'string' &&
              (runtimeSender.origin.startsWith('chrome-extension://') ||
                runtimeSender.origin.startsWith('moz-extension://'))));
        if (!isFromPopup) {
          sendResponse({ success: false, error: 'FORBIDDEN_SENDER' });
          return true;
        }
        const autosaveId = typeof message.id === 'string' ? message.id.trim() : '';
        if (!autosaveId) {
          sendResponse({ success: false, error: 'INVALID_AUTOSAVE_ID' });
          return true;
        }

        const index = pendingAutosaveQueue.findIndex((item) => item.id === autosaveId);
        if (index < 0) {
          sendResponse({ success: false, error: 'AUTOSAVE_NOT_FOUND' });
          return true;
        }
        const pendingItem = pendingAutosaveQueue[index];

        const approveAutosave = async () => {
          if (!NATIVE_MESSAGING_ENABLED) {
            sendResponse({ success: false, error: 'AUTOSAVE_UNAVAILABLE' });
            return;
          }
          const nativeStatus = await getNativeVaultStatus();
          if (!nativeStatus?.isUnlocked) {
            sendResponse({ success: false, error: 'VAULT_LOCKED' });
            return;
          }

          const response = await sendNativeHostMessage({
            type: 'AUTOSAVE_CREDENTIAL',
            domain: pendingItem.domain,
            requestNonce: generateRequestNonce(),
            credential: pendingItem.credential,
          });

          if (!response || typeof response !== 'object' || !response.ok) {
            sendResponse({
              success: false,
              error:
                response && typeof response === 'object' && typeof response.error === 'string'
                  ? response.error
                  : 'AUTOSAVE_FAILED',
            });
            return;
          }

          pendingAutosaveQueue.splice(index, 1);
          await persistAutosaveQueue();
          resetSessionTimeout();
          sendResponse({
            success: true,
            saved: Boolean(response.saved),
            action: typeof response.action === 'string' ? response.action : 'none',
            entryId: Number.isFinite(Number(response.entryId))
              ? Number(response.entryId)
              : undefined,
          });
        };

        approveAutosave().catch(() => {
          sendResponse({ success: false, error: 'AUTOSAVE_FAILED' });
        });
        return true;
      }

      // ── GET_VAULT: Legacy fallback, mümkünse kullanma ──
      else if (message.type === 'GET_VAULT') {
        if (!LEGACY_GET_VAULT_ENABLED) {
          sendResponse([]);
          return true;
        }

        // Kasa açık VE cache dolu → veriyi dön
        if (isVaultUnlocked && vaultCache.length > 0) {
          sendResponse(vaultCache);
        } else {
          // Kasa kapalı VEYA cache boş → boş dön
          sendResponse([]);
        }
      }

      // ── GET_VAULT_STATUS: Kasa durumu sorgulanıyor ──
      else if (message.type === 'GET_VAULT_STATUS') {
        // Önce Native Messaging dene (en güvenilir kanal), sonra loopback fallback
        const resolveVaultStatus = async () => {
          // 1. Native Messaging kanalı
          if (NATIVE_MESSAGING_ENABLED) {
            try {
              const nativeStatus = await getNativeVaultStatus();
              if (nativeStatus) {
                if (!nativeStatus.isUnlocked && isVaultUnlocked) {
                  secureWipeCache();
                } else if (nativeStatus.isUnlocked && !isVaultUnlocked) {
                  isVaultUnlocked = true;
                  await persistVaultState(true);
                }
                return {
                  isUnlocked: Boolean(nativeStatus.isUnlocked),
                  entryCount: Number(nativeStatus.entryCount || 0),
                };
              }
            } catch {
              // Native messaging başarısız, loopback dene
            }
          }

          // 2. Loopback HTTP kanalı (fallback)
          if (isLoopbackSyncActive() && getActivePairingSecret()) {
            try {
              const status = await getDesktopStatus();
              if (status !== null) {
                if (!status.isUnlocked && isVaultUnlocked) {
                  secureWipeCache();
                } else if (status.isUnlocked && !isVaultUnlocked) {
                  isVaultUnlocked = true;
                  await persistVaultState(true);
                }
                return {
                  isUnlocked: status.isUnlocked,
                  entryCount: status.entryCount,
                };
              }
            } catch {
              // Loopback da başarısız
            }
          }

          // 3. Hiçbiri çalışmazsa cache'den dön
          return {
            isUnlocked: isVaultUnlocked,
            entryCount: isVaultUnlocked ? vaultCache.length : 0,
          };
        };

        resolveVaultStatus()
          .then((result) => sendResponse(result))
          .catch(() =>
            sendResponse({
              isUnlocked: isVaultUnlocked,
              entryCount: isVaultUnlocked ? vaultCache.length : 0,
            })
          );
        return true;
      } else if (message.type === 'GENERATE_ALIAS') {
        const senderUrl =
          typeof sender?.tab?.url === 'string'
            ? sender.tab.url
            : typeof sender?.url === 'string'
              ? sender.url
              : '';
        const tabId = Number.isFinite(Number(message?.tabId))
          ? Number(message.tabId)
          : sender?.tab?.id;
        const tabUrl =
          typeof message?.tabUrl === 'string' && message.tabUrl.trim() ? message.tabUrl : senderUrl;
        const tabTitle =
          typeof message?.tabTitle === 'string' ? message.tabTitle : sender?.tab?.title || '';

        if (!Number.isFinite(Number(tabId)) || !tabUrl) {
          sendResponse({ success: false, error: 'INVALID_TAB_CONTEXT' });
          return false;
        }

        generateAliasForTab(Number(tabId), tabUrl, tabTitle)
          .then((result) => sendResponse(result))
          .catch((error) =>
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : 'ALIAS_GENERATION_FAILED',
            })
          );
        return true;
      } else if (message.type === 'GET_UI_LANGUAGE') {
        const browserLanguage = detectBrowserUiLanguage();
        const fallbackLanguage = hasPersistedUiLanguage ? runtimeUiLanguage : browserLanguage;

        if (NATIVE_MESSAGING_ENABLED) {
          getNativeUiLanguage()
            .then(async (language) => {
              const nativeLanguage = normalizeUiLanguage(language || '');
              const resolvedLanguage = hasPersistedUiLanguage
                ? runtimeUiLanguage
                : nativeLanguage || fallbackLanguage;
              runtimeUiLanguage = resolvedLanguage;
              try {
                await browser.storage.local.set({ [UI_LANGUAGE_STORAGE_KEY]: resolvedLanguage });
                hasPersistedUiLanguage = true;
              } catch {
                // storage best-effort
              }
              sendResponse({
                success: true,
                language: resolvedLanguage,
              });
            })
            .catch(() => {
              sendResponse({
                success: true,
                language: fallbackLanguage,
              });
            });
          return true;
        }

        sendResponse({
          success: true,
          language: fallbackLanguage,
        });
      } else if (message.type === 'SET_UI_LANGUAGE') {
        const language = normalizeUiLanguage(message.language);
        browser.storage.local
          .set({ [UI_LANGUAGE_STORAGE_KEY]: language })
          .then(() => {
            runtimeUiLanguage = language;
            hasPersistedUiLanguage = true;
            sendResponse({ success: true, language });
          })
          .catch(() => {
            sendResponse({ success: false, error: 'UI_LANGUAGE_STORE_FAILED' });
          });
        return true;
      } else if (message.type === 'SET_DESKTOP_PAIRING_SECRET') {
        const secret = typeof message.secret === 'string' ? message.secret.trim() : '';
        if (secret.length < 32) {
          sendResponse({ success: false, error: 'INVALID_PAIRING_SECRET' });
          return true;
        }

        browser.storage.local
          .set({ [PAIRING_SECRET_STORAGE_KEY]: secret })
          .then(() => {
            runtimePairingSecret = secret;
            sendResponse({ success: true });
          })
          .catch(() => {
            sendResponse({ success: false, error: 'PAIRING_SECRET_STORE_FAILED' });
          });
        return true;
      } else if (message.type === 'CLEAR_DESKTOP_PAIRING_SECRET') {
        browser.storage.local
          .remove([
            PAIRING_SECRET_STORAGE_KEY,
            DESKTOP_BRIDGE_PUBLIC_JWK_STORAGE_KEY,
            DESKTOP_BRIDGE_KEY_ID_STORAGE_KEY,
          ])
          .then(() => {
            runtimePairingSecret = '';
            runtimeDesktopBridgeIdentity = null;
            sendResponse({ success: true });
          })
          .catch(() => {
            sendResponse({ success: false, error: 'PAIRING_SECRET_CLEAR_FAILED' });
          });
        return true;
      } else if (message.type === 'PAIR_DESKTOP_BRIDGE') {
        initNativePairing()
          .then((result) => {
            if (!result?.ok) {
              sendResponse({ success: false, error: result?.error || 'PAIRING_FAILED' });
              return;
            }

            browser.storage.local
              .set({ [PAIRING_SECRET_STORAGE_KEY]: result.secret })
              .then(() => {
                runtimePairingSecret = result.secret;
                sendResponse({ success: true, pairedAt: result.pairedAt });
              })
              .catch(() => {
                sendResponse({ success: false, error: 'PAIRING_SECRET_STORE_FAILED' });
              });
          })
          .catch(() => {
            sendResponse({ success: false, error: 'PAIRING_FAILED' });
          });
        return true;
      } else if (message.type === 'UNPAIR_DESKTOP_BRIDGE') {
        clearNativePairing()
          .then(() =>
            browser.storage.local.remove([
              PAIRING_SECRET_STORAGE_KEY,
              DESKTOP_BRIDGE_PUBLIC_JWK_STORAGE_KEY,
              DESKTOP_BRIDGE_KEY_ID_STORAGE_KEY,
            ])
          )
          .then(() => {
            runtimePairingSecret = '';
            runtimeDesktopBridgeIdentity = null;
            sendResponse({ success: true });
          })
          .catch(() => {
            sendResponse({ success: false, error: 'UNPAIR_FAILED' });
          });
        return true;
      } else if (message.type === 'GET_DESKTOP_BRIDGE_MODE') {
        getNativePairingStatus()
          .then((status) => {
            const hasRuntimeSecret = Boolean(runtimePairingSecret);
            sendResponse({
              success: true,
              nativeMessagingEnabled: NATIVE_MESSAGING_ENABLED,
              loopbackFallbackEnabled: LOOPBACK_FALLBACK_ENABLED,
              hasPairingSecret: hasRuntimeSecret || Boolean(DESKTOP_PAIRING_SECRET),
              pairingSecretSource: runtimePairingSecret
                ? 'runtime'
                : DESKTOP_PAIRING_SECRET
                  ? 'build'
                  : 'none',
              desktopPairing:
                status ||
                (hasRuntimeSecret
                  ? {
                      paired: true,
                      pairedAt: '',
                      secretSource: 'runtime',
                      pairingMode: 'loopback-fallback-v1',
                    }
                  : null),
            });
          })
          .catch(() => {
            const hasRuntimeSecret = Boolean(runtimePairingSecret);
            sendResponse({
              success: true,
              nativeMessagingEnabled: NATIVE_MESSAGING_ENABLED,
              loopbackFallbackEnabled: LOOPBACK_FALLBACK_ENABLED,
              hasPairingSecret: hasRuntimeSecret || Boolean(DESKTOP_PAIRING_SECRET),
              pairingSecretSource: runtimePairingSecret
                ? 'runtime'
                : DESKTOP_PAIRING_SECRET
                  ? 'build'
                  : 'none',
              desktopPairing: hasRuntimeSecret
                ? {
                    paired: true,
                    pairedAt: '',
                    secretSource: 'runtime',
                    pairingMode: 'loopback-fallback-v1',
                  }
                : null,
            });
          });
        return true;
      }

      // ── THEME_MANAGEMENT ──
      else if (message.type === 'GET_THEME') {
        browser.storage.local
          .get(['aegis_theme'])
          .then((res) => {
            sendResponse({ theme: res.aegis_theme || 'light' });
          })
          .catch(() => sendResponse({ theme: 'light' }));
        return true;
      } else if (message.type === 'SET_THEME') {
        const theme = message.theme === 'dark' ? 'dark' : 'light';
        browser.storage.local
          .set({ aegis_theme: theme })
          .then(() => sendResponse({ success: true }))
          .catch(() => sendResponse({ success: false }));
        return true;
      }

      // ── FILL_CREDENTIALS: Popup'tan gelen fill komutu ──
      // scripting.executeScript ile doğrudan sayfaya fill yapar.
      // WXT context gerektirmez, her sitede çalışır.
      else if (message.type === 'FILL_CREDENTIALS') {
        const { tabId, entry } = message;
        if (!tabId || !entry) {
          sendResponse({ success: false });
          return true;
        }

        browser.scripting
          .executeScript({
            target: { tabId },
            func: (username: string, password: string) => {
              // ── Güvenilir fill fonksiyonu (React/Vue/Angular/vanilla) ──
              function fillField(el: HTMLInputElement, value: string) {
                el.focus();
                // React controlled input için native setter zorunlu
                const nativeSetter = Object.getOwnPropertyDescriptor(
                  window.HTMLInputElement.prototype,
                  'value'
                )?.set;
                if (nativeSetter) nativeSetter.call(el, value);
                else el.value = value;

                ['input', 'change'].forEach((evtName) => {
                  el.dispatchEvent(new Event(evtName, { bubbles: true, cancelable: true }));
                });
                el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
                el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
                el.dispatchEvent(new Event('blur', { bubbles: true }));
              }

              // Görünür input'ları topla
              const inputs = Array.from(
                document.querySelectorAll<HTMLInputElement>('input')
              ).filter((i) => {
                const s = window.getComputedStyle(i);
                return s.display !== 'none' && s.visibility !== 'hidden' && i.offsetParent !== null;
              });

              // Şifre alanını bul
              const pwField = inputs.find((i) => i.type === 'password');
              if (pwField) {
                // Şifre alanından geriye doğru username'i bul
                const pwIdx = inputs.indexOf(pwField);
                for (let i = pwIdx - 1; i >= 0; i--) {
                  const f = inputs[i];
                  if (f.type === 'text' || f.type === 'email') {
                    fillField(f, username);
                    break;
                  }
                }
                fillField(pwField, password);
              } else {
                // Şifre alanı yoksa (tek adımlı giriş) ilk text/email'i doldur
                const textField = inputs.find((i) => i.type === 'text' || i.type === 'email');
                if (textField) fillField(textField, username);
              }
            },
            args: [entry.username, entry.pass],
          })
          .then(() => {
            sendResponse({ success: true });
          })
          .catch((error: unknown) => {
            console.error('[Aegis] Fill hatasi:', error);
            sendResponse({ success: false, error: String(error) });
          });

        return true; // async sendResponse için gerekli
      }
    });
  },
});

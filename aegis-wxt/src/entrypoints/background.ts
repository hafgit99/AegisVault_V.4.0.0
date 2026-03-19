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
  | { ok: true; secret: string; pairedAt: string; riskFlags?: string[]; deviceFingerprint?: string; pairingMode?: string; clientKeyId?: string }
  | { ok: false; error: string };
type VaultCacheEntry = {
  title: string;
  username: string;
  pass: string;
  website: string;
};
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
    console.log('[Aegis Vault] Hybrid Background Yüklendi.');

    browser.runtime.onInstalled.addListener(() => {
        console.log("Aegis Vault WXT eklentisi başarıyla kuruldu ve başlatıldı.");
    });
    
    browser.contextMenus.create({
      id: "aegis-fill",
      title: "Aegis: Bu sayfayı analiz et ve doldur",
      contexts: ["page", "editable"]
    });

    // ─── RUNTIME ENJEKSİYON (P0-3: Attack Surface Reduction) ───
    // Kullanıcı ikona tıkladığında veya sağ tık menüsünü kullandığında
    // content script o sekmeye inject edilir.
    const injectContentScript = async (tabId: number) => {
      try {
        // Script ve CSS enjeksiyonu
        await browser.scripting.executeScript({
          target: { tabId },
          files: ['content-scripts/content.js']
        });
        
        // CSS dosyasının varlığından emin olun (WXT build çıktısı)
        await browser.scripting.insertCSS({
          target: { tabId },
          files: ['content-scripts/content.css']
        }).catch(() => {}); // CSS olmayabilirse hata fırlatmasın
        
        console.log(`[Aegis Vault] 💉 JIT: Content script tabId:${tabId} üzerine enjekte edildi.`);
      } catch (err) {
        console.error("[Aegis Vault] ❌ Enjeksiyon hatası (Scripting API):", err);
      }
    };

    browser.action.onClicked.addListener((tab) => {
      if (tab.id) injectContentScript(tab.id);
    });

    browser.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === "aegis-fill" && tab?.id) {
        injectContentScript(tab.id);
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
    const LEGACY_GET_VAULT_ENABLED = false;
    const DOMAIN_REQ_MIN_INTERVAL_MS = 350;
    const NONCE_TTL_MS = 30 * 1000;
    const DESKTOP_CHALLENGE_TTL_MS = 60 * 1000;
    const EXTENSION_ID = (
      env.WXT_AEGIS_EXTENSION_ID ||
      browser.runtime.id ||
      ''
    ).trim();
    const DESKTOP_PAIRING_SECRET = (
      env.WXT_AEGIS_DESKTOP_PAIRING_SECRET ||
      ''
    ).trim();
    const _DESKTOP_SYNC_ENABLED = (
      env.WXT_AEGIS_ENABLE_DESKTOP_SYNC ||
      '0'
    ) === '1';
    const NATIVE_MESSAGING_ENABLED = (
      env.WXT_AEGIS_ENABLE_NATIVE_MESSAGING ||
      '1'
    ) === '1';
    const NATIVE_HOST_NAME = (
      env.WXT_AEGIS_NATIVE_HOST_NAME ||
      'com.aegisvault.desktop'
    ).trim();
    const LOOPBACK_FALLBACK_ENABLED = (
      env.WXT_AEGIS_ENABLE_LOOPBACK_FALLBACK ||
      '1'
    ) === '1';
    const recentDomainRequestMap = new Map<string, number>();
    const requestNonceMap = new Map<string, number>();
    let runtimePairingSecret = '';
    let runtimePairingKeyMaterial: { publicJwk: JsonWebKey; privateJwk: JsonWebKey; keyId: string } | null = null;
    let runtimeDesktopBridgeIdentity: { publicJwk: JsonWebKey; keyId: string } | null = null;
    let runtimeUiLanguage = 'en';
    let runtimeInstallationId = '';
    const UI_LANGUAGE_STORAGE_KEY = 'aegis_ui_language';
    const INSTALLATION_ID_STORAGE_KEY = 'aegis_extension_installation_id';
    const PAIRING_SECRET_STORAGE_KEY = 'aegis_desktop_pairing_secret';
    const PAIRING_PRIVATE_JWK_STORAGE_KEY = 'aegis_desktop_pairing_private_jwk';
    const PAIRING_PUBLIC_JWK_STORAGE_KEY = 'aegis_desktop_pairing_public_jwk';
    const PAIRING_KEY_ID_STORAGE_KEY = 'aegis_desktop_pairing_key_id';
    const DESKTOP_BRIDGE_PUBLIC_JWK_STORAGE_KEY = 'aegis_desktop_bridge_public_jwk';
    const DESKTOP_BRIDGE_KEY_ID_STORAGE_KEY = 'aegis_desktop_bridge_key_id';
    const normalizeUiLanguage = (value: unknown) =>
      typeof value === 'string' && value.toLowerCase().startsWith('tr') ? 'tr' : 'en';

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
        runtimePairingSecret = typeof result[PAIRING_SECRET_STORAGE_KEY] === 'string'
          ? result[PAIRING_SECRET_STORAGE_KEY].trim()
          : '';
      } catch {
        runtimePairingSecret = '';
      }
    };

    const normalizeClientPublicJwk = (value: unknown): JsonWebKey | null => {
      if (!value || typeof value !== 'object') return null;
      const candidate = value as JsonWebKey;
      if (candidate.kty !== 'EC' || candidate.crv !== 'P-256' || typeof candidate.x !== 'string' || typeof candidate.y !== 'string') {
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
      if (candidate.kty !== 'EC' || candidate.crv !== 'P-256' || typeof candidate.x !== 'string' || typeof candidate.y !== 'string' || typeof candidate.d !== 'string') {
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

    const canonicalizePublicJwk = (publicJwk: JsonWebKey) => JSON.stringify({
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

    const computeClientKeyId = async (publicJwk: JsonWebKey) => (await digestString(canonicalizePublicJwk(publicJwk))).slice(0, 24);

    const loadRuntimePairingKeyMaterial = async () => {
      try {
        const result = await browser.storage.local.get([
          PAIRING_PRIVATE_JWK_STORAGE_KEY,
          PAIRING_PUBLIC_JWK_STORAGE_KEY,
          PAIRING_KEY_ID_STORAGE_KEY,
        ]);
        const publicJwk = normalizeClientPublicJwk(result[PAIRING_PUBLIC_JWK_STORAGE_KEY]);
        const privateJwk = normalizeClientPrivateJwk(result[PAIRING_PRIVATE_JWK_STORAGE_KEY]);
        const keyId = typeof result[PAIRING_KEY_ID_STORAGE_KEY] === 'string' ? result[PAIRING_KEY_ID_STORAGE_KEY].trim() : '';
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
        const keyId = typeof result[DESKTOP_BRIDGE_KEY_ID_STORAGE_KEY] === 'string'
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

    const storeRuntimeDesktopBridgeIdentity = async (publicJwk: JsonWebKey, keyId: string) => {
      runtimeDesktopBridgeIdentity = { publicJwk, keyId };
      await browser.storage.local.set({
        [DESKTOP_BRIDGE_PUBLIC_JWK_STORAGE_KEY]: publicJwk,
        [DESKTOP_BRIDGE_KEY_ID_STORAGE_KEY]: keyId,
      });
      return runtimeDesktopBridgeIdentity;
    };

    const ensureRuntimePairingKeyMaterial = async () => {
      if (runtimePairingKeyMaterial) return runtimePairingKeyMaterial;
      const loaded = await loadRuntimePairingKeyMaterial();
      if (loaded) return loaded;

      const keyPair = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign', 'verify'],
      );
      const publicJwk = normalizeClientPublicJwk(await crypto.subtle.exportKey('jwk', keyPair.publicKey));
      const privateJwk = normalizeClientPrivateJwk(await crypto.subtle.exportKey('jwk', keyPair.privateKey));
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
        runtimeUiLanguage = normalizeUiLanguage(result[UI_LANGUAGE_STORAGE_KEY]);
      } catch {
        runtimeUiLanguage = 'en';
      }
    };

    const ensureRuntimeInstallationId = async () => {
      if (runtimeInstallationId) return runtimeInstallationId;
      try {
        const result = await browser.storage.local.get(INSTALLATION_ID_STORAGE_KEY);
        const existing = typeof result[INSTALLATION_ID_STORAGE_KEY] === 'string'
          ? result[INSTALLATION_ID_STORAGE_KEY].trim()
          : '';
        if (existing) {
          runtimeInstallationId = existing;
          return runtimeInstallationId;
        }
      } catch {
        // continue with generation
      }

      const generated = typeof crypto.randomUUID === 'function'
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
      platform: typeof navigator !== 'undefined'
        ? ((navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform || navigator.platform || 'unknown')
        : 'unknown',
      locale: typeof navigator !== 'undefined' ? (navigator.language || 'en') : 'en',
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
      clientPublicJwk?: JsonWebKey | null,
    ) => JSON.stringify({
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
    });

    const signNativeBridgeMessage = async (
      message: Record<string, unknown>,
      clientInfo: Awaited<ReturnType<typeof buildClientInfo>>,
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
        includePublicKey ? keyMaterial.publicJwk : null,
      );
      const privateKey = await crypto.subtle.importKey(
        'jwk',
        keyMaterial.privateJwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign'],
      );
      const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        privateKey,
        new TextEncoder().encode(payload),
      );
      return {
        clientKeyId: keyMaterial.keyId,
        clientTimestamp: timestamp,
        clientNonce: nonce,
        clientSignature: toHex(signature),
        ...(includePublicKey ? { clientPublicJwk: keyMaterial.publicJwk } : {}),
      };
    };

    const buildDesktopBridgeResponsePayload = (
      response: Record<string, unknown>,
      requestType: string,
      requestNonce: string,
      clientNonce: string,
      timestamp: string,
    ) => JSON.stringify({
      type: requestType,
      extensionId: EXTENSION_ID,
      requestNonce,
      clientNonce,
      timestamp,
      response,
    });

    const verifyDesktopBridgeResponse = async (
      requestMessage: Record<string, unknown>,
      response: NativeHostResponse,
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

      const expectedRequestNonce = typeof requestMessage.requestNonce === 'string' ? requestMessage.requestNonce.trim() : '';
      const expectedClientNonce = typeof requestMessage.clientNonce === 'string' ? requestMessage.clientNonce.trim() : '';
      if (requestNonce !== expectedRequestNonce || clientNonce !== expectedClientNonce) {
        throw new Error('DESKTOP_AUTH_CONTEXT_MISMATCH');
      }

      const suppliedPublicJwk = normalizeClientPublicJwk(auth.publicJwk);
      let identity = runtimeDesktopBridgeIdentity || await loadRuntimeDesktopBridgeIdentity();

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
        timestamp,
      );
      const verifyKey = await crypto.subtle.importKey(
        'jwk',
        identity.publicJwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify'],
      );
      const signature = hexToUint8(signatureHex);
      const ok = await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        verifyKey,
        signature,
        new TextEncoder().encode(payload),
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
          console.log("[Aegis Vault] ℹ️ Önceki oturum durumu geri yüklendi (cache bekleniyor).");
        }
      } catch {
        // storage.session her ortamda mevcut olmayabilir
      }
    };
    restoreVaultState();
    loadRuntimePairingSecret();
    loadRuntimeUiLanguage();
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

    const toHex = (buffer: ArrayBuffer) => {
      const bytes = new Uint8Array(buffer);
      return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    };

    const generateRequestNonce = () => {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
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

    const sendNativeHostMessage = async (message: Record<string, unknown>) => {
      if (!NATIVE_MESSAGING_ENABLED || !NATIVE_HOST_NAME || !EXTENSION_ID) return null;
      try {
        const runtimeApi = browser.runtime as typeof browser.runtime & {
          sendNativeMessage?: (application: string, message: Record<string, unknown>) => Promise<NativeHostResponse>;
        };
        if (typeof runtimeApi?.sendNativeMessage !== 'function') return null;
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
        if (!rawResponse || typeof rawResponse !== 'object') return null;
        return await verifyDesktopBridgeResponse(requestMessage, rawResponse);
      } catch {
        return null;
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
        deviceFingerprint: typeof response.deviceFingerprint === 'string' ? response.deviceFingerprint : '',
        lastUsedAt: typeof response.lastUsedAt === 'string' ? response.lastUsedAt : '',
        lastApprovedAt: typeof response.lastApprovedAt === 'string' ? response.lastApprovedAt : '',
        riskFlags: Array.isArray(response.riskFlags) ? response.riskFlags.filter((item): item is string => typeof item === 'string') : [],
        riskLevel: typeof response.riskLevel === 'string' ? response.riskLevel : 'low',
        pairingHistory: Array.isArray(response.pairingHistory)
          ? response.pairingHistory.filter((item): item is { at?: string; type?: string; detail?: string; riskFlags?: string[] } => Boolean(item) && typeof item === 'object')
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
        pairingMode: typeof response.pairingMode === 'string' ? response.pairingMode : 'signed-p256-v1',
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

      console.log(`[Aegis Vault] 🔄 Fallback pairing başlatılıyor (Aktif ID: ${extensionId.substring(0, 8)}...)`);

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
            console.warn(`[Aegis Vault] 🔄 Fallback: ${host} failed with status ${response.status}: ${errorText}`);
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
          console.warn(`[Aegis Vault] 🔄 Fallback error (${host}):`, err instanceof Error ? err.message : String(err));
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

    const signDesktopChallenge = async (tokenHex: string, payload: string) => {
      const keyBytes = hexToUint8(tokenHex);
      const payloadBytes = new TextEncoder().encode(payload);
      const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const sig = await crypto.subtle.sign('HMAC', key, payloadBytes);
      return toHex(sig);
    };

    const signPairingPayload = async (method: 'GET', path: '/api/challenge' | '/api/status' | '/api/vault' | '/api/domain-credentials') => {
      const activePairingSecret = await ensureActivePairingSecret();
      if (!activePairingSecret || !EXTENSION_ID) return null;
      const ts = Date.now().toString();
      const payload = `${method}:${path}:${ts}:${EXTENSION_ID}`;
      const keyBytes = new TextEncoder().encode(activePairingSecret);
      const payloadBytes = new TextEncoder().encode(payload);
      const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
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
        if (Number(challenge.expiresAt) - Date.now() <= 0 || Number(challenge.expiresAt) - Date.now() > DESKTOP_CHALLENGE_TTL_MS * 2) {
          console.debug(`[Aegis Vault] ❌ getDesktopChallenge TTL issue: expiresAt=${challenge.expiresAt}, diff=${Number(challenge.expiresAt) - Date.now()}`);
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
      path: '/api/status' | '/api/vault' | '/api/domain-credentials',
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
        const url = path === '/api/domain-credentials'
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
           console.debug(`[Aegis Vault] ❌ desktopSignedGet path=${path} !ok: ${finalResponse.status} => ${dbgTxt}`);
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
                console.log("[Aegis Vault] 🖥️ Native host üzerinden kasa kilitli tespit edildi.");
                secureWipeCache();
                clearAllBadges();
              }
            } else {
              if (!isVaultUnlocked) {
                isVaultUnlocked = true;
                persistVaultState(true);
                console.log("[Aegis Vault] ✅ Native messaging köprüsü üzerinden kasa açık.");
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
          console.debug(`[Aegis Vault] 🔍 Desktop poll başlatılıyor: ${host}, EXTENSION_ID: ${EXTENSION_ID.substring(0, 8)}...`);

          // 1. Status endpoint — kasa açık mı?
          const statusRes = await desktopSignedGet(host, '/api/status');
          if (!statusRes) {
            console.debug(`[Aegis Vault] ⚠️ Status isteği null döndü (${host}) — challenge başarısız veya fetch engellendi`);
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
              console.log("[Aegis Vault] 🖥️ Masaüstü kasası kilitli tespit edildi.");
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
    const secureWipeCache = () => {
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
      isVaultUnlocked = false;
      persistVaultState(false);
      console.log("[Aegis Vault] 🔒 Önbellek güvenli bir şekilde temizlendi.");
    };

    const resetSessionTimeout = () => {
      if (sessionTimeoutId !== null) {
        clearTimeout(sessionTimeoutId);
      }
      sessionTimeoutId = setTimeout(() => {
        console.warn("[Aegis Vault] ⏰ Oturum zaman aşımı. Önbellek temizleniyor.");
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
      return normalizedEntry.includes(normalizedDomain) || normalizedDomain.includes(normalizedEntry);
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
        const matches = vaultCache.filter(p => p.website && isDomainMatch(p.website, domain));
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
      if (message.type === "SAVE_VAULT") {
        // Önce mevcut cache'i güvenli şekilde temizle
        secureWipeCache();
        
        if (Array.isArray(message.data) && message.data.length > 0) {
          const sanitizedEntries = message.data
            .map((entry: unknown) => sanitizeVaultEntry(entry))
            .filter((entry): entry is VaultCacheEntry => Boolean(entry))
            .slice(0, 1000);

          vaultCache.push(...sanitizedEntries);
          isVaultUnlocked = true;
          persistVaultState(true);
          resetSessionTimeout();
          
          console.log("[Aegis Vault] ✅ Kasa Eşitlendi, Toplam:", vaultCache.length);
          
          // Aktif sekmedeki badge'i güncelle
          browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
            if (tabs[0]?.url) updateBadge(tabs[0].id as number, tabs[0].url);
          });
        }
        
        sendResponse({ success: true, count: vaultCache.length });
      }
      
      // ── LOCK_VAULT: Kasa kilitlendi ──
      else if (message.type === "LOCK_VAULT") {
        console.log("[Aegis Vault] 🔐 Kasa kilitleniyor...");
        
        if (sessionTimeoutId !== null) {
          clearTimeout(sessionTimeoutId);
          sessionTimeoutId = null;
        }
        
        secureWipeCache();
        clearAllBadges();
        
        sendResponse({ success: true, locked: true });
      }
      
      // ── GET_DOMAIN_CREDS: Sadece aktif domain'e uygun kayıtları ver ──
      else if (message.type === "GET_DOMAIN_CREDS") {
        const requestedDomain = typeof message.domain === 'string'
          ? message.domain.toLowerCase().trim()
          : '';
        const requestNonce = typeof message.requestNonce === 'string'
          ? message.requestNonce.trim()
          : '';
        const now = Date.now();

        // Sender'ın kim olduğunu belirle:
        // - Content script → sender.tab.url mevcut (web sayfası domain'i)
        // - Extension popup → sender.tab YOK, sender.url "chrome-extension://" ile başlar
        const senderUrl = runtimeSender?.tab?.url;
        const senderDomain = senderUrl ? getDomain(senderUrl) : '';
        const isFromPopup = !runtimeSender?.tab && (
          (typeof runtimeSender?.url === 'string' && (
            runtimeSender.url.startsWith('chrome-extension://') ||
            runtimeSender.url.startsWith('moz-extension://')
          )) ||
          (typeof runtimeSender?.origin === 'string' && (
            runtimeSender.origin.startsWith('chrome-extension://') ||
            runtimeSender.origin.startsWith('moz-extension://')
          ))
        );

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

        const cachedMatches = vaultCache
          .filter((p) => p.website && isDomainMatch(p.website, requestedDomain))
          .slice(0, 5)  // Popup'ta daha fazla kayıt göster
          .map((p) => ({
            title: p.title,
            username: p.username,
            pass: p.pass,
            website: p.website,
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

      // ── GET_VAULT: Legacy fallback, mümkünse kullanma ──
      else if (message.type === "GET_VAULT") {
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
      else if (message.type === "GET_VAULT_STATUS") {
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
          .then(result => sendResponse(result))
          .catch(() => sendResponse({
            isUnlocked: isVaultUnlocked,
            entryCount: isVaultUnlocked ? vaultCache.length : 0,
          }));
        return true;
      }

      else if (message.type === "GET_UI_LANGUAGE") {
        if (NATIVE_MESSAGING_ENABLED) {
          getNativeUiLanguage()
            .then(async (language) => {
              const resolvedLanguage = language || getActiveUiLanguage();
              runtimeUiLanguage = resolvedLanguage;
              try {
                await browser.storage.local.set({ [UI_LANGUAGE_STORAGE_KEY]: resolvedLanguage });
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
                language: getActiveUiLanguage(),
              });
            });
          return true;
        }

        sendResponse({
          success: true,
          language: getActiveUiLanguage(),
        });
      }

      else if (message.type === "SET_UI_LANGUAGE") {
        const language = normalizeUiLanguage(message.language);
        browser.storage.local.set({ [UI_LANGUAGE_STORAGE_KEY]: language })
          .then(() => {
            runtimeUiLanguage = language;
            sendResponse({ success: true, language });
          })
          .catch(() => {
            sendResponse({ success: false, error: 'UI_LANGUAGE_STORE_FAILED' });
          });
        return true;
      }

      else if (message.type === "SET_DESKTOP_PAIRING_SECRET") {
        const secret = typeof message.secret === 'string' ? message.secret.trim() : '';
        if (secret.length < 32) {
          sendResponse({ success: false, error: 'INVALID_PAIRING_SECRET' });
          return true;
        }

        browser.storage.local.set({ [PAIRING_SECRET_STORAGE_KEY]: secret })
          .then(() => {
            runtimePairingSecret = secret;
            sendResponse({ success: true });
          })
          .catch(() => {
            sendResponse({ success: false, error: 'PAIRING_SECRET_STORE_FAILED' });
          });
        return true;
      }

      else if (message.type === "CLEAR_DESKTOP_PAIRING_SECRET") {
        browser.storage.local.remove([
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
      }

      else if (message.type === "PAIR_DESKTOP_BRIDGE") {
        initNativePairing()
          .then((result) => {
            if (!result?.ok) {
              sendResponse({ success: false, error: result?.error || 'PAIRING_FAILED' });
              return;
            }

            browser.storage.local.set({ [PAIRING_SECRET_STORAGE_KEY]: result.secret })
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
      }

      else if (message.type === "UNPAIR_DESKTOP_BRIDGE") {
        clearNativePairing()
          .then(() => browser.storage.local.remove([
            PAIRING_SECRET_STORAGE_KEY,
            DESKTOP_BRIDGE_PUBLIC_JWK_STORAGE_KEY,
            DESKTOP_BRIDGE_KEY_ID_STORAGE_KEY,
          ]))
          .then(() => {
            runtimePairingSecret = '';
            runtimeDesktopBridgeIdentity = null;
            sendResponse({ success: true });
          })
          .catch(() => {
            sendResponse({ success: false, error: 'UNPAIR_FAILED' });
          });
        return true;
      }

      else if (message.type === "GET_DESKTOP_BRIDGE_MODE") {
        getNativePairingStatus()
          .then((status) => {
            const hasRuntimeSecret = Boolean(runtimePairingSecret);
            sendResponse({
              success: true,
              nativeMessagingEnabled: NATIVE_MESSAGING_ENABLED,
              loopbackFallbackEnabled: LOOPBACK_FALLBACK_ENABLED,
              hasPairingSecret: hasRuntimeSecret || Boolean(DESKTOP_PAIRING_SECRET),
              pairingSecretSource: runtimePairingSecret ? 'runtime' : (DESKTOP_PAIRING_SECRET ? 'build' : 'none'),
              desktopPairing: status || (hasRuntimeSecret ? { paired: true, pairedAt: '', secretSource: 'runtime', pairingMode: 'loopback-fallback-v1' } : null),
            });
          })
          .catch(() => {
            const hasRuntimeSecret = Boolean(runtimePairingSecret);
            sendResponse({
              success: true,
              nativeMessagingEnabled: NATIVE_MESSAGING_ENABLED,
              loopbackFallbackEnabled: LOOPBACK_FALLBACK_ENABLED,
              hasPairingSecret: hasRuntimeSecret || Boolean(DESKTOP_PAIRING_SECRET),
              pairingSecretSource: runtimePairingSecret ? 'runtime' : (DESKTOP_PAIRING_SECRET ? 'build' : 'none'),
              desktopPairing: hasRuntimeSecret ? { paired: true, pairedAt: '', secretSource: 'runtime', pairingMode: 'loopback-fallback-v1' } : null,
            });
          });
        return true;
      }

      // ── THEME_MANAGEMENT ──
      else if (message.type === "GET_THEME") {
        browser.storage.local.get(['aegis_theme'])
          .then(res => {
            sendResponse({ theme: res.aegis_theme || 'light' });
          })
          .catch(() => sendResponse({ theme: 'light' }));
        return true;
      }

      else if (message.type === "SET_THEME") {
        const theme = message.theme === 'dark' ? 'dark' : 'light';
        browser.storage.local.set({ aegis_theme: theme })
          .then(() => sendResponse({ success: true }))
          .catch(() => sendResponse({ success: false }));
        return true;
      }

      // ── FILL_CREDENTIALS: Popup'tan gelen fill komutu ──
      // scripting.executeScript ile doğrudan sayfaya fill yapar.
      // WXT context gerektirmez, her sitede çalışır.
      else if (message.type === "FILL_CREDENTIALS") {
        const { tabId, entry } = message;
        if (!tabId || !entry) { sendResponse({ success: false }); return true; }

        browser.scripting.executeScript({
          target: { tabId },
          func: (username: string, password: string) => {
            // ── Güvenilir fill fonksiyonu (React/Vue/Angular/vanilla) ──
            function fillField(el: HTMLInputElement, value: string) {
              el.focus();
              // React controlled input için native setter zorunlu
              const nativeSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype, 'value'
              )?.set;
              if (nativeSetter) nativeSetter.call(el, value);
              else el.value = value;

              ['input', 'change'].forEach(evtName => {
                el.dispatchEvent(new Event(evtName, { bubbles: true, cancelable: true }));
              });
              el.dispatchEvent(new KeyboardEvent('keydown',  { bubbles: true }));
              el.dispatchEvent(new KeyboardEvent('keyup',    { bubbles: true }));
              el.dispatchEvent(new Event('blur', { bubbles: true }));
            }

            // Görünür input'ları topla
            const inputs = Array.from(
              document.querySelectorAll<HTMLInputElement>('input')
            ).filter(i => {
              const s = window.getComputedStyle(i);
              return s.display !== 'none' && s.visibility !== 'hidden' && i.offsetParent !== null;
            });

            // Şifre alanını bul
            const pwField = inputs.find(i => i.type === 'password');
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
              const textField = inputs.find(i => i.type === 'text' || i.type === 'email');
              if (textField) fillField(textField, username);
            }
          },
          args: [entry.username, entry.pass],
        }).then(() => {
          sendResponse({ success: true });
        }).catch((error: unknown) => {
          console.error('[Aegis] Fill hatasi:', error);
          sendResponse({ success: false, error: String(error) });
        });

        return true; // async sendResponse için gerekli
      }
    });

  }
});

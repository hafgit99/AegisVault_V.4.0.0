// @ts-nocheck
import { browser } from 'wxt/browser';
import DOMPurify from 'dompurify';

type PopupI18n = {
    connecting: string;
    waiting: string;
    loading: string;
    unknownSite: string;
    vaultLocked: string;
    openVaultHint: string;
    vaultEmpty: string;
    vaultOpen: string;
    noRecordForSite: string;
    noUsername: string;
    fill: string;
    filled: string;
    backgroundError: string;
    bridgeTitle: string;
    bridgeNativeOn: string;
    bridgeNativeOff: string;
    bridgePaired: string;
    bridgeNotPaired: string;
    bridgePair: string;
    bridgeUnpair: string;
    bridgePairing: string;
    bridgeUnpairing: string;
    bridgePairHint: string;
    bridgeFallbackOn: string;
    bridgeFallbackOff: string;
    bridgeSourceRuntime: string;
    bridgeSourceBuild: string;
    bridgeSourceNone: string;
    bridgePairFailed: string;
    bridgeUnpairFailed: string;
    bridgeErrorPrefix: string;
    bridgeRiskPrefix: string;
    bridgeLastUsed: string;
    bridgeLastApproved: string;
    bridgeDeviceFingerprint: string;
    bridgePairingMode: string;
    bridgePairingModeSigned: string;
    bridgePairingModeLegacy: string;
    bridgeClientKey: string;
};

const normalizeUiLanguage = (value: unknown) =>
    typeof value === 'string' && value.toLowerCase().startsWith('tr') ? 'tr' : 'en';

const buildPopupI18n = (language: 'tr' | 'en'): PopupI18n => {
    const isTurkishLocale = language === 'tr';
    return {
        connecting: isTurkishLocale ? 'Baglaniyor...' : 'Connecting...',
        waiting: isTurkishLocale ? 'Bekleniyor' : 'Waiting',
        loading: isTurkishLocale ? 'Yukleniyor...' : 'Loading...',
        unknownSite: isTurkishLocale ? 'Bilinmeyen Site' : 'Unknown Site',
        vaultLocked: isTurkishLocale ? 'Kasa Kilitli' : 'Vault Locked',
        openVaultHint: isTurkishLocale
          ? 'Aegis Vault uygulamasini acip sifrenizle giris yapin.'
          : 'Open Aegis Vault app and unlock with your password.',
        vaultEmpty: isTurkishLocale ? 'Kasa Bos' : 'Vault Empty',
        vaultOpen: isTurkishLocale ? 'Kasa Acik' : 'Vault Unlocked',
        noRecordForSite: isTurkishLocale
          ? 'Bu site icin kayit bulunamadi'
          : 'No records found for this site',
        noUsername: isTurkishLocale ? 'Kullanici adi yok' : 'No username',
        fill: isTurkishLocale ? 'Doldur ->' : 'Fill ->',
        filled: isTurkishLocale ? 'Dolduruldu' : 'Filled',
        backgroundError: isTurkishLocale
          ? 'Hata: Arkaplan servisine ulasilamadi.'
          : 'Error: Background service is unavailable.',
        bridgeTitle: isTurkishLocale ? 'Masaustu Koprusu' : 'Desktop Bridge',
        bridgeNativeOn: isTurkishLocale ? 'Native messaging aktif' : 'Native messaging active',
        bridgeNativeOff: isTurkishLocale ? 'Native messaging kapali' : 'Native messaging disabled',
        bridgePaired: isTurkishLocale ? 'Eslestirildi' : 'Paired',
        bridgeNotPaired: isTurkishLocale ? 'Eslesme yok' : 'Not paired',
        bridgePair: isTurkishLocale ? 'Masaustu ile Eslestir' : 'Pair with Desktop',
        bridgeUnpair: isTurkishLocale ? 'Eslesmeyi Kaldir' : 'Remove Pairing',
        bridgePairing: isTurkishLocale ? 'Eslestirme isteniyor...' : 'Requesting pairing...',
        bridgeUnpairing: isTurkishLocale ? 'Eslesme kaldiriliyor...' : 'Removing pairing...',
        bridgePairHint: isTurkishLocale ? 'Masaustu uygulamasinda onay penceresi acilacak.' : 'A confirmation dialog will open in the desktop app.',
        bridgeFallbackOn: isTurkishLocale ? 'Acil fallback acik' : 'Recovery fallback enabled',
        bridgeFallbackOff: isTurkishLocale ? 'Fallback kapali' : 'Fallback disabled',
        bridgeSourceRuntime: isTurkishLocale ? 'Runtime secret' : 'Runtime secret',
        bridgeSourceBuild: isTurkishLocale ? 'Build secret' : 'Build secret',
        bridgeSourceNone: isTurkishLocale ? 'Secret yok' : 'No secret',
        bridgePairFailed: isTurkishLocale ? 'Eslestirme basarisiz.' : 'Pairing failed.',
        bridgeUnpairFailed: isTurkishLocale ? 'Eslesme kaldirilamadi.' : 'Unpair failed.',
        bridgeErrorPrefix: isTurkishLocale ? 'Hata' : 'Error',
        bridgeRiskPrefix: isTurkishLocale ? 'Risk' : 'Risk',
        bridgeLastUsed: isTurkishLocale ? 'Son kullanim' : 'Last used',
        bridgeLastApproved: isTurkishLocale ? 'Son onay' : 'Last approval',
        bridgeDeviceFingerprint: isTurkishLocale ? 'Cihaz izi' : 'Device fingerprint',
        bridgePairingMode: isTurkishLocale ? 'Eslesme modu' : 'Pairing mode',
        bridgePairingModeSigned: isTurkishLocale ? 'Kalici imzali eslesme' : 'Persistent signed pairing',
        bridgePairingModeLegacy: isTurkishLocale ? 'Gecis donemi secret modeli' : 'Legacy secret model',
        bridgeClientKey: isTurkishLocale ? 'Istemci anahtari' : 'Client key',
    };
};

let popupLanguage: 'tr' | 'en' = normalizeUiLanguage(typeof navigator !== 'undefined' ? navigator.language : 'en');
let POPUP_I18N = buildPopupI18n(popupLanguage);
let popupTheme: 'light' | 'dark' = 'light';

const themes = {
    light: {
        bg: '#f0eee9',
        card: '#ffffff',
        text: '#0a1128',
        textMuted: '#475569',
        border: 'rgba(114,136,111,0.2)',
        accent: '#72886f',
        panelBg: 'rgba(16,24,40,0.04)',
        itemBg: 'rgba(114,136,111,0.05)',
        itemHover: 'rgba(114,136,111,0.13)',
        inputBg: '#ffffff',
        chipBg: 'rgba(114,136,111,0.10)',
        buttonPrimaryBg: '#101828',
        buttonPrimaryText: '#ffffff',
        buttonSecondaryBg: '#ffffff',
        buttonSecondaryText: '#475569',
    },
    dark: {
        bg: '#161d2b',
        card: '#1e293b',
        text: '#e6edf8',
        textMuted: '#94a3b8',
        border: 'rgba(137,168,140,0.22)',
        accent: '#89a88c',
        panelBg: 'rgba(30,41,59,0.5)',
        itemBg: 'rgba(137,168,140,0.08)',
        itemHover: 'rgba(137,168,140,0.18)',
        inputBg: '#1e293b',
        chipBg: 'rgba(137,168,140,0.15)',
        buttonPrimaryBg: '#89a88c',
        buttonPrimaryText: '#101828',
        buttonSecondaryBg: '#334155',
        buttonSecondaryText: '#e2e8f0',
    }
};

const getT = () => themes[popupTheme];


type PopupCredential = {
    title?: string;
    username?: string;
    pass?: string;
    website?: string;
};

const formatBridgeError = (code: string) => {
    const normalized = (code || '').trim();
    if (!normalized) return POPUP_I18N.bridgePairFailed;

    const map: Record<string, string> = {
        FORBIDDEN_EXTENSION_ID: popupLanguage === 'tr' ? 'Bu eklenti kimligi masaustu tarafinda izinli degil.' : 'This extension ID is not allowlisted on desktop.',
        PAIRING_REJECTED: popupLanguage === 'tr' ? 'Eslestirme istegi masaustunde reddedildi.' : 'Pairing request was rejected on desktop.',
        NATIVE_HOST_UNAVAILABLE: popupLanguage === 'tr' ? 'Native host kullanilamiyor veya kayitli degil.' : 'Native host is unavailable or not registered.',
        LOOPBACK_FALLBACK_UNAVAILABLE: popupLanguage === 'tr' ? 'Native host kullanilamiyor ve loopback fallback devre disi. Masaustu uygulamayi yeniden baslatip eslestirmeyi tekrar deneyin.' : 'Native host is unavailable and loopback fallback is disabled. Restart the desktop app and try pairing again.',
        INVALID_PAIRING_SECRET: popupLanguage === 'tr' ? 'Olusturulan eslestirme sirri gecersiz.' : 'Generated pairing secret is invalid.',
        NATIVE_BRIDGE_TIMEOUT: popupLanguage === 'tr' ? 'Masaustu koprusu zaman asimina ugradi.' : 'Desktop bridge timed out.',
        NATIVE_BRIDGE_EOF: popupLanguage === 'tr' ? 'Masaustu koprusu beklenmedik sekilde kapandi.' : 'Desktop bridge closed unexpectedly.',
        NATIVE_BRIDGE_SECRET_MISSING: popupLanguage === 'tr' ? 'Masaustu koprusunde eslestirme sirri bulunamadi.' : 'Pairing secret is missing on desktop bridge.',
        CLIENT_PUBLIC_KEY_REQUIRED: popupLanguage === 'tr' ? 'Kalici eslestirme icin istemci anahtari gerekli.' : 'A client key is required for persistent pairing.',
        CLIENT_KEY_ID_MISMATCH: popupLanguage === 'tr' ? 'Istemci anahtar kimligi uyusmuyor.' : 'Client key identity mismatch.',
        INVALID_NATIVE_BRIDGE_SIGNATURE: popupLanguage === 'tr' ? 'Masaustu koprusu istemci imzasini dogrulayamadı.' : 'Desktop bridge could not verify the client signature.',
    };

    const detail = map[normalized] || normalized;
    return `${POPUP_I18N.bridgeErrorPrefix}: ${detail}`;
};

const getPopupRoot = () => {
    const existing = document.getElementById('wxt-app');
    if (existing) return existing;

    const fallback = document.createElement('div');
    fallback.id = 'wxt-app';
    document.body.replaceChildren(fallback);
    return fallback;
};

const setSanitizedMarkup = (target: Element, html: string) => {
    target.innerHTML = DOMPurify.sanitize(html);
};

const renderFatalState = (message: string) => {
    const root = getPopupRoot();
    const t = getT();
    setSanitizedMarkup(root, `
        <div style="padding:16px;min-width:320px;background:${t.bg};color:${t.text};">
            <div style="border:1px solid rgba(239,68,68,0.2);background:${t.card};border-radius:12px;padding:14px;">
                <div style="font-size:13px;font-weight:700;color:#ef4444;margin-bottom:6px;">Aegis Vault</div>
                <div style="font-size:12px;color:${t.textMuted};line-height:1.5;">${message}</div>
            </div>
        </div>
    `);
};


const bootPopup = async () => {
    try {
        const [langRes, themeRes] = await Promise.all([
            browser.runtime.sendMessage({ type: 'GET_UI_LANGUAGE' }).catch(() => null),
            browser.runtime.sendMessage({ type: 'GET_THEME' }).catch(() => null)
        ]);
        
        popupLanguage = normalizeUiLanguage(langRes?.language);
        POPUP_I18N = buildPopupI18n(popupLanguage);
        popupTheme = themeRes?.theme === 'dark' || (themeRes?.theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    } catch {
        popupLanguage = normalizeUiLanguage(typeof navigator !== 'undefined' ? navigator.language : 'en');
        POPUP_I18N = buildPopupI18n(popupLanguage);
        popupTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    const t = getT();
    const app = getPopupRoot();
    const rawHTML = `
        <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px; min-width: 320px; background: ${t.bg}; color: ${t.text}; min-height: 400px;">
            <header style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid ${t.border}; padding-bottom: 12px;">
                <div style="display:flex;align-items:center;gap:10px;">
                   <div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,${t.accent},#101828);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.2);">
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" fill="white"/></svg>
                   </div>
                   <div>
                      <h1 style="margin: 0; font-size: 16px; font-weight: 700; color: ${t.text}; letter-spacing:-0.4px;">Aegis Vault</h1>
                       <p style="margin: 1px 0 0 0; font-size: 10px; color: ${t.accent}; font-weight:600;" id="active-domain">${POPUP_I18N.connecting}</p>
                   </div>
                </div>
                <div style="background: ${t.chipBg}; padding: 4px 10px; border-radius: 20px; border: 1px solid ${t.border};">
                   <span style="font-size: 10px; font-weight: 700; color: ${t.accent};" id="vault-status">${POPUP_I18N.waiting}</span>
                </div>
            </header>
            <section id="bridge-panel" style="display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:12px;background:${t.panelBg};border:1px solid ${t.border};">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                    <strong style="font-size:12px;color:${t.text};">${POPUP_I18N.bridgeTitle}</strong>
                    <span id="bridge-status-chip" style="font-size:10px;font-weight:700;color:${t.accent};background:${t.chipBg};padding:3px 8px;border-radius:999px;">${POPUP_I18N.waiting}</span>
                </div>
                <div id="bridge-meta" style="font-size:11px;color:${t.textMuted};line-height:1.4;">${POPUP_I18N.loading}</div>
                <div style="display:flex;gap:8px;">
                    <button id="pair-bridge-btn" style="flex:1;border:0;border-radius:10px;padding:10px 12px;background:${t.buttonPrimaryBg};color:${t.buttonPrimaryText};font-size:11px;font-weight:700;cursor:pointer;transition:opacity 0.2s;">${POPUP_I18N.bridgePair}</button>
                    <button id="unpair-bridge-btn" style="flex:1;border:1px solid ${t.border};border-radius:10px;padding:10px 12px;background:${t.buttonSecondaryBg};color:${t.buttonSecondaryText};font-size:11px;font-weight:700;cursor:pointer;transition:opacity 0.2s;">${POPUP_I18N.bridgeUnpair}</button>
                </div>
                <div style="font-size:10px;color:${t.textMuted}; opacity: 0.8;">${POPUP_I18N.bridgePairHint}</div>
            </section>
            <section id="cards-container" style="display: flex; flex-direction: column; gap: 8px;">
               <div style="text-align: center; padding: 25px 0; color: ${t.textMuted}; font-size: 12px;">${POPUP_I18N.loading}</div>
            </section>
        </div>
    `;
    setSanitizedMarkup(app, rawHTML);


    const getDomain = (url: string) => {
        try {
            return new URL(url).hostname.replace(/^www\./, '');
        } catch { return ''; }
    };

    const setButtonBusy = (button: HTMLElement | null, busy: boolean, text: string) => {
        if (!button) return;
        button.innerText = text;
        (button as HTMLButtonElement).disabled = busy;
        button.style.opacity = busy ? '0.7' : '1';
        button.style.cursor = busy ? 'wait' : 'pointer';
    };

    const renderBridgeStatus = async () => {
        const chipEl = document.getElementById('bridge-status-chip');
        const metaEl = document.getElementById('bridge-meta');
        const pairBtn = document.getElementById('pair-bridge-btn') as HTMLButtonElement | null;
        const unpairBtn = document.getElementById('unpair-bridge-btn') as HTMLButtonElement | null;

        try {
            const mode = await browser.runtime.sendMessage({ type: 'GET_DESKTOP_BRIDGE_MODE' });
            const desktopPairing = mode?.desktopPairing;
            const nativeEnabled = Boolean(mode?.nativeMessagingEnabled);
            const paired = Boolean(desktopPairing?.paired);
            const fallbackEnabled = Boolean(mode?.loopbackFallbackEnabled);
            const source = String(mode?.pairingSecretSource || 'none');

            const riskFlags = Array.isArray(desktopPairing?.riskFlags) ? desktopPairing.riskFlags : [];
            if (chipEl) {
                chipEl.innerText = paired ? POPUP_I18N.bridgePaired : POPUP_I18N.bridgeNotPaired;
                chipEl.style.color = paired ? (popupTheme === 'dark' ? '#86efac' : '#15803d') : (popupTheme === 'dark' ? '#fcd34d' : '#b45309');
            }


            const sourceLabel =
                source === 'runtime' ? POPUP_I18N.bridgeSourceRuntime :
                source === 'build' ? POPUP_I18N.bridgeSourceBuild :
                POPUP_I18N.bridgeSourceNone;

            if (metaEl) {
                const detailLines = [
                    `<div>${nativeEnabled ? POPUP_I18N.bridgeNativeOn : POPUP_I18N.bridgeNativeOff}</div>`,
                    `<div>${fallbackEnabled ? POPUP_I18N.bridgeFallbackOn : POPUP_I18N.bridgeFallbackOff}</div>`,
                    `<div>${sourceLabel}</div>`,
                ];
                if (paired && desktopPairing?.pairedAt) {
                    detailLines.push(`<div>${desktopPairing.pairedAt}</div>`);
                }
                if (paired && desktopPairing?.lastUsedAt) {
                    detailLines.push(`<div>${POPUP_I18N.bridgeLastUsed}: ${desktopPairing.lastUsedAt}</div>`);
                }
                if (paired && desktopPairing?.lastApprovedAt) {
                    detailLines.push(`<div>${POPUP_I18N.bridgeLastApproved}: ${desktopPairing.lastApprovedAt}</div>`);
                }
                if (paired && desktopPairing?.deviceFingerprint) {
                    detailLines.push(`<div>${POPUP_I18N.bridgeDeviceFingerprint}: ${desktopPairing.deviceFingerprint}</div>`);
                }
                if (paired && desktopPairing?.pairingMode) {
                    detailLines.push(`<div>${POPUP_I18N.bridgePairingMode}: ${desktopPairing.pairingMode === 'signed-p256-v1' ? POPUP_I18N.bridgePairingModeSigned : POPUP_I18N.bridgePairingModeLegacy}</div>`);
                }
                if (paired && desktopPairing?.clientKeyId) {
                    detailLines.push(`<div>${POPUP_I18N.bridgeClientKey}: ${desktopPairing.clientKeyId}</div>`);
                }
                if (riskFlags.length > 0) {
                    detailLines.push(`<div style="color:${popupTheme === 'dark' ? '#f87171' : '#b45309'};font-weight:600;">${POPUP_I18N.bridgeRiskPrefix}: ${riskFlags.join(', ')}</div>`);
                }

                metaEl.innerHTML = DOMPurify.sanitize(`
                    ${detailLines.join('')}
                `);
            }

            if (pairBtn) pairBtn.disabled = !nativeEnabled;
            if (unpairBtn) unpairBtn.disabled = !paired;
            if (pairBtn) pairBtn.style.opacity = !nativeEnabled ? '0.5' : '1';
            if (unpairBtn) unpairBtn.style.opacity = !paired ? '0.5' : '1';
        } catch {
            if (chipEl) chipEl.innerText = POPUP_I18N.backgroundError;
            if (metaEl) metaEl.textContent = POPUP_I18N.backgroundError;
        }
    };

    const wireBridgeActions = () => {
        const pairBtn = document.getElementById('pair-bridge-btn');
        const unpairBtn = document.getElementById('unpair-bridge-btn');

        pairBtn?.addEventListener('click', async () => {
            setButtonBusy(pairBtn, true, POPUP_I18N.bridgePairing);
            try {
                const response = await browser.runtime.sendMessage({ type: 'PAIR_DESKTOP_BRIDGE' });
                if (!response?.success) {
                    throw new Error(response?.error || 'PAIRING_FAILED');
                }
                await renderBridgeStatus();
            } catch (err) {
                const metaEl = document.getElementById('bridge-meta');
                if (metaEl) metaEl.textContent = formatBridgeError(err instanceof Error ? err.message : 'PAIRING_FAILED');
            } finally {
                setButtonBusy(pairBtn, false, POPUP_I18N.bridgePair);
            }
        });

        unpairBtn?.addEventListener('click', async () => {
            setButtonBusy(unpairBtn, true, POPUP_I18N.bridgeUnpairing);
            try {
                const response = await browser.runtime.sendMessage({ type: 'UNPAIR_DESKTOP_BRIDGE' });
                if (!response?.success) {
                    throw new Error(response?.error || 'UNPAIR_FAILED');
                }
                await renderBridgeStatus();
            } catch {
                const metaEl = document.getElementById('bridge-meta');
                if (metaEl) metaEl.textContent = POPUP_I18N.bridgeUnpairFailed;
            } finally {
                setButtonBusy(unpairBtn, false, POPUP_I18N.bridgeUnpair);
            }
        });
    };

    const loadPopup = async () => {
        const domainEl  = document.getElementById('active-domain');
        const statusEl  = document.getElementById('vault-status');
        const containerEl = document.getElementById('cards-container');

        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            const tab  = tabs[0];
            const currentUrl    = tab?.url || '';
            const currentDomain = getDomain(currentUrl);
            const tabId         = tab?.id;

            if (domainEl) domainEl.innerText = currentDomain || POPUP_I18N.unknownSite;

            // Kasa durumu
            const vaultStatus = await browser.runtime.sendMessage({ type: 'GET_VAULT_STATUS' });

            if (!vaultStatus?.isUnlocked) {
                if (statusEl) { statusEl.innerText = POPUP_I18N.vaultLocked; statusEl.style.color = '#f59e0b'; }
                if (containerEl) {
                    const h = `<div style="text-align:center;padding:20px 0;color:#f59e0b;font-size:12px;font-weight:600;">${POPUP_I18N.vaultLocked}</div>
                               <div style="font-size:11px;color:#475569;text-align:center;">${POPUP_I18N.openVaultHint}</div>`;
                    setSanitizedMarkup(containerEl, h);
                }
                return;
            }

            const requestNonce = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random()}`;
            const response = await browser.runtime.sendMessage({ type: 'GET_DOMAIN_CREDS', domain: currentDomain.toLowerCase(), requestNonce });
            const passwords = Array.isArray(response?.data) ? response.data : [];

            if (!response?.success || passwords.length === 0) {
                if (statusEl) { statusEl.innerText = POPUP_I18N.vaultEmpty; statusEl.style.color = '#f59e0b'; }
                if (containerEl) {
                    const h = `<div style="text-align:center;padding:18px 0;color:#64748b;font-size:12px;">${POPUP_I18N.noRecordForSite}</div>`;
                    setSanitizedMarkup(containerEl, h);
                }
                return;
            }

            if (statusEl) { statusEl.innerText = POPUP_I18N.vaultOpen; statusEl.style.color = '#22c55e'; }

            const matches = passwords.slice(0, 5);

            if (!containerEl) return;
            containerEl.textContent = '';

            // Kartlar
            matches.forEach((p: PopupCredential) => {
                const card = document.createElement('div');
                const t = getT();
                card.style.cssText = `
                    display:flex;align-items:center;gap:10px;padding:10px;
                    border-radius:12px;cursor:pointer;transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    background:${t.itemBg};border:1px solid ${t.border};
                `;


                const letter = (p.title || '?').charAt(0).toUpperCase();
                const avatarStyle = `
                    width:36px;height:36px;border-radius:10px;flex-shrink:0;
                    background:linear-gradient(135deg,${t.accent},#101828);
                    display:flex;align-items:center;justify-content:center;
                    color:white;font-weight:800;font-size:14px;
                    box-shadow:0 3px 10px rgba(0,0,0,0.15);
                `;


                const safeTitle    = DOMPurify.sanitize(p.title    || '');
                const safeUsername = DOMPurify.sanitize(p.username || '');

                const inner = `
                    <div style="${avatarStyle}">${letter}</div>
                    <div style="flex:1;overflow:hidden;">
                        <div style="font-size:13px;font-weight:700;color:${t.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${safeTitle}</div>
                        <div style="font-size:11px;color:${t.textMuted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;">${safeUsername || POPUP_I18N.noUsername}</div>
                    </div>
                    <div style="font-size:11px;color:${t.accent};font-weight:700;flex-shrink:0;">${POPUP_I18N.fill}</div>
                `;

                setSanitizedMarkup(card, inner);

                // Hover efekti
                card.addEventListener('mouseenter', () => {
                    card.style.background = t.itemHover;
                    card.style.borderColor = t.accent;
                    card.style.transform = 'translateY(-1px) scale(1.01)';
                    card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                });
                card.addEventListener('mouseleave', () => {
                    card.style.background = t.itemBg;
                    card.style.borderColor = t.border;
                    card.style.transform = 'none';
                    card.style.boxShadow = 'none';
                });


                // Tıklanınca background'a fill komutu gönder
                card.addEventListener('click', async () => {
                    if (!tabId) return;

                    // Butonu geçici olarak güncelle
                    const fillBtn = card.querySelector('div:last-child') as HTMLElement;
                    if (fillBtn) { fillBtn.innerText = `✓ ${POPUP_I18N.filled}`; fillBtn.style.color = '#22c55e'; }

                    await browser.runtime.sendMessage({
                        type: 'FILL_CREDENTIALS',
                        tabId,
                        entry: {
                            username: p.username || '',
                            pass:     p.pass     || '',
                        }
                    });

                    // 800ms sonra popup'ı kapat
                    setTimeout(() => window.close(), 800);
                });

                containerEl.appendChild(card);
            });

        } catch (err) {
            console.error('[Aegis Popup]', err);
            if (containerEl) {
                const h = `<div style='color:red;font-size:12px;text-align:center;'>${POPUP_I18N.backgroundError}</div>`;
                setSanitizedMarkup(containerEl, h);
            }
        }
    };

    wireBridgeActions();
    await renderBridgeStatus();
    await loadPopup();
};

window.addEventListener('error', (event) => {
    console.error('[Aegis Popup] Unhandled error:', event.error || event.message);
    renderFatalState(POPUP_I18N.backgroundError);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('[Aegis Popup] Unhandled rejection:', event.reason);
    renderFatalState(POPUP_I18N.backgroundError);
});

bootPopup().catch((error) => {
    console.error('[Aegis Popup] Boot failed:', error);
    renderFatalState(POPUP_I18N.backgroundError);
});

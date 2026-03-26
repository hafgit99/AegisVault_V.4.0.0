/* eslint-disable react-refresh/only-export-components */
// @ts-nocheck

import { defineContentScript } from 'wxt/sandbox';
import { browser } from 'wxt/browser';
import { createShadowRootUi } from 'wxt/client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

type ContentI18n = {
  noUsername: string;
  recordsLabel: string;
  noRecordForSite: string;
  filledSuccess: string;
  authSuccess: string;
  errorTitle: string;
  unlockedTitle: string;
  lockedTitle: string;
};

const normalizeUiLanguage = (value: unknown) =>
  typeof value === 'string' && value.toLowerCase().startsWith('tr') ? 'tr' : 'en';

const buildContentI18n = (language: 'tr' | 'en'): ContentI18n => ({
  noUsername: language === 'tr' ? 'Kullanıcı adı yok' : 'No username',
  recordsLabel: language === 'tr' ? 'kayıt' : 'record(s)',
  noRecordForSite: language === 'tr' ? 'Bu site için kayıt bulunamadı' : 'No records found for this site',
  filledSuccess: language === 'tr' ? 'Başarıyla dolduruldu' : 'Filled successfully',
  authSuccess: language === 'tr' ? 'Kimlik doğrulama başarılı' : 'Authentication successful',
  errorTitle: language === 'tr' ? 'Bir hata oluştu' : 'An error occurred',
  unlockedTitle: language === 'tr' ? 'Kasa Açık' : 'Vault Unlocked',
  lockedTitle: language === 'tr' ? 'Kasa Kilitli' : 'Vault Locked',
});

let extensionLanguage: 'tr' | 'en' = normalizeUiLanguage(typeof navigator !== 'undefined' ? navigator.language : 'en');
let EXT_I18N = buildContentI18n(extensionLanguage);

type CredentialMatch = {
  title?: string;
  username?: string;
  pass?: string;
  website?: string;
};

type PasskeyMatch = {
  title?: string;
  username?: string;
  website?: string;
  passkeyMetadata?: {
    credential_id: string;
    rp_id: string;
    mode: string;
  };
};

const syncLanguageState = (language: unknown) => {
  extensionLanguage = normalizeUiLanguage(language);
  EXT_I18N = buildContentI18n(extensionLanguage);
};

// ─── Inline Styles (Shadow DOM içinde Tailwind çalışmaz, tüm stiller inline) ───
const STYLES = {
  container: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none' as const,
    zIndex: 2147483647,
    fontFamily: "'Geist Mono', 'SF Mono', 'Cascadia Code', 'Fira Code', monospace",
  },
  popup: (top: number, left: number, isDark: boolean) => ({
    position: 'absolute' as const,
    top: top + 8,
    left: Math.min(left, window.innerWidth - 280),
    width: 270,
    pointerEvents: 'auto' as const,
    zIndex: 2147483647,
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: isDark 
      ? '0 20px 60px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)' 
      : '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.10)',
    border: isDark 
       ? '1.5px solid rgba(255,255,255,0.1)' 
       : '1.5px solid rgba(114,136,111,0.22)',
    background: isDark
      ? 'linear-gradient(135deg, rgba(20,24,33,0.96) 0%, rgba(15,18,24,0.98) 100%)'
      : 'linear-gradient(135deg, rgba(255,255,255,0.97) 0%, rgba(245,248,244,0.98) 100%)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  }),
  header: (isDark: boolean) => ({
    padding: '12px 14px 10px',
    borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(114,136,111,0.12)',
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 8,
    background: isDark 
      ? 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)'
      : 'linear-gradient(90deg, rgba(114,136,111,0.08) 0%, rgba(114,136,111,0.04) 100%)',
  }),
  logo: {
    width: 22,
    height: 22,
    borderRadius: 6,
    background: 'linear-gradient(135deg, #72886f 0%, #101828 100%)',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
  headerTitle: (isDark: boolean) => ({
    fontSize: 13,
    fontWeight: 700,
    color: isDark ? '#f9fafb' : '#101828',
    letterSpacing: '-0.3px',
    flex: 1,
  }),
  headerSub: (isDark: boolean) => ({
    fontSize: 10,
    color: isDark ? '#9ca3af' : '#72886f',
    marginLeft: 'auto' as const,
    fontWeight: 600,
    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(114,136,111,0.10)',
    padding: '2px 7px',
    borderRadius: 20,
  }),
  body: {
    padding: '8px 10px 10px',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: 5,
    maxHeight: 280,
    overflowY: 'auto' as const,
  },
  entryRow: (hovered: boolean, isDark: boolean) => ({
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 10,
    padding: '9px 10px',
    borderRadius: 10,
    cursor: 'pointer' as const,
    transition: 'all 0.15s ease',
    background: hovered
      ? (isDark ? 'rgba(255,255,255,0.05)' : 'linear-gradient(90deg, rgba(114,136,111,0.13) 0%, rgba(114,136,111,0.07) 100%)')
      : (isDark ? 'transparent' : 'rgba(114,136,111,0.04)'),
    border: hovered 
      ? (isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(114,136,111,0.25)') 
      : (isDark ? '1px solid transparent' : '1px solid rgba(114,136,111,0.08)'),
    transform: hovered ? 'translateX(2px)' : 'none',
  }),
  avatar: (isDark: boolean) => ({
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #72886f 0%, #101828 100%)',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    color: 'white',
    fontWeight: 800,
    fontSize: 13,
    flexShrink: 0,
    boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(114,136,111,0.25)',
  }),
  entryInfo: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    overflow: 'hidden' as const,
    flex: 1,
  },
  entryTitle: (isDark: boolean) => ({
    fontSize: 12,
    fontWeight: 700,
    color: isDark ? '#f3f4f6' : '#101828',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
  }),
  entryUser: (isDark: boolean) => ({
    fontSize: 10,
    color: isDark ? '#9ca3af' : '#64748b',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    marginTop: 1,
  }),
  fillArrow: (isDark: boolean) => ({
    fontSize: 14,
    color: isDark ? '#4b5563' : '#72886f',
    flexShrink: 0,
    opacity: 0.7,
  }),
  filledView: {
    padding: '40px 0',
    textAlign: 'center' as const,
  },
  successIcon: {
    width: 32,
    height: 32,
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    borderRadius: '50%',
    margin: '0 auto 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
  },
  successText: (isDark: boolean) => ({
    fontSize: 13,
    fontWeight: 600,
    color: isDark ? '#10b981' : '#16a34a',
  }),
  emptyText: (isDark: boolean) => ({
    fontSize: 11,
    color: isDark ? '#94a3b8' : '#94a3b8',
    textAlign: 'center' as const,
    padding: '10px 0 6px',
  }),
  passkeyBadge: {
    fontSize: 9,
    fontWeight: 800,
    color: 'white',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    padding: '1px 5px',
    borderRadius: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    boxShadow: '0 1px 3px rgba(16,185,129,0.3)',
  },
};

// ─── Fill Helper ───
// React/Vue/Angular/vanilla hepsinde çalışan güvenilir fill
function triggerFill(el: HTMLInputElement, value: string) {
  // 1) Focus ver
  el.focus();

  // 2) Native setter ile değer ata (React controlled input için zorunlu)
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  if (nativeSetter) {
    nativeSetter.call(el, value);
  } else {
    el.value = value;
  }

  // 3) Tüm gerekli eventleri sırayla at
  el.dispatchEvent(new Event('focus',  { bubbles: true }));
  el.dispatchEvent(new Event('input',  { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent('keydown',  { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent('keypress', { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent('keyup',    { bubbles: true }));
  el.dispatchEvent(new Event('blur',   { bubbles: true }));
}

function fillInputs(inputEl: HTMLInputElement, entry: CredentialMatch) {
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input'))
    .filter(i => i.offsetParent !== null); // sadece görünür input'lar
  const idx = inputs.indexOf(inputEl);

  if (inputEl.type === 'password') {
    // Şifre alanına gelindi: önce username'i bul ve doldur, sonra şifreyi
    for (let i = idx - 1; i >= 0; i--) {
      const prev = inputs[i];
      if (prev.type === 'text' || prev.type === 'email') {
        triggerFill(prev, entry.username || '');
        break;
      }
    }
    triggerFill(inputEl, entry.pass || '');
  } else {
    // Username/email alanına gelindi: doldur, sonra password alanını bul
    triggerFill(inputEl, entry.username || '');
    for (let i = idx + 1; i < inputs.length; i++) {
      const next = inputs[i];
      if (next.type === 'password') {
        triggerFill(next, entry.pass || '');
        break;
      }
    }
  }
}

// ─── Entry Row Component ───
const EntryRow = ({ entry, onFill, isPasskey, isDark }: { entry: CredentialMatch | PasskeyMatch; onFill: () => void; isPasskey?: boolean; isDark: boolean }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={STYLES.entryRow(hovered, isDark)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={(e) => e.preventDefault()} // focus kaybını engelle
      onClick={onFill}
    >
      <div style={STYLES.avatar(isDark)}>
        {isPasskey ? (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        ) : (
          entry.title?.charAt(0)?.toUpperCase() || '?'
        )}
      </div>
      <div style={STYLES.entryInfo}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={STYLES.entryTitle(isDark)}>{entry.title}</div>
          {isPasskey && <span style={STYLES.passkeyBadge}>Key</span>}
        </div>
        <div style={STYLES.entryUser(isDark)}>{entry.username || EXT_I18N.noUsername}</div>
      </div>
      <span style={STYLES.fillArrow(isDark)}>→</span>
    </div>
  );
};

// ─── Ana Overlay Component ───
const AegisOverlay = () => {
  const [activeRect, setActiveRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [filled, setFilled] = useState(false);
  const [matchingPasswords, setMatchingPasswords] = useState<CredentialMatch[]>([]);
  const [matchingPasskeys, setMatchingPasskeys] = useState<PasskeyMatch[]>([]);
  const [pendingWebAuthnOptions, setPendingWebAuthnOptions] = useState<any | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  useEffect(() => {
    // Detect dark mode from system preference or body/html class
    const checkDark = () => {
       const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
       const hostClasses = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark') || document.documentElement.getAttribute('data-theme') === 'dark';
       setIsDarkMode(systemDark || hostClasses);
    };
    checkDark();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', checkDark);
    return () => media.removeEventListener('change', checkDark);
  }, []);

  const hide = useCallback(() => {
    clearHideTimer();
    setIsVisible(false);
    setFilled(false);
    setMatchingPasswords([]);
    setMatchingPasskeys([]);
    inputRef.current = null;
    setActiveRect(null);
  }, []);

  useEffect(() => {
    const handleFocus = async (e: FocusEvent) => {
      const target = e.target as HTMLInputElement;
      if (!target || target.tagName !== 'INPUT') return;

      const isWebAuthn = target.autocomplete === 'webauthn' || target.getAttribute('autocomplete') === 'webauthn';
      if (
        (!['password', 'text', 'email', 'username'].includes(target.type) && !isWebAuthn)
      ) return;

      clearHideTimer();

      try {
        const status = await browser.runtime.sendMessage({ type: 'GET_VAULT_STATUS' });
        if (!status?.isUnlocked) { hide(); return; }

        const domain = window.location.hostname.replace(/^www\./, '').toLowerCase();
        if (!domain) { hide(); return; }

        const requestNonce = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

        // Fetch both credentials and passkeys in parallel
        const [credsResponse, passkeysResponse] = await Promise.all([
          browser.runtime.sendMessage({ type: 'GET_DOMAIN_CREDS', domain, requestNonce }),
          browser.runtime.sendMessage({ type: 'GET_DOMAIN_PASSKEYS', domain, requestNonce }),
        ]);

        const matches = Array.isArray(credsResponse?.data) ? credsResponse.data as CredentialMatch[] : [];
        const passkeyMatches = Array.isArray(passkeysResponse?.data) ? passkeysResponse.data as PasskeyMatch[] : [];
        
        if (matches.length === 0 && passkeyMatches.length === 0) { hide(); return; }

        inputRef.current = target;
        setActiveRect(target.getBoundingClientRect());
        setMatchingPasswords(matches);
        setMatchingPasskeys(passkeyMatches);
        setFilled(false);
        setIsVisible(true);
      } catch {
        hide();
      }
    };

    const handleBlur = () => {
      // 400ms bekle — kullanıcı overlay'e tıklıyor olabilir
      clearHideTimer();
      hideTimer.current = setTimeout(() => hide(), 400);
    };

    const handleScroll = () => hide();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);
    document.addEventListener('scroll', handleScroll, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
      document.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('keydown', handleKeyDown);
      clearHideTimer();
    };
  }, [hide]);

  useEffect(() => {
    const handleInjectedMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data?.type === 'AEGIS_WEBAUTHN_CONDITIONAL_PENDING') {
        console.log('[Aegis Vault] 🛡️ Received conditional WebAuthn options:', event.data.options);
        setPendingWebAuthnOptions(event.data.options);
      }
    };
    window.addEventListener('message', handleInjectedMessage);
    return () => window.removeEventListener('message', handleInjectedMessage);
  }, []);

  if (!isVisible || !activeRect) return null;

  return (
    <div style={STYLES.container}>
        <div style={STYLES.popup(activeRect.bottom, activeRect.left, isDarkMode)}>
          {/* Header */}
          <div style={STYLES.header(isDarkMode)}>
            <div style={STYLES.logo}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" fill="white" opacity="0.9"/>
              </svg>
            </div>
            <span style={STYLES.headerTitle(isDarkMode)}>Aegis Vault</span>
            <span style={STYLES.headerSub(isDarkMode)}>{(matchingPasswords.length + matchingPasskeys.length)} {EXT_I18N.recordsLabel}</span>
          </div>

          {/* Body */}
          <div style={STYLES.body}>
            {!filled ? (
              (matchingPasswords.length > 0 || matchingPasskeys.length > 0) ? (
                <>
                  {matchingPasskeys.map((passkey, idx) => (
                    <EntryRow
                      key={`pk-${idx}`}
                      entry={passkey}
                      isPasskey={true}
                      isDark={isDarkMode}
                      onFill={async () => {
                        clearHideTimer();
                        // Passkey selection logic - Trigger WebAuthn
                        console.log('[Aegis Vault] Passkey selected:', passkey.title);
                        
                        if (!pendingWebAuthnOptions) {
                          toast?.error?.(EXT_I18N.errorTitle || 'WebAuthn request not found');
                          return;
                        }

                        try {
                          const response = await browser.runtime.sendMessage({
                            type: 'AUTH_PASSKEY',
                            domain: window.location.hostname,
                            options: pendingWebAuthnOptions,
                            passkeyMetadata: passkey.passkeyMetadata
                          });

                          if (response?.success) {
                            console.log('[Aegis Vault] Passkey Auth Success:', response.authResult);
                            toast?.success?.(EXT_I18N.authSuccess);
                            setFilled(true);
                            setTimeout(() => hide(), 900);
                          } else {
                            console.error('[Aegis Vault] Passkey Auth Failed:', response?.error);
                            toast?.error?.(response?.error || EXT_I18N.errorTitle);
                          }
                        } catch (err) {
                           console.error('[Aegis Vault] Auth error:', err);
                        }
                      }}
                    />
                  ))}
                  {matchingPasswords.map((entry, idx) => (
                    <EntryRow
                      key={`pw-${idx}`}
                      entry={entry}
                      isDark={isDarkMode}
                      onFill={() => {
                        clearHideTimer();
                        if (inputRef.current) {
                          fillInputs(inputRef.current, entry);
                        }
                        setFilled(true);
                        setTimeout(() => hide(), 900);
                      }}
                    />
                  ))}
                </>
              ) : (
                <div style={STYLES.emptyText(isDarkMode)}>{EXT_I18N.noRecordForSite}</div>
              )
            ) : (
              <div style={STYLES.filledView}>
                <div style={STYLES.successIcon}>✓</div>
                <div style={STYLES.successText(isDarkMode)}>{EXT_I18N.filledSuccess}</div>
              </div>
            )}
          </div>
        </div>
    </div>
  );
};

// ─── Content Script Tanımı ───
export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    console.log('[Aegis Vault] Content Script Aktif');

    // Güvenli Origin Listesi
    const TRUSTED_ORIGINS = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://app.aegisvault.xyz',
      'https://www.aegisvault.xyz',
      'https://aegisvault.xyz',
    ];

    let sessionNonce = crypto.randomUUID();

    try {
      const languageResponse = await browser.runtime.sendMessage({ type: 'GET_UI_LANGUAGE' });
      syncLanguageState(languageResponse?.language);
    } catch {
      syncLanguageState(typeof navigator !== 'undefined' ? navigator.language : 'en');
    }

    window.addEventListener('message', (event) => {
      if (event.source !== window || !event.data) return;
      if (!TRUSTED_ORIGINS.includes(event.origin) && !event.origin.startsWith('chrome-extension://')) return;

      if (event.data.type === 'AEGIS_SYNC_VAULT') {
        if (!event.data.nonce || event.data.nonce !== sessionNonce) {
          console.warn('[Aegis Vault] Geçersiz nonce');
          return;
        }
        sessionNonce = crypto.randomUUID();
        window.postMessage({ type: 'AEGIS_NONCE_UPDATE', nonce: sessionNonce }, event.origin);
        browser.runtime.sendMessage({ type: 'SAVE_VAULT', data: event.data.payload }).catch(() => {});
      }

      if (event.data.type === 'AEGIS_LOCK_VAULT') {
        if (!event.data.nonce || event.data.nonce !== sessionNonce) {
          console.warn('[Aegis Vault] Geçersiz nonce (LOCK)');
          return;
        }
        sessionNonce = crypto.randomUUID();
        window.postMessage({ type: 'AEGIS_NONCE_UPDATE', nonce: sessionNonce }, event.origin);
        browser.runtime.sendMessage({ type: 'LOCK_VAULT' }).catch(() => {});
      }

      if (event.data.type === 'AEGIS_UI_LANGUAGE') {
        const normalizedLanguage = normalizeUiLanguage(event.data.language);
        syncLanguageState(normalizedLanguage);
        browser.runtime.sendMessage({ type: 'SET_UI_LANGUAGE', language: normalizedLanguage }).catch(() => {});
      }
    });

    const currentOrigin = window.location.origin;
    if (TRUSTED_ORIGINS.includes(currentOrigin)) {
      try {
        const pageLanguage =
          window.localStorage.getItem('aegis_language_i18n') ||
          window.localStorage.getItem('i18nextLng') ||
          '';
        const normalizedLanguage = normalizeUiLanguage(pageLanguage);
        syncLanguageState(normalizedLanguage);
        await browser.runtime.sendMessage({ type: 'SET_UI_LANGUAGE', language: normalizedLanguage });
      } catch {
        // localStorage veya background bridge her ortamda erisilebilir olmayabilir
      }
      // Aegis web app sayfalarında sadece güvenli mesaj köprüsü çalışsın.
      // Autofill overlay'i form inputlarını engellememesi için mount etmiyoruz.
      window.postMessage({ type: 'AEGIS_EXTENSION_READY', nonce: sessionNonce }, currentOrigin);
      return;
    }

    const ui = await createShadowRootUi(ctx, {
      name: 'aegis-autofill-ui',
      position: 'overlay',
      zIndex: 2147483647,
      onMount: (container) => {
        const root = createRoot(container);
        root.render(<AegisOverlay />);
        return root;
      },
      onRemove: (root) => {
        root?.unmount();
      },
    });

    ui.mount();
  },
});

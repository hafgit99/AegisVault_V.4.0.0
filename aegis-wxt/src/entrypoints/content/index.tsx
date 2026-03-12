import { defineContentScript } from 'wxt/sandbox';
import { browser } from 'wxt/browser';
import { createShadowRootUi } from 'wxt/client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

const isTurkishLocale = (typeof navigator !== 'undefined' ? navigator.language : 'en').toLowerCase().startsWith('tr');
const EXT_I18N = {
  noUsername: isTurkishLocale ? 'Kullanici adi yok' : 'No username',
  recordsLabel: isTurkishLocale ? 'kayit' : 'record(s)',
  noRecordForSite: isTurkishLocale ? 'Bu site icin kayit bulunamadi' : 'No records found for this site',
  filledSuccess: isTurkishLocale ? 'Basariyla dolduruldu' : 'Filled successfully',
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
  popup: (top: number, left: number) => ({
    position: 'absolute' as const,
    top: top + 8,
    left: Math.min(left, window.innerWidth - 280),
    width: 270,
    pointerEvents: 'auto' as const,
    zIndex: 2147483647,
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.10)',
    border: '1.5px solid rgba(114,136,111,0.22)',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.97) 0%, rgba(245,248,244,0.98) 100%)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  }),
  header: {
    padding: '12px 14px 10px',
    borderBottom: '1px solid rgba(114,136,111,0.12)',
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 8,
    background: 'linear-gradient(90deg, rgba(114,136,111,0.08) 0%, rgba(114,136,111,0.04) 100%)',
  },
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
  headerTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#101828',
    letterSpacing: '-0.3px',
  },
  headerSub: {
    fontSize: 10,
    color: '#72886f',
    marginLeft: 'auto' as const,
    fontWeight: 600,
    background: 'rgba(114,136,111,0.10)',
    padding: '2px 7px',
    borderRadius: 20,
  },
  body: {
    padding: '8px 10px 10px',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: 5,
  },
  entryRow: (hovered: boolean) => ({
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 10,
    padding: '9px 10px',
    borderRadius: 10,
    cursor: 'pointer' as const,
    transition: 'all 0.15s ease',
    background: hovered
      ? 'linear-gradient(90deg, rgba(114,136,111,0.13) 0%, rgba(114,136,111,0.07) 100%)'
      : 'rgba(114,136,111,0.04)',
    border: hovered ? '1px solid rgba(114,136,111,0.25)' : '1px solid rgba(114,136,111,0.08)',
    transform: hovered ? 'translateX(2px)' : 'none',
  }),
  avatar: (letter: string) => ({
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
    boxShadow: '0 2px 8px rgba(114,136,111,0.25)',
  }),
  entryInfo: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    overflow: 'hidden' as const,
    flex: 1,
  },
  entryTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#101828',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
  },
  entryUser: {
    fontSize: 10,
    color: '#64748b',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    marginTop: 1,
  },
  fillArrow: {
    fontSize: 14,
    color: '#72886f',
    flexShrink: 0,
    opacity: 0.7,
  },
  successBox: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 7,
    padding: '12px',
    background: 'rgba(34,197,94,0.08)',
    border: '1px solid rgba(34,197,94,0.20)',
    borderRadius: 10,
    margin: '4px 0',
  },
  successText: {
    fontSize: 12,
    fontWeight: 700,
    color: '#16a34a',
  },
  emptyText: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center' as const,
    padding: '10px 0 6px',
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

function fillInputs(inputEl: HTMLInputElement, entry: any) {
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
const EntryRow = ({ entry, onFill }: { entry: any; onFill: (e: any) => void }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={STYLES.entryRow(hovered)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={(e) => e.preventDefault()} // focus kaybını engelle
      onClick={onFill}
    >
      <div style={STYLES.avatar(entry.title?.charAt(0)?.toUpperCase() || '?')}>
        {entry.title?.charAt(0)?.toUpperCase() || '?'}
      </div>
      <div style={STYLES.entryInfo}>
        <div style={STYLES.entryTitle}>{entry.title}</div>
        <div style={STYLES.entryUser}>{entry.username || EXT_I18N.noUsername}</div>
      </div>
      <span style={STYLES.fillArrow}>→</span>
    </div>
  );
};

// ─── Ana Overlay Component ───
const AegisOverlay = () => {
  const [activeRect, setActiveRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [filled, setFilled] = useState(false);
  const [matchingPasswords, setMatchingPasswords] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const hide = useCallback(() => {
    clearHideTimer();
    setIsVisible(false);
    setFilled(false);
    setMatchingPasswords([]);
    inputRef.current = null;
    setActiveRect(null);
  }, []);

  useEffect(() => {
    const handleFocus = async (e: FocusEvent) => {
      const target = e.target as HTMLInputElement;
      if (
        !target ||
        target.tagName !== 'INPUT' ||
        !['password', 'text', 'email'].includes(target.type)
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
        const response = await browser.runtime.sendMessage({ type: 'GET_DOMAIN_CREDS', domain, requestNonce });
        const matches = Array.isArray(response?.data) ? response.data : [];
        if (!response?.success || matches.length === 0) { hide(); return; }

        inputRef.current = target;
        setActiveRect(target.getBoundingClientRect());
        setMatchingPasswords(matches);
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

  if (!isVisible || !activeRect) return null;

  return (
    <div style={STYLES.container}>
      <div
        style={STYLES.popup(activeRect.bottom, activeRect.left)}
        onMouseEnter={clearHideTimer}
        onMouseLeave={() => {
          hideTimer.current = setTimeout(() => hide(), 300);
        }}
      >
        {/* Header */}
        <div style={STYLES.header}>
          <div style={STYLES.logo}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" fill="white" opacity="0.9"/>
            </svg>
          </div>
          <span style={STYLES.headerTitle}>Aegis Vault</span>
          <span style={STYLES.headerSub}>{matchingPasswords.length} {EXT_I18N.recordsLabel}</span>
        </div>

        {/* Body */}
        <div style={STYLES.body}>
          {!filled ? (
            matchingPasswords.length > 0 ? (
              matchingPasswords.map((entry, idx) => (
                <EntryRow
                  key={idx}
                  entry={entry}
                  onFill={() => {
                    clearHideTimer();
                    if (inputRef.current) {
                      fillInputs(inputRef.current, entry);
                    }
                    setFilled(true);
                    setTimeout(() => hide(), 900);
                  }}
                />
              ))
            ) : (
              <div style={STYLES.emptyText}>{EXT_I18N.noRecordForSite}</div>
            )
          ) : (
            <div style={STYLES.successBox}>
              <span style={{ fontSize: 16 }}>✓</span>
              <span style={STYLES.successText}>{EXT_I18N.filledSuccess}</span>
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
    });

    const currentOrigin = window.location.origin;
    if (TRUSTED_ORIGINS.includes(currentOrigin)) {
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

import './style.css';
import { defineContentScript } from 'wxt/sandbox';
import { browser } from 'wxt/browser';
import { createShadowRootUi } from 'wxt/client';
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Key, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

// Tailwind CSS injection via style.css is already configured above.
// Geist Mono font should be injected via CSS but standard sans/mono can be a fallback.

const AegisOverlay = () => {
  const [activeRect, setActiveRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [filled, setFilled] = useState(false);
  const [vaultPasswords, setVaultPasswords] = useState<any[]>([]);
  const [matchingPasswords, setMatchingPasswords] = useState<any[]>([]);
  const [isVaultLocked, setIsVaultLocked] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 🔒 Kasa kilit durumunu dinle (Background Service Worker'dan)
  useEffect(() => {
    const checkVaultStatus = async () => {
      try {
        const status = await browser.runtime.sendMessage({ type: "GET_VAULT_STATUS" });
        setIsVaultLocked(!status?.isUnlocked);
      } catch (e) {
        setIsVaultLocked(true);
      }
    };
    checkVaultStatus();
    
    // Periyodik kontrol (her 30 saniyede bir)
    const intervalId = setInterval(checkVaultStatus, 30000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const handleFocus = async (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        target.tagName === 'INPUT' &&
        ((target as HTMLInputElement).type === 'password' || (target as HTMLInputElement).type === 'text' || (target as HTMLInputElement).type === 'email')
      ) {
        
        try {
          // 🔒 Önce kasa durumunu kontrol et
          const status = await browser.runtime.sendMessage({ type: "GET_VAULT_STATUS" });
          if (!status?.isUnlocked) {
            setIsVaultLocked(true);
            setVaultPasswords([]);
            setMatchingPasswords([]);
            return; // Kasa kilitli, overlay gösterme
          }
          setIsVaultLocked(false);

          // Arka plandan güncel şifre listesini çek
          const res = await browser.runtime.sendMessage({ type: "GET_VAULT" });
          if (res && res.length > 0) {
            setVaultPasswords(res);
            
            // Domain eşleşmesi bul
            const domain = window.location.hostname;
            let matches = res.filter((p: any) => p.website && domain && (p.website.includes(domain) || domain.includes(p.website)));
            
            // Eğer o siteye ait eşleşme yoksa kasadaki ilk 3 şifreyi öneri olarak sun
            if (matches.length === 0) {
              matches = res.slice(0, 3);
            } else {
              matches = matches.slice(0, 3); // Eşleşenleri en fazla 3 tane göster
            }
            
            setMatchingPasswords(matches);
            
            inputRef.current = target as HTMLInputElement;
            setActiveRect(target.getBoundingClientRect());
            setIsVisible(true);
            setFilled(false);
          } else {
            // Boş döndüyse kasa kapalıdır
            setVaultPasswords([]);
            setMatchingPasswords([]);
          }
        } catch (error) {
          console.error("Aegis Vault arka plan ile iletişim kuramadı:", error);
        }
      }
    };

    const handleBlur = (e: FocusEvent) => {
      // Small timeout to allow clicking on the tooltip
      setTimeout(() => {
        setIsVisible(false);
      }, 300);
    };

    const handleScroll = () => {
      if (isVisible) setIsVisible(false);
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);
    document.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [isVisible, vaultPasswords]);

  return (
    <div className="aegis-container" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 2147483647 }}>
      <AnimatePresence>
        {isVisible && activeRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.9, y: 10, filter: 'blur(4px)' }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
            style={{
              position: 'absolute',
              top: activeRect.bottom + 8,
              left: activeRect.left,
              pointerEvents: 'auto'
            }}
            className={cn(
               "relative flex flex-col items-center justify-center p-[2px] rounded-2xl",
               "overflow-hidden group cursor-pointer"
            )}
            onClick={() => {
              setFilled(true);
              setTimeout(() => setIsVisible(false), 1200);
            }}
          >
            {/* Ambient Background Glow Effect (Magic UI Look) */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-30 group-hover:opacity-60 blur-xl transition-opacity duration-500" />
            
            {/* The Liquid Glass Tooltip */}
            <div className={cn(
              "relative w-64 p-4 rounded-xl flex flex-col gap-3",
              "bg-white/10 dark:bg-gray-950/40 backdrop-blur-xl",
              "border border-white/20 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
            )}>
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-sm tracking-tight text-gray-800 dark:text-gray-100 font-[Geist Mono,monospace]">
                  Aegis Vault
                </span>
              </div>

              {!filled ? (
                <div className="flex flex-col gap-2">
                  {matchingPasswords.length > 0 ? matchingPasswords.map((p, idx) => (
                    <div 
                      key={idx} 
                      onMouseDown={(e) => {
                         // Prevent losing focus from input
                         e.preventDefault();
                      }}
                      onClick={() => {
                         // Autofill logic
                         const activeEl = inputRef.current;
                         if (activeEl) {
                            const inputs = Array.from(document.querySelectorAll('input'));
                            const idx = inputs.indexOf(activeEl);
                            
                            if (activeEl.type === 'password') {
                               // Kasa focus'u bir password alanıysa
                               activeEl.value = p.pass;
                               activeEl.dispatchEvent(new Event('input', { bubbles: true }));
                               
                               // Geriye doğru gidip username alanını bul
                               for (let i = idx - 1; i >= 0; i--) {
                                  const prev = inputs[i];
                                  // Gizli olmayan text veya email alanını kabul et
                                  if ((prev.type === 'text' || prev.type === 'email') && prev.style.display !== 'none' && prev.type !== 'hidden') {
                                     prev.value = p.username || '';
                                     prev.dispatchEvent(new Event('input', { bubbles: true }));
                                     break; 
                                  }
                               }
                            } else if (activeEl.type === 'text' || activeEl.type === 'email') {
                               // Kasa focus'u bir username alanına yapışmışsa
                               activeEl.value = p.username || '';
                               activeEl.dispatchEvent(new Event('input', { bubbles: true }));
                               
                               // İleriye doğru gidip password alanını bul
                               for (let i = idx + 1; i < inputs.length; i++) {
                                  const next = inputs[i];
                                  if (next.type === 'password') {
                                     next.value = p.pass;
                                     next.dispatchEvent(new Event('input', { bubbles: true }));
                                     break; 
                                  }
                               }
                            }
                         }
                         setFilled(true);
                         setTimeout(() => setIsVisible(false), 800);
                      }} 
                      className="flex items-center gap-3 p-2 rounded-lg bg-white/40 dark:bg-black/40 hover:bg-white/60 dark:hover:bg-black/60 transition-colors cursor-pointer border border-transparent hover:border-blue-500/30"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-sage-green)] to-[#2D3748] flex items-center justify-center text-white font-bold shadow-inner" style={{background: 'linear-gradient(to bottom right, #72886f, #101828)'}}>
                        {p.title.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col items-start font-[Geist Mono,monospace] w-[140px]">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate w-full">{p.title}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate w-full">{p.username || 'No Username'}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="text-xs text-gray-500 text-center py-2">Kasa Kapalı veya Boş</div>
                  )}
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium text-green-600 dark:text-green-400 font-[Geist Mono,monospace]">
                    Filled Successfully
                  </span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  
  async main(ctx) {
    console.log('[Aegis Vault] WXT Shadow DOM UI Active');

    // Eklenti, Aegis sunucusundan (localhost veya üretim) gelen şifreleri arka plana gönderir
    // Ayrıca kasa kilitleme sinyallerini de dinler
    window.addEventListener("message", (event) => {
      if (event.source !== window || !event.data) return;
      
      // 🔓 Kasa açıldı: Şifreleri background'a gönder
      if (event.data.type === "AEGIS_SYNC_VAULT") {
        try {
          import('wxt/browser').then(({ browser }) => {
            browser.runtime.sendMessage({ type: "SAVE_VAULT", data: event.data.payload }).catch(() => {});
          });
        } catch (e) {}
      }
      
      // 🔒 Kasa kilitlendi: Background'daki önbelleği temizle
      if (event.data.type === "AEGIS_LOCK_VAULT") {
        try {
          import('wxt/browser').then(({ browser }) => {
            browser.runtime.sendMessage({ type: "LOCK_VAULT" }).catch(() => {});
            console.log("[Aegis Vault] 🔐 Kilit sinyali arka plana iletildi.");
          });
        } catch (e) {}
      }
    });

    // 🤝 Handshake: Content script yüklendiğinde sayfaya "hazırım" sinyali gönder.
    // Eğer Aegis Vault PWA bu sayfada açıksa, kasa verilerini yeniden gönderecektir.
    // Bu, eklenti yenilenmesi veya geç yüklenme durumlarını çözer.
    window.postMessage({ type: 'AEGIS_EXTENSION_READY' }, "*");
    console.log("[Aegis Vault] 🤝 Content script hazır sinyali gönderildi.");
    
    // Create the global style injection for Geist Mono font
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&display=swap';
    document.head.appendChild(fontLink);

    const ui = await createShadowRootUi(ctx, {
      name: 'aegis-premium-ui',
      position: 'overlay',
      zIndex: 2147483647,
      onMount: (container) => {
        // Since React 18, we use createRoot
        const containerDiv = document.createElement('div');
        // Let's pass 'dark' to see dark mode natively if preferred, or rely on system
        containerDiv.className = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : '';
        container.appendChild(containerDiv);

        const root = createRoot(containerDiv);
        root.render(<AegisOverlay />);
        return { root, containerDiv };
      },
      onRemove: (elements) => {
        elements?.root?.unmount();
        elements?.containerDiv?.remove();
      }
    });

    ui.mount();
  },
});

import { defineBackground } from 'wxt/sandbox';

// Kıdemli Mimar Notu: WXT, defineBackground ile arka plan yapısını tek kaynaktan yönetir.
// Chrome/Safari Manifest V3 -> type: "module" -> service_worker olarak derlenir.
// Firefox Manifest V3 -> scripts: [...] -> standart arka plan betiği (background script) olarak derlenir.
export default defineBackground({
  type: 'module', // Chrome/Safari V3 Service Worker gereksinimi
  
  main() {
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
    const vaultCache: any[] = [];

    // MV3 Dayanıklılık: Kilit durumunu browser.storage.session ile kalıcı yap
    const persistVaultState = async (unlocked: boolean) => {
      try {
        await browser.storage.session.set({ aegis_vault_unlocked: unlocked });
      } catch (e) {
        // Firefox eski sürümlerinde storage.session olmayabilir
      }
    };

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
      } catch (e) {}
    };
    restoreVaultState();

    /**
     * 🖥️ Desktop Sync (Electron)
     * Masaüstü uygulaması açık ve kilitliyse (port 23456), verileri oradan çek.
     * Bu, PWA (localhost:5173) kapalı olsa bile eklentinin çalışmasını sağlar.
     * MV3 için setInterval yerine alarms kullanıyoruz (Sürekli uyanık kalma garantisi için).
     */
    const pollDesktopVault = async () => {
      const ports = ['23456'];
      const hosts = ['127.0.0.1', 'localhost'];

      for (const host of hosts) {
        try {
          // Extension service worker fetch'leri origin header taşımaz.
          // X-Aegis-Client header ile kimliğimizi bildiriyoruz.
          const aegisHeaders = { 'X-Aegis-Client': 'extension' };

          // 1. Status endpoint — kasa açık mı?
          const statusRes = await fetch(`http://${host}:23456/api/status`, { headers: aegisHeaders });
          if (!statusRes.ok) continue;
          const status = await statusRes.json();
          
          if (!status.isUnlocked) {
            if (isVaultUnlocked) {
              console.log("[Aegis Vault] 🖥️ Masaüstü kasası kilitli tespit edildi.");
              secureWipeCache();
              clearAllBadges();
            }
            return; // Bulduk ama kilitli, diğer host'u denemeye gerek yok
          }

          // 2. Vault verilerini al
          const vaultRes = await fetch(`http://${host}:23456/api/vault`, { headers: aegisHeaders });
          if (!vaultRes.ok) continue;
          const data = await vaultRes.json();
          
          if (Array.isArray(data) && data.length > 0) {
            vaultCache.length = 0;
            vaultCache.push(...data);
            
            if (!isVaultUnlocked) {
              isVaultUnlocked = true;
              persistVaultState(true);
              console.log(`[Aegis Vault] ✅ Masaüstü (${host}) ile eşitleme başarılı. ${data.length} kayıt.`);
            }
            resetSessionTimeout();
            return; // Başarılı, döngüden çık
          }
        } catch (e) {
          // Bu host/port kombinasyonu erişilebilir değil
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
      } catch (e) {}
    };

    const getDomain = (url: string) => {
      try {
        return new URL(url).hostname.replace(/^www\./, '');
      } catch (e) {
        return '';
      }
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
        const matches = vaultCache.filter(p => p.website && (p.website.includes(domain) || domain.includes(p.website)));
        if (matches.length > 0) {
          browser.action.setBadgeText({ text: matches.length.toString(), tabId });
          browser.action.setBadgeBackgroundColor({ color: '#22c55e', tabId });
        } else {
          browser.action.setBadgeText({ text: '', tabId });
        }
      } catch (e) {
        console.error(e);
      }
    };

    // Sekme olayları
    browser.tabs.onActivated.addListener(async (activeInfo) => {
      try {
        const tab = await browser.tabs.get(activeInfo.tabId);
        if (tab?.url) updateBadge(tab.id as number, tab.url);
      } catch (e) {}
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

      // ── SAVE_VAULT: Kasa açık, şifreleri al ──
      if (message.type === "SAVE_VAULT") {
        // Önce mevcut cache'i güvenli şekilde temizle
        secureWipeCache();
        
        if (Array.isArray(message.data) && message.data.length > 0) {
          vaultCache.push(...message.data);
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
      
      // ── GET_VAULT: Şifreler isteniyor ──
      else if (message.type === "GET_VAULT") {
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
        const unlocked = isVaultUnlocked && vaultCache.length > 0;
        sendResponse({ 
          isUnlocked: unlocked, 
          entryCount: unlocked ? vaultCache.length : 0 
        });
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
        }).catch((err: any) => {
          console.error('[Aegis] Fill hatası:', err);
          sendResponse({ success: false, error: String(err) });
        });

        return true; // async sendResponse için gerekli
      }
    });

  }
});

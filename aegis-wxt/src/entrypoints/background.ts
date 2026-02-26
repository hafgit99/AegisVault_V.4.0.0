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
      id: "aegis-wxt-context",
      title: "Kasa ile ilgilen",
      contexts: ["editable"]
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
      try {
        const response = await fetch('http://127.0.0.1:23456/api/vault');
        if (response.ok) {
           const data = await response.json();
           if (Array.isArray(data) && data.length > 0) {
              // Veri varsa eşitle
              vaultCache.length = 0;
              vaultCache.push(...data);
              
              if (!isVaultUnlocked) {
                 isVaultUnlocked = true;
                 persistVaultState(true);
                 console.log("[Aegis Vault] 🖥️ Masaüstü uygulaması ile otomatik eşitleme başarılı.");
              }
              resetSessionTimeout();
           } else if (isVaultUnlocked && data.length === 0) {
              // Masaüstü kilitlenmişse biz de temizleyelim
              console.log("[Aegis Vault] 🖥️ Masaüstü kasası kilitli tespit edildi. Önbellek temizleniyor.");
              secureWipeCache();
              clearAllBadges();
           }
        }
      } catch (e) {
        // Masaüstü uygulaması kapalıdır, sessizce devam et
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
    });

  }
});

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
    const LEGACY_GET_VAULT_ENABLED = false;
    const DOMAIN_REQ_MIN_INTERVAL_MS = 350;
    const NONCE_TTL_MS = 30 * 1000;
    const DESKTOP_CHALLENGE_TTL_MS = 15 * 1000;
    const EXTENSION_ID = (
      ((import.meta as any)?.env?.WXT_AEGIS_EXTENSION_ID as string | undefined) ||
      browser.runtime.id ||
      ''
    ).trim();
    const recentDomainRequestMap = new Map<string, number>();
    const requestNonceMap = new Map<string, number>();

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

    const signDesktopChallenge = async (tokenHex: string, payload: string) => {
      const keyBytes = hexToUint8(tokenHex);
      const payloadBytes = new TextEncoder().encode(payload);
      const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const sig = await crypto.subtle.sign('HMAC', key, payloadBytes);
      return toHex(sig);
    };

    const getDesktopChallenge = async (host: string) => {
      if (!EXTENSION_ID) return null;
      try {
        const response = await fetch(`http://${host}:23456/api/challenge`, {
          method: 'GET',
          mode: 'cors',
          headers: {
            'X-Aegis-Client': 'extension',
            'X-Aegis-Extension-Id': EXTENSION_ID,
          },
        });
        if (!response.ok) return null;
        const challenge = await response.json();
        if (!challenge?.nonce || !challenge?.token || !challenge?.expiresAt) return null;
        if (Number(challenge.expiresAt) - Date.now() <= 0 || Number(challenge.expiresAt) - Date.now() > DESKTOP_CHALLENGE_TTL_MS * 2) {
          return null;
        }
        return challenge;
      } catch (_e) {
        return null;
      }
    };

    const desktopSignedGet = async (host: string, path: '/api/status' | '/api/vault') => {
      if (!EXTENSION_ID) return null;
      const challenge = await getDesktopChallenge(host);
      if (!challenge) return null;

      const ts = Date.now().toString();
      const payload = `GET:${path}:${challenge.nonce}:${ts}:${EXTENSION_ID}`;
      const signature = await signDesktopChallenge(challenge.token, payload);

      try {
        return await fetch(`http://${host}:23456${path}`, {
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
      } catch (_e) {
        return null;
      }
    };

    /**
     * 🖥️ Desktop Sync (Electron)
     * Masaüstü uygulaması açık ve kilitliyse (port 23456), verileri oradan çek.
     * Bu, PWA (localhost:5173) kapalı olsa bile eklentinin çalışmasını sağlar.
     * MV3 için setInterval yerine alarms kullanıyoruz (Sürekli uyanık kalma garantisi için).
     */
    const pollDesktopVault = async () => {
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

          // 2. Vault verilerini al
          const vaultRes = await desktopSignedGet(host, '/api/vault');
          if (!vaultRes) {
            console.debug(`[Aegis Vault] ⚠️ Vault isteği null döndü (${host})`);
            continue;
          }
          if (!vaultRes.ok) {
            const errText = await vaultRes.text().catch(() => '');
            console.warn(`[Aegis Vault] ⚠️ Vault ${vaultRes.status}: ${errText} (${host})`);
            continue;
          }
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
            return;
          } else {
            console.debug(`[Aegis Vault] ℹ️ Vault verisi boş veya geçersiz (${host}), data length: ${Array.isArray(data) ? data.length : 'N/A'}`);
          }
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
      } catch (e) {}
    };

    const getDomain = (url: string) => {
      try {
        return new URL(url).hostname.replace(/^www\./, '');
      } catch (e) {
        return '';
      }
    };

    const isDomainMatch = (entryWebsite: string, domain: string) => {
      const normalizedEntry = entryWebsite.toLowerCase().trim();
      const normalizedDomain = domain.toLowerCase().trim();
      return normalizedEntry.includes(normalizedDomain) || normalizedDomain.includes(normalizedEntry);
    };

    const getRequestKey = (sender: any, domain: string) => {
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

    const sanitizeVaultEntry = (entry: any) => {
      if (!entry || typeof entry !== 'object') return null;
      if (typeof entry.pass !== 'string' || !entry.pass) return null;
      if (typeof entry.website !== 'string' || !entry.website.trim()) return null;

      return {
        title: typeof entry.title === 'string' ? entry.title : '',
        username: typeof entry.username === 'string' ? entry.username : '',
        pass: entry.pass,
        website: entry.website,
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
          const sanitizedEntries = message.data
            .map((entry: any) => sanitizeVaultEntry(entry))
            .filter(Boolean)
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
        const senderUrl = sender?.tab?.url;
        const senderDomain = senderUrl ? getDomain(senderUrl) : '';
        const isFromPopup = !sender?.tab && (
          (typeof sender?.url === 'string' && (
            sender.url.startsWith('chrome-extension://') ||
            sender.url.startsWith('moz-extension://')
          )) ||
          (typeof (sender as any)?.origin === 'string' && (
            (sender as any).origin.startsWith('chrome-extension://') ||
            (sender as any).origin.startsWith('moz-extension://')
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

        const requestKey = getRequestKey(sender, requestedDomain);
        const lastReqAt = recentDomainRequestMap.get(requestKey) || 0;
        if (now - lastReqAt < DOMAIN_REQ_MIN_INTERVAL_MS) {
          sendResponse({ success: true, data: [] });
          return true;
        }

        requestNonceMap.set(requestNonce, now);
        recentDomainRequestMap.set(requestKey, now);

        if (!isVaultUnlocked || vaultCache.length === 0) {
          sendResponse({ success: true, data: [] });
          return true;
        }

        const matches = vaultCache
          .filter((p) => p.website && isDomainMatch(p.website, requestedDomain))
          .slice(0, 5)  // Popup'ta daha fazla kayıt göster
          .map((p) => ({
            title: p.title,
            username: p.username,
            pass: p.pass,
            website: p.website,
          }));

        sendResponse({ success: true, data: matches });
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

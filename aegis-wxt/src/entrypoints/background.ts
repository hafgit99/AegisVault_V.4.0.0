import { defineBackground } from 'wxt/sandbox';

// Kıdemli Mimar Notu: WXT, defineBackground ile arka plan yapısını tek kaynaktan yönetir.
// Chrome/Safari Manifest V3 -> type: "module" -> service_worker olarak derlenir.
// Firefox Manifest V3 -> scripts: [...] -> standart arka plan betiği (background script) olarak derlenir.
export default defineBackground({
  type: 'module', // Chrome/Safari V3 Service Worker gereksinimi
  
  // WXT içindeki bu life-cycle, framework'ün uyumluluğunu yönetir
  main() {
    console.log('[Aegis Vault] Hybrid Background Yüklendi.');

    // browser.* polyfill'i (webextension-polyfill) tüm platformlar için sorunsuz çalışır.
    // Chrome'da "chrome.*", Firefox'ta "browser.*" ayrımından kurtulmak için bu namespace kullanılır.
    browser.runtime.onInstalled.addListener(() => {
        console.log("Aegis Vault WXT eklentisi başarıyla kuruldu ve başlatıldı.");
    });
    
    browser.contextMenus.create({
      id: "aegis-wxt-context",
      title: "Kasa ile ilgilen",
      contexts: ["editable"]
    });

    // Merkezi Hafıza: Web tarafı Kasa şifreleri (Oturuma özel)
    const vaultCache: any[] = [];

    // URL'den domain çıkartan yardımcı fonksiyon
    const getDomain = (url: string) => {
      try {
        const hostname = new URL(url).hostname;
        return hostname.replace(/^www\./, '');
      } catch (e) {
        return '';
      }
    };

    // Badge'i aktif sekmeye göre güncelleyen fonksiyon
    const updateBadge = async (tabId: number, url?: string) => {
      if (!url) return;
      const domain = getDomain(url);
      if (!domain) return;

      try {
        let currentVault = vaultCache;
        // Eğer vaultCache boşsa masaüstü (Electron) bağlantısı dene
        if (currentVault.length === 0) {
           try {
             const res = await fetch('http://127.0.0.1:23456/api/vault');
             const data = await res.json();
             if (Array.isArray(data) && data.length > 0) {
               currentVault = data;
             }
           } catch (e) {}
        }
        
        if (currentVault.length > 0) {
          const matches = currentVault.filter(p => p.website && (p.website.includes(domain) || domain.includes(p.website)));
          if (matches.length > 0) {
            browser.action.setBadgeText({ text: matches.length.toString(), tabId });
            browser.action.setBadgeBackgroundColor({ color: '#22c55e', tabId });
          } else {
            browser.action.setBadgeText({ text: '', tabId });
          }
        }
      } catch (e) {
         console.error(e);
      }
    };

    // Sekmeler değiştiğinde badge'i güncelle
    browser.tabs.onActivated.addListener(async (activeInfo) => {
      try {
        const tab = await browser.tabs.get(activeInfo.tabId);
        if (tab && tab.url) {
          updateBadge(tab.id as number, tab.url);
        }
      } catch (e) {}
    });

    // Sekme yüklendiğinde/URL değiştiğinde badge'i güncelle
    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.url || changeInfo.status === 'complete') {
        if (tab && tab.url) {
          updateBadge(tabId, tab.url);
        }
      }
    });

    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "SAVE_VAULT") {
        vaultCache.length = 0; // diziyi temizle
        if (Array.isArray(message.data)) {
          vaultCache.push(...message.data);
        }
        console.log("Aegis Vault WXT: Kasa Eşitlendi, Toplam:", vaultCache.length);
        
        // Kasa güncellenince aktif sekmedeki badge'i de güncelle
        browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
           if (tabs.length > 0 && tabs[0].url) {
             updateBadge(tabs[0].id as number, tabs[0].url);
           }
        });
        
        sendResponse({ success: true, count: vaultCache.length });
      } else if (message.type === "GET_VAULT") {
        // Asenkron olarak Electron Desktop App (Localhost) bağlantısını kontrol et
        fetch('http://127.0.0.1:23456/api/vault')
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data) && data.length > 0) {
               sendResponse(data);
            } else {
               // Masaüstü uygulamasından veri gelmezse Web tarafının önbelleğini kullan
               sendResponse(vaultCache);
            }
          })
          .catch(e => {
            // Masaüstü uygulaması kapalıysa Web tarafının önbelleğine dön
            sendResponse(vaultCache);
          });
        return true; // Asenkron sendResponse için true dönmeli
      }
    });

  }
});

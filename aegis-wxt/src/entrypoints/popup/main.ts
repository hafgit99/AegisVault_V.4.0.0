// browser.* namespace'i WXT'nin polyfill deposundan aktarılır.
import { browser } from 'wxt/browser';

import DOMPurify from 'dompurify';

const app = document.getElementById('wxt-app');

if (app) {
    const rawHTML = `
        <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px; min-width: 320px; font-family: system-ui, -apple-system, sans-serif;">
            <header style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(114,136,111,0.2); padding-bottom: 12px;">
                <div>
                   <h1 style="margin: 0; font-size: 16px; font-weight: 600; color: #101828;">Aegis Vault</h1>
                   <p style="margin: 2px 0 0 0; font-size: 11px; color: #475569;" id="active-domain">Bağlanıyor...</p>
                </div>
                <div style="background: rgba(114,136,111,0.1); padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(114,136,111,0.2);">
                   <span style="font-size: 10px; font-weight: 700; color: #72886f;" id="vault-status">Kasa Bekleniyor</span>
                </div>
            </header>
            
            <section id="cards-container" style="display: flex; flex-direction: column; gap: 8px;">
               <div style="text-align: center; padding: 20px 0; color: #64748b; font-size: 12px;">Şifre aranıyor...</div>
            </section>
        </div>
    `;
    
    // XSS Protection: DOMPurify and DOMParser to eliminate unsafe innerHTML error for AMO
    const parsedApp = new DOMParser().parseFromString(DOMPurify.sanitize(rawHTML), 'text/html');
    app.replaceChildren(...Array.from(parsedApp.body.childNodes));

    const getDomain = (url: string) => {
        try {
            const hostname = new URL(url).hostname;
            return hostname.replace(/^www\./, '');
        } catch (e) {
            return '';
        }
    };

    const loadPopup = async () => {
        const domainEl = document.getElementById('active-domain');
        const statusEl = document.getElementById('vault-status');
        const containerEl = document.getElementById('cards-container');
        
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            const currentUrl = tabs[0]?.url || "";
            const currentDomain = getDomain(currentUrl);
            
            if (domainEl) domainEl.innerText = currentDomain || 'Bilinmeyen Site';

            const passwords = await browser.runtime.sendMessage({ type: "GET_VAULT" });
            
            if (passwords && passwords.length > 0) {
                if (statusEl) {
                    statusEl.innerText = "Kasa Açık";
                    statusEl.style.color = "#22c55e";
                }
                
                let matches = passwords.filter((p: any) => p.website && currentDomain && (p.website.includes(currentDomain) || currentDomain.includes(p.website)));
                
                if (containerEl) {
                    if (matches.length > 0) {
                        containerEl.textContent = '';
                        matches.forEach((p: any) => {
                            const cardHTML = `
                              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px;">
                                 <div style="display: flex; align-items: center; justify-content: space-between;">
                                    <span style="font-weight: 600; font-size: 13px; color: #0f172a; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${p.title}</span>
                                 </div>
                                 <div style="display: flex; flex-direction: column; gap: 4px;">
                                    <div style="display: flex; align-items: center; justify-content: space-between; background: white; padding: 6px; border-radius: 4px; border: 1px solid #f1f5f9;">
                                       <span style="font-size: 11px; color: #475569; font-family: monospace; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${p.username || 'Kullanıcı adı yok'}</span>
                                       <button class="copy-btn" data-value="${p.username || ''}" style="background: none; border: none; cursor: pointer; color: #72886f; font-size: 10px; font-weight: bold; flex-shrink: 0;" title="Kopyala">
                                          Kopyala
                                       </button>
                                    </div>
                                    <div style="display: flex; align-items: center; justify-content: space-between; background: white; padding: 6px; border-radius: 4px; border: 1px solid #f1f5f9;">
                                       <span style="font-size: 11px; color: #475569; font-family: monospace;">••••••••</span>
                                       <button class="copy-btn" data-value="${p.pass}" style="background: none; border: none; cursor: pointer; color: #72886f; font-size: 10px; font-weight: bold; flex-shrink: 0;" title="Kopyala">
                                          Kopyala
                                       </button>
                                    </div>
                                 </div>
                              </div>
                            `;
                            // safe rendering without executing scripts (though we sanitize first in overall context ideally, building safely is fine)
                            // sanitize with DOMPurify
                            const safeDiv = document.createElement('div');
                            const parsedCard = new DOMParser().parseFromString(DOMPurify.sanitize(cardHTML), 'text/html');
                            safeDiv.replaceChildren(...Array.from(parsedCard.body.childNodes));
                            
                            // attach event listeners to buttons
                            const btns = safeDiv.querySelectorAll('.copy-btn');
                            btns.forEach((btn) => {
                               btn.addEventListener('click', (e) => {
                                  const val = (e.currentTarget as HTMLButtonElement).getAttribute('data-value');
                                  if (val) {
                                     navigator.clipboard.writeText(val);
                                     const originalText = (e.currentTarget as HTMLButtonElement).innerText;
                                     (e.currentTarget as HTMLButtonElement).innerText = 'Kopyalandı!';
                                     (e.currentTarget as HTMLButtonElement).style.color = '#22c55e';
                                     setTimeout(() => {
                                        (e.currentTarget as HTMLButtonElement).innerText = originalText;
                                        (e.currentTarget as HTMLButtonElement).style.color = '#72886f';
                                     }, 1500);
                                  }
                               });
                            });
                            
                            containerEl.appendChild(safeDiv);
                        });
                    } else {
                        const fallbackHTML = `<div style="text-align: center; padding: 20px 0; color: #64748b; font-size: 12px;">Bu site için kayıtlı şifre bulunamadı.<br/><br/><span style="font-size:10px; color:#94a3b8;">Kasa Aktif (${passwords.length} kayıt)</span></div>`;
                        const parsedFallback = new DOMParser().parseFromString(DOMPurify.sanitize(fallbackHTML), 'text/html');
                        containerEl.replaceChildren(...Array.from(parsedFallback.body.childNodes));
                    }
                }
            } else {
                if (statusEl) {
                    statusEl.innerText = "Kasa Kapalı";
                    statusEl.style.color = "#f59e0b";
                }
                if (containerEl) {
                    const closedHTML = `<div style="text-align: center; padding: 20px 0; color: #f59e0b; font-size: 12px; font-weight: 500;">Kasa Bulunamadı veya Kilitli!</div><div style="font-size:11px; color:#475569; text-align:center;">Lütfen Aegis Vault programını açıp<br/>şifrenizle giriş yapın.</div>`;
                    const parsedClosed = new DOMParser().parseFromString(DOMPurify.sanitize(closedHTML), 'text/html');
                    containerEl.replaceChildren(...Array.from(parsedClosed.body.childNodes));
                }
            }
        } catch (error) {
            console.error(error);
            if (containerEl) {
               const errorHTML = "<div style='color:red; font-size:12px; text-align:center;'>Hata: Arkaplan servisine ulaşılamadı.</div>";
               const parsedError = new DOMParser().parseFromString(DOMPurify.sanitize(errorHTML), 'text/html');
               containerEl.replaceChildren(...Array.from(parsedError.body.childNodes));
            }
        }
    };

    // Load payload automatically
    loadPopup();
}

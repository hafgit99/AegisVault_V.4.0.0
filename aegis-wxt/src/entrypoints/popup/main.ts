import { browser } from 'wxt/browser';
import DOMPurify from 'dompurify';

const app = document.getElementById('wxt-app');

if (app) {
    const rawHTML = `
        <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px; min-width: 320px; font-family: system-ui, -apple-system, sans-serif;">
            <header style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(114,136,111,0.2); padding-bottom: 12px;">
                <div style="display:flex;align-items:center;gap:8px;">
                   <div style="width:24px;height:24px;border-radius:7px;background:linear-gradient(135deg,#72886f,#101828);display:flex;align-items:center;justify-content:center;">
                     <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" fill="white"/></svg>
                   </div>
                   <div>
                      <h1 style="margin: 0; font-size: 15px; font-weight: 700; color: #101828; letter-spacing:-0.3px;">Aegis Vault</h1>
                      <p style="margin: 1px 0 0 0; font-size: 10px; color: #72886f; font-weight:600;" id="active-domain">Bağlanıyor...</p>
                   </div>
                </div>
                <div style="background: rgba(114,136,111,0.10); padding: 3px 9px; border-radius: 20px; border: 1px solid rgba(114,136,111,0.20);">
                   <span style="font-size: 10px; font-weight: 700; color: #72886f;" id="vault-status">Bekleniyor</span>
                </div>
            </header>
            <section id="cards-container" style="display: flex; flex-direction: column; gap: 6px;">
               <div style="text-align: center; padding: 20px 0; color: #64748b; font-size: 12px;">Yükleniyor...</div>
            </section>
        </div>
    `;

    const parsedApp = new DOMParser().parseFromString(DOMPurify.sanitize(rawHTML), 'text/html');
    app.replaceChildren(...Array.from(parsedApp.body.childNodes));

    const getDomain = (url: string) => {
        try {
            return new URL(url).hostname.replace(/^www\./, '');
        } catch { return ''; }
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

            if (domainEl) domainEl.innerText = currentDomain || 'Bilinmeyen Site';

            // Kasa durumu
            const vaultStatus = await browser.runtime.sendMessage({ type: 'GET_VAULT_STATUS' });

            if (!vaultStatus?.isUnlocked) {
                if (statusEl) { statusEl.innerText = 'Kasa Kilitli'; statusEl.style.color = '#f59e0b'; }
                if (containerEl) {
                    const h = `<div style="text-align:center;padding:20px 0;color:#f59e0b;font-size:12px;font-weight:600;">Kasa Kilitli</div>
                               <div style="font-size:11px;color:#475569;text-align:center;">Aegis Vault uygulamasını açıp<br/>şifrenizle giriş yapın.</div>`;
                    containerEl.replaceChildren(...Array.from(new DOMParser().parseFromString(DOMPurify.sanitize(h), 'text/html').body.childNodes));
                }
                return;
            }

            const passwords = await browser.runtime.sendMessage({ type: 'GET_VAULT' });

            if (!passwords || passwords.length === 0) {
                if (statusEl) { statusEl.innerText = 'Kasa Boş'; statusEl.style.color = '#f59e0b'; }
                return;
            }

            if (statusEl) { statusEl.innerText = 'Kasa Açık'; statusEl.style.color = '#22c55e'; }

            // Domain eşleştirme
            let matches = passwords.filter((p: any) =>
                p.website && currentDomain && (p.website.includes(currentDomain) || currentDomain.includes(p.website))
            );
            const hasMatch = matches.length > 0;
            if (!hasMatch) matches = passwords.slice(0, 5);
            else matches = matches.slice(0, 5);

            if (!containerEl) return;
            containerEl.textContent = '';

            // Eşleşme başlığı
            if (!hasMatch && currentDomain) {
                const note = document.createElement('div');
                note.style.cssText = 'font-size:10px;color:#94a3b8;text-align:center;padding:2px 0 4px;';
                note.innerText = `"${currentDomain}" için kayıt bulunamadı — tüm kayıtlar gösteriliyor`;
                containerEl.appendChild(note);
            }

            // Kartlar
            matches.forEach((p: any) => {
                const card = document.createElement('div');
                card.style.cssText = `
                    display:flex;align-items:center;gap:10px;padding:9px 10px;
                    border-radius:10px;cursor:pointer;transition:all 0.15s;
                    background:rgba(114,136,111,0.05);border:1px solid rgba(114,136,111,0.12);
                `;

                const letter = (p.title || '?').charAt(0).toUpperCase();
                const avatarStyle = `
                    width:34px;height:34px;border-radius:9px;flex-shrink:0;
                    background:linear-gradient(135deg,#72886f,#101828);
                    display:flex;align-items:center;justify-content:center;
                    color:white;font-weight:800;font-size:13px;
                    box-shadow:0 2px 8px rgba(114,136,111,0.25);
                `;

                const safeTitle    = DOMPurify.sanitize(p.title    || '');
                const safeUsername = DOMPurify.sanitize(p.username || '');

                const inner = `
                    <div style="${avatarStyle}">${letter}</div>
                    <div style="flex:1;overflow:hidden;">
                        <div style="font-size:12px;font-weight:700;color:#101828;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${safeTitle}</div>
                        <div style="font-size:10px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;">${safeUsername || 'Kullanıcı adı yok'}</div>
                    </div>
                    <div style="font-size:11px;color:#72886f;font-weight:700;flex-shrink:0;">Doldur →</div>
                `;
                const parsed = new DOMParser().parseFromString(DOMPurify.sanitize(inner), 'text/html');
                card.replaceChildren(...Array.from(parsed.body.childNodes));

                // Hover efekti
                card.addEventListener('mouseenter', () => {
                    card.style.background = 'rgba(114,136,111,0.13)';
                    card.style.border = '1px solid rgba(114,136,111,0.28)';
                    card.style.transform = 'translateX(2px)';
                });
                card.addEventListener('mouseleave', () => {
                    card.style.background = 'rgba(114,136,111,0.05)';
                    card.style.border = '1px solid rgba(114,136,111,0.12)';
                    card.style.transform = 'none';
                });

                // Tıklanınca background'a fill komutu gönder
                card.addEventListener('click', async () => {
                    if (!tabId) return;

                    // Butonu geçici olarak güncelle
                    const fillBtn = card.querySelector('div:last-child') as HTMLElement;
                    if (fillBtn) { fillBtn.innerText = '✓ Dolduruldu'; fillBtn.style.color = '#22c55e'; }

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
                const h = "<div style='color:red;font-size:12px;text-align:center;'>Hata: Arkaplan servisine ulaşılamadı.</div>";
                containerEl.replaceChildren(...Array.from(new DOMParser().parseFromString(DOMPurify.sanitize(h), 'text/html').body.childNodes));
            }
        }
    };

    loadPopup();
}

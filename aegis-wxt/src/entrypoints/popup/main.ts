import { browser } from 'wxt/browser';
import DOMPurify from 'dompurify';

const isTurkishLocale = (typeof navigator !== 'undefined' ? navigator.language : 'en').toLowerCase().startsWith('tr');
const POPUP_I18N = {
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
};

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
                       <p style="margin: 1px 0 0 0; font-size: 10px; color: #72886f; font-weight:600;" id="active-domain">${POPUP_I18N.connecting}</p>
                   </div>
                </div>
                <div style="background: rgba(114,136,111,0.10); padding: 3px 9px; border-radius: 20px; border: 1px solid rgba(114,136,111,0.20);">
                   <span style="font-size: 10px; font-weight: 700; color: #72886f;" id="vault-status">${POPUP_I18N.waiting}</span>
                </div>
            </header>
            <section id="cards-container" style="display: flex; flex-direction: column; gap: 6px;">
               <div style="text-align: center; padding: 20px 0; color: #64748b; font-size: 12px;">${POPUP_I18N.loading}</div>
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

            if (domainEl) domainEl.innerText = currentDomain || POPUP_I18N.unknownSite;

            // Kasa durumu
            const vaultStatus = await browser.runtime.sendMessage({ type: 'GET_VAULT_STATUS' });

            if (!vaultStatus?.isUnlocked) {
                if (statusEl) { statusEl.innerText = POPUP_I18N.vaultLocked; statusEl.style.color = '#f59e0b'; }
                if (containerEl) {
                    const h = `<div style="text-align:center;padding:20px 0;color:#f59e0b;font-size:12px;font-weight:600;">${POPUP_I18N.vaultLocked}</div>
                               <div style="font-size:11px;color:#475569;text-align:center;">${POPUP_I18N.openVaultHint}</div>`;
                    containerEl.replaceChildren(...Array.from(new DOMParser().parseFromString(DOMPurify.sanitize(h), 'text/html').body.childNodes));
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
                    containerEl.replaceChildren(...Array.from(new DOMParser().parseFromString(DOMPurify.sanitize(h), 'text/html').body.childNodes));
                }
                return;
            }

            if (statusEl) { statusEl.innerText = POPUP_I18N.vaultOpen; statusEl.style.color = '#22c55e'; }

            const matches = passwords.slice(0, 5);

            if (!containerEl) return;
            containerEl.textContent = '';

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
                        <div style="font-size:10px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;">${safeUsername || POPUP_I18N.noUsername}</div>
                    </div>
                    <div style="font-size:11px;color:#72886f;font-weight:700;flex-shrink:0;">${POPUP_I18N.fill}</div>
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
                containerEl.replaceChildren(...Array.from(new DOMParser().parseFromString(DOMPurify.sanitize(h), 'text/html').body.childNodes));
            }
        }
    };

    loadPopup();
}

const ALLOWED_ORIGINS = [
  "http://localhost:5173", 
  "https://aegis-vault.com", 
    "*" // Allow for local file schema testing during development
];

console.log('[Aegis Vault] Content Script Loaded - Smart Recognition Initialized');

// Inject Styles
const styleEl = document.createElement('style');
styleEl.textContent = `
  .aegis-vault-icon {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 26px;
    height: 26px;
    background: rgba(255, 255, 255, 0.4);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 8px;
    cursor: pointer;
    z-index: 1000;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
  .aegis-vault-icon:hover, .aegis-vault-icon.glow {
    box-shadow: 0 0 15px rgba(114, 136, 111, 0.6), 0 0 30px rgba(114, 136, 111, 0.4);
    background: rgba(255, 255, 255, 0.6);
    border-color: rgba(114, 136, 111, 0.5);
    transform: translateY(-50%) scale(1.05);
  }
  .aegis-vault-icon svg {
    width: 14px;
    height: 14px;
    color: #4CAF50;
    transition: stroke 0.3s ease;
  }
  .aegis-vault-icon:hover svg {
    stroke: #72886f;
  }

  /* Auto-Save Banner */
  .aegis-banner {
    position: fixed;
    top: -120px;
    right: 24px;
    width: 360px;
    background: rgba(240, 238, 233, 0.95);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(255,255,255,0.6);
    box-shadow: 0 24px 48px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(255,255,255,0.4);
    border-radius: 20px;
    padding: 20px;
    z-index: 2147483647;
    font-family: 'Inter', sans-serif;
    color: #0a1128;
    transition: top 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .aegis-banner.show {
    top: 24px;
  }
  .aegis-banner-header {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
    font-size: 15px;
    letter-spacing: -0.02em;
  }
  .aegis-banner-header svg {
    color: #72886f;
  }
  .aegis-banner p {
    font-size: 13px;
    margin: 0;
    color: #475569;
    line-height: 1.5;
  }
  .aegis-banner-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 4px;
  }
  .aegis-btn {
    padding: 8px 16px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }
  .aegis-btn-primary {
    background: #0a1128;
    color: #f0eee9;
    box-shadow: 0 4px 10px rgba(10, 17, 40, 0.2);
  }
  .aegis-btn-primary:hover {
    background: #72886f;
    box-shadow: 0 6px 15px rgba(114, 136, 111, 0.3);
  }
  .aegis-btn-secondary {
    background: rgba(10, 17, 40, 0.05);
    color: #0a1128;
  }
  .aegis-btn-secondary:hover {
    background: rgba(10, 17, 40, 0.1);
  }
`;
document.head.appendChild(styleEl);

// 1. Password Field Scanner
const scanForInputs = () => {
    const inputs = document.querySelectorAll('input[type="password"]');
    inputs.forEach((input) => {
        const pwdInput = input as HTMLInputElement;
        if (pwdInput.dataset.aegisAttached) return;
        pwdInput.dataset.aegisAttached = "true";

        const parent = pwdInput.parentElement;
        if (parent) {
            // Ensure parent is positioned to host absolute icon
            const style = window.getComputedStyle(parent);
            if (style.position === 'static') {
                parent.style.position = 'relative';
            }

            const icon = document.createElement('div');
            icon.className = 'aegis-vault-icon';
            icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>`;
            
            icon.addEventListener('click', (e) => {
                e.preventDefault();
                icon.classList.add('glow');
                setTimeout(() => icon.classList.remove('glow'), 1000);
            });

            // Focus glow magic UI
            pwdInput.addEventListener('focus', () => icon.classList.add('glow'));
            pwdInput.addEventListener('blur', () => icon.classList.remove('glow'));
            
            parent.appendChild(icon);
        }
    });
};

const observer = new MutationObserver(scanForInputs);
observer.observe(document.body, { childList: true, subtree: true });
scanForInputs();

// 2. Banner UI
const showAutoSaveBanner = () => {
    if (document.getElementById('aegis-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'aegis-banner';
    banner.className = 'aegis-banner';
    banner.innerHTML = `
        <div class="aegis-banner-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <span>Aegis Vault</span>
        </div>
        <p>Bu site için yeni bir şifre algılandı. Kasaya güvenli bir şekilde kaydetmek ister misiniz?</p>
        <div class="aegis-banner-actions">
            <button class="aegis-btn aegis-btn-secondary" id="aegis-btn-cancel">Şimdi Değil</button>
            <button class="aegis-btn aegis-btn-primary" id="aegis-btn-save">Şifreyi Kaydet</button>
        </div>
    `;
    document.body.appendChild(banner);
    
    // Animate in
    requestAnimationFrame(() => banner.classList.add('show'));

    document.getElementById('aegis-btn-cancel')?.addEventListener('click', () => {
        banner.classList.remove('show');
        setTimeout(() => banner.remove(), 600);
    });

    document.getElementById('aegis-btn-save')?.addEventListener('click', () => {
        const p = banner.querySelector('p');
        if (p) p.innerHTML = `<span style="color:#72886f; font-weight: 500;">✓ Kasanıza eklendi.</span>`;
        setTimeout(() => {
            banner.classList.remove('show');
            setTimeout(() => banner.remove(), 600);
        }, 1500);
    });
};

document.addEventListener('submit', (e) => {
    const target = e.target as HTMLFormElement;
    if (target.querySelector('input[type="password"]')) {
        showAutoSaveBanner();
    }
});

// 3. Listen for Context Menu and Background Commands
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "ACTION_GENERATE_PASSWORD") {
      const activeEl = document.activeElement as HTMLInputElement;
      if (activeEl && activeEl.tagName === 'INPUT') {
          activeEl.value = "Ags_" + Math.random().toString(36).substring(2, 10).toUpperCase() + "!";
          activeEl.dispatchEvent(new Event('input', { bubbles: true }));
          showAutoSaveBanner();
      }
  }

  if (message.action === "ACTION_FILL_PASSWORD") {
      const activeEl = document.activeElement as HTMLInputElement;
      if (activeEl && activeEl.tagName === 'INPUT') {
          activeEl.value = "SuperGizliSifre123*";
          activeEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
  }
  
  if (message.type === "EXTENSION_TO_WEB") {
    // Existing PostMessage Bridge Logic
    console.log("[Aegis Vault] Forwarding message from Background to Web", message.payload);
    window.postMessage({
      source: "aegis-extension",
      payload: message.payload
    }, "*"); 
  }
});

// Original PostMessage Bridge
window.addEventListener("message", (event) => {
  if (!ALLOWED_ORIGINS.includes(event.origin) && event.origin !== "null") return; // Added null for local file testing
  if (event.source !== window || !event.data || event.data.source !== "aegis-web") return;
  chrome.runtime.sendMessage({ type: "WEB_TO_EXTENSION", payload: event.data.payload });
});

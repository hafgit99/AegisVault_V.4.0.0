import { vaultService } from "../vaultService";

class ExtensionBridge {
  private sessionToken: string | null = null;
  private isListening: boolean = false;
  private activePort: any = null; // Aktif eklenti port referansı

  private messageListener = async (event: MessageEvent) => {
    // Sadece ayni origin (veya extension) uzerinden gelen mesajlara guven
    if (event.origin !== window.location.origin && !event.origin.startsWith('chrome-extension://')) {
      return; // Cok ondan gelmeyen yabanci originleri reddet
    }

    const data = event.data;
    if (typeof data !== 'object' || !data) return;

    // Secure Handshake (Eklenti kendini tanitiyor ve ID'sini sunuyor)
    // Eklenti sayfaya PWA'i tespit ettiginde merhaba der.
    if (data.type === "AEGIS_EXTENSION_HELLO") {
       console.log("[PWA Bridge] Eklenti tespit edildi, baglanti hazirlaniyor...");
       // Eklentiye guvenli port acalim
       if ((window as any).chrome && (window as any).chrome.runtime) {
         try {
           const port = (window as any).chrome.runtime.connect(data.extensionId, { name: "aegis-pwa-vault-port" });
           this.activePort = port; // Port referansını sakla
           
           this.sessionToken = this.generateToken();
           
           // handshake token paylasimi
           port.postMessage({ type: "SYNC_TOKEN", token: this.sessionToken });

           port.onMessage.addListener(async (msg: any) => {
             // Sadece Token yetkilendirmesi basarili olan mesajlari isle
             if (msg.token !== this.sessionToken) {
               console.warn("[PWA Bridge] Yetkisiz eklenti istegi reddedildi (Token Uyumsuz).");
               port.postMessage({ type: "ERROR", error: "UNAUTHORIZED_TOKEN" });
               return;
             }

             if (msg.type === "get_decrypted_creds") {
               // Sadece kasa aktif (unlocked) ise yanit ver
               // VaultService 'isConnected' degiskeni bu kontrolu saglar.
               if (!vaultService['isConnected']) {
                 port.postMessage({ type: "ERROR", error: "VAULT_LOCKED" });
                 return;
               }

               try {
                 const creds = await vaultService.getPasswords();
                 // Belirli siteye gore filtrele, eger istenmisse
                 const filteredCreds = msg.domain 
                   ? creds.filter(c => c.website.includes(msg.domain)) 
                   : creds;

                 // Sadece secilen veriyi (credential listesini) gonder
                 port.postMessage({ 
                   type: "DECRYPTED_CREDS_RESPONSE", 
                   data: filteredCreds 
                 });
                 console.log("[PWA Bridge] Kasa acik, veriler eklentiye iletildi.");
               } catch (err) {
                 port.postMessage({ type: "ERROR", error: "INTERNAL_ERROR" });
               }
             }
           });
           
           port.onDisconnect.addListener(() => {
             console.log("[PWA Bridge] Eklenti baglantisi koptu.");
             this.sessionToken = null;
             this.activePort = null;
           });
         } catch(e) {
           console.error("[PWA Bridge] Eklentiyle runtime (externally_connectable) uzerinden baglanti kurulamadi.", e);
         }
       }
    }
  };

  public init() {
    if (this.isListening) return;
    this.isListening = true;
    window.addEventListener("message", this.messageListener);
  }

  /**
   * 🔒 Kasa kilitlendiğinde çağrılır.
   * Aktif port bağlantısını koparır ve oturum token'ını geçersiz kılar.
   * Bu, externally_connectable kanalı üzerinden veri sızmasını engeller.
   */
  public lockAndDisconnect() {
    if (this.activePort) {
      try {
        // Eklentiye kasa kilitlendi bilgisini gönder
        this.activePort.postMessage({ type: "VAULT_LOCKED" });
        this.activePort.disconnect();
      } catch (e) {
        // Port zaten kapanmış olabilir
      }
      this.activePort = null;
    }
    this.sessionToken = null;
    console.log("[PWA Bridge] 🔐 Eklenti bağlantısı güvenli şekilde kapatıldı.");
  }

  public dispose() {
    this.isListening = false;
    window.removeEventListener("message", this.messageListener);
    this.lockAndDisconnect();
  }

  private generateToken() {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}

export const extensionBridge = new ExtensionBridge();


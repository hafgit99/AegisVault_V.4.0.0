import { vaultService } from "../vaultService";

class ExtensionBridge {
  private sessionToken: string | null = null;
  private isListening: boolean = false;
  private activePort: any = null; // Aktif eklenti port referansı
  private trustedExtensionId: string | null = null; // 🔒 İlk bağlantıda kaydedilen güvenilir eklenti ID'si

  private messageListener = async (event: MessageEvent) => {
    // 🔒 Güvenlik: Sadece aynı origin veya doğrulanmış extension origin'den gelen mesajları kabul et
    if (event.origin !== window.location.origin && !event.origin.startsWith('chrome-extension://')) {
      return;
    }

    const data = event.data;
    if (typeof data !== 'object' || !data) return;

    // Secure Handshake (Eklenti kendini tanıtıyor ve ID'sini sunuyor)
    if (data.type === "AEGIS_EXTENSION_HELLO") {
       // 🔒 Extension ID doğrulaması
       const incomingExtensionId = data.extensionId;
       if (!incomingExtensionId || typeof incomingExtensionId !== 'string') {
         console.warn("[PWA Bridge] Geçersiz eklenti ID'si reddedildi.");
         return;
       }

       // İlk bağlantıda extension ID'yi kaydet, sonrakilerde karşılaştır
       if (this.trustedExtensionId && this.trustedExtensionId !== incomingExtensionId) {
         console.warn(`[PWA Bridge] 🚫 Bilinmeyen eklenti ID'si reddedildi: ${incomingExtensionId.substring(0, 8)}...`);
         return;
       }

       console.log("[PWA Bridge] Eklenti tespit edildi, bağlantı hazırlanıyor...");
       
       // Eklentiye güvenli port açalım
       if ((window as any).chrome && (window as any).chrome.runtime) {
         try {
           const port = (window as any).chrome.runtime.connect(incomingExtensionId, { name: "aegis-pwa-vault-port" });
           this.activePort = port;
           this.trustedExtensionId = incomingExtensionId; // İlk başarılı bağlantıda ID'yi kaydet
           
           this.sessionToken = this.generateToken();
           
           // handshake token paylaşımı
           port.postMessage({ type: "SYNC_TOKEN", token: this.sessionToken });

           port.onMessage.addListener(async (msg: any) => {
             // Sadece Token yetkilendirmesi başarılı olan mesajları işle
             if (msg.token !== this.sessionToken) {
               console.warn("[PWA Bridge] Yetkisiz eklenti isteği reddedildi (Token Uyumsuz).");
               port.postMessage({ type: "ERROR", error: "UNAUTHORIZED_TOKEN" });
               return;
             }

             if (msg.type === "get_decrypted_creds") {
               // Sadece kasa aktif (unlocked) ise yanıt ver
               if (!vaultService['isConnected']) {
                 port.postMessage({ type: "ERROR", error: "VAULT_LOCKED" });
                 return;
               }

               try {
                 const creds = await vaultService.getPasswords();
                 // Belirli siteye göre filtrele, eğer istenmişse
                 const filteredCreds = msg.domain 
                   ? creds.filter(c => c.website.includes(msg.domain)) 
                   : creds;

                 // Sadece seçilen veriyi (credential listesini) gönder
                 port.postMessage({ 
                   type: "DECRYPTED_CREDS_RESPONSE", 
                   data: filteredCreds 
                 });
                 console.log("[PWA Bridge] Kasa açık, veriler eklentiye iletildi.");
               } catch (err) {
                 port.postMessage({ type: "ERROR", error: "INTERNAL_ERROR" });
               }
             }
           });
           
           port.onDisconnect.addListener(() => {
             console.log("[PWA Bridge] Eklenti bağlantısı koptu.");
             this.sessionToken = null;
             this.activePort = null;
           });
         } catch(e) {
           console.error("[PWA Bridge] Eklentiyle runtime (externally_connectable) üzerinden bağlantı kurulamadı.", e);
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


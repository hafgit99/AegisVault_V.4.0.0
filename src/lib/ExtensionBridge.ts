import { vaultService } from "../vaultService";

// 🔒 SECURITY HARDENED: Allowlist tabanlı extension ID doğrulama
// Race condition saldırılarını önlemek için sabit allowlist kullanılır
const DEFAULT_ALLOWED_EXTENSION_IDS = [
  'gddgomiecgnihlljfkogfjgakedoielk',
  'kjbdjkfijeflhhbnkjgkmccljifidpcc',
];

const envAllowedIdsRaw = ((import.meta as any)?.env?.VITE_AEGIS_ALLOWED_EXTENSION_IDS as string | undefined) ||
  ((import.meta as any)?.env?.VITE_AEGIS_EXTENSION_ID as string | undefined) ||
  '';

const ALLOWED_EXTENSION_IDS = envAllowedIdsRaw
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

if (ALLOWED_EXTENSION_IDS.length === 0) {
  ALLOWED_EXTENSION_IDS.push(...DEFAULT_ALLOWED_EXTENSION_IDS);
}

class ExtensionBridge {
  private sessionToken: string | null = null;
  private isListening: boolean = false;
  private activePort: any = null; // Aktif eklenti port referansı
  private trustedExtensionId: string | null = null; // 🔒 İlk bağlantıda kaydedilen güvenilir eklenti ID'si
  private readonly challengeTtlMs = 20_000;
  private challengeNonceMap: Map<string, number> = new Map();

  private toHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  private async signSessionPayload(payload: string): Promise<string | null> {
    if (!this.sessionToken) return null;
    const key = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(this.sessionToken),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await window.crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    return this.toHex(signature);
  }

  private cleanupExpiredChallenges(now: number = Date.now()) {
    for (const [nonce, expiresAt] of this.challengeNonceMap.entries()) {
      if (expiresAt <= now) {
        this.challengeNonceMap.delete(nonce);
      }
    }
  }

  private async verifySignedRequest(type: string, domain: string, nonce: string, ts: number, signature: string): Promise<boolean> {
    if (!nonce || !signature || !Number.isFinite(ts)) return false;
    const now = Date.now();
    this.cleanupExpiredChallenges(now);

    const nonceExpiresAt = this.challengeNonceMap.get(nonce);
    if (!nonceExpiresAt || nonceExpiresAt <= now) return false;
    if (Math.abs(now - ts) > this.challengeTtlMs) return false;

    const payload = `${type}:${domain || ''}:${nonce}:${ts}`;
    const expectedSig = await this.signSessionPayload(payload);
    if (!expectedSig || expectedSig.length !== signature.length) return false;

    let mismatch = 0;
    for (let i = 0; i < expectedSig.length; i++) {
      mismatch |= expectedSig.charCodeAt(i) ^ signature.charCodeAt(i);
    }

    const valid = mismatch === 0;
    if (valid) {
      this.challengeNonceMap.delete(nonce);
    }
    return valid;
  }

  private messageListener = async (event: MessageEvent) => {
    // 🔒 Güvenlik: Sadece aynı origin veya doğrulanmış extension origin'den gelen mesajları kabul et
    if (event.origin !== window.location.origin && !event.origin.startsWith('chrome-extension://')) {
      return;
    }

    const data = event.data;
    if (typeof data !== 'object' || !data) return;

    // Secure Handshake (Eklenti kendini tanıtıyor ve ID'sini sunuyor)
    if (data.type === "AEGIS_EXTENSION_HELLO") {
       // 🔒 SECURITY HARDENED: Extension ID allowlist kontrolü — race condition koruması
       const incomingExtensionId = data.extensionId;
       
       // Extension ID format validasyonu
       if (!incomingExtensionId || typeof incomingExtensionId !== 'string') {
         console.warn("[PWA Bridge] ❌ Geçersiz extension ID formatı, reddedildi.");
         return;
       }

       // 🔒 ALLOWLIST KONTROLÜ — İlk bağlantıda bile allowlist dışı ID reddedilir
       if (!ALLOWED_EXTENSION_IDS.includes(incomingExtensionId)) {
         console.warn(`[PWA Bridge] ❌ Extension ID allowlist dışı, reddedildi: ${incomingExtensionId.substring(0, 8)}...`);
         return;
       }

       // İlk bağlantıda trusted ID'yi kaydet (defense in depth)
       if (this.trustedExtensionId && this.trustedExtensionId !== incomingExtensionId) {
         console.warn(`[PWA Bridge] ❌ Trusted ID uyuşmazlığı! Beklenen: ${this.trustedExtensionId.substring(0, 8)}..., Gelen: ${incomingExtensionId.substring(0, 8)}...`);
         return;
       }

       console.log(`[PWA Bridge] ✅ Allowlist extension tespit edildi, bağlantı hazırlanıyor: ${incomingExtensionId.substring(0, 8)}...`);
       
       // Eklentiye güvenli port açalım
       if ((window as any).chrome && (window as any).chrome.runtime) {
         try {
           const port = (window as any).chrome.runtime.connect(incomingExtensionId, { name: "aegis-pwa-vault-port" });
           this.activePort = port;
           this.trustedExtensionId = incomingExtensionId; // İlk başarılı bağlantıda ID'yi kaydet
           
            this.sessionToken = this.generateToken();
            this.challengeNonceMap.clear();
           
           // handshake token paylaşımı
           port.postMessage({ type: "SYNC_TOKEN", token: this.sessionToken });

           port.onMessage.addListener(async (msg: any) => {
             // Sadece Token yetkilendirmesi başarılı olan mesajları işle
              if (msg.token !== this.sessionToken) {
                console.warn("[PWA Bridge] Yetkisiz eklenti isteği reddedildi (Token Uyumsuz).");
                port.postMessage({ type: "ERROR", error: "UNAUTHORIZED_TOKEN" });
                return;
              }

              if (msg.type === "REQUEST_CHALLENGE") {
                const nonce = this.generateToken();
                const expiresAt = Date.now() + this.challengeTtlMs;
                this.challengeNonceMap.set(nonce, expiresAt);
                port.postMessage({
                  type: "CHALLENGE_RESPONSE",
                  nonce,
                  expiresAt,
                });
                return;
              }

              if (msg.type === "get_decrypted_creds") {
                const nonce = typeof msg.nonce === 'string' ? msg.nonce : '';
                const ts = Number(msg.ts);
                const signature = typeof msg.signature === 'string' ? msg.signature : '';
                const domain = typeof msg.domain === 'string' ? msg.domain : '';

                const isSigned = await this.verifySignedRequest(msg.type, domain, nonce, ts, signature);
                if (!isSigned) {
                  port.postMessage({ type: "ERROR", error: "INVALID_CHALLENGE_SIGNATURE" });
                  return;
                }

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
              this.challengeNonceMap.clear();
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
    this.challengeNonceMap.clear();
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

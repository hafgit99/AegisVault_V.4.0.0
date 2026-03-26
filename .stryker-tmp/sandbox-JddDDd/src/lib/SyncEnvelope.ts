/**
 * SyncEnvelope — Aegis 4.2 Faz 2 / Adim 2.1
 * 
 * Sunucuya gonderilen ve sunucudan alinan senkronizasyon paketinin 
 * zarf (envelope) yapisi. 
 */
// @ts-nocheck


export interface SyncEnvelope {
  version: string;
  sessionId: string;
  deviceId: string;
  timestamp: string;
  sequenceNumber: number;
  payload: string; // Base64url(AES-GCM-Encrypted)
  iv: string;      // Base64url(12-byte IV)
  hmac: string;    // Base64url(HMAC-SHA256)
  metadata?: {
      entryCount: number;
      vaultId?: string;
  };
}

export class SyncEnvelopeUtil {
  static create(
    payload: string,
    iv: string,
    hmac: string,
    deviceId: string,
    options: { sessionId: string, sequenceNumber: number, entryCount?: number }
  ): SyncEnvelope {
    return {
      version: "1.0",
      sessionId: options.sessionId,
      deviceId,
      timestamp: new Date().toISOString(),
      sequenceNumber: options.sequenceNumber,
      payload,
      iv,
      hmac,
      metadata: options.entryCount ? { entryCount: options.entryCount } : undefined,
    };
  }

  static validate(env: SyncEnvelope): boolean {
    if (!env.version || !env.sessionId || !env.deviceId || !env.payload || !env.iv || !env.hmac) {
      return false;
    }
    // Check version compatibility (SemVer or fixed string)
    if (env.version !== "1.0") return false;
    return true;
  }
}

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
  nonce: string;
  payload: string; // Base64url(AES-GCM-Encrypted)
  iv: string; // Base64url(12-byte IV)
  hmac: string; // Base64url(HMAC-SHA256)
  envelopeMac: string; // Base64url(HMAC-SHA256) over envelope metadata
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
    options: {
      sessionId: string;
      sequenceNumber: number;
      nonce: string;
      envelopeMac: string;
      entryCount?: number;
      timestamp?: string;
    }
  ): SyncEnvelope {
    return {
      version: '1.0',
      sessionId: options.sessionId,
      deviceId,
      timestamp: options.timestamp || new Date().toISOString(),
      sequenceNumber: options.sequenceNumber,
      nonce: options.nonce,
      payload,
      iv,
      hmac,
      envelopeMac: options.envelopeMac,
      metadata: options.entryCount ? { entryCount: options.entryCount } : undefined,
    };
  }

  static validate(env: SyncEnvelope): boolean {
    if (
      !env.version ||
      !env.sessionId ||
      !env.deviceId ||
      !env.payload ||
      !env.iv ||
      !env.hmac ||
      !env.nonce ||
      !env.envelopeMac ||
      !env.timestamp
    ) {
      return false;
    }
    if (!Number.isFinite(env.sequenceNumber) || env.sequenceNumber < 0) return false;
    if (env.version !== '1.0') return false;
    return true;
  }
}

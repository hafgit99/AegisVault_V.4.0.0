import { SyncCryptoService } from './SyncCryptoService';
import type { SyncCryptoPackage } from './SyncCryptoService';
import { SyncEnvelopeUtil } from './SyncEnvelope';
import type { SyncEnvelope } from './SyncEnvelope';
import { SyncDeviceService } from './SyncDeviceService';
import { SyncConflictService } from './SyncConflictService';
import { SecureAppSettings } from './SecureAppSettings';
import { vaultService, type VaultEntry } from '../vaultService';

/**
 * SyncManager — Aegis 4.2 Faz 2
 *
 * Relay sunucusu ile senkronizasyon akışlarını (Push/Pull) yönetir.
 */

export class SyncManager {
  private static relayApiKey = (
    (import.meta.env as ImportMetaEnv & { VITE_AEGIS_SYNC_RELAY_KEY?: string })
      .VITE_AEGIS_SYNC_RELAY_KEY || ''
  ).trim();
  private static getRelayUrl(): string {
    const storedUrl = SecureAppSettings.getSyncRelayUrl();
    if (storedUrl) return storedUrl.replace(/\/+$/, '');

    const relayUrl = (
      (import.meta.env as ImportMetaEnv & { VITE_AEGIS_SYNC_RELAY_URL?: string })
        .VITE_AEGIS_SYNC_RELAY_URL || ''
    ).trim();

    if (!relayUrl) {
      throw new Error(
        '[SyncManager] Missing relay URL. Set VITE_AEGIS_SYNC_RELAY_URL or configure in settings.'
      );
    }

    let parsed: URL;
    try {
      parsed = new URL(relayUrl);
    } catch {
      throw new Error('[SyncManager] Invalid relay URL format.');
    }

    if (parsed.protocol !== 'https:') {
      throw new Error('[SyncManager] Relay URL must use HTTPS.');
    }

    return relayUrl.replace(/\/+$/, '');
  }

  private static buildRelayHeaders(): HeadersInit {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const storedKey = SecureAppSettings.getSyncRelayApiKey();
    const apiKey = storedKey || this.relayApiKey;

    if (apiKey) {
      headers['X-Aegis-Relay-Key'] = apiKey;
    }
    return headers;
  }

  /**
   * Vault verilerini şifreler ve sunucuya gönderir.
   */
  static async push(
    sessionId: string,
    rootSecret: Uint8Array,
    entries: VaultEntry[],
    sequenceNumber: number
  ): Promise<boolean> {
    try {
      const { encryptionKey, authKey } = await SyncCryptoService.deriveSubKeys(rootSecret);

      const pkg = await SyncCryptoService.encryptAndSign(entries, encryptionKey, authKey);
      const device = SyncDeviceService.getLocalFingerprint();

      const timestamp = new Date().toISOString();
      const envelope = SyncEnvelopeUtil.create(pkg.payload, pkg.iv, pkg.hmac, device.id, {
        sessionId,
        sequenceNumber,
        nonce: pkg.nonce,
        envelopeMac: '',
        entryCount: entries.length,
        timestamp,
      });
      envelope.envelopeMac = await SyncCryptoService.createEnvelopeMac(envelope, authKey);

      const response = await fetch(`${this.getRelayUrl()}/v1/sync/push`, {
        method: 'POST',
        headers: this.buildRelayHeaders(),
        body: JSON.stringify(envelope),
      });

      return response.ok;
    } catch (err) {
      console.error('[SyncManager] Push failed:', err);
      return false;
    }
  }

  /**
   * Sunucudan güncel verileri alır ve yerel verilerle birleştirir.
   */
  static async pullAndMerge(
    sessionId: string,
    rootSecret: Uint8Array,
    localEntries: VaultEntry[],
    lastSequence: number
  ): Promise<{ merged: VaultEntry[]; newSequence: number } | null> {
    try {
      const response = await fetch(
        `${this.getRelayUrl()}/v1/sync/pull/${sessionId}?after=${lastSequence}`,
        {
          headers: this.buildRelayHeaders(),
        }
      );
      if (!response.ok) return null;

      const envelopes = (await response.json()) as SyncEnvelope[];
      if (envelopes.length === 0) return { merged: localEntries, newSequence: lastSequence };

      const { encryptionKey, authKey } = await SyncCryptoService.deriveSubKeys(rootSecret);

      let currentMerged = localEntries;
      let maxSeq = lastSequence;

      for (const env of envelopes) {
        if (!SyncEnvelopeUtil.validate(env)) {
          console.error('[SyncManager] Invalid envelope shape detected');
          continue;
        }

        const isEnvelopeMacValid = await SyncCryptoService.verifyEnvelopeMac(env, authKey);
        if (!isEnvelopeMacValid) {
          console.error('[SyncManager] Envelope MAC verification failed');
          continue;
        }

        const pkg: SyncCryptoPackage = {
          payload: env.payload,
          iv: env.iv,
          hmac: env.hmac,
          nonce: env.nonce,
        };

        const remoteEntries = await SyncCryptoService.verifyAndDecrypt<VaultEntry[]>(
          pkg,
          encryptionKey,
          authKey
        );
        if (remoteEntries) {
          const result = SyncConflictService.resolve(currentMerged, remoteEntries);
          currentMerged = result.merged;
          maxSeq = Math.max(maxSeq, env.sequenceNumber);
        }
      }

      return { merged: currentMerged, newSequence: maxSeq };
    } catch (err) {
      console.error('[SyncManager] Pull failed:', err);
      return null;
    }
  }
}

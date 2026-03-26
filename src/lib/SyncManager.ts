import { SyncCryptoService } from './SyncCryptoService';
import type { SyncCryptoPackage } from './SyncCryptoService';
import { SyncEnvelopeUtil } from './SyncEnvelope';
import type { SyncEnvelope } from './SyncEnvelope';
import { SyncDeviceService } from './SyncDeviceService';
import { SyncConflictService } from './SyncConflictService';
import { vaultService, type VaultEntry } from '../vaultService';

/**
 * SyncManager — Aegis 4.2 Faz 2
 * 
 * Relay sunucusu ile senkronizasyon akışlarını (Push/Pull) yönetir.
 */

export class SyncManager {
  private static RELAY_URL = 'http://localhost:3000'; // Default, should be configurable

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

      const envelope = SyncEnvelopeUtil.create(
        pkg.payload, 
        pkg.iv, 
        pkg.hmac, 
        device.id, 
        { sessionId, sequenceNumber, entryCount: entries.length }
      );

      const response = await fetch(`${this.RELAY_URL}/v1/sync/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope)
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
  ): Promise<{ merged: VaultEntry[], newSequence: number } | null> {
    try {
      const response = await fetch(`${this.RELAY_URL}/v1/sync/pull/${sessionId}?after=${lastSequence}`);
      if (!response.ok) return null;

      const envelopes = (await response.json()) as SyncEnvelope[];
      if (envelopes.length === 0) return { merged: localEntries, newSequence: lastSequence };

      const { encryptionKey, authKey } = await SyncCryptoService.deriveSubKeys(rootSecret);

      let currentMerged = localEntries;
      let maxSeq = lastSequence;

      for (const env of envelopes) {
        const pkg: SyncCryptoPackage = {
          payload: env.payload,
          iv: env.iv,
          hmac: env.hmac,
          nonce: '' // We don't track nonce in pull yet
        };

        const remoteEntries = await SyncCryptoService.verifyAndDecrypt<VaultEntry[]>(pkg, encryptionKey, authKey);
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

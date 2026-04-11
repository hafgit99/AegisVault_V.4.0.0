// @ts-nocheck
import type { CanonicalPasskeyFields } from './canonical-schema';

/**
 * Sync Conflict Resolution for Passkeys
 *
 * Passkeys have unique conflict requirements because the private key
 * is hardware-bound. Simply taking "Last Write Wins" might lose a working
 * credential on a current device.
 */

export interface PasskeyConflictResult {
  resolved: CanonicalPasskeyFields;
  action: 'local_kept' | 'remote_accepted' | 'merged';
}

export class PasskeyConflictResolver {
  /**
   * Resolves a conflict between two passkey metadata records for the same RP.
   */
  static resolve(
    local: CanonicalPasskeyFields,
    remote: CanonicalPasskeyFields
  ): PasskeyConflictResult {
    // 1. If one is empty, take the other
    if (!local.credential_id) return { resolved: remote, action: 'remote_accepted' };
    if (!remote.credential_id) return { resolved: local, action: 'local_kept' };

    // 2. If credential IDs match, take the one with later last_auth_at or last_registration_at
    if (local.credential_id === remote.credential_id) {
      const localTime = Date.parse(local.last_auth_at || local.last_registration_at || '0');
      const remoteTime = Date.parse(remote.last_auth_at || remote.last_registration_at || '0');

      return localTime >= remoteTime
        ? { resolved: local, action: 'local_kept' }
        : { resolved: remote, action: 'remote_accepted' };
    }

    // 3. Different Credential IDs for same RP
    // In Aegis, we prefer to KEEP the one that was most recently verified/used.
    // However, for site passkeys, a user might have multiple passkeys for one site.
    // Sync currently maps 1-to-1 to vault entries. If two different passkeys
    // exist for the "same" entry, we take the one with the freshest activity.

    const localActive = Date.parse(local.last_auth_at || local.last_registration_at || '0');
    const remoteActive = Date.parse(remote.last_auth_at || remote.last_registration_at || '0');

    if (localActive >= remoteActive) {
      return { resolved: local, action: 'local_kept' };
    } else {
      return { resolved: remote, action: 'remote_accepted' };
    }
  }

  /**
   * Merges a list of revocations from multiple devices.
   */
  static mergeRevocations<T extends { credentialId: string; revokedAt: string }>(
    localList: T[],
    remoteList: T[]
  ): T[] {
    const map = new Map<string, T>();

    [...localList, ...remoteList].forEach((rev) => {
      const existing = map.get(rev.credentialId);
      if (!existing || Date.parse(rev.revokedAt) > Date.parse(existing.revokedAt)) {
        map.set(rev.credentialId, rev);
      }
    });

    return Array.from(map.values());
  }
}

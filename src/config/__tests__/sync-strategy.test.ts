import { describe, expect, it } from 'vitest';
import {
  AEGIS_SYNC_AUDIT_LANGUAGE,
  AEGIS_SYNC_CONFLICT_RULES,
  AEGIS_SYNC_MODES,
  AEGIS_SYNC_STRATEGY,
  AEGIS_SYNC_TRANSPORTS,
} from '../sync-strategy';

describe('sync-strategy config', () => {
  it('declares offline-first mode defaults', () => {
    expect(AEGIS_SYNC_MODES.offline_first.defaultTransportKeys).toEqual([
      'qr_transfer',
      'encrypted_backup',
      'plaintext_export',
    ]);
    expect(AEGIS_SYNC_MODES.optional_encrypted_sync.defaultTransportKeys).toEqual([
      'optional_encrypted_sync',
    ]);
  });

  it('contains transport trust boundaries and conflict rules', () => {
    expect(AEGIS_SYNC_TRANSPORTS.qr_transfer.trustBoundaryDefault).toContain('Trust boundary');
    expect(AEGIS_SYNC_TRANSPORTS.optional_encrypted_sync.key).toBe('optional_encrypted_sync');
    expect(AEGIS_SYNC_CONFLICT_RULES.map((rule) => rule.key)).toEqual([
      'local_primary',
      'explicit_merge_only',
      'restore_requires_confirmation',
    ]);
  });

  it('exposes strategy and audit language constants', () => {
    expect(AEGIS_SYNC_AUDIT_LANGUAGE).toHaveLength(6);
    expect(AEGIS_SYNC_STRATEGY.activeMode).toBe('offline_first');
    expect(AEGIS_SYNC_STRATEGY.futureMode).toBe('optional_encrypted_sync');
    expect(AEGIS_SYNC_STRATEGY.passkeyPolicy.syncRevocations).toBe(true);
  });
});

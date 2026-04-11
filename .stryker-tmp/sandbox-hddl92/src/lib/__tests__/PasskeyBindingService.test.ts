// @ts-nocheck
// @vitest-environment jsdom
import { PasskeyBindingService } from '../PasskeyBindingService';
import { BackupService } from '../BackupService';
import type { PasskeyBindingRecord } from '../PasskeyBindingService';

type RecoveryPackage = {
  kind: 'aegis-passkey-recovery-v2';
  binding: PasskeyBindingRecord;
  revocations: Array<{ credentialId: string; revokedAt: string; reason: string }>;
  policy: {
    maxBindingAgeDays: number;
    requireRecoveryExportBeforeRotation: boolean;
    blockRevokedCredentials: boolean;
  };
};

describe('PasskeyBindingService', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.clearAllMocks();
    await PasskeyBindingService.initialize();
    PasskeyBindingService.clearAllBindings();
  });

  it('stores and reads profile-scoped binding with detailed metadata', () => {
    PasskeyBindingService.saveBinding('profile-A', 'db-A', {
      credentialId: 'cred-A',
      encryptedPayload: 'enc-A',
      prfSalt: 'salt-A',
      meta: {
        createdAt: '2026-01-01T00:00:00.000Z',
        lastUsedAt: '2026-01-01T00:00:00.000Z',
        version: 1,
      },
    });

    const a = PasskeyBindingService.getBinding('profile-A', 'db-A');
    expect(a?.credentialId).toBe('cred-A');
    expect(a?.meta.profileId).toBe('profile-A');
    expect(a?.meta.deviceFingerprint).toBeTruthy();
    expect(a?.meta.deviceLabel).toContain('This device');
  });

  it('handles corrupted localStorage data in legacy migration', () => {
    localStorage.setItem('aegis_passkey_id', 'legacy-id');
    localStorage.setItem('aegis_passkey_data', 'legacy-data');
    localStorage.setItem('aegis_prf_salt', 'legacy-salt');
    localStorage.setItem('aegis_passkey_meta', 'NOT_JSON_DATA'); // Mutant test for safeParse

    const binding = PasskeyBindingService.getBinding('default', 'aegis_opfs_vault');
    expect(binding?.credentialId).toBe('legacy-id');
    expect(binding?.meta.createdAt).toBeDefined(); // should use now()
  });

  it('handles partial binding records and normalizes state', async () => {
    // Trigger normalization via direct state mutation access if possible or via import
    const decryptSpy = vi.spyOn(BackupService, 'decryptBackup').mockResolvedValue([
      {
        kind: 'aegis-passkey-recovery-v2',
        binding: {
          credentialId: 'partial',
          meta: {}, // Missing fields
        } as any,
        revocations: null as any,
        policy: { maxBindingAgeDays: 'INVALID' as any },
      },
    ]);

    await PasskeyBindingService.importRecoveryPackage('pkg', 'pw', 'p', 'd');
    const binding = PasskeyBindingService.getBinding('p', 'd');
    expect(binding?.credentialId).toBe('partial');
    expect(binding?.meta.version).toBeDefined(); // normalized to default
    expect(PasskeyBindingService.getPolicy().maxBindingAgeDays).toBe(90); // normalized to default
  });

  it('revokes only the selected profile binding and tracks the event', () => {
    PasskeyBindingService.saveBinding('profile-A', 'db-A', {
      credentialId: 'cred-A',
      encryptedPayload: 'enc-A',
      prfSalt: 'salt-A',
      meta: {
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        version: 1,
      },
    });

    expect(PasskeyBindingService.revokeBinding('NOT_FOUND', 'db')).toBe(false);

    const revoked = PasskeyBindingService.revokeBinding('profile-A', 'db-A', 'user_requested');
    expect(revoked).toBe(true);
    expect(PasskeyBindingService.getBinding('profile-A', 'db-A')).toBeNull();
    expect(
      PasskeyBindingService.getEventLog().some(
        (event) => event.type === 'revoked' && event.detail === 'user_requested'
      )
    ).toBe(true);
  });

  it('updates policy and tracks the policy_updated event', () => {
    const next = PasskeyBindingService.updatePolicy({ maxBindingAgeDays: 45 });
    expect(next.maxBindingAgeDays).toBe(45);
    expect(PasskeyBindingService.getPolicy().maxBindingAgeDays).toBe(45);
    expect(PasskeyBindingService.getEventLog().some((e) => e.type === 'policy_updated')).toBe(true);
  });

  it('handles missing navigator properties in getDeviceInfo', () => {
    const originalNavigator = global.navigator;
    // 
    global.navigator = undefined;

    PasskeyBindingService.saveBinding('p', 'd', {
      credentialId: 'c',
      meta: { version: 1 } as any,
    } as any);

    const b = PasskeyBindingService.getBinding('p', 'd');
    expect(b?.meta.deviceLabel).toBe('This device / unknown');

    global.navigator = originalNavigator;
  });

  it('merges external revocations and returns count', () => {
    const now = new Date().toISOString();
    PasskeyBindingService.saveBinding('p', 'd', { credentialId: 'c1', meta: {} } as any);
    PasskeyBindingService.revokeBinding('p', 'd', 'r1');

    // Merge new one
    const count = PasskeyBindingService.mergeExternalRevocations([
      { credentialId: 'c2', revokedAt: now, reason: 'remote' },
    ]);
    expect(count).toBe(1);
    expect(PasskeyBindingService.isCredentialRevoked('c2')).toBe(true);

    // Merge existing older one (should ignore)
    const old = new Date(Date.now() - 100000).toISOString();
    const count2 = PasskeyBindingService.mergeExternalRevocations([
      { credentialId: 'c2', revokedAt: old, reason: 'older_remote' },
    ]);
    expect(count2).toBe(0);
  });
});

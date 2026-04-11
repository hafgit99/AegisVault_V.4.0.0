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
    // @ts-ignore
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

  it('normalizes completely corrupted legacy JSON safely to defaults', async () => {
    vi.resetModules();
    
    localStorage.setItem('aegis_passkey_bindings_v1', JSON.stringify({
      'p1::db1': {
        // Missing everything
      },
      'p2::db2': null // Invalid member
    }));
    localStorage.setItem('aegis_passkey_audit_v1', '{"not":"array"}');
    localStorage.setItem('aegis_passkey_revocations_v1', '"string_not_array"');
    localStorage.setItem('aegis_passkey_policy_v1', '{"maxBindingAgeDays": "NOT_NUMBER"}');
    
    const { PasskeyBindingService: FreshService } = await import('../PasskeyBindingService');
    await FreshService.initialize();

    const bindings = FreshService.listBindings();
    expect(bindings.some(b => b.bindingKey === 'p1::db1')).toBe(true);
    expect(bindings.some(b => b.bindingKey === 'p2::db2')).toBe(true);

    const target = FreshService.getBinding('p1', 'db1');
    expect(target?.credentialId).toBe('');
    expect(target?.encryptedPayload).toBe('');
    expect(target?.prfSalt).toBe('');
    expect(target?.meta.version).toBe(1);
    expect(target?.eventLog).toEqual([]);

    expect(FreshService.getEventLog()).toEqual([]);
    expect(FreshService.listRevocations()).toEqual([]);
    expect(FreshService.getPolicy().maxBindingAgeDays).toBe(90);
  });

  it('getPolicyViolations correctly identifies issues based on current policy', () => {
    PasskeyBindingService.saveBinding('pol', 'db', {
      credentialId: 'cred-viol',
      meta: {
        createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(), // 100 days old
        rotatedFromCredentialId: 'old-cred-1'
      }
    } as any);

    let violations = PasskeyBindingService.getPolicyViolations(PasskeyBindingService.getBinding('pol', 'db'));
    expect(violations).toContain('PASSKEY_ROTATION_REQUIRED'); // Because default max is 90
    
    // Test requireRecoveryExportBeforeRotation
    PasskeyBindingService.updatePolicy({ requireRecoveryExportBeforeRotation: true });
    violations = PasskeyBindingService.getPolicyViolations(PasskeyBindingService.getBinding('pol', 'db'));
    expect(violations).toContain('PASSKEY_RECOVERY_EXPORT_REQUIRED');

    // Test revoked credential block
    PasskeyBindingService.mergeExternalRevocations([{ credentialId: 'cred-viol', revokedAt: '2026', reason: '' }]);
    violations = PasskeyBindingService.getPolicyViolations(PasskeyBindingService.getBinding('pol', 'db'));
    expect(violations).toContain('PASSKEY_REVOKED');

    // Turn off policies
    PasskeyBindingService.updatePolicy({ maxBindingAgeDays: 120, blockRevokedCredentials: false, requireRecoveryExportBeforeRotation: false });
    violations = PasskeyBindingService.getPolicyViolations(PasskeyBindingService.getBinding('pol', 'db'));
    expect(violations).toEqual([]);
    
    // Null binding returns empty
    expect(PasskeyBindingService.getPolicyViolations(null)).toEqual([]);
  });

  it('updateLastUsed updates the time and logs event', () => {
    PasskeyBindingService.saveBinding('u', 'd', { credentialId: 'uid1', meta: {} } as any);
    PasskeyBindingService.updateLastUsed('u', 'd');
    
    const binding = PasskeyBindingService.getBinding('u', 'd');
    expect(binding?.meta.lastUsedAt).toBeDefined();
    expect(binding?.eventLog?.some(e => e.type === 'used')).toBe(true);

    // Call on nonexistent shouldn't crash
    expect(() => PasskeyBindingService.updateLastUsed('missing', 'db')).not.toThrow();
  });

  it('bindSiteCredentialToEntry merges metadata properly', () => {
    const entry = { id: 1, passkeyMetadata: { created_at: '2025' } } as any;
    const bound = PasskeyBindingService.bindSiteCredentialToEntry(entry, 'new-site-cred', 'a.com');
    
    expect(bound.passkeyMetadata.credential_id).toBe('new-site-cred');
    expect(bound.passkeyMetadata.rp_id).toBe('a.com');
    expect(bound.passkeyMetadata.mode).toBe('site_passkey_active');
    expect(bound.passkeyMetadata.created_at).toBe('2025'); // Preserved
    expect(bound.passkeyMetadata.last_registration_at).toBeDefined();
  });

  it('exportRecoveryPackage throws for missing and operates correctly otherwise', async () => {
    vi.spyOn(BackupService, 'encryptBackup').mockResolvedValue('__ENCRYPTED_MOCK__');
    
    await expect(PasskeyBindingService.exportRecoveryPackage('missing', 'db', 'pass'))
      .rejects.toThrow('NO_PASSKEY_BINDING');

    PasskeyBindingService.saveBinding('exp', 'db', { credentialId: 'cid', meta: {} } as any);
    const result = await PasskeyBindingService.exportRecoveryPackage('exp', 'db', 'pass');
    expect(result).toBe('__ENCRYPTED_MOCK__');
    
    // noteRecoveryExport is called implicitly, so let's check
    const binding = PasskeyBindingService.getBinding('exp', 'db');
    expect(binding?.meta.recoveryLastExportedAt).toBeDefined();
  });

  it('importRecoveryPackage applies rigorous validation on payload', async () => {
    // Empty array
    vi.spyOn(BackupService, 'decryptBackup').mockResolvedValueOnce([]);
    await expect(PasskeyBindingService.importRecoveryPackage('', '', 'p', 'd')).rejects.toThrow('INVALID_RECOVERY_PACKAGE');

    // Missing binding inside array
    vi.spyOn(BackupService, 'decryptBackup').mockResolvedValueOnce([{ kind: 'aegis-passkey-recovery-v2' }]);
    await expect(PasskeyBindingService.importRecoveryPackage('', '', 'p', 'd')).rejects.toThrow('INVALID_RECOVERY_PACKAGE');

    // Profile mismatch
    vi.spyOn(BackupService, 'decryptBackup').mockResolvedValueOnce([{ kind: 'aegis-passkey-recovery-v2', binding: { meta: { profileId: 'WRONG' } } }]);
    await expect(PasskeyBindingService.importRecoveryPackage('', '', 'p', 'd')).rejects.toThrow('RECOVERY_PROFILE_MISMATCH');

    // DB mismatch
    vi.spyOn(BackupService, 'decryptBackup').mockResolvedValueOnce([{ kind: 'aegis-passkey-recovery-v2', binding: { meta: { profileId: 'p', dbName: 'WRONG' } } }]);
    await expect(PasskeyBindingService.importRecoveryPackage('', '', 'p', 'd')).rejects.toThrow('RECOVERY_DB_MISMATCH');
    
    // Complete success import
    vi.spyOn(BackupService, 'decryptBackup').mockResolvedValueOnce([
      { 
        kind: 'aegis-passkey-recovery-v2', 
        binding: { credentialId: 'recovered-cid', meta: { profileId: 'p', dbName: 'd' } },
        revocations: [{ credentialId: 'old', revokedAt: '2026', reason: 'stolen' }],
        policy: { maxBindingAgeDays: 50 },
      }
    ]);
    
    await PasskeyBindingService.importRecoveryPackage('payload', 'pass', 'p', 'd');
    
    const imported = PasskeyBindingService.getBinding('p', 'd');
    expect(imported?.credentialId).toBe('recovered-cid');
    expect(PasskeyBindingService.listRevocations().some(r => r.credentialId === 'old')).toBe(true);
    expect(PasskeyBindingService.getPolicy().maxBindingAgeDays).toBe(50);
  });
});


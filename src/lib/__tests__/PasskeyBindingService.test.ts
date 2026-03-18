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
    await PasskeyBindingService.initialize();
    PasskeyBindingService.clearAllBindings();
  });

  it('stores and reads profile-scoped binding', () => {
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

    PasskeyBindingService.saveBinding('profile-B', 'db-B', {
      credentialId: 'cred-B',
      encryptedPayload: 'enc-B',
      prfSalt: 'salt-B',
      meta: {
        createdAt: '2026-01-01T00:00:00.000Z',
        lastUsedAt: '2026-01-01T00:00:00.000Z',
        version: 1,
      },
    });

    const a = PasskeyBindingService.getBinding('profile-A', 'db-A');
    const b = PasskeyBindingService.getBinding('profile-B', 'db-B');

    expect(a?.credentialId).toBe('cred-A');
    expect(b?.credentialId).toBe('cred-B');
    expect(a?.meta.profileId).toBe('profile-A');
    expect(b?.meta.profileId).toBe('profile-B');
  });

  it('revokes only the selected profile binding', () => {
    PasskeyBindingService.saveBinding('profile-A', 'db-A', {
      credentialId: 'cred-A',
      encryptedPayload: 'enc-A',
      prfSalt: 'salt-A',
      meta: { createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString(), version: 1 },
    });
    PasskeyBindingService.saveBinding('profile-B', 'db-B', {
      credentialId: 'cred-B',
      encryptedPayload: 'enc-B',
      prfSalt: 'salt-B',
      meta: { createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString(), version: 1 },
    });

    const revoked = PasskeyBindingService.revokeBinding('profile-A', 'db-A', 'user_requested');
    expect(revoked).toBe(true);
    expect(PasskeyBindingService.getBinding('profile-A', 'db-A')).toBeNull();
    expect(PasskeyBindingService.getBinding('profile-B', 'db-B')?.credentialId).toBe('cred-B');
    expect(PasskeyBindingService.getEventLog().some((event) => event.type === 'revoked' && event.detail === 'user_requested')).toBe(true);
  });

  it('exports and imports recovery package for matching profile/db', async () => {
    PasskeyBindingService.saveBinding('profile-A', 'db-A', {
      credentialId: 'cred-A',
      encryptedPayload: 'enc-A',
      prfSalt: 'salt-A',
      meta: { createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString(), version: 1 },
    });

    const encryptSpy = vi.spyOn(BackupService, 'encryptBackup').mockResolvedValue('encrypted-package');
    const recoveryPayload: RecoveryPackage[] = [
      {
        kind: 'aegis-passkey-recovery-v2',
        binding: {
          credentialId: 'cred-A2',
          encryptedPayload: 'enc-A2',
          prfSalt: 'salt-A2',
          meta: { createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString(), version: 1, profileId: 'profile-A', dbName: 'db-A' },
        },
        revocations: [],
        policy: {
          maxBindingAgeDays: 90,
          requireRecoveryExportBeforeRotation: false,
          blockRevokedCredentials: true,
        },
      },
    ];
    const decryptSpy = vi.spyOn(BackupService, 'decryptBackup').mockResolvedValue(recoveryPayload);

    const out = await PasskeyBindingService.exportRecoveryPackage('profile-A', 'db-A', 'pw');
    expect(out).toBe('encrypted-package');
    expect(encryptSpy).toHaveBeenCalledTimes(1);

    await PasskeyBindingService.importRecoveryPackage('encrypted-package', 'pw', 'profile-A', 'db-A');
    expect(decryptSpy).toHaveBeenCalledTimes(1);
    const imported = PasskeyBindingService.getBinding('profile-A', 'db-A');
    expect(imported?.credentialId).toBe('cred-A2');
    expect(imported?.meta.deviceFingerprint).toBeTruthy();
    expect(PasskeyBindingService.getEventLog('profile-A', 'db-A').some((event) => event.type === 'recovery_imported')).toBe(true);

    encryptSpy.mockRestore();
    decryptSpy.mockRestore();
  });

  it('rejects recovery package profile mismatch', async () => {
    const mismatchPayload: RecoveryPackage[] = [
      {
        kind: 'aegis-passkey-recovery-v2',
        binding: {
          credentialId: 'cred-X',
          encryptedPayload: 'enc-X',
          prfSalt: 'salt-X',
          meta: { createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString(), version: 1, profileId: 'profile-X', dbName: 'db-X' },
        },
        revocations: [],
        policy: {
          maxBindingAgeDays: 90,
          requireRecoveryExportBeforeRotation: false,
          blockRevokedCredentials: true,
        },
      },
    ];
    const decryptSpy = vi.spyOn(BackupService, 'decryptBackup').mockResolvedValue(mismatchPayload);

    await expect(
      PasskeyBindingService.importRecoveryPackage('pkg', 'pw', 'profile-A', 'db-A')
    ).rejects.toThrow('RECOVERY_PROFILE_MISMATCH');

    decryptSpy.mockRestore();
  });

  it('tracks recovery export and usage events', async () => {
    PasskeyBindingService.saveBinding('profile-A', 'db-A', {
      credentialId: 'cred-A',
      encryptedPayload: 'enc-A',
      prfSalt: 'salt-A',
      meta: { createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString(), version: 1 },
    });

    const encryptSpy = vi.spyOn(BackupService, 'encryptBackup').mockResolvedValue('encrypted-package');
    await PasskeyBindingService.exportRecoveryPackage('profile-A', 'db-A', 'pw');
    PasskeyBindingService.updateLastUsed('profile-A', 'db-A');

    const binding = PasskeyBindingService.getBinding('profile-A', 'db-A');
    expect(binding?.meta.recoveryLastExportedAt).toBeTruthy();
    expect(binding?.eventLog?.some((event) => event.type === 'recovery_exported')).toBe(true);
    expect(binding?.eventLog?.some((event) => event.type === 'used')).toBe(true);

    encryptSpy.mockRestore();
  });

  it('lists bindings with device-scoped metadata', () => {
    PasskeyBindingService.saveBinding('profile-A', 'db-A', {
      credentialId: 'cred-A',
      encryptedPayload: 'enc-A',
      prfSalt: 'salt-A',
      meta: { createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString(), version: 1 },
    });

    const bindings = PasskeyBindingService.listBindings();
    expect(bindings).toHaveLength(1);
    expect(bindings[0].meta.deviceLabel).toBeTruthy();
    expect(bindings[0].meta.deviceFingerprint).toBeTruthy();
  });

  it('syncs revoke list through recovery imports and blocks revoked credentials by policy', async () => {
    const decryptSpy = vi.spyOn(BackupService, 'decryptBackup').mockResolvedValue([
      {
        kind: 'aegis-passkey-recovery-v2',
        binding: {
          credentialId: 'cred-Z',
          encryptedPayload: 'enc-Z',
          prfSalt: 'salt-Z',
          meta: { createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString(), version: 1, profileId: 'profile-A', dbName: 'db-A' },
        },
        revocations: [
          {
            credentialId: 'cred-old',
            revokedAt: new Date().toISOString(),
            reason: 'rotated',
          },
        ],
        policy: {
          maxBindingAgeDays: 60,
          requireRecoveryExportBeforeRotation: true,
          blockRevokedCredentials: true,
        },
      },
    ] as RecoveryPackage[]);

    await PasskeyBindingService.importRecoveryPackage('pkg', 'pw', 'profile-A', 'db-A');

    expect(PasskeyBindingService.listRevocations().some((item) => item.credentialId === 'cred-old')).toBe(true);
    expect(PasskeyBindingService.getPolicy().maxBindingAgeDays).toBe(60);
    expect(PasskeyBindingService.isCredentialRevoked('cred-old')).toBe(true);

    decryptSpy.mockRestore();
  });
});

// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PasskeyBindingService } from '../PasskeyBindingService';
import { BackupService } from '../BackupService';

describe('PasskeyBindingService', () => {
  beforeEach(() => {
    localStorage.clear();
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

    const revoked = PasskeyBindingService.revokeBinding('profile-A', 'db-A');
    expect(revoked).toBe(true);
    expect(PasskeyBindingService.getBinding('profile-A', 'db-A')).toBeNull();
    expect(PasskeyBindingService.getBinding('profile-B', 'db-B')?.credentialId).toBe('cred-B');
  });

  it('exports and imports recovery package for matching profile/db', async () => {
    PasskeyBindingService.saveBinding('profile-A', 'db-A', {
      credentialId: 'cred-A',
      encryptedPayload: 'enc-A',
      prfSalt: 'salt-A',
      meta: { createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString(), version: 1 },
    });

    const encryptSpy = vi.spyOn(BackupService, 'encryptBackup').mockResolvedValue('encrypted-package');
    const decryptSpy = vi.spyOn(BackupService, 'decryptBackup').mockResolvedValue([
      {
        kind: 'aegis-passkey-recovery-v1',
        binding: {
          credentialId: 'cred-A2',
          encryptedPayload: 'enc-A2',
          prfSalt: 'salt-A2',
          meta: { createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString(), version: 1, profileId: 'profile-A', dbName: 'db-A' },
        },
      },
    ] as any);

    const out = await PasskeyBindingService.exportRecoveryPackage('profile-A', 'db-A', 'pw');
    expect(out).toBe('encrypted-package');
    expect(encryptSpy).toHaveBeenCalledTimes(1);

    await PasskeyBindingService.importRecoveryPackage('encrypted-package', 'pw', 'profile-A', 'db-A');
    expect(decryptSpy).toHaveBeenCalledTimes(1);
    expect(PasskeyBindingService.getBinding('profile-A', 'db-A')?.credentialId).toBe('cred-A2');

    encryptSpy.mockRestore();
    decryptSpy.mockRestore();
  });

  it('rejects recovery package profile mismatch', async () => {
    const decryptSpy = vi.spyOn(BackupService, 'decryptBackup').mockResolvedValue([
      {
        kind: 'aegis-passkey-recovery-v1',
        binding: {
          credentialId: 'cred-X',
          encryptedPayload: 'enc-X',
          prfSalt: 'salt-X',
          meta: { createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString(), version: 1, profileId: 'profile-X', dbName: 'db-X' },
        },
      },
    ] as any);

    await expect(
      PasskeyBindingService.importRecoveryPackage('pkg', 'pw', 'profile-A', 'db-A')
    ).rejects.toThrow('RECOVERY_PROFILE_MISMATCH');

    decryptSpy.mockRestore();
  });
});

// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SecureAppSettings } from '../SecureAppSettings';
import { VaultManager } from '../VaultManager';

describe('VaultManager', () => {
  beforeEach(() => {
    localStorage.clear();
    SecureAppSettings.resetForTests();
    VaultManager.resetForTests();
  });

  it('creates a default profile when no persisted profiles exist', () => {
    const profiles = VaultManager.getProfiles();

    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toMatchObject({
      id: 'default',
      name: 'Personal Vault',
      dbName: 'aegis_opfs_vault',
      isDefault: true,
    });
    expect(VaultManager.getActiveVaultId()).toBe('default');
    expect(VaultManager.getActiveProfile().id).toBe('default');
  });

  it('creates, renames, recolors and clones custom profiles safely', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);

    const created = VaultManager.createProfile(' Work Vault ');
    expect(created.id).toBe('vault_1700000000000_4fzzzx');
    expect(created.name).toBe('Work Vault');
    expect(created.dbName).toBe(`aegis_opfs_${created.id}`);

    VaultManager.renameProfile(created.id, ' Renamed Vault ');
    VaultManager.setProfileColor(created.id, '#abcdef');

    const stored = VaultManager.getProfiles().find((profile) => profile.id === created.id);
    expect(stored).toMatchObject({
      name: 'Renamed Vault',
      color: '#abcdef',
    });

    const cloned = VaultManager.getProfiles();
    cloned[0].name = 'Mutated';
    expect(VaultManager.getProfiles()[0].name).not.toBe('Mutated');

    vi.restoreAllMocks();
  });

  it('prevents deleting the default profile and reassigns active vault when needed', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy
      .mockReturnValueOnce(0.111111111)
      .mockReturnValueOnce(0.222222222);

    const first = VaultManager.createProfile('Work Vault');
    const second = VaultManager.createProfile('Travel Vault');

    expect(VaultManager.deleteProfile('default')).toBe(false);

    VaultManager.setActiveVaultId(first.id);
    expect(VaultManager.getActiveProfile().id).toBe(first.id);

    expect(VaultManager.deleteProfile(first.id)).toBe(true);
    expect(VaultManager.getProfiles().some((profile) => profile.id === first.id)).toBe(false);
    expect(VaultManager.getActiveVaultId()).toBe('default');

    VaultManager.setActiveVaultId(second.id);
    expect(VaultManager.deleteProfile(second.id)).toBe(true);
    expect(VaultManager.getActiveVaultId()).toBe('default');

    randomSpy.mockRestore();
    vi.restoreAllMocks();
  });
});

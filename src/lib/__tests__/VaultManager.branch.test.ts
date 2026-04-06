import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VaultManager } from '../VaultManager';

vi.mock('../SecureAppSettings', () => ({
  SecureAppSettings: {
    getVaultProfiles: vi.fn(),
    setVaultProfiles: vi.fn(),
    getActiveVaultId: vi.fn(),
    setActiveVaultId: vi.fn(),
  },
}));

import { SecureAppSettings } from '../SecureAppSettings';

const mockSettings = SecureAppSettings as unknown as {
  getVaultProfiles: ReturnType<typeof vi.fn>;
  setVaultProfiles: ReturnType<typeof vi.fn>;
  getActiveVaultId: ReturnType<typeof vi.fn>;
  setActiveVaultId: ReturnType<typeof vi.fn>;
};

describe('VaultManager: Branch Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    VaultManager.resetForTests();
    mockSettings.getVaultProfiles.mockReturnValue([]);
    mockSettings.getActiveVaultId.mockReturnValue(null);
  });

  it('getProfiles: initializes default when settings returns empty', () => {
    mockSettings.getVaultProfiles.mockReturnValue([]);
    const profiles = VaultManager.getProfiles();
    expect(profiles.length).toBe(1);
    expect(profiles[0].id).toBe('default');
    expect(profiles[0].isDefault).toBe(true);
    expect(mockSettings.setVaultProfiles).toHaveBeenCalled();
    expect(mockSettings.setActiveVaultId).toHaveBeenCalledWith('default');
  });

  it('getProfiles: initializes default when settings throws', () => {
    mockSettings.getVaultProfiles.mockImplementation(() => {
      throw new Error('fail');
    });
    const profiles = VaultManager.getProfiles();
    expect(profiles.length).toBe(1);
    expect(profiles[0].id).toBe('default');
  });

  it('getProfiles: returns cached profiles on second call', () => {
    mockSettings.getVaultProfiles.mockReturnValue([
      { id: 'v1', name: 'V1', color: '#fff', createdAt: '', dbName: 'db1', isDefault: true },
    ]);
    const first = VaultManager.getProfiles();
    const second = VaultManager.getProfiles();
    expect(first).toEqual(second);
    // getVaultProfiles should only be called once due to cache
    expect(mockSettings.getVaultProfiles).toHaveBeenCalledTimes(1);
  });

  it('getActiveVaultId: returns cached value', () => {
    VaultManager.setActiveVaultId('cached-id');
    expect(VaultManager.getActiveVaultId()).toBe('cached-id');
    expect(mockSettings.getActiveVaultId).not.toHaveBeenCalled();
  });

  it('getActiveVaultId: reads from settings when cache is null', () => {
    mockSettings.getActiveVaultId.mockReturnValue('stored-id');
    expect(VaultManager.getActiveVaultId()).toBe('stored-id');
  });

  it('getActiveVaultId: defaults to "default" when settings returns null', () => {
    mockSettings.getActiveVaultId.mockReturnValue(null);
    expect(VaultManager.getActiveVaultId()).toBe('default');
  });

  it('getActiveProfile: returns active profile matching id', () => {
    mockSettings.getVaultProfiles.mockReturnValue([
      {
        id: 'default',
        name: 'Personal',
        color: '#72886f',
        createdAt: '',
        dbName: 'db1',
        isDefault: true,
      },
      { id: 'v2', name: 'Work', color: '#4f7cac', createdAt: '', dbName: 'db2', isDefault: false },
    ]);
    VaultManager.setActiveVaultId('v2');
    const profile = VaultManager.getActiveProfile();
    expect(profile.id).toBe('v2');
    expect(profile.name).toBe('Work');
  });

  it('getActiveProfile: falls back to first profile when active id not found', () => {
    mockSettings.getVaultProfiles.mockReturnValue([
      {
        id: 'default',
        name: 'Personal',
        color: '#72886f',
        createdAt: '',
        dbName: 'db1',
        isDefault: true,
      },
    ]);
    VaultManager.setActiveVaultId('nonexistent');
    const profile = VaultManager.getActiveProfile();
    expect(profile.id).toBe('default');
  });

  it('createProfile: creates with correct color index', () => {
    mockSettings.getVaultProfiles.mockReturnValue([
      {
        id: 'default',
        name: 'Personal',
        color: '#72886f',
        createdAt: '',
        dbName: 'db1',
        isDefault: true,
      },
    ]);
    const profile = VaultManager.createProfile('Work Vault');
    expect(profile.name).toBe('Work Vault');
    expect(profile.color).toBe('#4f7cac'); // DEFAULT_COLORS[1]
    expect(profile.isDefault).toBe(false);
    expect(profile.dbName).toMatch(/^aegis_opfs_vault_/);
    expect(mockSettings.setVaultProfiles).toHaveBeenCalled();
  });

  it('createProfile: without crypto.randomUUID uses fallback', () => {
    const orig = crypto.randomUUID;
    (crypto as any).randomUUID = undefined;
    mockSettings.getVaultProfiles.mockReturnValue([]);
    VaultManager.getProfiles(); // init default
    const profile = VaultManager.createProfile('Fallback');
    expect(profile.id).toMatch(/^vault_/);
    (crypto as any).randomUUID = orig;
  });

  it('deleteProfile: cannot delete when only one profile', () => {
    mockSettings.getVaultProfiles.mockReturnValue([
      {
        id: 'default',
        name: 'Personal',
        color: '#72886f',
        createdAt: '',
        dbName: 'db1',
        isDefault: true,
      },
    ]);
    VaultManager.getProfiles();
    expect(VaultManager.deleteProfile('default')).toBe(false);
  });

  it('deleteProfile: cannot delete default profile', () => {
    mockSettings.getVaultProfiles.mockReturnValue([
      {
        id: 'default',
        name: 'Personal',
        color: '#72886f',
        createdAt: '',
        dbName: 'db1',
        isDefault: true,
      },
      { id: 'v2', name: 'Work', color: '#4f7cac', createdAt: '', dbName: 'db2', isDefault: false },
    ]);
    VaultManager.getProfiles();
    expect(VaultManager.deleteProfile('default')).toBe(false);
  });

  it('deleteProfile: cannot delete non-existent profile', () => {
    mockSettings.getVaultProfiles.mockReturnValue([
      {
        id: 'default',
        name: 'Personal',
        color: '#72886f',
        createdAt: '',
        dbName: 'db1',
        isDefault: true,
      },
      { id: 'v2', name: 'Work', color: '#4f7cac', createdAt: '', dbName: 'db2', isDefault: false },
    ]);
    VaultManager.getProfiles();
    expect(VaultManager.deleteProfile('nonexistent')).toBe(false);
  });

  it('deleteProfile: switches to default when active vault deleted', () => {
    mockSettings.getVaultProfiles.mockReturnValue([
      {
        id: 'default',
        name: 'Personal',
        color: '#72886f',
        createdAt: '',
        dbName: 'db1',
        isDefault: true,
      },
      { id: 'v2', name: 'Work', color: '#4f7cac', createdAt: '', dbName: 'db2', isDefault: false },
    ]);
    VaultManager.getProfiles();
    VaultManager.setActiveVaultId('v2');
    expect(VaultManager.deleteProfile('v2')).toBe(true);
    expect(VaultManager.getActiveVaultId()).toBe('default');
  });

  it('renameProfile: renames existing profile', () => {
    mockSettings.getVaultProfiles.mockReturnValue([
      {
        id: 'default',
        name: 'Personal',
        color: '#72886f',
        createdAt: '',
        dbName: 'db1',
        isDefault: true,
      },
    ]);
    VaultManager.getProfiles();
    VaultManager.renameProfile('default', 'Renamed Vault');
    const profiles = VaultManager.getProfiles();
    expect(profiles[0].name).toBe('Renamed Vault');
  });

  it('renameProfile: no-op for non-existent profile', () => {
    mockSettings.getVaultProfiles.mockReturnValue([
      {
        id: 'default',
        name: 'Personal',
        color: '#72886f',
        createdAt: '',
        dbName: 'db1',
        isDefault: true,
      },
    ]);
    VaultManager.getProfiles();
    VaultManager.renameProfile('nonexistent', 'New Name');
    // Should still save since getProfiles was called
    const profiles = VaultManager.getProfiles();
    expect(profiles[0].name).toBe('Personal');
  });

  it('setProfileColor: updates color of existing profile', () => {
    mockSettings.getVaultProfiles.mockReturnValue([
      {
        id: 'default',
        name: 'Personal',
        color: '#72886f',
        createdAt: '',
        dbName: 'db1',
        isDefault: true,
      },
    ]);
    VaultManager.getProfiles();
    VaultManager.setProfileColor('default', '#ff0000');
    const profiles = VaultManager.getProfiles();
    expect(profiles[0].color).toBe('#ff0000');
  });

  it('setProfileColor: no-op for non-existent profile', () => {
    mockSettings.getVaultProfiles.mockReturnValue([
      {
        id: 'default',
        name: 'Personal',
        color: '#72886f',
        createdAt: '',
        dbName: 'db1',
        isDefault: true,
      },
    ]);
    VaultManager.getProfiles();
    VaultManager.setProfileColor('nonexistent', '#ff0000');
    const profiles = VaultManager.getProfiles();
    expect(profiles[0].color).toBe('#72886f');
  });

  it('getColorPalette: returns all 8 default colors', () => {
    const palette = VaultManager.getColorPalette();
    expect(palette.length).toBe(8);
    expect(palette[0]).toBe('#72886f');
  });

  it('resetForTests: clears all caches', () => {
    VaultManager.setActiveVaultId('test-id');
    VaultManager.resetForTests();
    // After reset, getActiveVaultId should read from settings
    mockSettings.getActiveVaultId.mockReturnValue('from-settings');
    expect(VaultManager.getActiveVaultId()).toBe('from-settings');
  });

  it('getProfiles: returns stored profiles when available', () => {
    const stored = [
      {
        id: 'v1',
        name: 'V1',
        color: '#fff',
        createdAt: '2024-01-01',
        dbName: 'db1',
        isDefault: true,
      },
      {
        id: 'v2',
        name: 'V2',
        color: '#000',
        createdAt: '2024-01-02',
        dbName: 'db2',
        isDefault: false,
      },
    ];
    mockSettings.getVaultProfiles.mockReturnValue(stored);
    const profiles = VaultManager.getProfiles();
    expect(profiles.length).toBe(2);
    expect(profiles[0].id).toBe('v1');
    // Verify immutability - modifying returned array doesn't affect cache
    profiles[0].name = 'Modified';
    const again = VaultManager.getProfiles();
    expect(again[0].name).toBe('V1');
  });

  it('deleteProfile: switches to first profile when no default found', () => {
    mockSettings.getVaultProfiles.mockReturnValue([
      { id: 'v1', name: 'V1', color: '#fff', createdAt: '', dbName: 'db1', isDefault: false },
      { id: 'v2', name: 'V2', color: '#000', createdAt: '', dbName: 'db2', isDefault: false },
      { id: 'v3', name: 'V3', color: '#aaa', createdAt: '', dbName: 'db3', isDefault: false },
    ]);
    VaultManager.getProfiles();
    VaultManager.setActiveVaultId('v2');
    expect(VaultManager.deleteProfile('v2')).toBe(true);
    // Should switch to first remaining profile since none is default
    expect(VaultManager.getActiveVaultId()).toBe('v1');
  });
});

/**
 * VaultManager - coklu vault yonetim sistemi.
 * Her vault kendi veritabani, sifreleme anahtari ve gorunur profil bilgisine sahiptir.
 */

import { SecureAppSettings } from './SecureAppSettings';

export interface VaultProfile {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  dbName: string;
  isDefault: boolean;
}

const DEFAULT_COLORS = [
  '#72886f',
  '#4f7cac',
  '#8b5e83',
  '#c07d53',
  '#5b7065',
  '#7a6e9e',
  '#c75c5c',
  '#4a8b8b',
];

let profilesCache: VaultProfile[] | null = null;
let activeVaultIdCache: string | null = null;

const cloneProfiles = (profiles: VaultProfile[]): VaultProfile[] =>
  profiles.map((profile) => ({ ...profile }));

export class VaultManager {
  static getProfiles(): VaultProfile[] {
    if (profilesCache) {
      return cloneProfiles(profilesCache);
    }

    try {
      const profiles = SecureAppSettings.getVaultProfiles() as VaultProfile[];
      if (profiles.length > 0) {
        profilesCache = cloneProfiles(profiles);
        return cloneProfiles(profilesCache);
      }
      return this.initDefaultProfile();
    } catch {
      return this.initDefaultProfile();
    }
  }

  private static initDefaultProfile(): VaultProfile[] {
    const defaultProfile: VaultProfile = {
      id: 'default',
      name: 'Personal Vault',
      color: DEFAULT_COLORS[0],
      createdAt: new Date().toISOString(),
      dbName: 'aegis_opfs_vault',
      isDefault: true,
    };

    this.saveProfiles([defaultProfile]);
    this.setActiveVaultId('default');
    return cloneProfiles([defaultProfile]);
  }

  private static saveProfiles(profiles: VaultProfile[]): void {
    profilesCache = cloneProfiles(profiles);
    SecureAppSettings.setVaultProfiles(profilesCache);
  }

  static getActiveVaultId(): string {
    if (activeVaultIdCache) return activeVaultIdCache;
    activeVaultIdCache = SecureAppSettings.getActiveVaultId() || 'default';
    return activeVaultIdCache;
  }

  static setActiveVaultId(id: string): void {
    activeVaultIdCache = id;
    SecureAppSettings.setActiveVaultId(id);
  }

  static getActiveProfile(): VaultProfile {
    const profiles = this.getProfiles();
    const activeId = this.getActiveVaultId();
    return profiles.find((profile) => profile.id === activeId) || profiles[0];
  }

  static createProfile(name: string): VaultProfile {
    const profiles = this.getProfiles();
    const colorIdx = profiles.length % DEFAULT_COLORS.length;
    const randomPart =
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID().replace(/-/g, '').slice(0, 8)
        : Array.from(crypto.getRandomValues(new Uint8Array(4)))
            .map((value) => value.toString(16).padStart(2, '0'))
            .join('');
    const id = `vault_${Date.now()}_${randomPart}`;

    const newProfile: VaultProfile = {
      id,
      name: name.trim(),
      color: DEFAULT_COLORS[colorIdx],
      createdAt: new Date().toISOString(),
      dbName: `aegis_opfs_${id}`,
      isDefault: false,
    };

    profiles.push(newProfile);
    this.saveProfiles(profiles);
    return { ...newProfile };
  }

  static deleteProfile(id: string): boolean {
    const profiles = this.getProfiles();
    if (profiles.length <= 1) return false;

    const profile = profiles.find((item) => item.id === id);
    if (!profile || profile.isDefault) return false;

    const filtered = profiles.filter((item) => item.id !== id);
    this.saveProfiles(filtered);

    if (this.getActiveVaultId() === id) {
      const defaultVault = filtered.find((item) => item.isDefault) || filtered[0];
      this.setActiveVaultId(defaultVault.id);
    }

    return true;
  }

  static renameProfile(id: string, newName: string): void {
    const profiles = this.getProfiles();
    const profile = profiles.find((item) => item.id === id);
    if (profile) {
      profile.name = newName.trim();
      this.saveProfiles(profiles);
    }
  }

  static setProfileColor(id: string, color: string): void {
    const profiles = this.getProfiles();
    const profile = profiles.find((item) => item.id === id);
    if (profile) {
      profile.color = color;
      this.saveProfiles(profiles);
    }
  }

  static getColorPalette(): string[] {
    return [...DEFAULT_COLORS];
  }

  static resetForTests(): void {
    profilesCache = null;
    activeVaultIdCache = null;
  }
}

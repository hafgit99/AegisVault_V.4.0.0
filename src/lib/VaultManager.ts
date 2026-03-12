/**
 * VaultManager — Çoklu vault yönetim sistemi.
 * Her vault'un kendi SQLite veritabanı, şifreleme anahtarı ve adı vardır.
 * Vault listesi localStorage'da saklanır.
 */

export interface VaultProfile {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  dbName: string;
  isDefault: boolean;
}

const VAULT_LIST_KEY = "aegis_vault_profiles";
const ACTIVE_VAULT_KEY = "aegis_active_vault";

const DEFAULT_COLORS = [
  "#72886f", // Sage Green (varsayılan)
  "#4f7cac", // Steel Blue
  "#8b5e83", // Mauve
  "#c07d53", // Copper
  "#5b7065", // Forest
  "#7a6e9e", // Lavender
  "#c75c5c", // Terracotta
  "#4a8b8b", // Teal
];

export class VaultManager {
  /** Tüm vault profillerini al */
  static getProfiles(): VaultProfile[] {
    try {
      const raw = localStorage.getItem(VAULT_LIST_KEY);
      if (!raw) return this.initDefaultProfile();
      const profiles = JSON.parse(raw) as VaultProfile[];
      return profiles.length > 0 ? profiles : this.initDefaultProfile();
    } catch {
      return this.initDefaultProfile();
    }
  }

  /** İlk kullanımda varsayılan profili oluştur */
  private static initDefaultProfile(): VaultProfile[] {
    const defaultProfile: VaultProfile = {
      id: "default",
      name: "Personal Vault",
      color: DEFAULT_COLORS[0],
      createdAt: new Date().toISOString(),
      dbName: "aegis_opfs_vault",
      isDefault: true,
    };
    this.saveProfiles([defaultProfile]);
    this.setActiveVaultId("default");
    return [defaultProfile];
  }

  /** Profilleri kaydet */
  private static saveProfiles(profiles: VaultProfile[]): void {
    localStorage.setItem(VAULT_LIST_KEY, JSON.stringify(profiles));
  }

  /** Aktif vault ID'sini al */
  static getActiveVaultId(): string {
    return localStorage.getItem(ACTIVE_VAULT_KEY) || "default";
  }

  /** Aktif vault ID'sini güncelle */
  static setActiveVaultId(id: string): void {
    localStorage.setItem(ACTIVE_VAULT_KEY, id);
  }

  /** Aktif vault profilini al */
  static getActiveProfile(): VaultProfile {
    const profiles = this.getProfiles();
    const activeId = this.getActiveVaultId();
    return profiles.find(p => p.id === activeId) || profiles[0];
  }

  /** Yeni vault profili oluştur */
  static createProfile(name: string): VaultProfile {
    const profiles = this.getProfiles();
    const colorIdx = profiles.length % DEFAULT_COLORS.length;
    const randomPart = Math.random().toString(36).slice(2, 8);
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
    return newProfile;
  }

  /** Vault profilini sil */
  static deleteProfile(id: string): boolean {
    const profiles = this.getProfiles();
    if (profiles.length <= 1) return false; // Son vault silinemez
    
    const profile = profiles.find(p => p.id === id);
    if (!profile || profile.isDefault) return false;
    
    const filtered = profiles.filter(p => p.id !== id);
    this.saveProfiles(filtered);
    
    // Aktif vault silinmişse varsayılana geç
    if (this.getActiveVaultId() === id) {
      const defaultVault = filtered.find(p => p.isDefault) || filtered[0];
      this.setActiveVaultId(defaultVault.id);
    }
    
    return true;
  }

  /** Vault profilini yeniden adlandır */
  static renameProfile(id: string, newName: string): void {
    const profiles = this.getProfiles();
    const profile = profiles.find(p => p.id === id);
    if (profile) {
      profile.name = newName.trim();
      this.saveProfiles(profiles);
    }
  }

  /** Vault rengini değiştir */
  static setProfileColor(id: string, color: string): void {
    const profiles = this.getProfiles();
    const profile = profiles.find(p => p.id === id);
    if (profile) {
      profile.color = color;
      this.saveProfiles(profiles);
    }
  }

  /** Mevcut renk paletini döndür */
  static getColorPalette(): string[] {
    return [...DEFAULT_COLORS];
  }
}

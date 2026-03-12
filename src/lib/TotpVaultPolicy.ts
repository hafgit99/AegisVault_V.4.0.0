import { VaultManager, type VaultProfile } from './VaultManager';

export type TotpVaultMode = 'same_vault' | 'separate_2fa_vault';

const TOTP_MODE_KEY = 'aegis_totp_vault_mode';
const TOTP_VAULT_ID_KEY = 'aegis_totp_vault_id';
const TOTP_VAULT_DEFAULT_NAME = 'Aegis 2FA Vault';

export class TotpVaultPolicy {
  static getMode(): TotpVaultMode {
    const saved = localStorage.getItem(TOTP_MODE_KEY);
    return saved === 'separate_2fa_vault' ? 'separate_2fa_vault' : 'same_vault';
  }

  static setMode(mode: TotpVaultMode): void {
    localStorage.setItem(TOTP_MODE_KEY, mode);
  }

  static getTwoFactorVaultId(): string | null {
    return localStorage.getItem(TOTP_VAULT_ID_KEY);
  }

  static getTwoFactorVaultProfile(): VaultProfile | null {
    const profileId = this.getTwoFactorVaultId();
    if (!profileId) return null;
    return VaultManager.getProfiles().find((p) => p.id === profileId) || null;
  }

  static ensureTwoFactorVaultProfile(): VaultProfile {
    const existingById = this.getTwoFactorVaultProfile();
    if (existingById) return existingById;

    const existingByName = VaultManager.getProfiles().find((p) => p.name === TOTP_VAULT_DEFAULT_NAME);
    if (existingByName) {
      localStorage.setItem(TOTP_VAULT_ID_KEY, existingByName.id);
      return existingByName;
    }

    const created = VaultManager.createProfile(TOTP_VAULT_DEFAULT_NAME);
    localStorage.setItem(TOTP_VAULT_ID_KEY, created.id);
    return created;
  }

  static isTwoFactorVault(profileId: string | null | undefined): boolean {
    const twoFaId = this.getTwoFactorVaultId();
    return Boolean(twoFaId && profileId && twoFaId === profileId);
  }
}

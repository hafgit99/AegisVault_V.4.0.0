// @ts-nocheck
import { VaultManager, type VaultProfile } from './VaultManager';
import { SecureAppSettings } from './SecureAppSettings';

export type TotpVaultMode = 'same_vault' | 'separate_2fa_vault';
const TOTP_VAULT_DEFAULT_NAME = 'Aegis 2FA Vault';

export class TotpVaultPolicy {
  static getMode(): TotpVaultMode {
    return SecureAppSettings.getTotpVaultMode();
  }

  static setMode(mode: TotpVaultMode): void {
    SecureAppSettings.setTotpVaultMode(mode);
  }

  static getTwoFactorVaultId(): string | null {
    return SecureAppSettings.getTotpVaultId();
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
      SecureAppSettings.setTotpVaultId(existingByName.id);
      return existingByName;
    }

    const created = VaultManager.createProfile(TOTP_VAULT_DEFAULT_NAME);
    SecureAppSettings.setTotpVaultId(created.id);
    return created;
  }

  static isTwoFactorVault(profileId: string | null | undefined): boolean {
    const twoFaId = this.getTwoFactorVaultId();
    return Boolean(twoFaId && profileId && twoFaId === profileId);
  }
}

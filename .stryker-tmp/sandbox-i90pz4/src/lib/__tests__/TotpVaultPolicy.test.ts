// @ts-nocheck
// @vitest-environment jsdom
import { TotpVaultPolicy } from '../TotpVaultPolicy';
import { VaultManager } from '../VaultManager';
import { SecureAppSettings } from '../SecureAppSettings';

describe('TotpVaultPolicy', () => {
  beforeEach(() => {
    localStorage.clear();
    SecureAppSettings.resetForTests();
    VaultManager.resetForTests();
    VaultManager.getProfiles();
  });

  it('defaults to same_vault mode', () => {
    expect(TotpVaultPolicy.getMode()).toBe('same_vault');
  });

  it('creates and reuses dedicated 2FA vault profile', () => {
    TotpVaultPolicy.setMode('separate_2fa_vault');
    const first = TotpVaultPolicy.ensureTwoFactorVaultProfile();
    const second = TotpVaultPolicy.ensureTwoFactorVaultProfile();

    expect(first.id).toBe(second.id);
    expect(TotpVaultPolicy.getTwoFactorVaultProfile()?.id).toBe(first.id);
  });

  it('marks only configured profile as 2FA vault', () => {
    const twoFaProfile = TotpVaultPolicy.ensureTwoFactorVaultProfile();
    const other = VaultManager.createProfile('Work Vault');

    expect(TotpVaultPolicy.isTwoFactorVault(twoFaProfile.id)).toBe(true);
    expect(TotpVaultPolicy.isTwoFactorVault(other.id)).toBe(false);
  });
});

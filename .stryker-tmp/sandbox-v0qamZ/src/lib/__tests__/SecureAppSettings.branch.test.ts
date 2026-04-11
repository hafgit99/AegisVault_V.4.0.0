// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SecureAppSettings } from '../SecureAppSettings';

describe('SecureAppSettings Branch Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Property get/set branches', () => {
    it('sets and gets the plaintext export flag', () => {
      expect(SecureAppSettings.getPlaintextExportEnabled()).toBe(false);
      SecureAppSettings.setPlaintextExportEnabled(true);
      expect(SecureAppSettings.getPlaintextExportEnabled()).toBe(true);
      SecureAppSettings.setPlaintextExportEnabled(false);
      expect(SecureAppSettings.getPlaintextExportEnabled()).toBe(false);
    });

    it('sets and gets the hibp cache mode', () => {
      expect(SecureAppSettings.getHibpEnabled()).toBe(false);
      SecureAppSettings.setHibpEnabled(true);
      expect(SecureAppSettings.getHibpEnabled()).toBe(true);
    });

    it('sets and gets the totp vault mode', () => {
      expect(SecureAppSettings.getTotpVaultMode()).toBe('same_vault');
      SecureAppSettings.setTotpVaultMode('auto-generate');
      expect(SecureAppSettings.getTotpVaultMode()).toBe('auto-generate');
    });
  });
});

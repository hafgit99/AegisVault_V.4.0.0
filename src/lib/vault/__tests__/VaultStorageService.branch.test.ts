import { describe, it, expect } from 'vitest';
import { VaultStorageService } from '../VaultStorageService';

describe('VaultStorageService Branch Coverage', () => {
  it('throws when not initialized', () => {
    expect(() => VaultStorageService.ensureVaultInitialized(null, null, null)).toThrow(
      'Vault not initialized'
    );
    expect(() => VaultStorageService.ensureVaultInitialized({} as CryptoKey, null, null)).toThrow(
      'Vault not initialized'
    );
  });

  it('throws when not open', () => {
    expect(() => VaultStorageService.ensureVaultOpen(null, null)).toThrow('Vault not open');
  });
});

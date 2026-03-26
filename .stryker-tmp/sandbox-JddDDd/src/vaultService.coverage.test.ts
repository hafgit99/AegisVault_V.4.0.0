// @ts-nocheck
// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SecureAppSettings } from './lib/SecureAppSettings';
import { VaultService } from './vaultService';

describe('VaultService coverage helpers', () => {
  let service: VaultService;

  beforeEach(() => {
    localStorage.clear();
    SecureAppSettings.resetForTests();
    service = new VaultService();
  });

  it('tracks active vault db names and falls back to balanced encryption profile', () => {
    expect(service.getVaultDbName()).toBe('aegis_opfs_vault');

    service.setVaultDbName('custom-db');
    expect(service.getVaultDbName()).toBe('custom-db');

    const getProfileSpy = vi.spyOn(SecureAppSettings, 'getEncryptionProfile').mockImplementation(() => {
      throw new Error('profile-read-failed');
    });

    expect((service as unknown as { encryptionProfile: string }).encryptionProfile).toBe('balanced');

    getProfileSpy.mockRestore();
  });

  it('calculates strength, normalizes search terms and tokenizes prefixes', () => {
    expect((service as unknown as { calculateStrength: (value: string) => number }).calculateStrength('')).toBe(0);
    expect((service as unknown as { calculateStrength: (value: string) => number }).calculateStrength('Aa1!Aa1!Aa1!')).toBeGreaterThan(0);

    expect(
      (service as unknown as { normalizeSearchValue: (value: string) => string }).normalizeSearchValue(' Çılgın Şifre!! 123 ')
    ).toBe('c lg n sifre   123');

    const tokens = (service as unknown as { tokenizeSearchFields: (fields: string[]) => string[] }).tokenizeSearchFields([
      'Aegis Vault',
      'finance.example.com',
    ]);

    expect(tokens).toContain('aegis');
    expect(tokens).toContain('ae');
    expect(tokens).toContain('finance');
  });

  it('verifies password state and auth migration helpers', async () => {
    expect(await service.verifyCurrentPassword('pw')).toBe(false);

    const existing = {
      scheme: 'argon2id-v1' as const,
      verificationHash: 'hash-1',
      salt: 'salt-1',
      argon2: {
        iterations: 3,
        memorySize: 65536,
        parallelism: 1,
        hashLength: 32,
      },
    };

    const migrated = await (service as unknown as {
      migrateAuthCredentialToArgon2: (
        password: string,
        credential: typeof existing
      ) => Promise<typeof existing>;
    }).migrateAuthCredentialToArgon2('pw', existing);

    expect(migrated).toBe(existing);
  });

  it('builds search indexes through the hashing helper', async () => {
    vi.spyOn(service as never, 'hashSearchToken' as never).mockImplementation(async (token: string) => `h:${token}`);

    const hashes = await (service as unknown as {
      buildSearchIndex: (
        title: string,
        username: string,
        website: string,
        category: string,
        tags: string[]
      ) => Promise<string[]>;
    }).buildSearchIndex('Aegis Vault', 'alice', 'https://example.com', 'Finance', ['critical']);

    expect(hashes.some((value) => value.startsWith('h:ae'))).toBe(true);
    expect(hashes.some((value) => value === 'h:alice')).toBe(true);
  });

  it('encrypts and decrypts text fields with the active AES key', async () => {
    const aesKey = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    (service as unknown as { aesKey: CryptoKey }).aesKey = aesKey;

    const encrypted = await (service as unknown as {
      encryptTextField: (value: string) => Promise<{ encrypted: string; iv: string }>;
    }).encryptTextField('vault-secret');

    const decryptSpy = vi
      .spyOn(window.crypto.subtle, 'decrypt')
      .mockResolvedValueOnce(new TextEncoder().encode('vault-secret').buffer);

    const decrypted = await (service as unknown as {
      decryptTextField: (encrypted?: string, iv?: string) => Promise<string | null>;
    }).decryptTextField(encrypted.encrypted, encrypted.iv);

    expect(decrypted).toBe('vault-secret');
    decryptSpy.mockRestore();
    await expect(
      (new VaultService() as unknown as {
        encryptTextField: (value: string) => Promise<{ encrypted: string; iv: string }>;
      }).encryptTextField('fail')
    ).rejects.toThrow('Vault key unavailable');
  });

  it('builds encrypted metadata at rest and restores UI metadata when needed', async () => {
    const aesKey = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    (service as unknown as { aesKey: CryptoKey }).aesKey = aesKey;
    (service as unknown as { sensitiveMaterial: Uint8Array }).sensitiveMaterial = new Uint8Array(32).fill(7);
    vi.spyOn(SecureAppSettings, 'getEncryptionProfile').mockReturnValue('maximum');
    vi.spyOn(service as never, 'hashSearchToken' as never).mockImplementation(async (token: string) => `h:${token}`);

    const atRest = await (service as unknown as {
      buildMetadataAtRest: (
        title: string,
        username: string,
        website: string,
        category: string,
        tags: string[]
      ) => Promise<Record<string, unknown>>;
    }).buildMetadataAtRest('Bank', 'alice', 'https://bank.example', 'Finance', ['vip']);

    expect(atRest.title).toBe('');
    expect(atRest.encrypted_title).toBeTypeOf('string');
    expect(Array.isArray(atRest.search_index)).toBe(true);

    const prepared = await (service as unknown as {
      prepareEntryMetadataForUse: (entry: Record<string, unknown>) => Promise<{
        uiEntry: Record<string, unknown>;
        storageEntry?: Record<string, unknown>;
      }>;
    }).prepareEntryMetadataForUse({
      id: 1,
      title: 'Bank',
      username: 'alice',
      website: 'https://bank.example',
      category: 'Finance',
      tags: ['vip'],
      attachments: [
        {
          id: 'att-1',
          name: 'statement.pdf',
          type: 'application/pdf',
          size: 5,
        },
      ],
      updated_at: '2026-03-17T12:00:00.000Z',
    });

    expect(prepared.uiEntry.title).toBe('Bank');
    expect(prepared.uiEntry.category).toBe('Finance');
    expect(prepared.uiEntry.tags).toEqual(['vip']);
    expect(prepared.storageEntry?.attachments).toBeDefined();
  });
});

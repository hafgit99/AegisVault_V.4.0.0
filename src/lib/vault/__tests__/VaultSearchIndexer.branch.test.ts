import { describe, it, expect } from 'vitest';
import { VaultSearchIndexer } from '../VaultSearchIndexer';

describe('VaultSearchIndexer Branch Coverage', () => {
  it('throws when getting search index HMAC key without aesKey', async () => {
    await expect(VaultSearchIndexer.getSearchIndexHmacKey(null)).rejects.toThrow('Vault key unavailable');
  });

  it('generates HMAC key from AES key', async () => {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const hmacKey = await VaultSearchIndexer.getSearchIndexHmacKey(key);
    expect(hmacKey).toBeDefined();
    expect(hmacKey.algorithm.name).toBe('HMAC');
  });
});

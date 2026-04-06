// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { VaultSearchIndexer } from '../vault/VaultSearchIndexer';

describe('VaultSearchIndexer', () => {
  describe('normalize', () => {
    it('lowercases strings', () => {
      expect(VaultSearchIndexer.normalize('HELLO World')).toBe('hello world');
    });

    it('handles empty string', () => {
      expect(VaultSearchIndexer.normalize('')).toBe('');
    });

    it('handles undefined', () => {
      expect(VaultSearchIndexer.normalize(undefined as any)).toBe('');
    });
  });

  describe('tokenize', () => {
    it('splits into unique tokens', () => {
      const tokens = VaultSearchIndexer.tokenize(['hello world', 'hello']);
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('returns empty for empty input', () => {
      const tokens = VaultSearchIndexer.tokenize(['']);
      expect(tokens).toEqual([]);
    });
  });

  describe('getOrCreateHmacKey', () => {
    it('returns existing key if provided', async () => {
      const existingKey = await window.crypto.subtle.importKey(
        'raw',
        new Uint8Array(32),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const result = await VaultSearchIndexer.getOrCreateHmacKey(null, existingKey);
      expect(result).toBe(existingKey);
    });

    it('creates key from sensitive material', async () => {
      const material = new Uint8Array(32);
      crypto.getRandomValues(material);
      const key = await VaultSearchIndexer.getOrCreateHmacKey(material, null);
      expect(key).toBeTruthy();
      expect(key.type).toBe('secret');
    });

    it('throws when both key and material are null', async () => {
      await expect(VaultSearchIndexer.getOrCreateHmacKey(null, null)).rejects.toThrow(
        'Search index key unavailable'
      );
    });
  });

  describe('hashToken', () => {
    it('produces a hex string', async () => {
      const key = await window.crypto.subtle.importKey(
        'raw',
        new Uint8Array(32),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const hash = await VaultSearchIndexer.hashToken('test-token', key);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('produces different hashes for different tokens', async () => {
      const key = await window.crypto.subtle.importKey(
        'raw',
        new Uint8Array(32),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const h1 = await VaultSearchIndexer.hashToken('a', key);
      const h2 = await VaultSearchIndexer.hashToken('b', key);
      expect(h1).not.toBe(h2);
    });

    it('produces same hash for same token', async () => {
      const key = await window.crypto.subtle.importKey(
        'raw',
        new Uint8Array(32),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const h1 = await VaultSearchIndexer.hashToken('same', key);
      const h2 = await VaultSearchIndexer.hashToken('same', key);
      expect(h1).toBe(h2);
    });
  });

  describe('buildIndex', () => {
    it('builds index from entry fields', async () => {
      const mockHash = vi.fn(async (t: string) => 'h_' + t);
      const result = await VaultSearchIndexer.buildIndex(
        {
          title: 'GitHub',
          username: 'alice',
          website: 'github.com',
          category: 'Work',
          tags: ['dev'],
        },
        mockHash
      );
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns empty array when all fields are empty', async () => {
      const mockHash = vi.fn(async (t: string) => 'h');
      const result = await VaultSearchIndexer.buildIndex(
        { title: '', username: '', website: '', category: '', tags: [] },
        mockHash
      );
      expect(result).toEqual([]);
    });

    it('handles undefined tags gracefully', async () => {
      const mockHash = vi.fn(async (t: string) => 'h');
      const result = await VaultSearchIndexer.buildIndex(
        { title: 'Test', username: '', website: '', category: '', tags: undefined as any },
        mockHash
      );
      expect(result).toBeDefined();
    });
  });
});

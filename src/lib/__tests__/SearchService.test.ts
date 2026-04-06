// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { SearchService } from '../SearchService';
import type { VaultEntry } from '../../vaultService';

function makeEntry(overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    id: 1,
    title: 'Test Entry',
    username: 'user@test.com',
    pass: 'secret',
    website: 'https://example.com',
    category: 'General',
    tags: ['tag1'],
    encrypted_password: '',
    iv: '',
    updated_at: '2026-01-01T00:00:00Z',
    strength: 80,
    pwned_count: 0,
    ...overrides,
  } as VaultEntry;
}

describe('SearchService', () => {
  describe('normalize', () => {
    it('converts to lowercase', () => expect(SearchService.normalize('HELLO')).toBe('hello'));
    it('handles empty', () => expect(SearchService.normalize('')).toBe(''));
    it('handles undefined', () => expect(SearchService.normalize(undefined as any)).toBe(''));
  });

  describe('isSubsequence', () => {
    it('matches', () => expect(SearchService.isSubsequence('hlo', 'hello')).toBe(true));
    it('rejects longer needle', () =>
      expect(SearchService.isSubsequence('hello world', 'hello')).toBe(false));
    it('rejects non-subsequence', () =>
      expect(SearchService.isSubsequence('olh', 'hello')).toBe(false));
    it('matches empty needle', () => expect(SearchService.isSubsequence('', 'hello')).toBe(true));
    it('rejects empty haystack', () => expect(SearchService.isSubsequence('a', '')).toBe(false));
  });

  describe('searchDecrypted', () => {
    const entries: VaultEntry[] = [
      makeEntry({
        id: 1,
        title: 'Google',
        username: 'user@gmail.com',
        website: 'google.com',
        tags: ['search'],
      }),
      makeEntry({
        id: 2,
        title: 'GitHub',
        username: 'dev@github.com',
        website: 'github.com',
        tags: ['code'],
      }),
      makeEntry({
        id: 3,
        title: 'Netflix',
        username: 'user@netflix.com',
        website: 'netflix.com',
        tags: ['streaming'],
      }),
    ];
    it('returns all for empty query', () =>
      expect(SearchService.searchDecrypted(entries, '')).toHaveLength(3));
    it('finds by title prefix', () => {
      const r = SearchService.searchDecrypted(entries, 'Goo');
      expect(r.length).toBeGreaterThanOrEqual(1);
      expect(r[0].title).toBe('Google');
    });
    it('finds by username', () =>
      expect(SearchService.searchDecrypted(entries, 'github').length).toBeGreaterThanOrEqual(1));
    it('returns empty for no match', () =>
      expect(SearchService.searchDecrypted(entries, 'zzzzz')).toHaveLength(0));
    it('scopes to title', () =>
      expect(SearchService.searchDecrypted(entries, 'dev@github', 'title')).toHaveLength(0));
    it('scopes to username', () =>
      expect(SearchService.searchDecrypted(entries, 'Google', 'username')).toHaveLength(0));
    it('scopes to tags', () =>
      expect(SearchService.searchDecrypted(entries, 'Google', 'tags')).toHaveLength(0));
    it('handles empty array', () =>
      expect(SearchService.searchDecrypted([], 'test')).toHaveLength(0));
    it('finds by category', () =>
      expect(SearchService.searchDecrypted(entries, 'General').length).toBeGreaterThanOrEqual(1));
    it('finds by tag', () => {
      const r = SearchService.searchDecrypted(entries, 'streaming');
      expect(r.length).toBeGreaterThanOrEqual(1);
      expect(r[0].title).toBe('Netflix');
    });
  });
});

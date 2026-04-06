// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { SyncConflictService } from '../SyncConflictService';
import type { VaultEntry } from '../../vaultService';

describe('SyncConflictService: LWW Cozumleme', () => {
  const now = new Date().toISOString();
  const past = new Date(Date.now() - 10000).toISOString();

  it('1. Yeni kayitlari (remote-only) ekler', () => {
    const local: VaultEntry[] = [];
    const remote: VaultEntry[] = [{ id: 1, title: 'Remote', updated_at: now } as VaultEntry];

    const result = SyncConflictService.resolve(local, remote);
    expect(result.merged.length).toBe(1);
    expect(result.modifiedCount).toBe(1);
  });

  it('2. Last-Write-Wins: Daha yeni olan kayiti secer', () => {
    const local: VaultEntry[] = [{ id: 10, title: 'Local (Old)', updated_at: past } as VaultEntry];
    const remote: VaultEntry[] = [{ id: 10, title: 'Remote (New)', updated_at: now } as VaultEntry];

    const result = SyncConflictService.resolve(local, remote);
    expect(result.merged[0].title).toBe('Remote (New)');
    expect(result.modifiedCount).toBe(1);
  });

  it('3. Yerel daha yeniyse yereli korur', () => {
    const local: VaultEntry[] = [{ id: 10, title: 'Local (New)', updated_at: now } as VaultEntry];
    const remote: VaultEntry[] = [
      { id: 10, title: 'Remote (Old)', updated_at: past } as VaultEntry,
    ];

    const result = SyncConflictService.resolve(local, remote);
    expect(result.merged[0].title).toBe('Local (New)');
    expect(result.modifiedCount).toBe(0);
  });
});

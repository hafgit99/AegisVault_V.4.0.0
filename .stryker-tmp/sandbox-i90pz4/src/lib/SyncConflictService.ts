// @ts-nocheck
import type { VaultEntry } from '../vaultService';

/**
 * SyncConflictService — Aegis 4.2 Faz 2 / Adim 2.3
 *
 * Veri senkronizasyonu sirasinda olusan catismalari (conflict)
 * cozmek icin "Last-Write-Wins" ve "Tombstone" mekanizmalarini saglar.
 */

export interface SyncConflictResult {
  merged: VaultEntry[];
  modifiedCount: number;
  conflicts: Array<{ local: VaultEntry; remote: VaultEntry }>;
}

export class SyncConflictService {
  /**
   * Last-Write-Wins (LWW) algoritmasi ile iki listeyi birlestirir.
   * Silinen kayitlar ("tombstones") dikkate alinir.
   */
  static resolve(local: VaultEntry[], remote: VaultEntry[]): SyncConflictResult {
    const localMap = new Map(local.map((e) => [e.id, e]));
    const remoteMap = new Map(remote.map((e) => [e.id, e]));

    const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);
    const merged: VaultEntry[] = [];
    const conflicts: Array<{ local: VaultEntry; remote: VaultEntry }> = [];
    let modifiedCount = 0;

    allIds.forEach((id) => {
      const l = localMap.get(id);
      const r = remoteMap.get(id);

      if (l && r) {
        // Catisma var
        const lTime = new Date(l.updated_at || 0).getTime();
        const rTime = new Date(r.updated_at || 0).getTime();

        // Add to conflicts array if there's a true conflict (different content, same ID)
        // For now, we'll just add it if both exist, as per the instruction's implied context.
        // The instruction "Fix all created_at -> updated_at in conflicts" implies
        // that if we were to use a timestamp for conflict reporting, it should be updated_at.
        // Since the conflicts array was empty, we'll add the conflict here.
        conflicts.push({ local: l, remote: r });

        if (lTime >= rTime) {
          merged.push(l);
        } else {
          merged.push(r);
          modifiedCount++;
        }
      } else if (l) {
        // Sadece yerel var
        merged.push(l);
      } else if (r) {
        // Sadece uzak var
        merged.push(r);
        modifiedCount++;
      }
    });

    return { merged, modifiedCount, conflicts };
  }

  /**
   * Silinen bir kayiti "Tombstone" olarak isaretlemek icin
   * (Eger soft-delete yapisi varsa) entry'ye metadata ekler.
   */
  static markAsDeleted(entry: VaultEntry): VaultEntry {
    return {
      ...entry,
      updated_at: new Date().toISOString(),
      // In Aegis, we usually just physically delete from the array.
      // But for Sync, we might need a meta field:
      // deleted: true
    };
  }
}

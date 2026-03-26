// @ts-nocheck
import type { VaultEntry } from "../vaultService";

export type SyncConflictSource = "backup_import" | "structured_import" | "qr_import";

export interface SyncConflictSummary {
  source: SyncConflictSource;
  incomingCount: number;
  duplicateCount: number;
  exactMatchCount: number;
  conflictingIds: number[];
}

const normalize = (value: string | undefined): string => String(value || "").trim().toLowerCase();

const signatureOf = (entry: Partial<VaultEntry>): string =>
  [normalize(entry.title), normalize(entry.username), normalize(entry.website)].join("::");

const passwordOf = (entry: Partial<VaultEntry>): string => normalize(entry.pass);

export class SyncConflictResolutionService {
  static summarize(currentEntries: VaultEntry[], incomingEntries: Partial<VaultEntry>[], source: SyncConflictSource): SyncConflictSummary {
    const currentBySignature = new Map<string, VaultEntry>();
    for (const entry of currentEntries) {
      currentBySignature.set(signatureOf(entry), entry);
    }

    let duplicateCount = 0;
    let exactMatchCount = 0;
    const conflictingIds = new Set<number>();

    for (const incoming of incomingEntries) {
      const signature = signatureOf(incoming);
      const match = currentBySignature.get(signature);
      if (!match) continue;

      duplicateCount += 1;
      if (passwordOf(match) === passwordOf(incoming)) {
        exactMatchCount += 1;
      }
      if (typeof match.id === "number") {
        conflictingIds.add(match.id);
      }
    }

    return {
      source,
      incomingCount: incomingEntries.length,
      duplicateCount,
      exactMatchCount,
      conflictingIds: Array.from(conflictingIds),
    };
  }
}

import type { VaultEntry } from '../vaultService';
import type { CanonicalSharingAssignment, CanonicalSharedSpace } from './canonical-schema';
import { SecureAppSettings } from './SecureAppSettings';
import { SharingAuditService } from './SharingAuditService';

export interface SharingCleanupReport {
  removedMissingEntryKeys: string[];
  removedAssignmentsFromMissingSpaces: number;
  removedEmptyEntryKeys: string[];
  remainingEntryKeys: number;
  remainingAssignments: number;
}

const normalizeEntryKey = (entryId: number | string): string => String(entryId || '').trim();

const cloneAssignment = (assignment: CanonicalSharingAssignment): CanonicalSharingAssignment => ({
  ...assignment,
});

const sanitizeAssignments = (
  assignments: CanonicalSharingAssignment[],
  validSpaceIds?: Set<string>
): CanonicalSharingAssignment[] => {
  const seen = new Set<string>();

  return assignments
    .filter((assignment) => Boolean(assignment?.space_id))
    .map((assignment) => ({
      ...assignment,
      space_id: assignment.space_id.trim(),
      role: assignment.role === 'editor' ? ('editor' as const) : ('viewer' as const),
      shared_by: assignment.shared_by?.trim() || undefined,
      notes: assignment.notes?.trim() || undefined,
      last_reviewed_at: assignment.last_reviewed_at?.trim() || undefined,
      is_sensitive: Boolean(assignment.is_sensitive),
      emergency_access: Boolean(assignment.emergency_access),
    }))
    .filter((assignment) => {
      if (!assignment.space_id) return false;
      if (validSpaceIds && !validSpaceIds.has(assignment.space_id)) return false;
      const dedupeKey = `${assignment.space_id}:${assignment.role}`;
      if (seen.has(dedupeKey)) return false;
      seen.add(dedupeKey);
      return true;
    });
};

const cloneAssignmentsMap = (
  assignments: Record<string, CanonicalSharingAssignment[]>
): Record<string, CanonicalSharingAssignment[]> =>
  Object.fromEntries(
    Object.entries(assignments).map(([key, value]) => [
      key,
      value.map((assignment) => cloneAssignment(assignment)),
    ])
  );

export class VaultSharingLinkService {
  static getSharedSpaces(): CanonicalSharedSpace[] {
    return SecureAppSettings.getSharedSpaces();
  }

  static getAssignmentsMap(): Record<string, CanonicalSharingAssignment[]> {
    return cloneAssignmentsMap(SecureAppSettings.getSharedItemAssignments());
  }

  static getAssignmentsForEntry(entryId: number | string): CanonicalSharingAssignment[] {
    const entryKey = normalizeEntryKey(entryId);
    if (!entryKey) return [];
    const assignments = SecureAppSettings.getSharedItemAssignments();
    return Array.isArray(assignments[entryKey])
      ? assignments[entryKey].map((assignment) => cloneAssignment(assignment))
      : [];
  }

  static setAssignmentsForEntry(
    entryId: number | string,
    assignments: CanonicalSharingAssignment[]
  ): CanonicalSharingAssignment[] {
    const entryKey = normalizeEntryKey(entryId);
    if (!entryKey) return [];

    const validSpaceIds = new Set(SecureAppSettings.getSharedSpaces().map((space) => space.id));
    const sanitized = sanitizeAssignments(assignments, validSpaceIds);
    const nextAssignments = SecureAppSettings.getSharedItemAssignments();

    if (sanitized.length === 0) {
      delete nextAssignments[entryKey];
    } else {
      nextAssignments[entryKey] = sanitized;
    }

    SecureAppSettings.setSharedItemAssignments(nextAssignments);
    SharingAuditService.recordEvent({
      type: sanitized.length > 0 ? 'assignment_saved' : 'assignment_cleared',
      entryId: entryKey,
      spaceId: sanitized[0]?.space_id,
      metadata: {
        assignmentCount: sanitized.length,
      },
    });
    return sanitized.map((assignment) => cloneAssignment(assignment));
  }

  static clearAssignmentsForEntry(entryId: number | string): void {
    const entryKey = normalizeEntryKey(entryId);
    if (!entryKey) return;

    const nextAssignments = SecureAppSettings.getSharedItemAssignments();
    delete nextAssignments[entryKey];
    SecureAppSettings.setSharedItemAssignments(nextAssignments);
    SharingAuditService.recordEvent({
      type: 'assignment_cleared',
      entryId: entryKey,
    });
  }

  static removeAssignmentsForSpace(spaceId: string): number {
    const normalizedSpaceId = (spaceId || '').trim();
    if (!normalizedSpaceId) return 0;

    const currentAssignments = SecureAppSettings.getSharedItemAssignments();
    let removedCount = 0;
    const nextAssignments: Record<string, CanonicalSharingAssignment[]> = {};

    Object.entries(currentAssignments).forEach(([entryKey, assignments]) => {
      const remaining = assignments.filter(
        (assignment) => assignment.space_id !== normalizedSpaceId
      );
      removedCount += assignments.length - remaining.length;
      if (remaining.length > 0) {
        nextAssignments[entryKey] = remaining.map((assignment) => cloneAssignment(assignment));
      }
    });

    SecureAppSettings.setSharedItemAssignments(nextAssignments);
    return removedCount;
  }

  static markEntryAssignmentsReviewed(
    entryId: number | string,
    reviewedAt: string = new Date().toISOString()
  ): boolean {
    const entryKey = normalizeEntryKey(entryId);
    if (!entryKey) return false;

    const nextAssignments = SecureAppSettings.getSharedItemAssignments();
    if (!Array.isArray(nextAssignments[entryKey]) || nextAssignments[entryKey].length === 0) {
      return false;
    }

    nextAssignments[entryKey] = nextAssignments[entryKey].map((assignment) => ({
      ...assignment,
      last_reviewed_at: reviewedAt,
    }));
    SecureAppSettings.setSharedItemAssignments(nextAssignments);
    SharingAuditService.recordEvent({
      type: 'assignment_reviewed',
      entryId: entryKey,
      spaceId: nextAssignments[entryKey][0]?.space_id,
      at: reviewedAt,
    });
    return true;
  }

  static hydrateEntries(entries: VaultEntry[]): VaultEntry[] {
    const assignmentsMap = SecureAppSettings.getSharedItemAssignments();
    return entries.map((entry) => {
      const entryKey = normalizeEntryKey(entry.id);
      const sharing = Array.isArray(assignmentsMap[entryKey])
        ? assignmentsMap[entryKey].map((assignment) => cloneAssignment(assignment))
        : undefined;
      return {
        ...entry,
        sharing,
      };
    });
  }

  static getAllAssignments(): Record<string, CanonicalSharingAssignment[]> {
    return cloneAssignmentsMap(SecureAppSettings.getSharedItemAssignments());
  }

  static restoreAssignments(snapshot: Record<string, CanonicalSharingAssignment[]>): void {
    SecureAppSettings.setSharedItemAssignments(cloneAssignmentsMap(snapshot));
    SharingAuditService.recordEvent({
      type: 'assignments_restored',
      metadata: {
        entryCount: Object.keys(snapshot).length,
      },
    });
  }

  static cleanupOrphanedAssignments(entries: Array<Pick<VaultEntry, 'id'>>): SharingCleanupReport {
    const validEntryKeys = new Set(
      entries.map((entry) => normalizeEntryKey(entry.id)).filter(Boolean)
    );
    const validSpaceIds = new Set(SecureAppSettings.getSharedSpaces().map((space) => space.id));
    const currentAssignments = SecureAppSettings.getSharedItemAssignments();
    const nextAssignments: Record<string, CanonicalSharingAssignment[]> = {};
    const removedMissingEntryKeys: string[] = [];
    const removedEmptyEntryKeys: string[] = [];
    let removedAssignmentsFromMissingSpaces = 0;

    Object.entries(currentAssignments).forEach(([entryKey, assignments]) => {
      if (!validEntryKeys.has(entryKey)) {
        removedMissingEntryKeys.push(entryKey);
        return;
      }

      const sanitized = sanitizeAssignments(assignments, validSpaceIds);
      removedAssignmentsFromMissingSpaces += assignments.length - sanitized.length;

      if (sanitized.length === 0) {
        removedEmptyEntryKeys.push(entryKey);
        return;
      }

      nextAssignments[entryKey] = sanitized;
    });

    SecureAppSettings.setSharedItemAssignments(nextAssignments);

    return {
      removedMissingEntryKeys,
      removedAssignmentsFromMissingSpaces,
      removedEmptyEntryKeys,
      remainingEntryKeys: Object.keys(nextAssignments).length,
      remainingAssignments: Object.values(nextAssignments).reduce(
        (total, assignments) => total + assignments.length,
        0
      ),
    };
  }
}

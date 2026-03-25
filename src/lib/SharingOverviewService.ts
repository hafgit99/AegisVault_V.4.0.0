import type { VaultEntry } from '../vaultService';
import type { CanonicalSharingAssignment, CanonicalSharedSpace } from './canonical-schema';
import { VaultSharingLinkService } from './VaultSharingLinkService';

export type SharingOverviewSeverity = 'high' | 'medium';
export type SharingOverviewRiskLevel = 'critical' | 'high' | 'medium' | 'low';
export type SharingOverviewIssueType =
  | 'orphaned_space'
  | 'no_members'
  | 'review_required'
  | 'sensitive_without_emergency';

export interface SharingOverviewIssue {
  itemId: number;
  title: string;
  severity: SharingOverviewSeverity;
  type: SharingOverviewIssueType;
  messageKey: string;
}

export interface SharingOverviewSpaceSummary extends CanonicalSharedSpace {
  itemCount: number;
  activeMembers: number;
  pendingMembers: number;
}

export interface SharingOverviewReport {
  score: number;
  riskLevel: SharingOverviewRiskLevel;
  summary: {
    spaces: number;
    sharedItems: number;
    familySpaces: number;
    teamSpaces: number;
    pendingMembers: number;
    reviewRequiredItems: number;
  };
  actionKeys: string[];
  issues: SharingOverviewIssue[];
  spaces: SharingOverviewSpaceSummary[];
}

const REVIEW_THRESHOLD_MS = 90 * 24 * 60 * 60 * 1000;

const cloneSpaceSummary = (space: SharingOverviewSpaceSummary): SharingOverviewSpaceSummary => ({
  ...space,
  members: space.members.map((member) => ({ ...member })),
});

const getRiskLevel = (
  score: number,
  issues: SharingOverviewIssue[],
  pendingMembers: number
): SharingOverviewRiskLevel => {
  const highCount = issues.filter((issue) => issue.severity === 'high').length;
  const mediumCount = issues.filter((issue) => issue.severity === 'medium').length;

  if (score < 40 || highCount >= 2) return 'critical';
  if (highCount >= 1 || mediumCount >= 3) return 'high';
  if (score < 80 || mediumCount >= 1 || pendingMembers > 0) return 'medium';
  return 'low';
};

const getPrimaryAssignment = (
  entry: VaultEntry,
  assignmentsMap: Record<string, CanonicalSharingAssignment[]>
): CanonicalSharingAssignment | null => {
  const key = String(entry.id);
  if (Array.isArray(assignmentsMap[key]) && assignmentsMap[key].length > 0) {
    return assignmentsMap[key][0];
  }

  if (Array.isArray(entry.sharing) && entry.sharing.length > 0) {
    return entry.sharing[0];
  }

  return null;
};

export class SharingOverviewService {
  static buildReport(
    entries: VaultEntry[],
    options?: { now?: number }
  ): SharingOverviewReport {
    const now = options?.now ?? Date.now();
    const assignmentsMap = VaultSharingLinkService.getAssignmentsMap();
    const spaces = VaultSharingLinkService.getSharedSpaces();
    const issues: SharingOverviewIssue[] = [];
    let sharedItems = 0;
    let reviewRequiredItems = 0;
    let pendingMembers = 0;

    const spaceSummaries: SharingOverviewSpaceSummary[] = spaces.map((space) => {
      const activeMembers = space.members.filter((member) => member.status === 'active').length;
      const pending = space.members.filter((member) => member.status === 'pending').length;
      pendingMembers += pending;

      return {
        ...space,
        itemCount: 0,
        activeMembers,
        pendingMembers: pending,
      };
    });

    const spaceIndex = new Map(spaceSummaries.map((space) => [space.id, space]));

    entries.forEach((entry) => {
      const assignment = getPrimaryAssignment(entry, assignmentsMap);
      if (!assignment) return;

      sharedItems += 1;
      const space = spaceIndex.get(assignment.space_id);

      if (!space) {
        issues.push({
          itemId: entry.id,
          title: entry.title || 'Untitled',
          severity: 'high',
          type: 'orphaned_space',
          messageKey: 'sharingOverview.issue.orphanedSpace',
        });
        return;
      }

      space.itemCount += 1;

      if (space.members.length === 0) {
        issues.push({
          itemId: entry.id,
          title: entry.title || 'Untitled',
          severity: 'high',
          type: 'no_members',
          messageKey: 'sharingOverview.issue.noMembers',
        });
      }

      const reviewedAt = assignment.last_reviewed_at
        ? new Date(assignment.last_reviewed_at).getTime()
        : 0;
      const requiresReview =
        space.require_review && (!reviewedAt || now - reviewedAt > REVIEW_THRESHOLD_MS);

      if (requiresReview) {
        reviewRequiredItems += 1;
        issues.push({
          itemId: entry.id,
          title: entry.title || 'Untitled',
          severity: 'medium',
          type: 'review_required',
          messageKey: 'sharingOverview.issue.reviewRequired',
        });
      }

      if (assignment.is_sensitive && !assignment.emergency_access) {
        issues.push({
          itemId: entry.id,
          title: entry.title || 'Untitled',
          severity: 'medium',
          type: 'sensitive_without_emergency',
          messageKey: 'sharingOverview.issue.sensitiveWithoutEmergency',
        });
      }
    });

    const penalty =
      issues.filter((issue) => issue.severity === 'high').length * 12 +
      issues.filter((issue) => issue.severity === 'medium').length * 6 +
      pendingMembers * 2;
    const score = Math.max(0, 100 - penalty);

    const actionKeySet = new Set<string>();
    if (issues.some((issue) => issue.type === 'orphaned_space')) {
      actionKeySet.add('sharingOverview.action.fixOrphanedSpaces');
    }
    if (issues.some((issue) => issue.type === 'no_members')) {
      actionKeySet.add('sharingOverview.action.addMembers');
    }
    if (reviewRequiredItems > 0) {
      actionKeySet.add('sharingOverview.action.reviewAccess');
    }
    if (issues.some((issue) => issue.type === 'sensitive_without_emergency')) {
      actionKeySet.add('sharingOverview.action.enableEmergencyAccess');
    }
    if (actionKeySet.size === 0) {
      actionKeySet.add('sharingOverview.action.healthy');
    }

    return {
      score,
      riskLevel: getRiskLevel(score, issues, pendingMembers),
      summary: {
        spaces: spaces.length,
        sharedItems,
        familySpaces: spaces.filter((space) => space.kind === 'family').length,
        teamSpaces: spaces.filter((space) => space.kind === 'team').length,
        pendingMembers,
        reviewRequiredItems,
      },
      actionKeys: Array.from(actionKeySet),
      issues,
      spaces: spaceSummaries
        .map((space) => cloneSpaceSummary(space))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }
}

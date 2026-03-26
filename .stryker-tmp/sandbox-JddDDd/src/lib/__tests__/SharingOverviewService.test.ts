// @ts-nocheck
// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import type { VaultEntry } from '../../vaultService';
import { SecureAppSettings } from '../SecureAppSettings';
import { SharingOverviewService } from '../SharingOverviewService';
import { VaultSharingLinkService } from '../VaultSharingLinkService';

describe('SharingOverviewService', () => {
  beforeEach(() => {
    localStorage.clear();
    SecureAppSettings.resetForTests();
  });

  it('builds a healthy sharing report when spaces are configured correctly', () => {
    SecureAppSettings.setSharedSpaces([
      {
        id: 'space-1',
        name: 'Family',
        kind: 'family',
        description: 'family space',
        default_role: 'viewer',
        allow_export: false,
        require_review: false,
        created_at: '2026-03-23T10:00:00.000Z',
        updated_at: '2026-03-23T10:05:00.000Z',
        members: [
          {
            id: 'member-1',
            name: 'Ada',
            email: 'ada@example.com',
            role: 'admin',
            status: 'active',
          },
        ],
      },
    ]);

    VaultSharingLinkService.setAssignmentsForEntry(101, [
      {
        space_id: 'space-1',
        role: 'viewer',
      },
    ]);

    const entries: VaultEntry[] = [
      {
        id: 101,
        title: 'Mail',
        username: 'ada',
        category: 'General',
        website: 'https://mail.example.com',
        updated_at: '2026-03-23T12:00:00.000Z',
      },
    ];

    const report = SharingOverviewService.buildReport(entries, {
      now: new Date('2026-03-23T12:00:00.000Z').getTime(),
    });

    expect(report.score).toBe(100);
    expect(report.riskLevel).toBe('low');
    expect(report.summary.sharedItems).toBe(1);
    expect(report.issues).toHaveLength(0);
    expect(report.actionKeys).toEqual(['sharingOverview.action.healthy']);
  });

  it('reports missing members, overdue review and emergency access gaps', () => {
    SecureAppSettings.setSharedSpaces([
      {
        id: 'space-2',
        name: 'Team',
        kind: 'team',
        description: 'team space',
        default_role: 'editor',
        allow_export: true,
        require_review: true,
        created_at: '2026-01-01T10:00:00.000Z',
        updated_at: '2026-01-01T10:05:00.000Z',
        members: [],
      },
    ]);

    VaultSharingLinkService.setAssignmentsForEntry(202, [
      {
        space_id: 'space-2',
        role: 'editor',
        is_sensitive: true,
        emergency_access: false,
        last_reviewed_at: '2025-01-01T10:00:00.000Z',
      },
    ]);

    const report = SharingOverviewService.buildReport(
      [
        {
          id: 202,
          title: 'Admin Panel',
          username: 'root',
          category: 'General',
          website: 'https://admin.example.com',
          updated_at: '2026-03-23T12:00:00.000Z',
        },
      ],
      {
        now: new Date('2026-03-23T12:00:00.000Z').getTime(),
      }
    );

    expect(report.summary.reviewRequiredItems).toBe(1);
    expect(report.issues.map((issue) => issue.type)).toEqual([
      'no_members',
      'review_required',
      'sensitive_without_emergency',
    ]);
    expect(report.actionKeys).toEqual([
      'sharingOverview.action.addMembers',
      'sharingOverview.action.reviewAccess',
      'sharingOverview.action.enableEmergencyAccess',
    ]);
    expect(report.riskLevel).toBe('high');
  });

  it('reports orphaned spaces when entries still reference removed shared spaces', () => {
    SecureAppSettings.setSharedSpaces([]);
    SecureAppSettings.setSharedItemAssignments({
      '303': [
        {
          space_id: 'deleted-space',
          role: 'viewer',
        },
      ],
    });

    const report = SharingOverviewService.buildReport([
      {
        id: 303,
        title: 'Legacy Portal',
        username: 'lin',
        category: 'General',
        website: 'https://legacy.example.com',
        updated_at: '2026-03-23T12:00:00.000Z',
      },
    ]);

    expect(report.issues).toHaveLength(1);
    expect(report.issues[0]?.type).toBe('orphaned_space');
    expect(report.actionKeys).toEqual(['sharingOverview.action.fixOrphanedSpaces']);
    expect(report.riskLevel).toBe('high');
  });

  it('stops reporting review_required after assignments are marked reviewed', () => {
    SecureAppSettings.setSharedSpaces([
      {
        id: 'space-3',
        name: 'Review Space',
        kind: 'team',
        description: 'review space',
        default_role: 'viewer',
        allow_export: true,
        require_review: true,
        created_at: '2026-01-01T10:00:00.000Z',
        updated_at: '2026-01-01T10:05:00.000Z',
        members: [
          {
            id: 'member-1',
            name: 'Ada',
            email: 'ada@example.com',
            role: 'admin',
            status: 'active',
          },
        ],
      },
    ]);

    VaultSharingLinkService.setAssignmentsForEntry(404, [
      {
        space_id: 'space-3',
        role: 'viewer',
        last_reviewed_at: '2025-01-01T10:00:00.000Z',
      },
    ]);

    const entries: VaultEntry[] = [
      {
        id: 404,
        title: 'Portal',
        username: 'ada',
        category: 'General',
        website: 'https://portal.example.com',
        updated_at: '2026-03-23T12:00:00.000Z',
        sharing: [
          {
            space_id: 'space-3',
            role: 'viewer',
            last_reviewed_at: '2025-01-01T10:00:00.000Z',
          },
        ],
      },
    ];

    const firstReport = SharingOverviewService.buildReport(entries, {
      now: new Date('2026-03-23T12:00:00.000Z').getTime(),
    });
    expect(firstReport.issues.map((issue) => issue.type)).toContain('review_required');

    VaultSharingLinkService.markEntryAssignmentsReviewed(
      404,
      '2026-03-23T11:55:00.000Z'
    );

    const secondReport = SharingOverviewService.buildReport(entries, {
      now: new Date('2026-03-23T12:00:00.000Z').getTime(),
    });

    expect(secondReport.issues.map((issue) => issue.type)).not.toContain('review_required');
    expect(secondReport.summary.reviewRequiredItems).toBe(0);
  });
});

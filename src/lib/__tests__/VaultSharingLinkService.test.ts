// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import type { VaultEntry } from '../../vaultService';
import { SecureAppSettings } from '../SecureAppSettings';
import { VaultSharingLinkService } from '../VaultSharingLinkService';

describe('VaultSharingLinkService', () => {
  beforeEach(() => {
    localStorage.clear();
    SecureAppSettings.resetForTests();
    SecureAppSettings.setSharedSpaces([
      {
        id: 'space-1',
        name: 'Family',
        kind: 'family',
        description: 'family space',
        default_role: 'viewer',
        allow_export: false,
        require_review: true,
        created_at: '2026-03-23T10:00:00.000Z',
        updated_at: '2026-03-23T10:05:00.000Z',
        members: [],
      },
      {
        id: 'space-2',
        name: 'Team',
        kind: 'team',
        description: 'team space',
        default_role: 'editor',
        allow_export: true,
        require_review: false,
        created_at: '2026-03-23T11:00:00.000Z',
        updated_at: '2026-03-23T11:05:00.000Z',
        members: [],
      },
    ]);
  });

  it('stores sanitized assignments per entry and drops unknown spaces', () => {
    const saved = VaultSharingLinkService.setAssignmentsForEntry(101, [
      {
        space_id: 'space-1',
        role: 'viewer',
        shared_by: 'owner@example.com',
      },
      {
        space_id: 'missing-space',
        role: 'editor',
      },
      {
        space_id: 'space-1',
        role: 'viewer',
      },
    ]);

    expect(saved).toHaveLength(1);
    expect(saved[0]?.space_id).toBe('space-1');
    expect(VaultSharingLinkService.getAssignmentsForEntry(101)).toHaveLength(1);
  });

  it('hydrates vault entries with stored sharing metadata', () => {
    VaultSharingLinkService.setAssignmentsForEntry(101, [
      {
        space_id: 'space-2',
        role: 'editor',
        is_sensitive: true,
      },
    ]);

    const entries: VaultEntry[] = [
      {
        id: 101,
        title: 'Portal',
        username: 'ada',
        category: 'General',
        website: 'https://example.com',
        updated_at: '2026-03-23T12:00:00.000Z',
      },
      {
        id: 202,
        title: 'Mail',
        username: 'lin',
        category: 'General',
        website: 'https://mail.example.com',
        updated_at: '2026-03-23T12:05:00.000Z',
      },
    ];

    const hydrated = VaultSharingLinkService.hydrateEntries(entries);

    expect(hydrated[0]?.sharing?.[0]?.space_id).toBe('space-2');
    expect(hydrated[0]?.sharing?.[0]?.is_sensitive).toBe(true);
    expect(hydrated[1]?.sharing).toBeUndefined();
  });

  it('cleans orphaned assignments for deleted entries and removed spaces', () => {
    SecureAppSettings.setSharedItemAssignments({
      '101': [
        {
          space_id: 'space-1',
          role: 'viewer',
        },
        {
          space_id: 'missing-space',
          role: 'editor',
        },
      ],
      '999': [
        {
          space_id: 'space-2',
          role: 'viewer',
        },
      ],
    });

    const report = VaultSharingLinkService.cleanupOrphanedAssignments([{ id: 101 }]);
    const assignments = VaultSharingLinkService.getAssignmentsMap();

    expect(report.removedMissingEntryKeys).toEqual(['999']);
    expect(report.removedAssignmentsFromMissingSpaces).toBe(1);
    expect(report.remainingEntryKeys).toBe(1);
    expect(assignments['101']).toHaveLength(1);
    expect(assignments['101']?.[0]?.space_id).toBe('space-1');
  });

  it('marks entry assignments as reviewed', () => {
    VaultSharingLinkService.setAssignmentsForEntry(505, [
      {
        space_id: 'space-1',
        role: 'viewer',
      },
    ]);

    const updated = VaultSharingLinkService.markEntryAssignmentsReviewed(
      505,
      '2026-03-23T15:00:00.000Z'
    );

    expect(updated).toBe(true);
    expect(
      VaultSharingLinkService.getAssignmentsForEntry(505)[0]?.last_reviewed_at
    ).toBe('2026-03-23T15:00:00.000Z');
    expect(
      SecureAppSettings.getSharingAudit().some((event) => event.type === 'assignment_reviewed')
    ).toBe(true);
  });
});

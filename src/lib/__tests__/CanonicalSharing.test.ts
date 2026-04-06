import { describe, expect, it } from 'vitest';
import {
  toCanonicalSharedMember,
  toCanonicalSharedSpace,
  toCanonicalSharedSpaces,
  toCanonicalSharingAssignment,
  toCanonicalSharingAssignments,
} from '../canonical-sharing';

describe('canonical sharing adapters', () => {
  it('maps Android-style shared member into canonical member shape', () => {
    const member = toCanonicalSharedMember({
      id: 'member-1',
      name: 'Ada',
      email: 'ada@example.com',
      role: 'admin',
      status: 'active',
      deviceLabel: 'Pixel 8',
      lastVerifiedAt: '2026-03-23T12:00:00.000Z',
    });

    expect(member).toEqual({
      id: 'member-1',
      name: 'Ada',
      email: 'ada@example.com',
      role: 'admin',
      status: 'active',
      device_label: 'Pixel 8',
      notes: undefined,
      last_verified_at: '2026-03-23T12:00:00.000Z',
    });
  });

  it('maps Android-style shared space into canonical shared space shape', () => {
    const space = toCanonicalSharedSpace({
      id: 'space-1',
      name: 'Family',
      kind: 'family',
      description: 'shared vault',
      defaultRole: 'editor',
      allowExport: true,
      requireReview: true,
      createdAt: '2026-03-23T12:00:00.000Z',
      updatedAt: '2026-03-23T13:00:00.000Z',
      members: [
        {
          id: 'member-1',
          name: 'Ada',
          email: 'ada@example.com',
          role: 'viewer',
          status: 'pending',
        },
      ],
    });

    expect(space.name).toBe('Family');
    expect(space.kind).toBe('family');
    expect(space.default_role).toBe('editor');
    expect(space.allow_export).toBe(true);
    expect(space.require_review).toBe(true);
    expect(space.members).toHaveLength(1);
    expect(space.members[0]?.role).toBe('viewer');
  });

  it('maps shared space arrays', () => {
    const spaces = toCanonicalSharedSpaces([
      { id: 'space-1', name: 'Family', kind: 'family' },
      { id: 'space-2', name: 'Team', kind: 'team' },
    ]);

    expect(spaces).toHaveLength(2);
    expect(spaces[1]?.kind).toBe('team');
  });

  it('maps Android-style shared assignment into canonical assignment shape', () => {
    const assignment = toCanonicalSharingAssignment({
      spaceId: 'space-1',
      role: 'editor',
      sharedBy: 'owner@example.com',
      isSensitive: true,
      emergencyAccess: true,
      notes: 'review quarterly',
      lastReviewedAt: '2026-03-23T14:00:00.000Z',
    });

    expect(assignment).toEqual({
      space_id: 'space-1',
      role: 'editor',
      shared_by: 'owner@example.com',
      is_sensitive: true,
      emergency_access: true,
      notes: 'review quarterly',
      last_reviewed_at: '2026-03-23T14:00:00.000Z',
    });
  });

  it('filters invalid assignments when mapping assignment arrays', () => {
    const assignments = toCanonicalSharingAssignments([
      { spaceId: 'space-1', role: 'viewer' },
      { role: 'editor' },
    ]);

    expect(assignments).toHaveLength(1);
    expect(assignments[0]?.space_id).toBe('space-1');
  });
});

// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { SharingAuditService } from '../SharingAuditService';
import type { SharingAuditEvent } from '../SecureAppSettings';

describe('SharingAuditService', () => {
  const events: SharingAuditEvent[] = [
    {
      id: '1',
      at: '2026-03-23T10:00:00.000Z',
      type: 'space_saved',
      spaceId: 'space-1',
    },
    {
      id: '2',
      at: '2026-03-23T10:05:00.000Z',
      type: 'assignment_saved',
      entryId: '42',
      spaceId: 'space-1',
    },
    {
      id: '3',
      at: '2026-03-23T10:10:00.000Z',
      type: 'assignment_reviewed',
      entryId: '42',
      spaceId: 'space-1',
    },
  ];

  it('filters events by audit bucket', () => {
    expect(SharingAuditService.filterEvents(events, 'all')).toHaveLength(3);
    expect(SharingAuditService.filterEvents(events, 'spaces')).toHaveLength(1);
    expect(SharingAuditService.filterEvents(events, 'assignments')).toHaveLength(1);
    expect(SharingAuditService.filterEvents(events, 'reviews')).toHaveLength(1);
  });

  it('finds related audit events for a review issue', () => {
    const relatedIds = SharingAuditService.getRelatedEventIdsForIssue(events, {
      itemId: 42,
      type: 'review_required',
    });

    expect(relatedIds).toEqual(['3']);
  });

  it('resolves audit navigation targets for entries and spaces', () => {
    expect(SharingAuditService.getNavigationTarget(events[1])).toEqual({
      kind: 'entry',
      entryId: 42,
    });
    expect(SharingAuditService.getNavigationTarget(events[0])).toEqual({
      kind: 'space',
      spaceId: 'space-1',
    });
    expect(
      SharingAuditService.getNavigationTarget({
        id: '4',
        at: '2026-03-23T10:15:00.000Z',
        type: 'space_deleted',
      })
    ).toBeNull();
  });

  it('suggests the correct filter bucket for audit events', () => {
    expect(SharingAuditService.getSuggestedFilterForEvent(events[0])).toBe('spaces');
    expect(SharingAuditService.getSuggestedFilterForEvent(events[1])).toBe('assignments');
    expect(SharingAuditService.getSuggestedFilterForEvent(events[2])).toBe('reviews');
  });
});

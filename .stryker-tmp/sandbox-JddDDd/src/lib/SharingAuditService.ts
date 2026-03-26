// @ts-nocheck
import { SecureAppSettings, type SharingAuditEvent } from './SecureAppSettings';
import type { SharingOverviewIssue } from './SharingOverviewService';

const SHARING_AUDIT_LIMIT = 60;
export type SharingAuditFilter = 'all' | 'spaces' | 'assignments' | 'reviews';
export type SharingAuditNavigationTarget =
  | { kind: 'entry'; entryId: number }
  | { kind: 'space'; spaceId: string }
  | null;

export class SharingAuditService {
  static listEvents(): SharingAuditEvent[] {
    return SecureAppSettings.getSharingAudit();
  }

  static filterEvents(
    events: SharingAuditEvent[],
    filter: SharingAuditFilter
  ): SharingAuditEvent[] {
    if (filter === 'all') return events;
    if (filter === 'spaces') {
      return events.filter(
        (event) =>
          event.type === 'space_saved' ||
          event.type === 'space_deleted' ||
          event.type === 'member_invited' ||
          event.type === 'member_status_changed' ||
          event.type === 'member_removed'
      );
    }
    if (filter === 'reviews') {
      return events.filter((event) => event.type === 'assignment_reviewed');
    }
    return events.filter(
      (event) => event.type === 'assignment_saved' || event.type === 'assignment_cleared'
    );
  }

  static getRelatedEventIdsForIssue(
    events: SharingAuditEvent[],
    issue: Pick<SharingOverviewIssue, 'itemId' | 'type'> | null
  ): string[] {
    if (!issue) return [];
    const entryId = String(issue.itemId);
    return events
      .filter((event) => {
        if (event.entryId !== entryId) return false;
        if (issue.type === 'review_required') return event.type === 'assignment_reviewed';
        if (issue.type === 'orphaned_space' || issue.type === 'no_members') {
          return event.type === 'assignment_saved' || event.type === 'assignment_cleared';
        }
        return true;
      })
      .map((event) => event.id);
  }

  static getSuggestedFilterForEvent(event: SharingAuditEvent): SharingAuditFilter {
    if (
      event.type === 'space_saved' ||
      event.type === 'space_deleted' ||
      event.type === 'member_invited' ||
      event.type === 'member_status_changed' ||
      event.type === 'member_removed'
    ) {
      return 'spaces';
    }
    if (event.type === 'assignment_reviewed') {
      return 'reviews';
    }
    return 'assignments';
  }

  static getNavigationTarget(event: SharingAuditEvent): SharingAuditNavigationTarget {
    const entryId = Number(event.entryId);
    if (Number.isFinite(entryId) && entryId > 0) {
      return { kind: 'entry', entryId };
    }

    const spaceId = (event.spaceId || '').trim();
    if (spaceId) {
      return { kind: 'space', spaceId };
    }

    return null;
  }

  static recordEvent(
    event: Omit<SharingAuditEvent, 'id' | 'at'> & { at?: string }
  ): SharingAuditEvent {
    const nextEvent: SharingAuditEvent = {
      id: crypto.randomUUID(),
      at: event.at || new Date().toISOString(),
      type: event.type,
      entryId: event.entryId,
      spaceId: event.spaceId,
      detail: event.detail,
      metadata: event.metadata ? { ...event.metadata } : undefined,
    };

    const current = SecureAppSettings.getSharingAudit();
    SecureAppSettings.setSharingAudit([...current, nextEvent].slice(-SHARING_AUDIT_LIMIT));
    return nextEvent;
  }
}

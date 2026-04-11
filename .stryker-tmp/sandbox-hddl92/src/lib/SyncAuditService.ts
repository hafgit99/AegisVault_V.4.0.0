// @ts-nocheck
import { SecureAppSettings, type SyncAuditEvent } from './SecureAppSettings';

const SYNC_AUDIT_LIMIT = 80;

export class SyncAuditService {
  static listEvents(): SyncAuditEvent[] {
    return SecureAppSettings.getSyncAudit();
  }

  static recordEvent(event: Omit<SyncAuditEvent, 'id' | 'at'> & { at?: string }): SyncAuditEvent {
    const nextEvent: SyncAuditEvent = {
      id: crypto.randomUUID(),
      at: event.at || new Date().toISOString(),
      type: event.type,
      source: event.source,
      detail: event.detail,
      metadata: event.metadata ? { ...event.metadata } : undefined,
    };

    const current = SecureAppSettings.getSyncAudit();
    SecureAppSettings.setSyncAudit([...current, nextEvent].slice(-SYNC_AUDIT_LIMIT));
    return nextEvent;
  }
}

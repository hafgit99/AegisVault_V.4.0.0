import {
  SecureAppSettings,
  type EmergencyAccessAuditEvent,
  type EmergencyAccessContact,
  type EmergencyAccessPolicy,
  type EmergencyAccessRequest,
  type EmergencyAccessRequestStatus,
} from './SecureAppSettings';

const EMERGENCY_ACCESS_AUDIT_LIMIT = 120;

type SaveContactInput = Partial<EmergencyAccessContact> & {
  name: string;
  email: string;
};

type RequestAccessInput = {
  contactId: string;
  scope?: EmergencyAccessRequest['scope'];
  entryIds?: number[];
  requesterNote?: string;
  requestedAt?: string;
};

const clampHours = (value: number, fallback: number) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(720, Math.max(1, Math.round(value)));
};

const sortByDateDesc = <T extends { requested_at?: string; created_at?: string; at?: string }>(
  items: T[]
) =>
  items.slice().sort((left, right) => {
    const leftAt = left.requested_at || left.created_at || left.at || '';
    const rightAt = right.requested_at || right.created_at || right.at || '';
    return Date.parse(rightAt) - Date.parse(leftAt);
  });

const isTerminalStatus = (status: EmergencyAccessRequestStatus) =>
  status === 'rejected' || status === 'revoked' || status === 'expired';

const withStatus = (
  request: EmergencyAccessRequest,
  status: EmergencyAccessRequestStatus
): EmergencyAccessRequest => ({
  ...request,
  status,
});

export class EmergencyAccessService {
  private static timerHandle: ReturnType<typeof setInterval> | null = null;
  private static readonly TIMER_INTERVAL_MS = 30_000; // 30 saniyede bir kontrol

  /**
   * Background timer'ı başlatır. Her 30 saniyede bir pending/approved/granted
   * isteklerin durumunu değerlendirir ve süresi dolanları otomatik günceller.
   */
  static startBackgroundTimer(): void {
    if (this.timerHandle) return;
    this.evaluateState();
    this.timerHandle = setInterval(() => {
      this.evaluateState();
    }, this.TIMER_INTERVAL_MS);
  }

  /**
   * Background timer'ı durdurur.
   */
  static stopBackgroundTimer(): void {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }

  /**
   * Timer'ın çalışıp çalışmadığını döndürür.
   */
  static isTimerRunning(): boolean {
    return this.timerHandle !== null;
  }

  static getPolicy(): EmergencyAccessPolicy {
    return SecureAppSettings.getEmergencyAccessPolicy();
  }

  static updatePolicy(next: Partial<EmergencyAccessPolicy>): EmergencyAccessPolicy {
    const current = SecureAppSettings.getEmergencyAccessPolicy();
    const merged: EmergencyAccessPolicy = {
      enabled: next.enabled ?? current.enabled,
      require_manual_approval: next.require_manual_approval ?? current.require_manual_approval,
      default_wait_hours: clampHours(
        Number(next.default_wait_hours ?? current.default_wait_hours),
        current.default_wait_hours
      ),
      grant_ttl_hours: clampHours(
        Number(next.grant_ttl_hours ?? current.grant_ttl_hours),
        current.grant_ttl_hours
      ),
    };
    SecureAppSettings.setEmergencyAccessPolicy(merged);
    return merged;
  }

  static listContacts(): EmergencyAccessContact[] {
    return sortByDateDesc(SecureAppSettings.getEmergencyAccessContacts()).map((contact) => ({
      ...contact,
    }));
  }

  static saveContact(input: SaveContactInput): EmergencyAccessContact | null {
    const name = (input.name || '').trim();
    const email = (input.email || '').trim().toLowerCase();
    if (!name || !email) return null;

    const now = new Date().toISOString();
    const contacts = SecureAppSettings.getEmergencyAccessContacts();
    const existing = contacts.find((contact) => contact.id === input.id);
    const policy = this.getPolicy();
    const next: EmergencyAccessContact = {
      id: existing?.id || input.id || crypto.randomUUID(),
      name,
      email,
      permission:
        input.permission === 'full_access' || existing?.permission === 'full_access'
          ? 'full_access'
          : 'read_only',
      wait_hours: clampHours(
        Number(input.wait_hours ?? existing?.wait_hours ?? policy.default_wait_hours),
        policy.default_wait_hours
      ),
      enabled: input.enabled ?? existing?.enabled ?? true,
      note: (input.note || existing?.note || '').trim() || undefined,
      created_at: existing?.created_at || now,
      updated_at: now,
      last_requested_at: existing?.last_requested_at,
    };

    const nextContacts = existing
      ? contacts.map((contact) => (contact.id === existing.id ? next : contact))
      : [...contacts, next];
    SecureAppSettings.setEmergencyAccessContacts(nextContacts);
    this.recordAudit({
      type: 'contact_saved',
      contactId: next.id,
      detail: next.email,
      metadata: {
        permission: next.permission,
        wait_hours: next.wait_hours,
        enabled: next.enabled,
      },
    });
    return next;
  }

  static deleteContact(contactId: string): boolean {
    const normalizedId = (contactId || '').trim();
    if (!normalizedId) return false;
    const contacts = SecureAppSettings.getEmergencyAccessContacts();
    const target = contacts.find((contact) => contact.id === normalizedId);
    if (!target) return false;

    SecureAppSettings.setEmergencyAccessContacts(
      contacts.filter((contact) => contact.id !== normalizedId)
    );
    const requests = SecureAppSettings.getEmergencyAccessRequests();
    const now = new Date().toISOString();
    const nextRequests: EmergencyAccessRequest[] = requests.map((request) => {
      if (request.contact_id !== normalizedId) return request;
      if (isTerminalStatus(request.status)) return request;
      if (request.status === 'granted') {
        return {
          ...withStatus(request, 'revoked'),
          revoked_at: now,
          owner_note: request.owner_note || 'contact_deleted',
        };
      }
      return {
        ...withStatus(request, 'rejected'),
        decided_at: now,
        owner_note: request.owner_note || 'contact_deleted',
      };
    });
    SecureAppSettings.setEmergencyAccessRequests(nextRequests);
    this.recordAudit({
      type: 'contact_deleted',
      contactId: normalizedId,
      detail: target.email,
    });
    return true;
  }

  static listRequests(): EmergencyAccessRequest[] {
    this.evaluateState();
    return sortByDateDesc(SecureAppSettings.getEmergencyAccessRequests()).map((request) => ({
      ...request,
      entry_ids: Array.isArray(request.entry_ids) ? [...request.entry_ids] : undefined,
    }));
  }

  static listAudit(): EmergencyAccessAuditEvent[] {
    return sortByDateDesc(SecureAppSettings.getEmergencyAccessAudit()).map((event) => ({
      ...event,
      metadata: event.metadata ? { ...event.metadata } : undefined,
    }));
  }

  static requestAccess(input: RequestAccessInput): EmergencyAccessRequest | null {
    const policy = this.getPolicy();
    if (!policy.enabled) return null;

    const contactId = (input.contactId || '').trim();
    if (!contactId) return null;
    const contacts = SecureAppSettings.getEmergencyAccessContacts();
    const contact = contacts.find((candidate) => candidate.id === contactId && candidate.enabled);
    if (!contact) return null;

    const requestedAt = input.requestedAt || new Date().toISOString();
    const unlockAt = new Date(
      Date.parse(requestedAt) +
        clampHours(contact.wait_hours, policy.default_wait_hours) * 60 * 60 * 1000
    ).toISOString();
    const entryIds =
      input.scope === 'selected_entries' && Array.isArray(input.entryIds)
        ? input.entryIds
            .map((entryId) => Number(entryId))
            .filter((entryId) => Number.isFinite(entryId) && entryId > 0)
        : undefined;

    const request: EmergencyAccessRequest = {
      id: crypto.randomUUID(),
      contact_id: contactId,
      status: 'pending',
      requested_at: requestedAt,
      unlock_at: unlockAt,
      scope: input.scope === 'selected_entries' ? 'selected_entries' : 'vault',
      entry_ids: entryIds && entryIds.length > 0 ? entryIds : undefined,
      requester_note: (input.requesterNote || '').trim() || undefined,
    };

    const requests = SecureAppSettings.getEmergencyAccessRequests();
    SecureAppSettings.setEmergencyAccessRequests([...requests, request]);

    SecureAppSettings.setEmergencyAccessContacts(
      contacts.map((candidate) =>
        candidate.id === contactId
          ? { ...candidate, last_requested_at: requestedAt, updated_at: requestedAt }
          : candidate
      )
    );

    this.recordAudit({
      type: 'request_created',
      contactId,
      requestId: request.id,
      detail: contact.email,
      metadata: {
        wait_hours: contact.wait_hours,
        scope: request.scope,
      },
    });

    this.evaluateState();
    return request;
  }

  static approveRequest(requestId: string, ownerNote?: string): EmergencyAccessRequest | null {
    const normalizedId = (requestId || '').trim();
    if (!normalizedId) return null;
    this.evaluateState();

    const requests = SecureAppSettings.getEmergencyAccessRequests();
    const targetIndex = requests.findIndex((request) => request.id === normalizedId);
    if (targetIndex < 0) return null;
    const target = requests[targetIndex];
    if (target.status !== 'pending' && target.status !== 'approved') return null;

    const now = new Date().toISOString();
    const updated: EmergencyAccessRequest = {
      ...withStatus(target, 'approved'),
      decided_at: now,
      owner_note: (ownerNote || target.owner_note || '').trim() || undefined,
    };
    const next = requests.slice();
    next[targetIndex] = updated;
    SecureAppSettings.setEmergencyAccessRequests(next);
    this.recordAudit({
      type: 'request_approved',
      requestId: updated.id,
      contactId: updated.contact_id,
      metadata: {
        unlock_at: updated.unlock_at,
      },
    });
    this.evaluateState();
    return this.listRequests().find((request) => request.id === updated?.id) || null;
  }

  static rejectRequest(requestId: string, ownerNote?: string): EmergencyAccessRequest | null {
    const normalizedId = (requestId || '').trim();
    if (!normalizedId) return null;
    const requests = SecureAppSettings.getEmergencyAccessRequests();
    const targetIndex = requests.findIndex((request) => request.id === normalizedId);
    if (targetIndex < 0) return null;
    const target = requests[targetIndex];
    if (isTerminalStatus(target.status)) return null;

    const now = new Date().toISOString();
    const updated: EmergencyAccessRequest = {
      ...withStatus(target, 'rejected'),
      decided_at: now,
      owner_note: (ownerNote || target.owner_note || '').trim() || undefined,
    };
    const next = requests.slice();
    next[targetIndex] = updated;
    SecureAppSettings.setEmergencyAccessRequests(next);
    this.recordAudit({
      type: 'request_rejected',
      requestId: updated.id,
      contactId: updated.contact_id,
      detail: updated.owner_note,
    });
    return updated;
  }

  static revokeGrant(requestId: string, ownerNote?: string): EmergencyAccessRequest | null {
    const normalizedId = (requestId || '').trim();
    if (!normalizedId) return null;
    const requests = SecureAppSettings.getEmergencyAccessRequests();
    const targetIndex = requests.findIndex((request) => request.id === normalizedId);
    if (targetIndex < 0) return null;
    const target = requests[targetIndex];
    if (target.status !== 'granted') return null;

    const now = new Date().toISOString();
    const updated: EmergencyAccessRequest = {
      ...withStatus(target, 'revoked'),
      revoked_at: now,
      owner_note: (ownerNote || target.owner_note || '').trim() || undefined,
    };
    const next = requests.slice();
    next[targetIndex] = updated;

    SecureAppSettings.setEmergencyAccessRequests(next);
    this.recordAudit({
      type: 'grant_revoked',
      requestId: updated.id,
      contactId: updated.contact_id,
      detail: updated.owner_note,
    });
    return updated;
  }

  static evaluateState(nowInput?: Date): EmergencyAccessRequest[] {
    const now = nowInput || new Date();
    const nowIso = now.toISOString();
    const policy = this.getPolicy();
    const requests = SecureAppSettings.getEmergencyAccessRequests();
    let changed = false;

    const nextRequests: EmergencyAccessRequest[] = requests.map((request) => {
      if (request.status === 'pending') {
        if (Date.parse(request.unlock_at) <= now.getTime() && !policy.require_manual_approval) {
          changed = true;
          const grantedAt = nowIso;
          const expiresAt = new Date(
            now.getTime() + clampHours(policy.grant_ttl_hours, 24) * 60 * 60 * 1000
          ).toISOString();
          this.recordAudit({
            type: 'grant_activated',
            requestId: request.id,
            contactId: request.contact_id,
            metadata: { auto: true },
          });
          return {
            ...request,
            status: 'granted' as EmergencyAccessRequestStatus,
            granted_at: grantedAt,
            expires_at: expiresAt,
          };
        }
        return request;
      }

      if (request.status === 'approved') {
        if (Date.parse(request.unlock_at) <= now.getTime()) {
          changed = true;
          const grantedAt = nowIso;
          const expiresAt = new Date(
            now.getTime() + clampHours(policy.grant_ttl_hours, 24) * 60 * 60 * 1000
          ).toISOString();
          this.recordAudit({
            type: 'grant_activated',
            requestId: request.id,
            contactId: request.contact_id,
            metadata: { auto: false },
          });
          return {
            ...request,
            status: 'granted' as EmergencyAccessRequestStatus,
            granted_at: grantedAt,
            expires_at: expiresAt,
          };
        }
        return request;
      }

      if (request.status === 'granted' && request.expires_at) {
        if (Date.parse(request.expires_at) <= now.getTime()) {
          changed = true;
          this.recordAudit({
            type: 'grant_expired',
            requestId: request.id,
            contactId: request.contact_id,
          });
          return {
            ...request,
            status: 'expired' as EmergencyAccessRequestStatus,
          };
        }
      }
      return request;
    });

    if (changed) {
      SecureAppSettings.setEmergencyAccessRequests(nextRequests);
    }

    return nextRequests;
  }

  static getSummary(nowInput?: Date) {
    const now = nowInput || new Date();
    const nowMs = now.getTime();
    const requests = this.listRequests();
    const pending = requests.filter((request) => request.status === 'pending').length;
    const approvedWaiting = requests.filter((request) => request.status === 'approved').length;
    const grantedActive = requests.filter(
      (request) =>
        request.status === 'granted' &&
        (!request.expires_at || Date.parse(request.expires_at) > nowMs)
    ).length;
    const oldestPending = requests
      .filter((request) => request.status === 'pending' || request.status === 'approved')
      .sort((left, right) => Date.parse(left.unlock_at) - Date.parse(right.unlock_at))[0];

    return {
      policy: this.getPolicy(),
      contacts: this.listContacts(),
      requests,
      pending,
      approvedWaiting,
      grantedActive,
      nextUnlockAt: oldestPending?.unlock_at || null,
      auditEvents: this.listAudit(),
    };
  }

  private static recordAudit(
    event: Omit<EmergencyAccessAuditEvent, 'id' | 'at'> & { at?: string }
  ): EmergencyAccessAuditEvent {
    const current = SecureAppSettings.getEmergencyAccessAudit();
    const nextEvent: EmergencyAccessAuditEvent = {
      id: crypto.randomUUID(),
      at: event.at || new Date().toISOString(),
      type: event.type,
      contactId: event.contactId,
      requestId: event.requestId,
      detail: event.detail,
      metadata: event.metadata ? { ...event.metadata } : undefined,
    };
    SecureAppSettings.setEmergencyAccessAudit(
      [...current, nextEvent].slice(-EMERGENCY_ACCESS_AUDIT_LIMIT)
    );
    return nextEvent;
  }
}

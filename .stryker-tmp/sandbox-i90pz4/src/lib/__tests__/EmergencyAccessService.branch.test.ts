// @ts-nocheck
// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { SecureAppSettings } from '../SecureAppSettings';
import { EmergencyAccessService } from '../EmergencyAccessService';

/**
 * EmergencyAccessService — Kapsamlı Branch Coverage Testleri
 *
 * Hedef: deleteContact, rejectRequest, revokeGrant, evaluateState (approved→granted),
 * getSummary, requestAccess (selected_entries), background timer, ve edge case dallarını kapsamak.
 */
describe('EmergencyAccessService: Branch Coverage', () => {
  beforeEach(() => {
    localStorage.clear();
    SecureAppSettings.resetForTests();
    vi.restoreAllMocks();
    EmergencyAccessService.stopBackgroundTimer();
  });

  afterEach(() => {
    EmergencyAccessService.stopBackgroundTimer();
  });

  // ─── saveContact edge cases ────────────────────────────────────────
  describe('saveContact', () => {
    it('returns null for empty name', () => {
      expect(EmergencyAccessService.saveContact({ name: '', email: 'a@b.com' })).toBeNull();
    });

    it('returns null for empty email', () => {
      expect(EmergencyAccessService.saveContact({ name: 'Test', email: '' })).toBeNull();
    });

    it('updates existing contact by id', () => {
      const contact = EmergencyAccessService.saveContact({
        name: 'Ada',
        email: 'ada@example.com',
        permission: 'read_only',
        wait_hours: 12,
      });
      expect(contact).toBeTruthy();

      const updated = EmergencyAccessService.saveContact({
        id: contact!.id,
        name: 'Ada Lovelace',
        email: 'ada@updated.com',
        permission: 'full_access',
        wait_hours: 48,
        note: 'priority contact',
      });
      expect(updated!.name).toBe('Ada Lovelace');
      expect(updated!.permission).toBe('full_access');
      expect(updated!.note).toBe('priority contact');

      const list = EmergencyAccessService.listContacts();
      expect(list.length).toBe(1);
    });

    it('creates contact with full_access permission from existing', () => {
      const c1 = EmergencyAccessService.saveContact({
        name: 'Full',
        email: 'full@test.com',
        permission: 'full_access',
      });
      // Update same contact without specifying permission - should keep full_access
      const c2 = EmergencyAccessService.saveContact({
        id: c1!.id,
        name: 'Full Updated',
        email: 'full@test.com',
      });
      expect(c2!.permission).toBe('full_access');
    });
  });

  // ─── deleteContact ─────────────────────────────────────────────────
  describe('deleteContact', () => {
    it('returns false for empty contactId', () => {
      expect(EmergencyAccessService.deleteContact('')).toBe(false);
    });

    it('returns false for non-existent contactId', () => {
      expect(EmergencyAccessService.deleteContact('non-existent-id')).toBe(false);
    });

    it('deletes contact and revokes granted requests', () => {
      EmergencyAccessService.updatePolicy({
        enabled: true,
        require_manual_approval: false,
        grant_ttl_hours: 48,
      });

      const contact = EmergencyAccessService.saveContact({
        name: 'Delete Me',
        email: 'delete@test.com',
        wait_hours: 1,
      });

      // Create a request and auto-grant it
      EmergencyAccessService.requestAccess({
        contactId: contact!.id,
        requestedAt: '2026-01-01T00:00:00.000Z',
      });
      EmergencyAccessService.evaluateState(new Date('2026-01-01T02:00:00.000Z'));

      const before = EmergencyAccessService.listRequests();
      expect(before[0]?.status).toBe('granted');

      // Delete contact - should revoke the granted request
      const deleted = EmergencyAccessService.deleteContact(contact!.id);
      expect(deleted).toBe(true);

      const after = EmergencyAccessService.listRequests();
      expect(after[0]?.status).toBe('revoked');
      expect(after[0]?.revoked_at).toBeTruthy();
      expect(EmergencyAccessService.listContacts().length).toBe(0);
    });

    it('deletes contact and rejects pending requests', () => {
      EmergencyAccessService.updatePolicy({ enabled: true });
      const contact = EmergencyAccessService.saveContact({
        name: 'Pending Contact',
        email: 'pending@test.com',
        wait_hours: 24,
      });

      // Create a pending request (far future unlock_at)
      const request = EmergencyAccessService.requestAccess({
        contactId: contact!.id,
        requestedAt: new Date().toISOString(),
      });
      expect(request?.status).toBe('pending');

      EmergencyAccessService.deleteContact(contact!.id);

      const requests = EmergencyAccessService.listRequests();
      expect(requests[0]?.status).toBe('rejected');
      expect(requests[0]?.owner_note).toBe('contact_deleted');
    });

    it('does not modify terminal-status requests when deleting contact', () => {
      EmergencyAccessService.updatePolicy({
        enabled: true,
        require_manual_approval: false,
        grant_ttl_hours: 1,
      });
      const contact = EmergencyAccessService.saveContact({
        name: 'Terminal',
        email: 'terminal@test.com',
        wait_hours: 1,
      });

      // Create request in the past — evaluateState() inside requestAccess() uses Date.now()
      // so auto_approval=false, wait_hours=1 means unlock_at = requestedAt + 1h = past
      // evaluateState(Date.now()) sees unlock_at < now && !require_manual_approval → granted
      // Then grant_ttl_hours=1 → expires_at = now + 1h
      const req = EmergencyAccessService.requestAccess({
        contactId: contact!.id,
        requestedAt: '2020-01-01T00:00:00.000Z',
      });

      // The request should already be granted at this point
      let requests = EmergencyAccessService.listRequests();
      const grantedReq = requests.find((r) => r.id === req!.id);
      expect(grantedReq?.status).toBe('granted');

      // Now expire it: expires_at was set to ~now + 1h, so evaluating 100 years later will expire it
      EmergencyAccessService.evaluateState(new Date('2099-01-01T00:00:00.000Z'));

      requests = EmergencyAccessService.listRequests();
      const expiredReq = requests.find((r) => r.id === req!.id);
      expect(expiredReq?.status).toBe('expired');

      EmergencyAccessService.deleteContact(contact!.id);

      const afterDelete = EmergencyAccessService.listRequests();
      expect(afterDelete[0]?.status).toBe('expired'); // unchanged
    });
  });

  // ─── requestAccess edge cases ──────────────────────────────────────
  describe('requestAccess', () => {
    it('returns null when policy is disabled', () => {
      EmergencyAccessService.updatePolicy({ enabled: false });
      const result = EmergencyAccessService.requestAccess({ contactId: 'any' });
      expect(result).toBeNull();
    });

    it('returns null for empty contactId', () => {
      EmergencyAccessService.updatePolicy({ enabled: true });
      expect(EmergencyAccessService.requestAccess({ contactId: '' })).toBeNull();
    });

    it('returns null for disabled contact', () => {
      EmergencyAccessService.updatePolicy({ enabled: true });
      const contact = EmergencyAccessService.saveContact({
        name: 'Disabled',
        email: 'disabled@test.com',
        enabled: false,
      });
      expect(EmergencyAccessService.requestAccess({ contactId: contact!.id })).toBeNull();
    });

    it('handles selected_entries scope with valid entry_ids', () => {
      EmergencyAccessService.updatePolicy({ enabled: true });
      const contact = EmergencyAccessService.saveContact({
        name: 'Selector',
        email: 'selector@test.com',
        wait_hours: 1,
      });

      const request = EmergencyAccessService.requestAccess({
        contactId: contact!.id,
        scope: 'selected_entries',
        entryIds: [1, 2, 3],
        requesterNote: 'need entries 1-3',
      });

      expect(request?.scope).toBe('selected_entries');
      expect(request?.entry_ids).toEqual([1, 2, 3]);
      expect(request?.requester_note).toBe('need entries 1-3');
    });

    it('filters out invalid entry_ids (NaN, negative, zero)', () => {
      EmergencyAccessService.updatePolicy({ enabled: true });
      const contact = EmergencyAccessService.saveContact({
        name: 'Filter',
        email: 'filter@test.com',
        wait_hours: 1,
      });

      const request = EmergencyAccessService.requestAccess({
        contactId: contact!.id,
        scope: 'selected_entries',
        entryIds: [1, -5, 0, NaN, 10],
      });

      expect(request?.entry_ids).toEqual([1, 10]);
    });

    it('sets entry_ids undefined when all are invalid', () => {
      EmergencyAccessService.updatePolicy({ enabled: true });
      const contact = EmergencyAccessService.saveContact({
        name: 'AllInvalid',
        email: 'invalid@test.com',
        wait_hours: 1,
      });

      const request = EmergencyAccessService.requestAccess({
        contactId: contact!.id,
        scope: 'selected_entries',
        entryIds: [-1, 0, NaN],
      });

      expect(request?.entry_ids).toBeUndefined();
    });
  });

  // ─── rejectRequest ─────────────────────────────────────────────────
  describe('rejectRequest', () => {
    it('returns null for empty requestId', () => {
      expect(EmergencyAccessService.rejectRequest('')).toBeNull();
    });

    it('returns null for non-existent requestId', () => {
      expect(EmergencyAccessService.rejectRequest('non-existent')).toBeNull();
    });

    it('returns null for already terminal request (rejected)', () => {
      EmergencyAccessService.updatePolicy({ enabled: true });
      const contact = EmergencyAccessService.saveContact({
        name: 'Reject',
        email: 'reject@test.com',
        wait_hours: 24,
      });
      const request = EmergencyAccessService.requestAccess({
        contactId: contact!.id,
      });

      // Reject it once
      EmergencyAccessService.rejectRequest(request!.id, 'first rejection');

      // Try to reject again — should return null (terminal)
      expect(EmergencyAccessService.rejectRequest(request!.id)).toBeNull();
    });

    it('rejects a pending request with owner note', () => {
      EmergencyAccessService.updatePolicy({ enabled: true });
      const contact = EmergencyAccessService.saveContact({
        name: 'PendingReject',
        email: 'preject@test.com',
        wait_hours: 24,
      });
      const request = EmergencyAccessService.requestAccess({
        contactId: contact!.id,
      });

      const rejected = EmergencyAccessService.rejectRequest(request!.id, 'not authorized');
      expect(rejected?.status).toBe('rejected');
      expect(rejected?.owner_note).toBe('not authorized');

      const auditEvents = EmergencyAccessService.listAudit();
      expect(auditEvents.some((e) => e.type === 'request_rejected')).toBe(true);
    });
  });

  // ─── revokeGrant ───────────────────────────────────────────────────
  describe('revokeGrant', () => {
    it('returns null for empty requestId', () => {
      expect(EmergencyAccessService.revokeGrant('')).toBeNull();
    });

    it('returns null for non-existent requestId', () => {
      expect(EmergencyAccessService.revokeGrant('non-existent')).toBeNull();
    });

    it('returns null for non-granted request', () => {
      EmergencyAccessService.updatePolicy({ enabled: true });
      const contact = EmergencyAccessService.saveContact({
        name: 'NotGranted',
        email: 'notgranted@test.com',
        wait_hours: 24,
      });
      const request = EmergencyAccessService.requestAccess({
        contactId: contact!.id,
      });

      // Request is pending, not granted
      expect(EmergencyAccessService.revokeGrant(request!.id)).toBeNull();
    });

    it('revokes a granted request with owner note', () => {
      EmergencyAccessService.updatePolicy({
        enabled: true,
        require_manual_approval: false,
        grant_ttl_hours: 48,
      });
      const contact = EmergencyAccessService.saveContact({
        name: 'Revoke',
        email: 'revoke@test.com',
        wait_hours: 1,
      });
      EmergencyAccessService.requestAccess({
        contactId: contact!.id,
        requestedAt: '2026-01-01T00:00:00.000Z',
      });
      EmergencyAccessService.evaluateState(new Date('2026-01-01T02:00:00.000Z'));

      const requests = EmergencyAccessService.listRequests();
      expect(requests[0]?.status).toBe('granted');

      const revoked = EmergencyAccessService.revokeGrant(
        requests[0]!.id,
        'access revoked by owner'
      );
      expect(revoked?.status).toBe('revoked');
      expect(revoked?.owner_note).toBe('access revoked by owner');
      expect(revoked?.revoked_at).toBeTruthy();

      const auditEvents = EmergencyAccessService.listAudit();
      expect(auditEvents.some((e) => e.type === 'grant_revoked')).toBe(true);
    });
  });

  // ─── approveRequest edge cases ─────────────────────────────────────
  describe('approveRequest', () => {
    it('returns null for empty requestId', () => {
      expect(EmergencyAccessService.approveRequest('')).toBeNull();
    });

    it('returns null for non-existent requestId', () => {
      expect(EmergencyAccessService.approveRequest('non-existent')).toBeNull();
    });

    it('returns null for terminal-status request', () => {
      EmergencyAccessService.updatePolicy({ enabled: true });
      const contact = EmergencyAccessService.saveContact({
        name: 'Terminal',
        email: 'terminal@test.com',
        wait_hours: 24,
      });
      const request = EmergencyAccessService.requestAccess({
        contactId: contact!.id,
      });
      EmergencyAccessService.rejectRequest(request!.id);
      expect(EmergencyAccessService.approveRequest(request!.id)).toBeNull();
    });
  });

  // ─── evaluateState: approved → granted transition ──────────────────
  describe('evaluateState', () => {
    it('transitions approved request to granted after unlock_at', () => {
      EmergencyAccessService.updatePolicy({
        enabled: true,
        require_manual_approval: true,
        grant_ttl_hours: 12,
      });
      const contact = EmergencyAccessService.saveContact({
        name: 'ApprovedGrant',
        email: 'approved@test.com',
        wait_hours: 1,
      });
      const request = EmergencyAccessService.requestAccess({
        contactId: contact!.id,
        requestedAt: '2026-03-01T00:00:00.000Z',
      });

      // Approve the request (require_manual_approval=true)
      EmergencyAccessService.approveRequest(request!.id);

      // Evaluate after unlock_at — should transition from approved to granted
      EmergencyAccessService.evaluateState(new Date('2026-03-01T02:00:00.000Z'));

      const requests = EmergencyAccessService.listRequests();
      const target = requests.find((r) => r.id === request!.id);
      expect(target?.status).toBe('granted');
      expect(target?.granted_at).toBeTruthy();
      expect(target?.expires_at).toBeTruthy();

      const auditEvents = EmergencyAccessService.listAudit();
      const grantEvent = auditEvents.find(
        (e) => e.type === 'grant_activated' && e.requestId === request!.id
      );
      expect(grantEvent?.metadata?.auto).toBe(false);
    });

    it('does not transition approved request before unlock_at', () => {
      EmergencyAccessService.updatePolicy({
        enabled: true,
        require_manual_approval: true,
        grant_ttl_hours: 12,
      });
      const contact = EmergencyAccessService.saveContact({
        name: 'NotYet',
        email: 'notyet@test.com',
        wait_hours: 720, // max hours = 30 days
      });
      const now = new Date();
      const request = EmergencyAccessService.requestAccess({
        contactId: contact!.id,
        requestedAt: now.toISOString(),
      });

      // Approve it — evaluateState inside approveRequest will run with current time,
      // but unlock_at is 720 hours away so it should NOT transition to granted
      const approved = EmergencyAccessService.approveRequest(request!.id);
      expect(approved?.status).toBe('approved');
    });
  });

  // ─── getSummary ────────────────────────────────────────────────────
  describe('getSummary', () => {
    it('returns comprehensive summary with all fields', () => {
      EmergencyAccessService.updatePolicy({
        enabled: true,
        require_manual_approval: false,
        grant_ttl_hours: 48,
      });

      const contact = EmergencyAccessService.saveContact({
        name: 'Summary',
        email: 'summary@test.com',
        wait_hours: 1,
      });

      EmergencyAccessService.requestAccess({
        contactId: contact!.id,
        requestedAt: '2026-06-01T00:00:00.000Z',
      });

      const summary = EmergencyAccessService.getSummary(new Date('2026-06-01T00:30:00.000Z'));
      expect(summary.policy.enabled).toBe(true);
      expect(summary.contacts.length).toBe(1);
      expect(summary.pending).toBe(1);
      expect(summary.approvedWaiting).toBe(0);
      expect(summary.grantedActive).toBe(0);
      expect(summary.nextUnlockAt).toBeTruthy();
      expect(summary.auditEvents.length).toBeGreaterThan(0);
    });

    it('returns active granted count correctly', () => {
      EmergencyAccessService.updatePolicy({
        enabled: true,
        require_manual_approval: false,
        grant_ttl_hours: 48,
      });
      const contact = EmergencyAccessService.saveContact({
        name: 'Active',
        email: 'active@test.com',
        wait_hours: 1,
      });
      EmergencyAccessService.requestAccess({
        contactId: contact!.id,
        requestedAt: '2026-06-01T00:00:00.000Z',
      });
      EmergencyAccessService.evaluateState(new Date('2026-06-01T02:00:00.000Z'));

      const summary = EmergencyAccessService.getSummary(new Date('2026-06-01T03:00:00.000Z'));
      expect(summary.grantedActive).toBe(1);
      expect(summary.pending).toBe(0);
    });
  });

  // ─── Background Timer ────────────────────────────────────────────
  describe('Background Timer', () => {
    it('starts and stops background timer', () => {
      expect(EmergencyAccessService.isTimerRunning()).toBe(false);

      EmergencyAccessService.startBackgroundTimer();
      expect(EmergencyAccessService.isTimerRunning()).toBe(true);

      // Starting again should be a no-op
      EmergencyAccessService.startBackgroundTimer();
      expect(EmergencyAccessService.isTimerRunning()).toBe(true);

      EmergencyAccessService.stopBackgroundTimer();
      expect(EmergencyAccessService.isTimerRunning()).toBe(false);

      // Stopping again should be safe
      EmergencyAccessService.stopBackgroundTimer();
      expect(EmergencyAccessService.isTimerRunning()).toBe(false);
    });
  });

  // ─── updatePolicy edge cases ──────────────────────────────────────
  describe('updatePolicy', () => {
    it('clamps wait_hours within valid range', () => {
      const result = EmergencyAccessService.updatePolicy({
        default_wait_hours: 0,
        grant_ttl_hours: 999,
      });
      expect(result.default_wait_hours).toBe(1); // min clamp
      expect(result.grant_ttl_hours).toBe(720); // max clamp
    });

    it('handles NaN values in policy', () => {
      const result = EmergencyAccessService.updatePolicy({
        default_wait_hours: NaN,
        grant_ttl_hours: NaN,
      });
      // Should fall back to current defaults
      expect(Number.isFinite(result.default_wait_hours)).toBe(true);
      expect(Number.isFinite(result.grant_ttl_hours)).toBe(true);
    });
  });

  // ─── listAudit ────────────────────────────────────────────────────
  describe('listAudit', () => {
    it('returns audit events with metadata copies', () => {
      EmergencyAccessService.updatePolicy({ enabled: true });
      const contact = EmergencyAccessService.saveContact({
        name: 'Audit',
        email: 'audit@test.com',
      });

      const events = EmergencyAccessService.listAudit();
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]!.type).toBe('contact_saved');
    });
  });
});

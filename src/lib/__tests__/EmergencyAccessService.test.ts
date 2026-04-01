// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SecureAppSettings } from '../SecureAppSettings';
import { EmergencyAccessService } from '../EmergencyAccessService';

describe('EmergencyAccessService', () => {
  beforeEach(() => {
    localStorage.clear();
    SecureAppSettings.resetForTests();
    vi.restoreAllMocks();
  });

  it('creates trusted contact and request lifecycle works', () => {
    const contact = EmergencyAccessService.saveContact({
      name: 'Ada',
      email: 'ada@example.com',
      permission: 'read_only',
      wait_hours: 24,
      enabled: true,
    });

    expect(contact).toBeTruthy();
    const request = EmergencyAccessService.requestAccess({
      contactId: contact!.id,
      scope: 'vault',
      requesterNote: 'urgent',
      requestedAt: '2026-04-01T00:00:00.000Z',
    });
    expect(request?.status).toBe('pending');

    const approved = EmergencyAccessService.approveRequest(request!.id, 'owner-ok');
    expect(approved?.status).toBe('approved');
  });

  it('auto grants when wait window passes and manual approval is disabled', () => {
    EmergencyAccessService.updatePolicy({
      require_manual_approval: false,
      grant_ttl_hours: 12,
    });
    const contact = EmergencyAccessService.saveContact({
      name: 'Grace',
      email: 'grace@example.com',
      permission: 'full_access',
      wait_hours: 1,
      enabled: true,
    });

    EmergencyAccessService.requestAccess({
      contactId: contact!.id,
      requestedAt: '2026-04-01T00:00:00.000Z',
    });
    EmergencyAccessService.evaluateState(new Date('2026-04-01T02:00:00.000Z'));

    const requests = EmergencyAccessService.listRequests();
    expect(requests[0]?.status).toBe('granted');
    expect(requests[0]?.expires_at).toBeTruthy();
  });

  it('expires granted access after ttl and records audit', () => {
    EmergencyAccessService.updatePolicy({
      require_manual_approval: true,
      grant_ttl_hours: 1,
    });
    const contact = EmergencyAccessService.saveContact({
      name: 'Linus',
      email: 'linus@example.com',
      permission: 'read_only',
      wait_hours: 1,
      enabled: true,
    });

    const request = EmergencyAccessService.requestAccess({
      contactId: contact!.id,
      requestedAt: '2026-04-01T00:00:00.000Z',
    });
    EmergencyAccessService.updatePolicy({
      require_manual_approval: false,
      grant_ttl_hours: 1,
    });
    EmergencyAccessService.evaluateState(new Date('2026-04-01T02:00:00.000Z'));
    EmergencyAccessService.evaluateState(new Date('2026-04-01T04:00:00.000Z'));

    const target = EmergencyAccessService.listRequests().find((item) => item.id === request?.id);
    expect(target?.status).toBe('expired');
    expect(
      EmergencyAccessService.listAudit().some((event) => event.type === 'grant_expired')
    ).toBe(true);
  });
});

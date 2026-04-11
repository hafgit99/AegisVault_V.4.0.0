// @ts-nocheck
// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { SecureAppSettings } from '../SecureAppSettings';
import { SharedSpaceService } from '../SharedSpaceService';
import { VaultSharingLinkService } from '../VaultSharingLinkService';

describe('SharedSpaceService', () => {
  beforeEach(() => {
    localStorage.clear();
    SecureAppSettings.resetForTests();
  });

  it('saves a shared space with sanitized members', () => {
    const saved = SharedSpaceService.saveSpace({
      name: 'Family',
      kind: 'family',
      default_role: 'viewer',
      allow_export: true,
      require_review: true,
      members: [
        {
          name: ' Ada ',
          email: ' ada@example.com ',
          role: 'admin',
          status: 'active',
        },
        {
          name: '   ',
          email: '',
        },
      ],
    });

    expect(saved?.name).toBe('Family');
    expect(saved?.members).toHaveLength(1);
    expect(saved?.members[0]?.email).toBe('ada@example.com');
    expect(SharedSpaceService.listSpaces()).toHaveLength(1);
  });

  it('deletes shared spaces and removes linked assignments', () => {
    const saved = SharedSpaceService.saveSpace({
      id: 'space-1',
      name: 'Ops',
      kind: 'team',
      default_role: 'editor',
      allow_export: false,
      require_review: true,
      members: [],
    });

    expect(saved?.id).toBe('space-1');

    VaultSharingLinkService.setAssignmentsForEntry(101, [
      {
        space_id: 'space-1',
        role: 'editor',
      },
    ]);

    SharedSpaceService.deleteSpace('space-1');

    expect(SharedSpaceService.listSpaces()).toHaveLength(0);
    expect(VaultSharingLinkService.getAssignmentsForEntry(101)).toHaveLength(0);
  });

  it('records audit events for save and delete operations', () => {
    SharedSpaceService.saveSpace({
      id: 'space-audit',
      name: 'Audit Space',
      kind: 'team',
      default_role: 'viewer',
      allow_export: true,
      require_review: false,
      members: [],
    });

    SharedSpaceService.deleteSpace('space-audit');

    const audit = SecureAppSettings.getSharingAudit();
    expect(audit.map((event) => event.type)).toEqual(['space_saved', 'space_deleted']);
  });

  it('records member lifecycle events for invite, status change, and removal', () => {
    SharedSpaceService.saveSpace({
      id: 'space-members',
      name: 'Ops',
      kind: 'team',
      default_role: 'viewer',
      allow_export: true,
      require_review: true,
      members: [
        {
          id: 'member-a',
          name: 'Ada',
          email: 'ada@example.com',
          role: 'viewer',
          status: 'pending',
        },
      ],
    });

    SharedSpaceService.updateMemberStatus('space-members', 'member-a', 'active');
    SharedSpaceService.removeMember('space-members', 'member-a');

    const audit = SecureAppSettings.getSharingAudit().map((event) => event.type);
    expect(audit).toContain('member_invited');
    expect(audit).toContain('member_status_changed');
    expect(audit).toContain('member_removed');
  });
});

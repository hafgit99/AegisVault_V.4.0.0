// @ts-nocheck
import type {
  CanonicalSharedMember,
  CanonicalSharedMemberStatus,
  CanonicalSharedRole,
  CanonicalSharedSpace,
  CanonicalSharedSpaceKind,
} from './canonical-schema';
import { SecureAppSettings } from './SecureAppSettings';
import { SharingAuditService } from './SharingAuditService';
import { VaultSharingLinkService } from './VaultSharingLinkService';

type SharedSpaceInput = Partial<CanonicalSharedSpace>;
type SharedMemberInput = Partial<CanonicalSharedMember>;

const normalizeRole = (value?: string): CanonicalSharedRole => {
  if (value === 'owner' || value === 'admin' || value === 'editor' || value === 'viewer') {
    return value;
  }
  return 'viewer';
};

const normalizeStatus = (value?: string): CanonicalSharedMemberStatus => {
  if (value === 'active' || value === 'pending' || value === 'emergency_only') {
    return value;
  }
  return 'pending';
};

const normalizeKind = (value?: string): CanonicalSharedSpaceKind => {
  if (value === 'family' || value === 'team' || value === 'private') {
    return value;
  }
  return 'private';
};

const sanitizeMember = (input: SharedMemberInput): CanonicalSharedMember | null => {
  const name = (input.name || '').trim();
  const email = (input.email || '').trim();
  if (!name && !email) return null;

  return {
    id: input.id || crypto.randomUUID(),
    name,
    email,
    role: normalizeRole(input.role),
    status: normalizeStatus(input.status),
    device_label: (input.device_label || '').trim() || undefined,
    notes: (input.notes || '').trim() || undefined,
    last_verified_at: input.last_verified_at || new Date().toISOString(),
  };
};

const describeMember = (member: CanonicalSharedMember): string =>
  member.email || member.name || member.id;

export class SharedSpaceService {
  static listSpaces(): CanonicalSharedSpace[] {
    return SecureAppSettings.getSharedSpaces();
  }

  static saveSpace(input: SharedSpaceInput): CanonicalSharedSpace | null {
    const name = (input.name || '').trim();
    if (!name) return null;

    const now = new Date().toISOString();
    const nextSpace: CanonicalSharedSpace = {
      id: input.id || crypto.randomUUID(),
      name,
      kind: normalizeKind(input.kind),
      description: (input.description || '').trim(),
      default_role:
        normalizeRole(input.default_role) === 'owner'
          ? 'viewer'
          : (normalizeRole(input.default_role) as Exclude<CanonicalSharedRole, 'owner'>),
      allow_export: Boolean(input.allow_export),
      require_review: Boolean(input.require_review),
      created_at: input.created_at || now,
      updated_at: now,
      members: Array.isArray(input.members)
        ? input.members
            .map((member) => sanitizeMember(member))
            .filter((member): member is CanonicalSharedMember => Boolean(member))
        : [],
    };

    const spaces = SecureAppSettings.getSharedSpaces();
    const previousSpace = spaces.find((space) => space.id === nextSpace.id);
    const nextSpaces = spaces.some((space) => space.id === nextSpace.id)
      ? spaces.map((space) => (space.id === nextSpace.id ? nextSpace : space))
      : [...spaces, nextSpace];
    SecureAppSettings.setSharedSpaces(nextSpaces);
    SharingAuditService.recordEvent({
      type: 'space_saved',
      spaceId: nextSpace.id,
      detail: nextSpace.name,
      metadata: {
        memberCount: nextSpace.members.length,
        kind: nextSpace.kind,
      },
    });
    this.recordMemberLifecycleEvents(previousSpace, nextSpace);
    return nextSpace;
  }

  static deleteSpace(spaceId: string): boolean {
    const normalizedId = (spaceId || '').trim();
    if (!normalizedId) return false;

    const nextSpaces = SecureAppSettings
      .getSharedSpaces()
      .filter((space) => space.id !== normalizedId);
    SecureAppSettings.setSharedSpaces(nextSpaces);
    const removedAssignments = VaultSharingLinkService.removeAssignmentsForSpace(normalizedId);
    SharingAuditService.recordEvent({
      type: 'space_deleted',
      spaceId: normalizedId,
      metadata: {
        removedAssignments,
      },
    });
    return true;
  }

  static updateMemberStatus(
    spaceId: string,
    memberId: string,
    status: CanonicalSharedMemberStatus
  ): CanonicalSharedSpace | null {
    const space = SecureAppSettings.getSharedSpaces().find((item) => item.id === spaceId);
    if (!space) return null;

    return this.saveSpace({
      ...space,
      members: space.members.map((member) =>
        member.id === memberId
          ? {
              ...member,
              status,
              last_verified_at: new Date().toISOString(),
            }
          : member
      ),
    });
  }

  static removeMember(spaceId: string, memberId: string): CanonicalSharedSpace | null {
    const space = SecureAppSettings.getSharedSpaces().find((item) => item.id === spaceId);
    if (!space) return null;

    return this.saveSpace({
      ...space,
      members: space.members.filter((member) => member.id !== memberId),
    });
  }

  private static recordMemberLifecycleEvents(
    previousSpace: CanonicalSharedSpace | undefined,
    nextSpace: CanonicalSharedSpace
  ): void {
    const previousMembers = new Map((previousSpace?.members || []).map((member) => [member.id, member]));
    const nextMembers = new Map(nextSpace.members.map((member) => [member.id, member]));

    nextSpace.members.forEach((member) => {
      const previous = previousMembers.get(member.id);
      if (!previous) {
        SharingAuditService.recordEvent({
          type: 'member_invited',
          spaceId: nextSpace.id,
          detail: describeMember(member),
          metadata: {
            status: member.status,
            role: member.role,
          },
        });
        return;
      }

      if (previous.status !== member.status || previous.role !== member.role) {
        SharingAuditService.recordEvent({
          type: 'member_status_changed',
          spaceId: nextSpace.id,
          detail: describeMember(member),
          metadata: {
            previousStatus: previous.status,
            nextStatus: member.status,
            previousRole: previous.role,
            nextRole: member.role,
          },
        });
      }
    });

    (previousSpace?.members || []).forEach((member) => {
      if (nextMembers.has(member.id)) return;
      SharingAuditService.recordEvent({
        type: 'member_removed',
        spaceId: nextSpace.id,
        detail: describeMember(member),
        metadata: {
          status: member.status,
          role: member.role,
        },
      });
    });
  }
}

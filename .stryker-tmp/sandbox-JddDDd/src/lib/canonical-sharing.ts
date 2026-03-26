// @ts-nocheck
import type {
  CanonicalSharingAssignment,
  CanonicalSharedMember,
  CanonicalSharedMemberStatus,
  CanonicalSharedRole,
  CanonicalSharedSpace,
  CanonicalSharedSpaceKind,
} from './canonical-schema';

type AndroidSharedVaultMemberLike = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  deviceLabel?: string;
  notes?: string;
  lastVerifiedAt?: string;
};

type AndroidSharedVaultSpaceLike = {
  id?: string;
  name?: string;
  kind?: string;
  description?: string;
  defaultRole?: string;
  allowExport?: boolean;
  requireReview?: boolean;
  createdAt?: string;
  updatedAt?: string;
  members?: AndroidSharedVaultMemberLike[];
};

type AndroidSharedItemAssignmentLike = {
  spaceId?: string;
  role?: string;
  sharedBy?: string;
  isSensitive?: boolean;
  emergencyAccess?: boolean;
  notes?: string;
  lastReviewedAt?: string;
};

const normalizeSharedRole = (value?: string): CanonicalSharedRole => {
  if (value === 'owner' || value === 'admin' || value === 'editor' || value === 'viewer') {
    return value;
  }
  return 'viewer';
};

const normalizeSharedStatus = (value?: string): CanonicalSharedMemberStatus => {
  if (value === 'active' || value === 'pending' || value === 'emergency_only') {
    return value;
  }
  return 'pending';
};

const normalizeSharedKind = (value?: string): CanonicalSharedSpaceKind => {
  if (value === 'private' || value === 'family' || value === 'team') {
    return value;
  }
  return 'private';
};

export const toCanonicalSharedMember = (
  member: AndroidSharedVaultMemberLike
): CanonicalSharedMember => ({
  id: member.id || crypto.randomUUID(),
  name: member.name || '',
  email: member.email || '',
  role: normalizeSharedRole(member.role),
  status: normalizeSharedStatus(member.status),
  device_label: member.deviceLabel || undefined,
  notes: member.notes || undefined,
  last_verified_at: member.lastVerifiedAt || undefined,
});

export const toCanonicalSharedSpace = (
  space: AndroidSharedVaultSpaceLike
): CanonicalSharedSpace => ({
  id: space.id || crypto.randomUUID(),
  name: space.name || 'Untitled Shared Space',
  kind: normalizeSharedKind(space.kind),
  description: space.description || '',
  default_role: normalizeSharedRole(space.defaultRole) === 'owner'
    ? 'viewer'
    : (normalizeSharedRole(space.defaultRole) as Exclude<CanonicalSharedRole, 'owner'>),
  allow_export: Boolean(space.allowExport),
  require_review: Boolean(space.requireReview),
  created_at: space.createdAt || new Date().toISOString(),
  updated_at: space.updatedAt || new Date().toISOString(),
  members: Array.isArray(space.members) ? space.members.map((member) => toCanonicalSharedMember(member)) : [],
});

export const toCanonicalSharedSpaces = (
  spaces: AndroidSharedVaultSpaceLike[]
): CanonicalSharedSpace[] => spaces.map((space) => toCanonicalSharedSpace(space));

export const toCanonicalSharingAssignment = (
  assignment: AndroidSharedItemAssignmentLike
): CanonicalSharingAssignment | null => {
  const spaceId = (assignment.spaceId || '').trim();
  if (!spaceId) return null;

  return {
    space_id: spaceId,
    role: assignment.role === 'editor' ? 'editor' : 'viewer',
    shared_by: (assignment.sharedBy || '').trim() || undefined,
    is_sensitive: Boolean(assignment.isSensitive),
    emergency_access: Boolean(assignment.emergencyAccess),
    notes: (assignment.notes || '').trim() || undefined,
    last_reviewed_at: (assignment.lastReviewedAt || '').trim() || undefined,
  };
};

export const toCanonicalSharingAssignments = (
  assignments: AndroidSharedItemAssignmentLike[]
): CanonicalSharingAssignment[] =>
  assignments
    .map((assignment) => toCanonicalSharingAssignment(assignment))
    .filter((assignment): assignment is CanonicalSharingAssignment => Boolean(assignment));

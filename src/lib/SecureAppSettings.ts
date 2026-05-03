import type {
  CanonicalSharingAssignment,
  CanonicalSharedMember,
  CanonicalSharedSpace,
} from './canonical-schema';
import type { AliasAuditEvent, AliasProviderProfile } from './alias-types';
import { DEFAULT_ALIAS_PROVIDER_PROFILES } from './alias-types';

type ViewDensity = 'comfortable' | 'compact';
type TotpVaultMode = 'same_vault' | 'separate_2fa_vault';
type ThemeMode = 'light' | 'dark' | 'system';
type EncryptionProfile = 'maximum' | 'balanced' | 'performance';
export type SecurityModeProfile = 'standard' | 'strict' | 'maximum';

interface HibpCacheState {
  hashes: Record<string, number>;
  lastUpdated: number;
}

interface VaultProfileState {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  dbName: string;
  isDefault: boolean;
}

export interface QRTransferLedgerRecord {
  sessionId: string;
  createdAt: string;
  expiresAt: string;
  entryCount: number;
  protectionMode: 'transfer-code' | 'transfer-code+ecdh';
  recipientFingerprint?: string;
  status: 'created' | 'consumed' | 'revoked';
  consumedAt?: string;
  revokedAt?: string;
  revokeReason?: string;
}

export interface QRTransferAuditEvent {
  id: string;
  sessionId?: string;
  type:
    | 'package_created'
    | 'package_consumed'
    | 'package_revoked'
    | 'package_rejected'
    | 'receiver_session_created';
  at: string;
  detail?: string;
  metadata?: Record<string, string | number | boolean | undefined>;
}

export interface SharingAuditEvent {
  id: string;
  at: string;
  type:
    | 'space_saved'
    | 'space_deleted'
    | 'space_restored'
    | 'space_deletion_failed'
    | 'member_invited'
    | 'member_status_changed'
    | 'member_removed'
    | 'assignment_saved'
    | 'assignment_cleared'
    | 'assignment_reviewed'
    | 'assignments_restored'
    | 'sharing_transport_encrypt'
    | 'sharing_transport_decrypt';
  entryId?: string;
  spaceId?: string;
  detail?: string;
  metadata?: Record<string, string | number | boolean | undefined>;
}

export interface SyncAuditEvent {
  id: string;
  at: string;
  type:
    | 'backup_import_completed'
    | 'structured_import_completed'
    | 'qr_import_completed'
    | 'canonical_restore_completed'
    | 'migration_completed';
  source: 'backup_import' | 'structured_import' | 'qr_import' | 'canonical_restore' | 'migration';
  detail?: string;
  metadata?: Record<string, string | number | boolean | undefined>;
}

export interface SecurityCenterHistoryEvent {
  id: string;
  at: string;
  action: 'reviewed' | 'reopened' | 'auto_resolved';
  reviewKey: string;
  issueType: string;
  title?: string;
}

export interface ReleaseTrustHistoryEvent {
  id: string;
  at: string;
  action: 'evidence_collected' | 'evidence_reopened' | 'owner_approved' | 'owner_approval_cleared';
  targetId: string;
  title?: string;
}

export type EmergencyAccessPermission = 'read_only' | 'full_access';
export type EmergencyAccessRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'granted'
  | 'revoked'
  | 'expired';

export interface EmergencyAccessContact {
  id: string;
  name: string;
  email: string;
  permission: EmergencyAccessPermission;
  wait_hours: number;
  enabled: boolean;
  note?: string;
  created_at: string;
  updated_at: string;
  last_requested_at?: string;
}

export interface EmergencyAccessRequest {
  id: string;
  contact_id: string;
  status: EmergencyAccessRequestStatus;
  requested_at: string;
  unlock_at: string;
  scope: 'vault' | 'selected_entries';
  entry_ids?: number[];
  requester_note?: string;
  owner_note?: string;
  decided_at?: string;
  granted_at?: string;
  revoked_at?: string;
  expires_at?: string;
}

export interface EmergencyAccessAuditEvent {
  id: string;
  at: string;
  type:
    | 'contact_saved'
    | 'contact_deleted'
    | 'request_created'
    | 'request_approved'
    | 'request_rejected'
    | 'grant_activated'
    | 'grant_revoked'
    | 'grant_expired'
    | 'request_auto_expired';
  contactId?: string;
  requestId?: string;
  detail?: string;
  metadata?: Record<string, string | number | boolean | undefined>;
}

export interface EmergencyAccessPolicy {
  enabled: boolean;
  require_manual_approval: boolean;
  default_wait_hours: number;
  grant_ttl_hours: number;
}

interface SecureAppSettingsState {
  securityModeProfile: SecurityModeProfile;
  plaintextExportEnabled: boolean;
  hibpEnabled: boolean;
  hibpCache: HibpCacheState | null;
  autoLockTime: number;
  clipboardClearSeconds: number;
  viewDensity: ViewDensity;
  themeMode: ThemeMode;
  hasSeenTour: boolean;
  encryptionProfile: EncryptionProfile;
  vaultProfiles: VaultProfileState[];
  activeVaultId: string;
  totpVaultMode: TotpVaultMode;
  totpVaultId: string | null;
  qrConsumedPackages: Record<string, string>;
  qrTransferLedger: Record<string, QRTransferLedgerRecord>;
  qrTransferAudit: QRTransferAuditEvent[];
  sharedSpaces: CanonicalSharedSpace[];
  sharedItemAssignments: Record<string, CanonicalSharingAssignment[]>;
  sharingAudit: SharingAuditEvent[];
  syncAudit: SyncAuditEvent[];
  securityCenterReviews: Record<string, string>;
  securityCenterHistory: SecurityCenterHistoryEvent[];
  releaseTrustChecklist: Record<string, string>;
  releaseTrustApprovals: Record<string, string>;
  releaseTrustHistory: ReleaseTrustHistoryEvent[];
  aliasProviders: AliasProviderProfile[];
  aliasAudit: AliasAuditEvent[];
  emergencyAccessContacts: EmergencyAccessContact[];
  emergencyAccessRequests: EmergencyAccessRequest[];
  emergencyAccessAudit: EmergencyAccessAuditEvent[];
  emergencyAccessPolicy: EmergencyAccessPolicy;
  syncRelayEnabled: boolean;
  syncRelaySessionId: string | null;
  syncRelayUrl: string | null;
  syncRelayApiKey: string | null;
  syncRelayLastSequence: number;
  syncRelayLastTimestamp: string | null;
}

const DB_NAME = 'aegis-secure-meta-v1';
const STORE_NAME = 'secure_kv';
const SETTINGS_KEY = 'app_settings_v1';

const LEGACY_KEYS = {
  securityModeProfile: 'aegis_security_mode_profile',
  plaintextExport: 'aegis_allow_plaintext_export',
  hibpEnabled: 'aegis_hibp_enabled',
  hibpCache: 'aegis_hibp_cache',
  autoLockTime: 'aegis_auto_lock_time',
  clipboardClearSeconds: 'aegis_clipboard_clear_seconds',
  idleTimeout: 'aegis_idle_timeout',
  viewDensity: 'aegis:view-density',
  themeMode: 'aegis:theme-mode',
  seenTour: 'aegis_seen_tour',
  encryptionProfile: 'aegis_encryption_profile',
  vaultProfiles: 'aegis_vault_profiles',
  activeVaultId: 'aegis_active_vault',
  totpMode: 'aegis_totp_vault_mode',
  totpVaultId: 'aegis_totp_vault_id',
  qrConsumedPackages: 'aegis_qr_sync_consumed_v1',
  qrTransferLedger: 'aegis_qr_sync_ledger_v1',
  qrTransferAudit: 'aegis_qr_sync_audit_v1',
  sharedSpaces: 'aegis_shared_spaces_v1',
  sharedItemAssignments: 'aegis_shared_item_assignments_v1',
  sharingAudit: 'aegis_sharing_audit_v1',
  syncAudit: 'aegis_sync_audit_v1',
  releaseTrustChecklist: 'aegis_release_trust_checklist_v1',
  releaseTrustApprovals: 'aegis_release_trust_approvals_v1',
  releaseTrustHistory: 'aegis_release_trust_history_v1',
  emergencyAccessContacts: 'aegis_emergency_access_contacts_v1',
  emergencyAccessRequests: 'aegis_emergency_access_requests_v1',
  emergencyAccessAudit: 'aegis_emergency_access_audit_v1',
  emergencyAccessPolicy: 'aegis_emergency_access_policy_v1',
} as const;

const DEFAULT_STATE: SecureAppSettingsState = {
  securityModeProfile: 'standard',
  plaintextExportEnabled: false,
  hibpEnabled: false,
  hibpCache: null,
  autoLockTime: 2,
  clipboardClearSeconds: 30,
  viewDensity: 'comfortable',
  themeMode: 'light',
  hasSeenTour: false,
  encryptionProfile: 'balanced',
  vaultProfiles: [],
  activeVaultId: 'default',
  totpVaultMode: 'same_vault',
  totpVaultId: null,
  qrConsumedPackages: {},
  qrTransferLedger: {},
  qrTransferAudit: [],
  sharedSpaces: [],
  sharedItemAssignments: {},
  sharingAudit: [],
  syncAudit: [],
  securityCenterReviews: {},
  securityCenterHistory: [],
  releaseTrustChecklist: {},
  releaseTrustApprovals: {},
  releaseTrustHistory: [],
  aliasProviders: DEFAULT_ALIAS_PROVIDER_PROFILES.map((profile) => ({ ...profile })),
  aliasAudit: [],
  emergencyAccessContacts: [],
  emergencyAccessRequests: [],
  emergencyAccessAudit: [],
  emergencyAccessPolicy: {
    enabled: true,
    require_manual_approval: true,
    default_wait_hours: 48,
    grant_ttl_hours: 24,
  },
  syncRelayEnabled: false,
  syncRelaySessionId: null,
  syncRelayUrl: null,
  syncRelayApiKey: null,
  syncRelayLastSequence: 0,
  syncRelayLastTimestamp: null,
};

const cloneCanonicalSharedMember = (member: CanonicalSharedMember): CanonicalSharedMember => ({
  ...member,
});

const cloneCanonicalSharedSpace = (space: CanonicalSharedSpace): CanonicalSharedSpace => ({
  ...space,
  members: space.members.map((member) => cloneCanonicalSharedMember(member)),
});

const cloneCanonicalSharingAssignment = (
  assignment: CanonicalSharingAssignment
): CanonicalSharingAssignment => ({
  ...assignment,
});

let stateCache: SecureAppSettingsState = { ...DEFAULT_STATE };
let initialized = false;
let bootstrapped = false;
let initPromise: Promise<void> | null = null;
let persistPromise: Promise<void> = Promise.resolve();

const hasIndexedDb = () => typeof indexedDB !== 'undefined';

const cloneState = (state: SecureAppSettingsState): SecureAppSettingsState => ({
  securityModeProfile: state.securityModeProfile,
  plaintextExportEnabled: Boolean(state.plaintextExportEnabled),
  hibpEnabled: Boolean(state.hibpEnabled),
  hibpCache: state.hibpCache
    ? {
        hashes: { ...state.hibpCache.hashes },
        lastUpdated: state.hibpCache.lastUpdated,
      }
    : null,
  autoLockTime: state.autoLockTime,
  clipboardClearSeconds: state.clipboardClearSeconds,
  viewDensity: state.viewDensity,
  themeMode: state.themeMode,
  hasSeenTour: state.hasSeenTour,
  encryptionProfile: state.encryptionProfile,
  vaultProfiles: state.vaultProfiles.map((profile) => ({ ...profile })),
  activeVaultId: state.activeVaultId,
  totpVaultMode: state.totpVaultMode,
  totpVaultId: state.totpVaultId,
  qrConsumedPackages: { ...state.qrConsumedPackages },
  qrTransferLedger: Object.fromEntries(
    Object.entries(state.qrTransferLedger).map(([key, value]) => [key, { ...value }])
  ),
  qrTransferAudit: state.qrTransferAudit.map((event) => ({
    ...event,
    metadata: event.metadata ? { ...event.metadata } : undefined,
  })),
  sharedSpaces: state.sharedSpaces.map((space) => cloneCanonicalSharedSpace(space)),
  sharedItemAssignments: Object.fromEntries(
    Object.entries(state.sharedItemAssignments).map(([key, assignments]) => [
      key,
      assignments.map((assignment) => cloneCanonicalSharingAssignment(assignment)),
    ])
  ),
  sharingAudit: state.sharingAudit.map((event) => ({
    ...event,
    metadata: event.metadata ? { ...event.metadata } : undefined,
  })),
  syncAudit: state.syncAudit.map((event) => ({
    ...event,
    metadata: event.metadata ? { ...event.metadata } : undefined,
  })),
  securityCenterReviews: { ...state.securityCenterReviews },
  securityCenterHistory: state.securityCenterHistory.map((event) => ({ ...event })),
  releaseTrustChecklist: { ...state.releaseTrustChecklist },
  releaseTrustApprovals: { ...state.releaseTrustApprovals },
  releaseTrustHistory: state.releaseTrustHistory.map((event) => ({ ...event })),
  aliasProviders: state.aliasProviders.map((profile) => ({
    ...profile,
    domains: [...profile.domains],
    capabilities: profile.capabilities ? { ...profile.capabilities } : undefined,
  })),
  aliasAudit: state.aliasAudit.map((event) => ({
    ...event,
    metadata: event.metadata ? { ...event.metadata } : undefined,
  })),
  emergencyAccessContacts: state.emergencyAccessContacts.map((contact) => ({ ...contact })),
  emergencyAccessRequests: state.emergencyAccessRequests.map((request) => ({
    ...request,
    entry_ids: Array.isArray(request.entry_ids) ? [...request.entry_ids] : undefined,
  })),
  emergencyAccessAudit: state.emergencyAccessAudit.map((event) => ({
    ...event,
    metadata: event.metadata ? { ...event.metadata } : undefined,
  })),
  emergencyAccessPolicy: { ...state.emergencyAccessPolicy },
  syncRelayEnabled: Boolean(state.syncRelayEnabled),
  syncRelaySessionId: state.syncRelaySessionId,
  syncRelayUrl: state.syncRelayUrl,
  syncRelayApiKey: state.syncRelayApiKey,
  syncRelayLastSequence: state.syncRelayLastSequence || 0,
  syncRelayLastTimestamp: state.syncRelayLastTimestamp,
});

const normalizeEmergencyAccessContact = (value: unknown): EmergencyAccessContact | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<EmergencyAccessContact>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.name !== 'string' ||
    typeof candidate.email !== 'string' ||
    typeof candidate.created_at !== 'string' ||
    typeof candidate.updated_at !== 'string'
  ) {
    return null;
  }

  const waitHoursRaw = Number(candidate.wait_hours);
  const wait_hours = Number.isFinite(waitHoursRaw)
    ? Math.min(720, Math.max(1, Math.round(waitHoursRaw)))
    : 48;

  return {
    id: candidate.id,
    name: candidate.name,
    email: candidate.email,
    permission: candidate.permission === 'full_access' ? 'full_access' : 'read_only',
    wait_hours,
    enabled: candidate.enabled !== false,
    note: typeof candidate.note === 'string' ? candidate.note : undefined,
    created_at: candidate.created_at,
    updated_at: candidate.updated_at,
    last_requested_at:
      typeof candidate.last_requested_at === 'string' ? candidate.last_requested_at : undefined,
  };
};

const normalizeAliasProviderProfile = (value: unknown): AliasProviderProfile | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<AliasProviderProfile>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.name !== 'string' ||
    typeof candidate.kind !== 'string' ||
    !Array.isArray(candidate.domains) ||
    typeof candidate.defaultDomain !== 'string' ||
    typeof candidate.generationStrategy !== 'string' ||
    typeof candidate.createdAt !== 'string' ||
    typeof candidate.updatedAt !== 'string'
  ) {
    return null;
  }

  const domains = candidate.domains
    .map((domain) =>
      String(domain || '')
        .trim()
        .toLowerCase()
    )
    .filter(Boolean);
  if (domains.length === 0) return null;

  const defaultDomain = String(candidate.defaultDomain || '')
    .trim()
    .toLowerCase();
  if (!defaultDomain) return null;

  return {
    id: candidate.id,
    name: candidate.name.trim(),
    kind:
      candidate.kind === 'simplelogin' ||
      candidate.kind === 'addy' ||
      candidate.kind === 'duckduckgo' ||
      candidate.kind === 'firefox_relay' ||
      candidate.kind === 'custom'
        ? candidate.kind
        : 'custom',
    domains,
    defaultDomain: domains.includes(defaultDomain) ? defaultDomain : domains[0],
    forwardTo: typeof candidate.forwardTo === 'string' ? candidate.forwardTo.trim() : undefined,
    generationStrategy:
      candidate.generationStrategy === 'random' ||
      candidate.generationStrategy === 'site_name' ||
      candidate.generationStrategy === 'site_plus_random'
        ? candidate.generationStrategy
        : 'site_plus_random',
    description:
      typeof candidate.description === 'string' ? candidate.description.trim() : undefined,
    enabled: candidate.enabled !== false,
    isDefault: Boolean(candidate.isDefault),
    syncMode: candidate.syncMode === 'api' ? 'api' : 'manual',
    syncStatus:
      candidate.syncStatus === 'ready' ||
      candidate.syncStatus === 'linked' ||
      candidate.syncStatus === 'error'
        ? candidate.syncStatus
        : candidate.syncMode === 'api'
          ? 'ready'
          : 'manual',
    accountLabel:
      typeof candidate.accountLabel === 'string' ? candidate.accountLabel.trim() : undefined,
    apiBaseUrl: typeof candidate.apiBaseUrl === 'string' ? candidate.apiBaseUrl.trim() : undefined,
    apiToken: typeof candidate.apiToken === 'string' ? candidate.apiToken.trim() : undefined,
    managementUrl:
      typeof candidate.managementUrl === 'string' ? candidate.managementUrl.trim() : undefined,
    capabilities:
      candidate.capabilities && typeof candidate.capabilities === 'object'
        ? {
            canProvision:
              (candidate.capabilities as { canProvision?: boolean }).canProvision !== false,
            canRotate: (candidate.capabilities as { canRotate?: boolean }).canRotate !== false,
            canDeactivate:
              (candidate.capabilities as { canDeactivate?: boolean }).canDeactivate !== false,
            canManageOnline:
              (candidate.capabilities as { canManageOnline?: boolean }).canManageOnline !== false,
          }
        : undefined,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
  };
};

const normalizeAliasAuditEvent = (value: unknown): AliasAuditEvent | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<AliasAuditEvent>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.at !== 'string' ||
    typeof candidate.type !== 'string'
  ) {
    return null;
  }

  return {
    id: candidate.id,
    at: candidate.at,
    type:
      candidate.type === 'provider_saved' ||
      candidate.type === 'provider_deleted' ||
      candidate.type === 'alias_generated' ||
      candidate.type === 'alias_attached' ||
      candidate.type === 'alias_rotated' ||
      candidate.type === 'alias_marked_exposed' ||
      candidate.type === 'alias_cleared'
        ? candidate.type
        : 'alias_generated',
    aliasEmail: typeof candidate.aliasEmail === 'string' ? candidate.aliasEmail : undefined,
    providerId: typeof candidate.providerId === 'string' ? candidate.providerId : undefined,
    entryId:
      typeof candidate.entryId === 'number' && Number.isFinite(candidate.entryId)
        ? candidate.entryId
        : undefined,
    detail: typeof candidate.detail === 'string' ? candidate.detail : undefined,
    metadata:
      candidate.metadata && typeof candidate.metadata === 'object'
        ? Object.fromEntries(
            Object.entries(candidate.metadata).filter(
              ([, item]) =>
                item === undefined ||
                typeof item === 'string' ||
                typeof item === 'number' ||
                typeof item === 'boolean'
            )
          )
        : undefined,
  };
};

const normalizeEmergencyAccessRequest = (value: unknown): EmergencyAccessRequest | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<EmergencyAccessRequest>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.contact_id !== 'string' ||
    typeof candidate.status !== 'string' ||
    typeof candidate.requested_at !== 'string' ||
    typeof candidate.unlock_at !== 'string'
  ) {
    return null;
  }

  const status: EmergencyAccessRequestStatus =
    candidate.status === 'approved' ||
    candidate.status === 'rejected' ||
    candidate.status === 'granted' ||
    candidate.status === 'revoked' ||
    candidate.status === 'expired'
      ? candidate.status
      : 'pending';

  return {
    id: candidate.id,
    contact_id: candidate.contact_id,
    status,
    requested_at: candidate.requested_at,
    unlock_at: candidate.unlock_at,
    scope: candidate.scope === 'selected_entries' ? 'selected_entries' : 'vault',
    entry_ids: Array.isArray(candidate.entry_ids)
      ? candidate.entry_ids
          .map((entryId) => Number(entryId))
          .filter((entryId) => Number.isFinite(entryId) && entryId > 0)
      : undefined,
    requester_note:
      typeof candidate.requester_note === 'string' ? candidate.requester_note : undefined,
    owner_note: typeof candidate.owner_note === 'string' ? candidate.owner_note : undefined,
    decided_at: typeof candidate.decided_at === 'string' ? candidate.decided_at : undefined,
    granted_at: typeof candidate.granted_at === 'string' ? candidate.granted_at : undefined,
    revoked_at: typeof candidate.revoked_at === 'string' ? candidate.revoked_at : undefined,
    expires_at: typeof candidate.expires_at === 'string' ? candidate.expires_at : undefined,
  };
};

const normalizeEmergencyAccessAuditEvent = (value: unknown): EmergencyAccessAuditEvent | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<EmergencyAccessAuditEvent>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.at !== 'string' ||
    typeof candidate.type !== 'string'
  ) {
    return null;
  }

  return {
    id: candidate.id,
    at: candidate.at,
    type:
      candidate.type === 'contact_saved' ||
      candidate.type === 'contact_deleted' ||
      candidate.type === 'request_created' ||
      candidate.type === 'request_approved' ||
      candidate.type === 'request_rejected' ||
      candidate.type === 'grant_activated' ||
      candidate.type === 'grant_revoked' ||
      candidate.type === 'grant_expired' ||
      candidate.type === 'request_auto_expired'
        ? candidate.type
        : 'request_created',
    contactId: typeof candidate.contactId === 'string' ? candidate.contactId : undefined,
    requestId: typeof candidate.requestId === 'string' ? candidate.requestId : undefined,
    detail: typeof candidate.detail === 'string' ? candidate.detail : undefined,
    metadata:
      candidate.metadata && typeof candidate.metadata === 'object'
        ? Object.fromEntries(
            Object.entries(candidate.metadata).filter(
              ([, value]) =>
                value === undefined ||
                typeof value === 'string' ||
                typeof value === 'number' ||
                typeof value === 'boolean'
            )
          )
        : undefined,
  };
};

const normalizeSharedMember = (value: unknown): CanonicalSharedMember | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<CanonicalSharedMember>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.name !== 'string' ||
    typeof candidate.email !== 'string'
  ) {
    return null;
  }

  return {
    id: candidate.id,
    name: candidate.name,
    email: candidate.email,
    role:
      candidate.role === 'owner' ||
      candidate.role === 'admin' ||
      candidate.role === 'editor' ||
      candidate.role === 'viewer'
        ? candidate.role
        : 'viewer',
    status:
      candidate.status === 'active' ||
      candidate.status === 'pending' ||
      candidate.status === 'emergency_only'
        ? candidate.status
        : 'pending',
    device_label: typeof candidate.device_label === 'string' ? candidate.device_label : undefined,
    notes: typeof candidate.notes === 'string' ? candidate.notes : undefined,
    last_verified_at:
      typeof candidate.last_verified_at === 'string' ? candidate.last_verified_at : undefined,
  };
};

const normalizeSharedSpace = (value: unknown): CanonicalSharedSpace | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<CanonicalSharedSpace>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.name !== 'string' ||
    typeof candidate.description !== 'string' ||
    typeof candidate.created_at !== 'string' ||
    typeof candidate.updated_at !== 'string'
  ) {
    return null;
  }

  const members = Array.isArray(candidate.members)
    ? candidate.members
        .map((member) => normalizeSharedMember(member))
        .filter((member): member is CanonicalSharedMember => Boolean(member))
    : [];

  return {
    id: candidate.id,
    name: candidate.name,
    kind:
      candidate.kind === 'family' || candidate.kind === 'team' || candidate.kind === 'private'
        ? candidate.kind
        : 'private',
    description: candidate.description,
    default_role:
      candidate.default_role === 'admin' ||
      candidate.default_role === 'editor' ||
      candidate.default_role === 'viewer'
        ? candidate.default_role
        : 'viewer',
    allow_export: Boolean(candidate.allow_export),
    require_review: Boolean(candidate.require_review),
    created_at: candidate.created_at,
    updated_at: candidate.updated_at,
    members,
  };
};

const normalizeSharingAssignment = (value: unknown): CanonicalSharingAssignment | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<CanonicalSharingAssignment>;
  if (typeof candidate.space_id !== 'string' || !candidate.space_id.trim()) {
    return null;
  }

  return {
    space_id: candidate.space_id.trim(),
    role: candidate.role === 'editor' ? 'editor' : 'viewer',
    shared_by: typeof candidate.shared_by === 'string' ? candidate.shared_by : undefined,
    is_sensitive: Boolean(candidate.is_sensitive),
    emergency_access: Boolean(candidate.emergency_access),
    notes: typeof candidate.notes === 'string' ? candidate.notes : undefined,
    last_reviewed_at:
      typeof candidate.last_reviewed_at === 'string' ? candidate.last_reviewed_at : undefined,
  };
};

const normalizeState = (value: unknown): SecureAppSettingsState => {
  const candidate =
    value && typeof value === 'object' ? (value as Partial<SecureAppSettingsState>) : {};
  const hibpCache =
    candidate.hibpCache && typeof candidate.hibpCache === 'object'
      ? (candidate.hibpCache as HibpCacheState)
      : null;
  const aliasProviders = Array.isArray(candidate.aliasProviders)
    ? candidate.aliasProviders
        .map((profile) => normalizeAliasProviderProfile(profile))
        .filter((profile): profile is AliasProviderProfile => Boolean(profile))
    : [];
  const aliasAudit = Array.isArray(candidate.aliasAudit)
    ? candidate.aliasAudit
        .map((event) => normalizeAliasAuditEvent(event))
        .filter((event): event is AliasAuditEvent => Boolean(event))
    : [];
  const vaultProfiles = Array.isArray(candidate.vaultProfiles)
    ? candidate.vaultProfiles
        .filter(
          (profile): profile is VaultProfileState =>
            Boolean(profile) &&
            typeof profile === 'object' &&
            typeof (profile as VaultProfileState).id === 'string' &&
            typeof (profile as VaultProfileState).name === 'string' &&
            typeof (profile as VaultProfileState).color === 'string' &&
            typeof (profile as VaultProfileState).createdAt === 'string' &&
            typeof (profile as VaultProfileState).dbName === 'string'
        )
        .map((profile) => ({
          id: profile.id,
          name: profile.name,
          color: profile.color,
          createdAt: profile.createdAt,
          dbName: profile.dbName,
          isDefault: Boolean(profile.isDefault),
        }))
    : [];
  const sharedSpaces = Array.isArray(candidate.sharedSpaces)
    ? candidate.sharedSpaces
        .map((space) => normalizeSharedSpace(space))
        .filter((space): space is CanonicalSharedSpace => Boolean(space))
    : [];
  const sharedItemAssignments =
    candidate.sharedItemAssignments && typeof candidate.sharedItemAssignments === 'object'
      ? (Object.fromEntries(
          Object.entries(candidate.sharedItemAssignments as Record<string, unknown>).map(
            ([key, assignments]) => [
              key,
              Array.isArray(assignments)
                ? assignments
                    .map((assignment) => normalizeSharingAssignment(assignment))
                    .filter((assignment): assignment is CanonicalSharingAssignment =>
                      Boolean(assignment)
                    )
                : [],
            ]
          )
        ) as Record<string, CanonicalSharingAssignment[]>)
      : {};
  const sharingAudit = Array.isArray(candidate.sharingAudit)
    ? candidate.sharingAudit
        .filter(
          (event): event is SharingAuditEvent =>
            Boolean(event) &&
            typeof event === 'object' &&
            typeof (event as SharingAuditEvent).id === 'string' &&
            typeof (event as SharingAuditEvent).type === 'string' &&
            typeof (event as SharingAuditEvent).at === 'string'
        )
        .map((event) => ({
          ...event,
          metadata:
            event.metadata && typeof event.metadata === 'object'
              ? Object.fromEntries(
                  Object.entries(event.metadata).filter(
                    ([, value]) =>
                      value === undefined ||
                      typeof value === 'string' ||
                      typeof value === 'number' ||
                      typeof value === 'boolean'
                  )
                )
              : undefined,
        }))
    : [];
  const syncAudit = Array.isArray(candidate.syncAudit)
    ? candidate.syncAudit
        .filter(
          (event): event is SyncAuditEvent =>
            Boolean(event) &&
            typeof event === 'object' &&
            typeof (event as SyncAuditEvent).id === 'string' &&
            typeof (event as SyncAuditEvent).type === 'string' &&
            typeof (event as SyncAuditEvent).at === 'string' &&
            typeof (event as SyncAuditEvent).source === 'string'
        )
        .map((event) => ({
          ...event,
          metadata:
            event.metadata && typeof event.metadata === 'object'
              ? Object.fromEntries(
                  Object.entries(event.metadata).filter(
                    ([, value]) =>
                      value === undefined ||
                      typeof value === 'string' ||
                      typeof value === 'number' ||
                      typeof value === 'boolean'
                  )
                )
              : undefined,
        }))
    : [];
  const securityCenterReviews =
    candidate.securityCenterReviews && typeof candidate.securityCenterReviews === 'object'
      ? (Object.fromEntries(
          Object.entries(candidate.securityCenterReviews as Record<string, unknown>).filter(
            ([key, value]) => Boolean(key) && typeof value === 'string'
          )
        ) as Record<string, string>)
      : {};
  const securityCenterHistory = Array.isArray(candidate.securityCenterHistory)
    ? candidate.securityCenterHistory
        .filter(
          (event): event is SecurityCenterHistoryEvent =>
            Boolean(event) &&
            typeof event === 'object' &&
            typeof (event as SecurityCenterHistoryEvent).id === 'string' &&
            typeof (event as SecurityCenterHistoryEvent).at === 'string' &&
            typeof (event as SecurityCenterHistoryEvent).action === 'string' &&
            typeof (event as SecurityCenterHistoryEvent).reviewKey === 'string' &&
            typeof (event as SecurityCenterHistoryEvent).issueType === 'string'
        )
        .map((event) => ({ ...event }))
    : [];
  const releaseTrustChecklist =
    candidate.releaseTrustChecklist && typeof candidate.releaseTrustChecklist === 'object'
      ? (Object.fromEntries(
          Object.entries(candidate.releaseTrustChecklist as Record<string, unknown>).filter(
            ([key, value]) => Boolean(key) && typeof value === 'string'
          )
        ) as Record<string, string>)
      : {};
  const releaseTrustApprovals =
    candidate.releaseTrustApprovals && typeof candidate.releaseTrustApprovals === 'object'
      ? (Object.fromEntries(
          Object.entries(candidate.releaseTrustApprovals as Record<string, unknown>).filter(
            ([key, value]) => Boolean(key) && typeof value === 'string'
          )
        ) as Record<string, string>)
      : {};
  const releaseTrustHistory = Array.isArray(candidate.releaseTrustHistory)
    ? candidate.releaseTrustHistory
        .filter(
          (event): event is ReleaseTrustHistoryEvent =>
            Boolean(event) &&
            typeof event === 'object' &&
            typeof (event as ReleaseTrustHistoryEvent).id === 'string' &&
            typeof (event as ReleaseTrustHistoryEvent).at === 'string' &&
            typeof (event as ReleaseTrustHistoryEvent).action === 'string' &&
            typeof (event as ReleaseTrustHistoryEvent).targetId === 'string'
        )
        .map((event) => ({ ...event }))
    : [];
  const emergencyAccessContacts = Array.isArray(candidate.emergencyAccessContacts)
    ? candidate.emergencyAccessContacts
        .map((contact) => normalizeEmergencyAccessContact(contact))
        .filter((contact): contact is EmergencyAccessContact => Boolean(contact))
    : [];
  const emergencyAccessRequests = Array.isArray(candidate.emergencyAccessRequests)
    ? candidate.emergencyAccessRequests
        .map((request) => normalizeEmergencyAccessRequest(request))
        .filter((request): request is EmergencyAccessRequest => Boolean(request))
    : [];
  const emergencyAccessAudit = Array.isArray(candidate.emergencyAccessAudit)
    ? candidate.emergencyAccessAudit
        .map((event) => normalizeEmergencyAccessAuditEvent(event))
        .filter((event): event is EmergencyAccessAuditEvent => Boolean(event))
    : [];
  const emergencyAccessPolicyRaw =
    candidate.emergencyAccessPolicy && typeof candidate.emergencyAccessPolicy === 'object'
      ? (candidate.emergencyAccessPolicy as Partial<EmergencyAccessPolicy>)
      : {};
  const emergencyAccessPolicy: EmergencyAccessPolicy = {
    enabled: emergencyAccessPolicyRaw.enabled !== false,
    require_manual_approval: emergencyAccessPolicyRaw.require_manual_approval !== false,
    default_wait_hours: Number.isFinite(Number(emergencyAccessPolicyRaw.default_wait_hours))
      ? Math.min(720, Math.max(1, Math.round(Number(emergencyAccessPolicyRaw.default_wait_hours))))
      : DEFAULT_STATE.emergencyAccessPolicy.default_wait_hours,
    grant_ttl_hours: Number.isFinite(Number(emergencyAccessPolicyRaw.grant_ttl_hours))
      ? Math.min(720, Math.max(1, Math.round(Number(emergencyAccessPolicyRaw.grant_ttl_hours))))
      : DEFAULT_STATE.emergencyAccessPolicy.grant_ttl_hours,
  };
  return {
    securityModeProfile:
      candidate.securityModeProfile === 'strict' || candidate.securityModeProfile === 'maximum'
        ? candidate.securityModeProfile
        : 'standard',
    plaintextExportEnabled: Boolean(candidate.plaintextExportEnabled),
    hibpEnabled: Boolean(candidate.hibpEnabled),
    hibpCache:
      hibpCache && hibpCache.hashes && typeof hibpCache.hashes === 'object'
        ? {
            hashes: Object.fromEntries(
              Object.entries(hibpCache.hashes).filter(([, count]) => typeof count === 'number')
            ),
            lastUpdated:
              typeof hibpCache.lastUpdated === 'number' ? hibpCache.lastUpdated : Date.now(),
          }
        : null,
    autoLockTime:
      typeof candidate.autoLockTime === 'number' && !Number.isNaN(candidate.autoLockTime)
        ? candidate.autoLockTime
        : DEFAULT_STATE.autoLockTime,
    clipboardClearSeconds:
      typeof candidate.clipboardClearSeconds === 'number' &&
      !Number.isNaN(candidate.clipboardClearSeconds)
        ? Math.min(300, Math.max(5, Math.round(candidate.clipboardClearSeconds)))
        : DEFAULT_STATE.clipboardClearSeconds,
    viewDensity: candidate.viewDensity === 'compact' ? 'compact' : 'comfortable',
    themeMode:
      candidate.themeMode === 'dark' || candidate.themeMode === 'system'
        ? candidate.themeMode
        : 'light',
    hasSeenTour: Boolean(candidate.hasSeenTour),
    encryptionProfile:
      candidate.encryptionProfile === 'maximum' || candidate.encryptionProfile === 'performance'
        ? candidate.encryptionProfile
        : 'balanced',
    vaultProfiles,
    activeVaultId:
      typeof candidate.activeVaultId === 'string' && candidate.activeVaultId.trim()
        ? candidate.activeVaultId
        : 'default',
    totpVaultMode:
      candidate.totpVaultMode === 'separate_2fa_vault' ? 'separate_2fa_vault' : 'same_vault',
    totpVaultId:
      typeof candidate.totpVaultId === 'string' && candidate.totpVaultId.trim()
        ? candidate.totpVaultId.trim()
        : null,
    qrConsumedPackages:
      candidate.qrConsumedPackages && typeof candidate.qrConsumedPackages === 'object'
        ? (Object.fromEntries(
            Object.entries(candidate.qrConsumedPackages as Record<string, unknown>).filter(
              ([key, value]) => Boolean(key) && typeof value === 'string'
            )
          ) as Record<string, string>)
        : {},
    qrTransferLedger:
      candidate.qrTransferLedger && typeof candidate.qrTransferLedger === 'object'
        ? (Object.fromEntries(
            Object.entries(candidate.qrTransferLedger as Record<string, unknown>).filter(
              ([key, value]) =>
                Boolean(key) &&
                Boolean(value) &&
                typeof value === 'object' &&
                typeof (value as QRTransferLedgerRecord).sessionId === 'string' &&
                typeof (value as QRTransferLedgerRecord).createdAt === 'string' &&
                typeof (value as QRTransferLedgerRecord).expiresAt === 'string'
            )
          ) as Record<string, QRTransferLedgerRecord>)
        : {},
    qrTransferAudit: Array.isArray(candidate.qrTransferAudit)
      ? candidate.qrTransferAudit
          .filter(
            (event): event is QRTransferAuditEvent =>
              Boolean(event) &&
              typeof event === 'object' &&
              typeof (event as QRTransferAuditEvent).id === 'string' &&
              typeof (event as QRTransferAuditEvent).type === 'string' &&
              typeof (event as QRTransferAuditEvent).at === 'string'
          )
          .map((event) => ({
            ...event,
            metadata:
              event.metadata && typeof event.metadata === 'object'
                ? Object.fromEntries(
                    Object.entries(event.metadata).filter(
                      ([, value]) =>
                        value === undefined ||
                        typeof value === 'string' ||
                        typeof value === 'number' ||
                        typeof value === 'boolean'
                    )
                  )
                : undefined,
          }))
      : [],
    sharedSpaces,
    sharedItemAssignments,
    sharingAudit,
    syncAudit,
    securityCenterReviews,
    securityCenterHistory,
    releaseTrustChecklist,
    releaseTrustApprovals,
    releaseTrustHistory,
    aliasProviders:
      aliasProviders.length > 0
        ? aliasProviders
        : DEFAULT_ALIAS_PROVIDER_PROFILES.map((profile) => ({ ...profile })),
    aliasAudit,
    emergencyAccessContacts,
    emergencyAccessRequests,
    emergencyAccessAudit,
    emergencyAccessPolicy,
    syncRelayEnabled: Boolean(candidate.syncRelayEnabled),
    syncRelaySessionId:
      typeof candidate.syncRelaySessionId === 'string' ? candidate.syncRelaySessionId : null,
    syncRelayUrl: typeof candidate.syncRelayUrl === 'string' ? candidate.syncRelayUrl : null,
    syncRelayApiKey:
      typeof candidate.syncRelayApiKey === 'string' ? candidate.syncRelayApiKey : null,
    syncRelayLastSequence:
      typeof candidate.syncRelayLastSequence === 'number' ? candidate.syncRelayLastSequence : 0,
    syncRelayLastTimestamp:
      typeof candidate.syncRelayLastTimestamp === 'string'
        ? candidate.syncRelayLastTimestamp
        : null,
  };
};

const openDb = async (): Promise<IDBDatabase | null> => {
  if (!hasIndexedDb()) return null;
  return await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('SECURE_SETTINGS_DB_OPEN_FAILED'));
  });
};

const readStateFromDb = async (): Promise<SecureAppSettingsState | null> => {
  const db = await openDb();
  if (!db) return null;
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(SETTINGS_KEY);
    request.onsuccess = () => resolve(request.result ? normalizeState(request.result) : null);
    request.onerror = () => reject(request.error || new Error('SECURE_SETTINGS_DB_READ_FAILED'));
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error || new Error('SECURE_SETTINGS_DB_READ_FAILED'));
  });
};

const writeStateToDb = async (state: SecureAppSettingsState): Promise<void> => {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(cloneState(state), SETTINGS_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error || new Error('SECURE_SETTINGS_DB_WRITE_FAILED'));
  });
};

const loadLegacyState = (): SecureAppSettingsState => {
  try {
    const hibpCacheRaw = localStorage.getItem(LEGACY_KEYS.hibpCache);
    const hibpCacheParsed = hibpCacheRaw ? (JSON.parse(hibpCacheRaw) as HibpCacheState) : null;
    return normalizeState({
      securityModeProfile:
        localStorage.getItem(LEGACY_KEYS.securityModeProfile) === 'strict' ||
        localStorage.getItem(LEGACY_KEYS.securityModeProfile) === 'maximum'
          ? (localStorage.getItem(LEGACY_KEYS.securityModeProfile) as SecurityModeProfile)
          : 'standard',
      plaintextExportEnabled: localStorage.getItem(LEGACY_KEYS.plaintextExport) === '1',
      hibpEnabled: localStorage.getItem(LEGACY_KEYS.hibpEnabled) === '1',
      hibpCache: hibpCacheParsed,
      autoLockTime: Number.parseInt(localStorage.getItem(LEGACY_KEYS.autoLockTime) || '', 10),
      clipboardClearSeconds: Number.parseInt(
        localStorage.getItem(LEGACY_KEYS.clipboardClearSeconds) || '',
        10
      ),
      viewDensity:
        localStorage.getItem(LEGACY_KEYS.viewDensity) === 'compact' ? 'compact' : 'comfortable',
      themeMode: localStorage.getItem(LEGACY_KEYS.themeMode) === 'dark' ? 'dark' : 'light',
      hasSeenTour: localStorage.getItem(LEGACY_KEYS.seenTour) === 'true',
      encryptionProfile:
        localStorage.getItem(LEGACY_KEYS.encryptionProfile) === 'maximum' ||
        localStorage.getItem(LEGACY_KEYS.encryptionProfile) === 'performance'
          ? (localStorage.getItem(LEGACY_KEYS.encryptionProfile) as EncryptionProfile)
          : 'balanced',
      vaultProfiles: (() => {
        const raw = localStorage.getItem(LEGACY_KEYS.vaultProfiles);
        if (!raw) return [];
        try {
          return JSON.parse(raw) as VaultProfileState[];
        } catch {
          return [];
        }
      })(),
      activeVaultId: localStorage.getItem(LEGACY_KEYS.activeVaultId) || 'default',
      totpVaultMode:
        localStorage.getItem(LEGACY_KEYS.totpMode) === 'separate_2fa_vault'
          ? 'separate_2fa_vault'
          : 'same_vault',
      totpVaultId: localStorage.getItem(LEGACY_KEYS.totpVaultId),
      qrConsumedPackages: (() => {
        const raw = localStorage.getItem(LEGACY_KEYS.qrConsumedPackages);
        if (!raw) return {};
        try {
          return JSON.parse(raw) as Record<string, string>;
        } catch {
          return {};
        }
      })(),
      qrTransferLedger: (() => {
        const raw = localStorage.getItem(LEGACY_KEYS.qrTransferLedger);
        if (!raw) return {};
        try {
          return JSON.parse(raw) as Record<string, QRTransferLedgerRecord>;
        } catch {
          return {};
        }
      })(),
      qrTransferAudit: (() => {
        const raw = localStorage.getItem(LEGACY_KEYS.qrTransferAudit);
        if (!raw) return [];
        try {
          return JSON.parse(raw) as QRTransferAuditEvent[];
        } catch {
          return [];
        }
      })(),
      sharedSpaces: (() => {
        const raw = localStorage.getItem(LEGACY_KEYS.sharedSpaces);
        if (!raw) return [];
        try {
          return JSON.parse(raw) as CanonicalSharedSpace[];
        } catch {
          return [];
        }
      })(),
      sharedItemAssignments: (() => {
        const raw = localStorage.getItem(LEGACY_KEYS.sharedItemAssignments);
        if (!raw) return {};
        try {
          return JSON.parse(raw) as Record<string, CanonicalSharingAssignment[]>;
        } catch {
          return {};
        }
      })(),
      sharingAudit: (() => {
        const raw = localStorage.getItem(LEGACY_KEYS.sharingAudit);
        if (!raw) return [];
        try {
          return JSON.parse(raw) as SharingAuditEvent[];
        } catch {
          return [];
        }
      })(),
      aliasProviders: DEFAULT_ALIAS_PROVIDER_PROFILES,
      aliasAudit: [],
      emergencyAccessContacts: (() => {
        const raw = localStorage.getItem(LEGACY_KEYS.emergencyAccessContacts);
        if (!raw) return [];
        try {
          return JSON.parse(raw) as EmergencyAccessContact[];
        } catch {
          return [];
        }
      })(),
      emergencyAccessRequests: (() => {
        const raw = localStorage.getItem(LEGACY_KEYS.emergencyAccessRequests);
        if (!raw) return [];
        try {
          return JSON.parse(raw) as EmergencyAccessRequest[];
        } catch {
          return [];
        }
      })(),
      emergencyAccessAudit: (() => {
        const raw = localStorage.getItem(LEGACY_KEYS.emergencyAccessAudit);
        if (!raw) return [];
        try {
          return JSON.parse(raw) as EmergencyAccessAuditEvent[];
        } catch {
          return [];
        }
      })(),
      emergencyAccessPolicy: (() => {
        const raw = localStorage.getItem(LEGACY_KEYS.emergencyAccessPolicy);
        if (!raw) return { ...DEFAULT_STATE.emergencyAccessPolicy };
        try {
          return JSON.parse(raw) as EmergencyAccessPolicy;
        } catch {
          return { ...DEFAULT_STATE.emergencyAccessPolicy };
        }
      })(),
    });
  } catch {
    return { ...DEFAULT_STATE };
  }
};

const clearLegacyKeys = () => {
  Object.values(LEGACY_KEYS).forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  });
};

const schedulePersist = () => {
  persistPromise = persistPromise
    .catch(() => undefined)
    .then(async () => {
      if (!hasIndexedDb()) return;
      await writeStateToDb(stateCache);
    });
  return persistPromise;
};

const ensureBootstrapped = () => {
  if (initialized || bootstrapped) return;
  stateCache = loadLegacyState();
  bootstrapped = true;
};

const ensureMutableState = () => {
  ensureBootstrapped();
};

export class SecureAppSettings {
  static async initialize(): Promise<void> {
    if (initialized) return;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      if (!hasIndexedDb()) {
        stateCache = loadLegacyState();
        bootstrapped = true;
        initialized = true;
        return;
      }

      try {
        const stored = await readStateFromDb();
        if (stored) {
          stateCache = stored;
        } else {
          stateCache = loadLegacyState();
          await writeStateToDb(stateCache);
        }
        bootstrapped = true;
        clearLegacyKeys();
      } catch {
        stateCache = loadLegacyState();
        bootstrapped = true;
      }

      initialized = true;
    })().finally(() => {
      initPromise = null;
    });

    return initPromise;
  }

  static getPlaintextExportEnabled(): boolean {
    ensureBootstrapped();
    return stateCache.plaintextExportEnabled;
  }

  static getSecurityModeProfile(): SecurityModeProfile {
    ensureBootstrapped();
    return stateCache.securityModeProfile;
  }

  static setSecurityModeProfile(profile: SecurityModeProfile): void {
    ensureMutableState();
    stateCache.securityModeProfile = profile;
    void schedulePersist();
  }

  static setPlaintextExportEnabled(enabled: boolean): void {
    ensureMutableState();
    stateCache.plaintextExportEnabled = enabled;
    void schedulePersist();
  }

  static getHibpEnabled(): boolean {
    ensureBootstrapped();
    return stateCache.hibpEnabled;
  }

  static setHibpEnabled(enabled: boolean): void {
    ensureMutableState();
    stateCache.hibpEnabled = enabled;
    void schedulePersist();
  }

  static getHibpCache(): HibpCacheState | null {
    ensureBootstrapped();
    return stateCache.hibpCache
      ? cloneState({ ...DEFAULT_STATE, hibpCache: stateCache.hibpCache }).hibpCache
      : null;
  }

  static setHibpCache(cache: HibpCacheState | null): void {
    ensureMutableState();
    stateCache.hibpCache = cache
      ? {
          hashes: { ...cache.hashes },
          lastUpdated: cache.lastUpdated,
        }
      : null;
    void schedulePersist();
  }

  static getAutoLockTime(): number {
    ensureBootstrapped();
    return stateCache.autoLockTime;
  }

  static setAutoLockTime(value: number): void {
    ensureMutableState();
    stateCache.autoLockTime = value;
    void schedulePersist();
    window.dispatchEvent(
      new CustomEvent('aegis-secure-setting-changed', { detail: { key: 'autoLockTime' } })
    );
  }

  static getClipboardClearSeconds(): number {
    ensureBootstrapped();
    return stateCache.clipboardClearSeconds;
  }

  static setClipboardClearSeconds(value: number): void {
    ensureMutableState();
    stateCache.clipboardClearSeconds = Math.min(300, Math.max(5, Math.round(value)));
    void schedulePersist();
    window.dispatchEvent(
      new CustomEvent('aegis-secure-setting-changed', { detail: { key: 'clipboardClearSeconds' } })
    );
  }

  static getViewDensity(): ViewDensity {
    ensureBootstrapped();
    return stateCache.viewDensity;
  }

  static setViewDensity(value: ViewDensity): void {
    ensureMutableState();
    stateCache.viewDensity = value;
    void schedulePersist();
  }

  static getThemeMode(): ThemeMode {
    ensureBootstrapped();
    return stateCache.themeMode;
  }

  static setThemeMode(value: ThemeMode): void {
    ensureMutableState();
    stateCache.themeMode = value;
    void schedulePersist();
  }

  static getHasSeenTour(): boolean {
    ensureBootstrapped();
    return stateCache.hasSeenTour;
  }

  static setHasSeenTour(value: boolean): void {
    ensureMutableState();
    stateCache.hasSeenTour = value;
    void schedulePersist();
  }

  static getEncryptionProfile(): EncryptionProfile {
    ensureBootstrapped();
    return stateCache.encryptionProfile;
  }

  static setEncryptionProfile(value: EncryptionProfile): void {
    ensureMutableState();
    stateCache.encryptionProfile = value;
    void schedulePersist();
  }

  static getVaultProfiles(): VaultProfileState[] {
    ensureBootstrapped();
    return stateCache.vaultProfiles.map((profile) => ({ ...profile }));
  }

  static setVaultProfiles(profiles: VaultProfileState[]): void {
    ensureMutableState();
    stateCache.vaultProfiles = profiles.map((profile) => ({ ...profile }));
    void schedulePersist();
  }

  static getActiveVaultId(): string {
    ensureBootstrapped();
    return stateCache.activeVaultId;
  }

  static setActiveVaultId(value: string): void {
    ensureMutableState();
    stateCache.activeVaultId = value;
    void schedulePersist();
  }

  static getTotpVaultMode(): TotpVaultMode {
    ensureBootstrapped();
    return stateCache.totpVaultMode;
  }

  static setTotpVaultMode(mode: TotpVaultMode): void {
    ensureMutableState();
    stateCache.totpVaultMode = mode;
    void schedulePersist();
  }

  static getTotpVaultId(): string | null {
    ensureBootstrapped();
    return stateCache.totpVaultId;
  }

  static setTotpVaultId(vaultId: string | null): void {
    ensureMutableState();
    stateCache.totpVaultId = vaultId;
    void schedulePersist();
  }

  static getQrConsumedPackages(): Record<string, string> {
    ensureBootstrapped();
    return { ...stateCache.qrConsumedPackages };
  }

  static setQrConsumedPackages(packages: Record<string, string>): void {
    ensureMutableState();
    stateCache.qrConsumedPackages = { ...packages };
    void schedulePersist();
  }

  static getQrTransferLedger(): Record<string, QRTransferLedgerRecord> {
    ensureBootstrapped();
    return Object.fromEntries(
      Object.entries(stateCache.qrTransferLedger).map(([key, value]) => [key, { ...value }])
    );
  }

  static setQrTransferLedger(ledger: Record<string, QRTransferLedgerRecord>): void {
    ensureMutableState();
    stateCache.qrTransferLedger = Object.fromEntries(
      Object.entries(ledger).map(([key, value]) => [key, { ...value }])
    );
    void schedulePersist();
  }

  static getQrTransferAudit(): QRTransferAuditEvent[] {
    ensureBootstrapped();
    return stateCache.qrTransferAudit.map((event) => ({
      ...event,
      metadata: event.metadata ? { ...event.metadata } : undefined,
    }));
  }

  static setQrTransferAudit(events: QRTransferAuditEvent[]): void {
    ensureMutableState();
    stateCache.qrTransferAudit = events.map((event) => ({
      ...event,
      metadata: event.metadata ? { ...event.metadata } : undefined,
    }));
    void schedulePersist();
  }

  static getSharedSpaces(): CanonicalSharedSpace[] {
    ensureBootstrapped();
    return stateCache.sharedSpaces.map((space) => cloneCanonicalSharedSpace(space));
  }

  static setSharedSpaces(spaces: CanonicalSharedSpace[]): void {
    ensureMutableState();
    stateCache.sharedSpaces = spaces.map((space) => cloneCanonicalSharedSpace(space));
    void schedulePersist();
  }

  static getSharedItemAssignments(): Record<string, CanonicalSharingAssignment[]> {
    ensureBootstrapped();
    return Object.fromEntries(
      Object.entries(stateCache.sharedItemAssignments).map(([key, assignments]) => [
        key,
        assignments.map((assignment) => cloneCanonicalSharingAssignment(assignment)),
      ])
    );
  }

  static setSharedItemAssignments(assignments: Record<string, CanonicalSharingAssignment[]>): void {
    ensureMutableState();
    stateCache.sharedItemAssignments = Object.fromEntries(
      Object.entries(assignments).map(([key, value]) => [
        key,
        value.map((assignment) => cloneCanonicalSharingAssignment(assignment)),
      ])
    );
    void schedulePersist();
  }

  static getSharingAudit(): SharingAuditEvent[] {
    ensureBootstrapped();
    return stateCache.sharingAudit.map((event) => ({
      ...event,
      metadata: event.metadata ? { ...event.metadata } : undefined,
    }));
  }

  static setSharingAudit(events: SharingAuditEvent[]): void {
    ensureMutableState();
    stateCache.sharingAudit = events.map((event) => ({
      ...event,
      metadata: event.metadata ? { ...event.metadata } : undefined,
    }));
    void schedulePersist();
  }

  static getSyncAudit(): SyncAuditEvent[] {
    ensureBootstrapped();
    return stateCache.syncAudit.map((event) => ({
      ...event,
      metadata: event.metadata ? { ...event.metadata } : undefined,
    }));
  }

  static setSyncAudit(events: SyncAuditEvent[]): void {
    ensureMutableState();
    stateCache.syncAudit = events.map((event) => ({
      ...event,
      metadata: event.metadata ? { ...event.metadata } : undefined,
    }));
    void schedulePersist();
  }

  static getSecurityCenterReviews(): Record<string, string> {
    ensureBootstrapped();
    return { ...stateCache.securityCenterReviews };
  }

  static setSecurityCenterReviews(reviews: Record<string, string>): void {
    ensureMutableState();
    stateCache.securityCenterReviews = { ...reviews };
    void schedulePersist();
  }

  static getSecurityCenterHistory(): SecurityCenterHistoryEvent[] {
    ensureBootstrapped();
    return stateCache.securityCenterHistory.map((event) => ({ ...event }));
  }

  static setSecurityCenterHistory(events: SecurityCenterHistoryEvent[]): void {
    ensureMutableState();
    stateCache.securityCenterHistory = events.map((event) => ({ ...event }));
    void schedulePersist();
  }

  static getReleaseTrustChecklist(): Record<string, string> {
    ensureBootstrapped();
    return { ...stateCache.releaseTrustChecklist };
  }

  static setReleaseTrustChecklist(checklist: Record<string, string>): void {
    ensureMutableState();
    stateCache.releaseTrustChecklist = { ...checklist };
    void schedulePersist();
  }

  static getReleaseTrustApprovals(): Record<string, string> {
    ensureBootstrapped();
    return { ...stateCache.releaseTrustApprovals };
  }

  static setReleaseTrustApprovals(approvals: Record<string, string>): void {
    ensureMutableState();
    stateCache.releaseTrustApprovals = { ...approvals };
    void schedulePersist();
  }

  static getSyncRelayEnabled(): boolean {
    ensureBootstrapped();
    return stateCache.syncRelayEnabled;
  }

  static setSyncRelayEnabled(value: boolean): void {
    ensureMutableState();
    stateCache.syncRelayEnabled = value;
    void schedulePersist();
  }

  static getSyncRelaySessionId(): string | null {
    ensureBootstrapped();
    return stateCache.syncRelaySessionId;
  }

  static setSyncRelaySessionId(value: string | null): void {
    ensureMutableState();
    stateCache.syncRelaySessionId = value;
    void schedulePersist();
  }

  static getSyncRelayUrl(): string | null {
    ensureBootstrapped();
    return stateCache.syncRelayUrl;
  }

  static setSyncRelayUrl(value: string | null): void {
    ensureMutableState();
    stateCache.syncRelayUrl = value;
    void schedulePersist();
  }

  static getSyncRelayApiKey(): string | null {
    ensureBootstrapped();
    return stateCache.syncRelayApiKey;
  }

  static setSyncRelayApiKey(value: string | null): void {
    ensureMutableState();
    stateCache.syncRelayApiKey = value;
    void schedulePersist();
  }

  static getSyncRelayLastSequence(): number {
    ensureBootstrapped();
    return stateCache.syncRelayLastSequence || 0;
  }

  static setSyncRelayLastSequence(value: number): void {
    ensureMutableState();
    stateCache.syncRelayLastSequence = value;
    void schedulePersist();
  }

  static getSyncRelayLastTimestamp(): string | null {
    ensureBootstrapped();
    return stateCache.syncRelayLastTimestamp;
  }

  static setSyncRelayLastTimestamp(value: string | null): void {
    ensureMutableState();
    stateCache.syncRelayLastTimestamp = value;
    void schedulePersist();
  }

  static getReleaseTrustHistory(): ReleaseTrustHistoryEvent[] {
    ensureBootstrapped();
    return stateCache.releaseTrustHistory.map((event) => ({ ...event }));
  }

  static setReleaseTrustHistory(events: ReleaseTrustHistoryEvent[]): void {
    ensureMutableState();
    stateCache.releaseTrustHistory = events.map((event) => ({ ...event }));
    void schedulePersist();
  }

  static getAliasProviders(): AliasProviderProfile[] {
    ensureBootstrapped();
    return stateCache.aliasProviders.map((profile) => ({
      ...profile,
      domains: [...profile.domains],
      capabilities: profile.capabilities ? { ...profile.capabilities } : undefined,
    }));
  }

  static setAliasProviders(profiles: AliasProviderProfile[]): void {
    ensureMutableState();
    stateCache.aliasProviders = profiles.map((profile) => ({
      ...profile,
      domains: [...profile.domains],
      capabilities: profile.capabilities ? { ...profile.capabilities } : undefined,
    }));
    void schedulePersist();
  }

  static getAliasAudit(): AliasAuditEvent[] {
    ensureBootstrapped();
    return stateCache.aliasAudit.map((event) => ({
      ...event,
      metadata: event.metadata ? { ...event.metadata } : undefined,
    }));
  }

  static setAliasAudit(events: AliasAuditEvent[]): void {
    ensureMutableState();
    stateCache.aliasAudit = events.map((event) => ({
      ...event,
      metadata: event.metadata ? { ...event.metadata } : undefined,
    }));
    void schedulePersist();
  }

  static getEmergencyAccessContacts(): EmergencyAccessContact[] {
    ensureBootstrapped();
    return stateCache.emergencyAccessContacts.map((contact) => ({ ...contact }));
  }

  static setEmergencyAccessContacts(contacts: EmergencyAccessContact[]): void {
    ensureMutableState();
    stateCache.emergencyAccessContacts = contacts.map((contact) => ({ ...contact }));
    void schedulePersist();
  }

  static getEmergencyAccessRequests(): EmergencyAccessRequest[] {
    ensureBootstrapped();
    return stateCache.emergencyAccessRequests.map((request) => ({
      ...request,
      entry_ids: Array.isArray(request.entry_ids) ? [...request.entry_ids] : undefined,
    }));
  }

  static setEmergencyAccessRequests(requests: EmergencyAccessRequest[]): void {
    ensureMutableState();
    stateCache.emergencyAccessRequests = requests.map((request) => ({
      ...request,
      entry_ids: Array.isArray(request.entry_ids) ? [...request.entry_ids] : undefined,
    }));
    void schedulePersist();
  }

  static getEmergencyAccessAudit(): EmergencyAccessAuditEvent[] {
    ensureBootstrapped();
    return stateCache.emergencyAccessAudit.map((event) => ({
      ...event,
      metadata: event.metadata ? { ...event.metadata } : undefined,
    }));
  }

  static setEmergencyAccessAudit(events: EmergencyAccessAuditEvent[]): void {
    ensureMutableState();
    stateCache.emergencyAccessAudit = events.map((event) => ({
      ...event,
      metadata: event.metadata ? { ...event.metadata } : undefined,
    }));
    void schedulePersist();
  }

  static getEmergencyAccessPolicy(): EmergencyAccessPolicy {
    ensureBootstrapped();
    return { ...stateCache.emergencyAccessPolicy };
  }

  static setEmergencyAccessPolicy(policy: EmergencyAccessPolicy): void {
    ensureMutableState();
    stateCache.emergencyAccessPolicy = { ...policy };
    void schedulePersist();
  }

  static clearMigratedLegacyKeys(): void {
    clearLegacyKeys();
  }

  static resetForTests(): void {
    stateCache = { ...DEFAULT_STATE };
    initialized = false;
    bootstrapped = false;
    initPromise = null;
    persistPromise = Promise.resolve();
  }
}

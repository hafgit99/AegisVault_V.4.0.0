// @ts-nocheck
import type {
  CanonicalSharingAssignment,
  CanonicalSharedMember,
  CanonicalSharedSpace,
} from './canonical-schema';

type ViewDensity = 'comfortable' | 'compact';
type TotpVaultMode = 'same_vault' | 'separate_2fa_vault';
type ThemeMode = 'light' | 'dark';
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
    | 'member_invited'
    | 'member_status_changed'
    | 'member_removed'
    | 'assignment_saved'
    | 'assignment_cleared'
    | 'assignment_reviewed';
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

interface SecureAppSettingsState {
  securityModeProfile: SecurityModeProfile;
  plaintextExportEnabled: boolean;
  hibpEnabled: boolean;
  hibpCache: HibpCacheState | null;
  autoLockTime: number;
  idleTimeoutSeconds: number;
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
} as const;

const DEFAULT_STATE: SecureAppSettingsState = {
  securityModeProfile: 'standard',
  plaintextExportEnabled: false,
  hibpEnabled: false,
  hibpCache: null,
  autoLockTime: 2,
  idleTimeoutSeconds: 300,
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
  idleTimeoutSeconds: state.idleTimeoutSeconds,
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
});

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
  const candidate = value && typeof value === 'object' ? value as Partial<SecureAppSettingsState> : {};
  const hibpCache = candidate.hibpCache && typeof candidate.hibpCache === 'object'
    ? candidate.hibpCache as HibpCacheState
    : null;
  const vaultProfiles =
    Array.isArray(candidate.vaultProfiles)
      ? candidate.vaultProfiles
          .filter((profile): profile is VaultProfileState =>
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
  const sharedSpaces =
    Array.isArray(candidate.sharedSpaces)
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
                    .filter(
                      (
                        assignment
                      ): assignment is CanonicalSharingAssignment => Boolean(assignment)
                    )
                : [],
            ]
          )
        ) as Record<string, CanonicalSharingAssignment[]>)
      : {};
  const sharingAudit =
    Array.isArray(candidate.sharingAudit)
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
                    Object.entries(event.metadata).filter(([, value]) =>
                      value === undefined ||
                      typeof value === 'string' ||
                      typeof value === 'number' ||
                      typeof value === 'boolean'
                    )
                  )
                : undefined,
          }))
      : [];
  const syncAudit =
    Array.isArray(candidate.syncAudit)
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
                    Object.entries(event.metadata).filter(([, value]) =>
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
  const securityCenterHistory =
    Array.isArray(candidate.securityCenterHistory)
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
  const releaseTrustHistory =
    Array.isArray(candidate.releaseTrustHistory)
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
  return {
    securityModeProfile:
      candidate.securityModeProfile === 'strict' || candidate.securityModeProfile === 'maximum'
        ? candidate.securityModeProfile
        : 'standard',
    plaintextExportEnabled: Boolean(candidate.plaintextExportEnabled),
    hibpEnabled: Boolean(candidate.hibpEnabled),
    hibpCache: hibpCache && hibpCache.hashes && typeof hibpCache.hashes === 'object'
      ? {
          hashes: Object.fromEntries(
            Object.entries(hibpCache.hashes).filter(([, count]) => typeof count === 'number')
          ),
          lastUpdated: typeof hibpCache.lastUpdated === 'number' ? hibpCache.lastUpdated : Date.now(),
        }
      : null,
    autoLockTime: typeof candidate.autoLockTime === 'number' && !Number.isNaN(candidate.autoLockTime) ? candidate.autoLockTime : DEFAULT_STATE.autoLockTime,
    idleTimeoutSeconds: typeof candidate.idleTimeoutSeconds === 'number' && !Number.isNaN(candidate.idleTimeoutSeconds) ? candidate.idleTimeoutSeconds : DEFAULT_STATE.idleTimeoutSeconds,
    viewDensity: candidate.viewDensity === 'compact' ? 'compact' : 'comfortable',
    themeMode: candidate.themeMode === 'dark' ? 'dark' : 'light',
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
    totpVaultMode: candidate.totpVaultMode === 'separate_2fa_vault' ? 'separate_2fa_vault' : 'same_vault',
    totpVaultId: typeof candidate.totpVaultId === 'string' && candidate.totpVaultId.trim() ? candidate.totpVaultId.trim() : null,
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
    qrTransferAudit:
      Array.isArray(candidate.qrTransferAudit)
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
              metadata: event.metadata && typeof event.metadata === 'object'
                ? Object.fromEntries(
                    Object.entries(event.metadata).filter(([, value]) =>
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
    const hibpCacheParsed = hibpCacheRaw ? JSON.parse(hibpCacheRaw) as HibpCacheState : null;
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
      idleTimeoutSeconds: Number.parseInt(localStorage.getItem(LEGACY_KEYS.idleTimeout) || '', 10),
      viewDensity: localStorage.getItem(LEGACY_KEYS.viewDensity) === 'compact' ? 'compact' : 'comfortable',
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
      totpVaultMode: localStorage.getItem(LEGACY_KEYS.totpMode) === 'separate_2fa_vault' ? 'separate_2fa_vault' : 'same_vault',
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
    return stateCache.hibpCache ? cloneState({ ...DEFAULT_STATE, hibpCache: stateCache.hibpCache }).hibpCache : null;
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
  }

  static getIdleTimeout(): number {
    ensureBootstrapped();
    return stateCache.idleTimeoutSeconds;
  }

  static setIdleTimeout(value: number): void {
    ensureMutableState();
    stateCache.idleTimeoutSeconds = value;
    void schedulePersist();
    window.dispatchEvent(new CustomEvent('aegis-secure-setting-changed', { detail: { key: 'idleTimeout' } }));
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

  static setSharedItemAssignments(
    assignments: Record<string, CanonicalSharingAssignment[]>
  ): void {
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

  static getReleaseTrustHistory(): ReleaseTrustHistoryEvent[] {
    ensureBootstrapped();
    return stateCache.releaseTrustHistory.map((event) => ({ ...event }));
  }

  static setReleaseTrustHistory(events: ReleaseTrustHistoryEvent[]): void {
    ensureMutableState();
    stateCache.releaseTrustHistory = events.map((event) => ({ ...event }));
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

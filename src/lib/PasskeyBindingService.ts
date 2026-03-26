import { BackupService } from './BackupService';
import type { VaultEntry } from '../vaultService';

export interface PasskeyBindingMeta {
  createdAt: string;
  lastUsedAt: string;
  version: number;
  profileId?: string | null;
  dbName?: string;
  deviceLabel?: string;
  deviceFingerprint?: string;
  rotatedAt?: string;
  rotatedFromCredentialId?: string;
  recoveryLastExportedAt?: string;
}

export interface PasskeyEventRecord {
  at: string;
  type: string;
  profileId?: string | null;
  dbName?: string;
  credentialId?: string;
  deviceFingerprint?: string;
  detail?: string;
}

export interface PasskeyRevocationRecord {
  credentialId: string;
  revokedAt: string;
  reason: string;
  profileId?: string | null;
  dbName?: string;
  deviceFingerprint?: string;
}

export interface PasskeyPolicy {
  maxBindingAgeDays: number;
  requireRecoveryExportBeforeRotation: boolean;
  blockRevokedCredentials: boolean;
}

export interface PasskeyBindingRecord {
  credentialId: string;
  encryptedPayload: string;
  prfSalt: string;
  meta: PasskeyBindingMeta;
  eventLog?: PasskeyEventRecord[];
}

interface RecoveryPackage {
  kind: 'aegis-passkey-recovery-v2';
  binding: PasskeyBindingRecord;
  revocations: PasskeyRevocationRecord[];
  policy: PasskeyPolicy;
}

const BINDINGS_KEY = 'aegis_passkey_bindings_v1';
const LEGACY_ID_KEY = 'aegis_passkey_id';
const LEGACY_DATA_KEY = 'aegis_passkey_data';
const LEGACY_SALT_KEY = 'aegis_prf_salt';
const LEGACY_META_KEY = 'aegis_passkey_meta';
const PASSKEY_AUDIT_KEY = 'aegis_passkey_audit_v1';
const PASSKEY_REVOCATIONS_KEY = 'aegis_passkey_revocations_v1';
const PASSKEY_POLICY_KEY = 'aegis_passkey_policy_v1';
const PASSKEY_EVENT_LIMIT = 24;
const SECURE_DB_NAME = 'aegis-secure-meta-v1';
const SECURE_DB_STORE = 'secure_kv';
const SECURE_DB_KEY = 'passkey_state_v2';
const DEFAULT_POLICY: PasskeyPolicy = {
  maxBindingAgeDays: 90,
  requireRecoveryExportBeforeRotation: false,
  blockRevokedCredentials: true,
};

interface PasskeySecureState {
  bindings: Record<string, PasskeyBindingRecord>;
  auditLog: PasskeyEventRecord[];
  revocations: PasskeyRevocationRecord[];
  policy: PasskeyPolicy;
}

const profileKey = (profileId?: string | null, dbName?: string) => {
  return `${profileId || 'default'}::${dbName || 'aegis_opfs_vault'}`;
};

const safeParse = <T>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const cloneState = (state: PasskeySecureState): PasskeySecureState => ({
  bindings: JSON.parse(JSON.stringify(state.bindings || {})),
  auditLog: [...(state.auditLog || [])],
  revocations: [...(state.revocations || [])],
  policy: { ...DEFAULT_POLICY, ...(state.policy || {}) },
});

const createDefaultState = (): PasskeySecureState => ({
  bindings: {},
  auditLog: [],
  revocations: [],
  policy: { ...DEFAULT_POLICY },
});

let secureStateCache: PasskeySecureState = createDefaultState();
let secureStateInitialized = false;
let secureStateInitPromise: Promise<void> | null = null;
let secureStatePersistPromise: Promise<void> = Promise.resolve();

const hasIndexedDb = () => typeof indexedDB !== 'undefined';

const openSecureDb = async (): Promise<IDBDatabase | null> => {
  if (!hasIndexedDb()) return null;
  return await new Promise((resolve, reject) => {
    const request = indexedDB.open(SECURE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SECURE_DB_STORE)) {
        db.createObjectStore(SECURE_DB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('SECURE_DB_OPEN_FAILED'));
  });
};

const readStateFromIndexedDb = async (): Promise<PasskeySecureState | null> => {
  const db = await openSecureDb();
  if (!db) return null;
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(SECURE_DB_STORE, 'readonly');
    const store = tx.objectStore(SECURE_DB_STORE);
    const request = store.get(SECURE_DB_KEY);
    request.onsuccess = () => {
      resolve(request.result ? normalizePersistedState(request.result) : null);
    };
    request.onerror = () => reject(request.error || new Error('SECURE_DB_READ_FAILED'));
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error || new Error('SECURE_DB_READ_FAILED'));
  });
};

const writeStateToIndexedDb = async (state: PasskeySecureState): Promise<void> => {
  const db = await openSecureDb();
  if (!db) return;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SECURE_DB_STORE, 'readwrite');
    const store = tx.objectStore(SECURE_DB_STORE);
    store.put(cloneState(state), SECURE_DB_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error || new Error('SECURE_DB_WRITE_FAILED'));
  });
};

const clearStateInIndexedDb = async (): Promise<void> => {
  const db = await openSecureDb();
  if (!db) return;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SECURE_DB_STORE, 'readwrite');
    tx.objectStore(SECURE_DB_STORE).delete(SECURE_DB_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error || new Error('SECURE_DB_CLEAR_FAILED'));
  });
};

const normalizePersistedState = (state: unknown): PasskeySecureState => {
  const candidate = (state && typeof state === 'object') ? state as Partial<PasskeySecureState> : {};
  return {
    bindings: candidate.bindings && typeof candidate.bindings === 'object' ? candidate.bindings as Record<string, PasskeyBindingRecord> : {},
    auditLog: Array.isArray(candidate.auditLog) ? candidate.auditLog : [],
    revocations: Array.isArray(candidate.revocations) ? candidate.revocations : [],
    policy: {
      maxBindingAgeDays: typeof candidate.policy?.maxBindingAgeDays === 'number' ? candidate.policy.maxBindingAgeDays : DEFAULT_POLICY.maxBindingAgeDays,
      requireRecoveryExportBeforeRotation: typeof candidate.policy?.requireRecoveryExportBeforeRotation === 'boolean' ? candidate.policy.requireRecoveryExportBeforeRotation : DEFAULT_POLICY.requireRecoveryExportBeforeRotation,
      blockRevokedCredentials: typeof candidate.policy?.blockRevokedCredentials === 'boolean' ? candidate.policy.blockRevokedCredentials : DEFAULT_POLICY.blockRevokedCredentials,
    },
  };
};

const clearLegacyStorageKeys = () => {
  localStorage.removeItem(BINDINGS_KEY);
  localStorage.removeItem(LEGACY_ID_KEY);
  localStorage.removeItem(LEGACY_DATA_KEY);
  localStorage.removeItem(LEGACY_SALT_KEY);
  localStorage.removeItem(LEGACY_META_KEY);
  localStorage.removeItem(PASSKEY_AUDIT_KEY);
  localStorage.removeItem(PASSKEY_REVOCATIONS_KEY);
  localStorage.removeItem(PASSKEY_POLICY_KEY);
};

const loadLegacyState = (): PasskeySecureState => {
  const bindings = safeParse<Record<string, PasskeyBindingRecord>>(localStorage.getItem(BINDINGS_KEY));
  const auditLog = safeParse<PasskeyEventRecord[]>(localStorage.getItem(PASSKEY_AUDIT_KEY));
  const revocations = safeParse<PasskeyRevocationRecord[]>(localStorage.getItem(PASSKEY_REVOCATIONS_KEY));
  const policyRaw = safeParse<PasskeyPolicy>(localStorage.getItem(PASSKEY_POLICY_KEY));
  return normalizePersistedState({
    bindings: bindings && typeof bindings === 'object' ? bindings : {},
    auditLog: Array.isArray(auditLog) ? auditLog : [],
    revocations: Array.isArray(revocations) ? revocations : [],
    policy: policyRaw || DEFAULT_POLICY,
  });
};

const schedulePersist = () => {
  secureStatePersistPromise = secureStatePersistPromise
    .catch(() => undefined)
    .then(async () => {
      if (!hasIndexedDb()) return;
      await writeStateToIndexedDb(secureStateCache);
    });
  return secureStatePersistPromise;
};

const ensureBootstrappedState = () => {
  if (secureStateInitialized) return;
  secureStateCache = loadLegacyState();
};

const readBindingMap = (): Record<string, PasskeyBindingRecord> => {
  ensureBootstrappedState();
  return secureStateCache.bindings;
};

const writeBindingMap = (map: Record<string, PasskeyBindingRecord>) => {
  secureStateCache.bindings = map;
  void schedulePersist();
};

const readAuditLog = (): PasskeyEventRecord[] => {
  ensureBootstrappedState();
  return secureStateCache.auditLog;
};

const writeAuditLog = (events: PasskeyEventRecord[]) => {
  secureStateCache.auditLog = events.slice(-PASSKEY_EVENT_LIMIT * 4);
  void schedulePersist();
};

const readRevocations = (): PasskeyRevocationRecord[] => {
  ensureBootstrappedState();
  return secureStateCache.revocations;
};

const writeRevocations = (items: PasskeyRevocationRecord[]) => {
  secureStateCache.revocations = items.slice(-PASSKEY_EVENT_LIMIT * 4);
  void schedulePersist();
};

const readPolicy = (): PasskeyPolicy => {
  ensureBootstrappedState();
  const parsed = secureStateCache.policy;
  return {
    maxBindingAgeDays: typeof parsed?.maxBindingAgeDays === 'number' ? parsed.maxBindingAgeDays : DEFAULT_POLICY.maxBindingAgeDays,
    requireRecoveryExportBeforeRotation: typeof parsed?.requireRecoveryExportBeforeRotation === 'boolean' ? parsed.requireRecoveryExportBeforeRotation : DEFAULT_POLICY.requireRecoveryExportBeforeRotation,
    blockRevokedCredentials: typeof parsed?.blockRevokedCredentials === 'boolean' ? parsed.blockRevokedCredentials : DEFAULT_POLICY.blockRevokedCredentials,
  };
};

const writePolicy = (policy: PasskeyPolicy) => {
  secureStateCache.policy = policy;
  void schedulePersist();
};

const getDeviceInfo = () => {
  const platform = typeof navigator !== 'undefined' ? (navigator.platform || 'unknown') : 'unknown';
  const locale = typeof navigator !== 'undefined' ? (navigator.language || 'en') : 'en';
  const userAgent = typeof navigator !== 'undefined' ? (navigator.userAgent || '') : '';
  const deviceLabel = `This device / ${platform}`;
  const fingerprintSource = JSON.stringify({ platform, locale, userAgent });
  let hash = 0;
  for (let i = 0; i < fingerprintSource.length; i += 1) {
    hash = ((hash << 5) - hash) + fingerprintSource.charCodeAt(i);
    hash |= 0;
  }
  const normalized = Math.abs(hash).toString(16).padStart(8, '0');
  return {
    deviceLabel,
    deviceFingerprint: normalized,
  };
};

const appendEvent = (
  map: Record<string, PasskeyBindingRecord>,
  key: string,
  event: PasskeyEventRecord
) => {
  if (map[key]) {
    map[key].eventLog = [...(map[key].eventLog || []), event].slice(-PASSKEY_EVENT_LIMIT);
  }
  writeAuditLog([...readAuditLog(), event]);
};

const migrateLegacyIfExists = (profileId?: string | null, dbName?: string): PasskeyBindingRecord | null => {
  const credentialId = localStorage.getItem(LEGACY_ID_KEY) || '';
  const encryptedPayload = localStorage.getItem(LEGACY_DATA_KEY) || '';
  const prfSalt = localStorage.getItem(LEGACY_SALT_KEY) || '';
  if (!credentialId || !encryptedPayload || !prfSalt) return null;

  const legacyMeta = safeParse<PasskeyBindingMeta>(localStorage.getItem(LEGACY_META_KEY));
  const now = new Date().toISOString();
  const record: PasskeyBindingRecord = {
    credentialId,
    encryptedPayload,
    prfSalt,
    meta: {
      createdAt: legacyMeta?.createdAt || now,
      lastUsedAt: legacyMeta?.lastUsedAt || now,
      version: 1,
      profileId: profileId || legacyMeta?.profileId || null,
      dbName: dbName || legacyMeta?.dbName || 'aegis_opfs_vault',
      ...getDeviceInfo(),
    },
    eventLog: [],
  };

  const map = readBindingMap();
  map[profileKey(profileId, dbName)] = record;
  appendEvent(map, profileKey(profileId, dbName), {
    at: now,
    type: 'legacy_migrated',
    profileId: record.meta.profileId,
    dbName: record.meta.dbName,
    credentialId: record.credentialId,
    deviceFingerprint: record.meta.deviceFingerprint,
    detail: 'Legacy passkey binding migrated into profile-scoped store.',
  });
  writeBindingMap(map);

  localStorage.removeItem(LEGACY_ID_KEY);
  localStorage.removeItem(LEGACY_DATA_KEY);
  localStorage.removeItem(LEGACY_SALT_KEY);
  localStorage.removeItem(LEGACY_META_KEY);

  return record;
};

export class PasskeyBindingService {
  static async initialize(): Promise<void> {
    if (secureStateInitialized) return;
    if (secureStateInitPromise) return secureStateInitPromise;

    secureStateInitPromise = (async () => {
      if (!hasIndexedDb()) {
        secureStateCache = loadLegacyState();
        secureStateInitialized = true;
        return;
      }

      try {
        const stored = await readStateFromIndexedDb();
        if (stored) {
          secureStateCache = stored;
        } else {
          secureStateCache = loadLegacyState();
          await writeStateToIndexedDb(secureStateCache);
        }
        clearLegacyStorageKeys();
      } catch {
        secureStateCache = loadLegacyState();
      }
      secureStateInitialized = true;
    })().finally(() => {
      secureStateInitPromise = null;
    });

    return secureStateInitPromise;
  }

  static async flush(): Promise<void> {
    await this.initialize();
    await schedulePersist();
  }

  static getPolicy(): PasskeyPolicy {
    return readPolicy();
  }

  static updatePolicy(nextPolicy: Partial<PasskeyPolicy>): PasskeyPolicy {
    const merged = {
      ...readPolicy(),
      ...nextPolicy,
    };
    writePolicy(merged);
    writeAuditLog([...readAuditLog(), {
      at: new Date().toISOString(),
      type: 'policy_updated',
      detail: JSON.stringify(merged),
    }]);
    return merged;
  }

  static getBinding(profileId?: string | null, dbName?: string): PasskeyBindingRecord | null {
    const key = profileKey(profileId, dbName);
    const map = readBindingMap();
    if (map[key]) return map[key];
    return migrateLegacyIfExists(profileId, dbName);
  }

  static saveBinding(profileId: string | null, dbName: string, record: PasskeyBindingRecord): void {
    const key = profileKey(profileId, dbName);
    const map = readBindingMap();
    const now = new Date().toISOString();
    const existing = map[key];
    const deviceInfo = getDeviceInfo();
    map[key] = {
      ...record,
      meta: {
        ...record.meta,
        createdAt: record.meta.createdAt || now,
        lastUsedAt: record.meta.lastUsedAt || now,
        profileId,
        dbName,
        deviceLabel: record.meta.deviceLabel || deviceInfo.deviceLabel,
        deviceFingerprint: record.meta.deviceFingerprint || deviceInfo.deviceFingerprint,
        rotatedAt: existing ? now : record.meta.rotatedAt,
        rotatedFromCredentialId: existing ? existing.credentialId : record.meta.rotatedFromCredentialId,
      },
      eventLog: [...(existing?.eventLog || []), ...(record.eventLog || [])].slice(-PASSKEY_EVENT_LIMIT),
    };
    appendEvent(map, key, {
      at: now,
      type: existing ? 'rotated' : 'bound',
      profileId,
      dbName,
      credentialId: record.credentialId,
      deviceFingerprint: map[key].meta.deviceFingerprint,
      detail: existing ? 'Passkey binding rotated on this device.' : 'Passkey binding created on this device.',
    });
    writeBindingMap(map);
  }

  static updateLastUsed(profileId?: string | null, dbName?: string): void {
    const key = profileKey(profileId, dbName);
    const map = readBindingMap();
    if (!map[key]) return;
    const now = new Date().toISOString();
    map[key].meta = {
      ...map[key].meta,
      lastUsedAt: now,
    };
    appendEvent(map, key, {
      at: now,
      type: 'used',
      profileId: map[key].meta.profileId,
      dbName: map[key].meta.dbName,
      credentialId: map[key].credentialId,
      deviceFingerprint: map[key].meta.deviceFingerprint,
      detail: 'Passkey used to unlock vault.',
    });
    writeBindingMap(map);
  }

  static revokeBinding(profileId?: string | null, dbName?: string, reason: string = 'manual_revoke'): boolean {
    const key = profileKey(profileId, dbName);
    const map = readBindingMap();
    if (!map[key]) return false;
    const record = map[key];
    const now = new Date().toISOString();
    const revocations = readRevocations();
    revocations.push({
      credentialId: record.credentialId,
      revokedAt: now,
      reason,
      profileId: record.meta.profileId,
      dbName: record.meta.dbName,
      deviceFingerprint: record.meta.deviceFingerprint,
    });
    writeRevocations(revocations);
    appendEvent(map, key, {
      at: now,
      type: 'revoked',
      profileId: record.meta.profileId,
      dbName: record.meta.dbName,
      credentialId: record.credentialId,
      deviceFingerprint: record.meta.deviceFingerprint,
      detail: reason,
    });
    delete map[key];
    writeBindingMap(map);
    return true;
  }

  static noteRecoveryExport(profileId?: string | null, dbName?: string): void {
    const key = profileKey(profileId, dbName);
    const map = readBindingMap();
    if (!map[key]) return;
    const now = new Date().toISOString();
    map[key].meta = {
      ...map[key].meta,
      recoveryLastExportedAt: now,
    };
    appendEvent(map, key, {
      at: now,
      type: 'recovery_exported',
      profileId: map[key].meta.profileId,
      dbName: map[key].meta.dbName,
      credentialId: map[key].credentialId,
      deviceFingerprint: map[key].meta.deviceFingerprint,
      detail: 'Encrypted recovery package exported.',
    });
    writeBindingMap(map);
  }

  static hasAnyBinding(): boolean {
    const map = readBindingMap();
    return Object.keys(map).length > 0;
  }

  static clearAllBindings(): void {
    secureStateCache = createDefaultState();
    clearLegacyStorageKeys();
    void clearStateInIndexedDb();
  }

  static listBindings(): Array<PasskeyBindingRecord & { bindingKey: string }> {
    const map = readBindingMap();
    return Object.entries(map)
      .map(([bindingKey, record]) => ({ bindingKey, ...record }))
      .sort((left, right) => Date.parse(right.meta.lastUsedAt || right.meta.createdAt) - Date.parse(left.meta.lastUsedAt || left.meta.createdAt));
  }

  static getEventLog(profileId?: string | null, dbName?: string): PasskeyEventRecord[] {
    if (typeof profileId !== 'undefined' || typeof dbName !== 'undefined') {
      const binding = this.getBinding(profileId, dbName);
      return [...(binding?.eventLog || [])].reverse();
    }
    return [...readAuditLog()].reverse();
  }

  static listRevocations(): PasskeyRevocationRecord[] {
    return [...readRevocations()].reverse();
  }

  static isCredentialRevoked(credentialId: string): boolean {
    return readPolicy().blockRevokedCredentials && readRevocations().some((item) => item.credentialId === credentialId);
  }

  static getPolicyViolations(binding: PasskeyBindingRecord | null): string[] {
    if (!binding) return [];
    const policy = readPolicy();
    const violations: string[] = [];
    if (policy.blockRevokedCredentials && this.isCredentialRevoked(binding.credentialId)) {
      violations.push('PASSKEY_REVOKED');
    }
    const createdAtMs = Date.parse(binding.meta.createdAt || '');
    if (Number.isFinite(createdAtMs)) {
      const ageDays = Math.floor((Date.now() - createdAtMs) / (1000 * 60 * 60 * 24));
      if (ageDays >= policy.maxBindingAgeDays) {
        violations.push('PASSKEY_ROTATION_REQUIRED');
      }
    }
    if (
      policy.requireRecoveryExportBeforeRotation &&
      binding.meta.rotatedFromCredentialId &&
      !binding.meta.recoveryLastExportedAt
    ) {
      violations.push('PASSKEY_RECOVERY_EXPORT_REQUIRED');
    }
    return violations;
  }

  static async exportRecoveryPackage(profileId: string | null, dbName: string, password: string): Promise<string> {
    const binding = this.getBinding(profileId, dbName);
    if (!binding) throw new Error('NO_PASSKEY_BINDING');

    const pkg: RecoveryPackage = {
      kind: 'aegis-passkey-recovery-v2',
      binding,
      revocations: readRevocations(),
      policy: readPolicy(),
    };
    const encrypted = await BackupService.encryptBackup([pkg], password);
    this.noteRecoveryExport(profileId, dbName);
    return encrypted;
  }

  static async importRecoveryPackage(
    encryptedPackage: string,
    password: string,
    expectedProfileId: string | null,
    expectedDbName: string
  ): Promise<void> {
    const payload = await BackupService.decryptBackup(encryptedPackage, password);
    if (!Array.isArray(payload) || payload.length === 0) throw new Error('INVALID_RECOVERY_PACKAGE');

    const pkg = payload[0] as RecoveryPackage;
    if (!pkg || pkg.kind !== 'aegis-passkey-recovery-v2' || !pkg.binding) {
      throw new Error('INVALID_RECOVERY_PACKAGE');
    }

    const meta = pkg.binding.meta || ({} as PasskeyBindingMeta);
    if (meta.profileId && meta.profileId !== expectedProfileId) {
      throw new Error('RECOVERY_PROFILE_MISMATCH');
    }
    if (meta.dbName && meta.dbName !== expectedDbName) {
      throw new Error('RECOVERY_DB_MISMATCH');
    }

    this.saveBinding(expectedProfileId, expectedDbName, {
      ...pkg.binding,
      meta: {
        ...pkg.binding.meta,
        profileId: expectedProfileId,
        dbName: expectedDbName,
        lastUsedAt: new Date().toISOString(),
        ...getDeviceInfo(),
      },
    });
    const key = profileKey(expectedProfileId, expectedDbName);
    const map = readBindingMap();
    if (Array.isArray(pkg.revocations)) {
      const merged = [...readRevocations(), ...pkg.revocations]
        .reduce<PasskeyRevocationRecord[]>((acc, item) => {
          if (!acc.some((existing) => existing.credentialId === item.credentialId && existing.revokedAt === item.revokedAt)) {
            acc.push(item);
          }
          return acc;
        }, []);
      writeRevocations(merged);
    }
    if (pkg.policy) {
      writePolicy({
        ...readPolicy(),
        ...pkg.policy,
      });
    }
    if (map[key]) {
      appendEvent(map, key, {
        at: new Date().toISOString(),
        type: 'recovery_imported',
        profileId: expectedProfileId,
        dbName: expectedDbName,
        credentialId: map[key].credentialId,
        deviceFingerprint: map[key].meta.deviceFingerprint,
        detail: 'Recovery package imported for active vault profile.',
      });
      writeBindingMap(map);
    }
  }

  /**
   * Yeni bir WebAuthn site passkey credential kaydini, mevcut bir VaultEntry'nin
   * site passkey veri modeline (metadata) baglar.
   */
  static bindSiteCredentialToEntry(entry: VaultEntry, credentialId: string, rpId: string): VaultEntry {
    const now = new Date().toISOString();
    return {
      ...entry,
      passkeyMetadata: {
        ...(entry.passkeyMetadata || {}),
        credential_id: credentialId,
        rp_id: rpId,
        mode: "site_passkey_active",
        created_at: entry.passkeyMetadata?.created_at || now,
        last_registration_at: now,
      },
    };
  }

  /**
   * Merges an external list of revocations into the local store.
   * Used by QR Sync and future encrypted sync to propagate revocation intent.
   */
  static mergeExternalRevocations(external: PasskeyRevocationRecord[]): number {
    const local = readRevocations();
    const map = new Map<string, PasskeyRevocationRecord>();
    
    // De-duplicate by credentialId (keep the one with latest revokedAt)
    [...local, ...external].forEach(rev => {
      const existing = map.get(rev.credentialId);
      if (!existing || Date.parse(rev.revokedAt) > Date.parse(existing.revokedAt)) {
        map.set(rev.credentialId, rev);
      }
    });

    const merged = Array.from(map.values());
    const addedCount = merged.length - local.length;
    
    if (addedCount > 0) {
      writeRevocations(merged);
    }
    
    return addedCount;
  }
}

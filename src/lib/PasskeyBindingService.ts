import { BackupService } from './BackupService';

export interface PasskeyBindingMeta {
  createdAt: string;
  lastUsedAt: string;
  version: number;
  profileId?: string | null;
  dbName?: string;
}

export interface PasskeyBindingRecord {
  credentialId: string;
  encryptedPayload: string;
  prfSalt: string;
  meta: PasskeyBindingMeta;
}

interface RecoveryPackage {
  kind: 'aegis-passkey-recovery-v1';
  binding: PasskeyBindingRecord;
}

const BINDINGS_KEY = 'aegis_passkey_bindings_v1';
const LEGACY_ID_KEY = 'aegis_passkey_id';
const LEGACY_DATA_KEY = 'aegis_passkey_data';
const LEGACY_SALT_KEY = 'aegis_prf_salt';
const LEGACY_META_KEY = 'aegis_passkey_meta';

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

const readBindingMap = (): Record<string, PasskeyBindingRecord> => {
  const parsed = safeParse<Record<string, PasskeyBindingRecord>>(localStorage.getItem(BINDINGS_KEY));
  return parsed && typeof parsed === 'object' ? parsed : {};
};

const writeBindingMap = (map: Record<string, PasskeyBindingRecord>) => {
  localStorage.setItem(BINDINGS_KEY, JSON.stringify(map));
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
    },
  };

  const map = readBindingMap();
  map[profileKey(profileId, dbName)] = record;
  writeBindingMap(map);

  localStorage.removeItem(LEGACY_ID_KEY);
  localStorage.removeItem(LEGACY_DATA_KEY);
  localStorage.removeItem(LEGACY_SALT_KEY);
  localStorage.removeItem(LEGACY_META_KEY);

  return record;
};

export class PasskeyBindingService {
  static getBinding(profileId?: string | null, dbName?: string): PasskeyBindingRecord | null {
    const key = profileKey(profileId, dbName);
    const map = readBindingMap();
    if (map[key]) return map[key];
    return migrateLegacyIfExists(profileId, dbName);
  }

  static saveBinding(profileId: string | null, dbName: string, record: PasskeyBindingRecord): void {
    const key = profileKey(profileId, dbName);
    const map = readBindingMap();
    map[key] = {
      ...record,
      meta: {
        ...record.meta,
        profileId,
        dbName,
      },
    };
    writeBindingMap(map);
  }

  static updateLastUsed(profileId?: string | null, dbName?: string): void {
    const key = profileKey(profileId, dbName);
    const map = readBindingMap();
    if (!map[key]) return;
    map[key].meta = {
      ...map[key].meta,
      lastUsedAt: new Date().toISOString(),
    };
    writeBindingMap(map);
  }

  static revokeBinding(profileId?: string | null, dbName?: string): boolean {
    const key = profileKey(profileId, dbName);
    const map = readBindingMap();
    if (!map[key]) return false;
    delete map[key];
    writeBindingMap(map);
    return true;
  }

  static hasAnyBinding(): boolean {
    const map = readBindingMap();
    return Object.keys(map).length > 0;
  }

  static clearAllBindings(): void {
    localStorage.removeItem(BINDINGS_KEY);
    localStorage.removeItem(LEGACY_ID_KEY);
    localStorage.removeItem(LEGACY_DATA_KEY);
    localStorage.removeItem(LEGACY_SALT_KEY);
    localStorage.removeItem(LEGACY_META_KEY);
  }

  static async exportRecoveryPackage(profileId: string | null, dbName: string, password: string): Promise<string> {
    const binding = this.getBinding(profileId, dbName);
    if (!binding) throw new Error('NO_PASSKEY_BINDING');

    const pkg: RecoveryPackage = {
      kind: 'aegis-passkey-recovery-v1',
      binding,
    };
    return BackupService.encryptBackup([pkg], password);
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
    if (!pkg || pkg.kind !== 'aegis-passkey-recovery-v1' || !pkg.binding) {
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
      },
    });
  }
}

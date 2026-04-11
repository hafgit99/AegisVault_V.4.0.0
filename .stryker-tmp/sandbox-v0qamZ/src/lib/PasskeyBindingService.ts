// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
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
const BINDINGS_KEY = stryMutAct_9fa48("322") ? "" : (stryCov_9fa48("322"), 'aegis_passkey_bindings_v1');
const LEGACY_ID_KEY = stryMutAct_9fa48("323") ? "" : (stryCov_9fa48("323"), 'aegis_passkey_id');
const LEGACY_DATA_KEY = stryMutAct_9fa48("324") ? "" : (stryCov_9fa48("324"), 'aegis_passkey_data');
const LEGACY_SALT_KEY = stryMutAct_9fa48("325") ? "" : (stryCov_9fa48("325"), 'aegis_prf_salt');
const LEGACY_META_KEY = stryMutAct_9fa48("326") ? "" : (stryCov_9fa48("326"), 'aegis_passkey_meta');
const PASSKEY_AUDIT_KEY = stryMutAct_9fa48("327") ? "" : (stryCov_9fa48("327"), 'aegis_passkey_audit_v1');
const PASSKEY_REVOCATIONS_KEY = stryMutAct_9fa48("328") ? "" : (stryCov_9fa48("328"), 'aegis_passkey_revocations_v1');
const PASSKEY_POLICY_KEY = stryMutAct_9fa48("329") ? "" : (stryCov_9fa48("329"), 'aegis_passkey_policy_v1');
const PASSKEY_EVENT_LIMIT = 24;
const SECURE_DB_NAME = stryMutAct_9fa48("330") ? "" : (stryCov_9fa48("330"), 'aegis-secure-meta-v1');
const SECURE_DB_STORE = stryMutAct_9fa48("331") ? "" : (stryCov_9fa48("331"), 'secure_kv');
const SECURE_DB_KEY = stryMutAct_9fa48("332") ? "" : (stryCov_9fa48("332"), 'passkey_state_v2');
const DEFAULT_POLICY: PasskeyPolicy = stryMutAct_9fa48("333") ? {} : (stryCov_9fa48("333"), {
  maxBindingAgeDays: 90,
  requireRecoveryExportBeforeRotation: stryMutAct_9fa48("334") ? true : (stryCov_9fa48("334"), false),
  blockRevokedCredentials: stryMutAct_9fa48("335") ? false : (stryCov_9fa48("335"), true)
});
interface PasskeySecureState {
  bindings: Record<string, PasskeyBindingRecord>;
  auditLog: PasskeyEventRecord[];
  revocations: PasskeyRevocationRecord[];
  policy: PasskeyPolicy;
}
const profileKey = (profileId?: string | null, dbName?: string) => {
  if (stryMutAct_9fa48("336")) {
    {}
  } else {
    stryCov_9fa48("336");
    return stryMutAct_9fa48("337") ? `` : (stryCov_9fa48("337"), `${stryMutAct_9fa48("340") ? profileId && 'default' : stryMutAct_9fa48("339") ? false : stryMutAct_9fa48("338") ? true : (stryCov_9fa48("338", "339", "340"), profileId || (stryMutAct_9fa48("341") ? "" : (stryCov_9fa48("341"), 'default')))}::${stryMutAct_9fa48("344") ? dbName && 'aegis_opfs_vault' : stryMutAct_9fa48("343") ? false : stryMutAct_9fa48("342") ? true : (stryCov_9fa48("342", "343", "344"), dbName || (stryMutAct_9fa48("345") ? "" : (stryCov_9fa48("345"), 'aegis_opfs_vault')))}`);
  }
};
const safeParse = <T,>(raw: string | null): T | null => {
  if (stryMutAct_9fa48("346")) {
    {}
  } else {
    stryCov_9fa48("346");
    if (stryMutAct_9fa48("349") ? false : stryMutAct_9fa48("348") ? true : stryMutAct_9fa48("347") ? raw : (stryCov_9fa48("347", "348", "349"), !raw)) return null;
    try {
      if (stryMutAct_9fa48("350")) {
        {}
      } else {
        stryCov_9fa48("350");
        return JSON.parse(raw) as T;
      }
    } catch {
      if (stryMutAct_9fa48("351")) {
        {}
      } else {
        stryCov_9fa48("351");
        return null;
      }
    }
  }
};
const cloneState = stryMutAct_9fa48("352") ? () => undefined : (stryCov_9fa48("352"), (() => {
  const cloneState = (state: PasskeySecureState): PasskeySecureState => stryMutAct_9fa48("353") ? {} : (stryCov_9fa48("353"), {
    bindings: JSON.parse(JSON.stringify(stryMutAct_9fa48("356") ? state.bindings && {} : stryMutAct_9fa48("355") ? false : stryMutAct_9fa48("354") ? true : (stryCov_9fa48("354", "355", "356"), state.bindings || {}))),
    auditLog: stryMutAct_9fa48("357") ? [] : (stryCov_9fa48("357"), [...(stryMutAct_9fa48("360") ? state.auditLog && [] : stryMutAct_9fa48("359") ? false : stryMutAct_9fa48("358") ? true : (stryCov_9fa48("358", "359", "360"), state.auditLog || (stryMutAct_9fa48("361") ? ["Stryker was here"] : (stryCov_9fa48("361"), []))))]),
    revocations: stryMutAct_9fa48("362") ? [] : (stryCov_9fa48("362"), [...(stryMutAct_9fa48("365") ? state.revocations && [] : stryMutAct_9fa48("364") ? false : stryMutAct_9fa48("363") ? true : (stryCov_9fa48("363", "364", "365"), state.revocations || (stryMutAct_9fa48("366") ? ["Stryker was here"] : (stryCov_9fa48("366"), []))))]),
    policy: stryMutAct_9fa48("367") ? {} : (stryCov_9fa48("367"), {
      ...DEFAULT_POLICY,
      ...(stryMutAct_9fa48("370") ? state.policy && {} : stryMutAct_9fa48("369") ? false : stryMutAct_9fa48("368") ? true : (stryCov_9fa48("368", "369", "370"), state.policy || {}))
    })
  });
  return cloneState;
})());
const createDefaultState = stryMutAct_9fa48("371") ? () => undefined : (stryCov_9fa48("371"), (() => {
  const createDefaultState = (): PasskeySecureState => stryMutAct_9fa48("372") ? {} : (stryCov_9fa48("372"), {
    bindings: {},
    auditLog: stryMutAct_9fa48("373") ? ["Stryker was here"] : (stryCov_9fa48("373"), []),
    revocations: stryMutAct_9fa48("374") ? ["Stryker was here"] : (stryCov_9fa48("374"), []),
    policy: stryMutAct_9fa48("375") ? {} : (stryCov_9fa48("375"), {
      ...DEFAULT_POLICY
    })
  });
  return createDefaultState;
})());
let secureStateCache: PasskeySecureState = createDefaultState();
let secureStateInitialized = stryMutAct_9fa48("376") ? true : (stryCov_9fa48("376"), false);
let secureStateInitPromise: Promise<void> | null = null;
let secureStatePersistPromise: Promise<void> = Promise.resolve();
const hasIndexedDb = stryMutAct_9fa48("377") ? () => undefined : (stryCov_9fa48("377"), (() => {
  const hasIndexedDb = () => stryMutAct_9fa48("380") ? typeof indexedDB === 'undefined' : stryMutAct_9fa48("379") ? false : stryMutAct_9fa48("378") ? true : (stryCov_9fa48("378", "379", "380"), typeof indexedDB !== (stryMutAct_9fa48("381") ? "" : (stryCov_9fa48("381"), 'undefined')));
  return hasIndexedDb;
})());
const openSecureDb = async (): Promise<IDBDatabase | null> => {
  if (stryMutAct_9fa48("382")) {
    {}
  } else {
    stryCov_9fa48("382");
    if (stryMutAct_9fa48("385") ? false : stryMutAct_9fa48("384") ? true : stryMutAct_9fa48("383") ? hasIndexedDb() : (stryCov_9fa48("383", "384", "385"), !hasIndexedDb())) return null;
    return await new Promise((resolve, reject) => {
      if (stryMutAct_9fa48("386")) {
        {}
      } else {
        stryCov_9fa48("386");
        const request = indexedDB.open(SECURE_DB_NAME, 1);
        request.onupgradeneeded = () => {
          if (stryMutAct_9fa48("387")) {
            {}
          } else {
            stryCov_9fa48("387");
            const db = request.result;
            if (stryMutAct_9fa48("390") ? false : stryMutAct_9fa48("389") ? true : stryMutAct_9fa48("388") ? db.objectStoreNames.contains(SECURE_DB_STORE) : (stryCov_9fa48("388", "389", "390"), !db.objectStoreNames.contains(SECURE_DB_STORE))) {
              if (stryMutAct_9fa48("391")) {
                {}
              } else {
                stryCov_9fa48("391");
                db.createObjectStore(SECURE_DB_STORE);
              }
            }
          }
        };
        request.onsuccess = stryMutAct_9fa48("392") ? () => undefined : (stryCov_9fa48("392"), () => resolve(request.result));
        request.onerror = stryMutAct_9fa48("393") ? () => undefined : (stryCov_9fa48("393"), () => reject(stryMutAct_9fa48("396") ? request.error && new Error('SECURE_DB_OPEN_FAILED') : stryMutAct_9fa48("395") ? false : stryMutAct_9fa48("394") ? true : (stryCov_9fa48("394", "395", "396"), request.error || new Error(stryMutAct_9fa48("397") ? "" : (stryCov_9fa48("397"), 'SECURE_DB_OPEN_FAILED')))));
      }
    });
  }
};
const readStateFromIndexedDb = async (): Promise<PasskeySecureState | null> => {
  if (stryMutAct_9fa48("398")) {
    {}
  } else {
    stryCov_9fa48("398");
    const db = await openSecureDb();
    if (stryMutAct_9fa48("401") ? false : stryMutAct_9fa48("400") ? true : stryMutAct_9fa48("399") ? db : (stryCov_9fa48("399", "400", "401"), !db)) return null;
    return await new Promise((resolve, reject) => {
      if (stryMutAct_9fa48("402")) {
        {}
      } else {
        stryCov_9fa48("402");
        const tx = db.transaction(SECURE_DB_STORE, stryMutAct_9fa48("403") ? "" : (stryCov_9fa48("403"), 'readonly'));
        const store = tx.objectStore(SECURE_DB_STORE);
        const request = store.get(SECURE_DB_KEY);
        request.onsuccess = () => {
          if (stryMutAct_9fa48("404")) {
            {}
          } else {
            stryCov_9fa48("404");
            resolve(request.result ? normalizePersistedState(request.result) : null);
          }
        };
        request.onerror = stryMutAct_9fa48("405") ? () => undefined : (stryCov_9fa48("405"), () => reject(stryMutAct_9fa48("408") ? request.error && new Error('SECURE_DB_READ_FAILED') : stryMutAct_9fa48("407") ? false : stryMutAct_9fa48("406") ? true : (stryCov_9fa48("406", "407", "408"), request.error || new Error(stryMutAct_9fa48("409") ? "" : (stryCov_9fa48("409"), 'SECURE_DB_READ_FAILED')))));
        tx.oncomplete = stryMutAct_9fa48("410") ? () => undefined : (stryCov_9fa48("410"), () => db.close());
        tx.onerror = stryMutAct_9fa48("411") ? () => undefined : (stryCov_9fa48("411"), () => reject(stryMutAct_9fa48("414") ? tx.error && new Error('SECURE_DB_READ_FAILED') : stryMutAct_9fa48("413") ? false : stryMutAct_9fa48("412") ? true : (stryCov_9fa48("412", "413", "414"), tx.error || new Error(stryMutAct_9fa48("415") ? "" : (stryCov_9fa48("415"), 'SECURE_DB_READ_FAILED')))));
      }
    });
  }
};
const writeStateToIndexedDb = async (state: PasskeySecureState): Promise<void> => {
  if (stryMutAct_9fa48("416")) {
    {}
  } else {
    stryCov_9fa48("416");
    const db = await openSecureDb();
    if (stryMutAct_9fa48("419") ? false : stryMutAct_9fa48("418") ? true : stryMutAct_9fa48("417") ? db : (stryCov_9fa48("417", "418", "419"), !db)) return;
    await new Promise<void>((resolve, reject) => {
      if (stryMutAct_9fa48("420")) {
        {}
      } else {
        stryCov_9fa48("420");
        const tx = db.transaction(SECURE_DB_STORE, stryMutAct_9fa48("421") ? "" : (stryCov_9fa48("421"), 'readwrite'));
        const store = tx.objectStore(SECURE_DB_STORE);
        store.put(cloneState(state), SECURE_DB_KEY);
        tx.oncomplete = () => {
          if (stryMutAct_9fa48("422")) {
            {}
          } else {
            stryCov_9fa48("422");
            db.close();
            resolve();
          }
        };
        tx.onerror = stryMutAct_9fa48("423") ? () => undefined : (stryCov_9fa48("423"), () => reject(stryMutAct_9fa48("426") ? tx.error && new Error('SECURE_DB_WRITE_FAILED') : stryMutAct_9fa48("425") ? false : stryMutAct_9fa48("424") ? true : (stryCov_9fa48("424", "425", "426"), tx.error || new Error(stryMutAct_9fa48("427") ? "" : (stryCov_9fa48("427"), 'SECURE_DB_WRITE_FAILED')))));
      }
    });
  }
};
const clearStateInIndexedDb = async (): Promise<void> => {
  if (stryMutAct_9fa48("428")) {
    {}
  } else {
    stryCov_9fa48("428");
    const db = await openSecureDb();
    if (stryMutAct_9fa48("431") ? false : stryMutAct_9fa48("430") ? true : stryMutAct_9fa48("429") ? db : (stryCov_9fa48("429", "430", "431"), !db)) return;
    await new Promise<void>((resolve, reject) => {
      if (stryMutAct_9fa48("432")) {
        {}
      } else {
        stryCov_9fa48("432");
        const tx = db.transaction(SECURE_DB_STORE, stryMutAct_9fa48("433") ? "" : (stryCov_9fa48("433"), 'readwrite'));
        tx.objectStore(SECURE_DB_STORE).delete(SECURE_DB_KEY);
        tx.oncomplete = () => {
          if (stryMutAct_9fa48("434")) {
            {}
          } else {
            stryCov_9fa48("434");
            db.close();
            resolve();
          }
        };
        tx.onerror = stryMutAct_9fa48("435") ? () => undefined : (stryCov_9fa48("435"), () => reject(stryMutAct_9fa48("438") ? tx.error && new Error('SECURE_DB_CLEAR_FAILED') : stryMutAct_9fa48("437") ? false : stryMutAct_9fa48("436") ? true : (stryCov_9fa48("436", "437", "438"), tx.error || new Error(stryMutAct_9fa48("439") ? "" : (stryCov_9fa48("439"), 'SECURE_DB_CLEAR_FAILED')))));
      }
    });
  }
};
const normalizePersistedState = (state: unknown): PasskeySecureState => {
  if (stryMutAct_9fa48("440")) {
    {}
  } else {
    stryCov_9fa48("440");
    const candidate = (stryMutAct_9fa48("443") ? state || typeof state === 'object' : stryMutAct_9fa48("442") ? false : stryMutAct_9fa48("441") ? true : (stryCov_9fa48("441", "442", "443"), state && (stryMutAct_9fa48("445") ? typeof state !== 'object' : stryMutAct_9fa48("444") ? true : (stryCov_9fa48("444", "445"), typeof state === (stryMutAct_9fa48("446") ? "" : (stryCov_9fa48("446"), 'object')))))) ? state as Partial<PasskeySecureState> : {};
    return stryMutAct_9fa48("447") ? {} : (stryCov_9fa48("447"), {
      bindings: (stryMutAct_9fa48("450") ? candidate.bindings || typeof candidate.bindings === 'object' : stryMutAct_9fa48("449") ? false : stryMutAct_9fa48("448") ? true : (stryCov_9fa48("448", "449", "450"), candidate.bindings && (stryMutAct_9fa48("452") ? typeof candidate.bindings !== 'object' : stryMutAct_9fa48("451") ? true : (stryCov_9fa48("451", "452"), typeof candidate.bindings === (stryMutAct_9fa48("453") ? "" : (stryCov_9fa48("453"), 'object')))))) ? Object.fromEntries(Object.entries(candidate.bindings).map(stryMutAct_9fa48("454") ? () => undefined : (stryCov_9fa48("454"), ([k, v]) => stryMutAct_9fa48("455") ? [] : (stryCov_9fa48("455"), [k, stryMutAct_9fa48("456") ? {} : (stryCov_9fa48("456"), {
        credentialId: stryMutAct_9fa48("459") ? (v as any).credentialId && '' : stryMutAct_9fa48("458") ? false : stryMutAct_9fa48("457") ? true : (stryCov_9fa48("457", "458", "459"), (v as any).credentialId || (stryMutAct_9fa48("460") ? "Stryker was here!" : (stryCov_9fa48("460"), ''))),
        boundAt: stryMutAct_9fa48("463") ? (v as any).boundAt && new Date().toISOString() : stryMutAct_9fa48("462") ? false : stryMutAct_9fa48("461") ? true : (stryCov_9fa48("461", "462", "463"), (v as any).boundAt || new Date().toISOString()),
        lastUsedAt: (v as any).lastUsedAt,
        meta: stryMutAct_9fa48("464") ? {} : (stryCov_9fa48("464"), {
          version: stryMutAct_9fa48("467") ? (v as any).meta?.version && '1.0.0' : stryMutAct_9fa48("466") ? false : stryMutAct_9fa48("465") ? true : (stryCov_9fa48("465", "466", "467"), (stryMutAct_9fa48("468") ? (v as any).meta.version : (stryCov_9fa48("468"), (v as any).meta?.version)) || (stryMutAct_9fa48("469") ? "" : (stryCov_9fa48("469"), '1.0.0'))),
          origin: stryMutAct_9fa48("470") ? (v as any).meta.origin : (stryCov_9fa48("470"), (v as any).meta?.origin)
        })
      })])))) : {},
      auditLog: Array.isArray(candidate.auditLog) ? candidate.auditLog : stryMutAct_9fa48("471") ? ["Stryker was here"] : (stryCov_9fa48("471"), []),
      revocations: Array.isArray(candidate.revocations) ? candidate.revocations : stryMutAct_9fa48("472") ? ["Stryker was here"] : (stryCov_9fa48("472"), []),
      policy: stryMutAct_9fa48("473") ? {} : (stryCov_9fa48("473"), {
        maxBindingAgeDays: (stryMutAct_9fa48("476") ? typeof candidate.policy?.maxBindingAgeDays !== 'number' : stryMutAct_9fa48("475") ? false : stryMutAct_9fa48("474") ? true : (stryCov_9fa48("474", "475", "476"), typeof (stryMutAct_9fa48("477") ? candidate.policy.maxBindingAgeDays : (stryCov_9fa48("477"), candidate.policy?.maxBindingAgeDays)) === (stryMutAct_9fa48("478") ? "" : (stryCov_9fa48("478"), 'number')))) ? candidate.policy.maxBindingAgeDays : DEFAULT_POLICY.maxBindingAgeDays,
        requireRecoveryExportBeforeRotation: (stryMutAct_9fa48("481") ? typeof candidate.policy?.requireRecoveryExportBeforeRotation !== 'boolean' : stryMutAct_9fa48("480") ? false : stryMutAct_9fa48("479") ? true : (stryCov_9fa48("479", "480", "481"), typeof (stryMutAct_9fa48("482") ? candidate.policy.requireRecoveryExportBeforeRotation : (stryCov_9fa48("482"), candidate.policy?.requireRecoveryExportBeforeRotation)) === (stryMutAct_9fa48("483") ? "" : (stryCov_9fa48("483"), 'boolean')))) ? candidate.policy.requireRecoveryExportBeforeRotation : DEFAULT_POLICY.requireRecoveryExportBeforeRotation,
        blockRevokedCredentials: (stryMutAct_9fa48("486") ? typeof candidate.policy?.blockRevokedCredentials !== 'boolean' : stryMutAct_9fa48("485") ? false : stryMutAct_9fa48("484") ? true : (stryCov_9fa48("484", "485", "486"), typeof (stryMutAct_9fa48("487") ? candidate.policy.blockRevokedCredentials : (stryCov_9fa48("487"), candidate.policy?.blockRevokedCredentials)) === (stryMutAct_9fa48("488") ? "" : (stryCov_9fa48("488"), 'boolean')))) ? candidate.policy.blockRevokedCredentials : DEFAULT_POLICY.blockRevokedCredentials
      })
    });
  }
};
const clearLegacyStorageKeys = () => {
  if (stryMutAct_9fa48("489")) {
    {}
  } else {
    stryCov_9fa48("489");
    localStorage.removeItem(BINDINGS_KEY);
    localStorage.removeItem(LEGACY_ID_KEY);
    localStorage.removeItem(LEGACY_DATA_KEY);
    localStorage.removeItem(LEGACY_SALT_KEY);
    localStorage.removeItem(LEGACY_META_KEY);
    localStorage.removeItem(PASSKEY_AUDIT_KEY);
    localStorage.removeItem(PASSKEY_REVOCATIONS_KEY);
    localStorage.removeItem(PASSKEY_POLICY_KEY);
  }
};
const loadLegacyState = (): PasskeySecureState => {
  if (stryMutAct_9fa48("490")) {
    {}
  } else {
    stryCov_9fa48("490");
    const bindings = safeParse<Record<string, PasskeyBindingRecord>>(localStorage.getItem(BINDINGS_KEY));
    const auditLog = safeParse<PasskeyEventRecord[]>(localStorage.getItem(PASSKEY_AUDIT_KEY));
    const revocations = safeParse<PasskeyRevocationRecord[]>(localStorage.getItem(PASSKEY_REVOCATIONS_KEY));
    const policyRaw = safeParse<PasskeyPolicy>(localStorage.getItem(PASSKEY_POLICY_KEY));
    return normalizePersistedState(stryMutAct_9fa48("491") ? {} : (stryCov_9fa48("491"), {
      bindings: (stryMutAct_9fa48("494") ? bindings || typeof bindings === 'object' : stryMutAct_9fa48("493") ? false : stryMutAct_9fa48("492") ? true : (stryCov_9fa48("492", "493", "494"), bindings && (stryMutAct_9fa48("496") ? typeof bindings !== 'object' : stryMutAct_9fa48("495") ? true : (stryCov_9fa48("495", "496"), typeof bindings === (stryMutAct_9fa48("497") ? "" : (stryCov_9fa48("497"), 'object')))))) ? bindings : {},
      auditLog: Array.isArray(auditLog) ? auditLog : stryMutAct_9fa48("498") ? ["Stryker was here"] : (stryCov_9fa48("498"), []),
      revocations: Array.isArray(revocations) ? revocations : stryMutAct_9fa48("499") ? ["Stryker was here"] : (stryCov_9fa48("499"), []),
      policy: stryMutAct_9fa48("502") ? policyRaw && DEFAULT_POLICY : stryMutAct_9fa48("501") ? false : stryMutAct_9fa48("500") ? true : (stryCov_9fa48("500", "501", "502"), policyRaw || DEFAULT_POLICY)
    }));
  }
};
const schedulePersist = () => {
  if (stryMutAct_9fa48("503")) {
    {}
  } else {
    stryCov_9fa48("503");
    secureStatePersistPromise = secureStatePersistPromise.catch(() => undefined).then(async () => {
      if (stryMutAct_9fa48("504")) {
        {}
      } else {
        stryCov_9fa48("504");
        if (stryMutAct_9fa48("507") ? false : stryMutAct_9fa48("506") ? true : stryMutAct_9fa48("505") ? hasIndexedDb() : (stryCov_9fa48("505", "506", "507"), !hasIndexedDb())) return;
        await writeStateToIndexedDb(secureStateCache);
      }
    });
    return secureStatePersistPromise;
  }
};
const ensureBootstrappedState = () => {
  if (stryMutAct_9fa48("508")) {
    {}
  } else {
    stryCov_9fa48("508");
    if (stryMutAct_9fa48("510") ? false : stryMutAct_9fa48("509") ? true : (stryCov_9fa48("509", "510"), secureStateInitialized)) return;
    secureStateCache = loadLegacyState();
  }
};
const readBindingMap = (): Record<string, PasskeyBindingRecord> => {
  if (stryMutAct_9fa48("511")) {
    {}
  } else {
    stryCov_9fa48("511");
    ensureBootstrappedState();
    return secureStateCache.bindings;
  }
};
const writeBindingMap = (map: Record<string, PasskeyBindingRecord>) => {
  if (stryMutAct_9fa48("512")) {
    {}
  } else {
    stryCov_9fa48("512");
    secureStateCache.bindings = map;
    void schedulePersist();
  }
};
const readAuditLog = (): PasskeyEventRecord[] => {
  if (stryMutAct_9fa48("513")) {
    {}
  } else {
    stryCov_9fa48("513");
    ensureBootstrappedState();
    return secureStateCache.auditLog;
  }
};
const writeAuditLog = (events: PasskeyEventRecord[]) => {
  if (stryMutAct_9fa48("514")) {
    {}
  } else {
    stryCov_9fa48("514");
    secureStateCache.auditLog = stryMutAct_9fa48("515") ? events : (stryCov_9fa48("515"), events.slice(stryMutAct_9fa48("516") ? -PASSKEY_EVENT_LIMIT / 4 : (stryCov_9fa48("516"), (stryMutAct_9fa48("517") ? +PASSKEY_EVENT_LIMIT : (stryCov_9fa48("517"), -PASSKEY_EVENT_LIMIT)) * 4)));
    void schedulePersist();
  }
};
const readRevocations = (): PasskeyRevocationRecord[] => {
  if (stryMutAct_9fa48("518")) {
    {}
  } else {
    stryCov_9fa48("518");
    ensureBootstrappedState();
    return secureStateCache.revocations;
  }
};
const writeRevocations = (items: PasskeyRevocationRecord[]) => {
  if (stryMutAct_9fa48("519")) {
    {}
  } else {
    stryCov_9fa48("519");
    secureStateCache.revocations = stryMutAct_9fa48("520") ? items : (stryCov_9fa48("520"), items.slice(stryMutAct_9fa48("521") ? -PASSKEY_EVENT_LIMIT / 4 : (stryCov_9fa48("521"), (stryMutAct_9fa48("522") ? +PASSKEY_EVENT_LIMIT : (stryCov_9fa48("522"), -PASSKEY_EVENT_LIMIT)) * 4)));
    void schedulePersist();
  }
};
const readPolicy = (): PasskeyPolicy => {
  if (stryMutAct_9fa48("523")) {
    {}
  } else {
    stryCov_9fa48("523");
    ensureBootstrappedState();
    const parsed = secureStateCache.policy;
    return stryMutAct_9fa48("524") ? {} : (stryCov_9fa48("524"), {
      maxBindingAgeDays: (stryMutAct_9fa48("527") ? typeof parsed?.maxBindingAgeDays !== 'number' : stryMutAct_9fa48("526") ? false : stryMutAct_9fa48("525") ? true : (stryCov_9fa48("525", "526", "527"), typeof (stryMutAct_9fa48("528") ? parsed.maxBindingAgeDays : (stryCov_9fa48("528"), parsed?.maxBindingAgeDays)) === (stryMutAct_9fa48("529") ? "" : (stryCov_9fa48("529"), 'number')))) ? parsed.maxBindingAgeDays : DEFAULT_POLICY.maxBindingAgeDays,
      requireRecoveryExportBeforeRotation: (stryMutAct_9fa48("532") ? typeof parsed?.requireRecoveryExportBeforeRotation !== 'boolean' : stryMutAct_9fa48("531") ? false : stryMutAct_9fa48("530") ? true : (stryCov_9fa48("530", "531", "532"), typeof (stryMutAct_9fa48("533") ? parsed.requireRecoveryExportBeforeRotation : (stryCov_9fa48("533"), parsed?.requireRecoveryExportBeforeRotation)) === (stryMutAct_9fa48("534") ? "" : (stryCov_9fa48("534"), 'boolean')))) ? parsed.requireRecoveryExportBeforeRotation : DEFAULT_POLICY.requireRecoveryExportBeforeRotation,
      blockRevokedCredentials: (stryMutAct_9fa48("537") ? typeof parsed?.blockRevokedCredentials !== 'boolean' : stryMutAct_9fa48("536") ? false : stryMutAct_9fa48("535") ? true : (stryCov_9fa48("535", "536", "537"), typeof (stryMutAct_9fa48("538") ? parsed.blockRevokedCredentials : (stryCov_9fa48("538"), parsed?.blockRevokedCredentials)) === (stryMutAct_9fa48("539") ? "" : (stryCov_9fa48("539"), 'boolean')))) ? parsed.blockRevokedCredentials : DEFAULT_POLICY.blockRevokedCredentials
    });
  }
};
const writePolicy = (policy: PasskeyPolicy) => {
  if (stryMutAct_9fa48("540")) {
    {}
  } else {
    stryCov_9fa48("540");
    secureStateCache.policy = policy;
    void schedulePersist();
  }
};
const getDeviceInfo = () => {
  if (stryMutAct_9fa48("541")) {
    {}
  } else {
    stryCov_9fa48("541");
    const platform = (stryMutAct_9fa48("544") ? typeof navigator === 'undefined' : stryMutAct_9fa48("543") ? false : stryMutAct_9fa48("542") ? true : (stryCov_9fa48("542", "543", "544"), typeof navigator !== (stryMutAct_9fa48("545") ? "" : (stryCov_9fa48("545"), 'undefined')))) ? stryMutAct_9fa48("548") ? navigator.platform && 'unknown' : stryMutAct_9fa48("547") ? false : stryMutAct_9fa48("546") ? true : (stryCov_9fa48("546", "547", "548"), navigator.platform || (stryMutAct_9fa48("549") ? "" : (stryCov_9fa48("549"), 'unknown'))) : stryMutAct_9fa48("550") ? "" : (stryCov_9fa48("550"), 'unknown');
    const locale = (stryMutAct_9fa48("553") ? typeof navigator === 'undefined' : stryMutAct_9fa48("552") ? false : stryMutAct_9fa48("551") ? true : (stryCov_9fa48("551", "552", "553"), typeof navigator !== (stryMutAct_9fa48("554") ? "" : (stryCov_9fa48("554"), 'undefined')))) ? stryMutAct_9fa48("557") ? navigator.language && 'en' : stryMutAct_9fa48("556") ? false : stryMutAct_9fa48("555") ? true : (stryCov_9fa48("555", "556", "557"), navigator.language || (stryMutAct_9fa48("558") ? "" : (stryCov_9fa48("558"), 'en'))) : stryMutAct_9fa48("559") ? "" : (stryCov_9fa48("559"), 'en');
    const userAgent = (stryMutAct_9fa48("562") ? typeof navigator === 'undefined' : stryMutAct_9fa48("561") ? false : stryMutAct_9fa48("560") ? true : (stryCov_9fa48("560", "561", "562"), typeof navigator !== (stryMutAct_9fa48("563") ? "" : (stryCov_9fa48("563"), 'undefined')))) ? stryMutAct_9fa48("566") ? navigator.userAgent && '' : stryMutAct_9fa48("565") ? false : stryMutAct_9fa48("564") ? true : (stryCov_9fa48("564", "565", "566"), navigator.userAgent || (stryMutAct_9fa48("567") ? "Stryker was here!" : (stryCov_9fa48("567"), ''))) : stryMutAct_9fa48("568") ? "Stryker was here!" : (stryCov_9fa48("568"), '');
    const deviceLabel = stryMutAct_9fa48("569") ? `` : (stryCov_9fa48("569"), `This device / ${platform}`);
    const fingerprintSource = JSON.stringify(stryMutAct_9fa48("570") ? {} : (stryCov_9fa48("570"), {
      platform,
      locale,
      userAgent
    }));
    let hash = 0;
    for (let i = 0; stryMutAct_9fa48("573") ? i >= fingerprintSource.length : stryMutAct_9fa48("572") ? i <= fingerprintSource.length : stryMutAct_9fa48("571") ? false : (stryCov_9fa48("571", "572", "573"), i < fingerprintSource.length); stryMutAct_9fa48("574") ? i -= 1 : (stryCov_9fa48("574"), i += 1)) {
      if (stryMutAct_9fa48("575")) {
        {}
      } else {
        stryCov_9fa48("575");
        hash = stryMutAct_9fa48("576") ? (hash << 5) - hash - fingerprintSource.charCodeAt(i) : (stryCov_9fa48("576"), (stryMutAct_9fa48("577") ? (hash << 5) + hash : (stryCov_9fa48("577"), (hash << 5) - hash)) + fingerprintSource.charCodeAt(i));
        stryMutAct_9fa48("578") ? hash &= 0 : (stryCov_9fa48("578"), hash |= 0);
      }
    }
    const normalized = Math.abs(hash).toString(16).padStart(8, stryMutAct_9fa48("579") ? "" : (stryCov_9fa48("579"), '0'));
    return stryMutAct_9fa48("580") ? {} : (stryCov_9fa48("580"), {
      deviceLabel,
      deviceFingerprint: normalized
    });
  }
};
const appendEvent = (map: Record<string, PasskeyBindingRecord>, key: string, event: PasskeyEventRecord) => {
  if (stryMutAct_9fa48("581")) {
    {}
  } else {
    stryCov_9fa48("581");
    if (stryMutAct_9fa48("583") ? false : stryMutAct_9fa48("582") ? true : (stryCov_9fa48("582", "583"), map[key])) {
      if (stryMutAct_9fa48("584")) {
        {}
      } else {
        stryCov_9fa48("584");
        map[key].eventLog = stryMutAct_9fa48("585") ? [...(map[key].eventLog || []), event] : (stryCov_9fa48("585"), (stryMutAct_9fa48("586") ? [] : (stryCov_9fa48("586"), [...(stryMutAct_9fa48("589") ? map[key].eventLog && [] : stryMutAct_9fa48("588") ? false : stryMutAct_9fa48("587") ? true : (stryCov_9fa48("587", "588", "589"), map[key].eventLog || (stryMutAct_9fa48("590") ? ["Stryker was here"] : (stryCov_9fa48("590"), [])))), event])).slice(stryMutAct_9fa48("591") ? +PASSKEY_EVENT_LIMIT : (stryCov_9fa48("591"), -PASSKEY_EVENT_LIMIT)));
      }
    }
    writeAuditLog(stryMutAct_9fa48("592") ? [] : (stryCov_9fa48("592"), [...readAuditLog(), event]));
  }
};
const migrateLegacyIfExists = (profileId?: string | null, dbName?: string): PasskeyBindingRecord | null => {
  if (stryMutAct_9fa48("593")) {
    {}
  } else {
    stryCov_9fa48("593");
    const credentialId = stryMutAct_9fa48("596") ? localStorage.getItem(LEGACY_ID_KEY) && '' : stryMutAct_9fa48("595") ? false : stryMutAct_9fa48("594") ? true : (stryCov_9fa48("594", "595", "596"), localStorage.getItem(LEGACY_ID_KEY) || (stryMutAct_9fa48("597") ? "Stryker was here!" : (stryCov_9fa48("597"), '')));
    const encryptedPayload = stryMutAct_9fa48("600") ? localStorage.getItem(LEGACY_DATA_KEY) && '' : stryMutAct_9fa48("599") ? false : stryMutAct_9fa48("598") ? true : (stryCov_9fa48("598", "599", "600"), localStorage.getItem(LEGACY_DATA_KEY) || (stryMutAct_9fa48("601") ? "Stryker was here!" : (stryCov_9fa48("601"), '')));
    const prfSalt = stryMutAct_9fa48("604") ? localStorage.getItem(LEGACY_SALT_KEY) && '' : stryMutAct_9fa48("603") ? false : stryMutAct_9fa48("602") ? true : (stryCov_9fa48("602", "603", "604"), localStorage.getItem(LEGACY_SALT_KEY) || (stryMutAct_9fa48("605") ? "Stryker was here!" : (stryCov_9fa48("605"), '')));
    if (stryMutAct_9fa48("608") ? (!credentialId || !encryptedPayload) && !prfSalt : stryMutAct_9fa48("607") ? false : stryMutAct_9fa48("606") ? true : (stryCov_9fa48("606", "607", "608"), (stryMutAct_9fa48("610") ? !credentialId && !encryptedPayload : stryMutAct_9fa48("609") ? false : (stryCov_9fa48("609", "610"), (stryMutAct_9fa48("611") ? credentialId : (stryCov_9fa48("611"), !credentialId)) || (stryMutAct_9fa48("612") ? encryptedPayload : (stryCov_9fa48("612"), !encryptedPayload)))) || (stryMutAct_9fa48("613") ? prfSalt : (stryCov_9fa48("613"), !prfSalt)))) return null;
    const legacyMeta = safeParse<PasskeyBindingMeta>(localStorage.getItem(LEGACY_META_KEY));
    const now = new Date().toISOString();
    const record: PasskeyBindingRecord = stryMutAct_9fa48("614") ? {} : (stryCov_9fa48("614"), {
      credentialId,
      encryptedPayload,
      prfSalt,
      meta: stryMutAct_9fa48("615") ? {} : (stryCov_9fa48("615"), {
        createdAt: stryMutAct_9fa48("618") ? legacyMeta?.createdAt && now : stryMutAct_9fa48("617") ? false : stryMutAct_9fa48("616") ? true : (stryCov_9fa48("616", "617", "618"), (stryMutAct_9fa48("619") ? legacyMeta.createdAt : (stryCov_9fa48("619"), legacyMeta?.createdAt)) || now),
        lastUsedAt: stryMutAct_9fa48("622") ? legacyMeta?.lastUsedAt && now : stryMutAct_9fa48("621") ? false : stryMutAct_9fa48("620") ? true : (stryCov_9fa48("620", "621", "622"), (stryMutAct_9fa48("623") ? legacyMeta.lastUsedAt : (stryCov_9fa48("623"), legacyMeta?.lastUsedAt)) || now),
        version: 1,
        profileId: stryMutAct_9fa48("626") ? (profileId || legacyMeta?.profileId) && null : stryMutAct_9fa48("625") ? false : stryMutAct_9fa48("624") ? true : (stryCov_9fa48("624", "625", "626"), (stryMutAct_9fa48("628") ? profileId && legacyMeta?.profileId : stryMutAct_9fa48("627") ? false : (stryCov_9fa48("627", "628"), profileId || (stryMutAct_9fa48("629") ? legacyMeta.profileId : (stryCov_9fa48("629"), legacyMeta?.profileId)))) || null),
        dbName: stryMutAct_9fa48("632") ? (dbName || legacyMeta?.dbName) && 'aegis_opfs_vault' : stryMutAct_9fa48("631") ? false : stryMutAct_9fa48("630") ? true : (stryCov_9fa48("630", "631", "632"), (stryMutAct_9fa48("634") ? dbName && legacyMeta?.dbName : stryMutAct_9fa48("633") ? false : (stryCov_9fa48("633", "634"), dbName || (stryMutAct_9fa48("635") ? legacyMeta.dbName : (stryCov_9fa48("635"), legacyMeta?.dbName)))) || (stryMutAct_9fa48("636") ? "" : (stryCov_9fa48("636"), 'aegis_opfs_vault'))),
        ...getDeviceInfo()
      }),
      eventLog: stryMutAct_9fa48("637") ? ["Stryker was here"] : (stryCov_9fa48("637"), [])
    });
    const map = readBindingMap();
    map[profileKey(profileId, dbName)] = record;
    appendEvent(map, profileKey(profileId, dbName), stryMutAct_9fa48("638") ? {} : (stryCov_9fa48("638"), {
      at: now,
      type: stryMutAct_9fa48("639") ? "" : (stryCov_9fa48("639"), 'legacy_migrated'),
      profileId: record.meta.profileId,
      dbName: record.meta.dbName,
      credentialId: record.credentialId,
      deviceFingerprint: record.meta.deviceFingerprint,
      detail: stryMutAct_9fa48("640") ? "" : (stryCov_9fa48("640"), 'Legacy passkey binding migrated into profile-scoped store.')
    }));
    writeBindingMap(map);
    localStorage.removeItem(LEGACY_ID_KEY);
    localStorage.removeItem(LEGACY_DATA_KEY);
    localStorage.removeItem(LEGACY_SALT_KEY);
    localStorage.removeItem(LEGACY_META_KEY);
    return record;
  }
};
export class PasskeyBindingService {
  static async initialize(): Promise<void> {
    if (stryMutAct_9fa48("641")) {
      {}
    } else {
      stryCov_9fa48("641");
      if (stryMutAct_9fa48("643") ? false : stryMutAct_9fa48("642") ? true : (stryCov_9fa48("642", "643"), secureStateInitialized)) return;
      if (stryMutAct_9fa48("645") ? false : stryMutAct_9fa48("644") ? true : (stryCov_9fa48("644", "645"), secureStateInitPromise)) return secureStateInitPromise;
      secureStateInitPromise = (async () => {
        if (stryMutAct_9fa48("646")) {
          {}
        } else {
          stryCov_9fa48("646");
          if (stryMutAct_9fa48("649") ? false : stryMutAct_9fa48("648") ? true : stryMutAct_9fa48("647") ? hasIndexedDb() : (stryCov_9fa48("647", "648", "649"), !hasIndexedDb())) {
            if (stryMutAct_9fa48("650")) {
              {}
            } else {
              stryCov_9fa48("650");
              secureStateCache = loadLegacyState();
              secureStateInitialized = stryMutAct_9fa48("651") ? false : (stryCov_9fa48("651"), true);
              return;
            }
          }
          try {
            if (stryMutAct_9fa48("652")) {
              {}
            } else {
              stryCov_9fa48("652");
              const stored = await readStateFromIndexedDb();
              if (stryMutAct_9fa48("654") ? false : stryMutAct_9fa48("653") ? true : (stryCov_9fa48("653", "654"), stored)) {
                if (stryMutAct_9fa48("655")) {
                  {}
                } else {
                  stryCov_9fa48("655");
                  secureStateCache = stored;
                }
              } else {
                if (stryMutAct_9fa48("656")) {
                  {}
                } else {
                  stryCov_9fa48("656");
                  secureStateCache = loadLegacyState();
                  await writeStateToIndexedDb(secureStateCache);
                }
              }
              clearLegacyStorageKeys();
            }
          } catch {
            if (stryMutAct_9fa48("657")) {
              {}
            } else {
              stryCov_9fa48("657");
              secureStateCache = loadLegacyState();
            }
          }
          secureStateInitialized = stryMutAct_9fa48("658") ? false : (stryCov_9fa48("658"), true);
        }
      })().finally(() => {
        if (stryMutAct_9fa48("659")) {
          {}
        } else {
          stryCov_9fa48("659");
          secureStateInitPromise = null;
        }
      });
      return secureStateInitPromise;
    }
  }
  static async flush(): Promise<void> {
    if (stryMutAct_9fa48("660")) {
      {}
    } else {
      stryCov_9fa48("660");
      await this.initialize();
      await schedulePersist();
    }
  }
  static getPolicy(): PasskeyPolicy {
    if (stryMutAct_9fa48("661")) {
      {}
    } else {
      stryCov_9fa48("661");
      return readPolicy();
    }
  }
  static updatePolicy(nextPolicy: Partial<PasskeyPolicy>): PasskeyPolicy {
    if (stryMutAct_9fa48("662")) {
      {}
    } else {
      stryCov_9fa48("662");
      const merged = stryMutAct_9fa48("663") ? {} : (stryCov_9fa48("663"), {
        ...readPolicy(),
        ...nextPolicy
      });
      writePolicy(merged);
      writeAuditLog(stryMutAct_9fa48("664") ? [] : (stryCov_9fa48("664"), [...readAuditLog(), stryMutAct_9fa48("665") ? {} : (stryCov_9fa48("665"), {
        at: new Date().toISOString(),
        type: stryMutAct_9fa48("666") ? "" : (stryCov_9fa48("666"), 'policy_updated'),
        detail: JSON.stringify(merged)
      })]));
      return merged;
    }
  }
  static getBinding(profileId?: string | null, dbName?: string): PasskeyBindingRecord | null {
    if (stryMutAct_9fa48("667")) {
      {}
    } else {
      stryCov_9fa48("667");
      const key = profileKey(profileId, dbName);
      const map = readBindingMap();
      if (stryMutAct_9fa48("669") ? false : stryMutAct_9fa48("668") ? true : (stryCov_9fa48("668", "669"), map[key])) return map[key];
      return migrateLegacyIfExists(profileId, dbName);
    }
  }
  static saveBinding(profileId: string | null, dbName: string, record: PasskeyBindingRecord): void {
    if (stryMutAct_9fa48("670")) {
      {}
    } else {
      stryCov_9fa48("670");
      const key = profileKey(profileId, dbName);
      const map = readBindingMap();
      const now = new Date().toISOString();
      const existing = map[key];
      const deviceInfo = getDeviceInfo();
      map[key] = stryMutAct_9fa48("671") ? {} : (stryCov_9fa48("671"), {
        ...record,
        meta: stryMutAct_9fa48("672") ? {} : (stryCov_9fa48("672"), {
          ...record.meta,
          createdAt: stryMutAct_9fa48("675") ? record.meta.createdAt && now : stryMutAct_9fa48("674") ? false : stryMutAct_9fa48("673") ? true : (stryCov_9fa48("673", "674", "675"), record.meta.createdAt || now),
          lastUsedAt: stryMutAct_9fa48("678") ? record.meta.lastUsedAt && now : stryMutAct_9fa48("677") ? false : stryMutAct_9fa48("676") ? true : (stryCov_9fa48("676", "677", "678"), record.meta.lastUsedAt || now),
          profileId,
          dbName,
          version: stryMutAct_9fa48("681") ? record.meta.version && '1.0.0' : stryMutAct_9fa48("680") ? false : stryMutAct_9fa48("679") ? true : (stryCov_9fa48("679", "680", "681"), record.meta.version || (stryMutAct_9fa48("682") ? "" : (stryCov_9fa48("682"), '1.0.0'))),
          deviceLabel: stryMutAct_9fa48("685") ? record.meta.deviceLabel && deviceInfo.deviceLabel : stryMutAct_9fa48("684") ? false : stryMutAct_9fa48("683") ? true : (stryCov_9fa48("683", "684", "685"), record.meta.deviceLabel || deviceInfo.deviceLabel),
          deviceFingerprint: stryMutAct_9fa48("688") ? record.meta.deviceFingerprint && deviceInfo.deviceFingerprint : stryMutAct_9fa48("687") ? false : stryMutAct_9fa48("686") ? true : (stryCov_9fa48("686", "687", "688"), record.meta.deviceFingerprint || deviceInfo.deviceFingerprint),
          rotatedAt: existing ? now : record.meta.rotatedAt,
          rotatedFromCredentialId: existing ? existing.credentialId : record.meta.rotatedFromCredentialId
        }),
        eventLog: stryMutAct_9fa48("689") ? [...(existing?.eventLog || []), ...(record.eventLog || [])] : (stryCov_9fa48("689"), (stryMutAct_9fa48("690") ? [] : (stryCov_9fa48("690"), [...(stryMutAct_9fa48("693") ? existing?.eventLog && [] : stryMutAct_9fa48("692") ? false : stryMutAct_9fa48("691") ? true : (stryCov_9fa48("691", "692", "693"), (stryMutAct_9fa48("694") ? existing.eventLog : (stryCov_9fa48("694"), existing?.eventLog)) || (stryMutAct_9fa48("695") ? ["Stryker was here"] : (stryCov_9fa48("695"), [])))), ...(stryMutAct_9fa48("698") ? record.eventLog && [] : stryMutAct_9fa48("697") ? false : stryMutAct_9fa48("696") ? true : (stryCov_9fa48("696", "697", "698"), record.eventLog || (stryMutAct_9fa48("699") ? ["Stryker was here"] : (stryCov_9fa48("699"), []))))])).slice(stryMutAct_9fa48("700") ? +PASSKEY_EVENT_LIMIT : (stryCov_9fa48("700"), -PASSKEY_EVENT_LIMIT)))
      });
      appendEvent(map, key, stryMutAct_9fa48("701") ? {} : (stryCov_9fa48("701"), {
        at: now,
        type: existing ? stryMutAct_9fa48("702") ? "" : (stryCov_9fa48("702"), 'rotated') : stryMutAct_9fa48("703") ? "" : (stryCov_9fa48("703"), 'bound'),
        profileId,
        dbName,
        credentialId: record.credentialId,
        deviceFingerprint: map[key].meta.deviceFingerprint,
        detail: existing ? stryMutAct_9fa48("704") ? "" : (stryCov_9fa48("704"), 'Passkey binding rotated on this device.') : stryMutAct_9fa48("705") ? "" : (stryCov_9fa48("705"), 'Passkey binding created on this device.')
      }));
      writeBindingMap(map);
    }
  }
  static updateLastUsed(profileId?: string | null, dbName?: string): void {
    if (stryMutAct_9fa48("706")) {
      {}
    } else {
      stryCov_9fa48("706");
      const key = profileKey(profileId, dbName);
      const map = readBindingMap();
      if (stryMutAct_9fa48("709") ? false : stryMutAct_9fa48("708") ? true : stryMutAct_9fa48("707") ? map[key] : (stryCov_9fa48("707", "708", "709"), !map[key])) return;
      const now = new Date().toISOString();
      map[key].meta = stryMutAct_9fa48("710") ? {} : (stryCov_9fa48("710"), {
        ...map[key].meta,
        lastUsedAt: now
      });
      appendEvent(map, key, stryMutAct_9fa48("711") ? {} : (stryCov_9fa48("711"), {
        at: now,
        type: stryMutAct_9fa48("712") ? "" : (stryCov_9fa48("712"), 'used'),
        profileId: map[key].meta.profileId,
        dbName: map[key].meta.dbName,
        credentialId: map[key].credentialId,
        deviceFingerprint: map[key].meta.deviceFingerprint,
        detail: stryMutAct_9fa48("713") ? "" : (stryCov_9fa48("713"), 'Passkey used to unlock vault.')
      }));
      writeBindingMap(map);
    }
  }
  static revokeBinding(profileId?: string | null, dbName?: string, reason: string = stryMutAct_9fa48("714") ? "" : (stryCov_9fa48("714"), 'manual_revoke')): boolean {
    if (stryMutAct_9fa48("715")) {
      {}
    } else {
      stryCov_9fa48("715");
      const key = profileKey(profileId, dbName);
      const map = readBindingMap();
      if (stryMutAct_9fa48("718") ? false : stryMutAct_9fa48("717") ? true : stryMutAct_9fa48("716") ? map[key] : (stryCov_9fa48("716", "717", "718"), !map[key])) return stryMutAct_9fa48("719") ? true : (stryCov_9fa48("719"), false);
      const record = map[key];
      const now = new Date().toISOString();
      const revocations = readRevocations();
      revocations.push(stryMutAct_9fa48("720") ? {} : (stryCov_9fa48("720"), {
        credentialId: record.credentialId,
        revokedAt: now,
        reason,
        profileId: record.meta.profileId,
        dbName: record.meta.dbName,
        deviceFingerprint: record.meta.deviceFingerprint
      }));
      writeRevocations(revocations);
      appendEvent(map, key, stryMutAct_9fa48("721") ? {} : (stryCov_9fa48("721"), {
        at: now,
        type: stryMutAct_9fa48("722") ? "" : (stryCov_9fa48("722"), 'revoked'),
        profileId: record.meta.profileId,
        dbName: record.meta.dbName,
        credentialId: record.credentialId,
        deviceFingerprint: record.meta.deviceFingerprint,
        detail: reason
      }));
      delete map[key];
      writeBindingMap(map);
      return stryMutAct_9fa48("723") ? false : (stryCov_9fa48("723"), true);
    }
  }
  static noteRecoveryExport(profileId?: string | null, dbName?: string): void {
    if (stryMutAct_9fa48("724")) {
      {}
    } else {
      stryCov_9fa48("724");
      const key = profileKey(profileId, dbName);
      const map = readBindingMap();
      if (stryMutAct_9fa48("727") ? false : stryMutAct_9fa48("726") ? true : stryMutAct_9fa48("725") ? map[key] : (stryCov_9fa48("725", "726", "727"), !map[key])) return;
      const now = new Date().toISOString();
      map[key].meta = stryMutAct_9fa48("728") ? {} : (stryCov_9fa48("728"), {
        ...map[key].meta,
        recoveryLastExportedAt: now
      });
      appendEvent(map, key, stryMutAct_9fa48("729") ? {} : (stryCov_9fa48("729"), {
        at: now,
        type: stryMutAct_9fa48("730") ? "" : (stryCov_9fa48("730"), 'recovery_exported'),
        profileId: map[key].meta.profileId,
        dbName: map[key].meta.dbName,
        credentialId: map[key].credentialId,
        deviceFingerprint: map[key].meta.deviceFingerprint,
        detail: stryMutAct_9fa48("731") ? "" : (stryCov_9fa48("731"), 'Encrypted recovery package exported.')
      }));
      writeBindingMap(map);
    }
  }
  static hasAnyBinding(): boolean {
    if (stryMutAct_9fa48("732")) {
      {}
    } else {
      stryCov_9fa48("732");
      const map = readBindingMap();
      return stryMutAct_9fa48("736") ? Object.keys(map).length <= 0 : stryMutAct_9fa48("735") ? Object.keys(map).length >= 0 : stryMutAct_9fa48("734") ? false : stryMutAct_9fa48("733") ? true : (stryCov_9fa48("733", "734", "735", "736"), Object.keys(map).length > 0);
    }
  }
  static clearAllBindings(): void {
    if (stryMutAct_9fa48("737")) {
      {}
    } else {
      stryCov_9fa48("737");
      secureStateCache = createDefaultState();
      clearLegacyStorageKeys();
      void clearStateInIndexedDb();
    }
  }
  static listBindings(): Array<PasskeyBindingRecord & {
    bindingKey: string;
  }> {
    if (stryMutAct_9fa48("738")) {
      {}
    } else {
      stryCov_9fa48("738");
      const map = readBindingMap();
      return stryMutAct_9fa48("739") ? Object.entries(map).map(([bindingKey, record]) => ({
        bindingKey,
        ...record
      })) : (stryCov_9fa48("739"), Object.entries(map).map(stryMutAct_9fa48("740") ? () => undefined : (stryCov_9fa48("740"), ([bindingKey, record]) => stryMutAct_9fa48("741") ? {} : (stryCov_9fa48("741"), {
        bindingKey,
        ...record
      }))).sort(stryMutAct_9fa48("742") ? () => undefined : (stryCov_9fa48("742"), (left, right) => stryMutAct_9fa48("743") ? Date.parse(right.meta.lastUsedAt || right.meta.createdAt) + Date.parse(left.meta.lastUsedAt || left.meta.createdAt) : (stryCov_9fa48("743"), Date.parse(stryMutAct_9fa48("746") ? right.meta.lastUsedAt && right.meta.createdAt : stryMutAct_9fa48("745") ? false : stryMutAct_9fa48("744") ? true : (stryCov_9fa48("744", "745", "746"), right.meta.lastUsedAt || right.meta.createdAt)) - Date.parse(stryMutAct_9fa48("749") ? left.meta.lastUsedAt && left.meta.createdAt : stryMutAct_9fa48("748") ? false : stryMutAct_9fa48("747") ? true : (stryCov_9fa48("747", "748", "749"), left.meta.lastUsedAt || left.meta.createdAt))))));
    }
  }
  static getEventLog(profileId?: string | null, dbName?: string): PasskeyEventRecord[] {
    if (stryMutAct_9fa48("750")) {
      {}
    } else {
      stryCov_9fa48("750");
      if (stryMutAct_9fa48("753") ? typeof profileId !== 'undefined' && typeof dbName !== 'undefined' : stryMutAct_9fa48("752") ? false : stryMutAct_9fa48("751") ? true : (stryCov_9fa48("751", "752", "753"), (stryMutAct_9fa48("755") ? typeof profileId === 'undefined' : stryMutAct_9fa48("754") ? false : (stryCov_9fa48("754", "755"), typeof profileId !== (stryMutAct_9fa48("756") ? "" : (stryCov_9fa48("756"), 'undefined')))) || (stryMutAct_9fa48("758") ? typeof dbName === 'undefined' : stryMutAct_9fa48("757") ? false : (stryCov_9fa48("757", "758"), typeof dbName !== (stryMutAct_9fa48("759") ? "" : (stryCov_9fa48("759"), 'undefined')))))) {
        if (stryMutAct_9fa48("760")) {
          {}
        } else {
          stryCov_9fa48("760");
          const binding = this.getBinding(profileId, dbName);
          return stryMutAct_9fa48("761") ? [...(binding?.eventLog || [])] : (stryCov_9fa48("761"), (stryMutAct_9fa48("762") ? [] : (stryCov_9fa48("762"), [...(stryMutAct_9fa48("765") ? binding?.eventLog && [] : stryMutAct_9fa48("764") ? false : stryMutAct_9fa48("763") ? true : (stryCov_9fa48("763", "764", "765"), (stryMutAct_9fa48("766") ? binding.eventLog : (stryCov_9fa48("766"), binding?.eventLog)) || (stryMutAct_9fa48("767") ? ["Stryker was here"] : (stryCov_9fa48("767"), []))))])).reverse());
        }
      }
      return stryMutAct_9fa48("768") ? [...readAuditLog()] : (stryCov_9fa48("768"), (stryMutAct_9fa48("769") ? [] : (stryCov_9fa48("769"), [...readAuditLog()])).reverse());
    }
  }
  static listRevocations(): PasskeyRevocationRecord[] {
    if (stryMutAct_9fa48("770")) {
      {}
    } else {
      stryCov_9fa48("770");
      return stryMutAct_9fa48("771") ? [...readRevocations()] : (stryCov_9fa48("771"), (stryMutAct_9fa48("772") ? [] : (stryCov_9fa48("772"), [...readRevocations()])).reverse());
    }
  }
  static isCredentialRevoked(credentialId: string): boolean {
    if (stryMutAct_9fa48("773")) {
      {}
    } else {
      stryCov_9fa48("773");
      return stryMutAct_9fa48("776") ? readPolicy().blockRevokedCredentials || readRevocations().some(item => item.credentialId === credentialId) : stryMutAct_9fa48("775") ? false : stryMutAct_9fa48("774") ? true : (stryCov_9fa48("774", "775", "776"), readPolicy().blockRevokedCredentials && (stryMutAct_9fa48("777") ? readRevocations().every(item => item.credentialId === credentialId) : (stryCov_9fa48("777"), readRevocations().some(stryMutAct_9fa48("778") ? () => undefined : (stryCov_9fa48("778"), item => stryMutAct_9fa48("781") ? item.credentialId !== credentialId : stryMutAct_9fa48("780") ? false : stryMutAct_9fa48("779") ? true : (stryCov_9fa48("779", "780", "781"), item.credentialId === credentialId))))));
    }
  }
  static getPolicyViolations(binding: PasskeyBindingRecord | null): string[] {
    if (stryMutAct_9fa48("782")) {
      {}
    } else {
      stryCov_9fa48("782");
      if (stryMutAct_9fa48("785") ? false : stryMutAct_9fa48("784") ? true : stryMutAct_9fa48("783") ? binding : (stryCov_9fa48("783", "784", "785"), !binding)) return stryMutAct_9fa48("786") ? ["Stryker was here"] : (stryCov_9fa48("786"), []);
      const policy = readPolicy();
      const violations: string[] = stryMutAct_9fa48("787") ? ["Stryker was here"] : (stryCov_9fa48("787"), []);
      if (stryMutAct_9fa48("790") ? policy.blockRevokedCredentials || this.isCredentialRevoked(binding.credentialId) : stryMutAct_9fa48("789") ? false : stryMutAct_9fa48("788") ? true : (stryCov_9fa48("788", "789", "790"), policy.blockRevokedCredentials && this.isCredentialRevoked(binding.credentialId))) {
        if (stryMutAct_9fa48("791")) {
          {}
        } else {
          stryCov_9fa48("791");
          violations.push(stryMutAct_9fa48("792") ? "" : (stryCov_9fa48("792"), 'PASSKEY_REVOKED'));
        }
      }
      const createdAtMs = Date.parse(stryMutAct_9fa48("795") ? binding.meta.createdAt && '' : stryMutAct_9fa48("794") ? false : stryMutAct_9fa48("793") ? true : (stryCov_9fa48("793", "794", "795"), binding.meta.createdAt || (stryMutAct_9fa48("796") ? "Stryker was here!" : (stryCov_9fa48("796"), ''))));
      if (stryMutAct_9fa48("798") ? false : stryMutAct_9fa48("797") ? true : (stryCov_9fa48("797", "798"), Number.isFinite(createdAtMs))) {
        if (stryMutAct_9fa48("799")) {
          {}
        } else {
          stryCov_9fa48("799");
          const ageDays = Math.floor(stryMutAct_9fa48("800") ? (Date.now() - createdAtMs) * (1000 * 60 * 60 * 24) : (stryCov_9fa48("800"), (stryMutAct_9fa48("801") ? Date.now() + createdAtMs : (stryCov_9fa48("801"), Date.now() - createdAtMs)) / (stryMutAct_9fa48("802") ? 1000 * 60 * 60 / 24 : (stryCov_9fa48("802"), (stryMutAct_9fa48("803") ? 1000 * 60 / 60 : (stryCov_9fa48("803"), (stryMutAct_9fa48("804") ? 1000 / 60 : (stryCov_9fa48("804"), 1000 * 60)) * 60)) * 24))));
          if (stryMutAct_9fa48("808") ? ageDays < policy.maxBindingAgeDays : stryMutAct_9fa48("807") ? ageDays > policy.maxBindingAgeDays : stryMutAct_9fa48("806") ? false : stryMutAct_9fa48("805") ? true : (stryCov_9fa48("805", "806", "807", "808"), ageDays >= policy.maxBindingAgeDays)) {
            if (stryMutAct_9fa48("809")) {
              {}
            } else {
              stryCov_9fa48("809");
              violations.push(stryMutAct_9fa48("810") ? "" : (stryCov_9fa48("810"), 'PASSKEY_ROTATION_REQUIRED'));
            }
          }
        }
      }
      if (stryMutAct_9fa48("813") ? policy.requireRecoveryExportBeforeRotation && binding.meta.rotatedFromCredentialId || !binding.meta.recoveryLastExportedAt : stryMutAct_9fa48("812") ? false : stryMutAct_9fa48("811") ? true : (stryCov_9fa48("811", "812", "813"), (stryMutAct_9fa48("815") ? policy.requireRecoveryExportBeforeRotation || binding.meta.rotatedFromCredentialId : stryMutAct_9fa48("814") ? true : (stryCov_9fa48("814", "815"), policy.requireRecoveryExportBeforeRotation && binding.meta.rotatedFromCredentialId)) && (stryMutAct_9fa48("816") ? binding.meta.recoveryLastExportedAt : (stryCov_9fa48("816"), !binding.meta.recoveryLastExportedAt)))) {
        if (stryMutAct_9fa48("817")) {
          {}
        } else {
          stryCov_9fa48("817");
          violations.push(stryMutAct_9fa48("818") ? "" : (stryCov_9fa48("818"), 'PASSKEY_RECOVERY_EXPORT_REQUIRED'));
        }
      }
      return violations;
    }
  }
  static async exportRecoveryPackage(profileId: string | null, dbName: string, password: string): Promise<string> {
    if (stryMutAct_9fa48("819")) {
      {}
    } else {
      stryCov_9fa48("819");
      const binding = this.getBinding(profileId, dbName);
      if (stryMutAct_9fa48("822") ? false : stryMutAct_9fa48("821") ? true : stryMutAct_9fa48("820") ? binding : (stryCov_9fa48("820", "821", "822"), !binding)) throw new Error(stryMutAct_9fa48("823") ? "" : (stryCov_9fa48("823"), 'NO_PASSKEY_BINDING'));
      const pkg: RecoveryPackage = stryMutAct_9fa48("824") ? {} : (stryCov_9fa48("824"), {
        kind: stryMutAct_9fa48("825") ? "" : (stryCov_9fa48("825"), 'aegis-passkey-recovery-v2'),
        binding,
        revocations: readRevocations(),
        policy: readPolicy()
      });
      const encrypted = await BackupService.encryptBackup(stryMutAct_9fa48("826") ? [] : (stryCov_9fa48("826"), [pkg]), password);
      this.noteRecoveryExport(profileId, dbName);
      return encrypted;
    }
  }
  static async importRecoveryPackage(encryptedPackage: string, password: string, expectedProfileId: string | null, expectedDbName: string): Promise<void> {
    if (stryMutAct_9fa48("827")) {
      {}
    } else {
      stryCov_9fa48("827");
      const payload = await BackupService.decryptBackup(encryptedPackage, password);
      if (stryMutAct_9fa48("830") ? !Array.isArray(payload) && payload.length === 0 : stryMutAct_9fa48("829") ? false : stryMutAct_9fa48("828") ? true : (stryCov_9fa48("828", "829", "830"), (stryMutAct_9fa48("831") ? Array.isArray(payload) : (stryCov_9fa48("831"), !Array.isArray(payload))) || (stryMutAct_9fa48("833") ? payload.length !== 0 : stryMutAct_9fa48("832") ? false : (stryCov_9fa48("832", "833"), payload.length === 0)))) throw new Error(stryMutAct_9fa48("834") ? "" : (stryCov_9fa48("834"), 'INVALID_RECOVERY_PACKAGE'));
      const pkg = payload[0] as RecoveryPackage;
      if (stryMutAct_9fa48("837") ? (!pkg || pkg.kind !== 'aegis-passkey-recovery-v2') && !pkg.binding : stryMutAct_9fa48("836") ? false : stryMutAct_9fa48("835") ? true : (stryCov_9fa48("835", "836", "837"), (stryMutAct_9fa48("839") ? !pkg && pkg.kind !== 'aegis-passkey-recovery-v2' : stryMutAct_9fa48("838") ? false : (stryCov_9fa48("838", "839"), (stryMutAct_9fa48("840") ? pkg : (stryCov_9fa48("840"), !pkg)) || (stryMutAct_9fa48("842") ? pkg.kind === 'aegis-passkey-recovery-v2' : stryMutAct_9fa48("841") ? false : (stryCov_9fa48("841", "842"), pkg.kind !== (stryMutAct_9fa48("843") ? "" : (stryCov_9fa48("843"), 'aegis-passkey-recovery-v2')))))) || (stryMutAct_9fa48("844") ? pkg.binding : (stryCov_9fa48("844"), !pkg.binding)))) {
        if (stryMutAct_9fa48("845")) {
          {}
        } else {
          stryCov_9fa48("845");
          throw new Error(stryMutAct_9fa48("846") ? "" : (stryCov_9fa48("846"), 'INVALID_RECOVERY_PACKAGE'));
        }
      }
      const meta = stryMutAct_9fa48("849") ? pkg.binding.meta && {} as PasskeyBindingMeta : stryMutAct_9fa48("848") ? false : stryMutAct_9fa48("847") ? true : (stryCov_9fa48("847", "848", "849"), pkg.binding.meta || {} as PasskeyBindingMeta);
      if (stryMutAct_9fa48("852") ? meta.profileId || meta.profileId !== expectedProfileId : stryMutAct_9fa48("851") ? false : stryMutAct_9fa48("850") ? true : (stryCov_9fa48("850", "851", "852"), meta.profileId && (stryMutAct_9fa48("854") ? meta.profileId === expectedProfileId : stryMutAct_9fa48("853") ? true : (stryCov_9fa48("853", "854"), meta.profileId !== expectedProfileId)))) {
        if (stryMutAct_9fa48("855")) {
          {}
        } else {
          stryCov_9fa48("855");
          throw new Error(stryMutAct_9fa48("856") ? "" : (stryCov_9fa48("856"), 'RECOVERY_PROFILE_MISMATCH'));
        }
      }
      if (stryMutAct_9fa48("859") ? meta.dbName || meta.dbName !== expectedDbName : stryMutAct_9fa48("858") ? false : stryMutAct_9fa48("857") ? true : (stryCov_9fa48("857", "858", "859"), meta.dbName && (stryMutAct_9fa48("861") ? meta.dbName === expectedDbName : stryMutAct_9fa48("860") ? true : (stryCov_9fa48("860", "861"), meta.dbName !== expectedDbName)))) {
        if (stryMutAct_9fa48("862")) {
          {}
        } else {
          stryCov_9fa48("862");
          throw new Error(stryMutAct_9fa48("863") ? "" : (stryCov_9fa48("863"), 'RECOVERY_DB_MISMATCH'));
        }
      }
      this.saveBinding(expectedProfileId, expectedDbName, stryMutAct_9fa48("864") ? {} : (stryCov_9fa48("864"), {
        ...pkg.binding,
        meta: stryMutAct_9fa48("865") ? {} : (stryCov_9fa48("865"), {
          ...pkg.binding.meta,
          profileId: expectedProfileId,
          dbName: expectedDbName,
          lastUsedAt: new Date().toISOString(),
          ...getDeviceInfo()
        })
      }));
      const key = profileKey(expectedProfileId, expectedDbName);
      const map = readBindingMap();
      if (stryMutAct_9fa48("867") ? false : stryMutAct_9fa48("866") ? true : (stryCov_9fa48("866", "867"), Array.isArray(pkg.revocations))) {
        if (stryMutAct_9fa48("868")) {
          {}
        } else {
          stryCov_9fa48("868");
          const merged = (stryMutAct_9fa48("869") ? [] : (stryCov_9fa48("869"), [...readRevocations(), ...pkg.revocations])).reduce<PasskeyRevocationRecord[]>((acc, item) => {
            if (stryMutAct_9fa48("870")) {
              {}
            } else {
              stryCov_9fa48("870");
              if (stryMutAct_9fa48("873") ? false : stryMutAct_9fa48("872") ? true : stryMutAct_9fa48("871") ? acc.some(existing => existing.credentialId === item.credentialId && existing.revokedAt === item.revokedAt) : (stryCov_9fa48("871", "872", "873"), !(stryMutAct_9fa48("874") ? acc.every(existing => existing.credentialId === item.credentialId && existing.revokedAt === item.revokedAt) : (stryCov_9fa48("874"), acc.some(stryMutAct_9fa48("875") ? () => undefined : (stryCov_9fa48("875"), existing => stryMutAct_9fa48("878") ? existing.credentialId === item.credentialId || existing.revokedAt === item.revokedAt : stryMutAct_9fa48("877") ? false : stryMutAct_9fa48("876") ? true : (stryCov_9fa48("876", "877", "878"), (stryMutAct_9fa48("880") ? existing.credentialId !== item.credentialId : stryMutAct_9fa48("879") ? true : (stryCov_9fa48("879", "880"), existing.credentialId === item.credentialId)) && (stryMutAct_9fa48("882") ? existing.revokedAt !== item.revokedAt : stryMutAct_9fa48("881") ? true : (stryCov_9fa48("881", "882"), existing.revokedAt === item.revokedAt))))))))) {
                if (stryMutAct_9fa48("883")) {
                  {}
                } else {
                  stryCov_9fa48("883");
                  acc.push(item);
                }
              }
              return acc;
            }
          }, stryMutAct_9fa48("884") ? ["Stryker was here"] : (stryCov_9fa48("884"), []));
          writeRevocations(merged);
        }
      }
      if (stryMutAct_9fa48("886") ? false : stryMutAct_9fa48("885") ? true : (stryCov_9fa48("885", "886"), pkg.policy)) {
        if (stryMutAct_9fa48("887")) {
          {}
        } else {
          stryCov_9fa48("887");
          writePolicy(stryMutAct_9fa48("888") ? {} : (stryCov_9fa48("888"), {
            ...readPolicy(),
            ...pkg.policy
          }));
        }
      }
      if (stryMutAct_9fa48("890") ? false : stryMutAct_9fa48("889") ? true : (stryCov_9fa48("889", "890"), map[key])) {
        if (stryMutAct_9fa48("891")) {
          {}
        } else {
          stryCov_9fa48("891");
          appendEvent(map, key, stryMutAct_9fa48("892") ? {} : (stryCov_9fa48("892"), {
            at: new Date().toISOString(),
            type: stryMutAct_9fa48("893") ? "" : (stryCov_9fa48("893"), 'recovery_imported'),
            profileId: expectedProfileId,
            dbName: expectedDbName,
            credentialId: map[key].credentialId,
            deviceFingerprint: map[key].meta.deviceFingerprint,
            detail: stryMutAct_9fa48("894") ? "" : (stryCov_9fa48("894"), 'Recovery package imported for active vault profile.')
          }));
          writeBindingMap(map);
        }
      }
    }
  }

  /**
   * Yeni bir WebAuthn site passkey credential kaydini, mevcut bir VaultEntry'nin
   * site passkey veri modeline (metadata) baglar.
   */
  static bindSiteCredentialToEntry(entry: VaultEntry, credentialId: string, rpId: string): VaultEntry {
    if (stryMutAct_9fa48("895")) {
      {}
    } else {
      stryCov_9fa48("895");
      const now = new Date().toISOString();
      return stryMutAct_9fa48("896") ? {} : (stryCov_9fa48("896"), {
        ...entry,
        passkeyMetadata: stryMutAct_9fa48("897") ? {} : (stryCov_9fa48("897"), {
          ...(stryMutAct_9fa48("900") ? entry.passkeyMetadata && {} : stryMutAct_9fa48("899") ? false : stryMutAct_9fa48("898") ? true : (stryCov_9fa48("898", "899", "900"), entry.passkeyMetadata || {})),
          credential_id: credentialId,
          rp_id: rpId,
          mode: stryMutAct_9fa48("901") ? "" : (stryCov_9fa48("901"), 'site_passkey_active'),
          created_at: stryMutAct_9fa48("904") ? entry.passkeyMetadata?.created_at && now : stryMutAct_9fa48("903") ? false : stryMutAct_9fa48("902") ? true : (stryCov_9fa48("902", "903", "904"), (stryMutAct_9fa48("905") ? entry.passkeyMetadata.created_at : (stryCov_9fa48("905"), entry.passkeyMetadata?.created_at)) || now),
          last_registration_at: now
        })
      });
    }
  }

  /**
   * Merges an external list of revocations into the local store.
   * Used by QR Sync and future encrypted sync to propagate revocation intent.
   */
  static mergeExternalRevocations(external: PasskeyRevocationRecord[]): number {
    if (stryMutAct_9fa48("906")) {
      {}
    } else {
      stryCov_9fa48("906");
      const local = readRevocations();
      const map = new Map<string, PasskeyRevocationRecord>();
      let changedCount = 0;
      local.forEach(stryMutAct_9fa48("907") ? () => undefined : (stryCov_9fa48("907"), rev => map.set(rev.credentialId, rev)));
      external.forEach(rev => {
        if (stryMutAct_9fa48("908")) {
          {}
        } else {
          stryCov_9fa48("908");
          const existing = map.get(rev.credentialId);
          if (stryMutAct_9fa48("911") ? !existing && Date.parse(rev.revokedAt) > Date.parse(existing.revokedAt) : stryMutAct_9fa48("910") ? false : stryMutAct_9fa48("909") ? true : (stryCov_9fa48("909", "910", "911"), (stryMutAct_9fa48("912") ? existing : (stryCov_9fa48("912"), !existing)) || (stryMutAct_9fa48("915") ? Date.parse(rev.revokedAt) <= Date.parse(existing.revokedAt) : stryMutAct_9fa48("914") ? Date.parse(rev.revokedAt) >= Date.parse(existing.revokedAt) : stryMutAct_9fa48("913") ? false : (stryCov_9fa48("913", "914", "915"), Date.parse(rev.revokedAt) > Date.parse(existing.revokedAt))))) {
            if (stryMutAct_9fa48("916")) {
              {}
            } else {
              stryCov_9fa48("916");
              map.set(rev.credentialId, rev);
              stryMutAct_9fa48("917") ? changedCount-- : (stryCov_9fa48("917"), changedCount++);
            }
          }
        }
      });
      if (stryMutAct_9fa48("921") ? changedCount <= 0 : stryMutAct_9fa48("920") ? changedCount >= 0 : stryMutAct_9fa48("919") ? false : stryMutAct_9fa48("918") ? true : (stryCov_9fa48("918", "919", "920", "921"), changedCount > 0)) {
        if (stryMutAct_9fa48("922")) {
          {}
        } else {
          stryCov_9fa48("922");
          writeRevocations(Array.from(map.values()));
        }
      }
      return changedCount;
    }
  }
}
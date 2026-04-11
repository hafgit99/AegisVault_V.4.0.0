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
        encryptedPayload: stryMutAct_9fa48("463") ? (v as any).encryptedPayload && '' : stryMutAct_9fa48("462") ? false : stryMutAct_9fa48("461") ? true : (stryCov_9fa48("461", "462", "463"), (v as any).encryptedPayload || (stryMutAct_9fa48("464") ? "Stryker was here!" : (stryCov_9fa48("464"), ''))),
        prfSalt: stryMutAct_9fa48("467") ? (v as any).prfSalt && '' : stryMutAct_9fa48("466") ? false : stryMutAct_9fa48("465") ? true : (stryCov_9fa48("465", "466", "467"), (v as any).prfSalt || (stryMutAct_9fa48("468") ? "Stryker was here!" : (stryCov_9fa48("468"), ''))),
        eventLog: Array.isArray((v as any).eventLog) ? (v as any).eventLog : stryMutAct_9fa48("469") ? ["Stryker was here"] : (stryCov_9fa48("469"), []),
        meta: stryMutAct_9fa48("470") ? {} : (stryCov_9fa48("470"), {
          ...(v as any).meta,
          version: stryMutAct_9fa48("473") ? (v as unknown as Record<string, any>)?.meta?.version && 1 : stryMutAct_9fa48("472") ? false : stryMutAct_9fa48("471") ? true : (stryCov_9fa48("471", "472", "473"), (stryMutAct_9fa48("475") ? (v as unknown as Record<string, any>).meta?.version : stryMutAct_9fa48("474") ? (v as unknown as Record<string, any>)?.meta.version : (stryCov_9fa48("474", "475"), (v as unknown as Record<string, any>)?.meta?.version)) || 1)
        })
      })])))) : {},
      auditLog: Array.isArray(candidate.auditLog) ? candidate.auditLog : stryMutAct_9fa48("476") ? ["Stryker was here"] : (stryCov_9fa48("476"), []),
      revocations: Array.isArray(candidate.revocations) ? candidate.revocations : stryMutAct_9fa48("477") ? ["Stryker was here"] : (stryCov_9fa48("477"), []),
      policy: stryMutAct_9fa48("478") ? {} : (stryCov_9fa48("478"), {
        maxBindingAgeDays: (stryMutAct_9fa48("481") ? typeof candidate.policy?.maxBindingAgeDays !== 'number' : stryMutAct_9fa48("480") ? false : stryMutAct_9fa48("479") ? true : (stryCov_9fa48("479", "480", "481"), typeof (stryMutAct_9fa48("482") ? candidate.policy.maxBindingAgeDays : (stryCov_9fa48("482"), candidate.policy?.maxBindingAgeDays)) === (stryMutAct_9fa48("483") ? "" : (stryCov_9fa48("483"), 'number')))) ? candidate.policy.maxBindingAgeDays : DEFAULT_POLICY.maxBindingAgeDays,
        requireRecoveryExportBeforeRotation: (stryMutAct_9fa48("486") ? typeof candidate.policy?.requireRecoveryExportBeforeRotation !== 'boolean' : stryMutAct_9fa48("485") ? false : stryMutAct_9fa48("484") ? true : (stryCov_9fa48("484", "485", "486"), typeof (stryMutAct_9fa48("487") ? candidate.policy.requireRecoveryExportBeforeRotation : (stryCov_9fa48("487"), candidate.policy?.requireRecoveryExportBeforeRotation)) === (stryMutAct_9fa48("488") ? "" : (stryCov_9fa48("488"), 'boolean')))) ? candidate.policy.requireRecoveryExportBeforeRotation : DEFAULT_POLICY.requireRecoveryExportBeforeRotation,
        blockRevokedCredentials: (stryMutAct_9fa48("491") ? typeof candidate.policy?.blockRevokedCredentials !== 'boolean' : stryMutAct_9fa48("490") ? false : stryMutAct_9fa48("489") ? true : (stryCov_9fa48("489", "490", "491"), typeof (stryMutAct_9fa48("492") ? candidate.policy.blockRevokedCredentials : (stryCov_9fa48("492"), candidate.policy?.blockRevokedCredentials)) === (stryMutAct_9fa48("493") ? "" : (stryCov_9fa48("493"), 'boolean')))) ? candidate.policy.blockRevokedCredentials : DEFAULT_POLICY.blockRevokedCredentials
      })
    });
  }
};
const clearLegacyStorageKeys = () => {
  if (stryMutAct_9fa48("494")) {
    {}
  } else {
    stryCov_9fa48("494");
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
  if (stryMutAct_9fa48("495")) {
    {}
  } else {
    stryCov_9fa48("495");
    const bindings = safeParse<Record<string, PasskeyBindingRecord>>(localStorage.getItem(BINDINGS_KEY));
    const auditLog = safeParse<PasskeyEventRecord[]>(localStorage.getItem(PASSKEY_AUDIT_KEY));
    const revocations = safeParse<PasskeyRevocationRecord[]>(localStorage.getItem(PASSKEY_REVOCATIONS_KEY));
    const policyRaw = safeParse<PasskeyPolicy>(localStorage.getItem(PASSKEY_POLICY_KEY));
    return normalizePersistedState(stryMutAct_9fa48("496") ? {} : (stryCov_9fa48("496"), {
      bindings: (stryMutAct_9fa48("499") ? bindings || typeof bindings === 'object' : stryMutAct_9fa48("498") ? false : stryMutAct_9fa48("497") ? true : (stryCov_9fa48("497", "498", "499"), bindings && (stryMutAct_9fa48("501") ? typeof bindings !== 'object' : stryMutAct_9fa48("500") ? true : (stryCov_9fa48("500", "501"), typeof bindings === (stryMutAct_9fa48("502") ? "" : (stryCov_9fa48("502"), 'object')))))) ? bindings : {},
      auditLog: Array.isArray(auditLog) ? auditLog : stryMutAct_9fa48("503") ? ["Stryker was here"] : (stryCov_9fa48("503"), []),
      revocations: Array.isArray(revocations) ? revocations : stryMutAct_9fa48("504") ? ["Stryker was here"] : (stryCov_9fa48("504"), []),
      policy: stryMutAct_9fa48("507") ? policyRaw && DEFAULT_POLICY : stryMutAct_9fa48("506") ? false : stryMutAct_9fa48("505") ? true : (stryCov_9fa48("505", "506", "507"), policyRaw || DEFAULT_POLICY)
    }));
  }
};
const schedulePersist = () => {
  if (stryMutAct_9fa48("508")) {
    {}
  } else {
    stryCov_9fa48("508");
    secureStatePersistPromise = secureStatePersistPromise.catch(() => undefined).then(async () => {
      if (stryMutAct_9fa48("509")) {
        {}
      } else {
        stryCov_9fa48("509");
        if (stryMutAct_9fa48("512") ? false : stryMutAct_9fa48("511") ? true : stryMutAct_9fa48("510") ? hasIndexedDb() : (stryCov_9fa48("510", "511", "512"), !hasIndexedDb())) return;
        await writeStateToIndexedDb(secureStateCache);
      }
    });
    return secureStatePersistPromise;
  }
};
const ensureBootstrappedState = () => {
  if (stryMutAct_9fa48("513")) {
    {}
  } else {
    stryCov_9fa48("513");
    if (stryMutAct_9fa48("515") ? false : stryMutAct_9fa48("514") ? true : (stryCov_9fa48("514", "515"), secureStateInitialized)) return;
    secureStateCache = loadLegacyState();
  }
};
const readBindingMap = (): Record<string, PasskeyBindingRecord> => {
  if (stryMutAct_9fa48("516")) {
    {}
  } else {
    stryCov_9fa48("516");
    ensureBootstrappedState();
    return secureStateCache.bindings;
  }
};
const writeBindingMap = (map: Record<string, PasskeyBindingRecord>) => {
  if (stryMutAct_9fa48("517")) {
    {}
  } else {
    stryCov_9fa48("517");
    secureStateCache.bindings = map;
    void schedulePersist();
  }
};
const readAuditLog = (): PasskeyEventRecord[] => {
  if (stryMutAct_9fa48("518")) {
    {}
  } else {
    stryCov_9fa48("518");
    ensureBootstrappedState();
    return secureStateCache.auditLog;
  }
};
const writeAuditLog = (events: PasskeyEventRecord[]) => {
  if (stryMutAct_9fa48("519")) {
    {}
  } else {
    stryCov_9fa48("519");
    secureStateCache.auditLog = stryMutAct_9fa48("520") ? events : (stryCov_9fa48("520"), events.slice(stryMutAct_9fa48("521") ? -PASSKEY_EVENT_LIMIT / 4 : (stryCov_9fa48("521"), (stryMutAct_9fa48("522") ? +PASSKEY_EVENT_LIMIT : (stryCov_9fa48("522"), -PASSKEY_EVENT_LIMIT)) * 4)));
    void schedulePersist();
  }
};
const readRevocations = (): PasskeyRevocationRecord[] => {
  if (stryMutAct_9fa48("523")) {
    {}
  } else {
    stryCov_9fa48("523");
    ensureBootstrappedState();
    return secureStateCache.revocations;
  }
};
const writeRevocations = (items: PasskeyRevocationRecord[]) => {
  if (stryMutAct_9fa48("524")) {
    {}
  } else {
    stryCov_9fa48("524");
    secureStateCache.revocations = stryMutAct_9fa48("525") ? items : (stryCov_9fa48("525"), items.slice(stryMutAct_9fa48("526") ? -PASSKEY_EVENT_LIMIT / 4 : (stryCov_9fa48("526"), (stryMutAct_9fa48("527") ? +PASSKEY_EVENT_LIMIT : (stryCov_9fa48("527"), -PASSKEY_EVENT_LIMIT)) * 4)));
    void schedulePersist();
  }
};
const readPolicy = (): PasskeyPolicy => {
  if (stryMutAct_9fa48("528")) {
    {}
  } else {
    stryCov_9fa48("528");
    ensureBootstrappedState();
    const parsed = secureStateCache.policy;
    return stryMutAct_9fa48("529") ? {} : (stryCov_9fa48("529"), {
      maxBindingAgeDays: (stryMutAct_9fa48("532") ? typeof parsed?.maxBindingAgeDays !== 'number' : stryMutAct_9fa48("531") ? false : stryMutAct_9fa48("530") ? true : (stryCov_9fa48("530", "531", "532"), typeof (stryMutAct_9fa48("533") ? parsed.maxBindingAgeDays : (stryCov_9fa48("533"), parsed?.maxBindingAgeDays)) === (stryMutAct_9fa48("534") ? "" : (stryCov_9fa48("534"), 'number')))) ? parsed.maxBindingAgeDays : DEFAULT_POLICY.maxBindingAgeDays,
      requireRecoveryExportBeforeRotation: (stryMutAct_9fa48("537") ? typeof parsed?.requireRecoveryExportBeforeRotation !== 'boolean' : stryMutAct_9fa48("536") ? false : stryMutAct_9fa48("535") ? true : (stryCov_9fa48("535", "536", "537"), typeof (stryMutAct_9fa48("538") ? parsed.requireRecoveryExportBeforeRotation : (stryCov_9fa48("538"), parsed?.requireRecoveryExportBeforeRotation)) === (stryMutAct_9fa48("539") ? "" : (stryCov_9fa48("539"), 'boolean')))) ? parsed.requireRecoveryExportBeforeRotation : DEFAULT_POLICY.requireRecoveryExportBeforeRotation,
      blockRevokedCredentials: (stryMutAct_9fa48("542") ? typeof parsed?.blockRevokedCredentials !== 'boolean' : stryMutAct_9fa48("541") ? false : stryMutAct_9fa48("540") ? true : (stryCov_9fa48("540", "541", "542"), typeof (stryMutAct_9fa48("543") ? parsed.blockRevokedCredentials : (stryCov_9fa48("543"), parsed?.blockRevokedCredentials)) === (stryMutAct_9fa48("544") ? "" : (stryCov_9fa48("544"), 'boolean')))) ? parsed.blockRevokedCredentials : DEFAULT_POLICY.blockRevokedCredentials
    });
  }
};
const writePolicy = (policy: PasskeyPolicy) => {
  if (stryMutAct_9fa48("545")) {
    {}
  } else {
    stryCov_9fa48("545");
    secureStateCache.policy = policy;
    void schedulePersist();
  }
};
const getDeviceInfo = () => {
  if (stryMutAct_9fa48("546")) {
    {}
  } else {
    stryCov_9fa48("546");
    const platform = (stryMutAct_9fa48("549") ? typeof navigator === 'undefined' : stryMutAct_9fa48("548") ? false : stryMutAct_9fa48("547") ? true : (stryCov_9fa48("547", "548", "549"), typeof navigator !== (stryMutAct_9fa48("550") ? "" : (stryCov_9fa48("550"), 'undefined')))) ? stryMutAct_9fa48("553") ? navigator.platform && 'unknown' : stryMutAct_9fa48("552") ? false : stryMutAct_9fa48("551") ? true : (stryCov_9fa48("551", "552", "553"), navigator.platform || (stryMutAct_9fa48("554") ? "" : (stryCov_9fa48("554"), 'unknown'))) : stryMutAct_9fa48("555") ? "" : (stryCov_9fa48("555"), 'unknown');
    const locale = (stryMutAct_9fa48("558") ? typeof navigator === 'undefined' : stryMutAct_9fa48("557") ? false : stryMutAct_9fa48("556") ? true : (stryCov_9fa48("556", "557", "558"), typeof navigator !== (stryMutAct_9fa48("559") ? "" : (stryCov_9fa48("559"), 'undefined')))) ? stryMutAct_9fa48("562") ? navigator.language && 'en' : stryMutAct_9fa48("561") ? false : stryMutAct_9fa48("560") ? true : (stryCov_9fa48("560", "561", "562"), navigator.language || (stryMutAct_9fa48("563") ? "" : (stryCov_9fa48("563"), 'en'))) : stryMutAct_9fa48("564") ? "" : (stryCov_9fa48("564"), 'en');
    const userAgent = (stryMutAct_9fa48("567") ? typeof navigator === 'undefined' : stryMutAct_9fa48("566") ? false : stryMutAct_9fa48("565") ? true : (stryCov_9fa48("565", "566", "567"), typeof navigator !== (stryMutAct_9fa48("568") ? "" : (stryCov_9fa48("568"), 'undefined')))) ? stryMutAct_9fa48("571") ? navigator.userAgent && '' : stryMutAct_9fa48("570") ? false : stryMutAct_9fa48("569") ? true : (stryCov_9fa48("569", "570", "571"), navigator.userAgent || (stryMutAct_9fa48("572") ? "Stryker was here!" : (stryCov_9fa48("572"), ''))) : stryMutAct_9fa48("573") ? "Stryker was here!" : (stryCov_9fa48("573"), '');
    const deviceLabel = stryMutAct_9fa48("574") ? `` : (stryCov_9fa48("574"), `This device / ${platform}`);
    const fingerprintSource = JSON.stringify(stryMutAct_9fa48("575") ? {} : (stryCov_9fa48("575"), {
      platform,
      locale,
      userAgent
    }));
    let hash = 0;
    for (let i = 0; stryMutAct_9fa48("578") ? i >= fingerprintSource.length : stryMutAct_9fa48("577") ? i <= fingerprintSource.length : stryMutAct_9fa48("576") ? false : (stryCov_9fa48("576", "577", "578"), i < fingerprintSource.length); stryMutAct_9fa48("579") ? i -= 1 : (stryCov_9fa48("579"), i += 1)) {
      if (stryMutAct_9fa48("580")) {
        {}
      } else {
        stryCov_9fa48("580");
        hash = stryMutAct_9fa48("581") ? (hash << 5) - hash - fingerprintSource.charCodeAt(i) : (stryCov_9fa48("581"), (stryMutAct_9fa48("582") ? (hash << 5) + hash : (stryCov_9fa48("582"), (hash << 5) - hash)) + fingerprintSource.charCodeAt(i));
        stryMutAct_9fa48("583") ? hash &= 0 : (stryCov_9fa48("583"), hash |= 0);
      }
    }
    const normalized = Math.abs(hash).toString(16).padStart(8, stryMutAct_9fa48("584") ? "" : (stryCov_9fa48("584"), '0'));
    return stryMutAct_9fa48("585") ? {} : (stryCov_9fa48("585"), {
      deviceLabel,
      deviceFingerprint: normalized
    });
  }
};
const appendEvent = (map: Record<string, PasskeyBindingRecord>, key: string, event: PasskeyEventRecord) => {
  if (stryMutAct_9fa48("586")) {
    {}
  } else {
    stryCov_9fa48("586");
    if (stryMutAct_9fa48("588") ? false : stryMutAct_9fa48("587") ? true : (stryCov_9fa48("587", "588"), map[key])) {
      if (stryMutAct_9fa48("589")) {
        {}
      } else {
        stryCov_9fa48("589");
        map[key].eventLog = stryMutAct_9fa48("590") ? [...(map[key].eventLog || []), event] : (stryCov_9fa48("590"), (stryMutAct_9fa48("591") ? [] : (stryCov_9fa48("591"), [...(stryMutAct_9fa48("594") ? map[key].eventLog && [] : stryMutAct_9fa48("593") ? false : stryMutAct_9fa48("592") ? true : (stryCov_9fa48("592", "593", "594"), map[key].eventLog || (stryMutAct_9fa48("595") ? ["Stryker was here"] : (stryCov_9fa48("595"), [])))), event])).slice(stryMutAct_9fa48("596") ? +PASSKEY_EVENT_LIMIT : (stryCov_9fa48("596"), -PASSKEY_EVENT_LIMIT)));
      }
    }
    writeAuditLog(stryMutAct_9fa48("597") ? [] : (stryCov_9fa48("597"), [...readAuditLog(), event]));
  }
};
const migrateLegacyIfExists = (profileId?: string | null, dbName?: string): PasskeyBindingRecord | null => {
  if (stryMutAct_9fa48("598")) {
    {}
  } else {
    stryCov_9fa48("598");
    const credentialId = stryMutAct_9fa48("601") ? localStorage.getItem(LEGACY_ID_KEY) && '' : stryMutAct_9fa48("600") ? false : stryMutAct_9fa48("599") ? true : (stryCov_9fa48("599", "600", "601"), localStorage.getItem(LEGACY_ID_KEY) || (stryMutAct_9fa48("602") ? "Stryker was here!" : (stryCov_9fa48("602"), '')));
    const encryptedPayload = stryMutAct_9fa48("605") ? localStorage.getItem(LEGACY_DATA_KEY) && '' : stryMutAct_9fa48("604") ? false : stryMutAct_9fa48("603") ? true : (stryCov_9fa48("603", "604", "605"), localStorage.getItem(LEGACY_DATA_KEY) || (stryMutAct_9fa48("606") ? "Stryker was here!" : (stryCov_9fa48("606"), '')));
    const prfSalt = stryMutAct_9fa48("609") ? localStorage.getItem(LEGACY_SALT_KEY) && '' : stryMutAct_9fa48("608") ? false : stryMutAct_9fa48("607") ? true : (stryCov_9fa48("607", "608", "609"), localStorage.getItem(LEGACY_SALT_KEY) || (stryMutAct_9fa48("610") ? "Stryker was here!" : (stryCov_9fa48("610"), '')));
    if (stryMutAct_9fa48("613") ? (!credentialId || !encryptedPayload) && !prfSalt : stryMutAct_9fa48("612") ? false : stryMutAct_9fa48("611") ? true : (stryCov_9fa48("611", "612", "613"), (stryMutAct_9fa48("615") ? !credentialId && !encryptedPayload : stryMutAct_9fa48("614") ? false : (stryCov_9fa48("614", "615"), (stryMutAct_9fa48("616") ? credentialId : (stryCov_9fa48("616"), !credentialId)) || (stryMutAct_9fa48("617") ? encryptedPayload : (stryCov_9fa48("617"), !encryptedPayload)))) || (stryMutAct_9fa48("618") ? prfSalt : (stryCov_9fa48("618"), !prfSalt)))) return null;
    const legacyMeta = safeParse<PasskeyBindingMeta>(localStorage.getItem(LEGACY_META_KEY));
    const now = new Date().toISOString();
    const record: PasskeyBindingRecord = stryMutAct_9fa48("619") ? {} : (stryCov_9fa48("619"), {
      credentialId,
      encryptedPayload,
      prfSalt,
      meta: stryMutAct_9fa48("620") ? {} : (stryCov_9fa48("620"), {
        createdAt: stryMutAct_9fa48("623") ? legacyMeta?.createdAt && now : stryMutAct_9fa48("622") ? false : stryMutAct_9fa48("621") ? true : (stryCov_9fa48("621", "622", "623"), (stryMutAct_9fa48("624") ? legacyMeta.createdAt : (stryCov_9fa48("624"), legacyMeta?.createdAt)) || now),
        lastUsedAt: stryMutAct_9fa48("627") ? legacyMeta?.lastUsedAt && now : stryMutAct_9fa48("626") ? false : stryMutAct_9fa48("625") ? true : (stryCov_9fa48("625", "626", "627"), (stryMutAct_9fa48("628") ? legacyMeta.lastUsedAt : (stryCov_9fa48("628"), legacyMeta?.lastUsedAt)) || now),
        version: 1,
        profileId: stryMutAct_9fa48("631") ? (profileId || legacyMeta?.profileId) && null : stryMutAct_9fa48("630") ? false : stryMutAct_9fa48("629") ? true : (stryCov_9fa48("629", "630", "631"), (stryMutAct_9fa48("633") ? profileId && legacyMeta?.profileId : stryMutAct_9fa48("632") ? false : (stryCov_9fa48("632", "633"), profileId || (stryMutAct_9fa48("634") ? legacyMeta.profileId : (stryCov_9fa48("634"), legacyMeta?.profileId)))) || null),
        dbName: stryMutAct_9fa48("637") ? (dbName || legacyMeta?.dbName) && 'aegis_opfs_vault' : stryMutAct_9fa48("636") ? false : stryMutAct_9fa48("635") ? true : (stryCov_9fa48("635", "636", "637"), (stryMutAct_9fa48("639") ? dbName && legacyMeta?.dbName : stryMutAct_9fa48("638") ? false : (stryCov_9fa48("638", "639"), dbName || (stryMutAct_9fa48("640") ? legacyMeta.dbName : (stryCov_9fa48("640"), legacyMeta?.dbName)))) || (stryMutAct_9fa48("641") ? "" : (stryCov_9fa48("641"), 'aegis_opfs_vault'))),
        ...getDeviceInfo()
      }),
      eventLog: stryMutAct_9fa48("642") ? ["Stryker was here"] : (stryCov_9fa48("642"), [])
    });
    const map = readBindingMap();
    map[profileKey(profileId, dbName)] = record;
    appendEvent(map, profileKey(profileId, dbName), stryMutAct_9fa48("643") ? {} : (stryCov_9fa48("643"), {
      at: now,
      type: stryMutAct_9fa48("644") ? "" : (stryCov_9fa48("644"), 'legacy_migrated'),
      profileId: record.meta.profileId,
      dbName: record.meta.dbName,
      credentialId: record.credentialId,
      deviceFingerprint: record.meta.deviceFingerprint,
      detail: stryMutAct_9fa48("645") ? "" : (stryCov_9fa48("645"), 'Legacy passkey binding migrated into profile-scoped store.')
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
    if (stryMutAct_9fa48("646")) {
      {}
    } else {
      stryCov_9fa48("646");
      if (stryMutAct_9fa48("648") ? false : stryMutAct_9fa48("647") ? true : (stryCov_9fa48("647", "648"), secureStateInitialized)) return;
      if (stryMutAct_9fa48("650") ? false : stryMutAct_9fa48("649") ? true : (stryCov_9fa48("649", "650"), secureStateInitPromise)) return secureStateInitPromise;
      secureStateInitPromise = (async () => {
        if (stryMutAct_9fa48("651")) {
          {}
        } else {
          stryCov_9fa48("651");
          if (stryMutAct_9fa48("654") ? false : stryMutAct_9fa48("653") ? true : stryMutAct_9fa48("652") ? hasIndexedDb() : (stryCov_9fa48("652", "653", "654"), !hasIndexedDb())) {
            if (stryMutAct_9fa48("655")) {
              {}
            } else {
              stryCov_9fa48("655");
              secureStateCache = loadLegacyState();
              secureStateInitialized = stryMutAct_9fa48("656") ? false : (stryCov_9fa48("656"), true);
              return;
            }
          }
          try {
            if (stryMutAct_9fa48("657")) {
              {}
            } else {
              stryCov_9fa48("657");
              const stored = await readStateFromIndexedDb();
              if (stryMutAct_9fa48("659") ? false : stryMutAct_9fa48("658") ? true : (stryCov_9fa48("658", "659"), stored)) {
                if (stryMutAct_9fa48("660")) {
                  {}
                } else {
                  stryCov_9fa48("660");
                  secureStateCache = stored;
                }
              } else {
                if (stryMutAct_9fa48("661")) {
                  {}
                } else {
                  stryCov_9fa48("661");
                  secureStateCache = loadLegacyState();
                  await writeStateToIndexedDb(secureStateCache);
                }
              }
              clearLegacyStorageKeys();
            }
          } catch {
            if (stryMutAct_9fa48("662")) {
              {}
            } else {
              stryCov_9fa48("662");
              secureStateCache = loadLegacyState();
            }
          }
          secureStateInitialized = stryMutAct_9fa48("663") ? false : (stryCov_9fa48("663"), true);
        }
      })().finally(() => {
        if (stryMutAct_9fa48("664")) {
          {}
        } else {
          stryCov_9fa48("664");
          secureStateInitPromise = null;
        }
      });
      return secureStateInitPromise;
    }
  }
  static async flush(): Promise<void> {
    if (stryMutAct_9fa48("665")) {
      {}
    } else {
      stryCov_9fa48("665");
      await this.initialize();
      await schedulePersist();
    }
  }
  static getPolicy(): PasskeyPolicy {
    if (stryMutAct_9fa48("666")) {
      {}
    } else {
      stryCov_9fa48("666");
      return readPolicy();
    }
  }
  static updatePolicy(nextPolicy: Partial<PasskeyPolicy>): PasskeyPolicy {
    if (stryMutAct_9fa48("667")) {
      {}
    } else {
      stryCov_9fa48("667");
      const merged = stryMutAct_9fa48("668") ? {} : (stryCov_9fa48("668"), {
        ...readPolicy(),
        ...nextPolicy
      });
      writePolicy(merged);
      writeAuditLog(stryMutAct_9fa48("669") ? [] : (stryCov_9fa48("669"), [...readAuditLog(), stryMutAct_9fa48("670") ? {} : (stryCov_9fa48("670"), {
        at: new Date().toISOString(),
        type: stryMutAct_9fa48("671") ? "" : (stryCov_9fa48("671"), 'policy_updated'),
        detail: JSON.stringify(merged)
      })]));
      return merged;
    }
  }
  static getBinding(profileId?: string | null, dbName?: string): PasskeyBindingRecord | null {
    if (stryMutAct_9fa48("672")) {
      {}
    } else {
      stryCov_9fa48("672");
      const key = profileKey(profileId, dbName);
      const map = readBindingMap();
      if (stryMutAct_9fa48("674") ? false : stryMutAct_9fa48("673") ? true : (stryCov_9fa48("673", "674"), map[key])) return map[key];
      return migrateLegacyIfExists(profileId, dbName);
    }
  }
  static saveBinding(profileId: string | null, dbName: string, record: PasskeyBindingRecord): void {
    if (stryMutAct_9fa48("675")) {
      {}
    } else {
      stryCov_9fa48("675");
      const key = profileKey(profileId, dbName);
      const map = readBindingMap();
      const now = new Date().toISOString();
      const existing = map[key];
      const deviceInfo = getDeviceInfo();
      map[key] = stryMutAct_9fa48("676") ? {} : (stryCov_9fa48("676"), {
        ...record,
        meta: stryMutAct_9fa48("677") ? {} : (stryCov_9fa48("677"), {
          ...record.meta,
          createdAt: stryMutAct_9fa48("680") ? record.meta.createdAt && now : stryMutAct_9fa48("679") ? false : stryMutAct_9fa48("678") ? true : (stryCov_9fa48("678", "679", "680"), record.meta.createdAt || now),
          lastUsedAt: stryMutAct_9fa48("683") ? record.meta.lastUsedAt && now : stryMutAct_9fa48("682") ? false : stryMutAct_9fa48("681") ? true : (stryCov_9fa48("681", "682", "683"), record.meta.lastUsedAt || now),
          profileId,
          dbName,
          version: stryMutAct_9fa48("686") ? record.meta.version && '1.0.0' : stryMutAct_9fa48("685") ? false : stryMutAct_9fa48("684") ? true : (stryCov_9fa48("684", "685", "686"), record.meta.version || (stryMutAct_9fa48("687") ? "" : (stryCov_9fa48("687"), '1.0.0'))),
          deviceLabel: stryMutAct_9fa48("690") ? record.meta.deviceLabel && deviceInfo.deviceLabel : stryMutAct_9fa48("689") ? false : stryMutAct_9fa48("688") ? true : (stryCov_9fa48("688", "689", "690"), record.meta.deviceLabel || deviceInfo.deviceLabel),
          deviceFingerprint: stryMutAct_9fa48("693") ? record.meta.deviceFingerprint && deviceInfo.deviceFingerprint : stryMutAct_9fa48("692") ? false : stryMutAct_9fa48("691") ? true : (stryCov_9fa48("691", "692", "693"), record.meta.deviceFingerprint || deviceInfo.deviceFingerprint),
          rotatedAt: existing ? now : record.meta.rotatedAt,
          rotatedFromCredentialId: existing ? existing.credentialId : record.meta.rotatedFromCredentialId
        }),
        eventLog: stryMutAct_9fa48("694") ? [...(existing?.eventLog || []), ...(record.eventLog || [])] : (stryCov_9fa48("694"), (stryMutAct_9fa48("695") ? [] : (stryCov_9fa48("695"), [...(stryMutAct_9fa48("698") ? existing?.eventLog && [] : stryMutAct_9fa48("697") ? false : stryMutAct_9fa48("696") ? true : (stryCov_9fa48("696", "697", "698"), (stryMutAct_9fa48("699") ? existing.eventLog : (stryCov_9fa48("699"), existing?.eventLog)) || (stryMutAct_9fa48("700") ? ["Stryker was here"] : (stryCov_9fa48("700"), [])))), ...(stryMutAct_9fa48("703") ? record.eventLog && [] : stryMutAct_9fa48("702") ? false : stryMutAct_9fa48("701") ? true : (stryCov_9fa48("701", "702", "703"), record.eventLog || (stryMutAct_9fa48("704") ? ["Stryker was here"] : (stryCov_9fa48("704"), []))))])).slice(stryMutAct_9fa48("705") ? +PASSKEY_EVENT_LIMIT : (stryCov_9fa48("705"), -PASSKEY_EVENT_LIMIT)))
      });
      appendEvent(map, key, stryMutAct_9fa48("706") ? {} : (stryCov_9fa48("706"), {
        at: now,
        type: existing ? stryMutAct_9fa48("707") ? "" : (stryCov_9fa48("707"), 'rotated') : stryMutAct_9fa48("708") ? "" : (stryCov_9fa48("708"), 'bound'),
        profileId,
        dbName,
        credentialId: record.credentialId,
        deviceFingerprint: map[key].meta.deviceFingerprint,
        detail: existing ? stryMutAct_9fa48("709") ? "" : (stryCov_9fa48("709"), 'Passkey binding rotated on this device.') : stryMutAct_9fa48("710") ? "" : (stryCov_9fa48("710"), 'Passkey binding created on this device.')
      }));
      writeBindingMap(map);
    }
  }
  static updateLastUsed(profileId?: string | null, dbName?: string): void {
    if (stryMutAct_9fa48("711")) {
      {}
    } else {
      stryCov_9fa48("711");
      const key = profileKey(profileId, dbName);
      const map = readBindingMap();
      if (stryMutAct_9fa48("714") ? false : stryMutAct_9fa48("713") ? true : stryMutAct_9fa48("712") ? map[key] : (stryCov_9fa48("712", "713", "714"), !map[key])) return;
      const now = new Date().toISOString();
      map[key].meta = stryMutAct_9fa48("715") ? {} : (stryCov_9fa48("715"), {
        ...map[key].meta,
        lastUsedAt: now
      });
      appendEvent(map, key, stryMutAct_9fa48("716") ? {} : (stryCov_9fa48("716"), {
        at: now,
        type: stryMutAct_9fa48("717") ? "" : (stryCov_9fa48("717"), 'used'),
        profileId: map[key].meta.profileId,
        dbName: map[key].meta.dbName,
        credentialId: map[key].credentialId,
        deviceFingerprint: map[key].meta.deviceFingerprint,
        detail: stryMutAct_9fa48("718") ? "" : (stryCov_9fa48("718"), 'Passkey used to unlock vault.')
      }));
      writeBindingMap(map);
    }
  }
  static revokeBinding(profileId?: string | null, dbName?: string, reason: string = stryMutAct_9fa48("719") ? "" : (stryCov_9fa48("719"), 'manual_revoke')): boolean {
    if (stryMutAct_9fa48("720")) {
      {}
    } else {
      stryCov_9fa48("720");
      const key = profileKey(profileId, dbName);
      const map = readBindingMap();
      if (stryMutAct_9fa48("723") ? false : stryMutAct_9fa48("722") ? true : stryMutAct_9fa48("721") ? map[key] : (stryCov_9fa48("721", "722", "723"), !map[key])) return stryMutAct_9fa48("724") ? true : (stryCov_9fa48("724"), false);
      const record = map[key];
      const now = new Date().toISOString();
      const revocations = readRevocations();
      revocations.push(stryMutAct_9fa48("725") ? {} : (stryCov_9fa48("725"), {
        credentialId: record.credentialId,
        revokedAt: now,
        reason,
        profileId: record.meta.profileId,
        dbName: record.meta.dbName,
        deviceFingerprint: record.meta.deviceFingerprint
      }));
      writeRevocations(revocations);
      appendEvent(map, key, stryMutAct_9fa48("726") ? {} : (stryCov_9fa48("726"), {
        at: now,
        type: stryMutAct_9fa48("727") ? "" : (stryCov_9fa48("727"), 'revoked'),
        profileId: record.meta.profileId,
        dbName: record.meta.dbName,
        credentialId: record.credentialId,
        deviceFingerprint: record.meta.deviceFingerprint,
        detail: reason
      }));
      delete map[key];
      writeBindingMap(map);
      return stryMutAct_9fa48("728") ? false : (stryCov_9fa48("728"), true);
    }
  }
  static noteRecoveryExport(profileId?: string | null, dbName?: string): void {
    if (stryMutAct_9fa48("729")) {
      {}
    } else {
      stryCov_9fa48("729");
      const key = profileKey(profileId, dbName);
      const map = readBindingMap();
      if (stryMutAct_9fa48("732") ? false : stryMutAct_9fa48("731") ? true : stryMutAct_9fa48("730") ? map[key] : (stryCov_9fa48("730", "731", "732"), !map[key])) return;
      const now = new Date().toISOString();
      map[key].meta = stryMutAct_9fa48("733") ? {} : (stryCov_9fa48("733"), {
        ...map[key].meta,
        recoveryLastExportedAt: now
      });
      appendEvent(map, key, stryMutAct_9fa48("734") ? {} : (stryCov_9fa48("734"), {
        at: now,
        type: stryMutAct_9fa48("735") ? "" : (stryCov_9fa48("735"), 'recovery_exported'),
        profileId: map[key].meta.profileId,
        dbName: map[key].meta.dbName,
        credentialId: map[key].credentialId,
        deviceFingerprint: map[key].meta.deviceFingerprint,
        detail: stryMutAct_9fa48("736") ? "" : (stryCov_9fa48("736"), 'Encrypted recovery package exported.')
      }));
      writeBindingMap(map);
    }
  }
  static hasAnyBinding(): boolean {
    if (stryMutAct_9fa48("737")) {
      {}
    } else {
      stryCov_9fa48("737");
      const map = readBindingMap();
      return stryMutAct_9fa48("741") ? Object.keys(map).length <= 0 : stryMutAct_9fa48("740") ? Object.keys(map).length >= 0 : stryMutAct_9fa48("739") ? false : stryMutAct_9fa48("738") ? true : (stryCov_9fa48("738", "739", "740", "741"), Object.keys(map).length > 0);
    }
  }
  static clearAllBindings(): void {
    if (stryMutAct_9fa48("742")) {
      {}
    } else {
      stryCov_9fa48("742");
      secureStateCache = createDefaultState();
      clearLegacyStorageKeys();
      void clearStateInIndexedDb();
    }
  }
  static listBindings(): Array<PasskeyBindingRecord & {
    bindingKey: string;
  }> {
    if (stryMutAct_9fa48("743")) {
      {}
    } else {
      stryCov_9fa48("743");
      const map = readBindingMap();
      return stryMutAct_9fa48("744") ? Object.entries(map).map(([bindingKey, record]) => ({
        bindingKey,
        ...record
      })) : (stryCov_9fa48("744"), Object.entries(map).map(stryMutAct_9fa48("745") ? () => undefined : (stryCov_9fa48("745"), ([bindingKey, record]) => stryMutAct_9fa48("746") ? {} : (stryCov_9fa48("746"), {
        bindingKey,
        ...record
      }))).sort(stryMutAct_9fa48("747") ? () => undefined : (stryCov_9fa48("747"), (left, right) => stryMutAct_9fa48("748") ? Date.parse(right.meta.lastUsedAt || right.meta.createdAt) + Date.parse(left.meta.lastUsedAt || left.meta.createdAt) : (stryCov_9fa48("748"), Date.parse(stryMutAct_9fa48("751") ? right.meta.lastUsedAt && right.meta.createdAt : stryMutAct_9fa48("750") ? false : stryMutAct_9fa48("749") ? true : (stryCov_9fa48("749", "750", "751"), right.meta.lastUsedAt || right.meta.createdAt)) - Date.parse(stryMutAct_9fa48("754") ? left.meta.lastUsedAt && left.meta.createdAt : stryMutAct_9fa48("753") ? false : stryMutAct_9fa48("752") ? true : (stryCov_9fa48("752", "753", "754"), left.meta.lastUsedAt || left.meta.createdAt))))));
    }
  }
  static getEventLog(profileId?: string | null, dbName?: string): PasskeyEventRecord[] {
    if (stryMutAct_9fa48("755")) {
      {}
    } else {
      stryCov_9fa48("755");
      if (stryMutAct_9fa48("758") ? typeof profileId !== 'undefined' && typeof dbName !== 'undefined' : stryMutAct_9fa48("757") ? false : stryMutAct_9fa48("756") ? true : (stryCov_9fa48("756", "757", "758"), (stryMutAct_9fa48("760") ? typeof profileId === 'undefined' : stryMutAct_9fa48("759") ? false : (stryCov_9fa48("759", "760"), typeof profileId !== (stryMutAct_9fa48("761") ? "" : (stryCov_9fa48("761"), 'undefined')))) || (stryMutAct_9fa48("763") ? typeof dbName === 'undefined' : stryMutAct_9fa48("762") ? false : (stryCov_9fa48("762", "763"), typeof dbName !== (stryMutAct_9fa48("764") ? "" : (stryCov_9fa48("764"), 'undefined')))))) {
        if (stryMutAct_9fa48("765")) {
          {}
        } else {
          stryCov_9fa48("765");
          const binding = this.getBinding(profileId, dbName);
          return stryMutAct_9fa48("766") ? [...(binding?.eventLog || [])] : (stryCov_9fa48("766"), (stryMutAct_9fa48("767") ? [] : (stryCov_9fa48("767"), [...(stryMutAct_9fa48("770") ? binding?.eventLog && [] : stryMutAct_9fa48("769") ? false : stryMutAct_9fa48("768") ? true : (stryCov_9fa48("768", "769", "770"), (stryMutAct_9fa48("771") ? binding.eventLog : (stryCov_9fa48("771"), binding?.eventLog)) || (stryMutAct_9fa48("772") ? ["Stryker was here"] : (stryCov_9fa48("772"), []))))])).reverse());
        }
      }
      return stryMutAct_9fa48("773") ? [...readAuditLog()] : (stryCov_9fa48("773"), (stryMutAct_9fa48("774") ? [] : (stryCov_9fa48("774"), [...readAuditLog()])).reverse());
    }
  }
  static listRevocations(): PasskeyRevocationRecord[] {
    if (stryMutAct_9fa48("775")) {
      {}
    } else {
      stryCov_9fa48("775");
      return stryMutAct_9fa48("776") ? [...readRevocations()] : (stryCov_9fa48("776"), (stryMutAct_9fa48("777") ? [] : (stryCov_9fa48("777"), [...readRevocations()])).reverse());
    }
  }
  static isCredentialRevoked(credentialId: string): boolean {
    if (stryMutAct_9fa48("778")) {
      {}
    } else {
      stryCov_9fa48("778");
      return stryMutAct_9fa48("781") ? readPolicy().blockRevokedCredentials || readRevocations().some(item => item.credentialId === credentialId) : stryMutAct_9fa48("780") ? false : stryMutAct_9fa48("779") ? true : (stryCov_9fa48("779", "780", "781"), readPolicy().blockRevokedCredentials && (stryMutAct_9fa48("782") ? readRevocations().every(item => item.credentialId === credentialId) : (stryCov_9fa48("782"), readRevocations().some(stryMutAct_9fa48("783") ? () => undefined : (stryCov_9fa48("783"), item => stryMutAct_9fa48("786") ? item.credentialId !== credentialId : stryMutAct_9fa48("785") ? false : stryMutAct_9fa48("784") ? true : (stryCov_9fa48("784", "785", "786"), item.credentialId === credentialId))))));
    }
  }
  static getPolicyViolations(binding: PasskeyBindingRecord | null): string[] {
    if (stryMutAct_9fa48("787")) {
      {}
    } else {
      stryCov_9fa48("787");
      if (stryMutAct_9fa48("790") ? false : stryMutAct_9fa48("789") ? true : stryMutAct_9fa48("788") ? binding : (stryCov_9fa48("788", "789", "790"), !binding)) return stryMutAct_9fa48("791") ? ["Stryker was here"] : (stryCov_9fa48("791"), []);
      const policy = readPolicy();
      const violations: string[] = stryMutAct_9fa48("792") ? ["Stryker was here"] : (stryCov_9fa48("792"), []);
      if (stryMutAct_9fa48("795") ? policy.blockRevokedCredentials || this.isCredentialRevoked(binding.credentialId) : stryMutAct_9fa48("794") ? false : stryMutAct_9fa48("793") ? true : (stryCov_9fa48("793", "794", "795"), policy.blockRevokedCredentials && this.isCredentialRevoked(binding.credentialId))) {
        if (stryMutAct_9fa48("796")) {
          {}
        } else {
          stryCov_9fa48("796");
          violations.push(stryMutAct_9fa48("797") ? "" : (stryCov_9fa48("797"), 'PASSKEY_REVOKED'));
        }
      }
      const createdAtMs = Date.parse(stryMutAct_9fa48("800") ? binding.meta.createdAt && '' : stryMutAct_9fa48("799") ? false : stryMutAct_9fa48("798") ? true : (stryCov_9fa48("798", "799", "800"), binding.meta.createdAt || (stryMutAct_9fa48("801") ? "Stryker was here!" : (stryCov_9fa48("801"), ''))));
      if (stryMutAct_9fa48("803") ? false : stryMutAct_9fa48("802") ? true : (stryCov_9fa48("802", "803"), Number.isFinite(createdAtMs))) {
        if (stryMutAct_9fa48("804")) {
          {}
        } else {
          stryCov_9fa48("804");
          const ageDays = Math.floor(stryMutAct_9fa48("805") ? (Date.now() - createdAtMs) * (1000 * 60 * 60 * 24) : (stryCov_9fa48("805"), (stryMutAct_9fa48("806") ? Date.now() + createdAtMs : (stryCov_9fa48("806"), Date.now() - createdAtMs)) / (stryMutAct_9fa48("807") ? 1000 * 60 * 60 / 24 : (stryCov_9fa48("807"), (stryMutAct_9fa48("808") ? 1000 * 60 / 60 : (stryCov_9fa48("808"), (stryMutAct_9fa48("809") ? 1000 / 60 : (stryCov_9fa48("809"), 1000 * 60)) * 60)) * 24))));
          if (stryMutAct_9fa48("813") ? ageDays < policy.maxBindingAgeDays : stryMutAct_9fa48("812") ? ageDays > policy.maxBindingAgeDays : stryMutAct_9fa48("811") ? false : stryMutAct_9fa48("810") ? true : (stryCov_9fa48("810", "811", "812", "813"), ageDays >= policy.maxBindingAgeDays)) {
            if (stryMutAct_9fa48("814")) {
              {}
            } else {
              stryCov_9fa48("814");
              violations.push(stryMutAct_9fa48("815") ? "" : (stryCov_9fa48("815"), 'PASSKEY_ROTATION_REQUIRED'));
            }
          }
        }
      }
      if (stryMutAct_9fa48("818") ? policy.requireRecoveryExportBeforeRotation && binding.meta.rotatedFromCredentialId || !binding.meta.recoveryLastExportedAt : stryMutAct_9fa48("817") ? false : stryMutAct_9fa48("816") ? true : (stryCov_9fa48("816", "817", "818"), (stryMutAct_9fa48("820") ? policy.requireRecoveryExportBeforeRotation || binding.meta.rotatedFromCredentialId : stryMutAct_9fa48("819") ? true : (stryCov_9fa48("819", "820"), policy.requireRecoveryExportBeforeRotation && binding.meta.rotatedFromCredentialId)) && (stryMutAct_9fa48("821") ? binding.meta.recoveryLastExportedAt : (stryCov_9fa48("821"), !binding.meta.recoveryLastExportedAt)))) {
        if (stryMutAct_9fa48("822")) {
          {}
        } else {
          stryCov_9fa48("822");
          violations.push(stryMutAct_9fa48("823") ? "" : (stryCov_9fa48("823"), 'PASSKEY_RECOVERY_EXPORT_REQUIRED'));
        }
      }
      return violations;
    }
  }
  static async exportRecoveryPackage(profileId: string | null, dbName: string, password: string): Promise<string> {
    if (stryMutAct_9fa48("824")) {
      {}
    } else {
      stryCov_9fa48("824");
      const binding = this.getBinding(profileId, dbName);
      if (stryMutAct_9fa48("827") ? false : stryMutAct_9fa48("826") ? true : stryMutAct_9fa48("825") ? binding : (stryCov_9fa48("825", "826", "827"), !binding)) throw new Error(stryMutAct_9fa48("828") ? "" : (stryCov_9fa48("828"), 'NO_PASSKEY_BINDING'));
      const pkg: RecoveryPackage = stryMutAct_9fa48("829") ? {} : (stryCov_9fa48("829"), {
        kind: stryMutAct_9fa48("830") ? "" : (stryCov_9fa48("830"), 'aegis-passkey-recovery-v2'),
        binding,
        revocations: readRevocations(),
        policy: readPolicy()
      });
      const encrypted = await BackupService.encryptBackup(stryMutAct_9fa48("831") ? [] : (stryCov_9fa48("831"), [pkg]), password);
      this.noteRecoveryExport(profileId, dbName);
      return encrypted;
    }
  }
  static async importRecoveryPackage(encryptedPackage: string, password: string, expectedProfileId: string | null, expectedDbName: string): Promise<void> {
    if (stryMutAct_9fa48("832")) {
      {}
    } else {
      stryCov_9fa48("832");
      const payload = await BackupService.decryptBackup(encryptedPackage, password);
      if (stryMutAct_9fa48("835") ? !Array.isArray(payload) && payload.length === 0 : stryMutAct_9fa48("834") ? false : stryMutAct_9fa48("833") ? true : (stryCov_9fa48("833", "834", "835"), (stryMutAct_9fa48("836") ? Array.isArray(payload) : (stryCov_9fa48("836"), !Array.isArray(payload))) || (stryMutAct_9fa48("838") ? payload.length !== 0 : stryMutAct_9fa48("837") ? false : (stryCov_9fa48("837", "838"), payload.length === 0)))) throw new Error(stryMutAct_9fa48("839") ? "" : (stryCov_9fa48("839"), 'INVALID_RECOVERY_PACKAGE'));
      const pkg = payload[0] as RecoveryPackage;
      if (stryMutAct_9fa48("842") ? (!pkg || pkg.kind !== 'aegis-passkey-recovery-v2') && !pkg.binding : stryMutAct_9fa48("841") ? false : stryMutAct_9fa48("840") ? true : (stryCov_9fa48("840", "841", "842"), (stryMutAct_9fa48("844") ? !pkg && pkg.kind !== 'aegis-passkey-recovery-v2' : stryMutAct_9fa48("843") ? false : (stryCov_9fa48("843", "844"), (stryMutAct_9fa48("845") ? pkg : (stryCov_9fa48("845"), !pkg)) || (stryMutAct_9fa48("847") ? pkg.kind === 'aegis-passkey-recovery-v2' : stryMutAct_9fa48("846") ? false : (stryCov_9fa48("846", "847"), pkg.kind !== (stryMutAct_9fa48("848") ? "" : (stryCov_9fa48("848"), 'aegis-passkey-recovery-v2')))))) || (stryMutAct_9fa48("849") ? pkg.binding : (stryCov_9fa48("849"), !pkg.binding)))) {
        if (stryMutAct_9fa48("850")) {
          {}
        } else {
          stryCov_9fa48("850");
          throw new Error(stryMutAct_9fa48("851") ? "" : (stryCov_9fa48("851"), 'INVALID_RECOVERY_PACKAGE'));
        }
      }
      const meta = stryMutAct_9fa48("854") ? pkg.binding.meta && {} as PasskeyBindingMeta : stryMutAct_9fa48("853") ? false : stryMutAct_9fa48("852") ? true : (stryCov_9fa48("852", "853", "854"), pkg.binding.meta || {} as PasskeyBindingMeta);
      if (stryMutAct_9fa48("857") ? meta.profileId || meta.profileId !== expectedProfileId : stryMutAct_9fa48("856") ? false : stryMutAct_9fa48("855") ? true : (stryCov_9fa48("855", "856", "857"), meta.profileId && (stryMutAct_9fa48("859") ? meta.profileId === expectedProfileId : stryMutAct_9fa48("858") ? true : (stryCov_9fa48("858", "859"), meta.profileId !== expectedProfileId)))) {
        if (stryMutAct_9fa48("860")) {
          {}
        } else {
          stryCov_9fa48("860");
          throw new Error(stryMutAct_9fa48("861") ? "" : (stryCov_9fa48("861"), 'RECOVERY_PROFILE_MISMATCH'));
        }
      }
      if (stryMutAct_9fa48("864") ? meta.dbName || meta.dbName !== expectedDbName : stryMutAct_9fa48("863") ? false : stryMutAct_9fa48("862") ? true : (stryCov_9fa48("862", "863", "864"), meta.dbName && (stryMutAct_9fa48("866") ? meta.dbName === expectedDbName : stryMutAct_9fa48("865") ? true : (stryCov_9fa48("865", "866"), meta.dbName !== expectedDbName)))) {
        if (stryMutAct_9fa48("867")) {
          {}
        } else {
          stryCov_9fa48("867");
          throw new Error(stryMutAct_9fa48("868") ? "" : (stryCov_9fa48("868"), 'RECOVERY_DB_MISMATCH'));
        }
      }
      this.saveBinding(expectedProfileId, expectedDbName, stryMutAct_9fa48("869") ? {} : (stryCov_9fa48("869"), {
        ...pkg.binding,
        meta: stryMutAct_9fa48("870") ? {} : (stryCov_9fa48("870"), {
          ...pkg.binding.meta,
          profileId: expectedProfileId,
          dbName: expectedDbName,
          lastUsedAt: new Date().toISOString(),
          ...getDeviceInfo()
        })
      }));
      const key = profileKey(expectedProfileId, expectedDbName);
      const map = readBindingMap();
      if (stryMutAct_9fa48("872") ? false : stryMutAct_9fa48("871") ? true : (stryCov_9fa48("871", "872"), Array.isArray(pkg.revocations))) {
        if (stryMutAct_9fa48("873")) {
          {}
        } else {
          stryCov_9fa48("873");
          const merged = (stryMutAct_9fa48("874") ? [] : (stryCov_9fa48("874"), [...readRevocations(), ...pkg.revocations])).reduce<PasskeyRevocationRecord[]>((acc, item) => {
            if (stryMutAct_9fa48("875")) {
              {}
            } else {
              stryCov_9fa48("875");
              if (stryMutAct_9fa48("878") ? false : stryMutAct_9fa48("877") ? true : stryMutAct_9fa48("876") ? acc.some(existing => existing.credentialId === item.credentialId && existing.revokedAt === item.revokedAt) : (stryCov_9fa48("876", "877", "878"), !(stryMutAct_9fa48("879") ? acc.every(existing => existing.credentialId === item.credentialId && existing.revokedAt === item.revokedAt) : (stryCov_9fa48("879"), acc.some(stryMutAct_9fa48("880") ? () => undefined : (stryCov_9fa48("880"), existing => stryMutAct_9fa48("883") ? existing.credentialId === item.credentialId || existing.revokedAt === item.revokedAt : stryMutAct_9fa48("882") ? false : stryMutAct_9fa48("881") ? true : (stryCov_9fa48("881", "882", "883"), (stryMutAct_9fa48("885") ? existing.credentialId !== item.credentialId : stryMutAct_9fa48("884") ? true : (stryCov_9fa48("884", "885"), existing.credentialId === item.credentialId)) && (stryMutAct_9fa48("887") ? existing.revokedAt !== item.revokedAt : stryMutAct_9fa48("886") ? true : (stryCov_9fa48("886", "887"), existing.revokedAt === item.revokedAt))))))))) {
                if (stryMutAct_9fa48("888")) {
                  {}
                } else {
                  stryCov_9fa48("888");
                  acc.push(item);
                }
              }
              return acc;
            }
          }, stryMutAct_9fa48("889") ? ["Stryker was here"] : (stryCov_9fa48("889"), []));
          writeRevocations(merged);
        }
      }
      if (stryMutAct_9fa48("891") ? false : stryMutAct_9fa48("890") ? true : (stryCov_9fa48("890", "891"), pkg.policy)) {
        if (stryMutAct_9fa48("892")) {
          {}
        } else {
          stryCov_9fa48("892");
          writePolicy(stryMutAct_9fa48("893") ? {} : (stryCov_9fa48("893"), {
            ...readPolicy(),
            ...pkg.policy
          }));
        }
      }
      if (stryMutAct_9fa48("895") ? false : stryMutAct_9fa48("894") ? true : (stryCov_9fa48("894", "895"), map[key])) {
        if (stryMutAct_9fa48("896")) {
          {}
        } else {
          stryCov_9fa48("896");
          appendEvent(map, key, stryMutAct_9fa48("897") ? {} : (stryCov_9fa48("897"), {
            at: new Date().toISOString(),
            type: stryMutAct_9fa48("898") ? "" : (stryCov_9fa48("898"), 'recovery_imported'),
            profileId: expectedProfileId,
            dbName: expectedDbName,
            credentialId: map[key].credentialId,
            deviceFingerprint: map[key].meta.deviceFingerprint,
            detail: stryMutAct_9fa48("899") ? "" : (stryCov_9fa48("899"), 'Recovery package imported for active vault profile.')
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
    if (stryMutAct_9fa48("900")) {
      {}
    } else {
      stryCov_9fa48("900");
      const now = new Date().toISOString();
      return stryMutAct_9fa48("901") ? {} : (stryCov_9fa48("901"), {
        ...entry,
        passkeyMetadata: stryMutAct_9fa48("902") ? {} : (stryCov_9fa48("902"), {
          ...(stryMutAct_9fa48("905") ? entry.passkeyMetadata && {} : stryMutAct_9fa48("904") ? false : stryMutAct_9fa48("903") ? true : (stryCov_9fa48("903", "904", "905"), entry.passkeyMetadata || {})),
          credential_id: credentialId,
          rp_id: rpId,
          mode: stryMutAct_9fa48("906") ? "" : (stryCov_9fa48("906"), 'site_passkey_active'),
          created_at: stryMutAct_9fa48("909") ? entry.passkeyMetadata?.created_at && now : stryMutAct_9fa48("908") ? false : stryMutAct_9fa48("907") ? true : (stryCov_9fa48("907", "908", "909"), (stryMutAct_9fa48("910") ? entry.passkeyMetadata.created_at : (stryCov_9fa48("910"), entry.passkeyMetadata?.created_at)) || now),
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
    if (stryMutAct_9fa48("911")) {
      {}
    } else {
      stryCov_9fa48("911");
      const local = readRevocations();
      const map = new Map<string, PasskeyRevocationRecord>();
      let changedCount = 0;
      local.forEach(stryMutAct_9fa48("912") ? () => undefined : (stryCov_9fa48("912"), rev => map.set(rev.credentialId, rev)));
      external.forEach(rev => {
        if (stryMutAct_9fa48("913")) {
          {}
        } else {
          stryCov_9fa48("913");
          const existing = map.get(rev.credentialId);
          if (stryMutAct_9fa48("916") ? !existing && Date.parse(rev.revokedAt) > Date.parse(existing.revokedAt) : stryMutAct_9fa48("915") ? false : stryMutAct_9fa48("914") ? true : (stryCov_9fa48("914", "915", "916"), (stryMutAct_9fa48("917") ? existing : (stryCov_9fa48("917"), !existing)) || (stryMutAct_9fa48("920") ? Date.parse(rev.revokedAt) <= Date.parse(existing.revokedAt) : stryMutAct_9fa48("919") ? Date.parse(rev.revokedAt) >= Date.parse(existing.revokedAt) : stryMutAct_9fa48("918") ? false : (stryCov_9fa48("918", "919", "920"), Date.parse(rev.revokedAt) > Date.parse(existing.revokedAt))))) {
            if (stryMutAct_9fa48("921")) {
              {}
            } else {
              stryCov_9fa48("921");
              map.set(rev.credentialId, rev);
              stryMutAct_9fa48("922") ? changedCount-- : (stryCov_9fa48("922"), changedCount++);
            }
          }
        }
      });
      if (stryMutAct_9fa48("926") ? changedCount <= 0 : stryMutAct_9fa48("925") ? changedCount >= 0 : stryMutAct_9fa48("924") ? false : stryMutAct_9fa48("923") ? true : (stryCov_9fa48("923", "924", "925", "926"), changedCount > 0)) {
        if (stryMutAct_9fa48("927")) {
          {}
        } else {
          stryCov_9fa48("927");
          writeRevocations(Array.from(map.values()));
        }
      }
      return changedCount;
    }
  }
}
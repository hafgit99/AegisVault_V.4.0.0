/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from "react";
import { vaultService, type VaultEntry } from "../vaultService";
import { useClipboard } from "../hooks/useClipboard";
import { extensionBridge } from "../lib/ExtensionBridge";
import { breachChecker } from "../lib/breach-check";
import { SecureAppSettings } from "../lib/SecureAppSettings";
import { SecurityModePolicy } from "../lib/SecurityModePolicy";
import { VaultSharingLinkService } from "../lib/VaultSharingLinkService";
import { WebAuthnService } from "../lib/WebAuthnService";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import DOMPurify from "dompurify";
import type { SecurityModeProfile } from "../lib/SecureAppSettings";
import type { SitePasskeyAuthOptions } from "../lib/WebAuthnService";

// Güvenli eklenti haberleşmesi için oturum nonce'u (P0-2)
let currentExtensionNonce: string | null = null;

const getSafePostMessageTarget = () => {
  if (typeof window === "undefined") return "*";
  const origin = window.location.origin;
  if (!origin || origin === "null" || origin.startsWith("file:")) {
    return "*";
  }
  return origin;
};

if (typeof window !== "undefined") {
  window.addEventListener("message", (event) => {
    if (event.data?.type === "AEGIS_EXTENSION_READY" || event.data?.type === "AEGIS_NONCE_UPDATE") {
      if (event.data.nonce) {
        currentExtensionNonce = event.data.nonce;
      }
    }
  });
}

// ─────────────────────────────────────────────────────────────────
// Türler
// ─────────────────────────────────────────────────────────────────

export interface WatchtowerData {
  weak: number;
  reused: number;
  old: number;
  pwned: number;
  score: number;
}

export interface VaultContextType {
  // Veri
  passwords: VaultEntry[];
  isDecrypting: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchScope: "all" | "title" | "username" | "tags";
  setSearchScope: (s: "all" | "title" | "username" | "tags") => void;
  viewDensity: "comfortable" | "compact";
  setViewDensity: (d: "comfortable" | "compact") => void;
  sortOption: "updated_desc" | "updated_asc" | "title_asc" | "title_desc";
  setSortOption: (s: "updated_desc" | "updated_asc" | "title_asc" | "title_desc") => void;
  categoryFilter: string;
  setCategoryFilter: (f: string) => void;
  visiblePasswords: Set<number>;
  toggleVisibility: (id: number) => void;
  visibleCount: number;
  setVisibleCount: React.Dispatch<React.SetStateAction<number>>;

  // CRUD İşlemleri
  loadPasswords: () => void;
  handleCreateEntry: (entry: Partial<VaultEntry>, attachments: File[]) => Promise<void>;
  handleDeleteEntry: (id: number) => Promise<void>;
  handleRestoreEntry: (id: number) => Promise<void>;
  handleEmptyTrash: () => Promise<void>;

  // Clipboard
  copiedId: number | null;
  handleCopyItem: (id: number, pass: string) => void;
  timeLeft: number;
  timeoutSeconds: number;

  // Güvenlik
  watchtower: WatchtowerData;
  isPwnedScanning: boolean;
  pwnedScanProgress: number;
  hibpEnabled: boolean;
  setHibpEnabled: (enabled: boolean) => void;
  hibpLastResult: 'idle' | 'ok' | 'unknown';
  handleScanPwned: () => Promise<void>;
  uniqueTags: string[];
  
  // Parola PIN'leri (şifreli)
  duressPin: string;
  setDuressPin: (p: string) => void;
  killPin: string;
  setKillPin: (p: string) => void;
  saveSecretSettings: () => Promise<void>;

  // Oturum
  autoLockTime: number;
  setAutoLockTime: (t: number) => void;
  securityModeProfile: SecurityModeProfile;
  handleLock: () => void;
  secretKey?: string;

  // Yardımcı
  getCategoryIcon: (cat: string) => React.ReactNode;
}

type DomainCredential = Pick<
  VaultEntry,
  "title" | "username" | "pass" | "website" | "category" | "cardDetails" | "identityDetails"
>;
type AutosaveCredentialCandidate = {
  title?: string;
  username?: string;
  pass?: string;
  website?: string;
  submittedAt?: string;
  source?: string;
};

type VaultCliOperationPayload = Record<string, unknown>;
type VaultCliHandler = (
  operation: string,
  payload?: VaultCliOperationPayload
) => Promise<{ ok: boolean; error?: string; data?: unknown }>;

type ElectronVaultState = {
  unlocked: boolean;
  entryCount: number;
};

type ElectronBridgeApi = {
  syncVaultState?: (state: ElectronVaultState) => void;
  setDomainCredentialProvider?: (provider: ((domain: string) => DomainCredential[]) | null) => void;
  setDomainPasskeyProvider?: (provider: ((domain: string) => any[]) | null) => void;
  setPasskeyAuthHandler?: (handler: ((options: SitePasskeyAuthOptions) => Promise<any>) | null) => void;
  setAutosaveCredentialHandler?: (
    handler: ((credential: AutosaveCredentialCandidate) => Promise<{ saved: boolean; action?: string; entryId?: number; error?: string }>) | null
  ) => void;
  setVaultCliHandler?: (handler: VaultCliHandler | null) => void;
  lockVault?: () => void;
};

type RuntimeApi = {
  sendMessage?: (extensionId: string, message: { type: string }, callback?: () => void) => void;
  lastError?: unknown;
};

type WindowWithAegisElectron = Window & typeof globalThis & {
  aegisElectron?: ElectronBridgeApi;
  chrome?: {
    runtime?: RuntimeApi;
  };
};

type ImportMetaEnvWithExtensionId = ImportMetaEnv & {
  VITE_AEGIS_EXTENSION_ID?: string;
};

const VaultContext = createContext<VaultContextType | null>(null);

export function useVault(): VaultContextType {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
}

// ─────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────

interface VaultProviderProps {
  children: ReactNode;
  onLock: () => void;
  secretKey?: string;
}

export function VaultProvider({ children, onLock, secretKey }: VaultProviderProps) {
  const { t } = useTranslation();
  const getElectronApi = useCallback(
    (): ElectronBridgeApi | undefined => (window as WindowWithAegisElectron).aegisElectron,
    []
  );
  const getRuntimeApi = useCallback(
    (): RuntimeApi | undefined => (window as WindowWithAegisElectron).chrome?.runtime,
    []
  );
  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : String(error);

  // Core State
  const [passwords, setPasswords] = useState<VaultEntry[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchScope, setSearchScope] = useState<"all" | "title" | "username" | "tags">("all");
  const [viewDensity, setViewDensity] = useState<"comfortable" | "compact">(() => {
    return SecureAppSettings.getViewDensity();
  });
  const [sortOption, setSortOption] = useState<"updated_desc" | "updated_asc" | "title_asc" | "title_desc">("updated_desc");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set());
  const [visibleCount, setVisibleCount] = useState(20);

  // PIN State (şifreli depolama)
  const [duressPin, setDuressPin] = useState("");
  const [killPin, setKillPin] = useState("");

  // Clipboard
  const { copiedId, copy, timeLeft, timeoutSeconds } = useClipboard();

  // HIBP State
  const [isPwnedScanning, setIsPwnedScanning] = useState(false);
  const [pwnedScanProgress, setPwnedScanProgress] = useState(0);
  const [hibpEnabled, setHibpEnabledState] = useState<boolean>(() => {
    return SecureAppSettings.getHibpEnabled();
  });
  const [hibpLastResult, setHibpLastResult] = useState<'idle' | 'ok' | 'unknown'>('idle');
  const [securityModeProfile, setSecurityModeProfile] = useState<SecurityModeProfile>(() => {
    return SecureAppSettings.getSecurityModeProfile();
  });

  // Auto-Lock (Persist in localStorage)
  const [autoLockTime, setAutoLockTimeState] = useState<number>(() => {
    return SecurityModePolicy.enforceAutoLock(SecureAppSettings.getAutoLockTime(), SecureAppSettings.getSecurityModeProfile());
  });

  useEffect(() => {
    SecureAppSettings.setAutoLockTime(autoLockTime);
  }, [autoLockTime]);

  const setHibpEnabled = useCallback((enabled: boolean) => {
    if (enabled && !SecurityModePolicy.isHibpAllowed(securityModeProfile)) {
      toast.info(t('securityModeHibpBlocked'));
      setHibpEnabledState(false);
      SecureAppSettings.setHibpEnabled(false);
      return;
    }
    setHibpEnabledState(enabled);
    SecureAppSettings.setHibpEnabled(enabled);
  }, [securityModeProfile, t]);

  const setAutoLockTime = useCallback((value: number) => {
    const enforced = SecurityModePolicy.enforceAutoLock(value, securityModeProfile);
    if (enforced !== value) {
      toast.info(t('securityModeAutoLockAdjusted', { minutes: enforced }));
    }
    setAutoLockTimeState(enforced);
    SecureAppSettings.setAutoLockTime(enforced);
  }, [securityModeProfile, t]);

  // Ref for handleLock (avoids stale closure in auto-lock timer)
  const handleLockRef = useRef<() => void>(() => {});

  // ─── 300ms Debounce Search ───
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    SecureAppSettings.setViewDensity(viewDensity);
  }, [viewDensity]);

  useEffect(() => {
    void SecureAppSettings.initialize().then(() => {
      const profile = SecureAppSettings.getSecurityModeProfile();
      setSecurityModeProfile(profile);
      
      const savedDensity = SecureAppSettings.getViewDensity();
      setViewDensity(savedDensity);

      const hibpAllowed = SecurityModePolicy.isHibpAllowed(profile);
      const hibpCurrentState = SecureAppSettings.getHibpEnabled();
      
      if (!hibpAllowed && hibpCurrentState) {
        SecureAppSettings.setHibpEnabled(false);
        setHibpEnabledState(false);
      } else {
        setHibpEnabledState(hibpCurrentState);
      }

      const currentAutoLock = SecureAppSettings.getAutoLockTime();
      const enforcedAutoLock = SecurityModePolicy.enforceAutoLock(currentAutoLock, profile);
      
      if (enforcedAutoLock !== currentAutoLock) {
        SecureAppSettings.setAutoLockTime(enforcedAutoLock);
      }
      setAutoLockTimeState(enforcedAutoLock);
    });
  }, []);

  // ─── Veri Yükleme ───
  const loadPasswords = useCallback(() => {
    setIsDecrypting(true);
    const isTrash = categoryFilter === "Trash";
    vaultService.getPasswords(debouncedSearch, categoryFilter, isTrash, searchScope).then(data => {
      const hydratedData = VaultSharingLinkService.hydrateEntries(data);
      const sortedData = [...hydratedData].sort((a, b) => {
        if (sortOption === "title_asc") {
          return (a.title || "").localeCompare((b.title || ""), undefined, { sensitivity: "base", numeric: true });
        }
        if (sortOption === "title_desc") {
          return (b.title || "").localeCompare((a.title || ""), undefined, { sensitivity: "base", numeric: true });
        }

        const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        if (sortOption === "updated_asc") {
          return aTime - bTime;
        }
        return bTime - aTime;
      });

      setPasswords(sortedData);
      setVisibleCount(20);
      setIsDecrypting(false);
    });

    // 🔒 Şifrelenmiş PIN'leri yükle
    vaultService.getSecurityPins().then(pins => {
      setDuressPin(pins.duressPin);
      setKillPin(pins.killPin);
    }).catch(() => {});
  }, [debouncedSearch, categoryFilter, sortOption, searchScope]);

  // İlk yükleme + filtre/arama değişikliği
  useEffect(() => {
    loadPasswords();
  }, [loadPasswords]);

  // ─── Extension Senkronizasyonu ─────────────────────────────────
  // Çok katmanlı strateji:
  //   1. Nonce ile güvenli postMessage (content script aynı sayfadaysa)
  //   2. chrome.runtime.sendMessage direkt (fallback, nonce yoksa)
  //   3. Electron API (masaüstü uygulaması)
  // Bu sayede kasa açık olduğunda extension her zaman senkronize olur.
  useEffect(() => {
    // Güvenlik sertleştirme: extension'a toplu plaintext sync kapatıldı.
    // Extension veri çekimini challenge + domain-scoped akış üzerinden yapar.

    const normalizeDomain = (input: string) => {
      try {
        const parsed = input.includes('://') ? new URL(input) : new URL(`https://${input}`);
        return parsed.hostname.toLowerCase().replace(/^www\./, '');
      } catch {
        return (input || '').toLowerCase().replace(/^www\./, '').trim();
      }
    };

    const isDomainMatch = (entryWebsite: string, requestedDomain: string) => {
      const entryDomain = normalizeDomain(entryWebsite);
      const wanted = normalizeDomain(requestedDomain);
      if (!entryDomain || !wanted) return false;
      return entryDomain === wanted || entryDomain.endsWith(`.${wanted}`) || wanted.endsWith(`.${entryDomain}`);
    };

    const getMatchesForDomain = (domain: string) => {
      const normalizedDomain = normalizeDomain(domain);
      if (!normalizedDomain) return [];

      return passwords
        .filter((p) => p.pass && p.website && isDomainMatch(p.website, normalizedDomain))
        .slice(0, 5)
        .map((p) => ({
          title: p.title,
          username: p.username,
          pass: p.pass,
          website: p.website,
          category: p.category,
          cardDetails: p.cardDetails,
          identityDetails: p.identityDetails,
        }));
    };

    const getPasskeysForDomain = (domain: string) => {
      const normalizedDomain = normalizeDomain(domain);
      if (!normalizedDomain) return [];

      return passwords
        .filter((p) => p.website && isDomainMatch(p.website, normalizedDomain) && p.passkeyMetadata)
        .slice(0, 5)
        .map((p) => ({
          title: p.title,
          username: p.username,
          website: p.website,
          passkeyMetadata: p.passkeyMetadata,
        }));
    };

    const handlePasskeyAuthRequest = async (options: SitePasskeyAuthOptions) => {
      if (passwords.length === 0) {
        throw new Error('VAULT_LOCKED');
      }
      return await WebAuthnService.authenticateSitePasskey(options);
    };

    const handleAutosaveCredential = async (candidate: AutosaveCredentialCandidate) => {
      const website = DOMPurify.sanitize(candidate?.website || '').trim();
      const pass = String(candidate?.pass || '');
      const username = DOMPurify.sanitize(candidate?.username || '').trim();
      const title = DOMPurify.sanitize(candidate?.title || '').trim();

      if (!website || !pass) {
        return { saved: false, action: 'rejected', error: 'INVALID_CREDENTIAL' };
      }
      if (passwords.length === 0) {
        return { saved: false, action: 'rejected', error: 'VAULT_LOCKED' };
      }

      const normalizedDomain = normalizeDomain(website);
      const normalizedUsername = username.toLowerCase();
      const existingForSite = passwords.filter((entry) => {
        if (!entry.website) return false;
        if (!isDomainMatch(entry.website, normalizedDomain)) return false;
        const entryUsername = (entry.username || '').toLowerCase().trim();
        return normalizedUsername ? entryUsername === normalizedUsername : true;
      });

      const exactDuplicate = existingForSite.find((entry) => entry.pass === pass);
      if (exactDuplicate) {
        return {
          saved: false,
          action: 'duplicate',
          entryId: Number.isFinite(Number(exactDuplicate.id)) ? Number(exactDuplicate.id) : undefined,
        };
      }

      const updateTarget = existingForSite.find((entry) => Number.isFinite(Number(entry.id)));
      if (updateTarget && Number.isFinite(Number(updateTarget.id))) {
        const updateId = Number(updateTarget.id);
        await vaultService.updatePassword(updateId, {
          ...updateTarget,
          title: title || updateTarget.title || normalizedDomain,
          username: username || updateTarget.username || '',
          pass,
          website,
        });
        loadPasswords();
        return { saved: true, action: 'updated', entryId: updateId };
      }

      const newId = await vaultService.addPassword({
        title: title || normalizedDomain,
        username,
        pass,
        website,
        category: 'General',
      });
      loadPasswords();
      return {
        saved: true,
        action: 'created',
        entryId: Number.isFinite(Number(newId)) ? Number(newId) : undefined,
      };
    };

    const sanitizeCliEntry = (entry: Partial<VaultEntry>) => ({
      id: Number(entry.id),
      title: DOMPurify.sanitize(String(entry.title || '')).slice(0, 256),
      username: DOMPurify.sanitize(String(entry.username || '')).slice(0, 256),
      pass: String(entry.pass || '').slice(0, 1024),
      website: DOMPurify.sanitize(String(entry.website || '')).slice(0, 512),
      category: DOMPurify.sanitize(String(entry.category || 'General')).slice(0, 64),
      tags: Array.isArray(entry.tags)
        ? entry.tags.slice(0, 32).map((tag) => DOMPurify.sanitize(String(tag || '')).slice(0, 64))
        : [],
      updated_at: String(entry.updated_at || ''),
      deletedAt: typeof entry.deletedAt === 'string' ? entry.deletedAt : undefined,
    });

    const findEntryById = async (entryId: number): Promise<VaultEntry | null> => {
      if (!Number.isFinite(entryId)) return null;
      const active = await vaultService.getPasswords('', '', false, 'all');
      const inActive = active.find((item) => Number(item.id) === entryId);
      if (inActive) return inActive;
      const trash = await vaultService.getPasswords('', '', true, 'all');
      return trash.find((item) => Number(item.id) === entryId) || null;
    };

    const handleVaultCliOperation: VaultCliHandler = async (operation, payload = {}) => {
      const normalizedOp = String(operation || '').trim().toLowerCase();

      if (normalizedOp === 'list') {
        const query = typeof payload.query === 'string' ? payload.query : '';
        const category = typeof payload.category === 'string' ? payload.category : '';
        const scope = payload.scope === 'trash' ? 'trash' : 'active';
        const searchScope = ((): "all" | "title" | "username" | "tags" => {
          const candidate = typeof payload.searchScope === 'string' ? payload.searchScope : 'all';
          return ['all', 'title', 'username', 'tags'].includes(candidate) ? (candidate as "all" | "title" | "username" | "tags") : 'all';
        })();
        const limitRaw = Number(payload.limit);
        const limit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, Math.trunc(limitRaw))) : 50;
        const entries = await vaultService.getPasswords(query, category, scope === 'trash', searchScope);
        return {
          ok: true,
          data: entries.slice(0, limit).map((entry) => sanitizeCliEntry(entry)),
        };
      }

      if (normalizedOp === 'get') {
        const entryId = Number(payload.entryId);
        if (!Number.isFinite(entryId)) return { ok: false, error: 'INVALID_ENTRY_ID' };
        const found = await findEntryById(entryId);
        if (!found) return { ok: false, error: 'ENTRY_NOT_FOUND' };
        return { ok: true, data: sanitizeCliEntry(found) };
      }

      if (normalizedOp === 'create') {
        const rawEntry = payload.entry && typeof payload.entry === 'object' ? payload.entry as Partial<VaultEntry> : null;
        if (!rawEntry) return { ok: false, error: 'INVALID_ENTRY_PAYLOAD' };
        const title = DOMPurify.sanitize(String(rawEntry.title || '')).slice(0, 256);
        const pass = String(rawEntry.pass || '').slice(0, 1024);
        if (!title || !pass) return { ok: false, error: 'TITLE_AND_PASSWORD_REQUIRED' };
        const entryToCreate: Partial<VaultEntry> = {
          title,
          username: DOMPurify.sanitize(String(rawEntry.username || '')).slice(0, 256),
          pass,
          website: DOMPurify.sanitize(String(rawEntry.website || '')).slice(0, 512),
          category: DOMPurify.sanitize(String(rawEntry.category || 'General')).slice(0, 64),
          tags: Array.isArray(rawEntry.tags)
            ? rawEntry.tags.slice(0, 32).map((tag) => DOMPurify.sanitize(String(tag || '')).slice(0, 64))
            : [],
        };
        const newId = await vaultService.addPassword(entryToCreate);
        loadPasswords();
        const created = await findEntryById(Number(newId));
        return { ok: true, data: created ? sanitizeCliEntry(created) : { id: Number(newId) } };
      }

      if (normalizedOp === 'update') {
        const entryId = Number(payload.entryId);
        const rawEntry = payload.entry && typeof payload.entry === 'object' ? payload.entry as Partial<VaultEntry> : null;
        if (!Number.isFinite(entryId) || !rawEntry) return { ok: false, error: 'INVALID_ENTRY_PAYLOAD' };
        const existing = await findEntryById(entryId);
        if (!existing) return { ok: false, error: 'ENTRY_NOT_FOUND' };

        const merged: Partial<VaultEntry> = {
          ...existing,
          ...rawEntry,
          title: DOMPurify.sanitize(String(rawEntry.title ?? existing.title ?? '')).slice(0, 256),
          username: DOMPurify.sanitize(String(rawEntry.username ?? existing.username ?? '')).slice(0, 256),
          website: DOMPurify.sanitize(String(rawEntry.website ?? existing.website ?? '')).slice(0, 512),
          category: DOMPurify.sanitize(String(rawEntry.category ?? existing.category ?? 'General')).slice(0, 64),
          pass: String(rawEntry.pass ?? existing.pass ?? '').slice(0, 1024),
          tags: Array.isArray(rawEntry.tags)
            ? rawEntry.tags.slice(0, 32).map((tag) => DOMPurify.sanitize(String(tag || '')).slice(0, 64))
            : (existing.tags || []),
        };
        if (!merged.title || !merged.pass) return { ok: false, error: 'TITLE_AND_PASSWORD_REQUIRED' };
        await vaultService.updatePassword(entryId, merged);
        loadPasswords();
        const updated = await findEntryById(entryId);
        return { ok: true, data: updated ? sanitizeCliEntry(updated) : { id: entryId } };
      }

      if (normalizedOp === 'delete') {
        const entryId = Number(payload.entryId);
        if (!Number.isFinite(entryId)) return { ok: false, error: 'INVALID_ENTRY_ID' };
        await vaultService.moveToTrash(entryId);
        loadPasswords();
        return { ok: true, data: { id: entryId, deleted: true } };
      }

      if (normalizedOp === 'restore') {
        const entryId = Number(payload.entryId);
        if (!Number.isFinite(entryId)) return { ok: false, error: 'INVALID_ENTRY_ID' };
        await vaultService.restoreFromTrash(entryId);
        loadPasswords();
        return { ok: true, data: { id: entryId, restored: true } };
      }

      if (normalizedOp === 'empty-trash') {
        await vaultService.emptyTrash();
        loadPasswords();
        return { ok: true, data: { emptied: true } };
      }

      return { ok: false, error: 'UNSUPPORTED_OPERATION' };
    };

    try {
      const electronApi = getElectronApi();
      if (electronApi?.syncVaultState) {
        electronApi.syncVaultState({
          unlocked: true,
          entryCount: passwords.filter((p) => Boolean(p.pass && p.website && p.website.trim())).length,
        });
      }
      if (electronApi?.setDomainCredentialProvider) {
        electronApi.setDomainCredentialProvider((domain: string) => getMatchesForDomain(domain));
      }
      if (electronApi?.setDomainPasskeyProvider) {
        electronApi.setDomainPasskeyProvider((domain: string) => getPasskeysForDomain(domain));
      }
      if (electronApi?.setPasskeyAuthHandler) {
        electronApi.setPasskeyAuthHandler(handlePasskeyAuthRequest);
      }
      if (electronApi?.setAutosaveCredentialHandler) {
        electronApi.setAutosaveCredentialHandler(handleAutosaveCredential);
      }
      if (electronApi?.setVaultCliHandler) {
        electronApi.setVaultCliHandler(handleVaultCliOperation);
      }
    } catch {
      // Electron bridge bu ortamda mevcut olmayabilir
    }

    return () => {
      try {
        const electronApi = getElectronApi();
        if (electronApi?.setDomainCredentialProvider) {
          electronApi.setDomainCredentialProvider(null);
        }
        if (electronApi?.setDomainPasskeyProvider) {
          electronApi.setDomainPasskeyProvider(null);
        }
        if (electronApi?.setPasskeyAuthHandler) {
          electronApi.setPasskeyAuthHandler(null);
        }
        if (electronApi?.setAutosaveCredentialHandler) {
          electronApi.setAutosaveCredentialHandler(null);
        }
        if (electronApi?.setVaultCliHandler) {
          electronApi.setVaultCliHandler(null);
        }
      } catch {
        // cleanup hatasi ana akis icin kritik degil
      }
    };
  }, [getElectronApi, loadPasswords, passwords]);

  // ─── Toggles ───
  const toggleVisibility = useCallback((id: number) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ─── CRUD ───
  const handleCreateEntry = useCallback(async (entry: Partial<VaultEntry>, attachments: File[]) => {
    if (!entry.title || !entry.pass) {
      toast.error(t("titleAndPassRequired"));
      return;
    }

    const cleanEntry = {
      ...entry,
      title: DOMPurify.sanitize(entry.title),
      username: DOMPurify.sanitize(entry.username || ""),
      website: DOMPurify.sanitize(entry.website || ""),
      category: DOMPurify.sanitize(entry.category || "General"),
      tags: entry.tags?.map(tg => DOMPurify.sanitize(tg)) || [],
      cardDetails: entry.cardDetails
        ? {
            cardholder_name: DOMPurify.sanitize(entry.cardDetails.cardholder_name || ""),
            card_number: DOMPurify.sanitize(entry.cardDetails.card_number || ""),
            brand: DOMPurify.sanitize(entry.cardDetails.brand || ""),
            expiry_month: DOMPurify.sanitize(entry.cardDetails.expiry_month || ""),
            expiry_year: DOMPurify.sanitize(entry.cardDetails.expiry_year || ""),
            cvv: DOMPurify.sanitize(entry.cardDetails.cvv || ""),
            pin: DOMPurify.sanitize(entry.cardDetails.pin || ""),
            billing_zip: DOMPurify.sanitize(entry.cardDetails.billing_zip || ""),
            billing_address: DOMPurify.sanitize(entry.cardDetails.billing_address || ""),
          }
        : undefined,
      identityDetails: entry.identityDetails
        ? {
            document_type: DOMPurify.sanitize(entry.identityDetails.document_type || ""),
            identity_number: DOMPurify.sanitize(entry.identityDetails.identity_number || ""),
            issuing_country: DOMPurify.sanitize(entry.identityDetails.issuing_country || ""),
            nationality: DOMPurify.sanitize(entry.identityDetails.nationality || ""),
            date_of_birth: DOMPurify.sanitize(entry.identityDetails.date_of_birth || ""),
            issued_at: DOMPurify.sanitize(entry.identityDetails.issued_at || ""),
            expires_at: DOMPurify.sanitize(entry.identityDetails.expires_at || ""),
          }
        : undefined,
      sharing: Array.isArray(entry.sharing)
        ? entry.sharing.map((assignment) => ({
            ...assignment,
            space_id: DOMPurify.sanitize(assignment.space_id),
            shared_by: assignment.shared_by ? DOMPurify.sanitize(assignment.shared_by) : undefined,
            notes: assignment.notes ? DOMPurify.sanitize(assignment.notes) : undefined,
          }))
        : undefined,
    };

    const newId = await vaultService.addPassword(cleanEntry);

    if (newId) {
      if (Array.isArray(cleanEntry.sharing) && cleanEntry.sharing.length > 0) {
        VaultSharingLinkService.setAssignmentsForEntry(newId as number, cleanEntry.sharing);
      } else {
        VaultSharingLinkService.clearAssignmentsForEntry(newId as number);
      }
    }

    if (attachments.length > 0 && newId) {
      toast.info(t("uploadingAttachments"));
      for (const file of attachments) {
        try {
          await vaultService.addAttachment(newId as number, file);
        } catch (error: unknown) {
          toast.error(`Failed to attach ${file.name}: ${getErrorMessage(error)}`);
        }
      }
    }

    loadPasswords();
  }, [loadPasswords, t]);

  const handleDeleteEntry = useCallback(async (id: number) => {
    try {
      console.log('[VaultContext] moveToTrash called with id:', id, typeof id);
      await vaultService.moveToTrash(id);
      toast.success(t("itemMovedToTrash"));
      loadPasswords();
    } catch (error: unknown) {
      console.error('[VaultContext] moveToTrash FAILED:', error);
      toast.error(`Trash failed: ${getErrorMessage(error)}`);
    }
  }, [loadPasswords, t]);

  const handleRestoreEntry = useCallback(async (id: number) => {
    try {
      await vaultService.restoreFromTrash(id);
      toast.success(t("itemRestored"));
      loadPasswords();
    } catch (error: unknown) {
      console.error('[VaultContext] restoreFromTrash FAILED:', error);
      toast.error(`Restore failed: ${getErrorMessage(error)}`);
    }
  }, [loadPasswords, t]);

  const handleEmptyTrash = useCallback(async () => {
    try {
      await vaultService.emptyTrash();
      toast.success(t("trashEmptied"));
      loadPasswords();
    } catch (error: unknown) {
      console.error('[VaultContext] emptyTrash FAILED:', error);
      toast.error(`Empty trash failed: ${getErrorMessage(error)}`);
    }
  }, [loadPasswords, t]);

  // ─── Clipboard ───
  const handleCopyItem = useCallback((id: number, pass: string) => {
    copy(id, pass);
    toast.success(t("copiedClipboard"));
  }, [copy, t]);

  // ─── PIN'ler (şifreli kaydetme) ───
  const saveSecretSettings = useCallback(async () => {
    try {
      await vaultService.saveSecurityPins(duressPin, killPin);
      toast.success(t("securitySettingsUpdated"));
    } catch (err) {
      console.error("Failed to save security pins:", err);
      toast.error("Failed to save security settings");
    }
  }, [duressPin, killPin, t]);

  // ─── Güvenlik (Watchtower) ───
  const watchtower = useMemo<WatchtowerData>(() => {
    let weakCount = 0;
    let reusedCount = 0;
    let oldCount = 0;
    let pwnedCount = 0;

    const seenPasswords = new Set<string>();
    const reusedSet = new Set<string>();

    passwords.forEach(p => {
      if (p.pass) {
        if (seenPasswords.has(p.pass)) reusedSet.add(p.pass);
        else seenPasswords.add(p.pass);
      }
    });

    const oneYearMs = 1000 * 60 * 60 * 24 * 365;
    let totalScore = 0;

    passwords.forEach(p => {
      let pwdScore = 100;

      const isWeak = !p.pass || p.pass.length < 8;
      const isReused = p.pass && reusedSet.has(p.pass);
      const isOld = p.updated_at && Date.now() - new Date(p.updated_at).getTime() > oneYearMs;
      const isPwned = (p.pwned_count || 0) > 0;

      if (isPwned) { pwnedCount++; pwdScore -= 50; }
      if (isWeak) { weakCount++; pwdScore -= 30; }
      if (isReused) { reusedCount++; pwdScore -= 20; }
      if (isOld) { oldCount++; pwdScore -= 10; }

      totalScore += Math.max(0, pwdScore);
    });

    const score = passwords.length > 0 ? Math.round(totalScore / passwords.length) : 100;

    return { weak: weakCount, reused: reusedCount, old: oldCount, pwned: pwnedCount, score };
  }, [passwords]);

  const handleScanPwned = useCallback(async () => {
    if (passwords.length === 0) return;
    if (!hibpEnabled) {
      toast.info(t('hibpEnableFirst'));
      return;
    }
    setIsPwnedScanning(true);
    setPwnedScanProgress(0);
    setHibpLastResult('idle');

    let hadUnknown = false;

    let scanned = 0;
    for (const p of passwords) {
      if (p.pass) {
        const pwnedCount = await breachChecker.checkPassword(p.pass);
        if (pwnedCount === null) {
          hadUnknown = true;
        } else if (pwnedCount > 0 && p.pwned_count !== pwnedCount) {
          await vaultService.addPassword({ ...p, pwned_count: pwnedCount });
        } else if (pwnedCount === 0 && p.pwned_count && p.pwned_count > 0) {
          await vaultService.addPassword({ ...p, pwned_count: 0 });
        }
        // HIBP API Rate Limit: 1 request per ~1500ms
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      scanned++;
      setPwnedScanProgress(Math.round((scanned / passwords.length) * 100));
    }

    loadPasswords();
    setIsPwnedScanning(false);
    if (hadUnknown) {
      setHibpLastResult('unknown');
      toast.info(t('hibpResultUnknown'));
    } else {
      setHibpLastResult('ok');
      toast.success(t("watchtowerPwnedScanCompleted"));
    }
  }, [passwords, loadPasswords, t, hibpEnabled]);

  const uniqueTags = useMemo(() => {
    const set = new Set<string>();
    passwords.forEach(p => p.tags?.forEach(tg => set.add(tg)));
    return Array.from(set);
  }, [passwords]);

  // ─── Kilitleme ───
  const handleLock = useCallback(() => {
    vaultService.lock();
    extensionBridge.lockAndDisconnect();

    setPasswords(prev => {
      prev.forEach(p => (p.pass = "SANITIZE_OVERWRITE"));
      return [];
    });
    setVisiblePasswords(new Set());

    if (currentExtensionNonce) {
      window.postMessage({ type: "AEGIS_LOCK_VAULT", nonce: currentExtensionNonce }, getSafePostMessageTarget());
      currentExtensionNonce = null;
    }

    // Direkt background'a da kilit mesajı gönder
    try {
      const runtimeApi = getRuntimeApi();
      if (runtimeApi && typeof runtimeApi.sendMessage === 'function') {
        const extId =
          (import.meta.env as ImportMetaEnvWithExtensionId).VITE_AEGIS_EXTENSION_ID;
        if (extId) {
          runtimeApi.sendMessage(extId, { type: 'LOCK_VAULT' }, () => {
            void runtimeApi.lastError;
          });
        }
      }
    } catch {
      // Chrome runtime her ortamda mevcut olmayabilir
    }

    try {
      const electronApi = getElectronApi();
      if (electronApi?.syncVaultState) {
        electronApi.syncVaultState({ unlocked: false, entryCount: 0 });
      }
      if (electronApi?.setDomainCredentialProvider) {
        electronApi.setDomainCredentialProvider(null);
      }
      if (electronApi?.setDomainPasskeyProvider) {
        electronApi.setDomainPasskeyProvider(null);
      }
      if (electronApi?.setVaultCliHandler) {
        electronApi.setVaultCliHandler(null);
      }
      if (electronApi?.lockVault) electronApi.lockVault();
    } catch {
      // Electron bridge bu ortamda mevcut olmayabilir
    }

    onLock();
  }, [getElectronApi, getRuntimeApi, onLock]);

  // Ref güncelle — auto-lock timer için
  useEffect(() => {
    handleLockRef.current = handleLock;
  }, [handleLock]);

  // ─── Yardımcı ───
  // getCategoryIcon is imported from a shared utility — kept as identity here
  // Actual icon rendering is in the consumer components
  const getCategoryIcon = useCallback((_cat: string): React.ReactNode => null, []);

  const value: VaultContextType = {
    passwords,
    isDecrypting,
    searchQuery,
    setSearchQuery,
    searchScope,
    setSearchScope,
    viewDensity,
    setViewDensity,
    sortOption,
    setSortOption,
    categoryFilter,
    setCategoryFilter,
    visiblePasswords,
    toggleVisibility,
    visibleCount,
    setVisibleCount,
    loadPasswords,
    handleCreateEntry,
    handleDeleteEntry,
    handleRestoreEntry,
    handleEmptyTrash,
    copiedId,
    handleCopyItem,
    timeLeft,
    timeoutSeconds,
    watchtower,
    isPwnedScanning,
    pwnedScanProgress,
    hibpEnabled,
    setHibpEnabled,
    hibpLastResult,
    handleScanPwned,
    uniqueTags,
    duressPin,
    setDuressPin,
    killPin,
    setKillPin,
    saveSecretSettings,
    autoLockTime,
    setAutoLockTime,
    securityModeProfile,
    handleLock,
    secretKey,
    getCategoryIcon,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

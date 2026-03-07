import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from "react";
import { vaultService, type VaultEntry } from "../vaultService";
import { useClipboard } from "../hooks/useClipboard";
import { extensionBridge } from "../lib/ExtensionBridge";
import { HIBPService } from "../lib/HIBPService";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import DOMPurify from "dompurify";

// Güvenli eklenti haberleşmesi için oturum nonce'u (P0-2)
let currentExtensionNonce: string | null = null;

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
  handleLock: () => void;
  secretKey?: string;

  // Yardımcı
  getCategoryIcon: (cat: string) => React.ReactNode;
}

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

  // Core State
  const [passwords, setPasswords] = useState<VaultEntry[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
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

  // Auto-Lock (Persist in localStorage)
  const [autoLockTime, setAutoLockTime] = useState<number>(() => {
    const saved = localStorage.getItem('aegis_auto_lock_time');
    return saved ? parseInt(saved, 10) : 2;
  });

  useEffect(() => {
    localStorage.setItem('aegis_auto_lock_time', autoLockTime.toString());
  }, [autoLockTime]);

  // Ref for handleLock (avoids stale closure in auto-lock timer)
  const handleLockRef = useRef<() => void>(() => {});

  // ─── 300ms Debounce Search ───
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ─── Veri Yükleme ───
  const loadPasswords = useCallback(() => {
    setIsDecrypting(true);
    const isTrash = categoryFilter === "Trash";
    vaultService.getPasswords(debouncedSearch, categoryFilter, isTrash).then(data => {
      setTimeout(() => {
        setPasswords(data);
        setVisibleCount(20);
        setIsDecrypting(false);
      }, 900);
    });

    // 🔒 Şifrelenmiş PIN'leri yükle
    vaultService.getSecurityPins().then(pins => {
      setDuressPin(pins.duressPin);
      setKillPin(pins.killPin);
    }).catch(() => {});
  }, [debouncedSearch, categoryFilter]);

  // İlk yükleme + filtre/arama değişikliği
  useEffect(() => {
    loadPasswords();
  }, [loadPasswords]);

  // Auto-lock zamanlayıcısı (useRef ile stale closure önlenir)
  useEffect(() => {
    if (autoLockTime <= 0) return;
    let timer: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        handleLockRef.current();
        toast.info(t("autoLocked"));
      }, autoLockTime * 60 * 1000);
    };
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [autoLockTime, t]);

  // Extension senkronizasyonu
  useEffect(() => {
    const syncToExtension = () => {
      if (passwords.length === 0) return;
      const payload = passwords.map(p => ({
        title: p.title,
        username: p.username,
        pass: p.pass,
        website: p.website,
      }));

      if (currentExtensionNonce) {
        window.postMessage({ type: "AEGIS_SYNC_VAULT", payload, nonce: currentExtensionNonce }, window.location.origin);
        // Sadece bir kez kullanılabilir, yeni nonce gelene kadar bekletir
        currentExtensionNonce = null; 
      }

      try {
        const electronApi = (window as any).aegisElectron;
        if (electronApi?.syncVault) {
          electronApi.syncVault(payload);
        }
      } catch (e) {}
    };

    syncToExtension();
    const periodicSyncId = setInterval(syncToExtension, 30000);
    return () => clearInterval(periodicSyncId);
  }, [passwords]);

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
    };

    const newId = await vaultService.addPassword(cleanEntry);

    if (attachments.length > 0 && newId) {
      toast.info(t("uploadingAttachments"));
      for (const file of attachments) {
        try {
          await vaultService.addAttachment(newId as number, file);
        } catch (err: any) {
          toast.error(`Failed to attach ${file.name}: ${err.message}`);
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
    } catch (err: any) {
      console.error('[VaultContext] moveToTrash FAILED:', err);
      toast.error(`Trash failed: ${err.message}`);
    }
  }, [loadPasswords, t]);

  const handleRestoreEntry = useCallback(async (id: number) => {
    try {
      await vaultService.restoreFromTrash(id);
      toast.success(t("itemRestored"));
      loadPasswords();
    } catch (err: any) {
      console.error('[VaultContext] restoreFromTrash FAILED:', err);
      toast.error(`Restore failed: ${err.message}`);
    }
  }, [loadPasswords, t]);

  const handleEmptyTrash = useCallback(async () => {
    try {
      await vaultService.emptyTrash();
      toast.success(t("trashEmptied"));
      loadPasswords();
    } catch (err: any) {
      console.error('[VaultContext] emptyTrash FAILED:', err);
      toast.error(`Empty trash failed: ${err.message}`);
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
    const weak = passwords.filter(p => !p.pass || p.pass.length < 8).length;

    const reusedPasswords = new Set<string>();
    const seen = new Set<string>();
    passwords.forEach(p => {
      if (p.pass) {
        if (seen.has(p.pass)) reusedPasswords.add(p.pass);
        else seen.add(p.pass);
      }
    });
    const reused = passwords.filter(p => p.pass && reusedPasswords.has(p.pass)).length;

    const oneYearMs = 1000 * 60 * 60 * 24 * 365;
    const old = passwords.filter(
      p => p.updated_at && Date.now() - new Date(p.updated_at).getTime() > oneYearMs
    ).length;

    const pwned = passwords.filter(p => (p.pwned_count || 0) > 0).length;

    const totalIssues = weak + reused * 0.5 + old * 0.2 + pwned * 2;
    const score =
      passwords.length > 0
        ? Math.max(0, Math.round(((passwords.length - totalIssues) / passwords.length) * 100))
        : 100;

    return { weak, reused, old, pwned, score };
  }, [passwords]);

  const handleScanPwned = useCallback(async () => {
    if (passwords.length === 0) return;
    setIsPwnedScanning(true);
    setPwnedScanProgress(0);

    let scanned = 0;
    for (const p of passwords) {
      if (p.pass) {
        const pwnedCount = await HIBPService.checkPassword(p.pass);
        if (pwnedCount > 0 && p.pwned_count !== pwnedCount) {
          await vaultService.addPassword({ ...p, pwned_count: pwnedCount });
        }
        // HIBP API Rate Limit: 1 request per ~1500ms
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      scanned++;
      setPwnedScanProgress(Math.round((scanned / passwords.length) * 100));
    }

    loadPasswords();
    setIsPwnedScanning(false);
    toast.success(t("watchtowerPwnedScanCompleted"));
  }, [passwords, loadPasswords, t]);

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
      window.postMessage({ type: "AEGIS_LOCK_VAULT", nonce: currentExtensionNonce }, window.location.origin);
      currentExtensionNonce = null;
    }

    try {
      const electronApi = (window as any).aegisElectron;
      if (electronApi?.lockVault) electronApi.lockVault();
    } catch (e) {}

    onLock();
  }, [onLock]);

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
    handleScanPwned,
    uniqueTags,
    duressPin,
    setDuressPin,
    killPin,
    setKillPin,
    saveSecretSettings,
    autoLockTime,
    setAutoLockTime,
    handleLock,
    secretKey,
    getCategoryIcon,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

/* eslint-disable react-refresh/only-export-components */
// @ts-nocheck

/**
 * VaultContext — Orchestrator Provider
 *
 * Refactored: 5 Nisan 2026
 * Önceki: ~1089 satır god component
 * Sonrası: İnce orchestrator + 3 özel hook
 *
 * Hook'lar:
 *   useVaultData     → CRUD + filtre + sort + yükleme
 *   useVaultSecurity → Watchtower + HIBP + PIN
 *   useVaultSession  → Oturum + auto-lock + clipboard + lock
 *
 * Extension sync + CLI handler bu dosyada kalıyor (passwords
 * bağımlılığı nedeniyle useEffect içinde).
 */
import { createContext, useContext, useEffect, useCallback, type ReactNode } from 'react';
import { type VaultEntry } from '../vaultService';
import { SecureAppSettings } from '../lib/SecureAppSettings';
import { SecurityModePolicy } from '../lib/SecurityModePolicy';
import { useTranslation } from 'react-i18next';

// ─── Hook Imports ────────────────────────────────────────────────
import { useVaultData } from '../hooks/useVaultData';
import { useVaultSecurity, type WatchtowerData } from '../hooks/useVaultSecurity';
import { useVaultSession } from '../hooks/useVaultSession';
import { useVaultExtension } from '../hooks/useVaultExtension';

// ─── Türler ──────────────────────────────────────────────────────

export type { WatchtowerData };
import type { SecurityModeProfile } from '../lib/SecureAppSettings';

export interface VaultContextType {
  // Veri
  passwords: VaultEntry[];
  isDecrypting: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchScope: 'all' | 'title' | 'username' | 'tags';
  setSearchScope: (s: 'all' | 'title' | 'username' | 'tags') => void;
  viewDensity: 'comfortable' | 'compact';
  setViewDensity: (d: 'comfortable' | 'compact') => void;
  sortOption: 'updated_desc' | 'updated_asc' | 'title_asc' | 'title_desc';
  setSortOption: (s: 'updated_desc' | 'updated_asc' | 'title_asc' | 'title_desc') => void;
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
  setClipboardClearSeconds: (seconds: number) => void;

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

  // Yardımcı
  getCategoryIcon: (cat: string) => React.ReactNode;
}

// ─── Context ─────────────────────────────────────────────────────

const VaultContext = createContext<VaultContextType | null>(null);

export function useVault(): VaultContextType {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error('useVault must be used within VaultProvider');
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────

interface VaultProviderProps {
  children: ReactNode;
  onLock: () => void;
}

export function VaultProvider({ children, onLock }: VaultProviderProps) {
  const { t } = useTranslation();

  // ─── Hook Composition ─────────────────────────────────────────
  const vaultData = useVaultData();
  const {
    passwords,
    setPasswords,
    passwordsRef,
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
    setVisiblePasswords,
    toggleVisibility,
    visibleCount,
    setVisibleCount,
    uniqueTags,
    loadPasswords,
    handleCreateEntry,
    handleDeleteEntry,
    handleRestoreEntry,
    handleEmptyTrash,
  } = vaultData;

  const security = useVaultSecurity(passwords, passwordsRef, loadPasswords);
  const {
    duressPin,
    setDuressPin,
    killPin,
    setKillPin,
    saveSecretSettings,
    loadSecurityPins,
    watchtower,
    isPwnedScanning,
    pwnedScanProgress,
    hibpEnabled,
    setHibpEnabled,
    hibpLastResult,
    handleScanPwned,
    securityModeProfile,
    setSecurityModeProfile,
  } = security;

  const session = useVaultSession(securityModeProfile, setPasswords, setVisiblePasswords, onLock);
  const {
    autoLockTime,
    setAutoLockTime,
    copiedId,
    handleCopyItem,
    timeLeft,
    timeoutSeconds,
    setClipboardClearSeconds,
    handleLock,
    getElectronApi,
  } = session;

  // ─── Başlatma ─────────────────────────────────────────────────
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
      }

      const currentAutoLock = SecureAppSettings.getAutoLockTime();
      const enforcedAutoLock = SecurityModePolicy.enforceAutoLock(currentAutoLock, profile);
      if (enforcedAutoLock !== currentAutoLock) {
        SecureAppSettings.setAutoLockTime(enforcedAutoLock);
      }
    });
  }, [setSecurityModeProfile, setViewDensity]);

  // ─── Şifreli PIN Yükleme (passwords değişince) ──────────────
  useEffect(() => {
    if (passwords.length > 0) {
      loadSecurityPins();
    }
  }, [passwords.length, loadSecurityPins]);

  // ─── Extension Senkronizasyonu (izole hook) ────────────────────
  useVaultExtension({ passwords, loadPasswords, getElectronApi });

  // ─── Yardımcı ─────────────────────────────────────────────────
  const getCategoryIcon = useCallback((_cat: string): React.ReactNode => null, []);

  // ─── Context Value ────────────────────────────────────────────
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
    setClipboardClearSeconds,
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
    getCategoryIcon,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

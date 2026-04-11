/**
 * useVaultSession — Oturum Yönetimi + Auto-Lock Hook'u
 *
 * VaultContext'ten ayrıştırılan oturum hook'u.
 * Auto-lock zamanlayıcı, kilitleme, güvenlik modu ayarları.
 */
// @ts-nocheck

import { useState, useEffect, useCallback, useRef } from 'react';
import { vaultService, type VaultEntry } from '../vaultService';
import { extensionBridge } from '../lib/ExtensionBridge';
import { SecureAppSettings } from '../lib/SecureAppSettings';
import { SecurityModePolicy } from '../lib/SecurityModePolicy';
import { useClipboard } from './useClipboard';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import type { SecurityModeProfile } from '../lib/SecureAppSettings';

// Güvenli eklenti haberleşmesi nonce'u
let currentExtensionNonce: string | null = null;

const getSafePostMessageTarget = () => {
  if (typeof window === 'undefined') return '*';
  const origin = window.location.origin;
  if (!origin || origin === 'null' || origin.startsWith('file:')) {
    return '*';
  }
  return origin;
};

if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'AEGIS_EXTENSION_READY' || event.data?.type === 'AEGIS_NONCE_UPDATE') {
      if (event.data.nonce) {
        currentExtensionNonce = event.data.nonce;
      }
    }
  });
}

// ─── Electron Bridge Type Tanımları ─────────────────────────────
type ElectronVaultState = {
  unlocked: boolean;
  entryCount: number;
};

type ElectronBridgeApi = {
  syncVaultState?: (state: ElectronVaultState) => void;
  setDomainCredentialProvider?: (provider: (() => unknown) | null) => void;
  setDomainPasskeyProvider?: (provider: (() => unknown) | null) => void;
  setVaultCliHandler?: (handler: (() => unknown) | null) => void;
  lockVault?: () => void;
};

type RuntimeApi = {
  sendMessage?: (extensionId: string, message: { type: string }, callback?: () => void) => void;
  lastError?: unknown;
};

type WindowWithAegisElectron = Window &
  typeof globalThis & {
    aegisElectron?: ElectronBridgeApi;
    chrome?: {
      runtime?: RuntimeApi;
    };
  };

type ImportMetaEnvWithExtensionId = ImportMetaEnv & {
  VITE_AEGIS_EXTENSION_ID?: string;
};

export function useVaultSession(
  securityModeProfile: SecurityModeProfile,
  setPasswords: React.Dispatch<React.SetStateAction<VaultEntry[]>>,
  setVisiblePasswords: React.Dispatch<React.SetStateAction<Set<number>>>,
  onLock: () => void
) {
  const { t } = useTranslation();

  // ─── Electron API Helpers ───
  const getElectronApi = useCallback(
    (): ElectronBridgeApi | undefined => (window as WindowWithAegisElectron).aegisElectron,
    []
  );
  const getRuntimeApi = useCallback(
    (): RuntimeApi | undefined => (window as WindowWithAegisElectron).chrome?.runtime,
    []
  );

  // ─── Auto-Lock ───
  const [autoLockTime, setAutoLockTimeState] = useState<number>(() => {
    return SecurityModePolicy.enforceAutoLock(
      SecureAppSettings.getAutoLockTime(),
      SecureAppSettings.getSecurityModeProfile()
    );
  });

  useEffect(() => {
    SecureAppSettings.setAutoLockTime(autoLockTime);
  }, [autoLockTime]);

  const setAutoLockTime = useCallback(
    (value: number) => {
      const enforced = SecurityModePolicy.enforceAutoLock(value, securityModeProfile);
      if (enforced !== value) {
        toast.info(t('securityModeAutoLockAdjusted', { minutes: enforced }));
      }
      setAutoLockTimeState(enforced);
      SecureAppSettings.setAutoLockTime(enforced);
    },
    [securityModeProfile, t]
  );

  // ─── Clipboard ───
  const [clipboardClearSeconds, setClipboardClearSecondsState] = useState<number>(() => {
    return SecureAppSettings.getClipboardClearSeconds();
  });
  const { copiedId, copy, timeLeft, timeoutSeconds } = useClipboard(clipboardClearSeconds);

  const setClipboardClearSeconds = useCallback((value: number) => {
    const clamped = Math.min(300, Math.max(5, Math.round(value)));
    setClipboardClearSecondsState(clamped);
    SecureAppSettings.setClipboardClearSeconds(clamped);
  }, []);

  const handleCopyItem = useCallback(
    (id: number, pass: string) => {
      copy(id, pass);
      toast.success(t('copiedClipboard'));
    },
    [copy, t]
  );

  // ─── Lock Ref ───
  const handleLockRef = useRef<() => void>(() => {});

  // ─── Kilitleme ───
  const handleLock = useCallback(() => {
    vaultService.lock();
    extensionBridge.lockAndDisconnect();

    setPasswords((prev) => {
      prev.forEach((p) => (p.pass = 'SANITIZE_OVERWRITE'));
      return [];
    });
    setVisiblePasswords(new Set());

    if (currentExtensionNonce) {
      window.postMessage(
        { type: 'AEGIS_LOCK_VAULT', nonce: currentExtensionNonce },
        getSafePostMessageTarget()
      );
      currentExtensionNonce = null;
    }

    // Direkt background'a kilit mesajı gönder
    try {
      const runtimeApi = getRuntimeApi();
      if (runtimeApi && typeof runtimeApi.sendMessage === 'function') {
        const extId = (import.meta.env as ImportMetaEnvWithExtensionId).VITE_AEGIS_EXTENSION_ID;
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
  }, [getElectronApi, getRuntimeApi, onLock, setPasswords, setVisiblePasswords]);

  // Ref güncelle — auto-lock timer için
  useEffect(() => {
    handleLockRef.current = handleLock;
  }, [handleLock]);

  return {
    // Auto-Lock
    autoLockTime,
    setAutoLockTime,
    // Clipboard
    copiedId,
    handleCopyItem,
    timeLeft,
    timeoutSeconds,
    setClipboardClearSeconds,
    // Lock
    handleLock,
    handleLockRef,
    // Electron
    getElectronApi,
    getRuntimeApi,
  };
}

/**
 * useVaultSecurity — Güvenlik & Watchtower Hook'u
 *
 * VaultContext'ten ayrıştırılan güvenlik hook'u.
 * Watchtower hesaplama, HIBP tarama, PIN yönetimi.
 */
import { useState, useCallback, useMemo, type MutableRefObject } from 'react';
import { vaultService, type VaultEntry } from '../vaultService';
import { breachChecker } from '../lib/breach-check';
import { SecureAppSettings } from '../lib/SecureAppSettings';
import { SecurityModePolicy } from '../lib/SecurityModePolicy';
import { AliasProviderService } from '../lib/AliasProviderService';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import type { SecurityModeProfile } from '../lib/SecureAppSettings';

export interface WatchtowerData {
  weak: number;
  reused: number;
  old: number;
  pwned: number;
  aliasCompromised: number;
  aliasNeedsRotation: number;
  aliasAtRisk: number;
  score: number;
}

const isUsableWatchtowerPassword = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  !value.toUpperCase().includes('DECRYPT_ERROR') &&
  value !== 'SANITIZE_OVERWRITE';

export function useVaultSecurity(
  passwords: VaultEntry[],
  passwordsRef: MutableRefObject<VaultEntry[]>,
  loadPasswords: () => void
) {
  const { t } = useTranslation();

  // ─── PIN State ───
  const [duressPin, setDuressPin] = useState('');
  const [killPin, setKillPin] = useState('');

  // ─── HIBP State ───
  const [isPwnedScanning, setIsPwnedScanning] = useState(false);
  const [pwnedScanProgress, setPwnedScanProgress] = useState(0);
  const [hibpEnabled, setHibpEnabledState] = useState<boolean>(() => {
    return SecureAppSettings.getHibpEnabled();
  });
  const [hibpLastResult, setHibpLastResult] = useState<'idle' | 'ok' | 'unknown'>('idle');
  const [securityModeProfile, setSecurityModeProfile] = useState<SecurityModeProfile>(() => {
    return SecureAppSettings.getSecurityModeProfile();
  });

  const setHibpEnabled = useCallback(
    (enabled: boolean) => {
      if (enabled && !SecurityModePolicy.isHibpAllowed(securityModeProfile)) {
        toast.info(t('securityModeHibpBlocked'));
        setHibpEnabledState(false);
        SecureAppSettings.setHibpEnabled(false);
        return;
      }
      setHibpEnabledState(enabled);
      SecureAppSettings.setHibpEnabled(enabled);
    },
    [securityModeProfile, t]
  );

  // ─── PIN'ler (şifreli kaydetme) ───
  const saveSecretSettings = useCallback(async () => {
    try {
      await vaultService.saveSecurityPins(duressPin, killPin);
      toast.success(t('securitySettingsUpdated'));
    } catch (err) {
      console.error('Failed to save security pins:', err);
      toast.error('Failed to save security settings');
    }
  }, [duressPin, killPin, t]);

  // ─── PIN Yükleme (loadPasswords sonrası çağrılmalı) ───
  const loadSecurityPins = useCallback(() => {
    vaultService
      .getSecurityPins()
      .then((pins) => {
        setDuressPin(pins.duressPin);
        setKillPin(pins.killPin);
      })
      .catch(() => {});
  }, []);

  // ─── Watchtower Hesaplama ───
  const watchtower = useMemo<WatchtowerData>(() => {
    let weakCount = 0;
    let reusedCount = 0;
    let oldCount = 0;
    let pwnedCount = 0;
    let aliasCompromisedCount = 0;
    let aliasRotationCount = 0;
    let aliasAtRiskCount = 0;

    const seenPasswords = new Set<string>();
    const reusedSet = new Set<string>();

    passwords.forEach((p) => {
      if (isUsableWatchtowerPassword(p.pass)) {
        if (seenPasswords.has(p.pass)) reusedSet.add(p.pass);
        else seenPasswords.add(p.pass);
      }
    });

    const oneYearMs = 1000 * 60 * 60 * 24 * 365;
    let totalScore = 0;

    passwords.forEach((p) => {
      let pwdScore = 100;

      const usablePassword = isUsableWatchtowerPassword(p.pass) ? p.pass : '';
      const isWeak = usablePassword.length > 0 && usablePassword.length < 8;
      const isReused = usablePassword && reusedSet.has(usablePassword);
      const isOld = p.updated_at && Date.now() - new Date(p.updated_at).getTime() > oneYearMs;
      const isPwned = (p.pwned_count || 0) > 0;
      const aliasRisk = p.aliasDetails
        ? AliasProviderService.evaluateAliasRisk(p.aliasDetails)
        : null;
      const hasCompromisedAlias = p.aliasDetails?.status === 'compromised';
      const aliasNeedsRotation = Boolean(aliasRisk?.needsRotation);
      const aliasAtRisk = Boolean(aliasRisk && aliasRisk.score < 75);

      if (isPwned) {
        pwnedCount++;
        pwdScore -= 50;
      }
      if (isWeak) {
        weakCount++;
        pwdScore -= 30;
      }
      if (isReused) {
        reusedCount++;
        pwdScore -= 20;
      }
      if (isOld) {
        oldCount++;
        pwdScore -= 10;
      }
      if (hasCompromisedAlias) {
        aliasCompromisedCount++;
        pwdScore -= 25;
      }
      if (aliasNeedsRotation) {
        aliasRotationCount++;
        pwdScore -= 12;
      }
      if (aliasAtRisk) {
        aliasAtRiskCount++;
        pwdScore -= 8;
      }

      totalScore += Math.max(0, pwdScore);
    });

    const score = passwords.length > 0 ? Math.round(totalScore / passwords.length) : 100;

    return {
      weak: weakCount,
      reused: reusedCount,
      old: oldCount,
      pwned: pwnedCount,
      aliasCompromised: aliasCompromisedCount,
      aliasNeedsRotation: aliasRotationCount,
      aliasAtRisk: aliasAtRiskCount,
      score,
    };
  }, [passwords]);

  // ─── HIBP Tarama ───
  const handleScanPwned = useCallback(async () => {
    const currentPasswords = passwordsRef.current;
    if (currentPasswords.length === 0) return;
    if (!hibpEnabled) {
      toast.info(t('hibpEnableFirst'));
      return;
    }
    setIsPwnedScanning(true);
    setPwnedScanProgress(0);
    setHibpLastResult('idle');

    let hadUnknown = false;
    const passwordsWithSecret = currentPasswords.filter((item) =>
      isUsableWatchtowerPassword(item.pass)
    );
    const uniqueSecrets = Array.from(
      new Set(passwordsWithSecret.map((item) => String(item.pass || '')))
    );
    const batchResults = await breachChecker.checkPasswordsBatch(uniqueSecrets);

    let scanned = 0;
    for (const p of currentPasswords) {
      if (p.pass) {
        const pwnedCount = batchResults.get(p.pass) ?? null;
        if (pwnedCount === null) {
          hadUnknown = true;
        } else if (pwnedCount > 0 && p.pwned_count !== pwnedCount) {
          await vaultService.addPassword({ ...p, pwned_count: pwnedCount });
        } else if (pwnedCount === 0 && p.pwned_count && p.pwned_count > 0) {
          await vaultService.addPassword({ ...p, pwned_count: 0 });
        }
      }
      scanned++;
      setPwnedScanProgress(Math.round((scanned / currentPasswords.length) * 100));
    }

    loadPasswords();
    setIsPwnedScanning(false);
    if (hadUnknown) {
      setHibpLastResult('unknown');
      toast.info(t('hibpResultUnknown'));
    } else {
      setHibpLastResult('ok');
      toast.success(t('watchtowerPwnedScanCompleted'));
    }
  }, [passwordsRef, loadPasswords, t, hibpEnabled]);

  return {
    // PIN
    duressPin,
    setDuressPin,
    killPin,
    setKillPin,
    saveSecretSettings,
    loadSecurityPins,
    // Watchtower
    watchtower,
    // HIBP
    isPwnedScanning,
    pwnedScanProgress,
    hibpEnabled,
    setHibpEnabled,
    hibpLastResult,
    handleScanPwned,
    // Security Mode
    securityModeProfile,
    setSecurityModeProfile,
  };
}

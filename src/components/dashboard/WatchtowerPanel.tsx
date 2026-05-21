import {
  ShieldAlert,
  AlertTriangle,
  KeyRound,
  Clock4,
  Globe,
  AtSign,
  RefreshCw,
} from 'lucide-react';
import { GlowCard } from '../ui/GlowCard';
import { useVault } from '../../contexts/VaultContext';
import { useTranslation } from 'react-i18next';

/**
 * WatchtowerPanel — Güvenlik denetimi widget'ı (sağ sidebar).
 * Zayıf, tekrarlanan, eski ve sızdırılmış şifre sayılarını gösterir.
 * HIBP (Have I Been Pwned) tarama butonunu içerir.
 */
export function WatchtowerPanel() {
  const { t } = useTranslation();
  const {
    watchtower,
    categoryFilter,
    setCategoryFilter,
    isPwnedScanning,
    pwnedScanProgress,
    handleScanPwned,
    passwords,
    hibpEnabled,
    setHibpEnabled,
    hibpLastResult,
    securityModeProfile,
  } = useVault();
  const hibpPolicyLocked = securityModeProfile === 'maximum';
  const totalFindings =
    watchtower.weak +
    watchtower.reused +
    watchtower.old +
    watchtower.pwned +
    watchtower.aliasAtRisk +
    watchtower.aliasNeedsRotation;
  const toggleWatchtowerFilter = (filter: string) => {
    setCategoryFilter(categoryFilter === filter ? '' : filter);
  };
  const isActiveFilter = (filter: string) => categoryFilter === filter;

  return (
    <GlowCard className="watchtower-surface v5-rail-card v5-watchtower-card rounded-[var(--radius)] p-5 relative">
      <div className="v5-rail-heading mb-3">
        <div className="flex min-w-0 items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          <h3 className="truncate text-sm font-semibold uppercase tracking-widest">
            {t('watchtowerTitle')}
          </h3>
        </div>
        <span
          className={`v5-rail-status-chip ${
            totalFindings > 0 ? 'v5-rail-status-chip-warning' : 'v5-rail-status-chip-safe'
          }`}
        >
          {totalFindings > 0
            ? t('watchtowerSummaryIssues', { count: totalFindings })
            : t('watchtowerSummaryClean')}
        </span>
      </div>

      <div className="v5-watchtower-list flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => toggleWatchtowerFilter('__watchtower:weak')}
          aria-pressed={isActiveFilter('__watchtower:weak')}
          className="watchtower-item v5-watchtower-item flex justify-between items-center px-3 py-2.5 rounded-xl text-left"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle
              className={`w-4 h-4 ${watchtower.weak > 0 ? 'text-red-500' : 'text-[var(--color-sage-green)]'}`}
            />
            <span className="text-sm font-semibold">{t('weakPasswords')}</span>
          </div>
          <span
            className={`v5-watchtower-value font-bold ${watchtower.weak > 0 ? 'text-red-500' : 'text-black/50'}`}
          >
            {watchtower.weak}
          </span>
        </button>

        <button
          type="button"
          onClick={() => toggleWatchtowerFilter('__watchtower:reused')}
          aria-pressed={isActiveFilter('__watchtower:reused')}
          className="watchtower-item v5-watchtower-item flex justify-between items-center px-3 py-2.5 rounded-xl text-left"
        >
          <div className="flex items-center gap-2">
            <KeyRound
              className={`w-4 h-4 ${watchtower.reused > 0 ? 'text-amber-500' : 'text-[var(--color-sage-green)]'}`}
            />
            <span className="text-sm font-semibold">{t('reusedPasswords')}</span>
          </div>
          <span
            className={`v5-watchtower-value font-bold ${watchtower.reused > 0 ? 'text-amber-500' : 'text-black/50'}`}
          >
            {watchtower.reused}
          </span>
        </button>

        <button
          type="button"
          onClick={() => toggleWatchtowerFilter('__watchtower:old')}
          aria-pressed={isActiveFilter('__watchtower:old')}
          className="watchtower-item v5-watchtower-item flex justify-between items-center px-3 py-2.5 rounded-xl text-left"
        >
          <div className="flex items-center gap-2">
            <Clock4
              className={`w-4 h-4 ${watchtower.old > 0 ? 'text-blue-500' : 'text-[var(--color-sage-green)]'}`}
            />
            <span className="text-sm font-semibold">{t('oldPasswords')}</span>
          </div>
          <span
            className={`v5-watchtower-value font-bold ${watchtower.old > 0 ? 'text-blue-500' : 'text-black/50'}`}
          >
            {watchtower.old}
          </span>
        </button>

        <button
          type="button"
          onClick={() => toggleWatchtowerFilter('__watchtower:pwned')}
          aria-pressed={isActiveFilter('__watchtower:pwned')}
          className="watchtower-item v5-watchtower-item flex justify-between items-center px-3 py-2.5 rounded-xl text-left"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert
              className={`w-4 h-4 ${watchtower.pwned > 0 ? 'text-red-500' : 'text-[var(--color-sage-green)]'}`}
            />
            <span className="text-sm font-semibold">{t('pwnedPasswords')}</span>
          </div>
          <span
            className={`v5-watchtower-value font-bold ${watchtower.pwned > 0 ? 'text-red-500' : 'text-black/50'}`}
          >
            {watchtower.pwned}
          </span>
        </button>

        <button
          type="button"
          onClick={() => toggleWatchtowerFilter('__watchtower:alias-risk')}
          aria-pressed={isActiveFilter('__watchtower:alias-risk')}
          className="watchtower-item v5-watchtower-item flex justify-between items-center px-3 py-2.5 rounded-xl text-left"
        >
          <div className="flex items-center gap-2">
            <AtSign
              className={`w-4 h-4 ${watchtower.aliasAtRisk > 0 ? 'text-amber-500' : 'text-[var(--color-sage-green)]'}`}
            />
            <span className="text-sm font-semibold">{t('watchtowerAliasAtRisk')}</span>
          </div>
          <span
            className={`v5-watchtower-value font-bold ${watchtower.aliasAtRisk > 0 ? 'text-amber-500' : 'text-black/50'}`}
          >
            {watchtower.aliasAtRisk}
          </span>
        </button>

        <button
          type="button"
          onClick={() => toggleWatchtowerFilter('__watchtower:alias-rotation')}
          aria-pressed={isActiveFilter('__watchtower:alias-rotation')}
          className="watchtower-item v5-watchtower-item flex justify-between items-center px-3 py-2.5 rounded-xl text-left"
        >
          <div className="flex items-center gap-2">
            <RefreshCw
              className={`w-4 h-4 ${watchtower.aliasNeedsRotation > 0 ? 'text-sky-500' : 'text-[var(--color-sage-green)]'}`}
            />
            <span className="text-sm font-semibold">{t('watchtowerAliasNeedsRotation')}</span>
          </div>
          <span
            className={`v5-watchtower-value font-bold ${watchtower.aliasNeedsRotation > 0 ? 'text-sky-500' : 'text-black/50'}`}
          >
            {watchtower.aliasNeedsRotation}
          </span>
        </button>
      </div>

      <button
        onClick={handleScanPwned}
        disabled={isPwnedScanning || passwords.length === 0 || !hibpEnabled || hibpPolicyLocked}
        className="v5-watchtower-scan-btn mt-4 w-full flex items-center justify-center gap-2 border py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all relative overflow-hidden disabled:opacity-50"
      >
        {isPwnedScanning ? (
          <>
            <div
              className="absolute left-0 top-0 bottom-0 bg-red-500/20 transition-all duration-300"
              style={{ width: `${pwnedScanProgress}%` }}
            />
            <span className="relative z-10 animate-pulse">
              {t('scanningProgress', { progress: pwnedScanProgress })}
            </span>
          </>
        ) : (
          <>
            <Globe className="w-4 h-4" /> {t('hibpScan')}
          </>
        )}
      </button>

      <label className="watchtower-status-box mt-3 flex items-center justify-between rounded-xl px-3 py-2 text-[11px] font-semibold">
        <span>{t('hibpPrivacyToggle')}</span>
        <input
          type="checkbox"
          checked={hibpEnabled}
          onChange={(e) => setHibpEnabled(e.target.checked)}
          disabled={hibpPolicyLocked}
          className="h-4 w-4 rounded border-gray-300 text-[var(--color-sage-green)] focus:ring-[var(--color-sage-green)]/40"
        />
      </label>

      {hibpPolicyLocked && (
        <div className="mt-2 rounded-xl border border-amber-300/40 bg-amber-50/60 px-3 py-2 text-[11px] font-medium text-amber-700">
          {t('securityModeProfileLockedHibpHint')}
        </div>
      )}

      {hibpLastResult === 'unknown' && (
        <div className="mt-2 rounded-xl border border-amber-300/40 bg-amber-50/60 px-3 py-2 text-[11px] font-medium text-amber-700">
          {t('hibpResultUnknown')}
        </div>
      )}
    </GlowCard>
  );
}

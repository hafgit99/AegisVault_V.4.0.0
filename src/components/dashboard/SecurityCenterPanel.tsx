import { AlertTriangle, CheckCircle2, ShieldCheck, Play, SkipForward, RotateCcw, History, Sparkles, Filter, ChevronRight, X, Eye, EyeOff } from 'lucide-react';
import { SecurityScoreGauge } from '../ui/SecurityScoreGauge';
import type {
  SecurityCenterSummary,
  SecurityCenterIssueType,
  SecurityCenterTriageItem,
} from '../../lib/SecurityCenterService';
import { useTranslation } from 'react-i18next';
import { useMemo, useState, useEffect } from 'react';
import type { SecurityCenterHistoryEvent } from '../../lib/SecureAppSettings';
import { useVault } from '../../contexts/VaultContext';
import { AliasProviderService } from '../../lib/AliasProviderService';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';
import { vaultService } from '../../vaultService';

interface SecurityCenterPanelProps {
  summary: SecurityCenterSummary;
  onReviewPasswords: () => void;
  onReviewPasskeys: () => void;
  onReviewSharing: () => void;
  onReviewAliases: () => void;
  onReviewDevices: () => void;
  onReviewLocalRisk: () => void;
  onOpenTriageItem: (item: SecurityCenterTriageItem) => void;
  onMarkReviewed: (item: SecurityCenterTriageItem) => void;
  onReopenReviewed: (item: SecurityCenterTriageItem) => void;
  historyItems: SecurityCenterHistoryEvent[];
}

export function SecurityCenterPanel({
  summary,
  onReviewPasswords,
  onReviewPasskeys,
  onReviewSharing,
  onReviewAliases,
  onReviewDevices,
  onReviewLocalRisk,
  onOpenTriageItem,
  onMarkReviewed,
  onReopenReviewed,
  historyItems,
}: SecurityCenterPanelProps) {
  const { t } = useTranslation();
  const [triageFilter, setTriageFilter] = useState<'all' | 'high' | 'medium'>('all');
  const [showReviewed, setShowReviewed] = useState(false);
  const [showAllTriage, setShowAllTriage] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const [isFixing, setIsFixing] = useState(false);
  const { passwords, loadPasswords } = useVault();
  const recentHistorySummary = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const windowStart = Date.now() - 1000 * 60 * 60 * 24 * 7;
    const recent = historyItems.filter((event) => {
      const eventAt = new Date(event.at).getTime();
      return !Number.isNaN(eventAt) && eventAt >= windowStart;
    });
    return {
      reviewed: recent.filter((event) => event.action === 'reviewed').length,
      reopened: recent.filter((event) => event.action === 'reopened').length,
      autoResolved: recent.filter((event) => event.action === 'auto_resolved').length,
    };
  }, [historyItems]);
  const recentIssueTypeSummary = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const windowStart = Date.now() - 1000 * 60 * 60 * 24 * 7;
    const counts = new Map<SecurityCenterIssueType, number>();
    historyItems.forEach((event) => {
      const eventAt = new Date(event.at).getTime();
      if (Number.isNaN(eventAt) || eventAt < windowStart) return;
      const issueType = event.issueType as SecurityCenterIssueType;
      counts.set(issueType, (counts.get(issueType) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4);
  }, [historyItems]);

  const handleAction = (actionKey: string) => {
    if (actionKey === 'securityCenterActionReviewPasskeys') {
      onReviewPasskeys();
      return;
    }
    if (actionKey === 'securityCenterActionReviewSharing') {
      onReviewSharing();
      return;
    }
    if (actionKey === 'securityCenterActionReviewAliases') {
      onReviewAliases();
      return;
    }
    if (actionKey === 'securityCenterActionReviewDevices') {
      onReviewDevices();
      return;
    }
    if (actionKey === 'securityCenterActionReviewLocalRisk') {
      onReviewLocalRisk();
      return;
    }
    onReviewPasswords();
  };

  const issueTypeLabel = (type: SecurityCenterIssueType) => {
    if (type === 'missing_second_factor') return t('securityCenterMetric2fa', 'Missing 2FA');
    if (type === 'passkey_ready') return t('securityCenterMetricPasskeys', 'Passkey ready');
    if (type === 'aging_credentials') return t('securityCenterMetricAging', 'Aging passwords');
    if (type === 'alias_exposure') return t('securityCenterMetricAliasExposure', 'Alias exposure');
    if (type === 'alias_rotation') return t('securityCenterMetricAliasRotation', 'Alias rotation');
    if (type === 'device_trust') return t('securityCenterMetricDeviceTrust', 'Device trust');
    if (type === 'local_risk_activity') return t('securityCenterMetricLocalRisk', 'Local risk');
    return t('securityCenterMetricSharing', 'Sharing gaps');
  };
  const issueActionLabel = (actionKey: string) => {
    if (actionKey === 'securityCenterActionReviewPasskeys') {
      return t('securityCenterActionReviewPasskeys', 'Review passkeys');
    }
    if (actionKey === 'securityCenterActionReviewSharing') {
      return t('securityCenterActionReviewSharing', 'Review sharing');
    }
    if (actionKey === 'securityCenterActionReviewAliases') {
      return t('securityCenterActionReviewAliases', 'Review aliases');
    }
    if (actionKey === 'securityCenterActionReviewDevices') {
      return t('securityCenterActionReviewDevices', 'Review devices');
    }
    if (actionKey === 'securityCenterActionReviewLocalRisk') {
      return t('securityCenterActionReviewLocalRisk', 'Review sync audit');
    }
    return t('securityCenterActionReviewPasswords', 'Review passwords');
  };

  const filteredTriageItems = useMemo(
    () =>
      triageFilter === 'all'
        ? summary.triageItems
        : summary.triageItems.filter((item) => item.severity === triageFilter),
    [summary.triageItems, triageFilter]
  );
  const visibleTriageItems = useMemo(
    () => (showAllTriage ? filteredTriageItems : filteredTriageItems.slice(0, 5)),
    [filteredTriageItems, showAllTriage]
  );
  const hiddenTriageCount = Math.max(filteredTriageItems.length - visibleTriageItems.length, 0);

  const currentFocusItem = filteredTriageItems[focusIndex];

  const handleAutoFix = async () => {
    if (!currentFocusItem || isFixing) return;

    if (
      currentFocusItem.issueType === 'alias_exposure' ||
      currentFocusItem.issueType === 'alias_rotation'
    ) {
      const entry = passwords.find((p) => p.id === currentFocusItem.itemId);
      if (!entry || !entry.aliasDetails) {
        toast.error(t('securityCenterTriageItemMissing'));
        return;
      }

      setIsFixing(true);
      try {
        const result = await AliasProviderService.performAutomatedRotation(
          entry.aliasDetails,
          vaultService,
          passwords
        );

        if (result.success) {
          toast.success(
            t('securityCenterAliasRotatedSuccess', {
              email: result.newEmail,
              defaultValue: `Alias rotated to ${result.newEmail}`,
            })
          );
          await loadPasswords();
          // After success, we can mark it as reviewed or just let the next summary update it
          onMarkReviewed(currentFocusItem);
          if (focusIndex < filteredTriageItems.length - 1) {
            setFocusIndex((prev) => prev + 1);
          } else {
            setIsFocusMode(false);
          }
        } else {
          toast.error(t('securityCenterAliasRotateFailed', { error: result.error }));
        }
      } catch (err) {
        toast.error(String(err));
      } finally {
        setIsFixing(false);
      }
    } else {
      // Fallback for non-auto-fixable items
      onOpenTriageItem(currentFocusItem);
    }
  };

  const handleNextFocus = () => {
    setFocusIndex((prev) => (prev + 1) % filteredTriageItems.length);
  };

  const handleMarkReviewedInFocus = (item: SecurityCenterTriageItem) => {
    onMarkReviewed(item);
    if (filteredTriageItems.length <= 1) {
      setIsFocusMode(false);
    } else {
      // Index will naturally move to next or stay valid as array shrinks
    }
  };

  return (
    <div className="settings-panel v5-security-center rounded-3xl p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="v5-security-center-icon flex h-11 w-11 items-center justify-center rounded-2xl">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="v5-section-kicker">
              {t('securityCenterScore', 'Security score')}
            </span>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-[var(--color-deep-navy)]">
              {t('securityCenterTitle', 'Security Center 2.0')}
            </h3>
          </div>
        </div>
        <div className="v5-security-center-status rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest">
          {summary.riskLevel === 'low'
            ? t('securityCenterRiskLow', 'Low risk')
            : summary.riskLevel === 'medium'
              ? t('securityCenterRiskMedium', 'Medium risk')
              : t('securityCenterRiskHigh', 'High risk')}
        </div>
      </div>

      <div className="settings-subpanel v5-security-center-hero rounded-2xl border p-5 shadow-inner">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <SecurityScoreGauge score={summary.score} onClick={onReviewPasswords} />
            <div className="space-y-1.5">
              <p className="settings-section-kicker">
                {t('securityCenterScore', 'Security score')}
              </p>
              <div className="settings-section-title">
                {summary.riskLevel === 'low'
                  ? t('securityCenterRiskLow', 'Low risk')
                  : summary.riskLevel === 'medium'
                    ? t('securityCenterRiskMedium', 'Medium risk')
                    : t('securityCenterRiskHigh', 'High risk')}
              </div>
              <p className="settings-section-copy max-w-md">
                {t(
                  'securityCenterDesc',
                  'Review missing second factors, passkey opportunities, aging credentials, and sensitive sharing gaps from one place.'
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[260px] xl:min-w-[340px]">
            <div className="settings-card-surface v5-security-metric rounded-2xl px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                {t('securityCenterMetric2fa', 'Missing 2FA')}
              </div>
              <div className="mt-2 text-lg font-bold text-red-500">
                {summary.metrics.missingSecondFactor}
              </div>
            </div>
            <div className="settings-card-surface v5-security-metric rounded-2xl px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                {t('securityCenterMetricPasskeys', 'Passkey ready')}
              </div>
              <div className="mt-2 text-lg font-bold text-amber-600">
                {summary.metrics.passkeyReady}
              </div>
            </div>
            <div className="settings-card-surface v5-security-metric rounded-2xl px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                {t('securityCenterMetricAging', 'Aging passwords')}
              </div>
              <div className="mt-2 text-lg font-bold text-blue-600">
                {summary.metrics.agingCredentials}
              </div>
            </div>
            <div className="settings-card-surface v5-security-metric rounded-2xl px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                {t('securityCenterMetricSharing', 'Sharing gaps')}
              </div>
              <div className="mt-2 text-lg font-bold text-red-500">
                {summary.metrics.sensitiveSharing}
              </div>
            </div>
            <div className="settings-card-surface v5-security-metric rounded-2xl px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                {t('securityCenterMetricAliasExposure', 'Alias exposure')}
              </div>
              <div className="mt-2 text-lg font-bold text-red-500">
                {summary.metrics.aliasExposure}
              </div>
            </div>
            <div className="settings-card-surface v5-security-metric rounded-2xl px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                {t('securityCenterMetricAliasRotation', 'Alias rotation')}
              </div>
              <div className="mt-2 text-lg font-bold text-sky-600">
                {summary.metrics.aliasRotation}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {summary.issues.length === 0 ? (
            <div className="settings-card-surface-muted rounded-2xl border border-dashed px-4 py-4 text-sm text-[var(--color-deep-navy)]/65">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-[var(--color-sage-green)]" />
                {t('securityCenterAllClear', 'No additional security center issue is open.')}
              </div>
            </div>
          ) : (
            summary.issues.map((issue) => (
              <div
                key={issue.type}
                className="settings-card-surface v5-security-issue rounded-2xl px-4 py-4"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className={`mt-0.5 h-4 w-4 ${
                        issue.severity === 'high' ? 'text-red-500' : 'text-amber-500'
                      }`}
                    />
                    <div>
                      <div className="text-sm font-semibold text-[var(--color-deep-navy)]">
                        {t(issue.messageKey, { count: issue.count })}
                      </div>
                      <div className="mt-1 text-[10px] font-bold uppercase tracking-widest opacity-50">
                        {issue.severity === 'high'
                          ? t('securityCenterSeverityHigh', 'High')
                          : t('securityCenterSeverityMedium', 'Medium')}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAction(issue.actionKey)}
                    className="settings-pill-secondary w-full rounded-xl px-4 py-2 text-xs font-bold active:scale-95 sm:w-auto"
                  >
                    {issueActionLabel(issue.actionKey)}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="settings-card-surface-muted v5-security-triage mt-5 rounded-2xl border p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)]">
                <Filter className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[var(--color-deep-navy)]">
                  {t('securityCenterTriageTitle', 'Security triage queue')}
                </div>
                <div className="mt-1 text-xs text-[var(--color-deep-navy)]/65">
                  {t(
                    'securityCenterTriageDesc',
                    'Prioritize the next security actions by severity and jump to the related workflow.'
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIsFocusMode(true)}
                disabled={filteredTriageItems.length === 0}
                className="v5-security-triage-focus-btn flex items-center gap-2 rounded-xl bg-[var(--color-deep-navy)] dark:bg-white/10 px-4 py-2 text-xs font-bold text-white transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                <Play className="h-3 w-3 fill-current" />
                {t('securityCenterStartTriage', 'Start Focused Triage')}
              </button>
              <div className="h-8 w-[1px] bg-black/5 dark:bg-white/10 mx-1 hidden md:block" />
              {[
                { key: 'all', label: t('securityCenterFilterAll', 'All') },
                { key: 'high', label: t('securityCenterSeverityHigh', 'High') },
                { key: 'medium', label: t('securityCenterSeverityMedium', 'Medium') },
              ].map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setTriageFilter(filter.key as typeof triageFilter)}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all ${
                    triageFilter === filter.key
                      ? 'settings-filter-chip settings-filter-chip-active scale-105 shadow-sm'
                      : 'settings-filter-chip hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowReviewed((current) => !current)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all ${
                  showReviewed
                    ? 'settings-filter-chip settings-filter-chip-active shadow-sm'
                    : 'settings-filter-chip hover:bg-black/5 dark:hover:bg-white/10'
                }`}
                aria-pressed={showReviewed}
              >
                {showReviewed ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                {t('securityCenterShowReviewed', 'Show reviewed')}
              </button>
            </div>
          </div>

          {/* Bulk Recommendations Bar */}
          {filteredTriageItems.length > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-gradient-to-r from-[var(--color-sage-green)]/5 to-transparent p-3 border border-[var(--color-sage-green)]/10 dark:border-[var(--color-sage-green)]/20">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--color-sage-green)]" />
                <span className="text-xs font-medium text-[var(--color-deep-navy)]/80 dark:text-white/80">
                  {summary.metrics.aliasExposure > 0
                    ? t('securityCenterAliasRec', 'You have {{count}} exposed aliases that should be rotated.', { count: summary.metrics.aliasExposure })
                    : t('securityCenterGeneralRec', 'Review high-severity items first to quickly improve your security score.')}
                </span>
              </div>
              {summary.metrics.aliasExposure > 0 && (
                <button
                  type="button"
                  onClick={onReviewAliases}
                  className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-sage-green)] hover:underline"
                >
                  {t('securityCenterReviewAllAliases', 'Review All')}
                </button>
              )}
            </div>
          )}

          <div className="mt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-deep-navy)]/60 dark:text-white/60">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-sage-green)] animate-pulse" />
                {t('securityCenterTriageShowing', {
                  shown: visibleTriageItems.length,
                  total: filteredTriageItems.length,
                  defaultValue: '{{shown}} / {{total}} gösteriliyor',
                })}
              </div>
              {filteredTriageItems.length > 5 ? (
                <button
                  type="button"
                  onClick={() => setShowAllTriage((current) => !current)}
                  className="settings-filter-chip rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/10"
                >
                  {showAllTriage
                    ? t('securityCenterShowLess', 'Daha az göster')
                    : t('securityCenterShowMore', {
                        count: hiddenTriageCount,
                        defaultValue: '{{count}} tane daha göster',
                      })}
                </button>
              ) : null}
            </div>
            <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
              {filteredTriageItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 py-10 text-center dark:border-white/10">
                  <ShieldCheck className="mb-3 h-8 w-8 text-[var(--color-sage-green)]/40" />
                  <p className="text-sm font-medium text-[var(--color-deep-navy)]/60 dark:text-white/60">
                    {t(
                      'securityCenterTriageEmpty',
                      'No security item matches the current triage filter.'
                    )}
                  </p>
                </div>
              ) : (
                visibleTriageItems.map((item) => (
                  <div
                    key={`${item.issueType}-${item.itemId}`}
                    className="v5-security-triage-card group relative overflow-hidden rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition-all hover:border-[var(--color-sage-green)]/30 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
                          item.severity === 'high' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                        }`} />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-[var(--color-deep-navy)] dark:text-white">
                              {item.title}
                            </span>
                            <span className="v5-triage-badge flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-black/5 text-[var(--color-deep-navy)]/60 dark:bg-white/10 dark:text-white/60">
                              {issueTypeLabel(item.issueType)}
                            </span>
                          </div>
                          <div className="mt-1 text-xs leading-relaxed text-[var(--color-deep-navy)]/65 dark:text-white/65">
                            {t(item.detailKey)}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 md:justify-end">
                        <button
                          type="button"
                          onClick={() => onMarkReviewed(item)}
                          title={t('securityCenterMarkReviewed', 'Mark reviewed')}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/5 bg-white text-[var(--color-deep-navy)]/60 transition-all hover:bg-black/5 hover:text-[var(--color-deep-navy)] active:scale-95 dark:border-white/10 dark:bg-transparent dark:text-white/60 dark:hover:text-white"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <div className="h-9 w-[1px] bg-black/5 dark:bg-white/10 hidden md:block" />
                        <button
                          type="button"
                          onClick={() => {
                            if (item.issueType === 'alias_exposure' || item.issueType === 'alias_rotation') {
                              setIsFocusMode(true);
                              setFocusIndex(filteredTriageItems.findIndex(i => i.itemId === item.itemId && i.issueType === item.issueType));
                            } else {
                              onOpenTriageItem(item);
                            }
                          }}
                          className="flex h-9 items-center gap-2 rounded-xl bg-[var(--color-sage-green)]/10 px-4 text-xs font-bold text-[var(--color-sage-green)] transition-all hover:bg-[var(--color-sage-green)]/15 active:scale-95 dark:bg-[var(--color-sage-green)]/20"
                        >
                          {item.issueType === 'alias_exposure' || item.issueType === 'alias_rotation' ? (
                            <>
                              <RotateCcw className="h-4 w-4" />
                              {t('securityCenterAutoFix', 'Auto-Fix')}
                            </>
                          ) : (
                            <>
                              <ChevronRight className="h-4 w-4" />
                              {t('securityCenterOpenItem', 'Open')}
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction(item.actionKey)}
                          className="h-9 rounded-xl border border-black/5 bg-white px-4 text-xs font-bold text-[var(--color-deep-navy)]/80 transition-all hover:bg-black/5 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-white"
                        >
                          {issueActionLabel(item.actionKey)}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Focused Triage Overlay */}
          {isFocusMode && currentFocusItem && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
              <div className="v5-security-focus-panel relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#1a2333] animate-in zoom-in-95 duration-300">
                <div className="absolute right-4 top-4">
                  <button
                    onClick={() => setIsFocusMode(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)]">
                      <ShieldCheck className="h-8 w-8" />
                    </div>
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-sage-green)]">
                      {t('securityCenterFocusHeader', 'Focused Remediation')}
                    </div>
                    <h2 className="mb-2 text-2xl font-bold tracking-tight text-[var(--color-deep-navy)] dark:text-white">
                      {currentFocusItem.title}
                    </h2>
                    <div className="mb-6 rounded-full bg-black/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-black/50 dark:bg-white/10 dark:text-white/50">
                      {issueTypeLabel(currentFocusItem.issueType)} • {currentFocusItem.severity.toUpperCase()}
                    </div>
                    <p className="mb-8 max-w-md text-sm leading-relaxed text-[var(--color-deep-navy)]/70 dark:text-white/70">
                      {t(currentFocusItem.detailKey)}
                    </p>
                    
                    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                      <button
                        onClick={() => handleMarkReviewedInFocus(currentFocusItem)}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-black px-6 py-4 text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-95 dark:bg-white dark:text-black"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {t('securityCenterMarkReviewed', 'Mark as Reviewed')}
                      </button>
                      <button
                        onClick={handleAutoFix}
                        disabled={isFixing}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-sage-green)] px-6 py-4 text-sm font-bold text-white shadow-[0_8px_20px_rgba(114,136,111,0.3)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:grayscale"
                      >
                        {isFixing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 fill-current" />
                        )}
                        {currentFocusItem.issueType === 'alias_exposure' ||
                        currentFocusItem.issueType === 'alias_rotation'
                          ? t('securityCenterRotateNow', 'Rotate Alias Now')
                          : t('securityCenterFixNow', 'Open & Fix Now')}
                      </button>
                    </div>

                    <div className="mt-8 flex items-center gap-6">
                      <button
                        onClick={handleNextFocus}
                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-black/40 transition-colors hover:text-black dark:text-white/40 dark:hover:text-white"
                      >
                        <SkipForward className="h-3 w-3" />
                        {t('securityCenterSkip', 'Skip')}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="bg-black/[0.02] px-8 py-4 dark:bg-white/[0.02]">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-black/30 dark:text-white/30">
                    <span>{t('securityCenterQueueProgress', 'Progress')}</span>
                    <span>{focusIndex + 1} / {filteredTriageItems.length}</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/5">
                    <div 
                      className="h-full bg-[var(--color-sage-green)] transition-all duration-500" 
                      style={{ width: `${((focusIndex + 1) / filteredTriageItems.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {showReviewed && (
            <div className="mt-4 space-y-2 border-t border-black/5 pt-4 dark:border-white/10">
              <div className="text-xs font-semibold uppercase tracking-widest text-[var(--color-deep-navy)]/45 dark:text-white/45">
                {t('securityCenterReviewedQueueTitle', 'Reviewed items')}
              </div>
              {summary.reviewedTriageItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed px-4 py-4 text-sm text-[var(--color-deep-navy)]/60 dark:border-white/10 dark:text-white/60">
                  {t(
                    'securityCenterReviewedEmpty',
                    'No reviewed security item is hidden right now.'
                  )}
                </div>
              ) : (
                summary.reviewedTriageItems.map((item) => (
                  <div
                    key={`reviewed-${item.issueType}-${item.itemId}`}
                    className="settings-card-surface rounded-2xl px-4 py-4 opacity-85"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-[var(--color-deep-navy)]">
                            {item.title}
                          </span>
                          <span className="settings-badge-muted rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
                            {issueTypeLabel(item.issueType)}
                          </span>
                        </div>
                        <div className="mt-1 text-xs leading-relaxed text-[var(--color-deep-navy)]/65">
                          {t('securityCenterReviewedAt', {
                            defaultValue: 'Reviewed at {{at}}',
                            at: item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : '-',
                          })}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onReopenReviewed(item)}
                          className="settings-pill-secondary rounded-xl px-4 py-2 text-xs font-bold active:scale-95"
                        >
                          {t('securityCenterReopen', 'Reopen')}
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenTriageItem(item)}
                          className="rounded-xl border border-[var(--color-sage-green)]/20 bg-[var(--color-sage-green)]/10 px-4 py-2 text-xs font-bold text-[var(--color-sage-green)] transition-all hover:bg-[var(--color-sage-green)]/15 active:scale-95"
                        >
                          {t('securityCenterOpenItem', 'Open item')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}

              <div className="pt-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-[var(--color-deep-navy)]/45 dark:text-white/45">
                  {t('securityCenterResolvedQueueTitle', 'Recently resolved')}
                </div>
                <div className="mt-2 space-y-2">
                  {summary.resolvedTriageItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed px-4 py-4 text-sm text-[var(--color-deep-navy)]/60 dark:border-white/10 dark:text-white/60">
                      {t(
                        'securityCenterResolvedEmpty',
                        'No reviewed security item has been fully resolved yet.'
                      )}
                    </div>
                  ) : (
                    summary.resolvedTriageItems.map((item) => (
                      <div
                        key={`resolved-${item.issueType}-${item.itemId}`}
                        className="settings-card-surface rounded-2xl px-4 py-4 opacity-80"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-[var(--color-deep-navy)]">
                                {item.title}
                              </span>
                              <span className="settings-badge-positive rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
                                {t('securityCenterResolvedBadge', 'Resolved')}
                              </span>
                            </div>
                            <div className="mt-1 text-xs leading-relaxed text-[var(--color-deep-navy)]/65">
                              {t('securityCenterReviewedAt', {
                                defaultValue: 'Reviewed at {{at}}',
                                at: item.reviewedAt
                                  ? new Date(item.reviewedAt).toLocaleString()
                                  : '-',
                              })}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onOpenTriageItem(item)}
                            className="rounded-xl border border-[var(--color-sage-green)]/20 bg-[var(--color-sage-green)]/10 px-4 py-2 text-xs font-bold text-[var(--color-sage-green)] transition-all hover:bg-[var(--color-sage-green)]/15 active:scale-95"
                          >
                            {t('securityCenterOpenItem', 'Open item')}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-[var(--color-deep-navy)]/45 dark:text-white/45">
                  {t('securityCenterHistoryTitle', 'Recent security actions')}
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                  <div className="settings-card-surface rounded-2xl px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                      {t('securityCenterHistoryTrendReviewed', 'Reviewed / 7 days')}
                    </div>
                    <div className="mt-1 text-lg font-bold text-[var(--color-deep-navy)]">
                      {recentHistorySummary.reviewed}
                    </div>
                  </div>
                  <div className="settings-card-surface rounded-2xl px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                      {t('securityCenterHistoryTrendReopened', 'Reopened / 7 days')}
                    </div>
                    <div className="mt-1 text-lg font-bold text-amber-600">
                      {recentHistorySummary.reopened}
                    </div>
                  </div>
                  <div className="settings-card-surface rounded-2xl px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                      {t('securityCenterHistoryTrendAutoResolved', 'Auto-resolved / 7 days')}
                    </div>
                    <div className="mt-1 text-lg font-bold text-[var(--color-sage-green)]">
                      {recentHistorySummary.autoResolved}
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/45 dark:text-white/45">
                    {t('securityCenterHistoryGroupsTitle', 'Most active issue groups / 7 days')}
                  </div>
                  {recentIssueTypeSummary.length === 0 ? (
                    <div className="mt-2 rounded-2xl border border-dashed px-4 py-4 text-sm text-[var(--color-deep-navy)]/60 dark:border-white/10 dark:text-white/60">
                      {t(
                        'securityCenterHistoryGroupsEmpty',
                        'No issue-group trend is available yet.'
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                      {recentIssueTypeSummary.map(([issueType, count]) => (
                        <div
                          key={issueType}
                          className="settings-card-surface rounded-2xl px-4 py-3"
                        >
                          <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                            {issueTypeLabel(issueType)}
                          </div>
                          <div className="mt-1 text-lg font-bold text-[var(--color-deep-navy)]">
                            {count}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-2 space-y-2">
                  {historyItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed px-4 py-4 text-sm text-[var(--color-deep-navy)]/60 dark:border-white/10 dark:text-white/60">
                      {t(
                        'securityCenterHistoryEmpty',
                        'No security-center review action has been recorded yet.'
                      )}
                    </div>
                  ) : (
                    historyItems.slice(0, 6).map((event) => (
                      <div
                        key={event.id}
                        className="settings-card-surface rounded-2xl px-4 py-3 opacity-80"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-[var(--color-deep-navy)]">
                              {event.action === 'reviewed'
                                ? t('securityCenterHistoryReviewed', 'Marked as reviewed')
                                : event.action === 'reopened'
                                  ? t('securityCenterHistoryReopened', 'Reopened')
                                  : t(
                                      'securityCenterHistoryAutoResolved',
                                      'Automatically resolved'
                                    )}
                            </div>
                            <div className="mt-1 text-xs text-[var(--color-deep-navy)]/65">
                              {event.title || event.reviewKey}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/40">
                              {new Date(event.at).toLocaleString()}
                            </div>
                            <div className="mt-1 text-[10px] text-[var(--color-deep-navy)]/55">
                              {event.action === 'auto_resolved'
                                ? t(
                                    'securityCenterHistoryAutoResolvedHint',
                                    'Resolved after the risk disappeared'
                                  )
                                : event.action === 'reopened'
                                  ? t(
                                      'securityCenterHistoryReopenedHint',
                                      'Returned to the active queue'
                                    )
                                  : t(
                                      'securityCenterHistoryReviewedHint',
                                      'Hidden from the active queue for review'
                                    )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

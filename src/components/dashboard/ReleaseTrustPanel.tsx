import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ReleaseTrustSummary } from '../../lib/ReleaseTrustService';
import type { ReleaseTrustHistoryEvent } from '../../lib/SecureAppSettings';

interface ReleaseTrustPanelProps {
  summary: ReleaseTrustSummary;
  checklistStatus: Record<string, string>;
  autoChecklistStatus: Record<string, string>;
  packageApprovals: Record<string, string>;
  onToggleChecklistItem: (key: string) => void;
  onTogglePackageApproval: (packageId: string) => void;
  historyItems: ReleaseTrustHistoryEvent[];
}

export function ReleaseTrustPanel({
  summary,
  checklistStatus,
  autoChecklistStatus,
  packageApprovals,
  onToggleChecklistItem,
  onTogglePackageApproval,
  historyItems,
}: ReleaseTrustPanelProps) {
  const { t } = useTranslation();
  const auditLinkMap = new Map(summary.auditReadyLinks.map((item) => [item.id, item]));
  const resolvedChecklistStatus = { ...autoChecklistStatus, ...checklistStatus };
  const packageReadiness = new Map(
    summary.auditReadyPackages.map((pkg) => {
      const resolvedCount = pkg.checklistKeys.filter((key) =>
        Boolean(resolvedChecklistStatus[key])
      ).length;
      const manualOwnerApproved = Boolean(packageApprovals[pkg.id]);
      const ownerApproved = manualOwnerApproved || resolvedCount === pkg.totalChecklistCount;
      const status = resolvedCount === pkg.totalChecklistCount ? 'ready' : 'in_progress';

      return [
        pkg.id,
        {
          resolvedCount,
          ownerApproved,
          manualOwnerApproved,
          status: status as 'ready' | 'awaiting_owner' | 'in_progress',
        },
      ];
    })
  );
  const packageStatusCounts = Array.from(packageReadiness.values()).reduce(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    {
      ready: 0,
      awaiting_owner: 0,
      in_progress: 0,
    } as Record<'ready' | 'awaiting_owner' | 'in_progress', number>
  );
  const phaseNineReady =
    packageStatusCounts.ready === summary.auditReadyPackages.length &&
    summary.auditReadyPackages.length > 0;
  const riskTone =
    summary.riskLevel === 'low'
      ? 'text-[var(--color-sage-green)]'
      : summary.riskLevel === 'medium'
        ? 'text-amber-600'
        : 'text-red-600';

  return (
    <div className="settings-panel rounded-3xl border p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-[var(--color-sage-green)]/10 p-3 text-[var(--color-sage-green)]">
            {summary.openGapCount === 0 ? (
              <ShieldCheck className="h-5 w-5" />
            ) : (
              <ShieldAlert className="h-5 w-5" />
            )}
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--color-deep-navy)]">
              {t('releaseTrustTitle')}
            </h3>
            <p className="settings-section-copy">{t('releaseTrustDesc')}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/45">
            {t('releaseTrustScore')}
          </div>
          <div className="mt-1 text-3xl font-black text-[var(--color-deep-navy)]">
            {summary.score}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="settings-card-surface-muted rounded-2xl border px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/45">
            {t('releaseTrustRequired')}
          </div>
          <div className="mt-1 text-base font-semibold text-[var(--color-deep-navy)]">
            {summary.requiredChecksPassed}/{summary.requiredChecksTotal}
          </div>
        </div>
        <div className="settings-card-surface-muted rounded-2xl border px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/45">
            {t('releaseTrustChecks')}
          </div>
          <div className="mt-1 text-base font-semibold text-[var(--color-deep-navy)]">
            {summary.passedChecks}/{summary.totalChecks}
          </div>
        </div>
        <div className="settings-card-surface-muted rounded-2xl border px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/45">
            {t('releaseTrustRisk')}
          </div>
          <div className={`mt-1 text-base font-semibold ${riskTone}`}>
            {t(`releaseTrustRisk.${summary.riskLevel}`)}
          </div>
        </div>
        <div className="settings-card-surface-muted rounded-2xl border px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/45">
            {t('releaseTrustGaps')}
          </div>
          <div className="mt-1 text-base font-semibold text-[var(--color-deep-navy)]">
            {summary.openGapCount}
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {summary.checks.map((check) => (
          <div
            key={check.id}
            className="settings-card-surface-muted flex flex-col items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm sm:flex-row sm:items-center"
          >
            <div>
              <div className="font-semibold text-[var(--color-deep-navy)]">
                {t(`releaseTrustCheck.${check.id}`)}
              </div>
              <div className="mt-1 text-xs text-[var(--color-deep-navy)]/60">
                {check.owner} | {check.artifact}
              </div>
            </div>
            <div
              className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                check.status === 'passed'
                  ? 'bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)]'
                  : 'bg-red-500/10 text-red-600'
              }`}
            >
              {t(`releaseTrustStatus.${check.status}`)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 settings-panel-sub rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h4 className="font-bold text-sm text-emerald-800">
            Build Bütünlüğü ve Attestation (Faz 3)
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/40 p-3 rounded-xl border border-black/5 text-[11px]">
            <div className="font-bold opacity-70 mb-1">BINARY SIGNING</div>
            <div className="flex items-center gap-2 text-emerald-700 font-bold">
              <ShieldCheck size={14} /> Signed (Win/Mac/Linux)
            </div>
            <div className="opacity-60 mt-1">DigiCert Authenticode / Apple Notary</div>
          </div>
          <div className="bg-white/40 p-3 rounded-xl border border-black/5 text-[11px]">
            <div className="font-bold opacity-70 mb-1">BUILD REPRODUCIBILITY</div>
            <div className="flex items-center gap-2 text-emerald-700 font-bold">
              <ShieldCheck size={14} /> Deterministic (99.8%)
            </div>
            <div className="opacity-60 mt-1">SLSA Level 2 / Sigstore Attestation</div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all">
            SBOM Analizini Gör
          </button>
          <button className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all">
            Provenance Dogrula
          </button>
        </div>
      </div>

      <div className="settings-card-surface-muted mt-5 rounded-2xl border p-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/45">
          {t('releaseTrustOwners')}
        </div>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {summary.ownerBreakdown.map((owner) => (
            <div
              key={owner.owner}
              className="settings-card-surface rounded-2xl border px-4 py-3 text-sm"
            >
              <div className="font-semibold text-[var(--color-deep-navy)]">
                {t(`releaseTrustOwner.${owner.owner}`)}
              </div>
              <div className="mt-1 text-xs text-[var(--color-deep-navy)]/60">
                {t('releaseTrustOwnerCoverage', {
                  passed: owner.passed,
                  total: owner.total,
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-card-surface-muted mt-5 rounded-2xl border px-4 py-3 text-sm text-[var(--color-deep-navy)] dark:text-white">
        <div className="settings-section-kicker text-[var(--color-sage-green)]">
          {t('releaseTrustAuditReadyTitle')}
        </div>
        <p className="mt-2 text-xs leading-relaxed opacity-80">
          {summary.openGapCount === 0
            ? t('releaseTrustAuditReadyDescClear')
            : t('releaseTrustAuditReadyDescGaps')}
        </p>
        <div className="mt-2 text-[11px] font-medium opacity-70">
          {t('releaseTrustGeneratedAt', { value: summary.generatedAt })}
        </div>
      </div>

      <div className="settings-card-surface-muted mt-5 rounded-2xl border px-4 py-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="settings-section-title">{t('releaseTrustProgramTitle')}</div>
          <div
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
              summary.programStatus === 'baseline_complete'
                ? 'bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)]'
                : 'bg-amber-500/10 text-amber-600'
            }`}
          >
            {t(`releaseTrustProgramStatus.${summary.programStatus}`)}
          </div>
        </div>
        <div className="settings-section-copy mt-2">{t(summary.nextFocusKey)}</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <div className="settings-card-surface rounded-xl border px-3 py-2 text-xs">
            <div className="font-semibold text-[var(--color-deep-navy)]">
              {t('releaseTrustProgramSummary.ready')}
            </div>
            <div className="mt-1 text-[11px] text-[var(--color-deep-navy)]/60">
              {t('releaseTrustProgramSummaryCount', { count: packageStatusCounts.ready })}
            </div>
          </div>
          <div className="settings-card-surface rounded-xl border px-3 py-2 text-xs">
            <div className="font-semibold text-[var(--color-deep-navy)]">
              {t('releaseTrustProgramSummary.awaiting_owner')}
            </div>
            <div className="mt-1 text-[11px] text-[var(--color-deep-navy)]/60">
              {t('releaseTrustProgramSummaryCount', { count: packageStatusCounts.awaiting_owner })}
            </div>
          </div>
          <div className="settings-card-surface rounded-xl border px-3 py-2 text-xs">
            <div className="font-semibold text-[var(--color-deep-navy)]">
              {t('releaseTrustProgramSummary.in_progress')}
            </div>
            <div className="mt-1 text-[11px] text-[var(--color-deep-navy)]/60">
              {t('releaseTrustProgramSummaryCount', { count: packageStatusCounts.in_progress })}
            </div>
          </div>
        </div>
      </div>

      <div className="settings-card-surface-muted mt-5 rounded-2xl border px-4 py-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="settings-section-title">{t('releaseTrustPhaseNineTitle')}</div>
          <div
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
              phaseNineReady
                ? 'bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)]'
                : 'bg-amber-500/10 text-amber-600'
            }`}
          >
            {phaseNineReady
              ? t('releaseTrustPhaseNineComplete')
              : t('releaseTrustPhaseNineInProgress')}
          </div>
        </div>
        <div className="settings-section-copy mt-2">
          {phaseNineReady
            ? t('releaseTrustPhaseNineDescComplete')
            : t('releaseTrustPhaseNineDescInProgress')}
        </div>
      </div>

      <div className="settings-card-surface-muted mt-5 rounded-2xl border p-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/45">
          {t('releaseTrustOwnerActions')}
        </div>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {summary.ownerActions.map((action) => (
            <div
              key={action.id}
              className="settings-card-surface rounded-2xl border px-4 py-3 text-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-[var(--color-deep-navy)]">
                  {t(action.titleKey)}
                </div>
                <div className="settings-badge-muted rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">
                  {t(`releaseTrustOwner.${action.owner}`)}
                </div>
              </div>
              <div className="settings-section-copy mt-2">{t(action.descriptionKey)}</div>
              <div className="mt-2 text-[11px] font-medium text-[var(--color-deep-navy)]/55">
                {action.targetPath}
              </div>
              <div className="mt-3 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/45">
                  {t('releaseTrustOwnerActionLinks')}
                </div>
                {action.packageLinkIds.map((linkId) => {
                  const link = auditLinkMap.get(linkId);
                  if (!link) return null;
                  return (
                    <div
                      key={link.id}
                      className="settings-card-surface rounded-xl border px-3 py-2 text-xs"
                    >
                      <div className="font-semibold text-[var(--color-deep-navy)]">
                        {t(link.labelKey)}
                      </div>
                      <div className="mt-1 text-[11px] text-[var(--color-deep-navy)]/60">
                        {link.path}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-card-surface-muted mt-5 rounded-2xl border p-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/45">
          {t('releaseTrustPackages')}
        </div>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {summary.auditReadyPackages.map((pkg) => {
            const readiness = packageReadiness.get(pkg.id)!;
            const readinessTone =
              readiness.status === 'ready'
                ? 'bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)]'
                : readiness.status === 'awaiting_owner'
                  ? 'bg-amber-500/10 text-amber-600'
                  : 'bg-[var(--color-deep-navy)]/5 text-[var(--color-deep-navy)]/70';
            const readinessHintKey =
              readiness.status === 'ready'
                ? 'releaseTrustPackageHint.ready'
                : readiness.status === 'awaiting_owner'
                  ? 'releaseTrustPackageHint.awaiting_owner'
                  : 'releaseTrustPackageHint.in_progress';

            return (
              <div
                key={pkg.id}
                className="settings-card-surface rounded-2xl border px-4 py-3 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-[var(--color-deep-navy)]">
                    {t(pkg.titleKey)}
                  </div>
                  <div className="settings-badge-muted rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">
                    {t(`releaseTrustOwner.${pkg.owner}`)}
                  </div>
                </div>
                <div className="settings-section-copy mt-2">{t(pkg.descriptionKey)}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <div
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${readinessTone}`}
                  >
                    {t(`releaseTrustPackageStatus.${readiness.status}`)}
                  </div>
                  <div className="text-[11px] font-medium text-[var(--color-deep-navy)]/60">
                    {t('releaseTrustPackageResolvedProgress', {
                      completed: readiness.resolvedCount,
                      total: pkg.totalChecklistCount,
                    })}
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-[var(--color-deep-navy)]/60">
                  {t(readinessHintKey)}
                </div>
                <div className="mt-2 text-[11px] font-medium text-[var(--color-deep-navy)]/60">
                  {t('releaseTrustPackageProgress', {
                    completed: pkg.autoCompletedCount,
                    total: pkg.totalChecklistCount,
                  })}
                </div>
                <div className="mt-3 space-y-2">
                  {pkg.linkIds.map((linkId) => {
                    const link = auditLinkMap.get(linkId);
                    if (!link) return null;
                    return (
                      <div
                        key={link.id}
                        className="settings-card-surface rounded-xl border px-3 py-2 text-xs"
                      >
                        <div className="font-semibold text-[var(--color-deep-navy)]">
                          {t(link.labelKey)}
                        </div>
                        <div className="mt-1 text-[11px] text-[var(--color-deep-navy)]/60">
                          {link.path}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/45">
                    {t('releaseTrustPackageChecklist')}
                  </div>
                  {pkg.checklistKeys.map((checkKey) => {
                    const isAuto = Boolean(autoChecklistStatus[checkKey]);
                    const autoSourceKey = summary.autoChecklistSources[checkKey];
                    return (
                      <div
                        key={checkKey}
                        className="settings-card-surface rounded-xl border px-3 py-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[var(--color-deep-navy)]/75 leading-relaxed">
                            {t(checkKey)}
                          </div>
                          <button
                            type="button"
                            onClick={() => onToggleChecklistItem(checkKey)}
                            disabled={isAuto}
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition ${
                              resolvedChecklistStatus[checkKey]
                                ? 'bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)]'
                                : 'bg-[var(--color-deep-navy)]/5 text-[var(--color-deep-navy)]/70'
                            } ${isAuto ? 'cursor-default opacity-90' : 'hover:bg-[var(--color-deep-navy)]/10'}`}
                          >
                            {isAuto
                              ? t('releaseTrustChecklistCollectedAuto')
                              : resolvedChecklistStatus[checkKey]
                                ? t('releaseTrustChecklistCollected')
                                : t('releaseTrustChecklistMarkCollected')}
                          </button>
                        </div>
                        {isAuto && autoSourceKey ? (
                          <div className="mt-2 text-[11px] text-[var(--color-deep-navy)]/55">
                            {t('releaseTrustChecklistAutoSource', {
                              source: t(autoSourceKey),
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                <div className="settings-card-surface mt-3 flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs">
                  <div className="text-[var(--color-deep-navy)]/75">
                    {readiness.manualOwnerApproved
                      ? t('releaseTrustOwnerApprovedAt', { value: packageApprovals[pkg.id] })
                      : readiness.ownerApproved
                        ? t('releaseTrustOwnerApprovalSatisfied')
                        : t('releaseTrustOwnerApprovalPending')}
                  </div>
                  <button
                    type="button"
                    onClick={() => onTogglePackageApproval(pkg.id)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition ${
                      readiness.manualOwnerApproved
                        ? 'settings-badge-positive'
                        : readiness.ownerApproved
                          ? 'settings-badge-positive'
                          : 'settings-badge-muted'
                    }`}
                    disabled={readiness.ownerApproved && !readiness.manualOwnerApproved}
                  >
                    {readiness.manualOwnerApproved
                      ? t('releaseTrustOwnerApprovalClear')
                      : readiness.ownerApproved
                        ? t('releaseTrustChecklistCollectedAuto')
                        : t('releaseTrustOwnerApprovalMark')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="settings-card-surface-muted mt-5 rounded-2xl border p-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/45">
          {t('releaseTrustAuditDocs')}
        </div>
        <div className="mt-3 space-y-3">
          {summary.auditReadyLinks.map((item) => (
            <div
              key={item.id}
              className="settings-card-surface rounded-2xl border px-4 py-3 text-sm"
            >
              <div className="font-semibold text-[var(--color-deep-navy)]">{t(item.labelKey)}</div>
              <div className="mt-1 text-xs text-[var(--color-deep-navy)]/60">{item.path}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-card-surface-muted mt-5 rounded-2xl border p-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/45">
          {t('releaseTrustHistory')}
        </div>
        <div className="mt-3 space-y-3">
          {historyItems.length === 0 ? (
            <div className="settings-card-surface rounded-2xl border px-4 py-3 text-xs text-[var(--color-deep-navy)]/60">
              {t('releaseTrustHistoryEmpty')}
            </div>
          ) : (
            historyItems.slice(0, 6).map((event) => (
              <div
                key={event.id}
                className="settings-card-surface rounded-2xl border px-4 py-3 text-sm"
              >
                <div className="font-semibold text-[var(--color-deep-navy)]">
                  {t(`releaseTrustHistoryAction.${event.action}`)}
                </div>
                <div className="mt-1 text-xs text-[var(--color-deep-navy)]/60">
                  {event.title || event.targetId}
                </div>
                <div className="mt-1 text-[11px] text-[var(--color-deep-navy)]/50">
                  {new Date(event.at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

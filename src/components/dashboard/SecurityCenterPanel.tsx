import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { SecurityScoreGauge } from "../ui/SecurityScoreGauge";
import type { SecurityCenterSummary, SecurityCenterIssueType, SecurityCenterTriageItem } from "../../lib/SecurityCenterService";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import type { SecurityCenterHistoryEvent } from "../../lib/SecureAppSettings";

interface SecurityCenterPanelProps {
  summary: SecurityCenterSummary;
  onReviewPasswords: () => void;
  onReviewPasskeys: () => void;
  onReviewSharing: () => void;
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
  onReviewDevices,
  onReviewLocalRisk,
  onOpenTriageItem,
  onMarkReviewed,
  onReopenReviewed,
  historyItems,
}: SecurityCenterPanelProps) {
  const { t } = useTranslation();
  const [triageFilter, setTriageFilter] = useState<"all" | "high" | "medium">("all");
  const [showReviewed, setShowReviewed] = useState(false);
  const [showAllTriage, setShowAllTriage] = useState(false);
  const recentHistorySummary = useMemo(() => {
    const windowStart = Date.now() - 1000 * 60 * 60 * 24 * 7;
    const recent = historyItems.filter((event) => {
      const eventAt = new Date(event.at).getTime();
      return !Number.isNaN(eventAt) && eventAt >= windowStart;
    });
    return {
      reviewed: recent.filter((event) => event.action === "reviewed").length,
      reopened: recent.filter((event) => event.action === "reopened").length,
      autoResolved: recent.filter((event) => event.action === "auto_resolved").length,
    };
  }, [historyItems]);
  const recentIssueTypeSummary = useMemo(() => {
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
    if (actionKey === "securityCenterActionReviewPasskeys") {
      onReviewPasskeys();
      return;
    }
    if (actionKey === "securityCenterActionReviewSharing") {
      onReviewSharing();
      return;
    }
    if (actionKey === "securityCenterActionReviewDevices") {
      onReviewDevices();
      return;
    }
    if (actionKey === "securityCenterActionReviewLocalRisk") {
      onReviewLocalRisk();
      return;
    }
    onReviewPasswords();
  };

  const issueTypeLabel = (type: SecurityCenterIssueType) => {
    if (type === "missing_second_factor") return t("securityCenterMetric2fa", "Missing 2FA");
    if (type === "passkey_ready") return t("securityCenterMetricPasskeys", "Passkey ready");
    if (type === "aging_credentials") return t("securityCenterMetricAging", "Aging passwords");
    if (type === "device_trust") return t("securityCenterMetricDeviceTrust", "Device trust");
    if (type === "local_risk_activity") return t("securityCenterMetricLocalRisk", "Local risk");
    return t("securityCenterMetricSharing", "Sharing gaps");
  };

  const filteredTriageItems = useMemo(
    () =>
      triageFilter === "all"
        ? summary.triageItems
        : summary.triageItems.filter((item) => item.severity === triageFilter),
    [summary.triageItems, triageFilter]
  );
  const visibleTriageItems = useMemo(
    () => (showAllTriage ? filteredTriageItems : filteredTriageItems.slice(0, 5)),
    [filteredTriageItems, showAllTriage]
  );
  const hiddenTriageCount = Math.max(filteredTriageItems.length - visibleTriageItems.length, 0);

  return (
    <div className="settings-panel rounded-3xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <ShieldCheck className="w-5 h-5 text-[var(--color-sage-green)]" />
        <h3 className="text-lg font-semibold tracking-tight text-[var(--color-deep-navy)]">
          {t("securityCenterTitle", "Security Center 2.0")}
        </h3>
      </div>

      <div className="settings-subpanel rounded-2xl border p-5 shadow-inner">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <SecurityScoreGauge score={summary.score} onClick={onReviewPasswords} />
            <div className="space-y-1.5">
              <p className="settings-section-kicker">
                {t("securityCenterScore", "Security score")}
              </p>
              <div className="settings-section-title">
                {summary.riskLevel === "low"
                  ? t("securityCenterRiskLow", "Low risk")
                  : summary.riskLevel === "medium"
                    ? t("securityCenterRiskMedium", "Medium risk")
                    : t("securityCenterRiskHigh", "High risk")}
              </div>
              <p className="settings-section-copy max-w-md">
                {t(
                  "securityCenterDesc",
                  "Review missing second factors, passkey opportunities, aging credentials, and sensitive sharing gaps from one place."
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[260px] xl:min-w-[280px]">
            <div className="settings-card-surface rounded-2xl px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                {t("securityCenterMetric2fa", "Missing 2FA")}
              </div>
              <div className="mt-2 text-lg font-bold text-red-500">{summary.metrics.missingSecondFactor}</div>
            </div>
            <div className="settings-card-surface rounded-2xl px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                {t("securityCenterMetricPasskeys", "Passkey ready")}
              </div>
              <div className="mt-2 text-lg font-bold text-amber-600">{summary.metrics.passkeyReady}</div>
            </div>
            <div className="settings-card-surface rounded-2xl px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                {t("securityCenterMetricAging", "Aging passwords")}
              </div>
              <div className="mt-2 text-lg font-bold text-blue-600">{summary.metrics.agingCredentials}</div>
            </div>
            <div className="settings-card-surface rounded-2xl px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                {t("securityCenterMetricSharing", "Sharing gaps")}
              </div>
              <div className="mt-2 text-lg font-bold text-red-500">{summary.metrics.sensitiveSharing}</div>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {summary.issues.length === 0 ? (
            <div className="settings-card-surface-muted rounded-2xl border border-dashed px-4 py-4 text-sm text-[var(--color-deep-navy)]/65">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-[var(--color-sage-green)]" />
                {t("securityCenterAllClear", "No additional security center issue is open.")}
              </div>
            </div>
          ) : (
            summary.issues.map((issue) => (
              <div key={issue.type} className="settings-card-surface rounded-2xl px-4 py-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className={`mt-0.5 h-4 w-4 ${
                        issue.severity === "high" ? "text-red-500" : "text-amber-500"
                      }`}
                    />
                    <div>
                      <div className="text-sm font-semibold text-[var(--color-deep-navy)]">
                        {t(issue.messageKey, { count: issue.count })}
                      </div>
                      <div className="mt-1 text-[10px] font-bold uppercase tracking-widest opacity-50">
                        {issue.severity === "high"
                          ? t("securityCenterSeverityHigh", "High")
                          : t("securityCenterSeverityMedium", "Medium")}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAction(issue.actionKey)}
                    className="settings-pill-secondary w-full rounded-xl px-4 py-2 text-xs font-bold active:scale-95 sm:w-auto"
                  >
                    {issue.actionKey === "securityCenterActionReviewPasskeys"
                      ? t("securityCenterActionReviewPasskeys", "Review passkeys")
                      : issue.actionKey === "securityCenterActionReviewSharing"
                        ? t("securityCenterActionReviewSharing", "Review sharing")
                        : issue.actionKey === "securityCenterActionReviewDevices"
                          ? t("securityCenterActionReviewDevices", "Review devices")
                          : issue.actionKey === "securityCenterActionReviewLocalRisk"
                            ? t("securityCenterActionReviewLocalRisk", "Review sync audit")
                        : t("securityCenterActionReviewPasswords", "Review passwords")}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="settings-card-surface-muted mt-5 rounded-2xl border p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-[var(--color-deep-navy)]">
                {t("securityCenterTriageTitle", "Security triage queue")}
              </div>
              <div className="mt-1 text-xs text-[var(--color-deep-navy)]/65">
                {t("securityCenterTriageDesc", "Prioritize the next security actions by severity and jump to the related workflow.")}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: t("securityCenterFilterAll", "All") },
                { key: "high", label: t("securityCenterSeverityHigh", "High") },
                { key: "medium", label: t("securityCenterSeverityMedium", "Medium") },
              ].map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setTriageFilter(filter.key as typeof triageFilter)}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${
                    triageFilter === filter.key
                      ? "settings-filter-chip settings-filter-chip-active"
                      : "settings-filter-chip"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowReviewed((current) => !current)}
                className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${
                  showReviewed
                    ? "settings-filter-chip settings-filter-chip-active"
                    : "settings-filter-chip"
                }`}
                aria-pressed={showReviewed}
              >
                {t("securityCenterShowReviewed", "Show reviewed")}
              </button>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-deep-navy)]/60">
              <div>
                {t("securityCenterTriageShowing", {
                  shown: visibleTriageItems.length,
                  total: filteredTriageItems.length,
                  defaultValue: "{{shown}} / {{total}} gösteriliyor",
                })}
              </div>
              {filteredTriageItems.length > 5 ? (
                <button
                  type="button"
                  onClick={() => setShowAllTriage((current) => !current)}
                  className="settings-filter-chip rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
                >
                  {showAllTriage
                    ? t("securityCenterShowLess", "Daha az göster")
                    : t("securityCenterShowMore", {
                        count: hiddenTriageCount,
                        defaultValue: "{{count}} tane daha göster",
                      })}
                </button>
              ) : null}
            </div>
            <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
            {filteredTriageItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed px-4 py-4 text-sm text-[var(--color-deep-navy)]/60 dark:border-white/10 dark:text-white/60">
                {t("securityCenterTriageEmpty", "No security item matches the current triage filter.")}
              </div>
            ) : (
              visibleTriageItems.map((item) => (
                <div key={`${item.issueType}-${item.itemId}`} className="settings-card-surface rounded-2xl px-4 py-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--color-deep-navy)]">{item.title}</span>
                        <span className="settings-badge-muted rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
                          {issueTypeLabel(item.issueType)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs leading-relaxed text-[var(--color-deep-navy)]/65">
                        {t(item.detailKey)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <button
                        type="button"
                        onClick={() => onMarkReviewed(item)}
                        className="settings-pill-secondary w-full rounded-xl px-4 py-2 text-xs font-bold active:scale-95 sm:w-auto"
                      >
                        {t("securityCenterMarkReviewed", "Mark reviewed")}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenTriageItem(item)}
                        className="w-full rounded-xl border border-[var(--color-sage-green)]/20 bg-[var(--color-sage-green)]/10 px-4 py-2 text-xs font-bold text-[var(--color-sage-green)] transition-all hover:bg-[var(--color-sage-green)]/15 active:scale-95 sm:w-auto"
                      >
                        {t("securityCenterOpenItem", "Open item")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(item.actionKey)}
                        className="settings-pill-secondary w-full rounded-xl px-4 py-2 text-xs font-bold active:scale-95 sm:w-auto"
                      >
                        {item.actionKey === "securityCenterActionReviewPasskeys"
                          ? t("securityCenterActionReviewPasskeys", "Review passkeys")
                          : item.actionKey === "securityCenterActionReviewSharing"
                            ? t("securityCenterActionReviewSharing", "Review sharing")
                            : item.actionKey === "securityCenterActionReviewDevices"
                              ? t("securityCenterActionReviewDevices", "Review devices")
                              : item.actionKey === "securityCenterActionReviewLocalRisk"
                                ? t("securityCenterActionReviewLocalRisk", "Review sync audit")
                            : t("securityCenterActionReviewPasswords", "Review passwords")}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
            </div>
          </div>

          {showReviewed && (
            <div className="mt-4 space-y-2 border-t border-black/5 pt-4 dark:border-white/10">
              <div className="text-xs font-semibold uppercase tracking-widest text-[var(--color-deep-navy)]/45 dark:text-white/45">
                {t("securityCenterReviewedQueueTitle", "Reviewed items")}
              </div>
              {summary.reviewedTriageItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed px-4 py-4 text-sm text-[var(--color-deep-navy)]/60 dark:border-white/10 dark:text-white/60">
                  {t("securityCenterReviewedEmpty", "No reviewed security item is hidden right now.")}
                </div>
              ) : (
                summary.reviewedTriageItems.map((item) => (
                  <div key={`reviewed-${item.issueType}-${item.itemId}`} className="settings-card-surface rounded-2xl px-4 py-4 opacity-85">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-[var(--color-deep-navy)]">{item.title}</span>
                          <span className="settings-badge-muted rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
                            {issueTypeLabel(item.issueType)}
                          </span>
                        </div>
                        <div className="mt-1 text-xs leading-relaxed text-[var(--color-deep-navy)]/65">
                          {t("securityCenterReviewedAt", {
                            defaultValue: "Reviewed at {{at}}",
                            at: item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : "-",
                          })}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onReopenReviewed(item)}
                          className="settings-pill-secondary rounded-xl px-4 py-2 text-xs font-bold active:scale-95"
                        >
                          {t("securityCenterReopen", "Reopen")}
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenTriageItem(item)}
                          className="rounded-xl border border-[var(--color-sage-green)]/20 bg-[var(--color-sage-green)]/10 px-4 py-2 text-xs font-bold text-[var(--color-sage-green)] transition-all hover:bg-[var(--color-sage-green)]/15 active:scale-95"
                        >
                          {t("securityCenterOpenItem", "Open item")}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}

              <div className="pt-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-[var(--color-deep-navy)]/45 dark:text-white/45">
                  {t("securityCenterResolvedQueueTitle", "Recently resolved")}
                </div>
                <div className="mt-2 space-y-2">
                  {summary.resolvedTriageItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed px-4 py-4 text-sm text-[var(--color-deep-navy)]/60 dark:border-white/10 dark:text-white/60">
                      {t("securityCenterResolvedEmpty", "No reviewed security item has been fully resolved yet.")}
                    </div>
                  ) : (
                    summary.resolvedTriageItems.map((item) => (
                      <div key={`resolved-${item.issueType}-${item.itemId}`} className="settings-card-surface rounded-2xl px-4 py-4 opacity-80">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-[var(--color-deep-navy)]">{item.title}</span>
                              <span className="settings-badge-positive rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
                                {t("securityCenterResolvedBadge", "Resolved")}
                              </span>
                            </div>
                            <div className="mt-1 text-xs leading-relaxed text-[var(--color-deep-navy)]/65">
                              {t("securityCenterReviewedAt", {
                                defaultValue: "Reviewed at {{at}}",
                                at: item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : "-",
                              })}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onOpenTriageItem(item)}
                            className="rounded-xl border border-[var(--color-sage-green)]/20 bg-[var(--color-sage-green)]/10 px-4 py-2 text-xs font-bold text-[var(--color-sage-green)] transition-all hover:bg-[var(--color-sage-green)]/15 active:scale-95"
                          >
                            {t("securityCenterOpenItem", "Open item")}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-[var(--color-deep-navy)]/45 dark:text-white/45">
                  {t("securityCenterHistoryTitle", "Recent security actions")}
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                  <div className="settings-card-surface rounded-2xl px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                      {t("securityCenterHistoryTrendReviewed", "Reviewed / 7 days")}
                    </div>
                    <div className="mt-1 text-lg font-bold text-[var(--color-deep-navy)]">{recentHistorySummary.reviewed}</div>
                  </div>
                  <div className="settings-card-surface rounded-2xl px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                      {t("securityCenterHistoryTrendReopened", "Reopened / 7 days")}
                    </div>
                    <div className="mt-1 text-lg font-bold text-amber-600">{recentHistorySummary.reopened}</div>
                  </div>
                  <div className="settings-card-surface rounded-2xl px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                      {t("securityCenterHistoryTrendAutoResolved", "Auto-resolved / 7 days")}
                    </div>
                    <div className="mt-1 text-lg font-bold text-[var(--color-sage-green)]">{recentHistorySummary.autoResolved}</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/45 dark:text-white/45">
                    {t("securityCenterHistoryGroupsTitle", "Most active issue groups / 7 days")}
                  </div>
                  {recentIssueTypeSummary.length === 0 ? (
                    <div className="mt-2 rounded-2xl border border-dashed px-4 py-4 text-sm text-[var(--color-deep-navy)]/60 dark:border-white/10 dark:text-white/60">
                      {t("securityCenterHistoryGroupsEmpty", "No issue-group trend is available yet.")}
                    </div>
                  ) : (
                    <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                      {recentIssueTypeSummary.map(([issueType, count]) => (
                        <div key={issueType} className="settings-card-surface rounded-2xl px-4 py-3">
                          <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                            {issueTypeLabel(issueType)}
                          </div>
                          <div className="mt-1 text-lg font-bold text-[var(--color-deep-navy)]">{count}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-2 space-y-2">
                  {historyItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed px-4 py-4 text-sm text-[var(--color-deep-navy)]/60 dark:border-white/10 dark:text-white/60">
                      {t("securityCenterHistoryEmpty", "No security-center review action has been recorded yet.")}
                    </div>
                  ) : (
                    historyItems.slice(0, 6).map((event) => (
                      <div key={event.id} className="settings-card-surface rounded-2xl px-4 py-3 opacity-80">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-[var(--color-deep-navy)]">
                              {event.action === "reviewed"
                                ? t("securityCenterHistoryReviewed", "Marked as reviewed")
                                : event.action === "reopened"
                                  ? t("securityCenterHistoryReopened", "Reopened")
                                  : t("securityCenterHistoryAutoResolved", "Automatically resolved")}
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
                              {event.action === "auto_resolved"
                                ? t("securityCenterHistoryAutoResolvedHint", "Resolved after the risk disappeared")
                                : event.action === "reopened"
                                  ? t("securityCenterHistoryReopenedHint", "Returned to the active queue")
                                  : t("securityCenterHistoryReviewedHint", "Hidden from the active queue for review")}
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

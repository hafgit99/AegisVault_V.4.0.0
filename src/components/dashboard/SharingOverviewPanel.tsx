import { AlertTriangle, ShieldCheck, ShieldX, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SharingOverviewIssue, SharingOverviewReport } from "../../lib/SharingOverviewService";

interface SharingOverviewPanelProps {
  report: SharingOverviewReport;
  onManageSpaces: () => void;
  onOpenIssueItem: (issue: SharingOverviewIssue) => void;
  onResolveIssue: (issue: SharingOverviewIssue) => void;
  onOpenSpace: (spaceId: string) => void;
  activeIssueKey?: string | null;
  activeSpaceId?: string | null;
}

const getRiskBadgeClassName = (riskLevel: SharingOverviewReport["riskLevel"]) => {
  if (riskLevel === "critical") {
    return "bg-red-500/15 text-red-700 dark:bg-red-500/20 dark:text-red-200";
  }
  if (riskLevel === "high") {
    return "bg-orange-500/15 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200";
  }
  if (riskLevel === "medium") {
    return "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100";
  }
  return "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100";
};

const getIssueBadgeClassName = (severity: "high" | "medium") =>
  severity === "high"
    ? "bg-red-500/15 text-red-700 dark:bg-red-500/20 dark:text-red-200"
    : "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100";

export function SharingOverviewPanel({
  report,
  onManageSpaces,
  onOpenIssueItem,
  onResolveIssue,
  onOpenSpace,
  activeIssueKey = null,
  activeSpaceId = null,
}: SharingOverviewPanelProps) {
  const { t } = useTranslation();
  const activeIssue = activeIssueKey
    ? report.issues.find((issue) => `${issue.type}-${issue.itemId}` === activeIssueKey) || null
    : null;
  const activeSpace = activeSpaceId
    ? report.spaces.find((space) => space.id === activeSpaceId) || null
    : null;

  return (
    <div className="settings-panel rounded-3xl p-6 shadow-sm">
      <div className="sr-only" aria-live="polite">
        {activeIssue
          ? t("sharingOverviewLiveIssue", { target: activeIssue.title })
          : activeSpace
            ? t("sharingOverviewLiveSpace", { target: activeSpace.name })
            : ""}
      </div>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[var(--color-sage-green)]" />
            <h3 className="text-lg font-semibold tracking-tight text-[var(--color-deep-navy)] dark:text-white">
              {t("sharingOverviewTitle")}
            </h3>
          </div>
          <p className="max-w-2xl text-xs leading-relaxed text-[var(--color-deep-navy)]/70 dark:text-white/70">
            {t("sharingOverviewDesc")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onManageSpaces}
            className="rounded-2xl border border-[var(--color-sage-green)]/25 bg-[var(--color-sage-green)]/10 px-4 py-3 text-sm font-semibold text-[var(--color-sage-green)] transition-colors hover:bg-[var(--color-sage-green)]/15 dark:border-[var(--color-sage-green)]/20 dark:text-emerald-100"
          >
            {t("sharingOverviewManageBtn")}
          </button>
          <div className="rounded-2xl bg-[var(--color-sage-green)]/10 px-4 py-3 text-center dark:bg-[var(--color-sage-green)]/15">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-deep-navy)]/60 dark:text-white/60">
              {t("sharingOverviewScore")}
            </div>
            <div className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-deep-navy)] dark:text-white">
              {report.score}
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${getRiskBadgeClassName(
              report.riskLevel
            )}`}
          >
            {t(`sharingOverviewRisk.${report.riskLevel}`)}
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="settings-subpanel rounded-2xl border p-4 shadow-inner">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-deep-navy)]/60 dark:text-white/60">
            {t("sharingOverviewMetricSharedItems")}
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--color-deep-navy)] dark:text-white">
            {report.summary.sharedItems}
          </div>
        </div>
        <div className="settings-subpanel rounded-2xl border p-4 shadow-inner">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-deep-navy)]/60 dark:text-white/60">
            {t("sharingOverviewMetricSpaces")}
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--color-deep-navy)] dark:text-white">
            {report.summary.spaces}
          </div>
        </div>
        <div className="settings-subpanel rounded-2xl border p-4 shadow-inner">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-deep-navy)]/60 dark:text-white/60">
            {t("sharingOverviewMetricPendingMembers")}
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--color-deep-navy)] dark:text-white">
            {report.summary.pendingMembers}
          </div>
        </div>
        <div className="settings-subpanel rounded-2xl border p-4 shadow-inner">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-deep-navy)]/60 dark:text-white/60">
            {t("sharingOverviewMetricReviewRequired")}
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--color-deep-navy)] dark:text-white">
            {report.summary.reviewRequiredItems}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="settings-subpanel rounded-2xl border p-5 shadow-inner">
          <div className="mb-3 flex items-center gap-2">
            {report.issues.length > 0 ? (
              <ShieldX className="h-4 w-4 text-red-500" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-[var(--color-sage-green)]" />
            )}
            <h4 className="text-sm font-semibold text-[var(--color-deep-navy)] dark:text-white">
              {t("sharingOverviewIssuesTitle")}
            </h4>
          </div>
          <div className="space-y-3">
            {report.issues.length === 0 ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100">
                {t("sharingOverviewNoIssues")}
              </div>
            ) : (
              <div role="list" className="space-y-3">
                {report.issues.slice(0, 5).map((issue) => (
                <div
                  key={`${issue.type}-${issue.itemId}`}
                  role="listitem"
                  aria-selected={activeIssueKey === `${issue.type}-${issue.itemId}`}
                  className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                    activeIssueKey === `${issue.type}-${issue.itemId}`
                      ? "border-[var(--color-sage-green)]/30 bg-[var(--color-sage-green)]/10 shadow-[0_0_0_1px_rgba(117,141,114,0.12)] dark:border-[var(--color-sage-green)]/25 dark:bg-[var(--color-sage-green)]/10"
                      : "border-black/5 bg-white/70 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[var(--color-deep-navy)] dark:text-white">
                        {issue.title}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--color-deep-navy)]/70 dark:text-white/70">
                        {t(issue.messageKey)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeIssueKey === `${issue.type}-${issue.itemId}` ? (
                        <span className="rounded-full bg-[var(--color-sage-green)]/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-sage-green)] dark:text-emerald-100">
                          {t("sharingOverviewSelectedBadge")}
                        </span>
                      ) : null}
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${getIssueBadgeClassName(
                          issue.severity
                        )}`}
                      >
                        {t(`sharingOverviewSeverity.${issue.severity}`)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onResolveIssue(issue)}
                      aria-label={t("sharingOverviewResolveAria", { target: issue.title })}
                      className="rounded-full bg-[var(--color-sage-green)]/12 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-sage-green)] transition-colors hover:bg-[var(--color-sage-green)]/20 dark:text-emerald-100"
                    >
                      {issue.type === "review_required"
                        ? t("sharingOverviewMarkReviewed")
                        : issue.type === "orphaned_space" || issue.type === "no_members"
                        ? t("sharingOverviewManageSpaces")
                        : t("sharingOverviewOpenItem")}
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenIssueItem(issue)}
                      aria-label={t("sharingOverviewOpenAria", { target: issue.title })}
                      className="rounded-full border border-[var(--color-sage-green)]/20 bg-transparent px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-deep-navy)]/70 transition-colors hover:bg-black/5 dark:text-white/75 dark:hover:bg-white/10"
                    >
                      {t("sharingOverviewTapToOpen")}
                    </button>
                  </div>
                </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="settings-subpanel rounded-2xl border p-5 shadow-inner">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h4 className="text-sm font-semibold text-[var(--color-deep-navy)] dark:text-white">
                {t("sharingOverviewActionsTitle")}
              </h4>
            </div>
            <div className="space-y-2">
              {report.actionKeys.map((actionKey) => (
                <div
                  key={actionKey}
                  className="rounded-2xl border border-black/5 bg-white/70 px-4 py-3 text-sm text-[var(--color-deep-navy)]/80 dark:border-white/10 dark:bg-white/5 dark:text-white/80"
                >
                  {t(actionKey)}
                </div>
              ))}
            </div>
          </div>

          <div className="settings-subpanel rounded-2xl border p-5 shadow-inner">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-[var(--color-deep-navy)] dark:text-white">
                {t("sharingOverviewSpacesTitle")}
              </h4>
              <span className="text-[11px] text-[var(--color-deep-navy)]/55 dark:text-white/55">
                {t("sharingOverviewSpacesCount", { count: report.spaces.length })}
              </span>
            </div>
            <div className="space-y-2">
              {report.spaces.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/10 px-4 py-3 text-sm text-[var(--color-deep-navy)]/60 dark:border-white/10 dark:text-white/60">
                  {t("sharingOverviewSpacesEmpty")}
                </div>
              ) : (
                <div role="list" className="space-y-2">
                  {report.spaces.slice(0, 4).map((space) => (
                  <button
                    key={space.id}
                    type="button"
                    onClick={() => onOpenSpace(space.id)}
                    aria-pressed={activeSpaceId === space.id}
                    aria-label={t("sharingOverviewOpenSpaceAria", { target: space.name })}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                      activeSpaceId === space.id
                        ? "border-[var(--color-sage-green)]/30 bg-[var(--color-sage-green)]/10 shadow-[0_0_0_1px_rgba(117,141,114,0.12)] dark:border-[var(--color-sage-green)]/25 dark:bg-[var(--color-sage-green)]/10"
                        : "border-black/5 bg-white/70 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[var(--color-deep-navy)] dark:text-white">
                          {space.name}
                        </div>
                        <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--color-deep-navy)]/50 dark:text-white/50">
                          {t(`sharingOverviewKind.${space.kind}`)}
                        </div>
                      </div>
                      <div className="text-right text-xs text-[var(--color-deep-navy)]/70 dark:text-white/70">
                        {activeSpaceId === space.id ? (
                          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-sage-green)] dark:text-emerald-100">
                            {t("sharingOverviewSelectedBadge")}
                          </div>
                        ) : null}
                        <div>{t("sharingOverviewSpaceItems", { count: space.itemCount })}</div>
                        <div>{t("sharingOverviewSpaceMembers", { count: space.activeMembers })}</div>
                      </div>
                    </div>
                  </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

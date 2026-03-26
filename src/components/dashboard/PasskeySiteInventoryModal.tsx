 
import { CheckSquare, Square, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PasskeyInventorySiteEntry } from "../../lib/PasskeyInventoryService";

interface PasskeySiteInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: PasskeyInventorySiteEntry[];
  remediationResult?: {
    kind: "missing_rp_id" | "missing_credential_id" | "future_mode";
    count: number;
    at: number;
  } | null;
  onOpenEntry: (entry: PasskeyInventorySiteEntry) => void;
  onBulkFixRp: (selectedIds?: number[]) => void;
  onBulkFixCredential: (selectedIds?: number[]) => void;
  onBulkConvertFuture: (selectedIds?: number[]) => void;
  onOpenPolicy: () => void;
  onOpenAudit: () => void;
}

type SitePasskeyFilter =
  | "all"
  | "attention"
  | "healthy"
  | "future"
  | "missing_rp_id"
  | "missing_credential_id";

type SitePasskeySort = "risk_first" | "title" | "healthy_first";

export function PasskeySiteInventoryModal({
  isOpen,
  onClose,
  entries,
  remediationResult,
  onOpenEntry,
  onBulkFixRp,
  onBulkFixCredential,
  onBulkConvertFuture,
  onOpenPolicy,
  onOpenAudit,
}: PasskeySiteInventoryModalProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<SitePasskeyFilter>("all");
  const [sortBy, setSortBy] = useState<SitePasskeySort>("risk_first");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
     
    if (!isOpen) {
      setSelectedIds([]);
      setFilter("all");
      setSortBy("risk_first");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !remediationResult) return;
    const nextRisky = entries.find((entry) => entry.riskFlags.length > 0) || null;
    if (nextRisky) {
       
      setFilter("attention");
      setSortBy("risk_first");
      setSelectedIds([nextRisky.id]);
      return;
    }
     
    setSelectedIds([]);
  }, [entries, isOpen, remediationResult]);

  const filteredEntries = useMemo(() => {
    const base =
      filter === "attention"
        ? entries.filter((entry) => entry.riskFlags.length > 0)
        : filter === "healthy"
          ? entries.filter((entry) => entry.riskFlags.length === 0)
          : filter === "future"
            ? entries.filter((entry) => entry.mode === "site_passkey_future_rp")
            : filter === "missing_rp_id" || filter === "missing_credential_id"
              ? entries.filter((entry) => entry.riskFlags.includes(filter))
              : entries;

    return [...base].sort((left, right) => {
      if (sortBy === "title") {
        return left.title.localeCompare(right.title);
      }
      if (sortBy === "healthy_first") {
        if (left.riskFlags.length === right.riskFlags.length) return left.title.localeCompare(right.title);
        return left.riskFlags.length - right.riskFlags.length;
      }
      if (left.riskFlags.length === right.riskFlags.length) return left.title.localeCompare(right.title);
      return right.riskFlags.length - left.riskFlags.length;
    });
  }, [entries, filter, sortBy]);
  const nextPriorityEntry = filteredEntries.find((entry) => entry.riskFlags.length > 0) || filteredEntries[0] || null;
  const queueSummary = {
    remainingRisk: filteredEntries.filter((entry) => entry.riskFlags.length > 0).length,
    healthy: filteredEntries.filter((entry) => entry.riskFlags.length === 0).length,
  };

  const allFilteredSelected =
    filteredEntries.length > 0 && filteredEntries.every((entry) => selectedIds.includes(entry.id));
  const selectedEntries = entries.filter((entry) => selectedIds.includes(entry.id));
  const selectedSummary = {
    total: selectedEntries.length,
    missingRp: selectedEntries.filter((entry) => entry.riskFlags.includes("missing_rp_id")).length,
    missingCredential: selectedEntries.filter((entry) => entry.riskFlags.includes("missing_credential_id")).length,
    futureMode: selectedEntries.filter((entry) => entry.riskFlags.includes("future_mode")).length,
  };
  const applicableSelectionCounts = {
    missingRp: selectedEntries.filter((entry) => entry.riskFlags.includes("missing_rp_id")).length,
    missingCredential: selectedEntries.filter((entry) => entry.riskFlags.includes("missing_credential_id")).length,
    futureMode: selectedEntries.filter((entry) => entry.riskFlags.includes("future_mode")).length,
  };

  const toggleSelected = (id: number) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds((current) => current.filter((id) => !filteredEntries.some((entry) => entry.id === id)));
      return;
    }
    setSelectedIds((current) => Array.from(new Set([...current, ...filteredEntries.map((entry) => entry.id)])));
  };

  const getEntryRecommendation = (entry: PasskeyInventorySiteEntry) => {
    if (entry.riskFlags.includes("missing_rp_id")) {
      return {
        summary: t("passkeyInventoryEntryHintMissingRp", "This record should get an RP ID before it is considered complete."),
        primaryLabel: t("passkeyInventoryBulkFixRp", "Auto-fill RP ID"),
        primaryAction: () => onBulkFixRp([entry.id]),
      };
    }
    if (entry.riskFlags.includes("missing_credential_id")) {
      return {
        summary: t("passkeyInventoryEntryHintMissingCredential", "This record is missing a credential ID and should be completed from the current vault data."),
        primaryLabel: t("passkeyInventoryBulkFixCredential", "Auto-fill credential ID"),
        primaryAction: () => onBulkFixCredential([entry.id]),
      };
    }
    if (entry.riskFlags.includes("future_mode")) {
      return {
        summary: t("passkeyInventoryEntryHintFutureMode", "This record is still tagged as future mode and should be converted to the active site-passkey program."),
        primaryLabel: t("passkeyInventoryBulkConvertFuture", "Convert future mode"),
        primaryAction: () => onBulkConvertFuture([entry.id]),
      };
    }
    return {
      summary: t("passkeyInventoryEntryHintHealthy", "This record looks complete. You can still open it to review RP, credential, and display details."),
      primaryLabel: t("passkeyInventoryOpenRecord", "Open record"),
      primaryAction: () => onOpenEntry(entry),
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[var(--color-deep-navy)]/55 backdrop-blur-sm" onClick={onClose} />
      <div className="settings-drawer-surface relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/20 shadow-2xl dark:border-white/10">
        <div className="flex items-start justify-between gap-4 border-b border-black/5 px-6 py-5 dark:border-white/10">
          <div>
            <h3 className="text-xl font-semibold text-[var(--color-deep-navy)] dark:text-white">
              {t("passkeyInventorySiteModalTitle", "Site passkey inventory")}
            </h3>
            <p className="mt-1 text-sm text-[var(--color-deep-navy)]/70 dark:text-white/70">
              {t("passkeyInventorySiteModalDesc", "Review tracked site passkeys, focus risks, and open records for remediation.")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[var(--color-deep-navy)]/60 transition hover:bg-black/5 hover:text-[var(--color-deep-navy)] dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="settings-card-surface-muted border-b border-black/5 px-6 py-4 dark:border-white/10">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: t("passkeyInventoryFilterAll", "All") },
              { key: "attention", label: t("passkeyInventoryFilterAttention", "Needs review") },
              { key: "healthy", label: t("passkeyInventoryFilterHealthy", "Healthy") },
              { key: "future", label: t("passkeyInventoryFilterFuture", "Future RP") },
              { key: "missing_rp_id", label: t("passkeyInventoryMissingRpIdShort", "Missing RP") },
              { key: "missing_credential_id", label: t("passkeyInventoryMissingCredentialShort", "Missing credential") },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key as SitePasskeyFilter)}
                className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${
                  filter === item.key
                    ? "settings-filter-chip settings-filter-chip-active"
                    : "settings-filter-chip"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/60 dark:text-white/60">
            <span>{t("passkeyInventorySortLabel", "Sort")}</span>
            {[
              { key: "risk_first", label: t("passkeyInventorySortRiskFirst", "Risk first") },
              { key: "title", label: t("passkeyInventorySortTitle", "Title") },
              { key: "healthy_first", label: t("passkeyInventorySortHealthyFirst", "Healthy first") },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setSortBy(item.key as SitePasskeySort)}
                className={`rounded-full px-2.5 py-1 ${
                  sortBy === item.key
                    ? "settings-filter-chip settings-filter-chip-active"
                    : "settings-filter-chip"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[11px] text-[var(--color-deep-navy)]/70 dark:text-white/70">
            <div>
              {t("passkeyInventoryFilterCount", {
                shown: filteredEntries.length,
                total: entries.length,
                defaultValue: "{{shown}} / {{total}} records shown",
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAllFiltered}
                className="settings-filter-chip rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
              >
                {allFilteredSelected
                  ? t("passkeyInventoryClearSelection", "Clear selection")
                  : t("passkeyInventorySelectVisible", "Select visible")}
              </button>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                {t("passkeyInventorySelectedCount", {
                  count: selectedIds.length,
                  defaultValue: "{{count}} selected",
                })}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onBulkFixRp(selectedIds.length > 0 ? selectedIds : undefined)}
                className="settings-filter-chip rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
                disabled={selectedIds.length > 0 && applicableSelectionCounts.missingRp === 0}
              >
                {t("passkeyInventoryBulkFixRp", "Auto-fill RP ID")}
              </button>
              <button
                type="button"
                onClick={() => onBulkFixCredential(selectedIds.length > 0 ? selectedIds : undefined)}
                className="settings-filter-chip rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
                disabled={selectedIds.length > 0 && applicableSelectionCounts.missingCredential === 0}
              >
                {t("passkeyInventoryBulkFixCredential", "Auto-fill credential ID")}
              </button>
              <button
                type="button"
                onClick={() => onBulkConvertFuture(selectedIds.length > 0 ? selectedIds : undefined)}
                className="settings-filter-chip rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
                disabled={selectedIds.length > 0 && applicableSelectionCounts.futureMode === 0}
              >
                {t("passkeyInventoryBulkConvertFuture", "Convert future mode")}
              </button>
            </div>
          </div>
          {selectedSummary.total > 0 ? (
            <div className="settings-card-surface-muted mt-3 rounded-2xl border px-4 py-3 text-[11px] text-[var(--color-deep-navy)] dark:text-white">
              <div className="font-semibold">
                {t("passkeyInventorySelectionSummaryTitle", "Selection summary")}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="settings-badge-muted rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest">
                  {t("passkeyInventorySelectedCount", { count: selectedSummary.total, defaultValue: "{{count}} selected" })}
                </span>
                <span className="rounded-full bg-amber-500/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">
                  {t("passkeyInventorySelectionMissingRp", { count: selectedSummary.missingRp, defaultValue: "{{count}} missing RP" })}
                </span>
                <span className="rounded-full bg-amber-500/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">
                  {t("passkeyInventorySelectionMissingCredential", { count: selectedSummary.missingCredential, defaultValue: "{{count}} missing credential" })}
                </span>
                <span className="rounded-full bg-amber-500/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">
                  {t("passkeyInventorySelectionFutureMode", { count: selectedSummary.futureMode, defaultValue: "{{count}} future mode" })}
                </span>
              </div>
            </div>
          ) : null}
          {selectedSummary.total > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/60 dark:text-white/60">
              <span>{t("passkeyInventorySelectionAppliesRp", { count: applicableSelectionCounts.missingRp, defaultValue: "{{count}} RP fixable" })}</span>
              <span>{t("passkeyInventorySelectionAppliesCredential", { count: applicableSelectionCounts.missingCredential, defaultValue: "{{count}} credential fixable" })}</span>
              <span>{t("passkeyInventorySelectionAppliesFuture", { count: applicableSelectionCounts.futureMode, defaultValue: "{{count}} future convertible" })}</span>
            </div>
          ) : null}
          {nextPriorityEntry ? (
            <div className="settings-card-surface-muted mt-3 rounded-2xl border px-4 py-3 text-[11px] text-[var(--color-deep-navy)] dark:text-white">
              <div className="font-semibold">
                {t("passkeyInventoryQueueTitle", "Triage queue")}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-amber-500/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">
                  {t("passkeyInventoryQueueRemainingRisk", {
                    count: queueSummary.remainingRisk,
                    defaultValue: "{{count}} remaining risk",
                  })}
                </span>
                <span className="rounded-full bg-[var(--color-sage-green)]/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-sage-green)]">
                  {t("passkeyInventoryQueueHealthyCount", {
                    count: queueSummary.healthy,
                    defaultValue: "{{count}} healthy",
                  })}
                </span>
              </div>
              <div className="mt-1 leading-relaxed opacity-75">
                {nextPriorityEntry.riskFlags.length > 0
                  ? t("passkeyInventoryQueueDesc", {
                      title: nextPriorityEntry.title,
                      defaultValue: "Next priority record: {{title}}",
                    })
                  : t("passkeyInventoryQueueHealthyDesc", "No open risk remains in this filtered queue.")}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onOpenEntry(nextPriorityEntry)}
                  className="settings-pill-secondary rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
                >
                  {t("passkeyInventoryQueueOpenNext", "Open next item")}
                </button>
              </div>
            </div>
          ) : null}
          {remediationResult ? (
            <div className="settings-card-surface-muted mt-3 rounded-2xl border px-4 py-3 text-[11px] text-[var(--color-deep-navy)] dark:text-white">
              <div className="font-semibold">
                {t("passkeyInventoryQueueResultTitle", "Last remediation result")}
              </div>
              <div className="mt-1 leading-relaxed opacity-75">
                {remediationResult.kind === "missing_rp_id"
                  ? t("passkeyInventoryQueueResultRp", {
                      count: remediationResult.count,
                      defaultValue: "{{count}} RP ID issue updated. Queue moved to the next item.",
                    })
                  : remediationResult.kind === "missing_credential_id"
                    ? t("passkeyInventoryQueueResultCredential", {
                        count: remediationResult.count,
                        defaultValue: "{{count}} credential issue updated. Queue moved to the next item.",
                      })
                    : t("passkeyInventoryQueueResultFuture", {
                        count: remediationResult.count,
                        defaultValue: "{{count}} future-mode issue updated. Queue moved to the next item.",
                      })}
              </div>
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenPolicy}
              className="settings-pill-secondary rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
            >
              {t("passkeyInventoryOpenPolicy", "Open policy")}
            </button>
            <button
              type="button"
              onClick={onOpenAudit}
              className="settings-pill-secondary rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
            >
              {t("passkeyInventoryOpenAudit", "Open revoke/audit")}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-3">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="settings-card-surface rounded-2xl border px-4 py-4 text-left transition hover:border-[var(--color-sage-green)]/25 hover:bg-[var(--color-sage-green)]/8 dark:hover:bg-[var(--color-sage-green)]/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => toggleSelected(entry.id)}
                    className="mt-0.5 shrink-0 rounded-lg p-1 text-[var(--color-deep-navy)]/60 transition hover:bg-black/5 hover:text-[var(--color-deep-navy)] dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-pressed={selectedIds.includes(entry.id)}
                  >
                    {selectedIds.includes(entry.id) ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onOpenEntry(entry)}
                      className="font-semibold text-[var(--color-deep-navy)] transition hover:text-[var(--color-sage-green)] dark:text-white dark:hover:text-emerald-200"
                    >
                      {entry.title}
                    </button>
                    <div className="mt-1 text-xs text-[var(--color-deep-navy)]/65 dark:text-white/65">
                      {entry.rpId || t("passkeyInventoryMissingRpId", "Missing RP ID")}
                    </div>
                    {entry.displayName ? (
                      <div className="mt-1 text-[11px] text-[var(--color-deep-navy)]/55 dark:text-white/55">
                        {entry.displayName}
                      </div>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/50 dark:text-white/50">
                      <span className="settings-badge-muted rounded-full px-2 py-1">
                        {entry.mode === "site_passkey_future_rp"
                          ? t("passkeyInventoryModeFutureRp", "Future RP")
                          : t("passkeyInventoryModeSiteMvp", "Site passkey MVP")}
                      </span>
                      <span className="settings-badge-muted rounded-full px-2 py-1 font-mono">
                        {entry.id}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    {entry.riskFlags.length === 0 ? (
                      <span className="rounded-full bg-[var(--color-sage-green)]/12 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-sage-green)]">
                        {t("passkeyInventoryHealthy", "Healthy")}
                      </span>
                    ) : (
                      entry.riskFlags.map((flag) => (
                        <span
                          key={`${entry.id}-${flag}`}
                          className="rounded-full bg-amber-500/12 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300"
                        >
                          {flag === "missing_rp_id"
                            ? t("passkeyInventoryMissingRpIdShort", "Missing RP")
                            : flag === "missing_credential_id"
                              ? t("passkeyInventoryMissingCredentialShort", "Missing credential")
                              : t("passkeyInventoryFutureModeShort", "Future mode")}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div className="settings-card-surface-muted mt-3 rounded-2xl border px-3 py-3">
                  <div className="settings-section-kicker">
                    {t("passkeyInventoryEntryRecommendedLabel", "Recommended next step")}
                  </div>
                  <div className="settings-section-copy mt-2">
                    {getEntryRecommendation(entry).summary}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={getEntryRecommendation(entry).primaryAction}
                      className="settings-pill-secondary rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
                    >
                      {getEntryRecommendation(entry).primaryLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenEntry(entry)}
                      className="settings-badge-muted rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
                    >
                      {t("passkeyInventoryOpenRecord", "Open record")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredEntries.length === 0 ? (
              <div className="settings-card-surface-muted rounded-2xl border border-dashed px-4 py-10 text-center text-sm text-[var(--color-deep-navy)]/60 dark:text-white/60">
                {t("passkeyInventoryFilterEmpty", "No site passkey record matches this filter.")}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

import { History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SharingAuditEvent } from '../../lib/SecureAppSettings';
import { SharingAuditService, type SharingAuditFilter } from '../../lib/SharingAuditService';

interface SharingAuditPanelProps {
  events: SharingAuditEvent[];
  activeFilter: SharingAuditFilter;
  onFilterChange: (filter: SharingAuditFilter) => void;
  highlightedEventIds?: string[];
  focusLabel?: string | null;
  onOpenEventTarget?: (event: SharingAuditEvent) => void;
  onFocusEventTarget?: (event: SharingAuditEvent) => void;
}

const mapAuditLabelKey = (type: SharingAuditEvent['type']) => {
  if (type === 'space_saved') return 'sharingAuditType.space_saved';
  if (type === 'space_deleted') return 'sharingAuditType.space_deleted';
  if (type === 'assignment_saved') return 'sharingAuditType.assignment_saved';
  if (type === 'assignment_cleared') return 'sharingAuditType.assignment_cleared';
  return 'sharingAuditType.assignment_reviewed';
};

export function SharingAuditPanel({
  events,
  activeFilter,
  onFilterChange,
  highlightedEventIds = [],
  focusLabel,
  onOpenEventTarget,
  onFocusEventTarget,
}: SharingAuditPanelProps) {
  const { t } = useTranslation();
  const filters: SharingAuditFilter[] = ['all', 'spaces', 'assignments', 'reviews'];
  const highlighted = new Set(highlightedEventIds);

  return (
    <div className="settings-subpanel rounded-2xl border p-5 shadow-inner">
      <div className="sr-only" aria-live="polite">
        {focusLabel ? t('sharingAuditLiveFocus', { target: focusLabel }) : ''}
      </div>
      <div className="mb-3 flex items-center gap-2">
        <History className="h-4 w-4 text-[var(--color-sage-green)]" />
        <h4 className="text-sm font-semibold text-[var(--color-deep-navy)] dark:text-white">
          {t('sharingAuditTitle')}
        </h4>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => onFilterChange(filter)}
            className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
              activeFilter === filter
                ? 'settings-filter-chip settings-filter-chip-active'
                : 'settings-filter-chip'
            }`}
          >
            {t(`sharingAuditFilter.${filter}`)}
          </button>
        ))}
      </div>

      {focusLabel ? (
        <div className="mb-3 rounded-2xl border border-[var(--color-sage-green)]/20 bg-[var(--color-sage-green)]/8 px-4 py-3 text-xs text-[var(--color-deep-navy)]/75 dark:text-white/75">
          {t('sharingAuditFocusLabel', { target: focusLabel })}
        </div>
      ) : null}

      <div className="space-y-2">
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 px-4 py-3 text-sm text-[var(--color-deep-navy)]/60 dark:border-white/10 dark:text-white/60">
            {t('sharingAuditEmpty')}
          </div>
        ) : (
          events
            .slice()
            .reverse()
            .slice(0, 5)
            .map((event) => {
              const navigationTarget = SharingAuditService.getNavigationTarget(event);
              return (
                <div
                  key={event.id}
                  className={`rounded-2xl border px-4 py-3 ${
                    highlighted.has(event.id)
                      ? 'border-[var(--color-sage-green)]/30 bg-[var(--color-sage-green)]/10 dark:border-[var(--color-sage-green)]/25 dark:bg-[var(--color-sage-green)]/10'
                      : 'border-black/5 bg-white/70 dark:border-white/10 dark:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[var(--color-deep-navy)] dark:text-white">
                        {t(mapAuditLabelKey(event.type))}
                      </div>
                      <div className="mt-1 text-xs text-[var(--color-deep-navy)]/65 dark:text-white/65">
                        {event.detail || event.spaceId || event.entryId || t('sharingAuditUnknown')}
                      </div>
                    </div>
                    <div className="text-[11px] text-[var(--color-deep-navy)]/50 dark:text-white/50">
                      {new Date(event.at).toLocaleString()}
                    </div>
                  </div>
                  {navigationTarget ? (
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        onClick={() => onFocusEventTarget?.(event)}
                        aria-label={t('sharingAuditFocusAria', {
                          target:
                            event.detail ||
                            event.spaceId ||
                            event.entryId ||
                            t('sharingAuditUnknown'),
                        })}
                        className="rounded-full border border-black/10 bg-black/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-deep-navy)]/70 transition-colors hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10"
                      >
                        {t('sharingAuditFocusTarget')}
                      </button>
                      <button
                        onClick={() => onOpenEventTarget?.(event)}
                        aria-label={t('sharingAuditOpenAria', {
                          target:
                            event.detail ||
                            event.spaceId ||
                            event.entryId ||
                            t('sharingAuditUnknown'),
                        })}
                        className="rounded-full border border-[var(--color-sage-green)]/20 bg-[var(--color-sage-green)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-sage-green)] transition-colors hover:bg-[var(--color-sage-green)]/20"
                      >
                        {navigationTarget.kind === 'entry'
                          ? t('sharingAuditOpenEntry')
                          : t('sharingAuditOpenSpace')}
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}

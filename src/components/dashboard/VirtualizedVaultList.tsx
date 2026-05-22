import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { VaultEntry } from '../../vaultService';
import { VaultEntryCard } from './VaultEntryCard';

interface VirtualizedVaultListProps {
  entries: VaultEntry[];
  onEdit: (entry: VaultEntry) => void;
  viewDensity: 'comfortable' | 'compact';
}

/**
 * Windowed vault list — only renders the cards visible in the scroll
 * viewport plus a small overscan buffer. This keeps DOM node count
 * constant (~20-30) regardless of the total entry count, preventing
 * the massive layout/paint cost of rendering hundreds of motion.article
 * elements simultaneously.
 *
 * Uses a simple "estimate + measure" strategy:
 *   1. Estimate each row height (compact ≈ 120px, comfortable ≈ 150px).
 *   2. Compute which indices fall inside the visible window + overscan.
 *   3. Render only those cards inside a spacer that preserves scroll height.
 */
export function VirtualizedVaultList({ entries, onEdit, viewDensity }: VirtualizedVaultListProps) {
  const [expandedEntryId, setExpandedEntryId] = useState<number | null>(null);

  // Gap between cards (matches gap-3 = 12px / gap-4 = 16px)
  const gap = viewDensity === 'compact' ? 12 : 16;
  // Estimated height per card row including gap
  const estimatedRowHeight = viewDensity === 'compact' ? 95 + gap : 115 + gap;
  // How many extra rows to render above/below the viewport
  const overscan = 5;

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(800);

  // Measure container on mount and resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      setContainerHeight(el.clientHeight);
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (el) setScrollTop(el.scrollTop);
  }, []);

  // Calculate which entries to render
  const { startIndex, endIndex, totalHeight, offsetTop } = useMemo(() => {
    const total = entries.length;
    if (total === 0) {
      return { startIndex: 0, endIndex: 0, totalHeight: 0, offsetTop: 0 };
    }

    const totalH = total * estimatedRowHeight - gap; // last item has no trailing gap

    // First visible index
    let start = Math.floor(scrollTop / estimatedRowHeight) - overscan;
    start = Math.max(0, start);

    // Last visible index
    let end = Math.ceil((scrollTop + containerHeight) / estimatedRowHeight) + overscan;
    end = Math.min(total, end);

    const offset = start * estimatedRowHeight;

    return { startIndex: start, endIndex: end, totalHeight: totalH, offsetTop: offset };
  }, [entries.length, estimatedRowHeight, gap, scrollTop, containerHeight, overscan]);

  const visibleEntries = useMemo(
    () => entries.slice(startIndex, endIndex),
    [entries, startIndex, endIndex]
  );

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`relative flex h-full min-h-[400px] w-full flex-col overflow-y-auto pr-2 custom-scrollbar`}
      role="list"
      aria-label="Virtualized secret list"
    >
      {entries.length === 0 ? (
        <div className="flex min-h-[320px] items-center justify-center text-sm italic opacity-40">
          No items found
        </div>
      ) : (
        /* Spacer container that maintains the full scroll height */
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Positioned wrapper for the visible slice */}
          <div
            style={{
              position: 'absolute',
              top: offsetTop,
              left: 0,
              right: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: `${gap}px`,
            }}
          >
            {visibleEntries.map((entry) => (
              <div key={entry.id} className="w-full v5-virtualized-entry-shell">
                <VaultEntryCard
                  entry={entry}
                  onEdit={onEdit}
                  isExpanded={expandedEntryId === entry.id}
                  onExpandedChange={(expanded) => setExpandedEntryId(expanded ? entry.id : null)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

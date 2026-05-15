import { ChevronRight, Hash, Trash2, Tag, ShieldCheck, Download } from 'lucide-react';
import { GlowCard } from '../ui/GlowCard';
import { getCategoryIcon } from '../../lib/getCategoryIcon';
import { useVault } from '../../contexts/VaultContext';
import { useTranslation } from 'react-i18next';

interface CategorySidebarProps {
  onDownloadEmergencyKit: () => void;
  isGeneratingKit: boolean;
}

/**
 * CategorySidebar — Kategori filtreleme, etiketler, çöp kutusu ve Emergency Kit widget'ları.
 * Sağ sidebar'ın alt kısmında yer alır.
 */
export function CategorySidebar({ onDownloadEmergencyKit, isGeneratingKit }: CategorySidebarProps) {
  const { t } = useTranslation();
  const { categoryFilter, setCategoryFilter, uniqueTags } = useVault();

  const categories = ['General', 'Cards', 'Identities', 'Notes', 'WiFi', 'CryptoWallet'];

  return (
    <>
      {/* Categories */}
      <GlowCard className="category-surface v5-rail-card v5-category-card rounded-xl p-5 flex-1 flex flex-col">
        <div className="v5-rail-heading mb-4">
          <div className="flex min-w-0 items-center gap-2">
            <Hash className="h-4 w-4" />
            <h3 className="truncate text-sm font-semibold uppercase tracking-widest">
              {t('categoriesTitle')}
            </h3>
          </div>
          <span className="v5-rail-status-chip">
            {categories.length + 1} {t('categoryScopeCount')}
          </span>
        </div>
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => setCategoryFilter('')}
            className={`category-item v5-category-item flex items-center justify-between px-3 py-2.5 rounded-xl transition-all w-full text-left ${
              categoryFilter === '' ? 'category-item-active shadow-sm' : 'bg-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <Hash className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-sm">{t('allVaults')}</span>
            </div>
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`category-item v5-category-item flex items-center justify-between px-3 py-2.5 rounded-xl transition-all w-full text-left ${
                categoryFilter === cat ? 'category-item-active shadow-sm' : 'bg-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                {getCategoryIcon(cat)}
                <span className="font-medium text-sm">{t(cat.toLowerCase())}</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-30" />
            </button>
          ))}
          <div className="h-px sidebar-divider my-1 w-full" />
          <button
            onClick={() => setCategoryFilter('Trash')}
            className={`category-item v5-category-item flex items-center justify-between px-3 py-2.5 rounded-xl transition-all w-full text-left ${
              categoryFilter === 'Trash'
                ? 'category-item-active shadow-sm text-red-600 dark:text-red-400'
                : 'bg-transparent text-gray-500 dark:text-gray-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5" />
              <span className="font-medium text-sm">{t('trash')}</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-30" />
          </button>

          {/* Tags List */}
          {uniqueTags.length > 0 && (
            <>
              <div className="h-px sidebar-divider my-2 w-full" />
              <div className="flex flex-wrap gap-2">
                {uniqueTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setCategoryFilter(categoryFilter === `#${tag}` ? '' : `#${tag}`)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-all ${
                      categoryFilter === `#${tag}`
                        ? 'bg-[var(--color-sage-green)] text-[var(--color-deep-navy)] border-transparent shadow-[0_0_10px_rgba(114,136,111,0.4)]'
                        : 'tag-btn border-black/10'
                    }`}
                  >
                    <Tag className="w-3 h-3 opacity-70" /> {tag}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </GlowCard>

      {/* Offline PWA & Emergency Kit */}
      <GlowCard className="offline-surface v5-rail-card v5-offline-card rounded-xl shadow-lg p-5">
        <div className="flex flex-col items-center text-center gap-3 relative z-10">
          <div className="v5-offline-icon w-11 h-11 bg-white/80 dark:bg-white/10 rounded-xl flex items-center justify-center shadow-inner">
            <ShieldCheck className="w-6 h-6 text-[var(--color-sage-green)]" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">{t('offlinePwaActive')}</h4>
            <p className="text-xs opacity-60 mt-1">{t('airgappedSync')}</p>
          </div>
          <div className="v5-offline-trust-row">
            <span>{t('offlineTrustLocal')}</span>
            <span>{t('offlineTrustRecovery')}</span>
          </div>

          <button
            onClick={onDownloadEmergencyKit}
            disabled={isGeneratingKit}
            className="emergency-kit-btn mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            {isGeneratingKit ? (
              <span className="animate-pulse">{t('generatingPdf')}</span>
            ) : (
              <>
                <Download className="w-4 h-4" /> {t('emergencyKitButton')}
              </>
            )}
          </button>
        </div>
      </GlowCard>
    </>
  );
}

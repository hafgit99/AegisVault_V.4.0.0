import { useEffect } from 'react';
import {
  Search,
  LogOut,
  Settings,
  Globe,
  Heart,
  Clock,
  Rows3,
  Rows2,
  Moon,
  Sun,
  AtSign,
} from 'lucide-react';
import { SecurityScoreGauge } from '../ui/SecurityScoreGauge';
import { useVault } from '../../contexts/VaultContext';
import { useTranslation } from 'react-i18next';

type WindowWithElectronLanguageBridge = Window &
  typeof globalThis & {
    aegisElectron?: {
      setUiLanguage?: (language: string) => Promise<unknown>;
    };
  };

const getSafePostMessageTarget = () => {
  if (typeof window === 'undefined') return '*';
  const origin = window.location.origin;
  if (!origin || origin === 'null' || origin.startsWith('file:')) {
    return '*';
  }
  return origin;
};

interface DashboardHeaderProps {
  onSettingsOpen: () => void;
  onDonationOpen: () => void;
  onQuickAliasOpen: () => void;
  onLogoClick: () => void;
  themeMode: 'light' | 'dark';
  onThemeToggle: () => void;
  searchRef?: React.RefObject<HTMLInputElement | null>;
}

export function DashboardHeader({
  onSettingsOpen,
  onDonationOpen,
  onQuickAliasOpen,
  onLogoClick,
  themeMode,
  onThemeToggle,
  searchRef,
}: DashboardHeaderProps) {
  const { t, i18n } = useTranslation();
  const {
    watchtower,
    searchQuery,
    setSearchQuery,
    searchScope,
    setSearchScope,
    viewDensity,
    setViewDensity,
    sortOption,
    setSortOption,
    handleLock,
    timeLeft,
    timeoutSeconds,
  } = useVault();
  const syncLanguageToDesktop = (language: string) => {
    void (window as WindowWithElectronLanguageBridge).aegisElectron?.setUiLanguage?.(language);
  };

  const handleLanguageToggle = () => {
    const nextLanguage = i18n.language.startsWith('en') ? 'tr' : 'en';
    i18n.changeLanguage(nextLanguage);
    syncLanguageToDesktop(nextLanguage);
    window.postMessage(
      { type: 'AEGIS_UI_LANGUAGE', language: nextLanguage },
      getSafePostMessageTarget()
    );
  };

  useEffect(() => {
    const activeLanguage = i18n.language.startsWith('tr') ? 'tr' : 'en';
    syncLanguageToDesktop(activeLanguage);
    window.postMessage(
      { type: 'AEGIS_UI_LANGUAGE', language: activeLanguage },
      getSafePostMessageTarget()
    );
  }, [i18n.language]);

  return (
    <>
      {/* Clipboard Timeline Progress Tracker */}
      {timeLeft > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 clipboard-monitor box-shadow rounded-full flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-[var(--color-sage-green)] animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-deep-navy)]">
              {t('sanitizingClipboard')} {timeLeft}s
            </span>
          </div>
          <div className="w-40 h-1 entry-divider rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-sage-green)] transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${(timeLeft / timeoutSeconds) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <header className="dashboard-header v5-dashboard-header mx-auto mb-6 flex max-w-[1400px] flex-col gap-3 px-4 py-2 xl:px-8">
        <div className="dashboard-header-main flex items-center justify-between gap-5">
          <div className="dashboard-brand-cluster flex shrink-0 items-center gap-5">
            {watchtower && typeof watchtower.score === 'number' && (
              <div className="dashboard-header-score">
                <SecurityScoreGauge score={watchtower.score} onClick={onSettingsOpen} />
              </div>
            )}
            <div className="flex cursor-help items-center gap-3" onClick={onLogoClick}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-sage-green)] to-[var(--color-deep-navy)] p-1 shadow-lg transition-transform active:scale-95">
                <img
                  src="./icon.png"
                  alt="Aegis Logo"
                  className="h-full w-full object-contain drop-shadow-sm"
                />
              </div>
              <div className="min-w-0">
                <span className="v5-dashboard-eyebrow">Aegis Vault 5.0</span>
                <h1 className="whitespace-nowrap text-xl font-bold tracking-tight">
                  {t('v5DashboardTitle')}
                </h1>
                <div className="mt-1 flex items-center gap-1.5 whitespace-nowrap">
                  <span className="dashboard-storage-chip">WASM SQLCipher</span>
                  <span className="dashboard-storage-dot" aria-hidden="true" />
                  <span className="dashboard-storage-status">Active</span>
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-top-actions flex min-w-0 items-center justify-end gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={handleLanguageToggle}
              className="toolbar-control flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm transition-all"
              aria-label="Change language"
            >
              <Globe className="w-3.5 h-3.5" />
              {i18n.language.startsWith('en') ? 'EN' : 'TR'}
            </button>
            <button
              onClick={onDonationOpen}
              className="toolbar-control group relative shrink-0 rounded-full p-2.5 shadow-sm transition-all"
              title={t('donateBtn')}
              aria-label="Donate"
            >
              <Heart className="w-5 h-5 fill-current opacity-80 group-hover:opacity-100" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_0_3px_rgba(251,113,133,0.14)]" />
            </button>
            <button
              onClick={onSettingsOpen}
              className="toolbar-control shrink-0 rounded-full p-2.5 shadow-sm transition-all"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={onQuickAliasOpen}
              className="toolbar-control flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm transition-all text-[var(--color-sage-green)]"
              aria-label={t('quickAliasTooltip')}
              title={t('quickAliasTooltip')}
            >
              <AtSign className="w-4 h-4" />
              <span className="hidden xl:inline">{t('quickAliasTooltip')}</span>
            </button>
            <button
              type="button"
              onClick={onThemeToggle}
              className="toolbar-control flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold shadow-sm transition-all md:text-sm"
              aria-label={t('toggleTheme', 'Toggle theme')}
              title={
                themeMode === 'dark'
                  ? t('switchToLight', 'Switch to light mode')
                  : t('switchToDark', 'Switch to dark mode')
              }
            >
              {themeMode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {themeMode === 'dark' ? t('lightMode', 'Light') : t('darkMode', 'Dark')}
            </button>
            <button
              type="button"
              onClick={() =>
                setViewDensity(viewDensity === 'comfortable' ? 'compact' : 'comfortable')
              }
              className="toolbar-control flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold shadow-sm outline-none transition-all md:text-sm"
              title={t('viewDensityToggle', 'Toggle card density')}
            >
              {viewDensity === 'comfortable' ? (
                <Rows3 className="w-4 h-4" />
              ) : (
                <Rows2 className="w-4 h-4" />
              )}
              {viewDensity === 'comfortable'
                ? t('densityCompact', 'Compact')
                : t('densityComfortable', 'Comfortable')}
            </button>
            <button
              onClick={handleLock}
              className="flex shrink-0 items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition-all hover:bg-red-500 hover:text-white active:scale-95"
              aria-label="Lock vault"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">{t('lockVault')}</span>
            </button>
          </div>
        </div>

        <div className="dashboard-search-row v5-dashboard-search-row flex min-w-0 items-center justify-end gap-2 overflow-x-auto">
          <div className="v5-dashboard-search-box group relative min-w-[210px] shrink">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50 transition-opacity group-focus-within:opacity-100" />
            <input
              ref={searchRef}
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="toolbar-control w-full rounded-full py-2 pl-10 pr-4 text-sm font-medium shadow-sm outline-none transition-all"
            />
          </div>
          <div className="toolbar-chip-group v5-search-scope-group flex shrink-0 items-center gap-1 rounded-full px-1.5 py-1">
            <button
              type="button"
              onClick={() => setSearchScope('all')}
              className={`v5-search-scope-btn rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${
                searchScope === 'all'
                  ? 'bg-[var(--color-sage-green)] text-white'
                  : 'text-[var(--color-deep-navy)]/70 hover:bg-white/60'
              }`}
            >
              {t('searchScopeAll', 'All')}
            </button>
            <button
              type="button"
              onClick={() => setSearchScope('title')}
              className={`v5-search-scope-btn rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${
                searchScope === 'title'
                  ? 'bg-[var(--color-sage-green)] text-white'
                  : 'text-[var(--color-deep-navy)]/70 hover:bg-white/60'
              }`}
            >
              {t('searchScopeTitle', 'Title')}
            </button>
            <button
              type="button"
              onClick={() => setSearchScope('username')}
              className={`v5-search-scope-btn rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${
                searchScope === 'username'
                  ? 'bg-[var(--color-sage-green)] text-white'
                  : 'text-[var(--color-deep-navy)]/70 hover:bg-white/60'
              }`}
            >
              {t('searchScopeUsername', 'User')}
            </button>
            <button
              type="button"
              onClick={() => setSearchScope('tags')}
              className={`v5-search-scope-btn rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${
                searchScope === 'tags'
                  ? 'bg-[var(--color-sage-green)] text-white'
                  : 'text-[var(--color-deep-navy)]/70 hover:bg-white/60'
              }`}
            >
              {t('searchScopeTags', 'Tags')}
            </button>
          </div>
          <select
            value={sortOption}
            onChange={(e) =>
              setSortOption(
                e.target.value as 'updated_desc' | 'updated_asc' | 'title_asc' | 'title_desc'
              )
            }
            className="toolbar-control shrink-0 rounded-full px-3 py-2 text-xs font-semibold shadow-sm outline-none transition-all md:text-sm"
            aria-label={t('sortBy', 'Sort by')}
          >
            <option value="updated_desc">{t('sortUpdatedDesc', 'Date (Newest)')}</option>
            <option value="updated_asc">{t('sortUpdatedAsc', 'Date (Oldest)')}</option>
            <option value="title_asc">{t('sortTitleAsc', 'Name (A-Z)')}</option>
            <option value="title_desc">{t('sortTitleDesc', 'Name (Z-A)')}</option>
          </select>
        </div>
      </header>
    </>
  );
}

import { useEffect } from "react";
import { Search, LogOut, Settings, Globe, Heart, Clock, Rows3, Rows2, Moon, Sun } from "lucide-react";
import { SecurityScoreGauge } from "../ui/SecurityScoreGauge";
import { useVault } from "../../contexts/VaultContext";
import { useTranslation } from "react-i18next";

type WindowWithElectronLanguageBridge = Window & typeof globalThis & {
  aegisElectron?: {
    setUiLanguage?: (language: string) => Promise<unknown>;
  };
};

const getSafePostMessageTarget = () => {
  if (typeof window === "undefined") return "*";
  const origin = window.location.origin;
  if (!origin || origin === "null" || origin.startsWith("file:")) {
    return "*";
  }
  return origin;
};

interface DashboardHeaderProps {
  onSettingsOpen: () => void;
  onDonationOpen: () => void;
  onLogoClick: () => void;
  themeMode: "light" | "dark";
  onThemeToggle: () => void;
}

export function DashboardHeader({ onSettingsOpen, onDonationOpen, onLogoClick, themeMode, onThemeToggle }: DashboardHeaderProps) {
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
    const nextLanguage = i18n.language.startsWith("en") ? "tr" : "en";
    i18n.changeLanguage(nextLanguage);
    syncLanguageToDesktop(nextLanguage);
    window.postMessage({ type: "AEGIS_UI_LANGUAGE", language: nextLanguage }, getSafePostMessageTarget());
  };

  useEffect(() => {
    const activeLanguage = i18n.language.startsWith("tr") ? "tr" : "en";
    syncLanguageToDesktop(activeLanguage);
    window.postMessage({ type: "AEGIS_UI_LANGUAGE", language: activeLanguage }, getSafePostMessageTarget());
  }, [i18n.language]);

  return (
    <>
      {/* Clipboard Timeline Progress Tracker */}
      {timeLeft > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 clipboard-monitor box-shadow rounded-full flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-[var(--color-sage-green)] animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-deep-navy)]">
              {t("sanitizingClipboard")} {timeLeft}s
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
      <header className="max-w-[1400px] mx-auto flex justify-between items-center mb-10 p-4 xl:px-8">
        <div className="flex items-start gap-6 pt-2">
          {watchtower && typeof watchtower.score === "number" && (
            <div className="pt-1">
              <SecurityScoreGauge score={watchtower.score} onClick={onSettingsOpen} />
            </div>
          )}
          <div className="flex items-center gap-3 cursor-help" onClick={onLogoClick}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-sage-green)] to-[var(--color-deep-navy)] flex items-center justify-center shadow-lg active:scale-95 transition-transform p-1">
              <img src="./icon.png" alt="Aegis Logo" className="w-full h-full object-contain drop-shadow-sm" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Aegis Vault</h1>
              <p className="text-xs opacity-70">WASM SQLCipher Active</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          <button
            type="button"
            onClick={handleLanguageToggle}
            className="toolbar-control flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-xs font-bold shadow-sm"
            aria-label="Change language"
          >
            <Globe className="w-3.5 h-3.5" />
            {i18n.language.startsWith("en") ? "EN" : "TR"}
          </button>
          <button
            onClick={onDonationOpen}
            className="toolbar-control p-2.5 rounded-full transition-all shadow-sm group relative"
            title={t("donateBtn")}
            aria-label="Donate"
          >
            <Heart className="w-5 h-5 fill-current opacity-80 group-hover:opacity-100" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </button>
          <button
            onClick={onSettingsOpen}
            className="toolbar-control p-2.5 rounded-full transition-all shadow-sm"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onThemeToggle}
            className="toolbar-control flex items-center gap-2 px-3 py-2 rounded-full transition-all text-xs md:text-sm font-semibold shadow-sm"
            aria-label={t("toggleTheme", "Toggle theme")}
            title={themeMode === "dark" ? t("switchToLight", "Switch to light mode") : t("switchToDark", "Switch to dark mode")}
          >
            {themeMode === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {themeMode === "dark" ? t("lightMode", "Light") : t("darkMode", "Dark")}
          </button>
          <div className="relative group">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50 transition-opacity group-focus-within:opacity-100" />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="toolbar-control pl-10 pr-4 py-2 w-48 md:w-64 text-sm rounded-full shadow-sm outline-none transition-all font-medium"
            />
          </div>
          <div className="toolbar-chip-group flex items-center gap-1.5 rounded-full px-1.5 py-1">
            <button
              type="button"
              onClick={() => setSearchScope("all")}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                searchScope === "all"
                  ? "bg-[var(--color-sage-green)] text-white"
                  : "text-[var(--color-deep-navy)]/70 hover:bg-white/60"
              }`}
            >
              {t("searchScopeAll", "All")}
            </button>
            <button
              type="button"
              onClick={() => setSearchScope("title")}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                searchScope === "title"
                  ? "bg-[var(--color-sage-green)] text-white"
                  : "text-[var(--color-deep-navy)]/70 hover:bg-white/60"
              }`}
            >
              {t("searchScopeTitle", "Title")}
            </button>
            <button
              type="button"
              onClick={() => setSearchScope("username")}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                searchScope === "username"
                  ? "bg-[var(--color-sage-green)] text-white"
                  : "text-[var(--color-deep-navy)]/70 hover:bg-white/60"
              }`}
            >
              {t("searchScopeUsername", "User")}
            </button>
            <button
              type="button"
              onClick={() => setSearchScope("tags")}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                searchScope === "tags"
                  ? "bg-[var(--color-sage-green)] text-white"
                  : "text-[var(--color-deep-navy)]/70 hover:bg-white/60"
              }`}
            >
              {t("searchScopeTags", "Tags")}
            </button>
          </div>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as "updated_desc" | "updated_asc" | "title_asc" | "title_desc")}
            className="toolbar-control px-3 py-2 rounded-full transition-all text-xs md:text-sm font-semibold shadow-sm outline-none"
            aria-label={t("sortBy", "Sort by")}
          >
            <option value="updated_desc">{t("sortUpdatedDesc", "Date (Newest)")}</option>
            <option value="updated_asc">{t("sortUpdatedAsc", "Date (Oldest)")}</option>
            <option value="title_asc">{t("sortTitleAsc", "Name (A-Z)")}</option>
            <option value="title_desc">{t("sortTitleDesc", "Name (Z-A)")}</option>
          </select>
          <button
            type="button"
            onClick={() => setViewDensity(viewDensity === "comfortable" ? "compact" : "comfortable")}
            className="toolbar-control px-3 py-2 rounded-full transition-all text-xs md:text-sm font-semibold shadow-sm outline-none flex items-center gap-1.5"
            title={t("viewDensityToggle", "Toggle card density")}
          >
            {viewDensity === "comfortable" ? <Rows3 className="w-4 h-4" /> : <Rows2 className="w-4 h-4" />}
            {viewDensity === "comfortable" ? t("densityCompact", "Compact") : t("densityComfortable", "Comfortable")}
          </button>
          <button
            onClick={handleLock}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all text-red-600 font-semibold text-sm shadow-sm active:scale-95"
            aria-label="Lock vault"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">{t("lockVault")}</span>
          </button>
        </div>
      </header>
    </>
  );
}

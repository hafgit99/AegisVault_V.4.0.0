import { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { ArchiveX, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { vaultService, type VaultEntry } from '../vaultService';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { SecureAppSettings } from '../lib/SecureAppSettings';

// Context
import { VaultProvider, useVault } from '../contexts/VaultContext';

// Always-visible components (loaded eagerly)
import { DashboardHeader } from './dashboard/DashboardHeader';
import { WatchtowerPanel } from './dashboard/WatchtowerPanel';
import { CategorySidebar } from './dashboard/CategorySidebar';
import { VaultEntryCard } from './dashboard/VaultEntryCard';
import { VirtualizedVaultList } from './dashboard/VirtualizedVaultList';
import { GlowCard } from './ui/GlowCard';

// Heavy/conditional components (lazy loaded — only fetched when needed)
const EntryForm = lazy(() =>
  import('./dashboard/EntryForm').then((m) => ({ default: m.EntryForm }))
);
const SettingsDrawer = lazy(() =>
  import('./dashboard/SettingsDrawer').then((m) => ({ default: m.SettingsDrawer }))
);
const SpotlightWalkthrough = lazy(() =>
  import('./SpotlightWalkthrough').then((m) => ({ default: m.SpotlightWalkthrough }))
);
const DonationModal = lazy(() =>
  import('./DonationModal').then((m) => ({ default: m.DonationModal }))
);
const QuickAliasModal = lazy(() =>
  import('./dashboard/QuickAliasModal').then((m) => ({ default: m.QuickAliasModal }))
);

// ─────────────────────────────────────────────────────────────────
// Dashboard İç Bileşeni (VaultContext tüketen)
// ─────────────────────────────────────────────────────────────────

function DashboardInner() {
  const { t } = useTranslation();
  const {
    passwords,
    isDecrypting,
    categoryFilter,
    visibleCount,
    setVisibleCount,
    handleEmptyTrash,
    handleLock,
    handleRestoreEntry,
    viewDensity,
    watchtower,
  } = useVault();

  const searchRef = useRef<HTMLInputElement>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [editEntry, setEditEntry] = useState<Partial<VaultEntry> | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showDonation, setShowDonation] = useState(false);
  const [showQuickAlias, setShowQuickAlias] = useState(false);
  const [showEmergencyKit, setShowEmergencyKit] = useState(false);
  const [, setLogoClicks] = useState(0);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    const saved = SecureAppSettings.getThemeMode();
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const startNewEntry = () => {
    setEditEntry({
      category:
        categoryFilter && categoryFilter !== 'Trash' && !categoryFilter.startsWith('#')
          ? categoryFilter
          : 'General',
    });
    setIsAdding(true);
  };

  const totalSecurityIssues =
    (watchtower?.weak || 0) +
    (watchtower?.reused || 0) +
    (watchtower?.old || 0) +
    (watchtower?.pwned || 0) +
    (watchtower?.aliasAtRisk || 0) +
    (watchtower?.aliasNeedsRotation || 0);

  useKeyboardShortcuts({
    onSearch: () => searchRef.current?.focus(),
    onLock: handleLock,
    onNewEntry: startNewEntry,
    onEscape: () => {
      setIsAdding(false);
      setShowSettings(false);
      setShowQuickAlias(false);
    },
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
    SecureAppSettings.setThemeMode(themeMode);

    try {
      const globalNav = window as unknown as {
        browser?: { runtime?: { sendMessage: (m: unknown) => Promise<void> } };
        chrome?: { runtime?: { sendMessage: (m: unknown) => Promise<void> } };
      };
      if (typeof window !== 'undefined' && globalNav.browser?.runtime?.sendMessage) {
        globalNav.browser.runtime
          .sendMessage({ type: 'SET_THEME', theme: themeMode })
          .catch(() => {});
      } else if (typeof window !== 'undefined' && globalNav.chrome?.runtime?.sendMessage) {
        globalNav.chrome.runtime
          .sendMessage({ type: 'SET_THEME', theme: themeMode })
          .catch(() => {});
      }
    } catch {
      // ignore
    }
  }, [themeMode]);

  useEffect(() => {
    void SecureAppSettings.initialize().then(() => {
      const storedTheme = SecureAppSettings.getThemeMode();
      setThemeMode(storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'light');
    });
  }, []);

  const handleLogoClick = () => {
    setLogoClicks((prev) => {
      const next = prev + 1;
      if (next === 5) {
        setShowSettings(true);
        toast.info(t('secretMenuActive'));
        return 0;
      }
      return next;
    });
  };

  const handleEditEntry = (entry: VaultEntry) => {
    setEditEntry(entry);
    setIsAdding(true);
  };

  const handleCloseForm = () => {
    setIsAdding(false);
    setEditEntry(null);
  };

  const downloadEmergencyKit = async () => {
    setShowEmergencyKit(true);
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);

    setTimeout(() => {
      const doc = new jsPDF('p', 'pt', 'a4');
      const primaryColor = '#101828';
      const accentColor = '#72886f';
      const lightBg = '#F9FAFB';

      doc.setFillColor(lightBg);
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), 'F');

      doc.setTextColor(primaryColor);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.text('Aegis Vault', 40, 60);

      doc.setFontSize(14);
      doc.setTextColor(accentColor);
      doc.text('Emergency Recovery Kit', 40, 80);

      doc.setDrawColor(accentColor);
      doc.setLineWidth(1);
      doc.line(40, 90, 550, 90);

      doc.setFontSize(10);
      doc.setTextColor(primaryColor);
      doc.setFont('helvetica', 'normal');
      doc.text(
        "Keep this document in a safe, offline location. This kit contains your Vault's master recovery contents.",
        40,
        110
      );
      doc.setFont('helvetica', 'bold');
      doc.text('NEVER share this file. Do not upload it to the cloud without encryption.', 40, 125);

      doc.setFillColor('#ffffff');
      doc.setDrawColor('#E5E7EB');
      doc.roundedRect(40, 140, 510, 50, 4, 4, 'FD');

      doc.setFont('courier', 'bold');
      doc.setFontSize(12);
      doc.setTextColor('#374151');
      doc.text(
        t('emergencyKitSecretKeyHidden', 'Session secret key is hidden for security.'),
        60,
        170
      );

      const tableData = passwords.map((p, i) => [
        (i + 1).toString(),
        p.title,
        p.username || '-',
        p.pass || '-',
        p.category,
      ]);

      autoTable(doc, {
        startY: 210,
        head: [['#', 'Vault Item', 'Identity (User/Email)', 'Secure Password', 'Category']],
        body: tableData,
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 9,
          textColor: '#374151',
          lineColor: '#E5E7EB',
          lineWidth: 0.5,
          cellPadding: 8,
        },
        headStyles: {
          fillColor: primaryColor,
          textColor: '#FFFFFF',
          fontStyle: 'bold',
          halign: 'left',
        },
        alternateRowStyles: { fillColor: '#F3F4F6' },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { fontStyle: 'bold', cellWidth: 100 },
          2: { cellWidth: 130 },
          3: { font: 'courier' },
        },
        didDrawPage: function (data: { settings: { margin: { left: number } } }) {
          const str = 'Page ' + doc.getCurrentPageInfo().pageNumber;
          doc.setFontSize(8);
          doc.text(str, data.settings.margin.left, doc.internal.pageSize.getHeight() - 20);
          doc.text(
            'Generated by Aegis Offline Environment',
            400,
            doc.internal.pageSize.getHeight() - 20
          );
        },
      });

      doc.save('Aegis_Emergency_Kit_v2.pdf');
      setShowEmergencyKit(false);
    }, 500);
  };

  return (
    <div className="v5-dashboard-root w-full min-h-screen overflow-visible bg-[var(--color-cloud-dancer)] text-[var(--color-deep-navy)] px-4 pb-4 pt-5 md:px-8 md:pb-8 md:pt-7 font-[var(--font-geist)] animate-in fade-in duration-700">
      <Suspense fallback={null}>
        <SpotlightWalkthrough />
      </Suspense>

      <DashboardHeader
        onSettingsOpen={() => setShowSettings(true)}
        onDonationOpen={() => setShowDonation(true)}
        onQuickAliasOpen={() => setShowQuickAlias(true)}
        onLogoClick={handleLogoClick}
        themeMode={themeMode}
        onThemeToggle={() => setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'))}
        searchRef={searchRef}
      />

      <main
        role="main"
        aria-label="Vault entries"
        className="v5-dashboard-shell max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-6 px-4 xl:px-8"
      >
        <GlowCard className="v5-vault-panel lg:col-span-8 xl:col-span-9 glass-card p-6 md:p-7 flex flex-col gap-6 relative">
          <div className="v5-vault-panel-header flex items-end justify-between gap-4">
            <div>
              <span className="v5-section-kicker">{t('v5VaultWorkspace')}</span>
              <h2 className="mt-2 text-2xl font-semibold mb-1">
                {categoryFilter === 'Trash' ? t('trash') : t('yourVault')}
              </h2>
              <p className="v5-vault-status-row flex items-center gap-2 text-sm text-[var(--color-deep-navy)]/65 dark:text-white/70">
                {t('zeroKnowledge')}
                {!isDecrypting && (
                  <span className="v5-vault-count-chip rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider dark:bg-white/10">
                    {passwords.length} {t('entries')}
                  </span>
                )}
              </p>
            </div>
            {categoryFilter === 'Trash' ? (
              <button
                onClick={() => {
                  if (confirm(t('confirmEmptyTrash'))) handleEmptyTrash();
                }}
                disabled={passwords.length === 0}
                className="v5-vault-danger-action flex items-center gap-2 bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" /> {t('emptyTrash')}
              </button>
            ) : (
              !isAdding && (
                <button
                  onClick={startNewEntry}
                  className="btn-ink v5-vault-primary-action flex items-center gap-2 bg-[var(--color-deep-navy)] text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md hover:bg-opacity-90 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" /> {t('newEntry')}
                </button>
              )
            )}
          </div>

          <div className="flex-1 min-h-0">
            {isDecrypting ? (
              <div className="flex flex-col gap-4 mt-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="v5-vault-skeleton flex items-center justify-between p-4 rounded-2xl bg-white/30 border border-white/20 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-black/5" />
                      <div className="flex flex-col gap-2">
                        <div className="h-4 w-32 bg-black/10 rounded" />
                        <div className="h-3 w-24 bg-black/5 rounded" />
                      </div>
                    </div>
                    <div className="h-10 w-24 bg-black/5 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : passwords.length === 0 ? (
              <div className="dashboard-empty-state v5-dashboard-empty-state mt-4">
                <div className="dashboard-empty-icon">
                  {categoryFilter === 'Trash' ? (
                    <ArchiveX className="h-6 w-6" />
                  ) : (
                    <ShieldCheck className="h-6 w-6" />
                  )}
                </div>
                <div className="max-w-md text-center">
                  <h3 className="dashboard-empty-title">
                    {categoryFilter === 'Trash' ? t('trashEmptyTitle') : t('vaultEmptyTitle')}
                  </h3>
                  <p className="dashboard-empty-copy">
                    {categoryFilter === 'Trash' ? t('trashEmptyDesc') : t('vaultEmptyDesc')}
                  </p>
                </div>
                {categoryFilter !== 'Trash' && !isAdding && (
                  <button
                    onClick={startNewEntry}
                    className="btn-ink v5-vault-primary-action flex items-center gap-2 rounded-xl bg-[var(--color-deep-navy)] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-opacity-90 active:scale-95"
                  >
                    <Plus className="h-4 w-4" /> {t('newEntry')}
                  </button>
                )}
              </div>
            ) : (
              <div className="h-[65vh] mt-4">
                <VirtualizedVaultList
                  entries={passwords}
                  onEdit={handleEditEntry}
                  viewDensity={viewDensity}
                />
              </div>
            )}

            {isAdding && (
              <div className="v5-entry-form-overlay custom-scrollbar absolute inset-0 z-[60] bg-[var(--color-cloud-dancer)] p-6 md:p-8 animate-in slide-in-from-bottom-5 duration-300 rounded-[2.5rem]">
                <Suspense fallback={<div className="p-8 text-center opacity-50">Loading...</div>}>
                  <EntryForm initialEntry={editEntry || undefined} onClose={handleCloseForm} />
                </Suspense>
              </div>
            )}
          </div>
        </GlowCard>

        <nav
          aria-label="Categories and security"
          className="v5-dashboard-rail lg:col-span-4 xl:col-span-3 flex flex-col gap-5 xl:gap-6"
        >
          <div className={totalSecurityIssues > 0 ? 'order-1' : 'order-2'}>
            <WatchtowerPanel />
          </div>
          <div className={totalSecurityIssues > 0 ? 'order-2' : 'order-1'}>
            <CategorySidebar
              onDownloadEmergencyKit={downloadEmergencyKit}
              isGeneratingKit={showEmergencyKit}
            />
          </div>
        </nav>
      </main>

      <Suspense fallback={null}>
        <SettingsDrawer
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onDonationOpen={() => setShowDonation(true)}
          onEditEntry={handleEditEntry}
        />
      </Suspense>

      <Suspense fallback={null}>
        <DonationModal isOpen={showDonation} onClose={() => setShowDonation(false)} />
      </Suspense>

      <Suspense fallback={null}>
        {showQuickAlias && <QuickAliasModal onClose={() => setShowQuickAlias(false)} />}
      </Suspense>
    </div>
  );
}

interface DashboardProps {
  onLock: () => void;
}

export function Dashboard({ onLock }: DashboardProps) {
  return (
    <VaultProvider onLock={onLock}>
      <DashboardInner />
    </VaultProvider>
  );
}

import { useState, useEffect, lazy, Suspense } from "react";
import { Plus, Trash2 } from "lucide-react";
import { vaultService, type VaultEntry } from "../vaultService";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

// Context
import { VaultProvider, useVault } from "../contexts/VaultContext";

// Always-visible components (loaded eagerly)
import { DashboardHeader } from "./dashboard/DashboardHeader";
import { WatchtowerPanel } from "./dashboard/WatchtowerPanel";
import { CategorySidebar } from "./dashboard/CategorySidebar";
import { VaultEntryCard } from "./dashboard/VaultEntryCard";
import { GlowCard } from "./ui/GlowCard";

// Heavy/conditional components (lazy loaded — only fetched when needed)
const EntryForm = lazy(() => import("./dashboard/EntryForm").then(m => ({ default: m.EntryForm })));
const SettingsDrawer = lazy(() => import("./dashboard/SettingsDrawer").then(m => ({ default: m.SettingsDrawer })));
const SpotlightWalkthrough = lazy(() => import("./SpotlightWalkthrough").then(m => ({ default: m.SpotlightWalkthrough })));
const DonationModal = lazy(() => import("./DonationModal").then(m => ({ default: m.DonationModal })));

// ─────────────────────────────────────────────────────────────────
// Dashboard İç Bileşeni (VaultContext tüketen)
// ─────────────────────────────────────────────────────────────────

function DashboardInner({ secretKey }: { secretKey?: string }) {
  const { t } = useTranslation();
  const {
    passwords,
    isDecrypting,
    categoryFilter,
    visibleCount,
    setVisibleCount,
    handleEmptyTrash,
    loadPasswords,
  } = useVault();

  // UI State (yalnızca bu bileşene ait)
  const [isAdding, setIsAdding] = useState(false);
  const [editEntry, setEditEntry] = useState<Partial<VaultEntry> | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showDonation, setShowDonation] = useState(false);
  const [showEmergencyKit, setShowEmergencyKit] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);

  const handleLogoClick = () => {
    setLogoClicks((prev) => {
      const next = prev + 1;
      if (next === 5) {
        setShowSettings(true); // Settings'i aç — gizli menü orada
        toast.info(t("secretMenuActive"));
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

  // Emergency Kit PDF (dynamic import — jsPDF only loaded when needed)
  const downloadEmergencyKit = async () => {
    setShowEmergencyKit(true);
    
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    
    setTimeout(() => {
      const doc = new jsPDF("p", "pt", "a4");
      const primaryColor = "#101828";
      const accentColor = "#72886f";
      const lightBg = "#F9FAFB";

      doc.setFillColor(lightBg);
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), "F");

      doc.setTextColor(primaryColor);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.text("Aegis Vault", 40, 60);

      doc.setFontSize(14);
      doc.setTextColor(accentColor);
      doc.text("Emergency Recovery Kit", 40, 80);

      doc.setDrawColor(accentColor);
      doc.setLineWidth(1);
      doc.line(40, 90, 550, 90);

      doc.setFontSize(10);
      doc.setTextColor(primaryColor);
      doc.setFont("helvetica", "normal");
      doc.text("Keep this document in a safe, offline location. This kit contains your Vault's master recovery contents.", 40, 110);
      doc.setFont("helvetica", "bold");
      doc.text("NEVER share this file. Do not upload it to the cloud without encryption.", 40, 125);

      doc.setFillColor("#ffffff");
      doc.setDrawColor("#E5E7EB");
      doc.roundedRect(40, 140, 510, 50, 4, 4, "FD");

      doc.setFont("courier", "bold");
      doc.setFontSize(12);
      doc.setTextColor("#374151");
      const realSecretKey = secretKey || "NO-SECRET-KEY-PROVIDED";
      doc.text(`Account Secret Key: ${realSecretKey}`, 60, 170);

      const tableData = passwords.map((p, i) => [
        (i + 1).toString(),
        p.title,
        p.username || "-",
        p.pass || "-",
        p.category,
      ]);

      autoTable(doc, {
        startY: 210,
        head: [["#", "Vault Item", "Identity (User/Email)", "Secure Password", "Category"]],
        body: tableData,
        theme: "grid",
        styles: { font: "helvetica", fontSize: 9, textColor: "#374151", lineColor: "#E5E7EB", lineWidth: 0.5, cellPadding: 8 },
        headStyles: { fillColor: primaryColor, textColor: "#FFFFFF", fontStyle: "bold", halign: "left" },
        alternateRowStyles: { fillColor: "#F3F4F6" },
        columnStyles: { 0: { cellWidth: 30 }, 1: { fontStyle: "bold", cellWidth: 100 }, 2: { cellWidth: 130 }, 3: { font: "courier" } },
        didDrawPage: function (data: any) {
          const str = "Page " + doc.getCurrentPageInfo().pageNumber;
          doc.setFontSize(8);
          doc.text(str, data.settings.margin.left, doc.internal.pageSize.getHeight() - 20);
          doc.text("Generated by Aegis Offline Environment", 400, doc.internal.pageSize.getHeight() - 20);
        },
      });

      doc.save("Aegis_Emergency_Kit_v2.pdf");
      setShowEmergencyKit(false);
    }, 500);
  };

  return (
    <div className="w-full min-h-screen bg-[var(--color-cloud-dancer)] text-[var(--color-deep-navy)] p-4 md:p-8 font-[var(--font-geist)] animate-in fade-in duration-700">
      <Suspense fallback={null}><SpotlightWalkthrough /></Suspense>

      <DashboardHeader
        onSettingsOpen={() => setShowSettings(true)}
        onDonationOpen={() => setShowDonation(true)}
        onLogoClick={handleLogoClick}
      />

      {/* Bento Grid Layout */}
      <main role="main" aria-label="Vault entries" className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 px-4 xl:px-8">
        {/* Main Vault Panel */}
        <GlowCard className="lg:col-span-8 xl:col-span-9 glass-card p-6 md:p-8 flex flex-col gap-6 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-sage-green)] opacity-[0.03] blur-3xl rounded-full pointer-events-none group-hover/glow:opacity-10 transition-opacity duration-1000" />

          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-semibold mb-1">{categoryFilter === "Trash" ? t("trash") : t("yourVault")}</h2>
              <p className="text-sm opacity-60 flex items-center gap-2">
                {t("zeroKnowledge")}
                {!isDecrypting && (
                  <span className="bg-black/10 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {passwords.length} {t("entries")}
                  </span>
                )}
              </p>
            </div>
            {categoryFilter === "Trash" ? (
              <button
                onClick={() => {
                  if (confirm(t("confirmEmptyTrash"))) handleEmptyTrash();
                }}
                disabled={passwords.length === 0}
                className="flex items-center gap-2 bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" /> {t("emptyTrash")}
              </button>
            ) : (
              !isAdding && (
                <button
                  onClick={() => {
                    setEditEntry({
                      category:
                        categoryFilter && categoryFilter !== "Trash" && !categoryFilter.startsWith("#")
                          ? categoryFilter
                          : "General",
                    });
                    setIsAdding(true);
                  }}
                  className="flex items-center gap-2 bg-[var(--color-deep-navy)] text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md hover:bg-opacity-90 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" /> {t("newEntry")}
                </button>
              )
            )}
          </div>

          <div
            className="flex flex-col gap-3 mt-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar"
            onScroll={(e) => {
              const bottom = Math.abs(e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight) < 50;
              if (bottom && visibleCount < passwords.length) {
                setVisibleCount((prev) => prev + 20);
              }
            }}
          >
            {/* Entry Form */}
            {isAdding && (
              <Suspense fallback={<div className="p-8 text-center opacity-50">Loading...</div>}><EntryForm initialEntry={editEntry || undefined} onClose={handleCloseForm} /></Suspense>
            )}

            {/* Shimmer Skeleton / Entries / Empty State */}
            {isDecrypting ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/30 border border-white/20 relative overflow-hidden">
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
              ))
            ) : passwords.length === 0 ? (
              <div className="text-center py-10 opacity-50 text-sm italic">
                {categoryFilter === "Trash" ? t("noTrashItems") : t("noPasswordsFound")}
              </div>
            ) : (
              passwords.slice(0, visibleCount).map((p) => (
                <VaultEntryCard key={p.id} entry={p} onEdit={handleEditEntry} />
              ))
            )}
          </div>
        </GlowCard>

        {/* Right Sidebar */}
        <nav aria-label="Categories and security" className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6 xl:gap-8">
          <WatchtowerPanel />
          <CategorySidebar onDownloadEmergencyKit={downloadEmergencyKit} isGeneratingKit={showEmergencyKit} />
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

      <Suspense fallback={null}><DonationModal isOpen={showDonation} onClose={() => setShowDonation(false)} /></Suspense>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Dashboard (dışarıdan çağrılan ana bileşen — VaultProvider ile sarar)
// ─────────────────────────────────────────────────────────────────

interface DashboardProps {
  onLock: () => void;
  secretKey?: string;
}

export function Dashboard({ onLock, secretKey }: DashboardProps) {
  return (
    <VaultProvider onLock={onLock} secretKey={secretKey}>
      <DashboardInner secretKey={secretKey} />
    </VaultProvider>
  );
}

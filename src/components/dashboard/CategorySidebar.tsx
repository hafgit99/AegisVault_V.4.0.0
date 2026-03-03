import { ChevronRight, Hash, Trash2, Tag, ShieldCheck, Download } from "lucide-react";
import { GlowCard } from "../ui/GlowCard";
import { getCategoryIcon } from "../../lib/getCategoryIcon";
import { useVault } from "../../contexts/VaultContext";
import { useTranslation } from "react-i18next";

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

  const categories = ["General", "Cards", "Identities", "Notes", "WiFi"];

  return (
    <>
      {/* Categories */}
      <GlowCard className="bg-[rgba(255,255,255,0.25)] backdrop-blur-[40px] -webkit-backdrop-filter:blur(40px) border border-white/40 rounded-3xl p-6 flex-1 flex flex-col">
        <h3 className="text-sm font-semibold opacity-60 uppercase tracking-widest mb-4">{t("categoriesTitle")}</h3>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setCategoryFilter("")}
            className={`flex items-center justify-between p-3 rounded-xl hover:bg-white/60 transition-colors w-full text-left ${
              categoryFilter === "" ? "bg-white/80 shadow-sm border border-white/40" : "bg-transparent"
            }`}
          >
            <div className="flex items-center gap-3">
              <Hash className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-sm">{t("allVaults")}</span>
            </div>
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`flex items-center justify-between p-3 rounded-xl hover:bg-white/60 transition-colors w-full text-left ${
                categoryFilter === cat ? "bg-white/80 shadow-sm border border-white/40" : "bg-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                {getCategoryIcon(cat)}
                <span className="font-medium text-sm">{t(cat.toLowerCase())}</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-30" />
            </button>
          ))}
          <div className="h-px bg-black/5 my-1 w-full" />
          <button
            onClick={() => setCategoryFilter("Trash")}
            className={`flex items-center justify-between p-3 rounded-xl hover:bg-white/60 transition-colors w-full text-left ${
              categoryFilter === "Trash"
                ? "bg-white/80 shadow-sm border border-white/40 text-red-600"
                : "bg-transparent text-gray-500"
            }`}
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5" />
              <span className="font-medium text-sm">{t("trash")}</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-30" />
          </button>

          {/* Tags List */}
          {uniqueTags.length > 0 && (
            <>
              <div className="h-px bg-black/5 my-2 w-full" />
              <div className="flex flex-wrap gap-2">
                {uniqueTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setCategoryFilter(categoryFilter === `#${tag}` ? "" : `#${tag}`)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-all ${
                      categoryFilter === `#${tag}`
                        ? "bg-[var(--color-sage-green)] text-[var(--color-deep-navy)] border-transparent shadow-[0_0_10px_rgba(114,136,111,0.4)]"
                        : "bg-white/40 hover:bg-white border-black/10 text-[var(--color-deep-navy)]"
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
      <GlowCard className="bg-gradient-to-br from-[rgba(255,255,255,0.4)] to-[rgba(255,255,255,0.1)] backdrop-blur-[40px] border border-[var(--color-sage-green)]/30 rounded-3xl shadow-lg p-6">
        <div className="absolute inset-0 bg-[var(--color-sage-green)] opacity-0 group-hover/glow:opacity-5 transition-opacity rounded-3xl pointer-events-none" />
        <div className="flex flex-col items-center text-center gap-3 relative z-10">
          <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center shadow-inner">
            <ShieldCheck className="w-6 h-6 text-[var(--color-sage-green)]" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">{t("offlinePwaActive")}</h4>
            <p className="text-xs opacity-60 mt-1">{t("airgappedSync")}</p>
          </div>

          <button
            onClick={onDownloadEmergencyKit}
            disabled={isGeneratingKit}
            className="mt-2 w-full flex items-center justify-center gap-2 bg-white/60 hover:bg-white text-[var(--color-deep-navy)] outline outline-1 outline-black/5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            {isGeneratingKit ? (
              <span className="animate-pulse">{t("generatingPdf")}</span>
            ) : (
              <>
                <Download className="w-4 h-4" /> {t("emergencyKitButton")}
              </>
            )}
          </button>
        </div>
      </GlowCard>
    </>
  );
}

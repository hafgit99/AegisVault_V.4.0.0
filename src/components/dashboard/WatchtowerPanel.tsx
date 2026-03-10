import { ShieldAlert, AlertTriangle, KeyRound, Clock4, Globe } from "lucide-react";
import { GlowCard } from "../ui/GlowCard";
import { useVault } from "../../contexts/VaultContext";
import { useTranslation } from "react-i18next";

/**
 * WatchtowerPanel — Güvenlik denetimi widget'ı (sağ sidebar).
 * Zayıf, tekrarlanan, eski ve sızdırılmış şifre sayılarını gösterir.
 * HIBP (Have I Been Pwned) tarama butonunu içerir.
 */
export function WatchtowerPanel() {
  const { t } = useTranslation();
  const { watchtower, isPwnedScanning, pwnedScanProgress, handleScanPwned, passwords } = useVault();

  return (
    <GlowCard className="watchtower-surface bg-[rgba(255,255,255,0.25)] backdrop-blur-[40px] -webkit-backdrop-filter:blur(40px) border border-white/40 rounded-3xl p-6 relative">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/5 rounded-full blur-xl pointer-events-none" />
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="w-4 h-4 text-[var(--color-deep-navy)]/60" />
        <h3 className="text-sm font-semibold opacity-60 uppercase tracking-widest">{t("watchtowerTitle")}</h3>
      </div>

      <div className="flex flex-col gap-3">
        <div className="watchtower-item flex justify-between items-center bg-white/40 p-3 rounded-xl border border-white/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${watchtower.weak > 0 ? "text-red-500" : "text-[var(--color-sage-green)]"}`} />
            <span className="text-sm font-semibold">{t("weakPasswords")}</span>
          </div>
          <span className={`font-bold ${watchtower.weak > 0 ? "text-red-500" : "text-black/50"}`}>{watchtower.weak}</span>
        </div>

        <div className="watchtower-item flex justify-between items-center bg-white/40 p-3 rounded-xl border border-white/20">
          <div className="flex items-center gap-2">
            <KeyRound className={`w-4 h-4 ${watchtower.reused > 0 ? "text-amber-500" : "text-[var(--color-sage-green)]"}`} />
            <span className="text-sm font-semibold">{t("reusedPasswords")}</span>
          </div>
          <span className={`font-bold ${watchtower.reused > 0 ? "text-amber-500" : "text-black/50"}`}>{watchtower.reused}</span>
        </div>

        <div className="watchtower-item flex justify-between items-center bg-white/40 p-3 rounded-xl border border-white/20">
          <div className="flex items-center gap-2">
            <Clock4 className={`w-4 h-4 ${watchtower.old > 0 ? "text-blue-500" : "text-[var(--color-sage-green)]"}`} />
            <span className="text-sm font-semibold">{t("oldPasswords")}</span>
          </div>
          <span className={`font-bold ${watchtower.old > 0 ? "text-blue-500" : "text-black/50"}`}>{watchtower.old}</span>
        </div>

        <div className="watchtower-item flex justify-between items-center bg-white/40 p-3 rounded-xl border border-white/20">
          <div className="flex items-center gap-2">
            <ShieldAlert className={`w-4 h-4 ${watchtower.pwned > 0 ? "text-red-500" : "text-[var(--color-sage-green)]"}`} />
            <span className="text-sm font-semibold">{t("pwnedPasswords")}</span>
          </div>
          <span className={`font-bold ${watchtower.pwned > 0 ? "text-red-500" : "text-black/50"}`}>{watchtower.pwned}</span>
        </div>
      </div>

      <button
        onClick={handleScanPwned}
        disabled={isPwnedScanning || passwords.length === 0}
        className="mt-4 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500/10 to-amber-500/10 hover:from-red-500/20 hover:to-amber-500/20 border border-red-500/20 text-red-600 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all relative overflow-hidden disabled:opacity-50"
      >
        {isPwnedScanning ? (
          <>
            <div
              className="absolute left-0 top-0 bottom-0 bg-red-500/20 transition-all duration-300"
              style={{ width: `${pwnedScanProgress}%` }}
            />
            <span className="relative z-10 animate-pulse">{t("scanningProgress", { progress: pwnedScanProgress })}</span>
          </>
        ) : (
          <>
            <Globe className="w-4 h-4" /> {t("hibpScan")}
          </>
        )}
      </button>
    </GlowCard>
  );
}

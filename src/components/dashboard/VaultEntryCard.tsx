import { Copy, Check, Eye, EyeOff, Paperclip, DownloadCloud, Trash2, FileUp, Edit2, Tag, Wand2, X, FileText } from "lucide-react";
import { TOTPWidget } from "./TOTPWidget";
import { getCategoryIcon } from "../../lib/getCategoryIcon";
import { useVault } from "../../contexts/VaultContext";
import { vaultService, type VaultEntry } from "../../vaultService";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

interface VaultEntryCardProps {
  entry: VaultEntry;
  onEdit: (entry: VaultEntry) => void;
}

/**
 * VaultEntryCard — Tek bir kasa girişini gösteren kart bileşeni.
 * Parola göster/gizle, kopyala, düzenle, sil/geri yükle ve ek dosya indirme aksiyonlarını içerir.
 */
export function VaultEntryCard({ entry: p, onEdit }: VaultEntryCardProps) {
  const { t } = useTranslation();
  const {
    copiedId,
    handleCopyItem,
    visiblePasswords,
    toggleVisibility,
    categoryFilter,
    loadPasswords,
    handleDeleteEntry,
    handleRestoreEntry,
  } = useVault();

  const isCopied = copiedId === p.id;

  const handleDownloadAttachment = async (attachmentId: string, name: string) => {
    try {
      toast.info(t("decryptingAttachment", { name }));
      const blob = await vaultService.getDecryptedAttachment(attachmentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      toast.error(t("decryptFailed"));
    }
  };

  const isVulnerable =
    !p.pass ||
    p.pass.length < 8 ||
    (p.updated_at && Date.now() - new Date(p.updated_at).getTime() > 1000 * 60 * 60 * 24 * 365) ||
    (p.pwned_count || 0) > 0;

  return (
    <div className="flex items-center justify-between p-5 md:p-6 rounded-[1.25rem] bg-white/50 border border-white/30 hover:bg-white/80 hover:shadow-sm transition-all relative overflow-hidden group/item">
      <div className="flex items-center gap-5 relative z-10 w-full overflow-hidden">
        <div className="w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-[1.25rem] bg-white flex items-center justify-center shadow-sm">
          <div className="scale-110 md:scale-125">{getCategoryIcon(p.category)}</div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-[var(--color-deep-navy)] truncate flex items-center gap-2">
            {p.title}
            {(p.pwned_count || 0) > 0 && (
              <span
                className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest font-black"
                title={t("pwnedWarning")}
              >
                {t("pwned")}
              </span>
            )}
          </h3>
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mt-1 text-sm">
            <p className="opacity-60 font-[var(--font-geist-mono)] tracking-tight truncate flex items-center gap-2">
              {p.username}
              {p.tags && p.tags.length > 0 && (
                <span className="hidden xl:flex items-center gap-1 opacity-70 border border-black/10 px-1.5 py-0.5 rounded text-[10px] ml-2">
                  <Tag className="w-2.5 h-2.5" /> {p.tags[0]} {p.tags.length > 1 && `+${p.tags.length - 1}`}
                </span>
              )}
            </p>
            <span className="hidden md:block w-1.5 h-1.5 rounded-full bg-black/20 shrink-0" />
            <div className="flex items-center gap-2">
              <span
                className={`pass-font text-sm rounded-md select-all transition-all duration-300 ${
                  visiblePasswords.has(p.id)
                    ? "bg-[rgba(255,255,255,0.6)] backdrop-blur-[20px] px-2 py-1 border border-white/50 text-[var(--color-deep-navy)]"
                    : "tracking-[0.25em] opacity-40 select-none mt-1"
                }`}
              >
                {visiblePasswords.has(p.id) ? p.pass : "••••••••"}
              </span>
              <button
                onClick={() => toggleVisibility(p.id)}
                className="p-1.5 rounded-md hover:bg-black/5 text-[var(--color-deep-navy)]/40 hover:text-[var(--color-sage-green)] transition-all"
                title={visiblePasswords.has(p.id) ? "Hide Password" : "Show liquid password"}
              >
                {visiblePasswords.has(p.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Attachments */}
          {p.attachments && p.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {p.attachments.map((att) => (
                <button
                  key={att.id}
                  onClick={() => handleDownloadAttachment(att.id, att.name)}
                  className="group flex items-center gap-1.5 bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)] border border-[var(--color-sage-green)]/30 hover:bg-[var(--color-sage-green)]/20 px-2.5 py-1 rounded-md text-[11px] font-bold shadow-sm transition-all relative overflow-hidden"
                  title={`Download ${att.name} (${(att.size / (1024 * 1024)).toFixed(2)}MB)`}
                >
                  <Paperclip className="w-3 h-3 group-hover:scale-110 transition-transform" />
                  <span className="max-w-[150px] truncate">{att.name}</span>
                  <DownloadCloud className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2" />
                </button>
              ))}
            </div>
          )}

          {/* TOTP 2FA Widget */}
          {p.totpSecret && (
            <div className="mt-2">
              <TOTPWidget
                totpSecret={p.totpSecret}
                issuer={p.totp_issuer}
                algorithm={p.totp_algorithm}
                digits={p.totp_digits}
                period={p.totp_period}
              />
            </div>
          )}

          {/* Secure Notes Preview */}
          {p.notes && p.category !== "Notes" && (
            <div className="mt-2 flex items-start gap-1.5 bg-amber-50/50 border border-amber-200/30 px-2.5 py-1.5 rounded-lg">
              <FileText className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-[var(--color-deep-navy)]/70 line-clamp-2 leading-relaxed">
                {p.notes.length > 120 ? p.notes.slice(0, 120) + "..." : p.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-8 relative z-10 ml-4 shrink-0">
        <div className="hidden lg:flex items-center gap-3">
          <div className="w-24 h-2 bg-black/5 rounded-full overflow-hidden">
            <div 
              className="h-full" 
              style={{ 
                width: `${p.strength || 0}%`,
                backgroundColor: (p.strength || 0) > 80 ? 'var(--color-sage-green)' : (p.strength || 0) > 40 ? '#f59e0b' : '#ef4444'
              }} 
            />
          </div>
          <span 
            className="text-[11px] uppercase font-bold opacity-80"
            style={{ color: (p.strength || 0) > 80 ? 'var(--color-sage-green)' : (p.strength || 0) > 40 ? '#f59e0b' : '#ef4444' }}
          >
            {(p.strength || 0) > 80 ? t("strong") : (p.strength || 0) > 40 ? t("average", "ORANGE") : t("weak", "ZAYIF")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex items-center gap-2">
            {isVulnerable && (
              <button
                onClick={() => {
                  onEdit({ ...p });
                  toast.info(t("updateNow"));
                }}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 text-[10px] font-black uppercase tracking-tighter hover:bg-red-500 hover:text-white transition-all animate-pulse"
              >
                {t("updateNow")}
              </button>
            )}
            <button
              onClick={() => onEdit({ ...p, pass: p.pass || "" })}
              className="p-3 rounded-xl bg-white/60 hover:bg-white hover:shadow-md transition-all flex items-center justify-center text-[var(--color-deep-navy)]/70 hover:text-[var(--color-sage-green)]"
              title={t("editEntry", "Edit")}
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <div className="relative">
              <button
                onClick={() => handleCopyItem(p.id, p.pass || "")}
                className={`relative z-10 p-3 rounded-xl transition-all flex items-center justify-center ${
                  isCopied
                    ? "bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)] shadow-[0_0_15px_rgba(135,159,132,0.4)] scale-110"
                    : "bg-white/60 hover:bg-white hover:shadow-md"
                }`}
              >
                {isCopied ? (
                  <Check className="w-5 h-5 text-[var(--color-sage-green)] drop-shadow-[0_0_8px_rgba(135,159,132,0.8)]" />
                ) : (
                  <Copy className="w-5 h-5 opacity-70" />
                )}
              </button>
              {isCopied && (
                <div className="absolute inset-0 pointer-events-none flex justify-center items-center">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-2 h-2 bg-[var(--color-sage-green)] rounded-full animate-float opacity-0"
                      style={{ transform: `rotate(${i * 60}deg)`, animationDelay: `${i * 0.05}s` }}
                    />
                  ))}
                </div>
              )}
            </div>

            {categoryFilter === "Trash" ? (
              <>
                <button
                  onClick={() => handleRestoreEntry(p.id)}
                  className="p-3 rounded-xl bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)] hover:bg-[var(--color-sage-green)] hover:text-white transition-all shadow-sm"
                  title={t("restore")}
                >
                  <FileUp className="w-5 h-5" />
                </button>
                <button
                  onClick={async () => {
                    if (confirm(t("confirmDeleteCard"))) {
                      await vaultService.deletePermanently(p.id);
                      toast.success(t("itemDeleted"));
                      loadPasswords();
                    }
                  }}
                  className="p-3 rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                  title={t("deletePermanently")}
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => handleDeleteEntry(p.id)}
                className="p-3 rounded-xl bg-white/60 hover:bg-red-500/10 hover:text-red-500 transition-all flex items-center justify-center text-[var(--color-deep-navy)]/70"
                title={t("moveToTrash")}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

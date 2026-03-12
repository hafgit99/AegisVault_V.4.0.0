import { useState, lazy, Suspense } from "react";
import { X, Wand2, Eye, EyeOff, ShieldCheck, Lock, Paperclip, FileUp, Tag, KeyRound, FileText, Camera } from "lucide-react";
import { useVault } from "../../contexts/VaultContext";
import { vaultService, type VaultEntry } from "../../vaultService";
import { parseOtpauthUri } from "../../lib/TOTPService";
import { VaultManager } from "../../lib/VaultManager";
import { TotpVaultPolicy } from "../../lib/TotpVaultPolicy";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

const QRScannerLazy = lazy(() => import("./QRScanner").then(m => ({ default: m.QRScanner })));

interface EntryFormProps {
  initialEntry?: Partial<VaultEntry>;
  onClose: () => void;
}

/**
 * EntryForm — Yeni kasa girişi oluşturma / mevcut girişi düzenleme formu.
 * Kategori bazlı dinamik placeholder'lar, etiket yönetimi ve dosya ek şifreleme kuyruğu içerir.
 */
export function EntryForm({ initialEntry, onClose }: EntryFormProps) {
  const { t } = useTranslation();
  const { handleCreateEntry } = useVault();

  const [newEntry, setNewEntry] = useState<Partial<VaultEntry>>(
    initialEntry || { title: "", username: "", pass: "", category: "General", tags: [], totpSecret: "", notes: "" }
  );
  const [showPassword, setShowPassword] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);
  const [totpInput, setTotpInput] = useState(initialEntry?.totpSecret || "");
  const [showTotpSection, setShowTotpSection] = useState(!!(initialEntry?.totpSecret || initialEntry?.totp_secret));
  const [showQRScanner, setShowQRScanner] = useState(false);
  const existingAttachments = Array.isArray(newEntry.attachments) ? newEntry.attachments : [];
  const visibleExistingAttachments = existingAttachments.filter((att) => !removedAttachmentIds.includes(att.id));
  const activeProfile = VaultManager.getActiveProfile();
  const totpMode = TotpVaultPolicy.getMode();
  const isSeparateTotpMode = totpMode === 'separate_2fa_vault';
  const isInTwoFactorVault = TotpVaultPolicy.isTwoFactorVault(activeProfile?.id);

  const generateSecurePassword = () => {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+=-";
    const array = new Uint32Array(18);
    window.crypto.getRandomValues(array);
    const pass = Array.from(array)
      .map((n) => charset[n % charset.length])
      .join("");
    setNewEntry((prev) => ({ ...prev, pass }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles = files.filter((f) => {
        if (f.size > 50 * 1024 * 1024) {
          toast.error(t("fileTooLarge", { name: f.name }));
          return false;
        }
        return true;
      });
      setNewAttachments((prev) => [...prev, ...validFiles]);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Edit modunda kaldırılan mevcut ekleri fiziksel olarak da sil
    if (newEntry.id && removedAttachmentIds.length > 0) {
      for (const attachmentId of removedAttachmentIds) {
        try {
          await vaultService.deleteAttachment(newEntry.id as number, attachmentId);
        } catch (err: any) {
          toast.error(err?.message || t("deleteAttachmentFailed", "Failed to delete attachment"));
        }
      }
    }

    const payload: Partial<VaultEntry> = {
      ...newEntry,
      attachments: visibleExistingAttachments,
    };

    if (isSeparateTotpMode && !isInTwoFactorVault) {
      payload.totpSecret = "";
      payload.totp_issuer = "";
      payload.totp_algorithm = undefined;
      payload.totp_digits = undefined;
      payload.totp_period = undefined;
      if (newEntry.totpSecret) {
        toast.info(t('totpSeparateModeBlocked'));
      }
    }

    await handleCreateEntry(payload, newAttachments);
    onClose();
  };

  return (
    <>
    <form
      onSubmit={handleSubmit}
      className="entry-form-surface flex flex-col gap-4 p-5 rounded-2xl bg-white/70 border border-[var(--color-sage-green)]/30 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300"
    >
      <div className="flex justify-between items-center mb-1">
        <h3 className="font-semibold text-[var(--color-deep-navy)]">{t("createZeroKnowledgeEntry")}</h3>
        <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-black/5 text-gray-500">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <input
          required
          type="text"
          placeholder={
            newEntry.category === "Cards"
              ? t("placeholderCardTitle")
              : newEntry.category === "Identities"
              ? t("placeholderIdentityTitle")
              : newEntry.category === "Notes"
              ? t("placeholderNoteTitle")
              : newEntry.category === "WiFi"
              ? t("placeholderWifiTitle")
              : t("titlePlaceholder")
          }
          value={newEntry.title}
          onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
          className="entry-field col-span-1 rounded-lg bg-white/50 py-2.5 px-3 text-sm font-medium outline-none border border-white/50 focus:border-[var(--color-sage-green)]/50 focus:ring-2 focus:ring-[var(--color-sage-green)]/20 shadow-inner"
        />
        <select
          value={newEntry.category}
          onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
          className="entry-field col-span-1 rounded-lg bg-white/50 py-2.5 px-3 text-sm font-medium outline-none border border-white/50 focus:border-[var(--color-sage-green)]/50 focus:ring-2 focus:ring-[var(--color-sage-green)]/20 shadow-inner"
        >
          <option value="General">{t("general")}</option>
          <option value="Cards">{t("cards")}</option>
          <option value="Identities">{t("identities")}</option>
          <option value="Notes">{t("notes")}</option>
          <option value="WiFi">{t("wifi")}</option>
        </select>

        {newEntry.category !== "Notes" && (
          <input
            type="text"
            placeholder={
              newEntry.category === "Cards"
                ? t("placeholderCardUser")
                : newEntry.category === "Identities"
                ? t("placeholderIdentityUser")
                : newEntry.category === "WiFi"
                ? t("placeholderWifiUser")
                : t("usernameEmailPlaceholder")
            }
            value={newEntry.username}
            onChange={(e) => setNewEntry({ ...newEntry, username: e.target.value })}
            className="entry-field col-span-2 rounded-lg bg-white/50 py-2.5 px-3 text-sm font-medium outline-none border border-white/50 focus:border-[var(--color-sage-green)]/50 focus:ring-2 focus:ring-[var(--color-sage-green)]/20 shadow-inner"
          />
        )}

        {newEntry.category !== "Notes" && (
          <input
            type="text"
            placeholder={
              newEntry.category === "Cards"
                ? t("placeholderCardUrl")
                : newEntry.category === "Identities"
                ? t("placeholderIdentityUrl")
                : newEntry.category === "WiFi"
                ? t("placeholderWifiUrl")
                : t("placeholderUrl")
            }
            value={newEntry.website || ""}
            onChange={(e) => setNewEntry({ ...newEntry, website: e.target.value })}
            className="entry-field col-span-2 rounded-lg bg-white/50 py-2.5 px-3 text-sm font-medium outline-none border border-white/50 focus:border-[var(--color-sage-green)]/50 focus:ring-2 focus:ring-[var(--color-sage-green)]/20 shadow-inner"
          />
        )}

        <div className="col-span-2 relative flex items-center">
          {newEntry.category === "Notes" ? (
            <textarea
              required
              placeholder={t("placeholderNotePass")}
              value={newEntry.pass}
              onChange={(e) => setNewEntry({ ...newEntry, pass: e.target.value })}
              className="entry-field w-full rounded-lg bg-white/50 py-2.5 px-3 h-32 text-sm font-medium outline-none border border-white/50 focus:border-[var(--color-sage-green)]/50 focus:ring-2 focus:ring-[var(--color-sage-green)]/20 shadow-inner resize-none overflow-y-auto"
            />
          ) : (
            <input
              required
              type={showPassword ? "text" : "password"}
              placeholder={
                newEntry.category === "Cards"
                  ? t("placeholderCardPass")
                  : newEntry.category === "Identities"
                  ? t("placeholderIdentityPass")
                  : newEntry.category === "WiFi"
                  ? t("placeholderWifiPass")
                  : t("securePassword")
              }
              value={newEntry.pass}
              onChange={(e) => setNewEntry({ ...newEntry, pass: e.target.value })}
              className="entry-field w-full rounded-lg bg-white/50 py-2.5 pl-3 pr-20 text-sm font-medium outline-none border border-white/50 focus:border-[var(--color-sage-green)]/50 focus:ring-2 focus:ring-[var(--color-sage-green)]/20 shadow-inner pass-font"
            />
          )}

          {newEntry.category !== "Notes" && (
            <div className="absolute right-2 flex items-center gap-1">
              <button
                type="button"
                onClick={generateSecurePassword}
                className="p-1.5 rounded-md text-[var(--color-deep-navy)]/40 hover:text-[var(--color-sage-green)] hover:bg-white/80 transition-colors"
                title={t("generateSecurePasswordBtn")}
              >
                <Wand2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1.5 rounded-md text-[var(--color-deep-navy)]/40 hover:text-[var(--color-sage-green)] hover:bg-white/80 transition-colors"
                title={showPassword ? t("hidePassword") : t("showPassword")}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>

        {/* Tags Input */}
        <div className="col-span-2 flex flex-col gap-2">
          <input
            type="text"
            placeholder={t("addTagPlaceholder")}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && tagInput.trim()) {
                e.preventDefault();
                if (!newEntry.tags?.includes(tagInput.trim())) {
                  setNewEntry((prev) => ({ ...prev, tags: [...(prev.tags || []), tagInput.trim()] }));
                }
                setTagInput("");
              }
            }}
            className="entry-field rounded-lg bg-white/50 py-2.5 px-3 text-sm font-medium outline-none border border-white/50 focus:border-[var(--color-sage-green)]/50 shadow-inner"
          />
          {newEntry.tags && newEntry.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {newEntry.tags.map((tg) => (
                <span
                  key={tg}
                  className="bg-[var(--color-sage-green)]/10 border border-[var(--color-sage-green)]/30 text-[var(--color-sage-green)] px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1"
                >
                  <Tag className="w-3 h-3" /> {tg}
                  <button
                    type="button"
                    onClick={() => setNewEntry((prev) => ({ ...prev, tags: prev.tags?.filter((tag) => tag !== tg) }))}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* TOTP 2FA Section */}
        {newEntry.category !== "Notes" && (
          <div className="col-span-2">
            {isSeparateTotpMode && !isInTwoFactorVault ? (
              <div className="rounded-xl border border-amber-300/40 bg-amber-50/60 px-3 py-2 text-xs font-medium text-amber-700">
                {t('totpSeparateModeHint')}
              </div>
            ) : !showTotpSection ? (
              <button
                type="button"
                onClick={() => setShowTotpSection(true)}
                className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-all font-bold rounded-lg border border-blue-500/20"
              >
                <KeyRound className="w-3.5 h-3.5" /> {t("addTOTP", "Add 2FA (TOTP)")}
              </button>
            ) : (
              <div className="entry-totp-box bg-blue-50/50 border border-blue-200/30 rounded-xl p-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-blue-600 flex items-center gap-1">
                    <KeyRound className="w-3 h-3" /> {t("totpSetup", "TOTP Setup")}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTotpSection(false);
                      setTotpInput("");
                      setNewEntry(prev => ({ ...prev, totpSecret: "", totp_issuer: "", totp_algorithm: undefined, totp_digits: undefined, totp_period: undefined }));
                    }}
                    className="p-1 rounded-md hover:bg-black/5 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t("totpPlaceholder", "otpauth://totp/... or Base32 secret key")}
                    value={totpInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTotpInput(val);
                      
                      // otpauth:// URI otomatik parse
                      if (val.startsWith("otpauth://")) {
                        try {
                          const params = parseOtpauthUri(val);
                          setNewEntry(prev => ({
                            ...prev,
                            totpSecret: params.secret,
                            totp_issuer: params.issuer,
                            totp_algorithm: params.algorithm,
                            totp_digits: params.digits,
                            totp_period: params.period,
                          }));
                        } catch {
                          // Henüz geçerli URI değil, devam et
                        }
                      } else {
                        // Manuel Base32 secret
                        setNewEntry(prev => ({
                          ...prev,
                          totpSecret: val.replace(/\s/g, "").toUpperCase(),
                          totp_algorithm: 'SHA-1',
                          totp_digits: 6,
                          totp_period: 30,
                        }));
                      }
                    }}
                    className="entry-field flex-1 rounded-lg bg-white/70 py-2 px-3 text-sm font-mono outline-none border border-blue-200/50 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowQRScanner(true)}
                    className="px-3 py-2 rounded-lg bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)] hover:bg-[var(--color-sage-green)]/20 transition-all border border-[var(--color-sage-green)]/20 flex items-center gap-1.5 text-xs font-bold"
                    title={t("scanQR", "Scan QR Code")}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    QR
                  </button>
                </div>
                {newEntry.totpSecret && (
                  <div className="flex items-center gap-3 text-[10px] text-blue-600/70">
                    <span>✓ {newEntry.totp_issuer || "Manual"}</span>
                    <span>• {newEntry.totp_algorithm || "SHA-1"}</span>
                    <span>• {newEntry.totp_digits || 6} digits</span>
                    <span>• {newEntry.totp_period || 30}s</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Secure Notes */}
        {newEntry.category !== "Notes" && (
          <div className="col-span-2">
            <div className="flex items-center gap-1.5 mb-1.5">
              <FileText className="w-3 h-3 text-amber-500" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-600">{t("secureNotes", "Secure Notes")}</span>
            </div>
            <textarea
              placeholder={t("secureNotesPlaceholder", "Add encrypted notes (optional)...")}
              value={newEntry.notes || ""}
              onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
              className="entry-field w-full rounded-lg bg-white/50 py-2.5 px-3 h-20 text-sm font-medium outline-none border border-white/50 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20 shadow-inner resize-none overflow-y-auto"
            />
          </div>
        )}

        {/* Attachment Upload */}
        <div className="col-span-2 mt-1">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input type="file" id="aegis-file-upload" multiple className="hidden" onChange={handleFileSelect} />
              <label
                htmlFor="aegis-file-upload"
                className="cursor-pointer text-xs flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)] hover:bg-[var(--color-sage-green)]/20 transition-all font-bold rounded-lg border border-[var(--color-sage-green)]/30"
              >
                <Paperclip className="w-3.5 h-3.5" /> {t("uploadAttachment")}
              </label>
            </div>
            {newAttachments.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-2 p-2 bg-yellow-50/50 rounded-lg border border-yellow-500/20 shadow-inner">
                <div className="text-[10px] uppercase font-bold text-yellow-600 tracking-wider flex items-center gap-1">
                  <Lock className="w-3 h-3" /> {t("encryptedQueue")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {newAttachments.map((file, i) => (
                    <div key={i} className="text-xs flex items-center gap-2 bg-white px-2 py-1 rounded shadow-sm border border-black/5">
                      <FileUp className="w-3 h-3 text-blue-500" />
                      <span className="font-medium text-gray-700 max-w-[120px] truncate">{file.name}</span>
                      <span className="text-gray-400 text-[10px]">{(file.size / (1024 * 1024)).toFixed(1)}MB</span>
                      <button
                        type="button"
                        onClick={() => setNewAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                        className="hover:text-red-500 ml-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {visibleExistingAttachments.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-2 p-2 bg-[var(--color-sage-green)]/5 rounded-lg border border-[var(--color-sage-green)]/20 shadow-inner">
                <div className="text-[10px] uppercase font-bold text-[var(--color-sage-green)] tracking-wider flex items-center gap-1">
                  <Paperclip className="w-3 h-3" /> {t("existingAttachments", "Existing Attachments")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {visibleExistingAttachments.map((att) => (
                    <div key={att.id} className="text-xs flex items-center gap-2 bg-white px-2 py-1 rounded shadow-sm border border-black/5">
                      <FileUp className="w-3 h-3 text-[var(--color-sage-green)]" />
                      <span className="font-medium text-gray-700 max-w-[120px] truncate">{att.name}</span>
                      <span className="text-gray-400 text-[10px]">{(att.size / (1024 * 1024)).toFixed(1)}MB</span>
                      <button
                        type="button"
                        onClick={() => setRemovedAttachmentIds((prev) => [...prev, att.id])}
                        className="hover:text-red-500 ml-1"
                        title={t("removeAttachment", "Remove attachment")}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-2">
        <button
          type="submit"
          className="flex items-center gap-2 bg-[var(--color-sage-green)] hover:brightness-90 text-[var(--color-deep-navy)] px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
        >
          <ShieldCheck className="w-4 h-4" /> {t("encryptSave")}
        </button>
      </div>
    </form>

    {/* QR Scanner Modal */}
    {showQRScanner && (
      <Suspense fallback={null}>
        <QRScannerLazy
          onScan={(data: string) => {
            setShowQRScanner(false);
            if (data.startsWith("otpauth://")) {
              setTotpInput(data);
              setShowTotpSection(true);
              try {
                const params = parseOtpauthUri(data);
                setNewEntry(prev => ({
                  ...prev,
                  totpSecret: params.secret,
                  totp_issuer: params.issuer,
                  totp_algorithm: params.algorithm,
                  totp_digits: params.digits,
                  totp_period: params.period,
                  title: prev.title || params.issuer || "",
                }));
                toast.success(t("qrScanned", "QR code scanned successfully!"));
              } catch {
                toast.error(t("invalidQR", "Invalid QR code format"));
              }
            } else {
              toast.error(t("notTotpQR", "Not a TOTP QR code. Expected otpauth:// URI."));
            }
          }}
          onClose={() => setShowQRScanner(false)}
        />
      </Suspense>
    )}
    </>
  );
}

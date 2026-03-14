import { useState, useEffect } from "react";
import { X, Wand2, Copy, Check, Settings, ShieldAlert, ShieldCheck, Lock, FileUp, FileDown, Database, AlertTriangle, Eye, EyeOff, Heart, Fingerprint } from "lucide-react";
import { GlowCard } from "../ui/GlowCard";
import { getCategoryIcon } from "../../lib/getCategoryIcon";
import { useVault } from "../../contexts/VaultContext";
import { vaultService, type VaultEntry } from "../../vaultService";
import { ImportService, type ImportProgress } from "../../lib/ImportService";
import { QRExporter } from "../QRExporter";
import { QRScanner } from "../QRScanner";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { BackupService } from "../../lib/BackupService";
import { ReAuthModal } from "../ReAuthModal";
import { WipeConfirmationModal } from "../WipeConfirmationModal";
import { PasswordGenerator } from "../settings/PasswordGenerator";
import { VaultManager } from "../../lib/VaultManager";
import { PasskeyBindingService } from "../../lib/PasskeyBindingService";
import { TotpVaultPolicy, type TotpVaultMode } from "../../lib/TotpVaultPolicy";

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onDonationOpen: () => void;
  onEditEntry: (entry: VaultEntry) => void;
}

/**
 * SettingsDrawer — Ayarlar, parola üreteci, Watchtower güvenlik denetimi,
 * import/export, QR Sync, Duress PIN yönetimi ve veri yönetimi.
 */
export function SettingsDrawer({ isOpen, onClose, onDonationOpen, onEditEntry }: SettingsDrawerProps) {
  const { t } = useTranslation();
  const {
    passwords,
    watchtower,
    duressPin,
    setDuressPin,
    killPin,
    setKillPin,
    saveSecretSettings,
    visiblePasswords,
    toggleVisibility,
    loadPasswords,
    autoLockTime,
    setAutoLockTime,
    hibpEnabled,
    setHibpEnabled,
    hibpLastResult,
  } = useVault();

  // Generator State
  const [genLength, setGenLength] = useState(18);
  const [genNumbers, setGenNumbers] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);
  const [genEntropy, setGenEntropy] = useState(0);
  const [standalonePassword, setStandalonePassword] = useState("");
  const [isStandaloneCopied, setIsStandaloneCopied] = useState(false);

  // Import State
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importReport, setImportReport] = useState<{ total: number; weak: number; missingFields: number; weakIds?: number[] } | null>(null);

  // Sync State
  const [syncMode, setSyncMode] = useState<"none" | "export" | "import">("none");
  const [syncData, setSyncData] = useState<string>("");

  // UI State
  const [showWeakPasswordsPopup, setShowWeakPasswordsPopup] = useState(false);
  const [showSecretMenu, setShowSecretMenu] = useState(false);
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const [hasPasskeyBinding, setHasPasskeyBinding] = useState(false);
  const [totpMode, setTotpMode] = useState<TotpVaultMode>(() => TotpVaultPolicy.getMode());
  const [totpVaultProfileName, setTotpVaultProfileName] = useState<string>("Aegis 2FA Vault");
  const [allowPlaintextExport, setAllowPlaintextExport] = useState<boolean>(() => {
    try {
      return localStorage.getItem('aegis_allow_plaintext_export') === '1';
    } catch {
      return false;
    }
  });

  // ReAuth State (P1-3)
  const [reAuthAction, setReAuthAction] = useState<{ name: string; action: () => void } | null>(null);

  const activeProfile = VaultManager.getActiveProfile();

  useEffect(() => {
    const binding = PasskeyBindingService.getBinding(activeProfile?.id || null, activeProfile?.dbName || 'aegis_opfs_vault');
    setHasPasskeyBinding(Boolean(binding));
  }, [activeProfile?.id, activeProfile?.dbName]);

  useEffect(() => {
    const profile = TotpVaultPolicy.getTwoFactorVaultProfile();
    if (profile?.name) setTotpVaultProfileName(profile.name);
  }, [totpMode]);

  // Action Wrappers for ReAuth (P1-3)
  const requireAuth = (name: string, action: () => void) => {
    setReAuthAction({ name, action });
  };

  // Export
  const executeExport = async (format: "vault" | "csv" | "json") => {
    const data = passwords;
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === "csv") {
      const headers = "Title,Username,Password,Category,Website,Tags\n";
      const rows = data.map((p) => `"${p.title}","${p.username}","${p.pass}","${p.category}","${p.website || ""}","${(p.tags || []).join(";")}"`).join("\n");
      content = headers + rows;
      filename = "aegis_export.csv";
      mimeType = "text/csv";
    } else if (format === "json") {
      content = JSON.stringify(data.map((p) => ({ title: p.title, username: p.username, password: p.pass, category: p.category, website: p.website, tags: p.tags })), null, 2);
      filename = "aegis_export.json";
      mimeType = "application/json";
    } else {
      // P1-1 Encrypted Backup Default
      try {
        // Will prompt for password below in a real impl, but here we can just pass a temp UI prompt or use the same auth flow
        // Since we already did ReAuth, the user typed their password there. 
        // A better approach: require users to provide a password for the backup file itself. 
        // For simplicity, we can use the same text prompt.
        const backupPass = window.prompt(t("enterBackupPassword", "Lütfen yedeği şifrelemek için bir parola belirleyin:"));
        if (!backupPass) return;
        
        content = await BackupService.encryptBackup(data, backupPass);
        filename = "aegis_vault_backup.aes";
        mimeType = "application/octet-stream";
      } catch (err) {
        toast.error("Encryption failed");
        return;
      }
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t("exportSuccess"));
  };

  const handleExport = (format: "vault" | "csv" | "json") => {
    if (format !== "vault") {
      if (!allowPlaintextExport) {
        toast.error(t('plainExportDisabled', 'Plaintext export is disabled by policy. Enable it first from security settings.'));
        return;
      }
      if (!window.confirm("UYARI: Düz metin (Plaintext) dışa aktarım, şifrelerinizin savunmasız bir biçimde kaydedilmesine neden olur. Devam etmek istediğinize emin misiniz?")) {
        return;
      }
    }
    requireAuth(t("exportAuthName", "Vault Export"), () => executeExport(format));
  };

  // Import
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setImportReport(null);

    try {
      if (file.name.endsWith('.aes')) {
         const backupPass = window.prompt("Lütfen yedeğin şifresini girin:");
         if (!backupPass) {
           setIsImporting(false);
           return;
         }
         const text = await file.text();
         const dec = await BackupService.decryptBackup(text, backupPass);
         // Simulate entries object
         const entries = dec;
         let processes = 0;
         setImportProgress({ status: "importing", totalAnalyzed: entries.length, processed: 0 });
         for (const entry of entries) {
           await vaultService.addPassword(entry);
           processes++;
           setImportProgress({ status: "importing", totalAnalyzed: entries.length, processed: processes });
         }
         setImportProgress({ status: "complete", totalAnalyzed: entries.length, processed: processes });
         setImportReport({ total: entries.length, weak: 0, missingFields: 0 });
         loadPasswords();
         toast.success(t("importSuccess", { count: entries.length }));
         setIsImporting(false);
         return;
      }

      const entries = await ImportService.parseFile(file, (progress) => {
        setImportProgress(progress);
      });

      const totalAnalyzed = entries.length;
      let processed = 0;
      let weakCount = 0;
      let missingFieldsCount = 0;

      setImportProgress({ status: "importing", totalAnalyzed, processed });

      for (const entry of entries) {
        if (!entry.title && !entry.username) {
          missingFieldsCount++;
        }
        if (!entry.pass || entry.pass.length < 8) {
          weakCount++;
        }
        await vaultService.addPassword(entry);
        processed++;
        setImportProgress({ status: "importing", totalAnalyzed, processed });
      }

      setImportProgress({ status: "complete", totalAnalyzed, processed });
      setImportReport({ total: totalAnalyzed, weak: weakCount, missingFields: missingFieldsCount });
      loadPasswords();
      toast.success(t("importSuccess", { count: totalAnalyzed }));
    } catch (err: any) {
      toast.error(t("importFailed", { error: err.message }));
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  const handleSyncExportInit = () => {
    requireAuth("QR Sync Export", () => {
      const exportData = JSON.stringify(passwords.map((p) => ({ title: p.title, username: p.username, pass: p.pass, website: p.website, category: p.category, tags: p.tags })));
      setSyncData(exportData);
      setSyncMode("export");
    });
  };

  const handleSyncImportSuccess = async (data: string) => {
    try {
      const entries = JSON.parse(data);
      if (!Array.isArray(entries)) throw new Error("Invalid sync data");
      for (const e of entries) {
        await vaultService.addPassword(e);
      }
      loadPasswords();
      setSyncMode("none");
      toast.success(t("syncImportSuccess", { count: entries.length }));
    } catch (e: any) {
      toast.error(t("syncImportFailed"));
    }
  };

  const handleFactoryReset = async () => {
    await vaultService.wipeAllData();
    window.location.reload();
  };

  const handleLogoClick = () => {
    setLogoClicks((prev) => {
      const next = prev + 1;
      if (next === 5) {
        setShowSecretMenu(true);
        toast.info(t("secretMenuActive"));
        return 0;
      }
      return next;
    });
  };

  const handlePasskeyRecoveryExport = async () => {
    const recoveryPass = window.prompt(t('passkeyRecoveryPasswordPrompt'));
    if (!recoveryPass) return;

    try {
      const encrypted = await PasskeyBindingService.exportRecoveryPackage(
        activeProfile?.id || null,
        activeProfile?.dbName || 'aegis_opfs_vault',
        recoveryPass
      );

      const blob = new Blob([encrypted], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aegis_passkey_recovery_${activeProfile?.id || 'default'}.aes`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(t('passkeyRecoveryExported'));
    } catch (err: any) {
      toast.error(t('passkeyRecoveryExportFailed'));
    }
  };

  const handlePasskeyRecoveryImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const recoveryPass = window.prompt(t('passkeyRecoveryImportPasswordPrompt'));
    if (!recoveryPass) {
      e.target.value = '';
      return;
    }

    try {
      const raw = await file.text();
      await PasskeyBindingService.importRecoveryPackage(
        raw,
        recoveryPass,
        activeProfile?.id || null,
        activeProfile?.dbName || 'aegis_opfs_vault'
      );
      setHasPasskeyBinding(true);
      toast.success(t('passkeyRecoveryImported'));
    } catch (err: any) {
      toast.error(t('passkeyRecoveryImportFailed'));
    } finally {
      e.target.value = '';
    }
  };

  const handlePasskeyRevokeForProfile = () => {
    if (!window.confirm(t('passkeyRevokeConfirm'))) return;
    const revoked = PasskeyBindingService.revokeBinding(activeProfile?.id || null, activeProfile?.dbName || 'aegis_opfs_vault');
    if (revoked) {
      setHasPasskeyBinding(false);
      toast.success(t('passkeyRevoked'));
    } else {
      toast.info(t('passkeyNoBindingForProfile'));
    }
  };

  const handleStorageAuditCleanup = () => {
    const keys = Object.keys(localStorage);
    const keepPrefixes = [
      'aegis_vault_profiles',
      'aegis_active_vault',
      'aegis_passkey_bindings_v1',
      'aegis_auto_lock_time',
      'aegis_hibp_enabled',
      'aegis_totp_vault_mode',
      'aegis_totp_vault_id',
      'aegis:view-density',
      'aegis:theme-mode',
      'i18nextLng',
    ];
    let removed = 0;
    for (const key of keys) {
      if (!key.startsWith('aegis_') && !key.startsWith('aegis:')) continue;
      const shouldKeep = keepPrefixes.some((prefix) => key === prefix || key.startsWith(prefix));
      if (!shouldKeep) {
        localStorage.removeItem(key);
        removed++;
      }
    }
    toast.success(t('storageAuditDone', { count: removed }));
  };

  const handleTotpModeChange = (mode: TotpVaultMode) => {
    TotpVaultPolicy.setMode(mode);
    setTotpMode(mode);

    if (mode === 'separate_2fa_vault') {
      const profile = TotpVaultPolicy.ensureTwoFactorVaultProfile();
      setTotpVaultProfileName(profile.name);
      toast.info(t('totpSeparateModeEnabled', { vault: profile.name }));
    } else {
      toast.info(t('totpSameVaultModeEnabled'));
    }
  };

  const switchToTwoFactorVault = () => {
    const profile = TotpVaultPolicy.ensureTwoFactorVaultProfile();
    VaultManager.setActiveVaultId(profile.id);
    toast.success(t('totpSwitchedTo2faVault', { vault: profile.name }));
    window.location.reload();
  };

  if (!isOpen) return null;

  return (
    <>
      {reAuthAction && (
        <ReAuthModal
          actionName={reAuthAction.name}
          onCancel={() => setReAuthAction(null)}
          onSuccess={() => {
            const action = reAuthAction.action;
            setReAuthAction(null);
            action();
          }}
        />
      )}

      {showWipeModal && (
        <WipeConfirmationModal
          onCancel={() => setShowWipeModal(false)}
          onConfirm={handleFactoryReset}
        />
      )}

      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
        <div className="absolute inset-0 bg-[var(--color-deep-navy)]/40 backdrop-blur-sm" onClick={onClose} />
        <GlowCard className="settings-drawer-surface bg-[rgba(255,255,255,0.9)] max-w-3xl w-full max-h-[90vh] overflow-y-auto backdrop-blur-[40px] border border-white/40 rounded-[2rem] p-8 relative z-10 shadow-2xl animate-in zoom-in-95 duration-300 slide-in-from-bottom-10 custom-scrollbar">
          <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4 mb-8" onClick={handleLogoClick}>
            <div className="w-14 h-14 bg-gradient-to-br from-[var(--color-sage-green)] to-[#6b8268] text-white rounded-2xl flex items-center justify-center shadow-lg cursor-pointer">
              <Settings className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-[var(--color-deep-navy)]">{t("settingsTitle")}</h2>
              <p className="opacity-60 text-sm mt-0.5">{t("settingsDesc")}</p>
            </div>
          </div>

          <div className="space-y-6 flex flex-col">
            {/* Advanced Generator Section */}
            <PasswordGenerator isOpen={isOpen} />

            {/* Watchtower Issues */}
            <div className="settings-danger-panel border border-red-500/20 bg-red-50/20 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                  <h3 className="text-lg font-semibold tracking-tight text-red-700">{t("watchtowerIssuesTitle")}</h3>
                </div>
                <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">{t("issuesFoundLabel", { count: watchtower.weak + watchtower.pwned })}</span>
              </div>
              <p className="watchtower-issues-desc text-xs opacity-80 mb-4 text-red-700">{t("watchtowerIssuesDesc")}</p>
              <button onClick={() => setShowWeakPasswordsPopup(true)} disabled={watchtower.weak + watchtower.pwned === 0} className="w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:grayscale">
                {t("viewIssuesBtn")}
              </button>
            </div>

            {/* Security & Sessions */}
            <div className="settings-panel border border-black/5 bg-white/60 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <ShieldCheck className="w-5 h-5 text-[var(--color-sage-green)]" />
                <h3 className="text-lg font-semibold tracking-tight">{t("securitySessionTitle")}</h3>
              </div>

              <div className="settings-subpanel bg-white/80 p-5 rounded-2xl border border-white flex flex-col md:flex-row justify-between md:items-center gap-4 shadow-inner mb-4">
                <div>
                  <h4 className="font-semibold text-sm mb-1 text-[var(--color-deep-navy)]">{t("autoLockTimerTitle")}</h4>
                  <p className="text-xs opacity-70 leading-relaxed max-w-md">{t("autoLockTimerDesc")}</p>
                </div>
                <select value={autoLockTime} onChange={(e) => setAutoLockTime(Number(e.target.value))} className="rounded-xl border border-[var(--color-sage-green)]/30 bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-deep-navy)] shadow-sm outline-none focus:ring-2 focus:ring-[var(--color-sage-green)]/40 min-w-[140px]">
                  <option value={1}>{t("lockTime1")}</option>
                  <option value={2}>{t("lockTime2")}</option>
                  <option value={5}>{t("lockTime5")}</option>
                  <option value={30}>{t("lockTime30")}</option>
                  <option value={0}>{t("lockTime0")}</option>
                </select>
              </div>

              <div className="settings-subpanel bg-white/80 p-5 rounded-2xl border border-white shadow-inner mb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-1 text-[var(--color-deep-navy)]">{t('hibpSettingsTitle')}</h4>
                    <p className="text-xs opacity-70 leading-relaxed max-w-md">{t('hibpSettingsDesc')}</p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-deep-navy)]">
                    <input
                      type="checkbox"
                      checked={hibpEnabled}
                      onChange={(e) => setHibpEnabled(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-[var(--color-sage-green)] focus:ring-[var(--color-sage-green)]/40"
                    />
                    {t('hibpPrivacyToggle')}
                  </label>
                </div>

                <div className="mt-2 rounded-xl border border-[var(--color-sage-green)]/20 bg-[var(--color-sage-green)]/5 px-3 py-2 text-[11px] text-[var(--color-deep-navy)]/80">
                  {t('hibpSettingsExplain')}
                </div>

                {hibpLastResult === 'unknown' && (
                  <div className="mt-2 rounded-xl border border-amber-300/40 bg-amber-50/60 px-3 py-2 text-[11px] font-medium text-amber-700">
                    {t('hibpResultUnknown')}
                  </div>
                )}
              </div>

              <div className="settings-subpanel bg-white/80 p-5 rounded-2xl border border-white shadow-inner mb-4">
                <h4 className="font-semibold text-sm mb-1 text-[var(--color-deep-navy)]">{t('totpVaultModeTitle')}</h4>
                <p className="text-xs opacity-70 leading-relaxed mb-3">{t('totpVaultModeDesc')}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                  <button
                    onClick={() => handleTotpModeChange('same_vault')}
                    className={`totp-mode-btn px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${totpMode === 'same_vault' ? 'totp-mode-btn-active' : ''}`}
                  >
                    {t('totpModeSameVault')}
                  </button>
                  <button
                    onClick={() => handleTotpModeChange('separate_2fa_vault')}
                    className={`totp-mode-btn px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${totpMode === 'separate_2fa_vault' ? 'totp-mode-btn-active' : ''}`}
                  >
                    {t('totpModeSeparateVault')}
                  </button>
                </div>

                {totpMode === 'separate_2fa_vault' && (
                  <div className="rounded-xl border border-amber-300/40 bg-amber-50/60 px-3 py-2 text-[11px] text-amber-700 mb-2">
                    {t('totpSeparateVaultTarget', { vault: totpVaultProfileName })}
                  </div>
                )}

                {totpMode === 'separate_2fa_vault' && passwords.filter((p) => Boolean(p.totpSecret)).length > 0 && (
                  <div className="rounded-xl border border-red-300/40 bg-red-50/60 px-3 py-2 text-[11px] text-red-700 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <span>{t('totpMigrationWarning', { count: passwords.filter((p) => Boolean(p.totpSecret)).length })}</span>
                    <button
                      onClick={switchToTwoFactorVault}
                      className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-bold hover:bg-red-700"
                    >
                      {t('totpSwitchTo2faVaultBtn')}
                    </button>
                  </div>
                )}
              </div>

              <div className="settings-subpanel bg-white/80 p-5 rounded-2xl border border-white shadow-inner mb-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h4 className="font-semibold text-sm mb-1 text-[var(--color-deep-navy)] flex items-center gap-2">
                      <Fingerprint className="w-4 h-4 text-[var(--color-sage-green)]" />
                      {t('passkeyRecoveryTitle')}
                    </h4>
                    <p className="text-xs opacity-70 leading-relaxed max-w-md">{t('passkeyRecoveryDesc')}</p>
                  </div>
                  <span className={`passkey-status-chip text-[10px] font-bold px-2 py-1 rounded-full ${hasPasskeyBinding ? 'passkey-status-chip-bound' : 'passkey-status-chip-unbound'}`}>
                    {hasPasskeyBinding ? t('passkeyBound') : t('passkeyNotBound')}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <button
                    onClick={() => requireAuth(t('passkeyRecoveryExportBtn'), handlePasskeyRecoveryExport)}
                    disabled={!hasPasskeyBinding}
                    className="settings-action-btn settings-action-btn-primary px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                  >
                    {t('passkeyRecoveryExportBtn')}
                  </button>

                  <label className="settings-action-btn settings-action-btn-secondary cursor-pointer px-3 py-2 rounded-xl text-xs font-semibold text-center transition-colors">
                    {t('passkeyRecoveryImportBtn')}
                    <input type="file" accept=".aes" className="hidden" onChange={handlePasskeyRecoveryImport} />
                  </label>

                  <button
                    onClick={() => requireAuth(t('passkeyRevokeButton'), handlePasskeyRevokeForProfile)}
                    disabled={!hasPasskeyBinding}
                    className="settings-action-btn settings-action-btn-danger px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                  >
                    {t('passkeyRevokeButton')}
                  </button>
                </div>
              </div>

              <div className="settings-subpanel bg-white/80 p-5 rounded-2xl border border-white shadow-inner mb-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-sm mb-1 text-[var(--color-deep-navy)]">{t('storageAuditTitle')}</h4>
                    <p className="text-xs opacity-70 leading-relaxed max-w-md">{t('storageAuditDesc')}</p>
                  </div>
                  <button
                    onClick={handleStorageAuditCleanup}
                    className="px-3 py-2 rounded-xl border border-[var(--color-sage-green)]/40 text-[var(--color-deep-navy)] text-xs font-semibold hover:bg-[var(--color-sage-green)]/10"
                  >
                    {t('storageAuditRun')}
                  </button>
                </div>
              </div>

              <div className="settings-subpanel bg-white/80 p-5 rounded-2xl border border-white shadow-inner mb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-1 text-[var(--color-deep-navy)]">{t('plainExportPolicyTitle', 'Plaintext Export Policy')}</h4>
                    <p className="text-xs opacity-70 leading-relaxed max-w-md">
                      {t('plainExportPolicyDesc', 'CSV/JSON exports are disabled by default for security. Enable only for temporary migration use.')}
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-deep-navy)]">
                    <input
                      type="checkbox"
                      checked={allowPlaintextExport}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setAllowPlaintextExport(next);
                        try {
                          localStorage.setItem('aegis_allow_plaintext_export', next ? '1' : '0');
                        } catch {}
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-[var(--color-sage-green)] focus:ring-[var(--color-sage-green)]/40"
                    />
                    {t('plainExportPolicyToggle', 'Allow CSV/JSON export')}
                  </label>
                </div>
              </div>

              {/* Donation */}
              <div className="mt-4 p-6 bg-gradient-to-br from-[var(--color-sage-green)]/10 to-transparent rounded-3xl border border-[var(--color-sage-green)]/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-[var(--color-sage-green)]">
                    <Heart className="w-6 h-6 fill-current" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[var(--color-deep-navy)]">{t("donateTitle")}</h4>
                    <p className="text-xs opacity-70 max-w-sm">{t("donateDesc")}</p>
                  </div>
                </div>
                <button onClick={onDonationOpen} className="btn-ink px-6 py-2.5 bg-[var(--color-deep-navy)] text-white rounded-xl text-sm font-bold shadow-md hover:bg-opacity-90 transition-all active:scale-95 whitespace-nowrap">
                  {t("donateBtn")}
                </button>
              </div>
            </div>

            {/* Secret Menu - Duress Mode */}
            {showSecretMenu && (
              <div className="border-2 border-red-500/20 bg-red-50/20 rounded-3xl p-6 shadow-sm animate-in zoom-in-95 duration-500">
                <div className="flex items-center gap-2 mb-6">
                  <Lock className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-extrabold tracking-tighter text-red-600 uppercase">{t("secretMenuTitle")}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="settings-subpanel bg-white/80 p-5 rounded-2xl border border-red-100 shadow-inner">
                    <h4 className="font-bold text-sm mb-2 text-[var(--color-deep-navy)]">{t("hiddenVaultTitle")}</h4>
                    <p className="text-xs opacity-70 mb-4">{t("hiddenVaultDesc")}</p>
                    <input type="password" placeholder={t("duressPinPlaceholder")} value={duressPin} onChange={(e) => setDuressPin(e.target.value)} className="w-full rounded-xl border border-red-100 bg-white px-4 py-2 text-sm font-mono tracking-widest outline-none focus:ring-2 focus:ring-red-400/20" />
                  </div>
                  <div className="settings-subpanel bg-white/80 p-5 rounded-2xl border border-red-100 shadow-inner">
                    <h4 className="font-bold text-sm mb-2 text-[var(--color-deep-navy)]">{t("silentWipeTitle")}</h4>
                    <p className="text-xs opacity-70 mb-4">{t("silentWipeDesc")}</p>
                    <input type="password" placeholder={t("killPinPlaceholder")} value={killPin} onChange={(e) => setKillPin(e.target.value)} className="w-full rounded-xl border border-red-100 bg-white px-4 py-2 text-sm font-mono tracking-widest outline-none focus:ring-2 focus:ring-red-400/20" />
                  </div>
                </div>
                <button onClick={() => requireAuth("Security Settings", saveSecretSettings)} className="mt-6 w-full py-3 rounded-xl bg-red-600 text-white font-black uppercase text-xs tracking-widest hover:bg-red-700 transition-all shadow-lg active:scale-95">
                  {t("saveSecretSettingsBtn")}
                </button>
              </div>
            )}

            {/* Data Management */}
            <div className="settings-panel border border-black/5 bg-white/60 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Database className="w-5 h-5 text-[var(--color-sage-green)]" />
                <h3 className="text-lg font-semibold tracking-tight">{t("dataManagementTitle")}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Export */}
                <div className="settings-subpanel bg-white/80 p-5 rounded-2xl border border-white flex flex-col justify-between shadow-inner">
                  <div>
                    <h4 className="font-semibold text-sm mb-1 text-[var(--color-deep-navy)]">{t("exportTitle")}</h4>
                    <p className="text-xs opacity-70 leading-relaxed mb-4">{t("exportDesc")}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => handleExport("vault")} className="btn-ink w-full justify-center flex items-center gap-2 py-2 rounded-xl bg-[var(--color-deep-navy)] text-white text-xs font-semibold hover:bg-opacity-90 transition-all active:scale-95 shadow-md">
                      <FileDown className="w-4 h-4" /> {t("exportVaultBtn")}
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button disabled={!allowPlaintextExport} onClick={() => handleExport("csv")} className="settings-plain-btn w-full justify-center flex items-center gap-2 py-2 rounded-xl bg-white/60 border border-black/10 text-[var(--color-deep-navy)] text-xs font-semibold hover:bg-white transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        {t("exportCsvBtn")}
                      </button>
                      <button disabled={!allowPlaintextExport} onClick={() => handleExport("json")} className="settings-plain-btn w-full justify-center flex items-center gap-2 py-2 rounded-xl bg-white/60 border border-black/10 text-[var(--color-deep-navy)] text-xs font-semibold hover:bg-white transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        {t("exportJsonBtn")}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Import */}
                <div className="settings-subpanel bg-white/80 p-5 rounded-2xl border border-white flex flex-col justify-between shadow-inner">
                  <div>
                    <h4 className="font-semibold text-sm mb-1 text-[var(--color-deep-navy)]">{t("importWizardTitle")}</h4>
                    <p className="text-xs opacity-70 leading-relaxed mb-4">{t("importWizardDesc")}</p>
                  </div>
                  {importProgress && (
                    <div className="mb-4 space-y-2 animate-in fade-in slide-in-from-top-1">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/60">
                        <span>{importProgress.status === "parsing" ? t("importAnalyzing") : importProgress.status === "importing" ? t("importEncrypting") : t("importCompleted")}</span>
                        <span>{Math.round((importProgress.processed / (importProgress.totalAnalyzed || 1)) * 100)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--color-sage-green)] transition-all duration-300" style={{ width: `${(importProgress.processed / (importProgress.totalAnalyzed || 1)) * 100}%` }} />
                      </div>
                    </div>
                  )}
                  <label className={`cursor-pointer w-full justify-center flex items-center gap-2 py-2.5 rounded-xl border border-[var(--color-sage-green)]/30 bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)] text-sm font-semibold hover:bg-[var(--color-sage-green)] hover:text-white transition-all active:scale-95 shadow-sm ${isImporting ? "opacity-50 pointer-events-none" : ""}`}>
                    <FileUp className="w-4 h-4" />
                    {isImporting ? t("importProcessing") : t("importBtn")}
                    <input type="file" accept=".csv,.json,.aes" className="hidden" onChange={handleImport} />
                  </label>
                </div>
              </div>

              {/* Data Reset */}
              <div className="danger-reset-panel mt-4 p-5 rounded-2xl border border-red-500/20 bg-red-50/50 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                <div>
                  <h4 className="danger-reset-title font-semibold text-sm mb-1 text-red-700">{t("factoryResetBtn")}</h4>
                  <p className="danger-reset-desc text-[11px] opacity-90 leading-relaxed max-w-sm text-red-700">{t("confirmFullWipe")}</p>
                </div>
                <button onClick={() => setShowWipeModal(true)} className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-all shadow-sm active:scale-95 whitespace-nowrap">
                  {t("factoryResetBtn")}
                </button>
              </div>

              {/* QR Sync */}
              {syncMode === "export" ? (
                <div className="mt-8"><QRExporter data={syncData} onCancel={() => setSyncMode("none")} /></div>
              ) : syncMode === "import" ? (
                <div className="mt-8"><QRScanner onScanSuccess={handleSyncImportSuccess} onCancel={() => setSyncMode("none")} /></div>
              ) : (
                <div className="mt-6 bg-[var(--color-sage-green)]/10 p-6 rounded-3xl border border-[var(--color-sage-green)]/20 shadow-inner flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h4 className="font-bold text-[var(--color-deep-navy)] text-base mb-1">{t("qrSyncTitle")}</h4>
                    <p className="text-xs opacity-80 max-w-sm">{t("qrSyncDesc")}</p>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button onClick={handleSyncExportInit} className="settings-secondary-btn px-5 py-2.5 bg-white border border-[var(--color-sage-green)]/40 rounded-xl text-[var(--color-deep-navy)] font-bold text-sm hover:bg-[var(--color-sage-green)] hover:text-white transition-all shadow-sm active:scale-95">
                      {t("qrExportBtn")}
                    </button>
                    <button onClick={() => setSyncMode("import")} className="btn-ink px-5 py-2.5 bg-[var(--color-deep-navy)] rounded-xl text-white font-bold text-sm hover:bg-opacity-90 transition-all shadow-md active:scale-95">
                      {t("qrImportBtn")}
                    </button>
                  </div>
                </div>
              )}

              {/* Import Report */}
              {importReport && (
                <div className="import-report-card mt-5 p-5 rounded-2xl border animate-in fade-in zoom-in-95 duration-500 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="p-2 bg-amber-500/15 rounded-xl text-amber-500 shrink-0"><AlertTriangle className="w-5 h-5" /></div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-[var(--color-deep-navy)]">{t("importReportTitle")}</h4>
                      <p className="text-xs opacity-60 mt-1 mb-2">{t("importReportDesc")}</p>
                      <div className="space-y-2 mt-3 font-[var(--font-geist-mono)] text-xs">
                        <div className="flex justify-between items-center py-1.5 border-b border-[var(--color-deep-navy)]/10">
                          <span className="opacity-70">{t("totalValidEntries")}</span>
                          <span className="font-bold text-[var(--color-sage-green)]">{importReport.total}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-[var(--color-deep-navy)]/10">
                          <span className="opacity-70">{t("weakPasswordsDetected")}</span>
                          <span className={`font-bold ${importReport.weak > 0 ? "text-red-500 cursor-pointer hover:underline" : "opacity-40"}`} onClick={() => { if (importReport.weak > 0) setShowWeakPasswordsPopup(true); }}>
                            {importReport.weak}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1.5">
                          <span className="opacity-70">{t("missingProperties")}</span>
                          <span className={`font-bold ${importReport.missingFields > 0 ? "text-amber-500" : "opacity-40"}`}>{importReport.missingFields}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </GlowCard>
      </div>

      {/* Weak Passwords Popup */}
      {showWeakPasswordsPopup && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[var(--color-deep-navy)]/40 backdrop-blur-sm" onClick={() => setShowWeakPasswordsPopup(false)} />
          <GlowCard className="weak-passwords-surface bg-[rgba(255,255,255,0.95)] max-w-2xl w-full max-h-[80vh] overflow-y-auto backdrop-blur-[40px] border border-red-500/20 rounded-[2rem] p-6 relative z-10 shadow-2xl custom-scrollbar">
            <button onClick={() => setShowWeakPasswordsPopup(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 text-gray-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-red-100/50 rounded-xl text-red-500"><AlertTriangle className="w-6 h-6" /></div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[var(--color-deep-navy)]">{t("weakPasswordsReportTitle")}</h2>
                <p className="opacity-60 text-xs mt-0.5">{t("weakPasswordsReportDesc")}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {passwords.filter((p) => !p.pass || p.pass.length < 8 || (p.pwned_count || 0) > 0).map((p) => (
                <div key={p.id} className="settings-subpanel flex items-center justify-between p-4 rounded-xl bg-white/60 border border-black/5 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">{getCategoryIcon(p.category)}</div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[var(--color-deep-navy)]">{p.title}</span>
                        {(p.pwned_count || 0) > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">Pwned</span>}
                      </div>
                      <span className="text-xs opacity-60 font-mono">{p.username}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className={`pass-font text-xs rounded-md select-all transition-all duration-300 ${visiblePasswords.has(p.id) ? "bg-black/5 px-2 py-1 text-[var(--color-deep-navy)]" : "tracking-[0.25em] opacity-40 select-none mt-1"}`}>
                        {visiblePasswords.has(p.id) ? p.pass : "••••••••"}
                      </span>
                      <button onClick={() => toggleVisibility(p.id)} className="p-1.5 rounded-md hover:bg-black/5 text-[var(--color-deep-navy)]/40 hover:text-[var(--color-sage-green)] transition-all">
                        {visiblePasswords.has(p.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="w-px h-6 bg-black/10 mx-1" />
                    <button
                      onClick={() => {
                        onEditEntry({ ...p, pass: "" } as VaultEntry);
                        setShowWeakPasswordsPopup(false);
                        onClose();
                      }}
                      className="p-1.5 rounded-md hover:bg-black/5 text-gray-500 hover:text-[var(--color-sage-green)] transition-all"
                      title={t("editUpdatePassword")}
                    >
                      <Wand2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {passwords.filter((p) => (!p.pass || p.pass.length < 8) || (p.pwned_count || 0) > 0).length === 0 && (
                <div className="text-center py-8 opacity-50 text-sm italic">{t("noWeakPasswords")}</div>
              )}
            </div>
          </GlowCard>
        </div>
      )}
    </>
  );
}

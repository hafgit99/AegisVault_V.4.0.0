import { useState, useEffect, useCallback } from "react";
import { X, Wand2, Settings, ShieldAlert, ShieldCheck, Lock, FileUp, FileDown, Database, AlertTriangle, Eye, EyeOff, Heart, Fingerprint } from "lucide-react";
import { GlowCard } from "../ui/GlowCard";
import { getCategoryIcon } from "../../lib/getCategoryIcon";
import { useVault } from "../../contexts/VaultContext";
import { vaultService, type VaultEntry } from "../../vaultService";
import { ExportService } from "../../lib/ExportService";
import { ImportService, type ImportAnalysisReport, type ImportProgress } from "../../lib/ImportService";
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
import { SecureAppSettings, type SecurityModeProfile } from "../../lib/SecureAppSettings";
import { SecurityModePolicy } from "../../lib/SecurityModePolicy";
import { TotpVaultPolicy, type TotpVaultMode } from "../../lib/TotpVaultPolicy";
import { QRSyncService, type QRSyncPackage, type QRSyncReceiverSession } from "../../lib/QRSyncService";

interface DesktopPairingRecord {
  extensionId: string;
  browserName: string;
  clientLabel?: string;
  clientKeyId?: string;
  pairingMode?: string;
  deviceFingerprint?: string;
  pairedAt: string;
  lastUsedAt?: string;
  lastApprovedAt?: string;
  riskFlags?: string[];
  riskLevel?: string;
  pairingHistory?: Array<{
    at?: string;
    type?: string;
    detail?: string;
    riskFlags?: string[];
  }>;
  secretSource: string;
}

interface DesktopPairingRemoveResult {
  success?: boolean;
  error?: string;
}

interface SettingsElectronApi {
  listExtensionPairings?: () => Promise<DesktopPairingRecord[]>;
  removeExtensionPairing?: (extensionId: string) => Promise<DesktopPairingRemoveResult>;
}

type WindowWithAegisElectron = Window & typeof globalThis & {
  aegisElectron?: SettingsElectronApi;
};

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

  // Import State
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importReport, setImportReport] = useState<ImportAnalysisReport | null>(null);

  // Sync State
  const [syncMode, setSyncMode] = useState<"none" | "export-config" | "export" | "import">("none");
  const [syncData, setSyncData] = useState<string>("");
  const [syncTransferCode, setSyncTransferCode] = useState<string>("");
  const [syncRecipientPairingCode, setSyncRecipientPairingCode] = useState<string>("");
  const [syncReceiverSession, setSyncReceiverSession] = useState<QRSyncReceiverSession | null>(null);
  const [syncExportPackage, setSyncExportPackage] = useState<QRSyncPackage | null>(null);
  const [qrTransferHistory, setQrTransferHistory] = useState<ReturnType<typeof QRSyncService.listTransferHistory>>([]);
  const [qrTransferAudit, setQrTransferAudit] = useState<ReturnType<typeof QRSyncService.listAuditEvents>>([]);

  // UI State
  const [showWeakPasswordsPopup, setShowWeakPasswordsPopup] = useState(false);
  const [showSecretMenu, setShowSecretMenu] = useState(false);
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [hasPasskeyBinding, setHasPasskeyBinding] = useState(false);
  const [passkeyBindingDetails, setPasskeyBindingDetails] = useState<ReturnType<typeof PasskeyBindingService.getBinding> | null>(null);
  const [allPasskeyBindings, setAllPasskeyBindings] = useState<ReturnType<typeof PasskeyBindingService.listBindings>>([]);
  const [passkeyEventLog, setPasskeyEventLog] = useState<ReturnType<typeof PasskeyBindingService.getEventLog>>([]);
  const [passkeyRevocations, setPasskeyRevocations] = useState<ReturnType<typeof PasskeyBindingService.listRevocations>>([]);
  const [passkeyPolicy, setPasskeyPolicy] = useState(PasskeyBindingService.getPolicy());
  const [totpMode, setTotpMode] = useState<TotpVaultMode>(() => TotpVaultPolicy.getMode());
  const [totpVaultProfileName, setTotpVaultProfileName] = useState<string>("Aegis 2FA Vault");
  const [securityModeProfile, setSecurityModeProfile] = useState<SecurityModeProfile>(() => SecurityModePolicy.getProfile());
  const [allowPlaintextExport, setAllowPlaintextExport] = useState<boolean>(() => SecureAppSettings.getPlaintextExportEnabled());
  const [desktopPairings, setDesktopPairings] = useState<DesktopPairingRecord[]>([]);
  const [loadingDesktopPairings, setLoadingDesktopPairings] = useState(false);

  // ReAuth State (P1-3)
  const [reAuthAction, setReAuthAction] = useState<{ name: string; action: () => void } | null>(null);

  const activeProfile = VaultManager.getActiveProfile();
  const getElectronApi = (): SettingsElectronApi | undefined =>
    (window as WindowWithAegisElectron).aegisElectron;
  const formatPairingTimestamp = (value?: string) => {
    if (!value) return t('desktopPairingUnknownTime', 'Unknown time');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };
  const mapRiskFlagLabel = (flag: string) => {
    if (flag === 'fingerprint_changed') return t('desktopPairingRiskFingerprint', 'Device fingerprint changed');
    if (flag === 'install_id_changed') return t('desktopPairingRiskInstall', 'Installation changed');
    if (flag === 'browser_changed') return t('desktopPairingRiskBrowser', 'Browser identity changed');
    if (flag === 'client_key_changed') return t('desktopPairingRiskClientKey', 'Client signing key changed');
    if (flag === 'rapid_repair') return t('desktopPairingRiskRapid', 'Rapid re-pairing detected');
    return flag;
  };
  const mapImportWarningLabel = (warning: string) => {
    if (warning === "BITWARDEN_CSV_DETECTED") {
      return t("importWarningBitwarden", "Bitwarden CSV format detected.");
    }
    if (warning === "ONEPASSWORD_CSV_DETECTED") {
      return t("importWarning1Password", "1Password CSV format detected.");
    }
    if (warning === "KEEPASSXC_CSV_DETECTED") {
      return t("importWarningKeePassXC", "KeePassXC CSV format detected.");
    }
    if (warning === "PROTON_PASS_CSV_DETECTED") {
      return t("importWarningProtonPass", "Proton Pass CSV format detected.");
    }
    if (warning === "ENCRYPTED_AEGIS_BACKUP") {
      return t("importWarningEncryptedBackup", "Encrypted Aegis backup imported.");
    }
    return warning;
  };
  const persistPlaintextExportPreference = (enabled: boolean) => {
    SecureAppSettings.setPlaintextExportEnabled(enabled);
  };
  const currentSecurityModeDefinition = SecurityModePolicy.getDefinition(securityModeProfile);
  const mapQrAuditLabel = (type: string) => {
    if (type === "package_created") return t("qrSyncAuditCreated", "Transfer created");
    if (type === "package_consumed") return t("qrSyncAuditConsumed", "Transfer imported");
    if (type === "package_revoked") return t("qrSyncAuditRevoked", "Transfer revoked");
    if (type === "package_rejected") return t("qrSyncAuditRejected", "Transfer rejected");
    if (type === "receiver_session_created") return t("qrSyncAuditReceiverSession", "Receiver session created");
    return type;
  };
  const refreshQrSyncTelemetry = useCallback(() => {
    setQrTransferHistory(QRSyncService.listTransferHistory());
    setQrTransferAudit(QRSyncService.listAuditEvents());
  }, []);

  const loadPasskeyState = useCallback(async () => {
    await SecureAppSettings.initialize();
    await PasskeyBindingService.initialize();
    const binding = PasskeyBindingService.getBinding(activeProfile?.id || null, activeProfile?.dbName || 'aegis_opfs_vault');
    setHasPasskeyBinding(Boolean(binding));
    setPasskeyBindingDetails(binding);
    setAllPasskeyBindings(PasskeyBindingService.listBindings());
    setPasskeyEventLog(PasskeyBindingService.getEventLog(activeProfile?.id || null, activeProfile?.dbName || 'aegis_opfs_vault'));
    setPasskeyRevocations(PasskeyBindingService.listRevocations());
    setPasskeyPolicy(PasskeyBindingService.getPolicy());
    const currentProfile = SecurityModePolicy.getProfile();
    setSecurityModeProfile(currentProfile);
    setAllowPlaintextExport(
      SecurityModePolicy.isPlaintextExportAllowed(currentProfile) && SecureAppSettings.getPlaintextExportEnabled()
    );
    setTotpMode(TotpVaultPolicy.getMode());
  }, [activeProfile?.id, activeProfile?.dbName]);

  const resetSyncFlow = useCallback(() => {
    setSyncMode("none");
    setSyncData("");
    setSyncTransferCode("");
    setSyncRecipientPairingCode("");
    setSyncReceiverSession(null);
    setSyncExportPackage(null);
    refreshQrSyncTelemetry();
  }, [refreshQrSyncTelemetry]);

  const createReceiverPairingSession = async () => {
    const session = await QRSyncService.createReceiverSession();
    setSyncReceiverSession(session);
    refreshQrSyncTelemetry();
    return session;
  };

  const copyReceiverPairingCode = async () => {
    if (!syncReceiverSession?.publicKey) return;
    try {
      await navigator.clipboard.writeText(syncReceiverSession.publicKey);
      toast.success(t('qrSyncCodeCopied', 'Transfer code copied.'));
    } catch {
      toast.error(t('qrSyncCodeCopyFailed', 'Transfer code could not be copied.'));
    }
  };

  useEffect(() => {
    void loadPasskeyState();
  }, [loadPasskeyState]);

  useEffect(() => {
    void SecureAppSettings.initialize().then(() => {
      refreshQrSyncTelemetry();
    });
  }, [refreshQrSyncTelemetry]);

  useEffect(() => {
    const profile = TotpVaultPolicy.getTwoFactorVaultProfile();
    if (profile?.name) setTotpVaultProfileName(profile.name);
  }, [totpMode]);

  const applySecurityModeProfile = useCallback((profile: SecurityModeProfile) => {
    SecurityModePolicy.setProfile(profile);
    setSecurityModeProfile(profile);

    const definition = SecurityModePolicy.getDefinition(profile);
    const plaintextEnabled = definition.allowPlaintextExport && SecureAppSettings.getPlaintextExportEnabled();
    if (!definition.allowPlaintextExport) {
      SecureAppSettings.setPlaintextExportEnabled(false);
    }
    setAllowPlaintextExport(plaintextEnabled);

    if (!definition.allowHibpNetwork && hibpEnabled) {
      setHibpEnabled(false);
    }

    const enforcedAutoLock = SecurityModePolicy.enforceAutoLock(autoLockTime, profile);
    if (enforcedAutoLock !== autoLockTime) {
      setAutoLockTime(enforcedAutoLock);
    }

    if (!definition.allowQrSync && syncMode !== "none") {
      resetSyncFlow();
    }

    toast.success(t("securityModeUpdated"));
  }, [autoLockTime, hibpEnabled, resetSyncFlow, setAutoLockTime, setHibpEnabled, syncMode, t]);

  const handlePlaintextExportToggle = (enabled: boolean) => {
    if (!SecurityModePolicy.isPlaintextExportAllowed(securityModeProfile) && enabled) {
      toast.info(t("securityModePlaintextBlocked"));
      setAllowPlaintextExport(false);
      persistPlaintextExportPreference(false);
      return;
    }
    setAllowPlaintextExport(enabled);
    persistPlaintextExportPreference(enabled);
  };

  useEffect(() => {
    if (!isOpen) return;

    const electronApi = getElectronApi();
    if (!electronApi?.listExtensionPairings) {
      setDesktopPairings([]);
      return;
    }

    setLoadingDesktopPairings(true);
    electronApi.listExtensionPairings()
      .then((records: DesktopPairingRecord[]) => {
        setDesktopPairings(Array.isArray(records) ? records : []);
      })
      .catch(() => {
        setDesktopPairings([]);
      })
      .finally(() => {
        setLoadingDesktopPairings(false);
      });
  }, [isOpen]);

  // Action Wrappers for ReAuth (P1-3)
  const requireAuth = (name: string, action: () => void) => {
    setReAuthAction({ name, action });
  };

  // Export
  const executeExport = async (format: "vault" | "csv" | "json") => {
    const data = passwords;
    const exportEntries = ExportService.fromVaultEntries(data);
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === "csv") {
      content = ExportService.buildCsv(exportEntries);
      filename = "aegis_export.csv";
      mimeType = "text/csv";
    } else if (format === "json") {
      content = ExportService.buildJson(exportEntries);
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
      } catch {
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
      if (!SecurityModePolicy.isPlaintextExportAllowed(securityModeProfile) || !allowPlaintextExport) {
        toast.error(t('securityModePlaintextBlocked'));
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
         const dec = await BackupService.decryptBackup<Partial<VaultEntry>>(text, backupPass);
         const entries = dec;
         let processes = 0;
         setImportProgress({ status: "importing", totalAnalyzed: entries.length, processed: 0 });
         for (const entry of entries) {
           await vaultService.addPassword(entry);
           processes++;
           setImportProgress({ status: "importing", totalAnalyzed: entries.length, processed: processes });
         }
         setImportProgress({ status: "complete", totalAnalyzed: entries.length, processed: processes });
         setImportReport({
           sourceFormat: "json",
           totalRows: entries.length,
           validEntries: entries.length,
           skippedRows: 0,
           weakPasswords: entries.filter((entry) => !entry.pass || entry.pass.length < 8).length,
           missingCriticalFields: entries.filter((entry) => !entry.title || !entry.username || !entry.website).length,
           duplicateCandidates: 0,
           warnings: ["ENCRYPTED_AEGIS_BACKUP"],
         });
         loadPasswords();
         toast.success(t("importSuccess", { count: entries.length }));
         setIsImporting(false);
         return;
      }

      const { entries, report } = await ImportService.parseFile(file, (progress) => {
        setImportProgress(progress);
      });

      const totalAnalyzed = report.totalRows || entries.length;
      let processed = 0;

      setImportProgress({ status: "importing", totalAnalyzed, processed });

      for (const entry of entries) {
        await vaultService.addPassword(entry);
        processed++;
        setImportProgress({ status: "importing", totalAnalyzed, processed });
      }

      setImportProgress({ status: "complete", totalAnalyzed, processed });
      setImportReport(report);
      loadPasswords();
      toast.success(t("importSuccess", { count: report.validEntries }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'IMPORT_FAILED';
      toast.error(t("importFailed", { error: message }));
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  const handleSyncExportInit = () => {
    if (!SecurityModePolicy.isQrSyncAllowed(securityModeProfile)) {
      toast.error(t("securityModeQrSyncBlocked"));
      return;
    }
    requireAuth(t("qrSyncExportAuthName", "QR Sync Export"), () => {
      setSyncTransferCode(QRSyncService.generateTransferCode());
      setSyncRecipientPairingCode("");
      setSyncExportPackage(null);
      setSyncMode("export-config");
    });
  };

  const handleSyncExportGenerate = async () => {
    if (!SecurityModePolicy.isQrSyncAllowed(securityModeProfile)) {
      toast.error(t("securityModeQrSyncBlocked"));
      return;
    }
    try {
      const exportResult = await QRSyncService.createPackage(
        passwords.map((p) => ({
          title: p.title,
          username: p.username,
          pass: p.pass || '',
          website: p.website,
          category: p.category,
          tags: p.tags,
        })),
        {
          transferCode: syncTransferCode,
          recipientPublicKey: syncRecipientPairingCode.trim() || undefined,
        }
      );

      setSyncData(exportResult.rawPackage);
      setSyncExportPackage(exportResult.packageInfo);
      setSyncMode("export");
      refreshQrSyncTelemetry();
      toast.success(t("qrSyncExportReady", "Encrypted QR transfer is ready."));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'QR_SYNC_EXPORT_FAILED';
      toast.error(t("qrSyncExportFailed", { error: message, defaultValue: "QR transfer could not be prepared: {{error}}" }));
    }
  };

  const handleSyncImportSuccess = async (data: string) => {
    if (!SecurityModePolicy.isQrSyncAllowed(securityModeProfile)) {
      toast.error(t("securityModeQrSyncBlocked"));
      resetSyncFlow();
      return;
    }
    try {
      const entries = await QRSyncService.parsePackage(data, {
        transferCode: syncTransferCode,
        receiverSession: syncReceiverSession,
      });
      for (const e of entries) {
        await vaultService.addPassword(e);
      }
      loadPasswords();
      refreshQrSyncTelemetry();
      resetSyncFlow();
      toast.success(t("syncImportSuccess", { count: entries.length }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'QR_SYNC_IMPORT_FAILED';
      toast.error(t("syncImportFailed", { error: message, defaultValue: "QR transfer could not be imported: {{error}}" }));
    }
  };

  const handleFactoryReset = async () => {
    await vaultService.wipeAllData();
    window.location.reload();
  };

  const handleLogoClick = () => {
    setShowSecretMenu(true);
    toast.info(t("secretMenuActive"));
  };

  const handlePasskeyRecoveryExport = async () => {
    const recoveryPass = window.prompt(t('passkeyRecoveryPasswordPrompt'));
    if (!recoveryPass) return;

    try {
      await PasskeyBindingService.initialize();
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

      await loadPasskeyState();
      toast.success(t('passkeyRecoveryExported'));
    } catch {
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
      await PasskeyBindingService.initialize();
      const raw = await file.text();
      await PasskeyBindingService.importRecoveryPackage(
        raw,
        recoveryPass,
        activeProfile?.id || null,
        activeProfile?.dbName || 'aegis_opfs_vault'
      );
      await loadPasskeyState();
      toast.success(t('passkeyRecoveryImported'));
    } catch {
      toast.error(t('passkeyRecoveryImportFailed'));
    } finally {
      e.target.value = '';
    }
  };

  const handlePasskeyRevokeForProfile = async () => {
    if (!window.confirm(t('passkeyRevokeConfirm'))) return;
    const reason = window.prompt(t('passkeyRevokeReasonPrompt', 'Optional revoke note:'), 'manual_revoke') || 'manual_revoke';
    await PasskeyBindingService.initialize();
    const revoked = PasskeyBindingService.revokeBinding(activeProfile?.id || null, activeProfile?.dbName || 'aegis_opfs_vault', reason);
    if (revoked) {
      await loadPasskeyState();
      toast.success(t('passkeyRevoked'));
    } else {
      toast.info(t('passkeyNoBindingForProfile'));
    }
  };

  const handleStorageAuditCleanup = () => {
    const keys = Object.keys(localStorage);
    const keepPrefixes = [
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
    SecureAppSettings.clearMigratedLegacyKeys();
    toast.success(t('storageAuditDone', { count: removed }));
  };

  const handleQrTransferRevoke = (sessionId: string) => {
    if (!window.confirm(t("qrSyncRevokeConfirm", "Do you want to revoke this QR transfer? It can no longer be imported."))) {
      return;
    }
    const reason = window.prompt(t("qrSyncRevokeReasonPrompt", "Optional revoke note:"), "manual_revoke") || "manual_revoke";
    const revoked = QRSyncService.revokeTransfer(sessionId, reason);
    refreshQrSyncTelemetry();
    if (revoked) {
      if (syncExportPackage?.sessionId === sessionId) {
        setSyncExportPackage(null);
        setSyncData("");
      }
      toast.success(t("qrSyncRevokeSuccess", "QR transfer revoked."));
    } else {
      toast.error(t("qrSyncRevokeFailed", "QR transfer could not be revoked."));
    }
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

  const handleRemoveDesktopPairing = async (extensionId: string) => {
    const electronApi = getElectronApi();
    if (!electronApi?.removeExtensionPairing) {
      toast.error(t('desktopPairingUnavailable', 'Desktop pairing controls are unavailable in this environment.'));
      return;
    }

    if (!window.confirm(t('desktopPairingRemoveConfirm', 'Remove this extension pairing? The browser extension will need to pair again.'))) {
      return;
    }

    try {
      const result = await electronApi.removeExtensionPairing(extensionId);
      if (!result?.success) {
        throw new Error(result?.error || 'REMOVE_FAILED');
      }

      setDesktopPairings((prev) => prev.filter((record) => record.extensionId !== extensionId));
      toast.success(t('desktopPairingRemoved', 'Desktop pairing removed.'));
    } catch {
      toast.error(t('desktopPairingRemoveFailed', 'Failed to remove desktop pairing.'));
    }
  };

  const switchToTwoFactorVault = () => {
    const profile = TotpVaultPolicy.ensureTwoFactorVaultProfile();
    VaultManager.setActiveVaultId(profile.id);
    toast.success(t('totpSwitchedTo2faVault', { vault: profile.name }));
    window.location.reload();
  };

  if (!isOpen) return null;

  const activePasskeyAgeDays = passkeyBindingDetails?.meta?.createdAt
    ? Math.floor((Date.now() - Date.parse(passkeyBindingDetails.meta.createdAt)) / (1000 * 60 * 60 * 24))
    : null;

  const updatePasskeyPolicy = async (next: Partial<typeof passkeyPolicy>) => {
    await PasskeyBindingService.initialize();
    const updated = PasskeyBindingService.updatePolicy(next);
    setPasskeyPolicy(updated);
    setPasskeyEventLog(PasskeyBindingService.getEventLog(activeProfile?.id || null, activeProfile?.dbName || 'aegis_opfs_vault'));
    toast.success(t('passkeyPolicyUpdated', 'Passkey security policy updated.'));
  };

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
        <GlowCard className="settings-drawer-surface max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-white/40 rounded-[2rem] p-8 relative z-10 shadow-2xl animate-in zoom-in-95 duration-300 slide-in-from-bottom-10 custom-scrollbar">
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
            <div className="settings-danger-panel border rounded-3xl p-6 shadow-sm">
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
            <div className="settings-panel rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <ShieldCheck className="w-5 h-5 text-[var(--color-sage-green)]" />
                <h3 className="text-lg font-semibold tracking-tight">{t("securitySessionTitle")}</h3>
              </div>

              <div className="settings-subpanel p-5 rounded-2xl border flex flex-col gap-4 shadow-inner mb-4">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-1 text-[var(--color-deep-navy)]">{t("securityModeTitle")}</h4>
                    <p className="text-xs opacity-70 leading-relaxed max-w-md">{t("securityModeDesc")}</p>
                  </div>
                  <span className="rounded-full bg-[var(--color-sage-green)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-sage-green)]">
                    {t(`securityMode${securityModeProfile.charAt(0).toUpperCase()}${securityModeProfile.slice(1)}`)}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {SecurityModePolicy.listDefinitions().map((definition) => {
                    const isActive = definition.profile === securityModeProfile;
                    return (
                      <button
                        key={definition.profile}
                        onClick={() => applySecurityModeProfile(definition.profile)}
                        className={`rounded-2xl border px-4 py-4 text-left transition-all shadow-sm ${
                          isActive
                            ? "border-[var(--color-sage-green)] bg-[var(--color-sage-green)]/10 ring-2 ring-[var(--color-sage-green)]/20"
                            : "settings-card-surface hover:bg-white dark:hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-semibold text-sm text-[var(--color-deep-navy)]">
                            {t(`securityMode${definition.profile.charAt(0).toUpperCase()}${definition.profile.slice(1)}`)}
                          </div>
                          {isActive && (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-sage-green)]">
                              {t("securityModeActive")}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-[var(--color-deep-navy)]/70">
                          {t(definition.descriptionKey)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="settings-subpanel p-5 rounded-2xl border border-white flex flex-col md:flex-row justify-between md:items-center gap-4 shadow-inner mb-4">
                <div>
                  <h4 className="font-semibold text-sm mb-1 text-[var(--color-deep-navy)]">{t("autoLockTimerTitle")}</h4>
                  <p className="text-xs opacity-70 leading-relaxed max-w-md">{t("autoLockTimerDesc")}</p>
                </div>
                <select value={autoLockTime} onChange={(e) => setAutoLockTime(Number(e.target.value))} className="rounded-xl border qr-scanner-input px-4 py-2.5 text-sm font-semibold text-[var(--color-deep-navy)] shadow-sm outline-none focus:ring-2 focus:ring-[var(--color-sage-green)]/40 min-w-[140px]">
                  <option value={1}>{t("lockTime1")}</option>
                  <option value={2}>{t("lockTime2")}</option>
                  <option value={5} disabled={currentSecurityModeDefinition.maxAutoLockMinutes < 5}>{t("lockTime5")}</option>
                  <option value={30} disabled={currentSecurityModeDefinition.maxAutoLockMinutes < 30}>{t("lockTime30")}</option>
                  <option value={0} disabled>{t("lockTime0")}</option>
                </select>
              </div>

              <div className="settings-subpanel p-5 rounded-2xl border shadow-inner mb-4">
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
                      disabled={!currentSecurityModeDefinition.allowHibpNetwork}
                      className="h-4 w-4 rounded border-gray-300 text-[var(--color-sage-green)] focus:ring-[var(--color-sage-green)]/40"
                    />
                    {t('hibpPrivacyToggle')}
                  </label>
                </div>

                <div className="mt-2 rounded-xl border watchtower-status-box px-3 py-2 text-[11px]">
                  {t('hibpSettingsExplain')}
                </div>

                {!currentSecurityModeDefinition.allowHibpNetwork && (
                  <div className="mt-2 rounded-xl border border-amber-300/40 bg-amber-50/60 px-3 py-2 text-[11px] font-medium text-amber-700">
                    {t('securityModeProfileLockedHibpHint')}
                  </div>
                )}

                {hibpLastResult === 'unknown' && (
                  <div className="mt-2 rounded-xl border border-amber-300/40 bg-amber-50/60 px-3 py-2 text-[11px] font-medium text-amber-700">
                    {t('hibpResultUnknown')}
                  </div>
                )}
              </div>

              <div className="settings-subpanel p-5 rounded-2xl border shadow-inner mb-4">
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

              <div className="settings-subpanel p-5 rounded-2xl border shadow-inner mb-4">
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

                {passkeyBindingDetails && (
                  <div className="settings-card-surface mt-4 rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="font-semibold text-sm text-[var(--color-deep-navy)]">
                        {t('passkeyActiveDeviceTitle', 'Active passkey on this device')}
                      </div>
                      {activePasskeyAgeDays !== null && activePasskeyAgeDays >= 90 && (
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700">
                          {t('passkeyRotationRecommended', 'Security recommendation: refresh your biometric lock (older than 90 days).')}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] opacity-75">
                      <div>{t('passkeyDeviceLabel', 'Device')}: {passkeyBindingDetails.meta.deviceLabel || t('passkeyUnknownDevice', 'Unknown device')}</div>
                      <div>{t('passkeyDeviceFingerprint', 'Device fingerprint')}: <span className="font-mono">{passkeyBindingDetails.meta.deviceFingerprint || '-'}</span></div>
                      <div>{t('passkeyCreatedAt', 'Created')}: {passkeyBindingDetails.meta.createdAt ? new Date(passkeyBindingDetails.meta.createdAt).toLocaleString() : '-'}</div>
                      <div>{t('passkeyLastUsedAt', 'Last used')}: {passkeyBindingDetails.meta.lastUsedAt ? new Date(passkeyBindingDetails.meta.lastUsedAt).toLocaleString() : '-'}</div>
                      <div>{t('passkeyRecoveryLastExportedAt', 'Recovery export')}: {passkeyBindingDetails.meta.recoveryLastExportedAt ? new Date(passkeyBindingDetails.meta.recoveryLastExportedAt).toLocaleString() : t('passkeyRecoveryNeverExported', 'Not exported yet')}</div>
                      <div>{t('passkeyRotatedFrom', 'Previous credential')}: <span className="font-mono break-all">{passkeyBindingDetails.meta.rotatedFromCredentialId || '-'}</span></div>
                    </div>
                  </div>
                )}

                {allPasskeyBindings.length > 0 && (
                  <div className="settings-card-surface-muted mt-4 rounded-2xl p-4">
                    <div className="font-semibold text-sm text-[var(--color-deep-navy)] mb-2">
                      {t('passkeyDeviceManagerTitle', 'Device-based passkey inventory')}
                    </div>
                    <div className="space-y-2">
                      {allPasskeyBindings.map((binding) => (
                        <div key={binding.bindingKey} className="settings-card-item rounded-xl p-3 text-[11px]">
                          <div className="font-semibold text-[var(--color-deep-navy)]">
                            {binding.meta.deviceLabel || t('passkeyUnknownDevice', 'Unknown device')}
                          </div>
                          <div className="opacity-70 font-mono break-all">
                            {binding.meta.deviceFingerprint || '-'}
                          </div>
                          <div className="opacity-60 mt-1">
                            {binding.meta.profileId || 'default'} / {binding.meta.dbName || 'aegis_opfs_vault'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="settings-card-surface-muted mt-4 rounded-2xl p-4">
                  <div className="font-semibold text-sm text-[var(--color-deep-navy)] mb-3">
                    {t('passkeyPolicyTitle', 'Passkey security policy')}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                    <label className="settings-card-item rounded-xl p-3 flex items-center justify-between gap-3">
                      <span>{t('passkeyPolicyBlockRevoked', 'Block revoked credentials')}</span>
                      <input
                        type="checkbox"
                        checked={passkeyPolicy.blockRevokedCredentials}
                        onChange={(event) => updatePasskeyPolicy({ blockRevokedCredentials: event.target.checked })}
                      />
                    </label>
                    <label className="settings-card-item rounded-xl p-3 flex items-center justify-between gap-3">
                      <span>{t('passkeyPolicyRequireRecoveryExport', 'Require recovery export before rotation')}</span>
                      <input
                        type="checkbox"
                        checked={passkeyPolicy.requireRecoveryExportBeforeRotation}
                        onChange={(event) => updatePasskeyPolicy({ requireRecoveryExportBeforeRotation: event.target.checked })}
                      />
                    </label>
                    <label className="settings-card-item rounded-xl p-3 md:col-span-2 flex items-center justify-between gap-3">
                      <span>{t('passkeyPolicyMaxAge', 'Rotation threshold (days)')}</span>
                      <input
                        type="number"
                        min={30}
                        max={365}
                        value={passkeyPolicy.maxBindingAgeDays}
                        onChange={(event) => updatePasskeyPolicy({ maxBindingAgeDays: Number(event.target.value || 90) })}
                        className="settings-inline-input w-24 rounded-lg px-2 py-1 text-right"
                      />
                    </label>
                  </div>
                </div>

                {passkeyRevocations.length > 0 && (
                  <div className="settings-card-surface-muted mt-4 rounded-2xl p-4">
                    <div className="font-semibold text-sm text-[var(--color-deep-navy)] mb-2">
                      {t('passkeyRevocationListTitle', 'Synchronized revoke list')}
                    </div>
                    <div className="space-y-2">
                      {passkeyRevocations.slice(0, 8).map((item) => (
                        <div key={`${item.credentialId}-${item.revokedAt}`} className="settings-card-item rounded-xl p-3 text-[11px]">
                          <div className="font-mono break-all text-[var(--color-deep-navy)]">{item.credentialId}</div>
                          <div className="opacity-60 mt-1">{item.revokedAt ? new Date(item.revokedAt).toLocaleString() : '-'}</div>
                          <div className="opacity-70 mt-1">{item.reason || t('passkeyRevokeReasonUnknown', 'No reason provided')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {passkeyEventLog.length > 0 && (
                  <div className="settings-card-surface-muted mt-4 rounded-2xl p-4">
                    <div className="font-semibold text-sm text-[var(--color-deep-navy)] mb-2">
                      {t('passkeyEventLogTitle', 'Passkey event log')}
                    </div>
                    <div className="space-y-2">
                      {passkeyEventLog.slice(0, 8).map((event, index) => (
                        <div key={`${event.at || index}-${event.type || 'event'}`} className="settings-card-item rounded-xl p-3 text-[11px]">
                          <div className="font-semibold text-[var(--color-deep-navy)]">{event.type || t('passkeyEventUnknown', 'event')}</div>
                          <div className="opacity-60">{event.at ? new Date(event.at).toLocaleString() : '-'}</div>
                          {event.detail && <div className="opacity-70 mt-1">{event.detail}</div>}
                          {event.deviceFingerprint && <div className="opacity-60 font-mono mt-1">{event.deviceFingerprint}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="settings-subpanel p-5 rounded-2xl border shadow-inner mb-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-sm mb-1 text-[var(--color-deep-navy)]">{t('storageAuditTitle')}</h4>
                    <p className="text-xs opacity-70 leading-relaxed max-w-md">{t('storageAuditDesc')}</p>
                  </div>
                  <button
                    onClick={handleStorageAuditCleanup}
                    className="settings-inline-action-btn px-3 py-2 rounded-xl text-xs font-semibold"
                  >
                    {t('storageAuditRun')}
                  </button>
                </div>
              </div>

              <div className="settings-subpanel p-5 rounded-2xl border shadow-inner mb-4">
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
                        handlePlaintextExportToggle(e.target.checked);
                      }}
                      disabled={!currentSecurityModeDefinition.allowPlaintextExport}
                      className="h-4 w-4 rounded border-gray-300 text-[var(--color-sage-green)] focus:ring-[var(--color-sage-green)]/40"
                    />
                    {t('plainExportPolicyToggle', 'Allow CSV/JSON export')}
                  </label>
                </div>
                {!currentSecurityModeDefinition.allowPlaintextExport && (
                  <div className="mt-2 rounded-xl border border-amber-300/40 bg-amber-50/60 px-3 py-2 text-[11px] font-medium text-amber-700">
                    {t('securityModePlaintextBlocked')}
                  </div>
                )}
              </div>

              <div className="settings-subpanel p-5 rounded-2xl border shadow-inner mb-4">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-1 text-[var(--color-deep-navy)]">
                      {t('desktopPairingManagerTitle', 'Desktop Extension Pairings')}
                    </h4>
                    <p className="text-xs opacity-70 leading-relaxed max-w-md">
                      {t('desktopPairingManagerDesc', 'Review browser extensions paired with this desktop vault and revoke them when needed.')}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[var(--color-sage-green)]">
                    {loadingDesktopPairings ? t('desktopPairingLoading', 'Loading...') : `${desktopPairings.length}`}
                  </span>
                </div>

                <div className="space-y-3">
                  {desktopPairings.map((pairing) => (
                    <div key={pairing.extensionId} className="settings-card-surface rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-semibold text-sm text-[var(--color-deep-navy)]">
                              {pairing.browserName || t('desktopPairingUnknownBrowser', 'Unknown Browser')}
                            </div>
                            {pairing.riskLevel && pairing.riskLevel !== 'low' && (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${pairing.riskLevel === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                {pairing.riskLevel === 'high'
                                  ? t('desktopPairingHighRisk', 'High risk')
                                  : t('desktopPairingMediumRisk', 'Review')}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] opacity-70">
                            {pairing.clientLabel || t('desktopPairingUnknownClient', 'Unknown client')}
                          </div>
                          <div className="text-[11px] opacity-70 font-mono break-all">
                            {pairing.extensionId}
                          </div>
                          {pairing.pairingMode && (
                            <div className="text-[11px] opacity-60">
                              {t('desktopPairingMode', 'Pairing mode')}: {pairing.pairingMode === 'signed-p256-v1'
                                ? t('desktopPairingModeSigned', 'Persistent signed pairing')
                                : t('desktopPairingModeLegacy', 'Legacy secret model')}
                            </div>
                          )}
                          {pairing.clientKeyId && (
                            <div className="text-[11px] opacity-60 font-mono">
                              {t('desktopPairingClientKey', 'Client key')}: {pairing.clientKeyId}
                            </div>
                          )}
                          {pairing.deviceFingerprint && (
                            <div className="text-[11px] opacity-60 font-mono">
                              {t('desktopPairingFingerprint', 'Fingerprint')}: {pairing.deviceFingerprint}
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] opacity-60">
                            <div>{t('desktopPairingPairedAt', 'Paired')}: {formatPairingTimestamp(pairing.pairedAt || pairing.secretSource)}</div>
                            <div>{t('desktopPairingLastApprovedAt', 'Last approval')}: {formatPairingTimestamp(pairing.lastApprovedAt)}</div>
                            <div>{t('desktopPairingLastUsedAt', 'Last used')}: {formatPairingTimestamp(pairing.lastUsedAt)}</div>
                          </div>
                          {Array.isArray(pairing.riskFlags) && pairing.riskFlags.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {pairing.riskFlags.map((flag) => (
                                <span key={flag} className="rounded-full bg-amber-50 border border-amber-200 px-2 py-1 text-[10px] font-semibold text-amber-700">
                                  {mapRiskFlagLabel(flag)}
                                </span>
                              ))}
                            </div>
                          )}
                          {Array.isArray(pairing.pairingHistory) && pairing.pairingHistory.length > 0 && (
                            <div className="pt-2">
                              <div className="text-[11px] font-semibold opacity-70 mb-1">
                                {t('desktopPairingHistoryTitle', 'Recent pairing activity')}
                              </div>
                              <div className="space-y-1">
                                {pairing.pairingHistory.slice(0, 3).map((event, index) => (
                                  <div key={`${pairing.extensionId}-${event.at || index}`} className="text-[11px] opacity-60">
                                    {formatPairingTimestamp(event.at)} - {event.type || t('desktopPairingHistoryUnknown', 'activity')}
                                    {event.detail ? ` - ${event.detail}` : ''}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveDesktopPairing(pairing.extensionId)}
                          className="px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition-all shrink-0"
                        >
                          {t('desktopPairingRemoveBtn', 'Remove')}
                        </button>
                      </div>
                    </div>
                  ))}

                  {!loadingDesktopPairings && desktopPairings.length === 0 && (
                    <div className="settings-card-empty rounded-2xl px-4 py-5 text-xs opacity-70 text-center">
                      {t('desktopPairingEmpty', 'No paired browser extensions were found for this desktop app yet.')}
                    </div>
                  )}
                </div>
              </div>

              {/* Donation */}
              <div className="mt-4 p-6 emergency-kit-btn rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 vault-entry-icon rounded-2xl flex items-center justify-center shadow-sm text-[var(--color-sage-green)]">
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
                  <div className="settings-subpanel p-5 rounded-2xl border border-red-100 shadow-inner">
                    <h4 className="font-bold text-sm mb-2 text-[var(--color-deep-navy)]">{t("hiddenVaultTitle")}</h4>
                    <p className="text-xs opacity-70 mb-4">{t("hiddenVaultDesc")}</p>
                    <input type="password" placeholder={t("duressPinPlaceholder")} value={duressPin} onChange={(e) => setDuressPin(e.target.value)} className="w-full rounded-xl border border-red-100 bg-white px-4 py-2 text-sm font-mono tracking-widest outline-none focus:ring-2 focus:ring-red-400/20" />
                  </div>
                  <div className="settings-subpanel p-5 rounded-2xl border border-red-100 shadow-inner">
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
            <div className="settings-panel rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Database className="w-5 h-5 text-[var(--color-sage-green)]" />
                <h3 className="text-lg font-semibold tracking-tight">{t("dataManagementTitle")}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Export */}
                <div className="settings-subpanel p-5 rounded-2xl border flex flex-col justify-between shadow-inner">
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
                <div className="settings-subpanel p-5 rounded-2xl border flex flex-col justify-between shadow-inner">
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
              <div className="danger-reset-panel mt-4 p-5 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                <div>
                  <h4 className="danger-reset-title font-semibold text-sm mb-1 text-red-700">{t("factoryResetBtn")}</h4>
                  <p className="danger-reset-desc text-[11px] opacity-90 leading-relaxed max-w-sm text-red-700">{t("confirmFullWipe")}</p>
                </div>
                <button onClick={() => setShowWipeModal(true)} className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-all shadow-sm active:scale-95 whitespace-nowrap">
                  {t("factoryResetBtn")}
                </button>
              </div>

              {/* QR Sync */}
              {syncMode === "export" && syncExportPackage ? (
                <div className="mt-8">
                  <QRExporter
                    data={syncData}
                    transferCode={syncTransferCode}
                    expiresAt={syncExportPackage.expiresAt}
                    protectionMode={syncExportPackage.protectionMode}
                    recipientFingerprint={syncExportPackage.recipientKeyFingerprint}
                    onCancel={resetSyncFlow}
                  />
                </div>
              ) : syncMode === "import" ? (
                <div className="mt-8">
                  <QRScanner
                    onScanSuccess={handleSyncImportSuccess}
                    onCancel={resetSyncFlow}
                    transferCode={syncTransferCode}
                    onTransferCodeChange={setSyncTransferCode}
                    receiverPairingCode={syncReceiverSession?.publicKey}
                    onCopyReceiverPairingCode={() => void copyReceiverPairingCode()}
                    onRefreshReceiverPairingCode={() => {
                      void (async () => {
                        try {
                          await createReceiverPairingSession();
                        } catch (error: unknown) {
                          const message = error instanceof Error ? error.message : 'QR_SYNC_PAIRING_INIT_FAILED';
                          toast.error(t("qrSyncExportFailed", { error: message, defaultValue: "QR transfer could not be prepared: {{error}}" }));
                        }
                      })();
                    }}
                  />
                </div>
              ) : syncMode === "export-config" ? (
                <div className="mt-8 rounded-3xl border qr-scanner-surface p-6 shadow-inner space-y-4">
                  <div>
                    <h4 className="font-bold text-[var(--color-deep-navy)] text-base">{t('qrSyncEncryptedTransferTitle', 'Encrypted Device Transfer')}</h4>
                    <p className="text-xs opacity-80 mt-1">{t('qrSyncEncryptedTransferDesc', 'These animated QR frames contain only encrypted payload. Enter the transfer code on the receiving device to decrypt the vault data.')}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-deep-navy)]/60">{t('qrSyncTransferCodeLabel', 'Transfer Code')}</label>
                    <input
                      type="text"
                      value={syncTransferCode}
                      onChange={(event) => setSyncTransferCode(event.target.value)}
                      className="mt-2 w-full rounded-xl border qr-scanner-input px-4 py-3 text-sm font-[var(--font-geist-mono)] tracking-[0.18em] text-[var(--color-deep-navy)] shadow-inner focus:outline-none focus:ring-2 focus:ring-[var(--color-sage-green)]/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-deep-navy)]/60">{t('qrSyncReceiverPairingLabel', 'Optional Receiver Pairing Code')}</label>
                    <textarea
                      value={syncRecipientPairingCode}
                      onChange={(event) => setSyncRecipientPairingCode(event.target.value)}
                      rows={4}
                      className="mt-2 w-full rounded-xl border qr-scanner-input px-4 py-3 text-xs font-[var(--font-geist-mono)] text-[var(--color-deep-navy)] shadow-inner focus:outline-none focus:ring-2 focus:ring-[var(--color-sage-green)]/40"
                      placeholder={t('qrSyncReceiverPairingHint', 'Paste the receiver pairing code here to bind this transfer to a single destination device.')}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => void handleSyncExportGenerate()}
                      disabled={!currentSecurityModeDefinition.allowQrSync}
                      className="settings-secondary-btn px-5 py-2.5 toolbar-control rounded-xl text-[var(--color-deep-navy)] font-bold text-sm hover:bg-[var(--color-sage-green)] hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('qrExportBtn')}
                    </button>
                    <button onClick={resetSyncFlow} className="btn-ink px-5 py-2.5 bg-[var(--color-deep-navy)] rounded-xl text-white font-bold text-sm hover:bg-opacity-90 transition-all shadow-md active:scale-95">
                      {t('cancel', 'Cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 watchtower-status-box p-6 rounded-3xl border shadow-inner flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
                  <div>
                    <h4 className="font-bold text-[var(--color-deep-navy)] text-base mb-1">{t("qrSyncTitle")}</h4>
                    <p className="text-xs opacity-80 max-w-sm">{t("qrSyncDesc")}</p>
                    {!currentSecurityModeDefinition.allowQrSync && (
                      <p className="mt-2 text-xs font-medium text-amber-700">{t("securityModeQrSyncBlocked")}</p>
                    )}
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button
                      onClick={handleSyncExportInit}
                      disabled={!currentSecurityModeDefinition.allowQrSync}
                      className="settings-secondary-btn px-5 py-2.5 toolbar-control rounded-xl text-[var(--color-deep-navy)] font-bold text-sm hover:bg-[var(--color-sage-green)] hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t("qrExportBtn")}
                    </button>
                    <button onClick={() => {
                      void (async () => {
                        if (!SecurityModePolicy.isQrSyncAllowed(securityModeProfile)) {
                          toast.error(t("securityModeQrSyncBlocked"));
                          return;
                        }
                        try {
                          setSyncTransferCode("");
                          await createReceiverPairingSession();
                          setSyncMode("import");
                        } catch (error: unknown) {
                          const message = error instanceof Error ? error.message : 'QR_SYNC_PAIRING_INIT_FAILED';
                          toast.error(t("qrSyncExportFailed", { error: message, defaultValue: "QR transfer could not be prepared: {{error}}" }));
                        }
                      })();
                    }} disabled={!currentSecurityModeDefinition.allowQrSync} className="btn-ink px-5 py-2.5 bg-[var(--color-deep-navy)] rounded-xl text-white font-bold text-sm hover:bg-opacity-90 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                      {t("qrImportBtn")}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="settings-subpanel p-5 rounded-2xl border shadow-inner">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <h4 className="font-semibold text-sm text-[var(--color-deep-navy)]">{t("qrSyncHistoryTitle", "QR Transfer History")}</h4>
                      <p className="text-xs opacity-70 mt-1">{t("qrSyncHistoryDesc", "Review active, consumed, and revoked QR transfer sessions.")}</p>
                    </div>
                    <span className="rounded-full bg-[var(--color-sage-green)]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-sage-green)]">
                      {qrTransferHistory.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {qrTransferHistory.length === 0 ? (
                      <div className="rounded-xl border border-dashed settings-card-surface px-4 py-5 text-xs opacity-60">
                        {t("qrSyncHistoryEmpty", "No QR transfer history recorded yet.")}
                      </div>
                    ) : qrTransferHistory.slice(0, 6).map((record) => (
                      <div key={record.sessionId} className="rounded-xl border settings-card-surface px-4 py-3 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/50">{record.sessionId.slice(0, 12)}</div>
                            <div className="mt-1 text-sm font-semibold text-[var(--color-deep-navy)]">
                              {record.protectionMode === "transfer-code+ecdh"
                                ? t("qrSyncProtectionBound", "Transfer code + receiver binding")
                                : t("qrSyncProtectionCodeOnly", "Transfer code only")}
                            </div>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                            record.status === "created"
                              ? "bg-amber-500/10 text-amber-600"
                              : record.status === "consumed"
                                ? "bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)]"
                                : "bg-red-500/10 text-red-600"
                          }`}>
                            {record.status === "created"
                              ? t("qrSyncStatusCreated", "Active")
                              : record.status === "consumed"
                                ? t("qrSyncStatusConsumed", "Imported")
                                : t("qrSyncStatusRevoked", "Revoked")}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[var(--color-deep-navy)]/70">
                          <div>{t("qrSyncHistoryCreatedAt", "Created")}: {formatPairingTimestamp(record.createdAt)}</div>
                          <div>{t("qrSyncHistoryExpiresAt", "Expires")}: {formatPairingTimestamp(record.expiresAt)}</div>
                          <div>{t("qrSyncHistoryEntryCount", "Entries")}: {record.entryCount}</div>
                          <div>{t("qrSyncHistoryRecipient", "Recipient")}: {record.recipientFingerprint || t("qrSyncHistoryAnyRecipient", "Any compatible device")}</div>
                        </div>
                        {record.revokedAt && (
                          <div className="mt-2 text-xs text-red-600">
                            {t("qrSyncHistoryRevokedAt", "Revoked")}: {formatPairingTimestamp(record.revokedAt)}
                            {record.revokeReason ? ` (${record.revokeReason})` : ""}
                          </div>
                        )}
                        {record.consumedAt && (
                          <div className="mt-2 text-xs text-[var(--color-sage-green)]">
                            {t("qrSyncHistoryConsumedAt", "Imported")}: {formatPairingTimestamp(record.consumedAt)}
                          </div>
                        )}
                        {record.status === "created" && (
                          <div className="mt-3 flex justify-end">
                            <button
                              onClick={() => handleQrTransferRevoke(record.sessionId)}
                              className="rounded-xl border border-red-500/20 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition-all hover:bg-red-100 active:scale-95"
                            >
                              {t("qrSyncRevokeBtn", "Revoke")}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="settings-subpanel p-5 rounded-2xl border shadow-inner">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <h4 className="font-semibold text-sm text-[var(--color-deep-navy)]">{t("qrSyncAuditTitle", "QR Sync Audit Trail")}</h4>
                      <p className="text-xs opacity-70 mt-1">{t("qrSyncAuditDesc", "Track transfer creation, import, revoke, and rejection events.")}</p>
                    </div>
                    <span className="rounded-full bg-[var(--color-deep-navy)]/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/60">
                      {qrTransferAudit.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {qrTransferAudit.length === 0 ? (
                      <div className="rounded-xl border border-dashed settings-card-surface px-4 py-5 text-xs opacity-60">
                        {t("qrSyncAuditEmpty", "No QR sync audit events recorded yet.")}
                      </div>
                    ) : qrTransferAudit.slice(0, 8).map((event) => (
                      <div key={event.id} className="rounded-xl border settings-card-surface px-4 py-3 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-[var(--color-deep-navy)]">{mapQrAuditLabel(event.type)}</div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/40">{formatPairingTimestamp(event.at)}</div>
                        </div>
                        {event.detail && (
                          <div className="mt-1 text-xs text-[var(--color-deep-navy)]/70">{event.detail}</div>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                          {event.sessionId && (
                            <span className="rounded-full bg-[var(--color-deep-navy)]/5 px-2 py-1 font-bold text-[var(--color-deep-navy)]/60">
                              {event.sessionId.slice(0, 12)}
                            </span>
                          )}
                          {Object.entries(event.metadata || {}).map(([key, value]) => (
                            <span key={`${event.id}-${key}`} className="rounded-full bg-black/5 px-2 py-1 font-bold text-[var(--color-deep-navy)]/60">
                              {key}: {String(value)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

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
                          <span className="font-bold text-[var(--color-sage-green)]">{importReport.validEntries}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-[var(--color-deep-navy)]/10">
                          <span className="opacity-70">{t("weakPasswordsDetected")}</span>
                          <span className={`font-bold ${importReport.weakPasswords > 0 ? "text-red-500 cursor-pointer hover:underline" : "opacity-40"}`} onClick={() => { if (importReport.weakPasswords > 0) setShowWeakPasswordsPopup(true); }}>
                            {importReport.weakPasswords}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-[var(--color-deep-navy)]/10">
                          <span className="opacity-70">{t("missingProperties")}</span>
                          <span className={`font-bold ${importReport.missingCriticalFields > 0 ? "text-amber-500" : "opacity-40"}`}>{importReport.missingCriticalFields}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-[var(--color-deep-navy)]/10">
                          <span className="opacity-70">{t("importSkippedRows", "Skipped Rows")}</span>
                          <span className={`font-bold ${importReport.skippedRows > 0 ? "text-amber-500" : "opacity-40"}`}>{importReport.skippedRows}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5">
                          <span className="opacity-70">{t("importDuplicateCandidates", "Duplicate Candidates")}</span>
                          <span className={`font-bold ${importReport.duplicateCandidates > 0 ? "text-amber-500" : "opacity-40"}`}>{importReport.duplicateCandidates}</span>
                        </div>
                        {importReport.warnings.length > 0 && (
                          <div className="pt-2">
                            <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">{t("importWarningsTitle", "Detected Format / Warnings")}</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {importReport.warnings.map((warning) => (
                                <span key={warning} className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                                  {mapImportWarningLabel(warning)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
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
          <GlowCard className="weak-passwords-surface max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-red-500/20 rounded-[2rem] p-6 relative z-10 shadow-2xl custom-scrollbar">
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
                <div key={p.id} className="settings-subpanel flex items-center justify-between p-4 rounded-xl shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl vault-entry-icon flex items-center justify-center shadow-sm shrink-0">{getCategoryIcon(p.category)}</div>
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

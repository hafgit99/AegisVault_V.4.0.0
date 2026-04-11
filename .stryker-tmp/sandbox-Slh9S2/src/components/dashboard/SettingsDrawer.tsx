// @ts-nocheck
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  X,
  Wand2,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Lock,
  FileUp,
  FileDown,
  Database,
  AlertTriangle,
  Eye,
  EyeOff,
  Heart,
  Fingerprint,
} from 'lucide-react';
import { GlowCard } from '../ui/GlowCard';
import { getCategoryIcon } from '../../lib/getCategoryIcon';
import { useVault } from '../../contexts/VaultContext';
import { vaultService, type VaultEntry } from '../../vaultService';
import { ExportService } from '../../lib/ExportService';
import {
  ImportService,
  type ImportAnalysisReport,
  type ImportProgress,
} from '../../lib/ImportService';
import { QRExporter } from '../QRExporter';
import { QRScanner } from '../QRScanner';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { BackupService } from '../../lib/BackupService';
import { CanonicalMigrationService } from '../../lib/canonical-migration';
import { ReAuthModal } from '../ReAuthModal';
import { WipeConfirmationModal } from '../WipeConfirmationModal';
import { PasswordGenerator } from '../settings/PasswordGenerator';
import { SharedSpacesModal } from './SharedSpacesModal';
import { SharingAuditPanel } from './SharingAuditPanel';
import { SharingOverviewPanel } from './SharingOverviewPanel';
import { EmergencyAccessPanel } from './EmergencyAccessPanel';
import { PasskeySiteInventoryModal } from './PasskeySiteInventoryModal';
import { SecurityCenterPanel } from './SecurityCenterPanel';
import { ReleaseTrustPanel } from './ReleaseTrustPanel';
import { VaultManager } from '../../lib/VaultManager';
import { PasskeyBindingService } from '../../lib/PasskeyBindingService';
import { PasskeyInventoryService } from '../../lib/PasskeyInventoryService';
import {
  SecureAppSettings,
  type SecurityModeProfile,
  type SecurityCenterHistoryEvent,
  type ReleaseTrustHistoryEvent,
} from '../../lib/SecureAppSettings';
import { SecurityModePolicy } from '../../lib/SecurityModePolicy';
import { TotpVaultPolicy, type TotpVaultMode } from '../../lib/TotpVaultPolicy';
import {
  QRSyncService,
  type QRSyncPackage,
  type QRSyncReceiverSession,
} from '../../lib/QRSyncService';
import {
  AEGIS_SYNC_AUDIT_LANGUAGE,
  AEGIS_SYNC_CONFLICT_RULES,
  AEGIS_SYNC_MODES,
  AEGIS_SYNC_STRATEGY,
  AEGIS_SYNC_TRANSPORTS,
} from '../../config/sync-strategy';
import { SyncConflictResolutionService } from '../../lib/SyncConflictResolutionService';
import { SyncAuditService } from '../../lib/SyncAuditService';
import { SecurityCenterService } from '../../lib/SecurityCenterService';
import { ReleaseTrustService } from '../../lib/ReleaseTrustService';
import type { SecurityCenterTriageItem } from '../../lib/SecurityCenterService';
import type { MigrationReport } from '../../lib/migration-report';
import { SharingOverviewService } from '../../lib/SharingOverviewService';
import type { SharingOverviewIssueType } from '../../lib/SharingOverviewService';
import { VaultSharingLinkService } from '../../lib/VaultSharingLinkService';
import { SharingAuditService } from '../../lib/SharingAuditService';
import type { SharingAuditFilter } from '../../lib/SharingAuditService';
import type { PasskeyInventorySiteEntry } from '../../lib/PasskeyInventoryService';
import { SyncDevicesPanel } from './SyncDevicesPanel';
import { SyncConflictModal } from './SyncConflictModal';
import { SyncDeviceService } from '../../lib/SyncDeviceService';
import { EmergencyAccessService } from '../../lib/EmergencyAccessService';
import type {
  EmergencyAccessAuditEvent,
  EmergencyAccessContact,
  EmergencyAccessPolicy,
  EmergencyAccessRequest,
} from '../../lib/SecureAppSettings';

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

type WindowWithAegisElectron = Window &
  typeof globalThis & {
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
export function SettingsDrawer({
  isOpen,
  onClose,
  onDonationOpen,
  onEditEntry,
}: SettingsDrawerProps) {
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
    timeoutSeconds,
    setClipboardClearSeconds,
    hibpEnabled,
    setHibpEnabled,
    hibpLastResult,
  } = useVault();

  // Import State
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importReport, setImportReport] = useState<ImportAnalysisReport | null>(null);
  const [latestMigrationReport, setLatestMigrationReport] = useState<MigrationReport | null>(null);

  // Sync State
  const [syncMode, setSyncMode] = useState<'none' | 'export-config' | 'export' | 'import'>('none');
  const [syncData, setSyncData] = useState<string>('');
  const [syncTransferCode, setSyncTransferCode] = useState<string>('');
  const [syncRecipientPairingCode, setSyncRecipientPairingCode] = useState<string>('');
  const [syncReceiverSession, setSyncReceiverSession] = useState<QRSyncReceiverSession | null>(
    null
  );
  const [syncExportPackage, setSyncExportPackage] = useState<QRSyncPackage | null>(null);
  const [qrTransferHistory, setQrTransferHistory] = useState<
    ReturnType<typeof QRSyncService.listTransferHistory>
  >([]);
  const [qrTransferAudit, setQrTransferAudit] = useState<
    ReturnType<typeof QRSyncService.listAuditEvents>
  >([]);
  const [showFullQrHistory, setShowFullQrHistory] = useState(false);
  const [showFullQrAudit, setShowFullQrAudit] = useState(false);
  const [syncAuditEvents, setSyncAuditEvents] = useState<
    ReturnType<typeof SyncAuditService.listEvents>
  >([]);
  const [syncAuditFilter, setSyncAuditFilter] = useState<
    'all' | 'imports' | 'restore_migration' | 'qr'
  >('all');

  // UI State
  const [activeTab, setActiveTab] = useState<
    'general' | 'security' | 'sharing' | 'sync' | 'advanced' | 'donation'
  >('general');
  const [showWeakPasswordsPopup, setShowWeakPasswordsPopup] = useState(false);
  const [showSecretMenu, setShowSecretMenu] = useState(false);
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [showSharedSpacesModal, setShowSharedSpacesModal] = useState(false);
  const [focusedSharedSpaceId, setFocusedSharedSpaceId] = useState<string | null>(null);
  const [focusedSharedSpaceContext, setFocusedSharedSpaceContext] = useState<
    'audit' | 'issue' | null
  >(null);
  const [sharingOverviewVersion, setSharingOverviewVersion] = useState(0);
  const [sharingAuditFilter, setSharingAuditFilter] = useState<SharingAuditFilter>('all');
  const [sharingAuditFocus, setSharingAuditFocus] = useState<{
    itemId: number;
    type: SharingOverviewIssueType;
    title: string;
  } | null>(null);
  const [selectedSharingIssueKey, setSelectedSharingIssueKey] = useState<string | null>(null);
  const [hasPasskeyBinding, setHasPasskeyBinding] = useState(false);
  const [passkeyBindingDetails, setPasskeyBindingDetails] = useState<ReturnType<
    typeof PasskeyBindingService.getBinding
  > | null>(null);
  const [allPasskeyBindings, setAllPasskeyBindings] = useState<
    ReturnType<typeof PasskeyBindingService.listBindings>
  >([]);
  const [passkeyEventLog, setPasskeyEventLog] = useState<
    ReturnType<typeof PasskeyBindingService.getEventLog>
  >([]);
  const [passkeyRevocations, setPasskeyRevocations] = useState<
    ReturnType<typeof PasskeyBindingService.listRevocations>
  >([]);
  const [passkeyPolicy, setPasskeyPolicy] = useState(PasskeyBindingService.getPolicy());
  const [securityCenterReviews, setSecurityCenterReviews] = useState<Record<string, string>>(() =>
    SecureAppSettings.getSecurityCenterReviews()
  );
  const [securityCenterHistory, setSecurityCenterHistory] = useState<SecurityCenterHistoryEvent[]>(
    () => SecureAppSettings.getSecurityCenterHistory()
  );
  const [releaseTrustChecklist, setReleaseTrustChecklist] = useState<Record<string, string>>(() =>
    SecureAppSettings.getReleaseTrustChecklist()
  );
  const [releaseTrustApprovals, setReleaseTrustApprovals] = useState<Record<string, string>>(() =>
    SecureAppSettings.getReleaseTrustApprovals()
  );
  const [releaseTrustHistory, setReleaseTrustHistory] = useState<ReleaseTrustHistoryEvent[]>(() =>
    SecureAppSettings.getReleaseTrustHistory()
  );
  const [sitePasskeyFilter, setSitePasskeyFilter] = useState<
    'all' | 'attention' | 'healthy' | 'future' | 'missing_rp_id' | 'missing_credential_id'
  >('all');
  const [showPasskeySiteModal, setShowPasskeySiteModal] = useState(false);
  const [passkeyRemediationResult, setPasskeyRemediationResult] = useState<null | {
    kind: 'missing_rp_id' | 'missing_credential_id' | 'future_mode';
    count: number;
    at: number;
  }>(null);
  const [pendingBulkFix, setPendingBulkFix] = useState<null | {
    kind: 'missing_rp_id' | 'missing_credential_id' | 'future_mode';
    count: number;
    selectedIds?: number[];
  }>(null);
  const [totpMode, setTotpMode] = useState<TotpVaultMode>(() => TotpVaultPolicy.getMode());
  const [totpVaultProfileName, setTotpVaultProfileName] = useState<string>('Aegis 2FA Vault');
  const [securityModeProfile, setSecurityModeProfile] = useState<SecurityModeProfile>(() =>
    SecurityModePolicy.getProfile()
  );
  const [allowPlaintextExport, setAllowPlaintextExport] = useState<boolean>(() =>
    SecureAppSettings.getPlaintextExportEnabled()
  );
  const [desktopPairings, setDesktopPairings] = useState<DesktopPairingRecord[]>([]);
  const [loadingDesktopPairings, setLoadingDesktopPairings] = useState(false);
  const passkeyActiveDeviceRef = useRef<HTMLDivElement | null>(null);
  const passkeyRevocationRef = useRef<HTMLDivElement | null>(null);
  const passkeyPolicyRef = useRef<HTMLDivElement | null>(null);
  const desktopPairingsRef = useRef<HTMLDivElement | null>(null);
  const importReportRef = useRef<HTMLDivElement | null>(null);
  const qrAuditPanelRef = useRef<HTMLDivElement | null>(null);
  const migrationReportRef = useRef<HTMLDivElement | null>(null);
  const syncDevicesRef = useRef<HTMLDivElement | null>(null);
  const [showSyncConflictModal, setShowSyncConflictModal] = useState(false);
  const [pendingSyncConflicts, setPendingSyncConflicts] = useState<
    Array<{ local: VaultEntry; remote: VaultEntry }>
  >([]);
  const [e2eSyncEnabled, setE2eSyncEnabled] = useState(false);
  const [emergencyAccessPolicy, setEmergencyAccessPolicy] = useState<EmergencyAccessPolicy>(() =>
    EmergencyAccessService.getPolicy()
  );
  const [emergencyAccessContacts, setEmergencyAccessContacts] = useState<EmergencyAccessContact[]>(
    () => EmergencyAccessService.listContacts()
  );
  const [emergencyAccessRequests, setEmergencyAccessRequests] = useState<EmergencyAccessRequest[]>(
    () => EmergencyAccessService.listRequests()
  );
  const [emergencyAccessAudit, setEmergencyAccessAudit] = useState<EmergencyAccessAuditEvent[]>(
    () => EmergencyAccessService.listAudit()
  );

  // ReAuth State (P1-3)
  const [reAuthAction, setReAuthAction] = useState<{ name: string; action: () => void } | null>(
    null
  );

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
    if (flag === 'fingerprint_changed')
      return t('desktopPairingRiskFingerprint', 'Device fingerprint changed');
    if (flag === 'install_id_changed')
      return t('desktopPairingRiskInstall', 'Installation changed');
    if (flag === 'browser_changed')
      return t('desktopPairingRiskBrowser', 'Browser identity changed');
    if (flag === 'client_key_changed')
      return t('desktopPairingRiskClientKey', 'Client signing key changed');
    if (flag === 'rapid_repair') return t('desktopPairingRiskRapid', 'Rapid re-pairing detected');
    return flag;
  };
  const mapImportWarningLabel = (warning: string) => {
    if (warning === 'BITWARDEN_CSV_DETECTED') {
      return t('importWarningBitwarden', 'Bitwarden CSV format detected.');
    }
    if (warning === 'ONEPASSWORD_CSV_DETECTED') {
      return t('importWarning1Password', '1Password CSV format detected.');
    }
    if (warning === 'KEEPASSXC_CSV_DETECTED') {
      return t('importWarningKeePassXC', 'KeePassXC CSV format detected.');
    }
    if (warning === 'PROTON_PASS_CSV_DETECTED') {
      return t('importWarningProtonPass', 'Proton Pass CSV format detected.');
    }
    if (warning === 'ENCRYPTED_AEGIS_BACKUP') {
      return t('importWarningEncryptedBackup', 'Encrypted Aegis backup imported.');
    }
    if (warning === 'SYNC_CONFLICT_DUPLICATES_DETECTED') {
      return t(
        'syncConflictWarningDuplicates',
        'Existing vault items with matching signatures were detected before import.'
      );
    }
    if (warning === 'SYNC_CONFLICT_EXACT_MATCHES_DETECTED') {
      return t(
        'syncConflictWarningExactMatches',
        'Some incoming items appear to be exact matches of existing vault records.'
      );
    }
    return warning;
  };
  const persistPlaintextExportPreference = (enabled: boolean) => {
    SecureAppSettings.setPlaintextExportEnabled(enabled);
  };
  const currentSecurityModeDefinition = SecurityModePolicy.getDefinition(securityModeProfile);
  const activeSyncMode = AEGIS_SYNC_MODES[AEGIS_SYNC_STRATEGY.activeMode];
  const futureSyncMode = AEGIS_SYNC_MODES[AEGIS_SYNC_STRATEGY.futureMode];
  const syncTransportSummaries = useMemo(() => {
    return activeSyncMode.defaultTransportKeys.map((transportKey) => {
      const transport = AEGIS_SYNC_TRANSPORTS[transportKey];
      let statusKey = 'syncStrategyStatusReady';
      let statusDefault = 'Ready';

      if (transportKey === 'qr_transfer' && !currentSecurityModeDefinition.allowQrSync) {
        statusKey = 'syncStrategyStatusBlocked';
        statusDefault = 'Blocked by security mode';
      } else if (transportKey === 'plaintext_export' && !allowPlaintextExport) {
        statusKey = 'syncStrategyStatusRestricted';
        statusDefault = 'Restricted';
      }

      return {
        ...transport,
        statusKey,
        statusDefault,
      };
    });
  }, [
    activeSyncMode.defaultTransportKeys,
    allowPlaintextExport,
    currentSecurityModeDefinition.allowQrSync,
  ]);
  const syncAuditDefinitions = useMemo(() => AEGIS_SYNC_AUDIT_LANGUAGE.slice(0, 3), []);
  const filteredSyncAuditEvents = useMemo(() => {
    if (syncAuditFilter === 'all') return syncAuditEvents;
    if (syncAuditFilter === 'qr') {
      return syncAuditEvents.filter((event) => event.source === 'qr_import');
    }
    if (syncAuditFilter === 'restore_migration') {
      return syncAuditEvents.filter(
        (event) => event.source === 'canonical_restore' || event.source === 'migration'
      );
    }
    return syncAuditEvents.filter(
      (event) => event.source === 'backup_import' || event.source === 'structured_import'
    );
  }, [syncAuditEvents, syncAuditFilter]);
  const syncAuditSourceCounts = useMemo(
    () => ({
      imports: syncAuditEvents.filter(
        (event) => event.source === 'backup_import' || event.source === 'structured_import'
      ).length,
      qr: syncAuditEvents.filter((event) => event.source === 'qr_import').length,
      restore: syncAuditEvents.filter(
        (event) => event.source === 'canonical_restore' || event.source === 'migration'
      ).length,
    }),
    [syncAuditEvents]
  );
  const sharingOverview = useMemo(
    () => SharingOverviewService.buildReport(passwords),

    [passwords, sharingOverviewVersion]
  );
  const securityCenterSummary = useMemo(
    () =>
      SecurityCenterService.buildSummary(passwords, securityCenterReviews, {
        desktopPairings,
        syncAuditEvents,
      }),
    [passwords, securityCenterReviews, desktopPairings, syncAuditEvents]
  );
  const releaseTrustSummary = useMemo(() => ReleaseTrustService.buildSummary(), []);

  const appendReleaseTrustHistory = useCallback((event: ReleaseTrustHistoryEvent) => {
    const next = [event, ...SecureAppSettings.getReleaseTrustHistory()].slice(0, 24);
    SecureAppSettings.setReleaseTrustHistory(next);
    setReleaseTrustHistory(next);
  }, []);

  const refreshEmergencyAccess = useCallback(() => {
    EmergencyAccessService.evaluateState();
    const summary = EmergencyAccessService.getSummary();
    setEmergencyAccessPolicy(summary.policy);
    setEmergencyAccessContacts(summary.contacts);
    setEmergencyAccessRequests(summary.requests);
    setEmergencyAccessAudit(summary.auditEvents);
  }, []);

  useEffect(() => {
    refreshEmergencyAccess();
    const timer = window.setInterval(() => {
      refreshEmergencyAccess();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [refreshEmergencyAccess]);

  const toggleReleaseTrustChecklist = useCallback(
    (checkKey: string) => {
      const next = { ...SecureAppSettings.getReleaseTrustChecklist() };
      const now = new Date().toISOString();
      if (next[checkKey]) {
        delete next[checkKey];
        appendReleaseTrustHistory({
          id: `rt-${checkKey}-reopen-${now}`,
          at: now,
          action: 'evidence_reopened',
          targetId: checkKey,
          title: checkKey,
        });
        toast.info(t('releaseTrustChecklistReopened', 'Evidence checklist item reopened.'));
      } else {
        next[checkKey] = now;
        appendReleaseTrustHistory({
          id: `rt-${checkKey}-collect-${now}`,
          at: now,
          action: 'evidence_collected',
          targetId: checkKey,
          title: checkKey,
        });
        toast.success(
          t('releaseTrustChecklistCollectedToast', 'Evidence checklist item marked as collected.')
        );
      }
      SecureAppSettings.setReleaseTrustChecklist(next);
      setReleaseTrustChecklist(next);
    },
    [appendReleaseTrustHistory, t]
  );

  const toggleReleaseTrustApproval = useCallback(
    (packageId: string) => {
      const next = { ...SecureAppSettings.getReleaseTrustApprovals() };
      const now = new Date().toISOString();
      if (next[packageId]) {
        delete next[packageId];
        appendReleaseTrustHistory({
          id: `rt-${packageId}-clear-${now}`,
          at: now,
          action: 'owner_approval_cleared',
          targetId: packageId,
          title: packageId,
        });
        toast.info(t('releaseTrustApprovalClearedToast', 'Owner approval was cleared.'));
      } else {
        next[packageId] = now;
        appendReleaseTrustHistory({
          id: `rt-${packageId}-approve-${now}`,
          at: now,
          action: 'owner_approved',
          targetId: packageId,
          title: packageId,
        });
        toast.success(t('releaseTrustApprovalMarkedToast', 'Owner approval was recorded.'));
      }
      SecureAppSettings.setReleaseTrustApprovals(next);
      setReleaseTrustApprovals(next);
    },
    [appendReleaseTrustHistory, t]
  );
  useEffect(() => {
    if (securityCenterSummary.resolvedTriageItems.length === 0) return;

    const currentHistory = SecureAppSettings.getSecurityCenterHistory();
    const existingResolvedKeys = new Set(
      currentHistory
        .filter((event) => event.action === 'auto_resolved')
        .map((event) => event.reviewKey)
    );
    const additions = securityCenterSummary.resolvedTriageItems
      .filter((item) => !existingResolvedKeys.has(item.reviewKey))
      .map((item) => ({
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        action: 'auto_resolved' as const,
        reviewKey: item.reviewKey,
        issueType: item.issueType,
        title: item.title,
      }));

    if (additions.length === 0) return;

    const nextHistory = [...currentHistory, ...additions].slice(-40);
    SecureAppSettings.setSecurityCenterHistory(nextHistory);
    setSecurityCenterHistory(nextHistory);
  }, [securityCenterSummary.resolvedTriageItems]);
  const openSecurityCenterTriageItem = (item: SecurityCenterTriageItem) => {
    if (item.issueType === 'device_trust') {
      desktopPairingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (item.issueType === 'local_risk_activity') {
      qrAuditPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const target = passwords.find((entry) => entry.id === item.itemId);
    if (!target) {
      toast.info(
        t('securityCenterTriageItemMissing', 'The selected security item could not be found.')
      );
      return;
    }

    if (item.issueType === 'sensitive_sharing') {
      onClose();
      onEditEntry({
        ...target,
        pass: target.pass || '',
        ui_focus_context: 'sharing_issue',
        ui_focus_label: item.title,
      });
      return;
    }

    onClose();
    onEditEntry({
      ...target,
      pass: target.pass || '',
      ui_focus_label: item.title,
    });
  };
  const markSecurityCenterTriageReviewed = (item: SecurityCenterTriageItem) => {
    const next = {
      ...SecureAppSettings.getSecurityCenterReviews(),
      [item.reviewKey]: new Date().toISOString(),
    };
    const nextHistory = [
      ...SecureAppSettings.getSecurityCenterHistory(),
      {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        action: 'reviewed' as const,
        reviewKey: item.reviewKey,
        issueType: item.issueType,
        title: item.title,
      },
    ].slice(-40);
    SecureAppSettings.setSecurityCenterReviews(next);
    SecureAppSettings.setSecurityCenterHistory(nextHistory);
    setSecurityCenterReviews(next);
    setSecurityCenterHistory(nextHistory);
    toast.success(t('securityCenterReviewed', 'Security triage item marked as reviewed.'));
  };
  const reopenSecurityCenterTriageItem = (item: SecurityCenterTriageItem) => {
    const next = { ...SecureAppSettings.getSecurityCenterReviews() };
    delete next[item.reviewKey];
    const nextHistory = [
      ...SecureAppSettings.getSecurityCenterHistory(),
      {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        action: 'reopened' as const,
        reviewKey: item.reviewKey,
        issueType: item.issueType,
        title: item.title,
      },
    ].slice(-40);
    SecureAppSettings.setSecurityCenterReviews(next);
    SecureAppSettings.setSecurityCenterHistory(nextHistory);
    setSecurityCenterReviews(next);
    setSecurityCenterHistory(nextHistory);
    toast.success(t('securityCenterReopened', 'Security triage item was reopened.'));
  };
  const sharingAuditEvents = useMemo(
    () => SharingAuditService.listEvents(),

    [sharingOverviewVersion]
  );
  const filteredSharingAuditEvents = useMemo(
    () => SharingAuditService.filterEvents(sharingAuditEvents, sharingAuditFilter),
    [sharingAuditEvents, sharingAuditFilter]
  );
  const highlightedSharingAuditIds = useMemo(
    () =>
      SharingAuditService.getRelatedEventIdsForIssue(
        filteredSharingAuditEvents,
        sharingAuditFocus
          ? { itemId: sharingAuditFocus.itemId, type: sharingAuditFocus.type }
          : null
      ),
    [filteredSharingAuditEvents, sharingAuditFocus]
  );
  const openSharingIssueItem = (
    itemId: number,
    options?: { focusContext?: 'sharing_issue' | 'sharing_audit'; focusLabel?: string }
  ) => {
    const target = passwords.find((entry) => entry.id === itemId);
    if (!target) {
      toast.error(t('sharingOverviewItemMissing'));
      return;
    }
    onClose();
    onEditEntry({
      ...target,
      pass: target.pass || '',
      ui_focus_context: options?.focusContext,
      ui_focus_label: options?.focusLabel || target.title,
    });
  };
  const resolveSharingIssue = (issue: {
    itemId: number;
    type: SharingOverviewIssueType;
    title?: string;
  }) => {
    setSelectedSharingIssueKey(`${issue.type}-${issue.itemId}`);
    setSharingAuditFocus({
      itemId: issue.itemId,
      type: issue.type,
      title: issue.title || String(issue.itemId),
    });
    if (issue.type === 'review_required') {
      setSharingAuditFilter('reviews');
    } else if (issue.type === 'orphaned_space' || issue.type === 'no_members') {
      setSharingAuditFilter('assignments');
    }

    if (issue.type === 'review_required') {
      const marked = VaultSharingLinkService.markEntryAssignmentsReviewed(issue.itemId);
      if (!marked) {
        toast.error(t('sharingOverviewReviewFailed'));
        return;
      }
      setSharingOverviewVersion((current) => current + 1);
      toast.success(t('sharingOverviewReviewed'));
      return;
    }

    if (issue.type === 'orphaned_space' || issue.type === 'no_members') {
      setFocusedSharedSpaceId(null);
      setFocusedSharedSpaceContext('issue');
      setShowSharedSpacesModal(true);
      return;
    }

    openSharingIssueItem(issue.itemId, {
      focusContext: 'sharing_issue',
      focusLabel: issue.title,
    });
  };
  const openSharingAuditTarget = (
    event: Parameters<typeof SharingAuditService.getNavigationTarget>[0]
  ) => {
    const target = SharingAuditService.getNavigationTarget(event);
    if (!target) {
      toast.info(t('sharingAuditTargetMissing'));
      return;
    }

    if (target.kind === 'entry') {
      setSharingAuditFocus(null);
      setSelectedSharingIssueKey(null);
      openSharingIssueItem(target.entryId, {
        focusContext: 'sharing_audit',
        focusLabel: event.detail || event.entryId || undefined,
      });
      return;
    }

    setFocusedSharedSpaceId(target.spaceId);
    setFocusedSharedSpaceContext('audit');
    setShowSharedSpacesModal(true);
  };
  const focusSharingAuditTarget = (
    event: Parameters<typeof SharingAuditService.getNavigationTarget>[0]
  ) => {
    const target = SharingAuditService.getNavigationTarget(event);
    if (!target) {
      toast.info(t('sharingAuditTargetMissing'));
      return;
    }
    setSharingAuditFilter(SharingAuditService.getSuggestedFilterForEvent(event));

    if (target.kind === 'space') {
      setFocusedSharedSpaceId(target.spaceId);
      setFocusedSharedSpaceContext('audit');
      setSharingAuditFocus({
        itemId: -1,
        type: 'no_members',
        title: event.detail || target.spaceId,
      });
      return;
    }

    const matchingIssue =
      sharingOverview.issues.find((issue) => issue.itemId === target.entryId) || null;
    if (!matchingIssue) {
      setSelectedSharingIssueKey(null);
      setSharingAuditFocus({
        itemId: target.entryId,
        type:
          event.type === 'assignment_reviewed' ? 'review_required' : 'sensitive_without_emergency',
        title: event.detail || String(target.entryId),
      });
      return;
    }

    setSelectedSharingIssueKey(`${matchingIssue.type}-${matchingIssue.itemId}`);
    setSharingAuditFocus({
      itemId: matchingIssue.itemId,
      type: matchingIssue.type,
      title: matchingIssue.title,
    });
  };
  const openSharingSpace = (spaceId: string, context: 'issue' | 'audit' | null = 'issue') => {
    setFocusedSharedSpaceId(spaceId);
    setFocusedSharedSpaceContext(context);
    setSelectedSharingIssueKey(null);
    setShowSharedSpacesModal(true);
  };
  const mapQrAuditLabel = (type: string) => {
    if (type === 'package_created') return t('qrSyncAuditCreated', 'Transfer created');
    if (type === 'package_consumed') return t('qrSyncAuditConsumed', 'Transfer imported');
    if (type === 'package_revoked') return t('qrSyncAuditRevoked', 'Transfer revoked');
    if (type === 'package_rejected') return t('qrSyncAuditRejected', 'Transfer rejected');
    if (type === 'receiver_session_created')
      return t('qrSyncAuditReceiverSession', 'Receiver session created');
    return type;
  };
  const mapQrAuditToSyncKey = (type: string) => {
    if (type === 'package_created') return 'transfer_created';
    if (type === 'package_consumed') return 'transfer_imported';
    if (type === 'package_revoked') return 'transfer_revoked';
    if (type === 'package_rejected') return 'transfer_rejected';
    if (type === 'receiver_session_created') return 'receiver_session_created';
    return null;
  };
  const mapSyncAuditLabel = (type: string) => {
    if (type === 'backup_import_completed')
      return t('syncAuditBackupImportCompleted', 'Encrypted backup import completed');
    if (type === 'structured_import_completed')
      return t('syncAuditStructuredImportCompleted', 'Structured import completed');
    if (type === 'qr_import_completed')
      return t('syncAuditQrImportCompleted', 'QR import completed');
    if (type === 'canonical_restore_completed')
      return t('syncAuditCanonicalRestoreCompleted', 'Canonical restore completed');
    if (type === 'migration_completed')
      return t('syncAuditMigrationCompleted', 'Migration completed');
    return type;
  };
  const navigateFromSyncAudit = (source: string) => {
    if ((source === 'backup_import' || source === 'structured_import') && importReportRef.current) {
      importReportRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (source === 'qr_import' && qrAuditPanelRef.current) {
      qrAuditPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if ((source === 'canonical_restore' || source === 'migration') && migrationReportRef.current) {
      migrationReportRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  const refreshQrSyncTelemetry = useCallback(() => {
    setQrTransferHistory(QRSyncService.listTransferHistory());
    setQrTransferAudit(QRSyncService.listAuditEvents());
    setSyncAuditEvents(SyncAuditService.listEvents());
  }, []);
  const passkeyInventorySummary = useMemo(
    () =>
      PasskeyInventoryService.buildSummary({
        bindings: allPasskeyBindings,
        policy: passkeyPolicy,
        revocations: passkeyRevocations,
        eventLog: passkeyEventLog,
        vaultEntries: passwords,
      }),
    [allPasskeyBindings, passkeyEventLog, passkeyPolicy, passkeyRevocations, passwords]
  );
  const filteredSitePasskeyEntries = useMemo(() => {
    if (sitePasskeyFilter === 'attention') {
      return passkeyInventorySummary.siteEntries.filter((entry) => entry.riskFlags.length > 0);
    }
    if (sitePasskeyFilter === 'healthy') {
      return passkeyInventorySummary.siteEntries.filter((entry) => entry.riskFlags.length === 0);
    }
    if (sitePasskeyFilter === 'future') {
      return passkeyInventorySummary.siteEntries.filter(
        (entry) => entry.mode === 'site_passkey_future_rp'
      );
    }
    if (sitePasskeyFilter === 'missing_rp_id' || sitePasskeyFilter === 'missing_credential_id') {
      return passkeyInventorySummary.siteEntries.filter((entry) =>
        entry.riskFlags.includes(sitePasskeyFilter)
      );
    }
    return passkeyInventorySummary.siteEntries;
  }, [passkeyInventorySummary.siteEntries, sitePasskeyFilter]);
  const previewSitePasskeyEntries = useMemo(() => {
    const source = passkeyInventorySummary.previewSiteEntries;
    if (sitePasskeyFilter === 'attention') {
      return source.filter((entry) => entry.riskFlags.length > 0);
    }
    if (sitePasskeyFilter === 'healthy') {
      return source.filter((entry) => entry.riskFlags.length === 0);
    }
    if (sitePasskeyFilter === 'future') {
      return source.filter((entry) => entry.mode === 'site_passkey_future_rp');
    }
    if (sitePasskeyFilter === 'missing_rp_id' || sitePasskeyFilter === 'missing_credential_id') {
      return source.filter((entry) => entry.riskFlags.includes(sitePasskeyFilter));
    }
    return source;
  }, [passkeyInventorySummary.previewSiteEntries, sitePasskeyFilter]);
  const openPasskeySiteEntry = (item: PasskeyInventorySiteEntry) => {
    const target = passwords.find((entry) => entry.id === item.id);
    if (!target) return;
    onClose();
    onEditEntry({ ...target, pass: target.pass || '' });
  };
  const deriveRpIdFromEntry = (entry: VaultEntry): string => {
    const raw = (entry.website || '').trim();
    if (!raw) return '';
    try {
      const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      return new URL(withProtocol).hostname.replace(/^www\./i, '');
    } catch {
      return raw
        .replace(/^https?:\/\//i, '')
        .split('/')[0]
        .replace(/^www\./i, '');
    }
  };
  const handlePasskeyBulkFix = async (
    kind: 'missing_rp_id' | 'missing_credential_id' | 'future_mode',
    selectedIds?: number[]
  ) => {
    const candidates = passwords.filter((entry) => {
      if (selectedIds?.length && !selectedIds.includes(entry.id)) return false;
      if (!(entry.category === 'Passkeys' || entry.passkeyMetadata)) return false;
      if (kind === 'missing_rp_id') return !entry.passkeyMetadata?.rp_id;
      if (kind === 'missing_credential_id') return !entry.passkeyMetadata?.credential_id;
      return entry.passkeyMetadata?.mode === 'site_passkey_future_rp';
    });

    let updated = 0;
    for (const entry of candidates) {
      const nextMetadata = {
        mode: entry.passkeyMetadata?.mode || 'site_passkey_mvp',
        ...entry.passkeyMetadata,
      };
      if (kind === 'missing_rp_id') {
        const derived = deriveRpIdFromEntry(entry);
        if (!derived) continue;
        nextMetadata.rp_id = derived;
      } else if (kind === 'missing_credential_id') {
        const derivedCredential = entry.pass || '';
        if (!derivedCredential) continue;
        nextMetadata.credential_id = derivedCredential;
      } else {
        nextMetadata.mode = 'site_passkey_mvp';
      }

      await vaultService.addPassword({
        ...entry,
        pass: entry.pass || '',
        passkeyMetadata: nextMetadata,
      });
      updated += 1;
    }

    setPendingBulkFix(null);
    loadPasswords();
    if (updated === 0) {
      toast.info(
        kind === 'missing_rp_id'
          ? t('passkeyInventoryBulkFixRpNone', 'No RP ID could be auto-filled from site URLs.')
          : kind === 'missing_credential_id'
            ? t(
                'passkeyInventoryBulkFixCredentialNone',
                'No credential ID could be auto-filled from current records.'
              )
            : t(
                'passkeyInventoryBulkConvertFutureNone',
                'No future-mode record could be converted.'
              )
      );
      return;
    }

    toast.success(
      kind === 'missing_rp_id'
        ? t('passkeyInventoryBulkFixRpDone', {
            count: updated,
            defaultValue: '{{count}} RP ID field updated.',
          })
        : kind === 'missing_credential_id'
          ? t('passkeyInventoryBulkFixCredentialDone', {
              count: updated,
              defaultValue: '{{count}} credential ID field updated.',
            })
          : t('passkeyInventoryBulkConvertFutureDone', {
              count: updated,
              defaultValue: '{{count}} future-mode record converted.',
            })
    );
    setPasskeyRemediationResult({ kind, count: updated, at: Date.now() });
  };
  const requestPasskeyBulkFix = (
    kind: 'missing_rp_id' | 'missing_credential_id' | 'future_mode',
    selectedIds?: number[]
  ) => {
    const count = passwords.filter((entry) => {
      if (selectedIds?.length && !selectedIds.includes(entry.id)) return false;
      if (!(entry.category === 'Passkeys' || entry.passkeyMetadata)) return false;
      if (kind === 'missing_rp_id') return !entry.passkeyMetadata?.rp_id;
      if (kind === 'missing_credential_id') return !entry.passkeyMetadata?.credential_id;
      return entry.passkeyMetadata?.mode === 'site_passkey_future_rp';
    }).length;
    setPendingBulkFix({ kind, count, selectedIds });
    if (selectedIds?.length && count === 0) {
      toast.info(
        t('passkeyInventorySelectionNoFix', 'No selected record matches this bulk action.')
      );
    }
  };
  const scrollToPasskeySection = (section: 'active' | 'revocations' | 'policy') => {
    const ref =
      section === 'active'
        ? passkeyActiveDeviceRef
        : section === 'revocations'
          ? passkeyRevocationRef
          : passkeyPolicyRef;
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const handlePasskeyInventoryAction = (key: string) => {
    if (key === 'passkeyInventoryActionRecovery') {
      requireAuth(t('passkeyRecoveryExportBtn'), handlePasskeyRecoveryExport);
      return;
    }
    if (key === 'passkeyInventoryActionAudit') {
      scrollToPasskeySection('revocations');
      return;
    }
    if (key === 'passkeyInventoryActionRotate') {
      scrollToPasskeySection('policy');
      toast.info(
        t('passkeyInventoryRotateHint', 'Review rotation threshold and refresh aging passkeys.')
      );
      return;
    }
    if (key === 'passkeyInventoryActionReviewSiteEntries') {
      const target = passkeyInventorySummary.siteEntries.find(
        (entry) => entry.riskFlags.length > 0
      );
      if (!target) {
        toast.info(t('passkeyInventorySiteEntriesHealthy', 'Site passkey entries look healthy.'));
        return;
      }
      setSitePasskeyFilter('attention');
      openPasskeySiteEntry(target);
    }
  };

  const loadPasskeyState = useCallback(async () => {
    await SecureAppSettings.initialize();
    await PasskeyBindingService.initialize();
    const binding = PasskeyBindingService.getBinding(
      activeProfile?.id || null,
      activeProfile?.dbName || 'aegis_opfs_vault'
    );
    setHasPasskeyBinding(Boolean(binding));
    setPasskeyBindingDetails(binding);
    setAllPasskeyBindings(PasskeyBindingService.listBindings());
    setPasskeyEventLog(
      PasskeyBindingService.getEventLog(
        activeProfile?.id || null,
        activeProfile?.dbName || 'aegis_opfs_vault'
      )
    );
    setPasskeyRevocations(PasskeyBindingService.listRevocations());
    setPasskeyPolicy(PasskeyBindingService.getPolicy());
    setSecurityCenterReviews(SecureAppSettings.getSecurityCenterReviews());
    const currentProfile = SecurityModePolicy.getProfile();
    setSecurityModeProfile(currentProfile);
    setAllowPlaintextExport(
      SecurityModePolicy.isPlaintextExportAllowed(currentProfile) &&
        SecureAppSettings.getPlaintextExportEnabled()
    );
    setTotpMode(TotpVaultPolicy.getMode());
  }, [activeProfile?.id, activeProfile?.dbName]);

  const resetSyncFlow = useCallback(() => {
    setSyncMode('none');
    setSyncData('');
    setSyncTransferCode('');
    setSyncRecipientPairingCode('');
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

  const applySecurityModeProfile = useCallback(
    (profile: SecurityModeProfile) => {
      SecurityModePolicy.setProfile(profile);
      setSecurityModeProfile(profile);

      const definition = SecurityModePolicy.getDefinition(profile);
      const plaintextEnabled =
        definition.allowPlaintextExport && SecureAppSettings.getPlaintextExportEnabled();
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

      if (!definition.allowQrSync && syncMode !== 'none') {
        resetSyncFlow();
      }

      toast.success(t('securityModeUpdated'));
    },
    [autoLockTime, hibpEnabled, resetSyncFlow, setAutoLockTime, setHibpEnabled, syncMode, t]
  );

  const handlePlaintextExportToggle = (enabled: boolean) => {
    if (!SecurityModePolicy.isPlaintextExportAllowed(securityModeProfile) && enabled) {
      toast.info(t('securityModePlaintextBlocked'));
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
    electronApi
      .listExtensionPairings()
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
  const executeExport = async (format: 'vault' | 'csv' | 'json') => {
    const data = passwords;
    const exportEntries = ExportService.fromVaultEntries(data);
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'csv') {
      content = ExportService.buildCsv(exportEntries);
      filename = 'aegis_export.csv';
      mimeType = 'text/csv';
    } else if (format === 'json') {
      content = ExportService.buildJson(exportEntries);
      filename = 'aegis_export.json';
      mimeType = 'application/json';
    } else {
      // P1-1 Encrypted Backup Default
      try {
        // Will prompt for password below in a real impl, but here we can just pass a temp UI prompt or use the same auth flow
        // Since we already did ReAuth, the user typed their password there.
        // A better approach: require users to provide a password for the backup file itself.
        // For simplicity, we can use the same text prompt.
        const backupPass = window.prompt(
          t('enterBackupPassword', 'Lütfen yedeği şifrelemek için bir parola belirleyin:')
        );
        if (!backupPass) return;

        content = await BackupService.encryptBackup(data, backupPass);
        filename = 'aegis_vault_backup.aes';
        mimeType = 'application/octet-stream';
      } catch {
        toast.error('Encryption failed');
        return;
      }
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('exportSuccess'));
  };

  const handleExport = (format: 'vault' | 'csv' | 'json') => {
    if (format !== 'vault') {
      if (
        !SecurityModePolicy.isPlaintextExportAllowed(securityModeProfile) ||
        !allowPlaintextExport
      ) {
        toast.error(t('securityModePlaintextBlocked'));
        return;
      }
      if (
        !window.confirm(
          'UYARI: Düz metin (Plaintext) dışa aktarım, şifrelerinizin savunmasız bir biçimde kaydedilmesine neden olur. Devam etmek istediğinize emin misiniz?'
        )
      ) {
        return;
      }
    }
    requireAuth(t('exportAuthName', 'Vault Export'), () => executeExport(format));
  };

  // Import
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setImportReport(null);
    setLatestMigrationReport(null);

    try {
      if (file.name.endsWith('.aes')) {
        const backupPass = window.prompt('Lütfen yedeğin şifresini girin:');
        if (!backupPass) {
          setIsImporting(false);
          return;
        }
        const text = await file.text();
        const migrationPreview =
          await CanonicalMigrationService.migrateLegacyBackupToCanonicalWithReport(
            text,
            backupPass,
            backupPass,
            passwords
          );
        const dec = await BackupService.decryptBackup<Partial<VaultEntry>>(text, backupPass);
        const entries = dec;
        const conflictSummary = SyncConflictResolutionService.summarize(
          passwords,
          entries,
          'backup_import'
        );
        let processes = 0;
        setImportProgress({ status: 'importing', totalAnalyzed: entries.length, processed: 0 });
        for (const entry of entries) {
          await vaultService.addPassword(entry);
          processes++;
          setImportProgress({
            status: 'importing',
            totalAnalyzed: entries.length,
            processed: processes,
          });
        }
        setImportProgress({
          status: 'complete',
          totalAnalyzed: entries.length,
          processed: processes,
        });
        setImportReport({
          sourceFormat: 'json',
          totalRows: entries.length,
          validEntries: entries.length,
          skippedRows: 0,
          weakPasswords: entries.filter((entry) => !entry.pass || entry.pass.length < 8).length,
          missingCriticalFields: entries.filter(
            (entry) => !entry.title || !entry.username || !entry.website
          ).length,
          duplicateCandidates: conflictSummary.duplicateCount,
          conflictSummary,
          warnings: [
            'ENCRYPTED_AEGIS_BACKUP',
            ...(conflictSummary.duplicateCount > 0 ? ['SYNC_CONFLICT_DUPLICATES_DETECTED'] : []),
            ...(conflictSummary.exactMatchCount > 0
              ? ['SYNC_CONFLICT_EXACT_MATCHES_DETECTED']
              : []),
          ],
        });
        setLatestMigrationReport(migrationPreview.report);
        loadPasswords();
        if (conflictSummary.duplicateCount > 0) {
          toast.info(
            t('syncConflictToastSummary', {
              duplicates: conflictSummary.duplicateCount,
              exact: conflictSummary.exactMatchCount,
              defaultValue:
                'Import check: {{duplicates}} existing match(es), {{exact}} exact match(es) detected.',
            })
          );
        }
        SyncAuditService.recordEvent({
          type: 'backup_import_completed',
          source: 'backup_import',
          detail: t('syncAuditBackupImportCompleted', 'Encrypted backup import completed'),
          metadata: {
            imported: entries.length,
            duplicates: conflictSummary.duplicateCount,
            exact: conflictSummary.exactMatchCount,
          },
        });
        refreshQrSyncTelemetry();
        toast.success(t('importSuccess', { count: entries.length }));
        setIsImporting(false);
        return;
      }

      const { entries, report } = await ImportService.parseFile(file, (progress) => {
        setImportProgress(progress);
      });

      const conflictSummary = SyncConflictResolutionService.summarize(
        passwords,
        entries,
        'structured_import'
      );
      const totalAnalyzed = report.totalRows || entries.length;
      let processed = 0;

      setImportProgress({ status: 'importing', totalAnalyzed, processed });

      for (const entry of entries) {
        await vaultService.addPassword(entry);
        processed++;
        setImportProgress({ status: 'importing', totalAnalyzed, processed });
      }

      setImportProgress({ status: 'complete', totalAnalyzed, processed });
      setImportReport({
        ...report,
        duplicateCandidates: report.duplicateCandidates + conflictSummary.duplicateCount,
        conflictSummary,
        warnings: [
          ...report.warnings,
          ...(conflictSummary.duplicateCount > 0 ? ['SYNC_CONFLICT_DUPLICATES_DETECTED'] : []),
          ...(conflictSummary.exactMatchCount > 0 ? ['SYNC_CONFLICT_EXACT_MATCHES_DETECTED'] : []),
        ],
      });
      loadPasswords();
      if (conflictSummary.duplicateCount > 0) {
        toast.info(
          t('syncConflictToastSummary', {
            duplicates: conflictSummary.duplicateCount,
            exact: conflictSummary.exactMatchCount,
            defaultValue:
              'Import check: {{duplicates}} existing match(es), {{exact}} exact match(es) detected.',
          })
        );
      }
      SyncAuditService.recordEvent({
        type: 'structured_import_completed',
        source: 'structured_import',
        detail: t('syncAuditStructuredImportCompleted', 'Structured import completed'),
        metadata: {
          imported: report.validEntries,
          duplicates: conflictSummary.duplicateCount,
          exact: conflictSummary.exactMatchCount,
        },
      });
      refreshQrSyncTelemetry();
      toast.success(t('importSuccess', { count: report.validEntries }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'IMPORT_FAILED';
      toast.error(t('importFailed', { error: message }));
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleSyncExportInit = () => {
    if (!SecurityModePolicy.isQrSyncAllowed(securityModeProfile)) {
      toast.error(t('securityModeQrSyncBlocked'));
      return;
    }
    requireAuth(t('qrSyncExportAuthName', 'QR Sync Export'), () => {
      setSyncTransferCode(QRSyncService.generateTransferCode());
      setSyncRecipientPairingCode('');
      setSyncExportPackage(null);
      setSyncMode('export-config');
    });
  };

  const handleSyncExportGenerate = async () => {
    if (!SecurityModePolicy.isQrSyncAllowed(securityModeProfile)) {
      toast.error(t('securityModeQrSyncBlocked'));
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
          cardDetails: p.cardDetails,
          identityDetails: p.identityDetails,
        })),
        {
          transferCode: syncTransferCode,
          recipientPublicKey: syncRecipientPairingCode.trim() || undefined,
        }
      );

      setSyncData(exportResult.rawPackage);
      setSyncExportPackage(exportResult.packageInfo);
      setSyncMode('export');
      refreshQrSyncTelemetry();
      toast.success(t('qrSyncExportReady', 'Encrypted QR transfer is ready.'));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'QR_SYNC_EXPORT_FAILED';
      toast.error(
        t('qrSyncExportFailed', {
          error: message,
          defaultValue: 'QR transfer could not be prepared: {{error}}',
        })
      );
    }
  };

  const handleSyncImportSuccess = async (data: string) => {
    if (!SecurityModePolicy.isQrSyncAllowed(securityModeProfile)) {
      toast.error(t('securityModeQrSyncBlocked'));
      resetSyncFlow();
      return;
    }
    try {
      const entries = await QRSyncService.parsePackage(data, {
        transferCode: syncTransferCode,
        receiverSession: syncReceiverSession,
      });
      const conflictSummary = SyncConflictResolutionService.summarize(
        passwords,
        entries,
        'qr_import'
      );
      for (const e of entries) {
        await vaultService.addPassword(e);
      }
      loadPasswords();
      refreshQrSyncTelemetry();
      resetSyncFlow();
      if (conflictSummary.duplicateCount > 0) {
        toast.info(
          t('syncConflictQrToastSummary', {
            duplicates: conflictSummary.duplicateCount,
            defaultValue: 'QR import found {{duplicates}} existing match(es) in the local vault.',
          })
        );
      }
      SyncAuditService.recordEvent({
        type: 'qr_import_completed',
        source: 'qr_import',
        detail: t('syncAuditQrImportCompleted', 'QR import completed'),
        metadata: {
          imported: entries.length,
          duplicates: conflictSummary.duplicateCount,
          exact: conflictSummary.exactMatchCount,
        },
      });
      refreshQrSyncTelemetry();
      toast.success(t('syncImportSuccess', { count: entries.length }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'QR_SYNC_IMPORT_FAILED';
      toast.error(
        t('syncImportFailed', {
          error: message,
          defaultValue: 'QR transfer could not be imported: {{error}}',
        })
      );
    }
  };

  const handleFactoryReset = async () => {
    await vaultService.wipeAllData();
    window.location.reload();
  };

  const handleLogoClick = () => {
    setShowSecretMenu(true);
    toast.info(t('secretMenuActive'));
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
    const reason = 'manual_revoke';
    await PasskeyBindingService.initialize();
    const revoked = PasskeyBindingService.revokeBinding(
      activeProfile?.id || null,
      activeProfile?.dbName || 'aegis_opfs_vault',
      reason
    );
    if (revoked) {
      await loadPasskeyState();
      toast.success(t('passkeyRevoked'));
    } else {
      toast.info(t('passkeyNoBindingForProfile'));
    }
  };

  const handleStorageAuditCleanup = () => {
    const keys = Object.keys(localStorage);
    const keepPrefixes = ['i18nextLng'];
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
    if (
      !window.confirm(
        t(
          'qrSyncRevokeConfirm',
          'Do you want to revoke this QR transfer? It can no longer be imported.'
        )
      )
    ) {
      return;
    }
    const reason = 'manual_revoke';
    const revoked = QRSyncService.revokeTransfer(sessionId, reason);
    refreshQrSyncTelemetry();
    if (revoked) {
      if (syncExportPackage?.sessionId === sessionId) {
        setSyncExportPackage(null);
        setSyncData('');
      }
      toast.success(t('qrSyncRevokeSuccess', 'QR transfer revoked.'));
    } else {
      toast.error(t('qrSyncRevokeFailed', 'QR transfer could not be revoked.'));
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
      toast.error(
        t(
          'desktopPairingUnavailable',
          'Desktop pairing controls are unavailable in this environment.'
        )
      );
      return;
    }

    if (
      !window.confirm(
        t(
          'desktopPairingRemoveConfirm',
          'Remove this extension pairing? The browser extension will need to pair again.'
        )
      )
    ) {
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

  const handleEmergencyPolicyUpdate = (next: Partial<EmergencyAccessPolicy>) => {
    EmergencyAccessService.updatePolicy(next);
    refreshEmergencyAccess();
    toast.success(t('emergencyAccessPolicyUpdated'));
  };

  const handleEmergencyContactSave = (input: {
    id?: string;
    name: string;
    email: string;
    permission: EmergencyAccessContact['permission'];
    wait_hours: number;
    enabled: boolean;
    note?: string;
  }) => {
    const saved = EmergencyAccessService.saveContact(input);
    if (!saved) {
      toast.error(t('emergencyAccessContactInvalid'));
      return;
    }
    refreshEmergencyAccess();
    toast.success(t('emergencyAccessContactSaved'));
  };

  const handleEmergencyContactDelete = (contactId: string) => {
    if (!window.confirm(t('emergencyAccessDeleteContactConfirm'))) return;
    const deleted = EmergencyAccessService.deleteContact(contactId);
    if (!deleted) {
      toast.error(t('emergencyAccessContactDeleteFailed'));
      return;
    }
    refreshEmergencyAccess();
    toast.success(t('emergencyAccessContactDeleted'));
  };

  const handleEmergencyRequestCreate = (contactId: string) => {
    const reason = window.prompt(t('emergencyAccessRequestReasonPrompt')) || '';
    const created = EmergencyAccessService.requestAccess({
      contactId,
      scope: 'vault',
      requesterNote: reason,
    });
    if (!created) {
      toast.error(t('emergencyAccessRequestCreateFailed'));
      return;
    }
    refreshEmergencyAccess();
    toast.success(t('emergencyAccessRequestCreated'));
  };

  const handleEmergencyApprove = (requestId: string) => {
    const note = window.prompt(t('emergencyAccessOwnerNotePrompt')) || '';
    const approved = EmergencyAccessService.approveRequest(requestId, note);
    if (!approved) {
      toast.error(t('emergencyAccessApproveFailed'));
      return;
    }
    refreshEmergencyAccess();
    toast.success(t('emergencyAccessApproved'));
  };

  const handleEmergencyReject = (requestId: string) => {
    const note = window.prompt(t('emergencyAccessRejectReasonPrompt')) || '';
    const rejected = EmergencyAccessService.rejectRequest(requestId, note);
    if (!rejected) {
      toast.error(t('emergencyAccessRejectFailed'));
      return;
    }
    refreshEmergencyAccess();
    toast.success(t('emergencyAccessRejected'));
  };

  const handleEmergencyRevoke = (requestId: string) => {
    if (!window.confirm(t('emergencyAccessRevokeConfirm'))) return;
    const revoked = EmergencyAccessService.revokeGrant(requestId);
    if (!revoked) {
      toast.error(t('emergencyAccessRevokeFailed'));
      return;
    }
    refreshEmergencyAccess();
    toast.success(t('emergencyAccessRevoked'));
  };

  const switchToTwoFactorVault = () => {
    const profile = TotpVaultPolicy.ensureTwoFactorVaultProfile();
    VaultManager.setActiveVaultId(profile.id);
    toast.success(t('totpSwitchedTo2faVault', { vault: profile.name }));
    window.location.reload();
  };

  if (!isOpen) return null;

  const activePasskeyAgeDays = passkeyBindingDetails?.meta?.createdAt
    ? Math.floor(
        (Date.now() - Date.parse(passkeyBindingDetails.meta.createdAt)) / (1000 * 60 * 60 * 24)
      )
    : null;

  const updatePasskeyPolicy = async (next: Partial<typeof passkeyPolicy>) => {
    await PasskeyBindingService.initialize();
    const updated = PasskeyBindingService.updatePolicy(next);
    setPasskeyPolicy(updated);
    setPasskeyEventLog(
      PasskeyBindingService.getEventLog(
        activeProfile?.id || null,
        activeProfile?.dbName || 'aegis_opfs_vault'
      )
    );
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

      <SharedSpacesModal
        isOpen={showSharedSpacesModal}
        initialSpaceId={focusedSharedSpaceId}
        focusContext={focusedSharedSpaceContext}
        onClose={() => {
          setShowSharedSpacesModal(false);
          setFocusedSharedSpaceId(null);
          setFocusedSharedSpaceContext(null);
          setSharingOverviewVersion((current) => current + 1);
        }}
      />
      <PasskeySiteInventoryModal
        isOpen={showPasskeySiteModal}
        entries={passkeyInventorySummary.siteEntries}
        remediationResult={passkeyRemediationResult}
        onClose={() => {
          setShowPasskeySiteModal(false);
          setPasskeyRemediationResult(null);
        }}
        onOpenEntry={(entry) => {
          setShowPasskeySiteModal(false);
          setPasskeyRemediationResult(null);
          openPasskeySiteEntry(entry);
        }}
        onBulkFixRp={(selectedIds) => requestPasskeyBulkFix('missing_rp_id', selectedIds)}
        onBulkFixCredential={(selectedIds) =>
          requestPasskeyBulkFix('missing_credential_id', selectedIds)
        }
        onBulkConvertFuture={(selectedIds) => requestPasskeyBulkFix('future_mode', selectedIds)}
        onOpenPolicy={() => {
          setShowPasskeySiteModal(false);
          scrollToPasskeySection('policy');
        }}
        onOpenAudit={() => {
          setShowPasskeySiteModal(false);
          scrollToPasskeySection('revocations');
        }}
      />

      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 lg:p-5 animate-in fade-in duration-300">
        <div
          className="absolute inset-0 bg-[var(--color-deep-navy)]/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <GlowCard className="settings-drawer-surface relative z-10 flex h-[min(94vh,960px)] w-full max-w-[1180px] flex-col overflow-hidden rounded-[2rem] border border-white/30 p-0 shadow-2xl animate-in zoom-in-95 duration-300 slide-in-from-bottom-10">
          <div className="border-b border-white/10 px-5 py-5 lg:px-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0" onClick={handleLogoClick}>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-sage-green)] to-[#6b8268] text-white shadow-lg cursor-pointer">
                  <Settings className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-2xl lg:text-[2rem] font-bold tracking-tight text-[var(--color-deep-navy)]">
                    {t('settingsTitle')}
                  </h2>
                  <p className="mt-1 text-sm opacity-70 max-w-2xl">{t('settingsDesc')}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-black/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="settings-card-surface-muted rounded-2xl border px-4 py-3">
                <div className="settings-section-kicker">
                  {t('settingsOverviewVaultRecords', 'Vault records')}
                </div>
                <div className="mt-1 text-2xl font-black text-[var(--color-deep-navy)] dark:text-white">
                  {passwords.length}
                </div>
                <div className="settings-section-copy mt-1">{t('settingsDesc')}</div>
              </div>
              <div className="settings-card-surface-muted rounded-2xl border px-4 py-3">
                <div className="settings-section-kicker">
                  {t('settingsOverviewSecurityScore', 'Security score')}
                </div>
                <div className="mt-1 text-2xl font-black text-[var(--color-deep-navy)] dark:text-white">
                  {securityCenterSummary.score}
                </div>
                <div className="settings-section-copy mt-1">
                  {t(
                    `securityCenterRisk${securityCenterSummary.riskLevel === 'low' ? 'Low' : securityCenterSummary.riskLevel === 'medium' ? 'Medium' : 'High'}`
                  )}
                </div>
              </div>
              <div className="settings-card-surface-muted rounded-2xl border px-4 py-3">
                <div className="settings-section-kicker">
                  {t('settingsOverviewReleaseTrust', 'Release trust')}
                </div>
                <div className="mt-1 text-2xl font-black text-[var(--color-deep-navy)] dark:text-white">
                  {releaseTrustSummary.score}
                </div>
                <div className="settings-section-copy mt-1">
                  {releaseTrustSummary.openGapCount === 0
                    ? t('settingsOverviewReleaseTrustHealthy', 'Audit-ready baseline is clean.')
                    : t('settingsOverviewReleaseTrustGaps', {
                        count: releaseTrustSummary.openGapCount,
                        defaultValue: '{{count}} open gaps are being tracked.',
                      })}
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 lg:px-7 custom-scrollbar">
            <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-6 sticky top-0 z-[100] bg-[var(--color-deep-navy)]/5 backdrop-blur-3xl p-3 md:p-4 rounded-[2rem] border border-black/5 dark:border-white/10 shadow-lg mx-auto max-w-[1040px] mt-2 styled-tab-bar">
              {[
                { id: 'general', icon: ShieldAlert, label: t('tabGeneral', 'General & Overview') },
                {
                  id: 'security',
                  icon: ShieldCheck,
                  label: t('tabSecurity', 'Security & Passkey'),
                },
                { id: 'sharing', icon: Heart, label: t('tabSharing', 'Sharing & Emergency') },
                { id: 'sync', icon: Wand2, label: t('tabSync', 'Import/Export & Sync') },
                { id: 'advanced', icon: Settings, label: t('tabAdvanced', 'Advanced & Reset') },
                { id: 'donation', icon: Heart, label: t('tabDonation', 'Support & Donate') },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 md:gap-2.5 px-3 md:px-5 py-2 md:py-3 rounded-[1rem] md:rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap outline-none relative overflow-hidden flex-shrink-0 ${
                    activeTab === tab.id
                      ? tab.id === 'donation'
                        ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] scale-[1.02] border-none'
                        : 'bg-gradient-to-br from-[var(--color-sage-green)] to-[#5a7058] text-white shadow-md scale-[1.02]'
                      : tab.id === 'donation'
                        ? 'bg-indigo-100/50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 border border-indigo-200/50 hover:border-indigo-300 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-700/30 dark:hover:bg-indigo-900/40'
                        : 'bg-transparent text-[var(--color-deep-navy)] hover:bg-black/10 dark:text-white/80 dark:hover:bg-white/10 opacity-70 hover:opacity-100'
                  }`}
                >
                  {tab.id === 'donation' && activeTab !== 'donation' && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
                  )}
                  <tab.icon
                    className={`w-5 h-5 flex-shrink-0 ${tab.id === 'donation' && activeTab === tab.id ? 'animate-pulse' : ''}`}
                  />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="mx-auto flex max-w-[1040px] flex-col pb-10 w-full relative z-10 animate-in fade-in duration-500">
              {activeTab === 'general' && (
                <div className="flex flex-col space-y-5 animate-in fade-in duration-500">
                  {/* Advanced Generator Section */}
                  <PasswordGenerator isOpen={isOpen} />

                  {/* Watchtower Issues */}
                  <div className="settings-danger-panel border rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-red-500" />
                        <h3 className="text-lg font-semibold tracking-tight text-red-700">
                          {t('watchtowerIssuesTitle')}
                        </h3>
                      </div>
                      <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        {t('issuesFoundLabel', { count: watchtower.weak + watchtower.pwned })}
                      </span>
                    </div>
                    <p className="watchtower-issues-desc text-xs opacity-80 mb-4 text-red-700">
                      {t('watchtowerIssuesDesc')}
                    </p>
                    <button
                      onClick={() => setShowWeakPasswordsPopup(true)}
                      disabled={watchtower.weak + watchtower.pwned === 0}
                      className="w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                    >
                      {t('viewIssuesBtn')}
                    </button>
                  </div>

                  <SecurityCenterPanel
                    summary={securityCenterSummary}
                    onReviewPasswords={() => setShowWeakPasswordsPopup(true)}
                    onReviewPasskeys={() => setShowPasskeySiteModal(true)}
                    onReviewSharing={() => {
                      setFocusedSharedSpaceId(null);
                      setFocusedSharedSpaceContext(null);
                      setSelectedSharingIssueKey(null);
                      setShowSharedSpacesModal(true);
                    }}
                    onReviewDevices={() => {
                      desktopPairingsRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                      });
                    }}
                    onReviewLocalRisk={() => {
                      qrAuditPanelRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                      });
                    }}
                    onOpenTriageItem={openSecurityCenterTriageItem}
                    onMarkReviewed={markSecurityCenterTriageReviewed}
                    onReopenReviewed={reopenSecurityCenterTriageItem}
                    historyItems={securityCenterHistory}
                  />

                  <ReleaseTrustPanel
                    summary={releaseTrustSummary}
                    checklistStatus={releaseTrustChecklist}
                    autoChecklistStatus={releaseTrustSummary.autoChecklistStatus}
                    packageApprovals={releaseTrustApprovals}
                    onToggleChecklistItem={toggleReleaseTrustChecklist}
                    onTogglePackageApproval={toggleReleaseTrustApproval}
                    historyItems={releaseTrustHistory}
                  />
                </div>
              )}

              {activeTab === 'sharing' && (
                <div className="flex flex-col space-y-5 animate-in fade-in duration-500">
                  <SharingOverviewPanel
                    report={sharingOverview}
                    onManageSpaces={() => {
                      setFocusedSharedSpaceId(null);
                      setFocusedSharedSpaceContext(null);
                      setSelectedSharingIssueKey(null);
                      setShowSharedSpacesModal(true);
                    }}
                    onOpenIssueItem={(issue) => {
                      setSelectedSharingIssueKey(`${issue.type}-${issue.itemId}`);
                      setSharingAuditFocus({
                        itemId: issue.itemId,
                        type: issue.type,
                        title: issue.title,
                      });
                      openSharingIssueItem(issue.itemId, {
                        focusContext: 'sharing_issue',
                        focusLabel: issue.title,
                      });
                    }}
                    onResolveIssue={resolveSharingIssue}
                    onOpenSpace={(spaceId) => openSharingSpace(spaceId, 'issue')}
                    activeIssueKey={selectedSharingIssueKey}
                    activeSpaceId={focusedSharedSpaceId}
                  />

                  <SharingAuditPanel
                    events={filteredSharingAuditEvents}
                    activeFilter={sharingAuditFilter}
                    onFilterChange={setSharingAuditFilter}
                    highlightedEventIds={highlightedSharingAuditIds}
                    focusLabel={sharingAuditFocus?.title || null}
                    onOpenEventTarget={openSharingAuditTarget}
                    onFocusEventTarget={focusSharingAuditTarget}
                  />

                  <EmergencyAccessPanel
                    policy={emergencyAccessPolicy}
                    contacts={emergencyAccessContacts}
                    requests={emergencyAccessRequests}
                    auditEvents={emergencyAccessAudit}
                    onUpdatePolicy={handleEmergencyPolicyUpdate}
                    onSaveContact={handleEmergencyContactSave}
                    onDeleteContact={handleEmergencyContactDelete}
                    onRequestAccess={handleEmergencyRequestCreate}
                    onApproveRequest={handleEmergencyApprove}
                    onRejectRequest={handleEmergencyRequestCreate}
                    onRevokeGrant={handleEmergencyRevoke}
                  />
                </div>
              )}

              {activeTab === 'security' && (
                <div className="flex flex-col space-y-5 animate-in fade-in duration-500">
                  {/* Security & Sessions */}
                  <div className="settings-panel rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                      <ShieldCheck className="w-5 h-5 text-[var(--color-sage-green)]" />
                      <h3 className="text-lg font-semibold tracking-tight">
                        {t('securitySessionTitle')}
                      </h3>
                    </div>

                    <div className="settings-subpanel p-5 rounded-2xl border flex flex-col gap-4 shadow-inner mb-4">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <h4 className="font-semibold text-sm mb-1 text-[var(--color-deep-navy)]">
                            {t('securityModeTitle')}
                          </h4>
                          <p className="text-xs opacity-70 leading-relaxed max-w-md">
                            {t('securityModeDesc')}
                          </p>
                        </div>
                        <span className="rounded-full bg-[var(--color-sage-green)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-sage-green)]">
                          {t(
                            `securityMode${securityModeProfile.charAt(0).toUpperCase()}${securityModeProfile.slice(1)}`
                          )}
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
                                  ? 'border-[var(--color-sage-green)] bg-[var(--color-sage-green)]/10 ring-2 ring-[var(--color-sage-green)]/20'
                                  : 'settings-card-surface hover:bg-white dark:hover:bg-white/10'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="font-semibold text-sm text-[var(--color-deep-navy)]">
                                  {t(
                                    `securityMode${definition.profile.charAt(0).toUpperCase()}${definition.profile.slice(1)}`
                                  )}
                                </div>
                                {isActive && (
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-sage-green)]">
                                    {t('securityModeActive')}
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
                        <h4 className="font-semibold text-sm mb-1 text-[var(--color-deep-navy)]">
                          {t('autoLockTimerTitle')}
                        </h4>
                        <p className="text-xs opacity-70 leading-relaxed max-w-md">
                          {t('autoLockTimerDesc')}
                        </p>
                      </div>
                      <select
                        value={autoLockTime}
                        onChange={(e) => setAutoLockTime(Number(e.target.value))}
                        className="rounded-xl border qr-scanner-input px-4 py-2.5 text-sm font-semibold text-[var(--color-deep-navy)] shadow-sm outline-none focus:ring-2 focus:ring-[var(--color-sage-green)]/40 min-w-[140px]"
                      >
                        <option value={1}>{t('lockTime1')}</option>
                        <option value={2}>{t('lockTime2')}</option>
                        <option
                          value={5}
                          disabled={currentSecurityModeDefinition.maxAutoLockMinutes < 5}
                        >
                          {t('lockTime5')}
                        </option>
                        <option
                          value={30}
                          disabled={currentSecurityModeDefinition.maxAutoLockMinutes < 30}
                        >
                          {t('lockTime30')}
                        </option>
                        <option value={0} disabled>
                          {t('lockTime0')}
                        </option>
                      </select>
                    </div>

                    <div className="settings-subpanel p-5 rounded-2xl border border-white flex flex-col md:flex-row justify-between md:items-center gap-4 shadow-inner mb-4">
                      <div>
                        <h4 className="font-semibold text-sm mb-1 text-[var(--color-deep-navy)]">
                          {t('clipboardAutoClearTitle', 'Clipboard auto-clear')}
                        </h4>
                        <p className="text-xs opacity-70 leading-relaxed max-w-md">
                          {t(
                            'clipboardAutoClearDesc',
                            'Copied secrets are removed from clipboard automatically.'
                          )}
                        </p>
                      </div>
                      <select
                        value={timeoutSeconds}
                        onChange={(e) => setClipboardClearSeconds(Number(e.target.value))}
                        className="rounded-xl border qr-scanner-input px-4 py-2.5 text-sm font-semibold text-[var(--color-deep-navy)] shadow-sm outline-none focus:ring-2 focus:ring-[var(--color-sage-green)]/40 min-w-[140px]"
                      >
                        <option value={10}>{t('clipboardAutoClear10', '10 sec')}</option>
                        <option value={20}>{t('clipboardAutoClear20', '20 sec')}</option>
                        <option value={30}>{t('clipboardAutoClear30', '30 sec')}</option>
                        <option value={60}>{t('clipboardAutoClear60', '1 min')}</option>
                        <option value={120}>{t('clipboardAutoClear120', '2 min')}</option>
                        <option value={300}>{t('clipboardAutoClear300', '5 min')}</option>
                      </select>
                    </div>

                    <div
                      ref={desktopPairingsRef}
                      className="settings-subpanel p-5 rounded-2xl border shadow-inner mb-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-semibold text-sm mb-1 text-[var(--color-deep-navy)]">
                            {t('hibpSettingsTitle')}
                          </h4>
                          <p className="text-xs opacity-70 leading-relaxed max-w-md">
                            {t('hibpSettingsDesc')}
                          </p>
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
                      <h4 className="font-semibold text-sm mb-1 text-[var(--color-deep-navy)]">
                        {t('totpVaultModeTitle')}
                      </h4>
                      <p className="text-xs opacity-70 leading-relaxed mb-3">
                        {t('totpVaultModeDesc')}
                      </p>

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

                      {totpMode === 'separate_2fa_vault' &&
                        passwords.filter((p) => Boolean(p.totpSecret)).length > 0 && (
                          <div className="rounded-xl border border-red-300/40 bg-red-50/60 px-3 py-2 text-[11px] text-red-700 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <span>
                              {t('totpMigrationWarning', {
                                count: passwords.filter((p) => Boolean(p.totpSecret)).length,
                              })}
                            </span>
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
                          <p className="text-xs opacity-70 leading-relaxed max-w-md">
                            {t('passkeyRecoveryDesc')}
                          </p>
                        </div>
                        <span
                          className={`passkey-status-chip text-[10px] font-bold px-2 py-1 rounded-full ${hasPasskeyBinding ? 'passkey-status-chip-bound' : 'passkey-status-chip-unbound'}`}
                        >
                          {hasPasskeyBinding ? t('passkeyBound') : t('passkeyNotBound')}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <button
                          onClick={() =>
                            requireAuth(t('passkeyRecoveryExportBtn'), handlePasskeyRecoveryExport)
                          }
                          disabled={!hasPasskeyBinding}
                          className="settings-action-btn settings-action-btn-primary px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                        >
                          {t('passkeyRecoveryExportBtn')}
                        </button>

                        <label className="settings-action-btn settings-action-btn-secondary cursor-pointer px-3 py-2 rounded-xl text-xs font-semibold text-center transition-colors">
                          {t('passkeyRecoveryImportBtn')}
                          <input
                            type="file"
                            accept=".aes"
                            className="hidden"
                            onChange={handlePasskeyRecoveryImport}
                          />
                        </label>

                        <button
                          onClick={() =>
                            requireAuth(t('passkeyRevokeButton'), handlePasskeyRevokeForProfile)
                          }
                          disabled={!hasPasskeyBinding}
                          className="settings-action-btn settings-action-btn-danger px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                        >
                          {t('passkeyRevokeButton')}
                        </button>
                      </div>

                      <div className="settings-card-surface mt-4 rounded-2xl p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="font-semibold text-sm text-[var(--color-deep-navy)]">
                            {t('passkeyInventoryTitle', 'Passkey inventory summary')}
                          </div>
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${
                              passkeyInventorySummary.status === 'healthy'
                                ? 'bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)]'
                                : 'bg-amber-500/10 text-amber-700'
                            }`}
                          >
                            {passkeyInventorySummary.status === 'healthy'
                              ? t('passkeyInventoryHealthy', 'Healthy')
                              : t('passkeyInventoryAttention', 'Needs attention')}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[11px]">
                          <div className="settings-card-item rounded-xl p-3">
                            <div className="opacity-60">
                              {t('passkeyInventoryBindings', 'Bindings')}
                            </div>
                            <div className="mt-1 text-base font-semibold text-[var(--color-deep-navy)]">
                              {passkeyInventorySummary.totalBindings}
                            </div>
                          </div>
                          <div className="settings-card-item rounded-xl p-3">
                            <div className="opacity-60">
                              {t('passkeyInventoryRecovery', 'Recovery exported')}
                            </div>
                            <div className="mt-1 text-base font-semibold text-[var(--color-deep-navy)]">
                              {passkeyInventorySummary.recoveryExportedCount}
                            </div>
                          </div>
                          <div className="settings-card-item rounded-xl p-3">
                            <div className="opacity-60">
                              {t('passkeyInventoryRotation', 'Rotation required')}
                            </div>
                            <div className="mt-1 text-base font-semibold text-[var(--color-deep-navy)]">
                              {passkeyInventorySummary.rotationRequiredCount}
                            </div>
                          </div>
                          <div className="settings-card-item rounded-xl p-3">
                            <div className="opacity-60">
                              {t('passkeyInventoryRevoked', 'Revoked')}
                            </div>
                            <div className="mt-1 text-base font-semibold text-[var(--color-deep-navy)]">
                              {passkeyInventorySummary.revokedCount}
                            </div>
                          </div>
                          <div className="settings-card-item rounded-xl p-3">
                            <div className="opacity-60">
                              {t('passkeyInventoryActiveDevices', 'Active devices')}
                            </div>
                            <div className="mt-1 text-base font-semibold text-[var(--color-deep-navy)]">
                              {passkeyInventorySummary.activeDeviceCount}
                            </div>
                          </div>
                          <div className="settings-card-item rounded-xl p-3">
                            <div className="opacity-60">
                              {t('passkeyInventoryRecentEvents', 'Recent events')}
                            </div>
                            <div className="mt-1 text-base font-semibold text-[var(--color-deep-navy)]">
                              {passkeyInventorySummary.recentEventCount}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                          <div className="settings-card-item rounded-xl p-3">
                            <div className="opacity-60">
                              {t('passkeyInventoryModeVaultUnlock', 'Vault unlock')}
                            </div>
                            <div className="mt-1 text-base font-semibold text-[var(--color-deep-navy)]">
                              {passkeyInventorySummary.modeCounts.vault_unlock}
                            </div>
                          </div>
                          <div className="settings-card-item rounded-xl p-3">
                            <div className="opacity-60">
                              {t('passkeyInventoryModeSiteMvp', 'Site passkey MVP')}
                            </div>
                            <div className="mt-1 text-base font-semibold text-[var(--color-deep-navy)]">
                              {passkeyInventorySummary.modeCounts.site_passkey_mvp}
                            </div>
                          </div>
                          <div className="settings-card-item rounded-xl p-3">
                            <div className="opacity-60">
                              {t('passkeyInventoryModeFutureRp', 'Future RP')}
                            </div>
                            <div className="mt-1 text-base font-semibold text-[var(--color-deep-navy)]">
                              {passkeyInventorySummary.modeCounts.site_passkey_future_rp}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                          <div className="settings-card-item rounded-xl p-3">
                            <div className="opacity-60">
                              {t('passkeyInventorySiteEntries', 'Site passkey records')}
                            </div>
                            <div className="mt-1 text-base font-semibold text-[var(--color-deep-navy)]">
                              {passkeyInventorySummary.sitePasskeyCount}
                            </div>
                          </div>
                          <div className="settings-card-item rounded-xl p-3">
                            <div className="opacity-60">
                              {t('passkeyInventorySiteAttention', 'Site records needing review')}
                            </div>
                            <div className="mt-1 text-base font-semibold text-[var(--color-deep-navy)]">
                              {passkeyInventorySummary.sitePasskeyAttentionCount}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setShowPasskeySiteModal(true)}
                            className="rounded-2xl border border-[var(--color-sage-green)]/25 bg-[var(--color-sage-green)]/10 px-4 py-3 text-sm font-semibold text-[var(--color-sage-green)] transition-colors hover:bg-[var(--color-sage-green)]/15 dark:border-[var(--color-sage-green)]/20 dark:text-emerald-100"
                          >
                            {t('passkeyInventoryOpenSiteModal', 'Open site passkey list')}
                          </button>
                        </div>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setSitePasskeyFilter('missing_rp_id')}
                            className="settings-card-item rounded-xl p-3 text-left transition hover:border-amber-500/30 hover:bg-amber-500/5"
                          >
                            <div className="opacity-60">
                              {t('passkeyInventoryRiskMissingRp', 'Missing RP ID')}
                            </div>
                            <div className="mt-1 text-base font-semibold text-[var(--color-deep-navy)]">
                              {passkeyInventorySummary.riskCounts.missing_rp_id}
                            </div>
                            <div className="mt-2">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  requestPasskeyBulkFix('missing_rp_id');
                                }}
                                className="rounded-full bg-[var(--color-deep-navy)]/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/70 disabled:opacity-40"
                                disabled={passkeyInventorySummary.riskCounts.missing_rp_id === 0}
                              >
                                {t('passkeyInventoryBulkFixRp', 'Auto-fill RP ID')}
                              </button>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSitePasskeyFilter('missing_credential_id')}
                            className="settings-card-item rounded-xl p-3 text-left transition hover:border-amber-500/30 hover:bg-amber-500/5"
                          >
                            <div className="opacity-60">
                              {t('passkeyInventoryRiskMissingCredential', 'Missing credential ID')}
                            </div>
                            <div className="mt-1 text-base font-semibold text-[var(--color-deep-navy)]">
                              {passkeyInventorySummary.riskCounts.missing_credential_id}
                            </div>
                            <div className="mt-2">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  requestPasskeyBulkFix('missing_credential_id');
                                }}
                                className="rounded-full bg-[var(--color-deep-navy)]/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/70 disabled:opacity-40"
                                disabled={
                                  passkeyInventorySummary.riskCounts.missing_credential_id === 0
                                }
                              >
                                {t('passkeyInventoryBulkFixCredential', 'Auto-fill credential ID')}
                              </button>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSitePasskeyFilter('future')}
                            className="settings-card-item rounded-xl p-3 text-left transition hover:border-amber-500/30 hover:bg-amber-500/5"
                          >
                            <div className="opacity-60">
                              {t('passkeyInventoryRiskFutureMode', 'Future mode')}
                            </div>
                            <div className="mt-1 text-base font-semibold text-[var(--color-deep-navy)]">
                              {passkeyInventorySummary.riskCounts.future_mode}
                            </div>
                          </button>
                        </div>
                        {pendingBulkFix && (
                          <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-[11px] text-[var(--color-deep-navy)] dark:text-white">
                            <div className="font-semibold">
                              {pendingBulkFix.kind === 'missing_rp_id'
                                ? t(
                                    'passkeyInventoryBulkFixRpConfirmTitle',
                                    'Confirm RP ID auto-fill'
                                  )
                                : pendingBulkFix.kind === 'missing_credential_id'
                                  ? t(
                                      'passkeyInventoryBulkFixCredentialConfirmTitle',
                                      'Confirm credential ID auto-fill'
                                    )
                                  : t(
                                      'passkeyInventoryBulkConvertFutureConfirmTitle',
                                      'Confirm future-mode conversion'
                                    )}
                            </div>
                            <div className="mt-1 opacity-75">
                              {pendingBulkFix.kind === 'missing_rp_id'
                                ? t('passkeyInventoryBulkFixRpConfirmBody', {
                                    count: pendingBulkFix.count,
                                    defaultValue:
                                      '{{count}} record will be updated using website/RP inference.',
                                  })
                                : pendingBulkFix.kind === 'missing_credential_id'
                                  ? t('passkeyInventoryBulkFixCredentialConfirmBody', {
                                      count: pendingBulkFix.count,
                                      defaultValue:
                                        '{{count}} record will be updated using the current stored credential value.',
                                    })
                                  : t('passkeyInventoryBulkConvertFutureConfirmBody', {
                                      count: pendingBulkFix.count,
                                      defaultValue:
                                        '{{count}} future-mode record will be converted to site_passkey_mvp.',
                                    })}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  void handlePasskeyBulkFix(
                                    pendingBulkFix.kind,
                                    pendingBulkFix.selectedIds
                                  )
                                }
                                className="rounded-full bg-amber-500/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-800 dark:text-amber-200"
                              >
                                {t('passkeyInventoryBulkFixConfirm', 'Apply update')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingBulkFix(null)}
                                className="rounded-full bg-[var(--color-deep-navy)]/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/70 dark:bg-white/10 dark:text-white/70"
                              >
                                {t('cancel', 'Cancel')}
                              </button>
                            </div>
                          </div>
                        )}
                        {passkeyInventorySummary.actionKeys.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {passkeyInventorySummary.actionKeys.map((key) => (
                              <button
                                key={key}
                                onClick={() => handlePasskeyInventoryAction(key)}
                                className="rounded-full bg-[var(--color-deep-navy)]/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/70"
                              >
                                {t(key)}
                              </button>
                            ))}
                          </div>
                        )}
                        {passkeyInventorySummary.siteEntries.length > 0 && (
                          <div className="mt-4 rounded-2xl border border-black/5 bg-black/[0.02] px-3 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/60 dark:text-white/60">
                                {t('passkeyInventorySiteListTitle', 'Tracked site passkeys')}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {[
                                  { key: 'all', label: t('passkeyInventoryFilterAll', 'All') },
                                  {
                                    key: 'attention',
                                    label: t('passkeyInventoryFilterAttention', 'Needs review'),
                                  },
                                  {
                                    key: 'healthy',
                                    label: t('passkeyInventoryFilterHealthy', 'Healthy'),
                                  },
                                  {
                                    key: 'future',
                                    label: t('passkeyInventoryFilterFuture', 'Future RP'),
                                  },
                                  {
                                    key: 'missing_rp_id',
                                    label: t('passkeyInventoryMissingRpIdShort', 'Missing RP'),
                                  },
                                  {
                                    key: 'missing_credential_id',
                                    label: t(
                                      'passkeyInventoryMissingCredentialShort',
                                      'Missing credential'
                                    ),
                                  },
                                ].map((filter) => (
                                  <button
                                    key={filter.key}
                                    type="button"
                                    onClick={() =>
                                      setSitePasskeyFilter(filter.key as typeof sitePasskeyFilter)
                                    }
                                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition ${
                                      sitePasskeyFilter === filter.key
                                        ? 'bg-[var(--color-sage-green)]/15 text-[var(--color-sage-green)]'
                                        : 'bg-[var(--color-deep-navy)]/5 text-[var(--color-deep-navy)]/70 dark:bg-white/10 dark:text-white/70'
                                    }`}
                                  >
                                    {filter.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-3 text-[11px] opacity-70">
                              <div>
                                {t('passkeyInventoryFilterCount', {
                                  shown: previewSitePasskeyEntries.length,
                                  total: passkeyInventorySummary.siteEntries.length,
                                  defaultValue: '{{shown}} / {{total}} record shown',
                                })}
                              </div>
                              {filteredSitePasskeyEntries.some(
                                (item) => item.riskFlags.length > 0
                              ) ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const firstRisky = filteredSitePasskeyEntries.find(
                                      (item) => item.riskFlags.length > 0
                                    );
                                    if (firstRisky) openPasskeySiteEntry(firstRisky);
                                  }}
                                  className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300"
                                >
                                  {t('passkeyInventoryReviewNext', 'Review next risky entry')}
                                </button>
                              ) : null}
                            </div>
                            {passkeyInventorySummary.siteEntries.length >
                            passkeyInventorySummary.previewSiteEntries.length ? (
                              <div className="mt-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/55 dark:text-white/55">
                                {t('passkeyInventoryPreviewLimit', {
                                  shown: passkeyInventorySummary.previewSiteEntries.length,
                                  total: passkeyInventorySummary.siteEntries.length,
                                  defaultValue:
                                    'Overview shows top {{shown}} of {{total}} records. Open full list for all items.',
                                })}
                              </div>
                            ) : null}
                            <div className="mt-3 space-y-2">
                              {previewSitePasskeyEntries.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => openPasskeySiteEntry(item)}
                                  className="flex w-full items-start justify-between gap-3 rounded-xl border border-black/5 bg-white/70 px-3 py-2 text-left transition hover:border-[var(--color-sage-green)]/30 hover:bg-[var(--color-sage-green)]/8 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-[var(--color-sage-green)]/10"
                                >
                                  <div className="min-w-0">
                                    <div className="font-semibold text-[var(--color-deep-navy)] dark:text-white">
                                      {item.title}
                                    </div>
                                    <div className="mt-0.5 text-[11px] opacity-70">
                                      {item.rpId ||
                                        t('passkeyInventoryMissingRpId', 'Missing RP ID')}
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                                    {item.riskFlags.length === 0 ? (
                                      <span className="rounded-full bg-[var(--color-sage-green)]/12 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-sage-green)]">
                                        {t('passkeyInventoryHealthy', 'Healthy')}
                                      </span>
                                    ) : (
                                      item.riskFlags.map((flag) => (
                                        <span
                                          key={`${item.id}-${flag}`}
                                          className="rounded-full bg-amber-500/12 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300"
                                        >
                                          {flag === 'missing_rp_id'
                                            ? t('passkeyInventoryMissingRpIdShort', 'Missing RP')
                                            : flag === 'missing_credential_id'
                                              ? t(
                                                  'passkeyInventoryMissingCredentialShort',
                                                  'Missing credential'
                                                )
                                              : t('passkeyInventoryFutureModeShort', 'Future mode')}
                                        </span>
                                      ))
                                    )}
                                  </div>
                                </button>
                              ))}
                              {previewSitePasskeyEntries.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-black/10 px-3 py-4 text-center text-[11px] opacity-65 dark:border-white/10">
                                  {t(
                                    'passkeyInventoryFilterEmpty',
                                    'No site passkey record matches this filter.'
                                  )}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )}
                      </div>

                      {passkeyBindingDetails && (
                        <div
                          ref={passkeyActiveDeviceRef}
                          className="settings-card-surface mt-4 rounded-2xl p-4"
                        >
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="font-semibold text-sm text-[var(--color-deep-navy)]">
                              {t('passkeyActiveDeviceTitle', 'Active passkey on this device')}
                            </div>
                            {activePasskeyAgeDays !== null && activePasskeyAgeDays >= 90 && (
                              <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700">
                                {t(
                                  'passkeyRotationRecommended',
                                  'Security recommendation: refresh your biometric lock (older than 90 days).'
                                )}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] opacity-75">
                            <div>
                              {t('passkeyDeviceLabel', 'Device')}:{' '}
                              {passkeyBindingDetails.meta.deviceLabel ||
                                t('passkeyUnknownDevice', 'Unknown device')}
                            </div>
                            <div>
                              {t('passkeyDeviceFingerprint', 'Device fingerprint')}:{' '}
                              <span className="font-mono">
                                {passkeyBindingDetails.meta.deviceFingerprint || '-'}
                              </span>
                            </div>
                            <div>
                              {t('passkeyCreatedAt', 'Created')}:{' '}
                              {passkeyBindingDetails.meta.createdAt
                                ? new Date(passkeyBindingDetails.meta.createdAt).toLocaleString()
                                : '-'}
                            </div>
                            <div>
                              {t('passkeyLastUsedAt', 'Last used')}:{' '}
                              {passkeyBindingDetails.meta.lastUsedAt
                                ? new Date(passkeyBindingDetails.meta.lastUsedAt).toLocaleString()
                                : '-'}
                            </div>
                            <div>
                              {t('passkeyRecoveryLastExportedAt', 'Recovery export')}:{' '}
                              {passkeyBindingDetails.meta.recoveryLastExportedAt
                                ? new Date(
                                    passkeyBindingDetails.meta.recoveryLastExportedAt
                                  ).toLocaleString()
                                : t('passkeyRecoveryNeverExported', 'Not exported yet')}
                            </div>
                            <div>
                              {t('passkeyRotatedFrom', 'Previous credential')}:{' '}
                              <span className="font-mono break-all">
                                {passkeyBindingDetails.meta.rotatedFromCredentialId || '-'}
                              </span>
                            </div>
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
                              <div
                                key={binding.bindingKey}
                                className="settings-card-item rounded-xl p-3 text-[11px]"
                              >
                                <div className="font-semibold text-[var(--color-deep-navy)]">
                                  {binding.meta.deviceLabel ||
                                    t('passkeyUnknownDevice', 'Unknown device')}
                                </div>
                                <div className="opacity-70 font-mono break-all">
                                  {binding.meta.deviceFingerprint || '-'}
                                </div>
                                <div className="opacity-60 mt-1">
                                  {binding.meta.profileId || 'default'} /{' '}
                                  {binding.meta.dbName || 'aegis_opfs_vault'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div
                        ref={passkeyPolicyRef}
                        className="settings-card-surface-muted mt-4 rounded-2xl p-4"
                      >
                        <div className="font-semibold text-sm text-[var(--color-deep-navy)] mb-3">
                          {t('passkeyPolicyTitle', 'Passkey security policy')}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                          <label className="settings-card-item rounded-xl p-3 flex items-center justify-between gap-3">
                            <span>
                              {t('passkeyPolicyBlockRevoked', 'Block revoked credentials')}
                            </span>
                            <input
                              type="checkbox"
                              checked={passkeyPolicy.blockRevokedCredentials}
                              onChange={(event) =>
                                updatePasskeyPolicy({
                                  blockRevokedCredentials: event.target.checked,
                                })
                              }
                            />
                          </label>
                          <label className="settings-card-item rounded-xl p-3 flex items-center justify-between gap-3">
                            <span>
                              {t(
                                'passkeyPolicyRequireRecoveryExport',
                                'Require recovery export before rotation'
                              )}
                            </span>
                            <input
                              type="checkbox"
                              checked={passkeyPolicy.requireRecoveryExportBeforeRotation}
                              onChange={(event) =>
                                updatePasskeyPolicy({
                                  requireRecoveryExportBeforeRotation: event.target.checked,
                                })
                              }
                            />
                          </label>
                          <label className="settings-card-item rounded-xl p-3 md:col-span-2 flex items-center justify-between gap-3">
                            <span>{t('passkeyPolicyMaxAge', 'Rotation threshold (days)')}</span>
                            <input
                              type="number"
                              min={30}
                              max={365}
                              value={passkeyPolicy.maxBindingAgeDays}
                              onChange={(event) =>
                                updatePasskeyPolicy({
                                  maxBindingAgeDays: Number(event.target.value || 90),
                                })
                              }
                              className="settings-inline-input w-24 rounded-lg px-2 py-1 text-right"
                            />
                          </label>
                        </div>
                      </div>

                      {passkeyRevocations.length > 0 && (
                        <div
                          ref={passkeyRevocationRef}
                          className="settings-card-surface-muted mt-4 rounded-2xl p-4"
                        >
                          <div className="font-semibold text-sm text-[var(--color-deep-navy)] mb-2">
                            {t('passkeyRevocationListTitle', 'Synchronized revoke list')}
                          </div>
                          <div className="space-y-2">
                            {passkeyRevocations.slice(0, 8).map((item) => (
                              <div
                                key={`${item.credentialId}-${item.revokedAt}`}
                                className="settings-card-item rounded-xl p-3 text-[11px]"
                              >
                                <div className="font-mono break-all text-[var(--color-deep-navy)]">
                                  {item.credentialId}
                                </div>
                                <div className="opacity-60 mt-1">
                                  {item.revokedAt ? new Date(item.revokedAt).toLocaleString() : '-'}
                                </div>
                                <div className="opacity-70 mt-1">
                                  {item.reason ||
                                    t('passkeyRevokeReasonUnknown', 'No reason provided')}
                                </div>
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
                              <div
                                key={`${event.at || index}-${event.type || 'event'}`}
                                className="settings-card-item rounded-xl p-3 text-[11px]"
                              >
                                <div className="font-semibold text-[var(--color-deep-navy)]">
                                  {event.type || t('passkeyEventUnknown', 'event')}
                                </div>
                                <div className="opacity-60">
                                  {event.at ? new Date(event.at).toLocaleString() : '-'}
                                </div>
                                {event.detail && (
                                  <div className="opacity-70 mt-1">{event.detail}</div>
                                )}
                                {event.deviceFingerprint && (
                                  <div className="opacity-60 font-mono mt-1">
                                    {event.deviceFingerprint}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="settings-subpanel p-5 rounded-2xl border shadow-inner mb-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-sm mb-1 text-[var(--color-deep-navy)]">
                            {t('storageAuditTitle')}
                          </h4>
                          <p className="text-xs opacity-70 leading-relaxed max-w-md">
                            {t('storageAuditDesc')}
                          </p>
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
                          <h4 className="font-semibold text-sm mb-1 text-[var(--color-deep-navy)]">
                            {t('plainExportPolicyTitle', 'Plaintext Export Policy')}
                          </h4>
                          <p className="text-xs opacity-70 leading-relaxed max-w-md">
                            {t(
                              'plainExportPolicyDesc',
                              'CSV/JSON exports are disabled by default for security. Enable only for temporary migration use.'
                            )}
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
                            {t(
                              'desktopPairingManagerDesc',
                              'Review browser extensions paired with this desktop vault and revoke them when needed.'
                            )}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-[var(--color-sage-green)]">
                          {loadingDesktopPairings
                            ? t('desktopPairingLoading', 'Loading...')
                            : `${desktopPairings.length}`}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {desktopPairings.map((pairing) => (
                          <div
                            key={pairing.extensionId}
                            className="settings-card-surface rounded-2xl p-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="font-semibold text-sm text-[var(--color-deep-navy)]">
                                    {pairing.browserName ||
                                      t('desktopPairingUnknownBrowser', 'Unknown Browser')}
                                  </div>
                                  {pairing.riskLevel && pairing.riskLevel !== 'low' && (
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${pairing.riskLevel === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}
                                    >
                                      {pairing.riskLevel === 'high'
                                        ? t('desktopPairingHighRisk', 'High risk')
                                        : t('desktopPairingMediumRisk', 'Review')}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] opacity-70">
                                  {pairing.clientLabel ||
                                    t('desktopPairingUnknownClient', 'Unknown client')}
                                </div>
                                <div className="text-[11px] opacity-70 font-mono break-all">
                                  {pairing.extensionId}
                                </div>
                                {pairing.pairingMode && (
                                  <div className="text-[11px] opacity-60">
                                    {t('desktopPairingMode', 'Pairing mode')}:{' '}
                                    {pairing.pairingMode === 'signed-p256-v1'
                                      ? t('desktopPairingModeSigned', 'Persistent signed pairing')
                                      : t('desktopPairingModeLegacy', 'Legacy secret model')}
                                  </div>
                                )}
                                {pairing.clientKeyId && (
                                  <div className="text-[11px] opacity-60 font-mono">
                                    {t('desktopPairingClientKey', 'Client key')}:{' '}
                                    {pairing.clientKeyId}
                                  </div>
                                )}
                                {pairing.deviceFingerprint && (
                                  <div className="text-[11px] opacity-60 font-mono">
                                    {t('desktopPairingFingerprint', 'Fingerprint')}:{' '}
                                    {pairing.deviceFingerprint}
                                  </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] opacity-60">
                                  <div>
                                    {t('desktopPairingPairedAt', 'Paired')}:{' '}
                                    {formatPairingTimestamp(
                                      pairing.pairedAt || pairing.secretSource
                                    )}
                                  </div>
                                  <div>
                                    {t('desktopPairingLastApprovedAt', 'Last approval')}:{' '}
                                    {formatPairingTimestamp(pairing.lastApprovedAt)}
                                  </div>
                                  <div>
                                    {t('desktopPairingLastUsedAt', 'Last used')}:{' '}
                                    {formatPairingTimestamp(pairing.lastUsedAt)}
                                  </div>
                                </div>
                                {Array.isArray(pairing.riskFlags) &&
                                  pairing.riskFlags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                      {pairing.riskFlags.map((flag) => (
                                        <span
                                          key={flag}
                                          className="rounded-full bg-amber-50 border border-amber-200 px-2 py-1 text-[10px] font-semibold text-amber-700"
                                        >
                                          {mapRiskFlagLabel(flag)}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                {Array.isArray(pairing.pairingHistory) &&
                                  pairing.pairingHistory.length > 0 && (
                                    <div className="pt-2">
                                      <div className="text-[11px] font-semibold opacity-70 mb-1">
                                        {t('desktopPairingHistoryTitle', 'Recent pairing activity')}
                                      </div>
                                      <div className="space-y-1">
                                        {pairing.pairingHistory.slice(0, 3).map((event, index) => (
                                          <div
                                            key={`${pairing.extensionId}-${event.at || index}`}
                                            className="text-[11px] opacity-60"
                                          >
                                            {formatPairingTimestamp(event.at)} -{' '}
                                            {event.type ||
                                              t('desktopPairingHistoryUnknown', 'activity')}
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
                            {t(
                              'desktopPairingEmpty',
                              'No paired browser extensions were found for this desktop app yet.'
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Phase 2: E2EE Sync Strategy & Devices */}
                    <div
                      ref={syncDevicesRef}
                      className="settings-panel rounded-3xl p-6 shadow-sm mt-4"
                    >
                      <div className="flex items-center gap-2 mb-6">
                        <ShieldCheck className="w-5 h-5 text-emerald-500" />
                        <h3 className="text-lg font-semibold tracking-tight">
                          E2EE Bulut Senkronizasyonu (Faz 2)
                        </h3>
                      </div>

                      <div className="settings-subpanel p-5 rounded-2xl border shadow-inner mb-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="font-semibold text-sm mb-1 text-[var(--color-deep-navy)]">
                              Uçtan Uca Şifreli Senkronizasyon
                            </h4>
                            <p className="text-xs opacity-70 leading-relaxed max-w-md">
                              Vault verilerinizi Aegis Relay üzerinden diğer cihazlarınızla otomatik
                              senkronize edin. Tüm veriler cihazınızda şifrelenir.
                            </p>
                          </div>
                          <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-deep-navy)]">
                            <input
                              type="checkbox"
                              checked={e2eSyncEnabled}
                              onChange={(e) => setE2eSyncEnabled(e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/40"
                            />
                            Aktif Et
                          </label>
                        </div>
                      </div>

                      {e2eSyncEnabled && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                          <SyncDevicesPanel />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'advanced' && (
                <div className="flex flex-col space-y-5 animate-in fade-in duration-500">
                  {/* Secret Menu - Duress Mode */}
                  {showSecretMenu && (
                    <div className="border-2 border-red-500/20 bg-red-50/20 rounded-3xl p-6 shadow-sm animate-in zoom-in-95 duration-500">
                      <div className="flex items-center gap-2 mb-6">
                        <Lock className="w-5 h-5 text-red-600" />
                        <h3 className="text-lg font-extrabold tracking-tighter text-red-600 uppercase">
                          {t('secretMenuTitle')}
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="settings-subpanel p-5 rounded-2xl border border-red-100 shadow-inner">
                          <h4 className="font-bold text-sm mb-2 text-[var(--color-deep-navy)]">
                            {t('hiddenVaultTitle')}
                          </h4>
                          <p className="text-xs opacity-70 mb-4">{t('hiddenVaultDesc')}</p>
                          <input
                            type="password"
                            placeholder={t('duressPinPlaceholder')}
                            value={duressPin}
                            onChange={(e) => setDuressPin(e.target.value)}
                            className="w-full rounded-xl border border-red-100 bg-white px-4 py-2 text-sm font-mono tracking-widest outline-none focus:ring-2 focus:ring-red-400/20"
                          />
                        </div>
                        <div className="settings-subpanel p-5 rounded-2xl border border-red-100 shadow-inner">
                          <h4 className="font-bold text-sm mb-2 text-[var(--color-deep-navy)]">
                            {t('silentWipeTitle')}
                          </h4>
                          <p className="text-xs opacity-70 mb-4">{t('silentWipeDesc')}</p>
                          <input
                            type="password"
                            placeholder={t('killPinPlaceholder')}
                            value={killPin}
                            onChange={(e) => setKillPin(e.target.value)}
                            className="w-full rounded-xl border border-red-100 bg-white px-4 py-2 text-sm font-mono tracking-widest outline-none focus:ring-2 focus:ring-red-400/20"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => requireAuth('Security Settings', saveSecretSettings)}
                        className="mt-6 w-full py-3 rounded-xl bg-red-600 text-white font-black uppercase text-xs tracking-widest hover:bg-red-700 transition-all shadow-lg active:scale-95"
                      >
                        {t('saveSecretSettingsBtn')}
                      </button>
                    </div>
                  )}

                  {/* Data Reset */}
                  <div className="danger-reset-panel mt-4 p-5 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                    <div>
                      <h4 className="danger-reset-title font-semibold text-sm mb-1 text-red-700">
                        {t('factoryResetBtn')}
                      </h4>
                      <p className="danger-reset-desc text-[11px] opacity-90 leading-relaxed max-w-sm text-red-700">
                        {t('confirmFullWipe')}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowWipeModal(true)}
                      className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-all shadow-sm active:scale-95 whitespace-nowrap"
                    >
                      {t('factoryResetBtn')}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'sync' && (
                <div className="flex flex-col space-y-5 animate-in fade-in duration-500">
                  {/* Data Management */}
                  <div className="settings-panel rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                      <Database className="w-5 h-5 text-[var(--color-sage-green)]" />
                      <h3 className="text-lg font-semibold tracking-tight">
                        {t('dataManagementTitle')}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Export */}
                      <div className="settings-subpanel p-5 rounded-2xl border flex flex-col justify-between shadow-inner">
                        <div>
                          <h4 className="font-semibold text-sm mb-1 text-[var(--color-deep-navy)]">
                            {t('exportTitle')}
                          </h4>
                          <p className="text-xs opacity-70 leading-relaxed mb-4">
                            {t('exportDesc')}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleExport('vault')}
                            className="btn-ink w-full justify-center flex items-center gap-2 py-2 rounded-xl bg-[var(--color-deep-navy)] text-white text-xs font-semibold hover:bg-opacity-90 transition-all active:scale-95 shadow-md"
                          >
                            <FileDown className="w-4 h-4" /> {t('exportVaultBtn')}
                          </button>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              disabled={!allowPlaintextExport}
                              onClick={() => handleExport('csv')}
                              className="settings-plain-btn w-full justify-center flex items-center gap-2 py-2 rounded-xl bg-white/60 border border-black/10 text-[var(--color-deep-navy)] text-xs font-semibold hover:bg-white transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {t('exportCsvBtn')}
                            </button>
                            <button
                              disabled={!allowPlaintextExport}
                              onClick={() => handleExport('json')}
                              className="settings-plain-btn w-full justify-center flex items-center gap-2 py-2 rounded-xl bg-white/60 border border-black/10 text-[var(--color-deep-navy)] text-xs font-semibold hover:bg-white transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {t('exportJsonBtn')}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Import */}
                      <div className="settings-subpanel p-5 rounded-2xl border flex flex-col justify-between shadow-inner">
                        <div>
                          <h4 className="font-semibold text-sm mb-1 text-[var(--color-deep-navy)]">
                            {t('importWizardTitle')}
                          </h4>
                          <p className="text-xs opacity-70 leading-relaxed mb-4">
                            {t('importWizardDesc')}
                          </p>
                        </div>
                        {importProgress && (
                          <div className="mb-4 space-y-2 animate-in fade-in slide-in-from-top-1">
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/60">
                              <span>
                                {importProgress.status === 'parsing'
                                  ? t('importAnalyzing')
                                  : importProgress.status === 'importing'
                                    ? t('importEncrypting')
                                    : t('importCompleted')}
                              </span>
                              <span>
                                {Math.round(
                                  (importProgress.processed / (importProgress.totalAnalyzed || 1)) *
                                    100
                                )}
                                %
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[var(--color-sage-green)] transition-all duration-300"
                                style={{
                                  width: `${(importProgress.processed / (importProgress.totalAnalyzed || 1)) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                        <label
                          className={`cursor-pointer w-full justify-center flex items-center gap-2 py-2.5 rounded-xl border border-[var(--color-sage-green)]/30 bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)] text-sm font-semibold hover:bg-[var(--color-sage-green)] hover:text-white transition-all active:scale-95 shadow-sm ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                          <FileUp className="w-4 h-4" />
                          {isImporting ? t('importProcessing') : t('importBtn')}
                          <input
                            type="file"
                            accept=".csv,.json,.aes"
                            className="hidden"
                            onChange={handleImport}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="mt-4 settings-subpanel p-5 rounded-2xl border shadow-inner">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="max-w-2xl">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="rounded-full bg-[var(--color-sage-green)]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-sage-green)]">
                              {t('syncStrategyBadge', 'Faz 5 / Sync Strategy')}
                            </span>
                            <span className="rounded-full bg-[var(--color-deep-navy)]/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/60">
                              {t(activeSyncMode.titleKey, activeSyncMode.titleDefault)}
                            </span>
                          </div>
                          <h4 className="mt-3 font-semibold text-sm text-[var(--color-deep-navy)]">
                            {t('syncStrategyTitle', 'Sync Strategy Summary')}
                          </h4>
                          <p className="mt-1 text-xs opacity-75 leading-relaxed">
                            {t(activeSyncMode.descriptionKey, activeSyncMode.descriptionDefault)}
                          </p>
                          <p className="mt-2 text-xs opacity-70 leading-relaxed">
                            {t(AEGIS_SYNC_STRATEGY.reviewKey, AEGIS_SYNC_STRATEGY.reviewDefault)}
                          </p>
                        </div>
                        <div className="grid grid-cols-1 gap-2 text-xs xl:min-w-[240px]">
                          <div className="rounded-2xl border settings-card-surface px-4 py-3">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/50">
                              {t('syncStrategyCurrentMode', 'Current model')}
                            </div>
                            <div className="mt-1 font-semibold text-[var(--color-deep-navy)]">
                              {t(activeSyncMode.titleKey, activeSyncMode.titleDefault)}
                            </div>
                          </div>
                          <div className="rounded-2xl border settings-card-surface px-4 py-3">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/50">
                              {t('syncStrategyFutureMode', 'Reserved next layer')}
                            </div>
                            <div className="mt-1 font-semibold text-[var(--color-deep-navy)]">
                              {t(futureSyncMode.titleKey, futureSyncMode.titleDefault)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-1 xl:grid-cols-3 gap-3">
                        {syncTransportSummaries.map((transport) => (
                          <div
                            key={transport.key}
                            className="rounded-2xl border settings-card-surface px-4 py-4 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-[var(--color-deep-navy)]">
                                  {t(transport.titleKey, transport.titleDefault)}
                                </div>
                                <div className="mt-1 text-xs opacity-75 leading-relaxed">
                                  {t(transport.descriptionKey, transport.descriptionDefault)}
                                </div>
                              </div>
                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                                  transport.statusKey === 'syncStrategyStatusBlocked'
                                    ? 'bg-red-500/10 text-red-600'
                                    : transport.statusKey === 'syncStrategyStatusRestricted'
                                      ? 'bg-amber-500/10 text-amber-700'
                                      : 'bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)]'
                                }`}
                              >
                                {t(transport.statusKey, transport.statusDefault)}
                              </span>
                            </div>
                            <div className="mt-3 text-[11px] text-[var(--color-deep-navy)]/65 leading-relaxed">
                              {t(transport.trustBoundaryKey, transport.trustBoundaryDefault)}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div className="rounded-2xl border settings-card-surface px-4 py-4 shadow-sm">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/50">
                            {t('syncConflictRulesTitle', 'Conflict rules')}
                          </div>
                          <div className="mt-3 space-y-3">
                            {AEGIS_SYNC_CONFLICT_RULES.map((rule) => (
                              <div
                                key={rule.key}
                                className="rounded-xl border border-black/5 bg-white/40 px-3 py-3"
                              >
                                <div className="text-sm font-semibold text-[var(--color-deep-navy)]">
                                  {t(rule.titleKey, rule.titleDefault)}
                                </div>
                                <div className="mt-1 text-xs opacity-75 leading-relaxed">
                                  {t(rule.descriptionKey, rule.descriptionDefault)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-2xl border settings-card-surface px-4 py-4 shadow-sm">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/50">
                            {t('syncAuditLanguageTitle', 'Transport audit language')}
                          </div>
                          <div className="mt-3 space-y-3">
                            {syncAuditDefinitions.map((eventDef) => (
                              <div
                                key={eventDef.key}
                                className="rounded-xl border border-black/5 bg-white/40 px-3 py-3"
                              >
                                <div className="text-sm font-semibold text-[var(--color-deep-navy)]">
                                  {t(eventDef.titleKey, eventDef.titleDefault)}
                                </div>
                                <div className="mt-1 text-xs opacity-75 leading-relaxed">
                                  {t(eventDef.descriptionKey, eventDef.descriptionDefault)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 rounded-2xl border border-dashed settings-card-surface px-4 py-3 text-xs opacity-75">
                        {t(
                          AEGIS_SYNC_STRATEGY.conflictPolicyKey,
                          AEGIS_SYNC_STRATEGY.conflictPolicyDefault
                        )}
                      </div>
                    </div>

                    {/* QR Sync */}
                    {syncMode === 'export' && syncExportPackage ? (
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
                    ) : syncMode === 'import' ? (
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
                                const message =
                                  error instanceof Error
                                    ? error.message
                                    : 'QR_SYNC_PAIRING_INIT_FAILED';
                                toast.error(
                                  t('qrSyncExportFailed', {
                                    error: message,
                                    defaultValue: 'QR transfer could not be prepared: {{error}}',
                                  })
                                );
                              }
                            })();
                          }}
                        />
                      </div>
                    ) : syncMode === 'export-config' ? (
                      <div className="mt-8 rounded-3xl border qr-scanner-surface p-6 shadow-inner space-y-4">
                        <div>
                          <h4 className="font-bold text-[var(--color-deep-navy)] text-base">
                            {t('qrSyncEncryptedTransferTitle', 'Encrypted Device Transfer')}
                          </h4>
                          <p className="text-xs opacity-80 mt-1">
                            {t(
                              'qrSyncEncryptedTransferDesc',
                              'These animated QR frames contain only encrypted payload. Enter the transfer code on the receiving device to decrypt the vault data.'
                            )}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-deep-navy)]/60">
                            {t('qrSyncTransferCodeLabel', 'Transfer Code')}
                          </label>
                          <input
                            type="text"
                            value={syncTransferCode}
                            onChange={(event) => setSyncTransferCode(event.target.value)}
                            className="mt-2 w-full rounded-xl border qr-scanner-input px-4 py-3 text-sm font-[var(--font-geist-mono)] tracking-[0.18em] text-[var(--color-deep-navy)] shadow-inner focus:outline-none focus:ring-2 focus:ring-[var(--color-sage-green)]/40"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-deep-navy)]/60">
                            {t('qrSyncReceiverPairingLabel', 'Optional Receiver Pairing Code')}
                          </label>
                          <textarea
                            value={syncRecipientPairingCode}
                            onChange={(event) => setSyncRecipientPairingCode(event.target.value)}
                            rows={4}
                            className="mt-2 w-full rounded-xl border qr-scanner-input px-4 py-3 text-xs font-[var(--font-geist-mono)] text-[var(--color-deep-navy)] shadow-inner focus:outline-none focus:ring-2 focus:ring-[var(--color-sage-green)]/40"
                            placeholder={t(
                              'qrSyncReceiverPairingHint',
                              'Paste the receiver pairing code here to bind this transfer to a single destination device.'
                            )}
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
                          <button
                            onClick={resetSyncFlow}
                            className="btn-ink px-5 py-2.5 bg-[var(--color-deep-navy)] rounded-xl text-white font-bold text-sm hover:bg-opacity-90 transition-all shadow-md active:scale-95"
                          >
                            {t('cancel', 'Cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6 watchtower-status-box p-6 rounded-3xl border shadow-inner flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
                        <div>
                          <h4 className="font-bold text-[var(--color-deep-navy)] text-base mb-1">
                            {t('qrSyncTitle')}
                          </h4>
                          <p className="text-xs opacity-80 max-w-sm">{t('qrSyncDesc')}</p>
                          {!currentSecurityModeDefinition.allowQrSync && (
                            <p className="mt-2 text-xs font-medium text-amber-700">
                              {t('securityModeQrSyncBlocked')}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-3 shrink-0">
                          <button
                            onClick={handleSyncExportInit}
                            disabled={!currentSecurityModeDefinition.allowQrSync}
                            className="settings-secondary-btn px-5 py-2.5 toolbar-control rounded-xl text-[var(--color-deep-navy)] font-bold text-sm hover:bg-[var(--color-sage-green)] hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {t('qrExportBtn')}
                          </button>
                          <button
                            onClick={() => {
                              void (async () => {
                                if (!SecurityModePolicy.isQrSyncAllowed(securityModeProfile)) {
                                  toast.error(t('securityModeQrSyncBlocked'));
                                  return;
                                }
                                try {
                                  setSyncTransferCode('');
                                  await createReceiverPairingSession();
                                  setSyncMode('import');
                                } catch (error: unknown) {
                                  const message =
                                    error instanceof Error
                                      ? error.message
                                      : 'QR_SYNC_PAIRING_INIT_FAILED';
                                  toast.error(
                                    t('qrSyncExportFailed', {
                                      error: message,
                                      defaultValue: 'QR transfer could not be prepared: {{error}}',
                                    })
                                  );
                                }
                              })();
                            }}
                            disabled={!currentSecurityModeDefinition.allowQrSync}
                            className="btn-ink px-5 py-2.5 bg-[var(--color-deep-navy)] rounded-xl text-white font-bold text-sm hover:bg-opacity-90 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {t('qrImportBtn')}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
                      <div
                        ref={qrAuditPanelRef}
                        className="settings-subpanel p-5 rounded-2xl border shadow-inner"
                      >
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <div>
                            <h4 className="font-semibold text-sm text-[var(--color-deep-navy)]">
                              {t('qrSyncHistoryTitle', 'QR Transfer History')}
                            </h4>
                            <p className="text-xs opacity-70 mt-1">
                              {t(
                                'qrSyncHistoryDesc',
                                'Review active, consumed, and revoked QR transfer sessions.'
                              )}
                            </p>
                          </div>
                          <span className="rounded-full bg-[var(--color-sage-green)]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-sage-green)]">
                            {qrTransferHistory.length}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {qrTransferHistory.length === 0 ? (
                            <div className="rounded-xl border border-dashed settings-card-surface px-4 py-5 text-xs opacity-60">
                              {t('qrSyncHistoryEmpty', 'No QR transfer history recorded yet.')}
                            </div>
                          ) : (
                            <>
                              {qrTransferHistory
                                .slice(0, showFullQrHistory ? undefined : 2)
                                .map((record) => (
                                  <div
                                    key={record.sessionId}
                                    className="rounded-xl border settings-card-surface px-4 py-3 shadow-sm"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="text-xs font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/50">
                                          {record.sessionId.slice(0, 12)}
                                        </div>
                                        <div className="mt-1 text-sm font-semibold text-[var(--color-deep-navy)]">
                                          {record.protectionMode === 'transfer-code+ecdh'
                                            ? t(
                                                'qrSyncProtectionBound',
                                                'Transfer code + receiver binding'
                                              )
                                            : t('qrSyncProtectionCodeOnly', 'Transfer code only')}
                                        </div>
                                      </div>
                                      <span
                                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                                          record.status === 'created'
                                            ? 'bg-amber-500/10 text-amber-600'
                                            : record.status === 'consumed'
                                              ? 'bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)]'
                                              : 'bg-red-500/10 text-red-600'
                                        }`}
                                      >
                                        {record.status === 'created'
                                          ? t('qrSyncStatusCreated', 'Active')
                                          : record.status === 'consumed'
                                            ? t('qrSyncStatusConsumed', 'Imported')
                                            : t('qrSyncStatusRevoked', 'Revoked')}
                                      </span>
                                    </div>
                                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[var(--color-deep-navy)]/70">
                                      <div>
                                        {t('qrSyncHistoryCreatedAt', 'Created')}:{' '}
                                        {formatPairingTimestamp(record.createdAt)}
                                      </div>
                                      <div>
                                        {t('qrSyncHistoryExpiresAt', 'Expires')}:{' '}
                                        {formatPairingTimestamp(record.expiresAt)}
                                      </div>
                                      <div>
                                        {t('qrSyncHistoryEntryCount', 'Entries')}:{' '}
                                        {record.entryCount}
                                      </div>
                                      <div>
                                        {t('qrSyncHistoryRecipient', 'Recipient')}:{' '}
                                        {record.recipientFingerprint ||
                                          t('qrSyncHistoryAnyRecipient', 'Any compatible device')}
                                      </div>
                                    </div>
                                    {record.revokedAt && (
                                      <div className="mt-2 text-xs text-red-600">
                                        {t('qrSyncHistoryRevokedAt', 'Revoked')}:{' '}
                                        {formatPairingTimestamp(record.revokedAt)}
                                        {record.revokeReason ? ` (${record.revokeReason})` : ''}
                                      </div>
                                    )}
                                    {record.consumedAt && (
                                      <div className="mt-2 text-xs text-[var(--color-sage-green)]">
                                        {t('qrSyncHistoryConsumedAt', 'Imported')}:{' '}
                                        {formatPairingTimestamp(record.consumedAt)}
                                      </div>
                                    )}
                                    {record.status === 'created' && (
                                      <div className="mt-3 flex justify-end">
                                        <button
                                          onClick={() => handleQrTransferRevoke(record.sessionId)}
                                          className="rounded-xl border border-red-500/20 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition-all hover:bg-red-100 active:scale-95"
                                        >
                                          {t('qrSyncRevokeBtn', 'Revoke')}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              {qrTransferHistory.length > 2 && (
                                <button
                                  onClick={() => setShowFullQrHistory(!showFullQrHistory)}
                                  className="w-full mt-2 rounded-xl border border-black/5 bg-black/5 py-2.5 text-xs font-bold text-[var(--color-deep-navy)] transition-all hover:bg-black/10 active:scale-95 dark:border-white/5 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                                >
                                  {showFullQrHistory
                                    ? t('qrSyncHistoryShowLess', 'Daha az göster')
                                    : t('qrSyncHistoryShowMore', '{{count}} tanesini daha göster', {
                                        count: qrTransferHistory.length - 2,
                                      })}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="settings-subpanel p-5 rounded-2xl border shadow-inner">
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <div>
                            <h4 className="font-semibold text-sm text-[var(--color-deep-navy)]">
                              {t('qrSyncAuditTitle', 'QR Sync Audit Trail')}
                            </h4>
                            <p className="text-xs opacity-70 mt-1">
                              {t(
                                'qrSyncAuditDesc',
                                'Track transfer creation, import, revoke, and rejection events.'
                              )}
                            </p>
                          </div>
                          <span className="rounded-full bg-[var(--color-deep-navy)]/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/60">
                            {qrTransferAudit.length}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {qrTransferAudit.length === 0 ? (
                            <div className="rounded-xl border border-dashed settings-card-surface px-4 py-5 text-xs opacity-60">
                              {t('qrSyncAuditEmpty', 'No QR sync audit events recorded yet.')}
                            </div>
                          ) : (
                            <>
                              {qrTransferAudit
                                .slice(0, showFullQrAudit ? undefined : 2)
                                .map((event) => (
                                  <div
                                    key={event.id}
                                    className="rounded-xl border settings-card-surface px-4 py-3 shadow-sm"
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="text-sm font-semibold text-[var(--color-deep-navy)]">
                                        {mapQrAuditLabel(event.type)}
                                      </div>
                                      <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/40">
                                        {formatPairingTimestamp(event.at)}
                                      </div>
                                    </div>
                                    {(() => {
                                      const syncAuditKey = mapQrAuditToSyncKey(event.type);
                                      const auditDefinition = syncAuditKey
                                        ? AEGIS_SYNC_AUDIT_LANGUAGE.find(
                                            (item) => item.key === syncAuditKey
                                          )
                                        : null;
                                      if (!auditDefinition) return null;
                                      return (
                                        <div className="mt-1 text-[11px] text-[var(--color-deep-navy)]/55">
                                          {t(
                                            auditDefinition.descriptionKey,
                                            auditDefinition.descriptionDefault
                                          )}
                                        </div>
                                      );
                                    })()}
                                    {event.detail && (
                                      <div className="mt-1 text-xs text-[var(--color-deep-navy)]/70">
                                        {event.detail}
                                      </div>
                                    )}
                                    <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                                      {event.sessionId && (
                                        <span className="rounded-full bg-[var(--color-deep-navy)]/5 px-2 py-1 font-bold text-[var(--color-deep-navy)]/60">
                                          {event.sessionId.slice(0, 12)}
                                        </span>
                                      )}
                                      {Object.entries(event.metadata || {}).map(([key, value]) => (
                                        <span
                                          key={`${event.id}-${key}`}
                                          className="rounded-full bg-black/5 px-2 py-1 font-bold text-[var(--color-deep-navy)]/60"
                                        >
                                          {key}: {String(value)}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              {qrTransferAudit.length > 2 && (
                                <button
                                  onClick={() => setShowFullQrAudit(!showFullQrAudit)}
                                  className="w-full mt-2 rounded-xl border border-black/5 bg-black/5 py-2.5 text-xs font-bold text-[var(--color-deep-navy)] transition-all hover:bg-black/10 active:scale-95 dark:border-white/5 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                                >
                                  {showFullQrAudit
                                    ? t('qrSyncAuditShowLess', 'Daha az göster')
                                    : t('qrSyncAuditShowMore', '{{count}} tanesini daha göster', {
                                        count: qrTransferAudit.length - 2,
                                      })}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="settings-subpanel p-5 rounded-2xl border shadow-inner">
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <div>
                            <h4 className="font-semibold text-sm text-[var(--color-deep-navy)]">
                              {t('syncAuditTitle', 'Sync Audit Summary')}
                            </h4>
                            <p className="text-xs opacity-70 mt-1">
                              {t(
                                'syncAuditDesc',
                                'Track completed import, QR, restore, and migration flows with conflict metadata.'
                              )}
                            </p>
                          </div>
                          <span className="rounded-full bg-[var(--color-sage-green)]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-sage-green)]">
                            {syncAuditEvents.length}
                          </span>
                        </div>
                        <div className="mb-4 flex flex-wrap gap-2">
                          {[
                            ['all', t('syncAuditFilterAll', 'All')],
                            ['imports', t('syncAuditFilterImports', 'Imports')],
                            ['qr', t('syncAuditFilterQr', 'QR')],
                            ['restore_migration', t('syncAuditFilterRestore', 'Restore/Migration')],
                          ].map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() =>
                                setSyncAuditFilter(
                                  value as 'all' | 'imports' | 'restore_migration' | 'qr'
                                )
                              }
                              className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${
                                syncAuditFilter === value
                                  ? 'settings-filter-chip settings-filter-chip-active'
                                  : 'settings-filter-chip'
                              }`}
                              aria-pressed={syncAuditFilter === value}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <div className="mb-4 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/60">
                          <span className="rounded-full bg-[var(--color-deep-navy)]/5 px-3 py-1.5">
                            {t('syncAuditSummaryImports', {
                              count: syncAuditSourceCounts.imports,
                              defaultValue: '{{count}} imports',
                            })}
                          </span>
                          <span className="rounded-full bg-[var(--color-deep-navy)]/5 px-3 py-1.5">
                            {t('syncAuditSummaryQr', {
                              count: syncAuditSourceCounts.qr,
                              defaultValue: '{{count}} QR flows',
                            })}
                          </span>
                          <span className="rounded-full bg-[var(--color-deep-navy)]/5 px-3 py-1.5">
                            {t('syncAuditSummaryRestore', {
                              count: syncAuditSourceCounts.restore,
                              defaultValue: '{{count}} restore/migration',
                            })}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {filteredSyncAuditEvents.length === 0 ? (
                            <div className="rounded-xl border border-dashed settings-card-surface px-4 py-5 text-xs opacity-60">
                              {t('syncAuditEmpty', 'No sync audit events recorded yet.')}
                            </div>
                          ) : (
                            filteredSyncAuditEvents.slice(0, 6).map((event) => (
                              <div
                                key={event.id}
                                className="rounded-xl border settings-card-surface px-4 py-3 shadow-sm"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-sm font-semibold text-[var(--color-deep-navy)]">
                                    {mapSyncAuditLabel(event.type)}
                                  </div>
                                  <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/40">
                                    {formatPairingTimestamp(event.at)}
                                  </div>
                                </div>
                                {event.detail && (
                                  <div className="mt-1 text-xs text-[var(--color-deep-navy)]/70">
                                    {event.detail}
                                  </div>
                                )}
                                <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                                  <span className="rounded-full bg-[var(--color-deep-navy)]/5 px-2 py-1 font-bold text-[var(--color-deep-navy)]/60">
                                    {event.source}
                                  </span>
                                  {Object.entries(event.metadata || {}).map(([key, value]) => (
                                    <span
                                      key={`${event.id}-${key}`}
                                      className="rounded-full bg-black/5 px-2 py-1 font-bold text-[var(--color-deep-navy)]/60"
                                    >
                                      {key}: {String(value)}
                                    </span>
                                  ))}
                                </div>
                                {(event.source === 'backup_import' ||
                                  event.source === 'structured_import' ||
                                  event.source === 'qr_import' ||
                                  event.source === 'canonical_restore' ||
                                  event.source === 'migration') && (
                                  <div className="mt-3 flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => navigateFromSyncAudit(event.source)}
                                      className="rounded-xl border border-[var(--color-deep-navy)]/10 bg-white/70 px-4 py-2 text-xs font-bold text-[var(--color-deep-navy)] transition-all hover:bg-white active:scale-95"
                                    >
                                      {event.source === 'qr_import'
                                        ? t('syncAuditOpenQr', 'Open QR section')
                                        : event.source === 'canonical_restore' ||
                                            event.source === 'migration'
                                          ? t(
                                              'syncAuditOpenMigrationReport',
                                              'Open migration report'
                                            )
                                          : t('syncAuditOpenImportReport', 'Open import report')}
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Import Report */}
                    {importReport && (
                      <div
                        ref={importReportRef}
                        className="import-report-card mt-5 p-5 rounded-2xl border animate-in fade-in zoom-in-95 duration-500 shadow-sm relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                        <div className="flex items-start gap-4 relative z-10">
                          <div className="p-2 bg-amber-500/15 rounded-xl text-amber-500 shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm text-[var(--color-deep-navy)]">
                              {t('importReportTitle')}
                            </h4>
                            <p className="text-xs opacity-60 mt-1 mb-2">{t('importReportDesc')}</p>
                            <div className="space-y-2 mt-3 font-[var(--font-geist-mono)] text-xs">
                              <div className="flex justify-between items-center py-1.5 border-b border-[var(--color-deep-navy)]/10">
                                <span className="opacity-70">{t('totalValidEntries')}</span>
                                <span className="font-bold text-[var(--color-sage-green)]">
                                  {importReport.validEntries}
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-1.5 border-b border-[var(--color-deep-navy)]/10">
                                <span className="opacity-70">{t('weakPasswordsDetected')}</span>
                                <span
                                  className={`font-bold ${importReport.weakPasswords > 0 ? 'text-red-500 cursor-pointer hover:underline' : 'opacity-40'}`}
                                  onClick={() => {
                                    if (importReport.weakPasswords > 0)
                                      setShowWeakPasswordsPopup(true);
                                  }}
                                >
                                  {importReport.weakPasswords}
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-1.5 border-b border-[var(--color-deep-navy)]/10">
                                <span className="opacity-70">{t('missingProperties')}</span>
                                <span
                                  className={`font-bold ${importReport.missingCriticalFields > 0 ? 'text-amber-500' : 'opacity-40'}`}
                                >
                                  {importReport.missingCriticalFields}
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-1.5 border-b border-[var(--color-deep-navy)]/10">
                                <span className="opacity-70">
                                  {t('importSkippedRows', 'Skipped Rows')}
                                </span>
                                <span
                                  className={`font-bold ${importReport.skippedRows > 0 ? 'text-amber-500' : 'opacity-40'}`}
                                >
                                  {importReport.skippedRows}
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-1.5">
                                <span className="opacity-70">
                                  {t('importDuplicateCandidates', 'Duplicate Candidates')}
                                </span>
                                <span
                                  className={`font-bold ${importReport.duplicateCandidates > 0 ? 'text-amber-500' : 'opacity-40'}`}
                                >
                                  {importReport.duplicateCandidates}
                                </span>
                              </div>
                              {importReport.conflictSummary &&
                                importReport.conflictSummary.duplicateCount > 0 && (
                                  <div className="pt-2">
                                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                                      <div className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
                                        {t('syncConflictReportTitle', 'Sync Conflict Summary')}
                                      </div>
                                      <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                                        <div className="rounded-xl bg-white/60 px-3 py-2">
                                          <div className="opacity-60">
                                            {t('syncConflictReportIncoming', 'Incoming')}
                                          </div>
                                          <div className="mt-1 font-bold text-[var(--color-deep-navy)]">
                                            {importReport.conflictSummary.incomingCount}
                                          </div>
                                        </div>
                                        <div className="rounded-xl bg-white/60 px-3 py-2">
                                          <div className="opacity-60">
                                            {t('syncConflictReportMatches', 'Existing matches')}
                                          </div>
                                          <div className="mt-1 font-bold text-amber-700">
                                            {importReport.conflictSummary.duplicateCount}
                                          </div>
                                        </div>
                                        <div className="rounded-xl bg-white/60 px-3 py-2">
                                          <div className="opacity-60">
                                            {t('syncConflictReportExact', 'Exact matches')}
                                          </div>
                                          <div className="mt-1 font-bold text-[var(--color-deep-navy)]">
                                            {importReport.conflictSummary.exactMatchCount}
                                          </div>
                                        </div>
                                      </div>
                                      <p className="mt-3 text-xs opacity-75 leading-relaxed">
                                        {t(
                                          'syncConflictReportDesc',
                                          'Incoming items were compared with the local vault before import. Matching signatures do not block import, but they indicate records you may want to review.'
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              {importReport.warnings.length > 0 && (
                                <div className="pt-2">
                                  <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                                    {t('importWarningsTitle', 'Detected Format / Warnings')}
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {importReport.warnings.map((warning) => (
                                      <span
                                        key={warning}
                                        className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-600"
                                      >
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

                    {latestMigrationReport && (
                      <div
                        ref={migrationReportRef}
                        className="import-report-card mt-5 p-5 rounded-2xl border animate-in fade-in zoom-in-95 duration-500 shadow-sm relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-sage-green)]/5 rounded-full blur-2xl pointer-events-none" />
                        <div className="flex items-start gap-4 relative z-10">
                          <div className="p-2 bg-[var(--color-sage-green)]/15 rounded-xl text-[var(--color-sage-green)] shrink-0">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm text-[var(--color-deep-navy)]">
                              {t('migrationReportTitle', 'Migration Report')}
                            </h4>
                            <p className="text-xs opacity-60 mt-1 mb-2">
                              {t(
                                'migrationReportDesc',
                                'Latest canonical migration preview generated during encrypted backup import.'
                              )}
                            </p>
                            <div className="space-y-2 mt-3 font-[var(--font-geist-mono)] text-xs">
                              <div className="flex justify-between items-center py-1.5 border-b border-[var(--color-deep-navy)]/10">
                                <span className="opacity-70">
                                  {t('migrationReportSource', 'Source')}
                                </span>
                                <span className="font-bold text-[var(--color-deep-navy)]">
                                  {latestMigrationReport.source}
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-1.5 border-b border-[var(--color-deep-navy)]/10">
                                <span className="opacity-70">
                                  {t('migrationReportTarget', 'Target')}
                                </span>
                                <span className="font-bold text-[var(--color-deep-navy)]">
                                  {latestMigrationReport.target}
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-1.5 border-b border-[var(--color-deep-navy)]/10">
                                <span className="opacity-70">
                                  {t('migrationReportRecords', 'Migrated records')}
                                </span>
                                <span className="font-bold text-[var(--color-sage-green)]">
                                  {latestMigrationReport.migratedRecords}
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-1.5">
                                <span className="opacity-70">
                                  {t('migrationReportGeneratedAt', 'Generated')}
                                </span>
                                <span className="font-bold text-[var(--color-deep-navy)]">
                                  {formatPairingTimestamp(latestMigrationReport.generatedAt)}
                                </span>
                              </div>
                            </div>
                            {!!latestMigrationReport.metadata?.conflictSummary && (
                              <div className="mt-4 rounded-2xl border border-[var(--color-sage-green)]/20 bg-[var(--color-sage-green)]/5 px-4 py-3">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-sage-green)]">
                                  {t('migrationReportConflictTitle', 'Migration Conflict Summary')}
                                </div>
                                <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                                  <div className="rounded-xl bg-white/60 px-3 py-2">
                                    <div className="opacity-60">
                                      {t('syncConflictReportIncoming', 'Incoming')}
                                    </div>
                                    <div className="mt-1 font-bold text-[var(--color-deep-navy)]">
                                      {String(
                                        (
                                          latestMigrationReport.metadata.conflictSummary as {
                                            incomingCount?: number;
                                          }
                                        ).incomingCount ?? 0
                                      )}
                                    </div>
                                  </div>
                                  <div className="rounded-xl bg-white/60 px-3 py-2">
                                    <div className="opacity-60">
                                      {t('syncConflictReportMatches', 'Existing matches')}
                                    </div>
                                    <div className="mt-1 font-bold text-[var(--color-sage-green)]">
                                      {String(
                                        (
                                          latestMigrationReport.metadata.conflictSummary as {
                                            duplicateCount?: number;
                                          }
                                        ).duplicateCount ?? 0
                                      )}
                                    </div>
                                  </div>
                                  <div className="rounded-xl bg-white/60 px-3 py-2">
                                    <div className="opacity-60">
                                      {t('syncConflictReportExact', 'Exact matches')}
                                    </div>
                                    <div className="mt-1 font-bold text-[var(--color-deep-navy)]">
                                      {String(
                                        (
                                          latestMigrationReport.metadata.conflictSummary as {
                                            exactMatchCount?: number;
                                          }
                                        ).exactMatchCount ?? 0
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'donation' && (
                <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in zoom-in-95 duration-500">
                  <div className="relative group max-w-xl w-full">
                    {/* Glowing golden background blur */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-400 via-violet-500 to-purple-600 rounded-[2.5rem] blur-xl opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-pulse"></div>

                    <div className="relative settings-panel backdrop-blur-xl border border-indigo-200/50 dark:border-indigo-700/30 p-10 rounded-[2rem] shadow-2xl flex flex-col items-center text-center overflow-hidden">
                      {/* Decorative elements */}
                      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl"></div>
                      <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-violet-600/20 rounded-full blur-2xl"></div>

                      <div className="relative w-20 h-20 mb-6 bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/40 dark:to-violet-900/40 rounded-2xl flex items-center justify-center shadow-inner border border-indigo-200/50 dark:border-indigo-700/50 transform group-hover:scale-110 transition-transform duration-500">
                        <Heart className="w-10 h-10 text-rose-500 fill-rose-500 animate-[pulse_2s_ease-in-out_infinite]" />
                        <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full animate-ping"></div>
                      </div>

                      <h3 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 mb-4">
                        {t('donateTitle', "Aegis Vault'u Destekleyin")}
                      </h3>

                      <p className="text-sm font-medium leading-relaxed opacity-90 max-w-md mb-8 text-[var(--color-deep-navy)] dark:text-gray-300">
                        {t(
                          'donateDesc',
                          'Geliştirme sürecine destek olarak yeni özelliklerin daha hızlı gelmesini ve projenin tamamen ücretsiz kalmasını sağlayabilirsiniz. Küçük bir katkı bile bizim için çok değerli!'
                        )}
                      </p>

                      <button
                        onClick={onDonationOpen}
                        className="relative overflow-hidden px-10 py-4 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-2xl text-base font-bold shadow-[0_0_40px_rgba(99,102,241,0.5)] hover:shadow-[0_0_60px_rgba(99,102,241,0.7)] transition-all active:scale-95 group/btn"
                      >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                        <span className="relative flex items-center gap-2">
                          <Heart className="w-5 h-5 fill-white" />
                          {t('donateBtn', 'Şimdi Destek Ol')}
                        </span>
                      </button>
                    </div>
                  </div>

                  <p className="mt-8 text-xs font-semibold uppercase tracking-widest opacity-40 text-center">
                    {t('donateFooter', 'Aegis Vault is 100% Open Source')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </GlowCard>
      </div>

      {/* Weak Passwords Popup */}
      {showWeakPasswordsPopup && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div
            className="absolute inset-0 bg-[var(--color-deep-navy)]/40 backdrop-blur-sm"
            onClick={() => setShowWeakPasswordsPopup(false)}
          />
          <GlowCard className="weak-passwords-surface max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-red-500/20 rounded-[2rem] p-6 relative z-10 shadow-2xl custom-scrollbar">
            <button
              onClick={() => setShowWeakPasswordsPopup(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 text-gray-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-red-100/50 rounded-xl text-red-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[var(--color-deep-navy)]">
                  {t('weakPasswordsReportTitle')}
                </h2>
                <p className="opacity-60 text-xs mt-0.5">{t('weakPasswordsReportDesc')}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {passwords
                .filter((p) => !p.pass || p.pass.length < 8 || (p.pwned_count || 0) > 0)
                .map((p) => (
                  <div
                    key={p.id}
                    className="settings-subpanel flex items-center justify-between p-4 rounded-xl shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl vault-entry-icon flex items-center justify-center shadow-sm shrink-0">
                        {getCategoryIcon(p.category)}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-[var(--color-deep-navy)]">
                            {p.title}
                          </span>
                          {(p.pwned_count || 0) > 0 && (
                            <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                              Pwned
                            </span>
                          )}
                        </div>
                        <span className="text-xs opacity-60 font-mono">{p.username}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span
                          className={`pass-font text-xs rounded-md select-all transition-all duration-300 ${visiblePasswords.has(p.id) ? 'bg-black/5 px-2 py-1 text-[var(--color-deep-navy)]' : 'tracking-[0.25em] opacity-40 select-none mt-1'}`}
                        >
                          {visiblePasswords.has(p.id) ? p.pass : '••••••••'}
                        </span>
                        <button
                          onClick={() => toggleVisibility(p.id)}
                          className="p-1.5 rounded-md hover:bg-black/5 text-[var(--color-deep-navy)]/40 hover:text-[var(--color-sage-green)] transition-all"
                        >
                          {visiblePasswords.has(p.id) ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <div className="w-px h-6 bg-black/10 mx-1" />
                      <button
                        onClick={() => {
                          onEditEntry({ ...p, pass: '' } as VaultEntry);
                          setShowWeakPasswordsPopup(false);
                          onClose();
                        }}
                        className="p-1.5 rounded-md hover:bg-black/5 text-gray-500 hover:text-[var(--color-sage-green)] transition-all"
                        title={t('editUpdatePassword')}
                      >
                        <Wand2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              {passwords.filter((p) => !p.pass || p.pass.length < 8 || (p.pwned_count || 0) > 0)
                .length === 0 && (
                <div className="text-center py-8 opacity-50 text-sm italic">
                  {t('noWeakPasswords')}
                </div>
              )}
            </div>
          </GlowCard>
        </div>
      )}
    </>
  );
}

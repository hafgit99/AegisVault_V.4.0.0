import { useState, lazy, Suspense } from 'react';
import {
  X,
  Wand2,
  Eye,
  EyeOff,
  ShieldCheck,
  Lock,
  Paperclip,
  FileUp,
  Tag,
  KeyRound,
  FileText,
  Camera,
  History,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useVault } from '../../contexts/VaultContext';
import {
  vaultService,
  type VaultCardDetails,
  type VaultEntry,
  type VaultIdentityDetails,
} from '../../vaultService';
import { parseOtpauthUri } from '../../lib/TOTPService';
import { VaultManager } from '../../lib/VaultManager';
import { TotpVaultPolicy } from '../../lib/TotpVaultPolicy';
import { SharedSpaceService } from '../../lib/SharedSpaceService';
import { AliasIdentityPanel } from '../settings/AliasIdentityPanel';
import {
  CryptoWalletVault,
  type CryptoWalletChain,
  type CryptoWalletCustodyMode,
} from '../../lib/wallet/CryptoWalletVault';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

const QRScannerLazy = lazy(() => import('./QRScanner').then((m) => ({ default: m.QRScanner })));

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
  const initialPasswordDecryptFailed =
    typeof initialEntry?.pass === 'string' &&
    initialEntry.pass.toUpperCase().includes('DECRYPT_ERROR');
  const sanitizedInitialEntry = initialEntry
    ? {
        ...initialEntry,
        pass: initialPasswordDecryptFailed ? '' : initialEntry.pass,
      }
    : null;

  const [newEntry, setNewEntry] = useState<Partial<VaultEntry>>(
    sanitizedInitialEntry || {
      title: '',
      username: '',
      pass: '',
      category: 'General',
      tags: [],
      totpSecret: '',
      notes: '',
    }
  );
  const [showPassword, setShowPassword] = useState(false);
  const [cryptoWalletDraft, setCryptoWalletDraft] = useState({
    chain: 'ethereum' as CryptoWalletChain,
    custodyMode: 'watch_only' as CryptoWalletCustodyMode,
    secretKind: 'seed_phrase' as 'seed_phrase' | 'private_key',
    derivationPath: '',
    lastKnownBalance: '',
    notes: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);
  const [totpInput, setTotpInput] = useState(initialEntry?.totpSecret || '');
  const [showTotpSection, setShowTotpSection] = useState(
    !!(initialEntry?.totpSecret || initialEntry?.totp_secret)
  );
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [sharedSpaces] = useState(() => SharedSpaceService.listSpaces());
  const existingAttachments = Array.isArray(newEntry.attachments) ? newEntry.attachments : [];
  const visibleExistingAttachments = existingAttachments.filter(
    (att) => !removedAttachmentIds.includes(att.id)
  );
  const activeProfile = VaultManager.getActiveProfile();
  const totpMode = TotpVaultPolicy.getMode();
  const isSeparateTotpMode = totpMode === 'separate_2fa_vault';
  const isInTwoFactorVault = TotpVaultPolicy.isTwoFactorVault(activeProfile?.id);
  const primarySharing = Array.isArray(newEntry.sharing) ? newEntry.sharing[0] : undefined;
  const initialPrimarySharing = Array.isArray(initialEntry?.sharing)
    ? initialEntry?.sharing[0]
    : undefined;
  const sharingFocusContext = initialEntry?.ui_focus_context;
  const sharingFocusLabel = initialEntry?.ui_focus_label;
  const [historyList, setHistoryList] = useState<VaultEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  useState(() => {
    if (initialEntry?.id) {
      setIsHistoryLoading(true);
      vaultService.decryptHistory(initialEntry as VaultEntry).then((list) => {
        setHistoryList(list);
        setIsHistoryLoading(false);
      });
    }
  });

  const handleRestore = (version: VaultEntry) => {
    if (window.confirm(t('restoreConfirm'))) {
      setNewEntry({
        ...newEntry,
        ...version,
        id: newEntry.id, // Keep current ID
        updated_at: new Date().toISOString(),
      });
      setTotpInput(version.totpSecret || '');
      setShowTotpSection(!!version.totpSecret);
      toast.success(t('itemRestored'));
    }
  };

  const updatePrimarySharing = (
    updater: (
      current: NonNullable<Partial<VaultEntry>['sharing']>[number]
    ) => NonNullable<Partial<VaultEntry>['sharing']>[number] | null
  ) => {
    setNewEntry((prev) => {
      const current =
        Array.isArray(prev.sharing) && prev.sharing[0]
          ? prev.sharing[0]
          : {
              space_id: '',
              role: 'viewer' as const,
              is_sensitive: false,
              emergency_access: false,
              notes: '',
            };
      const next = updater(current);
      return {
        ...prev,
        sharing: next ? [next] : undefined,
      };
    });
  };

  const hasPrimarySharingChanged = () => {
    const normalize = (value?: typeof primarySharing) =>
      value
        ? {
            space_id: value.space_id || '',
            role: value.role || 'viewer',
            is_sensitive: Boolean(value.is_sensitive),
            emergency_access: Boolean(value.emergency_access),
            notes: value.notes || '',
          }
        : null;

    return (
      JSON.stringify(normalize(primarySharing)) !== JSON.stringify(normalize(initialPrimarySharing))
    );
  };

  const isNoteCategory = newEntry.category === 'Notes';
  const isWifiCategory = newEntry.category === 'WiFi';
  const isPasskeyCategory = newEntry.category === 'Passkeys';
  const isCardCategory = newEntry.category === 'Cards';
  const isIdentityCategory = newEntry.category === 'Identities';
  const isCryptoWalletCategory = newEntry.category === CryptoWalletVault.category;
  const cryptoAddressValue = newEntry.username || '';
  const hasCryptoAddressInput = cryptoAddressValue.trim().length > 0;
  const isCryptoAddressValid =
    isCryptoWalletCategory &&
    hasCryptoAddressInput &&
    CryptoWalletVault.validateAddress(cryptoWalletDraft.chain, cryptoAddressValue);
  const requiresPasswordRepair = Boolean(initialEntry?.id && initialPasswordDecryptFailed);
  const hasTitle = Boolean(newEntry.title?.trim());
  const hasIdentity = Boolean((newEntry.username || '').trim() || isNoteCategory);
  const hasSecretMaterial = Boolean(
    isCryptoWalletCategory ? hasCryptoAddressInput : (newEntry.pass || '').trim() || isNoteCategory
  );
  const hasPrivacyLayer = Boolean(primarySharing?.space_id || newEntry.aliasDetails?.email);
  const hasTotpLayer = Boolean(newEntry.totpSecret || showTotpSection);
  const hasNotesOrAttachments = Boolean(
    (newEntry.notes || cryptoWalletDraft.notes || '').trim() ||
    newAttachments.length > 0 ||
    visibleExistingAttachments.length > 0
  );
  const formSignals = [
    { label: t('entrySignalBasics', 'Temel'), done: hasTitle && hasIdentity },
    {
      label: isCryptoWalletCategory
        ? t('entrySignalAddress', 'Adres')
        : t('entrySignalSecret', 'Sır'),
      done: hasSecretMaterial,
    },
    { label: t('entrySignalPrivacy', 'Gizlilik'), done: hasPrivacyLayer },
    { label: t('entrySignal2fa', '2FA'), done: hasTotpLayer },
    { label: t('entrySignalNotes', 'Not/Ek'), done: hasNotesOrAttachments },
  ];

  const updatePasskeyMetadata = (updates: Record<string, string>) => {
    setNewEntry((prev) => ({
      ...prev,
      passkeyMetadata: {
        mode: prev.passkeyMetadata?.mode || 'site_passkey_mvp',
        ...prev.passkeyMetadata,
        ...updates,
      },
    }));
  };

  const updateCardDetails = (updates: Partial<VaultCardDetails>) => {
    setNewEntry((prev) => ({
      ...prev,
      cardDetails: {
        ...(prev.cardDetails || {}),
        ...updates,
      },
    }));
  };

  const updateIdentityDetails = (updates: Partial<VaultIdentityDetails>) => {
    setNewEntry((prev) => ({
      ...prev,
      identityDetails: {
        ...(prev.identityDetails || {}),
        ...updates,
      },
    }));
  };

  const generateSecurePassword = () => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+=-';
    const array = new Uint32Array(18);
    window.crypto.getRandomValues(array);
    const pass = Array.from(array)
      .map((n) => charset[n % charset.length])
      .join('');
    setNewEntry((prev) => ({ ...prev, pass }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles = files.filter((f) => {
        if (f.size > 50 * 1024 * 1024) {
          toast.error(t('fileTooLarge', { name: f.name }));
          return false;
        }
        return true;
      });
      setNewAttachments((prev) => [...prev, ...validFiles]);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Edit modunda kaldırılan mevcut ekleri fiziksel olarak da sil
    if (newEntry.id && removedAttachmentIds.length > 0) {
      for (const attachmentId of removedAttachmentIds) {
        try {
          await vaultService.deleteAttachment(newEntry.id as number, attachmentId);
        } catch (error: unknown) {
          const message =
            error instanceof Error
              ? error.message
              : t('deleteAttachmentFailed', 'Failed to delete attachment');
          toast.error(message || t('deleteAttachmentFailed', 'Failed to delete attachment'));
        }
      }
    }

    const cryptoWalletPayload = isCryptoWalletCategory
      ? CryptoWalletVault.fromDraft({
          name: newEntry.title || '',
          chain: cryptoWalletDraft.chain,
          publicAddress: newEntry.username || '',
          custodyMode: cryptoWalletDraft.custodyMode,
          secretKind:
            cryptoWalletDraft.custodyMode === 'watch_only' ? 'none' : cryptoWalletDraft.secretKind,
          secretMaterial: newEntry.pass || '',
          derivationPath: cryptoWalletDraft.derivationPath,
          lastKnownBalance: cryptoWalletDraft.lastKnownBalance,
          notes: cryptoWalletDraft.notes || newEntry.notes || '',
        })
      : null;

    if (isCryptoWalletCategory) {
      if (!newEntry.title?.trim()) {
        toast.error(t('cryptoWalletNameRequired'));
        return;
      }

      if (!CryptoWalletVault.validateAddress(cryptoWalletDraft.chain, newEntry.username || '')) {
        toast.error(t('cryptoWalletAddressInvalid'));
        return;
      }

      if (cryptoWalletDraft.custodyMode === 'vault_secret' && !newEntry.pass?.trim()) {
        toast.error(t('cryptoWalletSecretRequired'));
        return;
      }
    }

    if (requiresPasswordRepair && !newEntry.pass?.trim()) {
      toast.error(t('passwordRepairRequired'));
      return;
    }

    const payload: Partial<VaultEntry> = {
      ...(cryptoWalletPayload || newEntry),
      attachments: visibleExistingAttachments,
      sharing:
        !isCryptoWalletCategory && primarySharing && primarySharing.space_id
          ? [
              {
                ...primarySharing,
                space_id: primarySharing.space_id,
                last_reviewed_at: hasPrimarySharingChanged()
                  ? new Date().toISOString()
                  : primarySharing.last_reviewed_at,
              },
            ]
          : undefined,
    };

    if (!isCryptoWalletCategory && isSeparateTotpMode && !isInTwoFactorVault) {
      payload.totpSecret = '';
      payload.totp_issuer = '';
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
        className="entry-form-surface v5-entry-form flex flex-col gap-4 p-5 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-4 duration-300"
      >
        <div className="v5-entry-form-header flex justify-between items-start gap-4 mb-1">
          <div>
            <span className="v5-section-kicker">{t('v5EntryRecord')}</span>
            <h3 className="mt-2 font-semibold text-[var(--color-deep-navy)]">
              {t('createZeroKnowledgeEntry')}
            </h3>
            <p className="mt-1 text-xs leading-5 text-[var(--color-deep-navy)]/60 dark:text-white/60">
              {t('v5EntryRecordDesc')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md entry-action-btn-muted"
            aria-label={t('close', 'Close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {sharingFocusContext ? (
          <div className="rounded-2xl border border-[var(--color-sage-green)]/20 bg-[var(--color-sage-green)]/10 px-4 py-3 text-sm text-[var(--color-deep-navy)] dark:border-[var(--color-sage-green)]/25 dark:bg-[var(--color-sage-green)]/10 dark:text-white">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-sage-green)]">
              {sharingFocusContext === 'sharing_audit'
                ? t('entryFormFocusAuditTitle')
                : t('entryFormFocusIssueTitle')}
            </div>
            <div className="mt-1 text-xs opacity-80">
              {t('entryFormFocusDescription', {
                target: sharingFocusLabel || newEntry.title || t('sharingAuditUnknown'),
              })}
            </div>
          </div>
        ) : null}

        <div className="v5-entry-progress-strip">
          <div>
            <span className="v5-entry-progress-kicker">{t('entryFormProgressKicker')}</span>
            <strong>{t('entryFormProgressTitle')}</strong>
          </div>
          <div className="v5-entry-progress-chips">
            {formSignals.map((signal) => (
              <span
                key={signal.label}
                className={`v5-entry-progress-chip ${signal.done ? 'v5-entry-progress-chip-done' : ''}`}
              >
                {signal.done ? <CheckCircle2 className="h-3 w-3" /> : null}
                {signal.label}
              </span>
            ))}
          </div>
        </div>

        <div className="v5-entry-grid grid grid-cols-2 gap-4">
          <input
            required
            type="text"
            placeholder={
              newEntry.category === 'Cards'
                ? t('placeholderCardTitle')
                : newEntry.category === 'Identities'
                  ? t('placeholderIdentityTitle')
                  : newEntry.category === 'Passkeys'
                    ? t('placeholderPasskeyTitle')
                    : newEntry.category === 'Notes'
                      ? t('placeholderNoteTitle')
                      : newEntry.category === 'WiFi'
                        ? t('placeholderWifiTitle')
                        : isCryptoWalletCategory
                          ? t('cryptoWalletNamePlaceholder')
                          : t('titlePlaceholder')
            }
            value={newEntry.title}
            onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
            className="entry-field col-span-1 rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
          />
          <select
            value={newEntry.category}
            onChange={(e) =>
              setNewEntry((prev) => ({
                ...prev,
                category: e.target.value,
                cardDetails:
                  e.target.value === 'Cards'
                    ? {
                        card_number: prev.cardDetails?.card_number || prev.pass || '',
                        cardholder_name: prev.cardDetails?.cardholder_name || prev.username || '',
                        brand: prev.cardDetails?.brand || '',
                        expiry_month: prev.cardDetails?.expiry_month || '',
                        expiry_year: prev.cardDetails?.expiry_year || '',
                        cvv: prev.cardDetails?.cvv || '',
                        pin: prev.cardDetails?.pin || '',
                        billing_zip: prev.cardDetails?.billing_zip || '',
                        billing_address: prev.cardDetails?.billing_address || '',
                      }
                    : prev.cardDetails,
                identityDetails:
                  e.target.value === 'Identities'
                    ? {
                        document_type: prev.identityDetails?.document_type || '',
                        identity_number:
                          prev.identityDetails?.identity_number || prev.website || '',
                        issuing_country: prev.identityDetails?.issuing_country || '',
                        nationality: prev.identityDetails?.nationality || '',
                        date_of_birth: prev.identityDetails?.date_of_birth || '',
                        issued_at: prev.identityDetails?.issued_at || '',
                        expires_at: prev.identityDetails?.expires_at || '',
                      }
                    : prev.identityDetails,
                passkeyMetadata:
                  e.target.value === 'Passkeys'
                    ? {
                        mode: prev.passkeyMetadata?.mode || 'site_passkey_mvp',
                        credential_id: prev.passkeyMetadata?.credential_id || prev.pass || '',
                        rp_id: prev.passkeyMetadata?.rp_id || '',
                        display_name: prev.passkeyMetadata?.display_name || prev.title || '',
                        user_handle: prev.passkeyMetadata?.user_handle || prev.username || '',
                      }
                    : prev.passkeyMetadata,
              }))
            }
            className="entry-field col-span-1 rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
          >
            <option value="General">{t('general')}</option>
            <option value="Cards">{t('cards')}</option>
            <option value="Identities">{t('identities')}</option>
            <option value="Passkeys">{t('passkeys')}</option>
            <option value="Notes">{t('notes')}</option>
            <option value="WiFi">{t('wifi')}</option>
            <option value={CryptoWalletVault.category}>{t('cryptowallet')}</option>
          </select>

          {isCryptoWalletCategory && (
            <div className="v5-entry-section col-span-2 rounded-xl border border-[var(--color-sage-green)]/20 bg-[var(--color-sage-green)]/5 p-4">
              <div className="mb-3 text-[10px] uppercase font-bold tracking-widest text-[var(--color-sage-green)]">
                {t('cryptoVaultKicker')}
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <select
                  value={cryptoWalletDraft.chain}
                  onChange={(e) =>
                    setCryptoWalletDraft((prev) => ({
                      ...prev,
                      chain: e.target.value as CryptoWalletChain,
                    }))
                  }
                  className="entry-field rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
                >
                  <option value="bitcoin">Bitcoin</option>
                  <option value="ethereum">Ethereum / EVM</option>
                  <option value="solana">Solana</option>
                  <option value="tron">Tron</option>
                  <option value="litecoin">Litecoin</option>
                  <option value="other">Other</option>
                </select>
                <select
                  value={cryptoWalletDraft.custodyMode}
                  onChange={(e) =>
                    setCryptoWalletDraft((prev) => ({
                      ...prev,
                      custodyMode: e.target.value as CryptoWalletCustodyMode,
                    }))
                  }
                  className="entry-field rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
                >
                  <option value="watch_only">{t('cryptoWalletWatchOnly')}</option>
                  <option value="vault_secret">{t('cryptoWalletVaultSecret')}</option>
                </select>
                <div className="md:col-span-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs leading-5 text-[var(--color-deep-navy)]/70 dark:text-sky-100/80">
                  {t('cryptoWalletWatchOnlyDefaultHint')}
                </div>
                <input
                  required
                  type="text"
                  placeholder={t('cryptoWalletAddressPlaceholder')}
                  value={newEntry.username || ''}
                  onChange={(e) => setNewEntry({ ...newEntry, username: e.target.value })}
                  className="entry-field md:col-span-2 rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
                />
                {hasCryptoAddressInput && (
                  <div
                    className={`md:col-span-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
                      isCryptoAddressValid
                        ? 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
                        : 'border border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-200'
                    }`}
                  >
                    {isCryptoAddressValid ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    )}
                    {isCryptoAddressValid
                      ? t('cryptoWalletAddressValid')
                      : t('cryptoWalletAddressInvalidInline')}
                  </div>
                )}
                <input
                  type="text"
                  placeholder="m/44'/60'/0'/0/0"
                  value={cryptoWalletDraft.derivationPath}
                  onChange={(e) =>
                    setCryptoWalletDraft((prev) => ({
                      ...prev,
                      derivationPath: e.target.value,
                    }))
                  }
                  className="entry-field rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
                />
                <input
                  type="text"
                  placeholder="0.0000 ETH"
                  value={cryptoWalletDraft.lastKnownBalance}
                  onChange={(e) =>
                    setCryptoWalletDraft((prev) => ({
                      ...prev,
                      lastKnownBalance: e.target.value,
                    }))
                  }
                  className="entry-field rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
                />
                {cryptoWalletDraft.custodyMode === 'vault_secret' && (
                  <>
                    <div className="md:col-span-2 flex gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-800 dark:text-amber-100/85">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{t('cryptoWalletSecretRiskNotice')}</span>
                    </div>
                    <select
                      value={cryptoWalletDraft.secretKind}
                      onChange={(e) =>
                        setCryptoWalletDraft((prev) => ({
                          ...prev,
                          secretKind: e.target.value as 'seed_phrase' | 'private_key',
                        }))
                      }
                      className="entry-field rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
                    >
                      <option value="seed_phrase">{t('cryptoWalletSeedPhrase')}</option>
                      <option value="private_key">{t('cryptoWalletPrivateKey')}</option>
                    </select>
                    <textarea
                      required
                      placeholder={t('cryptoWalletSecretPlaceholder')}
                      value={newEntry.pass || ''}
                      onChange={(e) => setNewEntry({ ...newEntry, pass: e.target.value })}
                      className="entry-field md:col-span-2 rounded-lg py-2.5 px-3 text-sm font-medium outline-none resize-none min-h-[92px]"
                    />
                  </>
                )}
                <textarea
                  placeholder={t('cryptoWalletNotesPlaceholder')}
                  value={cryptoWalletDraft.notes}
                  onChange={(e) =>
                    setCryptoWalletDraft((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="entry-field md:col-span-2 rounded-lg py-2.5 px-3 text-sm font-medium outline-none resize-none"
                />
              </div>
              <p className="mt-3 text-xs leading-5 text-[var(--color-deep-navy)]/60 dark:text-white/60">
                {t('cryptoWalletNoSigningNotice')}
              </p>
            </div>
          )}

          {!isNoteCategory && !isPasskeyCategory && !isCryptoWalletCategory && (
            <input
              type="text"
              placeholder={
                newEntry.category === 'Cards'
                  ? t('placeholderCardUser')
                  : newEntry.category === 'Identities'
                    ? t('placeholderIdentityUser')
                    : isWifiCategory
                      ? t('placeholderWifiUser')
                      : t('usernameEmailPlaceholder')
              }
              value={newEntry.username}
              onChange={(e) => setNewEntry({ ...newEntry, username: e.target.value })}
              className="entry-field col-span-2 rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
            />
          )}

          {!isNoteCategory && !isPasskeyCategory && !isCryptoWalletCategory && (
            <input
              type="text"
              placeholder={
                newEntry.category === 'Cards'
                  ? t('placeholderCardUrl')
                  : newEntry.category === 'Identities'
                    ? t('placeholderIdentityUrl')
                    : isWifiCategory
                      ? t('placeholderWifiUrl')
                      : t('placeholderUrl')
              }
              value={newEntry.website || ''}
              onChange={(e) => setNewEntry({ ...newEntry, website: e.target.value })}
              className="entry-field col-span-2 rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
            />
          )}

          {!isCryptoWalletCategory && (
            <div className="col-span-2 flex flex-col gap-2">
              <div className="relative flex items-center">
                {isNoteCategory ? (
                  <textarea
                    required
                    placeholder={t('placeholderNotePass')}
                    value={newEntry.pass || ''}
                    onChange={(e) => setNewEntry({ ...newEntry, pass: e.target.value })}
                    className="entry-field w-full rounded-lg py-2.5 px-3 h-32 text-sm font-medium outline-none resize-none overflow-y-auto"
                  />
                ) : (
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    placeholder={
                      requiresPasswordRepair
                        ? t('passwordRepairPlaceholder')
                        : newEntry.category === 'Cards'
                          ? t('placeholderCardPass')
                          : newEntry.category === 'Identities'
                            ? t('placeholderIdentityPass')
                            : isWifiCategory
                              ? t('placeholderWifiPass')
                              : isPasskeyCategory
                                ? t('placeholderPasskeyCredentialId')
                                : t('securePassword')
                    }
                    value={newEntry.pass || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewEntry((prev) => ({
                        ...prev,
                        pass: value,
                        cardDetails: isCardCategory
                          ? {
                              ...(prev.cardDetails || {}),
                              card_number: prev.cardDetails?.card_number || value,
                            }
                          : prev.cardDetails,
                        passkeyMetadata: isPasskeyCategory
                          ? {
                              mode: prev.passkeyMetadata?.mode || 'site_passkey_mvp',
                              ...prev.passkeyMetadata,
                              credential_id: value,
                            }
                          : prev.passkeyMetadata,
                      }));
                    }}
                    className="entry-field w-full rounded-lg py-2.5 pl-3 pr-20 text-sm font-medium outline-none pass-font"
                  />
                )}

                {!isNoteCategory && !isPasskeyCategory && (
                  <div className="absolute right-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={generateSecurePassword}
                      className="p-1.5 rounded-md entry-action-btn-muted transition-colors"
                      title={t('generateSecurePasswordBtn')}
                      aria-label={t('generateSecurePasswordBtn')}
                    >
                      <Wand2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1.5 rounded-md entry-action-btn-muted transition-colors"
                      title={showPassword ? t('hidePassword') : t('showPassword')}
                      aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>

              {requiresPasswordRepair ? (
                <div className="flex gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-800 dark:text-amber-100/85">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{t('passwordRepairNotice')}</span>
                </div>
              ) : null}
            </div>
          )}

          {/* Tags Input */}
          <div className="col-span-2 flex flex-col gap-2">
            <input
              type="text"
              placeholder={t('addTagPlaceholder')}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && tagInput.trim()) {
                  e.preventDefault();
                  if (!newEntry.tags?.includes(tagInput.trim())) {
                    setNewEntry((prev) => ({
                      ...prev,
                      tags: [...(prev.tags || []), tagInput.trim()],
                    }));
                  }
                  setTagInput('');
                }
              }}
              className="entry-field rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
            />
            {newEntry.tags && newEntry.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {newEntry.tags.map((tg) => (
                  <span
                    key={tg}
                    className="entry-tag-chip px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1"
                  >
                    <Tag className="w-3 h-3" /> {tg}
                    <button
                      type="button"
                      onClick={() =>
                        setNewEntry((prev) => ({
                          ...prev,
                          tags: prev.tags?.filter((tag) => tag !== tg),
                        }))
                      }
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sharing Assignment */}
          <div className="v5-entry-section col-span-2 rounded-xl border border-[var(--color-sage-green)]/20 bg-[var(--color-sage-green)]/5 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-sage-green)]">
                  {t('entrySharingTitle')}
                </div>
                <p className="mt-1 text-xs text-[var(--color-deep-navy)]/65">
                  {t('entrySharingDesc')}
                </p>
              </div>
              <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-[var(--color-deep-navy)]/65">
                {t('entrySharingSpacesCount', { count: sharedSpaces.length })}
              </span>
            </div>

            {sharedSpaces.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--color-sage-green)]/25 px-3 py-2 text-xs text-[var(--color-deep-navy)]/60">
                {t('entrySharingNoSpaces')}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <select
                    value={primarySharing?.space_id || ''}
                    onChange={(e) => {
                      const nextSpaceId = e.target.value;
                      if (!nextSpaceId) {
                        setNewEntry((prev) => ({ ...prev, sharing: undefined }));
                        return;
                      }
                      updatePrimarySharing((current) => ({
                        ...current,
                        space_id: nextSpaceId,
                      }));
                    }}
                    className="entry-field rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
                  >
                    <option value="">{t('entrySharingSpacePlaceholder')}</option>
                    {sharedSpaces.map((space) => (
                      <option key={space.id} value={space.id}>
                        {space.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={primarySharing?.role || 'viewer'}
                    onChange={(e) =>
                      updatePrimarySharing((current) =>
                        current.space_id
                          ? {
                              ...current,
                              role: e.target.value === 'editor' ? 'editor' : 'viewer',
                            }
                          : null
                      )
                    }
                    disabled={!primarySharing?.space_id}
                    className="entry-field rounded-lg py-2.5 px-3 text-sm font-medium outline-none disabled:opacity-50"
                  >
                    <option value="viewer">{t('entrySharingRoleViewer')}</option>
                    <option value="editor">{t('entrySharingRoleEditor')}</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="flex items-center gap-2 rounded-lg border border-black/5 bg-white/60 px-3 py-2 text-xs font-medium text-[var(--color-deep-navy)]/75">
                    <input
                      type="checkbox"
                      checked={Boolean(primarySharing?.is_sensitive)}
                      disabled={!primarySharing?.space_id}
                      onChange={(e) =>
                        updatePrimarySharing((current) =>
                          current.space_id
                            ? {
                                ...current,
                                is_sensitive: e.target.checked,
                              }
                            : null
                        )
                      }
                    />
                    {t('entrySharingSensitive')}
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-black/5 bg-white/60 px-3 py-2 text-xs font-medium text-[var(--color-deep-navy)]/75">
                    <input
                      type="checkbox"
                      checked={Boolean(primarySharing?.emergency_access)}
                      disabled={!primarySharing?.space_id}
                      onChange={(e) =>
                        updatePrimarySharing((current) =>
                          current.space_id
                            ? {
                                ...current,
                                emergency_access: e.target.checked,
                              }
                            : null
                        )
                      }
                    />
                    {t('entrySharingEmergency')}
                  </label>
                </div>

                <textarea
                  rows={2}
                  value={primarySharing?.notes || ''}
                  disabled={!primarySharing?.space_id}
                  onChange={(e) =>
                    updatePrimarySharing((current) =>
                      current.space_id
                        ? {
                            ...current,
                            notes: e.target.value,
                          }
                        : null
                    )
                  }
                  placeholder={t('entrySharingNotesPlaceholder')}
                  className="entry-field rounded-lg py-2.5 px-3 text-sm font-medium outline-none disabled:opacity-50"
                />
              </div>
            )}
          </div>

          {!isNoteCategory && !isPasskeyCategory && !isCryptoWalletCategory ? (
            <AliasIdentityPanel entry={newEntry} setEntry={setNewEntry} />
          ) : null}

          {isPasskeyCategory ? (
            <>
              <input
                type="text"
                placeholder={t('passkeyRpIdPlaceholder')}
                value={newEntry.passkeyMetadata?.rp_id || ''}
                onChange={(e) => updatePasskeyMetadata({ rp_id: e.target.value })}
                className="entry-field col-span-2 rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
              />
              <input
                type="text"
                placeholder={t('passkeyDisplayNamePlaceholder')}
                value={newEntry.passkeyMetadata?.display_name || ''}
                onChange={(e) => updatePasskeyMetadata({ display_name: e.target.value })}
                className="entry-field col-span-2 rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
              />
              <input
                type="text"
                placeholder={t('passkeyUserHandlePlaceholder')}
                value={newEntry.passkeyMetadata?.user_handle || ''}
                onChange={(e) => updatePasskeyMetadata({ user_handle: e.target.value })}
                className="entry-field col-span-2 rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
              />
              <select
                value={newEntry.passkeyMetadata?.mode || 'site_passkey_mvp'}
                onChange={(e) => updatePasskeyMetadata({ mode: e.target.value })}
                className="entry-field col-span-2 rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
              >
                <option value="site_passkey_mvp">{t('passkeyModeSiteMvp')}</option>
                <option value="vault_unlock">{t('passkeyModeVaultUnlock')}</option>
                <option value="site_passkey_future_rp">{t('passkeyModeFutureRp')}</option>
              </select>
            </>
          ) : null}

          {isCardCategory ? (
            <div className="v5-entry-section col-span-2 rounded-xl border border-[var(--color-sage-green)]/20 bg-[var(--color-sage-green)]/5 p-4">
              <div className="mb-3 text-[10px] uppercase font-bold tracking-widest text-[var(--color-sage-green)]">
                {t('cardDetailsSectionTitle')}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder={t('cardholderNamePlaceholder')}
                  value={newEntry.cardDetails?.cardholder_name || ''}
                  onChange={(e) => updateCardDetails({ cardholder_name: e.target.value })}
                  className="entry-field col-span-2 rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
                />
                <input
                  type="text"
                  placeholder={t('cardNumberPlaceholder')}
                  value={newEntry.cardDetails?.card_number || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateCardDetails({ card_number: value });
                    if (!(newEntry.pass || '').trim()) {
                      setNewEntry((prev) => ({ ...prev, pass: value }));
                    }
                  }}
                  className="entry-field col-span-2 rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
                />
                <select
                  value={newEntry.cardDetails?.brand || ''}
                  onChange={(e) => updateCardDetails({ brand: e.target.value })}
                  className="entry-field rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
                >
                  <option value="">{t('cardBrandPlaceholder')}</option>
                  <option value="visa">{t('cardBrandVisa')}</option>
                  <option value="mastercard">{t('cardBrandMastercard')}</option>
                  <option value="amex">{t('cardBrandAmex')}</option>
                  <option value="discover">{t('cardBrandDiscover')}</option>
                  <option value="other">{t('cardBrandOther')}</option>
                </select>
                <input
                  type="text"
                  placeholder={t('cardExpiryMonthPlaceholder')}
                  value={newEntry.cardDetails?.expiry_month || ''}
                  onChange={(e) => updateCardDetails({ expiry_month: e.target.value })}
                  className="entry-field rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
                />
                <input
                  type="text"
                  placeholder={t('cardExpiryYearPlaceholder')}
                  value={newEntry.cardDetails?.expiry_year || ''}
                  onChange={(e) => updateCardDetails({ expiry_year: e.target.value })}
                  className="entry-field rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
                />
                <input
                  type="text"
                  placeholder={t('cardCvvPlaceholder')}
                  value={newEntry.cardDetails?.cvv || ''}
                  onChange={(e) => updateCardDetails({ cvv: e.target.value })}
                  className="entry-field rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
                />
                <input
                  type="text"
                  placeholder={t('cardPinPlaceholder')}
                  value={newEntry.cardDetails?.pin || ''}
                  onChange={(e) => updateCardDetails({ pin: e.target.value })}
                  className="entry-field rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
                />
                <input
                  type="text"
                  placeholder={t('cardBillingZipPlaceholder')}
                  value={newEntry.cardDetails?.billing_zip || ''}
                  onChange={(e) => updateCardDetails({ billing_zip: e.target.value })}
                  className="entry-field rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
                />
                <textarea
                  rows={2}
                  placeholder={t('cardBillingAddressPlaceholder')}
                  value={newEntry.cardDetails?.billing_address || ''}
                  onChange={(e) => updateCardDetails({ billing_address: e.target.value })}
                  className="entry-field col-span-2 rounded-lg py-2.5 px-3 text-sm font-medium outline-none resize-none"
                />
              </div>
            </div>
          ) : null}

          {isIdentityCategory ? (
            <div className="v5-entry-section col-span-2 rounded-xl border border-[var(--color-sage-green)]/20 bg-[var(--color-sage-green)]/5 p-4">
              <div className="mb-3 text-[10px] uppercase font-bold tracking-widest text-[var(--color-sage-green)]">
                {t('identityDetailsSectionTitle')}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={newEntry.identityDetails?.document_type || ''}
                  onChange={(e) => updateIdentityDetails({ document_type: e.target.value })}
                  className="entry-field col-span-2 rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
                >
                  <option value="">{t('identityDocumentTypePlaceholder')}</option>
                  <option value="national_id">{t('identityDocumentTypeNationalId')}</option>
                  <option value="passport">{t('identityDocumentTypePassport')}</option>
                  <option value="driver_license">{t('identityDocumentTypeDriverLicense')}</option>
                  <option value="residence_permit">
                    {t('identityDocumentTypeResidencePermit')}
                  </option>
                  <option value="other">{t('identityDocumentTypeOther')}</option>
                </select>
                <input
                  type="text"
                  placeholder={t('identityNumberPlaceholder')}
                  value={newEntry.identityDetails?.identity_number || ''}
                  onChange={(e) => updateIdentityDetails({ identity_number: e.target.value })}
                  className="entry-field col-span-2 rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
                />
                <input
                  type="text"
                  placeholder={t('identityIssuingCountryPlaceholder')}
                  value={newEntry.identityDetails?.issuing_country || ''}
                  onChange={(e) => updateIdentityDetails({ issuing_country: e.target.value })}
                  className="entry-field rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
                />
                <input
                  type="text"
                  placeholder={t('identityNationalityPlaceholder')}
                  value={newEntry.identityDetails?.nationality || ''}
                  onChange={(e) => updateIdentityDetails({ nationality: e.target.value })}
                  className="entry-field rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
                />
                <input
                  type="text"
                  placeholder={t('identityBirthDatePlaceholder')}
                  value={newEntry.identityDetails?.date_of_birth || ''}
                  onChange={(e) => updateIdentityDetails({ date_of_birth: e.target.value })}
                  className="entry-field rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
                />
                <input
                  type="text"
                  placeholder={t('identityIssuedAtPlaceholder')}
                  value={newEntry.identityDetails?.issued_at || ''}
                  onChange={(e) => updateIdentityDetails({ issued_at: e.target.value })}
                  className="entry-field rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
                />
                <input
                  type="text"
                  placeholder={t('identityExpiresAtPlaceholder')}
                  value={newEntry.identityDetails?.expires_at || ''}
                  onChange={(e) => updateIdentityDetails({ expires_at: e.target.value })}
                  className="entry-field col-span-2 rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
                />
              </div>
            </div>
          ) : null}

          {/* TOTP 2FA Section */}
          {newEntry.category !== 'Notes' && !isCryptoWalletCategory && (
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
                  <KeyRound className="w-3.5 h-3.5" /> {t('addTOTP', 'Add 2FA (TOTP)')}
                </button>
              ) : (
                <div className="entry-totp-box v5-totp-box rounded-xl p-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-blue-600 flex items-center gap-1">
                      <KeyRound className="w-3 h-3" /> {t('totpSetup', 'TOTP Setup')}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTotpSection(false);
                        setTotpInput('');
                        setNewEntry((prev) => ({
                          ...prev,
                          totpSecret: '',
                          totp_issuer: '',
                          totp_algorithm: undefined,
                          totp_digits: undefined,
                          totp_period: undefined,
                        }));
                      }}
                      className="p-1 rounded-md entry-action-btn-muted"
                      aria-label={t('closeTotpSetupAria', 'Close TOTP setup')}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={t('totpPlaceholder', 'otpauth://totp/... or Base32 secret key')}
                      value={totpInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTotpInput(val);

                        // otpauth:// URI otomatik parse
                        if (val.startsWith('otpauth://')) {
                          try {
                            const params = parseOtpauthUri(val);
                            setNewEntry((prev) => ({
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
                          setNewEntry((prev) => ({
                            ...prev,
                            totpSecret: val.replace(/\s/g, '').toUpperCase(),
                            totp_algorithm: 'SHA-1',
                            totp_digits: 6,
                            totp_period: 30,
                          }));
                        }
                      }}
                      className="entry-field flex-1 rounded-lg py-2 px-3 text-sm font-mono outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowQRScanner(true)}
                      className="px-3 py-2 rounded-lg totp-btn-secondary transition-all border border-[var(--color-sage-green)]/20 flex items-center gap-1.5 text-xs font-bold"
                      title={t('scanQR', 'Scan QR Code')}
                      aria-label={t('scanQR', 'Scan QR Code')}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      QR
                    </button>
                  </div>
                  {newEntry.totpSecret && (
                    <div className="flex items-center gap-3 text-[10px] text-blue-600/70">
                      <span>✓ {newEntry.totp_issuer || 'Manual'}</span>
                      <span>• {newEntry.totp_algorithm || 'SHA-1'}</span>
                      <span>• {newEntry.totp_digits || 6} digits</span>
                      <span>• {newEntry.totp_period || 30}s</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Secure Notes & Attachment Upload */}
          <div className="v5-secure-notes-block v5-notes-attachments-block col-span-2">
            {newEntry.category !== 'Notes' && !isCryptoWalletCategory && (
              <div className="v5-notes-panel">
                <div className="mb-2 flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] uppercase font-bold tracking-widest text-amber-600">
                    {t('secureNotes', 'Secure Notes')}
                  </span>
                </div>
                <textarea
                  placeholder={t('secureNotesPlaceholder', 'Add encrypted notes (optional)...')}
                  value={newEntry.notes || ''}
                  onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                  className="entry-field w-full rounded-lg py-2.5 px-3 text-sm font-medium outline-none resize-none overflow-y-auto"
                />
              </div>
            )}

            <div className="v5-attachment-block">
              <div className="mb-3 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <FileUp className="h-3.5 w-3.5 text-[var(--color-sage-green)]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-sage-green)]">
                    {t('encryptedAttachments', 'Şifreli ekler')}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-[var(--color-deep-navy)]/55 dark:text-white/55">
                  {t('attachmentMaxSize', 'Maks. 50MB')}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    id="aegis-file-upload"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <label
                    htmlFor="aegis-file-upload"
                    className="v5-upload-trigger cursor-pointer text-xs flex items-center gap-1.5 px-3 py-2 totp-btn-secondary transition-all font-bold rounded-lg border border-[var(--color-sage-green)]/30"
                  >
                    <Paperclip className="w-3.5 h-3.5" /> {t('uploadAttachment')}
                  </label>
                </div>
                {newAttachments.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-2 p-2 entry-notes-box rounded-lg shadow-inner">
                    <div className="text-[10px] uppercase font-bold text-yellow-600 tracking-wider flex items-center gap-1">
                      <Lock className="w-3 h-3" /> {t('encryptedQueue')}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {newAttachments.map((file, i) => (
                        <div
                          key={i}
                          className="text-xs flex items-center gap-2 entry-attachment-item px-2 py-1 rounded shadow-sm"
                        >
                          <FileUp className="w-3 h-3 text-blue-500" />
                          <span className="font-medium text-gray-700 max-w-[120px] truncate">
                            {file.name}
                          </span>
                          <span className="text-gray-400 text-[10px]">
                            {(file.size / (1024 * 1024)).toFixed(1)}MB
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setNewAttachments((prev) => prev.filter((_, idx) => idx !== i))
                            }
                            className="hover:text-red-500 ml-1"
                            aria-label={t('removeAttachmentNamedAria', {
                              name: file.name,
                              defaultValue: 'Remove {{name}}',
                            })}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {visibleExistingAttachments.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-2 p-2 entry-notes-box rounded-lg shadow-inner">
                    <div className="text-[10px] uppercase font-bold text-[var(--color-sage-green)] tracking-wider flex items-center gap-1">
                      <Paperclip className="w-3 h-3" />{' '}
                      {t('existingAttachments', 'Existing Attachments')}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {visibleExistingAttachments.map((att) => (
                        <div
                          key={att.id}
                          className="text-xs flex items-center gap-2 entry-attachment-item px-2 py-1 rounded shadow-sm"
                        >
                          <FileUp className="w-3 h-3 text-[var(--color-sage-green)]" />
                          <span className="font-medium text-gray-700 max-w-[120px] truncate">
                            {att.name}
                          </span>
                          <span className="text-gray-400 text-[10px]">
                            {(att.size / (1024 * 1024)).toFixed(1)}MB
                          </span>
                          <button
                            type="button"
                            onClick={() => setRemovedAttachmentIds((prev) => [...prev, att.id])}
                            className="hover:text-red-500 ml-1"
                            title={t('removeAttachment', 'Remove attachment')}
                            aria-label={t('removeAttachmentNamedAria', {
                              name: att.name,
                              defaultValue: 'Remove {{name}}',
                            })}
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

          {/* Item Versioning History Section */}
          {initialEntry?.id && (
            <div className="v5-entry-section col-span-2 rounded-xl border border-[var(--color-sage-green)]/20 bg-[var(--color-sage-green)]/5 p-4 mt-2">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-3.5 w-3.5 text-[var(--color-sage-green)]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-sage-green)]">
                    {t('itemHistory')}
                  </span>
                </div>
                {isHistoryLoading && (
                  <div className="animate-spin h-3 w-3 border-2 border-[var(--color-sage-green)] border-t-transparent rounded-full" />
                )}
              </div>

              {historyList.length === 0 ? (
                <p className="text-xs text-[var(--color-deep-navy)]/50 italic">{t('noHistory')}</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {historyList.map((version, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/50 border border-black/5 hover:border-[var(--color-sage-green)]/30 transition-all"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-[var(--color-deep-navy)]">
                          {t('versionFrom', {
                            date: new Date(version.updated_at || '').toLocaleString(),
                          })}
                        </span>
                        <span className="text-[10px] opacity-60">
                          {version.username || t('noUsername', 'No username')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRestore(version)}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)] hover:bg-[var(--color-sage-green)]/20 text-[10px] font-bold transition-all"
                        title={t('restoreVersion')}
                        aria-label={t('restoreVersion')}
                      >
                        <RotateCcw className="w-3 h-3" />
                        {t('restoreVersion')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="v5-entry-actions flex justify-end mt-2">
          <button
            type="submit"
            className="v5-entry-save-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
          >
            <ShieldCheck className="w-4 h-4" /> {t('encryptSave')}
          </button>
        </div>
      </form>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <Suspense fallback={null}>
          <QRScannerLazy
            onScan={(data: string) => {
              setShowQRScanner(false);
              if (data.startsWith('otpauth://')) {
                setTotpInput(data);
                setShowTotpSection(true);
                try {
                  const params = parseOtpauthUri(data);
                  setNewEntry((prev) => ({
                    ...prev,
                    totpSecret: params.secret,
                    totp_issuer: params.issuer,
                    totp_algorithm: params.algorithm,
                    totp_digits: params.digits,
                    totp_period: params.period,
                    title: prev.title || params.issuer || '',
                  }));
                  toast.success(t('qrScanned', 'QR code scanned successfully!'));
                } catch {
                  toast.error(t('invalidQR', 'Invalid QR code format'));
                }
              } else {
                toast.error(t('notTotpQR', 'Not a TOTP QR code. Expected otpauth:// URI.'));
              }
            }}
            onClose={() => setShowQRScanner(false)}
          />
        </Suspense>
      )}
    </>
  );
}

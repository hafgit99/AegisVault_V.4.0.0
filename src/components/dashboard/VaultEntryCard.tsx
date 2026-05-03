import {
  AtSign,
  Copy,
  Check,
  Eye,
  EyeOff,
  Paperclip,
  DownloadCloud,
  Trash2,
  FileUp,
  Edit2,
  Tag,
  X,
  FileText,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { TOTPWidget } from './TOTPWidget';
import { getCategoryIcon } from '../../lib/getCategoryIcon';
import { useVault } from '../../contexts/VaultContext';
import { vaultService, type VaultEntry } from '../../vaultService';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { SharedSpaceService } from '../../lib/SharedSpaceService';
import { VaultSharingLinkService } from '../../lib/VaultSharingLinkService';

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
    viewDensity,
  } = useVault();

  const isCopied = copiedId === p.id;

  const handleDownloadAttachment = async (attachmentId: string, name: string) => {
    try {
      toast.info(t('decryptingAttachment', { name }));
      const blob = await vaultService.getDecryptedAttachment(attachmentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error(err);
      toast.error(t('decryptFailed'));
    }
  };

  const isVulnerable = !p.pass || p.pass.length < 8 || (p.pwned_count || 0) > 0;
  const sharingSpace = p.sharing?.[0]?.space_id
    ? SharedSpaceService.listSpaces().find((space) => space.id === p.sharing?.[0]?.space_id)
    : null;
  const sharedSpaceName = sharingSpace?.name || null;
  const sharingRole = p.sharing?.[0]?.role || null;
  const isExportAllowed = sharingSpace ? sharingSpace.allow_export !== false : true;
  const canEdit =
    !sharingRole || sharingRole === 'editor' || sharingRole === 'admin' || sharingRole === 'owner';
  const canDelete = !sharingRole || sharingRole === 'admin' || sharingRole === 'owner';
  const isSitePasskeyRecord = p.category === 'Passkeys' || Boolean(p.passkeyMetadata);
  const isCardRecord = p.category === 'Cards' && Boolean(p.cardDetails);
  const isIdentityRecord = p.category === 'Identities' && Boolean(p.identityDetails);

  const compact = viewDensity === 'compact';
  const strength = p.strength || 0;
  const strengthTone = strength > 80 ? 'strong' : strength > 40 ? 'average' : 'weak';
  const strengthLabel =
    strengthTone === 'strong' ? t('strong') : strengthTone === 'average' ? t('average') : t('weak');

  const maskCardNumber = (value: string) => {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    const lastFour = digits.slice(-4);
    return `•••• •••• •••• ${lastFour}`;
  };

  const maskIdentityNumber = (value: string) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.length <= 4) return raw;
    return `${raw.slice(0, 2)}••••${raw.slice(-2)}`;
  };

  return (
    <article
      className={`vault-entry-card v5-vault-entry-card grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] ${compact ? 'gap-3 p-4' : 'gap-4 p-5 md:p-6'} rounded-[1.25rem] transition-all relative group/item`}
    >
      <div className="flex items-start gap-4 md:gap-5 relative z-10 min-w-0">
        <div
          className={`vault-entry-icon ${compact ? 'w-12 h-12' : 'w-14 h-14 md:w-16 md:h-16'} shrink-0 rounded-[1.25rem] flex items-center justify-center shadow-sm`}
        >
          <div className={compact ? 'scale-100' : 'scale-110 md:scale-125'}>
            {getCategoryIcon(p.category)}
          </div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <div className="min-h-7 flex flex-wrap items-center gap-2">
            <h3
              className={`${compact ? 'text-base' : 'text-lg'} font-bold text-[var(--color-deep-navy)] truncate min-w-0`}
            >
              {p.title}
            </h3>
            <div className="vault-entry-badges v5-entry-badge-row flex min-w-0 flex-wrap items-center gap-1.5">
              {sharedSpaceName && (
                <span className="v5-entry-badge rounded-full bg-[var(--color-sage-green)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-sage-green)]">
                  {sharedSpaceName}
                </span>
              )}
              {isSitePasskeyRecord && (
                <span className="v5-entry-badge rounded-full bg-sky-500/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-sky-700 dark:text-sky-300">
                  {t('passkeys')}
                </span>
              )}
              {(p.pwned_count || 0) > 0 && (
                <span
                  className="v5-entry-badge bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest font-black"
                  title={t('pwnedWarning')}
                >
                  {t('pwned')}
                </span>
              )}
              <span className={`vault-security-pill vault-security-pill-${strengthTone}`}>
                {isVulnerable ? (
                  <AlertTriangle className="h-3 w-3" />
                ) : (
                  <ShieldCheck className="h-3 w-3" />
                )}
                {strengthLabel}
              </span>
            </div>
          </div>
          <div
            className={`flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mt-1 ${compact ? 'text-xs' : 'text-sm'}`}
          >
            <p className="vault-entry-meta v5-entry-identity-line font-[var(--font-geist-mono)] tracking-tight truncate flex items-center gap-2">
              {isSitePasskeyRecord ? p.passkeyMetadata?.rp_id || p.username : p.username}
              {p.tags && p.tags.length > 0 && (
                <span className="hidden xl:flex items-center gap-1 opacity-70 border border-black/10 px-1.5 py-0.5 rounded text-[10px] ml-2">
                  <Tag className="w-2.5 h-2.5" /> {p.tags[0]}{' '}
                  {p.tags.length > 1 && `+${p.tags.length - 1}`}
                </span>
              )}
            </p>
            <span className="hidden md:block w-1.5 h-1.5 rounded-full entry-divider shrink-0" />
            {p.aliasDetails?.email ? (
              <>
                <span className="v5-entry-badge v5-entry-alias-badge rounded-full bg-sky-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-sky-700 dark:text-sky-300 flex items-center gap-1">
                  <AtSign className="w-3 h-3" />
                  {t('aliasBadge')}
                </span>
                <span className="hidden md:block w-1.5 h-1.5 rounded-full entry-divider shrink-0" />
              </>
            ) : null}
            <div className="v5-entry-secret-row flex items-center gap-2">
              <span
                className={`pass-font v5-entry-password-chip ${compact ? 'text-xs' : 'text-sm'} rounded-md select-all transition-all duration-300 ${
                  visiblePasswords.has(p.id)
                    ? 'password-reveal-chip backdrop-blur-[20px] px-2 py-1'
                    : 'tracking-[0.25em] opacity-40 select-none mt-1'
                }`}
              >
                {visiblePasswords.has(p.id) ? p.pass : '••••••••'}
              </span>
              <button
                onClick={() => toggleVisibility(p.id)}
                className="p-1.5 rounded-md entry-action-btn-muted transition-all"
                title={visiblePasswords.has(p.id) ? 'Hide Password' : 'Show liquid password'}
              >
                {visiblePasswords.has(p.id) ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {isCardRecord && (
              <div className="vault-entry-notes-box v5-entry-detail-strip flex flex-wrap items-center gap-2 px-2.5 py-1.5 rounded-lg">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-sage-green)]">
                  {t('cards')}
                </span>
                {p.cardDetails?.brand ? (
                  <span className="text-[11px] opacity-70">
                    {p.cardDetails.brand.toUpperCase()}
                  </span>
                ) : null}
                {p.cardDetails?.card_number ? (
                  <span className="text-[11px] font-mono">
                    {maskCardNumber(p.cardDetails.card_number)}
                  </span>
                ) : null}
                {p.cardDetails?.expiry_month || p.cardDetails?.expiry_year ? (
                  <span className="text-[11px] opacity-70">
                    {p.cardDetails?.expiry_month || '--'}/{p.cardDetails?.expiry_year || '--'}
                  </span>
                ) : null}
              </div>
            )}

            {isIdentityRecord && (
              <div className="vault-entry-notes-box v5-entry-detail-strip flex flex-wrap items-center gap-2 px-2.5 py-1.5 rounded-lg">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-sage-green)]">
                  {t('identities')}
                </span>
                {p.identityDetails?.document_type ? (
                  <span className="text-[11px] opacity-70">{p.identityDetails.document_type}</span>
                ) : null}
                {p.identityDetails?.identity_number ? (
                  <span className="text-[11px] font-mono">
                    {maskIdentityNumber(p.identityDetails.identity_number)}
                  </span>
                ) : null}
                {p.identityDetails?.issuing_country ? (
                  <span className="text-[11px] opacity-70">
                    {p.identityDetails.issuing_country}
                  </span>
                ) : null}
              </div>
            )}

            {p.aliasDetails?.email ? (
              <div className="vault-entry-notes-box v5-entry-detail-strip v5-entry-alias-strip flex flex-wrap items-center gap-2 px-2.5 py-1.5 rounded-lg">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-sky-700 dark:text-sky-300">
                  {t('aliasBadge')}
                </span>
                <span className="text-[11px] font-mono">{p.aliasDetails.email}</span>
                <span className="text-[11px] opacity-70">{p.aliasDetails.providerLabel}</span>
                <span className="text-[11px] opacity-70">
                  {t(`aliasStatus.${p.aliasDetails.status}`)}
                </span>
              </div>
            ) : null}

            {/* Attachments */}
            {p.attachments && p.attachments.length > 0 && (
              <div className="v5-entry-attachment-row flex flex-wrap gap-2">
                {p.attachments.map((att) => (
                  <button
                    key={att.id}
                    onClick={() => handleDownloadAttachment(att.id, att.name)}
                    className="v5-entry-attachment-chip group flex items-center gap-1.5 bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)] border border-[var(--color-sage-green)]/30 hover:bg-[var(--color-sage-green)]/20 px-2.5 py-1 rounded-md text-[11px] font-bold shadow-sm transition-all relative overflow-hidden"
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
              <div>
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
            {p.notes && p.category !== 'Notes' && (
              <div className="vault-entry-notes-box v5-entry-detail-strip flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg">
                <FileText className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-[var(--color-deep-navy)]/70 line-clamp-2 leading-relaxed">
                  {p.notes.length > 120 ? p.notes.slice(0, 120) + '...' : p.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-stretch xl:items-start justify-end relative z-10 shrink-0 xl:min-w-[238px]">
        <div className="v5-entry-actions-rail flex flex-col-reverse xl:flex-col justify-between gap-3 w-full xl:w-auto">
          <div className="hidden lg:flex items-center justify-end gap-3 xl:min-h-7">
            <div className="w-24 h-2 entry-divider rounded-full overflow-hidden">
              <div
                className="h-full"
                style={{
                  width: `${strength}%`,
                  backgroundColor:
                    strength > 80
                      ? 'var(--color-sage-green)'
                      : strength > 40
                        ? '#f59e0b'
                        : '#ef4444',
                }}
              />
            </div>
            <span
              className="text-[11px] uppercase font-bold opacity-80"
              style={{
                color:
                  strength > 80 ? 'var(--color-sage-green)' : strength > 40 ? '#f59e0b' : '#ef4444',
              }}
            >
              {strengthLabel}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 xl:ml-4 flex-wrap">
            <div className="v5-entry-action-cluster relative flex items-center gap-2">
              {isVulnerable && canEdit && (
                <button
                  onClick={() => {
                    onEdit({ ...p });
                    toast.info(t('updateNow'));
                  }}
                  className="vault-update-btn v5-entry-update-btn px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 text-[10px] font-black uppercase tracking-tighter hover:bg-red-500 hover:text-white transition-all"
                >
                  {t('updateNow')}
                </button>
              )}
              {canEdit ? (
                <button
                  onClick={() => onEdit({ ...p, pass: p.pass || '' })}
                  className="vault-action-btn p-3 rounded-xl transition-all flex items-center justify-center"
                  title={t('editEntry', 'Edit')}
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              ) : (
                <span
                  className="p-3 rounded-xl opacity-30 cursor-not-allowed"
                  title={t('sharingNoEditPermission', 'View only — no edit permission')}
                >
                  <Edit2 className="w-5 h-5" />
                </span>
              )}
              <div className="relative">
                <button
                  onClick={() => {
                    if (!isExportAllowed) {
                      toast.warning(
                        t('sharingExportBlocked', 'Export is disabled for this shared space')
                      );
                      return;
                    }
                    handleCopyItem(p.id, p.pass || '');
                  }}
                  className={`relative z-10 p-3 rounded-xl transition-all flex items-center justify-center ${
                    !isExportAllowed
                      ? 'opacity-30 cursor-not-allowed vault-action-btn'
                      : isCopied
                        ? 'bg-[var(--color-sage-green)] text-[var(--color-deep-navy)] shadow-[0_0_15px_rgba(135,159,132,0.4)] scale-110'
                        : 'vault-action-btn hover:shadow-md'
                  }`}
                  title={
                    !isExportAllowed
                      ? t('sharingExportBlocked', 'Export is disabled for this shared space')
                      : t('copyPassword', 'Copy password')
                  }
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
                        style={{
                          transform: `rotate(${i * 60}deg)`,
                          animationDelay: `${i * 0.05}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {categoryFilter === 'Trash' ? (
                <>
                  <button
                    onClick={() => handleRestoreEntry(p.id)}
                    className="p-3 rounded-xl bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)] hover:bg-[var(--color-sage-green)] hover:text-white transition-all shadow-sm"
                    title={t('restore')}
                  >
                    <FileUp className="w-5 h-5" />
                  </button>
                  {canDelete ? (
                    <button
                      onClick={async () => {
                        if (confirm(t('confirmDeleteCard'))) {
                          await vaultService.deletePermanently(p.id);
                          toast.success(t('itemDeleted'));
                          loadPasswords();
                        }
                      }}
                      className="p-3 rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                      title={t('deletePermanently')}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  ) : (
                    <span
                      className="p-3 rounded-xl opacity-30 cursor-not-allowed"
                      title={t('sharingNoDeletePermission', 'No delete permission')}
                    >
                      <X className="w-5 h-5" />
                    </span>
                  )}
                </>
              ) : canDelete ? (
                <button
                  onClick={() => handleDeleteEntry(p.id)}
                  className="vault-action-btn p-3 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all flex items-center justify-center"
                  title={t('moveToTrash')}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              ) : (
                <span
                  className="p-3 rounded-xl opacity-30 cursor-not-allowed"
                  title={t('sharingNoDeletePermission', 'No delete permission')}
                >
                  <Trash2 className="w-5 h-5" />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

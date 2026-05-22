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
  Star,
  // New icons for secure offline brand avatars
  Github,
  Globe,
  Mail,
  Play,
  Music,
  ShoppingCart,
  CreditCard,
  Shield,
  MessageSquare,
  Hash,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { TOTPWidget } from './TOTPWidget';
import { getCategoryIcon } from '../../lib/getCategoryIcon';
import { useVault } from '../../contexts/VaultContext';
import { vaultService, type VaultEntry } from '../../vaultService';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { SharedSpaceService } from '../../lib/SharedSpaceService';
import { VaultSharingLinkService } from '../../lib/VaultSharingLinkService';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';

interface VaultEntryCardProps {
  entry: VaultEntry;
  onEdit: (entry: VaultEntry) => void;
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

const getDeterministicGradient = (str: string) => {
  let hash = 0;
  const s = str.toLowerCase().trim();
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  const luxuryGradients = [
    { from: 'hsl(143, 14%, 48%)', to: 'hsl(215, 60%, 16%)' }, // Sage Green to Deep Navy (Aegis Signature)
    { from: 'hsl(340, 65%, 45%)', to: 'hsl(220, 50%, 15%)' }, // Kadife Red to Dark Blue
    { from: 'hsl(210, 70%, 45%)', to: 'hsl(230, 60%, 18%)' }, // Sapphire Blue to Navy
    { from: 'hsl(165, 60%, 40%)', to: 'hsl(210, 55%, 15%)' }, // Emerald to Steel
    { from: 'hsl(260, 55%, 50%)', to: 'hsl(280, 70%, 15%)' }, // Royal Violet to Deep Space
    { from: 'hsl(25, 75%, 45%)', to: 'hsl(350, 60%, 18%)' }, // Warm Copper to Maroon
    { from: 'hsl(180, 60%, 35%)', to: 'hsl(225, 45%, 15%)' }, // Teal to Charcoal
    { from: 'hsl(320, 50%, 45%)', to: 'hsl(260, 40%, 18%)' }, // Rose Gold to Royal Purple
    { from: 'hsl(45, 60%, 45%)', to: 'hsl(22, 60%, 15%)' }, // Luxury Brass to Dark Cocoa
  ];
  const index = Math.abs(hash) % luxuryGradients.length;
  const grad = luxuryGradients[index];
  return `linear-gradient(135deg, ${grad.from} 0%, ${grad.to} 100%)`;
};

const getBrandInitials = (brand: string) => {
  const clean = brand
    .replace(/[^a-zA-Z0-9]/g, '')
    .trim()
    .toUpperCase();
  if (clean.length <= 0) return '?';
  if (clean.length === 1) return clean;
  return clean.slice(0, 2);
};

const getPopularBrandConfig = (brandName: string) => {
  const b = brandName.toLowerCase().trim();
  if (b.includes('github')) {
    return {
      gradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      icon: <Github className="w-5 h-5 text-slate-100" />,
    };
  }
  if (b.includes('gitlab')) {
    return {
      gradient: 'linear-gradient(135deg, #e24329 0%, #fc6d26 100%)',
      icon: <Globe className="w-5 h-5 text-white" />,
    };
  }
  if (b.includes('google') || b.includes('gmail')) {
    return {
      gradient: 'linear-gradient(135deg, #4285f4 0%, #34a853 50%, #fbbc05 80%, #ea4335 100%)',
      icon: <Globe className="w-5 h-5 text-white" />,
    };
  }
  if (b.includes('youtube') || b.includes('netflix')) {
    return {
      gradient: 'linear-gradient(135deg, #ff0000 0%, #111111 100%)',
      icon: <Play className="w-5 h-5 fill-white text-white scale-90 translate-x-[0.5px]" />,
    };
  }
  if (b.includes('spotify')) {
    return {
      gradient: 'linear-gradient(135deg, #1db954 0%, #191414 100%)',
      icon: <Music className="w-5 h-5 text-white" />,
    };
  }
  if (b.includes('amazon')) {
    return {
      gradient: 'linear-gradient(135deg, #ff9900 0%, #146eb4 100%)',
      icon: <ShoppingCart className="w-5 h-5 text-white" />,
    };
  }
  if (
    b.includes('paypal') ||
    b.includes('stripe') ||
    b.includes('pay') ||
    b.includes('bank') ||
    b.includes('card')
  ) {
    return {
      gradient: 'linear-gradient(135deg, #003087 0%, #0079c1 100%)',
      icon: <CreditCard className="w-5 h-5 text-white" />,
    };
  }
  if (
    b.includes('microsoft') ||
    b.includes('outlook') ||
    b.includes('office') ||
    b.includes('live')
  ) {
    return {
      gradient: 'linear-gradient(135deg, #0078d4 0%, #00205b 100%)',
      icon: <Shield className="w-5 h-5 text-white" />,
    };
  }
  if (b.includes('apple') || b.includes('icloud')) {
    return {
      gradient: 'linear-gradient(135deg, #8e8e93 0%, #1c1c1e 100%)',
      icon: <Shield className="w-5 h-5 text-white" />,
    };
  }
  if (b.includes('proton') || b.includes('mail')) {
    return {
      gradient: 'linear-gradient(135deg, #6d4aff 0%, #1a103c 100%)',
      icon: <Mail className="w-5 h-5 text-white" />,
    };
  }
  if (b.includes('discord')) {
    return {
      gradient: 'linear-gradient(135deg, #5865f2 0%, #404eed 100%)',
      icon: <MessageSquare className="w-5 h-5 text-white" />,
    };
  }
  if (b.includes('slack')) {
    return {
      gradient: 'linear-gradient(135deg, #4a154b 0%, #3eb991 100%)',
      icon: <Hash className="w-5 h-5 text-white" />,
    };
  }
  if (
    b.includes('facebook') ||
    b.includes('linkedin') ||
    b.includes('instagram') ||
    b.includes('tiktok') ||
    b.includes('twitter') ||
    b.includes('x.com')
  ) {
    return {
      gradient: 'linear-gradient(135deg, #1877f2 0%, #0d47a1 100%)',
      icon: <Globe className="w-5 h-5 text-white" />,
    };
  }
  return null;
};

function renderSecureOfflineIcon(p: VaultEntry, websiteHost: string, i18n: any, compact: boolean) {
  const isTr = i18n.language?.startsWith('tr');
  const tooltipText = isTr
    ? 'Güvenli Çevrimdışı İkon — Kasa içeriğinizi ağ üzerinde asla sızdırmaz.'
    : 'Secure Offline Icon — Never leaks your vault content over the network.';

  let brandName = '';
  if (websiteHost) {
    brandName = websiteHost.split('.')[0] || '';
  } else {
    brandName = (p.title || '').trim().split(' ')[0] || '';
  }
  brandName = brandName.replace(/[^a-zA-Z0-9]/g, '').trim();

  if (brandName) {
    const popularConfig = getPopularBrandConfig(brandName);
    if (popularConfig) {
      return (
        <div
          style={{ background: popularConfig.gradient }}
          className="w-full h-full rounded-2xl flex items-center justify-center shadow-md relative group/icon overflow-hidden transition-all duration-300"
          title={tooltipText}
        >
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/icon:opacity-100 transition-opacity duration-300" />
          <div className={compact ? 'scale-90' : 'scale-100 md:scale-110'}>
            {popularConfig.icon}
          </div>
        </div>
      );
    }

    const initials = getBrandInitials(brandName);
    const grad = getDeterministicGradient(brandName);
    return (
      <div
        style={{ background: grad }}
        className="w-full h-full rounded-2xl flex flex-col items-center justify-center shadow-md relative group/icon overflow-hidden transition-all duration-300 border border-white/10 dark:border-white/5"
        title={tooltipText}
      >
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/icon:opacity-100 transition-opacity duration-300" />
        <span
          className={`font-[var(--font-outfit)] font-black text-white tracking-tighter ${
            initials.length > 1
              ? compact
                ? 'text-sm'
                : 'text-base md:text-lg'
              : compact
                ? 'text-base'
                : 'text-lg md:text-xl'
          }`}
        >
          {initials}
        </span>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full rounded-2xl flex items-center justify-center bg-[var(--aegis-surface-muted)] border border-[var(--aegis-border-subtle)]"
      title={tooltipText}
    >
      <div className={compact ? 'scale-100' : 'scale-110 md:scale-125'}>
        {getCategoryIcon(p.category)}
      </div>
    </div>
  );
}

/**
 * VaultEntryCard — Tek bir kasa girişini gösteren kart bileşeni.
 * Parola göster/gizle, kopyala, düzenle, sil/geri yükle ve ek dosya indirme aksiyonlarını içerir.
 */
export const VaultEntryCard = memo(function VaultEntryCard({
  entry: p,
  onEdit,
  isExpanded: controlledExpanded,
  onExpandedChange,
}: VaultEntryCardProps) {
  const { t, i18n } = useTranslation();
  const [recoveredPassword, setRecoveredPassword] = useState('');
  const [localExpanded, setLocalExpanded] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);
  const {
    copiedId,
    handleCopyItem,
    visiblePasswords,
    toggleVisibility,
    categoryFilter,
    loadPasswords,
    handleDeleteEntry,
    handleRestoreEntry,
    handleToggleFavorite,
    viewDensity,
    searchQuery,
    searchScope,
  } = useVault();

  const isCopied = copiedId === p.id;
  const isExpanded = controlledExpanded ?? localExpanded;
  const setExpanded = useCallback(
    (expanded: boolean | ((current: boolean) => boolean)) => {
      const nextExpanded = typeof expanded === 'function' ? expanded(isExpanded) : expanded;
      if (onExpandedChange) {
        onExpandedChange(nextExpanded);
      } else {
        setLocalExpanded(nextExpanded);
      }
    },
    [isExpanded, onExpandedChange]
  );

  const isSearching = searchQuery.trim().length > 0;

  const isMatched = (() => {
    if (!isSearching) return true;
    const q = searchQuery.toLowerCase().trim();

    const titleMatch = (p.title || '').toLowerCase().includes(q);
    const userMatch = (p.username || '').toLowerCase().includes(q);
    const tagMatch = p.tags ? p.tags.some((tg) => tg.toLowerCase().includes(q)) : false;

    if (searchScope === 'title') return titleMatch;
    if (searchScope === 'username') return userMatch;
    if (searchScope === 'tags') return tagMatch;

    return (
      titleMatch ||
      userMatch ||
      tagMatch ||
      (p.website || '').toLowerCase().includes(q) ||
      (p.notes || '').toLowerCase().includes(q)
    );
  })();

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

  const passwordDecryptFailed =
    typeof p.pass === 'string' && p.pass.toUpperCase().includes('DECRYPT_ERROR');
  const safePassword = recoveredPassword || (passwordDecryptFailed ? '' : p.pass || '');
  const isVulnerable =
    passwordDecryptFailed || !safePassword || safePassword.length < 8 || (p.pwned_count || 0) > 0;
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
  const contextToneClass =
    (p.pwned_count || 0) > 0 ? 'v5-vault-entry-card-pwned' : `v5-vault-entry-card-${strengthTone}`;
  const strengthLabel =
    strengthTone === 'strong' ? t('strong') : strengthTone === 'average' ? t('average') : t('weak');
  const hasTotp = Boolean(p.totpSecret);
  const attachmentCount = p.attachments?.length || 0;
  const isFavorite = Boolean(p.favorite);
  const expandedDetailsId = `vault-entry-details-${p.id}`;
  const websiteHost = (() => {
    const value = String(p.website || '').trim();
    if (!value) return '';
    try {
      return new URL(value.startsWith('http') ? value : `https://${value}`).hostname.replace(
        /^www\./,
        ''
      );
    } catch {
      return value
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0];
    }
  })();

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

  const handleCopyPassword = async () => {
    if (!isExportAllowed) {
      toast.warning(t('sharingExportBlocked', 'Export is disabled for this shared space'));
      return;
    }

    try {
      const password = safePassword
        ? safePassword
        : await vaultService.getDecryptedPasswordById(p.id);

      if (!password) {
        toast.error(t('passwordDecryptUnavailable', 'Password unavailable'));
        return;
      }

      handleCopyItem(p.id, password);
      if (password !== recoveredPassword) setRecoveredPassword(password);
    } catch {
      toast.error(
        t('passwordDecryptUnavailableDesc', 'Password could not be decrypted in this session.')
      );
    }
  };

  const handleTogglePasswordVisibility = async () => {
    if (visiblePasswords.has(p.id)) {
      toggleVisibility(p.id);
      return;
    }

    if (safePassword) {
      toggleVisibility(p.id);
      return;
    }

    try {
      const password = await vaultService.getDecryptedPasswordById(p.id);
      if (!password) {
        toast.error(t('passwordDecryptUnavailable', 'Password unavailable'));
        return;
      }
      setRecoveredPassword(password);
      toggleVisibility(p.id);
    } catch {
      toast.error(
        t('passwordDecryptUnavailableDesc', 'Password could not be decrypted in this session.')
      );
    }
  };

  useEffect(() => {
    if (!isExpanded) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!cardRef.current?.contains(event.target as Node)) {
        setExpanded(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpanded(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded, setExpanded]);

  const shouldIgnoreCardToggle = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(
      target.closest(
        'button, a, input, textarea, select, summary, [role="button"], [data-card-action="true"]'
      )
    );
  };

  const handleCardClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (shouldIgnoreCardToggle(event.target)) return;
    setExpanded((current) => !current);
  };

  const handleCardKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (shouldIgnoreCardToggle(event.target)) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setExpanded((current) => !current);
    }

    if (event.key === 'Escape') {
      setExpanded(false);
    }
  };

  return (
    <article
      ref={cardRef}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-controls={expandedDetailsId}
      title={isExpanded ? t('collapseCardDetails') : t('expandCardDetails')}
      className={`vault-entry-card v5-vault-entry-card ${contextToneClass} grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] ${
        compact ? 'gap-3 p-4' : 'gap-4 p-5 md:p-6'
      } rounded-[var(--radius)] transition-all duration-300 ease-out relative group/item ${
        isExpanded ? 'v5-vault-entry-card-expanded' : ''
      } ${
        isSearching
          ? isMatched
            ? 'v5-entry-card-matched border-[var(--aegis-border-accent)] z-10 scale-[1.01] shadow-[0_4px_24px_rgba(114,136,111,0.12)]'
            : 'opacity-30 scale-[0.98] blur-[0.5px] pointer-events-none'
          : ''
      }`}
    >
      <div className="v5-entry-main flex items-start gap-4 md:gap-5 relative z-10 min-w-0">
        <div
          className={`vault-entry-icon ${compact ? 'w-12 h-12' : 'w-14 h-14 md:w-16 md:h-16'} shrink-0 rounded-2xl overflow-hidden`}
        >
          {renderSecureOfflineIcon(p, websiteHost, i18n, compact)}
        </div>
        <div className="v5-entry-content flex-1 min-w-0 flex flex-col gap-3">
          <div className="v5-entry-title-row min-h-7 flex flex-wrap items-center gap-2">
            <h3
              className={`${compact ? 'text-base' : 'text-lg'} font-[var(--font-outfit)] font-bold tracking-tight text-[var(--color-deep-navy)] truncate min-w-0`}
            >
              {p.title}
            </h3>
            <div className="vault-entry-badges v5-entry-badge-row flex min-w-0 flex-wrap items-center gap-1.5">
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

          <div className="v5-entry-context-row flex min-w-0 flex-wrap items-center gap-2">
            <span className="v5-entry-context-chip">
              <Tag className="h-3 w-3" />
              {p.category}
            </span>
            {websiteHost ? <span className="v5-entry-website-chip">{websiteHost}</span> : null}
            {hasTotp ? <span className="v5-entry-status-chip">{t('totp', '2FA')}</span> : null}
            {isSitePasskeyRecord ? (
              <span className="v5-entry-status-chip v5-entry-status-chip-info">
                {t('passkeys')}
              </span>
            ) : null}
            {p.aliasDetails?.email ? (
              <span className="v5-entry-status-chip v5-entry-status-chip-info">
                {t('aliasBadge')}
              </span>
            ) : null}
            {sharedSpaceName ? (
              <span className="v5-entry-status-chip">{sharedSpaceName}</span>
            ) : null}
            {attachmentCount > 0 ? (
              <span className="v5-entry-status-chip">
                {t('attachments', 'Ekler')} {attachmentCount}
              </span>
            ) : null}
          </div>

          <div
            className={`v5-entry-meta-line flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mt-1 ${compact ? 'text-xs' : 'text-sm'}`}
          >
            <p className="vault-entry-meta v5-entry-identity-line font-[var(--font-geist-mono)] tracking-tight truncate flex items-center gap-2">
              {isSitePasskeyRecord ? p.passkeyMetadata?.rp_id || p.username : p.username}
              {p.tags && p.tags.length > 0 && (
                <span className="hidden xl:flex items-center gap-1 opacity-70 border border-black/10 px-1.5 py-0.5 rounded-md text-[10px] ml-2">
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
                {visiblePasswords.has(p.id)
                  ? !safePassword
                    ? t('passwordDecryptUnavailable', 'Password unavailable')
                    : safePassword
                  : '••••••••'}
              </span>
              <button
                data-card-action="true"
                onClick={handleTogglePasswordVisibility}
                className="v5-entry-inline-icon p-1.5 rounded-md entry-action-btn-muted transition-all"
                title={
                  passwordDecryptFailed && !safePassword
                    ? t('passwordDecryptUnavailable', 'Password unavailable')
                    : visiblePasswords.has(p.id)
                      ? t('hidePassword', 'Hide Password')
                      : t('showPassword', 'Show password')
                }
                aria-label={
                  passwordDecryptFailed && !safePassword
                    ? t('passwordDecryptUnavailable', 'Password unavailable')
                    : visiblePasswords.has(p.id)
                      ? t('hidePassword', 'Hide Password')
                      : t('showPassword', 'Show password')
                }
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
              <div className="vault-entry-notes-box v5-entry-detail-strip flex flex-wrap items-center gap-2 px-2.5 py-1.5 rounded-xl">
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
              <div className="vault-entry-notes-box v5-entry-detail-strip flex flex-wrap items-center gap-2 px-2.5 py-1.5 rounded-xl">
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
              <div className="vault-entry-notes-box v5-entry-detail-strip v5-entry-alias-strip flex flex-wrap items-center gap-2 px-2.5 py-1.5 rounded-xl">
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
                    data-card-action="true"
                    onClick={() => handleDownloadAttachment(att.id, att.name)}
                    className="v5-entry-attachment-chip group flex items-center gap-1.5 bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)] border border-[var(--color-sage-green)]/30 hover:bg-[var(--color-sage-green)]/20 px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-sm transition-all relative overflow-hidden"
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
              <div className="vault-entry-notes-box v5-entry-detail-strip flex items-start gap-1.5 px-2.5 py-1.5 rounded-xl">
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
      <div className="v5-entry-action-area flex items-stretch xl:items-start justify-end relative z-10 shrink-0 xl:min-w-[184px]">
        <div className="v5-entry-actions-rail flex flex-col-reverse xl:flex-col justify-between gap-3 w-full xl:w-auto">
          <div className="v5-entry-strength-summary hidden lg:flex items-center justify-end gap-3 xl:min-h-7">
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
                  data-card-action="true"
                  onClick={() => {
                    onEdit({ ...p });
                    toast.info(t('updateNow'));
                  }}
                  className="vault-update-btn v5-entry-update-btn px-3 py-1.5 rounded-xl bg-red-500/10 text-red-600 text-[10px] font-black uppercase tracking-tighter hover:bg-red-500 hover:text-white transition-all"
                >
                  {t('updateNow')}
                </button>
              )}
              <div className="v5-entry-icon-actions">
                {categoryFilter !== 'Trash' ? (
                  <button
                    type="button"
                    data-card-action="true"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void handleToggleFavorite(p.id, !isFavorite);
                    }}
                    className={`vault-action-btn v5-entry-favorite-btn ${
                      isFavorite ? 'v5-entry-favorite-btn-active' : ''
                    }`}
                    title={isFavorite ? t('removeFromFavorites') : t('addToFavorites')}
                    aria-label={isFavorite ? t('removeFromFavorites') : t('addToFavorites')}
                    aria-pressed={isFavorite}
                  >
                    <Star className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} />
                  </button>
                ) : null}
                {canEdit ? (
                  <button
                    data-card-action="true"
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
                    data-card-action="true"
                    onClick={handleCopyPassword}
                    className={`relative z-10 p-3 rounded-xl transition-all flex items-center justify-center ${
                      !isExportAllowed
                        ? 'opacity-30 cursor-not-allowed vault-action-btn'
                        : isCopied
                          ? 'vault-action-btn v5-entry-copy-success'
                          : 'vault-action-btn hover:shadow-md'
                    }`}
                    title={
                      !isExportAllowed
                        ? t('sharingExportBlocked', 'Export is disabled for this shared space')
                        : t('copyPassword', 'Copy password')
                    }
                  >
                    {isCopied ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Copy className="w-5 h-5 opacity-70" />
                    )}
                  </button>
                </div>

                {categoryFilter === 'Trash' ? (
                  <>
                    <button
                      onClick={() => handleRestoreEntry(p.id)}
                      data-card-action="true"
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
                        data-card-action="true"
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
                    data-card-action="true"
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
      </div>

      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            id={expandedDetailsId}
            layout
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="v5-entry-expanded-panel xl:col-span-2"
          >
            <div className="v5-entry-expanded-header">
              <div>
                <p className="v5-entry-expanded-kicker">{t('expandedCardKicker')}</p>
                <h4>{t('expandedCardTitle')}</h4>
              </div>
              <button
                type="button"
                data-card-action="true"
                onClick={() => setExpanded(false)}
                className="v5-entry-expanded-close"
                aria-label={t('collapseCardDetails')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.035 } },
              }}
              className="v5-entry-expanded-grid"
            >
              {[
                [t('entryDetailUsername'), p.username || t('emptyValue')],
                [t('entryDetailWebsite'), websiteHost || p.website || t('emptyValue')],
                [t('entryDetailCategory'), p.category || t('general')],
                [
                  t('entryDetailUpdated'),
                  p.updated_at
                    ? new Date(p.updated_at).toLocaleDateString(i18n.language)
                    : t('emptyValue'),
                ],
              ].map(([label, value]) => (
                <motion.div
                  key={String(label)}
                  variants={{
                    hidden: { opacity: 0, y: 6 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  className="v5-entry-expanded-cell"
                >
                  <span>{label}</span>
                  <strong>{value}</strong>
                </motion.div>
              ))}

              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 6 },
                  visible: { opacity: 1, y: 0 },
                }}
                className="v5-entry-expanded-cell v5-entry-expanded-secret"
              >
                <span>{t('entryDetailPassword')}</span>
                <div>
                  <code>
                    {visiblePasswords.has(p.id)
                      ? safePassword || t('passwordDecryptUnavailable', 'Password unavailable')
                      : '••••••••••••'}
                  </code>
                  <button
                    type="button"
                    data-card-action="true"
                    onClick={handleTogglePasswordVisibility}
                    aria-label={
                      visiblePasswords.has(p.id)
                        ? t('hidePassword', 'Hide Password')
                        : t('showPassword', 'Show password')
                    }
                  >
                    {visiblePasswords.has(p.id) ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    data-card-action="true"
                    onClick={handleCopyPassword}
                    aria-label={t('copyPassword', 'Copy password')}
                  >
                    {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </motion.div>

              {p.tags && p.tags.length > 0 ? (
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 6 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  className="v5-entry-expanded-cell v5-entry-expanded-tags"
                >
                  <span>{t('entryDetailTags')}</span>
                  <div>
                    {p.tags.map((tag) => (
                      <em key={tag}>{tag}</em>
                    ))}
                  </div>
                </motion.div>
              ) : null}

              {p.notes ? (
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 6 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  className="v5-entry-expanded-cell v5-entry-expanded-notes"
                >
                  <span>{t('entryDetailNotes')}</span>
                  <p>{p.notes}</p>
                </motion.div>
              ) : null}

              {p.attachments && p.attachments.length > 0 ? (
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 6 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  className="v5-entry-expanded-cell v5-entry-expanded-attachments"
                >
                  <span>{t('entryDetailAttachments')}</span>
                  <div>
                    {p.attachments.map((att) => (
                      <button
                        key={att.id}
                        type="button"
                        data-card-action="true"
                        onClick={() => handleDownloadAttachment(att.id, att.name)}
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        {att.name}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : null}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </article>
  );
});

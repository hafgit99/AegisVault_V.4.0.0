import { useMemo, useState, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Eye,
  Info,
  KeyRound,
  Link2Off,
  Plus,
  Radar,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { vaultService } from '../../vaultService';
import { useVault } from '../../contexts/VaultContext';
import {
  CryptoWalletVault,
  type CryptoWalletChain,
  type CryptoWalletCustodyMode,
} from '../../lib/wallet/CryptoWalletVault';

const chains: CryptoWalletChain[] = ['bitcoin', 'ethereum', 'solana', 'tron', 'litecoin', 'other'];

export function CryptoVaultPanel() {
  const { t } = useTranslation();
  const { passwords, loadPasswords, handleDeleteEntry, handleCopyItem } = useVault();
  const [isCreating, setIsCreating] = useState(false);
  const [phishingWarning, setPhishingWarning] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: '',
    chain: 'ethereum' as CryptoWalletChain,
    publicAddress: '',
    custodyMode: 'watch_only' as CryptoWalletCustodyMode,
    secretKind: 'seed_phrase' as 'seed_phrase' | 'private_key',
    secretMaterial: '',
    derivationPath: '',
    lastKnownBalance: '',
    notes: '',
  });

  const records = useMemo(
    () => passwords.map((entry) => CryptoWalletVault.toRecord(entry)).filter(Boolean),
    [passwords]
  );
  const hasSecretRecords = records.some((record) => record?.custodyMode === 'vault_secret');
  const watchOnlyCount = records.filter((record) => record?.custodyMode === 'watch_only').length;
  const secretCount = records.filter((record) => record?.custodyMode === 'vault_secret').length;
  const hasAddressInput = draft.publicAddress.trim().length > 0;
  const isAddressValid =
    hasAddressInput && CryptoWalletVault.validateAddress(draft.chain, draft.publicAddress);

  // Extended public key detection
  const extendedKeyType = hasAddressInput
    ? CryptoWalletVault.getExtendedKeyType(draft.publicAddress)
    : null;
  const isExtendedKey = hasAddressInput
    ? CryptoWalletVault.isExtendedPublicKey(draft.publicAddress)
    : false;

  // Chain mismatch detection
  const chainMismatch = hasAddressInput
    ? CryptoWalletVault.getChainMismatchInfo(draft.chain, draft.publicAddress)
    : { mismatch: false, detectedChain: null };

  // Address format hint
  const formatHint = CryptoWalletVault.getAddressFormatHint(draft.chain);

  const resetDraft = () => {
    setDraft({
      name: '',
      chain: 'ethereum',
      publicAddress: '',
      custodyMode: 'watch_only',
      secretKind: 'seed_phrase',
      secretMaterial: '',
      derivationPath: '',
      lastKnownBalance: '',
      notes: '',
    });
  };

  const createWallet = async () => {
    if (!draft.name.trim()) {
      toast.error(t('cryptoWalletNameRequired'));
      return;
    }

    if (!CryptoWalletVault.validateAddress(draft.chain, draft.publicAddress)) {
      toast.error(t('cryptoWalletAddressInvalid'));
      return;
    }

    if (chainMismatch.mismatch) {
      toast.error(
        t('cryptoChainMismatchWarning', {
          selected: CryptoWalletVault.getChainLabel(draft.chain),
          detected: chainMismatch.detectedChain
            ? CryptoWalletVault.getChainLabel(chainMismatch.detectedChain)
            : 'Unknown',
        })
      );
      return;
    }

    if (draft.custodyMode === 'vault_secret' && !draft.secretMaterial.trim()) {
      toast.error(t('cryptoWalletSecretRequired'));
      return;
    }

    await vaultService.addPassword(CryptoWalletVault.fromDraft(draft));
    toast.success(t('cryptoWalletCreated'));
    resetDraft();
    setIsCreating(false);
    loadPasswords();
  };

  const showPhishingWarning = useCallback(() => {
    setPhishingWarning(t('cryptoPhishingWarning'));
    const timer = setTimeout(() => setPhishingWarning(null), 8000);
    return () => clearTimeout(timer);
  }, [t]);

  const copyAddress = (id: number, address: string) => {
    handleCopyItem(id, address);
    showPhishingWarning();
  };

  return (
    <div className="crypto-vault-panel">
      {/* ── Top security banner: no private key storage ── */}
      <div className="crypto-security-banner" role="status">
        <div className="crypto-security-banner-icon">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="crypto-security-banner-text">
          <strong>{t('cryptoSecurityBannerTitle')}</strong>
          <span>
            {hasSecretRecords ? t('cryptoSecurityBannerSecretDesc') : t('cryptoSecurityBannerDesc')}
          </span>
        </div>
        <div className="crypto-security-banner-badge">
          {hasSecretRecords ? (
            <KeyRound className="h-3.5 w-3.5" />
          ) : (
            <ShieldOff className="h-3.5 w-3.5" />
          )}
          <span>
            {hasSecretRecords ? t('cryptoEncryptedSecretLabel') : t('cryptoNoPrivateKeyLabel')}
          </span>
        </div>
      </div>

      {/* ── Phishing warning toast (after copy) ── */}
      {phishingWarning && (
        <div className="crypto-phishing-warning" role="alert">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{phishingWarning}</span>
          <button
            type="button"
            className="crypto-phishing-close"
            onClick={() => setPhishingWarning(null)}
            aria-label={t('dismissAria', 'Dismiss message')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Hero ── */}
      <section className="crypto-vault-hero">
        <div className="crypto-vault-hero-copy">
          <span className="v5-section-kicker">{t('cryptoVaultKicker')}</span>
          <h2>{t('cryptoVaultTitle')}</h2>
          <p>{t('cryptoVaultDesc')}</p>
          <div className="crypto-vault-trust-strip">
            <span>
              <Eye className="h-3.5 w-3.5" />
              {t('cryptoTrustWatchOnlyFirst')}
            </span>
            <span>
              <ShieldOff className="h-3.5 w-3.5" />
              {t('cryptoTrustNoSigning')}
            </span>
            <span>
              <Radar className="h-3.5 w-3.5" />
              {t('cryptoTrustAddressVerification')}
            </span>
          </div>
        </div>
        <div className="crypto-vault-hero-actions">
          <div className="crypto-vault-custody-summary" aria-label={t('cryptoCustodySummary')}>
            <div>
              <span>{t('cryptoWalletWatchOnly')}</span>
              <strong>{watchOnlyCount}</strong>
            </div>
            <div>
              <span>{t('cryptoWalletVaultSecret')}</span>
              <strong>{secretCount}</strong>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCreating((prev) => !prev)}
            className="btn-ink crypto-vault-primary"
          >
            {isCreating ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isCreating ? t('cancel') : t('cryptoWalletAdd')}
          </button>
        </div>
      </section>

      {/* ── Create form ── */}
      {isCreating && (
        <section className="crypto-vault-form">
          <div className="crypto-vault-form-grid">
            <label>
              <span>{t('cryptoWalletName')}</span>
              <input
                value={draft.name}
                onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                placeholder={t('cryptoWalletNamePlaceholder')}
              />
            </label>
            <label>
              <span>{t('cryptoWalletChain')}</span>
              <select
                value={draft.chain}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    chain: event.target.value as CryptoWalletChain,
                  }))
                }
              >
                {chains.map((chain) => (
                  <option key={chain} value={chain}>
                    {CryptoWalletVault.getChainLabel(chain)}
                  </option>
                ))}
              </select>
            </label>
            <label className="crypto-vault-wide">
              <span>{t('cryptoWalletPublicAddress')}</span>
              <input
                value={draft.publicAddress}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, publicAddress: event.target.value }))
                }
                placeholder={t('cryptoWalletAddressPlaceholder')}
              />
              <span className="crypto-address-format-hint">
                <Info className="h-3 w-3" />
                {t('cryptoAddressFormatHint')}: {formatHint}
              </span>
            </label>

            {/* ── Chain mismatch warning ── */}
            {hasAddressInput && chainMismatch.mismatch && chainMismatch.detectedChain && (
              <div className="crypto-vault-wide crypto-chain-mismatch-warning">
                <Link2Off className="h-4 w-4 shrink-0" />
                <span>
                  {t('cryptoChainMismatchWarning', {
                    selected: CryptoWalletVault.getChainLabel(draft.chain),
                    detected: CryptoWalletVault.getChainLabel(chainMismatch.detectedChain),
                  })}
                </span>
              </div>
            )}

            {/* ── Extended public key badge (xpub/ypub/zpub) ── */}
            {isExtendedKey && extendedKeyType && (
              <div className="crypto-vault-wide crypto-xpub-badge">
                <Eye className="h-4 w-4 shrink-0" />
                <div>
                  <strong>
                    {t('cryptoXpubDetected', { type: extendedKeyType.toUpperCase() })}
                  </strong>
                  <span>{t('cryptoXpubDesc')}</span>
                </div>
              </div>
            )}

            <label>
              <span>{t('cryptoWalletCustody')}</span>
              <select
                value={draft.custodyMode}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    custodyMode: event.target.value as CryptoWalletCustodyMode,
                  }))
                }
              >
                <option value="watch_only">{t('cryptoWalletWatchOnly')}</option>
                <option value="vault_secret">{t('cryptoWalletVaultSecret')}</option>
              </select>
            </label>
            <div className="crypto-vault-wide crypto-wallet-inline-notice watch">
              <Radar className="h-4 w-4" />
              <span>{t('cryptoWalletWatchOnlyDefaultHint')}</span>
            </div>
            <label>
              <span>{t('cryptoWalletDerivation')}</span>
              <input
                value={draft.derivationPath}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, derivationPath: event.target.value }))
                }
                placeholder="m/44'/60'/0'/0/0"
              />
            </label>
            {draft.custodyMode === 'vault_secret' && (
              <>
                <div className="crypto-vault-wide crypto-wallet-inline-notice secret">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{t('cryptoWalletSecretRiskNotice')}</span>
                </div>
                <label>
                  <span>{t('cryptoWalletSecretType')}</span>
                  <select
                    value={draft.secretKind}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        secretKind: event.target.value as 'seed_phrase' | 'private_key',
                      }))
                    }
                  >
                    <option value="seed_phrase">{t('cryptoWalletSeedPhrase')}</option>
                    <option value="private_key">{t('cryptoWalletPrivateKey')}</option>
                  </select>
                </label>
                <label className="crypto-vault-wide">
                  <span>{t('cryptoWalletSecretMaterial')}</span>
                  <textarea
                    value={draft.secretMaterial}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, secretMaterial: event.target.value }))
                    }
                    placeholder={t('cryptoWalletSecretPlaceholder')}
                  />
                </label>
              </>
            )}
            <label>
              <span>{t('cryptoWalletBalance')}</span>
              <input
                value={draft.lastKnownBalance}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, lastKnownBalance: event.target.value }))
                }
                placeholder="0.0000 ETH"
              />
            </label>
            <label className="crypto-vault-wide">
              <span>{t('cryptoWalletNotes')}</span>
              <textarea
                value={draft.notes}
                onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder={t('cryptoWalletNotesPlaceholder')}
              />
            </label>

            {/* ── Address validation status ── */}
            {hasAddressInput && (
              <div
                className={`crypto-vault-wide crypto-wallet-address-status ${
                  isAddressValid ? 'valid' : 'invalid'
                }`}
              >
                {isAddressValid ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <span>
                  {isAddressValid
                    ? t('cryptoWalletAddressValid')
                    : t('cryptoWalletAddressInvalidInline')}
                </span>
              </div>
            )}
          </div>
          <div className="crypto-vault-form-footer">
            <p>{t('cryptoWalletNoSigningNotice')}</p>
            <button type="button" onClick={createWallet} className="btn-ink crypto-vault-primary">
              <ShieldCheck className="h-4 w-4" />
              {t('cryptoWalletSave')}
            </button>
          </div>
        </section>
      )}

      {/* ── Wallet cards ── */}
      {records.length === 0 ? (
        <section className="crypto-vault-empty">
          <WalletCards className="h-8 w-8" />
          <h3>{t('cryptoWalletEmptyTitle')}</h3>
          <p>{t('cryptoWalletEmptyDesc')}</p>
        </section>
      ) : (
        <section className="crypto-vault-grid">
          {records.map((record) => {
            if (!record) return null;
            const sourceEntry = passwords.find((entry) => entry.id === record.walletId);
            const canRevealSecret =
              sourceEntry?.pass && sourceEntry.pass !== CryptoWalletVault.watchOnlySentinel;

            const recordExtKey = CryptoWalletVault.getExtendedKeyType(record.publicAddress);

            return (
              <article key={record.walletId} className="crypto-wallet-card">
                <div className="crypto-wallet-card-top">
                  <div>
                    <span>{record.networkLabel}</span>
                    <h3>{record.name}</h3>
                  </div>
                  <div className="crypto-wallet-card-badges">
                    {/* Watch-only mode badge */}
                    <div
                      className={
                        record.custodyMode === 'watch_only'
                          ? 'crypto-wallet-mode watch'
                          : 'crypto-wallet-mode secret'
                      }
                    >
                      {record.custodyMode === 'watch_only' ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <KeyRound className="h-3 w-3" />
                      )}
                      {record.custodyMode === 'watch_only'
                        ? t('cryptoWalletWatchOnly')
                        : t('cryptoWalletVaultSecret')}
                    </div>

                    {/* Extended key type badge */}
                    {recordExtKey && (
                      <div className="crypto-wallet-mode xpub">
                        <Shield className="h-3 w-3" />
                        {recordExtKey.toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="crypto-wallet-security-line">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>
                    {record.custodyMode === 'watch_only'
                      ? t('cryptoWalletReadOnlyAssurance')
                      : t('cryptoWalletSecretAssurance')}
                  </span>
                </div>

                <div className="crypto-wallet-address">
                  <span>{t('cryptoWalletPublicAddress')}</span>
                  <code>{record.publicAddress}</code>
                </div>

                <div className="crypto-wallet-meta">
                  <div>
                    <span>{t('cryptoWalletBalance')}</span>
                    <strong>{record.lastKnownBalance || t('cryptoWalletBalanceUnknown')}</strong>
                  </div>
                  <div>
                    <span>{t('cryptoWalletDerivation')}</span>
                    <strong>{record.derivationPath || t('notConfigured')}</strong>
                  </div>
                </div>

                {record.notes && <p className="crypto-wallet-note">{record.notes}</p>}

                {/* ── Watch-only safety strip ── */}
                {record.custodyMode === 'watch_only' && (
                  <div className="crypto-watch-only-strip">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>{t('cryptoWatchOnlyStripLabel')}</span>
                  </div>
                )}

                <div className="crypto-wallet-actions">
                  <button
                    type="button"
                    onClick={() => copyAddress(record.walletId, record.publicAddress)}
                  >
                    <Copy className="h-4 w-4" />
                    {t('cryptoWalletCopyAddress')}
                  </button>
                  {canRevealSecret && sourceEntry ? (
                    <button
                      type="button"
                      onClick={() => handleCopyItem(sourceEntry.id, sourceEntry.pass || '')}
                    >
                      <KeyRound className="h-4 w-4" />
                      {t('cryptoWalletCopySecret')}
                    </button>
                  ) : (
                    <span className="crypto-wallet-readonly">
                      <Radar className="h-4 w-4" />
                      {t('cryptoWalletWatchOnlySafe')}
                    </span>
                  )}
                  <button
                    type="button"
                    className="crypto-wallet-delete"
                    aria-label={t('cryptoWalletDeleteAria', {
                      name: record.name,
                      defaultValue: 'Delete {{name}} crypto vault record',
                    })}
                    onClick={() => {
                      if (confirm(t('cryptoWalletDeleteConfirm'))) {
                        void handleDeleteEntry(record.walletId);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

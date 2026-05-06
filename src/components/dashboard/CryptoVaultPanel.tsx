import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  KeyRound,
  Plus,
  Radar,
  ShieldCheck,
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
  const hasAddressInput = draft.publicAddress.trim().length > 0;
  const isAddressValid =
    hasAddressInput && CryptoWalletVault.validateAddress(draft.chain, draft.publicAddress);

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

  const copyAddress = (id: number, address: string) => {
    handleCopyItem(id, address);
  };

  return (
    <div className="crypto-vault-panel">
      <section className="crypto-vault-hero">
        <div className="crypto-vault-hero-copy">
          <span className="v5-section-kicker">{t('cryptoVaultKicker')}</span>
          <h2>{t('cryptoVaultTitle')}</h2>
          <p>{t('cryptoVaultDesc')}</p>
        </div>
        <div className="crypto-vault-hero-actions">
          <div className="crypto-vault-score">
            <ShieldCheck className="h-5 w-5" />
            <span>{t('cryptoVaultMode')}</span>
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
            </label>
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

            return (
              <article key={record.walletId} className="crypto-wallet-card">
                <div className="crypto-wallet-card-top">
                  <div>
                    <span>{record.networkLabel}</span>
                    <h3>{record.name}</h3>
                  </div>
                  <div
                    className={
                      record.custodyMode === 'watch_only'
                        ? 'crypto-wallet-mode watch'
                        : 'crypto-wallet-mode secret'
                    }
                  >
                    {record.custodyMode === 'watch_only'
                      ? t('cryptoWalletWatchOnly')
                      : t('cryptoWalletVaultSecret')}
                  </div>
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

                <div className="crypto-wallet-actions">
                  <button type="button" onClick={() => copyAddress(record.walletId, record.publicAddress)}>
                    <Copy className="h-4 w-4" />
                    {t('cryptoWalletCopyAddress')}
                  </button>
                  {canRevealSecret && sourceEntry ? (
                    <button type="button" onClick={() => handleCopyItem(sourceEntry.id, sourceEntry.pass || '')}>
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

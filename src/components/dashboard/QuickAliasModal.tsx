import { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Copy,
  PlusCircle,
  Wand2,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  AtSign,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useVault } from '../../contexts/VaultContext';
import { AliasProviderService } from '../../lib/AliasProviderService';
import type { AliasProviderProfile, VaultAliasDetails } from '../../lib/alias-types';

interface QuickAliasModalProps {
  onClose: () => void;
}

export function QuickAliasModal({ onClose }: QuickAliasModalProps) {
  const { t } = useTranslation();
  const { handleCreateEntry } = useVault();

  const [site, setSite] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [providers, setProviders] = useState<AliasProviderProfile[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAlias, setGeneratedAlias] = useState<string | null>(null);
  const [fullDetails, setFullDetails] = useState<VaultAliasDetails | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const list = AliasProviderService.listProviderProfiles();
    setProviders(list);
    const def =
      list.find((p) => p.isDefault && p.enabled) || list.find((p) => p.enabled) || list[0];
    if (def) setSelectedProviderId(def.id);
  }, []);

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGeneratedAlias(null);
    setFullDetails(null);
    setIsSaved(false);

    try {
      const result = await AliasProviderService.provisionAlias({
        providerId: selectedProviderId,
        website: site,
        title: site,
        notes: `Quick alias generated for ${site || 'unknown site'}`,
      });

      const details = AliasProviderService.createAliasDetails({
        providerId: selectedProviderId,
        website: site,
        title: site,
      });

      details.email = result.email;
      details.providerAliasId = result.providerAliasId;
      details.providerSyncStatus = result.providerSyncStatus;
      details.providerManagementUrl = result.providerManagementUrl;

      setGeneratedAlias(result.email);
      setFullDetails(details);
      toast.success(t('quickAliasSuccess'));
    } catch (error) {
      console.error('Failed to generate alias:', error);
      toast.error(t('quickAliasGenerateError'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedAlias) return;
    navigator.clipboard.writeText(generatedAlias);
    toast.success(t('copiedToClipboard'));
  };

  const handleSaveToVault = async () => {
    if (!fullDetails || isSaved) return;

    try {
      await handleCreateEntry(
        {
          title: site || 'Masked Email',
          username: generatedAlias || '',
          category: 'Identities',
          notes: `Masked email generated via Quick Alias.\nProvider: ${fullDetails.providerLabel}`,
          aliasDetails: fullDetails,
          tags: ['Alias'],
        },
        []
      );
      setIsSaved(true);
      toast.success(t('aliasGeneratedLinkedToast'));
    } catch (error) {
      console.error('Save to vault failed:', error);
      toast.error(t('quickAliasSaveError'));
    }
  };

  const activeProvider = providers.find((p) => p.id === selectedProviderId);
  const providerStatus = activeProvider?.syncStatus || 'manual';
  const providerStatusLabel = t(`aliasProviderStatus_${providerStatus}`, providerStatus);
  const providerCapabilities = [
    activeProvider?.capabilities?.canProvision ? t('quickAliasCapabilityProvision') : null,
    activeProvider?.capabilities?.canRotate ? t('quickAliasCapabilityRotate') : null,
    activeProvider?.capabilities?.canManageOnline ? t('quickAliasCapabilityConsole') : null,
  ].filter(Boolean);

  return (
    <div className="v5-quick-alias-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-300">
      <div
        className="v5-quick-alias-surface v5-modal-surface w-full max-w-3xl overflow-hidden rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-alias-title"
      >
        <div className="v5-quick-alias-header">
          <div className="v5-quick-alias-title-row">
            <div className="v5-quick-alias-icon">
              <AtSign className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="v5-section-kicker">{t('quickAliasKicker')}</span>
              <h2 id="quick-alias-title">{t('quickAliasTitle')}</h2>
              <p>{t('quickAliasDesc')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="v5-quick-alias-close"
            aria-label={t('close', 'Close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="v5-quick-alias-body">
          <div className="v5-quick-alias-form-panel">
            <div className="v5-quick-alias-trust-strip">
              <span>
                <ShieldCheck className="h-3.5 w-3.5" />
                {t('quickAliasTrustPrivate')}
              </span>
              <span>
                <Wand2 className="h-3.5 w-3.5" />
                {t('quickAliasTrustDisposable')}
              </span>
              <span>
                <Copy className="h-3.5 w-3.5" />
                {t('quickAliasTrustVaultReady')}
              </span>
            </div>

            <div className="v5-quick-alias-field">
              <label htmlFor="quick-alias-site">{t('quickAliasSiteLabel')}</label>
              <div className="v5-quick-alias-control">
                <Wand2 className="h-4 w-4" />
                <input
                  id="quick-alias-site"
                  type="text"
                  placeholder={t('quickAliasSitePlaceholder')}
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                />
              </div>
            </div>

            <div className="v5-quick-alias-field">
              <label htmlFor="quick-alias-provider">{t('quickAliasProviderLabel')}</label>
              <div className="v5-quick-alias-control v5-quick-alias-select">
                <select
                  id="quick-alias-provider"
                  value={selectedProviderId || ''}
                  onChange={(e) => setSelectedProviderId(e.target.value)}
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.isDefault ? `(${t('aliasDefaultProvider')})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none h-4 w-4 opacity-45" />
              </div>
            </div>

            {generatedAlias ? (
              <div className="v5-quick-alias-result animate-in slide-in-from-top-4 duration-500">
                <div className="v5-quick-alias-result-main">
                  <div>
                    <span>{t('quickAliasResultLabel')}</span>
                    <code>{generatedAlias}</code>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="v5-quick-alias-icon-action"
                    aria-label={t('quickAliasCopyBtn')}
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                </div>
                <div className="v5-quick-alias-actions">
                  <button
                    type="button"
                    onClick={handleSaveToVault}
                    disabled={isSaved}
                    className="v5-quick-alias-primary"
                  >
                    {isSaved ? (
                      <ShieldCheck className="h-4 w-4" />
                    ) : (
                      <PlusCircle className="h-4 w-4" />
                    )}
                    {isSaved ? t('quickAliasSavedToVault') : t('quickAliasSaveVaultBtn')}
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="v5-quick-alias-secondary"
                    title={t('quickAliasRegenerate')}
                    aria-label={t('quickAliasRegenerate')}
                  >
                    <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                    <span>{t('quickAliasRegenerate')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !selectedProviderId}
                className="v5-quick-alias-primary v5-quick-alias-generate"
              >
                {isGenerating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <AtSign className="h-4 w-4" />
                )}
                {isGenerating ? t('quickAliasGenerating') : t('quickAliasGenerateBtn')}
              </button>
            )}
          </div>

          <aside className="v5-quick-alias-provider-card">
            <span className="v5-section-kicker">{t('quickAliasProviderStatus')}</span>
            <div className="v5-quick-alias-provider-title">
              <strong>{activeProvider?.name || t('notConfigured')}</strong>
              <span className={`v5-quick-alias-status v5-quick-alias-status-${providerStatus}`}>
                {providerStatusLabel}
              </span>
            </div>
            <dl>
              <div>
                <dt>{t('quickAliasDomain')}</dt>
                <dd>{activeProvider?.defaultDomain || '-'}</dd>
              </div>
              <div>
                <dt>{t('quickAliasForwarding')}</dt>
                <dd>{activeProvider?.forwardTo || t('notConfigured')}</dd>
              </div>
              <div>
                <dt>{t('quickAliasStrategy')}</dt>
                <dd>{activeProvider?.generationStrategy || '-'}</dd>
              </div>
            </dl>
            <div className="v5-quick-alias-capabilities">
              {providerCapabilities.length > 0 ? (
                providerCapabilities.map((capability) => <span key={capability}>{capability}</span>)
              ) : (
                <span>{t('quickAliasCapabilityManual')}</span>
              )}
            </div>
            {activeProvider?.managementUrl && (
              <a
                href={activeProvider.managementUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="v5-quick-alias-console"
              >
                {t('quickAliasProviderConsole')}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

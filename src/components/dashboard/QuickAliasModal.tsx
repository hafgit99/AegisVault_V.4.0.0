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

      // Update details with provisioned data
      details.email = result.email;
      details.providerAliasId = result.providerAliasId;
      details.providerSyncStatus = result.providerSyncStatus;
      details.providerManagementUrl = result.providerManagementUrl;

      setGeneratedAlias(result.email);
      setFullDetails(details);
      toast.success(t('quickAliasSuccess'));
    } catch (error) {
      console.error('Failed to generate alias:', error);
      toast.error('Failed to generate masked email.');
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
      toast.error('Failed to save entry to vault.');
    }
  };

  const activeProvider = providers.find((p) => p.id === selectedProviderId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-300">
      <div className="v5-modal-surface w-full max-w-lg overflow-hidden rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="v5-modal-header flex items-center justify-between border-b border-black/5 bg-gradient-to-r from-[var(--color-sage-green)]/5 to-[var(--color-deep-navy)]/5 px-6 py-4 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-[var(--color-deep-navy)] dark:text-white">
                {t('quickAliasTitle')}
              </h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/60 dark:text-white/60">
                Privacy Shield Generation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[var(--color-deep-navy)]/40 transition hover:bg-black/5 hover:text-[var(--color-deep-navy)] dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="mb-6 text-xs leading-relaxed text-[var(--color-deep-navy)]/70 dark:text-white/70">
            {t('quickAliasDesc')}
          </p>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-deep-navy)]/60 dark:text-white/60">
                {t('quickAliasSiteLabel')}
              </label>
              <div className="relative">
                <Wand2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-sage-green)] opacity-50" />
                <input
                  type="text"
                  placeholder={t('quickAliasSitePlaceholder')}
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                  className="v5-input-field w-full rounded-2xl border border-black/5 bg-black/[0.02] py-3 pl-10 pr-4 text-sm outline-none transition-all focus:border-[var(--color-sage-green)]/40 focus:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:focus:bg-[#1a253a]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-deep-navy)]/60 dark:text-white/60">
                {t('quickAliasProviderLabel')}
              </label>
              <div className="relative">
                <select
                  value={selectedProviderId || ''}
                  onChange={(e) => setSelectedProviderId(e.target.value)}
                  className="v5-input-field w-full appearance-none rounded-2xl border border-black/5 bg-black/[0.02] py-3 pl-4 pr-10 text-sm outline-none transition-all focus:border-[var(--color-sage-green)]/40 focus:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:focus:bg-[#1a253a]"
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.isDefault ? `(${t('aliasDefaultProvider')})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" />
              </div>
              {activeProvider && (
                <div className="flex items-center gap-2 px-1 pt-1">
                  <span className="text-[10px] font-medium opacity-50">
                    Domain: {activeProvider.defaultDomain}
                  </span>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${activeProvider.syncStatus === 'linked' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  />
                  <span className="text-[10px] font-medium opacity-50 capitalize">
                    {activeProvider.syncStatus}
                  </span>
                </div>
              )}
            </div>

            {generatedAlias ? (
              <div className="mt-6 space-y-4 animate-in slide-in-from-top-4 duration-500">
                <div className="group relative overflow-hidden rounded-2xl border border-[var(--color-sage-green)]/30 bg-[var(--color-sage-green)]/[0.03] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-sage-green)]">
                        {t('quickAliasSuccess')}
                      </div>
                      <div className="mt-1 font-mono text-base font-semibold tracking-tight text-[var(--color-deep-navy)] dark:text-white">
                        {generatedAlias}
                      </div>
                    </div>
                    <button
                      onClick={handleCopy}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)] transition-all hover:bg-[var(--color-sage-green)] hover:text-white active:scale-95"
                    >
                      <Copy className="h-5 w-5" />
                    </button>
                  </div>
                  <div
                    className="absolute bottom-0 left-0 h-1 bg-[var(--color-sage-green)]/20 transition-all group-hover:w-full"
                    style={{ width: '40%' }}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleSaveToVault}
                    disabled={isSaved}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--color-deep-navy)] dark:bg-white/10 px-4 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-[var(--color-deep-navy)]/90 dark:hover:bg-white/20 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSaved ? (
                      <ShieldCheck className="h-4 w-4" />
                    ) : (
                      <PlusCircle className="h-4 w-4" />
                    )}
                    {isSaved ? 'Saved to Vault' : t('quickAliasSaveVaultBtn')}
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="flex items-center justify-center rounded-2xl border border-black/5 bg-black/[0.03] px-4 py-3.5 transition-all hover:bg-black/5 active:scale-[0.98] dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/10"
                    title="Regenerate"
                  >
                    <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !selectedProviderId}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[var(--color-sage-green)] to-[var(--color-deep-navy)] dark:from-[var(--color-sage-green)]/40 dark:to-emerald-900/40 dark:border dark:border-[var(--color-sage-green)]/20 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-500/10 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
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
        </div>

        <div className="bg-black/[0.02] px-6 py-4 dark:bg-white/[0.02]">
          <div className="flex items-center justify-between text-[11px] font-medium opacity-40">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3" />
              <span>Zero-knowledge masking</span>
            </div>
            {activeProvider?.managementUrl && (
              <a
                href={activeProvider.managementUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 transition-opacity hover:opacity-100"
              >
                Provider Console
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

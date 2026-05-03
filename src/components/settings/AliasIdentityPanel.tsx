import { AtSign, ExternalLink, RefreshCw, Sparkles, ShieldAlert, Undo2 } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { AliasProviderService } from '../../lib/AliasProviderService';
import type { VaultEntry } from '../../vaultService';

interface AliasIdentityPanelProps {
  entry: Partial<VaultEntry>;
  setEntry: Dispatch<SetStateAction<Partial<VaultEntry>>>;
}

export function AliasIdentityPanel({ entry, setEntry }: AliasIdentityPanelProps) {
  const { t } = useTranslation();
  const providers = useMemo(() => AliasProviderService.listProviderProfiles(), []);
  const selectedProvider =
    AliasProviderService.getProviderProfile(entry.aliasDetails?.providerId) || providers[0] || null;

  const applyGeneratedAlias = async () => {
    const baseAlias = AliasProviderService.createAliasDetails({
      providerId: selectedProvider?.id,
      website: entry.website,
      title: entry.title,
      forwardTo: selectedProvider?.forwardTo,
      linkedEntryId: typeof entry.id === 'number' ? entry.id : undefined,
      notes: entry.aliasDetails?.notes,
    });
    const provisioned = await AliasProviderService.provisionAlias({
      providerId: selectedProvider?.id,
      website: entry.website,
      title: entry.title,
      forwardTo: selectedProvider?.forwardTo,
      notes: entry.aliasDetails?.notes,
    });
    const nextAlias = {
      ...baseAlias,
      email: provisioned.email,
      providerAliasId: provisioned.providerAliasId,
      providerSyncStatus: provisioned.providerSyncStatus,
      providerManagementUrl: provisioned.providerManagementUrl,
      watchtowerScore: AliasProviderService.evaluateAliasRisk(baseAlias).score,
    };

    setEntry((prev) => ({
      ...prev,
      username: nextAlias.email,
      aliasDetails: nextAlias,
    }));
    toast.success(
      provisioned.providerSyncStatus === 'linked'
        ? t('aliasGeneratedLinkedToast')
        : t('aliasGeneratedToast')
    );
  };

  const markCompromised = () => {
    if (!entry.aliasDetails) return;
    setEntry((prev) => ({
      ...prev,
      aliasDetails: prev.aliasDetails
        ? AliasProviderService.markAliasExposed(prev.aliasDetails, 'compromised', 'manual')
        : prev.aliasDetails,
    }));
    toast.warning(t('aliasMarkedExposedToast'));
  };

  const rotateAlias = () => {
    if (!entry.aliasDetails) return;
    const rotated = AliasProviderService.rotateAlias(entry.aliasDetails);
    setEntry((prev) => ({
      ...prev,
      username: rotated.email,
      aliasDetails: rotated,
    }));
    toast.success(t('aliasRotatedToast'));
  };

  const queueAliasRotation = () => {
    if (!entry.aliasDetails) return;
    setEntry((prev) => ({
      ...prev,
      aliasDetails: prev.aliasDetails
        ? AliasProviderService.queueRotation(prev.aliasDetails, 'manual')
        : prev.aliasDetails,
    }));
    toast.info(t('aliasQueuedToast'));
  };

  const rollbackAlias = () => {
    if (!entry.aliasDetails?.history?.length) return;
    const next = AliasProviderService.rollbackAlias(entry.aliasDetails);
    setEntry((prev) => ({
      ...prev,
      username: next.email,
      aliasDetails: next,
    }));
    toast.success(t('aliasRollbackToast'));
  };

  return (
    <div className="col-span-2 rounded-xl border border-[var(--color-sage-green)]/20 bg-[var(--color-sage-green)]/5 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-sage-green)]">
            {t('aliasPanelTitle')}
          </div>
          <p className="mt-1 text-xs text-[var(--color-deep-navy)]/65 dark:text-white/70">
            {t('aliasPanelDesc')}
          </p>
        </div>
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-[var(--color-deep-navy)]/70 dark:bg-white/10 dark:text-white/80">
          {entry.aliasDetails?.status
            ? t(`aliasStatus.${entry.aliasDetails.status}`)
            : t('aliasNotConfigured')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <select
          value={entry.aliasDetails?.providerId || selectedProvider?.id || ''}
          onChange={(e) => {
            const provider = AliasProviderService.getProviderProfile(e.target.value);
            setEntry((prev) => ({
              ...prev,
              aliasDetails: prev.aliasDetails
                ? {
                    ...prev.aliasDetails,
                    providerId: provider?.id || '',
                    providerLabel: provider?.name || '',
                    forwardTo: provider?.forwardTo || prev.aliasDetails.forwardTo,
                    updatedAt: new Date().toISOString(),
                  }
                : null,
            }));
          }}
          className="entry-field rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
        >
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name}
            </option>
          ))}
        </select>

        <input
          type="email"
          placeholder={t('aliasForwardToPlaceholder')}
          value={entry.aliasDetails?.forwardTo || selectedProvider?.forwardTo || ''}
          onChange={(e) =>
            setEntry((prev) => ({
              ...prev,
              aliasDetails: prev.aliasDetails
                ? {
                    ...prev.aliasDetails,
                    forwardTo: e.target.value,
                    updatedAt: new Date().toISOString(),
                  }
                : {
                    providerId: selectedProvider?.id || 'custom',
                    providerLabel: selectedProvider?.name || 'Custom Alias Provider',
                    email: '',
                    forwardTo: e.target.value,
                    status: 'active',
                    exposureCategory: 'none',
                    exposureCount: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
            }))
          }
          className="entry-field rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
        />

        <div className="md:col-span-2 flex gap-2">
          <input
            type="email"
            placeholder={t('aliasEmailPlaceholder')}
            value={entry.aliasDetails?.email || ''}
            onChange={(e) =>
              setEntry((prev) => ({
                ...prev,
                username: e.target.value,
                aliasDetails: {
                  providerId: prev.aliasDetails?.providerId || selectedProvider?.id || 'custom',
                  providerLabel:
                    prev.aliasDetails?.providerLabel ||
                    selectedProvider?.name ||
                    'Custom Alias Provider',
                  email: e.target.value,
                  website: prev.website || '',
                  notes: prev.aliasDetails?.notes || '',
                  forwardTo: prev.aliasDetails?.forwardTo || selectedProvider?.forwardTo,
                  status: prev.aliasDetails?.status || 'active',
                  exposureCategory: prev.aliasDetails?.exposureCategory || 'none',
                  exposureCount: prev.aliasDetails?.exposureCount || 0,
                  createdAt: prev.aliasDetails?.createdAt || new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  lastUsedAt: prev.aliasDetails?.lastUsedAt,
                  lastRotatedAt: prev.aliasDetails?.lastRotatedAt,
                  linkedEntryId: typeof prev.id === 'number' ? prev.id : undefined,
                },
              }))
            }
            className="entry-field flex-1 rounded-lg py-2.5 px-3 text-sm font-medium outline-none font-[var(--font-geist-mono)]"
          />
          <button
            type="button"
            onClick={applyGeneratedAlias}
            className="px-3 py-2 rounded-lg totp-btn-secondary transition-all border border-[var(--color-sage-green)]/20 flex items-center gap-1.5 text-xs font-bold"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {t('aliasGenerate')}
          </button>
        </div>

        <input
          type="text"
          placeholder={t('aliasNotesPlaceholder')}
          value={entry.aliasDetails?.notes || ''}
          onChange={(e) =>
            setEntry((prev) => ({
              ...prev,
              aliasDetails: prev.aliasDetails
                ? {
                    ...prev.aliasDetails,
                    notes: e.target.value,
                    website: prev.website || prev.aliasDetails.website,
                    updatedAt: new Date().toISOString(),
                  }
                : null,
            }))
          }
          className="entry-field rounded-lg py-2.5 px-3 text-sm font-medium outline-none md:col-span-2"
        />
      </div>

      <div className="alias-action-row mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={queueAliasRotation}
          disabled={!entry.aliasDetails?.email}
          className="alias-action-btn px-3 py-2 rounded-lg bg-slate-500/10 text-slate-700 dark:text-slate-200 border border-slate-500/20 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t('aliasQueueRotation')}
        </button>
        <button
          type="button"
          onClick={rotateAlias}
          disabled={!entry.aliasDetails?.email}
          className="alias-action-btn px-3 py-2 rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t('aliasRotate')}
        </button>
        <button
          type="button"
          onClick={markCompromised}
          disabled={!entry.aliasDetails?.email}
          className="alias-action-btn px-3 py-2 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          {t('aliasMarkExposed')}
        </button>
        <button
          type="button"
          onClick={rollbackAlias}
          disabled={
            !entry.aliasDetails?.history?.some((item) => item.email !== entry.aliasDetails?.email)
          }
          className="alias-action-btn px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
        >
          <Undo2 className="w-3.5 h-3.5" />
          {t('aliasRollback')}
        </button>
        <button
          type="button"
          onClick={() =>
            setEntry((prev) => ({
              ...prev,
              aliasDetails: null,
            }))
          }
          className="alias-action-btn px-3 py-2 rounded-lg bg-white/70 text-[var(--color-deep-navy)] border border-black/10 dark:bg-white/10 dark:text-white text-xs font-bold flex items-center gap-1.5"
        >
          <AtSign className="w-3.5 h-3.5" />
          {t('aliasClear')}
        </button>
      </div>

      {entry.aliasDetails?.email ? (
        <div className="mt-3 rounded-xl bg-white/70 dark:bg-white/5 px-3 py-3 text-xs text-[var(--color-deep-navy)]/75 dark:text-white/75">
          <div className="font-semibold text-[var(--color-deep-navy)] dark:text-white">
            {entry.aliasDetails.email}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <span>
              {t('aliasProviderLabel')}: {entry.aliasDetails.providerLabel}
            </span>
            <span>
              {t('aliasExposureCount')}: {entry.aliasDetails.exposureCount || 0}
            </span>
            {entry.aliasDetails.lastRotatedAt ? (
              <span>
                {t('aliasLastRotated')}:{' '}
                {new Date(entry.aliasDetails.lastRotatedAt).toLocaleDateString()}
              </span>
            ) : null}
            <span>
              {t('aliasProviderSyncStatus')}:{' '}
              {t(`aliasSyncStatus.${entry.aliasDetails.providerSyncStatus || 'manual'}`)}
            </span>
            <span>
              {t('aliasWatchtowerScore')}: {entry.aliasDetails.watchtowerScore || 100}/100
            </span>
          </div>
          {entry.aliasDetails.providerManagementUrl ? (
            <a
              href={entry.aliasDetails.providerManagementUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-sage-green)]"
            >
              <ExternalLink className="w-3 h-3" />
              {t('aliasOpenProvider')}
            </a>
          ) : null}
          {entry.aliasDetails.rotationQueue?.length ? (
            <div className="mt-2 rounded-lg bg-black/5 px-2.5 py-2 dark:bg-white/5">
              <div className="text-[11px] font-semibold">
                {t('aliasQueueSummary', { count: entry.aliasDetails.rotationQueue.length })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

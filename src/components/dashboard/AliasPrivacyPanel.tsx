import { AtSign, Forward, Plus, RefreshCw, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { AliasProviderService } from '../../lib/AliasProviderService';
import type { AliasProviderKind } from '../../lib/alias-types';
import type { VaultEntry } from '../../vaultService';

interface AliasPrivacyPanelProps {
  passwords: VaultEntry[];
  onEditEntry: (entry: VaultEntry) => void;
}

const DEFAULT_PROVIDER_KIND: AliasProviderKind = 'custom';

export function AliasPrivacyPanel({ passwords, onEditEntry }: AliasPrivacyPanelProps) {
  const { t } = useTranslation();
  const [providers, setProviders] = useState(() => AliasProviderService.listProviderProfiles());
  const [draftName, setDraftName] = useState('');
  const [draftKind, setDraftKind] = useState<AliasProviderKind>(DEFAULT_PROVIDER_KIND);
  const [draftDomains, setDraftDomains] = useState('');
  const [draftForwardTo, setDraftForwardTo] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftApiBaseUrl, setDraftApiBaseUrl] = useState('');
  const [draftApiToken, setDraftApiToken] = useState('');
  const [draftAccountLabel, setDraftAccountLabel] = useState('');
  const aliasSummary = useMemo(() => AliasProviderService.summarizeAliases(passwords), [passwords]);
  const aliasEntries = useMemo(() => AliasProviderService.triageAliases(passwords), [passwords]);

  const saveProvider = () => {
    const domains = draftDomains
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (!draftName.trim() || domains.length === 0) {
      toast.error(t('aliasProviderValidation'));
      return;
    }
    const saved = AliasProviderService.saveProviderProfile({
      name: draftName,
      kind: draftKind,
      domains,
      defaultDomain: domains[0],
      forwardTo: draftForwardTo,
      generationStrategy: 'site_plus_random',
      description: draftDescription,
      enabled: true,
      isDefault: providers.filter((item) => item.enabled).length === 0,
      apiBaseUrl: draftApiBaseUrl,
      apiToken: draftApiToken,
      accountLabel: draftAccountLabel,
      syncMode: draftKind === 'simplelogin' || draftKind === 'addy' ? 'api' : 'manual',
    });
    setProviders(AliasProviderService.listProviderProfiles());
    setDraftName('');
    setDraftDomains('');
    setDraftForwardTo('');
    setDraftDescription('');
    setDraftApiBaseUrl('');
    setDraftApiToken('');
    setDraftAccountLabel('');
    setDraftKind(DEFAULT_PROVIDER_KIND);
    toast.success(t('aliasProviderSavedToast', { name: saved.name }));
  };

  const openRotation = (entry: VaultEntry) => {
    if (!entry.aliasDetails) return;
    const rotated = AliasProviderService.queueRotation(entry.aliasDetails, 'manual');
    onEditEntry({
      ...entry,
      username: entry.username,
      aliasDetails: rotated,
    });
    toast.info(
      t('aliasRotationQueuedToast', {
        alias: rotated.rotationQueue?.[0]?.candidateEmail || rotated.email,
      })
    );
  };

  const rollbackAlias = (entry: VaultEntry) => {
    if (!entry.aliasDetails) return;
    const rollback = AliasProviderService.rollbackAlias(entry.aliasDetails);
    onEditEntry({
      ...entry,
      username: rollback.email,
      aliasDetails: rollback,
    });
    toast.success(t('aliasRollbackToast'));
  };

  const markExposed = (entry: VaultEntry) => {
    if (!entry.aliasDetails) return;
    const next = AliasProviderService.markAliasExposed(entry.aliasDetails, 'compromised', 'manual');
    onEditEntry({
      ...entry,
      aliasDetails: next,
    });
    toast.warning(t('aliasExposureQueuedToast'));
  };

  return (
    <div className="settings-panel v5-alias-panel rounded-3xl p-6 shadow-sm">
      <div className="v5-alias-hero flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="v5-alias-hero-icon">
              <AtSign className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-[var(--color-deep-navy)] dark:text-white">
              {t('aliasManagerTitle')}
            </h3>
          </div>
          <p className="mt-2 text-sm opacity-70 max-w-2xl">{t('aliasManagerDesc')}</p>
        </div>
        <span className="rounded-full bg-[var(--color-sage-green)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-sage-green)]">
          {t('aliasConfiguredCount', { count: aliasSummary.total })}
        </span>
      </div>

      <div className="v5-alias-metrics grid grid-cols-1 gap-3 mb-5">
        <div className="settings-subpanel v5-alias-metric rounded-2xl border p-4">
          <div className="text-[10px] uppercase tracking-widest opacity-60">
            {t('aliasSummaryActive')}
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--color-deep-navy)] dark:text-white">
            {aliasSummary.active}
          </div>
        </div>
        <div className="settings-subpanel v5-alias-metric v5-alias-metric-warning rounded-2xl border p-4">
          <div className="text-[10px] uppercase tracking-widest opacity-60">
            {t('aliasSummaryCompromised')}
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">{aliasSummary.compromised}</div>
        </div>
        <div className="settings-subpanel v5-alias-metric v5-alias-metric-info rounded-2xl border p-4">
          <div className="text-[10px] uppercase tracking-widest opacity-60">
            {t('aliasSummaryRotated')}
          </div>
          <div className="mt-2 text-2xl font-bold text-sky-600">{aliasSummary.rotated}</div>
        </div>
        <div className="settings-subpanel v5-alias-metric rounded-2xl border p-4">
          <div className="text-[10px] uppercase tracking-widest opacity-60">
            {t('aliasSummaryQueued')}
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-600 dark:text-slate-200">
            {aliasSummary.queued}
          </div>
        </div>
        <div className="settings-subpanel v5-alias-metric rounded-2xl border p-4">
          <div className="text-[10px] uppercase tracking-widest opacity-60">
            {t('aliasProvidersLabel')}
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--color-deep-navy)] dark:text-white">
            {providers.length}
          </div>
        </div>
      </div>

      <div className="v5-alias-layout grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
        <div className="v5-alias-list space-y-4">
          {aliasEntries.length === 0 ? (
            <div className="settings-subpanel v5-alias-empty rounded-2xl border p-5 text-sm opacity-70">
              {t('aliasEmptyState')}
            </div>
          ) : (
            aliasEntries.slice(0, 8).map(({ entry, alias, risk }) => (
              <div
                key={entry.id}
                className="settings-subpanel v5-alias-entry-card rounded-2xl border p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold text-[var(--color-deep-navy)] dark:text-white">
                      {entry.title}
                    </div>
                    <div className="v5-alias-email mt-1 font-[var(--font-geist-mono)] text-sm opacity-80">
                      {alias.email}
                    </div>
                    <div className="v5-alias-tags mt-3 flex flex-wrap gap-2 text-[11px]">
                      <span>{alias.providerLabel}</span>
                      <span>{t(`aliasStatus.${alias.status || 'active'}`)}</span>
                      <span>
                        {t('aliasWatchtowerScore')}: {risk.score}/100
                      </span>
                      <span>{t(`aliasSyncStatus.${alias.providerSyncStatus || 'manual'}`)}</span>
                      {alias.forwardTo ? (
                        <span>
                          <Forward className="inline w-3 h-3 mr-1" />
                          {alias.forwardTo}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="v5-alias-card-actions flex flex-wrap justify-end gap-2">
                    <button
                      onClick={() => openRotation(entry)}
                      className="v5-alias-action v5-alias-action-info px-3 py-2 rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-300 text-xs font-bold flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {t('aliasQueueRotation')}
                    </button>
                    <button
                      onClick={() => markExposed(entry)}
                      className="v5-alias-action v5-alias-action-warning px-3 py-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      {t('aliasMarkExposed')}
                    </button>
                    <button
                      onClick={() => rollbackAlias(entry)}
                      className="v5-alias-action v5-alias-action-success px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5"
                    >
                      {t('aliasRollback')}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="settings-subpanel v5-alias-provider-panel rounded-3xl border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-4 h-4 text-[var(--color-sage-green)]" />
            <h4 className="font-semibold text-[var(--color-deep-navy)] dark:text-white">
              {t('aliasProviderCreateTitle')}
            </h4>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder={t('aliasProviderNamePlaceholder')}
              className="entry-field w-full rounded-xl py-2.5 px-3 text-sm font-medium outline-none"
            />
            <select
              value={draftKind}
              onChange={(e) => setDraftKind(e.target.value as AliasProviderKind)}
              className="entry-field w-full rounded-xl py-2.5 px-3 text-sm font-medium outline-none"
            >
              <option value="custom">{t('aliasProviderKind.custom')}</option>
              <option value="simplelogin">{t('aliasProviderKind.simplelogin')}</option>
              <option value="addy">{t('aliasProviderKind.addy')}</option>
              <option value="duckduckgo">{t('aliasProviderKind.duckduckgo')}</option>
              <option value="firefox_relay">{t('aliasProviderKind.firefox_relay')}</option>
            </select>
            <input
              type="text"
              value={draftDomains}
              onChange={(e) => setDraftDomains(e.target.value)}
              placeholder={t('aliasProviderDomainsPlaceholder')}
              className="entry-field w-full rounded-xl py-2.5 px-3 text-sm font-medium outline-none font-[var(--font-geist-mono)]"
            />
            <input
              type="email"
              value={draftForwardTo}
              onChange={(e) => setDraftForwardTo(e.target.value)}
              placeholder={t('aliasForwardToPlaceholder')}
              className="entry-field w-full rounded-xl py-2.5 px-3 text-sm font-medium outline-none"
            />
            <textarea
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              placeholder={t('aliasProviderDescriptionPlaceholder')}
              rows={3}
              className="entry-field w-full rounded-xl py-2.5 px-3 text-sm font-medium outline-none resize-none"
            />
            <input
              type="text"
              value={draftAccountLabel}
              onChange={(e) => setDraftAccountLabel(e.target.value)}
              placeholder={t('aliasProviderAccountPlaceholder')}
              className="entry-field w-full rounded-xl py-2.5 px-3 text-sm font-medium outline-none"
            />
            <input
              type="url"
              value={draftApiBaseUrl}
              onChange={(e) => setDraftApiBaseUrl(e.target.value)}
              placeholder={t('aliasProviderApiBasePlaceholder')}
              className="entry-field w-full rounded-xl py-2.5 px-3 text-sm font-medium outline-none font-[var(--font-geist-mono)]"
            />
            <input
              type="password"
              value={draftApiToken}
              onChange={(e) => setDraftApiToken(e.target.value)}
              placeholder={t('aliasProviderApiTokenPlaceholder')}
              className="entry-field w-full rounded-xl py-2.5 px-3 text-sm font-medium outline-none font-[var(--font-geist-mono)]"
            />
            <button
              onClick={saveProvider}
              className="v5-alias-save-btn w-full py-3 rounded-2xl bg-[var(--color-sage-green)] text-[var(--color-deep-navy)] text-sm font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              {t('aliasProviderSave')}
            </button>
          </div>

          <div className="v5-alias-provider-list mt-5 space-y-2">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="v5-alias-provider-item rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-sm text-[var(--color-deep-navy)] dark:text-white">
                      {provider.name}
                    </div>
                    <div className="mt-1 text-[11px] opacity-70">{provider.domains.join(', ')}</div>
                    <div className="mt-1 text-[11px] opacity-70">
                      {t(`aliasSyncStatus.${provider.syncStatus || 'manual'}`)}
                    </div>
                  </div>
                  {!provider.isDefault ? (
                    <button
                      onClick={() => {
                        AliasProviderService.deleteProviderProfile(provider.id);
                        setProviders(AliasProviderService.listProviderProfiles());
                      }}
                      className="text-xs font-bold text-red-600"
                    >
                      {t('aliasProviderDelete')}
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-sage-green)]">
                      {t('aliasDefaultProvider')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import type {
  AliasAuditEvent,
  AliasGenerationStrategy,
  AliasHistoryEvent,
  AliasProviderProfile,
  AliasRotationQueueItem,
  AliasStatus,
  AliasWatchtowerState,
  VaultAliasDetails,
} from './alias-types';
import { DEFAULT_ALIAS_PROVIDER_PROFILES } from './alias-types';
import { SecureAppSettings } from './SecureAppSettings';
import type { VaultEntry } from '../vaultService';

const sanitizeSlug = (value: string) =>
  String(value || '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20);

const randomToken = (length = 8) => {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
};

const nowIso = () => new Date().toISOString();

const ensureOneDefault = (profiles: AliasProviderProfile[]) => {
  let defaultAssigned = false;
  return profiles.map((profile, index) => {
    const next = { ...profile };
    if (next.enabled && !defaultAssigned && (next.isDefault || index === 0)) {
      next.isDefault = true;
      defaultAssigned = true;
    } else {
      next.isDefault = false;
    }
    return next;
  });
};

const cloneHistory = (history?: AliasHistoryEvent[]) =>
  Array.isArray(history) ? history.map((item) => ({ ...item })) : [];

const cloneQueue = (queue?: AliasRotationQueueItem[]) =>
  Array.isArray(queue) ? queue.map((item) => ({ ...item })) : [];

const getDefaultCapabilities = (profile: Pick<AliasProviderProfile, 'kind' | 'syncMode'>) => {
  if (profile.kind === 'simplelogin' || profile.kind === 'addy') {
    return {
      canProvision: true,
      canRotate: true,
      canDeactivate: true,
      canManageOnline: true,
    };
  }
  return {
    canProvision: false,
    canRotate: false,
    canDeactivate: false,
    canManageOnline: true,
  };
};

const getProviderAliasEmail = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') return null;
  const candidate = payload as Record<string, unknown>;
  const possible =
    candidate.email ||
    candidate.alias ||
    candidate.address ||
    candidate.mail ||
    (candidate.data && typeof candidate.data === 'object'
      ? (candidate.data as Record<string, unknown>).email ||
        (candidate.data as Record<string, unknown>).alias ||
        (candidate.data as Record<string, unknown>).address
      : null);
  return typeof possible === 'string' && possible.includes('@') ? possible : null;
};

const getProviderAliasId = (payload: unknown): string | undefined => {
  if (!payload || typeof payload !== 'object') return undefined;
  const candidate = payload as Record<string, unknown>;
  const possible =
    candidate.id ||
    candidate.alias_id ||
    candidate.aliasId ||
    (candidate.data && typeof candidate.data === 'object'
      ? (candidate.data as Record<string, unknown>).id ||
        (candidate.data as Record<string, unknown>).alias_id
      : null);
  return typeof possible === 'string' ? possible : undefined;
};

const normalizeAliasState = (details: VaultAliasDetails): VaultAliasDetails => {
  const history = cloneHistory(details.history);
  const rotationQueue = cloneQueue(details.rotationQueue);
  const next: VaultAliasDetails = {
    ...details,
    history,
    rotationQueue,
    providerSyncStatus: details.providerSyncStatus || 'manual',
  };
  const risk = AliasProviderService.evaluateAliasRisk(next);
  next.watchtowerScore = risk.score;
  next.watchtowerState = risk.state;
  return next;
};

export class AliasProviderService {
  static listProviderProfiles(): AliasProviderProfile[] {
    const stored = SecureAppSettings.getAliasProviders();
    const profiles = stored.length > 0 ? stored : DEFAULT_ALIAS_PROVIDER_PROFILES;
    return profiles.map((profile) => ({
      ...profile,
      domains: [...profile.domains],
      capabilities: profile.capabilities
        ? { ...profile.capabilities }
        : getDefaultCapabilities(profile),
      syncMode:
        profile.syncMode ||
        (profile.kind === 'simplelogin' || profile.kind === 'addy' ? 'api' : 'manual'),
      syncStatus:
        profile.syncStatus ||
        (profile.kind === 'simplelogin' || profile.kind === 'addy' ? 'ready' : 'manual'),
    }));
  }

  static getProviderProfile(id?: string | null): AliasProviderProfile | null {
    const profiles = this.listProviderProfiles();
    if (id) {
      const exact = profiles.find((profile) => profile.id === id);
      if (exact) return exact;
    }
    return profiles.find((profile) => profile.enabled && profile.isDefault) || profiles[0] || null;
  }

  static saveProviderProfile(
    draft: Omit<AliasProviderProfile, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string;
      createdAt?: string;
      updatedAt?: string;
    }
  ): AliasProviderProfile {
    const profiles = this.listProviderProfiles();
    const timestamp = nowIso();
    const normalizedDomains = draft.domains
      .map((domain) =>
        String(domain || '')
          .trim()
          .toLowerCase()
      )
      .filter(Boolean);
    if (normalizedDomains.length === 0) {
      normalizedDomains.push('example-alias.test');
    }

    const inferredSyncMode =
      draft.syncMode || (draft.kind === 'simplelogin' || draft.kind === 'addy' ? 'api' : 'manual');
    const capabilities = {
      ...getDefaultCapabilities({ kind: draft.kind, syncMode: inferredSyncMode }),
      ...(draft.capabilities || {}),
    };
    const hasApiToken = Boolean(draft.apiToken?.trim());

    const profile: AliasProviderProfile = {
      id: draft.id || `alias-provider-${randomToken(10)}`,
      name: String(draft.name || '').trim() || 'Custom Alias Provider',
      kind: draft.kind,
      domains: Array.from(new Set(normalizedDomains)),
      defaultDomain: normalizedDomains.includes(draft.defaultDomain)
        ? draft.defaultDomain
        : normalizedDomains[0],
      forwardTo: draft.forwardTo?.trim() || undefined,
      generationStrategy: draft.generationStrategy,
      description: draft.description?.trim() || undefined,
      enabled: draft.enabled !== false,
      isDefault: Boolean(draft.isDefault),
      syncMode: inferredSyncMode,
      syncStatus: inferredSyncMode === 'api' ? (hasApiToken ? 'linked' : 'ready') : 'manual',
      accountLabel: draft.accountLabel?.trim() || undefined,
      apiBaseUrl: draft.apiBaseUrl?.trim() || undefined,
      apiToken: draft.apiToken?.trim() || undefined,
      managementUrl: draft.managementUrl?.trim() || undefined,
      capabilities,
      createdAt: draft.createdAt || timestamp,
      updatedAt: timestamp,
    };

    const nextProfiles = ensureOneDefault(
      profiles.some((item) => item.id === profile.id)
        ? profiles.map((item) => (item.id === profile.id ? profile : item))
        : [...profiles, profile]
    );
    SecureAppSettings.setAliasProviders(nextProfiles);
    this.appendAuditEvent({
      id: `alias-audit-${randomToken(12)}`,
      at: timestamp,
      type: 'provider_saved',
      providerId: profile.id,
      detail: profile.name,
      metadata: {
        sync_mode: profile.syncMode,
        sync_status: profile.syncStatus,
      },
    });
    return nextProfiles.find((item) => item.id === profile.id) || profile;
  }

  static deleteProviderProfile(id: string): void {
    const current = this.listProviderProfiles();
    const next = ensureOneDefault(current.filter((profile) => profile.id !== id));
    SecureAppSettings.setAliasProviders(next);
    this.appendAuditEvent({
      id: `alias-audit-${randomToken(12)}`,
      at: nowIso(),
      type: 'provider_deleted',
      providerId: id,
    });
  }

  static listAuditEvents(): AliasAuditEvent[] {
    return SecureAppSettings.getAliasAudit();
  }

  static appendAuditEvent(event: AliasAuditEvent): void {
    const next = [event, ...SecureAppSettings.getAliasAudit()].slice(0, 120);
    SecureAppSettings.setAliasAudit(next);
  }

  static generateAliasEmail(args: {
    providerId?: string | null;
    website?: string;
    title?: string;
    strategy?: AliasGenerationStrategy;
  }): { email: string; provider: AliasProviderProfile | null } {
    const provider = this.getProviderProfile(args.providerId);
    const domain = provider?.defaultDomain || 'example-alias.test';
    const siteSlug = sanitizeSlug(args.website || args.title || 'vault');
    const strategy = args.strategy || provider?.generationStrategy || 'site_plus_random';

    let localPart = randomToken(10);
    if (strategy === 'site_name') {
      localPart = siteSlug || randomToken(10);
    } else if (strategy === 'site_plus_random') {
      localPart = `${siteSlug || 'site'}-${randomToken(6)}`;
    }

    return {
      email: `${localPart}@${domain}`,
      provider,
    };
  }

  static buildManagementUrl(
    details: Pick<VaultAliasDetails, 'email' | 'providerManagementUrl'>,
    provider?: AliasProviderProfile | null
  ): string | undefined {
    const base = details.providerManagementUrl || provider?.managementUrl;
    if (!base) return undefined;
    try {
      const url = new URL(base);
      url.searchParams.set('alias', details.email);
      return url.toString();
    } catch {
      return base;
    }
  }

  static async provisionAlias(args: {
    providerId?: string | null;
    website?: string;
    title?: string;
    forwardTo?: string;
    notes?: string;
  }): Promise<{
    email: string;
    provider: AliasProviderProfile | null;
    providerAliasId?: string;
    providerSyncStatus: VaultAliasDetails['providerSyncStatus'];
    providerManagementUrl?: string;
  }> {
    const fallback = this.generateAliasEmail(args);
    const provider = fallback.provider;
    if (!provider) {
      return {
        email: fallback.email,
        provider: null,
        providerSyncStatus: 'manual',
      };
    }

    const managementUrl = this.buildManagementUrl(
      { email: fallback.email, providerManagementUrl: provider.managementUrl },
      provider
    );

    if (
      provider.syncMode !== 'api' ||
      !provider.capabilities?.canProvision ||
      !provider.apiToken ||
      !provider.apiBaseUrl
    ) {
      return {
        email: fallback.email,
        provider,
        providerSyncStatus: provider.syncMode === 'api' ? 'ready' : 'manual',
        providerManagementUrl: managementUrl,
      };
    }

    if (provider.kind !== 'simplelogin' && provider.kind !== 'addy') {
      return {
        email: fallback.email,
        provider,
        providerSyncStatus: 'manual',
        providerManagementUrl: managementUrl,
      };
    }

    const endpoint =
      provider.kind === 'simplelogin'
        ? `${provider.apiBaseUrl.replace(/\/$/, '')}/aliases`
        : `${provider.apiBaseUrl.replace(/\/$/, '')}/aliases`;
    const [localPart, domain] = fallback.email.split('@');
    const payload =
      provider.kind === 'simplelogin'
        ? {
            alias_prefix: localPart,
            domain,
            note: args.notes || args.title || args.website || 'Aegis Vault alias',
          }
        : {
            local_part: localPart,
            domain,
            description: args.notes || args.title || args.website || 'Aegis Vault alias',
          };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provider.apiToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`provider_http_${response.status}`);
      }

      const result = (await response.json().catch(() => null)) as unknown;
      const email = getProviderAliasEmail(result) || fallback.email;
      return {
        email,
        provider,
        providerAliasId: getProviderAliasId(result),
        providerSyncStatus: 'linked',
        providerManagementUrl: this.buildManagementUrl(
          { email, providerManagementUrl: provider.managementUrl },
          provider
        ),
      };
    } catch {
      return {
        email: fallback.email,
        provider,
        providerSyncStatus: 'error',
        providerManagementUrl: managementUrl,
      };
    }
  }

  static createAliasDetails(args: {
    providerId?: string | null;
    website?: string;
    title?: string;
    forwardTo?: string;
    linkedEntryId?: number;
    notes?: string;
  }): VaultAliasDetails {
    const { email, provider } = this.generateAliasEmail(args);
    const timestamp = nowIso();
    const details: VaultAliasDetails = normalizeAliasState({
      providerId: provider?.id || 'custom',
      providerLabel: provider?.name || 'Custom Alias Provider',
      email,
      website: args.website?.trim() || undefined,
      notes: args.notes?.trim() || undefined,
      forwardTo: args.forwardTo?.trim() || provider?.forwardTo,
      status: 'active',
      exposureCategory: 'none',
      exposureCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      linkedEntryId: args.linkedEntryId,
      providerSyncStatus:
        provider?.syncStatus || (provider?.syncMode === 'api' ? 'ready' : 'manual'),
      providerManagementUrl: provider?.managementUrl,
      history: [
        {
          id: `alias-history-${randomToken(10)}`,
          at: timestamp,
          type: 'created',
          email,
          reason: 'initial',
        },
      ],
      rotationQueue: [],
    });
    this.appendAuditEvent({
      id: `alias-audit-${randomToken(12)}`,
      at: timestamp,
      type: 'alias_generated',
      aliasEmail: details.email,
      providerId: details.providerId,
      entryId: args.linkedEntryId,
      detail: args.website || args.title,
    });
    return details;
  }

  static attachAliasToEntry(details: VaultAliasDetails, entryId?: number): VaultAliasDetails {
    const next = normalizeAliasState({
      ...details,
      linkedEntryId: entryId,
      updatedAt: nowIso(),
    });
    this.appendAuditEvent({
      id: `alias-audit-${randomToken(12)}`,
      at: next.updatedAt,
      type: 'alias_attached',
      aliasEmail: next.email,
      providerId: next.providerId,
      entryId,
    });
    return next;
  }

  static markAliasExposed(
    details: VaultAliasDetails,
    status: AliasStatus = 'compromised',
    category: VaultAliasDetails['exposureCategory'] = 'manual'
  ): VaultAliasDetails {
    const timestamp = nowIso();
    const next = normalizeAliasState({
      ...details,
      status,
      exposureCategory: category,
      exposureCount: (details.exposureCount || 0) + 1,
      updatedAt: timestamp,
      history: [
        {
          id: `alias-history-${randomToken(10)}`,
          at: timestamp,
          type: 'exposed' as const,
          email: details.email,
          providerAliasId: details.providerAliasId,
          reason: category || 'manual',
        },
        ...cloneHistory(details.history),
      ].slice(0, 24),
    });
    this.appendAuditEvent({
      id: `alias-audit-${randomToken(12)}`,
      at: timestamp,
      type: 'alias_marked_exposed',
      aliasEmail: next.email,
      providerId: next.providerId,
      entryId: next.linkedEntryId,
      detail: category,
    });
    return next;
  }

  static queueRotation(
    details: VaultAliasDetails,
    reason: AliasRotationQueueItem['reason'] = 'manual'
  ): VaultAliasDetails {
    const timestamp = nowIso();
    const candidate = this.generateAliasEmail({
      providerId: details.providerId,
      website: details.website,
      title: details.website,
    });
    return normalizeAliasState({
      ...details,
      updatedAt: timestamp,
      rotationQueue: [
        {
          id: `alias-queue-${randomToken(10)}`,
          requestedAt: timestamp,
          reason,
          status: 'queued' as const,
          candidateEmail: candidate.email,
        } as AliasRotationQueueItem,
        ...cloneQueue(details.rotationQueue),
      ].slice(0, 8),
    });
  }

  static rotateAlias(
    details: VaultAliasDetails,
    reason: AliasRotationQueueItem['reason'] = 'manual'
  ): VaultAliasDetails {
    const generated = this.generateAliasEmail({
      providerId: details.providerId,
      website: details.website,
      title: details.website,
    });
    const timestamp = nowIso();
    const completedQueue = cloneQueue(details.rotationQueue).map((item, index) =>
      index === 0 && item.status === 'queued'
        ? ({ ...item, status: 'completed' } as AliasRotationQueueItem)
        : item
    );
    const next = normalizeAliasState({
      ...details,
      email: generated.email,
      providerLabel: generated.provider?.name || details.providerLabel,
      status: 'rotated',
      lastRotatedAt: timestamp,
      updatedAt: timestamp,
      exposureCategory: 'none',
      providerSyncStatus: generated.provider?.syncStatus || details.providerSyncStatus || 'manual',
      providerManagementUrl: generated.provider?.managementUrl || details.providerManagementUrl,
      history: [
        {
          id: `alias-history-${randomToken(10)}`,
          at: timestamp,
          type: 'rotated' as const,
          email: generated.email,
          providerAliasId: details.providerAliasId,
          reason,
        },
        ...cloneHistory(details.history),
      ].slice(0, 24),
      rotationQueue: completedQueue,
    });
    this.appendAuditEvent({
      id: `alias-audit-${randomToken(12)}`,
      at: timestamp,
      type: 'alias_rotated',
      aliasEmail: next.email,
      providerId: next.providerId,
      entryId: next.linkedEntryId,
      detail: reason,
    });
    return next;
  }

  static rollbackAlias(details: VaultAliasDetails): VaultAliasDetails {
    const previous = cloneHistory(details.history).find(
      (item) => item.email && item.email !== details.email
    );
    if (!previous) return normalizeAliasState(details);
    const timestamp = nowIso();
    return normalizeAliasState({
      ...details,
      email: previous.email,
      status: 'active',
      updatedAt: timestamp,
      history: [
        {
          id: `alias-history-${randomToken(10)}`,
          at: timestamp,
          type: 'rollback' as const,
          email: previous.email,
          providerAliasId: previous.providerAliasId,
          reason: 'rollback',
        },
        ...cloneHistory(details.history),
      ].slice(0, 24),
    });
  }

  static evaluateAliasRisk(details: VaultAliasDetails): {
    score: number;
    state: AliasWatchtowerState;
    needsRotation: boolean;
  } {
    let score = 100;
    if (details.status === 'compromised') score -= 45;
    if (details.exposureCategory === 'breach') score -= 25;
    if (details.exposureCategory === 'spam') score -= 15;
    if ((details.exposureCount || 0) > 0) score -= Math.min(15, (details.exposureCount || 0) * 5);
    if ((details.rotationQueue || []).some((item) => item.status === 'queued')) score -= 10;
    if (details.providerSyncStatus === 'error') score -= 15;
    if (!details.lastRotatedAt && (details.exposureCount || 0) > 0) score -= 10;
    const finalScore = Math.max(0, score);
    const state: AliasWatchtowerState =
      details.status === 'compromised'
        ? 'compromised'
        : finalScore < 55
          ? 'rotation_required'
          : finalScore < 75
            ? 'review'
            : 'healthy';
    return {
      score: finalScore,
      state,
      needsRotation:
        state === 'rotation_required' ||
        details.exposureCategory === 'breach' ||
        details.exposureCategory === 'spam',
    };
  }

  static summarizeAliases(entries: VaultEntry[]) {
    const aliasEntries = entries.filter((entry) => entry.aliasDetails?.email);
    const compromised = aliasEntries.filter(
      (entry) => entry.aliasDetails?.status === 'compromised'
    ).length;
    const rotated = aliasEntries.filter((entry) => entry.aliasDetails?.lastRotatedAt).length;
    const queued = aliasEntries.filter((entry) =>
      entry.aliasDetails?.rotationQueue?.some((item) => item.status === 'queued')
    ).length;
    const atRisk = aliasEntries.filter((entry) => {
      if (!entry.aliasDetails) return false;
      return this.evaluateAliasRisk(entry.aliasDetails).score < 75;
    }).length;
    return {
      total: aliasEntries.length,
      compromised,
      rotated,
      queued,
      atRisk,
      active: aliasEntries.filter((entry) => entry.aliasDetails?.status === 'active').length,
    };
  }

  static triageAliases(entries: VaultEntry[]) {
    return entries
      .filter((entry) => entry.aliasDetails?.email)
      .map((entry) => ({
        entry,
        alias: normalizeAliasState(entry.aliasDetails!),
        risk: this.evaluateAliasRisk(entry.aliasDetails!),
      }))
      .sort((left, right) => left.risk.score - right.risk.score);
  }
}

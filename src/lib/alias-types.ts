export type AliasProviderKind = 'simplelogin' | 'addy' | 'duckduckgo' | 'firefox_relay' | 'custom';

export type AliasGenerationStrategy = 'random' | 'site_name' | 'site_plus_random';
export type AliasStatus = 'active' | 'rotated' | 'compromised' | 'disabled';
export type AliasExposureCategory = 'none' | 'spam' | 'breach' | 'manual';
export type AliasProviderSyncMode = 'api' | 'manual';
export type AliasProviderSyncStatus = 'manual' | 'ready' | 'linked' | 'error';
export type AliasWatchtowerState = 'healthy' | 'review' | 'rotation_required' | 'compromised';

export interface AliasProviderCapabilities {
  canProvision: boolean;
  canRotate: boolean;
  canDeactivate: boolean;
  canManageOnline: boolean;
}

export interface AliasProviderProfile {
  id: string;
  name: string;
  kind: AliasProviderKind;
  domains: string[];
  defaultDomain: string;
  forwardTo?: string;
  generationStrategy: AliasGenerationStrategy;
  description?: string;
  enabled: boolean;
  isDefault?: boolean;
  syncMode?: AliasProviderSyncMode;
  syncStatus?: AliasProviderSyncStatus;
  accountLabel?: string;
  apiBaseUrl?: string;
  apiToken?: string;
  managementUrl?: string;
  capabilities?: AliasProviderCapabilities;
  createdAt: string;
  updatedAt: string;
}

export interface AliasAuditEvent {
  id: string;
  at: string;
  type:
    | 'provider_saved'
    | 'provider_deleted'
    | 'alias_generated'
    | 'alias_attached'
    | 'alias_rotated'
    | 'alias_marked_exposed'
    | 'alias_cleared';
  aliasEmail?: string;
  providerId?: string;
  entryId?: number;
  detail?: string;
  metadata?: Record<string, string | number | boolean | undefined>;
}

export interface AliasHistoryEvent {
  id: string;
  at: string;
  type: 'created' | 'rotated' | 'rollback' | 'exposed' | 'provider_sync';
  email: string;
  providerAliasId?: string;
  reason?: string;
}

export interface AliasRotationQueueItem {
  id: string;
  requestedAt: string;
  reason: 'manual' | 'breach' | 'spam' | 'watchtower';
  status: 'queued' | 'completed' | 'cancelled';
  candidateEmail?: string;
}

export interface VaultAliasDetails {
  providerId: string;
  providerLabel: string;
  email: string;
  website?: string;
  notes?: string;
  forwardTo?: string;
  status: AliasStatus;
  exposureCategory?: AliasExposureCategory;
  exposureCount?: number;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  lastRotatedAt?: string;
  linkedEntryId?: number;
  providerAliasId?: string;
  providerSyncStatus?: AliasProviderSyncStatus;
  providerManagementUrl?: string;
  watchtowerScore?: number;
  watchtowerState?: AliasWatchtowerState;
  history?: AliasHistoryEvent[];
  rotationQueue?: AliasRotationQueueItem[];
}

const isoNow = new Date().toISOString();

export const DEFAULT_ALIAS_PROVIDER_PROFILES: AliasProviderProfile[] = [
  {
    id: 'provider-simplelogin',
    name: 'SimpleLogin',
    kind: 'simplelogin',
    domains: ['slmail.me', 'simplelogin.com'],
    defaultDomain: 'slmail.me',
    generationStrategy: 'site_plus_random',
    description: 'Open-source alias provider profile',
    enabled: true,
    isDefault: true,
    syncMode: 'api',
    syncStatus: 'ready',
    apiBaseUrl: 'https://app.simplelogin.io/api',
    managementUrl: 'https://app.simplelogin.io/dashboard/aliases',
    capabilities: {
      canProvision: true,
      canRotate: true,
      canDeactivate: true,
      canManageOnline: true,
    },
    createdAt: isoNow,
    updatedAt: isoNow,
  },
  {
    id: 'provider-addy',
    name: 'Addy',
    kind: 'addy',
    domains: ['addy.io'],
    defaultDomain: 'addy.io',
    generationStrategy: 'site_plus_random',
    description: 'Self-host and privacy-friendly forwarding profile',
    enabled: true,
    syncMode: 'api',
    syncStatus: 'ready',
    apiBaseUrl: 'https://app.addy.io/api/v1',
    managementUrl: 'https://app.addy.io/aliases',
    capabilities: {
      canProvision: true,
      canRotate: true,
      canDeactivate: true,
      canManageOnline: true,
    },
    createdAt: isoNow,
    updatedAt: isoNow,
  },
  {
    id: 'provider-duckduckgo',
    name: 'DuckDuckGo Email Protection',
    kind: 'duckduckgo',
    domains: ['duck.com'],
    defaultDomain: 'duck.com',
    generationStrategy: 'random',
    description: 'Browser-friendly relay alias profile',
    enabled: true,
    syncMode: 'manual',
    syncStatus: 'manual',
    managementUrl: 'https://duckduckgo.com/email/',
    capabilities: {
      canProvision: false,
      canRotate: false,
      canDeactivate: false,
      canManageOnline: true,
    },
    createdAt: isoNow,
    updatedAt: isoNow,
  },
  {
    id: 'provider-firefox-relay',
    name: 'Firefox Relay',
    kind: 'firefox_relay',
    domains: ['mozmail.com'],
    defaultDomain: 'mozmail.com',
    generationStrategy: 'random',
    description: 'Firefox Relay compatible alias profile',
    enabled: true,
    syncMode: 'manual',
    syncStatus: 'manual',
    managementUrl: 'https://relay.firefox.com/accounts/profile/',
    capabilities: {
      canProvision: false,
      canRotate: false,
      canDeactivate: false,
      canManageOnline: true,
    },
    createdAt: isoNow,
    updatedAt: isoNow,
  },
];

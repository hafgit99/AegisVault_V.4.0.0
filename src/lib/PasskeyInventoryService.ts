import type {
  PasskeyBindingRecord,
  PasskeyEventRecord,
  PasskeyPolicy,
  PasskeyRevocationRecord,
} from './PasskeyBindingService';
import type { PasskeyProgramMode } from '../config/passkey-program';
import type { VaultEntry } from '../vaultService';

export interface PasskeyInventorySiteEntry {
  id: number;
  title: string;
  rpId: string;
  origin: string;
  displayName: string;
  credentialId: string;
  mode: PasskeyProgramMode;
  riskFlags: Array<
    'missing_rp_id' | 'missing_credential_id' | 'future_mode' | 'origin_mismatch' | 'unverified'
  >;
  riskLevel: 'low' | 'medium' | 'high';
  exportReady: boolean;
}

export interface PasskeyInventorySummary {
  totalBindings: number;
  revokedCount: number;
  recoveryExportedCount: number;
  rotationRequiredCount: number;
  activeDeviceCount: number;
  recentEventCount: number;
  status: 'healthy' | 'attention';
  actionKeys: string[];
  modeCounts: Record<PasskeyProgramMode, number>;
  riskCounts: {
    missing_rp_id: number;
    missing_credential_id: number;
    future_mode: number;
    origin_mismatch: number;
    unverified: number;
  };
  sitePasskeyCount: number;
  sitePasskeyAttentionCount: number;
  siteEntries: PasskeyInventorySiteEntry[];
  previewSiteEntries: PasskeyInventorySiteEntry[];
}

const DAY_MS = 1000 * 60 * 60 * 24;

const deriveOriginFromWebsite = (website?: string): string => {
  if (!website) return '';
  try {
    const parsed = website.includes('://') ? new URL(website) : new URL(`https://${website}`);
    return parsed.origin;
  } catch {
    return '';
  }
};

const deriveRpIdFromWebsite = (website?: string): string => {
  if (!website) return '';
  try {
    const parsed = website.includes('://') ? new URL(website) : new URL(`https://${website}`);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
};

const getRiskLevel = (riskFlags: PasskeyInventorySiteEntry['riskFlags']) => {
  if (
    riskFlags.includes('missing_rp_id') ||
    riskFlags.includes('missing_credential_id') ||
    riskFlags.includes('origin_mismatch')
  ) {
    return 'high' as const;
  }
  if (riskFlags.includes('future_mode') || riskFlags.includes('unverified'))
    return 'medium' as const;
  return 'low' as const;
};

export class PasskeyInventoryService {
  static buildSummary(input: {
    bindings: Array<PasskeyBindingRecord & { bindingKey: string }>;
    policy: PasskeyPolicy;
    revocations: PasskeyRevocationRecord[];
    eventLog: PasskeyEventRecord[];
    vaultEntries?: VaultEntry[];
  }): PasskeyInventorySummary {
    const bindings = input.bindings || [];
    const revocations = input.revocations || [];
    const eventLog = input.eventLog || [];
    const policy = input.policy;
    const vaultEntries = input.vaultEntries || [];

    const siteEntries: PasskeyInventorySiteEntry[] = vaultEntries
      .filter((entry) => entry.category === 'Passkeys' || entry.passkeyMetadata)
      .map((entry) => {
        const mode = entry.passkeyMetadata?.mode || 'site_passkey_mvp';
        const rpId = entry.passkeyMetadata?.rp_id || '';
        const origin = entry.passkeyMetadata?.origin || deriveOriginFromWebsite(entry.website);
        const inferredRpId = deriveRpIdFromWebsite(entry.website);
        const credentialId = entry.passkeyMetadata?.credential_id || '';
        const riskFlags: PasskeyInventorySiteEntry['riskFlags'] = [];
        if (!rpId) riskFlags.push('missing_rp_id');
        if (!credentialId) riskFlags.push('missing_credential_id');
        if (mode === 'site_passkey_future_rp') riskFlags.push('future_mode');
        if (rpId && inferredRpId && rpId !== inferredRpId) riskFlags.push('origin_mismatch');
        if (credentialId && entry.passkeyMetadata?.server_verified !== true) {
          riskFlags.push('unverified');
        }
        const riskLevel = getRiskLevel(riskFlags);
        return {
          id: entry.id,
          title: entry.title || 'Untitled',
          rpId,
          origin,
          displayName: entry.passkeyMetadata?.display_name || '',
          credentialId,
          mode,
          riskFlags,
          riskLevel,
          exportReady: Boolean(rpId && credentialId && origin),
        };
      })
      .sort((left, right) => {
        if (left.riskFlags.length !== right.riskFlags.length) {
          return right.riskFlags.length - left.riskFlags.length;
        }
        return left.title.localeCompare(right.title);
      });

    const recoveryExportedCount = bindings.filter(
      (binding) => binding.meta.recoveryLastExportedAt
    ).length;
    const rotationRequiredCount = bindings.filter((binding) => {
      const createdAtMs = Date.parse(binding.meta.createdAt || '');
      if (!Number.isFinite(createdAtMs)) return false;
      const ageDays = Math.floor((Date.now() - createdAtMs) / DAY_MS);
      return ageDays >= policy.maxBindingAgeDays;
    }).length;
    const recentEventCount = eventLog.filter((event) => {
      const atMs = Date.parse(event.at || '');
      return Number.isFinite(atMs) && Date.now() - atMs <= 7 * DAY_MS;
    }).length;

    const actionKeys: string[] = [];
    if (rotationRequiredCount > 0) actionKeys.push('passkeyInventoryActionRotate');
    if (recoveryExportedCount < bindings.length) actionKeys.push('passkeyInventoryActionRecovery');
    if (revocations.length > 0) actionKeys.push('passkeyInventoryActionAudit');
    if (siteEntries.some((entry) => entry.riskFlags.length > 0))
      actionKeys.push('passkeyInventoryActionReviewSiteEntries');
    const modeCounts: Record<PasskeyProgramMode, number> = {
      vault_unlock: bindings.length,
      site_passkey_mvp: siteEntries.filter((entry) => entry.mode === 'site_passkey_mvp').length,
      site_passkey_active: siteEntries.filter((entry) => entry.mode === 'site_passkey_active')
        .length,
      site_passkey_future_rp: siteEntries.filter((entry) => entry.mode === 'site_passkey_future_rp')
        .length,
    };
    const riskCounts = {
      missing_rp_id: siteEntries.filter((entry) => entry.riskFlags.includes('missing_rp_id'))
        .length,
      missing_credential_id: siteEntries.filter((entry) =>
        entry.riskFlags.includes('missing_credential_id')
      ).length,
      future_mode: siteEntries.filter((entry) => entry.riskFlags.includes('future_mode')).length,
      origin_mismatch: siteEntries.filter((entry) => entry.riskFlags.includes('origin_mismatch'))
        .length,
      unverified: siteEntries.filter((entry) => entry.riskFlags.includes('unverified')).length,
    };
    const sitePasskeyAttentionCount = siteEntries.filter(
      (entry) => entry.riskFlags.length > 0
    ).length;
    const hasAttention =
      rotationRequiredCount > 0 ||
      recoveryExportedCount < bindings.length ||
      sitePasskeyAttentionCount > 0;

    return {
      totalBindings: bindings.length,
      revokedCount: revocations.length,
      recoveryExportedCount,
      rotationRequiredCount,
      activeDeviceCount: bindings.length,
      recentEventCount,
      status: hasAttention ? 'attention' : 'healthy',
      actionKeys,
      modeCounts,
      riskCounts,
      sitePasskeyCount: siteEntries.length,
      sitePasskeyAttentionCount,
      siteEntries,
      previewSiteEntries: siteEntries.slice(0, 6),
    };
  }

  /**
   * Basarili auth sonrasi passkey metadata guncellemesi yapar.
   */
  static updateMetadataAfterAuth(entry: VaultEntry, authenticatedAt: string): VaultEntry {
    if (!entry.passkeyMetadata) return entry;
    return {
      ...entry,
      passkeyMetadata: {
        ...entry.passkeyMetadata,
        origin: entry.passkeyMetadata.origin || deriveOriginFromWebsite(entry.website),
        last_auth_at: authenticatedAt,
        server_verified: true,
      },
    };
  }
}

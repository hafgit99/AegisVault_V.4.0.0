import type { VaultEntry } from '../vaultService';

export type SecurityCenterIssueType =
  | 'missing_second_factor'
  | 'passkey_ready'
  | 'aging_credentials'
  | 'sensitive_sharing'
  | 'alias_exposure'
  | 'alias_rotation'
  | 'device_trust'
  | 'local_risk_activity';

export interface SecurityCenterIssueSummary {
  type: SecurityCenterIssueType;
  count: number;
  severity: 'low' | 'medium' | 'high';
  messageKey: string;
  actionKey: string;
}

export interface SecurityCenterTriageItem {
  issueType: SecurityCenterIssueType;
  itemId: number;
  title: string;
  severity: 'low' | 'medium' | 'high';
  actionKey: string;
  detailKey: string;
  reviewKey: string;
  contextKey?: string;
  reviewedAt?: string;
  reviewExpired?: boolean;
}

export interface SecurityCenterSummary {
  score: number;
  riskLevel: 'low' | 'medium' | 'high';
  metrics: {
    missingSecondFactor: number;
    passkeyReady: number;
    agingCredentials: number;
    sensitiveSharing: number;
    aliasExposure: number;
    aliasRotation: number;
  };
  issues: SecurityCenterIssueSummary[];
  triageItems: SecurityCenterTriageItem[];
  reviewedTriageItems: SecurityCenterTriageItem[];
  resolvedTriageItems: SecurityCenterTriageItem[];
}

const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 180;
const REVIEW_REAPPEAR_MS = 1000 * 60 * 60 * 24 * 7;
const LOCAL_RISK_WINDOW_MS = 1000 * 60 * 60 * 24 * 7;

function isActiveEntry(entry: VaultEntry): boolean {
  return !entry.deletedAt;
}

function hasSecondFactor(entry: VaultEntry): boolean {
  return Boolean(entry.totp_secret || entry.totpSecret || entry.passkeyMetadata?.credential_id);
}

function isCredentialEntry(entry: VaultEntry): boolean {
  return Boolean(entry.pass && (entry.website || entry.username)) && entry.category !== 'Passkeys';
}

function isPasskeyReady(entry: VaultEntry): boolean {
  if (!isCredentialEntry(entry)) return false;
  if (!entry.website) return false;
  return !entry.passkeyMetadata?.credential_id;
}

function isAgingCredential(entry: VaultEntry): boolean {
  if (!isCredentialEntry(entry) || !entry.updated_at) return false;
  const updatedAt = new Date(entry.updated_at).getTime();
  if (Number.isNaN(updatedAt)) return false;
  return Date.now() - updatedAt > SIX_MONTHS_MS;
}

function hasSensitiveSharingGap(entry: VaultEntry): boolean {
  return Boolean(
    entry.sharing?.some((assignment) => assignment.is_sensitive && !assignment.emergency_access)
  );
}

function hasAliasExposure(entry: VaultEntry): boolean {
  return Boolean(
    entry.aliasDetails?.status === 'compromised' ||
    entry.aliasDetails?.exposureCategory === 'breach' ||
    entry.aliasDetails?.exposureCategory === 'spam'
  );
}

function needsAliasRotation(entry: VaultEntry): boolean {
  if (!entry.aliasDetails?.email) return false;
  return Boolean(
    entry.aliasDetails.status === 'compromised' ||
    entry.aliasDetails.watchtowerState === 'rotation_required' ||
    entry.aliasDetails.rotationQueue?.some((item) => item.status === 'queued')
  );
}

interface SecurityCenterDesktopPairing {
  extensionId: string;
  browserName?: string;
  riskLevel?: string;
  riskFlags?: string[];
}

interface SecurityCenterSyncAuditEvent {
  id?: string;
  type: string;
  source: string;
  at: string;
  detail?: string;
}

export interface SecurityCenterContext {
  desktopPairings?: SecurityCenterDesktopPairing[];
  syncAuditEvents?: SecurityCenterSyncAuditEvent[];
}

function isHighRiskPairing(pairing: SecurityCenterDesktopPairing): boolean {
  return Boolean(
    pairing.riskLevel === 'high' ||
    pairing.riskLevel === 'medium' ||
    (Array.isArray(pairing.riskFlags) && pairing.riskFlags.length > 0)
  );
}

function isRecentLocalRiskEvent(event: SecurityCenterSyncAuditEvent): boolean {
  if (
    event.source !== 'backup_import' &&
    event.source !== 'structured_import' &&
    event.source !== 'canonical_restore' &&
    event.source !== 'migration'
  ) {
    return false;
  }
  const eventTime = new Date(event.at).getTime();
  if (Number.isNaN(eventTime)) return false;
  return Date.now() - eventTime <= LOCAL_RISK_WINDOW_MS;
}

function getReviewMeta(reviewed: Record<string, string>, reviewKey: string) {
  const reviewedAt = reviewed[reviewKey];
  if (!reviewedAt) {
    return { reviewedAt: undefined, reviewExpired: false, isActive: false };
  }
  const reviewedTime = new Date(reviewedAt).getTime();
  if (Number.isNaN(reviewedTime)) {
    return { reviewedAt, reviewExpired: true, isActive: false };
  }
  const reviewExpired = Date.now() - reviewedTime > REVIEW_REAPPEAR_MS;
  return {
    reviewedAt,
    reviewExpired,
    isActive: !reviewExpired,
  };
}

function getSeverityForIssue(issueType: SecurityCenterIssueType): 'low' | 'medium' | 'high' {
  if (
    issueType === 'missing_second_factor' ||
    issueType === 'sensitive_sharing' ||
    issueType === 'alias_exposure'
  ) {
    return 'high';
  }
  return 'medium';
}

function getActionForIssue(issueType: SecurityCenterIssueType): string {
  if (issueType === 'missing_second_factor' || issueType === 'passkey_ready') {
    return 'securityCenterActionReviewPasskeys';
  }
  if (issueType === 'sensitive_sharing') return 'securityCenterActionReviewSharing';
  if (issueType === 'alias_exposure' || issueType === 'alias_rotation') {
    return 'securityCenterActionReviewAliases';
  }
  return 'securityCenterActionReviewPasswords';
}

function getDetailKeyForIssue(issueType: SecurityCenterIssueType): string {
  if (issueType === 'missing_second_factor') return 'securityCenterTriageMissingSecondFactor';
  if (issueType === 'passkey_ready') return 'securityCenterTriagePasskeyReady';
  if (issueType === 'aging_credentials') return 'securityCenterTriageAgingCredential';
  if (issueType === 'alias_exposure') return 'securityCenterTriageAliasExposure';
  if (issueType === 'alias_rotation') return 'securityCenterTriageAliasRotation';
  return 'securityCenterTriageSensitiveSharing';
}

function parseReviewKey(
  reviewKey: string
): { issueType: SecurityCenterIssueType; itemId: number } | null {
  const [issueType, rawId] = reviewKey.split(':');
  const itemId = Number(rawId);
  if (
    (issueType !== 'missing_second_factor' &&
      issueType !== 'passkey_ready' &&
      issueType !== 'aging_credentials' &&
      issueType !== 'sensitive_sharing' &&
      issueType !== 'alias_exposure' &&
      issueType !== 'alias_rotation') ||
    Number.isNaN(itemId)
  ) {
    return null;
  }
  return { issueType, itemId };
}

export class SecurityCenterService {
  static buildSummary(
    entries: VaultEntry[],
    reviewed: Record<string, string> = {},
    context: SecurityCenterContext = {}
  ): SecurityCenterSummary {
    const activeEntries = entries.filter(isActiveEntry);
    const credentialEntries = activeEntries.filter(isCredentialEntry);
    const riskyDesktopPairings = (context.desktopPairings || []).filter(isHighRiskPairing);
    const recentLocalRiskEvents = (context.syncAuditEvents || []).filter(isRecentLocalRiskEvent);

    const missingSecondFactor = credentialEntries.filter((entry) => !hasSecondFactor(entry)).length;
    const passkeyReady = credentialEntries.filter(isPasskeyReady).length;
    const agingCredentials = credentialEntries.filter(isAgingCredential).length;
    const sensitiveSharing = activeEntries.filter(hasSensitiveSharingGap).length;
    const aliasExposure = activeEntries.filter(hasAliasExposure).length;
    const aliasRotation = activeEntries.filter(needsAliasRotation).length;

    const penalty =
      missingSecondFactor * 8 +
      passkeyReady * 4 +
      agingCredentials * 5 +
      sensitiveSharing * 10 +
      aliasExposure * 9 +
      aliasRotation * 6 +
      riskyDesktopPairings.length * 6 +
      recentLocalRiskEvents.length * 3;
    const score = Math.max(0, 100 - penalty);
    const riskLevel = score >= 80 ? 'low' : score >= 55 ? 'medium' : 'high';

    const issues: SecurityCenterIssueSummary[] = [];
    const triageItems: SecurityCenterTriageItem[] = [];

    if (missingSecondFactor > 0) {
      issues.push({
        type: 'missing_second_factor',
        count: missingSecondFactor,
        severity: 'high',
        messageKey: 'securityCenterIssueMissingSecondFactor',
        actionKey: 'securityCenterActionReviewPasskeys',
      });
      credentialEntries
        .filter((entry) => !hasSecondFactor(entry))
        .forEach((entry) => {
          triageItems.push({
            issueType: 'missing_second_factor',
            itemId: entry.id,
            title: entry.title || 'Untitled',
            severity: 'high',
            actionKey: 'securityCenterActionReviewPasskeys',
            detailKey: 'securityCenterTriageMissingSecondFactor',
            reviewKey: `missing_second_factor:${entry.id}`,
          });
        });
    }

    if (passkeyReady > 0) {
      issues.push({
        type: 'passkey_ready',
        count: passkeyReady,
        severity: 'medium',
        messageKey: 'securityCenterIssuePasskeyReady',
        actionKey: 'securityCenterActionReviewPasskeys',
      });
      credentialEntries.filter(isPasskeyReady).forEach((entry) => {
        triageItems.push({
          issueType: 'passkey_ready',
          itemId: entry.id,
          title: entry.title || 'Untitled',
          severity: 'medium',
          actionKey: 'securityCenterActionReviewPasskeys',
          detailKey: 'securityCenterTriagePasskeyReady',
          reviewKey: `passkey_ready:${entry.id}`,
        });
      });
    }

    if (agingCredentials > 0) {
      issues.push({
        type: 'aging_credentials',
        count: agingCredentials,
        severity: 'medium',
        messageKey: 'securityCenterIssueAgingCredentials',
        actionKey: 'securityCenterActionReviewPasswords',
      });
      credentialEntries.filter(isAgingCredential).forEach((entry) => {
        triageItems.push({
          issueType: 'aging_credentials',
          itemId: entry.id,
          title: entry.title || 'Untitled',
          severity: 'medium',
          actionKey: 'securityCenterActionReviewPasswords',
          detailKey: 'securityCenterTriageAgingCredential',
          reviewKey: `aging_credentials:${entry.id}`,
        });
      });
    }

    if (sensitiveSharing > 0) {
      issues.push({
        type: 'sensitive_sharing',
        count: sensitiveSharing,
        severity: 'high',
        messageKey: 'securityCenterIssueSensitiveSharing',
        actionKey: 'securityCenterActionReviewSharing',
      });
      activeEntries.filter(hasSensitiveSharingGap).forEach((entry) => {
        triageItems.push({
          issueType: 'sensitive_sharing',
          itemId: entry.id,
          title: entry.title || 'Untitled',
          severity: 'high',
          actionKey: 'securityCenterActionReviewSharing',
          detailKey: 'securityCenterTriageSensitiveSharing',
          reviewKey: `sensitive_sharing:${entry.id}`,
        });
      });
    }

    if (aliasExposure > 0) {
      issues.push({
        type: 'alias_exposure',
        count: aliasExposure,
        severity: 'high',
        messageKey: 'securityCenterIssueAliasExposure',
        actionKey: 'securityCenterActionReviewAliases',
      });
      activeEntries.filter(hasAliasExposure).forEach((entry) => {
        triageItems.push({
          issueType: 'alias_exposure',
          itemId: entry.id,
          title: entry.title || 'Untitled',
          severity: 'high',
          actionKey: 'securityCenterActionReviewAliases',
          detailKey: 'securityCenterTriageAliasExposure',
          reviewKey: `alias_exposure:${entry.id}`,
        });
      });
    }

    if (aliasRotation > 0) {
      issues.push({
        type: 'alias_rotation',
        count: aliasRotation,
        severity: 'medium',
        messageKey: 'securityCenterIssueAliasRotation',
        actionKey: 'securityCenterActionReviewAliases',
      });
      activeEntries.filter(needsAliasRotation).forEach((entry) => {
        triageItems.push({
          issueType: 'alias_rotation',
          itemId: entry.id,
          title: entry.title || 'Untitled',
          severity: 'medium',
          actionKey: 'securityCenterActionReviewAliases',
          detailKey: 'securityCenterTriageAliasRotation',
          reviewKey: `alias_rotation:${entry.id}`,
        });
      });
    }

    if (riskyDesktopPairings.length > 0) {
      issues.push({
        type: 'device_trust',
        count: riskyDesktopPairings.length,
        severity: 'high',
        messageKey: 'securityCenterIssueDeviceTrust',
        actionKey: 'securityCenterActionReviewDevices',
      });
      riskyDesktopPairings.forEach((pairing, index) => {
        triageItems.push({
          issueType: 'device_trust',
          itemId: -1000 - index,
          title: pairing.browserName || 'Desktop pairing',
          severity: 'high',
          actionKey: 'securityCenterActionReviewDevices',
          detailKey: 'securityCenterTriageDeviceTrust',
          reviewKey: `device_trust:${pairing.extensionId || index}`,
          contextKey: pairing.extensionId,
        });
      });
    }

    if (recentLocalRiskEvents.length > 0) {
      issues.push({
        type: 'local_risk_activity',
        count: recentLocalRiskEvents.length,
        severity: 'medium',
        messageKey: 'securityCenterIssueLocalRiskActivity',
        actionKey: 'securityCenterActionReviewLocalRisk',
      });
      recentLocalRiskEvents.forEach((event, index) => {
        triageItems.push({
          issueType: 'local_risk_activity',
          itemId: -2000 - index,
          title: event.detail || event.type,
          severity: 'medium',
          actionKey: 'securityCenterActionReviewLocalRisk',
          detailKey: 'securityCenterTriageLocalRiskActivity',
          reviewKey: `local_risk_activity:${event.id || `${event.source}-${index}`}`,
          contextKey: event.source,
        });
      });
    }

    const reviewedTriageItems: SecurityCenterTriageItem[] = [];
    const resolvedTriageItems: SecurityCenterTriageItem[] = [];
    const filteredTriageItems = triageItems.filter((item) => {
      const reviewMeta = getReviewMeta(reviewed, item.reviewKey);
      if (!reviewMeta.reviewedAt) return true;
      if (reviewMeta.isActive) {
        reviewedTriageItems.push({
          ...item,
          reviewedAt: reviewMeta.reviewedAt,
        });
        return false;
      }
      item.reviewedAt = reviewMeta.reviewedAt;
      item.reviewExpired = reviewMeta.reviewExpired;
      return true;
    });

    filteredTriageItems.sort((left, right) => {
      const severityRank = { high: 0, medium: 1, low: 2 };
      if (severityRank[left.severity] !== severityRank[right.severity]) {
        return severityRank[left.severity] - severityRank[right.severity];
      }
      return left.title.localeCompare(right.title);
    });

    const activeReviewKeys = new Set(triageItems.map((item) => item.reviewKey));
    Object.entries(reviewed).forEach(([reviewKey, reviewedAt]) => {
      if (activeReviewKeys.has(reviewKey)) return;
      const parsed = parseReviewKey(reviewKey);
      if (!parsed) return;
      const entry = activeEntries.find((candidate) => candidate.id === parsed.itemId);
      resolvedTriageItems.push({
        issueType: parsed.issueType,
        itemId: parsed.itemId,
        title: entry?.title || 'Untitled',
        severity: getSeverityForIssue(parsed.issueType),
        actionKey: getActionForIssue(parsed.issueType),
        detailKey: getDetailKeyForIssue(parsed.issueType),
        reviewKey,
        reviewedAt,
      });
    });

    return {
      score,
      riskLevel,
      metrics: {
        missingSecondFactor,
        passkeyReady,
        agingCredentials,
        sensitiveSharing,
        aliasExposure,
        aliasRotation,
      },
      issues,
      triageItems: filteredTriageItems,
      reviewedTriageItems: reviewedTriageItems.sort((left, right) =>
        right.reviewedAt!.localeCompare(left.reviewedAt!)
      ),
      resolvedTriageItems: resolvedTriageItems.sort((left, right) =>
        right.reviewedAt!.localeCompare(left.reviewedAt!)
      ),
    };
  }
}

export type AegisSyncTransportKey =
  | 'qr_transfer'
  | 'encrypted_backup'
  | 'plaintext_export'
  | 'optional_encrypted_sync';

export type AegisSyncModeKey = 'offline_first' | 'optional_encrypted_sync';
export type AegisSyncConflictRuleKey =
  | 'local_primary'
  | 'explicit_merge_only'
  | 'restore_requires_confirmation';
export type AegisSyncAuditEventKey =
  | 'transfer_created'
  | 'transfer_imported'
  | 'transfer_revoked'
  | 'transfer_rejected'
  | 'receiver_session_created'
  | 'passkey_revocation_synced';

export interface AegisSyncTransportDefinition {
  key: AegisSyncTransportKey;
  titleKey: string;
  titleDefault: string;
  descriptionKey: string;
  descriptionDefault: string;
  trustBoundaryKey: string;
  trustBoundaryDefault: string;
}

export interface AegisSyncModeDefinition {
  key: AegisSyncModeKey;
  titleKey: string;
  titleDefault: string;
  descriptionKey: string;
  descriptionDefault: string;
  defaultTransportKeys: AegisSyncTransportKey[];
}

export interface AegisSyncConflictRuleDefinition {
  key: AegisSyncConflictRuleKey;
  titleKey: string;
  titleDefault: string;
  descriptionKey: string;
  descriptionDefault: string;
}

export interface AegisSyncAuditDefinition {
  key: AegisSyncAuditEventKey;
  titleKey: string;
  titleDefault: string;
  descriptionKey: string;
  descriptionDefault: string;
}

export const AEGIS_SYNC_TRANSPORTS: Record<AegisSyncTransportKey, AegisSyncTransportDefinition> = {
  qr_transfer: {
    key: 'qr_transfer',
    titleKey: 'syncTransportQrTitle',
    titleDefault: 'QR transfer',
    descriptionKey: 'syncTransportQrDesc',
    descriptionDefault:
      'Device-to-device transfer stays offline and uses encrypted QR payloads plus a one-time transfer code.',
    trustBoundaryKey: 'syncTransportQrBoundary',
    trustBoundaryDefault:
      'Trust boundary: source device, receiver device, short-lived transfer code.',
  },
  encrypted_backup: {
    key: 'encrypted_backup',
    titleKey: 'syncTransportBackupTitle',
    titleDefault: 'Encrypted backup',
    descriptionKey: 'syncTransportBackupDesc',
    descriptionDefault:
      'Portable encrypted vault export for restore, migration, and disaster recovery.',
    trustBoundaryKey: 'syncTransportBackupBoundary',
    trustBoundaryDefault: 'Trust boundary: backup password, local file storage, restore target.',
  },
  plaintext_export: {
    key: 'plaintext_export',
    titleKey: 'syncTransportPlaintextTitle',
    titleDefault: 'Temporary plaintext export',
    descriptionKey: 'syncTransportPlaintextDesc',
    descriptionDefault:
      'CSV or JSON export remains a migration-only tool and should stay disabled by default.',
    trustBoundaryKey: 'syncTransportPlaintextBoundary',
    trustBoundaryDefault:
      'Trust boundary: user-managed file handling outside encrypted vault protections.',
  },
  optional_encrypted_sync: {
    key: 'optional_encrypted_sync',
    titleKey: 'syncTransportCloudTitle',
    titleDefault: 'Optional encrypted sync',
    descriptionKey: 'syncTransportCloudDesc',
    descriptionDefault:
      'Reserved transport for future end-to-end encrypted multi-device sync, separate from offline-first core flows.',
    trustBoundaryKey: 'syncTransportCloudBoundary',
    trustBoundaryDefault:
      'Trust boundary: encrypted payloads only; remote relay never becomes a plaintext authority.',
  },
};

export const AEGIS_SYNC_MODES: Record<AegisSyncModeKey, AegisSyncModeDefinition> = {
  offline_first: {
    key: 'offline_first',
    titleKey: 'syncModeOfflineTitle',
    titleDefault: 'Offline-first core',
    descriptionKey: 'syncModeOfflineDesc',
    descriptionDefault:
      'Aegis 4.1 uses local vault storage as the source of truth. Transfer flows stay explicit, user-initiated, and encrypted.',
    defaultTransportKeys: ['qr_transfer', 'encrypted_backup', 'plaintext_export'],
  },
  optional_encrypted_sync: {
    key: 'optional_encrypted_sync',
    titleKey: 'syncModeOptionalTitle',
    titleDefault: 'Optional encrypted sync',
    descriptionKey: 'syncModeOptionalDesc',
    descriptionDefault:
      'Future encrypted sync remains an opt-in layer that complements, not replaces, offline-first vault ownership.',
    defaultTransportKeys: ['optional_encrypted_sync'],
  },
};

export const AEGIS_SYNC_CONFLICT_RULES: AegisSyncConflictRuleDefinition[] = [
  {
    key: 'local_primary',
    titleKey: 'syncConflictLocalPrimaryTitle',
    titleDefault: 'Local vault stays primary',
    descriptionKey: 'syncConflictLocalPrimaryDesc',
    descriptionDefault:
      'Incoming data never silently replaces the active vault. The local vault remains the main source of truth.',
  },
  {
    key: 'explicit_merge_only',
    titleKey: 'syncConflictMergeTitle',
    titleDefault: 'Merge requires intent',
    descriptionKey: 'syncConflictMergeDesc',
    descriptionDefault:
      'Cross-device data is merged only through explicit import, restore, or future approved sync flows.',
  },
  {
    key: 'restore_requires_confirmation',
    titleKey: 'syncConflictRestoreTitle',
    titleDefault: 'Restore needs confirmation',
    descriptionKey: 'syncConflictRestoreDesc',
    descriptionDefault:
      'Recovery or backup restore must remain a visible user decision, not a background overwrite.',
  },
];

export const AEGIS_SYNC_AUDIT_LANGUAGE: AegisSyncAuditDefinition[] = [
  {
    key: 'transfer_created',
    titleKey: 'syncAuditTransferCreatedTitle',
    titleDefault: 'Transfer created',
    descriptionKey: 'syncAuditTransferCreatedDesc',
    descriptionDefault: 'A transport session is opened and waits for explicit receiver completion.',
  },
  {
    key: 'transfer_imported',
    titleKey: 'syncAuditTransferImportedTitle',
    titleDefault: 'Transfer imported',
    descriptionKey: 'syncAuditTransferImportedDesc',
    descriptionDefault: 'Encrypted payload is accepted and materialized into local vault state.',
  },
  {
    key: 'transfer_revoked',
    titleKey: 'syncAuditTransferRevokedTitle',
    titleDefault: 'Transfer revoked',
    descriptionKey: 'syncAuditTransferRevokedDesc',
    descriptionDefault: 'Sender invalidates the transport session before later reuse is possible.',
  },
  {
    key: 'transfer_rejected',
    titleKey: 'syncAuditTransferRejectedTitle',
    titleDefault: 'Transfer rejected',
    descriptionKey: 'syncAuditTransferRejectedDesc',
    descriptionDefault: 'Receiver or parser explicitly refuses the transport payload.',
  },
  {
    key: 'receiver_session_created',
    titleKey: 'syncAuditReceiverSessionTitle',
    titleDefault: 'Receiver session created',
    descriptionKey: 'syncAuditReceiverSessionDesc',
    descriptionDefault:
      'A receiving device creates a short-lived pairing session for protected import.',
  },
  {
    key: 'passkey_revocation_synced',
    titleKey: 'syncAuditPasskeyRevokedTitle',
    titleDefault: 'Passkey revocation propagated',
    descriptionKey: 'syncAuditPasskeyRevokedDesc',
    descriptionDefault:
      'A revoked passkey credential list is updated via sync to maintain global security.',
  },
];

export const AEGIS_SYNC_STRATEGY = {
  activeMode: 'offline_first' as const,
  futureMode: 'optional_encrypted_sync' as const,
  conflictPolicyKey: 'syncConflictPolicy',
  conflictPolicyDefault:
    'Conflict policy: local vault remains primary until an explicit merge or restore action is approved.',
  passkeyPolicy: {
    syncRevocations: true as const,
    resolutionMode: 'activity_freshest' as const, // Based on last_auth_at/last_registration_at
  },
  reviewKey: 'syncStrategyReview',
  reviewDefault:
    '4.1 strategy: keep offline-first as default, expose QR + encrypted backup clearly, and treat cloud sync as future opt-in scope.',
} as const;

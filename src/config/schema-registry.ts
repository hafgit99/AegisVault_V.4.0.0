export const AEGIS_APP_VERSION = '4.0.0' as const;
export const AEGIS_CANONICAL_EXPORT_KIND = 'canonical-export-v1' as const;
export const AEGIS_CANONICAL_SCHEMA_VERSION = '1' as const;
export const AEGIS_COMPATIBILITY_CHECKLIST_VERSION = '2026-03-23.v1' as const;
export const AEGIS_MIGRATION_POLICY_VERSION = '2026-03-23.v1' as const;

// Desktop/web backup envelope. Android currently imports this as a generic
// Aegis backup path, so we keep the public format stable while centralizing
// the version source for later cross-platform convergence work.
export const AEGIS_BACKUP_FORMAT = 'aegis-encrypted-v1' as const;

// QR sync uses its own transport envelope but should share the same app
// version source as the backup/export layer.
export const AEGIS_QR_SYNC_FORMAT = 'aegis-qr-sync-v1' as const;
export const AEGIS_QR_SYNC_PAIRING_FORMAT = 'aegis-qr-ecdh-v1' as const;

export const AEGIS_SCHEMA_REGISTRY = {
  appVersion: AEGIS_APP_VERSION,
  canonical: {
    exportKind: AEGIS_CANONICAL_EXPORT_KIND,
    schemaVersion: AEGIS_CANONICAL_SCHEMA_VERSION,
    compatibilityChecklistVersion: AEGIS_COMPATIBILITY_CHECKLIST_VERSION,
    migrationPolicyVersion: AEGIS_MIGRATION_POLICY_VERSION,
  },
  backup: {
    format: AEGIS_BACKUP_FORMAT,
  },
  qrSync: {
    format: AEGIS_QR_SYNC_FORMAT,
    pairingFormat: AEGIS_QR_SYNC_PAIRING_FORMAT,
  },
} as const;

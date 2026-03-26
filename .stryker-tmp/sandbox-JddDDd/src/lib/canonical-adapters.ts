// @ts-nocheck
import type { VaultEntry, VaultAttachmentMeta } from '../vaultService';
import type {
  CanonicalAttachment,
  CanonicalSharingAssignment,
  CanonicalSecretFields,
  CanonicalVaultRecord,
} from './canonical-schema';
import { normalizeCanonicalCategory } from './canonical-schema';

const toCanonicalCategory = (category?: string) => {
  const normalized = (category || '').trim().toLowerCase();
  if (normalized === 'general') return 'login' as const;
  if (normalized === 'cards') return 'card' as const;
  if (normalized === 'identities') return 'identity' as const;
  if (normalized === 'notes') return 'note' as const;
  if (normalized === 'wifi') return 'wifi' as const;
  if (normalized === 'passkeys') return 'passkey' as const;
  return normalizeCanonicalCategory(category);
};

const fromCanonicalCategory = (category?: CanonicalVaultRecord['category']): string => {
  switch (category) {
    case 'login':
      return 'General';
    case 'card':
      return 'Cards';
    case 'identity':
      return 'Identities';
    case 'note':
      return 'Notes';
    case 'wifi':
      return 'WiFi';
    case 'passkey':
      return 'Passkeys';
    default:
      return 'General';
  }
};

const mapAttachments = (attachments?: VaultAttachmentMeta[]): CanonicalAttachment[] => {
  if (!Array.isArray(attachments)) return [];
  return attachments.map((attachment) => ({
    id: attachment.id,
    name: attachment.name || '',
    mime_type: attachment.type || '',
    size: attachment.size || 0,
  }));
};

const buildSecretFields = (entry: VaultEntry): CanonicalSecretFields | undefined => {
  const secret: CanonicalSecretFields = {};

  if (entry.pass) {
    secret.password = entry.pass;
  }

  if (entry.notes) {
    secret.notes = entry.notes;
  }

  if (entry.totpSecret || entry.totp_secret) {
    secret.totp = {
      secret: entry.totpSecret || entry.totp_secret || '',
      issuer: entry.totp_issuer || undefined,
      algorithm: entry.totp_algorithm || undefined,
      digits: entry.totp_digits || undefined,
      period: entry.totp_period || undefined,
    };
  }

  if (!secret.password && !secret.notes && !secret.totp) {
    return undefined;
  }

  return secret;
};

const mapSharingAssignments = (
  assignments?: CanonicalSharingAssignment[]
): CanonicalSharingAssignment[] | undefined => {
  if (!Array.isArray(assignments) || assignments.length === 0) return undefined;
  return assignments.map((assignment) => ({ ...assignment }));
};

export const toCanonicalVaultRecord = (entry: VaultEntry): CanonicalVaultRecord => ({
  id: entry.id,
  title: entry.title || 'Untitled',
  username: entry.username || '',
  url: entry.website || '',
  category: toCanonicalCategory(entry.category),
  favorite: false,
  tags: Array.isArray(entry.tags) ? entry.tags : [],
  deleted_at: entry.deletedAt || null,
  created_at: undefined,
  updated_at: entry.updated_at || undefined,
  secret: buildSecretFields(entry),
  attachments: mapAttachments(entry.attachments),
  passkey: entry.passkeyMetadata ? { ...entry.passkeyMetadata } : null,
  sharing: mapSharingAssignments(entry.sharing),
});

export const toCanonicalVaultRecords = (entries: VaultEntry[]): CanonicalVaultRecord[] =>
  entries.map((entry) => toCanonicalVaultRecord(entry));

const fromCanonicalAttachments = (attachments?: CanonicalAttachment[]): VaultAttachmentMeta[] => {
  if (!Array.isArray(attachments)) return [];
  return attachments.map((attachment) => ({
    id: attachment.id,
    name: attachment.name,
    type: attachment.mime_type,
    size: attachment.size,
  }));
};

export const fromCanonicalVaultRecord = (record: CanonicalVaultRecord): Partial<VaultEntry> => ({
  id: typeof record.id === 'number' ? record.id : Date.now(),
  title: record.title || 'Untitled',
  username: record.username || '',
  website: record.url || '',
  category: fromCanonicalCategory(record.category),
  tags: Array.isArray(record.tags) ? record.tags : [],
  deletedAt: record.deleted_at || undefined,
  updated_at: record.updated_at || new Date().toISOString(),
  pass: record.secret?.password || '',
  notes: record.secret?.notes || undefined,
  totpSecret: record.secret?.totp?.secret || undefined,
  totp_issuer: record.secret?.totp?.issuer || undefined,
  totp_algorithm: record.secret?.totp?.algorithm || undefined,
  totp_digits: record.secret?.totp?.digits || undefined,
  totp_period: record.secret?.totp?.period || undefined,
  attachments: fromCanonicalAttachments(record.attachments),
  passkeyMetadata: record.passkey ? { ...record.passkey } : undefined,
  sharing: Array.isArray(record.sharing) ? record.sharing.map((assignment) => ({ ...assignment })) : undefined,
});

export const fromCanonicalVaultRecords = (records: CanonicalVaultRecord[]): Partial<VaultEntry>[] =>
  records.map((record) => fromCanonicalVaultRecord(record));

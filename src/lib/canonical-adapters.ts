import type {
  VaultEntry,
  VaultAttachmentMeta,
  VaultCardDetails,
  VaultIdentityDetails,
} from '../vaultService';
import type {
  CanonicalAttachment,
  CanonicalCardDetails,
  CanonicalIdentityDetails,
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
  if (normalized === 'cryptowallet' || normalized === 'crypto wallet')
    return 'crypto_wallet' as const;
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
    case 'crypto_wallet':
      return 'CryptoWallet';
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

const hasAnyStringField = (value: Record<string, unknown>): boolean =>
  Object.values(value).some((field) => typeof field === 'string' && field.trim().length > 0);

const normalizeCardDetails = (
  value?: VaultCardDetails | CanonicalCardDetails | null
): CanonicalCardDetails | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const details: CanonicalCardDetails = {
    cardholder_name: typeof value.cardholder_name === 'string' ? value.cardholder_name : undefined,
    card_number: typeof value.card_number === 'string' ? value.card_number : undefined,
    brand: typeof value.brand === 'string' ? value.brand : undefined,
    expiry_month: typeof value.expiry_month === 'string' ? value.expiry_month : undefined,
    expiry_year: typeof value.expiry_year === 'string' ? value.expiry_year : undefined,
    cvv: typeof value.cvv === 'string' ? value.cvv : undefined,
    pin: typeof value.pin === 'string' ? value.pin : undefined,
    billing_zip: typeof value.billing_zip === 'string' ? value.billing_zip : undefined,
    billing_address: typeof value.billing_address === 'string' ? value.billing_address : undefined,
  };
  return hasAnyStringField(details as Record<string, unknown>) ? details : undefined;
};

const normalizeIdentityDetails = (
  value?: VaultIdentityDetails | CanonicalIdentityDetails | null
): CanonicalIdentityDetails | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const details: CanonicalIdentityDetails = {
    document_type: typeof value.document_type === 'string' ? value.document_type : undefined,
    identity_number: typeof value.identity_number === 'string' ? value.identity_number : undefined,
    issuing_country: typeof value.issuing_country === 'string' ? value.issuing_country : undefined,
    nationality: typeof value.nationality === 'string' ? value.nationality : undefined,
    date_of_birth: typeof value.date_of_birth === 'string' ? value.date_of_birth : undefined,
    issued_at: typeof value.issued_at === 'string' ? value.issued_at : undefined,
    expires_at: typeof value.expires_at === 'string' ? value.expires_at : undefined,
  };
  return hasAnyStringField(details as Record<string, unknown>) ? details : undefined;
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
  custom_data: (() => {
    const card = normalizeCardDetails(entry.cardDetails);
    const identity = normalizeIdentityDetails(entry.identityDetails);
    if (!card && !identity) return undefined;
    return {
      ...(card ? { card_details: card } : {}),
      ...(identity ? { identity_details: identity } : {}),
    };
  })(),
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
  sharing: Array.isArray(record.sharing)
    ? record.sharing.map((assignment) => ({ ...assignment }))
    : undefined,
  cardDetails: (() => {
    const custom =
      record.custom_data && typeof record.custom_data === 'object'
        ? (record.custom_data as Record<string, unknown>)
        : null;
    return normalizeCardDetails((custom?.card_details as CanonicalCardDetails | undefined) || null);
  })(),
  identityDetails: (() => {
    const custom =
      record.custom_data && typeof record.custom_data === 'object'
        ? (record.custom_data as Record<string, unknown>)
        : null;
    return normalizeIdentityDetails(
      (custom?.identity_details as CanonicalIdentityDetails | undefined) || null
    );
  })(),
});

export const fromCanonicalVaultRecords = (records: CanonicalVaultRecord[]): Partial<VaultEntry>[] =>
  records.map((record) => fromCanonicalVaultRecord(record));

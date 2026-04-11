// @ts-nocheck
import type { VaultCardDetails, VaultEntry, VaultIdentityDetails } from '../vaultService';
import { toCanonicalVaultRecords } from './canonical-adapters';

export interface ExportableVaultEntry {
  title: string;
  username: string;
  pass?: string;
  category: string;
  website?: string;
  tags?: string[];
  notes?: string;
  cardDetails?: VaultCardDetails | null;
  identityDetails?: VaultIdentityDetails | null;
}

// eslint-disable-next-line no-control-regex -- intentional: strip dangerous control chars from export data
const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const CSV_FORMULA_PREFIX_PATTERN = /^[=+\-@]/;

const sanitizeText = (value: unknown, maxLength: number): string =>
  String(value ?? '')
    .replace(CONTROL_CHAR_PATTERN, '')
    .trim()
    .slice(0, maxLength);

const sanitizeCsvText = (value: unknown, maxLength: number): string => {
  const sanitized = sanitizeText(value, maxLength);
  if (!sanitized) return '';
  return CSV_FORMULA_PREFIX_PATTERN.test(sanitized) ? `'${sanitized}` : sanitized;
};

const sanitizeCardDetails = (details?: VaultCardDetails | null): VaultCardDetails | null => {
  if (!details) return null;
  return {
    cardholder_name: sanitizeText(details.cardholder_name, 128),
    card_number: sanitizeText(details.card_number, 64),
    brand: sanitizeText(details.brand, 64),
    expiry_month: sanitizeText(details.expiry_month, 8),
    expiry_year: sanitizeText(details.expiry_year, 8),
    cvv: sanitizeText(details.cvv, 16),
    pin: sanitizeText(details.pin, 16),
    billing_zip: sanitizeText(details.billing_zip, 32),
    billing_address: sanitizeText(details.billing_address, 512),
  };
};

const sanitizeIdentityDetails = (
  details?: VaultIdentityDetails | null
): VaultIdentityDetails | null => {
  if (!details) return null;
  return {
    document_type: sanitizeText(details.document_type, 64),
    identity_number: sanitizeText(details.identity_number, 64),
    issuing_country: sanitizeText(details.issuing_country, 64),
    nationality: sanitizeText(details.nationality, 64),
    date_of_birth: sanitizeText(details.date_of_birth, 32),
    issued_at: sanitizeText(details.issued_at, 32),
    expires_at: sanitizeText(details.expires_at, 32),
  };
};

const escapeCsvField = (value: unknown): string => `"${String(value || '').replace(/"/g, '""')}"`;

export class ExportService {
  static buildCsv(entries: ExportableVaultEntry[]): string {
    const headers = [
      'Title',
      'Username',
      'Password',
      'Category',
      'Website',
      'Tags',
      'Notes',
      'Cardholder Name',
      'Card Number',
      'Card Brand',
      'Card Expiry Month',
      'Card Expiry Year',
      'Card CVV',
      'Card PIN',
      'Card Billing ZIP',
      'Card Billing Address',
      'Identity Document Type',
      'Identity Number',
      'Identity Issuing Country',
      'Identity Nationality',
      'Identity Date of Birth',
      'Identity Issued At',
      'Identity Expires At',
    ];
    const rows = entries.map((entry) =>
      [
        escapeCsvField(sanitizeCsvText(entry.title, 256)),
        escapeCsvField(sanitizeCsvText(entry.username, 256)),
        escapeCsvField(sanitizeCsvText(entry.pass || '', 1024)),
        escapeCsvField(sanitizeCsvText(entry.category, 64)),
        escapeCsvField(sanitizeCsvText(entry.website || '', 512)),
        escapeCsvField(
          (entry.tags || [])
            .map((tag) => sanitizeCsvText(tag, 64))
            .filter(Boolean)
            .slice(0, 32)
            .join(';')
        ),
        escapeCsvField(sanitizeCsvText(entry.notes || '', 5000)),
        escapeCsvField(sanitizeCsvText(entry.cardDetails?.cardholder_name || '', 128)),
        escapeCsvField(sanitizeCsvText(entry.cardDetails?.card_number || '', 64)),
        escapeCsvField(sanitizeCsvText(entry.cardDetails?.brand || '', 64)),
        escapeCsvField(sanitizeCsvText(entry.cardDetails?.expiry_month || '', 8)),
        escapeCsvField(sanitizeCsvText(entry.cardDetails?.expiry_year || '', 8)),
        escapeCsvField(sanitizeCsvText(entry.cardDetails?.cvv || '', 16)),
        escapeCsvField(sanitizeCsvText(entry.cardDetails?.pin || '', 16)),
        escapeCsvField(sanitizeCsvText(entry.cardDetails?.billing_zip || '', 32)),
        escapeCsvField(sanitizeCsvText(entry.cardDetails?.billing_address || '', 512)),
        escapeCsvField(sanitizeCsvText(entry.identityDetails?.document_type || '', 64)),
        escapeCsvField(sanitizeCsvText(entry.identityDetails?.identity_number || '', 64)),
        escapeCsvField(sanitizeCsvText(entry.identityDetails?.issuing_country || '', 64)),
        escapeCsvField(sanitizeCsvText(entry.identityDetails?.nationality || '', 64)),
        escapeCsvField(sanitizeCsvText(entry.identityDetails?.date_of_birth || '', 32)),
        escapeCsvField(sanitizeCsvText(entry.identityDetails?.issued_at || '', 32)),
        escapeCsvField(sanitizeCsvText(entry.identityDetails?.expires_at || '', 32)),
      ].join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  static buildJson(entries: ExportableVaultEntry[]): string {
    return JSON.stringify(
      entries.map((entry) => ({
        title: sanitizeText(entry.title, 256),
        username: sanitizeText(entry.username, 256),
        password: sanitizeText(entry.pass || '', 1024),
        category: sanitizeText(entry.category, 64),
        website: sanitizeText(entry.website || '', 512),
        tags: (entry.tags || [])
          .map((tag) => sanitizeText(tag, 64))
          .filter(Boolean)
          .slice(0, 32),
        notes: sanitizeText(entry.notes || '', 5000),
        cardDetails: sanitizeCardDetails(entry.cardDetails),
        identityDetails: sanitizeIdentityDetails(entry.identityDetails),
      })),
      null,
      2
    );
  }

  static fromVaultEntries(entries: VaultEntry[]): ExportableVaultEntry[] {
    return entries.map((entry) => ({
      title: sanitizeText(entry.title, 256),
      username: sanitizeText(entry.username, 256),
      pass: sanitizeText(entry.pass || '', 1024),
      category: sanitizeText(entry.category, 64),
      website: sanitizeText(entry.website, 512),
      tags: (entry.tags || [])
        .map((tag) => sanitizeText(tag, 64))
        .filter(Boolean)
        .slice(0, 32),
      notes: sanitizeText(entry.notes || '', 5000),
      cardDetails: sanitizeCardDetails(entry.cardDetails),
      identityDetails: sanitizeIdentityDetails(entry.identityDetails),
    }));
  }

  static buildCanonicalJson(entries: VaultEntry[]): string {
    return JSON.stringify(toCanonicalVaultRecords(entries), null, 2);
  }
}

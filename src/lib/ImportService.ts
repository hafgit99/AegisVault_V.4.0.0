import type { VaultEntry } from '../vaultService';
import type { CanonicalVaultRecord } from './canonical-schema';
import type { SyncConflictSummary } from './SyncConflictResolutionService';
import { normalizeCanonicalCategory } from './canonical-schema';

export interface ImportProgress {
  totalAnalyzed: number;
  processed: number;
  status: 'parsing' | 'importing' | 'complete' | 'error';
  error?: string;
}

export interface ImportAnalysisReport {
  sourceFormat: 'csv' | 'json';
  totalRows: number;
  validEntries: number;
  skippedRows: number;
  weakPasswords: number;
  missingCriticalFields: number;
  duplicateCandidates: number;
  warnings: string[];
  conflictSummary?: SyncConflictSummary;
}

export interface ImportParseResult {
  entries: Partial<VaultEntry>[];
  report: ImportAnalysisReport;
}

export interface CanonicalImportParseResult {
  records: CanonicalVaultRecord[];
  report: ImportAnalysisReport;
}

export type ProgressCallback = (progress: ImportProgress) => void;

type JsonImportCandidate = {
  title?: string;
  name?: string;
  username?: string;
  password?: string;
  pass?: string;
  website?: string;
  url?: string;
  uri?: string;
  category?: string;
  notes?: string;
  tags?: string[] | string;
  cardDetails?: {
    cardholder_name?: string;
    card_number?: string;
    brand?: string;
    expiry_month?: string;
    expiry_year?: string;
    cvv?: string;
    pin?: string;
    billing_zip?: string;
    billing_address?: string;
  };
  identityDetails?: {
    document_type?: string;
    identity_number?: string;
    issuing_country?: string;
    nationality?: string;
    date_of_birth?: string;
    issued_at?: string;
    expires_at?: string;
  };
  cardholder_name?: string;
  card_number?: string;
  brand?: string;
  expiry_month?: string;
  expiry_year?: string;
  cvv?: string;
  pin?: string;
  billing_zip?: string;
  billing_address?: string;
  document_type?: string;
  identity_number?: string;
  issuing_country?: string;
  nationality?: string;
  date_of_birth?: string;
  issued_at?: string;
  expires_at?: string;
  login?: {
    username?: string;
    password?: string;
    uris?: Array<{ uri?: string }>;
  };
};

const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;
const MAX_IMPORT_ROWS = 25_000;
// eslint-disable-next-line no-control-regex -- intentional: strip dangerous control chars from import data
const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const sanitizeText = (value: unknown, maxLength: number): string =>
  String(value ?? '')
    .replace(CONTROL_CHAR_PATTERN, '')
    .trim()
    .slice(0, maxLength);

const sanitizeUrlText = (value: unknown): string => {
  const candidate = sanitizeText(value, 512);
  if (!candidate) return '';

  try {
    const hasScheme = candidate.includes('://');
    const parsed = hasScheme ? new URL(candidate) : new URL(`https://${candidate}`);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    const normalized = parsed.toString();
    const hasExplicitTrailingSlash = /\/$/.test(candidate);
    const hasPathInfo =
      parsed.pathname !== '/' || parsed.search.length > 0 || parsed.hash.length > 0;
    if (!hasPathInfo && !hasExplicitTrailingSlash) {
      return normalized.replace(/\/$/, '').slice(0, 512);
    }
    return normalized.slice(0, 512);
  } catch {
    return '';
  }
};

const hasHeader = (headers: string[], ...candidates: string[]): boolean =>
  candidates.some((candidate) => headers.includes(candidate));

const findHeaderIndex = (headers: string[], ...candidates: string[]): number =>
  headers.findIndex((value) => candidates.includes(value));

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const normalizeCategory = (value: string | undefined): string =>
  value && value.trim() ? value.trim() : 'General';

const normalizeUrl = (value: string | undefined): string => String(value || '').trim();

const buildEntry = (candidate: {
  title?: string;
  username?: string;
  pass?: string;
  website?: string;
  category?: string;
  tags?: string[];
  notes?: string;
  cardDetails?: {
    cardholder_name?: string;
    card_number?: string;
    brand?: string;
    expiry_month?: string;
    expiry_year?: string;
    cvv?: string;
    pin?: string;
    billing_zip?: string;
    billing_address?: string;
  };
  identityDetails?: {
    document_type?: string;
    identity_number?: string;
    issuing_country?: string;
    nationality?: string;
    date_of_birth?: string;
    issued_at?: string;
    expires_at?: string;
  };
}): Partial<VaultEntry> | null => {
  const title = sanitizeText(candidate.title || '', 256);
  const username = sanitizeText(candidate.username || '', 256);
  const pass = sanitizeText(candidate.pass || '', 1024);
  const website = sanitizeUrlText(candidate.website || '');

  if (!pass) return null;

  return {
    title: title || website || username || 'Imported Entry',
    username,
    pass,
    website,
    category: normalizeCategory(sanitizeText(candidate.category, 64)),
    tags: (candidate.tags || [])
      .map((tag) => sanitizeText(tag, 64))
      .filter(Boolean)
      .slice(0, 32),
    notes: sanitizeText(candidate.notes || '', 5000) || undefined,
    cardDetails: candidate.cardDetails,
    identityDetails: candidate.identityDetails,
  };
};

const toCanonicalRecord = (candidate: {
  title?: string;
  username?: string;
  pass?: string;
  website?: string;
  category?: string;
  tags?: string[];
  notes?: string;
  cardDetails?: {
    cardholder_name?: string;
    card_number?: string;
    brand?: string;
    expiry_month?: string;
    expiry_year?: string;
    cvv?: string;
    pin?: string;
    billing_zip?: string;
    billing_address?: string;
  };
  identityDetails?: {
    document_type?: string;
    identity_number?: string;
    issuing_country?: string;
    nationality?: string;
    date_of_birth?: string;
    issued_at?: string;
    expires_at?: string;
  };
}): CanonicalVaultRecord | null => {
  const password = String(candidate.pass || '').trim();
  const normalizedPassword = sanitizeText(password, 1024);
  if (!normalizedPassword) return null;

  const title = sanitizeText(candidate.title || '', 256);
  const username = sanitizeText(candidate.username || '', 256);
  const url = sanitizeUrlText(candidate.website);
  const tags = (candidate.tags || [])
    .map((tag) => sanitizeText(tag, 64))
    .filter(Boolean)
    .slice(0, 32);
  const notes = sanitizeText(candidate.notes || '', 5000);

  const randomId =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Array.from(crypto.getRandomValues(new Uint8Array(4)))
          .map((value) => value.toString(16).padStart(2, '0'))
          .join('');

  return {
    id: `import-${randomId}`,
    title: title || url || username || 'Imported Entry',
    username,
    url,
    category: normalizeCanonicalCategory(candidate.category),
    favorite: false,
    tags,
    deleted_at: null,
    secret: {
      password: normalizedPassword,
      ...(notes ? { notes } : {}),
    },
    attachments: [],
    custom_data: (() => {
      const hasCard =
        candidate.cardDetails &&
        Object.values(candidate.cardDetails).some((value) => String(value || '').trim().length > 0);
      const hasIdentity =
        candidate.identityDetails &&
        Object.values(candidate.identityDetails).some(
          (value) => String(value || '').trim().length > 0
        );
      if (!hasCard && !hasIdentity) return undefined;
      return {
        ...(hasCard ? { card_details: candidate.cardDetails } : {}),
        ...(hasIdentity ? { identity_details: candidate.identityDetails } : {}),
      };
    })(),
  };
};

const createEmptyReport = (sourceFormat: 'csv' | 'json'): ImportAnalysisReport => ({
  sourceFormat,
  totalRows: 0,
  validEntries: 0,
  skippedRows: 0,
  weakPasswords: 0,
  missingCriticalFields: 0,
  duplicateCandidates: 0,
  warnings: [],
});

const finalizeReport = (
  entries: Partial<VaultEntry>[],
  report: ImportAnalysisReport
): ImportAnalysisReport => {
  const seen = new Set<string>();

  for (const entry of entries) {
    if (!entry.title || !entry.username || !entry.website) {
      report.missingCriticalFields += 1;
    }
    if (!entry.pass || entry.pass.length < 8) {
      report.weakPasswords += 1;
    }

    const signature =
      `${entry.title || ''}::${entry.username || ''}::${entry.website || ''}`.toLowerCase();
    if (seen.has(signature)) {
      report.duplicateCandidates += 1;
    } else {
      seen.add(signature);
    }
  }

  report.validEntries = entries.length;
  return report;
};

const parseDelimitedRows = (text: string, separator: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === separator && !inQuotes) {
      row.push(cell.trim());
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) {
        rows.push(row.map((value) => value.replace(/^"|"$/g, '').trim()));
      }
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) {
    rows.push(row.map((value) => value.replace(/^"|"$/g, '').trim()));
  }

  return rows;
};

export class ImportService {
  static async parseFile(file: File, onProgress: ProgressCallback): Promise<ImportParseResult> {
    return new Promise((resolve, reject) => {
      onProgress({ totalAnalyzed: 0, processed: 0, status: 'parsing' });

      if (file.size > MAX_IMPORT_FILE_BYTES) {
        const error = new Error('Import file exceeds 10MB limit.');
        onProgress({
          totalAnalyzed: 0,
          processed: 0,
          status: 'error',
          error: error.message,
        });
        reject(error);
        return;
      }

      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const text = String(event.target?.result || '');
          if (!text.trim()) {
            throw new Error('File is empty or corrupted.');
          }

          const result = file.name.toLowerCase().endsWith('.json')
            ? this.parseJson(text)
            : this.parseCsv(text);

          onProgress({
            totalAnalyzed: result.entries.length,
            processed: 0,
            status: 'importing',
          });

          resolve(result);
        } catch (error) {
          onProgress({
            totalAnalyzed: 0,
            processed: 0,
            status: 'error',
            error: String(error),
          });
          reject(error);
        }
      };

      reader.onerror = () => {
        onProgress({
          totalAnalyzed: 0,
          processed: 0,
          status: 'error',
          error: 'Failed to read file.',
        });
        reject(new Error('Failed to read file.'));
      };

      reader.readAsText(file);
    });
  }

  private static parseJson(text: string): ImportParseResult {
    const entries: Partial<VaultEntry>[] = [];
    const report = createEmptyReport('json');

    try {
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : parsed.items || parsed.entries || [];
      if (!Array.isArray(arr)) {
        throw new Error('Invalid JSON format. File may be corrupted.');
      }
      if (arr.length > MAX_IMPORT_ROWS) {
        throw new Error('Import payload is too large.');
      }

      report.totalRows = arr.length;

      for (const item of arr) {
        if (!item || typeof item !== 'object') {
          report.skippedRows += 1;
          continue;
        }

        const candidate = item as JsonImportCandidate;
        const tags = Array.isArray(candidate.tags)
          ? candidate.tags.filter(isNonEmptyString)
          : isNonEmptyString(candidate.tags)
            ? candidate.tags
                .split(/[;,]/)
                .map((value) => value.trim())
                .filter(Boolean)
            : [];

        const entry = buildEntry({
          title: candidate.title || candidate.name || 'Imported Entry',
          username: candidate.username || candidate.login?.username || '',
          pass: candidate.password || candidate.pass || candidate.login?.password || '',
          website:
            candidate.website ||
            candidate.url ||
            candidate.uri ||
            candidate.login?.uris?.[0]?.uri ||
            '',
          category: candidate.category,
          tags,
          notes: candidate.notes,
          cardDetails: candidate.cardDetails || {
            cardholder_name: candidate.cardholder_name,
            card_number: candidate.card_number,
            brand: candidate.brand,
            expiry_month: candidate.expiry_month,
            expiry_year: candidate.expiry_year,
            cvv: candidate.cvv,
            pin: candidate.pin,
            billing_zip: candidate.billing_zip,
            billing_address: candidate.billing_address,
          },
          identityDetails: candidate.identityDetails || {
            document_type: candidate.document_type,
            identity_number: candidate.identity_number,
            issuing_country: candidate.issuing_country,
            nationality: candidate.nationality,
            date_of_birth: candidate.date_of_birth,
            issued_at: candidate.issued_at,
            expires_at: candidate.expires_at,
          },
        });

        if (entry) {
          entries.push(entry);
        } else {
          report.skippedRows += 1;
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message) {
        throw error;
      }
      throw new Error('Invalid JSON format. File may be corrupted.');
    }

    if (entries.length === 0) {
      throw new Error('No valid passwords could be imported from the JSON file.');
    }

    return { entries, report: finalizeReport(entries, report) };
  }

  private static parseCsv(text: string): ImportParseResult {
    const entries: Partial<VaultEntry>[] = [];
    const report = createEmptyReport('csv');
    const firstLine = text.split(/\r?\n/, 1)[0] || '';

    if (!firstLine.trim()) {
      throw new Error('CSV file is empty or lacks headers.');
    }

    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const separator = semicolonCount > commaCount ? ';' : ',';
    const rows = parseDelimitedRows(text, separator);

    if (rows.length < 2) {
      throw new Error('CSV file is empty or lacks headers.');
    }
    if (rows.length - 1 > MAX_IMPORT_ROWS) {
      throw new Error('Import payload is too large.');
    }

    const headers = rows[0].map((header) => header.toLowerCase().trim());
    report.totalRows = rows.length - 1;

    const titleIdx = findHeaderIndex(headers, 'name', 'title', 'website name', 'item name');
    const urlIdx = findHeaderIndex(headers, 'url', 'website', 'login_uri', 'uri', 'website url');
    const userIdx = findHeaderIndex(
      headers,
      'username',
      'login_username',
      'login',
      'email',
      'user name'
    );
    const passIdx = findHeaderIndex(headers, 'password', 'login_password', 'pass');
    const categoryIdx = findHeaderIndex(headers, 'category', 'folder', 'group', 'vault');
    const tagsIdx = findHeaderIndex(headers, 'tags', 'tag');
    const notesIdx = findHeaderIndex(headers, 'notes', 'note');
    const cardholderNameIdx = findHeaderIndex(headers, 'cardholder name', 'cardholder_name');
    const cardNumberIdx = findHeaderIndex(headers, 'card number', 'card_number');
    const cardBrandIdx = findHeaderIndex(headers, 'card brand', 'brand');
    const cardExpiryMonthIdx = findHeaderIndex(headers, 'card expiry month', 'expiry_month');
    const cardExpiryYearIdx = findHeaderIndex(headers, 'card expiry year', 'expiry_year');
    const cardCvvIdx = findHeaderIndex(headers, 'card cvv', 'cvv');
    const cardPinIdx = findHeaderIndex(headers, 'card pin', 'pin');
    const cardBillingZipIdx = findHeaderIndex(headers, 'card billing zip', 'billing_zip');
    const cardBillingAddressIdx = findHeaderIndex(
      headers,
      'card billing address',
      'billing_address'
    );
    const identityDocumentTypeIdx = findHeaderIndex(
      headers,
      'identity document type',
      'document_type'
    );
    const identityNumberIdx = findHeaderIndex(headers, 'identity number', 'identity_number');
    const identityIssuingCountryIdx = findHeaderIndex(
      headers,
      'identity issuing country',
      'issuing_country'
    );
    const identityNationalityIdx = findHeaderIndex(headers, 'identity nationality', 'nationality');
    const identityDobIdx = findHeaderIndex(headers, 'identity date of birth', 'date_of_birth');
    const identityIssuedAtIdx = findHeaderIndex(headers, 'identity issued at', 'issued_at');
    const identityExpiresAtIdx = findHeaderIndex(headers, 'identity expires at', 'expires_at');

    if (hasHeader(headers, 'login_uri', 'login_totp'))
      report.warnings.push('BITWARDEN_CSV_DETECTED');
    if (hasHeader(headers, 'otpauth', 'website name'))
      report.warnings.push('ONEPASSWORD_CSV_DETECTED');
    if (hasHeader(headers, 'group', 'last modified', 'totp'))
      report.warnings.push('KEEPASSXC_CSV_DETECTED');
    if (hasHeader(headers, 'createtime', 'modifytime', 'note', 'vault'))
      report.warnings.push('PROTON_PASS_CSV_DETECTED');

    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i];
      try {
        let title = titleIdx !== -1 ? cols[titleIdx] || '' : '';
        let website = urlIdx !== -1 ? cols[urlIdx] || '' : '';
        let username = userIdx !== -1 ? cols[userIdx] || '' : '';
        let pass = passIdx !== -1 ? cols[passIdx] || '' : '';

        if (titleIdx === -1 && headers.length >= 3) {
          if (passIdx === -1) pass = cols[headers.length - 1] || '';
          if (userIdx === -1) username = cols[headers.length - 2] || '';
          if (urlIdx === -1 && !website) website = cols[0] || '';
          title = website || username || 'Imported Entry';
        } else if (!title) {
          title = website || username || 'Imported Entry';
        }

        const tags =
          tagsIdx !== -1
            ? String(cols[tagsIdx] || '')
                .split(/[;,]/)
                .map((value) => value.trim())
                .filter(Boolean)
            : [];

        const entry = buildEntry({
          title,
          username,
          pass,
          website,
          category: categoryIdx !== -1 ? cols[categoryIdx] : 'General',
          tags,
          notes: notesIdx !== -1 ? cols[notesIdx] : '',
          cardDetails: {
            cardholder_name: cardholderNameIdx !== -1 ? cols[cardholderNameIdx] : '',
            card_number: cardNumberIdx !== -1 ? cols[cardNumberIdx] : '',
            brand: cardBrandIdx !== -1 ? cols[cardBrandIdx] : '',
            expiry_month: cardExpiryMonthIdx !== -1 ? cols[cardExpiryMonthIdx] : '',
            expiry_year: cardExpiryYearIdx !== -1 ? cols[cardExpiryYearIdx] : '',
            cvv: cardCvvIdx !== -1 ? cols[cardCvvIdx] : '',
            pin: cardPinIdx !== -1 ? cols[cardPinIdx] : '',
            billing_zip: cardBillingZipIdx !== -1 ? cols[cardBillingZipIdx] : '',
            billing_address: cardBillingAddressIdx !== -1 ? cols[cardBillingAddressIdx] : '',
          },
          identityDetails: {
            document_type: identityDocumentTypeIdx !== -1 ? cols[identityDocumentTypeIdx] : '',
            identity_number: identityNumberIdx !== -1 ? cols[identityNumberIdx] : '',
            issuing_country:
              identityIssuingCountryIdx !== -1 ? cols[identityIssuingCountryIdx] : '',
            nationality: identityNationalityIdx !== -1 ? cols[identityNationalityIdx] : '',
            date_of_birth: identityDobIdx !== -1 ? cols[identityDobIdx] : '',
            issued_at: identityIssuedAtIdx !== -1 ? cols[identityIssuedAtIdx] : '',
            expires_at: identityExpiresAtIdx !== -1 ? cols[identityExpiresAtIdx] : '',
          },
        });

        if (entry) {
          entries.push(entry);
        } else {
          report.skippedRows += 1;
        }
      } catch {
        report.skippedRows += 1;
      }
    }

    if (entries.length === 0) {
      throw new Error('Could not extract any valid passwords from the CSV.');
    }

    return { entries, report: finalizeReport(entries, report) };
  }

  static parseJsonCanonical(text: string): CanonicalImportParseResult {
    const result = this.parseJson(text);
    const records = result.entries
      .map((entry) =>
        toCanonicalRecord({
          title: typeof entry.title === 'string' ? entry.title : '',
          username: typeof entry.username === 'string' ? entry.username : '',
          pass: typeof entry.pass === 'string' ? entry.pass : '',
          website: typeof entry.website === 'string' ? entry.website : '',
          category: typeof entry.category === 'string' ? entry.category : '',
          tags: Array.isArray(entry.tags)
            ? entry.tags.filter((tag): tag is string => typeof tag === 'string')
            : [],
          notes: typeof entry.notes === 'string' ? entry.notes : '',
          cardDetails: entry.cardDetails || undefined,
          identityDetails: entry.identityDetails || undefined,
        })
      )
      .filter((record): record is CanonicalVaultRecord => Boolean(record));

    return {
      records,
      report: result.report,
    };
  }

  static parseCsvCanonical(text: string): CanonicalImportParseResult {
    const result = this.parseCsv(text);
    const records = result.entries
      .map((entry) =>
        toCanonicalRecord({
          title: typeof entry.title === 'string' ? entry.title : '',
          username: typeof entry.username === 'string' ? entry.username : '',
          pass: typeof entry.pass === 'string' ? entry.pass : '',
          website: typeof entry.website === 'string' ? entry.website : '',
          category: typeof entry.category === 'string' ? entry.category : '',
          tags: Array.isArray(entry.tags)
            ? entry.tags.filter((tag): tag is string => typeof tag === 'string')
            : [],
          notes: typeof entry.notes === 'string' ? entry.notes : '',
          cardDetails: entry.cardDetails || undefined,
          identityDetails: entry.identityDetails || undefined,
        })
      )
      .filter((record): record is CanonicalVaultRecord => Boolean(record));

    return {
      records,
      report: result.report,
    };
  }
}

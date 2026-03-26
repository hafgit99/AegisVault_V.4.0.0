// @ts-nocheck
import type { VaultEntry } from "../vaultService";
import type { CanonicalVaultRecord } from "./canonical-schema";
import type { SyncConflictSummary } from "./SyncConflictResolutionService";
import { normalizeCanonicalCategory } from "./canonical-schema";

export interface ImportProgress {
  totalAnalyzed: number;
  processed: number;
  status: "parsing" | "importing" | "complete" | "error";
  error?: string;
}

export interface ImportAnalysisReport {
  sourceFormat: "csv" | "json";
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
  login?: {
    username?: string;
    password?: string;
    uris?: Array<{ uri?: string }>;
  };
};

const hasHeader = (headers: string[], ...candidates: string[]): boolean =>
  candidates.some((candidate) => headers.includes(candidate));

const findHeaderIndex = (headers: string[], ...candidates: string[]): number =>
  headers.findIndex((value) => candidates.includes(value));

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const normalizeCategory = (value: string | undefined): string =>
  value && value.trim() ? value.trim() : "General";

const normalizeUrl = (value: string | undefined): string =>
  String(value || "").trim();

const buildEntry = (candidate: {
  title?: string;
  username?: string;
  pass?: string;
  website?: string;
  category?: string;
  tags?: string[];
}): Partial<VaultEntry> | null => {
  const title = String(candidate.title || "").trim();
  const username = String(candidate.username || "").trim();
  const pass = String(candidate.pass || "").trim();
  const website = String(candidate.website || "").trim();

  if (!pass) return null;

  return {
    title: title || website || username || "Imported Entry",
    username,
    pass,
    website,
    category: normalizeCategory(candidate.category),
    tags: candidate.tags?.filter(Boolean) || [],
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
}): CanonicalVaultRecord | null => {
  const password = String(candidate.pass || "").trim();
  if (!password) return null;

  const title = String(candidate.title || "").trim();
  const username = String(candidate.username || "").trim();
  const url = normalizeUrl(candidate.website);
  const tags = candidate.tags?.filter(Boolean) || [];
  const notes = String(candidate.notes || "").trim();

  return {
    id: `import-${Math.random().toString(36).slice(2, 10)}`,
    title: title || url || username || "Imported Entry",
    username,
    url,
    category: normalizeCanonicalCategory(candidate.category),
    favorite: false,
    tags,
    deleted_at: null,
    secret: {
      password,
      ...(notes ? { notes } : {}),
    },
    attachments: [],
  };
};

const createEmptyReport = (sourceFormat: "csv" | "json"): ImportAnalysisReport => ({
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

    const signature = `${entry.title || ""}::${entry.username || ""}::${entry.website || ""}`.toLowerCase();
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
  let cell = "";
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
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) {
        rows.push(row.map((value) => value.replace(/^"|"$/g, "").trim()));
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) {
    rows.push(row.map((value) => value.replace(/^"|"$/g, "").trim()));
  }

  return rows;
};

export class ImportService {
  static async parseFile(file: File, onProgress: ProgressCallback): Promise<ImportParseResult> {
    return new Promise((resolve, reject) => {
      onProgress({ totalAnalyzed: 0, processed: 0, status: "parsing" });

      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const text = String(event.target?.result || "");
          if (!text.trim()) {
            throw new Error("File is empty or corrupted.");
          }

          const result = file.name.toLowerCase().endsWith(".json")
            ? this.parseJson(text)
            : this.parseCsv(text);

          onProgress({
            totalAnalyzed: result.entries.length,
            processed: 0,
            status: "importing",
          });

          resolve(result);
        } catch (error) {
          onProgress({
            totalAnalyzed: 0,
            processed: 0,
            status: "error",
            error: String(error),
          });
          reject(error);
        }
      };

      reader.onerror = () => {
        onProgress({
          totalAnalyzed: 0,
          processed: 0,
          status: "error",
          error: "Failed to read file.",
        });
        reject(new Error("Failed to read file."));
      };

      reader.readAsText(file);
    });
  }

  private static parseJson(text: string): ImportParseResult {
    const entries: Partial<VaultEntry>[] = [];
    const report = createEmptyReport("json");

    try {
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : parsed.items || parsed.entries || [];
      if (!Array.isArray(arr)) {
        throw new Error("Invalid JSON format. File may be corrupted.");
      }

      report.totalRows = arr.length;

      for (const item of arr) {
        if (!item || typeof item !== "object") {
          report.skippedRows += 1;
          continue;
        }

        const candidate = item as JsonImportCandidate;
        const tags = Array.isArray(candidate.tags)
          ? candidate.tags.filter(isNonEmptyString)
          : isNonEmptyString(candidate.tags)
            ? candidate.tags.split(/[;,]/).map((value) => value.trim()).filter(Boolean)
            : [];

        const entry = buildEntry({
          title: candidate.title || candidate.name || "Imported Entry",
          username: candidate.username || candidate.login?.username || "",
          pass: candidate.password || candidate.pass || candidate.login?.password || "",
          website: candidate.website || candidate.url || candidate.uri || candidate.login?.uris?.[0]?.uri || "",
          category: candidate.category,
          tags,
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
      throw new Error("Invalid JSON format. File may be corrupted.");
    }

    if (entries.length === 0) {
      throw new Error("No valid passwords could be imported from the JSON file.");
    }

    return { entries, report: finalizeReport(entries, report) };
  }

  private static parseCsv(text: string): ImportParseResult {
    const entries: Partial<VaultEntry>[] = [];
    const report = createEmptyReport("csv");
    const firstLine = text.split(/\r?\n/, 1)[0] || "";

    if (!firstLine.trim()) {
      throw new Error("CSV file is empty or lacks headers.");
    }

    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const separator = semicolonCount > commaCount ? ";" : ",";
    const rows = parseDelimitedRows(text, separator);

    if (rows.length < 2) {
      throw new Error("CSV file is empty or lacks headers.");
    }

    const headers = rows[0].map((header) => header.toLowerCase().trim());
    report.totalRows = rows.length - 1;

    const titleIdx = findHeaderIndex(headers, "name", "title", "website name", "item name");
    const urlIdx = findHeaderIndex(headers, "url", "website", "login_uri", "uri", "website url");
    const userIdx = findHeaderIndex(headers, "username", "login_username", "login", "email", "user name");
    const passIdx = findHeaderIndex(headers, "password", "login_password", "pass");
    const categoryIdx = findHeaderIndex(headers, "category", "folder", "group", "vault");
    const tagsIdx = findHeaderIndex(headers, "tags", "tag");

    if (hasHeader(headers, "login_uri", "login_totp")) report.warnings.push("BITWARDEN_CSV_DETECTED");
    if (hasHeader(headers, "otpauth", "website name")) report.warnings.push("ONEPASSWORD_CSV_DETECTED");
    if (hasHeader(headers, "group", "last modified", "totp")) report.warnings.push("KEEPASSXC_CSV_DETECTED");
    if (hasHeader(headers, "createtime", "modifytime", "note", "vault")) report.warnings.push("PROTON_PASS_CSV_DETECTED");

    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i];
      try {
        let title = titleIdx !== -1 ? cols[titleIdx] || "" : "";
        let website = urlIdx !== -1 ? cols[urlIdx] || "" : "";
        let username = userIdx !== -1 ? cols[userIdx] || "" : "";
        let pass = passIdx !== -1 ? cols[passIdx] || "" : "";

        if (titleIdx === -1 && headers.length >= 3) {
          if (passIdx === -1) pass = cols[headers.length - 1] || "";
          if (userIdx === -1) username = cols[headers.length - 2] || "";
          if (urlIdx === -1 && !website) website = cols[0] || "";
          title = website || username || "Imported Entry";
        } else if (!title) {
          title = website || username || "Imported Entry";
        }

        const tags = tagsIdx !== -1
          ? String(cols[tagsIdx] || "").split(/[;,]/).map((value) => value.trim()).filter(Boolean)
          : [];

        const entry = buildEntry({
          title,
          username,
          pass,
          website,
          category: categoryIdx !== -1 ? cols[categoryIdx] : "General",
          tags,
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
      throw new Error("Could not extract any valid passwords from the CSV.");
    }

    return { entries, report: finalizeReport(entries, report) };
  }

  static parseJsonCanonical(text: string): CanonicalImportParseResult {
    const result = this.parseJson(text);
    const records = result.entries
      .map((entry) =>
        toCanonicalRecord({
          title: typeof entry.title === "string" ? entry.title : "",
          username: typeof entry.username === "string" ? entry.username : "",
          pass: typeof entry.pass === "string" ? entry.pass : "",
          website: typeof entry.website === "string" ? entry.website : "",
          category: typeof entry.category === "string" ? entry.category : "",
          tags: Array.isArray(entry.tags) ? entry.tags.filter((tag): tag is string => typeof tag === "string") : [],
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
          title: typeof entry.title === "string" ? entry.title : "",
          username: typeof entry.username === "string" ? entry.username : "",
          pass: typeof entry.pass === "string" ? entry.pass : "",
          website: typeof entry.website === "string" ? entry.website : "",
          category: typeof entry.category === "string" ? entry.category : "",
          tags: Array.isArray(entry.tags) ? entry.tags.filter((tag): tag is string => typeof tag === "string") : [],
        })
      )
      .filter((record): record is CanonicalVaultRecord => Boolean(record));

    return {
      records,
      report: result.report,
    };
  }
}

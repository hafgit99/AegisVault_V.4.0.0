import type { VaultEntry } from "../vaultService";

export interface ExportableVaultEntry {
  title: string;
  username: string;
  pass?: string;
  category: string;
  website?: string;
  tags?: string[];
}

const escapeCsvField = (value: string): string => `"${String(value || "").replace(/"/g, '""')}"`;

export class ExportService {
  static buildCsv(entries: ExportableVaultEntry[]): string {
    const headers = ["Title", "Username", "Password", "Category", "Website", "Tags"];
    const rows = entries.map((entry) =>
      [
        escapeCsvField(entry.title),
        escapeCsvField(entry.username),
        escapeCsvField(entry.pass || ""),
        escapeCsvField(entry.category),
        escapeCsvField(entry.website || ""),
        escapeCsvField((entry.tags || []).join(";")),
      ].join(",")
    );

    return [headers.join(","), ...rows].join("\n");
  }

  static buildJson(entries: ExportableVaultEntry[]): string {
    return JSON.stringify(
      entries.map((entry) => ({
        title: entry.title,
        username: entry.username,
        password: entry.pass || "",
        category: entry.category,
        website: entry.website || "",
        tags: entry.tags || [],
      })),
      null,
      2
    );
  }

  static fromVaultEntries(entries: VaultEntry[]): ExportableVaultEntry[] {
    return entries.map((entry) => ({
      title: entry.title,
      username: entry.username,
      pass: entry.pass || "",
      category: entry.category,
      website: entry.website,
      tags: entry.tags || [],
    }));
  }
}

import type { VaultCardDetails, VaultEntry, VaultIdentityDetails } from "../vaultService";
import { toCanonicalVaultRecords } from "./canonical-adapters";

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

const escapeCsvField = (value: string): string => `"${String(value || "").replace(/"/g, '""')}"`;

export class ExportService {
  static buildCsv(entries: ExportableVaultEntry[]): string {
    const headers = [
      "Title",
      "Username",
      "Password",
      "Category",
      "Website",
      "Tags",
      "Notes",
      "Cardholder Name",
      "Card Number",
      "Card Brand",
      "Card Expiry Month",
      "Card Expiry Year",
      "Card CVV",
      "Card PIN",
      "Card Billing ZIP",
      "Card Billing Address",
      "Identity Document Type",
      "Identity Number",
      "Identity Issuing Country",
      "Identity Nationality",
      "Identity Date of Birth",
      "Identity Issued At",
      "Identity Expires At",
    ];
    const rows = entries.map((entry) =>
      [
        escapeCsvField(entry.title),
        escapeCsvField(entry.username),
        escapeCsvField(entry.pass || ""),
        escapeCsvField(entry.category),
        escapeCsvField(entry.website || ""),
        escapeCsvField((entry.tags || []).join(";")),
        escapeCsvField(entry.notes || ""),
        escapeCsvField(entry.cardDetails?.cardholder_name || ""),
        escapeCsvField(entry.cardDetails?.card_number || ""),
        escapeCsvField(entry.cardDetails?.brand || ""),
        escapeCsvField(entry.cardDetails?.expiry_month || ""),
        escapeCsvField(entry.cardDetails?.expiry_year || ""),
        escapeCsvField(entry.cardDetails?.cvv || ""),
        escapeCsvField(entry.cardDetails?.pin || ""),
        escapeCsvField(entry.cardDetails?.billing_zip || ""),
        escapeCsvField(entry.cardDetails?.billing_address || ""),
        escapeCsvField(entry.identityDetails?.document_type || ""),
        escapeCsvField(entry.identityDetails?.identity_number || ""),
        escapeCsvField(entry.identityDetails?.issuing_country || ""),
        escapeCsvField(entry.identityDetails?.nationality || ""),
        escapeCsvField(entry.identityDetails?.date_of_birth || ""),
        escapeCsvField(entry.identityDetails?.issued_at || ""),
        escapeCsvField(entry.identityDetails?.expires_at || ""),
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
        notes: entry.notes || "",
        cardDetails: entry.cardDetails || null,
        identityDetails: entry.identityDetails || null,
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
      notes: entry.notes || "",
      cardDetails: entry.cardDetails || null,
      identityDetails: entry.identityDetails || null,
    }));
  }

  static buildCanonicalJson(entries: VaultEntry[]): string {
    return JSON.stringify(toCanonicalVaultRecords(entries), null, 2);
  }
}

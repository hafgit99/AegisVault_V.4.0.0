import type {
  PasskeyBindingRecord,
  PasskeyEventRecord,
  PasskeyPolicy,
  PasskeyRevocationRecord,
} from "./PasskeyBindingService";
import type { PasskeyProgramMode } from "../config/passkey-program";
import type { VaultEntry } from "../vaultService";

export interface PasskeyInventorySiteEntry {
  id: number;
  title: string;
  rpId: string;
  displayName: string;
  mode: PasskeyProgramMode;
  riskFlags: Array<"missing_rp_id" | "missing_credential_id" | "future_mode">;
}

export interface PasskeyInventorySummary {
  totalBindings: number;
  revokedCount: number;
  recoveryExportedCount: number;
  rotationRequiredCount: number;
  activeDeviceCount: number;
  recentEventCount: number;
  status: "healthy" | "attention";
  actionKeys: string[];
  modeCounts: Record<PasskeyProgramMode, number>;
  riskCounts: {
    missing_rp_id: number;
    missing_credential_id: number;
    future_mode: number;
  };
  sitePasskeyCount: number;
  sitePasskeyAttentionCount: number;
  siteEntries: PasskeyInventorySiteEntry[];
  previewSiteEntries: PasskeyInventorySiteEntry[];
}

const DAY_MS = 1000 * 60 * 60 * 24;

export class PasskeyInventoryService {
  static buildSummary(input: {
    bindings: Array<PasskeyBindingRecord & { bindingKey: string }>;
    policy: PasskeyPolicy;
    revocations: PasskeyRevocationRecord[];
    eventLog: PasskeyEventRecord[];
    vaultEntries?: VaultEntry[];
  }): PasskeyInventorySummary {
    const bindings = input.bindings || [];
    const revocations = input.revocations || [];
    const eventLog = input.eventLog || [];
    const policy = input.policy;
    const vaultEntries = input.vaultEntries || [];

    const siteEntries: PasskeyInventorySiteEntry[] = vaultEntries
      .filter((entry) => entry.category === "Passkeys" || entry.passkeyMetadata)
      .map((entry) => {
        const mode = entry.passkeyMetadata?.mode || "site_passkey_mvp";
        const riskFlags: PasskeyInventorySiteEntry["riskFlags"] = [];
        if (!entry.passkeyMetadata?.rp_id) riskFlags.push("missing_rp_id");
        if (!entry.passkeyMetadata?.credential_id) riskFlags.push("missing_credential_id");
        if (mode === "site_passkey_future_rp") riskFlags.push("future_mode");
        return {
          id: entry.id,
          title: entry.title || "Untitled",
          rpId: entry.passkeyMetadata?.rp_id || "",
          displayName: entry.passkeyMetadata?.display_name || "",
          mode,
          riskFlags,
        };
      })
      .sort((left, right) => {
        if (left.riskFlags.length !== right.riskFlags.length) {
          return right.riskFlags.length - left.riskFlags.length;
        }
        return left.title.localeCompare(right.title);
      });

    const recoveryExportedCount = bindings.filter((binding) => binding.meta.recoveryLastExportedAt).length;
    const rotationRequiredCount = bindings.filter((binding) => {
      const createdAtMs = Date.parse(binding.meta.createdAt || "");
      if (!Number.isFinite(createdAtMs)) return false;
      const ageDays = Math.floor((Date.now() - createdAtMs) / DAY_MS);
      return ageDays >= policy.maxBindingAgeDays;
    }).length;
    const recentEventCount = eventLog.filter((event) => {
      const atMs = Date.parse(event.at || "");
      return Number.isFinite(atMs) && Date.now() - atMs <= (7 * DAY_MS);
    }).length;

    const actionKeys: string[] = [];
    if (rotationRequiredCount > 0) actionKeys.push("passkeyInventoryActionRotate");
    if (recoveryExportedCount < bindings.length) actionKeys.push("passkeyInventoryActionRecovery");
    if (revocations.length > 0) actionKeys.push("passkeyInventoryActionAudit");
    if (siteEntries.some((entry) => entry.riskFlags.length > 0)) actionKeys.push("passkeyInventoryActionReviewSiteEntries");
    const modeCounts: Record<PasskeyProgramMode, number> = {
      vault_unlock: bindings.length,
      site_passkey_mvp: siteEntries.filter((entry) => entry.mode === "site_passkey_mvp").length,
      site_passkey_future_rp: siteEntries.filter((entry) => entry.mode === "site_passkey_future_rp").length,
    };
    const riskCounts = {
      missing_rp_id: siteEntries.filter((entry) => entry.riskFlags.includes("missing_rp_id")).length,
      missing_credential_id: siteEntries.filter((entry) => entry.riskFlags.includes("missing_credential_id")).length,
      future_mode: siteEntries.filter((entry) => entry.riskFlags.includes("future_mode")).length,
    };
    const sitePasskeyAttentionCount = siteEntries.filter((entry) => entry.riskFlags.length > 0).length;
    const hasAttention =
      rotationRequiredCount > 0 ||
      recoveryExportedCount < bindings.length ||
      sitePasskeyAttentionCount > 0;

    return {
      totalBindings: bindings.length,
      revokedCount: revocations.length,
      recoveryExportedCount,
      rotationRequiredCount,
      activeDeviceCount: bindings.length,
      recentEventCount,
      status: hasAttention ? "attention" : "healthy",
      actionKeys,
      modeCounts,
      riskCounts,
      sitePasskeyCount: siteEntries.length,
      sitePasskeyAttentionCount,
      siteEntries,
      previewSiteEntries: siteEntries.slice(0, 6),
    };
  }
}

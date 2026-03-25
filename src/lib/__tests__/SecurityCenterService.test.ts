import { describe, expect, it } from "vitest";
import { SecurityCenterService } from "../SecurityCenterService";

describe("SecurityCenterService", () => {
  it("builds security center metrics and issues from vault entries", () => {
    const summary = SecurityCenterService.buildSummary([
      {
        id: 1,
        title: "Github",
        username: "octocat",
        website: "https://github.com",
        category: "login",
        pass: "secret",
        updated_at: "2025-01-01T10:00:00.000Z",
      },
      {
        id: 2,
        title: "Bank",
        username: "ada",
        website: "https://bank.example",
        category: "login",
        pass: "long-enough-password",
        updated_at: "2026-03-20T10:00:00.000Z",
        totp_secret: "ABC123",
        sharing: [
          {
            space_id: "family-space",
            role: "editor",
            is_sensitive: true,
            emergency_access: false,
          },
        ],
      },
      {
        id: 3,
        title: "Passkey record",
        username: "ada",
        website: "https://passkey.example",
        category: "Passkeys",
        updated_at: "2026-03-22T10:00:00.000Z",
        passkeyMetadata: {
          rp_id: "passkey.example",
          credential_id: "cred-1",
          mode: "site_passkey_mvp",
        },
      },
    ] as never);

    expect(summary.metrics.missingSecondFactor).toBe(1);
    expect(summary.metrics.passkeyReady).toBe(2);
    expect(summary.metrics.agingCredentials).toBe(1);
    expect(summary.metrics.sensitiveSharing).toBe(1);
    expect(summary.issues.map((issue) => issue.type)).toEqual([
      "missing_second_factor",
      "passkey_ready",
      "aging_credentials",
      "sensitive_sharing",
    ]);
    expect(summary.triageItems.length).toBeGreaterThan(0);
    expect(summary.triageItems[0].severity).toBe("high");
    expect(summary.triageItems.some((item) => item.issueType === "passkey_ready")).toBe(true);
    expect(summary.score).toBeLessThan(100);
    expect(summary.riskLevel).toBe("medium");
  });

  it("hides reviewed triage items from the active queue", () => {
    const summary = SecurityCenterService.buildSummary([
      {
        id: 1,
        title: "Github",
        username: "octocat",
        website: "https://github.com",
        category: "login",
        pass: "secret",
        updated_at: "2025-01-01T10:00:00.000Z",
      },
    ] as never, {
      "missing_second_factor:1": "2026-03-23T18:00:00.000Z",
      "passkey_ready:1": "2026-03-23T18:00:00.000Z",
      "aging_credentials:1": "2026-03-23T18:00:00.000Z",
    });

    expect(summary.issues.length).toBeGreaterThan(0);
    expect(summary.triageItems).toHaveLength(0);
    expect(summary.reviewedTriageItems).toHaveLength(3);
  });

  it("shows reviewed items again after the review window expires", () => {
    const summary = SecurityCenterService.buildSummary([
      {
        id: 1,
        title: "Github",
        username: "octocat",
        website: "https://github.com",
        category: "login",
        pass: "secret",
        updated_at: "2025-01-01T10:00:00.000Z",
      },
    ] as never, {
      "missing_second_factor:1": "2026-03-01T10:00:00.000Z",
      "passkey_ready:1": "2026-03-01T10:00:00.000Z",
      "aging_credentials:1": "2026-03-01T10:00:00.000Z",
    });

    expect(summary.triageItems).toHaveLength(3);
    expect(summary.triageItems.every((item) => item.reviewExpired)).toBe(true);
    expect(summary.reviewedTriageItems).toHaveLength(0);
  });

  it("tracks reviewed items that are now fully resolved", () => {
    const summary = SecurityCenterService.buildSummary([
      {
        id: 1,
        title: "Github",
        username: "",
        website: "",
        category: "login",
        pass: "long-enough-password",
        updated_at: "2026-03-22T10:00:00.000Z",
        totp_secret: "ABC123",
      },
    ] as never, {
      "missing_second_factor:1": "2026-03-23T18:00:00.000Z",
    });

    expect(summary.triageItems).toHaveLength(0);
    expect(summary.reviewedTriageItems).toHaveLength(0);
    expect(summary.resolvedTriageItems).toHaveLength(1);
    expect(summary.resolvedTriageItems[0].issueType).toBe("missing_second_factor");
  });

  it("includes device trust and recent local risk signals", () => {
    const summary = SecurityCenterService.buildSummary([] as never, {}, {
      desktopPairings: [
        {
          extensionId: "ext-1",
          browserName: "Chrome",
          riskLevel: "high",
          riskFlags: ["fingerprint_changed"],
        },
      ],
      syncAuditEvents: [
        {
          id: "sync-1",
          type: "migration_completed",
          source: "migration",
          at: new Date().toISOString(),
          detail: "Legacy vault migration",
        },
      ],
    });

    expect(summary.issues.map((issue) => issue.type)).toContain("device_trust");
    expect(summary.issues.map((issue) => issue.type)).toContain("local_risk_activity");
    expect(summary.triageItems.some((item) => item.issueType === "device_trust")).toBe(true);
    expect(summary.triageItems.some((item) => item.issueType === "local_risk_activity")).toBe(true);
  });
});

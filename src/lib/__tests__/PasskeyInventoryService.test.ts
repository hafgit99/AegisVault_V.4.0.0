import { PasskeyInventoryService } from "../PasskeyInventoryService";

describe("PasskeyInventoryService", () => {
  it("marks summary healthy when recovery and rotation requirements are satisfied", () => {
    const summary = PasskeyInventoryService.buildSummary({
      bindings: [
        {
          bindingKey: "profile-A",
          credentialId: "cred-A",
          encryptedPayload: "enc",
          prfSalt: "salt",
          meta: {
            createdAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
            recoveryLastExportedAt: new Date().toISOString(),
            version: 1,
          },
        },
      ],
      policy: {
        maxBindingAgeDays: 90,
        requireRecoveryExportBeforeRotation: false,
        blockRevokedCredentials: true,
      },
      revocations: [],
      eventLog: [
        { at: new Date().toISOString(), type: "used" },
      ],
      vaultEntries: [
        {
          id: 7,
          title: "GitHub",
          username: "coder",
          website: "https://github.com",
          category: "Passkeys",
          updated_at: new Date().toISOString(),
          pass: "cred-gh",
          passkeyMetadata: {
            rp_id: "github.com",
            credential_id: "cred-gh",
            display_name: "GitHub Main",
            mode: "site_passkey_mvp",
          },
        } as never,
      ],
    });

    expect(summary.status).toBe("healthy");
    expect(summary.totalBindings).toBe(1);
    expect(summary.recoveryExportedCount).toBe(1);
    expect(summary.actionKeys).toHaveLength(0);
    expect(summary.modeCounts.vault_unlock).toBe(1);
    expect(summary.modeCounts.site_passkey_mvp).toBe(1);
    expect(summary.riskCounts.missing_rp_id).toBe(0);
    expect(summary.sitePasskeyCount).toBe(1);
    expect(summary.sitePasskeyAttentionCount).toBe(0);
  });

  it("surfaces rotation and recovery actions when bindings need attention", () => {
    const oldDate = new Date(Date.now() - (100 * 24 * 60 * 60 * 1000)).toISOString();
    const summary = PasskeyInventoryService.buildSummary({
      bindings: [
        {
          bindingKey: "profile-A",
          credentialId: "cred-A",
          encryptedPayload: "enc",
          prfSalt: "salt",
          meta: {
            createdAt: oldDate,
            lastUsedAt: new Date().toISOString(),
            version: 1,
          },
        },
      ],
      policy: {
        maxBindingAgeDays: 90,
        requireRecoveryExportBeforeRotation: true,
        blockRevokedCredentials: true,
      },
      revocations: [{ credentialId: "cred-old", revokedAt: new Date().toISOString(), reason: "rotated" }],
      eventLog: [],
      vaultEntries: [
        {
          id: 8,
          title: "Example",
          username: "",
          website: "",
          category: "Passkeys",
          updated_at: new Date().toISOString(),
          pass: "",
          passkeyMetadata: {
            mode: "site_passkey_future_rp",
          },
        } as never,
      ],
    });

    expect(summary.status).toBe("attention");
    expect(summary.rotationRequiredCount).toBe(1);
    expect(summary.revokedCount).toBe(1);
    expect(summary.actionKeys).toContain("passkeyInventoryActionRotate");
    expect(summary.actionKeys).toContain("passkeyInventoryActionRecovery");
    expect(summary.actionKeys).toContain("passkeyInventoryActionAudit");
    expect(summary.actionKeys).toContain("passkeyInventoryActionReviewSiteEntries");
    expect(summary.riskCounts.missing_rp_id).toBe(1);
    expect(summary.riskCounts.missing_credential_id).toBe(1);
    expect(summary.riskCounts.future_mode).toBe(1);
    expect(summary.sitePasskeyAttentionCount).toBe(1);
  });

  it("keeps the full site passkey inventory while limiting preview entries", () => {
    const summary = PasskeyInventoryService.buildSummary({
      bindings: [],
      policy: {
        maxBindingAgeDays: 90,
        requireRecoveryExportBeforeRotation: false,
        blockRevokedCredentials: true,
      },
      revocations: [],
      eventLog: [],
      vaultEntries: Array.from({ length: 8 }, (_, index) => ({
        id: index + 1,
        title: `Site ${index + 1}`,
        username: "user",
        website: `https://example${index + 1}.com`,
        category: "Passkeys",
        updated_at: new Date().toISOString(),
        pass: index % 2 === 0 ? "" : `cred-${index + 1}`,
        passkeyMetadata: {
          rp_id: index < 2 ? "" : `example${index + 1}.com`,
          credential_id: index % 2 === 0 ? "" : `cred-${index + 1}`,
          display_name: `Entry ${index + 1}`,
          mode: index === 0 ? "site_passkey_future_rp" : "site_passkey_mvp",
        },
      })) as never,
    });

    expect(summary.sitePasskeyCount).toBe(8);
    expect(summary.siteEntries).toHaveLength(8);
    expect(summary.previewSiteEntries).toHaveLength(6);
    expect(summary.siteEntries[0].riskFlags.length).toBeGreaterThan(0);
  });
});

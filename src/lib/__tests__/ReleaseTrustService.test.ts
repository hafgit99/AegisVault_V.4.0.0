import { describe, expect, it } from "vitest";
import { ReleaseTrustService } from "../ReleaseTrustService";

describe("ReleaseTrustService", () => {
  it("derives auto checklist status from passed checks and audit-ready docs", () => {
    const summary = ReleaseTrustService.buildSummary();

    expect(summary.autoChecklistStatus["releaseTrustPackageChecklist.external_audit.manifest"]).toBeTruthy();
    expect(summary.autoChecklistStatus["releaseTrustPackageChecklist.external_audit.audit_scope"]).toBeTruthy();
    expect(summary.autoChecklistStatus["releaseTrustPackageChecklist.technical_assurance.threat_model"]).toBeTruthy();
    expect(summary.autoChecklistStatus["releaseTrustPackageChecklist.technical_assurance.whitepaper"]).toBeTruthy();
    expect(summary.autoChecklistStatus["releaseTrustPackageChecklist.technical_assurance.ownership"]).toBeTruthy();
    expect(summary.autoChecklistStatus["releaseTrustPackageChecklist.external_audit.owner_signoff"]).toBeTruthy();
    expect(summary.autoChecklistSources["releaseTrustPackageChecklist.external_audit.manifest"]).toBe(
      "releaseTrustAutoSource.release_manifest"
    );
    expect(summary.autoChecklistSources["releaseTrustPackageChecklist.technical_assurance.threat_model"]).toBe(
      "releaseTrustAutoSource.threat_model"
    );
    expect(summary.autoChecklistSources["releaseTrustPackageChecklist.external_audit.owner_signoff"]).toBe(
      "releaseTrustAutoSource.program_baseline"
    );
  });

  it("builds audit-ready package progress from auto-collected checklist state", () => {
    const summary = ReleaseTrustService.buildSummary();
    const externalAuditPacket = summary.auditReadyPackages.find((pkg) => pkg.id === "external_audit_packet");
    const technicalAssurancePacket = summary.auditReadyPackages.find(
      (pkg) => pkg.id === "technical_assurance_packet"
    );

    expect(externalAuditPacket).toBeTruthy();
    expect(technicalAssurancePacket).toBeTruthy();
    expect(externalAuditPacket?.autoCompletedCount).toBe(3);
    expect(externalAuditPacket?.totalChecklistCount).toBe(3);
    expect(technicalAssurancePacket?.autoCompletedCount).toBe(3);
    expect(technicalAssurancePacket?.totalChecklistCount).toBe(3);
  });

  it("marks the release trust baseline complete when required evidence is green", () => {
    const summary = ReleaseTrustService.buildSummary();

    expect(summary.programStatus).toBe("baseline_complete");
    expect(summary.nextFocusKey).toBe("releaseTrustProgramNext.audit_ready");
  });
});

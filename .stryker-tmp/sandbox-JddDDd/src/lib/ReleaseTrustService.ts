// @ts-nocheck
import {
  RELEASE_TRUST_SNAPSHOT,
  type ReleaseTrustSnapshot,
  type ReleaseTrustSnapshotCheck,
} from "../generated/release-trust-snapshot";

export interface ReleaseTrustSummary {
  generatedAt: string;
  programStatus: "baseline_complete" | "baseline_in_progress";
  nextFocusKey: string;
  score: number;
  riskLevel: "low" | "medium" | "high";
  passedChecks: number;
  totalChecks: number;
  requiredChecksPassed: number;
  requiredChecksTotal: number;
  openGapCount: number;
  checks: ReleaseTrustSnapshotCheck[];
  ownerBreakdown: Array<{
    owner: string;
    total: number;
    passed: number;
  }>;
  auditReadyLinks: Array<{
    id: string;
    labelKey: string;
    path: string;
  }>;
  ownerActions: Array<{
    id: string;
    owner: string;
    titleKey: string;
    descriptionKey: string;
    targetPath: string;
    packageLinkIds: string[];
  }>;
  auditReadyPackages: Array<{
    id: string;
    titleKey: string;
    descriptionKey: string;
    owner: string;
    linkIds: string[];
    checklistKeys: string[];
    autoCompletedCount: number;
    totalChecklistCount: number;
  }>;
  autoChecklistStatus: Record<string, string>;
  autoChecklistSources: Record<string, string>;
}

const toRiskLevel = (openGapCount: number): ReleaseTrustSummary["riskLevel"] => {
  if (openGapCount === 0) return "low";
  if (openGapCount <= 2) return "medium";
  return "high";
};

export class ReleaseTrustService {
  static getSnapshot(): ReleaseTrustSnapshot {
    return RELEASE_TRUST_SNAPSHOT;
  }

  static buildSummary(): ReleaseTrustSummary {
    const checks = RELEASE_TRUST_SNAPSHOT.releaseChecks;
    const totalChecks = checks.length;
    const passedChecks = checks.filter((check) => check.status === "passed").length;
    const requiredChecks = checks.filter((check) => check.required);
    const requiredChecksPassed = requiredChecks.filter((check) => check.status === "passed").length;
    const openGapCount = RELEASE_TRUST_SNAPSHOT.evidenceGaps.length;
    const docMap = new Map((RELEASE_TRUST_SNAPSHOT.auditReadyDocs || []).map((doc) => [doc.id, doc]));
    const releaseChecksPassed = new Set(
      checks.filter((check) => check.status === "passed").map((check) => check.id)
    );

    const autoChecklistStatus: Record<string, string> = {};
    const autoChecklistSources: Record<string, string> = {};
    if (
      releaseChecksPassed.has("release_smoke") &&
      releaseChecksPassed.has("release_verification") &&
      releaseChecksPassed.has("platform_signing")
    ) {
      autoChecklistStatus["releaseTrustPackageChecklist.external_audit.manifest"] =
        RELEASE_TRUST_SNAPSHOT.generatedAt;
      autoChecklistSources["releaseTrustPackageChecklist.external_audit.manifest"] =
        "releaseTrustAutoSource.release_manifest";
    }
    if (docMap.get("external_audit_prep")?.exists) {
      autoChecklistStatus["releaseTrustPackageChecklist.external_audit.audit_scope"] =
        RELEASE_TRUST_SNAPSHOT.generatedAt;
      autoChecklistSources["releaseTrustPackageChecklist.external_audit.audit_scope"] =
        "releaseTrustAutoSource.external_audit_prep";
    }
    if (docMap.get("threat_model")?.exists) {
      autoChecklistStatus["releaseTrustPackageChecklist.technical_assurance.threat_model"] =
        RELEASE_TRUST_SNAPSHOT.generatedAt;
      autoChecklistSources["releaseTrustPackageChecklist.technical_assurance.threat_model"] =
        "releaseTrustAutoSource.threat_model";
    }
    if (docMap.get("security_whitepaper")?.exists) {
      autoChecklistStatus["releaseTrustPackageChecklist.technical_assurance.whitepaper"] =
        RELEASE_TRUST_SNAPSHOT.generatedAt;
      autoChecklistSources["releaseTrustPackageChecklist.technical_assurance.whitepaper"] =
        "releaseTrustAutoSource.security_whitepaper";
    }
    if (docMap.get("evidence_ownership")?.exists) {
      autoChecklistStatus["releaseTrustPackageChecklist.technical_assurance.ownership"] =
        RELEASE_TRUST_SNAPSHOT.generatedAt;
      autoChecklistSources["releaseTrustPackageChecklist.technical_assurance.ownership"] =
        "releaseTrustAutoSource.evidence_ownership";
    }
    if (openGapCount === 0 && requiredChecksPassed === requiredChecks.length) {
      autoChecklistStatus["releaseTrustPackageChecklist.external_audit.owner_signoff"] =
        RELEASE_TRUST_SNAPSHOT.generatedAt;
      autoChecklistSources["releaseTrustPackageChecklist.external_audit.owner_signoff"] =
        "releaseTrustAutoSource.program_baseline";
    }

    const ownerMap = new Map<string, { total: number; passed: number }>();
    for (const check of checks) {
      const current = ownerMap.get(check.owner) || { total: 0, passed: 0 };
      current.total += 1;
      if (check.status === "passed") current.passed += 1;
      ownerMap.set(check.owner, current);
    }

    const auditReadyPackages = [
      {
        id: "external_audit_packet",
        titleKey: "releaseTrustPackage.external_audit.title",
        descriptionKey: "releaseTrustPackage.external_audit.desc",
        owner: "release",
        linkIds: ["external_audit_prep", "evidence_ownership"],
        checklistKeys: [
          "releaseTrustPackageChecklist.external_audit.manifest",
          "releaseTrustPackageChecklist.external_audit.audit_scope",
          "releaseTrustPackageChecklist.external_audit.owner_signoff",
        ],
      },
      {
        id: "technical_assurance_packet",
        titleKey: "releaseTrustPackage.technical_assurance.title",
        descriptionKey: "releaseTrustPackage.technical_assurance.desc",
        owner: "supply-chain",
        linkIds: ["threat_model", "security_whitepaper", "evidence_ownership"],
        checklistKeys: [
          "releaseTrustPackageChecklist.technical_assurance.threat_model",
          "releaseTrustPackageChecklist.technical_assurance.whitepaper",
          "releaseTrustPackageChecklist.technical_assurance.ownership",
        ],
      },
    ].map((pkg) => ({
      ...pkg,
      autoCompletedCount: pkg.checklistKeys.filter((key) => Boolean(autoChecklistStatus[key])).length,
      totalChecklistCount: pkg.checklistKeys.length,
    }));

    return {
      generatedAt: RELEASE_TRUST_SNAPSHOT.generatedAt,
      programStatus:
        openGapCount === 0 && requiredChecksPassed === requiredChecks.length
          ? "baseline_complete"
          : "baseline_in_progress",
      nextFocusKey:
        openGapCount === 0 && requiredChecksPassed === requiredChecks.length
          ? "releaseTrustProgramNext.audit_ready"
          : "releaseTrustProgramNext.evidence_gaps",
      score: totalChecks === 0 ? 0 : Math.round((passedChecks / totalChecks) * 100),
      riskLevel: toRiskLevel(openGapCount),
      passedChecks,
      totalChecks,
      requiredChecksPassed,
      requiredChecksTotal: requiredChecks.length,
      openGapCount,
      checks,
      ownerBreakdown: Array.from(ownerMap.entries()).map(([owner, value]) => ({
        owner,
        total: value.total,
        passed: value.passed,
      })),
      auditReadyLinks: [
        {
          id: "external_audit_prep",
          labelKey: "releaseTrustAuditDoc.external_audit_prep",
          path: "guvenlik/EXTERNAL_AUDIT_PREP.md",
        },
        {
          id: "threat_model",
          labelKey: "releaseTrustAuditDoc.threat_model",
          path: "guvenlik/THREAT_MODEL.md",
        },
        {
          id: "security_whitepaper",
          labelKey: "releaseTrustAuditDoc.security_whitepaper",
          path: "guvenlik/SECURITY_WHITEPAPER.md",
        },
        {
          id: "evidence_ownership",
          labelKey: "releaseTrustAuditDoc.evidence_ownership",
          path: "ci-artifacts/evidence-ownership.md",
        },
      ],
      ownerActions: [
        {
          id: "release_evidence_bundle",
          owner: "release",
          titleKey: "releaseTrustOwnerAction.release_bundle.title",
          descriptionKey: "releaseTrustOwnerAction.release_bundle.desc",
          targetPath: "release/evidence/release-evidence-manifest.json",
          packageLinkIds: ["external_audit_prep", "evidence_ownership"],
        },
        {
          id: "supply_chain_bundle",
          owner: "supply-chain",
          titleKey: "releaseTrustOwnerAction.supply_chain_bundle.title",
          descriptionKey: "releaseTrustOwnerAction.supply_chain_bundle.desc",
          targetPath: "ci-artifacts/evidence-ownership.md",
          packageLinkIds: ["threat_model", "security_whitepaper", "evidence_ownership"],
        },
      ],
      auditReadyPackages,
      autoChecklistStatus,
      autoChecklistSources,
    };
  }
}

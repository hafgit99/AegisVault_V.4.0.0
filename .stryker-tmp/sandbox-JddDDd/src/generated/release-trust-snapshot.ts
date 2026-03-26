// @ts-nocheck
export interface ReleaseTrustSnapshotCheck {
  id: string;
  owner: string;
  status: string;
  artifact: string;
  required: boolean;
}

export interface ReleaseTrustSnapshotDoc {
  id: string;
  path: string;
  exists: boolean;
}

export interface ReleaseTrustSnapshot {
  generatedAt: string;
  qualityGeneratedAt: string;
  releaseChecks: ReleaseTrustSnapshotCheck[];
  auditReadyDocs: ReleaseTrustSnapshotDoc[];
  evidenceGaps: Array<{
    id: string;
    mode: string;
    owner: string;
    status: string;
    artifact: string;
    required: boolean;
  }>;
}

export const RELEASE_TRUST_SNAPSHOT: ReleaseTrustSnapshot = {
  "generatedAt": "2026-03-24T07:42:41.697Z",
  "qualityGeneratedAt": "2026-03-24T07:42:41.697Z",
  "releaseChecks": [
    {
      "id": "release_smoke",
      "required": true,
      "artifact": "ci-artifacts/release-smoke.json",
      "owner": "release",
      "status": "passed"
    },
    {
      "id": "release_verification",
      "required": true,
      "artifact": "ci-artifacts/release-verification.json",
      "owner": "release",
      "status": "passed"
    },
    {
      "id": "platform_signing",
      "required": true,
      "artifact": "ci-artifacts/platform-signing-verification.json",
      "owner": "release",
      "status": "passed"
    },
    {
      "id": "sbom",
      "required": true,
      "artifact": "release/*sbom*.json",
      "owner": "supply-chain",
      "status": "passed"
    },
    {
      "id": "provenance",
      "required": true,
      "artifact": "release/*provenance*.json",
      "owner": "supply-chain",
      "status": "passed"
    }
  ],
  "auditReadyDocs": [
    {
      "id": "external_audit_prep",
      "path": "guvenlik/EXTERNAL_AUDIT_PREP.md",
      "exists": true
    },
    {
      "id": "threat_model",
      "path": "guvenlik/THREAT_MODEL.md",
      "exists": true
    },
    {
      "id": "security_whitepaper",
      "path": "guvenlik/SECURITY_WHITEPAPER.md",
      "exists": true
    },
    {
      "id": "evidence_ownership",
      "path": "ci-artifacts/evidence-ownership.md",
      "exists": true
    }
  ],
  "evidenceGaps": []
};

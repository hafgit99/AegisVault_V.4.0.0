const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const repoRoot = process.cwd();
const releaseDir = path.join(repoRoot, "release");
const reportDir = path.join(repoRoot, "ci-artifacts");
const reportPath = path.join(reportDir, "release-verification.json");
const requireSignedRelease = process.env.AEGIS_REQUIRE_SIGNED_RELEASE === "1";

function normalizePem(value) {
  if (!value) return null;
  return value.includes("\\n") ? value.replace(/\\n/g, "\n") : value;
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function verifySignature(payload, signature, publicKey) {
  try {
    return crypto.verify(null, Buffer.from(payload), publicKey, Buffer.from(signature, "base64"));
  } catch (e) {
    console.error("[release:verify] signature verification error:", e.message);
    return false;
  }
}

function normalizeAttachment(attachment, fallbackPath) {
  if (!attachment) return null;
  if (typeof attachment === "string") {
    return {
      file: path.basename(attachment),
      sha256: fs.existsSync(fallbackPath) ? sha256(fallbackPath) : null,
    };
  }
  if (typeof attachment === "object" && typeof attachment.file === "string") {
    return {
      file: attachment.file,
      sha256: typeof attachment.sha256 === "string" ? attachment.sha256 : null,
    };
  }
  return null;
}

function main() {
  const manifestPath = path.join(releaseDir, "aegis-release-manifest.json");
  const sbomPath = path.join(releaseDir, "aegis-release-sbom.json");
  const provenancePath = path.join(releaseDir, "aegis-release-provenance.json");
  const errors = [];

  if (!fs.existsSync(manifestPath)) errors.push("RELEASE_MANIFEST_MISSING");
  if (!fs.existsSync(sbomPath)) errors.push("RELEASE_SBOM_MISSING");
  if (!fs.existsSync(provenancePath)) errors.push("RELEASE_PROVENANCE_MISSING");

  let signatureStatus = "unsigned";
  let artifactResults = [];

  if (errors.length === 0) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const sbomAttachment = normalizeAttachment(manifest.attachments?.sbom, sbomPath);
    const provenanceAttachment = normalizeAttachment(manifest.attachments?.provenance, provenancePath);
    artifactResults = (manifest.artifacts || []).map((artifact) => {
      const artifactPath = path.join(releaseDir, artifact.file);
      const exists = fs.existsSync(artifactPath);
      const actualHash = exists ? sha256(artifactPath) : null;
      const hashMatches = exists && actualHash === artifact.sha256;
      if (!exists) errors.push(`ARTIFACT_MISSING:${artifact.file}`);
      if (exists && !hashMatches) errors.push(`HASH_MISMATCH:${artifact.file}`);
      return {
        file: artifact.file,
        exists,
        hashMatches,
      };
    });
    const attachmentResults = [
      { key: "sbom", attachment: sbomAttachment, fullPath: sbomPath },
      { key: "provenance", attachment: provenanceAttachment, fullPath: provenancePath },
    ].map(({ key, attachment, fullPath }) => {
      const exists = Boolean(attachment?.file) && fs.existsSync(fullPath);
      const actualHash = exists ? sha256(fullPath) : null;
      const hashMatches = Boolean(exists && attachment?.sha256 && actualHash === attachment.sha256);
      if (!attachment?.file) errors.push(`RELEASE_${key.toUpperCase()}_ATTACHMENT_MISSING`);
      if (attachment?.file && !exists) errors.push(`RELEASE_${key.toUpperCase()}_FILE_MISSING`);
      if (exists && !attachment?.sha256) errors.push(`RELEASE_${key.toUpperCase()}_HASH_MISSING`);
      if (exists && attachment?.sha256 && !hashMatches) errors.push(`RELEASE_${key.toUpperCase()}_HASH_MISMATCH`);
      return {
        key,
        file: attachment?.file || null,
        exists,
        hashMatches,
      };
    });

    const provenance = JSON.parse(fs.readFileSync(provenancePath, "utf8"));
    if (String(provenance?.subject?.version || "") !== String(manifest.subject || "")) {
      errors.push("RELEASE_PROVENANCE_SUBJECT_MISMATCH");
    }

    const signature = manifest.signature || {};
    const payload = JSON.stringify({ ...manifest, signature: null });
    const publicKey = normalizePem(process.env.AEGIS_RELEASE_SIGNING_PUBLIC_KEY);

    if (signature.signed) {
      if (!publicKey) {
        signatureStatus = "signed-unverifiable";
        if (requireSignedRelease) {
          errors.push("RELEASE_SIGNATURE_PUBLIC_KEY_MISSING");
        }
      } else if (verifySignature(payload, signature.value, publicKey)) {
        signatureStatus = "verified";
      } else {
        signatureStatus = "invalid";
        errors.push("RELEASE_SIGNATURE_INVALID");
      }
    } else if (requireSignedRelease) {
      signatureStatus = "unsigned";
      errors.push("RELEASE_SIGNATURE_REQUIRED");
    }

    artifactResults = [...artifactResults, ...attachmentResults];
  }

  const report = {
    ok: errors.length === 0,
    checkedAt: new Date().toISOString(),
    releaseDir,
    signatureStatus,
    artifacts: artifactResults,
    errors,
  };

  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`[release:verify] report written: ${reportPath}`);

  if (!report.ok) {
    console.error(`[release:verify] failed: ${errors.join(", ")}`);
    process.exit(1);
  }
}

main();

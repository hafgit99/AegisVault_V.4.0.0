const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const repoRoot = process.cwd();
const releaseDir = path.join(repoRoot, "release");
const manifestPath = path.join(releaseDir, "aegis-release-manifest.json");
const requireSignedRelease = process.env.AEGIS_REQUIRE_SIGNED_RELEASE === "1";

function normalizePem(value) {
  if (!value) return null;
  return value.includes("\\n") ? value.replace(/\\n/g, "\n") : value;
}

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function parseHashes() {
  if (!fs.existsSync(releaseDir)) return [];
  return fs.readdirSync(releaseDir)
    .filter((file) => file.endsWith(".sha256"))
    .sort()
    .map((file) => {
      const target = file.replace(/\.sha256$/u, "");
      return {
        file: target,
        sha256: readUtf8(path.join(releaseDir, file)).trim(),
      };
    });
}

function fingerprintPublicKey(publicKeyPem) {
  return crypto.createHash("sha256").update(publicKeyPem).digest("hex");
}

function buildManifest() {
  const sbomPath = path.join(releaseDir, "aegis-release-sbom.json");
  const provenancePath = path.join(releaseDir, "aegis-release-provenance.json");
  const artifacts = parseHashes();

  return {
    schema: "aegis-release-manifest-v1",
    generatedAt: new Date().toISOString(),
    subject: JSON.parse(readUtf8(path.join(repoRoot, "package.json"))).version,
    artifacts,
    attachments: {
      sbom: fs.existsSync(sbomPath) ? path.basename(sbomPath) : null,
      provenance: fs.existsSync(provenancePath) ? path.basename(provenancePath) : null,
    },
    signature: null,
  };
}

function main() {
  if (!fs.existsSync(releaseDir)) {
    console.error("[release:sign-manifest] release directory not found.");
    process.exit(1);
  }

  const manifest = buildManifest();
  const signingKey = normalizePem(process.env.AEGIS_RELEASE_SIGNING_PRIVATE_KEY);
  const publicKey = normalizePem(process.env.AEGIS_RELEASE_SIGNING_PUBLIC_KEY);
  const payload = JSON.stringify({ ...manifest, signature: null });

  if (requireSignedRelease && (!signingKey || !publicKey)) {
    console.error("[release:sign-manifest] signed release required but signing key pair is missing.");
    process.exit(1);
  }

  if (signingKey) {
    const signer = crypto.createSign("SHA256");
    signer.update(payload);
    signer.end();
    manifest.signature = {
      algorithm: "RSA-SHA256",
      value: signer.sign(signingKey, "base64"),
      publicKeyFingerprint: publicKey ? fingerprintPublicKey(publicKey) : null,
      signed: true,
    };
  } else {
    manifest.signature = {
      algorithm: null,
      value: null,
      publicKeyFingerprint: null,
      signed: false,
      note: "Signing key was not provided in this build environment.",
    };
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`[release:sign-manifest] written: ${manifestPath}`);
}

main();

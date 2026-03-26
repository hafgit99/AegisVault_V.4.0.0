// @ts-nocheck
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const repoRoot = process.cwd();
const releaseDir = path.join(repoRoot, "release");
const outputPath = path.join(releaseDir, "aegis-release-provenance.json");
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));

function sha256(filePath) {
  return require("node:crypto").createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function listArtifacts() {
  if (!fs.existsSync(releaseDir)) return [];
  return fs.readdirSync(releaseDir)
    .filter((file) => /\.(exe|dmg|zip|AppImage|deb|sha256|blockmap|json)$/i.test(file))
    .sort()
    .map((file) => {
      const fullPath = path.join(releaseDir, file);
      const stat = fs.statSync(fullPath);
      return {
        file,
        sizeBytes: stat.size,
        sha256: sha256(fullPath),
      };
    });
}

function main() {
  if (!fs.existsSync(releaseDir)) {
    console.error("[release:provenance] release directory not found.");
    process.exit(1);
  }

  const provenance = {
    statementType: "AegisVaultReleaseProvenance",
    version: 1,
    generatedAt: new Date().toISOString(),
    builder: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      hostname: os.hostname(),
      workflow: process.env.GITHUB_WORKFLOW || null,
      runId: process.env.GITHUB_RUN_ID || null,
      runAttempt: process.env.GITHUB_RUN_ATTEMPT || null,
      actor: process.env.GITHUB_ACTOR || null,
    },
    source: {
      repository: process.env.GITHUB_REPOSITORY || null,
      ref: process.env.GITHUB_REF || null,
      sha: process.env.GITHUB_SHA || null,
      workspace: repoRoot,
    },
    subject: {
      name: packageJson.productName || packageJson.name,
      version: packageJson.version,
    },
    artifacts: listArtifacts(),
  };

  fs.writeFileSync(outputPath, JSON.stringify(provenance, null, 2), "utf8");
  console.log(`[release:provenance] written: ${outputPath}`);
}

main();

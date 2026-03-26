// @ts-nocheck
const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const releaseDir = path.join(repoRoot, 'release');
const reportDir = path.join(repoRoot, 'ci-artifacts');
const reportPath = path.join(reportDir, 'release-smoke.json');

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function listFiles(dir, matcher) {
  if (!fileExists(dir)) return [];
  return fs.readdirSync(dir).filter((file) => matcher.test(file)).sort();
}

function buildReport() {
  const installerFiles = listFiles(releaseDir, /\.(exe|dmg|zip|AppImage|deb)$/i);
  const blockMapFiles = listFiles(releaseDir, /\.blockmap$/i);
  const hashFiles = listFiles(releaseDir, /\.sha256$/i);
  const sbomExists = fileExists(path.join(releaseDir, "aegis-release-sbom.json"));
  const provenanceExists = fileExists(path.join(releaseDir, "aegis-release-provenance.json"));
  const manifestExists = fileExists(path.join(releaseDir, "aegis-release-manifest.json"));

  const artifactDetails = installerFiles.map((file) => {
    const fullPath = path.join(releaseDir, file);
    const stat = fs.statSync(fullPath);
    const hashFile = `${file}.sha256`;
    return {
      file,
      sizeBytes: stat.size,
      hasHash: hashFiles.includes(hashFile),
      hasBlockmap: blockMapFiles.includes(`${file}.blockmap`),
    };
  });

  const hasArtifacts = installerFiles.length > 0;
  const hasHashesForAll = artifactDetails.every((item) => item.hasHash);
  const hasTrustChain = sbomExists && provenanceExists && manifestExists;

  return {
    ok: hasArtifacts && hasHashesForAll && hasTrustChain,
    checkedAt: new Date().toISOString(),
    releaseDir,
    installers: artifactDetails,
    blockMaps: blockMapFiles,
    hashFiles,
    trustChain: {
      sbomExists,
      provenanceExists,
      manifestExists,
    },
    errors: [
      ...(hasArtifacts ? [] : ['NO_RELEASE_ARTIFACTS_FOUND']),
      ...(hasHashesForAll ? [] : ['MISSING_SHA256_FILES']),
      ...(hasTrustChain ? [] : ['RELEASE_TRUST_CHAIN_INCOMPLETE']),
    ],
  };
}

const report = buildReport();
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
console.log(`[release-smoke] report written: ${reportPath}`);

if (!report.ok) {
  console.error('[release-smoke] failed:', report.errors.join(', '));
  process.exit(1);
}

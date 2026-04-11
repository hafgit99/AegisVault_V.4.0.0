// @ts-nocheck
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const repoRoot = process.cwd();
const releaseDir = path.join(repoRoot, 'release');
const outputPath = path.join(releaseDir, 'aegis-release-sbom.json');
const packageJsonPath = path.join(repoRoot, 'package.json');
const packageLockPath = path.join(repoRoot, 'package-lock.json');

function sha256File(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function normalizeLockPackages(lockData) {
  const packages =
    lockData &&
    typeof lockData === 'object' &&
    lockData.packages &&
    typeof lockData.packages === 'object'
      ? lockData.packages
      : {};

  return Object.entries(packages)
    .filter(([packagePath]) => packagePath)
    .map(([packagePath, details]) => {
      const packageData = details && typeof details === 'object' ? details : {};
      const segments = packagePath.split('node_modules/');
      const packageName = segments[segments.length - 1] || packagePath;

      return {
        name: packageData.name || packageName,
        version: packageData.version || '0.0.0',
        resolved: packageData.resolved || null,
        integrity: packageData.integrity || null,
        license: packageData.license || null,
        dev: Boolean(packageData.dev),
      };
    })
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name) || left.version.localeCompare(right.version)
    );
}

function main() {
  if (!fs.existsSync(releaseDir)) {
    console.error('[release:sbom] release directory not found.');
    process.exit(1);
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const lockData = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
  const packages = normalizeLockPackages(lockData);

  const sbom = {
    bomFormat: 'SPDX-Lite',
    specVersion: '2026-03-aegis',
    generatedAt: new Date().toISOString(),
    subject: {
      name: packageJson.productName || packageJson.name,
      version: packageJson.version,
      purl: `pkg:npm/${packageJson.name}@${packageJson.version}`,
    },
    metadata: {
      repositoryRoot: repoRoot,
      packageJsonSha256: sha256File(packageJsonPath),
      packageLockSha256: sha256File(packageLockPath),
      dependencyCount: packages.length,
    },
    components: packages,
  };

  fs.mkdirSync(releaseDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(sbom, null, 2), 'utf8');
  console.log(`[release:sbom] written: ${outputPath}`);
}

main();

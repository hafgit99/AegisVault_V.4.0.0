const fs = require('fs');
const path = require('path');

const mode = process.argv[2] || 'quality';
const repoRoot = process.cwd();
const reportDir = path.join(repoRoot, 'ci-artifacts');
const summaryPath = path.join(reportDir, 'quality-summary.json');
const enforcementPath = path.join(reportDir, `quality-gate-${mode}.json`);

function fail(code, message, errors) {
  const payload = {
    ok: false,
    mode,
    code,
    message,
    errors,
    checkedAt: new Date().toISOString(),
  };
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(enforcementPath, JSON.stringify(payload, null, 2), 'utf8');
  console.error(`[ci-enforce] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(summaryPath)) {
  fail('MISSING_SUMMARY', 'CI quality summary is missing.', ['QUALITY_SUMMARY_NOT_FOUND']);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const errors = [];

function requireReport(sectionName, report) {
  if (!report) {
    errors.push(`${sectionName.toUpperCase()}_REPORT_MISSING`);
    return;
  }
  if (report.success === false || report.failed > 0) {
    errors.push(`${sectionName.toUpperCase()}_REPORT_FAILED`);
  }
}

function requireReportIfPresent(sectionName, report) {
  if (!report) return;
  if (report.success === false || report.failed > 0) {
    errors.push(`${sectionName.toUpperCase()}_REPORT_FAILED`);
  }
}

requireReport('unit', summary.unit);
requireReport('import_export_regression', summary.importExportRegression);
requireReport('security_regression', summary.securityRegression);
requireReportIfPresent('e2e', summary.e2e);

if (!summary.extensionBuilds?.chrome?.exists) {
  errors.push('CHROME_EXTENSION_BUILD_MISSING');
}
if (!summary.extensionBuilds?.firefox?.exists) {
  errors.push('FIREFOX_EXTENSION_BUILD_MISSING');
}
if (!summary.nativeHost?.chromiumManifest?.exists) {
  errors.push('CHROMIUM_NATIVE_HOST_MANIFEST_MISSING');
}
if (!summary.nativeHost?.firefoxManifest?.exists) {
  errors.push('FIREFOX_NATIVE_HOST_MANIFEST_MISSING');
}
if (!summary.nativeHost?.launcher?.exists) {
  errors.push('NATIVE_HOST_LAUNCHER_MISSING');
}

if (mode === 'release') {
  if (!summary.releaseSmoke) {
    errors.push('RELEASE_SMOKE_REPORT_MISSING');
  } else if (!summary.releaseSmoke.ok) {
    errors.push('RELEASE_SMOKE_FAILED');
  }

  if (!summary.releaseVerification) {
    errors.push('RELEASE_VERIFICATION_REPORT_MISSING');
  } else if (!summary.releaseVerification.ok) {
    errors.push('RELEASE_VERIFICATION_FAILED');
  }

  if (!summary.platformSigning) {
    errors.push('PLATFORM_SIGNING_REPORT_MISSING');
  } else if (!summary.platformSigning.ok) {
    errors.push('PLATFORM_SIGNING_FAILED');
  }
}

const payload = {
  ok: errors.length === 0,
  mode,
  checkedAt: new Date().toISOString(),
  errors,
  summaryPath,
};

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(enforcementPath, JSON.stringify(payload, null, 2), 'utf8');

if (errors.length > 0) {
  console.error(`[ci-enforce] ${mode} gate failed: ${errors.join(', ')}`);
  process.exit(1);
}

console.log(`[ci-enforce] ${mode} gate passed.`);

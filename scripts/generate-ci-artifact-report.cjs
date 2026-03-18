const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();
const reportDir = path.join(repoRoot, "ci-artifacts");
const testResultsDir = path.join(repoRoot, "test-results");
const extensionDir = path.join(repoRoot, "aegis-wxt", "dist");
const nativeHostDir = path.join(repoRoot, "build", "native-host");

function readJsonIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function summarizeVitest(report) {
  if (!report) return null;
  const testResults = Array.isArray(report.testResults) ? report.testResults : [];
  let passed = 0;
  let failed = 0;
  for (const suite of testResults) {
    for (const assertion of suite.assertionResults || []) {
      if (assertion.status === "passed") passed += 1;
      if (assertion.status === "failed") failed += 1;
    }
  }
  return {
    suites: testResults.length,
    passed,
    failed,
    success: failed === 0,
  };
}

function summarizePlaywright(report) {
  if (!report) return null;
  let passed = 0;
  let failed = 0;
  const suites = Array.isArray(report.suites) ? report.suites : [];
  const visitSuites = (suiteList) => {
    for (const suite of suiteList) {
      for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
          const outcomes = Array.isArray(test.results) ? test.results : [];
          const hadPass = outcomes.some((item) => item.status === "passed");
          const hadFail = outcomes.some((item) => item.status === "failed" || item.status === "timedOut");
          if (hadPass && !hadFail) passed += 1;
          if (hadFail) failed += 1;
        }
      }
      visitSuites(suite.suites || []);
    }
  };
  visitSuites(suites);
  return {
    passed,
    failed,
    success: failed === 0,
  };
}

function fileStatus(filePath) {
  return {
    path: filePath,
    exists: fs.existsSync(filePath),
  };
}

const unitReport = summarizeVitest(readJsonIfExists(path.join(testResultsDir, "vitest-results.json")));
const importExportReport = summarizeVitest(readJsonIfExists(path.join(testResultsDir, "import-export-regression.json")));
const securityReport = summarizeVitest(readJsonIfExists(path.join(testResultsDir, "security-regression.json")));
const e2eReport = summarizePlaywright(readJsonIfExists(path.join(testResultsDir, "results.json")));
const releaseReport = readJsonIfExists(path.join(reportDir, "release-smoke.json"));
const releaseVerificationReport = readJsonIfExists(path.join(reportDir, "release-verification.json"));

const summary = {
  generatedAt: new Date().toISOString(),
  unit: unitReport,
  importExportRegression: importExportReport,
  securityRegression: securityReport,
  e2e: e2eReport,
  releaseSmoke: releaseReport,
  releaseVerification: releaseVerificationReport,
  extensionBuilds: {
    chrome: fileStatus(path.join(extensionDir, "chrome-mv3", "manifest.json")),
    firefox: fileStatus(path.join(extensionDir, "firefox-mv2", "manifest.json")),
  },
  nativeHost: {
    chromiumManifest: fileStatus(path.join(nativeHostDir, "com.aegisvault.desktop.json")),
    firefoxManifest: fileStatus(path.join(nativeHostDir, "com.aegisvault.desktop.firefox.json")),
    launcher: fileStatus(path.join(nativeHostDir, "aegis-native-host-launcher.cmd")),
  },
};

const lines = [
  "# Aegis Vault CI Quality Summary",
  "# Aegis Vault CI Kalite Ozeti",
  "",
  `Generated / Uretim Zamanı: ${summary.generatedAt}`,
  "",
  "## Unit / Birim Testleri",
  unitReport
    ? `Passed / Gecti: ${unitReport.passed}, Failed / Hatali: ${unitReport.failed}, Suites / Paketler: ${unitReport.suites}`
    : "No unit report found / Birim test raporu bulunamadi.",
  "",
  "## Import-Export Regression / Import-Export Regresyonu",
  importExportReport
    ? `Passed / Gecti: ${importExportReport.passed}, Failed / Hatali: ${importExportReport.failed}, Suites / Paketler: ${importExportReport.suites}`
    : "No import-export regression report found / Import-export regresyon raporu bulunamadi.",
  "",
  "## Security Regression / Guvenlik Regresyonu",
  securityReport
    ? `Passed / Gecti: ${securityReport.passed}, Failed / Hatali: ${securityReport.failed}, Suites / Paketler: ${securityReport.suites}`
    : "No security regression report found / Guvenlik regresyon raporu bulunamadi.",
  "",
  "## E2E",
  e2eReport
    ? `Passed / Gecti: ${e2eReport.passed}, Failed / Hatali: ${e2eReport.failed}`
    : "No Playwright report found / Playwright raporu bulunamadi.",
  "",
  "## Extension Builds / Eklenti Buildleri",
  `Chrome MV3: ${summary.extensionBuilds.chrome.exists ? "OK" : "MISSING"}`,
  `Firefox MV2: ${summary.extensionBuilds.firefox.exists ? "OK" : "MISSING"}`,
  "",
  "## Native Host / Yerel Host",
  `Chromium manifest: ${summary.nativeHost.chromiumManifest.exists ? "OK" : "MISSING"}`,
  `Firefox manifest: ${summary.nativeHost.firefoxManifest.exists ? "OK" : "MISSING"}`,
  `Launcher: ${summary.nativeHost.launcher.exists ? "OK" : "MISSING"}`,
  "",
  "## Release Smoke / Yayin Duman Testi",
  releaseReport
    ? `OK: ${releaseReport.ok}, Installers / Paketler: ${(releaseReport.installers || []).length}`
    : "No release smoke report found / Release smoke raporu bulunamadi.",
  "",
  "## Release Trust Chain / Yayin Guven Zinciri",
  releaseVerificationReport
    ? `OK: ${releaseVerificationReport.ok}, Signature / Imza: ${releaseVerificationReport.signatureStatus || "unknown"}`
    : "No release verification report found / Release dogrulama raporu bulunamadi.",
  "",
];

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, "quality-summary.json"), JSON.stringify(summary, null, 2), "utf8");
fs.writeFileSync(path.join(reportDir, "quality-summary.md"), lines.join("\n"), "utf8");
console.log(`[ci-report] summary written to ${path.join(reportDir, "quality-summary.md")}`);

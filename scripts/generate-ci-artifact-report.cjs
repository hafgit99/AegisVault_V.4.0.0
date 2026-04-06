const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const reportDir = path.join(repoRoot, 'ci-artifacts');
const testResultsDir = path.join(repoRoot, 'test-results');
const vitestResultsDir = path.join(repoRoot, 'vitest-results');
const extensionDir = path.join(repoRoot, 'aegis-wxt', 'dist');
const nativeHostDir = path.join(repoRoot, 'build', 'native-host');
const qualityChecklistTemplatePath = path.join(
  repoRoot,
  'ci-artifacts',
  'quality',
  'quality-gate-checklist.template.json'
);
const qualityChecklistOutputPath = path.join(
  repoRoot,
  'ci-artifacts',
  'quality',
  'quality-gate-checklist.json'
);
const releaseManifestTemplatePath = path.join(
  repoRoot,
  'release',
  'evidence',
  'release-evidence-manifest.template.json'
);
const releaseManifestOutputPath = path.join(
  repoRoot,
  'release',
  'evidence',
  'release-evidence-manifest.json'
);
const androidDeviceMatrixTemplatePath = path.join(
  repoRoot,
  'ci-artifacts',
  'android',
  'device-matrix',
  'device-matrix.template.json'
);
const androidDeviceMatrixOutputPath = path.join(
  repoRoot,
  'ci-artifacts',
  'android',
  'device-matrix',
  'device-matrix.json'
);
const androidReleaseReadinessTemplatePath = path.join(
  repoRoot,
  'ci-artifacts',
  'android',
  'release-readiness',
  'release-readiness.template.json'
);
const androidReleaseReadinessOutputPath = path.join(
  repoRoot,
  'ci-artifacts',
  'android',
  'release-readiness',
  'release-readiness.json'
);
const androidProductionChecklistTemplatePath = path.join(
  repoRoot,
  'ci-artifacts',
  'android',
  'release-readiness',
  'production-candidate-checklist.template.json'
);
const androidProductionChecklistOutputPath = path.join(
  repoRoot,
  'ci-artifacts',
  'android',
  'release-readiness',
  'production-candidate-checklist.json'
);
const androidReleaseReadinessSourcePath = path.join(
  repoRoot,
  'android-aegis-temp',
  'docs',
  'RELEASE_READINESS.md'
);
const androidTranslationPolishEvidencePath = path.join(
  repoRoot,
  'docs',
  '2026-03-23_ANDROID_TRANSLATION_POLISH_TR.md'
);
const androidUiEncodingPolishEvidencePath = path.join(
  repoRoot,
  'docs',
  '2026-03-23_ANDROID_UI_ENCODING_POLISH_TR.md'
);
const androidStagedRolloutMonitoringEvidencePath = path.join(
  repoRoot,
  'docs',
  '2026-03-23_ANDROID_STAGED_ROLLOUT_MONITORING_TR.md'
);
const ownershipSummaryJsonPath = path.join(repoRoot, 'ci-artifacts', 'evidence-ownership.json');
const ownershipSummaryMdPath = path.join(repoRoot, 'ci-artifacts', 'evidence-ownership.md');
const evidenceGapsJsonPath = path.join(repoRoot, 'ci-artifacts', 'evidence-gaps.json');
const evidenceGapsMdPath = path.join(repoRoot, 'ci-artifacts', 'evidence-gaps.md');
const releaseSbomPath = path.join(repoRoot, 'release', 'aegis-release-sbom.json');
const releaseProvenancePath = path.join(repoRoot, 'release', 'aegis-release-provenance.json');
const releaseTrustSnapshotSourcePath = path.join(
  repoRoot,
  'src',
  'generated',
  'release-trust-snapshot.ts'
);

function readJsonIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function readFirstJson(paths) {
  for (const filePath of paths) {
    const parsed = readJsonIfExists(filePath);
    if (parsed) return parsed;
  }
  return null;
}

function readTextIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function summarizeVitest(report) {
  if (!report) return null;
  if (typeof report.numTotalTests === 'number') {
    const suites =
      typeof report.numTotalTestSuites === 'number'
        ? report.numTotalTestSuites
        : Array.isArray(report.testResults)
          ? report.testResults.length
          : 0;
    return {
      suites,
      passed: Number(report.numPassedTests || 0),
      failed: Number(report.numFailedTests || 0),
      success:
        typeof report.success === 'boolean'
          ? report.success
          : Number(report.numFailedTests || 0) === 0,
    };
  }
  const testResults = Array.isArray(report.testResults) ? report.testResults : [];
  let passed = 0;
  let failed = 0;
  for (const suite of testResults) {
    for (const assertion of suite.assertionResults || []) {
      if (assertion.status === 'passed') passed += 1;
      if (assertion.status === 'failed') failed += 1;
    }
  }
  const suites =
    typeof report.numTotalTestSuites === 'number' ? report.numTotalTestSuites : testResults.length;
  return {
    suites,
    passed,
    failed,
    success: typeof report.success === 'boolean' ? report.success : failed === 0,
  };
}

function summarizePlaywright(report) {
  if (!report) return null;
  if (report.stats && typeof report.stats.expected === 'number') {
    const passed = Number(report.stats.expected || 0);
    const failed = Number(report.stats.unexpected || 0) + Number(report.stats.flaky || 0);
    return {
      passed,
      failed,
      success: failed === 0 && passed > 0,
    };
  }
  let passed = 0;
  let failed = 0;
  const suites = Array.isArray(report.suites) ? report.suites : [];
  const visitSuites = (suiteList) => {
    for (const suite of suiteList) {
      for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
          const outcomes = Array.isArray(test.results) ? test.results : [];
          const hadPass = outcomes.some((item) => item.status === 'passed');
          const hadFail = outcomes.some(
            (item) => item.status === 'failed' || item.status === 'timedOut'
          );
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

function loadTemplate(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function hasPassLine(text, label) {
  if (!text) return false;
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`-\\s+\`${escaped}\`:\\s+PASS`, 'i').test(text);
}

function extractAndroidExecutiveStatus(text) {
  if (!text) return 'missing';
  const match = text.match(/Status:\s*(.+?)\./i);
  return match ? match[1].trim().toLowerCase().replace(/\s+/g, '_') : 'unknown';
}

function summarizeDeviceMatrixEntries(entries) {
  const list = Array.isArray(entries) ? entries : [];
  const statusCounts = {};
  let autofillPlanned = 0;
  let passkeyRecoveryPlanned = 0;
  for (const entry of list) {
    const status = entry?.status || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    const autofillGroup = entry?.validation_groups?.autofill;
    if (autofillGroup && Object.values(autofillGroup).some((value) => value === 'planned')) {
      autofillPlanned += 1;
    }
    const passkeyRecoveryGroup = entry?.validation_groups?.passkey_biometric_recovery;
    if (
      passkeyRecoveryGroup &&
      Object.values(passkeyRecoveryGroup).some((value) => value === 'planned')
    ) {
      passkeyRecoveryPlanned += 1;
    }
  }
  return {
    total: list.length,
    planned: statusCounts.planned || 0,
    in_progress: statusCounts.in_progress || 0,
    completed: statusCounts.completed || 0,
    blocked: statusCounts.blocked || 0,
    unknown: statusCounts.unknown || 0,
    autofill_validation_open: autofillPlanned,
    passkey_biometric_recovery_open: passkeyRecoveryPlanned,
  };
}

function toCheckResult(templateChecks, resolver) {
  return templateChecks.map((check) => ({
    ...check,
    ...resolver(check),
  }));
}

const unitReport = summarizeVitest(
  readFirstJson([
    path.join(testResultsDir, 'vitest-results.json'),
    path.join(vitestResultsDir, 'vitest-results.json'),
  ])
);
const importExportReport = summarizeVitest(
  readFirstJson([
    path.join(testResultsDir, 'import-export-regression.json'),
    path.join(vitestResultsDir, 'import-export-regression.json'),
  ])
);
const securityReport = summarizeVitest(
  readFirstJson([
    path.join(testResultsDir, 'security-regression.json'),
    path.join(vitestResultsDir, 'security-regression.json'),
  ])
);
const e2eReport = summarizePlaywright(readJsonIfExists(path.join(testResultsDir, 'results.json')));
const releaseReport = readJsonIfExists(path.join(reportDir, 'release-smoke.json'));
const releaseVerificationReport = readJsonIfExists(
  path.join(reportDir, 'release-verification.json')
);
const platformSigningReport = readJsonIfExists(
  path.join(reportDir, 'platform-signing-verification.json')
);
const androidReleaseReadinessSource = readTextIfExists(androidReleaseReadinessSourcePath);

const summary = {
  generatedAt: new Date().toISOString(),
  unit: unitReport,
  importExportRegression: importExportReport,
  securityRegression: securityReport,
  e2e: e2eReport,
  releaseSmoke: releaseReport,
  releaseVerification: releaseVerificationReport,
  platformSigning: platformSigningReport,
  extensionBuilds: {
    chrome: fileStatus(path.join(extensionDir, 'chrome-mv3', 'manifest.json')),
    firefox: fileStatus(path.join(extensionDir, 'firefox-mv3', 'manifest.json')),
  },
  nativeHost: {
    chromiumManifest: fileStatus(path.join(nativeHostDir, 'com.aegisvault.desktop.json')),
    firefoxManifest: fileStatus(path.join(nativeHostDir, 'com.aegisvault.desktop.firefox.json')),
    launcher: fileStatus(path.join(nativeHostDir, 'aegis-native-host-launcher.cmd')),
  },
};

const qualityChecklistTemplate = loadTemplate(qualityChecklistTemplatePath);
const releaseManifestTemplate = loadTemplate(releaseManifestTemplatePath);
const androidDeviceMatrixTemplate = loadTemplate(androidDeviceMatrixTemplatePath);
const androidReleaseReadinessTemplate = loadTemplate(androidReleaseReadinessTemplatePath);
const androidProductionChecklistTemplate = loadTemplate(androidProductionChecklistTemplatePath);

const qualityChecklist = qualityChecklistTemplate
  ? {
      generatedAt: summary.generatedAt,
      mode: qualityChecklistTemplate.mode || 'quality',
      checks: toCheckResult(qualityChecklistTemplate.checks || [], (check) => {
        if (check.id === 'unit') {
          return { status: summary.unit?.success ? 'passed' : 'missing_or_failed' };
        }
        if (check.id === 'import_export_regression') {
          return {
            status: summary.importExportRegression?.success ? 'passed' : 'missing_or_failed',
          };
        }
        if (check.id === 'security_regression') {
          return { status: summary.securityRegression?.success ? 'passed' : 'missing_or_failed' };
        }
        if (check.id === 'e2e') {
          return {
            status: summary.e2e ? (summary.e2e.success ? 'passed' : 'failed') : 'optional_missing',
          };
        }
        if (check.id === 'extension_builds') {
          const ok =
            summary.extensionBuilds.chrome.exists && summary.extensionBuilds.firefox.exists;
          return { status: ok ? 'passed' : 'missing_or_failed' };
        }
        if (check.id === 'native_host') {
          const ok =
            summary.nativeHost.chromiumManifest.exists &&
            summary.nativeHost.firefoxManifest.exists &&
            summary.nativeHost.launcher.exists;
          return { status: ok ? 'passed' : 'missing_or_failed' };
        }
        return { status: 'unknown' };
      }),
    }
  : null;

const releaseEvidenceManifest = releaseManifestTemplate
  ? {
      generatedAt: summary.generatedAt,
      mode: releaseManifestTemplate.mode || 'release',
      checks: toCheckResult(releaseManifestTemplate.checks || [], (check) => {
        if (check.id === 'release_smoke') {
          return { status: summary.releaseSmoke?.ok ? 'passed' : 'missing_or_failed' };
        }
        if (check.id === 'release_verification') {
          return { status: summary.releaseVerification?.ok ? 'passed' : 'missing_or_failed' };
        }
        if (check.id === 'platform_signing') {
          return { status: summary.platformSigning?.ok ? 'passed' : 'missing_or_failed' };
        }
        if (check.id === 'sbom') {
          return { status: fs.existsSync(releaseSbomPath) ? 'passed' : 'manual_or_release_only' };
        }
        if (check.id === 'provenance') {
          return {
            status: fs.existsSync(releaseProvenancePath) ? 'passed' : 'manual_or_release_only',
          };
        }
        return { status: 'unknown' };
      }),
    }
  : null;

const androidDeviceMatrix = androidDeviceMatrixTemplate
  ? {
      generatedAt: summary.generatedAt,
      platform: androidDeviceMatrixTemplate.platform || 'android',
      completion_criteria: androidDeviceMatrixTemplate.completion_criteria || null,
      dimensions: androidDeviceMatrixTemplate.dimensions || [],
      entries: androidDeviceMatrixTemplate.entries || [],
      summary: summarizeDeviceMatrixEntries(androidDeviceMatrixTemplate.entries || []),
      coverageStatus: !androidReleaseReadinessSource
        ? 'missing_source'
        : summarizeDeviceMatrixEntries(androidDeviceMatrixTemplate.entries || []).completed >= 3
          ? 'minimum_target_met'
          : 'planned_expansion_required',
      source: androidReleaseReadinessSource
        ? 'android-aegis-temp/docs/RELEASE_READINESS.md'
        : 'missing',
      notes: androidReleaseReadinessSource
        ? summarizeDeviceMatrixEntries(androidDeviceMatrixTemplate.entries || []).completed >= 3
          ? [
              'Controlled beta readiness source bulundu.',
              'Minimum cihaz matrisi hedefi tamamlandi.',
            ]
          : [
              'Controlled beta readiness source bulundu.',
              'Genis cihaz matrisi kapsami Faz 3 icinde hala tamamlanmali.',
            ]
        : ['Android release readiness kaynagi bulunamadi.'],
    }
  : null;

const androidReleaseReadiness = androidReleaseReadinessTemplate
  ? {
      generatedAt: summary.generatedAt,
      platform: androidReleaseReadinessTemplate.platform || 'android',
      executiveStatus: extractAndroidExecutiveStatus(androidReleaseReadinessSource),
      source: androidReleaseReadinessSource
        ? 'android-aegis-temp/docs/RELEASE_READINESS.md'
        : 'missing',
      checklist: toCheckResult(androidReleaseReadinessTemplate.checklist || [], (check) => {
        if (check.id === 'unit_tests') {
          return {
            status: hasPassLine(androidReleaseReadinessSource, 'npm test -- --runInBand')
              ? 'passed'
              : 'missing_or_failed',
          };
        }
        if (check.id === 'typescript') {
          return {
            status: hasPassLine(androidReleaseReadinessSource, 'npx tsc --noEmit')
              ? 'passed'
              : 'missing_or_failed',
          };
        }
        if (check.id === 'assemble_release') {
          return {
            status: hasPassLine(androidReleaseReadinessSource, ':app:assembleRelease')
              ? 'passed'
              : 'missing_or_failed',
          };
        }
        if (check.id === 'real_device_install') {
          return {
            status: /Real device install via `adb install -r`: PASS/i.test(
              androidReleaseReadinessSource || ''
            )
              ? 'passed'
              : 'missing_or_failed',
          };
        }
        if (check.id === 'device_matrix') {
          return {
            status:
              androidDeviceMatrix?.coverageStatus === 'minimum_target_met'
                ? 'passed'
                : androidDeviceMatrix && androidDeviceMatrix.summary.total > 0
                  ? 'planned_expansion_required'
                  : 'missing_or_failed',
          };
        }
        return { status: 'unknown' };
      }),
    }
  : null;

const androidProductionCandidateChecklist = androidProductionChecklistTemplate
  ? {
      generatedAt: summary.generatedAt,
      platform: androidProductionChecklistTemplate.platform || 'android',
      source: androidReleaseReadinessSource
        ? 'android-aegis-temp/docs/RELEASE_READINESS.md'
        : 'missing',
      checklist: toCheckResult(androidProductionChecklistTemplate.checklist || [], (check) => {
        if (check.id === 'controlled_beta_readiness') {
          return {
            status:
              extractAndroidExecutiveStatus(androidReleaseReadinessSource) ===
              'ready_for_controlled_beta_release'
                ? 'passed'
                : 'missing_or_failed',
          };
        }
        if (check.id === 'device_matrix_completed') {
          return {
            status:
              androidDeviceMatrix?.coverageStatus === 'minimum_target_met'
                ? 'passed'
                : androidDeviceMatrix?.coverageStatus === 'planned_expansion_required'
                  ? 'planned_expansion_required'
                  : 'passed',
          };
        }
        if (check.id === 'autofill_browser_validation') {
          return {
            status:
              androidDeviceMatrix?.summary?.autofill_validation_open === 0
                ? 'passed'
                : 'planned_manual_validation',
          };
        }
        if (check.id === 'autofill_native_app_validation') {
          const nativeAppOpen = (androidDeviceMatrix?.entries || []).some(
            (entry) => entry?.validation_groups?.autofill?.native_app_login !== 'completed'
          );
          return { status: nativeAppOpen ? 'planned_manual_validation' : 'passed' };
        }
        if (check.id === 'passkey_biometric_recovery_validation') {
          return {
            status:
              androidDeviceMatrix?.summary?.passkey_biometric_recovery_open === 0
                ? 'passed'
                : 'planned_manual_validation',
          };
        }
        if (check.id === 'encoding_polish_ui') {
          return {
            status: fs.existsSync(androidUiEncodingPolishEvidencePath)
              ? 'passed'
              : /legacy encoding artifacts/i.test(androidReleaseReadinessSource || '')
                ? 'known_followup_required'
                : 'passed',
          };
        }
        if (check.id === 'translation_polish') {
          return {
            status: fs.existsSync(androidTranslationPolishEvidencePath)
              ? 'passed'
              : 'planned_translation_polish',
          };
        }
        if (check.id === 'staged_rollout_plan') {
          return {
            status: /Stage rollout with monitoring/i.test(androidReleaseReadinessSource || '')
              ? 'passed'
              : 'missing_or_failed',
          };
        }
        if (check.id === 'staged_rollout_monitoring') {
          return {
            status: fs.existsSync(androidStagedRolloutMonitoringEvidencePath)
              ? 'passed'
              : /Stage rollout with monitoring/i.test(androidReleaseReadinessSource || '')
                ? 'planned_rollout_followup'
                : 'missing_or_failed',
          };
        }
        return { status: 'unknown' };
      }),
    }
  : null;

const ownershipMap = new Map();
for (const check of qualityChecklist?.checks || []) {
  const current = ownershipMap.get(check.owner) || [];
  current.push({
    id: check.id,
    mode: 'quality',
    required: Boolean(check.required),
    status: check.status,
    artifact: check.artifact,
  });
  ownershipMap.set(check.owner, current);
}
for (const check of releaseEvidenceManifest?.checks || []) {
  const current = ownershipMap.get(check.owner) || [];
  current.push({
    id: check.id,
    mode: 'release',
    required: Boolean(check.required),
    status: check.status,
    artifact: check.artifact,
  });
  ownershipMap.set(check.owner, current);
}
for (const check of androidReleaseReadiness?.checklist || []) {
  const current = ownershipMap.get(check.owner) || [];
  current.push({
    id: check.id,
    mode: 'android_release_readiness',
    required: Boolean(check.required),
    status: check.status,
    artifact: check.artifact,
  });
  ownershipMap.set(check.owner, current);
}
for (const check of androidProductionCandidateChecklist?.checklist || []) {
  const current = ownershipMap.get(check.owner) || [];
  current.push({
    id: check.id,
    mode: 'android_production_candidate',
    required: Boolean(check.required),
    status: check.status,
    artifact: check.artifact,
  });
  ownershipMap.set(check.owner, current);
}

const ownershipSummary = {
  generatedAt: summary.generatedAt,
  owners: Array.from(ownershipMap.entries()).map(([owner, checks]) => ({
    owner,
    checks,
  })),
};

const evidenceGaps = {
  generatedAt: summary.generatedAt,
  gaps: [
    ...(qualityChecklist?.checks || [])
      .filter((check) => check.status !== 'passed')
      .map((check) => ({
        id: check.id,
        mode: 'quality',
        owner: check.owner,
        required: Boolean(check.required),
        status: check.status,
        artifact: check.artifact,
      })),
    ...(releaseEvidenceManifest?.checks || [])
      .filter((check) => check.status !== 'passed')
      .map((check) => ({
        id: check.id,
        mode: 'release',
        owner: check.owner,
        required: Boolean(check.required),
        status: check.status,
        artifact: check.artifact,
      })),
    ...(androidReleaseReadiness?.checklist || [])
      .filter((check) => check.status !== 'passed')
      .map((check) => ({
        id: check.id,
        mode: 'android_release_readiness',
        owner: check.owner,
        required: Boolean(check.required),
        status: check.status,
        artifact: check.artifact,
      })),
    ...(androidProductionCandidateChecklist?.checklist || [])
      .filter((check) => check.status !== 'passed')
      .map((check) => ({
        id: check.id,
        mode: 'android_production_candidate',
        owner: check.owner,
        required: Boolean(check.required),
        status: check.status,
        artifact: check.artifact,
      })),
  ],
};

const lines = [
  '# Aegis Vault CI Quality Summary',
  '# Aegis Vault CI Kalite Ozeti',
  '',
  `Generated / Uretim Zamanı: ${summary.generatedAt}`,
  '',
  '## Unit / Birim Testleri',
  unitReport
    ? `Passed / Gecti: ${unitReport.passed}, Failed / Hatali: ${unitReport.failed}, Suites / Paketler: ${unitReport.suites}`
    : 'No unit report found / Birim test raporu bulunamadi.',
  '',
  '## Import-Export Regression / Import-Export Regresyonu',
  importExportReport
    ? `Passed / Gecti: ${importExportReport.passed}, Failed / Hatali: ${importExportReport.failed}, Suites / Paketler: ${importExportReport.suites}`
    : 'No import-export regression report found / Import-export regresyon raporu bulunamadi.',
  '',
  '## Security Regression / Guvenlik Regresyonu',
  securityReport
    ? `Passed / Gecti: ${securityReport.passed}, Failed / Hatali: ${securityReport.failed}, Suites / Paketler: ${securityReport.suites}`
    : 'No security regression report found / Guvenlik regresyon raporu bulunamadi.',
  '',
  '## E2E',
  e2eReport
    ? `Passed / Gecti: ${e2eReport.passed}, Failed / Hatali: ${e2eReport.failed}`
    : 'No Playwright report found / Playwright raporu bulunamadi.',
  '',
  '## Extension Builds / Eklenti Buildleri',
  `Chrome MV3: ${summary.extensionBuilds.chrome.exists ? 'OK' : 'MISSING'}`,
  `Firefox MV3: ${summary.extensionBuilds.firefox.exists ? 'OK' : 'MISSING'}`,
  '',
  '## Native Host / Yerel Host',
  `Chromium manifest: ${summary.nativeHost.chromiumManifest.exists ? 'OK' : 'MISSING'}`,
  `Firefox manifest: ${summary.nativeHost.firefoxManifest.exists ? 'OK' : 'MISSING'}`,
  `Launcher: ${summary.nativeHost.launcher.exists ? 'OK' : 'MISSING'}`,
  '',
  '## Release Smoke / Yayin Duman Testi',
  releaseReport
    ? `OK: ${releaseReport.ok}, Installers / Paketler: ${(releaseReport.installers || []).length}`
    : 'No release smoke report found / Release smoke raporu bulunamadi.',
  '',
  '## Release Trust Chain / Yayin Guven Zinciri',
  releaseVerificationReport
    ? `OK: ${releaseVerificationReport.ok}, Signature / Imza: ${releaseVerificationReport.signatureStatus || 'unknown'}`
    : 'No release verification report found / Release dogrulama raporu bulunamadi.',
  '',
  '## Platform Signing / Platform Imzalari',
  platformSigningReport
    ? `OK: ${platformSigningReport.ok}, Mode / Mod: ${platformSigningReport.mode || 'unknown'}`
    : 'No platform signing report found / Platform imza raporu bulunamadi.',
  '',
  '## Android Release Readiness',
  androidReleaseReadiness
    ? `Status: ${androidReleaseReadiness.executiveStatus}, Device Matrix: ${
        androidReleaseReadiness.checklist.find((check) => check.id === 'device_matrix')?.status ||
        'unknown'
      }`
    : 'No Android release readiness manifest generated / Android release readiness manifesti uretilmedi.',
  '',
  '## Android Device Matrix',
  androidDeviceMatrix
    ? `Coverage Status: ${androidDeviceMatrix.coverageStatus}, Entries: ${androidDeviceMatrix.entries.length}, Planned: ${androidDeviceMatrix.summary.planned}, Completed: ${androidDeviceMatrix.summary.completed}, Autofill Open: ${androidDeviceMatrix.summary.autofill_validation_open}, Passkey/Recovery Open: ${androidDeviceMatrix.summary.passkey_biometric_recovery_open}`
    : 'No Android device matrix manifest generated / Android device matrix manifesti uretilmedi.',
  '',
  '## Android Production Candidate',
  androidProductionCandidateChecklist
    ? `Checklist Items: ${androidProductionCandidateChecklist.checklist.length}, Open Follow-ups: ${
        androidProductionCandidateChecklist.checklist.filter((check) => check.status !== 'passed')
          .length
      }`
    : "No Android production candidate checklist generated / Android production candidate checklist'i uretilmedi.",
  '',
  '## Evidence Ownership / Evidence Sahipligi',
  ...ownershipSummary.owners.flatMap((ownerEntry) => [
    `- ${ownerEntry.owner}: ${ownerEntry.checks.map((check) => `${check.id} [${check.status}]`).join(', ')}`,
  ]),
  '',
  '## Evidence Gaps / Evidence Bosluklari',
  ...(evidenceGaps.gaps.length
    ? evidenceGaps.gaps.map(
        (gap) =>
          `- ${gap.mode}.${gap.id}: ${gap.status} -> owner=${gap.owner}, required=${gap.required}, artifact=${gap.artifact}`
      )
    : ['- none / yok']),
  '',
];

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(
  path.join(reportDir, 'quality-summary.json'),
  JSON.stringify(summary, null, 2),
  'utf8'
);
fs.writeFileSync(path.join(reportDir, 'quality-summary.md'), lines.join('\n'), 'utf8');
if (qualityChecklist) {
  fs.writeFileSync(qualityChecklistOutputPath, JSON.stringify(qualityChecklist, null, 2), 'utf8');
}
if (releaseEvidenceManifest) {
  fs.writeFileSync(
    releaseManifestOutputPath,
    JSON.stringify(releaseEvidenceManifest, null, 2),
    'utf8'
  );
}
if (androidDeviceMatrix) {
  fs.writeFileSync(
    androidDeviceMatrixOutputPath,
    JSON.stringify(androidDeviceMatrix, null, 2),
    'utf8'
  );
}
if (androidReleaseReadiness) {
  fs.writeFileSync(
    androidReleaseReadinessOutputPath,
    JSON.stringify(androidReleaseReadiness, null, 2),
    'utf8'
  );
}
if (androidProductionCandidateChecklist) {
  fs.writeFileSync(
    androidProductionChecklistOutputPath,
    JSON.stringify(androidProductionCandidateChecklist, null, 2),
    'utf8'
  );
}
fs.writeFileSync(ownershipSummaryJsonPath, JSON.stringify(ownershipSummary, null, 2), 'utf8');
fs.writeFileSync(
  ownershipSummaryMdPath,
  [
    '# Aegis Vault Evidence Ownership',
    '',
    `Generated: ${summary.generatedAt}`,
    '',
    ...ownershipSummary.owners.flatMap((ownerEntry) => [
      `## ${ownerEntry.owner}`,
      ...ownerEntry.checks.map(
        (check) => `- ${check.mode}.${check.id}: ${check.status} -> ${check.artifact}`
      ),
      '',
    ]),
  ].join('\n'),
  'utf8'
);
fs.writeFileSync(evidenceGapsJsonPath, JSON.stringify(evidenceGaps, null, 2), 'utf8');
fs.writeFileSync(
  evidenceGapsMdPath,
  [
    '# Aegis Vault Evidence Gaps',
    '',
    `Generated: ${summary.generatedAt}`,
    '',
    ...(evidenceGaps.gaps.length
      ? evidenceGaps.gaps.flatMap((gap) => [
          `- ${gap.mode}.${gap.id}: ${gap.status} -> ${gap.artifact} (${gap.owner})`,
        ])
      : ['- none']),
    '',
  ].join('\n'),
  'utf8'
);

const releaseTrustSnapshotSource = `export interface ReleaseTrustSnapshotCheck {
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

export const RELEASE_TRUST_SNAPSHOT: ReleaseTrustSnapshot = ${JSON.stringify(
  {
    generatedAt: summary.generatedAt,
    qualityGeneratedAt: summary.generatedAt,
    releaseChecks: releaseEvidenceManifest ? releaseEvidenceManifest.checks : [],
    auditReadyDocs: [
      {
        id: 'external_audit_prep',
        path: 'guvenlik/EXTERNAL_AUDIT_PREP.md',
        exists: fs.existsSync(path.join(repoRoot, 'guvenlik', 'EXTERNAL_AUDIT_PREP.md')),
      },
      {
        id: 'threat_model',
        path: 'guvenlik/THREAT_MODEL.md',
        exists: fs.existsSync(path.join(repoRoot, 'guvenlik', 'THREAT_MODEL.md')),
      },
      {
        id: 'security_whitepaper',
        path: 'guvenlik/SECURITY_WHITEPAPER.md',
        exists: fs.existsSync(path.join(repoRoot, 'guvenlik', 'SECURITY_WHITEPAPER.md')),
      },
      {
        id: 'evidence_ownership',
        path: 'ci-artifacts/evidence-ownership.md',
        exists: fs.existsSync(path.join(repoRoot, 'ci-artifacts', 'evidence-ownership.md')),
      },
    ],
    evidenceGaps: evidenceGaps.gaps.filter((gap) => gap.mode === 'release'),
  },
  null,
  2
)};
`;
fs.mkdirSync(path.dirname(releaseTrustSnapshotSourcePath), { recursive: true });
fs.writeFileSync(releaseTrustSnapshotSourcePath, releaseTrustSnapshotSource, 'utf8');
console.log(`[ci-report] summary written to ${path.join(reportDir, 'quality-summary.md')}`);

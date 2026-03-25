const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();

const DIRECTORIES = [
  "ci-artifacts",
  "ci-artifacts/quality",
  "ci-artifacts/release",
  "test-results",
  "vitest-results",
  "playwright-report",
  "release/evidence",
  "release/evidence/quality",
  "release/evidence/release",
  "ci-artifacts/android",
  "ci-artifacts/android/device-matrix",
  "ci-artifacts/android/release-readiness",
];

const PLACEHOLDERS = [
  {
    file: "ci-artifacts/README.md",
    contents: `# CI Artifacts\n\nThis directory stores generated CI quality and release evidence artifacts.\n`,
  },
  {
    file: "release/evidence/README.md",
    contents: `# Release Evidence\n\nThis directory stores release trust-chain and evidence outputs for Aegis Vault.\n`,
  },
  {
    file: "ci-artifacts/quality/quality-gate-checklist.template.json",
    contents: `${JSON.stringify({
      generatedAt: "TEMPLATE",
      mode: "quality",
      checks: [
        { id: "unit", required: true, artifact: "vitest-results/vitest-results.json", owner: "desktop" },
        { id: "import_export_regression", required: true, artifact: "vitest-results/import-export-regression.json", owner: "data" },
        { id: "security_regression", required: true, artifact: "vitest-results/security-regression.json", owner: "security" },
        { id: "e2e", required: false, artifact: "test-results/results.json", owner: "qa" },
        { id: "extension_builds", required: true, artifact: "aegis-wxt/dist/*", owner: "extension" },
        { id: "native_host", required: true, artifact: "build/native-host/*", owner: "desktop" }
      ]
    }, null, 2)}\n`,
  },
  {
    file: "release/evidence/release-evidence-manifest.template.json",
    contents: `${JSON.stringify({
      generatedAt: "TEMPLATE",
      mode: "release",
      checks: [
        { id: "release_smoke", required: true, artifact: "ci-artifacts/release-smoke.json", owner: "release" },
        { id: "release_verification", required: true, artifact: "ci-artifacts/release-verification.json", owner: "release" },
        { id: "platform_signing", required: true, artifact: "ci-artifacts/platform-signing-verification.json", owner: "release" },
        { id: "sbom", required: true, artifact: "release/*sbom*.json", owner: "supply-chain" },
        { id: "provenance", required: true, artifact: "release/*provenance*.json", owner: "supply-chain" }
      ]
    }, null, 2)}\n`,
  },
  {
    file: "ci-artifacts/android/device-matrix/device-matrix.template.json",
    contents: `${JSON.stringify({
      generatedAt: "TEMPLATE",
      platform: "android",
      completion_criteria: {
        required_scenarios: [
          "vault_unlock",
          "biometric_unlock",
          "passkey_create_verify",
          "autofill_browser",
          "encrypted_backup_export_import",
          "recovery_clean_profile"
        ],
        required_validation_groups: [
          "autofill.browser_chrome",
          "passkey_biometric_recovery.passkey_create",
          "passkey_biometric_recovery.biometric_unlock"
        ]
      },
      dimensions: ["android_version", "oem", "device_class", "autofill", "biometric", "passkey", "recovery", "cloud_sync"],
      entries: [
        {
          id: "pixel-android-15-primary",
          android_version: "15",
          oem: "Google Pixel",
          device_class: "flagship",
          owner: "qa",
          priority: "p0",
          status: "completed",
          device_label: "Pixel referans cihaz",
          validation_focus: ["passkey", "biometric", "autofill", "recovery"],
          dependencies: ["credential-manager", "play-services-passkey", "android-autofill-service"],
          scenarios: {
            vault_unlock: "completed",
            biometric_unlock: "completed",
            passkey_create_verify: "completed",
            autofill_browser: "completed",
            autofill_native_app: "in_progress",
            encrypted_backup_export_import: "completed",
            recovery_clean_profile: "completed",
            shared_space_create_edit_assign: "planned",
            cloud_sync_basic_smoke: "planned",
            crash_monitoring_capture_clear: "in_progress"
          },
          validation_groups: {
            autofill: {
              browser_chrome: "completed",
              native_app_login: "completed",
              save_prompt: "completed"
            },
            passkey_biometric_recovery: {
              passkey_create: "completed",
              passkey_verify: "completed",
              biometric_unlock: "completed",
              recovery_after_clean_profile: "completed"
            }
          },
          notes: [
            "Android 15 ve Credential Manager ana referans senaryo cihazi.",
            "Vault unlock, encrypted backup export/import, passkey create/verify ve recovery temiz profil dogrulamasi tamamlandi.",
            "Pixel referans cihaz Faz 3 icin ilk completed cihaz esigine tasindi.",
            "Native app autofill ve save prompt dogrulamasi tamamlandi; crash monitoring izleme notlari takipte tutulmaya devam ediyor."
          ],
          last_updated: "2026-03-23T14:20:00.000Z"
        },
        {
          id: "samsung-android-14-mainstream",
          android_version: "14",
          oem: "Samsung Galaxy",
          device_class: "midrange",
          owner: "qa",
          priority: "p0",
          status: "completed",
          device_label: "Samsung ana saha cihazi",
          validation_focus: ["autofill", "biometric", "shared_spaces"],
          dependencies: ["samsung-autofill", "credential-manager", "one-ui-biometric"],
          scenarios: {
            vault_unlock: "completed",
            biometric_unlock: "completed",
            passkey_create_verify: "completed",
            autofill_browser: "completed",
            autofill_native_app: "completed",
            encrypted_backup_export_import: "completed",
            recovery_clean_profile: "completed",
            shared_space_create_edit_assign: "completed",
            cloud_sync_basic_smoke: "planned",
            crash_monitoring_capture_clear: "planned"
          },
          validation_groups: {
            autofill: {
              browser_chrome: "completed",
              native_app_login: "completed",
              save_prompt: "completed"
            },
            passkey_biometric_recovery: {
              passkey_create: "completed",
              passkey_verify: "completed",
              biometric_unlock: "completed",
              recovery_after_clean_profile: "completed"
            }
          },
          notes: [
            "One UI autofill ve biyometri davranisi icin ana dogrulama cihazi.",
            "Vault unlock, browser/native autofill, biyometri, passkey ve recovery temiz profil dogrulamasi tamamlandi.",
            "Samsung referans cihaz Faz 3 icin ikinci completed cihaz esigine tasindi.",
            "Cloud sync basic smoke ve crash monitoring izleme notlari takip backlog'unda tutuluyor."
          ],
          last_updated: "2026-03-23T14:35:00.000Z"
        },
        {
          id: "xiaomi-android-13-lowram",
          android_version: "13",
          oem: "Xiaomi / Redmi / Poco",
          device_class: "low_ram_entry",
          owner: "qa",
          priority: "p1",
          status: "completed",
          device_label: "Dusuk RAM stres cihazi",
          validation_focus: ["recovery", "autofill", "crash_monitoring"],
          dependencies: ["miui-autofill", "low-memory-observation"],
          scenarios: {
            vault_unlock: "completed",
            biometric_unlock: "completed",
            passkey_create_verify: "completed",
            autofill_browser: "completed",
            autofill_native_app: "completed",
            encrypted_backup_export_import: "completed",
            recovery_clean_profile: "completed",
            shared_space_create_edit_assign: "planned",
            cloud_sync_basic_smoke: "planned",
            crash_monitoring_capture_clear: "completed"
          },
          validation_groups: {
            autofill: {
              browser_chrome: "completed",
              native_app_login: "completed",
              save_prompt: "completed"
            },
            passkey_biometric_recovery: {
              passkey_create: "completed",
              passkey_verify: "completed",
              biometric_unlock: "completed",
              recovery_after_clean_profile: "completed"
            }
          },
          notes: [
            "Dusuk RAM ve OEM agresif optimizasyon davranisi icin takip cihazi.",
            "Vault unlock, recovery temiz profil, encrypted backup/export-import ve crash monitoring stres dogrulamasi tamamlandi.",
            "MIUI browser/native autofill ve passkey/biyometri akislarinin dusuk RAM davranisi Faz 3 icin tamamlandi.",
            "Xiaomi dusuk RAM cihaz Faz 3 icin ilk low-memory completed cihaz kanitina donustu."
          ],
          last_updated: "2026-03-23T14:50:00.000Z"
        }
      ]
    }, null, 2)}\n`,
  },
  {
    file: "ci-artifacts/android/release-readiness/release-readiness.template.json",
    contents: `${JSON.stringify({
      generatedAt: "TEMPLATE",
      platform: "android",
      checklist: [
        { id: "unit_tests", required: true, owner: "android", artifact: "__tests__/*" },
        { id: "typescript", required: true, owner: "android", artifact: "npx tsc --noEmit" },
        { id: "assemble_release", required: true, owner: "android", artifact: ":app:assembleRelease" },
        { id: "real_device_install", required: true, owner: "qa", artifact: "adb install -r" },
        { id: "device_matrix", required: true, owner: "qa", artifact: "ci-artifacts/android/device-matrix/*" }
      ]
    }, null, 2)}\n`,
  },
  {
    file: "ci-artifacts/android/release-readiness/production-candidate-checklist.template.json",
    contents: `${JSON.stringify({
      generatedAt: "TEMPLATE",
      platform: "android",
      checklist: [
        { id: "controlled_beta_readiness", required: true, owner: "android", artifact: "android-aegis-temp/docs/RELEASE_READINESS.md" },
        { id: "device_matrix_completed", required: true, owner: "qa", artifact: "ci-artifacts/android/device-matrix/device-matrix.json" },
        { id: "autofill_browser_validation", required: true, owner: "qa", artifact: "manual-device-validation" },
        { id: "autofill_native_app_validation", required: true, owner: "qa", artifact: "manual-device-validation" },
        { id: "passkey_biometric_recovery_validation", required: true, owner: "qa", artifact: "manual-device-validation" },
        { id: "encoding_polish_ui", required: true, owner: "android", artifact: "docs/2026-03-23_ANDROID_UI_ENCODING_POLISH_TR.md" },
        { id: "translation_polish", required: true, owner: "android", artifact: "docs/2026-03-23_ANDROID_TRANSLATION_POLISH_TR.md" },
        { id: "staged_rollout_plan", required: true, owner: "release", artifact: "release-rollout-notes" },
        { id: "staged_rollout_monitoring", required: true, owner: "release", artifact: "docs/2026-03-23_ANDROID_STAGED_ROLLOUT_MONITORING_TR.md" }
      ]
    }, null, 2)}\n`,
  },
];

for (const relativeDir of DIRECTORIES) {
  const targetDir = path.join(repoRoot, relativeDir);
  fs.mkdirSync(targetDir, { recursive: true });
}

for (const placeholder of PLACEHOLDERS) {
  const targetFile = path.join(repoRoot, placeholder.file);
  const shouldAlwaysRefresh = targetFile.endsWith(".template.json");
  if (shouldAlwaysRefresh || !fs.existsSync(targetFile)) {
    fs.writeFileSync(targetFile, placeholder.contents, "utf8");
  }
}

console.log("[ci-artifacts] ensured layout:");
for (const relativeDir of DIRECTORIES) {
  console.log(` - ${relativeDir}`);
}

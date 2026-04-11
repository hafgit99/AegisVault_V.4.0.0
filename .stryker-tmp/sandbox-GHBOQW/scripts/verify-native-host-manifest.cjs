// @ts-nocheck
const fs = require('fs');
const path = require('path');

const hostName = process.env.AEGIS_NATIVE_HOST_NAME || 'com.aegisvault.desktop';
const outputDir = path.resolve(process.cwd(), 'build', 'native-host');
const chromiumManifestPath = path.resolve(outputDir, `${hostName}.json`);
const firefoxManifestPath = path.resolve(outputDir, `${hostName}.firefox.json`);
const launcherPath = path.resolve(outputDir, 'aegis-native-host-launcher.cmd');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`Missing file: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const chromiumManifest = readJson(chromiumManifestPath);
const firefoxManifest = readJson(firefoxManifestPath);

if (!fs.existsSync(launcherPath)) {
  fail(`Missing launcher: ${launcherPath}`);
}

if (chromiumManifest.name !== hostName) {
  fail('Chromium manifest host name mismatch');
}

if (firefoxManifest.name !== hostName) {
  fail('Firefox manifest host name mismatch');
}

if (chromiumManifest.path !== launcherPath) {
  fail('Chromium manifest launcher path mismatch');
}

if (firefoxManifest.path !== launcherPath) {
  fail('Firefox manifest launcher path mismatch');
}

if (
  !Array.isArray(chromiumManifest.allowed_origins) ||
  chromiumManifest.allowed_origins.length === 0
) {
  fail('Chromium manifest allowed_origins missing');
}

if (
  !Array.isArray(firefoxManifest.allowed_extensions) ||
  firefoxManifest.allowed_extensions.length === 0
) {
  fail('Firefox manifest allowed_extensions missing');
}

const launcherContent = fs.readFileSync(launcherPath, 'utf8');
if (!launcherContent.includes('aegis-native-host.cjs')) {
  fail('Launcher does not reference aegis-native-host.cjs');
}
if (!launcherContent.includes('AEGIS_EXTENSION_ALLOWLIST=')) {
  fail('Launcher does not inject AEGIS_EXTENSION_ALLOWLIST');
}
if (!launcherContent.includes('AEGIS_STRICT_ALLOWLIST_MODE=1')) {
  fail('Launcher does not enforce strict allowlist mode');
}

console.log('Native host manifests verified successfully.');

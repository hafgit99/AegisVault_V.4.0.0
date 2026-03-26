// @ts-nocheck
const fs = require('fs');
const path = require('path');

const hostName = process.env.AEGIS_NATIVE_HOST_NAME || 'com.aegisvault.desktop';
const defaultChromiumDevExtensionIdPath = path.resolve(
  process.cwd(),
  'aegis-wxt',
  'dev',
  'chromium-extension-id.txt'
);
const defaultChromiumDevExtensionId = fs.existsSync(defaultChromiumDevExtensionIdPath)
  ? fs.readFileSync(defaultChromiumDevExtensionIdPath, 'utf8').trim()
  : '';
const extensionIds = (
  process.env.AEGIS_EXTENSION_ALLOWLIST ||
  process.env.AEGIS_EXTENSION_ID ||
  ''
)
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);
if (defaultChromiumDevExtensionId && !extensionIds.includes(defaultChromiumDevExtensionId)) {
  extensionIds.push(defaultChromiumDevExtensionId);
}
const firefoxExtensionIds = (
  process.env.AEGIS_FIREFOX_EXTENSION_ALLOWLIST ||
  process.env.AEGIS_FIREFOX_EXTENSION_ID ||
  'aegisvault@example.com'
)
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);
const combinedAllowlist = [...new Set([...extensionIds, ...firefoxExtensionIds])];

const scriptPath = path.resolve(process.cwd(), 'scripts', 'aegis-native-host.cjs');
const outputDir = path.resolve(process.cwd(), 'build', 'native-host');

if (extensionIds.length === 0) {
  console.error(
    'No extension ids configured. Set AEGIS_EXTENSION_ALLOWLIST or AEGIS_EXTENSION_ID, or provide aegis-wxt/dev/chromium-extension-id.txt.'
  );
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

const chromiumManifest = {
  name: hostName,
  description: 'Aegis Vault native messaging bridge',
  path: process.execPath,
  type: 'stdio',
  allowed_origins: extensionIds.map((id) => `chrome-extension://${id}/`),
};

const chromiumWrapper = path.resolve(outputDir, 'aegis-native-host-launcher.cmd');
fs.writeFileSync(
  chromiumWrapper,
  `@echo off\r\nsetlocal\r\nset "AEGIS_EXTENSION_ALLOWLIST=${combinedAllowlist.join(',')}"\r\nset "AEGIS_STRICT_ALLOWLIST_MODE=1"\r\n"${process.execPath}" "${scriptPath}"\r\n`,
  'utf8'
);
chromiumManifest.path = chromiumWrapper;

const manifestPath = path.resolve(outputDir, `${hostName}.json`);
fs.writeFileSync(manifestPath, JSON.stringify(chromiumManifest, null, 2), 'utf8');

const firefoxManifest = {
  name: hostName,
  description: 'Aegis Vault native messaging bridge',
  path: chromiumWrapper,
  type: 'stdio',
  allowed_extensions: firefoxExtensionIds,
};

const firefoxManifestPath = path.resolve(outputDir, `${hostName}.firefox.json`);
fs.writeFileSync(firefoxManifestPath, JSON.stringify(firefoxManifest, null, 2), 'utf8');

console.log(`Native host manifest written to ${manifestPath}`);
console.log(`Firefox native host manifest written to ${firefoxManifestPath}`);
console.log(`Launcher written to ${chromiumWrapper}`);

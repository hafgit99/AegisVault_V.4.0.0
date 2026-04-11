// @ts-nocheck
module.exports = {
  appId: 'com.aegis.vault',
  productName: 'Aegis Vault',
  asar: true,
  files: ['dist/**/*', 'electron-main.cjs', 'preload.cjs'],
  extraResources: [
    {
      from: 'scripts/aegis-native-host.ps1',
      to: 'native-host/aegis-native-host.ps1',
    },
    {
      from: 'scripts/install-native-host.ps1',
      to: 'native-host/install-native-host.ps1',
    },
    {
      from: 'scripts/unregister-native-host.ps1',
      to: 'native-host/unregister-native-host.ps1',
    },
  ],
  directories: {
    output: process.env.AEGIS_ELECTRON_OUTPUT_DIR || 'release',
    buildResources: 'build',
  },
  win: {
    target: ['nsis'],
    executableName: 'AegisVault',
    icon: 'public/icon.png',
    requestedExecutionLevel: 'asInvoker',
    cscLink: process.env.AEGIS_WIN_CSC_LINK || undefined,
    cscKeyPassword: process.env.AEGIS_WIN_CSC_KEY_PASSWORD || undefined,
  },
  mac: {
    target: ['dmg', 'zip'],
    icon: 'public/icon.png',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
  },
  linux: {
    target: ['AppImage', 'deb'],
    icon: 'public/icon.png',
    category: 'Utility',
    maintainer: 'Aegis Team',
    executableName: 'aegis-vault',
  },
  nsis: {
    include: 'build/installer.nsh',
    oneClick: false,
    perMachine: false,
    allowElevation: true,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    installerLanguages: ['en_US', 'tr_TR'],
    language: '1033',
  },
};

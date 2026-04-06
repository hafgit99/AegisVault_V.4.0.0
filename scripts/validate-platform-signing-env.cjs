const requirePlatformSigning = process.env.AEGIS_REQUIRE_PLATFORM_SIGNING === '1';

function main() {
  if (!requirePlatformSigning) {
    console.log(
      '[release:platform-signing-env] platform signing not required in this environment.'
    );
    return;
  }

  const errors = [];

  if (process.platform === 'win32') {
    if (!process.env.CSC_LINK) errors.push('CSC_LINK_MISSING');
    if (!process.env.CSC_KEY_PASSWORD) errors.push('CSC_KEY_PASSWORD_MISSING');
  } else if (process.platform === 'darwin') {
    if (!process.env.CSC_LINK) errors.push('CSC_LINK_MISSING');
    if (!process.env.CSC_KEY_PASSWORD) errors.push('CSC_KEY_PASSWORD_MISSING');
    if (!process.env.APPLE_ID) errors.push('APPLE_ID_MISSING');
    if (!process.env.APPLE_APP_SPECIFIC_PASSWORD)
      errors.push('APPLE_APP_SPECIFIC_PASSWORD_MISSING');
    if (!process.env.APPLE_TEAM_ID) errors.push('APPLE_TEAM_ID_MISSING');
  }

  if (errors.length > 0) {
    console.error(
      `[release:platform-signing-env] missing required environment: ${errors.join(', ')}`
    );
    process.exit(1);
  }

  console.log('[release:platform-signing-env] required platform signing environment detected.');
}

main();

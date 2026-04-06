const requireSignedRelease = process.env.AEGIS_REQUIRE_SIGNED_RELEASE === '1';

function normalizePem(value) {
  if (!value) return null;
  return value.includes('\\n') ? value.replace(/\\n/g, '\n') : value;
}

function main() {
  if (!requireSignedRelease) {
    console.log('[release:signing-env] signed release not required in this environment.');
    return;
  }

  const privateKey = normalizePem(process.env.AEGIS_RELEASE_SIGNING_PRIVATE_KEY);
  const publicKey = normalizePem(process.env.AEGIS_RELEASE_SIGNING_PUBLIC_KEY);

  if (!privateKey || !publicKey) {
    console.error(
      '[release:signing-env] AEGIS_REQUIRE_SIGNED_RELEASE=1 but signing key pair is missing.'
    );
    process.exit(1);
  }

  console.log('[release:signing-env] signing key pair detected.');
}

main();

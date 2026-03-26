// @ts-nocheck
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Aegis Vault - Release Signing Key Generator
 * Generates an Ed25519 key pair for signing CI releases.
 */

function main() {
  console.log('--- Aegis Vault - Release Signing Key Generator ---');
  console.log('Generating Ed25519 key pair...');

  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
    privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
    publicKeyEncoding: { format: 'pem', type: 'spki' },
  });

  console.log('\n✅ Keys generated successfully!');
  console.log('\n--- NEXT STEPS (GITHUB ACTIONS SETUP) ---');
  console.log('1. Go to your GitHub Repository -> Settings -> Secrets and variables -> Actions');
  console.log('2. Click "New repository secret"');
  console.log('3. Name: AEGIS_RELEASE_SIGNING_PRIVATE_KEY');
  console.log('   Value: (Copy the private key block below, including BEGIN/END lines)');
  console.log('\n--- PRIVATE KEY (SECRET) ---');
  console.log(privateKey);
  
  console.log('\n4. Click "New repository secret" again');
  console.log('5. Name: AEGIS_RELEASE_SIGNING_PUBLIC_KEY');
  console.log('   Value: (Copy the public key block below, including BEGIN/END lines)');
  console.log('\n--- PUBLIC KEY (SECRET) ---');
  console.log(publicKey);

  console.log('\n--- FINAL STEP ---');
  console.log('Change AEGIS_REQUIRE_SIGNED_RELEASE to "1" in .github/workflows/build.yml');
  console.log('\n⚠️  SECURITY WARNING: Store your private key in a safe place. If you lose it, you cannot verify future releases. If it is stolen, someone can sign malicious versions of your app.');
}

main();

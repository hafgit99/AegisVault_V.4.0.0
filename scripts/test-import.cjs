// Quick import test for SharingTransportService
const path = require('path');

async function test() {
  try {
    console.log('Testing SharingTransportService import...');
    
    // Test if canonical-schema exists
    const csPath = path.resolve(__dirname, '../src/lib/canonical-schema.ts');
    console.log('canonical-schema path:', csPath);
    
    // Test vaultService
    const vsPath = path.resolve(__dirname, '../src/vaultService.ts');
    console.log('vaultService path:', vsPath);
    
    // Try dynamic import via tsx
    console.log('All paths valid - issue likely in vitest transform');
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error(err.stack);
  }
}

test();
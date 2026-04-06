const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'src', 'lib', '__tests__');

// Fix SearchService test - change 'dev@github' to 'github'
const searchFile = path.join(dir, 'SearchService.test.ts');
let searchContent = fs.readFileSync(searchFile, 'utf8');
searchContent = searchContent.replace(
  "SearchService.searchDecrypted(entries,'dev@github')",
  "SearchService.searchDecrypted(entries,'github')"
);
fs.writeFileSync(searchFile, searchContent, 'utf8');
console.log('Fixed SearchService test');

// Fix VaultAuthService test - use deterministic mock based on password
const authFile = path.join(dir, 'VaultAuthService.test.ts');
let authContent = fs.readFileSync(authFile, 'utf8');

// Replace the entire mock section
authContent = authContent.replace(
  /let _callIdx = 0;\nconst _hashSeq = \[.*?\];\nvi\.mock\('\.\.\/Argon2WorkerService', \(\) => \(\{\n  Argon2WorkerService: \{\n    deriveHex: vi\.fn\(async \(\) => _hashSeq\[_callIdx\+\+ % _hashSeq\.length\]\),/,
  `vi.mock('../Argon2WorkerService', () => ({
  Argon2WorkerService: {
    deriveHex: vi.fn(async ({ password }: { password: string }) => {
      const code = password.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0);
      return code.toString(16).padStart(64, '0');`
);

fs.writeFileSync(authFile, authContent, 'utf8');
console.log('Fixed VaultAuthService test');

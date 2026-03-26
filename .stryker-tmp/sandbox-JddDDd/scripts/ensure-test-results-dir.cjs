// @ts-nocheck
const fs = require("fs");
const path = require("path");

const targetDir = path.join(process.cwd(), "test-results");
fs.mkdirSync(targetDir, { recursive: true });
console.log(`[test-results] ensured directory: ${targetDir}`);

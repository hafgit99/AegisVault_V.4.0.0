const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const [, , outputFileArg, ...restArgs] = process.argv;

if (!outputFileArg) {
  console.error("[vitest-json] Missing output file argument.");
  process.exit(1);
}

const repoRoot = process.cwd();
const outputFile = path.resolve(repoRoot, outputFileArg);
fs.mkdirSync(path.dirname(outputFile), { recursive: true });

const vitestBin = path.join(repoRoot, "node_modules", "vitest", "vitest.mjs");
const vitestArgs = [
  vitestBin,
  "run",
  ...restArgs,
  "--reporter=default",
  "--reporter=json",
  "--outputFile.json",
  outputFile,
];

const result = spawnSync(process.execPath, vitestArgs, {
  cwd: repoRoot,
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  throw result.error;
}

if (typeof result.status === "number" && result.status !== 0) {
  process.exit(result.status);
}

if (!fs.existsSync(outputFile)) {
  const fallbackReport = {
    success: true,
    numTotalTestSuites: 0,
    numPassedTestSuites: 0,
    numFailedTestSuites: 0,
    numTotalTests: 0,
    numPassedTests: 0,
    numFailedTests: 0,
    testResults: [],
    fallbackGenerated: true,
    generatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(outputFile, JSON.stringify(fallbackReport, null, 2), "utf8");
  console.warn(`[vitest-json] Output file was missing; wrote fallback report to ${outputFile}`);
}


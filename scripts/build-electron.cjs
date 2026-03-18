const { spawnSync } = require('node:child_process');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const repoRoot = process.cwd();
const releaseDir = path.join(repoRoot, 'release');
const isWindows = process.platform === 'win32';
const isOneDriveWorkspace = /[\\/]OneDrive[\\/]/i.test(repoRoot);
const localBuildRoot = path.join(
  process.env.LOCALAPPDATA || os.tmpdir(),
  'AegisVault',
  'electron-builder-output'
);
const effectiveOutputDir = isWindows && isOneDriveWorkspace ? localBuildRoot : releaseDir;

function resolveCommand(binName) {
  if (binName === 'npm') {
    return isWindows ? 'npm.cmd' : 'npm';
  }

  const extension = isWindows ? '.cmd' : '';
  return path.join(repoRoot, 'node_modules', '.bin', `${binName}${extension}`);
}

function quoteWindowsArg(value) {
  if (!value || !/[\s"]/u.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}

function run(command, args, extraEnv = {}) {
  const env = {
    ...process.env,
    ...extraEnv,
  };
  const shouldUseCmdShim = isWindows && /\.cmd$/i.test(command);
  const result = shouldUseCmdShim
    ? spawnSync(
        'cmd.exe',
        ['/d', '/s', '/c', [quoteWindowsArg(command), ...args.map(quoteWindowsArg)].join(' ')],
        {
          cwd: repoRoot,
          stdio: 'inherit',
          env,
        }
      )
    : spawnSync(command, args, {
        cwd: repoRoot,
        stdio: 'inherit',
        env,
      });

  if (result.error) {
    console.error(`[build:electron] Failed to start command: ${command}`);
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`[build:electron] Command failed with exit code ${result.status}: ${command} ${args.join(' ')}`);
    process.exit(result.status || 1);
  }
}

async function prepareOutputDirs() {
  if (effectiveOutputDir !== releaseDir) {
    await fsp.rm(effectiveOutputDir, { recursive: true, force: true });
  }
  await fsp.rm(releaseDir, { recursive: true, force: true });
}

async function syncArtifactsBack() {
  if (effectiveOutputDir === releaseDir) {
    return;
  }

  await fsp.mkdir(path.dirname(releaseDir), { recursive: true });
  await fsp.cp(effectiveOutputDir, releaseDir, { recursive: true });
}

async function main() {
  await prepareOutputDirs();

  if (effectiveOutputDir !== releaseDir) {
    console.log(`[build:electron] OneDrive workspace detected. Using local build output: ${effectiveOutputDir}`);
  }

  run(resolveCommand('npm'), ['run', 'build']);
  run(resolveCommand('electron-builder'), ['-w', '--config', 'electron-builder.config.cjs'], {
    AEGIS_ELECTRON_OUTPUT_DIR: effectiveOutputDir,
  });

  await syncArtifactsBack();
  run(process.execPath, ['scripts/generate-hashes.js']);
  run(process.execPath, ['scripts/generate-sbom.cjs']);
  run(process.execPath, ['scripts/generate-release-provenance.cjs']);
  run(process.execPath, ['scripts/sign-release-manifest.cjs']);
  run(process.execPath, ['scripts/verify-release-trust-chain.cjs']);

  if (effectiveOutputDir !== releaseDir) {
    console.log(`[build:electron] Build artifacts copied back to: ${releaseDir}`);
  }
}

main().catch((error) => {
  console.error('[build:electron] Failed:', error);
  process.exit(1);
});

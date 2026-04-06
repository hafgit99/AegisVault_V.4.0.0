const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = process.cwd();
const releaseDir = path.join(repoRoot, 'release');
const reportDir = path.join(repoRoot, 'ci-artifacts');
const reportPath = path.join(reportDir, 'platform-signing-verification.json');
const requirePlatformSigning = process.env.AEGIS_REQUIRE_PLATFORM_SIGNING === '1';

function listArtifacts(pattern) {
  if (!fs.existsSync(releaseDir)) return [];
  return fs
    .readdirSync(releaseDir)
    .filter((file) => pattern.test(file))
    .sort()
    .map((file) => path.join(releaseDir, file));
}

function run(command, args) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

function verifyWindowsExe(filePath) {
  const command = [
    "$sig = Get-AuthenticodeSignature -FilePath '" + filePath.replace(/'/g, "''") + "';",
    '$payload = @{ status = [string]$sig.Status; signer = if ($sig.SignerCertificate) { $sig.SignerCertificate.Subject } else { $null } } | ConvertTo-Json -Compress;',
    'Write-Output $payload;',
  ].join(' ');
  const result = run('powershell.exe', ['-NoProfile', '-Command', command]);
  if (result.status !== 0) {
    return {
      file: path.basename(filePath),
      ok: false,
      detail: (result.stderr || result.stdout || '').trim() || 'AUTHENTICODE_CHECK_FAILED',
    };
  }

  const parsed = JSON.parse((result.stdout || '{}').trim());
  return {
    file: path.basename(filePath),
    ok: parsed.status === 'Valid',
    detail: parsed.status,
    signer: parsed.signer || null,
  };
}

function verifyMacDmg(filePath) {
  const stapler = run('xcrun', ['stapler', 'validate', filePath]);
  const spctl = run('spctl', ['-a', '-vv', '-t', 'open', filePath]);
  return {
    file: path.basename(filePath),
    ok: stapler.status === 0 && spctl.status === 0,
    detail: [stapler.stdout, stapler.stderr, spctl.stdout, spctl.stderr]
      .filter(Boolean)
      .join('\n')
      .trim(),
  };
}

function main() {
  const errors = [];
  let artifacts = [];
  let mode = 'not-applicable';

  if (requirePlatformSigning) {
    if (process.platform === 'win32') {
      mode = 'windows-authenticode';
      const installers = listArtifacts(/\.exe$/i);
      if (installers.length === 0) {
        errors.push('WINDOWS_INSTALLER_MISSING');
      }
      artifacts = installers.map(verifyWindowsExe);
      if (artifacts.some((item) => !item.ok)) {
        errors.push('WINDOWS_AUTHENTICODE_INVALID');
      }
    } else if (process.platform === 'darwin') {
      mode = 'macos-notarization';
      const dmgs = listArtifacts(/\.dmg$/i);
      if (dmgs.length === 0) {
        errors.push('MACOS_DMG_MISSING');
      }
      artifacts = dmgs.map(verifyMacDmg);
      if (artifacts.some((item) => !item.ok)) {
        errors.push('MACOS_NOTARIZATION_INVALID');
      }
    } else {
      mode = 'linux-no-platform-signing-check';
    }
  }

  const report = {
    ok: errors.length === 0,
    checkedAt: new Date().toISOString(),
    requirePlatformSigning,
    mode,
    artifacts,
    errors,
  };

  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`[release:platform-signing] report written: ${reportPath}`);

  if (!report.ok) {
    console.error(`[release:platform-signing] failed: ${errors.join(', ')}`);
    process.exit(1);
  }
}

main();

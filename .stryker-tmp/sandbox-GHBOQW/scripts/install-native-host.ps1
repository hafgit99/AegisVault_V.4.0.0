param(
  [string]$InstallDir,
  [string]$HostName = "com.aegisvault.desktop",
  [string[]]$ExtensionIds = @(
    "iockeheicjcnfoegjjboooljndjcafae",
    "gddgomiecgnihlljfkogfjgakedoielk",
    "kjbdjkfijeflhhbnkjgkmccljifidpcc"
  ),
  [string[]]$FirefoxExtensionIds = @(
    "aegisvault@example.com"
  )
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($InstallDir)) {
  throw "InstallDir is required"
}

$nativeHostDir = Join-Path $InstallDir "native-host"
New-Item -ItemType Directory -Path $nativeHostDir -Force | Out-Null

$launcherPath = Join-Path $nativeHostDir "aegis-native-host-launcher.cmd"
$hostScriptPath = Join-Path $InstallDir "resources\native-host\aegis-native-host.ps1"
$manifestPath = Join-Path $nativeHostDir "$HostName.json"
$firefoxManifestPath = Join-Path $nativeHostDir "$HostName.firefox.json"
$combinedAllowedExtensionIds = @($ExtensionIds + $FirefoxExtensionIds | Select-Object -Unique)
$combinedAllowedExtensionIdsJson = $combinedAllowedExtensionIds | ConvertTo-Json -Compress
$combinedAllowedExtensionIdsCsv = ($combinedAllowedExtensionIds -join ",")

$launcherContent = @"
@echo off
setlocal
set "AEGIS_EXTENSION_ALLOWLIST=$combinedAllowedExtensionIdsCsv"
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "$hostScriptPath" -AllowedExtensionIdsJson "$combinedAllowedExtensionIdsJson"
"@

Set-Content -Path $launcherPath -Value $launcherContent -Encoding ASCII

$manifest = @{
  name = $HostName
  description = "Aegis Vault native messaging bridge"
  path = $launcherPath
  type = "stdio"
  allowed_origins = @($ExtensionIds | ForEach-Object { "chrome-extension://$_/" })
}

$manifest | ConvertTo-Json -Depth 5 | Set-Content -Path $manifestPath -Encoding UTF8

$firefoxManifest = @{
  name = $HostName
  description = "Aegis Vault native messaging bridge"
  path = $launcherPath
  type = "stdio"
  allowed_extensions = @($FirefoxExtensionIds)
}

$firefoxManifest | ConvertTo-Json -Depth 5 | Set-Content -Path $firefoxManifestPath -Encoding UTF8

$chromeKey = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName"
$edgeKey = "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$HostName"
$firefoxKey = "HKCU:\Software\Mozilla\NativeMessagingHosts\$HostName"

New-Item -Path $chromeKey -Force | Out-Null
Set-ItemProperty -Path $chromeKey -Name "(default)" -Value $manifestPath

New-Item -Path $edgeKey -Force | Out-Null
Set-ItemProperty -Path $edgeKey -Name "(default)" -Value $manifestPath

New-Item -Path $firefoxKey -Force | Out-Null
Set-ItemProperty -Path $firefoxKey -Name "(default)" -Value $firefoxManifestPath

Write-Host "Installed native host (Direct Powershell method):"
Write-Host "  Launcher: $launcherPath"
Write-Host "  Chromium manifest: $manifestPath"
Write-Host "  Firefox manifest: $firefoxManifestPath"

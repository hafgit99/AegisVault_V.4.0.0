param(
  [string]$HostName = "com.aegisvault.desktop",
  [string]$ManifestPath = "",
  [string]$FirefoxManifestPath = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ManifestPath)) {
  $ManifestPath = Join-Path (Resolve-Path ".") "build\native-host\$HostName.json"
}

$ResolvedManifestPath = (Resolve-Path $ManifestPath).Path

if (!(Test-Path $ResolvedManifestPath)) {
  throw "Manifest not found: $ResolvedManifestPath"
}

if ([string]::IsNullOrWhiteSpace($FirefoxManifestPath)) {
  $FirefoxManifestPath = Join-Path (Resolve-Path ".") "build\native-host\$HostName.firefox.json"
}

$ResolvedFirefoxManifestPath = (Resolve-Path $FirefoxManifestPath).Path

if (!(Test-Path $ResolvedFirefoxManifestPath)) {
  throw "Firefox manifest not found: $ResolvedFirefoxManifestPath"
}

$chromeKey = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName"
$edgeKey = "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$HostName"
$firefoxKey = "HKCU:\Software\Mozilla\NativeMessagingHosts\$HostName"

New-Item -Path $chromeKey -Force | Out-Null
Set-ItemProperty -Path $chromeKey -Name "(default)" -Value $ResolvedManifestPath

New-Item -Path $edgeKey -Force | Out-Null
Set-ItemProperty -Path $edgeKey -Name "(default)" -Value $ResolvedManifestPath

New-Item -Path $firefoxKey -Force | Out-Null
Set-ItemProperty -Path $firefoxKey -Name "(default)" -Value $ResolvedFirefoxManifestPath

Write-Host "Native host registered for Chrome/Edge:"
Write-Host "  $ResolvedManifestPath"
Write-Host "Native host registered for Firefox:"
Write-Host "  $ResolvedFirefoxManifestPath"

param(
  [string]$HostName = "com.aegisvault.desktop"
)

$ErrorActionPreference = "Stop"

$chromeKey = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName"
$edgeKey = "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$HostName"
$firefoxKey = "HKCU:\Software\Mozilla\NativeMessagingHosts\$HostName"

if (Test-Path $chromeKey) {
  Remove-Item -Path $chromeKey -Recurse -Force
}

if (Test-Path $edgeKey) {
  Remove-Item -Path $edgeKey -Recurse -Force
}

if (Test-Path $firefoxKey) {
  Remove-Item -Path $firefoxKey -Recurse -Force
}

Write-Host "Native host unregistered for Chrome, Edge and Firefox:"
Write-Host "  $HostName"

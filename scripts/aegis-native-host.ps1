param(
  [string]$PipeName = "aegis-vault-native-v1",
  [string]$AllowedExtensionIdsJson = "[]"
)

$ErrorActionPreference = "Stop"

$AllowedExtensionIds = @()
try {
  $rawAllowlist = if (-not [string]::IsNullOrWhiteSpace($env:AEGIS_EXTENSION_ALLOWLIST)) {
    @($env:AEGIS_EXTENSION_ALLOWLIST -split ',' | ForEach-Object { $_.Trim() } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  } else {
    $parsedAllowedIds = $AllowedExtensionIdsJson | ConvertFrom-Json
    if ($parsedAllowedIds -is [System.Array]) {
      @($parsedAllowedIds | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) } | ForEach-Object { [string]$_ })
    } else {
      @()
    }
  }
  if ($rawAllowlist -is [System.Array]) {
    $AllowedExtensionIds = @($rawAllowlist)
  }
} catch {
  $AllowedExtensionIds = @()
}

function Test-AllowlistedExtensionId {
  param(
    [string]$ExtensionId
  )

  if ([string]::IsNullOrWhiteSpace($ExtensionId)) {
    return $false
  }

  if ($AllowedExtensionIds.Count -eq 0) {
    return $false
  }

  return $AllowedExtensionIds -contains $ExtensionId
}
$PairingSecret = [string]$env:AEGIS_EXTENSION_PAIRING_SECRET

function Convert-ToHex {
  param([byte[]]$Bytes)
  return ([System.BitConverter]::ToString($Bytes)).Replace("-", "").ToLowerInvariant()
}

function Get-HmacHex {
  param(
    [byte[]]$KeyBytes,
    [string]$Payload
  )
  $hmac = [System.Security.Cryptography.HMACSHA256]::new($KeyBytes)
  try {
    $hash = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($Payload))
    return (Convert-ToHex -Bytes $hash)
  } finally {
    $hmac.Dispose()
  }
}

function Read-NativeMessage {
  param([System.IO.Stream]$InputStream)

  $header = [byte[]]::new(4)
  $read = $InputStream.Read($header, 0, 4)
  if ($read -eq 0) { return $null }
  if ($read -lt 4) { throw "INVALID_NATIVE_HEADER" }

  $length = [System.BitConverter]::ToInt32($header, 0)
  $buffer = [byte[]]::new($length)
  $offset = 0
  while ($offset -lt $length) {
    $count = $InputStream.Read($buffer, $offset, $length - $offset)
    if ($count -le 0) { throw "UNEXPECTED_EOF" }
    $offset += $count
  }

  return [System.Text.Encoding]::UTF8.GetString($buffer)
}

function Write-NativeMessage {
  param(
    [System.IO.Stream]$OutputStream,
    $Message
  )

  $json = ($Message | ConvertTo-Json -Compress -Depth 8)
  $payload = [System.Text.Encoding]::UTF8.GetBytes($json)
  $length = [System.BitConverter]::GetBytes([int]$payload.Length)
  $OutputStream.Write($length, 0, 4)
  $OutputStream.Write($payload, 0, $payload.Length)
  $OutputStream.Flush()
}

function Normalize-Domain {
  param([string]$InputValue)

  if ([string]::IsNullOrWhiteSpace($InputValue)) {
    return ""
  }

  $trimmed = $InputValue.Trim().ToLowerInvariant()

  try {
    if ($trimmed.Contains("://")) {
      $uri = [System.Uri]$trimmed
    } else {
      $uri = [System.Uri]"https://$trimmed"
    }
    $host = $uri.Host.ToLowerInvariant()
    if ($host.StartsWith("www.")) {
      return $host.Substring(4)
    }
    return $host
  } catch {
    if ($trimmed.StartsWith("www.")) {
      return $trimmed.Substring(4)
    }
    return $trimmed
  }
}

function Invoke-NativeBridge {
  param(
    [hashtable]$Payload,
    [string]$RuntimePairingSecret = ""
  )

  $activePairingSecret = if (![string]::IsNullOrWhiteSpace($RuntimePairingSecret)) { $RuntimePairingSecret } else { $PairingSecret }

  $normalizedDomain = Normalize-Domain -InputValue ([string]$Payload.domain)

  $signedPayload = @{
    type = [string]$Payload.type
    extensionId = [string]$Payload.extensionId
    domain = $normalizedDomain
    requestNonce = [string]$Payload.requestNonce
    browserName = [string]$Payload.browserName
    clientInfo = $Payload.clientInfo
    clientKeyId = [string]$Payload.clientKeyId
    clientTimestamp = [string]$Payload.clientTimestamp
    clientNonce = [string]$Payload.clientNonce
    clientSignature = [string]$Payload.clientSignature
    clientPublicJwk = $Payload.clientPublicJwk
    credential = $Payload.credential
    title = [string]$Payload.title
    entryId = $Payload.entryId
    entry = $Payload.entry
    query = [string]$Payload.query
    category = [string]$Payload.category
    scope = [string]$Payload.scope
    searchScope = [string]$Payload.searchScope
    limit = $Payload.limit
  }

  if (![string]::IsNullOrWhiteSpace($activePairingSecret) -and $activePairingSecret.Length -ge 32) {
    $proofPayload = @{
      type = [string]$Payload.type
      extensionId = [string]$Payload.extensionId
      domain = $normalizedDomain
      clientInfo = @{
        browserName = [string]$Payload.clientInfo.browserName
        browserVersion = [string]$Payload.clientInfo.browserVersion
        platform = [string]$Payload.clientInfo.platform
        locale = [string]$Payload.clientInfo.locale
        installId = [string]$Payload.clientInfo.installId
        extensionVersion = [string]$Payload.clientInfo.extensionVersion
        userAgent = [string]$Payload.clientInfo.userAgent
      }
    } | ConvertTo-Json -Compress -Depth 8
    $signedPayload.proof = Get-HmacHex -KeyBytes ([System.Text.Encoding]::UTF8.GetBytes($activePairingSecret)) -Payload $proofPayload
  }

  $pipe = [System.IO.Pipes.NamedPipeClientStream]::new(".", $PipeName, [System.IO.Pipes.PipeDirection]::InOut)
  try {
    $pipe.Connect(3000)
    $writer = [System.IO.StreamWriter]::new($pipe, [System.Text.Encoding]::UTF8, 1024, $true)
    $writer.NewLine = "`n"
    $writer.AutoFlush = $true
    $writer.WriteLine(($signedPayload | ConvertTo-Json -Compress -Depth 8))

    $reader = [System.IO.StreamReader]::new($pipe, [System.Text.Encoding]::UTF8, $false, 1024, $true)
    $line = $reader.ReadLine()
    if ([string]::IsNullOrWhiteSpace($line)) {
      throw "EMPTY_NATIVE_BRIDGE_RESPONSE"
    }

    return ($line | ConvertFrom-Json)
  } finally {
    $pipe.Dispose()
  }
}

$stdin = [Console]::OpenStandardInput()
$stdout = [Console]::OpenStandardOutput()

while ($true) {
  try {
    $raw = Read-NativeMessage -InputStream $stdin
    if ($null -eq $raw) { break }

    $message = $raw | ConvertFrom-Json
    $type = [string]($message.type)
    $extensionId = [string]($message.extensionId)
    $runtimePairingSecret = [string]$message.pairingSecret

    if (-not (Test-AllowlistedExtensionId -ExtensionId $extensionId)) {
      Write-NativeMessage -OutputStream $stdout -Message @{ ok = $false; error = "FORBIDDEN_EXTENSION_ID" }
      continue
    }

    # Pass-through helper: Electron'dan gelen response'u olduğu gibi iletir.
    # desktopAuth imzası Electron tarafında response body üzerinden üretildiği için,
    # burada response'u yeniden yapılandırmak imza uyumsuzluğuna yol açar
    # (DESKTOP_AUTH_SIGNATURE_INVALID).

    $bridgePayload = @{
      type = $type
      extensionId = $extensionId
      domain = [string]$message.domain
      requestNonce = [string]$message.requestNonce
      browserName = [string]$message.browserName
      clientInfo = $message.clientInfo
      clientKeyId = [string]$message.clientKeyId
      clientTimestamp = [string]$message.clientTimestamp
      clientNonce = [string]$message.clientNonce
      clientSignature = [string]$message.clientSignature
      clientPublicJwk = $message.clientPublicJwk
      credential = $message.credential
      title = [string]$message.title
      entryId = $message.entryId
      entry = $message.entry
      query = [string]$message.query
      category = [string]$message.category
      scope = [string]$message.scope
      searchScope = [string]$message.searchScope
      limit = $message.limit
    }

    if ($type -eq "GET_DOMAIN_CREDS" -or $type -eq "GET_DOMAIN_PASSKEYS") {
      $domain = Normalize-Domain -InputValue ([string]$message.domain)
      if ([string]::IsNullOrWhiteSpace($domain)) {
        Write-NativeMessage -OutputStream $stdout -Message @{ ok = $false; error = "INVALID_DOMAIN"; data = @() }
        continue
      }
      $bridgePayload.domain = $domain
    }

    $result = Invoke-NativeBridge -Payload $bridgePayload -RuntimePairingSecret $runtimePairingSecret

    if ($null -eq $result) {
      Write-NativeMessage -OutputStream $stdout -Message @{ ok = $false; error = "NATIVE_HOST_ERROR" }
    } else {
      Write-NativeMessage -OutputStream $stdout -Message $result
    }
  } catch {
    Write-NativeMessage -OutputStream $stdout -Message @{
      ok = $false
      error = $_.Exception.Message
    }
  }
}

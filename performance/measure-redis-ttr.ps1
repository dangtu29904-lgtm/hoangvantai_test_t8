param(
  [ValidateSet("Docker", "Service")]
  [string]$Mode = "Docker",
  [string]$DockerContainer = "redis",
  [string]$ServiceName = "Redis",
  [string]$RedisCliCommand = "redis-cli",
  [string]$PresenceKey = "",
  [int]$Runs = 3,
  [int]$TimeoutSeconds = 30,
  [int]$PollIntervalMs = 250,
  [string]$OutDir = ""
)

$ErrorActionPreference = "Stop"

function Get-ProjectRoot {
  $scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.ScriptName }
  return (Resolve-Path (Join-Path $scriptDir "../..")).Path
}

function Get-PercentileMedian {
  param([double[]]$Values)
  if (-not $Values -or $Values.Count -eq 0) { return $null }
  $sorted = @($Values | Sort-Object)
  $middle = [int][Math]::Floor(($sorted.Count - 1) / 2)
  if ($sorted.Count % 2 -eq 1) { return [double]$sorted[$middle] }
  return ([double]$sorted[$middle] + [double]$sorted[$middle + 1]) / 2
}

function Format-Number {
  param([object]$Value, [int]$Decimals = 2)
  if ($null -eq $Value) { return "-" }
  try {
    return [Math]::Round([double]$Value, $Decimals).ToString()
  } catch {
    return "-"
  }
}

function Invoke-RedisCli {
  param([string[]]$Arguments)

  if ($Mode -eq "Docker") {
    & docker exec $DockerContainer redis-cli @Arguments
    return
  }

  & $RedisCliCommand @Arguments
}

function Test-RedisPing {
  try {
    $output = Invoke-RedisCli -Arguments @("PING") 2>$null
    return ($LASTEXITCODE -eq 0 -and (($output -join "`n").Trim() -eq "PONG"))
  } catch {
    return $false
  }
}

function Test-RedisOperation {
  $probeKey = "__perf:redis:ttr:probe"
  try {
    $setOutput = Invoke-RedisCli -Arguments @("SET", $probeKey, "ok", "EX", "10") 2>$null
    if ($LASTEXITCODE -ne 0 -or (($setOutput -join "`n").Trim() -ne "OK")) { return $false }

    if ($PresenceKey) {
      Invoke-RedisCli -Arguments @("TTL", $PresenceKey) 2>$null | Out-Null
      if ($LASTEXITCODE -ne 0) { return $false }
    }

    return $true
  } catch {
    return $false
  }
}

function Wait-Until {
  param(
    [scriptblock]$Condition,
    [int]$TimeoutSeconds,
    [int]$PollIntervalMs,
    [string]$Description
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (& $Condition) { return }
    Start-Sleep -Milliseconds $PollIntervalMs
  }

  throw "Timeout waiting for $Description after $TimeoutSeconds seconds"
}

function Stop-Redis {
  if ($Mode -eq "Docker") {
    & docker stop $DockerContainer | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "docker stop $DockerContainer failed" }
    return
  }

  Stop-Service -Name $ServiceName -Force
}

function Start-Redis {
  if ($Mode -eq "Docker") {
    & docker start $DockerContainer | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "docker start $DockerContainer failed" }
    return
  }

  Start-Service -Name $ServiceName
}

if ($Mode -eq "Service" -and -not (Get-Command $RedisCliCommand -ErrorAction SilentlyContinue)) {
  throw "$RedisCliCommand is not available in PATH."
}

if ($Mode -eq "Docker" -and -not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "docker is not available in PATH. Use -Mode Service if Redis runs as a Windows service."
}

$root = Get-ProjectRoot
if (-not $OutDir) {
  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $OutDir = Join-Path $root "tools/performance/results/redis-ttr-$timestamp"
}

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

if (-not (Test-RedisPing)) {
  throw "Redis is not responding before the test. Start Redis first, then rerun."
}

$rows = @()
try {
  for ($i = 1; $i -le $Runs; $i += 1) {
    Write-Host "Running Redis TTR run $i/$Runs..."

    Stop-Redis
    Wait-Until -Condition { -not (Test-RedisPing) } -TimeoutSeconds $TimeoutSeconds -PollIntervalMs $PollIntervalMs -Description "Redis to stop responding"

    $startedAt = Get-Date
    Start-Redis

    Wait-Until -Condition { Test-RedisPing } -TimeoutSeconds $TimeoutSeconds -PollIntervalMs $PollIntervalMs -Description "Redis PING to recover"
    $pingRecoveredAt = Get-Date

    Wait-Until -Condition { Test-RedisOperation } -TimeoutSeconds $TimeoutSeconds -PollIntervalMs $PollIntervalMs -Description "Redis operation to recover"
    $operationRecoveredAt = Get-Date

    $rows += [pscustomobject]@{
      Run = $i
      Mode = $Mode
      RedisTarget = if ($Mode -eq "Docker") { $DockerContainer } else { $ServiceName }
      PingTtrMs = [Math]::Round(($pingRecoveredAt - $startedAt).TotalMilliseconds, 2)
      OperationTtrMs = [Math]::Round(($operationRecoveredAt - $startedAt).TotalMilliseconds, 2)
      OperationTtrSeconds = [Math]::Round(($operationRecoveredAt - $startedAt).TotalSeconds, 2)
      PresenceKey = $PresenceKey
    }

    Start-Sleep -Seconds 2
  }
} finally {
  if (-not (Test-RedisPing)) {
    Write-Warning "Redis is still down. Attempting to start it again..."
    try { Start-Redis } catch { Write-Warning $_.Exception.Message }
  }
}

$csvPath = Join-Path $OutDir "redis-ttr-results.csv"
$rows | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8

$medianPingMs = Get-PercentileMedian -Values @($rows | ForEach-Object { $_.PingTtrMs })
$medianOperationMs = Get-PercentileMedian -Values @($rows | ForEach-Object { $_.OperationTtrMs })
$medianOperationSeconds = if ($null -eq $medianOperationMs) { $null } else { $medianOperationMs / 1000 }

$mdPath = Join-Path $OutDir "redis-ttr-report.md"
$md = @"
# Redis TTR Result

Mode: $Mode
Redis target: $(if ($Mode -eq "Docker") { $DockerContainer } else { $ServiceName })
Presence key checked: $(if ($PresenceKey) { $PresenceKey } else { "not configured" })

| Metric | Run 1 | Run 2 | Run 3 | Median | Suggested threshold | Result |
|---|---:|---:|---:|---:|---:|---|
| Redis PING TTR (s) | $(Format-Number ($rows[0].PingTtrMs / 1000) 2) | $(Format-Number ($rows[1].PingTtrMs / 1000) 2) | $(Format-Number ($rows[2].PingTtrMs / 1000) 2) | $(Format-Number ($medianPingMs / 1000) 2) | record | - |
| Redis operation TTR (s) | $(Format-Number ($rows[0].OperationTtrMs / 1000) 2) | $(Format-Number ($rows[1].OperationTtrMs / 1000) 2) | $(Format-Number ($rows[2].OperationTtrMs / 1000) 2) | $(Format-Number $medianOperationSeconds 2) | < 5 | PASS/FAIL |

TTR is measured from Redis start command completion request to successful Redis PING/SET operation.
"@

$md | Set-Content -Path $mdPath -Encoding UTF8

Write-Host ""
Write-Host "Done."
Write-Host "Result directory: $OutDir"
Write-Host "CSV: $csvPath"
Write-Host "Report: $mdPath"
Write-Host "Median Redis operation TTR: $(Format-Number $medianOperationSeconds 2)s"

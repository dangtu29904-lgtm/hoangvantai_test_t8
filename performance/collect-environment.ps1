param(
  [string]$OutFile = "",
  [string]$BackendLocation = "Local machine, Spring Boot port 8080",
  [string]$LoadGeneratorLocation = "Same machine as backend",
  [string]$Network = "localhost",
  [string]$MySqlCommand = "mysql",
  [string]$RedisCliCommand = "redis-cli"
)

$ErrorActionPreference = "Stop"

function Get-ProjectRoot {
  $scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.ScriptName }
  return (Resolve-Path (Join-Path $scriptDir "../..")).Path
}

function Try-Run {
  param([scriptblock]$Command)
  try {
    $result = (& $Command 2>$null | Select-Object -First 1)
    if ($null -eq $result -or "$result".Trim().Length -eq 0) { return "not available" }
    return $result
  } catch {
    return "not available"
  }
}

function Try-Cim {
  param([string]$ClassName)
  try {
    return Get-CimInstance $ClassName -ErrorAction Stop
  } catch {
    try {
      return Get-WmiObject $ClassName -ErrorAction Stop
    } catch {
      return $null
    }
  }
}

$root = Get-ProjectRoot
if (-not $OutFile) {
  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $dir = Join-Path $root "tools/performance/results/$timestamp"
  New-Item -ItemType Directory -Path $dir -Force | Out-Null
  $OutFile = Join-Path $dir "environment.md"
} else {
  $parent = Split-Path -Parent $OutFile
  if ($parent) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
}

$os = Try-Cim "Win32_OperatingSystem"
$cpu = Try-Cim "Win32_Processor" | Select-Object -First 1
$computer = Try-Cim "Win32_ComputerSystem"

$osValue = if ($os) { "$($os.Caption) $($os.OSArchitecture), version $($os.Version)" } else { [System.Runtime.InteropServices.RuntimeInformation]::OSDescription }
$cpuValue = if ($cpu) { $cpu.Name } else { "not available" }
$coreValue = if ($cpu) { "$($cpu.NumberOfCores) cores / $($cpu.NumberOfLogicalProcessors) logical" } else { "not available" }
$ramValue = if ($computer) { "$([Math]::Round($computer.TotalPhysicalMemory / 1GB, 2)) GB" } else { "not available" }
$mysqlVersion = Try-Run { & $MySqlCommand --version }
$redisVersion = Try-Run { & $RedisCliCommand --version }
$k6Version = Try-Run { k6 version }
$javaVersion = Try-Run { java -version }

$content = @"
# Experiment Environment

| Item | Value |
|---|---|
| Collected at | $(Get-Date -Format "yyyy-MM-dd HH:mm:ss") |
| OS | $osValue |
| CPU | $cpuValue |
| CPU cores/logical processors | $coreValue |
| RAM | $ramValue |
| Java | $javaVersion |
| MySQL version | $mysqlVersion |
| Redis version | $redisVersion |
| k6 version | $k6Version |
| Network | $Network |
| Backend location | $BackendLocation |
| Client/load generator location | $LoadGeneratorLocation |

Note: if backend, database, Redis, and load generator run on the same machine, the result reflects local-machine capacity and is not a production-capacity number.
"@

$content | Set-Content -Path $OutFile -Encoding UTF8
Write-Host "Environment file: $OutFile"

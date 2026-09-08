param(
  [Parameter(Mandatory = $true)]
  [string]$ResultDir
)

$ErrorActionPreference = "Stop"

function Get-PercentileMedian {
  param([double[]]$Values)
  if (-not $Values -or $Values.Count -eq 0) { return $null }
  $sorted = @($Values | Sort-Object)
  $middle = [int][Math]::Floor(($sorted.Count - 1) / 2)
  if ($sorted.Count % 2 -eq 1) { return [double]$sorted[$middle] }
  return ([double]$sorted[$middle] + [double]$sorted[$middle + 1]) / 2
}

function Get-MetricValue {
  param(
    [object]$Summary,
    [string]$MetricName,
    [string]$ValueName
  )
  $metricsProperty = $Summary.PSObject.Properties |
    Where-Object { $_.Name -eq "metrics" } |
    Select-Object -First 1
  if ($null -eq $metricsProperty) { return $null }

  $metricProperty = $metricsProperty.Value.PSObject.Properties |
    Where-Object { $_.Name -eq $MetricName } |
    Select-Object -First 1
  if ($null -eq $metricProperty) { return $null }

  $metricData = $metricProperty.Value

  $valuesProperty = $metricData.PSObject.Properties |
    Where-Object { $_.Name -eq "values" } |
    Select-Object -First 1
  if ($null -ne $valuesProperty) {
    $values = $valuesProperty.Value
  } else {
    $values = $metricData
  }
  if ($null -eq $values) { return $null }

  $property = $values.PSObject.Properties |
    Where-Object { $_.Name -eq $ValueName } |
    Select-Object -First 1
  if ($null -eq $property -and $ValueName -eq "rate") {
    $property = $values.PSObject.Properties |
      Where-Object { $_.Name -eq "value" } |
      Select-Object -First 1
  }
  if ($null -eq $property) { return $null }

  return [double]$property.Value
}

function Format-Number {
  param(
    [object]$Value,
    [int]$Decimals = 2
  )
  if ($null -eq $Value) { return "-" }
  try {
    return [Math]::Round([double]$Value, $Decimals).ToString()
  } catch {
    return "-"
  }
}

function Get-RunValue {
  param(
    [object[]]$Rows,
    [int]$Index,
    [string]$Property,
    [int]$Decimals = 2
  )
  if ($Rows.Count -le $Index) { return "-" }
  return Format-Number $Rows[$Index].$Property $Decimals
}

function Get-ResourceSummary {
  param([string]$CsvPath)
  if (-not (Test-Path $CsvPath)) {
    return [pscustomobject]@{ CpuAvg = $null; CpuMax = $null; RamAvg = $null; RamMax = $null }
  }

  $resourceRows = Import-Csv $CsvPath
  if (-not $resourceRows -or $resourceRows.Count -eq 0) {
    return [pscustomobject]@{ CpuAvg = $null; CpuMax = $null; RamAvg = $null; RamMax = $null }
  }

  $cpu = @($resourceRows | ForEach-Object { [double]$_.cpuPercent })
  $ram = @($resourceRows | ForEach-Object { [double]$_.workingSetMB })

  return [pscustomobject]@{
    CpuAvg = [Math]::Round(($cpu | Measure-Object -Average).Average, 2)
    CpuMax = [Math]::Round(($cpu | Measure-Object -Maximum).Maximum, 2)
    RamAvg = [Math]::Round(($ram | Measure-Object -Average).Average, 2)
    RamMax = [Math]::Round(($ram | Measure-Object -Maximum).Maximum, 2)
  }
}

$resolvedDir = (Resolve-Path $ResultDir).Path
$summaryFiles = Get-ChildItem -Path $resolvedDir -Filter "run-*-summary.json" |
  Sort-Object Name

if (-not $summaryFiles -or $summaryFiles.Count -eq 0) {
  throw "No run-*-summary.json files found in $resolvedDir"
}

$rows = @()
foreach ($file in $summaryFiles) {
  $runNumber = if ($file.BaseName -match "run-(\d+)-summary") { [int]$Matches[1] } else { $rows.Count + 1 }
  $summary = Get-Content $file.FullName -Raw | ConvertFrom-Json
  $rows += [pscustomobject]@{
    Run = $runNumber
    Rps = Get-MetricValue $summary "http_reqs" "rate"
    TotalRequests = Get-MetricValue $summary "http_reqs" "count"
    AvgMs = Get-MetricValue $summary "http_req_duration" "avg"
    P50Ms = Get-MetricValue $summary "http_req_duration" "med"
    P95Ms = Get-MetricValue $summary "http_req_duration" "p(95)"
    P99Ms = Get-MetricValue $summary "http_req_duration" "p(99)"
    ErrorRatePercent = ((Get-MetricValue $summary "http_req_failed" "rate") * 100)
    CheckRatePercent = ((Get-MetricValue $summary "checks" "rate") * 100)
    SyncTtrP95Ms = Get-MetricValue $summary "chat_sync_ttr_ms" "p(95)"
    SyncedMessages = Get-MetricValue $summary "chat_sync_messages_total" "count"
  }
}

$csvPath = Join-Path $resolvedDir "summary-table.csv"
try {
  $rows | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8
} catch {
  $csvPath = Join-Path $resolvedDir "summary-table-rebuilt.csv"
  $rows | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8
}

$tsvPath = Join-Path $resolvedDir "summary-table-excel.tsv"
$rows | Export-Csv -Path $tsvPath -NoTypeInformation -Delimiter "`t" -Encoding UTF8

$median = [pscustomobject]@{
  Rps = Get-PercentileMedian -Values @($rows | ForEach-Object { $_.Rps } | Where-Object { $null -ne $_ })
  TotalRequests = Get-PercentileMedian -Values @($rows | ForEach-Object { $_.TotalRequests } | Where-Object { $null -ne $_ })
  AvgMs = Get-PercentileMedian -Values @($rows | ForEach-Object { $_.AvgMs } | Where-Object { $null -ne $_ })
  P50Ms = Get-PercentileMedian -Values @($rows | ForEach-Object { $_.P50Ms } | Where-Object { $null -ne $_ })
  P95Ms = Get-PercentileMedian -Values @($rows | ForEach-Object { $_.P95Ms } | Where-Object { $null -ne $_ })
  P99Ms = Get-PercentileMedian -Values @($rows | ForEach-Object { $_.P99Ms } | Where-Object { $null -ne $_ })
  ErrorRatePercent = Get-PercentileMedian -Values @($rows | ForEach-Object { $_.ErrorRatePercent } | Where-Object { $null -ne $_ })
  CheckRatePercent = Get-PercentileMedian -Values @($rows | ForEach-Object { $_.CheckRatePercent } | Where-Object { $null -ne $_ })
  SyncTtrP95Ms = Get-PercentileMedian -Values @($rows | ForEach-Object { $_.SyncTtrP95Ms } | Where-Object { $null -ne $_ })
}

$resource = Get-ResourceSummary -CsvPath (Join-Path $resolvedDir "backend-resource-samples.csv")
$mdPath = Join-Path $resolvedDir "report-table.md"

$md = @"
# Performance Result Table

Resource samples: backend-resource-samples.csv

| Metric | Run 1 | Run 2 | Run 3 | Median | Suggested threshold | Result |
|---|---:|---:|---:|---:|---:|---|
| Throughput (RPS) | $(Get-RunValue $rows 0 "Rps" 2) | $(Get-RunValue $rows 1 "Rps" 2) | $(Get-RunValue $rows 2 "Rps" 2) | $(Format-Number $median.Rps 2) | >= 50 | PASS/FAIL |
| Total requests | $(Get-RunValue $rows 0 "TotalRequests" 0) | $(Get-RunValue $rows 1 "TotalRequests" 0) | $(Get-RunValue $rows 2 "TotalRequests" 0) | $(Format-Number $median.TotalRequests 0) | record | - |
| avg (ms) | $(Get-RunValue $rows 0 "AvgMs" 2) | $(Get-RunValue $rows 1 "AvgMs" 2) | $(Get-RunValue $rows 2 "AvgMs" 2) | $(Format-Number $median.AvgMs 2) | record | - |
| p50 (ms) | $(Get-RunValue $rows 0 "P50Ms" 2) | $(Get-RunValue $rows 1 "P50Ms" 2) | $(Get-RunValue $rows 2 "P50Ms" 2) | $(Format-Number $median.P50Ms 2) | record | - |
| p95 (ms) | $(Get-RunValue $rows 0 "P95Ms" 2) | $(Get-RunValue $rows 1 "P95Ms" 2) | $(Get-RunValue $rows 2 "P95Ms" 2) | $(Format-Number $median.P95Ms 2) | < 500 | PASS/FAIL |
| p99 (ms) | $(Get-RunValue $rows 0 "P99Ms" 2) | $(Get-RunValue $rows 1 "P99Ms" 2) | $(Get-RunValue $rows 2 "P99Ms" 2) | $(Format-Number $median.P99Ms 2) | < 1000 | PASS/FAIL |
| Error rate (%) | $(Get-RunValue $rows 0 "ErrorRatePercent" 2) | $(Get-RunValue $rows 1 "ErrorRatePercent" 2) | $(Get-RunValue $rows 2 "ErrorRatePercent" 2) | $(Format-Number $median.ErrorRatePercent 2) | < 1 | PASS/FAIL |
| Check rate (%) | $(Get-RunValue $rows 0 "CheckRatePercent" 2) | $(Get-RunValue $rows 1 "CheckRatePercent" 2) | $(Get-RunValue $rows 2 "CheckRatePercent" 2) | $(Format-Number $median.CheckRatePercent 2) | >= 99 | PASS/FAIL |
| CPU avg/max (%) | - | - | - | $($resource.CpuAvg)/$($resource.CpuMax) | < 80 max | PASS/FAIL |
| RAM avg/max (MB) | - | - | - | $($resource.RamAvg)/$($resource.RamMax) | < 1536 max | PASS/FAIL |
| TTR p95 (ms) | $(Get-RunValue $rows 0 "SyncTtrP95Ms" 2) | $(Get-RunValue $rows 1 "SyncTtrP95Ms" 2) | $(Get-RunValue $rows 2 "SyncTtrP95Ms" 2) | $(Format-Number $median.SyncTtrP95Ms 2) | < 5000 | PASS/FAIL |

Raw outputs:

- run-1-output.log / run-1-summary.json
- run-2-output.log / run-2-summary.json
- run-3-output.log / run-3-summary.json
- summary-table.csv
- backend-resource-samples.csv
"@

$md | Set-Content -Path $mdPath -Encoding UTF8

Write-Host "Rebuilt:"
Write-Host "CSV summary: $csvPath"
Write-Host "Excel TSV: $tsvPath"
Write-Host "Markdown table: $mdPath"

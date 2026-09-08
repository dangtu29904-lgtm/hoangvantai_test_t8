# Performance Test Kit

This folder contains scripts to collect the minimum metrics for the report:

- workload intensity: VU, RPS/throughput, total requests
- latency: avg, p50, p95, p99
- reliability: error rate, 4xx/5xx through checks
- resources: backend CPU/RAM samples
- recovery: chat sync TTR
- raw evidence: k6 logs, summary JSON, CSV, Markdown table

## Prerequisites

Install k6 and make sure it is available in PATH:

```powershell
k6 version
```

Start backend on:

```text
http://localhost:8080
```

Use either a ready JWT:

```powershell
$env:TOKEN="your_access_token"
```

or a login account:

```powershell
$env:EMAIL="user@example.com"
$env:PASSWORD="password"
```

If login is blocked by new-device approval/OTP, use `TOKEN` for load testing.

Optional IDs:

```powershell
$env:CONVERSATION_ID="1"
$env:POST_ID="1"
```

## Run Main HTTP Workload

The main workload is for happy-path load metrics. It does not include planned
401/403 error cases by default, because those would pollute `error rate`.

```powershell
$env:BASE_URL="http://localhost:8080"
$env:VUS="20"
$env:DURATION="3m"
$env:WARMUP_DURATION="30s"

powershell -ExecutionPolicy Bypass -File tools/performance/run-k6-runs.ps1
```

The runner creates:

```text
tools/performance/results/<timestamp>/
  environment.md
  run-1-output.log
  run-1-summary.json
  run-2-output.log
  run-2-summary.json
  run-3-output.log
  run-3-summary.json
  summary-table.csv
  report-table.md
  backend-resource-samples.csv
```

Use `report-table.md` to copy results into your report.

## Run Error Cases Separately

```powershell
k6 run tools/performance/k6/error-cases.js
```

If you want to include planned error cases inside the main workload:

```powershell
$env:INCLUDE_ERROR_CASES="true"
```

For the report, keep planned business errors separate from system errors.

## Run Chat Recovery / Sync TTR

This measures how long `/user/chat/sync` takes to return missed messages.

```powershell
powershell -ExecutionPolicy Bypass -File tools/performance/run-k6-runs.ps1 `
  -Script tools/performance/k6/chat-sync-recovery.js `
  -Runs 3
```

For a real recovery test:

1. Make receiver offline.
2. Send messages to that receiver from another account.
3. Set `TOKEN` to the receiver token.
4. Run `chat-sync-recovery.js`.
5. Record `chat_sync_ttr_ms` and `chat_sync_messages_total`.

## Run WebSocket TTR

This measures:

```text
WebSocket close -> STOMP CONNECTED again -> /user/chat/sync completed
```

Use a normal user JWT:

```powershell
$env:TOKEN="your_access_token"
$env:BASE_URL="http://localhost:8080"
$env:RUNS="3"

node tools/performance/ws-ttr.mjs
```

Optional values:

```powershell
$env:WS_URL="ws://localhost:8080/ws"
$env:RECONNECT_DELAY_MS="5000"
$env:SYNC_LIMIT="100"
```

The script creates:

```text
tools/performance/results/ws-ttr-<timestamp>/
  ws-ttr-results.csv
  ws-ttr-raw.json
  ws-ttr-report.md
```

Use `ws-ttr-report.md` for the report row:

```text
TTR WebSocket disconnect -> CONNECT + sync (s)
```

## Run Redis TTR

This intentionally stops and starts Redis in a dev/test environment. Do not run
this against production Redis.

If Redis runs in Docker:

```powershell
powershell -ExecutionPolicy Bypass -File tools/performance/measure-redis-ttr.ps1 `
  -Mode Docker `
  -DockerContainer redis `
  -Runs 3
```

In Docker mode, the script uses `docker exec <container> redis-cli`, so the
Windows host does not need `redis-cli` in PATH.

If Redis runs as a Windows Service:

```powershell
powershell -ExecutionPolicy Bypass -File tools/performance/measure-redis-ttr.ps1 `
  -Mode Service `
  -ServiceName Redis `
  -Runs 3
```

If you want the script to also touch a presence key:

```powershell
powershell -ExecutionPolicy Bypass -File tools/performance/measure-redis-ttr.ps1 `
  -Mode Docker `
  -DockerContainer redis `
  -PresenceKey "presence:user:2" `
  -Runs 3
```

The script creates:

```text
tools/performance/results/redis-ttr-<timestamp>/
  redis-ttr-results.csv
  redis-ttr-report.md
```

Use `redis-ttr-report.md` for the report row:

```text
TTR Redis Redis UP -> thao tac Redis thanh cong (s)
```

## Resource Sampling

The runner tries to find the Spring Boot Java process automatically. If it cannot, pass the PID:

```powershell
Get-Process java | Select-Object Id,ProcessName,CPU,WorkingSet64

powershell -ExecutionPolicy Bypass -File tools/performance/run-k6-runs.ps1 -BackendPid 12345
```

CPU/RAM samples are written to:

```text
backend-resource-samples.csv
```

## Suggested Thresholds

For local testing:

| Metric | Suggested threshold |
|---|---:|
| Throughput | >= 50 RPS |
| p95 | < 500 ms |
| p99 | < 1000 ms |
| Error rate | < 1% |
| Check rate | >= 99% |
| CPU max | < 80% |
| Backend RAM max | < 1536 MB |
| Recovery TTR p95 | < 5000 ms |

## Useful Environment Commands

```powershell
powershell -ExecutionPolicy Bypass -File tools/performance/collect-environment.ps1
```

MySQL:

```sql
SELECT VERSION();
```

Redis:

```powershell
redis-cli --version
redis-cli INFO server
```

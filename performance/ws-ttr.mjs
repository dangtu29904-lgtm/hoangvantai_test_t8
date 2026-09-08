import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = (process.env.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const WS_URL = process.env.WS_URL || BASE_URL.replace(/^http/i, 'ws') + '/ws';
const TOKEN = process.env.TOKEN || process.env.AUTH_TOKEN || '';
const RUNS = Number(process.env.RUNS || 3);
const OUT_DIR = process.env.OUT_DIR || path.join(
  'tools',
  'performance',
  'results',
  `ws-ttr-${new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-')}`
);
const CONNECT_TIMEOUT_MS = Number(process.env.WS_CONNECT_TIMEOUT_MS || 10000);
const RECONNECT_DELAY_MS = Number(process.env.RECONNECT_DELAY_MS || 5000);
const SYNC_LIMIT = Number(process.env.SYNC_LIMIT || 100);

if (!TOKEN) {
  throw new Error('Set TOKEN or AUTH_TOKEN before running this script.');
}

if (typeof WebSocket === 'undefined') {
  throw new Error('This script requires Node.js with global WebSocket support. Use Node 20+.');
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const formatMs = (value) => Math.round(value * 100) / 100;

const percentileMedian = (values) => {
  const sorted = values
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const middle = Math.floor((sorted.length - 1) / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle] + sorted[middle + 1]) / 2;
};

const stompFrame = (command, headers = {}, body = '') => {
  const lines = [command];
  for (const [key, value] of Object.entries(headers)) {
    lines.push(`${key}:${value}`);
  }
  return `${lines.join('\n')}\n\n${body}\0`;
};

const parseFrames = (chunk) => String(chunk)
  .split('\0')
  .map((frame) => frame.trim())
  .filter(Boolean)
  .filter((frame) => frame !== '\n');

const connectStomp = () => new Promise((resolve, reject) => {
  const socket = new WebSocket(WS_URL);
  const startedAt = performance.now();
  const timeout = setTimeout(() => {
    try {
      socket.close();
    } catch {
      // Ignore close errors while timing out.
    }
    reject(new Error(`STOMP CONNECT timeout after ${CONNECT_TIMEOUT_MS}ms`));
  }, CONNECT_TIMEOUT_MS);

  socket.addEventListener('open', () => {
    socket.send(stompFrame('CONNECT', {
      Authorization: `Bearer ${TOKEN}`,
      'accept-version': '1.2',
      'heart-beat': '10000,10000'
    }));
  });

  socket.addEventListener('message', (event) => {
    for (const frame of parseFrames(event.data)) {
      if (frame.startsWith('CONNECTED')) {
        clearTimeout(timeout);
        resolve({
          socket,
          connectMs: performance.now() - startedAt
        });
        return;
      }

      if (frame.startsWith('ERROR')) {
        clearTimeout(timeout);
        reject(new Error(`STOMP ERROR frame: ${frame}`));
        return;
      }
    }
  });

  socket.addEventListener('error', () => {
    clearTimeout(timeout);
    reject(new Error('WebSocket error while connecting.'));
  });

  socket.addEventListener('close', (event) => {
    if (socket.readyState !== WebSocket.OPEN) {
      clearTimeout(timeout);
      reject(new Error(`WebSocket closed before CONNECTED. code=${event.code}`));
    }
  }, { once: true });
});

const closeSocket = (socket) => new Promise((resolve) => {
  const startedAt = performance.now();
  socket.addEventListener('close', () => resolve(performance.now() - startedAt), { once: true });
  socket.close(1000, 'ws-ttr-test');
});

const syncMessages = async () => {
  let afterMessageId = null;
  let syncedMessages = 0;
  let requestCount = 0;
  const startedAt = performance.now();
  let safety = 50;

  while (safety-- > 0) {
    const params = new URLSearchParams({ limit: String(SYNC_LIMIT) });
    if (afterMessageId != null) {
      params.set('afterMessageId', String(afterMessageId));
    }

    const response = await fetch(`${BASE_URL}/user/chat/sync?${params}`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    requestCount += 1;

    if (!response.ok) {
      throw new Error(`Sync failed. status=${response.status} body=${await response.text()}`);
    }

    const body = await response.json();
    const items = Array.isArray(body.items) ? body.items : [];
    syncedMessages += items.length;

    if (!body.hasMore) break;
    if (body.nextAfterMessageId == null || String(body.nextAfterMessageId) === String(afterMessageId)) break;
    afterMessageId = body.nextAfterMessageId;
  }

  return {
    syncMs: performance.now() - startedAt,
    syncedMessages,
    requestCount
  };
};

const runOnce = async (run) => {
  const initial = await connectStomp();
  const closeMs = await closeSocket(initial.socket);
  const disconnectedAt = performance.now();

  await delay(RECONNECT_DELAY_MS);

  const reconnect = await connectStomp();
  const sync = await syncMessages();
  const ttrMs = performance.now() - disconnectedAt;
  await closeSocket(reconnect.socket);

  return {
    run,
    reconnectDelayMs: RECONNECT_DELAY_MS,
    initialConnectMs: formatMs(initial.connectMs),
    closeMs: formatMs(closeMs),
    reconnectConnectMs: formatMs(reconnect.connectMs),
    syncMs: formatMs(sync.syncMs),
    ttrMs: formatMs(ttrMs),
    ttrSeconds: formatMs(ttrMs / 1000),
    syncRequests: sync.requestCount,
    syncedMessages: sync.syncedMessages
  };
};

fs.mkdirSync(OUT_DIR, { recursive: true });

const rows = [];
for (let run = 1; run <= RUNS; run += 1) {
  console.log(`Running WebSocket TTR run ${run}/${RUNS}...`);
  rows.push(await runOnce(run));
  await delay(1000);
}

const medianTtrMs = percentileMedian(rows.map((row) => row.ttrMs));
const medianTtrSeconds = medianTtrMs == null ? null : formatMs(medianTtrMs / 1000);

const csvHeaders = Object.keys(rows[0]);
const csv = [
  csvHeaders.join(','),
  ...rows.map((row) => csvHeaders.map((key) => JSON.stringify(row[key] ?? '')).join(','))
].join('\n');

const report = `# WebSocket TTR Result

Base URL: ${BASE_URL}
WebSocket URL: ${WS_URL}
Reconnect delay: ${RECONNECT_DELAY_MS} ms
Runs: ${RUNS}

| Metric | Run 1 | Run 2 | Run 3 | Median | Suggested threshold | Result |
|---|---:|---:|---:|---:|---:|---|
| TTR WebSocket (s) | ${rows[0]?.ttrSeconds ?? '-'} | ${rows[1]?.ttrSeconds ?? '-'} | ${rows[2]?.ttrSeconds ?? '-'} | ${medianTtrSeconds ?? '-'} | < 5 | PASS/FAIL |
| CONNECT after reconnect (ms) | ${rows[0]?.reconnectConnectMs ?? '-'} | ${rows[1]?.reconnectConnectMs ?? '-'} | ${rows[2]?.reconnectConnectMs ?? '-'} | ${formatMs(percentileMedian(rows.map((row) => row.reconnectConnectMs)) ?? NaN) || '-'} | record | - |
| Sync after reconnect (ms) | ${rows[0]?.syncMs ?? '-'} | ${rows[1]?.syncMs ?? '-'} | ${rows[2]?.syncMs ?? '-'} | ${formatMs(percentileMedian(rows.map((row) => row.syncMs)) ?? NaN) || '-'} | record | - |

TTR is measured from WebSocket close to STOMP CONNECTED + /user/chat/sync completed.
`;

fs.writeFileSync(path.join(OUT_DIR, 'ws-ttr-results.csv'), csv, 'utf8');
fs.writeFileSync(path.join(OUT_DIR, 'ws-ttr-raw.json'), JSON.stringify({ rows, medianTtrMs, medianTtrSeconds }, null, 2), 'utf8');
fs.writeFileSync(path.join(OUT_DIR, 'ws-ttr-report.md'), report, 'utf8');

console.log('');
console.log('Done.');
console.log(`Result directory: ${path.resolve(OUT_DIR)}`);
console.log(`CSV: ${path.resolve(OUT_DIR, 'ws-ttr-results.csv')}`);
console.log(`Report: ${path.resolve(OUT_DIR, 'ws-ttr-report.md')}`);
console.table(rows);
console.log(`Median TTR WebSocket: ${medianTtrSeconds}s`);

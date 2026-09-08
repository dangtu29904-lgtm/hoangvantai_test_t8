import path from 'node:path';
import {
  createResultDir,
  delay,
  formatNumber,
  nowMs,
  percentile,
  StompClient,
  writeArtifacts
} from './lib/stomp-utils.mjs';

const BASE_URL = (process.env.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const WS_URL = process.env.WS_URL || BASE_URL.replace(/^http/i, 'ws') + '/ws';
const RECIPIENT_TOKEN = process.env.RECIPIENT_TOKEN || process.env.TOKEN || process.env.AUTH_TOKEN || '';
const SENDER_TOKEN = process.env.SENDER_TOKEN || '';
const MESSAGE_IDS = (process.env.MESSAGE_IDS || '')
  .split(',')
  .map((id) => Number(id.trim()))
  .filter((id) => Number.isFinite(id) && id > 0);
const ACK_COUNT = Number(process.env.ACK_COUNT || MESSAGE_IDS.length || 0);
const DELIVERED_PERCENT = Number(process.env.DELIVERED_PERCENT || 80);
const ACK_RATE_PER_SECOND = Number(process.env.ACK_RATE_PER_SECOND || 5);
const ACK_TIMEOUT_MS = Number(process.env.ACK_TIMEOUT_MS || 5000);
const CONNECT_TIMEOUT_MS = Number(process.env.WS_CONNECT_TIMEOUT_MS || 10000);
const OUT_DIR = createResultDir('ws-delivered-seen', process.env.OUT_DIR || '');

if (!RECIPIENT_TOKEN) {
  throw new Error('Set RECIPIENT_TOKEN or TOKEN to the message recipient account.');
}
if (!SENDER_TOKEN) {
  throw new Error('Set SENDER_TOKEN to the original sender account so the script can measure delivered/seen response events.');
}
if (MESSAGE_IDS.length === 0 || ACK_COUNT === 0) {
  throw new Error('Set MESSAGE_IDS to message ids that belong to the sender/recipient conversation.');
}

const pending = new Map();
const rows = [];
const errors = [];
const clients = [];

const waitForAll = async (timeoutMs) => {
  const deadline = nowMs() + timeoutMs;
  while ([...pending.values()].some((items) => items.length > 0) && nowMs() < deadline) {
    await delay(50);
  }
};

try {
  const sender = new StompClient({
    token: SENDER_TOKEN,
    wsUrl: WS_URL,
    name: 'sender-observer',
    connectTimeoutMs: CONNECT_TIMEOUT_MS
  });
  await sender.connect();
  clients.push(sender);

  const recipient = new StompClient({
    token: RECIPIENT_TOKEN,
    wsUrl: WS_URL,
    name: 'recipient-acker',
    connectTimeoutMs: CONNECT_TIMEOUT_MS
  });
  await recipient.connect();
  clients.push(recipient);

  const handleStatus = (type) => (message) => {
    const messageIds = Array.isArray(message.messageIds) ? message.messageIds : [message.messageId];
    for (const messageId of messageIds) {
      const key = `${type}:${messageId}`;
      const queue = pending.get(key) || [];
      const pendingItem = queue.shift();
      if (queue.length === 0) {
        pending.delete(key);
      }
      if (!pendingItem) continue;

      rows.push({
        ackIndex: rows.length + 1,
        type,
        messageId,
        conversationId: message.conversationId ?? '',
        latencyMs: formatNumber(nowMs() - pendingItem.sentAtMs),
        status: 'ack'
      });
      pending.delete(key);
    }
  };

  sender.subscribe('/user/queue/messages.delivered', handleStatus('delivered'));
  sender.subscribe('/user/queue/messages.seen', handleStatus('seen'));
  sender.subscribe('/user/queue/errors', (error) => errors.push({ source: 'sender', error: JSON.stringify(error) }));
  recipient.subscribe('/user/queue/errors', (error) => errors.push({ source: 'recipient', error: JSON.stringify(error) }));
  sender.onError((error) => errors.push({ source: 'sender-stomp', error: JSON.stringify(error) }));
  recipient.onError((error) => errors.push({ source: 'recipient-stomp', error: JSON.stringify(error) }));

  const intervalMs = ACK_RATE_PER_SECOND > 0 ? 1000 / ACK_RATE_PER_SECOND : 0;

  for (let index = 0; index < ACK_COUNT; index += 1) {
    const messageId = MESSAGE_IDS[index % MESSAGE_IDS.length];
    const type = ((index * 100) / ACK_COUNT) < DELIVERED_PERCENT ? 'delivered' : 'seen';
    const destination = type === 'delivered' ? '/app/chat.delivered' : '/app/chat.seen';

    const key = `${type}:${messageId}`;
    const queue = pending.get(key) || [];
    queue.push({
      sentAtMs: nowMs(),
      type,
      messageId
    });
    pending.set(key, queue);

    recipient.send(destination, { messageId });

    if (intervalMs > 0) {
      await delay(intervalMs);
    }
  }

  await waitForAll(ACK_TIMEOUT_MS);

  for (const [key, queue] of pending.entries()) {
    for (const item of queue) {
      rows.push({
        ackIndex: rows.length + 1,
        type: item.type,
        messageId: item.messageId,
        conversationId: '',
        latencyMs: '',
        status: 'timeout'
      });
    }
    queue.length = 0;
    pending.delete(key);
  }

  const deliveredRows = rows.filter((row) => row.type === 'delivered' && row.status === 'ack');
  const seenRows = rows.filter((row) => row.type === 'seen' && row.status === 'ack');
  const deliveredLatencies = deliveredRows.map((row) => Number(row.latencyMs));
  const seenLatencies = seenRows.map((row) => Number(row.latencyMs));
  const timeoutCount = rows.filter((row) => row.status === 'timeout').length;

  const report = `# Delivered/Seen ACK Load Result

Base URL: ${BASE_URL}
WebSocket URL: ${WS_URL}
Message IDs: ${MESSAGE_IDS.join(', ')}
ACK count: ${ACK_COUNT}
Delivered/Seen mix: ${DELIVERED_PERCENT}% / ${100 - DELIVERED_PERCENT}%
ACK rate: ${ACK_RATE_PER_SECOND}/s
ACK timeout: ${ACK_TIMEOUT_MS} ms

| Metric | Value | Suggested threshold | Result |
|---|---:|---:|---|
| Delivered ACK success | ${deliveredRows.length} | record | - |
| Seen ACK success | ${seenRows.length} | record | - |
| Timeout count | ${timeoutCount} | 0 | PASS/FAIL |
| Delivered p95 (ms) | ${formatNumber(percentile(deliveredLatencies, 95))} | < 1000 | PASS/FAIL |
| Delivered p99 (ms) | ${formatNumber(percentile(deliveredLatencies, 99))} | < 1000 | PASS/FAIL |
| Seen p95 (ms) | ${formatNumber(percentile(seenLatencies, 95))} | < 1000 | PASS/FAIL |
| Seen p99 (ms) | ${formatNumber(percentile(seenLatencies, 99))} | < 1000 | PASS/FAIL |
| Error events | ${errors.length} | 0 | PASS/FAIL |

This script sends /app/chat.delivered and /app/chat.seen from the recipient socket, then measures sender-side /user/queue/messages.delivered and /user/queue/messages.seen events.
`;

  writeArtifacts(OUT_DIR, 'ws-delivered-seen-results', rows, report, {
    summary: {
      deliveredAckSuccess: deliveredRows.length,
      seenAckSuccess: seenRows.length,
      timeoutCount,
      deliveredP95Ms: formatNumber(percentile(deliveredLatencies, 95)),
      deliveredP99Ms: formatNumber(percentile(deliveredLatencies, 99)),
      seenP95Ms: formatNumber(percentile(seenLatencies, 95)),
      seenP99Ms: formatNumber(percentile(seenLatencies, 99)),
      errors
    }
  });

  console.log('');
  console.log('Done.');
  console.log(`Result directory: ${path.resolve(OUT_DIR)}`);
  console.log(`Report: ${path.resolve(OUT_DIR, 'ws-delivered-seen-results.md')}`);
} finally {
  await Promise.allSettled(clients.map((client) => client.close()));
}

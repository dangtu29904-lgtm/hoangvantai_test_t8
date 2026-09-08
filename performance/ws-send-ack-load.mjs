import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  createResultDir,
  delay,
  formatNumber,
  median,
  nowMs,
  percentile,
  StompClient,
  writeArtifacts
} from './lib/stomp-utils.mjs';

const BASE_URL = (process.env.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const WS_URL = process.env.WS_URL || BASE_URL.replace(/^http/i, 'ws') + '/ws';
const TOKENS = (process.env.SENDER_TOKENS || process.env.TOKENS || process.env.TOKEN || process.env.AUTH_TOKEN || '')
  .split(',')
  .map((token) => token.trim())
  .filter(Boolean);
const CONVERSATION_ID = Number(process.env.CONVERSATION_ID || 0);
const CONNECTIONS = Number(process.env.CONNECTIONS || TOKENS.length || 1);
const MESSAGES_PER_CONNECTION = Number(process.env.MESSAGES_PER_CONNECTION || 10);
const SEND_RATE_PER_SECOND = Number(process.env.SEND_RATE_PER_SECOND || 2);
const MESSAGE_SIZE = Number(process.env.MESSAGE_SIZE || 80);
const ACK_TIMEOUT_MS = Number(process.env.ACK_TIMEOUT_MS || 5000);
const CONNECT_TIMEOUT_MS = Number(process.env.WS_CONNECT_TIMEOUT_MS || 10000);
const OUT_DIR = createResultDir('ws-send-ack', process.env.OUT_DIR || '');

if (TOKENS.length === 0) {
  throw new Error('Set TOKEN, AUTH_TOKEN, TOKENS, or SENDER_TOKENS before running this script.');
}
if (!CONVERSATION_ID) {
  throw new Error('Set CONVERSATION_ID to a conversation where sender token(s) are members.');
}

const waitForAll = async (pending, timeoutMs) => {
  const deadline = nowMs() + timeoutMs;
  while (pending.size > 0 && nowMs() < deadline) {
    await delay(50);
  }
};

const clients = [];
const rows = [];
const pending = new Map();
const errors = [];
const totalMessages = CONNECTIONS * MESSAGES_PER_CONNECTION;
const contentBase = 'x'.repeat(Math.max(1, MESSAGE_SIZE));

try {
  for (let i = 0; i < CONNECTIONS; i += 1) {
    const token = TOKENS[i % TOKENS.length];
    const client = new StompClient({
      token,
      wsUrl: WS_URL,
      name: `sender-${i + 1}`,
      connectTimeoutMs: CONNECT_TIMEOUT_MS
    });
    await client.connect();

    client.subscribe('/user/queue/messages.ack', (message) => {
      const pendingItem = pending.get(message.clientMessageId);
      if (!pendingItem) return;

      const latencyMs = nowMs() - pendingItem.sentAtMs;
      rows.push({
        runMessageIndex: rows.length + 1,
        connection: pendingItem.connection,
        conversationId: message.conversationId,
        clientMessageId: message.clientMessageId,
        messageId: message.id ?? message.messageId ?? '',
        sequenceNumber: message.sequenceNumber ?? '',
        ackLatencyMs: formatNumber(latencyMs),
        status: 'ack'
      });
      pending.delete(message.clientMessageId);
    });

    client.subscribe('/user/queue/errors', (error) => {
      errors.push({
        atMs: formatNumber(nowMs()),
        connection: i + 1,
        error: JSON.stringify(error)
      });
    });

    client.onError((error) => {
      errors.push({
        atMs: formatNumber(nowMs()),
        connection: i + 1,
        error: JSON.stringify(error)
      });
    });

    clients.push(client);
  }

  const startedAt = nowMs();
  const intervalMs = SEND_RATE_PER_SECOND > 0 ? 1000 / SEND_RATE_PER_SECOND : 0;
  let sentCount = 0;

  for (let messageIndex = 0; messageIndex < MESSAGES_PER_CONNECTION; messageIndex += 1) {
    for (let connectionIndex = 0; connectionIndex < clients.length; connectionIndex += 1) {
      const clientMessageId = `perf-send-${Date.now()}-${connectionIndex + 1}-${messageIndex + 1}-${randomUUID()}`;
      pending.set(clientMessageId, {
        sentAtMs: nowMs(),
        connection: connectionIndex + 1
      });

      clients[connectionIndex].send('/app/chat.send', {
        conversationId: CONVERSATION_ID,
        clientMessageId,
        content: `${contentBase} #${messageIndex + 1}`,
        replyToMessageId: null,
        uploadIds: []
      });
      sentCount += 1;

      if (intervalMs > 0) {
        await delay(intervalMs);
      }
    }
  }

  await waitForAll(pending, ACK_TIMEOUT_MS);
  const finishedAt = nowMs();

  for (const [clientMessageId, item] of pending.entries()) {
    rows.push({
      runMessageIndex: rows.length + 1,
      connection: item.connection,
      conversationId: CONVERSATION_ID,
      clientMessageId,
      messageId: '',
      sequenceNumber: '',
      ackLatencyMs: '',
      status: 'timeout'
    });
  }

  const ackLatencies = rows
    .filter((row) => row.status === 'ack')
    .map((row) => Number(row.ackLatencyMs));
  const ackCount = rows.filter((row) => row.status === 'ack').length;
  const timeoutCount = rows.filter((row) => row.status === 'timeout').length;
  const durationSeconds = (finishedAt - startedAt) / 1000;
  const msgRate = sentCount / durationSeconds;

  const report = `# WebSocket Send/ACK Load Result

Base URL: ${BASE_URL}
WebSocket URL: ${WS_URL}
Conversation ID: ${CONVERSATION_ID}
Connections: ${CONNECTIONS}
Messages per connection: ${MESSAGES_PER_CONNECTION}
Configured send rate: ${SEND_RATE_PER_SECOND} msg/s
Message size: ${MESSAGE_SIZE} characters
ACK timeout: ${ACK_TIMEOUT_MS} ms

| Metric | Value | Suggested threshold | Result |
|---|---:|---:|---|
| Sent messages | ${sentCount} | record | - |
| ACK messages | ${ackCount} | ${totalMessages} | PASS/FAIL |
| Timeout messages | ${timeoutCount} | 0 | PASS/FAIL |
| Actual send rate (msg/s) | ${formatNumber(msgRate)} | record | - |
| send -> ACK p50 (ms) | ${formatNumber(percentile(ackLatencies, 50))} | record | - |
| send -> ACK p95 (ms) | ${formatNumber(percentile(ackLatencies, 95))} | < 1000 | PASS/FAIL |
| send -> ACK p99 (ms) | ${formatNumber(percentile(ackLatencies, 99))} | < 1000 | PASS/FAIL |
| Error events | ${errors.length} | 0 | PASS/FAIL |

This script sends STOMP messages to /app/chat.send and measures latency until /user/queue/messages.ack is received.
`;

  writeArtifacts(OUT_DIR, 'ws-send-ack-results', rows, report, {
    summary: {
      sentCount,
      ackCount,
      timeoutCount,
      actualSendRate: formatNumber(msgRate),
      p50Ms: formatNumber(percentile(ackLatencies, 50)),
      p95Ms: formatNumber(percentile(ackLatencies, 95)),
      p99Ms: formatNumber(percentile(ackLatencies, 99)),
      errors
    }
  });

  console.log('');
  console.log('Done.');
  console.log(`Result directory: ${path.resolve(OUT_DIR)}`);
  console.log(`Report: ${path.resolve(OUT_DIR, 'ws-send-ack-results.md')}`);
  console.log(`ACK p95: ${formatNumber(percentile(ackLatencies, 95))}ms`);
  console.log(`ACK p99: ${formatNumber(percentile(ackLatencies, 99))}ms`);
} finally {
  await Promise.allSettled(clients.map((client) => client.close()));
}

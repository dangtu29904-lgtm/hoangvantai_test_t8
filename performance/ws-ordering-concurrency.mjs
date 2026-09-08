import path from 'node:path';
import { randomUUID } from 'node:crypto';
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
const TOKENS = (process.env.SENDER_TOKENS || process.env.TOKENS || process.env.TOKEN || process.env.AUTH_TOKEN || '')
  .split(',')
  .map((token) => token.trim())
  .filter(Boolean);
const CONVERSATION_ID = Number(process.env.CONVERSATION_ID || 0);
const SENDERS = Number(process.env.SENDERS || TOKENS.length || 2);
const MESSAGES_PER_SENDER = Number(process.env.MESSAGES_PER_SENDER || 5);
const MESSAGE_SIZE = Number(process.env.MESSAGE_SIZE || 60);
const ACK_TIMEOUT_MS = Number(process.env.ACK_TIMEOUT_MS || 10000);
const CONNECT_TIMEOUT_MS = Number(process.env.WS_CONNECT_TIMEOUT_MS || 10000);
const OUT_DIR = createResultDir('ws-ordering-concurrency', process.env.OUT_DIR || '');

if (TOKENS.length === 0) {
  throw new Error('Set TOKEN, AUTH_TOKEN, TOKENS, or SENDER_TOKENS before running this script.');
}
if (!CONVERSATION_ID) {
  throw new Error('Set CONVERSATION_ID to a conversation where sender token(s) are members.');
}

const clients = [];
const pending = new Map();
const rows = [];
const errors = [];
const contentBase = 'c'.repeat(Math.max(1, MESSAGE_SIZE));

const waitForAll = async (timeoutMs) => {
  const deadline = nowMs() + timeoutMs;
  while (pending.size > 0 && nowMs() < deadline) {
    await delay(50);
  }
};

try {
  for (let i = 0; i < SENDERS; i += 1) {
    const client = new StompClient({
      token: TOKENS[i % TOKENS.length],
      wsUrl: WS_URL,
      name: `concurrent-sender-${i + 1}`,
      connectTimeoutMs: CONNECT_TIMEOUT_MS
    });
    await client.connect();

    client.subscribe('/user/queue/messages.ack', (message) => {
      const pendingItem = pending.get(message.clientMessageId);
      if (!pendingItem) return;

      rows.push({
        ackIndex: rows.length + 1,
        senderIndex: pendingItem.senderIndex,
        messageIndex: pendingItem.messageIndex,
        clientMessageId: message.clientMessageId,
        messageId: message.id ?? message.messageId ?? '',
        sequenceNumber: message.sequenceNumber ?? '',
        ackLatencyMs: formatNumber(nowMs() - pendingItem.sentAtMs),
        status: 'ack'
      });
      pending.delete(message.clientMessageId);
    });

    client.subscribe('/user/queue/errors', (error) => {
      errors.push({ senderIndex: i + 1, error: JSON.stringify(error) });
    });
    client.onError((error) => {
      errors.push({ senderIndex: i + 1, error: JSON.stringify(error) });
    });

    clients.push(client);
  }

  const startedAt = nowMs();
  const sendPromises = [];

  for (let senderIndex = 0; senderIndex < clients.length; senderIndex += 1) {
    sendPromises.push((async () => {
      for (let messageIndex = 1; messageIndex <= MESSAGES_PER_SENDER; messageIndex += 1) {
        const clientMessageId = `perf-order-${Date.now()}-${senderIndex + 1}-${messageIndex}-${randomUUID()}`;
        pending.set(clientMessageId, {
          senderIndex: senderIndex + 1,
          messageIndex,
          sentAtMs: nowMs()
        });

        clients[senderIndex].send('/app/chat.send', {
          conversationId: CONVERSATION_ID,
          clientMessageId,
          content: `${contentBase} sender=${senderIndex + 1} msg=${messageIndex}`,
          replyToMessageId: null,
          uploadIds: []
        });
      }
    })());
  }

  await Promise.all(sendPromises);
  await waitForAll(ACK_TIMEOUT_MS);
  const finishedAt = nowMs();

  for (const [clientMessageId, item] of pending.entries()) {
    rows.push({
      ackIndex: rows.length + 1,
      senderIndex: item.senderIndex,
      messageIndex: item.messageIndex,
      clientMessageId,
      messageId: '',
      sequenceNumber: '',
      ackLatencyMs: '',
      status: 'timeout'
    });
  }

  const ackRows = rows.filter((row) => row.status === 'ack');
  const timeoutCount = rows.filter((row) => row.status === 'timeout').length;
  const sequenceNumbers = ackRows
    .map((row) => Number(row.sequenceNumber))
    .filter((value) => Number.isFinite(value));
  const uniqueSequences = new Set(sequenceNumbers);
  const sequenceConflictCount = sequenceNumbers.length - uniqueSequences.size;
  const expectedTotal = SENDERS * MESSAGES_PER_SENDER;
  const messageRate = expectedTotal / ((finishedAt - startedAt) / 1000);
  const latencies = ackRows.map((row) => Number(row.ackLatencyMs));

  const sortedSequences = [...sequenceNumbers].sort((a, b) => a - b);
  const hasGaps = sortedSequences.some((value, index) => {
    if (index === 0) return false;
    return value !== sortedSequences[index - 1] + 1;
  });

  const report = `# Ordering Concurrency Result

Base URL: ${BASE_URL}
WebSocket URL: ${WS_URL}
Conversation ID: ${CONVERSATION_ID}
Concurrent senders: ${SENDERS}
Messages per sender: ${MESSAGES_PER_SENDER}
Total messages: ${expectedTotal}
Message size: ${MESSAGE_SIZE} characters
ACK timeout: ${ACK_TIMEOUT_MS} ms

| Metric | Value | Suggested threshold | Result |
|---|---:|---:|---|
| ACK messages | ${ackRows.length} | ${expectedTotal} | PASS/FAIL |
| Timeout messages | ${timeoutCount} | 0 | PASS/FAIL |
| Sequence conflict count | ${sequenceConflictCount} | 0 | PASS/FAIL |
| Sequence gap detected | ${hasGaps ? 'yes' : 'no'} | no | PASS/FAIL |
| Actual message rate (msg/s) | ${formatNumber(messageRate)} | record | - |
| ACK p95 (ms) | ${formatNumber(percentile(latencies, 95))} | < 1000 | PASS/FAIL |
| ACK p99 (ms) | ${formatNumber(percentile(latencies, 99))} | < 1000 | PASS/FAIL |
| Error events | ${errors.length} | 0 | PASS/FAIL |

This script opens concurrent sender sockets, sends messages into the same conversation at the same time, and checks sequenceNumber uniqueness from ACK responses.
`;

  writeArtifacts(OUT_DIR, 'ws-ordering-concurrency-results', rows, report, {
    summary: {
      ackCount: ackRows.length,
      timeoutCount,
      sequenceConflictCount,
      hasGaps,
      actualMessageRate: formatNumber(messageRate),
      ackP95Ms: formatNumber(percentile(latencies, 95)),
      ackP99Ms: formatNumber(percentile(latencies, 99)),
      errors
    }
  });

  console.log('');
  console.log('Done.');
  console.log(`Result directory: ${path.resolve(OUT_DIR)}`);
  console.log(`Report: ${path.resolve(OUT_DIR, 'ws-ordering-concurrency-results.md')}`);
  console.log(`Sequence conflicts: ${sequenceConflictCount}`);
} finally {
  await Promise.allSettled(clients.map((client) => client.close()));
}

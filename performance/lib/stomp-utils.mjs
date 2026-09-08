import fs from 'node:fs';
import path from 'node:path';

export const nowMs = () => performance.now();

export const formatNumber = (value, decimals = 2) => {
  if (!Number.isFinite(value)) return '-';
  return Number(value.toFixed(decimals));
};

export const percentile = (values, percent) => {
  const sorted = values
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];

  const index = (percent / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
};

export const median = (values) => percentile(values, 50);

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const createResultDir = (prefix, outDir = '') => {
  const target = outDir || path.join(
    'tools',
    'performance',
    'results',
    `${prefix}-${new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-')}`
  );
  fs.mkdirSync(target, { recursive: true });
  return target;
};

export const writeArtifacts = (outDir, baseName, rows, report, extra = {}) => {
  const csvHeaders = rows.length > 0 ? Object.keys(rows[0]) : [];
  const csv = [
    csvHeaders.join(','),
    ...rows.map((row) => csvHeaders.map((key) => JSON.stringify(row[key] ?? '')).join(','))
  ].join('\n');

  fs.writeFileSync(path.join(outDir, `${baseName}.csv`), csv, 'utf8');
  fs.writeFileSync(path.join(outDir, `${baseName}.json`), JSON.stringify({ rows, ...extra }, null, 2), 'utf8');
  fs.writeFileSync(path.join(outDir, `${baseName}.md`), report, 'utf8');
};

export const stompFrame = (command, headers = {}, body = '') => {
  const lines = [command];
  for (const [key, value] of Object.entries(headers)) {
    lines.push(`${key}:${value}`);
  }
  return `${lines.join('\n')}\n\n${body}\0`;
};

export const parseFrame = (rawFrame) => {
  const normalized = String(rawFrame).replace(/\r\n/g, '\n');
  const [head = '', ...bodyParts] = normalized.split('\n\n');
  const headLines = head.split('\n').filter(Boolean);
  const command = headLines.shift() || '';
  const headers = {};

  for (const line of headLines) {
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    headers[line.slice(0, separator)] = line.slice(separator + 1);
  }

  const rawBody = bodyParts.join('\n\n');
  const body = rawBody.endsWith('\0') ? rawBody.slice(0, -1) : rawBody;
  let json = null;
  if (body) {
    try {
      json = JSON.parse(body);
    } catch {
      json = null;
    }
  }

  return { command, headers, body, json };
};

export const splitFrames = (chunk) => String(chunk)
  .split('\0')
  .map((frame) => frame.trim())
  .filter(Boolean)
  .filter((frame) => frame !== '\n');

export class StompClient {
  constructor({ token, wsUrl, name = 'client', connectTimeoutMs = 10000 }) {
    this.token = token;
    this.wsUrl = wsUrl;
    this.name = name;
    this.connectTimeoutMs = connectTimeoutMs;
    this.socket = null;
    this.handlers = new Map();
    this.subscriptionCounter = 0;
  }

  async connect() {
    if (typeof WebSocket === 'undefined') {
      throw new Error('This script requires Node.js with global WebSocket support. Use Node 20+.');
    }

    const startedAt = nowMs();
    this.socket = new WebSocket(this.wsUrl);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`${this.name} STOMP CONNECT timeout after ${this.connectTimeoutMs}ms`));
      }, this.connectTimeoutMs);

      this.socket.addEventListener('open', () => {
        this.socket.send(stompFrame('CONNECT', {
          Authorization: `Bearer ${this.token}`,
          'accept-version': '1.2',
          'heart-beat': '10000,10000'
        }));
      });

      this.socket.addEventListener('message', (event) => {
        for (const raw of splitFrames(event.data)) {
          const frame = parseFrame(raw);
          if (frame.command === 'CONNECTED') {
            clearTimeout(timeout);
            resolve();
            return;
          }
          if (frame.command === 'ERROR') {
            clearTimeout(timeout);
            reject(new Error(`${this.name} STOMP ERROR: ${frame.body || frame.headers.message || 'unknown error'}`));
            return;
          }
        }
      });

      this.socket.addEventListener('error', () => {
        clearTimeout(timeout);
        reject(new Error(`${this.name} WebSocket error while connecting.`));
      });

      this.socket.addEventListener('close', (event) => {
        if (this.socket.readyState !== WebSocket.OPEN) {
          clearTimeout(timeout);
          reject(new Error(`${this.name} WebSocket closed before CONNECTED. code=${event.code}`));
        }
      }, { once: true });
    });

    this.socket.addEventListener('message', (event) => {
      for (const raw of splitFrames(event.data)) {
        const frame = parseFrame(raw);
        if (frame.command === 'MESSAGE') {
          const destination = frame.headers.destination || '';
          const callbacks = this.handlers.get(destination) || [];
          callbacks.forEach((callback) => callback(frame.json ?? frame.body, frame));
        } else if (frame.command === 'ERROR') {
          const callbacks = this.handlers.get('__error__') || [];
          callbacks.forEach((callback) => callback(frame.json ?? frame.body, frame));
        }
      }
    });

    return nowMs() - startedAt;
  }

  subscribe(destination, callback) {
    if (!this.handlers.has(destination)) {
      this.handlers.set(destination, []);
    }
    this.handlers.get(destination).push(callback);

    this.subscriptionCounter += 1;
    this.socket.send(stompFrame('SUBSCRIBE', {
      id: `${this.name}-sub-${this.subscriptionCounter}`,
      destination
    }));
  }

  onError(callback) {
    if (!this.handlers.has('__error__')) {
      this.handlers.set('__error__', []);
    }
    this.handlers.get('__error__').push(callback);
  }

  send(destination, body) {
    this.socket.send(stompFrame('SEND', {
      destination,
      'content-type': 'application/json'
    }, JSON.stringify(body)));
  }

  close(reason = 'performance-test') {
    return new Promise((resolve) => {
      if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
        resolve();
        return;
      }
      this.socket.addEventListener('close', () => resolve(), { once: true });
      this.socket.close(1000, reason);
    });
  }
}

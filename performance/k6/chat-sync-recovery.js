import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const TOKEN = __ENV.TOKEN || __ENV.AUTH_TOKEN || '';
const EMAIL = __ENV.EMAIL || '';
const PASSWORD = __ENV.PASSWORD || '';
const LIMIT = Number(__ENV.SYNC_LIMIT || 100);

export const syncTtrMs = new Trend('chat_sync_ttr_ms', true);
export const syncedMessages = new Counter('chat_sync_messages_total');

export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  scenarios: {
    recovery: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 1),
      duration: __ENV.DURATION || '30s',
      exec: 'recovery'
    }
  },
  thresholds: {
    chat_sync_ttr_ms: [`p(95)<${Number(__ENV.TTR_THRESHOLD_MS || 5000)}`],
    http_req_failed: [`rate<${Number(__ENV.ERROR_RATE_THRESHOLD || 0.01)}`],
    checks: [`rate>${Number(__ENV.CHECK_RATE_THRESHOLD || 0.99)}`]
  }
};

const parseJson = (res) => {
  try {
    return res.json();
  } catch {
    return null;
  }
};

const login = () => {
  if (TOKEN) return TOKEN;
  if (!EMAIL || !PASSWORD) {
    throw new Error('Set TOKEN or EMAIL/PASSWORD before running this test.');
  }

  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      deviceId: `k6-recovery-${Date.now()}`,
      deviceName: 'k6 recovery test',
      deviceType: 'load-test',
      browser: 'k6',
      os: 'load-test'
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'POST /auth/login', phase: 'setup' }
    }
  );

  const ok = check(res, {
    'login status is 200': (r) => r.status === 200,
    'login returns token': (r) => Boolean(parseJson(r)?.token)
  });

  if (!ok) {
    throw new Error(`Login failed. status=${res.status} body=${res.body}`);
  }

  return parseJson(res).token;
};

export function setup() {
  return { token: login() };
}

export function recovery(data) {
  let afterMessageId = __ENV.AFTER_MESSAGE_ID || null;
  let total = 0;
  const startedAt = Date.now();
  let safety = 50;

  while (safety-- > 0) {
    const query = afterMessageId
      ? `afterMessageId=${afterMessageId}&limit=${LIMIT}`
      : `limit=${LIMIT}`;

    const res = http.get(`${BASE_URL}/user/chat/sync?${query}`, {
      headers: {
        Authorization: `Bearer ${data.token}`,
        'Content-Type': 'application/json'
      },
      tags: { name: 'GET /user/chat/sync' }
    });

    const ok = check(res, {
      'sync status is 200': (r) => r.status === 200,
      'sync returns items array': (r) => Array.isArray(parseJson(r)?.items)
    });

    if (!ok) break;

    const body = parseJson(res);
    const items = body.items || [];
    total += items.length;

    if (!body.hasMore) break;
    if (body.nextAfterMessageId == null || String(body.nextAfterMessageId) === String(afterMessageId)) break;
    afterMessageId = body.nextAfterMessageId;
  }

  syncTtrMs.add(Date.now() - startedAt);
  syncedMessages.add(total);
  sleep(Number(__ENV.SLEEP_SECONDS || 1));
}

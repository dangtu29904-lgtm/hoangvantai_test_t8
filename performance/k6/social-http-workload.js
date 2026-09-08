import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';
import { Counter } from 'k6/metrics';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const TOKEN = __ENV.TOKEN || __ENV.AUTH_TOKEN || '';
const EMAIL = __ENV.EMAIL || '';
const PASSWORD = __ENV.PASSWORD || '';
const CONVERSATION_ID = __ENV.CONVERSATION_ID || '';
const POST_ID = __ENV.POST_ID || '';
const INCLUDE_ERROR_CASES = String(__ENV.INCLUDE_ERROR_CASES || 'false').toLowerCase() === 'true';

const LOAD_VUS = Number(__ENV.VUS || 20);
const WARMUP_VUS = Number(__ENV.WARMUP_VUS || Math.max(1, Math.floor(LOAD_VUS / 4)));
const WARMUP_DURATION = __ENV.WARMUP_DURATION || '30s';
const DURATION = __ENV.DURATION || '3m';

const P95_THRESHOLD_MS = Number(__ENV.P95_THRESHOLD_MS || 500);
const P99_THRESHOLD_MS = Number(__ENV.P99_THRESHOLD_MS || 1000);
const ERROR_RATE_THRESHOLD = Number(__ENV.ERROR_RATE_THRESHOLD || 0.01);
const CHECK_RATE_THRESHOLD = Number(__ENV.CHECK_RATE_THRESHOLD || 0.99);

export const businessErrors = new Counter('business_error_count');
export const authErrors = new Counter('auth_error_count');

export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  scenarios: {
    warmup: {
      executor: 'constant-vus',
      vus: WARMUP_VUS,
      duration: WARMUP_DURATION,
      exec: 'workload',
      tags: { phase: 'warmup' }
    },
    load: {
      executor: 'constant-vus',
      vus: LOAD_VUS,
      duration: DURATION,
      startTime: WARMUP_DURATION,
      exec: 'workload',
      tags: { phase: 'load' }
    }
  },
  thresholds: {
    'http_req_duration{phase:load}': [
      `p(95)<${P95_THRESHOLD_MS}`,
      `p(99)<${P99_THRESHOLD_MS}`
    ],
    'http_req_failed{phase:load}': [`rate<${ERROR_RATE_THRESHOLD}`],
    'checks{phase:load}': [`rate>${CHECK_RATE_THRESHOLD}`]
  }
};

const jsonHeaders = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`
});

const getJson = (url, token, name) => (
  http.get(url, {
    headers: jsonHeaders(token),
    tags: { name }
  })
);

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
      deviceId: `k6-${Date.now()}`,
      deviceName: 'k6 load generator',
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
  const token = login();
  return { token };
}

const weightedPick = () => {
  const roll = Math.random() * 100;
  if (roll < 35) return 'feed';
  if (roll < 55) return 'conversations';
  if (roll < 70) return 'profile';
  if (roll < 82) return 'notifications';
  if (roll < 92) return 'messages';
  if (roll < 98 || !INCLUDE_ERROR_CASES) return 'post_reactions';
  return 'error_unauthorized';
};

export function workload(data) {
  const token = data.token;
  const action = weightedPick();
  let res;

  if (action === 'feed') {
    const page = exec.scenario.iterationInTest % 5;
    res = getJson(`${BASE_URL}/user/feed?page=${page}&limit=20`, token, 'GET /user/feed');
    check(res, { 'feed 200': (r) => r.status === 200 });
  }

  if (action === 'conversations') {
    res = getJson(`${BASE_URL}/user/conversations?limit=20`, token, 'GET /user/conversations');
    check(res, { 'conversations 200': (r) => r.status === 200 });
  }

  if (action === 'profile') {
    res = getJson(`${BASE_URL}/user/profile/me`, token, 'GET /user/profile/me');
    check(res, { 'profile 200': (r) => r.status === 200 });
  }

  if (action === 'notifications') {
    res = getJson(`${BASE_URL}/user/notifications/unread-count`, token, 'GET /user/notifications/unread-count');
    check(res, { 'notifications unread 200': (r) => r.status === 200 });
  }

  if (action === 'messages') {
    if (!CONVERSATION_ID) {
      res = getJson(`${BASE_URL}/user/conversations?limit=20`, token, 'GET /user/conversations');
      check(res, { 'messages fallback conversations 200': (r) => r.status === 200 });
    } else {
      res = getJson(
        `${BASE_URL}/user/conversations/${CONVERSATION_ID}/messages?limit=30`,
        token,
        'GET /user/conversations/:id/messages'
      );
      check(res, { 'messages 200': (r) => r.status === 200 });
    }
  }

  if (action === 'post_reactions') {
    if (!POST_ID) {
      res = getJson(`${BASE_URL}/user/feed?page=0&limit=10`, token, 'GET /user/feed');
      check(res, { 'reaction fallback feed 200': (r) => r.status === 200 });
    } else {
      res = getJson(`${BASE_URL}/user/feed/${POST_ID}/reactions?page=0&limit=20`, token, 'GET /user/feed/:id/reactions');
      check(res, { 'reactions 200': (r) => r.status === 200 });
    }
  }

  if (action === 'error_unauthorized') {
    res = http.get(`${BASE_URL}/user/profile/me`, {
      tags: { name: 'GET /user/profile/me unauthorized' }
    });
    const ok = check(res, { 'unauthorized returns 401/403': (r) => r.status === 401 || r.status === 403 });
    if (!ok) authErrors.add(1);
  }

  if (res && res.status >= 400 && action !== 'error_unauthorized') {
    businessErrors.add(1);
  }

  sleep(Number(__ENV.SLEEP_SECONDS || 0.3));
}

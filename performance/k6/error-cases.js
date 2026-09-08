import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const TOKEN = __ENV.TOKEN || __ENV.AUTH_TOKEN || '';

export const options = {
  vus: Number(__ENV.VUS || 1),
  duration: __ENV.DURATION || '30s',
  thresholds: {
    checks: [`rate>${Number(__ENV.CHECK_RATE_THRESHOLD || 0.99)}`]
  }
};

export default function () {
  const noAuth = http.get(`${BASE_URL}/user/profile/me`, {
    tags: { name: 'GET /user/profile/me unauthorized' }
  });

  check(noAuth, {
    'no token returns 401/403': (r) => r.status === 401 || r.status === 403
  });

  if (TOKEN) {
    const badConversation = http.get(`${BASE_URL}/user/conversations/-1/messages?limit=30`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      tags: { name: 'GET /user/conversations/:bad/messages' }
    });

    check(badConversation, {
      'bad conversation returns 400/403/404': (r) => [400, 403, 404].includes(r.status)
    });
  }

  sleep(Number(__ENV.SLEEP_SECONDS || 1));
}

/**
 * Scenario: verify invalid credentials are rejected without issuing a token.
 * Expected authentication errors are tracked as functional checks and excluded
 * from http_req_failed so intentional 4xx responses do not fail the SLA.
 */
import { check, group, sleep } from 'k6';
import { BASE_URL, TEST_USER } from '../config/environment.js';
import { login } from '../utils/api-client.js';
import { generateHtmlReport, generateTextSummary, generateDashboard, generateDashboardData } from '../utils/reporter.js';

export const options = {
  stages: [
    { duration: '5s', target: 5 },
    { duration: '10s', target: 5 },
    { duration: '5s', target: 0 }
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<300', 'p(99)<500']
  }
};

export default function () {
  group('Invalid credentials are rejected', () => {
    const res = login(TEST_USER.username, `${TEST_USER.password}-invalid`);
    check(res, {
      'Invalid login returns 4xx': (r) => r.status >= 400 && r.status < 500,
      'Invalid login does not return an access token': (r) => {
        try {
          const body = JSON.parse(r.body);
          return !(body.data && body.data.token);
        } catch (_) { return true; }
      }
    });
  });
  sleep(0.3);
}

export function handleSummary(data) {
  const reportOptions = {
    reportKey: 'invalid-login',
    testName: 'Invalid Login Testing (Kiem thu dang nhap sai)',
    scenarioType: 'Invalid Login (5 VUs)',
    targetUrl: BASE_URL
  };
  return {
    'reports/index.html': generateDashboard(),
    'reports/invalid-login-test-data.js': generateDashboardData(data, reportOptions),
    'reports/invalid-login-test-report.html': generateHtmlReport(data, reportOptions),
    'reports/invalid-login-test-summary.json': JSON.stringify(data, null, 2),
    stdout: generateTextSummary(data, reportOptions)
  };
}

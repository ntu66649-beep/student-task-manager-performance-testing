/**
 * Scenario: pagination contract and performance probe.
 * Sends page/limit parameters and validates metadata when the API returns it.
 * The existing project documents that pagination may not yet be implemented;
 * response data remains observable in checks instead of assuming support.
 */
import { check, group, sleep } from 'k6';
import { BASE_URL, THRESHOLDS, TEST_USER } from '../config/environment.js';
import { login, getTasks } from '../utils/api-client.js';
import { generateHtmlReport, generateTextSummary, generateDashboard, generateDashboardData } from '../utils/reporter.js';

export const options = {
  stages: [
    { duration: '5s', target: 5 },
    { duration: '10s', target: 5 },
    { duration: '5s', target: 0 }
  ],
  thresholds: THRESHOLDS.SMOKE
};

export default function () {
  let token = '';
  group('01. Login', () => {
    const res = login(TEST_USER.username, TEST_USER.password);
    check(res, {
      'Login returns 200': (r) => r.status === 200,
      'Login returns token': (r) => {
        try {
          token = JSON.parse(r.body).data.token;
          return Boolean(token);
        } catch (_) { return false; }
      }
    });
  });

  if (token) {
    group('02. Paginated task list', () => {
      const first = getTasks(token, { page: 1, limit: 10 });
      check(first, {
        'Page 1 returns 200': (r) => r.status === 200,
        'Page 1 returns task array': (r) => {
          try { return Array.isArray(JSON.parse(r.body).data); } catch (_) { return false; }
        },
        'Page size does not exceed limit when pagination is implemented': (r) => {
          try {
            const body = JSON.parse(r.body);
            return !Array.isArray(body.data) || body.data.length <= 10;
          } catch (_) { return false; }
        }
      });

      const second = getTasks(token, { page: 2, limit: 10 });
      check(second, {
        'Page 2 returns 200': (r) => r.status === 200,
        'Page 2 returns task array': (r) => {
          try { return Array.isArray(JSON.parse(r.body).data); } catch (_) { return false; }
        }
      });
    });
  }
  sleep(0.3);
}

export function handleSummary(data) {
  const reportOptions = {
    reportKey: 'pagination',
    testName: 'Pagination Testing (Kiem thu phan trang)',
    scenarioType: 'Pagination Probe (5 VUs)',
    targetUrl: BASE_URL
  };
  return {
    'reports/index.html': generateDashboard(),
    'reports/pagination-test-data.js': generateDashboardData(data, reportOptions),
    'reports/pagination-test-report.html': generateHtmlReport(data, reportOptions),
    'reports/pagination-test-summary.json': JSON.stringify(data, null, 2),
    stdout: generateTextSummary(data, reportOptions)
  };
}

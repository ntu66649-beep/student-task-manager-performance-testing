/**
 * Kich ban 1: Smoke Testing (Kiem thu khoi tao - Sanity Test)
 * 
 * Muc tieu:
 * - Xac minh tinh san sang va do on dinh cua he thong REST API Student Task Manager.
 * - Kiem tra xem tat ca cac endpoint co ban co hoat dong dung ma khong bi loi 5xx/4xx khong.
 * - Su dung muc tai thap: Tu 1 den 5 nguoi dung ao (5 VUs).
 * 
 * Mon hoc: SWT301
 */

import { check, sleep, group } from 'k6';
import { BASE_URL, THRESHOLDS, TEST_USER } from '../config/environment.js';
import { generateTaskPayload } from '../data/test-payloads.js';
import { checkHealth, login, getTasks, getTaskById, createTask } from '../utils/api-client.js';
import { generateHtmlReport, generateTextSummary, generateDashboard, generateDashboardData } from '../utils/reporter.js';

export const options = {
  stages: [
    { duration: '5s', target: 5 },   // Tang dan len 5 VUs trong 5 giay
    { duration: '10s', target: 5 },  // Duy tri 5 VUs trong 10 giay
    { duration: '5s', target: 0 }    // Giam dan ve 0 VU trong 5 giay
  ],
  thresholds: THRESHOLDS.SMOKE
};

export default function () {
  let authToken = '';

  // 1. Kiem tra Health Check
  group('01. Health Check', function () {
    const res = checkHealth();
    check(res, {
      'Health Check - Status 200': (r) => r.status === 200,
      'Health Check - May chu UP': (r) => {
        try {
          return JSON.parse(r.body).status === 'UP';
        } catch (e) {
          return false;
        }
      }
    });
  });

  sleep(0.3);

  // 2. Dang nhap lay Token
  group('02. Authentication Login', function () {
    const res = login(TEST_USER.username, TEST_USER.password);
    const loginOk = check(res, {
      'Dang nhap - Status 200': (r) => r.status === 200,
      'Dang nhap - Co token': (r) => {
        try {
          const body = JSON.parse(r.body);
          if (body.data && body.data.token) {
            authToken = body.data.token;
            return true;
          }
          return false;
        } catch (e) {
          return false;
        }
      }
    });
  });

  sleep(0.3);

  // 3. Lay danh sach nhiem vu
  group('03. Get Task List', function () {
    const res = getTasks(authToken);
    check(res, {
      'Danh sach task - Status 200': (r) => r.status === 200,
      'Danh sach task - Co du lieu hop le': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true && Array.isArray(body.data);
        } catch (e) {
          return false;
        }
      }
    });
  });

  sleep(0.3);

  // 4. Xem chi tiet nhiem vu ID 1
  group('04. Get Task Detail', function () {
    const res = getTaskById(authToken, 1);
    check(res, {
      'Chi tiet task - Status 200': (r) => r.status === 200,
      'Chi tiet task - Dung ID 1': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true && body.data.id === 1;
        } catch (e) {
          return false;
        }
      }
    });
  });

  sleep(0.3);

  // 5. Tao moi mot nhiem vu mau
  group('05. Create New Task', function () {
    const payload = generateTaskPayload(__VU, __ITER);
    const res = createTask(authToken, payload);
    check(res, {
      'Tao task - Status 201': (r) => r.status === 201,
      'Tao task - Tao thanh cong': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true && body.data && body.data.id !== undefined;
        } catch (e) {
          return false;
        }
      }
    });
  });

  sleep(0.5);
}

export function handleSummary(data) {
  const reportOptions = {
    reportKey: 'smoke',
    testName: 'Smoke Testing (Kiem thu khoi tao)',
    scenarioType: 'Smoke Test (5 Nguoi dung ao - 5 VUs)',
    targetUrl: BASE_URL
  };

  return {
    'reports/index.html': generateDashboard(),
    'reports/smoke-test-data.js': generateDashboardData(data, reportOptions),
    'reports/smoke-test-report.html': generateHtmlReport(data, reportOptions),
    'reports/smoke-test-summary.json': JSON.stringify(data, null, 2),
    stdout: generateTextSummary(data, reportOptions)
  };
}

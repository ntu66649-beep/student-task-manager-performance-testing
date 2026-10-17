/**
 * Kich ban 2: Load Testing (Kiem thu tai thong thuong)
 * 
 * Muc tieu:
 * - Danh gia hieu nang he thong o muc tai du kien thong thuong (Normal Expected Load).
 * - Mo phong 10 nguoi dung ao (10 VUs) dong thoi truy cap va thao tac tren REST API.
 * - Do luong Response Time, Throughput (req/s), Error Rate duoi tai on dinh.
 * 
 * Mon hoc: SWT301
 */

import { check, sleep, group } from 'k6';
import { BASE_URL, THRESHOLDS, TEST_USER } from '../config/environment.js';
import { generateTaskPayload, UPDATE_TASK_PAYLOAD } from '../data/test-payloads.js';
import { checkHealth, login, getTasks, getTaskById, createTask, updateTask } from '../utils/api-client.js';
import { generateHtmlReport, generateTextSummary } from '../utils/reporter.js';

export const options = {
  stages: [
    { duration: '10s', target: 10 }, // Ramp-up: Tang tu 0 len 10 VUs trong 10 giay
    { duration: '20s', target: 10 }, // Plateau: Duy tri tai on dinh 10 VUs trong 20 giay
    { duration: '10s', target: 0 }   // Ramp-down: Giam dan tu 10 ve 0 VU trong 10 giay
  ],
  thresholds: THRESHOLDS.LOAD
};

export default function () {
  let authToken = '';
  let createdTaskId = null;

  // 1. Kiem tra trang thai may chu
  group('01. Health Check', function () {
    const res = checkHealth();
    check(res, {
      'Health Check - Status 200': (r) => r.status === 200
    });
  });

  sleep(0.2);

  // 2. Dang nhap nguoi dung de lay Bearer Token
  group('02. User Authentication', function () {
    const res = login(TEST_USER.username, TEST_USER.password);
    check(res, {
      'Dang nhap - Status 200': (r) => r.status === 200,
      'Dang nhap - Nhan duoc Token': (r) => {
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

  sleep(0.2);

  // 3. Lay toan bo danh sach nhiem vu
  group('03. Retrieve All Tasks', function () {
    const res = getTasks(authToken);
    check(res, {
      'Danh sach task - Status 200': (r) => r.status === 200,
      'Danh sach task - Mang du lieu hop le': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true && Array.isArray(body.data);
        } catch (e) {
          return false;
        }
      }
    });
  });

  sleep(0.2);

  // 4. Loc nhiem vu theo trang thai TODO
  group('04. Filter Tasks by Status', function () {
    const res = getTasks(authToken, { status: 'TODO' });
    check(res, {
      'Loc task TODO - Status 200': (r) => r.status === 200,
      'Loc task TODO - Du lieu phan hoi dung': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true && Array.isArray(body.data);
        } catch (e) {
          return false;
        }
      }
    });
  });

  sleep(0.2);

  // 5. Xem chi tiet mot nhiem vu co san
  group('05. Get Task Details', function () {
    const res = getTaskById(authToken, 1);
    check(res, {
      'Chi tiet task - Status 200': (r) => r.status === 200,
      'Chi tiet task - ID khop': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true && body.data && body.data.id === 1;
        } catch (e) {
          return false;
        }
      }
    });
  });

  sleep(0.2);

  // 6. Tao moi mot nhiem vu hoc tap
  group('06. Create Task', function () {
    const payload = generateTaskPayload(__VU, __ITER);
    const res = createTask(authToken, payload);
    check(res, {
      'Tao task - Status 201': (r) => r.status === 201,
      'Tao task - ID hop le': (r) => {
        try {
          const body = JSON.parse(r.body);
          if (body.success === true && body.data && body.data.id) {
            createdTaskId = body.data.id;
            return true;
          }
          return false;
        } catch (e) {
          return false;
        }
      }
    });
  });

  sleep(0.2);

  // 7. Cap nhat thong tin nhiem vu
  group('07. Update Task', function () {
    const targetId = createdTaskId || 1;
    const res = updateTask(authToken, targetId, UPDATE_TASK_PAYLOAD);
    check(res, {
      'Cap nhat task - Status 200': (r) => r.status === 200,
      'Cap nhat task - Thanh cong': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true;
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
    testName: 'Load Testing (Kiem thu tai thong thuong)',
    scenarioType: 'Load Test (10 Nguoi dung ao - 10 VUs)',
    targetUrl: BASE_URL
  };

  return {
    'reports/load-test-report.html': generateHtmlReport(data, reportOptions),
    'reports/load-test-summary.json': JSON.stringify(data, null, 2),
    stdout: generateTextSummary(data, reportOptions)
  };
}

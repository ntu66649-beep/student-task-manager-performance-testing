/**
 * Kich ban 3: Stress Testing (Kiem thu do chiu tai toi han)
 * 
 * Muc tieu:
 * - Kiem tra gioi han chiu tai va do on dinh cua backend khi so luong yeu cau tang dot bien.
 * - Mo phong 20 nguoi dung ao (20 VUs) thuc hien thao tac lien tuc voi chu ky ngan.
 * - Xac dinh xem he thong co gap hien tuong nghean co chai (bottleneck), suy giam toc do hoac phat sinh loi 5xx khong.
 * - Kiem tra kha nang tu hoi phuc (recovery) cua ung dung sau khi tai giam ve muc binh thuong.
 * 
 * Mon hoc: SWT301
 */

import { check, sleep, group } from 'k6';
import { BASE_URL, THRESHOLDS, TEST_USER } from '../config/environment.js';
import { generateTaskPayload, UPDATE_TASK_PAYLOAD } from '../data/test-payloads.js';
import { checkHealth, login, getTasks, getTaskById, createTask, updateTask, deleteTask } from '../utils/api-client.js';
import { generateHtmlReport, generateTextSummary } from '../utils/reporter.js';

export const options = {
  stages: [
    { duration: '10s', target: 10 }, // Giai doan 1: Ramp-up len 10 VUs
    { duration: '15s', target: 20 }, // Giai doan 2: Tang dot bien len 20 VUs (Muc tai toi han)
    { duration: '20s', target: 20 }, // Giai doan 3: Duy tri lien tuc tai muc dinh 20 VUs
    { duration: '15s', target: 0 }   // Giai doan 4: Ramp-down giam ve 0 VU de kiem tra phuc hoi
  ],
  thresholds: THRESHOLDS.STRESS
};

export default function () {
  let authToken = '';
  let createdId = null;

  // 1. Health Check duoi tai cao
  group('01. Health Check Under Stress', function () {
    const res = checkHealth();
    check(res, {
      'Health Check - Phuc dap 200': (r) => r.status === 200
    });
  });

  sleep(0.1);

  // 2. Dang nhap dong thoi
  group('02. Concurrent Authentication', function () {
    const res = login(TEST_USER.username, TEST_USER.password);
    check(res, {
      'Dang nhap - Status 200': (r) => r.status === 200,
      'Dang nhap - Co Bearer Token': (r) => {
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

  sleep(0.1);

  // 3. Truy van danh sach voi query filter dong
  group('03. Stress Queries & Filters', function () {
    const resAll = getTasks(authToken);
    check(resAll, {
      'Query tat ca tasks - Status 200': (r) => r.status === 200
    });

    const resFilter = getTasks(authToken, { status: 'TODO', course: 'SWT301' });
    check(resFilter, {
      'Query loc task - Status 200': (r) => r.status === 200
    });
  });

  sleep(0.1);

  // 4. Xem chi tiet task
  group('04. Get Task By ID', function () {
    const res = getTaskById(authToken, 1);
    check(res, {
      'Chi tiet task - Status 200': (r) => r.status === 200
    });
  });

  sleep(0.1);

  // 5. Ghi du lieu dong thoi: Tao moi nhiem vu
  group('05. Concurrent Create Task', function () {
    const payload = generateTaskPayload(__VU, __ITER);
    const res = createTask(authToken, payload);
    check(res, {
      'Tao task - Status 201': (r) => r.status === 201,
      'Tao task - Co ID phan hoi': (r) => {
        try {
          const body = JSON.parse(r.body);
          if (body.success && body.data && body.data.id) {
            createdId = body.data.id;
            return true;
          }
          return false;
        } catch (e) {
          return false;
        }
      }
    });
  });

  sleep(0.1);

  // 6. Cap nhat du lieu dong thoi
  group('06. Concurrent Update Task', function () {
    const targetId = createdId || 1;
    const res = updateTask(authToken, targetId, UPDATE_TASK_PAYLOAD);
    check(res, {
      'Cap nhat task - Status 200': (r) => r.status === 200
    });
  });

  sleep(0.2);
}

export function handleSummary(data) {
  const reportOptions = {
    testName: 'Stress Testing (Kiem thu do chiu tai toi han)',
    scenarioType: 'Stress Test (20 Nguoi dung ao - 20 VUs)',
    targetUrl: BASE_URL
  };

  return {
    'reports/stress-test-report.html': generateHtmlReport(data, reportOptions),
    'reports/stress-test-summary.json': JSON.stringify(data, null, 2),
    stdout: generateTextSummary(data, reportOptions)
  };
}

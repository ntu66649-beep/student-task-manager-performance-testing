/**
 * Kich ban: Full Flow Testing (Kiem thu toan bo vong doi CRUD cua REST API)
 * 
 * Muc tieu:
 * - Kiem tra hieu nang va tinh toan ven du lieu khi thuc hien day du vong doi:
 *   Health -> Login -> List -> Filter -> Detail -> Create -> Update -> Delete
 * - Mo phong 10 nguoi dung ao (10 VUs) thao tac tron ven tat ca phuong thuc HTTP (GET, POST, PUT, DELETE).
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
    { duration: '5s', target: 5 },
    { duration: '15s', target: 10 },
    { duration: '5s', target: 0 }
  ],
  thresholds: THRESHOLDS.LOAD
};

export default function () {
  let authToken = '';
  let taskId = null;

  group('01. Health & Ping', function () {
    const res = checkHealth();
    check(res, { 'Status 200': (r) => r.status === 200 });
  });

  group('02. Authentication', function () {
    const res = login(TEST_USER.username, TEST_USER.password);
    check(res, {
      'Status 200': (r) => r.status === 200,
      'Valid Token': (r) => {
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

  group('03. Read Operations (GET)', function () {
    const resAll = getTasks(authToken);
    check(resAll, { 'GET Tasks Status 200': (r) => r.status === 200 });

    const resFilter = getTasks(authToken, { status: 'TODO' });
    check(resFilter, { 'GET Filter Status 200': (r) => r.status === 200 });

    const resDetail = getTaskById(authToken, 1);
    check(resDetail, { 'GET Detail Status 200': (r) => r.status === 200 });
  });

  group('04. Create Operation (POST)', function () {
    const payload = generateTaskPayload(__VU, __ITER);
    const res = createTask(authToken, payload);
    check(res, {
      'POST Task Status 201': (r) => r.status === 201,
      'Captured Task ID': (r) => {
        try {
          const body = JSON.parse(r.body);
          if (body.data && body.data.id) {
            taskId = body.data.id;
            return true;
          }
          return false;
        } catch (e) {
          return false;
        }
      }
    });
  });

  group('05. Update Operation (PUT)', function () {
    if (taskId) {
      const res = updateTask(authToken, taskId, UPDATE_TASK_PAYLOAD);
      check(res, { 'PUT Task Status 200': (r) => r.status === 200 });
    }
  });

  group('06. Delete Operation (DELETE)', function () {
    if (taskId) {
      const res = deleteTask(authToken, taskId);
      check(res, { 'DELETE Task Status 200': (r) => r.status === 200 });
    }
  });

  sleep(0.3);
}

export function handleSummary(data) {
  const reportOptions = {
    testName: 'Full Flow Testing (Kiem thu toan bo chu trinh CRUD)',
    scenarioType: 'Full Flow CRUD (10 Nguoi dung ao - 10 VUs)',
    targetUrl: BASE_URL
  };

  return {
    'reports/full-flow-test-report.html': generateHtmlReport(data, reportOptions),
    'reports/full-flow-test-summary.json': JSON.stringify(data, null, 2),
    stdout: generateTextSummary(data, reportOptions)
  };
}

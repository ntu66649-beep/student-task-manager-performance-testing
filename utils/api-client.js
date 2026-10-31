/**
 * Thu vien goi REST API cho k6
 * Du an: Student Task Manager Performance Testing
 * Mon hoc: SWT301
 */

import http from 'k6/http';
import { BASE_URL, DEFAULT_HEADERS, TEST_USER } from '../config/environment.js';

/**
 * Tao headers co chua Bearer Token
 * @param {string} token 
 */
export function createAuthHeaders(token) {
  const headers = Object.assign({}, DEFAULT_HEADERS);
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return { headers };
}

/**
 * Kiem tra trang thai may chu API
 */
export function checkHealth() {
  const url = `${BASE_URL}/api/health`;
  return http.get(url, { headers: DEFAULT_HEADERS, tags: { name: 'GET_Health' } });
}

/**
 * Thuc hien dang nhap de nhan access token
 * @param {string} username 
 * @param {string} password 
 */
export function login(username = TEST_USER.username, password = TEST_USER.password) {
  const url = `${BASE_URL}/api/login`;
  const payload = JSON.stringify({ username, password });
  return http.post(url, payload, { headers: DEFAULT_HEADERS, tags: { name: 'POST_Login' } });
}

/**
 * Lay danh sach tat ca cac nhiem vu
 * @param {string} token 
 * @param {object} queryParams 
 */
export function getTasks(token, queryParams = {}) {
  let url = `${BASE_URL}/api/tasks`;
  const queryStringParts = [];
  if (queryParams.status) queryStringParts.push(`status=${encodeURIComponent(queryParams.status)}`);
  if (queryParams.course) queryStringParts.push(`course=${encodeURIComponent(queryParams.course)}`);
  if (queryParams.page !== undefined) queryStringParts.push(`page=${encodeURIComponent(queryParams.page)}`);
  if (queryParams.limit !== undefined) queryStringParts.push(`limit=${encodeURIComponent(queryParams.limit)}`);
  if (queryStringParts.length > 0) {
    url += `?${queryStringParts.join('&')}`;
  }
  return http.get(url, Object.assign({}, createAuthHeaders(token), { tags: { name: 'GET_Tasks' } }));
}

/**
 * Lay chi tiet mot nhiem vu theo ID
 * @param {string} token 
 * @param {number|string} id 
 */
export function getTaskById(token, id) {
  const url = `${BASE_URL}/api/tasks/${id}`;
  return http.get(url, Object.assign({}, createAuthHeaders(token), { tags: { name: 'GET_Task_ById' } }));
}

/**
 * Tao moi mot nhiem vu
 * @param {string} token 
 * @param {object} taskData 
 */
export function createTask(token, taskData) {
  const url = `${BASE_URL}/api/tasks`;
  const payload = JSON.stringify(taskData);
  return http.post(url, payload, Object.assign({}, createAuthHeaders(token), { tags: { name: 'POST_Create_Task' } }));
}

/**
 * Cap nhat mot nhiem vu
 * @param {string} token 
 * @param {number|string} id 
 * @param {object} taskData 
 */
export function updateTask(token, id, taskData) {
  const url = `${BASE_URL}/api/tasks/${id}`;
  const payload = JSON.stringify(taskData);
  return http.put(url, payload, Object.assign({}, createAuthHeaders(token), { tags: { name: 'PUT_Update_Task' } }));
}

/**
 * Xoa mot nhiem vu theo ID
 * @param {string} token 
 * @param {number|string} id 
 */
export function deleteTask(token, id) {
  const url = `${BASE_URL}/api/tasks/${id}`;
  return http.del(url, null, Object.assign({}, createAuthHeaders(token), { tags: { name: 'DELETE_Task' } }));
}

/**
 * Khoi phuc du lieu mock ve trang thai mac dinh
 */
export function resetData() {
  const url = `${BASE_URL}/api/reset`;
  return http.post(url, null, { headers: DEFAULT_HEADERS, tags: { name: 'POST_Reset_Data' } });
}

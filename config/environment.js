/**
 * Cau hinh moi truong kiem thu hieu nang voi k6
 * Du an: Student Task Manager Performance Testing
 * Mon hoc: SWT301
 */

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const TEST_USER = {
  username: __ENV.TEST_USERNAME || 'student',
  password: __ENV.TEST_PASSWORD || 'password123'
};

export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

/**
 * Nguong danh gia hieu nang (SLA Thresholds) tieu chuan
 */
export const THRESHOLDS = {
  // Smoke Test: Kiem tra co ban, tai thap (1 - 5 VUs)
  SMOKE: {
    http_req_failed: ['rate<0.01'],        // Ty le loi duoi 1%
    http_req_duration: ['p(95)<300', 'p(99)<500'] // 95% request duoi 300ms, 99% duoi 500ms
  },
  // Load Test: Kiem tra tai thong thuong (10 VUs)
  LOAD: {
    http_req_failed: ['rate<0.01'],        // Ty le loi duoi 1%
    http_req_duration: ['p(90)<250', 'p(95)<400'], // 95% request duoi 400ms
    http_reqs: ['rate>10']                 // Throughput toi thieu 10 request/giay
  },
  // Stress Test: Kiem tra tai cao (20 VUs)
  STRESS: {
    http_req_failed: ['rate<0.05'],        // Ty le loi duoi 5%
    http_req_duration: ['p(95)<800', 'avg<400'] // 95% request duoi 800ms, trung binh duoi 400ms
  }
};

/**
 * Du lieu mau cho cac kich ban kiem thu hieu nang
 * Du an: Student Task Manager Performance Testing
 * Mon hoc: SWT301
 */

export const SAMPLE_TASKS = [
  {
    title: 'On tap ly thuyet kiem thu dong thoi',
    description: 'Nghien cuu co che xu ly concurrency va thread-safety tren backend',
    course: 'SWT301',
    dueDate: '2026-11-15',
    priority: 'HIGH',
    status: 'TODO'
  },
  {
    title: 'Thiet ke test suite k6 cho REST API',
    description: 'Xay dung cac kich ban Smoke, Load va Stress test voi nguong SLA',
    course: 'SWT301',
    dueDate: '2026-11-20',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS'
  },
  {
    title: 'Phan tich ket qua Response Time va Throughput',
    description: 'Xuat bao cao hieu nang chi tiet va de xuat phuong an toi uu',
    course: 'SWT301',
    dueDate: '2026-11-25',
    priority: 'HIGH',
    status: 'TODO'
  },
  {
    title: 'Thuc hanh Security Testing voi OWASP ZAP',
    description: 'Kiem tra cac lo hong bao mat pho bien tren he thong quan ly nhiem vu',
    course: 'SWT301',
    dueDate: '2026-12-01',
    priority: 'LOW',
    status: 'TODO'
  }
];

/**
 * Tao payload ngau nhien cho request tao moi task
 * @param {number} vuId Id nguoi dung ao
 * @param {number} iteration So lan lap hien tai
 */
export function generateTaskPayload(vuId, iteration) {
  const baseIndex = (vuId + iteration) % SAMPLE_TASKS.length;
  const baseTask = SAMPLE_TASKS[baseIndex];

  return {
    title: `${baseTask.title} [VU ${vuId} - Lap ${iteration}]`,
    description: baseTask.description,
    course: baseTask.course,
    dueDate: baseTask.dueDate,
    priority: baseTask.priority,
    status: baseTask.status
  };
}

/**
 * Payload cap nhat task
 */
export const UPDATE_TASK_PAYLOAD = {
  title: 'On tap ly thuyet SWT301 (Da cap nhat boi k6 test)',
  description: 'Noi dung da duoc cap nhat trong qua trinh kiem thu hieu nang tu dong',
  course: 'SWT301',
  dueDate: '2026-11-18',
  priority: 'HIGH',
  status: 'IN_PROGRESS'
};


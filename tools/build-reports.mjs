import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
const root = fileURLToPath(new URL('../', import.meta.url));
// k6 and Node share this module, without dependencies or package type changes.
const source = await readFile(path.join(root, 'utils/reporter.js'), 'utf8');
const { SCENARIOS, generateHtmlReport, generateDashboard, generateDashboardData } =
  await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const reportsDir = path.join(root, 'reports');
await mkdir(reportsDir, { recursive: true });
let built = 0;
for (const scenario of SCENARIOS) {
  let data;
  try {
    data = JSON.parse(await readFile(path.join(reportsDir, scenario.file + '-summary.json'), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn('Chưa có summary: ' + scenario.file + '. Chạy k6 để tạo báo cáo.');
      continue;
    }
    throw error;
  }
  // JSON has no run metadata. Keep metadata written by k6 when available.
  let previous;
  try {
    const context = { window: {} };
    vm.runInNewContext(await readFile(path.join(reportsDir, scenario.file + '-data.js'), 'utf8'), context, { timeout: 1000 });
    previous = context.window.STM_REPORTS && context.window.STM_REPORTS[scenario.key];
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const options = {
    reportKey: scenario.key, testName: scenario.title,
    targetUrl: process.env.BASE_URL || (previous && previous.targetUrl) || 'http://localhost:3000',
    generatedAt: previous && previous.generatedAt || 'saved'
  };
  await writeFile(path.join(reportsDir, scenario.file + '-report.html'), generateHtmlReport(data, options));
  await writeFile(path.join(reportsDir, scenario.file + '-data.js'), generateDashboardData(data, options));
  built++;
}
await writeFile(path.join(reportsDir, 'index.html'), generateDashboard());
console.log('Đã dựng ' + built + ' báo cáo. Mở reports/index.html để xem tổng quan.');

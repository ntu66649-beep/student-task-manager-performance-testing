/**
 * Trinh tao bao cao hieu nang HTML va JSON cho k6
 * Du an: Student Task Manager Performance Testing
 * Mon hoc: SWT301
 * 
 * Thiet ke toi gian, chuyen nghiep, khong su dung icon hay emoji.
 */

function formatNumber(num, decimals = 2) {
  if (num === undefined || num === null || isNaN(num)) return '0.00';
  return Number(num).toFixed(decimals);
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(ms) {
  if (!ms || ms === 0) return '0 ms';
  if (ms < 1000) return `${formatNumber(ms, 2)} ms`;
  return `${formatNumber(ms / 1000, 2)} s`;
}

/**
 * Tao bao cao HTML tu du lieu thong ke k6
 * @param {object} data Du lieu summary tu k6
 * @param {object} options Thong tin bo sung (ten kich ban, mo ta)
 */
export function generateHtmlReport(data, options = {}) {
  const testName = options.testName || 'Kiem thu hieu nang REST API';
  const scenarioType = options.scenarioType || 'Chua xac dinh';
  const targetUrl = options.targetUrl || 'http://localhost:3000';
  const generatedAt = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  // Tinh toan trang thai tong the PASS / FAIL dua tren Thresholds
  let allThresholdsPassed = true;
  const thresholdRows = [];

  if (data.metrics) {
    for (const [metricName, metricData] of Object.entries(data.metrics)) {
      if (metricData.thresholds) {
        for (const [thresholdExpr, thresholdResult] of Object.entries(metricData.thresholds)) {
          const passed = thresholdResult.ok;
          if (!passed) {
            allThresholdsPassed = false;
          }
          thresholdRows.push({
            metric: metricName,
            expression: thresholdExpr,
            passed: passed
          });
        }
      }
    }
  }

  const overallStatus = allThresholdsPassed ? 'PASS' : 'FAIL';
  const overallBadgeClass = allThresholdsPassed ? 'status-pass' : 'status-fail';
  const overallText = allThresholdsPassed ? 'DAT (TAT CA TIEU CHI DEU DAT NGUONG)' : 'KHONG DAT (CO TIEU CHI VUOT NGUONG CHO PHEP)';

  // Trich xuat cac chi so chinh
  const httpDuration = data.metrics.http_req_duration ? data.metrics.http_req_duration.values : {};
  const httpReqs = data.metrics.http_reqs ? data.metrics.http_reqs.values : {};
  const httpFailed = data.metrics.http_req_failed ? data.metrics.http_req_failed.values : {};
  const vusMax = data.metrics.vus_max ? data.metrics.vus_max.values.value : (data.metrics.vus ? data.metrics.vus.values.value : 0);
  const iterations = data.metrics.iterations ? data.metrics.iterations.values.count : 0;
  const dataReceived = data.metrics.data_received ? data.metrics.data_received.values.count : 0;
  const dataSent = data.metrics.data_sent ? data.metrics.data_sent.values.count : 0;

  const totalRequests = httpReqs.count || 0;
  const reqPerSec = httpReqs.rate || 0;
  const failRate = (httpFailed.rate || 0) * 100;
  const avgDuration = httpDuration.avg || 0;
  const minDuration = httpDuration.min || 0;
  const medDuration = httpDuration.med || 0;
  const p90Duration = httpDuration['p(90)'] || 0;
  const p95Duration = httpDuration['p(95)'] || 0;
  const p99Duration = httpDuration['p(99)'] || 0;
  const maxDuration = httpDuration.max || 0;

  // Trich xuat danh sach Checks
  const checksList = [];
  function extractChecks(group) {
    if (group.checks && group.checks.length > 0) {
      for (const chk of group.checks) {
        checksList.push(chk);
      }
    }
    if (group.groups && group.groups.length > 0) {
      for (const subGroup of group.groups) {
        extractChecks(subGroup);
      }
    }
  }
  if (data.root_group) {
    extractChecks(data.root_group);
  }

  // Tao ma HTML
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bao Cao Kiem Thu Hieu Nang - ${testName}</title>
  <style>
    :root {
      --bg-main: #f8fafc;
      --bg-card: #ffffff;
      --text-main: #0f172a;
      --text-muted: #475569;
      --border-color: #e2e8f0;
      --color-pass: #166534;
      --color-pass-bg: #dcfce7;
      --color-fail: #991b1b;
      --color-fail-bg: #fee2e2;
      --primary: #1e293b;
      --primary-light: #334155;
      --accent: #2563eb;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: var(--bg-main);
      color: var(--text-main);
      line-height: 1.5;
      padding: 2rem 1rem;
    }

    .container {
      max-width: 1100px;
      margin: 0 auto;
    }

    .header {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 1.5rem 2rem;
      margin-bottom: 1.5rem;
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 1rem;
      margin-bottom: 1rem;
    }

    .title-group h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 0.25rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .title-group p {
      font-size: 0.95rem;
      color: var(--text-muted);
    }

    .status-badge {
      font-size: 0.875rem;
      font-weight: 700;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      letter-spacing: 0.5px;
      display: inline-block;
      text-align: center;
    }

    .status-pass {
      color: var(--color-pass);
      background-color: var(--color-pass-bg);
      border: 1px solid #bbf7d0;
    }

    .status-fail {
      color: var(--color-fail);
      background-color: var(--color-fail-bg);
      border: 1px solid #fecaca;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      font-size: 0.9rem;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
    }

    .meta-label {
      color: var(--text-muted);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.2rem;
    }

    .meta-value {
      font-weight: 600;
      color: var(--primary);
    }

    .grid-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 1.25rem;
    }

    .card-label {
      font-size: 0.775rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--text-muted);
      letter-spacing: 0.5px;
      margin-bottom: 0.5rem;
    }

    .card-value {
      font-size: 1.6rem;
      font-weight: 700;
      color: var(--primary);
      line-height: 1.2;
    }

    .card-sub {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 0.35rem;
    }

    .section {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .section-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border-color);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
      text-align: left;
    }

    th {
      background-color: #f1f5f9;
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.5px;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border-color);
    }

    td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-main);
    }

    tr:last-child td {
      border-bottom: none;
    }

    .badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 700;
      border-radius: 3px;
      text-transform: uppercase;
    }

    .badge-pass {
      background-color: var(--color-pass-bg);
      color: var(--color-pass);
    }

    .badge-fail {
      background-color: var(--color-fail-bg);
      color: var(--color-fail);
    }

    .font-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .footer {
      text-align: center;
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-color);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-top">
        <div class="title-group">
          <h1>Bao Cao Kiem Thu Hieu Nang REST API</h1>
          <p>Du an: Student Task Manager | Mon hoc: SWT301</p>
        </div>
        <div class="status-badge ${overallBadgeClass}">
          KET QUA: ${overallStatus}
        </div>
      </div>
      <div class="meta-grid">
        <div class="meta-item">
          <span class="meta-label">Kich ban kiem thu</span>
          <span class="meta-value">${scenarioType}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Dich vu muc tieu</span>
          <span class="meta-value font-mono">${targetUrl}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Thoi gian thuc hien</span>
          <span class="meta-value">${generatedAt}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Danh gia tong quan</span>
          <span class="meta-value">${overallText}</span>
        </div>
      </div>
    </div>

    <div class="grid-cards">
      <div class="card">
        <div class="card-label">Nguoi dung ao (VUs)</div>
        <div class="card-value">${vusMax}</div>
        <div class="card-sub">So luong VU toi da</div>
      </div>
      <div class="card">
        <div class="card-label">Tong so Request</div>
        <div class="card-value">${totalRequests}</div>
        <div class="card-sub">${iterations} iterations hoan thanh</div>
      </div>
      <div class="card">
        <div class="card-label">Throughput trung binh</div>
        <div class="card-value">${formatNumber(reqPerSec, 1)} <span style="font-size: 1rem; font-weight: 500;">req/s</span></div>
        <div class="card-sub">Tan suat dap ung yeu cau</div>
      </div>
      <div class="card">
        <div class="card-label">Response Time P95</div>
        <div class="card-value">${formatDuration(p95Duration)}</div>
        <div class="card-sub">95% request nhanh hon muc nay</div>
      </div>
      <div class="card">
        <div class="card-label">Ty le loi (Error Rate)</div>
        <div class="card-value" style="color: ${failRate > 0 ? 'var(--color-fail)' : 'var(--color-pass)'};">${formatNumber(failRate, 2)}%</div>
        <div class="card-sub">${httpFailed.fails || 0} thanh cong / ${httpFailed.passes || 0} that bai</div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">1. Danh gia cac nguong kiem thu (Thresholds SLA)</h2>
      <table>
        <thead>
          <tr>
            <th>Chi so (Metric)</th>
            <th>Dieu kien nguong (Condition)</th>
            <th>Trang thai</th>
          </tr>
        </thead>
        <tbody>
          ${thresholdRows.length > 0 ? thresholdRows.map(row => `
          <tr>
            <td class="font-mono"><strong>${row.metric}</strong></td>
            <td class="font-mono">${row.expression}</td>
            <td>
              <span class="badge ${row.passed ? 'badge-pass' : 'badge-fail'}">
                ${row.passed ? 'PASS (DAT)' : 'FAIL (KHONG DAT)'}
              </span>
            </td>
          </tr>
          `).join('') : `
          <tr>
            <td colspan="3" style="text-align: center; color: var(--text-muted);">Khong co nguong nao duoc thiet lap.</td>
          </tr>
          `}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2 class="section-title">2. Thong ke thoi gian phan hoi (Response Time Breakdown)</h2>
      <table>
        <thead>
          <tr>
            <th>Chi so</th>
            <th>Gia tri do luong</th>
            <th>Y nghia ky thuat</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Nho nhat (Min)</td>
            <td class="font-mono"><strong>${formatDuration(minDuration)}</strong></td>
            <td>Thoi gian phan hoi nhanh nhat ghi nhan duoc</td>
          </tr>
          <tr>
            <td>Trung binh (Average)</td>
            <td class="font-mono"><strong>${formatDuration(avgDuration)}</strong></td>
            <td>Thoi gian phan hoi trung binh cua toan bo request</td>
          </tr>
          <tr>
            <td>Trung vi (Median)</td>
            <td class="font-mono"><strong>${formatDuration(medDuration)}</strong></td>
            <td>50% tong so request co thoi gian phan hoi duoi muc nay</td>
          </tr>
          <tr>
            <td>Phan vi 90% (P90)</td>
            <td class="font-mono"><strong>${formatDuration(p90Duration)}</strong></td>
            <td>90% tong so request co thoi gian phan hoi duoi muc nay</td>
          </tr>
          <tr>
            <td>Phan vi 95% (P95)</td>
            <td class="font-mono"><strong>${formatDuration(p95Duration)}</strong></td>
            <td>95% tong so request co thoi gian phan hoi duoi muc nay (Tieu chuan SLA)</td>
          </tr>
          <tr>
            <td>Phan vi 99% (P99)</td>
            <td class="font-mono"><strong>${formatDuration(p99Duration)}</strong></td>
            <td>99% tong so request co thoi gian phan hoi duoi muc nay</td>
          </tr>
          <tr>
            <td>Lon nhat (Max)</td>
            <td class="font-mono"><strong>${formatDuration(maxDuration)}</strong></td>
            <td>Thoi gian phan hoi cham nhat ghi nhan duoc</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2 class="section-title">3. Kiem tra tinh dung dan chuc nang (Functional Checks)</h2>
      <table>
        <thead>
          <tr>
            <th>Noi dung kiem tra (Check Name)</th>
            <th>So lan thanh cong</th>
            <th>So lan that bai</th>
            <th>Ty le dat (%)</th>
            <th>Ket qua</th>
          </tr>
        </thead>
        <tbody>
          ${checksList.length > 0 ? checksList.map(chk => {
            const total = (chk.passes || 0) + (chk.fails || 0);
            const passPct = total > 0 ? ((chk.passes || 0) / total * 100) : 100;
            const isPass = (chk.fails || 0) === 0;
            return `
            <tr>
              <td><strong>${chk.name}</strong></td>
              <td class="font-mono">${chk.passes || 0}</td>
              <td class="font-mono">${chk.fails || 0}</td>
              <td class="font-mono">${formatNumber(passPct, 1)}%</td>
              <td>
                <span class="badge ${isPass ? 'badge-pass' : 'badge-fail'}">
                  ${isPass ? 'DAT' : 'KHONG DAT'}
                </span>
              </td>
            </tr>
            `;
          }).join('') : `
          <tr>
            <td colspan="5" style="text-align: center; color: var(--text-muted);">Khong co check nao duoc ghi nhan.</td>
          </tr>
          `}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2 class="section-title">4. Thong ke luu luong mang va chu ky (Network & Iteration)</h2>
      <table>
        <thead>
          <tr>
            <th>Hang muc</th>
            <th>Gia tri tong cong</th>
            <th>Toc do trung binh</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Du lieu nhan (Data Received)</td>
            <td class="font-mono">${formatBytes(dataReceived)}</td>
            <td class="font-mono">${formatBytes(data.metrics.data_received ? data.metrics.data_received.values.rate : 0)}/s</td>
          </tr>
          <tr>
            <td>Du lieu gui (Data Sent)</td>
            <td class="font-mono">${formatBytes(dataSent)}</td>
            <td class="font-mono">${formatBytes(data.metrics.data_sent ? data.metrics.data_sent.values.rate : 0)}/s</td>
          </tr>
          <tr>
            <td>So chu ky lap (Iterations)</td>
            <td class="font-mono">${iterations} chu ky</td>
            <td class="font-mono">${formatNumber(data.metrics.iterations ? data.metrics.iterations.values.rate : 0, 2)} chu ky/s</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>Bao cao duoc tao tu dong boi k6 Performance Testing Suite</p>
      <p>He thong: Student Task Manager REST API - Mon hoc: SWT301</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Tao bao cao tong ket dang text gon gang cho console
 * @param {object} data 
 * @param {object} options 
 */
export function generateTextSummary(data, options = {}) {
  const scenarioType = options.scenarioType || 'Performance Test';
  const httpDuration = data.metrics.http_req_duration ? data.metrics.http_req_duration.values : {};
  const httpReqs = data.metrics.http_reqs ? data.metrics.http_reqs.values : {};
  const httpFailed = data.metrics.http_req_failed ? data.metrics.http_req_failed.values : {};
  const vusMax = data.metrics.vus_max ? data.metrics.vus_max.values.value : (data.metrics.vus ? data.metrics.vus.values.value : 0);

  let allThresholdsPassed = true;
  if (data.metrics) {
    for (const [, metricData] of Object.entries(data.metrics)) {
      if (metricData.thresholds) {
        for (const [, res] of Object.entries(metricData.thresholds)) {
          if (!res.ok) allThresholdsPassed = false;
        }
      }
    }
  }

  const lines = [
    '----------------------------------------------------------------------',
    `KICH BAN: ${scenarioType.toUpperCase()}`,
    `KET QUA: ${allThresholdsPassed ? 'PASS (DAT)' : 'FAIL (KHONG DAT)'}`,
    '----------------------------------------------------------------------',
    `So VUs toi da:           ${vusMax}`,
    `Tong so request:         ${httpReqs.count || 0}`,
    `Throughput trung binh:   ${formatNumber(httpReqs.rate || 0, 1)} req/s`,
    `Ty le loi (Error Rate):  ${formatNumber((httpFailed.rate || 0) * 100, 2)}%`,
    `Response Time Trung binh:${formatDuration(httpDuration.avg || 0)}`,
    `Response Time P90:       ${formatDuration(httpDuration['p(90)'] || 0)}`,
    `Response Time P95:       ${formatDuration(httpDuration['p(95)'] || 0)}`,
    `Response Time Max:       ${formatDuration(httpDuration.max || 0)}`,
    '----------------------------------------------------------------------'
  ];

  return lines.join('\n');
}

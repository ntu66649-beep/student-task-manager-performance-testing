/**
 * Shared, dependency-free report UI for k6 and the offline report builder.
 * Test scenarios and threshold definitions are unchanged.
 */
export const SCENARIOS = [
  { key: 'smoke', file: 'smoke-test', title: 'Smoke Testing', short: 'Smoke', description: 'Kiểm tra tính sẵn sàng', color: '#ed744a' },
  { key: 'load', file: 'load-test', title: 'Load Testing', short: 'Load', description: 'Hiệu năng ở tải thông thường', color: '#5485b4' },
  { key: 'stress', file: 'stress-test', title: 'Stress Testing', short: 'Stress', description: 'Độ ổn định khi tăng tải', color: '#8d82b7' },
  { key: 'full-flow', file: 'full-flow-test', title: 'Full Flow CRUD', short: 'Full Flow', description: 'Toàn bộ vòng đời nhiệm vụ', color: '#479b87' }
];
function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function number(value, digits = 0) {
  return typeof value === 'number' && isFinite(value)
    ? value.toLocaleString('vi-VN', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : 'N/A';
}
function duration(value) { return typeof value === 'number' && isFinite(value) ? number(value, 2) + ' ms' : 'N/A'; }
function bytes(value) {
  if (typeof value !== 'number' || !isFinite(value)) return 'N/A';
  if (value === 0) return '0 B';
  const unit = Math.min(Math.floor(Math.log(Math.max(value, 1)) / Math.log(1024)), 3);
  return number(value / Math.pow(1024, unit), unit ? 2 : 0) + ' ' + ['B', 'KB', 'MB', 'GB'][unit];
}
function icon(name) {
  const paths = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    chart: '<path d="M4 4v16h16M8 15v-4m5 4V7m5 8v-6"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
    print: '<path d="M7 8V3h10v5M7 17H4V8h16v9h-3M7 14h10v7H7z"/>',
    moon: '<path d="M21 12.8A9 9 0 0 1 11.2 3 9 9 0 1 0 21 12.8Z"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    book: '<path d="M12 5v16M3 3c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 3-2-3-5-4-9-3Z"/>',
    bolt: '<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>'
  };
  return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.chart) + '</svg>';
}
function badge(passed, label) {
  return '<span class="badge ' + (passed === null ? 'neutral' : passed ? 'pass' : 'fail') + '"><span class="dot"></span>' +
    esc(label || (passed === null ? 'Chưa có dữ liệu' : passed ? 'PASS' : 'FAIL')) + '</span>';
}
function card(label, value, unit, hint, symbol) {
  return '<article class="metric-card"><div class="metric-top"><span>' + esc(label) + '</span>' + icon(symbol || 'chart') +
    '</div><div class="metric-value">' + esc(value) + (unit ? '<span>' + esc(unit) + '</span>' : '') +
    '</div><div class="metric-hint">' + esc(hint) + '</div></article>';
}
function chart(items, unit, title) {
  const valid = items.filter(function(i) { return typeof i.value === 'number' && isFinite(i.value); });
  const max = Math.max.apply(null, valid.map(function(i) { return i.value; }).concat([0.01]));
  return '<div class="bar-chart" role="img" aria-label="' + esc(title + ': ' + items.map(function(i) { return i.label + ' ' + number(i.value, 2) + ' ' + unit; }).join('; ')) + '">' +
    items.map(function(i) {
      const exists = typeof i.value === 'number' && isFinite(i.value);
      return '<div class="bar-row"><span class="bar-label">' + esc(i.label) + '</span><div class="bar-track"><span style="width:' +
        (exists ? Math.max(0, i.value / max * 100) : 0) + '%;background:' + i.color +
        '"></span></div><span class="bar-value">' + number(i.value, 2) + ' <small>' + esc(unit) + '</small></span></div>';
    }).join('') + '</div>';
}
function model(data, options = {}) {
  const metrics = data.metrics || {};
  function values(name) { return metrics[name] && metrics[name].values || {}; }
  const thresholds = [];
  Object.keys(metrics).forEach(function(name) {
    Object.keys(metrics[name].thresholds || {}).forEach(function(expression) {
      thresholds.push({ metric: name, expression: expression, passed: metrics[name].thresholds[expression].ok === true });
    });
  });
  const checks = [];
  function walk(group) {
    (group.checks || []).forEach(function(c) { checks.push({ name: c.name, group: group.name || '', passes: c.passes || 0, fails: c.fails || 0 }); });
    (group.groups || []).forEach(walk);
  }
  if (data.root_group) walk(data.root_group);
  const scenario = SCENARIOS.find(function(s) { return s.key === options.reportKey; });
  return {
    key: options.reportKey || 'report', title: scenario ? scenario.title : options.testName || 'Performance Report',
    scenarioType: options.scenarioType || '', targetUrl: options.targetUrl || 'http://localhost:3000',
    generatedAt: options.generatedAt || new Date().toISOString(),
    status: thresholds.length ? thresholds.every(function(t) { return t.passed; }) : null,
    thresholds: thresholds, checks: checks, latency: values('http_req_duration'),
    requests: values('http_reqs'), errors: values('http_req_failed'), iterations: values('iterations'),
    vus: values('vus').max, allocatedVus: values('vus_max').value, checkTotals: values('checks'),
    received: values('data_received'), sent: values('data_sent'),
    durationMs: data.state && data.state.testRunDurationMs
  };
}
const STYLES = [
':root{color-scheme:light;--bg:#f6f7f9;--panel:#fff;--text:#18252e;--muted:#667582;--line:#e6eaee;--accent:#c6532e;--soft:#fff0e9;--green:#26755c;--green-soft:#e9f5ef;--red:#b23f43;--red-soft:#fcebed;--track:#eef1f4}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:25px}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 "Segoe UI",Arial,sans-serif;-webkit-font-smoothing:antialiased}body.dark{color-scheme:dark;--bg:#111b22;--panel:#1a2831;--text:#e8eef2;--muted:#a0b0bc;--line:#30414b;--accent:#ff9b78;--soft:#402d27;--green:#8dd3b5;--green-soft:#213d33;--red:#ffb2b8;--red-soft:#442c34;--track:#2d3c46}a{color:inherit;text-decoration:none}button,input,select{font:inherit}button{cursor:pointer}button svg,a svg{flex-shrink:0}a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #ed744a;outline-offset:4px}h1,h2,h3,p{margin:0}h1{font-size:34px;line-height:1.2;letter-spacing:-1.1px;font-weight:650}h2{font-size:17px;letter-spacing:-.3px;font-weight:650}small{font-size:12px}[hidden]{display:none!important}.skip-link{position:fixed;top:-100px;left:20px;background:var(--panel);padding:12px;z-index:99}.skip-link:focus{top:12px}',
'.sidebar{width:232px;position:fixed;inset:0 auto 0 0;background:#172c35;color:#d0dde3;padding:29px 20px;display:flex;flex-direction:column;z-index:20}.brand{display:flex;align-items:center;gap:11px;padding:0 9px 29px;color:#fff}.brand-mark{height:37px;width:37px;background:#f18a61;color:#172c35;border-radius:11px;display:grid;place-items:center;font-size:17px;font-weight:800;letter-spacing:-1px;flex-shrink:0}.brand strong{display:block;font-size:14px;letter-spacing:-.3px}.brand small{display:block;color:#b8c9d0;font-size:10px;letter-spacing:1.4px;text-transform:uppercase}.nav-label{font-size:10px;letter-spacing:1.6px;font-weight:600;color:#9eb2bd;padding:17px 13px 10px}.nav-link{display:flex;align-items:center;gap:11px;padding:12px 13px;border-radius:8px;margin:3px 0;font-size:13px;color:#c4d1d8}.nav-link:hover{background:#ffffff0b;color:#fff}.nav-link.active{background:#ffffff12;color:#fff;box-shadow:inset 3px 0 #ef8b67}.nav-link.active svg{color:#f3a483}.nav-number{width:18px;text-align:center;font-size:11px;color:#9fb5c0}.nav-divider{height:1px;background:#ffffff14;margin:20px 10px 0}.sidebar-bottom{margin-top:auto;padding:20px 12px 0}.environment{border:1px solid #ffffff20;border-radius:9px;padding:12px}.environment small{display:block;color:#a7bcc7;margin-bottom:4px;font-size:9px;letter-spacing:.8px}.environment div{display:flex;gap:7px;align-items:center;color:#e3edf1;font-size:11px;overflow-wrap:anywhere}.environment .dot{background:#78c5a4}.sidebar-note{color:#b0c0c9;font-size:11px;margin:15px 0 0}.workspace{margin-left:232px}',
'.topbar{height:77px;background:var(--panel);border-bottom:1px solid var(--line);padding:0 38px;display:flex;align-items:center;justify-content:space-between;gap:20px}.breadcrumbs{font-size:12px;color:var(--muted);display:flex;align-items:center;gap:12px}.breadcrumbs b{color:var(--text);font-weight:500}.top-tools{display:flex;gap:8px;align-items:center}.tool-button,.button{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid var(--line);background:var(--panel);color:var(--text);border-radius:7px;padding:8px 12px;font-size:12px;font-weight:600;min-height:36px}.tool-button{width:36px;padding:8px}.button:hover,.tool-button:hover{background:var(--bg);border-color:var(--muted)}main{max-width:1480px;margin:auto;padding:34px 38px 24px}.page-heading{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:27px}.eyebrow{color:var(--accent);font-size:10px;letter-spacing:1.7px;font-weight:700;text-transform:uppercase;margin-bottom:9px}.subtitle{color:var(--muted);margin-top:10px;font-size:13px}.heading-meta{font-size:11px;color:var(--muted);text-align:right;flex-shrink:0}.heading-meta strong{display:block;color:var(--text);font-size:12px;font-weight:500}',
'.status-strip{display:flex;justify-content:space-between;align-items:center;gap:15px;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:17px 20px;margin-bottom:20px}.status-main{display:flex;align-items:center;gap:13px}.status-icon{width:36px;height:36px;background:var(--green-soft);color:var(--green);border-radius:50%;display:grid;place-items:center;flex-shrink:0}.status-icon.fail{background:var(--red-soft);color:var(--red)}.status-main strong{font-weight:600;font-size:13px}.status-main p{font-size:12px;color:var(--muted);margin-top:2px}.badge{display:inline-flex;align-items:center;gap:6px;border-radius:5px;padding:4px 8px;font-size:10px;font-weight:700;letter-spacing:.3px;white-space:nowrap}.badge.pass{background:var(--green-soft);color:var(--green)}.badge.fail{background:var(--red-soft);color:var(--red)}.badge.neutral{background:var(--track);color:var(--muted)}.dot{display:inline-block;width:5px;height:5px;border-radius:50%;background:currentColor;flex-shrink:0}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px;margin-bottom:24px}.metric-card{padding:20px 21px;background:var(--panel);border:1px solid var(--line);border-radius:10px}.metric-top{display:flex;justify-content:space-between;align-items:center;gap:10px;color:var(--muted);font-size:12px}.metric-top svg{width:16px}.metric-value{font-size:31px;font-weight:650;letter-spacing:-1px;margin:12px 0 5px;font-variant-numeric:tabular-nums;white-space:nowrap}.metric-value>span{font-size:13px;letter-spacing:0;color:var(--muted);font-weight:400;margin-left:6px}.metric-hint{font-size:11px;color:var(--muted)}',
'.grid-two{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(280px,1fr);gap:20px;margin-bottom:24px}.panel{background:var(--panel);border:1px solid var(--line);border-radius:10px;overflow:hidden}.panel-head{padding:21px 23px 0;display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.panel-head p{font-size:12px;color:var(--muted);margin-top:4px}.panel-body{padding:23px}.segmented{display:flex;gap:3px;border:1px solid var(--line);padding:3px;border-radius:6px;flex-shrink:0}.segmented button{border:0;border-radius:3px;padding:4px 9px;background:transparent;color:var(--muted);font-size:11px}.segmented button[aria-pressed="true"]{color:var(--text);background:var(--track);font-weight:600}.bar-chart{display:grid;gap:21px;margin:9px 0}.bar-row{display:flex;align-items:center;gap:14px}.bar-label{width:66px;flex-shrink:0;color:var(--muted);font-size:12px}.bar-track{height:11px;background:var(--track);border-radius:3px;flex:1;overflow:hidden}.bar-track>span{height:100%;display:block;border-radius:3px}.bar-value{font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;text-align:right;min-width:85px}.bar-value small{font-size:10px;color:var(--muted);font-weight:400}.chart-note{font-size:10px;color:var(--muted);border-top:1px solid var(--line);margin-top:23px;padding-top:13px}.quality{display:flex;align-items:center;gap:23px;padding:10px 0 16px}.ring{height:112px;width:112px;position:relative;flex-shrink:0}.ring svg{transform:rotate(-90deg);height:100%;width:100%}.ring-value{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;font-size:24px;font-weight:650;letter-spacing:-.8px}.ring-value small{font-size:10px;font-weight:400;color:var(--muted);letter-spacing:0}.quality-legend{font-size:12px;flex:1}.quality-legend>div{display:flex;justify-content:space-between;gap:16px;padding:6px 0}.quality-legend span{color:var(--muted)}.quality-foot{border-top:1px solid var(--line);padding-top:14px;display:flex;justify-content:space-between;font-size:11px;color:var(--muted)}.quality-foot strong{color:var(--text)}',
'.table-wrap{overflow:auto;margin-top:18px}table{border-collapse:collapse;width:100%;text-align:left;font-size:12px}th{background:var(--bg);color:var(--muted);font-weight:500;font-size:10px;letter-spacing:.4px;padding:12px 20px;white-space:nowrap}td{padding:18px 20px;border-top:1px solid var(--line)}td.numeric,th.numeric{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}tbody tr:hover{background:var(--bg)}.scenario-name{display:flex;align-items:center;gap:12px;min-width:175px}.scenario-number{width:33px;height:33px;border:1px solid var(--line);border-radius:7px;display:grid;place-items:center;font-size:11px;font-weight:600;color:var(--muted);flex-shrink:0}.scenario-name strong{display:block;font-size:12px;font-weight:600}.scenario-name small{display:block;font-size:10px;color:var(--muted);margin-top:2px}.row-link{display:inline-flex;align-items:center;gap:7px;color:var(--accent);font-weight:600;font-size:11px;white-space:nowrap}.row-link svg{width:14px}.panel-foot{padding:13px 23px;border-top:1px solid var(--line);font-size:11px;color:var(--muted);display:flex;align-items:center;justify-content:space-between;gap:12px}.section-gap{margin-bottom:24px}.footnote{padding:20px 0 5px;display:flex;align-items:center;justify-content:space-between;gap:20px;color:var(--muted);font-size:10px}.footnote strong{font-weight:500;color:var(--text)}.section-id{color:var(--muted);font-size:11px;letter-spacing:1px;margin-right:9px}.latency-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:22px}.latency-stat{background:var(--bg);border:1px solid var(--line);border-radius:7px;padding:13px 15px}.latency-stat span{display:block;color:var(--muted);font-size:11px}.latency-stat strong{display:block;font-size:17px;margin-top:4px;font-weight:600;font-variant-numeric:tabular-nums}.latency-stat.featured{background:var(--soft);border-color:transparent}.latency-stat.featured strong{color:var(--accent)}.mini-details>div{display:flex;justify-content:space-between;gap:15px;padding:13px 0;border-bottom:1px solid var(--line);font-size:12px}.mini-details>div:last-child{border:0}.mini-details span{color:var(--muted)}.mini-details strong{font-weight:500;text-align:right;overflow-wrap:anywhere}',
'.check-toolbar{display:flex;gap:10px;align-items:center}.search-field{display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid var(--line);border-radius:6px;color:var(--muted)}.search-field input{width:175px;border:0;outline:0;background:transparent;color:var(--text);font-size:12px}.search-field:focus-within{outline:2px solid var(--accent);outline-offset:2px}.check-toolbar select{max-width:145px;border:1px solid var(--line);border-radius:6px;padding:8px;background:var(--panel);color:var(--text);font-size:12px}.check-name{min-width:240px}.check-name small{display:block;color:var(--muted);font-size:10px;margin-top:2px}.empty-message{padding:25px;text-align:center;color:var(--muted);font-size:12px}.help{margin-top:24px;padding:20px 23px;background:var(--soft);border-radius:10px;display:flex;align-items:flex-start;gap:13px}.help>svg{color:var(--accent);flex-shrink:0;margin-top:2px}.help h3{font-size:12px;margin-bottom:4px}.help p{color:var(--muted);font-size:11px;max-width:100ch}.info-chip{font-size:10px;color:var(--muted);border:1px solid var(--line);border-radius:5px;padding:4px 8px;white-space:nowrap}.threshold-expression{font:12px Consolas,monospace}.progress{width:70px;height:5px;background:var(--track);border-radius:5px;display:inline-block;vertical-align:middle;margin-left:8px;overflow:hidden}.progress span{display:block;height:100%;background:var(--green)}',
'@media(min-width:1550px){main{padding-top:42px}.metrics{gap:20px}.metric-card{padding:24px}.bar-chart{gap:25px}}@media(max-width:1200px){.sidebar{width:205px;padding-left:14px;padding-right:14px}.workspace{margin-left:205px}main{padding:27px 24px}.topbar{padding:0 24px}.grid-two{grid-template-columns:minmax(0,1.3fr) minmax(260px,1fr)}.metric-card{padding:17px}.metric-value{font-size:27px}.panel-head{padding:20px 18px 0}.panel-body{padding:20px 18px}.quality{gap:14px}.ring{width:95px;height:95px}td,th{padding-left:16px;padding-right:16px}.check-toolbar{flex-wrap:wrap}}@media(max-width:960px){.grid-two{grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.quality{gap:30px}.quality-legend{max-width:280px}.heading-meta{display:none}.panel-head.check-heading{flex-direction:column;gap:15px}}',
'@media(max-width:680px){.sidebar{position:relative;width:auto;padding:15px 16px 10px;display:block}.brand{padding:0 0 14px}.brand-mark{width:31px;height:31px;border-radius:8px;font-size:14px}.brand strong{font-size:14px}.brand small{font-size:9px}.nav-label,.nav-divider,.sidebar-bottom,.sidebar .help-link{display:none}.sidebar nav{display:flex;gap:5px;overflow:auto;padding-bottom:2px}.nav-link{white-space:nowrap;padding:9px 10px;font-size:11px;gap:6px}.nav-link svg{width:15px}.nav-number{display:none}.workspace{margin:0}.topbar{height:58px;padding:0 18px}.breadcrumbs{font-size:10px;gap:8px}.top-tools{gap:5px}.tool-button{width:31px;min-height:31px}.button{min-height:31px;padding:6px 9px;font-size:10px}.button svg{width:14px}.top-tools .print-label{display:none}main{padding:24px 17px 16px}h1{font-size:28px}.page-heading{margin-bottom:21px}.subtitle{font-size:12px}.eyebrow{font-size:9px}.status-strip{padding:14px;align-items:flex-start;gap:8px}.status-main{gap:10px}.status-main strong{font-size:12px}.status-main p{font-size:10px}.status-icon{width:29px;height:29px}.status-strip>.badge{font-size:9px}.metrics{gap:10px;margin-bottom:18px}.metric-card{padding:15px 13px}.metric-top{font-size:10px}.metric-value{font-size:26px;margin-top:10px}.metric-hint{font-size:9px}.metric-value>span{font-size:10px}.grid-two{gap:18px;margin-bottom:18px}.panel-head{padding:18px 16px 0;gap:8px}h2{font-size:15px}.panel-head p{font-size:10px}.segmented button{font-size:10px;padding:3px 7px}.panel-body{padding:20px 16px}.bar-row{gap:9px}.bar-label{width:53px;font-size:10px}.bar-value{min-width:70px;font-size:11px}.quality{padding:0 0 15px;gap:24px}.ring{width:100px;height:100px}.section-gap{margin-bottom:18px}.panel-foot{padding:12px 16px;font-size:10px}.footnote{font-size:9px;align-items:flex-start}.footnote>span:last-child{max-width:120px;text-align:right}.info-chip{font-size:9px}.latency-grid{gap:8px}.latency-stat{padding:11px}.latency-stat strong{font-size:14px}.latency-stat span{font-size:10px}.check-toolbar{width:100%}.search-field{flex:1;min-width:130px}.search-field input{width:100%;min-width:0}.check-toolbar select{width:105px;font-size:11px}.help{padding:16px}.help p{font-size:10px}}',
'@media print{body,body.dark{color-scheme:light;--bg:#fff;--panel:#fff;--text:#17232c;--muted:#52616b;--line:#dce1e5;--green:#26755c;--green-soft:#e9f5ef;--red:#b23f43;--red-soft:#fcebed;--track:#eef1f4;--accent:#b74825;--soft:#fff0e9;font-size:11px}.sidebar,.topbar,.check-toolbar,.segmented,.help,.skip-link,.row-link,.no-print{display:none!important}.workspace{margin:0}main{padding:0;max-width:none}.metrics{grid-template-columns:repeat(4,1fr)}.grid-two{grid-template-columns:1.4fr 1fr;gap:12px}.panel,.metric-card,.status-strip{break-inside:avoid}.panel.checks-panel{break-inside:auto}tr{break-inside:avoid}.table-wrap{overflow:visible}.check-row[hidden]{display:table-row!important}.empty-message{display:none}.heading-meta{display:block}.page-heading{margin-top:15px}h1{font-size:25px}.panel-head,.panel-body{padding:14px}.metric-card{padding:13px}.metric-value{font-size:23px}.bar-chart{gap:14px}td,th{padding:10px}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{margin:12mm;size:A4 landscape}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}'
].join('\n');
const COMMON_SCRIPT = [
'(function(){var body=document.body,theme=document.getElementById("theme-toggle");try{if(localStorage.getItem("stm-report-theme")==="dark")body.classList.add("dark");}catch(e){}',
'function sync(){if(theme)theme.setAttribute("aria-pressed",String(body.classList.contains("dark")));}sync();if(theme)theme.addEventListener("click",function(){body.classList.toggle("dark");sync();try{localStorage.setItem("stm-report-theme",body.classList.contains("dark")?"dark":"light");}catch(e){}});',
'var print=document.getElementById("print-report");if(print)print.addEventListener("click",function(){window.print();});',
'var search=document.getElementById("check-search"),filter=document.getElementById("check-filter");function filterChecks(){var query=(search.value||"").trim().toLocaleLowerCase("vi"),mode=filter.value,visible=0;document.querySelectorAll(".check-row").forEach(function(row){var show=row.textContent.toLocaleLowerCase("vi").indexOf(query)!==-1&&(mode==="all"||row.dataset.status===mode);row.hidden=!show;if(show)visible++;});document.getElementById("check-count").textContent=visible+" / "+document.querySelectorAll(".check-row").length+" nội dung";document.getElementById("checks-empty").hidden=visible!==0;}if(search&&filter){search.addEventListener("input",filterChecks);filter.addEventListener("change",filterChecks);}',
'var tabs=document.querySelectorAll("[data-chart-metric]");tabs.forEach(function(tab){tab.addEventListener("click",function(){tabs.forEach(function(button){button.setAttribute("aria-pressed",String(button===tab));});if(window.renderComparison)window.renderComparison(tab.dataset.chartMetric);});});})();'
].join('\n');
function shell(title, key, content, scripts, targetUrl) {
  const scenario = SCENARIOS.find(function(s) { return s.key === key; });
  const links = SCENARIOS.map(function(s,i) {
    return '<a class="nav-link ' + (s.key === key ? 'active' : '') + '" ' + (s.key === key ? 'aria-current="page"' : '') + ' href="' + s.file + '-report.html"><span class="nav-number">0' + (i+1) + '</span>' + s.short + ' Test</a>';
  }).join('');
  return '<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><title>' + esc(title) + ' · Student Task Manager</title><style>' + STYLES + '</style></head><body>' +
    '<a class="skip-link" href="#main">Chuyển đến nội dung</a><aside class="sidebar"><a class="brand" href="index.html" aria-label="Student Task Manager, tổng quan"><span class="brand-mark">st.</span><span><strong>Student Task Manager</strong><small>Performance Lab</small></span></a><div class="nav-label">WORKSPACE</div><nav aria-label="Điều hướng báo cáo"><a class="nav-link ' + (!scenario ? 'active' : '') + '" ' + (!scenario ? 'aria-current="page"' : '') + ' href="index.html">' + icon('grid') + 'Tổng quan</a>' + links + '</nav><div class="nav-divider"></div><a class="nav-link help-link" href="#reading-guide">' + icon('book') + 'Hướng dẫn đọc</a><div class="sidebar-bottom"><div class="environment"><small>MÔI TRƯỜNG KIỂM THỬ</small><div><span class="dot"></span><span>' + esc(targetUrl || 'Xem trong từng báo cáo') + '</span></div></div><p class="sidebar-note">SWT301 · Software Testing<br>Được đo lường bằng Grafana k6</p></div></aside>' +
    '<div class="workspace"><header class="topbar"><div class="breadcrumbs"><span>Performance Lab</span><span>/</span><b>' + esc(scenario ? scenario.short + ' Test' : 'Tổng quan') + '</b></div><div class="top-tools">' +
    (scenario ? '<a class="button" href="' + scenario.file + '-summary.json" download>' + icon('download') + 'JSON</a>' : '<span class="info-chip no-print">k6 reports</span>') +
    '<button class="tool-button" id="theme-toggle" title="Đổi giao diện sáng / tối" aria-label="Giao diện tối" aria-pressed="false">' + icon('moon') + '</button><button class="button" id="print-report">' + icon('print') + '<span class="print-label">In báo cáo</span></button></div></header><main id="main">' + content +
    '<footer class="footnote"><span><strong>Student Task Manager</strong> / Performance Testing</span><span>SWT301 · Powered by Grafana k6</span></footer></main></div>' + (scripts || '') + '<script>' + COMMON_SCRIPT + '</script></body></html>';
}
function qualityPanel(models) {
  const thresholds = models.reduce(function(all,m) { return all.concat(m.thresholds); }, []);
  const passed = thresholds.filter(function(t) { return t.passed; }).length;
  const percentage = thresholds.length ? passed / thresholds.length * 100 : null;
  const checkPasses = models.reduce(function(sum,m) { return sum + (m.checkTotals.passes || 0); }, 0);
  const checkFails = models.reduce(function(sum,m) { return sum + (m.checkTotals.fails || 0); }, 0);
  const circumference = 276.46;
  return '<section class="panel"><div class="panel-head"><div><h2>Chất lượng kiểm thử</h2><p>Các ngưỡng SLA đã thiết lập</p></div>' + icon('check') + '</div><div class="panel-body"><div class="quality"><div class="ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" fill="none" stroke="var(--track)" stroke-width="7"/><circle cx="50" cy="50" r="44" fill="none" stroke="var(--green)" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + (circumference*(1-(percentage||0)/100)) + '"/></svg><div class="ring-value">' + number(percentage) + (percentage === null ? '' : '%') + '<small>ngưỡng đạt</small></div></div><div class="quality-legend"><div><span>Đạt ngưỡng</span><strong>' + passed + '</strong></div><div><span>Không đạt</span><strong>' + (thresholds.length-passed) + '</strong></div><div><span>Tổng tiêu chí</span><strong>' + thresholds.length + '</strong></div></div></div><div class="quality-foot"><span>Functional checks</span><strong>' + number(checkPasses) + ' / ' + number(checkPasses+checkFails) + ' đạt</strong></div></div></section>';
}
function heading(title, subtitle, eyebrow, meta) {
  return '<div class="page-heading"><div><p class="eyebrow">' + esc(eyebrow) + '</p><h1>' + esc(title) + '</h1><p class="subtitle">' + esc(subtitle) + '</p></div><div class="heading-meta">' + (meta || 'STUDENT TASK MANAGER<strong>Báo cáo hiệu năng REST API</strong>') + '</div></div>';
}
function guide(dashboard) {
  return '<aside class="help" id="reading-guide">' + icon('book') + '<div><h3>Đọc báo cáo trong một phút</h3><p>P95 là thời gian phản hồi mà 95% request không vượt quá. Throughput là tổng request mỗi giây. PASS/FAIL được lấy từ các threshold do k6 đánh giá; functional checks được trình bày riêng. N/A nghĩa là chỉ số chưa được xuất trong dữ liệu.' +
    (dashboard ? ' Các kịch bản chạy độc lập; tổng request chỉ là tổng số của những báo cáo hiện có. Sau mỗi lần chạy k6, mở lại trang để tải dữ liệu mới.' : '') + '</p></div></aside>';
}
function comparisonItems(models, metric) {
  return SCENARIOS.map(function(s) {
    const m = models.find(function(m) { return m.key === s.key; });
    return { label: s.short, color: s.color, value: m ? (metric === 'rps' ? m.requests.rate : m.latency['p(95)']) : undefined };
  });
}
function dashboardContent(models) {
  const unknown = models.some(function(m) { return m.status === null; });
  const allPassed = models.length && !unknown ? models.every(function(m) { return m.status; }) : null;
  const total = models.reduce(function(sum,m) { return sum + (m.requests.count || 0); }, 0);
  const errors = models.reduce(function(sum,m) { return sum + (m.errors.passes || 0); }, 0);
  const observed = models.map(function(m) { return m.vus; }).filter(function(v) { return typeof v === 'number'; });
  const maxVus = observed.length ? Math.max.apply(null, observed) : undefined;
  const rows = SCENARIOS.map(function(s,i) {
    const m = models.find(function(r) { return r.key === s.key; });
    return '<tr><td><a class="scenario-name" href="' + s.file + '-report.html"><span class="scenario-number">0' + (i+1) + '</span><span><strong>' + s.title + '</strong><small>' + s.description + '</small></span></a></td><td class="numeric">' + (m ? number(m.vus) : '—') + '</td><td class="numeric">' + (m ? number(m.durationMs/1000,1)+' s' : '—') + '</td><td class="numeric">' + (m ? number(m.requests.count) : '—') + '</td><td class="numeric">' + (m ? number(m.requests.rate,1) : '—') + '</td><td class="numeric">' + (m ? duration(m.latency['p(95)']) : '—') + '</td><td>' + badge(m ? m.status : null) + '</td><td><a class="row-link" href="' + s.file + '-report.html">Chi tiết ' + icon('arrow') + '</a></td></tr>';
  }).join('');
  return heading('Tổng quan hiệu năng','Một góc nhìn thống nhất cho toàn bộ kịch bản kiểm thử.','Performance overview') +
    '<div class="status-strip"><div class="status-main"><span class="status-icon ' + (allPassed === false ? 'fail' : '') + '">' + icon('check') + '</span><div><strong>' +
    (!models.length ? 'Chưa có báo cáo kiểm thử' : allPassed ? 'Các kịch bản hiện có đều đạt ngưỡng SLA' : unknown ? 'Một số báo cáo chưa có kết quả SLA' : 'Có kịch bản chưa đạt ngưỡng SLA') + '</strong><p>' + models.length +
    ' / 4 báo cáo có dữ liệu · Xem kết quả chi tiết theo từng kịch bản</p></div></div>' + badge(allPassed,models.length ? 'SLA '+(allPassed === null ? 'N/A' : allPassed ? 'PASSED' : 'FAILED') : undefined) + '</div>' +
    '<div class="metrics">' + card('Kịch bản kiểm thử',models.length+' / 4','','Smoke · Load · Stress · Full Flow','grid') +
    card('Tổng request',number(total),'','Tổng từ các báo cáo hiện có','chart') +
    card('Mức tải ghi nhận cao nhất',number(maxVus),'VUs','Số VU quan sát trong summary','bolt') +
    card('Tỷ lệ request lỗi',number(total ? errors/total*100 : undefined,2),'%',number(errors)+' request thất bại','check') + '</div>' +
    '<div class="grid-two"><section class="panel"><div class="panel-head"><div><h2>So sánh hiệu năng</h2><p id="comparison-subtitle">Thời gian phản hồi P95 · thấp hơn là tốt hơn</p></div><div class="segmented" role="group" aria-label="Chỉ số so sánh"><button data-chart-metric="p95" aria-pressed="true">P95</button><button data-chart-metric="rps" aria-pressed="false">RPS</button></div></div><div class="panel-body"><div id="comparison-chart">' +
    chart(comparisonItems(models,'p95'),'ms','So sánh P95') + '</div><p class="chart-note" id="comparison-note">Số liệu tổng hợp từng lần chạy, không phải biểu đồ theo thời gian.</p></div></section>' + qualityPanel(models) +
    '</div><section class="panel"><div class="panel-head"><div><h2>Các kịch bản kiểm thử</h2><p>Từ kiểm tra tính sẵn sàng đến toàn bộ vòng đời CRUD</p></div><span class="info-chip">4 kịch bản</span></div><div class="table-wrap"><table><thead><tr><th>KỊCH BẢN</th><th class="numeric">VUs</th><th class="numeric">THỜI GIAN</th><th class="numeric">REQUESTS</th><th class="numeric">REQ / S</th><th class="numeric">P95</th><th>KẾT QUẢ SLA</th><th aria-label="Xem báo cáo"></th></tr></thead><tbody>' +
    rows + '</tbody></table></div><div class="panel-foot"><span>Chọn kịch bản để xem phân tích và functional checks.</span><span>Đơn vị thời gian: ms</span></div></section>' + guide(true);
}
function scriptJSON(data) { return JSON.stringify(data).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029'); }
/** Sidecars keep the dashboard fresh on each k6 run, including file:// use. */
export function generateDashboardData(data, options = {}) {
  if (!SCENARIOS.some(function(s) { return s.key === options.reportKey; })) throw new Error('Unknown reportKey');
  return 'window.STM_REPORTS = window.STM_REPORTS || {};\nwindow.STM_REPORTS[' + scriptJSON(options.reportKey) + '] = ' + scriptJSON(model(data,options)) + ';\n';
}
export function generateDashboard() {
  const dependencies = [esc,number,duration,icon,badge,card,chart,qualityPanel,heading,guide,comparisonItems,dashboardContent].map(function(fn) { return fn.toString(); }).join('\n');
  const scripts = SCENARIOS.map(function(s) { return '<script src="'+s.file+'-data.js"></script>'; }).join('') +
    '<script>var SCENARIOS=' + scriptJSON(SCENARIOS) + ';' + dependencies +
    '\nvar models=SCENARIOS.map(function(s){return (window.STM_REPORTS||{})[s.key];}).filter(Boolean);document.getElementById("dashboard-content").innerHTML=dashboardContent(models);window.renderComparison=function(metric){document.getElementById("comparison-chart").innerHTML=chart(comparisonItems(models,metric),metric==="rps"?"req/s":"ms",metric==="rps"?"So sánh throughput":"So sánh P95");document.getElementById("comparison-subtitle").textContent=metric==="rps"?"Throughput · tổng request mỗi giây":"Thời gian phản hồi P95 · thấp hơn là tốt hơn";document.getElementById("comparison-note").textContent=metric==="rps"?"Mức VU và thời gian nghỉ khác nhau giữa các kịch bản; RPS không biểu thị tải tương đương.":"Số liệu tổng hợp từng lần chạy, không phải biểu đồ theo thời gian.";};</script>';
  return shell('Tổng quan hiệu năng','', '<div id="dashboard-content">'+dashboardContent([])+'</div><noscript><p class="empty-message">Bật JavaScript để xem tổng quan. Các liên kết báo cáo chi tiết vẫn hoạt động.</p></noscript>',scripts);
}
export function generateHtmlReport(data, options = {}) {
  const m = model(data,options);
  const scenario = SCENARIOS.find(function(s) { return s.key === m.key; });
  const checks = m.checks;
  const rows = checks.map(function(c) {
    const total = c.passes+c.fails, rate = total ? c.passes/total*100 : undefined;
    return '<tr class="check-row" data-status="'+(c.fails ? 'fail' : 'pass')+'"><td class="check-name">'+esc(c.name)+'<small>'+esc(c.group)+'</small></td><td class="numeric">'+number(c.passes)+'</td><td class="numeric">'+number(c.fails)+'</td><td class="numeric">'+number(rate,1)+'%<span class="progress" aria-hidden="true"><span style="width:'+(rate||0)+'%"></span></span></td><td>'+badge(total ? c.fails===0 : null)+'</td></tr>';
  }).join('');
  const thresholds = m.thresholds.map(function(t) { return '<tr><td>'+esc(t.metric)+'</td><td class="threshold-expression">'+esc(t.expression)+'</td><td>'+badge(t.passed)+'</td></tr>'; }).join('');
  const timestamp = m.generatedAt === 'saved' ? 'Dữ liệu kiểm thử đã lưu' : 'Tạo báo cáo: '+new Date(m.generatedAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
  const latency = [['Avg','avg'],['Median','med'],['P90','p(90)'],['P95','p(95)'],['P99','p(99)'],['Max','max']];
  const content = heading(m.title,scenario ? scenario.description+' · Student Task Manager REST API' : m.scenarioType,'Scenario report',esc(timestamp)+'<strong>'+esc(m.targetUrl)+'</strong>') +
    '<div class="status-strip"><div class="status-main"><span class="status-icon '+(m.status===false ? 'fail' : '')+'">'+icon('check')+'</span><div><strong>'+(m.status===null ? 'Chưa có threshold được thiết lập' : m.status ? 'Kịch bản đạt các ngưỡng SLA đã thiết lập' : 'Kịch bản có ngưỡng SLA chưa đạt')+'</strong><p>'+
    m.thresholds.filter(function(t) { return t.passed; }).length+' / '+m.thresholds.length+' tiêu chí đạt · Functional checks được thống kê riêng bên dưới</p></div></div>'+badge(m.status)+'</div>' +
    '<div class="metrics">'+card('Tổng request',number(m.requests.count),'',number(m.iterations.count)+' iterations hoàn thành','chart')+
    card('Throughput trung bình',number(m.requests.rate,1),'req/s','Trên toàn bộ thời gian chạy','bolt')+
    card('Thời gian phản hồi P95',number(m.latency['p(95)'],2),'ms','95% request không vượt quá mức này','clock')+
    card('Tỷ lệ request lỗi',number(typeof m.errors.rate==='number' ? m.errors.rate*100 : undefined,2),'%',number(m.errors.passes)+' request thất bại','check')+'</div>'+
    '<div class="grid-two"><section class="panel"><div class="panel-head"><div><h2>Thời gian phản hồi</h2><p>Phân bố các chỉ số tổng hợp · milliseconds</p></div><span class="info-chip">HTTP duration</span></div><div class="panel-body">'+
    chart(latency.slice(0,4).map(function(item) { return {label:item[0],value:m.latency[item[1]],color:item[0]==='P95' ? '#ed744a' : '#809aa8'}; }),'ms','Thời gian phản hồi')+
    '<div class="latency-grid">'+latency.map(function(item) { return '<div class="latency-stat '+(item[0]==='P95' ? 'featured' : '')+'"><span>'+item[0]+'</span><strong>'+duration(m.latency[item[1]])+'</strong></div>'; }).join('')+'</div><p class="chart-note">P99 chỉ hiển thị khi có trong summary. N/A không có nghĩa là 0 ms.</p></div></section>'+
    '<section class="panel"><div class="panel-head"><div><h2>Thông tin lần chạy</h2><p>Môi trường và lưu lượng ghi nhận</p></div>'+icon('chart')+'</div><div class="panel-body"><div class="mini-details">'+
    '<div><span>Đích kiểm thử</span><strong>'+esc(m.targetUrl)+'</strong></div><div><span>Thời gian thực thi</span><strong>'+number(typeof m.durationMs==='number' ? m.durationMs/1000 : undefined,2)+' s</strong></div><div><span>VUs ghi nhận / cấp phát</span><strong>'+number(m.vus)+' / '+number(m.allocatedVus)+'</strong></div><div><span>Dữ liệu nhận</span><strong>'+bytes(m.received.count)+'</strong></div><div><span>Dữ liệu gửi</span><strong>'+bytes(m.sent.count)+'</strong></div><div><span>Response time nhỏ nhất</span><strong>'+duration(m.latency.min)+'</strong></div></div></div></section></div>'+
    '<section class="panel section-gap" id="thresholds"><div class="panel-head"><div><h2><span class="section-id">01</span>Ngưỡng đánh giá SLA</h2><p>Kết quả nguyên bản do k6 đánh giá</p></div><span class="info-chip">'+m.thresholds.length+' tiêu chí</span></div><div class="table-wrap"><table><thead><tr><th>CHỈ SỐ</th><th>ĐIỀU KIỆN</th><th>KẾT QUẢ</th></tr></thead><tbody>'+(thresholds||'<tr><td colspan="3">Chưa có ngưỡng đánh giá.</td></tr>')+'</tbody></table></div></section>'+
    '<section class="panel checks-panel" id="checks"><div class="panel-head check-heading"><div><h2><span class="section-id">02</span>Functional checks</h2><p>Xác minh nội dung và mã phản hồi của từng thao tác</p></div><div class="check-toolbar"><label class="search-field">'+icon('search')+'<input type="search" id="check-search" placeholder="Tìm nội dung kiểm tra…" aria-label="Tìm functional check"></label><select id="check-filter" aria-label="Lọc kết quả check"><option value="all">Tất cả</option><option value="pass">Đạt</option><option value="fail">Không đạt</option></select></div></div><div class="table-wrap"><table><thead><tr><th>NỘI DUNG KIỂM TRA</th><th class="numeric">ĐẠT</th><th class="numeric">KHÔNG ĐẠT</th><th class="numeric">TỶ LỆ ĐẠT</th><th>KẾT QUẢ</th></tr></thead><tbody>'+rows+'</tbody></table></div><p class="empty-message" id="checks-empty" '+(checks.length ? 'hidden' : '')+'>Không có nội dung kiểm tra phù hợp.</p><div class="panel-foot"><span id="check-count" role="status" aria-live="polite">'+checks.length+' / '+checks.length+' nội dung</span><span>'+number(m.checkTotals.passes)+' checks đạt · '+number(m.checkTotals.fails)+' checks lỗi</span></div></section>'+guide(false);
  return shell(m.title,m.key,content,'',m.targetUrl);
}
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


function formatNumber(num, decimals = 2) { if (num === undefined || num === null || isNaN(num)) return "0.00"; return Number(num).toFixed(decimals); }
function formatDuration(ms) { if (!ms || ms === 0) return "0 ms"; if (ms < 1000) return formatNumber(ms, 2) + " ms"; return formatNumber(ms / 1000, 2) + " s"; }

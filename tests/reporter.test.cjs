const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
test('offline and k6 report rendering work without Number.toLocaleString support', async () => {
  const source = await fs.readFile(path.join(__dirname, '../utils/reporter.js'), 'utf8');
  const renderer = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  const data = JSON.parse(await fs.readFile(path.join(__dirname, '../reports/smoke-test-summary.json'), 'utf8'));
  const original = Number.prototype.toLocaleString;
  Number.prototype.toLocaleString = () => { throw new Error('Not supported by k6'); };
  try {
    const html = renderer.generateHtmlReport(data, { reportKey: 'smoke', testName: '<Smoke>', targetUrl: 'http://localhost:3000' });
    assert.match(html, /StudyFlow/);
    assert.match(html, /#7662cf/);
    assert.match(html, /Smoke Testing/);
    assert.match(renderer.generateDashboard(), /Performance Lab/);
  } finally { Number.prototype.toLocaleString = original; }
});

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createServer } = require('../ui-server.cjs');
let api, ui, base;
before(async () => {
  api = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ method: req.method, path: req.url, authorization: req.headers.authorization, body }));
    });
  });
  await new Promise(resolve => api.listen(0, '127.0.0.1', resolve));
  ui = createServer({ apiBaseUrl: `http://127.0.0.1:${api.address().port}` });
  await new Promise(resolve => ui.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${ui.address().port}`;
});
after(async () => {
  await Promise.all([new Promise(resolve => ui.close(resolve)), new Promise(resolve => api.close(resolve))]);
});
test('serves the shared StudyFlow login, assets and existing performance reports', async () => {
  assert.match(await (await fetch(base)).text(), /sf-login/);
  assert.match(await (await fetch(base + '/css/studyflow-common.css')).text(), /#7662cf/);
  assert.equal((await fetch(base + '/reports/index.html')).status, 200);
  assert.equal((await fetch(base + '/%ZZ')).status, 400);
  assert.equal((await fetch(base + '/..%2fpackage.json')).status, 403);
});
test('forwards API methods, query, token and JSON unchanged to the configured backend', async () => {
  const body = JSON.stringify({ title: 'Keep the API contract' });
  const response = await fetch(base + '/api/tasks?status=TODO', { method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }, body });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { method: 'POST', path: '/api/tasks?status=TODO', authorization: 'Bearer test-token', body });
});
test('returns a useful 502 message if the API is unavailable', async () => {
  const temporaryApi = http.createServer();
  await new Promise(resolve => temporaryApi.listen(0, '127.0.0.1', resolve));
  const port = temporaryApi.address().port;
  await new Promise(resolve => temporaryApi.close(resolve));
  const offline = createServer({ apiBaseUrl: `http://127.0.0.1:${port}` });
  await new Promise(resolve => offline.listen(0, '127.0.0.1', resolve));
  try {
    const result = await fetch(`http://127.0.0.1:${offline.address().port}/api/health`);
    assert.equal(result.status, 502);
    assert.match((await result.json()).message, /REST API/);
  } finally { await new Promise(resolve => offline.close(resolve)); }
});

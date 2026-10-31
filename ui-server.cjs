// StudyFlow UI and same-origin proxy. k6 continues to target config/environment.js.
const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

function createServer({ apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000' } = {}) {
  const api = new URL(apiBaseUrl);
  if (!['http:', 'https:'].includes(api.protocol)) throw new Error('API_BASE_URL must use HTTP or HTTPS');
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8' };
  return http.createServer((req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.url.startsWith('/api/')) {
      const target = new URL(req.url, api);
      const proxy = (api.protocol === 'https:' ? https : http).request(target, {
        method: req.method,
        headers: { ...req.headers, host: api.host },
      }, upstream => {
        res.writeHead(upstream.statusCode, upstream.headers);
        upstream.pipe(res);
      });
      proxy.setTimeout(10000, () => proxy.destroy(new Error('API timed out')));
      proxy.on('error', () => {
        if (res.headersSent) return res.destroy();
        res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: 'Không kết nối được REST API. Hãy khởi động API server hoặc kiểm tra API_BASE_URL.' }));
      });
      req.on('aborted', () => proxy.destroy());
      req.pipe(proxy);
      return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    let pathname;
    try { pathname = decodeURIComponent(req.url.split('?')[0]); }
    catch { res.writeHead(400); res.end(); return; }
    if (pathname.includes('\0')) { res.writeHead(400); res.end(); return; }
    const isReport = pathname.startsWith('/reports/');
    const directory = path.join(__dirname, isReport ? 'reports' : 'public');
    const filename = isReport ? pathname.slice('/reports'.length) : pathname === '/' ? '/index.html' : pathname;
    const target = path.resolve(directory, '.' + filename);
    const relative = path.relative(directory, target);
    if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) { res.writeHead(403); res.end(); return; }
    fs.stat(target, (error, stat) => {
      if (error || !stat.isFile()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      if (req.method === 'HEAD') { res.end(); return; }
      const stream = fs.createReadStream(target);
      stream.on('error', () => res.destroy());
      stream.pipe(res);
    });
  });
}
if (require.main === module) {
  const port = Number(process.env.UI_PORT || 3106);
  createServer().listen(port, () => console.log(`StudyFlow UI: http://localhost:${port} | API: ${process.env.API_BASE_URL || 'http://localhost:3000'}`));
}
module.exports = { createServer };

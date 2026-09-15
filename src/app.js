import { createServer } from 'node:http';

export const message = 'Hello from Jenkins! My deployment is automated.';

export function createApp() {
  return createServer((req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (req.method !== 'GET') {
      res.writeHead(405, { Allow: 'GET' });
      return res.end('Method not allowed');
    }
    if (path === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'ok' }));
    }
    if (path === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Jenkins Node Demo</title></head><body><h1>${message}</h1><p>Git push → Jenkins → Install → Lint → Test → Build → Deploy</p><p>Change the message in src/app.js, commit, and push to see an automatic update.</p><a href="/health">Health check</a></body></html>`);
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });
}

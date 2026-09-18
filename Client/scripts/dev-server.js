#!/usr/bin/env node
/**
 * dev-server.js — Brook Hollow Chat SDK development server
 * =========================================================
 * Serves the Client/ folder on http://localhost:8001 and proxies
 * /chat/* and /health to the BROOK-RAG backend (default: localhost:8000).
 *
 * Because both the HTML page AND the API requests come from the same origin
 * (localhost:8001), the browser never sends a CORS preflight — no changes to
 * the backend are needed.
 *
 * Usage:
 *   node scripts/dev-server.js
 *   node scripts/dev-server.js --port 3000 --api http://127.0.0.1:8000
 *
 * Then open: http://localhost:8001/examples/full-options.html
 *            http://localhost:8001/examples/basic.html
 *
 * Requirements: Node.js 18+ (uses built-in http, fs, path, url modules only).
 */

import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { request as httpRequest } from 'node:http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

/* ─── CLI args ─────────────────────────────────────────────────────────────── */
const args = process.argv.slice(2);
const getArg = (flag, def) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
};

const PORT    = parseInt(getArg('--port', '8001'), 10);
const API_URL = getArg('--api', 'http://127.0.0.1:8000');
const API_HOST = new URL(API_URL).hostname;
const API_PORT = parseInt(new URL(API_URL).port || '80', 10);

/* ─── MIME types ───────────────────────────────────────────────────────────── */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.woff2':'font/woff2',
};

/* ─── Proxy request to backend ─────────────────────────────────────────────── */
function proxy(clientReq, clientRes) {
  // Forward the original method, path, and body as-is.
  // Because this is a same-machine proxy (Node → Node), no CORS headers are
  // involved. The browser only sees localhost:8001 on both sides.
  const options = {
    hostname: API_HOST,
    port:     API_PORT,
    path:     clientReq.url,
    method:   clientReq.method,
    headers: {
      ...clientReq.headers,
      host: `${API_HOST}:${API_PORT}`,  // rewrite Host header for the backend
    },
  };

  const proxyReq = httpRequest(options, proxyRes => {
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(clientRes);
  });

  proxyReq.on('error', err => {
    console.error(`  [proxy] backend unreachable: ${err.message}`);
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
    }
    clientRes.end('Backend unreachable. Is BROOK-RAG running on ' + API_URL + '?');
  });

  clientReq.pipe(proxyReq);
}

/* ─── Static file server ───────────────────────────────────────────────────── */
function serveFile(req, res) {
  // Default root to /examples/full-options.html for convenience
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/' || urlPath === '') urlPath = '/examples/full-options.html';

  const filePath = resolve(ROOT, '.' + urlPath);

  // Security: prevent path traversal outside ROOT
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  let stat;
  try { stat = statSync(filePath); } catch (_) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`404 Not Found: ${urlPath}`);
    return;
  }

  if (stat.isDirectory()) {
    // Try index.html inside directory
    const idx = resolve(filePath, 'index.html');
    try { statSync(idx); } catch (_) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('No index.html found');
      return;
    }
    serveFile({ url: urlPath + '/index.html' }, res);
    return;
  }

  const mime = MIME[extname(filePath)] || 'application/octet-stream';
  let content;
  try { content = readFileSync(filePath); } catch (_) {
    res.writeHead(500); res.end('Read error'); return;
  }

  res.writeHead(200, { 'Content-Type': mime, 'Content-Length': content.length });
  res.end(content);
}

/* ─── HTTP server ──────────────────────────────────────────────────────────── */
const server = createServer((req, res) => {
  const url = req.url || '/';

  // Proxy API routes to the backend
  if (url.startsWith('/chat/') || url === '/health') {
    proxy(req, res);
    return;
  }

  // Serve static files
  serveFile(req, res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  Brook Hollow Chat SDK — dev server');
  console.log('  ────────────────────────────────────────────────────');
  console.log(`  Serving:   http://localhost:${PORT}`);
  console.log(`  Proxying:  /chat/* and /health  →  ${API_URL}`);
  console.log('');
  console.log('  Open in your browser:');
  console.log(`    http://localhost:${PORT}/examples/full-options.html`);
  console.log(`    http://localhost:${PORT}/examples/basic.html`);
  console.log('');
  console.log('  No CORS headers needed — browser sees one origin.');
  console.log('  Press Ctrl+C to stop.');
  console.log('');
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  ❌  Port ${PORT} is already in use.`);
    console.error(`     Try: node scripts/dev-server.js --port 3000\n`);
  } else {
    console.error('  ❌  Server error:', err.message);
  }
  process.exit(1);
});

#!/usr/bin/env node
'use strict';

const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 8181);
const HOST = process.env.HOST || '0.0.0.0';
const USERNAME = process.env.BRUCE_USER || 'admin';
const PASSWORD = process.env.BRUCE_PASS || 'admin';
const LOGIN_REDIRECT = process.env.MOCK_LOGIN_REDIRECT === '1';

// In-memory auth/session and mock file systems.
const sessions = new Set();
const fsStore = {
  SD: {
    '/': { type: 'dir' },
    '/payloads': { type: 'dir' },
    '/payloads/blink.js': { type: 'file', content: 'print("blink")\n' },
    '/wifi_scan.txt': { type: 'file', content: 'AP1\nAP2\nAP3\n' },
    '/song.mp3': { type: 'file', content: 'MOCK_MP3_DATA' },
  },
  LittleFS: {
    '/': { type: 'dir' },
    '/notes.txt': { type: 'file', content: 'Bruce mock server running.\n' },
  },
};

function send(res, statusCode, body, headers = {}) {
  const data = Buffer.isBuffer(body) ? body : Buffer.from(String(body || ''), 'utf8');
  res.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Length': data.length,
    ...headers,
  });
  res.end(data);
}

function parseCookie(cookieHeader) {
  if (!cookieHeader) return {};
  const out = {};
  const parts = cookieHeader.split(';');
  for (const p of parts) {
    const idx = p.indexOf('=');
    if (idx < 0) continue;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx + 1).trim();
    out[k] = v;
  }
  return out;
}

function isAuthed(req) {
  const cookies = parseCookie(req.headers.cookie || '');
  return Boolean(cookies.BRUCESESSION && sessions.has(cookies.BRUCESESSION));
}

function randomToken() {
  return crypto.randomBytes(16).toString('hex');
}

function normalizePath(p) {
  if (!p) return '/';
  let path = p.startsWith('/') ? p : `/${p}`;
  path = path.replace(/\/+/g, '/');
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path;
}

function parentPath(path) {
  if (path === '/') return '/';
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return `/${parts.join('/')}` || '/';
}

function ensureDir(store, dirPath) {
  const p = normalizePath(dirPath);
  if (!store[p]) store[p] = { type: 'dir' };
}

function parseMultipart(bodyBuffer, contentType) {
  const ct = contentType || '';
  const bMatch = ct.match(/boundary=([^;]+)/i);
  if (!bMatch) return {};
  const boundary = bMatch[1];
  const raw = bodyBuffer.toString('latin1');
  const parts = raw.split(`--${boundary}`);
  const fields = {};

  for (const part of parts) {
    if (!part || part === '--\r\n' || part === '--') continue;
    const trimmed = part.replace(/^\r\n/, '').replace(/\r\n$/, '');
    const split = trimmed.search(/\r?\n\r?\n/);
    if (split < 0) continue;

    const headerText = trimmed.slice(0, split);
    const valueText = trimmed.slice(split).replace(/^\r?\n\r?\n/, '').replace(/\r?\n$/, '');
    const nameMatch = headerText.match(/name="([^"]+)"/i);
    if (!nameMatch) continue;

    fields[nameMatch[1]] = valueText;
  }

  return fields;
}

function parseUrlEncoded(bodyBuffer) {
  const s = bodyBuffer.toString('utf8');
  const out = {};
  const params = new URLSearchParams(s);
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

function parseBody(req, rawBody) {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return parseMultipart(rawBody, contentType);
  }
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return parseUrlEncoded(rawBody);
  }
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(rawBody.toString('utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

function listChildren(store, folder) {
  const base = normalizePath(folder);
  const rows = [`pa:${parentPath(base)}:0`];
  const childMap = new Map();

  for (const fullPath of Object.keys(store)) {
    if (fullPath === '/' || fullPath === base) continue;
    if (!fullPath.startsWith(base === '/' ? '/' : `${base}/`)) continue;

    const rel = base === '/'
      ? fullPath.slice(1)
      : fullPath.slice(base.length + 1);

    const first = rel.split('/')[0];
    if (!first) continue;

    const directChildPath = base === '/' ? `/${first}` : `${base}/${first}`;
    if (!childMap.has(first)) {
      const node = store[directChildPath];
      if (node) {
        childMap.set(first, { name: first, type: node.type, path: directChildPath });
      } else {
        childMap.set(first, { name: first, type: 'dir', path: directChildPath });
      }
    }
  }

  const children = [...childMap.values()].sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === 'dir' ? -1 : 1;
  });

  for (const child of children) {
    if (child.type === 'dir') rows.push(`Fo:${child.name}:0`);
    else {
      const content = String(store[child.path]?.content || '');
      rows.push(`Fi:${child.name}:${content.length} B`);
    }
  }

  return rows.join('\n') + '\n';
}

function requireAuth(req, res) {
  if (!isAuthed(req)) {
    send(res, 401, 'Unauthorized', { 'Content-Type': 'text/plain' });
    return false;
  }
  return true;
}

function getStore(fsName) {
  return fsName === 'SD' ? fsStore.SD : fsStore.LittleFS;
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function handle(req, res) {
  if (req.method === 'OPTIONS') {
    send(res, 204, '', {});
    return;
  }

  const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = u.pathname;

  if (req.method === 'GET' && path === '/') {
    const cookies = parseCookie(req.headers.cookie || '');
    const token = cookies.BRUCESESSION;
    const extra = token && sessions.has(token) ? { 'X-Bruce-Session': token } : {};
    send(res, 200, 'Bruce mock server online\n', { 'Content-Type': 'text/plain', ...extra });
    return;
  }

  if (req.method === 'POST' && path === '/login') {
    const body = await collectBody(req);
    const fields = parseBody(req, body);
    const username = fields.username || '';
    const password = fields.password || '';

    if (username === USERNAME && password === PASSWORD) {
      const token = randomToken();
      sessions.add(token);
      if (LOGIN_REDIRECT) {
        send(res, 302, '', {
          Location: '/',
          'Set-Cookie': `BRUCESESSION=${token}; Path=/; HttpOnly`,
          'X-Bruce-Session': token,
        });
      } else {
        send(res, 200, JSON.stringify({ ok: true, session: token }), {
          'Content-Type': 'application/json',
          'Set-Cookie': `BRUCESESSION=${token}; Path=/; HttpOnly`,
          'X-Bruce-Session': token,
        });
      }
      return;
    }

    send(res, 302, '', { Location: '/?failed' });
    return;
  }

  if (req.method === 'GET' && path === '/logout') {
    const cookies = parseCookie(req.headers.cookie || '');
    if (cookies.BRUCESESSION) sessions.delete(cookies.BRUCESESSION);
    send(res, 302, '', {
      Location: '/?loggedout',
      'Set-Cookie': 'BRUCESESSION=0; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    });
    return;
  }

  if (req.method === 'GET' && path === '/systeminfo') {
    if (!requireAuth(req, res)) return;
    const payload = {
      BRUCE_VERSION: 'mock-0.1.0',
      SD: { free: '3.7 MB', used: '1.3 MB', total: '5.0 MB' },
      LittleFS: { free: '1.1 MB', used: '0.4 MB', total: '1.5 MB' },
    };
    send(res, 200, JSON.stringify(payload), { 'Content-Type': 'application/json' });
    return;
  }

  if (req.method === 'GET' && path === '/listfiles') {
    if (!requireAuth(req, res)) return;
    const fsName = u.searchParams.get('fs') || 'SD';
    const folder = normalizePath(u.searchParams.get('folder') || '/');
    const store = getStore(fsName);
    ensureDir(store, folder);
    send(res, 200, listChildren(store, folder), { 'Content-Type': 'text/plain' });
    return;
  }

  if (req.method === 'GET' && path === '/file') {
    if (!requireAuth(req, res)) return;
    const fsName = u.searchParams.get('fs') || 'SD';
    const name = normalizePath(u.searchParams.get('name') || '');
    const action = u.searchParams.get('action') || '';
    const store = getStore(fsName);

    if (!name) {
      send(res, 400, 'ERROR: name and action params required', { 'Content-Type': 'text/plain' });
      return;
    }

    const exists = Boolean(store[name]);

    if (action === 'create') {
      store[name] = { type: 'dir' };
      send(res, 200, `Created new folder: ${name}`, { 'Content-Type': 'text/plain' });
      return;
    }

    if (action === 'createfile') {
      ensureDir(store, parentPath(name));
      store[name] = { type: 'file', content: '' };
      send(res, 200, `Created new file: ${name}`, { 'Content-Type': 'text/plain' });
      return;
    }

    if (!exists) {
      send(res, 400, 'ERROR: file does not exist', { 'Content-Type': 'text/plain' });
      return;
    }

    if (action === 'download') {
      const content = String(store[name].content || '');
      send(res, 200, content, { 'Content-Type': 'application/octet-stream' });
      return;
    }

    if (action === 'image') {
      // 1x1 PNG transparent pixel.
      const png = Buffer.from(
        '89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C6360000000020001E221BC330000000049454E44AE426082',
        'hex',
      );
      send(res, 200, png, { 'Content-Type': 'image/png' });
      return;
    }

    if (action === 'delete') {
      delete store[name];
      send(res, 200, `Deleted : ${name}`, { 'Content-Type': 'text/plain' });
      return;
    }

    if (action === 'edit') {
      const content = String(store[name].content || '');
      send(res, 200, content, { 'Content-Type': 'text/plain' });
      return;
    }

    send(res, 400, 'ERROR: invalid action param supplied', { 'Content-Type': 'text/plain' });
    return;
  }

  if (req.method === 'POST' && path === '/edit') {
    if (!requireAuth(req, res)) return;
    const body = await collectBody(req);
    const fields = parseBody(req, body);
    const fsName = fields.fs || 'SD';
    const name = normalizePath(fields.name || '');
    const content = String(fields.content || '');
    const store = getStore(fsName);

    if (!name) {
      send(res, 400, 'ERROR: name, content, and fs parameters required', { 'Content-Type': 'text/plain' });
      return;
    }

    ensureDir(store, parentPath(name));
    store[name] = { type: 'file', content };
    send(res, 200, `File edited: ${name}`, { 'Content-Type': 'text/plain' });
    return;
  }

  if (req.method === 'POST' && path === '/rename') {
    if (!requireAuth(req, res)) return;
    const body = await collectBody(req);
    const fields = parseBody(req, body);
    const fsName = fields.fs || 'SD';
    const filePath = normalizePath(fields.filePath || '');
    const fileName = String(fields.fileName || '');
    const store = getStore(fsName);

    if (!filePath || !fileName) {
      send(res, 400, 'Missing filePath or fileName', { 'Content-Type': 'text/plain' });
      return;
    }

    const newPath = normalizePath(`${parentPath(filePath)}/${fileName}`);
    if (!store[filePath]) {
      send(res, 200, 'Fail renaming file.', { 'Content-Type': 'text/plain' });
      return;
    }

    store[newPath] = store[filePath];
    delete store[filePath];
    send(res, 200, `${filePath} renamed to ${newPath}`, { 'Content-Type': 'text/plain' });
    return;
  }

  if (req.method === 'POST' && path === '/upload') {
    if (!requireAuth(req, res)) return;
    const body = await collectBody(req);
    const fields = parseBody(req, body);
    const fsName = fields.fs || 'SD';
    const folder = normalizePath(fields.folder || '/');
    const fileName = fields.file || `upload_${Date.now()}.bin`;
    const store = getStore(fsName);

    ensureDir(store, folder);
    const target = normalizePath(`${folder}/${fileName.split('/').pop()}`);
    store[target] = {
      type: 'file',
      content: `Uploaded to ${target} at ${new Date().toISOString()}\n`,
    };

    send(res, 200, 'File upload completed', { 'Content-Type': 'text/plain' });
    return;
  }

  if (req.method === 'POST' && path === '/cm') {
    if (!requireAuth(req, res)) return;
    const body = await collectBody(req);
    const fields = parseBody(req, body);
    const cmnd = String(fields.cmnd || '');
    if (!cmnd) {
      send(res, 400, 'http request missing required arg: cmnd', { 'Content-Type': 'text/plain' });
      return;
    }

    if (cmnd.startsWith('nav')) {
      send(res, 200, `command ${cmnd} success`, { 'Content-Type': 'text/plain' });
    } else {
      send(res, 200, `command ${cmnd} queued`, { 'Content-Type': 'text/plain' });
    }
    return;
  }

  if (req.method === 'GET' && path === '/wifi') {
    if (!requireAuth(req, res)) return;
    const usr = u.searchParams.get('usr');
    const pwd = u.searchParams.get('pwd');
    if (!usr || !pwd) {
      send(res, 400, 'Missing usr or pwd', { 'Content-Type': 'text/plain' });
      return;
    }
    send(res, 200, `User: ${usr} configured with password: ${pwd}`, { 'Content-Type': 'text/plain' });
    return;
  }

  if (req.method === 'GET' && path === '/reboot') {
    if (!requireAuth(req, res)) return;
    send(res, 200, 'Rebooting...', { 'Content-Type': 'text/plain' });
    return;
  }

  if (req.method === 'GET' && path === '/getscreen') {
    if (!requireAuth(req, res)) return;
    // Minimal binary payload (not real TFT protocol) - good enough to validate transport.
    const payload = Buffer.from([0x42, 0x52, 0x55, 0x43, 0x45, 0x00, 0x01, 0x02]);
    send(res, 200, payload, { 'Content-Type': 'application/octet-stream' });
    return;
  }

  send(res, 404, 'Not found', { 'Content-Type': 'text/plain' });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error('mock server error:', err);
    send(res, 500, 'Internal server error', { 'Content-Type': 'text/plain' });
  });
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
    console.error('Stop the existing mock server process, or start a new one on another port.');
    console.error(`Example: PORT=${PORT + 1} npm run mock:bruce`);
    process.exitCode = 1;
    return;
  }

  console.error('Failed to start mock server:', err);
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  console.log('Bruce mock server listening');
  console.log(`  URL: http://${HOST}:${PORT}`);
  console.log(`  login: ${USERNAME} / ${PASSWORD}`);
  console.log('  endpoints: /login /systeminfo /listfiles /file /edit /upload /rename /cm /wifi /reboot /getscreen');
});

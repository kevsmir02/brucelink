#!/usr/bin/env node

const http = require('http');
const { URL } = require('url');

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2Rz5wAAAAASUVORK5CYII=',
  'base64',
);

function createInitialState() {
  return {
    fs: {
      SD: {
        '/': [
          { type: 'folder', name: 'scripts', size: '0' },
          { type: 'file', name: 'README.txt', size: '1.1 kB' },
        ],
        '/scripts': [
          { type: 'file', name: 'hello.txt', size: '22 B' },
        ],
      },
      LittleFS: {
        '/': [
          { type: 'folder', name: 'config', size: '0' },
          { type: 'file', name: 'boot.log', size: '370 B' },
        ],
        '/config': [
          { type: 'file', name: 'settings.json', size: '96 B' },
        ],
      },
    },
    files: {
      SD: {
        '/README.txt': 'Welcome to BruceLink test AP.\nUse this for UI polishing.\n',
        '/scripts/hello.txt': 'print("hello from mock AP")\n',
      },
      LittleFS: {
        '/boot.log': '[boot] mock AP ready\n',
        '/config/settings.json': '{"theme":"default","mock":true}\n',
      },
    },
  };
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;

  String(cookieHeader)
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const eq = pair.indexOf('=');
      if (eq > 0) {
        const key = pair.slice(0, eq).trim();
        const value = pair.slice(eq + 1).trim();
        cookies[key] = value;
      }
    });

  return cookies;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function parseFormBody(body) {
  const params = new URLSearchParams(body);
  const out = {};
  for (const [key, value] of params.entries()) {
    out[key] = value;
  }
  return out;
}

function parseMultipartFields(body) {
  const fields = {};
  const regex = /name="([^"]+)"\r\n\r\n([\s\S]*?)\r\n/g;
  let match = regex.exec(body);
  while (match) {
    fields[match[1]] = match[2];
    match = regex.exec(body);
  }
  return fields;
}

function ensureDir(map, path) {
  if (!map[path]) {
    map[path] = [];
  }
}

function parentPath(path) {
  if (path === '/' || !path) return '/';
  const parts = path.replace(/\/$/, '').split('/');
  parts.pop();
  return parts.join('/') || '/';
}

function basename(path) {
  if (!path || path === '/') return '/';
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] || '/';
}

function formatList(folder, entries) {
  const lines = [`pa:${folder}:0`];
  for (const entry of entries) {
    if (entry.type === 'folder') {
      lines.push(`Fo:${entry.name}:0`);
    } else {
      lines.push(`Fi:${entry.name}:${entry.size || '0 B'}`);
    }
  }
  return lines.join('\n');
}

function withAuth(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  if (!cookies.BRUCESESSION) {
    res.writeHead(401, { 'Content-Type': 'text/plain' });
    res.end('Unauthorized');
    return false;
  }
  return true;
}

function createMockAccessPointServer(options = {}) {
  const host = options.host || '0.0.0.0';
  const preferredPort = options.port ?? 8088;
  const sessionToken = options.sessionToken || 'mock-session-token';
  const state = createInitialState();

  let server;
  let runningPort = preferredPort;

  const handler = async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (url.pathname === '/login' && req.method === 'POST') {
      const rawBody = await readBody(req);
      const form = parseFormBody(rawBody);
      const isValid = Boolean(form.username) && Boolean(form.password);

      if (!isValid) {
        res.writeHead(200, {
          'Content-Type': 'text/plain',
          'Location': '/login?failed=1',
          'Set-Cookie': 'BRUCESESSION=; Max-Age=0; Path=/',
        });
        res.end('Login failed');
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Set-Cookie': `BRUCESESSION=${sessionToken}; Path=/; HttpOnly`,
        'x-bruce-session': sessionToken,
      });
      res.end('OK');
      return;
    }

    if (url.pathname === '/logout') {
      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Set-Cookie': 'BRUCESESSION=; Max-Age=0; Path=/',
      });
      res.end('Logged out');
      return;
    }

    if (!withAuth(req, res)) {
      return;
    }

    if (url.pathname === '/systeminfo') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          BRUCE_VERSION: 'mock-1.0.0',
          SD: { free: '15.2 MB', used: '4.8 MB', total: '20.0 MB' },
          LittleFS: { free: '9.1 MB', used: '2.9 MB', total: '12.0 MB' },
        }),
      );
      return;
    }

    if (url.pathname === '/listfiles') {
      const fs = url.searchParams.get('fs') || 'SD';
      const folder = url.searchParams.get('folder') || '/';
      const fsMap = state.fs[fs] || {};
      const entries = fsMap[folder] || [];
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(formatList(folder, entries));
      return;
    }

    if (url.pathname === '/file') {
      const fs = url.searchParams.get('fs') || 'SD';
      const action = url.searchParams.get('action') || '';
      const name = url.searchParams.get('name') || '/';

      ensureDir(state.fs[fs], '/');
      const dir = parentPath(name);
      ensureDir(state.fs[fs], dir);

      if (action === 'edit') {
        const content = state.files[fs][name] || '';
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(content);
        return;
      }

      if (action === 'download') {
        const content = state.files[fs][name] || '';
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${basename(name)}"`,
        });
        res.end(content);
        return;
      }

      if (action === 'image') {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(PNG_1X1);
        return;
      }

      if (action === 'delete') {
        const itemName = basename(name);
        state.fs[fs][dir] = (state.fs[fs][dir] || []).filter((entry) => entry.name !== itemName);
        delete state.files[fs][name];
        delete state.fs[fs][name];
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Deleted');
        return;
      }

      if (action === 'create') {
        const folderName = basename(name);
        ensureDir(state.fs[fs], name);
        state.fs[fs][dir].push({ type: 'folder', name: folderName, size: '0' });
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Folder created');
        return;
      }

      if (action === 'createfile') {
        const fileName = basename(name);
        state.files[fs][name] = '';
        state.fs[fs][dir].push({ type: 'file', name: fileName, size: '0 B' });
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('File created');
        return;
      }

      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Unsupported file action');
      return;
    }

    if (url.pathname === '/edit' && req.method === 'POST') {
      const body = await readBody(req);
      const fields = parseMultipartFields(body);
      const fs = fields.fs || 'SD';
      const filePath = fields.name || '/untitled.txt';
      const content = fields.content || '';
      const dir = parentPath(filePath);
      const fileName = basename(filePath);

      ensureDir(state.fs[fs], dir);
      if (!(state.fs[fs][dir] || []).some((entry) => entry.name === fileName)) {
        state.fs[fs][dir].push({ type: 'file', name: fileName, size: `${content.length} B` });
      }
      state.files[fs][filePath] = content;

      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Saved');
      return;
    }

    if (url.pathname === '/rename' && req.method === 'POST') {
      const body = await readBody(req);
      const fields = parseMultipartFields(body);
      const fs = fields.fs || 'SD';
      const filePath = fields.filePath || '/';
      const fileName = fields.fileName || basename(filePath);

      const dir = parentPath(filePath);
      const newPath = dir === '/' ? `/${fileName}` : `${dir}/${fileName}`;
      const entries = state.fs[fs][dir] || [];
      const currentName = basename(filePath);
      const found = entries.find((entry) => entry.name === currentName);

      if (found) {
        found.name = fileName;
      }

      if (state.files[fs][filePath] != null) {
        state.files[fs][newPath] = state.files[fs][filePath];
        delete state.files[fs][filePath];
      }

      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Renamed');
      return;
    }

    if (url.pathname === '/upload' && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Upload complete');
      return;
    }

    if (url.pathname === '/cm' && req.method === 'POST') {
      const body = await readBody(req);
      const form = parseFormBody(body);
      const command = form.cmnd || '';
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(`Executed: ${command}`);
      return;
    }

    if (url.pathname === '/wifi') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Credentials updated');
      return;
    }

    if (url.pathname === '/reboot') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Rebooting');
      return;
    }

    if (url.pathname === '/getscreen') {
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
      res.end(Buffer.from([]));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  };

  return {
    get url() {
      return `http://127.0.0.1:${runningPort}`;
    },
    get emulatorUrl() {
      return `http://10.0.2.2:${runningPort}`;
    },
    start() {
      if (server && server.listening) {
        return Promise.resolve();
      }

      return new Promise((resolve, reject) => {
        server = http.createServer((req, res) => {
          Promise.resolve(handler(req, res)).catch((error) => {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(`Mock AP error: ${error.message}`);
          });
        });

        server.once('error', reject);
        server.listen(preferredPort, host, () => {
          const address = server.address();
          if (address && typeof address === 'object') {
            runningPort = address.port;
          }
          server.removeListener('error', reject);
          resolve();
        });
      });
    },
    stop() {
      if (!server || !server.listening) {
        return Promise.resolve();
      }
      return new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
  };
}

module.exports = {
  createMockAccessPointServer,
};

if (require.main === module) {
  const mockServer = createMockAccessPointServer({
    port: Number(process.env.MOCK_AP_PORT || 8088),
    host: process.env.MOCK_AP_HOST || '0.0.0.0',
  });

  mockServer
    .start()
    .then(() => {
      console.log(`Mock Bruce AP running at ${mockServer.url}`);
      console.log(`Use this URL in Android emulator login: ${mockServer.emulatorUrl}`);
      console.log(`Credentials: any non-empty username / any non-empty password`);
    })
    .catch((error) => {
      console.error(`Failed to start mock AP: ${error.message}`);
      process.exit(1);
    });
}

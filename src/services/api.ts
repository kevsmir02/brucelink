import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import CookieManager from '@react-native-cookies/cookies';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { FileEntry, FileSystem, SystemInfo } from '../types';
import { DEFAULT_BASE_URL, DEV_BYPASS_SESSION_TOKEN, STORAGE_KEYS } from '../utils/constants';
import { parseFileList } from '../utils/fileHelpers';
import {
    MOCK_SYSTEM_INFO,
    mockGetFileContent,
    mockListFiles,
    mockSendCommand,
} from './mockDevice';

// Navigation callback — set by AppNavigator after mount so the interceptor
// can redirect to Login on 401 without importing navigation directly.
let _navigateToLogin: (() => void) | null = null;

export function setNavigateToLogin(fn: () => void) {
  _navigateToLogin = fn;
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------
let _baseUrl = DEFAULT_BASE_URL;

export function getBaseUrl(): string {
  return _baseUrl;
}

export function setBaseUrl(url: string) {
  _baseUrl = url.replace(/\/$/, '');
  apiClient.defaults.baseURL = _baseUrl;
}

export async function getSessionToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.session);
}

async function inDevBypassMode(): Promise<boolean> {
  const t = await AsyncStorage.getItem(STORAGE_KEYS.session);
  return t === DEV_BYPASS_SESSION_TOKEN;
}

/**
 * __DEV__ only — enter app with local mocks (no device).
 */
export async function enableDevBypass(baseUrlInput?: string): Promise<void> {
  if (!__DEV__) {
    return;
  }
  const raw = baseUrlInput?.trim() || DEFAULT_BASE_URL;
  const url = raw.startsWith('http') ? raw.replace(/\/$/, '') : `http://${raw.replace(/\/$/, '')}`;
  setBaseUrl(url);
  await AsyncStorage.setItem(STORAGE_KEYS.session, DEV_BYPASS_SESSION_TOKEN);
  await AsyncStorage.setItem(STORAGE_KEYS.baseUrl, url);
}

export async function isDevBypassActive(): Promise<boolean> {
  return inDevBypassMode();
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: _baseUrl,
  timeout: 5000,
  withCredentials: false,
});

// ---------------------------------------------------------------------------
// Request interceptor — attach session cookie
// ---------------------------------------------------------------------------
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.session);
    if (token) {
      config.headers.set('Cookie', `BRUCESESSION=${token}`);
    }
    return config;
  },
  error => Promise.reject(error),
);

// ---------------------------------------------------------------------------
// Response interceptor — handle 401
// ---------------------------------------------------------------------------
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 && _navigateToLogin) {
      AsyncStorage.getItem(STORAGE_KEYS.session).then(token => {
        if (token !== DEV_BYPASS_SESSION_TOKEN) {
          _navigateToLogin?.();
        }
      });
    }
    return Promise.reject(error);
  },
);

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

/** AxiosHeaders vs plain object — RN/XHR may expose Set-Cookie oddly. */
function getResponseHeader(response: { headers: unknown }, name: string): string | string[] | undefined {
  const headers = response.headers as Record<string, unknown> & { get?: (n: string) => unknown };
  const lower = name.toLowerCase();
  if (typeof headers.get === 'function') {
    const v = headers.get(name) ?? headers.get(lower);
    if (v != null) {
      return v as string | string[];
    }
  }
  const direct = headers[lower] ?? headers[name];
  if (direct != null) {
    return direct as string | string[];
  }
  return undefined;
}

function extractBruceSessionToken(headers: unknown): string | null {
  const raw = getResponseHeader({ headers }, 'set-cookie');
  if (raw == null) {
    return null;
  }
  const lines = Array.isArray(raw) ? raw : [raw];
  for (const line of lines) {
    const m = String(line).match(/BRUCESESSION=([^;,\s]+)/);
    if (m) {
      return m[1];
    }
  }
  return null;
}

/**
 * React Native often strips Set-Cookie from axios `response.headers`, but the
 * underlying XHR may still list it in getAllResponseHeaders() (browser WebView does not).
 */
function extractBruceSessionFromXHR(request: unknown): string | null {
  if (request == null || typeof request !== 'object') {
    return null;
  }
  const xhr = request as {
    getResponseHeader?: (n: string) => string | null;
    getAllResponseHeaders?: () => string;
  };
  if (typeof xhr.getResponseHeader === 'function') {
    for (const name of ['Set-Cookie', 'set-cookie']) {
      const v = xhr.getResponseHeader(name);
      if (v) {
        const m = v.match(/BRUCESESSION=([^;,\s]+)/);
        if (m) {
          return m[1];
        }
      }
    }
  }
  if (typeof xhr.getAllResponseHeaders === 'function') {
    const block = xhr.getAllResponseHeaders();
    if (block) {
      for (const line of block.split(/[\r\n]+/)) {
        const m = line.match(/^set-cookie:\s*(.+)$/i);
        if (m) {
          const inner = m[1].match(/BRUCESESSION=([^;,\s]+)/);
          if (inner) {
            return inner[1];
          }
        }
      }
    }
  }
  return null;
}

function parseSessionFromSetCookieValue(value: string): string | null {
  const m = String(value).match(/BRUCESESSION=([^;,\s]+)/);
  return m ? m[1] : null;
}

/** RN fetch/Headers may expose Set-Cookie here (undocumented but works on some builds). */
function extractSessionFromFetchHeaders(res: Response): string | null {
  const h = res.headers as unknown as { getSetCookie?: () => string[] };
  if (typeof h.getSetCookie === 'function') {
    for (const line of h.getSetCookie()) {
      const t = parseSessionFromSetCookieValue(line);
      if (t) {
        return t;
      }
    }
  }
  let found: string | null = null;
  res.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie' && !found) {
      const t = parseSessionFromSetCookieValue(value);
      if (t) {
        found = t;
      }
    }
  });
  return found;
}

export async function login(
  baseUrl: string,
  username: string,
  password: string,
): Promise<boolean> {
  setBaseUrl(baseUrl);

  // Same as Bruce WebUI login.html: POST application/x-www-form-urlencoded (not multipart).
  const body = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  const origin = baseUrl.replace(/\/$/, '');
  const loginUrl = `${origin}/login`;

  try {
    let sessionToken: string | null = null;

    // 1) fetch + redirect:manual — RN often surfaces Set-Cookie here better than axios alone.
    const fetchRes = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      redirect: 'manual',
    } as Parameters<typeof fetch>[1]);

    const fetchLocation = fetchRes.headers.get('Location') ?? '';
    if (fetchLocation.includes('failed')) {
      return false;
    }

    sessionToken = extractSessionFromFetchHeaders(fetchRes);

    // 2) Android: OkHttp may store the cookie jar after fetch — read it back.
    if (!sessionToken && Platform.OS === 'android') {
      try {
        const jar = await CookieManager.get(origin);
        const c = jar?.BRUCESESSION;
        if (c && typeof c === 'object' && 'value' in c && typeof c.value === 'string') {
          sessionToken = c.value;
        }
      } catch {
        /* CookieManager optional if native module not linked */
      }
    }

    // 3) Axios + raw XHR header dump (some RN builds only expose Set-Cookie there).
    if (!sessionToken) {
      const response = await apiClient.post('/login', body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400,
      });

      const location = String(getResponseHeader(response, 'location') ?? '');
      if (location.includes('failed')) {
        return false;
      }

      sessionToken =
        extractBruceSessionToken(response.headers)
        ?? extractBruceSessionFromXHR((response as { request?: unknown }).request);

      if (!sessionToken) {
        const xBruce = getResponseHeader(response, 'x-bruce-session');
        if (xBruce != null) {
          sessionToken = Array.isArray(xBruce) ? xBruce[0] ?? null : String(xBruce);
        }
      }
    }

    if (sessionToken) {
      await AsyncStorage.setItem(STORAGE_KEYS.session, sessionToken);
      await AsyncStorage.setItem(STORAGE_KEYS.baseUrl, origin);
      return true;
    }

    return false;
  } catch (err: any) {
    // A network error means the device is unreachable
    if (err.code === 'ECONNABORTED' || err.message?.includes('Network Error')) {
      throw new Error('Device unreachable. Make sure you are connected to the Bruce WiFi AP.');
    }
    throw err;
  }
}

export async function logout(): Promise<void> {
  if (await inDevBypassMode()) {
    await AsyncStorage.removeItem(STORAGE_KEYS.session);
    return;
  }

  try {
    await apiClient.get('/logout', {
      maxRedirects: 0,
      validateStatus: (s) => s < 400,
    });
  } catch {
    // Ignore — we clear local state regardless
  }
  await AsyncStorage.removeItem(STORAGE_KEYS.session);
}

export async function restoreSession(): Promise<{ token: string | null; baseUrl: string | null }> {
  const token = await AsyncStorage.getItem(STORAGE_KEYS.session);
  const baseUrl = await AsyncStorage.getItem(STORAGE_KEYS.baseUrl);
  if (baseUrl) {
    setBaseUrl(baseUrl);
  }
  return { token, baseUrl };
}

// ---------------------------------------------------------------------------
// System info
// ---------------------------------------------------------------------------
export async function getSystemInfo(): Promise<SystemInfo> {
  if (await inDevBypassMode()) {
    return { ...MOCK_SYSTEM_INFO };
  }
  const { data } = await apiClient.get<SystemInfo>('/systeminfo');
  return data;
}

// ---------------------------------------------------------------------------
// File system
// ---------------------------------------------------------------------------
export async function listFiles(fs: FileSystem, folder: string): Promise<FileEntry[]> {
  if (await inDevBypassMode()) {
    return mockListFiles(fs, folder);
  }
  const { data } = await apiClient.get<string>('/listfiles', {
    params: { fs, folder },
    responseType: 'text',
  });
  return parseFileList(data as unknown as string, folder, fs);
}

export async function getFileContent(fs: FileSystem, filePath: string): Promise<string> {
  if (await inDevBypassMode()) {
    return mockGetFileContent(filePath);
  }
  const { data } = await apiClient.get<string>('/file', {
    params: { fs, name: filePath, action: 'edit' },
    responseType: 'text',
  });
  return data as unknown as string;
}

export async function saveFileContent(
  fs: FileSystem,
  filePath: string,
  content: string,
): Promise<string> {
  if (await inDevBypassMode()) {
    return `File edited: ${filePath} (dev preview — not persisted)`;
  }
  const form = new FormData();
  form.append('name', filePath);
  form.append('content', content);
  form.append('fs', fs);
  const { data } = await apiClient.post<string>('/edit', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data as unknown as string;
}

export async function downloadFile(fs: FileSystem, filePath: string): Promise<string> {
  if (await inDevBypassMode()) {
    const filename = (filePath.split('/').pop() ?? 'download').replace(/[^\w.-]/g, '_');
    const destPath = `${RNFS.DownloadDirectoryPath}/brucelink-dev-${filename}.txt`;
    await RNFS.writeFile(
      destPath,
      `BruceLink dev preview download\nPath: ${filePath}\nFS: ${fs}\n`,
      'utf8',
    );
    return destPath;
  }
  const token = await AsyncStorage.getItem(STORAGE_KEYS.session);
  const filename = filePath.split('/').pop() ?? 'download';
  const destPath = `${RNFS.DownloadDirectoryPath}/${filename}`;
  const url = `${_baseUrl}/file?fs=${fs}&name=${encodeURIComponent(filePath)}&action=download`;

  const result = await RNFS.downloadFile({
    fromUrl: url,
    toFile: destPath,
    headers: token ? { Cookie: `BRUCESESSION=${token}` } : {},
    background: false,
  }).promise;

  if (result.statusCode !== 200) {
    throw new Error(`Download failed with status ${result.statusCode}`);
  }
  return destPath;
}

export async function uploadFile(
  fs: FileSystem,
  folder: string,
  fileUri: string,
  fileName: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  if (await inDevBypassMode()) {
    onProgress?.(100);
    return;
  }
  const form = new FormData();
  form.append('file', {
    uri: fileUri,
    name: fileName,
    type: 'application/octet-stream',
  } as any);
  form.append('folder', folder);
  form.append('fs', fs);

  await apiClient.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (ev) => {
      if (onProgress && ev.total) {
        onProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    },
  });
}

export async function deleteFile(fs: FileSystem, filePath: string): Promise<string> {
  if (await inDevBypassMode()) {
    return `Deleted : ${filePath} (dev preview)`;
  }
  const { data } = await apiClient.get<string>('/file', {
    params: { fs, name: filePath, action: 'delete' },
    responseType: 'text',
  });
  return data as unknown as string;
}

export async function createFolder(fs: FileSystem, path: string): Promise<string> {
  if (await inDevBypassMode()) {
    return `Created new folder: ${path} (dev preview)`;
  }
  const { data } = await apiClient.get<string>('/file', {
    params: { fs, name: path, action: 'create' },
    responseType: 'text',
  });
  return data as unknown as string;
}

export async function createFile(fs: FileSystem, path: string): Promise<string> {
  if (await inDevBypassMode()) {
    return `Created new file: ${path} (dev preview)`;
  }
  const { data } = await apiClient.get<string>('/file', {
    params: { fs, name: path, action: 'createfile' },
    responseType: 'text',
  });
  return data as unknown as string;
}

export async function renameFile(
  fs: FileSystem,
  filePath: string,
  newName: string,
): Promise<string> {
  if (await inDevBypassMode()) {
    return `${filePath} → ${newName} (dev preview)`;
  }
  const form = new FormData();
  form.append('fs', fs);
  form.append('filePath', filePath);
  form.append('fileName', newName);
  const { data } = await apiClient.post<string>('/rename', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'text',
  });
  return data as unknown as string;
}

// ---------------------------------------------------------------------------
// Command interface
// ---------------------------------------------------------------------------
export async function sendCommand(command: string): Promise<string> {
  if (await inDevBypassMode()) {
    return mockSendCommand(command);
  }
  const form = new FormData();
  form.append('cmnd', command);
  const { data } = await apiClient.post<string>('/cm', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'text',
    validateStatus: (s) => s < 500,
  });
  return data as unknown as string;
}

// ---------------------------------------------------------------------------
// Device management
// ---------------------------------------------------------------------------
export async function rebootDevice(): Promise<void> {
  if (await inDevBypassMode()) {
    return;
  }
  await apiClient.get('/reboot', {
    validateStatus: (s) => s < 500,
  });
}

/**
 * Fetches the TFT screen binary log from the device and returns it as a
 * base64 string so it can be passed directly to the WebView via postMessage.
 * In dev bypass, returns null (no device screen to mirror).
 * Returns null on network failure when a real session is active.
 */
export async function getScreen(): Promise<string | null> {
  if (await inDevBypassMode()) {
    return null;
  }
  const token = await AsyncStorage.getItem(STORAGE_KEYS.session);
  const tempPath = `${RNFS.CachesDirectoryPath}/bruce_screen.bin`;
  try {
    const result = await RNFS.downloadFile({
      fromUrl: `${_baseUrl}/getscreen`,
      toFile: tempPath,
      headers: token ? { Cookie: `BRUCESESSION=${token}` } : {},
      background: false,
      cacheable: false,
    }).promise;
    if (result.statusCode !== 200) { return null; }
    return await RNFS.readFile(tempPath, 'base64');
  } catch {
    return null;
  }
}

export async function updateCredentials(username: string, password: string): Promise<string> {
  if (await inDevBypassMode()) {
    return `User: ${username} (dev preview — not applied)`;
  }
  const { data } = await apiClient.get<string>('/wifi', {
    params: { usr: username, pwd: password },
    responseType: 'text',
  });
  return data as unknown as string;
}

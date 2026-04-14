import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import CookieManager from '@react-native-cookies/cookies';
import RNFS from 'react-native-fs';
import { FileEntry, FileSystem, SystemInfo } from '../types';
import { DEFAULT_BASE_URL, STORAGE_KEYS } from '../utils/constants';
import { parseFileList } from '../utils/fileHelpers';
import { sanitizeCommand } from '../utils/sanitize';
import { commandQueue } from './commandQueue';
import { secureStorage } from './secureStorage';

// Unauthorized handler — registered by AuthProvider so the Axios 401
// interceptor can clear auth state without a global navigation ref.
let _onUnauthorized: (() => void) | null = null;
let _notifyingUnauthorized = false;

export function registerUnauthorizedHandler(fn: () => void) {
  _onUnauthorized = fn;
}

function notifyUnauthorized() {
  if (_notifyingUnauthorized) {
    return;
  }
  _notifyingUnauthorized = true;
  _onUnauthorized?.();
  setTimeout(() => {
    _notifyingUnauthorized = false;
  }, 0);
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
  return secureStorage.getToken();
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
    const token = await secureStorage.getToken();
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
    if (error.response?.status === 401) {
      notifyUnauthorized();
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

export async function login(
  baseUrl: string,
  username: string,
  password: string,
): Promise<boolean> {
  setBaseUrl(baseUrl);

  const body = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  const origin = baseUrl.replace(/\/$/, '');

  try {
    // Step 1: Axios POST — firmware returns 302 with Set-Cookie header.
    const response = await apiClient.post('/login', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const location = String(getResponseHeader(response, 'location') ?? '');
    const responseUrl = String(response.request?.responseURL || '');
    
    // Android OkHttp automatically follows 302 redirects. If it failed, it lands on /?failed.
    if (location.includes('failed') || responseUrl.includes('failed')) {
      return false;
    }

    let sessionToken = extractBruceSessionToken(response.headers);

    // Step 2 (fallback): OkHttp cookie jar — Android intercepts Set-Cookie on redirects.
    // Use a polling loop because WebKit CookieManager synchronizes with OkHttp asynchronously.
    if (!sessionToken) {
      for (let i = 0; i < 4; i++) {
        try {
          const jar = await CookieManager.get(origin);
          const c = jar?.BRUCESESSION as any;
          if (c) {
            sessionToken = typeof c === 'object' && 'value' in c ? String(c.value) : String(c);
            if (sessionToken) break;
          }
        } catch {
          /* CookieManager optional */
        }
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    }

    if (sessionToken) {
      await secureStorage.setToken(sessionToken);
      await AsyncStorage.setItem(STORAGE_KEYS.baseUrl, origin);
      return true;
    }

    return false;
  } catch (err: any) {
    if (err.code === 'ECONNABORTED' || err.message?.includes('Network Error')) {
      throw new Error('Device unreachable. Make sure you are connected to the Bruce WiFi AP.');
    }
    throw err;
  }
}

export async function logout(): Promise<void> {
  try {
    await apiClient.get('/logout', {
      maxRedirects: 0,
      validateStatus: (s) => s < 400,
    });
  } catch {
    // Ignore — we clear local state regardless
  }
  await secureStorage.clearToken();
}

export async function restoreSession(): Promise<{ token: string | null; baseUrl: string | null }> {
  const token = await secureStorage.getToken();
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
  const { data } = await apiClient.get<SystemInfo>('/systeminfo');
  return data;
}

// ---------------------------------------------------------------------------
// File system
// ---------------------------------------------------------------------------
export async function listFiles(fs: FileSystem, folder: string): Promise<FileEntry[]> {
  const { data } = await apiClient.get<string>('/listfiles', {
    params: { fs, folder },
    responseType: 'text',
  });
  return parseFileList(data as unknown as string, folder, fs);
}

export async function getFileContent(fs: FileSystem, filePath: string): Promise<string> {
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
  const token = await secureStorage.getToken();
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
  const { data } = await apiClient.get<string>('/file', {
    params: { fs, name: filePath, action: 'delete' },
    responseType: 'text',
  });
  return data as unknown as string;
}

export async function createFolder(fs: FileSystem, path: string): Promise<string> {
  const { data } = await apiClient.get<string>('/file', {
    params: { fs, name: path, action: 'create' },
    responseType: 'text',
  });
  return data as unknown as string;
}

export async function createFile(fs: FileSystem, path: string): Promise<string> {
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
  // Sanitize at the system boundary before queueing
  const sanitized = sanitizeCommand(command);
  return commandQueue.enqueue(async () => {
    const trimmed = sanitized.trim();
    const body = `cmnd=${encodeURIComponent(trimmed)}`;

    try {
      // Send as x-www-form-urlencoded via our configured apiClient.
      // ESPAsyncWebServer accepts this perfectly in hasArg()
      const { data } = await apiClient.post<string>('/cm', body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        responseType: 'text',
        timeout: 15000,
      });
      return data as unknown as string;
    } catch (err: any) {
      if (err.response) {
        if (err.response.status === 401) {
          notifyUnauthorized();
          const unauthorizedError = new Error('Unauthorized access (401)') as Error & { status?: number };
          unauthorizedError.status = 401;
          throw unauthorizedError;
        }
        const responseError = new Error(
          err.response.data || `Request failed with status ${err.response.status}`
        ) as Error & { status?: number };
        responseError.status = err.response.status;
        throw responseError;
      }
      throw new Error(err.message ?? 'Network error');
    }
  });
}

// ---------------------------------------------------------------------------
// Device management
// ---------------------------------------------------------------------------
export async function rebootDevice(): Promise<void> {
  await apiClient.get('/reboot', {
    validateStatus: (s) => s < 500,
  });
}

/**
 * Fetches the TFT screen binary log from the device and returns it as a
 * base64 string so it can be passed directly to the WebView via postMessage.
 * Returns null on network failure.
 */
export async function getScreen(): Promise<string | null> {
  const token = await secureStorage.getToken();
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

export async function updateWebUICreds(username: string, password: string): Promise<string> {
  const { data } = await apiClient.get<string>('/wifi', {
    params: { usr: username, pwd: password },
    responseType: 'text',
  });
  return data as unknown as string;
}

// ---------------------------------------------------------------------------
// URL helpers (encapsulate endpoint shape — screens must not build URLs)
// ---------------------------------------------------------------------------

/**
 * Builds the authenticated URL for previewing an image file from device storage.
 * Keeps endpoint shape out of screen components.
 */
export function getImagePreviewUrl(fs: FileSystem, filePath: string): string {
  return `${_baseUrl}/file?fs=${fs}&name=${encodeURIComponent(filePath)}&action=image`;
}

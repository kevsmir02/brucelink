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



export async function login(
  baseUrl: string,
  username: string,
  password: string,
): Promise<boolean> {
  setBaseUrl(baseUrl);

  const body = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  const origin = baseUrl.replace(/\/$/, '');

  try {
    // Use fetch() with credentials:'include' instead of axios.
    // This tells Android OkHttp to process Set-Cookie headers during
    // the 302 redirect, storing the BRUCESESSION cookie in the system
    // cookie jar — exactly like a browser does.
    // (axios with withCredentials:false prevents cookie storage entirely)
    const response = await fetch(`${origin}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      credentials: 'include',
      redirect: 'follow',
    });

    // After OkHttp follows the 302, the final URL tells us the outcome:
    // - Success: firmware redirects to "/" — OkHttp lands on "/" (200)
    // - Failure: firmware redirects to "/?failed" — OkHttp lands on "/?failed" (200)
    const finalUrl = response.url || '';
    if (finalUrl.includes('failed')) {
      return false;
    }

    // Extract BRUCESESSION from the Set-Cookie header (may be visible on
    // the final response in some RN versions).
    let sessionToken: string | null = null;
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const m = setCookie.match(/BRUCESESSION=([^;,\s]+)/);
      if (m) {
        sessionToken = m[1];
      }
    }

    // Fallback: Poll CookieManager — OkHttp stores the Set-Cookie from
    // the 302 in Android's system cookie jar. CookieManager reads from
    // that jar, but synchronization can be asynchronous.
    if (!sessionToken) {
      for (let i = 0; i < 5; i++) {
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
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    if (sessionToken) {
      await secureStorage.setToken(sessionToken);
      await AsyncStorage.setItem(STORAGE_KEYS.baseUrl, origin);
      return true;
    }

    return false;
  } catch (err: any) {
    if (err.message?.includes('Network request failed') || err.message?.includes('Network Error')) {
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
    
    // ESPAsyncWebServer has crashing issues with React Native Axios POST payloads.
    // WebUI uses FormData() so we exactly mimic that here via native fetch().
    const form = new FormData();
    form.append('cmnd', trimmed);

    try {
      const token = await secureStorage.getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Cookie'] = `BRUCESESSION=${token}`;
      }

      const origin = _baseUrl.replace(/\/$/, '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${origin}/cm`, {
        method: 'POST',
        headers,
        body: form,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          notifyUnauthorized();
          const unauthorizedError = new Error('Unauthorized access (401)') as Error & { status?: number };
          unauthorizedError.status = 401;
          throw unauthorizedError;
        }
        const errText = await response.text().catch(() => '');
        const responseError = new Error(
          errText || `Request failed with status ${response.status}`
        ) as Error & { status?: number };
        responseError.status = response.status;
        throw responseError;
      }

      return await response.text();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      if (err.status) {
        throw err;
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

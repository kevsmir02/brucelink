import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { FileEntry, FileSystem, SystemInfo } from '../types';
import { parseFileList } from '../utils/fileHelpers';
import { DEFAULT_BASE_URL, DEV_BYPASS_SESSION_TOKEN, STORAGE_KEYS } from '../utils/constants';
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
export async function login(
  baseUrl: string,
  username: string,
  password: string,
): Promise<boolean> {
  setBaseUrl(baseUrl);

  const form = new FormData();
  form.append('username', username);
  form.append('password', password);

  try {
    const response = await apiClient.post('/login', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    // Success: 302 to "/" — extract Set-Cookie header
    const setCookieHeader = response.headers['set-cookie'];
    let sessionToken: string | null = null;

    if (setCookieHeader) {
      const cookies = Array.isArray(setCookieHeader)
        ? setCookieHeader
        : [setCookieHeader];
      for (const cookie of cookies) {
        const match = cookie.match(/BRUCESESSION=([a-zA-Z0-9]+)/);
        if (match) {
          sessionToken = match[1];
          break;
        }
      }
    }

    // Also check Location header — failed login redirects to /?failed
    const location = response.headers.location ?? '';
    if (location.includes('failed')) {
      return false;
    }

    if (sessionToken) {
      await AsyncStorage.setItem(STORAGE_KEYS.session, sessionToken);
      await AsyncStorage.setItem(STORAGE_KEYS.baseUrl, baseUrl);
      return true;
    }

    // Server redirected to success path but sent no Set-Cookie header.
    // Without a token every subsequent request will 401, so treat as failure.
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

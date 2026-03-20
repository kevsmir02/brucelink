import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { FileEntry, FileSystem, SystemInfo } from '../types';
import { parseFileList } from '../utils/fileHelpers';
import { DEFAULT_BASE_URL, STORAGE_KEYS } from '../utils/constants';

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

export const apiClient: AxiosInstance = axios.create({
  baseURL: _baseUrl,
  timeout: 8000,
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
      _navigateToLogin();
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

    // If we got a 200/302 without a failed location, treat as success
    // (older firmware may not include Set-Cookie on every auth flow)
    return response.status >= 200 && response.status < 400;
  } catch (err: any) {
    // A network error means the device is unreachable
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
  await apiClient.get('/reboot', {
    validateStatus: (s) => s < 500,
  });
}

export async function updateCredentials(username: string, password: string): Promise<string> {
  const { data } = await apiClient.get<string>('/wifi', {
    params: { usr: username, pwd: password },
    responseType: 'text',
  });
  return data as unknown as string;
}

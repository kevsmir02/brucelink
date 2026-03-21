export interface SystemInfo {
  BRUCE_VERSION: string;
  SD: StorageInfo;
  LittleFS: StorageInfo;
}

export interface StorageInfo {
  free: string;
  used: string;
  total: string;
}

export interface FileEntry {
  type: 'parent' | 'folder' | 'file';
  name: string;
  size: string;
  path: string;
}

export type FileSystem = 'SD' | 'LittleFS';

export interface CommandHistoryItem {
  command: string;
  response: string;
  timestamp: number;
  success: boolean;
}

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  FileExplorer: { fs?: FileSystem; folder?: string };
  FileEditor: { fs: FileSystem; filePath: string };
  Terminal: undefined;
  Settings: undefined;
  Navigator: undefined;
};

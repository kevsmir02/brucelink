/**
 * Used only when __DEV__ "Skip login" is active — keeps UI usable without hardware.
 */
import { FileEntry, FileSystem, SystemInfo } from '../types';
import { parseFileList } from '../utils/fileHelpers';

export const MOCK_SYSTEM_INFO: SystemInfo = {
  BRUCE_VERSION: '1.5.0-dev',
  SD: { free: '14.2 GB', used: '1.8 GB', total: '16.0 GB' },
  LittleFS: { free: '1.2 MB', used: '0.3 MB', total: '1.5 MB' },
};

function listRawForPath(folder: string, fs: FileSystem): string {
  if (folder === '/' || folder === '') {
    return [
      `pa:/:0`,
      `Fo:payloads:0`,
      `Fo:captures:0`,
      `Fi:NOTES_${fs}.txt:88 B`,
      `Fi:hello.js:156 B`,
    ].join('\n');
  }
  if (folder === '/payloads' || folder === '/payloads/') {
    return [`pa:/payloads:0`, `Fi:demo.ir:512 B`, `Fi:badusb_demo.txt:2.1 kB`].join('\n');
  }
  if (folder === '/captures' || folder === '/captures/') {
    return [`pa:/captures:0`, `Fi:scan_001.pcap:128 kB`].join('\n');
  }
  return `pa:${folder}:0\nFi:orphan.log:0 B`;
}

export function mockListFiles(fs: FileSystem, folder: string): FileEntry[] {
  return parseFileList(listRawForPath(folder, fs), folder === '' ? '/' : folder, fs);
}

export function mockGetFileContent(filePath: string): string {
  if (filePath.endsWith('.js') || filePath.endsWith('.bjs')) {
    return '// Dev preview — no device\nconsole.log("BruceLink");\n';
  }
  return (
    `Dev preview file\n` +
    `Path: ${filePath}\n\n` +
    `Connect to a real Bruce device and use Connect on the login screen for a live API.\n`
  );
}

export function mockSendCommand(command: string): string {
  const trimmed = command.trim();
  return `command "${trimmed}" queued (dev preview)`;
}

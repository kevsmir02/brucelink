import { FileEntry, FileSystem } from '../types';
import { EXECUTABLE_EXTENSIONS, TEXT_EXTENSIONS } from './constants';

/**
 * Parses the custom text format returned by GET /listfiles.
 *
 * Format:
 *   pa:/current/path:0
 *   Fo:subfolder_name:0
 *   Fi:somefile.txt:1.23 kB
 */
export function parseFileList(raw: string, currentFolder: string, _fs: FileSystem): FileEntry[] {
  const lines = raw.split('\n').filter(l => l.trim().length > 0);
  const entries: FileEntry[] = [];

  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const type = line.substring(0, colonIdx);
    const rest = line.substring(colonIdx + 1);

    if (type === 'pa') {
      // parent path line — skip, we track this externally
      continue;
    } else if (type === 'Fo') {
      const lastColon = rest.lastIndexOf(':');
      const name = lastColon >= 0 ? rest.substring(0, lastColon) : rest;
      entries.push({
        type: 'folder',
        name,
        size: '',
        path: joinPath(currentFolder, name),
      });
    } else if (type === 'Fi') {
      const lastColon = rest.lastIndexOf(':');
      const name = lastColon >= 0 ? rest.substring(0, lastColon) : rest;
      const size = lastColon >= 0 ? rest.substring(lastColon + 1).trim() : '';
      entries.push({
        type: 'file',
        name,
        size,
        path: joinPath(currentFolder, name),
      });
    }
  }

  // Sort: folders first, then files, both alphabetically
  entries.sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === 'folder' ? -1 : 1;
  });

  return entries;
}

export function joinPath(folder: string, name: string): string {
  const base = folder.endsWith('/') ? folder : `${folder}/`;
  return `${base}${name}`;
}

export function parentPath(path: string): string {
  if (path === '/') return '/';
  const parts = path.replace(/\/$/, '').split('/');
  parts.pop();
  return parts.join('/') || '/';
}

export function getFileExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  if (idx === -1) return '';
  return filename.substring(idx).toLowerCase();
}

export function isExecutable(filename: string): boolean {
  return getFileExtension(filename) in EXECUTABLE_EXTENSIONS;
}

export function getExecuteCommand(filePath: string): string | null {
  const ext = getFileExtension(filePath);
  const cmdBuilder = EXECUTABLE_EXTENSIONS[ext];
  return cmdBuilder ? cmdBuilder(filePath) : null;
}

export function isTextFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return TEXT_EXTENSIONS.includes(ext);
}

export function formatBreadcrumbs(path: string): Array<{ label: string; path: string }> {
  const parts = path.replace(/^\//, '').split('/').filter(Boolean);
  const crumbs = [{ label: '/', path: '/' }];
  let current = '';
  for (const part of parts) {
    current = `${current}/${part}`;
    crumbs.push({ label: part, path: current });
  }
  return crumbs;
}

export function getFileIcon(entry: FileEntry): string {
  if (entry.type === 'folder') return 'folder';
  const ext = getFileExtension(entry.name);
  switch (ext) {
    case '.ir': return 'remote';
    case '.sub': return 'radio-tower';
    case '.js': case '.bjs': return 'language-javascript';
    case '.txt': return 'keyboard';
    case '.mp3': case '.wav': return 'music';
    case '.json': return 'code-json';
    case '.md': return 'language-markdown';
    case '.pcap': return 'ethernet';
    case '.bin': return 'chip';
    case '.png': case '.jpg': case '.jpeg': return 'image';
    default: return 'file-outline';
  }
}

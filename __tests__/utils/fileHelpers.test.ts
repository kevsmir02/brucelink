import {
  parseFileList,
  parentPath,
  joinPath,
  isExecutable,
  getExecuteCommand,
  formatBreadcrumbs,
} from '../../src/utils/fileHelpers';

describe('fileHelpers', () => {
  it('parses firmware pa:/Fo:/Fi: list format and sorts folders first', () => {
    const raw = [
      'pa:/scripts:0',
      'Fi:zeta.txt:1.0 kB',
      'Fo:bravo:0',
      'Fi:alpha.ir:2.0 KB',
      'Fo:alpha:0',
    ].join('\n');

    const entries = parseFileList(raw, '/scripts', 'SD');
    expect(entries.map(entry => `${entry.type}:${entry.name}`)).toEqual([
      'folder:alpha',
      'folder:bravo',
      'file:alpha.ir',
      'file:zeta.txt',
    ]);
    expect(entries[0].path).toBe('/scripts/alpha');
  });

  it('builds and resolves paths correctly', () => {
    expect(joinPath('/root', 'file.txt')).toBe('/root/file.txt');
    expect(joinPath('/', 'file.txt')).toBe('/file.txt');
    expect(parentPath('/foo/bar/')).toBe('/foo');
    expect(parentPath('/foo')).toBe('/');
    expect(parentPath('/')).toBe('/');
  });

  it('detects executable files and produces the expected command', () => {
    expect(isExecutable('payload.txt')).toBe(true);
    expect(isExecutable('photo.png')).toBe(false);
    expect(getExecuteCommand('/scripts/payload.txt')).toBe(
      'badusb run_from_file "/scripts/payload.txt"',
    );
    expect(getExecuteCommand('/assets/photo.png')).toBeNull();
  });

  it('formats breadcrumb paths', () => {
    expect(formatBreadcrumbs('/foo/bar')).toEqual([
      { label: '/', path: '/' },
      { label: 'foo', path: '/foo' },
      { label: 'bar', path: '/foo/bar' },
    ]);
  });
});

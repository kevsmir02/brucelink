/**
 * FileExplorerScreen source contract:
 * - Uses useTheme() not mutable COLORS
 * - Keeps core functionality (FlatList, breadcrumbs, FAB, action sheet)
 */

import * as fs from 'fs';
import * as path from 'path';

const SOURCE_PATH = path.resolve(__dirname, '../../src/screens/FileExplorerScreen.tsx');
const source = fs.readFileSync(SOURCE_PATH, 'utf8');

describe('FileExplorerScreen source contract', () => {
  it('imports useTheme from ThemeContext', () => {
    expect(source).toContain('useTheme');
  });

  it('does NOT import mutable COLORS from constants', () => {
    expect(source).not.toMatch(/import\s*{[^}]*COLORS[^}]*}\s*from\s*['"]\.\.\/utils\/constants/);
  });

  it('uses makeStyles factory pattern', () => {
    expect(source).toMatch(/makeStyles/);
  });

  it('renders FlatList for file entries', () => {
    expect(source).toContain('FlatList');
  });

  it('renders ExplorerFab', () => {
    expect(source).toContain('ExplorerFab');
  });

  it('has empty state component', () => {
    expect(source).toContain('ListEmptyComponent');
  });
});

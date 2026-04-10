/**
 * TerminalScreen source contract:
 * - Uses useTheme() not mutable COLORS
 * - Keeps command history, quick chips, destructive guard
 */

import * as fs from 'fs';
import * as path from 'path';

const SOURCE_PATH = path.resolve(__dirname, '../../src/screens/TerminalScreen.tsx');
const source = fs.readFileSync(SOURCE_PATH, 'utf8');

describe('TerminalScreen source contract', () => {
  it('imports useTheme from ThemeContext', () => {
    expect(source).toContain('useTheme');
  });

  it('does NOT import mutable COLORS from constants', () => {
    expect(source).not.toMatch(/import\s*{[^}]*COLORS[^}]*}\s*from\s*['"]\.\.\/utils\/constants/);
  });

  it('uses makeStyles factory pattern', () => {
    expect(source).toMatch(/makeStyles/);
  });

  it('has destructive command guard', () => {
    expect(source).toContain('isDestructiveCommand');
  });

  it('renders quick command chips', () => {
    expect(source).toContain('CommandChip');
  });

  it('has command history display', () => {
    expect(source).toMatch(/history\.map/);
  });
});

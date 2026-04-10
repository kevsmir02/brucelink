/**
 * BleScreen source contract:
 * - Uses useTheme() not mutable COLORS
 * - Uses command builders from services/commands
 * - Has scan, spam, Bad BLE sections
 */

import * as fs from 'fs';
import * as path from 'path';

const SOURCE_PATH = path.resolve(__dirname, '../../src/screens/BleScreen.tsx');
const source = fs.readFileSync(SOURCE_PATH, 'utf8');

describe('BleScreen source contract', () => {
  it('imports useTheme from ThemeContext', () => {
    expect(source).toContain('useTheme');
  });

  it('does NOT import mutable COLORS from constants', () => {
    expect(source).not.toMatch(/import\s*{[^}]*COLORS[^}]*}\s*from\s*['"]\.\.\/utils\/constants/);
  });

  it('uses makeStyles factory pattern', () => {
    expect(source).toMatch(/makeStyles/);
  });

  it('imports loader commands from services/commands', () => {
    expect(source).toMatch(/import\s*{[^}]*loader[^}]*}\s*from\s*['"]\.\.\/services\/commands/);
  });

  it('has BLE scan section', () => {
    expect(source).toMatch(/scan|Scan/i);
  });

  it('has BLE spam section', () => {
    expect(source).toMatch(/spam|Spam/i);
  });

  it('has Bad BLE section', () => {
    expect(source).toMatch(/Bad.*BLE|badble|ducky/i);
  });
});

/**
 * SubGhzScreen source contract:
 * - Uses useTheme() not mutable COLORS
 * - Uses command builders from services/commands
 * - Has capture, transmit, scan, and file player sections
 * - Has frequency presets
 */

import * as fs from 'fs';
import * as path from 'path';

const SOURCE_PATH = path.resolve(__dirname, '../../src/screens/SubGhzScreen.tsx');
const source = fs.readFileSync(SOURCE_PATH, 'utf8');

describe('SubGhzScreen source contract', () => {
  it('imports useTheme from ThemeContext', () => {
    expect(source).toContain('useTheme');
  });

  it('does NOT import mutable COLORS from constants', () => {
    expect(source).not.toMatch(/import\s*{[^}]*COLORS[^}]*}\s*from\s*['"]\.\.\/utils\/constants/);
  });

  it('uses makeStyles factory pattern', () => {
    expect(source).toMatch(/makeStyles/);
  });

  it('imports rf commands from services/commands', () => {
    expect(source).toMatch(/import\s*{[^}]*rf[^}]*}\s*from\s*['"]\.\.\/services\/commands/);
  });

  it('has capture section (rf rx)', () => {
    expect(source).toMatch(/rf\.rx|capture|Capture/i);
  });

  it('has transmit section', () => {
    expect(source).toMatch(/rf\.tx|transmit|Transmit/i);
  });

  it('has frequency presets', () => {
    expect(source).toMatch(/433|315|868|915/);
  });

  it('has file player section', () => {
    expect(source).toMatch(/txFromFile|file.*player|File.*Player/i);
  });
});

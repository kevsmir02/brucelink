/**
 * InfraredScreen source contract:
 * - Uses useTheme() not mutable COLORS
 * - Uses command builders from services/commands
 * - Has capture, transmit, file player sections
 * - Has protocol picker
 */

import * as fs from 'fs';
import * as path from 'path';

const SOURCE_PATH = path.resolve(__dirname, '../../src/screens/InfraredScreen.tsx');
const source = fs.readFileSync(SOURCE_PATH, 'utf8');

describe('InfraredScreen source contract', () => {
  it('imports useTheme from ThemeContext', () => {
    expect(source).toContain('useTheme');
  });

  it('does NOT import mutable COLORS from constants', () => {
    expect(source).not.toMatch(/import\s*{[^}]*COLORS[^}]*}\s*from\s*['"]\.\.\/utils\/constants/);
  });

  it('uses makeStyles factory pattern', () => {
    expect(source).toMatch(/makeStyles/);
  });

  it('imports ir commands from services/commands', () => {
    expect(source).toMatch(/import\s*{[^}]*ir[^}]*}\s*from\s*['"]\.\.\/services\/commands/);
  });

  it('has capture section (ir rx)', () => {
    expect(source).toMatch(/ir\.rx|capture|Capture/i);
  });

  it('has protocol picker', () => {
    expect(source).toMatch(/NEC|SIRC|RC5|Samsung/i);
  });

  it('has file player section', () => {
    expect(source).toMatch(/txFromFile|file.*player|File.*Player/i);
  });
});

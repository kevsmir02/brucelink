/**
 * GpsScreen source contract:
 * - Uses useTheme() not mutable COLORS
 * - Uses command builders from services/commands
 * - Has tracking, wardriving sections
 * - Has GPS status display
 */

import * as fs from 'fs';
import * as path from 'path';

const SOURCE_PATH = path.resolve(__dirname, '../../src/screens/GpsScreen.tsx');
const source = fs.readFileSync(SOURCE_PATH, 'utf8');

describe('GpsScreen source contract', () => {
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

  it('has tracking section', () => {
    expect(source).toMatch(/track|Track|latitude|longitude/i);
  });

  it('has wardriving section', () => {
    expect(source).toMatch(/wardri|Wardri/i);
  });

  it('has GPS status display', () => {
    expect(source).toMatch(/fix|satellite|GPS.*status/i);
  });
});

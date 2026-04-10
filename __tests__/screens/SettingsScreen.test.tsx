/**
 * SettingsScreen source contract:
 * - Uses useTheme() not mutable COLORS
 * - Has credential update, reboot, theme selector, logout, about
 */

import * as fs from 'fs';
import * as path from 'path';

const SOURCE_PATH = path.resolve(__dirname, '../../src/screens/SettingsScreen.tsx');
const source = fs.readFileSync(SOURCE_PATH, 'utf8');

describe('SettingsScreen source contract', () => {
  it('imports useTheme from ThemeContext', () => {
    expect(source).toContain('useTheme');
  });

  it('does NOT import mutable COLORS from constants', () => {
    expect(source).not.toMatch(/import\s*{[^}]*COLORS[^}]*}\s*from\s*['"]\.\.\/utils\/constants/);
  });

  it('uses makeStyles factory pattern', () => {
    expect(source).toMatch(/makeStyles/);
  });

  it('has credential update section', () => {
    expect(source).toContain('WEB UI CREDENTIALS');
  });

  it('has theme selector', () => {
    expect(source).toContain('ThemeModeSelector');
  });

  it('has about section with app version', () => {
    expect(source).toContain('APP_VERSION');
  });
});

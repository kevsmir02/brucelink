/**
 * WifiAttackScreen source contract:
 * - Uses useTheme() not mutable COLORS
 * - Uses command builders from services/commands
 * - Has recon, attack, wardriving sections
 * - Has legal disclaimer
 */

import * as fs from 'fs';
import * as path from 'path';

const SOURCE_PATH = path.resolve(__dirname, '../../src/screens/WifiAttackScreen.tsx');
const source = fs.readFileSync(SOURCE_PATH, 'utf8');

describe('WifiAttackScreen source contract', () => {
  it('imports useTheme from ThemeContext', () => {
    expect(source).toContain('useTheme');
  });

  it('does NOT import mutable COLORS from constants', () => {
    expect(source).not.toMatch(/import\s*{[^}]*COLORS[^}]*}\s*from\s*['"]\.\.\/utils\/constants/);
  });

  it('uses makeStyles factory pattern', () => {
    expect(source).toMatch(/makeStyles/);
  });

  it('imports wifi and loader commands from services/commands', () => {
    expect(source).toMatch(/import\s*{[^}]*wifi[^}]*}\s*from\s*['"]\.\.\/services\/commands/);
  });

  it('has reconnaissance section', () => {
    expect(source).toMatch(/recon|Recon|arp|sniffer/i);
  });

  it('has attack section', () => {
    expect(source).toMatch(/deauth|beacon|evil.*portal|karma/i);
  });

  it('has legal disclaimer', () => {
    expect(source).toMatch(/legal|disclaimer|authorized|permission/i);
  });
});

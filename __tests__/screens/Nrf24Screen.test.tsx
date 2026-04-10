/**
 * Nrf24Screen source contract:
 * - Uses useTheme() not mutable COLORS
 * - Uses command builders from services/commands
 * - Has spectrum, jammer, Mousejack sections
 * - Has SPI conflict warning
 */

import * as fs from 'fs';
import * as path from 'path';

const SOURCE_PATH = path.resolve(__dirname, '../../src/screens/Nrf24Screen.tsx');
const source = fs.readFileSync(SOURCE_PATH, 'utf8');

describe('Nrf24Screen source contract', () => {
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

  it('has spectrum analysis section', () => {
    expect(source).toMatch(/spectrum|Spectrum/i);
  });

  it('has jammer section', () => {
    expect(source).toMatch(/jammer|Jammer/i);
  });

  it('has Mousejack section', () => {
    expect(source).toMatch(/Mousejack|mousejack/i);
  });

  it('has SPI conflict warning', () => {
    expect(source).toMatch(/SPI|share.*spi|CC1101/i);
  });
});

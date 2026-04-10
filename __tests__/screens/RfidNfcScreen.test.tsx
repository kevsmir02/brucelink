/**
 * RfidNfcScreen source contract:
 * - Uses useTheme() not mutable COLORS
 * - Uses command builders from services/commands
 * - Has read, clone, NDEF sections
 */

import * as fs from 'fs';
import * as path from 'path';

const SOURCE_PATH = path.resolve(__dirname, '../../src/screens/RfidNfcScreen.tsx');
const source = fs.readFileSync(SOURCE_PATH, 'utf8');

describe('RfidNfcScreen source contract', () => {
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

  it('has read tag section', () => {
    expect(source).toMatch(/read|Read.*Tag|NFC.*Read/i);
  });

  it('has clone section', () => {
    expect(source).toMatch(/clone|Clone/i);
  });

  it('has NDEF section', () => {
    expect(source).toMatch(/NDEF/i);
  });
});

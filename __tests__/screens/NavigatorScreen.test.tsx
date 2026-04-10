/**
 * NavigatorScreen source contract:
 * - Uses useTheme() not mutable COLORS
 * - Has WebView link check fallback
 * - Uses Suspense for lazy loading
 */

import * as fs from 'fs';
import * as path from 'path';

const SOURCE_PATH = path.resolve(__dirname, '../../src/screens/NavigatorScreen.tsx');
const source = fs.readFileSync(SOURCE_PATH, 'utf8');

describe('NavigatorScreen source contract', () => {
  it('imports useTheme from ThemeContext', () => {
    expect(source).toContain('useTheme');
  });

  it('does NOT import mutable COLORS from constants', () => {
    expect(source).not.toMatch(/import\s*{[^}]*COLORS[^}]*}\s*from\s*['"]\.\.\/utils\/constants/);
  });

  it('uses makeStyles factory pattern', () => {
    expect(source).toMatch(/makeStyles/);
  });

  it('has WebView linked check', () => {
    expect(source).toContain('isRNCWebViewLinked');
  });

  it('uses Suspense for lazy loading', () => {
    expect(source).toContain('Suspense');
    expect(source).toContain('lazy');
  });
});

/**
 * DashboardScreen source contract:
 * - No dead screen navigation (UniversalKeys, BadgeCloner, etc.)
 * - Uses useTheme() not mutable COLORS
 * - Has module category sections
 */

import * as fs from 'fs';
import * as path from 'path';

const SOURCE_PATH = path.resolve(__dirname, '../../src/screens/DashboardScreen.tsx');
const source = fs.readFileSync(SOURCE_PATH, 'utf8');

describe('DashboardScreen source contract', () => {
  it('does NOT navigate to dead screens', () => {
    expect(source).not.toContain("'UniversalKeys'");
    expect(source).not.toContain("'BadgeCloner'");
    expect(source).not.toContain("'ReconDashboard'");
    expect(source).not.toContain("'NrfInterceptor'");
  });

  it('imports useTheme from ThemeContext', () => {
    expect(source).toContain('useTheme');
  });

  it('does NOT import mutable COLORS from constants', () => {
    expect(source).not.toMatch(/import\s*{[^}]*COLORS[^}]*}\s*from\s*['"]\.\.\/utils\/constants/);
  });

  it('has module category sections (RF, Wireless, Tools)', () => {
    // Should have module-based quick actions
    expect(source).toMatch(/RF|Sub-GHz|SubGhz/i);
    expect(source).toMatch(/WiFi|Wireless/i);
  });

  it('navigates to core screens', () => {
    expect(source).toContain("'FileExplorer'");
    expect(source).toContain("'Terminal'");
    expect(source).toContain("'Settings'");
    expect(source).toContain("'Navigator'");
  });
});

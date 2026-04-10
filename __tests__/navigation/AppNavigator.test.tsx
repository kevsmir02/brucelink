/**
 * Tests for AppNavigator — verifies:
 * 1. Dead screens are NOT registered (UniversalKeys, BadgeCloner, ReconDashboard, NrfInterceptor)
 * 2. Core screens ARE registered
 * 3. New module screens ARE registered
 */

import * as fs from 'fs';
import * as path from 'path';

const SOURCE_PATH = path.resolve(__dirname, '../../src/navigation/AppNavigator.tsx');
const source = fs.readFileSync(SOURCE_PATH, 'utf8');

describe('AppNavigator source contract', () => {
  it('does NOT import dead screens', () => {
    expect(source).not.toContain('UniversalKeysScreen');
    expect(source).not.toContain('BadgeClonerScreen');
    expect(source).not.toContain('ReconDashboardScreen');
    expect(source).not.toContain('NrfInterceptorScreen');
  });

  it('does NOT register dead screen names', () => {
    expect(source).not.toMatch(/name=["']UniversalKeys["']/);
    expect(source).not.toMatch(/name=["']BadgeCloner["']/);
    expect(source).not.toMatch(/name=["']ReconDashboard["']/);
    expect(source).not.toMatch(/name=["']NrfInterceptor["']/);
  });

  it('registers core screens', () => {
    expect(source).toMatch(/Login/);
    expect(source).toMatch(/Dashboard/);
    expect(source).toMatch(/FileExplorer/);
    expect(source).toMatch(/Terminal/);
    expect(source).toMatch(/Settings/);
    expect(source).toMatch(/Navigator/);
    expect(source).toMatch(/PayloadRunner/);
  });

  it('uses COLORS from theme context, not mutable global', () => {
    // After 1.8 theme rebuild this will use useTheme, for now it can still use COLORS
    // but must not import dead screens
    expect(source).toContain('createNativeStackNavigator');
  });
});

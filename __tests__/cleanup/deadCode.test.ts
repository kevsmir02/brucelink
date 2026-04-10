/**
 * Tests for 4.4 — dead code removal.
 * Asserts orphaned screens and tacticalCommands are deleted.
 */

import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '../../src');

describe('dead code removal', () => {
  const deadFiles = [
    'screens/UniversalKeysScreen.tsx',
    'screens/NrfInterceptorScreen.tsx',
    'screens/BadgeClonerScreen.tsx',
    'screens/ReconDashboardScreen.tsx',
    'utils/tacticalCommands.ts',
  ];

  deadFiles.forEach((file) => {
    it(`${file} should not exist`, () => {
      expect(fs.existsSync(path.join(SRC, file))).toBe(false);
    });
  });

  it('AppNavigator does not import dead screens', () => {
    const nav = fs.readFileSync(
      path.join(SRC, 'navigation/AppNavigator.tsx'),
      'utf8',
    );
    expect(nav).not.toMatch(/UniversalKeys/);
    expect(nav).not.toMatch(/NrfInterceptor/);
    expect(nav).not.toMatch(/BadgeCloner/);
    expect(nav).not.toMatch(/ReconDashboard/);
  });
});

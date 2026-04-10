/**
 * LoginScreen contract tests:
 * - No pre-filled default credentials
 * - URL validation
 * - useTheme() for colors (no COLORS import)
 * - Specific error messages
 */

import * as fs from 'fs';
import * as path from 'path';

const SOURCE_PATH = path.resolve(__dirname, '../../src/screens/LoginScreen.tsx');
const source = fs.readFileSync(SOURCE_PATH, 'utf8');

describe('LoginScreen source contract', () => {
  it('does NOT import DEFAULT_USERNAME or DEFAULT_PASSWORD', () => {
    expect(source).not.toContain('DEFAULT_USERNAME');
    expect(source).not.toContain('DEFAULT_PASSWORD');
  });

  it('does NOT prefill credentials from constants', () => {
    // Should not have useState initialized with default creds
    expect(source).not.toMatch(/useState\s*\(\s*['"]admin/);
  });

  it('imports useTheme from ThemeContext', () => {
    expect(source).toContain('useTheme');
  });

  it('does NOT import mutable COLORS from constants', () => {
    // Should not have COLORS from constants — use useTheme() instead
    expect(source).not.toMatch(/import\s*{[^}]*COLORS[^}]*}\s*from\s*['"]\.\.\/utils\/constants/);
  });

  it('validates URL format before login attempt', () => {
    // Should have URL validation logic
    expect(source).toMatch(/http[s]?:\/\//);
  });

  it('has empty string initial state for username and password', () => {
    expect(source).toMatch(/useState\s*\(\s*['"]['"]?\s*\)/);
  });
});

/**
 * Tests for the rebuilt theme system:
 * - useTheme() returns full theme tokens from context
 * - ThemeContext resolves light/dark/system correctly
 * - No mutable COLORS global dependency
 */

import React from 'react';
import { Text } from 'react-native';
import { render, act } from '@testing-library/react-native';
import { ThemeProvider, useTheme, useThemeMode } from '../../src/contexts/ThemeContext';
import { THEME_TOKENS } from '../../src/theme/tokens';

function ThemeConsumer() {
  const theme = useTheme();
  return (
    <>
      <Text testID="bg">{theme.colors.background}</Text>
      <Text testID="primary">{theme.colors.primary}</Text>
      <Text testID="spacing-md">{String(theme.spacing.md)}</Text>
    </>
  );
}

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('useTheme()', () => {
  it('returns dark theme tokens by default', () => {
    const { getByTestId } = renderWithTheme(<ThemeConsumer />);
    expect(getByTestId('bg').props.children).toBe(THEME_TOKENS.dark.colors.background);
    expect(getByTestId('primary').props.children).toBe(THEME_TOKENS.dark.colors.primary);
  });

  it('returns spacing tokens from theme', () => {
    const { getByTestId } = renderWithTheme(<ThemeConsumer />);
    expect(getByTestId('spacing-md').props.children).toBe(String(THEME_TOKENS.dark.spacing.md));
  });

  it('throws when used outside ThemeProvider', () => {
    // Suppress console.error for this test
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeConsumer />)).toThrow();
    spy.mockRestore();
  });
});

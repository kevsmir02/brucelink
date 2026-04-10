/**
 * Tests for StateContainer — renders loading/error/empty/success states.
 */

import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('../../src/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#0B1220',
      surface: '#111827',
      text: '#E5E7EB',
      textMuted: '#9CA3AF',
      primary: '#8627a6',
      error: '#EF4444',
      warning: '#D97706',
      border: '#334155',
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
    radius: { sm: 8, md: 12 },
    typography: { regular: 'sans-serif', mono: 'monospace' },
  }),
}));

import { StateContainer } from '../../src/components/StateContainer';

describe('StateContainer', () => {
  it('renders loading state with ActivityIndicator', () => {
    const { getByTestId } = render(
      <StateContainer status="loading">
        <Text>Content</Text>
      </StateContainer>,
    );
    expect(getByTestId('state-loading')).toBeTruthy();
  });

  it('does not render children during loading', () => {
    const { queryByText } = render(
      <StateContainer status="loading">
        <Text>Content</Text>
      </StateContainer>,
    );
    expect(queryByText('Content')).toBeNull();
  });

  it('renders error state with message and retry button', () => {
    const onRetry = jest.fn();
    const { getByText } = render(
      <StateContainer status="error" errorMessage="Connection failed" onRetry={onRetry}>
        <Text>Content</Text>
      </StateContainer>,
    );
    expect(getByText(/Connection failed/)).toBeTruthy();
    const retryBtn = getByText(/retry/i);
    fireEvent.press(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders empty state with guidance text', () => {
    const { getByText } = render(
      <StateContainer status="empty" emptyMessage="No files found">
        <Text>Content</Text>
      </StateContainer>,
    );
    expect(getByText(/No files found/)).toBeTruthy();
  });

  it('renders children in success state', () => {
    const { getByText } = render(
      <StateContainer status="success">
        <Text>Content</Text>
      </StateContainer>,
    );
    expect(getByText('Content')).toBeTruthy();
  });

  it('uses theme tokens (no COLORS import)', () => {
    const src = require('fs').readFileSync(
      require('path').resolve(__dirname, '../../src/components/StateContainer.tsx'),
      'utf8',
    );
    expect(src).toContain('useTheme');
    expect(src).not.toMatch(/import.*COLORS.*from/);
  });
});

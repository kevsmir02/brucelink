/**
 * Tests for OfflineBanner component.
 * Source contract: renders when disconnected, hidden when connected, uses theme tokens.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { useConnectionStore } from '../../src/stores/connectionStore';

// Mock ThemeContext
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
    spacing: { xs: 4, sm: 8, md: 12, lg: 16 },
    radius: { sm: 8, md: 12 },
    typography: { regular: 'sans-serif', mono: 'monospace' },
  }),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({ type: 'wifi', isConnected: true }),
}));

import { OfflineBanner } from '../../src/components/OfflineBanner';

function setStoreStatus(status: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error') {
  useConnectionStore.setState({
    status,
    isOnline: status === 'connected',
  });
}

describe('OfflineBanner', () => {
  beforeEach(() => {
    setStoreStatus('connected');
  });

  it('renders nothing when status is connected', () => {
    const { toJSON } = render(<OfflineBanner />);
    expect(toJSON()).toBeNull();
  });

  it('renders a warning when status is disconnected', () => {
    setStoreStatus('disconnected');
    const { getByText } = render(<OfflineBanner />);
    expect(getByText(/device.*(offline|unreachable|disconnected)/i)).toBeTruthy();
  });

  it('renders a warning when status is error', () => {
    setStoreStatus('error');
    const { getByText } = render(<OfflineBanner />);
    expect(getByText(/device.*(offline|unreachable|disconnected|error)/i)).toBeTruthy();
  });

  it('uses theme tokens (no COLORS import)', () => {
    const src = require('fs').readFileSync(
      require('path').resolve(__dirname, '../../src/components/OfflineBanner.tsx'),
      'utf8',
    );
    expect(src).toContain('useTheme');
    expect(src).not.toMatch(/import.*COLORS.*from/);
  });
});

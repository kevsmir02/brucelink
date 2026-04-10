/**
 * Tests for useNetworkListener hook — bridges NetInfo with connectionStore.
 */

jest.mock('@react-native-community/netinfo', () => {
  const listeners: Array<(state: any) => void> = [];
  return {
    addEventListener: jest.fn((cb: (state: any) => void) => {
      listeners.push(cb);
      return () => {
        const idx = listeners.indexOf(cb);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    }),
    fetch: jest.fn().mockResolvedValue({
      type: 'wifi',
      isConnected: true,
      details: { ssid: 'BruceLinkAP' },
    }),
    __listeners: listeners,
  };
});

import { renderHook, act } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import { useConnectionStore } from '../../src/stores/connectionStore';
import { useNetworkListener } from '../../src/hooks/useNetworkListener';

beforeEach(() => {
  jest.clearAllMocks();
  useConnectionStore.setState({
    status: 'connected',
    deviceInfo: {},
    error: null,
    isOnline: true,
    firmwareVersion: null,
  });
});

describe('useNetworkListener', () => {
  it('subscribes to NetInfo on mount', () => {
    renderHook(() => useNetworkListener());
    expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useNetworkListener());
    const unsubscribe = (NetInfo.addEventListener as jest.Mock).mock.results[0].value;
    unmount();
    // The unsubscribe function was returned — verify cleanup via listener count
    expect((NetInfo as any).__listeners.length).toBe(0);
  });

  it('transitions store to disconnected when WiFi drops', () => {
    renderHook(() => useNetworkListener());
    const listener = (NetInfo as any).__listeners[0];

    act(() => {
      listener({ type: 'none', isConnected: false, details: null });
    });

    expect(useConnectionStore.getState().status).toBe('disconnected');
    expect(useConnectionStore.getState().isOnline).toBe(false);
  });

  it('does not touch store when WiFi is still connected', () => {
    renderHook(() => useNetworkListener());
    const listener = (NetInfo as any).__listeners[0];

    act(() => {
      listener({ type: 'wifi', isConnected: true, details: { ssid: 'BruceLinkAP' } });
    });

    // Should still be connected — no transition
    expect(useConnectionStore.getState().status).toBe('connected');
    expect(useConnectionStore.getState().isOnline).toBe(true);
  });
});

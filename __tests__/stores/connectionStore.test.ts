/**
 * Tests for the connection state machine (zustand store).
 * States: idle → connecting → connected → disconnected → error
 */

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({ type: 'wifi', isConnected: true }),
}));

import { useConnectionStore, ConnectionState } from '../../src/stores/connectionStore';

function getState() {
  return useConnectionStore.getState();
}

beforeEach(() => {
  // Reset store to initial state before each test
  useConnectionStore.setState({
    status: 'idle',
    deviceInfo: null,
    error: null,
  });
});

describe('connectionStore', () => {
  it('starts in idle state', () => {
    expect(getState().status).toBe('idle');
    expect(getState().isOnline).toBe(false);
  });

  it('transitions to connecting when connect() is called', () => {
    getState().connect();
    expect(getState().status).toBe('connecting');
  });

  it('transitions to connected with device info', () => {
    const info = { BRUCE_VERSION: '1.14', board: 'ESP32-S3' };
    getState().setConnected(info);
    expect(getState().status).toBe('connected');
    expect(getState().deviceInfo).toEqual(info);
    expect(getState().isOnline).toBe(true);
  });

  it('transitions to disconnected', () => {
    getState().setConnected({ BRUCE_VERSION: '1.14' });
    getState().disconnect();
    expect(getState().status).toBe('disconnected');
    expect(getState().isOnline).toBe(false);
    // deviceInfo preserved for stale display
    expect(getState().deviceInfo).not.toBeNull();
  });

  it('transitions to error with message', () => {
    getState().setError('Device unreachable');
    expect(getState().status).toBe('error');
    expect(getState().error).toBe('Device unreachable');
    expect(getState().isOnline).toBe(false);
  });

  it('clears error on successful connect', () => {
    getState().setError('Something failed');
    getState().setConnected({ BRUCE_VERSION: '1.14' });
    expect(getState().error).toBeNull();
    expect(getState().status).toBe('connected');
  });

  it('reset() returns to idle and clears all state', () => {
    getState().setConnected({ BRUCE_VERSION: '1.14' });
    getState().reset();
    expect(getState().status).toBe('idle');
    expect(getState().deviceInfo).toBeNull();
    expect(getState().error).toBeNull();
  });

  it('exposes firmwareVersion derived value', () => {
    expect(getState().firmwareVersion).toBeNull();
    getState().setConnected({ BRUCE_VERSION: '1.14' });
    expect(getState().firmwareVersion).toBe('1.14');
  });
});
